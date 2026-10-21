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
const provenancePrefix = {
  'current-user-approved-governance': 'project:',
  'linear-approved-boundary': 'linear:',
  'github-implementation-evidence': 'github:',
  'repository-derived-projection': 'repository:',
  'historical-or-external-reference': 'reference:',
}

export function readAuthorityContract() {
  return JSON.parse(fs.readFileSync(fileURLToPath(policyUrl), 'utf8'))
}

/** Reject missing/unknown critical policy semantics before any consumer uses the snapshot. */
export function validateAuthorityContract(contract) {
  assert(isObject(contract), 'contract must be an object')
  const keys = [
    'schemaVersion', 'policyVersion', 'contractId', 'status', 'provenance',
    'sourceClasses', 'authorityOrder', 'mutationClasses', 'phases',
    'candidateDispositions', 'parentDispositions', 'supportingDispositions',
    'approvalEvidence', 'maintenanceException', 'externalReview',
    'crossWorkstream', 'criticalRules',
  ]
  assert(exact(Object.keys(contract).sort(), [...keys].sort()), 'unknown or missing top-level fields')
  assert(contract.schemaVersion === 1, 'unsupported schema version')
  assert(/^1\.0\.\d+$/.test(contract.policyVersion), 'unsupported policy version')
  assert(contract.contractId === 'cp.governance.authority', 'unknown contract id')
  assert(contract.status === 'policy-projection-not-authority', 'contract must not claim independent authority')
  assert(isObject(contract.provenance), 'missing provenance')
  assert(contract.provenance.classification === 'linear-approved-program', 'unknown provenance classification')
  assert(contract.provenance.higherAuthority === 'current-user-approved-governance', 'user governance must outrank contract')
  assert(contract.provenance.ownerIssue === 'SPE-3269' && contract.provenance.parentIssue === 'SPE-3261', 'canonical implementation owner mismatch')
  assert(exact(contract.sourceClasses, SOURCE_CLASSES), 'source classes must retain precedence and identity')
  assert(Array.isArray(contract.authorityOrder) && contract.authorityOrder.length === 5, 'authority order incomplete')
  assert(unique(contract.authorityOrder.map((item) => item.id)), 'duplicate authority id')
  assert(exact(contract.authorityOrder.map((item) => item.rank), [0, 1, 2, 3, 4]), 'authority order reordered or duplicated')
  assert(exact(contract.authorityOrder.map((item) => item.sourceClass), SOURCE_CLASSES), 'authority class precedence invalid')
  assert(contract.authorityOrder.every((item) => nonblank(item.purpose)), 'authority purposes required')
  assert(Array.isArray(contract.mutationClasses), 'missing mutation classes')
  assert(exact(contract.mutationClasses.map((item) => item.id), CLASSES), 'unknown/missing mutation class')
  assert(contract.mutationClasses.every((item) =>
    typeof item.mayWriteLinear === 'boolean' && Array.isArray(item.requiresPhases) && nonblank(item.predicate)
  ), 'mutation class missing semantics')
  const [readOnly, lifecycle, shape, maintenance, ambiguous] = contract.mutationClasses
  assert(!readOnly.mayWriteLinear && !maintenance.mayWriteLinear && !ambiguous.mayWriteLinear, 'non-writing classes cannot write')
  assert(lifecycle.mayWriteLinear && lifecycle.requiresPhases.length === 0, 'lifecycle maintenance distinct from scope mutation')
  assert(shape.mayWriteLinear && exact(shape.requiresPhases, IDS), 'scope mutation must require all phases')
  assert(Array.isArray(contract.phases) && exact(contract.phases.map((item) => item.id), IDS), 'invalid phase order')
  contract.phases.forEach((item, index) => {
    assert(item.ordinal === index + 1 && nonblank(item.name), 'invalid phase ordinal/name')
    assert(item.approvalMarker === 'APPROVE_PHASE_' + (index + 1), 'phase marker mismatch')
    assert(exact(item.prerequisites, IDS.slice(0, index)), 'phase prerequisites must be sequential')
    assert(item.mayChangeDurableScope === (index === 3), 'only Phase 4 may apply approved scope')
  })
  for (const field of ['candidateDispositions','parentDispositions','supportingDispositions']) {
    const items = contract[field]
    assert(Array.isArray(items) && items.length > 0 && items.every(nonblank) && unique(items), field + ' missing/duplicate disposition')
  }
  const ae = contract.approvalEvidence
  assert(isObject(ae) && ae.allowOnlyWhenCurrent === true && ae.allowScopeMutationOnlyAfter === 'phase-4', 'approval evidence semantics incomplete')
  for (const state of STATUS) assert(ae[state] === 'deny', 'noncurrent approval must deny: ' + state)
  assert(ae.valid === 'eligible-for-class-specific-checks', 'valid approval cannot imply unconditional allow')
  const maintenancePolicy = contract.maintenanceException
  assert(isObject(maintenancePolicy) && maintenancePolicy.explicitAuthorizationRequired === true && maintenancePolicy.scopeMustBeBounded === true, 'maintenance needs explicit bounded authority')
  for (const field of ['mayCreateIssue','mayCreateChild','mayReparent','mayExpandApprovedScope','mayCreateDurableObligation']) {
    assert(maintenancePolicy[field] === false, 'maintenance cannot create durable scope: ' + field)
  }
  assert(maintenancePolicy.disallowedWithoutOwner === 'durable-implementation', 'unknown maintenance misuse rule')
  const review = contract.externalReview
  assert(isObject(review) && review.defaultRegime === 'required' &&
    review.missingConfiguration === 'deny-or-hold' &&
    review.automaticApprovalWhenUnavailable === false, 'external review defaults must fail closed')
  assert(exact(review.regimes.map((item) => item.id),
    ['required','advisory','unavailable','approved-substitute']), 'review regime incomplete/unknown')
  assert(review.regimes.every((item) => typeof item.requiresIndependentReview === 'boolean' && nonblank(item.onUnavailable)), 'review regime semantics missing')
  const cross = contract.crossWorkstream
  assert(isObject(cross) && exact(cross.workstreams, ['cp', 'academy']) &&
    cross.sharedImplementationOwnerCount === 1 && cross.noParallelImplementations === true, 'canonical workstream ownership missing')
  assert(exact(cross.ownerClasses,
    ['cp-core-owned','academy-owned','shared-system-owned','cross-project']), 'workstream classifications incomplete')
  assert(Array.isArray(contract.criticalRules) && contract.criticalRules.length >= 8, 'critical rules incomplete')
  assert(unique(contract.criticalRules.map((r) => r.id)), 'duplicate critical rule id')
  for (const rule of contract.criticalRules) {
    assert(/^CP-GOV-\d{3}$/.test(rule.id) && nonblank(rule.semantic) &&
      SOURCE_CLASSES.includes(rule.sourceClass) && nonblank(rule.sourceRef), 'critical rule malformed or unclassified')
    assert(rule.sourceRef.startsWith(provenancePrefix[rule.sourceClass]),
      'rule source does not support claimed authority: ' + rule.id)
  }
  assert(contract.criticalRules.some((r) => r.semantic === 'current-user-governance-overrides-encoded-contract'),
    'missing critical user authority invariant')
  return true
}

