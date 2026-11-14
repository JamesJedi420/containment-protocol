/**
 * SPE-2192 slice 1: effect delivery geometry and scaling-cost registry.
 *
 * Pure deterministic registry for delivery geometry kinds and associated cost scaling.
 * No GameState persistence, runtime targeting, line-of-sight, or effect execution.
 * Distinct from duration modes and mobile-radius registries.
 */

export type DeliveryKind = 'cone' | 'line' | 'touch' | 'remote' | 'zone' | 'radius-anchor'

export const DELIVERY_KINDS: readonly DeliveryKind[] = [
  'cone',
  'line',
  'touch',
  'remote',
  'zone',
  'radius-anchor',
] as const

export type WillingnessRule = 'none' | 'consent' | 'resistance-check' | 'mandatory'

export const WILLINGNESS_RULES: readonly WillingnessRule[] = [
  'none',
  'consent',
  'resistance-check',
  'mandatory',
] as const

/** Documented bounds for areaScaleFactor. */
export const AREA_SCALE_FACTOR_MIN = 0 as const
export const AREA_SCALE_FACTOR_MAX = 10 as const

/** Delivery kinds that require a willingnessRule other than 'none'. */
export const KINDS_REQUIRING_WILLINGNESS: ReadonlySet<DeliveryKind> = new Set([
  'touch',
  'remote',
])

export interface EffectDeliveryGeometryRecord {
  readonly id: string
  readonly deliveryKind: DeliveryKind
  readonly baseCost: number
  readonly areaScaleFactor: number
  readonly willingnessRule: WillingnessRule
  readonly label?: string
}

export type EffectDeliveryGeometryValidationCode =
  | 'unknown_delivery_kind'
  | 'negative_base_cost'
  | 'area_scale_factor_out_of_bounds'
  | 'willingness_rule_required'
  | 'invalid_willingness_rule'
  | 'missing_id'

export interface EffectDeliveryGeometryValidationIssue {
  readonly code: EffectDeliveryGeometryValidationCode
  readonly detail: string
  readonly severity: 'error'
}

export interface EffectDeliveryGeometryValidationResult {
  readonly valid: boolean
  readonly issues: readonly EffectDeliveryGeometryValidationIssue[]
}

export interface EffectDeliveryGeometryProjection {
  readonly id: string
  readonly deliveryKind: DeliveryKind
  readonly baseCost: number
  readonly areaScaleFactor: number
  readonly willingnessRule: WillingnessRule
  readonly scaledCost: number
}

const DELIVERY_KIND_SET = new Set<string>(DELIVERY_KINDS)
const WILLINGNESS_RULE_SET = new Set<string>(WILLINGNESS_RULES)

function pushIssue(
  issues: EffectDeliveryGeometryValidationIssue[],
  issue: EffectDeliveryGeometryValidationIssue
): void {
  issues.push(issue)
}

export function validateEffectDeliveryGeometryRecord(
  record: EffectDeliveryGeometryRecord
): EffectDeliveryGeometryValidationResult {
  const issues: EffectDeliveryGeometryValidationIssue[] = []
  const id = typeof record.id === 'string' ? record.id.trim() : ''

  if (id.length === 0) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Effect delivery geometry record requires a nonempty id.',
      severity: 'error',
    })
  }

  if (!DELIVERY_KIND_SET.has(record.deliveryKind)) {
    pushIssue(issues, {
      code: 'unknown_delivery_kind',
      detail: `Unknown deliveryKind: ${String(record.deliveryKind)}.`,
      severity: 'error',
    })
  }

  if (typeof record.baseCost !== 'number' || record.baseCost < 0) {
    pushIssue(issues, {
      code: 'negative_base_cost',
      detail: `baseCost must be a non-negative number, got ${String(record.baseCost)}.`,
      severity: 'error',
    })
  }

  if (
    typeof record.areaScaleFactor !== 'number' ||
    record.areaScaleFactor < AREA_SCALE_FACTOR_MIN ||
    record.areaScaleFactor > AREA_SCALE_FACTOR_MAX
  ) {
    pushIssue(issues, {
      code: 'area_scale_factor_out_of_bounds',
      detail: `areaScaleFactor must be between ${AREA_SCALE_FACTOR_MIN} and ${AREA_SCALE_FACTOR_MAX}, got ${String(record.areaScaleFactor)}.`,
      severity: 'error',
    })
  }

  if (!WILLINGNESS_RULE_SET.has(record.willingnessRule)) {
    pushIssue(issues, {
      code: 'invalid_willingness_rule',
      detail: `Invalid willingnessRule: ${String(record.willingnessRule)}.`,
      severity: 'error',
    })
  } else if (
    KINDS_REQUIRING_WILLINGNESS.has(record.deliveryKind as DeliveryKind) &&
    record.willingnessRule === 'none'
  ) {
    pushIssue(issues, {
      code: 'willingness_rule_required',
      detail: `willingnessRule is required (cannot be 'none') for deliveryKind ${record.deliveryKind}.`,
      severity: 'error',
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function projectEffectDeliveryGeometry(
  record: EffectDeliveryGeometryRecord
): EffectDeliveryGeometryProjection | null {
  const validation = validateEffectDeliveryGeometryRecord(record)
  if (!validation.valid) {
    return null
  }

  const scaledCost = record.baseCost * (1 + record.areaScaleFactor)

  return {
    id: record.id,
    deliveryKind: record.deliveryKind,
    baseCost: record.baseCost,
    areaScaleFactor: record.areaScaleFactor,
    willingnessRule: record.willingnessRule,
    scaledCost,
  }
}

/** Deterministic fixture records covering required delivery kinds. */
export const EFFECT_DELIVERY_GEOMETRY_FIXTURES: readonly EffectDeliveryGeometryRecord[] = [
  {
    id: 'edg-cone-01',
    deliveryKind: 'cone',
    baseCost: 5,
    areaScaleFactor: 1.5,
    willingnessRule: 'none',
    label: 'Standard cone delivery',
  },
  {
    id: 'edg-line-01',
    deliveryKind: 'line',
    baseCost: 3,
    areaScaleFactor: 0.5,
    willingnessRule: 'none',
    label: 'Linear delivery',
  },
  {
    id: 'edg-touch-01',
    deliveryKind: 'touch',
    baseCost: 2,
    areaScaleFactor: 0,
    willingnessRule: 'consent',
    label: 'Touch delivery requiring consent',
  },
  {
    id: 'edg-remote-01',
    deliveryKind: 'remote',
    baseCost: 8,
    areaScaleFactor: 2,
    willingnessRule: 'resistance-check',
    label: 'Remote delivery with resistance check',
  },
  {
    id: 'edg-zone-01',
    deliveryKind: 'zone',
    baseCost: 10,
    areaScaleFactor: 3,
    willingnessRule: 'none',
    label: 'Zone delivery',
  },
  {
    id: 'edg-radius-01',
    deliveryKind: 'radius-anchor',
    baseCost: 4,
    areaScaleFactor: 1,
    willingnessRule: 'none',
    label: 'Radius-anchor delivery',
  },
] as const
