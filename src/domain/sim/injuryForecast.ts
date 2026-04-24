import { clamp } from '../math'
import type {
  Agent,
  AgentPerformanceOutput,
  CaseInstance,
  ContractModifier,
  MajorIncidentProvisionType,
  MajorIncidentStrategy,
  PerformanceMetricSummary,
} from '../models'
import type { ResolutionComparison } from './scoring'
import { getRecoveryDurationWeeks } from './recoveryPipeline'

export type MissionRiskBand = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'

export interface AgentFailureRiskProfile {
  agentId: string
  agentName: string
  fatigue: number
  localExposure: number
  injuryChanceOnFailure: number
  minorInjuryChanceOnFailure: number
  moderateInjuryChanceOnFailure: number
  deathChanceOnFailure: number
  expectedDowntimeWeeksOnFailure: number
}

export interface AgentMissionRiskPreview extends AgentFailureRiskProfile {
  injuryChance: number
  deathChance: number
  expectedDowntimeWeeks: number
}

export interface MissionInjuryForecast {
  injuryChance: number
  injuryRiskBand: MissionRiskBand
  expectedInjuries: number
  expectedInjuryLabel: string
  deathChance: number
  deathRiskBand: MissionRiskBand
  expectedDowntimeWeeks: number
  tempoLossLabel: string
  primaryWarning: string
  guidance: string
  reasons: string[]
  supportCoverage: number
  survivabilityGap: number
  agentRisks: AgentMissionRiskPreview[]
}

interface MissionRiskModifierSet {
  injuryDelta: number
  deathDelta: number
}

interface MissionRiskContext extends MissionRiskModifierSet {
  supportCoverage: number
  offenseCoverage: number
  survivabilityGap: number
  averageFatigue: number
  highFatigueCount: number
  damagePressure: number
  hasSurvivalSpecialist: boolean
  stagePressure: number
  raidPressure: number
  teamSize: number
}

const EMPTY_PERFORMANCE_SUMMARY: PerformanceMetricSummary = {
  contribution: 0,
  threatHandled: 0,
  damageTaken: 0,
  healingPerformed: 0,
  evidenceGathered: 0,
  containmentActionsCompleted: 0,
}

const STRATEGY_CASUALTY_EFFECTS: Record<
  MajorIncidentStrategy,
  { injuryDelta: number; deathDelta: number }
> = {
  aggressive: {
    injuryDelta: 0.09,
    deathDelta: 0.05,
  },
  balanced: {
    injuryDelta: 0,
    deathDelta: 0,
  },
  cautious: {
    injuryDelta: -0.12,
    deathDelta: -0.04,
  },
  rapid_response: {
    injuryDelta: 0.04,
    deathDelta: 0.01,
  },
  containment_first: {
    injuryDelta: -0.04,
    deathDelta: -0.02,
  },
  risk_accepting: {
    injuryDelta: 0.08,
    deathDelta: 0.03,
  },
}

const PROVISION_CASUALTY_EFFECTS: Record<
  MajorIncidentProvisionType,
  { injuryDelta: number; deathDelta: number }
> = {
  medical_supplies: {
    injuryDelta: -0.12,
    deathDelta: -0.05,
  },
  tactical_enhancers: {
    injuryDelta: 0,
    deathDelta: 0,
  },
  extraction_tools: {
    injuryDelta: 0,
    deathDelta: 0,
  },
  optimization_kits: {
    injuryDelta: 0,
    deathDelta: 0,
  },
}

function getRiskBand(value: number): MissionRiskBand {
  if (value >= 0.55) {
    return 'Very High'
  }
  if (value >= 0.34) {
    return 'High'
  }
  if (value >= 0.18) {
    return 'Moderate'
  }
  if (value >= 0.08) {
    return 'Low'
  }
  return 'Very Low'
}

function getAxisCoverage(
  comparison: ResolutionComparison | undefined,
  axis: keyof ResolutionComparison['axisAssessments']
) {
  const assessment = comparison?.axisAssessments[axis]

  if (!assessment || assessment.required <= 0) {
    return 1
  }

  return clamp(assessment.provided / assessment.required, 0, 1.5)
}

