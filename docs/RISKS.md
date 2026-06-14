# Risks: this is unofficial automation, and accounts can be banned

Read this before you run anything. It's short and it's honest.

## What this actually is

The gardener drives **WhatsApp Web** through `whatsapp-web.js` + puppeteer — an unofficial,
reverse-engineered automation of the web client. It is **against WhatsApp's Terms of Service**.
There is no blessed path here: accounts that automate WhatsApp **can be flagged or banned**, with
no warning and no appeal. Assume that risk is real, not theoretical.

## How to keep the risk low

- **Use a number you can afford to lose.** Not your personal line, not the only way people reach
  you. A dedicated number for this.
- **Go low and slow.** No bursts, no mass actions, no scripted loops hammering the API. A handful
  of deliberate actions beats a hundred automated ones. The tools are single-purpose and run one
  at a time on purpose — keep it that way.
- **On-demand, never a daemon.** The gardener runs when you call it, gets current, and stops.
  Nothing runs 24/7. A long-lived headless process pinging WhatsApp all day is exactly what gets
  noticed.
- **Human in the loop for anything outward or destructive.** Every send, every removal, every new
  group goes through the approval gate (`lib/approval.js`) — you say yes before it touches
  WhatsApp. Don't route around it.
- **Stay in your own garden.** This is for stewarding a community **you run**, with members who
  know they're in it. It is not a scraper. Don't point it at communities that aren't yours, and
  don't harvest people who didn't opt into yours.

## Why the official WhatsApp Business API isn't a drop-in replacement

People reasonably ask "why not just use the supported API?" Because it can't do this job:

- It **can't read group message history** — so it can't see who's actually engaged.
- It **can't enumerate, manage, or remove group members** — the core of pruning is simply not
  exposed.
- It's built for **business → customer messaging** (templates, opt-in notifications), not for
  stewarding a peer community.

The capabilities this harness needs aren't offered there, which is precisely why it leans on the
unofficial web client — and why the risks above come with it.

## Your responsibility

You are responsible for how you use this. Respect the people in your community: their messages,
names, and numbers are theirs. The gardener keeps all of that **local and gitignored** (`data/`,
`memory/`) — it never leaves your machine, and it should stay that way. When in doubt, do less.
