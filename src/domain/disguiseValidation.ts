import { clamp } from './math'
import type { Agent, CaseInstance, Id } from './models'
import { hasEffectiveCountermeasure } from './resistances'

const AUTHORITY_SCRUTINY_TAGS = ['public', 'media', 'court']
const PROCEDURAL_SCRUTINY_TAGS = ['witness', 'interview', 'civilian', 'court']
const HIERARCHY_READER_TAGS = ['liaison', 'negotiation']
const PROCEDURAL_READER_TAGS = ['investigator', 'forensics', 'field-kit', 'analyst']
const SOCIAL_SCRUTINY_WEIGHT_THRESHOLD = 0.55
const STAT_READ_STRONG_THRESHOLD = 55
const STAT_READ_MEANINGFUL_THRESHOLD = 45
const DETECTION_CONFIDENCE_PRESSURE_THRESHOLD = 0.45
const STRONG_VALIDATION_SCORE_THRESHOLD = 2
const ESCALATION_VALIDATION_SCORE_THRESHOLD = 1
const ESCALATION_COUNTER_PRESSURE_THRESHOLD = 1
const STRONG_VALIDATION_SCORE_ADJUSTMENT = 4.5
const MEANINGFUL_VALIDATION_SCORE_ADJUSTMENT = 2.5
const MEANINGFUL_DETECTION_CONFIDENCE_FLOOR = 0.6
const FULL_DETECTION_CONFIDENCE = 1
const PARTIAL_BEHAVIOR_SIGNAL = 0.5
const FULL_BEHAVIOR_SIGNAL = 1

export interface BehaviorWeightedDisguiseValidationContext {
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
}

export interface BehaviorWeightedDisguiseValidationResult {
  active: boolean
  level: 'none' | 'meaningful' | 'strong'
  scoreAdjustment: number
  scoreAdjustmentReason?: string
  evidenceSignals: string[]
  detectionConfidence?: number
  counterDetection: boolean
  shouldDegradeSuccessToPartial: boolean
  degradeSuccessReason?: string
}

const INACTIVE_BEHAVIOR_VALIDATION: BehaviorWeightedDisguiseValidationResult = {
  active: false,
  level: 'none',
  scoreAdjustment: 0,
  evidenceSignals: [],
  counterDetection: false,
  shouldDegradeSuccessToPartial: false,
}

function hasAnyTag(tags: readonly string[], candidates: readonly string[]) {
  return candidates.some((candidate) => tags.includes(candidate))
}

function roundTo(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function collectCaseTags(caseData: CaseInstance) {
  return [...new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])]
}

function collectObserverTags(
  agents: Agent[],
  context: BehaviorWeightedDisguiseValidationContext
) {
  return [
    ...new Set([
      ...(context.supportTags ?? []),
      ...(context.teamTags ?? []),
      ...agents.flatMap((agent) => [agent.role, ...agent.tags]),
    ]),
  ]
}

function averageStat(agents: Agent[], stat: 'social' | 'investigation') {
  if (agents.length === 0) {
    return 0
  }

  const total = agents.reduce((sum, agent) => sum + (agent.baseStats?.[stat] ?? 0), 0)
  return total / agents.length
}

function formatSignals(signals: string[]) {
  return signals.join(', ')
}

