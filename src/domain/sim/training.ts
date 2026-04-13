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
import { cloneDomainStats, deriveDomainStatsFromBase } from '../statDomains'
import {
  ensureNormalizedGameState,
  getTeamAssignedCaseId,
  getTeamMemberIds,
  normalizeGameState,
  resolveFundingSensitiveNoopState,
} from '../teamSimulation'
import { assessResearchRequirements } from '../research'
import {
  type Agent,
  type AgentCertificationRecord,
  type AgentProgression,
  type AgentRole,
  type CertificationState,
  type GameState,
  type Id,
  type InstructorData,
  type StatKey,
  type TrainingCategory,
  type Team,
  type TrainingProgram,
  type TrainingQueueEntry,
  BASE_STAT_MAX,
} from '../models'
import { getTrainingProgram, trainingCatalog } from '../../data/training'

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

export interface CertificationDefinition {
  certificationId: string
  label: string
  category: TrainingCategory
  prerequisiteTrainingIds: string[]
  requiredProgress: number
  durationWeeks?: number
}

export interface CertificationTransitionResult {
  valid: boolean
  fromState: CertificationState
  toState: CertificationState
  blockingIssues: string[]
  warnings: string[]
}

export interface TrainingCertificationSummary {
  agentId: Id
  currentRole: AgentRole
  trainingStatus: 'idle' | 'queued' | 'in_progress' | 'blocked' | 'completed_recently'
  assignedTrainingId?: string
  trainingQueuePosition?: number
  readinessImpact: number
  trainingPoints: number
  certifications: Array<{
    certificationId: string
    state: CertificationState
    progress: number
    requiredProgress: number
    expiresWeek?: number
  }>
}

const CERTIFICATION_DEFINITIONS: Record<string, CertificationDefinition> = {
  'combat-operator-cert': {
    certificationId: 'combat-operator-cert',
    label: 'Combat Operator Certification',
    category: 'core_role_drills',
    prerequisiteTrainingIds: ['combat-drills', 'threat-assessment'],
    requiredProgress: 2,
  },
  'investigation-analyst-cert': {
    certificationId: 'investigation-analyst-cert',
    label: 'Investigation Analyst Certification',
    category: 'domain_skill_tracks',
    prerequisiteTrainingIds: ['analysis-lab', 'forensics-debrief'],
    requiredProgress: 2,
  },
  'field-systems-cert': {
    certificationId: 'field-systems-cert',
    label: 'Field Systems Certification',
    category: 'equipment_proficiency_modules',
    prerequisiteTrainingIds: ['field-improv', 'logistics-cycle'],
    requiredProgress: 2,
  },
  'readiness-compliance-cert': {
    certificationId: 'readiness-compliance-cert',
    label: 'Readiness Compliance Certification',
    category: 'operational_discipline_modules',
    prerequisiteTrainingIds: ['endurance-protocol', 'psych-conditioning'],
    requiredProgress: 2,
    durationWeeks: 16,
  },
  'field-liaison-cert': {
    certificationId: 'field-liaison-cert',
    label: 'Field Liaison Certification',
    category: 'cross_role_bridge_training',
    prerequisiteTrainingIds: ['liaison-briefing', 'incident-command-sim'],
    requiredProgress: 2,
  },
  'team-cohesion-cert': {
    certificationId: 'team-cohesion-cert',
    label: 'Team Cohesion Certification',
    category: 'advanced_certification_programs',
    prerequisiteTrainingIds: ['coordination-drill', 'crisis-integration'],
    requiredProgress: 2,
    durationWeeks: 24,
  },
}

const MAX_TRAINING_HISTORY = 24

function cloneCertificationRecord(record: AgentCertificationRecord): AgentCertificationRecord {
  return {
    ...record,
    ...(record.sourceTrainingIds ? { sourceTrainingIds: [...record.sourceTrainingIds] } : {}),
  }
}

