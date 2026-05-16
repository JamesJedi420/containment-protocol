/**
 * SPE-2003: deterministic medical outcome deviation audit.
 *
 * Compares expected medical/containment outcomes against observed outcomes and
 * emits audit findings for deviation, symptom burden, escalation, missing observations,
 * and governance-notification candidates.
 *
 * Pure helper only. No GameState persistence, runtime notifications, UI, staff-alignment
 * scoring, blame routing, doctrine enforcement, or real-world medical modeling.
 */

export type MedicalOutcomeExpectationSource =
  | 'protocol'
  | 'clinician'
  | 'governance'
  | 'contract'
  | 'system'

export type MedicalOutcomeObservationSource =
  | 'observation'
  | 'report'
  | 'telemetry'
  | 'debrief'
  | 'system'

export type MedicalOutcomeEscalationTriggerKind =
  | 'symptom_persistence'
  | 'containment_failure'
  | 'protocol_failure'
  | 'operator_review'
  | 'system'

export type MedicalOutcomeDeviationKind =
  | 'outcome_below_prediction'
  | 'symptom_burden_not_improved'
  | 'symptom_burden_worsened'
  | 'escalation_above_expected'
  | 'missing_observation'
  | 'governance_notification_candidate'

export type MedicalOutcomeDeviationSeverity = 'info' | 'warning' | 'critical'

export type MedicalOutcomeGovernanceNotificationLevel =
  | 'site_lead'
  | 'governance'
  | 'directive'

export interface MedicalExpectedOutcome {
  expectationId: string
  subjectId: string
  protocolId: string
  expectedOutcomeScore: number
  expectedSymptomBurdenDelta?: number
  expectedEscalationCount?: number
  expectedByWeek?: number
  source: MedicalOutcomeExpectationSource
  treatmentLimitationAcknowledged?: boolean
}

export interface MedicalObservedOutcome {
  observationId: string
  subjectId: string
  protocolId: string
  actualOutcomeScore: number
  symptomBurdenDelta?: number
  escalationCount?: number
  observedWeek?: number
  source: MedicalOutcomeObservationSource
}

export interface MedicalOutcomeEscalationEvent {
  eventId: string
  subjectId: string
  protocolId?: string
  week?: number
  triggerKind: MedicalOutcomeEscalationTriggerKind
}

export interface MedicalOutcomeDeviationFinding {
  kind: MedicalOutcomeDeviationKind
  severity: MedicalOutcomeDeviationSeverity
  subjectId: string
  protocolId: string
  expectationId?: string
  observationId?: string
  week?: number
  outcomeGap?: number
  symptomBurdenGap?: number
  escalationExcess?: number
  triggerKinds?: readonly MedicalOutcomeEscalationTriggerKind[]
  recommendedNotificationLevel?: MedicalOutcomeGovernanceNotificationLevel
  detail: string
}

export interface MedicalOutcomeDeviationAuditOptions {
  outcomeGapThreshold?: number
  criticalOutcomeGapThreshold?: number
  symptomImprovementEpsilon?: number
  symptomWorseningMargin?: number
  criticalSymptomBurdenDelta?: number
  criticalEscalationExcess?: number
  governanceEscalationExcessThreshold?: number
  treatMissingExpectedEscalationAsZero?: boolean
}

export interface MedicalOutcomeDeviationAuditReport {
  findings: readonly MedicalOutcomeDeviationFinding[]
  summary: {
    pairedObservationCount: number
    missingObservationCount: number
    outcomeBelowPredictionCount: number
    symptomBurdenNotImprovedCount: number
    symptomBurdenWorsenedCount: number
    escalationAboveExpectedCount: number
    governanceNotificationCandidateCount: number
    unpairedObservationCount: number
    unpairedEscalationEventCount: number
  }
  lines: readonly string[]
}

export interface MedicalOutcomeDeviationAuditInput {
  expectedOutcomes: readonly MedicalExpectedOutcome[]
  observedOutcomes: readonly MedicalObservedOutcome[]
  escalationEvents?: readonly MedicalOutcomeEscalationEvent[]
  options?: MedicalOutcomeDeviationAuditOptions
}

