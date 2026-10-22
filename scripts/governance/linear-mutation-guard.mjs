/**
 * SPE-3272 — guarded seam for project-controlled Linear writes.
 * The source-of-truth resolver must be authenticated and owned by the adapter;
 * untrusted candidate records, PR text, and callers cannot supply its evidence.
 * External connector/agent writes outside the adapter cannot be intercepted here.
 */
import { createHash } from 'node:crypto'
import { readAuthorityContract, inspectGovernanceEvidence } from './authority-contract.mjs'

const LIFECYCLE = new Set(['issue.comment', 'issue.status'])
const SCOPE = new Set([
  'issue.create', 'issue.delete', 'issue.scope', 'issue.parent',
  'issue.relation', 'issue.owner',
])
const PHASES = ['phase-1', 'phase-2', 'phase-3', 'phase-4']
const isRecord = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)
const isPlainRecord = (x) => isRecord(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null)
const freezeRecursively = (x) => {
  if (isRecord(x) || Array.isArray(x)) {
    Object.values(x).forEach(freezeRecursively)
    Object.freeze(x)
  }
  return x
}
const nonblank = (x) => typeof x === 'string' && x.trim().length > 0
const blocked = (reason) => Object.freeze({ allowed: false, reason })

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (isRecord(value)) {
    if (!isPlainRecord(value)) throw new Error('non-plain-object')
    const result = {}
    for (const key of Object.keys(value).sort()) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error('unsafe-key')
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('accessor-property')
      result[key] = canonical(descriptor.value)
    }
    return result
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))) return value
  throw new Error('non-json-value')
}

/** Digest the proposed operation: approval for one payload cannot authorize another. */
export function linearMutationDigest(mutation) {
  return createHash('sha256').update(JSON.stringify(canonical(mutation))).digest('hex')
}

function classification(mutation) {
  if (!isRecord(mutation) ||
      !Object.keys(mutation).every((k) => ['kind', 'issueId', 'projectId', 'payload'].includes(k)) ||
      !nonblank(mutation.kind) || !isRecord(mutation.payload)) return null
  if (LIFECYCLE.has(mutation.kind)) {
    if (!nonblank(mutation.issueId) || mutation.projectId !== undefined) return null
    if (mutation.kind === 'issue.comment' &&
        !(Object.keys(mutation.payload).length === 1 && nonblank(mutation.payload.body))) return null
    if (mutation.kind === 'issue.status' &&
        !(Object.keys(mutation.payload).length === 1 && nonblank(mutation.payload.toStatus))) return null
    return 'lifecycle-evidence'
  }
  if (SCOPE.has(mutation.kind)) {
    if (mutation.kind === 'issue.create') {
      return nonblank(mutation.projectId) && mutation.issueId === undefined ? 'backlog-shape' : null
    }
    return nonblank(mutation.issueId) && mutation.projectId === undefined ? 'backlog-shape' : null
  }
  return null
}

function consistentReview(snapshot) {
  if (snapshot.reviewAuthorityConfirmed !== true) return false
  if (snapshot.reviewRegime === 'required') return snapshot.reviewStatus === 'approved'
  if (snapshot.reviewRegime === 'advisory') {
    return snapshot.reviewStatus === 'approved' || snapshot.reviewStatus === 'unavailable'
  }
  // Unavailable review is not authorization for durable scope mutation.
  if (snapshot.reviewRegime === 'unavailable') return false
  if (snapshot.reviewRegime === 'approved-substitute') {
    return snapshot.reviewStatus === 'approved-substitute' && snapshot.currentSubstitutionApproval === true
  }
  return false
}

