/**
 * SPE-2484 slice 1: publish-queue dry-run executor.
 * SPE-2488 slice 1: optional live `pr-merge` GitHub API path with dry-run default.
 * SPE-2498 slice 1: optional live `manual-approval` injectable sync client path.
 *
 * Pure deterministic executor consuming persisted publish-queue records and
 * SPE-2480 hook descriptors. Dry-run uses bounded channel stubs; live mode
 * calls an injectable GitHub client and only mutates records on API success.
 */

import type {
  CreditingHookDescriptor,
  CreditingHookKind,
  PublishHookDescriptor,
  PublishHookKind,
  PublishQueueRecord,
  PublishQueueRecordsMap,
} from './publishAutomationCreditingHooks'
import {
  validatePublishQueueRecord,
  withPublishQueueRecordStatus,
} from './publishAutomationCreditingHooks'
import type {
  PublishQueueGitHubClient,
  PublishQueueGitHubClientSync,
  PublishQueueGitHubConfig,
  PublishQueueGitHubMergeRequest,
  PublishQueueGitHubMergeResult,
} from './publishQueueGitHubClient'
import {
  buildPrMergeGitHubRequest,
  formatPublishQueueGitHubMergeSuccessRef,
} from './publishQueueGitHubClient'
import type {
  PublishQueueManualApprovalClientSync,
  PublishQueueManualApprovalRequest,
  PublishQueueManualApprovalResult,
} from './publishQueueManualApprovalClient'
import {
  buildManualApprovalRequest,
  formatPublishQueueManualApprovalSuccessRef,
} from './publishQueueManualApprovalClient'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PublishQueueExecutorOutcome = 'completed' | 'skipped' | 'rejected'

export const PUBLISH_QUEUE_EXECUTOR_OUTCOMES: readonly PublishQueueExecutorOutcome[] = [
  'completed',
  'skipped',
  'rejected',
] as const

export type PublishQueueExecutorSkipCode =
  | 'record_not_ready_to_publish'
  | 'already_published'
  | 'missing_publish_channel_hook'
  | 'unsupported_publish_channel_target'
  | 'publish_channel_pull_request_unresolved'
  | 'publish_channel_approval_unresolved'
  | 'publish_channel_api_failed'

export const PUBLISH_QUEUE_EXECUTOR_SKIP_CODES: readonly PublishQueueExecutorSkipCode[] = [
  'record_not_ready_to_publish',
  'already_published',
  'missing_publish_channel_hook',
  'unsupported_publish_channel_target',
  'publish_channel_pull_request_unresolved',
  'publish_channel_approval_unresolved',
  'publish_channel_api_failed',
] as const

export type PublishHookStubKind = CreditingHookKind | PublishHookKind

export interface PublishHookStubApplication {
  readonly kind: PublishHookStubKind
  readonly target: string
  readonly payload: string
  readonly channelStub: string
}

export interface PublishQueueExecutionReceipt {
  readonly recordId: string
  readonly outcome: PublishQueueExecutorOutcome
  readonly executionWeek: number
  readonly appliedHooks: readonly PublishHookStubApplication[]
  readonly publishChannelStub?: string
  readonly publishChannelRef?: string
  readonly skipCode?: PublishQueueExecutorSkipCode
}

export interface PublishQueueExecutorOptions {
  readonly week?: number
  readonly maxHookApplications?: number
}

export interface PublishQueueLiveExecutorOptions extends PublishQueueExecutorOptions {
  readonly githubClient?: PublishQueueGitHubClient
  readonly githubConfig?: Pick<PublishQueueGitHubConfig, 'owner' | 'repo'>
  readonly manualApprovalClient?: PublishQueueManualApprovalClientSync
}

export interface PublishQueueLiveExecutorSyncOptions extends PublishQueueExecutorOptions {
  readonly githubClient?: PublishQueueGitHubClientSync
  readonly githubConfig?: Pick<PublishQueueGitHubConfig, 'owner' | 'repo'>
  readonly manualApprovalClient?: PublishQueueManualApprovalClientSync
}

export interface PublishQueueExecutionResult {
  readonly record: PublishQueueRecord
  readonly receipt: PublishQueueExecutionReceipt
}

