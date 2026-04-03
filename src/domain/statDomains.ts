import {
  type Agent,
  type AgentRole,
  type CaseInstance,
  type DomainStats,
  type LegacyStatDomain,
  type RoleDomainWeights,
  type StatDomain,
  type StatBlock,
  type StatKey,
} from './models'

export type DomainStatPath =
  | 'physical.strength'
  | 'physical.endurance'
  | 'tactical.awareness'
  | 'tactical.reaction'
  | 'cognitive.analysis'
  | 'cognitive.investigation'
  | 'social.negotiation'
  | 'social.influence'
  | 'stability.resistance'
  | 'stability.tolerance'
  | 'technical.equipment'
  | 'technical.anomaly'

export interface StatDomainDefinition {
  name: StatDomain
  label: string
  stats: readonly DomainStatPath[]
  weightByRole: Record<AgentRole, number>
  weightByCaseStat: Partial<Record<StatKey, number>>
  contextTags?: readonly string[]
  durationBias?: {
    short?: number
    long?: number
  }
  raidBias?: number
}

const DOMAIN_STAT_PATH_VALUES: Record<DomainStatPath, (stats: DomainStats) => number> = {
  'physical.strength': (stats) => stats.physical.strength,
  'physical.endurance': (stats) => stats.physical.endurance,
  'tactical.awareness': (stats) => stats.tactical.awareness,
  'tactical.reaction': (stats) => stats.tactical.reaction,
  'cognitive.analysis': (stats) => stats.cognitive.analysis,
  'cognitive.investigation': (stats) => stats.cognitive.investigation,
  'social.negotiation': (stats) => stats.social.negotiation,
  'social.influence': (stats) => stats.social.influence,
  'stability.resistance': (stats) => stats.stability.resistance,
  'stability.tolerance': (stats) => stats.stability.tolerance,
  'technical.equipment': (stats) => stats.technical.equipment,
  'technical.anomaly': (stats) => stats.technical.anomaly,
}

const LEGACY_DOMAIN_PATHS: Record<LegacyStatDomain, readonly DomainStatPath[]> = {
  physical: ['physical.strength', 'physical.endurance'],
  tactical: ['tactical.awareness', 'tactical.reaction'],
  cognitive: ['cognitive.analysis', 'cognitive.investigation'],
  social: ['social.negotiation', 'social.influence'],
  stability: ['stability.resistance', 'stability.tolerance'],
  technical: ['technical.equipment', 'technical.anomaly'],
}

export const STAT_DOMAIN_DEFINITIONS = [
  {
    name: 'field',
    label: 'Field',
    stats: [
      'physical.strength',
      'physical.endurance',
      'tactical.awareness',
      'tactical.reaction',
    ],
    weightByRole: {
      hunter: 0.34,
      occultist: 0.06,
      investigator: 0.08,
      medium: 0.05,
      tech: 0.08,
      medic: 0.12,
      negotiator: 0.04,
    },
    weightByCaseStat: {
      combat: 0.75,
      utility: 0.15,
      investigation: 0.08,
      social: 0.02,
    },
    contextTags: ['threat', 'combat', 'breach', 'raid', 'outbreak', 'hunter'],
    durationBias: {
      short: 0.02,
    },
    raidBias: 0.06,
  },
  {
    name: 'resilience',
    label: 'Resilience',
    stats: ['physical.endurance', 'stability.resistance', 'stability.tolerance'],
    weightByRole: {
      hunter: 0.22,
      occultist: 0.12,
      investigator: 0.08,
      medium: 0.16,
      tech: 0.08,
      medic: 0.28,
      negotiator: 0.1,
    },
    weightByCaseStat: {
      combat: 0.25,
      utility: 0.25,
      investigation: 0.1,
      social: 0.05,
    },
    contextTags: ['survival', 'hazmat', 'exposure', 'endurance', 'bleed'],
    durationBias: {
      long: 0.12,
    },
    raidBias: 0.04,
  },
  {
    name: 'control',
    label: 'Control',
    stats: [
      'tactical.reaction',
      'technical.equipment',
      'technical.anomaly',
      'stability.tolerance',
    ],
    weightByRole: {
      hunter: 0.16,
      occultist: 0.18,
      investigator: 0.12,
      medium: 0.12,
      tech: 0.34,
      medic: 0.2,
      negotiator: 0.08,
    },
    weightByCaseStat: {
      combat: 0.1,
      utility: 0.55,
      investigation: 0.15,
      social: 0.05,
    },
    contextTags: ['containment', 'technical', 'tooling', 'seal', 'ward', 'ritual'],
  },
  {
    name: 'insight',
    label: 'Insight',
    stats: ['tactical.awareness', 'cognitive.analysis', 'cognitive.investigation'],
    weightByRole: {
      hunter: 0.1,
      occultist: 0.2,
      investigator: 0.42,
      medium: 0.18,
      tech: 0.18,
      medic: 0.12,
      negotiator: 0.2,
    },
    weightByCaseStat: {
      combat: 0.05,
      utility: 0.1,
      investigation: 0.65,
      social: 0.15,
    },
    contextTags: ['evidence', 'witness', 'analysis', 'archive', 'forensics', 'pattern'],
    durationBias: {
      long: 0.04,
    },
  },
  {
    name: 'presence',
    label: 'Presence',
    stats: ['social.negotiation', 'social.influence'],
    weightByRole: {
      hunter: 0.05,
      occultist: 0.08,
      investigator: 0.18,
      medium: 0.12,
      tech: 0.06,
      medic: 0.16,
      negotiator: 0.46,
    },
    weightByCaseStat: {
      combat: 0.02,
      utility: 0.03,
      investigation: 0.15,
      social: 0.75,
    },
    contextTags: ['witness', 'interview', 'negotiation', 'liaison', 'civilian', 'command'],
  },
  {
    name: 'anomaly',
    label: 'Anomaly',
    stats: ['technical.anomaly', 'cognitive.investigation', 'stability.resistance'],
    weightByRole: {
      hunter: 0.13,
      occultist: 0.36,
      investigator: 0.12,
      medium: 0.37,
      tech: 0.26,
      medic: 0.12,
      negotiator: 0.12,
    },
    weightByCaseStat: {
      combat: 0.08,
      utility: 0.35,
      investigation: 0.3,
      social: 0.05,
    },
    contextTags: ['anomaly', 'occult', 'ritual', 'spirit', 'psionic', 'ward'],
    durationBias: {
      long: 0.04,
    },
    raidBias: 0.02,
  },
] as const satisfies readonly StatDomainDefinition[]

