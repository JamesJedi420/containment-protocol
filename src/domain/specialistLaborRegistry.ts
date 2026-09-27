/**
 * SPE-1058 — pure specialist labor / task-gate registry (slice 1).
 *
 * Authored specialist role families, availability/condition bands, skill bands,
 * and a task-gate projection that stalls or degrades when the qualified operator
 * is missing. Adjacent expertise is not a substitute for the required specialty.
 * Callers own operator slots and task ids. This module does not persist GameState,
 * run week-close, consume workshop queues, implement automation, or invent a
 * per-person simulation.
 */

export const SPECIALIST_ROLE_FAMILIES = [
  'refinement_technician',
  'ritual_operator',
  'evidence_handler',
  'archive_analyst',
  'containment_engineer',
  'ward_technician',
  'hazardous_artifact_handler',
  'fabrication_specialist',
] as const
export type SpecialistRoleFamily = (typeof SPECIALIST_ROLE_FAMILIES)[number]

export const SPECIALIST_AVAILABILITY_BANDS = ['fit', 'fatigued', 'impaired', 'unavailable'] as const
export type SpecialistAvailabilityBand = (typeof SPECIALIST_AVAILABILITY_BANDS)[number]

export const SPECIALIST_SKILL_BANDS = ['novice', 'competent', 'expert', 'master'] as const
export type SpecialistSkillBand = (typeof SPECIALIST_SKILL_BANDS)[number]

export const SPECIALIST_TASK_IDS = [
  'material_refinement',
  'ward_seal_maintenance',
  'evidence_chain_custody',
  'containment_cell_repair',
  'ritual_frame_activation',
  'archive_classification',
  'hazardous_artifact_intake',
  'restraint_fabrication',
] as const
export type SpecialistTaskId = (typeof SPECIALIST_TASK_IDS)[number]

export const SPECIALIST_TASK_GATE_OUTCOMES = ['operable', 'degraded', 'stalled'] as const
export type SpecialistTaskGateOutcome = (typeof SPECIALIST_TASK_GATE_OUTCOMES)[number]

export const SPECIALIST_STALL_REASONS = [
  'missing_specialist',
  'unavailable',
  'adjacent_insufficient',
] as const
export type SpecialistStallReason = (typeof SPECIALIST_STALL_REASONS)[number]

export interface SpecialistOperatorSlot {
  readonly roleFamily: SpecialistRoleFamily
  readonly skillBand: SpecialistSkillBand
  readonly availabilityBand: SpecialistAvailabilityBand
}

export interface SpecialistLaborGateInput {
  readonly taskId: SpecialistTaskId
  readonly operators: readonly SpecialistOperatorSlot[]
  /**
   * Optional caller flag: infrastructure may exist without a qualified operator.
   * Projection never treats infrastructure alone as sufficient.
   */
  readonly infrastructurePresent?: boolean
}

export interface SpecialistOutputQuality {
  readonly successRate: number
  readonly throughputMultiplier: number
  readonly contaminationRisk: number
  readonly latentDefectRisk: number
  readonly materialPurity: number
}

export interface SpecialistMatchedOperator {
  readonly roleFamily: SpecialistRoleFamily
  readonly skillBand: SpecialistSkillBand
  readonly availabilityBand: SpecialistAvailabilityBand
}

export interface SpecialistLaborGateProjection {
  readonly taskId: SpecialistTaskId
  readonly requiredRoleFamily: SpecialistRoleFamily
  readonly gateOutcome: SpecialistTaskGateOutcome
  readonly matchedOperator: SpecialistMatchedOperator | null
  /** True when at least one operator was present but none matched the required role. */
  readonly adjacentRejected: boolean
  readonly stallReason: SpecialistStallReason | null
  readonly outputQuality: SpecialistOutputQuality
  readonly infrastructurePresent: boolean
}

interface TaskDefinition {
  readonly taskId: SpecialistTaskId
  readonly requiredRoleFamily: SpecialistRoleFamily
}

