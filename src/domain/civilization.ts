// SPE-1069 slice 1: civilization parent-actor scaffolding
import { createSeededRng } from './math'
import { CIVILIZATION_CALIBRATION } from './sim/calibration'
import { CIVILIZATION_EVOLUTION_CALIBRATION } from './sim/calibration'

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

export type CivilizationConflictAxis =
  | 'jurisdiction_competition'
  | 'ideological_collision'
  | 'resource_competition'
  | 'secrecy_friction'
  | 'anomaly_governance'

export type CivilizationConflictSeverity = 'low' | 'moderate' | 'high'

export interface CivilizationConflictSignal {
  axis: CivilizationConflictAxis
  weight: number
  reason: string
  source: 'category' | 'baseline' | 'memory'
}

export interface CivilizationPairConflict {
  pairId: string
  civilizationAId: string
  civilizationBId: string
  tensionScore: number
  severity: CivilizationConflictSeverity
  cooperationImpact: number
  institutionPressureTags: string[]
  signals: CivilizationConflictSignal[]
}

export type CivilizationPopulationSubjectKind = 'recruit' | 'witness' | 'specialist'

export type CivilizationPopulationLoyaltyBand = 'integrated' | 'conditional' | 'fractured'

export interface CivilizationPopulationInheritanceInput {
  subjectKind: CivilizationPopulationSubjectKind
  seed: number
  variantIndex?: number
}

export interface CivilizationPopulationInheritancePacket {
  packetId: string
  civilizationId: string
  civilizationCategory: CivilizationCategory
  subjectKind: CivilizationPopulationSubjectKind
  loyaltyBand: CivilizationPopulationLoyaltyBand
  expectationTags: string[]
  traitTags: string[]
  loyaltyTags: string[]
  conflictSurfaceTags: string[]
  resourceAffinityTags: string[]
}

export type CivilizationAccessBand = 'open' | 'conditional' | 'restricted'

export interface CivilizationAccessPacket {
  packetId: string
  civilizationId: string
  civilizationCategory: CivilizationCategory
  diplomaticBaseline: DiplomaticBaseline
  accessBand: CivilizationAccessBand
  accessScore: number
  resourceChannels: string[]
  knowledgeChannels: string[]
  frictionTags: string[]
}

export interface CivilizationAccessDifferential {
  pairId: string
  civilizationAId: string
  civilizationBId: string
  sharedResourceChannels: string[]
  onlyAResourceChannels: string[]
  onlyBResourceChannels: string[]
  onlyAKnowledgeChannels: string[]
  onlyBKnowledgeChannels: string[]
  accessScoreGap: number
}

export type CivilizationChangeVector =
  | 'corruption_pressure'
  | 'radicalization_pressure'
  | 'fragmentation_pressure'
  | 'reform_pressure'
  | 'alliance_shift_pressure'

export type CivilizationTrajectoryBand = 'stabilizing' | 'volatile' | 'fracturing'
export type CivilizationEvolutionPhase =
  | 'stable'
  | 'stressed'
  | 'corroding'
  | 'radicalizing'
  | 'fragmenting'
  | 'reforming'
  | 'realigning'

export interface CivilizationEvolutionInput {
  seed: number
  week: number
  pressure?: Partial<Record<CivilizationChangeVector, number>>
}

export interface CivilizationEvolutionSignal {
  vector: CivilizationChangeVector
  weight: number
  reason: string
  source: 'baseline' | 'category' | 'memory'
}

