/**
 * SPE-2006: deterministic treatment-failure blame routing.
 *
 * Evaluates proposed accountability routes after treatment or containment failure.
 * Prevents unsupported subject-side deflection when failure evidence exists and
 * institutional treatment limitations have not been acknowledged.
 *
 * Pure helper only. No GameState persistence, runtime personnel actions, UI,
 * doctrine enforcement, scorecards, policy selection, or real-world medical modeling.
 */

export type TreatmentFailureSignalKind =
  | 'outcome_below_prediction'
  | 'symptom_burden_not_improved'
  | 'symptom_burden_worsened'
  | 'escalation_above_expected'
  | 'missing_observation'
  | 'governance_notification_candidate'

export type TreatmentFailureSeverity = 'info' | 'warning' | 'critical'

export type TreatmentFailureContextSource =
  | 'deviation_audit'
  | 'incident'
  | 'debrief'
  | 'governance'
  | 'system'

export interface TreatmentFailureContext {
  contextId: string
  subjectId: string
  protocolId: string
  week?: number
  failureSignals: readonly TreatmentFailureSignalKind[]
  severity?: TreatmentFailureSeverity
  source: TreatmentFailureContextSource
}

export type ProposedBlameAttributionTarget =
  | 'subject_language_noncompliance'
  | 'subject_belief_noncompliance'
  | 'subject_identity_noncompliance'
  | 'subject_testimony_unreliable'
  | 'staff_execution_gap'
  | 'protocol_limitation'
  | 'resource_constraint'
  | 'governance_suppression'
  | 'containment_doctrine_conflict'
  | 'unknown'

export type ProposedBlameAttributionSource =
  | 'incident_review'
  | 'staff_report'
  | 'governance'
  | 'system'
  | 'auto'

export interface ProposedBlameAttribution {
  attributionId: string
  subjectId: string
  protocolId: string
  week?: number
  target: ProposedBlameAttributionTarget
  source: ProposedBlameAttributionSource
  isAutomatic?: boolean
}

export type TreatmentLimitationKind =
  | 'protocol_ceiling'
  | 'resource_ceiling'
  | 'containment_tradeoff'
  | 'governance_constraint'
  | 'measurement_uncertainty'
  | 'other'

export type TreatmentLimitationAcknowledgedBy =
  | 'clinician'
  | 'site_lead'
  | 'governance'
  | 'protocol'
  | 'system'

export type TreatmentLimitationAcknowledgmentSource =
  | 'clinical'
  | 'audit'
  | 'governance'
  | 'system'

export interface TreatmentLimitationAcknowledgment {
  acknowledgmentId: string
  subjectId: string
  protocolId: string
  week?: number
  limitationKind: TreatmentLimitationKind
  acknowledgedBy: TreatmentLimitationAcknowledgedBy
  source: TreatmentLimitationAcknowledgmentSource
}

export type TreatmentFailureBlameRoutingFindingKind =
  | 'prohibited_subject_deflection'
  | 'missing_treatment_limitation_acknowledgment'
  | 'approved_accountability_route'
  | 'institutional_accountability_required'
  | 'insufficient_failure_evidence'

export type TreatmentFailureAccountabilityFocus =
  | 'institutional'
  | 'staff'
  | 'shared'
  | 'review'

export interface TreatmentFailureBlameRoutingFinding {
  kind: TreatmentFailureBlameRoutingFindingKind
  severity: TreatmentFailureSeverity
  subjectId: string
  protocolId: string
  week?: number
  contextId?: string
  attributionId?: string
  acknowledgmentId?: string
  target?: ProposedBlameAttributionTarget
  recommendedAccountabilityFocus?: TreatmentFailureAccountabilityFocus
  detail: string
}

export interface TreatmentFailureBlameRoutingOptions {
  materialFailureSignals?: readonly TreatmentFailureSignalKind[]
  requireAcknowledgmentForInstitutionalRoutes?: boolean
  blockAutomaticSubjectDeflection?: boolean
}

export interface TreatmentFailureBlameRoutingReport {
  findings: readonly TreatmentFailureBlameRoutingFinding[]
  summary: {
    failureContextCount: number
    prohibitedDeflectionCount: number
    missingAcknowledgmentCount: number
    approvedRouteCount: number
    institutionalAccountabilityRequiredCount: number
    insufficientEvidenceCount: number
    unpairedAttributionCount: number
  }
  lines: readonly string[]
}

