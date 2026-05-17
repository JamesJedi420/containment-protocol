/**
 * SPE-2001: deterministic institutional denial doctrine pressure report.
 *
 * Makes denial-doctrine pressure legible as audit rows, findings, summary counts,
 * and audit-facing lines before any doctrine enforcement engine exists.
 *
 * Pure report helper only. No GameState persistence, weekly tick, runtime
 * enforcement, UI, doctrine validation, policy selection, or real-world modeling.
 */

import type { AccommodationAccessAuditFinding } from './accommodationAccessAudit'
import type { MedicalAccountabilityScorecardFinding } from './medicalAccountabilityScorecard'
import type { MedicalOutcomeDeviationFinding } from './medicalOutcomeDeviationAudit'
import type { StaffTreatmentTelemetryFinding } from './staffTreatmentTelemetry'
import type { TreatmentFailureBlameRoutingFinding } from './treatmentFailureBlameRouting'

export type InstitutionalDenialDoctrinePressureSignalKind =
  | 'approved_language_requirement'
  | 'care_mode_discussion_restricted'
  | 'dissenting_staff_exclusion_pressure'
  | 'treatment_limitation_suppressed'
  | 'subject_side_deflection_reinforced'
  | 'patient_report_dismissed'
  | 'overclassification_pressure'
  | 'material_outcome_suppressed'
  | 'support_access_restricted'

export type InstitutionalDenialDoctrinePressureSeverity =
  | 'info'
  | 'warning'
  | 'critical'

export interface InstitutionalDenialDoctrinePressureSignal {
  signalId: string
  kind: InstitutionalDenialDoctrinePressureSignalKind
  severity?: InstitutionalDenialDoctrinePressureSeverity
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  doctrineId?: string
  week?: number
  pressureScore?: number
  detail?: string
}

export type InstitutionalDenialDoctrinePressureFindingKind =
  | 'approved_language_pressure'
  | 'care_mode_discussion_restriction'
  | 'dissenting_staff_exclusion_pressure'
  | 'treatment_limitation_suppression'
  | 'subject_deflection_reinforcement'
  | 'patient_report_dismissal'
  | 'overclassification_pressure'
  | 'material_outcome_suppression'
  | 'support_access_restriction'
  | 'high_alignment_poor_outcome_pressure'
  | 'insufficient_pressure_evidence'

export interface InstitutionalDenialDoctrinePressureRow {
  rowId: string
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  doctrineId?: string
  week?: number
  pressureScore: number
  signalCount: number
  upstreamFindingCount: number
  contradictionCount: number
}

export interface InstitutionalDenialDoctrinePressureFinding {
  kind: InstitutionalDenialDoctrinePressureFindingKind
  severity: InstitutionalDenialDoctrinePressureSeverity
  rowId: string
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  doctrineId?: string
  week?: number
  detail: string
}

export interface InstitutionalDenialDoctrinePressureReport {
  rows: readonly InstitutionalDenialDoctrinePressureRow[]
  findings: readonly InstitutionalDenialDoctrinePressureFinding[]
  summary: {
    rowCount: number
    approvedLanguagePressureCount: number
    careModeDiscussionRestrictionCount: number
    dissentingStaffExclusionPressureCount: number
    treatmentLimitationSuppressionCount: number
    subjectDeflectionReinforcementCount: number
    patientReportDismissalCount: number
    overclassificationPressureCount: number
    materialOutcomeSuppressionCount: number
    supportAccessRestrictionCount: number
    highAlignmentPoorOutcomePressureCount: number
    insufficientEvidenceCount: number
  }
  lines: readonly string[]
}

export interface InstitutionalDenialDoctrinePressureOptions {
  highPressureThreshold?: number
  criticalPressureThreshold?: number
  minimumEvidenceCount?: number
}

export interface InstitutionalDenialDoctrinePressureInput {
  doctrinePressureSignals?: readonly InstitutionalDenialDoctrinePressureSignal[]
  staffTelemetryFindings?: readonly StaffTreatmentTelemetryFinding[]
  medicalDeviationFindings?: readonly MedicalOutcomeDeviationFinding[]
  blameRoutingFindings?: readonly TreatmentFailureBlameRoutingFinding[]
  medicalScorecardFindings?: readonly MedicalAccountabilityScorecardFinding[]
  accommodationFindings?: readonly AccommodationAccessAuditFinding[]
  options?: InstitutionalDenialDoctrinePressureOptions
}

const DEFAULT_OPTIONS: Required<InstitutionalDenialDoctrinePressureOptions> = {
  highPressureThreshold: 70,
  criticalPressureThreshold: 90,
  minimumEvidenceCount: 1,
}

const SEVERITY_RANK: Readonly<Record<InstitutionalDenialDoctrinePressureSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const FINDING_KIND_ORDER: readonly InstitutionalDenialDoctrinePressureFindingKind[] = [
  'subject_deflection_reinforcement',
  'treatment_limitation_suppression',
  'material_outcome_suppression',
  'high_alignment_poor_outcome_pressure',
  'approved_language_pressure',
  'care_mode_discussion_restriction',
  'dissenting_staff_exclusion_pressure',
  'patient_report_dismissal',
  'overclassification_pressure',
  'support_access_restriction',
  'insufficient_pressure_evidence',
]

const SIGNAL_TO_FINDING: Readonly<
  Record<
    InstitutionalDenialDoctrinePressureSignalKind,
    InstitutionalDenialDoctrinePressureFindingKind
  >
