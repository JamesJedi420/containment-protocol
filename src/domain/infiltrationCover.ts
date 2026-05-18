/**
 * SPE-521 slice 3: authored cover identity profile and weekly posture evaluation.
 */

import { clamp } from './math'
import type { CaseInstance } from './models'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  type InfiltrationThresholdEvent,
  isInfiltrationProbeEligible,
  mergeInfiltrationProbeStateIntoCase,
  readInfiltrationProbeState,
  resolveInfiltrationStageAfterAwareness,
  resolveInfiltrationThresholdEvents,
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
  official_inspector: [],
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

export interface CoverRoleMismatchEvaluation {
  /** Bounded pressure for disguise counter-detection (0–1). */
  pressure: number
  hasRoleMismatch: boolean
  hasExtraRouteViolation: boolean
}

const COVER_ROLE_MISMATCH_DISGUISE_PRESSURE = 0.5
const COVER_ROUTE_VIOLATION_DISGUISE_PRESSURE = 0.25

/**
 * Deterministic cover-role vs case-tag mismatch pressure (shared by weekly posture and disguise validation).
 */
export function evaluateCoverRoleMismatchPressure(
  caseData: CaseInstance,
  coverRole?: InfiltrationCoverRole
): CoverRoleMismatchEvaluation {
  const role = coverRole ?? caseData.infiltrationCoverProfile?.claimedRole

  if (role === undefined) {
    return { pressure: 0, hasRoleMismatch: false, hasExtraRouteViolation: false }
  }

  const profile = caseData.infiltrationCoverProfile
  const caseTags = collectCaseTags(caseData)
  const incompatibleTags = ROLE_INCOMPATIBLE_CASE_TAGS[role]
  const hasRoleMismatch = hasAnyTag(caseTags, incompatibleTags)
  const incompatibleTagSet = new Set(incompatibleTags)
  const extraRouteViolations =
    profile?.routeViolationTags?.filter(
      (tag) => caseTags.has(tag) && !incompatibleTagSet.has(tag)
    ) ?? []
  const hasExtraRouteViolation = extraRouteViolations.length > 0

  let pressure = 0

  if (hasRoleMismatch) {
    pressure += COVER_ROLE_MISMATCH_DISGUISE_PRESSURE
  }

  if (hasExtraRouteViolation) {
    pressure += COVER_ROUTE_VIOLATION_DISGUISE_PRESSURE
  }

  return {
    pressure: roundBand(clamp(pressure, 0, 1)),
    hasRoleMismatch,
    hasExtraRouteViolation,
  }
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
  const roleMismatch = evaluateCoverRoleMismatchPressure(caseData, profile.claimedRole)

  if (roleMismatch.hasRoleMismatch) {
    awarenessDelta += ROLE_MISMATCH_AWARENESS
    strainReasons.push(`claimed ${profile.claimedRole} clashes with site context`)
  }

  if (roleMismatch.hasExtraRouteViolation) {
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
    'Cover posture strain accumulated; observers may begin treating the infiltrator as out of role.'

  if (priorAwareness < COVER_STRAIN_BAND && nextAwareness >= COVER_STRAIN_BAND) {
    events.push({
      kind: 'cover_strain',
      summary: strainSummary,
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
  const stage = resolveInfiltrationStageAfterAwareness(
    priorState.stage,
    priorState.awareness,
    nextAwareness
  )
  const nextState = {
    probeProgress: priorState.probeProgress,
    awareness: nextAwareness,
    stage,
  }

  const thresholdEvents = resolveInfiltrationThresholdEvents(priorState, nextState)
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
