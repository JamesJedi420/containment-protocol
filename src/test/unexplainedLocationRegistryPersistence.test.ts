import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  LIFECYCLE_CHAIN_LOCATION_FIXTURE,
  REMOTE_MONITOR_SITE_FIXTURE,
  sanitizeUnexplainedLocationRecords,
} from '../domain/unexplainedLocationRegistry'

describe('unexplainedLocationRegistry persistence (SPE-2106 slice 2)', () => {
  it('defaults starting state to an empty unexplained location map', () => {
    expect(createStartingState().unexplainedLocationRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeUnexplainedLocationRecords(
      {
        valid: REMOTE_MONITOR_SITE_FIXTURE,
        lifecycle: LIFECYCLE_CHAIN_LOCATION_FIXTURE,
        'wrong-key': {
          ...LIFECYCLE_CHAIN_LOCATION_FIXTURE,
          id: 'location:remote-ridge-station',
        },
        duplicate: {
          ...REMOTE_MONITOR_SITE_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          effectGeometry: 'room',
          effectDomainTags: ['spatial'],
          populationSelectors: [{ kind: 'location', value: 'x' }],
          lifecycleState: 'active',
          latentSeverityScore: 10,
        },
        invalidGeometry: {
          id: 'location:bad-geometry',
          label: 'Bad geometry',
          effectGeometry: 'not-a-geometry',
          effectDomainTags: ['spatial'],
          populationSelectors: [{ kind: 'location', value: 'room-a' }],
          lifecycleState: 'active',
          latentSeverityScore: 12,
        },
        invalidLifecycle: {
          id: 'location:bad-lifecycle',
          label: 'Bad lifecycle',
          effectGeometry: 'room',
          effectDomainTags: ['spatial'],
          populationSelectors: [{ kind: 'location', value: 'room-b' }],
          lifecycleState: 'not-a-state',
          latentSeverityScore: 8,
        },
      },
      fallback
    )

    expect(sanitized['location:remote-ridge-station']).toEqual(REMOTE_MONITOR_SITE_FIXTURE)
    expect(sanitized['location:canal-pump-house']).toEqual(LIFECYCLE_CHAIN_LOCATION_FIXTURE)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.invalidGeometry).toBeUndefined()
    expect(sanitized.invalidLifecycle).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })

  it('round-trips fixture locations with statusHistory byte-stable through save/load', () => {
    const state = createStartingState()
    state.unexplainedLocationRecords = {
      [REMOTE_MONITOR_SITE_FIXTURE.id]: REMOTE_MONITOR_SITE_FIXTURE,
      [LIFECYCLE_CHAIN_LOCATION_FIXTURE.id]: LIFECYCLE_CHAIN_LOCATION_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.unexplainedLocationRecords).toEqual(state.unexplainedLocationRecords)
    expect(
      loaded.unexplainedLocationRecords?.[LIFECYCLE_CHAIN_LOCATION_FIXTURE.id]?.statusHistory
    ).toEqual(LIFECYCLE_CHAIN_LOCATION_FIXTURE.statusHistory)
  })

  it('hydrates persisted unexplained locations through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        unexplainedLocationRecords: {
          [REMOTE_MONITOR_SITE_FIXTURE.id]: REMOTE_MONITOR_SITE_FIXTURE,
          invalid: {
            id: 'location:invalid',
            label: 'Invalid lifecycle',
            effectGeometry: 'room',
            effectDomainTags: ['spatial'],
            populationSelectors: [{ kind: 'location', value: 'room-c' }],
            lifecycleState: 'not-a-state',
            latentSeverityScore: 5,
          },
        },
      },
      fallback
    )

    expect(hydrated.unexplainedLocationRecords).toEqual({
      [REMOTE_MONITOR_SITE_FIXTURE.id]: REMOTE_MONITOR_SITE_FIXTURE,
    })
  })
})
