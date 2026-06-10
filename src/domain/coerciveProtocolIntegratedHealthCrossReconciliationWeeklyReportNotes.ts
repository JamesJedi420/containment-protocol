/**
 * SPE-1908 / SPE-2429 slice 2: weekly report notes for coercive protocol ↔ integrated
 * health bundle cross-reconciliation.
 *
 * Emits deterministic notes when linked maps coexist — no new persistence.
 */

import type { CoerciveProtocolRecordsMap } from './coerciveContainedPersonProtocolRegistry'
import type { ContainedPersonIntegratedHealthBundleRecordsMap } from './containedPersonIntegratedHealthBundleRegistry'
import {
  composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries,
  formatCoerciveProtocolIntegratedHealthReconciliationNoteContent,
} from './coerciveProtocolIntegratedHealthCrossReconciliationSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when coercive protocol records and integrated health bundles
 * co-exist with subject-ref links.
 */
export function buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes(input: {
  nextProtocols: CoerciveProtocolRecordsMap | null | undefined
  nextBundles: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
    protocols: input.nextProtocols ?? undefined,
    bundles: input.nextBundles ?? undefined,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatCoerciveProtocolIntegratedHealthReconciliationNoteContent({
          summary,
          protocols: input.nextProtocols ?? undefined,
          bundles: input.nextBundles ?? undefined,
        }),
        input.week,
        sequence,
        input.baseTimestamp,
        'coercive_protocol.integrated_health_reconciliation',
        {
          subjectRef: summary.subjectRef,
          linkedProtocolCount: summary.linkedProtocolCount,
          linkedBundleCount: summary.linkedBundleCount,
          crossSystemTensionFlags: [...summary.crossSystemTensionFlags],
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
