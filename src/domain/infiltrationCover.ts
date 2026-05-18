/**
 * SPE-521 slice 3: authored cover identity profile and weekly posture evaluation.
 */

import { clamp } from './math'
import type { CaseInstance } from './models'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  type InfiltrationProbeState,
  type InfiltrationThresholdEvent,
  isInfiltrationProbeEligible,
  mergeInfiltrationProbeStateIntoCase,
  readInfiltrationProbeState,
  VIOLENT_ESCALATION_THRESHOLD,
} from './infiltrationProbe'

export type InfiltrationCoverRole =
  | 'uniform_guard'
  | 'civilian_staff'
  | 'courier'
  | 'maintenance'
  | 'official_inspector'

const INFILTRATION_COVER_ROLES: readonly InfiltrationCoverRole[] = [
  'uniform_guard',
  'civilian_staff',
  'courier',
  'maintenance',
  'official_inspector',
]

export function isInfiltrationCoverRole(value: string): value is InfiltrationCoverRole {
  return (INFILTRATION_COVER_ROLES as readonly string[]).includes(value)
}

export interface InfiltrationCoverProfile {
  readonly claimedRole: InfiltrationCoverRole
  /** 0 = forged or missing, 1 = plausible, 2 = strong institutional backing. */
  readonly documentTier?: number
  /** 0–1 doctrine or cover-story fluency for scripted checks. */
  readonly doctrineBand?: number
  /** Case tags that spike awareness when present alongside this cover. */
  readonly routeViolationTags?: readonly string[]
}

export interface InfiltrationCoverPostureEvaluation {
  awarenessDelta: number
  events: readonly InfiltrationThresholdEvent[]
  summary?: string
}

export interface WeeklyInfiltrationCoverPostureResult {
  case: CaseInstance
  events: readonly InfiltrationThresholdEvent[]
  changed: boolean
}

const AUTHORITY_SCRUTINY_TAGS = ['public', 'media', 'court'] as const
const PROCEDURAL_SCRUTINY_TAGS = ['witness', 'interview', 'civilian', 'court'] as const

const ROLE_INCOMPATIBLE_CASE_TAGS: Record<InfiltrationCoverRole, readonly string[]> = {
  uniform_guard: ['media', 'public', 'interview'],
  civilian_staff: ['military', 'parade'],
  courier: ['court', 'media'],
  maintenance: ['media', 'public', 'court'],
  official_inspector: ['covert'],
}

const ROLE_MISMATCH_AWARENESS = 0.08
const ROUTE_VIOLATION_AWARENESS = 0.06
const WEAK_DOCUMENT_AWARENESS = 0.05
const WEAK_DOCTRINE_AWARENESS = 0.04
const COVER_STRAIN_BAND = 0.35

