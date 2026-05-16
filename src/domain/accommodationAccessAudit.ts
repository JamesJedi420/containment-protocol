/**
 * SPE-2011: deterministic accommodation access audit.
 *
 * Makes accommodation access versus cure-only doctrine pressure legible as
 * audit rows, findings, summary counts, and audit-facing lines.
 *
 * Pure helper only. No GameState persistence, runtime enforcement, UI,
 * care-mode selector, scorecard mutation, or real-world medical modeling.
 */

import type { MedicalOutcomeDeviationFinding } from './medicalOutcomeDeviationAudit'
import type { TreatmentFailureBlameRoutingFinding } from './treatmentFailureBlameRouting'

export type AccommodationCareMode =
  | 'cure_attempt'
  | 'symptom_management'
  | 'stabilization'
  | 'maintenance'
  | 'accommodation'

export type AccommodationDenialRationale =
  | 'resource_limit'
  | 'protocol_ceiling'
  | 'doctrine_pressure'
  | 'measurement_uncertainty'
  | 'unknown'

export interface AccommodationAccessSignal {
  signalId: string
  subjectId: string
  protocolId: string
  siteId?: string
  week?: number
  requestedCareMode?: AccommodationCareMode
  offeredCareModes?: readonly AccommodationCareMode[]
  accommodationAccessScore?: number
  cureOnlyPressureScore?: number
  treatmentLimitationAcknowledged?: boolean
  denialRationale?: AccommodationDenialRationale
}

export type AccommodationAccessAuditFindingKind =
  | 'accommodation_access_gap'
  | 'cure_only_pressure_high'
  | 'care_mode_unavailable'
  | 'maintenance_framed_as_failure'
  | 'treatment_limitation_unacknowledged'
  | 'outcome_worsened_without_accommodation_review'
  | 'accountability_route_conflicts_with_limitation'
  | 'insufficient_accommodation_evidence'

export type AccommodationAccessAuditSeverity = 'info' | 'warning' | 'critical'

export interface AccommodationAccessAuditRow {
  rowId: string
  signalId: string
  subjectId: string
  protocolId: string
  siteId?: string
  week?: number
  requestedCareMode?: AccommodationCareMode
  offeredCareModes: readonly AccommodationCareMode[]
  accommodationAccessScore?: number
  cureOnlyPressureScore?: number
  treatmentLimitationAcknowledged?: boolean
  denialRationale?: AccommodationDenialRationale
}

export interface AccommodationAccessAuditFinding {
  kind: AccommodationAccessAuditFindingKind
  severity: AccommodationAccessAuditSeverity
  rowId: string
  subjectId: string
  protocolId: string
  siteId?: string
  week?: number
  signalId?: string
  detail: string
}

export interface AccommodationAccessAuditReport {
  rows: readonly AccommodationAccessAuditRow[]
  findings: readonly AccommodationAccessAuditFinding[]
  summary: {
    rowCount: number
    accommodationAccessGapCount: number
    cureOnlyPressureHighCount: number
    careModeUnavailableCount: number
    maintenanceFramedAsFailureCount: number
    treatmentLimitationUnacknowledgedCount: number
    outcomeWorsenedWithoutAccommodationReviewCount: number
    accountabilityRouteConflictCount: number
    insufficientEvidenceCount: number
  }
  lines: readonly string[]
}

export interface AccommodationAccessAuditOptions {
  lowAccommodationAccessThreshold?: number
  highCureOnlyPressureThreshold?: number
  minimumEvidenceCount?: number
}

export interface AccommodationAccessAuditInput {
  accommodationSignals: readonly AccommodationAccessSignal[]
  medicalDeviationFindings?: readonly MedicalOutcomeDeviationFinding[]
  blameRoutingFindings?: readonly TreatmentFailureBlameRoutingFinding[]
  options?: AccommodationAccessAuditOptions
}

const CARE_MODE_SET = new Set<AccommodationCareMode>([
  'accommodation',
  'cure_attempt',
  'maintenance',
  'stabilization',
  'symptom_management',
])

const CARE_MODE_ORDER: readonly AccommodationCareMode[] = [
  'accommodation',
  'cure_attempt',
  'maintenance',
  'stabilization',
  'symptom_management',
]

