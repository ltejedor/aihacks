// score-members — turn the collected data into a score + tier per member.
// Purpose: read messages + reactions + rosters + identities, credit engagement BY ID
//          (phone or @lid, resolved to phone), apply time-decay, write data/scored.json.
//          Read-only; no WhatsApp. Run after resolve-ids / pull-messages / snapshot.
// Signature: node pipeline/score-members.js   →  JSON {members, resolved, tiers:{...}}

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../lib/config');

const norm = (s) => String(s || '').replace(/[^0-9]/g, '');
const loadJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } };
const loadJSONL = (p) => { try { return fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } };
const toMs = (t) => { const n = Number(t); if (!n) return 0; return n > 1e12 ? n : n * 1000; };

(async () => {
  const cfg = loadConfig();
  const S = cfg.scoring, NOW = Date.now(), DAY = 86400000;
  const identities = loadJSON(cfg.paths.identities, { byId: {}, lidToPhone: {} });
  const ledger = loadJSON(cfg.paths.nameLedger, {});
  const membersDoc = loadJSON(cfg.paths.members, { groups: {} });
  const messages = loadJSONL(cfg.paths.messages);
  const reactions = loadJSONL(cfg.paths.reactions);
  const external = cfg.externalBuilderSource ? loadJSON(cfg.externalBuilderSource, {}) : {};

  const toPhone = (id) => {
    if (!id) return null;
    const raw = String(id);
    if (raw.includes('@lid')) return norm(identities.lidToPhone[raw] || identities.lidToPhone[raw.replace('@lid', '')] || (identities.byId[raw] && identities.byId[raw].phone) || raw);
    return norm(raw);
  };

  // ── membership: phone -> {groups:Set, admin:bool} (+ count unresolved) ──
  const M = {}; let unresolved = 0, totalParticipants = 0;
  const ensure = (p) => (M[p] = M[p] || { groups: new Set(), admin: false, msgs: 0, rx: 0, last: 0 });
  for (const [gid, g] of Object.entries(membersDoc.groups || {})) {
    for (const part of (g.participants || [])) {
      totalParticipants++;
      const p = toPhone(part.id);
      if (!p) { unresolved++; continue; }
      const m = ensure(p);
      m.groups.add(gid);
      if (part.isAdmin) m.admin = true;
    }
  }
  // ── activity by id ──
  for (const msg of messages) { const p = toPhone(msg.authorId); if (!p) continue; const m = ensure(p); m.msgs++; m.last = Math.max(m.last, toMs(msg.timestamp)); }
  for (const r of reactions) { const p = toPhone(r.senderId); if (!p) continue; const m = ensure(p); m.rx++; m.last = Math.max(m.last, toMs(r.timestamp)); }

  const decay = (ageDays) => Math.max(cfg.decay.floor, Math.pow(0.5, ageDays / cfg.decay.halfLifeDays));
  const cap = (v, max) => (max ? Math.min(v, max) : v);
  const tierOf = (score) => {
    const T = cfg.tiers;
    if (score >= T.SAVE) return 'SAVE';
    if (score >= T.KEEP) return 'KEEP';
    if (score >= T.MAYBE) return 'MAYBE';
    if (score >= T.REVIEW) return 'REVIEW';
    if (score >= T.LIKELY_PRUNE) return 'LIKELY_PRUNE';
    return 'PRUNE';
  };

  const out = [];
  for (const [phone, m] of Object.entries(M)) {
    const lastDays = m.last ? (NOW - m.last) / DAY : Infinity;
    const recentlyActive = lastDays <= cfg.guard.recentActivityDays;
    const d = isFinite(lastDays) ? decay(lastDays) : cfg.decay.floor;

    const sig = {};
    sig.message = cap((S.message.logScale ? S.message.weight * Math.log2(1 + m.msgs) : S.message.weight * m.msgs) * d, S.message.max);
    sig.reactionGiven = cap(S.reactionGiven.perReaction * m.rx, S.reactionGiven.max) * d;
    sig.recentlyActive = recentlyActive ? S.recentlyActive.bonus : 0;
    sig.multiGroup = cap(Math.max(0, m.groups.size - 1) * S.multiGroup.perExtraGroup, S.multiGroup.max);
    sig.admin = m.admin ? S.admin.bonus : 0;
    sig.externalBuilder = external[phone] ? cap(external[phone] * S.externalBuilder.perItem, S.externalBuilder.max) : 0;

    let score = Math.round(Object.values(sig).reduce((a, b) => a + b, 0));
    let tier = tierOf(score);
    if (m.admin) tier = 'ADMIN_KEEP';
    const ov = cfg.overrides && cfg.overrides[phone];
    if (ov && ov.tier) tier = ov.tier;

    out.push({
      phone, name: ledger[phone] || (identities.byId[phone + '@c.us'] && identities.byId[phone + '@c.us'].name) || (ov && ov.name) || null,
      score, tier, groups: [...m.groups], msgs: m.msgs, reactionsGiven: m.rx,
      lastActiveDays: isFinite(lastDays) ? Math.round(lastDays) : null, recentlyActive,
    });
  }
  out.sort((a, b) => b.score - a.score);

  const tiers = {};
  for (const r of out) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
  fs.mkdirSync(path.dirname(cfg.paths.scored), { recursive: true });
  fs.writeFileSync(cfg.paths.scored, JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: { members: out.length, participants: totalParticipants, unresolved },
    tiers, members: out,
  }, null, 2));
  console.log(JSON.stringify({ members: out.length, resolved: out.length, unresolvedParticipants: unresolved, tiers }));
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
