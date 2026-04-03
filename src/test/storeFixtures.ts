import { createStartingState } from '../data/startingState'
import { useGameStore } from '../app/store/gameStore'
import type { GameState } from '../domain/models'

export function createFixtureState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createStartingState(),
    ...overrides,
  }
}

export function resetGameStoreFixture(overrides: Partial<GameState> = {}) {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createFixtureState(overrides) })
}
