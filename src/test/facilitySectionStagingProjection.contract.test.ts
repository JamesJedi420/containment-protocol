import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { parseDepartmentLocalStaging } from '../domain/departmentLocalStaging'
import {
  projectFacilitySectionGraphOntoDepartmentLocalStaging,
  projectProductionFacilitySectionStaging,
} from '../domain/facilitySectionStagingProjection'
import {
  FACILITY_INPUT_STAGING_LOCATION_ID,
  FACILITY_OUTPUT_STAGING_LOCATION_ID,
  PRODUCTION_FACILITY_SECTION_TOPOLOGY,
  readProductionFacilitySectionGraph,
  SPATIAL_ADJACENCY_EDGE_CLASS,
  validateFacilitySectionTopology,
} from '../domain/facilitySectionGraph'
import { resolveDepartmentWorkshopThroughput } from '../domain/departmentWorkshopQueue'
import { advanceWeek } from '../domain/sim/advanceWeek'

const EMERGENCY = 'department:emergency-response'
const FIELD = 'department:field-containment'
const BIOHAZARD = 'department:biohazard-response'
const RECORDS = 'department:records-analysis'
const ADJACENT = { inputStaging: 'adjacent', outputStaging: 'adjacent' } as const
const REMOTE = { inputStaging: 'remote', outputStaging: 'remote' } as const
const INPUT_ADJACENT_OUTPUT_REMOTE = {
  inputStaging: 'adjacent',
  outputStaging: 'remote',
} as const

function stagingPlacement(placementId: string, nodeId: string) {
  return {
    placementKind: 'staging_location' as const,
    placementId,
    nodeId,
  }
}

const MED_BAY = 'room:med_bay'
const CONTAINMENT = 'room:containment_cell'
const CLINICAL = 'section:clinical'
const MEDICAL = 'zone:medical'

function shuffled<T>(values: readonly T[]): T[] {
  return [...values].reverse()
}

