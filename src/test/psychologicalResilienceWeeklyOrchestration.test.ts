import { describe, expect, it } from 'vitest'

import {
  PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
  projectPsychologicalResilienceReview,
  type PsychologicalResilienceRecord,
} from '../domain/psychologicalResilienceRegistry'
import {
  advancePsychologicalResilienceRecordForWeek,
  applyWeeklyPsychologicalResilienceDepletionTick,
  resolveTargetDepletionBandFromProjection,
} from '../domain/psychologicalResilienceWeeklyOrchestration'

function baseRecord(
  overrides: Partial<PsychologicalResilienceRecord> = {}
): PsychologicalResilienceRecord {
  return {
    id: 'psych-resilience:weekly-orchestration-test',
    label: 'Weekly orchestration test record',
    operatorRef: 'agent:weekly-orchestration-test',
    depletionBand: 'stable',
    exposureScore: 0.2,
    exposureEventCount: 1,
    recoveryChannel: 'rest_recoverable',
    treatmentRequired: false,
    restRecoverable: true,
    ...overrides,
  }
}

describe('psychologicalResilienceWeeklyOrchestration (SPE-1615 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyPsychologicalResilienceDepletionTick({}, 4)).toEqual({})
    expect(applyWeeklyPsychologicalResilienceDepletionTick(undefined, 4)).toEqual({})
  })

  it('keeps stable operator fixture unchanged when exposure remains low', () => {
    const advanced = advancePsychologicalResilienceRecordForWeek(
      PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
      2
    )

    expect(advanced).toBe(PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE)
    expect(advanced.depletionBand).toBe('stable')
    expect(advanced.restRecoverable).toBe(true)
    expect(advanced.treatmentRequired).toBe(false)
  })

  it('escalates staged depletion fixture from depleted to compromised while preserving treatment flags', () => {
    const projection = projectPsychologicalResilienceReview(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE
    )

    expect(
      resolveTargetDepletionBandFromProjection(
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
        projection
      )
    ).toBe('compromised')

    const advanced = advancePsychologicalResilienceRecordForWeek(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      2
    )

    expect(advanced).not.toBe(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE)
    expect(advanced.depletionBand).toBe('compromised')
    expect(advanced.treatmentRequired).toBe(false)
    expect(advanced.restRecoverable).toBe(true)
    expect(advanced.recoveryChannel).toBe('counseling_recommended')
    expect(advanced.operatorRef).toBe(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef
    )
  })

  it('keeps treatment breakdown fixture idempotent at breakdown', () => {
    const advanced = advancePsychologicalResilienceRecordForWeek(
      PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
      2
    )

    expect(advanced).toBe(PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE)
    expect(advanced.depletionBand).toBe('breakdown')
    expect(advanced.treatmentRequired).toBe(true)
    expect(advanced.restRecoverable).toBe(false)
  })

  it('escalates stable records when exposure event count crosses the strained threshold', () => {
    const record = baseRecord({
      id: 'psych-resilience:strained-escalation',
      exposureScore: 0.35,
      exposureEventCount: 3,
    })
    const projection = projectPsychologicalResilienceReview(record)

    expect(resolveTargetDepletionBandFromProjection(record, projection)).toBe('strained')

    const advanced = advancePsychologicalResilienceRecordForWeek(record, 2)

    expect(advanced.depletionBand).toBe('strained')
    expect(advanced.treatmentRequired).toBe(false)
    expect(advanced.restRecoverable).toBe(true)
  })

  it('applies explicit breakdown treatment gate when compromised records cross breakdown thresholds', () => {
    const record = baseRecord({
      id: 'psych-resilience:breakdown-escalation',
      depletionBand: 'compromised',
      exposureScore: 0.86,
      exposureEventCount: 7,
      activeComplications: ['fixation'],
      recoveryChannel: 'counseling_recommended',
      treatmentRequired: false,
      restRecoverable: true,
    })

    const advanced = advancePsychologicalResilienceRecordForWeek(record, 2)

    expect(advanced.depletionBand).toBe('breakdown')
    expect(advanced.treatmentRequired).toBe(true)
    expect(advanced.restRecoverable).toBe(false)
    expect(advanced.recoveryChannel).toBe('treatment_required')
  })

  it('is idempotent when re-applied after advance', () => {
    const first = advancePsychologicalResilienceRecordForWeek(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      2
    )
    const second = advancePsychologicalResilienceRecordForWeek(first, 2)

    expect(second).toBe(first)
    expect(
      applyWeeklyPsychologicalResilienceDepletionTick(
        { [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]: first },
        2
      )
    ).toEqual({
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]: first,
    })
  })

  it('preserves source record when post-tick candidate fails validation', () => {
    const record = baseRecord({
      id: '',
      depletionBand: 'stable',
      exposureScore: 0.72,
      exposureEventCount: 4,
    })

    const advanced = advancePsychologicalResilienceRecordForWeek(record, 2)

    expect(advanced).toBe(record)
  })
})
