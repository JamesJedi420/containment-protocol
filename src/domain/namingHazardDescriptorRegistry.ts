/**
 * SPE-2116 slice 1: naming-hazard descriptor registry.
 *
 * Pure deterministic registry for locations, entities, and landmarks that
 * cannot be safely named — surrogate descriptors for UI, maps, briefings,
 * and file labels — distinct from procedural naming generation (SPE-76).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type NamingHazardDescriptorId = string

export type ReferenceConstraint =
  | 'no_titles'
  | 'no_designations'
  | 'no_proper_nouns'
  | 'compulsive_phrase_risk'

export const REFERENCE_CONSTRAINTS: readonly ReferenceConstraint[] = [
  'no_titles',
  'no_designations',
  'no_proper_nouns',
  'compulsive_phrase_risk',
] as const

export type UiSubstitutionPolicy =
  | 'pool_descriptor'
  | 'pool_with_grid_fallback'
  | 'grid_ref'
  | 'redacted'

export const UI_SUBSTITUTION_POLICIES: readonly UiSubstitutionPolicy[] = [
  'pool_descriptor',
  'pool_with_grid_fallback',
  'grid_ref',
  'redacted',
] as const

export type MapLabelMode = 'descriptor_only' | 'grid_ref' | 'redacted'

export const MAP_LABEL_MODES: readonly MapLabelMode[] = [
  'descriptor_only',
  'grid_ref',
  'redacted',
] as const

export type SafeLabelSurface = 'dossier' | 'map' | 'briefing' | 'file_label'

export const SAFE_LABEL_SURFACES: readonly SafeLabelSurface[] = [
  'dossier',
  'map',
  'briefing',
  'file_label',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface NamingHazardDescriptorRecord {
  readonly id: NamingHazardDescriptorId
  readonly label: string
  readonly summary?: string
  readonly trueNameForbidden: boolean
  readonly safeDescriptorPool: readonly string[]
  readonly referenceConstraints?: readonly ReferenceConstraint[]
  readonly uiSubstitutionPolicy: UiSubstitutionPolicy
  readonly mapLabelMode: MapLabelMode
  readonly compulsivePhraseWatchlist?: readonly string[]
  readonly briefingTemplateSnippet?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type NamingHazardDescriptorValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'empty_safe_descriptor_pool_when_forbidden'
  | 'empty_safe_descriptor_entry'
  | 'duplicate_safe_descriptor_entry'
  | 'invalid_reference_constraint'
  | 'invalid_ui_substitution_policy'
  | 'invalid_map_label_mode'
  | 'invalid_confidence'
  | 'compulsive_phrase_risk_without_watchlist'
  | 'compulsive_phrase_in_briefing_template'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface NamingHazardDescriptorValidationIssue {
  readonly code: NamingHazardDescriptorValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface NamingHazardDescriptorValidationResult {
  readonly valid: boolean
  readonly issues: readonly NamingHazardDescriptorValidationIssue[]
}

// ---------------------------------------------------------------------------
// Safe label projection
// ---------------------------------------------------------------------------

export interface SafeLabelProjectionContext {
  readonly surface: SafeLabelSurface
  readonly gridRef?: string
  readonly descriptorIndex?: number
  readonly templateText?: string
}

export interface SafeLabelProjection {
  readonly recordId: NamingHazardDescriptorId
  readonly surface: SafeLabelSurface
  readonly safeLabel: string
  readonly usedGridFallback: boolean
  readonly redacted: boolean
  readonly descriptorIndex: number | null
  readonly confidence: number | null
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const REFERENCE_CONSTRAINT_SET = new Set<string>(REFERENCE_CONSTRAINTS)
const UI_SUBSTITUTION_POLICY_SET = new Set<string>(UI_SUBSTITUTION_POLICIES)
const MAP_LABEL_MODE_SET = new Set<string>(MAP_LABEL_MODES)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const REDACTED_LABEL = '[REDACTED]'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function sortedStringArray(value: unknown): readonly string[] {
  return Object.freeze(
    [...asStringArray(value)].sort((left, right) => left.localeCompare(right))
  )
}

function pushIssue(
  issues: NamingHazardDescriptorValidationIssue[],
  issue: NamingHazardDescriptorValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: NamingHazardDescriptorValidationIssue[]) {
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

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function freezeValidationResult(
  issues: NamingHazardDescriptorValidationIssue[]
): NamingHazardDescriptorValidationResult {
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

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function hasReferenceConstraint(
  record: NamingHazardDescriptorRecord,
  constraint: ReferenceConstraint
): boolean {
  return asStringArray(record.referenceConstraints).includes(constraint)
}

function normalizedPool(record: NamingHazardDescriptorRecord): readonly string[] {
  return asStringArray(record.safeDescriptorPool)
    .map((entry) => normalizeToken(entry))
    .filter((entry) => entry.length > 0)
}

function scanForbiddenTokens(
  issues: NamingHazardDescriptorValidationIssue[],
  id: string,
  label: string,
  record: NamingHazardDescriptorRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Naming-hazard descriptor record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Naming-hazard descriptor record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Naming-hazard descriptor record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Naming-hazard descriptor record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'briefingTemplateSnippet', value: record.briefingTemplateSnippet },
  ]

  for (const { field, value } of stringFields) {
    const token = normalizeToken(value ?? '')
    if (!token) {
      continue
    }

    if (containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} field ${field} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const descriptor of normalizedPool(record)) {
    if (containsFranchiseToken(descriptor)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} safeDescriptorPool contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(descriptor)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} safeDescriptorPool contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function scanCompulsivePhraseLint(
  issues: NamingHazardDescriptorValidationIssue[],
  id: string,
  record: NamingHazardDescriptorRecord
) {
  if (!hasReferenceConstraint(record, 'compulsive_phrase_risk')) {
    return
  }

  const watchlist = asStringArray(record.compulsivePhraseWatchlist)
    .map((entry) => normalizeToken(entry))
    .filter((entry) => entry.length > 0)

  if (watchlist.length === 0) {
    pushIssue(issues, {
      code: 'compulsive_phrase_risk_without_watchlist',
      severity: 'warning',
      detail: `Naming-hazard descriptor record ${id || '(unknown)'} declares compulsive_phrase_risk without compulsivePhraseWatchlist entries.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  const template = normalizeToken(record.briefingTemplateSnippet ?? '')
  if (!template) {
    return
  }

  const matchedPhrase = watchlist.find((phrase) =>
    template.toLocaleLowerCase().includes(phrase.toLocaleLowerCase())
  )

  if (matchedPhrase) {
    pushIssue(issues, {
      code: 'compulsive_phrase_in_briefing_template',
      severity: 'warning',
      detail: `Naming-hazard descriptor record ${id || '(unknown)'} briefing template contains watchlisted compulsive phrase "${matchedPhrase}".`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveConfidence(record: NamingHazardDescriptorRecord): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  if (redactedFields.has('confidence')) {
    return null
  }

  return record.confidence ?? null
}

function resolveDescriptorFromPool(
  record: NamingHazardDescriptorRecord,
  descriptorIndex?: number
): { descriptor: string | null; index: number | null } {
  const pool = normalizedPool(record)
  if (pool.length === 0) {
    return { descriptor: null, index: null }
  }

  const index =
    typeof descriptorIndex === 'number' &&
    Number.isInteger(descriptorIndex) &&
    descriptorIndex >= 0 &&
    descriptorIndex < pool.length
      ? descriptorIndex
      : 0

  return { descriptor: pool[index] ?? null, index }
}

function resolveGridRef(context: SafeLabelProjectionContext): string | null {
  const gridRef = normalizeToken(context.gridRef ?? '')
  return gridRef.length > 0 ? gridRef : null
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isReferenceConstraint(value: unknown): value is ReferenceConstraint {
  return typeof value === 'string' && REFERENCE_CONSTRAINT_SET.has(value)
}

export function isUiSubstitutionPolicy(value: unknown): value is UiSubstitutionPolicy {
  return typeof value === 'string' && UI_SUBSTITUTION_POLICY_SET.has(value)
}

export function isMapLabelMode(value: unknown): value is MapLabelMode {
  return typeof value === 'string' && MAP_LABEL_MODE_SET.has(value)
}

export function isSafeLabelSurface(value: unknown): value is SafeLabelSurface {
  return typeof value === 'string' && SAFE_LABEL_SURFACES.includes(value as SafeLabelSurface)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateNamingHazardDescriptorRecord(
  record: NamingHazardDescriptorRecord
): NamingHazardDescriptorValidationResult {
  const issues: NamingHazardDescriptorValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const pool = normalizedPool(record)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Naming-hazard descriptor record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Naming-hazard descriptor record is missing label.',
    })
  }

  if (record.trueNameForbidden && pool.length === 0) {
    pushIssue(issues, {
      code: 'empty_safe_descriptor_pool_when_forbidden',
      severity: 'error',
      detail: `Naming-hazard descriptor record ${id || '(unknown)'} forbids true names but safeDescriptorPool is empty.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const entry of asStringArray(record.safeDescriptorPool)) {
    if (!normalizeToken(entry)) {
      pushIssue(issues, {
        code: 'empty_safe_descriptor_entry',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} safeDescriptorPool contains an empty entry.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  const seenDescriptors = new Set<string>()
  for (const entry of pool) {
    const key = entry.toLocaleLowerCase()
    if (seenDescriptors.has(key)) {
      pushIssue(issues, {
        code: 'duplicate_safe_descriptor_entry',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} safeDescriptorPool contains duplicate descriptor "${entry}".`,
        relatedIds: id ? [id] : undefined,
      })
    }
    seenDescriptors.add(key)
  }

  for (const constraint of asStringArray(record.referenceConstraints)) {
    if (!isReferenceConstraint(constraint)) {
      pushIssue(issues, {
        code: 'invalid_reference_constraint',
        severity: 'error',
        detail: `Naming-hazard descriptor record ${id || '(unknown)'} has invalid reference constraint ${String(constraint)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isUiSubstitutionPolicy(record.uiSubstitutionPolicy)) {
    pushIssue(issues, {
      code: 'invalid_ui_substitution_policy',
      severity: 'error',
      detail: `Naming-hazard descriptor record ${id || '(unknown)'} has invalid uiSubstitutionPolicy ${String(record.uiSubstitutionPolicy)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isMapLabelMode(record.mapLabelMode)) {
    pushIssue(issues, {
      code: 'invalid_map_label_mode',
      severity: 'error',
      detail: `Naming-hazard descriptor record ${id || '(unknown)'} has invalid mapLabelMode ${String(record.mapLabelMode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Naming-hazard descriptor record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)
  scanCompulsivePhraseLint(issues, id, record)

  return freezeValidationResult(issues)
}

/**
 * Projects a safe surrogate label for dossier, map, briefing, or file_label surfaces.
 * Never emits undisclosed true names when trueNameForbidden is set.
 */
