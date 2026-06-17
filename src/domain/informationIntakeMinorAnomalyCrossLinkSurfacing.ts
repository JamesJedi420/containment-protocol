/**
 * SPE-854 slice 1: read-only surfacing for intake ↔ minor anomaly item cross-links.
 *
 * Formats compose output for mission triage chips and weekly report notes — CP-neutral
 * labels only; no changes to SPE-2355 compose contracts.
 */

import {
  composeAllIntakeMinorAnomalyCrossLinks,
  composeIntakeMinorAnomalyCrossLinks,
  type IntakeMinorAnomalyCrossLinkSummary,
} from './informationIntakeMinorAnomalyCrossLink'
import type { InformationIntakeReportRecord, InformationIntakeReportsMap } from './informationIntakeReport'
import { formatIntakeReportCrossLinkLabel } from './informationIntakeNamingHazardCrossLinkSurfacing'
import { resolveMissionIntakeTopicKeys } from './missionIntakeInformationRouting'
import type { MinorAnomalyRecord, MinorAnomalyItemRecordsMap } from './minorAnomalyItemRegistry'
import type { CaseInstance } from './models'

export { formatIntakeReportCrossLinkLabel }

export function formatMinorAnomalyItemCrossLinkLabel(item: MinorAnomalyRecord): string {
  return `${item.id} (${item.label})`
}

function itemById(
  items: MinorAnomalyItemRecordsMap | undefined,
  itemId: string
): MinorAnomalyRecord | undefined {
  return items?.[itemId]
}

function reportById(
  reports: InformationIntakeReportsMap | undefined,
  reportId: string
): InformationIntakeReportRecord | undefined {
  return reports?.[reportId]
}

export function formatIntakeMinorAnomalyCrossLinkSummaryLabels(input: {
  summary: IntakeMinorAnomalyCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  items: MinorAnomalyItemRecordsMap | undefined
}): { readonly reportLabels: readonly string[]; readonly itemLabels: readonly string[] } {
  const reportIds = [...new Set(input.summary.links.map((link) => link.intakeReportId))].sort((left, right) =>
    left.localeCompare(right)
  )
  const itemIds = [...new Set(input.summary.links.map((link) => link.minorAnomalyItemId))].sort((left, right) =>
    left.localeCompare(right)
  )

  const reportLabels = reportIds
    .map((reportId) => reportById(input.reports, reportId))
    .filter((report): report is InformationIntakeReportRecord => report !== undefined)
    .map((report) => formatIntakeReportCrossLinkLabel(report))

  const itemLabels = itemIds
    .map((itemId) => itemById(input.items, itemId))
    .filter((item): item is MinorAnomalyRecord => item !== undefined)
    .map((item) => formatMinorAnomalyItemCrossLinkLabel(item))

  return {
    reportLabels: Object.freeze(reportLabels),
    itemLabels: Object.freeze(itemLabels),
  }
}

export function formatIntakeMinorAnomalyCrossLinkNoteContent(input: {
  summary: IntakeMinorAnomalyCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  items: MinorAnomalyItemRecordsMap | undefined
}): string {
  const { reportLabels, itemLabels } = formatIntakeMinorAnomalyCrossLinkSummaryLabels(input)
  const reportSegment =
    reportLabels.length > 0 ? reportLabels.join('; ') : 'no linked intake reports'
  const itemSegment =
    itemLabels.length > 0 ? itemLabels.join('; ') : 'no linked minor anomaly items'

  return `Intake cross-link — ${input.summary.topicRef}: ${input.summary.linkedReportCount} report(s), ${input.summary.linkedItemCount} item(s). Reports: ${reportSegment}. Items: ${itemSegment}.`
}

export function summarizeIntakeMinorAnomalyCrossLinkFingerprint(
  summaries: readonly IntakeMinorAnomalyCrossLinkSummary[]
): string {
  return summaries
    .map((summary) => summary.structuredReasons.join('|'))
    .sort((left, right) => left.localeCompare(right))
    .join(';;')
}

export function listMissionIntakeMinorAnomalyCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  items: MinorAnomalyItemRecordsMap | undefined
  currentCase: Pick<CaseInstance, 'id' | 'tags'>
}): readonly IntakeMinorAnomalyCrossLinkSummary[] {
  if (!input.reports || !input.items) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.items).length === 0) {
    return []
  }

  const summaries: IntakeMinorAnomalyCrossLinkSummary[] = []
  const seenTopicRefs = new Set<string>()

  for (const topicKey of resolveMissionIntakeTopicKeys(input.currentCase)) {
    const summary = composeIntakeMinorAnomalyCrossLinks(input.reports, input.items, topicKey)

    if (summary.links.length === 0 || seenTopicRefs.has(summary.topicRef)) {
      continue
    }

    seenTopicRefs.add(summary.topicRef)
    summaries.push(summary)
  }

  return Object.freeze(
    summaries.sort((left, right) => left.topicRef.localeCompare(right.topicRef))
  )
}

export function composeAllIntakeMinorAnomalyCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  items: MinorAnomalyItemRecordsMap | undefined
}): readonly IntakeMinorAnomalyCrossLinkSummary[] {
  if (!input.reports || !input.items) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.items).length === 0) {
    return []
  }

  return composeAllIntakeMinorAnomalyCrossLinks(input.reports, input.items)
}
