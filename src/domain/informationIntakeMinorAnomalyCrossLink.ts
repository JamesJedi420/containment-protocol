/**
 * SPE-854 / SPE-2355 slice 1: intake report ↔ minor anomaly item cross-link compose.
 *
 * Pure deterministic linkage between persisted information intake reports and
 * minor anomaly item registry records via shared topic refs — no new persistence
 * fields on intake reports; optional `intakeTopicRef` on minor items.
 */

import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
} from './informationIntakeReport'
import { summarizeMixedSourceIntake } from './informationIntakeReport'
import { resolveIntakeExtranormalTopicKeys } from './informationIntakeExtranormalCrossLink'
import type {
  MinorAnomalyRecord,
  MinorAnomalyItemRecordsMap,
} from './minorAnomalyItemRegistry'

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

export type IntakeMinorAnomalyMatchKind = 'intake_topic_ref'

export interface IntakeMinorAnomalyCrossLink {
  readonly intakeReportId: string
  readonly minorAnomalyItemId: string
  readonly topicRef: string
  readonly matchKind: IntakeMinorAnomalyMatchKind
}

export interface IntakeMinorAnomalyCrossLinkSummary {
  readonly topicRef: string
  readonly links: readonly IntakeMinorAnomalyCrossLink[]
  readonly linkedReportCount: number
  readonly linkedItemCount: number
  readonly intakeSummary: ReturnType<typeof summarizeMixedSourceIntake> | null
  readonly structuredReasons: readonly string[]
}

function topicKeysOverlap(leftRef: string, rightRef: string): boolean {
  const leftKeys = new Set(resolveIntakeExtranormalTopicKeys(leftRef))
  if (leftKeys.size === 0) {
    return false
  }

  for (const key of resolveIntakeExtranormalTopicKeys(rightRef)) {
    if (leftKeys.has(key)) {
      return true
    }
  }

  return false
}

function resolveCrossLinkMatch(
  report: InformationIntakeReportRecord,
  item: MinorAnomalyRecord
): IntakeMinorAnomalyCrossLink | null {
  const reportTopicRef = normalizeToken(report.topicRef)
  if (!reportTopicRef) {
    return null
  }

  const intakeTopicRef = normalizeToken(item.intakeTopicRef ?? '')
  if (intakeTopicRef && topicKeysOverlap(reportTopicRef, intakeTopicRef)) {
    return {
      intakeReportId: report.id,
      minorAnomalyItemId: item.id,
      topicRef: intakeTopicRef,
      matchKind: 'intake_topic_ref',
    }
  }

  return null
}

export function listIntakeReportsForMinorAnomalyItem(
  reports: InformationIntakeReportsMap | undefined,
  item: MinorAnomalyRecord
): InformationIntakeReportRecord[] {
  if (!reports) {
    return []
  }

  const linked: InformationIntakeReportRecord[] = []

  for (const report of Object.values(reports)) {
    if (resolveCrossLinkMatch(report, item)) {
      linked.push(report)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function listMinorAnomalyItemsForIntakeTopic(
  items: MinorAnomalyItemRecordsMap | undefined,
  topicRef: string
): MinorAnomalyRecord[] {
  if (!items) {
    return []
  }

  const normalizedTopicRef = normalizeToken(topicRef)
  if (!normalizedTopicRef) {
    return []
  }

  const linked: MinorAnomalyRecord[] = []

  for (const item of Object.values(items)) {
    const intakeTopicRef = normalizeToken(item.intakeTopicRef ?? '')

    if (intakeTopicRef && topicKeysOverlap(normalizedTopicRef, intakeTopicRef)) {
      linked.push(item)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function composeIntakeMinorAnomalyCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  items: MinorAnomalyItemRecordsMap | undefined,
  topicRef: string
): IntakeMinorAnomalyCrossLinkSummary {
  const normalizedTopicRef = normalizeToken(topicRef)
  const reportList = normalizedTopicRef
    ? Object.values(reports ?? {}).filter((report) =>
        topicKeysOverlap(normalizedTopicRef, report.topicRef)
      )
    : []
  const itemList = listMinorAnomalyItemsForIntakeTopic(items, normalizedTopicRef)

  reportList.sort((left, right) => left.id.localeCompare(right.id))

  const links: IntakeMinorAnomalyCrossLink[] = []

  for (const report of reportList) {
    for (const item of itemList) {
      const match = resolveCrossLinkMatch(report, item)
      if (match) {
        links.push(match)
      }
    }
  }

  links.sort((left, right) => {
    const byTopic = left.topicRef.localeCompare(right.topicRef)
    if (byTopic !== 0) {
      return byTopic
    }

    const byItem = left.minorAnomalyItemId.localeCompare(right.minorAnomalyItemId)
    if (byItem !== 0) {
      return byItem
    }

    return left.intakeReportId.localeCompare(right.intakeReportId)
  })

  const linkedReportIds = new Set(links.map((link) => link.intakeReportId))
  const linkedItemIds = new Set(links.map((link) => link.minorAnomalyItemId))
  const linkedReports = reportList.filter((report) => linkedReportIds.has(report.id))

  const structuredReasons = [
    `topic:${normalizedTopicRef || '(unknown)'}`,
    `link_count:${links.length}`,
    `linked_report_count:${linkedReportIds.size}`,
    `linked_item_count:${linkedItemIds.size}`,
    links.some((link) => link.matchKind === 'intake_topic_ref')
      ? 'match:intake_topic_ref'
      : 'match:none_intake_topic_ref',
  ].sort((left, right) => left.localeCompare(right))

  return {
    topicRef: normalizedTopicRef || '(unknown)',
    links,
    linkedReportCount: linkedReportIds.size,
    linkedItemCount: linkedItemIds.size,
    intakeSummary: linkedReports.length > 0 ? summarizeMixedSourceIntake(linkedReports) : null,
    structuredReasons,
  }
}

/** Compose cross-link summaries for every topic ref present in linked intake reports. */
export function composeAllIntakeMinorAnomalyCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  items: MinorAnomalyItemRecordsMap | undefined
): readonly IntakeMinorAnomalyCrossLinkSummary[] {
  const topicRefs = new Set<string>()

  for (const report of Object.values(reports ?? {})) {
    const topicRef = normalizeToken(report.topicRef)
    if (topicRef) {
      topicRefs.add(topicRef)
    }
  }

  return [...topicRefs]
    .sort((left, right) => left.localeCompare(right))
    .map((topicRef) => composeIntakeMinorAnomalyCrossLinks(reports, items, topicRef))
    .filter((summary) => summary.links.length > 0)
}
