import {
  compareEquipmentGradeIds,
  isEquipmentGradeId,
  resolveEquipmentGradeProjection,
  type EquipmentGradeId,
  type EquipmentGradeParticipation,
  type EquipmentGradeProjection,
  type EquipmentGradeVisibility,
} from './equipmentGrade'

export type EquipmentGradeFabricationRule =
  | Readonly<{ kind: 'fixed'; gradeId: EquipmentGradeId }>
  | Readonly<{ kind: 'catalog' }>
  | Readonly<{
      kind: 'bounded_catalog'
      minimumGradeId: EquipmentGradeId
      maximumGradeId: EquipmentGradeId
    }>
  | Readonly<{ kind: 'minimum_catalog'; minimumGradeId: EquipmentGradeId }>

export const EQUIPMENT_GRADE_FABRICATION_EXPLANATION_CODES = [
  'fabrication_grade.fixed',
  'fabrication_grade.catalog',
  'fabrication_grade.bounded_catalog',
  'fabrication_grade.minimum_catalog',
] as const

export type EquipmentGradeFabricationExplanationCode =
  (typeof EQUIPMENT_GRADE_FABRICATION_EXPLANATION_CODES)[number]

export type EquipmentGradeFabricationValidationIssueCode =
  | 'invalid_shape'
  | 'invalid_kind'
  | 'unexpected_field'
  | 'missing_grade_id'
  | 'invalid_grade_id'
  | 'reversed_grade_range'
  | 'output_ungraded'
  | 'fixed_catalog_mismatch'
  | 'catalog_grade_below_minimum'
  | 'catalog_grade_outside_bounds'

export interface EquipmentGradeFabricationValidationIssue {
  readonly code: EquipmentGradeFabricationValidationIssueCode
  readonly field: string
}

export type EquipmentGradeFabricationRuleValidationResult =
  | Readonly<{ valid: true; value: EquipmentGradeFabricationRule }>
  | Readonly<{ valid: false; issues: readonly EquipmentGradeFabricationValidationIssue[] }>

export type EquipmentGradeFabricationResolution =
  | Readonly<{
      valid: true
      participation: Readonly<{ state: 'graded'; gradeId: EquipmentGradeId }>
      visibility: EquipmentGradeVisibility
      projection: EquipmentGradeProjection
      explanationCodes: readonly EquipmentGradeFabricationExplanationCode[]
    }>
  | Readonly<{ valid: false; issues: readonly EquipmentGradeFabricationValidationIssue[] }>

const RULE_KINDS = new Set(['fixed', 'catalog', 'bounded_catalog', 'minimum_catalog'])
const EXPLANATION_CODE_SET = new Set<string>(EQUIPMENT_GRADE_FABRICATION_EXPLANATION_CODES)

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function freezeIssues(issues: EquipmentGradeFabricationValidationIssue[]) {
  return Object.freeze(
    issues
      .sort((left, right) =>
        compareCodeUnits(`${left.field}:${left.code}`, `${right.field}:${right.code}`)
      )
      .map((issue) => Object.freeze(issue))
  )
}

function invalid(issues: EquipmentGradeFabricationValidationIssue[]) {
  return Object.freeze({ valid: false, issues: freezeIssues(issues) })
}

export function isEquipmentGradeFabricationExplanationCode(
  value: unknown
): value is EquipmentGradeFabricationExplanationCode {
  return typeof value === 'string' && EXPLANATION_CODE_SET.has(value)
}

