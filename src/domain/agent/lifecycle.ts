import {
  createDefaultAgentHistory,
  createDefaultAgentServiceRecord,
  deriveAssignmentStatus,
} from '../agentDefaults'
import type { OperationEvent } from '../events/types'
import type { ProgressionUpdateResult } from '../progression'
import type {
  Agent,
  AgentAssignmentState,
  AgentHistoryCounters,
  AgentHistoryEntry,
  AgentPowerImpact,
  AgentPerformanceOutput,
} from './models'

export type AgentHistoryCounterDelta = Partial<Record<keyof AgentHistoryCounters, number>>

function deriveCasesCompleted(counters: AgentHistoryCounters) {
  return counters.casesResolved + counters.casesPartiallyResolved + counters.casesFailed
}

function normalizeWeek(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return Math.max(1, Math.trunc(value))
}

function updateServiceRecordFromEntries(
  agent: Agent,
  entries: readonly AgentHistoryEntry[]
) {
  const serviceRecord = agent.serviceRecord ?? createDefaultAgentServiceRecord()
  const latestAssignmentWeek = entries
    .filter((entry) => entry.eventType === 'assignment.team_assigned')
    .map((entry) => normalizeWeek(entry.week))
    .filter((entry): entry is number => entry !== undefined)
    .at(-1)
  const latestCaseWeek = entries
    .filter((entry) =>
      entry.eventType === 'case.resolved' ||
      entry.eventType === 'case.partially_resolved' ||
      entry.eventType === 'case.failed'
    )
    .map((entry) => normalizeWeek(entry.week))
    .filter((entry): entry is number => entry !== undefined)
    .at(-1)
  const latestTrainingWeek = entries
    .filter(
      (entry) =>
        entry.eventType === 'agent.training_started' ||
        entry.eventType === 'agent.training_completed'
    )
    .map((entry) => normalizeWeek(entry.week))
    .filter((entry): entry is number => entry !== undefined)
    .at(-1)

  return {
    ...serviceRecord,
    ...(latestAssignmentWeek !== undefined
      ? {
          lastAssignmentWeek: Math.max(
            serviceRecord.lastAssignmentWeek ?? 0,
            latestAssignmentWeek
          ),
        }
      : {}),
    ...(latestCaseWeek !== undefined
      ? {
          lastCaseWeek: Math.max(serviceRecord.lastCaseWeek ?? 0, latestCaseWeek),
        }
      : {}),
    ...(latestTrainingWeek !== undefined
      ? {
          lastTrainingWeek: Math.max(
            serviceRecord.lastTrainingWeek ?? 0,
            latestTrainingWeek
          ),
        }
      : {}),
  }
}

function updateServiceRecordFromAssignment(
  agent: Agent,
  assignment: AgentAssignmentState
) {
  const serviceRecord = agent.serviceRecord ?? createDefaultAgentServiceRecord()

  if (assignment.state === 'assigned') {
    return {
      ...serviceRecord,
      ...(normalizeWeek(assignment.startedWeek) !== undefined
        ? { lastAssignmentWeek: normalizeWeek(assignment.startedWeek) }
        : {}),
    }
  }

  if (assignment.state === 'training') {
    return {
      ...serviceRecord,
      ...(normalizeWeek(assignment.startedWeek) !== undefined
        ? { lastTrainingWeek: normalizeWeek(assignment.startedWeek) }
        : {}),
    }
  }

  if (assignment.state === 'recovery') {
    return {
      ...serviceRecord,
      ...(normalizeWeek(assignment.startedWeek) !== undefined
        ? { lastRecoveryWeek: normalizeWeek(assignment.startedWeek) }
        : {}),
    }
  }

  return serviceRecord
}

