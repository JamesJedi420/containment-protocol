/**
 * SPE-408 — persistent area shapes and hazard surfaces.
 *
 * Pure caller-owned shape packets: cloud/wall/sphere/field families with
 * layered hazard effects, dwell-time escalation, and surfaceAdjacency
 * conduit routing distinct from SPE-807 zone contamination. Supports
 * deterministic mobile-anchor footprint relocation without duplicate
 * exposure. No GameState field. No volumetric physics simulator.
 */

export const PERSISTENT_AREA_SHAPES_OWNER = 'SPE-408' as const

export type AreaShapeFamily = 'cloud' | 'wall' | 'sphere' | 'field'

export type HazardLayerEffect =
  | 'vision_denial'
  | 'movement_denial'
  | 'burning'
  | 'freezing'
  | 'charge'
  | 'selective_barrier'

export type ConduitProfile = 'volume_fill' | 'surfaceAdjacency'

export interface SurfaceNode {
  readonly surfaceId: string
  readonly adjacentSurfaceIds: readonly string[]
}

export interface PersistentAreaShape {
  readonly shapeId: string
  readonly family: AreaShapeFamily
  readonly conduit: ConduitProfile
  readonly layers: readonly HazardLayerEffect[]
  readonly dwellTicksToEscalate: number
  readonly anchorLocationId: string
  readonly active: boolean
}

export interface ContactObservation {
  readonly locationId: string
  readonly dwellTicks: number
  readonly contactingSurfaceId?: string
}

export interface PersistentAreaEvaluation {
  readonly shapeId: string
  readonly family: AreaShapeFamily
  readonly activeLayers: readonly HazardLayerEffect[]
  readonly escalated: boolean
  readonly affectedLocationIds: readonly string[]
  readonly surfaceRoutedIds: readonly string[]
  readonly reasons: readonly string[]
}

