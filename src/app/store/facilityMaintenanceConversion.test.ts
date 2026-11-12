import '../../test/setup'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { previewFacilityMaintenanceConversion } from '../../domain/facilityMaintenanceConversion'
import { useGameStore } from './gameStore'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({
    game: {
      ...createStartingState(),
      staff: {
        analyst: {
          id: 'analyst',
          name: 'Analyst',
          specialty: 'analysis',
          operationalPostId: 'staff-post:analysis:1',
        },
      } as unknown as GameState['staff'],
      facilityStockpile: { pressure_seal_gasket: 2 },
    },
  })
})

describe('maintenance conversion store command', () => {
  it('publishes one successful transaction, persists and rehydrates weekly use, and reset clears it', async () => {
    const request = previewFacilityMaintenanceConversion(
      useGameStore.getState().game,
      'analyst'
    ).request
    const command = useGameStore.getState().convertFacilityMaintenanceResources
    expect(command(request).status).toBe('applied')
    const game = useGameStore.getState().game
    const persisted = JSON.parse(localStorage.getItem('containment-protocol-game-state')!)
    expect(persisted.state.game.facilityMaintenanceConversionReceipts).toEqual(
      game.facilityMaintenanceConversionReceipts
    )
    await useGameStore.persist.rehydrate()
    expect(command(request).status).toBe('no_op')
    const fresh = previewFacilityMaintenanceConversion(
      useGameStore.getState().game,
      'analyst'
    ).request
    const prior = useGameStore.getState()
    expect(command(fresh).reason).toBe('weekly_exhausted')
    expect(useGameStore.getState()).toBe(prior)
    prior.reset()
    expect(useGameStore.getState().game.facilityMaintenanceConversionReceipts).toBeUndefined()
  })

  it('retained commands reject a stale preview without publishing any partial result', () => {
    const prior = useGameStore.getState()
    const request = previewFacilityMaintenanceConversion(prior.game, 'analyst').request
    useGameStore.setState({ game: { ...prior.game, facilityStockpile: undefined } })
    const changed = useGameStore.getState()
    expect(prior.convertFacilityMaintenanceResources(request).reason).toBe('stale_request')
    expect(useGameStore.getState()).toBe(changed)
    expect(changed.game.facilityMaintenanceConversionReceipts).toBeUndefined()
  })

  it('writes explicit unavailable markers before JSON can discard inherited flags', async () => {
    const initial = useGameStore.getState().game
    useGameStore.setState({
      game: {
        ...initial,
        staffTimeAllocations: Object.assign(Object.create({ unavailable: true }), {
          version: 1,
          commitments: [],
        }),
        facilityMaintenanceConversionReceipts: Object.assign(Object.create({ unavailable: true }), {
          version: 1,
          receipts: [],
        }),
      },
    })
    const persisted = JSON.parse(localStorage.getItem('containment-protocol-game-state')!)
    expect(persisted.state.game.staffTimeAllocations).toEqual({ version: 1, unavailable: true })
    expect(persisted.state.game.facilityMaintenanceConversionReceipts).toEqual({
      version: 1,
      unavailable: true,
    })
    await useGameStore.persist.rehydrate()
    expect(
      previewFacilityMaintenanceConversion(useGameStore.getState().game, 'analyst').reason
    ).toBe('malformed_source')
  })
})
