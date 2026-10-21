import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readAuthorityContract,
  validateAuthorityContract,
  inspectGovernanceEvidence,
} from './authority-contract.mjs'

const base = readAuthorityContract()
const clone = () => structuredClone(base)
const current = {
  mutationClass: 'backlog-shape',
  contractVersion: base.policyVersion,
  approvalState: 'valid',
  approvedPhases: ['phase-1', 'phase-2', 'phase-3', 'phase-4'],
  explicitPhase4Authorization: true,
}

test('canonical contract validates and has immutable rule identities', () => {
  assert.equal(validateAuthorityContract(base), true)
  assert.equal(new Set(base.criticalRules.map((r) => r.id)).size, base.criticalRules.length)
  assert.equal(base.status, 'policy-projection-not-authority')
})

test('unknown/incompatible versions and fields fail closed', () => {
  for (const edit of [
    (c) => { c.schemaVersion = 2 },
    (c) => { c.policyVersion = '2.0.0' },
    (c) => { c.newAuthority = true },
    (c) => { delete c.externalReview },
  ]) {
    const c = clone()
    edit(c)
    assert.throws(() => validateAuthorityContract(c), /governance-contract:/)
  }
})

test('precedence and source-provenance cannot silently promote lower-authority copies', () => {
  const reversed = clone()
  reversed.authorityOrder.reverse()
  assert.throws(() => validateAuthorityContract(reversed), /authority/)
  const spoofed = clone()
  spoofed.criticalRules[0].sourceRef = 'repository:AGENTS.md'
  assert.throws(() => validateAuthorityContract(spoofed), /source does not support/)
  const duplicated = clone()
  duplicated.criticalRules[1].id = duplicated.criticalRules[0].id
  assert.throws(() => validateAuthorityContract(duplicated), /duplicate/)
})

test('phase ordering and final-phase-only scope authority are mandatory', () => {
  const reordered = clone()
  reordered.phases[2].prerequisites.reverse()
  assert.throws(() => validateAuthorityContract(reordered), /prerequisites/)
  const earlyMutation = clone()
  earlyMutation.phases[1].mayChangeDurableScope = true
  assert.throws(() => validateAuthorityContract(earlyMutation), /Phase 4/)
  const missingPhase = clone()
  missingPhase.mutationClasses[2].requiresPhases = ['phase-1','phase-3','phase-4']
  assert.throws(() => validateAuthorityContract(missingPhase), /all phases/)
})

test('approved phase evidence is required in order and does not become a write token', () => {
  assert.deepEqual(inspectGovernanceEvidence(current), {
    outcome: 'eligible-for-phase-four-revalidation',
    reasons: [],
  })
  for (const evidence of [
    { ...current, approvedPhases: ['phase-2','phase-1','phase-3','phase-4'] },
    { ...current, approvedPhases: ['phase-1','phase-2','phase-3'] },
    { ...current, explicitPhase4Authorization: false },
  ]) {
    assert.equal(inspectGovernanceEvidence(evidence).outcome, 'blocked')
  }
})

test('missing, stale, superseded, contradictory and unknown approvals fail closed', () => {
  for (const state of ['missing','stale','superseded','contradictory','incomplete','unknown','unexpected']) {
    const result = inspectGovernanceEvidence({ ...current, approvalState: state })
    assert.equal(result.outcome, 'blocked')
  }
  assert.equal(inspectGovernanceEvidence({ ...current, contractVersion: '0.9.0' }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({ ...current, mutationClass: 'unknown-class' }).outcome, 'blocked')
})

test('existing-boundary lifecycle evidence is distinct from new scope', () => {
  const sample = {
    mutationClass: 'lifecycle-evidence',
    contractVersion: base.policyVersion,
    approvalState: 'valid',
    existingApprovedBoundary: true,
    verifiedEvidence: true,
    boundaryChanged: false,
  }
  assert.equal(inspectGovernanceEvidence(sample).outcome, 'eligible-for-lifecycle-revalidation')
  assert.equal(inspectGovernanceEvidence({ ...sample, boundaryChanged: true }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({ ...sample, verifiedEvidence: false }).outcome, 'blocked')
})

test('maintenance exception cannot silently authorize durable scope or linear writes', () => {
  const sample = {
    mutationClass: 'bounded-maintenance',
    contractVersion: base.policyVersion,
    approvalState: 'valid',
    explicitlyAuthorized: true,
    createsDurableScope: false,
    mutatesLinear: false,
  }
  assert.equal(inspectGovernanceEvidence(sample).outcome, 'read-only-or-maintenance')
  assert.equal(inspectGovernanceEvidence({ ...sample, explicitlyAuthorized: false }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({ ...sample, createsDurableScope: true }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({ ...sample, mutatesLinear: true }).outcome, 'blocked')
  const c = clone()
  c.maintenanceException.mayCreateChild = true
  assert.throws(() => validateAuthorityContract(c), /maintenance/)
})

test('ambiguous/read-only classes never admit writes', () => {
  assert.equal(inspectGovernanceEvidence({
    mutationClass: 'ambiguous', contractVersion: base.policyVersion, approvalState: 'valid',
  }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({
    mutationClass: 'read-only', contractVersion: base.policyVersion, approvalState: 'valid', mutatesLinear: true,
  }).outcome, 'blocked')
})

test('reviewer degradation is deterministic and never invents approval', () => {
  assert.equal(inspectGovernanceEvidence({ ...current, reviewRegime: 'required', reviewStatus: 'unavailable' }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({ ...current, reviewRegime: 'required', reviewStatus: 'approved' }).outcome, 'eligible-for-phase-four-revalidation')
  assert.equal(inspectGovernanceEvidence({ ...current, reviewRegime: 'approved-substitute', reviewStatus: 'approved-substitute' }).outcome, 'blocked')
  assert.equal(inspectGovernanceEvidence({
    ...current,
    reviewRegime: 'approved-substitute',
    reviewStatus: 'approved-substitute',
    currentSubstitutionApproval: true,
  }).outcome, 'eligible-for-phase-four-revalidation')
  assert.equal(inspectGovernanceEvidence({ ...current, reviewRegime: 'random', reviewStatus: 'approved' }).outcome, 'blocked')
  assert.deepEqual(inspectGovernanceEvidence({ ...current, reviewRegime: 'required' }).reasons, ['incomplete-review-evidence'])
  assert.deepEqual(inspectGovernanceEvidence({ ...current, reviewStatus: 'approved' }).reasons, ['incomplete-review-evidence'])
  assert.equal(inspectGovernanceEvidence({ ...current, reviewRegime: 'advisory', reviewStatus: 'unavailable' }).outcome, 'eligible-for-phase-four-revalidation')
})

test('invalid evidence diagnostics remain immutable and safely blocked', () => {
  const diagnostic = inspectGovernanceEvidence(null)
  assert.equal(diagnostic.outcome, 'blocked')
  assert.deepEqual(diagnostic.reasons, ['invalid-snapshot'])
  assert.equal(Object.isFrozen(diagnostic.reasons), true)
  assert.throws(() => diagnostic.reasons.push('tamper'), TypeError)
})

test('schema rejects forged current-user policy and duplicate ownership', () => {
  const c = clone()
  c.crossWorkstream.sharedImplementationOwnerCount = 2
  assert.throws(() => validateAuthorityContract(c), /workstream/)
  const copy = clone()
  copy.status = 'canonical-policy-authority'
  assert.throws(() => validateAuthorityContract(copy), /independent authority/)
})
