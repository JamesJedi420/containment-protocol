import { describe, expect, expectTypeOf, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import { withoutMappedArchiveAnalystPersonnel } from './helpers/withoutMappedArchiveAnalystPersonnel'

describe('workshop fixture personnel removal', () => {
  it('preserves the complete state contract and unrelated state while remapping personnel', () => {
    const state = createStartingState()
    const starter = Object.values(state.agents)[0]
    if (!starter) throw new Error('Expected a starting agent fixture')
    state.agents = {
      investigator: { ...starter, id: 'investigator', name: 'Investigator', role: 'investigator' },
      hunter: { ...starter, id: 'hunter', name: 'Hunter', role: 'hunter' },
    }
    state.staff = { analyst: { specialty: 'analysis', efficiency: 1, role: 'staff' } }
    const before = structuredClone(state)
    const result = withoutMappedArchiveAnalystPersonnel(state)
    expectTypeOf(result).toEqualTypeOf<GameState>()
    expect(result).toBe(state)
    expect(result).toEqual({
      ...before,
      agents: {
        investigator: { ...before.agents.investigator, role: 'hunter' },
        hunter: before.agents.hunter,
      },
      staff: {},
    })
  })

  it('retains absent versus explicitly empty operator slots', () => {
    const absent = createStartingState()
    delete absent.specialistOperatorSlots
    expect(withoutMappedArchiveAnalystPersonnel(absent)).not.toHaveProperty(
      'specialistOperatorSlots'
    )
    const empty = createStartingState()
    empty.specialistOperatorSlots = []
    const slots = empty.specialistOperatorSlots
    expect(withoutMappedArchiveAnalystPersonnel(empty).specialistOperatorSlots).toBe(slots)
  })
})
