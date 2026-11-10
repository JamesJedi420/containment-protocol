const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const C = require('./Controller.cjs');

let _baseCounter = 0;
function base() {
  _baseCounter += 1;
  const d = path.join(os.tmpdir(), 'ctltest-' + process.pid + '-' + _baseCounter);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

test('claim: atomic, exclusive, expired takeover, release', () => {
  const b = base();
  const r1 = C.tryClaim(b, 'ID1', 'ownerA', 60000);
  assert.equal(r1.acquired, true);
  const r2 = C.tryClaim(b, 'ID1', 'ownerB', 60000);
  assert.equal(r2.acquired, false);
  assert.equal(r2.reason, 'already_claimed');
  // expired takeover
  const expired = Object.assign({}, r1.claim, { expiresAt: new Date(Date.now() - 1000).toISOString() });
  fs.writeFileSync(path.join(b, 'claims', 'ID1', 'claim.json'), JSON.stringify(expired));
  const r3 = C.tryClaim(b, 'ID1', 'ownerC', 60000);
  assert.equal(r3.acquired, true);
  assert.equal(C.releaseClaim(b, 'ID1', 'ownerC').released, true);
  assert.equal(C.readClaim(b, 'ID1'), null);
});

test('claim: heartbeat extends expiry', () => {
  const b = base();
  C.tryClaim(b, 'ID2', 'ownerA', 1000);
  const hb = C.heartbeatClaim(b, 'ID2', 'ownerA', 60000);
  assert.equal(hb.ok, true);
  assert.ok(new Date(hb.claim.expiresAt).getTime() > Date.now());
});

test('suppression: completed IDs blocked, new IDs allowed', () => {
  const reg = { items: { 'A': { status: 'completed_archived', skipRedispatch: true }, 'B': { status: 'pending' } } };
  assert.equal(C.isDispatchAllowed('A', reg), false);
  assert.equal(C.isDispatchAllowed('B', reg), true);
  assert.equal(C.isDispatchAllowed('UNKNOWN', reg), true);
});

test('journal: persist intent, resolve ambiguous by destination marker', () => {
  const b = base();
  const intent = C.recordIntent(b, { intent_id: 'i1', stash_id: 'S1', marker: 'STASH:S1', payload: { a: 1 } });
  assert.equal(intent.state, 'sending');
  assert.ok(intent.payload_hash);
  // ambiguous when no marker
  const r1 = C.resolveAmbiguousIntent(b, 'i1', () => 'nothing');
  assert.equal(r1.status, 'still_ambiguous');
  assert.equal(C.loadIntent(b, 'i1').state, 'ambiguous');
  // retry after re-mark sending; marker present -> delivered
  C.updateIntentState(b, 'i1', 'sending');
  const r2 = C.resolveAmbiguousIntent(b, 'i1', () => 'received STASH:S1 message_id:m1');
  assert.equal(r2.status, 'resolved_delivered');
  assert.equal(C.loadIntent(b, 'i1').state, 'delivered');
});

test('receipt: awaiting_receipt, timeout escalation', () => {
  const r = C.createReceipt('i1', 'S1', 'https://chat/x', 1000);
  assert.equal(r.state, 'awaiting_receipt');
  const timed = C.isReceiptTimedOut(Object.assign({}, r, { timeoutAt: new Date(Date.now() - 1).toISOString() }));
  assert.equal(timed, true);
  const esc = C.escalateReceipt(r, 'no_callback');
  assert.equal(esc.state, 'escalated');
});

test('completion: observed marker+message id required; recordedBy-only rejected', () => {
  const ok = C.verifyCompletion('received STASH:ID1 message_id:msg-abc', 'STASH:ID1');
  assert.equal(ok.verified, true);
  const rej = C.verifyCompletion('', null, true);
  assert.equal(rej.verified, false);
  assert.equal(rej.reason, 'recorded_by_only');
  const rejNonEmpty = C.verifyCompletion('received STASH:ID1 message_id:m1', 'STASH:ID1', true);
  assert.equal(rejNonEmpty.verified, false);
  assert.equal(rejNonEmpty.reason, 'recorded_by_only');
  const rej2 = C.verifyCompletion('received STASH:ID1', 'STASH:ID1');
  assert.equal(rej2.verified, false);
});

test('approval: persisted tokens and resume points', () => {
  const b = base();
  C.setPhaseApproval(b, 'S1', 1, 'tok1');
  C.setPhaseApproval(b, 'S1', 2, 'tok2');
  const st = C.approvalState(b, 'S1');
  assert.equal(st.resumePoint, 'awaiting_phase_3_approval');
  assert.equal(st.lastApproved, 2);
  assert.ok(C.getPhaseApproval(b, 'S1', 1));
  assert.equal(C.hasPhaseApproval(b, 'S1', 3), false);
  // Corrupted/non-approved approval file must not advance resume.
  const corruptPath = C.approvalPath(b, 'S1', 3);
  fs.writeFileSync(corruptPath, JSON.stringify({ stash_id: 'S1', phase: 3, state: 'pending' }) + '\n');
  const stCorrupt = C.approvalState(b, 'S1');
  assert.equal(stCorrupt.resumePoint, 'awaiting_phase_3_approval');
  assert.equal(C.hasPhaseApproval(b, 'S1', 3), false);
});
