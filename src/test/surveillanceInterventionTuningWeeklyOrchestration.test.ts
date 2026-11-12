import { describe, expect, it } from 'vitest'

import {
  SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
  projectSurveillanceInterventionTuningReview,
  type SurveillanceInterventionTuningRecord,
} from '../domain/surveillanceCapacityInterventionTuningRegistry'
import {
  advanceSurveillanceInterventionTuningRecordForWeek,
  applyWeeklySurveillanceInterventionTuningTick,
  deriveWeeklyInterventionHorizonOutcomes,
  resolveTargetInterventionLevelFromProjection,
} from '../domain/surveillanceInterventionTuningWeeklyOrchestration'

function baseRecord(
  overrides: Partial<SurveillanceInterventionTuningRecord> = {}
): SurveillanceInterventionTuningRecord {
  return {
    id: 'surveillance-tuning:weekly-orchestration-test',
    label: 'Weekly orchestration test record',
    subjectRef: 'subject:weekly-orchestration-test',
    currentInterventionLevel: 'relaxed',
    surveillanceSignalScore: 0.3,
    meaningfulContactScore: 0.6,
    healthcareLoadScore: 0.2,
    collateralStrainScore: 0.2,
    tuningRationaleRef: 'tuning-rationale:weekly-orchestration-test',
    ...overrides,
  }
}

describe('surveillanceInterventionTuningWeeklyOrchestration (SPE-848 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklySurveillanceInterventionTuningTick({}, 4)).toEqual({})
    expect(applyWeeklySurveillanceInterventionTuningTick(undefined, 4)).toEqual({})
  })

  it('escalates relaxed records when surveillance and healthcare load rise together', () => {
    const record = baseRecord({
      id: 'surveillance-tuning:escalation-candidate',
      currentInterventionLevel: 'relaxed',
      surveillanceSignalScore: 0.72,
      meaningfulContactScore: 0.18,
      healthcareLoadScore: 0.55,
    })
    const projection = projectSurveillanceInterventionTuningReview(record)

    expect(resolveTargetInterventionLevelFromProjection(record, projection)).toBe('sustained')

    const advanced = advanceSurveillanceInterventionTuningRecordForWeek(record, 3)

    expect(advanced).not.toBe(record)
    expect(advanced.currentInterventionLevel).toBe('sustained')
    expect(advanced.horizonOutcomes?.short).toBe('elevated_isolation_pressure')
  })

  it('relaxes sustained records under collateral strain when healthcare capacity allows', () => {
    const record = baseRecord({
      id: 'surveillance-tuning:collateral-relaxation',
      currentInterventionLevel: 'sustained',
      surveillanceSignalScore: 0.88,
      meaningfulContactScore: 0.14,
      healthcareLoadScore: 0.42,
      collateralStrainScore: 0.71,
      horizonOutcomes: {
        short: 'elevated_isolation_pressure',
        medium: 'compliance_metric_stable',
        long: 'legitimacy_erosion_risk',
      },
    })

    const advanced = advanceSurveillanceInterventionTuningRecordForWeek(record, 2)

    expect(advanced).not.toBe(record)
    expect(advanced.currentInterventionLevel).toBe('alternative_support')
    expect(advanced.horizonOutcomes?.long).toBe('contact_recovery_signal')
    expect(advanced.horizonOutcomes?.medium).toBe('collateral_strain_elevated')
  })

  it('relaxes sustained records when surveillance is low and collateral strain is high', () => {
    const record = baseRecord({
      id: 'surveillance-tuning:low-signal-relaxation',
      currentInterventionLevel: 'sustained',
      surveillanceSignalScore: 0.35,
      meaningfulContactScore: 0.55,
      collateralStrainScore: 0.62,
    })

    const advanced = advanceSurveillanceInterventionTuningRecordForWeek(record, 2)

    expect(advanced.currentInterventionLevel).toBe('alternative_support')
  })

  it('advances subject-22 fixture to alternative_support with refreshed horizons', () => {
    const advanced = advanceSurveillanceInterventionTuningRecordForWeek(
      SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      2
    )

    expect(advanced.currentInterventionLevel).toBe('alternative_support')
    expect(advanced.subjectRef).toBe(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.subjectRef)
    expect(advanced.tuningRationaleRef).toBe(
      SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.tuningRationaleRef
    )
  })

  it('is idempotent when re-applied after advance', () => {
    const record = baseRecord({
      id: 'surveillance-tuning:idempotent',
      currentInterventionLevel: 'sustained',
      surveillanceSignalScore: 0.88,
      meaningfulContactScore: 0.14,
      healthcareLoadScore: 0.42,
      collateralStrainScore: 0.71,
    })

    const first = advanceSurveillanceInterventionTuningRecordForWeek(record, 2)
    const second = advanceSurveillanceInterventionTuningRecordForWeek(first, 2)

    expect(second).toBe(first)
    expect(applyWeeklySurveillanceInterventionTuningTick({ [record.id]: first }, 2)).toEqual({
      [record.id]: first,
    })
  })

  it('derives horizon outcomes from projection and intervention frame', () => {
    const record = baseRecord({ currentInterventionLevel: 'alternative_support' })
    const projection = projectSurveillanceInterventionTuningReview(record)

    expect(deriveWeeklyInterventionHorizonOutcomes(record, projection)).toEqual({
      short: 'contact_recovery_signal',
      medium: 'compliance_metric_stable',
      long: 'contact_recovery_signal',
    })
  })
})
