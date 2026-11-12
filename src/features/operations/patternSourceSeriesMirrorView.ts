import type { GameState } from '../../domain/models'
import {
  projectSeriesProcessingQueue,
  type PatternSourceSeriesRecord,
  type ProcessingStatus,
} from '../../domain/patternSourceSeriesRegistry'

export interface PatternSourceSeriesMirrorQueueEntryView {
  rank: number
  recordId: string
  title: string
  slug: string
  readinessScoreLabel: string
  cpUtilityScoreLabel: string
  processingStatusLabel: string
  sourceFamilyLabel: string
  publicationOrder: string
}

export interface PatternSourceSeriesMirrorRecordView {
  id: string
  slug: string
  title: string
  sourceFamilyLabel: string
  publicationOrder: string
  processingStatusLabel: string
  readinessScoreLabel: string
  queueRankLabel: string
  editorialStatusLabels: readonly string[]
  blurbDomainHintLabels: readonly string[]
  linkedClusterCount: number
  hasAdaptationNote: boolean
  normalizationStateLabel: string | null
  expressionRiskCount: number
  historyLength: number
}

export interface PatternSourceSeriesMirrorSummaryView {
  totalRecords: number
  queueEligibleCount: number
  pipelineActiveCount: number
  terminalCount: number
  week: number
}

export interface PatternSourceSeriesMirrorView {
  isEmpty: boolean
  summary: PatternSourceSeriesMirrorSummaryView
  queueEntries: readonly PatternSourceSeriesMirrorQueueEntryView[]
  records: readonly PatternSourceSeriesMirrorRecordView[]
}

const TERMINAL_STATUSES = new Set<ProcessingStatus>(['reconciled', 'deferred', 'rejected'])
const PIPELINE_STATUSES = new Set<ProcessingStatus>(['unqueued', 'blurb_triaged', 'deep_pass'])

function formatScore(value: number): string {
  return value.toFixed(2)
}

export function formatPatternSourceSeriesEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): PatternSourceSeriesRecord[] {
  const map = game.patternSourceSeriesRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function buildRecordLookup(records: readonly PatternSourceSeriesRecord[]) {
  return new Map(records.map((record) => [record.id, record] as const))
}

function toRecordView(
  record: PatternSourceSeriesRecord,
  queueRankById: ReadonlyMap<string, number>
): PatternSourceSeriesMirrorRecordView {
  const rank = queueRankById.get(record.id)

  return Object.freeze({
    id: record.id,
    slug: record.slug,
    title: record.title,
    sourceFamilyLabel: formatPatternSourceSeriesEnumLabel(record.sourceFamily),
    publicationOrder: record.publicationOrder,
    processingStatusLabel: formatPatternSourceSeriesEnumLabel(record.processingStatus),
    readinessScoreLabel: formatScore(record.readinessScore),
    queueRankLabel: rank !== undefined ? String(rank) : '—',
    editorialStatusLabels: Object.freeze(
      (record.editorialStatus ?? []).map((status) => formatPatternSourceSeriesEnumLabel(status))
    ),
    blurbDomainHintLabels: Object.freeze(
      (record.blurbDomainHints ?? []).map((hint) => formatPatternSourceSeriesEnumLabel(hint))
    ),
    linkedClusterCount: record.linkedClusterIds?.length ?? 0,
    hasAdaptationNote: Boolean(record.adaptation?.normalizationNote?.trim()),
    normalizationStateLabel: record.adaptation?.normalizationState
      ? formatPatternSourceSeriesEnumLabel(record.adaptation.normalizationState)
      : null,
    expressionRiskCount: record.adaptation?.expressionRiskFlags?.length ?? 0,
    historyLength: record.processingHistory?.length ?? 0,
  })
}

/** Read-only mirror over hydrated `patternSourceSeriesRecords`; does not re-validate hidden truth. */
export function getPatternSourceSeriesMirrorView(game: GameState): PatternSourceSeriesMirrorView {
  const records = listPersistedRecords(game)
  const recordById = buildRecordLookup(records)
  const projection = projectSeriesProcessingQueue(records)
  const queueRankById = new Map(
    projection.entries.map((entry) => [entry.recordId, entry.rank] as const)
  )

  const queueEntries = projection.entries.map((entry) => {
    const record = recordById.get(entry.recordId)

    return Object.freeze({
      rank: entry.rank,
      recordId: entry.recordId,
      title: record?.title ?? entry.recordId,
      slug: record?.slug ?? '',
      readinessScoreLabel: formatScore(entry.readinessScore),
      cpUtilityScoreLabel: formatScore(entry.cpUtilityScore),
      processingStatusLabel: formatPatternSourceSeriesEnumLabel(entry.processingStatus),
      sourceFamilyLabel: formatPatternSourceSeriesEnumLabel(entry.sourceFamily),
      publicationOrder: entry.publicationOrder,
    })
  })

  const pipelineActiveCount = records.filter((record) =>
    PIPELINE_STATUSES.has(record.processingStatus)
  ).length
  const terminalCount = records.filter((record) =>
    TERMINAL_STATUSES.has(record.processingStatus)
  ).length

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      queueEligibleCount: projection.entries.length,
      pipelineActiveCount,
      terminalCount,
      week: game.week,
    }),
    queueEntries: Object.freeze(queueEntries),
    records: Object.freeze(records.map((record) => toRecordView(record, queueRankById))),
  })
}
