/**
 * SPE-2117 slice 1: recurrent catastrophe amelioration registry.
 *
 * Pure deterministic registry for anomalies that cannot be fully prevented —
 * only prepared for, softened, repaired, and documented across repeating
 * failure cycles — distinct from case lifecycle wire-up (SPE-1310).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type RecurrentCatastropheId = string

export type RecurrenceCadence = 'weekly' | 'monthly' | 'seasonal' | 'annual' | 'irregular'

export const RECURRENCE_CADENCES: readonly RecurrenceCadence[] = [
  'weekly',
  'monthly',
  'seasonal',
  'annual',
  'irregular',
] as const

export type CatastropheFailureMode = 'breach' | 'manifestation' | 'cascade'

export const CATASTROPHE_FAILURE_MODES: readonly CatastropheFailureMode[] = [
  'breach',
  'manifestation',
  'cascade',
] as const

export type PreventionCeiling = 'impossible' | 'cost_prohibitive' | 'unknown'

export const PREVENTION_CEILINGS: readonly PreventionCeiling[] = [
  'impossible',
  'cost_prohibitive',
  'unknown',
] as const

export type AmeliorationTactic =
  | 'shielding'
  | 'evacuation'
  | 'effect_dampening'
  | 'repair_budget'
  | 'narrative_containment'

export const AMELIORATION_TACTICS: readonly AmeliorationTactic[] = [
  'shielding',
  'evacuation',
  'effect_dampening',
  'repair_budget',
  'narrative_containment',
] as const

export type PreventionTactic = 'neutralization' | 'source_elimination' | 'permanent_seal'

export const PREVENTION_TACTICS: readonly PreventionTactic[] = [
  'neutralization',
  'source_elimination',
  'permanent_seal',
] as const

export type RecurrenceSeverityBand = 'dormant' | 'elevated' | 'imminent' | 'critical'

export const RECURRENCE_SEVERITY_BANDS: readonly RecurrenceSeverityBand[] = [
  'dormant',
  'elevated',
  'imminent',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ActiveAmeliorationTactic {
  readonly tactic: AmeliorationTactic
  readonly active: boolean
}

export interface ActivePreventionTactic {
  readonly tactic: PreventionTactic
  readonly active: boolean
}

export interface RecurrentCatastropheRecord {
  readonly id: RecurrentCatastropheId
  readonly label: string
  readonly summary?: string
  readonly recurrenceCadence: RecurrenceCadence
  readonly failureMode: CatastropheFailureMode
  readonly preventionCeiling: PreventionCeiling
  readonly ameliorationTactics: readonly ActiveAmeliorationTactic[]
  readonly preventionTactics?: readonly ActivePreventionTactic[]
  readonly recurrenceCount: number
  readonly lastOccurrenceWeek?: number
  readonly damageLedgerRefs?: readonly string[]
  readonly postIncidentReviewRefs?: readonly string[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type RecurrentCatastropheValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_recurrence_cadence'
  | 'invalid_failure_mode'
  | 'invalid_prevention_ceiling'
  | 'invalid_amelioration_tactic'
  | 'invalid_prevention_tactic'
  | 'invalid_recurrence_count'
  | 'invalid_last_occurrence_week'
  | 'invalid_confidence'
  | 'empty_damage_ledger_ref'
  | 'empty_post_incident_review_ref'
  | 'active_prevention_when_ceiling_impossible'
  | 'recurrence_without_damage_ledger'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface RecurrentCatastropheValidationIssue {
  readonly code: RecurrentCatastropheValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface RecurrentCatastropheValidationResult {
  readonly valid: boolean
  readonly issues: readonly RecurrentCatastropheValidationIssue[]
}

// ---------------------------------------------------------------------------
// Recurrence risk projection
// ---------------------------------------------------------------------------

export interface NextRecurrenceRiskProjectionPolicy {
  readonly currentWeek?: number
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
}

export interface NextRecurrenceRiskProjection {
  readonly recordId: RecurrentCatastropheId
  readonly label: string
  readonly failureMode: CatastropheFailureMode
  readonly severityBand: RecurrenceSeverityBand | null
  readonly recurrenceRiskScore: number | null
  readonly recurrenceCount: number
  readonly lastOccurrenceWeek: number | null
  readonly activeAmeliorationCount: number
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const RECURRENCE_CADENCE_SET = new Set<string>(RECURRENCE_CADENCES)
const CATASTROPHE_FAILURE_MODE_SET = new Set<string>(CATASTROPHE_FAILURE_MODES)
const PREVENTION_CEILING_SET = new Set<string>(PREVENTION_CEILINGS)
const AMELIORATION_TACTIC_SET = new Set<string>(AMELIORATION_TACTICS)
const PREVENTION_TACTIC_SET = new Set<string>(PREVENTION_TACTICS)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const CADENCE_WEEK_INTERVAL: Readonly<Record<RecurrenceCadence, number>> = {
  weekly: 1,
  monthly: 4,
  seasonal: 13,
  annual: 52,
  irregular: 8,
}

const FAILURE_MODE_RISK_WEIGHT: Readonly<Record<CatastropheFailureMode, number>> = {
  breach: 0.14,
  manifestation: 0.1,
  cascade: 0.18,
}

const AMELIORATION_SOFTENING: Readonly<Record<AmeliorationTactic, number>> = {
  shielding: 0.06,
  evacuation: 0.05,
  effect_dampening: 0.08,
  repair_budget: 0.07,
  narrative_containment: 0.04,
}

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
  issues: RecurrentCatastropheValidationIssue[],
  issue: RecurrentCatastropheValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: RecurrentCatastropheValidationIssue[]) {
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeValidationResult(
  issues: RecurrentCatastropheValidationIssue[]
): RecurrentCatastropheValidationResult {
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

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function roundUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(clampUnit(value) * 1000) / 1000
}

function countActiveAmeliorationTactics(record: RecurrentCatastropheRecord): number {
  return record.ameliorationTactics.filter((entry) => entry.active === true).length
}

function hasActivePreventionTactic(record: RecurrentCatastropheRecord): boolean {
  return (record.preventionTactics ?? []).some((entry) => entry.active === true)
}

function scanForbiddenTokens(
  issues: RecurrentCatastropheValidationIssue[],
  id: string,
  label: string,
  record: RecurrentCatastropheRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Recurrent catastrophe record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Recurrent catastrophe record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Recurrent catastrophe record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Recurrent catastrophe record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const summary = normalizeToken(record.summary ?? '')
  if (summary && containsFranchiseToken(summary)) {
    pushIssue(issues, {
      code: 'franchise_token_in_field',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} field summary contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (summary && containsBrandedObjectNumber(summary)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} field summary contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveSeverityBand(score: number): RecurrenceSeverityBand {
  if (score >= 0.75) {
    return 'critical'
  }

  if (score >= 0.5) {
    return 'imminent'
  }

  if (score >= 0.25) {
    return 'elevated'
  }

  return 'dormant'
}

function resolveCadenceElapsedPressure(
  record: RecurrentCatastropheRecord,
  currentWeek: number | undefined
): number {
  if (currentWeek === undefined || !Number.isFinite(currentWeek)) {
    return 0
  }

  const lastWeek = record.lastOccurrenceWeek
  if (lastWeek === undefined || !Number.isFinite(lastWeek)) {
    return 0
  }

  const cadence = isRecurrenceCadence(record.recurrenceCadence)
    ? record.recurrenceCadence
    : 'irregular'
  const interval = CADENCE_WEEK_INTERVAL[cadence]
  const elapsed = Math.max(0, currentWeek - lastWeek)

  return clampUnit(elapsed / interval)
}

function resolveAmeliorationSoftening(record: RecurrentCatastropheRecord): number {
  let softening = 0

  for (const entry of record.ameliorationTactics) {
    if (entry.active !== true || !isAmeliorationTactic(entry.tactic)) {
      continue
    }

    softening += AMELIORATION_SOFTENING[entry.tactic]
  }

  return Math.min(0.35, softening)
}

function resolveConfidence(
  record: RecurrentCatastropheRecord,
  policy: NextRecurrenceRiskProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (
    confidence !== null &&
    policy.minimumConfidence !== undefined &&
    confidence < policy.minimumConfidence
  ) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    return null
  }

  return confidence
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isRecurrenceCadence(value: unknown): value is RecurrenceCadence {
  return typeof value === 'string' && RECURRENCE_CADENCE_SET.has(value)
}

export function isCatastropheFailureMode(value: unknown): value is CatastropheFailureMode {
  return typeof value === 'string' && CATASTROPHE_FAILURE_MODE_SET.has(value)
}

export function isPreventionCeiling(value: unknown): value is PreventionCeiling {
  return typeof value === 'string' && PREVENTION_CEILING_SET.has(value)
}

export function isAmeliorationTactic(value: unknown): value is AmeliorationTactic {
  return typeof value === 'string' && AMELIORATION_TACTIC_SET.has(value)
}

export function isPreventionTactic(value: unknown): value is PreventionTactic {
  return typeof value === 'string' && PREVENTION_TACTIC_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateRecurrentCatastropheRecord(
  record: RecurrentCatastropheRecord
): RecurrentCatastropheValidationResult {
  const issues: RecurrentCatastropheValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Recurrent catastrophe record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Recurrent catastrophe record is missing label.',
    })
  }

  if (!isRecurrenceCadence(record.recurrenceCadence)) {
    pushIssue(issues, {
      code: 'invalid_recurrence_cadence',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} has invalid recurrenceCadence ${String(record.recurrenceCadence)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isCatastropheFailureMode(record.failureMode)) {
    pushIssue(issues, {
      code: 'invalid_failure_mode',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} has invalid failureMode ${String(record.failureMode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isPreventionCeiling(record.preventionCeiling)) {
    pushIssue(issues, {
      code: 'invalid_prevention_ceiling',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} has invalid preventionCeiling ${String(record.preventionCeiling)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const entry of record.ameliorationTactics) {
    if (!isAmeliorationTactic(entry.tactic)) {
      pushIssue(issues, {
        code: 'invalid_amelioration_tactic',
        severity: 'error',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} has invalid amelioration tactic ${String(entry.tactic)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const entry of record.preventionTactics ?? []) {
    if (!isPreventionTactic(entry.tactic)) {
      pushIssue(issues, {
        code: 'invalid_prevention_tactic',
        severity: 'error',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} has invalid prevention tactic ${String(entry.tactic)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isNonNegativeInteger(record.recurrenceCount)) {
    pushIssue(issues, {
      code: 'invalid_recurrence_count',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} recurrenceCount must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.lastOccurrenceWeek !== undefined &&
    (!Number.isFinite(record.lastOccurrenceWeek) ||
      record.lastOccurrenceWeek < 0 ||
      record.lastOccurrenceWeek !== Math.trunc(record.lastOccurrenceWeek))
  ) {
    pushIssue(issues, {
      code: 'invalid_last_occurrence_week',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} lastOccurrenceWeek must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const ref of asStringArray(record.damageLedgerRefs)) {
    if (!normalizeToken(ref)) {
      pushIssue(issues, {
        code: 'empty_damage_ledger_ref',
        severity: 'error',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} damageLedgerRefs contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.postIncidentReviewRefs)) {
    if (!normalizeToken(ref)) {
      pushIssue(issues, {
        code: 'empty_post_incident_review_ref',
        severity: 'error',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} postIncidentReviewRefs contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  scanForbiddenTokens(issues, id, label, record)

  if (record.preventionCeiling === 'impossible' && hasActivePreventionTactic(record)) {
    pushIssue(issues, {
      code: 'active_prevention_when_ceiling_impossible',
      severity: 'error',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} declares preventionCeiling impossible but has an active prevention tactic.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    isNonNegativeInteger(record.recurrenceCount) &&
    record.recurrenceCount > 0 &&
    asStringArray(record.damageLedgerRefs).every((ref) => !normalizeToken(ref))
  ) {
    pushIssue(issues, {
      code: 'recurrence_without_damage_ledger',
      severity: 'warning',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} reports recurrenceCount without damageLedgerRefs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects next-recurrence severity from record-derived fields.
 * Does not assert hidden dossier truth or automatic lifecycle transitions.
 */
