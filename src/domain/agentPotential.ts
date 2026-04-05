import { clamp } from './math'
import {
  BASE_STAT_MAX,
  type Agent,
  type AgentProgression,
  type ExactPotentialTier,
  type PotentialIntel,
  type PotentialIntelConfidence,
  type PotentialIntelSource,
  type PotentialTier,
  type StatBlock,
  type StatKey,
} from './models'

export type LivePotentialTier = ExactPotentialTier

const LIVE_POTENTIAL_TIERS = [
  'F',
  'D',
  'C',
  'B',
  'A',
  'S',
] as const satisfies readonly LivePotentialTier[]
const STAT_PRIORITY: StatKey[] = ['combat', 'investigation', 'utility', 'social']
const POTENTIAL_DISCOVERY_MEDIUM_THRESHOLD = 35
const POTENTIAL_DISCOVERY_HIGH_THRESHOLD = 70
const POTENTIAL_DISCOVERY_CONFIRM_THRESHOLD = 100

const TIER_FLOOR_TARGETS: Record<LivePotentialTier, number> = {
  F: 52,
  D: 60,
  C: 68,
  B: 76,
  A: 84,
  S: 92,
}

const TIER_HEADROOM_TARGETS: Record<LivePotentialTier, number> = {
  F: 4,
  D: 6,
  C: 8,
  B: 10,
  A: 12,
  S: 14,
}

const PROFILE_RANK_ADJUSTMENTS: Record<string, readonly number[]> = {
  balanced: [8, 4, 0, -2],
  steady: [6, 4, 2, 0],
  specialist: [12, 6, 0, -4],
  adaptive: [7, 5, 3, 1],
  volatile: [14, 6, -2, -6],
}

function isLivePotentialTier(value: string | undefined): value is LivePotentialTier {
  return LIVE_POTENTIAL_TIERS.includes(value as LivePotentialTier)
}

function getPotentialTierIndex(tier: LivePotentialTier) {
  return LIVE_POTENTIAL_TIERS.indexOf(tier)
}

function normalizePotentialIntelConfidence(
  confidence: PotentialIntelConfidence | undefined,
  exactKnown: boolean
): PotentialIntelConfidence {
  if (exactKnown) {
    return 'confirmed'
  }

  if (
    confidence === 'low' ||
    confidence === 'medium' ||
    confidence === 'high' ||
    confidence === 'unknown'
  ) {
    return confidence
  }

  return 'unknown'
}

function trimPotentialDiscoveryProgress(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return clamp(Math.round(value), 0, POTENTIAL_DISCOVERY_CONFIRM_THRESHOLD)
}

function describePotentialObservationSource(
  source: Exclude<PotentialIntelSource, 'recruitment_scout' | 'academy_record' | 'breakthrough'>
) {
  return source === 'training' ? 'Training feedback' : 'Mission performance'
}

function normalizeLegacyPotentialTier(
  tier: 'low' | 'mid' | 'high',
  scoreHint: number
): LivePotentialTier {
  if (tier === 'high') {
    return scoreHint >= 82 ? 'S' : 'A'
  }

  if (tier === 'mid') {
    return scoreHint >= 60 ? 'B' : 'C'
  }

  return scoreHint >= 46 ? 'D' : 'F'
}

