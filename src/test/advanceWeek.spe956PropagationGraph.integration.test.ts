import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { SPE_956_EXAMPLE_PROPAGATION_GRAPH } from '../domain/spe956PropagationGraph'
import type { Spe956PersistedPropagationGraph } from '../domain/spe956PropagationGraphPersistence'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function graphWithWeeklyDelta(
  overrides: Partial<Spe956PersistedPropagationGraph> = {}
): Spe956PersistedPropagationGraph {
  return Object.freeze({
    ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
    weeklyElapsedWeeksDelta: 1,
    ...overrides,
  })
}

describe('advanceWeek SPE-956 propagation graph weekly orchestration (SPE-2624)', () => {
  it('is a no-op for empty spe956PropagationGraphRecords without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe956PropagationGraphRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.spe956PropagationGraphRecords).toEqual({})
  })

  it('advances authored graph elapsed weeks on advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe956PropagationGraphRecords = {
      [SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]: graphWithWeeklyDelta({
        elapsedPropagationWeeks: 0,
      }),
    }

    const nextState = advanceWeek(state)
    const nextGraph =
      nextState.spe956PropagationGraphRecords?.[SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]

    expect(nextState.week).toBe(5)
    expect(nextGraph?.elapsedPropagationWeeks).toBe(1)
    expect(nextGraph?.lastWeeklyTickWeek).toBe(5)
  })

  it('does not invent graph growth when weekly deltas are absent', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const graph = Object.freeze({ ...SPE_956_EXAMPLE_PROPAGATION_GRAPH })
    state.spe956PropagationGraphRecords = {
      [graph.id]: graph,
    }

    const nextState = advanceWeek(state)

    expect(nextState.spe956PropagationGraphRecords?.[graph.id]).toEqual(graph)
  })

  it('preserves graph structure when weekly delta applies', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.spe956PropagationGraphRecords = {
      [SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]: graphWithWeeklyDelta(),
    }

    const nextState = advanceWeek(state)
    const nextGraph =
      nextState.spe956PropagationGraphRecords?.[SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]

    expect(nextGraph?.nodes).toEqual(SPE_956_EXAMPLE_PROPAGATION_GRAPH.nodes)
    expect(nextGraph?.edges).toEqual(SPE_956_EXAMPLE_PROPAGATION_GRAPH.edges)
    expect(nextGraph?.seedNodeId).toBe(SPE_956_EXAMPLE_PROPAGATION_GRAPH.seedNodeId)
  })
})