export function projectNextRecurrenceRisk(
  record: RecurrentCatastropheRecord,
  policy: NextRecurrenceRiskProjectionPolicy = {}
): NextRecurrenceRiskProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)

  const riskRedacted =
    redactedFields.has('recurrenceRiskScore') ||
    (policy.redactUnknown === true && unknownFields.includes('recurrenceRiskScore'))

  const recurrenceCount = isNonNegativeInteger(record.recurrenceCount) ? record.recurrenceCount : 0
  const failureMode = isCatastropheFailureMode(record.failureMode)
    ? record.failureMode
    : 'manifestation'
  const lastOccurrenceWeek =
    typeof record.lastOccurrenceWeek === 'number' && Number.isFinite(record.lastOccurrenceWeek)
      ? record.lastOccurrenceWeek
      : null

  let score = Math.min(0.55, recurrenceCount * 0.12)
  score += FAILURE_MODE_RISK_WEIGHT[failureMode]
  score += resolveCadenceElapsedPressure(record, policy.currentWeek)
  score -= resolveAmeliorationSoftening(record)
  score = roundUnit(score)

  const recurrenceRiskScore = riskRedacted ? null : score
  const severityBand = riskRedacted ? null : resolveSeverityBand(score)
  const activeAmeliorationCount = countActiveAmeliorationTactics(record)

  const redacted =
    riskRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    failureMode,
    severityBand,
    recurrenceRiskScore,
    recurrenceCount,
    lastOccurrenceWeek,
    activeAmeliorationCount,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: RecurrentCatastropheRecord): RecurrentCatastropheRecord {
  return Object.freeze({ ...record })
}

