import {
  EQUIPMENT_GRADE_IDS,
  isEquipmentGradeId,
  resolveEquipmentGradeProjection,
  type EquipmentGradeId,
  type EquipmentGradeParticipation,
  type EquipmentGradeProjection,
  type EquipmentGradeVisibility,
} from './equipmentGrade'

export const EQUIPMENT_GRADE_AUTHORING_BASES = [
  'standard_issue',
  'specialized_field',
  'advanced_system',
  'experimental_prototype',
  'singular_masterwork',
] as const

export type EquipmentGradeAuthoringBasis = (typeof EQUIPMENT_GRADE_AUTHORING_BASES)[number]

export const EQUIPMENT_GRADE_BY_AUTHORING_BASIS: Readonly<
  Record<EquipmentGradeAuthoringBasis, EquipmentGradeId>
> = Object.freeze({
  standard_issue: 'grade_1',
  specialized_field: 'grade_2',
  advanced_system: 'grade_3',
  experimental_prototype: 'grade_4',
  singular_masterwork: 'grade_5',
})

export const EQUIPMENT_GRADE_CATALOG_STATES = [
  'graded',
  'intentionally_ungraded',
  'hidden_until_identified',
  'excluded_by_taxonomy',
  'blocked_pending_design_review',
] as const

export type EquipmentGradeCatalogState = (typeof EQUIPMENT_GRADE_CATALOG_STATES)[number]

export const EQUIPMENT_GRADE_ORIGINS = ['ordinary', 'magical', 'technological', 'hybrid'] as const

export type EquipmentGradeOrigin = (typeof EQUIPMENT_GRADE_ORIGINS)[number]

export const EQUIPMENT_GRADE_FUNCTIONAL_CLASSES = [
  'combat',
  'communications',
  'containment',
  'detection',
  'diplomacy',
  'medical',
  'protection',
] as const

export type EquipmentGradeFunctionalClass = (typeof EQUIPMENT_GRADE_FUNCTIONAL_CLASSES)[number]

export const EQUIPMENT_GRADE_CATALOG_SEGMENTS = [
  'craftable',
  'direct_procurement',
  'licensed_procurement',
] as const

export type EquipmentGradeCatalogSegment = (typeof EQUIPMENT_GRADE_CATALOG_SEGMENTS)[number]

interface EquipmentGradeCatalogMetadata {
  readonly origin: EquipmentGradeOrigin
  readonly functionalClass: EquipmentGradeFunctionalClass
  readonly catalogSegment: EquipmentGradeCatalogSegment
  readonly variantId?: string
}

type AuthoredGradedProfile = EquipmentGradeCatalogMetadata &
  Readonly<{
    state: 'graded' | 'hidden_until_identified'
    gradeId: EquipmentGradeId
    basis: EquipmentGradeAuthoringBasis
  }>

type AuthoredExceptionProfile = EquipmentGradeCatalogMetadata &
  Readonly<{
    state: 'intentionally_ungraded' | 'excluded_by_taxonomy' | 'blocked_pending_design_review'
    reason: string
  }>

export type EquipmentGradeCatalogProfile = AuthoredGradedProfile | AuthoredExceptionProfile

export type EquipmentGradeCatalogValidationIssueCode =
  | 'invalid_shape'
  | 'unexpected_field'
  | 'invalid_state'
  | 'missing_grade_id'
  | 'invalid_grade_id'
  | 'unexpected_grade_id'
  | 'missing_basis'
  | 'invalid_basis'
  | 'unexpected_basis'
  | 'grade_basis_mismatch'
  | 'missing_reason'
  | 'invalid_reason'
  | 'unexpected_reason'
  | 'invalid_origin'
  | 'invalid_functional_class'
  | 'invalid_catalog_segment'
  | 'invalid_variant_id'

export interface EquipmentGradeCatalogValidationIssue {
  readonly code: EquipmentGradeCatalogValidationIssueCode
  readonly field: string
}

export type EquipmentGradeCatalogValidationResult =
  | Readonly<{ valid: true; value: EquipmentGradeCatalogProfile }>
  | Readonly<{ valid: false; issues: readonly EquipmentGradeCatalogValidationIssue[] }>

