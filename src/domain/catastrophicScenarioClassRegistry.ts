/**
 * SPE-2100 slice 1: deterministic catastrophic scenario-class planning taxonomy.
 *
 * This is an evidence/usage registry, not a catalog of objective world states.
 * It does not simulate catastrophes, mutate campaign state, or classify subjects.
 */

export type CatastrophicScenarioClassId = string

export const SCENARIO_AFFECTED_DOMAINS = [
  'behavior',
  'consciousness',
  'reality',
  'physics',
  'ecology',
  'civilization',
  'dominance',
  'public_knowledge',
  'diplomacy',
  'habitability',
  'narrative_structure',
] as const
export type ScenarioAffectedDomain = (typeof SCENARIO_AFFECTED_DOMAINS)[number]

export const SCENARIO_SCOPE_TIERS = ['room', 'site', 'region', 'world', 'cosmological'] as const
export type ScenarioScopeTier = (typeof SCENARIO_SCOPE_TIERS)[number]

export const SCENARIO_RECURRENCE_STRENGTHS = [
  'one_off',
  'repeated',
  'established',
  'prominent',
  'disputed',
] as const
export type ScenarioRecurrenceStrength = (typeof SCENARIO_RECURRENCE_STRENGTHS)[number]

export const SCENARIO_CLASS_STATUSES = [
  'provisional',
  'suspected',
  'operational_shorthand',
  'disputed',
  'obsolete',
] as const
export type ScenarioClassStatus = (typeof SCENARIO_CLASS_STATUSES)[number]

export const SCENARIO_SOURCE_TYPES = ['case', 'design', 'test', 'contradiction_check'] as const
export type ScenarioSourceType = (typeof SCENARIO_SOURCE_TYPES)[number]

export interface CatastrophicScenarioClassEntry {
  readonly id: CatastrophicScenarioClassId
  readonly label: string
  readonly aliases: readonly string[]
  readonly affectedDomains: readonly ScenarioAffectedDomain[]
  readonly scopeTiers: readonly ScenarioScopeTier[]
  readonly recurrenceStrength: ScenarioRecurrenceStrength
  readonly sourceCounts: Readonly<Record<ScenarioSourceType, number>>
  readonly status: ScenarioClassStatus
  readonly inconsistentUseNotes: readonly string[]
  /** True only when source records show that this label has incompatible meanings. */
  readonly overloadedLabel?: boolean
  readonly linkedIncidentIds: readonly string[]
  readonly compoundWithClassIds: readonly CatastrophicScenarioClassId[]
  /** Confidence in the *classification claim*, never a truth flag. */
  readonly confidence?: number
}

export type ScenarioClassValidationSeverity = 'error' | 'warning'

export interface ScenarioClassValidationIssue {
  readonly code: string
  readonly severity: ScenarioClassValidationSeverity
  readonly field: string
}

export interface ScenarioClassValidationResult {
  readonly valid: boolean
  readonly issues: readonly ScenarioClassValidationIssue[]
}

export interface ScenarioClassValidationOptions {
  /** Cosmological scope requires an explicitly enabled campaign mode. */
  readonly allowCosmologicalScope?: boolean
}

export interface ScenarioIncidentEvidence {
  readonly incidentId: string
  readonly affectedDomains: readonly ScenarioAffectedDomain[]
  readonly scopeTier: ScenarioScopeTier
}

export interface ScenarioRefinementCluster {
  readonly affectedDomains: readonly ScenarioAffectedDomain[]
  readonly scopeTier: ScenarioScopeTier
  readonly incidentIds: readonly string[]
}

export interface ScenarioRefinementSuggestion {
  readonly classId: CatastrophicScenarioClassId
  readonly reason: 'repeated_distinct_evidence_clusters'
  readonly clusters: readonly ScenarioRefinementCluster[]
}

const DOMAIN_SET: ReadonlySet<string> = new Set(SCENARIO_AFFECTED_DOMAINS)
const SCOPE_SET: ReadonlySet<string> = new Set(SCENARIO_SCOPE_TIERS)
const RECURRENCE_SET: ReadonlySet<string> = new Set(SCENARIO_RECURRENCE_STRENGTHS)
const STATUS_SET: ReadonlySet<string> = new Set(SCENARIO_CLASS_STATUSES)
const SOURCE_SET: ReadonlySet<string> = new Set(SCENARIO_SOURCE_TYPES)
const GENERIC_EVENT_SUFFIXES = new Set(['breach', 'incident', 'event', 'scenario', 'cascade', 'crisis'])

