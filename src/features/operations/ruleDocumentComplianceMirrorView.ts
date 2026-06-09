import type { GameState } from '../../domain/models'
import {
  projectComplianceDecay,
  validateRuleDocumentComplianceRecord,
  type RuleDocumentComplianceRecord,
  type RevisionAuditSymptom,
} from '../../domain/ruleDocumentComplianceContainmentRegistry'

export interface RuleDocumentComplianceMirrorAuditSymptomView {
  ref: string
  symptomDescriptor: string
  auditGapHintLabel: string
}

export interface RuleDocumentComplianceMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  documentRefLabel: string
  bindingStrengthLabel: string
  complianceStateLabel: string
  physicalCopyRequiredLabel: string
  breachConsequenceLabel: string | null
  revisionHistoryLabels: readonly string[]
  auditorAssigneeLabels: readonly string[]
  driftProbabilityLabel: string
  complianceDecayBandLabel: string
  revisionAuditSymptoms: readonly RuleDocumentComplianceMirrorAuditSymptomView[]
  validationWarningLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface RuleDocumentComplianceMirrorSummaryView {
  totalRecords: number
  breachCount: number
  criticalBandCount: number
  week: number
}

export interface RuleDocumentComplianceMirrorView {
  isEmpty: boolean
  summary: RuleDocumentComplianceMirrorSummaryView
  records: readonly RuleDocumentComplianceMirrorRecordView[]
}

export function formatRuleDocumentComplianceEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): RuleDocumentComplianceRecord[] {
  const map = game.ruleDocumentComplianceRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatDriftProbability(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(3)
}

function formatDecayBand(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return formatRuleDocumentComplianceEnumLabel(value)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function toAuditSymptomView(symptom: RevisionAuditSymptom): RuleDocumentComplianceMirrorAuditSymptomView {
  return Object.freeze({
    ref: symptom.ref,
    symptomDescriptor: symptom.symptomDescriptor,
    auditGapHintLabel: symptom.auditGapHint ?? '—',
  })
}

function toRecordView(
  record: RuleDocumentComplianceRecord,
  week: number
): RuleDocumentComplianceMirrorRecordView {
  const projection = projectComplianceDecay(record, { currentWeek: week })
  const validation = validateRuleDocumentComplianceRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  const summaryLabel = record.summary?.trim() ? record.summary : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    documentRefLabel: record.documentRef,
    bindingStrengthLabel: formatRuleDocumentComplianceEnumLabel(record.bindingStrength),
    complianceStateLabel: formatRuleDocumentComplianceEnumLabel(record.complianceState),
    physicalCopyRequiredLabel: formatYesNo(record.physicalCopyRequired),
    breachConsequenceLabel: record.breachConsequence
      ? formatRuleDocumentComplianceEnumLabel(record.breachConsequence)
      : null,
    revisionHistoryLabels: Object.freeze([...(record.revisionHistoryRefs ?? [])]),
    auditorAssigneeLabels: Object.freeze([...(record.auditorAssigneeRefs ?? [])]),
    driftProbabilityLabel: formatDriftProbability(projection.driftProbabilityPerWeek),
    complianceDecayBandLabel: formatDecayBand(projection.complianceDecayBand),
    revisionAuditSymptoms: Object.freeze(
      projection.revisionAuditSymptoms.map((symptom) => toAuditSymptomView(symptom))
    ),
    validationWarningLabels,
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `ruleDocumentComplianceRecords`; does not re-validate dropped entries. */
export function getRuleDocumentComplianceMirrorView(
  game: GameState
): RuleDocumentComplianceMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let breachCount = 0
  let criticalBandCount = 0

  const recordViews = records.map((record) => {
    if (record.complianceState === 'breach') {
      breachCount += 1
    }

    const projection = projectComplianceDecay(record, { currentWeek: week })
    if (projection.complianceDecayBand === 'critical') {
      criticalBandCount += 1
    }

    return toRecordView(record, week)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      breachCount,
      criticalBandCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
