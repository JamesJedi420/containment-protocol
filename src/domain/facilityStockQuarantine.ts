/** SPE-2934 / SPE-1027 authored quarantine isolation. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const CURSED_OBJECT_QUARANTINE_NODE_ID = 'cursed_object_quarantine' as const

export const QUARANTINE_NODE_IDS = [CURSED_OBJECT_QUARANTINE_NODE_ID] as const
export type QuarantineNodeId = (typeof QUARANTINE_NODE_IDS)[number]

export const QUARANTINED_ISOLATION = 'quarantined' as const
export const CLEAN_ISOLATION = 'clean' as const

export const QUARANTINE_ISOLATIONS = [QUARANTINED_ISOLATION, CLEAN_ISOLATION] as const
export type QuarantineIsolation = (typeof QUARANTINE_ISOLATIONS)[number]

export type QuarantineSeparation = 'unknown' | 'separated'

export type FacilityStockQuarantine = Partial<Record<QuarantineNodeId, QuarantineIsolation>>

export type FacilityStockQuarantineFailureCode =
  'invalid_node' | 'invalid_isolation' | 'mix_mismatch'

export type FacilityStockQuarantineStampResult =
  | {
      ok: true
      state: GameState
      nodeId: QuarantineNodeId
      isolation: QuarantineIsolation
    }
  | { ok: false; state: GameState; code: FacilityStockQuarantineFailureCode }

export type FacilityStockQuarantineResolveResult =
  | {
      ok: true
      state: GameState
      nodeId: QuarantineNodeId
      isolation: QuarantineIsolation
      separation: Extract<QuarantineSeparation, 'separated'>
    }
  | {
      ok: true
      state: GameState
      nodeId: QuarantineNodeId
      separation: Extract<QuarantineSeparation, 'unknown'>
    }
  | { ok: false; state: GameState; code: FacilityStockQuarantineFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isQuarantineNodeId(value: unknown): value is QuarantineNodeId {
  return QUARANTINE_NODE_IDS.some((nodeId) => nodeId === value)
}

export function isQuarantineIsolation(value: unknown): value is QuarantineIsolation {
  return QUARANTINE_ISOLATIONS.some((isolation) => isolation === value)
}

function snapshotFacilityStockQuarantine(
  nodes: FacilityStockQuarantine
): FacilityStockQuarantine | undefined {
  const next: FacilityStockQuarantine = {}
  for (const nodeId of QUARANTINE_NODE_IDS) {
    if (!hasOwnEnumerableProperty(nodes as Record<string, unknown>, nodeId)) continue
    const isolation = nodes[nodeId]
    if (!isQuarantineIsolation(isolation)) continue
    next[nodeId] = isolation
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityStockQuarantine`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, and invalid-isolation
 * siblings drop independently. Valid siblings insert in authored node-id order.
 */
export function parseFacilityStockQuarantine(value: unknown): FacilityStockQuarantine | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityStockQuarantine = {}
  for (const nodeId of QUARANTINE_NODE_IDS) {
    if (!hasOwnEnumerableProperty(value, nodeId)) continue
    const isolation = value[nodeId]
    if (!isQuarantineIsolation(isolation)) continue
    next[nodeId] = isolation
  }
  return snapshotFacilityStockQuarantine(next)
}

function readNodeId(input: unknown): QuarantineNodeId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'nodeId')) return undefined
  return isQuarantineNodeId(input.nodeId) ? input.nodeId : undefined
}

function readIsolation(input: unknown): QuarantineIsolation | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'isolation')) return undefined
  return isQuarantineIsolation(input.isolation) ? input.isolation : undefined
}

function writeFacilityStockQuarantine(
  state: GameState,
  nodeId: QuarantineNodeId,
  isolation: QuarantineIsolation
): GameState | undefined {
  const current = parseFacilityStockQuarantine(state.facilityStockQuarantine) ?? {}
  const facilityStockQuarantine = snapshotFacilityStockQuarantine({
    ...current,
    [nodeId]: isolation,
  })
  if (!facilityStockQuarantine) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilityStockQuarantine,
  }
}

function oppositeIsolation(isolation: QuarantineIsolation): QuarantineIsolation {
  switch (isolation) {
    case QUARANTINED_ISOLATION:
      return CLEAN_ISOLATION
    case CLEAN_ISOLATION:
      return QUARANTINED_ISOLATION
    default: {
      const exhaustive: never = isolation
      void exhaustive
      return CLEAN_ISOLATION
    }
  }
}

/**
 * Stamp compact isolation on one authored quarantine node.
 * Unknown or malformed node input fail-closes `invalid_node`. Unknown or
 * malformed isolation fail-closes `invalid_isolation`. Stamping the opposite
 * isolation onto an already-stamped node fail-closes `mix_mismatch`. Failures
 * keep the original state reference. Success does not debit `facilityStockpile`
 * or catalog `inventory`.
 */
export function stampFacilityQuarantine(
  state: GameState,
  input: unknown
): FacilityStockQuarantineStampResult {
  const nodeId = readNodeId(input)
  if (!nodeId) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const isolation = readIsolation(input)
  if (!isolation) {
    return { ok: false, state, code: 'invalid_isolation' }
  }

  const current = parseFacilityStockQuarantine(state.facilityStockQuarantine)
  const existing = current?.[nodeId]
  if (existing !== undefined && existing === oppositeIsolation(isolation)) {
    return { ok: false, state, code: 'mix_mismatch' }
  }

  const nextState = writeFacilityStockQuarantine(state, nodeId, isolation)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_node' }
  }

  return {
    ok: true,
    state: nextState,
    nodeId,
    isolation,
  }
}

/**
 * Resolve whether an incoming isolation stays separated from the authored
 * quarantine node. Unknown or malformed node input fail-closes `invalid_node`.
 * Unknown or malformed isolation fail-closes `invalid_isolation`. Omit or
 * absent resolves `unknown` (not mixed and not clean). Matching isolation
 * resolves `separated`. Opposite isolation fail-closes `mix_mismatch`.
 * Read-only: returns the same state reference and does not stamp.
 */
export function resolveFacilityQuarantineSeparation(
  state: GameState,
  input: unknown
): FacilityStockQuarantineResolveResult {
  const nodeId = readNodeId(input)
  if (!nodeId) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const isolation = readIsolation(input)
  if (!isolation) {
    return { ok: false, state, code: 'invalid_isolation' }
  }

  const nodes = parseFacilityStockQuarantine(state.facilityStockQuarantine)
  const stamped = nodes?.[nodeId]
  if (stamped === undefined) {
    return {
      ok: true,
      state,
      nodeId,
      separation: 'unknown',
    }
  }

  if (stamped === oppositeIsolation(isolation)) {
    return { ok: false, state, code: 'mix_mismatch' }
  }

  return {
    ok: true,
    state,
    nodeId,
    isolation: stamped,
    separation: 'separated',
  }
}
