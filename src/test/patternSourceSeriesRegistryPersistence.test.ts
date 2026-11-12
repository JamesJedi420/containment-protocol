import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  EXPRESSION_RISK_PROVISIONAL_FIXTURE,
  SERIES_HUB_OPEN_ENTRY_FIXTURE,
  sanitizePatternSourceSeriesRecords,
} from '../domain/patternSourceSeriesRegistry'

describe('patternSourceSeriesRegistry persistence (SPE-2110 slice 2)', () => {
  it('defaults starting state to an empty pattern source series map', () => {
    expect(createStartingState().patternSourceSeriesRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizePatternSourceSeriesRecords(
      {
        valid: SERIES_HUB_OPEN_ENTRY_FIXTURE,
        provisional: EXPRESSION_RISK_PROVISIONAL_FIXTURE,
        'wrong-key': {
          ...SERIES_HUB_OPEN_ENTRY_FIXTURE,
          id: 'pattern-series:occult-investigation-blurb',
        },
        duplicate: {
          ...SERIES_HUB_OPEN_ENTRY_FIXTURE,
          title: 'duplicate title should lose',
        },
        invalid: {
          id: '',
          slug: 'bad',
          title: 'bad',
          sourceFamily: 'series_hub',
          publicationOrder: '2020-01-01',
          processingStatus: 'unqueued',
          readinessScore: 0.5,
        },
        franchiseTitle: {
          id: 'pattern-series:franchise',
          slug: 'franchise',
          title: 'SCP division briefing gap',
          sourceFamily: 'series_hub',
          publicationOrder: '2020-01-01',
          processingStatus: 'unqueued',
          readinessScore: 0.5,
        },
        invalidSourceFamily: {
          id: 'pattern-series:invalid-family',
          slug: 'invalid-family',
          title: 'Invalid source family',
          sourceFamily: 'not_a_family',
          publicationOrder: '2020-01-01',
          processingStatus: 'unqueued',
          readinessScore: 0.5,
        },
        invalidPublicationOrder: {
          id: 'pattern-series:invalid-date',
          slug: 'invalid-date',
          title: 'Invalid publication order',
          sourceFamily: 'series_hub',
          publicationOrder: 'not-a-date',
          processingStatus: 'unqueued',
          readinessScore: 0.5,
        },
      },
      fallback
    )

    expect(sanitized['pattern-series:facility-crisis-hub']).toEqual(SERIES_HUB_OPEN_ENTRY_FIXTURE)
    expect(sanitized['pattern-series:occult-investigation-blurb']).toEqual(
      EXPRESSION_RISK_PROVISIONAL_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseTitle).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.invalidSourceFamily).toBeUndefined()
    expect(sanitized.invalidPublicationOrder).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'pattern-series:facility-crisis-hub',
      'pattern-series:occult-investigation-blurb',
    ])
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.patternSourceSeriesRecords = {
      [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
      [EXPRESSION_RISK_PROVISIONAL_FIXTURE.id]: EXPRESSION_RISK_PROVISIONAL_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.patternSourceSeriesRecords).toEqual(state.patternSourceSeriesRecords)
    expect(
      loaded.patternSourceSeriesRecords?.[SERIES_HUB_OPEN_ENTRY_FIXTURE.id]?.editorialStatus
    ).toEqual(SERIES_HUB_OPEN_ENTRY_FIXTURE.editorialStatus)
    expect(
      loaded.patternSourceSeriesRecords?.[SERIES_HUB_OPEN_ENTRY_FIXTURE.id]?.processingHistory
    ).toEqual(SERIES_HUB_OPEN_ENTRY_FIXTURE.processingHistory)
    expect(
      loaded.patternSourceSeriesRecords?.[SERIES_HUB_OPEN_ENTRY_FIXTURE.id]?.linkedClusterIds
    ).toEqual(SERIES_HUB_OPEN_ENTRY_FIXTURE.linkedClusterIds)
    expect(
      loaded.patternSourceSeriesRecords?.[EXPRESSION_RISK_PROVISIONAL_FIXTURE.id]?.adaptation
    ).toEqual(EXPRESSION_RISK_PROVISIONAL_FIXTURE.adaptation)
  })

  it('hydrates persisted pattern source series records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        patternSourceSeriesRecords: {
          [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
          invalid: {
            id: 'pattern-series:invalid',
            slug: 'invalid',
            title: 'SCP division briefing gap',
            sourceFamily: 'series_hub',
            publicationOrder: '2020-01-01',
            processingStatus: 'unqueued',
            readinessScore: 0.5,
          },
        },
      },
      fallback
    )

    expect(hydrated.patternSourceSeriesRecords).toEqual({
      [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
    })
  })
})
