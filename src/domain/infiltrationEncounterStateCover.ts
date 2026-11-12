/**
 * SPE-521 follow-up: deterministic encounter-state cover projection for eligible infiltration cases.
 */

import {
  evaluateCoverRoleMismatchPressure,
  evaluateWeeklyInfiltrationCoverPosture,
  INFILTRATION_AUTHORITY_SCRUTINY_TAGS,
  INFILTRATION_PROCEDURAL_SCRUTINY_TAGS,
} from './infiltrationCover'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  isInfiltrationProbeEligible,
  readInfiltrationProbeState,
  VIOLENT_ESCALATION_THRESHOLD,
  type InfiltrationStage,
} from './infiltrationProbe'
import { readInfiltrationEncounterCoverStance } from './infiltrationEncounterCoverStance'
import type { CaseInstance } from './models'

export type InfiltrationEncounterCoverBand =
  | 'stable'
  | 'watchful'
  | 'strained'
  | 'compromised'
  | 'critical'

export type InfiltrationEncounterAwarenessBand = 'routine' | 'elevated' | 'complication' | 'critical'

const COVER_STRAIN_BAND = 0.35
const WATCHFUL_AWARENESS_BAND = 0.2

const BAND_LABELS: Record<InfiltrationEncounterCoverBand, string> = {
  stable: 'Stable cover',
  watchful: 'Watchful observers',
  strained: 'Strained cover',
  compromised: 'Compromised cover',
  critical: 'Critical cover failure',
}

const BAND_STATUS_LABELS: Record<InfiltrationEncounterCoverBand, string> = {
  stable: 'Cover posture holds for routine encounter checks.',
  watchful: 'Site staff may begin casual verification of the cover story.',
  strained: 'Cover story is under active strain before the next encounter.',
  compromised: 'Observers treat the claimed role as doubtful on site.',
  critical: 'Site posture favors force response — cover is failing.',
}

const AWARENESS_BAND_LABELS: Record<InfiltrationEncounterAwarenessBand, string> = {
  routine: 'Routine awareness band',
  elevated: 'Elevated awareness band',
  complication: 'Complication awareness band',
  critical: 'Critical awareness band',
}

function collectCaseTags(caseData: CaseInstance): Set<string> {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

function hasAnyTag(caseTags: Set<string>, candidates: readonly string[]) {
  return candidates.some((tag) => caseTags.has(tag))
}

export function canProjectInfiltrationEncounterStateCover(caseData: CaseInstance) {
  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    caseData.infiltrationCoverProfile !== undefined
  )
}

function resolveAwarenessBand(awareness: number): InfiltrationEncounterAwarenessBand {
  if (awareness >= VIOLENT_ESCALATION_THRESHOLD) {
    return 'critical'
  }

  if (awareness >= AWARENESS_COMPLICATION_THRESHOLD) {
    return 'complication'
  }

  if (awareness >= COVER_STRAIN_BAND) {
    return 'elevated'
  }

  return 'routine'
}

function resolveCoverBand(input: {
  stage: InfiltrationStage
  awareness: number
  hasCoverStrain: boolean
  hasPendingStrain: boolean
}): InfiltrationEncounterCoverBand {
  if (input.stage === 'violent' || input.awareness >= VIOLENT_ESCALATION_THRESHOLD) {
    return 'critical'
  }

  if (input.stage === 'exposed' || input.awareness >= AWARENESS_COMPLICATION_THRESHOLD) {
    return 'compromised'
  }

  if (
    input.hasCoverStrain ||
    input.hasPendingStrain ||
    input.awareness >= COVER_STRAIN_BAND
  ) {
    return 'strained'
  }

  if (input.awareness >= WATCHFUL_AWARENESS_BAND) {
    return 'watchful'
  }

  return 'stable'
}

