import {
  evaluateAgentBreakdown,
  type EvaluateAgentContext,
  type EvaluatedAgentBreakdown,
} from '../evaluateAgent'
import type {
  Agent,
  AgentAvailabilityProfile,
  AgentEligibilityStatus,
  AgentHistorySummary,
  AgentPerformanceOutput,
  AgentSimulationProfile,
  AgentSimulationPurpose,
} from './models'
import { normalizeAgent } from './normalize'

function toRoundedFinite(value: number, digits = 2) {
  const finiteValue = Number.isFinite(value) ? value : 0
  if (digits <= 0) {
    return Math.round(finiteValue)
  }

  return Number(finiteValue.toFixed(digits))
}

function uniqueReasons(reasons: string[]) {
  return [...new Set(reasons)]
}

function buildEligibilityStatusFromNormalized(
  agent: Agent,
  purpose: AgentSimulationPurpose
): AgentEligibilityStatus {
  const reasons: string[] = []
  const readiness = agent.readinessProfile
  const assignment = agent.assignment
  const vitals = agent.vitals

  if (!readiness || !assignment || !vitals) {
    return {
      eligible: false,
      blockedReasons: ['unnormalized-agent'],
    }
  }

  if (agent.status === 'dead' || agent.status === 'resigned') {
    reasons.push('dead')
  }

  if (purpose === 'assignment') {
    if (assignment.state === 'assigned') {
      reasons.push('assigned')
    }

    if (assignment.state === 'training') {
      reasons.push('training')
    }

    if (assignment.state === 'recovery' || readiness.state === 'recovering') {
      reasons.push('recovering')
    }

    if (!readiness.deploymentEligible) {
      reasons.push('deployment-locked')
    }

    if (readiness.band === 'critical' || readiness.band === 'unavailable') {
      reasons.push('critical-readiness')
    }

    if (agent.fatigue >= 45) {
      reasons.push('fatigued')
    }

    if (vitals.wounds > 0) {
      reasons.push('wounded')
    }

    if (vitals.morale <= 35) {
      reasons.push('low-morale')
    }
  } else {
    if (assignment.state === 'training') {
      reasons.push('training')
    }

    if (assignment.state === 'recovery' || readiness.state === 'recovering') {
      reasons.push('recovering')
    }

    if (readiness.state === 'unavailable') {
      reasons.push('unavailable')
    }
  }

  return {
    eligible: reasons.length === 0,
    blockedReasons: uniqueReasons(reasons),
  }
}

function createAgentPerformanceOutput(
  agentId: Agent['id'],
  breakdown: EvaluatedAgentBreakdown
): AgentPerformanceOutput {
  return {
    agentId,
    effectivenessScore: toRoundedFinite(breakdown.score),
    fieldPower: toRoundedFinite(breakdown.performance.fieldPower),
    containment: toRoundedFinite(breakdown.performance.containment),
    investigation: toRoundedFinite(breakdown.performance.investigation),
    support: toRoundedFinite(breakdown.performance.support),
    stressImpact: toRoundedFinite(breakdown.performance.stressImpact),
    contribution: toRoundedFinite(breakdown.performance.contribution),
    threatHandled: toRoundedFinite(breakdown.performance.threatHandled),
    damageTaken: toRoundedFinite(breakdown.performance.damageTaken),
    healingPerformed: toRoundedFinite(breakdown.performance.healingPerformed),
    evidenceGathered: toRoundedFinite(breakdown.performance.evidenceGathered),
    containmentActionsCompleted: toRoundedFinite(breakdown.performance.containmentActionsCompleted),
    powerImpact: {
      ...breakdown.powerImpact,
      activeEquipmentIds: [...breakdown.powerImpact.activeEquipmentIds],
      activeKitIds: [...breakdown.powerImpact.activeKitIds],
      activeProtocolIds: [...breakdown.powerImpact.activeProtocolIds],
      equipmentContributionDelta: toRoundedFinite(breakdown.powerImpact.equipmentContributionDelta),
      kitContributionDelta: toRoundedFinite(breakdown.powerImpact.kitContributionDelta),
      protocolContributionDelta: toRoundedFinite(breakdown.powerImpact.protocolContributionDelta),
      equipmentScoreDelta: toRoundedFinite(breakdown.powerImpact.equipmentScoreDelta),
      kitScoreDelta: toRoundedFinite(breakdown.powerImpact.kitScoreDelta),
      protocolScoreDelta: toRoundedFinite(breakdown.powerImpact.protocolScoreDelta),
      kitEffectivenessMultiplier: toRoundedFinite(
        breakdown.powerImpact.kitEffectivenessMultiplier,
        4
      ),
      protocolEffectivenessMultiplier: toRoundedFinite(
        breakdown.powerImpact.protocolEffectivenessMultiplier,
        4
      ),
    },
    contributionByDomain: {
      field: toRoundedFinite(breakdown.contributionByDomain.field),
      resilience: toRoundedFinite(breakdown.contributionByDomain.resilience),
      control: toRoundedFinite(breakdown.contributionByDomain.control),
      insight: toRoundedFinite(breakdown.contributionByDomain.insight),
      presence: toRoundedFinite(breakdown.contributionByDomain.presence),
      anomaly: toRoundedFinite(breakdown.contributionByDomain.anomaly),
    },
  }
}

