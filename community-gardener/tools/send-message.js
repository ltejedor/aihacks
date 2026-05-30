// send-message — post ONE message to ONE configured group. Asks first.
// Purpose: send text to a group you've configured, AFTER an approval gate states
//          exactly what will be sent and where (terminal y/N now; swappable to
//          WhatsApp approval via config.approval.mode — see lib/approval.js).
// Signature: node tools/send-message.js <groupId> <text...>
//            → JSON {group, chars, approved, sent}   (exit 2 if you decline)

const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const { confirm } = require('../lib/approval');

(async () => {
  const groupId = process.argv[2];
  const text = process.argv.slice(3).join(' ');
  if (!groupId || !text) throw new Error('Usage: node tools/send-message.js <groupId> <text...>');

  const cfg = loadConfig();
  const g = (cfg.groups || []).find((x) => x.id === groupId);
  if (!g) throw new Error(`group ${groupId} is not in config.local.js — refusing (add it so the target is unambiguous)`);

  const approved = await confirm({
    summary: `Send a message to "${g.name}"${g.umbrella ? ' (the COMMUNITY umbrella — everyone sees it)' : ''}`,
    detail: text,
  });
  if (!approved) { console.log(JSON.stringify({ group: g.name, chars: text.length, approved: false, sent: false })); process.exit(2); }

  const client = await connect();
  try {
    const chat = await client.getChatById(groupId);
    await chat.sendMessage(text);
    console.log(JSON.stringify({ group: g.name, chars: text.length, approved: true, sent: true }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
