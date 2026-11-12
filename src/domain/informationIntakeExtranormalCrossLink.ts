/**
 * SPE-854 / SPE-2354 slice 1: intake report ↔ extranormal event cross-link compose.
 *
 * Pure deterministic linkage between persisted information intake reports and
 * extranormal event registry records via shared topic refs — no new persistence
 * fields on intake reports; optional `intakeTopicRef` on extranormal events.
 */

import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
} from './informationIntakeReport'
import { summarizeMixedSourceIntake } from './informationIntakeReport'
import type {
  ExtranormalEventRecord,
  ExtranormalEventRecordsMap,
} from './extranormalEventRegistry'

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

export type IntakeExtranormalMatchKind = 'intake_topic_ref' | 'escalated_case_topic'

export interface IntakeExtranormalCrossLink {
  readonly intakeReportId: string
  readonly extranormalEventId: string
  readonly topicRef: string
  readonly matchKind: IntakeExtranormalMatchKind
}

export interface IntakeExtranormalCrossLinkSummary {
  readonly topicRef: string
  readonly links: readonly IntakeExtranormalCrossLink[]
  readonly linkedReportCount: number
  readonly linkedEventCount: number
  readonly intakeSummary: ReturnType<typeof summarizeMixedSourceIntake> | null
  readonly structuredReasons: readonly string[]
}

/** Expand a topic or case ref into normalized match keys (topic: prefix variants). */
export function resolveIntakeExtranormalTopicKeys(topicRef: string): readonly string[] {
  const normalized = normalizeToken(topicRef)
  if (!normalized) {
    return []
  }

  const keys = new Set<string>([normalized])
  const stripped = normalized.startsWith('topic:')
    ? normalized.slice('topic:'.length)
    : normalized

  if (stripped) {
    keys.add(stripped)
    keys.add(`topic:${stripped}`)
  }

  return [...keys].sort((left, right) => left.localeCompare(right))
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
  event: ExtranormalEventRecord
): IntakeExtranormalCrossLink | null {
  const reportTopicRef = normalizeToken(report.topicRef)
  if (!reportTopicRef) {
    return null
  }

  const intakeTopicRef = normalizeToken(event.intakeTopicRef ?? '')
  if (intakeTopicRef && topicKeysOverlap(reportTopicRef, intakeTopicRef)) {
    return {
      intakeReportId: report.id,
      extranormalEventId: event.id,
      topicRef: intakeTopicRef,
      matchKind: 'intake_topic_ref',
    }
  }

  const escalatedCaseRef = normalizeToken(event.escalatedCaseRef ?? '')
  if (escalatedCaseRef && topicKeysOverlap(reportTopicRef, escalatedCaseRef)) {
    return {
      intakeReportId: report.id,
      extranormalEventId: event.id,
      topicRef: reportTopicRef,
      matchKind: 'escalated_case_topic',
    }
  }

  return null
}

export function listIntakeReportsForExtranormalEvent(
  reports: InformationIntakeReportsMap | undefined,
  event: ExtranormalEventRecord
): InformationIntakeReportRecord[] {
  if (!reports) {
    return []
  }

  const linked: InformationIntakeReportRecord[] = []

  for (const report of Object.values(reports)) {
    if (resolveCrossLinkMatch(report, event)) {
      linked.push(report)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function listExtranormalEventsForIntakeTopic(
  events: ExtranormalEventRecordsMap | undefined,
  topicRef: string
): ExtranormalEventRecord[] {
  if (!events) {
    return []
  }

  const normalizedTopicRef = normalizeToken(topicRef)
  if (!normalizedTopicRef) {
    return []
  }

  const linked: ExtranormalEventRecord[] = []

  for (const event of Object.values(events)) {
    const intakeTopicRef = normalizeToken(event.intakeTopicRef ?? '')
    const escalatedCaseRef = normalizeToken(event.escalatedCaseRef ?? '')

    if (
      (intakeTopicRef && topicKeysOverlap(normalizedTopicRef, intakeTopicRef)) ||
      (escalatedCaseRef && topicKeysOverlap(normalizedTopicRef, escalatedCaseRef))
    ) {
      linked.push(event)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function composeIntakeExtranormalCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  events: ExtranormalEventRecordsMap | undefined,
  topicRef: string
): IntakeExtranormalCrossLinkSummary {
  const normalizedTopicRef = normalizeToken(topicRef)
  const reportList = normalizedTopicRef
    ? Object.values(reports ?? {}).filter(
        (report) => topicKeysOverlap(normalizedTopicRef, report.topicRef)
      )
    : []
  const eventList = listExtranormalEventsForIntakeTopic(events, normalizedTopicRef)

  reportList.sort((left, right) => left.id.localeCompare(right.id))

  const links: IntakeExtranormalCrossLink[] = []

  for (const report of reportList) {
    for (const event of eventList) {
      const match = resolveCrossLinkMatch(report, event)
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

    const byEvent = left.extranormalEventId.localeCompare(right.extranormalEventId)
    if (byEvent !== 0) {
      return byEvent
    }

    return left.intakeReportId.localeCompare(right.intakeReportId)
  })

  const linkedReportIds = new Set(links.map((link) => link.intakeReportId))
  const linkedEventIds = new Set(links.map((link) => link.extranormalEventId))
  const linkedReports = reportList.filter((report) => linkedReportIds.has(report.id))

  const structuredReasons = [
    `topic:${normalizedTopicRef || '(unknown)'}`,
    `link_count:${links.length}`,
    `linked_report_count:${linkedReportIds.size}`,
    `linked_event_count:${linkedEventIds.size}`,
    links.some((link) => link.matchKind === 'intake_topic_ref')
      ? 'match:intake_topic_ref'
      : 'match:none_intake_topic_ref',
    links.some((link) => link.matchKind === 'escalated_case_topic')
      ? 'match:escalated_case_topic'
      : 'match:none_escalated_case_topic',
  ].sort((left, right) => left.localeCompare(right))

  return {
    topicRef: normalizedTopicRef || '(unknown)',
    links,
    linkedReportCount: linkedReportIds.size,
    linkedEventCount: linkedEventIds.size,
    intakeSummary: linkedReports.length > 0 ? summarizeMixedSourceIntake(linkedReports) : null,
    structuredReasons,
  }
}

/** Compose cross-link summaries for every topic ref present in linked intake reports. */
export function composeAllIntakeExtranormalCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  events: ExtranormalEventRecordsMap | undefined
): readonly IntakeExtranormalCrossLinkSummary[] {
  const topicRefs = new Set<string>()

  for (const report of Object.values(reports ?? {})) {
    const topicRef = normalizeToken(report.topicRef)
    if (topicRef) {
      topicRefs.add(topicRef)
    }
  }

  return [...topicRefs]
    .sort((left, right) => left.localeCompare(right))
    .map((topicRef) => composeIntakeExtranormalCrossLinks(reports, events, topicRef))
    .filter((summary) => summary.links.length > 0)
}
