import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
  sanitizeSelfCensoringInformationRecords,
} from '../domain/selfCensoringInformationRegistry'

describe('selfCensoringInformationRegistry persistence (SPE-2108 slice 2)', () => {
  it('defaults starting state to an empty self-censoring information map', () => {
    expect(createStartingState().selfCensoringInformationRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeSelfCensoringInformationRecords(
      {
        valid: REDISCOVERY_LOOP_RECORD_FIXTURE,
        studyBlocked: STUDY_BLOCKED_ARCHIVE_FIXTURE,
        'wrong-key': {
          ...STUDY_BLOCKED_ARCHIVE_FIXTURE,
          id: 'info:unclaimed-lab-wing',
        },
        duplicate: {
          ...REDISCOVERY_LOOP_RECORD_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
        },
        zeroLoopWithAlarm: {
          id: 'info:zero-loop',
          label: 'Zero loop with alarm',
          rediscoveryLoop: {
            loopCount: 0,
            lastAlarmWeek: 12,
            forgottenWarningRefs: ['warning:gap-resurface'],
          },
        },
        franchiseLabel: {
          id: 'info:franchise',
          label: 'SCP division briefing gap',
        },
        negativeFactsWithoutParent: {
          id: 'info:orphan-negative-facts',
          label: 'Orphan negative facts only',
          negativeFacts: [{ predicate: 'assigned_staff_present', scope: 'lab-4' }],
        },
      },
      fallback
    )

    expect(sanitized['info:unclaimed-lab-wing']).toEqual(REDISCOVERY_LOOP_RECORD_FIXTURE)
    expect(sanitized['info:sealed-briefing-corpus']).toEqual(STUDY_BLOCKED_ARCHIVE_FIXTURE)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.zeroLoopWithAlarm).toBeUndefined()
    expect(sanitized.invalidConfidence).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized['info:orphan-negative-facts']).toEqual({
      id: 'info:orphan-negative-facts',
      label: 'Orphan negative facts only',
      negativeFacts: [{ predicate: 'assigned_staff_present', scope: 'lab-4' }],
    })
    expect(Object.keys(sanitized).sort()).toEqual([
      'info:orphan-negative-facts',
      'info:sealed-briefing-corpus',
      'info:unclaimed-lab-wing',
    ])
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
      [STUDY_BLOCKED_ARCHIVE_FIXTURE.id]: STUDY_BLOCKED_ARCHIVE_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.selfCensoringInformationRecords).toEqual(state.selfCensoringInformationRecords)
    expect(
      loaded.selfCensoringInformationRecords?.[REDISCOVERY_LOOP_RECORD_FIXTURE.id]?.negativeFacts
    ).toEqual(REDISCOVERY_LOOP_RECORD_FIXTURE.negativeFacts)
    expect(
      loaded.selfCensoringInformationRecords?.[REDISCOVERY_LOOP_RECORD_FIXTURE.id]?.rediscoveryLoop
    ).toEqual(REDISCOVERY_LOOP_RECORD_FIXTURE.rediscoveryLoop)
  })

  it('hydrates persisted self-censoring information records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        selfCensoringInformationRecords: {
          [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
          invalid: {
            id: 'info:invalid',
            label: 'Invalid loop',
            rediscoveryLoop: {
              loopCount: 0,
              forgottenWarningRefs: ['warning:should-drop'],
            },
          },
        },
      },
      fallback
    )

    expect(hydrated.selfCensoringInformationRecords).toEqual({
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    })
  })
})
