/**
 * SPE-1022 — base defense doctrine and threat-class coverage matrix.
 *
 * Pure caller-owned packets plan facility defense from internal threat axes,
 * coverage modules, ingress-count risk, concentric rings, hardened zones,
 * layout isolation tradeoffs, pre-attack preparation with opportunity cost,
 * and whole-base compound-failure pressures. Doctrine planning is distinct
 * from individual locks, traps, or single-room countermeasures alone.
 *
 * This module does not persist GameState, run week-close, simulate combat, or
 * assume a perfect sealed-bunker end state.
 */

export const DEFENSE_DOCTRINE_FACILITY_ID = 'facility:doctrine-wing' as const

/** Internal governed threat axes — not imported franchise threat labels. */
export const THREAT_AXES = [
  'dream_intrusion',
  'staff_impersonation',
  'flying_access',
  'mirror_transit',
  'utility_infiltration',
  'systems_corruption',
  'brute_force_breach',
] as const
export type ThreatAxis = (typeof THREAT_AXES)[number]

export const DEFENSE_COVERAGE_MODULES = [
  'dream_ward',
  'personnel_verification',
  'aerial_netting',
  'mirror_seal',
  'utility_lockout',
  'systems_hardening',
  'physical_barrier',
  'signal_fog',
  'false_hallway',
  'guard_post',
  'sensor_grid',
  'alarm_net',
  'safe_door',
  'evacuation_corridor',
  'perimeter_module',
] as const
export type DefenseCoverageModule = (typeof DEFENSE_COVERAGE_MODULES)[number]

/** Concentric defensive rings from outer public cover to deep vault. */
export const DEFENSE_RINGS = [
  'public_cover',
  'administration',
  'operations',
  'containment',
  'deep_vault',
] as const
export type DefenseRing = (typeof DEFENSE_RINGS)[number]

export const SECURITY_POSTURES = [
  'active',
  'skeleton',
  'unattended',
  'quarantined',
] as const
export type SecurityPosture = (typeof SECURITY_POSTURES)[number]

export const INGRESS_KINDS = [
  'door',
  'dock',
  'tunnel',
  'shaft',
  'drain',
  'uplink',
  'mirror_room',
  'morgue_intake',
  'ritual_threshold',
  'rooftop',
  'vent',
  'skylight',
  'astral_vector',
  'utility_line',
] as const
export type IngressKind = (typeof INGRESS_KINDS)[number]

export const DEFENSE_COMPONENT_KINDS = [
  'lock',
  'barrier',
  'sensor',
  'alarm',
  'safe_door',
  'evacuation_corridor',
  'perimeter_module',
  'signal_fog',
  'dream_ward',
  'false_hallway',
  'barricade',
  'gate',
  'chokepoint',
  'fortified_room',
] as const
export type DefenseComponentKind = (typeof DEFENSE_COMPONENT_KINDS)[number]

export const DEFENSE_MOBILITY = ['mobile_personal', 'fixed'] as const
export type DefenseMobility = (typeof DEFENSE_MOBILITY)[number]

export const PREPARATION_APPROACHES = [
  'civilian_force_building',
  'emergency_drills',
  'morale_work',
  'tactical_instruction',
  'emplacement_construction',
] as const
export type PreparationApproach = (typeof PREPARATION_APPROACHES)[number]

export const COMPOUND_PRESSURES = [
  'breach',
  'media_pressure',
  'staff_exhaustion',
  'inbound_logistics',
  'witness_traffic',
  'secondary_crisis',
] as const
export type CompoundPressure = (typeof COMPOUND_PRESSURES)[number]

export const LAYOUT_GEOMETRIES = [
  'clean_isolation',
  'branching_convenience',
  'contractor_safe_path',
  'public_service_throughput',
] as const
export type LayoutGeometry = (typeof LAYOUT_GEOMETRIES)[number]

/** Primary coverage module recommended for each threat axis. */
export const THREAT_AXIS_PRIMARY_MODULE: Readonly<
  Record<ThreatAxis, DefenseCoverageModule>
> = {
  dream_intrusion: 'dream_ward',
  staff_impersonation: 'personnel_verification',
  flying_access: 'aerial_netting',
  mirror_transit: 'mirror_seal',
  utility_infiltration: 'utility_lockout',
  systems_corruption: 'systems_hardening',
  brute_force_breach: 'physical_barrier',
}

