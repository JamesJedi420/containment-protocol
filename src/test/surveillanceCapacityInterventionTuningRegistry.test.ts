import { describe, expect, it } from 'vitest'

import {
  projectSurveillanceInterventionTuningReview,
  SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
  validateSurveillanceInterventionTuningRecord,
} from '../domain/surveillanceCapacityInterventionTuningRegistry'

describe('surveillanceCapacityInterventionTuningRegistry (SPE-848 slice 1)', () => {
  it('validates subject-22 fixture and projects monitoring/contact separation', () => {
    const first = validateSurveillanceInterventionTuningRecord(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)
    const second = validateSurveillanceInterventionTuningRecord(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)

    expect(first.valid).toBe(true)
    expect(first).toEqual(second)

    const projection = projectSurveillanceInterventionTuningReview(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)

    expect(projection.monitoringExceedsContact).toBe(true)
    expect(projection.sustainedUnderCollateralStrain).toBe(true)
    expect(projection.surveillanceSignalScore).toBe(0.88)
    expect(projection.meaningfulContactScore).toBe(0.14)
    expect(projection.collateralStrainScore).toBe(0.71)
  })

  it('warns when relaxed under high surveillance without rationale ref', () => {
    const record = {
      ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      id: 'surveillance-tuning:relaxed-without-rationale',
      currentInterventionLevel: 'relaxed' as const,
      tuningRationaleRef: undefined,
    }

    const result = validateSurveillanceInterventionTuningRecord(record)

    expect(result.valid).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'relaxed_under_high_surveillance_without_rationale')).toBe(
      true
    )
  })

  it('rejects franchise tokens in label', () => {
    const record = {
      ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      id: 'surveillance-tuning:invalid-franchise',
      label: 'SCP division surveillance tuning',
    }

    const result = validateSurveillanceInterventionTuningRecord(record)

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })
})
