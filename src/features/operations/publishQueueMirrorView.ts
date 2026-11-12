import type { GameState } from '../../domain/models'
import type { PublishQueueRecord, PublishQueueRecordsMap } from '../../domain/publishAutomationCreditingHooks'
import type { PublishQueueExecutionReceipt } from '../../domain/publishQueueExecutor'
import {
  formatPublishQueueExecutorOutcomeLabel,
  formatPublishQueueSkipCodeLabel,
  formatPublishQueueStatusLabel,
  resolvePublishQueueReceiptExecutionMode,
  summarizePublishQueueExecutionReceipts,
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

export interface PublishQueueMirrorReceiptView {
  mapKey: string
  recordId: string
  recordLabel: string
  executionWeekLabel: string
  outcomeLabel: string
  skipCodeLabel: string | undefined
  executionModeLabel: string
  channelLabel: string
  appliedHookCount: number
}

export interface PublishQueueMirrorReceiptSummaryView {
  totalReceipts: number
  completedDryRunCount: number
  completedLiveCount: number
  rejectedCount: number
  skippedReportableCount: number
}

export interface PublishQueueMirrorView {
  isEmpty: boolean
  summary: PublishQueueMirrorSummaryView
  records: readonly PublishQueueMirrorRecordView[]
  receiptsEmpty: boolean
  receiptSummary: PublishQueueMirrorReceiptSummaryView
  receipts: readonly PublishQueueMirrorReceiptView[]
}

function listPersistedRecords(game: GameState): PublishQueueRecord[] {
  const map = game.publishQueueRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function listPersistedReceipts(
  game: GameState
): readonly { mapKey: string; receipt: PublishQueueExecutionReceipt }[] {
  const map = game.publishQueueExecutionReceipts ?? {}
  return Object.entries(map)
    .sort(([, leftReceipt], [, rightReceipt]) => {
      if (rightReceipt.executionWeek !== leftReceipt.executionWeek) {
        return rightReceipt.executionWeek - leftReceipt.executionWeek
      }
      return leftReceipt.recordId.localeCompare(rightReceipt.recordId)
    })
    .map(([mapKey, receipt]) => ({ mapKey, receipt }))
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

function toReceiptView(
  mapKey: string,
  receipt: PublishQueueExecutionReceipt,
  records: PublishQueueRecordsMap
): PublishQueueMirrorReceiptView {
  const executionMode = resolvePublishQueueReceiptExecutionMode(receipt)
  const record = records[receipt.recordId]

  return Object.freeze({
    mapKey,
    recordId: receipt.recordId,
    recordLabel: record?.label ?? receipt.recordId,
    executionWeekLabel:
      Number.isFinite(receipt.executionWeek) && receipt.executionWeek >= 1
        ? `W${receipt.executionWeek}`
        : '—',
    outcomeLabel: formatPublishQueueExecutorOutcomeLabel(receipt.outcome, executionMode),
    skipCodeLabel:
      receipt.skipCode !== undefined
        ? formatPublishQueueSkipCodeLabel(receipt.skipCode)
        : undefined,
    executionModeLabel: executionMode === 'live' ? 'Live' : 'Dry-run',
    channelLabel:
      receipt.publishChannelRef?.trim() ||
      receipt.publishChannelStub?.trim() ||
      '—',
    appliedHookCount: receipt.appliedHooks.length,
  })
}

/** Read-only mirror over hydrated `publishQueueRecords`; does not re-validate hidden truth. */
export function getPublishQueueMirrorView(game: GameState): PublishQueueMirrorView {
  const records = listPersistedRecords(game)
  const counts = summarizePublishQueueRecords(game.publishQueueRecords)
  const receiptEntries = listPersistedReceipts(game)
  const receiptCounts = summarizePublishQueueExecutionReceipts(game.publishQueueExecutionReceipts)
  const recordsMap = game.publishQueueRecords ?? {}

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      ...counts,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(record))),
    receiptsEmpty: receiptEntries.length === 0,
    receiptSummary: Object.freeze(receiptCounts),
    receipts: Object.freeze(
      receiptEntries.map(({ mapKey, receipt }) => toReceiptView(mapKey, receipt, recordsMap))
    ),
  })
}
