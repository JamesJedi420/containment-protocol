import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_ATTRIBUTION_GOVERNANCE_FIXTURE,
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
  FAN_MOD_GOVERNANCE_FIXTURE,
  FAN_MOD_WITHOUT_FLAG_GOVERNANCE_FIXTURE,
  INVALID_SUBMISSION_GOVERNANCE_FIXTURE,
  MISSING_LICENSE_GOVERNANCE_FIXTURE,
  validateSubmissionGovernancePayload,
} from '../domain/submissionGovernanceRights'

describe('submissionGovernanceRights (SPE-2478 slice 1)', () => {
  it('applies the canonical governance fixture with stable policy metadata', () => {
    const decision = evaluateSubmissionGovernanceRights(CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE)

    expect(decision.status).toBe('applied')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.governanceMetadata).toEqual({
      submissionId: 'submission:governance-canonical',
      contributorRef: 'contributor:agent-maintainer',
      rightsTier: 'canonical',
      licenseDeclaration: 'MIT',
      attributionStatement:
        'Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
      noncanonicalSideContent: false,
      issueLink: 'SPE-2478',
    })
  })

  it('applies fan-mod fixtures when side-content flag and license are present', () => {
    const decision = evaluateSubmissionGovernanceRights(FAN_MOD_GOVERNANCE_FIXTURE)

    expect(decision.status).toBe('applied')
    expect(decision.governanceMetadata?.rightsTier).toBe('fan_mod')
    expect(decision.governanceMetadata?.noncanonicalSideContent).toBe(true)
  })

  it('rejects missing license declarations with deterministic policy reason codes', () => {
    const decision = evaluateSubmissionGovernanceRights(MISSING_LICENSE_GOVERNANCE_FIXTURE)

    expect(decision.status).toBe('rejected')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual(['license_declaration_missing'])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.governanceMetadata).toBeUndefined()
  })

  it('rejects fan-mod submissions without noncanonical side-content flag', () => {
    const decision = evaluateSubmissionGovernanceRights(FAN_MOD_WITHOUT_FLAG_GOVERNANCE_FIXTURE)

    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['fan_mod_requires_side_content_flag'])
    expect(decision.governanceMetadata).toBeUndefined()
  })

  it('returns needs_revision for borderline attribution metadata', () => {
    const decision = evaluateSubmissionGovernanceRights(BORDERLINE_ATTRIBUTION_GOVERNANCE_FIXTURE)

    expect(decision.status).toBe('needs_revision')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual(['attribution_metadata_borderline'])
    expect(decision.remediationNotes).toHaveLength(1)
    expect(decision.remediationNotes[0]?.code).toBe('attribution_metadata_borderline')
    expect(decision.governanceMetadata?.rightsTier).toBe('noncanonical')
  })

  it('rejects invalid rights tiers and malformed payloads with deterministic reason codes', () => {
    const invalidDecision = evaluateSubmissionGovernanceRights(INVALID_SUBMISSION_GOVERNANCE_FIXTURE)

    expect(invalidDecision.status).toBe('rejected')
    expect(invalidDecision.reasonCodes).toEqual([
      'invalid_noncanonical_side_content_flag',
      'invalid_rights_tier',
      'missing_contributor_ref',
      'missing_submission_id',
    ])
    expect(invalidDecision.validationIssues.map((issue) => issue.code)).toEqual(
      invalidDecision.reasonCodes
    )
  })

  it('safe-fails malformed payloads without throw', () => {
    const validation = validateSubmissionGovernancePayload(null as unknown as never)
    const decision = evaluateSubmissionGovernanceRights(undefined as unknown as never)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_payload')
    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['invalid_payload'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const payloads = [
      CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
      MISSING_LICENSE_GOVERNANCE_FIXTURE,
      BORDERLINE_ATTRIBUTION_GOVERNANCE_FIXTURE,
      INVALID_SUBMISSION_GOVERNANCE_FIXTURE,
      FAN_MOD_GOVERNANCE_FIXTURE,
      FAN_MOD_WITHOUT_FLAG_GOVERNANCE_FIXTURE,
    ] as const

    for (const payload of payloads) {
      const first = evaluateSubmissionGovernanceRights(payload)
      const second = evaluateSubmissionGovernanceRights(payload)

      expect(first).toEqual(second)
    }
  })
})
