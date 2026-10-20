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

function asPacket(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function requireTrimmedId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function requireBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
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

const ISOLATED_MODE_TRAITS = {
  localControlGain: true,
  stabilityGain: true,
  capabilityReachGain: false,
  researchSharingGain: false,
  logisticsReachGain: false,
  dependencyRisk: false,
} as const

const NETWORKED_MODE_TRAITS = {
  localControlGain: false,
  stabilityGain: false,
  capabilityReachGain: true,
  researchSharingGain: true,
  logisticsReachGain: true,
  dependencyRisk: true,
} as const

/**
 * Isolated mode favors control/stability; networked mode favors reach and
 * sharing at the cost of dependency risk. Networking is never strictly better.
 */
export function projectSiteNetworkMode(
  input: unknown
): SiteNetworkModeResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined
  const siteId = requireTrimmedId(packet.siteId)
  const mode = requireEnum(packet.mode, SITE_NETWORK_MODES)
  const sharedServicesEnabled = requireBoolean(packet.sharedServicesEnabled)
  if (!siteId || !mode || sharedServicesEnabled === undefined) return undefined

  const wantsShared = mode === 'networked'
  if (sharedServicesEnabled !== wantsShared) return undefined

  return {
    siteId,
    mode,
    ...(mode === 'isolated' ? ISOLATED_MODE_TRAITS : NETWORKED_MODE_TRAITS),
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

type TransferMismatch = {
  readonly outcome: Exclude<TransferOutcome, 'allowed'>
  readonly failureReason: Exclude<TransferFailureReason, 'none'>
}

function detectTransferMismatch(packet: {
  readonly sourceSchemaId: string
  readonly destinationSchemaId: string
  readonly sourceContainmentClass: string
  readonly destinationContainmentClass: string
  readonly sharedServiceStatus: SharedServiceStatus
}): TransferMismatch | undefined {
  if (packet.sourceSchemaId !== packet.destinationSchemaId) {
    return { outcome: 'failed', failureReason: 'schema_mismatch' }
  }
  if (packet.sourceContainmentClass !== packet.destinationContainmentClass) {
    return {
      outcome: 'destabilized',
      failureReason: 'containment_assumption_mismatch',
    }
  }
  if (
    packet.sharedServiceStatus === 'missing' ||
    packet.sharedServiceStatus === 'degraded'
  ) {
    return { outcome: 'failed', failureReason: 'service_compatibility_mismatch' }
  }
  if (packet.sharedServiceStatus === 'stale') {
    return {
      outcome: 'destabilized',
      failureReason: 'service_compatibility_mismatch',
    }
  }
  return undefined
}

/**
 * Cross-site transfer fails or destabilizes when schemas, containment classes,
 * or required shared-service status do not align. Never assumes seamless move.
 */
export function evaluateCrossSiteTransfer(
  input: unknown
): CrossSiteTransferResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const sourceSiteId = requireTrimmedId(packet.sourceSiteId)
  const destinationSiteId = requireTrimmedId(packet.destinationSiteId)
  const payloadKind = requireEnum(packet.payloadKind, TRANSFER_PAYLOAD_KINDS)
  const sourceSchemaId = requireTrimmedId(packet.sourceSchemaId)
  const destinationSchemaId = requireTrimmedId(packet.destinationSchemaId)
  const sourceContainmentClass = requireTrimmedId(packet.sourceContainmentClass)
  const destinationContainmentClass = requireTrimmedId(
    packet.destinationContainmentClass
  )
  const requiredSharedService = requireEnum(
    packet.requiredSharedService,
    SHARED_SERVICE_KINDS
  )
  const sharedServiceStatus = requireEnum(
    packet.sharedServiceStatus,
    SHARED_SERVICE_STATUSES
  )

  if (
    !sourceSiteId ||
    !destinationSiteId ||
    sourceSiteId === destinationSiteId ||
    !payloadKind ||
    !sourceSchemaId ||
    !destinationSchemaId ||
    !sourceContainmentClass ||
    !destinationContainmentClass ||
    !requiredSharedService ||
    !sharedServiceStatus
  ) {
    return undefined
  }

  const mismatch = detectTransferMismatch({
    sourceSchemaId,
    destinationSchemaId,
    sourceContainmentClass,
    destinationContainmentClass,
    sharedServiceStatus,
  })

  return {
    sourceSiteId,
    destinationSiteId,
    payloadKind,
    outcome: mismatch?.outcome ?? 'allowed',
    failureReason: mismatch?.failureReason ?? 'none',
    transitInstability: mismatch !== undefined,
    seamlessMovement: false,
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
  const packet = asPacket(input)
  if (!packet) return undefined

  const siteId = requireTrimmedId(packet.siteId)
  const siteMode = requireEnum(packet.siteMode, SITE_NETWORK_MODES)
  const sharedServiceKind = requireEnum(packet.sharedServiceKind, SHARED_SERVICE_KINDS)
  const sharedServiceStatus = requireEnum(
    packet.sharedServiceStatus,
    SHARED_SERVICE_STATUSES
  )
  const localStaffingIntact = requireBoolean(packet.localStaffingIntact)
  const localZoningIntact = requireBoolean(packet.localZoningIntact)

  if (
    !siteId ||
    !siteMode ||
    !sharedServiceKind ||
    !sharedServiceStatus ||
    localStaffingIntact === undefined ||
    localZoningIntact === undefined
  ) {
    return undefined
  }

  // Isolated sites do not consume shared services even when the packet reports
  // a live status; networked sites only treat live status as usable.
  const sharedServiceUsable =
    siteMode === 'networked' && sharedServiceStatus === 'live'
  const desyncActive = sharedServiceStatus !== 'live'
  return {
    siteId,
    sharedServiceKind,
    sharedServiceStatus,
    localOperationContinues: localStaffingIntact && localZoningIntact,
    sharedServiceUsable,
    desyncActive,
    unifiedLiveStateAssumed: false,
  }
}