function getCertificationDefinition(certificationId: string) {
  return CERTIFICATION_DEFINITIONS[certificationId]
}

function getAgentProgression(agent: Agent): AgentProgression {
  const progression =
    agent.progression ??
    createDefaultAgentProgression(agent.level ?? 1, undefined, undefined, agent.role)

  return {
    ...progression,
    trainingPoints: Math.max(0, Math.trunc(progression.trainingPoints ?? 0)),
    trainingHistory: [...(progression.trainingHistory ?? [])],
    certProgress: { ...(progression.certProgress ?? {}) },
    certifications: Object.fromEntries(
      Object.entries(progression.certifications ?? {}).map(([certificationId, record]) => [
        certificationId,
        cloneCertificationRecord(record),
      ])
    ),
    failedAttemptsByTrainingId: { ...(progression.failedAttemptsByTrainingId ?? {}) },
    trainingProfile: {
      agentId: progression.trainingProfile?.agentId ?? agent.id,
      currentRole: agent.role,
      trainingStatus: progression.trainingProfile?.trainingStatus ?? 'idle',
      assignedTrainingId: progression.trainingProfile?.assignedTrainingId,
      trainingStartedWeek: progression.trainingProfile?.trainingStartedWeek,
      trainingEtaWeek: progression.trainingProfile?.trainingEtaWeek,
      trainingQueuePosition: progression.trainingProfile?.trainingQueuePosition,
      readinessImpact: progression.trainingProfile?.readinessImpact ?? 0,
    },
  }
}

function withProgression(agent: Agent, progression: AgentProgression): Agent {
  return {
    ...agent,
    progression,
  }
}

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

function appendTrainingHistoryEntry(
  history: NonNullable<AgentProgression['trainingHistory']>,
  entry: { trainingId: string; week: number }
) {
  return [...history, entry].slice(-MAX_TRAINING_HISTORY)
}

function isCertificationPrerequisitesSatisfied(agent: Agent, certificationId: string) {
  const definition = getCertificationDefinition(certificationId)
  if (!definition) {
    return false
  }

  const progression = getAgentProgression(agent)
  const historyIds = new Set((progression.trainingHistory ?? []).map((entry) => entry.trainingId))
  const completedPrerequisites = definition.prerequisiteTrainingIds.filter((trainingId) =>
    historyIds.has(trainingId)
  ).length
  const progressValue = Math.max(0, Math.trunc(progression.certProgress?.[certificationId] ?? 0))

  return (
    completedPrerequisites >= definition.prerequisiteTrainingIds.length &&
    progressValue >= definition.requiredProgress
  )
}

export function getAgentCertificationState(agent: Agent, certificationId: string): CertificationState {
  return getAgentProgression(agent).certifications?.[certificationId]?.state ?? 'not_started'
}

export function validateCertificationTransition(
  agent: Agent,
  certificationId: string,
  toState: CertificationState,
  week: number,
  options?: {
    administrative?: boolean
  }
): CertificationTransitionResult {
  const definition = getCertificationDefinition(certificationId)
  const fromState = getAgentCertificationState(agent, certificationId)
  const blockingIssues: string[] = []
  const warnings: string[] = []

  if (!definition) {
    blockingIssues.push('unknown-certification')
    return {
      valid: false,
      fromState,
      toState,
      blockingIssues,
      warnings,
    }
  }

  if (fromState === toState) {
    warnings.push('no-op-transition')
    return {
      valid: true,
      fromState,
      toState,
      blockingIssues,
      warnings,
    }
  }

  const isPrereqSatisfied = isCertificationPrerequisitesSatisfied(agent, certificationId)

  const allowed =
    (fromState === 'not_started' && toState === 'in_progress') ||
    (fromState === 'in_progress' && toState === 'eligible_review' && isPrereqSatisfied) ||
    (fromState === 'eligible_review' && toState === 'certified' && isPrereqSatisfied) ||
    (fromState === 'certified' && toState === 'expired') ||
    (fromState === 'certified' && toState === 'revoked' && options?.administrative === true) ||
    (fromState === 'expired' && toState === 'in_progress')

  if (!allowed) {
    if (
      fromState === 'in_progress' &&
      toState === 'eligible_review' &&
      !isPrereqSatisfied
    ) {
      blockingIssues.push('prerequisites-not-complete')
    } else if (
      fromState === 'eligible_review' &&
      toState === 'certified' &&
      !isPrereqSatisfied
    ) {
      blockingIssues.push('review-prerequisites-not-complete')
    } else if (fromState === 'certified' && toState === 'revoked') {
      blockingIssues.push('administrative-approval-required')
    } else {
      blockingIssues.push('invalid-transition')
    }
  }

  if (toState === 'expired') {
    const record = getAgentProgression(agent).certifications?.[certificationId]
    if (!record?.expiresWeek || week < record.expiresWeek) {
      blockingIssues.push('certification-not-yet-expired')
    }
  }

  return {
    valid: blockingIssues.length === 0,
    fromState,
    toState,
    blockingIssues,
    warnings,
  }
}

