/**
 * SPE-862 — message-to-service availability validation.
 * Pure guidance-vs-service feasibility checks consuming SPE-3363 registry outputs.
 * No universal service simulator, trust engine (SPE-861), or GameState persistence.
 */

import {
  parseDistrictServiceRegistry,
  projectServiceDownstreamOutputs,
  PUBLIC_SERVICE_CATEGORIES,
  type DistrictServiceRegistry,
  type PublicServiceCategory,
  type ServiceReliabilityState,
} from './publicServiceInfrastructureDegradation'

export const MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION =
  'spe-862.v1' as const
export type MessageToServiceAvailabilityValidationSchemaVersion =
  typeof MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION

export const GUIDANCE_RECOMMENDED_ACTIONS = [
  'evacuation',
  'sheltering',
  'screening',
  'hotline',
  'supply_collection',
  'isolation',
  'vaccination_site',
] as const
export type GuidanceRecommendedAction = (typeof GUIDANCE_RECOMMENDED_ACTIONS)[number]

export const GUIDANCE_VALIDATION_DISPOSITIONS = ['release', 'revise', 'block'] as const
export type GuidanceValidationDisposition = (typeof GUIDANCE_VALIDATION_DISPOSITIONS)[number]

export type AudienceAccessDimension =
  | 'mobilityOk'
  | 'languageOk'
  | 'moneyOk'
  | 'suppliesOk'
  | 'infrastructureOk'

export interface GuidanceAudienceAccessProfile {
  readonly audienceId: string
  readonly mobilityOk: boolean
  readonly languageOk: boolean
  readonly moneyOk: boolean
  readonly suppliesOk: boolean
  readonly infrastructureOk: boolean
}

export interface PublicGuidanceMessagePacket {
  readonly schemaVersion: MessageToServiceAvailabilityValidationSchemaVersion
  readonly messageId: string
  readonly districtId: string
  readonly recommendedAction: GuidanceRecommendedAction
  readonly requiredServiceCategories: readonly PublicServiceCategory[]
  readonly audienceProfiles: readonly GuidanceAudienceAccessProfile[]
}

export interface GuidanceServiceAvailabilityCheck {
  readonly category: PublicServiceCategory
  readonly available: boolean
  readonly reliabilityState: ServiceReliabilityState | 'missing'
}

export interface GuidanceAudienceComplianceResult {
  readonly audienceId: string
  readonly canComply: boolean
  readonly blockers: readonly string[]
}

export interface PublicGuidanceServiceValidationResult {
  readonly disposition: GuidanceValidationDisposition
  readonly reasonCodes: readonly string[]
  readonly audienceResults: readonly GuidanceAudienceComplianceResult[]
  readonly serviceChecks: readonly GuidanceServiceAvailabilityCheck[]
}

export interface ValidatePublicGuidanceAgainstServicesInput {
  readonly packet: PublicGuidanceMessagePacket | unknown
  readonly registry: DistrictServiceRegistry | unknown
}

const BLOCKING_SERVICE_STATES: ReadonlySet<ServiceReliabilityState> = new Set([
  'unavailable',
  'interrupted',
  'contaminated',
  'unsafe',
  'overloaded',
])

const RELEASE_ELIGIBLE_SERVICE_STATES: ReadonlySet<ServiceReliabilityState> = new Set([
  'functional',
  'recovering',
])

const REVISE_SERVICE_STATES: ReadonlySet<ServiceReliabilityState> = new Set([
  'strained',
  'degraded',
])

const ACTION_DEFAULT_SERVICE_CATEGORIES: Readonly<
  Record<GuidanceRecommendedAction, readonly PublicServiceCategory[]>
> = Object.freeze({
  evacuation: Object.freeze(['roads', 'shelters', 'communications'] as const),
  sheltering: Object.freeze(['shelters', 'communications'] as const),
  screening: Object.freeze(['clinics', 'public_response_nodes'] as const),
  hotline: Object.freeze(['communications', 'public_response_nodes'] as const),
  supply_collection: Object.freeze(['markets', 'utilities', 'water'] as const),
  isolation: Object.freeze(['shelters', 'clinics'] as const),
  vaccination_site: Object.freeze(['clinics', 'public_response_nodes', 'roads'] as const),
})

