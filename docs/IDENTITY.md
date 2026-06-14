# Identity resolution: `@lid` → phone → name

This is the single most important unlock. Without it, engagement is silently dropped and you
prune real people.

## The problem

Modern WhatsApp addresses many members by an anonymized **`@lid`** ID instead of their phone
number (a privacy feature). So:

- A reaction or message arrives keyed by `<digits>@lid`, which doesn't join to a phone number.
- Your registry is keyed by phone.
- Result: the reactor/poster looks like a stranger with no activity → they get scored PRUNE,
  even though they're one of your most engaged members. (In the source community, only 27 of
  127 reactors could be matched by hand; the rest were "resolved manually," which was miserable.)

## The fix

WhatsApp Web keeps an internal **LID ↔ phone-number map**. You can read it directly:

```js
// in page context (puppeteer evaluate), via whatsapp-web.js's injected window.Store:
const wid   = window.Store.WidFactory.createWid('<digits>@lid');
const phone = window.Store.LidUtils.getPhoneNumber(wid);  // -> '<realphone>@c.us'
// reverse: window.Store.LidUtils.getCurrentLid(phoneWid)
```

`tools/resolve-ids.js` does this in bulk: it dumps every contact + every `@lid` seen in your
message/reaction logs, resolves each to a phone, and writes `data/identities.json`:

```json
{ "byId": { "<id>": { "phone": "...", "lid": "...", "name": "..." } },
  "lidToPhone": { "<digits>@lid": "<phone>" } }
```

In the source run this resolved **100%** of needed reactor/author lids (vs ~21% by hand).

## Use it everywhere

When scoring, building recent-activity sets, or matching a prune candidate, **map every id
through `identities.json` first** (`lidToPhone[id] || normalize(id)`), then key on the phone.
Re-run `resolve-ids.js` at the start of every sweep — the map is cached per session and resolves
more from the account that has more saved contacts.