/** Reject imported franchise K-class codes, including common variant prefixes. */
const IMPORTED_CLASS_CODE = /\b(?:[a-z]{0,2}k[\s_-]*class|scp[\s_-]*\d+|scp)\b/i

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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function issuesResult(issues: ScenarioClassValidationIssue[]): ScenarioClassValidationResult {
  const ordered = issues
    .slice()
    .sort((a, b) => compareStrings(a.code, b.code) || compareStrings(a.field, b.field))
  return Object.freeze({
    valid: !ordered.some((issue) => issue.severity === 'error'),
    issues: Object.freeze(ordered.map((issue) => Object.freeze(issue))),
  })
}

function validateTextList(
  value: unknown,
  field: string,
  issues: ScenarioClassValidationIssue[],
  allowed?: ReadonlySet<string>
): void {
  if (!Array.isArray(value)) {
    issues.push({ code: 'invalid_list', severity: 'error', field })
    return
  }

  const seen = new Set<string>()
  for (const item of value) {
    if (!token(item)) {
      issues.push({ code: 'invalid_list_value', severity: 'error', field })
      continue
    }
    if (allowed && !allowed.has(token(item))) {
      issues.push({ code: 'unknown_list_value', severity: 'error', field })
    }
    if (seen.has(token(item))) {
      issues.push({ code: 'duplicate_list_value', severity: 'warning', field })
    }
    seen.add(token(item))
  }
}

/** The class ID and textual fields are metadata, not verified world facts. */
function validateCoreFields(
  input: Record<string, unknown>,
  issues: ScenarioClassValidationIssue[]
): void {
  if (!token(input.id)) {
    issues.push({ code: 'missing_id', severity: 'error', field: 'id' })
  }
  if (!token(input.label)) {
    issues.push({ code: 'missing_label', severity: 'error', field: 'label' })
  }
  for (const field of ['id', 'label'] as const) {
    if (IMPORTED_CLASS_CODE.test(token(input[field]))) {
      issues.push({ code: 'imported_franchise_class_code', severity: 'error', field })
    }
  }

  validateTextList(input.aliases, 'aliases', issues)
  validateTextList(input.affectedDomains, 'affectedDomains', issues, DOMAIN_SET)
  validateTextList(input.scopeTiers, 'scopeTiers', issues, SCOPE_SET)
  validateTextList(input.inconsistentUseNotes, 'inconsistentUseNotes', issues)
  validateTextList(input.linkedIncidentIds, 'linkedIncidentIds', issues)
  validateTextList(input.compoundWithClassIds, 'compoundWithClassIds', issues)
}

/** Check type, scope and link restrictions without implying runtime eligibility. */
function validateScopeAndReferences(
  input: Record<string, unknown>,
  options: ScenarioClassValidationOptions,
  issues: ScenarioClassValidationIssue[]
): void {
  if (Array.isArray(input.affectedDomains) && input.affectedDomains.length === 0) {
    issues.push({ code: 'empty_affected_domains', severity: 'error', field: 'affectedDomains' })
  }
  if (Array.isArray(input.scopeTiers) && input.scopeTiers.length === 0) {
    issues.push({ code: 'empty_scope_tiers', severity: 'error', field: 'scopeTiers' })
  }
  if (
    Array.isArray(input.scopeTiers) &&
    input.scopeTiers.some((scope) => token(scope) === 'cosmological') &&
    !options.allowCosmologicalScope
  ) {
    issues.push({ code: 'cosmological_scope_requires_mode', severity: 'error', field: 'scopeTiers' })
  }
  if (
    Array.isArray(input.aliases) &&
    input.aliases.some((alias) => IMPORTED_CLASS_CODE.test(token(alias)))
  ) {
    issues.push({ code: 'imported_franchise_class_code', severity: 'error', field: 'aliases' })
  }
  if (
    Array.isArray(input.compoundWithClassIds) &&
    input.compoundWithClassIds.some((id) => token(id) === token(input.id))
  ) {
    issues.push({ code: 'self_compound_class', severity: 'error', field: 'compoundWithClassIds' })
  }
}

