import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { DISCLOSURE_PROGRESSION_FIXTURE } from '../domain/publicDisclosureStateRegistry'
import { applyPublicDisclosurePostureChoice } from '../domain/publicDisclosurePostureChoice'
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

describe('advanceWeek public disclosure posture choice integration (SPE-861 slice 4)', () => {
  it('uses posture choices when emitting trust-outcome notes after post-tick records', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const withTransparentPosture = applyPublicDisclosurePostureChoice(state, {
      recordId: DISCLOSURE_PROGRESSION_FIXTURE.id,
      posture: 'transparent',
    }).state

    const nextState = advanceWeek(withTransparentPosture)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const trustOutcomeNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'public_disclosure.trust_outcome') ?? []

    expect(trustOutcomeNotes).toHaveLength(1)
    expect(trustOutcomeNotes[0]?.metadata?.cooperationBand).toBe('watchful')
    expect(trustOutcomeNotes[0]?.content).toContain('Watchful compliance')
    expect(nextState.publicDisclosurePostureChoices?.[DISCLOSURE_PROGRESSION_FIXTURE.id]).toBe(
      'transparent'
    )
  })

  it('preserves opposed trust outcome when no posture choice is set', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const trustOutcomeNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'public_disclosure.trust_outcome') ?? []

    expect(trustOutcomeNotes[0]?.metadata?.cooperationBand).toBe('opposed')
  })
})