function buildAgentHistorySummary(agent: Agent): AgentHistorySummary {
  const history = agent.history

  if (!history) {
    return {
      assignmentsCompleted: 0,
      casesCompleted: 0,
      casesResolved: 0,
      casesPartiallyResolved: 0,
      casesFailed: 0,
      trainingsDone: 0,
      trainingWeeks: 0,
      recoveryWeeks: 0,
      anomalyExposures: 0,
      evidenceRecovered: 0,
      stressSustained: 0,
      damageSustained: 0,
      anomaliesContained: 0,
      deployments: 0,
      totalContribution: 0,
      totalThreatHandled: 0,
      totalDamageTaken: 0,
      totalHealingPerformed: 0,
      totalEvidenceGathered: 0,
      totalContainmentActionsCompleted: 0,
      totalEquipmentContributionDelta: 0,
      totalKitContributionDelta: 0,
      totalProtocolContributionDelta: 0,
      totalEquipmentScoreDelta: 0,
      totalKitScoreDelta: 0,
      totalProtocolScoreDelta: 0,
      totalKitEffectivenessDelta: 0,
      totalProtocolEffectivenessDelta: 0,
      alliesWorkedWith: 0,
    }
  }

  return {
    assignmentsCompleted: history.counters.assignmentsCompleted,
    casesCompleted: history.casesCompleted,
    casesResolved: history.counters.casesResolved,
    casesPartiallyResolved: history.counters.casesPartiallyResolved,
    casesFailed: history.counters.casesFailed,
    trainingsDone: history.trainingsDone,
    trainingWeeks: history.counters.trainingWeeks,
    recoveryWeeks: history.counters.recoveryWeeks,
    anomalyExposures: history.counters.anomalyExposures,
    evidenceRecovered: history.counters.evidenceRecovered,
    stressSustained: history.counters.stressSustained,
    damageSustained: history.counters.damageSustained,
    anomaliesContained: history.counters.anomaliesContained,
    deployments: history.performanceStats.deployments,
    totalContribution: history.performanceStats.totalContribution,
    totalThreatHandled: history.performanceStats.totalThreatHandled,
    totalDamageTaken: history.performanceStats.totalDamageTaken,
    totalHealingPerformed: history.performanceStats.totalHealingPerformed,
    totalEvidenceGathered: history.performanceStats.totalEvidenceGathered,
    totalContainmentActionsCompleted: history.performanceStats.totalContainmentActionsCompleted,
    totalEquipmentContributionDelta: history.performanceStats.totalEquipmentContributionDelta,
    totalKitContributionDelta: history.performanceStats.totalKitContributionDelta,
    totalProtocolContributionDelta: history.performanceStats.totalProtocolContributionDelta,
    totalEquipmentScoreDelta: history.performanceStats.totalEquipmentScoreDelta,
    totalKitScoreDelta: history.performanceStats.totalKitScoreDelta,
    totalProtocolScoreDelta: history.performanceStats.totalProtocolScoreDelta,
    totalKitEffectivenessDelta: history.performanceStats.totalKitEffectivenessDelta,
    totalProtocolEffectivenessDelta: history.performanceStats.totalProtocolEffectivenessDelta,
    alliesWorkedWith: history.alliesWorkedWith.length,
  }
}

export function buildAgentAvailabilityProfile(agent: Agent): AgentAvailabilityProfile {
  const normalizedAgent = normalizeAgent(agent)
  const readiness = normalizedAgent.readinessProfile!
  const assignment = normalizedAgent.assignment!

  return {
    assignment: buildEligibilityStatusFromNormalized(normalizedAgent, 'assignment'),
    resolution: buildEligibilityStatusFromNormalized(normalizedAgent, 'resolution'),
    readinessState: readiness.state,
    readinessBand: readiness.band,
    currentAssignmentState: assignment.state,
    recoveryRequired: readiness.recoveryRequired,
  }
}

