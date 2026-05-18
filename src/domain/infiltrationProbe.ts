/**
 * SPE-521 slice 1: deterministic infiltration probe and awareness tracks.
 * Progress and awareness advance independently; thresholds emit complications before hard failure.
 */

import { clamp } from './math'
import type { CaseInstance } from './models'

export type InfiltrationStage = 'probing' | 'exposed' | 'violent'

export type InfiltrationProbeAction = 'probe_access' | 'probe_route' | 'cleanup'

export interface InfiltrationProbeState {
  probeProgress: number
  awareness: number
  stage: InfiltrationStage
}

export type InfiltrationThresholdEventKind =
  | 'awareness_complication'
  | 'escalation_exposed'
  | 'escalation_violent'

export interface InfiltrationThresholdEvent {
  kind: InfiltrationThresholdEventKind
  summary: string
}

export interface InfiltrationProbeEvaluation {
  nextState: InfiltrationProbeState
  events: readonly InfiltrationThresholdEvent[]
}

export interface WeeklyInfiltrationProbeResult {
  case: CaseInstance
  events: readonly InfiltrationThresholdEvent[]
  changed: boolean
}

/** Case tags that participate in uniform-style infiltration probing. */
export const INFILTRATION_PROBE_TAGS = ['infiltration', 'disguise', 'covert'] as const

export const AWARENESS_COMPLICATION_THRESHOLD = 0.55
export const VIOLENT_ESCALATION_THRESHOLD = 0.8
const EXPOSED_DETECTION_CONFIDENCE = 0.55
const VIOLENT_DETECTION_CONFIDENCE = 0.75

const ACTION_DELTAS: Record<
  InfiltrationProbeAction,
  { probeProgress: number; awareness: number }
> = {
  probe_access: { probeProgress: 0.15, awareness: 0.12 },
  probe_route: { probeProgress: 0.1, awareness: 0.18 },
  cleanup: { probeProgress: 0.02, awareness: -0.15 },
}

export function hasInfiltrationProbeTag(caseData: CaseInstance) {
  return INFILTRATION_PROBE_TAGS.some(
    (tag) =>
      caseData.tags.includes(tag) ||
      caseData.requiredTags.includes(tag) ||
      caseData.preferredTags.includes(tag)
  )
}

/** Counter-detection pressure contribution from infiltration tracks for disguise validation. */
export function getInfiltrationStagePressure(
  caseData: CaseInstance,
  infiltrationAwareness: number
) {
  if (caseData.infiltrationStage === 'violent') {
    return 1
  }

  if (caseData.infiltrationStage === 'exposed') {
    return 0.5
  }

  return infiltrationAwareness >= AWARENESS_COMPLICATION_THRESHOLD ? 0.5 : 0
}

export function isInfiltrationProbeEligible(caseData: CaseInstance) {
  return caseData.hiddenState === 'hidden' && hasInfiltrationProbeTag(caseData)
}

export function readInfiltrationProbeState(caseData: CaseInstance): InfiltrationProbeState {
  return {
    probeProgress: clamp(caseData.infiltrationProbeProgress ?? 0, 0, 1),
    awareness: clamp(caseData.infiltrationAwareness ?? 0, 0, 1),
    stage: caseData.infiltrationStage ?? 'probing',
  }
}

function roundBand(value: number) {
  return Math.round(value * 1000) / 1000
}

/**
 * Applies one infiltration action to probe/awareness tracks and returns threshold events.
 */
export function evaluateInfiltrationProbe(
  state: InfiltrationProbeState,
  action: InfiltrationProbeAction
): InfiltrationProbeEvaluation {
  const events: InfiltrationThresholdEvent[] = []
  const priorAwareness = state.awareness
  const priorStage = state.stage
  const delta = ACTION_DELTAS[action]

  const probeProgress = roundBand(clamp(state.probeProgress + delta.probeProgress, 0, 1))
  const awareness = roundBand(clamp(state.awareness + delta.awareness, 0, 1))
  let stage = state.stage

  if (
    awareness >= AWARENESS_COMPLICATION_THRESHOLD &&
    priorAwareness < AWARENESS_COMPLICATION_THRESHOLD
  ) {
    events.push({
      kind: 'awareness_complication',
      summary:
        'Site awareness crossed the complication band; patrol focus or staff challenges may intensify without ending the operation.',
    })
    if (stage === 'probing') {
      stage = 'exposed'
      events.push({
        kind: 'escalation_exposed',
        summary:
          'Cover strain is visible to local observers; behavior scrutiny and detection pressure increase.',
      })
    }
  }

  if (awareness >= VIOLENT_ESCALATION_THRESHOLD && priorStage !== 'violent') {
    stage = 'violent'
    events.push({
      kind: 'escalation_violent',
      summary:
        'Infiltrator shifted from probing to overt violence or emergency escape as discovery risk spiked.',
    })
  }

  return {
    nextState: { probeProgress, awareness, stage },
    events,
  }
}

export function mergeInfiltrationProbeStateIntoCase(
  caseData: CaseInstance,
  nextState: InfiltrationProbeState
): CaseInstance {
  let detectionConfidence = caseData.detectionConfidence
  let counterDetection = caseData.counterDetection ?? false

  if (nextState.stage === 'exposed') {
    detectionConfidence = Math.max(detectionConfidence ?? 0.25, EXPOSED_DETECTION_CONFIDENCE)
  }

  if (nextState.stage === 'violent') {
    detectionConfidence = Math.max(detectionConfidence ?? 0.25, VIOLENT_DETECTION_CONFIDENCE)
    counterDetection = true
  }

  return {
    ...caseData,
    infiltrationProbeProgress: nextState.probeProgress,
    infiltrationAwareness: nextState.awareness,
    infiltrationStage: nextState.stage,
    ...(typeof detectionConfidence === 'number' ? { detectionConfidence } : {}),
    counterDetection,
  }
}

/**
 * One weekly probe tick for assigned in-progress covert cases (defaults to access probing).
 */
export function applyWeeklyInfiltrationProbeTick(
  caseData: CaseInstance,
  _week: number,
  action: InfiltrationProbeAction = 'probe_access'
): WeeklyInfiltrationProbeResult {
  if (!isInfiltrationProbeEligible(caseData)) {
    return { case: caseData, events: [], changed: false }
  }

  const current = readInfiltrationProbeState(caseData)
  const evaluation = evaluateInfiltrationProbe(current, action)
  const merged = mergeInfiltrationProbeStateIntoCase(caseData, evaluation.nextState)
  const changed =
    merged.infiltrationProbeProgress !== caseData.infiltrationProbeProgress ||
    merged.infiltrationAwareness !== caseData.infiltrationAwareness ||
    merged.infiltrationStage !== caseData.infiltrationStage ||
    merged.detectionConfidence !== caseData.detectionConfidence ||
    merged.counterDetection !== caseData.counterDetection

  return {
    case: merged,
    events: evaluation.events,
    changed,
  }
}

export function getInfiltrationAwarenessPressure(caseData: CaseInstance) {
  if (!isInfiltrationProbeEligible(caseData) && caseData.infiltrationAwareness === undefined) {
    return 0
  }

  return clamp(caseData.infiltrationAwareness ?? 0, 0, 1)
}
