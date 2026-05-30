// list-pending — the onboarding queue: who's asked to join.
// Purpose: list pending join requests for each configured group. Requests are
//          @lid-anonymized — run resolve-ids to put names to them.
// Signature: node tools/list-pending.js   →  JSON {ok, pending:{<name>:[{id,at}]}}

const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');

(async () => {
  const cfg = loadConfig();
  const client = await connect();
  try {
    const pending = {};
    for (const g of cfg.groups) {
      try {
        const reqs = await client.getGroupMembershipRequests(g.id);
        pending[g.name || g.id] = (reqs || []).map((r) => ({
          id: (r.id && (r.id._serialized || r.id)) || r.addedBy || null,
          at: r.t || r.requestTimestamp || null,
        }));
      } catch (e) {
        pending[g.name || g.id] = { error: e.message };
      }
    }
    console.log(JSON.stringify({ ok: true, pending }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