function hasSurvivalSpecialist(agent: Agent) {
  return (
    agent.role === 'medic' ||
    agent.role === 'occultist' ||
    agent.role === 'medium' ||
    agent.tags.some((tag) =>
      [
        'medical',
        'medic',
        'triage',
        'hazmat',
        'support',
        'containment',
        'survival',
        'ward',
        'ritual',
        'protection',
      ].includes(tag)
    )
  )
}

function getContractRiskModifierTotal(currentCase: CaseInstance, effect: 'injury_risk' | 'death_risk') {
  const modifiers =
    ((currentCase.contract as { modifiers?: ContractModifier[] } | undefined)?.modifiers ?? [])
  return modifiers
    .filter((modifier) => modifier.effect === effect)
    .reduce((total, modifier) => total + (modifier.value ?? 0), 0)
}

function buildMissionRiskModifiers(currentCase: CaseInstance): MissionRiskModifierSet {
  const strategyEffects = currentCase.majorIncident
    ? STRATEGY_CASUALTY_EFFECTS[currentCase.majorIncident.strategy]
    : STRATEGY_CASUALTY_EFFECTS.balanced
  const provisionEffects = (currentCase.majorIncident?.provisions ?? []).reduce(
    (totals, provision) => {
      const effect = PROVISION_CASUALTY_EFFECTS[provision]
      return {
        injuryDelta: totals.injuryDelta + effect.injuryDelta,
        deathDelta: totals.deathDelta + effect.deathDelta,
      }
    },
    { injuryDelta: 0, deathDelta: 0 }
  )
  const contractEffects = {
    injuryDelta: getContractRiskModifierTotal(currentCase, 'injury_risk') * 0.01,
    deathDelta: getContractRiskModifierTotal(currentCase, 'death_risk') * 0.01,
  }

  return {
    injuryDelta: strategyEffects.injuryDelta + provisionEffects.injuryDelta + contractEffects.injuryDelta,
    deathDelta: strategyEffects.deathDelta + provisionEffects.deathDelta + contractEffects.deathDelta,
  }
}

function buildMissionRiskContext(
  currentCase: CaseInstance,
  agents: Agent[],
  performanceSummary: PerformanceMetricSummary,
  comparison?: ResolutionComparison
): MissionRiskContext {
  const averageFatigue =
    agents.length > 0
      ? agents.reduce((sum, agent) => sum + Math.max(0, agent.fatigue), 0) / agents.length
      : 0
  const highFatigueCount = agents.filter((agent) => agent.fatigue >= 70).length
  const comparisonSupportCoverage =
    (getAxisCoverage(comparison, 'support') + getAxisCoverage(comparison, 'containment')) / 2
  const performanceSupportCoverage =
    performanceSummary.damageTaken <= 0
      ? 1
      : clamp(
          (performanceSummary.healingPerformed + performanceSummary.containmentActionsCompleted * 0.75) /
            Math.max(4, performanceSummary.damageTaken),
          0,
          1.5
        )
  const supportCoverage = clamp(
    comparison
      ? (comparisonSupportCoverage + performanceSupportCoverage) / 2
      : performanceSupportCoverage,
    0,
    1.5
  )
  const offenseCoverage = clamp(
    comparison
      ? getAxisCoverage(comparison, 'fieldPower')
      : performanceSummary.damageTaken <= 0
        ? 1
        : performanceSummary.threatHandled / Math.max(8, performanceSummary.damageTaken * 1.35),
    0,
    1.5
  )
  const damagePressure =
    performanceSummary.damageTaken <= 0
      ? 0
      : performanceSummary.damageTaken /
        Math.max(
          6,
          performanceSummary.healingPerformed + performanceSummary.containmentActionsCompleted * 0.75
        )
  const survivabilityGap = clamp(
    1 - supportCoverage + Math.max(0, damagePressure - 1) * 0.35,
    0,
    1
  )

  return {
    ...buildMissionRiskModifiers(currentCase),
    supportCoverage,
    offenseCoverage,
    survivabilityGap,
    averageFatigue,
    highFatigueCount,
    damagePressure,
    hasSurvivalSpecialist: agents.some(hasSurvivalSpecialist),
    stagePressure: Math.max(0, currentCase.stage - 1) * 0.07,
    raidPressure: currentCase.kind === 'raid' ? 0.08 : 0,
    teamSize: agents.length,
  }
}

