import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
  sanitizePsychologicalResilienceRecords,
  validatePsychologicalResilienceRecord,
} from '../domain/psychologicalResilienceRegistry'

describe('psychologicalResilienceRegistry persistence (SPE-1615 slice 2)', () => {
  it('defaults starting state to an empty psychological resilience map', () => {
    expect(createStartingState().psychologicalResilienceRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const altRecord = {
      ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      id: 'psych-resilience:alt-operator',
      operatorRef: 'agent:alt-operator',
    }
    const fallback = {}
    const sanitized = sanitizePsychologicalResilienceRecords(
      {
        valid: PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
        alt: altRecord,
        'wrong-key': {
          ...altRecord,
          label: 'wrong map key should lose to canonical id entry',
        },
        duplicate: {
          ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          operatorRef: 'agent:test',
          depletionBand: 'unknown',
          exposureScore: 0.5,
          exposureEventCount: 1,
          recoveryChannel: 'rest_recoverable',
          treatmentRequired: false,
          restRecoverable: true,
        },
        franchiseLabel: {
          ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
          id: 'psych-resilience:franchise',
          label: 'SCP division resilience profile',
        },
        brandedObjectId: {
          ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
          id: 'psych-resilience:scp-049',
          label: 'Archive resilience profile',
        },
        outOfRangeScore: {
          ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
          id: 'psych-resilience:out-of-range',
          exposureScore: 1.5,
        },
      },
      fallback
    )

    expect(sanitized[PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]).toEqual(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE
    )
    expect(sanitized[altRecord.id]).toEqual(altRecord)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.outOfRangeScore).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual(
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id, altRecord.id].sort()
    )
  })

  it('persists warning-only records that remain valid on hydrate', () => {
    const warningOnly = {
      ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      id: 'psych-resilience:breakdown-warning-only',
      depletionBand: 'breakdown' as const,
      treatmentRequired: false,
      restRecoverable: true,
      recoveryChannel: 'treatment_required' as const,
    }

    expect(validatePsychologicalResilienceRecord(warningOnly).valid).toBe(true)

    const sanitized = sanitizePsychologicalResilienceRecords({ [warningOnly.id]: warningOnly }, {})

    expect(sanitized[warningOnly.id]).toEqual(warningOnly)
    expect(sanitized[warningOnly.id]?.treatmentRequired).toBe(false)
    expect(sanitized[warningOnly.id]?.restRecoverable).toBe(true)
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.psychologicalResilienceRecords).toEqual(state.psychologicalResilienceRecords)
    expect(
      loaded.psychologicalResilienceRecords?.[PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]
        ?.operatorRef
    ).toBe(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef)
    expect(
      loaded.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id
      ]?.treatmentRequired
    ).toBe(true)
    expect(
      loaded.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id
      ]?.restRecoverable
    ).toBe(false)
  })

  it('hydrates persisted psychological resilience records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        psychologicalResilienceRecords: {
          [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
            PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
          invalid: {
            ...PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
            id: 'psych-resilience:invalid',
            label: 'SCP division resilience profile',
          },
        },
      },
      fallback
    )

    expect(hydrated.psychologicalResilienceRecords).toEqual({
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
    })
  })

  it('repeated sanitize is byte-stable for fixture records', () => {
    const first = sanitizePsychologicalResilienceRecords(
      {
        [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
          PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      },
      {}
    )
    const second = sanitizePsychologicalResilienceRecords(first, {})

    expect(second).toEqual(first)
    expect(
      validatePsychologicalResilienceRecord(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE)
    ).toEqual(
      validatePsychologicalResilienceRecord(
        second[PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]!
      )
    )
  })
})