/**
 * Read-only diagnostic for downstream mutation guard (SPE-3272). Not a write token:
 * allow-like outcomes are merely candidate evidence requiring source revalidation.
 */
export function inspectGovernanceEvidence(input, contract = readAuthorityContract()) {
  validateAuthorityContract(contract)
  const reasons = []
  if (!isObject(input)) return Object.freeze({ outcome: 'blocked', reasons: Object.freeze(['invalid-snapshot']) })
  const mutationClass = input.mutationClass
  if (!CLASSES.includes(mutationClass)) reasons.push('unknown-mutation-class')
  if (input.contractVersion !== contract.policyVersion) reasons.push('version-mismatch')
  if (!['valid', ...STATUS].includes(input.approvalState)) reasons.push('unknown-approval-state')
  else if (input.approvalState !== 'valid') reasons.push('approval-' + input.approvalState)

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
        input.mutatesLinear === true) reasons.push('maintenance-exception-misuse')
  }
  if (mutationClass === 'read-only' && input.mutatesLinear === true) reasons.push('read-only-cannot-write')
  if (mutationClass === 'ambiguous') reasons.push('ambiguous-classification')
  const hasReviewRegime = input.reviewRegime !== undefined
  const hasReviewStatus = input.reviewStatus !== undefined
  // Backlog-shape changes cannot evade the required-review default by omitting both fields.
  // A verified existing-boundary lifecycle update need not carry unrelated PR-review evidence.
  if (!hasReviewRegime && !hasReviewStatus && mutationClass === 'backlog-shape') {
    reasons.push('missing-review-configuration')
  } else if (hasReviewRegime !== hasReviewStatus) {
    reasons.push('incomplete-review-evidence')
  }
  if (hasReviewRegime && hasReviewStatus) {
    const regimes = contract.externalReview.regimes.map((r) => r.id)
    if (!regimes.includes(input.reviewRegime)) reasons.push('unknown-review-regime')
    if (!['approved', 'unavailable', 'approved-substitute'].includes(input.reviewStatus)) {
      reasons.push('unknown-review-status')
    } else if (input.reviewRegime === 'required' && input.reviewStatus !== 'approved') {
      reasons.push('required-review-missing')
    } else if (input.reviewRegime === 'approved-substitute' &&
      !(input.reviewStatus === 'approved-substitute' && input.currentSubstitutionApproval === true)) {
      reasons.push('substitute-review-evidence-missing')
    }
  }
  const outcome = reasons.length
    ? 'blocked'
    : mutationClass === 'backlog-shape'
      ? 'eligible-for-phase-four-revalidation'
      : mutationClass === 'lifecycle-evidence'
        ? 'eligible-for-lifecycle-revalidation'
        : 'read-only-or-maintenance'
  return Object.freeze({ outcome, reasons: Object.freeze(reasons) })
}
