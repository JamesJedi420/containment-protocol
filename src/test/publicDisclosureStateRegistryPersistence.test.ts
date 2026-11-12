import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  sanitizePublicDisclosureRecords,
} from '../domain/publicDisclosureStateRegistry'

describe('publicDisclosureStateRegistry persistence (SPE-2109 slice 2)', () => {
  it('defaults starting state to an empty public disclosure map', () => {
    expect(createStartingState().publicDisclosureRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizePublicDisclosureRecords(
      {
        valid: DISCLOSURE_PROGRESSION_FIXTURE,
        normalization: NORMALIZATION_INPUT_FIXTURE,
        'wrong-key': {
          ...DISCLOSURE_PROGRESSION_FIXTURE,
          id: 'disclosure:former-vault-tourism',
        },
        duplicate: {
          ...DISCLOSURE_PROGRESSION_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          awarenessLevel: 'official_disclosure',
          falloutPhase: 'disclosure',
        },
        franchiseLabel: {
          id: 'disclosure:franchise',
          label: 'SCP division briefing gap',
          awarenessLevel: 'local_rumor',
          falloutPhase: 'leak',
        },
        invalidAwareness: {
          id: 'disclosure:invalid-awareness',
          label: 'Invalid awareness level',
          awarenessLevel: 'not_a_level',
          falloutPhase: 'leak',
        },
        invalidFallout: {
          id: 'disclosure:invalid-fallout',
          label: 'Invalid fallout phase',
          awarenessLevel: 'local_rumor',
          falloutPhase: 'not_a_phase',
        },
      },
      fallback
    )

    expect(sanitized['disclosure:coastal-research-campus']).toEqual(DISCLOSURE_PROGRESSION_FIXTURE)
    expect(sanitized['disclosure:former-vault-tourism']).toEqual(NORMALIZATION_INPUT_FIXTURE)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.invalidAwareness).toBeUndefined()
    expect(sanitized.invalidFallout).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'disclosure:coastal-research-campus',
      'disclosure:former-vault-tourism',
    ])
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.publicDisclosureRecords).toEqual(state.publicDisclosureRecords)
    expect(
      loaded.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]?.transitionHistory
    ).toEqual(DISCLOSURE_PROGRESSION_FIXTURE.transitionHistory)
    expect(
      loaded.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]?.trustByRegion
    ).toEqual(DISCLOSURE_PROGRESSION_FIXTURE.trustByRegion)
    expect(
      loaded.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]?.linkedContractOutcomes
    ).toEqual(DISCLOSURE_PROGRESSION_FIXTURE.linkedContractOutcomes)
  })

  it('hydrates persisted public disclosure records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        publicDisclosureRecords: {
          [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
          invalid: {
            id: 'disclosure:invalid',
            label: 'SCP division briefing gap',
            awarenessLevel: 'local_rumor',
            falloutPhase: 'leak',
          },
        },
      },
      fallback
    )

    expect(hydrated.publicDisclosureRecords).toEqual({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    })
  })
})
