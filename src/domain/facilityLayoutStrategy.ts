/**
 * SPE-1026 — pure facility layout strategy and zone adjacency kernel.
 * SPE-2986 — optional authored snapshot parse/resolve on top of that kernel.
 *
 * Callers own archetype choice, room records, route kinds, and space sets.
 * Parse/hydrate stores authored ids only. This module does not project SPE-2889
 * staging, retune kernel metrics, or register week-close / UI surfaces.
 */

export const LAYOUT_ARCHETYPES = [
  'compact_headquarters',
  'distributed_campus',
  'hidden_annex',
  'remote_safehouse',
] as const
export type LayoutArchetype = (typeof LAYOUT_ARCHETYPES)[number]

export const FACILITY_ZONE_IDS = [
  'public_cover',
  'administration',
  'operations',
  'medical',
  'research',
  'storage',
  'containment',
  'deep_vault',
  'utilities',
] as const
export type FacilityZoneId = (typeof FACILITY_ZONE_IDS)[number]

export const FACILITY_ROOM_IDS = [
  'med_bay',
  'armory',
  'evidence_intake',
  'containment_cell',
  'archive',
  'command',
  'staging_closet',
  'staff_housing',
  'lounge',
  'recovery',
  'memorial',
  'briefing',
  'director_office',
  'legal',
  'finance',
  'ethics_review',
  'internal_affairs',
] as const
export type FacilityRoomId = (typeof FACILITY_ROOM_IDS)[number]

/** Critical adjacency peer for AC3 med-bay response timing. */
export const CRITICAL_ADJACENCY_ROOM_ID = 'containment_cell' as const

export const ROUTE_KINDS = ['flat_corridor', 'elevator', 'stairwell', 'vent', 'shaft'] as const
export type RouteKind = (typeof ROUTE_KINDS)[number]

export const MORALE_SPACE_IDS = [
  'staff_housing',
  'lounge',
  'recovery',
  'memorial',
  'briefing',
] as const
export type MoraleSpaceId = (typeof MORALE_SPACE_IDS)[number]

export const OVERSIGHT_SPACE_IDS = [
  'director_office',
  'legal',
  'finance',
  'ethics_review',
  'internal_affairs',
] as const
export type OversightSpaceId = (typeof OVERSIGHT_SPACE_IDS)[number]

export const CONTAINMENT_LAYOUT_MODES = ['open_porous', 'secure_clean'] as const
export type ContainmentLayoutMode = (typeof CONTAINMENT_LAYOUT_MODES)[number]

export interface LayoutArchetypeMetrics {
  readonly secrecy: number
  readonly spreadResistance: number
  readonly staffTravelTime: number
  readonly staffingEfficiency: number
  readonly capacity: number
  readonly upgradeCost: number
}

export interface RoomAdjacencyOutput {
  readonly roomId: FacilityRoomId
  readonly adjacentToCritical: boolean
  readonly responseTime: number
  readonly throughput: number
  readonly breachIsolation: 'tight' | 'loose'
  readonly efficiency: number
}

export interface RouteTraversalResult {
  readonly routeKind: RouteKind
  readonly traversalCost: number
  readonly breachSpread: number
  readonly isVertical: boolean
}

export interface StaffRosterMember {
  readonly staffId: string
  readonly retention: number
  readonly cohesion: number
}

export interface MoraleSpaceEffect {
  readonly spacesPresent: readonly MoraleSpaceId[]
  readonly retention: number
  readonly cohesion: number
}

export interface OversightSpaceEffect {
  readonly spacesPresent: readonly OversightSpaceId[]
  readonly oversight: number
  readonly auditPressure: number
}

export interface SecureContainmentTradeoff {
  readonly mode: ContainmentLayoutMode
  readonly travelTime: number
  readonly morale: number
  readonly logisticsThroughput: number
  readonly secrecy: number
}

