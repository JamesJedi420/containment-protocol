import { describe, expect, it } from 'vitest'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
  type PopulationEmergenceRecord,
} from '../domain/massAnomalousPopulationEmergenceRegistry'
import {
  advancePopulationEmergenceRecordForWeek,
  applyWeeklyPopulationEmergenceGovernanceTick,
  resolveNextRegistrationBacklogWeeks,
  resolvePopulationEmergenceGovernanceSurgeBandForWeek,
  resolvePopulationEmergenceGovernanceSurgeForWeek,
} from '../domain/massAnomalousPopulationEmergenceWeeklyGovernance'

function backlogRecord(
  overrides: Partial<PopulationEmergenceRecord> = {}
): PopulationEmergenceRecord {
  return {
    id: 'population-emergence:backlog-decay-test',
    label: 'Backlog decay test record',
    emergenceMagnitudeBand: 'regional',
    newlyAnomalousCountEstimate: 12_000,
    registrationBacklogWeeks: 4,
    governanceMode: 'managed_disclosure',
    triageLanes: ['lane:registration-intake'],
    publicEducationBurden: 0.35,
    ...overrides,
  }
}

describe('massAnomalousPopulationEmergenceWeeklyGovernance (SPE-2122 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyPopulationEmergenceGovernanceTick({}, 12)).toEqual({})
    expect(applyWeeklyPopulationEmergenceGovernanceTick(undefined, 12)).toEqual({})
  })

  it('resolves next registration backlog weeks with floor at zero', () => {
    expect(resolveNextRegistrationBacklogWeeks(4)).toBe(3)
    expect(resolveNextRegistrationBacklogWeeks(1)).toBe(0)
    expect(resolveNextRegistrationBacklogWeeks(0)).toBe(0)
  })

  it('decrements registrationBacklogWeeks each week until cleared', () => {
    const record = backlogRecord({ registrationBacklogWeeks: 3 })
    const weekTwo = advancePopulationEmergenceRecordForWeek(record, 2)

    expect(weekTwo).not.toBe(record)
    expect(weekTwo.registrationBacklogWeeks).toBe(2)

    const weekThree = advancePopulationEmergenceRecordForWeek(weekTwo, 3)
    expect(weekThree.registrationBacklogWeeks).toBe(1)

    const cleared = advancePopulationEmergenceRecordForWeek(weekThree, 4)
    expect(cleared.registrationBacklogWeeks).toBe(0)
  })

  it('leaves registrationBacklogWeeks unchanged when already zero', () => {
    const record = backlogRecord({ registrationBacklogWeeks: 0 })
    const advanced = advancePopulationEmergenceRecordForWeek(record, 5)

    expect(advanced).toBe(record)
    expect(advanced.registrationBacklogWeeks).toBe(0)
  })

  it('is idempotent when re-applied after backlog clears for the same week', () => {
    const record = backlogRecord({ registrationBacklogWeeks: 1 })
    const once = advancePopulationEmergenceRecordForWeek(record, 5)
    const twice = advancePopulationEmergenceRecordForWeek(once, 5)

    expect(twice).toBe(once)
    expect(twice.registrationBacklogWeeks).toBe(0)
  })

  it('does not mutate invalid post-tick records', () => {
    const record = {
      id: 'population-emergence:invalid-backlog',
      label: 'Invalid backlog record',
      emergenceMagnitudeBand: 'local',
      newlyAnomalousCountEstimate: 100,
      registrationBacklogWeeks: Number.NaN,
      governanceMode: 'managed_disclosure',
      triageLanes: ['lane:registration-intake'],
      publicEducationBurden: 0.2,
    } as PopulationEmergenceRecord

    const advanced = advancePopulationEmergenceRecordForWeek(record, 6)

    expect(advanced).toBe(record)
  })

  it('applies tick in stable id order without mutating zero-backlog records', () => {
    const active = backlogRecord({ id: 'population-emergence:active-backlog', registrationBacklogWeeks: 1 })
    const cleared = backlogRecord({ id: 'population-emergence:cleared-backlog', registrationBacklogWeeks: 0 })
    const map = {
      [cleared.id]: cleared,
      [active.id]: active,
    }

    const next = applyWeeklyPopulationEmergenceGovernanceTick(map, 10)

    expect(next[cleared.id]).toBe(cleared)
    expect(next[active.id]?.registrationBacklogWeeks).toBe(0)
  })

  it('preserves unrelated record fields when backlog decays', () => {
    const record = backlogRecord({
      registrationBacklogWeeks: 2,
      securitySurgeRefs: ['surge:regional-cell-1'],
      rightsReviewQueueRefs: ['queue:rights-alpha'],
      confidence: 0.81,
    })
    const advanced = advancePopulationEmergenceRecordForWeek(record, 8)

    expect(advanced.registrationBacklogWeeks).toBe(1)
    expect(advanced.triageLanes).toEqual(record.triageLanes)
    expect(advanced.securitySurgeRefs).toEqual(record.securitySurgeRefs)
    expect(advanced.rightsReviewQueueRefs).toEqual(record.rightsReviewQueueRefs)
    expect(advanced.publicEducationBurden).toBe(record.publicEducationBurden)
    expect(advanced.confidence).toBe(record.confidence)
  })

  it('reprojects governance surge band deterministically from currentWeek policy', () => {
    const record = backlogRecord({ registrationBacklogWeeks: 6 })
    const weekTen = resolvePopulationEmergenceGovernanceSurgeForWeek(record, 10)
    const weekTwenty = resolvePopulationEmergenceGovernanceSurgeForWeek(record, 20)

    expect(weekTen.governanceSurgeBand).not.toBeNull()
    expect(weekTwenty.governanceSurgeBand).not.toBeNull()
    expect(weekTwenty.projectedRegistrationPressure).not.toBeNull()
    expect(weekTwenty.projectedRegistrationPressure!).toBeGreaterThan(
      weekTen.projectedRegistrationPressure!
    )
    expect(resolvePopulationEmergenceGovernanceSurgeBandForWeek(record, 20)).toBe(
      weekTwenty.governanceSurgeBand
    )
  })

  it('does not mutate frozen fixtures when copied with zero backlog', () => {
    const managedCopy: PopulationEmergenceRecord = {
      ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      registrationBacklogWeeks: 0,
    }
    const collapsedCopy: PopulationEmergenceRecord = {
      ...COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
      registrationBacklogWeeks: 0,
    }

    const next = applyWeeklyPopulationEmergenceGovernanceTick(
      {
        [managedCopy.id]: managedCopy,
        [collapsedCopy.id]: collapsedCopy,
      },
      12
    )

    expect(next[managedCopy.id]).toBe(managedCopy)
    expect(next[collapsedCopy.id]).toBe(collapsedCopy)
  })
})
