/** SPE-2982 / SPE-1027 authored storage capacity qty-vs-capacity.
 * Distinct from SPE-2895 facilityStockOverflow overflowing→blocked/clear.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const EVIDENCE_CAGE_CAPACITY_NODE_ID = 'evidence_cage' as const

export const STORAGE_CAPACITY_NODE_IDS = [EVIDENCE_CAGE_CAPACITY_NODE_ID] as const
export type StorageCapacityNodeId = (typeof STORAGE_CAPACITY_NODE_IDS)[number]

export type FacilityStorageCapacitySnapshot = Readonly<{
  quantity: number
  capacity: number
}>

export type FacilityStorageCapacity = Partial<
  Record<StorageCapacityNodeId, FacilityStorageCapacitySnapshot>
>

export type FacilityStorageCapacityOutcome = 'unknown' | 'over_capacity' | 'within_capacity'

export type FacilityStorageCapacityFailureCode = 'invalid_node' | 'invalid_snapshot'

export type FacilityStorageCapacityStampResult =
  | {
      ok: true
      state: GameState
      nodeId: StorageCapacityNodeId
      snapshot: FacilityStorageCapacitySnapshot
    }
  | { ok: false; state: GameState; code: FacilityStorageCapacityFailureCode }

export type FacilityStorageCapacityResolveResult =
  | {
      ok: true
      state: GameState
      nodeId: StorageCapacityNodeId
      outcome: 'unknown'
    }
  | {
      ok: true
      state: GameState
      nodeId: StorageCapacityNodeId
      outcome: Exclude<FacilityStorageCapacityOutcome, 'unknown'>
      snapshot: FacilityStorageCapacitySnapshot
    }
  | { ok: false; state: GameState; code: 'invalid_node' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isStorageCapacityNodeId(value: unknown): value is StorageCapacityNodeId {
  return STORAGE_CAPACITY_NODE_IDS.some((nodeId) => nodeId === value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

function parseStorageCapacitySnapshot(value: unknown): FacilityStorageCapacitySnapshot | undefined {
  if (!isRecord(value)) return undefined
  if (
    !hasOwnEnumerableProperty(value, 'quantity') ||
    !hasOwnEnumerableProperty(value, 'capacity')
  ) {
    return undefined
  }

  const { quantity, capacity } = value
  if (!isNonNegativeSafeInteger(quantity) || !isNonNegativeSafeInteger(capacity)) {
    return undefined
  }

  return Object.freeze({ quantity, capacity })
}

function snapshotFacilityStorageCapacity(
  capacityMap: FacilityStorageCapacity
): FacilityStorageCapacity | undefined {
  const next: FacilityStorageCapacity = {}
  for (const nodeId of STORAGE_CAPACITY_NODE_IDS) {
    if (!hasOwnEnumerableProperty(capacityMap as Record<string, unknown>, nodeId)) continue
    const snapshot = parseStorageCapacitySnapshot(capacityMap[nodeId])
    if (!snapshot) continue
    next[nodeId] = snapshot
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityStorageCapacity`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, overflow-shaped,
 * preparedness-shaped, and invalid-snapshot siblings drop independently.
 * Valid siblings insert in authored node-id order.
 */
export function parseFacilityStorageCapacity(value: unknown): FacilityStorageCapacity | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityStorageCapacity = {}
  for (const nodeId of STORAGE_CAPACITY_NODE_IDS) {
    if (!hasOwnEnumerableProperty(value, nodeId)) continue
    const snapshot = parseStorageCapacitySnapshot(value[nodeId])
    if (!snapshot) continue
    next[nodeId] = snapshot
  }
  return snapshotFacilityStorageCapacity(next)
}

function outcomeForSnapshot(
  snapshot: FacilityStorageCapacitySnapshot
): Exclude<FacilityStorageCapacityOutcome, 'unknown'> {
  return snapshot.quantity > snapshot.capacity ? 'over_capacity' : 'within_capacity'
}

function readNodeId(input: unknown): StorageCapacityNodeId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'nodeId')) return undefined
  return isStorageCapacityNodeId(input.nodeId) ? input.nodeId : undefined
}

/**
 * Stamp one caller-owned quantity/capacity snapshot for an authored warehouse node.
 * Unknown/malformed node fail-closes `invalid_node`; malformed numeric snapshots fail-close
 * `invalid_snapshot`. Failures keep the original state reference. Success does not debit
 * `facilityStockpile` or catalog `inventory` and does not stamp SPE-2895 overflowing.
 */
export function stampFacilityStorageCapacity(
  state: GameState,
  input: unknown
): FacilityStorageCapacityStampResult {
  const nodeId = readNodeId(input)
  if (!nodeId) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const snapshot = parseStorageCapacitySnapshot(input)
  if (!snapshot) {
    return { ok: false, state, code: 'invalid_snapshot' }
  }

  const current = parseFacilityStorageCapacity(state.facilityStorageCapacity) ?? {}
  const facilityStorageCapacity = snapshotFacilityStorageCapacity({
    ...current,
    [nodeId]: snapshot,
  })
  const stampedSnapshot = facilityStorageCapacity?.[nodeId]
  if (!facilityStorageCapacity || !stampedSnapshot) {
    return { ok: false, state, code: 'invalid_snapshot' }
  }

  const nextState: GameState = {
    ...ensureNormalizedGameState(state),
    facilityStorageCapacity,
  }
  return { ok: true, state: nextState, nodeId, snapshot: stampedSnapshot }
}

/**
 * Resolve authored qty-vs-capacity outcome vs omit.
 * Unknown or malformed node input fail-closes `invalid_node`.
 * Omit or absent resolves `outcome: 'unknown'` (not SPE-2895 `blocked`/`clear`, and not a
 * default capacity). Present snapshot with `quantity > capacity` resolves `over_capacity`;
 * otherwise `within_capacity`. Read-only: returns the same state reference and does not stamp.
 */
export function resolveFacilityStorageCapacity(
  state: GameState,
  input: unknown
): FacilityStorageCapacityResolveResult {
  const nodeId = readNodeId(input)
  if (!nodeId) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const snapshot = parseFacilityStorageCapacity(state.facilityStorageCapacity)?.[nodeId]
  if (!snapshot) {
    return {
      ok: true,
      state,
      nodeId,
      outcome: 'unknown',
    }
  }

  return {
    ok: true,
    state,
    nodeId,
    outcome: outcomeForSnapshot(snapshot),
    snapshot,
  }
}
