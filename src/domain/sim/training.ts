import {
  appendOperationEventDrafts,
  type AnyOperationEventDraft,
  createProgressionXpGainedDraft,
  createAgentPromotedDraft,
  createAgentTrainingStartedDraft,
  createAgentTrainingCompletedDraft,
  createAgentTrainingCancelledDraft,
} from '../events'
import {
  applyPotentialBreakthrough,
  buildAgentStatCaps,
  getAgentStatCap,
  isAgentAtStatCap,
  observePotentialIntel,
} from '../agentPotential'
import { clamp } from '../math'
import { applyAgentXp } from '../progression'
import {
  createDefaultAgentAssignmentState,
  createDefaultAgentProgression,
  createDefaultAgentSkillTree,
} from '../agentDefaults'
import {
  appendAgentHistoryEntry,
  applyAgentProgressionUpdate,
  createAgentHistoryEntry,
  recordAgentXpGain,
  setAgentAssignment,
} from '../agent/lifecycle'
import { getAgentInstructorBonus } from './instructorAssignment'
import { getAcademyStatBonus } from './academyUpgrade'
import {
  applyAgentNicheUnlocks,
  getAgentTrainingNicheAptitude,
} from '../nicheIdentity'
import { cloneDomainStats, deriveDomainStatsFromBase } from '../statDomains'
import {
  ensureNormalizedGameState,
  getTeamAssignedCaseId,
  getTeamMemberIds,
  normalizeGameState,
} from '../teamSimulation'
import { assessResearchRequirements } from '../research'
import {
  type Agent,
  type AgentRole,
  type GameState,
  type Id,
  type InstructorData,
  type StatKey,
  type Team,
  type TrainingProgram,
  type TrainingQueueEntry,
  BASE_STAT_MAX,
} from '../models'
import { applyBoundedDelta } from '../shared/modifiers'
import { getTrainingProgram } from '../../data/training'

/**
 * Primary stat affinity per agent role. Training the affinity stat grants +1 extra statDelta.
 */
export const ROLE_TRAINING_APTITUDE: Record<AgentRole, StatKey> = {
  hunter: 'combat',
  occultist: 'investigation',
  investigator: 'investigation',
  field_recon: 'investigation',
  medium: 'social',
  tech: 'utility',
  medic: 'utility',
  negotiator: 'social',
}

export {
  buildTrainingCertificationSummary,
  reviewCertification,
  transitionCertification,
} from './training-compat'

export function getTrainingAptitudeBonus(agentRole: AgentRole, targetStat: StatKey): number {
  if (agentRole === 'field_recon' && (targetStat === 'investigation' || targetStat === 'utility')) {
    return 1
  }

  return ROLE_TRAINING_APTITUDE[agentRole] === targetStat ? 1 : 0
}

function nextTrainingQueueId(state: GameState, offset = 0) {
  return `training-${state.week}-${state.trainingQueue.length + offset + 1}-${state.events.length + 1}`
}

function nextTrainingDrillGroupId(state: GameState) {
  return `training-group-${state.week}-${state.trainingQueue.length + 1}-${state.events.length + 1}`
}

function getAgentTeam(state: GameState, agentId: Id): Team | undefined {
  return Object.values(state.teams).find((team) => getTeamMemberIds(team).includes(agentId))
}

function getScopedTrainingProgram(trainingId: string, scope: 'agent' | 'team') {
  const program = getTrainingProgram(trainingId)

  if (!program) {
    return null
  }

  return (program.scope ?? 'agent') === scope ? program : null
}

export function isTrainingProgramUnlocked(
  state: Pick<GameState, 'academyTier'>,
  program: Pick<TrainingProgram, 'minAcademyTier'>
) {
  return (state.academyTier ?? 0) >= (program.minAcademyTier ?? 0)
}

