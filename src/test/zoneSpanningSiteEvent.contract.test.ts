import { describe, expect, it } from 'vitest'
import {
  facilityRoomNodeId,
  facilitySectionNodeId,
  facilityZoneNodeId,
  readProductionFacilitySectionGraph,
} from '../domain/facilitySectionGraph'
import { FULL_SITE_ALERT_STAGE } from '../domain/siteAlertStage'
import {
  applyZoneSpanningAdjacency,
  applyZoneSpanningAirflow,
  applyZoneSpanningAlarm,
  applyZoneSpanningContamination,
  applyZoneSpanningFullSiteAlert,
  applyZoneSpanningHazardKind,
  applyZoneSpanningHostileKind,
  applyZoneSpanningSocialKind,
  applyZoneSpanningPanic,
  applyZoneSpanningRouteLink,
  applyZoneSpanningVisibility,
  resolveZoneSpanningPulse,
  ZONE_SPANNING_AIRFLOW_RULE,
  ZONE_SPANNING_HAZARD_KIND,
  ZONE_SPANNING_HOSTILE_KIND,
  ZONE_SPANNING_SOCIAL_KIND,
  ZONE_SPANNING_PROPAGATION_RULES,
  ZONE_SPANNING_ALARM_RULE,
  ZONE_SPANNING_CONTAMINATION_RULE,
  ZONE_SPANNING_PANIC_RULE,
  ZONE_SPANNING_ROUTE_LINK_RULE,
  ZONE_SPANNING_PROPAGATION_RULE,
  ZONE_SPANNING_VISIBILITY_RULE,
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

describe('SPE-3002 airflow spread', () => {
  function airflowTopology(edges: { fromNodeId: string; toNodeId: string }[]) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
        { id: COMMAND, classification: 'room' },
      ],
      edges,
      placements: [],
    }
  }

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
    { fromNodeId: CLINICAL, toNodeId: COMMAND },
  ]

  it('leaves the origin off affected ids when airflow pairs are existing edges', () => {
    const siteEvent = record({ propagationRule: ZONE_SPANNING_AIRFLOW_RULE })
    const topology = {
      ...airflowTopology(spatialEdges),
      airflow: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MEDICAL, toNodeId: CLINICAL },
      ],
    }
    const result = applyZoneSpanningAirflow(siteEvent, { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningAirflow(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...topology,
          edges: [...spatialEdges].reverse(),
          airflow: [...topology.airflow].reverse(),
        },
      },
      1
    )

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.propagationRule).toBe(ZONE_SPANNING_AIRFLOW_RULE)
    expect(reversed.affectedNodeIds).toEqual(result.affectedNodeIds)
    expect(result.pulse).not.toBe(siteEvent.pulse)
  })

  it('keeps the affected array reference when the airflow source is missing', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const production = applyZoneSpanningAirflow(siteEvent, PRODUCTION, 1)
    expect(production).toBe(siteEvent)
    expect(production.affectedNodeIds).toBe(affectedNodeIds)

    const omitted = applyZoneSpanningAirflow(
      siteEvent,
      { source: 'authored', topology: airflowTopology(spatialEdges) },
      1
    )
    expect(omitted).toBe(siteEvent)
    expect(omitted.affectedNodeIds).toBe(affectedNodeIds)
    expect(omitted.affectedNodeIds).not.toContain(MED_BAY)

    const adjacency = applyZoneSpanningAdjacency(
      record({ affectedNodeIds }),
      { source: 'authored', topology: airflowTopology(spatialEdges) },
      1
    )
    expect(adjacency.affectedNodeIds).toEqual([COMMAND, MED_BAY, MEDICAL])
  })

  it('does not add a node named only by a pair that is not an existing edge', () => {
    const affectedNodeIds = [ARCHIVE]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const topology = {
      ...airflowTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
      airflow: [
        { fromNodeId: CLINICAL, toNodeId: MED_BAY },
        { fromNodeId: CLINICAL, toNodeId: COMMAND },
      ],
    }
    const result = applyZoneSpanningAirflow(siteEvent, { source: 'authored', topology }, 1)
    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.affectedNodeIds).not.toContain(CLINICAL)

    const inventedOnly = applyZoneSpanningAirflow(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...airflowTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(inventedOnly).toBe(siteEvent)
    expect(inventedOnly.affectedNodeIds).toBe(affectedNodeIds)
  })
})

