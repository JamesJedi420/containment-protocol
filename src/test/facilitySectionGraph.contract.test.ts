import { describe, expect, it } from 'vitest'
import { DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY } from '../domain/departmentCapabilities'
import {
  FACILITY_PLACEMENT_DEPARTMENT_IDS,
  FACILITY_SECTION_IDS,
  FACILITY_STAGING_LOCATION_IDS,
  lookupDepartmentPlacement,
  lookupSpatialNode,
  lookupStagingLocationPlacement,
  PRODUCTION_FACILITY_SECTION_TOPOLOGY,
  queryDirectSpatialAdjacency,
  readProductionFacilitySectionGraph,
  SPATIAL_ADJACENCY_EDGE_CLASS,
  validateFacilitySectionTopology,
} from '../domain/facilitySectionGraph'
import { FACILITY_ROOM_IDS } from '../domain/facilityLayoutStrategy'

const MED_BAY = 'room:med_bay'
const CONTAINMENT = 'room:containment_cell'
const CLINICAL = 'section:clinical'
const MEDICAL = 'zone:medical'

function shuffled<T>(values: readonly T[]): T[] {
  return [...values].reverse()
}

describe('SPE-2932 facility section graph', () => {
  it('exposes a production graph with stable classified nodes', () => {
    const graph = readProductionFacilitySectionGraph()
    expect(graph.nodes.map((node) => node.id)).toEqual([CONTAINMENT, MED_BAY, CLINICAL, MEDICAL])
    expect(graph.nodes.map((node) => node.classification)).toEqual([
      'room',
      'room',
      'section',
      'zone',
    ])
    expect(lookupSpatialNode(graph, MED_BAY)?.catalogId).toBe('med_bay')
    expect(FACILITY_ROOM_IDS).toHaveLength(17)
    expect(FACILITY_ROOM_IDS).toContain('command')
    expect(FACILITY_SECTION_IDS).toEqual(['clinical'])
    expect(FACILITY_STAGING_LOCATION_IDS).toEqual(['clinical_hold'])
    expect(FACILITY_STAGING_LOCATION_IDS).not.toContain('adjacent')
    expect(FACILITY_STAGING_LOCATION_IDS).not.toContain('remote')
  })

  it('answers direct adjacency and department/staging placement', () => {
    const graph = readProductionFacilitySectionGraph()
    expect(queryDirectSpatialAdjacency(graph, MED_BAY, CONTAINMENT)).toBe(true)
    expect(queryDirectSpatialAdjacency(graph, CONTAINMENT, MED_BAY)).toBe(true)
    expect(queryDirectSpatialAdjacency(graph, CONTAINMENT, MEDICAL)).toBe(false)
    expect(queryDirectSpatialAdjacency(graph, MED_BAY, MED_BAY)).toBe(false)
    expect(graph.edges.every((edge) => edge.edgeClass === SPATIAL_ADJACENCY_EDGE_CLASS)).toBe(true)

    expect(lookupDepartmentPlacement(graph, 'department:emergency-response')).toEqual({
      placementKind: 'department',
      placementId: 'department:emergency-response',
      node: lookupSpatialNode(graph, MED_BAY),
    })
    expect(lookupStagingLocationPlacement(graph, 'clinical_hold')).toEqual({
      placementKind: 'staging_location',
      placementId: 'clinical_hold',
      node: lookupSpatialNode(graph, CLINICAL),
    })
    expect(lookupDepartmentPlacement(graph, 'department:biohazard-response')).toBeUndefined()
    expect(lookupSpatialNode(graph, 'room:command')).toBeUndefined()
    expect(lookupSpatialNode(graph, 'room:ethics_review')).toBeUndefined()
    expect(lookupSpatialNode(graph, 'room:evidence_intake')).toBeUndefined()
  })

  it('normalizes equivalent topology independent of insertion order', () => {
    const forward = validateFacilitySectionTopology(PRODUCTION_FACILITY_SECTION_TOPOLOGY)
    const reversed = validateFacilitySectionTopology({
      nodes: shuffled(PRODUCTION_FACILITY_SECTION_TOPOLOGY.nodes),
      edges: shuffled(PRODUCTION_FACILITY_SECTION_TOPOLOGY.edges),
      placements: shuffled(PRODUCTION_FACILITY_SECTION_TOPOLOGY.placements),
    })
    expect(forward.ok).toBe(true)
    expect(reversed.ok).toBe(true)
    if (!forward.ok || !reversed.ok) throw new Error('expected valid graphs')
    expect(reversed.graph.nodes).toEqual(forward.graph.nodes)
    expect(reversed.graph.edges).toEqual(forward.graph.edges)
    expect(reversed.graph.placements).toEqual(forward.graph.placements)
    expect(readProductionFacilitySectionGraph()).toEqual(forward.graph)
  })

  it('fails closed on duplicate nodes, dangling edges, and unknown placements', () => {
    const duplicate = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: MED_BAY, classification: 'room' },
        { id: CONTAINMENT, classification: 'room' },
      ],
      edges: [{ fromNodeId: MED_BAY, toNodeId: CONTAINMENT }],
      placements: [],
    })
    expect(duplicate).toEqual({ ok: false, rejection: 'duplicate_node' })

    const dangling = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: CONTAINMENT, classification: 'room' },
      ],
      edges: [
        { fromNodeId: MED_BAY, toNodeId: CONTAINMENT },
        { fromNodeId: MED_BAY, toNodeId: 'room:command' },
      ],
      placements: [],
    })
    expect(dangling).toEqual({ ok: false, rejection: 'dangling_edge' })
    expect(queryDirectSpatialAdjacency(undefined, MED_BAY, CONTAINMENT)).toBe(false)

    const unknownPlacement = validateFacilitySectionTopology({
      nodes: [{ id: MED_BAY, classification: 'room' }],
      edges: [],
      placements: [
        {
          placementKind: 'department',
          placementId: 'department:not-real',
          nodeId: MED_BAY,
        },
      ],
    })
    expect(unknownPlacement).toEqual({ ok: false, rejection: 'unknown_placement' })

    const workshopCondition = validateFacilitySectionTopology({
      nodes: [{ id: CLINICAL, classification: 'section' }],
      edges: [],
      placements: [{ placementKind: 'adjacent', placementId: 'clinical_hold', nodeId: CLINICAL }],
    })
    expect(workshopCondition).toEqual({ ok: false, rejection: 'unknown_placement' })

    const dependencyEdge = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: CONTAINMENT, classification: 'room' },
      ],
      edges: [
        {
          fromNodeId: MED_BAY,
          toNodeId: CONTAINMENT,
          edgeClass: 'dependency',
        },
      ],
      placements: [],
    })
    expect(dependencyEdge).toEqual({ ok: false, rejection: 'malformed' })
    expect(queryDirectSpatialAdjacency(undefined, MED_BAY, CONTAINMENT)).toBe(false)
  })

  it('rejects malformed topology and does not grant adjacency from a partial payload', () => {
    expect(validateFacilitySectionTopology(undefined)).toEqual({
      ok: false,
      rejection: 'malformed',
    })
    expect(validateFacilitySectionTopology({ nodes: [], edges: [] })).toEqual({
      ok: false,
      rejection: 'malformed',
    })
    expect(
      validateFacilitySectionTopology({
        nodes: [{ id: 'room:not_a_room', classification: 'room' }],
        edges: [],
        placements: [],
      })
    ).toEqual({ ok: false, rejection: 'malformed' })
    expect(
      validateFacilitySectionTopology({
        nodes: [{ id: MED_BAY, classification: 'zone' }],
        edges: [],
        placements: [],
      })
    ).toEqual({ ok: false, rejection: 'malformed' })

    const conflictingPlacement = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: CONTAINMENT, classification: 'room' },
      ],
      edges: [{ fromNodeId: MED_BAY, toNodeId: CONTAINMENT }],
      placements: [
        {
          placementKind: 'department',
          placementId: 'department:emergency-response',
          nodeId: MED_BAY,
        },
        {
          placementKind: 'department',
          placementId: 'department:emergency-response',
          nodeId: CONTAINMENT,
        },
      ],
    })
    expect(conflictingPlacement.ok).toBe(false)
    expect(queryDirectSpatialAdjacency(undefined, MED_BAY, CONTAINMENT)).toBe(false)
  })

  it('does not treat a spread copy as a validated graph', () => {
    const graph = readProductionFacilitySectionGraph()
    const forged = {
      ...graph,
      edges: [
        ...graph.edges,
        {
          edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
          fromNodeId: CONTAINMENT,
          toNodeId: MEDICAL,
        },
      ],
    }
    expect(queryDirectSpatialAdjacency(forged, CONTAINMENT, MEDICAL)).toBe(false)
    expect(queryDirectSpatialAdjacency(graph, CONTAINMENT, MEDICAL)).toBe(false)
  })

  it('keeps the department placement catalog aligned with the registry', () => {
    const registryIds = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments
      .map((department) => department.id)
      .filter((departmentId) => departmentId.startsWith('department:'))
      .sort()
    expect([...FACILITY_PLACEMENT_DEPARTMENT_IDS]).toEqual(registryIds)
  })
})
