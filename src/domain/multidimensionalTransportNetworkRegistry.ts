/**
 * SPE-2149 slice 1 — multidimensional transport network registry.
 *
 * Pure deterministic registry for layered route/network governance metadata:
 * network layers, fare/access rules, station risk bands, and a registry-only
 * lost-person queue. No GameState, live traversal, map UI, or continuity handoff.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER = 'SPE-2149' as const

export type FareAccessMode = 'open' | 'credential' | 'clearance' | 'denied'

export type StationRiskLevel = 'low' | 'elevated' | 'critical' | 'lossy'

export type LostPersonQueuePriority = 'routine' | 'elevated' | 'urgent'

export interface NetworkLayerRef {
  readonly id: string
  readonly label: string
  /** Stable sort key for deterministic layer ordering (0–999). */
  readonly ordinal: number
}

export interface FareAccessRule {
  readonly id: string
  readonly layerRefId: string
  readonly mode: FareAccessMode
  /** Inclusive station band start (0–100). */
  readonly stationBandStart: number
  /** Inclusive station band end (0–100). */
  readonly stationBandEnd: number
}

export interface StationRiskBand {
  readonly id: string
  readonly layerRefId: string
  readonly stationRef: string
  readonly risk: StationRiskLevel
}

export interface LostPersonQueueEntry {
  readonly id: string
  readonly subjectRef: string
  readonly lastKnownStationRef: string
  readonly layerRefId: string
  readonly priority: LostPersonQueuePriority
  /** Insertion sequence used when priorities tie (0–1_000_000). */
  readonly insertedAtSequence: number
}

export interface MultidimensionalTransportNetworkRecord {
  readonly id: string
  readonly label: string
  readonly networkLayerRefs: readonly NetworkLayerRef[]
  readonly fareAccessRules: readonly FareAccessRule[]
  readonly stationRiskBands: readonly StationRiskBand[]
  readonly lostPersonQueue: readonly LostPersonQueueEntry[]
  readonly owner: typeof MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER
}

export type TransportNetworkValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'empty_network_layer_refs'
  | 'duplicate_layer_ref'
  | 'invalid_layer_ref'
  | 'invalid_fare_access_rule'
  | 'unknown_layer_ref'
  | 'overlapping_contradictory_access'
  | 'invalid_station_risk_band'
  | 'invalid_lost_person_entry'
  | 'duplicate_lost_person_entry'
  | 'owner_mismatch'

export interface TransportNetworkValidationIssue {
  readonly code: TransportNetworkValidationCode
  readonly path: string
  readonly message: string
}

export interface TransportNetworkValidationResult {
  readonly valid: boolean
  readonly issues: readonly TransportNetworkValidationIssue[]
}

export interface TransportNetworkProjection {
  readonly networkId: string
  readonly layerCount: number
  readonly orderedLayerIds: readonly string[]
  readonly accessRuleCount: number
  readonly stationRiskCount: number
  readonly lostPersonQueueOrdered: readonly LostPersonQueueEntry[]
  readonly owner: typeof MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER
}

const FARE_MODES = new Set<FareAccessMode>(['open', 'credential', 'clearance', 'denied'])
const RISK_LEVELS = new Set<StationRiskLevel>(['low', 'elevated', 'critical', 'lossy'])
const QUEUE_PRIORITIES = new Set<LostPersonQueuePriority>(['routine', 'elevated', 'urgent'])

const PRIORITY_RANK: Readonly<Record<LostPersonQueuePriority, number>> = {
  urgent: 0,
  elevated: 1,
  routine: 2,
}

function issue(
  code: TransportNetworkValidationCode,
  path: string,
  message: string
): TransportNetworkValidationIssue {
  return { code, path, message }
}

function bandsOverlap(a: FareAccessRule, b: FareAccessRule): boolean {
  return a.stationBandStart <= b.stationBandEnd && b.stationBandStart <= a.stationBandEnd
}

