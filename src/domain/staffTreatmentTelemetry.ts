/**
 * SPE-2010: deterministic staff doctrine-alignment vs treatment-efficacy telemetry.
 *
 * Compares independent institutional belief-compliance signals with independent
 * patient/subject outcome signals to detect decoupling (high alignment + poor outcomes,
 * low alignment + good outcomes, material expected-vs-actual gaps).
 *
 * Does not enforce doctrine, route blame, render scorecards, persist GameState,
 * import uncertainWorldState, or model real-world medical diagnoses.
 */

export type StaffDoctrineAlignmentSource =
  | 'certification'
  | 'training'
  | 'directive'
  | 'audit'
  | 'manual'

export interface StaffDoctrineAlignmentSignal {
  staffId: string
  doctrineId: string
  alignmentScore: number
  source: StaffDoctrineAlignmentSource
  week?: number
  signalId?: string
}

export interface TreatmentEfficacySignal {
  subjectId: string
  protocolId: string
  staffId?: string
  expectedOutcomeScore: number
  actualOutcomeScore: number
  symptomBurdenDelta?: number
  escalationCount?: number
  week?: number
  signalId?: string
}

export type StaffTreatmentTelemetryFindingKind =
  | 'high_alignment_low_efficacy'
  | 'low_alignment_high_efficacy'
  | 'outcome_below_expected'
  | 'alignment_outcome_decoupled'
  | 'insufficient_evidence'

export interface StaffTreatmentTelemetryFinding {
  kind: StaffTreatmentTelemetryFindingKind
  staffId: string
  subjectId?: string
  doctrineId?: string
  protocolId?: string
  week?: number
  alignmentScore?: number
  efficacyScore?: number
  expectedOutcomeScore?: number
  actualOutcomeScore?: number
  outcomeGap?: number
  detail: string
}

export interface StaffTreatmentTelemetryOptions {
  highAlignmentThreshold?: number
  lowAlignmentThreshold?: number
  lowEfficacyThreshold?: number
  highEfficacyThreshold?: number
  outcomeGapThreshold?: number
  minimumEvidenceCount?: number
}

export interface StaffTreatmentTelemetryReport {
  findings: readonly StaffTreatmentTelemetryFinding[]
  summary: {
    pairedObservationCount: number
    insufficientEvidenceCount: number
    highAlignmentLowEfficacyCount: number
    lowAlignmentHighEfficacyCount: number
    outcomeBelowExpectedCount: number
    alignmentOutcomeDecoupledCount: number
    unpairedAlignmentSignalCount: number
    unpairedOutcomeSignalCount: number
  }
  lines: readonly string[]
}

export interface StaffTreatmentTelemetryInput {
  staffSignals: readonly StaffDoctrineAlignmentSignal[]
  treatmentOutcomes: readonly TreatmentEfficacySignal[]
  options?: StaffTreatmentTelemetryOptions
}

const FINDING_KIND_ORDER: readonly StaffTreatmentTelemetryFindingKind[] = [
  'high_alignment_low_efficacy',
  'low_alignment_high_efficacy',
  'outcome_below_expected',
  'alignment_outcome_decoupled',
  'insufficient_evidence',
]

const DEFAULT_OPTIONS: Required<StaffTreatmentTelemetryOptions> = {
  highAlignmentThreshold: 70,
  lowAlignmentThreshold: 40,
  lowEfficacyThreshold: 40,
  highEfficacyThreshold: 70,
  outcomeGapThreshold: 15,
  minimumEvidenceCount: 1,
}

type ScoreBand = 'high' | 'mid' | 'low'

interface AlignmentBucket {
  staffId: string
  week?: number
  alignmentScores: number[]
  doctrineIds: string[]
}

