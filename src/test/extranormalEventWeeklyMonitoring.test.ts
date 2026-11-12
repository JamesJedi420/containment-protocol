import { describe, expect, it } from 'vitest'
import {
  BRIEF_COVER_UP_EVENT_FIXTURE,
  type ExtranormalEventRecord,
} from '../domain/extranormalEventRegistry'
import {
  advanceExtranormalEventRecordMonitoringForWeek,
  applyWeeklyExtranormalEventMonitoringTick,
} from '../domain/extranormalEventWeeklyMonitoring'

function monitorOnlyRecord(overrides: Partial<ExtranormalEventRecord> = {}): ExtranormalEventRecord {
  return {
    id: 'event:monitor-only-test',
    label: 'Monitor-only test event',
    occurrenceWindow: { startWeek: 4 },
    effectDomainTags: ['spatial'],
    affectedAreaGeometry: 'room',
    populationSelectors: [{ kind: 'location', value: 'test-room' }],
    coverStoryCode: 'cover-test',
    witnessPlan: 'witness-test',
    monitoringUntilWeek: 10,
    closureState: 'monitor_only',
    ...overrides,
  }
}

describe('extranormalEventWeeklyMonitoring (SPE-2105 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyExtranormalEventMonitoringTick({}, 12)).toEqual({})
    expect(applyWeeklyExtranormalEventMonitoringTick(undefined, 12)).toEqual({})
  })

  it('leaves monitoringUntilWeek unchanged while week is before the until-week', () => {
    const record = BRIEF_COVER_UP_EVENT_FIXTURE
    const advanced = advanceExtranormalEventRecordMonitoringForWeek(record, 37)

    expect(advanced).toBe(record)
    expect(advanced.monitoringUntilWeek).toBe(38)
    expect(advanced.closureState).toBe('sourceless_closed')
  })

  it('clears monitoringUntilWeek when week reaches the until-week', () => {
    const record = BRIEF_COVER_UP_EVENT_FIXTURE
    const advanced = advanceExtranormalEventRecordMonitoringForWeek(record, 38)

    expect(advanced).not.toBe(record)
    expect(advanced.monitoringUntilWeek).toBeUndefined()
    expect(advanced.closureState).toBe('sourceless_closed')
    expect(advanced.resolved).toBe(true)
    expect(advanced.coverStoryCode).toBe(record.coverStoryCode)
  })

  it('advances monitor_only to sourceless_closed when monitoring expires', () => {
    const record = monitorOnlyRecord()
    const advanced = advanceExtranormalEventRecordMonitoringForWeek(record, 10)

    expect(advanced.closureState).toBe('sourceless_closed')
    expect(advanced.monitoringUntilWeek).toBeUndefined()
  })

  it('is idempotent when re-applied after monitoring has expired', () => {
    const record = BRIEF_COVER_UP_EVENT_FIXTURE
    const once = advanceExtranormalEventRecordMonitoringForWeek(record, 40)
    const twice = advanceExtranormalEventRecordMonitoringForWeek(once, 40)

    expect(twice).toBe(once)
  })

  it('applies tick in stable id order without mutating unrelated records', () => {
    const monitorRecord = monitorOnlyRecord({ monitoringUntilWeek: 5 })
    const briefRecord = BRIEF_COVER_UP_EVENT_FIXTURE
    const map = {
      [briefRecord.id]: briefRecord,
      [monitorRecord.id]: monitorRecord,
    }

    const next = applyWeeklyExtranormalEventMonitoringTick(map, 6)

    expect(next[briefRecord.id]).toBe(briefRecord)
    expect(next[monitorRecord.id]?.closureState).toBe('sourceless_closed')
    expect(next[monitorRecord.id]?.monitoringUntilWeek).toBeUndefined()
  })
})
