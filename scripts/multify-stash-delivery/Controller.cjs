/* Deterministic local delivery controller for multify-stash-delivery.
 * Replaces the paused natural-language dispatcher with executable claim, journal,
 * receipt, completion-verification, and phase-approval primitives.
 * Intake (Core.js/AppsScript.js) remains the single-writer snapshot source and is untouched.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const COMPLETED_STATUSES = new Set(['completed_archived', 'delivered', 'baseline_skipped']);
const SUPPRESSION_FLAGS = ['skipRedispatch'];

function sanitizeId(id) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('stash id required');
  return id.trim().replace(/[^A-Za-z0-9._-]/g, '_');
}

function nowIso(now) { return (now instanceof Date ? now : new Date(now || Date.now())).toISOString(); }

/* ---------- Claim service (atomic mkdir) ---------- */
function claimsRoot(base) { return path.join(base, 'claims'); }
function claimPath(base, stashId) { return path.join(claimsRoot(base), sanitizeId(stashId)); }

function readClaim(base, stashId) {
  const dir = claimPath(base, stashId);
  const file = path.join(dir, 'claim.json');
  if (!fs.existsSync(dir) || !fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function tryClaim(base, stashId, owner, ttlMs, now) {
  if (!owner) throw new Error('claim owner required');
  const root = claimsRoot(base);
  fs.mkdirSync(root, { recursive: true });
  const dir = claimPath(base, stashId);
  const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 15 * 60 * 1000;
  const ts = nowIso(now);
  const expiresAt = new Date(new Date(ts).getTime() + ttl).toISOString();
  // Atomic create: mkdir fails with EEXIST if another claim exists.
  let created = false;
  try {
    fs.mkdirSync(dir); // no recursive: atomic exclusive create
    created = true;
  } catch (e) {
    if (e && e.code !== 'EEXIST') throw e;
    // Existing claim: check expiry for takeover.
    const existing = readClaim(base, stashId);
    if (existing && existing.expiresAt && new Date(existing.expiresAt).getTime() > new Date(ts).getTime()) {
      return { acquired: false, reason: 'already_claimed', claim: existing };
    }
    // Expired or corrupt: remove and reclaim.
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    try { fs.mkdirSync(dir); created = true; } catch (e2) {
      if (e2 && e2.code === 'EEXIST') return { acquired: false, reason: 'race_lost', claim: readClaim(base, stashId) };
      throw e2;
    }
  }
  if (!created) return { acquired: false, reason: 'race_lost', claim: readClaim(base, stashId) };
  const claim = { stash_id: stashId, owner, acquiredAt: ts, heartbeatAt: ts, expiresAt, ttlMs: ttl };
  const tmp = path.join(dir, 'claim.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(claim, null, 2) + '\n');
  fs.renameSync(tmp, path.join(dir, 'claim.json'));
  return { acquired: true, claim };
}

function heartbeatClaim(base, stashId, owner, ttlMs, now) {
  const claim = readClaim(base, stashId);
  if (!claim || claim.owner !== owner) return { ok: false, reason: 'not_owner' };
  const ts = nowIso(now);
  const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? (ttlMs) : (claim.ttlMs || 15 * 60 * 1000);
  claim.heartbeatAt = ts;
  claim.expiresAt = new Date(new Date(ts).getTime() + ttl).toISOString();
  claim.ttlMs = ttl;
  const dir = claimPath(base, stashId);
  const tmp = path.join(dir, 'claim.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(claim, null, 2) + '\n');
  fs.renameSync(tmp, path.join(dir, 'claim.json'));
  return { ok: true, claim };
}

function releaseClaim(base, stashId, owner) {
  const claim = readClaim(base, stashId);
  if (claim && owner && claim.owner !== owner) return { released: false, reason: 'not_owner' };
  const dir = claimPath(base, stashId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    return { released: true };
  }
  return { released: false, reason: 'not_found' };
}

function isClaimExpired(claim, now) {
  if (!claim || !claim.expiresAt) return true;
  return new Date(claim.expiresAt).getTime() <= new Date(now || Date.now()).getTime();
}

/* ---------- Completed-ID suppression ---------- */
function deliveryRecordsOf(state) {
  if (!state) return [];
  if (Array.isArray(state.records)) return state.records;
  if (state.items && typeof state.items === 'object') return Object.entries(state.items).map(([id, item]) => ({ stash_id: id, ...item }));
  return [];
}

function isCompletedRecord(rec) {
  if (!rec) return false;
  const status = rec.status || rec.historicalDeliveryStatus || rec.reconciliationStatus;
  if (COMPLETED_STATUSES.has(status)) return true;
  if (rec.skipRedispatch === true) return true;
  if (rec.archiveStatus === 'archived' && rec.reconciliationStatus === 'completed') return true;
  return false;
}

function isDispatchAllowed(stashId, registry) {
  const recs = deliveryRecordsOf(registry);
  const rec = recs.find(r => r.stash_id === stashId || r.id === stashId);
  if (!rec) return true; // unknown id: allowed pending other checks
  if (isCompletedRecord(rec)) return false;
  return true;
}

/* ---------- Journal / intent ---------- */
function intentsRoot(base) { return path.join(base, 'intents'); }
function intentPath(base, intentId) { return path.join(intentsRoot(base), sanitizeId(intentId) + '.json'); }

function recordIntent(base, intent) {
  if (!intent || !intent.intent_id) throw new Error('intent_id required');
  const root = intentsRoot(base);
  fs.mkdirSync(root, { recursive: true });
  const payload = Object.assign({}, intent);
  payload.state = payload.state || 'sending';
  payload.recordedAt = payload.recordedAt || nowIso();
  if (payload.payload && !payload.payload_hash) {
    payload.payload_hash = crypto.createHash('sha256').update(JSON.stringify(payload.payload)).digest('hex');
  }
  const file = intentPath(base, intent.intent_id);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return payload;
}

function loadIntent(base, intentId) {
  const file = intentPath(base, intentId);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function listIntents(base) {
  const root = intentsRoot(base);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch (_) { return null; } })
    .filter(Boolean);
}

function updateIntentState(base, intentId, state, extra) {
  const intent = loadIntent(base, intentId);
  if (!intent) return null;
  intent.state = state;
  intent.updatedAt = nowIso();
  if (extra) Object.assign(intent, extra);
  const file = intentPath(base, intentId);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(intent, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return intent;
}

// On restart: orphaned 'sending' intent is ambiguous. Read destination for marker before any retry.
function resolveAmbiguousIntent(base, intentId, readDestination) {
  const intent = loadIntent(base, intentId);
  if (!intent) return { status: 'not_found' };
  if (intent.state !== 'sending') return { status: 'not_ambiguous', intent };
  // ambiguous: must inspect destination before retry
  let destinationText = '';
  try { destinationText = typeof readDestination === 'function' ? (readDestination(intent) || '') : ''; } catch (e) { destinationText = ''; }
  const marker = intent.marker || intent.stash_id;
  const found = !!marker && String(destinationText).includes(String(marker));
  if (found) {
    updateIntentState(base, intentId, 'delivered', { receiptVerified: true, resolvedBy: 'destination_marker', resolvedAt: nowIso() });
    return { status: 'resolved_delivered', intent: loadIntent(base, intentId) };
  }
  // not found: remains ambiguous, do NOT resend blindly
  updateIntentState(base, intentId, 'ambiguous', { resolvedBy: null, checkedAt: nowIso() });
  return { status: 'still_ambiguous', intent: loadIntent(base, intentId) };
}

/* ---------- Receipt tracking ---------- */
const RECEIPT_STATES = ['pending', 'sending', 'awaiting_receipt', 'delivered', 'escalated', 'timeout'];

function transitionReceipt(intent, nextState, evidence) {
  if (!RECEIPT_STATES.includes(nextState)) throw new Error('invalid receipt state: ' + nextState);
  const updated = Object.assign({}, intent, { state: nextState, receiptUpdatedAt: nowIso() });
  if (evidence) updated.receiptEvidence = evidence;
  return updated;
}

function createReceipt(intentId, stashId, destinationUrl, timeoutMs) {
  const now = nowIso();
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30 * 60 * 1000;
  return {
    intent_id: intentId,
    stash_id: stashId,
    destination_url: destinationUrl || null,
    state: 'awaiting_receipt',
    createdAt: now,
    timeoutAt: new Date(new Date(now).getTime() + timeout).toISOString(),
    timeoutMs: timeout,
    receiptVerified: false,
  };
}

function isReceiptTimedOut(receipt, now) {
  if (!receipt || !receipt.timeoutAt) return false;
  if (receipt.state !== 'awaiting_receipt') return false;
  return new Date(receipt.timeoutAt).getTime() <= new Date(now || Date.now()).getTime();
}

function escalateReceipt(receipt, reason) {
  return Object.assign({}, receipt, { state: 'escalated', escalatedAt: nowIso(), escalationReason: reason || 'receipt_timeout' });
}

/* ---------- Completion verification ---------- */
function verifyCompletion(destinationText, marker, recordedByOnlyEvidence) {
  // Reject recordedBy-only evidence regardless of destination text content.
  if (recordedByOnlyEvidence) return { verified: false, reason: 'recorded_by_only' };
  if (!destinationText) return { verified: false, reason: 'no_destination_content' };
  if (!marker) return { verified: false, reason: 'no_marker' };
  const text = String(destinationText);
  const hasMarker = text.includes(String(marker));
  // Require an observed message id/marker re-read from destination.
  const messageIdMatch = text.match(/message[_-]?id\s*[:=]\s*([A-Za-z0-9_-]+)/i) || text.match(/Sentinel_[A-Za-z0-9_-]+/);
  const observedMessageId = messageIdMatch ? messageIdMatch[0] : null;
  if (!hasMarker) return { verified: false, reason: 'marker_not_found' };
  if (!observedMessageId) return { verified: false, reason: 'no_observed_message_id' };
  return { verified: true, marker, observedMessageId };
}

/* ---------- Phase approval ---------- */
function approvalsRoot(base) { return path.join(base, 'approvals'); }
function approvalPath(base, stashId, phase) { return path.join(approvalsRoot(base), sanitizeId(stashId) + '__phase' + phase + '.json'); }

function setPhaseApproval(base, stashId, phase, token, now) {
  const root = approvalsRoot(base);
  fs.mkdirSync(root, { recursive: true });
  const rec = { stash_id: stashId, phase, token: token || null, approvedAt: nowIso(now), state: 'approved' };
  const file = approvalPath(base, stashId, phase);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return rec;
}

function getPhaseApproval(base, stashId, phase) {
  const file = approvalPath(base, stashId, phase);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function hasPhaseApproval(base, stashId, phase) {
  const rec = getPhaseApproval(base, stashId, phase);
  return !!rec && rec.state === 'approved';
}

function approvalState(base, stashId) {
  // returns resume point: awaiting_phase_N_approval or completed
  // Align with hasPhaseApproval: only state === 'approved' advances resume.
  let lastApproved = 0;
  for (let p = 1; p <= 4; p++) {
    if (hasPhaseApproval(base, stashId, p)) lastApproved = p;
    else break;
  }
  const next = lastApproved + 1;
  if (next > 4) return { resumePoint: 'completed', lastApproved: 4 };
  return { resumePoint: 'awaiting_phase_' + next + '_approval', lastApproved, nextPhase: next };
}

module.exports = {
  // claim
  tryClaim, heartbeatClaim, releaseClaim, readClaim, isClaimExpired, claimPath,
  // suppression
  isCompletedRecord, isDispatchAllowed, deliveryRecordsOf,
  // journal
  recordIntent, loadIntent, listIntents, updateIntentState, resolveAmbiguousIntent, intentPath,
  // receipt
  transitionReceipt, createReceipt, isReceiptTimedOut, escalateReceipt, RECEIPT_STATES,
  // completion
  verifyCompletion,
  // approval
  setPhaseApproval, getPhaseApproval, approvalState, hasPhaseApproval, approvalPath,
  // utils
  sanitizeId, nowIso,
};
