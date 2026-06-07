import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
  sanitizeNamingHazardDescriptorRecords,
} from '../domain/namingHazardDescriptorRegistry'

describe('namingHazardDescriptorRegistry persistence (SPE-2116 slice 2)', () => {
  it('defaults starting state to an empty naming-hazard descriptor map', () => {
    expect(createStartingState().namingHazardDescriptorRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeNamingHazardDescriptorRecords(
      {
        valid: DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
        compulsive: COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
        'wrong-key': {
          ...COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
          id: 'naming-hazard:coastal-approach-ward',
        },
        duplicate: {
          ...DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          trueNameForbidden: true,
          safeDescriptorPool: ['Approved surrogate'],
          uiSubstitutionPolicy: 'pool_descriptor',
          mapLabelMode: 'descriptor_only',
        },
        emptyPoolWhenForbidden: {
          id: 'naming-hazard:empty-pool',
          label: 'Empty pool when forbidden',
          trueNameForbidden: true,
          safeDescriptorPool: [],
          uiSubstitutionPolicy: 'pool_descriptor',
          mapLabelMode: 'descriptor_only',
        },
        invalidPolicy: {
          id: 'naming-hazard:bad-policy',
          label: 'Bad policy',
          trueNameForbidden: false,
          safeDescriptorPool: ['Approved surrogate'],
          uiSubstitutionPolicy: 'not-a-policy',
          mapLabelMode: 'descriptor_only',
        },
        franchiseToken: {
          id: 'naming-hazard:franchise-label',
          label: 'Foundation naming hazard record',
          trueNameForbidden: true,
          safeDescriptorPool: ['Approved surrogate'],
          uiSubstitutionPolicy: 'pool_descriptor',
          mapLabelMode: 'descriptor_only',
        },
      },
      fallback
    )

    expect(sanitized['naming-hazard:coastal-approach-ward']).toEqual(
      DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE
    )
    expect(sanitized['naming-hazard:archive-reading-room']).toEqual(
      COMPULSIVE_PHRASE_BRIEFING_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.emptyPoolWhenForbidden).toBeUndefined()
    expect(sanitized.invalidPolicy).toBeUndefined()
    expect(sanitized.franchiseToken).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })

  it('preserves safeDescriptorPool ordering byte-stable through sanitize and save/load', () => {
    const poolOrder = ['North quarry overlook', 'Grid sector approach lane'] as const

    expect(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.safeDescriptorPool).toEqual([...poolOrder])

    const sanitized = sanitizeNamingHazardDescriptorRecords({
      coastal: DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
    })

    expect(sanitized[DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]?.safeDescriptorPool).toEqual([
      ...poolOrder,
    ])

    const state = createStartingState()
    state.namingHazardDescriptorRecords = sanitized
    const loaded = loadGameSave(serializeGameSave(state))

    expect(
      loaded.namingHazardDescriptorRecords?.[DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]
        ?.safeDescriptorPool
    ).toEqual([...poolOrder])
  })

  it('preserves optional intakeTopicRef through sanitize and save/load round-trip', () => {
    const sanitized = sanitizeNamingHazardDescriptorRecords({
      canal: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    })

    expect(sanitized[CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]?.intakeTopicRef).toBe(
      'topic:canal-bridge-incident'
    )

    const state = createStartingState()
    state.namingHazardDescriptorRecords = sanitized
    const loaded = loadGameSave(serializeGameSave(state))

    expect(
      loaded.namingHazardDescriptorRecords?.[CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]?.intakeTopicRef
    ).toBe('topic:canal-bridge-incident')
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.namingHazardDescriptorRecords = {
      [DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]: DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
      [COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id]: COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.namingHazardDescriptorRecords).toEqual(state.namingHazardDescriptorRecords)
    expect(
      loaded.namingHazardDescriptorRecords?.[COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id]
        ?.compulsivePhraseWatchlist
    ).toEqual(COMPULSIVE_PHRASE_BRIEFING_FIXTURE.compulsivePhraseWatchlist)
  })

  it('hydrates persisted naming-hazard descriptors through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        namingHazardDescriptorRecords: {
          [DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]: DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
          invalid: {
            id: 'naming-hazard:invalid',
            label: 'Invalid empty pool',
            trueNameForbidden: true,
            safeDescriptorPool: [],
            uiSubstitutionPolicy: 'pool_descriptor',
            mapLabelMode: 'descriptor_only',
          },
          franchiseToken: {
            id: 'naming-hazard:wiki-token',
            label: 'See wiki.scpfoundation.net for details',
            trueNameForbidden: true,
            safeDescriptorPool: ['Approved surrogate'],
            uiSubstitutionPolicy: 'pool_descriptor',
            mapLabelMode: 'descriptor_only',
          },
        },
      },
      fallback
    )

    expect(hydrated.namingHazardDescriptorRecords).toEqual({
      [DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]: DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
    })
  })
})
