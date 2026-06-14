/**
 * SPE-861 slice 2: read-side public-trust outcome projection from persisted disclosure records.
 *
 * Pure deterministic projection over post-tick `publicDisclosureRecords` — no GameState
 * mutation and no weekly progression duplication.
 */

import type { GameState } from './models'
import {
  projectDisclosureRegionalView,
  type AwarenessLevel,
  type PublicDisclosureRecord,
  type PublicDisclosureRecordsMap,
} from './publicDisclosureStateRegistry'

const AWARENESS_SEVERITY_ORDER: readonly AwarenessLevel[] = [
  'secrecy_intact',
  'local_rumor',
  'credible_leak',
  'public_scandal',
  'official_disclosure',
  'normalization',
] as const

export type PublicDisclosureRegionalTrustBand = 'low' | 'moderate' | 'high'

export type PublicDisclosureCooperationBand = 'aligned' | 'watchful' | 'opposed' | 'inactive'

export type PublicDisclosureTrustOutcomeAttentionTone = 'info' | 'warning' | 'danger'

export interface PublicDisclosureTrustOutcomeProjection {
  readonly isEmpty: boolean
  readonly activeCampaignCount: number
  readonly dominantAwarenessLevel: AwarenessLevel | null
  readonly dominantAwarenessBandLabel: string
  readonly aggregateRegionalTrustBand: PublicDisclosureRegionalTrustBand | null
  readonly cooperationBand: PublicDisclosureCooperationBand
  readonly cooperationBandLabel: string
  readonly frontDeskAttentionTone: PublicDisclosureTrustOutcomeAttentionTone
  readonly frontDeskAttentionSummary: string
}

const COOPERATION_BAND_LABELS: Record<PublicDisclosureCooperationBand, string> = {
  aligned: 'Aligned cooperation',
  watchful: 'Watchful compliance',
  opposed: 'Opposed posture',
  inactive: 'No active disclosure posture',
}

function formatDisclosureEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function awarenessSeverityIndex(level: AwarenessLevel): number {
  return AWARENESS_SEVERITY_ORDER.indexOf(level)
}

