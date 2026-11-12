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

function hasOwn(record: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function isDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & { value: unknown } {
  return (
    descriptor !== undefined &&
    hasOwn(descriptor, 'value') &&
    !hasOwn(descriptor, 'get') &&
    !hasOwn(descriptor, 'set')
  )
}

function isEnumerableData(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & { value: unknown } {
  return isDataDescriptor(descriptor) && descriptor.enumerable === true
}

function dataToken(descriptor: PropertyDescriptor | undefined): string | undefined {
  return isDataDescriptor(descriptor) && isToken(descriptor.value) ? descriptor.value : undefined
}

function sameKeys(left: readonly PropertyKey[], right: readonly PropertyKey[]): boolean {
  if (left.length !== right.length) return false
  const seen = new Set<PropertyKey>(right)
  return left.every((key) => seen.has(key))
}

interface PacketSnapshot {
  readonly recordId: string | undefined
  readonly ok: boolean
  readonly values: Record<string, unknown>
}

function acceptedRequest(values: Record<string, unknown>): SiteNativeObjectRemovalRequest {
  const request: SiteNativeObjectRemovalRequest = Object.assign(Object.create(null), {
    id: values.id,
    origin: values.origin,
    provenance: values.provenance,
    phase: values.phase,
  })
  if (hasOwn(values, 'containmentRole')) {
    Object.assign(request, { containmentRole: values.containmentRole })
  }
  return request
}

function validationResult(
  findings: readonly SiteNativeRemovalFinding[],
  request?: SiteNativeObjectRemovalRequest
): SiteNativeRemovalValidation {
  return Object.assign(
    Object.create(null),
    request === undefined ? { findings } : { findings, request }
  )
}

function readSnapshot(input: object): PacketSnapshot {
  const listed = Reflect.ownKeys(input)
  const descriptors = Object.getOwnPropertyDescriptors(input)
  const captured = Reflect.ownKeys(descriptors)
  const recordId = dataToken(hasOwn(descriptors, 'id') ? descriptors.id : undefined)
  const ok =
    sameKeys(listed, captured) &&
    captured.every((key) => typeof key === 'string' && REQUEST_KEYS.has(key)) &&
    captured.every((key) => isEnumerableData(descriptors[key as string]))
  const values: Record<string, unknown> = Object.create(null)
  if (ok) {
    for (const key of captured) values[key as string] = descriptors[key as string]?.value
  }
  return { recordId, ok, values }
}

function sameValues(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)
  if (!sameKeys(leftKeys, rightKeys)) return false
  return leftKeys.every((key) => Object.is(left[key as string], right[key as string]))
}

export function validate(input: unknown): SiteNativeRemovalValidation {
  // Inspect descriptors before reading values: getters, hidden properties and
  // inherited optional fields cannot change a caller-owned removal packet.
  try {
    if (!isPlainRecord(input)) return validationResult([finding('malformed', undefined)])
    const first = readSnapshot(input)
    const second = readSnapshot(input)
    if (
      !first.ok ||
      !second.ok ||
      first.recordId !== second.recordId ||
      !sameValues(first.values, second.values)
    ) {
      return validationResult([
        finding('malformed', first.recordId === second.recordId ? first.recordId : undefined),
      ])
    }
    const values = first.values
    const recordId = isToken(values.id) ? values.id : undefined
    if (!isToken(values.id)) return validationResult([finding('malformed', recordId)])

    const findings: SiteNativeRemovalFinding[] = []
    if (!includes(SITE_NATIVE_OBJECT_ORIGINS, values.origin)) {
      findings.push(finding('unknown_origin', recordId))
    }
    if (
      !hasOwn(values, 'provenance') ||
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
      hasOwn(values, 'containmentRole') &&
      !includes(SITE_NATIVE_CONTAINMENT_ROLES, values.containmentRole)
    ) {
      findings.push(finding('unknown_containment_role', recordId))
    }
    if (findings.length > 0) return validationResult(findings)

    return validationResult([], acceptedRequest(values))
  } catch {
    return validationResult([finding('malformed', undefined)])
  }
}

function isNative(origin: SiteNativeObjectOrigin): boolean {
  return origin !== 'authorized_external_tool'
}

export function project(input: unknown): SiteNativeRemovalEscalation | undefined {
  const validation = validate(input)
  if (!hasOwn(validation, 'request') || validation.request === undefined) return undefined
  const request = validation.request
  const role = hasOwn(request, 'containmentRole') ? request.containmentRole : undefined
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
