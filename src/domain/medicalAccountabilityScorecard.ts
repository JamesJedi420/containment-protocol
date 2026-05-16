/**
 * SPE-2008: deterministic medical accountability scorecard.
 *
 * Composes upstream accountability signals from staff treatment telemetry,
 * medical outcome deviation audit, and treatment-failure blame routing into
 * compact scorecard rows, findings, summary counts, and audit-facing lines.
 *
 * Pure composer only. No GameState persistence, UI, doctrine enforcement,
 * policy selection, blame-routing implementation, or real-world medical modeling.
 */

import type { StaffTreatmentTelemetryFinding } from './staffTreatmentTelemetry'
import type { MedicalOutcomeDeviationFinding } from './medicalOutcomeDeviationAudit'
import type { TreatmentFailureBlameRoutingFinding } from './treatmentFailureBlameRouting'

export interface MedicalAccountabilitySiteSignal {
  signalId: string
  siteId: string
  week?: number
  careModeCoverageScore?: number
  accommodationAccessScore?: number
  governanceReviewCapacityScore?: number
  notes?: string
}

export type MedicalAccountabilityScorecardFindingKind =
  | 'high_alignment_poor_outcome'
  | 'outcome_accountability_gap'
  | 'subject_deflection_pressure'
  | 'treatment_limitation_unacknowledged'
  | 'accommodation_access_gap'
  | 'care_mode_missing'
  | 'governance_review_needed'
  | 'insufficient_scorecard_evidence'

export type MedicalAccountabilityScorecardSeverity = 'info' | 'warning' | 'critical'

export interface MedicalAccountabilityScorecardRow {
  rowId: string
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  week?: number
  doctrineAlignmentScore?: number
  treatmentEfficacyScore?: number
  outcomeDeviationCount: number
  subjectDeflectionCount: number
  accountabilityRouteQualityScore?: number
  accommodationAccessScore?: number
  careModeCoverageScore?: number
  governanceReviewPressureScore?: number
}

export interface MedicalAccountabilityScorecardFinding {
  kind: MedicalAccountabilityScorecardFindingKind
  severity: MedicalAccountabilityScorecardSeverity
  rowId: string
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  week?: number
  detail: string
}

export interface MedicalAccountabilityScorecardReport {
  rows: readonly MedicalAccountabilityScorecardRow[]
  findings: readonly MedicalAccountabilityScorecardFinding[]
  summary: {
    rowCount: number
    highAlignmentPoorOutcomeCount: number
    outcomeAccountabilityGapCount: number
    subjectDeflectionPressureCount: number
    treatmentLimitationUnacknowledgedCount: number
    accommodationAccessGapCount: number
    careModeMissingCount: number
    governanceReviewNeededCount: number
    insufficientEvidenceCount: number
  }
  lines: readonly string[]
}

export interface MedicalAccountabilityScorecardOptions {
  highAlignmentThreshold?: number
  poorOutcomeThreshold?: number
  lowAccommodationAccessThreshold?: number
  lowCareModeCoverageThreshold?: number
  highGovernancePressureThreshold?: number
  minimumEvidenceCount?: number
}

const SEVERITY_RANK: Readonly<Record<MedicalAccountabilityScorecardSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const FINDING_KIND_ORDER: readonly MedicalAccountabilityScorecardFindingKind[] = [
  'governance_review_needed',
  'subject_deflection_pressure',
  'outcome_accountability_gap',
  'high_alignment_poor_outcome',
  'treatment_limitation_unacknowledged',
  'accommodation_access_gap',
  'care_mode_missing',
  'insufficient_scorecard_evidence',
]

const OUTCOME_DEVIATION_KINDS = new Set<MedicalOutcomeDeviationFinding['kind']>([
  'outcome_below_prediction',
  'symptom_burden_not_improved',
  'symptom_burden_worsened',
  'escalation_above_expected',
])

const DEFAULT_OPTIONS: Required<MedicalAccountabilityScorecardOptions> = {
  highAlignmentThreshold: 70,
  poorOutcomeThreshold: 40,
  lowAccommodationAccessThreshold: 40,
  lowCareModeCoverageThreshold: 40,
  highGovernancePressureThreshold: 70,
  minimumEvidenceCount: 1,
}

