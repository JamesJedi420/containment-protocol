/**
 * SPE-2144 slice 1: deterministic cross-taxon genomic spread registry.
 *
 * Bounded projection of target taxon class, spread vector, containment ceiling,
 * and human genome risk flag. Not a propagation engine, host lifecycle, or
 * independent containment truth.
 */

export const TARGET_TAXON_CLASSES = [
  'vertebrate',
  'invertebrate',
  'plant',
  'fungal',
  'microbial',
  'synthetic',
  'unknown',
] as const
export type TargetTaxonClass = (typeof TARGET_TAXON_CLASSES)[number]

export const SPREAD_VECTORS = [
  'contact',
  'aerosol',
  'vector_borne',
  'waterborne',
  'foodborne',
  'fomite',
  'unknown',
] as const
export type SpreadVector = (typeof SPREAD_VECTORS)[number]

export const CONTAINMENT_CEILINGS = ['open', 'restricted', 'sealed', 'absolute'] as const
export type ContainmentCeiling = (typeof CONTAINMENT_CEILINGS)[number]

export interface CrossTaxonGenomicSpreadRecord {
  readonly id: string
  readonly targetTaxonClass: TargetTaxonClass
  readonly spreadVector: SpreadVector
  readonly containmentCeiling: ContainmentCeiling
  readonly humanGenomeRiskFlag: boolean
}

export interface SpreadRegistryValidationIssue {
  readonly code: string
  readonly field: string
  readonly recordId?: string
}

export interface SpreadRegistryValidationResult {
  readonly valid: boolean
  readonly issues: readonly SpreadRegistryValidationIssue[]
}

export type SpreadRecordLookup =
  | { readonly status: 'found'; readonly record: CrossTaxonGenomicSpreadRecord }
  | { readonly status: 'unknown_record_id' }
  | { readonly status: 'ambiguous_record_id' }
  | { readonly status: 'invalid_record_id' }
  | { readonly status: 'invalid_record' }

const TAXON_SET: ReadonlySet<string> = new Set(TARGET_TAXON_CLASSES)
const VECTOR_SET: ReadonlySet<string> = new Set(SPREAD_VECTORS)
const CEILING_SET: ReadonlySet<string> = new Set(CONTAINMENT_CEILINGS)
const RECORD_ID = /^spread-record:[a-z0-9]+(?:-[a-z0-9]+)*$/

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

function freezeRecord(input: CrossTaxonGenomicSpreadRecord): CrossTaxonGenomicSpreadRecord {
  return Object.freeze({
    id: input.id,
    targetTaxonClass: input.targetTaxonClass,
    spreadVector: input.spreadVector,
    containmentCeiling: input.containmentCeiling,
    humanGenomeRiskFlag: input.humanGenomeRiskFlag,
  })
}

function issuesResult(issues: SpreadRegistryValidationIssue[]): SpreadRegistryValidationResult {
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
  issues: SpreadRegistryValidationIssue[]
): CrossTaxonGenomicSpreadRecord | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const id = token(input.id)
  const targetTaxonClass = token(input.targetTaxonClass)
  const spreadVector = token(input.spreadVector)
  const containmentCeiling = token(input.containmentCeiling)
  const humanGenomeRiskFlag = input.humanGenomeRiskFlag
  let legal = true

  if (!RECORD_ID.test(id)) {
    issues.push({
      code: 'invalid_record_id',
      field: `${field}.id`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!TAXON_SET.has(targetTaxonClass)) {
    issues.push({
      code: 'unknown_target_taxon_class',
      field: `${field}.targetTaxonClass`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!VECTOR_SET.has(spreadVector)) {
    issues.push({
      code: 'unknown_spread_vector',
      field: `${field}.spreadVector`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!CEILING_SET.has(containmentCeiling)) {
    issues.push({
      code: 'unknown_containment_ceiling',
      field: `${field}.containmentCeiling`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (typeof humanGenomeRiskFlag !== 'boolean') {
    issues.push({
      code: 'invalid_human_genome_risk_flag',
      field: `${field}.humanGenomeRiskFlag`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }

  if (!legal) return null

  return freezeRecord({
    id,
    targetTaxonClass: targetTaxonClass as TargetTaxonClass,
    spreadVector: spreadVector as SpreadVector,
    containmentCeiling: containmentCeiling as ContainmentCeiling,
    humanGenomeRiskFlag: humanGenomeRiskFlag as boolean,
  })
}

/**
 * Accept a list of cross-taxon genomic spread records.
 * Unknown classes, vectors, ceilings, or non-boolean flags fail closed.
 */
export function validateCrossTaxonGenomicSpreadRecords(
  input: unknown
): SpreadRegistryValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'records' }])
  }

  const issues: SpreadRegistryValidationIssue[] = []
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
export function normalizeCrossTaxonGenomicSpreadRecords(
  input: readonly CrossTaxonGenomicSpreadRecord[]
): readonly CrossTaxonGenomicSpreadRecord[] | null {
  const validation = validateCrossTaxonGenomicSpreadRecords(input)
  if (!validation.valid) return null
  const ordered = input
    .map((record, index) => validateRecord(record, index, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

export function lookupCrossTaxonGenomicSpreadRecord(
  records: readonly CrossTaxonGenomicSpreadRecord[],
  recordId: string
): SpreadRecordLookup {
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

/** Authored slice-1 fixtures. Projection only. */
export const CROSS_TAXON_GENOMIC_SPREAD_FIXTURES: readonly CrossTaxonGenomicSpreadRecord[] =
  Object.freeze([
    Object.freeze({
      id: 'spread-record:vertebrate-contact',
      targetTaxonClass: 'vertebrate',
      spreadVector: 'contact',
      containmentCeiling: 'restricted',
      humanGenomeRiskFlag: false,
    }),
    Object.freeze({
      id: 'spread-record:microbial-aerosol',
      targetTaxonClass: 'microbial',
      spreadVector: 'aerosol',
      containmentCeiling: 'sealed',
      humanGenomeRiskFlag: true,
    }),
  ])
