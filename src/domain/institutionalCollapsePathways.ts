/**
 * SPE-2261 — pure institutional collapse pathway registry (slice 1).
 *
 * Callers own non-combat institutional pressure inputs (maintenance debt,
 * supply shortfall, routing/labor misallocation, morale/clutter/hunger).
 * This module maps those inputs onto authored pathway families with threshold
 * bands, degraded outputs, recovery requirements, and optional chain-into
 * second degraded states. It does not persist GameState, run week-close,
 * rewrite SPE-1051 campaign scars, or implement SPE-1058 labor consume.
 */

export const INSTITUTIONAL_COLLAPSE_PATHWAY_FAMILIES = [
  'supply_maintenance',
  'labor_routing',
  'morale_overload',
] as const
export type InstitutionalCollapsePathwayFamily =
  (typeof INSTITUTIONAL_COLLAPSE_PATHWAY_FAMILIES)[number]

export const INSTITUTIONAL_COLLAPSE_PATHWAY_IDS = [
  'maintenance_debt_overrun',
  'logistics_stall',
  'routing_misallocation',
  'morale_stress_break',
] as const
export type InstitutionalCollapsePathwayId = (typeof INSTITUTIONAL_COLLAPSE_PATHWAY_IDS)[number]

export const INSTITUTIONAL_COLLAPSE_THRESHOLD_BANDS = [
  'stable',
  'strained',
  'degraded',
  'critical',
] as const
export type InstitutionalCollapseThresholdBand =
  (typeof INSTITUTIONAL_COLLAPSE_THRESHOLD_BANDS)[number]

export type InstitutionalCollapseActiveBand = Exclude<InstitutionalCollapseThresholdBand, 'stable'>

export const INSTITUTIONAL_COLLAPSE_TRIGGER_KEYS = [
  'maintenanceDebt',
  'supplyShortfall',
  'routingFailureRate',
  'laborMisallocation',
  'moraleStress',
  'clutterLoad',
  'hungerPressure',
] as const
export type InstitutionalCollapseTriggerKey = (typeof INSTITUTIONAL_COLLAPSE_TRIGGER_KEYS)[number]

export interface InstitutionalCollapsePathwayInput {
  readonly maintenanceDebt?: number
  readonly supplyShortfall?: number
  readonly routingFailureRate?: number
  readonly laborMisallocation?: number
  readonly moraleStress?: number
  readonly clutterLoad?: number
  readonly hungerPressure?: number
}

export interface InstitutionalCollapseDegradedOutputs {
  readonly facilityThroughputPenalty: number
  readonly repairBacklogGrowth: number
  readonly deliveryLatencyPenalty: number
  readonly stockoutRisk: number
  readonly taskThroughputPenalty: number
  readonly queueStallRisk: number
  readonly effectivenessPenalty: number
  readonly attritionRisk: number
}

export interface InstitutionalCollapseRecoveryRequirements {
  readonly maintenanceHours: number
  readonly partsReserve: number
  readonly restockActions: number
  readonly corridorClearance: number
  readonly reassignmentTicks: number
  readonly specialistCoverage: number
  readonly restWeeks: number
  readonly welfareCapacity: number
}

export interface InstitutionalCollapsePathwayRecord {
  readonly pathwayId: InstitutionalCollapsePathwayId
  readonly family: InstitutionalCollapsePathwayFamily
  readonly triggerKey: InstitutionalCollapseTriggerKey
  readonly band: InstitutionalCollapseActiveBand
  readonly triggerValue: number
  readonly degradedOutputs: InstitutionalCollapseDegradedOutputs
  readonly recoveryRequirements: InstitutionalCollapseRecoveryRequirements
  /** When set, this pathway was activated by a chain from another pathway. */
  readonly chainedFrom: InstitutionalCollapsePathwayId | null
}

export interface InstitutionalCollapseProjection {
  readonly activePathways: readonly InstitutionalCollapsePathwayRecord[]
  readonly firedPathwayIds: readonly InstitutionalCollapsePathwayId[]
}

interface ThresholdBands {
  readonly strained: number
  readonly degraded: number
  readonly critical: number
}

interface BandScaledFields {
  readonly degradedOutputs: InstitutionalCollapseDegradedOutputs
  readonly recoveryRequirements: InstitutionalCollapseRecoveryRequirements
}

interface PathwayDefinition {
  readonly pathwayId: InstitutionalCollapsePathwayId
  readonly family: InstitutionalCollapsePathwayFamily
  readonly triggerKey: InstitutionalCollapseTriggerKey
  readonly thresholds: ThresholdBands
  readonly byBand: Record<InstitutionalCollapseActiveBand, BandScaledFields>
  /** When this pathway reaches critical, activate the target at least at degraded. */
  readonly chainsTo: InstitutionalCollapsePathwayId | null
}

