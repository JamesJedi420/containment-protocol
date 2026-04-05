import { evaluateAgentBreakdown, type EvaluateAgentContext } from './evaluateAgent'
import type { Agent, StatDomain } from './models'
import { domainAverage, getRoleDomainWeights } from './statDomains'

export type TacticalAssessmentSeverity = 'positive' | 'warning' | 'neutral'

export interface TacticalAssessment {
  id: string
  severity: TacticalAssessmentSeverity
  message: string
  emphasisDomain?: StatDomain
}

export type TacticalAssessmentContext = EvaluateAgentContext

export interface AssessmentEngine {
  evaluate(agent: Agent, context?: TacticalAssessmentContext): string[]
}

const LOW_DOMAIN_THRESHOLD = 45
const HIGH_DOMAIN_THRESHOLD = 65
const STRONG_DOMAIN_THRESHOLD = 72
const HIGH_STRESS_IMPACT_THRESHOLD = 16
const HIGH_FATIGUE_THRESHOLD = 45
const LONG_ASSIGNMENT_THRESHOLD = 3

const PRIMARY_DOMAIN_WARNING_BY_DOMAIN: Record<StatDomain, string> = {
  field: 'Field score is low for a frontline operative.',
  resilience: 'Resilience profile is low for sustained deployments.',
  control: 'Control profile is weak for containment tasks.',
  insight: 'Insight profile is weak for investigative work.',
  presence: 'Presence profile is weak for witness handling and command pressure.',
  anomaly: 'Anomaly profile is weak for supernatural exposure tasks.',
}

function pushAssessment(assessments: TacticalAssessment[], nextAssessment: TacticalAssessment) {
  if (assessments.some((assessment) => assessment.id === nextAssessment.id)) {
    return
  }

  assessments.push(nextAssessment)
}

function getPrimaryRoleDomain(agent: Agent): StatDomain {
  const weights = getRoleDomainWeights(agent.role)

  return (
    (Object.entries(weights) as [StatDomain, number][]).sort(
      (left, right) => right[1] - left[1]
    )[0]?.[0] ?? 'insight'
  )
}

export function evaluateTacticalAssessments(
  agent: Agent,
  context: TacticalAssessmentContext = {}
): TacticalAssessment[] {
  const breakdown = evaluateAgentBreakdown(agent, context)
  const domainValues: Record<StatDomain, number> = {
    field: domainAverage(breakdown.effectiveStats, 'field'),
    resilience: domainAverage(breakdown.effectiveStats, 'resilience'),
    control: domainAverage(breakdown.effectiveStats, 'control'),
    insight: domainAverage(breakdown.effectiveStats, 'insight'),
    presence: domainAverage(breakdown.effectiveStats, 'presence'),
    anomaly: domainAverage(breakdown.effectiveStats, 'anomaly'),
  }
  const assessments: TacticalAssessment[] = []
  const primaryDomain = getPrimaryRoleDomain(agent)

  if (domainValues[primaryDomain] < LOW_DOMAIN_THRESHOLD) {
    pushAssessment(assessments, {
      id: `primary-domain-gap-${primaryDomain}`,
      severity: 'warning',
      emphasisDomain: primaryDomain,
      message: PRIMARY_DOMAIN_WARNING_BY_DOMAIN[primaryDomain],
    })
  }

  if (
    domainValues.insight >= HIGH_DOMAIN_THRESHOLD &&
    domainValues.resilience < LOW_DOMAIN_THRESHOLD
  ) {
    pushAssessment(assessments, {
      id: 'insight-over-resilience',
      severity: 'warning',
      emphasisDomain: 'insight',
      message: 'High Insight but poor Resilience. Better suited for short investigations.',
    })
  }

  if (domainValues.control >= HIGH_DOMAIN_THRESHOLD) {
    pushAssessment(assessments, {
      id: 'control-containment-strength',
      severity: 'positive',
      emphasisDomain: 'control',
      message: 'Control profile is strong for containment tasks.',
    })
  }

  if (
    domainValues.field >= HIGH_DOMAIN_THRESHOLD &&
    domainValues.resilience >= HIGH_DOMAIN_THRESHOLD
  ) {
    pushAssessment(assessments, {
      id: 'field-resilience-deployment',
      severity: 'positive',
      emphasisDomain: 'field',
      message: 'Field and Resilience profiles support sustained frontline deployments.',
    })
  }

  if (
    domainValues.presence >= HIGH_DOMAIN_THRESHOLD &&
    domainValues.insight >= LOW_DOMAIN_THRESHOLD
  ) {
    pushAssessment(assessments, {
      id: 'presence-interviews',
      severity: 'positive',
      emphasisDomain: 'presence',
      message:
        'Presence profile is well suited to witness handling, interviews, and field leadership.',
    })
  }

  if (
    domainValues.anomaly >= HIGH_DOMAIN_THRESHOLD &&
    domainValues.resilience >= LOW_DOMAIN_THRESHOLD
  ) {
    pushAssessment(assessments, {
      id: 'anomaly-exposure-readiness',
      severity: 'positive',
      emphasisDomain: 'anomaly',
      message: 'Anomaly profile is stable enough for supernatural exposure work.',
    })
  }

  if (agent.fatigue >= HIGH_FATIGUE_THRESHOLD) {
    pushAssessment(assessments, {
      id: 'fatigue-warning',
      severity: 'warning',
      message: 'Current fatigue is suppressing output. Rotate before long assignments.',
    })
  } else if (breakdown.performance.stressImpact >= HIGH_STRESS_IMPACT_THRESHOLD) {
    pushAssessment(assessments, {
      id: 'stress-load-warning',
      severity: 'warning',
      emphasisDomain: 'resilience',
      message: 'Stress load is high relative to Resilience. Better suited for short operations.',
    })
  }

  if (
    context.caseData &&
    context.caseData.durationWeeks >= LONG_ASSIGNMENT_THRESHOLD &&
    domainValues.resilience < HIGH_DOMAIN_THRESHOLD
  ) {
    pushAssessment(assessments, {
      id: 'long-case-resilience',
      severity: 'warning',
      emphasisDomain: 'resilience',
      message: 'Resilience profile is light for a long assignment. Expect rising stress over time.',
    })
  }

  if (assessments.length === 0 && breakdown.score >= STRONG_DOMAIN_THRESHOLD) {
    pushAssessment(assessments, {
      id: 'balanced-generalist',
      severity: 'neutral',
      message: 'Balanced build with no immediate tactical red flags.',
    })
  }

  return assessments.slice(0, 4)
}

export const TACTICAL_ASSESSMENT_ENGINE: AssessmentEngine = {
  evaluate(agent, context = {}) {
    return evaluateTacticalAssessments(agent, context).map((assessment) => assessment.message)
  },
}