function getScoreHint(baseStats: Partial<StatBlock> | undefined, overallScore?: number) {
  if (typeof overallScore === 'number' && Number.isFinite(overallScore)) {
    return overallScore
  }

  if (!baseStats) {
    return 50
  }

  const values = STAT_PRIORITY.map((stat) => baseStats[stat]).filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )

  if (values.length === 0) {
    return 50
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getRankAdjustments(growthProfile: string | undefined) {
  const normalizedProfile = growthProfile?.trim().toLowerCase() ?? 'balanced'
  return PROFILE_RANK_ADJUSTMENTS[normalizedProfile] ?? PROFILE_RANK_ADJUSTMENTS.balanced
}

function getRankedStats(baseStats: StatBlock) {
  return [...STAT_PRIORITY].sort((left, right) => {
    return (
      baseStats[right] - baseStats[left] ||
      STAT_PRIORITY.indexOf(left) - STAT_PRIORITY.indexOf(right)
    )
  })
}

export function normalizePotentialTier(
  potentialTier: PotentialTier | undefined,
  baseStats?: Partial<StatBlock>,
  overallScore?: number
): LivePotentialTier {
  if (isLivePotentialTier(potentialTier)) {
    return potentialTier
  }

  if (potentialTier === 'low' || potentialTier === 'mid' || potentialTier === 'high') {
    return normalizeLegacyPotentialTier(potentialTier, getScoreHint(baseStats, overallScore))
  }

  return 'C'
}

export function scoreToExactPotentialTier(score: number): LivePotentialTier {
  const clampedScore = clamp(Math.round(score), 0, 100)

  if (clampedScore >= 90) {
    return 'S'
  }

  if (clampedScore >= 80) {
    return 'A'
  }

  if (clampedScore >= 68) {
    return 'B'
  }

  if (clampedScore >= 56) {
    return 'C'
  }

  if (clampedScore >= 44) {
    return 'D'
  }

  return 'F'
}

export function shiftPotentialTier(tier: LivePotentialTier, offset: number): LivePotentialTier {
  const currentIndex = getPotentialTierIndex(tier)
  return (
    LIVE_POTENTIAL_TIERS[
      clamp(currentIndex + Math.trunc(offset), 0, LIVE_POTENTIAL_TIERS.length - 1)
    ] ?? tier
  )
}

export function stepPotentialTierToward(
  current: LivePotentialTier,
  target: LivePotentialTier
): LivePotentialTier {
  const currentIndex = getPotentialTierIndex(current)
  const targetIndex = getPotentialTierIndex(target)

  if (currentIndex === targetIndex) {
    return current
  }

  return LIVE_POTENTIAL_TIERS[currentIndex + Math.sign(targetIndex - currentIndex)] ?? target
}

export function normalizePotentialIntel(
  intel: PotentialIntel | undefined,
  actualTier: PotentialTier | undefined
): PotentialIntel {
  const resolvedActualTier = normalizePotentialTier(actualTier)
  const exactKnown = Boolean(intel?.exactKnown || intel?.confidence === 'confirmed')
  const visibleTier = exactKnown
    ? resolvedActualTier
    : isLivePotentialTier(intel?.visibleTier)
      ? intel.visibleTier
      : undefined

  return {
    ...(visibleTier ? { visibleTier } : {}),
    exactKnown,
    confidence: normalizePotentialIntelConfidence(intel?.confidence, exactKnown),
    discoveryProgress: trimPotentialDiscoveryProgress(intel?.discoveryProgress),
    ...(intel?.source ? { source: intel.source } : {}),
    ...(typeof intel?.lastUpdatedWeek === 'number' && Number.isFinite(intel.lastUpdatedWeek)
      ? { lastUpdatedWeek: Math.max(1, Math.trunc(intel.lastUpdatedWeek)) }
      : {}),
  }
}

export function createRecruitmentScoutIntel(
  projectedTier: LivePotentialTier,
  confidence: Exclude<PotentialIntelConfidence, 'unknown'>,
  week: number,
  exactKnown = false
): PotentialIntel {
  const confirmed = exactKnown || confidence === 'confirmed'

  return normalizePotentialIntel(
    {
      visibleTier: projectedTier,
      exactKnown: confirmed,
      confidence: confirmed ? 'confirmed' : confidence,
      discoveryProgress: confirmed
        ? 100
        : confidence === 'high'
          ? 70
          : confidence === 'medium'
            ? 45
            : 25,
      source: 'recruitment_scout',
      lastUpdatedWeek: week,
    },
    projectedTier
  )
}

function buildPotentialObservationNote(
  previousIntel: PotentialIntel,
  nextIntel: PotentialIntel,
  actualTier: LivePotentialTier,
  source: Exclude<PotentialIntelSource, 'recruitment_scout' | 'academy_record' | 'breakthrough'>
) {
  const sourceLabel = describePotentialObservationSource(source)

  if (!previousIntel.exactKnown && nextIntel.exactKnown) {
    return `${sourceLabel} confirmed ${actualTier}-tier potential.`
  }

  if (!previousIntel.visibleTier && nextIntel.visibleTier) {
    return `${sourceLabel} revealed projected ${nextIntel.visibleTier}-tier potential.`
  }

  if (
    previousIntel.visibleTier &&
    nextIntel.visibleTier &&
    previousIntel.visibleTier !== nextIntel.visibleTier
  ) {
    return `${sourceLabel} revised projected potential to ${nextIntel.visibleTier} tier.`
  }

  return undefined
}

export function observePotentialIntel(
  progression: AgentProgression,
  options: {
    week: number
    source: Exclude<PotentialIntelSource, 'recruitment_scout' | 'academy_record' | 'breakthrough'>
    discoveryDelta: number
  }
): { potentialIntel: PotentialIntel; note?: string } {
  const actualTier = normalizePotentialTier(progression.potentialTier)
  const previousIntel = normalizePotentialIntel(progression.potentialIntel, actualTier)
  const nextDiscoveryProgress = clamp(
    (previousIntel.discoveryProgress ?? 0) + Math.max(0, Math.round(options.discoveryDelta)),
    0,
    POTENTIAL_DISCOVERY_CONFIRM_THRESHOLD
  )

  let nextIntel: PotentialIntel = {
    ...previousIntel,
    discoveryProgress: nextDiscoveryProgress,
    source: options.source,
    lastUpdatedWeek: options.week,
  }

  if (nextDiscoveryProgress >= POTENTIAL_DISCOVERY_CONFIRM_THRESHOLD) {
    nextIntel = {
      ...nextIntel,
      visibleTier: actualTier,
      exactKnown: true,
      confidence: 'confirmed',
    }
  } else if (nextDiscoveryProgress >= POTENTIAL_DISCOVERY_HIGH_THRESHOLD) {
    nextIntel = {
      ...nextIntel,
      visibleTier: actualTier,
      exactKnown: false,
      confidence: 'high',
    }
  } else if (nextDiscoveryProgress >= POTENTIAL_DISCOVERY_MEDIUM_THRESHOLD) {
    nextIntel = {
      ...nextIntel,
      visibleTier: previousIntel.visibleTier
        ? stepPotentialTierToward(previousIntel.visibleTier, actualTier)
        : actualTier,
      exactKnown: false,
      confidence: 'medium',
    }
  } else if (previousIntel.visibleTier) {
    nextIntel = {
      ...nextIntel,
      visibleTier: previousIntel.visibleTier,
      exactKnown: false,
      confidence:
        previousIntel.confidence === 'unknown'
          ? 'low'
          : previousIntel.confidence === 'confirmed'
            ? 'high'
            : previousIntel.confidence,
    }
  } else {
    nextIntel = {
      ...nextIntel,
      exactKnown: false,
      confidence: 'unknown',
    }
  }

  const normalizedNextIntel = normalizePotentialIntel(nextIntel, actualTier)

  return {
    potentialIntel: normalizedNextIntel,
    note: buildPotentialObservationNote(
      previousIntel,
      normalizedNextIntel,
      actualTier,
      options.source
    ),
  }
}

export function getVisiblePotentialTier(
  progression: Pick<AgentProgression, 'potentialTier' | 'potentialIntel'>
): LivePotentialTier | undefined {
  const actualTier = normalizePotentialTier(progression.potentialTier)
  const intel = normalizePotentialIntel(progression.potentialIntel, actualTier)
  return intel.exactKnown ? actualTier : intel.visibleTier
}

export function applyPotentialBreakthrough(
  progression: AgentProgression,
  week: number
): { progression: AgentProgression; note?: string; changed: boolean } {
  const currentTier = normalizePotentialTier(progression.potentialTier)

  if (currentTier === 'S') {
    return {
      progression,
      changed: false,
    }
  }

  const nextTier = shiftPotentialTier(currentTier, 1)

  return {
    progression: {
      ...progression,
      potentialTier: nextTier,
      potentialIntel: normalizePotentialIntel(
        {
          visibleTier: nextTier,
          exactKnown: true,
          confidence: 'confirmed',
          discoveryProgress: POTENTIAL_DISCOVERY_CONFIRM_THRESHOLD,
          source: 'breakthrough',
          lastUpdatedWeek: week,
        },
        nextTier
      ),
    },
    note: `Exceptional progress triggered a breakthrough to ${nextTier}-tier potential.`,
    changed: true,
  }
}

export function buildAgentStatCaps(
  baseStats: StatBlock,
  potentialTier: PotentialTier | undefined,
  growthProfile: string | undefined,
  existingCaps?: Partial<StatBlock>,
  overallScore?: number
): StatBlock {
  const normalizedTier = normalizePotentialTier(potentialTier, baseStats, overallScore)
  const rankedStats = getRankedStats(baseStats)
  const rankAdjustments = getRankAdjustments(growthProfile)
  const generatedCaps = {} as StatBlock

  for (const [index, stat] of rankedStats.entries()) {
    const baseValue = baseStats[stat]
    const rankAdjustment = rankAdjustments[index] ?? 0
    const floorTarget = TIER_FLOOR_TARGETS[normalizedTier] + rankAdjustment
    const headroomTarget =
      baseValue + TIER_HEADROOM_TARGETS[normalizedTier] + Math.max(rankAdjustment, 0)

    generatedCaps[stat] = clamp(
      Math.max(baseValue, floorTarget, headroomTarget),
      baseValue,
      BASE_STAT_MAX
    )
  }

  for (const stat of STAT_PRIORITY) {
    const explicitCap = existingCaps?.[stat]

    if (typeof explicitCap === 'number' && Number.isFinite(explicitCap)) {
      generatedCaps[stat] = clamp(Math.round(explicitCap), baseStats[stat], BASE_STAT_MAX)
    }
  }

  return generatedCaps
}

export function getAgentStatCap(agent: Pick<Agent, 'baseStats' | 'progression'>, stat: StatKey) {
  const caps = buildAgentStatCaps(
    agent.baseStats,
    agent.progression?.potentialTier,
    agent.progression?.growthProfile,
    agent.progression?.statCaps
  )

  return caps[stat]
}

export function isAgentAtStatCap(agent: Pick<Agent, 'baseStats' | 'progression'>, stat: StatKey) {
  return agent.baseStats[stat] >= getAgentStatCap(agent, stat)
}
