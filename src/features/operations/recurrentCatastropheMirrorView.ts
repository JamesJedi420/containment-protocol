import type { GameState } from '../../domain/models'
import {
  projectNextRecurrenceRisk,
  validateRecurrentCatastropheRecord,
  type ActiveAmeliorationTactic,
  type ActivePreventionTactic,
  type RecurrentCatastropheRecord,
} from '../../domain/recurrentCatastropheAmeliorationRegistry'

export interface RecurrentCatastropheMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  recurrenceCadenceLabel: string
  failureModeLabel: string
  preventionCeilingLabel: string
  recurrenceCountLabel: string
  lastOccurrenceWeekLabel: string
  activeAmeliorationLabels: readonly string[]
  activePreventionLabels: readonly string[]
  damageLedgerRefLabels: readonly string[]
  postIncidentReviewRefLabels: readonly string[]
  severityBandLabel: string
  recurrenceRiskScoreLabel: string
  activeAmeliorationCountLabel: string
  validationWarningLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface RecurrentCatastropheMirrorSummaryView {
  totalRecords: number
  impossiblePreventionCount: number
  criticalSeverityCount: number
  week: number
}

export interface RecurrentCatastropheMirrorView {
  isEmpty: boolean
  summary: RecurrentCatastropheMirrorSummaryView
  records: readonly RecurrentCatastropheMirrorRecordView[]
}

export function formatRecurrentCatastropheEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): RecurrentCatastropheRecord[] {
  const map = game.recurrentCatastropheRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatRiskScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(3)
}

function formatSeverityBand(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return formatRecurrentCatastropheEnumLabel(value)
}

function formatWeek(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return `W${value}`
}

function formatActiveTacticLabels<T extends { tactic: string; active: boolean }>(
  entries: readonly T[] | undefined,
  formatter: (tactic: string) => string
): readonly string[] {
  if (!entries) {
    return Object.freeze([])
  }

  return Object.freeze(
    entries
      .filter((entry) => entry.active === true)
      .map((entry) => formatter(entry.tactic))
  )
}

function toRecordView(
  record: RecurrentCatastropheRecord,
  week: number
): RecurrentCatastropheMirrorRecordView {
  const projection = projectNextRecurrenceRisk(record, { currentWeek: week })
  const validation = validateRecurrentCatastropheRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  const summaryLabel = record.summary?.trim() ? record.summary : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    recurrenceCadenceLabel: formatRecurrentCatastropheEnumLabel(record.recurrenceCadence),
    failureModeLabel: formatRecurrentCatastropheEnumLabel(record.failureMode),
    preventionCeilingLabel: formatRecurrentCatastropheEnumLabel(record.preventionCeiling),
    recurrenceCountLabel: String(record.recurrenceCount),
    lastOccurrenceWeekLabel: formatWeek(projection.lastOccurrenceWeek),
    activeAmeliorationLabels: formatActiveTacticLabels(
      record.ameliorationTactics as readonly ActiveAmeliorationTactic[],
      formatRecurrentCatastropheEnumLabel
    ),
    activePreventionLabels: formatActiveTacticLabels(
      record.preventionTactics as readonly ActivePreventionTactic[] | undefined,
      formatRecurrentCatastropheEnumLabel
    ),
    damageLedgerRefLabels: Object.freeze([...(record.damageLedgerRefs ?? [])]),
    postIncidentReviewRefLabels: Object.freeze([...(record.postIncidentReviewRefs ?? [])]),
    severityBandLabel: formatSeverityBand(projection.severityBand),
    recurrenceRiskScoreLabel: formatRiskScore(projection.recurrenceRiskScore),
    activeAmeliorationCountLabel: String(projection.activeAmeliorationCount),
    validationWarningLabels,
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `recurrentCatastropheRecords`; does not re-validate dropped entries. */
export function getRecurrentCatastropheMirrorView(
  game: GameState
): RecurrentCatastropheMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let impossiblePreventionCount = 0
  let criticalSeverityCount = 0

  const recordViews = records.map((record) => {
    if (record.preventionCeiling === 'impossible') {
      impossiblePreventionCount += 1
    }

    const projection = projectNextRecurrenceRisk(record, { currentWeek: week })
    if (projection.severityBand === 'critical') {
      criticalSeverityCount += 1
    }

    return toRecordView(record, week)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      impossiblePreventionCount,
      criticalSeverityCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