export interface PublishQueueBatchExecutionResult {
  readonly records: PublishQueueRecordsMap
  readonly receipts: readonly PublishQueueExecutionReceipt[]
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const DEFAULT_MAX_HOOK_APPLICATIONS = 32

const EXECUTOR_OUTCOME_SET = new Set<string>(PUBLISH_QUEUE_EXECUTOR_OUTCOMES)
const EXECUTOR_SKIP_CODE_SET = new Set<string>(PUBLISH_QUEUE_EXECUTOR_SKIP_CODES)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeWeek(week: number | undefined): number {
  if (week === undefined || !Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function resolveMaxHookApplications(maxHookApplications?: number): number {
  if (
    maxHookApplications === undefined ||
    !Number.isFinite(maxHookApplications) ||
    maxHookApplications < 1
  ) {
    return DEFAULT_MAX_HOOK_APPLICATIONS
  }

  return Math.trunc(maxHookApplications)
}

function buildChannelStub(kind: PublishHookStubKind, target: string, payload: string): string {
  return `dry-run:${kind}:${target}:${payload}`
}

function freezeHookApplication(application: PublishHookStubApplication): PublishHookStubApplication {
  return Object.freeze({ ...application })
}

function freezeReceipt(receipt: PublishQueueExecutionReceipt): PublishQueueExecutionReceipt {
  return Object.freeze({
    ...receipt,
    appliedHooks: Object.freeze(receipt.appliedHooks.map((hook) => freezeHookApplication(hook))),
  })
}

function creditingHookToStub(hook: CreditingHookDescriptor): PublishHookStubApplication {
  return freezeHookApplication({
    kind: hook.kind,
    target: hook.target,
    payload: hook.payload,
    channelStub: buildChannelStub(hook.kind, hook.target, hook.payload),
  })
}

function publishHookToStub(hook: PublishHookDescriptor): PublishHookStubApplication {
  return freezeHookApplication({
    kind: hook.kind,
    target: hook.target,
    payload: hook.payload,
    channelStub: buildChannelStub(hook.kind, hook.target, hook.payload),
  })
}

function findPublishChannelHook(record: PublishQueueRecord): PublishHookDescriptor | undefined {
  return record.publishHooks.find((hook) => hook.kind === 'publish_channel')
}

function buildAppliedHookStubs(
  record: PublishQueueRecord,
  maxHookApplications: number
): readonly PublishHookStubApplication[] {
  const applications: PublishHookStubApplication[] = []

  for (const hook of record.creditingHooks) {
    if (applications.length >= maxHookApplications) {
      break
    }

    applications.push(creditingHookToStub(hook))
  }

  for (const hook of record.publishHooks) {
    if (applications.length >= maxHookApplications) {
      break
    }

    applications.push(publishHookToStub(hook))
  }

  return Object.freeze(applications)
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isPublishQueueExecutorOutcome(value: string): value is PublishQueueExecutorOutcome {
  return EXECUTOR_OUTCOME_SET.has(value)
}

export function isPublishQueueExecutorSkipCode(value: string): value is PublishQueueExecutorSkipCode {
  return EXECUTOR_SKIP_CODE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes one publish-queue record through bounded dry-run channel stubs.
 * Only `ready_to_publish` records transition to `published`; other statuses
 * are rejected without mutation. Re-execution of `published` records is
 * idempotent (skipped, record byte-stable).
 */
function buildPreExecutionReceipt(
  record: PublishQueueRecord,
  executionWeek: number
):
  | { readonly kind: 'continue' }
  | { readonly kind: 'result'; readonly result: PublishQueueExecutionResult } {
  if (record.status === 'published') {
    return {
      kind: 'result',
      result: {
        record,
        receipt: freezeReceipt({
          recordId: record.id,
          outcome: 'skipped',
          executionWeek,
          appliedHooks: Object.freeze([]),
          skipCode: 'already_published',
        }),
      },
    }
  }

  if (record.status !== 'ready_to_publish') {
    return {
      kind: 'result',
      result: {
        record,
        receipt: freezeReceipt({
          recordId: record.id,
          outcome: 'rejected',
          executionWeek,
          appliedHooks: Object.freeze([]),
          skipCode: 'record_not_ready_to_publish',
        }),
      },
    }
  }

  const publishChannelHook = findPublishChannelHook(record)
  if (!publishChannelHook) {
    return {
      kind: 'result',
      result: {
        record,
        receipt: freezeReceipt({
          recordId: record.id,
          outcome: 'rejected',
          executionWeek,
          appliedHooks: Object.freeze([]),
          skipCode: 'missing_publish_channel_hook',
        }),
      },
    }
  }

  return { kind: 'continue' }
}

function finalizePublishedExecution(
  record: PublishQueueRecord,
  executionWeek: number,
  appliedHooks: readonly PublishHookStubApplication[],
  channelReceipt: Pick<PublishQueueExecutionReceipt, 'publishChannelStub' | 'publishChannelRef'>
): PublishQueueExecutionResult {
  const nextRecord = withPublishQueueRecordStatus(record, 'published') ?? record

  const receipt = freezeReceipt({
    recordId: record.id,
    outcome: 'completed',
    executionWeek,
    appliedHooks,
    ...channelReceipt,
  })

  if (!validatePublishQueueRecord(nextRecord).valid) {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'record_not_ready_to_publish',
      }),
    }
  }

  return {
    record: nextRecord,
    receipt,
  }
}

export function executePublishQueueRecordDryRun(
  record: PublishQueueRecord,
  options: PublishQueueExecutorOptions = {}
): PublishQueueExecutionResult {
  const executionWeek = normalizeWeek(options.week)
  const maxHookApplications = resolveMaxHookApplications(options.maxHookApplications)
  const preExecution = buildPreExecutionReceipt(record, executionWeek)

  if (preExecution.kind === 'result') {
    return preExecution.result
  }

  const publishChannelHook = findPublishChannelHook(record)!
  const appliedHooks = buildAppliedHookStubs(record, maxHookApplications)
  const publishChannelStub = buildChannelStub(
    publishChannelHook.kind,
    publishChannelHook.target,
    publishChannelHook.payload
  )

  return finalizePublishedExecution(record, executionWeek, appliedHooks, {
    publishChannelStub,
  })
}

function finalizeLiveMergeExecution(
  record: PublishQueueRecord,
  executionWeek: number,
  maxHookApplications: number,
  mergeRequest: PublishQueueGitHubMergeRequest | undefined,
  mergeResult: PublishQueueGitHubMergeResult | undefined
): PublishQueueExecutionResult {
  const publishChannelHook = findPublishChannelHook(record)!
  const appliedHooks = buildAppliedHookStubs(record, maxHookApplications)

  if (publishChannelHook.target !== 'pr-merge') {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'unsupported_publish_channel_target',
      }),
    }
  }

  if (!mergeRequest) {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'publish_channel_pull_request_unresolved',
      }),
    }
  }

  if (!mergeResult || !mergeResult.ok) {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'publish_channel_api_failed',
      }),
    }
  }

  return finalizePublishedExecution(record, executionWeek, appliedHooks, {
    publishChannelRef: formatPublishQueueGitHubMergeSuccessRef(mergeRequest, mergeResult),
  })
}