const RING_DEPTH: Readonly<Record<DefenseRing, number>> = {
  public_cover: 0,
  administration: 1,
  operations: 2,
  containment: 3,
  deep_vault: 4,
}

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

function requireNonNegativeInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined
}

function parseThreatAxes(value: unknown): readonly ThreatAxis[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const axes: ThreatAxis[] = []
  const seen = new Set<ThreatAxis>()
  for (const item of value) {
    const axis = requireEnum(item, THREAT_AXES)
    if (!axis || seen.has(axis)) return undefined
    seen.add(axis)
    axes.push(axis)
  }
  return axes
}

function parseModules(
  value: unknown
): readonly DefenseCoverageModule[] | undefined {
  if (!Array.isArray(value)) return undefined
  const modules: DefenseCoverageModule[] = []
  const seen = new Set<DefenseCoverageModule>()
  for (const item of value) {
    const mod = requireEnum(item, DEFENSE_COVERAGE_MODULES)
    if (!mod || seen.has(mod)) return undefined
    seen.add(mod)
    modules.push(mod)
  }
  return modules
}

function parseIngressKinds(value: unknown): readonly IngressKind[] | undefined {
  if (!Array.isArray(value)) return undefined
  const kinds: IngressKind[] = []
  for (const item of value) {
    const kind = requireEnum(item, INGRESS_KINDS)
    if (!kind) return undefined
    kinds.push(kind)
  }
  return kinds
}

function parsePressures(value: unknown): readonly CompoundPressure[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const pressures: CompoundPressure[] = []
  const seen = new Set<CompoundPressure>()
  for (const item of value) {
    const pressure = requireEnum(item, COMPOUND_PRESSURES)
    if (!pressure || seen.has(pressure)) return undefined
    seen.add(pressure)
    pressures.push(pressure)
  }
  return pressures
}

function parseApproaches(
  value: unknown
): readonly PreparationApproach[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const approaches: PreparationApproach[] = []
  const seen = new Set<PreparationApproach>()
  for (const item of value) {
    const approach = requireEnum(item, PREPARATION_APPROACHES)
    if (!approach || seen.has(approach)) return undefined
    seen.add(approach)
    approaches.push(approach)
  }
  return approaches
}

export interface ThreatClassCoveragePlanInput {
  readonly facilityId: string
  readonly activeThreatAxes: readonly ThreatAxis[]
  readonly configuredModules: readonly DefenseCoverageModule[]
}

export interface ThreatClassCoveragePlanResult {
  readonly facilityId: string
  readonly activeThreatAxes: readonly ThreatAxis[]
  readonly modulesAdded: readonly DefenseCoverageModule[]
  readonly modulesRemoved: readonly DefenseCoverageModule[]
  readonly resultingModules: readonly DefenseCoverageModule[]
  readonly oneProfileCoversAllAxes: false
}

/**
 * Reconfigure defensive-coverage modules from the active threat-axis profile.
 * Axes that lack their primary module get that module added; modules whose
 * primary axis is inactive are removed (except shared perimeter/support kits).
 */
export function planThreatClassCoverage(
  input: unknown
): ThreatClassCoveragePlanResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const activeThreatAxes = parseThreatAxes(packet.activeThreatAxes)
  const configuredModules = parseModules(packet.configuredModules)
  if (!facilityId || !activeThreatAxes || !configuredModules) return undefined

  /** Shared / anomalous modules kept unless explicitly replaced by axis planning. */
  const retainedSupport: ReadonlySet<DefenseCoverageModule> = new Set([
    'guard_post',
    'sensor_grid',
    'alarm_net',
    'evacuation_corridor',
    'perimeter_module',
    'signal_fog',
    'false_hallway',
    'safe_door',
  ])

  const required = new Set<DefenseCoverageModule>()
  for (const axis of activeThreatAxes) {
    required.add(THREAT_AXIS_PRIMARY_MODULE[axis])
  }
  for (const mod of configuredModules) {
    if (retainedSupport.has(mod)) required.add(mod)
  }

  const configuredSet = new Set(configuredModules)
  const modulesAdded = [...required].filter((m) => !configuredSet.has(m)).sort()
  const modulesRemoved = configuredModules
    .filter((m) => !required.has(m))
    .slice()
    .sort()
  const resultingModules = [...required].sort()

  return {
    facilityId,
    activeThreatAxes,
    modulesAdded,
    modulesRemoved,
    resultingModules,
    oneProfileCoversAllAxes: false,
  }
}

