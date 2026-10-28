/**
 * SPE-3363 — public-service / infrastructure degradation resolver.
 * Pure persistent district service reliability state; no city simulator,
 * market/trust/message engines, or foreign state mutation.
 */

export const PUBLIC_SERVICE_INFRASTRUCTURE_DEGRADATION_SCHEMA_VERSION =
  'spe-3363.v1' as const
export type PublicServiceInfrastructureDegradationSchemaVersion =
  typeof PUBLIC_SERVICE_INFRASTRUCTURE_DEGRADATION_SCHEMA_VERSION

export const PUBLIC_SERVICE_CATEGORIES = [
  'water',
  'roads',
  'clinics',
  'communications',
  'utilities',
  'shelters',
  'markets',
  'public_response_nodes',
] as const
export type PublicServiceCategory = (typeof PUBLIC_SERVICE_CATEGORIES)[number]

export const SERVICE_RELIABILITY_STATES = [
  'functional',
  'strained',
  'degraded',
  'interrupted',
  'unavailable',
  'contaminated',
  'unsafe',
  'overloaded',
  'recovering',
] as const
export type ServiceReliabilityState = (typeof SERVICE_RELIABILITY_STATES)[number]

export const SERVICE_DEGRADATION_CAUSES = [
  'overload',
  'contamination',
  'sabotage',
  'neglect',
  'authority_failure',
  'supply_shock',
  'evacuation_pressure',
  'partial_recovery',
] as const
export type ServiceDegradationCause = (typeof SERVICE_DEGRADATION_CAUSES)[number]

export const SERVICE_PROVENANCE_KINDS = [
  'observation',
  'report',
  'authority_claim',
  'sensor_reading',
  'field_update',
  'inference',
] as const
export type ServiceProvenanceKind = (typeof SERVICE_PROVENANCE_KINDS)[number]

export const SERVICE_DOWNSTREAM_USE_FLAGS = [
  'guidance_validation',
  'mission_availability',
  'medical_access',
  'supply_logistics',
  'route_planning',
  'market_failure_signal',
  'trust_compliance_input',
] as const
export type ServiceDownstreamUseFlag = (typeof SERVICE_DOWNSTREAM_USE_FLAGS)[number]

export const SERVICE_RECOVERY_STATES = ['none', 'partial', 'stabilizing'] as const
export type ServiceRecoveryState = (typeof SERVICE_RECOVERY_STATES)[number]

export interface ServiceProvenance {
  readonly kind: ServiceProvenanceKind
  readonly sourceRef: string
  readonly observedAtWeek?: number
}

export interface DistrictServiceReliabilityRecord {
  readonly districtId: string
  readonly serviceCategory: PublicServiceCategory
  readonly reliabilityState: ServiceReliabilityState
  readonly degradationCause?: ServiceDegradationCause
  readonly recoveryState?: ServiceRecoveryState
  readonly downstreamUseFlags: readonly ServiceDownstreamUseFlag[]
  readonly provenance: ServiceProvenance
  readonly reasonCodes: readonly string[]
}

export interface DistrictServiceRegistry {
  readonly schemaVersion: PublicServiceInfrastructureDegradationSchemaVersion
  readonly districtId: string
  readonly records: readonly DistrictServiceReliabilityRecord[]
}

export interface ServiceDownstreamProjection {
  readonly districtId: string
  readonly flags: Readonly<Record<ServiceDownstreamUseFlag, boolean>>
  readonly reasonCodes: readonly string[]
}

export const DISTRICT_CADENCE_BANDS = ['routine', 'elevated', 'crisis'] as const
export type DistrictCadenceBand = (typeof DISTRICT_CADENCE_BANDS)[number]

export const DISTRICT_CRISIS_PHASES = ['stable', 'escalating', 'acute', 'recovery'] as const
export type DistrictCrisisPhase = (typeof DISTRICT_CRISIS_PHASES)[number]

export interface DistrictCadenceCrisisConsumerInput {
  readonly registry: DistrictServiceRegistry
  readonly cadenceBand?: DistrictCadenceBand
  readonly crisisPhase?: DistrictCrisisPhase
}

