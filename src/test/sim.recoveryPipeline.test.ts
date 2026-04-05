import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceRecoveryAgentsForWeek } from '../domain/sim/recoveryPipeline'

describe('advanceRecoveryAgentsForWeek', () => {
  it('returns recovering agents to active duty after recovery duration elapses', () => {
    const state = createStartingState()
    state.week = 5
    state.agents['a_ava'] = {
      ...state.agents['a_ava'],
      status: 'recovering',
      assignment: {
        state: 'recovery',
        startedWeek: 2,
        teamId: 't_nightwatch',
      },
      vitals: {
        ...(state.agents['a_ava'].vitals ?? {
          health: 75,
          stress: state.agents['a_ava'].fatigue,
          morale: 50,
          wounds: 20,
          statusFlags: [],
        }),
        statusFlags: ['injury:moderate', 'recovering'],
        morale: 55,
        wounds: 20,
      },
    }

    const nextAgents = advanceRecoveryAgentsForWeek({
      week: state.week,
      sourceAgents: state.agents,
      nextAgents: state.agents,
    })

    const recovered = nextAgents['a_ava']
    expect(recovered.status).toBe('active')
    expect(recovered.assignment?.state).toBe('idle')
    expect(recovered.vitals?.wounds).toBe(0)
    expect(recovered.vitals?.statusFlags ?? []).not.toContain('injury:moderate')
    expect(
      recovered.history?.timeline.some(
        (entry) =>
          entry.eventType === 'simulation.weekly_tick' &&
          entry.note.includes('returned to active duty')
      )
    ).toBe(true)
  })

  it('moves newly injured recovery agents into recovering state after one elapsed week', () => {
    const state = createStartingState()
    state.week = 4
    state.agents['a_ava'] = {
      ...state.agents['a_ava'],
      status: 'injured',
      assignment: {
        state: 'recovery',
        startedWeek: 3,
        teamId: 't_nightwatch',
      },
      vitals: {
        ...(state.agents['a_ava'].vitals ?? {
          health: 88,
          stress: state.agents['a_ava'].fatigue,
          morale: 60,
          wounds: 10,
          statusFlags: [],
        }),
        statusFlags: ['injury:minor', 'injured'],
        morale: 60,
      },
    }

    const nextAgents = advanceRecoveryAgentsForWeek({
      week: state.week,
      sourceAgents: state.agents,
      nextAgents: state.agents,
    })

    const recovering = nextAgents['a_ava']
    expect(recovering.status).toBe('recovering')
    expect(recovering.assignment?.state).toBe('recovery')
    expect(recovering.vitals?.statusFlags ?? []).toContain('injury:minor')
    expect(
      recovering.history?.timeline.some(
        (entry) =>
          entry.eventType === 'simulation.weekly_tick' &&
          entry.note.includes('recovering from a minor injury')
      )
    ).toBe(true)
  })
})