const ZERO_OUTPUTS: InstitutionalCollapseDegradedOutputs = Object.freeze({
  facilityThroughputPenalty: 0,
  repairBacklogGrowth: 0,
  deliveryLatencyPenalty: 0,
  stockoutRisk: 0,
  taskThroughputPenalty: 0,
  queueStallRisk: 0,
  effectivenessPenalty: 0,
  attritionRisk: 0,
})

const ZERO_RECOVERY: InstitutionalCollapseRecoveryRequirements = Object.freeze({
  maintenanceHours: 0,
  partsReserve: 0,
  restockActions: 0,
  corridorClearance: 0,
  reassignmentTicks: 0,
  specialistCoverage: 0,
  restWeeks: 0,
  welfareCapacity: 0,
})

function scaleOutputs(
  patch: Partial<InstitutionalCollapseDegradedOutputs>
): InstitutionalCollapseDegradedOutputs {
  return Object.freeze({ ...ZERO_OUTPUTS, ...patch })
}

function scaleRecovery(
  patch: Partial<InstitutionalCollapseRecoveryRequirements>
): InstitutionalCollapseRecoveryRequirements {
  return Object.freeze({ ...ZERO_RECOVERY, ...patch })
}

/**
 * Authored pathway table. Order is projection order (byte-stable).
 * Maintenance debt at critical chains into logistics_stall (second degraded state).
 */
const PATHWAY_DEFINITIONS: readonly PathwayDefinition[] = Object.freeze([
  Object.freeze({
    pathwayId: 'maintenance_debt_overrun' as const,
    family: 'supply_maintenance' as const,
    triggerKey: 'maintenanceDebt' as const,
    thresholds: Object.freeze({ strained: 8, degraded: 18, critical: 30 }),
    byBand: Object.freeze({
      strained: Object.freeze({
        degradedOutputs: scaleOutputs({
          facilityThroughputPenalty: 5,
          repairBacklogGrowth: 4,
        }),
        recoveryRequirements: scaleRecovery({
          maintenanceHours: 4,
          partsReserve: 2,
        }),
      }),
      degraded: Object.freeze({
        degradedOutputs: scaleOutputs({
          facilityThroughputPenalty: 15,
          repairBacklogGrowth: 12,
        }),
        recoveryRequirements: scaleRecovery({
          maintenanceHours: 10,
          partsReserve: 6,
        }),
      }),
      critical: Object.freeze({
        degradedOutputs: scaleOutputs({
          facilityThroughputPenalty: 30,
          repairBacklogGrowth: 24,
        }),
        recoveryRequirements: scaleRecovery({
          maintenanceHours: 20,
          partsReserve: 12,
        }),
      }),
    }),
    chainsTo: 'logistics_stall' as const,
  }),
  Object.freeze({
    pathwayId: 'logistics_stall' as const,
    family: 'supply_maintenance' as const,
    triggerKey: 'supplyShortfall' as const,
    thresholds: Object.freeze({ strained: 10, degraded: 25, critical: 40 }),
    byBand: Object.freeze({
      strained: Object.freeze({
        degradedOutputs: scaleOutputs({
          deliveryLatencyPenalty: 8,
          stockoutRisk: 6,
        }),
        recoveryRequirements: scaleRecovery({
          restockActions: 2,
          corridorClearance: 1,
        }),
      }),
      degraded: Object.freeze({
        degradedOutputs: scaleOutputs({
          deliveryLatencyPenalty: 20,
          stockoutRisk: 18,
        }),
        recoveryRequirements: scaleRecovery({
          restockActions: 5,
          corridorClearance: 3,
        }),
      }),
      critical: Object.freeze({
        degradedOutputs: scaleOutputs({
          deliveryLatencyPenalty: 40,
          stockoutRisk: 35,
        }),
        recoveryRequirements: scaleRecovery({
          restockActions: 10,
          corridorClearance: 6,
        }),
      }),
    }),
    chainsTo: null,
  }),
  Object.freeze({
    pathwayId: 'routing_misallocation' as const,
    family: 'labor_routing' as const,
    triggerKey: 'routingFailureRate' as const,
    thresholds: Object.freeze({ strained: 15, degraded: 35, critical: 55 }),
    byBand: Object.freeze({
      strained: Object.freeze({
        degradedOutputs: scaleOutputs({
          taskThroughputPenalty: 6,
          queueStallRisk: 5,
        }),
        recoveryRequirements: scaleRecovery({
          reassignmentTicks: 1,
          specialistCoverage: 1,
        }),
      }),
      degraded: Object.freeze({
        degradedOutputs: scaleOutputs({
          taskThroughputPenalty: 18,
          queueStallRisk: 16,
        }),
        recoveryRequirements: scaleRecovery({
          reassignmentTicks: 3,
          specialistCoverage: 2,
        }),
      }),
      critical: Object.freeze({
        degradedOutputs: scaleOutputs({
          taskThroughputPenalty: 36,
          queueStallRisk: 32,
        }),
        recoveryRequirements: scaleRecovery({
          reassignmentTicks: 6,
          specialistCoverage: 4,
        }),
      }),
    }),
    chainsTo: null,
  }),
  Object.freeze({
    pathwayId: 'morale_stress_break' as const,
    family: 'morale_overload' as const,
    triggerKey: 'moraleStress' as const,
    thresholds: Object.freeze({ strained: 20, degraded: 40, critical: 60 }),
    byBand: Object.freeze({
      strained: Object.freeze({
        degradedOutputs: scaleOutputs({
          effectivenessPenalty: 7,
          attritionRisk: 4,
        }),
        recoveryRequirements: scaleRecovery({
          restWeeks: 1,
          welfareCapacity: 2,
        }),
      }),
      degraded: Object.freeze({
        degradedOutputs: scaleOutputs({
          effectivenessPenalty: 18,
          attritionRisk: 12,
        }),
        recoveryRequirements: scaleRecovery({
          restWeeks: 2,
          welfareCapacity: 5,
        }),
      }),
      critical: Object.freeze({
        degradedOutputs: scaleOutputs({
          effectivenessPenalty: 35,
          attritionRisk: 28,
        }),
        recoveryRequirements: scaleRecovery({
          restWeeks: 4,
          welfareCapacity: 10,
        }),
      }),
    }),
    chainsTo: null,
  }),
])

