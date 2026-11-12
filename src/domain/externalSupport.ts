// SPE-93: External support reliability and trust state
// Pure, deterministic functions. No side effects — all state mutation belongs in the store.

import type { ExternalSupportAsset, ExternalAssetTrustBand, FactionRuntimeState } from './models'
import {
  normalizeAuthorityNodeId,
  resolveAuthorityGraphConsequences,
  type AuthorityGraph,
  type AuthorityGraphEdge,
} from './authorityGraph'
import { sanitizeAuthorityGraphState } from './authorityGraphPersistence'
import { applyTrustFailureDriftScale } from './rivalPressure'

// ---------------------------------------------------------------------------
// Trust band derivation (read-time, never stored)
// ---------------------------------------------------------------------------

/**
 * Derives a trust band from a raw reliability value (0–100).
 * high ≥ 70 | moderate ≥ 40 | degraded ≥ 15 | failed < 15
 */
export function deriveAssetTrustBand(reliability: number): ExternalAssetTrustBand {
  if (reliability >= 70) return 'high'
  if (reliability >= 40) return 'moderate'
  if (reliability >= 15) return 'degraded'
  return 'failed'
}

// ---------------------------------------------------------------------------
// Reliability drift
// ---------------------------------------------------------------------------

export type AssetDriftTrigger =
  | 'support_delivered'   // successful support outcome → +reliability
  | 'support_failed'      // asset failed to deliver → −reliability
  | 'support_partial'     // partial delivery → slight decay
  | 'week_idle'           // no task this week → slight passive decay

const DRIFT_TABLE: Record<AssetDriftTrigger, number> = {
  support_delivered: +12,
  support_failed: -20,
  support_partial: -6,
  week_idle: -3,
}

export interface AssetReliabilityDriftOptions {
  /** Standing-shaped scale from {@link buildRivalPressure}; defaults to 1 (neutral). */
  trustFailureDriftScale?: number
}

export interface PersistedExternalSupportAuthorityState {
  week: number
  authorityGraphState?: unknown
  factions?: Record<string, FactionRuntimeState>
}

