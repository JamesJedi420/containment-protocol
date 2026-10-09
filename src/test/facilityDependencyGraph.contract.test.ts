import { describe, expect, it } from 'vitest'
import {
  FACILITY_DEPENDENCY_MAX_EDGES,
  FACILITY_DEPENDENCY_MAX_NODES,
  FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
  type FacilityDependencyAvailability,
  readRepresentativeFacilityDependencyGraph,
  REPRESENTATIVE_FACILITY_DEPENDENCY_TOPOLOGY,
  resolveFacilityDependencyAvailability,
  validateFacilityDependencyGraph,
} from '../domain/facilityDependencyGraph'
import {
  readProductionFacilitySectionGraph,
  validateFacilitySectionTopology,
} from '../domain/facilitySectionGraph'

const HUB = 'core:facility_hub'
const ROUTING = 'service:routing'
const ALERT = 'capability:alert_timing'
const LOGISTICS = 'capability:logistics_freshness'
const ARCHIVE = 'service:archive_integrity'

function shuffled<T>(values: readonly T[]): T[] {
  return [...values].reverse()
}

function sources(
  overrides: Partial<Record<string, FacilityDependencyAvailability>> = {}
): Record<string, FacilityDependencyAvailability> {
  return {
    [HUB]: 'ready',
    [ROUTING]: 'ready',
    [ALERT]: 'ready',
    [LOGISTICS]: 'ready',
    [ARCHIVE]: 'ready',
    ...overrides,
  }
}

function requires(fromNodeId: string, toNodeId: string) {
  return {
    edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
    relation: 'requires' as const,
    fromNodeId,
    toNodeId,
  }
}

