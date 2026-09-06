/** SPE-2860 — frozen blast-door inspection cadence and deficiency stop/continue. */

export const CONTAINMENT_CLASS_IDS = ['blast_door'] as const
export type ContainmentClassId = (typeof CONTAINMENT_CLASS_IDS)[number]

export const BLAST_DOOR_COMPENSATING_CONTROL_ID = 'secondary_interlock_watch' as const
export type BlastDoorCompensatingControlId = typeof BLAST_DOOR_COMPENSATING_CONTROL_ID

export type ContainmentInspectionStatus = 'current' | 'due' | 'overdue'

export type ContainmentDeficiency =
  | { kind: 'none' }
  | { kind: 'hard_stop' }
  | {
      kind: 'compensating_continue'
      compensatingControlId: BlastDoorCompensatingControlId
    }

export type ContainmentDeficiencyContinuation = 'hard_stop' | 'compensating_continue'

export interface ContainmentClassIntegrity {
  classId: ContainmentClassId
  lastInspectionWeek: number
  cycleCount: number
  deficiency: ContainmentDeficiency
}

export interface ContainmentClassCadenceSpec {
  readonly classId: ContainmentClassId
  readonly authoredIntervalWeeks: number
  readonly intensificationCycleBucket: number
  readonly compensatingControlId: BlastDoorCompensatingControlId
}

export type ContainmentCadenceFailureCode =
  | 'invalid_class'
  | 'missing_cadence'
  | 'invalid_weeks'
  | 'inverted_weeks'
  | 'invalid_history'
  | 'invalid_continuation'

export type ContainmentCadenceResolveResult =
  | { ok: true; classId: ContainmentClassId; intervalWeeks: number }
  | {
      ok: false
      code: Extract<
        ContainmentCadenceFailureCode,
        'invalid_class' | 'missing_cadence' | 'invalid_history'
      >
    }

export type ContainmentInspectionEvaluateResult =
  | {
      ok: true
      classId: ContainmentClassId
      status: ContainmentInspectionStatus
      intervalWeeks: number
      weeksSinceInspection: number
      deficiency: ContainmentDeficiency
      inService: boolean
    }
  | { ok: false; code: ContainmentCadenceFailureCode }

export type ContainmentIntegrityParseResult =
  | { ok: true; integrity: ContainmentClassIntegrity }
  | { ok: false; code: 'invalid_class' | 'malformed_integrity' }

const CONTAINMENT_CLASS_ID_SET = new Set<string>(CONTAINMENT_CLASS_IDS)

export const BLAST_DOOR_CONTAINMENT_CLASS: ContainmentClassCadenceSpec = Object.freeze({
  classId: 'blast_door',
  authoredIntervalWeeks: 4,
  intensificationCycleBucket: 2,
  compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
})

const CONTAINMENT_CLASS_CADENCE: Readonly<Record<ContainmentClassId, ContainmentClassCadenceSpec>> =
  Object.freeze({
    blast_door: BLAST_DOOR_CONTAINMENT_CLASS,
  })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key))
}

export function isContainmentClassId(value: unknown): value is ContainmentClassId {
  return typeof value === 'string' && CONTAINMENT_CLASS_ID_SET.has(value)
}

export function getContainmentClassCadenceSpec(
  classId: ContainmentClassId
): ContainmentClassCadenceSpec | undefined {
  return CONTAINMENT_CLASS_CADENCE[classId]
}

export function snapshotContainmentClassIntegrity(
  integrity: ContainmentClassIntegrity
): ContainmentClassIntegrity {
  const deficiency =
    integrity.deficiency.kind === 'compensating_continue'
      ? Object.freeze({
          kind: 'compensating_continue' as const,
          compensatingControlId: integrity.deficiency.compensatingControlId,
        })
      : Object.freeze({ kind: integrity.deficiency.kind })
  return Object.freeze({
    classId: integrity.classId,
    lastInspectionWeek: integrity.lastInspectionWeek,
    cycleCount: integrity.cycleCount,
    deficiency,
  })
}

