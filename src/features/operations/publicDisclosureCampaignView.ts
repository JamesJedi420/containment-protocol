import type { GameState } from '../../domain/models'
import {
  projectDisclosureRegionalView,
  type AwarenessLevel,
  type PublicDisclosureRecord,
} from '../../domain/publicDisclosureStateRegistry'
import { resolveTruthLayerDualIncidentPairing } from '../../domain/truthLayerCoverNarrativePairing'
import { projectPublicDisclosureTrustOutcomeFromGame } from '../../domain/publicDisclosureTrustOutcomeProjection'
import { projectPublicDisclosureSegmentedTrustOutcomeFromGame } from '../../domain/publicDisclosureSegmentedTrustOutcomeProjection'
import { formatPublicDisclosureEnumLabel } from './publicDisclosureMirrorView'

const AWARENESS_SEVERITY_ORDER: readonly AwarenessLevel[] = [
  'secrecy_intact',
  'local_rumor',
  'credible_leak',
  'public_scandal',
  'official_disclosure',
  'normalization',
] as const

export interface PublicDisclosureCampaignRegionalBandView {
  regionLabel: string
  trustBandLabel: string
  redacted: boolean
}

export interface PublicDisclosureCampaignRecordView {
  label: string
  summaryLabel: string
  awarenessLevelLabel: string
  falloutPhaseLabel: string
  regionalBandViews: readonly PublicDisclosureCampaignRegionalBandView[]
  campaignObjectivePivotLabel: string | null
  coverCapacityStressLabel: string | null
  coverNarrativeContextLabel: string | null
  confidenceBandLabel: string | null
  redacted: boolean
}

export interface PublicDisclosureCampaignSegmentChipView {
  segmentLabel: string
  segmentKindLabel: string
  trustBandLabel: string
  redacted: boolean
}

export interface PublicDisclosureCampaignSummaryView {
  activeDisclosureCount: number
  dominantAwarenessBandLabel: string
  cooperationBandLabel: string | null
  segmentDivergenceLabel: string | null
  segmentTrustChips: readonly PublicDisclosureCampaignSegmentChipView[]
  week: number
}

export interface PublicDisclosureCampaignView {
  isEmpty: boolean
  summary: PublicDisclosureCampaignSummaryView
  records: readonly PublicDisclosureCampaignRecordView[]
}

function listPersistedRecords(game: GameState): PublicDisclosureRecord[] {
  const map = game.publicDisclosureRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatRegionDisplayLabel(regionRef: string): string {
  const token = regionRef.startsWith('region:') ? regionRef.slice('region:'.length) : regionRef
  return formatPublicDisclosureEnumLabel(token.replace(/-/g, '_'))
}

function formatTrustBand(score: number): string {
  if (score < 0.34) {
    return 'Low'
  }

  if (score < 0.67) {
    return 'Moderate'
  }

  return 'High'
}

function formatConfidenceBand(value: number): string {
  if (value < 0.4) {
    return 'Low confidence'
  }

  if (value < 0.7) {
    return 'Moderate confidence'
  }

  return 'High confidence'
}

function awarenessSeverityIndex(level: AwarenessLevel): number {
  return AWARENESS_SEVERITY_ORDER.indexOf(level)
}

function resolveDominantAwarenessBand(records: readonly PublicDisclosureRecord[]): string {
  if (records.length === 0) {
    return 'No active disclosure posture'
  }

  let dominant: AwarenessLevel = 'secrecy_intact'

  for (const record of records) {
    const level = record.awarenessLevel
    if (awarenessSeverityIndex(level) > awarenessSeverityIndex(dominant)) {
      dominant = level
    }
  }

  return formatPublicDisclosureEnumLabel(dominant)
}

function resolveCoverNarrativeContextLabel(
  game: GameState,
  disclosureRecordId: string
): string | null {
  const truthLayerRecords = game.truthLayerRecords ?? {}

  for (const incident of Object.values(truthLayerRecords)) {
    const linkedRef = typeof incident.linkedDisclosureRef === 'string'
      ? incident.linkedDisclosureRef.trim()
      : ''

    if (linkedRef !== disclosureRecordId) {
      continue
    }

    const pairing = resolveTruthLayerDualIncidentPairing(
      incident,
      truthLayerRecords,
      game.publicDisclosureRecords
    )

    return pairing.coverNarrativeRecord?.label ?? null
  }

  return null
}

function toRecordView(game: GameState, record: PublicDisclosureRecord): PublicDisclosureCampaignRecordView {
  const projection = projectDisclosureRegionalView(record, { redactUnknown: true })

  const summaryLabel =
    projection.summary ??
    (projection.redacted && record.summary ? 'Briefing summary withheld pending review.' : '—')

  const regionalBandViews = Object.freeze(
    projection.regionalTrust.map((entry) =>
      Object.freeze({
        regionLabel: formatRegionDisplayLabel(entry.regionRef),
        trustBandLabel:
          entry.redacted || entry.trustScore === null
            ? '—'
            : formatTrustBand(entry.trustScore),
        redacted: entry.redacted,
      })
    )
  )

  const confidenceBandLabel =
    projection.confidence === null
      ? projection.redacted && record.confidence !== undefined
        ? 'Withheld'
        : null
      : formatConfidenceBand(projection.confidence)

  return Object.freeze({
    label: record.label,
    summaryLabel,
    awarenessLevelLabel: formatPublicDisclosureEnumLabel(projection.publicAwarenessHint),
    falloutPhaseLabel: formatPublicDisclosureEnumLabel(projection.falloutPhase),
    regionalBandViews,
    campaignObjectivePivotLabel: projection.campaignObjectivePivot
      ? formatPublicDisclosureEnumLabel(projection.campaignObjectivePivot)
      : null,
    coverCapacityStressLabel: record.coverCapacityFailure === true ? 'Cover capacity under strain' : null,
    coverNarrativeContextLabel: resolveCoverNarrativeContextLabel(game, record.id),
    confidenceBandLabel,
    redacted: projection.redacted,
  })
}

/** Read-only player briefing over hydrated `publicDisclosureRecords`; does not mutate GameState. */
export function getPublicDisclosureCampaignView(game: GameState): PublicDisclosureCampaignView {
  const records = listPersistedRecords(game)
  const trustOutcome = projectPublicDisclosureTrustOutcomeFromGame(game)
  const segmentedTrust = projectPublicDisclosureSegmentedTrustOutcomeFromGame(game)

  const activeDisclosureCount = records.filter(
    (record) => record.awarenessLevel !== 'secrecy_intact'
  ).length

  const segmentTrustChips = Object.freeze(
    segmentedTrust.segmentEntries.map((entry) =>
      Object.freeze({
        segmentLabel: entry.segmentLabel,
        segmentKindLabel: entry.segmentKindLabel,
        trustBandLabel: entry.trustBandLabel,
        redacted: entry.redacted,
      })
    )
  )

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      activeDisclosureCount,
      dominantAwarenessBandLabel: resolveDominantAwarenessBand(records),
      cooperationBandLabel:
        trustOutcome.cooperationBand === 'inactive' ? null : trustOutcome.cooperationBandLabel,
      segmentDivergenceLabel: segmentedTrust.isInactive ? null : segmentedTrust.divergenceLabel,
      segmentTrustChips,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(game, record))),
  })
}
