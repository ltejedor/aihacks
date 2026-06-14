// resolve-ids — turn anonymized @lid ids into real phones + names.
// Purpose: build/grow data/identities.json ({byId, lidToPhone}) and a GROW-ONLY
//          data/name_ledger.json (a name seen once is never lost — coverage only
//          climbs across sweeps). See docs/IDENTITY.md.
// Signature: node tools/resolve-ids.js   →  JSON {ok, contacts, newLidMaps, newNames, ledgerSize, namedPct}

const { connect } = require('./_wa');
const store = require('../lib/store');

(async () => {
  const client = await connect();
  try {
    const contacts = await client.pupPage.evaluate(async () => {
      const Store = window.Store;
      const models = Store.Contact.getModelsArray ? Store.Contact.getModelsArray() : [];
      const res = [];
      for (const c of models) {
        const id = (c.id && c.id._serialized) || '';
        const rec = { id, phone: null, lid: null, name: c.name || c.pushname || c.verifiedName || c.notifyName || null };
        try {
          if (id.includes('@lid')) {
            rec.lid = id;
            const pn = Store.LidUtils.getPhoneNumber(Store.WidFactory.createWid(id));
            if (pn) rec.phone = pn._serialized || pn;
          } else if (id.includes('@c.us')) {
            const lid = Store.LidUtils.getCurrentLid && Store.LidUtils.getCurrentLid(Store.WidFactory.createWid(id));
            if (lid) rec.lid = lid._serialized || lid;
          }
        } catch (e) {}
        res.push(rec);
      }
      return res;
    });

    // Read + write identities and the grow-only name ledger through the store (single source
    // of truth). store.rememberNames enforces the never-overwrite rule in one place.
    const identities = store.loadIdentities();
    identities.byId = identities.byId || {};
    identities.lidToPhone = identities.lidToPhone || {};
    const ledger = store.loadLedger();

    let newLidMaps = 0;
    const nameRows = [];
    for (const c of contacts) {
      const phone = c.phone ? store.norm(c.phone) : null;
      if (c.lid && phone && !identities.lidToPhone[c.lid]) { identities.lidToPhone[c.lid] = phone; newLidMaps++; }
      else if (c.lid && phone) { identities.lidToPhone[c.lid] = phone; }
      identities.byId[c.id] = { phone, lid: c.lid, name: c.name || (phone && ledger[phone]) || null };
      if (phone && c.name) nameRows.push({ phone, name: c.name }); // store applies grow-only
    }

    store.saveIdentities(identities);
    const newNames = store.rememberNames(nameRows);

    const all = Object.values(identities.byId);
    const named = all.filter(r => r.name).length;
    console.log(JSON.stringify({
      ok: true,
      contacts: contacts.length,
      newLidMaps, newNames,
      ledgerSize: Object.keys(store.loadLedger()).length,
      namedPct: all.length ? Math.round((100 * named) / all.length) : 0,
    }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
