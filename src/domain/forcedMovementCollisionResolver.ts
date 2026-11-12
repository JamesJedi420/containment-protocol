/**
 * SPE-2189 — forced-movement collision resolver (pure, caller-owned).
 *
 * Resolves actor/object obstruction, occupied-space harm, and knockdown from
 * an already-authoritative displacement. Infrastructure damage remains with
 * SPE-2212 and is never evaluated or applied here.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const FORCED_MOVEMENT_COLLISION_OWNER = 'SPE-2189' as const
export const INFRASTRUCTURE_PROPAGATION_OWNER = 'SPE-2212' as const

export interface DisplacementVector {
  readonly xCells: number
  readonly yCells: number
  readonly levelDelta: number
}

export interface ActorCollisionTarget {
  readonly kind: 'actor'
  readonly id: string
  readonly stability: number
}

export interface ObjectCollisionTarget {
  readonly kind: 'object'
  readonly id: string
}

export type ForcedMovementCollisionTarget = ActorCollisionTarget | ObjectCollisionTarget

export interface ForcedMovementCollisionInput {
  readonly movementId: string
  readonly moverId: string
  readonly vector: DisplacementVector
  readonly impactForce: number
  readonly moverStability: number
  readonly target?: ForcedMovementCollisionTarget
}

export interface OccupiedSpaceHarm {
  readonly mover: number
  readonly occupant: number
}

interface ForcedMovementCollisionOutcomeBase {
  readonly movementId: string
  readonly moverId: string
  readonly vector: DisplacementVector
  readonly obstructed: boolean
  readonly occupiedSpaceHarm: OccupiedSpaceHarm
  readonly moverKnockedDown: boolean
  readonly occupantKnockedDown: boolean
  readonly targetImpact: number
  readonly infrastructurePropagation: 'not_evaluated'
  readonly infrastructureOwner: typeof INFRASTRUCTURE_PROPAGATION_OWNER
  readonly owner: typeof FORCED_MOVEMENT_COLLISION_OWNER
}

export interface ClearForcedMovementOutcome extends ForcedMovementCollisionOutcomeBase {
  readonly kind: 'clear'
  readonly targetId?: never
}

export interface ActorForcedMovementCollisionOutcome extends ForcedMovementCollisionOutcomeBase {
  readonly kind: 'actor_collision'
  readonly targetId: string
}

export interface ObjectForcedMovementCollisionOutcome extends ForcedMovementCollisionOutcomeBase {
  readonly kind: 'object_collision'
  readonly targetId: string
}

export type ForcedMovementCollisionOutcome =
  | ClearForcedMovementOutcome
  | ActorForcedMovementCollisionOutcome
  | ObjectForcedMovementCollisionOutcome

function validateVector(input: DisplacementVector): DisplacementVector {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('displacement vector is required')
  }
  const vector = Object.freeze({
    xCells: assertSafeIntegerInRange(input.xCells, 'vector.xCells', -100, 100),
    yCells: assertSafeIntegerInRange(input.yCells, 'vector.yCells', -100, 100),
    levelDelta: assertSafeIntegerInRange(input.levelDelta, 'vector.levelDelta', -20, 20),
  })
  if (vector.xCells === 0 && vector.yCells === 0 && vector.levelDelta === 0) {
    throw new Error('displacement vector must move at least one axis')
  }
  return vector
}

function validateTarget(input: ForcedMovementCollisionTarget): ForcedMovementCollisionTarget {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('collision target is invalid')
  }
  const id = assertNonEmptyId(input.id, 'target.id')
  switch (input.kind) {
    case 'actor':
      return Object.freeze({
        kind: input.kind,
        id,
        stability: assertSafeIntegerInRange(input.stability, 'target.stability', 0, 100),
      })
    case 'object':
      return Object.freeze({ kind: input.kind, id })
    default: {
      const _exhaustive: never = input
      throw new Error(
        `collision target kind is invalid: ${String((_exhaustive as { kind?: unknown }).kind)}`
      )
    }
  }
}

function harmAfterStability(impactForce: number, stability: number): number {
  // Stability absorbs half its value; the remainder is a bounded 0–100 harm proposal.
  return Math.max(0, impactForce - Math.floor(stability / 2))
}

/** Resolve one collision proposal without mutating actors, objects, maps, or infrastructure. */
export function resolveForcedMovementCollision(
  input: ForcedMovementCollisionInput
): ForcedMovementCollisionOutcome {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('forced movement collision input is required')
  }
  const movementId = assertNonEmptyId(input.movementId, 'movementId')
  const moverId = assertNonEmptyId(input.moverId, 'moverId')
  const vector = validateVector(input.vector)
  const impactForce = assertSafeIntegerInRange(input.impactForce, 'impactForce', 1, 100)
  const moverStability = assertSafeIntegerInRange(input.moverStability, 'moverStability', 0, 100)

  if (input.target === undefined) {
    return Object.freeze({
      movementId,
      moverId,
      vector,
      kind: 'clear',
      obstructed: false,
      occupiedSpaceHarm: Object.freeze({ mover: 0, occupant: 0 }),
      moverKnockedDown: impactForce > moverStability,
      occupantKnockedDown: false,
      targetImpact: 0,
      infrastructurePropagation: 'not_evaluated',
      infrastructureOwner: INFRASTRUCTURE_PROPAGATION_OWNER,
      owner: FORCED_MOVEMENT_COLLISION_OWNER,
    })
  }

  const target = validateTarget(input.target)
  if (target.kind === 'actor' && target.id === moverId) {
    throw new Error('collision target actor must differ from mover')
  }
  const moverHarm = harmAfterStability(impactForce, moverStability)
  if (target.kind === 'actor') {
    return Object.freeze({
      movementId,
      moverId,
      vector,
      kind: 'actor_collision',
      targetId: target.id,
      obstructed: true,
      occupiedSpaceHarm: Object.freeze({
        mover: moverHarm,
        occupant: harmAfterStability(impactForce, target.stability),
      }),
      moverKnockedDown: impactForce > moverStability,
      occupantKnockedDown: impactForce > target.stability,
      targetImpact: impactForce,
      infrastructurePropagation: 'not_evaluated',
      infrastructureOwner: INFRASTRUCTURE_PROPAGATION_OWNER,
      owner: FORCED_MOVEMENT_COLLISION_OWNER,
    })
  }

  return Object.freeze({
    movementId,
    moverId,
    vector,
    kind: 'object_collision',
    targetId: target.id,
    obstructed: true,
    occupiedSpaceHarm: Object.freeze({ mover: moverHarm, occupant: 0 }),
    moverKnockedDown: impactForce > moverStability,
    occupantKnockedDown: false,
    targetImpact: impactForce,
    infrastructurePropagation: 'not_evaluated',
    infrastructureOwner: INFRASTRUCTURE_PROPAGATION_OWNER,
    owner: FORCED_MOVEMENT_COLLISION_OWNER,
  })
}
