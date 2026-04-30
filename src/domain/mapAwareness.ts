export type MapLayerType = 'structural' | 'security' | 'anomaly' | 'relationship'

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
  doorState?: 'open' | 'locked' | 'sealed' | 'destroyed'
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
  routeStateByEdgeId: Readonly<Record<string, RouteStateOverride>>
}

export interface RouteStateOverride {
  doorState?: 'open' | 'locked' | 'sealed' | 'destroyed'
  invalidated?: boolean
  confidence?: number
  errorState?: MapErrorState
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

export type MapUpdateEventType =
  | 'scan_event'
  | 'exploration_event'
  | 'system_route_state_event'
  | 'contradiction_event'

export interface MapUpdateEvent {
  eventId: string
  week: number
  type: MapUpdateEventType
  source: 'sensor' | 'exploration' | 'record' | 'system'
  confidence: number
  realityNodeId?: string
  realityEdgeId?: string
  hazardId?: string
  nodeHintId?: string
  targetMapId?: string
  correctionErrorState?: Exclude<MapErrorState, 'none'>
  doorState?: 'open' | 'locked' | 'sealed' | 'destroyed'
  invalidated?: boolean
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
  inferredHazards: readonly InferredHazardMarker[],
  routeStateByEdgeId: Readonly<Record<string, RouteStateOverride>>
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
    const routeOverride = routeStateByEdgeId[edge.id]
    const invalidated = routeOverride?.invalidated === true
    const fromKnown = knownNodeSet.has(edge.fromNodeId)
    const toKnown = knownNodeSet.has(edge.toNodeId)

    if (!fromKnown && !toKnown) {
      continue
    }

    if (edge.hidden && !revealedHiddenSet.has(edge.id)) {
      continue
    }

    if (fromKnown && toKnown) {
      const baseVisibility = edge.hidden ? 'hidden_connection' : 'known_connection'
      edges.push({
        id: `edge:${edge.id}`,
        realityEdgeId: edge.id,
        fromNodeId: `node:${edge.fromNodeId}`,
        toNodeId: `node:${edge.toNodeId}`,
        layerType: edge.layerType,
        visibility: invalidated ? 'inferred_connection' : baseVisibility,
        confidence: routeOverride?.confidence ?? (invalidated ? 0.35 : edge.hidden ? 0.72 : 0.96),
        errorState: routeOverride?.errorState ?? (invalidated ? 'outdated' : 'none'),
        sourceTags: invalidated
          ? ['system']
          : edge.hidden
            ? ['sensor']
            : ['exploration'],
        doorState: routeOverride?.doorState,
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
  const layerTypes: MapLayerType[] = ['structural', 'security', 'anomaly', 'relationship']
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
    routeStateByEdgeId,
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
    [],
    {}
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
    mapState.routeStateByEdgeId,
  )
}

export function applyMapUpdateEvent(
  reality: RealityMapGraph,
  mapState: PlayerMapState,
  event: MapUpdateEvent
): PlayerMapState {
  if (event.type === 'scan_event') {
    return applyMapObservation(reality, mapState, {
      observationId: event.eventId,
      week: event.week,
      type: 'scan_connection',
      source: event.source === 'system' ? 'sensor' : event.source,
      confidence: event.confidence,
      realityEdgeId: event.realityEdgeId,
    })
  }

  if (event.type === 'exploration_event') {
    return applyMapObservation(reality, mapState, {
      observationId: event.eventId,
      week: event.week,
      type: 'exploration_room',
      source: event.source === 'system' ? 'exploration' : event.source,
      confidence: event.confidence,
      realityNodeId: event.realityNodeId,
    })
  }

  if (event.type === 'contradiction_event') {
    if (event.targetMapId) {
      return applyMapObservation(reality, mapState, {
        observationId: event.eventId,
        week: event.week,
        type: 'contradiction_correction',
        source: event.source === 'system' ? 'record' : event.source,
        confidence: event.confidence,
        targetMapId: event.targetMapId,
        correctionErrorState: event.correctionErrorState,
      })
    }

    if (event.realityEdgeId) {
      const nextRouteStateByEdgeId: Record<string, RouteStateOverride> = {
        ...mapState.routeStateByEdgeId,
        [event.realityEdgeId]: {
          ...(mapState.routeStateByEdgeId[event.realityEdgeId] ?? {}),
          invalidated: true,
          confidence: clamp01(event.confidence * 0.5),
          errorState: event.correctionErrorState ?? 'contradicted',
        },
      }

      return buildVisibleState(
        reality,
        Number(mapState.packetId.split(':')[1]) || 0,
        mapState.activeLayer,
        mapState.knownRealityNodeIds,
        mapState.revealedHiddenEdgeIds,
        mapState.inferredHazards,
        nextRouteStateByEdgeId,
      )
    }

    return mapState
  }

  if (event.type === 'system_route_state_event' && event.realityEdgeId) {
    const nextRouteStateByEdgeId: Record<string, RouteStateOverride> = {
      ...mapState.routeStateByEdgeId,
      [event.realityEdgeId]: {
        ...(mapState.routeStateByEdgeId[event.realityEdgeId] ?? {}),
        doorState: event.doorState,
        invalidated: event.invalidated ?? mapState.routeStateByEdgeId[event.realityEdgeId]?.invalidated,
        confidence: clamp01(event.confidence),
        errorState:
          event.invalidated === true
            ? 'outdated'
            : mapState.routeStateByEdgeId[event.realityEdgeId]?.errorState,
      },
    }

    return buildVisibleState(
      reality,
      Number(mapState.packetId.split(':')[1]) || 0,
      mapState.activeLayer,
      mapState.knownRealityNodeIds,
      mapState.revealedHiddenEdgeIds,
      mapState.inferredHazards,
      nextRouteStateByEdgeId,
    )
  }

  return mapState
}

export function applyMapUpdateEvents(
  reality: RealityMapGraph,
  mapState: PlayerMapState,
  events: readonly MapUpdateEvent[]
): PlayerMapState {
  const ordered = [...events].sort((left, right) => {
    if (left.week !== right.week) {
      return left.week - right.week
    }

    return left.eventId.localeCompare(right.eventId)
  })

  return ordered.reduce((state, event) => applyMapUpdateEvent(reality, state, event), mapState)
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