const GRADED_FIELDS = new Set([
  'state',
  'gradeId',
  'basis',
  'origin',
  'functionalClass',
  'catalogSegment',
  'variantId',
])

const EXCEPTION_FIELDS = new Set([
  'state',
  'reason',
  'origin',
  'functionalClass',
  'catalogSegment',
  'variantId',
])

const CATALOG_STATE_SET = new Set<string>(EQUIPMENT_GRADE_CATALOG_STATES)
const AUTHORING_BASIS_SET = new Set<string>(EQUIPMENT_GRADE_AUTHORING_BASES)
const ORIGIN_SET = new Set<string>(EQUIPMENT_GRADE_ORIGINS)
const FUNCTIONAL_CLASS_SET = new Set<string>(EQUIPMENT_GRADE_FUNCTIONAL_CLASSES)
const CATALOG_SEGMENT_SET = new Set<string>(EQUIPMENT_GRADE_CATALOG_SEGMENTS)

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

function freezeIssues(issues: EquipmentGradeCatalogValidationIssue[]) {
  return Object.freeze(issues.map((issue) => Object.freeze(issue)))
}

function hasOwn(input: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(input, field)
}

export function validateEquipmentGradeCatalogProfile(
  value: unknown
): EquipmentGradeCatalogValidationResult {
  if (!isPlainRecord(value)) {
    return Object.freeze({
      valid: false,
      issues: freezeIssues([{ code: 'invalid_shape', field: '$' }]),
    })
  }

  const issues: EquipmentGradeCatalogValidationIssue[] = []
  const state = value.state
  const validState = typeof state === 'string' && CATALOG_STATE_SET.has(state)
  const gradedState = state === 'graded' || state === 'hidden_until_identified'
  const allowedFields = gradedState ? GRADED_FIELDS : EXCEPTION_FIELDS

  if (!validState) {
    issues.push({ code: 'invalid_state', field: 'state' })
  }

  for (const field of Object.keys(value).sort(compareCodeUnits)) {
    if (!allowedFields.has(field)) {
      let code: EquipmentGradeCatalogValidationIssueCode = 'unexpected_field'
      if (field === 'gradeId') code = 'unexpected_grade_id'
      if (field === 'basis') code = 'unexpected_basis'
      if (field === 'reason') code = 'unexpected_reason'
      issues.push({ code, field })
    }
  }

  if (gradedState) {
    if (!hasOwn(value, 'gradeId')) {
      issues.push({ code: 'missing_grade_id', field: 'gradeId' })
    } else if (!isEquipmentGradeId(value.gradeId)) {
      issues.push({ code: 'invalid_grade_id', field: 'gradeId' })
    }

    if (!hasOwn(value, 'basis')) {
      issues.push({ code: 'missing_basis', field: 'basis' })
    } else if (typeof value.basis !== 'string' || !AUTHORING_BASIS_SET.has(value.basis)) {
      issues.push({ code: 'invalid_basis', field: 'basis' })
    } else if (
      isEquipmentGradeId(value.gradeId) &&
      EQUIPMENT_GRADE_BY_AUTHORING_BASIS[value.basis as EquipmentGradeAuthoringBasis] !==
        value.gradeId
    ) {
      issues.push({ code: 'grade_basis_mismatch', field: 'gradeId' })
    }
  } else if (validState) {
    if (!hasOwn(value, 'reason')) {
      issues.push({ code: 'missing_reason', field: 'reason' })
    } else if (typeof value.reason !== 'string' || value.reason.trim().length === 0) {
      issues.push({ code: 'invalid_reason', field: 'reason' })
    }
  }

  if (typeof value.origin !== 'string' || !ORIGIN_SET.has(value.origin)) {
    issues.push({ code: 'invalid_origin', field: 'origin' })
  }
  if (
    typeof value.functionalClass !== 'string' ||
    !FUNCTIONAL_CLASS_SET.has(value.functionalClass)
  ) {
    issues.push({ code: 'invalid_functional_class', field: 'functionalClass' })
  }
  if (typeof value.catalogSegment !== 'string' || !CATALOG_SEGMENT_SET.has(value.catalogSegment)) {
    issues.push({ code: 'invalid_catalog_segment', field: 'catalogSegment' })
  }
  if (
    value.variantId !== undefined &&
    (typeof value.variantId !== 'string' || value.variantId.trim().length === 0)
  ) {
    issues.push({ code: 'invalid_variant_id', field: 'variantId' })
  }

  if (issues.length > 0) {
    return Object.freeze({ valid: false, issues: freezeIssues(issues) })
  }

  const metadata = {
    origin: value.origin as EquipmentGradeOrigin,
    functionalClass: value.functionalClass as EquipmentGradeFunctionalClass,
    catalogSegment: value.catalogSegment as EquipmentGradeCatalogSegment,
    ...(value.variantId === undefined ? {} : { variantId: (value.variantId as string).trim() }),
  }
  const normalized: EquipmentGradeCatalogProfile = gradedState
    ? {
        state: state as 'graded' | 'hidden_until_identified',
        gradeId: value.gradeId as EquipmentGradeId,
        basis: value.basis as EquipmentGradeAuthoringBasis,
        ...metadata,
      }
    : {
        state: state as AuthoredExceptionProfile['state'],
        reason: (value.reason as string).trim(),
        ...metadata,
      }

  return Object.freeze({ valid: true, value: Object.freeze(normalized) })
}