function listPersistedRecords(
  records: PublicDisclosureRecordsMap | null | undefined
): PublicDisclosureRecord[] {
  const map = records ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function resolveDominantAwarenessLevel(
  records: readonly PublicDisclosureRecord[]
): AwarenessLevel | null {
  if (records.length === 0) {
    return null
  }

  let dominant: AwarenessLevel = 'secrecy_intact'

  for (const record of records) {
    const level = record.awarenessLevel
    if (awarenessSeverityIndex(level) > awarenessSeverityIndex(dominant)) {
      dominant = level
    }
  }

  return dominant
}

function resolveTrustBandFromScore(score: number): PublicDisclosureRegionalTrustBand {
  if (score < 0.34) {
    return 'low'
  }

  if (score < 0.67) {
    return 'moderate'
  }

  return 'high'
}

function resolveAggregateRegionalTrustBand(
  records: readonly PublicDisclosureRecord[]
): PublicDisclosureRegionalTrustBand | null {
  let minimumScore: number | null = null

  for (const record of records) {
    const projection = projectDisclosureRegionalView(record, { redactUnknown: true })

    for (const entry of projection.regionalTrust) {
      if (entry.redacted || entry.trustScore === null) {
        continue
      }

      minimumScore =
        minimumScore === null ? entry.trustScore : Math.min(minimumScore, entry.trustScore)
    }
  }

  if (minimumScore === null) {
    return null
  }

  return resolveTrustBandFromScore(minimumScore)
}

function resolveCooperationBand(input: {
  dominantAwarenessLevel: AwarenessLevel | null
  aggregateRegionalTrustBand: PublicDisclosureRegionalTrustBand | null
  activeCampaignCount: number
}): PublicDisclosureCooperationBand {
  const { dominantAwarenessLevel, aggregateRegionalTrustBand, activeCampaignCount } = input

  if (activeCampaignCount === 0 || dominantAwarenessLevel === null) {
    return 'inactive'
  }

  if (dominantAwarenessLevel === 'secrecy_intact') {
    return 'inactive'
  }

  if (
    dominantAwarenessLevel === 'normalization' &&
    (aggregateRegionalTrustBand === 'moderate' || aggregateRegionalTrustBand === 'high')
  ) {
    return 'aligned'
  }

  if (dominantAwarenessLevel === 'official_disclosure' && aggregateRegionalTrustBand === 'high') {
    return 'aligned'
  }

  if (
    (dominantAwarenessLevel === 'public_scandal' || dominantAwarenessLevel === 'official_disclosure') &&
    aggregateRegionalTrustBand === 'low'
  ) {
    return 'opposed'
  }

  if (
    aggregateRegionalTrustBand === 'low' &&
    (dominantAwarenessLevel === 'credible_leak' || dominantAwarenessLevel === 'local_rumor')
  ) {
    return 'opposed'
  }

  return 'watchful'
}

function resolveFrontDeskAttentionTone(
  cooperationBand: PublicDisclosureCooperationBand,
  dominantAwarenessLevel: AwarenessLevel | null
): PublicDisclosureTrustOutcomeAttentionTone {
  if (cooperationBand === 'opposed') {
    return 'danger'
  }

  if (cooperationBand === 'watchful') {
    return 'warning'
  }

  if (cooperationBand === 'aligned') {
    return 'info'
  }

  if (
    dominantAwarenessLevel === 'public_scandal' ||
    dominantAwarenessLevel === 'official_disclosure'
  ) {
    return 'warning'
  }

  return 'info'
}

function formatRegionalTrustBandLabel(
  band: PublicDisclosureRegionalTrustBand | null
): string {
  if (band === null) {
    return 'Regional trust unavailable'
  }

  return `${band.charAt(0).toUpperCase()}${band.slice(1)} regional trust`
}

function buildFrontDeskAttentionSummary(input: {
  activeCampaignCount: number
  dominantAwarenessBandLabel: string
  cooperationBandLabel: string
  aggregateRegionalTrustBand: PublicDisclosureRegionalTrustBand | null
}): string {
  const trustLabel = formatRegionalTrustBandLabel(input.aggregateRegionalTrustBand)

  return `${input.activeCampaignCount} active disclosure campaign(s); dominant awareness band: ${input.dominantAwarenessBandLabel}; ${input.cooperationBandLabel.toLowerCase()}; ${trustLabel.toLowerCase()}.`
}

/** Projects compliance/cooperation bands from hydrated disclosure records. */
export function projectPublicDisclosureTrustOutcome(
  records: PublicDisclosureRecordsMap | null | undefined
): PublicDisclosureTrustOutcomeProjection {
  const persistedRecords = listPersistedRecords(records)
  const activeCampaignCount = persistedRecords.filter(
    (record) => record.awarenessLevel !== 'secrecy_intact'
  ).length
  const dominantAwarenessLevel = resolveDominantAwarenessLevel(persistedRecords)
  const dominantAwarenessBandLabel =
    dominantAwarenessLevel === null
      ? 'No active disclosure posture'
      : formatDisclosureEnumLabel(dominantAwarenessLevel)
  const aggregateRegionalTrustBand = resolveAggregateRegionalTrustBand(persistedRecords)
  const cooperationBand = resolveCooperationBand({
    dominantAwarenessLevel,
    aggregateRegionalTrustBand,
    activeCampaignCount,
  })
  const cooperationBandLabel = COOPERATION_BAND_LABELS[cooperationBand]

  return Object.freeze({
    isEmpty: persistedRecords.length === 0,
    activeCampaignCount,
    dominantAwarenessLevel,
    dominantAwarenessBandLabel,
    aggregateRegionalTrustBand,
    cooperationBand,
    cooperationBandLabel,
    frontDeskAttentionTone: resolveFrontDeskAttentionTone(cooperationBand, dominantAwarenessLevel),
    frontDeskAttentionSummary: buildFrontDeskAttentionSummary({
      activeCampaignCount,
      dominantAwarenessBandLabel,
      cooperationBandLabel,
      aggregateRegionalTrustBand,
    }),
  })
}

export function projectPublicDisclosureTrustOutcomeFromGame(
  game: Pick<GameState, 'publicDisclosureRecords'>
): PublicDisclosureTrustOutcomeProjection {
  return projectPublicDisclosureTrustOutcome(game.publicDisclosureRecords)
}

export function formatPublicDisclosureTrustOutcomeNoteContent(
  projection: PublicDisclosureTrustOutcomeProjection,
  week: number
): string {
  if (projection.activeCampaignCount === 0) {
    return `Public disclosure trust outcome — W${week}: no active disclosure campaigns.`
  }

  const trustLabel = formatRegionalTrustBandLabel(projection.aggregateRegionalTrustBand)

  return `Public disclosure trust outcome — W${week}: ${projection.activeCampaignCount} active campaign(s); dominant awareness ${projection.dominantAwarenessBandLabel}; ${projection.cooperationBandLabel}; ${trustLabel}.`
}