const DENIAL_RATIONALE_SET = new Set<AccommodationDenialRationale>([
  'resource_limit',
  'protocol_ceiling',
  'doctrine_pressure',
  'measurement_uncertainty',
  'unknown',
])

const LIMITATION_DENIAL_RATIONALES = new Set<AccommodationDenialRationale>([
  'protocol_ceiling',
  'resource_limit',
  'measurement_uncertainty',
])

const OUTCOME_WORSENED_KINDS = new Set<MedicalOutcomeDeviationFinding['kind']>([
  'outcome_below_prediction',
  'symptom_burden_worsened',
  'escalation_above_expected',
])

const ACCOUNTABILITY_CONFLICT_KINDS = new Set<TreatmentFailureBlameRoutingFinding['kind']>([
  'prohibited_subject_deflection',
  'institutional_accountability_required',
])

const SEVERITY_RANK: Readonly<Record<AccommodationAccessAuditSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const FINDING_KIND_ORDER: readonly AccommodationAccessAuditFindingKind[] = [
  'care_mode_unavailable',
  'accommodation_access_gap',
  'cure_only_pressure_high',
  'maintenance_framed_as_failure',
  'treatment_limitation_unacknowledged',
  'outcome_worsened_without_accommodation_review',
  'accountability_route_conflicts_with_limitation',
  'insufficient_accommodation_evidence',
]

const DEFAULT_OPTIONS = {
  lowAccommodationAccessThreshold: 40,
  highCureOnlyPressureThreshold: 70,
  minimumEvidenceCount: 1,
} as const

type ResolvedOptions = {
  lowAccommodationAccessThreshold: number
  highCureOnlyPressureThreshold: number
  minimumEvidenceCount: number
}

function clampThreshold(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeMinimumEvidenceCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_OPTIONS.minimumEvidenceCount
  }
  return Math.max(1, Math.trunc(value))
}

function resolveOptions(options: AccommodationAccessAuditOptions | undefined): ResolvedOptions {
  return {
    lowAccommodationAccessThreshold: clampThreshold(
      options?.lowAccommodationAccessThreshold,
      DEFAULT_OPTIONS.lowAccommodationAccessThreshold
    ),
    highCureOnlyPressureThreshold: clampThreshold(
      options?.highCureOnlyPressureThreshold,
      DEFAULT_OPTIONS.highCureOnlyPressureThreshold
    ),
    minimumEvidenceCount: normalizeMinimumEvidenceCount(options?.minimumEvidenceCount),
  }
}

function normalizeWeek(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, Math.trunc(value))
}

