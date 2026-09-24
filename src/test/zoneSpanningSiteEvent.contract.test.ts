import { describe, expect, it } from 'vitest'
import {
  facilityRoomNodeId,
  facilitySectionNodeId,
  facilityZoneNodeId,
  readProductionFacilitySectionGraph,
} from '../domain/facilitySectionGraph'
import {
  applyZoneSpanningAdjacency,
  resolveZoneSpanningPulse,
  ZONE_SPANNING_PROPAGATION_RULE,
  type ZoneSpanningSiteEventRecord,
} from '../domain/zoneSpanningSiteEvent'

const CLINICAL = facilitySectionNodeId('clinical')
const MEDICAL = facilityZoneNodeId('medical')
const MED_BAY = facilityRoomNodeId('med_bay')
const COMMAND = facilityRoomNodeId('command')
const ARMORY = facilityRoomNodeId('armory')
const ARCHIVE = facilityRoomNodeId('archive')

const PRODUCTION = { source: 'production' } as const

function record(overrides: Partial<ZoneSpanningSiteEventRecord> = {}): ZoneSpanningSiteEventRecord {
  return {
    eventId: 'site-breach-clinical',
    originNodeId: CLINICAL,
    affectedNodeIds: [],
    propagationRule: ZONE_SPANNING_PROPAGATION_RULE,
    siteWide: false,
    pulse: { activeWeekCount: 1, returnAfterWeekCount: 1 },
    ...overrides,
  }
}

describe('SPE-3001 zone-spanning origin, affected zones, and one pulse', () => {
  it('keeps origin distinct from affected ids after one production walk', () => {
    const siteEvent = record()
    const result = applyZoneSpanningAdjacency(siteEvent, PRODUCTION, 1)

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.propagationRule).toBe(ZONE_SPANNING_PROPAGATION_RULE)
    expect(result.siteWide).toBe(false)

    const pulse = { activeWeekCount: 1, returnAfterWeekCount: 1 }
    const frozen = applyZoneSpanningAdjacency(record({ pulse }), PRODUCTION, 1)
    pulse.activeWeekCount = 2
    expect(frozen.pulse).not.toBe(pulse)
    expect(resolveZoneSpanningPulse(frozen, 1)).toBe('subsided')
  })

  it('keeps canonical affected order when authored edges are reversed', () => {
    const topology = {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: COMMAND, classification: 'room' },
        { id: ARMORY, classification: 'room' },
        { id: ARCHIVE, classification: 'room' },
      ],
      edges: [
        { fromNodeId: COMMAND, toNodeId: CLINICAL },
        { fromNodeId: ARMORY, toNodeId: CLINICAL },
        { fromNodeId: ARCHIVE, toNodeId: CLINICAL },
      ],
      placements: [],
    }
    const forward = applyZoneSpanningAdjacency(record(), { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningAdjacency(
      record(),
      {
        source: 'authored',
        topology: {
          nodes: [...topology.nodes].reverse(),
          edges: [...topology.edges].reverse(),
          placements: [],
        },
      },
      1
    )
    expect(forward.affectedNodeIds).toEqual(reversed.affectedNodeIds)
    expect(forward.affectedNodeIds).toEqual([ARCHIVE, ARMORY, COMMAND])
    expect(forward.originNodeId).toBe(CLINICAL)
  })

  it('leaves the affected list unchanged when the walk fails', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({ affectedNodeIds })
    const missing = applyZoneSpanningAdjacency(
      siteEvent,
      { source: 'authored', topology: undefined },
      1
    )
    expect(missing).toBe(siteEvent)
    expect(missing.affectedNodeIds).toBe(affectedNodeIds)

    const dangling = applyZoneSpanningAdjacency(
      siteEvent,
      {
        source: 'authored',
        topology: {
          nodes: [{ id: MED_BAY, classification: 'room' }],
          edges: [{ fromNodeId: MED_BAY, toNodeId: COMMAND }],
          placements: [],
        },
      },
      1
    )
    expect(dangling).toBe(siteEvent)
    expect(dangling.affectedNodeIds).toEqual([COMMAND])
  })

  it('does not invent edges when the record is site-wide', () => {
    const before = readProductionFacilitySectionGraph().edges.length
    const result = applyZoneSpanningAdjacency(record({ siteWide: true }), PRODUCTION, 1)
    expect(result.siteWide).toBe(true)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(readProductionFacilitySectionGraph().edges).toHaveLength(before)
    expect(before).toBe(3)
  })

  it('subsides and returns on the authored week cadence', () => {
    const siteEvent = record({
      pulse: { activeWeekCount: 1, returnAfterWeekCount: 1 },
    })
    expect(resolveZoneSpanningPulse(siteEvent, 0)).toBe('active')
    expect(resolveZoneSpanningPulse(siteEvent, 1)).toBe('subsided')
    expect(resolveZoneSpanningPulse(siteEvent, 2)).toBe('active')
    expect(resolveZoneSpanningPulse(siteEvent, 1.5)).toBe('inactive')
    expect(resolveZoneSpanningPulse(siteEvent, -1)).toBe('inactive')
    expect(
      resolveZoneSpanningPulse(
        record({ pulse: { activeWeekCount: 0, returnAfterWeekCount: 1 } }),
        0
      )
    ).toBe('inactive')
  })
})
