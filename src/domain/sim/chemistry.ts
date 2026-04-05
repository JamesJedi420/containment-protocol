import {
  type Agent,
  type CaseInstance,
  type GameConfig,
  type Id,
  type Relationship,
  type StatKey,
  type Team,
  type TeamChemistryProfile,
} from '../models'
import { clamp, dot } from '../math'
import { getTeamMemberIds } from '../teamSimulation'
import { calculateModifierAmplification } from './chemistryPolish'
import { deriveRelationshipState, deriveRelationshipStability } from './relationshipProjection'

const STAT_KEYS: StatKey[] = ['combat', 'investigation', 'utility', 'social']
const TAG_BONUS_PER_MATCH = 5
const DEFAULT_STAGE_SCALAR = 1.2
const TRAINED_RELATIONSHIP_BONUS_RATE = 0.25
const MAX_TRAINED_RELATIONSHIP_BONUS = 1.5
const CHEMISTRY_AVERAGE_BONUS_RATE = 2.1

export function calcTeamChemistry(agents: Agent[]): TeamChemistryProfile {
  const relationships: Relationship[] = []
  let raw = 0

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const relationship = buildRelationship(agents[i], agents[j])
      raw += relationship.value
      relationships.push(relationship)
    }
  }

  const pairs = relationships.length
  const average = pairs === 0 ? 0 : raw / pairs
  const modifierBonus =
    pairs === 0
      ? 0
      : relationships.reduce(
          (sum, relationship) => sum + getRelationshipModifierInfluence(relationship),
          0
        ) / pairs

  // Compute team cohesion: normalized average + density bonus
  const cohesion = computeTeamCohesion(relationships, average)

  return {
    relationships,
    raw,
    bonus: clamp(average * CHEMISTRY_AVERAGE_BONUS_RATE + modifierBonus, -6, 6),
    pairs,
    average,
    cohesion,
  }
}

function getRelationshipModifierInfluence(relationship: Relationship) {
  let influence = 0

  for (const modifier of relationship.modifiers) {
    if (modifier === 'high_trust') {
      influence += 0.5
    } else if (modifier === 'trust') {
      influence += 0.22
    } else if (modifier === 'rivalry') {
      influence -= 0.5
    } else if (modifier === 'friction') {
      influence -= 0.22
    } else if (modifier === 'shared_history') {
      influence += 0.12
    } else if (modifier === 'asymmetry') {
      influence -= 0.12
    } else if (modifier === 'mentor_protege') {
      influence += relationship.value >= 0 ? 0.08 : -0.08
    } else if (modifier === 'trained_coordination') {
      influence += 0.32
    }
  }

  // Apply modifier interaction amplification (complementary modifiers enhance each other)
  const amplification = calculateModifierAmplification(relationship.modifiers)
  influence += amplification

  return influence
}

export function summarizeRelationshipModifiers(relationships: readonly Relationship[]) {
  const counts = new Map<string, number>()

  for (const relationship of relationships) {
    for (const modifier of relationship.modifiers) {
      counts.set(modifier, (counts.get(modifier) ?? 0) + 1)
    }
  }

  if (counts.size === 0) {
    return []
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([modifier, count]) => `${formatRelationshipModifierLabel(modifier)} x${count}`)
}

function formatRelationshipModifierLabel(modifier: string) {
  return modifier.replace(/_/g, ' ')
}

/**
 * Legacy case/team fit helper.
 * This measures case-fit readiness from weighted stats/tags and is intentionally
 * separate from relationship-derived team chemistry.
 */
export function calcCaseFit(
  c: CaseInstance,
  team: Team,
  agents: Record<Id, Agent>,
  config?: Pick<GameConfig, 'stageScalar'>
): number {
  const memberIds = getTeamMemberIds(team)
  if (memberIds.length === 0) return 0

  const activeAgents = getActiveTeamAgents(memberIds, agents)
  const teamStats = accumulateTeamStats(activeAgents)
  const tagBonus = computePreferredTagBonus(c, team, activeAgents)
  const weightedTeamScore = dot(teamStats, c.weights)
  const adjustedRequired = computeAdjustedRequiredScore(c, config)
  const totalTeamScore = weightedTeamScore + tagBonus

  return adjustedRequired === 0 ? 1 : clamp(totalTeamScore / adjustedRequired, 0, 1)
}

/**
 * @deprecated Use `calcCaseFit` for legacy case/team fit scoring.
 * `calcTeamChemistry` is the canonical relationship chemistry model.
 */
