/**
 * SPE-2932 — immutable facility section graph and placement kernel.
 *
 * One production read path for spatial nodes, direct spatial adjacency, and
 * department / staging-location placement. This module does not persist
 * GameState, project workshop adjacent/remote staging, or record SPE-792
 * dependency edges.
 */

import {
  FACILITY_ROOM_IDS,
  FACILITY_ZONE_IDS,
  type FacilityRoomId,
  type FacilityZoneId,
} from './facilityLayoutStrategy'

export const FACILITY_SECTION_NODE_CLASSES = ['zone', 'section', 'room'] as const
export type FacilitySectionNodeClass = (typeof FACILITY_SECTION_NODE_CLASSES)[number]

export const FACILITY_SECTION_IDS = ['clinical'] as const
export type FacilitySectionId = (typeof FACILITY_SECTION_IDS)[number]

/** Spatial staging places. Not workshop staging conditions. */
export const FACILITY_STAGING_LOCATION_IDS = ['clinical_hold'] as const
export type FacilityStagingLocationId = (typeof FACILITY_STAGING_LOCATION_IDS)[number]

export const FACILITY_PLACEMENT_DEPARTMENT_IDS = [
  'department:biohazard-response',
  'department:concept-embodiment-research',
  'department:emergency-response',
  'department:ethics-review',
  'department:field-containment',
  'department:general-intake',
  'department:procurement-logistics',
  'department:records-analysis',
] as const
export type FacilityPlacementDepartmentId = (typeof FACILITY_PLACEMENT_DEPARTMENT_IDS)[number]

export const FACILITY_PLACEMENT_KINDS = ['department', 'staging_location'] as const
export type FacilityPlacementKind = (typeof FACILITY_PLACEMENT_KINDS)[number]

/** Spatial edges only. Distinct from SPE-792 dependency edges. */
export const SPATIAL_ADJACENCY_EDGE_CLASS = 'spatial_adjacency' as const

export const FACILITY_SECTION_GRAPH_REJECTIONS = [
  'malformed',
  'duplicate_node',
  'dangling_edge',
  'unknown_placement',
] as const
export type FacilitySectionGraphRejection = (typeof FACILITY_SECTION_GRAPH_REJECTIONS)[number]

export interface FacilitySpatialNode {
  readonly id: string
  readonly classification: FacilitySectionNodeClass
  readonly catalogId: FacilityZoneId | FacilitySectionId | FacilityRoomId
}

