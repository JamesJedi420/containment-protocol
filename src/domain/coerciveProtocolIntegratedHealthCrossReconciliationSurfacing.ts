/**
 * SPE-1908 / SPE-2429 slice 2 + SPE-2439 slice 4 + SPE-2440 slice 5: read-only surfacing
 * for coercive protocol ↔ integrated health bundle cross-reconciliation compose output.
 *
 * Formats compose summaries for mirror labels and weekly report notes — no changes to
 * SPE-2428 / SPE-2430 compose contracts.
 */

import type {
  CoerciveProtocolRecord,
  CoerciveProtocolRecordsMap,
} from './coerciveContainedPersonProtocolRegistry'
import {
  composeAllCoerciveProtocolIntegratedHealthReconciliations,
  type CoerciveProtocolCrossSystemTensionFlag,
  type CoerciveProtocolIntegratedHealthReconciliationSummary,
} from './coerciveProtocolIntegratedHealthCrossReconciliation'
import type {
  ContainedPersonIntegratedHealthBundle,
  ContainedPersonIntegratedHealthBundleRecordsMap,
} from './containedPersonIntegratedHealthBundleRegistry'
import type {
  PsychologicalResilienceRecord,
  PsychologicalResilienceRecordsMap,
} from './psychologicalResilienceRegistry'
import type {
  SurveillanceInterventionTuningRecord,
  SurveillanceInterventionTuningRecordsMap,
} from './surveillanceCapacityInterventionTuningRegistry'

const SURVEILLANCE_TUNING_CROSS_SYSTEM_TENSION_FLAGS: ReadonlySet<CoerciveProtocolCrossSystemTensionFlag> =
  new Set([
    'surveillance_tuning_monitoring_exceeds_contact',
    'surveillance_tuning_sustained_under_collateral_strain',
  ])

const PSYCHOLOGICAL_RESILIENCE_CROSS_SYSTEM_TENSION_FLAGS: ReadonlySet<CoerciveProtocolCrossSystemTensionFlag> =
  new Set([
    'psychological_resilience_duty_reliability_degraded',
    'psychological_resilience_exposure_elevated',
    'psychological_resilience_treatment_gated',
  ])

export function formatCoerciveProtocolCrossLinkLabel(record: CoerciveProtocolRecord): string {
  return `${record.id} (${record.label})`
}

export function formatIntegratedHealthBundleCrossLinkLabel(
  bundle: ContainedPersonIntegratedHealthBundle
): string {
  return `${bundle.id} (${bundle.label})`
}

export function formatSurveillanceTuningCrossLinkLabel(
  record: SurveillanceInterventionTuningRecord
): string {
  return `${record.id} (${record.label})`
}

export function formatPsychologicalResilienceCrossLinkLabel(
  record: PsychologicalResilienceRecord
): string {
  return `${record.id} (${record.label})`
}