function buildQueueEntry(
  state: GameState,
  agent: Agent,
  program: TrainingProgram,
  offset = 0,
  options: Partial<
    Pick<TrainingQueueEntry, 'scope' | 'teamId' | 'teamName' | 'drillGroupId' | 'memberIds'>
  > = {}
): TrainingQueueEntry {
  const isTeamDrill = (options.scope ?? program.scope ?? 'agent') === 'team'
  return {
    id: nextTrainingQueueId(state, offset),
    trainingId: program.trainingId,
    trainingName: program.name,
    scope: options.scope ?? program.scope ?? 'agent',
    agentId: agent.id,
    agentName: agent.name,
    teamId: options.teamId,
    teamName: options.teamName,
    drillGroupId: options.drillGroupId,
    memberIds: options.memberIds ? [...options.memberIds] : undefined,
    targetStat: program.targetStat,
    statDelta: program.statDelta,
    startedWeek: state.week,
    durationWeeks: program.durationWeeks,
    remainingWeeks: program.durationWeeks,
    fundingCost: program.fundingCost,
    fatigueDelta: program.fatigueDelta,
    recoveryBonus: program.recoveryBonus,
    stabilityResistanceDelta: program.stabilityResistanceDelta,
    stabilityToleranceDelta: program.stabilityToleranceDelta,
    // Team drills do not grant stat bonuses — they build chemistry and bonds only.
    // For agent training, snapshot at queue time so academy upgrades don't
    // retroactively benefit in-flight entries.
    academyStatBonus: isTeamDrill ? 0 : getAcademyStatBonus(state.academyTier ?? 0),
    relationshipDelta: program.relationshipDelta ?? 0,
    trainedRelationshipDelta: program.trainedRelationshipDelta ?? 0,
  }
}

const TRAINING_FATIGUE_CURVE_EXPONENT = 0.85

function getTrainingFatigueCumulative(entry: TrainingQueueEntry, elapsedWeeks: number) {
  if (elapsedWeeks <= 0) {
    return 0
  }

  if (elapsedWeeks >= entry.durationWeeks) {
    return entry.fatigueDelta
  }

  const progress = elapsedWeeks / entry.durationWeeks
  return Math.round(entry.fatigueDelta * Math.pow(progress, TRAINING_FATIGUE_CURVE_EXPONENT))
}

export function getTrainingIncurredFatigue(entry: TrainingQueueEntry) {
  const elapsedWeeks = entry.durationWeeks - entry.remainingWeeks
  return getTrainingFatigueCumulative(entry, elapsedWeeks)
}

export function getTrainingFatigueSchedule(entry: TrainingQueueEntry): number[] {
  const schedule: number[] = []
  for (let week = 1; week <= entry.durationWeeks; week++) {
    const before = getTrainingFatigueCumulative(entry, week - 1)
    const after = getTrainingFatigueCumulative(entry, week)
    schedule.push(Math.max(0, after - before))
  }
  return schedule
}

export function getTrainingProjectedTotalFatigue(entry: TrainingQueueEntry) {
  return entry.fatigueDelta
}

export function getTrainingCancelRefund(entry: TrainingQueueEntry) {
  return Math.floor((entry.fundingCost * entry.remainingWeeks) / entry.durationWeeks)
}

function getTrainingFatigueTick(entry: TrainingQueueEntry, nextRemainingWeeks: number) {
  const elapsedBefore = entry.durationWeeks - entry.remainingWeeks
  const elapsedAfter = entry.durationWeeks - nextRemainingWeeks
  const cumulativeBefore = getTrainingFatigueCumulative(entry, elapsedBefore)
  const cumulativeAfter = getTrainingFatigueCumulative(entry, elapsedAfter)
  return Math.max(0, cumulativeAfter - cumulativeBefore)
}

function buildTrainingStartedNote(program: TrainingProgram, teamName?: string) {
  return teamName ? `Started ${program.name} with ${teamName}.` : `Started ${program.name}.`
}

function buildTrainingCompletedNote(entry: TrainingQueueEntry) {
  return `${entry.trainingName} completed.`
}

function buildTrainingCompletionSummary(entry: TrainingQueueEntry) {
  return entry.scope === 'team' && entry.teamName
    ? `${entry.agentName}: ${entry.trainingName} completed with ${entry.teamName}.`
    : `${entry.agentName}: ${entry.trainingName} completed.`
}

function hasSecondaryTrainingBenefits(
  entry: Pick<
    TrainingQueueEntry,
    'recoveryBonus' | 'stabilityResistanceDelta' | 'stabilityToleranceDelta'
  >
) {
  return (
    (entry.recoveryBonus ?? 0) > 0 ||
    (entry.stabilityResistanceDelta ?? 0) > 0 ||
    (entry.stabilityToleranceDelta ?? 0) > 0
  )
}

function getTrainingPotentialDiscoveryDelta(
  currentAgent: Agent,
  entry: TrainingQueueEntry,
  actualGain: number,
  instructorBonus: number
) {
  if (entry.scope === 'team') {
    return 0
  }

  const currentCap = getAgentStatCap(currentAgent, entry.targetStat)
  let discoveryDelta = actualGain > 0 ? 18 : 8

  if (entry.durationWeeks >= 3) {
    discoveryDelta += 5
  }

  if (instructorBonus > 0) {
    discoveryDelta += 8
  }

  if (currentAgent.baseStats[entry.targetStat] >= currentCap - 2) {
    discoveryDelta += 12
  }

  if (hasSecondaryTrainingBenefits(entry)) {
    discoveryDelta += 6
  }

  return discoveryDelta
}