const BAND_RANK: Record<InstitutionalCollapseThresholdBand, number> = {
  stable: 0,
  strained: 1,
  degraded: 2,
  critical: 3,
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isInstitutionalCollapsePathwayFamily(
  value: unknown
): value is InstitutionalCollapsePathwayFamily {
  return INSTITUTIONAL_COLLAPSE_PATHWAY_FAMILIES.some((family) => family === value)
}

export function isInstitutionalCollapsePathwayId(
  value: unknown
): value is InstitutionalCollapsePathwayId {
  return INSTITUTIONAL_COLLAPSE_PATHWAY_IDS.some((id) => id === value)
}

export function isInstitutionalCollapseThresholdBand(
  value: unknown
): value is InstitutionalCollapseThresholdBand {
  return INSTITUTIONAL_COLLAPSE_THRESHOLD_BANDS.some((band) => band === value)
}

function resolveBand(
  value: number,
  thresholds: ThresholdBands
): InstitutionalCollapseThresholdBand {
  if (value >= thresholds.critical) return 'critical'
  if (value >= thresholds.degraded) return 'degraded'
  if (value >= thresholds.strained) return 'strained'
  return 'stable'
}

function maxBand(
  left: InstitutionalCollapseThresholdBand,
  right: InstitutionalCollapseThresholdBand
): InstitutionalCollapseThresholdBand {
  return BAND_RANK[left] >= BAND_RANK[right] ? left : right
}

function readTriggerValue(
  input: InstitutionalCollapsePathwayInput,
  key: InstitutionalCollapseTriggerKey
): number | undefined {
  const value = input[key]
  return value === undefined ? undefined : value
}

/**
 * Validate caller-owned inputs. Any present trigger that is not a
 * non-negative finite number fails closed. Empty object is valid (no fires).
 */
export function validateInstitutionalCollapsePathwayInput(
  input: unknown
): input is InstitutionalCollapsePathwayInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>
  for (const key of INSTITUTIONAL_COLLAPSE_TRIGGER_KEYS) {
    if (!(key in record)) continue
    if (!isNonNegativeFiniteNumber(record[key])) return false
  }
  return true
}

function buildActiveRecord(
  definition: PathwayDefinition,
  band: InstitutionalCollapseActiveBand,
  triggerValue: number,
  chainedFrom: InstitutionalCollapsePathwayId | null
): InstitutionalCollapsePathwayRecord {
  const scaled = definition.byBand[band]
  return Object.freeze({
    pathwayId: definition.pathwayId,
    family: definition.family,
    triggerKey: definition.triggerKey,
    band,
    triggerValue,
    degradedOutputs: scaled.degradedOutputs,
    recoveryRequirements: scaled.recoveryRequirements,
    chainedFrom,
  })
}

