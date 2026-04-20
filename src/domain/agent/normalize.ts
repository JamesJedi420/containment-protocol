// cspell:words callsign cooldown
import {
  buildAgentStatCaps,
  normalizePotentialIntel,
  normalizePotentialTier,
} from '../agentPotential'
import {
  createDefaultAgentAssignmentState,
  createDefaultAgentHistory,
  createDefaultAgentIdentity,
  createDefaultAgentProgression,
  createDefaultAgentSkillTree,
  createDefaultAgentServiceRecord,
  createDefaultAgentVitals,
  deriveAssignmentStatus,
  deriveDomainStatsFromBase,
} from '../agentDefaults'
import { clamp } from '../math'
import { synchronizeProgressionState } from '../progression'
import { cloneDomainStats } from '../statDomains'
import { EVENT_TYPE_TO_SOURCE_SYSTEM } from '../events/types'
import type {
  Agent,
  AgentAbility,
  AgentAbilityState,
  AgentAssignmentState,
  AgentHistory,
  AgentIdentity,
  AgentProgression,
  AgentReadinessProfile,
  AgentServiceRecord,
  AgentVitals,
  EquipmentSlots,
} from './models'
import type { OperationEvent, OperationEventType } from '../events/types'

function clampPercent(value: number, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return clamp(Math.round(value), 0, 100)
}

function normalizeAgentStatus(status: Agent['status'] | undefined): Agent['status'] {
  if (
    status === 'active' ||
    status === 'injured' ||
    status === 'recovering' ||
    status === 'resigned' ||
    status === 'dead'
  ) {
    return status
  }

  return 'active'
}

function deriveOperationalRole(role: Agent['role']): Agent['operationalRole'] {
  if (role === 'hunter') {
    return 'field'
  }

  if (role === 'occultist' || role === 'medium') {
    return 'containment'
  }

  if (role === 'investigator' || role === 'field_recon' || role === 'tech') {
    return 'investigation'
  }

  return 'support'
}

function normalizeAgentIdentity(agent: Agent): AgentIdentity {
  const fallback = createDefaultAgentIdentity(agent.name)
  const identity = agent.identity ?? fallback
  const age = typeof agent.age === 'number' ? agent.age : identity.age
  const codename = identity.codename ?? identity.callsign

  return {
    name: identity.name || agent.name,
    age,
    background: identity.background,
    codename,
    callsign: identity.callsign ?? codename,
    portraitId: identity.portraitId,
  }
}

function normalizeGrowthStats(
  growthStats: AgentProgression['growthStats']
): NonNullable<AgentProgression['growthStats']> {
  return Object.fromEntries(
    Object.entries(growthStats ?? {}).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value)
    )
  )
}

function normalizeTrainingStatus(value: unknown) {
  return value === 'idle' ||
    value === 'queued' ||
    value === 'in_progress' ||
    value === 'blocked' ||
    value === 'completed_recently'
    ? value
    : 'idle'
}

function normalizeCertificationState(value: unknown) {
  return value === 'not_started' ||
    value === 'in_progress' ||
    value === 'eligible_review' ||
    value === 'certified' ||
    value === 'expired' ||
    value === 'revoked'
    ? value
    : 'not_started'
}

function normalizeTrainingHistory(history: AgentProgression['trainingHistory']) {
  return (history ?? [])
    .filter((entry) =>
      Boolean(
        entry &&
          typeof entry.trainingId === 'string' &&
          entry.trainingId.length > 0 &&
          typeof entry.week === 'number' &&
          Number.isFinite(entry.week)
      )
    )
    .map((entry) => ({
      trainingId: entry.trainingId,
      week: Math.max(1, Math.trunc(entry.week)),
    }))
    .slice(-24)
}

function normalizeCertProgress(progress: AgentProgression['certProgress']) {
  return Object.fromEntries(
    Object.entries(progress ?? {}).filter(
      ([key, value]) =>
        typeof key === 'string' &&
        key.length > 0 &&
        typeof value === 'number' &&
        Number.isFinite(value)
    )
  ) as NonNullable<AgentProgression['certProgress']>
}

