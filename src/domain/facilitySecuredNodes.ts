/** SPE-2933 / SPE-1027 authored secured-node stored-content threat scoring. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const RELIC_VAULT_NODE_ID = 'relic_vault' as const

export const SECURED_NODE_IDS = [RELIC_VAULT_NODE_ID] as const
export type SecuredNodeId = (typeof SECURED_NODE_IDS)[number]

export const MUNDANE_RECORDS_CONTENT_ID = 'mundane_records' as const
export const ANOMALOUS_RELIC_CONTENT_ID = 'anomalous_relic' as const

export const SECURED_NODE_CONTENT_IDS = [
  MUNDANE_RECORDS_CONTENT_ID,
  ANOMALOUS_RELIC_CONTENT_ID,
] as const
export type SecuredNodeContentId = (typeof SECURED_NODE_CONTENT_IDS)[number]

export type FacilitySecuredNodes = Partial<Record<SecuredNodeId, SecuredNodeContentId>>

export type SecuredNodeThreatBand = 'unknown' | 'low' | 'elevated'

export type FacilitySecuredNodeFailureCode = 'invalid_node' | 'invalid_content'

export type FacilitySecuredNodeStampResult =
  | {
      ok: true
      state: GameState
      nodeId: SecuredNodeId
      contentId: SecuredNodeContentId
    }
  | { ok: false; state: GameState; code: FacilitySecuredNodeFailureCode }

export type FacilitySecuredNodeResolveResult =
  | {
      ok: true
      state: GameState
      nodeId: SecuredNodeId
      threatAttraction: 'unknown'
      theftExposure: 'unknown'
      accessRisk: 'unknown'
    }
  | {
      ok: true
      state: GameState
      nodeId: SecuredNodeId
      contentId: SecuredNodeContentId
      threatAttraction: Exclude<SecuredNodeThreatBand, 'unknown'>
      theftExposure: Exclude<SecuredNodeThreatBand, 'unknown'>
      accessRisk: Exclude<SecuredNodeThreatBand, 'unknown'>
    }
  | { ok: false; state: GameState; code: 'invalid_node' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isSecuredNodeId(value: unknown): value is SecuredNodeId {
  return SECURED_NODE_IDS.some((nodeId) => nodeId === value)
}

export function isSecuredNodeContentId(value: unknown): value is SecuredNodeContentId {
  return SECURED_NODE_CONTENT_IDS.some((contentId) => contentId === value)
}

function snapshotFacilitySecuredNodes(
  nodes: FacilitySecuredNodes
): FacilitySecuredNodes | undefined {
  const next: FacilitySecuredNodes = {}
  for (const nodeId of SECURED_NODE_IDS) {
    if (!hasOwnEnumerableProperty(nodes as Record<string, unknown>, nodeId)) continue
    const contentId = nodes[nodeId]
    if (!isSecuredNodeContentId(contentId)) continue
    next[nodeId] = contentId
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilitySecuredNodes`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, and invalid-content
 * siblings drop independently. Valid siblings insert in authored node-id order.
 */
export function parseFacilitySecuredNodes(value: unknown): FacilitySecuredNodes | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilitySecuredNodes = {}
  for (const nodeId of SECURED_NODE_IDS) {
    if (!hasOwnEnumerableProperty(value, nodeId)) continue
    const contentId = value[nodeId]
    if (!isSecuredNodeContentId(contentId)) continue
    next[nodeId] = contentId
  }
  return snapshotFacilitySecuredNodes(next)
}

function readNodeId(input: unknown): SecuredNodeId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'nodeId')) return undefined
  return isSecuredNodeId(input.nodeId) ? input.nodeId : undefined
}

function readContentId(input: unknown): SecuredNodeContentId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'contentId')) return undefined
  return isSecuredNodeContentId(input.contentId) ? input.contentId : undefined
}

function writeSecuredNodeContents(
  state: GameState,
  nodeId: SecuredNodeId,
  contentId: SecuredNodeContentId
): GameState | undefined {
  const current = parseFacilitySecuredNodes(state.facilitySecuredNodes) ?? {}
  const facilitySecuredNodes = snapshotFacilitySecuredNodes({
    ...current,
    [nodeId]: contentId,
  })
  if (!facilitySecuredNodes) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilitySecuredNodes,
  }
}

function threatBandsForContent(contentId: SecuredNodeContentId): {
  threatAttraction: Exclude<SecuredNodeThreatBand, 'unknown'>
  theftExposure: Exclude<SecuredNodeThreatBand, 'unknown'>
  accessRisk: Exclude<SecuredNodeThreatBand, 'unknown'>
} {
  switch (contentId) {
    case MUNDANE_RECORDS_CONTENT_ID:
      return {
        threatAttraction: 'low',
        theftExposure: 'low',
        accessRisk: 'low',
      }
    case ANOMALOUS_RELIC_CONTENT_ID:
      return {
        threatAttraction: 'elevated',
        theftExposure: 'elevated',
        accessRisk: 'elevated',
      }
    default: {
      const exhaustive: never = contentId
      void exhaustive
      return {
        threatAttraction: 'low',
        theftExposure: 'low',
        accessRisk: 'low',
      }
    }
  }
}

/**
 * Stamp compact stored content on one authored secured node.
 * Unknown or malformed node input fail-closes `invalid_node`. Unknown or
 * malformed content fail-closes `invalid_content`. Failures keep the original
 * state reference. Success does not debit `facilityStockpile` or catalog
 * `inventory`.
 */
export function stampSecuredNodeContents(
  state: GameState,
  input: unknown
): FacilitySecuredNodeStampResult {
  const nodeId = readNodeId(input)
  if (!nodeId) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const contentId = readContentId(input)
  if (!contentId) {
    return { ok: false, state, code: 'invalid_content' }
  }

  const nextState = writeSecuredNodeContents(state, nodeId, contentId)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_node' }
  }

  return {
    ok: true,
    state: nextState,
    nodeId,
    contentId,
  }
}

/**
 * Resolve content-dependent threat attraction, theft exposure, and access risk
 * for one authored secured node. Unknown or malformed node input fail-closes
 * `invalid_node`. Omit or absent resolves all bands as `unknown`. Read-only:
 * returns the same state reference and does not stamp.
 */
export function resolveSecuredNodeThreat(
  state: GameState,
  input: unknown
): FacilitySecuredNodeResolveResult {
  const nodeId = readNodeId(input)
  if (!nodeId) {
    return { ok: false, state, code: 'invalid_node' }
  }

  const nodes = parseFacilitySecuredNodes(state.facilitySecuredNodes)
  const contentId = nodes?.[nodeId]
  if (contentId === undefined) {
    return {
      ok: true,
      state,
      nodeId,
      threatAttraction: 'unknown',
      theftExposure: 'unknown',
      accessRisk: 'unknown',
    }
  }

  return {
    ok: true,
    state,
    nodeId,
    contentId,
    ...threatBandsForContent(contentId),
  }
}
