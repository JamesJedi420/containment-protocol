import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_CONTRIBUTION_SUBMISSION_FIXTURE,
  CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
  evaluateContributionIntakeCuration,
  INVALID_CONTRIBUTION_SUBMISSION_FIXTURE,
  validateContributionSubmission,
} from '../domain/contributionIntakeCuration'

describe('contributionIntakeCuration (SPE-2474 slice 1)', () => {
  it('accepts the canonical submission fixture with stable normalized metadata', () => {
    const decision = evaluateContributionIntakeCuration(CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE)

    expect(decision.status).toBe('accepted')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.normalizedMetadata).toEqual({
      submissionId: 'submission:domain-template-canonical',
      contributorRef: 'contributor:agent-maintainer',
      issueLink: 'SPE-2474',
      title: 'Contribution intake curation baseline',
      artifactKind: 'code',
      scopeStatement:
        'Add deterministic submission validation and curation decision envelope for SPE-75 intake baseline.',
      summary:
        'Pure domain helper that validates structured contribution payloads and emits accepted, needs_revision, or rejected decisions without persistence side effects.',
      testEvidenceRefs: ['src/test/contributionIntakeCuration.test.ts'],
      licenseDeclaration: 'MIT',
    })
  })

  it('rejects missing and invalid required fields with deterministic validation reason codes', () => {
    const decision = evaluateContributionIntakeCuration(INVALID_CONTRIBUTION_SUBMISSION_FIXTURE)

    expect(decision.status).toBe('rejected')
    expect(decision.normalizedMetadata).toBeUndefined()
    expect(decision.reasonCodes).toEqual([
      'invalid_artifact_kind',
      'invalid_issue_link',
      'invalid_test_evidence_ref',
      'missing_submission_id',
      'missing_title',
      'scope_statement_too_short',
    ])
    expect(decision.validationIssues.map((issue) => issue.code)).toEqual(decision.reasonCodes)
    expect(decision.remediationNotes).toEqual([])
  })

  it('returns needs_revision for the borderline fixture with bounded remediation notes', () => {
    const decision = evaluateContributionIntakeCuration(BORDERLINE_CONTRIBUTION_SUBMISSION_FIXTURE)

    expect(decision.status).toBe('needs_revision')
    expect(decision.validationIssues).toEqual([])
    expect(decision.normalizedMetadata).toBeUndefined()
    expect(decision.reasonCodes).toEqual(['scope_statement_borderline', 'summary_too_short'])
    expect(decision.remediationNotes).toHaveLength(2)
    expect(decision.remediationNotes[0]?.code).toBe('scope_statement_borderline')
    expect(decision.remediationNotes[1]?.code).toBe('summary_too_short')
  })

  it('safe-fails malformed payloads without throw', () => {
    const validation = validateContributionSubmission(null as unknown as never)
    const decision = evaluateContributionIntakeCuration(undefined as unknown as never)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_payload')
    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['invalid_payload'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const payloads = [
      CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
      INVALID_CONTRIBUTION_SUBMISSION_FIXTURE,
      BORDERLINE_CONTRIBUTION_SUBMISSION_FIXTURE,
    ] as const

    for (const payload of payloads) {
      const first = evaluateContributionIntakeCuration(payload)
      const second = evaluateContributionIntakeCuration(payload)

      expect(first).toEqual(second)
    }
  })
})