function buildLocalExposure(
  performance: AgentPerformanceOutput | undefined,
  performanceSummary: PerformanceMetricSummary,
  teamSize: number
) {
  const baselineDamage = performanceSummary.damageTaken / Math.max(teamSize, 1)
  const localDamage = performance?.damageTaken ?? baselineDamage
  const localHealing = performance?.healingPerformed ?? performanceSummary.healingPerformed / Math.max(teamSize, 1)

  return clamp(
    (localDamage - localHealing * 0.45) / Math.max(6, baselineDamage + 6),
    0,
    1
  )
}

export function evaluateMissionAgentFailureRisk(input: {
  currentCase: CaseInstance
  agent: Agent
  performance?: AgentPerformanceOutput
  performanceSummary?: PerformanceMetricSummary
  agents: Agent[]
  comparison?: ResolutionComparison
}): AgentFailureRiskProfile {
  const performanceSummary = input.performanceSummary ?? EMPTY_PERFORMANCE_SUMMARY
  const context = buildMissionRiskContext(
    input.currentCase,
    input.agents,
    performanceSummary,
    input.comparison
  )

  if (input.agent.status !== 'active') {
    return {
      agentId: input.agent.id,
      agentName: input.agent.name,
      fatigue: input.agent.fatigue,
      localExposure: 0,
      injuryChanceOnFailure: 0,
      minorInjuryChanceOnFailure: 0,
      moderateInjuryChanceOnFailure: 0,
      deathChanceOnFailure: 0,
      expectedDowntimeWeeksOnFailure: 0,
    }
  }

  const fatigue = Math.max(0, input.agent.fatigue)
  const fatigueFactor = fatigue >= 90 ? 1 : clamp((fatigue - 35) / 55, 0, 1)
  const localExposure = buildLocalExposure(input.performance, performanceSummary, context.teamSize)
  const lowBaselineRisk =
    fatigue < 45 &&
    context.survivabilityGap < 0.18 &&
    context.stagePressure < 0.12 &&
    context.raidPressure === 0 &&
    localExposure < 0.15 &&
    context.injuryDelta <= 0.01

  let injuryChanceOnFailure = lowBaselineRisk
    ? 0
    : clamp(
        0.03 +
          fatigueFactor * 0.24 +
          context.stagePressure +
          context.raidPressure +
          context.survivabilityGap * 0.18 +
          localExposure * 0.12 +
          context.injuryDelta,
        0.01,
        0.92
      )

  if (fatigue >= 85) {
    injuryChanceOnFailure = Math.max(injuryChanceOnFailure, 0.72)
  }

  const severeShare = clamp(
    0.16 +
      Math.max(0, fatigue - 55) / 45 * 0.36 +
      (input.currentCase.stage >= 3 ? 0.22 : input.currentCase.stage === 2 ? 0.08 : 0) +
      (input.currentCase.kind === 'raid' ? 0.08 : 0) +
      context.survivabilityGap * 0.22 +
      localExposure * 0.18,
    0.16,
    0.92
  )
  const deathEligible =
    input.currentCase.stage >= 4 ||
    input.currentCase.kind === 'raid' ||
    context.deathDelta > 0.01
  const fatalityRate = deathEligible
    ? clamp(
        0.01 +
          Math.max(0, input.currentCase.stage - 3) * 0.025 +
          (input.currentCase.kind === 'raid' ? 0.025 : 0) +
          Math.max(0, fatigue - 80) / 20 * 0.03 +
          context.survivabilityGap * 0.04 +
          localExposure * 0.03 +
          context.deathDelta,
        0,
        0.22
      )
    : 0
  const totalSevereChance = injuryChanceOnFailure * severeShare
  const deathChanceOnFailure = clamp(totalSevereChance * fatalityRate, 0, totalSevereChance)
  const moderateInjuryChanceOnFailure = clamp(
    totalSevereChance - deathChanceOnFailure,
    0,
    injuryChanceOnFailure
  )
  const minorInjuryChanceOnFailure = clamp(
    injuryChanceOnFailure - moderateInjuryChanceOnFailure - deathChanceOnFailure,
    0,
    injuryChanceOnFailure
  )

  return {
    agentId: input.agent.id,
    agentName: input.agent.name,
    fatigue,
    localExposure,
    injuryChanceOnFailure,
    minorInjuryChanceOnFailure,
    moderateInjuryChanceOnFailure,
    deathChanceOnFailure,
    expectedDowntimeWeeksOnFailure:
      minorInjuryChanceOnFailure * getRecoveryDurationWeeks('minor') +
      moderateInjuryChanceOnFailure * getRecoveryDurationWeeks('moderate') +
      deathChanceOnFailure * 6,
  }
}