const ACTION_AUDIENCE_REQUIREMENTS: Readonly<
  Record<GuidanceRecommendedAction, readonly AudienceAccessDimension[]>
> = Object.freeze({
  evacuation: Object.freeze(['mobilityOk', 'infrastructureOk'] as const),
  sheltering: Object.freeze(['mobilityOk', 'suppliesOk'] as const),
  screening: Object.freeze(['mobilityOk', 'languageOk'] as const),
  hotline: Object.freeze(['languageOk', 'infrastructureOk'] as const),
  supply_collection: Object.freeze(['mobilityOk', 'moneyOk', 'suppliesOk'] as const),
  isolation: Object.freeze(['mobilityOk', 'infrastructureOk', 'suppliesOk'] as const),
  vaccination_site: Object.freeze(['mobilityOk', 'languageOk', 'moneyOk'] as const),
})

const CATEGORY_SET = new Set<string>(PUBLIC_SERVICE_CATEGORIES)
const ACTION_SET = new Set<string>(GUIDANCE_RECOMMENDED_ACTIONS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right),
    ),
  )
}

function isPublicServiceCategory(value: unknown): value is PublicServiceCategory {
  return typeof value === 'string' && CATEGORY_SET.has(value)
}

function isGuidanceRecommendedAction(value: unknown): value is GuidanceRecommendedAction {
  return typeof value === 'string' && ACTION_SET.has(value)
}

function freezeAudienceProfile(
  profile: GuidanceAudienceAccessProfile,
): GuidanceAudienceAccessProfile {
  return Object.freeze({ ...profile })
}

function freezeServiceCheck(check: GuidanceServiceAvailabilityCheck): GuidanceServiceAvailabilityCheck {
  return Object.freeze({ ...check })
}

function freezeAudienceResult(
  result: GuidanceAudienceComplianceResult,
): GuidanceAudienceComplianceResult {
  return Object.freeze({
    audienceId: result.audienceId,
    canComply: result.canComply,
    blockers: uniqueSorted(result.blockers),
  })
}

function freezeValidationResult(
  result: Omit<PublicGuidanceServiceValidationResult, 'reasonCodes' | 'audienceResults' | 'serviceChecks'> & {
    reasonCodes: readonly string[]
    audienceResults: readonly GuidanceAudienceComplianceResult[]
    serviceChecks: readonly GuidanceServiceAvailabilityCheck[]
  },
): PublicGuidanceServiceValidationResult {
  return Object.freeze({
    disposition: result.disposition,
    reasonCodes: uniqueSorted(result.reasonCodes),
    audienceResults: Object.freeze(result.audienceResults.map((entry) => freezeAudienceResult(entry))),
    serviceChecks: Object.freeze(result.serviceChecks.map((entry) => freezeServiceCheck(entry))),
  })
}

function blockedResult(reasonCodes: readonly string[]): PublicGuidanceServiceValidationResult {
  return freezeValidationResult({
    disposition: 'block',
    reasonCodes,
    audienceResults: Object.freeze([]),
    serviceChecks: Object.freeze([]),
  })
}

