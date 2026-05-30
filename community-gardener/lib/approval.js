// Approval gate for OUTWARD or DESTRUCTIVE actions (sending a message, removing a
// member). Every gate states — in plain words — exactly WHAT will happen and WHERE,
// then waits for a yes before the action runs.
//
// Pluggable by design. config.approval.mode selects how you're asked:
//   'terminal'  (default, built)  — prints the action, reads y/N on the terminal.
//   'whatsapp'  (future seam)     — would post the SAME description to your admin
//                                   channel and resolve on your "yes" reply. Stubbed
//                                   on purpose; the contract is identical, so turning
//                                   it on is a one-file change here (no tool edits).
//   'none'      (opt-out)         — auto-approve, logged. For trusted automation only.
//
// The action shape is the contract every approver shares:
//   { summary: string, detail?: string }  ->  Promise<boolean>

const readline = require('readline');
const { loadConfig } = require('./config');

function terminalConfirm(action) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    console.error('\n— ACTION NEEDS YOUR OK —');
    console.error('  ' + action.summary);
    if (action.detail) for (const line of String(action.detail).split('\n')) console.error('  | ' + line);
    rl.question('Proceed? [y/N] ', (ans) => { rl.close(); resolve(/^y(es)?$/i.test((ans || '').trim())); });
  });
}

// FUTURE: post action.summary + action.detail to cfg.approval.channel, then resolve
// true when the operator replies "yes" in that chat. Same action shape, same boolean
// return as terminalConfirm — so flipping config.approval.mode to 'whatsapp' is all it
// takes. Keep the "state what + where, require an explicit yes" guarantee.
async function whatsappConfirm(/* action, cfg */) {
  throw new Error(
    "approval.mode 'whatsapp' isn't wired yet — use 'terminal' for now. " +
    'The interface is ready; implement the admin-channel post+poll in lib/approval.js.'
  );
}

// confirm(action) -> Promise<boolean>. Use this everywhere; never call an approver directly.
async function confirm(action) {
  let cfg = {};
  try { cfg = loadConfig(); } catch (e) {}
  const mode = (cfg.approval && cfg.approval.mode) || 'terminal';
  if (mode === 'none') { console.error(`[approval:none] auto-approving: ${action.summary}`); return true; }
  if (mode === 'whatsapp') return whatsappConfirm(action, cfg);
  return terminalConfirm(action);
}

module.exports = { confirm };
