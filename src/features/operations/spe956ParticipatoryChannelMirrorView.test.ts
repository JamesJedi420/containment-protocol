import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_ROUTES } from '../../app/routes'
import { hydrateGame } from '../../app/store/runTransfer'
import { createStartingState } from '../../data/startingState'
import {
  SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
} from '../../domain/spe956ParticipatoryChannelPersistence'
import { getFrontDeskHubView } from './frontDeskView'
import { getSpe956ParticipatoryChannelMirrorView } from './spe956ParticipatoryChannelMirrorView'

afterEach(() => {
  vi.restoreAllMocks()
})

function applyAllExampleChannelMaps(
  game: ReturnType<typeof createStartingState>
): ReturnType<typeof createStartingState> {
  game.spe956SurvivorInformalRegistryRecords = {
    ...SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
  }
  game.spe956CollectiveMemoryChannelRecords = {
    ...SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
  }
  game.spe956HotlineChannelRecords = {
    ...SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
  }
  game.spe956AsyncDiscussionSurfaceRecords = {
    ...SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  }
  game.spe956CommunityAdvisoryBodyRecords = {
    ...SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  }
  return game
}

describe('spe956ParticipatoryChannelMirrorView (SPE-2637 slice 1)', () => {
  it('returns empty mirror when all five channel maps are empty without false AC', () => {
    const game = createStartingState()

    expect(game.spe956SurvivorInformalRegistryRecords).toEqual({})
    expect(game.spe956CollectiveMemoryChannelRecords).toEqual({})
    expect(game.spe956HotlineChannelRecords).toEqual({})
    expect(game.spe956AsyncDiscussionSurfaceRecords).toEqual({})
    expect(game.spe956CommunityAdvisoryBodyRecords).toEqual({})

    const view = getSpe956ParticipatoryChannelMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalChannelCount).toBe(0)
    expect(view.summary.survivorRegistryCount).toBe(0)
    expect(view.summary.collectiveMemoryCount).toBe(0)
    expect(view.summary.hotlineCount).toBe(0)
    expect(view.summary.asyncDiscussionCount).toBe(0)
    expect(view.summary.communityAdvisoryCount).toBe(0)
    expect(view.survivorRegistries).toEqual([])
    expect(view.collectiveMemoryChannels).toEqual([])
    expect(view.hotlineChannels).toEqual([])
    expect(view.asyncDiscussionSurfaces).toEqual([])
    expect(view.communityAdvisoryBodies).toEqual([])
  })

  it('mirrors EXAMPLE fixtures for all five channel types as labels only', () => {
    const game = applyAllExampleChannelMaps(createStartingState())
    game.week = 7

    const view = getSpe956ParticipatoryChannelMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalChannelCount).toBe(5)
    expect(view.summary.week).toBe(7)

    expect(view.survivorRegistries[0]?.id).toBe('registry:riverside-survivor-circle')
    expect(view.survivorRegistries[0]?.recognitionStanceLabel).toBe('Institution Refused')
    expect(view.survivorRegistries[0]?.catalogRuleLabel).toBe('Open Community')
    expect(view.survivorRegistries[0]?.supportKnowledgeBandLabel).toBe('Peer Shared')
    expect(view.survivorRegistries[0]?.credibilityCeilingLabel).toBe('Community Weak')

    expect(view.collectiveMemoryChannels[0]?.id).toBe('channel:riverside-memory-circle')
    expect(view.collectiveMemoryChannels[0]?.narrativeStanceLabel).toBe('Shared Survivor')
    expect(view.collectiveMemoryChannels[0]?.recallWindowLabel).toBe('Active Session')
    expect(view.collectiveMemoryChannels[0]?.stabilizationRuleLabel).toBe('Open Shared')

    expect(view.hotlineChannels[0]?.id).toBe('hotline:riverside-direct')
    expect(view.hotlineChannels[0]?.scriptQualityLabel).toBe('0.85')
    expect(view.hotlineChannels[0]?.staffingCapacityLabel).toBe('0.8')
    expect(view.hotlineChannels[0]?.languageSupportLabel).toBe('Yes')
    expect(view.hotlineChannels[0]?.escalationRulesLabel).toContain('municipal liaison desk')
    expect(view.hotlineChannels[0]?.unansweredModeLabel).toBe('Queue Callback')
    expect(view.hotlineChannels[0]?.angerModeLabel).toBe('Anger Only')
    expect(view.hotlineChannels[0]?.handleThresholdLabel).toBe('0.5')

    expect(view.asyncDiscussionSurfaces[0]?.id).toBe('discussion:riverside-async-board')
    expect(view.asyncDiscussionSurfaces[0]?.participationWindowLabel).toBe('W1–W12')
    expect(view.asyncDiscussionSurfaces[0]?.transcriptRetentionModeLabel).toBe('Session Bound')
    expect(view.asyncDiscussionSurfaces[0]?.wideningRuleLabel).toBe('Open Async')
    expect(view.asyncDiscussionSurfaces[0]?.memoryStabilizationLabel).toBe('No')

    expect(view.communityAdvisoryBodies[0]?.id).toBe('advisory-body:riverside-stakeholders')
    expect(view.communityAdvisoryBodies[0]?.missionLabel).toContain('local residents and survivors')
    expect(view.communityAdvisoryBodies[0]?.membershipRuleLabel).toContain('rotating chair')
    expect(view.communityAdvisoryBodies[0]?.representedStakeholderClassesLabel).toBe(
      'Local Residents, Survivors, Municipal Liaison'
    )
    expect(view.communityAdvisoryBodies[0]?.authorizedDecisionScopesLabel).toBe(
      'Framing, Response Timing, Support Routing'
    )
    expect(view.communityAdvisoryBodies[0]?.influenceThresholdLabel).toBe('0.6')
    expect(view.communityAdvisoryBodies[0]?.decisionCriteriaLabel).toContain(
      'influence threshold'
    )

    expect(view.collectiveMemoryChannels[0]?.credibilityCeilingLabel).toBe('Community Weak')
  })

  it('survives hydrate round-trip through store transfer without losing channel records', () => {
    const game = applyAllExampleChannelMaps(createStartingState())

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(game)) as typeof game)
    const view = getSpe956ParticipatoryChannelMirrorView(hydrated)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalChannelCount).toBe(5)
    expect(view.survivorRegistries[0]?.id).toBe('registry:riverside-survivor-circle')
    expect(view.communityAdvisoryBodies[0]?.id).toBe('advisory-body:riverside-stakeholders')
  })

  it('treats explicit empty maps after sanitize as empty mirror state', () => {
    const game = applyAllExampleChannelMaps(createStartingState())

    const cleared = hydrateGame({
      ...game,
      spe956SurvivorInformalRegistryRecords: {},
      spe956CollectiveMemoryChannelRecords: {},
      spe956HotlineChannelRecords: {},
      spe956AsyncDiscussionSurfaceRecords: {},
      spe956CommunityAdvisoryBodyRecords: {},
    })

    expect(getSpe956ParticipatoryChannelMirrorView(cleared).isEmpty).toBe(true)
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = applyAllExampleChannelMaps(createStartingState())

    const first = JSON.stringify(getSpe956ParticipatoryChannelMirrorView(game))
    const second = JSON.stringify(getSpe956ParticipatoryChannelMirrorView(game))

    expect(first).toBe(second)
  })

  it('orders channel record ids by locale-independent code units', () => {
    const game = createStartingState()
    const base = SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS[
      'registry:riverside-survivor-circle'
    ]!
    game.spe956SurvivorInformalRegistryRecords = {
      a: { ...base, id: 'a' },
      Z: { ...base, id: 'Z' },
    }

    const view = getSpe956ParticipatoryChannelMirrorView(game)

    expect(view.survivorRegistries.map((row) => row.id)).toEqual(['Z', 'a'])
  })

  it('exposes Front Desk quick link to participatory channel mirror route', () => {
    const hub = getFrontDeskHubView(createStartingState())

    expect(hub.quickLinks.some((link) => link.href === APP_ROUTES.participatoryChannels)).toBe(
      true
    )
  })
})
