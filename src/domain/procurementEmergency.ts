// SPE-1524: Crisis gray-market waiver (sanctioned posture) + audit event + legitimacy fallout trace.
// SPE-1511: Institution key on audit payload.
// SPE-849: Explicit authority routing (baseline self-authorization vs oversight clearance ratification).
// SPE-1184: Weekly fallout tick + bounded regulatory-arbitrage + rule-conflict signals on waiver audit (deterministic).
import type { AnyOperationEventDraft } from './events/eventBus'
import { appendOperationEventDrafts } from './events'
import { clamp } from './math'
import type { GameState, LegitimacyState } from './models'
import {
  AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION,
  resolveEmergencyGrayMarketWaiverAuthority,
} from './procurementEmergencyAuthority'
import {
  getEmergencyWaiverFalloutPrecedentPenaltyMultiplier,
} from './procurementEmergencyFallout'
import { getEmergencyProcurementInstitutionAuditKey } from './procurementEmergencyInstitution'
import { buildRivalPressure } from './rivalPressure'
import { buildMajorIncidentState } from './strategicState'
import { normalizeGameState } from './teamSimulation'

function isSanctionedPosture(game: Pick<GameState, 'legitimacy'>): boolean {
  return (game.legitimacy?.sanctionLevel ?? 'tolerated') === 'sanctioned'
}

/** SPE-1184: explicit bounded arbitrage detection on the emergency waiver path (institution/clearance routing, not a general engine). */
export type EmergencyWaiverRegulatoryArbitrageSignal = 'none' | 'cross_institution_clearance_route'

export function resolveEmergencyWaiverRegulatoryArbitrageSignal(
  authorityRoute: string
): EmergencyWaiverRegulatoryArbitrageSignal {
  return authorityRoute === AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION
    ? 'cross_institution_clearance_route'
    : 'none'
}

/** SPE-1184: bounded rule-conflict surfacing (sanctioned procurement channel vs crisis waiver — not a general engine). */
export type EmergencyWaiverRuleConflictSignal =
  | 'none'
  | 'sanctioned_procurement_vs_crisis_waiver'

export function resolveEmergencyWaiverRuleConflictSignal(
  majorIncidentSeverity: 'watch' | 'danger' | 'crisis',
  sanctionLevel: LegitimacyState['sanctionLevel'] | undefined
): EmergencyWaiverRuleConflictSignal {
  if (sanctionLevel === 'sanctioned' && majorIncidentSeverity === 'crisis') {
    return 'sanctioned_procurement_vs_crisis_waiver'
  }
  return 'none'
}

/** True when crisis pressure qualifies and posture is sanctioned; waiver not yet granted this week. */
export function canInvokeEmergencyGrayMarketWaiver(game: GameState): boolean {
  if (game.legitimacy?.falloutRisk === 'costly') {
    return false
  }
  const authority = resolveEmergencyGrayMarketWaiverAuthority(game)
  if (!authority.eligible) {
    return false
  }
  if (buildMajorIncidentState(game).severity !== 'crisis') {
    return false
  }
  if (!isSanctionedPosture(game)) {
    return false
  }
  if (game.emergencyGrayMarketWaiverWeek === game.week) {
    return false
  }
  return true
}

/**
 * Grants a single-week emergency waiver unlocking gray-market broker listings for sanctioned posture.
 * Appends an audit event and marks legitimacy fallout. No-op when `canInvokeEmergencyGrayMarketWaiver` is false.
 */
export function invokeEmergencyGrayMarketWaiver(game: GameState): GameState {
  if (!canInvokeEmergencyGrayMarketWaiver(game)) {
    return game
  }

  const incidentState = buildMajorIncidentState(game)
  const authority = resolveEmergencyGrayMarketWaiverAuthority(game)
  const waiverPrecedentCount = (game.emergencyGrayMarketWaiverPrecedentCount ?? 0) + 1
  const regulatoryArbitrageSignal = resolveEmergencyWaiverRegulatoryArbitrageSignal(
    authority.authorityRoute
  )
  const ruleConflictSignal = resolveEmergencyWaiverRuleConflictSignal(
    incidentState.severity,
    game.legitimacy?.sanctionLevel
  )

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...game,
        emergencyGrayMarketWaiverWeek: game.week,
        emergencyGrayMarketWaiverPrecedentCount: waiverPrecedentCount,
        legitimacy: {
          ...game.legitimacy,
          falloutRisk: 'risk',
        },
      },
      [
        {
          type: 'market.emergency_gray_market_waiver_granted',
          sourceSystem: 'production',
          payload: {
            week: game.week,
            marketWeek: game.week,
            crisisPressureScore: incidentState.pressureScore,
            sanctionLevel: 'sanctioned',
            packetId: 'gray_market_broker',
            falloutRiskApplied: 'risk',
            waiverPrecedentCount,
            institutionKey: getEmergencyProcurementInstitutionAuditKey(game),
            authorityRoute: authority.authorityRoute,
            authorityBasis: authority.authorityBasis,
            regulatoryArbitrageSignal,
            ruleConflictSignal,
          },
        },
      ]
    )
  )
}

