import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
  sanitizeSurveillanceInterventionTuningRecords,
  validateSurveillanceInterventionTuningRecord,
} from '../domain/surveillanceCapacityInterventionTuningRegistry'

describe('surveillanceCapacityInterventionTuningRegistry persistence (SPE-848 slice 2)', () => {
  it('defaults starting state to an empty surveillance tuning map', () => {
    expect(createStartingState().surveillanceInterventionTuningRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const altRecord = {
      ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      id: 'surveillance-tuning:alt-subject',
      subjectRef: 'subject:alt',
    }
    const fallback = {}
    const sanitized = sanitizeSurveillanceInterventionTuningRecords(
      {
        valid: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
        alt: altRecord,
        'wrong-key': {
          ...altRecord,
          label: 'wrong map key should lose to canonical id entry',
        },
        duplicate: {
          ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'subject:test',
          currentInterventionLevel: 'unknown',
          surveillanceSignalScore: 0.5,
          meaningfulContactScore: 0.5,
        },
        franchiseLabel: {
          ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
          id: 'surveillance-tuning:franchise',
          label: 'SCP division surveillance tuning',
        },
        brandedObjectId: {
          ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
          id: 'surveillance-tuning:scp-049',
          label: 'Archive surveillance tuning',
        },
        outOfRangeScore: {
          ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
          id: 'surveillance-tuning:out-of-range',
          surveillanceSignalScore: 1.5,
        },
      },
      fallback
    )

    expect(sanitized[SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]).toEqual(
      SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE
    )
    expect(sanitized[altRecord.id]).toEqual(altRecord)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.outOfRangeScore).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual(
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id, altRecord.id].sort()
    )
  })

  it('persists warning-only records that remain valid on hydrate', () => {
    const warningOnly = {
      ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      id: 'surveillance-tuning:relaxed-without-rationale',
      currentInterventionLevel: 'relaxed' as const,
      tuningRationaleRef: undefined,
    }

    expect(validateSurveillanceInterventionTuningRecord(warningOnly).valid).toBe(true)

    const sanitized = sanitizeSurveillanceInterventionTuningRecords(
      { [warningOnly.id]: warningOnly },
      {}
    )

    expect(sanitized[warningOnly.id]).toEqual(warningOnly)
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.surveillanceInterventionTuningRecords).toEqual(
      state.surveillanceInterventionTuningRecords
    )
    expect(
      loaded.surveillanceInterventionTuningRecords?.[SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]
        ?.tuningRationaleRef
    ).toBe(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.tuningRationaleRef)
    expect(
      loaded.surveillanceInterventionTuningRecords?.[SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]
        ?.subjectRef
    ).toBe(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.subjectRef)
  })

  it('hydrates persisted surveillance tuning records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        surveillanceInterventionTuningRecords: {
          [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
          invalid: {
            ...SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
            id: 'surveillance-tuning:invalid',
            label: 'SCP division surveillance tuning',
          },
        },
      },
      fallback
    )

    expect(hydrated.surveillanceInterventionTuningRecords).toEqual({
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    })
  })

  it('repeated sanitize is byte-stable for fixture records', () => {
    const first = sanitizeSurveillanceInterventionTuningRecords(
      { [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE },
      {}
    )
    const second = sanitizeSurveillanceInterventionTuningRecords(first, {})

    expect(second).toEqual(first)
    expect(validateSurveillanceInterventionTuningRecord(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)).toEqual(
      validateSurveillanceInterventionTuningRecord(second[SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]!)
    )
  })
})
