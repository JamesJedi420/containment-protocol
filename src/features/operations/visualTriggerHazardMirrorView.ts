import type { GameState } from '../../domain/models'
import {
  observerAwarenessEscalation,
  projectExposureChainRisk,
  resolveDisposalDeadlineCompliance,
  validateVisualTriggerHazardRecord,
  type VisualTriggerHazardRecord,
} from '../../domain/visualTriggerHazardRegistry'

export interface VisualTriggerHazardMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  triggerMediumLabel: string
  awarenessRequirementLabel: string
  derivativeHazardProfileLabel: string
  pursuitStateLabel: string
  occlusionStateLabel: string
  observerAwarenessBandLabel: string
  targetInstanceLabels: readonly string[]
  disposalCompliantLabel: string
  disposalRequiredActionLabels: readonly string[]
  disposalPendingMediaLabels: readonly string[]
  broadcastRiskScoreLabel: string
  escalationBandLabel: string
  repostChainDepthLabel: string
  latentActivationForecastLabel: string
  requiredCountermeasureLabels: readonly string[]
  pursuitPressureLabel: string
  manifestationRiskLabel: string
  projectedPursuitStateLabel: string
  communicationFailureLabel: string
  dreamIntrusionLabel: string
  evidenceCorruptionBandLabel: string
  validationWarningLabels: readonly string[]
  confidenceLabel: string
  filterFailureModeLabel: string | null
  hazardousMediaCountLabel: string
}

export interface VisualTriggerHazardMirrorSummaryView {
  totalRecords: number
  activePursuitCount: number
  disposalCompliancePendingCount: number
  broadcastEscalationCount: number
  week: number
}

export interface VisualTriggerHazardMirrorView {
  isEmpty: boolean
  summary: VisualTriggerHazardMirrorSummaryView
  records: readonly VisualTriggerHazardMirrorRecordView[]
}

export function formatVisualTriggerHazardEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): VisualTriggerHazardRecord[] {
  const map = game.visualTriggerHazardRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatUnitScore(value: number): string {
  return value.toFixed(2)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function resolveAwarenessEscalationProjection(record: VisualTriggerHazardRecord) {
  const priorBand = 'unaware' as const
  const nextBand = record.observerAwarenessBand ?? 'unaware'

  return observerAwarenessEscalation(record, priorBand, nextBand)
}

function toRecordView(
  record: VisualTriggerHazardRecord,
  week: number
): VisualTriggerHazardMirrorRecordView {
  const compliance = resolveDisposalDeadlineCompliance(record, week)
  const exposure = projectExposureChainRisk(record)
  const escalation = resolveAwarenessEscalationProjection(record)
  const validation = validateVisualTriggerHazardRecord(record)

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
    triggerMediumLabel: formatVisualTriggerHazardEnumLabel(record.triggerMedium),
    awarenessRequirementLabel: formatVisualTriggerHazardEnumLabel(record.awarenessRequirement),
    derivativeHazardProfileLabel: formatVisualTriggerHazardEnumLabel(record.derivativeHazardProfile),
    pursuitStateLabel: formatVisualTriggerHazardEnumLabel(record.pursuitState),
    occlusionStateLabel: formatVisualTriggerHazardEnumLabel(record.occlusionState),
    observerAwarenessBandLabel: record.observerAwarenessBand
      ? formatVisualTriggerHazardEnumLabel(record.observerAwarenessBand)
      : '—',
    targetInstanceLabels: Object.freeze([...(record.targetInstanceIds ?? [])]),
    disposalCompliantLabel: compliance.compliant ? 'Yes' : 'No',
    disposalRequiredActionLabels: Object.freeze(
      compliance.requiredActions.map((action) => formatVisualTriggerHazardEnumLabel(action))
    ),
    disposalPendingMediaLabels: Object.freeze([...compliance.pendingComplianceMediaInstanceIds]),
    broadcastRiskScoreLabel: formatUnitScore(exposure.broadcastRiskScore),
    escalationBandLabel: formatVisualTriggerHazardEnumLabel(exposure.escalationBand),
    repostChainDepthLabel: String(exposure.repostChainDepth),
    latentActivationForecastLabel: formatYesNo(exposure.latentActivationForecast),
    requiredCountermeasureLabels: Object.freeze([...exposure.requiredCountermeasures]),
    pursuitPressureLabel: formatUnitScore(escalation.pursuitPressure),
    manifestationRiskLabel: formatUnitScore(escalation.manifestationRisk),
    projectedPursuitStateLabel: formatVisualTriggerHazardEnumLabel(escalation.pursuitState),
    communicationFailureLabel: formatYesNo(escalation.communicationFailure),
    dreamIntrusionLabel: formatYesNo(escalation.dreamIntrusion),
    evidenceCorruptionBandLabel: formatVisualTriggerHazardEnumLabel(
      escalation.evidenceCorruptionBand
    ),
    validationWarningLabels,
    confidenceLabel: formatConfidence(record.confidence),
    filterFailureModeLabel: record.filterFailureMode?.trim() ? record.filterFailureMode : null,
    hazardousMediaCountLabel: String(record.hazardousMediaInstances?.length ?? 0),
  })
}

/** Read-only mirror over hydrated `visualTriggerHazardRecords`; does not re-validate dropped entries. */
export function getVisualTriggerHazardMirrorView(game: GameState): VisualTriggerHazardMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let activePursuitCount = 0
  let disposalCompliancePendingCount = 0
  let broadcastEscalationCount = 0

  const recordViews = records.map((record) => {
    if (record.pursuitState === 'active_pursuit') {
      activePursuitCount += 1
    }

    const compliance = resolveDisposalDeadlineCompliance(record, week)
    if (compliance.pendingComplianceMediaInstanceIds.length > 0 && !compliance.compliant) {
      disposalCompliancePendingCount += 1
    }

    const exposure = projectExposureChainRisk(record)
    if (exposure.escalationBand === 'broadcast') {
      broadcastEscalationCount += 1
    }

    return toRecordView(record, week)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      activePursuitCount,
      disposalCompliancePendingCount,
      broadcastEscalationCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
