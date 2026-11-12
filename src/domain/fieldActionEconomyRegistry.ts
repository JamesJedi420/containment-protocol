/**
 * SPE-2217 slice 1: field action economy registry.
 *
 * Pure deterministic schema for primary / movement / maneuver categories,
 * conversion permissions, and reduced-capacity limits. No GameState persistence
 * and no per-actor turn runner. Distinct from SPE-40 operational mission budgets
 * and from the SPE-62 volatile-action phase pipeline.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type FieldActionId = string

export type FieldActionCategory = 'primary' | 'movement' | 'maneuver'

export const FIELD_ACTION_CATEGORIES: readonly FieldActionCategory[] = [
  'primary',
  'movement',
  'maneuver',
] as const

export type FieldActionConversionMode = 'substitute' | 'consume'

export const FIELD_ACTION_CONVERSION_MODES: readonly FieldActionConversionMode[] = [
  'substitute',
  'consume',
] as const

/** Unrestricted field economy: one slot per authored category. */
export const UNRESTRICTED_CATEGORY_SLOT_LIMITS: Readonly<Record<FieldActionCategory, number>> =
  Object.freeze({
    primary: 1,
    movement: 1,
    maneuver: 1,
  })

export const UNRESTRICTED_TOTAL_SLOTS = 3

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface FieldActionRecord {
  readonly id: FieldActionId
  readonly label: string
  readonly summary?: string
  readonly category: FieldActionCategory
  readonly slotCost: number
}

export interface FieldActionConversionRecord {
  readonly id: FieldActionId
  readonly label: string
  readonly summary?: string
  readonly sourceCategory: FieldActionCategory
  readonly targetCategory: FieldActionCategory
  readonly mode: FieldActionConversionMode
  readonly sourceSlots: number
  readonly targetSlots: number
}

export interface FieldActionReducedCapacityRecord {
  readonly id: FieldActionId
  readonly label: string
  readonly summary?: string
  readonly permittedCategories: readonly FieldActionCategory[]
  readonly categorySlotLimits: Readonly<Partial<Record<FieldActionCategory, number>>>
  readonly maxTotalSlots: number
}