function shouldTriggerTrainingBreakthrough(
  agent: Agent,
  currentAgent: Agent,
  entry: TrainingQueueEntry,
  actualGain: number,
  instructorBonus: number
) {
  if (entry.scope === 'team') {
    return false
  }

  const progression = agent.progression ?? createDefaultAgentProgression(agent.level ?? 1)
  const intel = progression.potentialIntel

  if (
    (progression.potentialIntel?.exactKnown ?? false) === false &&
    (intel?.discoveryProgress ?? 0) < 85
  ) {
    return false
  }

  if ((progression.level ?? agent.level ?? 1) < 3) {
    return false
  }

  if (actualGain <= 0) {
    return false
  }

  if (entry.durationWeeks < 3 && instructorBonus <= 0) {
    return false
  }

  const currentCap = getAgentStatCap(currentAgent, entry.targetStat)
  return currentAgent.baseStats[entry.targetStat] >= currentCap - 2
}

function setTrainingAssignment(
  agent: Agent,
  week: number,
  trainingProgramId: string,
  teamId?: string
) {
  return setAgentAssignment(agent, {
    state: 'training',
    startedWeek: week,
    teamId,
    trainingProgramId,
  })
}

/** Agents at or above this fatigue level cannot be queued for training. */
export const TRAINING_FATIGUE_GATE = 80

export type AgentTrainingQueueBlockReason =
  | 'missing_agent'
  | 'missing_program'
  | 'program_locked'
  | 'agent_unavailable'
  | 'already_training'
  | 'fatigue_gate'
  | 'no_slots'
  | 'already_queued'
  | 'team_deployed'
  | 'insufficient_funding'
  | 'stat_maxed'

export interface AgentTrainingQueueAssessment {
  canQueue: boolean
  reason?: AgentTrainingQueueBlockReason
  requiredTier?: number
  requiredFunding?: number
  missingResearchIds?: string[]
}

export type TeamTrainingQueueBlockReason =
  | 'missing_team'
  | 'missing_program'
  | 'program_locked'
  | 'team_undersized'
  | 'team_deployed'
  | 'insufficient_eligible_members'
  | 'no_slots'
  | 'insufficient_funding'

export interface TeamTrainingQueueAssessment {
  canQueue: boolean
  reason?: TeamTrainingQueueBlockReason
  requiredTier?: number
  requiredFunding?: number
  missingResearchIds?: string[]
  participantIds: Id[]
  scaledCost: number
}

function getEffectiveTrainingSlots(state: GameState) {
  return (state.config.trainingSlots ?? 4) + (state.academyTier ?? 0)
}

export function getTeamTrainingScaledCost(baseCost: number, participantCount: number) {
  if (participantCount <= 2) {
    return baseCost
  }

  const extraMembers = participantCount - 2
  return baseCost + Math.round(baseCost * 0.25 * extraMembers)
}

export function assessAgentTrainingQueue(
  state: GameState,
  agentId: Id,
  trainingId: string
): AgentTrainingQueueAssessment {
  const agent = state.agents[agentId]
  const program = getScopedTrainingProgram(trainingId, 'agent')

  if (!agent) {
    return { canQueue: false, reason: 'missing_agent' }
  }

  if (!program) {
    return { canQueue: false, reason: 'missing_program' }
  }

  if (!isTrainingProgramUnlocked(state, program)) {
    return {
      canQueue: false,
      reason: 'program_locked',
      requiredTier: program.minAcademyTier ?? 0,
    }
  }

  const researchAssessment = assessResearchRequirements(state, program.requiredResearchIds ?? [])
  if (!researchAssessment.satisfied) {
    return {
      canQueue: false,
      reason: 'program_locked',
      missingResearchIds: researchAssessment.missingIds,
    }
  }

  if (agent.status !== 'active') {
    return { canQueue: false, reason: 'agent_unavailable' }
  }

  if (isAgentTraining(agent)) {
    return { canQueue: false, reason: 'already_training' }
  }

  if (agent.fatigue >= TRAINING_FATIGUE_GATE) {
    return { canQueue: false, reason: 'fatigue_gate' }
  }

  const agentsTraining = Object.values(state.agents).filter(isAgentTraining).length
  const effectiveSlots = getEffectiveTrainingSlots(state)

  if (agentsTraining >= effectiveSlots) {
    return { canQueue: false, reason: 'no_slots' }
  }

  if (state.trainingQueue.some((entry) => entry.agentId === agent.id)) {
    return { canQueue: false, reason: 'already_queued' }
  }

  const team = getAgentTeam(state, agent.id)
  if (team && getTeamAssignedCaseId(team)) {
    return { canQueue: false, reason: 'team_deployed' }
  }

  if (state.funding < program.fundingCost) {
    return {
      canQueue: false,
      reason: 'insufficient_funding',
      requiredFunding: program.fundingCost,
    }
  }

  if (isAgentAtStatCap(agent, program.targetStat) && !hasSecondaryTrainingBenefits(program)) {
    return { canQueue: false, reason: 'stat_maxed' }
  }

  return { canQueue: true }
}

