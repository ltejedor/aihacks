# Roadmap — what's built, what's next

The deidentified distillation of a working system. The *method*, the *hard-won platform
knowledge*, and the core toolset are all here; a few advanced pieces are still being shaped.

## Why this isn't just a wrapper

"WhatsApp + an LLM" is an afternoon's work. The value is the three things WhatsApp fights you on:

1. **Extraction.** `fetchMessages` is broken on current WhatsApp Web; the workaround (open each
   chat to force history to load; force-load the roster on a freshly-linked device) is
   reverse-engineered, not documented. Group IDs are hidden from the UI — you need the enumerator.
2. **Identity.** Reactions and authors arrive as anonymized `@lid`s. Without `LidUtils` resolution
   (`docs/IDENTITY.md`) + the grow-only name ledger, every engagement score is wrong and you prune
   real people.
3. **Judgment.** The safety method (`AGENT.md`) — identity over activity, "no signal ≠ ghost,"
   protect-before-prune, scope statements, refuse-on-stale, ask-first — exists because each rule
   was a real, expensive mistake once. A naive bot makes all of them confidently.

The interface is Claude Code itself, so the operator just talks to it. The intelligence is
general; the knowledge is specific and hard to reproduce. That's the moat.

## Built
- Operating manual (`AGENT.md`), voice + personality-evolution (`persona.template.json`),
  memory schema (`memory/SCHEMA.md`), identity / removal-scope / group-ID docs.
- First-run experience: `CLAUDE.md` front door + `/setup` + `package.json`.
- Config + safety: `config.example.js`, `protect.example.json`, `lib/config.js`, and the
  pluggable ask-first approval gate (`lib/approval.js`).
- **Tools** (single-purpose, config-driven, JSON-out): `list-all-groups`, `resolve-ids` (+ name
  ledger), `harvest-names` (read-only personal-account boost), `pull-messages`, `snapshot-members`,
  `list-pending` (onboarding queue), `send-message` (ask-first), `remove-member` (scope-safe,
  ask-first, verified, logged).
- **Pipeline** (read-only): `score-members` → `find-prune-candidates` (with the stale /
  mostly-unresolved guard).

## Next
- **Full-history import.** Live pull only sees recent messages. Add an importer for the phone's
  `Export chat` `_chat.txt` to backfill real history (and let a well-connected admin's richer
  export seed identities).
- **Onboarding polish.** `list-pending` + `send-message` already cover "see who's waiting" and
  "welcome them"; add an approve/decline-request tool and a welcome-draft helper that references
  what a newcomer actually does.
- **RSVP / event checks.** Tally reactions + replies on an event message, resolve responders,
  list who hasn't. Depends on extraction + identity — which is exactly why it's worth it.
- **WhatsApp-side approval.** `lib/approval.js` has the seam: switch `config.approval.mode` to
  `whatsapp` so the gardener posts "I want to send X to group Y — ok?" to your admin channel and
  acts on your "yes." (Terminal approval ships today.)
- **`docs/RISKS.md`.** Short and honest: unofficial automation, ban risk, why the official
  WhatsApp Business API can't do this (it can't read group history or manage members), use a
  number you can lose, low-and-slow, on-demand not always-on.
- **Trust ladder (later).** Per action-type, graduate from "propose" → "act-and-notify" as you
  keep agreeing — the dialogue is the training signal. The hard line never moves: never
  auto-remove an identifiable person.

## Open questions
- Stay purely unofficial (read/analysis + ask-first acts), or also use the official API for the
  parts it allows (opt-in sends)?
- Ship as its own repo, or keep it as a self-contained subfolder of `aihacks`?
