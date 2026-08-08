import {
  compareEquipmentGradeIds,
  isEquipmentGradeId,
  resolveEquipmentGradeProjection,
  validateEquipmentGradeParticipation,
  type EquipmentGradeId,
  type EquipmentGradeParticipation,
  type EquipmentGradeProjection,
  type EquipmentGradeVisibility,
} from './equipmentGrade'

export type EquipmentRecoveryPathId = 'component_reclamation' | 'ritual_disassembly'
export type EquipmentRecoveryCondition = 'operational' | 'damaged'

export interface EquipmentRecoveryMaterialOutput {
  readonly materialId: string
  readonly quantity: number
}

interface EquipmentRecoveryRuleBase {
  readonly pathId: EquipmentRecoveryPathId
  readonly baseMaterials: readonly EquipmentRecoveryMaterialOutput[]
  readonly baseWaste: number
  readonly baseDurationWeeks: number
}

export type EquipmentGradeRecoveryRule =
  | (EquipmentRecoveryRuleBase &
      Readonly<{
        kind: 'yield_threshold'
        thresholdGradeId: EquipmentGradeId
        bonusMaterialId: string
        bonusQuantity: number
        wasteReduction: number
      }>)
  | (EquipmentRecoveryRuleBase &
      Readonly<{
        kind: 'handling_threshold'
        thresholdGradeId: EquipmentGradeId
        additionalDurationWeeks: number
      }>)
  | (EquipmentRecoveryRuleBase & Readonly<{ kind: 'grade_neutral' }>)

export const EQUIPMENT_GRADE_RECOVERY_EXPLANATION_CODES = [
  'recovery_grade.yield_threshold',
  'recovery_grade.handling_threshold',
  'recovery_grade.neutral',
  'recovery_condition.damaged',
] as const

export type EquipmentGradeRecoveryExplanationCode =
  (typeof EQUIPMENT_GRADE_RECOVERY_EXPLANATION_CODES)[number]

export type EquipmentGradeRecoveryIssueCode =
  | 'invalid_shape'
  | 'invalid_kind'
  | 'invalid_path'
  | 'unexpected_field'
  | 'invalid_materials'
  | 'duplicate_material'
  | 'invalid_quantity'
  | 'invalid_waste'
  | 'invalid_duration'
  | 'missing_grade_id'
  | 'invalid_grade_id'
  | 'invalid_bonus_material'
  | 'invalid_condition'
  | 'invalid_participation'
  | 'hidden_grade'
  | 'ungraded_requires_neutral_rule'
  | 'custody_restricted'
  | 'evidence_held'
  | 'authorization_required'
  | 'contamination_quarantine'
  | 'reserved'
  | 'unstable_anomaly'
  | 'fabricated_lot_selection_unavailable'
  | 'profile_deferred'

export interface EquipmentGradeRecoveryIssue {
  readonly code: EquipmentGradeRecoveryIssueCode
  readonly field: string
}

export type EquipmentRecoveryRestrictionCode = Extract<
  EquipmentGradeRecoveryIssueCode,
  | 'custody_restricted'
  | 'evidence_held'
  | 'authorization_required'
  | 'contamination_quarantine'
  | 'reserved'
  | 'unstable_anomaly'
  | 'fabricated_lot_selection_unavailable'
>

export interface EquipmentGradeRecoveryContext {
  readonly condition: EquipmentRecoveryCondition
  readonly restrictions?: readonly EquipmentRecoveryRestrictionCode[]
}

export type EquipmentGradeRecoveryRuleValidationResult =
  | Readonly<{ valid: true; value: EquipmentGradeRecoveryRule }>
  | Readonly<{ valid: false; issues: readonly EquipmentGradeRecoveryIssue[] }>

