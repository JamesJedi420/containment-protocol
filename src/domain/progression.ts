import { createDefaultAgentSkillTree } from './agentDefaults'
import { getRoleDomainWeights, normalizeRoleDomainWeights, STAT_DOMAINS } from './statDomains'
import type { Agent, AgentGrowthStats, AgentProgression, PotentialTier, SkillTree } from './models'

export const PROGRESSION_BASE_XP = 200
export const PROGRESSION_SCALING_FACTOR = 1.35
export const PROGRESSION_GROWTH_POINTS_PER_LEVEL = 3.25
export const PROGRESSION_MIN_LEVEL = 1
export const PROGRESSION_MAX_LEVEL = 20

export interface ProgressionSnapshot {
  level: number
  xp: number
  currentLevelStartXp: number
  nextLevelThresholdXp: number
  xpIntoCurrentLevel: number
  xpToNextLevel: number
  progressRatio: number
  progressPercent: number
}

export interface ProgressionUpdateResult {
  progression: AgentProgression
  level: number
  leveledUp: boolean
  previousLevel: number
  levelsGained: number
  reachedLevels: number[]
  xpGained: number
  skillPointsGranted: number
  growthDelta: NonNullable<AgentProgression['growthStats']>
  snapshot: ProgressionSnapshot
}

interface ProgressionRewardOptions {
  growthDelta?: AgentGrowthStats
}

const POTENTIAL_TIER_GROWTH_MULTIPLIERS: Record<PotentialTier, number> = {
  F: 0.72,
  D: 0.84,
  C: 1,
  B: 1.12,
  A: 1.24,
  S: 1.38,
  low: 0.88,
  mid: 1,
  high: 1.18,
}

function coerceLevel(level: number | undefined) {
  return Math.min(PROGRESSION_MAX_LEVEL, Math.max(PROGRESSION_MIN_LEVEL, Math.trunc(level ?? 1)))
}

function coerceXp(xp: number | undefined) {
  return Math.max(0, Math.trunc(xp ?? 0))
}

function normalizeSkillTree(
  skillTree: AgentProgression['skillTree']
): NonNullable<SkillTree> {
  return {
    ...createDefaultAgentSkillTree(),
    ...(skillTree ?? {}),
    skillPoints: Math.max(
      0,
      Math.trunc(skillTree?.skillPoints ?? createDefaultAgentSkillTree().skillPoints)
    ),
    trainedRelationships: Object.fromEntries(
      Object.entries(skillTree?.trainedRelationships ?? {}).filter(
        ([, value]) => typeof value === 'number' && Number.isFinite(value)
      )
    ),
  }
}

function normalizeGrowthStats(
  growthStats: AgentProgression['growthStats']
): NonNullable<AgentProgression['growthStats']> {
  return Object.fromEntries(
    Object.entries(growthStats ?? {}).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value) && value !== 0
    )
  )
}

function mergeGrowthStats(
  existing: AgentProgression['growthStats'],
  growthDelta: AgentGrowthStats | undefined
): NonNullable<AgentProgression['growthStats']> {
  const merged: NonNullable<AgentProgression['growthStats']> = {
    ...normalizeGrowthStats(existing),
  }

  for (const [key, value] of Object.entries(
    normalizeGrowthStats(growthDelta)
  ) as [keyof NonNullable<AgentProgression['growthStats']>, number][]) {
    merged[key] = Number(((merged[key] ?? 0) + value).toFixed(2))
  }

  return merged
}

function getPotentialGrowthMultiplier(potentialTier: PotentialTier | undefined) {
  return POTENTIAL_TIER_GROWTH_MULTIPLIERS[potentialTier ?? 'C'] ?? 1
}