interface OutcomeBucket {
  staffId: string
  week?: number
  outcomes: TreatmentEfficacySignal[]
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

function resolveAlignmentSignalId(signal: StaffDoctrineAlignmentSignal): string {
  const explicit = typeof signal.signalId === 'string' ? signal.signalId.trim() : ''
  if (explicit.length > 0) {
    return explicit
  }
  const week = normalizeWeek(signal.week)
  return `align:${signal.staffId}:${signal.doctrineId}:${signal.source}:${week ?? ''}`
}

function resolveOutcomeSignalId(signal: TreatmentEfficacySignal): string {
  const explicit = typeof signal.signalId === 'string' ? signal.signalId.trim() : ''
  if (explicit.length > 0) {
    return explicit
  }
  const week = normalizeWeek(signal.week)
  return `outcome:${signal.subjectId}:${signal.protocolId}:${signal.staffId ?? ''}:${week ?? ''}`
}

function dedupeBySignalId<T extends { signalId?: string }>(
  rows: readonly T[],
  resolveId: (row: T) => string
): T[] {
  const sorted = [...rows].sort((left, right) =>
    resolveId(left).localeCompare(resolveId(right))
  )
  const seen = new Set<string>()
  const deduped: T[] = []
  for (const row of sorted) {
    const id = resolveId(row)
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    deduped.push(row)
  }
  return deduped
}

function bucketKey(staffId: string, week: number | undefined): string {
  const normalizedStaff = staffId.trim()
  if (week !== undefined) {
    return `${normalizedStaff}\0${week}`
  }
  return `${normalizedStaff}\0`
}

function parseBucketKey(key: string): { staffId: string; week?: number } {
  const parts = key.split('\0')
  const staffId = parts[0] ?? ''
  const weekPart = parts[1]
  if (weekPart === undefined || weekPart.length === 0) {
    return { staffId }
  }
  return { staffId, week: Number(weekPart) }
}

function meanRounded(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }
  const sum = values.reduce((total, value) => total + value, 0)
  return Math.round(sum / values.length)
}

function classifyBand(
  score: number,
  highThreshold: number,
  lowThreshold: number
): ScoreBand {
  if (score >= highThreshold) {
    return 'high'
  }
  if (score <= lowThreshold) {
    return 'low'
  }
  return 'mid'
}

function bandsDiverge(alignmentBand: ScoreBand, efficacyBand: ScoreBand): boolean {
  if (alignmentBand === efficacyBand) {
    return false
  }
  if (alignmentBand === 'mid' || efficacyBand === 'mid') {
    return true
  }
  return alignmentBand !== efficacyBand
}

function compareFindings(
  left: StaffTreatmentTelemetryFinding,
  right: StaffTreatmentTelemetryFinding
): number {
  const kindDelta =
    FINDING_KIND_ORDER.indexOf(left.kind) - FINDING_KIND_ORDER.indexOf(right.kind)
  if (kindDelta !== 0) {
    return kindDelta
  }
  const staffDelta = left.staffId.localeCompare(right.staffId)
  if (staffDelta !== 0) {
    return staffDelta
  }
  const subjectDelta = (left.subjectId ?? '').localeCompare(right.subjectId ?? '')
  if (subjectDelta !== 0) {
    return subjectDelta
  }
  const weekLeft = left.week ?? -1
  const weekRight = right.week ?? -1
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }
  return (left.protocolId ?? '').localeCompare(right.protocolId ?? '')
}

function resolveOptions(
  options: StaffTreatmentTelemetryOptions | undefined
): Required<StaffTreatmentTelemetryOptions> {
  return {
    highAlignmentThreshold:
      options?.highAlignmentThreshold ?? DEFAULT_OPTIONS.highAlignmentThreshold,
    lowAlignmentThreshold:
      options?.lowAlignmentThreshold ?? DEFAULT_OPTIONS.lowAlignmentThreshold,
    lowEfficacyThreshold: options?.lowEfficacyThreshold ?? DEFAULT_OPTIONS.lowEfficacyThreshold,
    highEfficacyThreshold:
      options?.highEfficacyThreshold ?? DEFAULT_OPTIONS.highEfficacyThreshold,
    outcomeGapThreshold: options?.outcomeGapThreshold ?? DEFAULT_OPTIONS.outcomeGapThreshold,
    minimumEvidenceCount:
      options?.minimumEvidenceCount ?? DEFAULT_OPTIONS.minimumEvidenceCount,
  }
}

function normalizeAlignmentSignal(
  signal: StaffDoctrineAlignmentSignal
): StaffDoctrineAlignmentSignal {
  return {
    ...signal,
    staffId: signal.staffId.trim(),
    doctrineId: signal.doctrineId.trim(),
    alignmentScore: clampScore(signal.alignmentScore),
    week: normalizeWeek(signal.week),
  }
}

function normalizeOutcomeSignal(signal: TreatmentEfficacySignal): TreatmentEfficacySignal {
  return {
    ...signal,
    subjectId: signal.subjectId.trim(),
    protocolId: signal.protocolId.trim(),
    staffId: typeof signal.staffId === 'string' ? signal.staffId.trim() : undefined,
    expectedOutcomeScore: clampScore(signal.expectedOutcomeScore),
    actualOutcomeScore: clampScore(signal.actualOutcomeScore),
    week: normalizeWeek(signal.week),
  }
}

