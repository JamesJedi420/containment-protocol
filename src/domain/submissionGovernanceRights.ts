/**
 * SPE-75 follow-up slice 1: submission governance and rights policy enforcement.
 *
 * Pure deterministic governance evaluation that accepts structured submission
 * governance payloads and emits bounded rights/policy decisions — no UI,
 * persistence writes, or publish actions.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type SubmissionRightsTier = 'canonical' | 'noncanonical' | 'fan_mod'

export const SUBMISSION_RIGHTS_TIERS: readonly SubmissionRightsTier[] = [
  'canonical',
  'noncanonical',
  'fan_mod',
] as const

export type GovernanceApplicationStatus = 'applied' | 'needs_revision' | 'rejected'

export const GOVERNANCE_APPLICATION_STATUSES: readonly GovernanceApplicationStatus[] = [
  'applied',
  'needs_revision',
  'rejected',
] as const

export type GovernanceValidationCode =
  | 'invalid_payload'
  | 'missing_submission_id'
  | 'missing_contributor_ref'
  | 'missing_rights_tier'
  | 'invalid_rights_tier'
  | 'invalid_noncanonical_side_content_flag'

export type GovernancePolicyCode =
  | 'license_declaration_missing'
  | 'fan_mod_requires_side_content_flag'
  | 'canonical_with_side_content_flag'

export type GovernanceRemediationCode =
  | 'attribution_metadata_borderline'
  | 'noncanonical_without_attribution'

export type GovernanceReasonCode =
  | GovernanceValidationCode
  | GovernancePolicyCode
  | GovernanceRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface SubmissionGovernancePayload {
  readonly submissionId?: string
  readonly contributorRef?: string
  readonly rightsTier?: string
  readonly licenseDeclaration?: string
  readonly attributionStatement?: string
  readonly noncanonicalSideContent?: boolean
  readonly issueLink?: string
}

export interface SubmissionGovernancePolicy {
  readonly requireLicenseDeclaration?: boolean
  readonly minimumAttributionLength?: number
  readonly borderlineAttributionLength?: number
}

export interface GovernanceValidationIssue {
  readonly code: GovernanceValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface GovernanceRemediationNote {
  readonly code: GovernanceRemediationCode
  readonly note: string
}

export interface SubmissionGovernanceMetadata {
  readonly submissionId: string
  readonly contributorRef: string
  readonly rightsTier: SubmissionRightsTier
  readonly licenseDeclaration: string
  readonly attributionStatement: string
  readonly noncanonicalSideContent: boolean
  readonly issueLink: string
}

export interface GovernanceApplicationDecision {
  readonly status: GovernanceApplicationStatus
  readonly validationIssues: readonly GovernanceValidationIssue[]
  readonly reasonCodes: readonly GovernanceReasonCode[]
  readonly remediationNotes: readonly GovernanceRemediationNote[]
  readonly governanceMetadata?: SubmissionGovernanceMetadata
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const RIGHTS_TIER_SET = new Set<string>(SUBMISSION_RIGHTS_TIERS)

const DEFAULT_POLICY: Required<SubmissionGovernancePolicy> = {
  requireLicenseDeclaration: true,
  minimumAttributionLength: 24,
  borderlineAttributionLength: 48,
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE: SubmissionGovernancePayload = Object.freeze({
  submissionId: 'submission:governance-canonical',
  contributorRef: 'contributor:agent-maintainer',
  rightsTier: 'canonical',
  licenseDeclaration: 'MIT',
  attributionStatement:
    'Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
  noncanonicalSideContent: false,
  issueLink: 'SPE-2478',
})

export const MISSING_LICENSE_GOVERNANCE_FIXTURE: SubmissionGovernancePayload = Object.freeze({
  submissionId: 'submission:governance-missing-license',
  contributorRef: 'contributor:external-author',
  rightsTier: 'canonical',
  licenseDeclaration: '',
  attributionStatement:
    'External author contribution awaiting license declaration before governance can apply.',
  noncanonicalSideContent: false,
  issueLink: 'SPE-75',
})

export const BORDERLINE_ATTRIBUTION_GOVERNANCE_FIXTURE: SubmissionGovernancePayload = Object.freeze({
  submissionId: 'submission:governance-borderline-attribution',
  contributorRef: 'contributor:community-contributor',
  rightsTier: 'noncanonical',
  licenseDeclaration: 'CC-BY-4.0',
  attributionStatement: 'Community tool pack by Jane.',
  noncanonicalSideContent: true,
  issueLink: 'https://linear.app/spectranoir/issue/SPE-75/contribution-intake',
})

export const FAN_MOD_GOVERNANCE_FIXTURE: SubmissionGovernancePayload = Object.freeze({
  submissionId: 'submission:governance-fan-mod',
  contributorRef: 'contributor:fan-author',
  rightsTier: 'fan_mod',
  licenseDeclaration: 'CC-BY-NC-SA-4.0',
  attributionStatement:
    'Fan-authored narrative experiment distributed outside canonical release manifests with explicit noncommercial terms.',
  noncanonicalSideContent: true,
  issueLink: 'SPE-75',
})

export const INVALID_SUBMISSION_GOVERNANCE_FIXTURE: SubmissionGovernancePayload = Object.freeze({
  submissionId: '',
  contributorRef: '',
  rightsTier: 'unofficial_tier',
  licenseDeclaration: '   ',
  noncanonicalSideContent: 'yes' as unknown as boolean,
})

export const FAN_MOD_WITHOUT_FLAG_GOVERNANCE_FIXTURE: SubmissionGovernancePayload = Object.freeze({
  submissionId: 'submission:governance-fan-mod-unflagged',
  contributorRef: 'contributor:fan-author',
  rightsTier: 'fan_mod',
  licenseDeclaration: 'CC-BY-NC-SA-4.0',
  attributionStatement:
    'Fan mod submitted without explicit noncanonical side-content flag for governance review.',
  noncanonicalSideContent: false,
  issueLink: 'SPE-75',
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isSubmissionRightsTier(value: string): value is SubmissionRightsTier {
  return RIGHTS_TIER_SET.has(value)
}

export function isGovernanceApplicationStatus(value: string): value is GovernanceApplicationStatus {
  return GOVERNANCE_APPLICATION_STATUSES.includes(value as GovernanceApplicationStatus)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolvePolicy(policy?: SubmissionGovernancePolicy): Required<SubmissionGovernancePolicy> {
  return {
    requireLicenseDeclaration:
      policy?.requireLicenseDeclaration ?? DEFAULT_POLICY.requireLicenseDeclaration,
    minimumAttributionLength:
      policy?.minimumAttributionLength ?? DEFAULT_POLICY.minimumAttributionLength,
    borderlineAttributionLength:
      policy?.borderlineAttributionLength ?? DEFAULT_POLICY.borderlineAttributionLength,
  }
}

function sortValidationIssues(issues: GovernanceValidationIssue[]): GovernanceValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(notes: GovernanceRemediationNote[]): GovernanceRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function freezeValidationResult(
  issues: GovernanceValidationIssue[]
): { readonly valid: boolean; readonly issues: readonly GovernanceValidationIssue[] } {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeDecision(decision: GovernanceApplicationDecision): GovernanceApplicationDecision {
  return Object.freeze({
    status: decision.status,
    validationIssues: Object.freeze(decision.validationIssues),
    reasonCodes: Object.freeze([...decision.reasonCodes]),
    remediationNotes: Object.freeze(decision.remediationNotes),
    governanceMetadata: decision.governanceMetadata
      ? Object.freeze({ ...decision.governanceMetadata })
      : undefined,
  })
}

function buildGovernanceMetadata(
  payload: SubmissionGovernancePayload,
  rightsTier: SubmissionRightsTier
): SubmissionGovernanceMetadata {
  return Object.freeze({
    submissionId: normalizeToken(payload.submissionId),
    contributorRef: normalizeToken(payload.contributorRef),
    rightsTier,
    licenseDeclaration: normalizeToken(payload.licenseDeclaration),
    attributionStatement: normalizeToken(payload.attributionStatement),
    noncanonicalSideContent: payload.noncanonicalSideContent === true,
    issueLink: normalizeToken(payload.issueLink),
  })
}

function collectPolicyViolations(
  payload: SubmissionGovernancePayload,
  rightsTier: SubmissionRightsTier,
  policy: Required<SubmissionGovernancePolicy>
): GovernancePolicyCode[] {
  const violations: GovernancePolicyCode[] = []
  const licenseDeclaration = normalizeToken(payload.licenseDeclaration)
  const sideContentFlag = payload.noncanonicalSideContent === true

  if (policy.requireLicenseDeclaration && licenseDeclaration.length === 0) {
    violations.push('license_declaration_missing')
  }

  if (rightsTier === 'fan_mod' && !sideContentFlag) {
    violations.push('fan_mod_requires_side_content_flag')
  }

  if (rightsTier === 'canonical' && sideContentFlag) {
    violations.push('canonical_with_side_content_flag')
  }

  return violations.sort((left, right) => left.localeCompare(right))
}

function collectRemediationNotes(
  payload: SubmissionGovernancePayload,
  rightsTier: SubmissionRightsTier,
  policy: Required<SubmissionGovernancePolicy>
): GovernanceRemediationNote[] {
  const notes: GovernanceRemediationNote[] = []
  const attributionStatement = normalizeToken(payload.attributionStatement)
  const attributionLength = attributionStatement.length

  if (
    rightsTier === 'noncanonical' &&
    attributionLength > 0 &&
    attributionLength < policy.minimumAttributionLength
  ) {
    notes.push({
      code: 'noncanonical_without_attribution',
      note: `Noncanonical submission "${normalizeToken(payload.submissionId)}" requires attribution metadata of at least ${policy.minimumAttributionLength} characters.`,
    })
  }

  if (
    attributionLength >= policy.minimumAttributionLength &&
    attributionLength < policy.borderlineAttributionLength
  ) {
    notes.push({
      code: 'attribution_metadata_borderline',
      note: 'Expand contributor attribution with provenance, credit targets, and rights assumptions before governance can fully apply.',
    })
  }

  return sortRemediationNotes(notes)
}

function collectValidationIssues(payload: SubmissionGovernancePayload): GovernanceValidationIssue[] {
  const issues: GovernanceValidationIssue[] = []
  const submissionId = normalizeToken(payload.submissionId)
  const contributorRef = normalizeToken(payload.contributorRef)
  const rightsTierToken = normalizeToken(payload.rightsTier)

  if (!submissionId) {
    issues.push({
      code: 'missing_submission_id',
      severity: 'error',
      detail: 'Submission governance payload is missing submissionId.',
    })
  }

  if (!contributorRef) {
    issues.push({
      code: 'missing_contributor_ref',
      severity: 'error',
      detail: 'Submission governance payload is missing contributorRef.',
    })
  }

  if (!rightsTierToken) {
    issues.push({
      code: 'missing_rights_tier',
      severity: 'error',
      detail: 'Submission governance payload is missing rightsTier.',
    })
  } else if (!isSubmissionRightsTier(rightsTierToken)) {
    issues.push({
      code: 'invalid_rights_tier',
      severity: 'error',
      detail: `Submission governance payload has invalid rightsTier "${rightsTierToken}".`,
    })
  }

  if (
    payload.noncanonicalSideContent !== undefined &&
    typeof payload.noncanonicalSideContent !== 'boolean'
  ) {
    issues.push({
      code: 'invalid_noncanonical_side_content_flag',
      severity: 'error',
      detail:
        'Submission governance payload noncanonicalSideContent must be a boolean when provided.',
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateSubmissionGovernancePayload(
  payload?: SubmissionGovernancePayload,
  policy?: SubmissionGovernancePolicy
): { readonly valid: boolean; readonly issues: readonly GovernanceValidationIssue[] } {
  resolvePolicy(policy)

  if (!payload || typeof payload !== 'object') {
    return freezeValidationResult([
      {
        code: 'invalid_payload',
        severity: 'error',
        detail: 'Submission governance payload must be an object.',
      },
    ])
  }

  return freezeValidationResult(collectValidationIssues(payload))
}

/**
 * SPE-75 follow-up baseline: deterministic submission governance and rights
 * policy enforcement — no persistence or publish side effects.
 */