describe('SPE-3003 visibility spread', () => {
  function visibilityTopology(edges: { fromNodeId: string; toNodeId: string }[]) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
        { id: COMMAND, classification: 'room' },
      ],
      edges,
      placements: [],
    }
  }

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
    { fromNodeId: CLINICAL, toNodeId: COMMAND },
  ]

  it('leaves the origin off affected ids when visibility pairs are existing edges', () => {
    const siteEvent = record({ propagationRule: ZONE_SPANNING_VISIBILITY_RULE })
    const topology = {
      ...visibilityTopology(spatialEdges),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      visibility: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MEDICAL, toNodeId: CLINICAL },
      ],
    }
    const result = applyZoneSpanningVisibility(siteEvent, { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningVisibility(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...topology,
          edges: [...spatialEdges].reverse(),
          visibility: [...topology.visibility].reverse(),
        },
      },
      1
    )

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.propagationRule).toBe(ZONE_SPANNING_VISIBILITY_RULE)
    expect(reversed.affectedNodeIds).toEqual(result.affectedNodeIds)
    expect(result.pulse).not.toBe(siteEvent.pulse)
  })

  it('keeps the affected array reference when the visibility source is missing', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_VISIBILITY_RULE,
      affectedNodeIds,
    })
    const production = applyZoneSpanningVisibility(siteEvent, PRODUCTION, 1)
    expect(production).toBe(siteEvent)
    expect(production.affectedNodeIds).toBe(affectedNodeIds)

    const omitted = applyZoneSpanningVisibility(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...visibilityTopology(spatialEdges),
          airflow: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
        },
      },
      1
    )
    expect(omitted).toBe(siteEvent)
    expect(omitted.affectedNodeIds).toBe(affectedNodeIds)
    expect(omitted.affectedNodeIds).not.toContain(MED_BAY)

    const adjacency = applyZoneSpanningAdjacency(
      record({ affectedNodeIds }),
      { source: 'authored', topology: visibilityTopology(spatialEdges) },
      1
    )
    expect(adjacency.affectedNodeIds).toEqual([COMMAND, MED_BAY, MEDICAL])

    const airflowEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const airflow = applyZoneSpanningAirflow(
      airflowEvent,
      {
        source: 'authored',
        topology: {
          ...visibilityTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
        },
      },
      1
    )
    expect(airflow).not.toBe(airflowEvent)
    expect(airflow.affectedNodeIds).toEqual([MED_BAY])
    expect(airflow.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(airflow.propagationRule).toBe(ZONE_SPANNING_AIRFLOW_RULE)
  })

  it('does not add a node named only by a pair that is not an existing edge', () => {
    const affectedNodeIds = [ARCHIVE]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_VISIBILITY_RULE,
      affectedNodeIds,
    })
    const topology = {
      ...visibilityTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      visibility: [
        { fromNodeId: CLINICAL, toNodeId: MED_BAY },
        { fromNodeId: CLINICAL, toNodeId: COMMAND },
      ],
    }
    const result = applyZoneSpanningVisibility(siteEvent, { source: 'authored', topology }, 1)
    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.affectedNodeIds).not.toContain(CLINICAL)

    const inventedOnly = applyZoneSpanningVisibility(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...visibilityTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(inventedOnly).toBe(siteEvent)
    expect(inventedOnly.affectedNodeIds).toBe(affectedNodeIds)
  })
})

