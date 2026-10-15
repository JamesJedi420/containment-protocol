/**
 * SPE-1667 — pure site-native object removal escalation.
 *
 * Caller-owned packets. This module does not persist GameState, run week-close,
 * draw UI, or start a historical-route replay.
 */

export const SITE_NATIVE_OBJECT_ORIGINS = [
  'site_native_artifact',
  'local_evidence',
  'gifted_object',
  'transformed_personal_item',
  'protected_relic',
  'authorized_external_tool',
] as const
export type SiteNativeObjectOrigin = (typeof SITE_NATIVE_OBJECT_ORIGINS)[number]

export const SITE_NATIVE_REMOVAL_PHASES = ['ingress', 'extraction'] as const
export type SiteNativeRemovalPhase = (typeof SITE_NATIVE_REMOVAL_PHASES)[number]

export const SITE_NATIVE_PROVENANCE_CODES = ['contained_record', 'unrecorded_origin'] as const
export type SiteNativeProvenanceCode = (typeof SITE_NATIVE_PROVENANCE_CODES)[number]

export const SITE_NATIVE_CONTAINMENT_ROLES = ['secured', 'exposed'] as const
export type SiteNativeContainmentRole = (typeof SITE_NATIVE_CONTAINMENT_ROLES)[number]

export const SITE_NATIVE_REMOVAL_FINDING_CODES = [
  'malformed',
  'unknown_origin',
  'missing_provenance',
  'unknown_provenance',
  'unknown_phase',
  'unknown_containment_role',
] as const
export type SiteNativeRemovalFindingCode = (typeof SITE_NATIVE_REMOVAL_FINDING_CODES)[number]

export interface SiteNativeObjectRemovalRequest {
  readonly id: string
  readonly origin: SiteNativeObjectOrigin
  readonly provenance: SiteNativeProvenanceCode
  readonly phase: SiteNativeRemovalPhase
  readonly containmentRole?: SiteNativeContainmentRole
}

export interface SiteNativeRemovalFinding {
  readonly code: SiteNativeRemovalFindingCode
  readonly severity: 'error'
  readonly recordId?: string
}

export interface SiteNativeRemovalValidation {
  readonly request?: SiteNativeObjectRemovalRequest
  readonly findings: readonly SiteNativeRemovalFinding[]
}

export interface SiteNativeRemovalEscalation {
  readonly recordId: string
  readonly origin: SiteNativeObjectOrigin
  readonly phase: SiteNativeRemovalPhase
  readonly escalates: boolean
  readonly attention: number
  readonly instability: number
  readonly factionResponse: number
  readonly environmentalShift: number
  readonly routeRisk: number
  readonly pursuitPressure: number
}

const REQUEST_KEYS = new Set(['id', 'origin', 'provenance', 'phase', 'containmentRole'])

const BASE_SEVERITY: Record<
  SiteNativeObjectOrigin,
  Pick<
    SiteNativeRemovalEscalation,
    'attention' | 'instability' | 'factionResponse' | 'environmentalShift'
  >