describe('SPE-2998 facility section staging projection', () => {
  it('projects production adjacency onto emergency-response and leaves siblings omitted', () => {
    const graph = readProductionFacilitySectionGraph()
    const projected = projectFacilitySectionGraphOntoDepartmentLocalStaging(graph)
    expect(projected).toEqual({ [EMERGENCY]: ADJACENT })
    expect(projectProductionFacilitySectionStaging()).toEqual(projected)
    expect(projected?.[BIOHAZARD]).toBeUndefined()
    expect(projected?.[RECORDS]).toBeUndefined()
    expect(projected?.[FIELD]).toBeUndefined()
    expect(resolveDepartmentWorkshopThroughput(projected?.[EMERGENCY]).workUnits).toBe(2)
    expect(resolveDepartmentWorkshopThroughput(projected?.[BIOHAZARD]).workUnits).toBe(1)
  })

  it('projects remote on both axes when a placed department is not directly adjacent', () => {
    const validated = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: CONTAINMENT, classification: 'room' },
        { id: CLINICAL, classification: 'section' },
        { id: MEDICAL, classification: 'zone' },
      ],
      edges: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: MED_BAY, toNodeId: CONTAINMENT },
        { fromNodeId: CLINICAL, toNodeId: MEDICAL },
      ],
      placements: [
        {
          placementKind: 'department',
          placementId: EMERGENCY,
          nodeId: MED_BAY,
        },
        {
          placementKind: 'department',
          placementId: FIELD,
          nodeId: CONTAINMENT,
        },
        stagingPlacement(FACILITY_INPUT_STAGING_LOCATION_ID, CLINICAL),
        stagingPlacement(FACILITY_OUTPUT_STAGING_LOCATION_ID, CONTAINMENT),
      ],
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const projected = projectFacilitySectionGraphOntoDepartmentLocalStaging(validated.graph)
    expect(projected).toEqual({
      [EMERGENCY]: ADJACENT,
      [FIELD]: REMOTE,
    })
    expect(Object.keys(projected ?? {})).toEqual([EMERGENCY, FIELD])
    expect(resolveDepartmentWorkshopThroughput(projected?.[FIELD]).workUnits).toBe(1)
    expect(projected?.[BIOHAZARD]).toBeUndefined()
  })

  it('projects remote on one axis when only that staging location is remote', () => {
    const validated = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: CLINICAL, classification: 'section' },
        { id: MEDICAL, classification: 'zone' },
      ],
      edges: [
        { fromNodeId: MED_BAY, toNodeId: CLINICAL },
        { fromNodeId: CLINICAL, toNodeId: MEDICAL },
      ],
      placements: [
        {
          placementKind: 'department',
          placementId: EMERGENCY,
          nodeId: MED_BAY,
        },
        stagingPlacement(FACILITY_INPUT_STAGING_LOCATION_ID, CLINICAL),
        stagingPlacement(FACILITY_OUTPUT_STAGING_LOCATION_ID, MEDICAL),
      ],
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const projected = projectFacilitySectionGraphOntoDepartmentLocalStaging(validated.graph)
    expect(projected).toEqual({ [EMERGENCY]: INPUT_ADJACENT_OUTPUT_REMOTE })
    expect(projected?.[BIOHAZARD]).toBeUndefined()
    expect(projected?.[FIELD]).toBeUndefined()
    expect(resolveDepartmentWorkshopThroughput(projected?.[EMERGENCY]).workUnits).toBe(1)
  })

  it('fails closed when topology or placement cannot be resolved', () => {
    expect(projectFacilitySectionGraphOntoDepartmentLocalStaging(undefined)).toBeUndefined()

    const forged = {
      ...readProductionFacilitySectionGraph(),
      edges: readProductionFacilitySectionGraph().edges,
    }
    expect(projectFacilitySectionGraphOntoDepartmentLocalStaging(forged)).toBeUndefined()

    const missingStaging = validateFacilitySectionTopology({
      nodes: [{ id: MED_BAY, classification: 'room' }],
      edges: [],
      placements: [
        {
          placementKind: 'department',
          placementId: EMERGENCY,
          nodeId: MED_BAY,
        },
      ],
    })
    expect(missingStaging.ok).toBe(true)
    if (!missingStaging.ok) return
    expect(
      projectFacilitySectionGraphOntoDepartmentLocalStaging(missingStaging.graph)
    ).toBeUndefined()
    expect(resolveDepartmentWorkshopThroughput(undefined).workUnits).toBe(1)

    const inputOnly = validateFacilitySectionTopology({
      nodes: [
        { id: MED_BAY, classification: 'room' },
        { id: CLINICAL, classification: 'section' },
      ],
      edges: [{ fromNodeId: MED_BAY, toNodeId: CLINICAL }],
      placements: [
        {
          placementKind: 'department',
          placementId: EMERGENCY,
          nodeId: MED_BAY,
        },
        stagingPlacement('clinical_hold', CLINICAL),
        stagingPlacement(FACILITY_INPUT_STAGING_LOCATION_ID, CLINICAL),
      ],
    })
    expect(inputOnly.ok).toBe(true)
    if (!inputOnly.ok) return
    expect(projectFacilitySectionGraphOntoDepartmentLocalStaging(inputOnly.graph)).toBeUndefined()
    expect(
      resolveDepartmentWorkshopThroughput(
        projectFacilitySectionGraphOntoDepartmentLocalStaging(inputOnly.graph)?.[EMERGENCY]
      ).workUnits
    ).toBe(1)

    const malformed = validateFacilitySectionTopology({
      nodes: [{ id: MED_BAY, classification: 'room' }],
      edges: [{ fromNodeId: MED_BAY, toNodeId: 'room:command', edgeClass: 'dependency' }],
      placements: [],
    })
    expect(malformed.ok).toBe(false)
    expect(projectFacilitySectionGraphOntoDepartmentLocalStaging(undefined)).toBeUndefined()
    expect(resolveDepartmentWorkshopThroughput(undefined).workUnits).toBe(1)
  })

  it('normalizes equal topology to the same staging independent of insertion order', () => {
    const payload = {
      nodes: [
        { id: CONTAINMENT, classification: 'room' as const },
        { id: MED_BAY, classification: 'room' as const },
        { id: CLINICAL, classification: 'section' as const },
      ],
      edges: [{ fromNodeId: CONTAINMENT, toNodeId: MED_BAY }],
      placements: [
        stagingPlacement(FACILITY_INPUT_STAGING_LOCATION_ID, CONTAINMENT),
        stagingPlacement(FACILITY_OUTPUT_STAGING_LOCATION_ID, CONTAINMENT),
        {
          placementKind: 'department' as const,
          placementId: FIELD,
          nodeId: MED_BAY,
        },
        {
          placementKind: 'department' as const,
          placementId: EMERGENCY,
          nodeId: CONTAINMENT,
        },
      ],
    }
    const forward = validateFacilitySectionTopology(payload)
    const reversed = validateFacilitySectionTopology({
      nodes: shuffled(payload.nodes),
      edges: shuffled(payload.edges),
      placements: shuffled(payload.placements),
    })
    expect(forward.ok).toBe(true)
    expect(reversed.ok).toBe(true)
    if (!forward.ok || !reversed.ok) return
    expect(reversed.graph.nodes).toEqual(forward.graph.nodes)
    const forwardStaging = projectFacilitySectionGraphOntoDepartmentLocalStaging(forward.graph)
    const reversedStaging = projectFacilitySectionGraphOntoDepartmentLocalStaging(reversed.graph)
    expect(reversedStaging).toEqual(forwardStaging)
    expect(forwardStaging).toEqual({
      [EMERGENCY]: REMOTE,
      [FIELD]: ADJACENT,
    })
    expect(
      forward.graph.edges.every((edge) => edge.edgeClass === SPATIAL_ADJACENCY_EDGE_CLASS)
    ).toBe(true)
  })

  it('feeds production staging through the existing week-close tick and ignores a conflicting cache', () => {
    const state = createStartingState()
    state.departmentWorkshopWorkOrders = {
      'work:emergency': {
        id: 'work:emergency',
        departmentId: EMERGENCY,
        caseId: 'case-emergency',
        taskType: 'emergency_response',
        requiredWork: 2,
      },
      'work:biohazard': {
        id: 'work:biohazard',
        departmentId: BIOHAZARD,
        caseId: 'case-biohazard',
        taskType: 'containment_response',
        requiredWork: 2,
      },
      'work:records': {
        id: 'work:records',
        departmentId: RECORDS,
        caseId: 'case-records',
        taskType: 'records_review',
        requiredWork: 2,
      },
    }
    state.departmentWorkshopSnapshots = {
      [EMERGENCY]: {
        departmentId: EMERGENCY,
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: 'work:emergency', completedWork: 0 }],
        paused: [],
      },
      [BIOHAZARD]: {
        departmentId: BIOHAZARD,
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: 'work:biohazard', completedWork: 0 }],
        paused: [],
      },
      [RECORDS]: {
        departmentId: RECORDS,
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: 'work:records', completedWork: 0 }],
        paused: [],
      },
    }
    state.departmentLocalStaging = parseDepartmentLocalStaging({
      [EMERGENCY]: REMOTE,
      [BIOHAZARD]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    const stagingBefore = structuredClone(state.departmentLocalStaging)
    const graphBefore = structuredClone(PRODUCTION_FACILITY_SECTION_TOPOLOGY)

    const next = advanceWeek(state, Date.UTC(2026, 0, 1))
    expect(next.departmentLocalStaging).toEqual(stagingBefore)
    expect(PRODUCTION_FACILITY_SECTION_TOPOLOGY).toEqual(graphBefore)
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:biohazard']).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()

    const replay = advanceWeek(next, Date.UTC(2026, 0, 8))
    expect(replay.departmentLocalStaging).toEqual(stagingBefore)
    expect(replay.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(replay.departmentWorkshopCompletionOutcomes?.['work:biohazard']).toMatchObject({
      outcome: 'completed',
      completedWeek: 2,
    })
    expect(replay.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([])
  })
})
