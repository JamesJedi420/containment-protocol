/** SPE-2902 / SPE-62 keyed hold-aim / abort / delayed-emission ledgers. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'
import {
  isUnsafeVolatileActionHoldId,
  parseVolatileActionHoldInput,
  type VolatileActionHoldInput,
} from './volatileActionPhasePipeline'

export type VolatileActionHoldKind = 'hold_aim' | 'abort' | 'delayed_emission'

export type VolatileActionHoldLedgerEntry =
  | {
      readonly sequence: number
      readonly kind: 'hold_aim' | 'delayed_emission'
    }
  | {
      readonly sequence: number
      readonly kind: 'abort'
      readonly reason: string
    }

export interface VolatileActionHoldLedger {
  readonly instanceId: string
  readonly encounterId: string
  readonly entries: readonly VolatileActionHoldLedgerEntry[]
}

export type VolatileActionHoldRecords = Readonly<Record<string, VolatileActionHoldLedger>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function assertSafeId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty trimmed string.`)
  }
  if (isUnsafeVolatileActionHoldId(value)) {
    throw new Error(`${field} is unsafe.`)
  }
  return value
}

function snapshotEntry(entry: VolatileActionHoldLedgerEntry): VolatileActionHoldLedgerEntry {
  return Object.freeze(
    entry.kind === 'abort'
      ? { sequence: entry.sequence, kind: 'abort' as const, reason: entry.reason }
      : { sequence: entry.sequence, kind: entry.kind }
  )
}

function snapshotLedger(ledger: VolatileActionHoldLedger): VolatileActionHoldLedger {
  return Object.freeze({
    instanceId: ledger.instanceId,
    encounterId: ledger.encounterId,
    entries: Object.freeze(ledger.entries.map(snapshotEntry)),
  })
}

function snapshotHoldRecords(
  records: VolatileActionHoldRecords
): VolatileActionHoldRecords | undefined {
  const keys = Object.keys(records).sort(compareCodeUnits)
  if (keys.length === 0) return undefined
  const next: Record<string, VolatileActionHoldLedger> = {}
  for (const key of keys) {
    next[key] = snapshotLedger(records[key])
  }
  return Object.freeze(next)
}

function parseHoldKind(value: unknown): VolatileActionHoldKind | undefined {
  if (value === 'hold_aim' || value === 'abort' || value === 'delayed_emission') {
    return value
  }
  return undefined
}

function parseLedgerEntry(
  value: unknown,
  expectedSequence: number
): VolatileActionHoldLedgerEntry | undefined {
  if (!isRecord(value)) return undefined
  if (value.sequence !== expectedSequence) return undefined
  const kind = parseHoldKind(value.kind)
  if (kind === undefined) return undefined
  if (kind === 'abort') {
    if (
      typeof value.reason !== 'string' ||
      value.reason.length === 0 ||
      value.reason !== value.reason.trim()
    ) {
      return undefined
    }
    return { sequence: expectedSequence, kind: 'abort', reason: value.reason }
  }
  return { sequence: expectedSequence, kind }
}

function parseLedger(key: string, value: unknown): VolatileActionHoldLedger | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.instanceId !== 'string' || value.instanceId !== key) return undefined
  if (isUnsafeVolatileActionHoldId(value.instanceId)) return undefined
  if (
    typeof value.encounterId !== 'string' ||
    value.encounterId.length === 0 ||
    value.encounterId !== value.encounterId.trim() ||
    isUnsafeVolatileActionHoldId(value.encounterId)
  ) {
    return undefined
  }
  if (!Array.isArray(value.entries) || value.entries.length === 0) return undefined

  const entries: VolatileActionHoldLedgerEntry[] = []
  for (let index = 0; index < value.entries.length; index += 1) {
    const entry = parseLedgerEntry(value.entries[index], index)
    if (entry === undefined) return undefined
    entries.push(entry)
  }

  return {
    instanceId: value.instanceId,
    encounterId: value.encounterId,
    entries,
  }
}

/**
 * Hydrate optional `GameState.volatileActionHoldRecords`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Integer-index, prototype-unsafe, key/id mismatch, and malformed siblings drop independently.
 * Valid ledgers insert in code-unit key order.
 */
