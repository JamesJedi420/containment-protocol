/** SPE-2234: validate supplied promotion evidence; never perform promotion. */
export const PROMOTION_GATE_KINDS = Object.freeze([
  'training',
  'clearance',
  'equipment',
  'validation',
] as const)
export type PromotionGateKind = (typeof PROMOTION_GATE_KINDS)[number]

export interface PromotionGate {
  readonly kind: PromotionGateKind
  readonly satisfied: boolean
}

export interface PlannedBuildLiveRecordSplit {
  readonly plannedBuildRef: string
  readonly liveRecordRef?: string
  readonly promotionGates: readonly PromotionGate[]
}

export type SplitResult =
  | {
      readonly ok: true
      readonly record: PlannedBuildLiveRecordSplit
      readonly promotionReady: boolean
      readonly missing: readonly PromotionGateKind[]
      readonly unmet: readonly PromotionGateKind[]
    }
  | { readonly ok: false; readonly issues: readonly string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isReference(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function isKind(value: unknown): value is PromotionGateKind {
  return typeof value === 'string' && PROMOTION_GATE_KINDS.some((kind) => kind === value)
}

/** Policy is supplied by the owner; this contract defines no mandatory gate set. */
export function validatePlannedBuildLiveRecordSplit(
  input: unknown,
  requiredKinds: unknown
): SplitResult {
  if (!isRecord(input) || !isReference(input.plannedBuildRef)) {
    return { ok: false, issues: ['invalid-planned-build-ref'] }
  }
  if (input.liveRecordRef !== undefined && !isReference(input.liveRecordRef)) {
    return { ok: false, issues: ['invalid-live-record-ref'] }
  }
  if (
    !Array.isArray(requiredKinds) ||
    requiredKinds.length === 0 ||
    !Array.from(requiredKinds).every(isKind) ||
    new Set(requiredKinds).size !== requiredKinds.length
  ) {
    return { ok: false, issues: ['invalid-required-gate-policy'] }
  }
  if (!Array.isArray(input.promotionGates)) return { ok: false, issues: ['invalid-gates'] }
  const gates = new Map<PromotionGateKind, boolean>()
  for (const gate of input.promotionGates) {
    if (
      !isRecord(gate) ||
      !isKind(gate.kind) ||
      typeof gate.satisfied !== 'boolean' ||
      gates.has(gate.kind)
    ) {
      return { ok: false, issues: ['invalid-or-duplicate-gate'] }
    }
    gates.set(gate.kind, gate.satisfied)
  }
  const missing = PROMOTION_GATE_KINDS.filter(
    (kind) => requiredKinds.includes(kind) && !gates.has(kind)
  )
  const unmet = PROMOTION_GATE_KINDS.filter(
    (kind) => requiredKinds.includes(kind) && gates.get(kind) === false
  )
  if (input.liveRecordRef !== undefined && (missing.length > 0 || unmet.length > 0)) {
    return { ok: false, issues: ['live-record-with-unsatisfied-gates'] }
  }
  const promotionGates = PROMOTION_GATE_KINDS.filter((kind) => gates.has(kind)).map((kind) =>
    Object.freeze({ kind, satisfied: gates.get(kind)! })
  )
  const record = Object.freeze({
    plannedBuildRef: input.plannedBuildRef,
    ...(input.liveRecordRef === undefined ? {} : { liveRecordRef: input.liveRecordRef }),
    promotionGates: Object.freeze(promotionGates),
  })
  return {
    ok: true,
    record,
    promotionReady: missing.length === 0 && unmet.length === 0,
    missing: Object.freeze(missing),
    unmet: Object.freeze(unmet),
  }
}
