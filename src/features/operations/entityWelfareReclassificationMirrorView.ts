import type { GameState } from '../../domain/models'
import {
  projectReclassificationPressure,
  validateEntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecord,
  type ReclassificationTransitionHistoryEntry,
} from '../../domain/entityWelfareReclassificationRegistry'
import { evaluateEntityWelfareStatusPermissionSet } from '../../domain/entityWelfareStatusPermissions'

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
