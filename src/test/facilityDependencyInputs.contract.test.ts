import { describe, expect, it } from 'vitest'
import {
  FACILITY_DEPENDENCY_REJECTIONS,
  type FacilityDependencyAvailability,
  readRepresentativeFacilityDependencyGraph,
  resolveFacilityDependencyAvailability,
} from '../domain/facilityDependencyGraph'
import {
  mapExplicitFacilityDependencySources,
  resolveExplicitFacilityDependencyAvailability,
} from '../domain/facilityDependencyInputs'
import { resolveDepartmentWorkshopDependencyAvailability } from '../domain/departmentWorkshopQueue'

const HUB = 'core:facility_hub'
const ROUTING = 'service:routing'
const ALERT = 'capability:alert_timing'
const LOGISTICS = 'capability:logistics_freshness'
const ARCHIVE = 'service:archive_integrity'

const NODE_IDS = [HUB, ROUTING, ALERT, LOGISTICS, ARCHIVE] as const

function packet(
  overrides: Partial<Record<string, FacilityDependencyAvailability>> = {}
): Record<string, { availability: FacilityDependencyAvailability; sourceRef: string }> {
  const inputs: Record<
    string,
    { availability: FacilityDependencyAvailability; sourceRef: string }
  > = {}
  for (const id of NODE_IDS) {
    inputs[id] = {
      availability: overrides[id] ?? 'ready',
      sourceRef: `source:${id}`,
    }
  }
  return inputs
}

