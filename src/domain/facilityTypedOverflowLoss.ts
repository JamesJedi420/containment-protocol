/** SPE-2980 / SPE-1027 authored typed overflow forced triage or real loss.
 * Distinct from SPE-2895 facilityStockOverflow access-blocked penalty.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const EVIDENCE_OVERFLOW_ID = 'evidence_overflow' as const

export const TYPED_OVERFLOW_IDS = [EVIDENCE_OVERFLOW_ID] as const
export type TypedOverflowId = (typeof TYPED_OVERFLOW_IDS)[number]

export const FORCED_TRIAGE_OUTCOME = 'forced_triage' as const
export const REAL_LOSS_OUTCOME = 'real_loss' as const

export const TYPED_OVERFLOW_STAMPED_OUTCOMES = [FORCED_TRIAGE_OUTCOME, REAL_LOSS_OUTCOME] as const
export type TypedOverflowStampedOutcome = (typeof TYPED_OVERFLOW_STAMPED_OUTCOMES)[number]

export const TYPED_OVERFLOW_RESOLVE_OUTCOMES = [
  'none',
  FORCED_TRIAGE_OUTCOME,
  REAL_LOSS_OUTCOME,
] as const
export type TypedOverflowResolveOutcome = (typeof TYPED_OVERFLOW_RESOLVE_OUTCOMES)[number]

export type FacilityTypedOverflowLoss = Partial<
  Record<TypedOverflowId, TypedOverflowStampedOutcome>
>

export type FacilityTypedOverflowLossFailureCode = 'invalid_overflow' | 'invalid_outcome'

export type FacilityTypedOverflowLossStampResult =
  | {
      ok: true
      state: GameState
      overflowId: TypedOverflowId
      outcome: TypedOverflowStampedOutcome
    }
  | { ok: false; state: GameState; code: FacilityTypedOverflowLossFailureCode }

export type FacilityTypedOverflowLossResolveResult =
  | {
      ok: true
      state: GameState
      overflowId: TypedOverflowId
      outcome: Extract<TypedOverflowResolveOutcome, 'none'>
    }
  | {
      ok: true
      state: GameState
      overflowId: TypedOverflowId
      outcome: TypedOverflowStampedOutcome
    }
  | { ok: false; state: GameState; code: FacilityTypedOverflowLossFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isTypedOverflowId(value: unknown): value is TypedOverflowId {
  return TYPED_OVERFLOW_IDS.some((overflowId) => overflowId === value)
}

export function isTypedOverflowStampedOutcome(
  value: unknown
): value is TypedOverflowStampedOutcome {
  return TYPED_OVERFLOW_STAMPED_OUTCOMES.some((outcome) => outcome === value)
}

function snapshotFacilityTypedOverflowLoss(
  typed: FacilityTypedOverflowLoss
): FacilityTypedOverflowLoss | undefined {
  const next: FacilityTypedOverflowLoss = {}
  for (const overflowId of TYPED_OVERFLOW_IDS) {
    if (!hasOwnEnumerableProperty(typed as Record<string, unknown>, overflowId)) continue
    const stamped = typed[overflowId]
    if (!isTypedOverflowStampedOutcome(stamped)) continue
    next[overflowId] = stamped
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityTypedOverflowLoss`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, access-blocked-shaped,
 * and invalid-outcome siblings drop independently. Valid siblings insert in
 * authored overflow-id order. SPE-2895 access-blocked is not typed loss.
 */
export function parseFacilityTypedOverflowLoss(
  value: unknown
): FacilityTypedOverflowLoss | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityTypedOverflowLoss = {}
  for (const overflowId of TYPED_OVERFLOW_IDS) {
    if (!hasOwnEnumerableProperty(value, overflowId)) continue
    const outcome = value[overflowId]
    if (!isTypedOverflowStampedOutcome(outcome)) continue
    next[overflowId] = outcome
  }
  return snapshotFacilityTypedOverflowLoss(next)
}

function readOverflowId(input: unknown): TypedOverflowId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'overflowId')) return undefined
  return isTypedOverflowId(input.overflowId) ? input.overflowId : undefined
}

function readOutcome(input: unknown): TypedOverflowStampedOutcome | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'outcome')) return undefined
  return isTypedOverflowStampedOutcome(input.outcome) ? input.outcome : undefined
}

function writeFacilityTypedOverflowLoss(
  state: GameState,
  overflowId: TypedOverflowId,
  outcome: TypedOverflowStampedOutcome
): GameState | undefined {
  const current = parseFacilityTypedOverflowLoss(state.facilityTypedOverflowLoss) ?? {}
  const facilityTypedOverflowLoss = snapshotFacilityTypedOverflowLoss({
    ...current,
    [overflowId]: outcome,
  })
  if (!facilityTypedOverflowLoss) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilityTypedOverflowLoss,
  }
}

/**
 * Stamp compact present typed overflow outcome on one authored overflow type.
 * Unknown or malformed overflow input fail-closes `invalid_overflow`. Unknown
 * or malformed outcome fail-closes `invalid_outcome`. Failures keep the original
 * state reference. Success does not debit `facilityStockpile` or catalog
 * `inventory` and does not stamp SPE-2895 access-blocked overflow.
 */
export function stampFacilityTypedOverflowLoss(
  state: GameState,
  input: unknown
): FacilityTypedOverflowLossStampResult {
  const overflowId = readOverflowId(input)
  if (!overflowId) {
    return { ok: false, state, code: 'invalid_overflow' }
  }

  const outcome = readOutcome(input)
  if (!outcome) {
    return { ok: false, state, code: 'invalid_outcome' }
  }

  const nextState = writeFacilityTypedOverflowLoss(state, overflowId, outcome)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_overflow' }
  }

  return {
    ok: true,
    state: nextState,
    overflowId,
    outcome,
  }
}

/**
 * Resolve authored typed overflow outcome vs omit.
 * Unknown or malformed overflow input fail-closes `invalid_overflow`.
 * Omit or absent resolves `outcome: 'none'` (not SPE-2895 blocked, not triage,
 * and not loss). Present stamped outcome resolves that typed outcome.
 * Read-only: returns the same state reference and does not stamp.
 */
export function resolveFacilityTypedOverflowLoss(
  state: GameState,
  input: unknown
): FacilityTypedOverflowLossResolveResult {
  const overflowId = readOverflowId(input)
  if (!overflowId) {
    return { ok: false, state, code: 'invalid_overflow' }
  }

  const stamped = parseFacilityTypedOverflowLoss(state.facilityTypedOverflowLoss)?.[overflowId]
  if (stamped === undefined) {
    return {
      ok: true,
      state,
      overflowId,
      outcome: 'none',
    }
  }

  switch (stamped) {
    case FORCED_TRIAGE_OUTCOME:
    case REAL_LOSS_OUTCOME:
      return {
        ok: true,
        state,
        overflowId,
        outcome: stamped,
      }
    default: {
      const exhaustive: never = stamped
      return exhaustive
    }
  }
}