export interface ZoneAdjacencyEdge {
  readonly fromZoneId: FacilityZoneId
  readonly toZoneId: FacilityZoneId
}

export interface LayoutDebugSummary {
  readonly archetype: LayoutArchetype
  readonly metrics: LayoutArchetypeMetrics
  readonly zoneCount: number
  readonly keyAdjacencies: readonly ZoneAdjacencyEdge[]
  readonly routeBurdens: readonly RouteTraversalResult[]
}

const ARCHETYPE_METRICS: Record<LayoutArchetype, LayoutArchetypeMetrics> = Object.freeze({
  compact_headquarters: Object.freeze({
    secrecy: 40,
    spreadResistance: 35,
    staffTravelTime: 20,
    staffingEfficiency: 80,
    capacity: 50,
    upgradeCost: 30,
  }),
  distributed_campus: Object.freeze({
    secrecy: 30,
    spreadResistance: 45,
    staffTravelTime: 55,
    staffingEfficiency: 55,
    capacity: 90,
    upgradeCost: 70,
  }),
  hidden_annex: Object.freeze({
    secrecy: 85,
    spreadResistance: 70,
    staffTravelTime: 65,
    staffingEfficiency: 45,
    capacity: 35,
    upgradeCost: 55,
  }),
  remote_safehouse: Object.freeze({
    secrecy: 75,
    spreadResistance: 80,
    staffTravelTime: 85,
    staffingEfficiency: 35,
    capacity: 25,
    upgradeCost: 40,
  }),
})

const ROUTE_TRAVERSAL: Record<RouteKind, Omit<RouteTraversalResult, 'routeKind'>> = Object.freeze({
  flat_corridor: Object.freeze({ traversalCost: 10, breachSpread: 40, isVertical: false }),
  elevator: Object.freeze({ traversalCost: 25, breachSpread: 20, isVertical: true }),
  stairwell: Object.freeze({ traversalCost: 30, breachSpread: 35, isVertical: true }),
  vent: Object.freeze({ traversalCost: 35, breachSpread: 70, isVertical: true }),
  shaft: Object.freeze({ traversalCost: 40, breachSpread: 80, isVertical: true }),
})

const SECURE_TRADEOFF: Record<
  ContainmentLayoutMode,
  Omit<SecureContainmentTradeoff, 'mode'>