const SEVERITY_RANK: Readonly<Record<MedicalOutcomeDeviationSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const FINDING_KIND_ORDER: readonly MedicalOutcomeDeviationKind[] = [
  'outcome_below_prediction',
  'symptom_burden_not_improved',
  'symptom_burden_worsened',
  'escalation_above_expected',
  'missing_observation',
  'governance_notification_candidate',
]

const DEFAULT_OPTIONS: Required<MedicalOutcomeDeviationAuditOptions> = {
  outcomeGapThreshold: 15,
  criticalOutcomeGapThreshold: 30,
  symptomImprovementEpsilon: 0,
  symptomWorseningMargin: 1,
  criticalSymptomBurdenDelta: 10,
  criticalEscalationExcess: 2,
  governanceEscalationExcessThreshold: 1,
  treatMissingExpectedEscalationAsZero: true,
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampDelta(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.round(value)
}

function normalizeWeek(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, Math.trunc(value))
}

function normalizeThreshold(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback
  }
  return Math.max(0, Math.round(value))
}

function resolveOptions(
  options: MedicalOutcomeDeviationAuditOptions | undefined
): Required<MedicalOutcomeDeviationAuditOptions> {
  return {
    outcomeGapThreshold: normalizeThreshold(
      options?.outcomeGapThreshold,
      DEFAULT_OPTIONS.outcomeGapThreshold
    ),
    criticalOutcomeGapThreshold: normalizeThreshold(
      options?.criticalOutcomeGapThreshold,
      DEFAULT_OPTIONS.criticalOutcomeGapThreshold
    ),
    symptomImprovementEpsilon: normalizeThreshold(
      options?.symptomImprovementEpsilon,
      DEFAULT_OPTIONS.symptomImprovementEpsilon
    ),
    symptomWorseningMargin: normalizeThreshold(
      options?.symptomWorseningMargin,
      DEFAULT_OPTIONS.symptomWorseningMargin
    ),
    criticalSymptomBurdenDelta: normalizeThreshold(
      options?.criticalSymptomBurdenDelta,
      DEFAULT_OPTIONS.criticalSymptomBurdenDelta
    ),
    criticalEscalationExcess: normalizeThreshold(
      options?.criticalEscalationExcess,
      DEFAULT_OPTIONS.criticalEscalationExcess
    ),
    governanceEscalationExcessThreshold: normalizeThreshold(
      options?.governanceEscalationExcessThreshold,
      DEFAULT_OPTIONS.governanceEscalationExcessThreshold
    ),
    treatMissingExpectedEscalationAsZero:
      options?.treatMissingExpectedEscalationAsZero ??
      DEFAULT_OPTIONS.treatMissingExpectedEscalationAsZero,
  }
}

