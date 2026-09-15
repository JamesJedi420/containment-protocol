/** SPE-2895 / SPE-1027 authored overflow access penalty. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const EVIDENCE_CAGE_NODE_ID = 'evidence_cage' as const

export const OVERFLOW_NODE_IDS = [EVIDENCE_CAGE_NODE_ID] as const
export type OverflowNodeId = (typeof OVERFLOW_NODE_IDS)[number]

export const OVERFLOWING_STATUS = 'overflowing' as const

export const OVERFLOW_STATUSES = [OVERFLOWING_STATUS] as const
export type OverflowStatus = (typeof OVERFLOW_STATUSES)[number]

export const OVERFLOW_PENALTIES = ['blocked', 'clear'] as const
export type OverflowPenalty = (typeof OVERFLOW_PENALTIES)[number]

export type FacilityStockOverflow = Partial<Record<OverflowNodeId, OverflowStatus>>

export type FacilityStockOverflowFailureCode = 'invalid_node'

export type FacilityStockOverflowRecordResult =
  | { ok: true; state: GameState; nodeId: OverflowNodeId; status: OverflowStatus }
  | { ok: false; state: GameState; code: FacilityStockOverflowFailureCode }

export type FacilityStockOverflowResolveResult =
  | {
      ok: true
      state: GameState
      penalty: OverflowPenalty
      nodeId: OverflowNodeId
      status?: OverflowStatus
    }
  | { ok: false; state: GameState; code: FacilityStockOverflowFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isOverflowNodeId(value: unknown): value is OverflowNodeId {
  return OVERFLOW_NODE_IDS.some((nodeId) => nodeId === value)
}

export function isOverflowStatus(value: unknown): value is OverflowStatus {
  return OVERFLOW_STATUSES.some((status) => status === value)
}

function snapshotFacilityStockOverflow(
  overflow: FacilityStockOverflow
): FacilityStockOverflow | undefined {
  const next: FacilityStockOverflow = {}
  for (const nodeId of OVERFLOW_NODE_IDS) {
    const status = overflow[nodeId]
    if (!isOverflowStatus(status)) continue
    next[nodeId] = status
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityStockOverflow`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently.
 * Valid siblings insert in authored overflow-node id order.
 */
export function parseFacilityStockOverflow(value: unknown): FacilityStockOverflow | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: FacilityStockOverflow = {}
  for (const nodeId of OVERFLOW_NODE_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, nodeId)) continue
    const status = value[nodeId]
    if (!isOverflowStatus(status)) continue
    next[nodeId] = status
  }
  return snapshotFacilityStockOverflow(next)
}

function penaltyForStatus(status: OverflowStatus | undefined): OverflowPenalty {
  switch (status) {
    case OVERFLOWING_STATUS:
      return 'blocked'
    case undefined:
      return 'clear'
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

/**
 * Record one authored overflow event on a known overflow node.
 * Unknown/malformed node fail-closes `invalid_node`.
 * Success stamps `overflowing`. Does not debit `facilityStockpile` or catalog `inventory`.
 * Fail-closed paths leave state unchanged.
 */
export function recordFacilityOverflow(
  state: GameState,
  input: unknown
): FacilityStockOverflowRecordResult {
  const nodeId = isRecord(input) ? input.nodeId : undefined
  if (!isOverflowNodeId(nodeId)) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const current = parseFacilityStockOverflow(state.facilityStockOverflow) ?? {}
  const facilityStockOverflow = snapshotFacilityStockOverflow({
    ...current,
    [nodeId]: OVERFLOWING_STATUS,
  })
  const nextState: GameState = { ...ensureNormalizedGameState(state) }
  if (facilityStockOverflow === undefined) {
    delete nextState.facilityStockOverflow
  } else {
    nextState.facilityStockOverflow = facilityStockOverflow
  }
  return { ok: true, state: nextState, nodeId, status: OVERFLOWING_STATUS }
}

/**
 * Resolve overflow access penalty from recorded overflow.
 * Unknown/malformed node fail-closes `invalid_node`.
 * `evidence_cage` overflowing → `blocked`.
 * Omit or absent → `clear`.
 * Read-only: returns the same state reference. Does not stamp penalty or debit stock.
 */
export function resolveFacilityOverflowPenalty(
  state: GameState,
  input: unknown
): FacilityStockOverflowResolveResult {
  const nodeId = isRecord(input) ? input.nodeId : undefined
  if (!isOverflowNodeId(nodeId)) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const overflow = parseFacilityStockOverflow(state.facilityStockOverflow)
  const status = overflow?.[nodeId]
  const penalty = penaltyForStatus(status)
  if (status === undefined) {
    return { ok: true, state, penalty, nodeId }
  }
  return { ok: true, state, penalty, nodeId, status }
}
