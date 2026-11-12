/** SPE-2981 / SPE-1027 authored misfile / inventory-mismatch beyond wrong-zone.
 * Distinct from SPE-2890 facilityStockAccess wrong_zone / clearance_denied.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const CURSED_EVIDENCE_MISFILE_ID = 'cursed_evidence_misfile' as const

export const INVENTORY_MISMATCH_IDS = [CURSED_EVIDENCE_MISFILE_ID] as const
export type InventoryMismatchId = (typeof INVENTORY_MISMATCH_IDS)[number]

export const MISMATCHED_OUTCOME = 'mismatched' as const

export const INVENTORY_MISMATCH_STAMPED_OUTCOMES = [MISMATCHED_OUTCOME] as const
export type InventoryMismatchStampedOutcome = (typeof INVENTORY_MISMATCH_STAMPED_OUTCOMES)[number]

export const INVENTORY_MISMATCH_RESOLVE_OUTCOMES = ['none', MISMATCHED_OUTCOME] as const
export type InventoryMismatchResolveOutcome = (typeof INVENTORY_MISMATCH_RESOLVE_OUTCOMES)[number]

export type FacilityInventoryMismatch = Partial<
  Record<InventoryMismatchId, InventoryMismatchStampedOutcome>
>

export type FacilityInventoryMismatchFailureCode = 'invalid_mismatch' | 'invalid_outcome'

export type FacilityInventoryMismatchStampResult =
  | {
      ok: true
      state: GameState
      mismatchId: InventoryMismatchId
      outcome: InventoryMismatchStampedOutcome
    }
  | { ok: false; state: GameState; code: FacilityInventoryMismatchFailureCode }

export type FacilityInventoryMismatchResolveResult =
  | {
      ok: true
      state: GameState
      mismatchId: InventoryMismatchId
      outcome: Extract<InventoryMismatchResolveOutcome, 'none'>
    }
  | {
      ok: true
      state: GameState
      mismatchId: InventoryMismatchId
      outcome: InventoryMismatchStampedOutcome
    }
  | { ok: false; state: GameState; code: FacilityInventoryMismatchFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isInventoryMismatchId(value: unknown): value is InventoryMismatchId {
  return INVENTORY_MISMATCH_IDS.some((mismatchId) => mismatchId === value)
}

export function isInventoryMismatchStampedOutcome(
  value: unknown
): value is InventoryMismatchStampedOutcome {
  return INVENTORY_MISMATCH_STAMPED_OUTCOMES.some((outcome) => outcome === value)
}

function snapshotFacilityInventoryMismatch(
  mismatch: FacilityInventoryMismatch
): FacilityInventoryMismatch | undefined {
  const next: FacilityInventoryMismatch = {}
  for (const mismatchId of INVENTORY_MISMATCH_IDS) {
    if (!hasOwnEnumerableProperty(mismatch as Record<string, unknown>, mismatchId)) continue
    const stamped = mismatch[mismatchId]
    if (!isInventoryMismatchStampedOutcome(stamped)) continue
    next[mismatchId] = stamped
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityInventoryMismatch`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, wrong-zone-shaped,
 * and invalid-outcome siblings drop independently. Valid siblings insert in
 * authored mismatch-id order. SPE-2890 wrong_zone is not inventory-mismatch.
 */
export function parseFacilityInventoryMismatch(
  value: unknown
): FacilityInventoryMismatch | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityInventoryMismatch = {}
  for (const mismatchId of INVENTORY_MISMATCH_IDS) {
    if (!hasOwnEnumerableProperty(value, mismatchId)) continue
    const outcome = value[mismatchId]
    if (!isInventoryMismatchStampedOutcome(outcome)) continue
    next[mismatchId] = outcome
  }
  return snapshotFacilityInventoryMismatch(next)
}

function readMismatchId(input: unknown): InventoryMismatchId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'mismatchId')) return undefined
  return isInventoryMismatchId(input.mismatchId) ? input.mismatchId : undefined
}

function readOutcome(input: unknown): InventoryMismatchStampedOutcome | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'outcome')) return undefined
  return isInventoryMismatchStampedOutcome(input.outcome) ? input.outcome : undefined
}

function writeFacilityInventoryMismatch(
  state: GameState,
  mismatchId: InventoryMismatchId,
  outcome: InventoryMismatchStampedOutcome
): GameState | undefined {
  const current = parseFacilityInventoryMismatch(state.facilityInventoryMismatch) ?? {}
  const facilityInventoryMismatch = snapshotFacilityInventoryMismatch({
    ...current,
    [mismatchId]: outcome,
  })
  if (!facilityInventoryMismatch) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilityInventoryMismatch,
  }
}

/**
 * Stamp compact present inventory-mismatch outcome on one authored mismatch type.
 * Unknown or malformed mismatch input fail-closes `invalid_mismatch`. Unknown
 * or malformed outcome fail-closes `invalid_outcome`. Failures keep the original
 * state reference. Success does not debit `facilityStockpile` or catalog
 * `inventory` and does not stamp SPE-2890 wrong_zone.
 */
export function stampFacilityInventoryMismatch(
  state: GameState,
  input: unknown
): FacilityInventoryMismatchStampResult {
  const mismatchId = readMismatchId(input)
  if (!mismatchId) {
    return { ok: false, state, code: 'invalid_mismatch' }
  }

  const outcome = readOutcome(input)
  if (!outcome) {
    return { ok: false, state, code: 'invalid_outcome' }
  }

  const nextState = writeFacilityInventoryMismatch(state, mismatchId, outcome)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_mismatch' }
  }

  return {
    ok: true,
    state: nextState,
    mismatchId,
    outcome,
  }
}

/**
 * Resolve authored inventory-mismatch outcome vs omit.
 * Unknown or malformed mismatch input fail-closes `invalid_mismatch`.
 * Omit or absent resolves `outcome: 'none'` (not SPE-2890 wrong_zone, not
 * clearance_denied, and not a default mismatch). Present stamped outcome
 * resolves that mismatch. Read-only: returns the same state reference and
 * does not stamp.
 */
export function resolveFacilityInventoryMismatch(
  state: GameState,
  input: unknown
): FacilityInventoryMismatchResolveResult {
  const mismatchId = readMismatchId(input)
  if (!mismatchId) {
    return { ok: false, state, code: 'invalid_mismatch' }
  }

  const stamped = parseFacilityInventoryMismatch(state.facilityInventoryMismatch)?.[mismatchId]
  if (stamped === undefined) {
    return {
      ok: true,
      state,
      mismatchId,
      outcome: 'none',
    }
  }

  switch (stamped) {
    case MISMATCHED_OUTCOME:
      return {
        ok: true,
        state,
        mismatchId,
        outcome: stamped,
      }
    default: {
      const exhaustive: never = stamped
      return exhaustive
    }
  }
}
