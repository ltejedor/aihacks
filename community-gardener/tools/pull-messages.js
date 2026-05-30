// pull-messages — read recent activity from each configured group.
// Purpose: open each chat (the only thing that makes WhatsApp Web load history;
//          fetchMessages is broken on current builds) and append its recent messages
//          + reactions to data/, deduped. Engagement is keyed by id (phone or @lid).
// Signature: node tools/pull-messages.js   →  JSON {groups:{<name>:{messages,reactions,loaded}}}

const fs = require('fs');
const path = require('path');
const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pid = (id) => (id || '').replace('@c.us', '').replace('@g.us', ''); // keep @lid intact

function appendDeduped(file, rows, keyOf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const seen = new Set();
  try { for (const l of fs.readFileSync(file, 'utf8').split('\n')) { if (l.trim()) { try { seen.add(keyOf(JSON.parse(l))); } catch (e) {} } } } catch (e) {}
  const out = fs.createWriteStream(file, { flags: 'a' });
  let added = 0;
  for (const r of rows) { const k = keyOf(r); if (k && !seen.has(k)) { seen.add(k); out.write(JSON.stringify(r) + '\n'); added++; } }
  out.end();
  return added;
}

(async () => {
  const cfg = loadConfig();
  if (!cfg.groups || !cfg.groups.length) throw new Error('config.local.js has no groups — run tools/list-all-groups.js first');
  const client = await connect();
  try {
    const summary = {};
    for (const g of cfg.groups) {
      // Open the chat, read its loaded models + each message's reactions (proven path).
      const data = await client.pupPage.evaluate(async (gid) => {
        const S = window.Store;
        const chat = S.Chat.get(gid);
        if (!chat) return { error: 'chat not in store', messages: [] };
        try { if (S.Cmd && S.Cmd.openChatAt) await S.Cmd.openChatAt({ chat }); } catch (e) {}
        await new Promise((r) => setTimeout(r, 900));
        const rxApi = !!(S.Reactions && S.Reactions.find);
        const models = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : (chat.msgs._models || []);
        const messages = [];
        for (const m of models) {
          if (m.isNotification) continue;
          const id = m.id && m.id._serialized;
          const reactions = [];
          if (id && m.hasReaction && rxApi) {
            try {
              const mr = await S.Reactions.find(m.id);
              const groups = mr && mr.reactions ? (mr.reactions.serialize ? mr.reactions.serialize() : mr.reactions) : [];
              for (const r of (groups || [])) for (const s of (r.senders || [])) {
                reactions.push({ emoji: r.aggregateEmoji || r.reactionText || r.text || '', sender: s.senderUserJid || (s.id && (s.id._serialized || s.id)) || '', t: s.timestamp });
              }
            } catch (e) {}
          }
          messages.push({ id, t: m.t, author: (m.author && (m.author._serialized || m.author)) || (m.from && (m.from._serialized || m.from)) || '', body: m.body || m.caption || '', reactions });
        }
        return { messages };
      }, g.id);

      const msgs = [], rx = [];
      for (const m of (data.messages || [])) {
        if (!m.id) continue;
        msgs.push({ msgId: m.id, groupId: g.id, authorId: pid(m.author), body: (m.body || '').slice(0, 1000), timestamp: m.t || 0 });
        for (const r of m.reactions) if (r.emoji && r.sender) rx.push({ msgId: m.id, groupId: g.id, senderId: pid(r.sender), emoji: r.emoji, timestamp: r.t || m.t || 0 });
      }
      summary[g.name || g.id] = {
        loaded: (data.messages || []).length,
        messages: appendDeduped(cfg.paths.messages, msgs, (r) => r.msgId),
        reactions: appendDeduped(cfg.paths.reactions, rx, (r) => `${r.senderId}|${r.emoji}|${r.msgId}`),
        error: data.error,
      };
      await delay(1000);
    }
    console.log(JSON.stringify({ groups: summary }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
