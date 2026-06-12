import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  ACTOR_TRUTH_LAYER_FIXTURE,
  COMPETING_TRUTH_LAYERS_FIXTURE,
  projectTruthLayerOpsView,
} from '../domain/truthLayerRecordRegistry'
import { applyWeeklyTruthLayerTick } from '../domain/truthLayerWeeklyOrchestration'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek truth-layer records integration (SPE-1343 slice 3)', () => {
  it('is a no-op for an empty truth-layer map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.truthLayerRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.truthLayerRecords).toEqual({})
    expect(nextState.truthLayerWeeklyProjectionSnapshots).toEqual({})
  })

  it('preserves fixture record references byte-stable after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.week).toBe(5)
    expect(nextState.truthLayerRecords?.[COMPETING_TRUTH_LAYERS_FIXTURE.id]).toBe(
      COMPETING_TRUTH_LAYERS_FIXTURE
    )
    expect(nextState.truthLayerRecords?.[ACTOR_TRUTH_LAYER_FIXTURE.id]).toBe(
      ACTOR_TRUTH_LAYER_FIXTURE
    )
  })

  it('persists weekly ops projection snapshots through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const snapshot =
      nextState.truthLayerWeeklyProjectionSnapshots?.[COMPETING_TRUTH_LAYERS_FIXTURE.id]

    expect(snapshot?.week).toBe(5)
    expect(snapshot?.ops).toEqual(projectTruthLayerOpsView(COMPETING_TRUTH_LAYERS_FIXTURE))
    expect(snapshot?.ops.mythInfrastructureActive).toBe(true)
    expect(snapshot?.ops.correctionPressure).toBe(0.62)
    expect(snapshot?.ops.mythDrivesOpsWithoutVerification).toBe(true)
  })

  it('is idempotent when truth-layer tick is re-applied at the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }

    const once = advanceWeek(state)
    const recordsAfterAdvance = once.truthLayerRecords ?? {}
    const reticked = applyWeeklyTruthLayerTick(
      recordsAfterAdvance,
      once.week,
      once.truthLayerWeeklyProjectionSnapshots
    )

    expect(reticked.records).toBe(recordsAfterAdvance)
    expect(reticked.snapshots).toBe(once.truthLayerWeeklyProjectionSnapshots)
    expect(reticked.records[COMPETING_TRUTH_LAYERS_FIXTURE.id]).toBe(
      COMPETING_TRUTH_LAYERS_FIXTURE
    )
  })

  it('preserves validation fixture byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 30
    state.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.truthLayerRecords?.[COMPETING_TRUTH_LAYERS_FIXTURE.id]).toEqual(
      COMPETING_TRUTH_LAYERS_FIXTURE
    )
    expect(nextState.truthLayerRecords?.[ACTOR_TRUTH_LAYER_FIXTURE.id]).toEqual(
      ACTOR_TRUTH_LAYER_FIXTURE
    )
  })
})