function normalizeFailedAttempts(
  failedAttempts: AgentProgression['failedAttemptsByTrainingId']
) {
  return Object.fromEntries(
    Object.entries(failedAttempts ?? {}).filter(
      ([key, value]) =>
        typeof key === 'string' &&
        key.length > 0 &&
        typeof value === 'number' &&
        Number.isFinite(value)
    )
  ) as NonNullable<AgentProgression['failedAttemptsByTrainingId']>
}

function normalizeCertifications(certifications: AgentProgression['certifications']) {
  return Object.fromEntries(
    Object.entries(certifications ?? {})
      .filter(
        ([certificationId, certification]) =>
          typeof certificationId === 'string' &&
          certificationId.length > 0 &&
          Boolean(certification)
      )
      .map(([certificationId, certification]) => [
        certificationId,
        {
          certificationId,
          state: normalizeCertificationState(certification?.state),
          awardedWeek:
            typeof certification?.awardedWeek === 'number' && Number.isFinite(certification.awardedWeek)
              ? Math.max(1, Math.trunc(certification.awardedWeek))
              : undefined,
          expiresWeek:
            typeof certification?.expiresWeek === 'number' && Number.isFinite(certification.expiresWeek)
              ? Math.max(1, Math.trunc(certification.expiresWeek))
              : undefined,
          sourceTrainingIds: Array.isArray(certification?.sourceTrainingIds)
            ? certification.sourceTrainingIds.filter(
                (entry): entry is string => typeof entry === 'string' && entry.length > 0
              )
            : undefined,
          notes:
            typeof certification?.notes === 'string' && certification.notes.length > 0
              ? certification.notes
              : undefined,
        },
      ])
  ) as NonNullable<AgentProgression['certifications']>
}

