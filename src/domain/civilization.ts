// SPE-1069 slice 1: civilization parent-actor scaffolding
import { createSeededRng } from './math'
import { CIVILIZATION_CALIBRATION } from './sim/calibration'

// ---------------------------------------------------------------------------
// Local types — no models.ts changes
// ---------------------------------------------------------------------------

export interface CulturePacket {
  ethics: string[]
  resources: string[]
  taboos: string[]
  namingStyle: string
  toleratedBehaviors: string[]
}

export type DiplomaticBaseline =
  | 'cooperative'
  | 'suspicious'
  | 'hostile'
  | 'dependent'
  | 'infiltrated'
  | 'exploitative'
  | 'secretly_aligned'

export interface InstitutionDerivationRule {
  institutionType: string
  probability: number
  minCount: number
  maxCount: number
  tagOverrides?: string[]
}

export type CivilizationCategory =
  | 'government'
  | 'religious'
  | 'medical'
  | 'academic'
  | 'criminal'
  | 'occult'
  | 'rival_containment'
  | 'nonhuman'

export interface CivilizationProfile {
  id: string
  name: string
  category: CivilizationCategory
  culturePacket: CulturePacket
  diplomaticBaseline: DiplomaticBaseline
  institutionDerivationRules: InstitutionDerivationRule[]
  resourceAccess: string[]
  memoryCapacity: number
}

export interface CivilizationGeneratorInput {
  seed: number
  count: number
  biasCategories?: CivilizationCategory[]
}

export interface GeneratedCivilizationSet {
  civilizations: CivilizationProfile[]
  seed: number
}

export type CivilizationCooperationBand = 'aligned' | 'watchful' | 'opposed'

export type CivilizationMemoryEventType =
  | 'agency_saved_lives'
  | 'agency_shared_intel'
  | 'agency_honored_agreement'
  | 'agency_violated_agreement'
  | 'agency_exposed_coverup'
  | 'agency_raided_civilian_site'

export interface CivilizationMemoryEventInput {
  eventId: string
  week: number
  type: CivilizationMemoryEventType
  intensity?: number
  summary?: string
}

export interface CivilizationMemoryEventRecord {
  eventId: string
  week: number
  type: CivilizationMemoryEventType
  intensity: number
  cooperationDelta: number
  summary?: string
}

export interface CivilizationState {
  civilizationId: string
  diplomaticBaseline: DiplomaticBaseline
  cooperation: number
  cooperationBand: CivilizationCooperationBand
  memoryCapacity: number
  memoryEvents: CivilizationMemoryEventRecord[]
  rememberedEventCounts: Record<CivilizationMemoryEventType, number>
  rememberedEventIds: string[]
  memoryPressure: number
  lastMemoryWeek?: number
}

