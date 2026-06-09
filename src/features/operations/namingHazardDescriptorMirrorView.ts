import { formatIntakeReportCrossLinkLabel } from '../../domain/informationIntakeNamingHazardCrossLinkSurfacing'
import { listIntakeReportsForNamingHazardDescriptor } from '../../domain/informationIntakeNamingHazardCrossLink'
import type { GameState } from '../../domain/models'
import {
  projectSafeLabel,
  validateNamingHazardDescriptorRecord,
  type NamingHazardDescriptorRecord,
} from '../../domain/namingHazardDescriptorRegistry'

const ORCHESTRATION_WEEK_TOKEN_PREFIX = 'orchestration_week:'

export interface NamingHazardDescriptorMirrorRecordView {
  id: string
  displayLabel: string
  safeBriefingLabel: string
  safeMapLabel: string
  summaryLabel: string
  uiSubstitutionPolicyLabel: string
  mapLabelModeLabel: string
  trueNameForbiddenLabel: string
  referenceConstraintLabels: readonly string[]
  safeDescriptorPoolLabels: readonly string[]
  intakeTopicRefLabel: string
  crossLinkLabels: readonly string[]
  orchestrationWeekLabels: readonly string[]
  redactedFieldLabels: readonly string[]
  unknownFieldLabels: readonly string[]
  confidenceLabel: string
  validationWarningLabels: readonly string[]
  redacted: boolean
  confidenceRedacted: boolean
}

export interface NamingHazardDescriptorMirrorSummaryView {
  totalRecords: number
  redactedSubstitutionCount: number
  confidenceRedactedCount: number
  crossLinkedCount: number
  orchestratedCount: number
  week: number
}

export interface NamingHazardDescriptorMirrorView {
  isEmpty: boolean
  summary: NamingHazardDescriptorMirrorSummaryView
  records: readonly NamingHazardDescriptorMirrorRecordView[]
}

export function formatNamingHazardDescriptorEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): NamingHazardDescriptorRecord[] {
  const map = game.namingHazardDescriptorRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function extractOrchestrationWeekLabels(
  unknownFields: readonly string[] | undefined
): readonly string[] {
  return Object.freeze(
    [...(unknownFields ?? [])]
      .filter((field) => field.startsWith(ORCHESTRATION_WEEK_TOKEN_PREFIX))
      .sort((left, right) => left.localeCompare(right))
  )
}

function extractNonOrchestrationUnknownFields(
  unknownFields: readonly string[] | undefined
): readonly string[] {
  return Object.freeze(
    [...(unknownFields ?? [])]
      .filter((field) => !field.startsWith(ORCHESTRATION_WEEK_TOKEN_PREFIX))
      .sort((left, right) => left.localeCompare(right))
  )
}

function buildCrossLinkLabels(
  game: GameState,
  record: NamingHazardDescriptorRecord
): readonly string[] {
  const reports = listIntakeReportsForNamingHazardDescriptor(
    game.informationIntakeReports,
    record
  )

  return Object.freeze(reports.map((report) => formatIntakeReportCrossLinkLabel(report)))
}

function toRecordView(
  game: GameState,
  record: NamingHazardDescriptorRecord
): NamingHazardDescriptorMirrorRecordView {
  const briefingProjection = projectSafeLabel(record, { surface: 'briefing' })
  const mapProjection = projectSafeLabel(record, { surface: 'map' })
  const validation = validateNamingHazardDescriptorRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  const redactedFields = [...(record.redactedFields ?? [])].sort((left, right) =>
    left.localeCompare(right)
  )
  const confidenceRedacted = redactedFields.includes('confidence')

  const displayLabel = record.trueNameForbidden ? briefingProjection.safeLabel : record.label
  const summaryLabel = record.summary?.trim() ? record.summary : '—'
  const intakeTopicRefLabel = record.intakeTopicRef?.trim() ? record.intakeTopicRef : '—'

  const referenceConstraintLabels = Object.freeze(
    (record.referenceConstraints ?? []).map((constraint) =>
      formatNamingHazardDescriptorEnumLabel(constraint)
    )
  )

  const safeDescriptorPoolLabels = Object.freeze([...(record.safeDescriptorPool ?? [])])
  const orchestrationWeekLabels = extractOrchestrationWeekLabels(record.unknownFields)
  const unknownFieldLabels = extractNonOrchestrationUnknownFields(record.unknownFields)
  const crossLinkLabels = buildCrossLinkLabels(game, record)

  return Object.freeze({
    id: record.id,
    displayLabel,
    safeBriefingLabel: briefingProjection.safeLabel,
    safeMapLabel: mapProjection.safeLabel,
    summaryLabel,
    uiSubstitutionPolicyLabel: formatNamingHazardDescriptorEnumLabel(record.uiSubstitutionPolicy),
    mapLabelModeLabel: formatNamingHazardDescriptorEnumLabel(record.mapLabelMode),
    trueNameForbiddenLabel: formatYesNo(record.trueNameForbidden),
    referenceConstraintLabels,
    safeDescriptorPoolLabels,
    intakeTopicRefLabel,
    crossLinkLabels,
    orchestrationWeekLabels,
    redactedFieldLabels: Object.freeze(redactedFields),
    unknownFieldLabels,
    confidenceLabel: confidenceRedacted ? '—' : formatConfidence(record.confidence),
    validationWarningLabels,
    redacted: briefingProjection.redacted,
    confidenceRedacted,
  })
}

/** Read-only mirror over hydrated `namingHazardDescriptorRecords`; does not re-validate dropped entries. */
export function getNamingHazardDescriptorMirrorView(
  game: GameState
): NamingHazardDescriptorMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let redactedSubstitutionCount = 0
  let confidenceRedactedCount = 0
  let crossLinkedCount = 0
  let orchestratedCount = 0

  const recordViews = records.map((record) => {
    if (record.uiSubstitutionPolicy === 'redacted') {
      redactedSubstitutionCount += 1
    }

    if ((record.redactedFields ?? []).includes('confidence')) {
      confidenceRedactedCount += 1
    }

    if (buildCrossLinkLabels(game, record).length > 0) {
      crossLinkedCount += 1
    }

    if (extractOrchestrationWeekLabels(record.unknownFields).length > 0) {
      orchestratedCount += 1
    }

    return toRecordView(game, record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      redactedSubstitutionCount,
      confidenceRedactedCount,
      crossLinkedCount,
      orchestratedCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
