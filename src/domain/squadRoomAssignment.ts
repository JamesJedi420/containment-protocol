// Squad room assignment and readiness-surface derivation seam (SPE-1326)
// Domain-only, deterministic, no RNG, no models.ts widening, no UI, no store
import type { SquadMetadata } from './squadMetadata'

// ── Room types ────────────────────────────────────────────────────────────────

export type SquadRoomType =
  | 'barracks'
  | 'staging'
  | 'armory'
  | 'vehicle_bay'
  | 'training_room'
  | 'recovery_room'

const VALID_ROOM_TYPES = new Set<SquadRoomType>([
  'barracks',
  'staging',
  'armory',
  'vehicle_bay',
  'training_room',
  'recovery_room',
])

// ── Stored room record ────────────────────────────────────────────────────────

export interface SquadRoomRecord {
  squadId: string
  roomType: SquadRoomType
}

// ── Assignment results ────────────────────────────────────────────────────────

export type SquadRoomAssignFailure = 'missing_squad_id' | 'invalid_room_type'

export type SquadRoomAssignResult =
  | { ok: true; record: SquadRoomRecord }
  | { ok: false; code: SquadRoomAssignFailure }

export type SquadRoomClearResult =
  | { ok: true; squadId: string }
  | { ok: false; code: SquadRoomAssignFailure }

// ── Input validation helper ───────────────────────────────────────────────────

function validateRoomInput(
  squadId: string | undefined | null,
  roomType: string | undefined | null
): SquadRoomAssignResult {
  if (!squadId || typeof squadId !== 'string' || squadId.trim().length === 0) {
    return { ok: false, code: 'missing_squad_id' }
  }
  if (!roomType || !VALID_ROOM_TYPES.has(roomType as SquadRoomType)) {
    return { ok: false, code: 'invalid_room_type' }
  }
  return {
    ok: true,
    record: { squadId: squadId.trim(), roomType: roomType as SquadRoomType },
  }
}

// ── assignSquadRoom ───────────────────────────────────────────────────────────

export function assignSquadRoom(
  squadId: string | undefined | null,
  roomType: string | undefined | null
): SquadRoomAssignResult {
  return validateRoomInput(squadId, roomType)
}

// ── reassignSquadRoom ─────────────────────────────────────────────────────────

/** Deterministically replaces an existing room assignment. Idempotent. */
export function reassignSquadRoom(
  squadId: string | undefined | null,
  roomType: string | undefined | null
): SquadRoomAssignResult {
  return validateRoomInput(squadId, roomType)
}

// ── clearSquadRoom ────────────────────────────────────────────────────────────

export function clearSquadRoom(
  squadId: string | undefined | null
): SquadRoomClearResult {
  if (!squadId || typeof squadId !== 'string' || squadId.trim().length === 0) {
    return { ok: false, code: 'missing_squad_id' }
  }
  return { ok: true, squadId: squadId.trim() }
}

// ── Readiness-surface properties ──────────────────────────────────────────────

export type ReadinessSurfaceTier = 'high' | 'standard' | 'limited'

export interface ReadinessSurfaceProperties {
  /** Squad can be dispatched to an incident with minimal pre-deployment delay. */
  quickDeploy: boolean
  /** Gear kits, consumables, and specialist equipment are at hand. */
  gearAccess: boolean
  /** Responders recover condition/fatigue faster in this room. */
  recoveryCapable: boolean
  /** Drills and training certification activities are possible. */
  trainingCapable: boolean
  /** Vehicles, heavy equipment, or transport assets are accessible. */
  vehicleAccess: boolean
}

export interface SquadReadinessSurface {
  squadId: string
  roomType: SquadRoomType
  tier: ReadinessSurfaceTier
  properties: ReadinessSurfaceProperties
}

/**
 * Deterministic rule set mapping each room type to its readiness-surface tier
 * and conferred properties. One source of truth — no RNG.
 *
 * tier: high     → best dispatch-readiness position
 *       standard → balanced but not optimal for rapid response
 *       limited  → specialised support; not for immediate deployment
 */
const ROOM_SURFACE: Record<
  SquadRoomType,
  { tier: ReadinessSurfaceTier; properties: ReadinessSurfaceProperties }
> = {
  staging: {
    tier: 'high',
    properties: {
      quickDeploy: true,
      gearAccess: true,
      recoveryCapable: false,
      trainingCapable: false,
      vehicleAccess: false,
    },
  },
  vehicle_bay: {
    tier: 'high',
    properties: {
      quickDeploy: true,
      gearAccess: false,
      recoveryCapable: false,
      trainingCapable: false,
      vehicleAccess: true,
    },
  },
  armory: {
    tier: 'standard',
    properties: {
      quickDeploy: false,
      gearAccess: true,
      recoveryCapable: false,
      trainingCapable: false,
      vehicleAccess: false,
    },
  },
  barracks: {
    tier: 'standard',
    properties: {
      quickDeploy: false,
      gearAccess: false,
      recoveryCapable: true,
      trainingCapable: false,
      vehicleAccess: false,
    },
  },
  training_room: {
    tier: 'limited',
    properties: {
      quickDeploy: false,
      gearAccess: false,
      recoveryCapable: false,
      trainingCapable: true,
      vehicleAccess: false,
    },
  },
  recovery_room: {
    tier: 'limited',
    properties: {
      quickDeploy: false,
      gearAccess: false,
      recoveryCapable: true,
      trainingCapable: false,
      vehicleAccess: false,
    },
  },
}

// ── deriveReadinessSurface ────────────────────────────────────────────────────

/**
 * Derives the readiness-surface summary for a squad assigned to a given room.
 * The squad roster is never mutated; this is pure derived state.
 */
export function deriveReadinessSurface(
  squad: SquadMetadata,
  roomType: SquadRoomType
): SquadReadinessSurface {
  const surface = ROOM_SURFACE[roomType]
  return {
    squadId: squad.squadId,
    roomType,
    tier: surface.tier,
    properties: { ...surface.properties },
  }
}