export function assessTeamTrainingQueue(
  state: GameState,
  teamId: Id,
  trainingId: string
): TeamTrainingQueueAssessment {
  const team = state.teams[teamId]
  const program = getScopedTrainingProgram(trainingId, 'team')

  if (!team) {
    return { canQueue: false, reason: 'missing_team', participantIds: [], scaledCost: 0 }
  }

  if (!program) {
    return { canQueue: false, reason: 'missing_program', participantIds: [], scaledCost: 0 }
  }

  if (!isTrainingProgramUnlocked(state, program)) {
    return {
      canQueue: false,
      reason: 'program_locked',
      requiredTier: program.minAcademyTier ?? 0,
      participantIds: [],
      scaledCost: 0,
    }
  }

  const researchAssessment = assessResearchRequirements(state, program.requiredResearchIds ?? [])
  if (!researchAssessment.satisfied) {
    return {
      canQueue: false,
      reason: 'program_locked',
      missingResearchIds: researchAssessment.missingIds,
      participantIds: [],
      scaledCost: 0,
    }
  }

  const memberIds = getTeamMemberIds(team)
  if (memberIds.length < 2) {
    return { canQueue: false, reason: 'team_undersized', participantIds: [], scaledCost: 0 }
  }

  if (getTeamAssignedCaseId(team)) {
    return { canQueue: false, reason: 'team_deployed', participantIds: [], scaledCost: 0 }
  }

  const eligibleMembers = memberIds
    .map((agentId) => state.agents[agentId])
    .filter(
      (agent): agent is Agent =>
        Boolean(agent) &&
        agent.status === 'active' &&
        !isAgentTraining(agent) &&
        agent.fatigue < TRAINING_FATIGUE_GATE &&
        !state.trainingQueue.some((entry) => entry.agentId === agent.id)
    )

  if (eligibleMembers.length < 2) {
    return {
      canQueue: false,
      reason: 'insufficient_eligible_members',
      participantIds: eligibleMembers.map((agent) => agent.id),
      scaledCost: 0,
    }
  }

  const agentsTraining = Object.values(state.agents).filter(isAgentTraining).length
  const freeSlots = Math.max(0, getEffectiveTrainingSlots(state) - agentsTraining)
  const participantIds = eligibleMembers.slice(0, freeSlots).map((agent) => agent.id)

  if (participantIds.length < 2) {
    return {
      canQueue: false,
      reason: 'no_slots',
      participantIds,
      scaledCost: 0,
    }
  }

  const scaledCost = getTeamTrainingScaledCost(program.fundingCost, participantIds.length)

  if (state.funding < scaledCost) {
    return {
      canQueue: false,
      reason: 'insufficient_funding',
      requiredFunding: scaledCost,
      participantIds,
      scaledCost,
    }
  }

  return {
    canQueue: true,
    participantIds,
    scaledCost,
  }
}

export function isAgentTraining(agent: Agent | undefined) {
  return agent?.assignment?.state === 'training'
}

export function isTeamBlockedByTraining(team: Team, agents: GameState['agents']) {
  return getTeamMemberIds(team).some((agentId) => isAgentTraining(agents[agentId]))
}

export function queueTraining(state: GameState, agentId: Id, trainingId: string): GameState {
  const agent = state.agents[agentId]
  const program = getScopedTrainingProgram(trainingId, 'agent')
  const assessment = assessAgentTrainingQueue(state, agentId, trainingId)

  if (!agent || !program || !assessment.canQueue) {
    return ensureNormalizedGameState(state)
  }

  const team = getAgentTeam(state, agentId)
  const queueEntry = buildQueueEntry(state, agent, program)

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        funding: state.funding - program.fundingCost,
        agents: {
          ...state.agents,
          [agentId]: appendAgentHistoryEntry(
            setTrainingAssignment(agent, state.week, program.trainingId, team?.id),
            createAgentHistoryEntry(
              state.week,
              'agent.training_started',
              buildTrainingStartedNote(program)
            )
          ),
        },
        trainingQueue: [...state.trainingQueue, queueEntry],
      },
      [
        createAgentTrainingStartedDraft({
          week: queueEntry.startedWeek,
          queueId: queueEntry.id,
          agentId: queueEntry.agentId,
          agentName: queueEntry.agentName,
          trainingId: queueEntry.trainingId,
          trainingName: queueEntry.trainingName,
          etaWeeks: queueEntry.durationWeeks,
          fundingCost: queueEntry.fundingCost,
        }),
      ]
    )
  )
}

