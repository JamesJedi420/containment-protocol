/**
 * SPE-3269: validated, read-only governance policy projection.
 * No Linear writes, policy approval, or repository-surface conformance.
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const policyUrl = new URL('../../docs/governance/authority-contract.v1.json', import.meta.url)
const exact = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const unique = (items) => new Set(items).size === items.length
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const nonblank = (value) => typeof value === 'string' && value.trim() !== ''
const assert = (condition, message) => {
  if (!condition) throw new Error('governance-contract: ' + message)
}
const sortedKeys = (keys) => [...keys].sort((a, b) => a.localeCompare(b))
const assertKeys = (value, fields, label) => {
  assert(isObject(value), label + ' must be an object')
  assert(exact(sortedKeys(Object.keys(value)), sortedKeys(fields)),
    label + ' has missing or unknown fields')
}
const IDS = ['phase-1', 'phase-2', 'phase-3', 'phase-4']
const CLASSES = ['read-only', 'lifecycle-evidence', 'backlog-shape', 'bounded-maintenance', 'ambiguous']
const SOURCE_CLASSES = [
  'current-user-approved-governance',
  'linear-approved-boundary',
  'github-implementation-evidence',
  'repository-derived-projection',
  'historical-or-external-reference',
]
const STATUS = ['unknown', 'missing', 'stale', 'superseded', 'contradictory', 'incomplete']
const CANONICAL_CRITICAL_RULES = Object.freeze([
  {
    "id": "CP-GOV-001",
    "sourceClass": "current-user-approved-governance",
    "sourceRef": "project:Containment Protocol governance control plane",
    "semantic": "current-user-governance-overrides-encoded-contract"
  },
  {
    "id": "CP-GOV-002",
    "sourceClass": "linear-approved-boundary",
    "sourceRef": "linear:SPE-3261",
    "semantic": "linear-is-canonical-for-planning-lifecycle-and-ownership"
  },
  {
    "id": "CP-GOV-003",
    "sourceClass": "current-user-approved-governance",
    "sourceRef": "project:Containment Protocol governance control plane",
    "semantic": "chatgpt-backlog-shape-from-candidate-reconciliation-requires-ordered-approvals-and-phase-four"
  },
  {
    "id": "CP-GOV-004",
    "sourceClass": "current-user-approved-governance",
    "sourceRef": "project:Containment Protocol governance control plane",
    "semantic": "lifecycle-evidence-may-maintain-existing-approved-boundary-without-phases"
  },
  {
    "id": "CP-GOV-005",
    "sourceClass": "linear-approved-boundary",
    "sourceRef": "linear:SPE-3269",
    "semantic": "fail-closed-for-missing-stale-superseded-or-contradictory-approvals"
  },
  {
    "id": "CP-GOV-006",
    "sourceClass": "linear-approved-boundary",
    "sourceRef": "linear:SPE-3269",
    "semantic": "degraded-external-review-must-not-mint-approval"
  },
  {
    "id": "CP-GOV-007",
    "sourceClass": "linear-approved-boundary",
    "sourceRef": "linear:SPE-3269",
    "semantic": "bounded-maintenance-cannot-create-durable-scope"
  },
  {
    "id": "CP-GOV-008",
    "sourceClass": "current-user-approved-governance",
    "sourceRef": "project:Containment Protocol governance control plane",
    "semantic": "one-canonical-owner-for-shared-systems"
  },
  {
    "id": "CP-GOV-009",
    "sourceClass": "current-user-approved-governance",
    "sourceRef": "project:Containment Protocol governance control plane — docs/cursor-autonomous-authority.md",
    "semantic": "cursor-may-autonomously-mutate-backlog-shape-under-safeguards-without-chatgpt-phase-gates"
  }
].map((rule) => Object.freeze(rule)))
const REVIEW_STATUSES = ['approved', 'unavailable', 'approved-substitute']
const provenancePrefix = {
  'current-user-approved-governance': 'project:',
  'linear-approved-boundary': 'linear:',
  'github-implementation-evidence': 'github:',
  'repository-derived-projection': 'repository:',
  'historical-or-external-reference': 'reference:',
}
const TOP_LEVEL_KEYS = [
  'schemaVersion', 'policyVersion', 'contractId', 'status', 'provenance',
  'sourceClasses', 'authorityOrder', 'mutationClasses', 'phases',
  'candidateDispositions', 'parentDispositions', 'supportingDispositions',
  'approvalEvidence', 'maintenanceException', 'externalReview',
  'crossWorkstream', 'criticalRules',
]

export function readAuthorityContract() {
  return JSON.parse(fs.readFileSync(fileURLToPath(policyUrl), 'utf8'))
}

function assertProvenance(contract) {
  const provenance = contract.provenance
  assertKeys(provenance, [
    'ownerIssue', 'parentIssue', 'classification', 'higherAuthority',
    'sourceReferences', 'implementationEvidenceClass',
  ], 'provenance')
  assert(provenance.classification === 'linear-approved-program', 'unknown provenance classification')
  assert(provenance.higherAuthority === 'current-user-approved-governance', 'user governance must outrank contract')
  assert(provenance.ownerIssue === 'SPE-3269' && provenance.parentIssue === 'SPE-3261', 'canonical implementation owner mismatch')
  assert(Array.isArray(provenance.sourceReferences) && exact(provenance.sourceReferences, [
    'project:Containment Protocol governance control plane', 'linear:SPE-3261', 'linear:SPE-3269',
  ]), 'provenance sourceReferences invalid')
  assert(provenance.implementationEvidenceClass === 'github-implementation-evidence',
    'provenance implementationEvidenceClass invalid')
}

function assertAuthorityOrder(contract) {
  assert(exact(contract.sourceClasses, SOURCE_CLASSES), 'source classes must retain precedence and identity')
  assert(Array.isArray(contract.authorityOrder) && contract.authorityOrder.length === 5, 'authority order incomplete')
  assert(unique(contract.authorityOrder.map((item) => item.id)), 'duplicate authority id')
  assert(exact(contract.authorityOrder.map((item) => item.rank), [0, 1, 2, 3, 4]), 'authority order reordered or duplicated')
  assert(exact(contract.authorityOrder.map((item) => item.sourceClass), SOURCE_CLASSES), 'authority class precedence invalid')
  contract.authorityOrder.forEach((item) =>
    assertKeys(item, ['id', 'rank', 'sourceClass', 'purpose'], 'authority order entry'))
  assert(contract.authorityOrder.every((item) => nonblank(item.purpose)), 'authority purposes required')
}

function assertMutationClasses(contract) {
  assert(Array.isArray(contract.mutationClasses), 'missing mutation classes')
  contract.mutationClasses.forEach((item) =>
    assertKeys(item, ['id', 'mayWriteLinear', 'requiresPhases', 'predicate'], 'mutation class entry'))
  assert(exact(contract.mutationClasses.map((item) => item.id), CLASSES), 'unknown/missing mutation class')
  assert(contract.mutationClasses.every((item) =>
    typeof item.mayWriteLinear === 'boolean' && Array.isArray(item.requiresPhases) && nonblank(item.predicate)
  ), 'mutation class missing semantics')
  const [readOnly, lifecycle, shape, maintenance, ambiguous] = contract.mutationClasses
  assert(!readOnly.mayWriteLinear && !maintenance.mayWriteLinear && !ambiguous.mayWriteLinear, 'non-writing classes cannot write')
  assert(lifecycle.mayWriteLinear && lifecycle.requiresPhases.length === 0, 'lifecycle maintenance distinct from scope mutation')
  assert(shape.mayWriteLinear && exact(shape.requiresPhases, IDS), 'scope mutation must require all phases')
}

function assertPhases(contract) {
  assert(Array.isArray(contract.phases) && exact(contract.phases.map((item) => item.id), IDS), 'invalid phase order')
  contract.phases.forEach((item, index) => {
    const fields = ['id', 'ordinal', 'name', 'approvalMarker', 'prerequisites', 'mayChangeDurableScope']
    if (index === 3) fields.push('appliesTo', 'doesNotApplyTo')
    assertKeys(item, fields, 'phase entry')
    if (index === 3) {
      assert(item.appliesTo === 'candidate-extraction-and-reconciliation-backlog-shape-only' &&
        item.doesNotApplyTo === 'lifecycle-evidence-updates-on-already-approved-boundaries',
      'phase four scope classification invalid')
    }
    assert(item.ordinal === index + 1 && nonblank(item.name), 'invalid phase ordinal/name')
    assert(item.approvalMarker === 'APPROVE_PHASE_' + (index + 1), 'phase marker mismatch')
    assert(exact(item.prerequisites, IDS.slice(0, index)), 'phase prerequisites must be sequential')
    assert(item.mayChangeDurableScope === (index === 3), 'only Phase 4 may apply approved scope')
  })
}

function assertDispositions(contract) {
  for (const field of ['candidateDispositions', 'parentDispositions', 'supportingDispositions']) {
    const items = contract[field]
    assert(Array.isArray(items) && items.length > 0 && items.every(nonblank) && unique(items), field + ' missing/duplicate disposition')
  }
}

function assertApprovalEvidence(contract) {
  const ae = contract.approvalEvidence
  assertKeys(ae, [...STATUS, 'valid', 'allowOnlyWhenCurrent', 'allowScopeMutationOnlyAfter'], 'approval evidence')
  assert(ae.allowOnlyWhenCurrent === true && ae.allowScopeMutationOnlyAfter === 'phase-4', 'approval evidence semantics incomplete')
  for (const state of STATUS) assert(ae[state] === 'deny', 'noncurrent approval must deny: ' + state)
  assert(ae.valid === 'eligible-for-class-specific-checks', 'valid approval cannot imply unconditional allow')
}

function assertMaintenanceException(contract) {
  const maintenancePolicy = contract.maintenanceException
  assertKeys(maintenancePolicy, [
    'explicitAuthorizationRequired', 'scopeMustBeBounded', 'mayCreateIssue', 'mayCreateChild',
    'mayReparent', 'mayExpandApprovedScope', 'mayCreateDurableObligation', 'disallowedWithoutOwner',
  ], 'maintenance exception')
  assert(maintenancePolicy.explicitAuthorizationRequired === true && maintenancePolicy.scopeMustBeBounded === true,
    'maintenance needs explicit bounded authority')
  for (const field of ['mayCreateIssue', 'mayCreateChild', 'mayReparent', 'mayExpandApprovedScope', 'mayCreateDurableObligation']) {
    assert(maintenancePolicy[field] === false, 'maintenance cannot create durable scope: ' + field)
  }
  assert(maintenancePolicy.disallowedWithoutOwner === 'durable-implementation', 'unknown maintenance misuse rule')
}

function assertExternalReview(contract) {
  const review = contract.externalReview
  assertKeys(review, ['regimes', 'defaultRegime', 'missingConfiguration', 'automaticApprovalWhenUnavailable'], 'external review')
  assert(Array.isArray(review.regimes), 'missing external review regimes')
  review.regimes.forEach((item) =>
    assertKeys(item, ['id', 'requiresIndependentReview', 'onUnavailable'], 'review regime'))
  assert(review.defaultRegime === 'required' &&
    review.missingConfiguration === 'deny-or-hold' &&
    review.automaticApprovalWhenUnavailable === false, 'external review defaults must fail closed')
  assert(exact(review.regimes.map((item) => item.id),
    ['required', 'advisory', 'unavailable', 'approved-substitute']), 'review regime incomplete/unknown')
  assert(review.regimes.every((item) => typeof item.requiresIndependentReview === 'boolean' && nonblank(item.onUnavailable)), 'review regime semantics missing')
}

function assertCrossWorkstream(contract) {
  const cross = contract.crossWorkstream
  assertKeys(cross, ['workstreams', 'sharedImplementationOwnerCount', 'ownerClasses', 'noParallelImplementations'], 'cross-workstream')
  assert(Array.isArray(cross.workstreams) && exact(cross.workstreams, ['cp', 'academy']) &&
    cross.sharedImplementationOwnerCount === 1 && cross.noParallelImplementations === true, 'canonical workstream ownership missing')
  assert(exact(cross.ownerClasses,
    ['cp-core-owned', 'academy-owned', 'shared-system-owned', 'cross-project']), 'workstream classifications incomplete')
}

function assertCriticalRules(contract) {
  assert(Array.isArray(contract.criticalRules) &&
    contract.criticalRules.length === CANONICAL_CRITICAL_RULES.length,
  'canonical critical rule count changed')
  contract.criticalRules.forEach((rule, index) => {
    assertKeys(rule, ['id', 'sourceClass', 'sourceRef', 'semantic'], 'critical rule')
    const expected = CANONICAL_CRITICAL_RULES[index]
    assert(rule.id === expected.id && rule.semantic === expected.semantic &&
      rule.sourceClass === expected.sourceClass && rule.sourceRef === expected.sourceRef,
    'canonical critical rule mapping changed: ' + expected.id)
  })
}

/** Reject missing/unknown critical policy semantics before any consumer uses the snapshot. */
export function validateAuthorityContract(contract) {
  assert(isObject(contract), 'contract must be an object')
  assert(exact(sortedKeys(Object.keys(contract)), sortedKeys(TOP_LEVEL_KEYS)), 'unknown or missing top-level fields')
  assert(contract.schemaVersion === 1, 'unsupported schema version')
  assert(/^1\.0\.\d+$/.test(contract.policyVersion), 'unsupported policy version')
  assert(contract.contractId === 'cp.governance.authority', 'unknown contract id')
  assert(contract.status === 'policy-projection-not-authority', 'contract must not claim independent authority')
  assertProvenance(contract)
  assertAuthorityOrder(contract)
  assertMutationClasses(contract)
  assertPhases(contract)
  assertDispositions(contract)
  assertApprovalEvidence(contract)
  assertMaintenanceException(contract)
  assertExternalReview(contract)
  assertCrossWorkstream(contract)
  assertCriticalRules(contract)
  return true
}