function applyCounterDelta(
  counters: AgentHistoryCounters,
  counterDelta: AgentHistoryCounterDelta
): AgentHistoryCounters {
  return {
    assignmentsCompleted: Math.max(0, counters.assignmentsCompleted + (counterDelta.assignmentsCompleted ?? 0)),
    casesResolved: Math.max(0, counters.casesResolved + (counterDelta.casesResolved ?? 0)),
    casesPartiallyResolved: Math.max(
      0,
      counters.casesPartiallyResolved + (counterDelta.casesPartiallyResolved ?? 0)
    ),
    casesFailed: Math.max(0, counters.casesFailed + (counterDelta.casesFailed ?? 0)),
    anomaliesContained: Math.max(0, counters.anomaliesContained + (counterDelta.anomaliesContained ?? 0)),
    recoveryWeeks: Math.max(0, counters.recoveryWeeks + (counterDelta.recoveryWeeks ?? 0)),
    trainingWeeks: Math.max(0, counters.trainingWeeks + (counterDelta.trainingWeeks ?? 0)),
    trainingsCompleted: Math.max(
      0,
      counters.trainingsCompleted + (counterDelta.trainingsCompleted ?? 0)
    ),
    stressSustained: Math.max(0, counters.stressSustained + (counterDelta.stressSustained ?? 0)),
    damageSustained: Math.max(0, counters.damageSustained + (counterDelta.damageSustained ?? 0)),
    anomalyExposures: Math.max(
      0,
      counters.anomalyExposures + (counterDelta.anomalyExposures ?? 0)
    ),
    evidenceRecovered: Math.max(
      0,
      counters.evidenceRecovered + (counterDelta.evidenceRecovered ?? 0)
    ),
  }
}

export function createAgentHistoryEntry(
  week: number,
  eventType: AgentHistoryEntry['eventType'],
  note: string,
  eventId?: string
): AgentHistoryEntry {
  return {
    week,
    eventType,
    note,
    ...(eventId ? { eventId } : {}),
  }
}

export function appendAgentHistoryEntries(
  agent: Agent,
  entries: readonly AgentHistoryEntry[],
  counterDelta: AgentHistoryCounterDelta = {}
): Agent {
  if (entries.length === 0 && Object.keys(counterDelta).length === 0) {
    return agent
  }

  const history = agent.history ?? createDefaultAgentHistory()
  const completedTrainingCount = entries.filter(
    (entry) => entry.eventType === 'agent.training_completed'
  ).length
  const nextCounters = applyCounterDelta(history.counters, {
    ...counterDelta,
    trainingsCompleted:
      (counterDelta.trainingsCompleted ?? 0) + completedTrainingCount,
  })
  const trainingsDone = history.trainingsDone + completedTrainingCount

  return {
    ...agent,
    serviceRecord: updateServiceRecordFromEntries(agent, entries),
    history: {
      counters: nextCounters,
      casesCompleted: deriveCasesCompleted(nextCounters),
      trainingsDone,
      bonds: { ...history.bonds },
      performanceStats: { ...history.performanceStats },
      alliesWorkedWith: [...history.alliesWorkedWith],
      timeline: [...history.timeline, ...entries],
      logs: [...history.logs],
    },
  }
}

export function appendAgentHistoryEntry(
  agent: Agent,
  entry: AgentHistoryEntry,
  counterDelta: AgentHistoryCounterDelta = {}
): Agent {
  return appendAgentHistoryEntries(agent, [entry], counterDelta)
}

export function setAgentAssignment(agent: Agent, assignment: AgentAssignmentState): Agent {
  return {
    ...agent,
    assignment,
    assignmentStatus: deriveAssignmentStatus(assignment),
    serviceRecord: updateServiceRecordFromAssignment(agent, assignment),
  }
}

export function applyAgentProgressionUpdate(
  agent: Agent,
  progressionUpdate: ProgressionUpdateResult
): Agent {
  return {
    ...agent,
    progression: progressionUpdate.progression,
    level: progressionUpdate.level,
  }
}

export function recordAgentCollaborators(agent: Agent, collaboratorIds: readonly string[]): Agent {
  if (collaboratorIds.length === 0) {
    return agent
  }

  const history = agent.history ?? createDefaultAgentHistory()
  const alliesWorkedWith = [...new Set([...history.alliesWorkedWith, ...collaboratorIds])]
  const bonds = { ...history.bonds }

  for (const collaboratorId of collaboratorIds) {
    if (typeof collaboratorId !== 'string' || collaboratorId.length === 0) {
      continue
    }

    bonds[collaboratorId] = agent.relationships[collaboratorId] ?? bonds[collaboratorId] ?? 0
  }

  return {
    ...agent,
    history: {
      ...history,
      alliesWorkedWith,
      bonds,
      logs: [...history.logs],
    },
  }
}