> = {
  approved_language_requirement: 'approved_language_pressure',
  care_mode_discussion_restricted: 'care_mode_discussion_restriction',
  dissenting_staff_exclusion_pressure: 'dissenting_staff_exclusion_pressure',
  treatment_limitation_suppressed: 'treatment_limitation_suppression',
  subject_side_deflection_reinforced: 'subject_deflection_reinforcement',
  patient_report_dismissed: 'patient_report_dismissal',
  overclassification_pressure: 'overclassification_pressure',
  material_outcome_suppressed: 'material_outcome_suppression',
  support_access_restricted: 'support_access_restriction',
}

const CONTRADICTION_SIGNAL_KINDS = new Set<InstitutionalDenialDoctrinePressureSignalKind>([
  'material_outcome_suppressed',
  'overclassification_pressure',
  'patient_report_dismissed',
])

const CONTRADICTION_FINDING_KINDS = new Set<InstitutionalDenialDoctrinePressureFindingKind>([
  'material_outcome_suppression',
  'high_alignment_poor_outcome_pressure',
  'overclassification_pressure',
  'patient_report_dismissal',
  'subject_deflection_reinforcement',
])

const CRITICAL_DEVIATION_KINDS = new Set<MedicalOutcomeDeviationFinding['kind']>([
  'outcome_below_prediction',
  'symptom_burden_not_improved',
  'symptom_burden_worsened',
  'escalation_above_expected',
])

const AGGREGATE_KEY = 'aggregate\0'

interface RowBucket {
  key: string
  rowId: string
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  doctrineId?: string
  week?: number
  signals: InstitutionalDenialDoctrinePressureSignal[]
  staffFindings: StaffTreatmentTelemetryFinding[]
  deviationFindings: MedicalOutcomeDeviationFinding[]
  blameFindings: TreatmentFailureBlameRoutingFinding[]
  scorecardFindings: MedicalAccountabilityScorecardFinding[]
  accommodationFindings: AccommodationAccessAuditFinding[]
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeWeek(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, Math.trunc(value))
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isValidSignalKind(value: unknown): value is InstitutionalDenialDoctrinePressureSignalKind {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(SIGNAL_TO_FINDING, value)
  )
}

function encodeRowSegment(value: string): string {
  return encodeURIComponent(value)
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function normalizeMinimumEvidenceCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_OPTIONS.minimumEvidenceCount
  }
  return Math.max(1, Math.trunc(value))
}

function resolveOptions(
  options: InstitutionalDenialDoctrinePressureOptions | undefined
): Required<InstitutionalDenialDoctrinePressureOptions> {
  return {
    highPressureThreshold: clampScore(
      options?.highPressureThreshold ?? DEFAULT_OPTIONS.highPressureThreshold
    ),
    criticalPressureThreshold: clampScore(
      options?.criticalPressureThreshold ?? DEFAULT_OPTIONS.criticalPressureThreshold
    ),
    minimumEvidenceCount: normalizeMinimumEvidenceCount(options?.minimumEvidenceCount),
  }
}

function subjectProtocolWeekKey(
  subjectId: string,
  protocolId: string,
  week: number | undefined
): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `subject\0${subjectId}\0${protocolId}\0${weekPart}`
}

function staffDoctrineWeekKey(
  staffId: string,
  doctrineId: string,
  week: number | undefined
): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `staff-doctrine\0${staffId}\0${doctrineId}\0${weekPart}`
}

function staffWeekKey(staffId: string, week: number | undefined): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `staff\0${staffId}\0${weekPart}`
}

function staffSubjectProtocolWeekKey(
  staffId: string,
  subjectId: string,
  protocolId: string,
  week: number | undefined
): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `staff-subject\0${staffId}\0${subjectId}\0${protocolId}\0${weekPart}`
}

function siteWeekKey(siteId: string, week: number | undefined): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `site\0${siteId}\0${weekPart}`
}

function rowIdForKey(key: string): string {
  if (key === AGGREGATE_KEY) {
    return 'row:aggregate'
  }
  const parts = key.split('\0')
  const type = parts[0] ?? 'unknown'
  const segments = parts.slice(1).map(encodeRowSegment)
  return `row:${type}/${segments.join('/')}`
}

function parseSubjectProtocolWeekKey(key: string): {
  subjectId?: string
  protocolId?: string
  week?: number
} {
  if (!key.startsWith('subject\0')) {
    return {}
  }
  const parts = key.split('\0')
  const subjectId = parts[1]
  const protocolId = parts[2]
  const weekPart = parts[3]
  if (!subjectId || !protocolId) {
    return {}
  }
  return {
    subjectId,
    protocolId,
    week: weekPart && weekPart.length > 0 ? Number(weekPart) : undefined,
  }
}

function parseStaffDoctrineWeekKey(key: string): {
  staffId?: string
  doctrineId?: string
  week?: number
} {
  if (!key.startsWith('staff-doctrine\0')) {
    return {}
  }
  const parts = key.split('\0')
  const staffId = parts[1]
  const doctrineId = parts[2]
  const weekPart = parts[3]
  if (!staffId || !doctrineId) {
    return {}
  }
  return {
    staffId,
    doctrineId,
    week: weekPart && weekPart.length > 0 ? Number(weekPart) : undefined,
  }
}

