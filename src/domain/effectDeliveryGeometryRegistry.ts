/** SPE-2192: pure delivery metadata; no targeting, propagation execution or persistence. */
export const DELIVERY_KINDS = Object.freeze([
  'cone',
  'line',
  'touch',
  'remote',
  'zone',
  'radius-anchor',
] as const)
export type DeliveryKind = (typeof DELIVERY_KINDS)[number]

export const WILLINGNESS_RULES = Object.freeze([
  'none',
  'consent',
  'resistance-check',
  'mandatory',
] as const)
export type WillingnessRule = (typeof WILLINGNESS_RULES)[number]

export const AREA_SCALE_FACTOR_MIN = 0
export const AREA_SCALE_FACTOR_MAX = 10

/** Relative authoring bands only; no world distance or runtime radius is implied. */
export const DELIVERY_RADIUS_BANDS = Object.freeze(['local', 'extended'] as const)
export type DeliveryRadiusBand = (typeof DELIVERY_RADIUS_BANDS)[number]
export type AreaDeliveryKind = Exclude<DeliveryKind, 'touch' | 'remote'>

export interface DeliveryPropagation {
  /** Caller-owned square identifiers; this registry cannot verify a live board. */
  readonly originSquare: string
  readonly shapeKind: AreaDeliveryKind
  /** Authored route starts at origin; no adjacency or line-of-sight execution here. */
  readonly lineOfEffect: readonly string[]
  readonly barrierBlocksPropagation: true
}

export interface DeliveryMobileAnchor {
  readonly anchorActorRef: string
  readonly radiusBand: DeliveryRadiusBand
  readonly followsMovement: true
}

export interface EffectDeliveryGeometryRecord {
  readonly id: string
  readonly deliveryKind: DeliveryKind
  readonly baseCost: number
  readonly areaScaleFactor: number
  readonly willingnessRule: WillingnessRule
  readonly propagation?: DeliveryPropagation
  readonly mobileAnchor?: DeliveryMobileAnchor
}

export type EffectDeliveryGeometryValidationCode =
  | 'invalid_record'
  | 'missing_id'
  | 'unknown_delivery_kind'
  | 'invalid_base_cost'
  | 'area_scale_factor_out_of_bounds'
  | 'scaled_cost_overflow'
  | 'invalid_willingness_rule'
  | 'willingness_rule_required'
  | 'invalid_propagation'
  | 'invalid_mobile_anchor'

export interface EffectDeliveryGeometryValidationIssue {
  readonly code: EffectDeliveryGeometryValidationCode
  readonly detail: string
  readonly severity: 'error'
}

export interface EffectDeliveryGeometryValidationResult {
  readonly valid: boolean
  readonly issues: readonly EffectDeliveryGeometryValidationIssue[]
}