function assertLayer(layer: NetworkLayerRef, path: string): NetworkLayerRef {
  if (typeof layer !== 'object' || layer === null || Array.isArray(layer)) {
    throw new Error(`${path} is required`)
  }
  const id = assertNonEmptyId(layer.id, `${path}.id`)
  const label = assertNonEmptyId(layer.label, `${path}.label`)
  const ordinal = assertSafeIntegerInRange(layer.ordinal, `${path}.ordinal`, 0, 999)
  return Object.freeze({ id, label, ordinal })
}

function assertFareRule(rule: FareAccessRule, path: string): FareAccessRule {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    throw new Error(`${path} is required`)
  }
  const id = assertNonEmptyId(rule.id, `${path}.id`)
  const layerRefId = assertNonEmptyId(rule.layerRefId, `${path}.layerRefId`)
  if (!FARE_MODES.has(rule.mode)) throw new Error(`${path}.mode is invalid`)
  const stationBandStart = assertSafeIntegerInRange(
    rule.stationBandStart,
    `${path}.stationBandStart`,
    0,
    100
  )
  const stationBandEnd = assertSafeIntegerInRange(
    rule.stationBandEnd,
    `${path}.stationBandEnd`,
    0,
    100
  )
  if (stationBandStart > stationBandEnd) {
    throw new Error(`${path} station band start must be <= end`)
  }
  return Object.freeze({
    id,
    layerRefId,
    mode: rule.mode,
    stationBandStart,
    stationBandEnd,
  })
}

function assertRiskBand(band: StationRiskBand, path: string): StationRiskBand {
  if (typeof band !== 'object' || band === null || Array.isArray(band)) {
    throw new Error(`${path} is required`)
  }
  const id = assertNonEmptyId(band.id, `${path}.id`)
  const layerRefId = assertNonEmptyId(band.layerRefId, `${path}.layerRefId`)
  const stationRef = assertNonEmptyId(band.stationRef, `${path}.stationRef`)
  if (!RISK_LEVELS.has(band.risk)) throw new Error(`${path}.risk is invalid`)
  return Object.freeze({ id, layerRefId, stationRef, risk: band.risk })
}

function assertQueueEntry(entry: LostPersonQueueEntry, path: string): LostPersonQueueEntry {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new Error(`${path} is required`)
  }
  const id = assertNonEmptyId(entry.id, `${path}.id`)
  const subjectRef = assertNonEmptyId(entry.subjectRef, `${path}.subjectRef`)
  const lastKnownStationRef = assertNonEmptyId(
    entry.lastKnownStationRef,
    `${path}.lastKnownStationRef`
  )
  const layerRefId = assertNonEmptyId(entry.layerRefId, `${path}.layerRefId`)
  if (!QUEUE_PRIORITIES.has(entry.priority)) throw new Error(`${path}.priority is invalid`)
  const insertedAtSequence = assertSafeIntegerInRange(
    entry.insertedAtSequence,
    `${path}.insertedAtSequence`,
    0,
    1_000_000
  )
  return Object.freeze({
    id,
    subjectRef,
    lastKnownStationRef,
    layerRefId,
    priority: entry.priority,
    insertedAtSequence,
  })
}

/**
 * Deterministic lost-person queue order: priority rank, then insertion sequence, then id.
 */
export function orderLostPersonQueue(
  entries: readonly LostPersonQueueEntry[]
): readonly LostPersonQueueEntry[] {
  if (!Array.isArray(entries)) throw new Error('lostPersonQueue must be an array')
  const normalized = entries.map((entry, index) =>
    assertQueueEntry(entry, `lostPersonQueue[${index}]`)
  )
  return Object.freeze(
    [...normalized].sort((a, b) => {
      const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (byPriority !== 0) return byPriority
      if (a.insertedAtSequence !== b.insertedAtSequence) {
        return a.insertedAtSequence - b.insertedAtSequence
      }
      return a.id.localeCompare(b.id)
    })
  )
}

