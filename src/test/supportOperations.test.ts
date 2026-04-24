import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyRallySupportStaffAction } from '../domain/hub/supportActions'
import type { GameState } from '../domain/models'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'

function makeSupportOperationState(supportAvailable: number): GameState {
  let state = createStartingState()
  state.agency = {
    ...state.agency!,
    supportAvailable,
  }

  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'open',
    durationWeeks: 1,
    weeksRemaining: undefined,
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    requiredTags: [],
    preferredTags: [],
  }
  state.cases['case-002'] = {
    ...state.cases['case-002'],
    status: 'open',
    durationWeeks: 1,
    weeksRemaining: undefined,
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    requiredTags: [],
    preferredTags: [],
  }

  state = assignTeam(state, 'case-001', 't_nightwatch')
  state = assignTeam(state, 'case-002', 't_greentape')

  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'in_progress',
    weeksRemaining: 1,
  }
  state.cases['case-002'] = {
    ...state.cases['case-002'],
    status: 'in_progress',
    weeksRemaining: 1,
  }

  return state
}

describe('SPE-38: Support Operations Layer', () => {
  it('hub support recovery affects later operation outcome and output', () => {
    const state = makeSupportOperationState(0)
    const { nextState, note } = applyRallySupportStaffAction(state, 1)

    expect(nextState.agency?.supportAvailable).toBe(1)
    expect(note?.content).toMatch(/restored/i)

    const result = advanceWeek(nextState)
    const caseIdsWithShortfall = Object.values(result.cases)
      .filter((currentCase) => currentCase.id === 'case-001' || currentCase.id === 'case-002')
      .filter((currentCase) => currentCase.supportShortfall)
      .map((currentCase) => currentCase.id)
    const supportNotes = result.reports
      .flatMap((report) => report.notes)
      .filter((currentNote) => currentNote.type === 'support.shortfall')

    expect(caseIdsWithShortfall).toHaveLength(1)
    expect(result.agency?.supportAvailable).toBe(0)
    expect(supportNotes).toHaveLength(1)
    expect(supportNotes[0]?.content).toMatch(/support shortfall/i)
  })

  it('consumes support for each operation and applies a shortfall penalty once capacity is exhausted', () => {
    const state = makeSupportOperationState(1)
    const next = advanceWeek(state)
    const trackedCases = [next.cases['case-001'], next.cases['case-002']]

    expect(trackedCases.filter((currentCase) => currentCase.supportShortfall)).toHaveLength(1)
    expect(next.agency?.supportAvailable).toBe(0)
  })

  it('restores support via the hub action', () => {
    const state = createStartingState()
    state.agency = {
      ...state.agency!,
      supportAvailable: 0,
    }

    const { nextState, note } = applyRallySupportStaffAction(state, 3)

    expect(nextState.agency?.supportAvailable).toBe(3)
    expect(note?.type).toBe('support.restored')
    expect(note?.content).toMatch(/restored/i)
  })
})
