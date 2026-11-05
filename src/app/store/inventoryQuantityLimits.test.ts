import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from './gameStore'
import {
  createRunExportPayload,
  GAME_STORE_VERSION,
  hydrateGame,
  migratePersistedStore,
  parseRunExport,
} from './runTransfer'
import { createGameSavePayload, loadGameSave } from './saveSystem'

describe('inventory quantity import limits', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.setState({ game: createStartingState() })
  })

  it.each([Number.MAX_SAFE_INTEGER + 1, 1e100, -1e100])(
    'rejects unsupported magnitude %s at every hydration entry',
    (quantity) => {
      const state = createStartingState()
      state.inventory.medkits = quantity
      const run = JSON.stringify(createRunExportPayload(state))
      const save = JSON.stringify(createGameSavePayload(state))

      expect(() => hydrateGame(state)).toThrow(/safe integer range/)
      expect(() => migratePersistedStore({ game: state }, GAME_STORE_VERSION)).toThrow(
        /safe integer range/
      )
      expect(() => parseRunExport(run)).toThrow(/safe integer range/)
      expect(() => loadGameSave(run)).toThrow(/safe integer range/)
      expect(() => loadGameSave(save)).toThrow(/safe integer range/)

      const before = useGameStore.getState()
      const saved = localStorage.getItem('containment-protocol-game-state')
      expect(() => before.importRun(run)).toThrow(/safe integer range/)
      expect(() => before.importSave(save)).toThrow(/safe integer range/)
      expect(useGameStore.getState()).toBe(before)
      expect(localStorage.getItem('containment-protocol-game-state')).toBe(saved)
    }
  )

  it('preserves supported stock, integer normalization, unknown IDs, and explicit empty inventory', () => {
    const state = createStartingState()
    state.inventory = { medkits: Number.MAX_SAFE_INTEGER, ' custom_part ': 3.8 }
    expect(hydrateGame(state).inventory).toEqual({
      medkits: Number.MAX_SAFE_INTEGER,
      custom_part: 3,
    })
    state.inventory = {}
    expect(hydrateGame(state).inventory).toEqual({})
  })

  it.each(['1e400', '-1e400'])(
    'rejects a JSON numeric overflow token %s without replacing the campaign',
    (token) => {
      const state = createStartingState()
      state.inventory.medkits = 1234567
      const overflow = (raw: string) => raw.replace('"medkits":1234567', `"medkits":${token}`)
      const run = overflow(JSON.stringify(createRunExportPayload(state)))
      const save = overflow(JSON.stringify(createGameSavePayload(state)))
      const before = useGameStore.getState()
      const saved = localStorage.getItem('containment-protocol-game-state')
      expect(() => parseRunExport(run)).toThrow(/safe integer range/)
      expect(() => loadGameSave(save)).toThrow(/safe integer range/)
      expect(() => before.importRun(run)).toThrow(/safe integer range/)
      expect(() => before.importSave(save)).toThrow(/safe integer range/)
      expect(useGameStore.getState()).toBe(before)
      expect(localStorage.getItem('containment-protocol-game-state')).toBe(saved)
    }
  )

  it('validates fallback quantities when the persisted inventory is absent', () => {
    const fallback = createStartingState()
    fallback.inventory.medkits = Number.MAX_SAFE_INTEGER + 1
    expect(() => hydrateGame({ inventory: undefined }, fallback)).toThrow(/safe integer range/)
  })

  it('rejects an unsafe pending fabrication output before it can credit inventory', () => {
    const state = createStartingState()
    state.inventory.medical_supplies = 2
    useGameStore.setState({ game: state })
    const game = useGameStore.getState()
    game.queueFabrication('med-kits')
    const queued = useGameStore.getState().game
    expect(queued.productionQueue).toHaveLength(1)
    state.productionQueue = queued.productionQueue.map((entry) => ({
      ...entry,
      outputQuantity: Number.MAX_SAFE_INTEGER + 1,
    }))
    expect(() => parseRunExport(JSON.stringify(createRunExportPayload(state)))).toThrow(
      /safe integer range/
    )
    const overflow = JSON.stringify(createRunExportPayload(state)).replace(
      '"outputQuantity":9007199254740992',
      '"outputQuantity":1e400'
    )
    expect(() => parseRunExport(overflow)).toThrow(/safe integer range/)
  })

  it.each([1, GAME_STORE_VERSION])(
    'preserves rejected automatic save version %s',
    async (version) => {
      vi.resetModules()
      const { getAutomaticMissionLoadError, useGameStore: automaticStore } =
        await import('./gameStore')
      expect(getAutomaticMissionLoadError()).toBeUndefined()
      const before = automaticStore.getState().game
      const invalid = createStartingState()
      invalid.inventory.medkits = Number.MAX_SAFE_INTEGER + 1
      const saved = JSON.stringify({ state: { game: invalid }, version }).replace(
        '"medkits":9007199254740992',
        '"medkits":1e400'
      )
      localStorage.setItem('containment-protocol-game-state', saved)

      await automaticStore.persist.rehydrate()

      expect(automaticStore.getState().game).toBe(before)
      expect(localStorage.getItem('containment-protocol-game-state')).toBe(saved)
      expect(getAutomaticMissionLoadError()?.message).toMatch(/safe integer range/)
      automaticStore.getState().setInventoryQuantity('medkits', 1)
      expect(localStorage.getItem('containment-protocol-game-state')).toBe(saved)
      await automaticStore.persist.clearStorage()
      expect(localStorage.getItem('containment-protocol-game-state')).toBe(saved)
    }
  )
})
