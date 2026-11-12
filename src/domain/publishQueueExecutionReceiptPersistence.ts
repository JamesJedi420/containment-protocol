/**
 * SPE-2495 slice 1: GameState publish-queue execution-receipt persistence.
 *
 * Bounded ledger keyed by `${recordId}@${executionWeek}`. Composes upstream
 * executor receipts for save/import; does not execute publish actions.
 */

import {
  CREDITING_HOOK_KINDS,
  PUBLISH_HOOK_KINDS,
  type PublishQueueRecord,
  type PublishQueueRecordsMap,
} from './publishAutomationCreditingHooks'
import type {
  PublishHookStubApplication,
  PublishHookStubKind,
  PublishQueueExecutionReceipt,
} from './publishQueueExecutor'
import {
  isPublishQueueExecutorOutcome,
  isPublishQueueExecutorSkipCode,
} from './publishQueueExecutor'
import { isReportablePublishQueueReceipt } from './publishQueueSurfacing'

export type PublishQueueExecutionReceiptKey = string
export type PublishQueueExecutionReceiptsMap = Record<
  PublishQueueExecutionReceiptKey,
  PublishQueueExecutionReceipt
>

export const MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS = 64

const HOOK_KIND_SET = new Set<string>([...CREDITING_HOOK_KINDS, ...PUBLISH_HOOK_KINDS])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
}

function isPublishHookStubKind(value: string): value is PublishHookStubKind {
  return HOOK_KIND_SET.has(value)
}

function parseAppliedHook(value: unknown): PublishHookStubApplication | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const kind = normalizeToken(value.kind)
  const target = normalizeToken(value.target)
  const payload = normalizeToken(value.payload)
  const channelStub = normalizeToken(value.channelStub)

  if (!kind || !target || !payload || !channelStub || !isPublishHookStubKind(kind)) {
    return null
  }

  return Object.freeze({
    kind,
    target,
    payload,
    channelStub,
  })
}

function parseAppliedHooks(value: unknown): readonly PublishHookStubApplication[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const hooks: PublishHookStubApplication[] = []

  for (const entry of value) {
    const hook = parseAppliedHook(entry)
    if (!hook) {
      return null
    }

    hooks.push(hook)
  }

  return Object.freeze(hooks)
}

function freezeReceipt(receipt: PublishQueueExecutionReceipt): PublishQueueExecutionReceipt {
  return Object.freeze({
    ...receipt,
    appliedHooks: Object.freeze(receipt.appliedHooks.map((hook) => Object.freeze({ ...hook }))),
  })
}

function receiptsEqual(
  left: PublishQueueExecutionReceipt,
  right: PublishQueueExecutionReceipt
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function compareReceiptKeys(
  left: PublishQueueExecutionReceipt,
  right: PublishQueueExecutionReceipt
): number {
  if (left.executionWeek !== right.executionWeek) {
    return left.executionWeek - right.executionWeek
  }

  return left.recordId.localeCompare(right.recordId)
}

/** Stable map key for one record execution in a given week. */
export function buildPublishQueueExecutionReceiptKey(
  recordId: string,
  executionWeek: number
): PublishQueueExecutionReceiptKey | null {
  const id = normalizeToken(recordId)
  if (!id || !isFiniteWeek(executionWeek)) {
    return null
  }

  return `${id}@${Math.trunc(executionWeek)}`
}

function sanitizePublishQueueExecutionReceiptEntry(
  key: string,
  value: unknown
): PublishQueueExecutionReceipt | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const recordId = normalizeToken(value.recordId)
  const outcome = value.outcome
  const executionWeekRaw = value.executionWeek

  if (
    !recordId ||
    typeof outcome !== 'string' ||
    !isPublishQueueExecutorOutcome(outcome) ||
    !isFiniteWeek(executionWeekRaw)
  ) {
    return null
  }

  const executionWeek = Math.trunc(executionWeekRaw)
  const expectedKey = buildPublishQueueExecutionReceiptKey(recordId, executionWeek)
  if (!expectedKey || expectedKey !== normalizeToken(key)) {
    return null
  }

  const appliedHooks = parseAppliedHooks(value.appliedHooks)
  if (!appliedHooks) {
    return null
  }

  const skipCodeRaw = value.skipCode
  let skipCode: PublishQueueExecutionReceipt['skipCode']

  if (skipCodeRaw !== undefined) {
    if (typeof skipCodeRaw !== 'string' || !isPublishQueueExecutorSkipCode(skipCodeRaw)) {
      return null
    }

    skipCode = skipCodeRaw
  }

  if (outcome === 'skipped' && !skipCode) {
    return null
  }

  if (outcome === 'completed' && skipCode) {
    return null
  }

  const publishChannelStub =
    typeof value.publishChannelStub === 'string' && value.publishChannelStub.trim().length > 0
      ? value.publishChannelStub.trim()
      : undefined
  const publishChannelRef =
    typeof value.publishChannelRef === 'string' && value.publishChannelRef.trim().length > 0
      ? value.publishChannelRef.trim()
      : undefined

  return freezeReceipt({
    recordId,
    outcome,
    executionWeek,
    appliedHooks,
    ...(publishChannelStub ? { publishChannelStub } : {}),
    ...(publishChannelRef ? { publishChannelRef } : {}),
    ...(skipCode ? { skipCode } : {}),
  })
}