describe('SPE-3004 panic spread', () => {
  function panicTopology(edges: { fromNodeId: string; toNodeId: string }[]) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
        { id: COMMAND, classification: 'room' },
      ],
      edges,
      placements: [],
    }
  }

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
    { fromNodeId: CLINICAL, toNodeId: COMMAND },
  ]

  it('leaves the origin off affected ids when panic pairs are existing edges', () => {
    const siteEvent = record({ propagationRule: ZONE_SPANNING_PANIC_RULE })
    const topology = {
      ...panicTopology(spatialEdges),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      panic: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MEDICAL, toNodeId: CLINICAL },
      ],
    }
    const result = applyZoneSpanningPanic(siteEvent, { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningPanic(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...topology,
          edges: [...spatialEdges].reverse(),
          panic: [...topology.panic].reverse(),
        },
      },
      1
    )

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.propagationRule).toBe(ZONE_SPANNING_PANIC_RULE)
    expect(reversed.affectedNodeIds).toEqual(result.affectedNodeIds)
    expect(result.pulse).not.toBe(siteEvent.pulse)
  })

  it('keeps the affected array reference when the panic source is missing', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_PANIC_RULE,
      affectedNodeIds,
    })
    const production = applyZoneSpanningPanic(siteEvent, PRODUCTION, 1)
    expect(production).toBe(siteEvent)
    expect(production.affectedNodeIds).toBe(affectedNodeIds)

    const omitted = applyZoneSpanningPanic(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...panicTopology(spatialEdges),
          airflow: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          visibility: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
        },
      },
      1
    )
    expect(omitted).toBe(siteEvent)
    expect(omitted.affectedNodeIds).toBe(affectedNodeIds)
    expect(omitted.affectedNodeIds).not.toContain(MED_BAY)

    const adjacency = applyZoneSpanningAdjacency(
      record({ affectedNodeIds }),
      { source: 'authored', topology: panicTopology(spatialEdges) },
      1
    )
    expect(adjacency.affectedNodeIds).toEqual([COMMAND, MED_BAY, MEDICAL])

    const airflowEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const airflow = applyZoneSpanningAirflow(
      airflowEvent,
      {
        source: 'authored',
        topology: {
          ...panicTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(airflow).not.toBe(airflowEvent)
    expect(airflow.affectedNodeIds).toEqual([MED_BAY])
    expect(airflow.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(airflow.propagationRule).toBe(ZONE_SPANNING_AIRFLOW_RULE)

    const visibilityEvent = record({
      propagationRule: ZONE_SPANNING_VISIBILITY_RULE,
      affectedNodeIds,
    })
    const visibility = applyZoneSpanningVisibility(
      visibilityEvent,
      {
        source: 'authored',
        topology: {
          ...panicTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MEDICAL }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(visibility).not.toBe(visibilityEvent)
    expect(visibility.affectedNodeIds).toEqual([MEDICAL])
    expect(visibility.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(visibility.propagationRule).toBe(ZONE_SPANNING_VISIBILITY_RULE)
  })

  it('does not add a node named only by a pair that is not an existing edge', () => {
    const affectedNodeIds = [ARCHIVE]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_PANIC_RULE,
      affectedNodeIds,
    })
    const topology = {
      ...panicTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      panic: [
        { fromNodeId: CLINICAL, toNodeId: MED_BAY },
        { fromNodeId: CLINICAL, toNodeId: COMMAND },
      ],
    }
    const result = applyZoneSpanningPanic(siteEvent, { source: 'authored', topology }, 1)
    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.affectedNodeIds).not.toContain(CLINICAL)

    const inventedOnly = applyZoneSpanningPanic(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...panicTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(inventedOnly).toBe(siteEvent)
    expect(inventedOnly.affectedNodeIds).toBe(affectedNodeIds)
  })
})

describe('SPE-3005 alarm spread', () => {
  function alarmTopology(edges: { fromNodeId: string; toNodeId: string }[]) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
        { id: COMMAND, classification: 'room' },
      ],
      edges,
      placements: [],
    }
  }

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
    { fromNodeId: CLINICAL, toNodeId: COMMAND },
  ]

  it('leaves the origin off affected ids when alarm pairs are existing edges', () => {
    const siteEvent = record({ propagationRule: ZONE_SPANNING_ALARM_RULE })
    const topology = {
      ...alarmTopology(spatialEdges),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      alarm: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MEDICAL, toNodeId: CLINICAL },
      ],
    }
    const result = applyZoneSpanningAlarm(siteEvent, { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningAlarm(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...topology,
          edges: [...spatialEdges].reverse(),
          alarm: [...topology.alarm].reverse(),
        },
      },
      1
    )

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ALARM_RULE)
    expect(reversed.affectedNodeIds).toEqual(result.affectedNodeIds)
    expect(result.pulse).not.toBe(siteEvent.pulse)

    const panic = applyZoneSpanningPanic(
      record({ propagationRule: ZONE_SPANNING_PANIC_RULE }),
      { source: 'authored', topology },
      1
    )
    expect(panic.affectedNodeIds).toEqual([COMMAND])
    expect(panic.propagationRule).toBe(ZONE_SPANNING_PANIC_RULE)
  })

  it('keeps the affected array reference when the alarm source is missing', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
    })
    const production = applyZoneSpanningAlarm(siteEvent, PRODUCTION, 1)
    expect(production).toBe(siteEvent)
    expect(production.affectedNodeIds).toBe(affectedNodeIds)

    const omitted = applyZoneSpanningAlarm(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...alarmTopology(spatialEdges),
          airflow: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          visibility: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          panic: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
        },
      },
      1
    )
    expect(omitted).toBe(siteEvent)
    expect(omitted.affectedNodeIds).toBe(affectedNodeIds)
    expect(omitted.affectedNodeIds).not.toContain(MED_BAY)

    const malformed = applyZoneSpanningAlarm(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...alarmTopology(spatialEdges),
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL }],
        },
      },
      1
    )
    expect(malformed).toBe(siteEvent)
    expect(malformed.affectedNodeIds).toBe(affectedNodeIds)

    const adjacency = applyZoneSpanningAdjacency(
      record({ affectedNodeIds }),
      { source: 'authored', topology: alarmTopology(spatialEdges) },
      1
    )
    expect(adjacency.affectedNodeIds).toEqual([COMMAND, MED_BAY, MEDICAL])

    const airflowEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const airflow = applyZoneSpanningAirflow(
      airflowEvent,
      {
        source: 'authored',
        topology: {
          ...alarmTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(airflow).not.toBe(airflowEvent)
    expect(airflow.affectedNodeIds).toEqual([MED_BAY])
    expect(airflow.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(airflow.propagationRule).toBe(ZONE_SPANNING_AIRFLOW_RULE)

    const visibilityEvent = record({
      propagationRule: ZONE_SPANNING_VISIBILITY_RULE,
      affectedNodeIds,
    })
    const visibility = applyZoneSpanningVisibility(
      visibilityEvent,
      {
        source: 'authored',
        topology: {
          ...alarmTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MEDICAL }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(visibility).not.toBe(visibilityEvent)
    expect(visibility.affectedNodeIds).toEqual([MEDICAL])
    expect(visibility.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(visibility.propagationRule).toBe(ZONE_SPANNING_VISIBILITY_RULE)

    const panicEvent = record({
      propagationRule: ZONE_SPANNING_PANIC_RULE,
      affectedNodeIds,
    })
    const panic = applyZoneSpanningPanic(
      panicEvent,
      {
        source: 'authored',
        topology: {
          ...alarmTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(panic).not.toBe(panicEvent)
    expect(panic.affectedNodeIds).toEqual([MED_BAY])
    expect(panic.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(panic.propagationRule).toBe(ZONE_SPANNING_PANIC_RULE)
  })

  it('does not add a node named only by a pair that is not an existing edge', () => {
    const affectedNodeIds = [ARCHIVE]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
    })
    const topology = {
      ...alarmTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      alarm: [
        { fromNodeId: CLINICAL, toNodeId: MED_BAY },
        { fromNodeId: CLINICAL, toNodeId: COMMAND },
      ],
    }
    const result = applyZoneSpanningAlarm(siteEvent, { source: 'authored', topology }, 1)
    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.affectedNodeIds).not.toContain(CLINICAL)

    const inventedOnly = applyZoneSpanningAlarm(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...alarmTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(inventedOnly).toBe(siteEvent)
    expect(inventedOnly.affectedNodeIds).toBe(affectedNodeIds)
  })
})

describe('SPE-3006 contamination spread', () => {
  function contaminationTopology(edges: { fromNodeId: string; toNodeId: string }[]) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
        { id: COMMAND, classification: 'room' },
      ],
      edges,
      placements: [],
    }
  }

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
    { fromNodeId: CLINICAL, toNodeId: COMMAND },
  ]

  it('leaves the origin off affected ids when contamination pairs are existing edges', () => {
    const siteEvent = record({ propagationRule: ZONE_SPANNING_CONTAMINATION_RULE })
    const topology = {
      ...contaminationTopology(spatialEdges),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      contamination: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MEDICAL, toNodeId: CLINICAL },
      ],
    }
    const result = applyZoneSpanningContamination(siteEvent, { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningContamination(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...topology,
          edges: [...spatialEdges].reverse(),
          contamination: [...topology.contamination].reverse(),
        },
      },
      1
    )

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.propagationRule).toBe(ZONE_SPANNING_CONTAMINATION_RULE)
    expect(reversed.affectedNodeIds).toEqual(result.affectedNodeIds)
    expect(result.pulse).not.toBe(siteEvent.pulse)

    const alarm = applyZoneSpanningAlarm(
      record({ propagationRule: ZONE_SPANNING_ALARM_RULE }),
      { source: 'authored', topology },
      1
    )
    expect(alarm.affectedNodeIds).toEqual([COMMAND])
    expect(alarm.propagationRule).toBe(ZONE_SPANNING_ALARM_RULE)
  })

  it('keeps the affected array reference when the contamination source is missing', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_CONTAMINATION_RULE,
      affectedNodeIds,
    })
    const production = applyZoneSpanningContamination(siteEvent, PRODUCTION, 1)
    expect(production).toBe(siteEvent)
    expect(production.affectedNodeIds).toBe(affectedNodeIds)

    const omitted = applyZoneSpanningContamination(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology(spatialEdges),
          airflow: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          visibility: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          panic: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          alarm: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
        },
      },
      1
    )
    expect(omitted).toBe(siteEvent)
    expect(omitted.affectedNodeIds).toBe(affectedNodeIds)
    expect(omitted.affectedNodeIds).not.toContain(MED_BAY)

    const malformed = applyZoneSpanningContamination(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology(spatialEdges),
          alarm: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          contamination: [{ fromNodeId: CLINICAL }],
        },
      },
      1
    )
    expect(malformed).toBe(siteEvent)
    expect(malformed.affectedNodeIds).toBe(affectedNodeIds)

    const adjacency = applyZoneSpanningAdjacency(
      record({ affectedNodeIds }),
      { source: 'authored', topology: contaminationTopology(spatialEdges) },
      1
    )
    expect(adjacency.affectedNodeIds).toEqual([COMMAND, MED_BAY, MEDICAL])

    const airflowEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const airflow = applyZoneSpanningAirflow(
      airflowEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(airflow).not.toBe(airflowEvent)
    expect(airflow.affectedNodeIds).toEqual([MED_BAY])
    expect(airflow.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(airflow.propagationRule).toBe(ZONE_SPANNING_AIRFLOW_RULE)

    const visibilityEvent = record({
      propagationRule: ZONE_SPANNING_VISIBILITY_RULE,
      affectedNodeIds,
    })
    const visibility = applyZoneSpanningVisibility(
      visibilityEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MEDICAL }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(visibility).not.toBe(visibilityEvent)
    expect(visibility.affectedNodeIds).toEqual([MEDICAL])
    expect(visibility.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(visibility.propagationRule).toBe(ZONE_SPANNING_VISIBILITY_RULE)

    const panicEvent = record({
      propagationRule: ZONE_SPANNING_PANIC_RULE,
      affectedNodeIds,
    })
    const panic = applyZoneSpanningPanic(
      panicEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(panic).not.toBe(panicEvent)
    expect(panic.affectedNodeIds).toEqual([MED_BAY])
    expect(panic.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(panic.propagationRule).toBe(ZONE_SPANNING_PANIC_RULE)

    const alarmEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
    })
    const alarm = applyZoneSpanningAlarm(
      alarmEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: MEDICAL }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(alarm).not.toBe(alarmEvent)
    expect(alarm.affectedNodeIds).toEqual([MEDICAL])
    expect(alarm.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(alarm.propagationRule).toBe(ZONE_SPANNING_ALARM_RULE)
  })

  it('does not add a node named only by a pair that is not an existing edge', () => {
    const affectedNodeIds = [ARCHIVE]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_CONTAMINATION_RULE,
      affectedNodeIds,
    })
    const topology = {
      ...contaminationTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      alarm: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      contamination: [
        { fromNodeId: CLINICAL, toNodeId: MED_BAY },
        { fromNodeId: CLINICAL, toNodeId: COMMAND },
      ],
    }
    const result = applyZoneSpanningContamination(siteEvent, { source: 'authored', topology }, 1)
    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.affectedNodeIds).not.toContain(CLINICAL)

    const inventedOnly = applyZoneSpanningContamination(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...contaminationTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(inventedOnly).toBe(siteEvent)
    expect(inventedOnly.affectedNodeIds).toBe(affectedNodeIds)
  })
})

