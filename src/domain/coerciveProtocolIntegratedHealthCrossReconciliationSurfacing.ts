/**
 * SPE-1908 / SPE-2429 slice 2: read-only surfacing for coercive protocol ↔ integrated
 * health bundle cross-reconciliation compose output.
 *
 * Formats compose summaries for mirror labels and weekly report notes — no changes to
 * SPE-2428 compose contracts.
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

export function formatCoerciveProtocolCrossLinkLabel(record: CoerciveProtocolRecord): string {
  return `${record.id} (${record.label})`
}

export function formatIntegratedHealthBundleCrossLinkLabel(
  bundle: ContainedPersonIntegratedHealthBundle
): string {
  return `${bundle.id} (${bundle.label})`
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

export function formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels(input: {
  summary: CoerciveProtocolIntegratedHealthReconciliationSummary
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
}): {
  readonly protocolLabels: readonly string[]
  readonly bundleLabel: string | null
  readonly tensionFlagLabels: readonly string[]
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

  const tensionFlagLabels = Object.freeze(
    input.summary.crossSystemTensionFlags.map((flag) => formatCrossSystemTensionFlagLabel(flag))
  )

  return {
    protocolLabels: Object.freeze(protocolLabels),
    bundleLabel,
    tensionFlagLabels,
  }
}

export function formatCoerciveProtocolIntegratedHealthReconciliationNoteContent(input: {
  summary: CoerciveProtocolIntegratedHealthReconciliationSummary
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
}): string {
  const { protocolLabels, bundleLabel, tensionFlagLabels } =
    formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels(input)
  const protocolSegment =
    protocolLabels.length > 0 ? protocolLabels.join('; ') : 'no linked coercive protocols'
  const bundleSegment = bundleLabel ?? 'no linked integrated health bundle'
  const tensionSegment =
    tensionFlagLabels.length > 0 ? tensionFlagLabels.join('; ') : 'no cross-system tension flags'

  return `Coercive protocol cross-link — ${input.summary.subjectRef}: ${input.summary.linkedProtocolCount} protocol(s), ${input.summary.linkedBundleCount} bundle(s). Tension flags: ${tensionSegment}. Protocols: ${protocolSegment}. Bundle: ${bundleSegment}.`
}

export function composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries(input: {
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
}): readonly CoerciveProtocolIntegratedHealthReconciliationSummary[] {
  if (!input.protocols || !input.bundles) {
    return []
  }

  if (Object.keys(input.protocols).length === 0 || Object.keys(input.bundles).length === 0) {
    return []
  }

  return composeAllCoerciveProtocolIntegratedHealthReconciliations(input.protocols, input.bundles)
}

export function resolveCoerciveProtocolIntegratedHealthReconciliationForSubject(input: {
  protocols: CoerciveProtocolRecordsMap | undefined
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined
  subjectRef: string
}): CoerciveProtocolIntegratedHealthReconciliationSummary | null {
  const summaries = composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
    protocols: input.protocols,
    bundles: input.bundles,
  })

  return summaries.find((summary) => summary.subjectRef === input.subjectRef) ?? null
}