/**
 * Insert one operational metadata entry and return a deterministically ordered queue.
 * Does not own missing-person lifecycle or rescue search (SPE-3433).
 */
export function insertLostPersonQueueEntry(
  queue: readonly LostPersonQueueEntry[],
  entry: LostPersonQueueEntry
): readonly LostPersonQueueEntry[] {
  const existing = orderLostPersonQueue(queue)
  const next = assertQueueEntry(entry, 'entry')
  if (existing.some((item) => item.id === next.id)) {
    throw new Error('lost-person queue entry ids must be unique')
  }
  return orderLostPersonQueue([...existing, next])
}

export function createMultidimensionalTransportNetworkRecord(
  input: Omit<MultidimensionalTransportNetworkRecord, 'owner' | 'lostPersonQueue'> & {
    readonly lostPersonQueue?: readonly LostPersonQueueEntry[]
  }
): MultidimensionalTransportNetworkRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('transport network record is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  const label = assertNonEmptyId(input.label, 'label')
  if (!Array.isArray(input.networkLayerRefs) || input.networkLayerRefs.length < 1) {
    throw new Error('networkLayerRefs must be non-empty')
  }
  const networkLayerRefs = Object.freeze(
    input.networkLayerRefs.map((layer, index) => assertLayer(layer, `networkLayerRefs[${index}]`))
  )
  const fareAccessRules = Object.freeze(
    (input.fareAccessRules ?? []).map((rule, index) =>
      assertFareRule(rule, `fareAccessRules[${index}]`)
    )
  )
  const stationRiskBands = Object.freeze(
    (input.stationRiskBands ?? []).map((band, index) =>
      assertRiskBand(band, `stationRiskBands[${index}]`)
    )
  )
  const lostPersonQueue = orderLostPersonQueue(input.lostPersonQueue ?? [])

  const record: MultidimensionalTransportNetworkRecord = Object.freeze({
    id,
    label,
    networkLayerRefs,
    fareAccessRules,
    stationRiskBands,
    lostPersonQueue,
    owner: MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
  })

  const validation = validateMultidimensionalTransportNetworkRecord(record)
  if (!validation.valid) {
    const first = validation.issues[0]
    throw new Error(first ? `${first.code}: ${first.message}` : 'transport network invalid')
  }
  return record
}