function buildExpectedInjuryLabel(expectedInjuries: number) {
  if (expectedInjuries < 0.25) {
    return 'Likely 0 injuries'
  }

  if (expectedInjuries < 0.85) {
    return 'About 1 injury'
  }

  if (expectedInjuries < 1.6) {
    return '1-2 injuries likely'
  }

  return `${Math.max(2, Math.round(expectedInjuries))}+ injuries possible`
}

function buildTempoLossLabel(expectedDowntimeWeeks: number, deathChance: number) {
  if (deathChance >= 0.08 || expectedDowntimeWeeks >= 5) {
    return 'Severe tempo loss'
  }

  if (deathChance >= 0.03 || expectedDowntimeWeeks >= 3) {
    return 'Heavy tempo loss'
  }

  if (expectedDowntimeWeeks >= 1.25) {
    return 'Noticeable tempo loss'
  }

  return 'Minor tempo loss'
}

function buildPrimaryWarning(
  currentCase: CaseInstance,
  failChance: number,
  context: MissionRiskContext,
  comparison?: ResolutionComparison
) {
  const supportAxis = getAxisCoverage(comparison, 'support')
  const containmentAxis = getAxisCoverage(comparison, 'containment')
  const fieldAxis = getAxisCoverage(comparison, 'fieldPower')
  const offenseOutrunsSurvival =
    (comparison
      ? fieldAxis >= 0.95 && (supportAxis < 0.82 || containmentAxis < 0.82)
      : context.offenseCoverage >= 0.85 && context.supportCoverage < 0.9) ||
    (context.offenseCoverage >= context.supportCoverage + 0.08 && context.supportCoverage < 0.88)

  if (offenseOutrunsSurvival) {
    return 'You lack survivability, not damage.'
  }

  if (context.highFatigueCount > 0 || context.averageFatigue >= 70) {
    return 'Fatigue is driving the casualty risk.'
  }

  if (!context.hasSurvivalSpecialist && context.supportCoverage < 0.85) {
    return 'Bring a balanced formation with stronger survival skills.'
  }

  if (currentCase.kind === 'raid' || currentCase.stage >= 4) {
    return 'Escalation pressure is amplifying casualty risk.'
  }

  if (failChance >= 0.4) {
    return 'A failed week here will cost more tempo than progress.'
  }

  return 'Formation is serviceable, but a bad result still converts into downtime.'
}

function buildGuidance(currentCase: CaseInstance, context: MissionRiskContext, deathChance: number) {
  if (!context.hasSurvivalSpecialist && context.supportCoverage < 0.85) {
    return 'Swap in a medic, containment specialist, or sturdier support operative before committing.'
  }

  if (context.highFatigueCount > 0 || context.averageFatigue >= 70) {
    return 'Rest or rotate exhausted operatives before launch.'
  }

  if (currentCase.kind === 'raid') {
    return 'Balance every assigned team. The weakest formation is where casualties start.'
  }

  if (deathChance >= 0.04) {
    return 'Only commit if you can absorb a permanent roster loss.'
  }

  return 'A balanced formation with strong containment and stabilization will cut the downtime bill.'
}

