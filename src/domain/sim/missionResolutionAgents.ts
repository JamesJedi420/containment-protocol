// cspell:words psionic
import {
  applyPotentialBreakthrough,
  buildAgentStatCaps,
  observePotentialIntel,
} from '../agentPotential'
import {
  appendAgentHistoryEntries,
  appendAgentHistoryEntry,
  applyAgentProgressionUpdate,
  createAgentHistoryEntry,
  recordAgentCollaborators,
  recordAgentPerformance,
  recordAgentXpGain,
  setAgentAssignment,
} from '../agent/lifecycle'
import {
  createAgentInjuredDraft,
  createAgentKilledDraft,
  createAgentPromotedDraft,
  createAgentRelationshipChangedDraft,
  createProgressionXpGainedDraft,
  type AnyOperationEventDraft,
} from '../events'
import { clamp } from '../math'
import type {
  AgentHistoryEntry,
  CaseInstance,
  GameState,
  LeaderBonus,
  MissionFatalityRecord,
  ResolutionOutcome,
} from '../models'
import { applyAgentXp } from '../progression'
import { type InjurySeverity, withInjuryFlags } from './recoveryPipeline'
import { applyBetrayalConsequences } from './betrayal'
import { createDefaultAgentProgression } from '../agentDefaults'
import { evaluateMissionAgentFailureRisk } from './injuryForecast'

const XP_GAIN_SUCCESS = 150
const XP_GAIN_PARTIAL = 75
const XP_GAIN_FAIL = 30
const RELATIONSHIP_MIN = -2
const RELATIONSHIP_MAX = 2
const RELATIONSHIP_DELTA_SUCCESS = 1
const RELATIONSHIP_DELTA_PARTIAL = 0.5
const RELATIONSHIP_DELTA_FAIL = -1
const INJURY_RISK_FATIGUE_MIN = 45
const GUARANTEED_INJURY_FATIGUE = 85

type AgentResolutionPerformance = NonNullable<ResolutionOutcome['agentPerformance']>[number]

interface MissionInjuryRecord {
  agentId: string
  agentName: string
  severity: InjurySeverity
  damage: number
}

interface ApplyMissionResolutionAgentMutationsInput {
  agents: GameState['agents']
  assignedAgents: NonNullable<GameState['agents'][string]>[]
  assignedAgentLeaderBonuses: Record<string, LeaderBonus>
  effectiveCase: CaseInstance
  outcome: ResolutionOutcome
  week: number
  rng: () => number
}

interface ApplyMissionResolutionAgentMutationsOutput {
  nextAgents: GameState['agents']
  missionInjuries: MissionInjuryRecord[]
  missionFatalities: MissionFatalityRecord[]
  eventDrafts: AnyOperationEventDraft[]
  fundingDelta: number
}

interface PairRelationshipUpdate {
  leftId: string
  rightId: string
  leftPrevious: number
  rightPrevious: number
  leftNext: number
  rightNext: number
}

function buildCaseResolutionHistoryEntry(
  week: number,
  currentCase: CaseInstance,
  result: ResolutionOutcome['result']
): AgentHistoryEntry {
  const eventType =
    result === 'success'
      ? 'case.resolved'
      : result === 'partial'
        ? 'case.partially_resolved'
        : 'case.failed'

  const outcomeLabel =
    result === 'success' ? 'resolved' : result === 'partial' ? 'partially resolved' : 'failed'

  return {
    week,
    eventType,
    note: `${currentCase.title} ${outcomeLabel}.`,
  }
}

function buildInjuryHistoryEntry(
  week: number,
  currentCase: CaseInstance,
  severity: InjurySeverity
): AgentHistoryEntry {
  return {
    week,
    eventType: 'agent.injured',
    note: `Injured during ${currentCase.title} (${severity}).`,
  }
}

function buildFatalityHistoryEntry(week: number, currentCase: CaseInstance): AgentHistoryEntry {
  return {
    week,
    eventType: 'simulation.weekly_tick',
    note: `Killed during ${currentCase.title}.`,
  }
}