describe('SPE-3007 route link spread', () => {
  function routeLinkTopology(edges: { fromNodeId: string; toNodeId: string }[]) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
        { id: COMMAND, classification: 'room' },
      ],
      edges,
      placements: [],
    }
  }

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
    { fromNodeId: CLINICAL, toNodeId: COMMAND },
  ]

  it('leaves the origin off affected ids when route link pairs are existing edges', () => {
    const siteEvent = record({ propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE })
    const topology = {
      ...routeLinkTopology(spatialEdges),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
      route_link: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MEDICAL, toNodeId: CLINICAL },
      ],
    }
    const result = applyZoneSpanningRouteLink(siteEvent, { source: 'authored', topology }, 1)
    const reversed = applyZoneSpanningRouteLink(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...topology,
          edges: [...spatialEdges].reverse(),
          route_link: [...topology.route_link].reverse(),
        },
      },
      1
    )

    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    expect(result.affectedNodeIds).not.toContain(result.originNodeId)
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ROUTE_LINK_RULE)
    expect(reversed.affectedNodeIds).toEqual(result.affectedNodeIds)
    expect(result.pulse).not.toBe(siteEvent.pulse)

    const contaminationEvent = record({ propagationRule: ZONE_SPANNING_CONTAMINATION_RULE })
    const contamination = applyZoneSpanningContamination(
      contaminationEvent,
      { source: 'authored', topology },
      1
    )
    expect(contamination.affectedNodeIds).toEqual([COMMAND])
    expect(contamination.propagationRule).toBe(ZONE_SPANNING_CONTAMINATION_RULE)
    expect(
      applyZoneSpanningRouteLink(contaminationEvent, { source: 'authored', topology }, 1)
    ).toBe(contaminationEvent)
  })

  it('keeps the affected array reference when the route link source is missing', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
      affectedNodeIds,
    })
    const production = applyZoneSpanningRouteLink(siteEvent, PRODUCTION, 1)
    expect(production).toBe(siteEvent)
    expect(production.affectedNodeIds).toBe(affectedNodeIds)

    const omitted = applyZoneSpanningRouteLink(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          airflow: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          visibility: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          panic: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          alarm: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
          contamination: [
            { fromNodeId: CLINICAL, toNodeId: MED_BAY },
            { fromNodeId: CLINICAL, toNodeId: MEDICAL },
          ],
        },
      },
      1
    )
    expect(omitted).toBe(siteEvent)
    expect(omitted.affectedNodeIds).toBe(affectedNodeIds)
    expect(omitted.affectedNodeIds).not.toContain(MED_BAY)

    const malformed = applyZoneSpanningRouteLink(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          contamination: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          route_link: [{ fromNodeId: CLINICAL }],
        },
      },
      1
    )
    expect(malformed).toBe(siteEvent)
    expect(malformed.affectedNodeIds).toBe(affectedNodeIds)

    const empty = applyZoneSpanningRouteLink(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          contamination: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          route_link: [],
        },
      },
      1
    )
    expect(empty).toBe(siteEvent)
    expect(empty.affectedNodeIds).toBe(affectedNodeIds)

    const adjacency = applyZoneSpanningAdjacency(
      record({ affectedNodeIds }),
      { source: 'authored', topology: routeLinkTopology(spatialEdges) },
      1
    )
    expect(adjacency.affectedNodeIds).toEqual([COMMAND, MED_BAY, MEDICAL])

    const airflowEvent = record({
      propagationRule: ZONE_SPANNING_AIRFLOW_RULE,
      affectedNodeIds,
    })
    const airflow = applyZoneSpanningAirflow(
      airflowEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          route_link: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(airflow).not.toBe(airflowEvent)
    expect(airflow.affectedNodeIds).toEqual([MED_BAY])
    expect(airflow.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(airflow.propagationRule).toBe(ZONE_SPANNING_AIRFLOW_RULE)

    const visibilityEvent = record({
      propagationRule: ZONE_SPANNING_VISIBILITY_RULE,
      affectedNodeIds,
    })
    const visibility = applyZoneSpanningVisibility(
      visibilityEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MEDICAL }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          route_link: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(visibility).not.toBe(visibilityEvent)
    expect(visibility.affectedNodeIds).toEqual([MEDICAL])
    expect(visibility.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(visibility.propagationRule).toBe(ZONE_SPANNING_VISIBILITY_RULE)

    const panicEvent = record({
      propagationRule: ZONE_SPANNING_PANIC_RULE,
      affectedNodeIds,
    })
    const panic = applyZoneSpanningPanic(
      panicEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          route_link: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(panic).not.toBe(panicEvent)
    expect(panic.affectedNodeIds).toEqual([MED_BAY])
    expect(panic.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(panic.propagationRule).toBe(ZONE_SPANNING_PANIC_RULE)

    const alarmEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
    })
    const alarm = applyZoneSpanningAlarm(
      alarmEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: MEDICAL }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          route_link: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(alarm).not.toBe(alarmEvent)
    expect(alarm.affectedNodeIds).toEqual([MEDICAL])
    expect(alarm.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(alarm.propagationRule).toBe(ZONE_SPANNING_ALARM_RULE)

    const contaminationEvent = record({
      propagationRule: ZONE_SPANNING_CONTAMINATION_RULE,
      affectedNodeIds,
    })
    const contamination = applyZoneSpanningContamination(
      contaminationEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology(spatialEdges),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          route_link: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(contamination).not.toBe(contaminationEvent)
    expect(contamination.affectedNodeIds).toEqual([MED_BAY])
    expect(contamination.affectedNodeIds).not.toBe(affectedNodeIds)
    expect(contamination.propagationRule).toBe(ZONE_SPANNING_CONTAMINATION_RULE)
  })

  it('does not add a node named only by a pair that is not an existing edge', () => {
    const affectedNodeIds = [ARCHIVE]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
      affectedNodeIds,
    })
    const topology = {
      ...routeLinkTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
      airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      alarm: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      contamination: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
      route_link: [
        { fromNodeId: CLINICAL, toNodeId: MED_BAY },
        { fromNodeId: CLINICAL, toNodeId: COMMAND },
      ],
    }
    const result = applyZoneSpanningRouteLink(siteEvent, { source: 'authored', topology }, 1)
    expect(result.originNodeId).toBe(CLINICAL)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(COMMAND)
    expect(result.affectedNodeIds).not.toContain(CLINICAL)

    const inventedOnly = applyZoneSpanningRouteLink(
      siteEvent,
      {
        source: 'authored',
        topology: {
          ...routeLinkTopology([{ fromNodeId: CLINICAL, toNodeId: MED_BAY }]),
          airflow: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          visibility: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          panic: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          alarm: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          contamination: [{ fromNodeId: CLINICAL, toNodeId: MED_BAY }],
          route_link: [{ fromNodeId: CLINICAL, toNodeId: COMMAND }],
        },
      },
      1
    )
    expect(inventedOnly).toBe(siteEvent)
    expect(inventedOnly.affectedNodeIds).toBe(affectedNodeIds)
  })
})