export function parsePublicGuidanceMessagePacket(
  raw: unknown,
): PublicGuidanceMessagePacket | null {
  if (!isRecord(raw)) return null
  if (raw.schemaVersion !== MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION) {
    return null
  }
  if (typeof raw.messageId !== 'string' || raw.messageId.trim() === '') return null
  if (typeof raw.districtId !== 'string' || raw.districtId.trim() === '') return null
  if (!isGuidanceRecommendedAction(raw.recommendedAction)) return null
  if (!Array.isArray(raw.requiredServiceCategories)) return null
  const requiredServiceCategories: PublicServiceCategory[] = []
  const seenCategories = new Set<string>()
  for (const entry of raw.requiredServiceCategories) {
    if (!isPublicServiceCategory(entry)) return null
    if (seenCategories.has(entry)) return null
    seenCategories.add(entry)
    requiredServiceCategories.push(entry)
  }
  if (!Array.isArray(raw.audienceProfiles) || raw.audienceProfiles.length === 0) return null
  const audienceProfiles: GuidanceAudienceAccessProfile[] = []
  const seenAudiences = new Set<string>()
  for (const entry of raw.audienceProfiles) {
    if (!isRecord(entry)) return null
    if (typeof entry.audienceId !== 'string' || entry.audienceId.trim() === '') return null
    const audienceId = entry.audienceId.trim()
    if (seenAudiences.has(audienceId)) return null
    seenAudiences.add(audienceId)
    for (const flag of [
      'mobilityOk',
      'languageOk',
      'moneyOk',
      'suppliesOk',
      'infrastructureOk',
    ] as const) {
      if (typeof entry[flag] !== 'boolean') return null
    }
    audienceProfiles.push(
      freezeAudienceProfile({
        audienceId,
        mobilityOk: entry.mobilityOk,
        languageOk: entry.languageOk,
        moneyOk: entry.moneyOk,
        suppliesOk: entry.suppliesOk,
        infrastructureOk: entry.infrastructureOk,
      }),
    )
  }

  return Object.freeze({
    schemaVersion: MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
    messageId: raw.messageId.trim(),
    districtId: raw.districtId.trim(),
    recommendedAction: raw.recommendedAction,
    requiredServiceCategories: Object.freeze([...requiredServiceCategories].sort()),
    audienceProfiles: Object.freeze(audienceProfiles),
  })
}

function mergeRequiredCategories(
  packet: PublicGuidanceMessagePacket,
): readonly PublicServiceCategory[] {
  const merged = new Set<PublicServiceCategory>(packet.requiredServiceCategories)
  for (const category of ACTION_DEFAULT_SERVICE_CATEGORIES[packet.recommendedAction]) {
    merged.add(category)
  }
  return Object.freeze([...merged].sort())
}

function isServiceCheckAvailable(state: ServiceReliabilityState | 'missing'): boolean {
  if (state === 'missing') return false
  return !BLOCKING_SERVICE_STATES.has(state) && !REVISE_SERVICE_STATES.has(state)
}

function serviceStateBlocksAction(
  state: ServiceReliabilityState | 'missing',
): 'block' | 'revise' | 'ok' {
  if (state === 'missing') return 'block'
  if (BLOCKING_SERVICE_STATES.has(state)) return 'block'
  if (REVISE_SERVICE_STATES.has(state)) return 'revise'
  if (RELEASE_ELIGIBLE_SERVICE_STATES.has(state)) return 'ok'
  const _exhaustive: never = state
  throw new Error(`Unhandled service reliability state: ${_exhaustive}`)
}

function lookupServiceState(
  registry: DistrictServiceRegistry,
  category: PublicServiceCategory,
): ServiceReliabilityState | 'missing' {
  const record = registry.records.find((entry) => entry.serviceCategory === category)
  return record ? record.reliabilityState : 'missing'
}

function evaluateAudienceCompliance(
  packet: PublicGuidanceMessagePacket,
  serviceChecks: readonly GuidanceServiceAvailabilityCheck[],
): GuidanceAudienceComplianceResult[] {
  const requirements = ACTION_AUDIENCE_REQUIREMENTS[packet.recommendedAction]
  const blockingCategories = new Set(
    serviceChecks.filter((check) => !check.available).map((check) => check.category),
  )

  return packet.audienceProfiles.map((profile) => {
    const blockers: string[] = []
    for (const dimension of requirements) {
      if (!profile[dimension]) {
        blockers.push(`audience:${dimension}_false`)
      }
    }
    if (!profile.infrastructureOk && blockingCategories.size > 0) {
      blockers.push('audience:infrastructure_blocks_service_access')
    }
    if (
      packet.recommendedAction === 'hotline' &&
      blockingCategories.has('communications')
    ) {
      blockers.push('audience:hotline_communications_unusable')
    }
    return freezeAudienceResult({
      audienceId: profile.audienceId,
      canComply: blockers.length === 0,
      blockers,
    })
  })
}