/** Eligibility is not permission: always resolve the current authority for this exact write. */
export async function authorizeLinearMutation(mutation, resolveCurrentAuthority) {
  // Even read-only authorization must inspect one canonical request, not
  // mutable caller fields read again after the asynchronous authority lookup.
  let submitted
  try {
    submitted = freezeRecursively(canonical(mutation))
  } catch {
    return blocked('invalid-mutation-payload')
  }
  const kind = classification(submitted)
  if (!kind) return blocked('ambiguous-or-unsupported-mutation')
  if (typeof resolveCurrentAuthority !== 'function') return blocked('missing-authority-resolver')
  let digest
  let snapshot
  let contract
  try {
    digest = linearMutationDigest(submitted)
    contract = readAuthorityContract()
    snapshot = await resolveCurrentAuthority(Object.freeze({
      kind: submitted.kind,
      issueId: submitted.issueId ?? null,
      projectId: submitted.projectId ?? null,
      mutationDigest: digest,
    }))
  } catch {
    return blocked('authority-unavailable-or-invalid')
  }
  // A stand-alone caller must not receive a positive decision for an object
  // changed while evidence was fetched. Actual writes must use the wrapper's
  // immutable submitted payload; this check alone is not an atomic commit.
  try {
    if (linearMutationDigest(mutation) !== digest) return blocked('mutation-changed-during-authorization')
  } catch {
    return blocked('mutation-changed-during-authorization')
  }
  if (!isRecord(snapshot) || snapshot.source !== 'authenticated-linear-and-governance' ||
      snapshot.mutationDigest !== digest || snapshot.mutationKind !== submitted.kind ||
      snapshot.issueId !== (submitted.issueId ?? null) ||
      snapshot.projectId !== (submitted.projectId ?? null) ||
      snapshot.mutationClass !== kind || snapshot.classificationVerified !== true ||
      snapshot.approvalState !== 'valid' || snapshot.contractVersion !== contract.policyVersion) {
    return blocked('authority-snapshot-mismatch-or-unverified')
  }
  if (kind === 'lifecycle-evidence') {
    if (snapshot.existingApprovedBoundary !== true || snapshot.verifiedEvidence !== true ||
        snapshot.boundaryChanged !== false || snapshot.createsDurableScope !== false ||
        snapshot.contentReviewedWithinBoundary !== true) {
      return blocked('lifecycle-evidence-outside-approved-boundary')
    }
    if (submitted.kind === 'issue.status') {
      const enteringTerminalState = /^(done|completed)$/i.test(submitted.payload.toStatus)
      const unverifiedTransition = snapshot.statusTransitionVerified !== true ||
        snapshot.reopensTerminalBoundary === true ||
        (enteringTerminalState && snapshot.fullAcceptanceVerified !== true) ||
        (snapshot.fullAcceptanceRequired === true && snapshot.fullAcceptanceVerified !== true)
      if (unverifiedTransition) return blocked('unverified-status-transition')
    }
  } else if (!consistentReview(snapshot)) {
    // The upstream read-only diagnostic currently accepts contradictory reviewer pairs.
    return blocked('contradictory-or-unverified-review')
  } else if (!Array.isArray(snapshot.approvedPhases) ||
             snapshot.approvedPhases.length !== PHASES.length ||
             !snapshot.approvedPhases.every((p, i) => p === PHASES[i]) ||
             snapshot.explicitPhase4Authorization !== true ||
             snapshot.phaseEvidenceVerified !== true ||
             snapshot.approvedMutationDigest !== digest) {
    return blocked('missing-or-stale-phase-authorization')
  }

  let diagnostic
  try { diagnostic = inspectGovernanceEvidence(snapshot, contract) } catch {
    return blocked('invalid-governance-contract')
  }
  const expected = kind === 'lifecycle-evidence'
    ? 'eligible-for-lifecycle-revalidation'
    : 'eligible-for-phase-four-revalidation'
  if (diagnostic.outcome !== expected) return blocked('canonical-governance-evidence-blocked')
  return Object.freeze({ allowed: true, reason: 'authorized-current-snapshot' })
}

/** The trusted adapter supplies the writer; denial never invokes it. */
export async function executeGuardedLinearMutation(mutation, resolveCurrentAuthority, writer) {
  // Capture a canonical, immutable request BEFORE an asynchronous authority read.
  // Never authorize one mutable object and pass a different payload to the writer.
  let submitted
  try {
    submitted = freezeRecursively(canonical(mutation))
  } catch {
    return Object.freeze({ written: false, decision: blocked('invalid-mutation-payload') })
  }
  const decision = await authorizeLinearMutation(submitted, resolveCurrentAuthority)
  if (!decision.allowed) return Object.freeze({ written: false, decision })
  if (typeof writer !== 'function') {
    return Object.freeze({ written: false, decision: blocked('missing-writer') })
  }
  return Object.freeze({ written: true, decision, result: await writer(submitted) })
}

/**
 * Construct only in an authenticated, project-controlled adapter with a
 * non-user-configurable resolver and writer. Calling this factory with
 * untrusted injected functions does NOT establish authentication.
 *
 * A connected writer must re-check revision/approval freshness at its
 * commit boundary; pre-write evaluation alone cannot eliminate a race.
 */
export function createGuardedLinearWriter({ resolveCurrentAuthority, writer } = {}) {
  if (typeof resolveCurrentAuthority !== 'function' || typeof writer !== 'function') {
    throw new TypeError('trusted authority resolver and writer required')
  }
  return Object.freeze({
    submit(mutation) {
      return executeGuardedLinearMutation(mutation, resolveCurrentAuthority, writer)
    },
  })
}
