/**
 * SPE-992 — hidden-room building graph (pure, caller-owned).
 *
 * Concealed access triggers (not normal keyed doors), hidden rooms for
 * long-term habitation, asymmetric alternate routes, and discovery ladders
 * to resident/body evidence. No full building simulator or GameState.
 */

import { assertNonEmptyId } from './assertBoundedInteger'

export const HIDDEN_ROOM_BUILDING_GRAPH_OWNER = 'SPE-992' as const

export type AccessTriggerKind =
  'book' | 'portrait' | 'panel' | 'clock' | 'fireplace' | 'decorative_key'

export type HiddenRoomPurpose =
  | 'long_term_habitation'
  | 'body_concealment'
  | 'supply_storage'
  | 'witness_confinement'
  | 'family_secret'

export type DiscoveryStage =
  'concealed' | 'switch_found' | 'room_revealed' | 'occupant_or_body_found'

export type RoomVisibility = 'visible' | 'hidden'

export interface ConcealedAccessTrigger {
  readonly id: string
  readonly kind: AccessTriggerKind
  /** Matching token / decorative key id — not a standard door key. */
  readonly matchingMechanismId: string
  readonly fromRoomId: string
  readonly toHiddenRoomId: string
}

export interface BuildingRoom {
  readonly id: string
  readonly visibility: RoomVisibility
  readonly purpose: HiddenRoomPurpose | 'ordinary'
}

export interface BuildingEdge {
  readonly fromRoomId: string
  readonly toRoomId: string
  /** True when the edge is only available after a concealed trigger fires. */
  readonly alternateRoute: boolean
  readonly requiresTriggerId: string | null
}

export interface HiddenRoomContents {
  readonly activeResident: boolean
  readonly concealedBody: boolean
}

export interface HiddenBuildingGraph {
  readonly id: string
  readonly rooms: readonly BuildingRoom[]
  readonly edges: readonly BuildingEdge[]
  readonly triggers: readonly ConcealedAccessTrigger[]
  readonly contentsByRoomId: Readonly<Record<string, HiddenRoomContents>>
}

export interface HiddenBuildingDiscoveryState {
  readonly buildingId: string
  readonly discoveryByHiddenRoomId: Readonly<Record<string, DiscoveryStage>>
  readonly openAlternateRouteIds: readonly string[]
  readonly owner: typeof HIDDEN_ROOM_BUILDING_GRAPH_OWNER
}

const TRIGGERS = new Set<AccessTriggerKind>([
  'book',
  'portrait',
  'panel',
  'clock',
  'fireplace',
  'decorative_key',
])
const PURPOSES = new Set<HiddenRoomPurpose | 'ordinary'>([
  'long_term_habitation',
  'body_concealment',
  'supply_storage',
  'witness_confinement',
  'family_secret',
  'ordinary',
])
const STAGES = new Set<DiscoveryStage>([
  'concealed',
  'switch_found',
  'room_revealed',
  'occupant_or_body_found',
])

function assertRooms(rooms: readonly BuildingRoom[]): readonly BuildingRoom[] {
  if (!Array.isArray(rooms) || rooms.length < 2) {
    throw new Error('rooms must include at least two entries')
  }
  const seen = new Set<string>()
  const out: BuildingRoom[] = []
  for (const room of rooms) {
    if (typeof room !== 'object' || room === null) throw new Error('room is required')
    const id = assertNonEmptyId(room.id, 'room.id')
    if (seen.has(id)) throw new Error('room ids must be unique')
    seen.add(id)
    if (room.visibility !== 'visible' && room.visibility !== 'hidden') {
      throw new Error('room visibility is invalid')
    }
    if (!PURPOSES.has(room.purpose)) throw new Error('room purpose is invalid')
    out.push(Object.freeze({ id, visibility: room.visibility, purpose: room.purpose }))
  }
  return Object.freeze(out)
}

