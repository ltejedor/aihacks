// Enumerate EVERY group this account is in: name + @g.us id + member count.
// This is how you discover your group IDs (WhatsApp hides them). See docs/ADD_CHAT_IDS.md.
// Config-driven: reads clientId from config.local.js (falls back to config.example.js).
// Generic — nothing community-specific. Output: data/all_groups.json + a printed table.

const path = require('path');
let config; try { config = require('../config.local.js'); } catch (e) { config = require('../config.example.js'); }
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const OUT = path.join(__dirname, '..', (config.paths && config.paths.data) || 'data', 'all_groups.json');
const lidOrPhone = id => (id || '').replace('@c.us', '').replace('@g.us', ''); // keep @lid suffix intact

const client = new Client({
  authStrategy: new LocalAuth({ clientId: config.clientId || 'gardener' }),
  puppeteer: { headless: true, timeout: 120000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--disable-extensions'] },
  takeoverOnConflict: true, takeoverTimeoutMs: 10000,
});

client.on('qr', q => { console.log('Scan this QR (WhatsApp → Linked devices → Link a device):\n'); qrcode.generate(q, { small: true }); });
client.on('loading_screen', (p, m) => console.log(`loading ${p}% — ${m}`));
client.on('authenticated', () => console.log('authenticated ✓'));
client.on('auth_failure', m => { console.error('auth failure:', m); process.exit(1); });

client.on('ready', async () => {
  try {
    const groups = (await client.getChats()).filter(c => c.isGroup);
    const out = {
      fetchedAt: new Date().toISOString(),
      totalGroups: groups.length,
      groups: groups.map(g => ({
        id: g.id._serialized,
        name: g.name || g.id._serialized,
        memberCount: (g.participants || []).length,
        isParent: !!(g.groupMetadata && g.groupMetadata.isParentGroup),
        members: (g.participants || []).map(p => ({ id: p.id._serialized, phone: lidOrPhone(p.id._serialized), isAdmin: !!(p.isAdmin || p.isSuperAdmin) })),
      })).sort((a, b) => b.memberCount - a.memberCount),
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log('\nmembers  id                              name');
    for (const g of out.groups) console.log(`${String(g.memberCount).padStart(6)}  ${g.id.padEnd(30)}  ${g.isParent ? '[parent] ' : ''}${g.name}`);
    console.log(`\nTip: the group with the MOST members (often >1024) is your community umbrella → mark it umbrella:true in config.`);
    console.log(`wrote ${OUT}`);
  } catch (e) { console.error('error:', e.message); }
  finally { try { await client.destroy(); } catch (e) {} process.exit(0); }
});

console.log('connecting…');
client.initialize();
