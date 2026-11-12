import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  BRIEF_COVER_UP_EVENT_FIXTURE,
  BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
  CLUSTER_SIBLING_EVENT_FIXTURE,
  sanitizeExtranormalEventRecords,
} from '../domain/extranormalEventRegistry'

describe('extranormalEventRegistry persistence (SPE-2105 slice 2)', () => {
  it('defaults starting state to an empty extranormal event map', () => {
    expect(createStartingState().extranormalEventRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeExtranormalEventRecords(
      {
        valid: BRIEF_COVER_UP_EVENT_FIXTURE,
        'wrong-key': {
          ...CLUSTER_SIBLING_EVENT_FIXTURE,
          id: 'event:brief-canal-shimmer',
        },
        duplicate: {
          ...BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          occurrenceWindow: { startWeek: 1 },
          effectDomainTags: ['spatial'],
          affectedAreaGeometry: 'room',
          populationSelectors: [{ kind: 'location', value: 'x' }],
        },
        monitoringWithoutClosure: {
          id: 'event:bad-monitoring',
          label: 'Monitoring without closure',
          occurrenceWindow: { startWeek: 2 },
          effectDomainTags: ['spatial'],
          affectedAreaGeometry: 'room',
          populationSelectors: [{ kind: 'location', value: 'room-a' }],
          monitoringUntilWeek: 10,
        },
        invalidGeometry: {
          id: 'event:bad-geometry',
          label: 'Bad geometry',
          occurrenceWindow: { startWeek: 3 },
          effectDomainTags: ['spatial'],
          affectedAreaGeometry: 'not-a-geometry',
          populationSelectors: [{ kind: 'location', value: 'room-b' }],
        },
      },
      fallback
    )

    expect(sanitized['event:brief-reservoir-glow']).toEqual(BRIEF_COVER_UP_EVENT_FIXTURE)
    expect(sanitized['event:brief-canal-shimmer']).toEqual(CLUSTER_SIBLING_EVENT_FIXTURE)
    expect(sanitized['event:bad-monitoring']).toBeUndefined()
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })

  it('round-trips fixture events with cluster refs byte-stable through save/load', () => {
    const state = createStartingState()
    state.extranormalEventRecords = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
      [CLUSTER_SIBLING_EVENT_FIXTURE.id]: CLUSTER_SIBLING_EVENT_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.extranormalEventRecords).toEqual(state.extranormalEventRecords)
    expect(
      loaded.extranormalEventRecords?.[BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]?.similarEventCluster
    ).toEqual(BRIEF_COVER_UP_EVENT_WITH_CLUSTER.similarEventCluster)
  })

  it('hydrates persisted extranormal events through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        extranormalEventRecords: {
          [BRIEF_COVER_UP_EVENT_FIXTURE.id]: BRIEF_COVER_UP_EVENT_FIXTURE,
          invalid: {
            id: 'event:invalid',
            label: 'Invalid monitoring',
            occurrenceWindow: { startWeek: 4 },
            effectDomainTags: ['spatial'],
            affectedAreaGeometry: 'room',
            populationSelectors: [{ kind: 'location', value: 'room-c' }],
            monitoringUntilWeek: 12,
          },
        },
      },
      fallback
    )

    expect(hydrated.extranormalEventRecords).toEqual({
      [BRIEF_COVER_UP_EVENT_FIXTURE.id]: BRIEF_COVER_UP_EVENT_FIXTURE,
    })
  })
})