function finalizeLiveManualApprovalExecution(
  record: PublishQueueRecord,
  executionWeek: number,
  maxHookApplications: number,
  approvalRequest: PublishQueueManualApprovalRequest | undefined,
  approvalResult: PublishQueueManualApprovalResult | undefined
): PublishQueueExecutionResult {
  const publishChannelHook = findPublishChannelHook(record)!
  const appliedHooks = buildAppliedHookStubs(record, maxHookApplications)

  if (publishChannelHook.target !== 'manual-approval') {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'unsupported_publish_channel_target',
      }),
    }
  }

  if (!approvalRequest) {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'publish_channel_approval_unresolved',
      }),
    }
  }

  if (!approvalResult || !approvalResult.ok) {
    return {
      record,
      receipt: freezeReceipt({
        recordId: record.id,
        outcome: 'rejected',
        executionWeek,
        appliedHooks: Object.freeze([]),
        skipCode: 'publish_channel_api_failed',
      }),
    }
  }

  return finalizePublishedExecution(record, executionWeek, appliedHooks, {
    publishChannelRef: formatPublishQueueManualApprovalSuccessRef(
      approvalRequest,
      approvalResult
    ),
  })
}

function executePublishQueueRecordLiveSyncInternal(
  record: PublishQueueRecord,
  executionWeek: number,
  maxHookApplications: number,
  options: PublishQueueLiveExecutorSyncOptions
): PublishQueueExecutionResult {
  const publishChannelHook = findPublishChannelHook(record)!

  switch (publishChannelHook.target) {
    case 'pr-merge': {
      if (!options.githubClient || !options.githubConfig) {
        return {
          record,
          receipt: freezeReceipt({
            recordId: record.id,
            outcome: 'rejected',
            executionWeek,
            appliedHooks: Object.freeze([]),
            skipCode: 'publish_channel_api_failed',
          }),
        }
      }

      const mergeRequest = buildPrMergeGitHubRequest(
        publishChannelHook,
        record,
        options.githubConfig
      )
      const mergeResult = mergeRequest
        ? options.githubClient.mergePullRequest(mergeRequest)
        : undefined

      return finalizeLiveMergeExecution(
        record,
        executionWeek,
        maxHookApplications,
        mergeRequest,
        mergeResult
      )
    }
    case 'manual-approval': {
      if (!options.manualApprovalClient) {
        return {
          record,
          receipt: freezeReceipt({
            recordId: record.id,
            outcome: 'rejected',
            executionWeek,
            appliedHooks: Object.freeze([]),
            skipCode: 'publish_channel_api_failed',
          }),
        }
      }

      const approvalRequest = buildManualApprovalRequest(publishChannelHook, record)
      const approvalResult = approvalRequest
        ? options.manualApprovalClient.resolveApproval(approvalRequest)
        : undefined

      return finalizeLiveManualApprovalExecution(
        record,
        executionWeek,
        maxHookApplications,
        approvalRequest,
        approvalResult
      )
    }
    default:
      return {
        record,
        receipt: freezeReceipt({
          recordId: record.id,
          outcome: 'rejected',
          executionWeek,
          appliedHooks: Object.freeze([]),
          skipCode: 'unsupported_publish_channel_target',
        }),
      }
  }
}