function normalizeOptionalScore(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeCareMode(value: string | undefined): AccommodationCareMode | undefined {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim() as AccommodationCareMode
  return CARE_MODE_SET.has(trimmed) ? trimmed : undefined
}

function normalizeTrimmedString(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeDenialRationale(
  value: string | undefined
): AccommodationDenialRationale | undefined {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim() as AccommodationDenialRationale
  return DENIAL_RATIONALE_SET.has(trimmed) ? trimmed : undefined
}

function normalizeOfferedCareModes(
  modes: readonly AccommodationCareMode[] | undefined
): readonly AccommodationCareMode[] {
  if (modes === undefined || modes.length === 0) {
    return []
  }
  const unique = new Set<AccommodationCareMode>()
  for (const mode of modes) {
    const normalized = normalizeCareMode(mode)
    if (normalized !== undefined) {
      unique.add(normalized)
    }
  }
  return CARE_MODE_ORDER.filter((mode) => unique.has(mode))
}

function dedupeById<T>(rows: readonly T[], resolveId: (row: T) => string): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []
  for (const row of rows) {
    const id = resolveId(row)
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    deduped.push(row)
  }
  return deduped
}

function normalizeSignal(signal: AccommodationAccessSignal): AccommodationAccessSignal {
  return {
    ...signal,
    signalId: normalizeTrimmedString(signal.signalId),
    subjectId: normalizeTrimmedString(signal.subjectId),
    protocolId: normalizeTrimmedString(signal.protocolId),
    siteId: typeof signal.siteId === 'string' ? signal.siteId.trim() || undefined : undefined,
    week: normalizeWeek(signal.week),
    requestedCareMode: normalizeCareMode(signal.requestedCareMode),
    offeredCareModes: normalizeOfferedCareModes(signal.offeredCareModes),
    accommodationAccessScore: normalizeOptionalScore(signal.accommodationAccessScore),
    cureOnlyPressureScore: normalizeOptionalScore(signal.cureOnlyPressureScore),
    treatmentLimitationAcknowledged:
      signal.treatmentLimitationAcknowledged === true
        ? true
        : signal.treatmentLimitationAcknowledged === false
          ? false
          : undefined,
    denialRationale: normalizeDenialRationale(signal.denialRationale),
  }
}

function buildRow(signal: AccommodationAccessSignal): AccommodationAccessAuditRow {
  return {
    rowId: `accommodation:${signal.signalId}`,
    signalId: signal.signalId,
    subjectId: signal.subjectId,
    protocolId: signal.protocolId,
    siteId: signal.siteId,
    week: signal.week,
    requestedCareMode: signal.requestedCareMode,
    offeredCareModes: signal.offeredCareModes ?? [],
    accommodationAccessScore: signal.accommodationAccessScore,
    cureOnlyPressureScore: signal.cureOnlyPressureScore,
    treatmentLimitationAcknowledged: signal.treatmentLimitationAcknowledged,
    denialRationale: signal.denialRationale,
  }
}

function compareRows(
  left: AccommodationAccessAuditRow,
  right: AccommodationAccessAuditRow
): number {
  const siteLeft = left.siteId ?? '\uffff'
  const siteRight = right.siteId ?? '\uffff'
  const siteDelta = siteLeft.localeCompare(siteRight)
  if (siteDelta !== 0) {
    return siteDelta
  }

  const subjectDelta = left.subjectId.localeCompare(right.subjectId)
  if (subjectDelta !== 0) {
    return subjectDelta
  }

  const protocolDelta = left.protocolId.localeCompare(right.protocolId)
  if (protocolDelta !== 0) {
    return protocolDelta
  }

  const weekLeft = left.week ?? Number.POSITIVE_INFINITY
  const weekRight = right.week ?? Number.POSITIVE_INFINITY
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  return left.signalId.localeCompare(right.signalId)
}

function compareFindings(
  left: AccommodationAccessAuditFinding,
  right: AccommodationAccessAuditFinding
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

  const siteLeft = left.siteId ?? '\uffff'
  const siteRight = right.siteId ?? '\uffff'
  const siteDelta = siteLeft.localeCompare(siteRight)
  if (siteDelta !== 0) {
    return siteDelta
  }

  const subjectDelta = left.subjectId.localeCompare(right.subjectId)
  if (subjectDelta !== 0) {
    return subjectDelta
  }

  const protocolDelta = left.protocolId.localeCompare(right.protocolId)
  if (protocolDelta !== 0) {
    return protocolDelta
  }

  const weekLeft = left.week ?? Number.POSITIVE_INFINITY
  const weekRight = right.week ?? Number.POSITIVE_INFINITY
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  const rowDelta = left.rowId.localeCompare(right.rowId)
  if (rowDelta !== 0) {
    return rowDelta
  }

  const signalLeft = left.signalId ?? '\uffff'
  const signalRight = right.signalId ?? '\uffff'
  return signalLeft.localeCompare(signalRight)
}

function upstreamPairKey(subjectId: string, protocolId: string): string {
  return `${subjectId}\0${protocolId}`
}

type UpstreamFindingBucket<T> = {
  byWeek: Map<number, T[]>
  noWeek: T[]
}

function buildUpstreamFindingIndex<T extends { subjectId: string; protocolId: string; week?: number }>(
  findings: readonly T[]
): Map<string, UpstreamFindingBucket<T>> {
  const index = new Map<string, UpstreamFindingBucket<T>>()
  for (const finding of findings) {
    const key = upstreamPairKey(finding.subjectId, finding.protocolId)
    let bucket = index.get(key)
    if (bucket === undefined) {
      bucket = { byWeek: new Map(), noWeek: [] }
      index.set(key, bucket)
    }
    if (finding.week !== undefined) {
      const weekFindings = bucket.byWeek.get(finding.week) ?? []
      weekFindings.push(finding)
      bucket.byWeek.set(finding.week, weekFindings)
    } else {
      bucket.noWeek.push(finding)
    }
  }
  return index
}

function getUpstreamCandidates<T extends { subjectId: string; protocolId: string; week?: number }>(
  row: AccommodationAccessAuditRow,
  index: Map<string, UpstreamFindingBucket<T>>
): readonly T[] {
  const bucket = index.get(upstreamPairKey(row.subjectId, row.protocolId))
  if (bucket === undefined) {
    return []
  }
  if (row.week !== undefined) {
    return bucket.byWeek.get(row.week) ?? []
  }
  return bucket.noWeek
}

function sharedFindingFields(row: AccommodationAccessAuditRow): Pick<
  AccommodationAccessAuditFinding,
  'rowId' | 'subjectId' | 'protocolId' | 'siteId' | 'week' | 'signalId'
> {
  return {
    rowId: row.rowId,
    subjectId: row.subjectId,
    protocolId: row.protocolId,
    siteId: row.siteId,
    week: row.week,
    signalId: row.signalId,
  }
}

function mapUpstreamSeverity(
  severity: 'info' | 'warning' | 'critical' | undefined
): AccommodationAccessAuditSeverity {
  return severity === 'critical' ? 'critical' : 'warning'
}

function lacksAccommodationReview(row: AccommodationAccessAuditRow): boolean {
  if (row.requestedCareMode === 'accommodation') {
    return false
  }
  return !row.offeredCareModes.includes('accommodation')
}

function hasLimitationConflictContext(row: AccommodationAccessAuditRow): boolean {
  return (
    row.treatmentLimitationAcknowledged !== true || row.denialRationale === 'doctrine_pressure'
  )
}

function countMeaningfulEvidence(row: AccommodationAccessAuditRow): number {
  let count = 0
  if (row.accommodationAccessScore !== undefined) {
    count += 1
  }
  if (row.cureOnlyPressureScore !== undefined) {
    count += 1
  }
  if (row.requestedCareMode !== undefined) {
    count += 1
  }
  if (row.offeredCareModes.length > 0) {
    count += 1
  }
  if (row.treatmentLimitationAcknowledged === true || row.treatmentLimitationAcknowledged === false) {
    count += 1
  }
  if (row.denialRationale !== undefined) {
    count += 1
  }
  return count
}

function hasLocalTreatmentLimitationUnacknowledged(row: AccommodationAccessAuditRow): boolean {
  return (
    row.denialRationale !== undefined &&
    LIMITATION_DENIAL_RATIONALES.has(row.denialRationale) &&
    row.treatmentLimitationAcknowledged !== true
  )
}

function buildRowFindings(
  row: AccommodationAccessAuditRow,
  options: ResolvedOptions,
  medicalDeviationIndex: Map<string, UpstreamFindingBucket<MedicalOutcomeDeviationFinding>>,
  blameRoutingIndex: Map<string, UpstreamFindingBucket<TreatmentFailureBlameRoutingFinding>>
): AccommodationAccessAuditFinding[] {
  const findings: AccommodationAccessAuditFinding[] = []
  const shared = sharedFindingFields(row)
  const medicalDeviationFindings = getUpstreamCandidates(row, medicalDeviationIndex)
  const blameRoutingFindings = getUpstreamCandidates(row, blameRoutingIndex)

  if (
    row.accommodationAccessScore !== undefined &&
    row.accommodationAccessScore <= options.lowAccommodationAccessThreshold
  ) {
    findings.push({
      kind: 'accommodation_access_gap',
      severity: row.accommodationAccessScore === 0 ? 'critical' : 'warning',
      ...shared,
      detail:
        row.accommodationAccessScore === 0
          ? 'Accommodation access score is zero; accommodation pathway appears fully blocked.'
          : `Accommodation access score ${row.accommodationAccessScore} is at or below threshold ${options.lowAccommodationAccessThreshold}.`,
    })
  }

  if (
    row.cureOnlyPressureScore !== undefined &&
    row.cureOnlyPressureScore >= options.highCureOnlyPressureThreshold
  ) {
    findings.push({
      kind: 'cure_only_pressure_high',
      severity: row.cureOnlyPressureScore === 100 ? 'critical' : 'warning',
      ...shared,
      detail:
        row.cureOnlyPressureScore === 100
          ? 'Cure-only doctrine pressure is maximal for this accommodation signal.'
          : `Cure-only doctrine pressure score ${row.cureOnlyPressureScore} is at or above threshold ${options.highCureOnlyPressureThreshold}.`,
    })
  }

  if (
    row.requestedCareMode !== undefined &&
    !row.offeredCareModes.includes(row.requestedCareMode)
  ) {
    const criticalMode =
      row.requestedCareMode === 'accommodation' || row.requestedCareMode === 'maintenance'
    findings.push({
      kind: 'care_mode_unavailable',
      severity: criticalMode ? 'critical' : 'warning',
      ...shared,
      detail: criticalMode
        ? `Requested care mode ${row.requestedCareMode} is not among offered modes for this subject protocol context.`
        : `Requested care mode ${row.requestedCareMode} is not available in the offered care-mode set.`,
    })
  }

  if (
    (row.requestedCareMode === 'maintenance' || row.requestedCareMode === 'accommodation') &&
    row.denialRationale === 'doctrine_pressure' &&
    row.cureOnlyPressureScore !== undefined &&
    row.cureOnlyPressureScore >= options.highCureOnlyPressureThreshold
  ) {
    findings.push({
      kind: 'maintenance_framed_as_failure',
      severity: 'warning',
      ...shared,
      detail:
        'Maintenance or accommodation care was denied under doctrine pressure while cure-only pressure remains high.',
    })
  }

  let treatmentLimitationEmitted = false
  if (hasLocalTreatmentLimitationUnacknowledged(row)) {
    treatmentLimitationEmitted = true
    findings.push({
      kind: 'treatment_limitation_unacknowledged',
      severity: 'warning',
      ...shared,
      detail:
        'Treatment limitation was cited but not explicitly acknowledged in the accommodation access signal.',
    })
  }

  if (!treatmentLimitationEmitted) {
    const upstreamMissingAck = blameRoutingFindings.find(
      (finding) => finding.kind === 'missing_treatment_limitation_acknowledgment'
    )
    if (upstreamMissingAck) {
      treatmentLimitationEmitted = true
      findings.push({
        kind: 'treatment_limitation_unacknowledged',
        severity: 'warning',
        ...shared,
        detail:
          'Upstream blame-routing audit reports missing treatment-limitation acknowledgment for this subject protocol context.',
      })
    }
  }

  const upstreamOutcome = medicalDeviationFindings.find((finding) =>
    OUTCOME_WORSENED_KINDS.has(finding.kind)
  )
  if (upstreamOutcome && lacksAccommodationReview(row)) {
    findings.push({
      kind: 'outcome_worsened_without_accommodation_review',
      severity: mapUpstreamSeverity(upstreamOutcome.severity),
      ...shared,
      detail:
        'Medical outcome deviation was recorded without accommodation offered or requested for review.',
    })
  }

  const upstreamAccountability = blameRoutingFindings.find(
    (finding) =>
      ACCOUNTABILITY_CONFLICT_KINDS.has(finding.kind) && hasLimitationConflictContext(row)
  )
  if (upstreamAccountability) {
    findings.push({
      kind: 'accountability_route_conflicts_with_limitation',
      severity: mapUpstreamSeverity(upstreamAccountability.severity),
      ...shared,
      detail:
        'Accountability routing conflicts with unacknowledged treatment limitations or doctrine pressure on accommodation access.',
    })
  }

  if (countMeaningfulEvidence(row) < options.minimumEvidenceCount) {
    findings.push({
      kind: 'insufficient_accommodation_evidence',
      severity: 'info',
      ...shared,
      detail: `Fewer than ${options.minimumEvidenceCount} meaningful accommodation evidence field(s) support this audit row.`,
    })
  }

  return findings
}

function formatFindingLine(
  finding: AccommodationAccessAuditFinding,
  row: AccommodationAccessAuditRow | undefined
): string {
  const parts = [
    finding.severity,
    finding.kind,
    `subject:${finding.subjectId}`,
    `protocol:${finding.protocolId}`,
  ]
  if (finding.siteId !== undefined) {
    parts.push(`site:${finding.siteId}`)
  }
  if (finding.week !== undefined) {
    parts.push(`week:${finding.week}`)
  }
  if (finding.kind === 'accommodation_access_gap' && row?.accommodationAccessScore !== undefined) {
    parts.push(`score:${row.accommodationAccessScore}`)
  }
  if (finding.kind === 'care_mode_unavailable' && row?.requestedCareMode !== undefined) {
    parts.push(`requested:${row.requestedCareMode}`)
  }
  parts.push(finding.detail)
  return parts.join(' · ')
}

function formatReportLines(
  rows: readonly AccommodationAccessAuditRow[],
  findings: readonly AccommodationAccessAuditFinding[],
  summary: AccommodationAccessAuditReport['summary']
): string[] {
  const rowById = new Map(rows.map((row) => [row.rowId, row]))
  const header = `Accommodation access audit: rows=${rows.length}, findings=${findings.length}, accessGaps=${summary.accommodationAccessGapCount}, cureOnly=${summary.cureOnlyPressureHighCount}`
  if (findings.length === 0) {
    return [header]
  }
  return [
    header,
    ...findings.map((finding) => formatFindingLine(finding, rowById.get(finding.rowId))),
  ]
}

export function buildAccommodationAccessAuditReport(
  input: AccommodationAccessAuditInput
): AccommodationAccessAuditReport {
  const options = resolveOptions(input.options)

  const normalizedSignals = input.accommodationSignals.map(normalizeSignal)
  const validSignals = normalizedSignals.filter(
    (signal) =>
      signal.signalId.length > 0 && signal.subjectId.length > 0 && signal.protocolId.length > 0
  )
  const dedupedSignals = dedupeById(validSignals, (signal) => signal.signalId)
  const rows = dedupedSignals.map(buildRow).sort(compareRows)

  const medicalDeviationIndex = buildUpstreamFindingIndex(input.medicalDeviationFindings ?? [])
  const blameRoutingIndex = buildUpstreamFindingIndex(input.blameRoutingFindings ?? [])

  const findings: AccommodationAccessAuditFinding[] = []
  for (const row of rows) {
    findings.push(...buildRowFindings(row, options, medicalDeviationIndex, blameRoutingIndex))
  }

  findings.sort(compareFindings)

  const summary = {
    rowCount: rows.length,
    accommodationAccessGapCount: 0,
    cureOnlyPressureHighCount: 0,
    careModeUnavailableCount: 0,
    maintenanceFramedAsFailureCount: 0,
    treatmentLimitationUnacknowledgedCount: 0,
    outcomeWorsenedWithoutAccommodationReviewCount: 0,
    accountabilityRouteConflictCount: 0,
    insufficientEvidenceCount: 0,
  }

  for (const finding of findings) {
    switch (finding.kind) {
      case 'accommodation_access_gap':
        summary.accommodationAccessGapCount += 1
        break
      case 'cure_only_pressure_high':
        summary.cureOnlyPressureHighCount += 1
        break
      case 'care_mode_unavailable':
        summary.careModeUnavailableCount += 1
        break
      case 'maintenance_framed_as_failure':
        summary.maintenanceFramedAsFailureCount += 1
        break
      case 'treatment_limitation_unacknowledged':
        summary.treatmentLimitationUnacknowledgedCount += 1
        break
      case 'outcome_worsened_without_accommodation_review':
        summary.outcomeWorsenedWithoutAccommodationReviewCount += 1
        break
      case 'accountability_route_conflicts_with_limitation':
        summary.accountabilityRouteConflictCount += 1
        break
      case 'insufficient_accommodation_evidence':
        summary.insufficientEvidenceCount += 1
        break
      default: {
        const _exhaustive: never = finding.kind
        void _exhaustive
      }
    }
  }

  return {
    rows,
    findings,
    summary,
    lines: formatReportLines(rows, findings, summary),
  }
}
