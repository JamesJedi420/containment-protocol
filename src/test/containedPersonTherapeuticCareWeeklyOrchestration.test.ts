import { describe, expect, it } from 'vitest'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
  type TherapeuticCareScheduleRecord,
} from '../domain/containedPersonTherapeuticCareRegistry'
import {
  advanceTherapeuticCareScheduleRecordForWeek,
  applyWeeklyTherapeuticCareTick,
  countDueCareSessionsThroughWeek,
  isCareSessionDueWeek,
  resolveChannelStateForMissedSessionStreak,
} from '../domain/containedPersonTherapeuticCareWeeklyOrchestration'

function baseRecord(
  overrides: Partial<TherapeuticCareScheduleRecord> = {}
): TherapeuticCareScheduleRecord {
  return {
    id: 'care-schedule:weekly-orchestration-test',
    label: 'Weekly orchestration test record',
    subjectRef: 'subject:weekly-orchestration-test',
    careMode: 'cooperative_checkin',
    cadence: 'weekly',
    channelState: 'active',
    missedSessionStreak: 0,
    ...overrides,
  }
}

describe('containedPersonTherapeuticCareWeeklyOrchestration (SPE-2115 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyTherapeuticCareTick({}, 12)).toEqual({})
    expect(applyWeeklyTherapeuticCareTick(undefined, 12)).toEqual({})
  })

  it('resolves cadence due weeks and due-session counts', () => {
    expect(isCareSessionDueWeek(1, 'weekly')).toBe(true)
    expect(isCareSessionDueWeek(3, 'weekly')).toBe(true)
    expect(isCareSessionDueWeek(1, 'biweekly')).toBe(false)
    expect(isCareSessionDueWeek(2, 'biweekly')).toBe(true)
    expect(countDueCareSessionsThroughWeek(4, 'weekly')).toBe(4)
    expect(countDueCareSessionsThroughWeek(4, 'biweekly')).toBe(2)
  })

  it('resolves channel degradation from missed-session streak', () => {
    expect(resolveChannelStateForMissedSessionStreak('active', 1)).toBe('active')
    expect(resolveChannelStateForMissedSessionStreak('active', 2)).toBe('degraded')
    expect(resolveChannelStateForMissedSessionStreak('degraded', 3)).toBe('degraded')
    expect(resolveChannelStateForMissedSessionStreak('degraded', 4)).toBe('suspended')
    expect(resolveChannelStateForMissedSessionStreak('suspended', 10)).toBe('suspended')
  })

  it('increments missedSessionStreak on weekly cadence due weeks', () => {
    const record = baseRecord()
    const advanced = advanceTherapeuticCareScheduleRecordForWeek(record, 1)

    expect(advanced).not.toBe(record)
    expect(advanced.missedSessionStreak).toBe(1)
    expect(advanced.channelState).toBe('active')
  })

  it('leaves biweekly records unchanged on non-due weeks', () => {
    const record = baseRecord({ cadence: 'biweekly' })
    const advanced = advanceTherapeuticCareScheduleRecordForWeek(record, 1)

    expect(advanced).toBe(record)
  })

  it('increments streak and degrades channel when thresholds are crossed', () => {
    const record = baseRecord({ missedSessionStreak: 1 })
    const advanced = advanceTherapeuticCareScheduleRecordForWeek(record, 2)

    expect(advanced).not.toBe(record)
    expect(advanced.missedSessionStreak).toBe(2)
    expect(advanced.channelState).toBe('degraded')
  })

  it('is idempotent when re-applied after advance for the same week', () => {
    const record = baseRecord()
    const once = advanceTherapeuticCareScheduleRecordForWeek(record, 1)
    const twice = advanceTherapeuticCareScheduleRecordForWeek(once, 1)

    expect(twice).toBe(once)
    expect(twice.missedSessionStreak).toBe(1)
  })

  it('preserves elevated-risk fixture without mutation when streak is already synced', () => {
    const advanced = advanceTherapeuticCareScheduleRecordForWeek(
      MISSED_STREAK_ELEVATED_RISK_FIXTURE,
      6
    )

    expect(advanced).toBe(MISSED_STREAK_ELEVATED_RISK_FIXTURE)
    expect(advanced.containmentDependency).toBe(true)
    expect(advanced.channelState).toBe('degraded')
  })

  it('preserves suspended records without mutation', () => {
    const record = baseRecord({
      channelState: 'suspended',
      missedSessionStreak: 5,
      suspensionCauseRef: 'cause:mediator-unavailable',
    })

    const advanced = advanceTherapeuticCareScheduleRecordForWeek(record, 10)

    expect(advanced).toBe(record)
  })

  it('does not mutate invalid post-tick records', () => {
    const record = baseRecord({
      missedSessionStreak: 1,
      staffAssigneeRefs: [''],
    })

    const advanced = advanceTherapeuticCareScheduleRecordForWeek(record, 2)

    expect(advanced).toBe(record)
  })

  it('preserves warning-only validation records after tick', () => {
    const warningOnly = {
      ...WEEKLY_PSYCH_SCREENING_FIXTURE,
      channelState: 'suspended' as const,
      suspensionCauseRef: undefined,
    }

    const advanced = advanceTherapeuticCareScheduleRecordForWeek(warningOnly, 4)

    expect(advanced).toBe(warningOnly)
  })

  it('applies tick in stable id order without mutating unchanged records', () => {
    const weekly = baseRecord({ id: 'care-schedule:weekly-active' })
    const terminal = MISSED_STREAK_ELEVATED_RISK_FIXTURE
    const map = {
      [terminal.id]: terminal,
      [weekly.id]: weekly,
    }

    const next = applyWeeklyTherapeuticCareTick(map, 6)

    expect(next[weekly.id]?.missedSessionStreak).toBe(1)
    expect(next[terminal.id]).toBe(terminal)
  })
})
