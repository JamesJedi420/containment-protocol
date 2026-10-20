/**
 * SPE-1020 — multi-site facility network and transfer compatibility.
 *
 * Pure caller-owned packets model several semi-independent containment sites
 * linked by shared services and transfer schemas. Sites choose isolated vs
 * networked mode with distinct risks and benefits; cross-site transfers can
 * fail or destabilize on schema/service mismatch; a site can keep operating
 * locally while a shared service is stale, missing, or degraded.
 *
 * This module does not persist GameState, run week-close, simulate full
 * cloud infrastructure, or assume all sites share one unified live state.
 */

export const MULTI_SITE_NETWORK_PRIMARY_ID = 'site:primary-hub' as const
export const MULTI_SITE_NETWORK_REMOTE_ID = 'site:remote-annex' as const

export const SITE_NETWORK_MODES = ['isolated', 'networked'] as const
export type SiteNetworkMode = (typeof SITE_NETWORK_MODES)[number]

export const SHARED_SERVICE_KINDS = [
  'identity',
  'research',
  'classification',
  'logistics',
] as const
export type SharedServiceKind = (typeof SHARED_SERVICE_KINDS)[number]

export const SHARED_SERVICE_STATUSES = [
  'live',
  'stale',
  'missing',
  'degraded',
] as const
export type SharedServiceStatus = (typeof SHARED_SERVICE_STATUSES)[number]

export const TRANSFER_PAYLOAD_KINDS = ['anomaly', 'asset', 'personnel'] as const
export type TransferPayloadKind = (typeof TRANSFER_PAYLOAD_KINDS)[number]

export const TRANSFER_OUTCOMES = ['allowed', 'failed', 'destabilized'] as const
export type TransferOutcome = (typeof TRANSFER_OUTCOMES)[number]

export const TRANSFER_FAILURE_REASONS = [
  'schema_mismatch',
  'containment_assumption_mismatch',
  'service_compatibility_mismatch',
  'none',
] as const
export type TransferFailureReason = (typeof TRANSFER_FAILURE_REASONS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

export interface SiteNetworkModeInput {
  readonly siteId: string
  readonly mode: SiteNetworkMode
  readonly sharedServicesEnabled: boolean
}

export interface SiteNetworkModeResult {
  readonly siteId: string
  readonly mode: SiteNetworkMode
  readonly localControlGain: boolean
  readonly stabilityGain: boolean
  readonly capabilityReachGain: boolean
  readonly researchSharingGain: boolean
  readonly logisticsReachGain: boolean
  readonly dependencyRisk: boolean
  readonly networkingStrictlyBetter: false
}

/**
 * Isolated mode favors control/stability; networked mode favors reach and
 * sharing at the cost of dependency risk. Networking is never strictly better.
 */
export function projectSiteNetworkMode(
  input: unknown
): SiteNetworkModeResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.siteId)) return undefined
  if (!isMember(input.mode, SITE_NETWORK_MODES)) return undefined
  if (typeof input.sharedServicesEnabled !== 'boolean') return undefined

  if (input.mode === 'isolated') {
    if (input.sharedServicesEnabled) return undefined
    return {
      siteId: input.siteId.trim(),
      mode: 'isolated',
      localControlGain: true,
      stabilityGain: true,
      capabilityReachGain: false,
      researchSharingGain: false,
      logisticsReachGain: false,
      dependencyRisk: false,
      networkingStrictlyBetter: false,
    }
  }

  if (!input.sharedServicesEnabled) return undefined
  return {
    siteId: input.siteId.trim(),
    mode: 'networked',
    localControlGain: false,
    stabilityGain: false,
    capabilityReachGain: true,
    researchSharingGain: true,
    logisticsReachGain: true,
    dependencyRisk: true,
    networkingStrictlyBetter: false,
  }
}

export interface CrossSiteTransferInput {
  readonly sourceSiteId: string
  readonly destinationSiteId: string
  readonly payloadKind: TransferPayloadKind
  readonly sourceSchemaId: string
  readonly destinationSchemaId: string
  readonly sourceContainmentClass: string
  readonly destinationContainmentClass: string
  readonly requiredSharedService: SharedServiceKind
  readonly sharedServiceStatus: SharedServiceStatus
}

export interface CrossSiteTransferResult {
  readonly sourceSiteId: string
  readonly destinationSiteId: string
  readonly payloadKind: TransferPayloadKind
  readonly outcome: TransferOutcome
  readonly failureReason: TransferFailureReason
  readonly transitInstability: boolean
  readonly seamlessMovement: false
}

