export type EquipmentGradeId = 'grade_1' | 'grade_2' | 'grade_3' | 'grade_4' | 'grade_5'

export type EquipmentGradeRank = 1 | 2 | 3 | 4 | 5

export interface EquipmentGradeDefinition {
  readonly id: EquipmentGradeId
  readonly rank: EquipmentGradeRank
  readonly label: string
  readonly localizationKey: string
}

export const EQUIPMENT_GRADE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'grade_1',
    rank: 1,
    label: 'Grade I',
    localizationKey: 'equipment.grade.grade_1',
  }),
  Object.freeze({
    id: 'grade_2',
    rank: 2,
    label: 'Grade II',
    localizationKey: 'equipment.grade.grade_2',
  }),
  Object.freeze({
    id: 'grade_3',
    rank: 3,
    label: 'Grade III',
    localizationKey: 'equipment.grade.grade_3',
  }),
  Object.freeze({
    id: 'grade_4',
    rank: 4,
    label: 'Grade IV',
    localizationKey: 'equipment.grade.grade_4',
  }),
  Object.freeze({
    id: 'grade_5',
    rank: 5,
    label: 'Grade V',
    localizationKey: 'equipment.grade.grade_5',
  }),
] as const satisfies readonly EquipmentGradeDefinition[])

export const EQUIPMENT_GRADE_IDS = Object.freeze(
  EQUIPMENT_GRADE_DEFINITIONS.map((definition) => definition.id)
) as readonly EquipmentGradeId[]

export const EQUIPMENT_GRADE_REGISTRY: Readonly<
  Record<EquipmentGradeId, EquipmentGradeDefinition>
> = Object.freeze(
  Object.fromEntries(
    EQUIPMENT_GRADE_DEFINITIONS.map((definition) => [definition.id, definition])
  ) as Record<EquipmentGradeId, EquipmentGradeDefinition>
)

const EQUIPMENT_GRADE_ID_SET = new Set<EquipmentGradeId>(EQUIPMENT_GRADE_IDS)

export function isEquipmentGradeId(value: unknown): value is EquipmentGradeId {
  return typeof value === 'string' && EQUIPMENT_GRADE_ID_SET.has(value as EquipmentGradeId)
}

export function getEquipmentGradeDefinition(gradeId: EquipmentGradeId): EquipmentGradeDefinition {
  return EQUIPMENT_GRADE_REGISTRY[gradeId]
}

export function getEquipmentGradeRank(gradeId: EquipmentGradeId): EquipmentGradeRank {
  return getEquipmentGradeDefinition(gradeId).rank
}

export function compareEquipmentGradeIds(left: EquipmentGradeId, right: EquipmentGradeId): number {
  return getEquipmentGradeRank(left) - getEquipmentGradeRank(right)
}

export type EquipmentGradeParticipation =
  Readonly<{ state: 'graded'; gradeId: EquipmentGradeId }> | Readonly<{ state: 'ungraded' }>

export type EquipmentGradeValidationIssueCode =
  | 'invalid_shape'
  | 'invalid_state'
  | 'missing_grade_id'
  | 'invalid_grade_id'
  | 'unexpected_grade_id'
  | 'unexpected_field'

export interface EquipmentGradeValidationIssue {
  readonly code: EquipmentGradeValidationIssueCode
  readonly field: string
}

export type EquipmentGradeValidationResult =
  | Readonly<{ valid: true; value: EquipmentGradeParticipation }>
  | Readonly<{ valid: false; issues: readonly EquipmentGradeValidationIssue[] }>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function freezeIssues(issues: EquipmentGradeValidationIssue[]) {
  return Object.freeze(issues.map((issue) => Object.freeze(issue)))
}