describe('SPE-3010 full-site-alert consume', () => {
  it('sets site-wide affected state only for full_site_alert', () => {
    const affectedNodeIds = [MED_BAY]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
      affectedNodeIds,
      siteWide: false,
    })
    const result = applyZoneSpanningFullSiteAlert(siteEvent, FULL_SITE_ALERT_STAGE)

    expect(result).not.toBe(siteEvent)
    expect(result.siteWide).toBe(true)
    expect(result.affectedNodeIds).toBe(affectedNodeIds)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ROUTE_LINK_RULE)
    expect(result.originNodeId).toBe(siteEvent.originNodeId)
    expect(result.eventId).toBe(siteEvent.eventId)
    expect(result.pulse).toEqual(siteEvent.pulse)
    expect(result.pulse).not.toBe(siteEvent.pulse)
    expect(applyZoneSpanningFullSiteAlert(siteEvent, 'full_site_alert').siteWide).toBe(true)
  })

  it('returns the same record when the stage does not qualify', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const rejected = [
      undefined,
      null,
      true,
      { siteWide: true },
      'spatial_adjacency',
      'airflow',
      'visibility',
      'panic',
      'alarm',
      'contamination',
      'route_link',
    ]

    for (const stage of rejected) {
      const result = applyZoneSpanningFullSiteAlert(siteEvent, stage)
      expect(result).toBe(siteEvent)
      expect(result.siteWide).toBe(true)
      expect(result.affectedNodeIds).toBe(affectedNodeIds)
    }
  })
})