/**
 * Project caller-owned institutional pressures into an immutable collapse
 * pathway projection. Malformed inputs fail closed to undefined.
 *
 * Chain rule: when `maintenance_debt_overrun` reaches critical, `logistics_stall`
 * is activated at least at degraded (or escalated if its own trigger is higher).
 */
export function projectInstitutionalCollapsePathways(
  input: InstitutionalCollapsePathwayInput | null | undefined
): InstitutionalCollapseProjection | undefined {
  if (!validateInstitutionalCollapsePathwayInput(input)) return undefined

  const directBands = new Map<
    InstitutionalCollapsePathwayId,
    { band: InstitutionalCollapseActiveBand; triggerValue: number }
  >()

  for (const definition of PATHWAY_DEFINITIONS) {
    let raw = readTriggerValue(input, definition.triggerKey)

    // Labor misallocation folds into routing when present (max with routing rate).
    if (definition.pathwayId === 'routing_misallocation') {
      const labor = input.laborMisallocation
      if (raw === undefined && labor !== undefined) raw = labor
      else if (raw !== undefined && labor !== undefined) raw = Math.max(raw, labor)
    }

    // Clutter / hunger fold into morale when present (max with morale stress).
    if (definition.pathwayId === 'morale_stress_break') {
      const clutter = input.clutterLoad
      const hunger = input.hungerPressure
      const overload =
        clutter !== undefined || hunger !== undefined
          ? Math.max(clutter ?? 0, hunger ?? 0)
          : undefined
      if (raw === undefined && overload !== undefined) raw = overload
      else if (raw !== undefined && overload !== undefined) raw = Math.max(raw, overload)
    }

    if (raw === undefined) continue
    const band = resolveBand(raw, definition.thresholds)
    if (band === 'stable') continue
    directBands.set(definition.pathwayId, { band, triggerValue: raw })
  }

  const chainFloor = new Map<
    InstitutionalCollapsePathwayId,
    {
      band: InstitutionalCollapseActiveBand
      chainedFrom: InstitutionalCollapsePathwayId
      triggerValue: number
    }
  >()

  for (const definition of PATHWAY_DEFINITIONS) {
    if (!definition.chainsTo) continue
    const source = directBands.get(definition.pathwayId)
    if (!source || source.band !== 'critical') continue
    const floorBand: InstitutionalCollapseActiveBand = 'degraded'
    const existing = chainFloor.get(definition.chainsTo)
    if (!existing || BAND_RANK[floorBand] > BAND_RANK[existing.band]) {
      chainFloor.set(definition.chainsTo, {
        band: floorBand,
        chainedFrom: definition.pathwayId,
        triggerValue: source.triggerValue,
      })
    }
  }

  const activePathways: InstitutionalCollapsePathwayRecord[] = []

  for (const definition of PATHWAY_DEFINITIONS) {
    const direct = directBands.get(definition.pathwayId)
    const chained = chainFloor.get(definition.pathwayId)
    if (!direct && !chained) continue

    let band: InstitutionalCollapseActiveBand
    let triggerValue: number
    let chainedFrom: InstitutionalCollapsePathwayId | null

    if (direct && chained) {
      const merged = maxBand(direct.band, chained.band) as InstitutionalCollapseActiveBand
      band = merged
      triggerValue = Math.max(direct.triggerValue, chained.triggerValue)
      // Mark chain provenance when the chain raised severity above the direct band.
      chainedFrom = BAND_RANK[chained.band] > BAND_RANK[direct.band] ? chained.chainedFrom : null
    } else if (direct) {
      band = direct.band
      triggerValue = direct.triggerValue
      chainedFrom = null
    } else {
      band = chained!.band
      triggerValue = chained!.triggerValue
      chainedFrom = chained!.chainedFrom
    }

    activePathways.push(buildActiveRecord(definition, band, triggerValue, chainedFrom))
  }

  return Object.freeze({
    activePathways: Object.freeze(activePathways),
    firedPathwayIds: Object.freeze(activePathways.map((pathway) => pathway.pathwayId)),
  })
}

/** Lookup a single authored pathway definition projection helper for tests/docs. */
export function listInstitutionalCollapsePathwayIds(): readonly InstitutionalCollapsePathwayId[] {
  return INSTITUTIONAL_COLLAPSE_PATHWAY_IDS
}

export function listInstitutionalCollapsePathwayFamilies(): readonly InstitutionalCollapsePathwayFamily[] {
  return INSTITUTIONAL_COLLAPSE_PATHWAY_FAMILIES
}