export function queueTeamTraining(state: GameState, teamId: Id, trainingId: string): GameState {
  const team = state.teams[teamId]
  const program = getScopedTrainingProgram(trainingId, 'team')
  const assessment = assessTeamTrainingQueue(state, teamId, trainingId)

  if (!team || !program || !assessment.canQueue) {
    return ensureNormalizedGameState(state)
  }

  const members = assessment.participantIds
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
  const scaledCost = assessment.scaledCost

  const drillGroupId = nextTrainingDrillGroupId(state)
  const participantIds = members.map((m) => m.id)
  const queueEntries = members.map((agent, index) => ({
    ...buildQueueEntry(state, agent, program, index, {
      scope: 'team',
      teamId: team.id,
      teamName: team.name,
      drillGroupId,
      memberIds: participantIds,
    }),
    // Record the scaled cost so cancelTraining refunds the correct amount.
    fundingCost: scaledCost,
  }))
  const nextAgents = { ...state.agents }

  for (const agent of members) {
    nextAgents[agent.id] = appendAgentHistoryEntry(
      setTrainingAssignment(agent, state.week, program.trainingId, team.id),
      createAgentHistoryEntry(
        state.week,
        'agent.training_started',
        buildTrainingStartedNote(program, team.name)
      )
    )
  }

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        funding: state.funding - scaledCost,
        agents: nextAgents,
        trainingQueue: [...state.trainingQueue, ...queueEntries],
      },
      queueEntries.map((entry) =>
        createAgentTrainingStartedDraft({
          week: entry.startedWeek,
          queueId: entry.id,
          agentId: entry.agentId,
          agentName: entry.agentName,
          trainingId: entry.trainingId,
          trainingName: entry.trainingName,
          teamName: entry.teamName,
          etaWeeks: entry.durationWeeks,
          fundingCost: entry.fundingCost,
        })
      )
    )
  )
}

/**
 * Spends one accumulated skill point to permanently boost a target base stat by +1.
 * Sets the agent's specialization to the chosen stat on first spend.
 * No-ops if the agent has no skill points or the stat is already at the agent's ceiling.
 */
export function spendSkillPoint(state: GameState, agentId: Id, stat: StatKey): GameState {
  const agent = state.agents[agentId]

  if (!agent) {
    return ensureNormalizedGameState(state)
  }

  // Skill points may only be spent while the agent is active and not deployed on a case.
  if (agent.status !== 'active' || agent.assignment?.state === 'assigned') {
    return ensureNormalizedGameState(state)
  }

  const currentSkillTree = agent.progression?.skillTree ?? createDefaultAgentSkillTree()

  if (currentSkillTree.skillPoints < 1 || isAgentAtStatCap(agent, stat)) {
    return ensureNormalizedGameState(state)
  }

  const statCap = getAgentStatCap(agent, stat)
  const nextBaseStats = {
    ...agent.baseStats,
    [stat]: clamp(agent.baseStats[stat] + 1, 0, statCap),
  }
  const nextSkillTree = {
    ...currentSkillTree,
    skillPoints: currentSkillTree.skillPoints - 1,
    specialization: currentSkillTree.specialization ?? stat,
  }
  const nextAgent = {
    ...agent,
    baseStats: nextBaseStats,
    progression: {
      ...(agent.progression ?? createDefaultAgentProgression()),
      skillTree: nextSkillTree,
    },
  }

  return normalizeGameState({
    ...state,
    agents: { ...state.agents, [agentId]: nextAgent },
  })
}