export interface DistrictCadenceCrisisCoexistenceProjection {
  readonly downstream: ServiceDownstreamProjection
  readonly cadenceStressReasonCodes: readonly string[]
  readonly effectiveCrisisAmplifier: boolean
}

type TransitionKey = `${ServiceReliabilityState}:${ServiceDegradationCause}`

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
  return typeof value === 'string' && (PUBLIC_SERVICE_CATEGORIES as readonly string[]).includes(value)
}

function isServiceReliabilityState(value: unknown): value is ServiceReliabilityState {
  return (
    typeof value === 'string' && (SERVICE_RELIABILITY_STATES as readonly string[]).includes(value)
  )
}

function isServiceDegradationCause(value: unknown): value is ServiceDegradationCause {
  return (
    typeof value === 'string' && (SERVICE_DEGRADATION_CAUSES as readonly string[]).includes(value)
  )
}

function isServiceProvenanceKind(value: unknown): value is ServiceProvenanceKind {
  return typeof value === 'string' && (SERVICE_PROVENANCE_KINDS as readonly string[]).includes(value)
}

function isServiceRecoveryState(value: unknown): value is ServiceRecoveryState {
  return typeof value === 'string' && (SERVICE_RECOVERY_STATES as readonly string[]).includes(value)
}

function isServiceDownstreamUseFlag(value: unknown): value is ServiceDownstreamUseFlag {
  return (
    typeof value === 'string' && (SERVICE_DOWNSTREAM_USE_FLAGS as readonly string[]).includes(value)
  )
}

function isDistrictCadenceBand(value: unknown): value is DistrictCadenceBand {
  return typeof value === 'string' && (DISTRICT_CADENCE_BANDS as readonly string[]).includes(value)
}

function isDistrictCrisisPhase(value: unknown): value is DistrictCrisisPhase {
  return typeof value === 'string' && (DISTRICT_CRISIS_PHASES as readonly string[]).includes(value)
}

function transitionKey(
  state: ServiceReliabilityState,
  cause: ServiceDegradationCause,
): TransitionKey {
  return `${state}:${cause}`
}

/** Authored deterministic degrade transitions (fail-closed: unknown pairs hold state). */
const DEGRADE_TRANSITION_MAP: Readonly<Record<TransitionKey, ServiceReliabilityState>> =
  Object.freeze({
    'functional:overload': 'overloaded',
    'functional:contamination': 'contaminated',
    'functional:sabotage': 'interrupted',
    'functional:neglect': 'strained',
    'functional:authority_failure': 'unavailable',
    'functional:supply_shock': 'degraded',
    'functional:evacuation_pressure': 'strained',
    'functional:partial_recovery': 'functional',

    'strained:overload': 'overloaded',
    'strained:contamination': 'contaminated',
    'strained:sabotage': 'degraded',
    'strained:neglect': 'degraded',
    'strained:authority_failure': 'unavailable',
    'strained:supply_shock': 'degraded',
    'strained:evacuation_pressure': 'degraded',
    'strained:partial_recovery': 'recovering',

    'degraded:overload': 'overloaded',
    'degraded:contamination': 'contaminated',
    'degraded:sabotage': 'interrupted',
    'degraded:neglect': 'interrupted',
    'degraded:authority_failure': 'unavailable',
    'degraded:supply_shock': 'unavailable',
    'degraded:evacuation_pressure': 'interrupted',
    'degraded:partial_recovery': 'recovering',

    'interrupted:overload': 'overloaded',
    'interrupted:contamination': 'unsafe',
    'interrupted:sabotage': 'unavailable',
    'interrupted:neglect': 'unavailable',
    'interrupted:authority_failure': 'unavailable',
    'interrupted:supply_shock': 'unavailable',
    'interrupted:evacuation_pressure': 'unavailable',
    'interrupted:partial_recovery': 'recovering',

    'unavailable:partial_recovery': 'recovering',

    'contaminated:neglect': 'unsafe',
    'contaminated:partial_recovery': 'recovering',

    'unsafe:partial_recovery': 'recovering',

    'overloaded:supply_shock': 'unavailable',
    'overloaded:partial_recovery': 'recovering',

    'recovering:neglect': 'strained',
    'recovering:supply_shock': 'degraded',
  })