/**
 * Deterministic weekly fallout for emergency waiver legitimacy pressure (SPE-1184).
 * Phase 1: `risk` → `costly` with bounded funding + containment pressure.
 * Phase 2: `costly` → cleared (`none`) with stronger bounded penalties.
 * Penalty bands scale with `emergencyGrayMarketWaiverPrecedentCount` (bounded steps).
 */
export function applyEmergencyGrayMarketFalloutTick(
  sourceState: GameState,
  nextStateDraft: GameState
): { nextState: GameState; drafts: AnyOperationEventDraft[] } {
  const falloutRisk = sourceState.legitimacy?.falloutRisk ?? 'none'
  if (falloutRisk !== 'risk' && falloutRisk !== 'costly') {
    return { nextState: nextStateDraft, drafts: [] }
  }

  const fundingBefore = nextStateDraft.funding
  const containmentBefore = nextStateDraft.containmentRating ?? 0
  const institutionKey = getEmergencyProcurementInstitutionAuditKey(nextStateDraft)
  const waiverPrecedentCount = clamp(nextStateDraft.emergencyGrayMarketWaiverPrecedentCount ?? 1, 1, 50000)
  const precedentPenaltyMultiplier = getEmergencyWaiverFalloutPrecedentPenaltyMultiplier(
    waiverPrecedentCount
  )
  // Standing scale from source-week ranking; compose with precedent (do not fold into it).
  const rivalPressure = buildRivalPressure(sourceState)
  const rankingScore = rivalPressure.rankingScore
  const standingFalloutPenaltyScale = rivalPressure.falloutPenaltyScale
  const combinedPenaltyMultiplier = precedentPenaltyMultiplier * standingFalloutPenaltyScale

  const baseLegitimacy: LegitimacyState = {
    sanctionLevel: nextStateDraft.legitimacy?.sanctionLevel ?? 'tolerated',
    ...(nextStateDraft.legitimacy?.accessReason !== undefined
      ? { accessReason: nextStateDraft.legitimacy.accessReason }
      : {}),
  }

  if (falloutRisk === 'risk') {
    const rawPenalty = Math.floor(fundingBefore * 0.052 * combinedPenaltyMultiplier)
    const fundingPenalty = Math.min(
      fundingBefore,
      clamp(rawPenalty, fundingBefore > 0 ? 1 : 0, 320)
    )
    const fundingAfter = Math.max(0, fundingBefore - fundingPenalty)
    const containmentMagnitude = Math.ceil((containmentBefore / 28) * combinedPenaltyMultiplier)
    const containmentDelta = -clamp(containmentMagnitude, 1, 4)
    const containmentAfter = clamp(containmentBefore + containmentDelta, 0, 100)

    const draft: AnyOperationEventDraft = {
      type: 'market.emergency_gray_market_fallout_tick',
      sourceSystem: 'production',
      payload: {
        week: nextStateDraft.week,
        outcome: 'escalated_pending_oversight',
        falloutRiskBefore: 'risk',
        falloutRiskAfter: 'costly',
        fundingBefore,
        fundingAfter,
        containmentRatingBefore: containmentBefore,
        containmentRatingAfter: containmentAfter,
        waiverPrecedentCount,
        precedentPenaltyMultiplier,
        rankingScore,
        standingFalloutPenaltyScale,
        institutionKey,
      },
    }

    return {
      nextState: {
        ...nextStateDraft,
        funding: fundingAfter,
        containmentRating: containmentAfter,
        legitimacy: {
          ...baseLegitimacy,
          falloutRisk: 'costly',
        },
      },
      drafts: [draft],
    }
  }

  const rawPenalty = Math.floor(fundingBefore * 0.088 * combinedPenaltyMultiplier)
  const fundingPenalty = Math.min(
    fundingBefore,
    clamp(rawPenalty, fundingBefore > 0 ? 2 : 0, 520)
  )
  const fundingAfter = Math.max(0, fundingBefore - fundingPenalty)
  const containmentMagnitude = Math.ceil((containmentBefore / 20) * combinedPenaltyMultiplier)
  const containmentDelta = -clamp(containmentMagnitude, 2, 6)
  const containmentAfter = clamp(containmentBefore + containmentDelta, 0, 100)

  const draft: AnyOperationEventDraft = {
    type: 'market.emergency_gray_market_fallout_tick',
    sourceSystem: 'production',
    payload: {
      week: nextStateDraft.week,
      outcome: 'resolved_closed',
      falloutRiskBefore: 'costly',
      falloutRiskAfter: 'none',
      fundingBefore,
      fundingAfter,
      containmentRatingBefore: containmentBefore,
      containmentRatingAfter: containmentAfter,
      waiverPrecedentCount,
      precedentPenaltyMultiplier,
      rankingScore,
      standingFalloutPenaltyScale,
      institutionKey,
    },
  }

  return {
    nextState: {
      ...nextStateDraft,
      funding: fundingAfter,
      containmentRating: containmentAfter,
      legitimacy: {
        ...baseLegitimacy,
        falloutRisk: 'none',
      },
    },
    drafts: [draft],
  }
}
