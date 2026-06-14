// annotate — write a finding onto a person's dossier. LOCAL only: no WhatsApp, no approval gate.
// Purpose: a thin CLI over store.annotate — "keep track of new information about people."
//          Records a note (idempotent), fills a real name (only if we lack one — feeds the
//          grow-only ledger), adds tags, and optionally protects them. Pure local write
//          (data/ via lib/store); never connects a session. See lib/store.js → annotate().
// Signature: node tools/annotate.js <phone> --note "..." [--name "..."] [--tag t]... [--protect] [--by src]
//            → JSON {ok, phone, name, protected, protectedNow} | {ok:false, err}

const store = require('../lib/store');

(async () => {
  const argv = process.argv.slice(2);
  let phone = null, note = null, name = null, by = 'cli', protect = false;
  const tags = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--note') note = argv[++i];
    else if (a === '--name') name = argv[++i];
    else if (a === '--tag') tags.push(argv[++i]);     // repeatable: collect each into the array
    else if (a === '--protect') protect = true;        // boolean flag (no value)
    else if (a === '--by') by = argv[++i];
    else if (!a.startsWith('--') && phone === null) phone = a;
  }

  if (!phone) throw new Error('Usage: node tools/annotate.js <phone> --note "..." [--name "..."] [--tag t]... [--protect] [--by src]');

  const res = store.annotate({ phone, note, name, tags, by, protect });
  console.log(JSON.stringify(res));
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
