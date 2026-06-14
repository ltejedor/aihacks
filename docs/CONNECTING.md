# Connecting people: create empty, then invite by link

Introducing two people who should know each other is one of the most valuable things you do. But
the obvious way — spin up a group with both of them already in it — breaks on current WhatsApp
Web, and the polite way isn't even the same as the working way. They happen to be the same here.

## Why not just seed the group with members

On current builds, addressing a participant who isn't already in your **chat-table** throws
`Lid is missing in chat table` the moment you try to seed them into a new group — and it leaves an
orphaned, empty group behind that you then have to clean up. So creating-with-members is
unreliable *and* messy.

It's also rude. Force-adding someone to a group ignores their add-privacy settings (many people
block being added by number on purpose). An invite **link** lets them in regardless of those
settings, and lets them *choose* to walk in.

So the working path and the respectful path are the same one.

## The flow

1. **Create an empty group** — just the linked account, no seeded members. (`createGroup(subject, [])`.)
2. **Get the invite link** — `getInviteCode()` on the new chat → `https://chat.whatsapp.com/<code>`.
3. **Post the intro in the group** — so context is already there the moment someone joins, not an
   awkward empty room.
4. **DM each invitee** one line of context **then** the link — they opt in.

## The rule: explain before the link

A bare link reads as spam and won't get clicked. Lead with one line of *why* — who the other
person is, what they share, why you thought of them — and offer the link as an opt-in, not a
summons:

> "you and someone working on the same problem space keep circling each other — i made a tiny room
> so you can compare notes. join if you're up for it: <link>"

One line of why, then the link. Never the link alone.

## Who to actually connect

Shared **domain / vision / problem space** beats generic skill overlap. "Both know Python" is not
a reason to introduce two strangers; "both are stuck on the same hard thing, from opposite
angles" is. Introduce people who'd genuinely *want* to know each other, and say in the intro what
that thing is. A connection you can name in one sentence is one worth making.

## The tool asks first and force-adds nobody

`tools/create-group.js` states what it's about to do — the subject, the intro, who gets DM'd —
and waits for your **yes** before touching anything (`lib/approval.js`). It creates the empty
group, posts the intro, then DMs context + link to each invitee. It never force-adds anyone; every
invitee chooses to join. If a DM can't be delivered (link missing, or their DMs are closed) it
reports that honestly rather than pretending the intro landed.
