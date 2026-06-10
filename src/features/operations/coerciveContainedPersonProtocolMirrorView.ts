import type { GameState } from '../../domain/models'
import {
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
  validateCoerciveProtocolRecord,
  type CoerciveProtocolContradictionRiskFlag,
  type CoerciveProtocolRecord,
} from '../../domain/coerciveContainedPersonProtocolRegistry'

export interface CoerciveContainedPersonProtocolMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  subjectRefLabel: string
  handlingModeLabel: string
  handlingPostureLabel: string
  subjectFitStateLabel: string
  authorizationSourceLabel: string
  forcePolicyLabel: string
  consentConfidenceLabel: string
  refusalHandlingLabel: string
  welfareDebtImpactLabel: string
  containmentStabilityGainLabel: string
  personhoodHarmRiskLabel: string
  trustDamageRiskLabel: string
  legitimacyRiskLabel: string
  stableContainmentDominatesCareLabel: string
  coercionRiskScoreLabel: string
  contradictionRiskFlagLabels: readonly string[]
  medicationRegimenRefLabel: string
  custodyStatusRefLabel: string
  procedureRefLabel: string
  subjectFitValidationRefLabel: string
  validationWarningLabels: readonly string[]
  unknownFieldLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface CoerciveContainedPersonProtocolMirrorSummaryView {
  totalRecords: number
  stableContainmentDominatesCareCount: number
  abusivePostureCount: number
  contradictionFlaggedCount: number
  week: number
}

export interface CoerciveContainedPersonProtocolMirrorView {
  isEmpty: boolean
  summary: CoerciveContainedPersonProtocolMirrorSummaryView
  records: readonly CoerciveContainedPersonProtocolMirrorRecordView[]
}

export function formatCoerciveProtocolEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): CoerciveProtocolRecord[] {
  const map = game.coerciveContainedPersonProtocolRecords ?? {}
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

function formatOptionalRef(value: string | undefined): string {
  return value?.trim() ? value : '—'
}

function formatContradictionRiskFlagLabel(flag: CoerciveProtocolContradictionRiskFlag): string {
  return formatCoerciveProtocolEnumLabel(flag)
}

function sortedUnknownFieldLabels(unknownFields: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...(unknownFields ?? [])].sort((left, right) => left.localeCompare(right)))
}

function toRecordView(record: CoerciveProtocolRecord): CoerciveContainedPersonProtocolMirrorRecordView {
  const tradeoff = projectContainmentCareTradeoff(record)
  const riskReview = projectCoerciveProtocolRiskReview(record)
  const validation = validateCoerciveProtocolRecord(record)

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
    subjectRefLabel: record.subjectRef,
    handlingModeLabel: formatCoerciveProtocolEnumLabel(record.handlingMode),
    handlingPostureLabel: formatCoerciveProtocolEnumLabel(riskReview.handlingPosture),
    subjectFitStateLabel: formatCoerciveProtocolEnumLabel(record.subjectFitState),
    authorizationSourceLabel: formatCoerciveProtocolEnumLabel(record.authorizationSource),
    forcePolicyLabel: formatCoerciveProtocolEnumLabel(record.forcePolicy),
    consentConfidenceLabel: formatUnitScore(record.consentConfidence),
    refusalHandlingLabel: formatCoerciveProtocolEnumLabel(record.refusalHandling),
    welfareDebtImpactLabel: tradeoff.welfareDebtImpactLabel,
    containmentStabilityGainLabel: formatUnitScore(tradeoff.containmentStabilityGain),
    personhoodHarmRiskLabel: formatUnitScore(tradeoff.personhoodHarmRisk),
    trustDamageRiskLabel: formatUnitScore(tradeoff.trustDamageRisk),
    legitimacyRiskLabel: formatUnitScore(tradeoff.legitimacyRisk),
    stableContainmentDominatesCareLabel: formatYesNo(tradeoff.stableContainmentDominatesCare),
    coercionRiskScoreLabel: formatUnitScore(riskReview.coercionRiskScore),
    contradictionRiskFlagLabels: Object.freeze(
      riskReview.contradictionRiskFlags.map((flag) => formatContradictionRiskFlagLabel(flag))
    ),
    medicationRegimenRefLabel: formatOptionalRef(record.medicationRegimenRef),
    custodyStatusRefLabel: formatOptionalRef(record.custodyStatusRef),
    procedureRefLabel: formatOptionalRef(record.procedureRef),
    subjectFitValidationRefLabel: formatOptionalRef(record.subjectFitValidationRef),
    validationWarningLabels,
    unknownFieldLabels: sortedUnknownFieldLabels(riskReview.unknownFields),
    confidenceLabel: formatConfidence(riskReview.confidence),
    redacted: tradeoff.redacted || riskReview.redacted,
  })
}

/** Read-only mirror over hydrated `coerciveContainedPersonProtocolRecords`; does not re-validate dropped entries. */
export function getCoerciveContainedPersonProtocolMirrorView(
  game: GameState
): CoerciveContainedPersonProtocolMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let stableContainmentDominatesCareCount = 0
  let abusivePostureCount = 0
  let contradictionFlaggedCount = 0

  const recordViews = records.map((record) => {
    const tradeoff = projectContainmentCareTradeoff(record)
    const riskReview = projectCoerciveProtocolRiskReview(record)

    if (tradeoff.stableContainmentDominatesCare) {
      stableContainmentDominatesCareCount += 1
    }

    if (riskReview.handlingPosture === 'abusive') {
      abusivePostureCount += 1
    }

    if (riskReview.contradictionRiskFlags.length > 0) {
      contradictionFlaggedCount += 1
    }

    return toRecordView(record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      stableContainmentDominatesCareCount,
      abusivePostureCount,
      contradictionFlaggedCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