function normalizeAgentProgression(agent: Agent): AgentProgression {
  const levelSource =
    typeof agent.progression?.level === 'number'
      ? agent.progression.level
      : typeof agent.level === 'number'
        ? agent.level
        : 1
  const fallback = createDefaultAgentProgression(
    levelSource,
    undefined,
    undefined,
    agent.role
  )

  return synchronizeProgressionState(
    {
      ...fallback,
      ...agent.progression,
      xp:
        typeof agent.progression?.xp === 'number' && Number.isFinite(agent.progression.xp)
          ? Math.max(0, Math.trunc(agent.progression.xp))
          : fallback.xp,
      level: Math.max(1, Math.trunc(levelSource)),
      potentialTier: normalizePotentialTier(
        agent.progression?.potentialTier ?? fallback.potentialTier,
        agent.baseStats
      ),
      potentialIntel: normalizePotentialIntel(
        agent.progression?.potentialIntel,
        agent.progression?.potentialTier ?? fallback.potentialTier
      ),
      growthProfile:
        typeof agent.progression?.growthProfile === 'string' &&
        agent.progression.growthProfile.length > 0
          ? agent.progression.growthProfile
          : fallback.growthProfile,
      statCaps: buildAgentStatCaps(
        agent.baseStats,
        agent.progression?.potentialTier ?? fallback.potentialTier,
        agent.progression?.growthProfile ?? fallback.growthProfile,
        agent.progression?.statCaps
      ),
      growthStats: normalizeGrowthStats(agent.progression?.growthStats ?? fallback.growthStats),
      trainingPoints: Math.max(
        0,
        Math.trunc(agent.progression?.trainingPoints ?? fallback.trainingPoints ?? 0)
      ),
      trainingHistory: normalizeTrainingHistory(
        agent.progression?.trainingHistory ?? fallback.trainingHistory
      ),
      certProgress: normalizeCertProgress(agent.progression?.certProgress ?? fallback.certProgress),
      certifications: normalizeCertifications(
        agent.progression?.certifications ?? fallback.certifications
      ),
      specializationTrack:
        agent.progression?.specializationTrack === 'combat' ||
        agent.progression?.specializationTrack === 'investigation' ||
        agent.progression?.specializationTrack === 'utility' ||
        agent.progression?.specializationTrack === 'social'
          ? agent.progression.specializationTrack
          : undefined,
      lastTrainingWeek:
        typeof agent.progression?.lastTrainingWeek === 'number' &&
        Number.isFinite(agent.progression.lastTrainingWeek)
          ? Math.max(1, Math.trunc(agent.progression.lastTrainingWeek))
          : undefined,
      failedAttemptsByTrainingId: normalizeFailedAttempts(
        agent.progression?.failedAttemptsByTrainingId ?? fallback.failedAttemptsByTrainingId
      ),
      trainingProfile: {
        agentId:
          typeof agent.progression?.trainingProfile?.agentId === 'string' &&
          agent.progression.trainingProfile.agentId.length > 0
            ? agent.progression.trainingProfile.agentId
            : agent.id,
        currentRole: agent.role,
        trainingStatus: normalizeTrainingStatus(
          agent.progression?.trainingProfile?.trainingStatus ?? fallback.trainingProfile?.trainingStatus
        ),
        assignedTrainingId:
          typeof agent.progression?.trainingProfile?.assignedTrainingId === 'string' &&
          agent.progression.trainingProfile.assignedTrainingId.length > 0
            ? agent.progression.trainingProfile.assignedTrainingId
            : undefined,
        trainingStartedWeek:
          typeof agent.progression?.trainingProfile?.trainingStartedWeek === 'number' &&
          Number.isFinite(agent.progression.trainingProfile.trainingStartedWeek)
            ? Math.max(1, Math.trunc(agent.progression.trainingProfile.trainingStartedWeek))
            : undefined,
        trainingEtaWeek:
          typeof agent.progression?.trainingProfile?.trainingEtaWeek === 'number' &&
          Number.isFinite(agent.progression.trainingProfile.trainingEtaWeek)
            ? Math.max(1, Math.trunc(agent.progression.trainingProfile.trainingEtaWeek))
            : undefined,
        trainingQueuePosition:
          typeof agent.progression?.trainingProfile?.trainingQueuePosition === 'number' &&
          Number.isFinite(agent.progression.trainingProfile.trainingQueuePosition)
            ? Math.max(1, Math.trunc(agent.progression.trainingProfile.trainingQueuePosition))
            : undefined,
        readinessImpact:
          typeof agent.progression?.trainingProfile?.readinessImpact === 'number' &&
          Number.isFinite(agent.progression.trainingProfile.readinessImpact)
            ? clamp(agent.progression.trainingProfile.readinessImpact, -100, 100)
            : 0,
      },
      skillTree: {
        ...createDefaultAgentSkillTree(),
        ...(agent.progression?.skillTree ?? fallback.skillTree),
        skillPoints: Math.max(
          0,
          Math.trunc(
            agent.progression?.skillTree?.skillPoints ?? fallback.skillTree?.skillPoints ?? 0
          )
        ),
        trainedRelationships: Object.fromEntries(
          Object.entries(
            agent.progression?.skillTree?.trainedRelationships ??
              fallback.skillTree?.trainedRelationships ??
              {}
          ).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
        ),
      },
    },
    levelSource
  )
}