export interface ExternalSupportAuthorityConsequence {
  assetId: string
  authorityNodeId: string
  factionId: string
  edgeId: string
  reasonCode: string
  magnitude: number
  reputationDelta: -1 | 1
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function edgeInvolvesPair(edge: AuthorityGraphEdge, actorNodeId: string, factionNodeId: string) {
  const nodeIds = [edge.fromNodeId, edge.toNodeId, edge.representsNodeId].filter(
    (value): value is string => value !== undefined
  )
  return nodeIds.includes(actorNodeId) && nodeIds.includes(factionNodeId)
}

function resolveLiveFactionReference(
  graph: AuthorityGraph,
  factions: Record<string, FactionRuntimeState>,
  factionRef: string
) {
  const factionNodeId = normalizeAuthorityNodeId(graph, factionRef)
  if (!factionNodeId) {
    return null
  }
  const factionNode = graph.nodes.find((node) => node.id === factionNodeId)
  if (factionNode?.nodeType !== 'faction') {
    return null
  }

  if (factions[factionRef]) {
    return { factionId: factionRef, factionNodeId }
  }

  if (factions[factionNodeId]) {
    return { factionId: factionNodeId, factionNodeId }
  }

  return null
}

/**
 * SPE-2722: sanitized, read-only graph seam for the existing contractor support path.
 *
 * The contractor ID may be a canonical authority node ID or an alias. The matched node must
 * explicitly link a live faction, and one eligible edge is considered at a time in code-unit ID
 * order so unrelated graph records cannot aggregate into the bounded reputation consequence.
 */
export function resolvePersistedExternalSupportAuthorityConsequence(
  state: PersistedExternalSupportAuthorityState,
  asset: ExternalSupportAsset
): ExternalSupportAuthorityConsequence | null {
  if (asset.assetClass !== 'contractor') {
    return null
  }

  if (
    asset.lastAuthorityConsequenceWeek !== undefined &&
    asset.lastAuthorityConsequenceWeek >= state.week
  ) {
    return null
  }

  const authorityGraphState = sanitizeAuthorityGraphState(state.authorityGraphState)
  const graph = authorityGraphState.graph
  const authorityNodeId = normalizeAuthorityNodeId(graph, asset.id)
  const factions = state.factions ?? {}
  if (!authorityNodeId || Object.keys(factions).length === 0) {
    return null
  }

  const assetNode = graph.nodes.find((node) => node.id === authorityNodeId)
  if (assetNode?.nodeType !== 'contractor') {
    return null
  }

  const factionRefs = [...new Set(assetNode.linkedFactionIds ?? [])].sort(compareCodeUnits)
  for (const factionRef of factionRefs) {
    const liveFaction = resolveLiveFactionReference(graph, factions, factionRef)
    if (!liveFaction) {
      continue
    }

    const eligibleEdges = graph.edges
      .filter((edge) => edgeInvolvesPair(edge, authorityNodeId, liveFaction.factionNodeId))
      .sort((left, right) => compareCodeUnits(left.id, right.id))

    for (const edge of eligibleEdges) {
      const consequence = resolveAuthorityGraphConsequences(
        { nodes: graph.nodes, edges: [edge] },
        {
          actorNodeId: authorityNodeId,
          counterpartyNodeId: liveFaction.factionNodeId,
          channel: 'aid',
          asOfWeek: state.week,
        }
      ).find((entry) => entry.magnitude !== 0 && !entry.delayed && !entry.contradicted)

      if (!consequence) {
        continue
      }

      const reputationDelta =
        consequence.effect === 'deny' || consequence.magnitude < 0
          ? -1
          : consequence.effect === 'grant' || consequence.effect === 'modify'
            ? 1
            : null
      if (reputationDelta === null) {
        continue
      }

      return Object.freeze({
        assetId: asset.id,
        authorityNodeId,
        factionId: liveFaction.factionId,
        edgeId: edge.id,
        reasonCode: consequence.reasonCode,
        magnitude: consequence.magnitude,
        reputationDelta,
      })
    }
  }

  return null
}

/**
 * Returns an updated asset after applying a reliability drift trigger.
 * Deterministic — no RNG needed; trigger table drives the delta.
 * Negative deltas may be scaled by agency standing forgiveness (SPE-2700).
 * Returns the updated asset and a human-readable reason fragment.
 */
export function applyAssetReliabilityDrift(
  asset: ExternalSupportAsset,
  trigger: AssetDriftTrigger,
  options?: AssetReliabilityDriftOptions
): { asset: ExternalSupportAsset; driftReason: string } {
  const baseDelta = DRIFT_TABLE[trigger]
  const delta = applyTrustFailureDriftScale(baseDelta, options?.trustFailureDriftScale ?? 1)
  const next = Math.max(0, Math.min(100, asset.reliability + delta))
  const prevBand = deriveAssetTrustBand(asset.reliability)
  const nextBand = deriveAssetTrustBand(next)

  const directionLabel = delta > 0 ? 'improved' : delta < 0 ? 'degraded' : 'unchanged'
  const bandNote =
    prevBand !== nextBand ? ` (trust: ${prevBand} → ${nextBand})` : ''
  const driftReason = `${asset.label} reliability ${directionLabel} after ${trigger.replace(/_/g, ' ')}${bandNote}.`

  return {
    asset: { ...asset, reliability: next, lastDriftReason: driftReason },
    driftReason,
  }
}

// ---------------------------------------------------------------------------
// Support outcome resolution
// ---------------------------------------------------------------------------

/**
 * Modifies a base support score using the asset's current reliability.
 *
 * Mapping:
 *   high     → +2 to base score, full support delivered
 *   moderate → +1 to base score, partial uplift
 *   degraded →  0 modifier, no net benefit
 *   failed   → −1 to base score, disruption cost
 *
 * Returns the modified score, a drift trigger to apply after this call,
 * and a reason fragment suitable for injecting into report/note text.
 */
export function resolveAssetSupportOutcome(
  asset: ExternalSupportAsset,
  baseScore: number
): {
  modifiedScore: number
  driftTrigger: AssetDriftTrigger
  outcomeReason: string
} {
  const band = deriveAssetTrustBand(asset.reliability)

  switch (band) {
    case 'high':
      return {
        modifiedScore: baseScore + 2,
        driftTrigger: 'support_delivered',
        outcomeReason: `${asset.label} delivered reliable support (+2). Trust level: high.`,
      }
    case 'moderate':
      return {
        modifiedScore: baseScore + 1,
        driftTrigger: 'support_delivered',
        outcomeReason: `${asset.label} provided partial support (+1). Trust level: moderate.`,
      }
    case 'degraded':
      return {
        modifiedScore: baseScore,
        driftTrigger: 'support_partial',
        outcomeReason: `${asset.label} was unreliable — no net benefit. Trust level: degraded.`,
      }
    case 'failed':
      return {
        modifiedScore: baseScore - 1,
        driftTrigger: 'support_failed',
        outcomeReason: `${asset.label} failed to deliver — support disrupted (−1). Trust level: failed.`,
      }
  }
}

// ---------------------------------------------------------------------------
// Asset factory helper
// ---------------------------------------------------------------------------

/**
 * Creates a new contractor asset with a given starting reliability.
 * ID must be supplied by the caller (derived from seeded RNG in the store path).
 */
export function createContractorAsset(
  id: string,
  label: string,
  startingReliability: number,
  tags: string[] = []
): ExternalSupportAsset {
  return {
    id,
    label,
    assetClass: 'contractor',
    reliability: Math.max(0, Math.min(100, startingReliability)),
    tags,
  }
}