export function getEquipmentGradeCatalogParticipation(
  profile: EquipmentGradeCatalogProfile
): EquipmentGradeParticipation {
  if (profile.state === 'graded' || profile.state === 'hidden_until_identified') {
    return Object.freeze({ state: 'graded', gradeId: profile.gradeId })
  }
  return Object.freeze({ state: 'ungraded' })
}

export function getEquipmentGradeCatalogVisibility(
  profile: EquipmentGradeCatalogProfile
): EquipmentGradeVisibility {
  return profile.state === 'hidden_until_identified' ||
    profile.state === 'blocked_pending_design_review'
    ? 'hidden'
    : 'known'
}

export function resolveEquipmentGradeCatalogProjection(
  profile: EquipmentGradeCatalogProfile,
  visibility: EquipmentGradeVisibility = getEquipmentGradeCatalogVisibility(profile)
): EquipmentGradeProjection {
  const authoredVisibility = getEquipmentGradeCatalogVisibility(profile)
  const effectiveVisibility = authoredVisibility === 'hidden' ? 'hidden' : visibility
  return resolveEquipmentGradeProjection(
    getEquipmentGradeCatalogParticipation(profile),
    effectiveVisibility
  )
}

type DistributionCounts = Readonly<Record<string, number>>

export interface EquipmentGradeDistributionReport {
  readonly totalDefinitions: number
  readonly byState: DistributionCounts
  readonly byGrade: DistributionCounts
  readonly totalsByOrigin: Readonly<Record<EquipmentGradeOrigin, number>>
  readonly totalsByFunctionalClass: Readonly<Record<EquipmentGradeFunctionalClass, number>>
  readonly totalsByCatalogSegment: Readonly<Record<EquipmentGradeCatalogSegment, number>>
  readonly byOrigin: Readonly<Record<EquipmentGradeOrigin, DistributionCounts>>
  readonly byFunctionalClass: Readonly<Record<EquipmentGradeFunctionalClass, DistributionCounts>>
  readonly byCatalogSegment: Readonly<Record<EquipmentGradeCatalogSegment, DistributionCounts>>
}

function emptyStateCounts() {
  return Object.fromEntries(EQUIPMENT_GRADE_CATALOG_STATES.map((state) => [state, 0])) as Record<
    EquipmentGradeCatalogState,
    number
  >
}

function emptyGradeCounts() {
  return Object.fromEntries(EQUIPMENT_GRADE_IDS.map((gradeId) => [gradeId, 0])) as Record<
    EquipmentGradeId,
    number
  >
}

function freezeCountRecord(record: Record<string, number>): DistributionCounts {
  return Object.freeze({ ...record })
}