async function executePublishQueueRecordLiveInternal(
  record: PublishQueueRecord,
  executionWeek: number,
  maxHookApplications: number,
  options: PublishQueueLiveExecutorOptions
): Promise<PublishQueueExecutionResult> {
  const publishChannelHook = findPublishChannelHook(record)!

  switch (publishChannelHook.target) {
    case 'pr-merge': {
      if (!options.githubClient || !options.githubConfig) {
        return {
          record,
          receipt: freezeReceipt({
            recordId: record.id,
            outcome: 'rejected',
            executionWeek,
            appliedHooks: Object.freeze([]),
            skipCode: 'publish_channel_api_failed',
          }),
        }
      }

      const mergeRequest = buildPrMergeGitHubRequest(
        publishChannelHook,
        record,
        options.githubConfig
      )
      const mergeResult = mergeRequest
        ? await options.githubClient.mergePullRequest(mergeRequest)
        : undefined

      return finalizeLiveMergeExecution(
        record,
        executionWeek,
        maxHookApplications,
        mergeRequest,
        mergeResult
      )
    }
    case 'manual-approval': {
      if (!options.manualApprovalClient) {
        return {
          record,
          receipt: freezeReceipt({
            recordId: record.id,
            outcome: 'rejected',
            executionWeek,
            appliedHooks: Object.freeze([]),
            skipCode: 'publish_channel_api_failed',
          }),
        }
      }

      const approvalRequest = buildManualApprovalRequest(publishChannelHook, record)
      const approvalResult = approvalRequest
        ? options.manualApprovalClient.resolveApproval(approvalRequest)
        : undefined

      return finalizeLiveManualApprovalExecution(
        record,
        executionWeek,
        maxHookApplications,
        approvalRequest,
        approvalResult
      )
    }
    default:
      return {
        record,
        receipt: freezeReceipt({
          recordId: record.id,
          outcome: 'rejected',
          executionWeek,
          appliedHooks: Object.freeze([]),
          skipCode: 'unsupported_publish_channel_target',
        }),
      }
  }
}

/**
 * Executes one publish-queue record through the live channel path for supported
 * publish targets (`pr-merge`, `manual-approval`). Failed client calls reject
 * without mutating the record. Re-execution of `published` records remains
 * idempotent (skipped, record byte-stable).
 */
export async function executePublishQueueRecordLive(
  record: PublishQueueRecord,
  options: PublishQueueLiveExecutorOptions
): Promise<PublishQueueExecutionResult> {
  const executionWeek = normalizeWeek(options.week)
  const maxHookApplications = resolveMaxHookApplications(options.maxHookApplications)
  const preExecution = buildPreExecutionReceipt(record, executionWeek)

  if (preExecution.kind === 'result') {
    return preExecution.result
  }

  return executePublishQueueRecordLiveInternal(
    record,
    executionWeek,
    maxHookApplications,
    options
  )
}

/**
 * Synchronous live executor for weekly orchestration inside `advanceWeek`.
 * Requires an injectable sync GitHub client (tests/CI harness).
 */