function dedupeById<T>(
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

function normalizeExpectedOutcome(row: MedicalExpectedOutcome): MedicalExpectedOutcome {
  return {
    ...row,
    expectationId: row.expectationId.trim(),
    subjectId: row.subjectId.trim(),
    protocolId: row.protocolId.trim(),
    expectedOutcomeScore: clampScore(row.expectedOutcomeScore),
    expectedSymptomBurdenDelta:
      row.expectedSymptomBurdenDelta === undefined
        ? undefined
        : clampDelta(row.expectedSymptomBurdenDelta),
    expectedEscalationCount:
      row.expectedEscalationCount === undefined
        ? undefined
        : Math.max(0, Math.trunc(row.expectedEscalationCount)),
    expectedByWeek: normalizeWeek(row.expectedByWeek),
  }
}

function normalizeObservedOutcome(row: MedicalObservedOutcome): MedicalObservedOutcome {
  return {
    ...row,
    observationId: row.observationId.trim(),
    subjectId: row.subjectId.trim(),
    protocolId: row.protocolId.trim(),
    actualOutcomeScore: clampScore(row.actualOutcomeScore),
    symptomBurdenDelta:
      row.symptomBurdenDelta === undefined ? undefined : clampDelta(row.symptomBurdenDelta),
    escalationCount:
      row.escalationCount === undefined
        ? undefined
        : Math.max(0, Math.trunc(row.escalationCount)),
    observedWeek: normalizeWeek(row.observedWeek),
  }
}

function normalizeEscalationEvent(row: MedicalOutcomeEscalationEvent): MedicalOutcomeEscalationEvent {
  return {
    ...row,
    eventId: row.eventId.trim(),
    subjectId: row.subjectId.trim(),
    protocolId: typeof row.protocolId === 'string' ? row.protocolId.trim() : undefined,
    week: normalizeWeek(row.week),
  }
}

function matchesSubjectProtocol(
  observation: MedicalObservedOutcome,
  expectation: MedicalExpectedOutcome
): boolean {
  return (
    observation.subjectId === expectation.subjectId &&
    observation.protocolId === expectation.protocolId
  )
}

function matchesWeek(
  observation: MedicalObservedOutcome,
  expectation: MedicalExpectedOutcome
): boolean {
  if (expectation.expectedByWeek === undefined) {
    return true
  }
  return observation.observedWeek === expectation.expectedByWeek
}

function outcomeGapForPair(
  expectation: MedicalExpectedOutcome,
  observation: MedicalObservedOutcome
): number {
  return clampScore(expectation.expectedOutcomeScore) - clampScore(observation.actualOutcomeScore)
}

function compareObservationsWorst(
  left: MedicalObservedOutcome,
  right: MedicalObservedOutcome,
  expectation: MedicalExpectedOutcome
): number {
  const gapDelta = outcomeGapForPair(expectation, right) - outcomeGapForPair(expectation, left)
  if (gapDelta !== 0) {
    return gapDelta
  }

  const escalationDelta =
    (right.escalationCount ?? 0) - (left.escalationCount ?? 0)
  if (escalationDelta !== 0) {
    return escalationDelta
  }

  const burdenDelta =
    (right.symptomBurdenDelta ?? 0) - (left.symptomBurdenDelta ?? 0)
  if (burdenDelta !== 0) {
    return burdenDelta
  }

  return left.observationId.localeCompare(right.observationId)
}

function selectWorstObservation(
  candidates: readonly MedicalObservedOutcome[],
  expectation: MedicalExpectedOutcome
): MedicalObservedOutcome | undefined {
  if (candidates.length === 0) {
    return undefined
  }
  let worst = candidates[0]!
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]!
    if (compareObservationsWorst(worst, candidate, expectation) > 0) {
      worst = candidate
    }
  }
  return worst
}

function resolvePairedObservation(
  expectation: MedicalExpectedOutcome,
  observations: readonly MedicalObservedOutcome[]
): MedicalObservedOutcome | undefined {
  const forSubjectProtocol = observations.filter((observation) =>
    matchesSubjectProtocol(observation, expectation)
  )
  if (forSubjectProtocol.length === 0) {
    return undefined
  }

  if (expectation.expectedByWeek !== undefined) {
    const weekMatched = forSubjectProtocol.filter((observation) =>
      matchesWeek(observation, expectation)
    )
    if (weekMatched.length > 0) {
      return selectWorstObservation(weekMatched, expectation)
    }
    return selectWorstObservation(forSubjectProtocol, expectation)
  }

  return selectWorstObservation(forSubjectProtocol, expectation)
}

function resolveExpectedEscalationCount(
  expectation: MedicalExpectedOutcome,
  options: Required<MedicalOutcomeDeviationAuditOptions>
): number {
  if (expectation.expectedEscalationCount !== undefined) {
    return expectation.expectedEscalationCount
  }
  return options.treatMissingExpectedEscalationAsZero ? 0 : 0
}

function matchEscalationEvents(input: {
  expectation: MedicalExpectedOutcome
  observation: MedicalObservedOutcome | undefined
  events: readonly MedicalOutcomeEscalationEvent[]
}): MedicalOutcomeEscalationEvent[] {
  const { expectation, observation, events } = input
  const week = expectation.expectedByWeek ?? observation?.observedWeek

  return events.filter((event) => {
    if (event.subjectId !== expectation.subjectId) {
      return false
    }
    if (event.protocolId !== undefined && event.protocolId.length > 0) {
      if (event.protocolId !== expectation.protocolId) {
        return false
      }
    }
    if (event.week !== undefined && week !== undefined && event.week !== week) {
      return false
    }
    return true
  })
}

function uniqueTriggerKinds(
  events: readonly MedicalOutcomeEscalationEvent[]
): MedicalOutcomeEscalationTriggerKind[] {
  const kinds = events.map((event) => event.triggerKind)
  return [...new Set(kinds)].sort((left, right) => left.localeCompare(right))
}

