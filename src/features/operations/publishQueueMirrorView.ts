import type { GameState } from '../../domain/models'
import type { PublishQueueRecord } from '../../domain/publishAutomationCreditingHooks'
import {
  formatPublishQueueStatusLabel,
  summarizePublishQueueRecords,
} from '../../domain/publishQueueSurfacing'

export interface PublishQueueMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  releaseArtifactRef: string
  statusLabel: string
  queuedWeekLabel: string
  creditingHookCount: number
  publishHookCount: number
  reasonCodeCount: number
}

export interface PublishQueueMirrorSummaryView {
  totalRecords: number
  readyToPublishCount: number
  publishedCount: number
  terminalCount: number
  week: number
}

export interface PublishQueueMirrorView {
  isEmpty: boolean
  summary: PublishQueueMirrorSummaryView
  records: readonly PublishQueueMirrorRecordView[]
}

function listPersistedRecords(game: GameState): PublishQueueRecord[] {
  const map = game.publishQueueRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function toRecordView(record: PublishQueueRecord): PublishQueueMirrorRecordView {
  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel: record.summary?.trim() ? record.summary : '—',
    releaseArtifactRef: record.releaseArtifactRef,
    statusLabel: formatPublishQueueStatusLabel(record.status),
    queuedWeekLabel:
      record.queuedWeek !== undefined && Number.isFinite(record.queuedWeek)
        ? `W${record.queuedWeek}`
        : '—',
    creditingHookCount: record.creditingHooks.length,
    publishHookCount: record.publishHooks.length,
    reasonCodeCount: record.reasonCodes.length,
  })
}

/** Read-only mirror over hydrated `publishQueueRecords`; does not re-validate hidden truth. */
export function getPublishQueueMirrorView(game: GameState): PublishQueueMirrorView {
  const records = listPersistedRecords(game)
  const counts = summarizePublishQueueRecords(game.publishQueueRecords)

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      ...counts,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(record))),
  })
}