function buildGrowthProfileWeights(agent: Pick<Agent, 'role' | 'progression'>) {
  const baseWeights = getRoleDomainWeights(agent.role)
  const growthProfile = agent.progression?.growthProfile?.trim().toLowerCase() ?? 'balanced'

  if (growthProfile === 'adaptive') {
    return normalizeRoleDomainWeights(
      Object.fromEntries(
        STAT_DOMAINS.map((domain) => [domain, baseWeights[domain] * 0.72 + 1 / STAT_DOMAINS.length * 0.28])
      )
    )
  }

  if (growthProfile === 'specialist') {
    const ranked = [...STAT_DOMAINS].sort((left, right) => baseWeights[right] - baseWeights[left])

    return normalizeRoleDomainWeights(
      Object.fromEntries(
        STAT_DOMAINS.map((domain) => {
          const rank = ranked.indexOf(domain)
          const multiplier = rank === 0 ? 1.65 : rank === 1 ? 1.25 : 0.62
          return [domain, baseWeights[domain] * multiplier]
        })
      )
    )
  }

  if (growthProfile === 'volatile') {
    const ranked = [...STAT_DOMAINS].sort((left, right) => baseWeights[right] - baseWeights[left])

    return normalizeRoleDomainWeights(
      Object.fromEntries(
        STAT_DOMAINS.map((domain) => {
          const rank = ranked.indexOf(domain)
          const multiplier = rank === 0 ? 1.9 : rank === 1 ? 1.05 : 0.45
          return [domain, baseWeights[domain] * multiplier]
        })
      )
    )
  }

  if (growthProfile === 'steady') {
    return normalizeRoleDomainWeights(
      Object.fromEntries(
        STAT_DOMAINS.map((domain) => [
          domain,
          baseWeights[domain] * 0.9 + (domain === 'resilience' || domain === 'control' ? 0.05 : 0),
        ])
      )
    )
  }

  return normalizeRoleDomainWeights(baseWeights)
}

export function buildAgentGrowthDelta(
  agent: Pick<Agent, 'role' | 'progression'>,
  levelsGained: number
): NonNullable<AgentProgression['growthStats']> {
  if (levelsGained <= 0) {
    return {}
  }

  const weights = buildGrowthProfileWeights(agent)
  const growthBudget =
    PROGRESSION_GROWTH_POINTS_PER_LEVEL *
    levelsGained *
    getPotentialGrowthMultiplier(agent.progression?.potentialTier)

  return Object.fromEntries(
    STAT_DOMAINS.map(
      (domain) =>
        [domain, Number((weights[domain] * growthBudget).toFixed(2))] as const
    ).filter(([, value]) => value > 0)
  )
}

export function getXpToNextLevel(level: number) {
  const normalizedLevel = coerceLevel(level)
  return Math.max(
    1,
    Math.round(PROGRESSION_BASE_XP * normalizedLevel ** PROGRESSION_SCALING_FACTOR)
  )
}

export function getXpThresholdForLevel(level: number) {
  const normalizedLevel = coerceLevel(level)
  let threshold = 0

  for (let currentLevel = 1; currentLevel < normalizedLevel; currentLevel += 1) {
    threshold += getXpToNextLevel(currentLevel)
  }

  return threshold
}

export function getXpThresholdForMaxLevel() {
  return getXpThresholdForLevel(PROGRESSION_MAX_LEVEL)
}

export function getLevelForXp(xp: number) {
  const normalizedXp = coerceXp(xp)
  let level = PROGRESSION_MIN_LEVEL
  let remainingXp = normalizedXp

  while (level < PROGRESSION_MAX_LEVEL && remainingXp >= getXpToNextLevel(level)) {
    remainingXp -= getXpToNextLevel(level)
    level += 1
  }

  return level
}

export function synchronizeProgressionState(
  progression: AgentProgression,
  fallbackLevel = 1
): AgentProgression {
  const storedLevel = coerceLevel(progression.level ?? fallbackLevel)
  const minimumXpForStoredLevel = getXpThresholdForLevel(storedLevel)
  const xp = Math.max(coerceXp(progression.xp), minimumXpForStoredLevel)
  const level = getLevelForXp(xp)

  return {
    ...progression,
    xp,
    level,
    growthStats: normalizeGrowthStats(progression.growthStats),
    skillTree: normalizeSkillTree(progression.skillTree),
  }
}

