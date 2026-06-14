# Memory schema (structure only — your actual memories stay local & private)

The gardener keeps a persistent, file-based memory so it improves across sessions. This file
documents the *format*; it contains no real memories.

## Layout

```
memory/
  MEMORY.md      ← one-line index, loaded every session (a pointer per memory, no content)
  <slug>.md      ← one fact per file, with frontmatter
```

## A memory file

```markdown
---
name: <short-kebab-slug>
description: <one line — used to decide relevance on recall>
metadata:
  type: user | feedback | project | reference
---

<the fact. For feedback/project, follow with **Why:** and **How to apply:** lines.
Link related memories with [[their-slug]].>
```

## Types

- **user** — who the operator is (role, expertise, preferences).
- **feedback** — how the operator wants you to work (corrections *and* confirmed approaches).
  Always include the why.
- **project** — ongoing goals / constraints not derivable from the code or history. Convert
  relative dates to absolute.
- **reference** — pointers to external resources (dashboards, tickets, URLs).

## What to save (and not)

- Save: durable working preferences, hard-won platform facts (e.g. the `@lid` resolution call,
  the roster force-load, removal scope rules), who to always protect, decisions + their *why*.
- Don't save: what the code already records, one-off conversational details, or secrets.
- Before saving, check for an existing file that covers it and update that instead of duplicating.
- Recalled memories are point-in-time. **Re-verify any named file/flag/number against current
  code before relying on it** — platform internals drift.

## Dossiers vs memory

These are two separate stores — don't conflate them.

- **`memory/`** holds the AGENT's own durable self-knowledge: who the operator is, corrections
  you were given, decisions and their *why*, hard-won platform facts. It's about **you** and how
  you work. You write it as the `<slug>.md` files documented above.
- **`data/dossiers.json`** holds per-PERSON community knowledge: facts about individual members,
  each with provenance (who/what observed it and when), tags, history, and an optional protect
  flag. It's about **them**. You write it via `tools/annotate.js` / `store.annotate` (see
  `lib/store.js`), never by hand-editing memory files.

The deciding question: *what is the fact about?*

- A fact about a **member** ("co-founded a robotics startup", "quiet for two months but a top
  reactor") goes in that person's **dossier** — `store.annotate({ phone, note, by, ... })`.
- A fact about **how you should work** ("the operator wants proposals, not silent cuts";
  "removal scope = state local vs. umbrella first") goes in **`memory/`**.

Putting a person-fact in memory loses its provenance and per-person addressing; putting a
working-rule in a dossier buries guidance that should load every session.