export function recordAgentPerformance(
  agent: Agent,
  performance: Pick<
    AgentPerformanceOutput,
    | 'fieldPower'
    | 'containment'
    | 'investigation'
    | 'support'
    | 'stressImpact'
    | 'contribution'
    | 'threatHandled'
    | 'damageTaken'
    | 'healingPerformed'
    | 'evidenceGathered'
    | 'containmentActionsCompleted'
  >,
  powerImpact?: AgentPowerImpact
): Agent {
  const history = agent.history ?? createDefaultAgentHistory()

  return {
    ...agent,
    history: {
      ...history,
      counters: {
        ...history.counters,
        stressSustained:
          history.counters.stressSustained + Math.max(0, Math.round(performance.stressImpact)),
      },
      performanceStats: {
        deployments: history.performanceStats.deployments + 1,
        totalContribution: history.performanceStats.totalContribution + performance.contribution,
        totalThreatHandled:
          history.performanceStats.totalThreatHandled + performance.threatHandled,
        totalDamageTaken: history.performanceStats.totalDamageTaken + performance.damageTaken,
        totalHealingPerformed:
          history.performanceStats.totalHealingPerformed + performance.healingPerformed,
        totalEvidenceGathered:
          history.performanceStats.totalEvidenceGathered + performance.evidenceGathered,
        totalContainmentActionsCompleted:
          history.performanceStats.totalContainmentActionsCompleted +
          performance.containmentActionsCompleted,
        totalFieldPower: history.performanceStats.totalFieldPower + performance.fieldPower,
        totalContainment: history.performanceStats.totalContainment + performance.containment,
        totalInvestigation:
          history.performanceStats.totalInvestigation + performance.investigation,
        totalSupport: history.performanceStats.totalSupport + performance.support,
        totalStressImpact: history.performanceStats.totalStressImpact + performance.stressImpact,
        totalEquipmentContributionDelta:
          history.performanceStats.totalEquipmentContributionDelta +
          (powerImpact?.equipmentContributionDelta ?? 0),
        totalKitContributionDelta:
          history.performanceStats.totalKitContributionDelta +
          (powerImpact?.kitContributionDelta ?? 0),
        totalProtocolContributionDelta:
          history.performanceStats.totalProtocolContributionDelta +
          (powerImpact?.protocolContributionDelta ?? 0),
        totalEquipmentScoreDelta:
          history.performanceStats.totalEquipmentScoreDelta +
          (powerImpact?.equipmentScoreDelta ?? 0),
        totalKitScoreDelta:
          history.performanceStats.totalKitScoreDelta +
          (powerImpact?.kitScoreDelta ?? 0),
        totalProtocolScoreDelta:
          history.performanceStats.totalProtocolScoreDelta +
          (powerImpact?.protocolScoreDelta ?? 0),
        totalKitEffectivenessDelta:
          history.performanceStats.totalKitEffectivenessDelta +
          Math.max(0, (powerImpact?.kitEffectivenessMultiplier ?? 1) - 1),
        totalProtocolEffectivenessDelta:
          history.performanceStats.totalProtocolEffectivenessDelta +
          Math.max(0, (powerImpact?.protocolEffectivenessMultiplier ?? 1) - 1),
      },
    },
  }
}

export interface AgentOperationalCounterDelta {
  anomalyExposures?: number
  evidenceRecovered?: number
  damageSustained?: number
  anomaliesContained?: number
}

export function recordAgentOperationalCounters(
  agent: Agent,
  counterDelta: AgentOperationalCounterDelta
): Agent {
  if (Object.keys(counterDelta).length === 0) {
    return agent
  }

  const history = agent.history ?? createDefaultAgentHistory()

  return {
    ...agent,
    history: {
      ...history,
      counters: {
        ...history.counters,
        anomalyExposures:
          history.counters.anomalyExposures + (counterDelta.anomalyExposures ?? 0),
        evidenceRecovered:
          history.counters.evidenceRecovered + (counterDelta.evidenceRecovered ?? 0),
        damageSustained:
          history.counters.damageSustained + (counterDelta.damageSustained ?? 0),
        anomaliesContained:
          history.counters.anomaliesContained + (counterDelta.anomaliesContained ?? 0),
      },
    },
  }
}

