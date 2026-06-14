// harvest-names — one-time name boost from a WELL-CONNECTED account. READ-ONLY.
// Purpose: link an account that has many saved contacts (e.g. an admin's personal
//          phone), read every contact name, merge into the grow-only name ledger,
//          then LOG OUT (unlink) automatically. WhatsApp only reveals saved-contact
//          names, so a connected account resolves far more people than a burner.
//          Sends nothing, removes nothing. See docs/IDENTITY.md (the address-book point).
// Signature: node tools/harvest-names.js   →  JSON {contacts, named, added, ledgerSize}
// Safety: own auth profile (clientId 'gardener-harvest') — never touches your gardener
//         session; auto-logout() at the end so the account is unlinked.

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { loadConfig } = require('../lib/config');
const store = require('../lib/store');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  loadConfig(); // fail fast with a helpful message if config.local.js is missing (before we open a browser)
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'gardener-harvest' }),
    puppeteer: { headless: false, timeout: 120000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run'] },
    takeoverOnConflict: true, takeoverTimeoutMs: 10000,
  });
  client.on('qr', (q) => { console.error('Scan with the WELL-CONNECTED phone (read-only; it unlinks when done):'); qrcode.generate(q, { small: true }); });

  await new Promise((resolve, reject) => {
    client.on('ready', resolve);
    client.on('auth_failure', (m) => reject(new Error('auth_failure: ' + m)));
    client.initialize().catch(reject);
  });

  try {
    // 'ready' fires BEFORE contacts finish syncing — poll until the named count is
    // stable for 3 reads, then dump (otherwise you harvest an almost-empty store).
    let stable = 0, last = -1;
    for (let i = 0; i < 40 && stable < 3; i++) {
      await delay(8000);
      const n = await client.pupPage.evaluate(() => {
        try { return window.Store.Contact.getModelsArray().filter((c) => c.name || c.pushname).length; } catch (e) { return 0; }
      });
      if (n === last) stable++; else { stable = 0; last = n; }
      console.error(`  …${n} named contacts (stable ${stable}/3)`);
    }

    const res = await client.pupPage.evaluate(() => {
      const S = window.Store; const out = { contacts: 0, named: 0, rows: [] };
      const norm = (s) => String(s || '').replace(/[^0-9]/g, '');
      const l2p = (lid) => { try { const w = S.WidFactory.createWid(lid); const pn = w && S.LidUtils.getPhoneNumber(w); return pn && (pn._serialized || pn); } catch (e) { return null; } };
      for (const c of S.Contact.getModelsArray()) {
        const ser = c.id && c.id._serialized; if (!ser) continue; out.contacts++;
        const nm = c.name || c.pushname || c.formattedName || c.verifiedName || null;
        if (!nm) continue; out.named++;
        const phone = norm(ser.endsWith('@lid') ? l2p(ser) : ser);
        if (phone) out.rows.push({ phone, name: nm });
      }
      return out;
    });

    // Merge into the grow-only name ledger through the store (one load + one save, never overwrites).
    const added = store.rememberNames(res.rows);
    console.log(JSON.stringify({ contacts: res.contacts, named: res.named, added, ledgerSize: Object.keys(store.loadLedger()).length }));
  } finally {
    try { await client.logout(); } catch (e) {}   // unlink the account
    try { await client.destroy(); } catch (e) {}
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