function buildCoverFactorLabels(caseData: CaseInstance): string[] {
  const profile = caseData.infiltrationCoverProfile
  if (profile === undefined) {
    return []
  }

  const caseTags = collectCaseTags(caseData)
  const mismatch = evaluateCoverRoleMismatchPressure(caseData, profile.claimedRole)
  const posture = evaluateWeeklyInfiltrationCoverPosture(caseData)
  const factors: string[] = []

  if (mismatch.hasRoleMismatch) {
    factors.push('Claimed role clashes with site tags.')
  }

  if (mismatch.hasExtraRouteViolation) {
    factors.push('Route or venue tags contradict the cover story.')
  }

  const authorityScrutiny = hasAnyTag(caseTags, INFILTRATION_AUTHORITY_SCRUTINY_TAGS)
  const proceduralScrutiny = hasAnyTag(caseTags, INFILTRATION_PROCEDURAL_SCRUTINY_TAGS)
  const documentTier = profile.documentTier ?? 2
  const doctrineBand = profile.doctrineBand ?? 1

  if (authorityScrutiny && documentTier <= 0) {
    factors.push('Document tier cannot survive authority scrutiny.')
  }

  if (proceduralScrutiny && doctrineBand < COVER_STRAIN_BAND) {
    factors.push('Doctrine band slips under procedural questioning.')
  }

  if (posture.awarenessDelta > 0 && factors.length === 0) {
    factors.push('Weekly cover posture would add awareness pressure.')
  }

  return factors
}

export interface InfiltrationEncounterStateCover {
  readonly visible: boolean
  readonly band: InfiltrationEncounterCoverBand
  readonly bandLabel: string
  readonly statusLabel: string
  readonly awarenessBand: InfiltrationEncounterAwarenessBand
  readonly awarenessBandLabel: string
  readonly stage: InfiltrationStage
  readonly factorLabels: readonly string[]
  readonly hasElevatedPosture: boolean
  readonly playerStance: ReturnType<typeof readInfiltrationEncounterCoverStance>
  readonly usingStanceOverride: boolean
}

const EMPTY_PROJECTION: InfiltrationEncounterStateCover = Object.freeze({
  visible: false,
  band: 'stable',
  bandLabel: BAND_LABELS.stable,
  statusLabel: BAND_STATUS_LABELS.stable,
  awarenessBand: 'routine',
  awarenessBandLabel: AWARENESS_BAND_LABELS.routine,
  stage: 'probing',
  factorLabels: [],
  hasElevatedPosture: false,
  playerStance: 'maintain',
  usingStanceOverride: false,
})

/** Projects encounter-state cover posture from probe tracks and cover evaluation. */
export function projectInfiltrationEncounterStateCover(
  caseData: CaseInstance
): InfiltrationEncounterStateCover {
  if (!canProjectInfiltrationEncounterStateCover(caseData)) {
    return EMPTY_PROJECTION
  }

  const tracks = readInfiltrationProbeState(caseData)
  const mismatch = evaluateCoverRoleMismatchPressure(caseData)
  const posture = evaluateWeeklyInfiltrationCoverPosture(caseData)
  const hasCoverStrain = mismatch.hasRoleMismatch || mismatch.hasExtraRouteViolation
  const hasPendingStrain = posture.awarenessDelta > 0
  const band = resolveCoverBand({
    stage: tracks.stage,
    awareness: tracks.awareness,
    hasCoverStrain,
    hasPendingStrain,
  })
  const awarenessBand = resolveAwarenessBand(tracks.awareness)
  const playerStance = readInfiltrationEncounterCoverStance(caseData)

  return Object.freeze({
    visible: true,
    band,
    bandLabel: BAND_LABELS[band],
    statusLabel: BAND_STATUS_LABELS[band],
    awarenessBand,
    awarenessBandLabel: AWARENESS_BAND_LABELS[awarenessBand],
    stage: tracks.stage,
    factorLabels: buildCoverFactorLabels(caseData),
    hasElevatedPosture:
      band === 'strained' || band === 'compromised' || band === 'critical',
    playerStance,
    usingStanceOverride: playerStance !== 'maintain',
  })
}