export interface FieldActionEconomyRegistry {
  readonly actions: readonly FieldActionRecord[]
  readonly conversions: readonly FieldActionConversionRecord[]
  readonly reducedCapacity: readonly FieldActionReducedCapacityRecord[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type FieldActionEconomyValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'duplicate_id'
  | 'invalid_action_category'
  | 'invalid_slot_cost'
  | 'invalid_conversion_mode'
  | 'invalid_conversion_source'
  | 'invalid_conversion_target'
  | 'conversion_same_category'
  | 'conversion_zero_slots'
  | 'conversion_consume_creates_surplus'
  | 'conversion_substitute_not_one_to_one'
  | 'reduced_capacity_unknown_category'
  | 'reduced_capacity_empty_permitted_category'
  | 'reduced_capacity_unconstrained'
  | 'reduced_capacity_slot_exceeds_unrestricted'
  | 'reduced_capacity_permitted_without_slots'
  | 'reduced_capacity_limit_without_permit'
  | 'reduced_capacity_invalid_max_total'
  | 'reduced_capacity_max_exceeds_permitted_sum'
  | 'tabletop_action_token_in_id'
  | 'tabletop_action_token_in_label'
  | 'tabletop_action_token_in_field'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'

export interface FieldActionEconomyValidationIssue {
  readonly code: FieldActionEconomyValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface FieldActionEconomyValidationResult {
  readonly valid: boolean
  readonly issues: readonly FieldActionEconomyValidationIssue[]
}

export interface ReducedCapacityLimitProjection {
  readonly recordId: FieldActionId
  readonly permittedCategories: readonly FieldActionCategory[]
  readonly categorySlotLimits: Readonly<Record<FieldActionCategory, number>>
  readonly maxTotalSlots: number
  readonly constrainsUnrestrictedSet: boolean
}

export interface ConversionPermissionProjection {
  readonly recordId: FieldActionId
  readonly sourceCategory: FieldActionCategory | null
  readonly targetCategory: FieldActionCategory | null
  readonly mode: FieldActionConversionMode | null
  readonly legal: boolean
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const FIELD_ACTION_CATEGORY_SET = new Set<string>(FIELD_ACTION_CATEGORIES)
const FIELD_ACTION_CONVERSION_MODE_SET = new Set<string>(FIELD_ACTION_CONVERSION_MODES)

export const TABLETOP_ACTION_TOKEN_PATTERN =
  /\b(strike|stride|bonus action|swift action|standard action|full[- ]round(?: action)?|opportunity attack|action point|free action)\b/i

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

const EMPTY_SLOT_LIMITS: Readonly<Record<FieldActionCategory, number>> = Object.freeze({
  primary: 0,
  movement: 0,
  maneuver: 0,
})

const FAIL_CLOSED_REDUCED_CAPACITY: ReducedCapacityLimitProjection = Object.freeze({
  recordId: '(unknown)',
  permittedCategories: Object.freeze([] as readonly FieldActionCategory[]),
  categorySlotLimits: EMPTY_SLOT_LIMITS,
  maxTotalSlots: 0,
  constrainsUnrestrictedSet: false,
})

const FAIL_CLOSED_CONVERSION: ConversionPermissionProjection = Object.freeze({
  recordId: '(unknown)',
  sourceCategory: null,
  targetCategory: null,
  mode: null,
  legal: false,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asCategoryArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: FieldActionEconomyValidationIssue[],
  issue: FieldActionEconomyValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: FieldActionEconomyValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    const severityCompare = left.severity.localeCompare(right.severity)
    if (severityCompare !== 0) {
      return severityCompare
    }

    return left.detail.localeCompare(right.detail)
  })
}

function freezeValidationResult(
  issues: FieldActionEconomyValidationIssue[]
): FieldActionEconomyValidationResult {
  const sortedIssues = sortValidationIssues(issues)
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      sortedIssues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
        })
      )
    ),
  })
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function containsTabletopActionToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && TABLETOP_ACTION_TOKEN_PATTERN.test(token)
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function scanCpNeutralStringField(
  issues: FieldActionEconomyValidationIssue[],
  id: string,
  field: string,
  value: string | undefined
) {
  const token = normalizeToken(value ?? '')
  if (!token) {
    return
  }

  if (containsTabletopActionToken(token)) {
    pushIssue(issues, {
      code: 'tabletop_action_token_in_field',
      severity: 'error',
      detail: `Field action economy record ${id || '(unknown)'} field ${field} contains a tabletop action-economy token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(token)) {
    pushIssue(issues, {
      code: 'franchise_token_in_field',
      severity: 'error',
      detail: `Field action economy record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanIdentityFields(
  issues: FieldActionEconomyValidationIssue[],
  id: string,
  label: string
) {
  if (containsTabletopActionToken(id)) {
    pushIssue(issues, {
      code: 'tabletop_action_token_in_id',
      severity: 'error',
      detail: `Field action economy record id ${id || '(unknown)'} contains a tabletop action-economy token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Field action economy record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsTabletopActionToken(label)) {
    pushIssue(issues, {
      code: 'tabletop_action_token_in_label',
      severity: 'error',
      detail: `Field action economy record label ${label || '(unknown)'} contains a tabletop action-economy token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Field action economy record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function defineAction(record: FieldActionRecord): FieldActionRecord {
  return Object.freeze({ ...record })
}

function defineConversion(record: FieldActionConversionRecord): FieldActionConversionRecord {
  return Object.freeze({ ...record })
}

function defineReducedCapacity(
  record: FieldActionReducedCapacityRecord
): FieldActionReducedCapacityRecord {
  return Object.freeze({
    ...record,
    permittedCategories: Object.freeze([...record.permittedCategories]),
    categorySlotLimits: Object.freeze({ ...record.categorySlotLimits }),
  })
}

function sortedUniqueCategories(
  categories: readonly FieldActionCategory[]
): readonly FieldActionCategory[] {
  return Object.freeze([...new Set(categories)].sort((left, right) => left.localeCompare(right)))
}

function sumPermittedLimits(
  permitted: readonly FieldActionCategory[],
  limits: Readonly<Partial<Record<FieldActionCategory, number>>>
): number {
  let total = 0
  for (const category of permitted) {
    const limit = limits[category]
    if (typeof limit === 'number') {
      total += limit
    }
  }
  return total
}

function isUnconstrainedReducedCapacity(
  permitted: readonly FieldActionCategory[],
  limits: Readonly<Partial<Record<FieldActionCategory, number>>>,
  maxTotalSlots: number
): boolean {
  if (permitted.length !== FIELD_ACTION_CATEGORIES.length) {
    return false
  }

  for (const category of FIELD_ACTION_CATEGORIES) {
    if (!permitted.includes(category)) {
      return false
    }
    const limit = limits[category]
    if (typeof limit !== 'number' || limit < UNRESTRICTED_CATEGORY_SLOT_LIMITS[category]) {
      return false
    }
  }

  return maxTotalSlots >= UNRESTRICTED_TOTAL_SLOTS
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isFieldActionCategory(value: string): value is FieldActionCategory {
  return FIELD_ACTION_CATEGORY_SET.has(value)
}

export function isFieldActionConversionMode(value: string): value is FieldActionConversionMode {
  return FIELD_ACTION_CONVERSION_MODE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateFieldActionRecord(
  record: FieldActionRecord
): FieldActionEconomyValidationResult {
  if (!record || typeof record !== 'object') {
    return freezeValidationResult([
      {
        code: 'missing_id',
        severity: 'error',
        detail: 'Field action record is missing id.',
      },
      {
        code: 'missing_label',
        severity: 'error',
        detail: 'Field action record is missing label.',
      },
      {
        code: 'invalid_action_category',
        severity: 'error',
        detail: 'Field action record (unknown) has invalid category undefined.',
      },
      {
        code: 'invalid_slot_cost',
        severity: 'error',
        detail: 'Field action record (unknown) slotCost must be a positive safe integer.',
      },
    ])
  }

  const issues: FieldActionEconomyValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Field action record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: `Field action record ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanIdentityFields(issues, id, label)
  scanCpNeutralStringField(issues, id, 'summary', record.summary)

  if (!isFieldActionCategory(record.category)) {
    pushIssue(issues, {
      code: 'invalid_action_category',
      severity: 'error',
      detail: `Field action record ${id || '(unknown)'} has invalid category ${String(record.category)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isPositiveSafeInteger(record.slotCost)) {
    pushIssue(issues, {
      code: 'invalid_slot_cost',
      severity: 'error',
      detail: `Field action record ${id || '(unknown)'} slotCost must be a positive safe integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

export function validateFieldActionConversionRecord(
  record: FieldActionConversionRecord
): FieldActionEconomyValidationResult {
  if (!record || typeof record !== 'object') {
    return freezeValidationResult([
      {
        code: 'missing_id',
        severity: 'error',
        detail: 'Field action conversion record is missing id.',
      },
      {
        code: 'missing_label',
        severity: 'error',
        detail: 'Field action conversion record is missing label.',
      },
      {
        code: 'invalid_conversion_source',
        severity: 'error',
        detail: 'Field action conversion record (unknown) has invalid sourceCategory undefined.',
      },
      {
        code: 'invalid_conversion_target',
        severity: 'error',
        detail: 'Field action conversion record (unknown) has invalid targetCategory undefined.',
      },
      {
        code: 'invalid_conversion_mode',
        severity: 'error',
        detail: 'Field action conversion record (unknown) has invalid mode undefined.',
      },
    ])
  }

  const issues: FieldActionEconomyValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Field action conversion record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanIdentityFields(issues, id, label)
  scanCpNeutralStringField(issues, id, 'summary', record.summary)

  const sourceValid = isFieldActionCategory(record.sourceCategory)
  const targetValid = isFieldActionCategory(record.targetCategory)

  if (!sourceValid) {
    pushIssue(issues, {
      code: 'invalid_conversion_source',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} has invalid sourceCategory ${String(record.sourceCategory)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!targetValid) {
    pushIssue(issues, {
      code: 'invalid_conversion_target',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} has invalid targetCategory ${String(record.targetCategory)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isFieldActionConversionMode(record.mode)) {
    pushIssue(issues, {
      code: 'invalid_conversion_mode',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} has invalid mode ${String(record.mode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (sourceValid && targetValid && record.sourceCategory === record.targetCategory) {
    pushIssue(issues, {
      code: 'conversion_same_category',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} cannot convert ${record.sourceCategory} onto itself.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const sourceSlotsValid = isPositiveSafeInteger(record.sourceSlots)
  const targetSlotsValid = isPositiveSafeInteger(record.targetSlots)

  if (!sourceSlotsValid || !targetSlotsValid) {
    pushIssue(issues, {
      code: 'conversion_zero_slots',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} sourceSlots and targetSlots must be positive safe integers.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.mode === 'substitute' && sourceSlotsValid && targetSlotsValid) {
    if (record.sourceSlots !== 1 || record.targetSlots !== 1) {
      pushIssue(issues, {
        code: 'conversion_substitute_not_one_to_one',
        severity: 'error',
        detail: `Field action conversion record ${id || '(unknown)'} substitute mode requires one-to-one slot conversion.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (
    record.mode === 'consume' &&
    sourceSlotsValid &&
    targetSlotsValid &&
    record.targetSlots > record.sourceSlots
  ) {
    pushIssue(issues, {
      code: 'conversion_consume_creates_surplus',
      severity: 'error',
      detail: `Field action conversion record ${id || '(unknown)'} consume mode cannot produce more target slots than source slots spent.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

export function validateFieldActionReducedCapacityRecord(
  record: FieldActionReducedCapacityRecord
): FieldActionEconomyValidationResult {
  if (!record || typeof record !== 'object') {
    return freezeValidationResult([
      {
        code: 'missing_id',
        severity: 'error',
        detail: 'Reduced-capacity record is missing id.',
      },
      {
        code: 'missing_label',
        severity: 'error',
        detail: 'Reduced-capacity record is missing label.',
      },
      {
        code: 'reduced_capacity_invalid_max_total',
        severity: 'error',
        detail:
          'Reduced-capacity record (unknown) maxTotalSlots must be a non-negative safe integer.',
      },
    ])
  }

  const issues: FieldActionEconomyValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Reduced-capacity record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: `Reduced-capacity record ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanIdentityFields(issues, id, label)
  scanCpNeutralStringField(issues, id, 'summary', record.summary)

  const permittedRaw = asCategoryArray(record.permittedCategories)
  const permitted: FieldActionCategory[] = []

  for (const entry of permittedRaw) {
    if (typeof entry !== 'string' || !normalizeToken(entry)) {
      pushIssue(issues, {
        code: 'reduced_capacity_empty_permitted_category',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} permittedCategories contains an empty category.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isFieldActionCategory(entry)) {
      pushIssue(issues, {
        code: 'reduced_capacity_unknown_category',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} permittedCategories contains unknown category ${entry}.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    permitted.push(entry)
  }

  const limits =
    record.categorySlotLimits && typeof record.categorySlotLimits === 'object'
      ? record.categorySlotLimits
      : {}

  for (const category of permitted) {
    const limit = limits[category]
    if (!isPositiveSafeInteger(limit)) {
      pushIssue(issues, {
        code: 'reduced_capacity_permitted_without_slots',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} permits ${category} without a positive slot limit.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (limit > UNRESTRICTED_CATEGORY_SLOT_LIMITS[category]) {
      pushIssue(issues, {
        code: 'reduced_capacity_slot_exceeds_unrestricted',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} slot limit for ${category} exceeds the unrestricted baseline.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const key of Object.keys(limits)) {
    if (!isFieldActionCategory(key)) {
      pushIssue(issues, {
        code: 'reduced_capacity_unknown_category',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} categorySlotLimits contains unknown category ${key}.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!permitted.includes(key)) {
      pushIssue(issues, {
        code: 'reduced_capacity_limit_without_permit',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} lists a slot limit for ${key} which is not permitted.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isNonNegativeSafeInteger(record.maxTotalSlots)) {
    pushIssue(issues, {
      code: 'reduced_capacity_invalid_max_total',
      severity: 'error',
      detail: `Reduced-capacity record ${id || '(unknown)'} maxTotalSlots must be a non-negative safe integer.`,
      relatedIds: id ? [id] : undefined,
    })
  } else {
    const permittedSum = sumPermittedLimits(permitted, limits)
    if (record.maxTotalSlots > permittedSum) {
      pushIssue(issues, {
        code: 'reduced_capacity_max_exceeds_permitted_sum',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} maxTotalSlots exceeds the sum of permitted slot limits.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (isUnconstrainedReducedCapacity(permitted, limits, record.maxTotalSlots)) {
      pushIssue(issues, {
        code: 'reduced_capacity_unconstrained',
        severity: 'error',
        detail: `Reduced-capacity record ${id || '(unknown)'} still permits the unrestricted field-action set.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  return freezeValidationResult(issues)
}

export function validateFieldActionEconomyRegistry(
  registry: FieldActionEconomyRegistry
): FieldActionEconomyValidationResult {
  if (!registry || typeof registry !== 'object') {
    return freezeValidationResult([
      {
        code: 'missing_id',
        severity: 'error',
        detail: 'Field action economy registry is missing.',
      },
    ])
  }

  const issues: FieldActionEconomyValidationIssue[] = []
  const seenIds = new Set<string>()

  const actions = Array.isArray(registry.actions) ? registry.actions : []
  const conversions = Array.isArray(registry.conversions) ? registry.conversions : []
  const reducedCapacity = Array.isArray(registry.reducedCapacity) ? registry.reducedCapacity : []

  for (const entry of actions) {
    issues.push(...validateFieldActionRecord(entry).issues)
    const id = normalizeToken(entry?.id)
    if (!id) {
      continue
    }
    if (seenIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_id',
        severity: 'error',
        detail: `Duplicate field action economy id ${id}.`,
        relatedIds: [id],
      })
    } else {
      seenIds.add(id)
    }
  }

  for (const entry of conversions) {
    issues.push(...validateFieldActionConversionRecord(entry).issues)
    const id = normalizeToken(entry?.id)
    if (!id) {
      continue
    }
    if (seenIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_id',
        severity: 'error',
        detail: `Duplicate field action economy id ${id}.`,
        relatedIds: [id],
      })
    } else {
      seenIds.add(id)
    }
  }

  for (const entry of reducedCapacity) {
    issues.push(...validateFieldActionReducedCapacityRecord(entry).issues)
    const id = normalizeToken(entry?.id)
    if (!id) {
      continue
    }
    if (seenIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_id',
        severity: 'error',
        detail: `Duplicate field action economy id ${id}.`,
        relatedIds: [id],
      })
    } else {
      seenIds.add(id)
    }
  }

  return freezeValidationResult(issues)
}

/**
 * Fail-closed projection of reduced-capacity limits. Invalid records project
 * zero availability rather than the unrestricted set.
 */
export function projectReducedCapacityLimits(
  record: FieldActionReducedCapacityRecord
): ReducedCapacityLimitProjection {
  const validation = validateFieldActionReducedCapacityRecord(record)
  if (!validation.valid || !record || typeof record !== 'object') {
    const recordId = normalizeToken(record?.id) || FAIL_CLOSED_REDUCED_CAPACITY.recordId
    return Object.freeze({
      ...FAIL_CLOSED_REDUCED_CAPACITY,
      recordId,
    })
  }

  const permittedCategories = sortedUniqueCategories(
    record.permittedCategories.filter((category): category is FieldActionCategory =>
      isFieldActionCategory(category)
    )
  )

  const categorySlotLimits: Record<FieldActionCategory, number> = {
    primary: 0,
    movement: 0,
    maneuver: 0,
  }

  for (const category of permittedCategories) {
    const limit = record.categorySlotLimits[category]
    categorySlotLimits[category] = typeof limit === 'number' ? limit : 0
  }

  return Object.freeze({
    recordId: normalizeToken(record.id),
    permittedCategories,
    categorySlotLimits: Object.freeze(categorySlotLimits),
    maxTotalSlots: record.maxTotalSlots,
    constrainsUnrestrictedSet: true,
  })
}

/**
 * Fail-closed conversion projection. Invalid or unknown targets are not legal.
 */
export function projectConversionPermission(
  record: FieldActionConversionRecord
): ConversionPermissionProjection {
  const validation = validateFieldActionConversionRecord(record)
  if (!validation.valid || !record || typeof record !== 'object') {
    const recordId = normalizeToken(record?.id) || FAIL_CLOSED_CONVERSION.recordId
    return Object.freeze({
      ...FAIL_CLOSED_CONVERSION,
      recordId,
    })
  }

  return Object.freeze({
    recordId: normalizeToken(record.id),
    sourceCategory: record.sourceCategory,
    targetCategory: record.targetCategory,
    mode: record.mode,
    legal: true,
  })
}

// ---------------------------------------------------------------------------
// Frozen fixtures
// ---------------------------------------------------------------------------

/** CP-neutral primary field action. */
export const PRIMARY_FIELD_ACTION_FIXTURE: FieldActionRecord = defineAction({
  id: 'field-action:direct-intervention',
  label: 'Direct intervention',
  summary: "Primary field action used to apply the operation's main effect.",
  category: 'primary',
  slotCost: 1,
})

/** CP-neutral movement field action. */
export const MOVEMENT_FIELD_ACTION_FIXTURE: FieldActionRecord = defineAction({
  id: 'field-action:reposition',
  label: 'Reposition',
  summary: 'Movement field action used to change standing or approach.',
  category: 'movement',
  slotCost: 1,
})

/** CP-neutral maneuver field action. */
export const MANEUVER_FIELD_ACTION_FIXTURE: FieldActionRecord = defineAction({
  id: 'field-action:control-maneuver',
  label: 'Control maneuver',
  summary: 'Maneuver field action used to constrain, cover, or redirect a subject.',
  category: 'maneuver',
  slotCost: 1,
})

/** Primary may substitute for movement (one-to-one). */
export const PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE: FieldActionConversionRecord =
  defineConversion({
    id: 'field-action-conversion:primary-covers-reposition',
    label: 'Primary covers reposition',
    summary: 'A primary slot may substitute for a movement slot during the same field beat.',
    sourceCategory: 'primary',
    targetCategory: 'movement',
    mode: 'substitute',
    sourceSlots: 1,
    targetSlots: 1,
  })

/** Impaired mobility drops the movement category. */
export const IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE: FieldActionReducedCapacityRecord =
  defineReducedCapacity({
    id: 'field-action-capacity:impaired-mobility',
    label: 'Impaired mobility',
    summary: 'Movement category is unavailable; primary and maneuver remain at one slot each.',
    permittedCategories: ['primary', 'maneuver'],
    categorySlotLimits: {
      primary: 1,
      maneuver: 1,
    },
    maxTotalSlots: 2,
  })

export const DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY: FieldActionEconomyRegistry = Object.freeze({
  actions: Object.freeze([
    PRIMARY_FIELD_ACTION_FIXTURE,
    MOVEMENT_FIELD_ACTION_FIXTURE,
    MANEUVER_FIELD_ACTION_FIXTURE,
  ]),
  conversions: Object.freeze([PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE]),
  reducedCapacity: Object.freeze([IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE]),
})
