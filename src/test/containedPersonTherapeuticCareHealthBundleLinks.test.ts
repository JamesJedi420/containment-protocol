import { describe, expect, it } from 'vitest'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
  type TherapeuticCareScheduleRecord,
} from '../domain/containedPersonTherapeuticCareRegistry'
import {
  THERAPEUTIC_CARE_WIRED_REF_PREFIX,
  deriveTherapeuticCareBundleFragmentsFromRecords,
} from '../domain/containedPersonTherapeuticCareHealthBundleLinks'

function baseRecord(
  overrides: Partial<TherapeuticCareScheduleRecord> = {}
): TherapeuticCareScheduleRecord {
  return {
    id: 'care-schedule:test-base',
    label: 'Test base record',
    subjectRef: 'subject:test-base',
    careMode: 'cooperative_checkin',
    cadence: 'weekly',
    channelState: 'active',
    missedSessionStreak: 0,
    ...overrides,
  }
}

describe('containedPersonTherapeuticCareHealthBundleLinks (SPE-1889 slice 5)', () => {
  it('returns an empty frozen array for an empty map without throw', () => {
    expect(deriveTherapeuticCareBundleFragmentsFromRecords({})).toEqual([])
    expect(deriveTherapeuticCareBundleFragmentsFromRecords(null)).toEqual([])
    expect(deriveTherapeuticCareBundleFragmentsFromRecords(undefined)).toEqual([])
  })

  it('groups care records by subjectRef in deterministic subject order', () => {
    const sharedSubject = 'subject:cooperative-field-asset-17'
    const secondRecord = baseRecord({
      id: 'care-schedule:second-checkin',
      label: 'Second check-in schedule',
      subjectRef: sharedSubject,
      careMode: 'cooperative_checkin',
    })

    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [secondRecord.id]: secondRecord,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    })

    expect(fragments).toHaveLength(2)
    expect(fragments.map((fragment) => fragment.subjectRef)).toEqual([
      sharedSubject,
      MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef,
    ])
    expect(fragments[0]?.therapeuticCareScheduleLinks).toHaveLength(2)
    expect(fragments[0]?.therapeuticCareScheduleLinks.map((link) => link.scheduleRef)).toEqual([
      WEEKLY_PSYCH_SCREENING_FIXTURE.id,
      secondRecord.id,
    ])
  })

  it('uses therapeutic-care wired ref prefix on derived links', () => {
    const [fragment] = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    })

    expect(fragment?.therapeuticCareScheduleLinks[0]?.wiredRef).toBe(
      `${THERAPEUTIC_CARE_WIRED_REF_PREFIX}${WEEKLY_PSYCH_SCREENING_FIXTURE.id}`
    )
  })

  it('derives critical mental state band when lockdown escalation is likely', () => {
    const [fragment] = deriveTherapeuticCareBundleFragmentsFromRecords({
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    })

    expect(fragment?.mentalStateBand).toBe('critical')
    expect(fragment?.humaneCareRiskScore).not.toBeNull()
    expect(fragment?.therapeuticCareScheduleLinks[0]?.lockdownEscalationLikely).toBe(true)
  })

  it('includes warning-only care records in derived fragments', () => {
    const warningOnly = baseRecord({
      id: 'care-schedule:warning-only-suspended',
      label: 'Warning-only suspended channel',
      channelState: 'suspended',
    })

    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [warningOnly.id]: warningOnly,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.therapeuticCareScheduleLinks).toHaveLength(1)
    expect(fragments[0]?.therapeuticCareScheduleLinks[0]?.channelState).toBe('suspended')
  })

  it('does not re-surface invalid care records from the persisted map', () => {
    const invalidRecord = {
      ...WEEKLY_PSYCH_SCREENING_FIXTURE,
      id: 'care-schedule:invalid-empty-label',
      label: '',
    }

    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [invalidRecord.id]: invalidRecord,
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.subjectRef).toBe(WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef)
    expect(fragments[0]?.therapeuticCareScheduleLinks).toHaveLength(1)
  })

  it('returns byte-stable results on repeated calls', () => {
    const records = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    }
    const first = deriveTherapeuticCareBundleFragmentsFromRecords(records)
    const second = deriveTherapeuticCareBundleFragmentsFromRecords(records)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
