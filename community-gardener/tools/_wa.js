// Internal helper (NOT a tool): open one authenticated WhatsApp Web session via
// saved LocalAuth and resolve when ready. First run prints a QR to scan once; after
// that it reconnects with no QR. Each tool calls connect(), does ONE thing, destroys.
//
//   const { connect } = require('./_wa');
//   const client = await connect();
//   try { /* one job */ } finally { await client.destroy(); }
//
// Progress/QR go to stderr so a tool's stdout stays clean JSON. Errors surface raw.

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { loadConfig } = require('../lib/config');

function connect(opts = {}) {
  const cfg = loadConfig();
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: cfg.clientId || 'gardener' }),
    puppeteer: {
      headless: opts.headless ?? cfg.headless ?? true,
      timeout: 120000, // NOT 0 — that hangs on this lib
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run'],
    },
    takeoverOnConflict: true,
    takeoverTimeoutMs: 10000,
  });
  client.on('qr', (qr) => { console.error('Scan to link (first run only):'); qrcode.generate(qr, { small: true }); });
  client.on('loading_screen', (p, m) => console.error(`loading ${p}% ${m || ''}`));
  return new Promise((resolve, reject) => {
    client.on('ready', () => resolve(client));
    client.on('auth_failure', (m) => reject(new Error('auth_failure: ' + m)));
    client.initialize().catch(reject);
  });
}

module.exports = { connect };
