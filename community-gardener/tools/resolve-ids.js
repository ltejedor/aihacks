// resolve-ids — turn anonymized @lid ids into real phones + names.
// Purpose: build/grow data/identities.json ({byId, lidToPhone}) and a GROW-ONLY
//          data/name_ledger.json (a name seen once is never lost — coverage only
//          climbs across sweeps). See docs/IDENTITY.md.
// Signature: node tools/resolve-ids.js   →  JSON {ok, contacts, newLidMaps, newNames, ledgerSize, namedPct}

const fs = require('fs');
const path = require('path');
const { connect } = require('./_wa');
const { loadConfig } = require('../lib/config');

(async () => {
  const cfg = loadConfig();
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

    let identities = { byId: {}, lidToPhone: {} };
    try { identities = JSON.parse(fs.readFileSync(cfg.paths.identities, 'utf8')); } catch (e) {}
    identities.byId = identities.byId || {};
    identities.lidToPhone = identities.lidToPhone || {};

    let ledger = {};
    try { ledger = JSON.parse(fs.readFileSync(cfg.paths.nameLedger, 'utf8')); } catch (e) {}

    let newLidMaps = 0, newNames = 0;
    for (const c of contacts) {
      const phone = c.phone ? String(c.phone).replace(/[^0-9]/g, '') : null;
      if (c.lid && phone && !identities.lidToPhone[c.lid]) { identities.lidToPhone[c.lid] = phone; newLidMaps++; }
      else if (c.lid && phone) { identities.lidToPhone[c.lid] = phone; }
      identities.byId[c.id] = { phone, lid: c.lid, name: c.name || (phone && ledger[phone]) || null };
      if (phone && c.name && !ledger[phone]) { ledger[phone] = c.name; newNames++; } // ledger only grows
    }

    fs.mkdirSync(path.dirname(cfg.paths.identities), { recursive: true });
    fs.writeFileSync(cfg.paths.identities, JSON.stringify(identities, null, 2));
    fs.writeFileSync(cfg.paths.nameLedger, JSON.stringify(ledger, null, 2));

    const all = Object.values(identities.byId);
    const named = all.filter(r => r.name).length;
    console.log(JSON.stringify({
      ok: true,
      contacts: contacts.length,
      newLidMaps, newNames,
      ledgerSize: Object.keys(ledger).length,
      namedPct: all.length ? Math.round((100 * named) / all.length) : 0,
    }));
  } finally {
    await client.destroy();
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
