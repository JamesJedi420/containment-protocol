/**
 * SPE-399 — long-range and vertical forced-movement hazards (pure, caller-owned).
 *
 * Distinguishes ordinary short knockback from long-range / vertical displacement
 * and one-way exit ejection. No physics simulator, GameState, or map UI.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const FORCED_MOVEMENT_HAZARD_OWNER = 'SPE-399' as const

export type ForcedMovementKind =
  'short_knockback' | 'long_range_horizontal' | 'vertical_level_change' | 'one_way_exit'

export interface OccupantPosition {
  readonly nodeId: string
  readonly level: number
}

export interface ForcedMovementHazard {
  readonly id: string
  readonly kind: ForcedMovementKind
  /** Horizontal cells; short knockback must be ≤ SHORT_KNOCKBACK_MAX. */
  readonly rangeCells: number
  /** Level delta for vertical hazards; 0 for same-level kinds. */
  readonly levelDelta: number
  /** Destination node for one-way exit; omitted otherwise. */
  readonly exitNodeId?: string
}

export interface ForcedMovementResult {
  readonly kind: ForcedMovementKind
  readonly from: OccupantPosition
  readonly to: OccupantPosition
  readonly oneWayExit: boolean
  readonly longRange: boolean
  readonly traversalChanged: boolean
  readonly owner: typeof FORCED_MOVEMENT_HAZARD_OWNER
}

export const SHORT_KNOCKBACK_MAX_CELLS = 2 as const

const KINDS = new Set<ForcedMovementKind>([
  'short_knockback',
  'long_range_horizontal',
  'vertical_level_change',
  'one_way_exit',
])

export function createForcedMovementHazard(input: ForcedMovementHazard): ForcedMovementHazard {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('forced movement hazard is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  if (!KINDS.has(input.kind)) {
    throw new Error('forced movement kind is invalid')
  }
  const rangeCells = assertSafeIntegerInRange(input.rangeCells, 'rangeCells', 0, 1000)
  const levelDelta = assertSafeIntegerInRange(input.levelDelta, 'levelDelta', -20, 20)

  switch (input.kind) {
    case 'short_knockback':
      if (rangeCells < 1 || rangeCells > SHORT_KNOCKBACK_MAX_CELLS) {
        throw new Error(`short knockback range must be 1–${SHORT_KNOCKBACK_MAX_CELLS}`)
      }
      if (levelDelta !== 0) throw new Error('short knockback must stay same-level')
      if (input.exitNodeId !== undefined) throw new Error('short knockback must not set exitNodeId')
      return Object.freeze({ id, kind: input.kind, rangeCells, levelDelta: 0 })
    case 'long_range_horizontal':
      if (rangeCells <= SHORT_KNOCKBACK_MAX_CELLS) {
        throw new Error('long-range horizontal must exceed short knockback max')
      }
      if (levelDelta !== 0) throw new Error('long-range horizontal must stay same-level')
      if (input.exitNodeId !== undefined) {
        throw new Error('long-range horizontal must not set exitNodeId')
      }
      return Object.freeze({ id, kind: input.kind, rangeCells, levelDelta: 0 })
    case 'vertical_level_change':
      if (levelDelta === 0) throw new Error('vertical level change requires nonzero levelDelta')
      if (input.exitNodeId !== undefined) {
        throw new Error('vertical level change must not set exitNodeId')
      }
      return Object.freeze({ id, kind: input.kind, rangeCells, levelDelta })
    case 'one_way_exit': {
      const exitNodeId = assertNonEmptyId(input.exitNodeId, 'exitNodeId')
      return Object.freeze({ id, kind: input.kind, rangeCells, levelDelta, exitNodeId })
    }
    default: {
      const _exhaustive: never = input.kind
      throw new Error(`unhandled forced movement kind: ${_exhaustive}`)
    }
  }
}

export function createOccupantPosition(input: OccupantPosition): OccupantPosition {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('occupant position is required')
  }
  return Object.freeze({
    nodeId: assertNonEmptyId(input.nodeId, 'nodeId'),
    level: assertSafeIntegerInRange(input.level, 'level', -100, 100),
  })
}

/**
 * Apply a forced-movement hazard to an occupant. Destination node is caller-owned
 * for horizontal/vertical kinds; one-way exit uses the hazard exit node.
 */
export function applyForcedMovementHazard(
  hazardInput: ForcedMovementHazard,
  fromInput: OccupantPosition,
  destinationNodeId?: string
): ForcedMovementResult {
  const hazard = createForcedMovementHazard(hazardInput)
  const from = createOccupantPosition(fromInput)
  const longRange =
    hazard.kind === 'long_range_horizontal' ||
    hazard.kind === 'vertical_level_change' ||
    hazard.kind === 'one_way_exit'
  const oneWayExit = hazard.kind === 'one_way_exit'

  let to: OccupantPosition
  switch (hazard.kind) {
    case 'short_knockback':
    case 'long_range_horizontal': {
      const nodeId = assertNonEmptyId(destinationNodeId, 'destinationNodeId')
      to = Object.freeze({ nodeId, level: from.level })
      break
    }
    case 'vertical_level_change': {
      const nodeId = assertNonEmptyId(destinationNodeId, 'destinationNodeId')
      to = Object.freeze({ nodeId, level: from.level + hazard.levelDelta })
      break
    }
    case 'one_way_exit':
      to = Object.freeze({
        nodeId: hazard.exitNodeId as string,
        level: from.level + hazard.levelDelta,
      })
      break
    default: {
      const _exhaustive: never = hazard.kind
      throw new Error(`unhandled forced movement kind: ${_exhaustive}`)
    }
  }

  const traversalChanged =
    to.nodeId !== from.nodeId || to.level !== from.level || oneWayExit || longRange

  return Object.freeze({
    kind: hazard.kind,
    from,
    to,
    oneWayExit,
    longRange,
    traversalChanged,
    owner: FORCED_MOVEMENT_HAZARD_OWNER,
  })
}

export function isOrdinaryKnockback(kind: ForcedMovementKind): boolean {
  return kind === 'short_knockback'
}
