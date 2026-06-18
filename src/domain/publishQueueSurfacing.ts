/**
 * SPE-2485 slice 1: read-only surfacing for publish-queue records and dry-run receipts.
 *
 * CP-neutral labels only; no real publish side effects.
 */

import type { PublishAutomationStatus } from './publishAutomationCreditingHooks'
import type { PublishQueueRecord, PublishQueueRecordsMap } from './publishAutomationCreditingHooks'
import type {
  PublishQueueExecutionReceipt,
  PublishQueueExecutorOutcome,
  PublishQueueExecutorSkipCode,
} from './publishQueueExecutor'

export function formatPublishQueueStatusLabel(status: PublishAutomationStatus | string): string {
  return status
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatPublishQueueExecutorOutcomeLabel(outcome: PublishQueueExecutorOutcome): string {
  switch (outcome) {
    case 'completed':
      return 'Completed (dry-run)'
    case 'skipped':
      return 'Skipped'
    case 'rejected':
      return 'Rejected'
    default: {
      const unreachable: never = outcome
      return unreachable
    }
  }
}

export function formatPublishQueueSkipCodeLabel(skipCode: PublishQueueExecutorSkipCode): string {
  switch (skipCode) {
    case 'already_published':
      return 'already published'
    case 'record_not_ready_to_publish':
      return 'record not ready to publish'
    case 'missing_publish_channel_hook':
      return 'missing publish channel hook'
    default: {
      const unreachable: never = skipCode
      return unreachable
    }
  }
}

export function isReportablePublishQueueReceipt(receipt: PublishQueueExecutionReceipt): boolean {
  if (receipt.outcome === 'completed' || receipt.outcome === 'rejected') {
    return true
  }

  if (receipt.outcome === 'skipped' && receipt.skipCode !== 'already_published') {
    return true
  }

  return false
}

export function listReportablePublishQueueReceipts(
  receipts: readonly PublishQueueExecutionReceipt[] | null | undefined
): readonly PublishQueueExecutionReceipt[] {
  if (!receipts || receipts.length === 0) {
    return Object.freeze([])
  }

  return Object.freeze(
    [...receipts]
      .filter((receipt) => isReportablePublishQueueReceipt(receipt))
      .sort((left, right) => left.recordId.localeCompare(right.recordId))
  )
}

export function formatPublishQueueExecutionReceiptNoteContent(input: {
  receipt: PublishQueueExecutionReceipt
  record: PublishQueueRecord | undefined
}): string {
  const label = input.record?.label ?? input.receipt.recordId
  const statusLabel = input.record
    ? formatPublishQueueStatusLabel(input.record.status)
    : 'Unknown'
  const outcomeLabel = formatPublishQueueExecutorOutcomeLabel(input.receipt.outcome)
  const skipSegment =
    input.receipt.skipCode !== undefined
      ? ` (${formatPublishQueueSkipCodeLabel(input.receipt.skipCode)})`
      : ''
  const stubSegment = input.receipt.publishChannelStub
    ? ` Dry-run channel: ${input.receipt.publishChannelStub}.`
    : ''

  return `Publish queue (dry-run) — ${input.receipt.recordId}: ${label} [${statusLabel}]. Outcome: ${outcomeLabel}${skipSegment}.${stubSegment}`
}

export function summarizePublishQueueRecords(
  records: PublishQueueRecordsMap | null | undefined
): {
  readonly totalRecords: number
  readonly readyToPublishCount: number
  readonly publishedCount: number
  readonly terminalCount: number
} {
  const safeRecords = records ?? {}
  const values = Object.values(safeRecords)

  return Object.freeze({
    totalRecords: values.length,
    readyToPublishCount: values.filter((record) => record.status === 'ready_to_publish').length,
    publishedCount: values.filter((record) => record.status === 'published').length,
    terminalCount: values.filter(
      (record) => record.status === 'needs_revision' || record.status === 'rejected'
    ).length,
  })
}
