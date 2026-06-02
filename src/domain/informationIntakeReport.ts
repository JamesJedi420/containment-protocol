/**
 * SPE-854 slice 1: incoming incident report schema and verification progression.
 *
 * Pure deterministic model for mixed-source intake reports with corroboration-aware
 * verification states — distinct from per-topic registries (SPE-2104–SPE-2123).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type InformationIntakeReportId = string

export type IntakeSourceClass =
  | 'formal_alert'
  | 'public_signal'
  | 'partner_channel'
  | 'media_trace'
  | 'technical_trace'
  | 'rumor_chain'
  | 'field_witness'
  | 'archive_signature'
  | 'off_channel'

export const INTAKE_SOURCE_CLASSES: readonly IntakeSourceClass[] = [
  'formal_alert',
  'public_signal',
  'partner_channel',
  'media_trace',
  'technical_trace',
  'rumor_chain',
  'field_witness',
  'archive_signature',
  'off_channel',
] as const

export type InformationVerificationStatus =
  | 'impossible'
  | 'contradicted'
  | 'unverified'
  | 'partially_corroborated'
  | 'verified'
  | 'escalated_confidence'

export const INFORMATION_VERIFICATION_STATUSES: readonly InformationVerificationStatus[] = [
  'impossible',
  'contradicted',
  'unverified',
  'partially_corroborated',
  'verified',
  'escalated_confidence',
] as const

export type CredibilityBand = 'very_low' | 'low' | 'medium' | 'high' | 'institutional'

export const CREDIBILITY_BANDS: readonly CredibilityBand[] = [
  'very_low',
  'low',
  'medium',
  'high',
  'institutional',
] as const

export type PlausibilityBand = 'implausible' | 'uncertain' | 'plausible' | 'likely'

export const PLAUSIBILITY_BANDS: readonly PlausibilityBand[] = [
  'implausible',
  'uncertain',
  'plausible',
  'likely',
] as const

export type RumorRiskBand = 'none' | 'low' | 'elevated' | 'high'

export const RUMOR_RISK_BANDS: readonly RumorRiskBand[] = ['none', 'low', 'elevated', 'high'] as const

// ---------------------------------------------------------------------------
// History events
// ---------------------------------------------------------------------------

export interface CorroborationEvent {
  readonly eventId: string
  readonly week: number
  readonly sourceRef: string
  readonly sourceClass: IntakeSourceClass
  /** Bounded corroboration weight in [0, 1]. */
  readonly weight: number
  readonly note?: string
}

export interface ContradictionEvent {
  readonly eventId: string
  readonly week: number
  readonly sourceRef: string
  readonly severity: 'minor' | 'major'
  readonly note?: string
}

// ---------------------------------------------------------------------------
// Report record
// ---------------------------------------------------------------------------