function buildReasons(
  currentCase: CaseInstance,
  failChance: number,
  context: MissionRiskContext
) {
  const reasons: string[] = []

  if (context.supportCoverage < 0.85) {
    reasons.push('Incoming damage is outpacing stabilization and containment support.')
  }

  if (!context.hasSurvivalSpecialist) {
    reasons.push('No clear survival specialist is covering medical or containment duties.')
  }

  if (context.highFatigueCount > 0) {
    reasons.push(
      `${context.highFatigueCount} operative${context.highFatigueCount === 1 ? ' is' : 's are'} already entering fatigued.`
    )
  }

  if (currentCase.kind === 'raid' || currentCase.stage >= 4) {
    reasons.push('Escalation pressure raises the odds that one failed week turns into casualties.')
  }

  if (failChance >= 0.35) {
    reasons.push('Most casualty pressure comes from the mission failing, not from raw damage alone.')
  }

  if (context.injuryDelta > 0.02 || context.deathDelta > 0.01) {
    reasons.push('Mission-specific modifiers are increasing casualty pressure.')
  }

  return reasons.slice(0, 3)
}

export function buildMissionInjuryForecast(input: {
  currentCase: CaseInstance
  agents: Agent[]
  successChance: number
  performanceSummary?: PerformanceMetricSummary
  agentPerformance?: AgentPerformanceOutput[]
  comparison?: ResolutionComparison
}): MissionInjuryForecast {
  const performanceSummary = input.performanceSummary ?? EMPTY_PERFORMANCE_SUMMARY
  const failChance = clamp(1 - input.successChance, 0, 1)
  const context = buildMissionRiskContext(
    input.currentCase,
    input.agents,
    performanceSummary,
    input.comparison
  )
  const performanceByAgentId = new Map(
    (input.agentPerformance ?? []).map((performance) => [performance.agentId, performance])
  )
  const agentRisks = input.agents.map((agent) => {
    const failureRisk = evaluateMissionAgentFailureRisk({
      currentCase: input.currentCase,
      agent,
      performance: performanceByAgentId.get(agent.id),
      performanceSummary,
      agents: input.agents,
      comparison: input.comparison,
    })
    const injuryChance = failChance * (failureRisk.minorInjuryChanceOnFailure + failureRisk.moderateInjuryChanceOnFailure)
    const deathChance = failChance * failureRisk.deathChanceOnFailure

    return {
      ...failureRisk,
      injuryChance,
      deathChance,
      expectedDowntimeWeeks: failChance * failureRisk.expectedDowntimeWeeksOnFailure,
    } satisfies AgentMissionRiskPreview
  })
  const injuryChance = clamp(
    1 - agentRisks.reduce((product, risk) => product * (1 - risk.injuryChance), 1),
    0,
    1
  )
  const deathChance = clamp(
    1 - agentRisks.reduce((product, risk) => product * (1 - risk.deathChance), 1),
    0,
    1
  )
  const expectedInjuries = agentRisks.reduce((sum, risk) => sum + risk.injuryChance, 0)
  const expectedDowntimeWeeks = agentRisks.reduce((sum, risk) => sum + risk.expectedDowntimeWeeks, 0)

  return {
    injuryChance,
    injuryRiskBand: getRiskBand(injuryChance),
    expectedInjuries: Number(expectedInjuries.toFixed(2)),
    expectedInjuryLabel: buildExpectedInjuryLabel(expectedInjuries),
    deathChance,
    deathRiskBand: getRiskBand(deathChance),
    expectedDowntimeWeeks: Number(expectedDowntimeWeeks.toFixed(2)),
    tempoLossLabel: buildTempoLossLabel(expectedDowntimeWeeks, deathChance),
    primaryWarning: buildPrimaryWarning(input.currentCase, failChance, context, input.comparison),
    guidance: buildGuidance(input.currentCase, context, deathChance),
    reasons: buildReasons(input.currentCase, failChance, context),
    supportCoverage: Number(context.supportCoverage.toFixed(2)),
    survivabilityGap: Number(context.survivabilityGap.toFixed(2)),
    agentRisks,
  }
}