function enforcePublishQueueExecutionReceiptBound(
  map: PublishQueueExecutionReceiptsMap
): PublishQueueExecutionReceiptsMap {
  const entries = Object.entries(map)
  const receipts = entries.map(([, receipt]) => receipt)
  receipts.sort(compareReceiptKeys)

  if (entries.length <= MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS) {
    const next: PublishQueueExecutionReceiptsMap = {}
    for (const receipt of receipts) {
      const key = buildPublishQueueExecutionReceiptKey(receipt.recordId, receipt.executionWeek)
      if (key) {
        next[key] = receipt
      }
    }
    return Object.keys(next).length > 0 ? next : {}
  }

  const retained = receipts.slice(-MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS)
  const next: PublishQueueExecutionReceiptsMap = {}

  for (const receipt of retained) {
    const key = buildPublishQueueExecutionReceiptKey(receipt.recordId, receipt.executionWeek)
    if (key) {
      next[key] = receipt
    }
  }

  const bounded: PublishQueueExecutionReceiptsMap = {}
  for (const receipt of Object.values(next).sort(compareReceiptKeys)) {
    const key = buildPublishQueueExecutionReceiptKey(receipt.recordId, receipt.executionWeek)
    if (key) {
      bounded[key] = receipt
    }
  }

  return Object.keys(bounded).length > 0 ? bounded : {}
}

function receiptAlignsWithRecord(
  receipt: PublishQueueExecutionReceipt,
  record: PublishQueueRecord
): boolean {
  if (receipt.recordId !== record.id) {
    return false
  }

  if (receipt.outcome === 'completed' && record.status !== 'published') {
    return false
  }

  return true
}

/** Validate and freeze an upstream executor receipt for persistence. */
export function composePublishQueueExecutionReceipt(
  receipt: PublishQueueExecutionReceipt
): PublishQueueExecutionReceipt | null {
  const key = buildPublishQueueExecutionReceiptKey(receipt.recordId, receipt.executionWeek)
  if (!key) {
    return null
  }

  return sanitizePublishQueueExecutionReceiptEntry(key, receipt)
}

/** Hydration: canonical receipt map; drops invalid, duplicate, and orphaned entries. */
export function sanitizePublishQueueExecutionReceipts(
  value: unknown,
  fallback: PublishQueueExecutionReceiptsMap = {},
  knownRecordIds?: ReadonlySet<string>
): PublishQueueExecutionReceiptsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const candidates: PublishQueueExecutionReceipt[] = []

  for (const [key, entry] of Object.entries(value)) {
    const receipt = sanitizePublishQueueExecutionReceiptEntry(key, entry)
    if (!receipt) {
      continue
    }

    if (knownRecordIds && !knownRecordIds.has(receipt.recordId)) {
      continue
    }

    candidates.push(receipt)
  }

  if (candidates.length === 0) {
    return fallback
  }

  candidates.sort(compareReceiptKeys)

  const next: PublishQueueExecutionReceiptsMap = {}
  const seenKeys = new Set<string>()

  for (const receipt of candidates) {
    const key = buildPublishQueueExecutionReceiptKey(receipt.recordId, receipt.executionWeek)
    if (!key || seenKeys.has(key)) {
      continue
    }

    seenKeys.add(key)
    next[key] = receipt
  }

  return enforcePublishQueueExecutionReceiptBound(next)
}

export interface MergePublishQueueExecutionReceiptsOptions {
  readonly records: PublishQueueRecordsMap
}

/** Merge reportable weekly tick receipts into the persisted ledger. */
export function mergePublishQueueExecutionReceipts(
  existing: PublishQueueExecutionReceiptsMap | null | undefined,
  receipts: readonly PublishQueueExecutionReceipt[] | null | undefined,
  options: MergePublishQueueExecutionReceiptsOptions
): PublishQueueExecutionReceiptsMap {
  const base = existing ?? {}

  if (!receipts || receipts.length === 0) {
    return base
  }

  let next: PublishQueueExecutionReceiptsMap | null = null

  for (const rawReceipt of receipts) {
    if (!isReportablePublishQueueReceipt(rawReceipt)) {
      continue
    }

    const record = options.records[rawReceipt.recordId]
    if (!record || !receiptAlignsWithRecord(rawReceipt, record)) {
      continue
    }

    const composed = composePublishQueueExecutionReceipt(rawReceipt)
    if (!composed) {
      continue
    }

    const key = buildPublishQueueExecutionReceiptKey(composed.recordId, composed.executionWeek)
    if (!key) {
      continue
    }

    const previous = (next ?? base)[key]
    if (previous && receiptsEqual(previous, composed)) {
      continue
    }

    if (!next) {
      next = { ...base }
    }

    next[key] = composed
  }

  return enforcePublishQueueExecutionReceiptBound(next ?? base)
}