describe('SPE-3016 full-site alert copies eventKind', () => {
  const kinds = [
    ZONE_SPANNING_HAZARD_KIND,
    ZONE_SPANNING_HOSTILE_KIND,
    ZONE_SPANNING_SOCIAL_KIND,
  ] as const

  it('keeps each existing kind on a qualifying stage and still sets siteWide', () => {
    const affectedNodeIds = [MED_BAY]
    for (const kind of kinds) {
      const siteEvent = record({
        propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
        affectedNodeIds,
        eventKind: kind,
        siteWide: false,
      })
      const result = applyZoneSpanningFullSiteAlert(siteEvent, FULL_SITE_ALERT_STAGE)

      expect(result).not.toBe(siteEvent)
      expect(result.eventKind).toBe(kind)
      expect(result.siteWide).toBe(true)
      expect(result.affectedNodeIds).toBe(affectedNodeIds)
      expect(result.propagationRule).toBe(ZONE_SPANNING_ROUTE_LINK_RULE)
      expect(result.originNodeId).toBe(siteEvent.originNodeId)
      expect(result.eventId).toBe(siteEvent.eventId)
      expect(result.pulse).toEqual(siteEvent.pulse)
      expect(result.pulse).not.toBe(siteEvent.pulse)
    }
  })

  it('omits a missing kind on a qualifying stage', () => {
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds: [COMMAND],
      siteWide: false,
    })
    const result = applyZoneSpanningFullSiteAlert(siteEvent, FULL_SITE_ALERT_STAGE)

    expect(result).not.toBe(siteEvent)
    expect(result.eventKind).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(result, 'eventKind')).toBe(false)
    expect(result.siteWide).toBe(true)
    expect(result.affectedNodeIds).toBe(siteEvent.affectedNodeIds)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ALARM_RULE)
    expect(result.originNodeId).toBe(siteEvent.originNodeId)
    expect(result.pulse).toEqual(siteEvent.pulse)
  })

  it('returns the same record for a null stage even when a kind is already set', () => {
    for (const kind of kinds) {
      const siteEvent = record({
        eventKind: kind,
        siteWide: false,
        affectedNodeIds: [COMMAND],
      })
      const result = applyZoneSpanningFullSiteAlert(siteEvent, null)
      expect(result).toBe(siteEvent)
      expect(result.eventKind).toBe(kind)
      expect(result.siteWide).toBe(false)
    }
  })
})

