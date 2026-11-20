/**
 * SPE-3356: deterministic terrain-based build modifier registry.
 *
 * Compact outputs for regional plot terrain/condition affecting facility,
 * shelter, road, barricade, or site buildability. Does not implement
 * construction workflows, facility assets, or legal ownership.
 */

export const BUILDABILITY_OUTPUTS = [
  'buildable',
  'no-build',
  'restricted-build',
  'contaminated',
  'unstable',
  'improved',
  'obstructed',
  'scarred',
  'costly',
  'requires-clearance',
] as const
export type BuildabilityOutput = (typeof BUILDABILITY_OUTPUTS)[number]

export const CONSTRUCTION_SUPPORT_CLASSES = [
  'lightweight',
  'medium',
  'heavy',
  'specialized',
  'clearance-dependent',
] as const
export type ConstructionSupportClass = (typeof CONSTRUCTION_SUPPORT_CLASSES)[number]

export const TERRAIN_CONDITIONS = [
  'open',
  'contaminated',
  'unstable',
  'improved',
  'obstructed',
  'scarred',
  'marsh',
  'burned',
  'cleared',
] as const
export type TerrainCondition = (typeof TERRAIN_CONDITIONS)[number]

export interface TerrainBuildModifierRecord {
  readonly id: string
  readonly terrainCondition: TerrainCondition
  readonly buildabilityOutput: BuildabilityOutput
  readonly constructionSupportClass?: ConstructionSupportClass
  readonly costModifier?: number
  readonly scarPermanent?: boolean
  readonly notes?: string
}

export interface TerrainBuildModifierValidationIssue {
  readonly code: string
  readonly field: string
  readonly recordId?: string
}

export interface TerrainBuildModifierValidationResult {
  readonly valid: boolean
  readonly issues: readonly TerrainBuildModifierValidationIssue[]
}

export type TerrainBuildModifierLookup =
  | { readonly status: 'found'; readonly record: TerrainBuildModifierRecord }
  | { readonly status: 'unknown_record_id' }
  | { readonly status: 'ambiguous_record_id' }
  | { readonly status: 'invalid_record_id' }
  | { readonly status: 'invalid_record' }

const BUILDABILITY_SET: ReadonlySet<string> = new Set(BUILDABILITY_OUTPUTS)
const SUPPORT_SET: ReadonlySet<string> = new Set(CONSTRUCTION_SUPPORT_CLASSES)
const CONDITION_SET: ReadonlySet<string> = new Set(TERRAIN_CONDITIONS)
const RECORD_ID = /^terrain-build:[a-z0-9]+(?:-[a-z0-9]+)*$/

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freezeRecord(input: TerrainBuildModifierRecord): TerrainBuildModifierRecord {
  return Object.freeze({
    id: input.id,
    terrainCondition: input.terrainCondition,
    buildabilityOutput: input.buildabilityOutput,
    ...(input.constructionSupportClass !== undefined
      ? { constructionSupportClass: input.constructionSupportClass }
      : {}),
    ...(input.costModifier !== undefined ? { costModifier: input.costModifier } : {}),
    ...(input.scarPermanent !== undefined ? { scarPermanent: input.scarPermanent } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  })
}

function issuesResult(
  issues: TerrainBuildModifierValidationIssue[]
): TerrainBuildModifierValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.recordId ?? '', b.recordId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateRecord(
  input: unknown,
  index: number,
  issues: TerrainBuildModifierValidationIssue[]
): TerrainBuildModifierRecord | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const id = token(input.id)
  const terrainCondition = token(input.terrainCondition)
  const buildabilityOutput = token(input.buildabilityOutput)
  let legal = true

  if (!RECORD_ID.test(id)) {
    issues.push({
      code: 'invalid_record_id',
      field: `${field}.id`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!CONDITION_SET.has(terrainCondition)) {
    issues.push({
      code: 'unknown_terrain_condition',
      field: `${field}.terrainCondition`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!BUILDABILITY_SET.has(buildabilityOutput)) {
    issues.push({
      code: 'unknown_buildability_output',
      field: `${field}.buildabilityOutput`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }

  let constructionSupportClass: ConstructionSupportClass | undefined
  if (input.constructionSupportClass !== undefined) {
    const support = token(input.constructionSupportClass)
    if (!SUPPORT_SET.has(support)) {
      issues.push({
        code: 'unknown_construction_support_class',
        field: `${field}.constructionSupportClass`,
        ...(id ? { recordId: id } : {}),
      })
      legal = false
    } else {
      constructionSupportClass = support as ConstructionSupportClass
    }
  }

  let costModifier: number | undefined
  if (input.costModifier !== undefined) {
    if (typeof input.costModifier !== 'number' || !Number.isFinite(input.costModifier)) {
      issues.push({
        code: 'invalid_cost_modifier',
        field: `${field}.costModifier`,
        ...(id ? { recordId: id } : {}),
      })
      legal = false
    } else {
      costModifier = input.costModifier
    }
  }

  let scarPermanent: boolean | undefined
  if (input.scarPermanent !== undefined) {
    if (typeof input.scarPermanent !== 'boolean') {
      issues.push({
        code: 'invalid_scar_permanent',
        field: `${field}.scarPermanent`,
        ...(id ? { recordId: id } : {}),
      })
      legal = false
    } else {
      scarPermanent = input.scarPermanent
    }
  }

  let notes: string | undefined
  if (input.notes !== undefined) {
    const noteValue = token(input.notes)
    if (typeof input.notes !== 'string' || noteValue.length === 0) {
      issues.push({
        code: 'invalid_notes',
        field: `${field}.notes`,
        ...(id ? { recordId: id } : {}),
      })
      legal = false
    } else {
      notes = noteValue
    }
  }

  if (!legal || !CONDITION_SET.has(terrainCondition) || !BUILDABILITY_SET.has(buildabilityOutput))
    return null

  return freezeRecord({
    id,
    terrainCondition: terrainCondition as TerrainCondition,
    buildabilityOutput: buildabilityOutput as BuildabilityOutput,
    constructionSupportClass,
    costModifier,
    scarPermanent,
    notes,
  })
}

/**
 * Accept a list of terrain build modifier records.
 * Unknown conditions, outputs, or support classes fail closed.
 * Input order is not significant for validity.
 */
export function validateTerrainBuildModifierRecords(
  input: unknown
): TerrainBuildModifierValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'records' }])
  }

  const issues: TerrainBuildModifierValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const record = validateRecord(input[index], index, issues)
    if (!record) continue
    if (seenIds.has(record.id)) {
      issues.push({
        code: 'duplicate_record_id',
        field: `records[${index}].id`,
        recordId: record.id,
      })
    }
    seenIds.add(record.id)
  }

  return issuesResult(issues)
}

