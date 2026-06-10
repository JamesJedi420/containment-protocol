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
    const snapshots = {}

    expect(applyWeeklyCoerciveProtocolTick(records, 4, snapshots)).toEqual({
      records,
      snapshots,
    })
    expect(projectCoerciveProtocolRecordsForWeek(records, 4)).toEqual([])
  })

  it('is a no-op for null or undefined maps', () => {
    expect(applyWeeklyCoerciveProtocolTick(null, 2)).toEqual({ records: {}, snapshots: {} })
    expect(applyWeeklyCoerciveProtocolTick(undefined, 2)).toEqual({ records: {}, snapshots: {} })
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

    expect(next.records).toBe(records)
    expect(next.records[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]).toBe(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE
    )
    expect(next.records[ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]).toBe(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
  })

  it('is idempotent when re-applied at the same week', () => {
    const records = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const once = applyWeeklyCoerciveProtocolTick(records, 4)
    const twice = applyWeeklyCoerciveProtocolTick(once.records, 4, once.snapshots)

    expect(twice.records).toBe(once.records)
    expect(twice.snapshots).toBe(once.snapshots)
    expect(twice.records).toBe(records)
  })

  it('normalizes non-finite week values to week 1 for projection bundles', () => {
    const bundle = buildCoerciveProtocolWeeklyProjectionBundle(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      Number.NaN
    )

    expect(bundle.week).toBe(1)
  })
})

describe('coerciveContainedPersonProtocolWeeklyOrchestration (SPE-1882 slice 5)', () => {
  it('persists weekly projection snapshots keyed by record id', () => {
    const records = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const tick = applyWeeklyCoerciveProtocolTick(records, 6)

    expect(Object.keys(tick.snapshots).sort()).toEqual([
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id,
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id,
    ])
    expect(tick.snapshots[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]?.week).toBe(6)
    expect(tick.snapshots[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]?.tradeoff).toEqual(
      projectContainmentCareTradeoff(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    )
    expect(tick.snapshots[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]?.riskReview).toEqual(
      projectCoerciveProtocolRiskReview(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    )
  })

  it('propagates redacted and unknown field metadata into persisted projections', () => {
    const redactedRecord = {
      ...EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      unknownFields: ['consentConfidence'],
      redactedFields: ['consentConfidence'],
    }
    const records = { [redactedRecord.id]: redactedRecord }

    const tick = applyWeeklyCoerciveProtocolTick(records, 2)
    const snapshot = tick.snapshots[redactedRecord.id]

    expect(snapshot?.tradeoff.redacted).toBe(true)
    expect(snapshot?.tradeoff.unknownFields).toEqual(['consentConfidence'])
    expect(snapshot?.riskReview.redacted).toBe(true)
    expect(snapshot?.riskReview.unknownFields).toEqual(['consentConfidence'])
  })

  it('updates snapshots when week advances and prunes removed record ids', () => {
    const records = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const weekFour = applyWeeklyCoerciveProtocolTick(records, 4)
    const weekFiveRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }
    const weekFive = applyWeeklyCoerciveProtocolTick(
      weekFiveRecords,
      5,
      weekFour.snapshots
    )

    expect(weekFive.snapshots[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]?.week).toBe(5)
    expect(
      weekFive.snapshots[ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]
    ).toBeUndefined()
  })
})
