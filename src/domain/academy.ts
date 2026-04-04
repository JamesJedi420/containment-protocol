import { trainingCatalog } from '../data/training'
import { getAgentStatCap } from './agentPotential'
import { evaluateAgentBreakdown } from './evaluateAgent'
import { clamp } from './math'
import { computeTeamScore } from './sim/scoring'
import { deriveDomainStatsFromBase, cloneDomainStats } from './statDomains'
import { getTeamAssignedCaseId, getTeamMemberIds } from './teamSimulation'
import {
  getTrainingAptitudeBonus,
  isAgentTraining,
  isTrainingProgramUnlocked,
  TRAINING_FATIGUE_GATE,
} from './sim/training'
import { getAcademyStatBonus, getAcademyUpgradeCost } from './sim/academyUpgrade'
import { getInstructorBonus } from './sim/instructorAssignment'
import {
  BASE_STAT_MAX,
  type Agent,
  type GameState,
  type InstructorData,
  type StatKey,
  type TrainingProgram,
} from './models'

export interface TrainingImpactPreview {
  trainingId: string
  trainingName: string
  targetStat: StatKey
  statDelta: number
  aptitudeBonus: number
  durationWeeks: number
  fundingCost: number
  fatigueDelta: number
  recoveryBonus?: number
  stabilityResistanceDelta?: number
  stabilityToleranceDelta?: number
  scoreDelta: number
  performanceDelta: {
    fieldPower: number
    containment: number
    investigation: number
    support: number
  }
}

export interface AcademyOverview {
  readyAgents: number
  activeQueue: number
  averageWeeksQueued: number
  academyTier: number
  upgradeCost: number | null
  availableSlots: number
  totalSlots: number
  suggestedPrograms: Array<{
    agentId: string
    agentName: string
    trainingId: string
    trainingName: string
    scoreDelta: number
    fatigueDelta: number
    fundingCost: number
    affordable: boolean
  }>
  suggestedTeamDrills: Array<{
    teamId: string
    teamName: string
    trainingId: string
    trainingName: string
    avgScoreDelta: number
    relationshipDelta: number
    trainedRelationshipDelta: number
    projectedScoreBefore: number
    projectedScoreAfter: number
    projectedScoreDelta: number
    projectedChemistryDelta: number
    projectedSynergyDelta: number
    recommendationReason: string
    projectionCaseTitle: string
    fundingCost: number
    affordable: boolean
  }>
  instructors: Array<{
    staffId: string
    name: string
    instructorSpecialty: StatKey
    efficiency: number
    bonus: number
    assignedAgentId?: string
    assignedAgentName?: string
  }>
}

function applyProgram(
  agent: Agent,
  program: TrainingProgram,
  academyStatBonus = 0,
  instructorBonus = 0
): Agent {
  const aptitudeBonus = getTrainingAptitudeBonus(agent.role, program.targetStat)
  const statCap = getAgentStatCap(agent, program.targetStat)
  const nextBaseStats = {
    ...agent.baseStats,
    [program.targetStat]: clamp(
      agent.baseStats[program.targetStat] +
        program.statDelta +
        aptitudeBonus +
        academyStatBonus +
        instructorBonus,
      0,
      statCap
    ),
  }

  // Mirror applyTrainingCompletionToAgent: apply delta to existing domain stats rather than
  // replacing them, so custom/ability-enhanced stats are preserved in the preview.
  const previousDerivedStats = deriveDomainStatsFromBase(agent.baseStats)
  const nextDerivedStats = deriveDomainStatsFromBase(nextBaseStats)
  const nextStats = agent.stats
    ? cloneDomainStats(agent.stats)
    : cloneDomainStats(previousDerivedStats)

  nextStats.physical.strength +=
    nextDerivedStats.physical.strength - previousDerivedStats.physical.strength
  nextStats.physical.endurance +=
    nextDerivedStats.physical.endurance - previousDerivedStats.physical.endurance
  nextStats.tactical.awareness +=
    nextDerivedStats.tactical.awareness - previousDerivedStats.tactical.awareness
  nextStats.tactical.reaction +=
    nextDerivedStats.tactical.reaction - previousDerivedStats.tactical.reaction
  nextStats.cognitive.analysis +=
    nextDerivedStats.cognitive.analysis - previousDerivedStats.cognitive.analysis
  nextStats.cognitive.investigation +=
    nextDerivedStats.cognitive.investigation - previousDerivedStats.cognitive.investigation
  nextStats.social.negotiation +=
    nextDerivedStats.social.negotiation - previousDerivedStats.social.negotiation
  nextStats.social.influence +=
    nextDerivedStats.social.influence - previousDerivedStats.social.influence
  nextStats.stability.resistance +=
    nextDerivedStats.stability.resistance - previousDerivedStats.stability.resistance
  nextStats.stability.tolerance +=
    nextDerivedStats.stability.tolerance - previousDerivedStats.stability.tolerance
  nextStats.technical.equipment +=
    nextDerivedStats.technical.equipment - previousDerivedStats.technical.equipment
  nextStats.technical.anomaly +=
    nextDerivedStats.technical.anomaly - previousDerivedStats.technical.anomaly

  // Direct stability-training pathway for resilience-focused programs.
  nextStats.stability.resistance = clamp(
    nextStats.stability.resistance + (program.stabilityResistanceDelta ?? 0),
    0,
    BASE_STAT_MAX
  )
  nextStats.stability.tolerance = clamp(
    nextStats.stability.tolerance + (program.stabilityToleranceDelta ?? 0),
    0,
    BASE_STAT_MAX
  )

  return {
    ...agent,
    baseStats: nextBaseStats,
    stats: nextStats,
    fatigue: Math.min(100, agent.fatigue + program.fatigueDelta),
  }
}

