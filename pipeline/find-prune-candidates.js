// find-prune-candidates — a SAFE, vetted shortlist of who to consider removing.
// Purpose: rank lowest-signal members per group, EXCLUDING the protect layer, the
//          recently-active (id-aware), and anyone not in the scored set. REFUSES to
//          emit anything when the data is stale or mostly-unresolved (the guard).
//          Read-only; proposes only — never removes. See AGENT.md.
// Signature: node pipeline/find-prune-candidates.js [perGroup=25]
//            → JSON {refused?, reason?, guard, groups:{<id>:{proposable[],excluded}}}
// Note: a flagged candidate is a STARTING POINT for human review, not a verdict.
//       "no name / no signal" means look them up — it is NOT proof they're cuttable.

const { loadConfig } = require('../lib/config');
const store = require('../lib/store');

(async () => {
  const cfg = loadConfig();
  const perGroup = Number(process.argv[2]) || 25;
  const NOW = Date.now(), DAY = 86400000;
  const scored = store.loadScored();
  const membersDoc = store.loadMembers();
  const identities = store.loadIdentities();
  const messages = store.loadMessages();
  const reactions = store.loadReactions();
  const protectList = store.loadProtect();

  if (!scored || !scored.members) { console.log(JSON.stringify({ refused: true, reason: 'no scored.json — run pipeline/score-members.js first' })); process.exit(0); }

  const toPhone = (id) => store.toPhone(id, identities);

  // ── GUARD: refuse on stale or mostly-unresolved data ──
  let newest = 0;
  for (const m of messages) newest = Math.max(newest, store.toMs(m.timestamp));
  const ageDays = newest ? Math.round((NOW - newest) / DAY) : Infinity;
  const totalP = scored.counts ? scored.counts.participants : 0;
  const unresolvedPct = totalP ? Math.round((100 * (scored.counts.unresolved || 0)) / totalP) : 100;
  const guard = { ageDays: isFinite(ageDays) ? ageDays : null, unresolvedPct, maxDataAgeDays: cfg.guard.maxDataAgeDays, maxUnresolvedPct: cfg.guard.maxUnresolvedPct };

  if (!newest || ageDays > cfg.guard.maxDataAgeDays) { console.log(JSON.stringify({ refused: true, reason: `data is stale (newest message ${isFinite(ageDays) ? ageDays + 'd' : 'never'} old > ${cfg.guard.maxDataAgeDays}d) — run tools/pull-messages.js`, guard })); process.exit(0); }
  if (unresolvedPct > cfg.guard.maxUnresolvedPct) { console.log(JSON.stringify({ refused: true, reason: `too many unresolved members (${unresolvedPct}% > ${cfg.guard.maxUnresolvedPct}%) — run tools/resolve-ids.js (and consider tools/harvest-names.js)`, guard })); process.exit(0); }

  // ── recently-active set (id-aware, last recentActivityDays) — never prunable ──
  const win = NOW - cfg.guard.recentActivityDays * DAY;
  const recent = new Set();
  for (const m of messages) if (store.toMs(m.timestamp) >= win) { const p = toPhone(m.authorId); if (p) recent.add(p); }
  for (const r of reactions) if (store.toMs(r.timestamp) >= win) { const p = toPhone(r.senderId); if (p) recent.add(p); }

  // ── protect set (bare digits + literal) ──
  const protect = new Set();
  for (const id of protectList) { const raw = String(id); protect.add(raw); const d = store.norm(raw); if (d) protect.add(d); }

  const byPhone = {}; for (const m of scored.members) byPhone[m.phone] = m;

  const out = { generatedAt: new Date().toISOString(), guard: { ...guard, passed: true }, groups: {} };
  for (const [gid, g] of Object.entries(membersDoc.groups || {})) {
    if (cfg.groups && cfg.groups.length && !cfg.groups.find((x) => x.id === gid)) continue;
    let excludedProtected = 0, excludedRecent = 0, excludedUnscored = 0;
    const rows = [];
    for (const part of (g.participants || [])) {
      const phone = toPhone(part.id);
      if (!phone) { excludedUnscored++; continue; }
      if (protect.has(phone) || protect.has(part.id)) { excludedProtected++; continue; }
      if (recent.has(phone)) { excludedRecent++; continue; }
      const sm = byPhone[phone];
      if (!sm) { excludedUnscored++; continue; } // not scored => no basis to prune (recent joiner / unresolved)
      rows.push(sm);
    }
    rows.sort((a, b) => a.score - b.score);
    const proposable = rows.slice(0, perGroup).map((r) => ({
      phone: r.phone, name: r.name, tier: r.tier, score: r.score,
      msgs: r.msgs, reactionsGiven: r.reactionsGiven, groups: r.groups.length,
      needsHumanReview: !r.name || r.score === 0, // nameless / no-signal => look them up, don't trust the rank
    }));
    out.groups[gid] = { name: g.name, umbrella: !!g.umbrella, total: (g.participants || []).length, proposable, excluded: { protected: excludedProtected, recentlyActive: excludedRecent, unscored: excludedUnscored } };
  }

  store.writeJSON(cfg.paths.candidates, out);
  const totalProposable = Object.values(out.groups).reduce((a, g) => a + g.proposable.length, 0);
  console.log(JSON.stringify({ guard: out.guard, groups: Object.keys(out.groups).length, totalProposable, wrote: require('path').basename(cfg.paths.candidates) }));
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
