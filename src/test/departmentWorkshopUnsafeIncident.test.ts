import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  reconcileDepartmentWorkshopUnsafeSecondaryIncidents,
  sanitizeDepartmentWorkshopUnsafeSecondaryIncidents,
} from '../domain/departmentWorkshopUnsafeIncident'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import type { GameState } from '../domain/models'

function withUnsafeReceipt(state: GameState, overrides?: {
  safety?: 'safe' | 'unsafe'
  safetyReason?: 'inadequate_isolation'
  quality?: 'nominal' | 'degraded'
  qualityReason?: 'poor_room_contamination'
}): GameState {
  const caseId = 'case-001'
  const workOrderId = 'work:unsafe-secondary'
  return {
    ...state,
    departmentWorkshopWorkOrders: {
      [workOrderId]: {
        id: workOrderId,
        departmentId: 'department:biohazard-response',
        caseId,
        taskType: 'containment_response',
        requiredWork: 1,
      },
    },
    departmentWorkshopSnapshots: {
      'department:biohazard-response': {
        departmentId: 'department:biohazard-response',
        slotCapacity: 1,
        queued: [],
        active: [],
        paused: [],
      },
    },
    departmentWorkshopCompletionOutcomes: {
      [workOrderId]: {
        workOrderId,
        departmentId: 'department:biohazard-response',
        caseId,
        taskType: 'containment_response',
        completedWeek: 1,
        outcome: 'completed',
        quality: overrides?.quality ?? 'nominal',
        ...(overrides?.qualityReason ? { qualityReason: overrides.qualityReason } : {}),
        safety: overrides?.safety ?? 'unsafe',
        ...(overrides?.safety === 'unsafe' || overrides?.safety === undefined
          ? { safetyReason: overrides?.safetyReason ?? 'inadequate_isolation' }
          : {}),
      },
    },
  }
}

describe('department workshop unsafe secondary incidents', () => {
  it('sanitizes valid markers and drops malformed siblings', () => {
    expect(sanitizeDepartmentWorkshopUnsafeSecondaryIncidents(undefined)).toEqual({})
    expect(
      sanitizeDepartmentWorkshopUnsafeSecondaryIncidents({
        'work:alpha': 'case-spawned-1',
        '1': 'case-bad-key',
        'work:beta': '2',
        'work:gamma': '  ',
        'work:delta': 'case-spawned-2',
      })
    ).toEqual({
      'work:alpha': 'case-spawned-1',
      'work:delta': 'case-spawned-2',
    })
  })

  it('spawns one parent-linked secondary case from an unsafe receipt', () => {
    const source = withUnsafeReceipt(createStartingState())
    const beforeCaseIds = new Set(Object.keys(source.cases))

    const result = reconcileDepartmentWorkshopUnsafeSecondaryIncidents(source)

    expect(result.spawnedWorkOrderIds).toEqual(['work:unsafe-secondary'])
    expect(result.spawnedCases).toHaveLength(1)
    expect(result.spawnedCases[0]).toMatchObject({
      parentCaseId: 'case-001',
      trigger: 'workshop_unsafe',
      sourceReason: 'inadequate_isolation',
    })
    const spawnedId = result.spawnedCases[0]?.caseId
    expect(spawnedId).toBeTruthy()
    expect(beforeCaseIds.has(spawnedId!)).toBe(false)
    expect(result.state.cases[spawnedId!]).toBeDefined()
    expect(result.state.departmentWorkshopUnsafeSecondaryIncidents).toEqual({
      'work:unsafe-secondary': spawnedId,
    })

    const replay = reconcileDepartmentWorkshopUnsafeSecondaryIncidents(result.state)
    expect(replay.spawnedWorkOrderIds).toEqual([])
    expect(replay.state.departmentWorkshopUnsafeSecondaryIncidents).toEqual(
      result.state.departmentWorkshopUnsafeSecondaryIncidents
    )
    expect(Object.keys(replay.state.cases)).toEqual(Object.keys(result.state.cases))
  })

  it('does not spawn from safe or quality-degraded-only receipts', () => {
    const safe = withUnsafeReceipt(createStartingState(), { safety: 'safe' })
    const safeResult = reconcileDepartmentWorkshopUnsafeSecondaryIncidents(safe)
    expect(safeResult.spawnedWorkOrderIds).toEqual([])
    expect(safeResult.state.departmentWorkshopUnsafeSecondaryIncidents ?? {}).toEqual(
      safe.departmentWorkshopUnsafeSecondaryIncidents ?? {}
    )
    expect(Object.keys(safeResult.state.cases)).toEqual(Object.keys(safe.cases))

    const degradedOnly = withUnsafeReceipt(createStartingState(), {
      safety: 'safe',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
    const degradedResult = reconcileDepartmentWorkshopUnsafeSecondaryIncidents(degradedOnly)
    expect(degradedResult.spawnedWorkOrderIds).toEqual([])
    expect(Object.keys(degradedResult.state.cases)).toEqual(Object.keys(degradedOnly.cases))
    expect(degradedResult.state.departmentWorkshopUnsafeSecondaryIncidents ?? {}).toEqual(
      degradedOnly.departmentWorkshopUnsafeSecondaryIncidents ?? {}
    )
  })

  it('spawns once at week-close and stays idempotent across replay and save/load', () => {
    const source = withUnsafeReceipt(createStartingState())

    const advanced = advanceWeek(source, Date.UTC(2026, 0, 1))
    const spawnedId = advanced.departmentWorkshopUnsafeSecondaryIncidents?.['work:unsafe-secondary']
    expect(spawnedId).toBeTruthy()
    expect(advanced.cases[spawnedId!]).toBeDefined()
    expect(source.cases[spawnedId!]).toBeUndefined()

    const replay = advanceWeek(advanced, Date.UTC(2026, 0, 8))
    expect(replay.departmentWorkshopUnsafeSecondaryIncidents).toEqual(
      advanced.departmentWorkshopUnsafeSecondaryIncidents
    )
    expect(
      Object.keys(replay.cases).filter(
        (id) =>
          replay.departmentWorkshopUnsafeSecondaryIncidents?.['work:unsafe-secondary'] === id
      )
    ).toHaveLength(1)

    const loaded = loadGameSave(serializeGameSave(advanced))
    expect(loaded.departmentWorkshopUnsafeSecondaryIncidents).toEqual(
      advanced.departmentWorkshopUnsafeSecondaryIncidents
    )
    const afterLoad = advanceWeek(loaded, Date.UTC(2026, 0, 8))
    expect(afterLoad.departmentWorkshopUnsafeSecondaryIncidents).toEqual(
      advanced.departmentWorkshopUnsafeSecondaryIncidents
    )
    expect(afterLoad.cases[spawnedId!]).toBeDefined()
  })

  it('does not spawn at week-close for quality-degraded without unsafe', () => {
    const source = withUnsafeReceipt(createStartingState(), {
      safety: 'safe',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
    const advanced = advanceWeek(source, Date.UTC(2026, 0, 1))
    expect(advanced.departmentWorkshopUnsafeSecondaryIncidents ?? {}).toEqual({})
    expect(advanced.departmentWorkshopUnsafeSecondaryIncidents?.['work:unsafe-secondary']).toBeUndefined()
  })
})
