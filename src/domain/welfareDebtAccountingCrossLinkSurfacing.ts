/**
 * SPE-1888 slice 8: read-only surfacing for welfare-debt ↔ sibling-registry cross-links.
 *
 * Formats compose output for weekly report notes — safe opaque wired refs only;
 * no changes to slice 7 compose contracts.
 */

import type { CoerciveProtocolRecordsMap } from './coerciveContainedPersonProtocolRegistry'
import type { ContainedPersonIntegratedHealthBundleRecordsMap } from './containedPersonIntegratedHealthBundleRegistry'
import type { FactionEthicsMatrixRecordsMap } from './factionEthicsMatrixRegistry'
import type { MoralLegalAccountabilityMatrixRecordsMap } from './moralLegalAccountabilityMatrixRegistry'
import {
  composeAllWelfareDebtAccountingCrossLinks,
  formatWelfareDebtAccountingCrossLinkAuditLine,
  formatWelfareDebtAccountabilityMatrixProjectionLabels,
  formatWelfareDebtAccountingCrossLinkLabels,
  formatWelfareDebtFactionEthicsProjectionLabels,
  type WelfareDebtAccountingCrossLinkSummary,
} from './welfareDebtAccountingCrossLinks'
import type { WelfareDebtAccountingRecordsMap } from './welfareDebtAccountingRegistry'

export function composeAllWelfareDebtAccountingCrossLinkSummaries(input: {
  records: WelfareDebtAccountingRecordsMap | null | undefined
  bundles?: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
  coerciveProtocolRecords?: CoerciveProtocolRecordsMap | null | undefined
  factionEthicsRecords?: FactionEthicsMatrixRecordsMap | null | undefined
  accountabilityMatrixRecords?: MoralLegalAccountabilityMatrixRecordsMap | null | undefined
}): readonly WelfareDebtAccountingCrossLinkSummary[] {
  const safeRecords = input.records ?? {}
  const safeBundles = input.bundles ?? {}
  const safeProtocols = input.coerciveProtocolRecords ?? {}
  const safeFactionEthics = input.factionEthicsRecords ?? {}
  const safeAccountabilityMatrix = input.accountabilityMatrixRecords ?? {}

  if (Object.keys(safeRecords).length === 0) {
    return []
  }

  if (
    Object.keys(safeBundles).length === 0 &&
    Object.keys(safeProtocols).length === 0 &&
    Object.keys(safeFactionEthics).length === 0 &&
    Object.keys(safeAccountabilityMatrix).length === 0
  ) {
    return []
  }

  const summaries = composeAllWelfareDebtAccountingCrossLinks({
    records: safeRecords,
    bundles: input.bundles,
    coerciveProtocolRecords: input.coerciveProtocolRecords,
    factionEthicsRecords: input.factionEthicsRecords,
    accountabilityMatrixRecords: input.accountabilityMatrixRecords,
  })

  return Object.freeze(
    summaries.filter((summary) => formatWelfareDebtAccountingCrossLinkLabels(summary).length > 0)
  )
}

export function formatWelfareDebtAccountingCrossLinkProjectionLabels(
  summary: WelfareDebtAccountingCrossLinkSummary,
  input?: {
    factionEthicsRecords?: FactionEthicsMatrixRecordsMap | null | undefined
    accountabilityMatrixRecords?: MoralLegalAccountabilityMatrixRecordsMap | null | undefined
  }
): readonly string[] {
  const factionEthicsLabels = formatWelfareDebtFactionEthicsProjectionLabels(
    summary,
    input?.factionEthicsRecords
  )
  const accountabilityMatrixLabels = formatWelfareDebtAccountabilityMatrixProjectionLabels(
    summary,
    input?.accountabilityMatrixRecords
  )
  return Object.freeze([...factionEthicsLabels, ...accountabilityMatrixLabels])
}

export function formatWelfareDebtAccountingCrossLinkNoteContent(
  summary: WelfareDebtAccountingCrossLinkSummary,
  input?: {
    factionEthicsRecords?: FactionEthicsMatrixRecordsMap | null | undefined
    accountabilityMatrixRecords?: MoralLegalAccountabilityMatrixRecordsMap | null | undefined
  }
): string {
  const baseContent = formatWelfareDebtAccountingCrossLinkAuditLine(summary).replace(
    /^Cross-links/,
    'Welfare-debt cross-link'
  )
  const projectionLabels = formatWelfareDebtAccountingCrossLinkProjectionLabels(summary, input)
  if (projectionLabels.length === 0) {
    return baseContent
  }
  return `${baseContent} | Matrix projections: ${projectionLabels.join('; ')}`
}
