import { clamp } from './math'
import type { Agent, CaseInstance, Id } from './models'
import { hasEffectiveCountermeasure } from './resistances'

const AUTHORITY_SCRUTINY_TAGS = ['public', 'media', 'court']
const PROCEDURAL_SCRUTINY_TAGS = ['witness', 'interview', 'civilian', 'court']
const HIERARCHY_READER_TAGS = ['liaison', 'negotiation']
const PROCEDURAL_READER_TAGS = ['investigator', 'forensics', 'field-kit', 'analyst']

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
  const silenceScrutiny = authorityScrutiny || caseData.weights.social >= 0.55

  if (!authorityScrutiny && !proceduralScrutiny && !silenceScrutiny) {
    return INACTIVE_BEHAVIOR_VALIDATION
  }

  const observerTags = collectObserverTags(agents, context)
  const averageSocial = averageStat(agents, 'social')
  const averageInvestigation = averageStat(agents, 'investigation')
  const evidenceSignals: string[] = []
  let validationScore = 0

  const hierarchyRead = hasAnyTag(observerTags, HIERARCHY_READER_TAGS) ? 1 : 0
  const silenceRead = averageSocial >= 55 ? 1 : averageSocial >= 45 ? 0.5 : 0
  const procedureRead = hasAnyTag(observerTags, PROCEDURAL_READER_TAGS)
    ? 1
    : averageInvestigation >= 55
      ? 1
      : averageInvestigation >= 45
        ? 0.5
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
    (priorDetectionConfidence >= 0.45 ? 1 : 0) +
    (hasEffectiveCountermeasure({ family: 'deception', presentTags: observerTags }) ? 0.5 : 0)

  if (validationScore < 1) {
    return {
      ...INACTIVE_BEHAVIOR_VALIDATION,
      active: true,
      evidenceSignals,
    }
  }

  const level =
    validationScore >= 2 || (validationScore >= 1 && counterDetectionPressure >= 1)
      ? 'strong'
      : 'meaningful'
  const scoreAdjustment = level === 'strong' ? 4.5 : 2.5
  const scoreAdjustmentReason = `Behavior validation: +${scoreAdjustment.toFixed(1)} (${formatSignals(evidenceSignals)})`
  const detectionConfidence =
    level === 'strong'
      ? 1
      : Math.max(priorDetectionConfidence, 0.6)

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
