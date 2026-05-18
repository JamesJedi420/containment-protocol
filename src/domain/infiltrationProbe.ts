/**
 * SPE-521 slice 1: deterministic infiltration probe and awareness tracks.
 * Progress and awareness advance independently; thresholds emit complications before hard failure.
 */

import { applyWeeklyInfiltrationCoverPostureToCase } from './infiltrationCover'
import { clamp } from './math'
import type { CaseInstance } from './models'

export type InfiltrationStage = 'probing' | 'exposed' | 'violent'

export type InfiltrationProbeAction = 'probe_access' | 'probe_route' | 'cleanup'

const INFILTRATION_PROBE_ACTIONS: readonly InfiltrationProbeAction[] = [
  'probe_access',
  'probe_route',
  'cleanup',
]

export function isInfiltrationProbeAction(value: string): value is InfiltrationProbeAction {
  return (INFILTRATION_PROBE_ACTIONS as readonly string[]).includes(value)
}

export interface InfiltrationProbeProgressActionRule {
  readonly belowProbeProgress: number
  readonly action: InfiltrationProbeAction
}

export interface InfiltrationProbePlan {
  readonly defaultAction?: InfiltrationProbeAction
  /** First rule where current probe progress is strictly below `belowProbeProgress` (rules sorted ascending). */
  readonly actionWhenProbeProgressBelow?: readonly InfiltrationProbeProgressActionRule[]
  readonly cleanupWhenAwarenessAtLeast?: number
}

export function copyInfiltrationProbePlan(
  plan: InfiltrationProbePlan | undefined
): InfiltrationProbePlan | undefined {
  if (plan === undefined) {
    return undefined
  }

  return {
    ...plan,
    actionWhenProbeProgressBelow: plan.actionWhenProbeProgressBelow
      ? [...plan.actionWhenProbeProgressBelow]
      : undefined,
  }
}

export interface InfiltrationProbeState {
  probeProgress: number
  awareness: number
  stage: InfiltrationStage
}

export type InfiltrationThresholdEventKind =
  | 'awareness_complication'
  | 'escalation_exposed'
  | 'escalation_violent'
  | 'cover_strain'

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

