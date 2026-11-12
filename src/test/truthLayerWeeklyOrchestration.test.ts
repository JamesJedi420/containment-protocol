import { describe, expect, it } from 'vitest'
import {
  ACTOR_TRUTH_LAYER_FIXTURE,
  COMPETING_TRUTH_LAYERS_FIXTURE,
  projectTruthLayerOpsView,
} from '../domain/truthLayerRecordRegistry'
import {
  applyWeeklyTruthLayerTick,
  buildTruthLayerWeeklyProjectionBundle,
  projectTruthLayerRecordsForWeek,
} from '../domain/truthLayerWeeklyOrchestration'

describe('truthLayerWeeklyOrchestration (SPE-1343 slice 3)', () => {
  it('is a no-op for an empty truth-layer map without throwing', () => {
    const records = {}
    const snapshots = {}

    expect(applyWeeklyTruthLayerTick(records, 4, snapshots)).toEqual({
      records,
      snapshots,
    })
    expect(projectTruthLayerRecordsForWeek(records, 4)).toEqual([])
  })

  it('is a no-op for null or undefined maps', () => {
    expect(applyWeeklyTruthLayerTick(null, 2)).toEqual({ records: {}, snapshots: {} })
    expect(applyWeeklyTruthLayerTick(undefined, 2)).toEqual({ records: {}, snapshots: {} })
    expect(projectTruthLayerRecordsForWeek(null, 2)).toEqual([])
  })

  it('builds projection bundles matching registry ops helper', () => {
    const bundle = buildTruthLayerWeeklyProjectionBundle(COMPETING_TRUTH_LAYERS_FIXTURE, 7)

    expect(bundle.recordId).toBe(COMPETING_TRUTH_LAYERS_FIXTURE.id)
    expect(bundle.week).toBe(7)
    expect(bundle.ops).toEqual(projectTruthLayerOpsView(COMPETING_TRUTH_LAYERS_FIXTURE))
    expect(bundle.ops.mythInfrastructureActive).toBe(true)
    expect(bundle.ops.correctionPressure).toBe(0.62)
    expect(bundle.ops.mythDrivesOpsWithoutVerification).toBe(true)
    expect(bundle.ops.layerDivergence).toBe(true)
  })

  it('projects records in stable sorted id order', () => {
    const records = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const bundles = projectTruthLayerRecordsForWeek(records, 3)

    expect(bundles.map((bundle) => bundle.recordId)).toEqual([
      COMPETING_TRUTH_LAYERS_FIXTURE.id,
      ACTOR_TRUTH_LAYER_FIXTURE.id,
    ])
    expect(bundles.every((bundle) => bundle.week === 3)).toBe(true)
  })

  it('preserves source records when tick runs projections', () => {
    const records = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const next = applyWeeklyTruthLayerTick(records, 5)

    expect(next.records).toBe(records)
    expect(next.records[COMPETING_TRUTH_LAYERS_FIXTURE.id]).toBe(COMPETING_TRUTH_LAYERS_FIXTURE)
    expect(next.records[ACTOR_TRUTH_LAYER_FIXTURE.id]).toBe(ACTOR_TRUTH_LAYER_FIXTURE)
  })

  it('is idempotent when re-applied at the same week', () => {
    const records = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }

    const once = applyWeeklyTruthLayerTick(records, 4)
    const twice = applyWeeklyTruthLayerTick(once.records, 4, once.snapshots)

    expect(twice.records).toBe(once.records)
    expect(twice.snapshots).toBe(once.snapshots)
    expect(twice.records).toBe(records)
  })

  it('normalizes non-finite week values to week 1 for projection bundles', () => {
    const bundle = buildTruthLayerWeeklyProjectionBundle(
      COMPETING_TRUTH_LAYERS_FIXTURE,
      Number.NaN
    )

    expect(bundle.week).toBe(1)
  })

  it('persists weekly ops projection snapshots keyed by record id', () => {
    const records = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const tick = applyWeeklyTruthLayerTick(records, 6)

    expect(Object.keys(tick.snapshots).sort()).toEqual([
      COMPETING_TRUTH_LAYERS_FIXTURE.id,
      ACTOR_TRUTH_LAYER_FIXTURE.id,
    ])
    expect(tick.snapshots[COMPETING_TRUTH_LAYERS_FIXTURE.id]?.week).toBe(6)
    expect(tick.snapshots[COMPETING_TRUTH_LAYERS_FIXTURE.id]?.ops).toEqual(
      projectTruthLayerOpsView(COMPETING_TRUTH_LAYERS_FIXTURE)
    )
    expect(tick.snapshots[ACTOR_TRUTH_LAYER_FIXTURE.id]?.ops.mythInfrastructureActive).toBe(false)
    expect(tick.snapshots[ACTOR_TRUTH_LAYER_FIXTURE.id]?.ops.correctionPressure).toBe(0.28)
  })

  it('updates snapshots when week advances and prunes removed record ids', () => {
    const records = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const weekFour = applyWeeklyTruthLayerTick(records, 4)
    const weekFiveRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }
    const weekFive = applyWeeklyTruthLayerTick(weekFiveRecords, 5, weekFour.snapshots)

    expect(weekFive.snapshots[COMPETING_TRUTH_LAYERS_FIXTURE.id]?.week).toBe(5)
    expect(weekFive.snapshots[ACTOR_TRUTH_LAYER_FIXTURE.id]).toBeUndefined()
  })
})

describe('projectTruthLayerOpsView (SPE-1343 slice 3)', () => {
  it('surfaces myth infrastructure and correction pressure without collapsing layers', () => {
    const ops = projectTruthLayerOpsView(COMPETING_TRUTH_LAYERS_FIXTURE)

    expect(ops.mythInfrastructureActive).toBe(true)
    expect(ops.correctionPressure).toBe(0.62)
    expect(ops.layerDivergence).toBe(true)
    expect(ops.claimSourceConfidence).toBe('public_cover')
    expect(ops.verificationSourceConfidence).toBe('verified')
    expect(ops.mythDrivesOpsWithoutVerification).toBe(true)
  })

  it('does not treat inactive myth weight as ops driver', () => {
    const ops = projectTruthLayerOpsView(ACTOR_TRUTH_LAYER_FIXTURE)

    expect(ops.mythInfrastructureActive).toBe(false)
    expect(ops.mythDrivesOpsWithoutVerification).toBe(false)
    expect(ops.correctionPressure).toBe(0.28)
  })
})