function resolveGovernanceNotificationLevel(input: {
  outcomeGap: number
  hasOutcomeDeviation: boolean
  hasSymptomWorsened: boolean
  escalationExcess: number
  hasCriticalSibling: boolean
  options: Required<MedicalOutcomeDeviationAuditOptions>
}): MedicalOutcomeGovernanceNotificationLevel {
  const { outcomeGap, hasOutcomeDeviation, hasSymptomWorsened, escalationExcess, options } = input
  const hasEscalationExcess = escalationExcess >= options.governanceEscalationExcessThreshold
  const hasMaterialGap = outcomeGap >= options.outcomeGapThreshold

  if (hasMaterialGap && hasSymptomWorsened && hasEscalationExcess) {
    return 'directive'
  }
  if (hasEscalationExcess || (hasMaterialGap && hasSymptomWorsened)) {
    return 'governance'
  }
  if (
    input.hasCriticalSibling ||
    outcomeGap >= options.criticalOutcomeGapThreshold ||
    hasOutcomeDeviation
  ) {
    return 'site_lead'
  }
  return 'site_lead'
}

function shouldEmitGovernanceCandidate(input: {
  findings: readonly MedicalOutcomeDeviationFinding[]
  outcomeGap: number
  escalationExcess: number
  hasSymptomWorsened: boolean
  options: Required<MedicalOutcomeDeviationAuditOptions>
}): boolean {
  const hasCriticalSibling = input.findings.some((finding) => finding.severity === 'critical')
  const hasMaterialGap = input.outcomeGap >= input.options.outcomeGapThreshold
  const hasEscalationExcess =
    input.escalationExcess >= input.options.governanceEscalationExcessThreshold

  return (
    hasCriticalSibling ||
    input.outcomeGap >= input.options.criticalOutcomeGapThreshold ||
    hasEscalationExcess ||
    (hasMaterialGap && input.hasSymptomWorsened && hasEscalationExcess)
  )
}

function compareFindings(
  left: MedicalOutcomeDeviationFinding,
  right: MedicalOutcomeDeviationFinding
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

  const subjectDelta = left.subjectId.localeCompare(right.subjectId)
  if (subjectDelta !== 0) {
    return subjectDelta
  }

  const protocolDelta = left.protocolId.localeCompare(right.protocolId)
  if (protocolDelta !== 0) {
    return protocolDelta
  }

  const weekLeft = left.week ?? Number.MAX_SAFE_INTEGER
  const weekRight = right.week ?? Number.MAX_SAFE_INTEGER
  if (weekLeft !== weekRight) {
    return weekLeft - weekRight
  }

  const expectationDelta = (left.expectationId ?? '').localeCompare(right.expectationId ?? '')
  if (expectationDelta !== 0) {
    return expectationDelta
  }

  return (left.observationId ?? '').localeCompare(right.observationId ?? '')
}

function formatFindingLine(finding: MedicalOutcomeDeviationFinding): string {
  const parts = [
    finding.severity,
    finding.kind,
    `subject:${finding.subjectId}`,
    `protocol:${finding.protocolId}`,
  ]
  if (finding.week !== undefined) {
    parts.push(`week:${finding.week}`)
  }
  if (finding.outcomeGap !== undefined) {
    parts.push(`gap:${finding.outcomeGap}`)
  }
  if (finding.escalationExcess !== undefined) {
    parts.push(`escalation_excess:${finding.escalationExcess}`)
  }
  if (finding.recommendedNotificationLevel !== undefined) {
    parts.push(`level:${finding.recommendedNotificationLevel}`)
  }
  parts.push(finding.detail)
  return parts.join(' · ')
}

function formatReportLines(
  findings: readonly MedicalOutcomeDeviationFinding[],
  summary: MedicalOutcomeDeviationAuditReport['summary']
): string[] {
  if (findings.length === 0) {
    return [
      `Medical outcome deviation audit: findings=0, paired=${summary.pairedObservationCount}, missing=${summary.missingObservationCount}`,
    ]
  }

  return [
    `Medical outcome deviation audit: findings=${findings.length}, paired=${summary.pairedObservationCount}, missing=${summary.missingObservationCount}`,
    ...findings.map((finding) => formatFindingLine(finding)),
  ]
}

