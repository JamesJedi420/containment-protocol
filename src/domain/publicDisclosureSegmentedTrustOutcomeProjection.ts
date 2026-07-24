/**
 * SPE-861 slice 3: read-side segmented population / channel trust divergence projection.
 *
 * Pure deterministic projection over post-tick `publicDisclosureRecords` via
 * `projectDisclosureRegionalView` — no GameState mutation and no registry schema changes.
 */

import type { GameState } from './models'
import {
  applyPublicDisclosurePostureTrustAdjustment,
  type PublicDisclosurePostureChoicesMap,
} from './publicDisclosurePostureChoice'
import {
  projectDisclosureRegionalView,
  type PublicDisclosureRecord,
  type PublicDisclosureRecordsMap,
} from './publicDisclosureStateRegistry'
import {
  applyPostExposureComparativeTrustAdjustment,
  type PublicDisclosureTrustOutcomeAttentionTone,
} from './publicDisclosureTrustOutcomeProjection'
import { buildRivalPressure } from './rivalPressure'

export type PublicDisclosureTrustSegmentKind = 'population' | 'channel'

export type PublicDisclosureSegmentTrustBand = 'low' | 'moderate' | 'high'

export interface PublicDisclosureSegmentTrustEntry {
  readonly segmentRef: string
  readonly segmentKind: PublicDisclosureTrustSegmentKind
  readonly segmentLabel: string
  readonly segmentKindLabel: string
  readonly trustBand: PublicDisclosureSegmentTrustBand | null
  readonly trustBandLabel: string
  readonly redacted: boolean
}

export interface PublicDisclosureSegmentedTrustOutcomeProjection {
  readonly isEmpty: boolean
  readonly isInactive: boolean
  readonly activeCampaignCount: number
  readonly visibleSegmentCount: number
  readonly hasDivergence: boolean
  readonly divergenceLabel: string | null
  readonly segmentEntries: readonly PublicDisclosureSegmentTrustEntry[]
  readonly frontDeskDivergenceSummary: string | null
  readonly frontDeskDivergenceTone: PublicDisclosureTrustOutcomeAttentionTone | null
}

const SEGMENT_KIND_LABELS: Record<PublicDisclosureTrustSegmentKind, string> = {
  population: 'Population',
  channel: 'Channel',
}

const SEGMENT_KIND_ORDER: Record<PublicDisclosureTrustSegmentKind, number> = {
  population: 0,
  channel: 1,
}

function formatDisclosureEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(
  records: PublicDisclosureRecordsMap | null | undefined
): PublicDisclosureRecord[] {
  const map = records ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function resolveSegmentKind(segmentRef: string): PublicDisclosureTrustSegmentKind {
  const normalized = segmentRef.trim().toLowerCase()

  if (normalized.startsWith('channel:')) {
    return 'channel'
  }

  return 'population'
}

function resolveSegmentDisplayToken(segmentRef: string, kind: PublicDisclosureTrustSegmentKind): string {
  if (kind === 'channel' && segmentRef.startsWith('channel:')) {
    return segmentRef.slice('channel:'.length)
  }

  if (segmentRef.startsWith('population:')) {
    return segmentRef.slice('population:'.length)
  }

  if (segmentRef.startsWith('region:')) {
    return segmentRef.slice('region:'.length)
  }

  return segmentRef
}

function formatSegmentDisplayLabel(segmentRef: string): string {
  const kind = resolveSegmentKind(segmentRef)
  const token = resolveSegmentDisplayToken(segmentRef, kind)
  return formatDisclosureEnumLabel(token.replace(/-/g, '_'))
}

function resolveTrustBandFromScore(score: number): PublicDisclosureSegmentTrustBand {
  if (score < 0.34) {
    return 'low'
  }

  if (score < 0.67) {
    return 'moderate'
  }

  return 'high'
}

function formatTrustBandLabel(band: PublicDisclosureSegmentTrustBand | null, redacted: boolean): string {
  if (redacted || band === null) {
    return '—'
  }

  return band.charAt(0).toUpperCase() + band.slice(1)
}

function compareSegmentEntries(
  left: PublicDisclosureSegmentTrustEntry,
  right: PublicDisclosureSegmentTrustEntry
): number {
  const kindDelta = SEGMENT_KIND_ORDER[left.segmentKind] - SEGMENT_KIND_ORDER[right.segmentKind]

  if (kindDelta !== 0) {
    return kindDelta
  }

  return left.segmentRef.localeCompare(right.segmentRef)
}

function collectSegmentTrustScores(
  records: readonly PublicDisclosureRecord[]
): Map<string, { minimumScore: number | null; redacted: boolean; kind: PublicDisclosureTrustSegmentKind }> {
  const aggregate = new Map<
    string,
    { minimumScore: number | null; redacted: boolean; kind: PublicDisclosureTrustSegmentKind }
  >()

  for (const record of records) {
    if (record.awarenessLevel === 'secrecy_intact') {
      continue
    }

    const projection = projectDisclosureRegionalView(record, { redactUnknown: true })

    for (const entry of projection.regionalTrust) {
      const segmentRef = entry.regionRef
      const kind = resolveSegmentKind(segmentRef)
      const existing = aggregate.get(segmentRef)

      if (entry.redacted || entry.trustScore === null) {
        if (!existing) {
          aggregate.set(segmentRef, { minimumScore: null, redacted: true, kind })
        } else if (!existing.redacted) {
          aggregate.set(segmentRef, { ...existing, redacted: true })
        }

        continue
      }

      const nextMinimum =
        existing?.minimumScore === undefined || existing.minimumScore === null
          ? entry.trustScore
          : Math.min(existing.minimumScore, entry.trustScore)

      aggregate.set(segmentRef, {
        minimumScore: nextMinimum,
        redacted: existing?.redacted === true,
        kind,
      })
    }
  }

  return aggregate
}

function buildSegmentEntries(
  aggregate: Map<string, { minimumScore: number | null; redacted: boolean; kind: PublicDisclosureTrustSegmentKind }>
): PublicDisclosureSegmentTrustEntry[] {
  const entries = [...aggregate.entries()]
    .sort(([leftRef, leftMeta], [rightRef, rightMeta]) => {
      const kindDelta = SEGMENT_KIND_ORDER[leftMeta.kind] - SEGMENT_KIND_ORDER[rightMeta.kind]

      if (kindDelta !== 0) {
        return kindDelta
      }

      return leftRef.localeCompare(rightRef)
    })
    .map(([segmentRef, meta]) => {
      const trustBand =
        meta.redacted || meta.minimumScore === null
          ? null
          : resolveTrustBandFromScore(meta.minimumScore)

      return Object.freeze({
        segmentRef,
        segmentKind: meta.kind,
        segmentLabel: formatSegmentDisplayLabel(segmentRef),
        segmentKindLabel: SEGMENT_KIND_LABELS[meta.kind],
        trustBand,
        trustBandLabel: formatTrustBandLabel(trustBand, meta.redacted),
        redacted: meta.redacted,
      })
    })

  return entries.sort(compareSegmentEntries)
}

function resolveHasDivergence(entries: readonly PublicDisclosureSegmentTrustEntry[]): boolean {
  const visibleBands = new Set<PublicDisclosureSegmentTrustBand>()

  for (const entry of entries) {
    if (entry.redacted || entry.trustBand === null) {
      continue
    }

    visibleBands.add(entry.trustBand)
  }

  return visibleBands.size >= 2
}

function resolveDivergenceLabel(input: {
  visibleSegmentCount: number
  hasDivergence: boolean
}): string | null {
  if (input.visibleSegmentCount === 0) {
    return null
  }

  if (input.visibleSegmentCount === 1) {
    return 'Single visible audience segment'
  }

  if (input.hasDivergence) {
    return 'Segment trust diverges'
  }

  return 'Uniform segment trust'
}

function buildFrontDeskDivergenceSummary(input: {
  hasDivergence: boolean
  visibleSegmentCount: number
  segmentEntries: readonly PublicDisclosureSegmentTrustEntry[]
}): string | null {
  if (!input.hasDivergence || input.visibleSegmentCount < 2) {
    return null
  }

  const divergentLabels = input.segmentEntries
    .filter((entry) => !entry.redacted && entry.trustBand !== null)
    .map((entry) => `${entry.segmentLabel} (${entry.trustBandLabel})`)
    .join('; ')

  return `Segment trust diverges across ${input.visibleSegmentCount} audience segment(s): ${divergentLabels}.`
}

function resolveFrontDeskDivergenceTone(
  hasDivergence: boolean
): PublicDisclosureTrustOutcomeAttentionTone | null {
  if (!hasDivergence) {
    return null
  }

  return 'warning'
}

/** Projects population / channel trust divergence from hydrated disclosure records. */
export function projectPublicDisclosureSegmentedTrustOutcome(
  records: PublicDisclosureRecordsMap | null | undefined,
  postureChoices?: PublicDisclosurePostureChoicesMap | null,
  options?: { readonly postExposureTrustDelta?: number } | null
): PublicDisclosureSegmentedTrustOutcomeProjection {
  const postureAdjusted = applyPublicDisclosurePostureTrustAdjustment(records, postureChoices)
  const effectiveRecords = applyPostExposureComparativeTrustAdjustment(
    postureAdjusted,
    options?.postExposureTrustDelta ?? 0
  )
  const persistedRecords = listPersistedRecords(effectiveRecords)
  const activeRecords = persistedRecords.filter((record) => record.awarenessLevel !== 'secrecy_intact')
  const aggregate = collectSegmentTrustScores(activeRecords)
  const segmentEntries = Object.freeze(buildSegmentEntries(aggregate))
  const visibleSegmentCount = segmentEntries.filter(
    (entry) => !entry.redacted && entry.trustBand !== null
  ).length
  const hasDivergence = resolveHasDivergence(segmentEntries)
  const isInactive =
    persistedRecords.length === 0 || activeRecords.length === 0 || segmentEntries.length === 0

  return Object.freeze({
    isEmpty: persistedRecords.length === 0,
    isInactive,
    activeCampaignCount: activeRecords.length,
    visibleSegmentCount,
    hasDivergence,
    divergenceLabel: resolveDivergenceLabel({ visibleSegmentCount, hasDivergence }),
    segmentEntries,
    frontDeskDivergenceSummary: buildFrontDeskDivergenceSummary({
      hasDivergence,
      visibleSegmentCount,
      segmentEntries,
    }),
    frontDeskDivergenceTone: resolveFrontDeskDivergenceTone(hasDivergence),
  })
}

export function projectPublicDisclosureSegmentedTrustOutcomeFromGame(
  game: Pick<
    GameState,
    'publicDisclosureRecords' | 'publicDisclosurePostureChoices' | 'reports' | 'events'
  >
): PublicDisclosureSegmentedTrustOutcomeProjection {
  return projectPublicDisclosureSegmentedTrustOutcome(
    game.publicDisclosureRecords,
    game.publicDisclosurePostureChoices,
    { postExposureTrustDelta: buildRivalPressure(game).postExposureTrustDelta }
  )
}

export function formatPublicDisclosureSegmentedTrustOutcomeNoteContent(
  projection: PublicDisclosureSegmentedTrustOutcomeProjection,
  week: number
): string {
  if (projection.isInactive || !projection.hasDivergence) {
    return `Public disclosure segment trust divergence — W${week}: no divergent audience segments.`
  }

  const segmentSummary = projection.segmentEntries
    .filter((entry) => !entry.redacted && entry.trustBand !== null)
    .map((entry) => `${entry.segmentLabel} (${entry.trustBandLabel})`)
    .join('; ')

  return `Public disclosure segment trust divergence — W${week}: ${projection.activeCampaignCount} active campaign(s); ${segmentSummary}.`
}