function getRelationshipDelta(result: ResolutionOutcome['result']) {
  return result === 'success'
    ? RELATIONSHIP_DELTA_SUCCESS
    : result === 'partial'
      ? RELATIONSHIP_DELTA_PARTIAL
      : RELATIONSHIP_DELTA_FAIL
}

function getRelationshipChangeReason(result: ResolutionOutcome['result']) {
  return result === 'success'
    ? 'mission_success'
    : result === 'partial'
      ? 'mission_partial'
      : 'mission_fail'
}

function hasAnomalyCaseContext(currentCase: CaseInstance) {
  return [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags].some(
    (tag) =>
      ['anomaly', 'occult', 'psionic', 'hybrid', 'spirit', 'ritual', 'containment'].includes(tag)
  )
}

function hasEvidenceRecoveryContext(currentCase: CaseInstance) {
  return (
    currentCase.weights.investigation >= 0.4 ||
    [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags].some((tag) =>
      ['evidence', 'witness', 'archive', 'analysis', 'relay', 'forensics'].includes(tag)
    )
  )
}

function hasChemistryContextFit(
  agent: NonNullable<GameState['agents'][string]>,
  currentCase: CaseInstance,
  performance?: AgentResolutionPerformance
) {
  // site:* tags are pipeline-internal metadata; exclude from tag-coverage scoring
  // to avoid diluting the authored semantic signal for agent-case affinity.
  const allCaseTags = [
    ...currentCase.tags,
    ...currentCase.requiredTags,
    ...currentCase.preferredTags,
  ].filter((tag) => !tag.startsWith('site:'))
  const sharedTags = allCaseTags.filter((tag) => agent.tags.includes(tag)).length
  const caseTagCoverage = allCaseTags.length > 0 ? sharedTags / allCaseTags.length : 0
  const weightedAxisPotential = clamp(
    (agent.baseStats.combat * currentCase.weights.combat +
      agent.baseStats.investigation * currentCase.weights.investigation +
      agent.baseStats.utility * currentCase.weights.utility +
      agent.baseStats.social * currentCase.weights.social) /
      100,
    0,
    1
  )
  const hasEquipmentLoadout = Object.values(agent.equipmentSlots ?? {}).some(
    (slot): slot is string => typeof slot === 'string' && slot.length > 0
  )
  const performanceFit = performance
    ? clamp(
        (performance.contribution + performance.threatHandled + performance.evidenceGathered) / 300,
        0,
        1
      )
    : 0

  let score = 0

  if (hasAnomalyCaseContext(currentCase)) {
    if (
      agent.role === 'occultist' ||
      agent.role === 'medium' ||
      agent.tags.some((tag) =>
        ['occult', 'psionic', 'containment', 'spirit', 'ritual'].includes(tag)
      )
    ) {
      score += 0.42
    }
  }

  if (hasEvidenceRecoveryContext(currentCase)) {
    if (
      agent.role === 'investigator' ||
      agent.role === 'field_recon' ||
      agent.role === 'tech' ||
      agent.tags.some((tag) =>
        ['analysis', 'forensics', 'archive', 'evidence', 'witness'].includes(tag)
      )
    ) {
      score += 0.42
    }
  }

  score += caseTagCoverage * 0.22
  score += weightedAxisPotential * 0.22
  score += performanceFit * 0.14
  if (hasEquipmentLoadout) {
    score += 0.08
  }

  return clamp(score, 0, 1)
}

function roundRelationshipDelta(value: number) {
  return Math.round(value * 100) / 100
}

function aggregateAssignedPerformanceSummary(outcome: ResolutionOutcome) {
  return (outcome.agentPerformance ?? []).reduce(
    (summary, performance) => ({
      contribution: Number((summary.contribution + (performance.contribution ?? 0)).toFixed(2)),
      threatHandled: Number((summary.threatHandled + (performance.threatHandled ?? 0)).toFixed(2)),
      damageTaken: Number((summary.damageTaken + (performance.damageTaken ?? 0)).toFixed(2)),
      healingPerformed: Number(
        (summary.healingPerformed + (performance.healingPerformed ?? 0)).toFixed(2)
      ),
      evidenceGathered: Number(
        (summary.evidenceGathered + (performance.evidenceGathered ?? 0)).toFixed(2)
      ),
      containmentActionsCompleted: Number(
        (
          summary.containmentActionsCompleted +
          (performance.containmentActionsCompleted ?? 0)
        ).toFixed(2)
      ),
    }),
    {
      contribution: 0,
      threatHandled: 0,
      damageTaken: 0,
      healingPerformed: 0,
      evidenceGathered: 0,
      containmentActionsCompleted: 0,
    }
  )
}

