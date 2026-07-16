/**
 * SPE-2619 / SPE-956: smallest deterministic propagation graph compose.
 *
 * Authored nodes/edges only — wires existing SPE-947 evaluator surfaces
 * (SPE-2568 reach, SPE-2571 exposure) with optional SPE-2602 / SPE-2111
 * registry broadcast-risk projection. No GameState persistence, no week-close
 * wire, no evaluator contract changes.
 */

import { evaluateFootageExposureTraffic } from './footageExposureTraffic'
import { evaluatePlatformReachMultiplier } from './platformReachMultiplier'
import {
  resolveFootageExposureEvaluationInput,
  resolvePlatformReachEvaluationInput,
  type Spe947EvaluatorPersistenceMaps,
} from './spe947EvaluatorPersistence'
import {
  composeSpe947VisualTriggerHazardLinks,
  type Spe947VisualTriggerHazardLinkageMaps,
} from './spe947VisualTriggerHazardLinkage'
import {
  projectExposureChainRisk,
  type VisualTriggerHazardRecordsMap,
} from './visualTriggerHazardRegistry'

export const SPE_956_PROPAGATION_GRAPH_NODE_KINDS = ['platform', 'content_artifact'] as const

export type Spe956PropagationGraphNodeKind = (typeof SPE_956_PROPAGATION_GRAPH_NODE_KINDS)[number]

export interface Spe956PropagationGraphNode {
  readonly id: string
  readonly label: string
  readonly kind: Spe956PropagationGraphNodeKind
  /** spe947 platform or content-artifact entity id. */
  readonly entityId: string
}

export interface Spe956PropagationGraphEdge {
  readonly id: string
  readonly fromNodeId: string
  readonly toNodeId: string
  /**
   * Downstream attenuation applied when traversing this edge (0–1 inclusive).
   * Defaults to 1 when omitted.
   */
  readonly spreadFactor?: number
}

export interface AuthoredSpe956PropagationGraph {
  readonly id: string
  readonly label: string
  readonly seedNodeId: string
  readonly nodes: readonly Spe956PropagationGraphNode[]
  readonly edges: readonly Spe956PropagationGraphEdge[]
}

export type Spe956PropagationGraphHopStatus = 'resolved' | 'missing_entity' | 'unknown_node_kind'

export interface Spe956PropagationGraphHopReading {
  readonly nodeId: string
  readonly nodeLabel: string
  readonly nodeKind: Spe956PropagationGraphNodeKind
  readonly entityId: string
  readonly hopIndex: number
  readonly pathScale: number
  readonly status: Spe956PropagationGraphHopStatus
  readonly reachValue: number | null
  readonly civilianExposure: number | null
  readonly attractionTraffic: number | null
  readonly broadcastRiskScore: number | null
  readonly visualTriggerHazardId: string | null
  readonly reasonCodes: readonly string[]
}

export interface Spe956PropagationGraphComposeResult {
  readonly graphId: string
  readonly graphLabel: string
  readonly seedNodeId: string
  readonly hops: readonly Spe956PropagationGraphHopReading[]
  readonly aggregateReachValue: number
  readonly aggregateCivilianExposure: number
  readonly aggregateAttractionTraffic: number
  readonly maxBroadcastRiskScore: number
  readonly reasonCodes: readonly string[]
}

export interface Spe956PropagationGraphComposeInput {
  readonly graph?: AuthoredSpe956PropagationGraph | null
  readonly maps?: Spe956PropagationGraphLinkageMaps
  readonly visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap | null
}

export type Spe956PropagationGraphLinkageMaps = Spe947EvaluatorPersistenceMaps &
  Spe947VisualTriggerHazardLinkageMaps

const EMPTY_COMPOSE_RESULT: Spe956PropagationGraphComposeResult = Object.freeze({
  graphId: '(none)',
  graphLabel: '(none)',
  seedNodeId: '(none)',
  hops: Object.freeze([]),
  aggregateReachValue: 0,
  aggregateCivilianExposure: 0,
  aggregateAttractionTraffic: 0,
  maxBroadcastRiskScore: 0,
  reasonCodes: Object.freeze(['empty_graph']),
})

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const scaled = value * 1_000_000
  if (!Number.isFinite(scaled)) {
    return 0
  }

  return Math.round(scaled) / 1_000_000
}

