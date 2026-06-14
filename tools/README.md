# tools/

Single-purpose, composable tools. Each does **one thing**, reads YOUR community from
`config.local.js` (never hardcoded), prints **machine-friendly JSON to stdout** (progress
+ QR + prompts go to stderr), and surfaces raw errors with a non-zero exit. The agent
(Claude Code) orchestrates them; no tool chains another.

Run from the repo root. They share one linked session via `_wa.js` — **link once**
(scan the QR on the first connect); later runs reuse it with no re-scan. One WhatsApp
session per account at a time, so run them one at a time.

| tool | purpose | signature |
|---|---|---|
| `list-all-groups.js` | enumerate every group the account is in (how you discover IDs — WhatsApp hides them) | `node tools/list-all-groups.js` |
| `resolve-ids.js` | `@lid → phone → name`; grows the permanent name ledger | `node tools/resolve-ids.js` |
| `harvest-names.js` | one-time name boost from a well-connected account (read-only, auto-unlinks) | `node tools/harvest-names.js` |
| `pull-messages.js` | append recent messages + reactions from each group (deduped) | `node tools/pull-messages.js` |
| `snapshot-members.js` | record each group's live roster (`{id,isAdmin}`) + whether you're admin | `node tools/snapshot-members.js` |
| `list-pending.js` | the onboarding queue: who's requested to join | `node tools/list-pending.js` |
| `send-message.js` | post one message to one group — **asks first** (states what + where); `--mention <phone>` (repeatable) and `--reply <msgId>` | `node tools/send-message.js <groupId> [--mention <phone>]… [--reply <msgId>] <text…>` |
| `remove-member.js` | remove one person from one group — scope-stated, protect-checked, **asks first**, verifies, logs | `node tools/remove-member.js <groupId> <phone> [who]` |
| `create-group.js` | make a new group / introduce people — explains context, invites by link, asks first | `node tools/create-group.js "<subject>" <phone>… [--intro …] [--invite …]` |
| `annotate.js` | write a note/fact onto a person's dossier (+optional protect) — local, no WhatsApp | `node tools/annotate.js <phone> --note "…" [--name] [--tag] [--protect]` |
| `read-chat.js` | read recent messages from any chat incl. a DM (lid-aware) | `node tools/read-chat.js <groupId\|phone> [limit]` |
| `approve-request.js` | approve/decline a pending join request — asks first | `node tools/approve-request.js <groupId> <phone> [--decline]` |

Scoring lives in `../pipeline/` (read-only, no WhatsApp):
`score-members.js` (→ `data/scored.json`) then `find-prune-candidates.js` (safe shortlist;
**refuses on stale / mostly-unresolved data**).

## Shared pieces (not tools)
- `_wa.js` — opens one authenticated session and resolves when ready; each tool calls it,
  does its one job, and destroys. QR/progress to stderr.
- `../lib/store.js` — the single source-of-truth data layer every tool + pipeline reads/writes
  through (id resolution `@lid` ↔ phone ↔ name, grow-only name ledger, dossiers, protect layer,
  JSONL append-with-dedup).
- `../lib/config.js` — loads `config.local.js` (clear error if missing).
- `../lib/approval.js` — the **ask-first gate** for `send-message` / `remove-member`. Default
  `terminal` (y/N). Built so switching to WhatsApp-approval later is a one-file change — same
  `confirm({summary, detail})` contract, just `config.approval.mode`.

## Porting note
These are the deidentified, config-driven versions of a working toolset. Every group ID,
phone, name, and path comes from `config.local.js` / `data/` — **nothing community-specific
lives in tool code.** The behaviors they encode (force-load the roster, lid-aware matching,
open-chat-to-load-history, the protect/recency gates, scope statements, ask-first) are the
hard-won part — preserve those.

> Requires `whatsapp-web.js`, `qrcode-terminal`, and a puppeteer Chrome
> (`npm install` then `npm run chrome`).
