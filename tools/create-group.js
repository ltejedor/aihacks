// create-group — make a NEW group chat (e.g. to introduce two people). Asks first.
// Purpose: create a fresh group, post an opening message, and invite people INTO it. On
//          current WhatsApp Web builds you cannot reliably seed a group with members up
//          front — addressing a participant who isn't already in your chat-table throws
//          "Lid is missing in chat table" and leaves an empty group behind. So the proven
//          path is: create the group with just you, grab its invite link, post the intro,
//          then DM each person a SHORT CONTEXT MESSAGE + the link so they opt in. Nobody
//          gets a bare link with no idea what it is. Asks before doing anything outward.
// Signature: node tools/create-group.js "<subject>" <phone|jid> [<phone|jid> ...]
//              [--intro "text posted in the group"]
//              [--invite "context line DM'd to each invitee before the link"]
//            → JSON {created, gid, subject, link, introPosted, invited[], failed[], approved}
//
// Needs the linked account to be able to create groups. The invite link lets people join even
// when add-by-number is blocked by their privacy settings. See docs/CONNECTING.md.

const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');
const { confirm } = require('../lib/approval');
const store = require('../lib/store');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const out = { subject: null, people: [], intro: null, invite: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--intro') { out.intro = argv[++i]; continue; }
    if (a === '--invite') { out.invite = argv[++i]; continue; }
    if (out.subject === null) { out.subject = a; continue; }
    out.people.push(a);
  }
  return out;
}

(async () => {
  const { subject, people, intro, invite } = parseArgs(process.argv.slice(2));
  if (!subject || !people.length) {
    throw new Error('Usage: node tools/create-group.js "<subject>" <phone|jid> [more...] [--intro "..."] [--invite "..."]');
  }
  // Resolve each person to the jid we should DM the invite to (their @lid if known, else @c.us).
  const invitees = people.map((p) => ({ raw: p, name: store.nameFor(p), jid: store.mentionJid(p) })).filter((x) => x.jid);
  const who = invitees.map((x) => x.name || x.raw).join(', ');

  const approved = await confirm({
    summary: `Create a new group "${subject}" and invite ${invitees.length} ${invitees.length === 1 ? 'person' : 'people'}: ${who}`,
    detail: [
      intro ? `Opening message posted in the group:\n${intro}` : '(no opening message)',
      '',
      `Each invitee is DM'd${invite ? ' this context first:\n  ' + invite + '\n' : ' a short note'} then the join link.`,
      'Nobody is force-added; they choose to join.',
    ].join('\n'),
  });
  if (!approved) { console.log(JSON.stringify({ created: false, approved: false, subject })); process.exit(2); }

  const client = await connect();
  try {
    // 1) create an EMPTY group (just the linked account). Seeding with members here is what
    //    triggers "Lid is missing in chat table"; creating empty avoids it entirely.
    const res = await client.createGroup(subject, []);
    if (typeof res === 'string') throw new Error('createGroup failed: ' + res);
    const gid = (res.gid && (res.gid._serialized || res.gid)) || null;
    if (!gid) throw new Error('createGroup returned no group id');

    // 2) get the invite link (the reliable way to bring people in)
    let link = null;
    try { const chat = await client.getChatById(gid); link = 'https://chat.whatsapp.com/' + (await chat.getInviteCode()); } catch (e) {}

    // 3) post the opening message so the group has context the moment someone joins
    let introPosted = false;
    if (intro) { try { await client.sendMessage(gid, intro); introPosted = true; } catch (e) {} }

    // 4) DM each invitee CONTEXT + the link. Context first — a bare link reads as spam and people
    //    won't click it. (Learned the hard way: explain, then offer the link as an opt-in.)
    const invited = [], failed = [];
    for (const inv of invitees) {
      if (!link) { failed.push(inv.raw); continue; }
      const lead = invite ? invite + '\n\n' : '';
      const msg = `${lead}if you're up for it, here's the link to join: ${link}`;
      try { await client.sendMessage(inv.jid, msg); invited.push(inv.name || inv.raw); }
      catch (e) { failed.push(inv.raw); }
      await delay(800);
    }

    console.log(JSON.stringify({ created: true, approved: true, gid, subject, link, introPosted, invited, failed }));
    if (failed.length) process.exit(2); // some invites couldn't be delivered (no link / DM blocked)
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
