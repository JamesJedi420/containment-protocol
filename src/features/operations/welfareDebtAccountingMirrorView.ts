import type { GameState } from '../../domain/models'
import {
  composeWelfareDebtAccountingCrossLinksForRecord,
  formatWelfareDebtAccountabilityMatrixProjectionLabels,
  formatWelfareDebtAccountingCrossLinkLabels,
  formatWelfareDebtFactionEthicsProjectionLabels,
} from '../../domain/welfareDebtAccountingCrossLinks'
import {
  projectWelfareDebtAccounting,
  summarizeWelfareDebtAccountingRecords,
  validateWelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecord,
} from '../../domain/welfareDebtAccountingRegistry'

export interface WelfareDebtAccountingMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  subjectRefLabel: string
  debtCategoryLabel: string
  severityBandLabel: string
  mitigationStateLabel: string
  sourceProcedureLabel: string
  reviewOwnerLabel: string
  mitigationPathLabel: string
  containmentBenefitScoreLabel: string
  crossLinkLabels: readonly string[]
  factionEthicsProjectionLabels: readonly string[]
  accountabilityMatrixProjectionLabels: readonly string[]
  validationWarningLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface WelfareDebtAccountingMirrorSummaryView {
  totalRecords: number
  unresolvedCount: number
  escalatedCount: number
  mitigatedCount: number
  crossLinkedCount: number
  week: number
}

export interface WelfareDebtAccountingMirrorView {
  isEmpty: boolean
  summary: WelfareDebtAccountingMirrorSummaryView
  records: readonly WelfareDebtAccountingMirrorRecordView[]
}

export function formatWelfareDebtAccountingEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): WelfareDebtAccountingRecord[] {
  const map = game.welfareDebtAccountingRecords ?? {}
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

function toRecordView(
  record: WelfareDebtAccountingRecord,
  game: GameState
): WelfareDebtAccountingMirrorRecordView {
  const projection = projectWelfareDebtAccounting(record)
  const validation = validateWelfareDebtAccountingRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  const summaryLabel = record.summary?.trim() ? record.summary : '—'
  const mitigationPathLabel = record.mitigationPathLabel?.trim()
    ? record.mitigationPathLabel
    : '—'

  const crossLinkSummary = composeWelfareDebtAccountingCrossLinksForRecord(record, {
    bundles: game.containedPersonIntegratedHealthBundles,
    coerciveProtocolRecords: game.coerciveContainedPersonProtocolRecords,
    factionEthicsRecords: game.factionEthicsRecords,
    accountabilityMatrixRecords: game.accountabilityMatrixRecords,
  })
  const crossLinkLabels = crossLinkSummary
    ? formatWelfareDebtAccountingCrossLinkLabels(crossLinkSummary)
    : Object.freeze([] as readonly string[])
  const factionEthicsProjectionLabels = crossLinkSummary
    ? formatWelfareDebtFactionEthicsProjectionLabels(
        crossLinkSummary,
        game.factionEthicsRecords
      )
    : Object.freeze([] as readonly string[])
  const accountabilityMatrixProjectionLabels = crossLinkSummary
    ? formatWelfareDebtAccountabilityMatrixProjectionLabels(
        crossLinkSummary,
        game.accountabilityMatrixRecords
      )
    : Object.freeze([] as readonly string[])

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    subjectRefLabel: record.subjectRef,
    debtCategoryLabel: formatWelfareDebtAccountingEnumLabel(record.debtCategory),
    severityBandLabel: formatWelfareDebtAccountingEnumLabel(projection.severityBand),
    mitigationStateLabel: formatWelfareDebtAccountingEnumLabel(projection.mitigationState),
    sourceProcedureLabel: record.sourceProcedureLabel,
    reviewOwnerLabel: record.reviewOwnerLabel,
    mitigationPathLabel,
    containmentBenefitScoreLabel: formatUnitScore(projection.containmentBenefitScore),
    crossLinkLabels,
    factionEthicsProjectionLabels,
    accountabilityMatrixProjectionLabels,
    validationWarningLabels,
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `welfareDebtAccountingRecords`; does not re-validate dropped entries. */
export function getWelfareDebtAccountingMirrorView(
  game: GameState
): WelfareDebtAccountingMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week
  const ledgerSummary = summarizeWelfareDebtAccountingRecords(game.welfareDebtAccountingRecords)

  const recordViews = records.map((record) => toRecordView(record, game))
  const crossLinkedCount = recordViews.filter((record) => record.crossLinkLabels.length > 0).length

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: ledgerSummary.totalRecords,
      unresolvedCount: ledgerSummary.unresolvedCount,
      escalatedCount: ledgerSummary.escalatedCount,
      mitigatedCount: ledgerSummary.mitigatedCount,
      crossLinkedCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