function collectMutationReasons(input, reasons) {
  const mutationClass = input.mutationClass
  if (!CLASSES.includes(mutationClass)) reasons.push('unknown-mutation-class')
  if (mutationClass === 'backlog-shape') {
    if (!Array.isArray(input.approvedPhases) || !exact(input.approvedPhases, IDS)) {
      reasons.push('ordered-approval-evidence-required')
    }
    if (input.explicitPhase4Authorization !== true) reasons.push('phase4-authorization-required')
  }
  if (mutationClass === 'lifecycle-evidence') {
    if (input.existingApprovedBoundary !== true || input.verifiedEvidence !== true ||
        input.boundaryChanged !== false) reasons.push('lifecycle-boundary-or-evidence-invalid')
  }
  if (mutationClass === 'bounded-maintenance') {
    if (input.explicitlyAuthorized !== true || input.createsDurableScope !== false ||
        input.mutatesLinear !== false) reasons.push('maintenance-exception-misuse')
  }
  if (mutationClass === 'read-only' && input.mutatesLinear === true) reasons.push('read-only-cannot-write')
  if (mutationClass === 'ambiguous') reasons.push('ambiguous-classification')
}

function collectReviewReasons(input, contract, reasons) {
  const hasReviewRegime = input.reviewRegime !== undefined
  const hasReviewStatus = input.reviewStatus !== undefined
  // Backlog-shape changes cannot evade the required-review default by omitting both fields.
  // A verified existing-boundary lifecycle update need not carry unrelated PR-review evidence.
  if (!hasReviewRegime && !hasReviewStatus && input.mutationClass === 'backlog-shape') {
    reasons.push('missing-review-configuration')
    return
  }
  if (hasReviewRegime !== hasReviewStatus) {
    reasons.push('incomplete-review-evidence')
    return
  }
  if (!hasReviewRegime || !hasReviewStatus) return

  const regimes = contract.externalReview.regimes.map((r) => r.id)
  if (!regimes.includes(input.reviewRegime)) reasons.push('unknown-review-regime')
  if (!REVIEW_STATUSES.includes(input.reviewStatus)) {
    reasons.push('unknown-review-status')
    return
  }
  if (input.reviewRegime === 'required' && input.reviewStatus !== 'approved') {
    reasons.push('required-review-missing')
    return
  }
  if (input.reviewRegime === 'advisory' &&
      !['approved', 'unavailable'].includes(input.reviewStatus)) {
    reasons.push('contradictory-review-evidence')
    return
  }
  if (input.reviewRegime === 'unavailable') {
    if (input.reviewStatus !== 'unavailable') reasons.push('contradictory-review-evidence')
    else if (input.mutationClass === 'backlog-shape') reasons.push('unavailable-review-cannot-authorize-scope')
    return
  }
  if (input.reviewRegime === 'approved-substitute' &&
    !(input.reviewStatus === 'approved-substitute' && input.currentSubstitutionApproval === true)) {
    reasons.push('substitute-review-evidence-missing')
  }
}