function parseStaffSubjectProtocolWeekKey(key: string): {
  staffId?: string
  subjectId?: string
  protocolId?: string
  week?: number
} {
  if (!key.startsWith('staff-subject\0')) {
    return {}
  }
  const parts = key.split('\0')
  const staffId = parts[1]
  const subjectId = parts[2]
  const protocolId = parts[3]
  const weekPart = parts[4]
  if (!staffId || !subjectId || !protocolId) {
    return {}
  }
  return {
    staffId,
    subjectId,
    protocolId,
    week: weekPart && weekPart.length > 0 ? Number(weekPart) : undefined,
  }
}

function parseStaffWeekKey(key: string): { staffId?: string; week?: number } {
  if (!key.startsWith('staff\0') || key.startsWith('staff-doctrine\0') || key.startsWith('staff-subject\0')) {
    return {}
  }
  const parts = key.split('\0')
  const staffId = parts[1]
  const weekPart = parts[2]
  if (!staffId) {
    return {}
  }
  return {
    staffId,
    week: weekPart && weekPart.length > 0 ? Number(weekPart) : undefined,
  }
}

function parseSiteWeekKey(key: string): { siteId?: string; week?: number } {
  if (!key.startsWith('site\0')) {
    return {}
  }
  const parts = key.split('\0')
  const siteId = parts[1]
  const weekPart = parts[2]
  if (!siteId) {
    return {}
  }
  return {
    siteId,
    week: weekPart && weekPart.length > 0 ? Number(weekPart) : undefined,
  }
}

function getOrCreateBucket(buckets: Map<string, RowBucket>, key: string): RowBucket {
  const existing = buckets.get(key)
  if (existing) {
    return existing
  }

  const subjectFields = parseSubjectProtocolWeekKey(key)
  const staffDoctrineFields = parseStaffDoctrineWeekKey(key)
  const staffSubjectFields = parseStaffSubjectProtocolWeekKey(key)
  const staffFields = parseStaffWeekKey(key)
  const siteFields = parseSiteWeekKey(key)

  const bucket: RowBucket = {
    key,
    rowId: rowIdForKey(key),
    siteId: siteFields.siteId,
    staffId:
      staffSubjectFields.staffId ?? staffDoctrineFields.staffId ?? staffFields.staffId,
    subjectId: staffSubjectFields.subjectId ?? subjectFields.subjectId,
    protocolId: staffSubjectFields.protocolId ?? subjectFields.protocolId,
    doctrineId: staffDoctrineFields.doctrineId,
    week:
      subjectFields.week ??
      staffSubjectFields.week ??
      staffDoctrineFields.week ??
      staffFields.week ??
      siteFields.week,
    signals: [],
    staffFindings: [],
    deviationFindings: [],
    blameFindings: [],
    scorecardFindings: [],
    accommodationFindings: [],
  }
  buckets.set(key, bucket)
  return bucket
}

function resolveSignalKey(signal: InstitutionalDenialDoctrinePressureSignal): string {
  const subjectId = signal.subjectId
  const protocolId = signal.protocolId
  const week = signal.week
  if (subjectId && protocolId) {
    return subjectProtocolWeekKey(subjectId, protocolId, week)
  }

  const staffId = signal.staffId
  const doctrineId = signal.doctrineId
  if (staffId && doctrineId) {
    return staffDoctrineWeekKey(staffId, doctrineId, week)
  }

  const siteId = signal.siteId
  if (siteId) {
    return siteWeekKey(siteId, week)
  }

  if (staffId) {
    return staffWeekKey(staffId, week)
  }

  return AGGREGATE_KEY
}

function resolveSubjectProtocolFindingKey(input: {
  subjectId?: string
  protocolId?: string
  week?: number
}): string {
  const subjectId = normalizeOptionalString(input.subjectId)
  const protocolId = normalizeOptionalString(input.protocolId)
  const week = normalizeWeek(input.week)
  if (subjectId && protocolId) {
    return subjectProtocolWeekKey(subjectId, protocolId, week)
  }
  return AGGREGATE_KEY
}

function resolveStaffFindingKey(finding: StaffTreatmentTelemetryFinding): string {
  const staffId = normalizeOptionalString(finding.staffId)
  const subjectId = normalizeOptionalString(finding.subjectId)
  const protocolId = normalizeOptionalString(finding.protocolId)
  const week = normalizeWeek(finding.week)
  if (staffId && subjectId && protocolId) {
    return staffSubjectProtocolWeekKey(staffId, subjectId, protocolId, week)
  }
  if (staffId) {
    return staffWeekKey(staffId, week)
  }
  if (subjectId && protocolId) {
    return subjectProtocolWeekKey(subjectId, protocolId, week)
  }
  return AGGREGATE_KEY
}

function resolveScorecardFindingKey(finding: MedicalAccountabilityScorecardFinding): string {
  const subjectKey = resolveSubjectProtocolFindingKey(finding)
  if (subjectKey !== AGGREGATE_KEY) {
    return subjectKey
  }
  const staffId = normalizeOptionalString(finding.staffId)
  if (staffId) {
    return staffWeekKey(staffId, normalizeWeek(finding.week))
  }
  const siteId = normalizeOptionalString(finding.siteId)
  if (siteId) {
    return siteWeekKey(siteId, normalizeWeek(finding.week))
  }
  return AGGREGATE_KEY
}