/**
 * Cross-site transfer fails or destabilizes when schemas, containment classes,
 * or required shared-service status do not align. Never assumes seamless move.
 */
export function evaluateCrossSiteTransfer(
  input: unknown
): CrossSiteTransferResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.sourceSiteId)) return undefined
  if (!isNonEmptyString(input.destinationSiteId)) return undefined
  if (input.sourceSiteId.trim() === input.destinationSiteId.trim()) return undefined
  if (!isMember(input.payloadKind, TRANSFER_PAYLOAD_KINDS)) return undefined
  if (!isNonEmptyString(input.sourceSchemaId)) return undefined
  if (!isNonEmptyString(input.destinationSchemaId)) return undefined
  if (!isNonEmptyString(input.sourceContainmentClass)) return undefined
  if (!isNonEmptyString(input.destinationContainmentClass)) return undefined
  if (!isMember(input.requiredSharedService, SHARED_SERVICE_KINDS)) return undefined
  if (!isMember(input.sharedServiceStatus, SHARED_SERVICE_STATUSES)) return undefined

  const sourceSiteId = input.sourceSiteId.trim()
  const destinationSiteId = input.destinationSiteId.trim()
  const payloadKind = input.payloadKind
  const base = {
    sourceSiteId,
    destinationSiteId,
    payloadKind,
    seamlessMovement: false as const,
  }

  if (input.sourceSchemaId.trim() !== input.destinationSchemaId.trim()) {
    return {
      ...base,
      outcome: 'failed',
      failureReason: 'schema_mismatch',
      transitInstability: true,
    }
  }

  if (
    input.sourceContainmentClass.trim() !== input.destinationContainmentClass.trim()
  ) {
    return {
      ...base,
      outcome: 'destabilized',
      failureReason: 'containment_assumption_mismatch',
      transitInstability: true,
    }
  }

  if (
    input.sharedServiceStatus === 'missing' ||
    input.sharedServiceStatus === 'degraded'
  ) {
    return {
      ...base,
      outcome: 'failed',
      failureReason: 'service_compatibility_mismatch',
      transitInstability: true,
    }
  }

  if (input.sharedServiceStatus === 'stale') {
    return {
      ...base,
      outcome: 'destabilized',
      failureReason: 'service_compatibility_mismatch',
      transitInstability: true,
    }
  }

  return {
    ...base,
    outcome: 'allowed',
    failureReason: 'none',
    transitInstability: false,
  }
}

export interface LocalOperationUnderDesyncInput {
  readonly siteId: string
  readonly siteMode: SiteNetworkMode
  readonly sharedServiceKind: SharedServiceKind
  readonly sharedServiceStatus: SharedServiceStatus
  readonly localStaffingIntact: boolean
  readonly localZoningIntact: boolean
}

export interface LocalOperationUnderDesyncResult {
  readonly siteId: string
  readonly sharedServiceKind: SharedServiceKind
  readonly sharedServiceStatus: SharedServiceStatus
  readonly localOperationContinues: boolean
  readonly sharedServiceUsable: boolean
  readonly desyncActive: boolean
  readonly unifiedLiveStateAssumed: false
}

/**
 * A site can continue local operation while a shared service is stale, missing,
 * or degraded. Does not assume unified live state across the network.
 */
export function projectLocalOperationUnderDesync(
  input: unknown
): LocalOperationUnderDesyncResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.siteId)) return undefined
  if (!isMember(input.siteMode, SITE_NETWORK_MODES)) return undefined
  if (!isMember(input.sharedServiceKind, SHARED_SERVICE_KINDS)) return undefined
  if (!isMember(input.sharedServiceStatus, SHARED_SERVICE_STATUSES)) return undefined
  if (typeof input.localStaffingIntact !== 'boolean') return undefined
  if (typeof input.localZoningIntact !== 'boolean') return undefined

  const desyncActive = input.sharedServiceStatus !== 'live'
  const sharedServiceUsable = input.sharedServiceStatus === 'live'
  const localOperationContinues =
    input.localStaffingIntact && input.localZoningIntact

  return {
    siteId: input.siteId.trim(),
    sharedServiceKind: input.sharedServiceKind,
    sharedServiceStatus: input.sharedServiceStatus,
    localOperationContinues,
    sharedServiceUsable,
    desyncActive,
    unifiedLiveStateAssumed: false,
  }
}