export type EquipmentGradeRecoveryResolution =
  | Readonly<{
      available: true
      participation: EquipmentGradeParticipation
      visibility: EquipmentGradeVisibility
      projection: EquipmentGradeProjection
      pathId: EquipmentRecoveryPathId
      materials: readonly EquipmentRecoveryMaterialOutput[]
      waste: number
      durationWeeks: number
      condition: EquipmentRecoveryCondition
      explanationCodes: readonly EquipmentGradeRecoveryExplanationCode[]
    }>
  | Readonly<{
      available: false
      projection: EquipmentGradeProjection
      issues: readonly EquipmentGradeRecoveryIssue[]
    }>

const PATHS = new Set<string>(['component_reclamation', 'ritual_disassembly'])
const KINDS = new Set<string>(['yield_threshold', 'handling_threshold', 'grade_neutral'])
const RESTRICTIONS = new Set<string>([
  'custody_restricted',
  'evidence_held',
  'authorization_required',
  'contamination_quarantine',
  'reserved',
  'unstable_anomaly',
  'fabricated_lot_selection_unavailable',
])
const EXPLANATIONS = new Set<string>(EQUIPMENT_GRADE_RECOVERY_EXPLANATION_CODES)

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

function freezeIssues(issues: EquipmentGradeRecoveryIssue[]) {
  return Object.freeze(
    issues
      .sort((left, right) =>
        compareCodeUnits(`${left.field}:${left.code}`, `${right.field}:${right.code}`)
      )
      .map((issue) => Object.freeze(issue))
  )
}

function unavailable(
  participation: EquipmentGradeParticipation,
  visibility: EquipmentGradeVisibility,
  issues: EquipmentGradeRecoveryIssue[]
): EquipmentGradeRecoveryResolution {
  return Object.freeze({
    available: false,
    projection: resolveEquipmentGradeProjection(participation, visibility),
    issues: freezeIssues(issues),
  })
}

export function isEquipmentGradeRecoveryExplanationCode(
  value: unknown
): value is EquipmentGradeRecoveryExplanationCode {
  return typeof value === 'string' && EXPLANATIONS.has(value)
}

export function isEquipmentRecoveryRestrictionCode(
  value: unknown
): value is EquipmentRecoveryRestrictionCode {
  return typeof value === 'string' && RESTRICTIONS.has(value)
}

