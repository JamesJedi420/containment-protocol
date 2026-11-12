/**
 * SPE-854 slice 1: read-only surfacing for intake ↔ unexplained location cross-links.
 *
 * Formats compose output for mission triage chips and weekly report notes — CP-neutral
 * labels only; no changes to SPE-2356 compose contracts.
 */

import {
  composeAllIntakeUnexplainedLocationCrossLinks,
  composeIntakeUnexplainedLocationCrossLinks,
  type IntakeUnexplainedLocationCrossLinkSummary,
} from './informationIntakeUnexplainedLocationCrossLink'
import type { InformationIntakeReportRecord, InformationIntakeReportsMap } from './informationIntakeReport'
import { formatIntakeReportCrossLinkLabel } from './informationIntakeNamingHazardCrossLinkSurfacing'
import { resolveMissionIntakeTopicKeys } from './missionIntakeInformationRouting'
import type { CaseInstance } from './models'
import type {
  UnexplainedLocationRecord,
  UnexplainedLocationRecordsMap,
} from './unexplainedLocationRegistry'

export { formatIntakeReportCrossLinkLabel }

export function formatUnexplainedLocationCrossLinkLabel(location: UnexplainedLocationRecord): string {
  return `${location.id} (${location.label})`
}

function locationById(
  locations: UnexplainedLocationRecordsMap | undefined,
  locationId: string
): UnexplainedLocationRecord | undefined {
  return locations?.[locationId]
}

function reportById(
  reports: InformationIntakeReportsMap | undefined,
  reportId: string
): InformationIntakeReportRecord | undefined {
  return reports?.[reportId]
}

export function formatIntakeUnexplainedLocationCrossLinkSummaryLabels(input: {
  summary: IntakeUnexplainedLocationCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  locations: UnexplainedLocationRecordsMap | undefined
}): { readonly reportLabels: readonly string[]; readonly locationLabels: readonly string[] } {
  const reportIds = [...new Set(input.summary.links.map((link) => link.intakeReportId))].sort((left, right) =>
    left.localeCompare(right)
  )
  const locationIds = [...new Set(input.summary.links.map((link) => link.unexplainedLocationId))].sort(
    (left, right) => left.localeCompare(right)
  )

  const reportLabels = reportIds
    .map((reportId) => reportById(input.reports, reportId))
    .filter((report): report is InformationIntakeReportRecord => report !== undefined)
    .map((report) => formatIntakeReportCrossLinkLabel(report))

  const locationLabels = locationIds
    .map((locationId) => locationById(input.locations, locationId))
    .filter((location): location is UnexplainedLocationRecord => location !== undefined)
    .map((location) => formatUnexplainedLocationCrossLinkLabel(location))

  return {
    reportLabels: Object.freeze(reportLabels),
    locationLabels: Object.freeze(locationLabels),
  }
}

export function formatIntakeUnexplainedLocationCrossLinkNoteContent(input: {
  summary: IntakeUnexplainedLocationCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  locations: UnexplainedLocationRecordsMap | undefined
}): string {
  const { reportLabels, locationLabels } = formatIntakeUnexplainedLocationCrossLinkSummaryLabels(input)
  const reportSegment =
    reportLabels.length > 0 ? reportLabels.join('; ') : 'no linked intake reports'
  const locationSegment =
    locationLabels.length > 0 ? locationLabels.join('; ') : 'no linked unexplained locations'

  return `Intake cross-link — ${input.summary.topicRef}: ${input.summary.linkedReportCount} report(s), ${input.summary.linkedLocationCount} location(s). Reports: ${reportSegment}. Locations: ${locationSegment}.`
}

export function summarizeIntakeUnexplainedLocationCrossLinkFingerprint(
  summaries: readonly IntakeUnexplainedLocationCrossLinkSummary[]
): string {
  return summaries
    .map((summary) => summary.structuredReasons.join('|'))
    .sort((left, right) => left.localeCompare(right))
    .join(';;')
}

export function listMissionIntakeUnexplainedLocationCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  locations: UnexplainedLocationRecordsMap | undefined
  currentCase: Pick<CaseInstance, 'id' | 'tags'>
}): readonly IntakeUnexplainedLocationCrossLinkSummary[] {
  if (!input.reports || !input.locations) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.locations).length === 0) {
    return []
  }

  const summaries: IntakeUnexplainedLocationCrossLinkSummary[] = []
  const seenTopicRefs = new Set<string>()

  for (const topicKey of resolveMissionIntakeTopicKeys(input.currentCase)) {
    const summary = composeIntakeUnexplainedLocationCrossLinks(input.reports, input.locations, topicKey)

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

export function composeAllIntakeUnexplainedLocationCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  locations: UnexplainedLocationRecordsMap | undefined
}): readonly IntakeUnexplainedLocationCrossLinkSummary[] {
  if (!input.reports || !input.locations) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.locations).length === 0) {
    return []
  }

  return composeAllIntakeUnexplainedLocationCrossLinks(input.reports, input.locations)
}
