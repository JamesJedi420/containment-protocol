import { describe, expect, it } from 'vitest'
import {
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
  type SelfCensoringInformationRecord,
} from '../domain/selfCensoringInformationRegistry'
import {
  advanceSelfCensoringInformationRecordForWeek,
  applyWeeklySelfCensoringInformationTick,
  resolveSelfCensoringRediscoveryAlarmDueWeek,
} from '../domain/selfCensoringInformationWeeklyRetention'

function retentionRecord(
  overrides: Partial<SelfCensoringInformationRecord> = {}
): SelfCensoringInformationRecord {
  return {
    id: 'info:retention-timer-test',
    label: 'Retention timer test record',
    retentionDecayTimer: 4,
    ...overrides,
  }
}

function rediscoveryRecord(
  overrides: Partial<SelfCensoringInformationRecord> = {}
): SelfCensoringInformationRecord {
  return {
    id: 'info:rediscovery-loop-test',
    label: 'Rediscovery loop test record',
    rediscoveryLoop: {
      loopCount: 2,
      lastAlarmWeek: 10,
      forgottenWarningRefs: ['warning:gap-8', 'warning:gap-9'],
    },
    ...overrides,
  }
}

describe('selfCensoringInformationWeeklyRetention (SPE-2108 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklySelfCensoringInformationTick({}, 12)).toEqual({})
    expect(applyWeeklySelfCensoringInformationTick(undefined, 12)).toEqual({})
  })

  it('resolves rediscovery alarm due week from lastAlarmWeek', () => {
    expect(resolveSelfCensoringRediscoveryAlarmDueWeek(rediscoveryRecord())).toBe(10)
    expect(resolveSelfCensoringRediscoveryAlarmDueWeek(REDISCOVERY_LOOP_RECORD_FIXTURE)).toBe(41)
    expect(
      resolveSelfCensoringRediscoveryAlarmDueWeek(
        rediscoveryRecord({ rediscoveryLoop: { loopCount: 1 } })
      )
    ).toBeUndefined()
  })

  it('decrements retentionDecayTimer each week until expiry', () => {
    const record = retentionRecord({ retentionDecayTimer: 3 })
    const weekTwo = advanceSelfCensoringInformationRecordForWeek(record, 2)

    expect(weekTwo).not.toBe(record)
    expect(weekTwo.retentionDecayTimer).toBe(2)

    const weekThree = advanceSelfCensoringInformationRecordForWeek(weekTwo, 3)
    expect(weekThree.retentionDecayTimer).toBe(1)

    const expired = advanceSelfCensoringInformationRecordForWeek(weekThree, 4)
    expect(expired.retentionDecayTimer).toBeUndefined()
  })

  it('leaves retentionDecayTimer unchanged when already absent', () => {
    const record = STUDY_BLOCKED_ARCHIVE_FIXTURE
    const advanced = advanceSelfCensoringInformationRecordForWeek(record, 5)

    expect(advanced).toBe(record)
  })

  it('leaves rediscoveryLoop unchanged while week is before the due week', () => {
    const record = rediscoveryRecord()
    const advanced = advanceSelfCensoringInformationRecordForWeek(record, 9)

    expect(advanced).toBe(record)
    expect(advanced.rediscoveryLoop).toEqual(record.rediscoveryLoop)
  })

  it('advances rediscoveryLoop when week reaches the due week', () => {
    const record = rediscoveryRecord()
    const advanced = advanceSelfCensoringInformationRecordForWeek(record, 10)

    expect(advanced).not.toBe(record)
    expect(advanced.rediscoveryLoop).toEqual({
      loopCount: 1,
      forgottenWarningRefs: ['warning:gap-8', 'warning:gap-9'],
    })
    expect(advanced.rediscoveryLoop?.lastAlarmWeek).toBeUndefined()
  })

  it('clears alarm refs when rediscovery loop completes', () => {
    const record = rediscoveryRecord({
      rediscoveryLoop: {
        loopCount: 1,
        lastAlarmWeek: 12,
        forgottenWarningRefs: ['warning:final-gap'],
      },
    })
    const advanced = advanceSelfCensoringInformationRecordForWeek(record, 12)

    expect(advanced.rediscoveryLoop).toEqual({ loopCount: 0 })
  })

  it('is idempotent when re-applied after retention expiry for the same week', () => {
    const record = retentionRecord({ retentionDecayTimer: 1 })
    const once = advanceSelfCensoringInformationRecordForWeek(record, 5)
    const twice = advanceSelfCensoringInformationRecordForWeek(once, 5)

    expect(twice).toBe(once)
    expect(twice.retentionDecayTimer).toBeUndefined()
  })

  it('is idempotent when re-applied after rediscovery advance for the same week', () => {
    const record = rediscoveryRecord()
    const once = advanceSelfCensoringInformationRecordForWeek(record, 10)
    const twice = advanceSelfCensoringInformationRecordForWeek(once, 10)

    expect(twice).toBe(once)
  })

  it('does not mutate invalid post-tick records', () => {
    const record = {
      id: 'info:invalid-loop',
      label: 'Invalid loop record',
      rediscoveryLoop: {
        loopCount: 0,
        lastAlarmWeek: 5,
        forgottenWarningRefs: ['warning:stale'],
      },
    } as SelfCensoringInformationRecord

    const advanced = advanceSelfCensoringInformationRecordForWeek(record, 6)

    expect(advanced).toBe(record)
  })

  it('applies tick in stable id order without mutating unrelated records', () => {
    const retention = retentionRecord({ retentionDecayTimer: 1 })
    const rediscovery = rediscoveryRecord()
    const studyBlocked = STUDY_BLOCKED_ARCHIVE_FIXTURE
    const map = {
      [studyBlocked.id]: studyBlocked,
      [retention.id]: retention,
      [rediscovery.id]: rediscovery,
    }

    const next = applyWeeklySelfCensoringInformationTick(map, 10)

    expect(next[studyBlocked.id]).toBe(studyBlocked)
    expect(next[retention.id]?.retentionDecayTimer).toBeUndefined()
    expect(next[rediscovery.id]?.rediscoveryLoop).toEqual({
      loopCount: 1,
      forgottenWarningRefs: ['warning:gap-8', 'warning:gap-9'],
    })
  })

  it('applies both retention decay and rediscovery advance on the same record', () => {
    const record = {
      ...REDISCOVERY_LOOP_RECORD_FIXTURE,
      retentionDecayTimer: 2,
    }
    const advanced = advanceSelfCensoringInformationRecordForWeek(record, 41)

    expect(advanced.retentionDecayTimer).toBe(1)
    expect(advanced.rediscoveryLoop).toEqual({
      loopCount: 1,
      forgottenWarningRefs: ['warning:wing-c-roster-gap-38', 'warning:wing-c-roster-gap-40'],
    })
    expect(advanced.label).toBe(record.label)
    expect(advanced.negativeFacts).toEqual(record.negativeFacts)
  })
})
