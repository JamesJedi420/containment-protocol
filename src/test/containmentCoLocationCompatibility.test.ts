import { describe, expect, it } from 'vitest'
import {
  evaluateContainmentCoLocationPlacement,
  querySpatialGraphSeparation,
  type CoLocationConstraint,
  type ContainedSubjectPlacement,
} from '../domain/containmentCoLocationCompatibility'
import {
  readProductionFacilitySectionGraph,
  validateFacilitySectionTopology,
} from '../domain/facilitySectionGraph'

const graph = readProductionFacilitySectionGraph()

const SAME_NODE: CoLocationConstraint = Object.freeze({
  id: 'c-same-node',
  kind: 'prohibit_same_node',
  subjectClass: 'volatile_sample',
  againstClass: 'reactive_catalyst',
})

const SAME_ZONE: CoLocationConstraint = Object.freeze({
  id: 'c-same-zone',
  kind: 'prohibit_same_zone',
  subjectClass: 'volatile_sample',
  againstClass: 'reactive_catalyst',
})

const ADJACENCY: CoLocationConstraint = Object.freeze({
  id: 'c-adjacency',
  kind: 'prohibit_direct_adjacency',
  subjectClass: 'volatile_sample',
  againstClass: 'reactive_catalyst',
})

const MIN_SEP: CoLocationConstraint = Object.freeze({
  id: 'c-min-sep',
  kind: 'minimum_graph_separation',
  subjectClass: 'volatile_sample',
  againstClass: 'reactive_catalyst',
  minSeparation: 2,
})

const ISOLATION: CoLocationConstraint = Object.freeze({
  id: 'c-isolation',
  kind: 'required_isolation',
  subjectClass: 'volatile_sample',
})

const WAIVABLE_SAME_NODE: CoLocationConstraint = Object.freeze({
  id: 'c-waivable-same-node',
  kind: 'prohibit_same_node',
  subjectClass: 'volatile_sample',
  againstClass: 'reactive_catalyst',
  waiverId: 'waiver:temporary-pairing',
})

function occupant(overrides: Partial<ContainedSubjectPlacement> = {}): ContainedSubjectPlacement {
  return Object.freeze({
    subjectId: 'occ-catalyst',
    subjectClass: 'reactive_catalyst',
    nodeId: 'room:med_bay',
    zoneRef: 'zone:medical',
    ...overrides,
  })
}

