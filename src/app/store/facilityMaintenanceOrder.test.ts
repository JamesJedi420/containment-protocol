import '../../test/setup'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from './gameStore'
import { parseRunExport, serializeRunExport } from './runTransfer'
import { resolveFacilityMaintenanceWeekClose } from '../../domain/facilityMaintenanceWeekClose'
import { FACILITY_ROOM_IDS, parseFacilityLayoutSnapshot } from '../../domain/facilityLayoutStrategy'

function campaign(debt = 18, hours = 10, parts = 6) {
  return {
    ...createStartingState(),
    week: 5,
    facilityMaintenanceState: { maintenanceDebt: debt, lastProcessedWeek: 5 },
    facilityMaintenanceRecoveryResources: { maintenanceHours: hours, partsReserve: parts },
  }
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: campaign() })
})

describe('player facility recovery order', () => {
  it.each([
    [8, 4, 2],
    [18, 10, 6],
    [30, 20, 12],
  ])(
    'atomically recovers debt %i with exact cost %i/%i and preserves unrelated state',
    (debt, hours, parts) => {
      const prior = campaign(debt, hours + 1, parts + 1)
      useGameStore.setState({ game: prior })
      useGameStore.getState().orderFacilityMaintenanceRecovery()
      const recovered = useGameStore.getState().game
      expect(recovered).toEqual({
        ...prior,
        facilityMaintenanceState: { maintenanceDebt: 0, lastProcessedWeek: 5 },
        facilityMaintenanceRecoveryResources: { maintenanceHours: 1, partsReserve: 1 },
      })
      expect(prior.facilityMaintenanceState.maintenanceDebt).toBe(debt)
      useGameStore.getState().orderFacilityMaintenanceRecovery()
      expect(useGameStore.getState().game).toBe(recovered)
    }
  )

  it.each([
    [18, 9, 6],
    [18, 10, 5],
    [18, 0, 0],
    [7, 10, 6],
  ])(
    'retains game and store identity for blocked/no-required debt %i budget %i/%i',
    (debt, hours, parts) => {
      useGameStore.setState({ game: campaign(debt, hours, parts) })
      const prior = useGameStore.getState()
      prior.orderFacilityMaintenanceRecovery()
      expect(useGameStore.getState()).toBe(prior)
    }
  )

  it.each([
    { facilityMaintenanceState: undefined },
    { facilityMaintenanceState: { maintenanceDebt: -1, lastProcessedWeek: 5 } },
    { facilityMaintenanceState: { maintenanceDebt: 18, lastProcessedWeek: 6 } },
    { facilityMaintenanceRecoveryResources: undefined },
    { facilityMaintenanceRecoveryResources: { maintenanceHours: 10, partsReserve: NaN } },
  ])('fails closed without provisioning for %j', (override) => {
    useGameStore.setState({ game: Object.assign(campaign(), override) })
    const prior = useGameStore.getState()
    prior.orderFacilityMaintenanceRecovery()
    expect(useGameStore.getState()).toBe(prior)
  })

  it('a retained action revalidates resources from current state', () => {
    const order = useGameStore.getState().orderFacilityMaintenanceRecovery
    const changed = campaign(18, 0, 0)
    useGameStore.setState({ game: changed })
    order()
    expect(useGameStore.getState().game).toBe(changed)
  })

  it('round-trips the order through save/load and preserves replay and future accrual', () => {
    useGameStore.setState({ game: campaign(18, 14, 8) })
    useGameStore.getState().orderFacilityMaintenanceRecovery()
    const recovered = useGameStore.getState().game
    const persisted = JSON.parse(localStorage.getItem('containment-protocol-game-state')!)
    expect(persisted.state.game.facilityMaintenanceState).toEqual(
      recovered.facilityMaintenanceState
    )
    expect(persisted.state.game.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 4,
      partsReserve: 2,
    })
    const loaded = parseRunExport(serializeRunExport(recovered))
    expect(loaded.facilityMaintenanceState).toEqual(recovered.facilityMaintenanceState)
    expect(loaded.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 4,
      partsReserve: 2,
    })
    const layout = parseFacilityLayoutSnapshot({
      archetype: 'compact_headquarters',
      rooms: FACILITY_ROOM_IDS.slice(0, 4).map((roomId) => ({ roomId, adjacentToCritical: true })),
    })
    const replay = resolveFacilityMaintenanceWeekClose(layout, loaded.facilityMaintenanceState, 5)
    expect(replay.accruedDebt).toBe(0)
    expect(replay.state).toEqual(loaded.facilityMaintenanceState)
    const later = resolveFacilityMaintenanceWeekClose(layout, loaded.facilityMaintenanceState, 6)
    expect(later.accruedDebt).toBe(8)
    expect(later.state).toEqual({ maintenanceDebt: 8, lastProcessedWeek: 6 })
  })
})