export function createHiddenBuildingGraph(input: HiddenBuildingGraph): HiddenBuildingGraph {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('hidden building graph is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  const rooms = assertRooms(input.rooms)
  const roomIds = new Set(rooms.map((r) => r.id))

  if (!Array.isArray(input.triggers) || input.triggers.length < 1) {
    throw new Error('triggers must be a non-empty array')
  }
  const triggers: ConcealedAccessTrigger[] = []
  const triggerIds = new Set<string>()
  for (const t of input.triggers) {
    const tid = assertNonEmptyId(t.id, 'trigger.id')
    if (triggerIds.has(tid)) throw new Error('trigger ids must be unique')
    triggerIds.add(tid)
    if (!TRIGGERS.has(t.kind)) throw new Error('access trigger kind is invalid')
    if (t.kind === undefined) throw new Error('access trigger kind is invalid')
    const matchingMechanismId = assertNonEmptyId(t.matchingMechanismId, 'matchingMechanismId')
    const fromRoomId = assertNonEmptyId(t.fromRoomId, 'fromRoomId')
    const toHiddenRoomId = assertNonEmptyId(t.toHiddenRoomId, 'toHiddenRoomId')
    if (!roomIds.has(fromRoomId) || !roomIds.has(toHiddenRoomId)) {
      throw new Error('trigger rooms must exist in the graph')
    }
    const target = rooms.find((r) => r.id === toHiddenRoomId)!
    if (target.visibility !== 'hidden') throw new Error('trigger must open a hidden room')
    triggers.push(
      Object.freeze({
        id: tid,
        kind: t.kind,
        matchingMechanismId,
        fromRoomId,
        toHiddenRoomId,
      })
    )
  }

  if (!Array.isArray(input.edges) || input.edges.length < 1) {
    throw new Error('edges must be a non-empty array')
  }
  const edges: BuildingEdge[] = []
  for (const e of input.edges) {
    const fromRoomId = assertNonEmptyId(e.fromRoomId, 'fromRoomId')
    const toRoomId = assertNonEmptyId(e.toRoomId, 'toRoomId')
    if (!roomIds.has(fromRoomId) || !roomIds.has(toRoomId)) {
      throw new Error('edge rooms must exist in the graph')
    }
    if (typeof e.alternateRoute !== 'boolean') throw new Error('alternateRoute must be boolean')
    const requiresTriggerId =
      e.requiresTriggerId === null
        ? null
        : assertNonEmptyId(e.requiresTriggerId, 'requiresTriggerId')
    if (e.alternateRoute && requiresTriggerId === null) {
      throw new Error('alternate routes require a trigger id')
    }
    if (requiresTriggerId !== null && !triggerIds.has(requiresTriggerId)) {
      throw new Error('edge requires unknown trigger')
    }
    edges.push(
      Object.freeze({
        fromRoomId,
        toRoomId,
        alternateRoute: e.alternateRoute,
        requiresTriggerId,
      })
    )
  }

  const contentsByRoomId: Record<string, HiddenRoomContents> = {}
  if (typeof input.contentsByRoomId !== 'object' || input.contentsByRoomId === null) {
    throw new Error('contentsByRoomId is required')
  }
  for (const [roomId, contents] of Object.entries(input.contentsByRoomId)) {
    if (!roomIds.has(roomId)) throw new Error('contents room must exist')
    if (
      typeof contents.activeResident !== 'boolean' ||
      typeof contents.concealedBody !== 'boolean'
    ) {
      throw new Error('contents flags must be boolean')
    }
    contentsByRoomId[roomId] = Object.freeze({
      activeResident: contents.activeResident,
      concealedBody: contents.concealedBody,
    })
  }

  return Object.freeze({
    id,
    rooms,
    edges: Object.freeze(edges),
    triggers: Object.freeze(triggers),
    contentsByRoomId: Object.freeze(contentsByRoomId),
  })
}

export function bootHiddenBuildingDiscovery(
  graphInput: HiddenBuildingGraph
): HiddenBuildingDiscoveryState {
  const graph = createHiddenBuildingGraph(graphInput)
  const discoveryByHiddenRoomId: Record<string, DiscoveryStage> = {}
  for (const room of graph.rooms) {
    if (room.visibility === 'hidden') {
      discoveryByHiddenRoomId[room.id] = 'concealed'
    }
  }
  return Object.freeze({
    buildingId: graph.id,
    discoveryByHiddenRoomId: Object.freeze(discoveryByHiddenRoomId),
    openAlternateRouteIds: Object.freeze([] as string[]),
    owner: HIDDEN_ROOM_BUILDING_GRAPH_OWNER,
  })
}

/**
 * Activate a concealed trigger with the matching mechanism. Escalates discovery
 * and opens alternate routes gated by that trigger.
 */
export function activateConcealedTrigger(
  graphInput: HiddenBuildingGraph,
  state: HiddenBuildingDiscoveryState,
  triggerId: string,
  matchingMechanismId: string
): HiddenBuildingDiscoveryState {
  const graph = createHiddenBuildingGraph(graphInput)
  assertDiscovery(state, graph.id)
  const trigger = graph.triggers.find((t) => t.id === triggerId)
  if (!trigger) throw new Error('trigger not found')
  if (trigger.matchingMechanismId !== matchingMechanismId) {
    throw new Error('matching mechanism mismatch')
  }
  const stage = state.discoveryByHiddenRoomId[trigger.toHiddenRoomId]
  if (!stage || !STAGES.has(stage)) throw new Error('hidden room discovery state missing')
  if (stage !== 'concealed' && stage !== 'switch_found') {
    throw new Error('trigger already fully activated')
  }

  const discoveryByHiddenRoomId = Object.freeze({
    ...state.discoveryByHiddenRoomId,
    [trigger.toHiddenRoomId]: 'room_revealed' as const,
  })
  const openAlternateRouteIds = Object.freeze(
    graph.edges
      .filter((e) => e.requiresTriggerId === triggerId)
      .map((e) => `${e.fromRoomId}->${e.toRoomId}`)
  )
  return Object.freeze({
    ...state,
    discoveryByHiddenRoomId,
    openAlternateRouteIds,
  })
}

/** Escalate a revealed room to occupant/body discovery when contents warrant it. */
export function inspectRevealedHiddenRoom(
  graphInput: HiddenBuildingGraph,
  state: HiddenBuildingDiscoveryState,
  roomId: string
): HiddenBuildingDiscoveryState {
  const graph = createHiddenBuildingGraph(graphInput)
  assertDiscovery(state, graph.id)
  const id = assertNonEmptyId(roomId, 'roomId')
  const stage = state.discoveryByHiddenRoomId[id]
  if (stage !== 'room_revealed') throw new Error('room must be revealed before inspection')
  const contents = graph.contentsByRoomId[id]
  if (!contents) throw new Error('room contents missing')
  if (!contents.activeResident && !contents.concealedBody) {
    throw new Error('room has no resident or body to discover')
  }
  return Object.freeze({
    ...state,
    discoveryByHiddenRoomId: Object.freeze({
      ...state.discoveryByHiddenRoomId,
      [id]: 'occupant_or_body_found' as const,
    }),
  })
}

export function reachableRoomIds(
  graphInput: HiddenBuildingGraph,
  state: HiddenBuildingDiscoveryState,
  fromRoomId: string
): readonly string[] {
  const graph = createHiddenBuildingGraph(graphInput)
  assertDiscovery(state, graph.id)
  const from = assertNonEmptyId(fromRoomId, 'fromRoomId')
  const open = new Set(state.openAlternateRouteIds)
  const out: string[] = []
  for (const edge of graph.edges) {
    if (edge.fromRoomId !== from) continue
    if (edge.alternateRoute) {
      const key = `${edge.fromRoomId}->${edge.toRoomId}`
      if (!open.has(key)) continue
    }
    out.push(edge.toRoomId)
  }
  return Object.freeze(out)
}

function assertDiscovery(state: HiddenBuildingDiscoveryState, buildingId: string): void {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('discovery state is required')
  }
  if (state.owner !== HIDDEN_ROOM_BUILDING_GRAPH_OWNER) {
    throw new Error('hidden room owner mismatch')
  }
  if (state.buildingId !== buildingId) throw new Error('buildingId mismatch')
}