function applyTrainingCompletionToAgent(
  currentAgent: Agent,
  entry: TrainingQueueEntry,
  week: number,
  instructorBonus = 0
) {
  // Team drills are chemistry-only: no stat gain, no XP, no instructor or academy bonuses.
  const aptitudeBonus =
    entry.scope === 'team' ? 0 : getTrainingAptitudeBonus(currentAgent.role, entry.targetStat)
  const nicheAptitudeBonus =
    entry.scope === 'team' ? 0 : getAgentTrainingNicheAptitude(currentAgent, entry.targetStat).bonus
  const totalAptitudeBonus = aptitudeBonus + nicheAptitudeBonus
  const rawGain =
    entry.scope === 'team'
      ? 0
      : entry.statDelta +
        (entry.academyStatBonus ?? 0) +
        totalAptitudeBonus +
        instructorBonus
  const targetCap = getAgentStatCap(currentAgent, entry.targetStat)
  const cappedStat = clamp(currentAgent.baseStats[entry.targetStat] + rawGain, 0, targetCap)
  const actualGain = cappedStat - currentAgent.baseStats[entry.targetStat]
  // Any suppressed gain (due to stat cap) converts at 15 XP per point so agents
  // near maximum still benefit from training.
  const overflowXp = (rawGain - actualGain) * 15
  // Agents who deliberately train outside their aptitude earn a cross-training bonus
  // that scales with program length to reward intentional stat diversification.
  const crossTrainingXp =
    entry.scope !== 'team' && totalAptitudeBonus <= 0 ? Math.round(5 * (entry.durationWeeks / 2)) : 0
  // Instructors also improve retention, yielding a modest XP bonus on completion.
  const instructorXpBonus =
    entry.scope !== 'team' && instructorBonus > 0
      ? Math.round(instructorBonus * 5 * (entry.durationWeeks / 2))
      : 0

  const nextBaseStats = {
    ...currentAgent.baseStats,
    [entry.targetStat]: cappedStat,
  }
  const previousDerivedStats = deriveDomainStatsFromBase(currentAgent.baseStats)
  const nextDerivedStats = deriveDomainStatsFromBase(nextBaseStats)
  const nextStats = currentAgent.stats
    ? cloneDomainStats(currentAgent.stats)
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

  // Direct stability-training pathway (gap fix): specific programs can improve
  // resilience-derived stats independently of base-stat deltas.
  nextStats.stability.resistance = applyBoundedDelta(
    nextStats.stability.resistance,
    entry.stabilityResistanceDelta ?? 0,
    { min: 0, max: BASE_STAT_MAX }
  )
  nextStats.stability.tolerance = applyBoundedDelta(
    nextStats.stability.tolerance,
    entry.stabilityToleranceDelta ?? 0,
    { min: 0, max: BASE_STAT_MAX }
  )

  // XP scales with actual raw gain (including academy and instructor bonuses) so
  // investment in the academy and instructors translates into progression rewards.
  const progressionUpdate = applyAgentXp(
    currentAgent,
    Math.round(rawGain * 10 * (entry.durationWeeks / 2)) +
      overflowXp +
      crossTrainingXp +
      instructorXpBonus
  )
  const xpReason = `${entry.trainingName} completed`
  const completedAgent = appendAgentHistoryEntry(
    setAgentAssignment(
      {
        ...currentAgent,
        baseStats: nextBaseStats,
        stats: nextStats,
        // Fatigue is now applied incrementally per week while training advances.
        // Completion does not apply a second lump-sum delta.
        fatigue: currentAgent.fatigue,
        recoveryRateBonus: entry.recoveryBonus
          ? (currentAgent.recoveryRateBonus ?? 0) + entry.recoveryBonus
          : currentAgent.recoveryRateBonus,
      },
      createDefaultAgentAssignmentState()
    ),
    createAgentHistoryEntry(week, 'agent.training_completed', buildTrainingCompletedNote(entry)),
    { trainingWeeks: entry.durationWeeks }
  )
  const unlockedAgent = applyAgentNicheUnlocks(completedAgent)
  const completedAgentWithUnlockNotes = unlockedAgent.notes.reduce(
    (agent, note) =>
      appendAgentHistoryEntry(
        agent,
        createAgentHistoryEntry(week, 'simulation.weekly_tick', note)
      ),
    unlockedAgent.agent
  )
  const progressedAgent = applyAgentProgressionUpdate(completedAgentWithUnlockNotes, progressionUpdate)
  const progressedAgentWithXpLog = recordAgentXpGain(
    progressedAgent,
    progressionUpdate.xpGained,
    xpReason,
    week
  )
  let nextAgent = progressionUpdate.reachedLevels.reduce(
    (agent, level) =>
      appendAgentHistoryEntry(
        agent,
        createAgentHistoryEntry(week, 'simulation.weekly_tick', `Reached level ${level}.`)
      ),
    progressedAgentWithXpLog
  )

  if (entry.scope !== 'team') {
    const discovery = observePotentialIntel(
      nextAgent.progression ?? createDefaultAgentProgression(nextAgent.level ?? 1),
      {
        week,
        source: 'training',
        discoveryDelta: getTrainingPotentialDiscoveryDelta(
          currentAgent,
          entry,
          actualGain,
          instructorBonus
        ),
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

    if (
      shouldTriggerTrainingBreakthrough(nextAgent, currentAgent, entry, actualGain, instructorBonus)
    ) {
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
  }
  const eventDrafts: AnyOperationEventDraft[] = []

  if (progressionUpdate.xpGained > 0) {
    eventDrafts.push(
      createProgressionXpGainedDraft({
        week,
        agentId: entry.agentId,
        agentName: entry.agentName,
        xpAmount: progressionUpdate.xpGained,
        reason: xpReason,
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
        agentId: entry.agentId,
        agentName: entry.agentName,
        newRole: currentAgent.role,
        previousLevel: progressionUpdate.previousLevel,
        newLevel: progressionUpdate.level,
        levelsGained: progressionUpdate.levelsGained,
        skillPointsGranted: progressionUpdate.skillPointsGranted,
      })
    )
  }

  eventDrafts.push(
    createAgentTrainingCompletedDraft({
      week,
      queueId: entry.id,
      agentId: entry.agentId,
      agentName: entry.agentName,
      trainingId: entry.trainingId,
      trainingName: entry.trainingName,
    })
  )

  return {
    agent: nextAgent,
    summaryNote: buildTrainingCompletionSummary(entry),
    eventDrafts,
  }
}

function applyTeamDrillCoordination(
  nextAgents: GameState['agents'],
  completedEntries: readonly TrainingQueueEntry[]
) {
  const entriesByGroup = new Map<string, TrainingQueueEntry[]>()

  for (const entry of completedEntries) {
    if (entry.scope !== 'team' || !entry.drillGroupId) {
      continue
    }

    const existing = entriesByGroup.get(entry.drillGroupId) ?? []
    existing.push(entry)
    entriesByGroup.set(entry.drillGroupId, existing)
  }

  for (const entries of entriesByGroup.values()) {
    const memberIds = [...new Set(entries.flatMap((entry) => entry.memberIds ?? [entry.agentId]))]
    const relationshipDelta = Math.max(...entries.map((entry) => entry.relationshipDelta ?? 0), 0)
    const trainedRelationshipDelta = Math.max(
      ...entries.map((entry) => entry.trainedRelationshipDelta ?? 0),
      0
    )

    if (memberIds.length < 2 || (relationshipDelta <= 0 && trainedRelationshipDelta <= 0)) {
      continue
    }

    for (const agentId of memberIds) {
      const currentAgent = nextAgents[agentId]

      if (!currentAgent) {
        continue
      }

      const partnerIds = memberIds.filter(
        (memberId) => memberId !== agentId && Boolean(nextAgents[memberId])
      )
      const nextRelationships = { ...currentAgent.relationships }
      const fallbackProgression =
        currentAgent.progression ?? createDefaultAgentProgression(currentAgent.level ?? 1)
      const nextTrainedRelationships = {
        ...(fallbackProgression.skillTree?.trainedRelationships ?? {}),
      }
      const history = currentAgent.history
      const nextBonds = { ...(history?.bonds ?? {}) }
      const nextAlliesWorkedWith = [
        ...new Set([...(history?.alliesWorkedWith ?? []), ...partnerIds]),
      ]

      for (const partnerId of partnerIds) {
        if (relationshipDelta > 0) {
          nextRelationships[partnerId] = clamp(
            (nextRelationships[partnerId] ?? 0) + relationshipDelta,
            -2,
            2
          )
        }

        if (trainedRelationshipDelta > 0) {
          nextTrainedRelationships[partnerId] = Math.max(
            0,
            Math.trunc((nextTrainedRelationships[partnerId] ?? 0) + trainedRelationshipDelta)
          )
        }

        nextBonds[partnerId] = nextRelationships[partnerId] ?? nextBonds[partnerId] ?? 0
      }

      nextAgents[agentId] = {
        ...currentAgent,
        relationships: nextRelationships,
        progression: {
          ...fallbackProgression,
          skillTree: {
            skillPoints: fallbackProgression.skillTree?.skillPoints ?? 0,
            specialization: fallbackProgression.skillTree?.specialization,
            trainedRelationships: nextTrainedRelationships,
          },
        },
        history: history
          ? {
              ...history,
              bonds: nextBonds,
              alliesWorkedWith: nextAlliesWorkedWith,
            }
          : history,
      }
    }
  }
}

export function advanceTrainingQueues(state: GameState) {
  if (state.trainingQueue.length === 0) {
    return {
      state: ensureNormalizedGameState(state),
      completed: [] as TrainingQueueEntry[],
      notes: [] as string[],
      eventDrafts: [] as AnyOperationEventDraft[],
    }
  }

  const nextQueue: TrainingQueueEntry[] = []
  const completed: TrainingQueueEntry[] = []
  const notes: string[] = []
  const eventDrafts: AnyOperationEventDraft[] = []
  const nextAgents = { ...state.agents }
  const nextStaff = { ...state.staff }

  for (const entry of state.trainingQueue) {
    const instructorBonus =
      entry.scope === 'team'
        ? 0
        : getAgentInstructorBonus(state.staff, entry.agentId, entry.targetStat)
    const remainingWeeks = Math.max(entry.remainingWeeks - 1, 0)
    const baseFatigueTick = getTrainingFatigueTick(entry, remainingWeeks)
    const fatigueTick =
      entry.scope === 'team' ? baseFatigueTick : Math.max(0, baseFatigueTick - instructorBonus)

    const tickedAgent = nextAgents[entry.agentId]
    if (tickedAgent && fatigueTick > 0) {
      nextAgents[entry.agentId] = {
        ...tickedAgent,
        fatigue: clamp(tickedAgent.fatigue + fatigueTick, 0, 100),
      }
    }

    if (remainingWeeks > 0) {
      nextQueue.push({
        ...entry,
        remainingWeeks,
      })
      continue
    }

    completed.push(entry)

    const currentAgent = nextAgents[entry.agentId]

    if (!currentAgent) {
      continue
    }

    const completion = applyTrainingCompletionToAgent(
      currentAgent,
      entry,
      state.week,
      instructorBonus
    )
    nextAgents[entry.agentId] = completion.agent
    notes.push(completion.summaryNote)
    eventDrafts.push(...completion.eventDrafts)

    // Auto-clear instructor assignment for this completed agent
    for (const staffId of Object.keys(nextStaff)) {
      const staffRecord = nextStaff[staffId]
      if (staffRecord.role === 'instructor' && staffRecord.assignedAgentId === entry.agentId) {
        nextStaff[staffId] = {
          role: 'instructor',
          name: staffRecord.name,
          efficiency: staffRecord.efficiency,
          instructorSpecialty: staffRecord.instructorSpecialty,
        }
      }
    }
  }

  applyTeamDrillCoordination(nextAgents, completed)

  return {
    state: normalizeGameState({
      ...state,
      agents: nextAgents,
      staff: nextStaff,
      trainingQueue: nextQueue,
    }),
    completed,
    notes,
    eventDrafts,
  }
}

export function cancelTraining(state: GameState, agentId: Id): GameState {
  const entry = state.trainingQueue.find((e) => e.agentId === agentId)

  if (!entry) {
    return ensureNormalizedGameState(state)
  }

  // Determine which queue entries to remove (individual or full drill group)
  const entriesToCancel = entry.drillGroupId
    ? state.trainingQueue.filter((e) => e.drillGroupId === entry.drillGroupId)
    : [entry]

  const cancelledAgentIds = entriesToCancel.map((e) => e.agentId)
  const nextQueue = state.trainingQueue.filter((e) => !cancelledAgentIds.includes(e.agentId))

  const nextAgents = { ...state.agents }

  for (const cancelled of entriesToCancel) {
    const agent = nextAgents[cancelled.agentId]

    if (!agent) {
      continue
    }

    nextAgents[cancelled.agentId] = appendAgentHistoryEntry(
      setAgentAssignment(agent, createDefaultAgentAssignmentState()),
      createAgentHistoryEntry(
        state.week,
        'agent.training_cancelled',
        `${cancelled.trainingName} cancelled.`
      )
    )
  }

  // Release any instructor assigned to a cancelled agent so they can be reassigned.
  const nextStaff = { ...state.staff }
  for (const [staffId, record] of Object.entries(state.staff)) {
    if (
      record.role === 'instructor' &&
      (record as InstructorData).assignedAgentId &&
      cancelledAgentIds.includes((record as InstructorData).assignedAgentId!)
    ) {
      const typed = record as InstructorData
      nextStaff[staffId] = {
        role: 'instructor',
        name: typed.name,
        efficiency: typed.efficiency,
        instructorSpecialty: typed.instructorSpecialty,
      } satisfies InstructorData
    }
  }

  // Partial refund: return only the unspent portion (remaining weeks / total weeks).
  // Elapsed instruction is forfeit — no free cancellation exploit.
  const refund = getTrainingCancelRefund(entry)

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        funding: state.funding + refund,
        agents: nextAgents,
        staff: nextStaff,
        trainingQueue: nextQueue,
      },
      entriesToCancel.map((cancelled, idx) =>
        createAgentTrainingCancelledDraft({
          week: state.week,
          agentId: cancelled.agentId,
          agentName: cancelled.agentName,
          trainingId: cancelled.trainingId,
          trainingName: cancelled.trainingName,
          refund: idx === 0 ? refund : 0,
        })
      )
    )
  )
}