const SHAPE_FAMILIES: readonly AreaShapeFamily[] = ['cloud', 'wall', 'sphere', 'field']
const LAYERS: readonly HazardLayerEffect[] = [
  'vision_denial',
  'movement_denial',
  'burning',
  'freezing',
  'charge',
  'selective_barrier',
]
const CONDUITS: readonly ConduitProfile[] = ['volume_fill', 'surfaceAdjacency']

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`persistent area shape ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requirePositiveInt(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(`persistent area shape ${label} must be an integer >= 1`)
  }
  return value
}

function requireFamily(value: string): AreaShapeFamily {
  if ((SHAPE_FAMILIES as readonly string[]).includes(value)) return value as AreaShapeFamily
  throw new Error('persistent area shape family is invalid')
}

function requireConduit(value: string): ConduitProfile {
  if ((CONDUITS as readonly string[]).includes(value)) return value as ConduitProfile
  throw new Error('persistent area shape conduit is invalid')
}

function requireLayer(value: string): HazardLayerEffect {
  if ((LAYERS as readonly string[]).includes(value)) return value as HazardLayerEffect
  throw new Error('persistent area shape layer is invalid')
}

/**
 * Operational defaults differ by family under one reusable model.
 * Clouds fill volume; walls prefer surface adjacency.
 */
export function defaultConduitForFamily(family: AreaShapeFamily): ConduitProfile {
  switch (family) {
    case 'cloud':
    case 'sphere':
    case 'field':
      return 'volume_fill'
    case 'wall':
      return 'surfaceAdjacency'
    default: {
      const _exhaustive: never = family
      throw new Error(`persistent area shape unexpected family: ${_exhaustive}`)
    }
  }
}

/**
 * Fail-closed create for one persistent area shape.
 */
export function createPersistentAreaShape(input: PersistentAreaShape): PersistentAreaShape {
  const family = requireFamily(input.family)
  const conduit = requireConduit(input.conduit)
  // Preserve authored order so pre-escalation exposes the first authored layer.
  const layers: HazardLayerEffect[] = []
  const seen = new Set<HazardLayerEffect>()
  for (const layer of (input.layers ?? []).map(requireLayer)) {
    if (seen.has(layer)) continue
    seen.add(layer)
    layers.push(layer)
  }
  if (layers.length === 0) {
    throw new Error('persistent area shape requires at least one hazard layer')
  }
  return Object.freeze({
    shapeId: requireNonEmpty(input.shapeId, 'shapeId'),
    family,
    conduit,
    layers: Object.freeze(layers),
    dwellTicksToEscalate: requirePositiveInt(input.dwellTicksToEscalate, 'dwellTicksToEscalate'),
    anchorLocationId: requireNonEmpty(input.anchorLocationId, 'anchorLocationId'),
    active: Boolean(input.active),
  })
}

/**
 * Route along contiguous built surfaces without treating a whole zone as infected.
 */
export function routeSurfaceAdjacency(args: {
  readonly originSurfaceId: string
  readonly surfaces: readonly SurfaceNode[]
  readonly maxHops: number
}): readonly string[] {
  const originSurfaceId = requireNonEmpty(args.originSurfaceId, 'originSurfaceId')
  const maxHops = requirePositiveInt(args.maxHops, 'maxHops')
  const byId = new Map<string, SurfaceNode>()
  for (const node of args.surfaces ?? []) {
    const surfaceId = requireNonEmpty(node.surfaceId, 'surfaceId')
    if (byId.has(surfaceId)) {
      throw new Error(`persistent area shape duplicate surfaceId ${surfaceId}`)
    }
    byId.set(
      surfaceId,
      Object.freeze({
        surfaceId,
        adjacentSurfaceIds: Object.freeze(
          [...new Set((node.adjacentSurfaceIds ?? []).map((id) => requireNonEmpty(id, 'adjacentSurfaceId')))].sort(
            compareAscii,
          ),
        ),
      }),
    )
  }
  if (!byId.has(originSurfaceId)) {
    throw new Error(`persistent area shape unknown origin surface ${originSurfaceId}`)
  }

  const reached = new Set<string>([originSurfaceId])
  let frontier = [originSurfaceId]
  for (let hop = 0; hop < maxHops; hop += 1) {
    const next: string[] = []
    for (const current of frontier) {
      const node = byId.get(current)!
      for (const adjacent of node.adjacentSurfaceIds) {
        if (!byId.has(adjacent) || reached.has(adjacent)) continue
        reached.add(adjacent)
        next.push(adjacent)
      }
    }
    frontier = next
    if (frontier.length === 0) break
  }
  return Object.freeze([...reached].sort(compareAscii))
}

/**
 * Evaluate one active persistent shape against a contact observation.
 * Relocating the anchor updates footprint without retaining stale prior locations.
 */
export function evaluatePersistentAreaShape(args: {
  readonly shape: PersistentAreaShape
  readonly contact: ContactObservation
  readonly surfaces?: readonly SurfaceNode[]
  readonly priorExposedLocationIds?: readonly string[]
}): PersistentAreaEvaluation {
  const shape = createPersistentAreaShape(args.shape)
  const locationId = requireNonEmpty(args.contact.locationId, 'contact.locationId')
  const dwellTicks = requireFiniteNonNegativeInt(args.contact.dwellTicks, 'dwellTicks')
  const reasons: string[] = []

  if (!shape.active) {
    return Object.freeze({
      shapeId: shape.shapeId,
      family: shape.family,
      activeLayers: Object.freeze([]),
      escalated: false,
      affectedLocationIds: Object.freeze([]),
      surfaceRoutedIds: Object.freeze([]),
      reasons: Object.freeze(['inactive']),
    })
  }

  const surfaceId = args.contact.contactingSurfaceId?.trim() || ''

  // Footprint is always the current anchor. Walls and surfaceAdjacency also need surface contact.
  const atAnchor = locationId === shape.anchorLocationId
  const needsSurface = shape.family === 'wall' || shape.conduit === 'surfaceAdjacency'
  const familyContactOk = atAnchor && (!needsSurface || Boolean(surfaceId))

  if (!familyContactOk) {
    if (!atAnchor) reasons.push('outside-footprint')
    else reasons.push(`no-contact:${shape.family}`)
    return Object.freeze({
      shapeId: shape.shapeId,
      family: shape.family,
      activeLayers: Object.freeze([]),
      escalated: false,
      affectedLocationIds: Object.freeze([]),
      surfaceRoutedIds: Object.freeze([]),
      reasons: Object.freeze([...reasons].sort(compareAscii)),
    })
  }

  const escalated = dwellTicks >= shape.dwellTicksToEscalate
  if (escalated) reasons.push('dwell-escalated')
  else reasons.push('dwell-pending')

  const activeLayers = escalated ? shape.layers : shape.layers.slice(0, 1)
  reasons.push(`layers:${activeLayers.length}`)

  let surfaceRoutedIds: readonly string[] = Object.freeze([])
  if (shape.conduit === 'surfaceAdjacency') {
    surfaceRoutedIds = routeSurfaceAdjacency({
      originSurfaceId: surfaceId,
      surfaces: args.surfaces ?? [],
      maxHops: 2,
    })
    reasons.push('conduit:surfaceAdjacency')
  } else {
    reasons.push('conduit:volume_fill')
  }

  // Mobile-anchor rule: footprint follows current anchor only; drop stale prior exposures.
  const affected = new Set<string>([shape.anchorLocationId])
  for (const prior of args.priorExposedLocationIds ?? []) {
    const trimmed = prior.trim()
    if (!trimmed || trimmed === shape.anchorLocationId) continue
    reasons.push(`stale-cleared:${trimmed}`)
  }

  return Object.freeze({
    shapeId: shape.shapeId,
    family: shape.family,
    activeLayers: Object.freeze([...activeLayers]),
    escalated,
    affectedLocationIds: Object.freeze([...affected].sort(compareAscii)),
    surfaceRoutedIds,
    reasons: Object.freeze([...reasons].sort(compareAscii)),
  })
}

function requireFiniteNonNegativeInt(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`persistent area shape ${label} must be a non-negative integer`)
  }
  return value
}
