/**
 * SPE-731 — layered facility control: ownership, command, power, and access.
 *
 * Pure caller-owned packets keep nominal ownership, command authority, power
 * state, and access permission as distinct surfaces. Crew/subsystem obedience
 * follows hierarchy or credential rather than title alone. Stolen or transferred
 * control artifacts change steer/seal/admit decisions. Action authorization is
 * evaluated per controlled verb without inventing a parallel identity model.
 *
 * This module does not persist GameState, run week-close, or simulate full
 * facility governance.
 */

/** Representative facility used by acceptance fixtures. */
export const CONTROL_FACILITY_ID = 'facility:layered-control-hub' as const

/** Representative control artifact used by acceptance fixtures. */
export const CONTROL_ARTIFACT_ID = 'artifact:command-credential' as const

export const FACILITY_POWER_STATES = ['online', 'degraded', 'offline'] as const
export type FacilityPowerState = (typeof FACILITY_POWER_STATES)[number]

export const FACILITY_ACCESS_BANDS = ['denied', 'enter', 'operate', 'command'] as const
export type FacilityAccessBand = (typeof FACILITY_ACCESS_BANDS)[number]

export const FACILITY_CONTROL_ACTIONS = [
  'enter',
  'inspect',
  'operate',
  'seal',
  'override',
  'admit',
  'deny',
] as const
export type FacilityControlAction = (typeof FACILITY_CONTROL_ACTIONS)[number]

export const FACILITY_AUTH_DENIAL_REASONS = [
  'none',
  'access_denied',
  'action_not_authorized',
  'power_unavailable',
  'missing_command_authority',
  'competency_gap',
  'information_gap',
] as const
export type FacilityAuthDenialReason = (typeof FACILITY_AUTH_DENIAL_REASONS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function accessRank(band: FacilityAccessBand): number {
  return FACILITY_ACCESS_BANDS.indexOf(band)
}

export interface FacilityControlSurfacesInput {
  readonly facilityId: string
  readonly ownerId: string
  readonly commandAuthorityId: string
  readonly powerState: FacilityPowerState
  readonly accessBand: FacilityAccessBand
}

export interface FacilityControlSurfacesResult {
  readonly facilityId: string
  readonly ownerId: string
  readonly commandAuthorityId: string
  readonly powerState: FacilityPowerState
  readonly accessBand: FacilityAccessBand
  readonly ownershipEqualsCommand: boolean
  readonly surfacesSeparated: true
}

/** Project distinct ownership, command, power, and access surfaces. */
export function projectFacilityControlSurfaces(
  input: unknown
): FacilityControlSurfacesResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.ownerId)) return undefined
  if (!isNonEmptyString(input.commandAuthorityId)) return undefined
  if (!isMember(input.powerState, FACILITY_POWER_STATES)) return undefined
  if (!isMember(input.accessBand, FACILITY_ACCESS_BANDS)) return undefined

  return Object.freeze({
    facilityId: input.facilityId,
    ownerId: input.ownerId,
    commandAuthorityId: input.commandAuthorityId,
    powerState: input.powerState,
    accessBand: input.accessBand,
    ownershipEqualsCommand: input.ownerId === input.commandAuthorityId,
    surfacesSeparated: true as const,
  })
}

export interface CrewObedienceInput {
  readonly facilityId: string
  readonly actorId: string
  readonly actorTitle: string
  readonly commandAuthorityId: string
  readonly holdsCredential: boolean
  readonly hierarchyRank: number
  readonly requiredHierarchyRank: number
}

export interface CrewObedienceResult {
  readonly facilityId: string
  readonly actorId: string
  readonly obeysCommand: boolean
  readonly obedienceSource: 'credential' | 'hierarchy' | 'none'
  readonly titleAloneInsufficient: true
}

/** Crew/subsystem obedience from credential or hierarchy — not title alone. */
export function evaluateCrewObedience(
  input: unknown
): CrewObedienceResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.actorId)) return undefined
  if (!isNonEmptyString(input.actorTitle)) return undefined
  if (!isNonEmptyString(input.commandAuthorityId)) return undefined
  if (typeof input.holdsCredential !== 'boolean') return undefined
  if (typeof input.hierarchyRank !== 'number' || !Number.isFinite(input.hierarchyRank)) {
    return undefined
  }
  if (
    typeof input.requiredHierarchyRank !== 'number' ||
    !Number.isFinite(input.requiredHierarchyRank)
  ) {
    return undefined
  }

  let obedienceSource: CrewObedienceResult['obedienceSource'] = 'none'
  if (input.holdsCredential && input.actorId === input.commandAuthorityId) {
    obedienceSource = 'credential'
  } else if (input.hierarchyRank >= input.requiredHierarchyRank) {
    obedienceSource = 'hierarchy'
  }

  return Object.freeze({
    facilityId: input.facilityId,
    actorId: input.actorId,
    obeysCommand: obedienceSource !== 'none',
    obedienceSource,
    titleAloneInsufficient: true as const,
  })
}

