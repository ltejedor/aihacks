// Community Gardener — config. Copy to config.local.js and fill in YOUR community.
// Nothing here is community-specific; that's the point. config.local.js is gitignored.

const path = require('path');
const D = __dirname;

module.exports = {
  // ── Your groups ──────────────────────────────────────────────────────────
  // Discover IDs with `node tools/list-all-groups.js` (WhatsApp hides them in the
  // UI). See docs/ADD_CHAT_IDS.md. Mark exactly ONE as the community umbrella.
  groups: [
    // { id: 'XXXXXXXXXXXXXXXXXX@g.us', name: 'My Community (umbrella)', umbrella: true },
    // { id: 'XXXXXXXXXXXXXXXXXX@g.us', name: 'Main chat' },
    // { id: 'XXXXXXXXXXXXXXXXXX@g.us', name: 'Jobs' },
  ],
  // Umbrella = "the community": removing someone there = OUT OF EVERYTHING.
  // Any other group = local to that chat. (docs/REMOVAL.md)

  clientId: 'gardener', // whatsapp-web.js LocalAuth session id (link once, reused — no re-scan)
  headless: true,       // false = watch the browser (and to scan the first-run QR)

  // ── Approval gate for outward/destructive actions (send, remove) ──────────
  // 'terminal' = the tool asks y/N on the terminal, stating WHAT + WHERE first.
  // 'whatsapp' = (future) ask in your admin channel; reply "yes" to approve.
  // 'none'     = auto-approve (trusted automation only). See lib/approval.js.
  approval: {
    mode: 'terminal',
    // channel: 'XXXXXXXXXXXXXXXXXX@g.us', // future: where 'whatsapp' mode would ask
  },

  // ── Safety gates (a prune list is REFUSED unless these pass) ──────────────
  guard: {
    maxDataAgeDays: 14,     // refuse if the newest message is older than this
    maxUnresolvedPct: 60,   // refuse if more than this % of members have no resolved identity
    recentActivityDays: 30, // posted OR reacted within this window => never prunable
  },
  protectFile: path.join(D, 'data/protect.json'), // ids that can NEVER be cut (cp data/protect.example.json)

  // ── Scoring (credit engagement BY ID — phone or @lid — never display name) ─
  decay: { halfLifeDays: 180, floor: 0.05 }, // older activity counts for less; never quite zero
  scoring: {
    message:         { weight: 8, logScale: true, max: 50 },
    reactionGiven:   { perReaction: 5, max: 20 },  // reacting IS engagement (the quiet-reactor lesson)
    recentlyActive:  { bonus: 20 },                // active within guard.recentActivityDays
    multiGroup:      { perExtraGroup: 5, max: 20 },
    admin:           { bonus: 15 },
    externalBuilder: { perItem: 2, max: 30 },      // optional, see externalBuilderSource
  },

  // ── Tier thresholds (score >= value => tier) ─────────────────────────────
  tiers: { SAVE: 60, KEEP: 35, MAYBE: 20, REVIEW: 10, LIKELY_PRUNE: 1 },
  // ADMIN_KEEP comes from being a group admin or an override; under LIKELY_PRUNE => PRUNE.

  // ── Overrides: people you KNOW the data can't resolve (keep generic here) ──
  // key = phone digits only; tier = one of the above or 'ADMIN_KEEP'.
  overrides: {
    // '15551234567': { name: 'A Founder', tier: 'SAVE', reason: 'co-founded something big' },
  },

  // ── Optional external "who builds what" source ────────────────────────────
  // Path to a JSON map { "<phone digits>": <itemCount> } (projects, PRs, talks…).
  // Matches members to it to protect builders. null = none.
  externalBuilderSource: null,

  paths: {
    data:       path.join(D, 'data'),
    messages:   path.join(D, 'data/messages.jsonl'),
    reactions:  path.join(D, 'data/reactions.jsonl'),
    identities: path.join(D, 'data/identities.json'),   // lid->phone->name (tools/resolve-ids.js)
    nameLedger: path.join(D, 'data/name_ledger.json'),  // grow-only: a name seen once is never lost
    members:    path.join(D, 'data/group_members.json'),// live rosters (tools/snapshot-members.js)
    scored:     path.join(D, 'data/scored.json'),       // scores + tiers (pipeline/score-members.js)
    candidates: path.join(D, 'data/prune-candidates.json'),
    pruneLog:   path.join(D, 'data/prune_log.json'),
  },
};
