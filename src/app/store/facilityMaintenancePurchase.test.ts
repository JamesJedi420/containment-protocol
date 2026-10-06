import '../../test/setup'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from './gameStore'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('facility maintenance purchase action', () => {
  it('buys one package, persists balances, and keeps recovery separate', () => {
    const prior = {
      ...createStartingState(),
      funding: 200,
      facilityMaintenanceState: { maintenanceDebt: 18, lastProcessedWeek: 0 },
    }
    useGameStore.setState({ game: prior })
    const purchase = useGameStore.getState().purchaseFacilityMaintenancePackage
    purchase()
    const first = useGameStore.getState().game
    expect(first.funding).toBe(100)
    expect(first.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 20,
      partsReserve: 12,
    })
    expect(first.facilityMaintenanceState).toBe(prior.facilityMaintenanceState)
    purchase()
    const second = useGameStore.getState().game
    expect(second.funding).toBe(0)
    expect(second.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 30,
      partsReserve: 18,
    })
    const persisted = JSON.parse(localStorage.getItem('containment-protocol-game-state')!)
    expect(persisted.state.game.funding).toBe(0)
    expect(persisted.state.game.agency.fundingState.fundingHistory).toEqual(
      second.agency!.fundingState!.fundingHistory
    )
    expect(persisted.state.game.facilityMaintenanceRecoveryResources).toEqual(
      second.facilityMaintenanceRecoveryResources
    )
  })

  it.each([99, -1, NaN])('retains store and game identity for blocked funding %s', (funding) => {
    useGameStore.setState({ game: { ...createStartingState(), funding } })
    const prior = useGameStore.getState()
    prior.purchaseFacilityMaintenancePackage()
    expect(useGameStore.getState()).toBe(prior)
  })

  it('revalidates a retained action against changed funding and resources', () => {
    const purchase = useGameStore.getState().purchaseFacilityMaintenancePackage
    const game = { ...createStartingState(), funding: 99 }
    useGameStore.setState({ game })
    purchase()
    expect(useGameStore.getState().game).toBe(game)
    useGameStore.setState({
      game: {
        ...game,
        funding: 200,
        facilityMaintenanceRecoveryResources: {
          maintenanceHours: Number.MAX_SAFE_INTEGER,
          partsReserve: 0,
        },
      },
    })
    const blocked = useGameStore.getState()
    purchase()
    expect(useGameStore.getState()).toBe(blocked)
  })
})