export interface FacilitySpatialAdjacencyEdge {
  readonly edgeClass: typeof SPATIAL_ADJACENCY_EDGE_CLASS
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface FacilitySpatialPlacement {
  readonly placementKind: FacilityPlacementKind
  readonly placementId: string
  readonly nodeId: string
}

export interface FacilitySectionGraph {
  readonly nodes: readonly FacilitySpatialNode[]
  readonly edges: readonly FacilitySpatialAdjacencyEdge[]
  readonly placements: readonly FacilitySpatialPlacement[]
}

export interface FacilityPlacementLookup {
  readonly placementKind: FacilityPlacementKind
  readonly placementId: string
  readonly node: FacilitySpatialNode
}

export type FacilitySectionGraphValidation =
  | { readonly ok: true; readonly graph: FacilitySectionGraph }
  | { readonly ok: false; readonly rejection: FacilitySectionGraphRejection }

const graphBrand: unique symbol = Symbol('FacilitySectionGraph')

interface BrandedFacilitySectionGraph extends FacilitySectionGraph {
  readonly [graphBrand]: true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isNodeClass(value: unknown): value is FacilitySectionNodeClass {
  return FACILITY_SECTION_NODE_CLASSES.some((classification) => classification === value)
}

function isSectionId(value: unknown): value is FacilitySectionId {
  return FACILITY_SECTION_IDS.some((sectionId) => sectionId === value)
}

function isZoneId(value: unknown): value is FacilityZoneId {
  return FACILITY_ZONE_IDS.some((zoneId) => zoneId === value)
}

function isRoomId(value: unknown): value is FacilityRoomId {
  return FACILITY_ROOM_IDS.some((roomId) => roomId === value)
}

function isPlacementDepartmentId(value: unknown): value is FacilityPlacementDepartmentId {
  return FACILITY_PLACEMENT_DEPARTMENT_IDS.some((departmentId) => departmentId === value)
}

function isStagingLocationId(value: unknown): value is FacilityStagingLocationId {
  return FACILITY_STAGING_LOCATION_IDS.some((locationId) => locationId === value)
}

export function facilityZoneNodeId(zoneId: FacilityZoneId): string {
  return `zone:${zoneId}`
}

export function facilitySectionNodeId(sectionId: FacilitySectionId): string {
  return `section:${sectionId}`
}

export function facilityRoomNodeId(roomId: FacilityRoomId): string {
  return `room:${roomId}`
}

function catalogNode(
  classification: FacilitySectionNodeClass,
  catalogId: string
): FacilitySpatialNode | undefined {
  if (classification === 'zone' && isZoneId(catalogId)) {
    return Object.freeze({
      id: facilityZoneNodeId(catalogId),
      classification,
      catalogId,
    })
  }
  if (classification === 'section' && isSectionId(catalogId)) {
    return Object.freeze({
      id: facilitySectionNodeId(catalogId),
      classification,
      catalogId,
    })
  }
  if (classification === 'room' && isRoomId(catalogId)) {
    return Object.freeze({
      id: facilityRoomNodeId(catalogId),
      classification,
      catalogId,
    })
  }
  return undefined
}

function parseNode(value: unknown): FacilitySpatialNode | 'malformed' {
  if (!isRecord(value)) return 'malformed'
  if (!hasOwn(value, 'id') || !hasOwn(value, 'classification')) return 'malformed'
  if (typeof value.id !== 'string' || !isNodeClass(value.classification)) return 'malformed'
  const separator = value.id.indexOf(':')
  if (separator <= 0) return 'malformed'
  const prefix = value.id.slice(0, separator)
  const catalogId = value.id.slice(separator + 1)
  if (prefix !== value.classification || catalogId.length === 0) return 'malformed'
  const node = catalogNode(value.classification, catalogId)
  if (!node || node.id !== value.id) return 'malformed'
  return node
}

function parseEdge(
  value: unknown
): { readonly fromNodeId: string; readonly toNodeId: string } | 'malformed' {
  if (!isRecord(value)) return 'malformed'
  if (!hasOwn(value, 'fromNodeId') || !hasOwn(value, 'toNodeId')) return 'malformed'
  if (typeof value.fromNodeId !== 'string' || typeof value.toNodeId !== 'string') {
    return 'malformed'
  }
  if (hasOwn(value, 'edgeClass') && value.edgeClass !== SPATIAL_ADJACENCY_EDGE_CLASS) {
    return 'malformed'
  }
  if (value.fromNodeId.length === 0 || value.toNodeId.length === 0) return 'malformed'
  if (value.fromNodeId === value.toNodeId) return 'malformed'
  return { fromNodeId: value.fromNodeId, toNodeId: value.toNodeId }
}

function parsePlacement(
  value: unknown
): FacilitySpatialPlacement | 'malformed' | 'unknown_placement' {
  if (!isRecord(value)) return 'malformed'
  if (
    !hasOwn(value, 'placementKind') ||
    !hasOwn(value, 'placementId') ||
    !hasOwn(value, 'nodeId')
  ) {
    return 'malformed'
  }
  if (value.placementKind !== 'department' && value.placementKind !== 'staging_location') {
    return 'unknown_placement'
  }
  if (typeof value.placementId !== 'string' || typeof value.nodeId !== 'string') {
    return 'malformed'
  }
  if (value.placementKind === 'department' && !isPlacementDepartmentId(value.placementId)) {
    return 'unknown_placement'
  }
  if (value.placementKind === 'staging_location' && !isStagingLocationId(value.placementId)) {
    return 'unknown_placement'
  }
  if (value.nodeId.length === 0) return 'malformed'
  return Object.freeze({
    placementKind: value.placementKind,
    placementId: value.placementId,
    nodeId: value.nodeId,
  })
}

function reject(rejection: FacilitySectionGraphRejection): FacilitySectionGraphValidation {
  return Object.freeze({ ok: false, rejection })
}

/**
 * Validate and normalize authored topology.
 * Equivalent graphs match after normalization regardless of insertion order.
 * Duplicate nodes, dangling endpoints, unknown placements, and malformed
 * payloads reject the whole graph so no edge can grant adjacency.
 */
export function validateFacilitySectionTopology(value: unknown): FacilitySectionGraphValidation {
  if (!isRecord(value)) return reject('malformed')
  if (!hasOwn(value, 'nodes') || !hasOwn(value, 'edges') || !hasOwn(value, 'placements')) {
    return reject('malformed')
  }
  if (
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    !Array.isArray(value.placements)
  ) {
    return reject('malformed')
  }

  const nodesById = new Map<string, FacilitySpatialNode>()
  for (const entry of value.nodes) {
    const node = parseNode(entry)
    if (node === 'malformed') return reject('malformed')
    if (nodesById.has(node.id)) return reject('duplicate_node')
    nodesById.set(node.id, node)
  }

  const edgeKeys = new Set<string>()
  const edges: FacilitySpatialAdjacencyEdge[] = []
  for (const entry of value.edges) {
    const edge = parseEdge(entry)
    if (edge === 'malformed') return reject('malformed')
    if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) {
      return reject('dangling_edge')
    }
    const [fromNodeId, toNodeId] =
      edge.fromNodeId < edge.toNodeId
        ? [edge.fromNodeId, edge.toNodeId]
        : [edge.toNodeId, edge.fromNodeId]
    const key = `${fromNodeId}|${toNodeId}`
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)
    edges.push(
      Object.freeze({
        edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
        fromNodeId,
        toNodeId,
      })
    )
  }

