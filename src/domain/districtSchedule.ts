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

import type {
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
  void district

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clampFiniteScalar(value: unknown, fallback: number, min: number, max?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  const truncated = Math.trunc(value)
  const boundedMin = Math.max(min, truncated)
  return max === undefined ? boundedMin : Math.min(max, boundedMin)
}

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    ),
  ]
}

function sanitizeTimeBandProfile(raw: unknown, fallbackId: string): TimeBandProfile | null {
  if (!isRecord(raw)) {
    return null
  }

  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : fallbackId
  const label =
    typeof raw.label === 'string' && raw.label.trim().length > 0
      ? raw.label.trim().slice(0, 120)
      : id

  return {
    id,
    label,
    baselinePopulation: clampFiniteScalar(raw.baselinePopulation, 0, 0, 100000),
    witnessModifier: clampFiniteScalar(raw.witnessModifier, 0, 0, 1),
    visibilityModifier: clampFiniteScalar(raw.visibilityModifier, 0, 0, 1),
    ...(raw.covertAdvantage === true ? { covertAdvantage: true } : {}),
  }
}

function sanitizeDistrictProfile(raw: unknown, fallbackId: string): DistrictProfile | null {
  if (!isRecord(raw)) {
    return null
  }

  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : fallbackId
  const label =
    typeof raw.label === 'string' && raw.label.trim().length > 0
      ? raw.label.trim().slice(0, 120)
      : id
  const authorityResponseProfile =
    typeof raw.authorityResponseProfile === 'string' && raw.authorityResponseProfile.trim().length > 0
      ? raw.authorityResponseProfile.trim().slice(0, 80)
      : 'standard'

  const escalationModifiers: Record<string, number> = {}
  if (isRecord(raw.escalationModifiers)) {
    for (const [key, entry] of Object.entries(raw.escalationModifiers)) {
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        escalationModifiers[key] = Number(entry.toFixed(4))
      }
    }
  }

  const timeBandOverrides: Record<string, Partial<TimeBandProfile>> | undefined = isRecord(
    raw.timeBandOverrides
  )
    ? Object.fromEntries(
        Object.entries(raw.timeBandOverrides)
          .map(([bandId, entry]) => {
            const sanitized = sanitizeTimeBandProfile(entry, bandId)
            return sanitized ? ([bandId, sanitized] as const) : null
          })
          .filter((entry): entry is readonly [string, TimeBandProfile] => entry !== null)
      )
    : undefined

  return {
    id,
    label,
    encounterFamilyTags: sanitizeStringList(raw.encounterFamilyTags),
    escalationModifiers,
    authorityResponseProfile,
    ...(timeBandOverrides && Object.keys(timeBandOverrides).length > 0
      ? { timeBandOverrides }
      : {}),
  }
}

function sanitizeRareEventOverlay(
  raw: unknown,
  districtIds: Set<string>,
  campaignWeek: number
): RareEventOverlay | null {
  if (!isRecord(raw)) {
    return null
  }

  const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : null
  if (!id) {
    return null
  }

  const label =
    typeof raw.label === 'string' && raw.label.trim().length > 0
      ? raw.label.trim().slice(0, 120)
      : id

  const appliesTo = sanitizeStringList(raw.appliesTo).filter((districtId) => districtIds.has(districtId))
  if (appliesTo.length === 0) {
    return null
  }

  const startWeek = clampFiniteScalar(raw.startWeek, 1, 1, campaignWeek + 520)
  const endWeek = clampFiniteScalar(raw.endWeek, startWeek, startWeek, startWeek + 520)

  const trafficModifier: RareEventOverlay['trafficModifier'] = {}
  if (isRecord(raw.trafficModifier)) {
    if (typeof raw.trafficModifier.populationDelta === 'number' && Number.isFinite(raw.trafficModifier.populationDelta)) {
      trafficModifier.populationDelta = Math.trunc(raw.trafficModifier.populationDelta)
    }
    if (
      typeof raw.trafficModifier.witnessModifier === 'number' &&
      Number.isFinite(raw.trafficModifier.witnessModifier)
    ) {
      trafficModifier.witnessModifier = clampFiniteScalar(raw.trafficModifier.witnessModifier, 0, 0, 1)
    }
    if (
      typeof raw.trafficModifier.visibilityModifier === 'number' &&
      Number.isFinite(raw.trafficModifier.visibilityModifier)
    ) {
      trafficModifier.visibilityModifier = clampFiniteScalar(
        raw.trafficModifier.visibilityModifier,
        0,
        0,
        1
      )
    }
  }

  const seedKey =
    typeof raw.seedKey === 'string' && raw.seedKey.trim().length > 0
      ? raw.seedKey.trim().slice(0, 120)
      : `event_${id}`

  return {
    id,
    label,
    appliesTo,
    startWeek,
    endWeek,
    trafficModifier,
    ...(sanitizeStringList(raw.encounterFamilyBias).length > 0
      ? { encounterFamilyBias: sanitizeStringList(raw.encounterFamilyBias) }
      : {}),
    seedKey,
  }
}

/**
 * Hydration problem 468: districts, time bands, rare events, appliesTo refs.
 */
export function sanitizeDistrictScheduleState(
  raw: unknown,
  campaignWeek: number
): DistrictScheduleState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const settlementId =
    typeof raw.settlementId === 'string' && raw.settlementId.trim().length > 0
      ? raw.settlementId.trim().slice(0, 80)
      : 'haven'

  const districts: Record<string, DistrictProfile> = {}
  if (isRecord(raw.districts)) {
    for (const [recordKey, entry] of Object.entries(raw.districts)) {
      const profile = sanitizeDistrictProfile(entry, recordKey)
      if (profile) {
        districts[profile.id] = profile
      }
    }
  }

  const timeBands: Record<string, TimeBandProfile> = {}
  if (isRecord(raw.timeBands)) {
    for (const [recordKey, entry] of Object.entries(raw.timeBands)) {
      const profile = sanitizeTimeBandProfile(entry, recordKey)
      if (profile) {
        timeBands[profile.id] = profile
      }
    }
  }

  if (Object.keys(districts).length === 0 || Object.keys(timeBands).length === 0) {
    return undefined
  }

  const districtIds = new Set(Object.keys(districts))
  const events = Array.isArray(raw.events)
    ? raw.events
        .map((entry) => sanitizeRareEventOverlay(entry, districtIds, campaignWeek))
        .filter((entry): entry is RareEventOverlay => entry !== null)
    : []

  return {
    settlementId,
    districts,
    timeBands,
    events,
  }
}