function clampSpreadFactor(value: unknown): { factor: number; reasonCodes: string[] } {
  if (value === undefined || value === null) {
    return { factor: 1, reasonCodes: [] }
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { factor: 1, reasonCodes: ['invalid_spread_factor_fallback'] }
  }

  if (value < 0) {
    return { factor: 0, reasonCodes: ['negative_spread_factor_clamped'] }
  }

  if (value > 1) {
    return { factor: 1, reasonCodes: ['spread_factor_above_one_clamped'] }
  }

  return { factor: value, reasonCodes: [] }
}

function indexNodes(
  nodes: readonly Spe956PropagationGraphNode[]
): Map<string, Spe956PropagationGraphNode> {
  const byId = new Map<string, Spe956PropagationGraphNode>()
  for (const node of nodes) {
    if (typeof node?.id === 'string' && node.id.trim().length > 0) {
      byId.set(node.id.trim(), node)
    }
  }
  return byId
}

function outgoingEdges(
  edges: readonly Spe956PropagationGraphEdge[],
  fromNodeId: string
): readonly Spe956PropagationGraphEdge[] {
  return Object.freeze(
    edges
      .filter((edge) => edge.fromNodeId === fromNodeId)
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
  )
}

function resolveRegistryBindingForEntity(input: {
  entityKind: Spe956PropagationGraphNodeKind
  entityId: string
  maps: Spe956PropagationGraphLinkageMaps
  visualTriggerHazardRecords: VisualTriggerHazardRecordsMap
}): { visualTriggerHazardId: string | null; broadcastRiskScore: number | null } {
  const links = composeSpe947VisualTriggerHazardLinks({
    maps: input.maps,
    visualTriggerHazardRecords: input.visualTriggerHazardRecords,
  })

  const match = links.find(
    (link) => link.entityKind === input.entityKind && link.entityId === input.entityId
  )

  if (!match || match.status !== 'resolved' || !match.registryRecord) {
    return { visualTriggerHazardId: match?.visualTriggerHazardId ?? null, broadcastRiskScore: null }
  }

  const projection = projectExposureChainRisk(match.registryRecord)
  return {
    visualTriggerHazardId: match.visualTriggerHazardId,
    broadcastRiskScore: projection.broadcastRiskScore,
  }
}

