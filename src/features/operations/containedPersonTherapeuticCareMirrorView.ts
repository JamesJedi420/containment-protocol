import type { GameState } from '../../domain/models'
import {
  projectCareComplianceRisk,
  validateTherapeuticCareScheduleRecord,
  type TherapeuticCareScheduleRecord,
} from '../../domain/containedPersonTherapeuticCareRegistry'

export interface ContainedPersonTherapeuticCareMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  subjectRefLabel: string
  careModeLabel: string
  cadenceLabel: string
  channelStateLabel: string
  missedSessionStreakLabel: string
  staffAssigneeRefLabels: readonly string[]
  containmentDependencyLabel: string
  suspensionCauseRefLabel: string
  complianceRiskScoreLabel: string
  lockdownEscalationLikelyLabel: string
  validationWarningLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface ContainedPersonTherapeuticCareMirrorSummaryView {
  totalRecords: number
  degradedChannelCount: number
  suspendedChannelCount: number
  lockdownEscalationCount: number
  week: number
}

export interface ContainedPersonTherapeuticCareMirrorView {
  isEmpty: boolean
  summary: ContainedPersonTherapeuticCareMirrorSummaryView
  records: readonly ContainedPersonTherapeuticCareMirrorRecordView[]
}

export function formatContainedPersonTherapeuticCareEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): TherapeuticCareScheduleRecord[] {
  const map = game.containedPersonTherapeuticCareRecords ?? {}
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

function sortedStaffAssigneeRefLabels(record: TherapeuticCareScheduleRecord): readonly string[] {
  return Object.freeze(
    [...(record.staffAssigneeRefs ?? [])].sort((left, right) => left.localeCompare(right))
  )
}

function toRecordView(
  record: TherapeuticCareScheduleRecord
): ContainedPersonTherapeuticCareMirrorRecordView {
  const projection = projectCareComplianceRisk(record)
  const validation = validateTherapeuticCareScheduleRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  const summaryLabel = record.summary?.trim() ? record.summary : '—'
  const suspensionCauseRefLabel = record.suspensionCauseRef?.trim()
    ? record.suspensionCauseRef
    : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    subjectRefLabel: record.subjectRef,
    careModeLabel: formatContainedPersonTherapeuticCareEnumLabel(record.careMode),
    cadenceLabel: formatContainedPersonTherapeuticCareEnumLabel(record.cadence),
    channelStateLabel: formatContainedPersonTherapeuticCareEnumLabel(record.channelState),
    missedSessionStreakLabel: String(record.missedSessionStreak),
    staffAssigneeRefLabels: sortedStaffAssigneeRefLabels(record),
    containmentDependencyLabel: formatYesNo(record.containmentDependency === true),
    suspensionCauseRefLabel,
    complianceRiskScoreLabel: formatUnitScore(projection.complianceRiskScore),
    lockdownEscalationLikelyLabel: formatYesNo(projection.lockdownEscalationLikely),
    validationWarningLabels,
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `containedPersonTherapeuticCareRecords`; does not re-validate dropped entries. */
export function getContainedPersonTherapeuticCareMirrorView(
  game: GameState
): ContainedPersonTherapeuticCareMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let degradedChannelCount = 0
  let suspendedChannelCount = 0
  let lockdownEscalationCount = 0

  const recordViews = records.map((record) => {
    if (record.channelState === 'degraded') {
      degradedChannelCount += 1
    }

    if (record.channelState === 'suspended') {
      suspendedChannelCount += 1
    }

    const projection = projectCareComplianceRisk(record)
    if (projection.lockdownEscalationLikely) {
      lockdownEscalationCount += 1
    }

    return toRecordView(record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      degradedChannelCount,
      suspendedChannelCount,
      lockdownEscalationCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