export function buildAgentEligibilityStatus(
  agent: Agent,
  purpose: AgentSimulationPurpose
): AgentEligibilityStatus {
  return buildEligibilityStatusFromNormalized(normalizeAgent(agent), purpose)
}

export function isAgentEligibleForPurpose(
  agent: Agent | undefined,
  purpose: AgentSimulationPurpose
): agent is Agent {
  return agent !== undefined && buildAgentEligibilityStatus(agent, purpose).eligible
}

export function buildAgentSimulationProfile(
  agent: Agent,
  context: EvaluateAgentContext = {}
): AgentSimulationProfile {
  const normalizedAgent = normalizeAgent(agent)
  const breakdown = evaluateAgentBreakdown(normalizedAgent, context)

  return {
    agent: normalizedAgent,
    agentId: normalizedAgent.id,
    assignment: normalizedAgent.assignment!,
    readiness: normalizedAgent.readinessProfile!,
    service: normalizedAgent.serviceRecord!,
    progression: normalizedAgent.progression!,
    availability: buildAgentAvailabilityProfile(normalizedAgent),
    history: buildAgentHistorySummary(normalizedAgent),
    effectiveStats: breakdown.effectiveStats,
    effectiveWeights: breakdown.weights,
    domainProfile: {
      field: toRoundedFinite(breakdown.derived.domainProfile.field),
      resilience: toRoundedFinite(breakdown.derived.domainProfile.resilience),
      control: toRoundedFinite(breakdown.derived.domainProfile.control),
      insight: toRoundedFinite(breakdown.derived.domainProfile.insight),
      presence: toRoundedFinite(breakdown.derived.domainProfile.presence),
      anomaly: toRoundedFinite(breakdown.derived.domainProfile.anomaly),
    },
    contributionByDomain: {
      field: toRoundedFinite(breakdown.contributionByDomain.field),
      resilience: toRoundedFinite(breakdown.contributionByDomain.resilience),
      control: toRoundedFinite(breakdown.contributionByDomain.control),
      insight: toRoundedFinite(breakdown.contributionByDomain.insight),
      presence: toRoundedFinite(breakdown.contributionByDomain.presence),
      anomaly: toRoundedFinite(breakdown.contributionByDomain.anomaly),
    },
    scoreBreakdown: {
      baseDomainScore: toRoundedFinite(breakdown.scoreBreakdown.baseDomainScore),
      traitBonus: toRoundedFinite(breakdown.scoreBreakdown.traitBonus),
      preEffectivenessScore: toRoundedFinite(breakdown.scoreBreakdown.preEffectivenessScore),
      effectivenessMultiplier: toRoundedFinite(breakdown.scoreBreakdown.effectivenessMultiplier, 4),
      finalScore: toRoundedFinite(breakdown.scoreBreakdown.finalScore),
    },
    performanceBlend: {
      equipmentLoad: toRoundedFinite(breakdown.performanceBlend.equipmentLoad),
      legacyBlendWeight: toRoundedFinite(breakdown.performanceBlend.legacyBlendWeight, 4),
      weightedBlendWeight: toRoundedFinite(breakdown.performanceBlend.weightedBlendWeight, 4),
      legacyTotal: toRoundedFinite(breakdown.performanceBlend.legacyTotal),
      weightedTotal: toRoundedFinite(breakdown.performanceBlend.weightedTotal),
      normalizedWeightedTotal: toRoundedFinite(breakdown.performanceBlend.normalizedWeightedTotal),
      blendedTotal: toRoundedFinite(breakdown.performanceBlend.blendedTotal),
    },
    powerLayer: {
      kits: breakdown.powerLayer.kits.map((kit) => ({
        ...kit,
        effectivenessMultiplier: toRoundedFinite(kit.effectivenessMultiplier, 4),
        stressImpactMultiplier: toRoundedFinite(kit.stressImpactMultiplier, 4),
        moraleRecoveryDelta: toRoundedFinite(kit.moraleRecoveryDelta, 4),
      })),
      protocols: breakdown.powerLayer.protocols.map((protocol) => ({
        ...protocol,
        effectivenessMultiplier: toRoundedFinite(protocol.effectivenessMultiplier, 4),
        stressImpactMultiplier: toRoundedFinite(protocol.stressImpactMultiplier, 4),
        moraleRecoveryDelta: toRoundedFinite(protocol.moraleRecoveryDelta, 4),
      })),
    },
    modifierEffects: breakdown.modifierEffects,
    score: toRoundedFinite(breakdown.score),
    performance: createAgentPerformanceOutput(normalizedAgent.id, breakdown),
  }
}
