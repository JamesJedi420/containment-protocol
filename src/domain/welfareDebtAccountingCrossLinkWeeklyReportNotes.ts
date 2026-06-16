/**
 * SPE-1888 slice 8: weekly report notes for welfare-debt ↔ sibling-registry cross-links.
 *
 * Emits deterministic notes when linked maps coexist — no new persistence.
 */

import type { CoerciveProtocolRecordsMap } from './coerciveContainedPersonProtocolRegistry'
import type { ContainedPersonIntegratedHealthBundleRecordsMap } from './containedPersonIntegratedHealthBundleRegistry'
import type { FactionEthicsMatrixRecordsMap } from './factionEthicsMatrixRegistry'
import type { MoralLegalAccountabilityMatrixRecordsMap } from './moralLegalAccountabilityMatrixRegistry'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'
import {
  composeAllWelfareDebtAccountingCrossLinkSummaries,
  formatWelfareDebtAccountingCrossLinkProjectionLabels,
  formatWelfareDebtAccountingCrossLinkNoteContent,
} from './welfareDebtAccountingCrossLinkSurfacing'
import type { WelfareDebtAccountingRecordsMap } from './welfareDebtAccountingRegistry'
import { formatWelfareDebtAccountingCrossLinkLabels } from './welfareDebtAccountingCrossLinks'

/**
 * Builds weekly report notes when welfare-debt records coexist with integrated-health
 * bundles, coercive protocol records, and/or persisted matrix maps with hydrated cross-links.
 */
export function buildWeeklyWelfareDebtAccountingCrossLinkReportNotes(input: {
  nextRecords: WelfareDebtAccountingRecordsMap | null | undefined
  nextBundles: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
  nextCoerciveProtocolRecords: CoerciveProtocolRecordsMap | null | undefined
  factionEthicsRecords?: FactionEthicsMatrixRecordsMap | null | undefined
  accountabilityMatrixRecords?: MoralLegalAccountabilityMatrixRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllWelfareDebtAccountingCrossLinkSummaries({
    records: input.nextRecords,
    bundles: input.nextBundles,
    coerciveProtocolRecords: input.nextCoerciveProtocolRecords,
    factionEthicsRecords: input.factionEthicsRecords,
    accountabilityMatrixRecords: input.accountabilityMatrixRecords,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatWelfareDebtAccountingCrossLinkNoteContent(summary, {
          factionEthicsRecords: input.factionEthicsRecords,
          accountabilityMatrixRecords: input.accountabilityMatrixRecords,
        }),
        input.week,
        sequence,
        input.baseTimestamp,
        'welfare_debt.accounting_cross_link',
        {
          debtRef: summary.debtRef,
          subjectRef: summary.subjectRef,
          integratedHealthLinkCount: summary.integratedHealthLinks.length,
          coerciveProtocolLinkCount: summary.coerciveProtocolLinks.length,
          crossLinkLabels: [...formatWelfareDebtAccountingCrossLinkLabels(summary)],
          projectionLabels: [
            ...formatWelfareDebtAccountingCrossLinkProjectionLabels(summary, {
              factionEthicsRecords: input.factionEthicsRecords,
              accountabilityMatrixRecords: input.accountabilityMatrixRecords,
            }),
          ],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