export function parseVolatileActionHoldRecords(
  value: unknown
): VolatileActionHoldRecords | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: Record<string, VolatileActionHoldLedger> = {}
  for (const key of Object.keys(value).sort(compareCodeUnits)) {
    if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue
    if (isUnsafeVolatileActionHoldId(key) || key.length === 0 || key !== key.trim()) continue
    const ledger = parseLedger(key, value[key])
    if (ledger === undefined) continue
    next[key] = ledger
  }
  return snapshotHoldRecords(next)
}

function latestEntryInput(
  ledger: VolatileActionHoldLedger
): Exclude<VolatileActionHoldInput, { kind: 'none' }> {
  const latest = ledger.entries[ledger.entries.length - 1]
  if (latest.kind === 'abort') {
    return { kind: 'abort', instanceId: ledger.instanceId, reason: latest.reason }
  }
  return { kind: latest.kind, instanceId: ledger.instanceId }
}

/**
 * Read the current hold disposition for one instance.
 * Blank or unsafe `instanceId` throws. Absent ledger returns `{ kind: 'none' }`.
 */
export function readVolatileActionHold(
  state: GameState,
  instanceId: unknown
): VolatileActionHoldInput {
  const safeInstanceId = assertSafeId(instanceId, 'hold instanceId')
  const records = parseVolatileActionHoldRecords(state.volatileActionHoldRecords)
  const ledger = records?.[safeInstanceId]
  if (ledger === undefined) {
    return { kind: 'none' }
  }
  return parseVolatileActionHoldInput(latestEntryInput(ledger))
}

/**
 * Append a hold-aim / abort / delayed-emission entry keyed by instanceId.
 * Missing or unsafe encounter/instance keys throw. Existing ledgers keep prior
 * entries and append a correction; encounterId must keep matching.
 */
export function recordVolatileActionHold(
  state: GameState,
  input: unknown
): { state: GameState; ledger: VolatileActionHoldLedger } {
  const parsed = parseVolatileActionHoldInput(
    isRecord(input)
      ? { kind: input.kind, instanceId: input.instanceId, reason: input.reason }
      : input
  )
  if (parsed.kind === 'none') {
    throw new Error('hold kind must be hold_aim, abort, or delayed_emission.')
  }

  const encounterId = assertSafeId(isRecord(input) ? input.encounterId : undefined, 'encounterId')
  const current = parseVolatileActionHoldRecords(state.volatileActionHoldRecords) ?? {}
  const existing = current[parsed.instanceId]
  if (existing && existing.encounterId !== encounterId) {
    throw new Error('hold encounterId must match the existing instance encounterId.')
  }

  const nextEntry: VolatileActionHoldLedgerEntry =
    parsed.kind === 'abort'
      ? {
          sequence: existing ? existing.entries.length : 0,
          kind: 'abort',
          reason: parsed.reason,
        }
      : {
          sequence: existing ? existing.entries.length : 0,
          kind: parsed.kind,
        }

  const ledger = snapshotLedger({
    instanceId: parsed.instanceId,
    encounterId,
    entries: existing ? [...existing.entries, nextEntry] : [nextEntry],
  })
  const volatileActionHoldRecords = snapshotHoldRecords({
    ...current,
    [parsed.instanceId]: ledger,
  })
  const nextState: GameState = { ...ensureNormalizedGameState(state) }
  if (volatileActionHoldRecords === undefined) {
    delete nextState.volatileActionHoldRecords
  } else {
    nextState.volatileActionHoldRecords = volatileActionHoldRecords
  }
  return { state: nextState, ledger }
}
