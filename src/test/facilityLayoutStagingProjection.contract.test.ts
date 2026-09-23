import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import type { DepartmentLocalStaging } from '../domain/departmentLocalStaging'
import { parseDepartmentLocalStaging } from '../domain/departmentLocalStaging'
import { parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'
import {
  LAYOUT_STAGING_DEPARTMENT_ID,
  projectFacilityLayoutRoomsOntoDepartmentLocalStaging,
} from '../domain/facilityLayoutStagingProjection'
import { advanceWeek } from '../domain/sim/advanceWeek'

const RECORDS = LAYOUT_STAGING_DEPARTMENT_ID
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

function closeWith(
  staging: ReturnType<typeof createStartingState>['departmentLocalStaging'],
  snapshot: ReturnType<typeof createStartingState>['facilityLayoutSnapshot'] = undefined
) {
  const state = createStartingState()
  attachTwoDepartmentWork(state)
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
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('projects one adjacent archive room onto records-analysis and week-close grants 2 work units', () => {
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
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.['work:records']).toMatchObject({
      outcome: 'completed',
      completedWeek: 1,
    })
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('leaves false, unknown, and malformed room flags at the one-unit baseline', () => {
    const falseLayout = layoutFrom([{ roomId: 'archive', adjacentToCritical: false }])
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
      { roomId: 'med_bay', adjacentToCritical: true },
    ])
    expect(unknownRooms?.rooms.map((room) => room.roomId)).toEqual(['med_bay'])
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
    const snapshot = layoutFrom([{ roomId: 'archive', adjacentToCritical: true }])
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
      { roomId: 'archive', adjacentToCritical: true },
    ])

    const again = hydrateGame(JSON.parse(JSON.stringify(hydrated)))
    expect(again.departmentLocalStaging).toBeUndefined()
    expect(again.facilityLayoutSnapshot).toEqual(hydrated.facilityLayoutSnapshot)

    const next = closeWith(undefined, snapshot)
    expect(next.departmentLocalStaging).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })
})
