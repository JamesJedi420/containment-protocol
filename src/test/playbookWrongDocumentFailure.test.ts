import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_PLAYBOOK_VARIANT_FIXTURE,
  BORDERLINE_PROCEDURAL_PLAYBOOK_VARIANT_FIXTURE,
  CANONICAL_PLAYBOOK_VARIANT_FIXTURE,
  evaluatePlaybookWrongDocumentFailure,
  INVALID_PLAYBOOK_VARIANT_FIXTURE,
  validatePlaybookVariantPayload,
  WRONG_DOCUMENT_PLAYBOOK_VARIANT_FIXTURE,
} from '../domain/playbookWrongDocumentFailure'

describe('playbookWrongDocumentFailure (SPE-2477 slice 1)', () => {
  it('applies the canonical playbook fixture with stable match metadata', () => {
    const decision = evaluatePlaybookWrongDocumentFailure(CANONICAL_PLAYBOOK_VARIANT_FIXTURE)

    expect(decision.status).toBe('applied')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.matchMetadata).toEqual({
      playbookDocumentId: 'playbook:fire-suppression-canonical',
      playbookVariantType: 'fire',
      activeDisasterType: 'fire',
      proceduralAssumptionCount: 3,
      underPressure: true,
      operatorRef: 'operator:facility-response-lead',
    })
  })

  it('rejects wrong-document matches with deterministic failure reason codes', () => {
    const decision = evaluatePlaybookWrongDocumentFailure(WRONG_DOCUMENT_PLAYBOOK_VARIANT_FIXTURE)

    expect(decision.status).toBe('rejected')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual(['wrong_document_variant'])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.matchMetadata).toBeUndefined()
  })

  it('returns needs_revision for borderline partial variant overlap', () => {
    const decision = evaluatePlaybookWrongDocumentFailure(BORDERLINE_PLAYBOOK_VARIANT_FIXTURE)

    expect(decision.status).toBe('needs_revision')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual(['variant_partial_overlap'])
    expect(decision.remediationNotes).toHaveLength(1)
    expect(decision.remediationNotes[0]?.code).toBe('variant_partial_overlap')
    expect(decision.matchMetadata?.playbookVariantType).toBe('fire')
    expect(decision.matchMetadata?.activeDisasterType).toBe('chemical_spill')
  })

  it('returns needs_revision when procedural assumptions are borderline under pressure', () => {
    const decision = evaluatePlaybookWrongDocumentFailure(
      BORDERLINE_PROCEDURAL_PLAYBOOK_VARIANT_FIXTURE
    )

    expect(decision.status).toBe('needs_revision')
    expect(decision.reasonCodes).toEqual(['procedural_assumption_borderline'])
    expect(decision.remediationNotes).toHaveLength(1)
    expect(decision.remediationNotes[0]?.code).toBe('procedural_assumption_borderline')
    expect(decision.matchMetadata?.proceduralAssumptionCount).toBe(1)
  })

  it('rejects invalid variant types and malformed payloads with deterministic reason codes', () => {
    const invalidDecision = evaluatePlaybookWrongDocumentFailure(INVALID_PLAYBOOK_VARIANT_FIXTURE)

    expect(invalidDecision.status).toBe('rejected')
    expect(invalidDecision.reasonCodes).toEqual([
      'invalid_playbook_variant_type',
      'invalid_under_pressure_flag',
      'missing_active_disaster_type',
      'missing_playbook_document_id',
      'procedural_assumption_too_short',
    ])
    expect(invalidDecision.validationIssues.map((issue) => issue.code)).toEqual(
      invalidDecision.reasonCodes
    )
  })

  it('safe-fails malformed payloads without throw', () => {
    const validation = validatePlaybookVariantPayload(null as unknown as never)
    const decision = evaluatePlaybookWrongDocumentFailure(undefined as unknown as never)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_payload')
    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['invalid_payload'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const payloads = [
      CANONICAL_PLAYBOOK_VARIANT_FIXTURE,
      WRONG_DOCUMENT_PLAYBOOK_VARIANT_FIXTURE,
      BORDERLINE_PLAYBOOK_VARIANT_FIXTURE,
      INVALID_PLAYBOOK_VARIANT_FIXTURE,
      BORDERLINE_PROCEDURAL_PLAYBOOK_VARIANT_FIXTURE,
    ] as const

    for (const payload of payloads) {
      const first = evaluatePlaybookWrongDocumentFailure(payload)
      const second = evaluatePlaybookWrongDocumentFailure(payload)

      expect(first).toEqual(second)
    }
  })
})