function normalizeWeek(value: number | undefined, fallback?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

function getLatestTimelineWeek(
  history: Agent['history'],
  eventTypes: readonly AgentHistory['timeline'][number]['eventType'][]
) {
  const weeks = (history?.timeline ?? [])
    .filter((entry) => eventTypes.includes(entry.eventType))
    .map((entry) => normalizeWeek(entry.week))
    .filter((entry): entry is number => entry !== undefined)

  return weeks.length > 0 ? Math.max(...weeks) : undefined
}

function normalizePerformanceStats(history: Agent['history']) {
  const fallback = createDefaultAgentHistory().performanceStats
  const stats = history?.performanceStats

  return {
    deployments: Math.max(0, Math.trunc(stats?.deployments ?? fallback.deployments)),
    totalContribution: Math.max(0, Number(stats?.totalContribution ?? fallback.totalContribution)),
    totalThreatHandled: Math.max(
      0,
      Number(stats?.totalThreatHandled ?? fallback.totalThreatHandled)
    ),
    totalDamageTaken: Math.max(0, Number(stats?.totalDamageTaken ?? fallback.totalDamageTaken)),
    totalHealingPerformed: Math.max(
      0,
      Number(stats?.totalHealingPerformed ?? fallback.totalHealingPerformed)
    ),
    totalEvidenceGathered: Math.max(
      0,
      Number(stats?.totalEvidenceGathered ?? fallback.totalEvidenceGathered)
    ),
    totalContainmentActionsCompleted: Math.max(
      0,
      Number(stats?.totalContainmentActionsCompleted ?? fallback.totalContainmentActionsCompleted)
    ),
    totalFieldPower: Math.max(0, Number(stats?.totalFieldPower ?? fallback.totalFieldPower)),
    totalContainment: Math.max(0, Number(stats?.totalContainment ?? fallback.totalContainment)),
    totalInvestigation: Math.max(
      0,
      Number(stats?.totalInvestigation ?? fallback.totalInvestigation)
    ),
    totalSupport: Math.max(0, Number(stats?.totalSupport ?? fallback.totalSupport)),
    totalStressImpact: Math.max(0, Number(stats?.totalStressImpact ?? fallback.totalStressImpact)),
    totalEquipmentContributionDelta: Math.max(
      0,
      Number(stats?.totalEquipmentContributionDelta ?? fallback.totalEquipmentContributionDelta)
    ),
    totalKitContributionDelta: Math.max(
      0,
      Number(stats?.totalKitContributionDelta ?? fallback.totalKitContributionDelta)
    ),
    totalProtocolContributionDelta: Math.max(
      0,
      Number(stats?.totalProtocolContributionDelta ?? fallback.totalProtocolContributionDelta)
    ),
    totalEquipmentScoreDelta: Math.max(
      0,
      Number(stats?.totalEquipmentScoreDelta ?? fallback.totalEquipmentScoreDelta)
    ),
    totalKitScoreDelta: Math.max(
      0,
      Number(stats?.totalKitScoreDelta ?? fallback.totalKitScoreDelta)
    ),
    totalProtocolScoreDelta: Math.max(
      0,
      Number(stats?.totalProtocolScoreDelta ?? fallback.totalProtocolScoreDelta)
    ),
    totalKitEffectivenessDelta: Math.max(
      0,
      Number(stats?.totalKitEffectivenessDelta ?? fallback.totalKitEffectivenessDelta)
    ),
    totalProtocolEffectivenessDelta: Math.max(
      0,
      Number(stats?.totalProtocolEffectivenessDelta ?? fallback.totalProtocolEffectivenessDelta)
    ),
  }
}

function normalizeAgentHistory(history: Agent['history']): AgentHistory {
  const fallback = createDefaultAgentHistory()
  const counters = {
    assignmentsCompleted: Math.max(
      0,
      Math.trunc(history?.counters.assignmentsCompleted ?? fallback.counters.assignmentsCompleted)
    ),
    casesResolved: Math.max(
      0,
      Math.trunc(history?.counters.casesResolved ?? fallback.counters.casesResolved)
    ),
    casesPartiallyResolved: Math.max(
      0,
      Math.trunc(
        history?.counters.casesPartiallyResolved ?? fallback.counters.casesPartiallyResolved
      )
    ),
    casesFailed: Math.max(
      0,
      Math.trunc(history?.counters.casesFailed ?? fallback.counters.casesFailed)
    ),
    anomaliesContained: Math.max(
      0,
      Math.trunc(history?.counters.anomaliesContained ?? fallback.counters.anomaliesContained)
    ),
    recoveryWeeks: Math.max(
      0,
      Math.trunc(history?.counters.recoveryWeeks ?? fallback.counters.recoveryWeeks)
    ),
    trainingWeeks: Math.max(
      0,
      Math.trunc(history?.counters.trainingWeeks ?? fallback.counters.trainingWeeks)
    ),
    trainingsCompleted: Math.max(
      0,
      Math.trunc(history?.counters.trainingsCompleted ?? fallback.counters.trainingsCompleted)
    ),
    stressSustained: Math.max(
      0,
      Number(history?.counters.stressSustained ?? fallback.counters.stressSustained)
    ),
    damageSustained: Math.max(
      0,
      Number(history?.counters.damageSustained ?? fallback.counters.damageSustained)
    ),
    anomalyExposures: Math.max(
      0,
      Math.trunc(history?.counters.anomalyExposures ?? fallback.counters.anomalyExposures)
    ),
    evidenceRecovered: Math.max(
      0,
      Math.trunc(history?.counters.evidenceRecovered ?? fallback.counters.evidenceRecovered)
    ),
  }
  const casesCompleted =
    counters.casesResolved + counters.casesPartiallyResolved + counters.casesFailed
  const trainingsDone = counters.trainingsCompleted

  return {
    counters,
    casesCompleted,
    trainingsDone,
    bonds: Object.fromEntries(
      Object.entries(history?.bonds ?? {})
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
        .map(([agentId, value]) => [agentId, clamp(value, -100, 100)])
    ),
    performanceStats: normalizePerformanceStats(history),
    alliesWorkedWith: [
      ...new Set((history?.alliesWorkedWith ?? []).filter((allyId) => typeof allyId === 'string')),
    ],
    timeline: Array.isArray(history?.timeline)
      ? history.timeline
          .filter((entry) => typeof entry?.note === 'string' && typeof entry?.week === 'number')
          .map((entry) => ({
            week: Math.max(1, Math.trunc(entry.week)),
            eventType: entry.eventType,
            note: entry.note,
            ...(entry.eventId ? { eventId: entry.eventId } : {}),
          }))
      : fallback.timeline,
    logs: Array.isArray(history?.logs)
      ? history.logs
          .filter(
            (entry) =>
              typeof entry?.id === 'string' &&
              typeof entry?.type === 'string' &&
              typeof entry?.timestamp === 'string'
          )
          .map((entry) => normalizeOperationEventLog(entry))
      : fallback.logs,
  }
}

function normalizeAgentServiceRecord(
  agent: Agent,
  assignment: AgentAssignmentState
): AgentServiceRecord {
  const timeline = agent.history?.timeline ?? []
  const earliestTimelineWeek =
    timeline.length > 0
      ? Math.min(...timeline.map((entry) => normalizeWeek(entry.week, 1) ?? 1))
      : undefined
  const assignmentWeekFromHistory = getLatestTimelineWeek(agent.history, [
    'assignment.team_assigned',
  ])
  const caseWeekFromHistory = getLatestTimelineWeek(agent.history, [
    'case.resolved',
    'case.partially_resolved',
    'case.failed',
  ])
  const trainingWeekFromHistory = getLatestTimelineWeek(agent.history, [
    'agent.training_started',
    'agent.training_completed',
  ])
  const serviceRecord =
    agent.serviceRecord ?? createDefaultAgentServiceRecord(earliestTimelineWeek ?? 1)

  return {
    joinedWeek:
      normalizeWeek(serviceRecord.joinedWeek, earliestTimelineWeek ?? 1) ??
      createDefaultAgentServiceRecord().joinedWeek,
    ...(normalizeWeek(
      serviceRecord.lastAssignmentWeek ??
        (assignment.state === 'assigned' ? assignment.startedWeek : undefined) ??
        assignmentWeekFromHistory
    ) !== undefined
      ? {
          lastAssignmentWeek: normalizeWeek(
            serviceRecord.lastAssignmentWeek ??
              (assignment.state === 'assigned' ? assignment.startedWeek : undefined) ??
              assignmentWeekFromHistory
          ),
        }
      : {}),
    ...(normalizeWeek(serviceRecord.lastCaseWeek ?? caseWeekFromHistory) !== undefined
      ? {
          lastCaseWeek: normalizeWeek(serviceRecord.lastCaseWeek ?? caseWeekFromHistory),
        }
      : {}),
    ...(normalizeWeek(
      serviceRecord.lastTrainingWeek ??
        (assignment.state === 'training' ? assignment.startedWeek : undefined) ??
        trainingWeekFromHistory
    ) !== undefined
      ? {
          lastTrainingWeek: normalizeWeek(
            serviceRecord.lastTrainingWeek ??
              (assignment.state === 'training' ? assignment.startedWeek : undefined) ??
              trainingWeekFromHistory
          ),
        }
      : {}),
    ...(normalizeWeek(
      serviceRecord.lastRecoveryWeek ??
        (assignment.state === 'recovery' ? assignment.startedWeek : undefined)
    ) !== undefined
      ? {
          lastRecoveryWeek: normalizeWeek(
            serviceRecord.lastRecoveryWeek ??
              (assignment.state === 'recovery' ? assignment.startedWeek : undefined)
          ),
        }
      : {}),
  }
}

function normalizeOperationEventLog<TType extends OperationEventType>(
  entry: OperationEvent<TType>
): OperationEvent<TType> {
  return {
    ...entry,
    schemaVersion: 1,
    sourceSystem: EVENT_TYPE_TO_SOURCE_SYSTEM[entry.type],
  }
}

function normalizeAgentAssignment(assignment: Agent['assignment']): AgentAssignmentState {
  if (!assignment || typeof assignment !== 'object') {
    return createDefaultAgentAssignmentState()
  }

  const rawState = (assignment as { state?: string }).state

  if (rawState === 'assigned' || rawState === 'resolving') {
    if (typeof (assignment as { caseId?: unknown }).caseId !== 'string') {
      return createDefaultAgentAssignmentState()
    }

    if (typeof (assignment as { teamId?: unknown }).teamId !== 'string') {
      return createDefaultAgentAssignmentState()
    }

    return {
      state: 'assigned',
      caseId: (assignment as { caseId: string }).caseId,
      teamId: (assignment as { teamId: string }).teamId,
      startedWeek:
        typeof (assignment as { startedWeek?: unknown }).startedWeek === 'number'
          ? Math.max(1, Math.trunc((assignment as { startedWeek: number }).startedWeek))
          : 1,
    }
  }

  if (rawState === 'training') {
    return {
      state: 'training',
      startedWeek:
        typeof (assignment as { startedWeek?: unknown }).startedWeek === 'number'
          ? Math.max(1, Math.trunc((assignment as { startedWeek: number }).startedWeek))
          : 1,
      ...(typeof (assignment as { teamId?: unknown }).teamId === 'string'
        ? { teamId: (assignment as { teamId: string }).teamId }
        : {}),
      ...(typeof (assignment as { trainingProgramId?: unknown }).trainingProgramId === 'string'
        ? { trainingProgramId: (assignment as { trainingProgramId: string }).trainingProgramId }
        : {}),
    }
  }

  if (rawState === 'recovery' || rawState === 'recovering') {
    return {
      state: 'recovery',
      startedWeek:
        typeof (assignment as { startedWeek?: unknown }).startedWeek === 'number'
          ? Math.max(1, Math.trunc((assignment as { startedWeek: number }).startedWeek))
          : 1,
      ...(typeof (assignment as { teamId?: unknown }).teamId === 'string'
        ? { teamId: (assignment as { teamId: string }).teamId }
        : {}),
    }
  }

  return createDefaultAgentAssignmentState()
}

function normalizeRelationships(agent: Agent) {
  return Object.fromEntries(
    Object.entries(agent.relationships ?? {}).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value)
    )
  )
}

