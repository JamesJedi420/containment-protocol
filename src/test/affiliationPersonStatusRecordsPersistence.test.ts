import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
  sanitizeAffiliationPersonStatusRecords,
} from '../domain/affiliationPersonStatusRecords'

describe('affiliationPersonStatusRecords persistence (SPE-2518 slice 1)', () => {
  it('defaults starting state to an empty affiliation person-status map', () => {
    expect(createStartingState().affiliationPersonStatusRecords).toEqual({})
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      [RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id]:
        RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.affiliationPersonStatusRecords).toEqual(state.affiliationPersonStatusRecords)
  })

  it('round-trips valid weekly progression entries through save/load', () => {
    const state = createStartingState()
    state.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        weeklyProgression: [
          {
            id: 'progression:contractor-week-7',
            week: 7,
            summary: 'Contractor onboarding bundle arrives.',
            backgroundCleared: true,
            grantedSiteIds: ['site:annex-7'],
            protectedReviewEvidenceRefs: ['review:contractor-guardianship'],
          },
        ],
      },
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(
      loaded.affiliationPersonStatusRecords?.[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]
        ?.weeklyProgression
    ).toEqual(
      state.affiliationPersonStatusRecords[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]
        ?.weeklyProgression
    )
  })

  it('hydrates persisted affiliation person-status records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        affiliationPersonStatusRecords: {
          [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
            COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
          invalid: {
            id: 'person-status:invalid',
            subjectId: 'subject:invalid',
            subjectLabel: '',
          },
          mismatched: {
            ...RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
          },
        },
      },
      fallback
    )

    expect(hydrated.affiliationPersonStatusRecords).toEqual({
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
    })
  })

  it('falls back when the persisted map has no valid records', () => {
    const fallback = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
    }

    expect(
      sanitizeAffiliationPersonStatusRecords(
        {
          invalid: {
            id: '',
            subjectId: 'subject:invalid',
            subjectLabel: 'Invalid',
          },
        },
        fallback
      )
    ).toBe(fallback)
  })
})