interface SkillQualityBase {
  readonly successRate: number
  readonly throughputMultiplier: number
  readonly contaminationRisk: number
  readonly latentDefectRisk: number
  readonly materialPurity: number
}

const ZERO_QUALITY: SpecialistOutputQuality = Object.freeze({
  successRate: 0,
  throughputMultiplier: 0,
  contaminationRisk: 100,
  latentDefectRisk: 100,
  materialPurity: 0,
})

/**
 * Authored task → exact role requirement. Order is projection/list order (byte-stable).
 * Adjacent role families never satisfy a different task's requirement.
 */
const TASK_DEFINITIONS: readonly TaskDefinition[] = Object.freeze([
  Object.freeze({
    taskId: 'material_refinement' as const,
    requiredRoleFamily: 'refinement_technician' as const,
  }),
  Object.freeze({
    taskId: 'ward_seal_maintenance' as const,
    requiredRoleFamily: 'ward_technician' as const,
  }),
  Object.freeze({
    taskId: 'evidence_chain_custody' as const,
    requiredRoleFamily: 'evidence_handler' as const,
  }),
  Object.freeze({
    taskId: 'containment_cell_repair' as const,
    requiredRoleFamily: 'containment_engineer' as const,
  }),
  Object.freeze({
    taskId: 'ritual_frame_activation' as const,
    requiredRoleFamily: 'ritual_operator' as const,
  }),
  Object.freeze({
    taskId: 'archive_classification' as const,
    requiredRoleFamily: 'archive_analyst' as const,
  }),
  Object.freeze({
    taskId: 'hazardous_artifact_intake' as const,
    requiredRoleFamily: 'hazardous_artifact_handler' as const,
  }),
  Object.freeze({
    taskId: 'restraint_fabrication' as const,
    requiredRoleFamily: 'fabrication_specialist' as const,
  }),
])

const TASK_BY_ID: ReadonlyMap<SpecialistTaskId, TaskDefinition> = new Map(
  TASK_DEFINITIONS.map((definition) => [definition.taskId, definition])
)

/** Higher rank = better skill for deterministic selection. */
const SKILL_RANK: Record<SpecialistSkillBand, number> = {
  novice: 0,
  competent: 1,
  expert: 2,
  master: 3,
}

/** Lower rank = healthier availability for deterministic selection (unavailable excluded). */
const AVAILABILITY_RANK: Record<SpecialistAvailabilityBand, number> = {
  fit: 0,
  fatigued: 1,
  impaired: 2,
  unavailable: 3,
}

const SKILL_QUALITY: Record<SpecialistSkillBand, SkillQualityBase> = Object.freeze({
  novice: Object.freeze({
    successRate: 55,
    throughputMultiplier: 70,
    contaminationRisk: 35,
    latentDefectRisk: 40,
    materialPurity: 50,
  }),
  competent: Object.freeze({
    successRate: 75,
    throughputMultiplier: 90,
    contaminationRisk: 18,
    latentDefectRisk: 20,
    materialPurity: 70,
  }),
  expert: Object.freeze({
    successRate: 90,
    throughputMultiplier: 105,
    contaminationRisk: 8,
    latentDefectRisk: 10,
    materialPurity: 88,
  }),
  master: Object.freeze({
    successRate: 97,
    throughputMultiplier: 115,
    contaminationRisk: 3,
    latentDefectRisk: 4,
    materialPurity: 96,
  }),
})

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isSpecialistRoleFamily(value: unknown): value is SpecialistRoleFamily {
  return SPECIALIST_ROLE_FAMILIES.some((family) => family === value)
}

export function isSpecialistAvailabilityBand(value: unknown): value is SpecialistAvailabilityBand {
  return SPECIALIST_AVAILABILITY_BANDS.some((band) => band === value)
}

export function isSpecialistSkillBand(value: unknown): value is SpecialistSkillBand {
  return SPECIALIST_SKILL_BANDS.some((band) => band === value)
}