> = {
  authorized_external_tool: {
    attention: 0,
    instability: 0,
    factionResponse: 0,
    environmentalShift: 0,
  },
  gifted_object: { attention: 1, instability: 0, factionResponse: 0, environmentalShift: 0 },
  local_evidence: { attention: 1, instability: 1, factionResponse: 0, environmentalShift: 0 },
  transformed_personal_item: {
    attention: 1,
    instability: 2,
    factionResponse: 0,
    environmentalShift: 0,
  },
  site_native_artifact: {
    attention: 2,
    instability: 2,
    factionResponse: 1,
    environmentalShift: 1,
  },
  protected_relic: { attention: 3, instability: 2, factionResponse: 2, environmentalShift: 2 },
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

function isToken(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.trim() === value && !value.includes('\0')
  )
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

function finding(
  code: SiteNativeRemovalFindingCode,
  recordId: string | undefined
): SiteNativeRemovalFinding {
  return recordId === undefined
    ? { code, severity: 'error' }
    : { code, severity: 'error', recordId }
}

function isEnumerableData(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & { value: unknown } {
  return (
    descriptor !== undefined &&
    descriptor.enumerable === true &&
    descriptor.get === undefined &&
    descriptor.set === undefined &&
    Object.prototype.hasOwnProperty.call(descriptor, 'value')
  )
}

function sameKeys(left: readonly PropertyKey[], right: readonly PropertyKey[]): boolean {
  if (left.length !== right.length) return false
  const seen = new Set<PropertyKey>(right)
  return left.every((key) => seen.has(key))
}

function acceptedRequest(values: Record<string, unknown>): SiteNativeObjectRemovalRequest {
  const request: SiteNativeObjectRemovalRequest = Object.assign(Object.create(null), {
    id: values.id,
    origin: values.origin,
    provenance: values.provenance,
    phase: values.phase,
  })
  if (Object.prototype.hasOwnProperty.call(values, 'containmentRole')) {
    Object.assign(request, { containmentRole: values.containmentRole })
  }
  return request
}

export function validate(input: unknown): SiteNativeRemovalValidation {
  // Inspect descriptors before reading values: getters, hidden properties and
  // inherited optional fields cannot change a caller-owned removal packet.
  let values: Record<string, unknown>
  try {
    if (!isPlainRecord(input)) return { findings: [finding('malformed', undefined)] }
    const listed = Reflect.ownKeys(input)
    const descriptors = Object.getOwnPropertyDescriptors(input)
    const captured = Reflect.ownKeys(descriptors)
    const idDescriptor = Object.prototype.hasOwnProperty.call(descriptors, 'id')
      ? descriptors.id
      : undefined
    const recordId =
      isEnumerableData(idDescriptor) && isToken(idDescriptor.value) ? idDescriptor.value : undefined
    if (
      !sameKeys(listed, captured) ||
      captured.some((key) => typeof key !== 'string' || !REQUEST_KEYS.has(key)) ||
      captured.some((key) => !isEnumerableData(descriptors[key as string]))
    ) {
      return { findings: [finding('malformed', recordId)] }
    }
    values = Object.create(null) as Record<string, unknown>
    for (const key of captured) {
      values[key as string] = descriptors[key as string]?.value
    }
  } catch {
    return { findings: [finding('malformed', undefined)] }
  }

  const recordId = isToken(values.id) ? values.id : undefined
  if (!isToken(values.id)) return { findings: [finding('malformed', recordId)] }

  const findings: SiteNativeRemovalFinding[] = []
  if (!includes(SITE_NATIVE_OBJECT_ORIGINS, values.origin)) {
    findings.push(finding('unknown_origin', recordId))
  }
  if (
    !Object.prototype.hasOwnProperty.call(values, 'provenance') ||
    values.provenance === undefined ||
    values.provenance === ''
  ) {
    findings.push(finding('missing_provenance', recordId))
  } else if (!includes(SITE_NATIVE_PROVENANCE_CODES, values.provenance)) {
    findings.push(finding('unknown_provenance', recordId))
  }
  if (!includes(SITE_NATIVE_REMOVAL_PHASES, values.phase)) {
    findings.push(finding('unknown_phase', recordId))
  }
  if (
    Object.prototype.hasOwnProperty.call(values, 'containmentRole') &&
    !includes(SITE_NATIVE_CONTAINMENT_ROLES, values.containmentRole)
  ) {
    findings.push(finding('unknown_containment_role', recordId))
  }
  if (findings.length > 0) return { findings }

  return { request: acceptedRequest(values), findings: [] }
}

function isNative(origin: SiteNativeObjectOrigin): boolean {
  return origin !== 'authorized_external_tool'
}

export function project(input: unknown): SiteNativeRemovalEscalation | undefined {
  const validation = validate(input)
  if (!validation.request) return undefined
  const request = validation.request
  const role = Object.prototype.hasOwnProperty.call(request, 'containmentRole')
    ? request.containmentRole
    : undefined
  const base = BASE_SEVERITY[request.origin]
  const native = isNative(request.origin)
  const attention =
    base.attention +
    (native && request.provenance === 'unrecorded_origin' ? 1 : 0) +
    (native && role === 'exposed' ? 1 : 0)
  const instability =
    base.instability +
    (native && request.provenance === 'unrecorded_origin' ? 1 : 0) +
    (native && role === 'secured' ? 1 : 0)
  const routeRisk = native && request.phase === 'extraction' ? 1 : 0
  const pursuitPressure = native && request.phase === 'extraction' ? 1 : 0
  const escalates =
    attention +
      instability +
      base.factionResponse +
      base.environmentalShift +
      routeRisk +
      pursuitPressure >
    0
  return {
    recordId: request.id,
    origin: request.origin,
    phase: request.phase,
    escalates,
    attention,
    instability,
    factionResponse: base.factionResponse,
    environmentalShift: base.environmentalShift,
    routeRisk,
    pursuitPressure,
  }
}