export interface TreatmentFailureBlameRoutingInput {
  failureContexts: readonly TreatmentFailureContext[]
  proposedAttributions: readonly ProposedBlameAttribution[]
  limitationAcknowledgments?: readonly TreatmentLimitationAcknowledgment[]
  options?: TreatmentFailureBlameRoutingOptions
}

const DEFAULT_MATERIAL_FAILURE_SIGNALS: readonly TreatmentFailureSignalKind[] = [
  'outcome_below_prediction',
  'symptom_burden_worsened',
  'escalation_above_expected',
  'governance_notification_candidate',
]

const SUBJECT_SIDE_TARGETS: ReadonlySet<ProposedBlameAttributionTarget> = new Set([
  'subject_language_noncompliance',
  'subject_belief_noncompliance',
  'subject_identity_noncompliance',
  'subject_testimony_unreliable',
])

const INSTITUTIONAL_TARGETS: ReadonlySet<ProposedBlameAttributionTarget> = new Set([
  'protocol_limitation',
  'resource_constraint',
  'governance_suppression',
  'containment_doctrine_conflict',
])

const SEVERITY_RANK: Readonly<Record<TreatmentFailureSeverity, number>> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const FINDING_KIND_ORDER: readonly TreatmentFailureBlameRoutingFindingKind[] = [
  'prohibited_subject_deflection',
  'institutional_accountability_required',
  'missing_treatment_limitation_acknowledgment',
  'approved_accountability_route',
  'insufficient_failure_evidence',
]

const DEFAULT_OPTIONS: Required<
  Pick<
    TreatmentFailureBlameRoutingOptions,
    'requireAcknowledgmentForInstitutionalRoutes' | 'blockAutomaticSubjectDeflection'
  >
> & { materialFailureSignals: readonly TreatmentFailureSignalKind[] } = {
  materialFailureSignals: DEFAULT_MATERIAL_FAILURE_SIGNALS,
  requireAcknowledgmentForInstitutionalRoutes: true,
  blockAutomaticSubjectDeflection: true,
}

function normalizeWeek(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(0, Math.trunc(value))
}

function normalizeSeverity(value: TreatmentFailureSeverity | undefined): TreatmentFailureSeverity {
  if (value === 'critical' || value === 'warning' || value === 'info') {
    return value
  }
  return 'info'
}