  const placementKeys = new Set<string>()
  const placements: FacilitySpatialPlacement[] = []
  for (const entry of value.placements) {
    const placement = parsePlacement(entry)
    if (placement === 'malformed') return reject('malformed')
    if (placement === 'unknown_placement') return reject('unknown_placement')
    if (!nodesById.has(placement.nodeId)) return reject('unknown_placement')
    const key = `${placement.placementKind}|${placement.placementId}`
    if (placementKeys.has(key)) {
      const prior = placements.find(
        (candidate) =>
          candidate.placementKind === placement.placementKind &&
          candidate.placementId === placement.placementId
      )
      if (prior && prior.nodeId !== placement.nodeId) return reject('unknown_placement')
      continue
    }
    placementKeys.add(key)
    placements.push(placement)
  }

  const nodes = [...nodesById.values()].sort((left, right) => compareCodeUnit(left.id, right.id))
  edges.sort((left, right) => {
    const from = compareCodeUnit(left.fromNodeId, right.fromNodeId)
    if (from !== 0) return from
    return compareCodeUnit(left.toNodeId, right.toNodeId)
  })
  placements.sort((left, right) => {
    const kind = compareCodeUnit(left.placementKind, right.placementKind)
    if (kind !== 0) return kind
    return compareCodeUnit(left.placementId, right.placementId)
  })

  const graph: BrandedFacilitySectionGraph = Object.freeze({
    [graphBrand]: true as const,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    placements: Object.freeze(placements),
  })
  return Object.freeze({ ok: true, graph })
}

export function normalizeFacilitySectionTopology(value: unknown): FacilitySectionGraph | undefined {
  const validated = validateFacilitySectionTopology(value)
  return validated.ok ? validated.graph : undefined
}

