/**
 * SPE-3390 — pure environmental operational-context composition resolver.
 *
 * Composes caller-owned authoritative environmental dimension packets into one
 * derived, provenance-bearing context. Does not own climate, terrain, ecology,
 * hazard, map, or facility truth. Uses SPE-2273 morphism/composition traces.
 */

import {
  buildCompositionTrace,
  type CompositionTrace,
  type SimulationObjectRef,
  type TransformationMorphism,
} from './crossSystemTransformationRegistry'

export const ENV_OWNER_IDS = [
  'SPE-3354',
  'SPE-3356',
  'SPE-1221',
  'SPE-1117',
  'SPE-1596',
  'SPE-1597',
  'SPE-1075',
] as const
export type EnvOwnerId = (typeof ENV_OWNER_IDS)[number]

export const ENV_DIMENSION_IDS = [
  'terrain_buildability',
  'climate_atmosphere',
  'ecology_pressure',
  'environment_feature',
  'hazard_exposure',
] as const
export type EnvDimensionId = (typeof ENV_DIMENSION_IDS)[number]

/** Higher index wins when multiple valid packets share a dimension. */
export const ENV_SCOPES = ['baseline', 'regional', 'local', 'exceptional', 'temporary'] as const
export type EnvScope = (typeof ENV_SCOPES)[number]

/** Alias of ENV_SCOPES — single source of truth for validation and ranking. */
export const ENV_SCOPE_PRECEDENCE: readonly EnvScope[] = ENV_SCOPES

export const ENV_CONTEXT_ERROR_CODES = [
  'malformed_input',
  'unknown_owner',
  'unknown_dimension',
  'unknown_scope',
  'dangling_source_ref',
  'invalid_packet',
  'conflicting_same_scope',
  'insufficient_owners',
] as const
export type EnvContextErrorCode = (typeof ENV_CONTEXT_ERROR_CODES)[number]

export interface EnvironmentalDimensionPacket {
  readonly ownerId: EnvOwnerId
  readonly dimensionId: EnvDimensionId
  readonly scope: EnvScope
  readonly sourceRef: SimulationObjectRef
  /** Opaque caller-owned payload; never reinterpreted as a second env sim. */
  readonly value: unknown
  readonly valid: boolean
  readonly reasonCode?: string
}

export interface ResolvedEnvironmentalComponent {
  readonly ownerId: EnvOwnerId
  readonly dimensionId: EnvDimensionId
  readonly scope: EnvScope
  readonly sourceRef: SimulationObjectRef
  readonly value: unknown
  readonly overriddenScopes: readonly EnvScope[]
}

export interface EnvironmentalOperationalContext {
  readonly components: readonly ResolvedEnvironmentalComponent[]
  readonly compositionTrace: CompositionTrace
  readonly findings: readonly EnvContextFinding[]
}

export interface EnvContextFinding {
  readonly code: EnvContextErrorCode
  readonly severity: 'error' | 'warning'
  readonly detail?: string
  readonly dimensionId?: EnvDimensionId
  readonly ownerId?: EnvOwnerId
}

export type ResolveEnvironmentalContextResult =
  | { readonly ok: true; readonly context: EnvironmentalOperationalContext }
  | { readonly ok: false; readonly findings: readonly EnvContextFinding[] }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidRef(ref: SimulationObjectRef | null | undefined): ref is SimulationObjectRef {
  return !!ref && isNonEmptyString(ref.family) && isNonEmptyString(ref.id)
}