export function previewTrainingImpact(
  agent: Agent,
  program: TrainingProgram,
  academyStatBonus = 0,
  instructorBonus = 0
): TrainingImpactPreview {
  const before = evaluateAgentBreakdown(agent)
  const after = evaluateAgentBreakdown(
    applyProgram(agent, program, academyStatBonus, instructorBonus)
  )

  return {
    trainingId: program.trainingId,
    trainingName: program.name,
    targetStat: program.targetStat,
    statDelta: program.statDelta,
    aptitudeBonus: getTrainingAptitudeBonus(agent.role, program.targetStat),
    durationWeeks: program.durationWeeks,
    fundingCost: program.fundingCost,
    fatigueDelta: program.fatigueDelta,
    recoveryBonus: program.recoveryBonus,
    stabilityResistanceDelta: program.stabilityResistanceDelta,
    stabilityToleranceDelta: program.stabilityToleranceDelta,
    scoreDelta: Number((after.score - before.score).toFixed(2)),
    performanceDelta: {
      fieldPower: Number((after.performance.fieldPower - before.performance.fieldPower).toFixed(2)),
      containment: Number(
        (after.performance.containment - before.performance.containment).toFixed(2)
      ),
      investigation: Number(
        (after.performance.investigation - before.performance.investigation).toFixed(2)
      ),
      support: Number((after.performance.support - before.performance.support).toFixed(2)),
    },
  }
}

export function getAgentTrainingImpacts(agent: Agent, academyStatBonus = 0, instructorBonus = 0) {
  return trainingCatalog
    .filter((program) => (program.scope ?? 'agent') === 'agent')
    .map((program) => previewTrainingImpact(agent, program, academyStatBonus, instructorBonus))
    .sort(
      (left, right) =>
        right.scoreDelta - left.scoreDelta || left.trainingName.localeCompare(right.trainingName)
    )
}

/**
 * Gap-aware score for ranking training suggestions.
 * Blends raw score delta with a small uplift for stats that are currently weak,
 * so the academy nudges agents toward coverage gaps rather than always over-training
 * their strongest stats. The bonus is capped so it only breaks near-ties.
 */
function gapAwareScore(agent: Agent, impact: TrainingImpactPreview): number {
  const statValue = agent.baseStats[impact.targetStat] ?? 0
  const statCap = getAgentStatCap(agent, impact.targetStat)
  const gapBonus = statCap > 0 ? (1 - statValue / statCap) * 0.2 : 0
  return impact.scoreDelta + gapBonus
}

