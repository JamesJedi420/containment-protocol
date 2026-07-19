/**
 * SPE-2639 / SPE-956: Parent AC incident wire-up (slice 1).
 *
 * Pure deterministic incident path that applies advisory + hotline channels via
 * SPE-2638 evaluate*FromGameState helpers. Lanes stay parallel (no unified baseline
 * merge). Does not mutate GameState, week-close, UI, or evaluator contracts.
 */

import type {
  CommunityAdvisoryInfluenceResult,
  CommunityAdvisorySignal,
  IncidentResponseDecision,
} from './communityAdvisoryDecisionInfluence'
import {
  EXAMPLE_COMMUNITY_ADVISORY_BODY,
  EXAMPLE_INCIDENT_BASELINE,
  EXAMPLE_SUPPORT_ROUTING_SIGNAL,
} from './communityAdvisoryDecisionInfluence'
import type {
  HotlineCall,
  HotlineCallEvaluationResult,
  HotlineGuidanceBaseline,
} from './hotlineChannel'
import {
  EXAMPLE_HOTLINE_CALL,
  EXAMPLE_HOTLINE_CHANNEL,
  EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
} from './hotlineChannel'
import type { Spe956ParticipatoryChannelGameStateLike } from './spe956ParticipatoryChannelPersistence'
import {
  evaluateCommunityAdvisoryDecisionInfluenceFromGameState,
  evaluateHotlineCallFromGameState,
} from './spe956ParticipatoryChannelPersistence'

/** Shared riverside incident id for the authored SPE-956 EXAMPLE path. */
export const SPE_956_EXAMPLE_INCIDENT_ID = 'incident:riverside-site-breach' as const

export interface Spe956AdvisoryIncidentLaneInput {
  readonly bodyId: string
  readonly signal: CommunityAdvisorySignal
  readonly baseline: IncidentResponseDecision
}

export interface Spe956HotlineIncidentLaneInput {
  readonly channelId: string
  readonly call: HotlineCall
  readonly baseline: HotlineGuidanceBaseline
}

export interface Spe956ParticipatoryChannelIncidentPathInput {
  readonly incidentId: string
  readonly advisory?: Spe956AdvisoryIncidentLaneInput | null
  readonly hotline?: Spe956HotlineIncidentLaneInput | null
}

export interface Spe956ParticipatoryChannelIncidentPathResult {
  readonly incidentId: string
  readonly advisory: CommunityAdvisoryInfluenceResult | null
  readonly hotline: HotlineCallEvaluationResult | null
  readonly advisoryMaterialInfluence: boolean
  readonly hotlineMaterialInfluence: boolean
  readonly materialInfluence: boolean
  readonly reasonCodes: readonly string[]
}

function uniqueSortedReasonCodes(codes: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(codes)].sort())
}

function freezeResult(
  result: Spe956ParticipatoryChannelIncidentPathResult
): Spe956ParticipatoryChannelIncidentPathResult {
  return Object.freeze({
    ...result,
    reasonCodes: uniqueSortedReasonCodes(result.reasonCodes),
  })
}

function isAdvisoryMaterial(result: CommunityAdvisoryInfluenceResult): boolean {
  return result.disposition === 'adopted' && result.proposedAdjustment !== null
}

function isHotlineMaterial(result: HotlineCallEvaluationResult): boolean {
  return result.outcome === 'handled' && result.proposedAdjustment !== null
}

/**
 * Apply authored advisory + hotline lanes for one incident via FromGameState helpers.
 * Skips a lane when its baseline incidentId does not match the path incidentId.
 * Empty / missing channel maps yield evaluator no-ops (no material influence).
 */
export function applySpe956ParticipatoryChannelsToIncident(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  input: Spe956ParticipatoryChannelIncidentPathInput
): Spe956ParticipatoryChannelIncidentPathResult {
  const incidentId =
    typeof input.incidentId === 'string' && input.incidentId.trim().length > 0
      ? input.incidentId.trim()
      : SPE_956_EXAMPLE_INCIDENT_ID

  const reasonCodes: string[] = []
  let advisory: CommunityAdvisoryInfluenceResult | null = null
  let hotline: HotlineCallEvaluationResult | null = null

  if (input.advisory) {
    if (input.advisory.baseline.incidentId !== incidentId) {
      reasonCodes.push('advisory_incident_id_mismatch')
    } else {
      advisory = evaluateCommunityAdvisoryDecisionInfluenceFromGameState(
        game,
        input.advisory.bodyId,
        {
          signal: input.advisory.signal,
          baseline: input.advisory.baseline,
        }
      )
      reasonCodes.push(...advisory.reasonCodes)
    }
  }

  if (input.hotline) {
    if (input.hotline.baseline.incidentId !== incidentId) {
      reasonCodes.push('hotline_incident_id_mismatch')
    } else {
      hotline = evaluateHotlineCallFromGameState(game, input.hotline.channelId, {
        call: input.hotline.call,
        baseline: input.hotline.baseline,
      })
      reasonCodes.push(...hotline.reasonCodes)
    }
  }

  if (!input.advisory && !input.hotline) {
    reasonCodes.push('no_participatory_lanes')
  }

  const advisoryMaterialInfluence = advisory !== null && isAdvisoryMaterial(advisory)
  const hotlineMaterialInfluence = hotline !== null && isHotlineMaterial(hotline)

  if (advisoryMaterialInfluence) {
    reasonCodes.push('advisory_material_influence')
  }
  if (hotlineMaterialInfluence) {
    reasonCodes.push('hotline_material_influence')
  }
  if (!advisoryMaterialInfluence && !hotlineMaterialInfluence) {
    reasonCodes.push('no_material_influence')
  }

  return freezeResult({
    incidentId,
    advisory,
    hotline,
    advisoryMaterialInfluence,
    hotlineMaterialInfluence,
    materialInfluence: advisoryMaterialInfluence || hotlineMaterialInfluence,
    reasonCodes,
  })
}

/** Authored riverside advisory + hotline path input (SPE-2620 + SPE-2628 EXAMPLE fixtures). */
export const EXAMPLE_SPE_956_INCIDENT_PATH_INPUT: Spe956ParticipatoryChannelIncidentPathInput =
  Object.freeze({
    incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
    advisory: Object.freeze({
      bodyId: EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    }),
    hotline: Object.freeze({
      channelId: EXAMPLE_HOTLINE_CHANNEL.id,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    }),
  })
