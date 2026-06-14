// remove-member — remove ONE person from ONE group. The only destructive tool. Asks first.
// Purpose: scope-safe removal — refuses ids in protect.json, refuses a group not in
//          your config, finds the target lid-aware, states the scope and the person,
//          asks for approval (terminal y/N; swappable — lib/approval.js), removes via
//          the high-level API, VERIFIES it took, logs. Needs the linked account to be
//          admin of that group. See docs/REMOVAL.md + AGENT.md.
// Signature: node tools/remove-member.js <groupId> <phone> [who]
//            → JSON {phone, group, umbrella, before, after, removed, approved, at, error?}

const fs = require('fs');
const path = require('path');
const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const { confirm } = require('../lib/approval');
const store = require('../lib/store');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const [groupId, phoneArg, who] = process.argv.slice(2);
  const phone = (phoneArg || '').replace(/[^0-9]/g, '');
  if (!groupId || !phone) throw new Error('Usage: node tools/remove-member.js <groupId> <phone> [who]');

  const cfg = loadConfig();
  const g = (cfg.groups || []).find((x) => x.id === groupId);
  if (!g) throw new Error(`group ${groupId} is not in config.local.js — refusing (add it, with the correct umbrella flag, so the scope is unambiguous)`);

  // Protect check goes through the store (the single source of truth) so the destructive path
  // honors the protect layer exactly like everything else and tolerates both protect-file shapes
  // (a flat array OR {ids:[...]}). Never hand-roll this — a divergence here can silently cut a
  // protected person, the one mistake that's irreversible.
  if (store.isProtected(phone)) {
    throw new Error(`REFUSED: ${phone} is protected (${cfg.protectFile})`);
  }

  const client = await connect();
  try {
    // Force-load the roster (a freshly-linked device shows it empty until queried),
    // then find the target's exact participant id — lid-aware.
    const found = await client.pupPage.evaluate(async (gid, ph) => {
      const S = window.Store;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (s) => String(s || '').replace(/[^0-9]/g, '');
      const wid = S.WidFactory.createWid(gid);
      const parts = () => { const c = S.Chat.get(gid); const p = c && c.groupMetadata && c.groupMetadata.participants; return p ? (p.getModelsArray ? p.getModelsArray() : (p._models || [])) : []; };
      let arr = parts();
      for (let k = 0; k < 10 && !arr.length; k++) { try { await S.GroupQueryAndUpdate(wid); } catch (e) {} await sleep(2000); arr = parts(); }
      if (!arr.length) return { error: 'roster did not load' };
      const l2p = (id) => { try { const pn = S.LidUtils.getPhoneNumber(S.WidFactory.createWid(id)); return pn && (pn._serialized || pn); } catch (e) { return null; } };
      for (const p of arr) {
        const id = p.id && p.id._serialized; if (!id) continue;
        const got = id.endsWith('@lid') ? norm(l2p(id)) : norm(id);
        if (got === ph) return { id, before: arr.length };
      }
      return { error: 'not_found', before: arr.length };
    }, groupId, phone);

    if (found.error === 'not_found') { console.log(JSON.stringify({ phone, group: g.name, before: found.before, removed: false, error: 'not a member' })); process.exit(0); }
    if (found.error) throw new Error(found.error);

    const approved = await confirm({
      summary: g.umbrella
        ? `Remove ${who || phone} from the COMMUNITY ("${g.name}") — OUT OF EVERY chat. Nuclear, irreversible (re-invite only).`
        : `Remove ${who || phone} from "${g.name}" only — they stay in the community and other chats.`,
      detail: `participant ${found.id}`,
    });
    if (!approved) { console.log(JSON.stringify({ phone, group: g.name, umbrella: !!g.umbrella, approved: false, removed: false })); process.exit(2); }

    const chat = await client.getChatById(groupId);
    let status;
    try { status = await chat.removeParticipants([found.id]); }
    catch (e) { throw new Error('removeParticipants threw (is the linked account admin of this group?): ' + (e.message || e)); }

    await delay(3000);
    const still = await client.pupPage.evaluate((gid, partId) => {
      const S = window.Store; const c = S.Chat.get(gid);
      const arr = (c && c.groupMetadata && c.groupMetadata.participants && (c.groupMetadata.participants.getModelsArray ? c.groupMetadata.participants.getModelsArray() : c.groupMetadata.participants._models)) || [];
      return arr.some((p) => p.id && p.id._serialized === partId);
    }, groupId, found.id);

    const entry = {
      phone, who: who || null, groupId, group: g.name, umbrella: !!g.umbrella,
      participantId: found.id, before: found.before, approved: true,
      removed: !still, status: String(status).slice(0, 80), at: new Date().toISOString(),
    };
    let log = [];
    try { log = JSON.parse(fs.readFileSync(cfg.paths.pruneLog, 'utf8')); if (!Array.isArray(log)) log = []; } catch (e) {}
    log.push(entry);
    fs.mkdirSync(path.dirname(cfg.paths.pruneLog), { recursive: true });
    fs.writeFileSync(cfg.paths.pruneLog, JSON.stringify(log, null, 2));

    console.log(JSON.stringify(entry));
    if (!entry.removed) process.exit(2); // still present => likely not admin
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
