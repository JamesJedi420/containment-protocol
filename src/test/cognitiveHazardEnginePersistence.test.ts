import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  sanitizeCognitiveHazardExposureRecords,
  validateCognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'

describe('cognitiveHazardEngine persistence (SPE-1309 slice 2)', () => {
  it('defaults starting state to an empty cognitive hazard exposure map', () => {
    expect(createStartingState().cognitiveHazardExposureRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const altRecord = {
      ...COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      id: 'cognitive-hazard:alt-subject',
      subjectRef: 'agent:alt-subject',
    }
    const fallback = {}
    const sanitized = sanitizeCognitiveHazardExposureRecords(
      {
        valid: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
        alt: altRecord,
        'wrong-key': {
          ...altRecord,
          label: 'wrong map key should lose to canonical id entry',
        },
        duplicate: {
          ...COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'agent:test',
          activeTriggerChannels: ['direct_perception'],
          fearPressure: 0.5,
          memeticExposure: 0.5,
          memoryImpairmentBand: 'unknown',
          countermeasurePosture: 'none',
        },
        franchiseLabel: {
          ...COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
          id: 'cognitive-hazard:franchise',
          label: 'SCP division exposure profile',
        },
        brandedObjectId: {
          ...COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
          id: 'cognitive-hazard:scp-049',
          label: 'Archive exposure profile',
        },
        outOfRangeScore: {
          ...COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
          id: 'cognitive-hazard:out-of-range',
          fearPressure: 1.5,
        },
      },
      fallback
    )

    expect(sanitized[COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]).toEqual(
      COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE
    )
    expect(sanitized[altRecord.id]).toEqual(altRecord)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.outOfRangeScore).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual(
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id, altRecord.id].sort()
    )
  })

  it('persists warning-only records that remain valid on hydrate', () => {
    const warningOnly = {
      ...COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
      id: 'cognitive-hazard:failed-warning-only',
      countermeasureRefs: undefined,
    }

    expect(validateCognitiveHazardExposureRecord(warningOnly).valid).toBe(true)

    const sanitized = sanitizeCognitiveHazardExposureRecords({ [warningOnly.id]: warningOnly }, {})

    expect(sanitized[warningOnly.id]).toEqual(warningOnly)
    expect(sanitized[warningOnly.id]?.countermeasurePosture).toBe('failed')
    expect(sanitized[warningOnly.id]?.countermeasureRefs).toBeUndefined()
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.cognitiveHazardExposureRecords).toEqual(state.cognitiveHazardExposureRecords)
    expect(
      loaded.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]
        ?.subjectRef
    ).toBe(COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.subjectRef)
    expect(
      loaded.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]
        ?.knowledgeIntegrityDegraded
    ).toBe(true)
    expect(
      loaded.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]
        ?.activeTriggerChannels
    ).toEqual(['direct_perception', 'reference_description'])
  })

  it('hydrates persisted cognitive hazard exposure records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        cognitiveHazardExposureRecords: {
          [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
          invalid: {
            ...COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
            id: 'cognitive-hazard:invalid',
            label: 'SCP division exposure profile',
          },
        },
      },
      fallback
    )

    expect(hydrated.cognitiveHazardExposureRecords).toEqual({
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
    })
  })

  it('repeated sanitize is byte-stable for fixture records', () => {
    const first = sanitizeCognitiveHazardExposureRecords(
      {
        [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
      },
      {}
    )
    const second = sanitizeCognitiveHazardExposureRecords(first, {})

    expect(second).toEqual(first)
    expect(
      validateCognitiveHazardExposureRecord(COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE)
    ).toEqual(
      validateCognitiveHazardExposureRecord(second[COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]!)
    )
  })
})
