/**
 * SPE-854 slice 1: read-only surfacing for intake ↔ extranormal event cross-links.
 *
 * Formats compose output for mission triage chips and weekly report notes — CP-neutral
 * labels only; no changes to SPE-2354 compose contracts.
 */

import type {
  ExtranormalEventRecord,
  ExtranormalEventRecordsMap,
} from './extranormalEventRegistry'
import {
  composeAllIntakeExtranormalCrossLinks,
  composeIntakeExtranormalCrossLinks,
  type IntakeExtranormalCrossLinkSummary,
} from './informationIntakeExtranormalCrossLink'
import type { InformationIntakeReportRecord, InformationIntakeReportsMap } from './informationIntakeReport'
import { formatIntakeReportCrossLinkLabel } from './informationIntakeNamingHazardCrossLinkSurfacing'
import { resolveMissionIntakeTopicKeys } from './missionIntakeInformationRouting'
import type { CaseInstance } from './models'

export { formatIntakeReportCrossLinkLabel }

export function formatExtranormalEventCrossLinkLabel(event: ExtranormalEventRecord): string {
  return `${event.id} (${event.label})`
}

function eventById(
  events: ExtranormalEventRecordsMap | undefined,
  eventId: string
): ExtranormalEventRecord | undefined {
  return events?.[eventId]
}

function reportById(
  reports: InformationIntakeReportsMap | undefined,
  reportId: string
): InformationIntakeReportRecord | undefined {
  return reports?.[reportId]
}

export function formatIntakeExtranormalCrossLinkSummaryLabels(input: {
  summary: IntakeExtranormalCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  events: ExtranormalEventRecordsMap | undefined
}): { readonly reportLabels: readonly string[]; readonly eventLabels: readonly string[] } {
  const reportIds = [...new Set(input.summary.links.map((link) => link.intakeReportId))].sort((left, right) =>
    left.localeCompare(right)
  )
  const eventIds = [...new Set(input.summary.links.map((link) => link.extranormalEventId))].sort((left, right) =>
    left.localeCompare(right)
  )

  const reportLabels = reportIds
    .map((reportId) => reportById(input.reports, reportId))
    .filter((report): report is InformationIntakeReportRecord => report !== undefined)
    .map((report) => formatIntakeReportCrossLinkLabel(report))

  const eventLabels = eventIds
    .map((eventId) => eventById(input.events, eventId))
    .filter((event): event is ExtranormalEventRecord => event !== undefined)
    .map((event) => formatExtranormalEventCrossLinkLabel(event))

  return {
    reportLabels: Object.freeze(reportLabels),
    eventLabels: Object.freeze(eventLabels),
  }
}

export function formatIntakeExtranormalCrossLinkNoteContent(input: {
  summary: IntakeExtranormalCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  events: ExtranormalEventRecordsMap | undefined
}): string {
  const { reportLabels, eventLabels } = formatIntakeExtranormalCrossLinkSummaryLabels(input)
  const reportSegment =
    reportLabels.length > 0 ? reportLabels.join('; ') : 'no linked intake reports'
  const eventSegment =
    eventLabels.length > 0 ? eventLabels.join('; ') : 'no linked extranormal events'

  return `Intake cross-link — ${input.summary.topicRef}: ${input.summary.linkedReportCount} report(s), ${input.summary.linkedEventCount} event(s). Reports: ${reportSegment}. Events: ${eventSegment}.`
}

export function summarizeIntakeExtranormalCrossLinkFingerprint(
  summaries: readonly IntakeExtranormalCrossLinkSummary[]
): string {
  return summaries
    .map((summary) => summary.structuredReasons.join('|'))
    .sort((left, right) => left.localeCompare(right))
    .join(';;')
}

export function listMissionIntakeExtranormalCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  events: ExtranormalEventRecordsMap | undefined
  currentCase: Pick<CaseInstance, 'id' | 'tags'>
}): readonly IntakeExtranormalCrossLinkSummary[] {
  if (!input.reports || !input.events) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.events).length === 0) {
    return []
  }

  const summaries: IntakeExtranormalCrossLinkSummary[] = []
  const seenTopicRefs = new Set<string>()

  for (const topicKey of resolveMissionIntakeTopicKeys(input.currentCase)) {
    const summary = composeIntakeExtranormalCrossLinks(input.reports, input.events, topicKey)

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

export function composeAllIntakeExtranormalCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  events: ExtranormalEventRecordsMap | undefined
}): readonly IntakeExtranormalCrossLinkSummary[] {
  if (!input.reports || !input.events) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.events).length === 0) {
    return []
  }

  return composeAllIntakeExtranormalCrossLinks(input.reports, input.events)
}