export function executePublishQueueRecordLiveSync(
  record: PublishQueueRecord,
  options: PublishQueueLiveExecutorSyncOptions
): PublishQueueExecutionResult {
  const executionWeek = normalizeWeek(options.week)
  const maxHookApplications = resolveMaxHookApplications(options.maxHookApplications)
  const preExecution = buildPreExecutionReceipt(record, executionWeek)

  if (preExecution.kind === 'result') {
    return preExecution.result
  }

  return executePublishQueueRecordLiveSyncInternal(
    record,
    executionWeek,
    maxHookApplications,
    options
  )
}

/**
 * Executes all publish-queue records in stable id order. Invalid map entries
 * should already be dropped by sanitize/hydrate; this pass only mutates records
 * that complete dry-run execution.
 */
export function executePublishQueueRecordsDryRun(
  records: PublishQueueRecordsMap | null | undefined,
  options: PublishQueueExecutorOptions = {}
): PublishQueueBatchExecutionResult {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return {
      records: safeRecords,
      receipts: Object.freeze([]),
    }
  }

  let nextRecords: PublishQueueRecordsMap | null = null
  const receipts: PublishQueueExecutionReceipt[] = []

  for (const recordId of recordIds) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const sourceRecord = (nextRecords ?? safeRecords)[recordId] ?? record
    const result = executePublishQueueRecordDryRun(sourceRecord, options)

    receipts.push(result.receipt)

    if (result.record === sourceRecord) {
      continue
    }

    if (!nextRecords) {
      nextRecords = { ...safeRecords }
    }

    nextRecords[recordId] = result.record
  }

  return {
    records: nextRecords ?? safeRecords,
    receipts: Object.freeze(receipts.map((receipt) => freezeReceipt(receipt))),
  }
}

/**
 * Weekly batch hook: one deterministic dry-run execution pass over the publish
 * queue. Re-applying for the same week on already-published records is
 * idempotent (skipped receipts, records byte-stable).
 */
export function applyWeeklyPublishQueueExecutionTick(
  records: PublishQueueRecordsMap | null | undefined,
  week: number,
  options: Omit<PublishQueueExecutorOptions, 'week'> = {}
): PublishQueueBatchExecutionResult {
  return executePublishQueueRecordsDryRun(records, { ...options, week })
}

/**
 * Batch live execution in stable id order. Only records that complete a
 * successful live channel transition mutate the returned map.
 */
export async function executePublishQueueRecordsLive(
  records: PublishQueueRecordsMap | null | undefined,
  options: PublishQueueLiveExecutorOptions
): Promise<PublishQueueBatchExecutionResult> {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return {
      records: safeRecords,
      receipts: Object.freeze([]),
    }
  }

  let nextRecords: PublishQueueRecordsMap | null = null
  const receipts: PublishQueueExecutionReceipt[] = []

  for (const recordId of recordIds) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const sourceRecord = (nextRecords ?? safeRecords)[recordId] ?? record
    const result = await executePublishQueueRecordLive(sourceRecord, options)

    receipts.push(result.receipt)

    if (result.record === sourceRecord) {
      continue
    }

    if (!nextRecords) {
      nextRecords = { ...safeRecords }
    }

    nextRecords[recordId] = result.record
  }

  return {
    records: nextRecords ?? safeRecords,
    receipts: Object.freeze(receipts.map((receipt) => freezeReceipt(receipt))),
  }
}

/**
 * Synchronous batch live execution for weekly orchestration inside `advanceWeek`.
 */
export function executePublishQueueRecordsLiveSync(
  records: PublishQueueRecordsMap | null | undefined,
  options: PublishQueueLiveExecutorSyncOptions
): PublishQueueBatchExecutionResult {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return {
      records: safeRecords,
      receipts: Object.freeze([]),
    }
  }

  let nextRecords: PublishQueueRecordsMap | null = null
  const receipts: PublishQueueExecutionReceipt[] = []

  for (const recordId of recordIds) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const sourceRecord = (nextRecords ?? safeRecords)[recordId] ?? record
    const result = executePublishQueueRecordLiveSync(sourceRecord, options)

    receipts.push(result.receipt)

    if (result.record === sourceRecord) {
      continue
    }

    if (!nextRecords) {
      nextRecords = { ...safeRecords }
    }

    nextRecords[recordId] = result.record
  }

  return {
    records: nextRecords ?? safeRecords,
    receipts: Object.freeze(receipts.map((receipt) => freezeReceipt(receipt))),
  }
}
