import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type FacilityDependencyAvailability,
  readRepresentativeFacilityDependencyGraph,
} from '../domain/facilityDependencyGraph'
import {
  FACILITY_CORE_NODE_ID,
  applyFacilityCoreResidueTransition,
  projectFacilityCoreResidueEvidence,
} from '../domain/facilityCoreResidue'

const HUB = 'core:facility_hub'
const ROUTING = 'service:routing'
const ALERT = 'capability:alert_timing'
const LOGISTICS = 'capability:logistics_freshness'
const ARCHIVE = 'service:archive_integrity'
const PROVENANCE = 'provenance:hidden-cause'
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

function transition(
  command: string,
  residue?: unknown,
  source: unknown = packet(),
  graph: unknown = readRepresentativeFacilityDependencyGraph()
) {
  const request: { command: string; provenanceRef: string; residue?: unknown } = {
    command,
    provenanceRef: PROVENANCE,
  }
  if (residue !== undefined) request.residue = residue
  return applyFacilityCoreResidueTransition(graph, source, request)
}

describe('SPE-3389 facility core residue', () => {
  const graph = readRepresentativeFacilityDependencyGraph()

  it('uses the representative hub as the only core', () => {
    expect(FACILITY_CORE_NODE_ID).toBe(HUB)
    expect(graph.nodes.find((node) => node.role === 'core')).toEqual({
      id: HUB,
      role: 'core',
    })
    expect(graph.nodes.filter((node) => node.role === 'core')).toHaveLength(1)
  })

  it('degrades more than one dependent service and records that transition', () => {
    const corrupted = transition('corrupt', undefined, packet({ [HUB]: 'unavailable' }))
    expect(corrupted.ok).toBe(true)
    if (!corrupted.ok) throw new Error('expected corruption')
    expect(corrupted.condition).toBe('corrupted')
    expect(corrupted.residue).toEqual({
      coreNodeId: HUB,
      fromCondition: 'present',
      toCondition: 'corrupted',
      causeCategory: 'corruption',
      provenanceRef: PROVENANCE,
      symptomNodeIds: [ALERT, LOGISTICS, ROUTING],
    })
    expect(corrupted.results.find((result) => result.nodeId === HUB)).toMatchObject({
      availability: 'degraded',
      reason: 'source_condition',
    })
    expect(corrupted.results.find((result) => result.nodeId === ROUTING)).toMatchObject({
      availability: 'degraded',
      reason: 'upstream_degraded',
      rootUpstreamId: HUB,
    })
    expect(corrupted.results.find((result) => result.nodeId === ALERT)).toMatchObject({
      availability: 'degraded',
      reason: 'upstream_degraded',
      rootUpstreamId: HUB,
    })
    expect(corrupted.results.find((result) => result.nodeId === LOGISTICS)).toMatchObject({
      availability: 'degraded',
      reason: 'upstream_degraded',
      immediateUpstreamId: HUB,
    })
    expect(corrupted.results.find((result) => result.nodeId === ARCHIVE)).toEqual({
      nodeId: ARCHIVE,
      availability: 'ready',
      reason: 'source_condition',
      causeChain: [],
    })

    const repeated = transition('corrupt', corrupted.residue)
    expect(repeated.ok).toBe(true)
    if (!repeated.ok) throw new Error('expected idempotent corruption')
    expect(repeated.residue).toBe(corrupted.residue)
    expect(repeated.results.find((result) => result.nodeId === LOGISTICS)?.availability).toBe(
      'degraded'
    )
  })

  it('preserves the residue when the hub is restored', () => {
    const corrupted = transition('corrupt')
    expect(corrupted.ok).toBe(true)
    if (!corrupted.ok) throw new Error('expected corruption')
    const restored = transition('restore', corrupted.residue)
    expect(restored.ok).toBe(true)
    if (!restored.ok) throw new Error('expected restore')
    expect(restored.condition).toBe('present')
    expect(restored.residue).toBe(corrupted.residue)
    for (const nodeId of [HUB, ROUTING, ALERT, LOGISTICS, ARCHIVE]) {
      expect(restored.results.find((result) => result.nodeId === nodeId)).toMatchObject({
        availability: 'ready',
        reason: 'source_condition',
      })
    }
    const evidence = projectFacilityCoreResidueEvidence(restored.residue)
    expect(evidence.ok).toBe(true)
    if (!evidence.ok) throw new Error('expected evidence')
    expect(evidence.evidence.symptomNodeIds).toEqual(corrupted.residue.symptomNodeIds)
    expect(evidence.evidence.symptomNodeIds).toEqual([ALERT, LOGISTICS, ROUTING])
  })

  it('projects symptoms without the cause, provenance, or investigation fields', () => {
    const corrupted = transition('corrupt')
    expect(corrupted.ok).toBe(true)
    if (!corrupted.ok) throw new Error('expected corruption')
    const projected = projectFacilityCoreResidueEvidence(corrupted.residue)
    expect(projected.ok).toBe(true)
    if (!projected.ok) throw new Error('expected evidence')
    expect(Object.keys(projected.evidence).sort()).toEqual([
      'coreNodeId',
      'evidenceKind',
      'symptomNodeIds',
    ])
    expect(projected.evidence).toEqual({
      evidenceKind: 'diagnostic_residue',
      coreNodeId: HUB,
      symptomNodeIds: [ALERT, LOGISTICS, ROUTING],
    })
    const encoded = JSON.stringify(projected.evidence)
    expect(encoded).not.toContain(PROVENANCE)
    expect(encoded).not.toContain('corruption')
    expect(encoded).not.toContain('causeChain')
    expect(encoded).not.toContain('fromCondition')
    expect(encoded).not.toContain('clarity')
    expect(encoded).not.toContain('completed')
    expect(encoded).not.toContain('discovered')
    expect(encoded).not.toContain('location')
    expect(
      projectFacilityCoreResidueEvidence({ ...corrupted.residue, causeCategory: 'tamper' })
    ).toEqual({ ok: false, rejection: 'malformed_residue' })
    expect(
      projectFacilityCoreResidueEvidence({
        ...corrupted.residue,
        symptomNodeIds: ['service:not_real'],
      })
    ).toEqual({ ok: false, rejection: 'malformed_residue' })
  })

  it('leaves an independent failure out of the residue', () => {
    const corrupted = transition(
      'corrupt',
      undefined,
      packet({ [ROUTING]: 'unavailable', [ARCHIVE]: 'degraded' })
    )
    expect(corrupted.ok).toBe(true)
    if (!corrupted.ok) throw new Error('expected corruption')
    expect(corrupted.residue.symptomNodeIds).toEqual([LOGISTICS])
    expect(corrupted.results.find((result) => result.nodeId === ROUTING)).toMatchObject({
      availability: 'unavailable',
      reason: 'source_condition',
    })
    expect(corrupted.results.find((result) => result.nodeId === ARCHIVE)).toMatchObject({
      availability: 'degraded',
      reason: 'source_condition',
    })
    expect(corrupted.results.find((result) => result.nodeId === ALERT)?.causeChain).not.toContain(
      HUB
    )
  })

  it('rejects absent, displaced, and stale before resolution', () => {
    for (const command of ['absent', 'displaced', 'stale']) {
      expect(transition(command)).toEqual({
        ok: false,
        rejection: 'unsupported_core_condition',
      })
    }
  })

  it('fails closed on malformed input and a non-hub core', () => {
    expect(transition('corrupt', undefined, null)).toEqual({
      ok: false,
      rejection: 'malformed_source',
    })
    expect(transition('corrupt', undefined, { status: 'active' })).toEqual({
      ok: false,
      rejection: 'unsupported_status_filter',
    })
    expect(transition('corrupt', undefined, packet(), null)).toEqual({
      ok: false,
      rejection: 'malformed',
    })
    expect(
      applyFacilityCoreResidueTransition(graph, packet(), {
        command: 'corrupt',
        provenanceRef: '   ',
      })
    ).toEqual({ ok: false, rejection: 'malformed_core_transition' })
    expect(
      applyFacilityCoreResidueTransition(graph, packet(), {
        command: 'missing',
        provenanceRef: PROVENANCE,
      })
    ).toEqual({ ok: false, rejection: 'malformed_core_transition' })
    expect(transition('restore')).toEqual({ ok: false, rejection: 'malformed_residue' })
    expect(transition('restore', { coreNodeId: HUB, location: 'vault' })).toEqual({
      ok: false,
      rejection: 'malformed_residue',
    })
    expect(
      applyFacilityCoreResidueTransition(graph, packet(), {
        command: 'corrupt',
        provenanceRef: PROVENANCE,
        location: 'vault',
      })
    ).toEqual({ ok: false, rejection: 'malformed_core_transition' })
    const corrupted = transition('corrupt')
    expect(corrupted.ok).toBe(true)
    if (!corrupted.ok) throw new Error('expected corruption')
    expect(
      transition('corrupt', {
        ...corrupted.residue,
        symptomNodeIds: [ARCHIVE],
      })
    ).toEqual({ ok: false, rejection: 'malformed_residue' })

    const otherCore = {
      nodes: [
        { id: 'core:other_hub', role: 'core' as const },
        { id: ROUTING, role: 'service' as const },
      ],
      edges: [
        {
          edgeClass: 'functional_dependency' as const,
          relation: 'requires' as const,
          fromNodeId: 'core:other_hub',
          toNodeId: ROUTING,
        },
      ],
    }
    expect(transition('corrupt', undefined, packet(), otherCore)).toEqual({
      ok: false,
      rejection: 'unsupported_core',
    })
  })

  it('does not import investigation or intake modules', () => {
    const source = readFileSync(resolve('src/domain/facilityCoreResidue.ts'), 'utf8')
    expect(source).not.toContain('investigationExposureClueRegistry')
    expect(source).not.toContain('projectClueActionability')
    expect(source).not.toContain('facilityCapabilityUnlock')
    expect(source).not.toContain('departmentWorkshop')
  })
})
