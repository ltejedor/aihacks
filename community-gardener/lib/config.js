// Shared config loader. Every tool + pipeline stage reads YOUR community from
// config.local.js (gitignored). Nothing community-specific lives in the template.
const path = require('path');

function loadConfig() {
  const p = path.join(__dirname, '..', 'config.local.js');
  try {
    return require(p);
  } catch (e) {
    throw new Error(
      `No config.local.js at ${p}\n` +
      `→ cp config.example.js config.local.js, then fill in your groups (node tools/list-all-groups.js).\n` +
      `(${e.message})`
    );
  }
}

module.exports = { loadConfig };