export function calcChemistry(
  c: CaseInstance,
  team: Team,
  agents: Record<Id, Agent>,
  config?: Pick<GameConfig, 'stageScalar'>
): number {
  return calcCaseFit(c, team, agents, config)
}

function getActiveTeamAgents(memberIds: Id[], agents: Record<Id, Agent>): Agent[] {
  return memberIds
    .map((agentId) => agents[agentId])
    .filter(
      (agent): agent is Agent =>
        Boolean(agent) && agent.status !== 'dead' && agent.status !== 'resigned'
    )
}

function createEmptyTeamStats(): Record<StatKey, number> {
  return { combat: 0, investigation: 0, utility: 0, social: 0 }
}

function accumulateTeamStats(activeAgents: Agent[]): Record<StatKey, number> {
  const teamStats = createEmptyTeamStats()

  for (const agent of activeAgents) {
    const fatigueFactor = 1 - agent.fatigue / 100
    for (const key of STAT_KEYS) {
      teamStats[key] += agent.baseStats[key] * fatigueFactor
    }
  }

  return teamStats
}

function computePreferredTagBonus(c: CaseInstance, team: Team, activeAgents: Agent[]) {
  const allTeamTags = new Set([...team.tags, ...activeAgents.flatMap((agent) => agent.tags)])
  return c.preferredTags.filter((tag) => allTeamTags.has(tag)).length * TAG_BONUS_PER_MATCH
}

function computeAdjustedRequiredScore(c: CaseInstance, config?: Pick<GameConfig, 'stageScalar'>) {
  const requiredScore = dot(c.difficulty, c.weights)
  const stageMultiplier = Math.pow(
    config?.stageScalar ?? DEFAULT_STAGE_SCALAR,
    Math.max(c.stage - 1, 0)
  )

  return requiredScore * stageMultiplier
}

function buildRelationship(agentA: Agent, agentB: Agent): Relationship {
  const forward = agentA.relationships[agentB.id] ?? 0
  const reverse = agentB.relationships[agentA.id] ?? 0
  const trainedForward = agentA.progression?.skillTree?.trainedRelationships?.[agentB.id] ?? 0
  const trainedReverse = agentB.progression?.skillTree?.trainedRelationships?.[agentA.id] ?? 0
  const familiarity = (trainedForward + trainedReverse) / 2
  const trainingBonus = clamp(
    familiarity * TRAINED_RELATIONSHIP_BONUS_RATE,
    0,
    MAX_TRAINED_RELATIONSHIP_BONUS
  )
  const value = (forward + reverse) / 2 + trainingBonus
  const modifiers = deriveRelationshipModifiers(forward, reverse, value, familiarity)
  const state = deriveRelationshipState(value)
  const stability = deriveRelationshipStability(value, modifiers, familiarity)

  return {
    agentAId: agentA.id,
    agentBId: agentB.id,
    value,
    modifiers,
    state,
    stability,
  }
}

/**
 * Compute team cohesion (0-1): normalized average + density bonus.
 * Accounts for relationship strength distribution and clustering.
 */
function computeTeamCohesion(relationships: Relationship[], average: number) {
  if (relationships.length === 0) return 0.5 // Default neutral cohesion

  // Normalize average (-2 to +2) to (0 to 1)
  const normalizedAverage = (average + 2) / 4

  // Density bonus: reward positive clustering (many positive relationships)
  const positiveCount = relationships.filter((r) => r.value > 0.5).length
  const densityBonus = (positiveCount / relationships.length) * 0.2

  return clamp(normalizedAverage + densityBonus, 0, 1)
}

function deriveRelationshipModifiers(
  forward: number,
  reverse: number,
  value: number,
  familiarity: number
) {
  const modifiers: string[] = []

  if (value >= 1.5) {
    modifiers.push('high_trust')
  } else if (value > 0) {
    modifiers.push('trust')
  }

  if (value <= -1.5) {
    modifiers.push('rivalry')
  } else if (value < 0) {
    modifiers.push('friction')
  }

  if (forward > 0 && reverse > 0) {
    modifiers.push('shared_history')
  }

  if (forward * reverse < 0) {
    modifiers.push('asymmetry')
  }

  if (Math.abs(forward - reverse) >= 2) {
    modifiers.push('mentor_protege')
  }

  if (familiarity > 0) {
    modifiers.push('trained_coordination')
  }

  return modifiers
}