function diagnoseOutcome(mutationClass, reasons) {
  if (reasons.length) return 'blocked'
  if (mutationClass === 'backlog-shape') return 'eligible-for-phase-four-revalidation'
  if (mutationClass === 'lifecycle-evidence') return 'eligible-for-lifecycle-revalidation'
  return 'read-only-or-maintenance'
}

/**
 * Read-only diagnostic for downstream mutation guard (SPE-3272). Not a write token:
 * allow-like outcomes are merely candidate evidence requiring source revalidation.
 */
export function inspectGovernanceEvidence(input, contract = readAuthorityContract()) {
  validateAuthorityContract(contract)
  const reasons = []
  if (!isObject(input)) return Object.freeze({ outcome: 'blocked', reasons: Object.freeze(['invalid-snapshot']) })
  if (input.contractVersion !== contract.policyVersion) reasons.push('version-mismatch')
  if (!['valid', ...STATUS].includes(input.approvalState)) reasons.push('unknown-approval-state')
  else if (input.approvalState !== 'valid') reasons.push('approval-' + input.approvalState)
  collectMutationReasons(input, reasons)
  collectReviewReasons(input, contract, reasons)
  return Object.freeze({
    outcome: diagnoseOutcome(input.mutationClass, reasons),
    reasons: Object.freeze(reasons),
  })
}
