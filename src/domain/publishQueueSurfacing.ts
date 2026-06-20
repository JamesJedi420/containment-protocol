/**
 * SPE-2485 slice 1: read-only surfacing for publish-queue records and execution receipts.
 * SPE-2491 slice 1: live vs dry-run receipt labels.
 *
 * CP-neutral labels only; no publish side effects from surfacing helpers.
 */

import type { PublishAutomationStatus } from './publishAutomationCreditingHooks'
import type { PublishQueueRecord, PublishQueueRecordsMap } from './publishAutomationCreditingHooks'
import type {
  PublishQueueExecutionReceipt,
  PublishQueueExecutorOutcome,
  PublishQueueExecutorSkipCode,
} from './publishQueueExecutor'
import type { PublishQueueExecutionMode } from './publishQueueGitHubClient'
import type { PublishQueueExecutionReceiptsMap } from './publishQueueExecutionReceiptPersistence'

export function formatPublishQueueStatusLabel(status: PublishAutomationStatus | string): string {
  return status
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function resolvePublishQueueReceiptExecutionMode(
  receipt: PublishQueueExecutionReceipt
): PublishQueueExecutionMode {
  return receipt.publishChannelRef ? 'live' : 'dry-run'
}

export function formatPublishQueueExecutorOutcomeLabel(
  outcome: PublishQueueExecutorOutcome,
  executionMode: PublishQueueExecutionMode = 'dry-run'
): string {
  switch (outcome) {
    case 'completed':
      return executionMode === 'live' ? 'Completed (live)' : 'Completed (dry-run)'
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
    case 'unsupported_publish_channel_target':
      return 'unsupported publish channel target'
    case 'publish_channel_pull_request_unresolved':
      return 'publish channel pull request unresolved'
    case 'publish_channel_approval_unresolved':
      return 'publish channel approval unresolved'
    case 'publish_channel_api_failed':
      return 'publish channel API failed'
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
  const executionMode = resolvePublishQueueReceiptExecutionMode(input.receipt)
  const channelLabel = executionMode === 'live' ? 'live' : 'dry-run'
  const label = input.record?.label ?? input.receipt.recordId
  const statusLabel = input.record
    ? formatPublishQueueStatusLabel(input.record.status)
    : 'Unknown'
  const outcomeLabel = formatPublishQueueExecutorOutcomeLabel(input.receipt.outcome, executionMode)
  const skipSegment =
    input.receipt.skipCode !== undefined
      ? ` (${formatPublishQueueSkipCodeLabel(input.receipt.skipCode)})`
      : ''
  const channelSegment = input.receipt.publishChannelRef
    ? ` Live channel ref: ${input.receipt.publishChannelRef}.`
    : input.receipt.publishChannelStub
      ? ` Dry-run channel: ${input.receipt.publishChannelStub}.`
      : ''

  return `Publish queue (${channelLabel}) — ${input.receipt.recordId}: ${label} [${statusLabel}]. Outcome: ${outcomeLabel}${skipSegment}.${channelSegment}`
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

export function summarizePublishQueueExecutionReceipts(
  receipts: PublishQueueExecutionReceiptsMap | null | undefined
): {
  readonly totalReceipts: number
  readonly completedDryRunCount: number
  readonly completedLiveCount: number
  readonly rejectedCount: number
  readonly skippedReportableCount: number
} {
  const safeReceipts = receipts ?? {}
  const values = Object.values(safeReceipts)

  let completedDryRunCount = 0
  let completedLiveCount = 0
  let rejectedCount = 0
  let skippedReportableCount = 0

  for (const receipt of values) {
    switch (receipt.outcome) {
      case 'completed': {
        if (resolvePublishQueueReceiptExecutionMode(receipt) === 'live') {
          completedLiveCount += 1
        } else {
          completedDryRunCount += 1
        }
        break
      }
      case 'rejected':
        rejectedCount += 1
        break
      case 'skipped':
        if (receipt.skipCode !== 'already_published') {
          skippedReportableCount += 1
        }
        break
      default: {
        const unreachable: never = receipt.outcome
        void unreachable
      }
    }
  }

  return Object.freeze({
    totalReceipts: values.length,
    completedDryRunCount,
    completedLiveCount,
    rejectedCount,
    skippedReportableCount,
  })
}