function collectCaseTags(caseData: CaseInstance): Set<string> {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

export function hasInfiltrationProbeTag(caseData: CaseInstance) {
  const caseTags = collectCaseTags(caseData)
  return INFILTRATION_PROBE_TAGS.some((tag) => caseTags.has(tag))
}

const ROUTE_PROBE_TAGS = ['logistics', 'relay', 'supply-chain', 'cyber', 'parade', 'market'] as const
const CLEANUP_PROBE_TAGS = ['media', 'court', 'public', 'interview', 'civilian'] as const
const TAG_HEURISTIC_CLEANUP_AWARENESS = AWARENESS_COMPLICATION_THRESHOLD

function matchesAnyTag(caseTags: Set<string>, candidates: readonly string[]) {
  return candidates.some((tag) => caseTags.has(tag))
}

function resolveProgressRuleAction(
  probeProgress: number,
  rules: readonly InfiltrationProbeProgressActionRule[]
): InfiltrationProbeAction | undefined {
  for (const rule of rules) {
    if (probeProgress < rule.belowProbeProgress) {
      return rule.action
    }
  }

  return undefined
}

/**
 * Deterministic weekly probe action: authored plan → progress rules → tag heuristics → default.
 */
export function resolveWeeklyInfiltrationProbeAction(caseData: CaseInstance): InfiltrationProbeAction {
  const state = readInfiltrationProbeState(caseData)
  const plan = caseData.infiltrationProbePlan
  const caseTags = collectCaseTags(caseData)

  if (plan?.cleanupWhenAwarenessAtLeast !== undefined) {
    if (state.awareness >= plan.cleanupWhenAwarenessAtLeast) {
      return 'cleanup'
    }
  }

  if (plan?.actionWhenProbeProgressBelow !== undefined) {
    const ruled = resolveProgressRuleAction(state.probeProgress, plan.actionWhenProbeProgressBelow)
    if (ruled !== undefined) {
      return ruled
    }
  }

  if (plan?.defaultAction !== undefined) {
    return plan.defaultAction
  }

  if (
    matchesAnyTag(caseTags, CLEANUP_PROBE_TAGS) &&
    state.awareness >= TAG_HEURISTIC_CLEANUP_AWARENESS
  ) {
    return 'cleanup'
  }

  if (matchesAnyTag(caseTags, ROUTE_PROBE_TAGS)) {
    return 'probe_route'
  }

  return 'probe_access'
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

/** Resolves infiltration stage after an awareness change (probe actions or cover posture). */
export function resolveInfiltrationStageAfterAwareness(
  priorStage: InfiltrationStage,
  priorAwareness: number,
  nextAwareness: number
): InfiltrationStage {
  let stage = priorStage

  if (
    nextAwareness >= AWARENESS_COMPLICATION_THRESHOLD &&
    priorAwareness < AWARENESS_COMPLICATION_THRESHOLD &&
    stage === 'probing'
  ) {
    stage = 'exposed'
  }

  if (nextAwareness >= VIOLENT_ESCALATION_THRESHOLD && priorStage !== 'violent') {
    stage = 'violent'
  }

  return stage
}

/** Emits threshold events when awareness or stage cross configured bands. */
export function resolveInfiltrationThresholdEvents(
  priorState: InfiltrationProbeState,
  nextState: InfiltrationProbeState
): InfiltrationThresholdEvent[] {
  const events: InfiltrationThresholdEvent[] = []
  const priorAwareness = priorState.awareness
  const priorStage = priorState.stage
  const { awareness, stage } = nextState

  if (
    awareness >= AWARENESS_COMPLICATION_THRESHOLD &&
    priorAwareness < AWARENESS_COMPLICATION_THRESHOLD
  ) {
    events.push({
      kind: 'awareness_complication',
      summary:
        'Site awareness crossed the complication band; patrol focus or staff challenges may intensify without ending the operation.',
    })
    if (stage === 'exposed' && priorStage === 'probing') {
      events.push({
        kind: 'escalation_exposed',
        summary:
          'Cover strain is visible to local observers; behavior scrutiny and detection pressure increase.',
      })
    }
  }

  if (awareness >= VIOLENT_ESCALATION_THRESHOLD && priorStage !== 'violent' && stage === 'violent') {
    events.push({
      kind: 'escalation_violent',
      summary:
        'Infiltrator shifted from probing to overt violence or emergency escape as discovery risk spiked.',
    })
  }

  return events
}

/**
 * Applies one infiltration action to probe/awareness tracks and returns threshold events.
 */
export function evaluateInfiltrationProbe(
  state: InfiltrationProbeState,
  action: InfiltrationProbeAction
): InfiltrationProbeEvaluation {
  const delta = ACTION_DELTAS[action]
  const probeProgress = roundBand(clamp(state.probeProgress + delta.probeProgress, 0, 1))
  const awareness = roundBand(clamp(state.awareness + delta.awareness, 0, 1))
  const stage = resolveInfiltrationStageAfterAwareness(state.stage, state.awareness, awareness)
  const nextState: InfiltrationProbeState = { probeProgress, awareness, stage }

  return {
    nextState,
    events: resolveInfiltrationThresholdEvents(state, nextState),
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

/** Applies a single probe action and merges track state onto the case. */
export function applyInfiltrationProbeActionToCase(
  caseData: CaseInstance,
  action: InfiltrationProbeAction
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
    merged.counterDetection !== caseData.counterDetection ||
    evaluation.events.length > 0

  return {
    case: merged,
    events: evaluation.events,
    changed,
  }
}

/**
 * One weekly probe tick for assigned in-progress covert cases.
 * Uses {@link resolveWeeklyInfiltrationProbeAction} unless `action` is overridden.
 */
export function applyWeeklyInfiltrationProbeTick(
  caseData: CaseInstance,
  _week: number,
  action?: InfiltrationProbeAction
): WeeklyInfiltrationProbeResult {
  if (!isInfiltrationProbeEligible(caseData)) {
    return { case: caseData, events: [], changed: false }
  }

  const resolvedAction = action ?? resolveWeeklyInfiltrationProbeAction(caseData)
  const probeResult = applyInfiltrationProbeActionToCase(caseData, resolvedAction)
  const coverResult = applyWeeklyInfiltrationCoverPostureToCase(probeResult.case)

  const events = [...probeResult.events, ...coverResult.events]

  return {
    case: coverResult.case,
    events,
    changed: probeResult.changed || coverResult.changed || events.length > 0,
  }
}

export function getInfiltrationAwarenessPressure(caseData: CaseInstance) {
  if (!isInfiltrationProbeEligible(caseData) && caseData.infiltrationAwareness === undefined) {
    return 0
  }

  return clamp(caseData.infiltrationAwareness ?? 0, 0, 1)
}
