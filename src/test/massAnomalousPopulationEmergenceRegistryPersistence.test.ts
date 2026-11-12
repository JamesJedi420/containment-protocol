import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
  sanitizeMassAnomalousPopulationEmergenceRecords,
} from '../domain/massAnomalousPopulationEmergenceRegistry'

describe('massAnomalousPopulationEmergenceRegistry persistence (SPE-2122 slice 2)', () => {
  it('defaults starting state to an empty population emergence map', () => {
    expect(createStartingState().massAnomalousPopulationEmergenceRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeMassAnomalousPopulationEmergenceRecords(
      {
        valid: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
        collapsed: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
        'wrong-key': {
          ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
          id: 'population-emergence:collapsed-masquerade-education',
        },
        duplicate: {
          ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          emergenceMagnitudeBand: 'regional',
          governanceMode: 'managed_disclosure',
          triageLanes: ['lane:registration-intake'],
          newlyAnomalousCountEstimate: 1000,
          registrationBacklogWeeks: 1,
          publicEducationBurden: 0.5,
        },
        franchiseLabel: {
          id: 'population-emergence:franchise',
          label: 'SCP division registration surge',
          emergenceMagnitudeBand: 'regional',
          governanceMode: 'managed_disclosure',
          triageLanes: ['lane:registration-intake'],
          newlyAnomalousCountEstimate: 1000,
          registrationBacklogWeeks: 1,
          publicEducationBurden: 0.5,
        },
        invalidMagnitude: {
          id: 'population-emergence:invalid-magnitude',
          label: 'Invalid magnitude band',
          emergenceMagnitudeBand: 'not_a_band',
          governanceMode: 'managed_disclosure',
          triageLanes: ['lane:registration-intake'],
          newlyAnomalousCountEstimate: 1000,
          registrationBacklogWeeks: 1,
          publicEducationBurden: 0.5,
        },
        invalidGovernance: {
          id: 'population-emergence:invalid-governance',
          label: 'Invalid governance mode',
          emergenceMagnitudeBand: 'regional',
          governanceMode: 'not_a_mode',
          triageLanes: ['lane:registration-intake'],
          newlyAnomalousCountEstimate: 1000,
          registrationBacklogWeeks: 1,
          publicEducationBurden: 0.5,
        },
        emptyTriageLanes: {
          id: 'population-emergence:empty-triage',
          label: 'Empty triage lanes',
          emergenceMagnitudeBand: 'regional',
          governanceMode: 'managed_disclosure',
          triageLanes: [],
          newlyAnomalousCountEstimate: 1000,
          registrationBacklogWeeks: 1,
          publicEducationBurden: 0.5,
        },
      },
      fallback
    )

    expect(sanitized['population-emergence:managed-disclosure-wave-3']).toEqual(
      MANAGED_DISCLOSURE_BACKLOG_FIXTURE
    )
    expect(sanitized['population-emergence:collapsed-masquerade-education']).toEqual(
      COLLAPSED_MASQUERADE_EDUCATION_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.invalidMagnitude).toBeUndefined()
    expect(sanitized.invalidGovernance).toBeUndefined()
    expect(sanitized.emptyTriageLanes).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'population-emergence:collapsed-masquerade-education',
      'population-emergence:managed-disclosure-wave-3',
    ])
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.massAnomalousPopulationEmergenceRecords = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.massAnomalousPopulationEmergenceRecords).toEqual(
      state.massAnomalousPopulationEmergenceRecords
    )
    expect(
      loaded.massAnomalousPopulationEmergenceRecords?.[MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]
        ?.triageLanes
    ).toEqual(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.triageLanes)
    expect(
      loaded.massAnomalousPopulationEmergenceRecords?.[MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]
        ?.rightsReviewQueueRefs
    ).toEqual(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.rightsReviewQueueRefs)
    expect(
      loaded.massAnomalousPopulationEmergenceRecords?.[MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]
        ?.securitySurgeRefs
    ).toEqual(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.securitySurgeRefs)
    expect(
      loaded.massAnomalousPopulationEmergenceRecords?.[COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]
        ?.triageLanes
    ).toEqual(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.triageLanes)
  })

  it('hydrates persisted population emergence records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        massAnomalousPopulationEmergenceRecords: {
          [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
          invalid: {
            id: 'population-emergence:invalid',
            label: 'SCP division registration surge',
            emergenceMagnitudeBand: 'regional',
            governanceMode: 'managed_disclosure',
            triageLanes: ['lane:registration-intake'],
            newlyAnomalousCountEstimate: 1000,
            registrationBacklogWeeks: 1,
            publicEducationBurden: 0.5,
          },
        },
      },
      fallback
    )

    expect(hydrated.massAnomalousPopulationEmergenceRecords).toEqual({
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    })
  })
})