export function validateMultidimensionalTransportNetworkRecord(
  record: unknown
): TransportNetworkValidationResult {
  const issues: TransportNetworkValidationIssue[] = []
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return {
      valid: false,
      issues: [issue('missing_id', 'record', 'transport network record is required')],
    }
  }

  const packet = record as Partial<MultidimensionalTransportNetworkRecord>
  if (typeof packet.id !== 'string' || !packet.id.trim()) {
    issues.push(issue('missing_id', 'id', 'id is required'))
  }
  if (typeof packet.label !== 'string' || !packet.label.trim()) {
    issues.push(issue('missing_label', 'label', 'label is required'))
  }
  if (packet.owner !== undefined && packet.owner !== MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER) {
    issues.push(issue('owner_mismatch', 'owner', 'owner must be SPE-2149'))
  }

  const layers = Array.isArray(packet.networkLayerRefs) ? packet.networkLayerRefs : null
  if (!layers || layers.length < 1) {
    issues.push(
      issue('empty_network_layer_refs', 'networkLayerRefs', 'networkLayerRefs must be non-empty')
    )
  }

  const layerIds = new Set<string>()
  if (layers) {
    layers.forEach((layer, index) => {
      try {
        const normalized = assertLayer(layer as NetworkLayerRef, `networkLayerRefs[${index}]`)
        if (layerIds.has(normalized.id)) {
          issues.push(
            issue(
              'duplicate_layer_ref',
              `networkLayerRefs[${index}]`,
              `duplicate layer ref ${normalized.id}`
            )
          )
        }
        layerIds.add(normalized.id)
      } catch (error) {
        issues.push(
          issue(
            'invalid_layer_ref',
            `networkLayerRefs[${index}]`,
            error instanceof Error ? error.message : 'invalid layer ref'
          )
        )
      }
    })
  }

  const rules = Array.isArray(packet.fareAccessRules) ? packet.fareAccessRules : []
  const normalizedRules: FareAccessRule[] = []
  rules.forEach((rule, index) => {
    try {
      const normalized = assertFareRule(rule as FareAccessRule, `fareAccessRules[${index}]`)
      if (layerIds.size > 0 && !layerIds.has(normalized.layerRefId)) {
        issues.push(
          issue(
            'unknown_layer_ref',
            `fareAccessRules[${index}].layerRefId`,
            `unknown layer ref ${normalized.layerRefId}`
          )
        )
      } else {
        // Only known-layer rules participate in conflict detection.
        normalizedRules.push(normalized)
      }
    } catch (error) {
      issues.push(
        issue(
          'invalid_fare_access_rule',
          `fareAccessRules[${index}]`,
          error instanceof Error ? error.message : 'invalid fare access rule'
        )
      )
    }
  })

  for (let i = 0; i < normalizedRules.length; i += 1) {
    for (let j = i + 1; j < normalizedRules.length; j += 1) {
      const left = normalizedRules[i]!
      const right = normalizedRules[j]!
      if (
        left.layerRefId === right.layerRefId &&
        left.mode !== right.mode &&
        bandsOverlap(left, right)
      ) {
        issues.push(
          issue(
            'overlapping_contradictory_access',
            `fareAccessRules[${i}]`,
            `rules ${left.id} and ${right.id} overlap on ${left.layerRefId} with modes ${left.mode}/${right.mode}`
          )
        )
      }
    }
  }

  const bands = Array.isArray(packet.stationRiskBands) ? packet.stationRiskBands : []
  bands.forEach((band, index) => {
    try {
      const normalized = assertRiskBand(band as StationRiskBand, `stationRiskBands[${index}]`)
      if (layerIds.size > 0 && !layerIds.has(normalized.layerRefId)) {
        issues.push(
          issue(
            'unknown_layer_ref',
            `stationRiskBands[${index}].layerRefId`,
            `unknown layer ref ${normalized.layerRefId}`
          )
        )
      }
    } catch (error) {
      issues.push(
        issue(
          'invalid_station_risk_band',
          `stationRiskBands[${index}]`,
          error instanceof Error ? error.message : 'invalid station risk band'
        )
      )
    }
  })

  const queue = Array.isArray(packet.lostPersonQueue) ? packet.lostPersonQueue : []
  const queueIds = new Set<string>()
  queue.forEach((entry, index) => {
    try {
      const normalized = assertQueueEntry(
        entry as LostPersonQueueEntry,
        `lostPersonQueue[${index}]`
      )
      if (layerIds.size > 0 && !layerIds.has(normalized.layerRefId)) {
        issues.push(
          issue(
            'unknown_layer_ref',
            `lostPersonQueue[${index}].layerRefId`,
            `unknown layer ref ${normalized.layerRefId}`
          )
        )
      }
      if (queueIds.has(normalized.id)) {
        issues.push(
          issue(
            'duplicate_lost_person_entry',
            `lostPersonQueue[${index}]`,
            `duplicate lost-person entry ${normalized.id}`
          )
        )
      }
      queueIds.add(normalized.id)
    } catch (error) {
      issues.push(
        issue(
          'invalid_lost_person_entry',
          `lostPersonQueue[${index}]`,
          error instanceof Error ? error.message : 'invalid lost-person entry'
        )
      )
    }
  })

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  })
}

