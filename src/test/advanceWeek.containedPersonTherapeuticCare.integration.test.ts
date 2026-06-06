import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
  type TherapeuticCareScheduleRecord,
} from '../domain/containedPersonTherapeuticCareRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyTherapeuticCareTick } from '../domain/containedPersonTherapeuticCareWeeklyOrchestration'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function weeklyActiveRecord(): TherapeuticCareScheduleRecord {
  return {
    id: 'care-schedule:advance-week-weekly-active',
    label: 'Advance week weekly active care record',
    subjectRef: 'subject:advance-week-weekly-active',
    careMode: 'psych_screening',
    cadence: 'weekly',
    channelState: 'active',
    missedSessionStreak: 0,
    staffAssigneeRefs: ['staff:psych-mediator-1'],
  }
}

describe('advanceWeek contained-person therapeutic care integration (SPE-2115 slice 3)', () => {
  it('is a no-op for an empty therapeutic care map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonTherapeuticCareRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.containedPersonTherapeuticCareRecords).toEqual({})
  })

  it('increments missedSessionStreak after advanceWeek on weekly cadence', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    const record = weeklyActiveRecord()
    state.containedPersonTherapeuticCareRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.containedPersonTherapeuticCareRecords?.[record.id]

    expect(nextState.week).toBe(5)
    expect(nextRecord?.missedSessionStreak).toBe(1)
    expect(nextRecord?.channelState).toBe('active')
    expect(nextRecord?.staffAssigneeRefs).toEqual(record.staffAssigneeRefs)
  })

  it('degrades channel when streak threshold is crossed after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 1
    const record = weeklyActiveRecord()
    record.missedSessionStreak = 1
    state.containedPersonTherapeuticCareRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.containedPersonTherapeuticCareRecords?.[record.id]

    expect(nextState.week).toBe(2)
    expect(nextRecord?.missedSessionStreak).toBe(2)
    expect(nextRecord?.channelState).toBe('degraded')
  })

  it('leaves biweekly records unchanged on non-due weeks after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    const record = {
      ...weeklyActiveRecord(),
      id: 'care-schedule:advance-week-biweekly',
      cadence: 'biweekly' as const,
    }
    state.containedPersonTherapeuticCareRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.containedPersonTherapeuticCareRecords?.[record.id]

    expect(nextState.week).toBe(3)
    expect(nextRecord?.missedSessionStreak).toBe(0)
    expect(nextRecord).toBe(record)
  })

  it('preserves synced elevated-risk fixtures without mutation after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 5
    state.containedPersonTherapeuticCareRecords = {
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(
      nextState.containedPersonTherapeuticCareRecords?.[MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]
    ).toBe(MISSED_STREAK_ELEVATED_RISK_FIXTURE)
    expect(nextState.containedPersonTherapeuticCareRecords?.[WEEKLY_PSYCH_SCREENING_FIXTURE.id]).toEqual(
      expect.objectContaining({
        missedSessionStreak: 1,
      })
    )
  })

  it('is idempotent when therapeutic care tick is re-applied at the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    const record = weeklyActiveRecord()
    state.containedPersonTherapeuticCareRecords = {
      [record.id]: record,
    }

    const once = advanceWeek(state)
    const recordsAfterAdvance = once.containedPersonTherapeuticCareRecords ?? {}
    const reticked = applyWeeklyTherapeuticCareTick(recordsAfterAdvance, once.week)

    expect(reticked).toBe(recordsAfterAdvance)
    expect(reticked[record.id]).toEqual(once.containedPersonTherapeuticCareRecords?.[record.id])
  })
})
