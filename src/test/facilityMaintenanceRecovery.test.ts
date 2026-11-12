import { describe, expect, it } from 'vitest'
import { resolveFacilityMaintenanceRecovery } from '../domain/facilityMaintenanceRecovery'
import { resolveFacilityMaintenanceWeekClose } from '../domain/facilityMaintenanceWeekClose'
import { FACILITY_ROOM_IDS, parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'
import { processDepartmentWorkshopTick } from '../domain/departmentWorkshopQueue'

const state = (maintenanceDebt: number) => ({ maintenanceDebt, lastProcessedWeek: 5 })
const resources = (maintenanceHours = 20, partsReserve = 12) => ({ maintenanceHours, partsReserve })

describe('SPE-3182 pure facility maintenance recovery', () => {
  it.each([0, 7])('leaves stable debt %i and resources unchanged', (debt) => {
    const result = resolveFacilityMaintenanceRecovery(state(debt), resources())
    expect(result).toEqual({
      status: 'not_required',
      state: state(debt),
      resources: resources(),
      consumed: resources(0, 0),
      collapse: { activePathways: [], firedPathwayIds: [] },
    })
  })

  it.each([
    [8, 4, 2],
    [17, 4, 2],
    [18, 10, 6],
    [29, 10, 6],
    [30, 20, 12],
    [Number.MAX_SAFE_INTEGER, 20, 12],
  ])('clears debt %i using exactly %i hours and %i parts', (debt, hours, parts) => {
    const result = resolveFacilityMaintenanceRecovery(state(debt), resources(hours, parts))
    expect(result).toEqual({
      status: 'recovered',
      state: state(0),
      resources: resources(0, 0),
      consumed: resources(hours, parts),
      required: resources(hours, parts),
      collapse: { activePathways: [], firedPathwayIds: [] },
    })
  })

  it('retains surplus, preserves the replay marker, and charges nothing on retry', () => {
    const result = resolveFacilityMaintenanceRecovery(state(30), resources(27, 16))
    expect(result.status).toBe('recovered')
    if (result.status !== 'recovered') throw new Error('Expected recovered state')
    expect(result.resources).toEqual(resources(7, 4))
    expect(result.state.lastProcessedWeek).toBe(5)
    const replay = resolveFacilityMaintenanceRecovery(result.state, result.resources)
    expect(replay).toMatchObject({
      status: 'not_required',
      state: state(0),
      resources: resources(7, 4),
      consumed: resources(0, 0),
    })
  })

  it.each([
    [8, 3, 2, 4, 2],
    [8, 4, 1, 4, 2],
    [18, 9, 6, 10, 6],
    [18, 10, 5, 10, 6],
    [30, 19, 12, 20, 12],
    [30, 20, 11, 20, 12],
    [30, 0, 0, 20, 12],
  ])('fails atomically for debt %i with %i hours and %i parts', (debt, hours, parts, rh, rp) => {
    const prior = Object.freeze(state(debt))
    const available = Object.freeze(resources(hours, parts))
    const result = resolveFacilityMaintenanceRecovery(prior, available)
    expect(result).toMatchObject({
      status: 'insufficient_resources',
      state: prior,
      resources: available,
      consumed: resources(0, 0),
      required: resources(rh, rp),
    })
    if (result.status !== 'insufficient_resources')
      throw new Error('Expected insufficient resources')
    expect(result.collapse.firedPathwayIds).toEqual(
      debt >= 30 ? ['maintenance_debt_overrun', 'logistics_stall'] : ['maintenance_debt_overrun']
    )
    expect(prior).toEqual(state(debt))
    expect(available).toEqual(resources(hours, parts))
  })

  const malformed = [
    undefined,
    null,
    [],
    12,
    '12',
    {},
    { maintenanceHours: 20 },
    { partsReserve: 12 },
  ]
  it.each(malformed.map((value) => [value]))('rejects malformed resources %j', (value) => {
    expect(resolveFacilityMaintenanceRecovery(state(30), value)).toEqual({ status: 'invalid' })
  })

  it.each(['maintenanceHours', 'partsReserve'] as const)(
    'validates %s even for stable debt',
    (key) => {
      for (const value of [
        undefined,
        null,
        '20',
        true,
        -1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        2 ** 53,
      ]) {
        expect(
          resolveFacilityMaintenanceRecovery(state(0), { ...resources(), [key]: value })
        ).toEqual({
          status: 'invalid',
        })
      }
      const inherited = Object.create(resources()) as unknown
      expect(resolveFacilityMaintenanceRecovery(state(30), inherited)).toEqual({
        status: 'invalid',
      })
    }
  )

  it.each(
    [
      undefined,
      null,
      [],
      30,
      {},
      { maintenanceDebt: 30 },
      { lastProcessedWeek: 5 },
      { maintenanceDebt: -1, lastProcessedWeek: 5 },
      { maintenanceDebt: 0.5, lastProcessedWeek: 5 },
      { maintenanceDebt: NaN, lastProcessedWeek: 5 },
      { maintenanceDebt: Infinity, lastProcessedWeek: 5 },
      { maintenanceDebt: 2 ** 53, lastProcessedWeek: 5 },
      { maintenanceDebt: 30, lastProcessedWeek: -1 },
      { maintenanceDebt: 30, lastProcessedWeek: 0.5 },
      { maintenanceDebt: 30, lastProcessedWeek: Infinity },
      { maintenanceDebt: 30, lastProcessedWeek: 2 ** 53 },
    ].map((value) => [value])
  )('rejects malformed state %j without proposing changes', (value) => {
    expect(resolveFacilityMaintenanceRecovery(value, resources())).toEqual({ status: 'invalid' })
  })

  it('accepts zero resources as insufficient and maximum safe resource quantities as valid', () => {
    expect(resolveFacilityMaintenanceRecovery(state(8), resources(0, 0)).status).toBe(
      'insufficient_resources'
    )
    expect(resolveFacilityMaintenanceRecovery(state(0), resources(0, 0)).status).toBe(
      'not_required'
    )
    expect(
      resolveFacilityMaintenanceRecovery(
        state(30),
        resources(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
      )
    ).toMatchObject({
      status: 'recovered',
      resources: resources(Number.MAX_SAFE_INTEGER - 20, Number.MAX_SAFE_INTEGER - 12),
    })
  })

  it.each([0, 8, 30])('returns detached immutable deterministic results for debt %i', (debt) => {
    const prior = state(debt)
    const available = resources()
    const first = resolveFacilityMaintenanceRecovery(prior, available)
    expect(first).toEqual(resolveFacilityMaintenanceRecovery(prior, available))
    expect(prior).toEqual(state(debt))
    expect(available).toEqual(resources())
    const assertFrozen = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return
      expect(Object.isFrozen(value)).toBe(true)
      for (const child of Object.values(value)) assertFrozen(child)
    }
    assertFrozen(first)
    prior.maintenanceDebt = 99
    available.maintenanceHours = 99
    if (first.status === 'invalid') throw new Error('Expected valid result')
    expect(first.state.maintenanceDebt).toBe(0)
    expect(first.resources.maintenanceHours).toBe(debt === 0 ? 20 : debt === 8 ? 16 : 0)
  })

  it('freezes insufficient and invalid results including the retained collapse projection', () => {
    const invalid = resolveFacilityMaintenanceRecovery(undefined, undefined)
    expect(Object.isFrozen(invalid)).toBe(true)
    const insufficient = resolveFacilityMaintenanceRecovery(state(30), resources(0, 0))
    if (insufficient.status !== 'insufficient_resources')
      throw new Error('Expected insufficient resources')
    expect(Object.isFrozen(insufficient)).toBe(true)
    expect(Object.isFrozen(insufficient.state)).toBe(true)
    expect(Object.isFrozen(insufficient.resources)).toBe(true)
    expect(Object.isFrozen(insufficient.required)).toBe(true)
    expect(Object.isFrozen(insufficient.consumed)).toBe(true)
    expect(Object.isFrozen(insufficient.collapse.activePathways)).toBe(true)
    for (const pathway of insufficient.collapse.activePathways) {
      expect(Object.isFrozen(pathway)).toBe(true)
      expect(Object.isFrozen(pathway.recoveryRequirements)).toBe(true)
    }
  })

  it('composes with closed-week replay protection and releases the maintenance-origin workshop stall', () => {
    const department = 'department:emergency-response'
    const work = 'work:recovery-contract'
    const workshop = {
      departmentWorkshopWorkOrders: {
        [work]: {
          id: work,
          departmentId: department,
          caseId: 'case:recovery',
          taskType: 'emergency_response' as const,
          requiredWork: 20,
        },
      },
      departmentWorkshopSnapshots: {
        [department]: {
          departmentId: department,
          slotCapacity: 1,
          queued: [],
          active: [{ workOrderId: work, completedWork: 3 }],
          paused: [],
        },
      },
    }
    const original = structuredClone(workshop)
    const layout = parseFacilityLayoutSnapshot({
      archetype: 'compact_headquarters',
      rooms: FACILITY_ROOM_IDS.slice(0, 4).map((roomId) => ({ roomId, adjacentToCritical: true })),
    })
    const stalled = resolveFacilityMaintenanceWeekClose(layout, state(30), 5)
    expect(stalled.dependencyAvailability).toBe('unavailable')
    const tick = (dependencies: typeof stalled.dependencies) =>
      processDepartmentWorkshopTick(
        workshop,
        undefined,
        undefined,
        { [department]: { inputStaging: 'adjacent', outputStaging: 'adjacent' } },
        undefined,
        undefined,
        dependencies
      )
    expect(
      tick(stalled.dependencies).workshopState.snapshots[department].active[0].completedWork
    ).toBe(3)

    const recovered = resolveFacilityMaintenanceRecovery(stalled.state, resources())
    if (recovered.status !== 'recovered') throw new Error('Expected recovered state')
    for (const week of [4, 5]) {
      const replay = resolveFacilityMaintenanceWeekClose(layout, recovered.state, week)
      expect(replay.state).toEqual(state(0))
      expect(replay.accruedDebt).toBe(0)
      expect(replay.dependencies).toBeUndefined()
      expect(replay.collapse.firedPathwayIds).toEqual([])
      expect(
        tick(replay.dependencies).workshopState.snapshots[department].active[0].completedWork
      ).toBe(5)
    }
    const later = resolveFacilityMaintenanceWeekClose(layout, recovered.state, 6)
    expect(later.state).toEqual({ maintenanceDebt: 8, lastProcessedWeek: 6 })
    expect(later.accruedDebt).toBe(8)
    expect(later.dependencyAvailability).toBe('degraded')
    expect(
      tick(later.dependencies).workshopState.snapshots[department].active[0].completedWork
    ).toBe(4)
    expect(workshop).toEqual(original)
  })
})
