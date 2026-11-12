import { describe, expect, it } from 'vitest'

import {
  projectPsychologicalResilienceReview,
  PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
  sanitizePsychologicalResilienceRecords,
  validatePsychologicalResilienceRecord,
  type PsychologicalResilienceRecord,
} from '../domain/psychologicalResilienceRegistry'

function baseRecord(
  overrides: Partial<PsychologicalResilienceRecord> = {}
): PsychologicalResilienceRecord {
  return {
    id: 'psych-resilience:test-base',
    label: 'Test base record',
    operatorRef: 'agent:test-operator-1',
    depletionBand: 'stable',
    exposureScore: 0.2,
    exposureEventCount: 1,
    recoveryChannel: 'rest_recoverable',
    treatmentRequired: false,
    restRecoverable: true,
    ...overrides,
  }
}

describe('psychologicalResilienceRegistry (SPE-1615 slice 1)', () => {
  it('validates stable operator fixture and projects low exposure signals', () => {
    const first = validatePsychologicalResilienceRecord(
      PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE
    )
    const second = validatePsychologicalResilienceRecord(
      PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE
    )

    expect(first.valid).toBe(true)
    expect(first).toEqual(second)

    const projection = projectPsychologicalResilienceReview(
      PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE
    )

    expect(projection.exposureElevated).toBe(false)
    expect(projection.depletionAdvanced).toBe(false)
    expect(projection.complicationActive).toBe(false)
    expect(projection.restRecoveryEligible).toBe(true)
    expect(projection.treatmentGated).toBe(false)
  })

  it('projects staged depletion with minor complications before breakdown', () => {
    const validation = validatePsychologicalResilienceRecord(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE
    )
    const projection = projectPsychologicalResilienceReview(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE
    )

    expect(validation.valid).toBe(true)
    expect(projection.exposureElevated).toBe(true)
    expect(projection.depletionAdvanced).toBe(true)
    expect(projection.complicationActive).toBe(true)
    expect(projection.minorComplicationBeforeBreakdown).toBe(true)
    expect(projection.restRecoveryEligible).toBe(true)
    expect(projection.treatmentGated).toBe(false)
    expect(projection.dutyReliabilityDegraded).toBe(true)
  })

  it('projects treatment-gated severe breakdown without rest recovery', () => {
    const validation = validatePsychologicalResilienceRecord(
      PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE
    )
    const projection = projectPsychologicalResilienceReview(
      PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE
    )

    expect(validation.valid).toBe(true)
    expect(projection.depletionBand).toBe('breakdown')
    expect(projection.treatmentGated).toBe(true)
    expect(projection.restRecoveryEligible).toBe(false)
    expect(projection.minorComplicationBeforeBreakdown).toBe(false)
    expect(projection.dutyReliabilityDegraded).toBe(true)
  })

  it('warns when breakdown is marked rest recoverable', () => {
    const result = validatePsychologicalResilienceRecord(
      baseRecord({
        depletionBand: 'breakdown',
        recoveryChannel: 'treatment_required',
        treatmentRequired: true,
        restRecoverable: true,
        exposureScore: 0.95,
        exposureEventCount: 9,
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'breakdown_marked_rest_recoverable')
    ).toBe(true)
  })

  it('rejects franchise tokens in label', () => {
    const result = validatePsychologicalResilienceRecord(
      baseRecord({
        label: 'Foundation operator resilience profile',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('round-trips fixtures through sanitizePsychologicalResilienceRecords', () => {
    const input = {
      [PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
      'psych-resilience:invalid-duplicate': PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
      'psych-resilience:invalid-entry': { id: '', label: '' },
    }

    const sanitized = sanitizePsychologicalResilienceRecords(input)

    expect(Object.keys(sanitized).sort()).toEqual(
      [
        PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id,
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id,
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id,
      ].sort()
    )
    expect(sanitized[PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]).toEqual(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE
    )
  })
})
