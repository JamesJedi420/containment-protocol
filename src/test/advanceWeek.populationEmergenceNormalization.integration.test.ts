import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
} from '../domain/massAnomalousPopulationEmergenceRegistry'
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

describe('advanceWeek population emergence normalization wire-up (SPE-2122 slice 5)', () => {
  it('wires derived normalization inputs onto disclosure records when fixtures coexist', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 12
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }
    state.massAnomalousPopulationEmergenceRecords = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const officialRecord = nextState.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]
    const normalizationRecord =
      nextState.publicDisclosureRecords?.[NORMALIZATION_INPUT_FIXTURE.id]

    expect(
      officialRecord?.normalizationInputs?.some(
        (input) => input.ref === MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id
      )
    ).toBe(true)
    expect(
      normalizationRecord?.normalizationInputs?.some(
        (input) => input.ref === COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id
      )
    ).toBe(true)
    expect(
      normalizationRecord?.normalizationInputs?.some(
        (input) => input.kind === 'anomaly_tourism' && input.ref === 'program:public-tour-pilot-7'
      )
    ).toBe(true)
  })

  it('does not mutate disclosure records when population emergence map is empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }
    state.massAnomalousPopulationEmergenceRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.publicDisclosureRecords?.[NORMALIZATION_INPUT_FIXTURE.id]).toEqual(
      NORMALIZATION_INPUT_FIXTURE
    )
  })
})