function getMissionPotentialDiscoveryDelta(
  effectiveCase: CaseInstance,
  outcome: ResolutionOutcome,
  performance?: AgentResolutionPerformance
) {
  let discoveryDelta = outcome.result === 'success' ? 20 : outcome.result === 'partial' ? 12 : 6

  discoveryDelta += Math.max(0, effectiveCase.stage - 1) * 6

  if (performance) {
    discoveryDelta += Math.round(
      (performance.contribution + performance.threatHandled + performance.evidenceGathered) / 60
    )
  }

  return clamp(discoveryDelta, 0, 48)
}

function shouldTriggerMissionBreakthrough(
  agent: NonNullable<GameState['agents'][string]>,
  effectiveCase: CaseInstance,
  outcome: ResolutionOutcome,
  performance?: AgentResolutionPerformance
) {
  if (outcome.result !== 'success' || effectiveCase.stage < 3 || !performance) {
    return false
  }

  const progression = agent.progression ?? createDefaultAgentProgression(agent.level ?? 1)

  if ((progression.potentialIntel?.discoveryProgress ?? 0) < 85) {
    return false
  }

  return (
    performance.contribution >= 70 ||
    performance.threatHandled >= 70 ||
    performance.evidenceGathered >= 60
  )
}

function buildDirectionalRelationshipDelta(
  left: NonNullable<GameState['agents'][string]>,
  right: NonNullable<GameState['agents'][string]>,
  result: ResolutionOutcome['result'],
  currentCase: CaseInstance,
  performanceByAgentId: Map<string, AgentResolutionPerformance>
) {
  const baseDelta = getRelationshipDelta(result)
  const leftContribution = performanceByAgentId.get(left.id)?.contribution ?? 0
  const rightContribution = performanceByAgentId.get(right.id)?.contribution ?? 0
  const contributionGap = clamp((leftContribution - rightContribution) / 100, -0.35, 0.35)
  const leftPerformance = performanceByAgentId.get(left.id)
  const rightPerformance = performanceByAgentId.get(right.id)
  const leftContextFit = hasChemistryContextFit(left, currentCase, leftPerformance)
  const rightContextFit = hasChemistryContextFit(right, currentCase, rightPerformance)
  const currentAsymmetry = (left.relationships[right.id] ?? 0) - (right.relationships[left.id] ?? 0)
  const contextSynergy = Math.min(leftContextFit, rightContextFit)

  let leftDelta = baseDelta
  let rightDelta = baseDelta

  if (result !== 'fail') {
    leftDelta += contextSynergy * 0.18
    rightDelta += contextSynergy * 0.18

    if (contributionGap > 0.05) {
      rightDelta += contributionGap * 0.6
      leftDelta += contributionGap * 0.15
    } else if (contributionGap < -0.05) {
      leftDelta += Math.abs(contributionGap) * 0.6
      rightDelta += Math.abs(contributionGap) * 0.15
    }

    if (currentAsymmetry > 0.5) {
      rightDelta += 0.1
    } else if (currentAsymmetry < -0.5) {
      leftDelta += 0.1
    }
  } else {
    if (contributionGap > 0.05) {
      leftDelta -= contributionGap * 0.6
      rightDelta -= contributionGap * 0.15
    } else if (contributionGap < -0.05) {
      rightDelta -= Math.abs(contributionGap) * 0.6
      leftDelta -= Math.abs(contributionGap) * 0.15
    }

    leftDelta -= contextSynergy * 0.12
    rightDelta -= contextSynergy * 0.12
  }

  return {
    leftDelta: roundRelationshipDelta(leftDelta),
    rightDelta: roundRelationshipDelta(rightDelta),
  }
}