function dedupeById<T>(rows: readonly T[], resolveId: (row: T) => string): T[] {
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

function normalizeContext(row: TreatmentFailureContext): TreatmentFailureContext {
  return {
    ...row,
    contextId: row.contextId.trim(),
    subjectId: row.subjectId.trim(),
    protocolId: row.protocolId.trim(),
    week: normalizeWeek(row.week),
    severity: normalizeSeverity(row.severity),
    failureSignals: [...row.failureSignals],
  }
}

function normalizeAttribution(row: ProposedBlameAttribution): ProposedBlameAttribution {
  return {
    ...row,
    attributionId: row.attributionId.trim(),
    subjectId: row.subjectId.trim(),
    protocolId: row.protocolId.trim(),
    week: normalizeWeek(row.week),
  }
}

function normalizeAcknowledgment(
  row: TreatmentLimitationAcknowledgment
): TreatmentLimitationAcknowledgment {
  return {
    ...row,
    acknowledgmentId: row.acknowledgmentId.trim(),
    subjectId: row.subjectId.trim(),
    protocolId: row.protocolId.trim(),
    week: normalizeWeek(row.week),
  }
}

type ResolvedBlameRoutingOptions = Required<
  Pick<
    TreatmentFailureBlameRoutingOptions,
    'requireAcknowledgmentForInstitutionalRoutes' | 'blockAutomaticSubjectDeflection'
  >
> & {
  materialFailureSignals: readonly TreatmentFailureSignalKind[]
  materialFailureSignalSet: ReadonlySet<TreatmentFailureSignalKind>
}

function resolveOptions(
  options: TreatmentFailureBlameRoutingOptions | undefined
): ResolvedBlameRoutingOptions {
  const materialSignals =
    options?.materialFailureSignals !== undefined && options.materialFailureSignals.length > 0
      ? [...options.materialFailureSignals]
      : DEFAULT_OPTIONS.materialFailureSignals
  return {
    materialFailureSignals: materialSignals,
    materialFailureSignalSet: new Set(materialSignals),
    requireAcknowledgmentForInstitutionalRoutes:
      options?.requireAcknowledgmentForInstitutionalRoutes ??
      DEFAULT_OPTIONS.requireAcknowledgmentForInstitutionalRoutes,
    blockAutomaticSubjectDeflection:
      options?.blockAutomaticSubjectDeflection ?? DEFAULT_OPTIONS.blockAutomaticSubjectDeflection,
  }
}

function pairGroupKey(subjectId: string, protocolId: string, week: number | undefined): string {
  const weekPart = week !== undefined ? String(week) : ''
  return `${subjectId}\0${protocolId}\0${weekPart}`
}

function isSubjectSideTarget(target: ProposedBlameAttributionTarget): boolean {
  return SUBJECT_SIDE_TARGETS.has(target)
}

function isInstitutionalTarget(target: ProposedBlameAttributionTarget): boolean {
  return INSTITUTIONAL_TARGETS.has(target)
}

function isStaffTarget(target: ProposedBlameAttributionTarget): boolean {
  return target === 'staff_execution_gap'
}

function hasMaterialFailure(
  context: TreatmentFailureContext,
  materialSignalSet: ReadonlySet<TreatmentFailureSignalKind>
): boolean {
  return context.failureSignals.some((signal) => materialSignalSet.has(signal))
}

function countMaterialSignals(
  context: TreatmentFailureContext,
  materialSignalSet: ReadonlySet<TreatmentFailureSignalKind>
): number {
  return context.failureSignals.filter((signal) => materialSignalSet.has(signal)).length
}

function compareContextsStrongest(
  left: TreatmentFailureContext,
  right: TreatmentFailureContext,
  materialSignalSet: ReadonlySet<TreatmentFailureSignalKind>
): number {
  const severityDelta =
    SEVERITY_RANK[normalizeSeverity(left.severity)] -
    SEVERITY_RANK[normalizeSeverity(right.severity)]
  if (severityDelta !== 0) {
    return severityDelta
  }

  const materialDelta =
    countMaterialSignals(right, materialSignalSet) - countMaterialSignals(left, materialSignalSet)
  if (materialDelta !== 0) {
    return materialDelta
  }

  return left.contextId.localeCompare(right.contextId)
}

function matchesSubjectProtocol(
  subjectId: string,
  protocolId: string,
  rowSubjectId: string,
  rowProtocolId: string
): boolean {
  return subjectId === rowSubjectId && protocolId === rowProtocolId
}

function resolveContextCandidates(
  attribution: ProposedBlameAttribution,
  contexts: readonly TreatmentFailureContext[]
): TreatmentFailureContext[] {
  const forSubjectProtocol = contexts.filter((context) =>
    matchesSubjectProtocol(
      attribution.subjectId,
      attribution.protocolId,
      context.subjectId,
      context.protocolId
    )
  )
  if (forSubjectProtocol.length === 0) {
    return []
  }

  if (attribution.week === undefined) {
    return forSubjectProtocol
  }

  const exactWeek = forSubjectProtocol.filter((context) => context.week === attribution.week)
  if (exactWeek.length > 0) {
    return exactWeek
  }

  return forSubjectProtocol.filter((context) => context.week === undefined)
}

function selectStrongestContext(
  candidates: readonly TreatmentFailureContext[],
  materialSignalSet: ReadonlySet<TreatmentFailureSignalKind>
): TreatmentFailureContext | undefined {
  if (candidates.length === 0) {
    return undefined
  }
  let strongest = candidates[0]!
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]!
    if (compareContextsStrongest(strongest, candidate, materialSignalSet) > 0) {
      strongest = candidate
    }
  }
  return strongest
}

function acknowledgmentMatchesPairing(
  acknowledgment: TreatmentLimitationAcknowledgment,
  attribution: ProposedBlameAttribution,
  contextWeek: number | undefined
): boolean {
  if (
    !matchesSubjectProtocol(
      attribution.subjectId,
      attribution.protocolId,
      acknowledgment.subjectId,
      acknowledgment.protocolId
    )
  ) {
    return false
  }

  if (attribution.week !== undefined) {
    if (acknowledgment.week !== undefined && acknowledgment.week !== attribution.week) {
      return false
    }
    return true
  }

  if (contextWeek !== undefined) {
    if (acknowledgment.week !== undefined && acknowledgment.week !== contextWeek) {
      return false
    }
    return true
  }

  return true
}

