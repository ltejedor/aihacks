---
description: First-run setup — interview the operator, write their config + persona, connect WhatsApp, get the gardener oriented to their community.
---

You're running first-time setup for the community gardener. Be **in voice** (see persona), warm,
quick, concrete. This is a conversation, not a form: ask in small batches with AskUserQuestion,
react to answers, keep it ~5 minutes. Nothing destructive happens during setup — say so up front.

By the end there should be: a `config.local.js`, a `persona.local.json`, a few seeded `memory/`
facts, the operator's group IDs discovered, and one small "oh, nice" moment.

If a tool you need isn't in `tools/` yet, **say so plainly and note it as the next step** — never
pretend a step ran. (The full toolset is present now: `list-all-groups`, `resolve-ids`,
`harvest-names`, `pull-messages`, `snapshot-members`, `list-pending`, `send-message`,
`remove-member`, `create-group`, `annotate`, `read-chat`, `approve-request`, plus the read-only
`pipeline/score-members` → `pipeline/find-prune-candidates`. See `ROADMAP.md` for what's mature vs.
still rough.)

## 0. Preflight (just do it, narrate briefly)
- `node -v` ≥ 18. If `node_modules` is missing, `npm install`. If unsure about the browser,
  `npm run chrome` (installs puppeteer's Chrome).
- If `config.local.js` already exists, this is a re-run — ask whether to update rather than
  overwrite.

## 1. Who are you / what is this community?
Conversationally (AskUserQuestion + free text):
- what's it called, and what is it — one line, who's in it and what it's for?
- how big, and is it at/near capacity? (decides whether pruning even matters)
- what do you want from me first? options: **understand who's here** · **make room (prune
  carefully)** · **welcome newcomers** · **check RSVPs** · **just answer questions about people**.
  Be honest which are mature (understand, prune) vs. roadmap.
Write these to `memory/` as `user` + `project` facts (absolute dates).

## 2. Voice (make this the fun part)
- Show the default voice (snarky, lowercase, a little weird, warm to newcomers). Ask: keep it, or
  tune the sliders (snark / weirdness / warmth / assertiveness)?
- Ask the fun one: "anything i should be a little weird about, or poke fun at?" (the source
  gardener roasts a certain big-tech AI; theirs can be anything — or nothing.)
- Tell them it's a *starting point* — you drift toward their community's actual humor as you learn
  it. Write `persona.local.json` (copy the template, apply their answers).

## 3. The account decision (theirs — explain the tradeoff honestly)
You connect by linking a WhatsApp account, like WhatsApp Web. Two routes:
- **a dedicated/burner number** — safest, but it knows few contacts, so fewer names resolve.
- **a well-connected admin's number** — resolves far more names (WhatsApp only reveals
  saved-contact names + keeps a richer lid↔phone cache on a connected account), but it's a
  personal account → more to lose if WhatsApp flags automation.
Be straight about it: this is *unofficial* automation of WhatsApp Web. Use a number you can afford
to lose, go low-and-slow, never let it mass-act unattended. (See `AGENT.md`.)

## 4. Discover group IDs
- Run `node tools/list-all-groups.js`. First run shows a QR — have them scan it (WhatsApp →
  Linked devices → Link a device). It prints every group + member count + `@g.us` id.
- Help them pick which groups to manage and **which is the umbrella** (the big one, usually
  >1024 — removing from it is nuclear). Write `config.local.js` from `config.example.js`, groups
  labeled, umbrella marked. Get the scope distinction right (`docs/ADD_CHAT_IDS.md`).

## 5. Get current + resolve identities
- Set expectations: live pull only sees ~recent history; full history needs a phone export
  (roadmap). Pull recent for now.
- Run the session/pull + `resolve-ids` so `data/identities.json` exists. (Tool missing? Say so,
  list it as next.)

## 6. First win
- Produce one small real thing from their data and let them pick the flavor (AskUserQuestion):
  - **who carries this place** — top voices in the main chat (messages + reactions, not just msgs).
  - **a draft welcome** for a recent join that references what they actually do.
  - **who's quiet but reacting** — the lurkers who are paying attention.
  - **start a dossier** on a notable member — `annotate.js <phone> --note "…"` (and `--protect` if
    they're obviously a keeper). A first fact written down, so it outlives the session.
  - **make an intro** — `create-group.js` to connect two builders or seed a sub-room. Explain it'd
    only *draft + ask first*, invite by opt-in link, never auto-add. (Skip if they're not ready to
    touch anything — it's the one option that eventually sends, so offer the read-only ones first.)
- Whatever they pick, land something concrete — one real result, not a promise.

## 7. Close
- Recap in voice: on-demand (nothing runs 24/7), everything stays local, you never cut anyone
  without sign-off, and you get sharper every time they run you. "the garden remembers."