function buildPairFindings(input: {
  expectation: MedicalExpectedOutcome
  observation: MedicalObservedOutcome | undefined
  escalationEvents: readonly MedicalOutcomeEscalationEvent[]
  options: Required<MedicalOutcomeDeviationAuditOptions>
}): MedicalOutcomeDeviationFinding[] {
  const { expectation, observation, escalationEvents, options } = input
  const week = expectation.expectedByWeek ?? observation?.observedWeek
  const findings: MedicalOutcomeDeviationFinding[] = []

  if (!observation) {
    findings.push({
      kind: 'missing_observation',
      severity: 'info',
      subjectId: expectation.subjectId,
      protocolId: expectation.protocolId,
      expectationId: expectation.expectationId,
      week,
      detail: 'Expected medical outcome recorded without a matchable observation for this subject and protocol.',
    })
    return findings
  }

  const matchedEvents = matchEscalationEvents({
    expectation,
    observation,
    events: escalationEvents,
  })
  const triggerKinds =
    matchedEvents.length > 0 ? uniqueTriggerKinds(matchedEvents) : undefined

  const outcomeGap = outcomeGapForPair(expectation, observation)
  const expectedEscalation = resolveExpectedEscalationCount(expectation, options)
  const observedEscalation = observation.escalationCount ?? 0
  const escalationExcess = Math.max(0, observedEscalation - expectedEscalation)

  let hasSymptomWorsened = false

  if (outcomeGap >= options.outcomeGapThreshold) {
    findings.push({
      kind: 'outcome_below_prediction',
      severity:
        outcomeGap >= options.criticalOutcomeGapThreshold ? 'critical' : 'warning',
      subjectId: expectation.subjectId,
      protocolId: expectation.protocolId,
      expectationId: expectation.expectationId,
      observationId: observation.observationId,
      week,
      outcomeGap,
      triggerKinds,
      detail: `Observed outcome trails prediction by ${outcomeGap} points.`,
    })
  }

  const expectedBurdenDelta = expectation.expectedSymptomBurdenDelta
  const observedBurdenDelta = observation.symptomBurdenDelta

  if (
    expectedBurdenDelta !== undefined &&
    expectedBurdenDelta < 0 &&
    observedBurdenDelta !== undefined
  ) {
    const improvementTarget = expectedBurdenDelta - options.symptomImprovementEpsilon
    if (observedBurdenDelta > improvementTarget) {
      const symptomBurdenGap = observedBurdenDelta - expectedBurdenDelta
      findings.push({
        kind: 'symptom_burden_not_improved',
        severity: 'warning',
        subjectId: expectation.subjectId,
        protocolId: expectation.protocolId,
        expectationId: expectation.expectationId,
        observationId: observation.observationId,
        week,
        symptomBurdenGap,
        triggerKinds,
        detail:
          'Symptom burden did not improve enough relative to the predicted reduction for this protocol.',
      })
    }

    const worsenedByPositiveDelta = observedBurdenDelta > 0
    const worsenedByMargin =
      observedBurdenDelta - expectedBurdenDelta >= options.symptomWorseningMargin
    if (worsenedByPositiveDelta || worsenedByMargin) {
      hasSymptomWorsened = true
      const symptomBurdenGap = observedBurdenDelta - expectedBurdenDelta
      const criticalWorsening = observedBurdenDelta >= options.criticalSymptomBurdenDelta
      findings.push({
        kind: 'symptom_burden_worsened',
        severity: criticalWorsening ? 'critical' : 'warning',
        subjectId: expectation.subjectId,
        protocolId: expectation.protocolId,
        expectationId: expectation.expectationId,
        observationId: observation.observationId,
        week,
        symptomBurdenGap,
        triggerKinds,
        detail: criticalWorsening
          ? 'Symptom burden increased materially while improvement was predicted.'
          : 'Symptom burden worsened relative to the predicted improvement trajectory.',
      })
    }
  }

  if (escalationExcess > 0) {
    findings.push({
      kind: 'escalation_above_expected',
      severity:
        escalationExcess >= options.criticalEscalationExcess ? 'critical' : 'warning',
      subjectId: expectation.subjectId,
      protocolId: expectation.protocolId,
      expectationId: expectation.expectationId,
      observationId: observation.observationId,
      week,
      escalationExcess,
      triggerKinds,
      detail: `Escalation count exceeded prediction by ${escalationExcess}.`,
    })
  }

  const hasOutcomeDeviation = findings.some(
    (finding) => finding.kind === 'outcome_below_prediction'
  )

  if (
    shouldEmitGovernanceCandidate({
      findings,
      outcomeGap,
      escalationExcess,
      hasSymptomWorsened,
      options,
    })
  ) {
    const recommendedNotificationLevel = resolveGovernanceNotificationLevel({
      outcomeGap,
      hasOutcomeDeviation,
      hasSymptomWorsened,
      escalationExcess,
      hasCriticalSibling: findings.some((finding) => finding.severity === 'critical'),
      options,
    })
    findings.push({
      kind: 'governance_notification_candidate',
      severity: 'critical',
      subjectId: expectation.subjectId,
      protocolId: expectation.protocolId,
      expectationId: expectation.expectationId,
      observationId: observation.observationId,
      week,
      outcomeGap,
      escalationExcess,
      triggerKinds,
      recommendedNotificationLevel,
      detail:
        'Deviation severity warrants governance review; no notification was dispatched by this audit helper.',
    })
  }

  return findings
}

