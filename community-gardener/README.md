# 🌱 Community Gardener

A reusable, config-driven agent for tending a large WhatsApp **community** — the kind that
fills up, accumulates lurkers, and slowly loses signal. Point it at your own group(s) and it
will: learn who's actually there, score real engagement (messages **and** reactions, even from
anonymized members), surface who to keep / protect / invite / connect, welcome newcomers, and
— carefully, with your sign-off — prune the dead weight.

You drive it through **Claude Code**: open this folder, and Claude *is* the gardener (see
`CLAUDE.md`). It talks in plain language and uses the tools below. There's no model API key to
set — Claude is the brain; the tools are just hands.

It is **not** a 24/7 bot. There is no always-on daemon. You run tools on demand; each opens the
linked session, does one thing, and exits.

This is the deidentified distillation of a system built for one 2,000-member community. All
names, numbers, group IDs, and data live in **your** `config.local.js` + `data/` — nothing
identifying is in this template.

## What it does (and what it learned the hard way)

- **Resolves identity.** WhatsApp addresses many people by anonymized `@lid` IDs, not phone
  numbers. The gardener taps WhatsApp Web's internal `LidUtils` map to turn every `@lid` into a
  real phone + name, and keeps a **grow-only name ledger** so a name seen once is never lost.
  (This was *the* unsolved problem — see `docs/IDENTITY.md`.)
- **Scores engagement by id, not name.** Reaction-givers and recent posters are credited even
  when their display name never linked to a phone. A quiet reactor is engagement, not a ghost.
- **Protects before it prunes.** A `protect.json` layer (admins, reactors, builders, recently
  active, hand-named keepers) is loaded everywhere; protected people can never land on a cut
  list. When in doubt, keep.
- **Asks before acting.** Sending a message or removing someone runs through an approval gate
  that states *exactly* what will happen and where, and waits for your yes (`lib/approval.js`).
- **Knows chat vs. community.** Removing from one chat is local; removing from the umbrella is
  nuclear (out of everything). It always states the scope first. See `docs/REMOVAL.md`.
- **Refuses to prune on stale data.** A recency/coverage guard blocks a cut list when the data
  is old or mostly unresolved.
- **Vets before cutting.** A nameless "PRUNE-tier lurker" is often a founder who just never
  typed. The gardener looks people up before recommending a cut.

## Quickstart

```bash
npm install && npm run chrome          # deps + puppeteer's Chrome
cp config.example.js config.local.js   # then fill in your groups (next step)
cp data/protect.example.json data/protect.json
```

1. `npm run groups` → scan the QR once → copy your group IDs into `config.local.js` (mark the
   umbrella with `umbrella: true` — see `docs/ADD_CHAT_IDS.md`).
2. `npm run resolve` → build identities + name ledger. *(Optional: `node tools/harvest-names.js`
   to boost names from a well-connected account — read-only, auto-unlinks.)*
3. `npm run pull` → recent messages + reactions. `node tools/snapshot-members.js` → live rosters.
4. `node pipeline/score-members.js` → scores + tiers. `node pipeline/find-prune-candidates.js` →
   a safe, vetted shortlist (refuses if data is stale/unresolved).
5. Review, then act with sign-off: `node tools/remove-member.js <groupId> <phone>` (states scope,
   refuses protected, asks first, verifies, logs). Welcome someone with
   `node tools/send-message.js <groupId> "..."`.

Or just open the folder in Claude Code and say what you want — it runs these for you. First run
with no `config.local.js`, it offers `/setup`.

## Layout

```
CLAUDE.md             ← the front door: Claude loads this and becomes the gardener
AGENT.md              ← the operating manual: how it should think & act (read this)
.claude/commands/setup.md ← the first-run interview (/setup)
config.example.js     ← all the knobs + where your group IDs / weights / thresholds go
persona.template.json ← the voice (sliders, rules) + how the personality EVOLVES
lib/                  ← config loader + the ask-first approval gate
tools/                ← single-purpose hands: enumerate / resolve / harvest / pull /
                        snapshot / pending / send / remove   (tools/README.md)
pipeline/             ← read-only scoring: score-members → find-prune-candidates
docs/                 ← ADD_CHAT_IDS · IDENTITY · REMOVAL
memory/SCHEMA.md      ← the agent's memory format (structure only; your memories stay local)
ROADMAP.md            ← what's built vs. coming
```

See `AGENT.md` for the philosophy and `ROADMAP.md` for what's next. Everything
community-specific is yours; this stays generic.
