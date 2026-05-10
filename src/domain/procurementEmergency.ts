// SPE-1524: Crisis gray-market waiver (sanctioned posture) + audit event + legitimacy fallout trace.
// SPE-1511: Institution key on audit payload.
// SPE-849: Explicit authority routing (baseline self-authorization vs oversight clearance ratification).
// SPE-1184: Weekly fallout tick + bounded regulatory-arbitrage signal on waiver audit (deterministic).
import type { AnyOperationEventDraft } from './events/eventBus'
import { appendOperationEventDrafts } from './events'
import { clamp } from './math'
import type { GameState, LegitimacyState } from './models'
import {
  AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION,
  resolveEmergencyGrayMarketWaiverAuthority,
} from './procurementEmergencyAuthority'
import { getEmergencyProcurementInstitutionAuditKey } from './procurementEmergencyInstitution'
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
            marketWeek: game.market.week,
            crisisPressureScore: incidentState.pressureScore,
            sanctionLevel: 'sanctioned',
            packetId: 'gray_market_broker',
            falloutRiskApplied: 'risk',
            waiverPrecedentCount,
            institutionKey: getEmergencyProcurementInstitutionAuditKey(game),
            authorityRoute: authority.authorityRoute,
            authorityBasis: authority.authorityBasis,
            regulatoryArbitrageSignal,
          },
        },
      ]
    )
  )
}

/** Max extra precedent steps that tighten fallout (beyond first waiver); caps abuse scaling (SPE-1184). */
const FALLOUT_PRECEDENT_PRESSURE_MAX_EXTRA_STEPS = 6

/** Per-step pressure on funding/containment penalty magnitude (+6% per step over baseline waiver). */
const FALLOUT_PRECEDENT_PRESSURE_STEP = 0.06

function emergencyWaiverFalloutPrecedentPressureMultiplier(precedentCount: number): number {
  const baseline = clamp(precedentCount > 0 ? precedentCount : 1, 1, 50000)
  const extraSteps = Math.min(Math.max(0, baseline - 1), FALLOUT_PRECEDENT_PRESSURE_MAX_EXTRA_STEPS)
  return 1 + FALLOUT_PRECEDENT_PRESSURE_STEP * extraSteps
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
  const precedentPenaltyMultiplier = emergencyWaiverFalloutPrecedentPressureMultiplier(
    waiverPrecedentCount
  )
  const multiplierRounded = Math.round(precedentPenaltyMultiplier * 1000) / 1000

  const baseLegitimacy: LegitimacyState = {
    sanctionLevel: nextStateDraft.legitimacy?.sanctionLevel ?? 'tolerated',
    ...(nextStateDraft.legitimacy?.accessReason !== undefined
      ? { accessReason: nextStateDraft.legitimacy.accessReason }
      : {}),
  }

  if (falloutRisk === 'risk') {
    const rawPenalty = Math.floor(fundingBefore * 0.052 * precedentPenaltyMultiplier)
    const fundingPenalty = Math.min(
      fundingBefore,
      clamp(rawPenalty, fundingBefore > 0 ? 1 : 0, 320)
    )
    const fundingAfter = Math.max(0, fundingBefore - fundingPenalty)
    const containmentMagnitude = Math.ceil((containmentBefore / 28) * precedentPenaltyMultiplier)
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
        precedentPenaltyMultiplier: multiplierRounded,
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

  const rawPenalty = Math.floor(fundingBefore * 0.088 * precedentPenaltyMultiplier)
  const fundingPenalty = Math.min(
    fundingBefore,
    clamp(rawPenalty, fundingBefore > 0 ? 2 : 0, 520)
  )
  const fundingAfter = Math.max(0, fundingBefore - fundingPenalty)
  const containmentMagnitude = Math.ceil((containmentBefore / 20) * precedentPenaltyMultiplier)
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
      precedentPenaltyMultiplier: multiplierRounded,
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