function getTeamDrillSuggestions(game: GameState) {
  const teamDrills = trainingCatalog
    .filter((program) => (program.scope ?? 'agent') === 'team')
    .filter((program) => isTrainingProgramUnlocked(game, program))

  const results: Array<{
    teamId: string
    teamName: string
    trainingId: string
    trainingName: string
    avgScoreDelta: number
    relationshipDelta: number
    trainedRelationshipDelta: number
    projectedScoreBefore: number
    projectedScoreAfter: number
    projectedScoreDelta: number
    projectedChemistryDelta: number
    projectedSynergyDelta: number
    recommendationReason: string
    projectionCaseTitle: string
    fundingCost: number
    affordable: boolean
  }> = []

  const projectionCase = Object.values(game.cases)[0]
  if (!projectionCase) {
    return []
  }

  for (const team of Object.values(game.teams)) {
    const memberIds = getTeamMemberIds(team)
    if (memberIds.length < 2) continue
    if (getTeamAssignedCaseId(team)) continue

    const members = memberIds
      .map((agentId) => game.agents[agentId])
      .filter(
        (agent): agent is Agent =>
          Boolean(agent) &&
          agent.status === 'active' &&
          agent.fatigue < TRAINING_FATIGUE_GATE &&
          !isAgentTraining(agent) &&
          !game.trainingQueue.some((entry) => entry.agentId === agent.id)
      )

    // Need at least 2 eligible members to run a drill
    if (members.length < 2) continue

    let bestDrill: TrainingProgram | null = null
    // Rank by bond depth built per drill (trainedRelationshipDelta), then by
    // immediate chemistry gain (relationshipDelta) as tiebreaker. All eligible
    // members can participate regardless of stat ceiling — team drills are
    // chemistry-only and stat-max is not a gate here.
    let bestBondDepth = -Infinity

    for (const drill of teamDrills) {
      const bondDepth = drill.trainedRelationshipDelta ?? 0
      const isBetter =
        bondDepth > bestBondDepth ||
        (bondDepth === bestBondDepth &&
          (drill.relationshipDelta ?? 0) > (bestDrill?.relationshipDelta ?? 0))

      if (isBetter) {
        bestBondDepth = bondDepth
        bestDrill = drill
      }
    }

    if (!bestDrill) continue

    // Reflect the actual scaled cost (base + 25% per extra member beyond 2).
    const drillCost =
      bestDrill.fundingCost +
      Math.round(bestDrill.fundingCost * 0.25 * Math.max(0, members.length - 2))
    const projectedMembers = applyProjectedTeamDrillOutcome(members, bestDrill)
    const beforeScore = computeTeamScore(members, projectionCase, { teamTags: team.tags })
    const afterScore = computeTeamScore(projectedMembers, projectionCase, { teamTags: team.tags })

    const projectedScoreBefore = Number(beforeScore.score.toFixed(2))
    const projectedScoreAfter = Number(afterScore.score.toFixed(2))
    const projectedScoreDelta = Number((projectedScoreAfter - projectedScoreBefore).toFixed(2))
    const projectedChemistryDelta = Number(
      (
        afterScore.modifierBreakdown.chemistryBonus - beforeScore.modifierBreakdown.chemistryBonus
      ).toFixed(2)
    )
    const projectedSynergyDelta = Number(
      (
        afterScore.modifierBreakdown.synergyBonus - beforeScore.modifierBreakdown.synergyBonus
      ).toFixed(2)
    )

    results.push({
      teamId: team.id,
      teamName: team.name,
      trainingId: bestDrill.trainingId,
      trainingName: bestDrill.name,
      avgScoreDelta: Number((bestDrill.relationshipDelta ?? 0).toFixed(2)),
      relationshipDelta: Number((bestDrill.relationshipDelta ?? 0).toFixed(2)),
      trainedRelationshipDelta: bestDrill.trainedRelationshipDelta ?? 0,
      projectedScoreBefore,
      projectedScoreAfter,
      projectedScoreDelta,
      projectedChemistryDelta,
      projectedSynergyDelta,
      recommendationReason: buildTeamDrillRecommendationReason(
        bestDrill,
        projectedScoreDelta,
        projectedChemistryDelta,
        projectedSynergyDelta
      ),
      projectionCaseTitle: projectionCase.title,
      fundingCost: drillCost,
      affordable: game.funding >= drillCost,
    })
  }

  return results
    .sort(
      (a, b) =>
        b.trainedRelationshipDelta - a.trainedRelationshipDelta ||
        b.relationshipDelta - a.relationshipDelta ||
        a.teamName.localeCompare(b.teamName)
    )
    .slice(0, 3)
}

function applyProjectedTeamDrillOutcome(members: Agent[], drill: TrainingProgram): Agent[] {
  const relationshipDelta = drill.relationshipDelta ?? 0
  const trainedRelationshipDelta = drill.trainedRelationshipDelta ?? 0

  if (members.length < 2 || (relationshipDelta <= 0 && trainedRelationshipDelta <= 0)) {
    return members
  }

  const memberIdSet = new Set(members.map((member) => member.id))

  return members.map((member) => {
    const nextRelationships = { ...member.relationships }
    const nextTrainedRelationships = {
      ...(member.progression?.skillTree?.trainedRelationships ?? {}),
    }

    for (const partner of members) {
      if (partner.id === member.id || !memberIdSet.has(partner.id)) {
        continue
      }

      if (relationshipDelta > 0) {
        nextRelationships[partner.id] = clamp(
          (nextRelationships[partner.id] ?? 0) + relationshipDelta,
          -2,
          2
        )
      }

      if (trainedRelationshipDelta > 0) {
        nextTrainedRelationships[partner.id] = Math.max(
          0,
          Math.trunc((nextTrainedRelationships[partner.id] ?? 0) + trainedRelationshipDelta)
        )
      }
    }

    if (!member.progression) {
      return {
        ...member,
        relationships: nextRelationships,
      }
    }

    return {
      ...member,
      relationships: nextRelationships,
      progression: {
        ...member.progression,
        skillTree: {
          ...(member.progression.skillTree ?? { skillPoints: 0, trainedRelationships: {} }),
          trainedRelationships: nextTrainedRelationships,
        },
      },
    }
  })
}

