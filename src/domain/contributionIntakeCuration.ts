/**
 * SPE-2474 slice 1: contribution intake curation pipeline.
 *
 * Pure deterministic submission validation and curation decisioning for
 * contribution/release operations — distinct from in-world information intake
 * (SPE-854) and pattern-source series registries (SPE-2110).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ContributionArtifactKind = 'code' | 'docs' | 'content' | 'mixed'

export const CONTRIBUTION_ARTIFACT_KINDS: readonly ContributionArtifactKind[] = [
  'code',
  'docs',
  'content',
  'mixed',
] as const

export type ContributionCurationStatus = 'accepted' | 'needs_revision' | 'rejected'

export const CONTRIBUTION_CURATION_STATUSES: readonly ContributionCurationStatus[] = [
  'accepted',
  'needs_revision',
  'rejected',
] as const

export type ContributionSubmissionValidationCode =
  | 'invalid_payload'
  | 'missing_submission_id'
  | 'missing_contributor_ref'
  | 'missing_issue_link'
  | 'invalid_issue_link'
  | 'missing_title'
  | 'missing_scope_statement'
  | 'scope_statement_too_short'
  | 'invalid_artifact_kind'
  | 'missing_test_evidence'
  | 'invalid_test_evidence_ref'

export type ContributionRemediationCode =
  | 'summary_too_short'
  | 'license_declaration_missing'
  | 'scope_statement_borderline'

export type ContributionCurationReasonCode =
  | ContributionSubmissionValidationCode
  | ContributionRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface ContributionSubmissionPayload {
  readonly submissionId?: string
  readonly contributorRef?: string
  readonly issueLink?: string
  readonly title?: string
  readonly scopeStatement?: string
  readonly artifactKind?: string
  readonly summary?: string
  readonly testEvidenceRefs?: readonly string[]
  readonly licenseDeclaration?: string
}

export interface ContributionCurationPolicy {
  readonly minimumScopeLength?: number
  readonly minimumSummaryLength?: number
  readonly borderlineScopeLength?: number
  readonly requireTestEvidenceForCode?: boolean
  readonly requireLicenseDeclaration?: boolean
}

export interface ContributionSubmissionValidationIssue {
  readonly code: ContributionSubmissionValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface ContributionRemediationNote {
  readonly code: ContributionRemediationCode
  readonly note: string
}

export interface ContributionNormalizedMetadata {
  readonly submissionId: string
  readonly contributorRef: string
  readonly issueLink: string
  readonly title: string
  readonly artifactKind: ContributionArtifactKind
  readonly scopeStatement: string
  readonly summary: string
  readonly testEvidenceRefs: readonly string[]
  readonly licenseDeclaration: string
}

export interface ContributionSubmissionValidationResult {
  readonly valid: boolean
  readonly issues: readonly ContributionSubmissionValidationIssue[]
}

export interface ContributionCurationDecision {
  readonly status: ContributionCurationStatus
  readonly validationIssues: readonly ContributionSubmissionValidationIssue[]
  readonly reasonCodes: readonly ContributionCurationReasonCode[]
  readonly remediationNotes: readonly ContributionRemediationNote[]
  readonly normalizedMetadata?: ContributionNormalizedMetadata
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const ARTIFACT_KIND_SET = new Set<string>(CONTRIBUTION_ARTIFACT_KINDS)

const DEFAULT_POLICY: Required<ContributionCurationPolicy> = {
  minimumScopeLength: 24,
  minimumSummaryLength: 48,
  borderlineScopeLength: 40,
  requireTestEvidenceForCode: true,
  requireLicenseDeclaration: false,
}

const ISSUE_LINK_PATTERN =
  /^(SPE-\d+|https:\/\/linear\.app\/[^\s/]+\/issue\/SPE-\d+[^\s]*|https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/issues\/\d+[^\s]*)$/i

const CODE_ARTIFACT_KINDS = new Set<ContributionArtifactKind>(['code', 'mixed'])

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE: ContributionSubmissionPayload = Object.freeze({
  submissionId: 'submission:domain-template-canonical',
  contributorRef: 'contributor:agent-maintainer',
  issueLink: 'SPE-2474',
  title: 'Contribution intake curation baseline',
  scopeStatement:
    'Add deterministic submission validation and curation decision envelope for SPE-75 intake baseline.',
  artifactKind: 'code',
  summary:
    'Pure domain helper that validates structured contribution payloads and emits accepted, needs_revision, or rejected decisions without persistence side effects.',
  testEvidenceRefs: Object.freeze(['src/test/contributionIntakeCuration.test.ts']),
  licenseDeclaration: 'MIT',
})

export const INVALID_CONTRIBUTION_SUBMISSION_FIXTURE: ContributionSubmissionPayload = Object.freeze({
  submissionId: '',
  contributorRef: 'contributor:anonymous',
  issueLink: 'not-a-valid-link',
  title: '',
  scopeStatement: 'too short',
  artifactKind: 'unknown_kind',
  testEvidenceRefs: Object.freeze(['']),
})

export const BORDERLINE_CONTRIBUTION_SUBMISSION_FIXTURE: ContributionSubmissionPayload = Object.freeze({
  submissionId: 'submission:borderline-scope-only',
  contributorRef: 'contributor:external-author',
  issueLink: 'https://linear.app/spectranoir/issue/SPE-75/contribution-intake',
  title: 'Docs-only clarification packet',
  scopeStatement: 'Clarify docs-only submission metadata.',
  artifactKind: 'docs',
  summary: 'Short summary.',
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isContributionArtifactKind(value: string): value is ContributionArtifactKind {
  return ARTIFACT_KIND_SET.has(value)
}

export function isContributionCurationStatus(value: string): value is ContributionCurationStatus {
  return CONTRIBUTION_CURATION_STATUSES.includes(value as ContributionCurationStatus)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => normalizeToken(entry))
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.localeCompare(right))
}

function resolvePolicy(policy?: ContributionCurationPolicy): Required<ContributionCurationPolicy> {
  return {
    minimumScopeLength: policy?.minimumScopeLength ?? DEFAULT_POLICY.minimumScopeLength,
    minimumSummaryLength: policy?.minimumSummaryLength ?? DEFAULT_POLICY.minimumSummaryLength,
    borderlineScopeLength: policy?.borderlineScopeLength ?? DEFAULT_POLICY.borderlineScopeLength,
    requireTestEvidenceForCode:
      policy?.requireTestEvidenceForCode ?? DEFAULT_POLICY.requireTestEvidenceForCode,
    requireLicenseDeclaration:
      policy?.requireLicenseDeclaration ?? DEFAULT_POLICY.requireLicenseDeclaration,
  }
}

function sortValidationIssues(
  issues: ContributionSubmissionValidationIssue[]
): ContributionSubmissionValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(notes: ContributionRemediationNote[]): ContributionRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function freezeValidationResult(
  issues: ContributionSubmissionValidationIssue[]
): ContributionSubmissionValidationResult {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeDecision(decision: ContributionCurationDecision): ContributionCurationDecision {
  return Object.freeze({
    status: decision.status,
    validationIssues: Object.freeze(decision.validationIssues),
    reasonCodes: Object.freeze([...decision.reasonCodes]),
    remediationNotes: Object.freeze(decision.remediationNotes),
    normalizedMetadata: decision.normalizedMetadata
      ? Object.freeze({
          ...decision.normalizedMetadata,
          testEvidenceRefs: Object.freeze([...decision.normalizedMetadata.testEvidenceRefs]),
        })
      : undefined,
  })
}

function buildNormalizedMetadata(
  payload: ContributionSubmissionPayload,
  artifactKind: ContributionArtifactKind
): ContributionNormalizedMetadata {
  return Object.freeze({
    submissionId: normalizeToken(payload.submissionId),
    contributorRef: normalizeToken(payload.contributorRef),
    issueLink: normalizeToken(payload.issueLink),
    title: normalizeToken(payload.title),
    artifactKind,
    scopeStatement: normalizeToken(payload.scopeStatement),
    summary: normalizeToken(payload.summary),
    testEvidenceRefs: Object.freeze(asStringArray(payload.testEvidenceRefs)),
    licenseDeclaration: normalizeToken(payload.licenseDeclaration),
  })
}

function collectRemediationNotes(
  payload: ContributionSubmissionPayload,
  policy: Required<ContributionCurationPolicy>
): ContributionRemediationNote[] {
  const notes: ContributionRemediationNote[] = []
  const scopeStatement = normalizeToken(payload.scopeStatement)
  const summary = normalizeToken(payload.summary)
  const licenseDeclaration = normalizeToken(payload.licenseDeclaration)

  if (
    scopeStatement.length >= policy.minimumScopeLength &&
    scopeStatement.length < policy.borderlineScopeLength
  ) {
    notes.push({
      code: 'scope_statement_borderline',
      note: 'Expand the scope statement with acceptance criteria and explicit out-of-scope boundaries.',
    })
  }

  if (summary.length > 0 && summary.length < policy.minimumSummaryLength) {
    notes.push({
      code: 'summary_too_short',
      note: 'Provide a fuller summary describing artifact type, validation evidence, and downstream consumers.',
    })
  }

  if (policy.requireLicenseDeclaration && licenseDeclaration.length === 0) {
    notes.push({
      code: 'license_declaration_missing',
      note: 'Declare the contribution license or rights assumption before curation can accept the submission.',
    })
  }

  return sortRemediationNotes(notes)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateContributionSubmission(
  payload: ContributionSubmissionPayload,
  policy?: ContributionCurationPolicy
): ContributionSubmissionValidationResult {
  const resolvedPolicy = resolvePolicy(policy)

  if (!payload || typeof payload !== 'object') {
    return freezeValidationResult([
      {
        code: 'invalid_payload',
        severity: 'error',
        detail: 'Contribution submission payload must be an object.',
      },
    ])
  }

  const issues: ContributionSubmissionValidationIssue[] = []
  const submissionId = normalizeToken(payload.submissionId)
  const contributorRef = normalizeToken(payload.contributorRef)
  const issueLink = normalizeToken(payload.issueLink)
  const title = normalizeToken(payload.title)
  const scopeStatement = normalizeToken(payload.scopeStatement)
  const artifactKindToken = normalizeToken(payload.artifactKind)
  const testEvidenceRefs = asStringArray(payload.testEvidenceRefs)

  if (!submissionId) {
    issues.push({
      code: 'missing_submission_id',
      severity: 'error',
      detail: 'Contribution submission is missing submissionId.',
    })
  }

  if (!contributorRef) {
    issues.push({
      code: 'missing_contributor_ref',
      severity: 'error',
      detail: 'Contribution submission is missing contributorRef.',
    })
  }

  if (!issueLink) {
    issues.push({
      code: 'missing_issue_link',
      severity: 'error',
      detail: 'Contribution submission is missing issueLink.',
    })
  } else if (!ISSUE_LINK_PATTERN.test(issueLink)) {
    issues.push({
      code: 'invalid_issue_link',
      severity: 'error',
      detail: `Contribution submission issueLink "${issueLink}" is not a recognized SPE or tracker URL.`,
    })
  }

  if (!title) {
    issues.push({
      code: 'missing_title',
      severity: 'error',
      detail: 'Contribution submission is missing title.',
    })
  }

  if (!scopeStatement) {
    issues.push({
      code: 'missing_scope_statement',
      severity: 'error',
      detail: 'Contribution submission is missing scopeStatement.',
    })
  } else if (scopeStatement.length < resolvedPolicy.minimumScopeLength) {
    issues.push({
      code: 'scope_statement_too_short',
      severity: 'error',
      detail: `Contribution submission scopeStatement must be at least ${resolvedPolicy.minimumScopeLength} characters.`,
    })
  }

  let artifactKind: ContributionArtifactKind | null = null
  if (!artifactKindToken) {
    issues.push({
      code: 'invalid_artifact_kind',
      severity: 'error',
      detail: 'Contribution submission is missing artifactKind.',
    })
  } else if (!isContributionArtifactKind(artifactKindToken)) {
    issues.push({
      code: 'invalid_artifact_kind',
      severity: 'error',
      detail: `Contribution submission has invalid artifactKind "${artifactKindToken}".`,
    })
  } else {
    artifactKind = artifactKindToken
  }

  if (
    resolvedPolicy.requireTestEvidenceForCode &&
    artifactKind &&
    CODE_ARTIFACT_KINDS.has(artifactKind) &&
    testEvidenceRefs.length === 0
  ) {
    issues.push({
      code: 'missing_test_evidence',
      severity: 'error',
      detail: `Contribution submission with artifactKind "${artifactKind}" requires testEvidenceRefs.`,
    })
  }

  if (Array.isArray(payload.testEvidenceRefs)) {
    const hasBlankRef = payload.testEvidenceRefs.some((entry) => normalizeToken(entry).length === 0)
    if (hasBlankRef) {
      issues.push({
        code: 'invalid_test_evidence_ref',
        severity: 'error',
        detail: 'Contribution submission testEvidenceRefs must not include blank entries.',
      })
    }
  }

  return freezeValidationResult(issues)
}

/**
 * SPE-75 follow-up baseline: deterministic submission-to-curation decisioning with
 * safe-fail validation and bounded remediation notes — no persistence or publish side effects.
 */
export function evaluateContributionIntakeCuration(
  payload: ContributionSubmissionPayload,
  policy?: ContributionCurationPolicy
): ContributionCurationDecision {
  const resolvedPolicy = resolvePolicy(policy)
  const validation = validateContributionSubmission(payload, resolvedPolicy)

  if (!validation.valid) {
    const reasonCodes = [
      ...new Set(validation.issues.map((issue) => issue.code)),
    ].sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'rejected',
      validationIssues: validation.issues,
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const artifactKind = normalizeToken(payload.artifactKind) as ContributionArtifactKind
  const remediationNotes = sortRemediationNotes(collectRemediationNotes(payload, resolvedPolicy))

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'needs_revision',
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
    })
  }

  return freezeDecision({
    status: 'accepted',
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
    normalizedMetadata: buildNormalizedMetadata(payload, artifactKind),
  })
}
