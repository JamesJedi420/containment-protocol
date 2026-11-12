/**
 * SPE-3415 — project SPE-3390 environmental operational context into facility
 * dependency support.
 *
 * Consumes a resolved environmental operational-context packet and maps
 * facility-relevant dimensions onto SPE-3383 graph nodes as SPE-3386-compatible
 * explicit inputs. Does not own climate/terrain/ecology/hazard truth, facility
 * lifecycle, legal permission, staffing, supply, utilities, or GameState.
 * Missing or invalid environmental inputs fail closed — never silent `ready`.
 */

import type {
  EnvDimensionId,
  EnvOwnerId,
  EnvScope,
  EnvironmentalOperationalContext,
  ResolvedEnvironmentalComponent,
} from './environmentalOperationalContext'
import {
  FACILITY_DEPENDENCY_AVAILABILITIES,
  type FacilityDependencyAvailability,
  type FacilityDependencyAvailabilityResult,
  type FacilityDependencyRejection,
  validateFacilityDependencyGraph,
} from './facilityDependencyGraph'
import {
  type FacilityDependencyInputRejection,
  type FacilityDependencySourceInput,
  resolveExplicitFacilityDependencyAvailability,
} from './facilityDependencyInputs'
import type { SimulationObjectRef } from './crossSystemTransformationRegistry'

export const FACILITY_ENV_PROJECTION_REJECTIONS = [
  'invalid_context',
  'malformed_binding',
  'malformed_support_value',
  'unknown_node',
  'duplicate_node_binding',
  'duplicate_dimension_binding',
  'missing_baseline_source',
] as const
export type FacilityEnvProjectionRejection =
  | (typeof FACILITY_ENV_PROJECTION_REJECTIONS)[number]
  | FacilityDependencyInputRejection
  | FacilityDependencyRejection

/** Dimensions this adapter may bind onto facility dependency nodes. */
export const FACILITY_ENV_SUPPORT_DIMENSIONS = [
  'terrain_buildability',
  'climate_atmosphere',
  'ecology_pressure',
  'environment_feature',
  'hazard_exposure',
] as const satisfies readonly EnvDimensionId[]
export type FacilityEnvSupportDimensionId = (typeof FACILITY_ENV_SUPPORT_DIMENSIONS)[number]

export interface FacilityEnvNodeBinding {
  readonly dimensionId: FacilityEnvSupportDimensionId
  readonly nodeId: string
}

export interface FacilityEnvProjectionProvenance {
  readonly dimensionId: EnvDimensionId
  readonly ownerId?: EnvOwnerId
  readonly scope?: EnvScope
  readonly sourceRef: SimulationObjectRef
  readonly nodeId: string
  readonly availability: FacilityDependencyAvailability
  readonly missingDimension: boolean
}

export type FacilityEnvDependencyProjection =
  | {
      readonly ok: true
      readonly packet: Readonly<Record<string, FacilityDependencySourceInput>>
      readonly envProvenance: readonly FacilityEnvProjectionProvenance[]
      readonly facilityPermissionPresent: boolean
    }
  | {
      readonly ok: false
      readonly rejection: FacilityEnvProjectionRejection
    }

