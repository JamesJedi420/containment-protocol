import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  createDeadlineEscalationTransition,
  createResolutionEscalationTransition,
  decrementOpenDeadline,
} from '../domain/sim/escalation'

describe('sim escalation transitions', () => {
  it('decrements open-case deadline without mutating other fields', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      deadlineRemaining: 3,
      stage: 2,
    }

    const nextCase = decrementOpenDeadline(currentCase)

    expect(nextCase.deadlineRemaining).toBe(2)
    expect(nextCase.stage).toBe(2)
    expect(nextCase.id).toBe(currentCase.id)
  })

  it('applies unresolved escalation and reports raid conversion state', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      kind: 'case' as const,
      stage: 1,
      deadlineWeeks: 4,
      onUnresolved: {
        ...state.cases['case-001'].onUnresolved,
        stageDelta: 2,
        deadlineResetWeeks: 3,
        convertToRaidAtStage: 3,
      },
    }

    const transition = createDeadlineEscalationTransition(currentCase)

    expect(transition.convertedToRaid).toBe(true)
    expect(transition.nextCase).toMatchObject({
      id: currentCase.id,
      kind: 'raid',
      stage: 3,
      deadlineRemaining: 3,
    })
    expect(transition.nextCase.raid).toBeDefined()
  })

  it('returns stage-transition data for partial resolution without owning reset fields', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      status: 'in_progress' as const,
      stage: 2,
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: 1,
    }

    const transition = createResolutionEscalationTransition(currentCase, 'partial')

    expect(transition.nextStage).toBe(3)
    expect(transition.nextCase.stage).toBe(3)
    expect(transition.nextCase.status).toBe('in_progress')
    expect(transition.nextCase.assignedTeamIds).toEqual(['t_nightwatch'])
    expect(transition.nextCase.weeksRemaining).toBe(1)
  })

  it('uses onFail stage delta when transitioning a failed case', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      status: 'in_progress' as const,
      stage: 2,
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: 1,
      onFail: {
        ...state.cases['case-001'].onFail,
        stageDelta: 2,
      },
    }

    const transition = createResolutionEscalationTransition(currentCase, 'fail')

    expect(transition.nextStage).toBe(4)
    expect(transition.nextCase.stage).toBe(4)
  })
})
