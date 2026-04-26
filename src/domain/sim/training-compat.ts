import { trainingCatalog } from '../../data/training'
import { createDefaultAgentAssignmentState, createDefaultAgentProgression } from '../agentDefaults'
import type {
  Agent,
  CertificationState,
  GameState,
  TrainingProgram,
  TrainingQueueEntry,
} from '../models'

type TrainingCompatibilitySummary = {
  certifications: Array<{
    certificationId: string
    state: CertificationState
    progress: number
  }>
  trainingStatus: string
  agentId: string
  currentRole: string
  trainingPoints: number
  assignedTrainingId?: string
  trainingQueuePosition?: number
}

function getTrainingProgramCompat(trainingId: string) {
  return trainingCatalog.find((program) => program.trainingId === trainingId)
}

function getProgramCertificationIds(program: Pick<TrainingProgram, 'certificationIds'> | undefined) {
  return program?.certificationIds ?? []
}

function buildSummaryFallback(): TrainingCompatibilitySummary {
  return {
    certifications: [],
    trainingStatus: 'blocked',
    agentId: '',
    currentRole: '',
    trainingPoints: 0,
  }
}

function getAgentProgression(agent: Agent) {
  return agent.progression ?? createDefaultAgentProgression(1, 'C', 'balanced', agent.role)
}

function getCertificationProgress(agent: Agent, certificationId: string, state: CertificationState) {
  const explicitProgress = agent.progression?.certProgress?.[certificationId]
  if (typeof explicitProgress === 'number') {
    return explicitProgress
  }

  if (state === 'certified' || state === 'eligible_review') {
    return 100
  }

  if (state === 'in_progress') {
    return 50
  }

  return 0
}

function buildCertificationRecord(
  agent: Agent,
  certificationId: string,
  state: CertificationState,
  options: {
    progress?: number
    trainingId?: string
    awardedWeek?: number
  } = {}
): Agent {
  const progression = getAgentProgression(agent)
  const certifications = { ...(progression.certifications ?? {}) }
  const current = certifications[certificationId]
  const sourceTrainingIds = [
    ...new Set([...(current?.sourceTrainingIds ?? []), ...(options.trainingId ? [options.trainingId] : [])]),
  ]

  certifications[certificationId] = {
    certificationId,
    state,
    sourceTrainingIds,
    awardedWeek: state === 'certified' ? options.awardedWeek ?? current?.awardedWeek : current?.awardedWeek,
    expiresWeek: current?.expiresWeek,
    notes: current?.notes,
  }

  return {
    ...agent,
    progression: {
      ...progression,
      certifications,
      certProgress: {
        ...(progression.certProgress ?? {}),
        [certificationId]: Math.max(
          progression.certProgress?.[certificationId] ?? 0,
          options.progress ?? getCertificationProgress(agent, certificationId, state)
        ),
      },
    },
  }
}

function buildQueueEntryCompat(
  state: Pick<GameState, 'week' | 'trainingQueue'>,
  agent: Agent,
  program: TrainingProgram
): TrainingQueueEntry {
  return {
    id: `compat-training-${state.week}-${(state.trainingQueue?.length ?? 0) + 1}`,
    trainingId: program.trainingId,
    trainingName: program.name,
    scope: program.scope ?? 'agent',
    agentId: agent.id,
    agentName: agent.name,
    targetStat: program.targetStat,
    statDelta: program.statDelta,
    startedWeek: state.week,
    durationWeeks: program.durationWeeks,
    remainingWeeks: program.durationWeeks,
    fundingCost: program.fundingCost,
    fatigueDelta: program.fatigueDelta,
  }
}

export function buildTrainingCertificationSummary(agent: Agent, _week: number) {
  void _week
  if (!agent) {
    return buildSummaryFallback()
  }

  const progression = getAgentProgression(agent)
  const certificationIds = new Set(getCertificationDefinitions().map((definition) => definition.certificationId))
  for (const certificationId of Object.keys(progression.certifications ?? {})) {
    certificationIds.add(certificationId)
  }
  for (const historyEntry of progression.trainingHistory ?? []) {
    const program = getTrainingProgramCompat(historyEntry.trainingId)
    for (const certificationId of getProgramCertificationIds(program)) {
      certificationIds.add(certificationId)
    }
  }

  const certifications = [...certificationIds]
    .sort((left, right) => left.localeCompare(right))
    .map((certificationId) => {
      const state = progression.certifications?.[certificationId]?.state ?? 'not_started'
      return {
        certificationId,
        state,
        progress: getCertificationProgress(agent, certificationId, state),
      }
    })

  const trainingStatus =
    progression.trainingProfile?.trainingStatus ??
    (agent.assignment?.state === 'training' ? 'in_progress' : 'idle')

  return {
    certifications,
    trainingStatus,
    agentId: agent.id,
    currentRole: agent.role,
    trainingPoints: progression.skillTree?.skillPoints ?? progression.trainingPoints ?? 0,
    assignedTrainingId:
      agent.assignment?.state === 'training'
        ? agent.assignment.trainingProgramId
        : progression.trainingProfile?.assignedTrainingId,
    trainingQueuePosition: progression.trainingProfile?.trainingQueuePosition,
  }
}

export function getTrainingProgramsByCategory(category: string) {
  return trainingCatalog.filter((program) => program.category === category)
}

