/**
 * SPE-3386 — explicit facility dependency inputs.
 *
 * Validates caller-supplied availability facts and provenance, then resolves
 * them with the SPE-3383 kernel. This module does not read facility lifecycle
 * status, installed effects, workshop gates, or GameState. A missing or
 * malformed packet fails closed before any consumer can treat it as ready.
 */

import type { FacilityStatus } from './models'
import {
  FACILITY_DEPENDENCY_AVAILABILITIES,
  type FacilityDependencyAvailability,
  type FacilityDependencyAvailabilityResult,
  type FacilityDependencyRejection,
  resolveFacilityDependencyAvailability,
  validateFacilityDependencyGraph,
} from './facilityDependencyGraph'

export const FACILITY_DEPENDENCY_INPUT_REJECTIONS = [
  'malformed_source',
  'unsupported_status_filter',
  'missing_source',
] as const
export type FacilityDependencyInputRejection = (typeof FACILITY_DEPENDENCY_INPUT_REJECTIONS)[number]

export interface FacilityDependencySourceInput {
  readonly availability: FacilityDependencyAvailability
  readonly sourceRef: string
}

export type FacilityDependencyInputMap =
  | {
      readonly ok: true
      readonly sources: Readonly<Record<string, FacilityDependencyAvailability>>
      readonly inputs: Readonly<Record<string, FacilityDependencySourceInput>>
    }
  | {
      readonly ok: false
      readonly rejection: FacilityDependencyInputRejection | FacilityDependencyRejection
    }

export type FacilityDependencyInputResolution =
  | {
      readonly ok: true
      readonly results: readonly FacilityDependencyAvailabilityResult[]
      readonly inputs: Readonly<Record<string, FacilityDependencySourceInput>>
    }
  | {
      readonly ok: false
      readonly rejection: FacilityDependencyInputRejection | FacilityDependencyRejection
    }

/** SPE-3380 lifecycle words. They are not dependency availability. */
const FACILITY_LIFECYCLE_STATUSES = {
  available: true,
  constructing: true,
  inspecting: true,
  active: true,
  upgrading: true,
  inactive: true,
  locked: true,
} as const satisfies Record<FacilityStatus, true>

/** Named installed FacilityEffect keys. They are not effective availability. */
const INSTALLED_EFFECT_KEYS = [
  'researchSlots',
  'researchSpeedMultiplier',
  'dataPoolPerWeek',
  'materialsPoolPerWeek',
  'trainingSlots',
  'recoveryThroughput',
] as const

const FACILITY_INSTANCE_KEYS = ['facilityId', 'effects', 'lifecycleHistory', 'category'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isLifecycleStatus(value: unknown): value is FacilityStatus {
  return typeof value === 'string' && Object.hasOwn(FACILITY_LIFECYCLE_STATUSES, value)
}

function isAvailability(value: unknown): value is FacilityDependencyAvailability {
  return FACILITY_DEPENDENCY_AVAILABILITIES.some((availability) => availability === value)
}

function rejectInput(rejection: FacilityDependencyInputRejection | FacilityDependencyRejection): {
  readonly ok: false
  readonly rejection: FacilityDependencyInputRejection | FacilityDependencyRejection
} {
  return Object.freeze({ ok: false, rejection })
}

function hasInstalledEffectKey(record: Record<string, unknown>): boolean {
  return INSTALLED_EFFECT_KEYS.some((key) => hasOwn(record, key))
}

function hasFacilityInstanceKey(record: Record<string, unknown>): boolean {
  return FACILITY_INSTANCE_KEYS.some((key) => hasOwn(record, key))
}

function parseNodeFact(
  entry: Record<string, unknown>
): FacilityDependencySourceInput | FacilityDependencyInputRejection {
  if (hasOwn(entry, 'status') || isLifecycleStatus(entry.availability)) {
    return 'unsupported_status_filter'
  }
  if (typeof entry.availability === 'number' || hasInstalledEffectKey(entry)) {
    return 'malformed_source'
  }
  if (!isAvailability(entry.availability)) return 'malformed_source'
  if (!hasOwn(entry, 'sourceRef')) return 'missing_source'
  if (typeof entry.sourceRef !== 'string') return 'malformed_source'
  if (entry.sourceRef.trim().length === 0) return 'missing_source'
  for (const key of Object.keys(entry)) {
    if (key !== 'availability' && key !== 'sourceRef') return 'malformed_source'
  }
  return Object.freeze({
    availability: entry.availability,
    sourceRef: entry.sourceRef,
  })
}

/**
 * Validate an explicit source packet against a functional graph.
 * Every node needs `ready`, `degraded`, or `unavailable` plus a nonempty
 * `sourceRef`. Lifecycle status and installed effects do not become availability.
 * An invalid graph returns that kernel rejection and no sources.
 */
export function mapExplicitFacilityDependencySources(
  graph: unknown,
  packet: unknown
): FacilityDependencyInputMap {
  const validated = validateFacilityDependencyGraph(graph)
  if (!validated.ok) return validated

  if (!isRecord(packet)) return rejectInput('malformed_source')
  if (hasOwn(packet, 'status') && isLifecycleStatus(packet.status)) {
    return rejectInput('unsupported_status_filter')
  }
  if (hasFacilityInstanceKey(packet)) return rejectInput('malformed_source')

  const nodeIds = new Set(validated.graph.nodes.map((node) => node.id))
  const parsed = new Map<string, FacilityDependencySourceInput>()
  const packetIds = Object.keys(packet).sort(compareCodeUnit)
  for (const id of packetIds) {
    if (!nodeIds.has(id)) return rejectInput('malformed_source')
    const entry = packet[id]
    if (isLifecycleStatus(entry)) return rejectInput('unsupported_status_filter')
    if (typeof entry === 'number') return rejectInput('malformed_source')
    if (!isRecord(entry)) return rejectInput('malformed_source')
    const fact = parseNodeFact(entry)
    if (typeof fact === 'string') return rejectInput(fact)
    parsed.set(id, fact)
  }

  const sources: Record<string, FacilityDependencyAvailability> = {}
  const inputs: Record<string, FacilityDependencySourceInput> = {}
  for (const node of validated.graph.nodes) {
    const fact = parsed.get(node.id)
    if (!fact) return rejectInput('missing_source')
    sources[node.id] = fact.availability
    inputs[node.id] = fact
  }

  return Object.freeze({
    ok: true,
    sources: Object.freeze(sources),
    inputs: Object.freeze(inputs),
  })
}

/**
 * Resolve explicit provenance-bearing inputs with the unchanged SPE-3383 kernel.
 * Source failure returns an adapter rejection and no node results.
 */
export function resolveExplicitFacilityDependencyAvailability(
  graph: unknown,
  packet: unknown
): FacilityDependencyInputResolution {
  const mapped = mapExplicitFacilityDependencySources(graph, packet)
  if (!mapped.ok) return mapped
  const resolved = resolveFacilityDependencyAvailability(graph, mapped.sources)
  if (!resolved.ok) return resolved
  return Object.freeze({
    ok: true,
    results: resolved.results,
    inputs: mapped.inputs,
  })
}
