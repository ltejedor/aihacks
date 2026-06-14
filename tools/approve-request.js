// approve-request — approve (or --decline) ONE pending join request for ONE configured group. Asks first.
// Purpose: act on the onboarding queue safely. Refuses a group not in your config (so the
//          target is unambiguous), reads that group's pending join requests, finds the one
//          matching the person you named (lid-aware: requests are @lid-anonymized, so match
//          by resolved phone, or by the exact jid you passed), states the scope — and if the
//          group is the COMMUNITY umbrella, that approving = letting them into EVERY chat —
//          then asks before doing anything outward. Approve adds them; --decline rejects the
//          request. See tools/list-pending.js (to see the queue) + AGENT.md.
// Signature: node tools/approve-request.js <groupId> <phone|lid> [--decline]
//            → JSON {group, phone, requesterId, action:'approve'|'decline', result, approved}
//              (exit 0 if no matching pending request; exit 2 if you decline the approval gate)

const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const { confirm } = require('../lib/approval');
const store = require('../lib/store');

(async () => {
  const args = process.argv.slice(2);
  const decline = args.includes('--decline');
  const [groupId, target] = args.filter((a) => a !== '--decline');
  if (!groupId || !target) throw new Error('Usage: node tools/approve-request.js <groupId> <phone|lid> [--decline]');

  const cfg = loadConfig();
  const g = (cfg.groups || []).find((x) => x.id === groupId);
  if (!g) throw new Error(`group ${groupId} is not in config.local.js — refusing (add it, with the correct umbrella flag, so the scope is unambiguous)`);

  // Target can be a phone (digits) or a full jid. Match a pending request either by its
  // resolved phone (requests are @lid-anonymized) or by an exact jid the caller passed.
  const wantJid = String(target).includes('@') ? String(target) : null;
  const wantPhone = store.norm(target);

  const client = await connect();
  try {
    const reqs = (await client.getGroupMembershipRequests(groupId)) || [];
    const match = reqs.find((r) => {
      const id = (r.id && (r.id._serialized || r.id)) || null;
      if (!id) return false;
      if (wantJid && id === wantJid) return true;
      return wantPhone && store.toPhone(id) === wantPhone;
    });

    if (!match) {
      // A phone only matches a request once resolve-ids has built the @lid→phone map for this
      // session; if it hasn't, pass the exact @lid id instead.
      console.log(JSON.stringify({ group: g.name, phone: wantPhone || null, error: 'no pending request', hint: 'run tools/resolve-ids.js first, or pass the exact @lid id (see tools/list-pending.js)' }));
      return; // exit 0 — nothing to act on
    }

    const reqId = (match.id && (match.id._serialized || match.id)) || wantJid;
    const phone = store.toPhone(reqId) || wantPhone || null;
    const name = (phone && store.nameFor(phone)) || null;
    const who = name || phone || reqId;

    const approved = await confirm({
      summary: decline
        ? `Decline ${who}'s request to join "${g.name}" — their join request is rejected.`
        : g.umbrella
          ? `Approve ${who} into the COMMUNITY ("${g.name}") — this lets them into EVERY chat under it.`
          : `Approve ${who} into "${g.name}" only — they join this one chat.`,
      detail: `requester ${reqId}`,
    });
    if (!approved) {
      console.log(JSON.stringify({ group: g.name, phone, requesterId: reqId, action: decline ? 'decline' : 'approve', approved: false }));
      process.exit(2);
    }

    let result;
    if (decline) result = await client.rejectGroupMembershipRequests(groupId, { requesterIds: [reqId] });
    else result = await client.approveGroupMembershipRequests(groupId, { requesterIds: [reqId] });

    console.log(JSON.stringify({
      group: g.name,
      phone,
      requesterId: reqId,
      action: decline ? 'decline' : 'approve',
      result: result || null,
      approved: true,
    }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
