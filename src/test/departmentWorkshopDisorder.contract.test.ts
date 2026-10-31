import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  projectDepartmentWorkshopDisorder,
  projectDepartmentWorkshopDisorderByDepartment,
} from '../domain/departmentWorkshopDisorder'
import {
  deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities,
  registerDepartmentWorkshopCompletionOutcomes,
} from '../domain/departmentWorkshopLiveFacilitySafety'
import {
  processDepartmentWorkshopTick,
  resolveDepartmentWorkshopThroughput,
  sanitizeDepartmentWorkshopCompletionOutcomes,
} from '../domain/departmentWorkshopQueue'
import { parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'
import { advanceWeek } from '../domain/sim/advanceWeek'

const EMERGENCY = 'department:emergency-response'
const RECORDS = 'department:records-analysis'
const ADJACENT = { inputStaging: 'adjacent', outputStaging: 'adjacent' } as const

function physical(clutter: unknown) {
  return {
    cleanliness: 0.8,
    clutter,
    contamination: 0.1,
    damage: 0.1,
    lighting: 0.8,
    noise: 0.2,
    privacy: 0.7,
    crowding: 0.2,
  }
}

function layout(clutter: unknown) {
  return parseFacilityLayoutSnapshot({
    rooms: [
      {
        roomId: 'med_bay',
        adjacentToCritical: true,
        physicalCondition: physical(clutter),
      },
    ],
  })
}

function workshopSource(clutter: unknown, requiredWork = 2) {
  const state = createStartingState()
  state.facilityLayoutSnapshot = layout(clutter)
  state.departmentWorkshopWorkOrders = {
    'work:emergency': {
      id: 'work:emergency',
      departmentId: EMERGENCY,
      caseId: 'case:emergency',
      taskType: 'emergency_response' as const,
      requiredWork,
    },
    'work:records': {
      id: 'work:records',
      departmentId: RECORDS,
      caseId: 'case:records',
      taskType: 'records_review' as const,
      requiredWork,
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
    [RECORDS]: {
      departmentId: RECORDS,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:records', completedWork: 0 }],
      paused: [],
    },
  }
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

describe('SPE-2910 deterministic workshop clutter/disorder consequences', () => {
  it('projects ordered, cluttered, disordered, and unavailable room-owner states', () => {
    expect(projectDepartmentWorkshopDisorder(layout(0.2), EMERGENCY)).toEqual({
      level: 'ordered',
      sourceStatus: 'available',
      effect: 'ordered_room',
    })
    expect(projectDepartmentWorkshopDisorder(layout(0.5), EMERGENCY)).toEqual({
      level: 'cluttered',
      sourceStatus: 'available',
      effect: 'clutter_throughput_cap',
    })
    expect(projectDepartmentWorkshopDisorder(layout(0.8), EMERGENCY)).toEqual({
      level: 'disordered',
      sourceStatus: 'available',
      effect: 'disorder_wrong_kit_risk',
    })
    expect(projectDepartmentWorkshopDisorder(layout(0.8), RECORDS)).toEqual({
      level: 'baseline',
      sourceStatus: 'unavailable',
      effect: 'baseline',
    })
    expect(projectDepartmentWorkshopDisorder(layout('bad'), EMERGENCY)).toEqual({
      level: 'baseline',
      sourceStatus: 'unavailable',
      effect: 'baseline',
    })
  })

  it('caps adjacent staged throughput only for the exact cluttered workshop', () => {
    const disorder = projectDepartmentWorkshopDisorderByDepartment(layout(0.6))
    expect(resolveDepartmentWorkshopThroughput(ADJACENT).workUnits).toBe(2)
    expect(
      resolveDepartmentWorkshopThroughput(
        ADJACENT,
        undefined,
        undefined,
        undefined,
        disorder[EMERGENCY]
      )
    ).toEqual({
      workUnits: 1,
      effect: 'workshop_disorder_throughput_cap',
    })

    const source = workshopSource(0.6)
    const tick = processDepartmentWorkshopTick(
      source,
      undefined,
      undefined,
      { [EMERGENCY]: ADJACENT, [RECORDS]: ADJACENT },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      disorder
    )
    expect(tick.workshopState.snapshots[EMERGENCY]?.active).toEqual([
      { workOrderId: 'work:emergency', completedWork: 1 },
    ])
    expect(tick.workshopState.snapshots[RECORDS]?.active).toEqual([])
    expect(tick.completedWorkOrderIds).toEqual(['work:records'])
  })

  it('writes severe disorder as a durable degraded wrong-kit receipt and isolates siblings', () => {
    const source = workshopSource(0.9, 1)
    const quality = deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(source, [
      'work:emergency',
      'work:records',
    ])
    expect(quality['work:emergency']).toMatchObject({ workshopDisorder: 'poor' })
    expect(quality['work:records']).toBeUndefined()

    const registered = registerDepartmentWorkshopCompletionOutcomes(
      source,
      ['work:records', 'work:emergency'],
      4
    )
    expect(registered.outcomes['work:emergency']).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_workshop_disorder',
      operationalConsequence: 'wrong_kit_assembly',
    })
    expect(registered.outcomes['work:records']).toMatchObject({ quality: 'nominal' })
    expect(registered.outcomes['work:records']?.operationalConsequence).toBeUndefined()

    const combined = registerDepartmentWorkshopCompletionOutcomes(source, ['work:emergency'], 4, {
      'work:emergency': {
        inputQuality: 'poor',
        specialistCondition: 'good',
        roomContamination: 'good',
      },
    })
    expect(combined.outcomes['work:emergency']).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_input_quality',
      operationalConsequence: 'wrong_kit_assembly',
    })
    expect(
      sanitizeDepartmentWorkshopCompletionOutcomes(combined.outcomes)['work:emergency']
    ).toEqual(combined.outcomes['work:emergency'])

    const clutteredQuality = deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(
      workshopSource(0.6, 1),
      ['work:emergency']
    )
    expect(clutteredQuality['work:emergency']).toMatchObject({ workshopDisorder: 'good' })
    expect(
      registerDepartmentWorkshopCompletionOutcomes(workshopSource(0.6, 1), ['work:emergency'], 4)
        .outcomes['work:emergency']
    ).toMatchObject({ quality: 'nominal' })
  })

  it('rejects wrong-kit receipt mismatches while allowing an earlier degraded reason', () => {
    const base = {
      workOrderId: 'work:forged',
      departmentId: EMERGENCY,
      caseId: 'case:forged',
      taskType: 'emergency_response',
      completedWeek: 1,
      outcome: 'completed',
      safety: 'safe',
    }
    expect(
      sanitizeDepartmentWorkshopCompletionOutcomes({
        'work:forged': {
          ...base,
          quality: 'nominal',
          operationalConsequence: 'wrong_kit_assembly',
        },
      })
    ).toEqual({})
    expect(
      sanitizeDepartmentWorkshopCompletionOutcomes({
        'work:forged': {
          ...base,
          quality: 'degraded',
          qualityReason: 'poor_workshop_disorder',
        },
      })
    ).toEqual({})
  })

  it('round-trips room condition and preserves the resolved receipt after live cleanup', () => {
    const state = createStartingState()
    state.facilityLayoutSnapshot = layout(0.9)
    state.departmentWorkshopWorkOrders = workshopSource(0.9, 1).departmentWorkshopWorkOrders
    state.departmentWorkshopSnapshots = workshopSource(0.9, 1).departmentWorkshopSnapshots

    const completed = advanceWeek(state, Date.UTC(2026, 9, 31))
    expect(completed.departmentWorkshopCompletionOutcomes?.['work:emergency']).toMatchObject({
      completedWeek: 1,
      qualityReason: 'poor_workshop_disorder',
      operationalConsequence: 'wrong_kit_assembly',
    })

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(completed)))
    expect(hydrated.facilityLayoutSnapshot?.rooms[0]?.physicalCondition?.clutter).toBe(0.9)
    hydrated.facilityLayoutSnapshot = layout(0.1)
    const replay = advanceWeek(hydrated, Date.UTC(2026, 10, 7))
    expect(replay.departmentWorkshopCompletionOutcomes?.['work:emergency']).toEqual(
      completed.departmentWorkshopCompletionOutcomes?.['work:emergency']
    )
  })
})