const CATEGORY_DEFAULT_DOWNSTREAM: Readonly<
  Record<PublicServiceCategory, readonly ServiceDownstreamUseFlag[]>
> = Object.freeze({
  water: Object.freeze(['supply_logistics', 'medical_access'] as const),
  roads: Object.freeze(['route_planning', 'mission_availability'] as const),
  clinics: Object.freeze(['medical_access'] as const),
  communications: Object.freeze(['guidance_validation', 'trust_compliance_input'] as const),
  utilities: Object.freeze(['supply_logistics'] as const),
  shelters: Object.freeze(['medical_access', 'supply_logistics'] as const),
  markets: Object.freeze(['market_failure_signal', 'supply_logistics'] as const),
  public_response_nodes: Object.freeze([
    'guidance_validation',
    'mission_availability',
    'trust_compliance_input',
  ] as const),
})

const SEVERITY_RANK: Readonly<Record<ServiceReliabilityState, number>> = Object.freeze({
  functional: 0,
  recovering: 1,
  strained: 2,
  degraded: 3,
  overloaded: 4,
  interrupted: 5,
  contaminated: 6,
  unsafe: 7,
  unavailable: 8,
})

function defaultFlagsForCategory(category: PublicServiceCategory): readonly ServiceDownstreamUseFlag[] {
  return CATEGORY_DEFAULT_DOWNSTREAM[category]
}

function flagsImpactedByState(
  category: PublicServiceCategory,
  state: ServiceReliabilityState,
): readonly ServiceDownstreamUseFlag[] {
  if (state === 'functional') {
    return Object.freeze([] as const)
  }
  const base = defaultFlagsForCategory(category)
  if (state === 'strained' || state === 'recovering') {
    return base.length > 0 ? Object.freeze([base[0]]) : Object.freeze([] as const)
  }
  return base
}

function freezeRecord(record: DistrictServiceReliabilityRecord): DistrictServiceReliabilityRecord {
  return Object.freeze({
    ...record,
    downstreamUseFlags: Object.freeze(
      uniqueSorted(record.downstreamUseFlags) as ServiceDownstreamUseFlag[],
    ),
    reasonCodes: uniqueSorted(record.reasonCodes),
    provenance: Object.freeze({ ...record.provenance }),
  })
}

function parseProvenance(raw: unknown): ServiceProvenance | null {
  if (!isRecord(raw)) return null
  if (!isServiceProvenanceKind(raw.kind)) return null
  if (typeof raw.sourceRef !== 'string' || raw.sourceRef.trim() === '') return null
  if (raw.observedAtWeek !== undefined) {
    if (typeof raw.observedAtWeek !== 'number' || !Number.isFinite(raw.observedAtWeek)) {
      return null
    }
    if (raw.observedAtWeek < 0) return null
  }
  return Object.freeze({
    kind: raw.kind,
    sourceRef: raw.sourceRef.trim(),
    ...(typeof raw.observedAtWeek === 'number'
      ? { observedAtWeek: Math.trunc(raw.observedAtWeek) }
      : {}),
  })
}

export function parseDistrictServiceReliabilityRecord(
  raw: unknown,
): DistrictServiceReliabilityRecord | null {
  if (!isRecord(raw)) return null
  if (typeof raw.districtId !== 'string' || raw.districtId.trim() === '') return null
  if (!isPublicServiceCategory(raw.serviceCategory)) return null
  if (!isServiceReliabilityState(raw.reliabilityState)) return null
  if (raw.degradationCause !== undefined && !isServiceDegradationCause(raw.degradationCause)) {
    return null
  }
  if (raw.recoveryState !== undefined && !isServiceRecoveryState(raw.recoveryState)) {
    return null
  }
  if (!Array.isArray(raw.downstreamUseFlags)) return null
  const flags: ServiceDownstreamUseFlag[] = []
  for (const entry of raw.downstreamUseFlags) {
    if (!isServiceDownstreamUseFlag(entry)) return null
    flags.push(entry)
  }
  const provenance = parseProvenance(raw.provenance)
  if (!provenance) return null
  if (!Array.isArray(raw.reasonCodes)) return null
  const reasonCodes: string[] = []
  for (const code of raw.reasonCodes) {
    if (typeof code !== 'string' || code.trim() === '') return null
    reasonCodes.push(code.trim())
  }
  return freezeRecord({
    districtId: raw.districtId.trim(),
    serviceCategory: raw.serviceCategory,
    reliabilityState: raw.reliabilityState,
    ...(raw.degradationCause !== undefined ? { degradationCause: raw.degradationCause } : {}),
    ...(raw.recoveryState !== undefined ? { recoveryState: raw.recoveryState } : {}),
    downstreamUseFlags: Object.freeze(uniqueSorted(flags) as ServiceDownstreamUseFlag[]),
    provenance,
    reasonCodes: uniqueSorted(reasonCodes),
  })
}

