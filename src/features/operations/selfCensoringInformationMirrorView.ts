import type { GameState } from '../../domain/models'
import {
  projectAntimemeticCaseView,
  type NegativeFactPredicate,
  type SelfCensoringInformationRecord,
} from '../../domain/selfCensoringInformationRegistry'

export interface SelfCensoringInformationMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  propagationResistanceLabels: readonly string[]
  negativeFactLabels: readonly string[]
  parentCaseRefLabel: string
  retentionDecayTimerLabel: string
  rediscoveryLoopCountLabel: string
  lastAlarmWeekLabel: string
  forgottenWarningRefCount: number
  informationFailureModeLabel: string | null
  usableArchiveStateLabel: string | null
  absenceSignalCount: number
  contradictionSignalLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface SelfCensoringInformationMirrorSummaryView {
  totalRecords: number
  retentionTimerActiveCount: number
  rediscoveryLoopActiveCount: number
  week: number
}

export interface SelfCensoringInformationMirrorView {
  isEmpty: boolean
  summary: SelfCensoringInformationMirrorSummaryView
  records: readonly SelfCensoringInformationMirrorRecordView[]
}

export function formatSelfCensoringEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): SelfCensoringInformationRecord[] {
  const map = game.selfCensoringInformationRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatNegativeFactLabel(fact: NegativeFactPredicate): string {
  const predicate = fact.predicate.trim()
  const scope = fact.scope?.trim()
  return scope ? `${predicate} (${scope})` : predicate
}

function formatConfidence(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function toRecordView(record: SelfCensoringInformationRecord): SelfCensoringInformationMirrorRecordView {
  const projection = projectAntimemeticCaseView(record)
  const loop = record.rediscoveryLoop

  const summaryLabel =
    projection.summary ??
    (projection.redacted && record.summary ? '[Redacted]' : '—')

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    propagationResistanceLabels: Object.freeze(
      (record.propagationResistance ?? []).map((tag) => formatSelfCensoringEnumLabel(tag))
    ),
    negativeFactLabels: Object.freeze(
      (record.negativeFacts ?? []).map((fact) => formatNegativeFactLabel(fact))
    ),
    parentCaseRefLabel: record.parentCaseRef?.trim() || '—',
    retentionDecayTimerLabel:
      record.retentionDecayTimer !== undefined ? String(record.retentionDecayTimer) : '—',
    rediscoveryLoopCountLabel: loop !== undefined ? String(loop.loopCount) : '—',
    lastAlarmWeekLabel:
      loop?.lastAlarmWeek !== undefined ? `W${loop.lastAlarmWeek}` : '—',
    forgottenWarningRefCount: loop?.forgottenWarningRefs?.length ?? 0,
    informationFailureModeLabel: record.informationFailureMode
      ? formatSelfCensoringEnumLabel(record.informationFailureMode)
      : null,
    usableArchiveStateLabel: record.usableArchiveState
      ? formatSelfCensoringEnumLabel(record.usableArchiveState)
      : null,
    absenceSignalCount: record.absenceSignals?.length ?? 0,
    contradictionSignalLabels: Object.freeze([...projection.contradictionSignals]),
    confidenceLabel: formatConfidence(projection.confidence ?? undefined),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `selfCensoringInformationRecords`; does not re-validate hidden truth. */
export function getSelfCensoringInformationMirrorView(
  game: GameState
): SelfCensoringInformationMirrorView {
  const records = listPersistedRecords(game)

  const retentionTimerActiveCount = records.filter(
    (record) => record.retentionDecayTimer !== undefined && record.retentionDecayTimer > 0
  ).length
  const rediscoveryLoopActiveCount = records.filter(
    (record) => (record.rediscoveryLoop?.loopCount ?? 0) > 0
  ).length

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      retentionTimerActiveCount,
      rediscoveryLoopActiveCount,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(record))),
  })
}