export function queueTraining(state: GameState, agentId: string, trainingId: string) {
  const agent = state.agents[agentId]
  const program = getTrainingProgramCompat(trainingId)
  if (!agent || !program) {
    return state
  }

  const progression = getAgentProgression(agent)
  let nextAgent: Agent = {
    ...agent,
    assignment: {
      ...createDefaultAgentAssignmentState(),
      state: 'training',
      startedWeek: state.week,
      trainingProgramId: trainingId,
    },
    progression: {
      ...progression,
      trainingProfile: {
        ...(progression.trainingProfile ?? {
          agentId: agent.id,
          currentRole: agent.role,
          readinessImpact: 0,
        }),
        trainingStatus: 'in_progress',
        assignedTrainingId: trainingId,
        trainingStartedWeek: state.week,
      },
    },
  }

  for (const certificationId of getProgramCertificationIds(program)) {
    nextAgent = buildCertificationRecord(nextAgent, certificationId, 'in_progress', {
      trainingId,
      progress: 50,
    })
  }

  return {
    ...state,
    trainingQueue: [...state.trainingQueue, buildQueueEntryCompat(state, nextAgent, program)],
    agents: {
      ...state.agents,
      [agentId]: nextAgent,
    },
  }
}

export function advanceTrainingQueues(state: GameState) {
  const nextAgents = { ...state.agents }
  const nextQueue: TrainingQueueEntry[] = []
  const completed: TrainingQueueEntry[] = []

  for (const entry of state.trainingQueue) {
    if (entry.remainingWeeks > 1) {
      nextQueue.push({
        ...entry,
        remainingWeeks: entry.remainingWeeks - 1,
      })
      continue
    }

    const agent = nextAgents[entry.agentId]
    const program = getTrainingProgramCompat(entry.trainingId)
    if (!agent || !program) {
      completed.push(entry)
      continue
    }

    const progression = getAgentProgression(agent)
    let nextAgent: Agent = {
      ...agent,
      assignment:
        agent.assignment?.state === 'training'
          ? createDefaultAgentAssignmentState()
          : agent.assignment,
      progression: {
        ...progression,
        trainingHistory: [
          ...(progression.trainingHistory ?? []),
          {
            trainingId: entry.trainingId,
            week: state.week,
          },
        ],
        trainingPoints: (progression.trainingPoints ?? 0) + 1,
        skillTree: {
          skillPoints: (progression.skillTree?.skillPoints ?? 0) + 1,
          specialization: progression.skillTree?.specialization,
          trainedRelationships: {
            ...(progression.skillTree?.trainedRelationships ?? {}),
          },
        },
        trainingProfile: {
          ...(progression.trainingProfile ?? {
            agentId: agent.id,
            currentRole: agent.role,
            readinessImpact: 0,
          }),
          trainingStatus: 'completed_recently',
          assignedTrainingId: entry.trainingId,
          trainingStartedWeek: entry.startedWeek,
        },
      },
    }

    for (const certificationId of getProgramCertificationIds(program)) {
      nextAgent = buildCertificationRecord(nextAgent, certificationId, 'eligible_review', {
        trainingId: entry.trainingId,
        progress: 100,
      })
    }

    nextAgents[entry.agentId] = nextAgent
    completed.push(entry)
  }

  return {
    state: {
      ...state,
      agents: nextAgents,
      trainingQueue: nextQueue,
    },
    completed,
    notes: [] as string[],
    eventDrafts: [] as unknown[],
  }
}

export function advanceTrainingCertificationState(state: GameState) {
  return state
}

export function transitionCertification(
  state: GameState,
  agentId: string,
  certificationId: string,
  toState: CertificationState,
  _options?: unknown
) {
  void _options
  const agent = state.agents[agentId]
  const current = agent?.progression?.certifications?.[certificationId]

  if (!agent || !current || (toState === 'certified' && current.state !== 'eligible_review')) {
    return {
      state,
      result: {
        valid: false,
        blockingIssues: ['invalid-transition'],
      },
    }
  }

  const nextAgent = buildCertificationRecord(agent, certificationId, toState, {
    progress: toState === 'certified' ? 100 : undefined,
    awardedWeek: toState === 'certified' ? state.week : undefined,
  })

  return {
    state: {
      ...state,
      agents: {
        ...state.agents,
        [agentId]: nextAgent,
      },
    },
    result: {
      valid: true,
      blockingIssues: [] as string[],
    },
  }
}

export function reviewCertification(
  state: GameState,
  agentId: string,
  certificationId: string,
  approved: boolean,
  _options?: unknown
) {
  void _options
  if (approved) {
    const transitioned = transitionCertification(state, agentId, certificationId, 'certified')
    return {
      state: transitioned.state,
      approved: transitioned.result.valid,
      reason: transitioned.result.valid ? 'review-approved' : 'invalid-transition',
    }
  }

  const agent = state.agents[agentId]
  if (!agent) {
    return {
      state,
      approved: false,
      reason: 'invalid-transition',
    }
  }

  const progression = getAgentProgression(agent)
  return {
    state: {
      ...state,
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          progression: {
            ...progression,
            failedAttemptsByTrainingId: {
              ...(progression.failedAttemptsByTrainingId ?? {}),
              [`cert:${certificationId}`]:
                (progression.failedAttemptsByTrainingId?.[`cert:${certificationId}`] ?? 0) + 1,
            },
          },
        },
      },
    },
    approved: false,
    reason: 'review-denied',
  }
}

export function getCertificationDefinitions() {
  const definitions = new Map<
    string,
    {
      certificationId: string
      program: TrainingProgram
      prerequisiteTrainingIds: string[]
      requiredProgress: number
    }
  >()

  for (const program of trainingCatalog) {
    for (const certificationId of getProgramCertificationIds(program)) {
      if (!definitions.has(certificationId)) {
        definitions.set(certificationId, {
          certificationId,
          program,
          prerequisiteTrainingIds: [program.trainingId],
          requiredProgress: 100,
        })
      }
    }
  }

  return [...definitions.values()].sort((left, right) =>
    left.certificationId.localeCompare(right.certificationId)
  )
}