export function validateEquipmentGradeRecoveryRule(
  value: unknown
): EquipmentGradeRecoveryRuleValidationResult {
  if (!isPlainRecord(value)) {
    return Object.freeze({
      valid: false,
      issues: freezeIssues([{ code: 'invalid_shape', field: '$' }]),
    })
  }

  const issues: EquipmentGradeRecoveryIssue[] = []
  const kind = value.kind
  const pathId = value.pathId
  if (typeof kind !== 'string' || !KINDS.has(kind))
    issues.push({ code: 'invalid_kind', field: 'kind' })
  if (typeof pathId !== 'string' || !PATHS.has(pathId))
    issues.push({ code: 'invalid_path', field: 'pathId' })

  const allowed =
    kind === 'yield_threshold'
      ? new Set([
          'kind',
          'pathId',
          'baseMaterials',
          'baseWaste',
          'baseDurationWeeks',
          'thresholdGradeId',
          'bonusMaterialId',
          'bonusQuantity',
          'wasteReduction',
        ])
      : kind === 'handling_threshold'
        ? new Set([
            'kind',
            'pathId',
            'baseMaterials',
            'baseWaste',
            'baseDurationWeeks',
            'thresholdGradeId',
            'additionalDurationWeeks',
          ])
        : new Set(['kind', 'pathId', 'baseMaterials', 'baseWaste', 'baseDurationWeeks'])
  for (const field of Object.keys(value).sort(compareCodeUnits)) {
    if (!allowed.has(field)) issues.push({ code: 'unexpected_field', field })
  }

  const normalizedMaterials: EquipmentRecoveryMaterialOutput[] = []
  if (!Array.isArray(value.baseMaterials) || value.baseMaterials.length === 0) {
    issues.push({ code: 'invalid_materials', field: 'baseMaterials' })
  } else {
    const seen = new Set<string>()
    for (const [index, material] of value.baseMaterials.entries()) {
      if (
        !isPlainRecord(material) ||
        Object.keys(material).some((field) => field !== 'materialId' && field !== 'quantity')
      ) {
        issues.push({ code: 'invalid_materials', field: `baseMaterials.${index}` })
        continue
      }
      const materialId = typeof material.materialId === 'string' ? material.materialId.trim() : ''
      if (!materialId)
        issues.push({ code: 'invalid_materials', field: `baseMaterials.${index}.materialId` })
      if (!Number.isInteger(material.quantity) || (material.quantity as number) < 1) {
        issues.push({ code: 'invalid_quantity', field: `baseMaterials.${index}.quantity` })
      }
      if (materialId && seen.has(materialId)) {
        issues.push({ code: 'duplicate_material', field: `baseMaterials.${index}.materialId` })
      }
      seen.add(materialId)
      if (materialId && Number.isInteger(material.quantity) && (material.quantity as number) > 0) {
        normalizedMaterials.push({ materialId, quantity: material.quantity as number })
      }
    }
  }

  if (!Number.isInteger(value.baseWaste) || (value.baseWaste as number) < 0) {
    issues.push({ code: 'invalid_waste', field: 'baseWaste' })
  }
  if (!Number.isInteger(value.baseDurationWeeks) || (value.baseDurationWeeks as number) < 1) {
    issues.push({ code: 'invalid_duration', field: 'baseDurationWeeks' })
  }
  if (kind === 'yield_threshold' || kind === 'handling_threshold') {
    if (!Object.prototype.hasOwnProperty.call(value, 'thresholdGradeId')) {
      issues.push({ code: 'missing_grade_id', field: 'thresholdGradeId' })
    } else if (!isEquipmentGradeId(value.thresholdGradeId)) {
      issues.push({ code: 'invalid_grade_id', field: 'thresholdGradeId' })
    }
  }
  if (kind === 'yield_threshold') {
    if (typeof value.bonusMaterialId !== 'string' || value.bonusMaterialId.trim().length === 0) {
      issues.push({ code: 'invalid_bonus_material', field: 'bonusMaterialId' })
    }
    if (!Number.isInteger(value.bonusQuantity) || (value.bonusQuantity as number) < 1) {
      issues.push({ code: 'invalid_quantity', field: 'bonusQuantity' })
    }
    if (!Number.isInteger(value.wasteReduction) || (value.wasteReduction as number) < 0) {
      issues.push({ code: 'invalid_waste', field: 'wasteReduction' })
    }
  }
  if (
    kind === 'handling_threshold' &&
    (!Number.isInteger(value.additionalDurationWeeks) ||
      (value.additionalDurationWeeks as number) < 1)
  ) {
    issues.push({ code: 'invalid_duration', field: 'additionalDurationWeeks' })
  }

  if (issues.length > 0) return Object.freeze({ valid: false, issues: freezeIssues(issues) })

  const base = {
    pathId: pathId as EquipmentRecoveryPathId,
    baseMaterials: Object.freeze(
      normalizedMaterials
        .sort((left, right) => compareCodeUnits(left.materialId, right.materialId))
        .map((material) => Object.freeze(material))
    ),
    baseWaste: value.baseWaste as number,
    baseDurationWeeks: value.baseDurationWeeks as number,
  }
  const normalized: EquipmentGradeRecoveryRule =
    kind === 'yield_threshold'
      ? {
          ...base,
          kind,
          thresholdGradeId: value.thresholdGradeId as EquipmentGradeId,
          bonusMaterialId: (value.bonusMaterialId as string).trim(),
          bonusQuantity: value.bonusQuantity as number,
          wasteReduction: value.wasteReduction as number,
        }
      : kind === 'handling_threshold'
        ? {
            ...base,
            kind,
            thresholdGradeId: value.thresholdGradeId as EquipmentGradeId,
            additionalDurationWeeks: value.additionalDurationWeeks as number,
          }
        : { ...base, kind: 'grade_neutral' }
  return Object.freeze({ valid: true, value: Object.freeze(normalized) })
}