export function buildMedicalOutcomeDeviationAuditReport(
  input: MedicalOutcomeDeviationAuditInput
): MedicalOutcomeDeviationAuditReport {
  const options = resolveOptions(input.options)

  const expectedOutcomes = dedupeById(
    input.expectedOutcomes.map(normalizeExpectedOutcome).filter((row) => row.expectationId.length > 0),
    (row) => row.expectationId
  )
  const observedOutcomes = dedupeById(
    input.observedOutcomes.map(normalizeObservedOutcome).filter((row) => row.observationId.length > 0),
    (row) => row.observationId
  )
  const escalationEvents = dedupeById(
    (input.escalationEvents ?? []).map(normalizeEscalationEvent).filter((row) => row.eventId.length > 0),
    (row) => row.eventId
  )

  const pairedObservationIds = new Set<string>()
  const findings: MedicalOutcomeDeviationFinding[] = []

  for (const expectation of expectedOutcomes) {
    if (expectation.subjectId.length === 0 || expectation.protocolId.length === 0) {
      continue
    }
    const observation = resolvePairedObservation(expectation, observedOutcomes)
    if (observation) {
      pairedObservationIds.add(observation.observationId)
    }
    findings.push(
      ...buildPairFindings({
        expectation,
        observation,
        escalationEvents,
        options,
      })
    )
  }

  const unpairedObservationCount = observedOutcomes.filter(
    (observation) => !pairedObservationIds.has(observation.observationId)
  ).length

  const usedEscalationEventIds = new Set<string>()
  for (const expectation of expectedOutcomes) {
    const observation = resolvePairedObservation(expectation, observedOutcomes)
    for (const event of matchEscalationEvents({ expectation, observation, events: escalationEvents })) {
      usedEscalationEventIds.add(event.eventId)
    }
  }
  const unpairedEscalationEventCount = escalationEvents.filter(
    (event) => !usedEscalationEventIds.has(event.eventId)
  ).length

  findings.sort(compareFindings)

  const countByKind = (kind: MedicalOutcomeDeviationKind) =>
    findings.filter((finding) => finding.kind === kind).length

  const summary = {
    pairedObservationCount: pairedObservationIds.size,
    missingObservationCount: countByKind('missing_observation'),
    outcomeBelowPredictionCount: countByKind('outcome_below_prediction'),
    symptomBurdenNotImprovedCount: countByKind('symptom_burden_not_improved'),
    symptomBurdenWorsenedCount: countByKind('symptom_burden_worsened'),
    escalationAboveExpectedCount: countByKind('escalation_above_expected'),
    governanceNotificationCandidateCount: countByKind('governance_notification_candidate'),
    unpairedObservationCount,
    unpairedEscalationEventCount,
  }

  return {
    findings,
    summary,
    lines: formatReportLines(findings, summary),
  }
}