export function projectSafeLabel(
  record: NamingHazardDescriptorRecord,
  context: SafeLabelProjectionContext
): SafeLabelProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record)
  const gridRef = resolveGridRef(context)

  if (
    record.uiSubstitutionPolicy === 'redacted' ||
    (context.surface === 'map' && record.mapLabelMode === 'redacted')
  ) {
    return Object.freeze({
      recordId,
      surface: context.surface,
      safeLabel: REDACTED_LABEL,
      usedGridFallback: false,
      redacted: true,
      descriptorIndex: null,
      confidence,
      unknownFields,
    })
  }

  if (context.surface === 'map' && record.mapLabelMode === 'grid_ref') {
    return Object.freeze({
      recordId,
      surface: context.surface,
      safeLabel: gridRef ?? REDACTED_LABEL,
      usedGridFallback: gridRef !== null,
      redacted: gridRef === null,
      descriptorIndex: null,
      confidence,
      unknownFields,
    })
  }

  const { descriptor, index } = resolveDescriptorFromPool(record, context.descriptorIndex)

  if (context.surface === 'map' && record.mapLabelMode === 'descriptor_only') {
    if (descriptor) {
      return Object.freeze({
        recordId,
        surface: context.surface,
        safeLabel: descriptor,
        usedGridFallback: false,
        redacted: false,
        descriptorIndex: index,
        confidence,
        unknownFields,
      })
    }

    if (
      record.uiSubstitutionPolicy === 'pool_with_grid_fallback' &&
      gridRef !== null
    ) {
      return Object.freeze({
        recordId,
        surface: context.surface,
        safeLabel: gridRef,
        usedGridFallback: true,
        redacted: false,
        descriptorIndex: null,
        confidence,
        unknownFields,
      })
    }
  }

  if (record.uiSubstitutionPolicy === 'grid_ref') {
    return Object.freeze({
      recordId,
      surface: context.surface,
      safeLabel: gridRef ?? REDACTED_LABEL,
      usedGridFallback: gridRef !== null,
      redacted: gridRef === null,
      descriptorIndex: null,
      confidence,
      unknownFields,
    })
  }

  if (descriptor) {
    return Object.freeze({
      recordId,
      surface: context.surface,
      safeLabel: descriptor,
      usedGridFallback: false,
      redacted: false,
      descriptorIndex: index,
      confidence,
      unknownFields,
    })
  }

  if (record.uiSubstitutionPolicy === 'pool_with_grid_fallback' && gridRef !== null) {
    return Object.freeze({
      recordId,
      surface: context.surface,
      safeLabel: gridRef,
      usedGridFallback: true,
      redacted: false,
      descriptorIndex: null,
      confidence,
      unknownFields,
    })
  }

  return Object.freeze({
    recordId,
    surface: context.surface,
    safeLabel: record.trueNameForbidden ? REDACTED_LABEL : normalizeToken(record.label) || REDACTED_LABEL,
    usedGridFallback: false,
    redacted: record.trueNameForbidden,
    descriptorIndex: null,
    confidence,
    unknownFields,
  })
}

