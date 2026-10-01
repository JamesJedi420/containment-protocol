import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame, migratePersistedStore } from '../app/store/runTransfer'
import { FACILITY_ROOM_IDS, parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'
import {
  parseFacilityMaintenanceState,
  resolveFacilityMaintenanceWeekClose,
  composeFacilityMaintenanceWorkshopQuality,
} from '../domain/facilityMaintenanceWeekClose'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { processDepartmentWorkshopTick } from '../domain/departmentWorkshopQueue'
import { useGameStore } from '../app/store/gameStore'

const NOW = Date.UTC(2026, 8, 29)
const DEPARTMENT = 'department:emergency-response'
const WORK = 'work:facility-maintenance-test'
const layout = (count: number) =>
  parseFacilityLayoutSnapshot({
    archetype: 'compact_headquarters',
    rooms: FACILITY_ROOM_IDS.slice(0, count).map((roomId) => ({
      roomId,
      adjacentToCritical: true,
    })),
  })

function campaign(count?: number, requiredWork = 20) {
  const state = createStartingState()
  // Keep the unattended campaign below its unrelated active-case defeat threshold.
  state.config = { ...state.config, maxActiveCases: 1000 }
  state.facilityLayoutSnapshot = count === undefined ? undefined : layout(count)
  state.departmentWorkshopWorkOrders = {
    [WORK]: {
      id: WORK,
      departmentId: DEPARTMENT,
      caseId: 'case:maintenance-test',
      taskType: 'emergency_response',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    [DEPARTMENT]: {
      departmentId: DEPARTMENT,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: WORK, completedWork: 0 }],
      paused: [],
    },
  }
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

describe('SPE-3119 facility maintenance resolver', () => {
  it.each([
    [0, 0],
    [3, 0],
    [4, 8],
    [7, 8],
    [8, 18],
  ])('accrues authored burden for %i rooms', (rooms, debt) => {
    const result = resolveFacilityMaintenanceWeekClose(layout(rooms), undefined, 1)
    expect(result.accruedDebt).toBe(debt)
    expect(result.state?.maintenanceDebt ?? 0).toBe(debt)
    expect(result.collapse.firedPathwayIds).toEqual(debt === 0 ? [] : ['maintenance_debt_overrun'])
  })

  it.each([
    [7, undefined],
    [8, 'strained'],
    [17, 'strained'],
    [18, 'degraded'],
    [29, 'degraded'],
    [30, 'critical'],
  ])('uses the registry at debt %i', (debt, band) => {
    const result = resolveFacilityMaintenanceWeekClose(
      undefined,
      { maintenanceDebt: debt, lastProcessedWeek: 1 },
      2
    )
    expect(result.collapse.activePathways[0]?.band).toBe(band)
    expect(result.dependencyAvailability).toBe(
      band === undefined ? undefined : band === 'critical' ? 'unavailable' : 'degraded'
    )
    if (band === 'critical') {
      expect(result.collapse.firedPathwayIds).toEqual([
        'maintenance_debt_overrun',
        'logistics_stall',
      ])
      expect(result.collapse.activePathways[1].chainedFrom).toBe('maintenance_debt_overrun')
    }
  })

  it('is immutable, deterministic, replay-safe, and does not catch up skipped weeks', () => {
    const input = Object.freeze({ maintenanceDebt: 8, lastProcessedWeek: 2 })
    const snapshot = layout(4)
    const result = resolveFacilityMaintenanceWeekClose(snapshot, input, 9)
    expect(result.state).toEqual({ maintenanceDebt: 16, lastProcessedWeek: 9 })
    expect(resolveFacilityMaintenanceWeekClose(snapshot, input, 9)).toEqual(result)
    for (const week of [9, 2, -1, NaN, Infinity, 1.5]) {
      const replay = resolveFacilityMaintenanceWeekClose(snapshot, result.state, week)
      expect(replay.state).toEqual(result.state)
      expect(replay.accruedDebt).toBe(0)
    }
    expect(input).toEqual({ maintenanceDebt: 8, lastProcessedWeek: 2 })
  })

  it('deduplicates/rejects rooms through the canonical parser', () => {
    const rooms = layout(3)!.rooms
    const result = resolveFacilityMaintenanceWeekClose(
      { rooms: [...rooms, rooms[0], { roomId: 'fake', adjacentToCritical: true }] },
      undefined,
      1
    )
    expect(result.roomCount).toBe(3)
    expect(result.state).toEqual({ maintenanceDebt: 0, lastProcessedWeek: 1 })
  })

  it.each([
    undefined,
    null,
    [],
    {},
    { maintenanceDebt: -1, lastProcessedWeek: 1 },
    { maintenanceDebt: 8, lastProcessedWeek: 1.5 },
    { maintenanceDebt: Infinity, lastProcessedWeek: 1 },
    { maintenanceDebt: 8 },
    { maintenanceDebt: '8', lastProcessedWeek: 1 },
    { maintenanceDebt: Number.MAX_SAFE_INTEGER + 1, lastProcessedWeek: 1 },
  ])('rejects malformed durable state %j', (value) => {
    expect(parseFacilityMaintenanceState(value)).toBeUndefined()
    expect(resolveFacilityMaintenanceWeekClose(undefined, value, 2).state).toBeUndefined()
  })

  it('preserves debt when layout disappears and saturates safely', () => {
    const prior = { maintenanceDebt: Number.MAX_SAFE_INTEGER - 1, lastProcessedWeek: 1 }
    const result = resolveFacilityMaintenanceWeekClose(layout(8), prior, 2)
    expect(result.state?.maintenanceDebt).toBe(Number.MAX_SAFE_INTEGER)
    expect(result.accruedDebt).toBe(1)
    expect(resolveFacilityMaintenanceWeekClose(null, result.state, 3).state?.maintenanceDebt).toBe(
      Number.MAX_SAFE_INTEGER
    )
  })

  it('records a zero-debt close so a changed layout cannot replay that week', () => {
    const first = resolveFacilityMaintenanceWeekClose(layout(3), undefined, 4)
    expect(first.state).toEqual({ maintenanceDebt: 0, lastProcessedWeek: 4 })
    for (const week of [3, 4]) {
      const replay = resolveFacilityMaintenanceWeekClose(layout(8), first.state, week)
      expect(replay.state).toEqual(first.state)
      expect(replay.accruedDebt).toBe(0)
      expect(replay.dependencies).toBeUndefined()
    }
    expect(resolveFacilityMaintenanceWeekClose(layout(8), first.state, 5).state).toEqual({
      maintenanceDebt: 18,
      lastProcessedWeek: 5,
    })
  })

  it('caps two-unit processing with the existing dependency seam', () => {
    const source = campaign(4)
    const staging = { [DEPARTMENT]: { inputStaging: 'adjacent', outputStaging: 'adjacent' } }
    const baseline = processDepartmentWorkshopTick(source, undefined, undefined, staging)
    const result = resolveFacilityMaintenanceWeekClose(
      source.facilityLayoutSnapshot,
      undefined,
      source.week
    )
    const degraded = processDepartmentWorkshopTick(
      source,
      undefined,
      undefined,
      staging,
      undefined,
      undefined,
      result.dependencies
    )
    expect(baseline.workshopState.snapshots[DEPARTMENT].active[0].completedWork).toBe(2)
    expect(degraded.workshopState.snapshots[DEPARTMENT].active[0].completedWork).toBe(1)
  })

  it('composes dependency quality without erasing specialist quality', () => {
    expect(
      composeFacilityMaintenanceWorkshopQuality([WORK], 'degraded', {
        [WORK]: { inputQuality: 'good', specialistCondition: 'poor', roomContamination: 'good' },
      })[WORK]
    ).toMatchObject({ specialistCondition: 'poor', dependencyCondition: 'poor' })
  })
})

describe('SPE-3119 live week-close and persistence', () => {
  it.each([0, 3])(
    'round-trips the baseline note for %i rooms without empty-array metadata',
    (rooms) => {
      const next = advanceWeek(campaign(rooms))
      const hydrated = hydrateGame(JSON.parse(JSON.stringify(next)), createStartingState())
      const note = next.reports
        .at(-1)!
        .notes.find((entry) => entry.metadata?.source === 'facility_maintenance')!
      expect(note.content).toContain('pathways none')
      expect(note.metadata).not.toHaveProperty('pathways')
      expect(hydrated.reports.at(-1)!.notes.find((entry) => entry.id === note.id)).toEqual(note)
    }
  )

  it('preserves maintenance notes, the report clock, and event counts through save/load', () => {
    const first = advanceWeek(campaign(4))
    const next = advanceWeek(first)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(next)), createStartingState())
    const report = next.reports.at(-1)!
    const note = report.notes.find((entry) => entry.metadata?.source === 'facility_maintenance')!
    const loadedNote = hydrated.reports.at(-1)!.notes.find((entry) => entry.id === note.id)
    expect(note.metadata).toMatchObject({ maintenanceDebt: 16, accruedDebt: 8, roomCount: 4 })
    expect(loadedNote).toEqual(note)
    const generated = next.events.find(
      (event) => event.type === 'intel.report_generated' && event.payload.week === report.week
    )
    const loadedEvent = hydrated.events.find((event) => event.id === generated?.id)
    expect(generated?.payload).toMatchObject({ noteCount: report.notes.length })
    expect(loadedEvent?.payload).toMatchObject({ noteCount: report.notes.length })
  })

  it('rejects future replay guards atomically at the canonical hydration boundary', () => {
    const state = campaign(4)
    state.facilityMaintenanceState = { maintenanceDebt: 0, lastProcessedWeek: state.week + 100 }
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())
    expect(hydrated.facilityMaintenanceState).toBeUndefined()
    expect(advanceWeek(hydrated).facilityMaintenanceState?.maintenanceDebt).toBe(8)
    expect(
      parseFacilityMaintenanceState(
        { maintenanceDebt: 8, lastProcessedWeek: state.week },
        state.week
      )
    ).toBeDefined()
  })

  it('reset removes debt rather than inheriting the prior campaign', () => {
    const previous = useGameStore.getState().game
    try {
      useGameStore.setState({
        game: {
          ...campaign(4),
          facilityMaintenanceState: { maintenanceDebt: 32, lastProcessedWeek: 1 },
        },
      })
      useGameStore.getState().reset()
      expect(useGameStore.getState().game.facilityMaintenanceState).toBeUndefined()
    } finally {
      useGameStore.setState({ game: previous })
    }
  })

  it('does not accrue after campaign termination', () => {
    const state = campaign(8)
    state.gameOver = true
    state.facilityMaintenanceState = { maintenanceDebt: 18, lastProcessedWeek: 1 }
    expect(advanceWeek(state, NOW).facilityMaintenanceState).toEqual(state.facilityMaintenanceState)
  })

  it('retains live stalls and deterministic notes after layout removal and save/load', () => {
    const state = campaign()
    state.facilityMaintenanceState = { maintenanceDebt: 32, lastProcessedWeek: 0 }
    const loaded = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())
    const next = advanceWeek(loaded, NOW)
    const again = advanceWeek(loaded, NOW)
    expect(next.facilityMaintenanceState?.maintenanceDebt).toBe(32)
    expect(next.departmentWorkshopSnapshots).toEqual(state.departmentWorkshopSnapshots)
    const notes = (game: typeof state) =>
      game.reports.at(-1)?.notes.filter((note) => note.metadata?.source === 'facility_maintenance')
    expect(notes(next)).toEqual(notes(again))
    expect(notes(next)).toHaveLength(1)
    expect(notes(next)?.[0].metadata?.roomCount).toBeNull()
  })

  it.each([
    [4, 4, 32],
    [8, 2, 36],
  ])('accumulates %i rooms across %i closes and stalls', (rooms, weeks, debt) => {
    let state = campaign(rooms)
    const original = structuredClone(state)
    for (let index = 0; index < weeks - 1; index++) state = advanceWeek(state, NOW)
    const beforeStall = structuredClone(state.departmentWorkshopSnapshots)
    state = advanceWeek(state, NOW)
    expect(state.facilityMaintenanceState?.maintenanceDebt).toBe(debt)
    expect(state.departmentWorkshopSnapshots).toEqual(beforeStall)
    expect(state.departmentWorkshopCompletionOutcomes?.[WORK]).toBeUndefined()
    const note = state.reports
      .at(-1)
      ?.notes.find((entry) => entry.metadata?.source === 'facility_maintenance')
    expect(note?.metadata).toMatchObject({
      maintenanceDebt: debt,
      workshopDependency: 'unavailable',
      pathways: ['maintenance_debt_overrun', 'logistics_stall'],
    })
    expect(original.facilityMaintenanceState).toBeUndefined()
  })

  it('preserves legacy behavior and leaves layout unchanged', () => {
    const state = campaign()
    const original = structuredClone(state)
    const next = advanceWeek(state, NOW)
    expect(state).toEqual(original)
    expect(next.facilityMaintenanceState).toBeUndefined()
    expect(next.departmentWorkshopSnapshots?.[DEPARTMENT].active[0].completedWork).toBe(2)
    const baseline = campaign(3)
    const closed = advanceWeek(baseline, NOW)
    expect(closed.facilityMaintenanceState).toEqual({
      maintenanceDebt: 0,
      lastProcessedWeek: baseline.week,
    })
    expect(closed.facilityLayoutSnapshot).toEqual(baseline.facilityLayoutSnapshot)
  })

  it('preserves canonical save/load, continuation and no duplicate accrual', () => {
    const state = advanceWeek(campaign(4), NOW)
    const saved = JSON.parse(JSON.stringify(state))
    const hydrated = hydrateGame(saved, createStartingState())
    expect(hydrated.facilityMaintenanceState).toEqual(state.facilityMaintenanceState)
    const migrated = migratePersistedStore({ game: saved }, 7, createStartingState()).game
    expect(migrated.facilityMaintenanceState).toEqual(state.facilityMaintenanceState)
    expect(advanceWeek(hydrated, NOW).facilityMaintenanceState?.maintenanceDebt).toBe(16)
    const replay = { ...hydrated, week: state.facilityMaintenanceState!.lastProcessedWeek }
    expect(advanceWeek(replay, NOW).facilityMaintenanceState).toEqual(
      state.facilityMaintenanceState
    )
    expect(createStartingState().facilityMaintenanceState).toBeUndefined()
    expect(
      hydrateGame(
        { ...saved, facilityMaintenanceState: { maintenanceDebt: -8, lastProcessedWeek: 1 } },
        state
      ).facilityMaintenanceState
    ).toBeUndefined()
  })

  it('registers degraded dependency quality on live completion', () => {
    const next = advanceWeek(campaign(4, 1), NOW)
    expect(next.departmentWorkshopCompletionOutcomes?.[WORK]?.quality).toBe('degraded')
  })
})
