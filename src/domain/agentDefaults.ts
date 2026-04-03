import {
  type Agent,
  type AgentServiceRecord,
  type AgentAssignmentStatus,
  type AgentAssignmentState,
  type AgentHistory,
  type AgentIdentity,
  type AgentProgression,
  type SkillTree,
  type AgentVitals,
  type PotentialTier,
} from './models'
export { deriveDomainStatsFromBase } from './statDomains'
function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

export function createDefaultAgentIdentity(name: string): AgentIdentity {
  return {
    name,
  }
}

function normalizeWeek(value: number | undefined, fallback = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

export function createDefaultAgentVitals(
  fatigue: number,
  status: Agent['status'] = 'active'
): AgentVitals {
  return {
    health: status === 'dead' ? 0 : 100,
    stress: clampPercent(fatigue),
    morale: status === 'dead' || status === 'resigned' ? 0 : clampPercent(100 - fatigue),
    wounds: status === 'dead' ? 100 : status === 'injured' ? 25 : status === 'recovering' ? 10 : 0,
    statusFlags: [],
  }
}

export function createDefaultAgentProgression(
  level: number = 1,
  potentialTier: PotentialTier = 'C',
  growthProfile: string = 'balanced'
): AgentProgression {
  return {
    xp: 0,
    level: Math.max(1, Math.trunc(level)),
    potentialTier,
    growthProfile,
    growthStats: {},
    skillTree: createDefaultAgentSkillTree(),
  }
}

export function createDefaultAgentSkillTree(): SkillTree {
  return {
    skillPoints: 0,
    trainedRelationships: {},
  }
}

export function createDefaultAgentServiceRecord(joinedWeek = 1): AgentServiceRecord {
  return {
    joinedWeek: normalizeWeek(joinedWeek),
  }
}

export function createDefaultAgentHistory(): AgentHistory {
  return {
    counters: {
    assignmentsCompleted: 0,
    casesResolved: 0,
    casesPartiallyResolved: 0,
    casesFailed: 0,
    anomaliesContained: 0,
    recoveryWeeks: 0,
    trainingWeeks: 0,
    trainingsCompleted: 0,
    stressSustained: 0,
    damageSustained: 0,
    anomalyExposures: 0,
    evidenceRecovered: 0,
  },
  casesCompleted: 0,
  trainingsDone: 0,
  bonds: {},
    performanceStats: {
      deployments: 0,
      totalContribution: 0,
      totalThreatHandled: 0,
      totalDamageTaken: 0,
      totalHealingPerformed: 0,
      totalEvidenceGathered: 0,
      totalContainmentActionsCompleted: 0,
      totalFieldPower: 0,
      totalContainment: 0,
      totalInvestigation: 0,
      totalSupport: 0,
      totalStressImpact: 0,
      totalEquipmentContributionDelta: 0,
      totalKitContributionDelta: 0,
      totalProtocolContributionDelta: 0,
      totalEquipmentScoreDelta: 0,
      totalKitScoreDelta: 0,
      totalProtocolScoreDelta: 0,
      totalKitEffectivenessDelta: 0,
      totalProtocolEffectivenessDelta: 0,
  },
  alliesWorkedWith: [],
  timeline: [],
  logs: [],
  }
}

export function createDefaultAgentAssignmentState(): AgentAssignmentState {
  return {
    state: 'idle',
  }
}

export function deriveAssignmentStatus(
  assignment: AgentAssignmentState = createDefaultAgentAssignmentState()
): AgentAssignmentStatus {
  if (assignment.state === 'idle') {
    return {
      state: 'idle',
      teamId: null,
      caseId: null,
    }
  }

  if (assignment.state === 'assigned') {
    return {
      state: 'assigned',
      teamId: assignment.teamId,
      caseId: assignment.caseId,
      startedWeek: assignment.startedWeek,
    }
  }

  if (assignment.state === 'recovery') {
    return {
      state: 'recovering',
      teamId: assignment.teamId ?? null,
      startedWeek: assignment.startedWeek,
    }
  }

  // `training` is projected to recovering on the simplified lifecycle.
  return {
    state: 'recovering',
    teamId: assignment.teamId ?? null,
    caseId: null,
    startedWeek: assignment.startedWeek,
  }
}

export function createDefaultAgentAssignmentStatus(): AgentAssignmentStatus {
  return deriveAssignmentStatus(createDefaultAgentAssignmentState())
}