function dedupeSignals(
  signals: readonly InstitutionalDenialDoctrinePressureSignal[]
): InstitutionalDenialDoctrinePressureSignal[] {
  const seen = new Set<string>()
  const deduped: InstitutionalDenialDoctrinePressureSignal[] = []
  for (const signal of signals) {
    const signalId = normalizeOptionalString(signal.signalId)
    const kind = isValidSignalKind(signal.kind) ? signal.kind : undefined
    if (signalId === undefined || kind === undefined) {
      continue
    }
    if (seen.has(signalId)) {
      continue
    }
    seen.add(signalId)
    deduped.push({
      ...signal,
      signalId,
      kind,
      siteId: normalizeOptionalString(signal.siteId),
      staffId: normalizeOptionalString(signal.staffId),
      subjectId: normalizeOptionalString(signal.subjectId),
      protocolId: normalizeOptionalString(signal.protocolId),
      doctrineId: normalizeOptionalString(signal.doctrineId),
      week: normalizeWeek(signal.week),
      pressureScore:
        signal.pressureScore === undefined ? undefined : clampScore(signal.pressureScore),
      detail: normalizeOptionalString(signal.detail),
    })
  }
  return deduped
}

function scoreFromSeverity(
  severity: InstitutionalDenialDoctrinePressureSeverity | undefined
): number {
  if (severity === 'critical') {
    return 100
  }
  if (severity === 'warning') {
    return 75
  }
  if (severity === 'info') {
    return 25
  }
  return 50
}

function signalPressureScore(signal: InstitutionalDenialDoctrinePressureSignal): number {
  if (signal.pressureScore !== undefined) {
    return clampScore(signal.pressureScore)
  }
  return scoreFromSeverity(signal.severity)
}

function hasMedicalAccountabilityContext(bucket: RowBucket): boolean {
  return (
    bucket.signals.length > 0 ||
    bucket.deviationFindings.length > 0 ||
    bucket.scorecardFindings.length > 0
  )
}

function hasExplicitDoctrineSignal(bucket: RowBucket): boolean {
  return bucket.signals.length > 0
}

function countContradictionEvidence(bucket: RowBucket): number {
  let count = 0
  for (const signal of bucket.signals) {
    if (CONTRADICTION_SIGNAL_KINDS.has(signal.kind)) {
      count += 1
    }
    if (signal.kind === 'subject_side_deflection_reinforced') {
      count += 1
    }
  }
  for (const finding of bucket.staffFindings) {
    if (finding.kind === 'high_alignment_low_efficacy') {
      count += 1
    }
  }
  for (const finding of bucket.deviationFindings) {
    if (
      finding.kind === 'governance_notification_candidate' ||
      (finding.severity === 'critical' && CRITICAL_DEVIATION_KINDS.has(finding.kind))
    ) {
      count += 1
    }
  }
  for (const finding of bucket.blameFindings) {
    if (
      finding.kind === 'prohibited_subject_deflection' ||
      finding.kind === 'institutional_accountability_required'
    ) {
      count += 1
    }
  }
  for (const finding of bucket.scorecardFindings) {
    const mapped = mapScorecardKind(finding.kind)
    if (mapped !== undefined && CONTRADICTION_FINDING_KINDS.has(mapped)) {
      count += 1
    }
  }
  for (const finding of bucket.accommodationFindings) {
    if (
      finding.kind === 'outcome_worsened_without_accommodation_review' ||
      finding.kind === 'accountability_route_conflicts_with_limitation'
    ) {
      count += 1
    }
  }
  return count
}

function mapScorecardKind(
  kind: MedicalAccountabilityScorecardFinding['kind']
): InstitutionalDenialDoctrinePressureFindingKind | undefined {
  switch (kind) {
    case 'high_alignment_poor_outcome':
      return 'high_alignment_poor_outcome_pressure'
    case 'subject_deflection_pressure':
      return 'subject_deflection_reinforcement'
    case 'treatment_limitation_unacknowledged':
      return 'treatment_limitation_suppression'
    case 'outcome_accountability_gap':
    case 'governance_review_needed':
      return 'material_outcome_suppression'
    default:
      return undefined
  }
}

function upstreamEvidenceCount(bucket: RowBucket): number {
  return (
    bucket.staffFindings.length +
    bucket.deviationFindings.length +
    bucket.blameFindings.length +
    bucket.scorecardFindings.length +
    bucket.accommodationFindings.length
  )
}

function contributesDeviationEvidence(
  finding: MedicalOutcomeDeviationFinding,
  bucket: RowBucket
): boolean {
  if (finding.kind === 'governance_notification_candidate') {
    return true
  }
  return (
    finding.severity === 'critical' &&
    CRITICAL_DEVIATION_KINDS.has(finding.kind) &&
    hasExplicitDoctrineSignal(bucket)
  )
}

function contributesBlameEvidence(
  finding: TreatmentFailureBlameRoutingFinding,
  bucket: RowBucket
): boolean {
  if (finding.kind === 'prohibited_subject_deflection') {
    return true
  }
  if (finding.kind === 'missing_treatment_limitation_acknowledgment') {
    return true
  }
  if (finding.kind === 'institutional_accountability_required') {
    return hasMedicalAccountabilityContext(bucket)
  }
  return false
}

function contributesAccommodationEvidence(
  finding: AccommodationAccessAuditFinding,
  bucket: RowBucket
): boolean {
  if (finding.kind === 'cure_only_pressure_high') {
    return hasExplicitDoctrineSignal(bucket)
  }
  return (
    finding.kind === 'care_mode_unavailable' ||
    finding.kind === 'treatment_limitation_unacknowledged' ||
    finding.kind === 'outcome_worsened_without_accommodation_review' ||
    finding.kind === 'accountability_route_conflicts_with_limitation'
  )
}

