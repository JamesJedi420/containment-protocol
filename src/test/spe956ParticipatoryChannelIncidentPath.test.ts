import { describe, expect, it } from 'vitest'

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
  SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
} from '../domain/spe956ParticipatoryChannelPersistence'

const EXAMPLE_GAME = Object.freeze({
  spe956CommunityAdvisoryBodyRecords: SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  spe956HotlineChannelRecords: SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
})

const EMPTY_GAME = Object.freeze({
  spe956CommunityAdvisoryBodyRecords: {},
  spe956HotlineChannelRecords: {},
})

describe('spe956ParticipatoryChannelIncidentPath (SPE-2639 / SPE-956)', () => {
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

  it('empty channel maps yield no material influence (no false parent AC)', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(
      EMPTY_GAME,
      EXAMPLE_SPE_956_INCIDENT_PATH_INPUT
    )

    expect(result.materialInfluence).toBe(false)
    expect(result.advisoryMaterialInfluence).toBe(false)
    expect(result.hotlineMaterialInfluence).toBe(false)
    expect(result.advisory?.proposedAdjustment).toBeNull()
    expect(result.hotline?.proposedAdjustment).toBeNull()
    expect(result.advisory?.resolved.supportRouting).toBe(EXAMPLE_INCIDENT_BASELINE.supportRouting)
    expect(result.hotline?.resolved.supportRouting).toBe(
      EXAMPLE_HOTLINE_GUIDANCE_BASELINE.supportRouting
    )
    expect(result.reasonCodes).toContain('no_material_influence')
  })

  it('does not mutate input baselines', () => {
    const advisoryBaseline = { ...EXAMPLE_INCIDENT_BASELINE }
    const hotlineBaseline = { ...EXAMPLE_HOTLINE_GUIDANCE_BASELINE }
    const snapshotAdvisory = structuredClone(advisoryBaseline)
    const snapshotHotline = structuredClone(hotlineBaseline)

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
    })

    expect(advisoryBaseline).toEqual(snapshotAdvisory)
    expect(hotlineBaseline).toEqual(snapshotHotline)
  })

  it('skips lanes whose baseline incidentId mismatches the path incident', () => {
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
    })

    expect(result.advisory).toBeNull()
    expect(result.advisoryMaterialInfluence).toBe(false)
    expect(result.hotlineMaterialInfluence).toBe(true)
    expect(result.materialInfluence).toBe(true)
    expect(result.reasonCodes).toContain('advisory_incident_id_mismatch')
    expect(result.reasonCodes).toContain('hotline_material_influence')
  })

  it('returns a frozen result with sorted unique reason codes', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(
      EXAMPLE_GAME,
      EXAMPLE_SPE_956_INCIDENT_PATH_INPUT
    )

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect([...result.reasonCodes]).toEqual([...result.reasonCodes].sort())
    expect(new Set(result.reasonCodes).size).toBe(result.reasonCodes.length)
  })

  it('no lanes yields no material influence', () => {
    const result = applySpe956ParticipatoryChannelsToIncident(EXAMPLE_GAME, {
      incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
    })

    expect(result.advisory).toBeNull()
    expect(result.hotline).toBeNull()
    expect(result.materialInfluence).toBe(false)
    expect(result.reasonCodes).toEqual(['no_material_influence', 'no_participatory_lanes'])
  })
})