export type FacilityEnvDependencyResolution =
  | {
      readonly ok: true
      readonly results: readonly FacilityDependencyAvailabilityResult[]
      readonly inputs: Readonly<Record<string, FacilityDependencySourceInput>>
      readonly envProvenance: readonly FacilityEnvProjectionProvenance[]
      readonly facilityPermissionPresent: boolean
    }
  | {
      readonly ok: false
      readonly rejection: FacilityEnvProjectionRejection
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAvailability(value: unknown): value is FacilityDependencyAvailability {
  return FACILITY_DEPENDENCY_AVAILABILITIES.some((availability) => availability === value)
}

function availabilityRank(value: FacilityDependencyAvailability): number {
  switch (value) {
    case 'unavailable':
      return 0
    case 'degraded':
      return 1
    case 'ready':
      return 2
    default: {
      const exhaustive: never = value
      throw new Error(`unexpected facility dependency availability: ${String(exhaustive)}`)
    }
  }
}

/** Lower availability wins — environmental support constrains, never elevates. */
function worseAvailability(
  left: FacilityDependencyAvailability,
  right: FacilityDependencyAvailability
): FacilityDependencyAvailability {
  return availabilityRank(left) <= availabilityRank(right) ? left : right
}

function isSupportDimension(value: string): value is FacilityEnvSupportDimensionId {
  return (FACILITY_ENV_SUPPORT_DIMENSIONS as readonly string[]).includes(value)
}

function parseBaselineEntry(
  entry: unknown
): FacilityDependencySourceInput | FacilityEnvProjectionRejection {
  if (!isRecord(entry)) return 'malformed_binding'
  if (!isAvailability(entry.availability)) return 'malformed_support_value'
  if (typeof entry.sourceRef !== 'string' || entry.sourceRef.trim().length === 0) {
    return 'missing_baseline_source'
  }
  for (const key of Object.keys(entry)) {
    if (key !== 'availability' && key !== 'sourceRef') return 'malformed_binding'
  }
  return Object.freeze({
    availability: entry.availability,
    sourceRef: entry.sourceRef,
  })
}

function reject(rejection: FacilityEnvProjectionRejection): {
  readonly ok: false
  readonly rejection: FacilityEnvProjectionRejection
} {
  return Object.freeze({ ok: false, rejection })
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function freezeRef(ref: SimulationObjectRef): SimulationObjectRef {
  return Object.freeze({ family: ref.family, id: ref.id })
}

function parseFacilitySupport(
  value: unknown
): FacilityDependencyAvailability | 'malformed_support_value' {
  if (!isRecord(value)) return 'malformed_support_value'
  if (!Object.prototype.hasOwnProperty.call(value, 'facilitySupport')) {
    // Opaque env values without an explicit support signal fail closed.
    return 'unavailable'
  }
  if (!isAvailability(value.facilitySupport)) return 'malformed_support_value'
  return value.facilitySupport
}

function componentByDimension(
  context: EnvironmentalOperationalContext
): Map<EnvDimensionId, ResolvedEnvironmentalComponent> {
  const map = new Map<EnvDimensionId, ResolvedEnvironmentalComponent>()
  for (const component of context.components) {
    map.set(component.dimensionId, component)
  }
  return map
}

/**
 * Default representative binding: hazard exposure constrains routing.
 * Archive integrity stays unbound so it remains an independent capability.
 */
export function readRepresentativeFacilityEnvBindings(): readonly FacilityEnvNodeBinding[] {
  return Object.freeze([
    Object.freeze({
      dimensionId: 'hazard_exposure' as const,
      nodeId: 'service:routing',
    }),
  ])
}

/**
 * Project a resolved SPE-3390 context into a complete SPE-3386-compatible
 * explicit dependency packet. `facilityPermissionPresent` is echoed unchanged —
 * environmental degradation never revokes legal permission.
 */
export function projectEnvironmentalContextToFacilityDependencyPacket(
  context: EnvironmentalOperationalContext | null | undefined,
  graph: unknown,
  bindings: readonly FacilityEnvNodeBinding[],
  baselineSources: unknown,
  facilityPermissionPresent: boolean
): FacilityEnvDependencyProjection {
  if (!context || !Array.isArray(context.components) || !context.compositionTrace) {
    return reject('invalid_context')
  }
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return reject('malformed_binding')
  }
  if (typeof facilityPermissionPresent !== 'boolean') {
    return reject('malformed_binding')
  }

  const validated = validateFacilityDependencyGraph(graph)
  if (!validated.ok) return validated

  if (!isRecord(baselineSources)) return reject('malformed_binding')

  const nodeIds = new Set(validated.graph.nodes.map((node) => node.id))
  const boundNodes = new Set<string>()
  const boundDimensions = new Set<string>()
  const normalizedBindings: FacilityEnvNodeBinding[] = []

  for (const binding of bindings) {
    if (!binding || typeof binding !== 'object') return reject('malformed_binding')
    if (!isSupportDimension(binding.dimensionId)) return reject('malformed_binding')
    if (typeof binding.nodeId !== 'string' || binding.nodeId.trim().length === 0) {
      return reject('malformed_binding')
    }
    if (!nodeIds.has(binding.nodeId)) return reject('unknown_node')
    if (boundNodes.has(binding.nodeId)) return reject('duplicate_node_binding')
    if (boundDimensions.has(binding.dimensionId)) return reject('duplicate_dimension_binding')
    boundNodes.add(binding.nodeId)
    boundDimensions.add(binding.dimensionId)
    normalizedBindings.push(
      Object.freeze({ dimensionId: binding.dimensionId, nodeId: binding.nodeId })
    )
  }

  const byDimension = componentByDimension(context)
  const packet: Record<string, FacilityDependencySourceInput> = {}
  const envProvenance: FacilityEnvProjectionProvenance[] = []

  for (const binding of normalizedBindings) {
    const hasBaseline = Object.prototype.hasOwnProperty.call(baselineSources, binding.nodeId)
    const baseline = hasBaseline ? parseBaselineEntry(baselineSources[binding.nodeId]) : undefined
    if (typeof baseline === 'string') return reject(baseline)

    const component = byDimension.get(binding.dimensionId)
    if (!component) {
      const missingRef = Object.freeze({
        family: 'environmental_operational_context',
        id: `missing:${binding.dimensionId}`,
      })
      const envAvailability = 'unavailable' as const
      const envSourceRef = `${missingRef.family}/${missingRef.id}`
      const availability = baseline
        ? worseAvailability(envAvailability, baseline.availability)
        : envAvailability
      const baselineStrictlyWorse = Boolean(
        baseline && availabilityRank(baseline.availability) < availabilityRank(envAvailability)
      )
      packet[binding.nodeId] = Object.freeze({
        availability,
        sourceRef: baselineStrictlyWorse ? baseline!.sourceRef : envSourceRef,
      })
      envProvenance.push(
        Object.freeze({
          dimensionId: binding.dimensionId,
          sourceRef: missingRef,
          nodeId: binding.nodeId,
          availability,
          missingDimension: true,
        })
      )
      continue
    }

    const support = parseFacilitySupport(component.value)
    if (support === 'malformed_support_value') return reject('malformed_support_value')

    const envSourceRef = `${component.sourceRef.family}/${component.sourceRef.id}`
    const availability = baseline ? worseAvailability(support, baseline.availability) : support
    const baselineStrictlyWorse = Boolean(
      baseline && availabilityRank(baseline.availability) < availabilityRank(support)
    )

    packet[binding.nodeId] = Object.freeze({
      availability,
      // Baseline may only constrain further; when it is strictly worse, keep its sourceRef.
      sourceRef: baselineStrictlyWorse ? baseline!.sourceRef : envSourceRef,
    })
    envProvenance.push(
      Object.freeze({
        dimensionId: component.dimensionId,
        ownerId: component.ownerId,
        scope: component.scope,
        sourceRef: freezeRef(component.sourceRef),
        nodeId: binding.nodeId,
        availability,
        missingDimension: false,
      })
    )
  }

  for (const node of validated.graph.nodes) {
    if (boundNodes.has(node.id)) continue
    if (!Object.prototype.hasOwnProperty.call(baselineSources, node.id)) {
      return reject('missing_baseline_source')
    }
    const entry = parseBaselineEntry(baselineSources[node.id])
    if (typeof entry === 'string') return reject(entry)
    packet[node.id] = entry
  }

  const orderedProvenance = [...envProvenance].sort((left, right) =>
    compareCodeUnit(left.nodeId, right.nodeId)
  )

  return Object.freeze({
    ok: true as const,
    packet: Object.freeze(packet),
    envProvenance: Object.freeze(orderedProvenance),
    facilityPermissionPresent,
  })
}

/**
 * Project environmental context into dependency inputs, then resolve through
 * the unchanged SPE-3386 → SPE-3383 path.
 */
export function resolveFacilityDependencyFromEnvironmentalContext(
  context: EnvironmentalOperationalContext | null | undefined,
  graph: unknown,
  bindings: readonly FacilityEnvNodeBinding[],
  baselineSources: unknown,
  facilityPermissionPresent: boolean
): FacilityEnvDependencyResolution {
  const projected = projectEnvironmentalContextToFacilityDependencyPacket(
    context,
    graph,
    bindings,
    baselineSources,
    facilityPermissionPresent
  )
  if (!projected.ok) return projected

  const resolved = resolveExplicitFacilityDependencyAvailability(graph, projected.packet)
  if (!resolved.ok) return resolved

  return Object.freeze({
    ok: true as const,
    results: resolved.results,
    inputs: resolved.inputs,
    envProvenance: projected.envProvenance,
    facilityPermissionPresent: projected.facilityPermissionPresent,
  })
}
