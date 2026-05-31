/**
 * SPE-2110 slice 1: pattern source series intake registry.
 *
 * Pure deterministic registry for agent routing over external pattern-source clusters —
 * series hubs, canon indexes, and related intake shapes — distinct from in-world evidence,
 * location/event logs, and player-facing canon.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PatternSourceSeriesId = string

export type SourceFamily =
  | 'series_hub'
  | 'canon_hub'
  | 'single_article'
  | 'organization_format'
  | 'location_log'
  | 'event_log'
  | 'item_log'
  | 'tale'
  | 'anthology'
  | 'meta_hub'

export const SOURCE_FAMILIES: readonly SourceFamily[] = [
  'series_hub',
  'canon_hub',
  'single_article',
  'organization_format',
  'location_log',
  'event_log',
  'item_log',
  'tale',
  'anthology',
  'meta_hub',
] as const

export type EditorialStatus =
  | 'featured'
  | 'spotlight'
  | 'open_entry'
  | 'completed'
  | 'active'
  | 'abandoned'
  | 'high_signal'
  | 'low_confidence'

export const EDITORIAL_STATUSES: readonly EditorialStatus[] = [
  'featured',
  'spotlight',
  'open_entry',
  'completed',
  'active',
  'abandoned',
  'high_signal',
  'low_confidence',
] as const

export type ProcessingStatus =
  | 'unqueued'
  | 'blurb_triaged'
  | 'deep_pass'
  | 'reconciled'
  | 'deferred'
  | 'rejected'

export const PROCESSING_STATUSES: readonly ProcessingStatus[] = [
  'unqueued',
  'blurb_triaged',
  'deep_pass',
  'reconciled',
  'deferred',
  'rejected',
] as const

export type BlurbDomainHint =
  | 'facility'
  | 'faction'
  | 'disclosure'
  | 'object'
  | 'media'
  | 'personnel'
  | 'ecology'
  | 'disaster'
  | 'occult'
  | 'ethics'

export const BLURB_DOMAIN_HINTS: readonly BlurbDomainHint[] = [
  'facility',
  'faction',
  'disclosure',
  'object',
  'media',
  'personnel',
  'ecology',
  'disaster',
  'occult',
  'ethics',
] as const

export type SourceNormalizationState =
  | 'pattern_library'
  | 'provisional'
  | 'implementation_ready'

export const SOURCE_NORMALIZATION_STATES: readonly SourceNormalizationState[] = [
  'pattern_library',
  'provisional',
  'implementation_ready',
] as const

export type ExpressionRiskFlag =
  | 'distinctive_prose'
  | 'source_specific_naming'
  | 'plot_sequence'
  | 'character_identity'
  | 'branded_label'
  | 'named_organization'
  | 'problematic_framing'
  | 'institutional_bias'
  | 'witness_unreliability'
  | 'authority_abuse'
  | 'community_harm'
  | 'exposure_risk'
  | 'coercion'
  | 'misinformation'

export const EXPRESSION_RISK_FLAGS: readonly ExpressionRiskFlag[] = [
  'distinctive_prose',
  'source_specific_naming',
  'plot_sequence',
  'character_identity',
  'branded_label',
  'named_organization',
  'problematic_framing',
  'institutional_bias',
  'witness_unreliability',
  'authority_abuse',
  'community_harm',
  'exposure_risk',
  'coercion',
  'misinformation',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface SourceAdaptationMetadata {
  readonly normalizationState?: SourceNormalizationState
  readonly expressionRiskFlags?: readonly ExpressionRiskFlag[]
  readonly normalizationNote?: string
}

export interface PatternSourceBlurbStub {
  readonly title?: string
  readonly descriptionStub?: string
  readonly dedicatedTag?: string
}

export interface PatternSourceSeriesRecord {
  readonly id: PatternSourceSeriesId
  readonly slug: string
  readonly title: string
  readonly descriptionStub?: string
  readonly sourceFamily: SourceFamily
  /** External publication date only (YYYY-MM-DD). Queue tie-breaker, not primary rank. */
  readonly publicationOrder: string
  readonly editorialStatus?: readonly EditorialStatus[]
  readonly dedicatedTag?: string
  readonly processingStatus: ProcessingStatus
  readonly processingHistory?: readonly ProcessingStatus[]
  readonly readinessScore: number
  readonly blurbDomainHints?: readonly BlurbDomainHint[]
  readonly linkedClusterIds?: readonly string[]
  readonly crossClusterReinforcementRef?: string
  readonly adaptation?: SourceAdaptationMetadata
  /** When true, warns that implementation priority follows publication date instead of readiness. */
  readonly implementationPriorityByPublicationOrder?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PatternSourceSeriesValidationCode =
  | 'missing_id'
  | 'missing_slug'
  | 'missing_title'
  | 'invalid_source_family'
  | 'invalid_publication_order'
  | 'invalid_editorial_status'
  | 'invalid_processing_status'
  | 'invalid_processing_history_status'
  | 'invalid_readiness_score'
  | 'invalid_confidence'
  | 'invalid_blurb_domain_hint'
  | 'invalid_normalization_state'
  | 'invalid_expression_risk_flag'
  | 'empty_linked_cluster_id'
  | 'canon_hub_on_series_archive_intake'
  | 'deep_pass_without_blurb_triaged'
  | 'publication_order_priority_misuse'
  | 'expression_risk_without_normalization_note'
  | 'implementation_ready_with_unresolved_expression_risk'
  | 'open_entry_without_low_confidence_guard'
  | 'anthology_without_low_confidence_guard'
  | 'franchise_token_in_id'
  | 'franchise_token_in_title'
  | 'franchise_token_in_field'
  | 'branded_label_token_in_cp_field'
  | 'imported_organization_name_in_cp_field'
  | 'imported_character_identity_in_cp_field'
  | 'imported_plot_or_setting_in_cp_field'

