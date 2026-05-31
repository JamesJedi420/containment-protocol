/**
 * SPE-2109 slice 1: public disclosure state registry.
 *
 * Pure deterministic registry for post-secrecy and partial-disclosure campaign layers —
 * awareness levels, fallout timeline, regional trust, and normalization inputs — distinct
 * from pre-disclosure secrecy maintenance (SPE-1346) and truth-layer records.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PublicDisclosureStateId = string

export type AwarenessLevel =
  | 'secrecy_intact'
  | 'local_rumor'
  | 'credible_leak'
  | 'public_scandal'
  | 'official_disclosure'
  | 'normalization'

export const AWARENESS_LEVELS: readonly AwarenessLevel[] = [
  'secrecy_intact',
  'local_rumor',
  'credible_leak',
  'public_scandal',
  'official_disclosure',
  'normalization',
] as const

export type FalloutPhase =
  | 'crisis'
  | 'leak'
  | 'disclosure'
  | 'reform'
  | 'commerce'
  | 'media_saturation'
  | 'normalization'

export const FALLOUT_PHASES: readonly FalloutPhase[] = [
  'crisis',
  'leak',
  'disclosure',
  'reform',
  'commerce',
  'media_saturation',
  'normalization',
] as const

export type CampaignObjectivePivot =
  | 'secrecy'
  | 'harm_reduction'
  | 'legitimacy'
  | 'adaptation'

export const CAMPAIGN_OBJECTIVE_PIVOTS: readonly CampaignObjectivePivot[] = [
  'secrecy',
  'harm_reduction',
  'legitimacy',
  'adaptation',
] as const

export type NormalizationInputKind =
  | 'anomaly_tourism'
  | 'public_managed_former_site'
  | 'public_anomalous_service'
  | 'cleanup_front'
  | 'product_line'
  | 'community_integration_program'
  | 'mass_anomalous_population_emergence'

export const NORMALIZATION_INPUT_KINDS: readonly NormalizationInputKind[] = [
  'anomaly_tourism',
  'public_managed_former_site',
  'public_anomalous_service',
  'cleanup_front',
  'product_line',
  'community_integration_program',
  'mass_anomalous_population_emergence',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface RegionalTrustScore {
  readonly regionRef: string
  readonly trustScore: number
}

export interface PublicDisclosureTransitionHistoryEntry {
  readonly fromAwarenessLevel: AwarenessLevel
  readonly toAwarenessLevel: AwarenessLevel
  readonly week: number
  readonly note?: string
  readonly falloutPhase?: FalloutPhase
}

export interface NormalizationInput {
  readonly kind: NormalizationInputKind
  readonly descriptor: string
  readonly ref?: string
}

export interface LinkedContractOutcomeHook {
  readonly contractRef: string
  readonly operationalSuccess?: boolean
  readonly secrecyFailure?: boolean
}

export interface PublicDisclosureRecord {
  readonly id: PublicDisclosureStateId
  readonly label: string
  readonly summary?: string
  readonly awarenessLevel: AwarenessLevel
  readonly falloutPhase: FalloutPhase
  readonly trustByRegion?: readonly RegionalTrustScore[]
  readonly oversightPressure?: number
  readonly coverCapacityFailure?: boolean
  readonly coverCapacityFailureJustificationRef?: string
  readonly campaignObjectivePivot?: CampaignObjectivePivot
  readonly transitionHistory?: readonly PublicDisclosureTransitionHistoryEntry[]
  readonly normalizationInputs?: readonly NormalizationInput[]
  readonly linkedContractOutcomes?: readonly LinkedContractOutcomeHook[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PublicDisclosureValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_awareness_level'
  | 'invalid_fallout_phase'
  | 'invalid_campaign_objective_pivot'
  | 'invalid_regional_trust_score'
  | 'empty_region_ref'
  | 'invalid_oversight_pressure'
  | 'invalid_confidence'
  | 'invalid_transition_history_entry'
  | 'invalid_transition_history_week'
  | 'invalid_normalization_input_kind'
  | 'empty_normalization_input_descriptor'
  | 'empty_linked_contract_ref'
  | 'official_disclosure_without_prior_leak_or_scandal'
  | 'normalization_awareness_without_reform_or_commerce_phase'
  | 'cover_capacity_failure_without_justification_ref'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'

export interface PublicDisclosureValidationIssue {
  readonly code: PublicDisclosureValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PublicDisclosureValidationResult {
  readonly valid: boolean
  readonly issues: readonly PublicDisclosureValidationIssue[]
}

// ---------------------------------------------------------------------------
// Regional projection
// ---------------------------------------------------------------------------

export interface DisclosureRegionalViewProjectionPolicy {
  readonly minimumTrustScore?: number
  readonly redactUnknown?: boolean
  readonly suppressRedactedSummary?: boolean
}

export interface RegionalTrustProjection {
  readonly regionRef: string
  readonly trustScore: number | null
  readonly redacted: boolean
}

export interface DisclosureRegionalViewProjection {
  readonly recordId: PublicDisclosureStateId
  readonly label: string
  readonly summary: string | null
  readonly publicAwarenessHint: AwarenessLevel
  readonly falloutPhase: FalloutPhase
  readonly regionalTrust: readonly RegionalTrustProjection[]
  readonly oversightPressure: number | null
  readonly campaignObjectivePivot: CampaignObjectivePivot | null
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const AWARENESS_LEVEL_SET = new Set<string>(AWARENESS_LEVELS)
const FALLOUT_PHASE_SET = new Set<string>(FALLOUT_PHASES)
const CAMPAIGN_OBJECTIVE_PIVOT_SET = new Set<string>(CAMPAIGN_OBJECTIVE_PIVOTS)
const NORMALIZATION_INPUT_KIND_SET = new Set<string>(NORMALIZATION_INPUT_KINDS)

const NORMALIZATION_AWARENESS_FALLOUT_PHASES = new Set<FalloutPhase>([
  'reform',
  'commerce',
  'normalization',
])

const PRIOR_LEAK_OR_SCANDAL_LEVELS = new Set<AwarenessLevel>(['credible_leak', 'public_scandal'])

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach)\b/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value : []
}

function asTrustByRegion(value: unknown): readonly RegionalTrustScore[] {
  return Array.isArray(value) ? value : []
}

function asTransitionHistory(value: unknown): readonly PublicDisclosureTransitionHistoryEntry[] {
  return Array.isArray(value) ? value : []
}

function asNormalizationInputs(value: unknown): readonly NormalizationInput[] {
  return Array.isArray(value) ? value : []
}

function asLinkedContractOutcomes(value: unknown): readonly LinkedContractOutcomeHook[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: PublicDisclosureValidationIssue[],
  issue: PublicDisclosureValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PublicDisclosureValidationIssue[]) {
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

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function freezeValidationResult(
  issues: PublicDisclosureValidationIssue[]
): PublicDisclosureValidationResult {
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

function historyIncludesPriorLeakOrScandal(
  history: readonly PublicDisclosureTransitionHistoryEntry[]
): boolean {
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    if (
      PRIOR_LEAK_OR_SCANDAL_LEVELS.has(entry.fromAwarenessLevel) ||
      PRIOR_LEAK_OR_SCANDAL_LEVELS.has(entry.toAwarenessLevel)
    ) {
      return true
    }
  }

  return false
}

function scanFranchiseTokens(
  issues: PublicDisclosureValidationIssue[],
  id: string,
  label: string,
  record: PublicDisclosureRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Public disclosure record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Public disclosure record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'coverCapacityFailureJustificationRef', value: record.coverCapacityFailureJustificationRef },
  ]

  for (const { field, value } of stringFields) {
    const token = normalizeToken(value ?? '')
    if (token && containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const entry of asTrustByRegion(record.trustByRegion)) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const regionRef = normalizeToken(entry.regionRef)
    if (regionRef && containsFranchiseToken(regionRef)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} trustByRegion contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const input of asNormalizationInputs(record.normalizationInputs)) {
    if (!input || typeof input !== 'object') {
      continue
    }

    for (const token of [input.descriptor, input.ref]) {
      const normalized = normalizeToken(token ?? '')
      if (normalized && containsFranchiseToken(normalized)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Public disclosure record ${id || '(unknown)'} normalizationInputs contains a franchise or source-literal token.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  for (const hook of asLinkedContractOutcomes(record.linkedContractOutcomes)) {
    if (!hook || typeof hook !== 'object') {
      continue
    }

    const contractRef = normalizeToken(hook.contractRef)
    if (contractRef && containsFranchiseToken(contractRef)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} linkedContractOutcomes contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const entry of asTransitionHistory(record.transitionHistory)) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const note = normalizeToken(entry.note ?? '')
    if (note && containsFranchiseToken(note)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} transitionHistory contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function resolveConfidence(
  record: PublicDisclosureRecord,
  policy: DisclosureRegionalViewProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (confidence !== null && policy.minimumTrustScore !== undefined && confidence < policy.minimumTrustScore) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    return null
  }

  return confidence
}

function resolveRegionalTrustScore(
  entry: RegionalTrustScore,
  record: PublicDisclosureRecord,
  policy: DisclosureRegionalViewProjectionPolicy
): RegionalTrustProjection {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)
  const regionRef = normalizeToken(entry.regionRef) || '(unknown)'
  const fieldKey = `trust:${regionRef}`
  const redacted =
    redactedFields.has(fieldKey) ||
    redactedFields.has('trustByRegion') ||
    (policy.redactUnknown === true && unknownFields.includes(fieldKey))

  if (redacted) {
    return Object.freeze({
      regionRef,
      trustScore: null,
      redacted: true,
    })
  }

  const trustScore = entry.trustScore
  if (
    policy.minimumTrustScore !== undefined &&
    typeof trustScore === 'number' &&
    trustScore < policy.minimumTrustScore
  ) {
    return Object.freeze({
      regionRef,
      trustScore: null,
      redacted: true,
    })
  }

  return Object.freeze({
    regionRef,
    trustScore: typeof trustScore === 'number' ? trustScore : null,
    redacted: false,
  })
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isAwarenessLevel(value: string): value is AwarenessLevel {
  return AWARENESS_LEVEL_SET.has(value)
}

export function isFalloutPhase(value: string): value is FalloutPhase {
  return FALLOUT_PHASE_SET.has(value)
}

export function isCampaignObjectivePivot(value: string): value is CampaignObjectivePivot {
  return CAMPAIGN_OBJECTIVE_PIVOT_SET.has(value)
}

export function isNormalizationInputKind(value: string): value is NormalizationInputKind {
  return NORMALIZATION_INPUT_KIND_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePublicDisclosureRecord(
  record: PublicDisclosureRecord
): PublicDisclosureValidationResult {
  const issues: PublicDisclosureValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Public disclosure record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Public disclosure record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  scanFranchiseTokens(issues, id, label, record)

  if (!isAwarenessLevel(record.awarenessLevel)) {
    pushIssue(issues, {
      code: 'invalid_awareness_level',
      severity: 'error',
      detail: `Public disclosure record ${id || '(unknown)'} has invalid awarenessLevel ${String(record.awarenessLevel)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isFalloutPhase(record.falloutPhase)) {
    pushIssue(issues, {
      code: 'invalid_fallout_phase',
      severity: 'error',
      detail: `Public disclosure record ${id || '(unknown)'} has invalid falloutPhase ${String(record.falloutPhase)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.campaignObjectivePivot !== undefined &&
    !isCampaignObjectivePivot(record.campaignObjectivePivot)
  ) {
    pushIssue(issues, {
      code: 'invalid_campaign_objective_pivot',
      severity: 'error',
      detail: `Public disclosure record ${id || '(unknown)'} has invalid campaignObjectivePivot ${String(record.campaignObjectivePivot)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const entry of asTrustByRegion(record.trustByRegion)) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_regional_trust_score',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} trustByRegion contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry.regionRef)) {
      pushIssue(issues, {
        code: 'empty_region_ref',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} trustByRegion requires regionRef.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isValidUnitScore(entry.trustScore)) {
      pushIssue(issues, {
        code: 'invalid_regional_trust_score',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} trustByRegion trustScore must be a finite number between 0 and 1.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (record.oversightPressure !== undefined && !isValidUnitScore(record.oversightPressure)) {
    pushIssue(issues, {
      code: 'invalid_oversight_pressure',
      severity: 'error',
      detail: `Public disclosure record ${id || '(unknown)'} oversightPressure must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Public disclosure record ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const transitionHistory = asTransitionHistory(record.transitionHistory)
  for (const entry of transitionHistory) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} transitionHistory contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isAwarenessLevel(entry.fromAwarenessLevel) || !isAwarenessLevel(entry.toAwarenessLevel)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} transitionHistory contains invalid awareness level.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isFiniteWeek(entry.week)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_week',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} transitionHistory contains invalid week.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (entry.falloutPhase !== undefined && !isFalloutPhase(entry.falloutPhase)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} transitionHistory contains invalid falloutPhase.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const input of asNormalizationInputs(record.normalizationInputs)) {
    if (!input || typeof input !== 'object') {
      pushIssue(issues, {
        code: 'invalid_normalization_input_kind',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} normalizationInputs contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isNormalizationInputKind(input.kind)) {
      pushIssue(issues, {
        code: 'invalid_normalization_input_kind',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} has invalid normalizationInput kind ${String(input.kind)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!normalizeToken(input.descriptor)) {
      pushIssue(issues, {
        code: 'empty_normalization_input_descriptor',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} normalizationInputs requires descriptor.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const hook of asLinkedContractOutcomes(record.linkedContractOutcomes)) {
    if (!hook || typeof hook !== 'object') {
      pushIssue(issues, {
        code: 'empty_linked_contract_ref',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} linkedContractOutcomes contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(hook.contractRef)) {
      pushIssue(issues, {
        code: 'empty_linked_contract_ref',
        severity: 'error',
        detail: `Public disclosure record ${id || '(unknown)'} linkedContractOutcomes requires contractRef.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (
    record.awarenessLevel === 'official_disclosure' &&
    !PRIOR_LEAK_OR_SCANDAL_LEVELS.has(record.awarenessLevel) &&
    !historyIncludesPriorLeakOrScandal(transitionHistory)
  ) {
    pushIssue(issues, {
      code: 'official_disclosure_without_prior_leak_or_scandal',
      severity: 'warning',
      detail: `Public disclosure record ${id || '(unknown)'} at official_disclosure lacks prior credible_leak or public_scandal in transitionHistory.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.awarenessLevel === 'normalization' &&
    !NORMALIZATION_AWARENESS_FALLOUT_PHASES.has(record.falloutPhase)
  ) {
    pushIssue(issues, {
      code: 'normalization_awareness_without_reform_or_commerce_phase',
      severity: 'warning',
      detail: `Public disclosure record ${id || '(unknown)'} at normalization awareness requires reform, commerce, or normalization fallout phase.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.coverCapacityFailure === true &&
    !normalizeToken(record.coverCapacityFailureJustificationRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'cover_capacity_failure_without_justification_ref',
      severity: 'warning',
      detail: `Public disclosure record ${id || '(unknown)'} declares coverCapacityFailure without casualty/leak/scale justification ref.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects regional public-awareness and trust scores from record-derived fields.
 * Does not assert objective truth or omniscient regional sentiment.
 */