function normalizeEquipmentCounts(equipment: Agent['equipment']) {
  return Object.fromEntries(
    Object.entries(equipment ?? {})
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      .map(([slotId, value]) => [slotId, Math.trunc(value)])
  )
}

function normalizeEquipmentSlots(equipmentSlots: Agent['equipmentSlots']): EquipmentSlots {
  return Object.fromEntries(
    Object.entries(equipmentSlots ?? {}).filter(
      ([, value]) => typeof value === 'string' && value.length > 0
    )
  )
}

function normalizeAgentAbilityState(
  abilityState: Agent['abilityState'],
  abilities: readonly AgentAbility[]
): AgentAbilityState {
  const normalized: AgentAbilityState = {}

  for (const [abilityId, runtime] of Object.entries(abilityState ?? {})) {
    if (!runtime || typeof runtime !== 'object') {
      continue
    }

    const cooldownRemaining =
      typeof runtime.cooldownRemaining === 'number' && Number.isFinite(runtime.cooldownRemaining)
        ? Math.max(0, Math.trunc(runtime.cooldownRemaining))
        : 0
    const lastUsedWeek =
      typeof runtime.lastUsedWeek === 'number' && Number.isFinite(runtime.lastUsedWeek)
        ? Math.max(1, Math.trunc(runtime.lastUsedWeek))
        : undefined
    const usesConsumedThisWeek =
      typeof runtime.usesConsumedThisWeek === 'number' &&
      Number.isFinite(runtime.usesConsumedThisWeek)
        ? Math.max(0, Math.trunc(runtime.usesConsumedThisWeek))
        : undefined

    normalized[abilityId] = {
      cooldownRemaining,
      ...(lastUsedWeek !== undefined ? { lastUsedWeek } : {}),
      ...(usesConsumedThisWeek !== undefined ? { usesConsumedThisWeek } : {}),
    }
  }

  for (const ability of abilities) {
    if (ability.type !== 'active' || !ability.id) {
      continue
    }

    if (!normalized[ability.id]) {
      normalized[ability.id] = {
        cooldownRemaining: 0,
      }
    }
  }

  return normalized
}