function resolveHopReading(input: {
  node: Spe956PropagationGraphNode
  hopIndex: number
  pathScale: number
  maps: Spe956PropagationGraphLinkageMaps
  visualTriggerHazardRecords: VisualTriggerHazardRecordsMap
}): Spe956PropagationGraphHopReading {
  const reasonCodes: string[] = []
  const node = input.node
  const pathScale = roundMetric(input.pathScale)

  const registry = resolveRegistryBindingForEntity({
    entityKind: node.kind,
    entityId: node.entityId,
    maps: input.maps,
    visualTriggerHazardRecords: input.visualTriggerHazardRecords,
  })

  if (registry.visualTriggerHazardId && registry.broadcastRiskScore !== null) {
    reasonCodes.push('registry_broadcast_risk_linked')
  } else if (registry.visualTriggerHazardId) {
    reasonCodes.push('registry_link_unresolved')
  }

  switch (node.kind) {
    case 'platform': {
      const reachInput = resolvePlatformReachEvaluationInput(input.maps, node.entityId)
      const platform = input.maps.spe947PlatformRecords?.[node.entityId]
      if (!platform) {
        reasonCodes.push('missing_platform_entity')
        return Object.freeze({
          nodeId: node.id,
          nodeLabel: node.label,
          nodeKind: node.kind,
          entityId: node.entityId,
          hopIndex: input.hopIndex,
          pathScale,
          status: 'missing_entity',
          reachValue: null,
          civilianExposure: null,
          attractionTraffic: null,
          broadcastRiskScore: registry.broadcastRiskScore,
          visualTriggerHazardId: registry.visualTriggerHazardId,
          reasonCodes: uniqueSorted(reasonCodes),
        })
      }

      const decision = evaluatePlatformReachMultiplier(reachInput)
      reasonCodes.push(...decision.reasonCodes, 'platform_reach_evaluated')

      return Object.freeze({
        nodeId: node.id,
        nodeLabel: node.label,
        nodeKind: node.kind,
        entityId: node.entityId,
        hopIndex: input.hopIndex,
        pathScale,
        status: 'resolved',
        reachValue: roundMetric(decision.reachValue * pathScale),
        civilianExposure: null,
        attractionTraffic: null,
        broadcastRiskScore: registry.broadcastRiskScore,
        visualTriggerHazardId: registry.visualTriggerHazardId,
        reasonCodes: uniqueSorted(reasonCodes),
      })
    }
    case 'content_artifact': {
      const artifact = input.maps.spe947ContentArtifacts?.[node.entityId]
      if (!artifact) {
        reasonCodes.push('missing_content_artifact_entity')
        return Object.freeze({
          nodeId: node.id,
          nodeLabel: node.label,
          nodeKind: node.kind,
          entityId: node.entityId,
          hopIndex: input.hopIndex,
          pathScale,
          status: 'missing_entity',
          reachValue: null,
          civilianExposure: null,
          attractionTraffic: null,
          broadcastRiskScore: registry.broadcastRiskScore,
          visualTriggerHazardId: registry.visualTriggerHazardId,
          reasonCodes: uniqueSorted(reasonCodes),
        })
      }

      const exposureInput = resolveFootageExposureEvaluationInput(input.maps, node.entityId)
      const decision = evaluateFootageExposureTraffic(exposureInput)
      reasonCodes.push(...decision.reasonCodes, 'footage_exposure_evaluated')

      return Object.freeze({
        nodeId: node.id,
        nodeLabel: node.label,
        nodeKind: node.kind,
        entityId: node.entityId,
        hopIndex: input.hopIndex,
        pathScale,
        status: 'resolved',
        reachValue: null,
        civilianExposure: roundMetric(decision.resultingCivilianExposure * pathScale),
        attractionTraffic: roundMetric(decision.resultingAttractionTraffic * pathScale),
        broadcastRiskScore: registry.broadcastRiskScore,
        visualTriggerHazardId: registry.visualTriggerHazardId,
        reasonCodes: uniqueSorted(reasonCodes),
      })
    }
    default: {
      const _exhaustive: never = node.kind
      reasonCodes.push('unknown_node_kind')
      return Object.freeze({
        nodeId: node.id,
        nodeLabel: node.label,
        nodeKind: _exhaustive,
        entityId: node.entityId,
        hopIndex: input.hopIndex,
        pathScale,
        status: 'unknown_node_kind',
        reachValue: null,
        civilianExposure: null,
        attractionTraffic: null,
        broadcastRiskScore: registry.broadcastRiskScore,
        visualTriggerHazardId: registry.visualTriggerHazardId,
        reasonCodes: uniqueSorted(reasonCodes),
      })
    }
  }
}

function aggregateHops(hops: readonly Spe956PropagationGraphHopReading[]): {
  aggregateReachValue: number
  aggregateCivilianExposure: number
  aggregateAttractionTraffic: number
  maxBroadcastRiskScore: number
  reasonCodes: string[]
} {
  let aggregateReachValue = 0
  let aggregateCivilianExposure = 0
  let aggregateAttractionTraffic = 0
  let maxBroadcastRiskScore = 0
  const reasonCodes: string[] = []

  for (const hop of hops) {
    if (hop.reachValue !== null) {
      aggregateReachValue += hop.reachValue
    }
    if (hop.civilianExposure !== null) {
      aggregateCivilianExposure += hop.civilianExposure
    }
    if (hop.attractionTraffic !== null) {
      aggregateAttractionTraffic += hop.attractionTraffic
    }
    if (hop.broadcastRiskScore !== null && hop.broadcastRiskScore > maxBroadcastRiskScore) {
      maxBroadcastRiskScore = hop.broadcastRiskScore
    }
    if (hop.status === 'missing_entity') {
      reasonCodes.push('hop_missing_entity')
    }
  }

  if (hops.length > 0) {
    reasonCodes.push('graph_traversed')
  }

  return {
    aggregateReachValue: roundMetric(aggregateReachValue),
    aggregateCivilianExposure: roundMetric(aggregateCivilianExposure),
    aggregateAttractionTraffic: roundMetric(aggregateAttractionTraffic),
    maxBroadcastRiskScore: roundMetric(maxBroadcastRiskScore),
    reasonCodes,
  }
}