function resolveAcknowledgment(
  attribution: ProposedBlameAttribution,
  acknowledgments: readonly TreatmentLimitationAcknowledgment[],
  context: TreatmentFailureContext | undefined
): TreatmentLimitationAcknowledgment | undefined {
  const contextWeek = context?.week
  const candidates = acknowledgments.filter((acknowledgment) =>
    acknowledgmentMatchesPairing(acknowledgment, attribution, contextWeek)
  )
  if (candidates.length === 0) {
    return undefined
  }

  const effectiveWeek = attribution.week ?? contextWeek
  if (effectiveWeek !== undefined) {
    const exactWeek = candidates.filter((acknowledgment) => acknowledgment.week === effectiveWeek)
    if (exactWeek.length > 0) {
      return [...exactWeek].sort((left, right) =>
        left.acknowledgmentId.localeCompare(right.acknowledgmentId)
      )[0]
    }

    const weekAgnostic = candidates.filter((acknowledgment) => acknowledgment.week === undefined)
    if (weekAgnostic.length > 0) {
      return [...weekAgnostic].sort((left, right) =>
        left.acknowledgmentId.localeCompare(right.acknowledgmentId)
      )[0]
    }

    return undefined
  }

  return [...candidates].sort((left, right) =>
    left.acknowledgmentId.localeCompare(right.acknowledgmentId)
  )[0]
}

function compareFindings(
  left: TreatmentFailureBlameRoutingFinding,
  right: TreatmentFailureBlameRoutingFinding
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

  const contextDelta = (left.contextId ?? '').localeCompare(right.contextId ?? '')
  if (contextDelta !== 0) {
    return contextDelta
  }

  const attributionDelta = (left.attributionId ?? '').localeCompare(right.attributionId ?? '')
  if (attributionDelta !== 0) {
    return attributionDelta
  }

  return (left.acknowledgmentId ?? '').localeCompare(right.acknowledgmentId ?? '')
}

function formatFindingLine(finding: TreatmentFailureBlameRoutingFinding): string {
  const parts = [
    finding.severity,
    finding.kind,
    `subject:${finding.subjectId}`,
    `protocol:${finding.protocolId}`,
  ]
  if (finding.week !== undefined) {
    parts.push(`week:${finding.week}`)
  }
  if (finding.target !== undefined) {
    parts.push(`target:${finding.target}`)
  }
  if (finding.recommendedAccountabilityFocus !== undefined) {
    parts.push(`focus:${finding.recommendedAccountabilityFocus}`)
  }
  parts.push(finding.detail)
  return parts.join(' · ')
}

function formatReportLines(
  findings: readonly TreatmentFailureBlameRoutingFinding[],
  summary: TreatmentFailureBlameRoutingReport['summary']
): string[] {
  if (findings.length === 0) {
    return [
      `Treatment failure blame routing: findings=0, contexts=${summary.failureContextCount}, prohibited=${summary.prohibitedDeflectionCount}, missingAck=${summary.missingAcknowledgmentCount}`,
    ]
  }

  return [
    `Treatment failure blame routing: findings=${findings.length}, contexts=${summary.failureContextCount}, prohibited=${summary.prohibitedDeflectionCount}, missingAck=${summary.missingAcknowledgmentCount}`,
    ...findings.map((finding) => formatFindingLine(finding)),
  ]
}

