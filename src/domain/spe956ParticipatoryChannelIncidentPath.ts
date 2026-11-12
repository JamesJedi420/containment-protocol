/**
 * SPE-2639 / SPE-2640 / SPE-956: Parent AC incident wire-up (slices 1–2).
 *
 * Pure deterministic incident path that applies advisory, hotline, async discussion,
 * survivor registry, and collective memory channels via SPE-2638 evaluate*FromGameState
 * helpers. Lanes stay parallel (no unified baseline merge). Does not mutate GameState,
 * week-close, UI, or evaluator contracts.
 */

import type {
  DiscussionMemoryBaseline,
  DiscussionSession,
  DiscussionSessionEvaluationResult,
} from './asyncDiscussionSurface'
import {
  EXAMPLE_DISCUSSION_BASELINE,
  EXAMPLE_DISCUSSION_SESSION,
  EXAMPLE_DISCUSSION_SURFACE,
} from './asyncDiscussionSurface'
import type {
  CollectiveMemoryBaseline,
  CollectiveMemoryEvaluationResult,
  CollectiveMemorySignal,
} from './collectiveMemoryStabilization'
import {
  EXAMPLE_MEMORY_STABILIZATION_BASELINE,
  EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
  EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
} from './collectiveMemoryStabilization'
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
import {
  resolveSpe956IncidentBaselines,
  SPE_956_EXAMPLE_INCIDENT_ID,
  type Spe956IncidentBaselineGameStateLike,
} from './spe956IncidentBaselinePersistence'
import type { Spe956ParticipatoryChannelGameStateLike } from './spe956ParticipatoryChannelPersistence'
import {
  evaluateAsyncDiscussionSessionFromGameState,
  evaluateCollectiveMemoryStabilizationFromGameState,
  evaluateCommunityAdvisoryDecisionInfluenceFromGameState,
  evaluateHotlineCallFromGameState,
  evaluateSurvivorInformalRegistrySignalFromGameState,
} from './spe956ParticipatoryChannelPersistence'
import type {
  SurvivorRegistryEvaluationResult,
  SurvivorRegistrySignal,
  SurvivorSupportBaseline,
} from './survivorInformalRegistry'
import {
  EXAMPLE_SURVIVOR_REGISTRY,
  EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
  EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
} from './survivorInformalRegistry'

export { SPE_956_EXAMPLE_INCIDENT_ID }

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

export interface Spe956AsyncDiscussionIncidentLaneInput {
  readonly incidentId: string
  readonly surfaceId: string
  readonly session: DiscussionSession
  readonly baseline: DiscussionMemoryBaseline
}

export interface Spe956SurvivorRegistryIncidentLaneInput {
  readonly incidentId: string
  readonly registryId: string
  readonly signal: SurvivorRegistrySignal
  readonly baseline: SurvivorSupportBaseline
}

export interface Spe956CollectiveMemoryIncidentLaneInput {
  readonly incidentId: string
  readonly channelId: string
  readonly signal: CollectiveMemorySignal
  readonly baseline: CollectiveMemoryBaseline
}

export interface Spe956ParticipatoryChannelIncidentPathInput {
  readonly incidentId: string
  readonly advisory?: Spe956AdvisoryIncidentLaneInput | null
  readonly hotline?: Spe956HotlineIncidentLaneInput | null
  readonly asyncDiscussion?: Spe956AsyncDiscussionIncidentLaneInput | null
  readonly survivorRegistry?: Spe956SurvivorRegistryIncidentLaneInput | null
  readonly collectiveMemory?: Spe956CollectiveMemoryIncidentLaneInput | null
}

export interface Spe956ParticipatoryChannelIncidentPathResult {
  readonly incidentId: string
  readonly advisory: CommunityAdvisoryInfluenceResult | null
  readonly hotline: HotlineCallEvaluationResult | null
  readonly asyncDiscussion: DiscussionSessionEvaluationResult | null
  readonly survivorRegistry: SurvivorRegistryEvaluationResult | null
  readonly collectiveMemory: CollectiveMemoryEvaluationResult | null
  readonly advisoryMaterialInfluence: boolean
  readonly hotlineMaterialInfluence: boolean
  readonly asyncDiscussionMaterialInfluence: boolean
  readonly survivorRegistryMaterialInfluence: boolean
  readonly collectiveMemoryMaterialInfluence: boolean
  readonly materialInfluence: boolean
  readonly reasonCodes: readonly string[]
}

