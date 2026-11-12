import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
  sanitizeTherapeuticCareScheduleRecords,
  validateTherapeuticCareScheduleRecord,
} from '../domain/containedPersonTherapeuticCareRegistry'

describe('containedPersonTherapeuticCareRegistry persistence (SPE-2115 slice 2)', () => {
  it('defaults starting state to an empty contained-person therapeutic care map', () => {
    expect(createStartingState().containedPersonTherapeuticCareRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeTherapeuticCareScheduleRecords(
      {
        valid: WEEKLY_PSYCH_SCREENING_FIXTURE,
        elevated: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
        'wrong-key': {
          ...WEEKLY_PSYCH_SCREENING_FIXTURE,
          id: 'care-schedule:cooperative-checkin-compliance-drift',
        },
        duplicate: {
          ...WEEKLY_PSYCH_SCREENING_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'subject:test',
          careMode: 'unknown',
          cadence: 'weekly',
          channelState: 'active',
          missedSessionStreak: 0,
        },
        franchiseLabel: {
          id: 'care-schedule:franchise',
          label: 'SCP division psych screening',
          subjectRef: 'subject:test',
          careMode: 'psych_screening',
          cadence: 'weekly',
          channelState: 'active',
          missedSessionStreak: 0,
        },
        brandedObjectId: {
          id: 'care-schedule:scp-049-screening',
          label: 'Archive psych screening',
          subjectRef: 'subject:test',
          careMode: 'psych_screening',
          cadence: 'weekly',
          channelState: 'active',
          missedSessionStreak: 0,
        },
        negativeStreak: {
          id: 'care-schedule:negative-streak',
          label: 'Negative streak',
          subjectRef: 'subject:test',
          careMode: 'cooperative_checkin',
          cadence: 'weekly',
          channelState: 'active',
          missedSessionStreak: -1,
        },
      },
      fallback
    )

    expect(sanitized['care-schedule:cooperative-subject-psych-weekly']).toEqual(
      WEEKLY_PSYCH_SCREENING_FIXTURE
    )
    expect(sanitized['care-schedule:cooperative-checkin-compliance-drift']).toEqual(
      MISSED_STREAK_ELEVATED_RISK_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.negativeStreak).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'care-schedule:cooperative-checkin-compliance-drift',
      'care-schedule:cooperative-subject-psych-weekly',
    ])
  })

  it('persists warning-only records that remain valid on hydrate', () => {
    const warningOnly = {
      id: 'care-schedule:warning-only-suspended',
      label: 'Warning-only suspended channel',
      subjectRef: 'subject:cooperative-field-asset-9',
      careMode: 'mediated_audio' as const,
      cadence: 'weekly' as const,
      channelState: 'suspended' as const,
      missedSessionStreak: 0,
    }

    expect(validateTherapeuticCareScheduleRecord(warningOnly).valid).toBe(true)

    const sanitized = sanitizeTherapeuticCareScheduleRecords({ [warningOnly.id]: warningOnly }, {})

    expect(sanitized[warningOnly.id]).toEqual(warningOnly)
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.containedPersonTherapeuticCareRecords).toEqual(
      state.containedPersonTherapeuticCareRecords
    )
    expect(
      loaded.containedPersonTherapeuticCareRecords?.[WEEKLY_PSYCH_SCREENING_FIXTURE.id]
        ?.staffAssigneeRefs
    ).toEqual(WEEKLY_PSYCH_SCREENING_FIXTURE.staffAssigneeRefs)
    expect(
      loaded.containedPersonTherapeuticCareRecords?.[MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]
        ?.staffAssigneeRefs
    ).toEqual(MISSED_STREAK_ELEVATED_RISK_FIXTURE.staffAssigneeRefs)
  })

  it('hydrates persisted contained-person therapeutic care records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        containedPersonTherapeuticCareRecords: {
          [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
          invalid: {
            id: 'care-schedule:invalid',
            label: 'SCP division psych screening',
            subjectRef: 'subject:test',
            careMode: 'psych_screening',
            cadence: 'weekly',
            channelState: 'active',
            missedSessionStreak: 0,
          },
        },
      },
      fallback
    )

    expect(hydrated.containedPersonTherapeuticCareRecords).toEqual({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    })
  })
})
