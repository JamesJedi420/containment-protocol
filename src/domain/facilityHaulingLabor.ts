/** SPE-2935 / SPE-1027 authored hauling labor bottleneck. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const BODY_TRANSFER_CARGO_ID = 'body_transfer' as const

export const HAUL_CARGO_IDS = [BODY_TRANSFER_CARGO_ID] as const
export type HaulCargoId = (typeof HAUL_CARGO_IDS)[number]

export const HANDLERS_AVAILABLE_LABOR = 'handlers_available' as const

export const HAULING_LABOR_IDS = [HANDLERS_AVAILABLE_LABOR] as const
export type HaulingLaborId = (typeof HAULING_LABOR_IDS)[number]

export const HAUL_BOTTLENECK_OUTCOMES = ['bottlenecked', 'moved'] as const
export type HaulBottleneckOutcome = (typeof HAUL_BOTTLENECK_OUTCOMES)[number]

export type FacilityHaulingLabor = Partial<Record<HaulCargoId, HaulingLaborId>>

export type FacilityHaulingLaborFailureCode = 'invalid_cargo' | 'invalid_labor'

export type FacilityHaulingLaborStampResult =
  | {
      ok: true
      state: GameState
      cargoId: HaulCargoId
      labor: HaulingLaborId
    }
  | { ok: false; state: GameState; code: FacilityHaulingLaborFailureCode }

export type FacilityHaulingLaborResolveResult =
  | {
      ok: true
      state: GameState
      cargoId: HaulCargoId
      labor: HaulingLaborId
      outcome: Extract<HaulBottleneckOutcome, 'moved'>
    }
  | {
      ok: true
      state: GameState
      cargoId: HaulCargoId
      outcome: Extract<HaulBottleneckOutcome, 'bottlenecked'>
    }
  | { ok: false; state: GameState; code: FacilityHaulingLaborFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isHaulCargoId(value: unknown): value is HaulCargoId {
  return HAUL_CARGO_IDS.some((cargoId) => cargoId === value)
}

export function isHaulingLaborId(value: unknown): value is HaulingLaborId {
  return HAULING_LABOR_IDS.some((labor) => labor === value)
}

function snapshotFacilityHaulingLabor(
  labor: FacilityHaulingLabor
): FacilityHaulingLabor | undefined {
  const next: FacilityHaulingLabor = {}
  for (const cargoId of HAUL_CARGO_IDS) {
    if (!hasOwnEnumerableProperty(labor as Record<string, unknown>, cargoId)) continue
    const stamped = labor[cargoId]
    if (!isHaulingLaborId(stamped)) continue
    next[cargoId] = stamped
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityHaulingLabor`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, and invalid-labor
 * siblings drop independently. Valid siblings insert in authored cargo-id order.
 */
export function parseFacilityHaulingLabor(value: unknown): FacilityHaulingLabor | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityHaulingLabor = {}
  for (const cargoId of HAUL_CARGO_IDS) {
    if (!hasOwnEnumerableProperty(value, cargoId)) continue
    const labor = value[cargoId]
    if (!isHaulingLaborId(labor)) continue
    next[cargoId] = labor
  }
  return snapshotFacilityHaulingLabor(next)
}

function readCargoId(input: unknown): HaulCargoId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'cargoId')) return undefined
  return isHaulCargoId(input.cargoId) ? input.cargoId : undefined
}

function readLabor(input: unknown): HaulingLaborId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'labor')) return undefined
  return isHaulingLaborId(input.labor) ? input.labor : undefined
}

function writeFacilityHaulingLabor(
  state: GameState,
  cargoId: HaulCargoId,
  labor: HaulingLaborId
): GameState | undefined {
  const current = parseFacilityHaulingLabor(state.facilityHaulingLabor) ?? {}
  const facilityHaulingLabor = snapshotFacilityHaulingLabor({
    ...current,
    [cargoId]: labor,
  })
  if (!facilityHaulingLabor) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilityHaulingLabor,
  }
}

/**
 * Stamp compact present labor on one authored haul cargo.
 * Unknown or malformed cargo input fail-closes `invalid_cargo`. Unknown or
 * malformed labor fail-closes `invalid_labor`. Failures keep the original state
 * reference. Success does not debit `facilityStockpile` or catalog `inventory`.
 */
export function stampFacilityHaulingLabor(
  state: GameState,
  input: unknown
): FacilityHaulingLaborStampResult {
  const cargoId = readCargoId(input)
  if (!cargoId) {
    return { ok: false, state, code: 'invalid_cargo' }
  }

  const labor = readLabor(input)
  if (!labor) {
    return { ok: false, state, code: 'invalid_labor' }
  }

  const nextState = writeFacilityHaulingLabor(state, cargoId, labor)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_cargo' }
  }

  return {
    ok: true,
    state: nextState,
    cargoId,
    labor,
  }
}

/**
 * Resolve whether authored haul cargo can move with available labor.
 * Unknown or malformed cargo input fail-closes `invalid_cargo`. Unknown or
 * malformed labor fail-closes `invalid_labor`. Omit or absent labor resolves
 * `bottlenecked` (not moved and not instant teleport). Matching present labor
 * resolves `moved`. Read-only: returns the same state reference and does not stamp.
 */
export function resolveFacilityHaulBottleneck(
  state: GameState,
  input: unknown
): FacilityHaulingLaborResolveResult {
  const cargoId = readCargoId(input)
  if (!cargoId) {
    return { ok: false, state, code: 'invalid_cargo' }
  }

  const labor = readLabor(input)
  if (!labor) {
    return { ok: false, state, code: 'invalid_labor' }
  }

  const stamped = parseFacilityHaulingLabor(state.facilityHaulingLabor)?.[cargoId]
  if (stamped === undefined) {
    return {
      ok: true,
      state,
      cargoId,
      outcome: 'bottlenecked',
    }
  }

  return {
    ok: true,
    state,
    cargoId,
    labor: stamped,
    outcome: 'moved',
  }
}