export function containmentDeficienciesEqual(
  left: ContainmentDeficiency,
  right: ContainmentDeficiency
) {
  if (left.kind !== right.kind) return false
  if (left.kind === 'compensating_continue' && right.kind === 'compensating_continue') {
    return left.compensatingControlId === right.compensatingControlId
  }
  return true
}

export function containmentClassIntegritiesEqual(
  left: ContainmentClassIntegrity | undefined,
  right: ContainmentClassIntegrity | undefined
) {
  return (
    left === right ||
    (Boolean(left) &&
      Boolean(right) &&
      left?.classId === right?.classId &&
      left?.lastInspectionWeek === right?.lastInspectionWeek &&
      left?.cycleCount === right?.cycleCount &&
      Boolean(left && right && containmentDeficienciesEqual(left.deficiency, right.deficiency)))
  )
}

function parseDeficiency(value: unknown): ContainmentDeficiency | undefined {
  if (!isRecord(value) || typeof value.kind !== 'string') return undefined
  if (value.kind === 'none' || value.kind === 'hard_stop') {
    return hasOnlyKeys(value, ['kind']) ? { kind: value.kind } : undefined
  }
  if (value.kind !== 'compensating_continue') return undefined
  if (
    !hasOnlyKeys(value, ['kind', 'compensatingControlId']) ||
    value.compensatingControlId !== BLAST_DOOR_COMPENSATING_CONTROL_ID
  ) {
    return undefined
  }
  return {
    kind: 'compensating_continue',
    compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
  }
}

export function parseContainmentClassIntegrity(value: unknown): ContainmentIntegrityParseResult {
  if (value === undefined) {
    return { ok: false, code: 'malformed_integrity' }
  }
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['classId', 'lastInspectionWeek', 'cycleCount', 'deficiency'])
  ) {
    return { ok: false, code: 'malformed_integrity' }
  }
  if (!isContainmentClassId(value.classId)) {
    return { ok: false, code: 'invalid_class' }
  }
  if (
    !Number.isSafeInteger(value.lastInspectionWeek) ||
    (value.lastInspectionWeek as number) < 1 ||
    !Number.isSafeInteger(value.cycleCount) ||
    (value.cycleCount as number) < 0
  ) {
    return { ok: false, code: 'malformed_integrity' }
  }
  const deficiency = parseDeficiency(value.deficiency)
  if (!deficiency) {
    return { ok: false, code: 'malformed_integrity' }
  }
  return {
    ok: true,
    integrity: snapshotContainmentClassIntegrity({
      classId: value.classId,
      lastInspectionWeek: value.lastInspectionWeek as number,
      cycleCount: value.cycleCount as number,
      deficiency,
    }),
  }
}

export function isContainmentClassInService(
  integrity: ContainmentClassIntegrity | undefined
): boolean {
  return integrity?.deficiency.kind !== 'hard_stop'
}

function parseNonNegativeSafeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function parsePositiveSafeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : undefined
}

export function resolveContainmentInspectionCadence(
  classId: unknown,
  cycleCount: unknown
): ContainmentCadenceResolveResult {
  if (!isContainmentClassId(classId)) {
    return { ok: false, code: 'invalid_class' }
  }
  const spec = getContainmentClassCadenceSpec(classId)
  if (
    !spec ||
    !Number.isSafeInteger(spec.authoredIntervalWeeks) ||
    spec.authoredIntervalWeeks < 1 ||
    !Number.isSafeInteger(spec.intensificationCycleBucket) ||
    spec.intensificationCycleBucket < 1
  ) {
    return { ok: false, code: 'missing_cadence' }
  }
  const cycles = parseNonNegativeSafeInteger(cycleCount)
  if (cycles === undefined) {
    return { ok: false, code: 'invalid_history' }
  }
  const steps = Math.floor(cycles / spec.intensificationCycleBucket)
  return {
    ok: true,
    classId,
    intervalWeeks: Math.max(1, spec.authoredIntervalWeeks - steps),
  }
}

