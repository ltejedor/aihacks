// send-message — post ONE message to ONE configured group. Asks first.
// Purpose: send text to a group you've configured, AFTER an approval gate states
//          exactly what will be sent and where (terminal y/N now; swappable to
//          WhatsApp approval via config.approval.mode — see lib/approval.js).
//          Optionally @mentions people so WhatsApp highlights+notifies them, and/or
//          quote-replies to an existing message.
// Signature: node tools/send-message.js <groupId> [--mention <phone>]... [--reply <msgId>] <text...>
//            --mention <phone>  (repeatable) highlight+notify that person in the message
//            --reply <msgId>    quote-reply to that message (falls back to plain on stale id)
//            → JSON {group, chars, mentioned:[phones], quoted:bool, approved, sent}
//              (exit 2 if you decline)

const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const { confirm } = require('../lib/approval');
const store = require('../lib/store');

const USAGE = 'Usage: node tools/send-message.js <groupId> [--mention <phone>]... [--reply <msgId>] <text...>';

(async () => {
  const argv = process.argv.slice(2);
  const groupId = argv.shift();
  if (!groupId) throw new Error(USAGE);

  // Pull flags out of argv; whatever's left is the message text (still required).
  const mentionPhones = [];
  let replyTo = null;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mention') {
      const p = argv[++i];
      if (!p) throw new Error('--mention needs a phone number');
      mentionPhones.push(p);
    } else if (a === '--reply') {
      replyTo = argv[++i];
      if (!replyTo) throw new Error('--reply needs a message id');
    } else {
      rest.push(a);
    }
  }
  let text = rest.join(' ');
  if (!text) throw new Error(USAGE);

  const cfg = loadConfig();
  const g = (cfg.groups || []).find((x) => x.id === groupId);
  if (!g) throw new Error(`group ${groupId} is not in config.local.js — refusing (add it so the target is unambiguous)`);

  // Resolve each --mention phone to a jid. A jid renders as a highlighted, notifying @mention
  // ONLY when both the jid is passed to sendMessage({mentions}) AND the literal "@<jid-digits>"
  // token appears in the body. Phones that don't resolve to a jid are skipped + reported.
  const mentions = [];   // jids to pass to sendMessage
  const mentioned = [];  // phones we actually mention (for the report)
  const skipped = [];    // phones that didn't resolve
  for (const phone of mentionPhones) {
    const jid = store.mentionJid(phone);
    if (!jid) { skipped.push(phone); console.error(`skipping --mention ${phone}: no jid resolved`); continue; }
    mentions.push(jid);
    mentioned.push(store.norm(phone));
  }
  if (mentions.length) {
    const tokens = mentions.map((jid) => '@' + jid.split('@')[0]);
    text = text + ' ' + tokens.join(' ');
  }

  const detailParts = [text];
  if (mentioned.length) detailParts.push(`(@mentions ${mentioned.length} ${mentioned.length === 1 ? 'person' : 'people'})`);
  if (replyTo) detailParts.push('(as a quote-reply)');

  const approved = await confirm({
    summary: `Send a message to "${g.name}"${g.umbrella ? ' (the COMMUNITY umbrella — everyone sees it)' : ''}`,
    detail: detailParts.join('\n'),
  });
  if (!approved) {
    console.log(JSON.stringify({ group: g.name, chars: text.length, mentioned, quoted: !!replyTo, approved: false, sent: false }));
    process.exit(2);
  }

  const client = await connect();
  let quoted = false;
  try {
    const chat = await client.getChatById(groupId);
    const opts = {};
    if (mentions.length) opts.mentions = mentions;
    if (replyTo) {
      try {
        await chat.sendMessage(text, { ...opts, quotedMessageId: replyTo });
        quoted = true;
      } catch (e) {
        // Stale/unknown quoted id throws — retry as a plain (still @mentioned) message.
        console.error(`quote-reply failed (${e.message || e}); retrying without the quote`);
        await chat.sendMessage(text, opts);
        quoted = false;
      }
    } else {
      await chat.sendMessage(text, opts);
    }
    console.log(JSON.stringify({ group: g.name, chars: text.length, mentioned, quoted, approved: true, sent: true }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