describe('SPE-3012 hazard event kind', () => {
  it('stamps hazard and keeps the affected-id array, rule, origin, pulse, and siteWide', () => {
    const affectedNodeIds = [MED_BAY]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const result = applyZoneSpanningHazardKind(siteEvent, ZONE_SPANNING_HAZARD_KIND)

    expect(ZONE_SPANNING_PROPAGATION_RULES).not.toContain(ZONE_SPANNING_HAZARD_KIND)
    expect(result).not.toBe(siteEvent)
    expect(result.eventKind).toBe('hazard')
    expect(result.affectedNodeIds).toBe(affectedNodeIds)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ROUTE_LINK_RULE)
    expect(result.originNodeId).toBe(siteEvent.originNodeId)
    expect(result.eventId).toBe(siteEvent.eventId)
    expect(result.siteWide).toBe(true)
    expect(result.pulse).toEqual(siteEvent.pulse)
    expect(result.pulse).not.toBe(siteEvent.pulse)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('returns the same record for a missing or unknown kind', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const rejected = [
      undefined,
      null,
      '',
      true,
      { siteWide: true },
      'full_site_alert',
      'hostile',
      'social',
      'spatial_adjacency',
      'airflow',
      'visibility',
      'panic',
      'alarm',
      'contamination',
      'route_link',
    ]

    for (const kind of rejected) {
      const result = applyZoneSpanningHazardKind(siteEvent, kind)
      expect(result).toBe(siteEvent)
      expect(result.eventKind).toBeUndefined()
      expect(result.siteWide).toBe(true)
      expect(result.affectedNodeIds).toBe(affectedNodeIds)
    }
  })

  it('returns the same record when the kind is already hazard', () => {
    const siteEvent = record({ eventKind: 'hazard' })
    const result = applyZoneSpanningHazardKind(siteEvent, 'hazard')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('hazard')
  })

  it('returns the same record when the kind is already hostile', () => {
    const siteEvent = record({ eventKind: 'hostile' })
    const result = applyZoneSpanningHazardKind(siteEvent, 'hazard')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('hostile')
  })
})

describe('SPE-3013 hostile event kind', () => {
  it('stamps hostile and keeps the affected-id array, rule, origin, pulse, and siteWide', () => {
    const affectedNodeIds = [MED_BAY]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const result = applyZoneSpanningHostileKind(siteEvent, ZONE_SPANNING_HOSTILE_KIND)

    expect(ZONE_SPANNING_PROPAGATION_RULES).not.toContain(ZONE_SPANNING_HOSTILE_KIND)
    expect(result).not.toBe(siteEvent)
    expect(result.eventKind).toBe('hostile')
    expect(result.affectedNodeIds).toBe(affectedNodeIds)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ROUTE_LINK_RULE)
    expect(result.originNodeId).toBe(siteEvent.originNodeId)
    expect(result.eventId).toBe(siteEvent.eventId)
    expect(result.siteWide).toBe(true)
    expect(result.pulse).toEqual(siteEvent.pulse)
    expect(result.pulse).not.toBe(siteEvent.pulse)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('returns the same record for a missing or unknown kind', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const rejected = [
      undefined,
      null,
      '',
      true,
      { siteWide: true },
      'full_site_alert',
      'hazard',
      'social',
      'spatial_adjacency',
      'airflow',
      'visibility',
      'panic',
      'alarm',
      'contamination',
      'route_link',
    ]

    for (const kind of rejected) {
      const result = applyZoneSpanningHostileKind(siteEvent, kind)
      expect(result).toBe(siteEvent)
      expect(result.eventKind).toBeUndefined()
      expect(result.siteWide).toBe(true)
      expect(result.affectedNodeIds).toBe(affectedNodeIds)
    }
  })

  it('returns the same record when the kind is already hostile', () => {
    const siteEvent = record({ eventKind: 'hostile' })
    const result = applyZoneSpanningHostileKind(siteEvent, 'hostile')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('hostile')
  })

  it('does not clear an existing hazard stamp', () => {
    const siteEvent = record({ eventKind: 'hazard', siteWide: true })
    const result = applyZoneSpanningHostileKind(siteEvent, 'hostile')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('hazard')
    expect(result.siteWide).toBe(true)
  })
})