export function projectDisclosureRegionalView(
  record: PublicDisclosureRecord,
  policy: DisclosureRegionalViewProjectionPolicy = {}
): DisclosureRegionalViewProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = Object.freeze(
    [...asStringArray(record.unknownFields)].sort((left, right) => left.localeCompare(right))
  )

  const summaryRedacted = redactedFields.has('summary')
  const summary = summaryRedacted ? null : normalizeToken(record.summary ?? '') || null

  const regionalTrust = Object.freeze(
    asTrustByRegion(record.trustByRegion)
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => resolveRegionalTrustScore(entry, record, policy))
      .sort((left, right) => left.regionRef.localeCompare(right.regionRef))
  )

  const oversightRedacted =
    redactedFields.has('oversightPressure') ||
    (policy.redactUnknown === true && unknownFields.includes('oversightPressure'))

  const oversightPressure =
    oversightRedacted || record.oversightPressure === undefined
      ? null
      : record.oversightPressure

  const confidence = resolveConfidence(record, policy)
  const redacted =
    summaryRedacted ||
    redactedFields.has('confidence') ||
    regionalTrust.some((entry) => entry.redacted) ||
    oversightRedacted

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    summary,
    publicAwarenessHint: isAwarenessLevel(record.awarenessLevel)
      ? record.awarenessLevel
      : 'secrecy_intact',
    falloutPhase: isFalloutPhase(record.falloutPhase) ? record.falloutPhase : 'crisis',
    regionalTrust,
    oversightPressure,
    campaignObjectivePivot:
      record.campaignObjectivePivot !== undefined &&
      isCampaignObjectivePivot(record.campaignObjectivePivot)
        ? record.campaignObjectivePivot
        : null,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: PublicDisclosureRecord): PublicDisclosureRecord {
  return Object.freeze({ ...record })
}

