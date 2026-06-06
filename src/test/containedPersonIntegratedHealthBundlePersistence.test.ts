import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
} from '../domain/containedPersonTherapeuticCareRegistry'
import {
  sanitizeContainedPersonIntegratedHealthBundles,
  type ContainedPersonIntegratedHealthBundle,
} from '../domain/containedPersonIntegratedHealthBundleRegistry'
import { deriveTherapeuticCareBundleFragmentsFromRecords } from '../domain/containedPersonTherapeuticCareHealthBundleLinks'
import { composeTherapeuticCareIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'

describe('containedPersonIntegratedHealthBundle persistence (SPE-1889 slice 5)', () => {
  it('defaults containedPersonIntegratedHealthBundles to an empty map in starting state', () => {
    expect(createStartingState().containedPersonIntegratedHealthBundles).toEqual({})
  })

  it('round-trips composed bundles through serialize/import', () => {
    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    })
    const bundles = composeTherapeuticCareIntoIntegratedHealthBundles({}, fragments)

    const state = createStartingState()
    state.containedPersonIntegratedHealthBundles = bundles

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.containedPersonIntegratedHealthBundles).toEqual(bundles)
    expect(
      loaded.containedPersonIntegratedHealthBundles?.[WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef]
        ?.therapeuticCareScheduleLinks
    ).toEqual(
      bundles[WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef]?.therapeuticCareScheduleLinks
    )
  })

  it('drops invalid bundle entries on hydrate without throw', () => {
    const validBundle: ContainedPersonIntegratedHealthBundle = {
      id: WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef,
      label: 'Valid bundle',
      subjectRef: WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef,
      mentalStateBand: 'stable',
    }

    const hydrated = sanitizeContainedPersonIntegratedHealthBundles({
      [validBundle.id]: validBundle,
      'bundle:invalid-id-mismatch': {
        id: 'bundle:invalid-id-mismatch',
        label: 'Invalid bundle',
        subjectRef: 'subject:other-ref',
      },
      'bundle:invalid-mental-band': {
        id: 'bundle:invalid-mental-band',
        label: 'Invalid mental band',
        subjectRef: 'bundle:invalid-mental-band',
        mentalStateBand: 'unknown-band',
      },
    })

    expect(hydrated).toEqual({
      [validBundle.id]: validBundle,
    })
  })
})