export function createEquipmentGradeDistributionReport(
  definitions: readonly Readonly<{ id: string; gradeProfile: EquipmentGradeCatalogProfile }>[]
): EquipmentGradeDistributionReport {
  const orderedDefinitions = [...definitions].sort((left, right) =>
    compareCodeUnits(left.id, right.id)
  )
  const byState = emptyStateCounts()
  const byGrade = emptyGradeCounts()
  const totalsByOrigin = Object.fromEntries(
    EQUIPMENT_GRADE_ORIGINS.map((origin) => [origin, 0])
  ) as Record<EquipmentGradeOrigin, number>
  const totalsByFunctionalClass = Object.fromEntries(
    EQUIPMENT_GRADE_FUNCTIONAL_CLASSES.map((functionalClass) => [functionalClass, 0])
  ) as Record<EquipmentGradeFunctionalClass, number>
  const totalsByCatalogSegment = Object.fromEntries(
    EQUIPMENT_GRADE_CATALOG_SEGMENTS.map((catalogSegment) => [catalogSegment, 0])
  ) as Record<EquipmentGradeCatalogSegment, number>
  const byOrigin = Object.fromEntries(
    EQUIPMENT_GRADE_ORIGINS.map((origin) => [origin, emptyGradeCounts()])
  ) as Record<EquipmentGradeOrigin, Record<EquipmentGradeId, number>>
  const byFunctionalClass = Object.fromEntries(
    EQUIPMENT_GRADE_FUNCTIONAL_CLASSES.map((functionalClass) => [
      functionalClass,
      emptyGradeCounts(),
    ])
  ) as Record<EquipmentGradeFunctionalClass, Record<EquipmentGradeId, number>>
  const byCatalogSegment = Object.fromEntries(
    EQUIPMENT_GRADE_CATALOG_SEGMENTS.map((catalogSegment) => [catalogSegment, emptyGradeCounts()])
  ) as Record<EquipmentGradeCatalogSegment, Record<EquipmentGradeId, number>>

  for (const definition of orderedDefinitions) {
    const validation = validateEquipmentGradeCatalogProfile(definition.gradeProfile)
    if (!validation.valid) {
      const issueSummary = validation.issues
        .map((issue) => `${issue.code}:${issue.field}`)
        .join(',')
      throw new Error(`Invalid equipment grade profile at ${definition.id}: ${issueSummary}.`)
    }
    const profile = validation.value
    byState[profile.state] += 1
    totalsByOrigin[profile.origin] += 1
    totalsByFunctionalClass[profile.functionalClass] += 1
    totalsByCatalogSegment[profile.catalogSegment] += 1
    if (profile.state !== 'graded') continue

    byGrade[profile.gradeId] += 1
    byOrigin[profile.origin][profile.gradeId] += 1
    byFunctionalClass[profile.functionalClass][profile.gradeId] += 1
    byCatalogSegment[profile.catalogSegment][profile.gradeId] += 1
  }

  return Object.freeze({
    totalDefinitions: orderedDefinitions.length,
    byState: freezeCountRecord(byState),
    byGrade: freezeCountRecord(byGrade),
    totalsByOrigin: freezeCountRecord(totalsByOrigin) as Readonly<
      Record<EquipmentGradeOrigin, number>
    >,
    totalsByFunctionalClass: freezeCountRecord(totalsByFunctionalClass) as Readonly<
      Record<EquipmentGradeFunctionalClass, number>
    >,
    totalsByCatalogSegment: freezeCountRecord(totalsByCatalogSegment) as Readonly<
      Record<EquipmentGradeCatalogSegment, number>
    >,
    byOrigin: Object.freeze(
      Object.fromEntries(
        EQUIPMENT_GRADE_ORIGINS.map((origin) => [origin, freezeCountRecord(byOrigin[origin])])
      )
    ) as Readonly<Record<EquipmentGradeOrigin, DistributionCounts>>,
    byFunctionalClass: Object.freeze(
      Object.fromEntries(
        EQUIPMENT_GRADE_FUNCTIONAL_CLASSES.map((functionalClass) => [
          functionalClass,
          freezeCountRecord(byFunctionalClass[functionalClass]),
        ])
      )
    ) as Readonly<Record<EquipmentGradeFunctionalClass, DistributionCounts>>,
    byCatalogSegment: Object.freeze(
      Object.fromEntries(
        EQUIPMENT_GRADE_CATALOG_SEGMENTS.map((catalogSegment) => [
          catalogSegment,
          freezeCountRecord(byCatalogSegment[catalogSegment]),
        ])
      )
    ) as Readonly<Record<EquipmentGradeCatalogSegment, DistributionCounts>>,
  })
}