export function isSpecialistTaskId(value: unknown): value is SpecialistTaskId {
  return SPECIALIST_TASK_IDS.some((id) => id === value)
}

export function isSpecialistTaskGateOutcome(value: unknown): value is SpecialistTaskGateOutcome {
  return SPECIALIST_TASK_GATE_OUTCOMES.some((outcome) => outcome === value)
}

function validateOperatorSlot(value: unknown): value is SpecialistOperatorSlot {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    isSpecialistRoleFamily(record.roleFamily) &&
    isSpecialistSkillBand(record.skillBand) &&
    isSpecialistAvailabilityBand(record.availabilityBand)
  )
}

/**
 * Validate caller-owned gate input. Malformed task ids, operators arrays, or
 * operator slots fail closed. Empty operators array is valid (stalls).
 */
export function validateSpecialistLaborGateInput(
  input: unknown
): input is SpecialistLaborGateInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>
  if (!isSpecialistTaskId(record.taskId)) return false
  if (!Array.isArray(record.operators)) return false
  for (const slot of record.operators) {
    if (!validateOperatorSlot(slot)) return false
  }
  if (
    'infrastructurePresent' in record &&
    record.infrastructurePresent !== undefined &&
    typeof record.infrastructurePresent !== 'boolean'
  ) {
    return false
  }
  return true
}

function applyAvailabilityModifiers(
  base: SkillQualityBase,
  availability: SpecialistAvailabilityBand
): SpecialistOutputQuality {
  if (availability === 'fit') {
    return Object.freeze({ ...base })
  }
  if (availability === 'fatigued') {
    return Object.freeze({
      successRate: Math.max(0, base.successRate - 12),
      throughputMultiplier: Math.max(0, base.throughputMultiplier - 20),
      contaminationRisk: Math.min(100, base.contaminationRisk + 10),
      latentDefectRisk: Math.min(100, base.latentDefectRisk + 12),
      materialPurity: Math.max(0, base.materialPurity - 8),
    })
  }
  // impaired
  return Object.freeze({
    successRate: Math.max(0, base.successRate - 28),
    throughputMultiplier: Math.max(0, base.throughputMultiplier - 40),
    contaminationRisk: Math.min(100, base.contaminationRisk + 25),
    latentDefectRisk: Math.min(100, base.latentDefectRisk + 30),
    materialPurity: Math.max(0, base.materialPurity - 20),
  })
}

function resolveGateOutcome(
  skillBand: SpecialistSkillBand,
  availabilityBand: Exclude<SpecialistAvailabilityBand, 'unavailable'>
): SpecialistTaskGateOutcome {
  if (availabilityBand === 'impaired') return 'degraded'
  if (availabilityBand === 'fatigued') return 'degraded'
  if (skillBand === 'novice') return 'degraded'
  return 'operable'
}

/**
 * Deterministic selection among exact-role matches that are not unavailable.
 * Prefer healthier availability, then higher skill, then earlier input index.
 */
function selectBestOperator(
  operators: readonly SpecialistOperatorSlot[],
  requiredRole: SpecialistRoleFamily
): { operator: SpecialistOperatorSlot; index: number } | null {
  let best: { operator: SpecialistOperatorSlot; index: number } | null = null

  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index]!
    if (operator.roleFamily !== requiredRole) continue
    if (operator.availabilityBand === 'unavailable') continue

    if (!best) {
      best = { operator, index }
      continue
    }

    const availabilityDelta =
      AVAILABILITY_RANK[operator.availabilityBand] -
      AVAILABILITY_RANK[best.operator.availabilityBand]
    if (availabilityDelta < 0) {
      best = { operator, index }
      continue
    }
    if (availabilityDelta > 0) continue

    const skillDelta = SKILL_RANK[operator.skillBand] - SKILL_RANK[best.operator.skillBand]
    if (skillDelta > 0) {
      best = { operator, index }
      continue
    }
    if (skillDelta < 0) continue
    // Equal availability + skill: keep earlier index (already best).
  }

  return best
}

