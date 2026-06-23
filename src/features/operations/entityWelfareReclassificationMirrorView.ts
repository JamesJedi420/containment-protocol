import type { GameState } from '../../domain/models'
import {
  projectReclassificationPressure,
  validateEntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecord,
  type ReclassificationTransitionHistoryEntry,
} from '../../domain/entityWelfareReclassificationRegistry'
import {
  evaluateAffiliationRevocationOutcome,
  type AffiliationRevocationCause,
  type AffiliationRevocationKind,
} from '../../domain/affiliationRevocationOutcomes'
import {
  evaluateAffiliationSiteClearance,
  type AffiliationSiteClearanceDecision,
} from '../../domain/affiliationSiteClearance'
import type { AffiliationOnboardingDecision } from '../../domain/affiliationOnboardingReadiness'
import {
  ENTITY_WELFARE_PERMISSION_SURFACES,
  evaluateEntityWelfareStatusPermissionSet,
  type EntityWelfarePermissionDecision,
  type EntityWelfarePermissionSurface,
} from '../../domain/entityWelfareStatusPermissions'

export interface EntityWelfareReclassificationMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  priorThreatLabel: string
  proposedDispositionLabel: string
  reclassificationStateLabel: string
  reviewGateLabel: string
  welfareDebtLinkedLabel: string
  staffMoraleForecastLabel: string
  liabilityForecastLabel: string
  publicRiskForecastLabel: string
  evidenceBundleRefLabels: readonly string[]
  containmentRevisionRefLabels: readonly string[]
  transitionHistoryLabels: readonly string[]
  permissionDecisionLabels: readonly string[]
  accessOutcomeLabels: readonly string[]
  siteClearanceLabels: readonly string[]
  validationWarningLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface EntityWelfareReclassificationMirrorSummaryView {
  totalRecords: number
  pendingCount: number
  terminalCount: number
  welfareDebtLinkedCount: number
  week: number
}

export interface EntityWelfareReclassificationMirrorView {
  isEmpty: boolean
  summary: EntityWelfareReclassificationMirrorSummaryView
  records: readonly EntityWelfareReclassificationMirrorRecordView[]
}

const TERMINAL_STATES = new Set(['approved', 'denied', 'reverted'])
const SENSITIVE_ACCESS_SURFACES: readonly EntityWelfarePermissionSurface[] = [
  'file',
  'gear',
  'mission',
] as const

export function formatEntityWelfareReclassificationEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): EntityWelfareReclassificationRecord[] {
  const map = game.entityWelfareReclassificationRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatUnitScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function formatTransitionHistoryLabel(entry: ReclassificationTransitionHistoryEntry): string {
  const fromLabel = formatEntityWelfareReclassificationEnumLabel(entry.fromState)
  const toLabel = formatEntityWelfareReclassificationEnumLabel(entry.toState)
  const gateSuffix = entry.reviewGate
    ? ` (${formatEntityWelfareReclassificationEnumLabel(entry.reviewGate)})`
    : ''

  return `W${entry.week}: ${fromLabel} → ${toLabel}${gateSuffix}`
}

function formatPermissionDecisionLabels(
  record: EntityWelfareReclassificationRecord
): readonly string[] {
  return Object.freeze(
    evaluateEntityWelfareStatusPermissionSet(record).map(
      (decision) => `${decision.surfaceLabel}: ${decision.outcomeLabel}`
    )
  )
}

function selectRelevantPermissionDecision(
  decisions: readonly EntityWelfarePermissionDecision[],
  affectedSurfaces: readonly EntityWelfarePermissionSurface[]
): EntityWelfarePermissionDecision | undefined {
  return (
    decisions.find(
      (decision) => affectedSurfaces.includes(decision.surface) && decision.outcome === 'blocked'
    ) ??
    decisions.find(
      (decision) => affectedSurfaces.includes(decision.surface) && decision.outcome === 'restricted'
    )
  )
}

function buildReadOnlyOnboardingDecision(
  record: EntityWelfareReclassificationRecord
): AffiliationOnboardingDecision {
  const cleared = record.reclassificationState === 'approved'
  const screening = record.reclassificationState === 'pending'
  const stage = cleared ? 'cleared' : screening ? 'screening' : 'lost'

  return Object.freeze({
    candidateId: record.id,
    candidateName: record.label,
    stage,
    stageLabel: formatEntityWelfareReclassificationEnumLabel(stage),
    fullAccessEligible: cleared,
    checkpointDecisions: Object.freeze([]),
    reasonCodes: Object.freeze([`mirror_reclassification_${record.reclassificationState}`]),
  })
}

function formatRevocationDecisionLabels(
  record: EntityWelfareReclassificationRecord,
  kind: AffiliationRevocationKind,
  cause: AffiliationRevocationCause,
  affectedSurfaces: readonly EntityWelfarePermissionSurface[],
  permissionDecision?: EntityWelfarePermissionDecision
): readonly string[] {
  const decision = evaluateAffiliationRevocationOutcome({
    subjectId: record.id,
    subjectLabel: record.label,
    kind,
    cause,
    affectedSurfaces,
    permissionDecision,
  })

  const labels = [`Outcome: ${decision.outcomeLabel}`, `Trust: ${decision.trustOutcomeLabel}`]
  if (decision.blockedSurfaceLabels.length > 0) {
    labels.push(`Blocked: ${decision.blockedSurfaceLabels.join(', ')}`)
  }

  return Object.freeze(labels)
}

function selectSiteClearanceDecision(
  record: EntityWelfareReclassificationRecord
): AffiliationSiteClearanceDecision {
  const permissionDecisions = evaluateEntityWelfareStatusPermissionSet(record)
  const missionPermission = permissionDecisions.find((decision) => decision.surface === 'mission')
  const siteId = record.evidenceBundleRefs?.[0] ?? ''
  const facilityId = record.containmentRevisionRefs?.[0] ?? ''
  const approved = record.reclassificationState === 'approved'
  const pending = record.reclassificationState === 'pending'
  const blocked =
    record.reclassificationState === 'denied' || record.reclassificationState === 'reverted'

  return evaluateAffiliationSiteClearance({
    subjectId: record.id,
    subjectLabel: record.label,
    surface: 'mission',
    onboardingDecision: buildReadOnlyOnboardingDecision(record),
    basePermissionDecision: missionPermission,
    context: {
      boundary: facilityId ? 'facility' : 'site',
      siteId,
      siteLabel: siteId || 'Unscoped site',
      facilityId,
      facilityLabel: facilityId || 'Unscoped facility',
      siteLayer: facilityId ? 'interior' : 'transition',
      grantedSiteIds: approved && siteId ? [siteId] : [],
      grantedFacilityIds: approved && facilityId ? [facilityId] : [],
      restrictedSiteIds: pending && siteId ? [siteId] : [],
      restrictedFacilityIds: pending && facilityId ? [facilityId] : [],
      blockedSiteIds: blocked && siteId ? [siteId] : [],
      blockedFacilityIds: blocked && facilityId ? [facilityId] : [],
    },
  })
}

function formatSiteClearanceLabels(record: EntityWelfareReclassificationRecord): readonly string[] {
  const decision = selectSiteClearanceDecision(record)
  const labels = [
    `${decision.surfaceLabel}: ${decision.outcomeLabel}`,
    `${decision.boundaryLabel}: ${decision.siteSpecific ? 'Scoped' : 'Unscoped'}`,
    `Site: ${decision.siteLabel}`,
  ]

  if (decision.facilityId !== 'facility:unknown') {
    labels.push(`Facility: ${decision.facilityLabel}`)
  }

  if (decision.reasonCodes.length > 0) {
    labels.push(`Reasons: ${decision.reasonCodes.join(', ')}`)
  }

  return Object.freeze(labels)
}

function formatAccessOutcomeLabels(record: EntityWelfareReclassificationRecord): readonly string[] {
  if (record.reclassificationState === 'approved') {
    return Object.freeze(['Outcome: Unchanged', 'Trust: Trusted'])
  }

  const permissionDecisions = evaluateEntityWelfareStatusPermissionSet(record)

  if (record.reclassificationState === 'pending') {
    const affectedSurfaces = ENTITY_WELFARE_PERMISSION_SURFACES
    return formatRevocationDecisionLabels(
      record,
      'clearance_review',
      'policy_violation',
      affectedSurfaces,
      selectRelevantPermissionDecision(permissionDecisions, affectedSurfaces)
    )
  }

  if (record.reclassificationState === 'denied') {
    return formatRevocationDecisionLabels(
      record,
      'revocation',
      'policy_violation',
      SENSITIVE_ACCESS_SURFACES,
      selectRelevantPermissionDecision(permissionDecisions, SENSITIVE_ACCESS_SURFACES)
    )
  }

  if (record.reclassificationState === 'reverted') {
    return formatRevocationDecisionLabels(
      record,
      'downgrade',
      'exposure_risk',
      SENSITIVE_ACCESS_SURFACES
    )
  }

  return formatRevocationDecisionLabels(
    record,
    'unknown',
    'unknown',
    ENTITY_WELFARE_PERMISSION_SURFACES,
    selectRelevantPermissionDecision(permissionDecisions, ENTITY_WELFARE_PERMISSION_SURFACES)
  )
}

function toRecordView(
  record: EntityWelfareReclassificationRecord
): EntityWelfareReclassificationMirrorRecordView {
  const projection = projectReclassificationPressure(record)
  const validation = validateEntityWelfareReclassificationRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.detail)
  )

  const summaryLabel = record.summary?.trim() ? record.summary : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    priorThreatLabel: record.priorThreatLabel,
    proposedDispositionLabel: formatEntityWelfareReclassificationEnumLabel(
      record.proposedDisposition
    ),
    reclassificationStateLabel: formatEntityWelfareReclassificationEnumLabel(
      record.reclassificationState
    ),
    reviewGateLabel: record.reviewGate
      ? formatEntityWelfareReclassificationEnumLabel(record.reviewGate)
      : '—',
    welfareDebtLinkedLabel: formatYesNo(projection.welfareDebtLinked),
    staffMoraleForecastLabel: formatUnitScore(projection.staffMoraleForecast),
    liabilityForecastLabel: formatUnitScore(projection.liabilityForecast),
    publicRiskForecastLabel: formatUnitScore(projection.publicRiskForecast),
    evidenceBundleRefLabels: Object.freeze([...(record.evidenceBundleRefs ?? [])]),
    containmentRevisionRefLabels: Object.freeze([...(record.containmentRevisionRefs ?? [])]),
    transitionHistoryLabels: Object.freeze(
      (record.transitionHistory ?? []).map((entry) => formatTransitionHistoryLabel(entry))
    ),
    permissionDecisionLabels: formatPermissionDecisionLabels(record),
    accessOutcomeLabels: formatAccessOutcomeLabels(record),
    siteClearanceLabels: formatSiteClearanceLabels(record),
    validationWarningLabels,
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `entityWelfareReclassificationRecords`; does not re-validate dropped entries. */
export function getEntityWelfareReclassificationMirrorView(
  game: GameState
): EntityWelfareReclassificationMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let pendingCount = 0
  let terminalCount = 0
  let welfareDebtLinkedCount = 0

  const recordViews = records.map((record) => {
    if (record.reclassificationState === 'pending') {
      pendingCount += 1
    }

    if (TERMINAL_STATES.has(record.reclassificationState)) {
      terminalCount += 1
    }

    const projection = projectReclassificationPressure(record)
    if (projection.welfareDebtLinked) {
      welfareDebtLinkedCount += 1
    }

    return toRecordView(record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      pendingCount,
      terminalCount,
      welfareDebtLinkedCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