export function serializeDistrictServiceReliabilityRecord(
  record: DistrictServiceReliabilityRecord,
): string {
  return JSON.stringify({
    districtId: record.districtId,
    serviceCategory: record.serviceCategory,
    reliabilityState: record.reliabilityState,
    ...(record.degradationCause ? { degradationCause: record.degradationCause } : {}),
    ...(record.recoveryState ? { recoveryState: record.recoveryState } : {}),
    downstreamUseFlags: uniqueSorted(record.downstreamUseFlags),
    provenance: { ...record.provenance },
    reasonCodes: uniqueSorted(record.reasonCodes),
  })
}

export function createDistrictServiceRegistry(
  districtId: string,
  seedRecords?: readonly DistrictServiceReliabilityRecord[],
): DistrictServiceRegistry | null {
  const trimmed = districtId.trim()
  if (trimmed === '') return null
  const records: DistrictServiceReliabilityRecord[] = []
  if (seedRecords) {
    const seen = new Set<string>()
    for (const seed of seedRecords) {
      if (seed.districtId !== trimmed) return null
      const parsed = parseDistrictServiceReliabilityRecord(seed)
      if (!parsed) return null
      if (seen.has(parsed.serviceCategory)) return null
      seen.add(parsed.serviceCategory)
      records.push(parsed)
    }
  }
  return freezeRegistry({
    schemaVersion: PUBLIC_SERVICE_INFRASTRUCTURE_DEGRADATION_SCHEMA_VERSION,
    districtId: trimmed,
    records: sortRecords(records),
  })
}

function sortRecords(
  records: readonly DistrictServiceReliabilityRecord[],
): readonly DistrictServiceReliabilityRecord[] {
  return Object.freeze(
    [...records].sort((left, right) => {
      const cat =
        left.serviceCategory < right.serviceCategory
          ? -1
          : left.serviceCategory > right.serviceCategory
            ? 1
            : 0
      if (cat !== 0) return cat
      return left.districtId.localeCompare(right.districtId)
    }),
  )
}

function freezeRegistry(registry: DistrictServiceRegistry): DistrictServiceRegistry {
  return Object.freeze({
    ...registry,
    records: Object.freeze(registry.records.map((record) => freezeRecord(record))),
  })
}

export function parseDistrictServiceRegistry(raw: unknown): DistrictServiceRegistry | null {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (!isRecord(parsed)) return null
  if (parsed.schemaVersion !== PUBLIC_SERVICE_INFRASTRUCTURE_DEGRADATION_SCHEMA_VERSION) {
    return null
  }
  if (typeof parsed.districtId !== 'string' || parsed.districtId.trim() === '') return null
  if (!Array.isArray(parsed.records)) return null
  const records: DistrictServiceReliabilityRecord[] = []
  const seen = new Set<string>()
  for (const entry of parsed.records) {
    const record = parseDistrictServiceReliabilityRecord(entry)
    if (!record) return null
    if (record.districtId !== parsed.districtId.trim()) return null
    const key = record.serviceCategory
    if (seen.has(key)) return null
    seen.add(key)
    records.push(record)
  }
  return freezeRegistry({
    schemaVersion: PUBLIC_SERVICE_INFRASTRUCTURE_DEGRADATION_SCHEMA_VERSION,
    districtId: parsed.districtId.trim(),
    records: sortRecords(records),
  })
}

