import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  EXAMPLE_DISCUSSION_BASELINE,
  EXAMPLE_DISCUSSION_SESSION,
  EXAMPLE_DISCUSSION_SURFACE,
  evaluateAsyncDiscussionSession,
} from '../domain/asyncDiscussionSurface'
import {
  EXAMPLE_MEMORY_STABILIZATION_BASELINE,
  EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
  EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
  evaluateCollectiveMemoryStabilization,
} from '../domain/collectiveMemoryStabilization'
import {
  EXAMPLE_COMMUNITY_ADVISORY_BODY,
  EXAMPLE_INCIDENT_BASELINE,
  EXAMPLE_SUPPORT_ROUTING_SIGNAL,
  evaluateCommunityAdvisoryDecisionInfluence,
} from '../domain/communityAdvisoryDecisionInfluence'
import {
  EXAMPLE_HOTLINE_CALL,
  EXAMPLE_HOTLINE_CHANNEL,
  EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
  evaluateHotlineCall,
} from '../domain/hotlineChannel'
import {
  evaluateAsyncDiscussionSessionFromGameState,
  evaluateCollectiveMemoryStabilizationFromGameState,
  evaluateCommunityAdvisoryDecisionInfluenceFromGameState,
  evaluateHotlineCallFromGameState,
  evaluateSurvivorInformalRegistrySignalFromGameState,
  SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
} from '../domain/spe956ParticipatoryChannelPersistence'
import {
  EXAMPLE_SURVIVOR_REGISTRY,
  EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
  EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
  evaluateSurvivorInformalRegistrySignal,
} from '../domain/survivorInformalRegistry'

const EXAMPLE_GAME = Object.freeze({
  spe956SurvivorInformalRegistryRecords: SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
  spe956CollectiveMemoryChannelRecords: SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
  spe956HotlineChannelRecords: SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
  spe956AsyncDiscussionSurfaceRecords: SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  spe956CommunityAdvisoryBodyRecords: SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
})

