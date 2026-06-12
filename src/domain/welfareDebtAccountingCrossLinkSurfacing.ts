/**
 * SPE-1888 slice 8: read-only surfacing for welfare-debt ↔ sibling-registry cross-links.
 *
 * Formats compose output for weekly report notes — safe opaque wired refs only;
 * no changes to slice 7 compose contracts.
 */

import type { CoerciveProtocolRecordsMap } from './coerciveContainedPersonProtocolRegistry'
import type { ContainedPersonIntegratedHealthBundleRecordsMap } from './containedPersonIntegratedHealthBundleRegistry'
import {
  composeAllWelfareDebtAccountingCrossLinks,
  formatWelfareDebtAccountingCrossLinkAuditLine,
  formatWelfareDebtAccountingCrossLinkLabels,
  type WelfareDebtAccountingCrossLinkSummary,
} from './welfareDebtAccountingCrossLinks'
import type { WelfareDebtAccountingRecordsMap } from './welfareDebtAccountingRegistry'

export function composeAllWelfareDebtAccountingCrossLinkSummaries(input: {
  records: WelfareDebtAccountingRecordsMap | null | undefined
  bundles?: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
  coerciveProtocolRecords?: CoerciveProtocolRecordsMap | null | undefined
}): readonly WelfareDebtAccountingCrossLinkSummary[] {
  const safeRecords = input.records ?? {}
  const safeBundles = input.bundles ?? {}
  const safeProtocols = input.coerciveProtocolRecords ?? {}

  if (Object.keys(safeRecords).length === 0) {
    return []
  }

  if (Object.keys(safeBundles).length === 0 && Object.keys(safeProtocols).length === 0) {
    return []
  }

  const summaries = composeAllWelfareDebtAccountingCrossLinks({
    records: safeRecords,
    bundles: input.bundles,
    coerciveProtocolRecords: input.coerciveProtocolRecords,
  })

  return Object.freeze(
    summaries.filter((summary) => formatWelfareDebtAccountingCrossLinkLabels(summary).length > 0)
  )
}

export function formatWelfareDebtAccountingCrossLinkNoteContent(
  summary: WelfareDebtAccountingCrossLinkSummary
): string {
  return formatWelfareDebtAccountingCrossLinkAuditLine(summary).replace(
    /^Cross-links/,
    'Welfare-debt cross-link'
  )
}