export function validateEquipmentGradeParticipation(
  value: unknown
): EquipmentGradeValidationResult {
  if (!isPlainRecord(value)) {
    return Object.freeze({
      valid: false,
      issues: freezeIssues([{ code: 'invalid_shape', field: '$' }]),
    })
  }

  const issues: EquipmentGradeValidationIssue[] = []
  const state = Object.prototype.hasOwnProperty.call(value, 'state') ? value.state : undefined

  if (state !== 'graded' && state !== 'ungraded') {
    issues.push({ code: 'invalid_state', field: 'state' })
  }

  const allowedFields = state === 'graded' ? new Set(['state', 'gradeId']) : new Set(['state'])
  for (const field of Object.keys(value).sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0
  )) {
    if (!allowedFields.has(field)) {
      issues.push({
        code:
          field === 'gradeId' && state === 'ungraded' ? 'unexpected_grade_id' : 'unexpected_field',
        field,
      })
    }
  }

  if (state === 'graded') {
    if (!Object.prototype.hasOwnProperty.call(value, 'gradeId')) {
      issues.push({ code: 'missing_grade_id', field: 'gradeId' })
    } else if (!isEquipmentGradeId(value.gradeId)) {
      issues.push({ code: 'invalid_grade_id', field: 'gradeId' })
    }
  }

  if (issues.length > 0) {
    return Object.freeze({ valid: false, issues: freezeIssues(issues) })
  }

  return state === 'graded'
    ? Object.freeze({
        valid: true,
        value: Object.freeze({ state: 'graded', gradeId: value.gradeId as EquipmentGradeId }),
      })
    : Object.freeze({ valid: true, value: Object.freeze({ state: 'ungraded' }) })
}

export type EquipmentGradeVisibility = 'known' | 'hidden'

export type EquipmentGradeProjection =
  | Readonly<{
      state: 'graded'
      gradeId: EquipmentGradeId
      rank: EquipmentGradeRank
      label: string
      localizationKey: string
      accessibleText: string
      debugText: string
    }>
  | Readonly<{
      state: 'ungraded'
      label: 'Ungraded'
      localizationKey: 'equipment.grade.ungraded'
      accessibleText: 'Equipment grade: Ungraded'
      debugText: 'equipment-grade:ungraded'
    }>
  | Readonly<{
      state: 'unknown'
      label: 'Grade unknown'
      localizationKey: 'equipment.grade.unknown'
      accessibleText: 'Equipment grade: Unknown'
      debugText: 'equipment-grade:unknown'
    }>

const UNKNOWN_EQUIPMENT_GRADE_PROJECTION = Object.freeze({
  state: 'unknown',
  label: 'Grade unknown',
  localizationKey: 'equipment.grade.unknown',
  accessibleText: 'Equipment grade: Unknown',
  debugText: 'equipment-grade:unknown',
} as const satisfies EquipmentGradeProjection)

const UNGRADED_EQUIPMENT_GRADE_PROJECTION = Object.freeze({
  state: 'ungraded',
  label: 'Ungraded',
  localizationKey: 'equipment.grade.ungraded',
  accessibleText: 'Equipment grade: Ungraded',
  debugText: 'equipment-grade:ungraded',
} as const satisfies EquipmentGradeProjection)

export function resolveEquipmentGradeProjection(
  participation: EquipmentGradeParticipation,
  visibility: EquipmentGradeVisibility
): EquipmentGradeProjection {
  if (visibility !== 'known') {
    return UNKNOWN_EQUIPMENT_GRADE_PROJECTION
  }

  if (participation.state === 'ungraded') {
    return UNGRADED_EQUIPMENT_GRADE_PROJECTION
  }

  const definition = EQUIPMENT_GRADE_REGISTRY[participation.gradeId]
  if (!definition) {
    return UNKNOWN_EQUIPMENT_GRADE_PROJECTION
  }

  return Object.freeze({
    state: 'graded',
    gradeId: definition.id,
    rank: definition.rank,
    label: definition.label,
    localizationKey: definition.localizationKey,
    accessibleText: `Equipment grade: ${definition.label}`,
    debugText: `equipment-grade:${definition.id}`,
  })
}