export function projectTransportNetworkRegistry(
  record: MultidimensionalTransportNetworkRecord
): TransportNetworkProjection {
  const validation = validateMultidimensionalTransportNetworkRecord(record)
  if (!validation.valid) {
    const first = validation.issues[0]
    throw new Error(first ? `${first.code}: ${first.message}` : 'transport network invalid')
  }

  const orderedLayerIds = Object.freeze(
    [...record.networkLayerRefs]
      .sort((a, b) => a.ordinal - b.ordinal || a.id.localeCompare(b.id))
      .map((layer) => layer.id)
  )

  return Object.freeze({
    networkId: record.id,
    layerCount: record.networkLayerRefs.length,
    orderedLayerIds,
    accessRuleCount: record.fareAccessRules.length,
    stationRiskCount: record.stationRiskBands.length,
    lostPersonQueueOrdered: orderLostPersonQueue(record.lostPersonQueue),
    owner: MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
  })
}

/** Legal multi-layer fixture with non-overlapping access rules. */
export const LAYERED_ROUTE_GOVERNANCE_FIXTURE: MultidimensionalTransportNetworkRecord =
  createMultidimensionalTransportNetworkRecord({
    id: 'transport-network:layered-hub-alpha',
    label: 'Layered hub alpha',
    networkLayerRefs: [
      { id: 'layer:surface-rail', label: 'Surface rail', ordinal: 0 },
      { id: 'layer:under-channel', label: 'Under-channel', ordinal: 1 },
    ],
    fareAccessRules: [
      {
        id: 'fare:surface-open',
        layerRefId: 'layer:surface-rail',
        mode: 'open',
        stationBandStart: 0,
        stationBandEnd: 40,
      },
      {
        id: 'fare:surface-clearance',
        layerRefId: 'layer:surface-rail',
        mode: 'clearance',
        stationBandStart: 41,
        stationBandEnd: 100,
      },
      {
        id: 'fare:channel-credential',
        layerRefId: 'layer:under-channel',
        mode: 'credential',
        stationBandStart: 0,
        stationBandEnd: 100,
      },
    ],
    stationRiskBands: [
      {
        id: 'risk:surface-terminus',
        layerRefId: 'layer:surface-rail',
        stationRef: 'station:terminus-north',
        risk: 'elevated',
      },
      {
        id: 'risk:channel-rift',
        layerRefId: 'layer:under-channel',
        stationRef: 'station:rift-dock',
        risk: 'lossy',
      },
    ],
    lostPersonQueue: [
      {
        id: 'lost:queue-routine-7',
        subjectRef: 'person:transit-subject-7',
        lastKnownStationRef: 'station:terminus-north',
        layerRefId: 'layer:surface-rail',
        priority: 'routine',
        insertedAtSequence: 2,
      },
      {
        id: 'lost:queue-urgent-3',
        subjectRef: 'person:transit-subject-3',
        lastKnownStationRef: 'station:rift-dock',
        layerRefId: 'layer:under-channel',
        priority: 'urgent',
        insertedAtSequence: 1,
      },
      {
        id: 'lost:queue-elevated-5',
        subjectRef: 'person:transit-subject-5',
        lastKnownStationRef: 'station:terminus-north',
        layerRefId: 'layer:surface-rail',
        priority: 'elevated',
        insertedAtSequence: 0,
      },
    ],
  })

/** Overlapping contradictory access rules on one layer (validation fixture). */
export const CONTRADICTORY_ACCESS_RULE_FIXTURE: Omit<
  MultidimensionalTransportNetworkRecord,
  'owner'
> = {
  id: 'transport-network:contradictory-access',
  label: 'Contradictory access fixture',
  networkLayerRefs: [{ id: 'layer:surface-rail', label: 'Surface rail', ordinal: 0 }],
  fareAccessRules: [
    {
      id: 'fare:open-band',
      layerRefId: 'layer:surface-rail',
      mode: 'open',
      stationBandStart: 10,
      stationBandEnd: 50,
    },
    {
      id: 'fare:denied-overlap',
      layerRefId: 'layer:surface-rail',
      mode: 'denied',
      stationBandStart: 40,
      stationBandEnd: 70,
    },
  ],
  stationRiskBands: [],
  lostPersonQueue: [],
}
