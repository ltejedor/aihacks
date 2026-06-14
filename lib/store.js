// store.js — the gardener's SINGLE SOURCE OF TRUTH for local data.
//
// Every tool and pipeline stage reads and writes the community's data THROUGH here,
// so there is exactly one implementation of: phone/id normalization, JSON + JSONL
// read/append-with-dedup, identity resolution (@lid <-> phone <-> name), the grow-only
// name ledger, the message/reaction/roster/score stores, the protect layer, and the
// per-person dossier ("what we've learned about someone"). Nothing community-specific
// lives here — paths come from config.local.js (see lib/config.js + config.example.js).
//
//   const store = require('../lib/store');
//   const phone = store.toPhone(reaction.senderId);   // @lid or @c.us -> digits
//   store.annotate({ phone, note: 'co-founded X', by: 'web', protect: true });
//
// Why this exists: engagement keyed to an unresolved id is engagement lost, and the same
// resolution / dedup logic was being re-implemented (slightly differently) in every script.
// One correct copy here = consistent scores, no double-counted reactions, no lost names.

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');

// Config is loaded lazily (Node caches the require) so requiring this module never throws
// just for existing; tools that actually touch data already require a config.local.js.
const cfg = () => loadConfig();
const P = () => cfg().paths;

// ── normalization / time ──────────────────────────────────────────────────
const norm = (s) => String(s || '').replace(/[^0-9]/g, '');                 // phone -> digits only
const toMs = (t) => { const n = Number(t); if (!n) return 0; return n > 1e12 ? n : n * 1000; };
const nowISO = () => new Date().toISOString();
const isRealName = (n) => !!n && !/^\+?\d[\d\s\-]*$/.test(String(n)) && String(n).trim().length > 1;

// ── low-level JSON / JSONL (the only file I/O in the project) ──────────────
function readJSON(file, dflt) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return dflt; } }
function writeJSON(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }
function readJSONL(file) {
  try { return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); }
  catch (e) { return []; }
}
// Append rows to a JSONL file, skipping any whose key already exists (on disk OR earlier in
// this batch). keyOf(row) -> string identity. Returns the count actually written.
function appendJSONL(file, rows, keyOf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const seen = new Set();
  try { for (const l of fs.readFileSync(file, 'utf8').split('\n')) if (l.trim()) { try { seen.add(keyOf(JSON.parse(l))); } catch (e) {} } } catch (e) {}
  const lines = [];
  for (const r of rows) { const k = keyOf(r); if (k && !seen.has(k)) { seen.add(k); lines.push(JSON.stringify(r)); } }
  if (lines.length) fs.appendFileSync(file, lines.join('\n') + '\n');
  return lines.length;
}

// ── identities: @lid <-> phone <-> name (built by tools/resolve-ids.js) ────
// Shape: { byId: { "<id>": {phone, lid, name} }, lidToPhone: { "<lid>": "<phone>" } }
function loadIdentities() { return readJSON(P().identities, { byId: {}, lidToPhone: {} }); }
function saveIdentities(ids) { writeJSON(P().identities, ids); }

// Resolve any author/reactor/participant id to phone digits. @lid ids are anonymized and MUST
// be mapped via the cached lid->phone table or they score as a different (phantom) person.
function toPhone(id, ids = loadIdentities()) {
  if (!id) return null;
  const raw = String(id);
  if (raw.includes('@lid')) return norm(ids.lidToPhone[raw] || ids.lidToPhone[raw.replace('@lid', '')] || (ids.byId[raw] && ids.byId[raw].phone) || raw);
  return norm(raw);
}
// Reverse: phone digits -> the person's @lid (or null). On current WhatsApp Web builds, DM chats
// and group participants are keyed by @lid, so addressing someone by <phone>@c.us silently fails.
function lidForPhone(phone, ids = loadIdentities()) {
  const n = norm(phone); if (!n) return null;
  for (const [id, v] of Object.entries(ids.byId || {})) if (id.endsWith('@lid') && norm(v.phone) === n) return id;
  for (const [lid, ph] of Object.entries(ids.lidToPhone || {})) if (norm(ph) === n) return lid.endsWith('@lid') ? lid : lid + '@lid';
  return null;
}
// Best jid to ADDRESS or @mention a person: their @lid if we know it, else <phone>@c.us. Full
// jids pass through untouched. Use this everywhere you hand an id to whatsapp-web.js.
function mentionJid(target, ids = loadIdentities()) {
  const s = String(target || ''); if (s.includes('@')) return s;
  const n = norm(s); if (!n) return null;
  return lidForPhone(n, ids) || (n + '@c.us');
}

// ── name ledger: grow-only (a name seen once is never lost) ────────────────
function loadLedger() { return readJSON(P().nameLedger, {}); }
function rememberName(phone, name) {
  const n = norm(phone); if (!n || !isRealName(name)) return false;
  const led = loadLedger(); if (led[n]) return false; // never overwrite — coverage only climbs
  led[n] = name; writeJSON(P().nameLedger, led); return true;
}
// Batch version: one load + one save (for tools that resolve thousands of contacts at once).
// Same grow-only rule. rows: [{phone, name}]. Returns the count of names newly added.
function rememberNames(rows) {
  const led = loadLedger(); let added = 0;
  for (const r of rows || []) { const n = norm(r && r.phone); if (n && isRealName(r.name) && !led[n]) { led[n] = r.name; added++; } }
  if (added) writeJSON(P().nameLedger, led);
  return added;
}
function nameFor(phone) {
  const n = norm(phone); if (!n) return null;
  const led = loadLedger(); if (led[n]) return led[n];
  const e = loadIdentities().byId[n + '@c.us']; return (e && e.name) || null;
}