function buildProjectedHistoryEntryFromEvent(event: OperationEvent): AgentHistoryEntry | null {
  switch (event.type) {
    case 'assignment.team_assigned':
      return createAgentHistoryEntry(
        event.payload.week,
        'assignment.team_assigned',
        `Assigned to ${event.payload.caseTitle}.`
      )
    case 'assignment.team_unassigned':
      return createAgentHistoryEntry(
        event.payload.week,
        'assignment.team_unassigned',
        `Released from ${event.payload.caseTitle}.`
      )
    case 'case.resolved':
      return createAgentHistoryEntry(
        event.payload.week,
        'case.resolved',
        `${event.payload.caseTitle} resolved.`
      )
    case 'case.partially_resolved':
      return createAgentHistoryEntry(
        event.payload.week,
        'case.partially_resolved',
        `${event.payload.caseTitle} partially resolved.`
      )
    case 'case.failed':
      return createAgentHistoryEntry(
        event.payload.week,
        'case.failed',
        `${event.payload.caseTitle} failed.`
      )
    case 'agent.training_started':
      return createAgentHistoryEntry(
        event.payload.week,
        'agent.training_started',
        event.payload.teamName
          ? `Started ${event.payload.trainingName} with ${event.payload.teamName}.`
          : `Started ${event.payload.trainingName}.`
      )
    case 'agent.training_completed':
      return createAgentHistoryEntry(
        event.payload.week,
        'agent.training_completed',
        `${event.payload.trainingName} completed.`
      )
    case 'agent.training_cancelled':
      return createAgentHistoryEntry(
        event.payload.week,
        'agent.training_cancelled',
        `${event.payload.trainingName} cancelled.`
      )
    case 'agent.injured':
      return createAgentHistoryEntry(
        event.payload.week,
        'agent.injured',
        `Injured (${event.payload.severity}).`
      )
    case 'agent.betrayed':
      return createAgentHistoryEntry(
        event.payload.week,
        'simulation.weekly_tick',
        `${event.payload.betrayerName} betrayed ${event.payload.betrayedName}.`
      )
    case 'agent.resigned':
      return createAgentHistoryEntry(
        event.payload.week,
        'simulation.weekly_tick',
        `${event.payload.agentName} resigned (${event.payload.reason.replace(/_/g, ' ')}).`
      )
    case 'agent.promoted':
      return createAgentHistoryEntry(
        event.payload.week,
        'agent.promoted',
        `Promoted to level ${event.payload.newLevel}.`
      )
    case 'agent.hired':
      return createAgentHistoryEntry(event.payload.week, 'agent.hired', 'Hired into the agency.')
    case 'progression.xp_gained':
      return createAgentHistoryEntry(
        event.payload.week,
        'progression.xp_gained',
        `${event.payload.reason}: +${event.payload.xpAmount} XP`
      )
    default:
      return null
  }
}

export function reconcileAgentHistoryTimelineWithEvents(
  agent: Agent,
  events: readonly OperationEvent[]
): Agent {
  if (events.length === 0) {
    return agent
  }

  const history = agent.history ?? createDefaultAgentHistory()
  const timeline = [...history.timeline]
  const linkedEventIds = new Set(
    timeline
      .map((entry) => entry.eventId)
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
  )
  let changed = false

  for (const event of events) {
    if (linkedEventIds.has(event.id)) {
      continue
    }

    const projectedEntry = buildProjectedHistoryEntryFromEvent(event)

    const matchingIndex = [...timeline]
      .map((entry, index) => ({ entry, index }))
      .reverse()
      .find(
        ({ entry }) =>
          entry.eventId === undefined &&
          entry.eventType === event.type &&
          entry.week === event.payload.week &&
          (projectedEntry === null || entry.note === projectedEntry.note)
      )?.index

    if (matchingIndex !== undefined) {
      timeline[matchingIndex] = {
        ...timeline[matchingIndex],
        eventId: event.id,
      }
      linkedEventIds.add(event.id)
      changed = true
      continue
    }

    if (!projectedEntry) {
      continue
    }

    timeline.push({
      ...projectedEntry,
      eventId: event.id,
    })
    linkedEventIds.add(event.id)
    changed = true
  }

  if (!changed) {
    return agent
  }

  return {
    ...agent,
    history: {
      ...history,
      timeline,
    },
  }
}

export function appendAgentEventLogs(
  agent: Agent,
  events: readonly OperationEvent[]
): Agent {
  if (events.length === 0) {
    return agent
  }

  const history = agent.history ?? createDefaultAgentHistory()
  const existingIds = new Set(history.logs.map((event) => event.id))
  const nextLogs = [...history.logs]

  for (const event of events) {
    if (!existingIds.has(event.id)) {
      existingIds.add(event.id)
      nextLogs.push(event)
    }
  }

  return {
    ...agent,
    history: {
      ...history,
      logs: nextLogs,
    },
  }
}

export function recordAgentXpGain(
  agent: Agent,
  xpAmount: number,
  reason: string,
  week: number
): Agent {
  const note = `${reason}: +${xpAmount} XP`
  const entry = createAgentHistoryEntry(week, 'progression.xp_gained', note)
  return appendAgentHistoryEntry(agent, entry)
}