function buildAttributionFindings(input: {
  attribution: ProposedBlameAttribution
  context: TreatmentFailureContext | undefined
  acknowledgment: TreatmentLimitationAcknowledgment | undefined
  options: ResolvedBlameRoutingOptions
}): TreatmentFailureBlameRoutingFinding[] {
  const { attribution, context, acknowledgment, options } = input
  const week = attribution.week ?? context?.week
  const findings: TreatmentFailureBlameRoutingFinding[] = []

  if (!context) {
    findings.push({
      kind: 'insufficient_failure_evidence',
      severity: 'info',
      subjectId: attribution.subjectId,
      protocolId: attribution.protocolId,
      week,
      attributionId: attribution.attributionId,
      target: attribution.target,
      recommendedAccountabilityFocus: 'review',
      detail: 'Proposed accountability route lacks a matchable treatment-failure context for this subject and protocol.',
    })
    return findings
  }

  const material = hasMaterialFailure(context, options.materialFailureSignalSet)
  const contextSeverity = normalizeSeverity(context.severity)

  if (!material) {
    findings.push({
      kind: 'insufficient_failure_evidence',
      severity: 'info',
      subjectId: attribution.subjectId,
      protocolId: attribution.protocolId,
      week,
      contextId: context.contextId,
      attributionId: attribution.attributionId,
      target: attribution.target,
      recommendedAccountabilityFocus: 'review',
      detail:
        'Failure context does not include material treatment-failure signals sufficient for blame routing.',
    })
    return findings
  }

  const sharedFields = {
    subjectId: attribution.subjectId,
    protocolId: attribution.protocolId,
    week,
    contextId: context.contextId,
    attributionId: attribution.attributionId,
    target: attribution.target,
  }

  if (isSubjectSideTarget(attribution.target)) {
    const blockedByAutomatic =
      attribution.isAutomatic === true && options.blockAutomaticSubjectDeflection
    const lacksAcknowledgment = acknowledgment === undefined

    if (blockedByAutomatic || lacksAcknowledgment) {
      const severity: TreatmentFailureSeverity =
        blockedByAutomatic && contextSeverity === 'critical' ? 'critical' : 'warning'
      findings.push({
        kind: 'prohibited_subject_deflection',
        severity,
        ...sharedFields,
        recommendedAccountabilityFocus: 'institutional',
        detail: blockedByAutomatic
          ? 'Automatic subject-side accountability deflection is blocked while material treatment failure evidence exists.'
          : 'Subject-side accountability deflection is not supported without an explicit treatment-limitation acknowledgment.',
      })
    } else {
      findings.push({
        kind: 'approved_accountability_route',
        severity: 'info',
        ...sharedFields,
        acknowledgmentId: acknowledgment.acknowledgmentId,
        recommendedAccountabilityFocus: 'shared',
        detail:
          'Subject-side route recorded with explicit treatment-limitation acknowledgment on file.',
      })
    }
    return findings
  }

  if (isInstitutionalTarget(attribution.target)) {
    if (options.requireAcknowledgmentForInstitutionalRoutes && acknowledgment === undefined) {
      findings.push({
        kind: 'missing_treatment_limitation_acknowledgment',
        severity: 'warning',
        ...sharedFields,
        recommendedAccountabilityFocus: 'institutional',
        detail:
          'Institutional accountability route requires an explicit treatment-limitation acknowledgment for this failure context.',
      })
      return findings
    }

    findings.push({
      kind: 'approved_accountability_route',
      severity: 'info',
      ...sharedFields,
      acknowledgmentId: acknowledgment?.acknowledgmentId,
      recommendedAccountabilityFocus: 'institutional',
      detail: acknowledgment
        ? 'Institutional accountability route approved with matching treatment-limitation acknowledgment.'
        : 'Institutional accountability route approved without acknowledgment requirement for this configuration.',
    })
    return findings
  }

  if (isStaffTarget(attribution.target)) {
    findings.push({
      kind: 'approved_accountability_route',
      severity: 'info',
      ...sharedFields,
      recommendedAccountabilityFocus: 'staff',
      detail: 'Staff execution gap route approved against material treatment-failure evidence.',
    })
    return findings
  }

  findings.push({
    kind: 'insufficient_failure_evidence',
    severity: 'info',
    ...sharedFields,
    recommendedAccountabilityFocus: 'review',
    detail: 'Unknown accountability target requires manual review against material failure evidence.',
  })
  return findings
}

function buildInstitutionalAccountabilityRequiredFinding(input: {
  subjectId: string
  protocolId: string
  week: number | undefined
  context: TreatmentFailureContext
  attributionIds: readonly string[]
}): TreatmentFailureBlameRoutingFinding {
  const severity: TreatmentFailureSeverity =
    normalizeSeverity(input.context.severity) === 'critical' ? 'critical' : 'warning'
  return {
    kind: 'institutional_accountability_required',
    severity,
    subjectId: input.subjectId,
    protocolId: input.protocolId,
    week: input.week,
    contextId: input.context.contextId,
    detail:
      input.attributionIds.length === 1
        ? 'Only a subject-side accountability route was proposed despite material treatment failure; institutional accountability review is required.'
        : 'Only subject-side accountability routes were proposed for this failure pair; institutional accountability review is required.',
    recommendedAccountabilityFocus: 'institutional',
  }
}