/** Schema errors and unsupported-confidence warnings are distinct diagnostics. */
function validateClaimEvidence(
  input: Record<string, unknown>,
  issues: ScenarioClassValidationIssue[]
): void {
  const missingRecurrence = !RECURRENCE_SET.has(token(input.recurrenceStrength))
  if (missingRecurrence) {
    issues.push({ code: 'missing_or_invalid_recurrence', severity: 'error', field: 'recurrenceStrength' })
  }
  if (!STATUS_SET.has(token(input.status))) {
    issues.push({ code: 'missing_or_invalid_status', severity: 'error', field: 'status' })
  }
  if (input.confidence === undefined) return

  if (
    typeof input.confidence !== 'number' ||
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    issues.push({ code: 'invalid_confidence', severity: 'error', field: 'confidence' })
  }
  const sourceCounts = input.sourceCounts
  const emptySourceHistory =
    isPlainRecord(sourceCounts) &&
    SCENARIO_SOURCE_TYPES.every((type) => sourceCounts[type] === 0)
  // SPE-2100 explicitly requires a warning for confidence without recurrence
  // metadata, even when the missing required field also produces an error.
  // Valid recurrence labels also require source evidence to ground confidence.
  if (missingRecurrence || emptySourceHistory) {
    issues.push({ code: 'confidence_without_recurrence', severity: 'warning', field: 'recurrenceStrength' })
  }
}

/** Source counts are evidence about use, not a deterministic crisis rule. */
function validateSourceCounts(
  counts: unknown,
  issues: ScenarioClassValidationIssue[]
): void {
  if (!isPlainRecord(counts)) {
    issues.push({ code: 'missing_source_counts', severity: 'error', field: 'sourceCounts' })
    return
  }
  for (const sourceType of SCENARIO_SOURCE_TYPES) {
    if (!isNonNegativeInteger(counts[sourceType])) {
      issues.push({ code: 'invalid_source_count', severity: 'error', field: `sourceCounts.${sourceType}` })
    }
  }
  for (const field of Object.keys(counts)) {
    if (!SOURCE_SET.has(field)) {
      issues.push({ code: 'unknown_source_type', severity: 'error', field: `sourceCounts.${field}` })
    }
  }
}

/** Explicitly record overloaded labels and reject truth-collapsing shortcuts. */
function validateUseConflicts(
  input: Record<string, unknown>,
  issues: ScenarioClassValidationIssue[]
): void {
  if (input.overloadedLabel !== undefined && typeof input.overloadedLabel !== 'boolean') {
    issues.push({ code: 'invalid_overloaded_label_flag', severity: 'error', field: 'overloadedLabel' })
  }
  if (
    input.overloadedLabel === true &&
    Array.isArray(input.inconsistentUseNotes) &&
    input.inconsistentUseNotes.length === 0
  ) {
    issues.push({ code: 'overloaded_label_without_notes', severity: 'warning', field: 'inconsistentUseNotes' })
  }
  if (
    typeof input.description === 'string' &&
    (!STATUS_SET.has(token(input.status)) || !RECURRENCE_SET.has(token(input.recurrenceStrength)))
  ) {
    issues.push({ code: 'classification_truth_collapse', severity: 'warning', field: 'description' })
  }
}

/** Validate external/editorial data before treating it as a planning class. */
export function validateScenarioClassEntry(
  input: unknown,
  options: ScenarioClassValidationOptions = {}
): ScenarioClassValidationResult {
  if (!isPlainRecord(input)) {
    return issuesResult([{ code: 'invalid_entry', severity: 'error', field: 'entry' }])
  }

  const issues: ScenarioClassValidationIssue[] = []
  validateCoreFields(input, issues)
  validateScopeAndReferences(input, options, issues)
  validateClaimEvidence(input, issues)
  validateSourceCounts(input.sourceCounts, issues)
  validateUseConflicts(input, issues)
  return issuesResult(issues)
}

