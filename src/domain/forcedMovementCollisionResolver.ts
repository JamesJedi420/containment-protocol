/**
 * SPE-2189 Forced-movement collision resolver (slice 1).
 *
 * Pure domain helper: resolves actor/object collision and occupied-space harm
 * for forced displacement. Infrastructure-damage propagation is outside this slice.
 */

export type DisplacementVector = {
  dx: number
  dy: number
}

export type CollisionTargetKind = 'actor' | 'object'

export type CollisionOutcome =
  | { kind: 'miss'; targetKind: CollisionTargetKind; targetId: string }
  | { kind: 'impact'; targetKind: CollisionTargetKind; targetId: string; force: number }
  | { kind: 'knockdown'; targetKind: CollisionTargetKind; targetId: string; force: number }
  | { kind: 'obstruction'; targetKind: CollisionTargetKind; targetId: string }

export type OccupiedSpaceHarm = {
  targetId: string
  harmAmount: number
  source: 'occupied-space'
}

export type ForcedMovementInput = {
  displacement: DisplacementVector
  targetKind: CollisionTargetKind
  targetId: string
  targetOccupied: boolean
  resistance: number
}

export type ForcedMovementResult = {
  outcome: CollisionOutcome
  occupiedSpaceHarm: OccupiedSpaceHarm | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function resolveForcedMovementCollision(
  input: ForcedMovementInput
): ForcedMovementResult {
  const magnitude = Math.hypot(input.displacement.dx, input.displacement.dy)
  if (magnitude <= 0) {
    return {
      outcome: { kind: 'miss', targetKind: input.targetKind, targetId: input.targetId },
      occupiedSpaceHarm: null,
    }
  }

  const force = clamp(magnitude - input.resistance, 0, 10)
  if (force <= 0) {
    return {
      outcome: { kind: 'obstruction', targetKind: input.targetKind, targetId: input.targetId },
      occupiedSpaceHarm: null,
    }
  }

  const outcome: CollisionOutcome =
    force >= 4
      ? { kind: 'knockdown', targetKind: input.targetKind, targetId: input.targetId, force }
      : { kind: 'impact', targetKind: input.targetKind, targetId: input.targetId, force }

  const occupiedSpaceHarm: OccupiedSpaceHarm | null = input.targetOccupied
    ? {
        targetId: input.targetId,
        harmAmount: Math.floor(force),
        source: 'occupied-space',
      }
    : null

  return { outcome, occupiedSpaceHarm }
}