export function evaluateSubmissionGovernanceRights(
  payload?: SubmissionGovernancePayload,
  policy?: SubmissionGovernancePolicy
): GovernanceApplicationDecision {
  const resolvedPolicy = resolvePolicy(policy)
  const validation = validateSubmissionGovernancePayload(payload, policy)

  if (!validation.valid) {
    const reasonCodes = [...new Set(validation.issues.map((issue) => issue.code))].sort(
      (left, right) => left.localeCompare(right)
    )

    return freezeDecision({
      status: 'rejected',
      validationIssues: validation.issues,
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const rightsTier = normalizeToken(payload!.rightsTier) as SubmissionRightsTier
  const policyViolations = collectPolicyViolations(payload!, rightsTier, resolvedPolicy)

  if (policyViolations.length > 0) {
    return freezeDecision({
      status: 'rejected',
      validationIssues: Object.freeze([]),
      reasonCodes: Object.freeze([...policyViolations]),
      remediationNotes: Object.freeze([]),
    })
  }

  const remediationNotes = sortRemediationNotes(
    collectRemediationNotes(payload!, rightsTier, resolvedPolicy)
  )

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'needs_revision',
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
      governanceMetadata: buildGovernanceMetadata(payload!, rightsTier),
    })
  }

  return freezeDecision({
    status: 'applied',
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
    governanceMetadata: buildGovernanceMetadata(payload!, rightsTier),
  })
}