function applyRelationshipOutcome(
  agents: GameState['agents'],
  participatingAgentIds: string[],
  result: ResolutionOutcome['result'],
  currentCase: CaseInstance,
  performanceByAgentId: Map<string, AgentResolutionPerformance>
) {
  if (participatingAgentIds.length < 2) {
    return {
      agents,
      updates: [] as PairRelationshipUpdate[],
    }
  }

  const nextAgents = { ...agents }
  const updates: PairRelationshipUpdate[] = []

  for (let i = 0; i < participatingAgentIds.length; i++) {
    for (let j = i + 1; j < participatingAgentIds.length; j++) {
      const leftId = participatingAgentIds[i]
      const rightId = participatingAgentIds[j]
      const left = nextAgents[leftId]
      const right = nextAgents[rightId]

      if (!left || !right) {
        continue
      }

      const leftPrevious = left.relationships[rightId] ?? 0
      const rightPrevious = right.relationships[leftId] ?? 0
      const directionalDelta = buildDirectionalRelationshipDelta(
        left,
        right,
        result,
        currentCase,
        performanceByAgentId
      )
      const leftNextValue = clamp(
        leftPrevious + directionalDelta.leftDelta,
        RELATIONSHIP_MIN,
        RELATIONSHIP_MAX
      )
      const rightNextValue = clamp(
        rightPrevious + directionalDelta.rightDelta,
        RELATIONSHIP_MIN,
        RELATIONSHIP_MAX
      )

      nextAgents[leftId] = {
        ...left,
        relationships: {
          ...left.relationships,
          [rightId]: leftNextValue,
        },
      }
      nextAgents[rightId] = {
        ...right,
        relationships: {
          ...right.relationships,
          [leftId]: rightNextValue,
        },
      }

      if (leftNextValue !== leftPrevious || rightNextValue !== rightPrevious) {
        updates.push({
          leftId,
          rightId,
          leftPrevious,
          rightPrevious,
          leftNext: leftNextValue,
          rightNext: rightNextValue,
        })
      }
    }
  }

  return {
    agents: nextAgents,
    updates,
  }
}

function rollMissionCasualty(input: {
  currentCase: CaseInstance
  agent: NonNullable<GameState['agents'][string]>
  outcome: ResolutionOutcome
  performance?: AgentResolutionPerformance
  assignedAgents: NonNullable<GameState['agents'][string]>[]
  teamPerformanceSummary: ReturnType<typeof aggregateAssignedPerformanceSummary>
  rng: () => number
}): { injurySeverity: InjurySeverity | null; fatal: boolean } {
  const { currentCase, agent, outcome, performance, assignedAgents, teamPerformanceSummary, rng } = input

  if (outcome.result !== 'fail' || agent.status !== 'active') {
    return { injurySeverity: null, fatal: false }
  }

  const riskProfile = evaluateMissionAgentFailureRisk({
    currentCase,
    agent,
    performance,
    performanceSummary: teamPerformanceSummary,
    agents: assignedAgents,
  })

  if (agent.fatigue >= GUARANTEED_INJURY_FATIGUE) {
    if (riskProfile.deathChanceOnFailure > 0 && rng() <= riskProfile.deathChanceOnFailure) {
      return { injurySeverity: null, fatal: true }
    }

    return { injurySeverity: 'moderate', fatal: false }
  }

  if (agent.fatigue < INJURY_RISK_FATIGUE_MIN && riskProfile.injuryChanceOnFailure <= 0) {
    return { injurySeverity: null, fatal: false }
  }

  if (rng() > riskProfile.injuryChanceOnFailure) {
    return { injurySeverity: null, fatal: false }
  }

  if (
    riskProfile.deathChanceOnFailure > 0 &&
    rng() <= riskProfile.deathChanceOnFailure / Math.max(riskProfile.injuryChanceOnFailure, 0.001)
  ) {
    return { injurySeverity: null, fatal: true }
  }

  const moderateShare = riskProfile.injuryChanceOnFailure
    ? (riskProfile.moderateInjuryChanceOnFailure + riskProfile.deathChanceOnFailure) /
      riskProfile.injuryChanceOnFailure
    : 0

  return {
    injurySeverity:
      moderateShare >= 0.5 || agent.fatigue >= 70 || currentCase.stage >= 3 ? 'moderate' : 'minor',
    fatal: false,
  }
}