function labelKey(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

function withoutGenericSuffix(key: string): string {
  const words = key.split(' ')
  while (words.length > 1 && GENERIC_EVENT_SUFFIXES.has(words.at(-1)!)) {
    words.pop()
  }
  return words.join(' ')
}

/**
 * Resolve a CP-native label, field alias, or generic "incident/crisis" variant.
 * Ambiguous aliases fail closed instead of silently choosing the first class.
 */
export function normalizeScenarioLabel(
  raw: string,
  entries: readonly CatastrophicScenarioClassEntry[]
): CatastrophicScenarioClassId | null {
  if (typeof raw !== 'string' || IMPORTED_CLASS_CODE.test(raw)) return null
  const key = labelKey(raw)
  if (!key) return null

  function matchingIds(lookup: string, stripSuffixes: boolean): string[] {
    const matches = new Set<string>()
    for (const entry of entries) {
      if (!token(entry.id) || !STATUS_SET.has(entry.status) || !Array.isArray(entry.aliases)) continue
      for (const label of [entry.id, entry.label, ...entry.aliases]) {
        if (IMPORTED_CLASS_CODE.test(label)) continue
        const candidate = labelKey(label)
        if ((stripSuffixes ? withoutGenericSuffix(candidate) : candidate) === lookup) {
          matches.add(entry.id)
        }
      }
    }
    return [...matches].sort(compareStrings)
  }

  // Exact match first: a class literally named "Perimeter Breach" must not be
  // shadowed by a distinct class named "Perimeter".
  const exact = matchingIds(key, false)
  if (exact.length > 0) return exact.length === 1 ? exact[0]! : null
  const simplified = withoutGenericSuffix(key)
  const variants = matchingIds(simplified, true)
  return variants.length === 1 ? variants[0]! : null
}

/** Add incident references without mutating or rewriting the class definition. */
export function appendScenarioIncidentBackfill(
  entry: CatastrophicScenarioClassEntry,
  incidentIds: readonly string[]
): CatastrophicScenarioClassEntry {
  if (incidentIds.some((id) => !token(id) || token(id) !== id)) {
    throw new Error('incidentIds must contain nonempty references')
  }
  // A no-op must preserve the caller's record, even if legacy history is unsorted.
  const existing = new Set(entry.linkedIncidentIds)
  const additions = incidentIds.filter((id) => !existing.has(id))
  if (additions.length === 0) return entry
  // Once a change is necessary, normalize the full history for byte-stable output.
  const combined = [...new Set([...entry.linkedIncidentIds, ...additions])].sort(compareStrings)
  return {
    ...entry,
    linkedIncidentIds: combined,
  }
}

/**
 * Suggest, but never perform, a refinement when one provisional/shorthand class
 * hides two repeated, distinct evidence clusters. Conflicting duplicate incident
 * identities fail closed; one-off or disputed reports do not trigger a split.
 */
export function suggestRefinement(
  entry: CatastrophicScenarioClassEntry,
  incidentEvidence: readonly ScenarioIncidentEvidence[]
): ScenarioRefinementSuggestion | null {
  if (entry.status !== 'provisional' && entry.status !== 'operational_shorthand') return null
  if (entry.recurrenceStrength === 'one_off' || entry.recurrenceStrength === 'disputed') return null

  const byIncident = new Map<string, string>()
  const clusters = new Map<string, { scopeTier: ScenarioScopeTier; domains: ScenarioAffectedDomain[]; ids: Set<string> }>()
  for (const evidence of incidentEvidence) {
    if (!token(evidence.incidentId) || !SCOPE_SET.has(evidence.scopeTier) ||
        !Array.isArray(evidence.affectedDomains) || evidence.affectedDomains.length === 0 ||
        evidence.affectedDomains.some((domain) => !DOMAIN_SET.has(domain))) return null
    const domains = [...new Set(evidence.affectedDomains)].sort(compareStrings)
    const key = `${evidence.scopeTier}|${domains.join(',')}`
    const previous = byIncident.get(evidence.incidentId)
    if (previous && previous !== key) return null
    byIncident.set(evidence.incidentId, key)
    const bucket = clusters.get(key) ?? { scopeTier: evidence.scopeTier, domains, ids: new Set<string>() }
    bucket.ids.add(evidence.incidentId)
    clusters.set(key, bucket)
  }

  const repeated = [...clusters.entries()]
    .filter(([, bucket]) => bucket.ids.size >= 2)
    .sort(([left], [right]) => compareStrings(left, right))
  if (repeated.length < 2) return null
  return {
    classId: entry.id,
    reason: 'repeated_distinct_evidence_clusters',
    clusters: repeated.map(([, bucket]) => ({
      scopeTier: bucket.scopeTier,
      affectedDomains: bucket.domains,
      incidentIds: [...bucket.ids].sort(compareStrings),
    })),
  }
}
