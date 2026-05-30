# Adding your WhatsApp group / channel IDs

WhatsApp **hides the internal group ID** (`...@g.us`) everywhere in the app and on web — it's
not in the page, not copyable from chat info, nothing. So you can't just paste it in. You have
to enumerate the groups your account is in and read the IDs off the live session.

## Get the IDs

1. Make sure puppeteer's Chrome is installed: `npx puppeteer browsers install chrome`.
2. Run the enumerator:

   ```
   node tools/list-all-groups.js
   ```

3. Scan the QR with your phone (WhatsApp → **Linked devices → Link a device**) the first time.
4. It prints every group you're in:

   ```
    1964  XXXXXXXXXXXXXXXXXX@g.us   My Community
    1024  XXXXXXXXXXXXXXXXXX@g.us   Jobs
    1022  XXXXXXXXXXXXXXXXXX@g.us   Main chat
    ...
   ```

5. Copy the `@g.us` IDs of the groups you care about into `config.local.js` under `groups`.

## Umbrella vs. chat — get this right

A WhatsApp **Community** is an umbrella that can hold **more members than any single chat**
(individual group chats cap at ~1024; the community itself can be far larger). In your config:

- Mark the **umbrella** group (the big one — usually larger than 1024) with `umbrella: true`.
  **Removing someone from the umbrella removes them from the whole community — out of every
  chat.** This is the nuclear option.
- Every other group is a normal chat (≤~1024). Removing someone there is **local** — they stay
  in the community and the other chats.

Label them correctly now, because the removal tools refuse to run without an explicit group ID
and will state the scope out loud before acting. See `docs/REMOVAL.md`.

> Note: a tiny "parent/admin" group may also carry a platform `isParentGroup` flag — ignore it
> for operational decisions. The group your members actually live in (the big one) is "the
> community."

## Channels / other chat types

The enumerator lists every group the account is in. WhatsApp **Channels** and 1:1 DMs are a
different object type and aren't community-prunable the same way; the gardener works on group
chats and the community umbrella.
