import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  sanitizeRecurrentCatastropheRecords,
} from '../domain/recurrentCatastropheAmeliorationRegistry'

describe('recurrentCatastropheAmeliorationRegistry persistence (SPE-2117 slice 2)', () => {
  it('defaults starting state to an empty recurrent catastrophe map', () => {
    expect(createStartingState().recurrentCatastropheRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeRecurrentCatastropheRecords(
      {
        valid: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
        ledger: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        'wrong-key': {
          ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
          id: 'recurrent-catastrophe:structural-breach-cycle',
        },
        duplicate: {
          ...IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          recurrenceCadence: 'monthly',
          failureMode: 'breach',
          preventionCeiling: 'unknown',
          ameliorationTactics: [{ tactic: 'shielding', active: true }],
          recurrenceCount: 0,
        },
        activePreventionWhenImpossible: {
          id: 'recurrent-catastrophe:invalid-prevention',
          label: 'Invalid active prevention',
          recurrenceCadence: 'monthly',
          failureMode: 'breach',
          preventionCeiling: 'impossible',
          ameliorationTactics: [{ tactic: 'shielding', active: true }],
          preventionTactics: [{ tactic: 'permanent_seal', active: true }],
          recurrenceCount: 0,
        },
        franchiseToken: {
          id: 'recurrent-catastrophe:franchise-label',
          label: 'Foundation catastrophe record',
          recurrenceCadence: 'weekly',
          failureMode: 'manifestation',
          preventionCeiling: 'unknown',
          ameliorationTactics: [{ tactic: 'shielding', active: true }],
          recurrenceCount: 0,
        },
        warningsOnly: {
          id: 'recurrent-catastrophe:warning-only-recurrence',
          label: 'Recurrence without ledger warning',
          recurrenceCadence: 'weekly',
          failureMode: 'manifestation',
          preventionCeiling: 'unknown',
          ameliorationTactics: [{ tactic: 'shielding', active: true }],
          recurrenceCount: 2,
        },
      },
      fallback
    )

    expect(sanitized['recurrent-catastrophe:structural-breach-cycle']).toEqual(
      IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE
    )
    expect(sanitized['recurrent-catastrophe:manifestation-cascade-history']).toEqual(
      RECURRENCE_DAMAGE_LEDGER_FIXTURE
    )
    expect(sanitized['recurrent-catastrophe:warning-only-recurrence']).toEqual({
      id: 'recurrent-catastrophe:warning-only-recurrence',
      label: 'Recurrence without ledger warning',
      recurrenceCadence: 'weekly',
      failureMode: 'manifestation',
      preventionCeiling: 'unknown',
      ameliorationTactics: [{ tactic: 'shielding', active: true }],
      recurrenceCount: 2,
    })
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.activePreventionWhenImpossible).toBeUndefined()
    expect(sanitized.franchiseToken).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(3)
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.recurrentCatastropheRecords = {
      [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.recurrentCatastropheRecords).toEqual(state.recurrentCatastropheRecords)
    expect(
      loaded.recurrentCatastropheRecords?.[RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]?.damageLedgerRefs
    ).toEqual(RECURRENCE_DAMAGE_LEDGER_FIXTURE.damageLedgerRefs)
    expect(
      loaded.recurrentCatastropheRecords?.[RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]
        ?.postIncidentReviewRefs
    ).toEqual(RECURRENCE_DAMAGE_LEDGER_FIXTURE.postIncidentReviewRefs)
  })

  it('hydrates persisted recurrent catastrophe records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        recurrentCatastropheRecords: {
          [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
          invalid: {
            id: 'recurrent-catastrophe:invalid-prevention',
            label: 'Invalid active prevention on hydrate',
            recurrenceCadence: 'monthly',
            failureMode: 'breach',
            preventionCeiling: 'impossible',
            ameliorationTactics: [{ tactic: 'shielding', active: true }],
            preventionTactics: [{ tactic: 'neutralization', active: true }],
            recurrenceCount: 0,
          },
        },
      },
      fallback
    )

    expect(hydrated.recurrentCatastropheRecords).toEqual({
      [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
    })
  })
})