/**
 * Deterministic BFS compose over an authored propagation graph.
 * Empty/missing graph → empty result without throw.
 */
export function composeSpe956PropagationGraph(
  input: Spe956PropagationGraphComposeInput | null | undefined
): Spe956PropagationGraphComposeResult {
  const graph = input?.graph
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return EMPTY_COMPOSE_RESULT
  }

  const maps = input?.maps ?? {
    spe947PlatformRecords: {},
    spe947OperationRecords: {},
    spe947ContentArtifacts: {},
    spe947CounterMemeticPlans: {},
    spe947ContentOwners: {},
    spe947PostCaseMediaCases: {},
    spe947FootageExposureBindings: {},
    spe947TakedownResistanceBindings: {},
    spe947VisualTriggerHazardBindings: {},
  }
  const visualTriggerHazardRecords = input?.visualTriggerHazardRecords ?? {}
  const nodesById = indexNodes(graph.nodes)
  const seedNode = nodesById.get(graph.seedNodeId)

  if (!seedNode) {
    return Object.freeze({
      graphId: graph.id,
      graphLabel: graph.label,
      seedNodeId: graph.seedNodeId,
      hops: Object.freeze([]),
      aggregateReachValue: 0,
      aggregateCivilianExposure: 0,
      aggregateAttractionTraffic: 0,
      maxBroadcastRiskScore: 0,
      reasonCodes: Object.freeze(['missing_seed_node']),
    })
  }

  const hops: Spe956PropagationGraphHopReading[] = []
  const visited = new Set<string>()
  const queue: Array<{ nodeId: string; hopIndex: number; pathScale: number }> = [
    { nodeId: seedNode.id, hopIndex: 0, pathScale: 1 },
  ]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current.nodeId)) {
      continue
    }

    visited.add(current.nodeId)
    const node = nodesById.get(current.nodeId)
    if (!node) {
      continue
    }

    hops.push(
      resolveHopReading({
        node,
        hopIndex: current.hopIndex,
        pathScale: current.pathScale,
        maps,
        visualTriggerHazardRecords,
      })
    )

    for (const edge of outgoingEdges(graph.edges, current.nodeId)) {
      if (visited.has(edge.toNodeId)) {
        continue
      }

      const spread = clampSpreadFactor(edge.spreadFactor)
      queue.push({
        nodeId: edge.toNodeId,
        hopIndex: current.hopIndex + 1,
        pathScale: roundMetric(current.pathScale * spread.factor),
      })
    }
  }

  hops.sort((left, right) => {
    const hopCompare = left.hopIndex - right.hopIndex
    if (hopCompare !== 0) {
      return hopCompare
    }
    return left.nodeId.localeCompare(right.nodeId)
  })

  const aggregate = aggregateHops(hops)

  return Object.freeze({
    graphId: graph.id,
    graphLabel: graph.label,
    seedNodeId: graph.seedNodeId,
    hops: Object.freeze(hops),
    aggregateReachValue: aggregate.aggregateReachValue,
    aggregateCivilianExposure: aggregate.aggregateCivilianExposure,
    aggregateAttractionTraffic: aggregate.aggregateAttractionTraffic,
    maxBroadcastRiskScore: aggregate.maxBroadcastRiskScore,
    reasonCodes: uniqueSorted(aggregate.reasonCodes),
  })
}

/** EXAMPLE authored graph: active footage artifact → rumor forum platform. */
export const SPE_956_EXAMPLE_PROPAGATION_GRAPH: AuthoredSpe956PropagationGraph = Object.freeze({
  id: 'propagation-graph:leak-forum-chain',
  label: 'Leak footage to rumor forum chain',
  seedNodeId: 'node:artifact-leak',
  nodes: Object.freeze([
    Object.freeze({
      id: 'node:artifact-leak',
      label: 'Leaked footage artifact',
      kind: 'content_artifact' as const,
      entityId: 'artifact:leak-footage-clip',
    }),
    Object.freeze({
      id: 'node:forum-platform',
      label: 'Rumor forum platform',
      kind: 'platform' as const,
      entityId: 'platform:rumor-forum',
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({
      id: 'edge:artifact-to-forum',
      fromNodeId: 'node:artifact-leak',
      toNodeId: 'node:forum-platform',
      spreadFactor: 0.8,
    }),
  ]),
})