export function buildTreatmentFailureBlameRoutingReport(
  input: TreatmentFailureBlameRoutingInput
): TreatmentFailureBlameRoutingReport {
  const options = resolveOptions(input.options)

  const failureContexts = dedupeById(
    input.failureContexts
      .map(normalizeContext)
      .filter(
        (row) =>
          row.contextId.length > 0 &&
          row.subjectId.length > 0 &&
          row.protocolId.length > 0
      ),
    (row) => row.contextId
  )
  const proposedAttributions = dedupeById(
    input.proposedAttributions
      .map(normalizeAttribution)
      .filter(
        (row) =>
          row.attributionId.length > 0 && row.subjectId.length > 0 && row.protocolId.length > 0
      ),
    (row) => row.attributionId
  )
  const limitationAcknowledgments = dedupeById(
    (input.limitationAcknowledgments ?? [])
      .map(normalizeAcknowledgment)
      .filter(
        (row) =>
          row.acknowledgmentId.length > 0 &&
          row.subjectId.length > 0 &&
          row.protocolId.length > 0
      ),
    (row) => row.acknowledgmentId
  )

  const findings: TreatmentFailureBlameRoutingFinding[] = []
  const pairedAttributionIds = new Set<string>()

  for (const attribution of proposedAttributions) {
    const candidates = resolveContextCandidates(attribution, failureContexts)
    const context = selectStrongestContext(candidates, options.materialFailureSignalSet)
    if (context) {
      pairedAttributionIds.add(attribution.attributionId)
    }

    const acknowledgment = resolveAcknowledgment(attribution, limitationAcknowledgments, context)
    findings.push(
      ...buildAttributionFindings({
        attribution,
        context,
        acknowledgment,
        options,
      })
    )
  }

  const attributionsByPair = new Map<string, ProposedBlameAttribution[]>()
  for (const attribution of proposedAttributions) {
    const key = pairGroupKey(attribution.subjectId, attribution.protocolId, attribution.week)
    const existing = attributionsByPair.get(key)
    if (existing) {
      existing.push(attribution)
    } else {
      attributionsByPair.set(key, [attribution])
    }
  }

  for (const [, attributions] of attributionsByPair) {
    if (attributions.length === 0) {
      continue
    }

    const sample = attributions[0]!
    const candidates = resolveContextCandidates(sample, failureContexts)
    const context = selectStrongestContext(candidates, options.materialFailureSignalSet)
    if (!context || !hasMaterialFailure(context, options.materialFailureSignalSet)) {
      continue
    }

    const onlySubjectSide = attributions.every((attribution) =>
      isSubjectSideTarget(attribution.target)
    )
    if (!onlySubjectSide) {
      continue
    }

    const acknowledgment = resolveAcknowledgment(sample, limitationAcknowledgments, context)
    if (acknowledgment !== undefined) {
      continue
    }

    const week = sample.week ?? context.week

    const alreadyRequired = findings.some(
      (finding) =>
        finding.kind === 'institutional_accountability_required' &&
        finding.contextId === context.contextId
    )
    if (alreadyRequired) {
      continue
    }

    findings.push(
      buildInstitutionalAccountabilityRequiredFinding({
        subjectId: sample.subjectId,
        protocolId: sample.protocolId,
        week,
        context,
        attributionIds: attributions.map((attribution) => attribution.attributionId),
      })
    )
  }

  const unpairedAttributionCount = proposedAttributions.filter(
    (attribution) => !pairedAttributionIds.has(attribution.attributionId)
  ).length

  findings.sort(compareFindings)

  const countByKind = (kind: TreatmentFailureBlameRoutingFindingKind) =>
    findings.filter((finding) => finding.kind === kind).length

  const summary = {
    failureContextCount: failureContexts.length,
    prohibitedDeflectionCount: countByKind('prohibited_subject_deflection'),
    missingAcknowledgmentCount: countByKind('missing_treatment_limitation_acknowledgment'),
    approvedRouteCount: countByKind('approved_accountability_route'),
    institutionalAccountabilityRequiredCount: countByKind('institutional_accountability_required'),
    insufficientEvidenceCount: countByKind('insufficient_failure_evidence'),
    unpairedAttributionCount,
  }

  return {
    findings,
    summary,
    lines: formatReportLines(findings, summary),
  }
}