interface RowBucket {
  key: string
  rowId: string
  siteId?: string
  staffId?: string
  subjectId?: string
  protocolId?: string
  week?: number
  staffFindings: StaffTreatmentTelemetryFinding[]
  deviationFindings: MedicalOutcomeDeviationFinding[]
  blameFindings: TreatmentFailureBlameRoutingFinding[]
  siteSignals: MedicalAccountabilitySiteSignal[]
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

function normalizeMinimumEvidenceCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_OPTIONS.minimumEvidenceCount
  }
  return Math.max(1, Math.trunc(value))
}

function resolveOptions(
  options: MedicalAccountabilityScorecardOptions | undefined
): Required<MedicalAccountabilityScorecardOptions> {
  return {
    highAlignmentThreshold: clampScore(
      options?.highAlignmentThreshold ?? DEFAULT_OPTIONS.highAlignmentThreshold
    ),
    poorOutcomeThreshold: clampScore(
      options?.poorOutcomeThreshold ?? DEFAULT_OPTIONS.poorOutcomeThreshold
    ),
    lowAccommodationAccessThreshold: clampScore(
      options?.lowAccommodationAccessThreshold ?? DEFAULT_OPTIONS.lowAccommodationAccessThreshold
    ),
    lowCareModeCoverageThreshold: clampScore(
      options?.lowCareModeCoverageThreshold ?? DEFAULT_OPTIONS.lowCareModeCoverageThreshold
    ),
    highGovernancePressureThreshold: clampScore(
      options?.highGovernancePressureThreshold ?? DEFAULT_OPTIONS.highGovernancePressureThreshold
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

function staffWeekKey(staffId: string, week: number | undefined): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `staff\0${staffId}\0${weekPart}`
}

function siteWeekKey(siteId: string, week: number | undefined): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `site\0${siteId}\0${weekPart}`
}

const AGGREGATE_KEY = 'aggregate\0'

function rowIdForKey(key: string): string {
  if (key === AGGREGATE_KEY) {
    return 'row:aggregate'
  }
  if (key.startsWith('subject\0')) {
    const parts = key.split('\0')
    const subjectId = parts[1] ?? ''
    const protocolId = parts[2] ?? ''
    const weekPart = parts[3] ?? ''
    return `row:subject:${subjectId}:${protocolId}:${weekPart}`
  }
  if (key.startsWith('staff\0')) {
    const parts = key.split('\0')
    const staffId = parts[1] ?? ''
    const weekPart = parts[2] ?? ''
    return `row:staff:${staffId}:${weekPart}`
  }
  if (key.startsWith('site\0')) {
    const parts = key.split('\0')
    const siteId = parts[1] ?? ''
    const weekPart = parts[2] ?? ''
    return `row:site:${siteId}:${weekPart}`
  }
  return `row:unknown:${key}`
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

function parseStaffWeekKey(key: string): { staffId?: string; week?: number } {
  if (!key.startsWith('staff\0')) {
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

function getOrCreateBucket(
  buckets: Map<string, RowBucket>,
  key: string
): RowBucket {
  const existing = buckets.get(key)
  if (existing) {
    return existing
  }

  const subjectFields = parseSubjectProtocolWeekKey(key)
  const staffFields = parseStaffWeekKey(key)
  const siteFields = parseSiteWeekKey(key)

  const bucket: RowBucket = {
    key,
    rowId: rowIdForKey(key),
    siteId: siteFields.siteId,
    staffId: staffFields.staffId,
    subjectId: subjectFields.subjectId,
    protocolId: subjectFields.protocolId,
    week: subjectFields.week ?? staffFields.week ?? siteFields.week,
    staffFindings: [],
    deviationFindings: [],
    blameFindings: [],
    siteSignals: [],
  }
  buckets.set(key, bucket)
  return bucket
}

function resolveStaffFindingKey(finding: StaffTreatmentTelemetryFinding): string {
  const subjectId = finding.subjectId?.trim()
  const protocolId = finding.protocolId?.trim()
  const week = normalizeWeek(finding.week)
  if (subjectId && protocolId) {
    return subjectProtocolWeekKey(subjectId, protocolId, week)
  }
  const staffId = finding.staffId.trim()
  if (staffId.length > 0) {
    return staffWeekKey(staffId, week)
  }
  return AGGREGATE_KEY
}

function resolveDeviationFindingKey(finding: MedicalOutcomeDeviationFinding): string {
  const subjectId = finding.subjectId.trim()
  const protocolId = finding.protocolId.trim()
  if (subjectId.length === 0 || protocolId.length === 0) {
    return AGGREGATE_KEY
  }
  return subjectProtocolWeekKey(subjectId, protocolId, normalizeWeek(finding.week))
}

function resolveBlameFindingKey(finding: TreatmentFailureBlameRoutingFinding): string {
  const subjectId = finding.subjectId.trim()
  const protocolId = finding.protocolId.trim()
  if (subjectId.length === 0 || protocolId.length === 0) {
    return AGGREGATE_KEY
  }
  return subjectProtocolWeekKey(subjectId, protocolId, normalizeWeek(finding.week))
}

function normalizeSiteSignal(signal: MedicalAccountabilitySiteSignal): MedicalAccountabilitySiteSignal {
  return {
    ...signal,
    signalId: signal.signalId.trim(),
    siteId: signal.siteId.trim(),
    week: normalizeWeek(signal.week),
    careModeCoverageScore:
      signal.careModeCoverageScore === undefined
        ? undefined
        : clampScore(signal.careModeCoverageScore),
    accommodationAccessScore:
      signal.accommodationAccessScore === undefined
        ? undefined
        : clampScore(signal.accommodationAccessScore),
    governanceReviewCapacityScore:
      signal.governanceReviewCapacityScore === undefined
        ? undefined
        : clampScore(signal.governanceReviewCapacityScore),
  }
}

function dedupeSiteSignals(
  signals: readonly MedicalAccountabilitySiteSignal[]
): MedicalAccountabilitySiteSignal[] {
  const sorted = [...signals]
    .map(normalizeSiteSignal)
    .filter((signal) => signal.signalId.length > 0 && signal.siteId.length > 0)
    .sort((left, right) => left.signalId.localeCompare(right.signalId))

  const seen = new Set<string>()
  const deduped: MedicalAccountabilitySiteSignal[] = []
  for (const signal of sorted) {
    if (seen.has(signal.signalId)) {
      continue
    }
    seen.add(signal.signalId)
    deduped.push(signal)
  }
  return deduped
}

function meanRounded(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined
  }
  const sum = values.reduce((total, value) => total + value, 0)
  return Math.round(sum / values.length)
}

function deriveDoctrineAlignmentScore(
  staffFindings: readonly StaffTreatmentTelemetryFinding[]
): number | undefined {
  const scores = staffFindings
    .map((finding) => finding.alignmentScore)
    .filter((score): score is number => score !== undefined && Number.isFinite(score))
  if (scores.length > 0) {
    return meanRounded(scores.map(clampScore))
  }

  if (
    staffFindings.some(
      (finding) =>
        finding.kind === 'high_alignment_low_efficacy' ||
        finding.kind === 'outcome_below_expected'
    )
  ) {
    return DEFAULT_OPTIONS.highAlignmentThreshold
  }

  return undefined
}

function deriveTreatmentEfficacyScore(
  staffFindings: readonly StaffTreatmentTelemetryFinding[],
  deviationFindings: readonly MedicalOutcomeDeviationFinding[]
): number | undefined {
  const efficacyScores = staffFindings
    .map((finding) => finding.efficacyScore)
    .filter((score): score is number => score !== undefined && Number.isFinite(score))
  if (efficacyScores.length > 0) {
    return meanRounded(efficacyScores.map(clampScore))
  }

  if (staffFindings.some((finding) => finding.kind === 'high_alignment_low_efficacy')) {
    return DEFAULT_OPTIONS.poorOutcomeThreshold
  }

  const outcomeDeviationCount = deviationFindings.filter((finding) =>
    OUTCOME_DEVIATION_KINDS.has(finding.kind)
  ).length
  if (outcomeDeviationCount > 0) {
    return Math.max(0, DEFAULT_OPTIONS.poorOutcomeThreshold - 5 * (outcomeDeviationCount - 1))
  }

  return undefined
}

function countOutcomeDeviations(
  deviationFindings: readonly MedicalOutcomeDeviationFinding[]
): number {
  return deviationFindings.filter((finding) => OUTCOME_DEVIATION_KINDS.has(finding.kind)).length
}

function countSubjectDeflections(
  blameFindings: readonly TreatmentFailureBlameRoutingFinding[]
): number {
  let count = blameFindings.filter(
    (finding) => finding.kind === 'prohibited_subject_deflection'
  ).length

  const hasInstitutionalRequired = blameFindings.some(
    (finding) => finding.kind === 'institutional_accountability_required'
  )
  const hasNonSubjectApproved = blameFindings.some(
    (finding) =>
      finding.kind === 'approved_accountability_route' &&
      finding.recommendedAccountabilityFocus !== undefined &&
      finding.recommendedAccountabilityFocus !== 'shared'
  )
  if (hasInstitutionalRequired && !hasNonSubjectApproved) {
    count += 1
  }

  return count
}

/**
 * Accountability route quality starts at 50 when blame-routing evidence exists.
 * Penalizes deflection, missing limitation acknowledgment, and institutional gaps;
 * rewards approved routes. Clamped 0–100.
 */
function deriveAccountabilityRouteQualityScore(
  blameFindings: readonly TreatmentFailureBlameRoutingFinding[]
): number | undefined {
  if (blameFindings.length === 0) {
    return undefined
  }

  let score = 50
  for (const finding of blameFindings) {
    switch (finding.kind) {
      case 'prohibited_subject_deflection':
        score -= 25
        break
      case 'missing_treatment_limitation_acknowledgment':
        score -= 15
        break
      case 'institutional_accountability_required':
        score -= 20
        break
      case 'approved_accountability_route':
        score += 10
        break
      default:
        break
    }
  }

  return clampScore(score)
}

function deriveGovernanceReviewPressureScore(input: {
  deviationFindings: readonly MedicalOutcomeDeviationFinding[]
  blameFindings: readonly TreatmentFailureBlameRoutingFinding[]
  governanceReviewCapacityScore?: number
}): number | undefined {
  const { deviationFindings, blameFindings, governanceReviewCapacityScore } = input

  let pressure = 0
  for (const finding of deviationFindings) {
    if (finding.kind === 'governance_notification_candidate') {
      pressure += finding.severity === 'critical' ? 45 : 30
    } else if (finding.kind === 'escalation_above_expected' && finding.severity === 'critical') {
      pressure += 20
    } else if (finding.kind === 'outcome_below_prediction' && finding.severity === 'critical') {
      pressure += 15
    }
  }

  for (const finding of blameFindings) {
    if (finding.kind === 'institutional_accountability_required') {
      pressure += finding.severity === 'critical' ? 35 : 25
    } else if (
      finding.kind === 'prohibited_subject_deflection' &&
      finding.severity === 'critical'
    ) {
      pressure += 20
    }
  }

  if (
    pressure === 0 &&
    deviationFindings.length === 0 &&
    blameFindings.length === 0 &&
    governanceReviewCapacityScore === undefined
  ) {
    return undefined
  }

  if (governanceReviewCapacityScore !== undefined) {
    pressure = Math.max(0, pressure - Math.round(governanceReviewCapacityScore * 0.5))
  }

  return clampScore(pressure)
}

function deriveSiteScores(siteSignals: readonly MedicalAccountabilitySiteSignal[]): {
  accommodationAccessScore?: number
  careModeCoverageScore?: number
  governanceReviewCapacityScore?: number
} {
  const accommodation = meanRounded(
    siteSignals
      .map((signal) => signal.accommodationAccessScore)
      .filter((score): score is number => score !== undefined)
  )
  const careMode = meanRounded(
    siteSignals
      .map((signal) => signal.careModeCoverageScore)
      .filter((score): score is number => score !== undefined)
  )
  const governanceCapacity = meanRounded(
    siteSignals
      .map((signal) => signal.governanceReviewCapacityScore)
      .filter((score): score is number => score !== undefined)
  )

  return {
    accommodationAccessScore: accommodation,
    careModeCoverageScore: careMode,
    governanceReviewCapacityScore: governanceCapacity,
  }
}

function upstreamEvidenceCount(bucket: RowBucket): number {
  return (
    bucket.staffFindings.length + bucket.deviationFindings.length + bucket.blameFindings.length
  )
}

function buildRow(bucket: RowBucket): MedicalAccountabilityScorecardRow {
  const siteScores = deriveSiteScores(bucket.siteSignals)
  const outcomeDeviationCount = countOutcomeDeviations(bucket.deviationFindings)
  const subjectDeflectionCount = countSubjectDeflections(bucket.blameFindings)

  return {
    rowId: bucket.rowId,
    siteId: bucket.siteId,
    staffId: bucket.staffId,
    subjectId: bucket.subjectId,
    protocolId: bucket.protocolId,
    week: bucket.week,
    doctrineAlignmentScore: deriveDoctrineAlignmentScore(bucket.staffFindings),
    treatmentEfficacyScore: deriveTreatmentEfficacyScore(
      bucket.staffFindings,
      bucket.deviationFindings
    ),
    outcomeDeviationCount,
    subjectDeflectionCount,
    accountabilityRouteQualityScore: deriveAccountabilityRouteQualityScore(bucket.blameFindings),
    accommodationAccessScore: siteScores.accommodationAccessScore,
    careModeCoverageScore: siteScores.careModeCoverageScore,
    governanceReviewPressureScore: deriveGovernanceReviewPressureScore({
      deviationFindings: bucket.deviationFindings,
      blameFindings: bucket.blameFindings,
      governanceReviewCapacityScore: siteScores.governanceReviewCapacityScore,
    }),
  }
}

function hasCriticalUpstream(
  bucket: RowBucket
): boolean {
  return (
    bucket.deviationFindings.some((finding) => finding.severity === 'critical') ||
    bucket.blameFindings.some((finding) => finding.severity === 'critical')
  )
}

function buildRowFindings(
  row: MedicalAccountabilityScorecardRow,
  bucket: RowBucket,
  options: Required<MedicalAccountabilityScorecardOptions>
): MedicalAccountabilityScorecardFinding[] {
  const findings: MedicalAccountabilityScorecardFinding[] = []
  const shared = {
    rowId: row.rowId,
    siteId: row.siteId,
    staffId: row.staffId,
    subjectId: row.subjectId,
    protocolId: row.protocolId,
    week: row.week,
  }

  const highAlignmentPoorOutcome =
    (row.doctrineAlignmentScore !== undefined &&
      row.treatmentEfficacyScore !== undefined &&
      row.doctrineAlignmentScore >= options.highAlignmentThreshold &&
      row.treatmentEfficacyScore <= options.poorOutcomeThreshold) ||
    bucket.staffFindings.some((finding) => finding.kind === 'high_alignment_low_efficacy')

  if (highAlignmentPoorOutcome) {
    findings.push({
      kind: 'high_alignment_poor_outcome',
      severity: 'warning',
      ...shared,
      detail:
        'Doctrine alignment remains high while treatment efficacy or observed outcomes remain poor for this scorecard row.',
    })
  }

  const accountabilityLow =
    row.accountabilityRouteQualityScore === undefined ||
    row.accountabilityRouteQualityScore < options.poorOutcomeThreshold
  const blameInsufficient = bucket.blameFindings.some(
    (finding) =>
      finding.kind === 'institutional_accountability_required' ||
      finding.kind === 'insufficient_failure_evidence'
  )

  if (row.outcomeDeviationCount > 0 && (accountabilityLow || blameInsufficient)) {
    findings.push({
      kind: 'outcome_accountability_gap',
      severity: hasCriticalUpstream(bucket) ? 'critical' : 'warning',
      ...shared,
      detail:
        'Outcome deviations are present without sufficient accountability route quality or institutional routing.',
    })
  }

  if (row.subjectDeflectionCount > 0) {
    const criticalDeflection = bucket.blameFindings.some(
      (finding) =>
        finding.kind === 'prohibited_subject_deflection' && finding.severity === 'critical'
    )
    findings.push({
      kind: 'subject_deflection_pressure',
      severity: criticalDeflection ? 'critical' : 'warning',
      ...shared,
      detail:
        'Subject-side deflection or institutional accountability pressure is present on this row.',
    })
  }

  if (
    bucket.blameFindings.some(
      (finding) => finding.kind === 'missing_treatment_limitation_acknowledgment'
    )
  ) {
    findings.push({
      kind: 'treatment_limitation_unacknowledged',
      severity: 'warning',
      ...shared,
      detail: 'Treatment-limitation acknowledgment is missing for proposed institutional accountability.',
    })
  }

  if (
    row.accommodationAccessScore !== undefined &&
    row.accommodationAccessScore < options.lowAccommodationAccessThreshold
  ) {
    findings.push({
      kind: 'accommodation_access_gap',
      severity: 'warning',
      ...shared,
      detail: `Accommodation access score ${row.accommodationAccessScore} is below the configured threshold.`,
    })
  }

  if (
    row.careModeCoverageScore !== undefined &&
    row.careModeCoverageScore < options.lowCareModeCoverageThreshold
  ) {
    findings.push({
      kind: 'care_mode_missing',
      severity: 'warning',
      ...shared,
      detail: `Care-mode coverage score ${row.careModeCoverageScore} is below the configured threshold.`,
    })
  }

  const governanceCritical = bucket.deviationFindings.some(
    (finding) => finding.kind === 'governance_notification_candidate'
  )
  if (
    (row.governanceReviewPressureScore !== undefined &&
      row.governanceReviewPressureScore >= options.highGovernancePressureThreshold) ||
    governanceCritical
  ) {
    findings.push({
      kind: 'governance_review_needed',
      severity: governanceCritical || hasCriticalUpstream(bucket) ? 'critical' : 'warning',
      ...shared,
      detail:
        row.governanceReviewPressureScore !== undefined
          ? `Governance review pressure score ${row.governanceReviewPressureScore} warrants review.`
          : 'Upstream governance notification candidates require review for this row.',
    })
  }

  const evidenceCount = upstreamEvidenceCount(bucket)
  const siteOnly =
    evidenceCount === 0 && bucket.siteSignals.length > 0 && bucket.key.startsWith('site\0')

  if (
    evidenceCount < options.minimumEvidenceCount ||
    siteOnly
  ) {
    findings.push({
      kind: 'insufficient_scorecard_evidence',
      severity: 'info',
      ...shared,
      detail:
        siteOnly
          ? 'Site signal recorded without staff telemetry, deviation audit, or blame-routing evidence for this row.'
          : `Fewer than ${options.minimumEvidenceCount} upstream evidence item(s) support this scorecard row.`,
    })
  }

  return findings
}

function compareRows(left: MedicalAccountabilityScorecardRow, right: MedicalAccountabilityScorecardRow): number {
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

  const weekLeft = left.week ?? Number.MAX_SAFE_INTEGER
  const weekRight = right.week ?? Number.MAX_SAFE_INTEGER
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  return left.rowId.localeCompare(right.rowId)
}

function compareFindings(
  left: MedicalAccountabilityScorecardFinding,
  right: MedicalAccountabilityScorecardFinding
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

  const weekLeft = left.week ?? Number.MAX_SAFE_INTEGER
  const weekRight = right.week ?? Number.MAX_SAFE_INTEGER
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  return left.detail.localeCompare(right.detail)
}

function formatFindingLine(finding: MedicalAccountabilityScorecardFinding): string {
  const parts = [
    finding.severity,
    finding.kind,
    `row:${finding.rowId}`,
  ]
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
  if (finding.week !== undefined) {
    parts.push(`week:${finding.week}`)
  }
  parts.push(finding.detail)
  return parts.join(' · ')
}

function formatReportLines(
  rows: readonly MedicalAccountabilityScorecardRow[],
  findings: readonly MedicalAccountabilityScorecardFinding[]
): string[] {
  const deflectionCount = findings.filter(
    (finding) => finding.kind === 'subject_deflection_pressure'
  ).length
  const governanceCount = findings.filter(
    (finding) => finding.kind === 'governance_review_needed'
  ).length

  if (rows.length === 0 && findings.length === 0) {
    return [
      'Medical accountability scorecard: rows=0, findings=0, deflection=0, governance=0',
    ]
  }

  return [
    `Medical accountability scorecard: rows=${rows.length}, findings=${findings.length}, deflection=${deflectionCount}, governance=${governanceCount}`,
    ...findings.map((finding) => formatFindingLine(finding)),
  ]
}

function emptySummary(): MedicalAccountabilityScorecardReport['summary'] {
  return {
    rowCount: 0,
    highAlignmentPoorOutcomeCount: 0,
    outcomeAccountabilityGapCount: 0,
    subjectDeflectionPressureCount: 0,
    treatmentLimitationUnacknowledgedCount: 0,
    accommodationAccessGapCount: 0,
    careModeMissingCount: 0,
    governanceReviewNeededCount: 0,
    insufficientEvidenceCount: 0,
  }
}

export function buildMedicalAccountabilityScorecard(input: {
  staffTelemetryFindings?: readonly StaffTreatmentTelemetryFinding[]
  medicalDeviationFindings?: readonly MedicalOutcomeDeviationFinding[]
  blameRoutingFindings?: readonly TreatmentFailureBlameRoutingFinding[]
  siteSignals?: readonly MedicalAccountabilitySiteSignal[]
  options?: MedicalAccountabilityScorecardOptions
}): MedicalAccountabilityScorecardReport {
  const options = resolveOptions(input.options)
  const staffFindings = input.staffTelemetryFindings ?? []
  const deviationFindings = input.medicalDeviationFindings ?? []
  const blameFindings = input.blameRoutingFindings ?? []
  const siteSignals = dedupeSiteSignals(input.siteSignals ?? [])

  if (
    staffFindings.length === 0 &&
    deviationFindings.length === 0 &&
    blameFindings.length === 0 &&
    siteSignals.length === 0
  ) {
    return {
      rows: [],
      findings: [],
      summary: emptySummary(),
      lines: formatReportLines([], []),
    }
  }

  const buckets = new Map<string, RowBucket>()

  for (const finding of staffFindings) {
    const bucket = getOrCreateBucket(buckets, resolveStaffFindingKey(finding))
    if (bucket.staffId === undefined && finding.staffId.trim().length > 0) {
      bucket.staffId = finding.staffId.trim()
    }
    bucket.staffFindings.push(finding)
  }

  for (const finding of deviationFindings) {
    getOrCreateBucket(buckets, resolveDeviationFindingKey(finding)).deviationFindings.push(finding)
  }

  for (const finding of blameFindings) {
    getOrCreateBucket(buckets, resolveBlameFindingKey(finding)).blameFindings.push(finding)
  }

  for (const signal of siteSignals) {
    getOrCreateBucket(buckets, siteWeekKey(signal.siteId, signal.week)).siteSignals.push(signal)
  }

  const rows: MedicalAccountabilityScorecardRow[] = []
  const findings: MedicalAccountabilityScorecardFinding[] = []

  for (const bucket of buckets.values()) {
    const row = buildRow(bucket, options)
    rows.push(row)
    findings.push(...buildRowFindings(row, bucket, options))
  }

  rows.sort(compareRows)
  findings.sort(compareFindings)

  const countByKind = (kind: MedicalAccountabilityScorecardFindingKind) =>
    findings.filter((finding) => finding.kind === kind).length

  const summary = {
    rowCount: rows.length,
    highAlignmentPoorOutcomeCount: countByKind('high_alignment_poor_outcome'),
    outcomeAccountabilityGapCount: countByKind('outcome_accountability_gap'),
    subjectDeflectionPressureCount: countByKind('subject_deflection_pressure'),
    treatmentLimitationUnacknowledgedCount: countByKind('treatment_limitation_unacknowledged'),
    accommodationAccessGapCount: countByKind('accommodation_access_gap'),
    careModeMissingCount: countByKind('care_mode_missing'),
    governanceReviewNeededCount: countByKind('governance_review_needed'),
    insufficientEvidenceCount: countByKind('insufficient_scorecard_evidence'),
  }

  return {
    rows,
    findings,
    summary,
    lines: formatReportLines(rows, findings),
  }
}