describe('SPE-3383 facility dependency graph', () => {
  it('exposes one core, two capabilities, and an independent service', () => {
    const graph = readRepresentativeFacilityDependencyGraph()
    expect(graph.nodes.map((node) => [node.id, node.role])).toEqual([
      [ALERT, 'capability'],
      [LOGISTICS, 'capability'],
      [HUB, 'core'],
      [ARCHIVE, 'service'],
      [ROUTING, 'service'],
    ])
    expect(graph.edges).toEqual([
      requires(HUB, LOGISTICS),
      requires(HUB, ROUTING),
      requires(ROUTING, ALERT),
    ])
    const archiveEdges = graph.edges.filter(
      (edge) => edge.fromNodeId === ARCHIVE || edge.toNodeId === ARCHIVE
    )
    expect(archiveEdges).toEqual([])
  })

  it('cascades hub degradation and unavailability without changing an independent service', () => {
    const graph = readRepresentativeFacilityDependencyGraph()
    const degraded = resolveFacilityDependencyAvailability(graph, sources({ [HUB]: 'degraded' }))
    expect(degraded).toEqual({
      ok: true,
      results: [
        {
          nodeId: ALERT,
          availability: 'degraded',
          reason: 'upstream_degraded',
          causeChain: [HUB, ROUTING],
          immediateUpstreamId: ROUTING,
          rootUpstreamId: HUB,
        },
        {
          nodeId: LOGISTICS,
          availability: 'degraded',
          reason: 'upstream_degraded',
          causeChain: [HUB],
          immediateUpstreamId: HUB,
          rootUpstreamId: HUB,
        },
        {
          nodeId: HUB,
          availability: 'degraded',
          reason: 'source_condition',
          causeChain: [],
        },
        {
          nodeId: ARCHIVE,
          availability: 'ready',
          reason: 'source_condition',
          causeChain: [],
        },
        {
          nodeId: ROUTING,
          availability: 'degraded',
          reason: 'upstream_degraded',
          causeChain: [HUB],
          immediateUpstreamId: HUB,
          rootUpstreamId: HUB,
        },
      ],
    })

    const unavailable = resolveFacilityDependencyAvailability(
      graph,
      sources({ [HUB]: 'unavailable' })
    )
    expect(unavailable.ok).toBe(true)
    if (!unavailable.ok) throw new Error('expected resolution')
    expect(unavailable.results.find((result) => result.nodeId === ALERT)).toMatchObject({
      availability: 'unavailable',
      reason: 'upstream_unavailable',
      immediateUpstreamId: ROUTING,
      rootUpstreamId: HUB,
    })
    expect(unavailable.results.find((result) => result.nodeId === LOGISTICS)?.availability).toBe(
      'unavailable'
    )
    expect(unavailable.results.find((result) => result.nodeId === ROUTING)?.availability).toBe(
      'unavailable'
    )
    expect(unavailable.results.find((result) => result.nodeId === ARCHIVE)).toEqual({
      nodeId: ARCHIVE,
      availability: 'ready',
      reason: 'source_condition',
      causeChain: [],
    })
  })

  it('keeps a node at its own source when that source is at least as bad as its upstreams', () => {
    const graph = readRepresentativeFacilityDependencyGraph()
    const resolved = resolveFacilityDependencyAvailability(
      graph,
      sources({ [LOGISTICS]: 'unavailable', [HUB]: 'degraded' })
    )
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) throw new Error('expected resolution')
    expect(resolved.results.find((result) => result.nodeId === LOGISTICS)).toEqual({
      nodeId: LOGISTICS,
      availability: 'unavailable',
      reason: 'source_condition',
      causeChain: [],
    })
  })

  it('breaks equal upstream ties by smallest node id', () => {
    const graph = validateFacilityDependencyGraph({
      nodes: [
        { id: HUB, role: 'core' },
        { id: 'service:zeta', role: 'service' },
        { id: 'service:alpha', role: 'service' },
        { id: ALERT, role: 'capability' },
      ],
      edges: [
        requires('service:zeta', ALERT),
        requires('service:alpha', ALERT),
        requires(HUB, 'service:zeta'),
        requires(HUB, 'service:alpha'),
      ],
    })
    expect(graph.ok).toBe(true)
    if (!graph.ok) throw new Error('expected graph')
    const resolved = resolveFacilityDependencyAvailability(graph.graph, {
      [HUB]: 'ready',
      'service:zeta': 'degraded',
      'service:alpha': 'degraded',
      [ALERT]: 'ready',
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) throw new Error('expected resolution')
    expect(resolved.results.find((result) => result.nodeId === ALERT)).toEqual({
      nodeId: ALERT,
      availability: 'degraded',
      reason: 'upstream_degraded',
      causeChain: ['service:alpha'],
      immediateUpstreamId: 'service:alpha',
      rootUpstreamId: 'service:alpha',
    })
  })

  it('sorts multi-hop cause ids independently of path order', () => {
    const graph = validateFacilityDependencyGraph({
      nodes: [
        { id: HUB, role: 'core' },
        { id: 'service:zeta', role: 'service' },
        { id: 'capability:mid', role: 'capability' },
        { id: ALERT, role: 'capability' },
      ],
      edges: [requires('service:zeta', 'capability:mid'), requires('capability:mid', ALERT)],
    })
    expect(graph.ok).toBe(true)
    if (!graph.ok) throw new Error('expected graph')
    const resolved = resolveFacilityDependencyAvailability(graph.graph, {
      [HUB]: 'ready',
      'service:zeta': 'degraded',
      'capability:mid': 'ready',
      [ALERT]: 'ready',
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) throw new Error('expected resolution')
    expect(resolved.results.find((result) => result.nodeId === ALERT)).toEqual({
      nodeId: ALERT,
      availability: 'degraded',
      reason: 'upstream_degraded',
      causeChain: ['capability:mid', 'service:zeta'],
      immediateUpstreamId: 'capability:mid',
      rootUpstreamId: 'service:zeta',
    })
  })

  it('normalizes equivalent graphs and resolutions independent of insertion order', () => {
    const forward = validateFacilityDependencyGraph(REPRESENTATIVE_FACILITY_DEPENDENCY_TOPOLOGY)
    const reversed = validateFacilityDependencyGraph({
      nodes: shuffled(REPRESENTATIVE_FACILITY_DEPENDENCY_TOPOLOGY.nodes),
      edges: shuffled(REPRESENTATIVE_FACILITY_DEPENDENCY_TOPOLOGY.edges),
    })
    expect(forward.ok).toBe(true)
    expect(reversed.ok).toBe(true)
    if (!forward.ok || !reversed.ok) throw new Error('expected valid graphs')
    expect(reversed.graph).toEqual(forward.graph)

    const canonicalSources = sources({ [HUB]: 'degraded' })
    const reversedSources: Record<string, FacilityDependencyAvailability> = {}
    for (const nodeId of Object.keys(canonicalSources).reverse()) {
      reversedSources[nodeId] = canonicalSources[nodeId] ?? 'ready'
    }
    expect(resolveFacilityDependencyAvailability(reversed.graph, reversedSources)).toEqual(
      resolveFacilityDependencyAvailability(forward.graph, canonicalSources)
    )
  })

  it('fails closed on duplicate ids, missing endpoints, malformed records, and forbidden edges', () => {
    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: HUB, role: 'core' },
        ],
        edges: [],
      })
    ).toEqual({ ok: false, rejection: 'duplicate_node' })

    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: ROUTING, role: 'service' },
        ],
        edges: [requires(HUB, 'service:missing')],
      })
    ).toEqual({ ok: false, rejection: 'missing_endpoint' })

    expect(validateFacilityDependencyGraph(undefined)).toEqual({
      ok: false,
      rejection: 'malformed',
    })
    expect(
      validateFacilityDependencyGraph({
        nodes: [{ id: '', role: 'core' }],
        edges: [],
      })
    ).toEqual({ ok: false, rejection: 'malformed' })
    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: ROUTING, role: 'service' },
        ],
        edges: [{ fromNodeId: HUB, toNodeId: ROUTING }],
      })
    ).toEqual({ ok: false, rejection: 'malformed' })

    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: ROUTING, role: 'service' },
        ],
        edges: [
          {
            edgeClass: 'spatial_adjacency',
            relation: 'requires',
            fromNodeId: HUB,
            toNodeId: ROUTING,
          },
        ],
      })
    ).toEqual({ ok: false, rejection: 'forbidden_edge_kind' })
    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: ROUTING, role: 'service' },
        ],
        edges: [
          {
            edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
            relation: 'supports',
            fromNodeId: HUB,
            toNodeId: ROUTING,
          },
        ],
      })
    ).toEqual({ ok: false, rejection: 'forbidden_edge_kind' })
  })

  it('rejects a core count other than one, directed cycles, and bad sources with no results', () => {
    expect(
      validateFacilityDependencyGraph({
        nodes: [{ id: ROUTING, role: 'service' }],
        edges: [],
      })
    ).toEqual({ ok: false, rejection: 'invalid_core' })
    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: 'core:second', role: 'core' },
        ],
        edges: [],
      })
    ).toEqual({ ok: false, rejection: 'invalid_core' })

    const cycleInput = {
      nodes: [
        { id: HUB, role: 'core' },
        { id: ROUTING, role: 'service' },
      ],
      edges: [requires(HUB, ROUTING), requires(ROUTING, HUB)],
    }
    expect(validateFacilityDependencyGraph(cycleInput)).toEqual({ ok: false, rejection: 'cycle' })
    expect(
      validateFacilityDependencyGraph({
        nodes: [{ id: HUB, role: 'core' }],
        edges: [requires(HUB, HUB)],
      })
    ).toEqual({ ok: false, rejection: 'cycle' })
    expect(resolveFacilityDependencyAvailability(cycleInput, sources())).toEqual({
      ok: false,
      rejection: 'cycle',
    })

    const graph = readRepresentativeFacilityDependencyGraph()
    expect(resolveFacilityDependencyAvailability(graph, { [HUB]: 'ready' })).toEqual({
      ok: false,
      rejection: 'invalid_source',
    })
    expect(
      resolveFacilityDependencyAvailability(graph, { ...sources(), 'service:extra': 'ready' })
    ).toEqual({ ok: false, rejection: 'invalid_source' })
    expect(
      resolveFacilityDependencyAvailability(graph, { ...sources(), [HUB]: 'offline' })
    ).toEqual({ ok: false, rejection: 'unsupported_state' })
    expect(resolveFacilityDependencyAvailability({ nodes: [], edges: [] }, {})).toEqual({
      ok: false,
      rejection: 'invalid_core',
    })
  })

  it('rejects graphs above the closed node and edge bounds', () => {
    const nodes = [{ id: HUB, role: 'core' as const }]
    for (let index = 0; index < FACILITY_DEPENDENCY_MAX_NODES; index += 1) {
      nodes.push({ id: `service:n${index}`, role: 'service' })
    }
    expect(nodes).toHaveLength(FACILITY_DEPENDENCY_MAX_NODES + 1)
    expect(validateFacilityDependencyGraph({ nodes, edges: [] })).toEqual({
      ok: false,
      rejection: 'graph_too_large',
    })

    const edges = []
    for (let index = 0; index < FACILITY_DEPENDENCY_MAX_EDGES + 1; index += 1) {
      edges.push(requires(HUB, ROUTING))
    }
    expect(
      validateFacilityDependencyGraph({
        nodes: [
          { id: HUB, role: 'core' },
          { id: ROUTING, role: 'service' },
        ],
        edges,
      })
    ).toEqual({ ok: false, rejection: 'graph_too_large' })
  })

  it('does not change spatial topology validation', () => {
    const production = readProductionFacilitySectionGraph()
    expect(validateFacilitySectionTopology(production).ok).toBe(true)
    const functionalEdge = validateFacilitySectionTopology({
      nodes: [
        { id: 'room:med_bay', classification: 'room' },
        { id: 'room:containment_cell', classification: 'room' },
      ],
      edges: [
        {
          fromNodeId: 'room:med_bay',
          toNodeId: 'room:containment_cell',
          edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
        },
      ],
      placements: [],
    })
    expect(functionalEdge).toEqual({ ok: false, rejection: 'malformed' })
  })
})