export function validateEquipmentGradeFabricationRule(
  value: unknown
): EquipmentGradeFabricationRuleValidationResult {
  if (!isPlainRecord(value)) {
    return invalid([{ code: 'invalid_shape', field: '$' }])
  }

  const issues: EquipmentGradeFabricationValidationIssue[] = []
  const kind = value.kind
  const validKind = typeof kind === 'string' && RULE_KINDS.has(kind)

  if (!validKind) issues.push({ code: 'invalid_kind', field: 'kind' })

  const allowedFields =
    kind === 'fixed'
      ? new Set(['kind', 'gradeId'])
      : kind === 'bounded_catalog'
        ? new Set(['kind', 'minimumGradeId', 'maximumGradeId'])
        : kind === 'minimum_catalog'
          ? new Set(['kind', 'minimumGradeId'])
          : new Set(['kind'])

  for (const field of Object.keys(value).sort(compareCodeUnits)) {
    if (!allowedFields.has(field)) issues.push({ code: 'unexpected_field', field })
  }

  const validateGradeField = (field: 'gradeId' | 'minimumGradeId' | 'maximumGradeId') => {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push({ code: 'missing_grade_id', field })
    } else if (!isEquipmentGradeId(value[field])) {
      issues.push({ code: 'invalid_grade_id', field })
    }
  }

  if (kind === 'fixed') validateGradeField('gradeId')
  if (kind === 'minimum_catalog' || kind === 'bounded_catalog') {
    validateGradeField('minimumGradeId')
  }
  if (kind === 'bounded_catalog') validateGradeField('maximumGradeId')

  if (
    kind === 'bounded_catalog' &&
    isEquipmentGradeId(value.minimumGradeId) &&
    isEquipmentGradeId(value.maximumGradeId) &&
    compareEquipmentGradeIds(value.minimumGradeId, value.maximumGradeId) > 0
  ) {
    issues.push({ code: 'reversed_grade_range', field: 'maximumGradeId' })
  }

  if (issues.length > 0) return invalid(issues)

  let normalized: EquipmentGradeFabricationRule
  if (kind === 'fixed') {
    normalized = { kind: 'fixed', gradeId: value.gradeId as EquipmentGradeId }
  } else if (kind === 'bounded_catalog') {
    normalized = {
      kind: 'bounded_catalog',
      minimumGradeId: value.minimumGradeId as EquipmentGradeId,
      maximumGradeId: value.maximumGradeId as EquipmentGradeId,
    }
  } else if (kind === 'minimum_catalog') {
    normalized = {
      kind: 'minimum_catalog',
      minimumGradeId: value.minimumGradeId as EquipmentGradeId,
    }
  } else {
    normalized = { kind: 'catalog' }
  }

  return Object.freeze({ valid: true, value: Object.freeze(normalized) })
}

export function resolveEquipmentGradeFabricationOutcome(
  ruleValue: unknown,
  catalogParticipation: EquipmentGradeParticipation,
  visibility: EquipmentGradeVisibility
): EquipmentGradeFabricationResolution {
  const validation = validateEquipmentGradeFabricationRule(ruleValue)
  if (!validation.valid) return validation
  if (catalogParticipation.state !== 'graded') {
    return invalid([{ code: 'output_ungraded', field: 'catalogParticipation' }])
  }

  const { value: rule } = validation
  const catalogGradeId = catalogParticipation.gradeId

  if (rule.kind === 'fixed' && rule.gradeId !== catalogGradeId) {
    return invalid([{ code: 'fixed_catalog_mismatch', field: 'gradeId' }])
  }
  if (
    rule.kind === 'minimum_catalog' &&
    compareEquipmentGradeIds(catalogGradeId, rule.minimumGradeId) < 0
  ) {
    return invalid([{ code: 'catalog_grade_below_minimum', field: 'minimumGradeId' }])
  }
  if (
    rule.kind === 'bounded_catalog' &&
    (compareEquipmentGradeIds(catalogGradeId, rule.minimumGradeId) < 0 ||
      compareEquipmentGradeIds(catalogGradeId, rule.maximumGradeId) > 0)
  ) {
    return invalid([{ code: 'catalog_grade_outside_bounds', field: 'gradeId' }])
  }

  const gradeId = rule.kind === 'fixed' ? rule.gradeId : catalogGradeId
  const participation = Object.freeze({ state: 'graded' as const, gradeId })
  const explanationCode =
    `fabrication_grade.${rule.kind}` as EquipmentGradeFabricationExplanationCode

  return Object.freeze({
    valid: true,
    participation,
    visibility,
    projection: resolveEquipmentGradeProjection(participation, visibility),
    explanationCodes: Object.freeze([explanationCode]),
  })
}

export function preserveFabricatedEquipmentGrade<T extends Readonly<{ gradeId: EquipmentGradeId }>>(
  lot: T
): T {
  return Object.freeze({ ...lot }) as T
}

export function applyAuthorizedFabricatedEquipmentGradeTransformation<
  T extends Readonly<{ gradeId: EquipmentGradeId }>,
>(lot: T, transformation: unknown): T {
  if (
    !isPlainRecord(transformation) ||
    transformation.authorized !== true ||
    typeof transformation.authorizationId !== 'string' ||
    transformation.authorizationId.trim().length === 0 ||
    !isEquipmentGradeId(transformation.gradeId)
  ) {
    return preserveFabricatedEquipmentGrade(lot)
  }
  return Object.freeze({ ...lot, gradeId: transformation.gradeId }) as T
}