/** Frozen copy sorted by record id. Returns null when validation fails. */
export function normalizeTerrainBuildModifierRecords(
  input: readonly TerrainBuildModifierRecord[]
): readonly TerrainBuildModifierRecord[] | null {
  const validation = validateTerrainBuildModifierRecords(input)
  if (!validation.valid) return null
  const ordered = input
    .map((record, index) => validateRecord(record, index, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

export function lookupTerrainBuildModifierRecord(
  records: readonly TerrainBuildModifierRecord[],
  recordId: string
): TerrainBuildModifierLookup {
  const id = token(recordId)
  if (!RECORD_ID.test(id)) {
    return Object.freeze({ status: 'invalid_record_id' })
  }
  const matches = records.filter((record) => token(record.id) === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_record_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_record_id' })
  const record = validateRecord(matches[0], 0, [])
  if (!record) return Object.freeze({ status: 'invalid_record' })
  return Object.freeze({ status: 'found', record })
}

/**
 * Deterministic support-capability implication: heavier classes satisfy lighter requirements.
 * Clearance-dependent is exclusive and does not imply others.
 */
export function terrainSupportsConstructionRequirement(
  record: TerrainBuildModifierRecord,
  requirement: ConstructionSupportClass
): boolean {
  if (!record.constructionSupportClass) return false
  if (record.constructionSupportClass === 'clearance-dependent') {
    return requirement === 'clearance-dependent'
  }
  const order: ConstructionSupportClass[] = ['lightweight', 'medium', 'heavy', 'specialized']
  const recordRank = order.indexOf(record.constructionSupportClass)
  const reqRank = order.indexOf(requirement)
  if (recordRank === -1 || reqRank === -1) return false
  return recordRank >= reqRank
}

/** Authored fixtures. Not live map or construction state. */
export const TERRAIN_BUILD_MODIFIER_FIXTURES: readonly TerrainBuildModifierRecord[] = Object.freeze([
  Object.freeze({
    id: 'terrain-build:open-plot',
    terrainCondition: 'open',
    buildabilityOutput: 'buildable',
    constructionSupportClass: 'heavy',
    costModifier: 1.0,
    notes: 'Standard open terrain',
  }),
  Object.freeze({
    id: 'terrain-build:contaminated-scar',
    terrainCondition: 'contaminated',
    buildabilityOutput: 'contaminated',
    constructionSupportClass: 'clearance-dependent',
    scarPermanent: true,
    notes: 'Requires separate clearance before any build',
  }),
  Object.freeze({
    id: 'terrain-build:improved-plot',
    terrainCondition: 'improved',
    buildabilityOutput: 'improved',
    constructionSupportClass: 'medium',
    costModifier: 0.8,
    notes: 'Prepared land with positive modifier',
  }),
  Object.freeze({
    id: 'terrain-build:unstable-ground',
    terrainCondition: 'unstable',
    buildabilityOutput: 'unstable',
    constructionSupportClass: 'lightweight',
    notes: 'Restricts heavier construction',
  }),
])
