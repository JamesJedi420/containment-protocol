import { describe, expect, it } from 'vitest'

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
import { BACKGROUND_FRAGMENT_LATENT_FIXTURE } from '../domain/visualTriggerHazardRegistry'

describe('spe956PropagationGraph (SPE-2619 / SPE-956)', () => {
  it('empty or missing graph composes to empty result without throwing', () => {
    expect(composeSpe956PropagationGraph(null)).toEqual({
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

    expect(
      composeSpe956PropagationGraph({
        graph: {
          id: 'graph:empty',
          label: 'Empty',
          seedNodeId: 'node:missing',
          nodes: [],
          edges: [],
        },
        maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      })
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

  it('missing seed node yields empty hops with missing_seed_node reason', () => {
    const result = composeSpe956PropagationGraph({
      graph: {
        id: 'graph:bad-seed',
        label: 'Bad seed',
        seedNodeId: 'node:does-not-exist',
        nodes: SPE_956_EXAMPLE_PROPAGATION_GRAPH.nodes,
        edges: SPE_956_EXAMPLE_PROPAGATION_GRAPH.edges,
      },
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
    })

    expect(result.hops).toEqual([])
    expect(result.reasonCodes).toContain('missing_seed_node')
  })

  it('EXAMPLE artifact → platform path composes reach and exposure deterministically', () => {
    const artifactDecision = evaluateFootageExposureTraffic(
      resolveFootageExposureEvaluationInput(
        SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
        EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id
      )
    )
    const platformDecision = evaluatePlatformReachMultiplier(
      resolvePlatformReachEvaluationInput(SPE_947_EXAMPLE_PERSISTENCE_FIXTURE, 'platform:rumor-forum')
    )

    const result = composeSpe956PropagationGraph({
      graph: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {},
    })

    expect(result.hops).toHaveLength(2)
    expect(result.hops[0]?.nodeId).toBe('node:artifact-leak')
    expect(result.hops[0]?.civilianExposure).toBe(artifactDecision.resultingCivilianExposure)
    expect(result.hops[0]?.pathScale).toBe(1)
    expect(result.hops[1]?.nodeId).toBe('node:forum-platform')
    expect(result.hops[1]?.reachValue).toBeCloseTo(platformDecision.reachValue * 0.8, 6)
    expect(result.hops[1]?.pathScale).toBe(0.8)
    expect(result.aggregateReachValue).toBeCloseTo(platformDecision.reachValue * 0.8, 6)
    expect(result.aggregateCivilianExposure).toBe(artifactDecision.resultingCivilianExposure)
    expect(result.reasonCodes).toContain('graph_traversed')
  })

  it('edge spreadFactor attenuates downstream platform reach in aggregate', () => {
    const withoutAttenuation = composeSpe956PropagationGraph({
      graph: {
        ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
        edges: [
          {
            id: 'edge:full-spread',
            fromNodeId: 'node:artifact-leak',
            toNodeId: 'node:forum-platform',
            spreadFactor: 1,
          },
        ],
      },
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
    })

    const withAttenuation = composeSpe956PropagationGraph({
      graph: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
    })

    expect(withAttenuation.aggregateReachValue).toBeLessThan(withoutAttenuation.aggregateReachValue)
    expect(withAttenuation.aggregateReachValue).toBeCloseTo(
      withoutAttenuation.aggregateReachValue * 0.8,
      6
    )
  })

  it('linked registry record contributes broadcast risk without inventing dual truth', () => {
    const result = composeSpe956PropagationGraph({
      graph: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })

    const artifactHop = result.hops.find((hop) => hop.nodeId === 'node:artifact-leak')
    expect(artifactHop?.visualTriggerHazardId).toBe(BACKGROUND_FRAGMENT_LATENT_FIXTURE.id)
    expect(artifactHop?.broadcastRiskScore).toBeGreaterThan(0)
    expect(result.maxBroadcastRiskScore).toBe(artifactHop?.broadcastRiskScore ?? 0)
    expect(artifactHop?.reasonCodes).toContain('registry_broadcast_risk_linked')
  })

  it('missing entity encodes hop_missing_entity without throwing', () => {
    const result = composeSpe956PropagationGraph({
      graph: {
        id: 'graph:missing-platform',
        label: 'Missing platform',
        seedNodeId: 'node:artifact-leak',
        nodes: SPE_956_EXAMPLE_PROPAGATION_GRAPH.nodes,
        edges: SPE_956_EXAMPLE_PROPAGATION_GRAPH.edges,
      },
      maps: {
        ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
        spe947PlatformRecords: {},
      },
    })

    const platformHop = result.hops.find((hop) => hop.nodeId === 'node:forum-platform')
    expect(platformHop?.status).toBe('missing_entity')
    expect(platformHop?.reachValue).toBeNull()
    expect(result.reasonCodes).toContain('hop_missing_entity')
  })

  it('repeated compose is byte-stable', () => {
    const input = {
      graph: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    }

    expect(composeSpe956PropagationGraph(input)).toEqual(composeSpe956PropagationGraph(input))
  })
})
