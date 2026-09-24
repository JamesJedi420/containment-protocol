import { describe, expect, it } from 'vitest'
import {
  facilityRoomNodeId,
  facilitySectionNodeId,
  facilityZoneNodeId,
  PRODUCTION_FACILITY_SECTION_TOPOLOGY,
  readProductionFacilitySectionGraph,
  SPATIAL_ADJACENCY_EDGE_CLASS,
} from '../domain/facilitySectionGraph'
import { propagateSiteEventOverFacilityTopology } from '../domain/siteEventTopologyPropagation'

const CLINICAL = facilitySectionNodeId('clinical')
const MEDICAL = facilityZoneNodeId('medical')
const MED_BAY = facilityRoomNodeId('med_bay')
const CONTAINMENT = facilityRoomNodeId('containment_cell')
const ARCHIVE = facilityRoomNodeId('archive')
const ARMORY = facilityRoomNodeId('armory')
const COMMAND = facilityRoomNodeId('command')

const PRODUCTION = { source: 'production' } as const

function event(originNodeId: string, maxHops: number, affectedNodeIds: readonly string[] = []) {
  return {
    eventId: 'site-breach-clinical',
    originNodeId,
    maxHops,
    affectedNodeIds,
  }
}

describe('SPE-2994 site event topology propagation', () => {
  it('propagates from an authored section across production spatial adjacency', () => {
    const callerAffected = ['room:command']
    const siteEvent = event(CLINICAL, 1, callerAffected)
    const result = propagateSiteEventOverFacilityTopology(siteEvent, PRODUCTION)

    expect(result).toEqual({
      ok: true,
      eventId: 'site-breach-clinical',
      originNodeId: CLINICAL,
      traversedEdges: [
        {
          edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
          fromNodeId: MED_BAY,
          toNodeId: CLINICAL,
        },
        {
          edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
          fromNodeId: CLINICAL,
          toNodeId: MEDICAL,
        },
      ],
      affectedNodeIds: [CLINICAL, MED_BAY, MEDICAL],
      blockedEdges: [],
      failureReason: null,
    })
    expect(
      result.ok && result.traversedEdges.every((edge) => edge.edgeClass === 'spatial_adjacency')
    ).toBe(true)
    expect(callerAffected).toEqual(['room:command'])
    expect(siteEvent.affectedNodeIds).toBe(callerAffected)
    const graph = readProductionFacilitySectionGraph()
    expect(graph.edges).toHaveLength(3)
    expect(graph.edges.every((edge) => edge.edgeClass === SPATIAL_ADJACENCY_EDGE_CLASS)).toBe(true)
  })

  it('does not follow a caller-authored adjacency that the facility graph rejects', () => {
    const callerAdjacency = [[CONTAINMENT, MEDICAL]]
    const result = propagateSiteEventOverFacilityTopology(event(CONTAINMENT, 1), PRODUCTION)
    expect(callerAdjacency).toEqual([[CONTAINMENT, MEDICAL]])
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected production propagation')
    expect(result.affectedNodeIds).toEqual([CONTAINMENT, MED_BAY])
    expect(result.affectedNodeIds).not.toContain(MEDICAL)
  })

  it('does not cross an inaccessible authoritative edge', () => {
    const topology = {
      nodes: [
        { id: CONTAINMENT, classification: 'room' },
        { id: MED_BAY, classification: 'room' },
        { id: CLINICAL, classification: 'section' },
      ],
      edges: [
        { fromNodeId: CONTAINMENT, toNodeId: MED_BAY },
        { fromNodeId: MED_BAY, toNodeId: CLINICAL, access: 'inaccessible' },
      ],
      placements: [],
    }
    const result = propagateSiteEventOverFacilityTopology(event(CONTAINMENT, 2), {
      source: 'authored',
      topology,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected blocked-edge resolution')
    expect(result.affectedNodeIds).toEqual([CONTAINMENT, MED_BAY])
    expect(result.traversedEdges).toEqual([
      {
        edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
        fromNodeId: CONTAINMENT,
        toNodeId: MED_BAY,
      },
    ])
    expect(result.blockedEdges).toEqual([
      {
        edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
        fromNodeId: MED_BAY,
        toNodeId: CLINICAL,
        reason: 'inaccessible_edge',
      },
    ])
    expect(result.failureReason).toBeNull()
  })

  it('does not cross an edge the authoritative topology removed', () => {
    const topology = {
      nodes: [
        { id: CONTAINMENT, classification: 'room' },
        { id: MED_BAY, classification: 'room' },
        { id: CLINICAL, classification: 'section' },
      ],
      edges: [{ fromNodeId: CONTAINMENT, toNodeId: MED_BAY, access: 'open' }],
      placements: [],
    }
    const result = propagateSiteEventOverFacilityTopology(event(CONTAINMENT, 2), {
      source: 'authored',
      topology,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected removed-edge resolution')
    expect(result.affectedNodeIds).toEqual([CONTAINMENT, MED_BAY])
    expect(result.affectedNodeIds).not.toContain(CLINICAL)
    expect(result.blockedEdges).toEqual([])

    const markedRemoved = propagateSiteEventOverFacilityTopology(event(MED_BAY, 1), {
      source: 'authored',
      topology: {
        nodes: topology.nodes,
        edges: [
          { fromNodeId: CONTAINMENT, toNodeId: MED_BAY, access: 'removed' },
          { fromNodeId: MED_BAY, toNodeId: CLINICAL, access: 'open' },
        ],
        placements: [],
      },
    })
    expect(markedRemoved.ok).toBe(true)
    if (!markedRemoved.ok) throw new Error('expected removed access to block one edge')
    expect(markedRemoved.affectedNodeIds).toEqual([MED_BAY, CLINICAL])
    expect(markedRemoved.blockedEdges).toEqual([
      {
        edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
        fromNodeId: CONTAINMENT,
        toNodeId: MED_BAY,
        reason: 'removed_edge',
      },
    ])
  })

  it('orders multiple open edges by canonical facility edge identity', () => {
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
    const forward = propagateSiteEventOverFacilityTopology(event(CLINICAL, 1), {
      source: 'authored',
      topology,
    })
    const reversed = propagateSiteEventOverFacilityTopology(event(CLINICAL, 1), {
      source: 'authored',
      topology: {
        nodes: [...topology.nodes].reverse(),
        edges: [...topology.edges].reverse(),
        placements: [],
      },
    })
    expect(forward).toEqual(reversed)
    expect(forward.ok).toBe(true)
    if (!forward.ok) throw new Error('expected ordered propagation')
    expect(forward.affectedNodeIds).toEqual([CLINICAL, ARCHIVE, ARMORY, COMMAND])
    expect(forward.traversedEdges.map((edge) => edge.fromNodeId)).toEqual([
      ARCHIVE,
      ARMORY,
      COMMAND,
    ])
  })

  it('fails closed on a missing or malformed topology without mutating caller state', () => {
    const callerAffected = [MED_BAY]
    const siteEvent = event(CLINICAL, 1, callerAffected)
    const missing = propagateSiteEventOverFacilityTopology(siteEvent, {
      source: 'authored',
      topology: undefined,
    })
    expect(missing).toMatchObject({
      ok: false,
      eventId: 'site-breach-clinical',
      originNodeId: CLINICAL,
      traversedEdges: [],
      affectedNodeIds: [],
      blockedEdges: [],
      failureReason: 'missing_topology',
    })

    const dangling = propagateSiteEventOverFacilityTopology(siteEvent, {
      source: 'authored',
      topology: {
        nodes: [{ id: MED_BAY, classification: 'room' }],
        edges: [{ fromNodeId: MED_BAY, toNodeId: COMMAND }],
        placements: [],
      },
    })
    expect(dangling.failureReason).toBe('dangling_edge')
    expect(dangling.affectedNodeIds).toEqual([])

    const malformedAccess = propagateSiteEventOverFacilityTopology(siteEvent, {
      source: 'authored',
      topology: {
        ...PRODUCTION_FACILITY_SECTION_TOPOLOGY,
        edges: PRODUCTION_FACILITY_SECTION_TOPOLOGY.edges.map((edge) =>
          edge.fromNodeId === MED_BAY ? { ...edge, access: 'sealed' } : edge
        ),
      },
    })
    expect(malformedAccess.failureReason).toBe('malformed_edge_state')
    expect(callerAffected).toEqual([MED_BAY])
    expect(siteEvent.affectedNodeIds).toBe(callerAffected)
    expect(PRODUCTION_FACILITY_SECTION_TOPOLOGY.edges).toHaveLength(3)
  })

  it('fails closed when the origin section is missing from the facility graph', () => {
    const result = propagateSiteEventOverFacilityTopology(event(COMMAND, 1), PRODUCTION)
    expect(result).toMatchObject({
      ok: false,
      originNodeId: COMMAND,
      affectedNodeIds: [],
      failureReason: 'unknown_origin',
    })
    expect(
      propagateSiteEventOverFacilityTopology(event(CLINICAL, -1), PRODUCTION).failureReason
    ).toBe('invalid_bound')
    expect(
      propagateSiteEventOverFacilityTopology(
        { eventId: 'site-breach-clinical', originNodeId: '', maxHops: 1 },
        PRODUCTION
      ).failureReason
    ).toBe('missing_origin')
  })
})
