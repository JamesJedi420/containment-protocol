/**
 * SPE-2104 slice 1: minor anomaly item registry for low-priority intake objects.
 *
 * Pure deterministic registry for recordable minor objects below full case/containment
 * project scope — distinct from brief events, unexplained locations, and case lifecycle.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type MinorAnomalyItemId = string

export type MinorAnomalyDisposition =
  | 'recovered'
  | 'pending_review'
  | 'stored'
  | 'assigned'
  | 'staff_use'
  | 'lost'
  | 'destroyed'
  | 'neutralized'
  | 'in_circulation'
  | 'under_investigation'
  | 'false_positive_returned'

export const MINOR_ANOMALY_DISPOSITIONS: readonly MinorAnomalyDisposition[] = [
  'recovered',
  'pending_review',
  'stored',
  'assigned',
  'staff_use',
  'lost',
  'destroyed',
  'neutralized',
  'in_circulation',
  'under_investigation',
  'false_positive_returned',
] as const

const INITIAL_INTAKE_DISPOSITIONS = new Set<MinorAnomalyDisposition>(['recovered', 'pending_review'])

const MULTI_STEP_DISPOSITIONS = new Set<MinorAnomalyDisposition>([
  'stored',
  'assigned',
  'staff_use',
  'lost',
  'destroyed',
  'neutralized',
  'in_circulation',
  'under_investigation',
  'false_positive_returned',
])

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface MinorAnomalyStatusHistoryEntry {
  readonly fromDisposition: MinorAnomalyDisposition
  readonly toDisposition: MinorAnomalyDisposition
  readonly week: number
  readonly note?: string
}

export interface StaffNoteProvenanceHook {
  readonly noteRef: string
  readonly authorRef?: string
  readonly week?: number
}

export interface MinorAnomalyRecord {
  readonly id: MinorAnomalyItemId
  readonly label: string
  readonly descriptionStub?: string
  readonly recoverySiteRef?: string
  readonly suspectedOriginRef?: string
  readonly currentCustodyRef?: string
  readonly disposition: MinorAnomalyDisposition
  /** Legacy mirror of disposition; warns when set without statusHistory on multi-step states. */
  readonly status?: string
  readonly statusHistory?: readonly MinorAnomalyStatusHistoryEntry[]
  readonly latentRiskScore: number
  readonly lowValue?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
  readonly destructionAuthorizationRef?: string
  readonly investigationRef?: string
  readonly publicDisruptionRef?: string
  readonly staffNoteProvenance?: readonly StaffNoteProvenanceHook[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type MinorAnomalyValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_disposition'
  | 'invalid_latent_risk_score'
  | 'invalid_confidence'
  | 'invalid_status_history_disposition'
  | 'invalid_status_history_week'
  | 'invalid_staff_note_hook'
  | 'destroyed_without_authorization'
  | 'low_value_without_latent_risk_score'
  | 'status_history_missing_on_revised_disposition'
  | 'false_positive_without_investigation_ref'
  | 'legacy_status_without_history'
  | 'latent_risk_underestimate'

export interface MinorAnomalyValidationIssue {
  readonly code: MinorAnomalyValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface MinorAnomalyValidationResult {
  readonly valid: boolean
  readonly issues: readonly MinorAnomalyValidationIssue[]
}

export interface MinorAnomalyValidationPolicy {
  readonly requireDestructionAuthorization?: boolean
}

// ---------------------------------------------------------------------------
// Operator projection
// ---------------------------------------------------------------------------

export interface MinorAnomalyOperatorProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressRedactedRecoverySite?: boolean
  readonly suppressRedactedOrigin?: boolean
}

export interface MinorAnomalyOperatorProjection {
  readonly itemId: MinorAnomalyItemId
  readonly recoverySiteRef: string | null
  readonly suspectedOriginRef: string | null
  readonly currentCustodyRef: string | null
  readonly disposition: MinorAnomalyDisposition
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const DISPOSITION_SET = new Set<string>(MINOR_ANOMALY_DISPOSITIONS)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value : []
}

function asStatusHistory(value: unknown): readonly MinorAnomalyStatusHistoryEntry[] {
  return Array.isArray(value) ? value : []
}

function asStaffNoteHooks(value: unknown): readonly StaffNoteProvenanceHook[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(issues: MinorAnomalyValidationIssue[], issue: MinorAnomalyValidationIssue) {
  issues.push(issue)
}

function sortValidationIssues(issues: MinorAnomalyValidationIssue[]) {
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

function isValidUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isValidLatentRiskScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function freezeValidationResult(issues: MinorAnomalyValidationIssue[]): MinorAnomalyValidationResult {
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

function resolveProjectedRef(
  rawValue: string | undefined,
  fieldName: string,
  record: MinorAnomalyRecord,
  policy: MinorAnomalyOperatorProjectionPolicy,
  suppressWhenRedacted: boolean | undefined
): string | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const token = normalizeToken(rawValue ?? '')

  const fieldRedacted = redactedFields.has(fieldName)
  const legacyLocationRedacted =
    (fieldName === 'recoverySiteRef' && redactedFields.has('recoverySite')) ||
    (fieldName === 'suspectedOriginRef' && redactedFields.has('suspectedOrigin'))

  if (legacyLocationRedacted || (suppressWhenRedacted === true && fieldRedacted)) {
    return null
  }

  return token || null
}

function resolveConfidence(
  record: MinorAnomalyRecord,
  policy: MinorAnomalyOperatorProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (confidence !== null && policy.minimumConfidence !== undefined && confidence < policy.minimumConfidence) {
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

export function isMinorAnomalyDisposition(value: string): value is MinorAnomalyDisposition {
  return DISPOSITION_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateMinorAnomalyRecord(
  record: MinorAnomalyRecord,
  policy: MinorAnomalyValidationPolicy = {}
): MinorAnomalyValidationResult {
  const issues: MinorAnomalyValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Minor anomaly item record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Minor anomaly item record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isMinorAnomalyDisposition(record.disposition)) {
    pushIssue(issues, {
      code: 'invalid_disposition',
      severity: 'error',
      detail: `Minor anomaly item ${id || '(unknown)'} has invalid disposition ${String(record.disposition)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const hasDeclaredLatentRiskScore =
    Object.prototype.hasOwnProperty.call(record, 'latentRiskScore') &&
    record.latentRiskScore !== undefined

  if (record.lowValue === true && !hasDeclaredLatentRiskScore) {
    pushIssue(issues, {
      code: 'low_value_without_latent_risk_score',
      severity: 'warning',
      detail: `Minor anomaly item ${id || '(unknown)'} is lowValue without latentRiskScore.`,
      relatedIds: id ? [id] : undefined,
    })
  } else if (!isValidLatentRiskScore(record.latentRiskScore)) {
    pushIssue(issues, {
      code: 'invalid_latent_risk_score',
      severity: 'error',
      detail: `Minor anomaly item ${id || '(unknown)'} latentRiskScore must be a finite number between 0 and 100.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitInterval(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Minor anomaly item ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const statusHistory = asStatusHistory(record.statusHistory)
  for (const entry of statusHistory) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_status_history_disposition',
        severity: 'error',
        detail: `Minor anomaly item ${id || '(unknown)'} statusHistory contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (
      !isMinorAnomalyDisposition(entry.fromDisposition) ||
      !isMinorAnomalyDisposition(entry.toDisposition)
    ) {
      pushIssue(issues, {
        code: 'invalid_status_history_disposition',
        severity: 'error',
        detail: `Minor anomaly item ${id || '(unknown)'} statusHistory contains invalid disposition.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isFiniteWeek(entry.week)) {
      pushIssue(issues, {
        code: 'invalid_status_history_week',
        severity: 'error',
        detail: `Minor anomaly item ${id || '(unknown)'} statusHistory contains invalid week.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const hook of asStaffNoteHooks(record.staffNoteProvenance)) {
    if (!hook || typeof hook !== 'object' || !normalizeToken(hook.noteRef)) {
      pushIssue(issues, {
        code: 'invalid_staff_note_hook',
        severity: 'error',
        detail: `Minor anomaly item ${id || '(unknown)'} staffNoteProvenance requires noteRef.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (hook.week !== undefined && !isFiniteWeek(hook.week)) {
      pushIssue(issues, {
        code: 'invalid_staff_note_hook',
        severity: 'error',
        detail: `Minor anomaly item ${id || '(unknown)'} staffNoteProvenance hook has invalid week.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (
    record.disposition === 'destroyed' &&
    policy.requireDestructionAuthorization === true &&
    !normalizeToken(record.destructionAuthorizationRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'destroyed_without_authorization',
      severity: 'error',
      detail: `Minor anomaly item ${id || '(unknown)'} is destroyed without destructionAuthorizationRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    isMinorAnomalyDisposition(record.disposition) &&
    !INITIAL_INTAKE_DISPOSITIONS.has(record.disposition) &&
    statusHistory.length === 0
  ) {
    pushIssue(issues, {
      code: 'status_history_missing_on_revised_disposition',
      severity: 'error',
      detail: `Minor anomaly item ${id || '(unknown)'} disposition ${record.disposition} requires statusHistory.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.disposition === 'false_positive_returned' &&
    !normalizeToken(record.investigationRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'false_positive_without_investigation_ref',
      severity: 'error',
      detail: `Minor anomaly item ${id || '(unknown)'} with false_positive_returned requires investigationRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const legacyStatus = normalizeToken(record.status ?? '')
  if (
    legacyStatus &&
    statusHistory.length === 0 &&
    (MULTI_STEP_DISPOSITIONS.has(record.disposition) ||
      (isMinorAnomalyDisposition(record.disposition) && legacyStatus !== record.disposition))
  ) {
    pushIssue(issues, {
      code: 'legacy_status_without_history',
      severity: 'warning',
      detail: `Minor anomaly item ${id || '(unknown)'} declares legacy status without statusHistory on multi-step disposition.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.lowValue === true &&
    record.latentRiskScore === 0 &&
    normalizeToken(record.publicDisruptionRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'latent_risk_underestimate',
      severity: 'warning',
      detail: `Minor anomaly item ${id || '(unknown)'} lowValue with latentRiskScore 0 and public disruption hook risks latent risk underestimate.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects record-derived custody and location fields for operator surfaces.
 * Does not assert objective truth — only what the record declares.
 */
export function projectMinorAnomalyForOperator(
  record: MinorAnomalyRecord,
  policy: MinorAnomalyOperatorProjectionPolicy = {}
): MinorAnomalyOperatorProjection {
  const itemId = normalizeToken(record.id) || '(unknown)'
  const unknownFields = Object.freeze(
    [...asStringArray(record.unknownFields)].sort((a, b) => a.localeCompare(b))
  )
  const redactedFields = new Set(asStringArray(record.redactedFields))

  const recoverySiteRef = resolveProjectedRef(
    record.recoverySiteRef,
    'recoverySiteRef',
    record,
    policy,
    policy.suppressRedactedRecoverySite
  )
  const suspectedOriginRef = resolveProjectedRef(
    record.suspectedOriginRef,
    'suspectedOriginRef',
    record,
    policy,
    policy.suppressRedactedOrigin
  )
  const currentCustodyRef = resolveProjectedRef(
    record.currentCustodyRef,
    'currentCustodyRef',
    record,
    policy,
    false
  )

  const confidence = resolveConfidence(record, policy)
  const redacted =
    redactedFields.has('recoverySiteRef') ||
    redactedFields.has('suspectedOriginRef') ||
    redactedFields.has('currentCustodyRef') ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    itemId,
    recoverySiteRef,
    suspectedOriginRef,
    currentCustodyRef,
    disposition: record.disposition,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineItem(record: MinorAnomalyRecord): MinorAnomalyRecord {
  return Object.freeze({ ...record })
}

/** Low-priority shelf item progressing recovered → stored → staff_use with append-only history. */
export const DISPOSITION_CHAIN_ITEM_FIXTURE: MinorAnomalyRecord = defineItem({
  id: 'item:ceramic-whistle-fragment',
  label: 'Ceramic whistle fragment',
  descriptionStub: 'Minor resonant shard recovered from municipal archive basement.',
  recoverySiteRef: 'site:archive-basement-locker',
  suspectedOriginRef: 'site:riverside-flea-stall',
  currentCustodyRef: 'custody:staff-locker-12',
  disposition: 'staff_use',
  latentRiskScore: 14,
  lowValue: true,
  confidence: 0.58,
  staffNoteProvenance: [{ noteRef: 'note:basement-intake-14', authorRef: 'staff:field-clerk-3', week: 9 }],
  statusHistory: [
    { fromDisposition: 'recovered', toDisposition: 'stored', week: 9, note: 'Logged in low-priority vault.' },
    { fromDisposition: 'stored', toDisposition: 'staff_use', week: 22, note: 'Issued for calibration drills.' },
  ],
})

/** False-positive return closed with investigation ref. */
export const FALSE_POSITIVE_ITEM_FIXTURE: MinorAnomalyRecord = defineItem({
  id: 'item:brass-key-blank',
  label: 'Brass key blank',
  descriptionStub: 'Ordinary hardware blank misfiled as resonant hazard.',
  recoverySiteRef: 'site:evidence-intake-desk',
  suspectedOriginRef: 'site:hardware-supply-aisle',
  currentCustodyRef: 'custody:returned-to-claimant',
  disposition: 'false_positive_returned',
  latentRiskScore: 3,
  lowValue: true,
  confidence: 0.91,
  investigationRef: 'investigation:false-positive-key-blank-41',
  statusHistory: [
    {
      fromDisposition: 'under_investigation',
      toDisposition: 'false_positive_returned',
      week: 18,
      note: 'Returned to municipal claimant after negative assay.',
    },
  ],
})
