import { buildCompetencyProfileFromAgent, meetsCertificationGate } from './competencyFramework'
import { getAgentAvailabilityState } from './deploymentReadiness'
import { buildAgentLoadoutReadinessSummary } from './equipment'
import { clamp } from './math'
import { RESPONDER_DUTY_CALIBRATION } from './sim/calibration'
import type { Agent, AgentAvailabilityState, GameState } from './models'

export type ResponderContextTag =
  | 'ritual'
  | 'close_combat'
  | 'escort'
  | 'containment_breach'
  | 'blackout'
  | 'indirect_visual_threat'

export interface ResponderEvaluationInput {
  agent: Agent
  missionRequiredTags?: string[]
  contextTags: ResponderContextTag[]
  visibleThreat: boolean
  threatReachable: boolean
  state?: Pick<GameState, 'researchState'>
}

export interface DutyStateEvaluation {
  availabilityState: AgentAvailabilityState
  route: 'deploy' | 'hold' | 'blocked'
  hardBlocked: boolean
  reasons: string[]
}

export interface EffectiveReadinessEvaluation {
  score: number
  certificationAllowed: boolean
  gearReadiness: 'ready' | 'partial' | 'blocked'
  conditionScore: number
  components: {
    certification: number
    gear: number
    condition: number
  }
  reasons: string[]
}

export interface SpecializationFitEvaluation {
  fit: 'fit' | 'mismatch'
  readinessModifier: number
  reasons: string[]
}

export interface PerceivedDangerEvaluation {
  panicRisk: number
  procedureBreakRisk: number
  reasons: string[]
}

