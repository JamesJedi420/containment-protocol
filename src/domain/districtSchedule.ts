/**
 * SPE-109: District time-cadence encounter scheduling.
 *
 * Deterministic module for computing public traffic, witness density, and encounter context
 * based on district identity and time band. All functions are pure; randomization uses
 * passed-in RNG state only.
 *
 * Key surfaces:
 * - buildBaselineTrafficSnapshot: Compute traffic for a district + time band
 * - applyRareEventOverlays: Combine baseline with event modifiers
 * - getDistrictEncounterContext: Derive encounter generation context
 * - buildScheduleExplanation: Human-readable audit trail
 */

import {
  DistrictScheduleState,
  DistrictProfile,
  TimeBandProfile,
  TrafficSnapshot,
  EncounterContext,
  RareEventOverlay,
} from './models'

/**
 * Build baseline traffic snapshot for a district at a specific time band.
 * Pure function; deterministic given same inputs and RNG state.
 */
export function buildBaselineTrafficSnapshot(
  districtId: string,
  timeBandId: string,
  district: DistrictProfile,
  timeBand: TimeBandProfile,
  week: number,
  rngState: number
): TrafficSnapshot {
  return {
    baselinePopulation: timeBand.baselinePopulation,
    witnessModifier: timeBand.witnessModifier,
    visibilityModifier: timeBand.visibilityModifier,
    covertAdvantage: timeBand.covertAdvantage ?? false,
    appliedEvents: [],
    seedKey: `baseline_${districtId}_${timeBandId}_w${week}_rng${rngState}`,
  }
}

/**
 * Apply rare event overlays to baseline traffic.
 * Overlays are combined (additive modifiers), not replaced.
 */
export function applyRareEventOverlays(
  baseline: TrafficSnapshot,
  overlays: RareEventOverlay[],
  week: number,
  districtId: string
): TrafficSnapshot {
  const result: TrafficSnapshot = {
    ...baseline,
    appliedEvents: [...baseline.appliedEvents],
  }

  for (const event of overlays) {
    // Check if event is active this week
    if (week < event.startWeek || week > event.endWeek) {
      continue
    }

    // Check if event applies to this district
    if (!event.appliesTo.includes(districtId)) {
      continue
    }

    // Apply traffic modifiers (additive)
    if (event.trafficModifier.populationDelta !== undefined) {
      result.baselinePopulation += event.trafficModifier.populationDelta
    }
    if (event.trafficModifier.witnessModifier !== undefined) {
      result.witnessModifier = Math.max(0, Math.min(1, result.witnessModifier + event.trafficModifier.witnessModifier))
    }
    if (event.trafficModifier.visibilityModifier !== undefined) {
      result.visibilityModifier = Math.max(
        0,
        Math.min(1, result.visibilityModifier + event.trafficModifier.visibilityModifier)
      )
    }

    // Track applied events
    result.appliedEvents.push(event.id)
  }

  return result
}

/**
 * Derive encounter context from district and time band.
 * Shapes case weighting, escalation rules, and authority response.
 */
export function getDistrictEncounterContext(
  districtId: string,
  timeBandId: string,
  district: DistrictProfile,
  timeBand: TimeBandProfile,
  traffic: TrafficSnapshot
): EncounterContext {
  void timeBand
  void traffic

  return {
    districtId,
    timeBandId,
    encounterFamilyTags: district.encounterFamilyTags,
    escalationModifiers: district.escalationModifiers,
    authorityResponseProfile: district.authorityResponseProfile,
  }
}

/**
 * Build human-readable explanation of how traffic was composed.
 * Useful for debugging and player-facing transparency.
 */
export function buildScheduleExplanation(
  snapshot: TrafficSnapshot,
  context: EncounterContext,
  district: DistrictProfile,
  timeBand: TimeBandProfile,
  week: number
): string[] {
  const notes: string[] = []

  notes.push(`[Week ${week}] ${district.label} during ${timeBand.label}`)
  notes.push(`  Population: ${snapshot.baselinePopulation} (baseline)`)
  notes.push(
    `  Witness Density: ${(snapshot.witnessModifier * 100).toFixed(0)}% (visibility: ${(snapshot.visibilityModifier * 100).toFixed(0)}%)`
  )

  if (snapshot.covertAdvantage) {
    notes.push(`  ✓ Covert advantage active (darkness, low traffic, or time-state advantage)`)
  }

  if (snapshot.appliedEvents.length > 0) {
    notes.push(`  Events: ${snapshot.appliedEvents.join(', ')}`)
  }

  notes.push(`  Encounter Families: ${context.encounterFamilyTags.join(', ')}`)
  notes.push(`  Authority Response: ${context.authorityResponseProfile}`)

  return notes
}

/**
 * Lookup helper: get a district profile from schedule state.
 */
export function getDistrict(schedule: DistrictScheduleState, districtId: string): DistrictProfile | null {
  return schedule.districts[districtId] ?? null
}

/**
 * Lookup helper: get a time band profile from schedule state.
 */
export function getTimeBand(schedule: DistrictScheduleState, timeBandId: string): TimeBandProfile | null {
  return schedule.timeBands[timeBandId] ?? null
}

/**
 * Get active rare events for a given week.
 */
export function getActiveRareEvents(schedule: DistrictScheduleState, week: number): RareEventOverlay[] {
  return schedule.events.filter((e) => week >= e.startWeek && week <= e.endWeek)
}

/**
 * Main entry point: compute complete schedule snapshot for a district/time-band pair.
 */
export function getScheduleSnapshot(
  schedule: DistrictScheduleState,
  districtId: string,
  timeBandId: string,
  week: number,
  rngState: number
): { traffic: TrafficSnapshot; context: EncounterContext } | null {
  const district = getDistrict(schedule, districtId)
  const timeBand = getTimeBand(schedule, timeBandId)

  if (!district || !timeBand) {
    return null
  }

  const baseline = buildBaselineTrafficSnapshot(districtId, timeBandId, district, timeBand, week, rngState)
  const activeEvents = getActiveRareEvents(schedule, week)
  const traffic = applyRareEventOverlays(baseline, activeEvents, week, districtId)
  const context = getDistrictEncounterContext(districtId, timeBandId, district, timeBand, traffic)

  return { traffic, context }
}
