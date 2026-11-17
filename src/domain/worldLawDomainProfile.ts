/**
 * SPE-2098 — world-law domain profile (slice 1).
 *
 * Pure deterministic layer for capability-family support/suppression,
 * contradiction events, and profile lint. No GameState, no UI.
 */

export const WORLD_LAW_DOMAIN_PROFILE_SCHEMA_VERSION = 'spe-2098.v1' as const

export type WorldLawDomainId = string

export type CapabilityFamilyId =
  | 'technological'
  | 'occult_technique'
  | 'engineered_device'
  | 'institutional_doctrine'
  | 'mundane_public'
  | 'conditional_hybrid'

export type CapabilitySupportKind = 'supported' | 'suppressed' | 'conditional'

export interface WorldLawDomainProfile {
  readonly schemaVersion: typeof WORLD_LAW_DOMAIN_PROFILE_SCHEMA_VERSION
  readonly domainId: WorldLawDomainId
  readonly supportedFamilies: readonly CapabilityFamilyId[]
  readonly suppressedFamilies: readonly CapabilityFamilyId[]
  readonly conditionalFamilies?: readonly {
    readonly family: CapabilityFamilyId
    readonly conditionRef: string
  }[]
  readonly ideologyTagAdmission?: readonly string[]
  readonly parameters: {
    readonly gravityBand?: string
    readonly transitLogic?: string
    readonly paradoxTolerance: number // 0-100, higher = more tolerant
  }
  readonly institutionalDoctrineRef?: string
  readonly publicExplanationStub?: string
  readonly provenance: string
  readonly contradictionNotes?: readonly string[]
  readonly validationHookIds?: readonly string[]
}

export interface CapabilityRequest {
  readonly requestId: string
  readonly family: CapabilityFamilyId
  readonly paradoxDemand?: number // required tolerance
}

export type ContradictionHookId =
  | 'backlash'
  | 'suppression'
  | 'partial_effect'
  | 'legality_escalation'

export interface WorldLawContradictionEvent {
  readonly eventId: string
  readonly domainId: WorldLawDomainId
  readonly requestId: string
  readonly family: CapabilityFamilyId
  readonly hooks: readonly ContradictionHookId[]
  readonly reasonCode: string
}

export type CapabilityValidationResult =
  | { readonly ok: true; readonly support: 'full' | 'conditional' }
  | {
      readonly ok: false
      readonly contradiction: WorldLawContradictionEvent
    }

export interface ProfileLintDiagnostic {
  readonly code:
    | 'empty_support_suppress'
    | 'capability_family_collapse'
    | 'missing_validation_hooks'
    | 'malformed_profile'
  readonly message: string
}

function freeze<T>(value: T): T {
  return Object.freeze(value)
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function validateWorldLawProfile(
  profile: WorldLawDomainProfile,
): readonly ProfileLintDiagnostic[] {
  const diagnostics: ProfileLintDiagnostic[] = []

  if (
    !profile.domainId ||
    !Array.isArray(profile.supportedFamilies) ||
    !Array.isArray(profile.suppressedFamilies)
  ) {
    return freeze([
      {
        code: 'malformed_profile',
        message: 'domainId, supportedFamilies and suppressedFamilies are required',
      },
    ])
  }

  if (
    profile.supportedFamilies.length === 0 &&
    profile.suppressedFamilies.length === 0
  ) {
    diagnostics.push({
      code: 'empty_support_suppress',
      message: 'Profile has empty supported and suppressed family lists',
    })
  }

  const onlyMundane =
    profile.supportedFamilies.length === 1 &&
    profile.supportedFamilies[0] === 'mundane_public' &&
    profile.suppressedFamilies.length === 0

  if (onlyMundane) {
    diagnostics.push({
      code: 'capability_family_collapse',
      message:
        'Profile with only mundane_public cannot authorize occult_technique or other non-mundane families',
    })
  }

  const isCustom =
    profile.domainId.startsWith('custom-') ||
    (profile.validationHookIds && profile.validationHookIds.length === 0)
  if (isCustom && (!profile.validationHookIds || profile.validationHookIds.length === 0)) {
    diagnostics.push({
      code: 'missing_validation_hooks',
      message: 'Custom domain requires validationHookIds',
    })
  }

  return freeze(
    diagnostics.sort((a, b) => compareStrings(a.code, b.code)),
  )
}

export function validateCapabilityAgainstDomain(
  profile: WorldLawDomainProfile,
  request: CapabilityRequest,
): CapabilityValidationResult {
  const supported = new Set(profile.supportedFamilies)
  const suppressed = new Set(profile.suppressedFamilies)

  if (suppressed.has(request.family)) {
    return {
      ok: false,
      contradiction: freeze({
        eventId: `contradiction-${profile.domainId}-${request.requestId}`,
        domainId: profile.domainId,
        requestId: request.requestId,
        family: request.family,
        hooks: freeze(['suppression', 'legality_escalation'] as const),
        reasonCode: 'family_suppressed',
      }),
    }
  }

  if (!supported.has(request.family) && request.family !== 'mundane_public') {
    return {
      ok: false,
      contradiction: freeze({
        eventId: `contradiction-${profile.domainId}-${request.requestId}`,
        domainId: profile.domainId,
        requestId: request.requestId,
        family: request.family,
        hooks: freeze(['suppression'] as const),
        reasonCode: 'family_not_supported',
      }),
    }
  }

  const requiredTolerance = request.paradoxDemand ?? 0
  if (requiredTolerance > profile.parameters.paradoxTolerance) {
    return {
      ok: false,
      contradiction: freeze({
        eventId: `contradiction-${profile.domainId}-${request.requestId}`,
        domainId: profile.domainId,
        requestId: request.requestId,
        family: request.family,
        hooks: freeze(['backlash', 'partial_effect'] as const),
        reasonCode: 'paradox_tolerance_exceeded',
      }),
    }
  }

  const isConditional = profile.conditionalFamilies?.some(
    (c) => c.family === request.family,
  )
  return {
    ok: true,
    support: isConditional ? 'conditional' : 'full',
  }
}