function buildTeamDrillRecommendationReason(
  drill: TrainingProgram,
  projectedScoreDelta: number,
  projectedChemistryDelta: number,
  projectedSynergyDelta: number
) {
  const reasons = [
    `Builds ${drill.trainedRelationshipDelta ?? 0} bond depth and +${(drill.relationshipDelta ?? 0).toFixed(2)} chemistry.`,
  ]

  if (projectedSynergyDelta > 0) {
    reasons.push(`Projected synergy bonus +${projectedSynergyDelta.toFixed(2)}.`)
  } else if (projectedChemistryDelta > 0) {
    reasons.push(`Projected chemistry bonus +${projectedChemistryDelta.toFixed(2)}.`)
  }

  reasons.push(`Projected score delta +${projectedScoreDelta.toFixed(2)}.`)
  return reasons.join(' ')
}

export function buildAcademyOverview(game: GameState): AcademyOverview {
  const groupedQueue = new Map<string, GameState['trainingQueue'][number]>()

  for (const entry of game.trainingQueue) {
    groupedQueue.set(entry.drillGroupId ?? entry.id, entry)
  }

  const academyTier = game.academyTier ?? 0
  const upgradeCost = getAcademyUpgradeCost(academyTier)
  const academyStatBonus = getAcademyStatBonus(academyTier)
  const totalSlots = (game.config.trainingSlots ?? 4) + academyTier
  const agentsTraining = Object.values(game.agents).filter(isAgentTraining).length
  const availableSlots = Math.max(0, totalSlots - agentsTraining)

  const readyAgents = Object.values(game.agents).filter(
    (agent) =>
      agent.status === 'active' &&
      agent.assignment?.state === 'idle' &&
      agent.fatigue < TRAINING_FATIGUE_GATE
  )
  const suggestedPrograms = readyAgents
    .map((agent) => {
      const impacts = getAgentTrainingImpacts(agent, academyStatBonus).filter((impact) => {
        const program = trainingCatalog.find((entry) => entry.trainingId === impact.trainingId)
        return program ? isTrainingProgramUnlocked(game, program) : false
      })
      // Gap-aware ranking: break ties toward programs that train the agent's weakest stats
      const bestProgram =
        impacts.length > 0
          ? impacts.reduce((best, current) =>
              gapAwareScore(agent, current) > gapAwareScore(agent, best) ? current : best
            )
          : null

      return bestProgram
        ? {
            agentId: agent.id,
            agentName: agent.name,
            trainingId: bestProgram.trainingId,
            trainingName: bestProgram.trainingName,
            scoreDelta: bestProgram.scoreDelta,
            fatigueDelta: bestProgram.fatigueDelta,
            fundingCost: bestProgram.fundingCost,
            affordable: game.funding >= bestProgram.fundingCost,
          }
        : null
    })
    .filter(
      (
        suggestion
      ): suggestion is {
        agentId: string
        agentName: string
        trainingId: string
        trainingName: string
        scoreDelta: number
        fatigueDelta: number
        fundingCost: number
        affordable: boolean
      } => Boolean(suggestion)
    )
    .sort(
      (left, right) =>
        right.scoreDelta - left.scoreDelta || left.agentName.localeCompare(right.agentName)
    )
    .slice(0, 5)

  const instructors = Object.entries(game.staff)
    .filter((entry): entry is [string, InstructorData] => entry[1].role === 'instructor')
    .map(([staffId, record]) => ({
      staffId,
      name: record.name,
      instructorSpecialty: record.instructorSpecialty,
      efficiency: record.efficiency,
      bonus: getInstructorBonus(record.efficiency),
      assignedAgentId: record.assignedAgentId,
      assignedAgentName: record.assignedAgentId
        ? game.agents[record.assignedAgentId]?.name
        : undefined,
    }))

  return {
    readyAgents: readyAgents.length,
    activeQueue: groupedQueue.size,
    averageWeeksQueued:
      groupedQueue.size > 0
        ? Number(
            (
              [...groupedQueue.values()].reduce((sum, entry) => sum + entry.remainingWeeks, 0) /
              groupedQueue.size
            ).toFixed(1)
          )
        : 0,
    academyTier,
    upgradeCost,
    availableSlots,
    totalSlots,
    suggestedPrograms,
    suggestedTeamDrills: getTeamDrillSuggestions(game),
    instructors,
  }
}