> = Object.freeze({
  open_porous: Object.freeze({
    travelTime: 25,
    morale: 70,
    logisticsThroughput: 80,
    secrecy: 30,
  }),
  secure_clean: Object.freeze({
    travelTime: 60,
    morale: 40,
    logisticsThroughput: 45,
    secrecy: 85,
  }),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isLayoutArchetype(value: unknown): value is LayoutArchetype {
  return LAYOUT_ARCHETYPES.some((archetype) => archetype === value)
}

export function isFacilityZoneId(value: unknown): value is FacilityZoneId {
  return FACILITY_ZONE_IDS.some((zoneId) => zoneId === value)
}

export function isFacilityRoomId(value: unknown): value is FacilityRoomId {
  return FACILITY_ROOM_IDS.some((roomId) => roomId === value)
}

export function isRouteKind(value: unknown): value is RouteKind {
  return ROUTE_KINDS.some((routeKind) => routeKind === value)
}

export function isMoraleSpaceId(value: unknown): value is MoraleSpaceId {
  return MORALE_SPACE_IDS.some((spaceId) => spaceId === value)
}

export function isOversightSpaceId(value: unknown): value is OversightSpaceId {
  return OVERSIGHT_SPACE_IDS.some((spaceId) => spaceId === value)
}

export function isContainmentLayoutMode(value: unknown): value is ContainmentLayoutMode {
  return CONTAINMENT_LAYOUT_MODES.some((mode) => mode === value)
}

/**
 * Resolve configured doctrine metrics for one layout archetype.
 * Unknown / malformed archetypes fail-close to undefined.
 */
export function resolveLayoutArchetypeMetrics(
  archetype: unknown
): LayoutArchetypeMetrics | undefined {
  if (!isLayoutArchetype(archetype)) return undefined
  return ARCHETYPE_METRICS[archetype]
}

/**
 * Compare two archetypes for secrecy/travel and capacity/upgrade tradeoffs.
 * Returns undefined when either side is unknown.
 */
export function compareLayoutArchetypes(
  left: unknown,
  right: unknown
):
  | {
      left: LayoutArchetype
      right: LayoutArchetype
      leftMetrics: LayoutArchetypeMetrics
      rightMetrics: LayoutArchetypeMetrics
      secrecyDelta: number
      spreadResistanceDelta: number
      staffTravelTimeDelta: number
      staffingEfficiencyDelta: number
      capacityDelta: number
      upgradeCostDelta: number
    }
  | undefined {
  if (!isLayoutArchetype(left) || !isLayoutArchetype(right)) return undefined
  const leftMetrics = ARCHETYPE_METRICS[left]
  const rightMetrics = ARCHETYPE_METRICS[right]
  return Object.freeze({
    left,
    right,
    leftMetrics,
    rightMetrics,
    secrecyDelta: leftMetrics.secrecy - rightMetrics.secrecy,
    spreadResistanceDelta: leftMetrics.spreadResistance - rightMetrics.spreadResistance,
    staffTravelTimeDelta: leftMetrics.staffTravelTime - rightMetrics.staffTravelTime,
    staffingEfficiencyDelta: leftMetrics.staffingEfficiency - rightMetrics.staffingEfficiency,
    capacityDelta: leftMetrics.capacity - rightMetrics.capacity,
    upgradeCostDelta: leftMetrics.upgradeCost - rightMetrics.upgradeCost,
  })
}

/**
 * Med bay (and other rooms) produce different outputs when adjacent to the
 * critical containment cell versus not adjacent.
 */
export function resolveRoomAdjacencyOutput(
  roomId: unknown,
  adjacentToCritical: unknown
): RoomAdjacencyOutput | undefined {
  if (!isFacilityRoomId(roomId)) return undefined
  const adjacent = adjacentToCritical === true
  if (roomId === 'med_bay') {
    return Object.freeze({
      roomId,
      adjacentToCritical: adjacent,
      responseTime: adjacent ? 15 : 45,
      throughput: adjacent ? 70 : 40,
      breachIsolation: adjacent ? 'tight' : 'loose',
      efficiency: adjacent ? 80 : 50,
    })
  }
  return Object.freeze({
    roomId,
    adjacentToCritical: adjacent,
    responseTime: adjacent ? 20 : 30,
    throughput: adjacent ? 60 : 50,
    breachIsolation: adjacent ? 'tight' : 'loose',
    efficiency: adjacent ? 65 : 55,
  })
}

/**
 * Resolve traversal cost and breach-spread for flat vs vertical route kinds.
 */
export function resolveRouteTraversal(routeKind: unknown): RouteTraversalResult | undefined {
  if (!isRouteKind(routeKind)) return undefined
  const base = ROUTE_TRAVERSAL[routeKind]
  return Object.freeze({
    routeKind,
    traversalCost: base.traversalCost,
    breachSpread: base.breachSpread,
    isVertical: base.isVertical,
  })
}

function sanitizeMoraleSpaces(spaces: unknown): MoraleSpaceId[] {
  if (!Array.isArray(spaces)) return []
  const seen = new Set<MoraleSpaceId>()
  const next: MoraleSpaceId[] = []
  for (const spaceId of MORALE_SPACE_IDS) {
    if (!spaces.includes(spaceId)) continue
    if (seen.has(spaceId)) continue
    seen.add(spaceId)
    next.push(spaceId)
  }
  return next
}

function averageRosterAxis(
  roster: unknown,
  axis: 'retention' | 'cohesion',
  fallback: number
): number {
  if (!Array.isArray(roster) || roster.length === 0) return fallback
  let sum = 0
  let count = 0
  for (const member of roster) {
    if (!isRecord(member)) continue
    const value = member[axis]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    sum += value
    count += 1
  }
  return count === 0 ? fallback : Math.round(sum / count)
}

/**
 * Morale-support spaces raise retention/cohesion for the same staff roster.
 * Before (no spaces) uses roster averages; after adds a deterministic bump
 * per present authored space (capped).
 */
export function resolveMoraleSpaceEffect(spaces: unknown, roster: unknown): MoraleSpaceEffect {
  const spacesPresent = Object.freeze(sanitizeMoraleSpaces(spaces))
  const baseRetention = averageRosterAxis(roster, 'retention', 50)
  const baseCohesion = averageRosterAxis(roster, 'cohesion', 50)
  const bump = spacesPresent.length * 8
  return Object.freeze({
    spacesPresent,
    retention: Math.min(100, baseRetention + bump),
    cohesion: Math.min(100, baseCohesion + bump),
  })
}

function sanitizeOversightSpaces(spaces: unknown): OversightSpaceId[] {
  if (!Array.isArray(spaces)) return []
  const seen = new Set<OversightSpaceId>()
  const next: OversightSpaceId[] = []
  for (const spaceId of OVERSIGHT_SPACE_IDS) {
    if (!spaces.includes(spaceId)) continue
    if (seen.has(spaceId)) continue
    seen.add(spaceId)
    next.push(spaceId)
  }
  return next
}

/**
 * Leadership/admin spaces raise oversight and audit-pressure when present.
 * Empty/malformed space lists keep baseline pressure.
 */
export function resolveOversightSpaceEffect(spaces: unknown): OversightSpaceEffect {
  const spacesPresent = Object.freeze(sanitizeOversightSpaces(spaces))
  const bump = spacesPresent.length * 12
  return Object.freeze({
    spacesPresent,
    oversight: Math.min(100, 20 + bump),
    auditPressure: Math.min(100, 15 + bump),
  })
}

/**
 * Secure/clean containment raises secrecy while imposing travel, morale, or
 * logistics-throughput cost versus the open/porous equivalent.
 */
export function resolveSecureContainmentTradeoff(
  mode: unknown
): SecureContainmentTradeoff | undefined {
  if (!isContainmentLayoutMode(mode)) return undefined
  const base = SECURE_TRADEOFF[mode]
  return Object.freeze({
    mode,
    travelTime: base.travelTime,
    morale: base.morale,
    logisticsThroughput: base.logisticsThroughput,
    secrecy: base.secrecy,
  })
}

/**
 * Normalize zone adjacency edges: unknown zones drop; undirected pairs sorted
 * by zone id for deterministic planning/debug output.
 */
export function normalizeZoneAdjacencies(edges: unknown): readonly ZoneAdjacencyEdge[] {
  if (!Array.isArray(edges)) return Object.freeze([])
  const keys = new Set<string>()
  const next: ZoneAdjacencyEdge[] = []
  for (const edge of edges) {
    if (!isRecord(edge)) continue
    if (!isFacilityZoneId(edge.fromZoneId) || !isFacilityZoneId(edge.toZoneId)) continue
    if (edge.fromZoneId === edge.toZoneId) continue
    const [a, b] =
      edge.fromZoneId < edge.toZoneId
        ? [edge.fromZoneId, edge.toZoneId]
        : [edge.toZoneId, edge.fromZoneId]
    const key = `${a}|${b}`
    if (keys.has(key)) continue
    keys.add(key)
    next.push(Object.freeze({ fromZoneId: a, toZoneId: b }))
  }
  next.sort((left, right) => {
    if (left.fromZoneId !== right.fromZoneId) {
      return left.fromZoneId < right.fromZoneId ? -1 : 1
    }
    return left.toZoneId < right.toZoneId ? -1 : left.toZoneId > right.toZoneId ? 1 : 0
  })
  return Object.freeze(next)
}

/**
 * Compact planning/debug summary: archetype metrics, zone count, key
 * adjacencies, and route burdens for listed route kinds.
 */
export function summarizeLayoutForDebug(input: unknown): LayoutDebugSummary | undefined {
  if (!isRecord(input)) return undefined
  if (!isLayoutArchetype(input.archetype)) return undefined
  const metrics = ARCHETYPE_METRICS[input.archetype]
  const zones = Array.isArray(input.zones)
    ? FACILITY_ZONE_IDS.filter((zoneId) => input.zones.includes(zoneId))
    : []
  const keyAdjacencies = normalizeZoneAdjacencies(input.adjacencies)
  const routeKinds = Array.isArray(input.routeKinds)
    ? ROUTE_KINDS.filter((routeKind) => input.routeKinds.includes(routeKind))
    : []
  const routeBurdens = Object.freeze(
    routeKinds.map((routeKind) => resolveRouteTraversal(routeKind)!).filter(Boolean)
  )
  return Object.freeze({
    archetype: input.archetype,
    metrics,
    zoneCount: zones.length,
    keyAdjacencies,
    routeBurdens,
  })
}

export interface FacilityLayoutRoomRecord {
  readonly roomId: FacilityRoomId
  readonly adjacentToCritical: boolean
}

/**
 * Authored layout snapshot. Metrics are not stored; resolve them with the kernel.
 * Absent archetype or containment mode means that field was omitted or rejected.
 */
export interface FacilityLayoutSnapshot {
  readonly archetype?: LayoutArchetype
  readonly zoneAdjacencies: readonly ZoneAdjacencyEdge[]
  readonly moraleSpaces: readonly MoraleSpaceId[]
  readonly oversightSpaces: readonly OversightSpaceId[]
  readonly rooms: readonly FacilityLayoutRoomRecord[]
  readonly containmentMode?: ContainmentLayoutMode
}

export interface ResolvedFacilityLayoutSnapshot {
  readonly archetypeMetrics: LayoutArchetypeMetrics | undefined
  readonly zoneAdjacencies: readonly ZoneAdjacencyEdge[]
  readonly morale: MoraleSpaceEffect
  readonly oversight: OversightSpaceEffect
  readonly containment: SecureContainmentTradeoff | undefined
  readonly rooms: readonly RoomAdjacencyOutput[]
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function parseCatalogIds<T extends string>(
  value: unknown,
  catalog: readonly T[],
  isId: (candidate: unknown) => candidate is T
): readonly T[] {
  if (!Array.isArray(value)) return Object.freeze([])
  const present = new Set<T>()
  for (const entry of value) {
    if (!isId(entry)) continue
    present.add(entry)
  }
  return Object.freeze(catalog.filter((id) => present.has(id)))
}

function parseZoneAdjacencies(value: unknown): readonly ZoneAdjacencyEdge[] {
  if (!Array.isArray(value)) return Object.freeze([])
  const ownEdges: Array<{ fromZoneId: unknown; toZoneId: unknown }> = []
  for (const edge of value) {
    if (!isRecord(edge)) continue
    if (!hasOwn(edge, 'fromZoneId') || !hasOwn(edge, 'toZoneId')) continue
    ownEdges.push({ fromZoneId: edge.fromZoneId, toZoneId: edge.toZoneId })
  }
  return normalizeZoneAdjacencies(ownEdges)
}

function parseRoomRecords(value: unknown): readonly FacilityLayoutRoomRecord[] {
  if (!Array.isArray(value)) return Object.freeze([])
  const chosen = new Map<FacilityRoomId, boolean>()
  for (const entry of value) {
    if (!isRecord(entry)) continue
    if (!hasOwn(entry, 'roomId') || !hasOwn(entry, 'adjacentToCritical')) continue
    if (!isFacilityRoomId(entry.roomId)) continue
    if (typeof entry.adjacentToCritical !== 'boolean') continue
    if (chosen.has(entry.roomId)) continue
    chosen.set(entry.roomId, entry.adjacentToCritical)
  }
  const next: FacilityLayoutRoomRecord[] = []
  for (const roomId of FACILITY_ROOM_IDS) {
    if (!chosen.has(roomId)) continue
    const adjacentToCritical = chosen.get(roomId)
    if (adjacentToCritical === undefined) continue
    next.push(Object.freeze({ roomId, adjacentToCritical }))
  }
  return Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityLayoutSnapshot`.
 * Omit / non-record / empty after rejection → undefined (baseline).
 * Unknown ids drop. Valid authored archetype, edges, and space sets are kept.
 * Does not coerce a malformed boolean or substitute a guessed id.
 */
export function parseFacilityLayoutSnapshot(value: unknown): FacilityLayoutSnapshot | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const archetype =
    hasOwn(value, 'archetype') && isLayoutArchetype(value.archetype) ? value.archetype : undefined
  const containmentMode =
    hasOwn(value, 'containmentMode') && isContainmentLayoutMode(value.containmentMode)
      ? value.containmentMode
      : undefined
  const zoneAdjacencies = hasOwn(value, 'zoneAdjacencies')
    ? parseZoneAdjacencies(value.zoneAdjacencies)
    : Object.freeze([])
  const moraleSpaces = hasOwn(value, 'moraleSpaces')
    ? parseCatalogIds(value.moraleSpaces, MORALE_SPACE_IDS, isMoraleSpaceId)
    : Object.freeze([])
  const oversightSpaces = hasOwn(value, 'oversightSpaces')
    ? parseCatalogIds(value.oversightSpaces, OVERSIGHT_SPACE_IDS, isOversightSpaceId)
    : Object.freeze([])
  const rooms = hasOwn(value, 'rooms') ? parseRoomRecords(value.rooms) : Object.freeze([])

  if (
    archetype === undefined &&
    containmentMode === undefined &&
    zoneAdjacencies.length === 0 &&
    moraleSpaces.length === 0 &&
    oversightSpaces.length === 0 &&
    rooms.length === 0
  ) {
    return undefined
  }

  return Object.freeze({
    ...(archetype !== undefined ? { archetype } : {}),
    zoneAdjacencies,
    moraleSpaces,
    oversightSpaces,
    rooms,
    ...(containmentMode !== undefined ? { containmentMode } : {}),
  })
}

/**
 * Resolve a persisted snapshot with the SPE-1026 helpers.
 * Undefined snapshot uses the same empty inputs as a direct kernel call.
 */
export function resolveFacilityLayoutSnapshot(
  snapshot: FacilityLayoutSnapshot | undefined,
  roster: unknown = undefined
): ResolvedFacilityLayoutSnapshot {
  const zoneAdjacencies = snapshot?.zoneAdjacencies ?? []
  const moraleSpaces = snapshot?.moraleSpaces ?? []
  const oversightSpaces = snapshot?.oversightSpaces ?? []
  const rooms = snapshot?.rooms ?? []
  const resolvedRooms: RoomAdjacencyOutput[] = []
  for (const room of rooms) {
    const output = resolveRoomAdjacencyOutput(room.roomId, room.adjacentToCritical)
    if (output === undefined) continue
    resolvedRooms.push(output)
  }
  return Object.freeze({
    archetypeMetrics: resolveLayoutArchetypeMetrics(snapshot?.archetype),
    zoneAdjacencies: normalizeZoneAdjacencies(zoneAdjacencies),
    morale: resolveMoraleSpaceEffect(moraleSpaces, roster),
    oversight: resolveOversightSpaceEffect(oversightSpaces),
    containment: resolveSecureContainmentTradeoff(snapshot?.containmentMode),
    rooms: Object.freeze(resolvedRooms),
  })
}
