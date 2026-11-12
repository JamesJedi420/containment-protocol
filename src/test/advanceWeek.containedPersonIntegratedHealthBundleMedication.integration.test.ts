import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
  VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
} from '../domain/containedPersonMedicationRegimenRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { deriveMedicationRegimenBundleFragmentsFromRecords } from '../domain/containedPersonMedicationRegimenHealthBundleLinks'
import { composeMedicationRegimenIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek contained-person integrated health bundle medication integration (SPE-1889 slice 8)', () => {
  it('is a no-op for empty medication regimen and bundle maps without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonMedicationRegimenRecords = {}
    state.containedPersonIntegratedHealthBundles = {}

    const nextState = advanceWeek(state)

    expect(nextState.containedPersonIntegratedHealthBundles ?? {}).toEqual({})
  })

  it('composes integrated health bundles from medication regimen records after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonMedicationRegimenRecords = {
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const bundles = nextState.containedPersonIntegratedHealthBundles ?? {}

    expect(Object.keys(bundles)).toEqual([
      VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef,
      COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.subjectRef,
    ])

    const adverseBundle = bundles[COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.subjectRef]
    expect(adverseBundle?.medicationRegimenLinks?.[0]?.adverseReactionFlag).toBe(true)
    expect(adverseBundle?.medicationRegimenLinks?.[0]?.consentStatus).toBe('compelled')
  })

  it('matches standalone derive + compose output for the same hydrated regimen map', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonMedicationRegimenRecords = {
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords(
      nextState.containedPersonMedicationRegimenRecords
    )
    const composed = composeMedicationRegimenIntoIntegratedHealthBundles({}, fragments)

    expect(
      nextState.containedPersonIntegratedHealthBundles?.[
        VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef
      ]?.medicationRegimenLinks
    ).toEqual(
      composed[VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef]?.medicationRegimenLinks
    )
  })
})
