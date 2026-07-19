import { describe, expect, it } from 'vitest'

import {
  EXAMPLE_DISCUSSION_BASELINE,
  EXAMPLE_DISCUSSION_SESSION,
  EXAMPLE_DISCUSSION_SURFACE,
} from '../domain/asyncDiscussionSurface'
import {
  EXAMPLE_MEMORY_STABILIZATION_BASELINE,
  EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
  EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
} from '../domain/collectiveMemoryStabilization'
import {
  EXAMPLE_COMMUNITY_ADVISORY_BODY,
  EXAMPLE_INCIDENT_BASELINE,
  EXAMPLE_SUPPORT_ROUTING_SIGNAL,
} from '../domain/communityAdvisoryDecisionInfluence'
import {
  EXAMPLE_HOTLINE_CALL,
  EXAMPLE_HOTLINE_CHANNEL,
  EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
} from '../domain/hotlineChannel'
import {
  applySpe956ParticipatoryChannelsToIncident,
  EXAMPLE_SPE_956_INCIDENT_PATH_INPUT,
  SPE_956_EXAMPLE_INCIDENT_ID,
} from '../domain/spe956ParticipatoryChannelIncidentPath'
import {
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
} from '../domain/survivorInformalRegistry'

const EXAMPLE_GAME = Object.freeze({
  spe956CommunityAdvisoryBodyRecords: SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  spe956HotlineChannelRecords: SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
  spe956AsyncDiscussionSurfaceRecords: SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  spe956SurvivorInformalRegistryRecords: SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
  spe956CollectiveMemoryChannelRecords: SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
})

const EMPTY_GAME = Object.freeze({
  spe956CommunityAdvisoryBodyRecords: {},
  spe956HotlineChannelRecords: {},
  spe956AsyncDiscussionSurfaceRecords: {},
  spe956SurvivorInformalRegistryRecords: {},
  spe956CollectiveMemoryChannelRecords: {},
})