export interface IngressRiskSurfaceInput {
  readonly facilityId: string
  readonly ingressPoints: readonly IngressKind[]
  readonly capabilityGainUnits: number
}

export interface IngressRiskSurfaceResult {
  readonly facilityId: string
  readonly ingressCount: number
  readonly attackSurfaceUnits: number
  readonly capabilityGainUnits: number
  readonly capabilityImproved: boolean
  readonly attackSurfaceIncreased: boolean
  readonly moreIngressAutomaticallySafer: false
}

/**
 * Every configured ingress increases attack surface even when it expands
 * capability. More doors/docks/uplinks are never automatically safer.
 */
export function evaluateIngressRiskSurface(
  input: unknown
): IngressRiskSurfaceResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const ingressPoints = parseIngressKinds(packet.ingressPoints)
  const capabilityGainUnits = requireNonNegativeInt(packet.capabilityGainUnits)
  if (!facilityId || !ingressPoints || capabilityGainUnits === undefined) {
    return undefined
  }

  const ingressCount = ingressPoints.length
  return {
    facilityId,
    ingressCount,
    attackSurfaceUnits: ingressCount,
    capabilityGainUnits,
    capabilityImproved: capabilityGainUnits > 0,
    attackSurfaceIncreased: ingressCount > 0,
    moreIngressAutomaticallySafer: false,
  }
}

export interface HardenedZoneEffectInput {
  readonly facilityId: string
  readonly zoneId: string
  readonly componentKind: DefenseComponentKind
  readonly mobility: DefenseMobility
  readonly hardened: boolean
}

export interface HardenedZoneEffectResult {
  readonly facilityId: string
  readonly zoneId: string
  readonly componentKind: DefenseComponentKind
  readonly mobility: DefenseMobility
  readonly spreadDamageReduced: boolean
  readonly breachResistanceDelta: number
  readonly evacuationCostDelta: number
  readonly isFixedDefense: boolean
  readonly freeHardening: false
}

/**
 * Fixed hardened components reduce spread damage and raise breach resistance
 * while increasing evacuation cost. Mobile personal reactions are not fixed
 * doctrine components. Hardening is never free.
 */
export function projectHardenedZoneEffect(
  input: unknown
): HardenedZoneEffectResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const zoneId = requireTrimmedId(packet.zoneId)
  const componentKind = requireEnum(packet.componentKind, DEFENSE_COMPONENT_KINDS)
  const mobility = requireEnum(packet.mobility, DEFENSE_MOBILITY)
  const hardened = requireBoolean(packet.hardened)
  if (!facilityId || !zoneId || !componentKind || !mobility || hardened === undefined) {
    return undefined
  }

  const isFixedDefense = mobility === 'fixed'
  const appliesHardening = isFixedDefense && hardened
  return {
    facilityId,
    zoneId,
    componentKind,
    mobility,
    spreadDamageReduced: appliesHardening,
    breachResistanceDelta: appliesHardening ? 2 : 0,
    evacuationCostDelta: appliesHardening ? 1 : 0,
    isFixedDefense,
    freeHardening: false,
  }
}

export interface ConcentricRingBreachInput {
  readonly facilityId: string
  readonly outermostBreachedRing: DefenseRing
  readonly deepestBreachedRing: DefenseRing
}

export interface ConcentricRingBreachResult {
  readonly facilityId: string
  readonly ringsCrossed: number
  readonly breachSeverity: number
  readonly reachesDeepVault: boolean
}

/**
 * Breach severity scales with how many concentric rings are crossed from the
 * outermost breached ring through the deepest breached ring (inclusive).
 */
export function evaluateConcentricRingBreach(
  input: unknown
): ConcentricRingBreachResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const outermostBreachedRing = requireEnum(
    packet.outermostBreachedRing,
    DEFENSE_RINGS
  )
  const deepestBreachedRing = requireEnum(packet.deepestBreachedRing, DEFENSE_RINGS)
  if (!facilityId || !outermostBreachedRing || !deepestBreachedRing) return undefined

  const outerDepth = RING_DEPTH[outermostBreachedRing]
  const deepDepth = RING_DEPTH[deepestBreachedRing]
  if (deepDepth < outerDepth) return undefined

  const ringsCrossed = deepDepth - outerDepth + 1
  return {
    facilityId,
    ringsCrossed,
    breachSeverity: ringsCrossed,
    reachesDeepVault: deepestBreachedRing === 'deep_vault',
  }
}

