import type { GameState } from '../../domain/models'
import {
  projectDisclosureRegionalView,
  type PublicDisclosureRecord,
  type PublicDisclosureTransitionHistoryEntry,
} from '../../domain/publicDisclosureStateRegistry'

export interface PublicDisclosureMirrorRegionalTrustView {
  regionRef: string
  trustScoreLabel: string
  redacted: boolean
}

export interface PublicDisclosureMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  awarenessLevelLabel: string
  falloutPhaseLabel: string
  regionalTrustViews: readonly PublicDisclosureMirrorRegionalTrustView[]
  oversightPressureLabel: string
  campaignObjectivePivotLabel: string | null
  coverCapacityFailureLabel: string
  transitionHistoryLabels: readonly string[]
  normalizationInputLabels: readonly string[]
  linkedContractCount: number
  confidenceLabel: string
  redacted: boolean
}

export interface PublicDisclosureMirrorSummaryView {
  totalRecords: number
  disclosureActiveCount: number
  normalizationInputCount: number
  week: number
}

export interface PublicDisclosureMirrorView {
  isEmpty: boolean
  summary: PublicDisclosureMirrorSummaryView
  records: readonly PublicDisclosureMirrorRecordView[]
}

export function formatPublicDisclosureEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): PublicDisclosureRecord[] {
  const map = game.publicDisclosureRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatUnitScore(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatTransitionHistoryLabel(entry: PublicDisclosureTransitionHistoryEntry): string {
  const fromLabel = formatPublicDisclosureEnumLabel(entry.fromAwarenessLevel)
  const toLabel = formatPublicDisclosureEnumLabel(entry.toAwarenessLevel)
  const falloutSuffix = entry.falloutPhase
    ? ` (${formatPublicDisclosureEnumLabel(entry.falloutPhase)})`
    : ''

  return `W${entry.week}: ${fromLabel} → ${toLabel}${falloutSuffix}`
}

function toRecordView(record: PublicDisclosureRecord): PublicDisclosureMirrorRecordView {
  const projection = projectDisclosureRegionalView(record)

  const summaryLabel =
    projection.summary ??
    (projection.redacted && record.summary ? '[Redacted]' : '—')

  const regionalTrustViews = Object.freeze(
    projection.regionalTrust.map((entry) =>
      Object.freeze({
        regionRef: entry.regionRef,
        trustScoreLabel: entry.redacted || entry.trustScore === null ? '—' : entry.trustScore.toFixed(2),
        redacted: entry.redacted,
      })
    )
  )

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    awarenessLevelLabel: formatPublicDisclosureEnumLabel(projection.publicAwarenessHint),
    falloutPhaseLabel: formatPublicDisclosureEnumLabel(projection.falloutPhase),
    regionalTrustViews,
    oversightPressureLabel:
      projection.oversightPressure === null
        ? '—'
        : formatUnitScore(projection.oversightPressure),
    campaignObjectivePivotLabel: projection.campaignObjectivePivot
      ? formatPublicDisclosureEnumLabel(projection.campaignObjectivePivot)
      : null,
    coverCapacityFailureLabel: record.coverCapacityFailure === true ? 'Yes' : '—',
    transitionHistoryLabels: Object.freeze(
      (record.transitionHistory ?? []).map((entry) => formatTransitionHistoryLabel(entry))
    ),
    normalizationInputLabels: Object.freeze(
      (record.normalizationInputs ?? []).map(
        (input) =>
          `${formatPublicDisclosureEnumLabel(input.kind)} — ${input.descriptor}${
            input.ref ? ` (${input.ref})` : ''
          }`
      )
    ),
    linkedContractCount: record.linkedContractOutcomes?.length ?? 0,
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `publicDisclosureRecords`; does not re-validate dropped entries. */
export function getPublicDisclosureMirrorView(game: GameState): PublicDisclosureMirrorView {
  const records = listPersistedRecords(game)

  const disclosureActiveCount = records.filter(
    (record) => record.awarenessLevel !== 'secrecy_intact'
  ).length
  const normalizationInputCount = records.reduce(
    (total, record) => total + (record.normalizationInputs?.length ?? 0),
    0
  )

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      disclosureActiveCount,
      normalizationInputCount,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(record))),
  })
}