function contributingEvidenceCount(bucket: RowBucket): number {
  let count = bucket.signals.length
  for (const finding of bucket.staffFindings) {
    if (finding.kind === 'high_alignment_low_efficacy') {
      count += 1
    }
  }
  for (const finding of bucket.deviationFindings) {
    if (contributesDeviationEvidence(finding, bucket)) {
      count += 1
    }
  }
  for (const finding of bucket.blameFindings) {
    if (contributesBlameEvidence(finding, bucket)) {
      count += 1
    }
  }
  for (const finding of bucket.scorecardFindings) {
    if (mapScorecardKind(finding.kind) !== undefined) {
      count += 1
    }
  }
  for (const finding of bucket.accommodationFindings) {
    if (contributesAccommodationEvidence(finding, bucket)) {
      count += 1
    }
  }
  return count
}

function resolveUnambiguousOptionalId(
  keyDefined: string | undefined,
  explicitValues: readonly (string | undefined)[],
  upstreamValues: readonly (string | undefined)[]
): string | undefined {
  if (keyDefined !== undefined) {
    return keyDefined
  }

  const explicit = uniqueSorted(
    explicitValues.filter((value): value is string => value !== undefined)
  )
  if (explicit.length > 1) {
    return undefined
  }
  if (explicit.length === 1) {
    return explicit[0]
  }

  const upstream = uniqueSorted(
    upstreamValues.filter((value): value is string => value !== undefined)
  )
  if (upstream.length === 1) {
    return upstream[0]
  }

  return undefined
}

function resolveEnrichedRowMetadata(
  bucket: RowBucket
): Pick<
  InstitutionalDenialDoctrinePressureRow,
  'siteId' | 'staffId' | 'subjectId' | 'protocolId' | 'doctrineId' | 'week'
> {
  if (bucket.key === AGGREGATE_KEY) {
    return { week: bucket.week }
  }

  const signalStaffIds = bucket.signals.map((signal) => signal.staffId)
  const signalSiteIds = bucket.signals.map((signal) => signal.siteId)
  const upstreamStaffIds = [
    ...bucket.staffFindings.map((finding) => normalizeOptionalString(finding.staffId)),
    ...bucket.scorecardFindings.map((finding) => normalizeOptionalString(finding.staffId)),
  ]
  const upstreamSiteIds = [
    ...bucket.accommodationFindings.map((finding) => normalizeOptionalString(finding.siteId)),
    ...bucket.scorecardFindings.map((finding) => normalizeOptionalString(finding.siteId)),
  ]

  return {
    siteId: resolveUnambiguousOptionalId(bucket.siteId, signalSiteIds, upstreamSiteIds),
    staffId: resolveUnambiguousOptionalId(bucket.staffId, signalStaffIds, upstreamStaffIds),
    subjectId: bucket.subjectId,
    protocolId: bucket.protocolId,
    doctrineId: bucket.doctrineId,
    week: bucket.week,
  }
}

function buildRow(bucket: RowBucket): InstitutionalDenialDoctrinePressureRow {
  const signalScores = bucket.signals.map(signalPressureScore)
  const hasEvidence = bucket.signals.length > 0 || upstreamEvidenceCount(bucket) > 0
  const pressureScore =
    signalScores.length > 0
      ? clampScore(Math.max(...signalScores))
      : hasEvidence
        ? 50
        : 0

  return {
    rowId: bucket.rowId,
    ...resolveEnrichedRowMetadata(bucket),
    pressureScore,
    signalCount: bucket.signals.length,
    upstreamFindingCount: upstreamEvidenceCount(bucket),
    contradictionCount: countContradictionEvidence(bucket),
  }
}

function hasCriticalUpstream(bucket: RowBucket): boolean {
  return (
    bucket.deviationFindings.some((finding) => finding.severity === 'critical') ||
    bucket.blameFindings.some((finding) => finding.severity === 'critical') ||
    bucket.scorecardFindings.some((finding) => finding.severity === 'critical') ||
    bucket.accommodationFindings.some((finding) => finding.severity === 'critical')
  )
}

function hasWarningUpstream(bucket: RowBucket): boolean {
  return (
    bucket.deviationFindings.some((finding) => finding.severity === 'warning') ||
    bucket.blameFindings.some((finding) => finding.severity === 'warning') ||
    bucket.scorecardFindings.some((finding) => finding.severity === 'warning') ||
    bucket.accommodationFindings.some((finding) => finding.severity === 'warning')
  )
}

function resolveFindingSeverity(input: {
  row: InstitutionalDenialDoctrinePressureRow
  kind: InstitutionalDenialDoctrinePressureFindingKind
  bucket: RowBucket
  options: Required<InstitutionalDenialDoctrinePressureOptions>
  preserveCritical?: boolean
}): InstitutionalDenialDoctrinePressureSeverity {
  const { row, kind, bucket, options, preserveCritical } = input
  if (kind === 'insufficient_pressure_evidence') {
    return 'info'
  }
  if (preserveCritical || hasCriticalUpstream(bucket)) {
    return 'critical'
  }
  if (
    row.pressureScore >= options.criticalPressureThreshold ||
    (kind === 'material_outcome_suppression' &&
      bucket.deviationFindings.some(
        (finding) =>
          finding.kind === 'governance_notification_candidate' &&
          finding.severity === 'critical'
      ))
  ) {
    return 'critical'
  }
  if (row.pressureScore >= options.highPressureThreshold || hasWarningUpstream(bucket)) {
    return 'warning'
  }
  return 'info'
}