export const STAT_DOMAINS = STAT_DOMAIN_DEFINITIONS.map(
  (definition) => definition.name
) as readonly StatDomain[]

const STAT_DOMAIN_DEFINITION_MAP = Object.fromEntries(
  STAT_DOMAIN_DEFINITIONS.map((definition) => [definition.name, definition])
) as unknown as Record<StatDomain, StatDomainDefinition>

const EMPTY_ROLE_DOMAIN_WEIGHTS: RoleDomainWeights = {
  field: 0,
  resilience: 0,
  control: 0,
  insight: 0,
  presence: 0,
  anomaly: 0,
}

const CASE_CONTEXT_WEIGHT_TAG_BONUS = 0.05
const ROLE_CONTEXT_BLEND = 0.7
const CASE_CONTEXT_BLEND = 1 - ROLE_CONTEXT_BLEND

function buildRoleDomainWeights(role: AgentRole): RoleDomainWeights {
  return STAT_DOMAIN_DEFINITIONS.reduce<RoleDomainWeights>(
    (weights, definition) => {
      weights[definition.name] = definition.weightByRole[role]
      return weights
    },
    { ...EMPTY_ROLE_DOMAIN_WEIGHTS }
  )
}

export const DEFAULT_ROLE_DOMAIN_WEIGHTS: Record<AgentRole, RoleDomainWeights> = {
  hunter: buildRoleDomainWeights('hunter'),
  occultist: buildRoleDomainWeights('occultist'),
  investigator: buildRoleDomainWeights('investigator'),
  medium: buildRoleDomainWeights('medium'),
  tech: buildRoleDomainWeights('tech'),
  medic: buildRoleDomainWeights('medic'),
  negotiator: buildRoleDomainWeights('negotiator'),
}

export const MAX_FATIGUE_STAT_REDUCTION = 0.25
export const MIN_FATIGUE_MULTIPLIER = 0.75
export const MAX_FATIGUE_MULTIPLIER = 1

export function deriveDomainStatsFromBase(baseStats: StatBlock): DomainStats {
  const combat = baseStats.combat
  const investigation = baseStats.investigation
  const utility = baseStats.utility
  const social = baseStats.social

  return {
    physical: {
      strength: combat,
      endurance: Math.round((combat + utility) / 2),
    },
    tactical: {
      awareness: Math.round((combat + investigation) / 2),
      reaction: utility,
    },
    cognitive: {
      analysis: investigation,
      investigation,
    },
    social: {
      negotiation: social,
      influence: social,
    },
    stability: {
      resistance: Math.round((investigation + social) / 2),
      tolerance: Math.round((utility + social) / 2),
    },
    technical: {
      equipment: utility,
      anomaly: Math.round((investigation + utility) / 2),
    },
  }
}

export function cloneDomainStats(stats: DomainStats): DomainStats {
  return {
    physical: { ...stats.physical },
    tactical: { ...stats.tactical },
    cognitive: { ...stats.cognitive },
    social: { ...stats.social },
    stability: { ...stats.stability },
    technical: { ...stats.technical },
  }
}

export function getDomainStatPaths(domain: StatDomain) {
  return STAT_DOMAIN_DEFINITION_MAP[domain].stats
}

export function getLegacyDomainStatPaths(domain: LegacyStatDomain) {
  return LEGACY_DOMAIN_PATHS[domain]
}

export function getDomainStatValue(stats: DomainStats, path: DomainStatPath) {
  return DOMAIN_STAT_PATH_VALUES[path](stats)
}