export function serializeDistrictServiceRegistry(registry: DistrictServiceRegistry): string {
  const payload = {
    schemaVersion: registry.schemaVersion,
    districtId: registry.districtId,
    records: registry.records.map((record) => JSON.parse(serializeDistrictServiceReliabilityRecord(record))),
  }
  return JSON.stringify(payload)
}

export function applyServiceDegradation(
  record: DistrictServiceReliabilityRecord,
  cause: ServiceDegradationCause,
  provenance: ServiceProvenance,
): DistrictServiceReliabilityRecord | null {
  const validRecord = parseDistrictServiceReliabilityRecord(record)
  if (!validRecord) return null
  const validProvenance = parseProvenance(provenance)
  if (!validProvenance) return null
  if (!isServiceDegradationCause(cause)) return null

  const key = transitionKey(validRecord.reliabilityState, cause)
  const nextState = DEGRADE_TRANSITION_MAP[key] ?? validRecord.reliabilityState
  const stateChanged = nextState !== validRecord.reliabilityState

  let recoveryState: ServiceRecoveryState | undefined = validRecord.recoveryState
  if (cause === 'partial_recovery') {
    recoveryState = nextState === 'recovering' ? 'partial' : recoveryState
  } else if (stateChanged && nextState !== 'recovering') {
    recoveryState = undefined
  }

  const reasonCodes = uniqueSorted([
    ...validRecord.reasonCodes,
    `degrade:${cause}`,
    ...(stateChanged ? [`state:${validRecord.reliabilityState}_to_${nextState}`] : ['degrade:no_transition']),
  ])

  const downstreamUseFlags = Object.freeze([
    ...new Set([
      ...validRecord.downstreamUseFlags,
      ...flagsImpactedByState(validRecord.serviceCategory, nextState),
    ]),
  ] as ServiceDownstreamUseFlag[])

  return freezeRecord({
    districtId: validRecord.districtId,
    serviceCategory: validRecord.serviceCategory,
    reliabilityState: nextState,
    degradationCause: cause,
    ...(recoveryState ? { recoveryState } : {}),
    downstreamUseFlags,
    provenance: validProvenance,
    reasonCodes,
  })
}

export function applyServiceRecoveryStep(
  record: DistrictServiceReliabilityRecord,
): DistrictServiceReliabilityRecord | null {
  const validRecord = parseDistrictServiceReliabilityRecord(record)
  if (!validRecord) return null

  const { reliabilityState } = validRecord
  let nextState: ServiceReliabilityState = reliabilityState
  let recoveryState: ServiceRecoveryState | undefined = validRecord.recoveryState
  const reasonCodes = [...validRecord.reasonCodes]

  switch (reliabilityState) {
    case 'recovering':
      nextState = 'strained'
      recoveryState = 'stabilizing'
      reasonCodes.push('recovery:recovering_to_strained')
      break
    case 'strained':
      if (recoveryState === 'stabilizing' || recoveryState === 'partial') {
        nextState = 'functional'
        recoveryState = 'none'
        reasonCodes.push('recovery:strained_to_functional')
      } else {
        reasonCodes.push('recovery:strained_hold')
      }
      break
    case 'degraded':
      nextState = 'recovering'
      recoveryState = 'partial'
      reasonCodes.push('recovery:degraded_to_recovering')
      break
    case 'functional':
      reasonCodes.push('recovery:already_functional')
      break
    case 'interrupted':
    case 'unavailable':
    case 'contaminated':
    case 'unsafe':
    case 'overloaded':
      nextState = 'recovering'
      recoveryState = 'partial'
      reasonCodes.push('recovery:severe_to_recovering')
      break
    default: {
      const _exhaustive: never = reliabilityState
      throw new Error(`Unhandled reliability state: ${_exhaustive}`)
    }
  }

  const downstreamUseFlags = Object.freeze([
    ...flagsImpactedByState(validRecord.serviceCategory, nextState),
  ] as ServiceDownstreamUseFlag[])

  const recoveryField =
    recoveryState !== undefined && recoveryState !== 'none' ? { recoveryState } : {}

  return freezeRecord({
    districtId: validRecord.districtId,
    serviceCategory: validRecord.serviceCategory,
    reliabilityState: nextState,
    degradationCause: validRecord.degradationCause,
    ...recoveryField,
    downstreamUseFlags,
    provenance: validRecord.provenance,
    reasonCodes: uniqueSorted(reasonCodes),
  })
}

