import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  LIFECYCLE_CHAIN_LOCATION_FIXTURE,
  REMOTE_MONITOR_SITE_FIXTURE,
  type UnexplainedLocationRecord,
} from '../domain/unexplainedLocationRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function activeSiteRecord(overrides: Partial<UnexplainedLocationRecord> = {}): UnexplainedLocationRecord {
  return {
    id: 'location:advance-week-active',
    label: 'Advance week active site',
    effectGeometry: 'building',
    effectDomainTags: ['spatial'],
    populationSelectors: [{ kind: 'location', value: 'advance-week-building' }],
    discoveryWeek: 8,
    monitoringCadenceWeeks: 4,
    lifecycleState: 'active',
    latentSeverityScore: 20,
    ...overrides,
  }
}

describe('advanceWeek unexplained location lifecycle integration (SPE-2106 slice 3)', () => {
  it('is a no-op for an empty unexplained location map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.unexplainedLocationRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.unexplainedLocationRecords).toEqual({})
  })

  it('retains active lifecycle before the monitoring due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 10
    const record = activeSiteRecord()
    state.unexplainedLocationRecords = { [record.id]: record }

    const nextState = advanceWeek(state)
    const location = nextState.unexplainedLocationRecords?.[record.id]

    expect(nextState.week).toBe(11)
    expect(location?.lifecycleState).toBe('active')
    expect(location?.statusHistory).toBeUndefined()
  })

  it('advances active to monitor_only when advanceWeek reaches the due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 11
    const record = activeSiteRecord()
    state.unexplainedLocationRecords = { [record.id]: record }

    const nextState = advanceWeek(state)
    const location = nextState.unexplainedLocationRecords?.[record.id]

    expect(nextState.week).toBe(12)
    expect(location?.lifecycleState).toBe('monitor_only')
    expect(location?.statusHistory?.[0]).toEqual(
      expect.objectContaining({
        fromState: 'active',
        toState: 'monitor_only',
        week: 12,
      })
    )
  })

  it('advances monitor_only to archived when advanceWeek reaches remote monitor due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 13
    state.unexplainedLocationRecords = {
      [REMOTE_MONITOR_SITE_FIXTURE.id]: REMOTE_MONITOR_SITE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const location = nextState.unexplainedLocationRecords?.[REMOTE_MONITOR_SITE_FIXTURE.id]

    expect(nextState.week).toBe(14)
    expect(location?.lifecycleState).toBe('archived')
    expect(location?.coverStoryCode).toBe(REMOTE_MONITOR_SITE_FIXTURE.coverStoryCode)
    expect(location?.mapLayerPolicy).toBe(REMOTE_MONITOR_SITE_FIXTURE.mapLayerPolicy)
  })

  it('preserves terminal fixture fields byte-stable through advanceWeek before cadence due', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 12
    state.unexplainedLocationRecords = {
      [LIFECYCLE_CHAIN_LOCATION_FIXTURE.id]: LIFECYCLE_CHAIN_LOCATION_FIXTURE,
      [REMOTE_MONITOR_SITE_FIXTURE.id]: REMOTE_MONITOR_SITE_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.unexplainedLocationRecords?.[LIFECYCLE_CHAIN_LOCATION_FIXTURE.id]).toEqual(
      LIFECYCLE_CHAIN_LOCATION_FIXTURE
    )
    expect(nextState.unexplainedLocationRecords?.[REMOTE_MONITOR_SITE_FIXTURE.id]).toEqual(
      REMOTE_MONITOR_SITE_FIXTURE
    )
  })
})