function normalizeStatusFlags(status: Agent['status'], flags: string[] | undefined) {
  const nextFlags = new Set(
    (flags ?? []).filter((flag) => typeof flag === 'string' && flag.length > 0)
  )

  if (status === 'injured') {
    nextFlags.add('injured')
  }
  if (status === 'recovering') {
    nextFlags.add('recovering')
  }
  if (status === 'dead') {
    nextFlags.add('dead')
  }
  if (status === 'resigned') {
    nextFlags.add('resigned')
  }

  return [...nextFlags]
}

function normalizeAgentVitals(agent: Agent, fatigue: number, status: Agent['status']): AgentVitals {
  const fallback = createDefaultAgentVitals(fatigue, status)
  const wounds =
    status === 'dead' ? 100 : clampPercent(agent.vitals?.wounds ?? fallback.wounds, fallback.wounds)

  return {
    health:
      status === 'dead'
        ? 0
        : clampPercent(agent.vitals?.health ?? fallback.health, fallback.health),
    stress: clampPercent(fatigue, fallback.stress),
    morale:
      status === 'dead'
        ? 0
        : clampPercent(
            agent.vitals?.morale ?? Math.max(0, 100 - fatigue - wounds),
            fallback.morale
          ),
    wounds,
    statusFlags: normalizeStatusFlags(status, agent.vitals?.statusFlags),
  }
}