/** Disclosure progression credible_leak → public_scandal → official_disclosure with history. */
export const DISCLOSURE_PROGRESSION_FIXTURE: PublicDisclosureRecord = defineRecord({
  id: 'disclosure:coastal-research-campus',
  label: 'Coastal research campus leak cascade',
  summary: 'Regional leak escalates through scandal to managed official disclosure.',
  awarenessLevel: 'official_disclosure',
  falloutPhase: 'disclosure',
  trustByRegion: [
    { regionRef: 'region:coastal-metro', trustScore: 0.31 },
    { regionRef: 'region:inland-corridor', trustScore: 0.52 },
  ],
  oversightPressure: 0.74,
  campaignObjectivePivot: 'legitimacy',
  transitionHistory: [
    {
      fromAwarenessLevel: 'secrecy_intact',
      toAwarenessLevel: 'credible_leak',
      week: 18,
      note: 'Internal memo surfaces in contractor forum.',
      falloutPhase: 'leak',
    },
    {
      fromAwarenessLevel: 'credible_leak',
      toAwarenessLevel: 'public_scandal',
      week: 21,
      note: 'Regional press publishes witness corroboration.',
      falloutPhase: 'disclosure',
    },
    {
      fromAwarenessLevel: 'public_scandal',
      toAwarenessLevel: 'official_disclosure',
      week: 24,
      note: 'Agency publishes partial incident summary.',
      falloutPhase: 'disclosure',
    },
  ],
  linkedContractOutcomes: [
    {
      contractRef: 'contract:containment-response-24',
      operationalSuccess: true,
      secrecyFailure: true,
    },
  ],
  confidence: 0.58,
})

/** Normalization phase with anomaly tourism input (registry-facing, not location record). */
export const NORMALIZATION_INPUT_FIXTURE: PublicDisclosureRecord = defineRecord({
  id: 'disclosure:former-vault-tourism',
  label: 'Post-disclosure anomaly tourism normalization',
  summary: 'Public-managed former site opens limited guided tours under oversight.',
  awarenessLevel: 'normalization',
  falloutPhase: 'commerce',
  trustByRegion: [{ regionRef: 'region:river-district', trustScore: 0.64 }],
  campaignObjectivePivot: 'adaptation',
  normalizationInputs: [
    {
      kind: 'anomaly_tourism',
      descriptor: 'Guided weekend tours of decommissioned containment wing',
      ref: 'program:public-tour-pilot-7',
    },
  ],
  confidence: 0.49,
})