// ── messages / reactions (JSONL, append-only, deduped) ─────────────────────
// message row: { msgId, groupId, authorId, body, timestamp }
// reaction row: { msgId, groupId, senderId, emoji, timestamp }
function appendMessages(rows) { return appendJSONL(P().messages, rows, (r) => r.msgId); }
function appendReactions(rows) { return appendJSONL(P().reactions, rows, (r) => `${r.senderId}|${r.emoji}|${r.msgId}`); }
function loadMessages() { return readJSONL(P().messages); }
function loadReactions() { return readJSONL(P().reactions); }

// ── roster snapshot (built by tools/snapshot-members.js) ───────────────────
function loadMembers() { return readJSON(P().members, { groups: {} }); }
function saveMembers(doc) { writeJSON(P().members, doc); }

// ── scores (built by pipeline/score-members.js) ────────────────────────────
function loadScored() { return readJSON(P().scored, null); }
function saveScored(obj) { writeJSON(P().scored, obj); }

// ── protect layer: ids that can NEVER be cut (flat array of digits or jids) ─
function loadProtect() {
  const raw = readJSON(cfg().protectFile, []);
  return Array.isArray(raw) ? raw.map(String) : (raw.ids || []).map(String); // tolerate the {ids:[]} form
}
function isProtected(phone) {
  const n = norm(phone); const list = loadProtect();
  return list.some((id) => id === phone || id === n || norm(id) === n);
}
// protect.json is intentionally a flat list of ids (no reasons) — the WHY lives on the person's
// dossier note (annotate writes both). `reason` is accepted for call-site readability only.
function protectPerson(phone, { reason } = {}) {
  const n = norm(phone); if (!n) return false;
  const list = loadProtect();
  if (list.some((id) => norm(id) === n)) return false; // already protected
  list.push(n); writeJSON(cfg().protectFile, list);
  return true; // newly protected
}

// ── dossiers: per-person knowledge that accumulates with provenance ────────
// This is "keep track of new information like you do." Distinct from memory/ (the agent's own
// self-knowledge): dossiers are facts about COMMUNITY members. Shape:
//   { "<phone>": { phone, name, tags:[], notes:[{text,by,at}], history:[{action,by,at}], protected, updatedAt } }
function loadDossiers() { return readJSON(P().dossiers, {}); }
function saveDossiers(d) { writeJSON(P().dossiers, d); }
function getDossier(phone) { return loadDossiers()[norm(phone)] || null; }

// Write a finding onto a person's dossier (and optionally protect them). Idempotent: a note is
// only added once, a name only fills if we didn't have a real one, the ledger only grows. This is
// the one writer for dossiers — reused by CLI (tools/annotate.js), research write-back, and
// admin-reply incorporation.
function annotate({ phone, note, name, tags = [], by = 'agent', protect = false }) {
  const n = norm(phone); if (!n) return { ok: false, err: 'no phone' };
  const d = loadDossiers();
  const rec = d[n] || { phone: n, name: null, tags: [], notes: [], history: [] };
  for (const k of ['tags', 'notes', 'history']) if (!Array.isArray(rec[k])) rec[k] = [];

  if (isRealName(name) && !isRealName(rec.name)) {
    rec.name = name;
    rec.history.push({ action: 'named', name, by, at: nowISO() });
    rememberName(n, name); // names feed the grow-only ledger, so scores get them too
  }
  if (note && !rec.notes.some((x) => x.text === note)) {
    rec.notes.push({ text: note, by, at: nowISO() });
    rec.history.push({ action: 'note', by, at: nowISO() });
  }
  for (const t of [].concat(tags)) if (t && !rec.tags.includes(t)) rec.tags.push(t);

  let protectedNow = false;
  if (protect) {
    protectedNow = protectPerson(n, { reason: note });
    rec.protected = true;
    if (!rec.tags.includes('protected')) rec.tags.push('protected');
    if (protectedNow) rec.history.push({ action: 'protected', by, at: nowISO() });
  }
  rec.updatedAt = nowISO();
  d[n] = rec; saveDossiers(d);
  return { ok: true, phone: n, name: rec.name, protected: !!rec.protected, protectedNow };
}

module.exports = {
  // helpers
  norm, toMs, nowISO, isRealName,
  // raw io
  readJSON, writeJSON, readJSONL, appendJSONL,
  // identity
  loadIdentities, saveIdentities, toPhone, lidForPhone, mentionJid,
  // names
  loadLedger, rememberName, rememberNames, nameFor,
  // activity
  appendMessages, appendReactions, loadMessages, loadReactions,
  // roster + scores
  loadMembers, saveMembers, loadScored, saveScored,
  // protect
  loadProtect, isProtected, protectPerson,
  // dossiers
  loadDossiers, saveDossiers, getDossier, annotate,
  // expose config for callers that need groups/guard/etc.
  config: cfg,
};
