/**
 * SPE-2484 slice 1: publish-queue dry-run executor.
 *
 * Pure deterministic executor consuming persisted publish-queue records and
 * SPE-2480 hook descriptors with bounded channel stubs — no CI/GitHub API
 * calls, UI, or real publish side effects.
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

export const PUBLISH_QUEUE_EXECUTOR_SKIP_CODES: readonly PublishQueueExecutorSkipCode[] = [
  'record_not_ready_to_publish',
  'already_published',
  'missing_publish_channel_hook',
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
  readonly skipCode?: PublishQueueExecutorSkipCode
}

export interface PublishQueueExecutorOptions {
  readonly week?: number
  readonly maxHookApplications?: number
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
export function executePublishQueueRecordDryRun(
  record: PublishQueueRecord,
  options: PublishQueueExecutorOptions = {}
): PublishQueueExecutionResult {
  const executionWeek = normalizeWeek(options.week)
  const maxHookApplications = resolveMaxHookApplications(options.maxHookApplications)

  if (record.status === 'published') {
    const receipt = freezeReceipt({
      recordId: record.id,
      outcome: 'skipped',
      executionWeek,
      appliedHooks: Object.freeze([]),
      skipCode: 'already_published',
    })

    return {
      record,
      receipt,
    }
  }

  if (record.status !== 'ready_to_publish') {
    const receipt = freezeReceipt({
      recordId: record.id,
      outcome: 'rejected',
      executionWeek,
      appliedHooks: Object.freeze([]),
      skipCode: 'record_not_ready_to_publish',
    })

    return {
      record,
      receipt,
    }
  }

  const publishChannelHook = findPublishChannelHook(record)
  if (!publishChannelHook) {
    const receipt = freezeReceipt({
      recordId: record.id,
      outcome: 'rejected',
      executionWeek,
      appliedHooks: Object.freeze([]),
      skipCode: 'missing_publish_channel_hook',
    })

    return {
      record,
      receipt,
    }
  }

  const appliedHooks = buildAppliedHookStubs(record, maxHookApplications)
  const publishChannelStub = buildChannelStub(
    publishChannelHook.kind,
    publishChannelHook.target,
    publishChannelHook.payload
  )
  const nextRecord =
    withPublishQueueRecordStatus(record, 'published') ??
    record

  const receipt = freezeReceipt({
    recordId: record.id,
    outcome: 'completed',
    executionWeek,
    appliedHooks,
    publishChannelStub,
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