function parseContinuation(value: unknown): ContainmentDeficiencyContinuation | undefined {
  return value === 'hard_stop' || value === 'compensating_continue' ? value : undefined
}

function deficiencyFromContinuation(
  continuation: ContainmentDeficiencyContinuation,
  spec: ContainmentClassCadenceSpec
): Exclude<ContainmentDeficiency, { kind: 'none' }> {
  if (continuation === 'hard_stop') {
    return { kind: 'hard_stop' }
  }
  return {
    kind: 'compensating_continue',
    compensatingControlId: spec.compensatingControlId,
  }
}

/**
 * Sticky hard-stop: compensating continue cannot clear later deterioration.
 * Escalation from compensating continue to hard-stop is allowed.
 */
export function resolveStickyContainmentDeficiency(
  existing: ContainmentDeficiency,
  next: Exclude<ContainmentDeficiency, { kind: 'none' }>
):
  | { ok: true; deficiency: Exclude<ContainmentDeficiency, { kind: 'none' }> }
  | { ok: false; code: 'invalid_continuation' } {
  if (existing.kind === 'hard_stop' && next.kind === 'compensating_continue') {
    return { ok: false, code: 'invalid_continuation' }
  }
  if (existing.kind === 'hard_stop') {
    return { ok: true, deficiency: { kind: 'hard_stop' } }
  }
  return { ok: true, deficiency: next }
}

export function evaluateContainmentInspection(input: {
  classId: unknown
  lastInspectionWeek: unknown
  currentWeek: unknown
  cycleCount: unknown
  existingDeficiency?: unknown
  continuation?: unknown
}): ContainmentInspectionEvaluateResult {
  const cadence = resolveContainmentInspectionCadence(input.classId, input.cycleCount)
  if (!cadence.ok) return cadence
  const spec = getContainmentClassCadenceSpec(cadence.classId)
  if (!spec) return { ok: false, code: 'missing_cadence' }

  const lastInspectionWeek = parsePositiveSafeInteger(input.lastInspectionWeek)
  const currentWeek = parsePositiveSafeInteger(input.currentWeek)
  if (lastInspectionWeek === undefined || currentWeek === undefined) {
    return { ok: false, code: 'invalid_weeks' }
  }
  if (lastInspectionWeek > currentWeek) {
    return { ok: false, code: 'inverted_weeks' }
  }

  const weeksSinceInspection = currentWeek - lastInspectionWeek
  const status: ContainmentInspectionStatus =
    weeksSinceInspection < cadence.intervalWeeks
      ? 'current'
      : weeksSinceInspection === cadence.intervalWeeks
        ? 'due'
        : 'overdue'

  const existing =
    input.existingDeficiency === undefined
      ? { kind: 'none' as const }
      : parseDeficiency(input.existingDeficiency)
  if (!existing) {
    return { ok: false, code: 'invalid_continuation' }
  }

  if (status === 'current') {
    return {
      ok: true,
      classId: cadence.classId,
      status,
      intervalWeeks: cadence.intervalWeeks,
      weeksSinceInspection,
      deficiency: existing,
      inService: existing.kind !== 'hard_stop',
    }
  }

  const continuation = parseContinuation(input.continuation)
  if (!continuation) {
    return { ok: false, code: 'invalid_continuation' }
  }
  const proposed = deficiencyFromContinuation(continuation, spec)
  const resolved = resolveStickyContainmentDeficiency(existing, proposed)
  if (!resolved.ok) return resolved

  return {
    ok: true,
    classId: cadence.classId,
    status,
    intervalWeeks: cadence.intervalWeeks,
    weeksSinceInspection,
    deficiency: resolved.deficiency,
    inService: resolved.deficiency.kind !== 'hard_stop',
  }
}
