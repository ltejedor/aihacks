// read-chat — read recent messages from ONE chat: a group OR a person's DM.
// Purpose: the "read a conversation" primitive. Resolves the target (a @g.us / @lid /
//          @c.us jid, or bare digits -> the person's @lid, falling back to <phone>@c.us),
//          opens the chat (the only thing that makes WhatsApp Web load history;
//          fetchMessages is broken on current builds), reads its loaded messages, and
//          maps each author -> phone -> a display name. PURE READ: no approval, no writes.
// Signature: node tools/read-chat.js <groupId|phone|jid> [limit=20]
//            → JSON {chatId, count, messages:[{from, fromMe, name, body, t}]}  (most recent last)

const { connect } = require('./_wa');
const store = require('../lib/store');

(async () => {
  const arg = process.argv[2];
  const limit = Math.max(1, parseInt(process.argv[3], 10) || 20);
  if (!arg) throw new Error('Usage: node tools/read-chat.js <groupId|phone|jid> [limit=20]');

  // Resolve the target. A full jid (@g.us / @lid / @c.us) is used as-is. Bare digits are a
  // person: prefer their @lid (DM chats are keyed by @lid on current builds), else <phone>@c.us.
  const chatId = arg.includes('@')
    ? arg
    : (store.lidForPhone(arg) || store.norm(arg) + '@c.us');

  const client = await connect();
  try {
    const data = await client.pupPage.evaluate(async (cid, lim) => {
      const S = window.Store;
      let chat = S.Chat.get(cid);
      // If the chat isn't in the store yet (common for a DM never opened this session), ask
      // the high-level API to load it, then re-read from the store.
      if (!chat) {
        try { await window.WWebJS.getChat(cid); } catch (e) {}
        chat = S.Chat.get(cid);
      }
      if (!chat) return { error: 'chat not in store' };
      try { if (S.Cmd && S.Cmd.openChatAt) await S.Cmd.openChatAt({ chat }); } catch (e) {}
      await new Promise((r) => setTimeout(r, 900));
      const models = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : (chat.msgs._models || []);
      const messages = [];
      for (const m of models) {
        if (m.isNotification) continue;
        messages.push({
          id: m.id && m.id._serialized,
          t: m.t,
          fromMe: !!(m.id && m.id.fromMe),
          author: (m.author && (m.author._serialized || m.author)) || (m.from && (m.from._serialized || m.from)) || '',
          body: m.body || m.caption || '',
        });
      }
      return { messages: messages.slice(-lim) };
    }, chatId, limit);

    if (data.error) throw new Error(data.error);

    const messages = (data.messages || []).map((m) => {
      const phone = m.author ? store.toPhone(m.author) : null;
      return {
        from: m.author || null,
        fromMe: !!m.fromMe,
        name: (m.fromMe ? null : (phone && store.nameFor(phone))) || null,
        body: m.body || '',
        t: m.t || 0,
      };
    });

    console.log(JSON.stringify({ chatId, count: messages.length, messages }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