describe('SPE-3386 explicit facility dependency inputs', () => {
  const graph = readRepresentativeFacilityDependencyGraph()

  it('cascades one explicit hub input to both downstream capabilities', () => {
    const degraded = resolveExplicitFacilityDependencyAvailability(
      graph,
      packet({ [HUB]: 'degraded' })
    )
    expect(degraded.ok).toBe(true)
    if (!degraded.ok) throw new Error('expected resolution')
    expect(degraded.results.find((result) => result.nodeId === ALERT)).toMatchObject({
      availability: 'degraded',
      reason: 'upstream_degraded',
      immediateUpstreamId: ROUTING,
      rootUpstreamId: HUB,
    })
    expect(degraded.results.find((result) => result.nodeId === LOGISTICS)).toMatchObject({
      availability: 'degraded',
      reason: 'upstream_degraded',
      immediateUpstreamId: HUB,
      rootUpstreamId: HUB,
    })
    expect(degraded.results.find((result) => result.nodeId === ARCHIVE)).toEqual({
      nodeId: ARCHIVE,
      availability: 'ready',
      reason: 'source_condition',
      causeChain: [],
    })
    const direct = resolveFacilityDependencyAvailability(graph, {
      [HUB]: 'degraded',
      [ROUTING]: 'ready',
      [ALERT]: 'ready',
      [LOGISTICS]: 'ready',
      [ARCHIVE]: 'ready',
    })
    expect(direct.ok).toBe(true)
    if (!direct.ok) throw new Error('expected kernel resolution')
    expect(degraded.results).toEqual(direct.results)

    const unavailable = resolveExplicitFacilityDependencyAvailability(
      graph,
      packet({ [HUB]: 'unavailable' })
    )
    expect(unavailable.ok).toBe(true)
    if (!unavailable.ok) throw new Error('expected resolution')
    expect(unavailable.results.find((result) => result.nodeId === ALERT)?.availability).toBe(
      'unavailable'
    )
    expect(unavailable.results.find((result) => result.nodeId === LOGISTICS)?.availability).toBe(
      'unavailable'
    )
    expect(unavailable.results.find((result) => result.nodeId === ARCHIVE)?.availability).toBe(
      'ready'
    )
  })

  it('cascades one explicit routing connector only to alert timing', () => {
    const resolved = resolveExplicitFacilityDependencyAvailability(
      graph,
      packet({ [ROUTING]: 'degraded' })
    )
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) throw new Error('expected resolution')
    expect(resolved.results.find((result) => result.nodeId === ALERT)?.availability).toBe(
      'degraded'
    )
    expect(resolved.results.find((result) => result.nodeId === HUB)?.availability).toBe('ready')
    expect(resolved.results.find((result) => result.nodeId === LOGISTICS)?.availability).toBe(
      'ready'
    )
    expect(resolved.results.find((result) => result.nodeId === ARCHIVE)?.availability).toBe('ready')
    expect(resolved.inputs[ARCHIVE]).toEqual({
      availability: 'ready',
      sourceRef: `source:${ARCHIVE}`,
    })
  })

  it('matches when explicit input keys are reversed', () => {
    const forward = packet({ [HUB]: 'degraded' })
    const reversed: Record<
      string,
      { availability: FacilityDependencyAvailability; sourceRef: string }
    > = {}
    for (const id of [...NODE_IDS].reverse()) {
      reversed[id] = forward[id]!
    }
    expect(resolveExplicitFacilityDependencyAvailability(graph, reversed)).toEqual(
      resolveExplicitFacilityDependencyAvailability(graph, forward)
    )
  })

  it('fails closed before a missing or malformed packet can reach the workshop seam', () => {
    expect(resolveExplicitFacilityDependencyAvailability(graph, undefined)).toEqual({
      ok: false,
      rejection: 'malformed_source',
    })
    const missingArchive = packet()
    delete missingArchive[ARCHIVE]
    expect(mapExplicitFacilityDependencySources(graph, missingArchive)).toEqual({
      ok: false,
      rejection: 'missing_source',
    })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        ...packet(),
        [HUB]: { availability: 'ready', sourceRef: '' },
      })
    ).toEqual({ ok: false, rejection: 'missing_source' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        ...packet(),
        [HUB]: { availability: 'ready', sourceRef: '   ' },
      })
    ).toEqual({ ok: false, rejection: 'missing_source' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        ...packet(),
        [HUB]: { availability: 'locked', sourceRef: 'source:status' },
      })
    ).toEqual({ ok: false, rejection: 'unsupported_status_filter' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        status: 'inactive',
      })
    ).toEqual({ ok: false, rejection: 'unsupported_status_filter' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        facilityId: 'biohazard',
        status: 'locked',
        effects: { researchSlots: 2 },
      })
    ).toEqual({ ok: false, rejection: 'unsupported_status_filter' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        effects: { researchSlots: 2 },
      })
    ).toEqual({ ok: false, rejection: 'malformed_source' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        ...packet(),
        [ROUTING]: { availability: 'ready', sourceRef: 'source:routing', researchSlots: 2 },
      })
    ).toEqual({ ok: false, rejection: 'malformed_source' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        ...packet(),
        'service:unknown': { availability: 'ready', sourceRef: 'source:unknown' },
      })
    ).toEqual({ ok: false, rejection: 'malformed_source' })
    expect(
      mapExplicitFacilityDependencySources(graph, {
        ...packet(),
        [HUB]: { availability: 'degraded', sourceRef: 'source:hub', week: 3 },
      })
    ).toEqual({ ok: false, rejection: 'malformed_source' })

    const rejected = resolveExplicitFacilityDependencyAvailability(graph, undefined)
    expect(rejected).not.toHaveProperty('results')
    expect(resolveDepartmentWorkshopDependencyAvailability(undefined)).toEqual({
      availability: 'baseline',
      allowsProcessing: true,
      throughputCap: 2,
      effect: 'baseline',
    })
    expect(resolveDepartmentWorkshopDependencyAvailability('locked')).toEqual({
      availability: 'baseline',
      allowsProcessing: true,
      throughputCap: 2,
      effect: 'baseline',
    })
  })

  it('passes an invalid graph through the kernel rejection and leaves kernel codes unchanged', () => {
    expect(mapExplicitFacilityDependencySources({ nodes: [], edges: [] }, packet())).toEqual({
      ok: false,
      rejection: 'invalid_core',
    })
    expect(FACILITY_DEPENDENCY_REJECTIONS).not.toEqual(
      expect.arrayContaining(['malformed_source', 'unsupported_status_filter', 'missing_source'])
    )
  })
})
