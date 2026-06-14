import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
} from '../domain/publicDisclosureStateRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek public disclosure trust outcome integration (SPE-861 slice 2)', () => {
  it('is a no-op for an empty public disclosure map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {}

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const trustOutcomeNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'public_disclosure.trust_outcome') ?? []

    expect(trustOutcomeNotes).toEqual([])
  })

  it('surfaces trust-outcome notes after post-tick disclosure records', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const trustOutcomeNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'public_disclosure.trust_outcome') ?? []

    expect(trustOutcomeNotes).toHaveLength(1)
    expect(trustOutcomeNotes[0]?.content).toContain('Public disclosure trust outcome')
    expect(trustOutcomeNotes[0]?.content).toContain('Opposed posture')
    expect(trustOutcomeNotes[0]?.metadata?.cooperationBand).toBe('opposed')
    expect(trustOutcomeNotes[0]?.metadata?.dominantAwarenessLevel).toBe('official_disclosure')
  })

  it('preserves progression fixture and still emits aligned trust outcome for normalization fixture', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 30
    state.publicDisclosureRecords = {
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.publicDisclosureRecords?.[NORMALIZATION_INPUT_FIXTURE.id]
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const trustOutcomeNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'public_disclosure.trust_outcome') ?? []

    expect(record).toEqual(NORMALIZATION_INPUT_FIXTURE)
    expect(trustOutcomeNotes).toHaveLength(1)
    expect(trustOutcomeNotes[0]?.metadata?.cooperationBand).toBe('aligned')
  })
})