describe('SPE-3177 containment co-location compatibility', () => {
  it('permits a valid placement that violates no authored constraints', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [SAME_NODE, ADJACENCY],
      occupants: [occupant({ nodeId: 'room:med_bay' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'zone:medical',
        zoneRef: 'zone:other',
      },
    })
    expect(result).toEqual({
      decision: 'permitted',
      reasons: ['ok'],
      violatedConstraintIds: [],
      waivedConstraintIds: [],
    })
  })

  it('rejects two subjects sharing the same spatial node', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [SAME_NODE],
      occupants: [occupant({ nodeId: 'room:containment_cell' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
    })
    expect(result.decision).toBe('rejected')
    expect(result.reasons).toEqual(['same_node_prohibited'])
    expect(result.violatedConstraintIds).toEqual(['c-same-node'])
  })

  it('rejects direct adjacency using SPE-2932 topology', () => {
    // containment_cell is directly adjacent to med_bay in production graph
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [ADJACENCY],
      occupants: [occupant({ nodeId: 'room:med_bay' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
    })
    expect(result.decision).toBe('rejected')
    expect(result.reasons).toEqual(['direct_adjacency_prohibited'])
    expect(result.violatedConstraintIds).toEqual(['c-adjacency'])
  })

  it('enforces minimum graph separation on undirected spatial hops', () => {
    expect(querySpatialGraphSeparation(graph, 'room:containment_cell', 'room:med_bay')).toBe(1)
    expect(querySpatialGraphSeparation(graph, 'room:containment_cell', 'section:clinical')).toBe(2)

    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [MIN_SEP],
      occupants: [occupant({ nodeId: 'room:med_bay' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
    })
    expect(result.decision).toBe('rejected')
    expect(result.reasons).toEqual(['insufficient_separation'])
    expect(result.violatedConstraintIds).toEqual(['c-min-sep'])
  })

  it('rejects same-zone co-location when caller zone refs match', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [SAME_ZONE],
      occupants: [occupant({ nodeId: 'room:med_bay', zoneRef: 'zone:medical' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
        zoneRef: 'zone:medical',
      },
    })
    expect(result.decision).toBe('rejected')
    expect(result.reasons).toEqual(['same_zone_prohibited'])
  })

  it('fails closed when a same-zone constraint lacks a zone ref', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [SAME_ZONE],
      occupants: [occupant({ zoneRef: undefined })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
        zoneRef: 'zone:medical',
      },
    })
    expect(result.decision).toBe('rejected')
    expect(result.reasons).toEqual(['malformed_spatial_ref'])
    expect(result.violatedConstraintIds).toEqual(['c-same-zone'])
  })

  it('fails closed on unknown proposed spatial node without mutating callers', () => {
    const occupants = [occupant()]
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [SAME_NODE],
      occupants,
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:does-not-exist',
      },
    })
    expect(result).toEqual({
      decision: 'rejected',
      reasons: ['malformed_spatial_ref'],
      violatedConstraintIds: [],
      waivedConstraintIds: [],
    })
    expect(occupants[0]?.nodeId).toBe('room:med_bay')
  })

  it('resolves overlapping constraints deterministically regardless of input order', () => {
    const occupants = [
      occupant({ subjectId: 'occ-b', nodeId: 'room:med_bay' }),
      occupant({ subjectId: 'occ-a', nodeId: 'room:containment_cell' }),
    ]
    const constraints = [MIN_SEP, SAME_NODE, ADJACENCY]
    const forward = evaluateContainmentCoLocationPlacement({
      graph,
      constraints,
      occupants,
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
    })
    const reverse = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [...constraints].reverse(),
      occupants: [...occupants].reverse(),
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
    })
    expect(forward).toEqual(reverse)
    expect(forward.decision).toBe('rejected')
    expect(forward.violatedConstraintIds).toEqual(['c-adjacency', 'c-min-sep', 'c-same-node'])
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse))
  })

  it('does not let a waiver bypass an unrelated adjacency constraint', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [WAIVABLE_SAME_NODE, ADJACENCY],
      occupants: [occupant({ nodeId: 'room:med_bay' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
      activeWaiverIds: ['waiver:temporary-pairing'],
    })
    expect(result.decision).toBe('rejected')
    expect(result.waivedConstraintIds).toEqual([])
    expect(result.violatedConstraintIds).toEqual(['c-adjacency'])
    expect(result.reasons).toEqual(['direct_adjacency_prohibited'])
  })

  it('conditionally permits when only a waived same-node constraint would have fired', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [WAIVABLE_SAME_NODE],
      occupants: [occupant({ nodeId: 'room:containment_cell' })],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:containment_cell',
      },
      activeWaiverIds: ['waiver:temporary-pairing'],
    })
    expect(result).toEqual({
      decision: 'conditionally_permitted',
      reasons: ['waiver_applied'],
      violatedConstraintIds: [],
      waivedConstraintIds: ['c-waivable-same-node'],
    })
  })

  it('rejects required isolation when another occupant shares the proposed node', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [ISOLATION],
      occupants: [
        occupant({
          subjectId: 'other',
          subjectClass: 'reactive_catalyst',
          nodeId: 'section:clinical',
        }),
      ],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'section:clinical',
      },
    })
    expect(result.decision).toBe('rejected')
    expect(result.reasons).toEqual(['isolation_required'])
    expect(result.violatedConstraintIds).toEqual(['c-isolation'])
  })

  it('ignores the candidate relocating off its prior node for isolation checks', () => {
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [ISOLATION],
      occupants: [
        occupant({
          subjectId: 'cand-sample',
          subjectClass: 'volatile_sample',
          nodeId: 'section:clinical',
        }),
      ],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'section:clinical',
      },
    })
    expect(result).toEqual({
      decision: 'permitted',
      reasons: ['ok'],
      violatedConstraintIds: [],
      waivedConstraintIds: [],
    })
  })

  it('does not create a second topology authority', () => {
    const validated = validateFacilitySectionTopology({
      nodes: graph.nodes,
      edges: graph.edges,
      placements: graph.placements,
    })
    expect(validated.ok).toBe(true)
    const result = evaluateContainmentCoLocationPlacement({
      graph,
      constraints: [],
      occupants: [],
      candidate: {
        subjectId: 'cand-sample',
        subjectClass: 'volatile_sample',
        proposedNodeId: 'room:med_bay',
      },
    })
    expect(result.decision).toBe('permitted')
  })
})
