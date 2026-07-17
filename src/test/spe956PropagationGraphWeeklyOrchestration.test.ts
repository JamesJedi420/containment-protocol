import { describe, expect, it } from 'vitest'

import {
  advanceSpe956PropagationGraphForWeek,
  applyWeeklySpe956PropagationGraphTick,
  hasSpe956PropagationGraphWeeklyDelta,
} from '../domain/spe956PropagationGraphWeeklyOrchestration'
import { SPE_956_EXAMPLE_PROPAGATION_GRAPH } from '../domain/spe956PropagationGraph'
import type { Spe956PersistedPropagationGraph } from '../domain/spe956PropagationGraphPersistence'

function graphWithWeeklyDelta(
  overrides: Partial<Spe956PersistedPropagationGraph> = {}
): Spe956PersistedPropagationGraph {
  return Object.freeze({
    ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
    weeklyElapsedWeeksDelta: 1,
    ...overrides,
  })
}

describe('spe956PropagationGraphWeeklyOrchestration (SPE-2624 / SPE-956 slice 3)', () => {
  it('treats empty maps as a no-op without throw', () => {
    const empty: Record<string, Spe956PersistedPropagationGraph> = {}
    expect(applyWeeklySpe956PropagationGraphTick(empty, 12)).toBe(empty)
    expect(applyWeeklySpe956PropagationGraphTick(undefined, 12)).toEqual({})
    expect(applyWeeklySpe956PropagationGraphTick(null, 12)).toEqual({})
  })

  it('detects authored weekly delta fields', () => {
    expect(hasSpe956PropagationGraphWeeklyDelta({ weeklyElapsedWeeksDelta: 1 })).toBe(true)
    expect(hasSpe956PropagationGraphWeeklyDelta({ weeklyElapsedWeeksDelta: 0 })).toBe(true)
    expect(hasSpe956PropagationGraphWeeklyDelta({})).toBe(false)
    expect(hasSpe956PropagationGraphWeeklyDelta({ weeklyElapsedWeeksDelta: -1 })).toBe(false)
  })

  it('leaves graphs without authored delta fields unchanged', () => {
    const graph = Object.freeze({ ...SPE_956_EXAMPLE_PROPAGATION_GRAPH })
    expect(advanceSpe956PropagationGraphForWeek(graph, 5)).toBe(graph)
  })

  it('advances elapsedPropagationWeeks when weekly delta is authored', () => {
    const graph = graphWithWeeklyDelta({ elapsedPropagationWeeks: 2, weeklyElapsedWeeksDelta: 3 })
    const advanced = advanceSpe956PropagationGraphForWeek(graph, 5)

    expect(advanced.elapsedPropagationWeeks).toBe(5)
    expect(advanced.lastWeeklyTickWeek).toBe(5)
  })

  it('defaults missing elapsedPropagationWeeks to zero before applying delta', () => {
    const graph = graphWithWeeklyDelta({ weeklyElapsedWeeksDelta: 2 })
    const advanced = advanceSpe956PropagationGraphForWeek(graph, 4)

    expect(advanced.elapsedPropagationWeeks).toBe(2)
    expect(advanced.lastWeeklyTickWeek).toBe(4)
  })

  it('is idempotent when re-ticked for the same week', () => {
    const graph = graphWithWeeklyDelta()
    const once = advanceSpe956PropagationGraphForWeek(graph, 8)
    const twice = advanceSpe956PropagationGraphForWeek(once, 8)

    expect(twice).toBe(once)
    expect(twice.elapsedPropagationWeeks).toBe(1)
  })

  it('stamps lastWeeklyTickWeek even when delta is zero', () => {
    const graph = graphWithWeeklyDelta({ weeklyElapsedWeeksDelta: 0, elapsedPropagationWeeks: 4 })
    const advanced = advanceSpe956PropagationGraphForWeek(graph, 6)

    expect(advanced.elapsedPropagationWeeks).toBe(4)
    expect(advanced.lastWeeklyTickWeek).toBe(6)
  })

  it('applies map tick in deterministic graph-id order', () => {
    const alpha = graphWithWeeklyDelta({ id: 'graph:alpha', label: 'Alpha' })
    const beta = graphWithWeeklyDelta({ id: 'graph:beta', label: 'Beta' })
    const maps = {
      [beta.id]: beta,
      [alpha.id]: alpha,
    }

    const next = applyWeeklySpe956PropagationGraphTick(maps, 3)

    expect(next[alpha.id]?.elapsedPropagationWeeks).toBe(1)
    expect(next[beta.id]?.elapsedPropagationWeeks).toBe(1)
    expect(next[alpha.id]?.lastWeeklyTickWeek).toBe(3)
    expect(next[beta.id]?.lastWeeklyTickWeek).toBe(3)
  })

  it('returns the same map reference when nothing changes', () => {
    const graph = Object.freeze({ ...SPE_956_EXAMPLE_PROPAGATION_GRAPH })
    const maps = { [graph.id]: graph }

    expect(applyWeeklySpe956PropagationGraphTick(maps, 9)).toBe(maps)
  })

  it('advances again on a later week', () => {
    const graph = graphWithWeeklyDelta()
    const weekOne = advanceSpe956PropagationGraphForWeek(graph, 2)
    const weekTwo = advanceSpe956PropagationGraphForWeek(weekOne, 3)

    expect(weekTwo.elapsedPropagationWeeks).toBe(2)
    expect(weekTwo.lastWeeklyTickWeek).toBe(3)
  })
})