function emptyDownstreamFlags(): Readonly<Record<ServiceDownstreamUseFlag, boolean>> {
  return Object.freeze(
    SERVICE_DOWNSTREAM_USE_FLAGS.reduce(
      (acc, flag) => {
        acc[flag] = false
        return acc
      },
      {} as Record<ServiceDownstreamUseFlag, boolean>,
    ),
  )
}

export function projectServiceDownstreamOutputs(
  registry: DistrictServiceRegistry,
): ServiceDownstreamProjection | null {
  const parsed = parseDistrictServiceRegistry(registry)
  if (!parsed) return null

  const flags = { ...emptyDownstreamFlags() }
  const reasonCodes: string[] = []

  for (const record of parsed.records) {
    const severity = SEVERITY_RANK[record.reliabilityState]
    if (severity <= SEVERITY_RANK.strained) continue

    for (const flag of record.downstreamUseFlags) {
      flags[flag] = true
    }
    for (const flag of flagsImpactedByState(record.serviceCategory, record.reliabilityState)) {
      flags[flag] = true
    }
    reasonCodes.push(`impact:${record.serviceCategory}:${record.reliabilityState}`)
  }

  if (
    parsed.records.some(
      (r) =>
        r.degradationCause === 'authority_failure' &&
        SEVERITY_RANK[r.reliabilityState] > SEVERITY_RANK.strained,
    )
  ) {
    flags.trust_compliance_input = true
    reasonCodes.push('impact:authority_failure_trust')
  }

  return Object.freeze({
    districtId: parsed.districtId,
    flags: Object.freeze(flags),
    reasonCodes: uniqueSorted(reasonCodes),
  })
}

/**
 * Caller-owned district cadence / crisis phase stub — composes downstream projection
 * without owning SPE-109 / SPE-1485 cadence engines.
 */
export function projectPublicServiceCoexistenceWithDistrictCadence(
  input: DistrictCadenceCrisisConsumerInput,
): DistrictCadenceCrisisCoexistenceProjection | null {
  const downstream = projectServiceDownstreamOutputs(input.registry)
  if (!downstream) return null

  const cadenceBand = input.cadenceBand
  const crisisPhase = input.crisisPhase
  if (cadenceBand !== undefined && !isDistrictCadenceBand(cadenceBand)) return null
  if (crisisPhase !== undefined && !isDistrictCrisisPhase(crisisPhase)) return null

  const cadenceStressReasonCodes: string[] = []
  let effectiveCrisisAmplifier = false

  if (cadenceBand === 'crisis' || crisisPhase === 'acute') {
    effectiveCrisisAmplifier = true
    cadenceStressReasonCodes.push('cadence:crisis_amplifier')
    if (downstream.flags.mission_availability === false) {
      cadenceStressReasonCodes.push('cadence:mission_gate_relaxed_stub')
    }
  }
  if (cadenceBand === 'elevated' || crisisPhase === 'escalating') {
    cadenceStressReasonCodes.push('cadence:elevated_monitoring')
  }
  if (crisisPhase === 'recovery') {
    cadenceStressReasonCodes.push('cadence:recovery_phase_coexist')
  }

  return Object.freeze({
    downstream,
    cadenceStressReasonCodes: uniqueSorted(cadenceStressReasonCodes),
    effectiveCrisisAmplifier,
  })
}

export function assertPublicServiceCategoryExhaustive(category: PublicServiceCategory): void {
  if (!(PUBLIC_SERVICE_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error(`Unknown public service category: ${category}`)
  }
}

export function assertServiceReliabilityStateExhaustive(state: ServiceReliabilityState): void {
  if (!(SERVICE_RELIABILITY_STATES as readonly string[]).includes(state)) {
    throw new Error(`Unknown service reliability state: ${state}`)
  }
}