function deriveReadinessState(
  status: Agent['status'],
  assignment: AgentAssignmentState
): AgentReadinessProfile['state'] {
  if (status === 'dead' || status === 'resigned') {
    return 'unavailable'
  }

  if (assignment.state === 'assigned') {
    return 'assigned'
  }

  if (assignment.state === 'training') {
    return 'training'
  }

  if (assignment.state === 'recovery' || status === 'injured' || status === 'recovering') {
    return 'recovering'
  }

  return status === 'active' ? 'ready' : 'unavailable'
}

function deriveReadinessBand(
  state: AgentReadinessProfile['state'],
  fatigue: number,
  vitals: AgentVitals
): AgentReadinessProfile['band'] {
  if (state === 'unavailable') {
    return 'unavailable'
  }

  if (fatigue >= 45 || vitals.wounds >= 25 || vitals.morale <= 35) {
    return 'critical'
  }

  if (fatigue >= 20 || vitals.wounds > 0 || vitals.morale <= 60) {
    return 'strained'
  }

  return 'steady'
}

function normalizeAgentReadinessProfile(
  assignment: AgentAssignmentState,
  fatigue: number,
  status: Agent['status'],
  vitals: AgentVitals
): AgentReadinessProfile {
  const state = deriveReadinessState(status, assignment)
  const band = deriveReadinessBand(state, fatigue, vitals)
  const riskFlags: string[] = []

  if (state === 'assigned') {
    riskFlags.push('assigned')
  }
  if (state === 'training') {
    riskFlags.push('training')
  }
  if (state === 'recovering') {
    riskFlags.push('recovering')
  }
  if (status === 'injured') {
    riskFlags.push('injured')
  }
  if (status === 'dead') {
    riskFlags.push('dead')
  }
  if (status === 'resigned') {
    riskFlags.push('resigned')
  }
  if (fatigue >= 45) {
    riskFlags.push('fatigued')
  }
  if (vitals.wounds > 0) {
    riskFlags.push('wounded')
  }
  if (vitals.morale <= 35) {
    riskFlags.push('low-morale')
  }

  return {
    state,
    band,
    deploymentEligible: state === 'ready' && band !== 'critical',
    recoveryRequired:
      state === 'recovering' || vitals.wounds > 0 || fatigue >= 60 || vitals.morale <= 35,
    riskFlags,
  }
}