export interface ResponderDeploymentEvaluationResult {
  route: 'deploy' | 'hold' | 'blocked'
  duty: DutyStateEvaluation
  readiness: EffectiveReadinessEvaluation
  specialization: SpecializationFitEvaluation
  perceivedDanger: PerceivedDangerEvaluation
  effectiveOutputScore: number
  reasons: string[]
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function getCertificationIdsFromTags(tags: string[]) {
  return tags
    .filter((tag) => tag.startsWith('cert:'))
    .map((tag) => tag.slice(5))
    .filter((id) => id.length > 0)
}

function getRoleSpecializationContexts(role: Agent['role']): ResponderContextTag[] {
  switch (role) {
    case 'hunter':
      return ['close_combat', 'containment_breach']
    case 'occultist':
    case 'medium':
      return ['ritual', 'containment_breach']
    case 'medic':
      return ['escort', 'containment_breach']
    case 'field_recon':
      return ['escort', 'indirect_visual_threat']
    case 'tech':
      return ['blackout', 'containment_breach']
    case 'negotiator':
      return ['escort', 'indirect_visual_threat']
    case 'investigator':
      return ['indirect_visual_threat', 'ritual']
    default:
      return ['containment_breach']
  }
}

/**
 * Duty-state routing branch resolver.
 * Keeps behavior compact: unavailable/training/recovering hard-block; assigned holds;
 * idle can deploy.
 */
export function evaluateResponderDutyState(agent: Agent): DutyStateEvaluation {
  const availabilityState = getAgentAvailabilityState(agent)

  switch (availabilityState) {
    case 'unavailable':
      return {
        availabilityState,
        route: 'blocked',
        hardBlocked: true,
        reasons: ['duty-state:unavailable'],
      }
    case 'training':
      return {
        availabilityState,
        route: 'blocked',
        hardBlocked: true,
        reasons: ['duty-state:training'],
      }
    case 'recovering':
      return {
        availabilityState,
        route: 'blocked',
        hardBlocked: true,
        reasons: ['duty-state:recovering'],
      }
    case 'assigned':
      return {
        availabilityState,
        route: 'hold',
        hardBlocked: false,
        reasons: ['duty-state:assigned'],
      }
    case 'idle':
    default:
      return {
        availabilityState,
        route: 'deploy',
        hardBlocked: false,
        reasons: ['duty-state:idle'],
      }
  }
}

/**
 * Effective-readiness composition from certification + gear + condition.
 */
export function computeEffectiveReadiness(input: ResponderEvaluationInput): EffectiveReadinessEvaluation {
  const { agent, missionRequiredTags = [], state } = input

  const requiredCertIds = getCertificationIdsFromTags(missionRequiredTags)
  const certGate = meetsCertificationGate(agent, requiredCertIds)
  const certScore = requiredCertIds.length === 0 ? 100 : certGate.allowed ? 100 : 0

  const loadout = buildAgentLoadoutReadinessSummary(agent, { state })
  const gearScore =
    loadout.readiness === 'ready'
      ? 100
      : loadout.readiness === 'partial'
        ? 65
        : 20

  const fatiguePenalty = Math.round(clamp(agent.fatigue, 0, 100) * RESPONDER_DUTY_CALIBRATION.fatiguePenaltyWeight)
  const statusPenalty =
    agent.status === 'injured'
      ? RESPONDER_DUTY_CALIBRATION.injuredPenalty
      : agent.status === 'recovering'
        ? RESPONDER_DUTY_CALIBRATION.recoveringPenalty
        : 0
  const assignmentPenalty =
    agent.assignment?.state === 'training'
      ? RESPONDER_DUTY_CALIBRATION.trainingPenalty
      : agent.assignment?.state === 'recovery'
        ? RESPONDER_DUTY_CALIBRATION.recoveringPenalty
        : 0

  const conditionScore = clamp(100 - fatiguePenalty - statusPenalty - assignmentPenalty, 0, 100)

  const weighted =
    certScore * RESPONDER_DUTY_CALIBRATION.readinessWeights.certification +
    gearScore * RESPONDER_DUTY_CALIBRATION.readinessWeights.gear +
    conditionScore * RESPONDER_DUTY_CALIBRATION.readinessWeights.condition

  const reasons: string[] = [
    `certification:${certScore}`,
    `gear:${gearScore}:${loadout.readiness}`,
    `condition:${conditionScore}`,
  ]

  if (!certGate.allowed) {
    reasons.push(`missing-certifications:${certGate.missingCertifications.join(',')}`)
  }

  return {
    score: Math.round(weighted),
    certificationAllowed: certGate.allowed,
    gearReadiness: loadout.readiness,
    conditionScore,
    components: {
      certification: certScore,
      gear: gearScore,
      condition: conditionScore,
    },
    reasons,
  }
}

/**
 * Lightweight specialization-fit evaluation from role/context assumptions.
 */
export function evaluateSpecializationFit(
  agent: Agent,
  contextTags: ResponderContextTag[]
): SpecializationFitEvaluation {
  const preferred = getRoleSpecializationContexts(agent.role)
  const hasFit = contextTags.some((tag) => preferred.includes(tag))

  if (hasFit) {
    return {
      fit: 'fit',
      readinessModifier: RESPONDER_DUTY_CALIBRATION.fitReadinessBonus,
      reasons: [`specialization-fit:${agent.role}`],
    }
  }

  return {
    fit: 'mismatch',
    readinessModifier: -RESPONDER_DUTY_CALIBRATION.mismatchReadinessPenalty,
    reasons: [`specialization-mismatch:${agent.role}`],
  }
}

/**
 * Bounded perceived-danger branch: visible but unreachable threat still raises panic/procedure-break risk.
 */
export function evaluatePerceivedDangerRisk(input: ResponderEvaluationInput): PerceivedDangerEvaluation {
  const { agent, visibleThreat, threatReachable, contextTags } = input

  const competency = buildCompetencyProfileFromAgent(agent)
  const responseBuffer = competency.scores.response
  const socialBuffer = competency.scores.social
  const fatigueFactor = clamp(agent.fatigue, 0, 100)

  const visibleIndirectBranch = visibleThreat && !threatReachable
  const base = visibleIndirectBranch
    ? RESPONDER_DUTY_CALIBRATION.visibleIndirectPanicBase
    : visibleThreat
      ? RESPONDER_DUTY_CALIBRATION.visibleReachablePanicBase
      : 5

  const blackoutPenalty = contextTags.includes('blackout')
    ? RESPONDER_DUTY_CALIBRATION.blackoutPanicPenalty
    : 0

  const panicRisk = clamp(
    Math.round(base + fatigueFactor * 0.35 + blackoutPenalty - responseBuffer * 0.25),
    0,
    100
  )

  const procedureBreakRisk = clamp(
    Math.round(panicRisk * 0.8 + fatigueFactor * 0.15 - socialBuffer * 0.2),
    0,
    100
  )

  const reasons: string[] = [
    visibleIndirectBranch ? 'perceived-danger:visible-unreachable' : 'perceived-danger:default',
    `panic=${panicRisk}`,
    `procedure-break=${procedureBreakRisk}`,
  ]

  return {
    panicRisk,
    procedureBreakRisk,
    reasons,
  }
}

/**
 * Top-level deterministic responder deployment evaluator.
 */
export function evaluateResponderForDeployment(
  input: ResponderEvaluationInput
): ResponderDeploymentEvaluationResult {
  const duty = evaluateResponderDutyState(input.agent)
  const readiness = computeEffectiveReadiness(input)
  const specialization = evaluateSpecializationFit(input.agent, input.contextTags)
  const perceivedDanger = evaluatePerceivedDangerRisk(input)

  const competency = buildCompetencyProfileFromAgent(input.agent)
  const competencyContribution = Math.round(competency.scores.response * 0.2)

  const effectiveOutputScore = clamp(
    Math.round(
      readiness.score + specialization.readinessModifier + competencyContribution - perceivedDanger.procedureBreakRisk * 0.25
    ),
    0,
    100
  )

  let route: ResponderDeploymentEvaluationResult['route'] = 'deploy'
  const reasons: string[] = []

  if (duty.hardBlocked) {
    route = 'blocked'
    reasons.push(...duty.reasons)
  }

  if (route !== 'blocked' && !readiness.certificationAllowed) {
    route = 'blocked'
    reasons.push('blocked:missing-certification')
  }

  if (route !== 'blocked' && readiness.gearReadiness === 'blocked') {
    route = 'blocked'
    reasons.push('blocked:gear-readiness')
  }

  if (route !== 'blocked' && duty.route === 'hold') {
    route = 'hold'
    reasons.push(...duty.reasons)
  }

  if (route === 'deploy' && effectiveOutputScore < RESPONDER_DUTY_CALIBRATION.minimumDeployScore) {
    route = 'hold'
    reasons.push('hold:insufficient-effective-output')
  }

  if (
    route === 'deploy' &&
    perceivedDanger.panicRisk >= RESPONDER_DUTY_CALIBRATION.panicHoldThreshold
  ) {
    route = 'hold'
    reasons.push('hold:panic-risk-threshold')
  }

  return {
    route,
    duty,
    readiness,
    specialization,
    perceivedDanger,
    effectiveOutputScore,
    reasons: unique([
      ...reasons,
      ...readiness.reasons,
      ...specialization.reasons,
      ...perceivedDanger.reasons,
    ]),
  }
}