export interface WholeBaseCompoundFailureInput {
  readonly facilityId: string
  readonly activePressures: readonly CompoundPressure[]
}

export interface WholeBaseCompoundFailureResult {
  readonly facilityId: string
  readonly activePressures: readonly CompoundPressure[]
  readonly pressureCount: number
  readonly compoundFailure: boolean
  readonly isolatedBreachOnly: boolean
}

/**
 * Whole-base planning treats simultaneous pressures as a compound failure when
 * more than one pressure is active — not as a single isolated breach.
 */
export function evaluateWholeBaseCompoundFailure(
  input: unknown
): WholeBaseCompoundFailureResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const activePressures = parsePressures(packet.activePressures)
  if (!facilityId || !activePressures) return undefined

  const pressureCount = activePressures.length
  const compoundFailure = pressureCount > 1
  const isolatedBreachOnly =
    pressureCount === 1 && activePressures[0] === 'breach'

  return {
    facilityId,
    activePressures,
    pressureCount,
    compoundFailure,
    isolatedBreachOnly,
  }
}

export interface LayoutIsolationTradeoffInput {
  readonly facilityId: string
  readonly layoutGeometry: LayoutGeometry
}

export interface LayoutIsolationTradeoffResult {
  readonly facilityId: string
  readonly layoutGeometry: LayoutGeometry
  readonly isolationCleanliness: number
  readonly operationalConvenience: number
  readonly tradesConvenienceForIsolation: boolean
}

/**
 * Clean isolation geometry raises isolation cleanliness and lowers operational
 * convenience; branching / contractor / public-service layouts invert that trade.
 */
export function evaluateLayoutIsolationTradeoff(
  input: unknown
): LayoutIsolationTradeoffResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const layoutGeometry = requireEnum(packet.layoutGeometry, LAYOUT_GEOMETRIES)
  if (!facilityId || !layoutGeometry) return undefined

  const clean = layoutGeometry === 'clean_isolation'
  return {
    facilityId,
    layoutGeometry,
    isolationCleanliness: clean ? 3 : 1,
    operationalConvenience: clean ? 1 : 3,
    tradesConvenienceForIsolation: clean,
  }
}

export interface PreAttackPreparationInput {
  readonly facilityId: string
  readonly approaches: readonly PreparationApproach[]
  readonly contributorCount: number
  readonly targetThreatAxis: ThreatAxis
}

export interface PreAttackPreparationResult {
  readonly facilityId: string
  readonly approaches: readonly PreparationApproach[]
  readonly targetThreatAxis: ThreatAxis
  readonly defenseReadinessDelta: number
  readonly opportunityCostUnits: number
  readonly multiApproachReachable: boolean
  readonly invulnerableBunker: false
}

/**
 * Pre-attack preparation improves readiness through drills, force-building,
 * morale, instruction, or emplacements. Multiple approaches can reach the same
 * readiness outcome while concentrated contributors raise opportunity cost.
 * Stronger prep never yields an invulnerable bunker.
 */
export function projectPreAttackPreparation(
  input: unknown
): PreAttackPreparationResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const approaches = parseApproaches(packet.approaches)
  const contributorCount = requireNonNegativeInt(packet.contributorCount)
  const targetThreatAxis = requireEnum(packet.targetThreatAxis, THREAT_AXES)
  if (
    !facilityId ||
    !approaches ||
    contributorCount === undefined ||
    contributorCount < 1 ||
    !targetThreatAxis
  ) {
    return undefined
  }

  const defenseReadinessDelta = approaches.length
  const opportunityCostUnits = Math.max(0, contributorCount - 1)
  return {
    facilityId,
    approaches,
    targetThreatAxis,
    defenseReadinessDelta,
    opportunityCostUnits,
    multiApproachReachable: approaches.length > 1,
    invulnerableBunker: false,
  }
}

export interface SecurityPostureCoverageInput {
  readonly facilityId: string
  readonly posture: SecurityPosture
  readonly guardPostsConfigured: number
}