export function normalizeAgent(agent: Agent): Agent {
  const status = normalizeAgentStatus(agent.status)
  const fatigue = clampPercent(agent.fatigue, 0)
  const identity = normalizeAgentIdentity(agent)
  const progression = normalizeAgentProgression(agent)
  const assignment = normalizeAgentAssignment(agent.assignment)
  const abilities = [...(agent.abilities ?? [])]
  const abilityState = normalizeAgentAbilityState(agent.abilityState, abilities)
  const vitals = normalizeAgentVitals(agent, fatigue, status)
  const serviceRecord = normalizeAgentServiceRecord(agent, assignment)
  const readinessProfile = normalizeAgentReadinessProfile(assignment, fatigue, status, vitals)

  return {
    ...agent,
    name: identity.name,
    specialization:
      typeof agent.specialization === 'string' && agent.specialization.length > 0
        ? agent.specialization
        : agent.role,
    operationalRole: agent.operationalRole ?? deriveOperationalRole(agent.role),
    age: identity.age,
    level: progression.level,
    identity,
    stats: agent.stats ? cloneDomainStats(agent.stats) : deriveDomainStatsFromBase(agent.baseStats),
    vitals,
    serviceRecord,
    readinessProfile,
    progression,
    equipment: normalizeEquipmentCounts(agent.equipment),
    equipmentSlots: normalizeEquipmentSlots(agent.equipmentSlots),
    traits: [...(agent.traits ?? [])],
    abilities,
    ...(Object.keys(abilityState).length > 0 ? { abilityState } : {}),
    history: normalizeAgentHistory(agent.history),
    assignment,
    assignmentStatus: deriveAssignmentStatus(assignment),
    tags: [
      ...new Set((agent.tags ?? []).filter((tag) => typeof tag === 'string' && tag.length > 0)),
    ],
    relationships: normalizeRelationships(agent),
    fatigue,
    status,
  }
}

export function normalizeAgentRecord<TAgents extends Record<string, Agent>>(
  agents: TAgents
): TAgents {
  return Object.fromEntries(
    Object.entries(agents).map(([agentId, agent]) => [agentId, normalizeAgent(agent)])
  ) as TAgents
}

export function isAgentNormalized(agent: Agent) {
  return (
    agent.identity !== undefined &&
    agent.identity.name === agent.name &&
    (agent.identity.age ?? agent.age) === (agent.age ?? agent.identity.age) &&
    (agent.identity.codename ?? agent.identity.callsign) ===
      (agent.identity.callsign ?? agent.identity.codename) &&
    agent.stats !== undefined &&
    agent.vitals !== undefined &&
    agent.vitals.stress === clampPercent(agent.fatigue, 0) &&
    typeof agent.vitals.morale === 'number' &&
    typeof agent.vitals.wounds === 'number' &&
    agent.progression !== undefined &&
    agent.level === agent.progression.level &&
    agent.specialization !== undefined &&
    agent.serviceRecord !== undefined &&
    agent.readinessProfile !== undefined &&
    agent.equipment !== undefined &&
    agent.equipmentSlots !== undefined &&
    agent.traits !== undefined &&
    agent.abilities !== undefined &&
    agent.history !== undefined &&
    agent.assignment !== undefined &&
    agent.assignmentStatus !== undefined
  )
}

export function isAgentRecordNormalized(agents: Record<string, Agent>) {
  return Object.values(agents).every(isAgentNormalized)
}