function uniqueSortedReasonCodes(codes: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(codes.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
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

function isAsyncDiscussionMaterial(result: DiscussionSessionEvaluationResult): boolean {
  return (
    (result.outcome === 'widened' || result.outcome === 'recorded') &&
    result.proposedAdjustment !== null
  )
}

function isSurvivorRegistryMaterial(result: SurvivorRegistryEvaluationResult): boolean {
  return result.outcome === 'recorded' && result.proposedAdjustment !== null
}

function isCollectiveMemoryMaterial(result: CollectiveMemoryEvaluationResult): boolean {
  return result.outcome === 'stabilized' && result.proposedAdjustment !== null
}

function emptyNoLaneResult(incidentId: string): Spe956ParticipatoryChannelIncidentPathResult {
  return freezeResult({
    incidentId,
    advisory: null,
    hotline: null,
    asyncDiscussion: null,
    survivorRegistry: null,
    collectiveMemory: null,
    advisoryMaterialInfluence: false,
    hotlineMaterialInfluence: false,
    asyncDiscussionMaterialInfluence: false,
    survivorRegistryMaterialInfluence: false,
    collectiveMemoryMaterialInfluence: false,
    materialInfluence: false,
    reasonCodes: ['no_material_influence', 'no_participatory_lanes'],
  })
}

function hasAnyLane(input: Spe956ParticipatoryChannelIncidentPathInput): boolean {
  return Boolean(
    input.advisory ||
      input.hotline ||
      input.asyncDiscussion ||
      input.survivorRegistry ||
      input.collectiveMemory
  )
}

/**
 * Apply authored participatory-channel lanes for one incident via FromGameState helpers.
 * Skips a lane when its incidentId binding does not match the path incidentId.
 * Empty / missing channel maps yield evaluator no-ops (no material influence).
 */
export function applySpe956ParticipatoryChannelsToIncident(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  input?: Spe956ParticipatoryChannelIncidentPathInput | null
): Spe956ParticipatoryChannelIncidentPathResult {
  if (input == null) {
    return emptyNoLaneResult(SPE_956_EXAMPLE_INCIDENT_ID)
  }

  const incidentId =
    typeof input.incidentId === 'string' && input.incidentId.trim().length > 0
      ? input.incidentId.trim()
      : SPE_956_EXAMPLE_INCIDENT_ID

  const reasonCodes: string[] = []
  let advisory: CommunityAdvisoryInfluenceResult | null = null
  let hotline: HotlineCallEvaluationResult | null = null
  let asyncDiscussion: DiscussionSessionEvaluationResult | null = null
  let survivorRegistry: SurvivorRegistryEvaluationResult | null = null
  let collectiveMemory: CollectiveMemoryEvaluationResult | null = null

  if (input.advisory) {
    if (!input.advisory.baseline || input.advisory.baseline.incidentId !== incidentId) {
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
    if (!input.hotline.baseline || input.hotline.baseline.incidentId !== incidentId) {
      reasonCodes.push('hotline_incident_id_mismatch')
    } else {
      hotline = evaluateHotlineCallFromGameState(game, input.hotline.channelId, {
        call: input.hotline.call,
        baseline: input.hotline.baseline,
      })
      reasonCodes.push(...hotline.reasonCodes)
    }
  }

  if (input.asyncDiscussion) {
    const asyncIncidentId =
      typeof input.asyncDiscussion.incidentId === 'string'
        ? input.asyncDiscussion.incidentId.trim()
        : ''
    if (asyncIncidentId !== incidentId) {
      reasonCodes.push('async_discussion_incident_id_mismatch')
    } else {
      asyncDiscussion = evaluateAsyncDiscussionSessionFromGameState(
        game,
        input.asyncDiscussion.surfaceId,
        {
          session: input.asyncDiscussion.session,
          baseline: input.asyncDiscussion.baseline,
        }
      )
      reasonCodes.push(...asyncDiscussion.reasonCodes)
    }
  }

  if (input.survivorRegistry) {
    const survivorIncidentId =
      typeof input.survivorRegistry.incidentId === 'string'
        ? input.survivorRegistry.incidentId.trim()
        : ''
    if (survivorIncidentId !== incidentId) {
      reasonCodes.push('survivor_registry_incident_id_mismatch')
    } else {
      survivorRegistry = evaluateSurvivorInformalRegistrySignalFromGameState(
        game,
        input.survivorRegistry.registryId,
        {
          signal: input.survivorRegistry.signal,
          baseline: input.survivorRegistry.baseline,
        }
      )
      reasonCodes.push(...survivorRegistry.reasonCodes)
    }
  }

  if (input.collectiveMemory) {
    const memoryIncidentId =
      typeof input.collectiveMemory.incidentId === 'string'
        ? input.collectiveMemory.incidentId.trim()
        : ''
    if (memoryIncidentId !== incidentId) {
      reasonCodes.push('collective_memory_incident_id_mismatch')
    } else {
      collectiveMemory = evaluateCollectiveMemoryStabilizationFromGameState(
        game,
        input.collectiveMemory.channelId,
        {
          signal: input.collectiveMemory.signal,
          baseline: input.collectiveMemory.baseline,
        }
      )
      reasonCodes.push(...collectiveMemory.reasonCodes)
    }
  }

  if (!hasAnyLane(input)) {
    reasonCodes.push('no_participatory_lanes')
  }

  const advisoryMaterialInfluence = advisory !== null && isAdvisoryMaterial(advisory)
  const hotlineMaterialInfluence = hotline !== null && isHotlineMaterial(hotline)
  const asyncDiscussionMaterialInfluence =
    asyncDiscussion !== null && isAsyncDiscussionMaterial(asyncDiscussion)
  const survivorRegistryMaterialInfluence =
    survivorRegistry !== null && isSurvivorRegistryMaterial(survivorRegistry)
  const collectiveMemoryMaterialInfluence =
    collectiveMemory !== null && isCollectiveMemoryMaterial(collectiveMemory)

  if (advisoryMaterialInfluence) {
    reasonCodes.push('advisory_material_influence')
  }
  if (hotlineMaterialInfluence) {
    reasonCodes.push('hotline_material_influence')
  }
  if (asyncDiscussionMaterialInfluence) {
    reasonCodes.push('async_discussion_material_influence')
  }
  if (survivorRegistryMaterialInfluence) {
    reasonCodes.push('survivor_registry_material_influence')
  }
  if (collectiveMemoryMaterialInfluence) {
    reasonCodes.push('collective_memory_material_influence')
  }

  const materialInfluence =
    advisoryMaterialInfluence ||
    hotlineMaterialInfluence ||
    asyncDiscussionMaterialInfluence ||
    survivorRegistryMaterialInfluence ||
    collectiveMemoryMaterialInfluence

  if (!materialInfluence) {
    reasonCodes.push('no_material_influence')
  }

  return freezeResult({
    incidentId,
    advisory,
    hotline,
    asyncDiscussion,
    survivorRegistry,
    collectiveMemory,
    advisoryMaterialInfluence,
    hotlineMaterialInfluence,
    asyncDiscussionMaterialInfluence,
    survivorRegistryMaterialInfluence,
    collectiveMemoryMaterialInfluence,
    materialInfluence,
    reasonCodes,
  })
}

/** Authored riverside five-lane path input (SPE-2620 / 2628 / 2629 / 2630 / 2631 EXAMPLE fixtures). */
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
    asyncDiscussion: Object.freeze({
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
      surfaceId: EXAMPLE_DISCUSSION_SURFACE.id,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    }),
    survivorRegistry: Object.freeze({
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
      registryId: EXAMPLE_SURVIVOR_REGISTRY.id,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    }),
    collectiveMemory: Object.freeze({
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
      channelId: EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    }),
  })

/**
 * Build EXAMPLE incident-path input, preferring persisted baselines from GameState when present.
 * Falls back to authored EXAMPLE fixtures when resolve returns null or omits a lane baseline.
 */
export function buildExampleSpe956IncidentPathInputFromGameState(
  game: Spe956IncidentBaselineGameStateLike | null | undefined,
  incidentId: string = SPE_956_EXAMPLE_INCIDENT_ID
): Spe956ParticipatoryChannelIncidentPathInput {
  const persisted = resolveSpe956IncidentBaselines(game, incidentId)

  return Object.freeze({
    incidentId,
    advisory: Object.freeze({
      bodyId: EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: persisted?.advisory ?? EXAMPLE_INCIDENT_BASELINE,
    }),
    hotline: Object.freeze({
      channelId: EXAMPLE_HOTLINE_CHANNEL.id,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: persisted?.hotline ?? EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    }),
    asyncDiscussion: Object.freeze({
      incidentId,
      surfaceId: EXAMPLE_DISCUSSION_SURFACE.id,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: persisted?.asyncDiscussion ?? EXAMPLE_DISCUSSION_BASELINE,
    }),
    survivorRegistry: Object.freeze({
      incidentId,
      registryId: EXAMPLE_SURVIVOR_REGISTRY.id,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: persisted?.survivorSupport ?? EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    }),
    collectiveMemory: Object.freeze({
      incidentId,
      channelId: EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: persisted?.collectiveMemory ?? EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    }),
  })
}
