import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  ACTOR_TRUTH_LAYER_FIXTURE,
  COMPETING_TRUTH_LAYERS_FIXTURE,
  projectTruthLayerOpsView,
} from '../../domain/truthLayerRecordRegistry'
import { applyWeeklyTruthLayerTick } from '../../domain/truthLayerWeeklyOrchestration'
import {
  formatTruthLayerEnumLabel,
  getTruthLayerMirrorView,
} from './truthLayerMirrorView'

describe('truthLayerMirrorView (SPE-1343 slice 4)', () => {
  it('returns empty mirror when truthLayerRecords map is empty', () => {
    const game = createStartingState()

    expect(game.truthLayerRecords).toEqual({})

    const view = getTruthLayerMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.weeklySnapshotCount).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors separate claim, doctrine, and verification slots without collapsing layers', () => {
    const game = createStartingState()
    game.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }

    const view = getTruthLayerMirrorView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.layerDivergenceCount).toBe(1)
    expect(view.summary.mythInfrastructureActiveCount).toBe(1)
    expect(record?.claim.narrativeLabel).toMatch(/solvent leak/)
    expect(record?.doctrine.narrativeLabel).toMatch(/sub-basement wing/)
    expect(record?.verification.narrativeLabel).toMatch(/secondary seal/)
    expect(record?.claim.narrativeLabel).not.toBe(record?.verification.narrativeLabel)
    expect(record?.mythInfrastructureActiveLabel).toBe('Yes')
    expect(record?.correctionPressureLabel).toBe('0.62')
    expect(record?.claim.sourceConfidenceLabel).toBe('Public Cover')
    expect(record?.verification.sourceConfidenceLabel).toBe('Verified')
    expect(record?.competingLayerCount).toBe(2)
  })

  it('displays persisted weekly ops snapshot round-trip', () => {
    const game = createStartingState()
    game.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }
    const tick = applyWeeklyTruthLayerTick(game.truthLayerRecords, 12)
    game.truthLayerWeeklyProjectionSnapshots = tick.snapshots

    const view = getTruthLayerMirrorView(game)
    const record = view.records[0]
    const expectedOps = projectTruthLayerOpsView(COMPETING_TRUTH_LAYERS_FIXTURE)

    expect(view.summary.weeklySnapshotCount).toBe(1)
    expect(record?.weeklySnapshot?.week).toBe(12)
    expect(record?.weeklySnapshot?.mythInfrastructureActiveLabel).toBe('Yes')
    expect(record?.weeklySnapshot?.correctionPressureLabel).toBe('0.62')
    expect(record?.weeklySnapshot?.layerDivergenceLabel).toBe('Yes')
    expect(record?.weeklySnapshot?.mythDrivesOpsWithoutVerificationLabel).toBe(
      expectedOps.mythDrivesOpsWithoutVerification ? 'Yes' : 'No'
    )
  })

  it('mirrors actor fixture with lower correction pressure', () => {
    const game = createStartingState()
    game.truthLayerRecords = {
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const view = getTruthLayerMirrorView(game)
    const record = view.records[0]

    expect(record?.subjectKindLabel).toBe('Actor')
    expect(record?.mythInfrastructureActiveLabel).toBe('No')
    expect(record?.correctionPressureLabel).toBe('0.28')
    expect(record?.weeklySnapshot).toBeNull()
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatTruthLayerEnumLabel('public_cover')).toBe('Public Cover')
    expect(formatTruthLayerEnumLabel('hostile_dossier')).toBe('Hostile Dossier')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }
    const tick = applyWeeklyTruthLayerTick(game.truthLayerRecords, 8)
    game.truthLayerWeeklyProjectionSnapshots = tick.snapshots

    const first = JSON.stringify(getTruthLayerMirrorView(game))
    const second = JSON.stringify(getTruthLayerMirrorView(game))

    expect(first).toBe(second)
  })
})