export interface CivilizationEvolutionPacket {
  packetId: string
  civilizationId: string
  week: number
  pressures: Record<CivilizationChangeVector, number>
  pressureScores: Record<CivilizationChangeVector, number>
  dominantChange: CivilizationChangeVector
  dominantDriver: CivilizationChangeVector
  stabilityScore: number
  trajectoryBand: CivilizationTrajectoryBand
  initialPhase: CivilizationEvolutionPhase
  resultingPhase: CivilizationEvolutionPhase
  significantChange: boolean
  downstreamChangeTags: string[]
  effectHints: {
    institutionPressureTags: string[]
    factionPressureTags: string[]
    campaignPressureTags: string[]
    cooperationDeltaHint: number
    riskScore: number
  }
  signals: CivilizationEvolutionSignal[]
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

const BASELINE_CONFLICT_PRESSURE: Record<DiplomaticBaseline, number> = {
  cooperative: 6,
  suspicious: 14,
  hostile: 30,
  dependent: 10,
  infiltrated: 22,
  exploitative: 18,
  secretly_aligned: 24,
}

const CATEGORY_PAIR_CONFLICTS: Record<string, { axis: CivilizationConflictAxis; weight: number; reason: string }> = {
  'criminal|government': {
    axis: 'jurisdiction_competition',
    weight: 28,
    reason: 'Civil enforcement and illicit network autonomy are structurally opposed.',
  },
  'occult|religious': {
    axis: 'ideological_collision',
    weight: 30,
    reason: 'Competing ritual authority and taboo systems generate recurring doctrinal conflict.',
  },
  'medical|occult': {
    axis: 'anomaly_governance',
    weight: 16,
    reason: 'Clinical safety doctrine collides with occult ritual tolerance and secrecy.',
  },
  'academic|rival_containment': {
    axis: 'secrecy_friction',
    weight: 14,
    reason: 'Archive transparency pressure conflicts with classified containment controls.',
  },
  'government|rival_containment': {
    axis: 'jurisdiction_competition',
    weight: 12,
    reason: 'Parallel authority structures compete over incident command and legal mandate.',
  },
  'government|nonhuman': {
    axis: 'anomaly_governance',
    weight: 18,
    reason: 'Human legal sovereignty and nonhuman threshold-law expectations diverge.',
  },
  'criminal|rival_containment': {
    axis: 'resource_competition',
    weight: 20,
    reason: 'Covert logistics interdiction creates persistent competition over routes and assets.',
  },
}

const AXIS_PRESSURE_TAGS: Record<CivilizationConflictAxis, string[]> = {
  jurisdiction_competition: ['institution:command-friction', 'institution:oversight-contest'],
  ideological_collision: ['institution:doctrine-friction', 'institution:legitimacy-contest'],
  resource_competition: ['institution:resource-contest', 'institution:supply-friction'],
  secrecy_friction: ['institution:archive-restriction', 'institution:disclosure-pressure'],
  anomaly_governance: ['institution:containment-policy-conflict', 'institution:threshold-friction'],
}

const POPULATION_CATEGORY_LOYALTY_TAGS: Record<CivilizationCategory, string> = {
  government: 'loyalty:civic-mandate',
  religious: 'loyalty:doctrinal-chain',
  medical: 'loyalty:care-obligation',
  academic: 'loyalty:knowledge-charter',
  criminal: 'loyalty:crew-code',
  occult: 'loyalty:rite-oath',
  rival_containment: 'loyalty:jurisdiction-chain',
  nonhuman: 'loyalty:threshold-compact',
}

const POPULATION_CATEGORY_CONFLICT_TAGS: Record<CivilizationCategory, string> = {
  government: 'conflict:oversight-liability',
  religious: 'conflict:heresy-risk',
  medical: 'conflict:ethical-breach-risk',
  academic: 'conflict:classification-disclosure-friction',
  criminal: 'conflict:law-enforcement-pressure',
  occult: 'conflict:exposure-risk',
  rival_containment: 'conflict:turf-contest',
  nonhuman: 'conflict:cross-threshold-friction',
}

const SUBJECT_EXPECTATION_TAGS: Record<CivilizationPopulationSubjectKind, string[]> = {
  recruit: ['expectation:chain-of-command', 'expectation:operational-discipline'],
  witness: ['expectation:narrative-self-protection', 'expectation:social-trust-filtering'],
  specialist: ['expectation:domain-rigor', 'expectation:institutional-gatekeeping'],
}

const CATEGORY_KNOWLEDGE_CHANNELS: Record<CivilizationCategory, string[]> = {
  government: ['jurisdiction-protocols', 'civic-command-structure'],
  religious: ['ritual-legitimacy', 'doctrinal-sanctions'],
  medical: ['clinical-triage', 'epidemic-surveillance'],
  academic: ['archive-research', 'peer-review-methods'],
  criminal: ['illicit-routing', 'counter-surveillance-tradecraft'],
  occult: ['esoteric-rites', 'anomaly-communion'],
  rival_containment: ['covert-containment-doctrine', 'classified-incident-response'],
  nonhuman: ['threshold-law', 'anomaly-node-cartography'],
}

const BASELINE_ACCESS_SCORE: Record<DiplomaticBaseline, number> = {
  cooperative: 72,
  suspicious: 54,
  hostile: 28,
  dependent: 64,
  infiltrated: 38,
  exploitative: 44,
  secretly_aligned: 34,
}

const BASELINE_EVOLUTION_PRESSURES: Record<
  DiplomaticBaseline,
  Record<CivilizationChangeVector, number>
> = {
  cooperative: {
    corruption_pressure: 6,
    radicalization_pressure: 4,
    fragmentation_pressure: 6,
    reform_pressure: 18,
    alliance_shift_pressure: 8,
  },
  suspicious: {
    corruption_pressure: 12,
    radicalization_pressure: 10,
    fragmentation_pressure: 12,
    reform_pressure: 10,
    alliance_shift_pressure: 14,
  },
  hostile: {
    corruption_pressure: 18,
    radicalization_pressure: 22,
    fragmentation_pressure: 16,
    reform_pressure: 4,
    alliance_shift_pressure: 10,
  },
  dependent: {
    corruption_pressure: 8,
    radicalization_pressure: 6,
    fragmentation_pressure: 10,
    reform_pressure: 14,
    alliance_shift_pressure: 18,
  },
  infiltrated: {
    corruption_pressure: 20,
    radicalization_pressure: 14,
    fragmentation_pressure: 14,
    reform_pressure: 6,
    alliance_shift_pressure: 16,
  },
  exploitative: {
    corruption_pressure: 18,
    radicalization_pressure: 10,
    fragmentation_pressure: 12,
    reform_pressure: 6,
    alliance_shift_pressure: 20,
  },
  secretly_aligned: {
    corruption_pressure: 16,
    radicalization_pressure: 20,
    fragmentation_pressure: 12,
    reform_pressure: 4,
    alliance_shift_pressure: 14,
  },
}

const CATEGORY_EVOLUTION_PRESSURE_MODIFIERS: Record<
  CivilizationCategory,
  Partial<Record<CivilizationChangeVector, number>>
> = {
  government: { reform_pressure: 5, corruption_pressure: 2 },
  religious: { radicalization_pressure: 6, reform_pressure: 2 },
  medical: { reform_pressure: 6, fragmentation_pressure: -2 },
  academic: { reform_pressure: 4, alliance_shift_pressure: 3 },
  criminal: { corruption_pressure: 8, alliance_shift_pressure: 5 },
  occult: { radicalization_pressure: 7, corruption_pressure: 4 },
  rival_containment: { alliance_shift_pressure: 6, fragmentation_pressure: 3 },
  nonhuman: { alliance_shift_pressure: 7, reform_pressure: 1 },
}

const CHANGE_VECTOR_ORDER: CivilizationChangeVector[] = [
  'corruption_pressure',
  'radicalization_pressure',
  'fragmentation_pressure',
  'reform_pressure',
  'alliance_shift_pressure',
]

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

function clampTension(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toCategoryPairKey(
  left: CivilizationCategory,
  right: CivilizationCategory
): string {
  return left.localeCompare(right) <= 0 ? `${left}|${right}` : `${right}|${left}`
}

function toCivilizationPairId(leftId: string, rightId: string): string {
  return leftId.localeCompare(rightId) <= 0 ? `${leftId}::${rightId}` : `${rightId}::${leftId}`
}

function toConflictSeverity(tensionScore: number): CivilizationConflictSeverity {
  if (tensionScore >= 60) {
    return 'high'
  }

  if (tensionScore >= 30) {
    return 'moderate'
  }

  return 'low'
}

function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function pickDeterministicTags(
  source: readonly string[],
  count: number,
  seed: number
): string[] {
  if (source.length === 0 || count <= 0) {
    return []
  }

  const rng = createSeededRng(seed)
  const pool = [...source]
  const picked: string[] = []
  const boundedCount = Math.min(count, pool.length)

  while (picked.length < boundedCount && pool.length > 0) {
    const idx = Math.floor(rng.next() * pool.length)
    picked.push(pool[idx]!)
    pool.splice(idx, 1)
  }

  return picked
}

function resolvePopulationLoyaltyBand(
  baseline: DiplomaticBaseline,
  state?: CivilizationState
): CivilizationPopulationLoyaltyBand {
  if (state) {
    if (state.cooperationBand === 'aligned') {
      return 'integrated'
    }

    if (state.cooperationBand === 'opposed') {
      return 'fractured'
    }

    return 'conditional'
  }

  if (baseline === 'cooperative' || baseline === 'dependent') {
    return 'integrated'
  }

  if (baseline === 'hostile' || baseline === 'secretly_aligned' || baseline === 'infiltrated') {
    return 'fractured'
  }

  return 'conditional'
}

function clampAccessScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function createZeroPressures(): Record<CivilizationChangeVector, number> {
  return {
    corruption_pressure: 0,
    radicalization_pressure: 0,
    fragmentation_pressure: 0,
    reform_pressure: 0,
    alliance_shift_pressure: 0,
  }
}

function clampEvolutionPressure(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function resolveDominantChange(
  pressures: Record<CivilizationChangeVector, number>
): CivilizationChangeVector {
  let best = CHANGE_VECTOR_ORDER[0]!
  let bestValue = pressures[best]

  for (let index = 1; index < CHANGE_VECTOR_ORDER.length; index += 1) {
    const candidate = CHANGE_VECTOR_ORDER[index]!
    const candidateValue = pressures[candidate]
    if (candidateValue > bestValue) {
      best = candidate
      bestValue = candidateValue
    }
  }

  return best
}

function resolveTrajectoryBand(stabilityScore: number): CivilizationTrajectoryBand {
  if (stabilityScore >= 55) {
    return 'stabilizing'
  }

  if (stabilityScore <= 34) {
    return 'fracturing'
  }

  return 'volatile'
}

function resolveInitialEvolutionPhase(
  civilization: CivilizationProfile,
  state?: CivilizationState
): CivilizationEvolutionPhase {
  if (!state) {
    return civilization.diplomaticBaseline === 'hostile' || civilization.diplomaticBaseline === 'infiltrated'
      ? 'stressed'
      : 'stable'
  }

  if (state.cooperationBand === 'opposed' || state.memoryPressure >= 35) {
    return 'stressed'
  }

  return 'stable'
}

function mapDominantDriverToPhase(driver: CivilizationChangeVector): CivilizationEvolutionPhase {
  switch (driver) {
    case 'corruption_pressure':
      return 'corroding'
    case 'radicalization_pressure':
      return 'radicalizing'
    case 'fragmentation_pressure':
      return 'fragmenting'
    case 'reform_pressure':
      return 'reforming'
    case 'alliance_shift_pressure':
      return 'realigning'
    default:
      return 'stressed'
  }
}

function deriveEvolutionHintTags(driver: CivilizationChangeVector): {
  institutionPressureTags: string[]
  factionPressureTags: string[]
  campaignPressureTags: string[]
  cooperationDeltaHint: number
} {
  switch (driver) {
    case 'corruption_pressure':
      return {
        institutionPressureTags: ['institution:integrity-erosion', 'institution:oversight-capture-risk'],
        factionPressureTags: ['faction:trust-decay', 'faction:coercive-patronage-risk'],
        campaignPressureTags: ['campaign:legitimacy-drain', 'campaign:compliance-friction'],
        cooperationDeltaHint: -8,
      }
    case 'radicalization_pressure':
      return {
        institutionPressureTags: ['institution:doctrine-hardening', 'institution:dissent-suppression'],
        factionPressureTags: ['faction:polarization', 'faction:escalation-risk'],
        campaignPressureTags: ['campaign:volatility-spike', 'campaign:incident-severity-bias'],
        cooperationDeltaHint: -10,
      }
    case 'fragmentation_pressure':
      return {
        institutionPressureTags: ['institution:branch-fracture', 'institution:chain-of-command-gaps'],
        factionPressureTags: ['faction:split-loyalties', 'faction:coordination-failure'],
        campaignPressureTags: ['campaign:coverage-gaps', 'campaign:response-latency'],
        cooperationDeltaHint: -6,
      }
    case 'reform_pressure':
      return {
        institutionPressureTags: ['institution:process-rewrite', 'institution:oversight-renewal'],
        factionPressureTags: ['faction:policy-reset', 'faction:realignment-dialogue'],
        campaignPressureTags: ['campaign:stability-recovery', 'campaign:access-normalization'],
        cooperationDeltaHint: 7,
      }
    case 'alliance_shift_pressure':
      return {
        institutionPressureTags: ['institution:partnership-rewiring', 'institution:mandate-reprioritization'],
        factionPressureTags: ['faction:bloc-shift', 'faction:jurisdiction-rebalance'],
        campaignPressureTags: ['campaign:diplomacy-reweighting', 'campaign:route-realignment'],
        cooperationDeltaHint: 3,
      }
    default:
      return {
        institutionPressureTags: [],
        factionPressureTags: [],
        campaignPressureTags: [],
        cooperationDeltaHint: 0,
      }
  }
}

function resolveAccessBand(score: number): CivilizationAccessBand {
  if (score >= 65) {
    return 'open'
  }

  if (score >= 40) {
    return 'conditional'
  }

  return 'restricted'
}

function toTaggedChannels(prefix: 'resource' | 'knowledge', entries: readonly string[]): string[] {
  return entries.map((entry) => `${prefix}:${toSlug(entry)}`)
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function difference(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right)
  return left.filter((value) => !rightSet.has(value))
}

function intersection(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
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

/**
 * Deterministically derive macro-conflict/tension between two civilizations.
 * Uses category pairing, diplomatic baselines, and optional memory/cooperation state.
 */
export function deriveCivilizationPairConflict(
  civilizationA: CivilizationProfile,
  civilizationB: CivilizationProfile,
  stateA?: CivilizationState,
  stateB?: CivilizationState
): CivilizationPairConflict {
  const signals: CivilizationConflictSignal[] = []
  const categoryPairKey = toCategoryPairKey(civilizationA.category, civilizationB.category)
  const pairConflict = CATEGORY_PAIR_CONFLICTS[categoryPairKey]

  if (pairConflict) {
    signals.push({
      axis: pairConflict.axis,
      weight: pairConflict.weight,
      reason: pairConflict.reason,
      source: 'category',
    })
  }

  const baselineWeight = Math.round(
    (BASELINE_CONFLICT_PRESSURE[civilizationA.diplomaticBaseline] +
      BASELINE_CONFLICT_PRESSURE[civilizationB.diplomaticBaseline]) /
      2
  )

  if (baselineWeight > 0) {
    signals.push({
      axis: 'secrecy_friction',
      weight: baselineWeight,
      reason: 'Diplomatic baseline posture contributes persistent inter-civilization caution pressure.',
      source: 'baseline',
    })
  }

  const memoryStates = [stateA, stateB].filter((state): state is CivilizationState => Boolean(state))
  if (memoryStates.length > 0) {
    const memoryPressureWeight = memoryStates.reduce((sum, state) => {
      if (state.memoryPressure >= 40) {
        return sum + 16
      }
      if (state.memoryPressure >= 20) {
        return sum + 8
      }
      return sum
    }, 0)

    const opposedWeight = memoryStates.some((state) => state.cooperationBand === 'opposed') ? 12 : 0
    const alignedReduction = memoryStates.every((state) => state.cooperationBand === 'aligned') ? -10 : 0
    const cooperationDistanceWeight = memoryStates.reduce((sum, state) => {
      if (state.cooperation <= 35) {
        return sum + 10
      }
      if (state.cooperation >= 65) {
        return sum - 4
      }
      return sum + 2
    }, 0)

    const memoryWeight = memoryPressureWeight + opposedWeight + alignedReduction + cooperationDistanceWeight
    if (memoryWeight !== 0) {
      signals.push({
        axis: 'resource_competition',
        weight: memoryWeight,
        reason:
          'Remembered pressure and cooperation stance shift conflict intensity in predictable ways.',
        source: 'memory',
      })
    }
  }

  const tensionScore = clampTension(signals.reduce((sum, signal) => sum + signal.weight, 0))
  const severity = toConflictSeverity(tensionScore)
  const cooperationImpact = -Math.max(0, Math.round(tensionScore / 10))

  const institutionPressureTags = Array.from(
    new Set(
      signals.flatMap((signal) => AXIS_PRESSURE_TAGS[signal.axis])
    )
  ).sort((left, right) => left.localeCompare(right))

  return {
    pairId: toCivilizationPairId(civilizationA.id, civilizationB.id),
    civilizationAId: civilizationA.id,
    civilizationBId: civilizationB.id,
    tensionScore,
    severity,
    cooperationImpact,
    institutionPressureTags,
    signals,
  }
}

/**
 * Build deterministic pairwise conflict list for a civilization set.
 * Output is sorted by tension desc, then pairId asc for stable debugging.
 */
export function deriveCivilizationPairConflicts(
  civilizations: readonly CivilizationProfile[],
  statesByCivilizationId: Readonly<Record<string, CivilizationState | undefined>> = {}
): CivilizationPairConflict[] {
  const conflicts: CivilizationPairConflict[] = []

  for (let i = 0; i < civilizations.length; i++) {
    const left = civilizations[i]!
    for (let j = i + 1; j < civilizations.length; j++) {
      const right = civilizations[j]!
      conflicts.push(
        deriveCivilizationPairConflict(
          left,
          right,
          statesByCivilizationId[left.id],
          statesByCivilizationId[right.id]
        )
      )
    }
  }

  return conflicts.sort((left, right) => {
    if (left.tensionScore !== right.tensionScore) {
      return right.tensionScore - left.tensionScore
    }
    return left.pairId.localeCompare(right.pairId)
  })
}

/**
 * Derive a compact deterministic inheritance packet for a civilization-linked
 * recruit, witness, or specialist profile.
 */
export function deriveCivilizationPopulationInheritance(
  civilization: CivilizationProfile,
  input: CivilizationPopulationInheritanceInput,
  state?: CivilizationState
): CivilizationPopulationInheritancePacket {
  const variantIndex = Math.max(0, input.variantIndex ?? 0)
  const mixSeed = hashText(`${civilization.id}:${input.subjectKind}:${input.seed}:${variantIndex}`)

  const expectationSources = [
    ...SUBJECT_EXPECTATION_TAGS[input.subjectKind],
    ...civilization.culturePacket.toleratedBehaviors.map((entry) => `expectation:tolerates-${toSlug(entry)}`),
  ]

  const traitSources = [
    ...civilization.culturePacket.ethics.map((entry) => `trait:ethic-${toSlug(entry)}`),
    `trait:naming-style-${toSlug(civilization.culturePacket.namingStyle)}`,
  ]

  const tabooConflictSources = civilization.culturePacket.taboos.map(
    (entry) => `conflict:taboo-${toSlug(entry)}`
  )

  const loyaltyBand = resolvePopulationLoyaltyBand(civilization.diplomaticBaseline, state)
  const cooperationLoyaltyTag =
    loyaltyBand === 'integrated'
      ? 'loyalty:agency-compatible'
      : loyaltyBand === 'fractured'
        ? 'loyalty:agency-resistant'
        : 'loyalty:agency-conditional'

  const loyaltyTags = Array.from(
    new Set([
      POPULATION_CATEGORY_LOYALTY_TAGS[civilization.category],
      cooperationLoyaltyTag,
      `loyalty:baseline-${civilization.diplomaticBaseline}`,
    ])
  ).sort((left, right) => left.localeCompare(right))

  const conflictSurfaceTags = Array.from(
    new Set([
      POPULATION_CATEGORY_CONFLICT_TAGS[civilization.category],
      ...pickDeterministicTags(tabooConflictSources, 2, mixSeed + 11),
      ...(state && state.memoryPressure >= 20 ? ['conflict:memory-grievance'] : []),
      ...(state && state.cooperationBand === 'opposed' ? ['conflict:retaliatory-posture'] : []),
    ])
  ).sort((left, right) => left.localeCompare(right))

  const expectationTags = Array.from(
    new Set(pickDeterministicTags(expectationSources, 3, mixSeed + 17))
  ).sort((left, right) => left.localeCompare(right))

  const traitTags = Array.from(new Set(pickDeterministicTags(traitSources, 3, mixSeed + 23))).sort(
    (left, right) => left.localeCompare(right)
  )

  const resourceAffinityTags = Array.from(
    new Set(
      pickDeterministicTags(civilization.resourceAccess, 2, mixSeed + 29).map(
        (entry) => `resource-affinity:${toSlug(entry)}`
      )
    )
  ).sort((left, right) => left.localeCompare(right))

  return {
    packetId: `${civilization.id}:${input.subjectKind}:${input.seed}:${variantIndex}`,
    civilizationId: civilization.id,
    civilizationCategory: civilization.category,
    subjectKind: input.subjectKind,
    loyaltyBand,
    expectationTags,
    traitTags,
    loyaltyTags,
    conflictSurfaceTags,
    resourceAffinityTags,
  }
}

/**
 * Derive deterministic civilization-specific resource/knowledge access packet.
 * Optional civilization state can modulate access score and friction tags.
 */
export function deriveCivilizationAccessPacket(
  civilization: CivilizationProfile,
  state?: CivilizationState
): CivilizationAccessPacket {
  const resourceChannels = uniqueSorted(toTaggedChannels('resource', civilization.resourceAccess))

  const knowledgeChannels = uniqueSorted([
    ...toTaggedChannels('knowledge', CATEGORY_KNOWLEDGE_CHANNELS[civilization.category]),
    ...toTaggedChannels('knowledge', civilization.culturePacket.ethics.map((ethic) => `ethic-${ethic}`)),
    ...toTaggedChannels(
      'knowledge',
      civilization.culturePacket.toleratedBehaviors.map((behavior) => `behavior-${behavior}`)
    ),
  ])

  const tabooFrictionTags = civilization.culturePacket.taboos
    .slice(0, 2)
    .map((taboo) => `access-friction:taboo-${toSlug(taboo)}`)

  let accessScore = BASELINE_ACCESS_SCORE[civilization.diplomaticBaseline]
  const frictionTags: string[] = [...tabooFrictionTags]

  if (state) {
    accessScore += Math.round((state.cooperation - 50) * 0.35)
    accessScore -= Math.min(20, Math.floor(state.memoryPressure / 3))

    if (state.cooperationBand === 'opposed') {
      frictionTags.push('access-friction:retaliatory-screening')
    }

    if (state.memoryPressure >= 20) {
      frictionTags.push('access-friction:memory-review-gate')
    }
  }

  const normalizedScore = clampAccessScore(accessScore)

  return {
    packetId: `${civilization.id}:access:v1`,
    civilizationId: civilization.id,
    civilizationCategory: civilization.category,
    diplomaticBaseline: civilization.diplomaticBaseline,
    accessBand: resolveAccessBand(normalizedScore),
    accessScore: normalizedScore,
    resourceChannels,
    knowledgeChannels,
    frictionTags: uniqueSorted(frictionTags),
  }
}

/**
 * Build deterministic access differential between two civilizations.
 * Intended for downstream institution/faction/campaign consumers.
 */
export function deriveCivilizationAccessDifferential(
  civilizationA: CivilizationProfile,
  civilizationB: CivilizationProfile,
  stateA?: CivilizationState,
  stateB?: CivilizationState
): CivilizationAccessDifferential {
  const accessA = deriveCivilizationAccessPacket(civilizationA, stateA)
  const accessB = deriveCivilizationAccessPacket(civilizationB, stateB)

  return {
    pairId: toCivilizationPairId(civilizationA.id, civilizationB.id),
    civilizationAId: civilizationA.id,
    civilizationBId: civilizationB.id,
    sharedResourceChannels: intersection(accessA.resourceChannels, accessB.resourceChannels),
    onlyAResourceChannels: difference(accessA.resourceChannels, accessB.resourceChannels),
    onlyBResourceChannels: difference(accessB.resourceChannels, accessA.resourceChannels),
    onlyAKnowledgeChannels: difference(accessA.knowledgeChannels, accessB.knowledgeChannels),
    onlyBKnowledgeChannels: difference(accessB.knowledgeChannels, accessA.knowledgeChannels),
    accessScoreGap: accessA.accessScore - accessB.accessScore,
  }
}

/**
 * Derive deterministic civilization evolution/change pressures.
 * Outputs compact downstream-ready pressure vectors and trajectory state.
 */
export function deriveCivilizationEvolutionPacket(
  civilization: CivilizationProfile,
  input: CivilizationEvolutionInput,
  state?: CivilizationState
): CivilizationEvolutionPacket {
  const rng = createSeededRng(hashText(`${civilization.id}:${input.seed}:${input.week}`))
  const signals: CivilizationEvolutionSignal[] = []
  const pressures = createZeroPressures()

  const baselinePressures = BASELINE_EVOLUTION_PRESSURES[civilization.diplomaticBaseline]
  for (const vector of CHANGE_VECTOR_ORDER) {
    const weight = baselinePressures[vector]
    pressures[vector] += weight
    signals.push({
      vector,
      weight,
      reason: 'Baseline diplomatic posture contributes stable evolution pressure.',
      source: 'baseline',
    })
  }

  const categoryModifiers = CATEGORY_EVOLUTION_PRESSURE_MODIFIERS[civilization.category]
  for (const vector of CHANGE_VECTOR_ORDER) {
    const weight = categoryModifiers[vector] ?? 0
    if (weight === 0) {
      continue
    }

    pressures[vector] += weight
    signals.push({
      vector,
      weight,
      reason: 'Civilization category structure adds deterministic change bias.',
      source: 'category',
    })
  }

  for (const vector of CHANGE_VECTOR_ORDER) {
    const overrideWeight = Math.round(input.pressure?.[vector] ?? 0)
    if (overrideWeight === 0) {
      continue
    }

    pressures[vector] += overrideWeight
    signals.push({
      vector,
      weight: overrideWeight,
      reason: 'Explicit bounded change pressure input was applied.',
      source: 'category',
    })
  }

  // Deterministic bounded jitter so evolution packets with different seeds diverge
  // while staying legible and repeatable.
  for (const vector of CHANGE_VECTOR_ORDER) {
    const jitter = Math.floor(rng.next() * 4)
    if (jitter === 0) {
      continue
    }

    pressures[vector] += jitter
    signals.push({
      vector,
      weight: jitter,
      reason: 'Seeded micro-variance adjusts pressure while preserving deterministic replay.',
      source: 'category',
    })
  }

  if (state) {
    const memoryCorruption = Math.floor(state.memoryPressure / 4)
    const fragmentationShift =
      state.cooperationBand === 'opposed' ? 14 : state.cooperationBand === 'watchful' ? 6 : -4
    const radicalizationShift = state.cooperation <= 35 ? 10 : 0
    const reformShift =
      state.cooperation >= 65 ? 10 : state.cooperationBand === 'opposed' ? -8 : 0
    const allianceShift = Math.round(Math.abs(state.cooperation - 50) / 5)

    const memoryAdjustments: Partial<Record<CivilizationChangeVector, number>> = {
      corruption_pressure: memoryCorruption,
      fragmentation_pressure: fragmentationShift,
      radicalization_pressure: radicalizationShift,
      reform_pressure: reformShift,
      alliance_shift_pressure: allianceShift,
    }

    for (const vector of CHANGE_VECTOR_ORDER) {
      const weight = memoryAdjustments[vector] ?? 0
      if (weight === 0) {
        continue
      }

      pressures[vector] += weight
      signals.push({
        vector,
        weight,
        reason: 'Memory pressure and cooperation stance modulate evolution trajectory.',
        source: 'memory',
      })
    }

    if (state.memoryPressure <= 8 && state.cooperationBand === 'aligned') {
      pressures.reform_pressure += 6
      pressures.corruption_pressure -= 4
      signals.push({
        vector: 'reform_pressure',
        weight: 6,
        reason: 'Aligned low-pressure state adds stabilizing reform momentum.',
        source: 'memory',
      })
      signals.push({
        vector: 'corruption_pressure',
        weight: -4,
        reason: 'Aligned low-pressure state suppresses corruption drift.',
        source: 'memory',
      })
    }
  }

  for (const vector of CHANGE_VECTOR_ORDER) {
    pressures[vector] = clampEvolutionPressure(pressures[vector])
  }

  const dominantChange = resolveDominantChange(pressures)
  const dominantDriver = dominantChange
  const maxPressure = pressures[dominantDriver]
  const stabilityScore = clampAccessScore(
    72 -
      pressures.fragmentation_pressure -
      Math.round(pressures.radicalization_pressure * 0.5) -
      Math.round(pressures.corruption_pressure * 0.35) +
      Math.round(pressures.reform_pressure * 0.4) -
      Math.max(0, pressures.alliance_shift_pressure - 20)
  )

  const initialPhase = resolveInitialEvolutionPhase(civilization, state)
  const significantChange =
    maxPressure >= CIVILIZATION_EVOLUTION_CALIBRATION.significantChangeThreshold
  const resultingPhase = significantChange
    ? mapDominantDriverToPhase(dominantDriver)
    : initialPhase === 'stable'
      ? 'stressed'
      : initialPhase

  const downstreamChangeTags = uniqueSorted([
    `change:dominant-${dominantChange.replace('_pressure', '')}`,
    `change:trajectory-${resolveTrajectoryBand(stabilityScore)}`,
    ...(pressures.corruption_pressure >= 25 ? ['change:corruption-watch'] : []),
    ...(pressures.radicalization_pressure >= 25 ? ['change:radicalization-watch'] : []),
    ...(pressures.fragmentation_pressure >= 25 ? ['change:fragmentation-watch'] : []),
    ...(pressures.reform_pressure >= 25 ? ['change:reform-window'] : []),
    ...(pressures.alliance_shift_pressure >= 25 ? ['change:alliance-realignment-window'] : []),
  ])

  const hintTags = deriveEvolutionHintTags(dominantDriver)

  return {
    packetId: `${civilization.id}:evolution:${input.week}:${input.seed}`,
    civilizationId: civilization.id,
    week: input.week,
    pressures,
    pressureScores: { ...pressures },
    dominantChange,
    dominantDriver,
    stabilityScore,
    trajectoryBand: resolveTrajectoryBand(stabilityScore),
    initialPhase,
    resultingPhase,
    significantChange,
    downstreamChangeTags,
    effectHints: {
      institutionPressureTags: hintTags.institutionPressureTags.slice(
        0,
        CIVILIZATION_EVOLUTION_CALIBRATION.topTagCount
      ),
      factionPressureTags: hintTags.factionPressureTags.slice(
        0,
        CIVILIZATION_EVOLUTION_CALIBRATION.topTagCount
      ),
      campaignPressureTags: hintTags.campaignPressureTags.slice(
        0,
        CIVILIZATION_EVOLUTION_CALIBRATION.topTagCount
      ),
      cooperationDeltaHint: hintTags.cooperationDeltaHint,
      riskScore: clampAccessScore(100 - stabilityScore),
    },
    signals,
  }
}