describe('spe956ParticipatoryChannelComposeFromGameState (SPE-2638 / SPE-956)', () => {
  it('advisory FromGameState matches direct evaluate with EXAMPLE body', () => {
    const fromGameState = evaluateCommunityAdvisoryDecisionInfluenceFromGameState(
      EXAMPLE_GAME,
      EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
      {
        signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        baseline: EXAMPLE_INCIDENT_BASELINE,
      }
    )
    const direct = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(fromGameState).toEqual(direct)
  })

  it('hotline FromGameState matches direct evaluate with EXAMPLE channel', () => {
    const fromGameState = evaluateHotlineCallFromGameState(
      EXAMPLE_GAME,
      EXAMPLE_HOTLINE_CHANNEL.id,
      {
        call: EXAMPLE_HOTLINE_CALL,
        baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
      }
    )
    const direct = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(fromGameState).toEqual(direct)
  })

  it('async discussion FromGameState matches direct evaluate with EXAMPLE surface', () => {
    const fromGameState = evaluateAsyncDiscussionSessionFromGameState(
      EXAMPLE_GAME,
      EXAMPLE_DISCUSSION_SURFACE.id,
      {
        session: EXAMPLE_DISCUSSION_SESSION,
        baseline: EXAMPLE_DISCUSSION_BASELINE,
      }
    )
    const direct = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(fromGameState).toEqual(direct)
  })

  it('survivor registry FromGameState matches direct evaluate with EXAMPLE registry', () => {
    const fromGameState = evaluateSurvivorInformalRegistrySignalFromGameState(
      EXAMPLE_GAME,
      EXAMPLE_SURVIVOR_REGISTRY.id,
      {
        signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
      }
    )
    const direct = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(fromGameState).toEqual(direct)
  })

  it('collective memory FromGameState matches direct evaluate with EXAMPLE channel', () => {
    const fromGameState = evaluateCollectiveMemoryStabilizationFromGameState(
      EXAMPLE_GAME,
      EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
      {
        signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      }
    )
    const direct = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(fromGameState).toEqual(direct)
  })

  it('empty {} maps yield missing-channel evaluator no-ops without throw', () => {
    const empty = createStartingState()

    const advisory = evaluateCommunityAdvisoryDecisionInfluenceFromGameState(
      empty,
      EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
      {
        signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        baseline: EXAMPLE_INCIDENT_BASELINE,
      }
    )
    expect(advisory.reasonCodes).toContain('missing_advisory_body')
    expect(advisory.proposedAdjustment).toBeNull()

    const hotline = evaluateHotlineCallFromGameState(empty, EXAMPLE_HOTLINE_CHANNEL.id, {
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })
    expect(hotline.reasonCodes).toContain('missing_hotline_channel')
    expect(hotline.proposedAdjustment).toBeNull()

    const discussion = evaluateAsyncDiscussionSessionFromGameState(
      empty,
      EXAMPLE_DISCUSSION_SURFACE.id,
      {
        session: EXAMPLE_DISCUSSION_SESSION,
        baseline: EXAMPLE_DISCUSSION_BASELINE,
      }
    )
    expect(discussion.reasonCodes).toContain('missing_discussion_surface')
    expect(discussion.proposedAdjustment).toBeNull()

    const registry = evaluateSurvivorInformalRegistrySignalFromGameState(
      empty,
      EXAMPLE_SURVIVOR_REGISTRY.id,
      {
        signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
      }
    )
    expect(registry.reasonCodes).toContain('missing_survivor_registry')
    expect(registry.proposedAdjustment).toBeNull()

    const memory = evaluateCollectiveMemoryStabilizationFromGameState(
      empty,
      EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
      {
        signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      }
    )
    expect(memory.reasonCodes).toContain('missing_memory_channel')
    expect(memory.proposedAdjustment).toBeNull()
  })

  it('unsafe map keys yield missing-channel no-ops without throw', () => {
    const unsafeIds = ['__proto__', 'constructor', 'prototype'] as const

    for (const unsafeId of unsafeIds) {
      const result = evaluateCommunityAdvisoryDecisionInfluenceFromGameState(
        EXAMPLE_GAME,
        unsafeId,
        {
          signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
          baseline: EXAMPLE_INCIDENT_BASELINE,
        }
      )
      expect(result.reasonCodes).toContain('missing_advisory_body')
      expect(result.proposedAdjustment).toBeNull()
    }
  })

  it('hydrate round-trip preserves EXAMPLE envelopes for FromGameState helpers', () => {
    const starting = createStartingState()
    const withMaps = {
      ...starting,
      ...EXAMPLE_GAME,
    }
    const hydrated = hydrateGame(loadGameSave(serializeGameSave(withMaps))!)

    const advisory = evaluateCommunityAdvisoryDecisionInfluenceFromGameState(
      hydrated,
      EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
      {
        signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        baseline: EXAMPLE_INCIDENT_BASELINE,
      }
    )
    expect(advisory).toEqual(
      evaluateCommunityAdvisoryDecisionInfluence({
        body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
        signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        baseline: EXAMPLE_INCIDENT_BASELINE,
      })
    )

    const hotline = evaluateHotlineCallFromGameState(hydrated, EXAMPLE_HOTLINE_CHANNEL.id, {
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })
    expect(hotline).toEqual(
      evaluateHotlineCall({
        channel: EXAMPLE_HOTLINE_CHANNEL,
        call: EXAMPLE_HOTLINE_CALL,
        baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
      })
    )

    const discussion = evaluateAsyncDiscussionSessionFromGameState(
      hydrated,
      EXAMPLE_DISCUSSION_SURFACE.id,
      {
        session: EXAMPLE_DISCUSSION_SESSION,
        baseline: EXAMPLE_DISCUSSION_BASELINE,
      }
    )
    expect(discussion).toEqual(
      evaluateAsyncDiscussionSession({
        surface: EXAMPLE_DISCUSSION_SURFACE,
        session: EXAMPLE_DISCUSSION_SESSION,
        baseline: EXAMPLE_DISCUSSION_BASELINE,
      })
    )

    const registry = evaluateSurvivorInformalRegistrySignalFromGameState(
      hydrated,
      EXAMPLE_SURVIVOR_REGISTRY.id,
      {
        signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
      }
    )
    expect(registry).toEqual(
      evaluateSurvivorInformalRegistrySignal({
        registry: EXAMPLE_SURVIVOR_REGISTRY,
        signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
      })
    )

    const memory = evaluateCollectiveMemoryStabilizationFromGameState(
      hydrated,
      EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
      {
        signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      }
    )
    expect(memory).toEqual(
      evaluateCollectiveMemoryStabilization({
        channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
        signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      })
    )
  })
})
