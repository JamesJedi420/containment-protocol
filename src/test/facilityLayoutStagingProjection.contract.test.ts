import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import type { DepartmentLocalStaging } from '../domain/departmentLocalStaging'
import { parseDepartmentLocalStaging } from '../domain/departmentLocalStaging'
import { parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'
import {
  LAYOUT_STAGING_CONCEPT_DEPARTMENT_ID,
  LAYOUT_STAGING_DEPARTMENT_ID,
  LAYOUT_STAGING_EMERGENCY_DEPARTMENT_ID,
  LAYOUT_STAGING_ETHICS_DEPARTMENT_ID,
  LAYOUT_STAGING_FIELD_CONTAINMENT_DEPARTMENT_ID,
  LAYOUT_STAGING_GENERAL_INTAKE_DEPARTMENT_ID,
  LAYOUT_STAGING_PROCUREMENT_DEPARTMENT_ID,
  projectFacilityLayoutRoomsOntoDepartmentLocalStaging,
} from '../domain/facilityLayoutStagingProjection'
import { advanceWeek } from '../domain/sim/advanceWeek'

const RECORDS = LAYOUT_STAGING_DEPARTMENT_ID
const EMERGENCY = LAYOUT_STAGING_EMERGENCY_DEPARTMENT_ID
const FIELD = LAYOUT_STAGING_FIELD_CONTAINMENT_DEPARTMENT_ID
const PROCUREMENT = LAYOUT_STAGING_PROCUREMENT_DEPARTMENT_ID
const ETHICS = LAYOUT_STAGING_ETHICS_DEPARTMENT_ID
const CONCEPT = LAYOUT_STAGING_CONCEPT_DEPARTMENT_ID
const GENERAL_INTAKE = LAYOUT_STAGING_GENERAL_INTAKE_DEPARTMENT_ID
const BIOHAZARD = 'department:biohazard-response'
const ADJACENT = { inputStaging: 'adjacent', outputStaging: 'adjacent' } as const
const REMOTE = { inputStaging: 'remote', outputStaging: 'remote' } as const

function layoutFrom(rooms: unknown) {
  return parseFacilityLayoutSnapshot({ rooms })
}

function attachTwoDepartmentWork(state: ReturnType<typeof createStartingState>, requiredWork = 2) {
  state.departmentWorkshopWorkOrders = {
    'work:records': {
      id: 'work:records',
      departmentId: RECORDS,
      caseId: 'case-records',
      taskType: 'records_review',
      requiredWork,
    },
    'work:biohazard': {
      id: 'work:biohazard',
      departmentId: BIOHAZARD,
      caseId: 'case-biohazard',
      taskType: 'containment_response',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    [RECORDS]: {
      departmentId: RECORDS,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:records', completedWork: 0 }],
      paused: [],
    },
    [BIOHAZARD]: {
      departmentId: BIOHAZARD,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:biohazard', completedWork: 0 }],
      paused: [],
    },
  }
}

function attachEmergencyWork(state: ReturnType<typeof createStartingState>, requiredWork = 2) {
  state.departmentWorkshopWorkOrders = {
    ...state.departmentWorkshopWorkOrders,
    'work:emergency': {
      id: 'work:emergency',
      departmentId: EMERGENCY,
      caseId: 'case-emergency',
      taskType: 'emergency_response',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    ...state.departmentWorkshopSnapshots,
    [EMERGENCY]: {
      departmentId: EMERGENCY,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:emergency', completedWork: 0 }],
      paused: [],
    },
  }
}

function attachFieldContainmentWork(
  state: ReturnType<typeof createStartingState>,
  requiredWork = 2
) {
  state.departmentWorkshopWorkOrders = {
    ...state.departmentWorkshopWorkOrders,
    'work:field': {
      id: 'work:field',
      departmentId: FIELD,
      caseId: 'case-field',
      taskType: 'containment_response',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    ...state.departmentWorkshopSnapshots,
    [FIELD]: {
      departmentId: FIELD,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:field', completedWork: 0 }],
      paused: [],
    },
  }
}

function attachProcurementWork(state: ReturnType<typeof createStartingState>, requiredWork = 2) {
  state.departmentWorkshopWorkOrders = {
    ...state.departmentWorkshopWorkOrders,
    'work:procurement': {
      id: 'work:procurement',
      departmentId: PROCUREMENT,
      caseId: 'case-procurement',
      taskType: 'procurement_support',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    ...state.departmentWorkshopSnapshots,
    [PROCUREMENT]: {
      departmentId: PROCUREMENT,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:procurement', completedWork: 0 }],
      paused: [],
    },
  }
}

function attachEthicsWork(state: ReturnType<typeof createStartingState>, requiredWork = 2) {
  state.departmentWorkshopWorkOrders = {
    ...state.departmentWorkshopWorkOrders,
    'work:ethics': {
      id: 'work:ethics',
      departmentId: ETHICS,
      caseId: 'case-ethics',
      taskType: 'ethics_veto',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    ...state.departmentWorkshopSnapshots,
    [ETHICS]: {
      departmentId: ETHICS,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:ethics', completedWork: 0 }],
      paused: [],
    },
  }
}

function attachConceptWork(state: ReturnType<typeof createStartingState>, requiredWork = 2) {
  state.departmentWorkshopWorkOrders = {
    ...state.departmentWorkshopWorkOrders,
    'work:concept': {
      id: 'work:concept',
      departmentId: CONCEPT,
      caseId: 'case-concept',
      taskType: 'research_case',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    ...state.departmentWorkshopSnapshots,
    [CONCEPT]: {
      departmentId: CONCEPT,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:concept', completedWork: 0 }],
      paused: [],
    },
  }
}

function closeWith(
  staging: ReturnType<typeof createStartingState>['departmentLocalStaging'],
  snapshot: ReturnType<typeof createStartingState>['facilityLayoutSnapshot'] = undefined,
  options?: {
    readonly emergency?: boolean
    readonly field?: boolean
    readonly procurement?: boolean
    readonly ethics?: boolean
    readonly concept?: boolean
  }
) {
  const state = createStartingState()
  attachTwoDepartmentWork(state)
  if (options?.emergency) attachEmergencyWork(state)
  if (options?.field) attachFieldContainmentWork(state)
  if (options?.procurement) attachProcurementWork(state)
  if (options?.ethics) attachEthicsWork(state)
  if (options?.concept) attachConceptWork(state)
  if (staging !== undefined) state.departmentLocalStaging = staging
  if (snapshot !== undefined) state.facilityLayoutSnapshot = snapshot
  const stagingBefore = structuredClone(state.departmentLocalStaging)
  const snapshotBefore = structuredClone(state.facilityLayoutSnapshot)
  const next = advanceWeek(state, Date.UTC(2026, 0, 1))
  expect(next.departmentLocalStaging).toEqual(stagingBefore)
  expect(next.facilityLayoutSnapshot).toEqual(snapshotBefore)
  return next
}

describe('facility layout staging projection', () => {
  it('returns an omitted layout staging map unchanged, including the same reference', () => {
    const staging = parseDepartmentLocalStaging({
      [RECORDS]: ADJACENT,
      [BIOHAZARD]: REMOTE,
    })
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(undefined, staging)).toBe(staging)
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(undefined, undefined)
    ).toBeUndefined()

    const next = closeWith(staging)
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects one adjacent archive room onto records-analysis without granting week-close throughput', () => {
    const layout = layoutFrom([{ roomId: 'archive', adjacentToCritical: true }])
    const stagingBefore = parseDepartmentLocalStaging({ [BIOHAZARD]: REMOTE })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([BIOHAZARD, RECORDS])

    const next = closeWith(projected, layout)
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects adjacent archive and med_bay together and leaves an unmapped sibling at 1 work unit', () => {
    const layout = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
    ])
    expect(layout?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
    ])
    const stagingBefore = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
    })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([BIOHAZARD, EMERGENCY, RECORDS])

    const medBayOnly = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
      layoutFrom([{ roomId: 'med_bay', adjacentToCritical: true }]),
      undefined
    )
    expect(medBayOnly).toEqual({ [EMERGENCY]: ADJACENT })

    const next = closeWith(projected, layout, { emergency: true })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects adjacent archive, med_bay, and armory together and leaves an unmapped sibling at 1 work unit', () => {
    const layout = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
    ])
    expect(layout?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
    ])
    const stagingBefore = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [FIELD]: REMOTE,
    })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [FIELD]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([BIOHAZARD, EMERGENCY, FIELD, RECORDS])

    const armoryOnly = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
      layoutFrom([{ roomId: 'armory', adjacentToCritical: true }]),
      undefined
    )
    expect(armoryOnly).toEqual({ [FIELD]: ADJACENT })

    const next = closeWith(projected, layout, { emergency: true, field: true })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:field']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects adjacent archive, med_bay, armory, and staging_closet together and leaves an unmapped sibling at 1 work unit', () => {
    const layout = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
    ])
    expect(layout?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
    ])
    const stagingBefore = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [FIELD]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [FIELD]: ADJACENT,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([
      BIOHAZARD,
      EMERGENCY,
      FIELD,
      PROCUREMENT,
      RECORDS,
    ])

    const closetOnly = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
      layoutFrom([{ roomId: 'staging_closet', adjacentToCritical: true }]),
      undefined
    )
    expect(closetOnly).toEqual({ [PROCUREMENT]: ADJACENT })

    const next = closeWith(projected, layout, { emergency: true, field: true, procurement: true })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:field']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[PROCUREMENT]?.active).toEqual([
      { workOrderId: 'work:procurement', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:procurement']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects adjacent archive, med_bay, armory, staging_closet, and legal together and leaves an unmapped sibling at 1 work unit', () => {
    const layout = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
    ])
    expect(layout?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
    ])
    const stagingBefore = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [ETHICS]: REMOTE,
      [FIELD]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [ETHICS]: ADJACENT,
      [FIELD]: ADJACENT,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([
      BIOHAZARD,
      EMERGENCY,
      ETHICS,
      FIELD,
      PROCUREMENT,
      RECORDS,
    ])

    const legalOnly = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
      layoutFrom([{ roomId: 'legal', adjacentToCritical: true }]),
      undefined
    )
    expect(legalOnly).toEqual({ [ETHICS]: ADJACENT })

    const next = closeWith(projected, layout, {
      emergency: true,
      ethics: true,
      field: true,
      procurement: true,
    })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:field']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[PROCUREMENT]?.active).toEqual([
      { workOrderId: 'work:procurement', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:procurement']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[ETHICS]?.active).toEqual([
      { workOrderId: 'work:ethics', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:ethics']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects adjacent archive, med_bay, armory, staging_closet, legal, and finance together and leaves an unmapped sibling at 1 work unit', () => {
    const layout = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
    ])
    expect(layout?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
    ])
    const stagingBefore = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: REMOTE,
      [EMERGENCY]: REMOTE,
      [ETHICS]: REMOTE,
      [FIELD]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: ADJACENT,
      [EMERGENCY]: ADJACENT,
      [ETHICS]: ADJACENT,
      [FIELD]: ADJACENT,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([
      BIOHAZARD,
      CONCEPT,
      EMERGENCY,
      ETHICS,
      FIELD,
      PROCUREMENT,
      RECORDS,
    ])

    const financeOnly = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
      layoutFrom([{ roomId: 'finance', adjacentToCritical: true }]),
      undefined
    )
    expect(financeOnly).toEqual({ [CONCEPT]: ADJACENT })

    const next = closeWith(projected, layout, {
      concept: true,
      emergency: true,
      ethics: true,
      field: true,
      procurement: true,
    })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:field']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[PROCUREMENT]?.active).toEqual([
      { workOrderId: 'work:procurement', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:procurement']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[ETHICS]?.active).toEqual([
      { workOrderId: 'work:ethics', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:ethics']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[CONCEPT]?.active).toEqual([
      { workOrderId: 'work:concept', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:concept']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects adjacent archive, med_bay, armory, staging_closet, legal, finance, and containment_cell together and leaves an unmapped sibling at 1 work unit', () => {
    const layout = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
    ])
    expect(layout?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
    ])
    const stagingBefore = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: REMOTE,
      [EMERGENCY]: REMOTE,
      [ETHICS]: REMOTE,
      [FIELD]: REMOTE,
      [GENERAL_INTAKE]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    const stagingClone = structuredClone(stagingBefore)
    const layoutClone = structuredClone(layout)
    const projected = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, stagingBefore)

    expect(stagingBefore).toEqual(stagingClone)
    expect(layout).toEqual(layoutClone)
    expect(projected).toEqual({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: ADJACENT,
      [EMERGENCY]: ADJACENT,
      [ETHICS]: ADJACENT,
      [FIELD]: ADJACENT,
      [GENERAL_INTAKE]: ADJACENT,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })
    expect(Object.keys(projected ?? {})).toEqual([
      BIOHAZARD,
      CONCEPT,
      EMERGENCY,
      ETHICS,
      FIELD,
      GENERAL_INTAKE,
      PROCUREMENT,
      RECORDS,
    ])

    const cellOnly = projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
      layoutFrom([{ roomId: 'containment_cell', adjacentToCritical: true }]),
      undefined
    )
    expect(cellOnly).toEqual({ [GENERAL_INTAKE]: ADJACENT })

    const next = closeWith(projected, layout, {
      concept: true,
      emergency: true,
      ethics: true,
      field: true,
      procurement: true,
    })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:field']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[PROCUREMENT]?.active).toEqual([
      { workOrderId: 'work:procurement', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:procurement']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[ETHICS]?.active).toEqual([
      { workOrderId: 'work:ethics', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:ethics']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[CONCEPT]?.active).toEqual([
      { workOrderId: 'work:concept', completedWork: 1 },
    ])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:concept']).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[GENERAL_INTAKE]).toBeUndefined()
    expect(
      Object.values(next.departmentWorkshopWorkOrders ?? {}).some(
        (order) => order.departmentId === GENERAL_INTAKE
      )
    ).toBe(false)
    expect(
      Object.values(next.departmentWorkshopCompletionOutcomes ?? {}).some(
        (outcome) => outcome.departmentId === GENERAL_INTAKE
      )
    ).toBe(false)
  })

  it('leaves a false containment_cell flag unprojected without clearing the six authored rooms or a saved general-intake entry', () => {
    const falseCell = layoutFrom([{ roomId: 'containment_cell', adjacentToCritical: false }])
    expect(falseCell?.rooms).toEqual([{ roomId: 'containment_cell', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseCell, undefined)
    ).toBeUndefined()

    const savedIntake = parseDepartmentLocalStaging({ [GENERAL_INTAKE]: REMOTE })
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseCell, savedIntake)).toEqual({
      [GENERAL_INTAKE]: REMOTE,
    })

    const othersStillAdjacent = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: false },
    ])
    const saved = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: REMOTE,
      [EMERGENCY]: REMOTE,
      [ETHICS]: REMOTE,
      [FIELD]: REMOTE,
      [GENERAL_INTAKE]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(othersStillAdjacent, saved)
    ).toEqual({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: ADJACENT,
      [EMERGENCY]: ADJACENT,
      [ETHICS]: ADJACENT,
      [FIELD]: ADJACENT,
      [GENERAL_INTAKE]: REMOTE,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })

    const falseClose = closeWith(undefined, falseCell, {
      concept: true,
      emergency: true,
      ethics: true,
      field: true,
      procurement: true,
    })
    expect(falseClose.departmentLocalStaging).toBeUndefined()
    expect(falseClose.departmentWorkshopSnapshots?.[GENERAL_INTAKE]).toBeUndefined()
    expect(
      Object.values(falseClose.departmentWorkshopWorkOrders ?? {}).some(
        (order) => order.departmentId === GENERAL_INTAKE
      )
    ).toBe(false)
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('leaves a false finance flag unprojected without clearing archive, med_bay, armory, staging_closet, legal, or a saved concept entry', () => {
    const falseFinance = layoutFrom([{ roomId: 'finance', adjacentToCritical: false }])
    expect(falseFinance?.rooms).toEqual([{ roomId: 'finance', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseFinance, undefined)
    ).toBeUndefined()

    const savedConcept = parseDepartmentLocalStaging({ [CONCEPT]: REMOTE })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseFinance, savedConcept)
    ).toEqual({
      [CONCEPT]: REMOTE,
    })

    const othersStillAdjacent = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: false },
    ])
    const saved = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: REMOTE,
      [EMERGENCY]: REMOTE,
      [ETHICS]: REMOTE,
      [FIELD]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(othersStillAdjacent, saved)
    ).toEqual({
      [BIOHAZARD]: REMOTE,
      [CONCEPT]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [ETHICS]: ADJACENT,
      [FIELD]: ADJACENT,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })

    const falseClose = closeWith(undefined, falseFinance, { concept: true })
    expect(falseClose.departmentLocalStaging).toBeUndefined()
    expect(falseClose.departmentWorkshopSnapshots?.[CONCEPT]?.active).toEqual([
      { workOrderId: 'work:concept', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('leaves a false legal flag unprojected without clearing archive, med_bay, armory, staging_closet, or a saved ethics entry', () => {
    const falseLegal = layoutFrom([{ roomId: 'legal', adjacentToCritical: false }])
    expect(falseLegal?.rooms).toEqual([{ roomId: 'legal', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseLegal, undefined)
    ).toBeUndefined()

    const savedEthics = parseDepartmentLocalStaging({ [ETHICS]: REMOTE })
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseLegal, savedEthics)).toEqual({
      [ETHICS]: REMOTE,
    })

    const othersStillAdjacent = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: false },
    ])
    const saved = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [ETHICS]: REMOTE,
      [FIELD]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(othersStillAdjacent, saved)
    ).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [ETHICS]: REMOTE,
      [FIELD]: ADJACENT,
      [PROCUREMENT]: ADJACENT,
      [RECORDS]: ADJACENT,
    })

    const falseClose = closeWith(undefined, falseLegal, { ethics: true })
    expect(falseClose.departmentLocalStaging).toBeUndefined()
    expect(falseClose.departmentWorkshopSnapshots?.[ETHICS]?.active).toEqual([
      { workOrderId: 'work:ethics', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('does not derive ethics-review from ethics_review or general-intake from evidence_intake', () => {
    const ethicsReviewRoom = layoutFrom([{ roomId: 'ethics_review', adjacentToCritical: true }])
    expect(ethicsReviewRoom?.rooms).toEqual([{ roomId: 'ethics_review', adjacentToCritical: true }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(ethicsReviewRoom, undefined)
    ).toBeUndefined()
    const savedEthics = parseDepartmentLocalStaging({ [ETHICS]: REMOTE })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(ethicsReviewRoom, savedEthics)
    ).toEqual({
      [ETHICS]: REMOTE,
    })

    const evidenceIntake = layoutFrom([{ roomId: 'evidence_intake', adjacentToCritical: true }])
    expect(evidenceIntake?.rooms).toEqual([{ roomId: 'evidence_intake', adjacentToCritical: true }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(evidenceIntake, undefined)
    ).toBeUndefined()
    const savedIntake = parseDepartmentLocalStaging({ [GENERAL_INTAKE]: REMOTE })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(evidenceIntake, savedIntake)
    ).toEqual({
      [GENERAL_INTAKE]: REMOTE,
    })

    const evidenceWithFalseCell = layoutFrom([
      { roomId: 'evidence_intake', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: false },
    ])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(evidenceWithFalseCell, undefined)
    ).toBeUndefined()
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(evidenceWithFalseCell, savedIntake)
    ).toEqual({
      [GENERAL_INTAKE]: REMOTE,
    })
  })

  it('leaves a false staging_closet flag unprojected without clearing archive, med_bay, armory, or a saved procurement entry', () => {
    const falseCloset = layoutFrom([{ roomId: 'staging_closet', adjacentToCritical: false }])
    expect(falseCloset?.rooms).toEqual([{ roomId: 'staging_closet', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseCloset, undefined)
    ).toBeUndefined()

    const savedProcurement = parseDepartmentLocalStaging({ [PROCUREMENT]: REMOTE })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseCloset, savedProcurement)
    ).toEqual({
      [PROCUREMENT]: REMOTE,
    })

    const othersStillAdjacent = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: false },
    ])
    const saved = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [FIELD]: REMOTE,
      [PROCUREMENT]: REMOTE,
    })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(othersStillAdjacent, saved)
    ).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [FIELD]: ADJACENT,
      [PROCUREMENT]: REMOTE,
      [RECORDS]: ADJACENT,
    })

    const falseClose = closeWith(undefined, falseCloset, { procurement: true })
    expect(falseClose.departmentLocalStaging).toBeUndefined()
    expect(falseClose.departmentWorkshopSnapshots?.[PROCUREMENT]?.active).toEqual([
      { workOrderId: 'work:procurement', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('leaves a false armory flag unprojected without clearing archive, med_bay, or a saved field entry', () => {
    const falseArmory = layoutFrom([{ roomId: 'armory', adjacentToCritical: false }])
    expect(falseArmory?.rooms).toEqual([{ roomId: 'armory', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseArmory, undefined)
    ).toBeUndefined()

    const savedField = parseDepartmentLocalStaging({ [FIELD]: REMOTE })
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseArmory, savedField)).toEqual({
      [FIELD]: REMOTE,
    })

    const othersStillAdjacent = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: false },
    ])
    const saved = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [FIELD]: REMOTE,
    })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(othersStillAdjacent, saved)
    ).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: ADJACENT,
      [FIELD]: REMOTE,
      [RECORDS]: ADJACENT,
    })

    const falseClose = closeWith(undefined, falseArmory, { field: true })
    expect(falseClose.departmentLocalStaging).toBeUndefined()
    expect(falseClose.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('leaves a false med_bay flag unprojected without clearing archive or a saved emergency entry', () => {
    const falseMedBay = layoutFrom([{ roomId: 'med_bay', adjacentToCritical: false }])
    expect(falseMedBay?.rooms).toEqual([{ roomId: 'med_bay', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseMedBay, undefined)
    ).toBeUndefined()

    const savedEmergency = parseDepartmentLocalStaging({ [EMERGENCY]: REMOTE })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseMedBay, savedEmergency)
    ).toEqual({ [EMERGENCY]: REMOTE })

    const archiveStillAdjacent = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: false },
    ])
    const saved = parseDepartmentLocalStaging({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
    })
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(archiveStillAdjacent, saved)
    ).toEqual({
      [BIOHAZARD]: REMOTE,
      [EMERGENCY]: REMOTE,
      [RECORDS]: ADJACENT,
    })

    const falseClose = closeWith(undefined, falseMedBay, { emergency: true })
    expect(falseClose.departmentLocalStaging).toBeUndefined()
    expect(falseClose.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(falseClose.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
  })

  it('leaves false, unknown, and malformed room flags at the one-unit baseline', () => {
    const falseLayout = layoutFrom([{ roomId: 'archive', adjacentToCritical: false }])
    expect(falseLayout?.rooms).toEqual([{ roomId: 'archive', adjacentToCritical: false }])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseLayout, undefined)
    ).toBeUndefined()

    const savedSibling = parseDepartmentLocalStaging({ [BIOHAZARD]: ADJACENT })
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseLayout, savedSibling)).toEqual(
      { [BIOHAZARD]: ADJACENT }
    )
    const savedRecords = parseDepartmentLocalStaging({ [RECORDS]: REMOTE })
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseLayout, savedRecords)).toEqual(
      {
        [RECORDS]: REMOTE,
      }
    )

    const unknownRooms = layoutFrom([
      { roomId: 'planetarium', adjacentToCritical: true },
      { roomId: 'command', adjacentToCritical: true },
    ])
    expect(unknownRooms?.rooms.map((room) => room.roomId)).toEqual(['command'])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(unknownRooms, undefined)
    ).toBeUndefined()

    const malformed = parseFacilityLayoutSnapshot({
      archetype: 'compact_headquarters',
      rooms: [{ roomId: 'archive', adjacentToCritical: 'yes' }],
    })
    expect(malformed?.rooms).toEqual([])
    expect(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(malformed, undefined)
    ).toBeUndefined()

    const dirty = {
      'department:not-a-department': ADJACENT,
      [BIOHAZARD]: REMOTE,
    } as DepartmentLocalStaging
    expect(projectFacilityLayoutRoomsOntoDepartmentLocalStaging(falseLayout, dirty)).toEqual({
      [BIOHAZARD]: REMOTE,
    })

    const falseClose = closeWith(undefined, falseLayout)
    expect(falseClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(falseClose.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])

    const unknownClose = closeWith(
      projectFacilityLayoutRoomsOntoDepartmentLocalStaging(unknownRooms, undefined),
      unknownRooms
    )
    expect(unknownClose.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
  })

  it('does not apply the projection during hydration or week-close', () => {
    const starting = createStartingState()
    const snapshot = layoutFrom([
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
    ])
    const hydrated = hydrateGame(
      JSON.parse(
        JSON.stringify({
          ...starting,
          facilityLayoutSnapshot: snapshot,
        })
      )
    )
    expect(hydrated.departmentLocalStaging).toBeUndefined()
    expect(hydrated.facilityLayoutSnapshot?.rooms).toEqual([
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'armory', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: true },
      { roomId: 'archive', adjacentToCritical: true },
      { roomId: 'staging_closet', adjacentToCritical: true },
      { roomId: 'legal', adjacentToCritical: true },
      { roomId: 'finance', adjacentToCritical: true },
    ])

    const again = hydrateGame(JSON.parse(JSON.stringify(hydrated)))
    expect(again.departmentLocalStaging).toBeUndefined()
    expect(again.facilityLayoutSnapshot).toEqual(hydrated.facilityLayoutSnapshot)

    const next = closeWith(undefined, snapshot, {
      concept: true,
      emergency: true,
      ethics: true,
      field: true,
      procurement: true,
    })
    expect(next.departmentLocalStaging).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[EMERGENCY]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[FIELD]?.active).toEqual([
      { workOrderId: 'work:field', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[PROCUREMENT]?.active).toEqual([
      { workOrderId: 'work:procurement', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[ETHICS]?.active).toEqual([
      { workOrderId: 'work:ethics', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[CONCEPT]?.active).toEqual([
      { workOrderId: 'work:concept', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })
})
