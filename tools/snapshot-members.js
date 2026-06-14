// snapshot-members — record the live roster of each configured group.
// Purpose: force-load each group's participant list (a freshly-linked device shows it
//          empty until queried) into data/group_members.json as {id, isAdmin} per
//          member, and report whether the linked account is admin (needed to remove).
// Signature: node tools/snapshot-members.js  →  JSON {groups:{<name>:{count,botIsAdmin}}}

const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const store = require('../lib/store');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const cfg = loadConfig();
  const client = await connect();
  try {
    const me = (client.info && client.info.wid && client.info.wid._serialized) || null;
    const groups = {};
    const summary = {};
    for (const g of cfg.groups) {
      const r = await client.pupPage.evaluate(async (gid, meId) => {
        const S = window.Store;
        const wid = S.WidFactory.createWid(gid);
        const read = () => { const c = S.Chat.get(gid); const p = c && c.groupMetadata && c.groupMetadata.participants; return p ? (p.getModelsArray ? p.getModelsArray() : (p._models || [])) : []; };
        let arr = read();
        for (let k = 0; k < 8 && !arr.length; k++) { try { await S.GroupQueryAndUpdate(wid); } catch (e) {} await new Promise((r) => setTimeout(r, 1000)); arr = read(); }
        if (!arr.length) return { participants: [], botIsAdmin: false, error: 'roster did not load' };
        const participants = arr.map((p) => ({ id: p.id && (p.id._serialized || p.id), isAdmin: !!(p.isAdmin || p.isSuperAdmin) }));
        return { participants, botIsAdmin: participants.some((p) => p.id === meId && p.isAdmin) };
      }, g.id, me);
      groups[g.id] = { name: g.name, umbrella: !!g.umbrella, botIsAdmin: r.botIsAdmin, participants: r.participants };
      summary[g.name || g.id] = { count: r.participants.length, botIsAdmin: r.botIsAdmin, error: r.error };
      await delay(500);
    }
    store.saveMembers({ fetchedAt: store.nowISO(), groups }); // single writer the pipeline reads through
    console.log(JSON.stringify({ groups: summary }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