export interface ControlArtifactTransferInput {
  readonly facilityId: string
  readonly artifactId: string
  readonly previousHolderId: string
  readonly newHolderId: string
  readonly transferKind: 'stolen' | 'transferred'
  readonly priorCommandAuthorityId: string
}

export interface ControlArtifactTransferResult {
  readonly facilityId: string
  readonly artifactId: string
  readonly commandAuthorityId: string
  readonly canSteer: boolean
  readonly canSeal: boolean
  readonly canAdmit: boolean
  readonly priorHolderRetainsCommand: false
  readonly transferKind: 'stolen' | 'transferred'
}

/** Stolen/transferred control artifact reassigns command authority surfaces. */
export function evaluateControlArtifactTransfer(
  input: unknown
): ControlArtifactTransferResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.artifactId)) return undefined
  if (!isNonEmptyString(input.previousHolderId)) return undefined
  if (!isNonEmptyString(input.newHolderId)) return undefined
  if (!isMember(input.transferKind, ['stolen', 'transferred'] as const)) return undefined
  if (!isNonEmptyString(input.priorCommandAuthorityId)) return undefined
  if (input.previousHolderId === input.newHolderId) return undefined

  const commandAuthorityId = input.newHolderId
  return Object.freeze({
    facilityId: input.facilityId,
    artifactId: input.artifactId,
    commandAuthorityId,
    canSteer: true,
    canSeal: true,
    canAdmit: true,
    priorHolderRetainsCommand: false as const,
    transferKind: input.transferKind,
  })
}

export interface FacilityActionAuthorizationInput {
  readonly facilityId: string
  readonly actorId: string
  readonly action: FacilityControlAction
  readonly accessBand: FacilityAccessBand
  readonly powerState: FacilityPowerState
  readonly commandAuthorityId: string
  readonly competentForAction: boolean
  readonly informationReadIn: boolean
}

export interface FacilityActionAuthorizationResult {
  readonly facilityId: string
  readonly actorId: string
  readonly action: FacilityControlAction
  readonly authorized: boolean
  readonly denialReason: FacilityAuthDenialReason
}

function minimumAccessForAction(action: FacilityControlAction): FacilityAccessBand {
  switch (action) {
    case 'enter':
    case 'inspect':
      return 'enter'
    case 'operate':
    case 'admit':
    case 'deny':
      return 'operate'
    case 'seal':
    case 'override':
      return 'command'
  }
}

function actionRequiresCommandAuthority(action: FacilityControlAction): boolean {
  return action === 'seal' || action === 'override'
}

/** Authorize a specific facility action without collapsing to enter/deny alone. */
export function authorizeFacilityAction(
  input: unknown
): FacilityActionAuthorizationResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.actorId)) return undefined
  if (!isMember(input.action, FACILITY_CONTROL_ACTIONS)) return undefined
  if (!isMember(input.accessBand, FACILITY_ACCESS_BANDS)) return undefined
  if (!isMember(input.powerState, FACILITY_POWER_STATES)) return undefined
  if (!isNonEmptyString(input.commandAuthorityId)) return undefined
  if (typeof input.competentForAction !== 'boolean') return undefined
  if (typeof input.informationReadIn !== 'boolean') return undefined

  const deny = (denialReason: FacilityAuthDenialReason) =>
    Object.freeze({
      facilityId: input.facilityId as string,
      actorId: input.actorId as string,
      action: input.action as FacilityControlAction,
      authorized: false,
      denialReason,
    })

  if (input.accessBand === 'denied') {
    return deny('access_denied')
  }

  if (input.powerState === 'offline' && input.action !== 'enter' && input.action !== 'inspect') {
    return deny('power_unavailable')
  }

  if (accessRank(input.accessBand) < accessRank(minimumAccessForAction(input.action))) {
    return deny('action_not_authorized')
  }

  if (
    actionRequiresCommandAuthority(input.action) &&
    input.actorId !== input.commandAuthorityId
  ) {
    return deny('missing_command_authority')
  }

  if (!input.competentForAction) {
    return deny('competency_gap')
  }

  if (!input.informationReadIn) {
    return deny('information_gap')
  }

  return Object.freeze({
    facilityId: input.facilityId,
    actorId: input.actorId,
    action: input.action,
    authorized: true,
    denialReason: 'none' as const,
  })
}