function shouldEmitTrustEffectHint(
  disposition: GuidanceValidationDisposition,
  packet: PublicGuidanceMessagePacket,
  serviceChecks: readonly GuidanceServiceAvailabilityCheck[],
  downstreamTrustFlag: boolean,
): boolean {
  if (disposition === 'release') return false
  if (downstreamTrustFlag) return true
  const communicationsBlocked = serviceChecks.some(
    (check) =>
      check.category === 'communications' &&
      (check.reliabilityState === 'unavailable' ||
        check.reliabilityState === 'interrupted' ||
        check.reliabilityState === 'missing'),
  )
  if (communicationsBlocked && packet.recommendedAction !== 'hotline') {
    return true
  }
  const allServicesBlocked = serviceChecks.every((check) => !check.available)
  return allServicesBlocked
}

export function validatePublicGuidanceAgainstServices(
  input: ValidatePublicGuidanceAgainstServicesInput,
): PublicGuidanceServiceValidationResult {
  const packet = parsePublicGuidanceMessagePacket(input.packet)
  if (!packet) {
    return blockedResult(['validation:malformed_packet'])
  }

  const registry = parseDistrictServiceRegistry(input.registry)
  if (!registry) {
    return blockedResult(['validation:malformed_registry'])
  }

  if (registry.districtId !== packet.districtId) {
    return blockedResult(['validation:district_mismatch'])
  }

  const downstream = projectServiceDownstreamOutputs(registry)
  if (!downstream) {
    return blockedResult(['validation:registry_projection_failed'])
  }

  const requiredCategories = mergeRequiredCategories(packet)
  const reasonCodes: string[] = ['validation:evaluated']
  if (downstream.flags.guidance_validation) {
    reasonCodes.push('registry:guidance_validation_impacted')
  }

  let serviceSeverity: 'ok' | 'revise' | 'block' = 'ok'
  const serviceChecks: GuidanceServiceAvailabilityCheck[] = []

  for (const category of requiredCategories) {
    const reliabilityState = lookupServiceState(registry, category)
    const available = isServiceCheckAvailable(reliabilityState)
    serviceChecks.push(
      freezeServiceCheck({
        category,
        available,
        reliabilityState,
      }),
    )
    const categorySeverity = serviceStateBlocksAction(reliabilityState)
    if (categorySeverity === 'block') {
      serviceSeverity = 'block'
      reasonCodes.push(`service:blocked:${category}:${reliabilityState}`)
    } else if (categorySeverity === 'revise' && serviceSeverity !== 'block') {
      serviceSeverity = 'revise'
      reasonCodes.push(`service:strained:${category}:${reliabilityState}`)
    }
  }

  const audienceResults = evaluateAudienceCompliance(packet, serviceChecks)
  const complyingCount = audienceResults.filter((entry) => entry.canComply).length
  const nonComplyingCount = audienceResults.length - complyingCount

  if (complyingCount === 0) {
    serviceSeverity = 'block'
    reasonCodes.push('audience:no_compliance_path')
  } else if (nonComplyingCount > 0 && serviceSeverity !== 'block') {
    serviceSeverity = 'revise'
    reasonCodes.push('audience:partial_compliance')
  }

  let disposition: GuidanceValidationDisposition
  switch (serviceSeverity) {
    case 'block':
      disposition = 'block'
      reasonCodes.push('disposition:block')
      break
    case 'revise':
      disposition = 'revise'
      reasonCodes.push('disposition:revise')
      break
    case 'ok':
      disposition = 'release'
      reasonCodes.push('disposition:release')
      break
    default: {
      const _exhaustive: never = serviceSeverity
      throw new Error(`Unhandled service severity: ${_exhaustive}`)
    }
  }

  if (
    shouldEmitTrustEffectHint(
      disposition,
      packet,
      serviceChecks,
      downstream.flags.trust_compliance_input,
    )
  ) {
    reasonCodes.push('trust_effect:empty_advice_hint')
  }

  return freezeValidationResult({
    disposition,
    reasonCodes,
    audienceResults,
    serviceChecks,
  })
}

export function assertGuidanceRecommendedActionExhaustive(action: GuidanceRecommendedAction): void {
  if (!ACTION_SET.has(action)) {
    throw new Error(`Unknown guidance recommended action: ${action}`)
  }
}

export function assertGuidanceValidationDispositionExhaustive(
  disposition: GuidanceValidationDisposition,
): void {
  if (!(GUIDANCE_VALIDATION_DISPOSITIONS as readonly string[]).includes(disposition)) {
    throw new Error(`Unknown guidance validation disposition: ${disposition}`)
  }
}
