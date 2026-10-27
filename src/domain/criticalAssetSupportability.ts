/**
 * SPE-3153 — critical asset supportability state resolver (slice 1).
 *
 * Derives sustainable-servicing bands from caller-owned supply, competency,
 * knowledge/tooling, compatibility, and replacement-path facts. Physical
 * integrity/condition remains orthogonal and is never mutated here.
 */

/** Representative critical asset identity used by slice-1 fixtures/tests. */
export const CRITICAL_SUPPORTABILITY_ASSET_ID = 'asset:pressure_seal:primary' as const

export const CRITICAL_ASSET_SUPPORTABILITY_STATES = [
  'supported',
  'at_risk',
  'unsustainable',
] as const
export type CriticalAssetSupportabilityState =
  (typeof CRITICAL_ASSET_SUPPORTABILITY_STATES)[number]

export const CRITICAL_ASSET_INTEGRITY_CONDITIONS = ['healthy', 'degraded'] as const
export type CriticalAssetIntegrityCondition =
  (typeof CRITICAL_ASSET_INTEGRITY_CONDITIONS)[number]

export const CRITICAL_ASSET_SUPPORTABILITY_REASONS = [
  'ok',
  'malformed_request',
  'spare_unavailable',
  'supplier_disrupted',
  'maintainer_unavailable',
  'documentation_stale',
  'tooling_unavailable',
  'compatibility_blocked',
  'replacement_path_absent',
] as const
export type CriticalAssetSupportabilityReason =
  (typeof CRITICAL_ASSET_SUPPORTABILITY_REASONS)[number]

export const CRITICAL_ASSET_SUPPORTABILITY_PROVENANCE = [
  'spare_stock',
  'supplier',
  'maintainer',
  'documentation',
  'tooling',
  'compatibility',
  'replacement_path',
] as const
export type CriticalAssetSupportabilityProvenance =
  (typeof CRITICAL_ASSET_SUPPORTABILITY_PROVENANCE)[number]

export interface CriticalAssetSupportabilityRequest {
  readonly assetId: string
  /** Present physical/operational condition — orthogonal to supportability. */
  readonly integrityCondition: CriticalAssetIntegrityCondition
  readonly spareAvailable: boolean
  readonly supplierDisrupted: boolean
  readonly qualifiedMaintainerAvailable: boolean
  readonly documentationFresh: boolean
  readonly toolingAvailable: boolean
  readonly compatibilityOk: boolean
  readonly replacementPathViable: boolean
}

export interface CriticalAssetSupportabilityResult {
  readonly assetId: string
  readonly state: CriticalAssetSupportabilityState
  readonly reasons: readonly CriticalAssetSupportabilityReason[]
  readonly provenance: readonly CriticalAssetSupportabilityProvenance[]
  /** Echoed for orthogonality proofs; never drives `state`. */
  readonly integrityCondition: CriticalAssetIntegrityCondition
  readonly sourceAuthoritiesUnchanged: true
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isIntegrityCondition(value: unknown): value is CriticalAssetIntegrityCondition {
  return CRITICAL_ASSET_INTEGRITY_CONDITIONS.some((condition) => condition === value)
}

function isBoolean(value: unknown): value is boolean {
  return value === true || value === false
}

function malformed(
  integrityCondition: CriticalAssetIntegrityCondition = 'healthy'
): CriticalAssetSupportabilityResult {
  return {
    assetId: '',
    state: 'unsustainable',
    reasons: Object.freeze(['malformed_request']),
    provenance: Object.freeze([]),
    integrityCondition,
    sourceAuthoritiesUnchanged: true,
  }
}

/**
 * Resolve supportability for one critical asset from caller-owned inputs.
 * Does not mutate inventory, integrity, competency, knowledge, or lifecycle state.
 */
export function resolveCriticalAssetSupportability(
  request: CriticalAssetSupportabilityRequest
): CriticalAssetSupportabilityResult {
  if (!request || typeof request !== 'object') return malformed()
  if (!isNonEmptyString(request.assetId)) return malformed()
  if (!isIntegrityCondition(request.integrityCondition)) return malformed()
  if (
    !isBoolean(request.spareAvailable) ||
    !isBoolean(request.supplierDisrupted) ||
    !isBoolean(request.qualifiedMaintainerAvailable) ||
    !isBoolean(request.documentationFresh) ||
    !isBoolean(request.toolingAvailable) ||
    !isBoolean(request.compatibilityOk) ||
    !isBoolean(request.replacementPathViable)
  ) {
    return malformed(request.integrityCondition)
  }

  const reasons: CriticalAssetSupportabilityReason[] = []
  const provenance: CriticalAssetSupportabilityProvenance[] = []

  // Hard sustainability blockers → unsustainable
  if (!request.spareAvailable) {
    reasons.push('spare_unavailable')
    provenance.push('spare_stock')
  }
  if (!request.compatibilityOk) {
    reasons.push('compatibility_blocked')
    provenance.push('compatibility')
  }
  if (!request.replacementPathViable) {
    reasons.push('replacement_path_absent')
    provenance.push('replacement_path')
  }

  if (reasons.length > 0) {
    return {
      assetId: request.assetId,
      state: 'unsustainable',
      reasons: Object.freeze(reasons),
      provenance: Object.freeze(provenance),
      integrityCondition: request.integrityCondition,
      sourceAuthoritiesUnchanged: true,
    }
  }

  // Soft sustainability pressure → at_risk
  if (request.supplierDisrupted) {
    reasons.push('supplier_disrupted')
    provenance.push('supplier')
  }
  if (!request.qualifiedMaintainerAvailable) {
    reasons.push('maintainer_unavailable')
    provenance.push('maintainer')
  }
  if (!request.documentationFresh) {
    reasons.push('documentation_stale')
    provenance.push('documentation')
  }
  if (!request.toolingAvailable) {
    reasons.push('tooling_unavailable')
    provenance.push('tooling')
  }

  if (reasons.length > 0) {
    return {
      assetId: request.assetId,
      state: 'at_risk',
      reasons: Object.freeze(reasons),
      provenance: Object.freeze(provenance),
      integrityCondition: request.integrityCondition,
      sourceAuthoritiesUnchanged: true,
    }
  }

  return {
    assetId: request.assetId,
    state: 'supported',
    reasons: Object.freeze(['ok']),
    provenance: Object.freeze([]),
    integrityCondition: request.integrityCondition,
    sourceAuthoritiesUnchanged: true,
  }
}