export function resolveEquipmentGradeRecoveryOutcome(
  ruleValue: unknown,
  participationValue: unknown,
  visibility: EquipmentGradeVisibility,
  context: EquipmentGradeRecoveryContext
): EquipmentGradeRecoveryResolution {
  const participationValidation = validateEquipmentGradeParticipation(participationValue)
  const fallbackParticipation = Object.freeze({ state: 'ungraded' as const })
  if (!participationValidation.valid) {
    return unavailable(fallbackParticipation, 'hidden', [
      { code: 'invalid_participation', field: 'participation' },
    ])
  }
  const participation = participationValidation.value
  if (context.condition !== 'operational' && context.condition !== 'damaged') {
    return unavailable(participation, visibility, [
      { code: 'invalid_condition', field: 'condition' },
    ])
  }
  const validation = validateEquipmentGradeRecoveryRule(ruleValue)
  if (!validation.valid) return unavailable(participation, visibility, [...validation.issues])

  const restrictions = [...new Set(context.restrictions ?? [])]
    .filter(isEquipmentRecoveryRestrictionCode)
    .sort(compareCodeUnits)
  if (restrictions.length > 0) {
    return unavailable(
      participation,
      visibility,
      restrictions.map((code) => ({ code, field: 'restrictions' }))
    )
  }
  if (visibility !== 'known') {
    return unavailable(participation, 'hidden', [{ code: 'hidden_grade', field: 'visibility' }])
  }

  const rule = validation.value
  if (participation.state === 'ungraded' && rule.kind !== 'grade_neutral') {
    return unavailable(participation, visibility, [
      { code: 'ungraded_requires_neutral_rule', field: 'participation' },
    ])
  }

  const materialMap = new Map(
    rule.baseMaterials.map((material) => [material.materialId, material.quantity])
  )
  let waste = rule.baseWaste + (context.condition === 'damaged' ? 1 : 0)
  let durationWeeks = rule.baseDurationWeeks
  const explanationCodes: EquipmentGradeRecoveryExplanationCode[] = [
    rule.kind === 'yield_threshold'
      ? 'recovery_grade.yield_threshold'
      : rule.kind === 'handling_threshold'
        ? 'recovery_grade.handling_threshold'
        : 'recovery_grade.neutral',
  ]

  if (participation.state === 'graded' && rule.kind === 'yield_threshold') {
    if (compareEquipmentGradeIds(participation.gradeId, rule.thresholdGradeId) >= 0) {
      materialMap.set(
        rule.bonusMaterialId,
        (materialMap.get(rule.bonusMaterialId) ?? 0) + rule.bonusQuantity
      )
      waste = Math.max(0, waste - rule.wasteReduction)
    }
  }
  if (participation.state === 'graded' && rule.kind === 'handling_threshold') {
    if (compareEquipmentGradeIds(participation.gradeId, rule.thresholdGradeId) >= 0) {
      durationWeeks += rule.additionalDurationWeeks
    }
  }
  if (context.condition === 'damaged') explanationCodes.push('recovery_condition.damaged')

  return Object.freeze({
    available: true,
    participation,
    visibility,
    projection: resolveEquipmentGradeProjection(participation, visibility),
    pathId: rule.pathId,
    materials: Object.freeze(
      [...materialMap.entries()]
        .sort(([left], [right]) => compareCodeUnits(left, right))
        .map(([materialId, quantity]) => Object.freeze({ materialId, quantity }))
    ),
    waste,
    durationWeeks,
    condition: context.condition,
    explanationCodes: Object.freeze(explanationCodes),
  })
}
