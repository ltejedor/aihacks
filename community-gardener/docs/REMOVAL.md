# Removal: scope safety + how it actually works

Removing someone is irreversible-ish (they must be re-invited) and outward-facing (it posts a
visible system message). Treat it that way.

## The three scopes — never conflate

1. **Remove from a CHAT** — pull from one specific chat (a ≤~1024-member group). They stay in
   the community and every other chat. **Local.**
2. **Remove from the COMMUNITY** — pull from the umbrella group (`umbrella: true` in config).
   This removes them from the whole community → every chat. **Nuclear.**
3. **Remove completely** — out of the community = gone everywhere.

A bare "remove X" means the **specific chat in context**, never the umbrella, unless the operator
says "from the community" / "completely" / "everywhere."

## Always say the scope back, then act

> "Removing X from **\<chat name>** only — they stay in the community and N other chats." or
> "Removing X from the **community** — out of everything."

The remover refuses to run without an explicit group ID and prints this line before doing
anything. When unsure which scope: ask. When unsure about the person: keep.

## How the remover works (the gotchas)

- A **freshly-linked device shows an empty roster** until you query it. Force-load it with
  `Store.GroupQueryAndUpdate(WidFactory.createWid(groupId))` (retry until the participant list is
  non-empty) before searching. (Otherwise you get "0 participants" and a false "not a member.")
- Members are often **`@lid`-addressed**, not phone. Resolve each participant via
  `LidUtils.getPhoneNumber` and match to the target phone — a naive phone match silently misses
  `@lid` members. (In one real run, the member being removed was addressed as `<digits>@lid`, not
  by phone — so the phone-only lookup found "no such member" and would have falsely reported them
  already gone.)
- Remove via `chat.removeParticipants([participantId])` → expect `{status:200}`, then **re-read
  the roster to verify** they're actually gone, and log it.
- The linked account must be an **admin** of the group, or the removal is rejected — surface that
  honestly rather than reporting success.

## One at a time, link once

`tools/remove-member.js` connects, removes one approved person (scope stated, protect-checked,
**asks first**, verified, logged), and exits. The linked session persists (LocalAuth), so you
**won't re-scan** between runs — just run it once per approved person. Don't run tools in
parallel: one WhatsApp session per account at a time.

The removal goes through the approval gate (`lib/approval.js`): it prints the scope sentence and
the person, and waits for your **yes** before touching anything. Switch `config.approval.mode` to
`whatsapp` later to approve from your phone instead.
