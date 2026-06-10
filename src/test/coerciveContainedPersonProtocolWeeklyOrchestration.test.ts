import { describe, expect, it } from 'vitest'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import {
  applyWeeklyCoerciveProtocolTick,
  buildCoerciveProtocolWeeklyProjectionBundle,
  projectCoerciveProtocolRecordsForWeek,
} from '../domain/coerciveContainedPersonProtocolWeeklyOrchestration'

describe('coerciveContainedPersonProtocolWeeklyOrchestration (SPE-1882 slice 3)', () => {
  it('is a no-op for an empty protocol map without throwing', () => {
    const records = {}

    expect(applyWeeklyCoerciveProtocolTick(records, 4)).toBe(records)
    expect(projectCoerciveProtocolRecordsForWeek(records, 4)).toEqual([])
  })

  it('is a no-op for null or undefined maps', () => {
    expect(applyWeeklyCoerciveProtocolTick(null, 2)).toEqual({})
    expect(applyWeeklyCoerciveProtocolTick(undefined, 2)).toEqual({})
    expect(projectCoerciveProtocolRecordsForWeek(null, 2)).toEqual([])
  })

  it('builds projection bundles matching registry helpers', () => {
    const bundle = buildCoerciveProtocolWeeklyProjectionBundle(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      7
    )

    expect(bundle.recordId).toBe(EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id)
    expect(bundle.week).toBe(7)
    expect(bundle.tradeoff).toEqual(
      projectContainmentCareTradeoff(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    )
    expect(bundle.riskReview).toEqual(
      projectCoerciveProtocolRiskReview(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    )
  })

  it('projects records in stable sorted id order', () => {
    const records = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const bundles = projectCoerciveProtocolRecordsForWeek(records, 3)

    expect(bundles.map((bundle) => bundle.recordId)).toEqual([
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id,
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id,
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id,
    ])
    expect(bundles.every((bundle) => bundle.week === 3)).toBe(true)
  })

  it('preserves source records when tick runs projections', () => {
    const records = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const next = applyWeeklyCoerciveProtocolTick(records, 5)

    expect(next).toBe(records)
    expect(next[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]).toBe(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    expect(next[ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]).toBe(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
  })

  it('is idempotent when re-applied at the same week', () => {
    const records = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const once = applyWeeklyCoerciveProtocolTick(records, 4)
    const twice = applyWeeklyCoerciveProtocolTick(once, 4)

    expect(twice).toBe(once)
    expect(twice).toBe(records)
  })

  it('normalizes non-finite week values to week 1 for projection bundles', () => {
    const bundle = buildCoerciveProtocolWeeklyProjectionBundle(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      Number.NaN
    )

    expect(bundle.week).toBe(1)
  })
})
