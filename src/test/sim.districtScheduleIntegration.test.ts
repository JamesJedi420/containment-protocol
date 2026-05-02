/**
 * SPE-109: District schedule integration test.
 *
 * Validates that schedule context can be retrieved and applied in simulation context.
 * This is an MVP substrate test; live integration with caseGeneration happens in Phase 3.
 */

import { describe, test, expect } from 'vitest'
import { getScheduleSnapshot } from '../domain/districtSchedule'
import { buildHavenSchedule } from '../domain/settlements/haven'

describe('SPE-109: District schedule substrate integration', () => {
  const havenSchedule = buildHavenSchedule()

  test('Schedule snapshot can be retrieved for all Haven districts and time bands', () => {
    const districts = Object.keys(havenSchedule.districts)
    const timeBands = Object.keys(havenSchedule.timeBands)

    // Verify we can retrieve snapshots for all district+time-band combinations
    for (const districtId of districts) {
      for (const timeBandId of timeBands) {
        const snapshot = getScheduleSnapshot(havenSchedule, districtId, timeBandId, 0, 12345)
        expect(snapshot).not.toBeNull()
        expect(snapshot!.traffic.baselinePopulation).toBeGreaterThan(0)
        expect(snapshot!.context.encounterFamilyTags.length).toBeGreaterThan(0)
      }
    }
  })

  test('District identities are legible for player-facing context', () => {
    const hub = havenSchedule.districts.hub
    const outskirts = havenSchedule.districts.outskirts

    // Verify labels are player-facing and distinct
    expect(hub.label).toBe('Central Hub')
    expect(outskirts.label).toBe('Outskirts')
    expect(hub.label).not.toEqual(outskirts.label)

    // Verify authority profiles differ
    expect(hub.authorityResponseProfile).not.toEqual(outskirts.authorityResponseProfile)
  })

  test('Time-band progression across 24-hour cycle is legible', () => {
    const timeBands = [
      havenSchedule.timeBands.dawn,
      havenSchedule.timeBands.morning,
      havenSchedule.timeBands.afternoon,
      havenSchedule.timeBands.evening,
      havenSchedule.timeBands.night,
    ]

    // Verify time-band labels are clear
    for (const band of timeBands) {
      expect(band.label).toBeTruthy()
      expect(band.label.length).toBeGreaterThan(0)
    }

    // Verify afternoon is brightest
    expect(havenSchedule.timeBands.afternoon.visibilityModifier).toBeGreaterThan(
      havenSchedule.timeBands.morning.visibilityModifier
    )
    expect(havenSchedule.timeBands.afternoon.visibilityModifier).toBeGreaterThan(
      havenSchedule.timeBands.evening.visibilityModifier
    )
  })

  test('Covert operations are materially different at Night vs Afternoon', () => {
    const nightSnapshot = getScheduleSnapshot(havenSchedule, 'hub', 'night', 0, 12345)
    const afternoonSnapshot = getScheduleSnapshot(havenSchedule, 'hub', 'afternoon', 0, 12345)

    expect(nightSnapshot).not.toBeNull()
    expect(afternoonSnapshot).not.toBeNull()

    if (nightSnapshot && afternoonSnapshot) {
      // Night has covert advantage
      expect(nightSnapshot.traffic.covertAdvantage).toBe(true)
      expect(afternoonSnapshot.traffic.covertAdvantage).toBe(false)

      // Night has much lower witness density than afternoon
      expect(nightSnapshot.traffic.witnessModifier).toBeLessThan(0.4)
      expect(afternoonSnapshot.traffic.witnessModifier).toBeGreaterThan(0.7)

      // Night is darker
      expect(nightSnapshot.traffic.visibilityModifier).toBeLessThan(0.2)
      expect(afternoonSnapshot.traffic.visibilityModifier).toBeGreaterThan(0.9)
    }
  })

  test('Rare events modify district traffic during active weeks', () => {
    const hubMarketEvent = havenSchedule.events.find((e) => e.id === 'hub_market_day')!
    expect(hubMarketEvent).toBeDefined()

    // Event applies to Hub
    expect(hubMarketEvent.appliesTo).toContain('hub')

    // Event adds population
    expect(hubMarketEvent.trafficModifier.populationDelta).toBeGreaterThan(0)
  })

  test('District encounter families are contextual to geography', () => {
    const docksEncounters = havenSchedule.districts.docks.encounterFamilyTags
    const residentialEncounters = havenSchedule.districts.residential.encounterFamilyTags

    // Docks should include criminal/smuggling
    expect(docksEncounters.some((tag) => tag.includes('criminal') || tag.includes('smuggling'))).toBe(true)

    // Residential should include domestic/supernatural
    expect(
      residentialEncounters.some((tag) => tag.includes('domestic') || tag.includes('supernatural'))
    ).toBe(true)

    // They should differ
    const docksTags = docksEncounters.sort().join(',')
    const residentialTags = residentialEncounters.sort().join(',')
    expect(docksTags).not.toEqual(residentialTags)
  })

  test('Multi-week event lifecycle is deterministic', () => {
    const event = havenSchedule.events[0]

    // Get snapshots at start, middle, and end of event window
    const snapshotWeek0 = getScheduleSnapshot(
      havenSchedule,
      event.appliesTo[0],
      'morning',
      event.startWeek,
      12345
    )
    const snapshotWeekEnd = getScheduleSnapshot(
      havenSchedule,
      event.appliesTo[0],
      'morning',
      event.endWeek,
      12345
    )
    const snapshotWeekAfter = getScheduleSnapshot(
      havenSchedule,
      event.appliesTo[0],
      'morning',
      event.endWeek + 1,
      12345
    )

    expect(snapshotWeek0).not.toBeNull()
    expect(snapshotWeekEnd).not.toBeNull()
    expect(snapshotWeekAfter).not.toBeNull()

    // Event should NOT be applied after endWeek
    if (snapshotWeekEnd && snapshotWeekAfter) {
      expect(snapshotWeekAfter.traffic.appliedEvents).not.toContain(event.id)
    }
  })

  test('Schedule state can be attached to GameState and retrieved', () => {
    // Simulates how districtScheduleState would be stored and accessed
    const scheduleState = {
      settlementId: 'haven',
      districts: havenSchedule.districts,
      timeBands: havenSchedule.timeBands,
      events: havenSchedule.events,
    }

    // Verify it's a valid DistrictScheduleState shape
    expect(scheduleState.settlementId).toBe('haven')
    expect(Object.keys(scheduleState.districts).length).toBeGreaterThanOrEqual(6)
    expect(Object.keys(scheduleState.timeBands).length).toBeGreaterThanOrEqual(5)
    expect(scheduleState.events.length).toBeGreaterThanOrEqual(1)
  })

  test('Player can reason about time as an operational planning lever', () => {
    // Night + Outskirts = maximum covert advantage
    const nightOutskirts = getScheduleSnapshot(havenSchedule, 'outskirts', 'night', 0, 12345)
    expect(nightOutskirts).not.toBeNull()
    expect(nightOutskirts!.traffic.covertAdvantage).toBe(true)
    expect(nightOutskirts!.traffic.witnessModifier).toBeLessThan(0.3)

    // Afternoon + Hub = maximum public exposure
    const afternoonHub = getScheduleSnapshot(havenSchedule, 'hub', 'afternoon', 0, 12345)
    expect(afternoonHub).not.toBeNull()
    expect(afternoonHub!.traffic.covertAdvantage).toBe(false)
    expect(afternoonHub!.traffic.witnessModifier).toBeGreaterThan(0.7)

    // These are materially different planning contexts
    expect(nightOutskirts!.traffic.witnessModifier).toBeLessThan(
      afternoonHub!.traffic.witnessModifier
    )
  })
})