export function evaluateBehaviorWeightedDisguiseValidation(
  caseData: CaseInstance,
  agents: Agent[],
  context: BehaviorWeightedDisguiseValidationContext = {}
): BehaviorWeightedDisguiseValidationResult {
  if (caseData.hiddenState !== 'hidden' || agents.length === 0) {
    return INACTIVE_BEHAVIOR_VALIDATION
  }

  const caseTags = collectCaseTags(caseData)
  const authorityScrutiny = hasAnyTag(caseTags, AUTHORITY_SCRUTINY_TAGS)
  const proceduralScrutiny = hasAnyTag(caseTags, PROCEDURAL_SCRUTINY_TAGS)
  const silenceScrutiny =
    authorityScrutiny || caseData.weights.social >= SOCIAL_SCRUTINY_WEIGHT_THRESHOLD

  if (!authorityScrutiny && !proceduralScrutiny && !silenceScrutiny) {
    return INACTIVE_BEHAVIOR_VALIDATION
  }

  const observerTags = collectObserverTags(agents, context)
  const averageSocial = averageStat(agents, 'social')
  const averageInvestigation = averageStat(agents, 'investigation')
  const evidenceSignals: string[] = []
  let validationScore = 0

  const hierarchyRead = hasAnyTag(observerTags, HIERARCHY_READER_TAGS)
    ? FULL_BEHAVIOR_SIGNAL
    : 0
  const silenceRead =
    averageSocial >= STAT_READ_STRONG_THRESHOLD
      ? FULL_BEHAVIOR_SIGNAL
      : averageSocial >= STAT_READ_MEANINGFUL_THRESHOLD
        ? PARTIAL_BEHAVIOR_SIGNAL
        : 0
  const procedureRead = hasAnyTag(observerTags, PROCEDURAL_READER_TAGS)
    ? FULL_BEHAVIOR_SIGNAL
    : averageInvestigation >= STAT_READ_STRONG_THRESHOLD
      ? FULL_BEHAVIOR_SIGNAL
      : averageInvestigation >= STAT_READ_MEANINGFUL_THRESHOLD
        ? PARTIAL_BEHAVIOR_SIGNAL
        : 0

  if (authorityScrutiny && hierarchyRead > 0) {
    validationScore += hierarchyRead
    evidenceSignals.push('hierarchy fit')
  }

  if (silenceScrutiny && silenceRead > 0) {
    validationScore += silenceRead
    evidenceSignals.push('silence')
  }

  if (proceduralScrutiny && procedureRead > 0) {
    validationScore += procedureRead
    evidenceSignals.push('procedural compliance')
  }

  const priorDetectionConfidence =
    typeof caseData.detectionConfidence === 'number'
      ? clamp(caseData.detectionConfidence, 0, 1)
      : 0
  const counterDetectionPressure =
    (caseData.counterDetection ? 1 : 0) +
    (priorDetectionConfidence >= DETECTION_CONFIDENCE_PRESSURE_THRESHOLD ? 1 : 0) +
    (hasEffectiveCountermeasure({ family: 'deception', presentTags: observerTags }) ? 0.5 : 0)

  if (validationScore < ESCALATION_VALIDATION_SCORE_THRESHOLD) {
    return {
      ...INACTIVE_BEHAVIOR_VALIDATION,
      active: true,
      evidenceSignals,
    }
  }

  const level =
    validationScore >= STRONG_VALIDATION_SCORE_THRESHOLD ||
    (validationScore >= ESCALATION_VALIDATION_SCORE_THRESHOLD &&
      counterDetectionPressure >= ESCALATION_COUNTER_PRESSURE_THRESHOLD)
      ? 'strong'
      : 'meaningful'
  const scoreAdjustment =
    level === 'strong'
      ? STRONG_VALIDATION_SCORE_ADJUSTMENT
      : MEANINGFUL_VALIDATION_SCORE_ADJUSTMENT
  const scoreAdjustmentReason = `Behavior validation: +${scoreAdjustment.toFixed(1)} (${formatSignals(evidenceSignals)})`
  const detectionConfidence =
    level === 'strong'
      ? FULL_DETECTION_CONFIDENCE
      : Math.max(priorDetectionConfidence, MEANINGFUL_DETECTION_CONFIDENCE_FLOOR)

  return {
    active: true,
    level,
    scoreAdjustment: roundTo(scoreAdjustment),
    scoreAdjustmentReason,
    evidenceSignals,
    detectionConfidence,
    counterDetection: level === 'strong' || caseData.counterDetection === true,
    shouldDegradeSuccessToPartial: level === 'strong' && authorityScrutiny,
    degradeSuccessReason:
      level === 'strong' && authorityScrutiny
        ? 'Behavior mismatch triggered visible authority scrutiny and prevented a clean resolution.'
        : undefined,
  }
}

export function applyBehaviorWeightedDisguiseValidationToCase(
  caseData: CaseInstance,
  validation: BehaviorWeightedDisguiseValidationResult | undefined
): CaseInstance {
  if (!validation?.active || validation.level === 'none') {
    return caseData
  }

  const nextDetectionConfidence =
    typeof validation.detectionConfidence === 'number'
      ? clamp(
          Math.max(caseData.detectionConfidence ?? 0, validation.detectionConfidence),
          0,
          1
        )
      : caseData.detectionConfidence

  return {
    ...caseData,
    ...(typeof nextDetectionConfidence === 'number'
      ? { detectionConfidence: nextDetectionConfidence }
      : {}),
    ...(validation.counterDetection ? { counterDetection: true } : {}),
  }
}