function sharedFindingFields(
  row: InstitutionalDenialDoctrinePressureRow
): Pick<
  InstitutionalDenialDoctrinePressureFinding,
  'rowId' | 'siteId' | 'staffId' | 'subjectId' | 'protocolId' | 'doctrineId' | 'week'
> {
  return {
    rowId: row.rowId,
    siteId: row.siteId,
    staffId: row.staffId,
    subjectId: row.subjectId,
    protocolId: row.protocolId,
    doctrineId: row.doctrineId,
    week: row.week,
  }
}

function pushFinding(
  findings: InstitutionalDenialDoctrinePressureFinding[],
  input: {
    kind: InstitutionalDenialDoctrinePressureFindingKind
    row: InstitutionalDenialDoctrinePressureRow
    bucket: RowBucket
    options: Required<InstitutionalDenialDoctrinePressureOptions>
    detail: string
    preserveCritical?: boolean
  }
): void {
  findings.push({
    kind: input.kind,
    severity: resolveFindingSeverity({
      row: input.row,
      kind: input.kind,
      bucket: input.bucket,
      options: input.options,
      preserveCritical: input.preserveCritical,
    }),
    ...sharedFindingFields(input.row),
    detail: input.detail,
  })
}

function buildRowFindings(
  row: InstitutionalDenialDoctrinePressureRow,
  bucket: RowBucket,
  options: Required<InstitutionalDenialDoctrinePressureOptions>
): InstitutionalDenialDoctrinePressureFinding[] {
  const findings: InstitutionalDenialDoctrinePressureFinding[] = []

  for (const signal of bucket.signals) {
    const kind = SIGNAL_TO_FINDING[signal.kind]
    pushFinding(findings, {
      kind,
      row,
      bucket,
      options,
      detail:
        signal.detail ??
        `Explicit doctrine-pressure signal ${signal.kind} recorded for this row.`,
      preserveCritical: signal.severity === 'critical',
    })
  }

  for (const finding of bucket.staffFindings) {
    if (finding.kind === 'high_alignment_low_efficacy') {
      pushFinding(findings, {
        kind: 'high_alignment_poor_outcome_pressure',
        row,
        bucket,
        options,
        detail:
          finding.detail ||
          'Staff alignment remains high while treatment efficacy or outcomes remain poor.',
      })
    }
  }

  for (const finding of bucket.blameFindings) {
    if (finding.kind === 'prohibited_subject_deflection') {
      pushFinding(findings, {
        kind: 'subject_deflection_reinforcement',
        row,
        bucket,
        options,
        detail: finding.detail,
        preserveCritical: finding.severity === 'critical',
      })
    } else if (finding.kind === 'missing_treatment_limitation_acknowledgment') {
      pushFinding(findings, {
        kind: 'treatment_limitation_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
      })
    } else if (
      finding.kind === 'institutional_accountability_required' &&
      hasMedicalAccountabilityContext(bucket)
    ) {
      pushFinding(findings, {
        kind: 'material_outcome_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
        preserveCritical: finding.severity === 'critical',
      })
    }
  }

  for (const finding of bucket.deviationFindings) {
    if (finding.kind === 'governance_notification_candidate') {
      pushFinding(findings, {
        kind: 'material_outcome_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
        preserveCritical: finding.severity === 'critical',
      })
    } else if (
      finding.severity === 'critical' &&
      CRITICAL_DEVIATION_KINDS.has(finding.kind) &&
      hasExplicitDoctrineSignal(bucket)
    ) {
      pushFinding(findings, {
        kind: 'material_outcome_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
        preserveCritical: true,
      })
    }
  }

  for (const finding of bucket.scorecardFindings) {
    const mapped = mapScorecardKind(finding.kind)
    if (mapped !== undefined) {
      pushFinding(findings, {
        kind: mapped,
        row,
        bucket,
        options,
        detail: finding.detail,
        preserveCritical: finding.severity === 'critical',
      })
    }
  }

  for (const finding of bucket.accommodationFindings) {
    if (finding.kind === 'care_mode_unavailable') {
      pushFinding(findings, {
        kind: 'care_mode_discussion_restriction',
        row,
        bucket,
        options,
        detail: finding.detail,
      })
    } else if (finding.kind === 'treatment_limitation_unacknowledged') {
      pushFinding(findings, {
        kind: 'treatment_limitation_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
      })
    } else if (finding.kind === 'outcome_worsened_without_accommodation_review') {
      pushFinding(findings, {
        kind: 'material_outcome_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
        preserveCritical: finding.severity === 'critical',
      })
    } else if (finding.kind === 'accountability_route_conflicts_with_limitation') {
      pushFinding(findings, {
        kind: row.subjectId ? 'subject_deflection_reinforcement' : 'material_outcome_suppression',
        row,
        bucket,
        options,
        detail: finding.detail,
      })
    } else if (
      finding.kind === 'cure_only_pressure_high' &&
      hasExplicitDoctrineSignal(bucket)
    ) {
      pushFinding(findings, {
        kind: 'care_mode_discussion_restriction',
        row,
        bucket,
        options,
        detail: finding.detail,
      })
    }
  }

  const pressureFindings = findings.filter(
    (finding) => finding.kind !== 'insufficient_pressure_evidence'
  )
  const evidenceCount = contributingEvidenceCount(bucket)
  const hasRowEvidence =
    bucket.signals.length > 0 ||
    bucket.staffFindings.length > 0 ||
    bucket.deviationFindings.length > 0 ||
    bucket.blameFindings.length > 0 ||
    bucket.scorecardFindings.length > 0 ||
    bucket.accommodationFindings.length > 0

  if (
    evidenceCount < options.minimumEvidenceCount ||
    (hasRowEvidence && pressureFindings.length === 0)
  ) {
    pushFinding(findings, {
      kind: 'insufficient_pressure_evidence',
      row,
      bucket,
      options,
      detail:
        pressureFindings.length === 0 && hasRowEvidence
          ? 'Upstream evidence is present but none is eligible for doctrine-pressure findings on this row.'
          : `Fewer than ${options.minimumEvidenceCount} evidence item(s) support this doctrine-pressure row.`,
    })
  }

  return findings
}