describe('SPE-3014 social event kind', () => {
  it('stamps social and keeps the affected-id array, rule, origin, pulse, and siteWide', () => {
    const affectedNodeIds = [MED_BAY]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ROUTE_LINK_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const result = applyZoneSpanningSocialKind(siteEvent, ZONE_SPANNING_SOCIAL_KIND)

    expect(ZONE_SPANNING_PROPAGATION_RULES).not.toContain(ZONE_SPANNING_SOCIAL_KIND)
    expect(result).not.toBe(siteEvent)
    expect(result.eventKind).toBe('social')
    expect(result.affectedNodeIds).toBe(affectedNodeIds)
    expect(result.propagationRule).toBe(ZONE_SPANNING_ROUTE_LINK_RULE)
    expect(result.originNodeId).toBe(siteEvent.originNodeId)
    expect(result.eventId).toBe(siteEvent.eventId)
    expect(result.siteWide).toBe(true)
    expect(result.pulse).toEqual(siteEvent.pulse)
    expect(result.pulse).not.toBe(siteEvent.pulse)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('returns the same record for a missing or unknown kind', () => {
    const affectedNodeIds = [COMMAND]
    const siteEvent = record({
      propagationRule: ZONE_SPANNING_ALARM_RULE,
      affectedNodeIds,
      siteWide: true,
    })
    const rejected = [
      undefined,
      null,
      '',
      true,
      { siteWide: true },
      'full_site_alert',
      'hazard',
      'hostile',
      'spatial_adjacency',
      'airflow',
      'visibility',
      'panic',
      'alarm',
      'contamination',
      'route_link',
    ]

    for (const kind of rejected) {
      const result = applyZoneSpanningSocialKind(siteEvent, kind)
      expect(result).toBe(siteEvent)
      expect(result.eventKind).toBeUndefined()
      expect(result.siteWide).toBe(true)
      expect(result.affectedNodeIds).toBe(affectedNodeIds)
    }
  })

  it('returns the same record when the kind is already social', () => {
    const siteEvent = record({ eventKind: 'social' })
    const result = applyZoneSpanningSocialKind(siteEvent, 'social')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('social')
  })

  it('does not clear an existing hazard stamp', () => {
    const siteEvent = record({ eventKind: 'hazard', siteWide: true })
    const result = applyZoneSpanningSocialKind(siteEvent, 'social')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('hazard')
    expect(result.siteWide).toBe(true)
  })

  it('does not clear an existing hostile stamp', () => {
    const siteEvent = record({ eventKind: 'hostile', siteWide: true })
    const result = applyZoneSpanningSocialKind(siteEvent, 'social')
    expect(result).toBe(siteEvent)
    expect(result.eventKind).toBe('hostile')
    expect(result.siteWide).toBe(true)
  })

  it('leaves an existing social stamp when hazard or hostile is applied', () => {
    const siteEvent = record({ eventKind: 'social', siteWide: true })
    const hazard = applyZoneSpanningHazardKind(siteEvent, 'hazard')
    const hostile = applyZoneSpanningHostileKind(siteEvent, 'hostile')
    expect(hazard).toBe(siteEvent)
    expect(hostile).toBe(siteEvent)
    expect(hazard.eventKind).toBe('social')
    expect(hostile.eventKind).toBe('social')
  })
})

describe('SPE-3015 spread success reserves eventKind', () => {
  const kinds = [
    ZONE_SPANNING_HAZARD_KIND,
    ZONE_SPANNING_HOSTILE_KIND,
    ZONE_SPANNING_SOCIAL_KIND,
  ] as const

  const spatialEdges = [
    { fromNodeId: CLINICAL, toNodeId: MED_BAY },
    { fromNodeId: CLINICAL, toNodeId: MEDICAL },
  ]

  function pairTopology(field: string) {
    return {
      nodes: [
        { id: CLINICAL, classification: 'section' },
        { id: MED_BAY, classification: 'room' },
        { id: MEDICAL, classification: 'zone' },
      ],
      edges: spatialEdges,
      placements: [],
      [field]: [{ fromNodeId: MED_BAY, toNodeId: CLINICAL }],
    }
  }

  function expectKindOmitted(result: ZoneSpanningSiteEventRecord): void {
    expect(result.eventKind).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(result, 'eventKind')).toBe(false)
  }

  function expectReserved(
    result: ZoneSpanningSiteEventRecord,
    source: ZoneSpanningSiteEventRecord,
    kind: (typeof kinds)[number]
  ): void {
    expect(result).not.toBe(source)
    expect(result.eventKind).toBe(kind)
    expect(result.originNodeId).toBe(source.originNodeId)
    expect(result.propagationRule).toBe(source.propagationRule)
    expect(result.siteWide).toBe(source.siteWide)
    expect(result.pulse).toEqual(source.pulse)
    expect(result.pulse).not.toBe(source.pulse)
    expect(result.affectedNodeIds).toEqual([MED_BAY])
    expect(result.affectedNodeIds).not.toContain(source.originNodeId)
  }

  it('keeps hazard, hostile, and social on adjacency success and omits a missing kind', () => {
    for (const kind of kinds) {
      const siteEvent = record({ eventKind: kind, siteWide: true })
      const result = applyZoneSpanningAdjacency(siteEvent, PRODUCTION, 1)
      expect(result).not.toBe(siteEvent)
      expect(result.eventKind).toBe(kind)
      expect(result.originNodeId).toBe(CLINICAL)
      expect(result.propagationRule).toBe(ZONE_SPANNING_PROPAGATION_RULE)
      expect(result.siteWide).toBe(true)
      expect(result.pulse).toEqual(siteEvent.pulse)
      expect(result.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
    }

    const bare = record()
    const omitted = applyZoneSpanningAdjacency(bare, PRODUCTION, 1)
    expect(omitted).not.toBe(bare)
    expectKindOmitted(omitted)
    expect(omitted.affectedNodeIds).toEqual([MED_BAY, MEDICAL])
  })

  it.each([
    ['airflow', ZONE_SPANNING_AIRFLOW_RULE, applyZoneSpanningAirflow],
    ['visibility', ZONE_SPANNING_VISIBILITY_RULE, applyZoneSpanningVisibility],
    ['panic', ZONE_SPANNING_PANIC_RULE, applyZoneSpanningPanic],
    ['alarm', ZONE_SPANNING_ALARM_RULE, applyZoneSpanningAlarm],
    ['contamination', ZONE_SPANNING_CONTAMINATION_RULE, applyZoneSpanningContamination],
    ['route_link', ZONE_SPANNING_ROUTE_LINK_RULE, applyZoneSpanningRouteLink],
  ] as const)('keeps each kind on %s success and omits a missing kind', (field, rule, apply) => {
    const topology = { source: 'authored' as const, topology: pairTopology(field) }
    for (const kind of kinds) {
      const siteEvent = record({
        propagationRule: rule,
        eventKind: kind,
        siteWide: true,
      })
      expectReserved(apply(siteEvent, topology, 1), siteEvent, kind)
    }

    const bare = record({ propagationRule: rule })
    const omitted = apply(bare, topology, 1)
    expect(omitted).not.toBe(bare)
    expectKindOmitted(omitted)
    expect(omitted.propagationRule).toBe(rule)
    expect(omitted.affectedNodeIds).toEqual([MED_BAY])
  })
})