function buildStalledProjection(
  taskId: SpecialistTaskId,
  requiredRoleFamily: SpecialistRoleFamily,
  stallReason: SpecialistStallReason,
  adjacentRejected: boolean,
  infrastructurePresent: boolean
): SpecialistLaborGateProjection {
  return Object.freeze({
    taskId,
    requiredRoleFamily,
    gateOutcome: 'stalled' as const,
    matchedOperator: null,
    adjacentRejected,
    stallReason,
    outputQuality: ZERO_QUALITY,
    infrastructurePresent,
  })
}

/**
 * Project a caller-owned task + operator roster into an immutable task-gate
 * projection. Malformed inputs fail closed to undefined.
 *
 * Exact role match is required. Adjacent expertise never satisfies the gate.
 * Infrastructure alone never unlocks the task.
 */
export function projectSpecialistLaborGate(
  input: SpecialistLaborGateInput | null | undefined
): SpecialistLaborGateProjection | undefined {
  if (!validateSpecialistLaborGateInput(input)) return undefined

  const definition = TASK_BY_ID.get(input.taskId)
  if (!definition) return undefined

  const infrastructurePresent = input.infrastructurePresent === true
  const requiredRoleFamily = definition.requiredRoleFamily
  const operators = input.operators

  const exactMatches = operators.filter((slot) => slot.roleFamily === requiredRoleFamily)
  const hasAdjacentOnly = exactMatches.length === 0 && operators.length > 0

  if (exactMatches.length === 0) {
    return buildStalledProjection(
      input.taskId,
      requiredRoleFamily,
      hasAdjacentOnly ? 'adjacent_insufficient' : 'missing_specialist',
      hasAdjacentOnly,
      infrastructurePresent
    )
  }

  const availableExact = exactMatches.filter((slot) => slot.availabilityBand !== 'unavailable')
  if (availableExact.length === 0) {
    return buildStalledProjection(
      input.taskId,
      requiredRoleFamily,
      'unavailable',
      false,
      infrastructurePresent
    )
  }

  const selected = selectBestOperator(operators, requiredRoleFamily)
  if (!selected) {
    return buildStalledProjection(
      input.taskId,
      requiredRoleFamily,
      'unavailable',
      false,
      infrastructurePresent
    )
  }

  const { operator } = selected
  const availabilityBand = operator.availabilityBand as Exclude<
    SpecialistAvailabilityBand,
    'unavailable'
  >
  const gateOutcome = resolveGateOutcome(operator.skillBand, availabilityBand)
  const outputQuality = applyAvailabilityModifiers(
    SKILL_QUALITY[operator.skillBand],
    availabilityBand
  )

  return Object.freeze({
    taskId: input.taskId,
    requiredRoleFamily,
    gateOutcome,
    matchedOperator: Object.freeze({
      roleFamily: operator.roleFamily,
      skillBand: operator.skillBand,
      availabilityBand: operator.availabilityBand,
    }),
    adjacentRejected: false,
    stallReason: null,
    outputQuality,
    infrastructurePresent,
  })
}

export function listSpecialistRoleFamilies(): readonly SpecialistRoleFamily[] {
  return SPECIALIST_ROLE_FAMILIES
}

export function listSpecialistTaskIds(): readonly SpecialistTaskId[] {
  return SPECIALIST_TASK_IDS
}

export function requiredRoleFamilyForTask(
  taskId: SpecialistTaskId
): SpecialistRoleFamily | undefined {
  if (!isSpecialistTaskId(taskId)) return undefined
  return TASK_BY_ID.get(taskId)?.requiredRoleFamily
}

/** Required-role lookup that fails closed for unknown strings. */
export function lookupRequiredRoleFamily(taskId: unknown): SpecialistRoleFamily | undefined {
  if (!isNonEmptyString(taskId) || !isSpecialistTaskId(taskId)) return undefined
  return TASK_BY_ID.get(taskId)?.requiredRoleFamily
}