function applyCertificationTransitionToAgent(
  agent: Agent,
  certificationId: string,
  toState: CertificationState,
  week: number,
  options?: {
    administrative?: boolean
    notes?: string
  }
) {
  const validation = validateCertificationTransition(agent, certificationId, toState, week, options)
  if (!validation.valid) {
    return {
      agent,
      result: validation,
    }
  }

  const progression = getAgentProgression(agent)
  const definition = getCertificationDefinition(certificationId)
  const currentRecord = progression.certifications?.[certificationId]
  const nextRecord: AgentCertificationRecord = {
    certificationId,
    state: toState,
    ...(toState === 'certified' ? { awardedWeek: week } : {}),
    ...(toState === 'certified' && definition?.durationWeeks
      ? { expiresWeek: week + definition.durationWeeks }
      : toState === 'expired'
        ? { expiresWeek: currentRecord?.expiresWeek ?? week }
        : {}),
    ...(currentRecord?.sourceTrainingIds ? { sourceTrainingIds: [...currentRecord.sourceTrainingIds] } : {}),
    ...(options?.notes ? { notes: options.notes } : currentRecord?.notes ? { notes: currentRecord.notes } : {}),
  }

  const nextProgression: AgentProgression = {
    ...progression,
    certifications: {
      ...(progression.certifications ?? {}),
      [certificationId]: nextRecord,
    },
  }

  return {
    agent: withProgression(agent, nextProgression),
    result: validation,
  }
}

function updateAgentTrainingProfileForQueue(state: GameState) {
  if (state.trainingQueue.length === 0) {
    return state
  }

  const nextAgents = { ...state.agents }

  for (const [index, entry] of state.trainingQueue.entries()) {
    const agent = nextAgents[entry.agentId]
    if (!agent) {
      continue
    }

    const progression = getAgentProgression(agent)
    nextAgents[entry.agentId] = withProgression(agent, {
      ...progression,
      trainingProfile: {
        agentId: agent.id,
        currentRole: agent.role,
        trainingStatus: 'in_progress',
        assignedTrainingId: entry.trainingId,
        trainingStartedWeek: entry.startedWeek,
        trainingEtaWeek: state.week + entry.remainingWeeks,
        trainingQueuePosition: index + 1,
        readinessImpact: Math.max(0, Math.trunc(entry.fatigueDelta)),
      },
    })
  }

  return {
    ...state,
    agents: nextAgents,
  }
}

function markCertificationsInProgressForTraining(agent: Agent, trainingId: string, week: number) {
  const certificationIds = getTrainingProgram(trainingId)?.certificationIds ?? []

  if (certificationIds.length === 0) {
    return agent
  }

  let nextAgent = agent
  for (const certificationId of certificationIds) {
    const currentState = getAgentCertificationState(nextAgent, certificationId)

    if (currentState === 'not_started' || currentState === 'expired') {
      const transition = applyCertificationTransitionToAgent(
        nextAgent,
        certificationId,
        'in_progress',
        week,
        {
          notes: `Training assignment ${trainingId} started.`,
        }
      )

      nextAgent = transition.agent
    }
  }

  return nextAgent
}

