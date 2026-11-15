/**
 * SPE-1541 slice 1: location alias registry.
 *
 * Bounded deterministic mappings from alternate, historical, regional, or
 * colloquial names to a single canonical location or entity id. Supports
 * search and record interpretation without duplicating the underlying entity
 * or establishing a second naming authority.
 */

export interface LocationAliasRecord {
  readonly canonicalId: string
  readonly aliases: readonly string[]
  readonly kind: 'location' | 'institution' | 'artifact' | 'procedure'
}

export interface LocationAliasValidationIssue {
  readonly code: string
  readonly field: string
  readonly canonicalId?: string
}

export interface LocationAliasValidationResult {
  readonly valid: boolean
  readonly issues: readonly LocationAliasValidationIssue[]
}

const CANONICAL_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const ALIAS = /^[\w\s'-]{1,80}$/

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function freezeRecord(input: LocationAliasRecord): LocationAliasRecord {
  return Object.freeze({
    canonicalId: input.canonicalId,
    aliases: Object.freeze([...input.aliases].sort(compareStrings)),
    kind: input.kind,
  })
}

function issuesResult(
  issues: LocationAliasValidationIssue[]
): LocationAliasValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.canonicalId ?? '', b.canonicalId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateRecord(
  input: unknown,
  index: number,
  issues: LocationAliasValidationIssue[],
  seenCanonical: Set<string>,
  seenAliases: Set<string>
): LocationAliasRecord | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const canonicalId = token(input.canonicalId)
  const kind = token(input.kind)
  let legal = true

  if (!CANONICAL_ID.test(canonicalId)) {
    issues.push({
      code: 'invalid_canonical_id',
      field: `${field}.canonicalId`,
      ...(canonicalId ? { canonicalId } : {}),
    })
    legal = false
  } else if (seenCanonical.has(canonicalId)) {
    issues.push({
      code: 'duplicate_canonical_id',
      field: `${field}.canonicalId`,
      canonicalId,
    })
    legal = false
  } else {
    seenCanonical.add(canonicalId)
  }

  if (!['location', 'institution', 'artifact', 'procedure'].includes(kind)) {
    issues.push({
      code: 'unknown_kind',
      field: `${field}.kind`,
      ...(canonicalId ? { canonicalId } : {}),
    })
    legal = false
  }

  const aliasesRaw = input.aliases
  const aliases: string[] = []
  if (!Array.isArray(aliasesRaw) || aliasesRaw.length === 0) {
    issues.push({
      code: 'invalid_aliases',
      field: `${field}.aliases`,
      ...(canonicalId ? { canonicalId } : {}),
    })
    legal = false
  } else {
    for (let aIndex = 0; aIndex < aliasesRaw.length; aIndex += 1) {
      const alias = token(aliasesRaw[aIndex])
      if (!ALIAS.test(alias)) {
        issues.push({
          code: 'invalid_alias',
          field: `${field}.aliases[${aIndex}]`,
          ...(canonicalId ? { canonicalId } : {}),
        })
        legal = false
        continue
      }
      const normalized = alias.toLowerCase()
      if (seenAliases.has(normalized)) {
        issues.push({
          code: 'duplicate_alias',
          field: `${field}.aliases[${aIndex}]`,
          ...(canonicalId ? { canonicalId } : {}),
        })
        legal = false
      } else {
        seenAliases.add(normalized)
        aliases.push(alias)
      }
    }
  }

  if (!legal) return null

  return freezeRecord({
    canonicalId,
    aliases,
    kind: kind as LocationAliasRecord['kind'],
  })
}

function parseRegistry(input: unknown): {
  records: LocationAliasRecord[]
  validation: LocationAliasValidationResult
} {
  const records: LocationAliasRecord[] = []
  if (!Array.isArray(input)) {
    return { records, validation: issuesResult([{ code: 'invalid_registry', field: 'records' }]) }
  }

  const issues: LocationAliasValidationIssue[] = []
  const seenCanonical = new Set<string>()
  const seenAliases = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const record = validateRecord(input[index], index, issues, seenCanonical, seenAliases)
    if (!record) continue
    records.push(record)
  }

  return { records, validation: issuesResult(issues) }
}

export function validateLocationAliasRecords(input: unknown): LocationAliasValidationResult {
  return parseRegistry(input).validation
}

export function normalizeLocationAliasRecords(
  input: readonly LocationAliasRecord[]
): readonly LocationAliasRecord[] | null {
  const { validation, records } = parseRegistry(input)
  if (!validation.valid) return null
  const ordered = records.sort((a, b) => compareStrings(a.canonicalId, b.canonicalId))
  return Object.freeze(ordered)
}

export function resolveLocationAlias(
  alias: string,
  records: readonly LocationAliasRecord[]
): string | null {
  const normalized = token(alias).toLowerCase()
  if (!normalized) return null
  for (const record of records) {
    if (record.aliases.some((a) => a.toLowerCase() === normalized)) {
      return record.canonicalId
    }
  }
  return null
}

/** Authored slice-1 fixtures. Not live campaign state. */
export const LOCATION_ALIAS_FIXTURE_RECORDS: readonly LocationAliasRecord[] = Object.freeze([
  Object.freeze({
    canonicalId: 'civic-node-central-station',
    aliases: Object.freeze(['Central Station', 'Old Depot', 'Main Terminal']),
    kind: 'location',
  }),
  Object.freeze({
    canonicalId: 'institution-city-hall',
    aliases: Object.freeze(['City Hall', 'Municipal Building', 'the Hall']),
    kind: 'institution',
  }),
])
