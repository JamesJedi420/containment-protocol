import test from 'node:test'
import assert from 'node:assert/strict'
import {
  linearMutationDigest, authorizeLinearMutation, executeGuardedLinearMutation,
} from './linear-mutation-guard.mjs'
import { readAuthorityContract } from './authority-contract.mjs'

const version = readAuthorityContract().policyVersion
const lifecycle = { kind: 'issue.comment', issueId: 'SPE-3272', payload: { body: 'Verified scoped progress.' } }
const shape = { kind: 'issue.scope', issueId: 'SPE-3272', payload: { description: 'Updated approved scope' } }
const phases = ['phase-1', 'phase-2', 'phase-3', 'phase-4']
function authority(mutation, changes = {}) {
  const kind = mutation.kind === 'issue.comment' || mutation.kind === 'issue.status'
    ? 'lifecycle-evidence' : 'backlog-shape'
  const digest = linearMutationDigest(mutation)
  return {
    source: 'authenticated-linear-and-governance',
    contractVersion: version, approvalState: 'valid',
    mutationKind: mutation.kind, issueId: mutation.issueId ?? null,
    projectId: mutation.projectId ?? null,
    mutationDigest: digest, approvedMutationDigest: digest,
    mutationClass: kind, classificationVerified: true,
    existingApprovedBoundary: true, verifiedEvidence: true, boundaryChanged: false,
    createsDurableScope: false, contentReviewedWithinBoundary: true,
    statusTransitionVerified: true, fullAcceptanceRequired: false, reopensTerminalBoundary: false,
    approvedPhases: phases, explicitPhase4Authorization: true, phaseEvidenceVerified: true,
    reviewRegime: 'required', reviewStatus: 'approved', reviewAuthorityConfirmed: true,
    ...changes,
  }
}
const resolver = (mutation, changes) => async () => authority(mutation, changes)

test('rejects unknown operations and ambiguous lifecycle content', async () => {
  assert.equal((await authorizeLinearMutation({ kind: 'issue.surprise', issueId: 'SPE-1', payload: {} }, () => {})).allowed, false)
  assert.equal((await authorizeLinearMutation({ ...lifecycle, payload: { body: 'Valid', scope: 'extra' } }, resolver(lifecycle))).allowed, false)
  assert.equal((await authorizeLinearMutation({ kind: 'issue.status', issueId: 'SPE-1', payload: { toStatus: 'Done', description: 'extra' } }, resolver(lifecycle))).allowed, false)
})

test('canonical digest binds authorization to exact request fields and content', async () => {
  assert.notEqual(linearMutationDigest(shape), linearMutationDigest({ ...shape, payload: { description: 'Altered' } }))
  assert.equal((await authorizeLinearMutation(shape, resolver(shape, { approvedMutationDigest: 'wrong' }))).allowed, false)
  assert.equal((await authorizeLinearMutation(shape, resolver(shape, { mutationDigest: 'wrong' }))).allowed, false)
})

test('lifecycle maintenance passes only for verified current within-boundary work', async () => {
  assert.equal((await authorizeLinearMutation(lifecycle, resolver(lifecycle))).allowed, true)
  for (const change of [
    { existingApprovedBoundary: false }, { verifiedEvidence: false },
    { boundaryChanged: true }, { createsDurableScope: true },
    { contentReviewedWithinBoundary: false }, { approvalState: 'stale' },
  ]) assert.equal((await authorizeLinearMutation(lifecycle, resolver(lifecycle, change))).allowed, false)
})

test('cannot mark terminal status complete without full acceptance', async () => {
  const status = { kind: 'issue.status', issueId: 'SPE-3272', payload: { toStatus: 'Done' } }
  assert.equal((await authorizeLinearMutation(status, resolver(status, { fullAcceptanceRequired: false, fullAcceptanceVerified: false }))).allowed, false)
  assert.equal((await authorizeLinearMutation(status, resolver(status, { fullAcceptanceRequired: true, fullAcceptanceVerified: true }))).allowed, true)
  assert.equal((await authorizeLinearMutation(status, resolver(status, { reopensTerminalBoundary: true }))).allowed, false)
})

test('scope requires verified ordered approvals, current phase four and matching digest', async () => {
  assert.equal((await authorizeLinearMutation(shape, resolver(shape))).allowed, true)
  for (const change of [
    { approvedPhases: phases.slice(0, 3) }, { approvedPhases: [...phases].reverse() },
    { phaseEvidenceVerified: false }, { explicitPhase4Authorization: false },
    { approvedMutationDigest: 'historical-approved-payload' },
  ]) assert.equal((await authorizeLinearMutation(shape, resolver(shape, change))).allowed, false)
})

test('contradictory reviewer statuses are blocked despite upstream diagnostic eligibility', async () => {
  for (const change of [
    { reviewRegime: 'unavailable', reviewStatus: 'approved' },
    { reviewRegime: 'unavailable', reviewStatus: 'approved-substitute' },
    { reviewRegime: 'approved-substitute', reviewStatus: 'approved-substitute', currentSubstitutionApproval: false },
    { reviewRegime: 'required', reviewStatus: 'unavailable' },
    { reviewAuthorityConfirmed: false },
  ]) assert.equal((await authorizeLinearMutation(shape, resolver(shape, change))).reason, 'contradictory-or-unverified-review')
})

test('resolver failure and missing resolver block without writing', async () => {
  let writes = 0
  const writer = async () => { writes++; return 'written' }
  assert.equal((await executeGuardedLinearMutation(shape, async () => { throw new Error('outage') }, writer)).written, false)
  assert.equal((await executeGuardedLinearMutation(shape, undefined, writer)).written, false)
  assert.equal(writes, 0)
  assert.equal((await executeGuardedLinearMutation(shape, resolver(shape), writer)).written, true)
  assert.equal(writes, 1)
})

test('new issue creation uses the same authority and approval checks', async () => {
  const create = { kind: 'issue.create', projectId: 'P-SPE-1', payload: { title: 'Approved program' } }
  assert.equal((await authorizeLinearMutation(create, resolver(create))).allowed, true)
  assert.equal((await authorizeLinearMutation({ ...create, issueId: 'SPE-1' }, resolver(create))).allowed, false)
})