function collectCaseTags(caseData: CaseInstance): Set<string> {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

function hasAnyTag(caseTags: Set<string>, candidates: readonly string[]) {
  return candidates.some((tag) => caseTags.has(tag))
}

function roundBand(value: number) {
  return Math.round(value * 1000) / 1000
}

export function copyInfiltrationCoverProfile(
  profile: InfiltrationCoverProfile | undefined
): InfiltrationCoverProfile | undefined {
  if (profile === undefined) {
    return undefined
  }

  return {
    ...profile,
    routeViolationTags: profile.routeViolationTags ? [...profile.routeViolationTags] : undefined,
  }
}

function resolveThresholdEvents(
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
 * Deterministic weekly cover posture pressure from authored profile vs case context.
 */
export function evaluateWeeklyInfiltrationCoverPosture(
  caseData: CaseInstance
): InfiltrationCoverPostureEvaluation {
  const profile = caseData.infiltrationCoverProfile

  if (!isInfiltrationProbeEligible(caseData) || profile === undefined) {
    return { awarenessDelta: 0, events: [] }
  }

  const caseTags = collectCaseTags(caseData)
  const priorAwareness = clamp(caseData.infiltrationAwareness ?? 0, 0, 1)
  let awarenessDelta = 0
  const strainReasons: string[] = []

  const incompatibleTags = ROLE_INCOMPATIBLE_CASE_TAGS[profile.claimedRole]
  if (hasAnyTag(caseTags, incompatibleTags)) {
    awarenessDelta += ROLE_MISMATCH_AWARENESS
    strainReasons.push(`claimed ${profile.claimedRole} clashes with site context`)
  }

  const incompatibleTagSet = new Set(incompatibleTags)
  const extraRouteViolations =
    profile.routeViolationTags?.filter(
      (tag) => caseTags.has(tag) && !incompatibleTagSet.has(tag)
    ) ?? []

  if (extraRouteViolations.length > 0) {
    awarenessDelta += ROUTE_VIOLATION_AWARENESS
    strainReasons.push('movement or venue tags contradict the cover story')
  }

  const authorityScrutiny = hasAnyTag(caseTags, AUTHORITY_SCRUTINY_TAGS)
  const proceduralScrutiny = hasAnyTag(caseTags, PROCEDURAL_SCRUTINY_TAGS)
  const documentTier = profile.documentTier ?? 2

  if (authorityScrutiny && documentTier <= 0) {
    awarenessDelta += WEAK_DOCUMENT_AWARENESS
    strainReasons.push('paperwork cannot survive authority scrutiny')
  }

  const doctrineBand = profile.doctrineBand ?? 1

  if (proceduralScrutiny && doctrineBand < COVER_STRAIN_BAND) {
    awarenessDelta += WEAK_DOCTRINE_AWARENESS
    strainReasons.push('cover doctrine slips under procedural questioning')
  }

  if (awarenessDelta <= 0) {
    return { awarenessDelta: 0, events: [] }
  }

  const nextAwareness = roundBand(clamp(priorAwareness + awarenessDelta, 0, 1))
  const effectiveDelta = roundBand(nextAwareness - priorAwareness)

  if (effectiveDelta <= 0) {
    return { awarenessDelta: 0, events: [] }
  }

  const events: InfiltrationThresholdEvent[] = []
  const strainSummary =
    strainReasons.join('; ') ||
    'Weekly cover posture review flagged visible mismatch between role and site expectations.'

  if (priorAwareness < COVER_STRAIN_BAND && nextAwareness >= COVER_STRAIN_BAND) {
    events.push({
      kind: 'cover_strain',
      summary:
        strainReasons[0] ??
        'Cover posture strain accumulated; observers may begin treating the infiltrator as out of role.',
    })
  } else if (
    effectiveDelta >= ROUTE_VIOLATION_AWARENESS &&
    priorAwareness < AWARENESS_COMPLICATION_THRESHOLD
  ) {
    events.push({
      kind: 'cover_strain',
      summary: strainSummary,
    })
  }

  return {
    awarenessDelta: effectiveDelta,
    events,
    summary: strainReasons.join('; ') || undefined,
  }
}

/** Merges cover posture awareness delta and threshold follow-ups onto the case. */
export function applyWeeklyInfiltrationCoverPostureToCase(
  caseData: CaseInstance
): WeeklyInfiltrationCoverPostureResult {
  const posture = evaluateWeeklyInfiltrationCoverPosture(caseData)

  if (posture.awarenessDelta <= 0) {
    return { case: caseData, events: [], changed: false }
  }

  const priorState = readInfiltrationProbeState(caseData)
  const nextAwareness = roundBand(
    clamp(priorState.awareness + posture.awarenessDelta, 0, 1)
  )
  let stage = priorState.stage

  if (
    nextAwareness >= AWARENESS_COMPLICATION_THRESHOLD &&
    priorState.awareness < AWARENESS_COMPLICATION_THRESHOLD &&
    stage === 'probing'
  ) {
    stage = 'exposed'
  }

  if (nextAwareness >= VIOLENT_ESCALATION_THRESHOLD && priorState.stage !== 'violent') {
    stage = 'violent'
  }

  const nextState: InfiltrationProbeState = {
    probeProgress: priorState.probeProgress,
    awareness: nextAwareness,
    stage,
  }

  const thresholdEvents = resolveThresholdEvents(priorState, nextState)
  const merged = mergeInfiltrationProbeStateIntoCase(caseData, nextState)
  const events = [...posture.events, ...thresholdEvents]
  const changed =
    merged.infiltrationAwareness !== caseData.infiltrationAwareness ||
    merged.infiltrationStage !== caseData.infiltrationStage ||
    merged.detectionConfidence !== caseData.detectionConfidence ||
    merged.counterDetection !== caseData.counterDetection ||
    events.length > 0

  return {
    case: merged,
    events,
    changed,
  }
}