export function applyMissionResolutionAgentMutations({
  agents,
  assignedAgents,
  assignedAgentLeaderBonuses,
  effectiveCase,
  outcome,
  week,
  rng,
}: ApplyMissionResolutionAgentMutationsInput): ApplyMissionResolutionAgentMutationsOutput {
  const eventDrafts: AnyOperationEventDraft[] = []
  const missionInjuries: MissionInjuryRecord[] = []
  const missionFatalities: MissionFatalityRecord[] = []
  let fundingDelta = 0
  let nextAgents = { ...agents }
  const performanceByAgentId = new Map(
    (outcome.agentPerformance ?? []).map((performance) => [performance.agentId, performance])
  )
  const teamPerformanceSummary = aggregateAssignedPerformanceSummary(outcome)

  const xpGain =
    outcome.result === 'success'
      ? XP_GAIN_SUCCESS
      : outcome.result === 'partial'
        ? XP_GAIN_PARTIAL
        : XP_GAIN_FAIL

  for (const agent of assignedAgents) {
    const leaderBonus = assignedAgentLeaderBonuses[agent.id]
    const performance = performanceByAgentId.get(agent.id)
    const casualty = rollMissionCasualty({
      currentCase: effectiveCase,
      agent,
      outcome,
      performance,
      assignedAgents,
      teamPerformanceSummary,
      rng,
    })
    const injurySeverity = casualty.injurySeverity
    const sustainedDamage = casualty.fatal
      ? 100
      : injurySeverity === 'moderate'
        ? 25
        : injurySeverity === 'minor'
          ? 10
          : 0
    const anomalyExposure = hasAnomalyCaseContext(effectiveCase) ? 1 : 0
    const evidenceRecovered =
      outcome.result !== 'fail' && hasEvidenceRecoveryContext(effectiveCase) ? 1 : 0
    const anomaliesContained =
      outcome.result === 'success' && hasAnomalyCaseContext(effectiveCase) ? 1 : 0
    const historyEntries: AgentHistoryEntry[] = [
      buildCaseResolutionHistoryEntry(week, effectiveCase, outcome.result),
    ]

    if (casualty.fatal) {
      missionFatalities.push({
        agentId: agent.id,
        agentName: agent.name,
        damage: sustainedDamage,
      })
      historyEntries.push(buildFatalityHistoryEntry(week, effectiveCase))
    } else if (injurySeverity) {
      missionInjuries.push({
        agentId: agent.id,
        agentName: agent.name,
        severity: injurySeverity,
        damage: sustainedDamage,
      })
      historyEntries.push(buildInjuryHistoryEntry(week, effectiveCase, injurySeverity))
    }

    const xpGainAdjusted = Math.max(0, Math.round(xpGain * (1 + (leaderBonus?.xpBonus ?? 0))))
    const progressionUpdate = applyAgentXp(agent, xpGainAdjusted)
    const xpReasonLabel =
      outcome.result === 'success'
        ? `Case '${effectiveCase.title}' resolved`
        : outcome.result === 'partial'
          ? `Case '${effectiveCase.title}' partially resolved`
          : `Case '${effectiveCase.title}' failed`
    const nextAssignment = casualty.fatal
      ? ({ state: 'idle' } as const)
      : injurySeverity
      ? {
          state: 'recovery' as const,
          teamId: agent.assignment?.teamId,
          startedWeek: week,
        }
      : ({ state: 'idle' } as const)
    const nextVitals = casualty.fatal
      ? {
          ...(agent.vitals ?? {
            health: 100,
            stress: agent.fatigue,
            morale: Math.max(0, 100 - agent.fatigue),
            wounds: 0,
            statusFlags: [],
          }),
          health: 0,
          morale: 0,
          wounds: 100,
          statusFlags: ['fatality'],
        }
      : injurySeverity
      ? {
          ...(agent.vitals ?? {
            health: 100,
            stress: agent.fatigue,
            morale: Math.max(0, 100 - agent.fatigue),
            wounds: 0,
            statusFlags: [],
          }),
          health: clamp(
            (agent.vitals?.health ?? 100) - (injurySeverity === 'moderate' ? 25 : 10),
            0,
            100
          ),
          morale: clamp(
              (agent.vitals?.morale ?? Math.max(0, 100 - agent.fatigue)) -
              (injurySeverity === 'moderate' ? 18 : 8),
            0,
            100
          ),
          wounds: injurySeverity === 'moderate' ? 25 : 10,
          statusFlags: withInjuryFlags(agent.vitals?.statusFlags, injurySeverity),
        }
      : agent.vitals

    const resolvedAgent = appendAgentHistoryEntries(
      setAgentAssignment(
        {
          ...agent,
          status: casualty.fatal ? 'dead' : injurySeverity ? 'injured' : agent.status,
          ...(nextVitals ? { vitals: nextVitals } : {}),
        },
        nextAssignment
      ),
      historyEntries,
      {
        assignmentsCompleted: 1,
        casesResolved: outcome.result === 'success' ? 1 : 0,
        casesPartiallyResolved: outcome.result === 'partial' ? 1 : 0,
        casesFailed: outcome.result === 'fail' ? 1 : 0,
        anomalyExposures: anomalyExposure,
        evidenceRecovered,
        damageSustained: sustainedDamage,
        anomaliesContained,
      }
    )
    let nextAgent = resolvedAgent

    if (!casualty.fatal) {
      const progressedAgent = applyAgentProgressionUpdate(resolvedAgent, progressionUpdate)
      const progressedAgentWithXpLog = recordAgentXpGain(
        progressedAgent,
        xpGainAdjusted,
        xpReasonLabel,
        week
      )

      nextAgent = progressionUpdate.reachedLevels.reduce(
        (currentAgent, level) =>
          appendAgentHistoryEntry(
            currentAgent,
            createAgentHistoryEntry(week, 'simulation.weekly_tick', `Reached level ${level}.`)
          ),
        progressedAgentWithXpLog
      )
      const discovery = observePotentialIntel(
        nextAgent.progression ?? createDefaultAgentProgression(nextAgent.level ?? 1),
        {
          week,
          source: 'mission',
          discoveryDelta: getMissionPotentialDiscoveryDelta(effectiveCase, outcome, performance),
        }
      )

      nextAgent = {
        ...nextAgent,
        progression: {
          ...(nextAgent.progression ?? createDefaultAgentProgression(nextAgent.level ?? 1)),
          potentialIntel: discovery.potentialIntel,
        },
      }

      if (discovery.note) {
        nextAgent = appendAgentHistoryEntry(
          nextAgent,
          createAgentHistoryEntry(week, 'simulation.weekly_tick', discovery.note)
        )
      }

      if (shouldTriggerMissionBreakthrough(nextAgent, effectiveCase, outcome, performance)) {
        const breakthrough = applyPotentialBreakthrough(
          nextAgent.progression ?? createDefaultAgentProgression(nextAgent.level ?? 1),
          week
        )

        if (breakthrough.changed) {
          nextAgent = {
            ...nextAgent,
            progression: {
              ...breakthrough.progression,
              statCaps: buildAgentStatCaps(
                nextAgent.baseStats,
                breakthrough.progression.potentialTier,
                breakthrough.progression.growthProfile,
                nextAgent.progression?.statCaps
              ),
            },
          }

          if (breakthrough.note) {
            nextAgent = appendAgentHistoryEntry(
              nextAgent,
              createAgentHistoryEntry(week, 'simulation.weekly_tick', breakthrough.note)
            )
          }
        }
      }

      if (progressionUpdate.xpGained > 0) {
        eventDrafts.push(
          createProgressionXpGainedDraft({
            week,
            agentId: agent.id,
            agentName: agent.name,
            xpAmount: progressionUpdate.xpGained,
            reason: xpReasonLabel,
            totalXp: progressionUpdate.progression.xp,
            level: progressionUpdate.level,
            levelsGained: progressionUpdate.levelsGained,
          })
        )
      }

      if (progressionUpdate.leveledUp) {
        eventDrafts.push(
          createAgentPromotedDraft({
            week,
            agentId: agent.id,
            agentName: agent.name,
            newRole: agent.role,
            previousLevel: progressionUpdate.previousLevel,
            newLevel: progressionUpdate.level,
            levelsGained: progressionUpdate.levelsGained,
            skillPointsGranted: progressionUpdate.skillPointsGranted,
          })
        )
      }
    }

    if (injurySeverity) {
      eventDrafts.push(
        createAgentInjuredDraft({
          week,
          agentId: agent.id,
          agentName: agent.name,
          severity: injurySeverity,
        })
      )
    }

    if (casualty.fatal) {
      eventDrafts.push(
        createAgentKilledDraft({
          week,
          agentId: agent.id,
          agentName: agent.name,
          caseId: effectiveCase.id,
          caseTitle: effectiveCase.title,
        })
      )
    }

    nextAgents[agent.id] = nextAgent
  }

  const relationshipOutcome = applyRelationshipOutcome(
    nextAgents,
    assignedAgents.map((agent) => agent.id),
    outcome.result,
    effectiveCase,
    performanceByAgentId
  )
  nextAgents = relationshipOutcome.agents

  for (const update of relationshipOutcome.updates) {
    const leftAgent = nextAgents[update.leftId]
    const rightAgent = nextAgents[update.rightId]

    if (!leftAgent || !rightAgent) {
      continue
    }

    eventDrafts.push(
      createAgentRelationshipChangedDraft({
        week,
        agentId: update.leftId,
        agentName: leftAgent.name,
        counterpartId: update.rightId,
        counterpartName: rightAgent.name,
        previousValue: update.leftPrevious,
        nextValue: update.leftNext,
        delta: roundRelationshipDelta(update.leftNext - update.leftPrevious),
        reason: getRelationshipChangeReason(outcome.result),
      }),
      createAgentRelationshipChangedDraft({
        week,
        agentId: update.rightId,
        agentName: rightAgent.name,
        counterpartId: update.leftId,
        counterpartName: leftAgent.name,
        previousValue: update.rightPrevious,
        nextValue: update.rightNext,
        delta: roundRelationshipDelta(update.rightNext - update.rightPrevious),
        reason: getRelationshipChangeReason(outcome.result),
      })
    )
  }

  const betrayal = applyBetrayalConsequences({
    agents: nextAgents,
    updates: relationshipOutcome.updates,
    outcome: outcome.result,
    performanceByAgentId,
    week,
  })
  nextAgents = betrayal.nextAgents
  fundingDelta += betrayal.fundingDelta
  eventDrafts.push(...betrayal.eventDrafts)

  for (const agent of assignedAgents) {
    const collaboratorIds = assignedAgents
      .map((candidate) => candidate.id)
      .filter((candidateId) => candidateId !== agent.id)
    const agentPerformance = performanceByAgentId.get(agent.id)
    const currentAgent = nextAgents[agent.id]

    if (!currentAgent) {
      continue
    }

    let collaboratorAgent = recordAgentCollaborators(currentAgent, collaboratorIds)

    if (agentPerformance) {
      collaboratorAgent = recordAgentPerformance(
        collaboratorAgent,
        agentPerformance,
        agentPerformance.powerImpact
      )
    }

    nextAgents[agent.id] = collaboratorAgent
  }

  for (const agent of assignedAgents) {
    const currentAgent = nextAgents[agent.id]
    const collaboratorIds = assignedAgents
      .map((candidate) => candidate.id)
      .filter((candidateId) => candidateId !== agent.id)

    if (!currentAgent || !currentAgent.history) {
      continue
    }

    nextAgents[agent.id] = {
      ...currentAgent,
      history: {
        ...currentAgent.history,
        bonds: collaboratorIds.reduce<Record<string, number>>(
          (bonds, collaboratorId) => {
            bonds[collaboratorId] =
              currentAgent.relationships[collaboratorId] ?? bonds[collaboratorId] ?? 0
            return bonds
          },
          { ...currentAgent.history.bonds }
        ),
      },
    }
  }

  return {
    nextAgents,
    missionInjuries,
    missionFatalities,
    eventDrafts,
    fundingDelta,
  }
}