export interface InformationIntakeReportRecord {
  readonly id: InformationIntakeReportId
  readonly label: string
  readonly topicRef: string
  readonly initialSourceClass: IntakeSourceClass
  readonly credibility: CredibilityBand
  readonly plausibility: PlausibilityBand
  readonly rumorRisk: RumorRiskBand
  readonly verificationStatus: InformationVerificationStatus
  readonly confidenceScore: number
  readonly corroborationHistory: readonly CorroborationEvent[]
  readonly contradictionHistory: readonly ContradictionEvent[]
  readonly retainedDespiteContradiction: boolean
  readonly summary?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type InformationIntakeReportValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_topic_ref'
  | 'invalid_source_class'
  | 'invalid_verification_status'
  | 'invalid_credibility'
  | 'invalid_plausibility'
  | 'invalid_rumor_risk'
  | 'invalid_confidence_score'
  | 'invalid_corroboration_event'
  | 'duplicate_corroboration_event_id'
  | 'invalid_contradiction_event'
  | 'duplicate_contradiction_event_id'
  | 'franchise_literal_token'

export interface InformationIntakeReportValidationIssue {
  readonly code: InformationIntakeReportValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface InformationIntakeReportValidationResult {
  readonly valid: boolean
  readonly issues: readonly InformationIntakeReportValidationIssue[]
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export interface VerificationTransition {
  readonly fromStatus: InformationVerificationStatus
  readonly toStatus: InformationVerificationStatus
  readonly reasonCode:
    | 'corroboration_accumulated'
    | 'contradiction_recorded'
    | 'confidence_escalated'
    | 'status_unchanged'
  readonly confidenceScore: number
}

export interface IntakeReportTransitionResult {
  readonly report: InformationIntakeReportRecord
  readonly transition: VerificationTransition
  readonly changed: boolean
}

export interface MixedSourceIntakeSummary {
  readonly topicRef: string
  readonly reportCount: number
  readonly hasIncompleteIntake: boolean
  readonly hasConflictingVerification: boolean
  readonly dominantVerificationStatus: InformationVerificationStatus
  readonly rumorSeparatedCount: number
  readonly structuredReasons: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const SOURCE_CLASS_SET = new Set<string>(INTAKE_SOURCE_CLASSES)
const VERIFICATION_STATUS_SET = new Set<string>(INFORMATION_VERIFICATION_STATUSES)
const CREDIBILITY_SET = new Set<string>(CREDIBILITY_BANDS)
const PLAUSIBILITY_SET = new Set<string>(PLAUSIBILITY_BANDS)
const RUMOR_RISK_SET = new Set<string>(RUMOR_RISK_BANDS)

const STATUS_RANK: Record<InformationVerificationStatus, number> = {
  impossible: 0,
  contradicted: 1,
  unverified: 2,
  partially_corroborated: 3,
  verified: 4,
  escalated_confidence: 5,
}

const CREDIBILITY_SCORE: Record<CredibilityBand, number> = {
  very_low: 0.1,
  low: 0.3,
  medium: 0.5,
  high: 0.7,
  institutional: 0.85,
}

const PLAUSIBILITY_SCORE: Record<PlausibilityBand, number> = {
  implausible: 0.1,
  uncertain: 0.35,
  plausible: 0.6,
  likely: 0.8,
}

const FORBIDDEN_LITERAL_TOKENS = ['scp-', 'foundation', 'mtf-', 'd-class'] as const

const PARTIAL_CORROBORATION_THRESHOLD = 0.35
const VERIFIED_CORROBORATION_THRESHOLD = 0.65
const ESCALATED_CORROBORATION_THRESHOLD = 0.85
const MAJOR_CONTRADICTION_PENALTY = 0.25
const MINOR_CONTRADICTION_PENALTY = 0.1

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE: InformationIntakeReportRecord = {
  id: 'intake:impossible-signature-match',
  label: 'Impossible reappearance signature',
  topicRef: 'topic:canal-bridge-incident',
  initialSourceClass: 'archive_signature',
  credibility: 'medium',
  plausibility: 'implausible',
  rumorRisk: 'low',
  verificationStatus: 'impossible',
  confidenceScore: 0.18,
  corroborationHistory: [],
  contradictionHistory: [],
  retainedDespiteContradiction: true,
  summary: 'Archive signature matches a closed case with no surviving physical trace.',
}

export const PUBLIC_RUMOR_CONFLICT_FIXTURE: InformationIntakeReportRecord = {
  id: 'intake:public-rumor-early',
  label: 'Public rumor chain — warehouse lights',
  topicRef: 'topic:canal-bridge-incident',
  initialSourceClass: 'rumor_chain',
  credibility: 'very_low',
  plausibility: 'uncertain',
  rumorRisk: 'high',
  verificationStatus: 'unverified',
  confidenceScore: 0.22,
  corroborationHistory: [],
  contradictionHistory: [],
  retainedDespiteContradiction: true,
  summary: 'Community forum claims repeating light pulses; no institutional corroboration yet.',
}

export const FORMAL_ALERT_PARTIAL_FIXTURE: InformationIntakeReportRecord = {
  id: 'intake:formal-sensor-trace',
  label: 'Formal alert — thermal spike',
  topicRef: 'topic:canal-bridge-incident',
  initialSourceClass: 'formal_alert',
  credibility: 'institutional',
  plausibility: 'plausible',
  rumorRisk: 'none',
  verificationStatus: 'partially_corroborated',
  confidenceScore: 0.58,
  corroborationHistory: [
    {
      eventId: 'corr:thermal-1',
      week: 12,
      sourceRef: 'sensor:district-thermal-grid',
      sourceClass: 'technical_trace',
      weight: 0.45,
      note: 'Single-grid thermal anomaly within tolerance band.',
    },
  ],
  contradictionHistory: [],
  retainedDespiteContradiction: true,
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isIntakeSourceClass(value: string): value is IntakeSourceClass {
  return SOURCE_CLASS_SET.has(value)
}

export function isInformationVerificationStatus(
  value: string
): value is InformationVerificationStatus {
  return VERIFICATION_STATUS_SET.has(value)
}

export function isCredibilityBand(value: string): value is CredibilityBand {
  return CREDIBILITY_SET.has(value)
}

export function isPlausibilityBand(value: string): value is PlausibilityBand {
  return PLAUSIBILITY_SET.has(value)
}

export function isRumorRiskBand(value: string): value is RumorRiskBand {
  return RUMOR_RISK_SET.has(value)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

function roundScore(value: number) {
  return Math.round(clamp01(value) * 1000) / 1000
}

function pushIssue(
  issues: InformationIntakeReportValidationIssue[],
  issue: InformationIntakeReportValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: InformationIntakeReportValidationIssue[]) {
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

function containsForbiddenLiteral(value: string) {
  const lower = value.toLowerCase()
  return FORBIDDEN_LITERAL_TOKENS.some((token) => lower.includes(token))
}

function scanForbiddenLiterals(record: InformationIntakeReportRecord, issues: InformationIntakeReportValidationIssue[]) {
  const fields: Array<[string, string | undefined]> = [
    ['id', record.id],
    ['label', record.label],
    ['topicRef', record.topicRef],
    ['summary', record.summary],
  ]

  for (const [fieldName, fieldValue] of fields) {
    if (!fieldValue) {
      continue
    }

    if (containsForbiddenLiteral(fieldValue)) {
      pushIssue(issues, {
        code: 'franchise_literal_token',
        detail: `Field ${fieldName} contains forbidden franchise literal token.`,
        severity: 'error',
        relatedIds: [record.id],
      })
    }
  }
}

function validateCorroborationEvent(
  event: CorroborationEvent,
  reportId: string,
  issues: InformationIntakeReportValidationIssue[],
  seenEventIds: Set<string>
) {
  const eventId = normalizeToken(event.eventId)
  const sourceRef = normalizeToken(event.sourceRef)

  if (!eventId || !sourceRef || !isFiniteWeek(event.week)) {
    pushIssue(issues, {
      code: 'invalid_corroboration_event',
      detail: `Report ${reportId} has invalid corroboration event payload.`,
      severity: 'error',
      relatedIds: [reportId],
    })
    return
  }

  if (!isIntakeSourceClass(event.sourceClass)) {
    pushIssue(issues, {
      code: 'invalid_corroboration_event',
      detail: `Report ${reportId} corroboration event ${eventId} has invalid sourceClass.`,
      severity: 'error',
      relatedIds: [reportId],
    })
  }

  if (!Number.isFinite(event.weight) || event.weight < 0 || event.weight > 1) {
    pushIssue(issues, {
      code: 'invalid_corroboration_event',
      detail: `Report ${reportId} corroboration event ${eventId} has out-of-range weight.`,
      severity: 'error',
      relatedIds: [reportId],
    })
  }

  if (seenEventIds.has(eventId)) {
    pushIssue(issues, {
      code: 'duplicate_corroboration_event_id',
      detail: `Report ${reportId} has duplicate corroboration event id ${eventId}.`,
      severity: 'error',
      relatedIds: [reportId],
    })
  } else {
    seenEventIds.add(eventId)
  }
}

function validateContradictionEvent(
  event: ContradictionEvent,
  reportId: string,
  issues: InformationIntakeReportValidationIssue[],
  seenEventIds: Set<string>
) {
  const eventId = normalizeToken(event.eventId)
  const sourceRef = normalizeToken(event.sourceRef)

  if (!eventId || !sourceRef || !isFiniteWeek(event.week)) {
    pushIssue(issues, {
      code: 'invalid_contradiction_event',
      detail: `Report ${reportId} has invalid contradiction event payload.`,
      severity: 'error',
      relatedIds: [reportId],
    })
    return
  }

  if (event.severity !== 'minor' && event.severity !== 'major') {
    pushIssue(issues, {
      code: 'invalid_contradiction_event',
      detail: `Report ${reportId} contradiction event ${eventId} has invalid severity.`,
      severity: 'error',
      relatedIds: [reportId],
    })
  }

  if (seenEventIds.has(eventId)) {
    pushIssue(issues, {
      code: 'duplicate_contradiction_event_id',
      detail: `Report ${reportId} has duplicate contradiction event id ${eventId}.`,
      severity: 'error',
      relatedIds: [reportId],
    })
  } else {
    seenEventIds.add(eventId)
  }
}

function sumCorroborationWeight(history: readonly CorroborationEvent[]) {
  return history.reduce((total, event) => total + clamp01(event.weight), 0)
}

function sumContradictionPenalty(history: readonly ContradictionEvent[]) {
  return history.reduce((total, event) => {
    return total + (event.severity === 'major' ? MAJOR_CONTRADICTION_PENALTY : MINOR_CONTRADICTION_PENALTY)
  }, 0)
}

function maxStatus(
  left: InformationVerificationStatus,
  right: InformationVerificationStatus
): InformationVerificationStatus {
  return STATUS_RANK[left] >= STATUS_RANK[right] ? left : right
}

function statusFromCorroborationWeight(totalWeight: number): InformationVerificationStatus {
  if (totalWeight >= ESCALATED_CORROBORATION_THRESHOLD) {
    return 'escalated_confidence'
  }

  if (totalWeight >= VERIFIED_CORROBORATION_THRESHOLD) {
    return 'verified'
  }

  if (totalWeight >= PARTIAL_CORROBORATION_THRESHOLD) {
    return 'partially_corroborated'
  }

  return 'unverified'
}

function statusAfterContradiction(
  current: InformationVerificationStatus,
  severity: ContradictionEvent['severity']
): InformationVerificationStatus {
  if (severity === 'major') {
    return current === 'impossible' ? 'impossible' : 'contradicted'
  }

  if (STATUS_RANK[current] > STATUS_RANK.unverified) {
    return 'unverified'
  }

  return current
}

// ---------------------------------------------------------------------------
// Public API — validation
// ---------------------------------------------------------------------------

export function validateInformationIntakeReport(
  record: InformationIntakeReportRecord
): InformationIntakeReportValidationResult {
  const issues: InformationIntakeReportValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const topicRef = normalizeToken(record.topicRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Intake report is missing id.',
      severity: 'error',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      detail: `Intake report ${id || '(unknown)'} is missing label.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!topicRef) {
    pushIssue(issues, {
      code: 'missing_topic_ref',
      detail: `Intake report ${id || '(unknown)'} is missing topicRef.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isIntakeSourceClass(record.initialSourceClass)) {
    pushIssue(issues, {
      code: 'invalid_source_class',
      detail: `Intake report ${id || '(unknown)'} has invalid initialSourceClass.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isInformationVerificationStatus(record.verificationStatus)) {
    pushIssue(issues, {
      code: 'invalid_verification_status',
      detail: `Intake report ${id || '(unknown)'} has invalid verificationStatus.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isCredibilityBand(record.credibility)) {
    pushIssue(issues, {
      code: 'invalid_credibility',
      detail: `Intake report ${id || '(unknown)'} has invalid credibility band.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isPlausibilityBand(record.plausibility)) {
    pushIssue(issues, {
      code: 'invalid_plausibility',
      detail: `Intake report ${id || '(unknown)'} has invalid plausibility band.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isRumorRiskBand(record.rumorRisk)) {
    pushIssue(issues, {
      code: 'invalid_rumor_risk',
      detail: `Intake report ${id || '(unknown)'} has invalid rumorRisk band.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!Number.isFinite(record.confidenceScore) || record.confidenceScore < 0 || record.confidenceScore > 1) {
    pushIssue(issues, {
      code: 'invalid_confidence_score',
      detail: `Intake report ${id || '(unknown)'} has out-of-range confidenceScore.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  const corroborationSeen = new Set<string>()
  for (const event of record.corroborationHistory) {
    validateCorroborationEvent(event, id || '(unknown)', issues, corroborationSeen)
  }

  const contradictionSeen = new Set<string>()
  for (const event of record.contradictionHistory) {
    validateContradictionEvent(event, id || '(unknown)', issues, contradictionSeen)
  }

  scanForbiddenLiterals(record, issues)

  const sorted = sortValidationIssues(issues)
  const hasError = sorted.some((issue) => issue.severity === 'error')

  return {
    valid: !hasError,
    issues: sorted,
  }
}

// ---------------------------------------------------------------------------
// Public API — derivation
// ---------------------------------------------------------------------------

export interface DeriveInitialVerificationStatusInput {
  readonly credibility: CredibilityBand
  readonly plausibility: PlausibilityBand
  readonly rumorRisk: RumorRiskBand
  readonly initialSourceClass: IntakeSourceClass
}

export function deriveInitialVerificationStatus(
  input: DeriveInitialVerificationStatusInput
): InformationVerificationStatus {
  if (input.plausibility === 'implausible' && input.credibility !== 'institutional') {
    return 'impossible'
  }

  if (input.plausibility === 'uncertain' && input.credibility === 'very_low' && input.rumorRisk === 'high') {
    return 'contradicted'
  }

  if (input.credibility === 'institutional' && input.plausibility === 'likely') {
    return 'partially_corroborated'
  }

  return 'unverified'
}

export function computeIntakeConfidenceScore(input: {
  readonly credibility: CredibilityBand
  readonly plausibility: PlausibilityBand
  readonly rumorRisk: RumorRiskBand
  readonly corroborationHistory: readonly CorroborationEvent[]
  readonly contradictionHistory: readonly ContradictionEvent[]
}): number {
  const base = (CREDIBILITY_SCORE[input.credibility] + PLAUSIBILITY_SCORE[input.plausibility]) / 2
  const rumorPenalty =
    input.rumorRisk === 'high' ? 0.2 : input.rumorRisk === 'elevated' ? 0.1 : input.rumorRisk === 'low' ? 0.05 : 0
  const corroborationBoost = Math.min(0.35, sumCorroborationWeight(input.corroborationHistory) * 0.25)
  const contradictionPenalty = Math.min(0.4, sumContradictionPenalty(input.contradictionHistory))

  return roundScore(base + corroborationBoost - rumorPenalty - contradictionPenalty)
}

export interface CreateInformationIntakeReportInput {
  readonly id: InformationIntakeReportId
  readonly label: string
  readonly topicRef: string
  readonly initialSourceClass: IntakeSourceClass
  readonly credibility: CredibilityBand
  readonly plausibility: PlausibilityBand
  readonly rumorRisk: RumorRiskBand
  readonly verificationStatus?: InformationVerificationStatus
  readonly summary?: string
  readonly retainedDespiteContradiction?: boolean
}

export function createInformationIntakeReport(
  input: CreateInformationIntakeReportInput
): InformationIntakeReportRecord {
  const verificationStatus =
    input.verificationStatus ??
    deriveInitialVerificationStatus({
      credibility: input.credibility,
      plausibility: input.plausibility,
      rumorRisk: input.rumorRisk,
      initialSourceClass: input.initialSourceClass,
    })

  const corroborationHistory: CorroborationEvent[] = []
  const contradictionHistory: ContradictionEvent[] = []

  const confidenceScore = computeIntakeConfidenceScore({
    credibility: input.credibility,
    plausibility: input.plausibility,
    rumorRisk: input.rumorRisk,
    corroborationHistory,
    contradictionHistory,
  })

  const retainedDespiteContradiction =
    input.retainedDespiteContradiction ??
    (verificationStatus === 'impossible' || verificationStatus === 'contradicted')

  return {
    id: normalizeToken(input.id),
    label: normalizeToken(input.label),
    topicRef: normalizeToken(input.topicRef),
    initialSourceClass: input.initialSourceClass,
    credibility: input.credibility,
    plausibility: input.plausibility,
    rumorRisk: input.rumorRisk,
    verificationStatus,
    confidenceScore,
    corroborationHistory,
    contradictionHistory,
    retainedDespiteContradiction,
    summary: input.summary,
  }
}

function resolveStatusAfterCorroboration(
  current: InformationVerificationStatus,
  totalWeight: number
): InformationVerificationStatus {
  const weightStatus = statusFromCorroborationWeight(totalWeight)

  if (current === 'impossible' || current === 'contradicted') {
    if (totalWeight <= 0) {
      return current
    }

    return maxStatus('unverified', weightStatus)
  }

  return maxStatus(current, weightStatus)
}

function buildTransition(
  report: InformationIntakeReportRecord,
  nextStatus: InformationVerificationStatus,
  nextConfidence: number,
  reasonCode: VerificationTransition['reasonCode']
): IntakeReportTransitionResult {
  const fromStatus = report.verificationStatus
  const toStatus = nextStatus
  const confidenceScore = roundScore(nextConfidence)
  const changed = fromStatus !== toStatus || confidenceScore !== report.confidenceScore

  return {
    report: {
      ...report,
      verificationStatus: toStatus,
      confidenceScore,
    },
    transition: {
      fromStatus,
      toStatus,
      reasonCode: changed ? reasonCode : 'status_unchanged',
      confidenceScore,
    },
    changed,
  }
}

// ---------------------------------------------------------------------------
// Public API — transitions
// ---------------------------------------------------------------------------

export function applyCorroborationEvent(
  report: InformationIntakeReportRecord,
  event: CorroborationEvent
): IntakeReportTransitionResult {
  const existing = report.corroborationHistory.find((entry) => entry.eventId === event.eventId)
  const corroborationHistory = existing
    ? report.corroborationHistory
    : [...report.corroborationHistory, event]

  const totalWeight = sumCorroborationWeight(corroborationHistory)
  const nextStatus = resolveStatusAfterCorroboration(report.verificationStatus, totalWeight)
  const nextConfidence = computeIntakeConfidenceScore({
    credibility: report.credibility,
    plausibility: report.plausibility,
    rumorRisk: report.rumorRisk,
    corroborationHistory,
    contradictionHistory: report.contradictionHistory,
  })

  const base = buildTransition(report, nextStatus, nextConfidence, 'corroboration_accumulated')

  return {
    ...base,
    report: {
      ...base.report,
      corroborationHistory,
    },
    changed: base.changed || !existing,
  }
}

export function applyContradictionEvent(
  report: InformationIntakeReportRecord,
  event: ContradictionEvent
): IntakeReportTransitionResult {
  const existing = report.contradictionHistory.find((entry) => entry.eventId === event.eventId)
  const contradictionHistory = existing
    ? report.contradictionHistory
    : [...report.contradictionHistory, event]

  const nextStatus = report.retainedDespiteContradiction
    ? statusAfterContradiction(report.verificationStatus, event.severity)
    : report.verificationStatus

  const nextConfidence = computeIntakeConfidenceScore({
    credibility: report.credibility,
    plausibility: report.plausibility,
    rumorRisk: report.rumorRisk,
    corroborationHistory: report.corroborationHistory,
    contradictionHistory,
  })

  const base = buildTransition(report, nextStatus, nextConfidence, 'contradiction_recorded')

  return {
    ...base,
    report: {
      ...base.report,
      contradictionHistory,
      retainedDespiteContradiction: true,
    },
    changed: base.changed || !existing,
  }
}

// ---------------------------------------------------------------------------
// Public API — mixed-source summary
// ---------------------------------------------------------------------------

export function summarizeMixedSourceIntake(
  reports: readonly InformationIntakeReportRecord[]
): MixedSourceIntakeSummary {
  const topicRef = normalizeToken(reports[0]?.topicRef) || '(unknown)'
  const verificationStatuses = reports.map((report) => report.verificationStatus)
  const hasIncompleteIntake = reports.some(
    (report) =>
      report.verificationStatus === 'unverified' ||
      report.verificationStatus === 'impossible' ||
      report.verificationStatus === 'contradicted'
  )
  const highConfidenceStatuses = new Set<InformationVerificationStatus>([
    'partially_corroborated',
    'verified',
    'escalated_confidence',
  ])
  const lowConfidenceStatuses = new Set<InformationVerificationStatus>([
    'impossible',
    'contradicted',
    'unverified',
  ])
  const hasConflictingVerification =
    verificationStatuses.some((status) => highConfidenceStatuses.has(status)) &&
    verificationStatuses.some((status) => lowConfidenceStatuses.has(status))

  const dominantVerificationStatus = verificationStatuses.reduce<InformationVerificationStatus>(
    (current, status) => maxStatus(current, status),
    'unverified'
  )

  const rumorSeparatedCount = reports.filter((report) => report.rumorRisk !== 'none').length

  const structuredReasons = [
    `topic:${topicRef}`,
    `report_count:${reports.length}`,
    hasIncompleteIntake ? 'incomplete_intake' : 'intake_complete_band',
    hasConflictingVerification ? 'verification_conflict' : 'verification_coherent',
    rumorSeparatedCount > 0 ? 'rumor_separated' : 'no_rumor_channel',
  ].sort((left, right) => left.localeCompare(right))

  return {
    topicRef,
    reportCount: reports.length,
    hasIncompleteIntake,
    hasConflictingVerification,
    dominantVerificationStatus,
    rumorSeparatedCount,
    structuredReasons,
  }
}

// ---------------------------------------------------------------------------
// Persistence sanitize (SPE-854 slice 2)
// ---------------------------------------------------------------------------

export type InformationIntakeReportsMap = Record<string, InformationIntakeReportRecord>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseCorroborationEvent(value: unknown): CorroborationEvent | null {
  if (!isRecord(value)) {
    return null
  }

  const eventId = normalizeToken(value.eventId)
  const sourceRef = normalizeToken(value.sourceRef)
  if (!eventId || !sourceRef || !isFiniteWeek(value.week)) {
    return null
  }

  if (!isIntakeSourceClass(value.sourceClass)) {
    return null
  }

  if (!Number.isFinite(value.weight) || value.weight < 0 || value.weight > 1) {
    return null
  }

  const note =
    typeof value.note === 'string' && value.note.trim().length > 0 ? value.note.trim() : undefined

  return {
    eventId,
    week: value.week,
    sourceRef,
    sourceClass: value.sourceClass,
    weight: value.weight,
    ...(note ? { note } : {}),
  }
}

function parseContradictionEvent(value: unknown): ContradictionEvent | null {
  if (!isRecord(value)) {
    return null
  }

  const eventId = normalizeToken(value.eventId)
  const sourceRef = normalizeToken(value.sourceRef)
  if (!eventId || !sourceRef || !isFiniteWeek(value.week)) {
    return null
  }

  if (value.severity !== 'minor' && value.severity !== 'major') {
    return null
  }

  const note =
    typeof value.note === 'string' && value.note.trim().length > 0 ? value.note.trim() : undefined

  return {
    eventId,
    week: value.week,
    sourceRef,
    severity: value.severity,
    ...(note ? { note } : {}),
  }
}

function parseCorroborationHistory(value: unknown): readonly CorroborationEvent[] {
  if (!Array.isArray(value)) {
    return []
  }

  const events: CorroborationEvent[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    const parsed = parseCorroborationEvent(entry)
    if (!parsed || seen.has(parsed.eventId)) {
      continue
    }

    seen.add(parsed.eventId)
    events.push(parsed)
  }

  return events
}

function parseContradictionHistory(value: unknown): readonly ContradictionEvent[] {
  if (!Array.isArray(value)) {
    return []
  }

  const events: ContradictionEvent[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    const parsed = parseContradictionEvent(entry)
    if (!parsed || seen.has(parsed.eventId)) {
      continue
    }

    seen.add(parsed.eventId)
    events.push(parsed)
  }

  return events
}

function sanitizeInformationIntakeReportEntry(value: unknown): InformationIntakeReportRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const topicRef = normalizeToken(value.topicRef)

  if (
    !id ||
    !label ||
    !topicRef ||
    !isIntakeSourceClass(value.initialSourceClass) ||
    !isInformationVerificationStatus(value.verificationStatus) ||
    !isCredibilityBand(value.credibility) ||
    !isPlausibilityBand(value.plausibility) ||
    !isRumorRiskBand(value.rumorRisk) ||
    !Number.isFinite(value.confidenceScore) ||
    value.confidenceScore < 0 ||
    value.confidenceScore > 1
  ) {
    return null
  }

  const corroborationHistory = parseCorroborationHistory(value.corroborationHistory)
  const contradictionHistory = parseContradictionHistory(value.contradictionHistory)
  const retainedDespiteContradiction = value.retainedDespiteContradiction === true
  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined

  const record: InformationIntakeReportRecord = {
    id,
    label,
    topicRef,
    initialSourceClass: value.initialSourceClass,
    credibility: value.credibility,
    plausibility: value.plausibility,
    rumorRisk: value.rumorRisk,
    verificationStatus: value.verificationStatus,
    confidenceScore: value.confidenceScore,
    corroborationHistory,
    contradictionHistory,
    retainedDespiteContradiction,
    ...(summary ? { summary } : {}),
  }

  if (!validateInformationIntakeReport(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical report map keyed by report id; drops invalid and duplicate-id entries. */
export function sanitizeInformationIntakeReports(
  value: unknown,
  fallback: InformationIntakeReportsMap = {}
): InformationIntakeReportsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: InformationIntakeReportsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeInformationIntakeReportEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