function markEligibleReviewsFromProgress(agent: Agent, week: number) {
  let nextAgent = agent

  for (const definition of Object.values(CERTIFICATION_DEFINITIONS)) {
    const currentState = getAgentCertificationState(nextAgent, definition.certificationId)

    if (currentState !== 'in_progress') {
      continue
    }

    const transition = applyCertificationTransitionToAgent(
      nextAgent,
      definition.certificationId,
      'eligible_review',
      week,
      {
        notes: 'Deterministic weekly certification review marked this record eligible.',
      }
    )

    if (transition.result.valid) {
      nextAgent = transition.agent
    }
  }

  return nextAgent
}

export function buildTrainingCertificationSummary(
  agent: Agent,
  week: number
): TrainingCertificationSummary {
  const progression = getAgentProgression(agent)
  const certifications = Object.values(CERTIFICATION_DEFINITIONS)
    .map((definition) => {
      const record = progression.certifications?.[definition.certificationId]
      return {
        certificationId: definition.certificationId,
        state: record?.state ?? 'not_started',
        progress: Math.max(0, Math.trunc(progression.certProgress?.[definition.certificationId] ?? 0)),
        requiredProgress: definition.requiredProgress,
        ...(typeof record?.expiresWeek === 'number' ? { expiresWeek: record.expiresWeek } : {}),
      }
    })
    .sort((left, right) => left.certificationId.localeCompare(right.certificationId))

  return {
    agentId: agent.id,
    currentRole: agent.role,
    trainingStatus: progression.trainingProfile?.trainingStatus ?? 'idle',
    assignedTrainingId: progression.trainingProfile?.assignedTrainingId,
    trainingQueuePosition: progression.trainingProfile?.trainingQueuePosition,
    readinessImpact: progression.trainingProfile?.readinessImpact ?? 0,
    trainingPoints: Math.max(0, Math.trunc(progression.trainingPoints ?? 0)),
    certifications: certifications.map((entry) => ({
      ...entry,
      ...(entry.state === 'certified' && entry.expiresWeek && entry.expiresWeek <= week
        ? { state: 'expired' as CertificationState }
        : {}),
    })),
  }
}

export function getCertificationDefinitions() {
  return Object.values(CERTIFICATION_DEFINITIONS).map((definition) => ({
    ...definition,
    prerequisiteTrainingIds: [...definition.prerequisiteTrainingIds],
  }))
}