export interface CivilizationStateCreationInput {
  civilizationId: string
  diplomaticBaseline: DiplomaticBaseline
  memoryCapacity?: number
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const CIVILIZATION_TEMPLATES: readonly CivilizationProfile[] = [
  {
    id: 'metropolitan_authority',
    name: 'Metropolitan Authority',
    category: 'government',
    culturePacket: {
      ethics: ['order', 'hierarchy', 'public-safety'],
      resources: ['personnel', 'infrastructure', 'legal-authority'],
      taboos: ['sedition', 'unsanctioned-force'],
      namingStyle: 'bureaucratic',
      toleratedBehaviors: ['oversight', 'containment-liaison'],
    },
    diplomaticBaseline: 'cooperative',
    institutionDerivationRules: [
      { institutionType: 'precinct', probability: 0.8, minCount: 1, maxCount: 3 },
      { institutionType: 'municipal-office', probability: 0.7, minCount: 1, maxCount: 2 },
      { institutionType: 'emergency-response', probability: 0.5, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['legal-mandate', 'public-personnel', 'city-infrastructure'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'radiant_order',
    name: 'Radiant Order',
    category: 'religious',
    culturePacket: {
      ethics: ['devotion', 'purity', 'sacrifice'],
      resources: ['faith-network', 'sanctified-sites', 'volunteers'],
      taboos: ['apostasy', 'corruption', 'secular-compromise'],
      namingStyle: 'liturgical',
      toleratedBehaviors: ['ritual-blessing', 'spiritual-oversight'],
    },
    diplomaticBaseline: 'suspicious',
    institutionDerivationRules: [
      { institutionType: 'sanctuary', probability: 0.9, minCount: 1, maxCount: 3 },
      { institutionType: 'pilgrimage-site', probability: 0.5, minCount: 1, maxCount: 2 },
      { institutionType: 'inquisition-cell', probability: 0.4, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['faith-network', 'sanctified-sites'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'civic_medical_trust',
    name: 'Civic Medical Trust',
    category: 'medical',
    culturePacket: {
      ethics: ['care', 'neutrality', 'evidence-based'],
      resources: ['medical-staff', 'clinical-facilities', 'supply-chains'],
      taboos: ['negligence', 'unauthorized-experimentation'],
      namingStyle: 'clinical',
      toleratedBehaviors: ['containment-triage', 'epidemic-response'],
    },
    diplomaticBaseline: 'cooperative',
    institutionDerivationRules: [
      { institutionType: 'clinic', probability: 0.85, minCount: 1, maxCount: 3 },
      { institutionType: 'ward', probability: 0.7, minCount: 1, maxCount: 4 },
      { institutionType: 'quarantine-station', probability: 0.4, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['medical-staff', 'pharmaceuticals', 'clinical-facilities'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'institute_applied_research',
    name: 'Institute of Applied Research',
    category: 'academic',
    culturePacket: {
      ethics: ['inquiry', 'peer-review', 'documentation'],
      resources: ['researchers', 'archives', 'lab-equipment'],
      taboos: ['data-falsification', 'unsanctioned-disclosure'],
      namingStyle: 'technical',
      toleratedBehaviors: ['field-observation', 'specimen-analysis'],
    },
    diplomaticBaseline: 'cooperative',
    institutionDerivationRules: [
      { institutionType: 'laboratory', probability: 0.85, minCount: 1, maxCount: 3 },
      { institutionType: 'archive', probability: 0.7, minCount: 1, maxCount: 2 },
      { institutionType: 'field-station', probability: 0.5, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['research-grants', 'lab-equipment', 'academic-network'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'gray_market_collective',
    name: 'Gray Market Collective',
    category: 'criminal',
    culturePacket: {
      ethics: ['profit', 'loyalty-to-crew', 'plausible-deniability'],
      resources: ['contraband', 'cash-liquidity', 'contacts'],
      taboos: ['betrayal', 'exposure'],
      namingStyle: 'street',
      toleratedBehaviors: ['fencing', 'false-papers', 'extraction'],
    },
    diplomaticBaseline: 'exploitative',
    institutionDerivationRules: [
      { institutionType: 'safe-house', probability: 0.85, minCount: 1, maxCount: 4 },
      { institutionType: 'black-market-stall', probability: 0.7, minCount: 1, maxCount: 3 },
      { institutionType: 'smuggling-route', probability: 0.6, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['contraband', 'cash-liquidity', 'informants'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'hidden_covenant',
    name: 'Hidden Covenant',
    category: 'occult',
    culturePacket: {
      ethics: ['secrecy', 'esoteric-truth', 'ritual-discipline'],
      resources: ['occult-artifacts', 'ritual-knowledge', 'cells'],
      taboos: ['exposure', 'mundane-oversight', 'disrespect-of-rites'],
      namingStyle: 'symbolic',
      toleratedBehaviors: ['summoning-watch', 'anomaly-communion'],
    },
    diplomaticBaseline: 'secretly_aligned',
    institutionDerivationRules: [
      { institutionType: 'shrine', probability: 0.9, minCount: 1, maxCount: 3 },
      { institutionType: 'ritual-chamber', probability: 0.7, minCount: 1, maxCount: 2 },
      { institutionType: 'cell', probability: 0.8, minCount: 2, maxCount: 4 },
    ],
    resourceAccess: ['occult-artifacts', 'ritual-knowledge', 'esoteric-network'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'bureau_exceptional_incidents',
    name: 'Bureau of Exceptional Incidents',
    category: 'rival_containment',
    culturePacket: {
      ethics: ['jurisdiction', 'operational-security', 'mission-priority'],
      resources: ['classified-dossiers', 'specialized-agents', 'budget-authority'],
      taboos: ['turf-violations', 'unauthorized-disclosure', 'asset-poaching'],
      namingStyle: 'bureaucratic',
      toleratedBehaviors: ['parallel-ops', 'joint-debrief'],
    },
    diplomaticBaseline: 'suspicious',
    institutionDerivationRules: [
      { institutionType: 'field-office', probability: 0.9, minCount: 1, maxCount: 3 },
      { institutionType: 'classified-archive', probability: 0.6, minCount: 1, maxCount: 2 },
      { institutionType: 'training-facility', probability: 0.5, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['classified-dossiers', 'budget-authority', 'specialized-agents'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
  {
    id: 'threshold_assembly',
    name: 'Threshold Assembly',
    category: 'nonhuman',
    culturePacket: {
      ethics: ['threshold-law', 'balance', 'non-interference-unless-breached'],
      resources: ['anomaly-conduits', 'spatial-nodes', 'delegate-emissaries'],
      taboos: ['containment-breach', 'unauthorized-threshold-crossing', 'exploitation-of-nodes'],
      namingStyle: 'liminal',
      toleratedBehaviors: ['threshold-mediation', 'node-monitoring'],
    },
    diplomaticBaseline: 'dependent',
    institutionDerivationRules: [
      { institutionType: 'threshold-gate', probability: 0.95, minCount: 1, maxCount: 2 },
      { institutionType: 'node-anchor', probability: 0.7, minCount: 1, maxCount: 3 },
      { institutionType: 'emissary-post', probability: 0.5, minCount: 1, maxCount: 2 },
    ],
    resourceAccess: ['anomaly-conduits', 'spatial-nodes', 'liminal-knowledge'],
    memoryCapacity: CIVILIZATION_CALIBRATION.defaultMemoryCapacity,
  },
]

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Look up a civilization template by id.
 * Returns undefined for unknown ids.
 */
export function classifyCivilization(id: string): CivilizationProfile | undefined {
  return CIVILIZATION_TEMPLATES.find((t) => t.id === id)
}

/**
 * Generate a set of civilizations using a seeded RNG.
 * If biasCategories is provided, templates matching any of those categories
 * are weighted 3× higher when selecting from the pool.
 */
export function generateCivilizations(
  input: CivilizationGeneratorInput
): GeneratedCivilizationSet {
  const { seed, count, biasCategories } = input
  const rng = createSeededRng(seed)

  const pool: CivilizationProfile[] = []
  for (const template of CIVILIZATION_TEMPLATES) {
    const weight =
      biasCategories && biasCategories.includes(template.category) ? 3 : 1
    for (let w = 0; w < weight; w++) {
      pool.push(template)
    }
  }

  const civilizations: CivilizationProfile[] = []
  const usedIds = new Set<string>()

  let attempts = 0
  const maxAttempts = count * pool.length * 2

  while (civilizations.length < count && attempts < maxAttempts) {
    attempts++
    const idx = Math.floor(rng.next() * pool.length)
    const candidate = pool[idx]!
    if (!usedIds.has(candidate.id)) {
      usedIds.add(candidate.id)
      civilizations.push(candidate)
    }
  }

  // If pool is exhausted before count, fill remainder by cycling with suffix
  if (civilizations.length < count) {
    let suffix = 0
    for (const template of CIVILIZATION_TEMPLATES) {
      if (civilizations.length >= count) break
      const syntheticId = `${template.id}_${++suffix}`
      if (!usedIds.has(syntheticId)) {
        usedIds.add(syntheticId)
        civilizations.push({ ...template, id: syntheticId })
      }
    }
  }

  return { civilizations, seed }
}

/**
 * Derive institution types for a civilization using its derivation rules
 * and a seeded RNG.
 */
export function deriveSubordinateInstitutionTypes(
  civ: CivilizationProfile,
  seed: number
): string[] {
  const rng = createSeededRng(seed)
  const result: string[] = []

  for (const rule of civ.institutionDerivationRules) {
    const roll = rng.next()
    if (roll < rule.probability) {
      const rangeSize = rule.maxCount - rule.minCount
      const count =
        rule.minCount + (rangeSize > 0 ? Math.floor(rng.next() * (rangeSize + 1)) : 0)
      for (let i = 0; i < count; i++) {
        result.push(rule.institutionType)
      }
    }
  }

  // Guarantee at least one institution per calibration floor
  if (result.length < CIVILIZATION_CALIBRATION.minInstitutionsPerGeneration) {
    const fallback = civ.institutionDerivationRules[0]
    if (fallback) {
      for (
        let i = result.length;
        i < CIVILIZATION_CALIBRATION.minInstitutionsPerGeneration;
        i++
      ) {
        result.push(fallback.institutionType)
      }
    }
  }

  return result
}

/**
 * Evaluate the diplomatic baseline and return a reason string.
 * Pure reader — does not mutate state.
 */
export function evaluateDiplomaticBaseline(civ: CivilizationProfile): {
  baseline: DiplomaticBaseline
  reason: string
} {
  const baselineReasons: Record<DiplomaticBaseline, string> = {
    cooperative:
      'This civilization shares governance or care mandates and extends operational goodwill by default.',
    suspicious:
      'This civilization protects its jurisdiction and extends cooperation only when interests align.',
    hostile:
      'This civilization views outside containment operations as threats to its sovereignty.',
    dependent:
      'This civilization relies on interaction to maintain its own stability and access.',
    infiltrated:
      'This civilization has been quietly shaped by outside interests and operates under hidden influence.',
    exploitative:
      'This civilization extracts value from all interactions and treats cooperation as transactional.',
    secretly_aligned:
      'This civilization maintains a covert alignment with anomaly forces while appearing neutral.',
  }

  return {
    baseline: civ.diplomaticBaseline,
    reason: baselineReasons[civ.diplomaticBaseline],
  }
}

const BASELINE_COOPERATION: Record<DiplomaticBaseline, number> = {
  cooperative: 66,
  suspicious: 48,
  hostile: 20,
  dependent: 56,
  infiltrated: 34,
  exploitative: 38,
  secretly_aligned: 28,
}

const MEMORY_EVENT_COOPERATION_WEIGHTS: Record<CivilizationMemoryEventType, number> = {
  agency_saved_lives: 8,
  agency_shared_intel: 5,
  agency_honored_agreement: 7,
  agency_violated_agreement: -14,
  agency_exposed_coverup: -10,
  agency_raided_civilian_site: -16,
}

function clampCooperation(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function resolveCooperationBand(cooperation: number): CivilizationCooperationBand {
  if (cooperation >= 65) {
    return 'aligned'
  }

  if (cooperation <= 35) {
    return 'opposed'
  }

  return 'watchful'
}

function createEmptyRememberedCounts(): Record<CivilizationMemoryEventType, number> {
  return {
    agency_saved_lives: 0,
    agency_shared_intel: 0,
    agency_honored_agreement: 0,
    agency_violated_agreement: 0,
    agency_exposed_coverup: 0,
    agency_raided_civilian_site: 0,
  }
}

/**
 * Create compact civilization runtime state.
 * Pure constructor; no GameState wiring.
 */
export function createCivilizationState(input: CivilizationStateCreationInput): CivilizationState {
  const memoryCapacity = Math.max(1, input.memoryCapacity ?? CIVILIZATION_CALIBRATION.defaultMemoryCapacity)
  const baselineCooperation = clampCooperation(BASELINE_COOPERATION[input.diplomaticBaseline])

  return {
    civilizationId: input.civilizationId,
    diplomaticBaseline: input.diplomaticBaseline,
    cooperation: baselineCooperation,
    cooperationBand: resolveCooperationBand(baselineCooperation),
    memoryCapacity,
    memoryEvents: [],
    rememberedEventCounts: createEmptyRememberedCounts(),
    rememberedEventIds: [],
    memoryPressure: 0,
    lastMemoryWeek: undefined,
  }
}

/**
 * Deterministically apply explicit memory events to civilization state.
 * - Order-independent by sorting events by week/eventId before application.
 * - Duplicate eventIds are ignored once remembered.
 * - Cooperation and cooperation-band update from remembered behavior.
 */
export function accumulateCivilizationMemory(
  state: CivilizationState,
  events: readonly CivilizationMemoryEventInput[]
): CivilizationState {
  if (events.length === 0) {
    return state
  }

  const rememberedIds = new Set(state.rememberedEventIds)
  const nextCounts = { ...state.rememberedEventCounts }
  const sortedEvents = [...events].sort((left, right) => {
    if (left.week !== right.week) {
      return left.week - right.week
    }
    return left.eventId.localeCompare(right.eventId)
  })

  let cooperation = state.cooperation
  let memoryPressure = state.memoryPressure
  let lastMemoryWeek = state.lastMemoryWeek
  const nextMemoryEvents = [...state.memoryEvents]

  for (const event of sortedEvents) {
    if (rememberedIds.has(event.eventId)) {
      continue
    }

    const intensity = Math.max(1, Math.round(event.intensity ?? 1))
    const cooperationDelta = MEMORY_EVENT_COOPERATION_WEIGHTS[event.type] * intensity

    rememberedIds.add(event.eventId)
    nextCounts[event.type] += 1
    cooperation = clampCooperation(cooperation + cooperationDelta)
    memoryPressure += cooperationDelta < 0 ? Math.abs(cooperationDelta) : -Math.min(2, cooperationDelta)
    memoryPressure = Math.max(0, memoryPressure)
    lastMemoryWeek = Math.max(lastMemoryWeek ?? event.week, event.week)

    nextMemoryEvents.push({
      eventId: event.eventId,
      week: event.week,
      type: event.type,
      intensity,
      cooperationDelta,
      summary: event.summary,
    })
  }

  const prunedEvents = nextMemoryEvents.slice(-state.memoryCapacity)
  const rememberedEventIds = prunedEvents.map((entry) => entry.eventId)

  return {
    ...state,
    cooperation,
    cooperationBand: resolveCooperationBand(cooperation),
    memoryEvents: prunedEvents,
    rememberedEventCounts: nextCounts,
    rememberedEventIds,
    memoryPressure,
    lastMemoryWeek,
  }
}