// ---------------------------------------------------------------------------
// Persistence / hydration (SPE-2116 slice 2)
// ---------------------------------------------------------------------------

export type NamingHazardDescriptorRecordsMap = Record<
  NamingHazardDescriptorId,
  NamingHazardDescriptorRecord
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function parseStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return uniqueSorted(
    value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry)
  )
}

function parseReferenceConstraints(value: unknown): readonly ReferenceConstraint[] {
  if (!Array.isArray(value)) {
    return []
  }

  const constraints: ReferenceConstraint[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== 'string' || !isReferenceConstraint(entry) || seen.has(entry)) {
      continue
    }

    seen.add(entry)
    constraints.push(entry)
  }

  return constraints
}

/** Preserves source order for byte-stable descriptorIndex projection after round-trip. */
function parseSafeDescriptorPool(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const pool: string[] = []

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }

    pool.push(entry)
  }

  return pool
}

function parseCompulsivePhraseWatchlist(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const phrases: string[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }

    const token = normalizeToken(entry)
    if (!token) {
      continue
    }

    const key = token.toLocaleLowerCase()
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    phrases.push(token)
  }

  return phrases
}

function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function sanitizeNamingHazardDescriptorRecordEntry(
  value: unknown
): NamingHazardDescriptorRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const uiSubstitutionPolicy =
    typeof value.uiSubstitutionPolicy === 'string' ? value.uiSubstitutionPolicy : ''
  const mapLabelMode = typeof value.mapLabelMode === 'string' ? value.mapLabelMode : ''
  const safeDescriptorPool = parseSafeDescriptorPool(value.safeDescriptorPool)
  const trueNameForbidden = value.trueNameForbidden === true

  if (
    !id ||
    !label ||
    !isUiSubstitutionPolicy(uiSubstitutionPolicy) ||
    !isMapLabelMode(mapLabelMode)
  ) {
    return null
  }

  const referenceConstraints = parseReferenceConstraints(value.referenceConstraints)
  const compulsivePhraseWatchlist = parseCompulsivePhraseWatchlist(value.compulsivePhraseWatchlist)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const briefingTemplateSnippet =
    typeof value.briefingTemplateSnippet === 'string' &&
    value.briefingTemplateSnippet.trim().length > 0
      ? value.briefingTemplateSnippet.trim()
      : undefined
  const confidence = value.confidence

  const record: NamingHazardDescriptorRecord = {
    id,
    label,
    trueNameForbidden,
    safeDescriptorPool,
    uiSubstitutionPolicy,
    mapLabelMode,
    ...(summary ? { summary } : {}),
    ...(referenceConstraints.length > 0 ? { referenceConstraints } : {}),
    ...(compulsivePhraseWatchlist.length > 0 ? { compulsivePhraseWatchlist } : {}),
    ...(briefingTemplateSnippet ? { briefingTemplateSnippet } : {}),
    ...(isValidConfidence(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateNamingHazardDescriptorRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeNamingHazardDescriptorRecords(
  value: unknown,
  fallback: NamingHazardDescriptorRecordsMap = {}
): NamingHazardDescriptorRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: NamingHazardDescriptorRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeNamingHazardDescriptorRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function defineRecord(record: NamingHazardDescriptorRecord): NamingHazardDescriptorRecord {
  return Object.freeze({ ...record })
}

/** Map surface uses descriptor_only with grid_ref fallback when pool index unavailable. */
export const DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE: NamingHazardDescriptorRecord = defineRecord({
  id: 'naming-hazard:coastal-approach-ward',
  label: 'Coastal approach ward naming hazard',
  summary: 'Landmark cannot be safely named; map uses approved descriptors with grid fallback.',
  trueNameForbidden: true,
  safeDescriptorPool: ['North quarry overlook', 'Grid sector approach lane'],
  referenceConstraints: ['no_proper_nouns', 'no_designations'],
  uiSubstitutionPolicy: 'pool_with_grid_fallback',
  mapLabelMode: 'descriptor_only',
  confidence: 0.84,
})

/** Compulsive phrase risk with briefing template lint. */
export const COMPULSIVE_PHRASE_BRIEFING_FIXTURE: NamingHazardDescriptorRecord = defineRecord({
  id: 'naming-hazard:archive-reading-room',
  label: 'Archive reading room naming hazard',
  summary: 'Briefing templates must avoid compulsive invocation phrases.',
  trueNameForbidden: true,
  safeDescriptorPool: ['Reading room annex B', 'Stack corridor east wing'],
  referenceConstraints: ['no_titles', 'compulsive_phrase_risk'],
  uiSubstitutionPolicy: 'pool_descriptor',
  mapLabelMode: 'descriptor_only',
  compulsivePhraseWatchlist: ['speak the bound name', 'recite the full title'],
  briefingTemplateSnippet:
    'Do not speak the bound name during intake; use approved descriptors only.',
  confidence: 0.79,
})