export interface PatternSourceSeriesValidationIssue {
  readonly code: PatternSourceSeriesValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PatternSourceSeriesValidationResult {
  readonly valid: boolean
  readonly issues: readonly PatternSourceSeriesValidationIssue[]
}

// ---------------------------------------------------------------------------
// Queue projection
// ---------------------------------------------------------------------------

export interface SeriesProcessingQueuePolicy {
  readonly minimumReadinessScore?: number
  readonly cpUtilityBoostBySourceFamily?: Partial<Record<SourceFamily, number>>
  readonly excludeProcessingStatuses?: readonly ProcessingStatus[]
}

export interface SeriesProcessingQueueEntry {
  readonly recordId: PatternSourceSeriesId
  readonly rank: number
  readonly readinessScore: number
  readonly cpUtilityScore: number
  readonly publicationOrder: string
  readonly processingStatus: ProcessingStatus
  readonly sourceFamily: SourceFamily
}

export interface SeriesProcessingQueueProjection {
  readonly entries: readonly SeriesProcessingQueueEntry[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const SOURCE_FAMILY_SET = new Set<string>(SOURCE_FAMILIES)
const EDITORIAL_STATUS_SET = new Set<string>(EDITORIAL_STATUSES)
const PROCESSING_STATUS_SET = new Set<string>(PROCESSING_STATUSES)
const BLURB_DOMAIN_HINT_SET = new Set<string>(BLURB_DOMAIN_HINTS)
const SOURCE_NORMALIZATION_STATE_SET = new Set<string>(SOURCE_NORMALIZATION_STATES)
const EXPRESSION_RISK_FLAG_SET = new Set<string>(EXPRESSION_RISK_FLAGS)

const OPEN_ENTRY_SOURCE_FAMILIES = new Set<SourceFamily>(['series_hub', 'anthology'])

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

export const BRANDED_LABEL_PATTERN =
  /\b(scp-\d{3,4}|object class:\s*(safe|euclid|keter|thaumiel|apollyon)|site-\d{2,4})\b/i

export const IMPORTED_ORGANIZATION_NAME_PATTERN =
  /\b(global occult coalition|serpent'?s hand|marshall,? carter(?: and dark)?|alexander protocol|are we cool yet)\b/i

export const IMPORTED_CHARACTER_IDENTITY_PATTERN =
  /\b(?:dr\.|agent|researcher|operative)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/i

export const IMPORTED_PLOT_OR_SETTING_PATTERN =
  /\b(?:chapter\s+\d+|act\s+(?:i{1,3}|iv|v)|season\s+\d+\s+finale|episode\s+\d+\s+arc)\b/i

const BLURB_DOMAIN_KEYWORDS: Readonly<Record<BlurbDomainHint, readonly RegExp[]>> = {
  facility: [/\b(facility|site|vault|containment wing|building|sector)\b/i],
  faction: [/\b(faction|cell|organization|bureau|agency|trust|syndicate)\b/i],
  disclosure: [/\b(disclosure|leak|public awareness|secrecy|cover story|masquerade)\b/i],
  object: [/\b(object|artifact|item|anomaly|device|specimen)\b/i],
  media: [/\b(media|broadcast|recording|transmission|press|documentary)\b/i],
  personnel: [/\b(personnel|staff|operator|responder|team|roster)\b/i],
  ecology: [/\b(ecology|habitat|wildlife|environment|biosphere|predator)\b/i],
  disaster: [/\b(disaster|catastrophe|collapse|breach|containment failure|casualty)\b/i],
  occult: [/\b(occult|ritual|sigil|esoteric|paranormal|supernatural)\b/i],
  ethics: [/\b(ethics|consent|welfare|abuse|coercion|rights|dignity)\b/i],
}

const DEFAULT_CP_UTILITY_BOOST: Readonly<Partial<Record<SourceFamily, number>>> = {
  series_hub: 0.08,
  meta_hub: 0.06,
}

const HIGH_SIGNAL_EDITORIAL_BOOST = 0.05

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

function asEditorialStatus(value: unknown): readonly EditorialStatus[] {
  return Array.isArray(value) ? value : []
}

function asProcessingHistory(value: unknown): readonly ProcessingStatus[] {
  return Array.isArray(value) ? value : []
}

function asBlurbDomainHints(value: unknown): readonly BlurbDomainHint[] {
  return Array.isArray(value) ? value : []
}

function asExpressionRiskFlags(value: unknown): readonly ExpressionRiskFlag[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: PatternSourceSeriesValidationIssue[],
  issue: PatternSourceSeriesValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PatternSourceSeriesValidationIssue[]) {
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
  issues: PatternSourceSeriesValidationIssue[]
): PatternSourceSeriesValidationResult {
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

function containsBrandedLabelToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_LABEL_PATTERN.test(token)
}

function containsImportedOrganizationName(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && IMPORTED_ORGANIZATION_NAME_PATTERN.test(token)
}

function containsImportedCharacterIdentity(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && IMPORTED_CHARACTER_IDENTITY_PATTERN.test(token)
}

function containsImportedPlotOrSetting(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && IMPORTED_PLOT_OR_SETTING_PATTERN.test(token)
}

function isValidPublicationOrder(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function historyIncludesBlurbTriaged(record: PatternSourceSeriesRecord): boolean {
  if (record.processingStatus === 'blurb_triaged') {
    return true
  }

  for (const status of asProcessingHistory(record.processingHistory)) {
    if (status === 'blurb_triaged') {
      return true
    }
  }

  return false
}

function scanCpNeutralStringField(
  issues: PatternSourceSeriesValidationIssue[],
  id: string,
  field: string,
  value: string | undefined,
  franchiseCode: PatternSourceSeriesValidationCode = 'franchise_token_in_field'
) {
  const token = normalizeToken(value ?? '')
  if (!token) {
    return
  }

  if (containsFranchiseToken(token)) {
    pushIssue(issues, {
      code: franchiseCode,
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedLabelToken(token)) {
    pushIssue(issues, {
      code: 'branded_label_token_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field ${field} contains a branded label token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsImportedOrganizationName(token)) {
    pushIssue(issues, {
      code: 'imported_organization_name_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field ${field} contains an imported organization name.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsImportedCharacterIdentity(token)) {
    pushIssue(issues, {
      code: 'imported_character_identity_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field ${field} contains a source-specific character identity.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsImportedPlotOrSetting(token)) {
    pushIssue(issues, {
      code: 'imported_plot_or_setting_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field ${field} contains imported plot or setting sequence markers.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanCpNeutralTitleField(
  issues: PatternSourceSeriesValidationIssue[],
  id: string,
  title: string
) {
  const token = normalizeToken(title)
  if (!token) {
    return
  }

  if (containsBrandedLabelToken(token)) {
    pushIssue(issues, {
      code: 'branded_label_token_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field title contains a branded label token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsImportedOrganizationName(token)) {
    pushIssue(issues, {
      code: 'imported_organization_name_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field title contains an imported organization name.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsImportedCharacterIdentity(token)) {
    pushIssue(issues, {
      code: 'imported_character_identity_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field title contains a source-specific character identity.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsImportedPlotOrSetting(token)) {
    pushIssue(issues, {
      code: 'imported_plot_or_setting_in_cp_field',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} field title contains imported plot or setting sequence markers.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolvePublicationOrderTieBreaker(value: unknown): string {
  return normalizeToken(value) || '0000-00-00'
}

function resolveCpUtilityBoost(
  record: PatternSourceSeriesRecord,
  policy: SeriesProcessingQueuePolicy
): number {
  const familyBoost = policy.cpUtilityBoostBySourceFamily?.[record.sourceFamily] ?? 0
  const defaultBoost = DEFAULT_CP_UTILITY_BOOST[record.sourceFamily] ?? 0
  const editorial = new Set(asEditorialStatus(record.editorialStatus))
  const editorialBoost = editorial.has('high_signal') ? HIGH_SIGNAL_EDITORIAL_BOOST : 0

  return familyBoost + defaultBoost + editorialBoost
}

function defineRecord(record: PatternSourceSeriesRecord): PatternSourceSeriesRecord {
  return Object.freeze({ ...record })
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isSourceFamily(value: string): value is SourceFamily {
  return SOURCE_FAMILY_SET.has(value)
}

export function isEditorialStatus(value: string): value is EditorialStatus {
  return EDITORIAL_STATUS_SET.has(value)
}

export function isProcessingStatus(value: string): value is ProcessingStatus {
  return PROCESSING_STATUS_SET.has(value)
}

export function isBlurbDomainHint(value: string): value is BlurbDomainHint {
  return BLURB_DOMAIN_HINT_SET.has(value)
}

export function isSourceNormalizationState(value: string): value is SourceNormalizationState {
  return SOURCE_NORMALIZATION_STATE_SET.has(value)
}

export function isExpressionRiskFlag(value: string): value is ExpressionRiskFlag {
  return EXPRESSION_RISK_FLAG_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function classifyBlurbDomains(blurbStub: PatternSourceBlurbStub): readonly BlurbDomainHint[] {
  if (!blurbStub || typeof blurbStub !== 'object') {
    return Object.freeze([])
  }

  const corpus = [
    normalizeToken(blurbStub.title),
    normalizeToken(blurbStub.descriptionStub),
    normalizeToken(blurbStub.dedicatedTag),
  ]
    .filter(Boolean)
    .join(' ')

  if (!corpus) {
    return Object.freeze([])
  }

  const hints = BLURB_DOMAIN_HINTS.filter((hint) =>
    BLURB_DOMAIN_KEYWORDS[hint].some((pattern) => pattern.test(corpus))
  ).sort((left, right) => left.localeCompare(right))

  return Object.freeze([...hints])
}

export function validatePatternSourceSeriesRecord(
  record: PatternSourceSeriesRecord
): PatternSourceSeriesValidationResult {
  if (!record || typeof record !== 'object') {
    return freezeValidationResult([
      {
        code: 'missing_id',
        severity: 'error',
        detail: 'Pattern source series record is missing id.',
      },
      {
        code: 'missing_slug',
        severity: 'error',
        detail: 'Pattern source series record is missing slug.',
      },
      {
        code: 'missing_title',
        severity: 'error',
        detail: 'Pattern source series record is missing title.',
      },
      {
        code: 'invalid_source_family',
        severity: 'error',
        detail: 'Pattern source series record (unknown) has invalid sourceFamily undefined.',
      },
      {
        code: 'invalid_publication_order',
        severity: 'error',
        detail: 'Pattern source series record (unknown) publicationOrder must be a valid YYYY-MM-DD date.',
      },
      {
        code: 'invalid_processing_status',
        severity: 'error',
        detail: 'Pattern source series record (unknown) has invalid processingStatus undefined.',
      },
      {
        code: 'invalid_readiness_score',
        severity: 'error',
        detail: 'Pattern source series record (unknown) readinessScore must be a finite number between 0 and 1.',
      },
    ])
  }

  const issues: PatternSourceSeriesValidationIssue[] = []
  const id = normalizeToken(record.id)
  const slug = normalizeToken(record.slug)
  const title = normalizeToken(record.title)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Pattern source series record is missing id.',
    })
  }

  if (!slug) {
    pushIssue(issues, {
      code: 'missing_slug',
      severity: 'error',
      detail: 'Pattern source series record is missing slug.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!title) {
    pushIssue(issues, {
      code: 'missing_title',
      severity: 'error',
      detail: 'Pattern source series record is missing title.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Pattern source series record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(title)) {
    pushIssue(issues, {
      code: 'franchise_token_in_title',
      severity: 'error',
      detail: `Pattern source series record title ${title || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanCpNeutralStringField(issues, id, 'slug', slug)
  scanCpNeutralTitleField(issues, id, title)
  scanCpNeutralStringField(issues, id, 'descriptionStub', record.descriptionStub)
  scanCpNeutralStringField(issues, id, 'dedicatedTag', record.dedicatedTag)
  scanCpNeutralStringField(issues, id, 'crossClusterReinforcementRef', record.crossClusterReinforcementRef)

  if (!isSourceFamily(record.sourceFamily)) {
    pushIssue(issues, {
      code: 'invalid_source_family',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} has invalid sourceFamily ${String(record.sourceFamily)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const publicationOrder = normalizeToken(record.publicationOrder)
  if (!isValidPublicationOrder(publicationOrder)) {
    pushIssue(issues, {
      code: 'invalid_publication_order',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} publicationOrder must be a valid YYYY-MM-DD date.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const status of asEditorialStatus(record.editorialStatus)) {
    if (!isEditorialStatus(status)) {
      pushIssue(issues, {
        code: 'invalid_editorial_status',
        severity: 'error',
        detail: `Pattern source series record ${id || '(unknown)'} has invalid editorialStatus ${String(status)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isProcessingStatus(record.processingStatus)) {
    pushIssue(issues, {
      code: 'invalid_processing_status',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} has invalid processingStatus ${String(record.processingStatus)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const status of asProcessingHistory(record.processingHistory)) {
    if (!isProcessingStatus(status)) {
      pushIssue(issues, {
        code: 'invalid_processing_history_status',
        severity: 'error',
        detail: `Pattern source series record ${id || '(unknown)'} processingHistory contains invalid status ${String(status)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isValidUnitScore(record.readinessScore)) {
    pushIssue(issues, {
      code: 'invalid_readiness_score',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} readinessScore must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const hint of asBlurbDomainHints(record.blurbDomainHints)) {
    if (!isBlurbDomainHint(hint)) {
      pushIssue(issues, {
        code: 'invalid_blurb_domain_hint',
        severity: 'error',
        detail: `Pattern source series record ${id || '(unknown)'} has invalid blurbDomainHint ${String(hint)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const clusterId of asStringArray(record.linkedClusterIds)) {
    if (!normalizeToken(clusterId)) {
      pushIssue(issues, {
        code: 'empty_linked_cluster_id',
        severity: 'error',
        detail: `Pattern source series record ${id || '(unknown)'} linkedClusterIds contains empty id.`,
        relatedIds: id ? [id] : undefined,
      })
    } else {
      scanCpNeutralStringField(issues, id, 'linkedClusterIds', clusterId)
    }
  }

  const adaptation = record.adaptation
  if (adaptation && typeof adaptation === 'object') {
    if (
      adaptation.normalizationState !== undefined &&
      !isSourceNormalizationState(adaptation.normalizationState)
    ) {
      pushIssue(issues, {
        code: 'invalid_normalization_state',
        severity: 'error',
        detail: `Pattern source series record ${id || '(unknown)'} has invalid normalizationState ${String(adaptation.normalizationState)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    for (const flag of asExpressionRiskFlags(adaptation.expressionRiskFlags)) {
      if (!isExpressionRiskFlag(flag)) {
        pushIssue(issues, {
          code: 'invalid_expression_risk_flag',
          severity: 'error',
          detail: `Pattern source series record ${id || '(unknown)'} has invalid expressionRiskFlag ${String(flag)}.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }

    scanCpNeutralStringField(issues, id, 'adaptation.normalizationNote', adaptation.normalizationNote)
  }

  if (isSourceFamily(record.sourceFamily) && record.sourceFamily === 'canon_hub') {
    pushIssue(issues, {
      code: 'canon_hub_on_series_archive_intake',
      severity: 'warning',
      detail: `Pattern source series record ${id || '(unknown)'} uses canon_hub on series archive intake.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.processingStatus === 'deep_pass' && !historyIncludesBlurbTriaged(record)) {
    pushIssue(issues, {
      code: 'deep_pass_without_blurb_triaged',
      severity: 'warning',
      detail: `Pattern source series record ${id || '(unknown)'} is deep_pass without prior blurb_triaged.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.implementationPriorityByPublicationOrder === true) {
    pushIssue(issues, {
      code: 'publication_order_priority_misuse',
      severity: 'warning',
      detail: `Pattern source series record ${id || '(unknown)'} marks publication date as implementation priority instead of readiness.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const expressionRiskFlags = asExpressionRiskFlags(adaptation?.expressionRiskFlags)
  const normalizationNote = normalizeToken(adaptation?.normalizationNote ?? '')

  if (expressionRiskFlags.length > 0 && !normalizationNote) {
    pushIssue(issues, {
      code: 'expression_risk_without_normalization_note',
      severity: 'warning',
      detail: `Pattern source series record ${id || '(unknown)'} declares expressionRiskFlags without normalizationNote.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    adaptation?.normalizationState === 'implementation_ready' &&
    expressionRiskFlags.length > 0 &&
    !normalizationNote
  ) {
    pushIssue(issues, {
      code: 'implementation_ready_with_unresolved_expression_risk',
      severity: 'error',
      detail: `Pattern source series record ${id || '(unknown)'} cannot be implementation_ready while expression risks lack normalizationNote.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const editorialSet = new Set(asEditorialStatus(record.editorialStatus))
  if (
    isSourceFamily(record.sourceFamily) &&
    OPEN_ENTRY_SOURCE_FAMILIES.has(record.sourceFamily) &&
    editorialSet.has('open_entry') &&
    !editorialSet.has('completed') &&
    !editorialSet.has('low_confidence')
  ) {
    pushIssue(issues, {
      code: 'open_entry_without_low_confidence_guard',
      severity: 'warning',
      detail: `Pattern source series record ${id || '(unknown)'} open_entry series lacks low_confidence editorial guard.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    isSourceFamily(record.sourceFamily) &&
    record.sourceFamily === 'anthology' &&
    !editorialSet.has('low_confidence')
  ) {
    pushIssue(issues, {
      code: 'anthology_without_low_confidence_guard',
      severity: 'warning',
      detail: `Pattern source series record ${id || '(unknown)'} anthology intake lacks low_confidence editorial guard.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Ranks intake records by readinessScore and CP utility — not publication recency.
 * publicationOrder is a deterministic tie-breaker only.
 */
export function projectSeriesProcessingQueue(
  records: readonly PatternSourceSeriesRecord[],
  policy: SeriesProcessingQueuePolicy = {}
): SeriesProcessingQueueProjection {
  const excluded = new Set(policy.excludeProcessingStatuses ?? [])
  const minimumReadiness = policy.minimumReadinessScore ?? 0

  const ranked = records
    .filter((record) => record && typeof record === 'object')
    .filter((record) => isProcessingStatus(record.processingStatus))
    .filter((record) => !excluded.has(record.processingStatus))
    .filter((record) => isValidUnitScore(record.readinessScore))
    .filter((record) => record.readinessScore >= minimumReadiness)
    .map((record) => {
      const cpUtilityScore = resolveCpUtilityBoost(record, policy)
      const compositeScore = record.readinessScore + cpUtilityScore

      return Object.freeze({
        record,
        compositeScore,
        cpUtilityScore,
      })
    })
    .sort((left, right) => {
      const scoreCompare = right.compositeScore - left.compositeScore
      if (scoreCompare !== 0) {
        return scoreCompare
      }

      const readinessCompare = right.record.readinessScore - left.record.readinessScore
      if (readinessCompare !== 0) {
        return readinessCompare
      }

      return resolvePublicationOrderTieBreaker(left.record.publicationOrder).localeCompare(
        resolvePublicationOrderTieBreaker(right.record.publicationOrder)
      )
    })
    .map((entry, index) =>
      Object.freeze({
        recordId: normalizeToken(entry.record.id) || '(unknown)',
        rank: index + 1,
        readinessScore: entry.record.readinessScore,
        cpUtilityScore: entry.cpUtilityScore,
        publicationOrder: entry.record.publicationOrder,
        processingStatus: entry.record.processingStatus,
        sourceFamily: entry.record.sourceFamily,
      })
    )

  return Object.freeze({
    entries: Object.freeze(ranked),
  })
}

/** series_hub with open_entry + completed editorial metadata coexisting. */
export const SERIES_HUB_OPEN_ENTRY_FIXTURE: PatternSourceSeriesRecord = defineRecord({
  id: 'pattern-series:facility-crisis-hub',
  slug: 'facility-crisis-hub',
  title: 'Facility crisis response pattern cluster',
  descriptionStub: 'Multi-entry hub for triage, escalation, and responder coordination patterns.',
  sourceFamily: 'series_hub',
  publicationOrder: '2019-03-14',
  editorialStatus: ['open_entry', 'completed', 'high_signal'],
  dedicatedTag: 'facility-crisis',
  processingStatus: 'reconciled',
  processingHistory: ['unqueued', 'blurb_triaged', 'deep_pass', 'reconciled'],
  readinessScore: 0.82,
  blurbDomainHints: ['facility', 'disaster', 'personnel'],
  linkedClusterIds: ['cluster:responder-exertion-71', 'cluster:mission-hub-96'],
  crossClusterReinforcementRef: 'reinforcement:crisis-triage-fold-in-batch-55',
  adaptation: {
    normalizationState: 'pattern_library',
  },
  confidence: 0.71,
})

/** Expression-risk record that stays provisional until normalization note exists. */
export const EXPRESSION_RISK_PROVISIONAL_FIXTURE: PatternSourceSeriesRecord = defineRecord({
  id: 'pattern-series:occult-investigation-blurb',
  slug: 'occult-investigation-blurb',
  title: 'Occult investigation transcript cluster',
  descriptionStub: 'Blurb-only intake pending CP-safe operational translation.',
  sourceFamily: 'anthology',
  publicationOrder: '2024-06-01',
  editorialStatus: ['low_confidence', 'active'],
  processingStatus: 'blurb_triaged',
  readinessScore: 0.34,
  adaptation: {
    normalizationState: 'provisional',
    expressionRiskFlags: ['distinctive_prose', 'problematic_framing', 'witness_unreliability'],
  },
  confidence: 0.29,
})

/** High readiness older series for queue ranking fixture. */
export const HIGH_READINESS_QUEUE_FIXTURE: PatternSourceSeriesRecord = defineRecord({
  id: 'pattern-series:urban-concealment-hub',
  slug: 'urban-concealment-hub',
  title: 'Urban concealment investigation hub',
  sourceFamily: 'series_hub',
  publicationOrder: '2018-01-10',
  editorialStatus: ['high_signal'],
  processingStatus: 'deep_pass',
  processingHistory: ['unqueued', 'blurb_triaged'],
  readinessScore: 0.91,
})

/** Lower readiness but newer publication date — should rank below HIGH_READINESS_QUEUE_FIXTURE. */
export const LOW_READINESS_RECENT_QUEUE_FIXTURE: PatternSourceSeriesRecord = defineRecord({
  id: 'pattern-series:episodic-incident-metadata',
  slug: 'episodic-incident-metadata',
  title: 'Episodic quick incident metadata packet',
  sourceFamily: 'meta_hub',
  publicationOrder: '2026-01-15',
  editorialStatus: ['low_confidence'],
  processingStatus: 'blurb_triaged',
  readinessScore: 0.38,
})