export function getTrainingProgramsByCategory(category: TrainingCategory) {
  return trainingCatalog
    .filter((program) => program.category === category)
    .map((program) => ({
      ...program,
      ...(program.certificationIds ? { certificationIds: [...program.certificationIds] } : {}),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function transitionCertification(
  state: GameState,
  agentId: Id,
  certificationId: string,
  toState: CertificationState,
  options?: {
    administrative?: boolean
    notes?: string
  }
) {
  const agent = state.agents[agentId]
  if (!agent) {
    return {
      state: ensureNormalizedGameState(state),
      result: {
        valid: false,
        fromState: 'not_started' as CertificationState,
        toState,
        blockingIssues: ['missing-agent'],
        warnings: [],
      } satisfies CertificationTransitionResult,
    }
  }

  const transition = applyCertificationTransitionToAgent(
    agent,
    certificationId,
    toState,
    state.week,
    options
  )

  if (!transition.result.valid) {
    const progression = getAgentProgression(agent)
    const failureKey = `cert:${certificationId}`
    const nextAgent = withProgression(agent, {
      ...progression,
      failedAttemptsByTrainingId: {
        ...(progression.failedAttemptsByTrainingId ?? {}),
        [failureKey]: Math.max(
          0,
          Math.trunc((progression.failedAttemptsByTrainingId?.[failureKey] ?? 0) + 1)
        ),
      },
    })

    return {
      state: normalizeGameState({
        ...state,
        agents: {
          ...state.agents,
          [agentId]: nextAgent,
        },
      }),
      result: transition.result,
    }
  }

  return {
    state: normalizeGameState({
      ...state,
      agents: {
        ...state.agents,
        [agentId]: transition.agent,
      },
    }),
    result: transition.result,
  }
}

export function reviewCertification(
  state: GameState,
  agentId: Id,
  certificationId: string,
  approve: boolean,
  options?: {
    administrative?: boolean
    notes?: string
  }
) {
  if (approve) {
    return transitionCertification(state, agentId, certificationId, 'certified', options)
  }

  const agent = state.agents[agentId]
  if (!agent) {
    return {
      state: ensureNormalizedGameState(state),
      approved: false,
      reason: 'missing-agent',
    }
  }

  const progression = getAgentProgression(agent)
  const failureKey = `cert:${certificationId}`
  const nextAgent = withProgression(agent, {
    ...progression,
    failedAttemptsByTrainingId: {
      ...(progression.failedAttemptsByTrainingId ?? {}),
      [failureKey]: Math.max(
        0,
        Math.trunc((progression.failedAttemptsByTrainingId?.[failureKey] ?? 0) + 1)
      ),
    },
  })

  return {
    state: normalizeGameState({
      ...state,
      agents: {
        ...state.agents,
        [agentId]: nextAgent,
      },
    }),
    approved: false,
    reason: 'review-denied',
  }
}

export function advanceTrainingCertificationState(state: GameState) {
  const nextAgents = { ...state.agents }
  let changed = false

  for (const [agentId, agent] of Object.entries(state.agents)) {
    let nextAgent = markEligibleReviewsFromProgress(agent, state.week)
    const progression = getAgentProgression(nextAgent)
    const certifications = progression.certifications ?? {}
    const nextCertifications = { ...certifications }
    let certChanged = false

    for (const [certificationId, record] of Object.entries(certifications)) {
      const definition = getCertificationDefinition(certificationId)

      if (
        record.state === 'certified' &&
        definition?.durationWeeks &&
        typeof record.expiresWeek === 'number' &&
        state.week >= record.expiresWeek
      ) {
        nextCertifications[certificationId] = {
          ...record,
          state: 'expired',
        }
        certChanged = true
      }
    }

    const shouldResetRecentlyCompleted =
      progression.trainingProfile?.trainingStatus === 'completed_recently' &&
      progression.lastTrainingWeek !== undefined &&
      state.week > progression.lastTrainingWeek

    if (shouldResetRecentlyCompleted || certChanged || nextAgent !== agent) {
      let nextProgression = progression

      if (certChanged) {
        nextProgression = {
          ...nextProgression,
          certifications: nextCertifications,
        }
      }

      if (shouldResetRecentlyCompleted) {
        nextProgression = {
          ...nextProgression,
          trainingProfile: {
            agentId: nextAgent.id,
            currentRole: nextAgent.role,
            trainingStatus: 'idle',
            readinessImpact: 0,
          },
        }
      }

      nextAgent = withProgression(nextAgent, nextProgression)
      nextAgents[agentId] = nextAgent
      changed = true
    } else {
      nextAgents[agentId] = nextAgent
    }

  }

  if (!changed) {
    return ensureNormalizedGameState(state)
  }

  return normalizeGameState({
    ...state,
    agents: nextAgents,
  })
}

export function isTrainingProgramUnlocked(
  state: Pick<GameState, 'academyTier' | 'researchState'>,
  program: Pick<TrainingProgram, 'minAcademyTier' | 'requiredResearchIds'>
) {
  if ((state.academyTier ?? 0) < (program.minAcademyTier ?? 0)) {
    return false
  }

  return assessResearchRequirements(state, program.requiredResearchIds ?? []).satisfied
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
    const researchAssessment = assessResearchRequirements(state, program.requiredResearchIds ?? [])
    return {
      canQueue: false,
      reason: 'program_locked',
      requiredTier: program.minAcademyTier ?? 0,
      ...(researchAssessment.missingIds.length > 0
        ? { missingResearchIds: researchAssessment.missingIds }
        : {}),
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
    const researchAssessment = assessResearchRequirements(state, program.requiredResearchIds ?? [])
    return {
      canQueue: false,
      reason: 'program_locked',
      requiredTier: program.minAcademyTier ?? 0,
      ...(researchAssessment.missingIds.length > 0
        ? { missingResearchIds: researchAssessment.missingIds }
        : {}),
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

function resolveRejectedTrainingQueueState(state: GameState): GameState {
  return resolveFundingSensitiveNoopState(state)
}

export function queueTraining(state: GameState, agentId: Id, trainingId: string): GameState {
  const agent = state.agents[agentId]
  const program = getScopedTrainingProgram(trainingId, 'agent')
  const assessment = assessAgentTrainingQueue(state, agentId, trainingId)

  if (!agent || !program || !assessment.canQueue) {
    return resolveRejectedTrainingQueueState(state)
  }

  const team = getAgentTeam(state, agentId)
  const queueEntry = buildQueueEntry(state, agent, program)

  const progression = getAgentProgression(agent)
  const startedAgent = withProgression(
    appendAgentHistoryEntry(
      setTrainingAssignment(agent, state.week, program.trainingId, team?.id),
      createAgentHistoryEntry(state.week, 'agent.training_started', buildTrainingStartedNote(program))
    ),
    {
      ...progression,
      trainingProfile: {
        agentId: agent.id,
        currentRole: agent.role,
        trainingStatus: 'in_progress',
        assignedTrainingId: program.trainingId,
        trainingStartedWeek: state.week,
        trainingEtaWeek: state.week + queueEntry.durationWeeks,
        trainingQueuePosition: state.trainingQueue.length + 1,
        readinessImpact: Math.max(0, Math.trunc(program.fatigueDelta)),
      },
    }
  )
  const startedAgentWithCerts = markCertificationsInProgressForTraining(
    startedAgent,
    program.trainingId,
    state.week
  )

  const nextState = appendOperationEventDrafts(
    {
      ...state,
      funding: state.funding - program.fundingCost,
      agents: {
        ...state.agents,
        [agentId]: startedAgentWithCerts,
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

  return normalizeGameState(updateAgentTrainingProfileForQueue(nextState))
}

export function queueTeamTraining(state: GameState, teamId: Id, trainingId: string): GameState {
  const team = state.teams[teamId]
  const program = getScopedTrainingProgram(trainingId, 'team')
  const assessment = assessTeamTrainingQueue(state, teamId, trainingId)

  if (!team || !program || !assessment.canQueue) {
    return resolveRejectedTrainingQueueState(state)
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
    const progression = getAgentProgression(agent)
    const startedAgent = withProgression(
      appendAgentHistoryEntry(
        setTrainingAssignment(agent, state.week, program.trainingId, team.id),
        createAgentHistoryEntry(
          state.week,
          'agent.training_started',
          buildTrainingStartedNote(program, team.name)
        )
      ),
      {
        ...progression,
        trainingProfile: {
          agentId: agent.id,
          currentRole: agent.role,
          trainingStatus: 'in_progress',
          assignedTrainingId: program.trainingId,
          trainingStartedWeek: state.week,
          trainingEtaWeek: state.week + program.durationWeeks,
          readinessImpact: Math.max(0, Math.trunc(program.fatigueDelta)),
        },
      }
    )
    nextAgents[agent.id] = markCertificationsInProgressForTraining(
      startedAgent,
      program.trainingId,
      state.week
    )
  }

  const nextState = appendOperationEventDrafts(
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

  return normalizeGameState(updateAgentTrainingProfileForQueue(nextState))
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
  const rawGain =
    entry.scope === 'team'
      ? 0
      : entry.statDelta + (entry.academyStatBonus ?? 0) + aptitudeBonus + instructorBonus
  const targetCap = getAgentStatCap(currentAgent, entry.targetStat)
  const cappedStat = clamp(currentAgent.baseStats[entry.targetStat] + rawGain, 0, targetCap)
  const actualGain = cappedStat - currentAgent.baseStats[entry.targetStat]
  // Any suppressed gain (due to stat cap) converts at 15 XP per point so agents
  // near maximum still benefit from training.
  const overflowXp = (rawGain - actualGain) * 15
  // Agents who deliberately train outside their aptitude earn a cross-training bonus
  // that scales with program length to reward intentional stat diversification.
  const crossTrainingXp =
    entry.scope !== 'team' && aptitudeBonus === 0 ? Math.round(5 * (entry.durationWeeks / 2)) : 0
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
  nextStats.stability.resistance = clamp(
    nextStats.stability.resistance + (entry.stabilityResistanceDelta ?? 0),
    0,
    BASE_STAT_MAX
  )
  nextStats.stability.tolerance = clamp(
    nextStats.stability.tolerance + (entry.stabilityToleranceDelta ?? 0),
    0,
    BASE_STAT_MAX
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
  const progressedAgent = applyAgentProgressionUpdate(completedAgent, progressionUpdate)
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

  const normalizedProgression = getAgentProgression(nextAgent)
  const nextTrainingHistory = appendTrainingHistoryEntry(
    normalizedProgression.trainingHistory ?? [],
    {
      trainingId: entry.trainingId,
      week,
    }
  )
  const nextCertProgress = {
    ...(normalizedProgression.certProgress ?? {}),
  }
  const programCertifications = getTrainingProgram(entry.trainingId)?.certificationIds ?? []
  for (const certificationId of programCertifications) {
    nextCertProgress[certificationId] = Math.max(
      0,
      Math.trunc((nextCertProgress[certificationId] ?? 0) + 1)
    )
  }

  nextAgent = withProgression(nextAgent, {
    ...normalizedProgression,
    trainingPoints: Math.max(
      0,
      Math.trunc((normalizedProgression.trainingPoints ?? 0) + Math.max(1, entry.durationWeeks - 1))
    ),
    trainingHistory: nextTrainingHistory,
    certProgress: nextCertProgress,
    lastTrainingWeek: week,
    trainingProfile: {
      agentId: nextAgent.id,
      currentRole: nextAgent.role,
      trainingStatus: 'completed_recently',
      assignedTrainingId: undefined,
      trainingStartedWeek: undefined,
      trainingEtaWeek: undefined,
      trainingQueuePosition: undefined,
      readinessImpact: 0,
    },
  })
  nextAgent = markEligibleReviewsFromProgress(nextAgent, week)

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
    state: normalizeGameState(
      updateAgentTrainingProfileForQueue({
        ...state,
        agents: nextAgents,
        staff: nextStaff,
        trainingQueue: nextQueue,
      })
    ),
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

    const progression = getAgentProgression(agent)
    nextAgents[cancelled.agentId] = withProgression(
      appendAgentHistoryEntry(
        setAgentAssignment(agent, createDefaultAgentAssignmentState()),
        createAgentHistoryEntry(
          state.week,
          'agent.training_cancelled',
          `${cancelled.trainingName} cancelled.`
        )
      ),
      {
        ...progression,
        trainingProfile: {
          agentId: agent.id,
          currentRole: agent.role,
          trainingStatus: 'idle',
          readinessImpact: 0,
        },
      }
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

  const nextState = appendOperationEventDrafts(
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

  return normalizeGameState(updateAgentTrainingProfileForQueue(nextState))
}
