export type MapLayerType = 'structural' | 'security' | 'anomaly'

export type MapErrorState =
  | 'none'
  | 'outdated'
  | 'incomplete'
  | 'distorted'
  | 'falsified'
  | 'contradicted'
  | 'sensor_limited'

export interface RealityNode {
  id: string
  label: string
  layerTags: readonly MapLayerType[]
}

export interface RealityEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  layerType: MapLayerType
  hidden: boolean
}

export interface RealityEntityPosition {
  entityId: string
  entityType: 'anomaly' | 'staff' | 'external'
  nodeId: string
}

export interface RealityMapGraph {
  nodes: readonly RealityNode[]
  edges: readonly RealityEdge[]
  entityPositions?: readonly RealityEntityPosition[]
}

export type MapNodeKnowledge = 'known' | 'unknown_adjacent' | 'inferred'
export type MapEdgeVisibility = 'known_connection' | 'hidden_connection' | 'inferred_connection'

export interface MapNode {
  id: string
  realityNodeId?: string
  label: string
  layerTags: readonly MapLayerType[]
  knowledge: MapNodeKnowledge
  confidence: number
  errorState: MapErrorState
  sourceTags: readonly string[]
}

export interface MapEdge {
  id: string
  realityEdgeId?: string
  fromNodeId: string
  toNodeId: string
  layerType: MapLayerType
  visibility: MapEdgeVisibility
  confidence: number
  errorState: MapErrorState
  sourceTags: readonly string[]
}

export interface InferredHazardMarker {
  id: string
  hazardId: string
  nodeHintId: string
  layerType: 'anomaly'
  confidence: number
  errorState: MapErrorState
  sourceTag: 'sensor' | 'witness' | 'record'
}

export interface MapLayerView {
  layerType: MapLayerType
  nodes: readonly MapNode[]
  edges: readonly MapEdge[]
}

export interface PlayerMapState {
  packetId: string
  activeLayer: MapLayerType
  nodes: readonly MapNode[]
  edges: readonly MapEdge[]
  layers: readonly MapLayerView[]
  knownRealityNodeIds: readonly string[]
  revealedHiddenEdgeIds: readonly string[]
  inferredHazards: readonly InferredHazardMarker[]
}

export interface MapInitializationInput {
  seed: number
  knownNodeIds: readonly string[]
  activeLayer?: MapLayerType
}

export type MapObservationType =
  | 'exploration_room'
  | 'scan_connection'
  | 'sensor_inferred_hazard'
  | 'contradiction_correction'