function buildOutcomeBuckets(
  outcomes: readonly TreatmentEfficacySignal[]
): Map<string, OutcomeBucket> {
  const buckets = new Map<string, OutcomeBucket>()
  for (const outcome of outcomes) {
    if (!outcome.staffId || outcome.staffId.length === 0) {
      continue
    }
    const week = outcome.week
    const key = bucketKey(outcome.staffId, week)
    const existing = buckets.get(key)
    if (existing) {
      existing.outcomes.push(outcome)
    } else {
      buckets.set(key, { staffId: outcome.staffId, week, outcomes: [outcome] })
    }
  }
  return buckets
}

function resolvePairedOutcomes(
  alignmentBucket: AlignmentBucket,
  outcomeBuckets: Map<string, OutcomeBucket>
): TreatmentEfficacySignal[] {
  const staffId = alignmentBucket.staffId
  if (alignmentBucket.week !== undefined) {
    const exact = outcomeBuckets.get(bucketKey(staffId, alignmentBucket.week))
    if (exact && exact.outcomes.length > 0) {
      return exact.outcomes
    }
  }
  const fallback = outcomeBuckets.get(bucketKey(staffId, undefined))
  return fallback?.outcomes ?? []
}

function summarizeOutcomes(outcomes: readonly TreatmentEfficacySignal[]): {
  efficacyScore: number
  worstGap: number
  worstOutcome?: TreatmentEfficacySignal
} {
  if (outcomes.length === 0) {
    return { efficacyScore: 0, worstGap: 0 }
  }

  let efficacyTotal = 0
  let worstGap = 0
  let worstOutcome: TreatmentEfficacySignal | undefined

  for (const outcome of outcomes) {
    efficacyTotal += clampScore(outcome.actualOutcomeScore)
    const gap = clampScore(outcome.expectedOutcomeScore) - clampScore(outcome.actualOutcomeScore)
    if (gap > worstGap) {
      worstGap = gap
      worstOutcome = outcome
    }
  }

  return {
    efficacyScore: Math.round(efficacyTotal / outcomes.length),
    worstGap,
    worstOutcome,
  }
}

function formatReportLines(findings: readonly StaffTreatmentTelemetryFinding[]): string[] {
  if (findings.length === 0) {
    return ['Staff treatment telemetry: no findings']
  }
  return [
    'Staff treatment telemetry report',
    ...findings.map(
      (finding) =>
        `[${finding.kind}] staff=${finding.staffId}` +
        (finding.week !== undefined ? ` week=${finding.week}` : '') +
        (finding.subjectId ? ` subject=${finding.subjectId}` : '') +
        `: ${finding.detail}`
    ),
  ]
}