/** Impossible prevention ceiling with active dampening and repair-budget tactics. */
export const IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE: RecurrentCatastropheRecord = defineRecord({
  id: 'recurrent-catastrophe:structural-breach-cycle',
  label: 'Structural breach recurrence cycle',
  summary: 'Full prevention impossible; active effect dampening and repair budget amelioration.',
  recurrenceCadence: 'monthly',
  failureMode: 'breach',
  preventionCeiling: 'impossible',
  ameliorationTactics: [
    { tactic: 'effect_dampening', active: true },
    { tactic: 'repair_budget', active: true },
    { tactic: 'evacuation', active: false },
  ],
  preventionTactics: [{ tactic: 'neutralization', active: false }],
  recurrenceCount: 0,
  confidence: 0.82,
})

/** Recurrence history with damage ledger refs and elevated risk. */
export const RECURRENCE_DAMAGE_LEDGER_FIXTURE: RecurrentCatastropheRecord = defineRecord({
  id: 'recurrent-catastrophe:manifestation-cascade-history',
  label: 'Manifestation cascade recurrence history',
  summary: 'Documented recurrence cycles with linked damage ledger entries.',
  recurrenceCadence: 'seasonal',
  failureMode: 'cascade',
  preventionCeiling: 'cost_prohibitive',
  ameliorationTactics: [
    { tactic: 'shielding', active: true },
    { tactic: 'narrative_containment', active: true },
  ],
  preventionTactics: [{ tactic: 'source_elimination', active: false }],
  recurrenceCount: 3,
  lastOccurrenceWeek: 40,
  damageLedgerRefs: ['damage-ledger:cycle-1', 'damage-ledger:cycle-2', 'damage-ledger:cycle-3'],
  postIncidentReviewRefs: ['review:cycle-3-closeout'],
  confidence: 0.76,
})