function compareRows(
  left: InstitutionalDenialDoctrinePressureRow,
  right: InstitutionalDenialDoctrinePressureRow
): number {
  const siteLeft = left.siteId ?? '\uffff'
  const siteRight = right.siteId ?? '\uffff'
  const siteDelta = siteLeft.localeCompare(siteRight)
  if (siteDelta !== 0) {
    return siteDelta
  }

  const staffLeft = left.staffId ?? '\uffff'
  const staffRight = right.staffId ?? '\uffff'
  const staffDelta = staffLeft.localeCompare(staffRight)
  if (staffDelta !== 0) {
    return staffDelta
  }

  const subjectLeft = left.subjectId ?? '\uffff'
  const subjectRight = right.subjectId ?? '\uffff'
  const subjectDelta = subjectLeft.localeCompare(subjectRight)
  if (subjectDelta !== 0) {
    return subjectDelta
  }

  const protocolLeft = left.protocolId ?? '\uffff'
  const protocolRight = right.protocolId ?? '\uffff'
  const protocolDelta = protocolLeft.localeCompare(protocolRight)
  if (protocolDelta !== 0) {
    return protocolDelta
  }

  const doctrineLeft = left.doctrineId ?? '\uffff'
  const doctrineRight = right.doctrineId ?? '\uffff'
  const doctrineDelta = doctrineLeft.localeCompare(doctrineRight)
  if (doctrineDelta !== 0) {
    return doctrineDelta
  }

  const weekLeft = left.week ?? Number.MAX_SAFE_INTEGER
  const weekRight = right.week ?? Number.MAX_SAFE_INTEGER
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  return left.rowId.localeCompare(right.rowId)
}

function compareFindings(
  left: InstitutionalDenialDoctrinePressureFinding,
  right: InstitutionalDenialDoctrinePressureFinding
): number {
  const severityDelta = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
  if (severityDelta !== 0) {
    return severityDelta
  }

  const kindDelta =
    FINDING_KIND_ORDER.indexOf(left.kind) - FINDING_KIND_ORDER.indexOf(right.kind)
  if (kindDelta !== 0) {
    return kindDelta
  }

  const rowDelta = left.rowId.localeCompare(right.rowId)
  if (rowDelta !== 0) {
    return rowDelta
  }

  const siteDelta = (left.siteId ?? '').localeCompare(right.siteId ?? '')
  if (siteDelta !== 0) {
    return siteDelta
  }

  const staffDelta = (left.staffId ?? '').localeCompare(right.staffId ?? '')
  if (staffDelta !== 0) {
    return staffDelta
  }

  const subjectDelta = (left.subjectId ?? '').localeCompare(right.subjectId ?? '')
  if (subjectDelta !== 0) {
    return subjectDelta
  }

  const protocolDelta = (left.protocolId ?? '').localeCompare(right.protocolId ?? '')
  if (protocolDelta !== 0) {
    return protocolDelta
  }

  const doctrineDelta = (left.doctrineId ?? '').localeCompare(right.doctrineId ?? '')
  if (doctrineDelta !== 0) {
    return doctrineDelta
  }

  const weekLeft = left.week ?? Number.MAX_SAFE_INTEGER
  const weekRight = right.week ?? Number.MAX_SAFE_INTEGER
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  return left.detail.localeCompare(right.detail)
}

function formatFindingLine(
  finding: InstitutionalDenialDoctrinePressureFinding,
  row: InstitutionalDenialDoctrinePressureRow
): string {
  const parts = [finding.severity, finding.kind, finding.rowId]
  if (finding.siteId !== undefined) {
    parts.push(`site:${finding.siteId}`)
  }
  if (finding.staffId !== undefined) {
    parts.push(`staff:${finding.staffId}`)
  }
  if (finding.subjectId !== undefined) {
    parts.push(`subject:${finding.subjectId}`)
  }
  if (finding.protocolId !== undefined) {
    parts.push(`protocol:${finding.protocolId}`)
  }
  if (finding.doctrineId !== undefined) {
    parts.push(`doctrine:${finding.doctrineId}`)
  }
  if (finding.week !== undefined) {
    parts.push(`week:${finding.week}`)
  }
  parts.push(`pressure:${row.pressureScore}`)
  parts.push(finding.detail)
  return parts.join(' · ')
}

function formatReportLines(
  rows: readonly InstitutionalDenialDoctrinePressureRow[],
  findings: readonly InstitutionalDenialDoctrinePressureFinding[]
): string[] {
  const criticalCount = findings.filter((finding) => finding.severity === 'critical').length
  if (rows.length === 0 && findings.length === 0) {
    return [
      'Institutional denial doctrine pressure: rows=0, findings=0, critical=0',
    ]
  }

  const rowById = new Map(rows.map((row) => [row.rowId, row]))
  return [
    `Institutional denial doctrine pressure: rows=${rows.length}, findings=${findings.length}, critical=${criticalCount}`,
    ...findings.map((finding) =>
      formatFindingLine(finding, rowById.get(finding.rowId) ?? {
        rowId: finding.rowId,
        pressureScore: 0,
        signalCount: 0,
        upstreamFindingCount: 0,
        contradictionCount: 0,
      })
    ),
  ]
}