export function domainAverage(stats: DomainStats, domain: StatDomain) {
  const paths = getDomainStatPaths(domain)

  if (paths.length === 0) {
    return 0
  }

  return (
    paths.reduce((total, path) => total + getDomainStatValue(stats, path), 0) / paths.length
  )
}

export function getAgentDomainStats(agent: Pick<Agent, 'stats' | 'baseStats'>): DomainStats {
  return agent.stats ? cloneDomainStats(agent.stats) : deriveDomainStatsFromBase(agent.baseStats)
}

export function getRoleDomainWeights(role: AgentRole): RoleDomainWeights {
  return buildRoleDomainWeights(role)
}

export function normalizeRoleDomainWeights(
  weights: Partial<Record<StatDomain, number>>
): RoleDomainWeights {
  const sanitized = STAT_DOMAINS.reduce<RoleDomainWeights>((totals, domain) => {
    const value = weights[domain]
    totals[domain] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
    return totals
  }, { ...EMPTY_ROLE_DOMAIN_WEIGHTS })
  const total = STAT_DOMAINS.reduce((sum, domain) => sum + sanitized[domain], 0)

  if (total <= 0) {
    return {
      field: 1 / STAT_DOMAINS.length,
      resilience: 1 / STAT_DOMAINS.length,
      control: 1 / STAT_DOMAINS.length,
      insight: 1 / STAT_DOMAINS.length,
      presence: 1 / STAT_DOMAINS.length,
      anomaly: 1 / STAT_DOMAINS.length,
    }
  }

  return STAT_DOMAINS.reduce<RoleDomainWeights>((normalized, domain) => {
    normalized[domain] = sanitized[domain] / total
    return normalized
  }, { ...EMPTY_ROLE_DOMAIN_WEIGHTS })
}

function getCaseContextTags(caseData: CaseInstance | undefined) {
  if (!caseData) {
    return new Set<string>()
  }

  return new Set([
    ...caseData.tags,
    ...caseData.requiredTags,
    ...caseData.preferredTags,
  ])
}

export function buildCaseDomainWeights(caseData?: CaseInstance): RoleDomainWeights {
  if (!caseData) {
    return normalizeRoleDomainWeights({ ...EMPTY_ROLE_DOMAIN_WEIGHTS })
  }

  const caseTags = getCaseContextTags(caseData)
  const isLongCase = caseData.durationWeeks >= 3
  const isShortCase = caseData.durationWeeks <= 1

  return normalizeRoleDomainWeights(
    STAT_DOMAIN_DEFINITIONS.reduce<Partial<Record<StatDomain, number>>>((weights, definition) => {
      const durationBias: { short?: number; long?: number } =
        ('durationBias' in definition ? definition.durationBias : undefined) ?? {}
      const raidBias = 'raidBias' in definition ? definition.raidBias : undefined
      const statWeight = Object.entries(definition.weightByCaseStat).reduce(
        (total, [statKey, weight]) => total + caseData.weights[statKey as StatKey] * (weight ?? 0),
        0
      )
      const tagWeight =
        (definition.contextTags ?? []).filter((tag) => caseTags.has(tag)).length *
        CASE_CONTEXT_WEIGHT_TAG_BONUS
      const durationWeight = isLongCase
        ? durationBias?.long ?? 0
        : isShortCase
          ? durationBias?.short ?? 0
          : 0
      const raidWeight = caseData.kind === 'raid' ? raidBias ?? 0 : 0

      weights[definition.name] = statWeight + tagWeight + durationWeight + raidWeight
      return weights
    }, {})
  )
}

export function buildContextualRoleDomainWeights(
  role: AgentRole,
  caseData?: CaseInstance
): RoleDomainWeights {
  if (!caseData) {
    return getRoleDomainWeights(role)
  }

  const roleWeights = getRoleDomainWeights(role)
  const caseWeights = buildCaseDomainWeights(caseData)

  return normalizeRoleDomainWeights(
    STAT_DOMAINS.reduce<Partial<Record<StatDomain, number>>>((weights, domain) => {
      weights[domain] =
        roleWeights[domain] * ROLE_CONTEXT_BLEND + caseWeights[domain] * CASE_CONTEXT_BLEND
      return weights
    }, {})
  )
}

export function createEmptyDomainContribution(): Record<StatDomain, number> {
  return {
    field: 0,
    resilience: 0,
    control: 0,
    insight: 0,
    presence: 0,
    anomaly: 0,
  }
}

export function buildWeightedDomainContribution(
  stats: DomainStats,
  weights: RoleDomainWeights
): Record<StatDomain, number> {
  return STAT_DOMAIN_DEFINITIONS.reduce<Record<StatDomain, number>>((totals, definition) => {
    totals[definition.name] = domainAverage(stats, definition.name) * weights[definition.name]
    return totals
  }, createEmptyDomainContribution())
}

export function sumDomainContribution(contributionByDomain: Record<StatDomain, number>) {
  return STAT_DOMAINS.reduce((total, domain) => total + contributionByDomain[domain], 0)
}
