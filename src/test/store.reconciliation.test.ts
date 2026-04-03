import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { useGameStore } from '../app/store/gameStore'
import { RECONCILIATION_COST } from '../domain/sim/reconciliation'
import { resetGameStoreFixture } from './storeFixtures'

describe('gameStore.reconcileAgents', () => {
  beforeEach(() => {
    resetGameStoreFixture()
  })

  it('applies reconciliation through the store action', () => {
    const baseline = createStartingState()
    const seeded = {
      ...baseline,
      agents: {
        ...baseline.agents,
        a_ava: {
          ...baseline.agents.a_ava,
          relationships: { ...baseline.agents.a_ava.relationships, a_sato: -1 },
        },
        a_sato: {
          ...baseline.agents.a_sato,
          relationships: { ...baseline.agents.a_sato.relationships, a_ava: -1 },
        },
      },
    }

    useGameStore.setState({ game: seeded })
    useGameStore.getState().reconcileAgents('a_ava', 'a_sato')

    const next = useGameStore.getState().game
    expect(next.funding).toBe(seeded.funding - RECONCILIATION_COST)
    expect((next.agents.a_ava.relationships.a_sato ?? 0)).toBeGreaterThan(-1)
    expect((next.agents.a_sato.relationships.a_ava ?? 0)).toBeGreaterThan(-1)
    expect(next.events.some((event) => event.type === 'agent.relationship_changed')).toBe(true)
  })
})
