import { describe, expect, it } from 'vitest'
// cspell:words sato
import { createStartingState } from '../data/startingState'
import {
  SPONTANEOUS_CHEMISTRY_BONDING_DELTA,
  applySpontaneousChemistryEvent,
} from '../domain/sim/spontaneousChemistry'

function makeSequenceRng(values: number[]) {
  let index = 0
  return () => {
    const next = values[index] ?? values[values.length - 1] ?? 0
    index += 1
    return next
  }
}

describe('applySpontaneousChemistryEvent', () => {
  it('applies a deterministic off-mission bonding event and emits spontaneous_event drafts', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        a_ava: {
          ...state.agents.a_ava,
          assignment: { state: 'idle' as const },
          relationships: { a_sato: 0 },
        },
        a_sato: {
          ...state.agents.a_sato,
          assignment: { state: 'idle' as const },
          relationships: { a_ava: 0 },
        },
      },
      teams: {},
    }

    const result = applySpontaneousChemistryEvent(seeded, {
      rng: makeSequenceRng([0, 0, 0]),
      week: seeded.week,
      activeTeamIds: new Set(),
      eventChance: 1,
    })

    expect(result.applied).toBe(true)
    expect(result.state.agents.a_ava.relationships.a_sato).toBeCloseTo(
      SPONTANEOUS_CHEMISTRY_BONDING_DELTA,
      2
    )
    expect(result.state.agents.a_sato.relationships.a_ava).toBeCloseTo(
      SPONTANEOUS_CHEMISTRY_BONDING_DELTA,
      2
    )
    expect(result.eventDrafts).toHaveLength(2)
    expect(result.eventDrafts[0]).toMatchObject({
      type: 'agent.relationship_changed',
      payload: expect.objectContaining({ reason: 'spontaneous_event' }),
    })
    expect(result.state.relationshipHistory?.at(-1)?.reason).toBe('spontaneous_event')
  })

  it('does not trigger for agents from active mission teams this tick', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        a_ava: {
          ...state.agents.a_ava,
          assignment: { state: 'idle' as const },
          relationships: { a_sato: -0.4 },
        },
        a_sato: {
          ...state.agents.a_sato,
          assignment: { state: 'idle' as const },
          relationships: { a_ava: -0.4 },
        },
      },
      teams: {
        t_nightwatch: {
          ...state.teams.t_nightwatch,
          memberIds: ['a_ava', 'a_sato'],
          agentIds: ['a_ava', 'a_sato'],
          leaderId: 'a_ava',
        },
      },
    }

    const result = applySpontaneousChemistryEvent(seeded, {
      rng: makeSequenceRng([0, 0, 0]),
      week: seeded.week,
      activeTeamIds: new Set(['t_nightwatch']),
      eventChance: 1,
    })

    expect(result.applied).toBe(false)
    expect(result.eventDrafts).toHaveLength(0)
    expect(result.state).toBe(seeded)
  })
})
