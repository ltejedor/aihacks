# 🌱 Community Gardener

A reusable, config-driven agent for tending a large WhatsApp **community** — the kind that
fills up, accumulates lurkers, and slowly loses signal. Clone this repo, open it in **Claude
Code**, point it at your own group(s), and it will: learn who's actually there, score real
engagement (messages **and** reactions, even from anonymized members), surface who to keep /
protect / invite / connect, welcome newcomers, introduce people to each other, keep a growing
dossier on who's who, and — carefully, with your sign-off — prune the dead weight.

You drive it through Claude Code: open the repo and Claude *is* the gardener (see `CLAUDE.md`).
It talks in plain language and uses the tools below. There's no model API key to set — Claude
is the brain; the tools are just hands.

It is **not** a 24/7 bot. There is no always-on daemon. You run tools on demand; each opens the
linked session, does one thing, and exits.

This is the deidentified distillation of a system built for one ~2,000-member community. All
names, numbers, group IDs, and data live in **your** `config.local.js` + `data/` — nothing
identifying ships in this repo.

> ⚠️ This drives WhatsApp through an **unofficial** automation library. Read `docs/RISKS.md`
> before you run it — account bans, rate limits, and irreversible removals are real.

## What it does (and what it learned the hard way)

- **Resolves identity.** WhatsApp addresses many people by anonymized `@lid` IDs, not phone
  numbers. The gardener taps WhatsApp Web's internal `LidUtils` map to turn every `@lid` into a
  real phone + name, and keeps a **grow-only name ledger** so a name seen once is never lost.
  (This was *the* unsolved problem — see `docs/IDENTITY.md`.)
- **Scores engagement by id, not name.** Reaction-givers and recent posters are credited even
  when their display name never linked to a phone. A quiet reactor is engagement, not a ghost.
- **Keeps a dossier on people.** Everything it learns about a member — what they build, why
  they matter, who said so — accumulates on a per-person record *with provenance*, so the next
  session knows them too. It never overwrites a real name or double-writes a note.
- **Reads any chat — including DMs.** It can open a group or a direct message and pull the
  recent thread, so it answers "what was said about X" from the actual conversation.
- **Introduces people.** It can spin up a fresh group to connect two builders — and it explains
  the context *before* anyone gets a link, so nobody receives a bare invite that reads as spam.
- **Posts with intent.** When it sends a message it can `@mention` someone so it actually
  highlights and notifies them, and quote-reply to thread onto a specific message.
- **Helps with onboarding.** It can read the join queue and approve or decline pending requests.
- **Protects before it prunes.** A `protect.json` layer (admins, reactors, builders, recently
  active, hand-named keepers) is loaded everywhere; protected people can never land on a cut
  list. When in doubt, keep.
- **Asks before acting.** Sending a message, removing someone, creating a group — each runs
  through an approval gate that states *exactly* what will happen and where, and waits for your
  yes (`lib/approval.js`).
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
   `node tools/send-message.js <groupId> "..."`, introduce two people with
   `node tools/create-group.js "..." <phone> <phone>`, or record what you learned with
   `node tools/annotate.js <phone> "..."`.

Or just open the repo in Claude Code and say what you want — it runs these for you. First run
with no `config.local.js`, it offers `/setup`.

## Layout

```
CLAUDE.md             ← the front door: Claude loads this and becomes the gardener
AGENT.md              ← the operating manual: how it should think & act (read this)
.claude/commands/setup.md ← the first-run interview (/setup)
config.example.js     ← all the knobs + where your group IDs / weights / thresholds go
persona.template.json ← the voice (sliders, rules) + how the personality EVOLVES
lib/                  ← config loader, the ask-first approval gate, and store.js —
                        the SINGLE SOURCE OF TRUTH for all local data (id resolution,
                        name ledger, messages/reactions, scores, protect, dossiers)
tools/                ← single-purpose hands: enumerate / resolve / harvest / pull /
                        snapshot / pending / read-chat / send / create-group / annotate /
                        approve-request / remove   (tools/README.md)
pipeline/             ← read-only scoring: score-members → find-prune-candidates
docs/                 ← ADD_CHAT_IDS · IDENTITY · CONNECTING · REMOVAL · RISKS
memory/SCHEMA.md      ← the agent's memory format (structure only; your memories stay local)
data/                 ← messages, reactions, identities, scores, dossiers. Local, gitignored.
ROADMAP.md            ← what's built vs. coming
```

Everything funnels through `lib/store.js` — one correct copy of phone/`@lid` normalization,
dedup, identity resolution, the grow-only name ledger, the protect layer, and the dossiers — so
scores stay consistent, reactions are never double-counted, and names are never lost.

See `AGENT.md` for the philosophy and `ROADMAP.md` for what's next. Everything
community-specific is yours; this stays generic.
