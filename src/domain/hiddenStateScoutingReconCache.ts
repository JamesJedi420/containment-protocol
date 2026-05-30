/**
 * SPE-2284 slice 4: persistent known-but-unresolved hidden-state scouting recon cache.
 */

import type { DetectionScanResult } from './revealPayload'
import type { CaseInstance } from './models'
import type { GameState } from './models'
import {
  evaluateHiddenStateScoutingWithRevealPayload,
} from './revealPayloadScoutingIntegration'
import { evaluateBehaviorWeightedDisguiseValidation } from './disguiseValidation'
import { buildDisguiseRevealSubjectFromCase } from './revealPayloadDisguiseIntegration'

export interface HiddenStateScoutingReconCache {
  /** Concealment layer ids still blocking tiers after a partial scan. */
  readonly knownUnresolvedLayerIds: readonly string[]
  /** Count of weekly passes that recorded cache state. */
  readonly scoutingPassCount: number
  readonly lastUpdatedWeek: number
}

export function isKnownButUnresolvedHiddenStateScan(scan: DetectionScanResult): boolean {
  return scan.fields.length > 0 && scan.remainingConcealmentLayers.length > 0
}

export function mergeHiddenStateScoutingReconCache(
  caseData: CaseInstance,
  scan: DetectionScanResult,
  week: number
): CaseInstance {
  if (!isKnownButUnresolvedHiddenStateScan(scan)) {
    return caseData
  }

  const knownUnresolvedLayerIds = scan.remainingConcealmentLayers
    .map((layer) => layer.id)
    .sort((left, right) => left.localeCompare(right))
  const previous = caseData.hiddenStateScoutingReconCache

  return {
    ...caseData,
    hiddenStateScoutingReconCache: {
      knownUnresolvedLayerIds,
      scoutingPassCount: (previous?.scoutingPassCount ?? 0) + 1,
      lastUpdatedWeek: week,
    },
  }
}

/** Extra layer peel on follow-up passes when prior partial readouts left unresolved nodes. */
export function extraLayersToStripFromReconCache(caseData: CaseInstance): number {
  const cache = caseData.hiddenStateScoutingReconCache
  if (cache === undefined || cache.knownUnresolvedLayerIds.length === 0) {
    return 0
  }

  if (cache.scoutingPassCount < 1) {
    return 0
  }

  return 1
}

export interface HiddenStateScoutingReconCacheScoreAdjustment {
  readonly delta: number
  readonly reason?: string
}

export function scoutingReconCacheScoreAdjustment(
  caseData: CaseInstance
): HiddenStateScoutingReconCacheScoreAdjustment {
  const cache = caseData.hiddenStateScoutingReconCache
  if (cache === undefined || cache.knownUnresolvedLayerIds.length === 0) {
    return { delta: 0 }
  }

  if (cache.scoutingPassCount < 2) {
    return { delta: 0 }
  }

  const nodeCount = cache.knownUnresolvedLayerIds.length

  return {
    delta: 0.35,
    reason: `Prior recon: ${nodeCount} unresolved concealment node${nodeCount === 1 ? '' : 's'} — route caution.`,
  }
}

export function applyHiddenStateScoutingReconCacheToCase(
  caseData: CaseInstance,
  scan: DetectionScanResult | undefined,
  week: number
): CaseInstance {
  if (scan === undefined) {
    return caseData
  }

  return mergeHiddenStateScoutingReconCache(caseData, scan, week)
}

/** In-progress weekly pass: record scouting + cache without full mission resolution. */
export function applyWeeklyHiddenStateScoutingReconPass(
  state: GameState,
  caseData: CaseInstance,
  assignedTeamIds: readonly string[]
): CaseInstance {
  const agents = assignedTeamIds.flatMap((teamId) => {
    const team = state.teams[teamId]
    if (team === undefined) {
      return []
    }

    return team.agentIds
      .map((agentId) => state.agents[agentId])
      .filter((agent): agent is NonNullable<typeof agent> => agent !== undefined)
  })

  if (agents.length === 0) {
    return caseData
  }

  const supportTags = [
    ...new Set(assignedTeamIds.flatMap((teamId) => state.teams[teamId]?.tags ?? [])),
  ]
  const disguiseValidation = evaluateBehaviorWeightedDisguiseValidation({
    caseData,
    agents,
    subject: buildDisguiseRevealSubjectFromCase(caseData),
    context: {
      supportTags,
      teamTags: supportTags,
      infiltrationAwareness: caseData.infiltrationAwareness,
    },
  })
  const hiddenStateScouting = evaluateHiddenStateScoutingWithRevealPayload({
    caseData,
    agents,
    teamTags: supportTags,
    disguiseValidationActive: disguiseValidation.active,
  })

  if (hiddenStateScouting === undefined) {
    return caseData
  }

  return mergeHiddenStateScoutingReconCache(
    caseData,
    hiddenStateScouting.detectionScan,
    state.week
  )
}