function isValidatedGraph(
  value: FacilitySectionGraph | undefined
): value is BrandedFacilitySectionGraph {
  return value !== undefined && (value as BrandedFacilitySectionGraph)[graphBrand] === true
}

/**
 * Minimum production facility. Immutable authored config, not GameState.
 * Workshop staging is not classified adjacent or remote.
 */
export const PRODUCTION_FACILITY_SECTION_TOPOLOGY = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({ id: 'room:containment_cell', classification: 'room' as const }),
    Object.freeze({ id: 'zone:medical', classification: 'zone' as const }),
    Object.freeze({ id: 'section:clinical', classification: 'section' as const }),
    Object.freeze({ id: 'room:med_bay', classification: 'room' as const }),
  ]),
  edges: Object.freeze([
    Object.freeze({ fromNodeId: 'room:containment_cell', toNodeId: 'room:med_bay' }),
    Object.freeze({ fromNodeId: 'section:clinical', toNodeId: 'zone:medical' }),
    Object.freeze({ fromNodeId: 'room:med_bay', toNodeId: 'section:clinical' }),
  ]),
  placements: Object.freeze([
    Object.freeze({
      placementKind: 'staging_location' as const,
      placementId: 'clinical_hold',
      nodeId: 'section:clinical',
    }),
    Object.freeze({
      placementKind: 'department' as const,
      placementId: 'department:emergency-response',
      nodeId: 'room:med_bay',
    }),
  ]),
})

/** Production-authoritative spatial read path for later SPE-2913 consumption. */
export function readProductionFacilitySectionGraph(): FacilitySectionGraph {
  const graph = normalizeFacilitySectionTopology(PRODUCTION_FACILITY_SECTION_TOPOLOGY)
  if (!graph) {
    throw new Error('SPE-2932 production facility section graph failed validation')
  }
  return graph
}

export function lookupSpatialNode(
  graph: FacilitySectionGraph | undefined,
  nodeId: unknown
): FacilitySpatialNode | undefined {
  if (!isValidatedGraph(graph) || typeof nodeId !== 'string') return undefined
  return graph.nodes.find((node) => node.id === nodeId)
}

/** Direct spatial adjacency. Rejected topology and unknown nodes are not adjacent. */
export function queryDirectSpatialAdjacency(
  graph: FacilitySectionGraph | undefined,
  leftNodeId: unknown,
  rightNodeId: unknown
): boolean {
  if (!isValidatedGraph(graph)) return false
  if (typeof leftNodeId !== 'string' || typeof rightNodeId !== 'string') return false
  if (leftNodeId === rightNodeId) return false
  const [fromNodeId, toNodeId] =
    leftNodeId < rightNodeId ? [leftNodeId, rightNodeId] : [rightNodeId, leftNodeId]
  return graph.edges.some((edge) => edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId)
}

function lookupPlacement(
  graph: FacilitySectionGraph | undefined,
  placementKind: FacilityPlacementKind,
  placementId: unknown
): FacilityPlacementLookup | undefined {
  if (!isValidatedGraph(graph) || typeof placementId !== 'string') return undefined
  const placement = graph.placements.find(
    (candidate) =>
      candidate.placementKind === placementKind && candidate.placementId === placementId
  )
  if (!placement) return undefined
  const node = lookupSpatialNode(graph, placement.nodeId)
  if (!node) return undefined
  return Object.freeze({
    placementKind: placement.placementKind,
    placementId: placement.placementId,
    node,
  })
}

export function lookupDepartmentPlacement(
  graph: FacilitySectionGraph | undefined,
  departmentId: unknown
): FacilityPlacementLookup | undefined {
  return lookupPlacement(graph, 'department', departmentId)
}

export function lookupStagingLocationPlacement(
  graph: FacilitySectionGraph | undefined,
  stagingLocationId: unknown
): FacilityPlacementLookup | undefined {
  return lookupPlacement(graph, 'staging_location', stagingLocationId)
}