export interface SecurityPostureCoverageResult {
  readonly facilityId: string
  readonly posture: SecurityPosture
  readonly effectiveGuardCoverage: number
  readonly attendedDefense: boolean
}

/**
 * Occupancy/security posture scales effective guard-post coverage. Unattended
 * and quarantined postures suppress attended defense even when posts exist.
 */
export function projectSecurityPostureCoverage(
  input: unknown
): SecurityPostureCoverageResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const posture = requireEnum(packet.posture, SECURITY_POSTURES)
  const guardPostsConfigured = requireNonNegativeInt(packet.guardPostsConfigured)
  if (!facilityId || !posture || guardPostsConfigured === undefined) {
    return undefined
  }

  let effectiveGuardCoverage = 0
  switch (posture) {
    case 'active':
      effectiveGuardCoverage = guardPostsConfigured
      break
    case 'skeleton':
      // Skeleton staffing halves posts but keeps at least one when any are configured.
      effectiveGuardCoverage =
        guardPostsConfigured === 0
          ? 0
          : Math.max(1, Math.floor(guardPostsConfigured / 2))
      break
    case 'unattended':
    case 'quarantined':
      effectiveGuardCoverage = 0
      break
  }

  return {
    facilityId,
    posture,
    effectiveGuardCoverage,
    attendedDefense: effectiveGuardCoverage > 0,
  }
}

export interface ExteriorLaborRiskInput {
  readonly facilityId: string
  readonly laborKind:
    | 'maintenance_crew'
    | 'courier'
    | 'field_pickup'
    | 'rooftop_servicing'
    | 'contractor_route'
  readonly escortProvided: boolean
  readonly shieldingProvided: boolean
  readonly remoteAlternative: boolean
}

export interface ExteriorLaborRiskResult {
  readonly facilityId: string
  readonly laborKind: ExteriorLaborRiskInput['laborKind']
  readonly exteriorExposure: boolean
  readonly mitigated: boolean
}

const EXTERIOR_LABOR_KINDS = [
  'maintenance_crew',
  'courier',
  'field_pickup',
  'rooftop_servicing',
  'contractor_route',
] as const

/**
 * Exterior labor and transit require escort, shielding, or remote alternatives.
 * Unmitigated exterior work remains exposed.
 */
export function evaluateExteriorLaborRisk(
  input: unknown
): ExteriorLaborRiskResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const laborKind = requireEnum(packet.laborKind, EXTERIOR_LABOR_KINDS)
  const escortProvided = requireBoolean(packet.escortProvided)
  const shieldingProvided = requireBoolean(packet.shieldingProvided)
  const remoteAlternative = requireBoolean(packet.remoteAlternative)
  if (
    !facilityId ||
    !laborKind ||
    escortProvided === undefined ||
    shieldingProvided === undefined ||
    remoteAlternative === undefined
  ) {
    return undefined
  }

  return {
    facilityId,
    laborKind,
    exteriorExposure: true,
    mitigated: escortProvided || shieldingProvided || remoteAlternative,
  }
}

export interface FortificationProgressionBurdenInput {
  readonly facilityId: string
  readonly fortificationTier: number
}

export interface FortificationProgressionBurdenResult {
  readonly facilityId: string
  readonly fortificationTier: number
  readonly breachResistanceDelta: number
  readonly maintenanceBurden: number
  readonly dependencyBurden: number
  readonly auditBurden: number
  readonly trustCost: number
  readonly logisticsFriction: number
  readonly invulnerableBunker: false
}

/**
 * Stronger fortification tiers raise breach resistance and also raise
 * maintenance, dependency, audit, trust, and logistics burdens.
 */
export function projectFortificationProgressionBurden(
  input: unknown
): FortificationProgressionBurdenResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const fortificationTier = requireNonNegativeInt(packet.fortificationTier)
  if (!facilityId || fortificationTier === undefined || fortificationTier < 1) {
    return undefined
  }

  return {
    facilityId,
    fortificationTier,
    breachResistanceDelta: fortificationTier,
    maintenanceBurden: fortificationTier,
    dependencyBurden: fortificationTier,
    auditBurden: fortificationTier,
    trustCost: fortificationTier,
    logisticsFriction: fortificationTier,
    invulnerableBunker: false,
  }
}