function emptySummary(): InstitutionalDenialDoctrinePressureReport['summary'] {
  return {
    rowCount: 0,
    approvedLanguagePressureCount: 0,
    careModeDiscussionRestrictionCount: 0,
    dissentingStaffExclusionPressureCount: 0,
    treatmentLimitationSuppressionCount: 0,
    subjectDeflectionReinforcementCount: 0,
    patientReportDismissalCount: 0,
    overclassificationPressureCount: 0,
    materialOutcomeSuppressionCount: 0,
    supportAccessRestrictionCount: 0,
    highAlignmentPoorOutcomePressureCount: 0,
    insufficientEvidenceCount: 0,
  }
}

function buildSummary(
  rows: readonly InstitutionalDenialDoctrinePressureRow[],
  findings: readonly InstitutionalDenialDoctrinePressureFinding[]
): InstitutionalDenialDoctrinePressureReport['summary'] {
  const summary = emptySummary()
  summary.rowCount = rows.length
  for (const finding of findings) {
    switch (finding.kind) {
      case 'approved_language_pressure':
        summary.approvedLanguagePressureCount += 1
        break
      case 'care_mode_discussion_restriction':
        summary.careModeDiscussionRestrictionCount += 1
        break
      case 'dissenting_staff_exclusion_pressure':
        summary.dissentingStaffExclusionPressureCount += 1
        break
      case 'treatment_limitation_suppression':
        summary.treatmentLimitationSuppressionCount += 1
        break
      case 'subject_deflection_reinforcement':
        summary.subjectDeflectionReinforcementCount += 1
        break
      case 'patient_report_dismissal':
        summary.patientReportDismissalCount += 1
        break
      case 'overclassification_pressure':
        summary.overclassificationPressureCount += 1
        break
      case 'material_outcome_suppression':
        summary.materialOutcomeSuppressionCount += 1
        break
      case 'support_access_restriction':
        summary.supportAccessRestrictionCount += 1
        break
      case 'high_alignment_poor_outcome_pressure':
        summary.highAlignmentPoorOutcomePressureCount += 1
        break
      case 'insufficient_pressure_evidence':
        summary.insufficientEvidenceCount += 1
        break
      default:
        break
    }
  }
  return summary
}

function emptyReport(): InstitutionalDenialDoctrinePressureReport {
  return {
    rows: [],
    findings: [],
    summary: emptySummary(),
    lines: formatReportLines([], []),
  }
}

export function buildInstitutionalDenialDoctrinePressureReport(
  input?: InstitutionalDenialDoctrinePressureInput | null
): InstitutionalDenialDoctrinePressureReport {
  if (input == null) {
    return emptyReport()
  }

  const options = resolveOptions(input.options)
  const signals = dedupeSignals(input.doctrinePressureSignals ?? [])
  const staffFindings = input.staffTelemetryFindings ?? []
  const deviationFindings = input.medicalDeviationFindings ?? []
  const blameFindings = input.blameRoutingFindings ?? []
  const scorecardFindings = input.medicalScorecardFindings ?? []
  const accommodationFindings = input.accommodationFindings ?? []

  if (
    signals.length === 0 &&
    staffFindings.length === 0 &&
    deviationFindings.length === 0 &&
    blameFindings.length === 0 &&
    scorecardFindings.length === 0 &&
    accommodationFindings.length === 0
  ) {
    return emptyReport()
  }

  const buckets = new Map<string, RowBucket>()

  for (const signal of signals) {
    getOrCreateBucket(buckets, resolveSignalKey(signal)).signals.push(signal)
  }

  for (const finding of staffFindings) {
    getOrCreateBucket(buckets, resolveStaffFindingKey(finding)).staffFindings.push(finding)
  }

  for (const finding of deviationFindings) {
    getOrCreateBucket(
      buckets,
      resolveSubjectProtocolFindingKey(finding)
    ).deviationFindings.push(finding)
  }

  for (const finding of blameFindings) {
    getOrCreateBucket(
      buckets,
      resolveSubjectProtocolFindingKey(finding)
    ).blameFindings.push(finding)
  }

  for (const finding of scorecardFindings) {
    getOrCreateBucket(buckets, resolveScorecardFindingKey(finding)).scorecardFindings.push(
      finding
    )
  }

  for (const finding of accommodationFindings) {
    getOrCreateBucket(
      buckets,
      resolveSubjectProtocolFindingKey(finding)
    ).accommodationFindings.push(finding)
  }

  const sortedBuckets = [...buckets.values()].sort((left, right) =>
    compareRows(buildRow(left), buildRow(right))
  )

  const rows: InstitutionalDenialDoctrinePressureRow[] = []
  const findings: InstitutionalDenialDoctrinePressureFinding[] = []

  for (const bucket of sortedBuckets) {
    const row = buildRow(bucket)
    rows.push(row)
    findings.push(...buildRowFindings(row, bucket, options))
  }

  const sortedFindings = findings.sort(compareFindings)
  const summary = buildSummary(rows, sortedFindings)
  const lines = formatReportLines(rows, sortedFindings)

  return { rows, findings: sortedFindings, summary, lines }
}
