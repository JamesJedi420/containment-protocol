/**
 * SPE-521 follow-up: deterministic guides/documents read model for eligible infiltration cases.
 */

import {
  INFILTRATION_AUTHORITY_SCRUTINY_TAGS,
  INFILTRATION_PROCEDURAL_SCRUTINY_TAGS,
} from './infiltrationCover'
import { isInfiltrationProbeEligible } from './infiltrationProbe'
import type { CaseInstance } from './models'

const COVER_STRAIN_BAND = 0.35
const DOCTRINE_PARTIAL_BAND = 0.15

const DOCUMENT_TIER_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Forged or missing paperwork',
  1: 'Plausible cover credentials',
  2: 'Strong institutional backing',
}

function resolveDocumentTierLabel(documentTier: number): string {
  if (documentTier <= 0) {
    return DOCUMENT_TIER_LABELS[0]
  }

  if (documentTier >= 2) {
    return DOCUMENT_TIER_LABELS[2]
  }

  return DOCUMENT_TIER_LABELS[1]
}

function resolveDoctrineGuideLabel(doctrineBand: number): string {
  if (doctrineBand >= COVER_STRAIN_BAND) {
    return 'Cover guide fluent for scripted checks'
  }

  if (doctrineBand >= DOCTRINE_PARTIAL_BAND) {
    return 'Cover guide partial — review before questioning'
  }

  return 'Cover guide thin under procedural scrutiny'
}

function collectCaseTags(caseData: CaseInstance): Set<string> {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

function hasAnyTag(caseTags: Set<string>, candidates: readonly string[]) {
  return candidates.some((tag) => caseTags.has(tag))
}

function formatPercent(value: number) {
  return Math.round(value * 100)
}

export function canProjectInfiltrationEncounterGuidesDocuments(caseData: CaseInstance) {
  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    caseData.infiltrationCoverProfile !== undefined
  )
}

export interface InfiltrationEncounterGuidesDocuments {
  readonly visible: boolean
  readonly documentTier: number
  readonly documentTierLabel: string
  readonly doctrineBandPercent: number
  readonly doctrineGuideLabel: string
  readonly scrutinyLabels: readonly string[]
  readonly readinessLabels: readonly string[]
}

const EMPTY_PROJECTION: InfiltrationEncounterGuidesDocuments = Object.freeze({
  visible: false,
  documentTier: 0,
  documentTierLabel: DOCUMENT_TIER_LABELS[0],
  doctrineBandPercent: 0,
  doctrineGuideLabel: resolveDoctrineGuideLabel(0),
  scrutinyLabels: [],
  readinessLabels: [],
})

/** Projects guides/documents prep labels from cover profile tier and site scrutiny tags. */
export function projectInfiltrationEncounterGuidesDocuments(
  caseData: CaseInstance
): InfiltrationEncounterGuidesDocuments {
  if (!canProjectInfiltrationEncounterGuidesDocuments(caseData)) {
    return EMPTY_PROJECTION
  }

  const profile = caseData.infiltrationCoverProfile!
  const caseTags = collectCaseTags(caseData)
  const documentTier = profile.documentTier ?? 2
  const doctrineBand = profile.doctrineBand ?? 1
  const authorityScrutiny = hasAnyTag(caseTags, INFILTRATION_AUTHORITY_SCRUTINY_TAGS)
  const proceduralScrutiny = hasAnyTag(caseTags, INFILTRATION_PROCEDURAL_SCRUTINY_TAGS)
  const scrutinyLabels: string[] = []

  if (authorityScrutiny) {
    scrutinyLabels.push('Authority scrutiny active on site')
  }

  if (proceduralScrutiny) {
    scrutinyLabels.push('Procedural scrutiny active on site')
  }

  const readinessLabels: string[] = []

  if (authorityScrutiny && documentTier <= 0) {
    readinessLabels.push('Paperwork may fail badge or clearance checks')
  } else if (authorityScrutiny && documentTier === 1) {
    readinessLabels.push('Credentials may draw secondary verification')
  }

  if (proceduralScrutiny && doctrineBand < COVER_STRAIN_BAND) {
    readinessLabels.push('Scripted answers may fail under interview pressure')
  }

  return Object.freeze({
    visible: true,
    documentTier,
    documentTierLabel: resolveDocumentTierLabel(documentTier),
    doctrineBandPercent: formatPercent(doctrineBand),
    doctrineGuideLabel: resolveDoctrineGuideLabel(doctrineBand),
    scrutinyLabels,
    readinessLabels,
  })
}
