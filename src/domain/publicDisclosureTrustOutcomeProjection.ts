/**
 * SPE-861 slice 2: read-side public-trust outcome projection from persisted disclosure records.
 *
 * Pure deterministic projection over post-tick `publicDisclosureRecords` — no GameState
 * mutation and no weekly progression duplication.
 */

import type { GameState } from './models'
import {
  applyPublicDisclosurePostureTrustAdjustment,
  type PublicDisclosurePostureChoicesMap,
} from './publicDisclosurePostureChoice'
import {
  projectDisclosureRegionalView,
  type AwarenessLevel,
  type PublicDisclosureRecord,
  type PublicDisclosureRecordsMap,
} from './publicDisclosureStateRegistry'
import {
  buildRivalPressure,
  resolveRivalPostExposurePosture,
  type RivalPostExposurePosture,
} from './rivalPressure'

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
  /** Standing-shaped trust delta applied only when exposure is active (SPE-2701). */
  readonly postExposureTrustDeltaApplied: number
  /** Protective / coercive / neutral when exposure active; inactive otherwise. */
  readonly rivalPosture: RivalPostExposurePosture | 'inactive'
}

export interface ProjectPublicDisclosureTrustOutcomeOptions {
  readonly postExposureTrustDelta?: number
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

function clampTrustScore(score: number): number {
  const clamped = Math.min(1, Math.max(0, score))
  return Math.round(clamped * 100) / 100
}

/**
 * Applies standing-shaped post-exposure comparative trust only to active exposure campaigns.
 * Secrecy-intact / empty maps are unchanged. Does not mutate persisted registry records.
 */
export function applyPostExposureComparativeTrustAdjustment(
  records: PublicDisclosureRecordsMap | null | undefined,
  postExposureTrustDelta: number
): PublicDisclosureRecordsMap {
  const sourceRecords = records ?? {}
  const delta = Number.isFinite(postExposureTrustDelta) ? postExposureTrustDelta : 0

  if (delta === 0 || Object.keys(sourceRecords).length === 0) {
    return sourceRecords
  }

  let changed = false
  const nextRecords: PublicDisclosureRecordsMap = {}

  for (const [recordId, record] of Object.entries(sourceRecords).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (
      record.awarenessLevel === 'secrecy_intact' ||
      !record.trustByRegion ||
      record.trustByRegion.length === 0
    ) {
      nextRecords[recordId] = record
      continue
    }

    changed = true
    nextRecords[recordId] = Object.freeze({
      ...record,
      trustByRegion: Object.freeze(
        record.trustByRegion.map((entry) =>
          Object.freeze({
            ...entry,
            trustScore: clampTrustScore(entry.trustScore + delta),
          })
        )
      ),
    })
  }

  return changed ? nextRecords : sourceRecords
}

function buildFrontDeskAttentionSummary(input: {
  activeCampaignCount: number
  dominantAwarenessBandLabel: string
  cooperationBandLabel: string
  aggregateRegionalTrustBand: PublicDisclosureRegionalTrustBand | null
  rivalPosture: RivalPostExposurePosture | 'inactive'
  postExposureTrustDeltaApplied: number
}): string {
  const trustLabel = formatRegionalTrustBandLabel(input.aggregateRegionalTrustBand)
  const postureNote =
    input.rivalPosture === 'inactive'
      ? 'rival posture inactive'
      : `rival posture ${input.rivalPosture} (trust ${
          input.postExposureTrustDeltaApplied > 0 ? '+' : ''
        }${input.postExposureTrustDeltaApplied})`

  return `${input.activeCampaignCount} active disclosure campaign(s); dominant awareness band: ${input.dominantAwarenessBandLabel}; ${input.cooperationBandLabel.toLowerCase()}; ${trustLabel.toLowerCase()}; ${postureNote}.`
}

/** Projects compliance/cooperation bands from hydrated disclosure records. */
export function projectPublicDisclosureTrustOutcome(
  records: PublicDisclosureRecordsMap | null | undefined,
  postureChoices?: PublicDisclosurePostureChoicesMap | null,
  options?: ProjectPublicDisclosureTrustOutcomeOptions | null
): PublicDisclosureTrustOutcomeProjection {
  const postureAdjusted = applyPublicDisclosurePostureTrustAdjustment(records, postureChoices)
  const requestedDelta = options?.postExposureTrustDelta ?? 0
  const effectiveRecords = applyPostExposureComparativeTrustAdjustment(
    postureAdjusted,
    requestedDelta
  )
  const persistedRecords = listPersistedRecords(effectiveRecords)
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
  const postExposureTrustDeltaApplied =
    activeCampaignCount > 0 && Number.isFinite(requestedDelta) ? requestedDelta + 0 : 0
  const rivalPosture: RivalPostExposurePosture | 'inactive' =
    activeCampaignCount === 0
      ? 'inactive'
      : resolveRivalPostExposurePosture(postExposureTrustDeltaApplied)

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
      rivalPosture,
      postExposureTrustDeltaApplied,
    }),
    postExposureTrustDeltaApplied,
    rivalPosture,
  })
}

export function projectPublicDisclosureTrustOutcomeFromGame(
  game: Pick<
    GameState,
    'publicDisclosureRecords' | 'publicDisclosurePostureChoices' | 'reports' | 'events'
  >
): PublicDisclosureTrustOutcomeProjection {
  return projectPublicDisclosureTrustOutcome(
    game.publicDisclosureRecords,
    game.publicDisclosurePostureChoices,
    { postExposureTrustDelta: buildRivalPressure(game).postExposureTrustDelta }
  )
}

export function formatPublicDisclosureTrustOutcomeNoteContent(
  projection: PublicDisclosureTrustOutcomeProjection,
  week: number
): string {
  if (projection.activeCampaignCount === 0) {
    return `Public disclosure trust outcome — W${week}: no active disclosure campaigns.`
  }

  const trustLabel = formatRegionalTrustBandLabel(projection.aggregateRegionalTrustBand)
  const postureNote =
    projection.rivalPosture === 'inactive'
      ? 'rival posture inactive'
      : `rival posture ${projection.rivalPosture} (trust ${
          projection.postExposureTrustDeltaApplied > 0 ? '+' : ''
        }${projection.postExposureTrustDeltaApplied})`

  return `Public disclosure trust outcome — W${week}: ${projection.activeCampaignCount} active campaign(s); dominant awareness ${projection.dominantAwarenessBandLabel}; ${projection.cooperationBandLabel}; ${trustLabel}; ${postureNote}.`
}