export function getReachedLevels(previousLevel: number, nextLevel: number) {
  const normalizedPreviousLevel = coerceLevel(previousLevel)
  const normalizedNextLevel = coerceLevel(nextLevel)

  if (normalizedNextLevel <= normalizedPreviousLevel) {
    return [] as number[]
  }

  return Array.from(
    { length: normalizedNextLevel - normalizedPreviousLevel },
    (_, index) => normalizedPreviousLevel + index + 1
  )
}

export function getProgressionSnapshot(progression: Pick<AgentProgression, 'xp' | 'level'>) {
  const synchronized = synchronizeProgressionState(
    {
      xp: progression.xp,
      level: progression.level,
      potentialTier: 'C',
      growthProfile: 'balanced',
    },
    progression.level
  )
  const level = synchronized.level
  const xp = synchronized.xp
  const currentLevelStartXp = getXpThresholdForLevel(level)
  const isAtMaxLevel = level >= PROGRESSION_MAX_LEVEL
  const xpToNextLevel = isAtMaxLevel ? 0 : getXpToNextLevel(level)
  const nextLevelThresholdXp = isAtMaxLevel
    ? currentLevelStartXp
    : currentLevelStartXp + xpToNextLevel
  const xpIntoCurrentLevel = Math.max(0, xp - currentLevelStartXp)
  const progressRatio =
    xpToNextLevel > 0
      ? Math.min(Math.max(xpIntoCurrentLevel / xpToNextLevel, 0), 1)
      : isAtMaxLevel
        ? 1
        : 0

  return {
    level,
    xp,
    currentLevelStartXp,
    nextLevelThresholdXp,
    xpIntoCurrentLevel,
    xpToNextLevel,
    progressRatio,
    progressPercent: Math.round(progressRatio * 100),
  } satisfies ProgressionSnapshot
}

export function applyProgressionXp(
  progression: AgentProgression,
  xpGain: number,
  rewardOptions: ProgressionRewardOptions = {}
): ProgressionUpdateResult {
  const synchronized = synchronizeProgressionState(progression, progression.level)
  const previousLevel = synchronized.level
  const normalizedXpGain = Math.max(0, Math.round(xpGain))
  const nextXp = synchronized.xp + normalizedXpGain
  const nextLevel = getLevelForXp(nextXp)
  const reachedLevels = getReachedLevels(previousLevel, nextLevel)
  const skillPointsGranted = reachedLevels.length
  const growthDelta = normalizeGrowthStats(rewardOptions.growthDelta)
  const nextProgression = synchronizeProgressionState(
    {
      ...synchronized,
      xp: nextXp,
      level: nextLevel,
      growthStats: mergeGrowthStats(synchronized.growthStats, growthDelta),
      skillTree: {
        ...normalizeSkillTree(synchronized.skillTree),
        skillPoints:
          normalizeSkillTree(synchronized.skillTree).skillPoints + skillPointsGranted,
      },
    },
    nextLevel
  )

  return {
    progression: nextProgression,
    level: nextProgression.level,
    leveledUp: nextLevel > previousLevel,
    previousLevel,
    levelsGained: reachedLevels.length,
    reachedLevels,
    xpGained: normalizedXpGain,
    skillPointsGranted,
    growthDelta,
    snapshot: getProgressionSnapshot(nextProgression),
  }
}

export function applyAgentXp(agent: Agent, xpGain: number): ProgressionUpdateResult {
  const fallbackProgression: AgentProgression = {
    xp: 0,
    level: coerceLevel(agent.level),
    potentialTier: 'C',
    growthProfile: 'balanced',
    skillTree: createDefaultAgentSkillTree(),
  }

  const progression = agent.progression ?? fallbackProgression
  const synchronized = synchronizeProgressionState(progression, progression.level)
  const normalizedXpGain = Math.max(0, Math.round(xpGain))
  const nextLevel = getLevelForXp(synchronized.xp + normalizedXpGain)
  const levelsGained = Math.max(0, nextLevel - synchronized.level)

  return applyProgressionXp(progression, normalizedXpGain, {
    growthDelta: buildAgentGrowthDelta(agent, levelsGained),
  })
}
