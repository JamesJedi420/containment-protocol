/**
 * SPE-109: District schedule deterministic tests.
 *
 * Validates:
 * - Baseline traffic snapshot determinism
 * - Rare event overlay combination (additive, not replacement)
 * - Encounter context derivation
 * - Time-state shifts (Night confers covert advantage)
 * - Schedule explanation legibility
 */

import { describe, test, expect } from 'vitest'
import {
  buildBaselineTrafficSnapshot,
  applyRareEventOverlays,
  getDistrictEncounterContext,
  buildScheduleExplanation,
  getScheduleSnapshot,
} from '../domain/districtSchedule'
import { buildHavenSchedule } from '../domain/settlements/haven'

describe('SPE-109: District time-cadence encounter scheduling', () => {
  const havenSchedule = buildHavenSchedule()

  // ─────────────────────────────────────────────────────────────
  // Acceptance Criteria 1: Settlement has materially different traffic
  // ─────────────────────────────────────────────────────────────

  test('Haven districts have distinct encounter family tags', () => {
    expect(havenSchedule.districts.hub.encounterFamilyTags).toContain('cult_activity')
    expect(havenSchedule.districts.docks.encounterFamilyTags).toContain('criminal_network')
    expect(havenSchedule.districts.residential.encounterFamilyTags).toContain('domestic_violence')
    expect(havenSchedule.districts.outskirts.encounterFamilyTags).toContain('feral_pack')

    // Hub and Docks have different encounter families
    const hubFamilies = havenSchedule.districts.hub.encounterFamilyTags.sort().join(',')
    const docksFamilies = havenSchedule.districts.docks.encounterFamilyTags.sort().join(',')
    expect(hubFamilies).not.toEqual(docksFamilies)
  })

  test('Haven time bands have materially different baseline populations and visibility', () => {
    const night = havenSchedule.timeBands.night
    const afternoon = havenSchedule.timeBands.afternoon

    expect(afternoon.baselinePopulation).toBeGreaterThan(night.baselinePopulation)
    expect(afternoon.witnessModifier).toBeGreaterThan(night.witnessModifier)
    expect(afternoon.visibilityModifier).toBeGreaterThan(night.visibilityModifier)
  })

  test('Baseline traffic snapshot is deterministic', () => {
    const district = havenSchedule.districts.hub
    const timeBand = havenSchedule.timeBands.morning

    const snapshot1 = buildBaselineTrafficSnapshot('hub', 'morning', district, timeBand, 0, 12345)
    const snapshot2 = buildBaselineTrafficSnapshot('hub', 'morning', district, timeBand, 0, 12345)

    expect(snapshot1.baselinePopulation).toBe(snapshot2.baselinePopulation)
    expect(snapshot1.witnessModifier).toBe(snapshot2.witnessModifier)
    expect(snapshot1.visibilityModifier).toBe(snapshot2.visibilityModifier)
  })

  // ─────────────────────────────────────────────────────────────
  // Acceptance Criteria 2: Rare event overlay combines additively
  // ─────────────────────────────────────────────────────────────

  test('Rare event overlay combines with baseline (not replaces)', () => {
    const district = havenSchedule.districts.docks
    const timeBand = havenSchedule.timeBands.night
    const baseline = buildBaselineTrafficSnapshot('docks', 'night', district, timeBand, 0, 12345)

    const events = [havenSchedule.events.find((e) => e.id === 'docks_unloading')!]
    const withEvent = applyRareEventOverlays(baseline, events, 0, 'docks')

    // Event should ADD population, not replace
    expect(withEvent.baselinePopulation).toBeGreaterThan(baseline.baselinePopulation)
    expect(withEvent.appliedEvents).toContain('docks_unloading')
  })

  test('Multiple overlays stack their modifiers', () => {
    const district = havenSchedule.districts.hub
    const timeBand = havenSchedule.timeBands.morning
    const baseline = buildBaselineTrafficSnapshot('hub', 'morning', district, timeBand, 0, 12345)

    // Apply multiple events to hub
    const events = havenSchedule.events.filter((e) => e.appliesTo.includes('hub'))
    const withEvents = applyRareEventOverlays(baseline, events, 0, 'hub')

    // Each event's population delta should be applied
    expect(withEvents.baselinePopulation).toBeGreaterThan(baseline.baselinePopulation)
  })

  test('Event outside active week is not applied', () => {
    const district = havenSchedule.districts.hub
    const timeBand = havenSchedule.timeBands.morning
    const baseline = buildBaselineTrafficSnapshot('hub', 'morning', district, timeBand, 5000, 12345)

    // Modify event to be outside week 5000
    const futureEvent = {
      ...havenSchedule.events[0],
      startWeek: 0,
      endWeek: 100, // Event ends at week 100
    }
    const withEvent = applyRareEventOverlays(baseline, [futureEvent], 5000, 'hub')

    // Event should not be applied (week 5000 > endWeek 100)
    expect(withEvent.appliedEvents).not.toContain(futureEvent.id)
  })

  // ─────────────────────────────────────────────────────────────
  // Acceptance Criteria 3: District identity shapes encounter rules
  // ─────────────────────────────────────────────────────────────

  test('District context reflects distinct encounter families and authority profiles', () => {
    const hubDistrict = havenSchedule.districts.hub
    const docksDistrict = havenSchedule.districts.docks
    const timeBand = havenSchedule.timeBands.morning
    const traffic = buildBaselineTrafficSnapshot('hub', 'morning', hubDistrict, timeBand, 0, 12345)

    const hubContext = getDistrictEncounterContext('hub', 'morning', hubDistrict, timeBand, traffic)
    const docksContext = getDistrictEncounterContext('docks', 'morning', docksDistrict, timeBand, traffic)

    expect(hubContext.encounterFamilyTags).toContain('cult_activity')
    expect(docksContext.encounterFamilyTags).toContain('criminal_network')
    expect(hubContext.authorityResponseProfile).not.toEqual(docksContext.authorityResponseProfile)
  })

  test('Escalation modifiers differ by district', () => {
    const hubContext = getDistrictEncounterContext(
      'hub',
      'morning',
      havenSchedule.districts.hub,
      havenSchedule.timeBands.morning,
      buildBaselineTrafficSnapshot('hub', 'morning', havenSchedule.districts.hub, havenSchedule.timeBands.morning, 0, 12345)
    )
    const outskirtsContext = getDistrictEncounterContext(
      'outskirts',
      'morning',
      havenSchedule.districts.outskirts,
      havenSchedule.timeBands.morning,
      buildBaselineTrafficSnapshot(
        'outskirts',
        'morning',
        havenSchedule.districts.outskirts,
        havenSchedule.timeBands.morning,
        0,
        12345
      )
    )

    expect(hubContext.escalationModifiers.stage_delta).toBeLessThan(outskirtsContext.escalationModifiers.stage_delta)
  })

  // ─────────────────────────────────────────────────────────────
  // Acceptance Criteria 4: Time-state creates witness/covert shifts
  // ─────────────────────────────────────────────────────────────

  test('Night time-band has covert advantage and lowered witness density', () => {
    const night = havenSchedule.timeBands.night
    const afternoon = havenSchedule.timeBands.afternoon

    expect(night.covertAdvantage).toBe(true)
    expect(afternoon.covertAdvantage).toBe(false)
    expect(night.witnessModifier).toBeLessThan(afternoon.witnessModifier)
  })

  test('Night visibility is materially darker than afternoon', () => {
    const night = havenSchedule.timeBands.night
    const afternoon = havenSchedule.timeBands.afternoon

    expect(night.visibilityModifier).toBeLessThan(0.5)
    expect(afternoon.visibilityModifier).toBeGreaterThan(0.8)
  })

  test('Traffic snapshot reflects time-band properties', () => {
    const nightSnapshot = buildBaselineTrafficSnapshot(
      'hub',
      'night',
      havenSchedule.districts.hub,
      havenSchedule.timeBands.night,
      0,
      12345
    )
    const afternoonSnapshot = buildBaselineTrafficSnapshot(
      'hub',
      'afternoon',
      havenSchedule.districts.hub,
      havenSchedule.timeBands.afternoon,
      0,
      12345
    )

    expect(nightSnapshot.covertAdvantage).toBe(true)
    expect(nightSnapshot.witnessModifier).toBeLessThan(afternoonSnapshot.witnessModifier)
  })

  // ─────────────────────────────────────────────────────────────
  // Acceptance Criteria 5: Tests are deterministic and cover surfaces
  // ─────────────────────────────────────────────────────────────

  test('Schedule explanation is legible and includes key details', () => {
    const district = havenSchedule.districts.hub
    const timeBand = havenSchedule.timeBands.night
    const traffic = buildBaselineTrafficSnapshot('hub', 'night', district, timeBand, 5, 12345)
    const context = getDistrictEncounterContext('hub', 'night', district, timeBand, traffic)

    const explanation = buildScheduleExplanation(traffic, context, district, timeBand, 5)

    expect(explanation.length).toBeGreaterThan(0)
    expect(explanation.some((line) => line.includes('Week 5'))).toBe(true)
    expect(explanation.some((line) => line.includes('Population'))).toBe(true)
    expect(explanation.some((line) => line.includes('Witness'))).toBe(true)
  })

  test('Full schedule snapshot retrieval is deterministic', () => {
    const snap1 = getScheduleSnapshot(havenSchedule, 'docks', 'night', 0, 54321)
    const snap2 = getScheduleSnapshot(havenSchedule, 'docks', 'night', 0, 54321)

    expect(snap1).not.toBeNull()
    expect(snap2).not.toBeNull()

    if (snap1 && snap2) {
      expect(snap1.traffic.baselinePopulation).toBe(snap2.traffic.baselinePopulation)
      expect(snap1.traffic.witnessModifier).toBe(snap2.traffic.witnessModifier)
      expect(snap1.context.encounterFamilyTags).toEqual(snap2.context.encounterFamilyTags)
    }
  })

  test('Invalid district/time-band returns null', () => {
    const snap = getScheduleSnapshot(havenSchedule, 'nonexistent_district', 'night', 0, 12345)
    expect(snap).toBeNull()

    const snap2 = getScheduleSnapshot(havenSchedule, 'hub', 'nonexistent_time_band', 0, 12345)
    expect(snap2).toBeNull()
  })

  // ─────────────────────────────────────────────────────────────
  // Focused acceptance validation
  // ─────────────────────────────────────────────────────────────

  test('SPE-109 acceptance: At least 6 districts in Haven', () => {
    expect(Object.keys(havenSchedule.districts).length).toBeGreaterThanOrEqual(6)
  })

  test('SPE-109 acceptance: At least 5 time bands', () => {
    expect(Object.keys(havenSchedule.timeBands).length).toBeGreaterThanOrEqual(5)
  })

  test('SPE-109 acceptance: At least 1 rare event overlay exists', () => {
    expect(havenSchedule.events.length).toBeGreaterThanOrEqual(1)
  })

  test('SPE-109 acceptance: Night creates covert advantage distinct from day', () => {
    const nightSnapshot = buildBaselineTrafficSnapshot(
      'outskirts',
      'night',
      havenSchedule.districts.outskirts,
      havenSchedule.timeBands.night,
      0,
      12345
    )
    const afternoonSnapshot = buildBaselineTrafficSnapshot(
      'outskirts',
      'afternoon',
      havenSchedule.districts.outskirts,
      havenSchedule.timeBands.afternoon,
      0,
      12345
    )

    // Night must have covert advantage and lower witness density
    expect(nightSnapshot.covertAdvantage).toBe(true)
    expect(afternoonSnapshot.covertAdvantage).toBe(false)
    expect(nightSnapshot.witnessModifier).toBeLessThan(0.4)
  })
})
