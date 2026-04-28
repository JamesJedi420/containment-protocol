/**
 * SPE-109: Haven settlement schedule definition.
 *
 * MVP district schedule for the primary settlement "Haven" with 6 districts,
 * 5 time bands, and rare event overlays.
 */

import { DistrictScheduleState, DistrictProfile, TimeBandProfile, RareEventOverlay } from '../models'

/**
 * Haven time bands: 5 day-parts with distinct baseline traffic and properties.
 */
export const HAVEN_TIME_BANDS: Record<string, TimeBandProfile> = {
  dawn: {
    id: 'dawn',
    label: 'Dawn (6 AM–8 AM)',
    baselinePopulation: 150,
    witnessModifier: 0.3, // Low witness density
    visibilityModifier: 0.4, // Dim light
    covertAdvantage: true,
  },
  morning: {
    id: 'morning',
    label: 'Morning (8 AM–12 PM)',
    baselinePopulation: 500,
    witnessModifier: 0.7,
    visibilityModifier: 0.95,
    covertAdvantage: false,
  },
  afternoon: {
    id: 'afternoon',
    label: 'Afternoon (12 PM–5 PM)',
    baselinePopulation: 600,
    witnessModifier: 0.8,
    visibilityModifier: 1.0,
    covertAdvantage: false,
  },
  evening: {
    id: 'evening',
    label: 'Evening (5 PM–9 PM)',
    baselinePopulation: 450,
    witnessModifier: 0.65,
    visibilityModifier: 0.5, // Twilight/dusk
    covertAdvantage: false,
  },
  night: {
    id: 'night',
    label: 'Night (9 PM–6 AM)',
    baselinePopulation: 200,
    witnessModifier: 0.2, // Very low witness density
    visibilityModifier: 0.1, // Dark
    covertAdvantage: true,
  },
}

/**
 * Haven districts: 6 neighborhoods with distinct encounter families and authority profiles.
 */
export const HAVEN_DISTRICTS: Record<string, DistrictProfile> = {
  hub: {
    id: 'hub',
    label: 'Central Hub',
    encounterFamilyTags: ['cult_activity', 'political_intrigue', 'institution_front'],
    escalationModifiers: { stage_delta: 0.2, pressure_weight: 1.1 },
    authorityResponseProfile: 'rapid_response', // Hub gets fast police/official attention
  },
  docks: {
    id: 'docks',
    label: 'Harbor Docks',
    encounterFamilyTags: ['criminal_network', 'smuggling', 'feral_pack'],
    escalationModifiers: { stage_delta: 0.3, pressure_weight: 0.9 },
    authorityResponseProfile: 'slow_reaction', // Docks enforcement is lax
  },
  residential: {
    id: 'residential',
    label: 'Residential',
    encounterFamilyTags: ['domestic_violence', 'supernatural_haunting', 'cult_recruitment'],
    escalationModifiers: { stage_delta: 0.0, pressure_weight: 1.0 },
    authorityResponseProfile: 'standard',
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial District',
    encounterFamilyTags: ['labor_unrest', 'feral_pack', 'hazardous_environment'],
    escalationModifiers: { stage_delta: 0.1, pressure_weight: 0.8 },
    authorityResponseProfile: 'slow_reaction',
  },
  outskirts: {
    id: 'outskirts',
    label: 'Outskirts',
    encounterFamilyTags: ['feral_pack', 'supernatural_phenomenon', 'frontier_threat'],
    escalationModifiers: { stage_delta: 0.4, pressure_weight: 1.2 },
    authorityResponseProfile: 'minimal', // Remote areas get little official response
  },
  underground: {
    id: 'underground',
    label: 'Underground',
    encounterFamilyTags: ['institutional_prisoner', 'supernatural_nest', 'smuggling_network'],
    escalationModifiers: { stage_delta: 0.5, pressure_weight: 1.3 },
    authorityResponseProfile: 'corruption', // Underground authority is compromised/institutional
  },
}

/**
 * Haven rare events: overlays applied additively on top of baseline traffic.
 * Example: "Night Withdrawal" reduces population in specific districts.
 */
export const HAVEN_RARE_EVENTS: RareEventOverlay[] = [
  {
    id: 'hub_market_day',
    label: 'Hub Market Day (increased traffic)',
    appliesTo: ['hub', 'residential'],
    startWeek: 0,
    endWeek: 1000, // Ongoing in MVP
    trafficModifier: {
      populationDelta: 200,
      witnessModifier: 0.15, // Increased witness presence
    },
    encounterFamilyBias: ['theft', 'pickpocketing', 'political_speech'],
    seedKey: 'hub_market_recurring',
  },
  {
    id: 'docks_unloading',
    label: 'Docks Unloading (night shift)',
    appliesTo: ['docks'],
    startWeek: 0,
    endWeek: 1000,
    trafficModifier: {
      populationDelta: 150,
    },
    encounterFamilyBias: ['smuggling', 'criminal_transaction'],
    seedKey: 'docks_unload_recurring',
  },
  {
    id: 'outskirts_retreat',
    label: 'Outskirts Retreat (witness withdrawal)',
    appliesTo: ['outskirts'],
    startWeek: 0,
    endWeek: 1000,
    trafficModifier: {
      witnessModifier: -0.2, // Outskirts populations withdraw further
      populationDelta: -50,
    },
    seedKey: 'outskirts_retreat_recurring',
  },
]

/**
 * Build the complete Haven schedule state.
 */
export function buildHavenSchedule(): DistrictScheduleState {
  return {
    settlementId: 'haven',
    districts: HAVEN_DISTRICTS,
    timeBands: HAVEN_TIME_BANDS,
    events: HAVEN_RARE_EVENTS,
  }
}