function scopeRank(scope: EnvScope): number {
  return ENV_SCOPE_PRECEDENCE.indexOf(scope)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

function valuesConflict(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return false
  try {
    return stableStringify(left) !== stableStringify(right)
  } catch {
    return true
  }
}

function freezeRef(ref: SimulationObjectRef): SimulationObjectRef {
  return Object.freeze({ family: ref.family, id: ref.id })
}

function finding(
  code: EnvContextErrorCode,
  severity: 'error' | 'warning',
  extra?: Omit<EnvContextFinding, 'code' | 'severity'>,
): EnvContextFinding {
  return Object.freeze({
    code,
    severity,
    ...(extra?.detail !== undefined ? { detail: extra.detail } : {}),
    ...(extra?.dimensionId !== undefined ? { dimensionId: extra.dimensionId } : {}),
    ...(extra?.ownerId !== undefined ? { ownerId: extra.ownerId } : {}),
  })
}

function validatePacket(packet: EnvironmentalDimensionPacket): EnvContextFinding | null {
  if (!packet || typeof packet !== 'object') {
    return finding('malformed_input', 'error')
  }
  if (!(ENV_OWNER_IDS as readonly string[]).includes(packet.ownerId)) {
    return finding('unknown_owner', 'error', { ownerId: packet.ownerId as EnvOwnerId })
  }
  if (!(ENV_DIMENSION_IDS as readonly string[]).includes(packet.dimensionId)) {
    return finding('unknown_dimension', 'error', { dimensionId: packet.dimensionId as EnvDimensionId })
  }
  if (!(ENV_SCOPES as readonly string[]).includes(packet.scope)) {
    return finding('unknown_scope', 'error', {
      dimensionId: packet.dimensionId,
      ownerId: packet.ownerId,
    })
  }
  if (!isValidRef(packet.sourceRef)) {
    return finding('dangling_source_ref', 'error', {
      dimensionId: packet.dimensionId,
      ownerId: packet.ownerId,
    })
  }
  if (packet.valid !== true) {
    return finding('invalid_packet', 'warning', {
      dimensionId: packet.dimensionId,
      ownerId: packet.ownerId,
      detail: packet.reasonCode,
    })
  }
  return null
}

function buildTraceForComponents(
  components: readonly ResolvedEnvironmentalComponent[],
): CompositionTrace {
  const morphisms: TransformationMorphism[] = components.map((component) =>
    Object.freeze({
      id: `morph:env-${component.dimensionId}`,
      kind: 'translate' as const,
      input: component.sourceRef,
      output: Object.freeze({
        family: 'environmental_operational_context',
        id: `dim:${component.dimensionId}`,
      }),
      provenance: Object.freeze({
        sourceFamily: component.sourceRef.family,
        sourceRef: component.sourceRef,
        reasonCode: `compose_${component.ownerId}_${component.scope}`,
      }),
    }),
  )
  return buildCompositionTrace(morphisms)
}

/**
 * Compose caller-owned environmental dimension packets into one derived context.
 * Valid packets only compete; invalid packets become inspectable findings.
 */
export function resolveEnvironmentalOperationalContext(
  packets: readonly EnvironmentalDimensionPacket[],
): ResolveEnvironmentalContextResult {
  if (!Array.isArray(packets)) {
    return Object.freeze({
      ok: false as const,
      findings: Object.freeze([finding('malformed_input', 'error')]),
    })
  }

  const findings: EnvContextFinding[] = []
  const validPackets: EnvironmentalDimensionPacket[] = []

  for (const packet of packets) {
    const issue = validatePacket(packet)
    if (issue) {
      findings.push(issue)
      if (issue.severity === 'error' && issue.code !== 'invalid_packet') {
        // structural errors skip composition contribution
        continue
      }
      if (issue.code === 'invalid_packet') continue
    }
    if (packet.valid === true && isValidRef(packet.sourceRef)) {
      validPackets.push(
        Object.freeze({
          ownerId: packet.ownerId,
          dimensionId: packet.dimensionId,
          scope: packet.scope,
          sourceRef: freezeRef(packet.sourceRef),
          value: packet.value,
          valid: true,
          ...(packet.reasonCode !== undefined ? { reasonCode: packet.reasonCode } : {}),
        }),
      )
    }
  }

  const byDimension = new Map<EnvDimensionId, EnvironmentalDimensionPacket[]>()
  for (const packet of validPackets) {
    const list = byDimension.get(packet.dimensionId) ?? []
    list.push(packet)
    byDimension.set(packet.dimensionId, list)
  }

  const components: ResolvedEnvironmentalComponent[] = []
  for (const dimensionId of ENV_DIMENSION_IDS) {
    const candidates = byDimension.get(dimensionId)
    if (!candidates || candidates.length === 0) continue

    const ranked = [...candidates].sort((a, b) => {
      const scopeDelta = scopeRank(b.scope) - scopeRank(a.scope)
      if (scopeDelta !== 0) return scopeDelta
      // ASCII ordinal compare — avoid localeCompare locale instability.
      if (a.ownerId < b.ownerId) return -1
      if (a.ownerId > b.ownerId) return 1
      return 0
    })

    const winner = ranked[0]!
    const sameScope = ranked.filter((packet) => packet.scope === winner.scope)
    if (sameScope.length > 1) {
      const conflict = sameScope.some((packet) => valuesConflict(packet.value, winner.value))
      if (conflict) {
        findings.push(
          finding('conflicting_same_scope', 'error', {
            dimensionId,
            ownerId: winner.ownerId,
            detail: winner.scope,
          }),
        )
        continue
      }
    }

    const overriddenScopes = ranked
      .slice(1)
      .filter((packet) => scopeRank(packet.scope) < scopeRank(winner.scope))
      .map((packet) => packet.scope)
    components.push(
      Object.freeze({
        ownerId: winner.ownerId,
        dimensionId,
        scope: winner.scope,
        sourceRef: winner.sourceRef,
        value: winner.value,
        overriddenScopes: Object.freeze([...new Set(overriddenScopes)]),
      }),
    )
  }

  if (findings.some((item) => item.severity === 'error' && item.code === 'conflicting_same_scope')) {
    return Object.freeze({
      ok: false as const,
      findings: Object.freeze(findings),
    })
  }

  const owners = new Set(components.map((component) => component.ownerId))
  if (owners.size < 3) {
    findings.push(
      finding('insufficient_owners', 'error', {
        detail: `owners=${owners.size}`,
      }),
    )
    return Object.freeze({
      ok: false as const,
      findings: Object.freeze(findings),
    })
  }

  const compositionTrace = buildTraceForComponents(components)
  return Object.freeze({
    ok: true as const,
    context: Object.freeze({
      components: Object.freeze(components),
      compositionTrace,
      findings: Object.freeze(findings),
    }),
  })
}

/**
 * Downstream subset consumer: project only requested dimensions without
 * requiring every environmental subsystem.
 */
export function selectEnvironmentalDimensions(
  context: EnvironmentalOperationalContext,
  dimensionIds: readonly EnvDimensionId[],
): readonly ResolvedEnvironmentalComponent[] {
  const wanted = new Set(dimensionIds)
  return Object.freeze(
    context.components.filter((component) => wanted.has(component.dimensionId)),
  )
}
