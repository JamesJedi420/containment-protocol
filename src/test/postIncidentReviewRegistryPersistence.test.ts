import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  sanitizePostIncidentReviewRecords,
} from '../domain/postIncidentReviewRegistry'

describe('postIncidentReviewRegistry persistence (SPE-868 slice 2)', () => {
  it('seeds starting state with stub post-incident review registry fixtures', () => {
    expect(createStartingState().postIncidentReviewRecords).toEqual(
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizePostIncidentReviewRecords(
      {
        valid: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
        cleared: EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
        'wrong-key': {
          ...EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
          id: 'review:cycle-3-closeout',
        },
        duplicate: {
          ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          reviewRoute: 'internal_command',
          closureOutcome: 'contained',
        },
        invalidRoute: {
          id: 'review:invalid-route',
          label: 'Invalid route review',
          reviewRoute: 'unknown_route',
          closureOutcome: 'contained',
        },
        franchiseToken: {
          id: 'review:franchise-label',
          label: 'Foundation audit review',
          reviewRoute: 'external_audit',
          closureOutcome: 'administratively_cleared',
        },
        brandedObject: {
          id: 'review:SCP-9999-audit',
          label: 'Branded object review',
          reviewRoute: 'external_audit',
          closureOutcome: 'contained',
        },
      },
      fallback
    )

    expect(sanitized['review:cycle-3-closeout']).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
    expect(sanitized['review:external-audit-cleared']).toEqual(
      EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.invalidRoute).toBeUndefined()
    expect(sanitized.franchiseToken).toBeUndefined()
    expect(sanitized.brandedObject).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      [EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]: EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.postIncidentReviewRecords).toEqual(state.postIncidentReviewRecords)
    expect(
      loaded.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]
        ?.milestoneTimings
    ).toEqual(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.milestoneTimings)
    expect(
      loaded.postIncidentReviewRecords?.[EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]?.reviewRoute
    ).toBe('external_audit')
  })

  it('hydrates persisted post-incident review records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        postIncidentReviewRecords: {
          [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
          invalid: {
            id: 'review:franchise-hydrate',
            label: 'Foundation hydrate review',
            reviewRoute: 'internal_command',
            closureOutcome: 'contained',
          },
        },
      },
      fallback
    )

    expect(hydrated.postIncidentReviewRecords).toEqual({
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
    })
  })

  it('falls back to starting stub registry when persisted map is entirely invalid', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        postIncidentReviewRecords: {
          invalid: {
            id: '',
            label: 'bad',
            reviewRoute: 'internal_command',
            closureOutcome: 'contained',
          },
        },
      },
      fallback
    )

    expect(hydrated.postIncidentReviewRecords).toEqual(POST_INCIDENT_REVIEW_STUB_REGISTRY)
  })
})
