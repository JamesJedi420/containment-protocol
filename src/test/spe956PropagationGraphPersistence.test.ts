import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  evaluateFootageExposureTraffic,
  EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
} from '../domain/footageExposureTraffic'
import { evaluatePlatformReachMultiplier } from '../domain/platformReachMultiplier'
import {
  resolveFootageExposureEvaluationInput,
  resolvePlatformReachEvaluationInput,
  SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
} from '../domain/spe947EvaluatorPersistence'
import {
  composeSpe956PropagationGraph,
  SPE_956_EXAMPLE_PROPAGATION_GRAPH,
} from '../domain/spe956PropagationGraph'
import {
  composeSpe956PropagationGraphFromGameState,
  sanitizeSpe956PropagationGraphRecords,
  SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
} from '../domain/spe956PropagationGraphPersistence'
import { BACKGROUND_FRAGMENT_LATENT_FIXTURE } from '../domain/visualTriggerHazardRegistry'

describe('spe956PropagationGraphPersistence (SPE-2621 / SPE-956 slice 2)', () => {
  it('defaults starting state to empty spe956PropagationGraphRecords', () => {
    expect(createStartingState().spe956PropagationGraphRecords).toEqual({})
  })

  it('drops invalid and duplicate graph entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe956PropagationGraphRecords({
      valid: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      duplicate: {
        ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
        label: 'duplicate label should lose',
      },
      missingSeed: {
        id: 'graph:missing-seed',
        label: 'Missing seed',
        seedNodeId: 'node:does-not-exist',
        nodes: SPE_956_EXAMPLE_PROPAGATION_GRAPH.nodes,
        edges: SPE_956_EXAMPLE_PROPAGATION_GRAPH.edges,
      },
      emptyNodes: {
        id: 'graph:empty',
        label: 'Empty',
        seedNodeId: 'node:artifact-leak',
        nodes: [],
        edges: [],
      },
      badNodeKind: {
        id: 'graph:bad-node',
        label: 'Bad node',
        seedNodeId: 'node:bad',
        nodes: [
          {
            id: 'node:bad',
            label: 'Bad',
            kind: 'not_a_kind',
            entityId: 'artifact:bad',
          },
        ],
        edges: [],
      },
      danglingEdge: {
        id: 'graph:dangling-edge',
        label: 'Dangling edge',
        seedNodeId: 'node:artifact-leak',
        nodes: [SPE_956_EXAMPLE_PROPAGATION_GRAPH.nodes[0]],
        edges: [
          {
            id: 'edge:dangling',
            fromNodeId: 'node:artifact-leak',
            toNodeId: 'node:missing-target',
            spreadFactor: 0.5,
          },
        ],
      },
    })

    expect(sanitized[SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]).toEqual(
      SPE_956_EXAMPLE_PROPAGATION_GRAPH
    )
    expect(sanitized['graph:missing-seed']).toBeUndefined()
    expect(sanitized['graph:empty']).toBeUndefined()
    expect(sanitized['graph:bad-node']).toBeUndefined()
    expect(sanitized['graph:dangling-edge']).toBeDefined()
    expect(sanitized['graph:dangling-edge']?.edges).toEqual([])
  })

  it('round-trips EXAMPLE graph records through save/load', () => {
    const state = createStartingState()
    Object.assign(state, {
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      spe956PropagationGraphRecords: SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956PropagationGraphRecords).toEqual(
      SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS
    )
  })

  it('hydrates persisted graph records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956PropagationGraphRecords: {
          ...SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
          invalid: {
            id: 'graph:invalid',
            label: 'Invalid',
            seedNodeId: 'node:missing',
            nodes: [],
            edges: [],
          },
        },
      },
      fallback
    )

    expect(hydrated.spe956PropagationGraphRecords).toEqual(
      SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS
    )
  })

  it('composeSpe956PropagationGraphFromGameState matches direct compose with persisted maps', () => {
    const game = {
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      spe956PropagationGraphRecords: SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    }

    const fromGameState = composeSpe956PropagationGraphFromGameState(
      game,
      SPE_956_EXAMPLE_PROPAGATION_GRAPH.id
    )
    const direct = composeSpe956PropagationGraph({
      graph: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: game.visualTriggerHazardRecords,
    })

    expect(fromGameState).toEqual(direct)
  })

  it('empty default graph records do not false-positive parent AC compose scenarios', () => {
    const state = createStartingState()

    expect(
      composeSpe956PropagationGraphFromGameState(state, SPE_956_EXAMPLE_PROPAGATION_GRAPH.id)
    ).toEqual({
      graphId: '(none)',
      graphLabel: '(none)',
      seedNodeId: '(none)',
      hops: [],
      aggregateReachValue: 0,
      aggregateCivilianExposure: 0,
      aggregateAttractionTraffic: 0,
      maxBroadcastRiskScore: 0,
      reasonCodes: ['empty_graph'],
    })
  })

  it('persisted graph with spe947 maps composes reach and exposure deterministically', () => {
    const artifactDecision = evaluateFootageExposureTraffic(
      resolveFootageExposureEvaluationInput(
        SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
        EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id
      )
    )
    const platformDecision = evaluatePlatformReachMultiplier(
      resolvePlatformReachEvaluationInput(SPE_947_EXAMPLE_PERSISTENCE_FIXTURE, 'platform:rumor-forum')
    )

    const result = composeSpe956PropagationGraphFromGameState(
      {
        ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
        spe956PropagationGraphRecords: SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
      },
      SPE_956_EXAMPLE_PROPAGATION_GRAPH.id
    )

    expect(result.hops).toHaveLength(2)
    expect(result.hops[0]?.civilianExposure).toBe(artifactDecision.resultingCivilianExposure)
    expect(result.hops[1]?.reachValue).toBeCloseTo(platformDecision.reachValue * 0.8, 6)
    expect(result.reasonCodes).toContain('graph_traversed')
  })

  it('sanitizes and round-trips optional weekly orchestration fields', () => {
    const withWeeklyFields = Object.freeze({
      ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      elapsedPropagationWeeks: 3,
      weeklyElapsedWeeksDelta: 2,
      lastWeeklyTickWeek: 7,
    })

    const sanitized = sanitizeSpe956PropagationGraphRecords({
      [withWeeklyFields.id]: withWeeklyFields,
      invalidWeekly: {
        ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
        id: 'graph:invalid-weekly',
        label: 'Invalid weekly',
        weeklyElapsedWeeksDelta: -1,
      },
      invalidTickWeek: {
        ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
        id: 'graph:invalid-tick',
        label: 'Invalid tick week',
        lastWeeklyTickWeek: 0,
      },
    })

    expect(sanitized[withWeeklyFields.id]).toEqual(withWeeklyFields)
    expect(sanitized['graph:invalid-weekly']).toBeUndefined()
    expect(sanitized['graph:invalid-tick']).toBeUndefined()
  })

  it('round-trips weekly fields through save/load', () => {
    const records = {
      [SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]: Object.freeze({
        ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
        elapsedPropagationWeeks: 1,
        weeklyElapsedWeeksDelta: 1,
        lastWeeklyTickWeek: 4,
      }),
    }
    const state = createStartingState()
    Object.assign(state, {
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      spe956PropagationGraphRecords: records,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956PropagationGraphRecords).toEqual(records)
  })
})