export function buildStaffTreatmentTelemetryReport(
  input: StaffTreatmentTelemetryInput
): StaffTreatmentTelemetryReport {
  const options = resolveOptions(input.options)

  const staffSignals = dedupeBySignalId(
    input.staffSignals.map(normalizeAlignmentSignal),
    resolveAlignmentSignalId
  )
  const treatmentOutcomes = dedupeBySignalId(
    input.treatmentOutcomes.map(normalizeOutcomeSignal),
    resolveOutcomeSignalId
  )

  const outcomeBuckets = buildOutcomeBuckets(treatmentOutcomes)
  const unpairedOutcomeSignalCount = treatmentOutcomes.filter(
    (outcome) => !outcome.staffId || outcome.staffId.length === 0
  ).length

  const alignmentBuckets = new Map<string, AlignmentBucket>()
  for (const signal of staffSignals) {
    if (signal.staffId.length === 0) {
      continue
    }
    const key = bucketKey(signal.staffId, signal.week)
    const existing = alignmentBuckets.get(key)
    if (existing) {
      existing.alignmentScores.push(signal.alignmentScore)
      existing.doctrineIds.push(signal.doctrineId)
    } else {
      alignmentBuckets.set(key, {
        staffId: signal.staffId,
        week: signal.week,
        alignmentScores: [signal.alignmentScore],
        doctrineIds: [signal.doctrineId],
      })
    }
  }

  const findings: StaffTreatmentTelemetryFinding[] = []
  let pairedObservationCount = 0

  for (const [key, alignmentBucket] of alignmentBuckets) {
    const pairedOutcomes = resolvePairedOutcomes(alignmentBucket, outcomeBuckets)
    const meanAlignment = meanRounded(alignmentBucket.alignmentScores)
    const doctrineId = alignmentBucket.doctrineIds[0]
    const { staffId, week } = parseBucketKey(key)

    if (pairedOutcomes.length < options.minimumEvidenceCount) {
      findings.push({
        kind: 'insufficient_evidence',
        staffId,
        doctrineId,
        week: alignmentBucket.week ?? week,
        alignmentScore: meanAlignment,
        detail:
          pairedOutcomes.length === 0
            ? 'Doctrine alignment recorded without linkable treatment outcomes for this staff bucket.'
            : `Fewer than ${options.minimumEvidenceCount} treatment outcome signal(s) for comparison.`,
      })
      continue
    }

    pairedObservationCount += pairedOutcomes.length
    const { efficacyScore, worstGap, worstOutcome } = summarizeOutcomes(pairedOutcomes)
    const alignmentBand = classifyBand(
      meanAlignment,
      options.highAlignmentThreshold,
      options.lowAlignmentThreshold
    )
    const efficacyBand = classifyBand(
      efficacyScore,
      options.highEfficacyThreshold,
      options.lowEfficacyThreshold
    )

    const subjectId = worstOutcome?.subjectId
    const protocolId = worstOutcome?.protocolId
    const sharedWeek =
      alignmentBucket.week !== undefined &&
      pairedOutcomes.some((outcome) => outcome.week === alignmentBucket.week)
        ? alignmentBucket.week
        : undefined

    let primaryMismatchEmitted = false

    if (alignmentBand === 'high' && efficacyBand === 'low') {
      primaryMismatchEmitted = true
      findings.push({
        kind: 'high_alignment_low_efficacy',
        staffId,
        doctrineId,
        subjectId,
        protocolId,
        week: sharedWeek,
        alignmentScore: meanAlignment,
        efficacyScore,
        expectedOutcomeScore: worstOutcome?.expectedOutcomeScore,
        actualOutcomeScore: worstOutcome?.actualOutcomeScore,
        outcomeGap: worstGap,
        detail:
          'High institutional doctrine alignment coexists with low treatment efficacy for linked outcomes.',
      })
    }

    if (alignmentBand === 'low' && efficacyBand === 'high') {
      primaryMismatchEmitted = true
      findings.push({
        kind: 'low_alignment_high_efficacy',
        staffId,
        doctrineId,
        subjectId,
        protocolId,
        week: sharedWeek,
        alignmentScore: meanAlignment,
        efficacyScore,
        expectedOutcomeScore: worstOutcome?.expectedOutcomeScore,
        actualOutcomeScore: worstOutcome?.actualOutcomeScore,
        outcomeGap: worstGap,
        detail:
          'Low doctrine alignment coexists with high treatment efficacy for linked outcomes.',
      })
    }

    if (worstGap >= options.outcomeGapThreshold) {
      findings.push({
        kind: 'outcome_below_expected',
        staffId,
        doctrineId,
        subjectId,
        protocolId,
        week: sharedWeek,
        alignmentScore: meanAlignment,
        efficacyScore,
        expectedOutcomeScore: worstOutcome?.expectedOutcomeScore,
        actualOutcomeScore: worstOutcome?.actualOutcomeScore,
        outcomeGap: worstGap,
        detail: `Observed outcome trails expectation by ${worstGap} points in this staff bucket.`,
      })
    }

    const decoupledByBands =
      !primaryMismatchEmitted && bandsDiverge(alignmentBand, efficacyBand)
    const decoupledByMidGap =
      alignmentBand === 'mid' && worstGap >= options.outcomeGapThreshold
    if (decoupledByBands || decoupledByMidGap) {
      findings.push({
        kind: 'alignment_outcome_decoupled',
        staffId,
        doctrineId,
        subjectId,
        protocolId,
        week: sharedWeek,
        alignmentScore: meanAlignment,
        efficacyScore,
        expectedOutcomeScore: worstOutcome?.expectedOutcomeScore,
        actualOutcomeScore: worstOutcome?.actualOutcomeScore,
        outcomeGap: worstGap,
        detail:
          'Doctrine alignment band and treatment efficacy band diverge without an extreme high/low pairing.',
      })
    }
  }

  findings.sort(compareFindings)

  const countByKind = (kind: StaffTreatmentTelemetryFindingKind) =>
    findings.filter((finding) => finding.kind === kind).length

  const report: StaffTreatmentTelemetryReport = {
    findings,
    summary: {
      pairedObservationCount,
      insufficientEvidenceCount: countByKind('insufficient_evidence'),
      highAlignmentLowEfficacyCount: countByKind('high_alignment_low_efficacy'),
      lowAlignmentHighEfficacyCount: countByKind('low_alignment_high_efficacy'),
      outcomeBelowExpectedCount: countByKind('outcome_below_expected'),
      alignmentOutcomeDecoupledCount: countByKind('alignment_outcome_decoupled'),
      unpairedAlignmentSignalCount: staffSignals.filter((signal) => signal.staffId.length === 0)
        .length,
      unpairedOutcomeSignalCount,
    },
    lines: formatReportLines(findings),
  }

  return report
}