export interface EffectDeliveryGeometryProjection extends EffectDeliveryGeometryRecord {
  readonly scaledCost: number
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function identifier(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function member<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

function parseRecord(input: unknown): {
  value: EffectDeliveryGeometryProjection | null
  issues: EffectDeliveryGeometryValidationIssue[]
} {
  const issues: EffectDeliveryGeometryValidationIssue[] = []
  function reject(code: EffectDeliveryGeometryValidationCode, detail: string) {
    issues.push({ code, detail, severity: 'error' })
  }
  if (!object(input)) {
    reject('invalid_record', 'Expected a delivery geometry record.')
    return { value: null, issues }
  }

  const {
    id: rawId,
    deliveryKind,
    baseCost,
    areaScaleFactor,
    willingnessRule,
    propagation: rawPropagation,
    mobileAnchor: rawAnchor,
  } = input
  const id = identifier(rawId)
  if (!id) reject('missing_id', 'A nonempty id is required.')
  if (!member(DELIVERY_KINDS, deliveryKind)) {
    reject('unknown_delivery_kind', 'Unknown delivery kind.')
  }
  const legalCost = typeof baseCost === 'number' && Number.isFinite(baseCost) && baseCost >= 0
  if (!legalCost) reject('invalid_base_cost', 'baseCost must be finite and nonnegative.')
  const legalScale =
    typeof areaScaleFactor === 'number' &&
    Number.isFinite(areaScaleFactor) &&
    areaScaleFactor >= AREA_SCALE_FACTOR_MIN &&
    areaScaleFactor <= AREA_SCALE_FACTOR_MAX
  if (!legalScale) {
    reject('area_scale_factor_out_of_bounds', 'areaScaleFactor must be finite and within [0, 10].')
  }
  const scaledCost = legalCost && legalScale ? baseCost * (1 + areaScaleFactor) : NaN
  if (legalCost && legalScale && !Number.isFinite(scaledCost)) {
    reject('scaled_cost_overflow', 'Scaled cost must remain finite.')
  }
  if (!member(WILLINGNESS_RULES, willingnessRule)) {
    reject('invalid_willingness_rule', 'Unknown willingness rule.')
  } else if (
    (deliveryKind === 'touch' || deliveryKind === 'remote') &&
    willingnessRule === 'none'
  ) {
    reject('willingness_rule_required', 'Touch and remote delivery require a willingness rule.')
  }

  const areaKind =
    deliveryKind === 'cone' ||
    deliveryKind === 'line' ||
    deliveryKind === 'zone' ||
    deliveryKind === 'radius-anchor'
  let propagation: DeliveryPropagation | undefined
  if (areaKind) {
    if (!object(rawPropagation)) {
      reject(
        'invalid_propagation',
        'Area delivery requires origin, shape, route and barrier policy.'
      )
    } else {
      const {
        originSquare: rawOrigin,
        shapeKind,
        lineOfEffect,
        barrierBlocksPropagation,
      } = rawPropagation
      const originSquare = identifier(rawOrigin)
      const route = Array.isArray(lineOfEffect)
        ? Array.from(lineOfEffect, (square: unknown) => identifier(square))
        : []
      if (
        !originSquare ||
        shapeKind !== deliveryKind ||
        route.length === 0 ||
        route.some((square) => square === null) ||
        route[0] !== originSquare ||
        new Set(route).size !== route.length ||
        barrierBlocksPropagation !== true
      ) {
        reject(
          'invalid_propagation',
          'Require matching shape, unique route from origin, and solid-barrier blocking.'
        )
      } else {
        propagation = Object.freeze({
          originSquare,
          shapeKind: deliveryKind,
          lineOfEffect: Object.freeze(route as string[]),
          barrierBlocksPropagation: true,
        })
      }
    }
  } else if (rawPropagation !== undefined) {
    reject('invalid_propagation', 'Propagation metadata belongs to area delivery kinds.')
  }

  let mobileAnchor: DeliveryMobileAnchor | undefined
  if (deliveryKind === 'radius-anchor') {
    if (!object(rawAnchor)) {
      reject('invalid_mobile_anchor', 'Radius-anchor delivery requires mobile-anchor metadata.')
    } else {
      const { anchorActorRef: rawActor, radiusBand, followsMovement } = rawAnchor
      const anchorActorRef = identifier(rawActor)
      if (
        !anchorActorRef ||
        !member(DELIVERY_RADIUS_BANDS, radiusBand) ||
        followsMovement !== true
      ) {
        reject(
          'invalid_mobile_anchor',
          'Require an actor, known radius band and followsMovement=true.'
        )
      } else {
        mobileAnchor = Object.freeze({ anchorActorRef, radiusBand, followsMovement: true })
      }
    }
  } else if (rawAnchor !== undefined) {
    reject('invalid_mobile_anchor', 'Mobile-anchor metadata requires radius-anchor delivery.')
  }

  if (
    issues.length ||
    !id ||
    !member(DELIVERY_KINDS, deliveryKind) ||
    !legalCost ||
    !legalScale ||
    !member(WILLINGNESS_RULES, willingnessRule)
  ) {
    return { value: null, issues }
  }
  return {
    value: Object.freeze({
      id,
      deliveryKind,
      baseCost,
      areaScaleFactor,
      willingnessRule,
      ...(propagation ? { propagation } : {}),
      ...(mobileAnchor ? { mobileAnchor } : {}),
      scaledCost,
    }),
    issues,
  }
}

export function validateEffectDeliveryGeometryRecord(
  input: unknown
): EffectDeliveryGeometryValidationResult {
  const { value, issues } = parseRecord(input)
  return { valid: value !== null, issues }
}

/** Normalized, frozen snapshot; no live actor/board lookup or effect execution. */
export function projectEffectDeliveryGeometry(
  input: unknown
): EffectDeliveryGeometryProjection | null {
  return parseRecord(input).value
}

function areaFixture(
  id: string,
  deliveryKind: AreaDeliveryKind,
  baseCost: number,
  areaScaleFactor: number
): EffectDeliveryGeometryRecord {
  return {
    id,
    deliveryKind,
    baseCost,
    areaScaleFactor,
    willingnessRule: 'none',
    propagation: {
      originSquare: 'square:origin',
      shapeKind: deliveryKind,
      lineOfEffect: ['square:origin', 'square:spread'],
      barrierBlocksPropagation: true,
    },
    ...(deliveryKind === 'radius-anchor'
      ? {
          mobileAnchor: {
            anchorActorRef: 'actor:anchor',
            radiusBand: 'local',
            followsMovement: true,
          } as const,
        }
      : {}),
  }
}

/** Authored fixtures, not live campaign records or playable effects. */
export const EFFECT_DELIVERY_GEOMETRY_FIXTURES: readonly EffectDeliveryGeometryRecord[] =
  Object.freeze(
    [
      areaFixture('edg-cone-01', 'cone', 5, 1.5),
      areaFixture('edg-line-01', 'line', 3, 0.5),
      {
        id: 'edg-touch-01',
        deliveryKind: 'touch',
        baseCost: 2,
        areaScaleFactor: 0,
        willingnessRule: 'consent',
      },
      {
        id: 'edg-remote-01',
        deliveryKind: 'remote',
        baseCost: 8,
        areaScaleFactor: 2,
        willingnessRule: 'resistance-check',
      },
      areaFixture('edg-zone-01', 'zone', 10, 3),
      areaFixture('edg-radius-01', 'radius-anchor', 4, 1),
    ].map((record) => projectEffectDeliveryGeometry(record)!)
  )