export function formatCrossSystemTensionFlagLabel(flag: CoerciveProtocolCrossSystemTensionFlag): string {
  return flag
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function protocolById(
  protocols: CoerciveProtocolRecordsMap | undefined,
  protocolId: string
): CoerciveProtocolRecord | undefined {
  return protocols?.[protocolId]
}

function bundleBySubjectRef(
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined,
  subjectRef: string
): ContainedPersonIntegratedHealthBundle | undefined {
  return bundles?.[subjectRef]
}

function tuningById(
  records: SurveillanceInterventionTuningRecordsMap | undefined,
  tuningId: string
): SurveillanceInterventionTuningRecord | undefined {
  return records?.[tuningId]
}

function resilienceById(
  records: PsychologicalResilienceRecordsMap | undefined,
  resilienceId: string
): PsychologicalResilienceRecord | undefined {
  return records?.[resilienceId]
}

export function formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels(input: {
  summary: CoerciveProtocolIntegratedHealthReconciliationSummary
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined
  psychologicalResilienceRecords?: PsychologicalResilienceRecordsMap | undefined
}): {
  readonly protocolLabels: readonly string[]
  readonly bundleLabel: string | null
  readonly tuningLabels: readonly string[]
  readonly resilienceLabels: readonly string[]
  readonly tensionFlagLabels: readonly string[]
  readonly surveillanceTuningTensionFlagLabels: readonly string[]
  readonly psychologicalResilienceTensionFlagLabels: readonly string[]
} {
  const protocolIds = [
    ...new Set(input.summary.links.map((link) => link.coerciveProtocolId)),
  ].sort((left, right) => left.localeCompare(right))

  const protocolLabels = protocolIds
    .map((protocolId) => protocolById(input.protocols, protocolId))
    .filter((record): record is CoerciveProtocolRecord => record !== undefined)
    .map((record) => formatCoerciveProtocolCrossLinkLabel(record))

  const bundle = bundleBySubjectRef(input.bundles, input.summary.subjectRef)
  const bundleLabel = bundle ? formatIntegratedHealthBundleCrossLinkLabel(bundle) : null

  const tuningIds = [
    ...new Set(input.summary.surveillanceTuningLinks.map((link) => link.surveillanceTuningId)),
  ].sort((left, right) => left.localeCompare(right))

  const tuningLabels = tuningIds
    .map((tuningId) => tuningById(input.surveillanceTuningRecords, tuningId))
    .filter((record): record is SurveillanceInterventionTuningRecord => record !== undefined)
    .map((record) => formatSurveillanceTuningCrossLinkLabel(record))

  const resilienceIds = [
    ...new Set(
      input.summary.psychologicalResilienceLinks.map((link) => link.psychologicalResilienceId)
    ),
  ].sort((left, right) => left.localeCompare(right))

  const resilienceLabels = resilienceIds
    .map((resilienceId) => resilienceById(input.psychologicalResilienceRecords, resilienceId))
    .filter((record): record is PsychologicalResilienceRecord => record !== undefined)
    .map((record) => formatPsychologicalResilienceCrossLinkLabel(record))

  const tensionFlagLabels = Object.freeze(
    input.summary.crossSystemTensionFlags.map((flag) => formatCrossSystemTensionFlagLabel(flag))
  )

  const surveillanceTuningTensionFlagLabels = Object.freeze(
    input.summary.crossSystemTensionFlags
      .filter((flag) => SURVEILLANCE_TUNING_CROSS_SYSTEM_TENSION_FLAGS.has(flag))
      .map((flag) => formatCrossSystemTensionFlagLabel(flag))
  )

  const psychologicalResilienceTensionFlagLabels = Object.freeze(
    input.summary.crossSystemTensionFlags
      .filter((flag) => PSYCHOLOGICAL_RESILIENCE_CROSS_SYSTEM_TENSION_FLAGS.has(flag))
      .map((flag) => formatCrossSystemTensionFlagLabel(flag))
  )

  return {
    protocolLabels: Object.freeze(protocolLabels),
    bundleLabel,
    tuningLabels: Object.freeze(tuningLabels),
    resilienceLabels: Object.freeze(resilienceLabels),
    tensionFlagLabels,
    surveillanceTuningTensionFlagLabels,
    psychologicalResilienceTensionFlagLabels,
  }
}

export function formatCoerciveProtocolIntegratedHealthReconciliationNoteContent(input: {
  summary: CoerciveProtocolIntegratedHealthReconciliationSummary
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined
  psychologicalResilienceRecords?: PsychologicalResilienceRecordsMap | undefined
}): string {
  const { protocolLabels, bundleLabel, tuningLabels, resilienceLabels, tensionFlagLabels } =
    formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels(input)
  const protocolSegment =
    protocolLabels.length > 0 ? protocolLabels.join('; ') : 'no linked coercive protocols'
  const bundleSegment = bundleLabel ?? 'no linked integrated health bundle'
  const tuningSegment =
    tuningLabels.length > 0 ? tuningLabels.join('; ') : 'no linked surveillance tuning records'
  const resilienceSegment =
    resilienceLabels.length > 0
      ? resilienceLabels.join('; ')
      : 'no linked psychological resilience records'
  const tensionSegment =
    tensionFlagLabels.length > 0 ? tensionFlagLabels.join('; ') : 'no cross-system tension flags'

  return `Coercive protocol cross-link — ${input.summary.subjectRef}: ${input.summary.linkedProtocolCount} protocol(s), ${input.summary.linkedBundleCount} bundle(s), ${input.summary.linkedTuningCount} tuning record(s), ${input.summary.linkedResilienceCount} resilience record(s). Tension flags: ${tensionSegment}. Protocols: ${protocolSegment}. Bundle: ${bundleSegment}. Tuning: ${tuningSegment}. Resilience: ${resilienceSegment}.`
}

export function composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries(input: {
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined
  psychologicalResilienceRecords?: PsychologicalResilienceRecordsMap | undefined
}): readonly CoerciveProtocolIntegratedHealthReconciliationSummary[] {
  if (!input.protocols || !input.bundles) {
    return []
  }

  if (Object.keys(input.protocols).length === 0 || Object.keys(input.bundles).length === 0) {
    return []
  }

  return composeAllCoerciveProtocolIntegratedHealthReconciliations(
    input.protocols,
    input.bundles,
    input.surveillanceTuningRecords,
    input.psychologicalResilienceRecords
  )
}

export function resolveCoerciveProtocolIntegratedHealthReconciliationForSubject(input: {
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined
  psychologicalResilienceRecords?: PsychologicalResilienceRecordsMap | undefined
  subjectRef: string
}): CoerciveProtocolIntegratedHealthReconciliationSummary | null {
  const summaries = composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
    protocols: input.protocols,
    bundles: input.bundles,
    surveillanceTuningRecords: input.surveillanceTuningRecords,
    psychologicalResilienceRecords: input.psychologicalResilienceRecords,
  })

  return summaries.find((summary) => summary.subjectRef === input.subjectRef) ?? null
}