export interface MapObservation {
  observationId: string
  week: number
  type: MapObservationType
  source: 'exploration' | 'sensor' | 'record' | 'witness'
  confidence: number
  realityNodeId?: string
  realityEdgeId?: string
  hazardId?: string
  nodeHintId?: string
  targetMapId?: string
  correctionErrorState?: Exclude<MapErrorState, 'none'>
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function sortedUnique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function sortNodes(nodes: readonly MapNode[]): MapNode[] {
  return [...nodes].sort((left, right) => left.id.localeCompare(right.id))
}

function sortEdges(edges: readonly MapEdge[]): MapEdge[] {
  return [...edges].sort((left, right) => left.id.localeCompare(right.id))
}

function toUnknownAdjacentNodeId(knownNodeId: string, edgeId: string): string {
  return `unknown-adjacent:${knownNodeId}:${edgeId}`
}

function toInferredHazardNodeId(hazardId: string, nodeHintId: string): string {
  return `inferred-hazard:${hazardId}:${nodeHintId}`
}

function buildVisibleState(
  reality: RealityMapGraph,
  seed: number,
  activeLayer: MapLayerType,
  knownRealityNodeIds: readonly string[],
  revealedHiddenEdgeIds: readonly string[],
  inferredHazards: readonly InferredHazardMarker[]
): PlayerMapState {
  const nodeById = new Map(reality.nodes.map((node) => [node.id, node]))
  const knownNodeSet = new Set(knownRealityNodeIds)
  const revealedHiddenSet = new Set(revealedHiddenEdgeIds)

  const nodes: MapNode[] = []
  const edges: MapEdge[] = []

  for (const realityNodeId of sortedUnique(knownRealityNodeIds)) {
    const realityNode = nodeById.get(realityNodeId)
    if (!realityNode) continue

    nodes.push({
      id: `node:${realityNode.id}`,
      realityNodeId: realityNode.id,
      label: realityNode.label,
      layerTags: realityNode.layerTags,
      knowledge: 'known',
      confidence: 1,
      errorState: 'none',
      sourceTags: ['exploration'],
    })
  }

  for (const edge of reality.edges) {
    const fromKnown = knownNodeSet.has(edge.fromNodeId)
    const toKnown = knownNodeSet.has(edge.toNodeId)

    if (!fromKnown && !toKnown) {
      continue
    }

    if (edge.hidden && !revealedHiddenSet.has(edge.id)) {
      continue
    }

    if (fromKnown && toKnown) {
      edges.push({
        id: `edge:${edge.id}`,
        realityEdgeId: edge.id,
        fromNodeId: `node:${edge.fromNodeId}`,
        toNodeId: `node:${edge.toNodeId}`,
        layerType: edge.layerType,
        visibility: edge.hidden ? 'hidden_connection' : 'known_connection',
        confidence: edge.hidden ? 0.72 : 0.96,
        errorState: 'none',
        sourceTags: edge.hidden ? ['sensor'] : ['exploration'],
      })
      continue
    }

    // Unknown adjacent node projection for edges leading out of known space.
    const knownEndpoint = fromKnown ? edge.fromNodeId : edge.toNodeId
    const unknownNodeId = toUnknownAdjacentNodeId(knownEndpoint, edge.id)
    const unknownLabel = `Unknown adjacent room (${edge.layerType})`

    if (!nodes.some((node) => node.id === unknownNodeId)) {
      nodes.push({
        id: unknownNodeId,
        label: unknownLabel,
        layerTags: [edge.layerType],
        knowledge: 'unknown_adjacent',
        confidence: edge.hidden ? 0.15 : 0.4,
        errorState: edge.hidden ? 'incomplete' : 'none',
        sourceTags: edge.hidden ? ['record'] : ['structural-adjacency'],
      })
    }

    edges.push({
      id: `edge:${edge.id}:projection`,
      realityEdgeId: edge.id,
      fromNodeId: `node:${knownEndpoint}`,
      toNodeId: unknownNodeId,
      layerType: edge.layerType,
      visibility: edge.hidden ? 'hidden_connection' : 'known_connection',
      confidence: edge.hidden ? 0.2 : 0.48,
      errorState: edge.hidden ? 'incomplete' : 'none',
      sourceTags: edge.hidden ? ['record'] : ['adjacency'],
    })
  }

  for (const marker of inferredHazards) {
    const markerNodeId = toInferredHazardNodeId(marker.hazardId, marker.nodeHintId)
    if (!nodes.some((node) => node.id === markerNodeId)) {
      nodes.push({
        id: markerNodeId,
        label: `Inferred hazard near ${marker.nodeHintId}`,
        layerTags: ['anomaly'],
        knowledge: 'inferred',
        confidence: marker.confidence,
        errorState: marker.errorState,
        sourceTags: [marker.sourceTag],
      })
    }
  }

  const sortedNodes = sortNodes(nodes)
  const sortedEdges = sortEdges(edges)
  const layerTypes: MapLayerType[] = ['structural', 'security', 'anomaly']
  const layers = layerTypes.map((layerType) => ({
    layerType,
    nodes: sortedNodes.filter((node) => node.layerTags.includes(layerType)),
    edges: sortedEdges.filter((edge) => edge.layerType === layerType),
  }))

  return {
    packetId: `map-awareness:${seed}`,
    activeLayer,
    nodes: sortedNodes,
    edges: sortedEdges,
    layers,
    knownRealityNodeIds: sortedUnique(knownRealityNodeIds),
    revealedHiddenEdgeIds: sortedUnique(revealedHiddenEdgeIds),
    inferredHazards: [...inferredHazards].sort((left, right) => left.id.localeCompare(right.id)),
  }
}

export function createPlayerMapState(
  reality: RealityMapGraph,
  input: MapInitializationInput
): PlayerMapState {
  const activeLayer = input.activeLayer ?? 'structural'
  return buildVisibleState(
    reality,
    input.seed,
    activeLayer,
    sortedUnique(input.knownNodeIds),
    [],
    []
  )
}

export function applyMapObservation(
  reality: RealityMapGraph,
  mapState: PlayerMapState,
  observation: MapObservation
): PlayerMapState {
  const knownNodeIds = new Set(mapState.knownRealityNodeIds)
  const revealedHiddenEdgeIds = new Set(mapState.revealedHiddenEdgeIds)
  const inferredHazards = [...mapState.inferredHazards]

  if (observation.type === 'exploration_room' && observation.realityNodeId) {
    knownNodeIds.add(observation.realityNodeId)
  }

  if (observation.type === 'scan_connection' && observation.realityEdgeId) {
    const edge = reality.edges.find((candidate) => candidate.id === observation.realityEdgeId)
    if (edge && edge.hidden && observation.confidence >= 0.6) {
      revealedHiddenEdgeIds.add(edge.id)
    }
  }

  if (
    observation.type === 'sensor_inferred_hazard' &&
    observation.hazardId &&
    observation.nodeHintId
  ) {
    const id = `${observation.observationId}:${observation.hazardId}:${observation.nodeHintId}`
    const existingIndex = inferredHazards.findIndex((marker) => marker.id === id)
    const marker: InferredHazardMarker = {
      id,
      hazardId: observation.hazardId,
      nodeHintId: observation.nodeHintId,
      layerType: 'anomaly',
      confidence: clamp01(observation.confidence),
      errorState: observation.confidence < 0.4 ? 'sensor_limited' : 'none',
      sourceTag:
        observation.source === 'sensor'
          ? 'sensor'
          : observation.source === 'witness'
            ? 'witness'
            : 'record',
    }

    if (existingIndex >= 0) {
      inferredHazards[existingIndex] = marker
    } else {
      inferredHazards.push(marker)
    }
  }

  if (observation.type === 'contradiction_correction' && observation.targetMapId) {
    for (let index = 0; index < inferredHazards.length; index += 1) {
      const marker = inferredHazards[index]!
      if (marker.id !== observation.targetMapId) {
        continue
      }

      inferredHazards[index] = {
        ...marker,
        confidence: clamp01(marker.confidence * 0.5),
        errorState: observation.correctionErrorState ?? 'contradicted',
      }
    }
  }

  return buildVisibleState(
    reality,
    Number(mapState.packetId.split(':')[1]) || 0,
    mapState.activeLayer,
    [...knownNodeIds],
    [...revealedHiddenEdgeIds],
    inferredHazards,
  )
}

export function selectMapLayer(
  mapState: PlayerMapState,
  layerType: MapLayerType
): PlayerMapState {
  return {
    ...mapState,
    activeLayer: layerType,
  }
}

export function getActiveLayerView(mapState: PlayerMapState): MapLayerView {
  return (
    mapState.layers.find((layer) => layer.layerType === mapState.activeLayer) ?? {
      layerType: mapState.activeLayer,
      nodes: [],
      edges: [],
    }
  )
}

export function getConfidenceLabel(value: number): 'low' | 'medium' | 'high' {
  if (value >= 0.75) {
    return 'high'
  }

  if (value >= 0.4) {
    return 'medium'
  }

  return 'low'
}
