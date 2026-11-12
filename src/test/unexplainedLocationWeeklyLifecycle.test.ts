import { describe, expect, it } from 'vitest'
import {
  LIFECYCLE_CHAIN_LOCATION_FIXTURE,
  REMOTE_MONITOR_SITE_FIXTURE,
  type UnexplainedLocationRecord,
} from '../domain/unexplainedLocationRegistry'
import {
  advanceUnexplainedLocationRecordLifecycleForWeek,
  applyWeeklyUnexplainedLocationLifecycleTick,
  resolveUnexplainedLocationMonitoringDueWeek,
} from '../domain/unexplainedLocationWeeklyLifecycle'

function activeSiteRecord(overrides: Partial<UnexplainedLocationRecord> = {}): UnexplainedLocationRecord {
  return {
    id: 'location:active-cadence-test',
    label: 'Active cadence test site',
    effectGeometry: 'building',
    effectDomainTags: ['spatial'],
    populationSelectors: [{ kind: 'location', value: 'test-building' }],
    discoveryWeek: 8,
    monitoringCadenceWeeks: 4,
    lifecycleState: 'active',
    latentSeverityScore: 20,
    ...overrides,
  }
}

describe('unexplainedLocationWeeklyLifecycle (SPE-2106 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyUnexplainedLocationLifecycleTick({}, 12)).toEqual({})
    expect(applyWeeklyUnexplainedLocationLifecycleTick(undefined, 12)).toEqual({})
  })

  it('resolves monitoring due week from anchor plus cadence', () => {
    expect(resolveUnexplainedLocationMonitoringDueWeek(REMOTE_MONITOR_SITE_FIXTURE)).toBe(14)
    expect(resolveUnexplainedLocationMonitoringDueWeek(activeSiteRecord())).toBe(12)
  })

  it('leaves lifecycle unchanged while week is before the due week', () => {
    const record = activeSiteRecord()
    const advanced = advanceUnexplainedLocationRecordLifecycleForWeek(record, 11)

    expect(advanced).toBe(record)
    expect(advanced.lifecycleState).toBe('active')
    expect(advanced.statusHistory).toBeUndefined()
  })

  it('advances active to monitor_only when week reaches the due week', () => {
    const record = activeSiteRecord()
    const advanced = advanceUnexplainedLocationRecordLifecycleForWeek(record, 12)

    expect(advanced).not.toBe(record)
    expect(advanced.lifecycleState).toBe('monitor_only')
    expect(advanced.statusHistory).toEqual([
      expect.objectContaining({
        fromState: 'active',
        toState: 'monitor_only',
        week: 12,
      }),
    ])
  })

  it('advances monitor_only to archived when monitoring cadence expires', () => {
    const record = REMOTE_MONITOR_SITE_FIXTURE
    const advanced = advanceUnexplainedLocationRecordLifecycleForWeek(record, 14)

    expect(advanced).not.toBe(record)
    expect(advanced.lifecycleState).toBe('archived')
    expect(advanced.statusHistory).toEqual([
      expect.objectContaining({
        fromState: 'monitor_only',
        toState: 'archived',
        week: 14,
      }),
    ])
    expect(advanced.monitoringCadenceWeeks).toBe(record.monitoringCadenceWeeks)
    expect(advanced.locationTag).toBe(record.locationTag)
  })

  it('is idempotent when re-applied after lifecycle advance for the same week', () => {
    const record = activeSiteRecord()
    const once = advanceUnexplainedLocationRecordLifecycleForWeek(record, 12)
    const twice = advanceUnexplainedLocationRecordLifecycleForWeek(once, 12)

    expect(twice).toBe(once)
  })

  it('leaves neutralized records unchanged when due week is reached', () => {
    const record = activeSiteRecord({
      lifecycleState: 'neutralized',
      discoveryWeek: 1,
      monitoringCadenceWeeks: 1,
    })
    const advanced = advanceUnexplainedLocationRecordLifecycleForWeek(record, 5)

    expect(advanced).toBe(record)
    expect(advanced.lifecycleState).toBe('neutralized')
  })

  it('preserves terminal lifecycle chain fixture without mutation', () => {
    const advanced = advanceUnexplainedLocationRecordLifecycleForWeek(
      LIFECYCLE_CHAIN_LOCATION_FIXTURE,
      60
    )

    expect(advanced).toBe(LIFECYCLE_CHAIN_LOCATION_FIXTURE)
    expect(advanced.statusHistory).toEqual(LIFECYCLE_CHAIN_LOCATION_FIXTURE.statusHistory)
  })

  it('applies tick in stable id order without mutating unrelated records', () => {
    const activeRecord = activeSiteRecord()
    const remoteRecord = REMOTE_MONITOR_SITE_FIXTURE
    const map = {
      [remoteRecord.id]: remoteRecord,
      [activeRecord.id]: activeRecord,
    }

    const next = applyWeeklyUnexplainedLocationLifecycleTick(map, 12)

    expect(next[remoteRecord.id]).toBe(remoteRecord)
    expect(next[activeRecord.id]?.lifecycleState).toBe('monitor_only')
  })
})