describe('spe956ParticipatoryChannelIncidentPath (SPE-2639 / SPE-2640 / SPE-956)', () => {
  it('applies advisory + hotline FromGameState helpers with material supportRouting deltas', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(
      EXAMPLE_GAME,
      EXAMPLE_SPE_956_INCIDENT_PATH_INPUT
    )

    expect(result.incidentId).toBe(SPE_956_EXAMPLE_INCIDENT_ID)
    expect(result.advisoryMaterialInfluence).toBe(true)
    expect(result.hotlineMaterialInfluence).toBe(true)
    expect(result.materialInfluence).toBe(true)

    expect(result.advisory?.disposition).toBe('adopted')
    expect(result.advisory?.proposedAdjustment).toEqual({
      scope: 'support_routing',
      fromValue: 'standard_ops_desk',
      toValue: 'community_liaison_first',
    })
    expect(result.advisory?.resolved.supportRouting).toBe('community_liaison_first')
    expect(result.advisory?.resolved.framing).toBe(EXAMPLE_INCIDENT_BASELINE.framing)

    expect(result.hotline?.outcome).toBe('handled')
    expect(result.hotline?.proposedAdjustment).toEqual({
      scope: 'support_routing',
      fromValue: 'standard_ops_desk',
      toValue: 'hotline_priority_callback',
    })
    expect(result.hotline?.resolved.supportRouting).toBe('hotline_priority_callback')
    expect(result.hotline?.resolved.guidance).toBe(EXAMPLE_HOTLINE_GUIDANCE_BASELINE.guidance)

    expect(result.reasonCodes).toContain('advisory_material_influence')
    expect(result.reasonCodes).toContain('hotline_material_influence')
    expect(result.reasonCodes).not.toContain('no_material_influence')
  })

  it('applies async + survivor + memory FromGameState helpers with material resolved deltas', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(
      EXAMPLE_GAME,
      EXAMPLE_SPE_956_INCIDENT_PATH_INPUT
    )

    expect(result.asyncDiscussionMaterialInfluence).toBe(true)
    expect(result.survivorRegistryMaterialInfluence).toBe(true)
    expect(result.collectiveMemoryMaterialInfluence).toBe(true)
    expect(result.materialInfluence).toBe(true)

    expect(result.asyncDiscussion?.outcome).toBe('widened')
    expect(result.asyncDiscussion?.proposedAdjustment).toEqual({
      scope: 'participation',
      fromValue: 'live_meeting_only',
      toValue: 'async_resident_thread',
    })
    expect(result.asyncDiscussion?.resolved.participation).toBe('async_resident_thread')

    expect(result.survivorRegistry?.outcome).toBe('recorded')
    expect(result.survivorRegistry?.proposedAdjustment).toEqual({
      scope: 'support_knowledge',
      fromValue: 'none',
      toValue: 'recurrence_peer_notes',
    })
    expect(result.survivorRegistry?.resolved.supportKnowledge).toBe('recurrence_peer_notes')

    expect(result.collectiveMemory?.outcome).toBe('stabilized')
    expect(result.collectiveMemory?.proposedAdjustment).toEqual({
      scope: 'procedure_memory',
      fromValue: 'fragmented_lockdown_steps',
      toValue: 'shared_lockdown_sequence',
    })
    expect(result.collectiveMemory?.resolved.procedureMemory).toBe('shared_lockdown_sequence')

    expect(result.reasonCodes).toContain('async_discussion_material_influence')
    expect(result.reasonCodes).toContain('survivor_registry_material_influence')
    expect(result.reasonCodes).toContain('collective_memory_material_influence')
  })

  it('empty channel maps yield no material influence (no false parent AC)', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(
      EMPTY_GAME,
      EXAMPLE_SPE_956_INCIDENT_PATH_INPUT
    )

    expect(result.materialInfluence).toBe(false)
    expect(result.advisoryMaterialInfluence).toBe(false)
    expect(result.hotlineMaterialInfluence).toBe(false)
    expect(result.asyncDiscussionMaterialInfluence).toBe(false)
    expect(result.survivorRegistryMaterialInfluence).toBe(false)
    expect(result.collectiveMemoryMaterialInfluence).toBe(false)
    expect(result.advisory?.proposedAdjustment).toBeNull()
    expect(result.hotline?.proposedAdjustment).toBeNull()
    expect(result.asyncDiscussion?.proposedAdjustment).toBeNull()
    expect(result.survivorRegistry?.proposedAdjustment).toBeNull()
    expect(result.collectiveMemory?.proposedAdjustment).toBeNull()
    expect(result.advisory?.resolved.supportRouting).toBe(EXAMPLE_INCIDENT_BASELINE.supportRouting)
    expect(result.hotline?.resolved.supportRouting).toBe(
      EXAMPLE_HOTLINE_GUIDANCE_BASELINE.supportRouting
    )
    expect(result.asyncDiscussion?.resolved.participation).toBe(
      EXAMPLE_DISCUSSION_BASELINE.participation
    )
    expect(result.survivorRegistry?.resolved.supportKnowledge).toBe(
      EXAMPLE_SURVIVOR_REGISTRY_BASELINE.supportKnowledge
    )
    expect(result.collectiveMemory?.resolved.procedureMemory).toBe(
      EXAMPLE_MEMORY_STABILIZATION_BASELINE.procedureMemory
    )
    expect(result.reasonCodes).toContain('no_material_influence')
  })

  it('does not mutate input baselines', () => {
    const advisoryBaseline = { ...EXAMPLE_INCIDENT_BASELINE }
    const hotlineBaseline = { ...EXAMPLE_HOTLINE_GUIDANCE_BASELINE }
    const asyncBaseline = { ...EXAMPLE_DISCUSSION_BASELINE }
    const survivorBaseline = { ...EXAMPLE_SURVIVOR_REGISTRY_BASELINE }
    const memoryBaseline = { ...EXAMPLE_MEMORY_STABILIZATION_BASELINE }
    const snapshotAdvisory = structuredClone(advisoryBaseline)
    const snapshotHotline = structuredClone(hotlineBaseline)
    const snapshotAsync = structuredClone(asyncBaseline)
    const snapshotSurvivor = structuredClone(survivorBaseline)
    const snapshotMemory = structuredClone(memoryBaseline)

    applySpe956ParticipatoryChannelsToIncident(EXAMPLE_GAME, {
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
      advisory: {
        bodyId: EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
        signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        baseline: advisoryBaseline,
      },
      hotline: {
        channelId: EXAMPLE_HOTLINE_CHANNEL.id,
        call: EXAMPLE_HOTLINE_CALL,
        baseline: hotlineBaseline,
      },
      asyncDiscussion: {
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        surfaceId: EXAMPLE_DISCUSSION_SURFACE.id,
        session: EXAMPLE_DISCUSSION_SESSION,
        baseline: asyncBaseline,
      },
      survivorRegistry: {
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        registryId: EXAMPLE_SURVIVOR_REGISTRY.id,
        signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        baseline: survivorBaseline,
      },
      collectiveMemory: {
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        channelId: EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
        signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        baseline: memoryBaseline,
      },
    })

    expect(advisoryBaseline).toEqual(snapshotAdvisory)
    expect(hotlineBaseline).toEqual(snapshotHotline)
    expect(asyncBaseline).toEqual(snapshotAsync)
    expect(survivorBaseline).toEqual(snapshotSurvivor)
    expect(memoryBaseline).toEqual(snapshotMemory)
  })

  it('skips lanes whose incidentId binding mismatches the path incident', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(EXAMPLE_GAME, {
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
      advisory: {
        bodyId: EXAMPLE_COMMUNITY_ADVISORY_BODY.id,
        signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        baseline: {
          ...EXAMPLE_INCIDENT_BASELINE,
          incidentId: 'incident:other-site',
        },
      },
      hotline: {
        channelId: EXAMPLE_HOTLINE_CHANNEL.id,
        call: EXAMPLE_HOTLINE_CALL,
        baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
      },
      asyncDiscussion: {
        incidentId: 'incident:other-site',
        surfaceId: EXAMPLE_DISCUSSION_SURFACE.id,
        session: EXAMPLE_DISCUSSION_SESSION,
        baseline: EXAMPLE_DISCUSSION_BASELINE,
      },
      survivorRegistry: {
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        registryId: EXAMPLE_SURVIVOR_REGISTRY.id,
        signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
      },
      collectiveMemory: {
        incidentId: 'incident:other-site',
        channelId: EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id,
        signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      },
    })

    expect(result.advisory).toBeNull()
    expect(result.advisoryMaterialInfluence).toBe(false)
    expect(result.asyncDiscussion).toBeNull()
    expect(result.asyncDiscussionMaterialInfluence).toBe(false)
    expect(result.collectiveMemory).toBeNull()
    expect(result.collectiveMemoryMaterialInfluence).toBe(false)
    expect(result.hotlineMaterialInfluence).toBe(true)
    expect(result.survivorRegistryMaterialInfluence).toBe(true)
    expect(result.materialInfluence).toBe(true)
    expect(result.reasonCodes).toContain('advisory_incident_id_mismatch')
    expect(result.reasonCodes).toContain('async_discussion_incident_id_mismatch')
    expect(result.reasonCodes).toContain('collective_memory_incident_id_mismatch')
    expect(result.reasonCodes).toContain('hotline_material_influence')
    expect(result.reasonCodes).toContain('survivor_registry_material_influence')
  })

  it('returns a frozen result with sorted unique reason codes', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(
      EXAMPLE_GAME,
      EXAMPLE_SPE_956_INCIDENT_PATH_INPUT
    )

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect([...result.reasonCodes]).toEqual(
      [...result.reasonCodes].sort((left, right) => left.localeCompare(right))
    )
    expect(new Set(result.reasonCodes).size).toBe(result.reasonCodes.length)
  })

  it('no lanes yields no material influence', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(EXAMPLE_GAME, {
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
    })

    expect(result.advisory).toBeNull()
    expect(result.hotline).toBeNull()
    expect(result.asyncDiscussion).toBeNull()
    expect(result.survivorRegistry).toBeNull()
    expect(result.collectiveMemory).toBeNull()
    expect(result.materialInfluence).toBe(false)
    expect(result.reasonCodes).toEqual(['no_material_influence', 'no_participatory_lanes'])
  })

  it('nullish input yields no material influence without throw', () => {
    const fromUndefined = applySpe956ParticipatoryChannelsToIncident(EXAMPLE_GAME, undefined)
    const fromNull = applySpe956ParticipatoryChannelsToIncident(EXAMPLE_GAME, null)

    expect(fromUndefined.materialInfluence).toBe(false)
    expect(fromNull.materialInfluence).toBe(false)
    expect(fromUndefined.reasonCodes).toEqual(['no_material_influence', 'no_participatory_lanes'])
    expect(fromNull.reasonCodes).toEqual(['no_material_influence', 'no_participatory_lanes'])
  })
})
