/**
 * SPE-854 / SPE-2406 slice 1: read-only surfacing for intake ↔ naming-hazard cross-links.
 *
 * Formats compose output for mission triage chips and weekly report notes — safe labels
 * only; no changes to SPE-2358 compose contracts.
 */

import type { InformationIntakeReportRecord, InformationIntakeReportsMap } from './informationIntakeReport'
import {
  composeAllIntakeNamingHazardCrossLinks,
  composeIntakeNamingHazardCrossLinks,
  type IntakeNamingHazardCrossLinkSummary,
} from './informationIntakeNamingHazardCrossLink'
import { resolveMissionIntakeTopicKeys } from './missionIntakeInformationRouting'
import type { CaseInstance } from './models'
import {
  projectSafeLabel,
  type NamingHazardDescriptorRecord,
  type NamingHazardDescriptorRecordsMap,
} from './namingHazardDescriptorRegistry'

export function formatIntakeReportCrossLinkLabel(report: InformationIntakeReportRecord): string {
  return `${report.id} (${report.topicRef})`
}

export function formatNamingHazardDescriptorCrossLinkLabel(
  descriptor: NamingHazardDescriptorRecord
): string {
  const safeLabel = projectSafeLabel(descriptor, { surface: 'briefing' }).label
  return `${descriptor.id} (${safeLabel})`
}

function descriptorById(
  descriptors: NamingHazardDescriptorRecordsMap | undefined,
  descriptorId: string
): NamingHazardDescriptorRecord | undefined {
  return descriptors?.[descriptorId]
}

function reportById(
  reports: InformationIntakeReportsMap | undefined,
  reportId: string
): InformationIntakeReportRecord | undefined {
  return reports?.[reportId]
}

export function formatIntakeNamingHazardCrossLinkSummaryLabels(input: {
  summary: IntakeNamingHazardCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  descriptors: NamingHazardDescriptorRecordsMap | undefined
}): { readonly reportLabels: readonly string[]; readonly descriptorLabels: readonly string[] } {
  const reportIds = [...new Set(input.summary.links.map((link) => link.intakeReportId))].sort((left, right) =>
    left.localeCompare(right)
  )
  const descriptorIds = [
    ...new Set(input.summary.links.map((link) => link.namingHazardDescriptorId)),
  ].sort((left, right) => left.localeCompare(right))

  const reportLabels = reportIds
    .map((reportId) => reportById(input.reports, reportId))
    .filter((report): report is InformationIntakeReportRecord => report !== undefined)
    .map((report) => formatIntakeReportCrossLinkLabel(report))

  const descriptorLabels = descriptorIds
    .map((descriptorId) => descriptorById(input.descriptors, descriptorId))
    .filter((descriptor): descriptor is NamingHazardDescriptorRecord => descriptor !== undefined)
    .map((descriptor) => formatNamingHazardDescriptorCrossLinkLabel(descriptor))

  return {
    reportLabels: Object.freeze(reportLabels),
    descriptorLabels: Object.freeze(descriptorLabels),
  }
}

export function formatIntakeNamingHazardCrossLinkNoteContent(input: {
  summary: IntakeNamingHazardCrossLinkSummary
  reports: InformationIntakeReportsMap | undefined
  descriptors: NamingHazardDescriptorRecordsMap | undefined
}): string {
  const { reportLabels, descriptorLabels } = formatIntakeNamingHazardCrossLinkSummaryLabels(input)
  const reportSegment =
    reportLabels.length > 0 ? reportLabels.join('; ') : 'no linked intake reports'
  const descriptorSegment =
    descriptorLabels.length > 0 ? descriptorLabels.join('; ') : 'no linked naming-hazard descriptors'

  return `Intake cross-link — ${input.summary.topicRef}: ${input.summary.linkedReportCount} report(s), ${input.summary.linkedDescriptorCount} descriptor(s). Reports: ${reportSegment}. Descriptors: ${descriptorSegment}.`
}

export function summarizeIntakeNamingHazardCrossLinkFingerprint(
  summaries: readonly IntakeNamingHazardCrossLinkSummary[]
): string {
  return summaries
    .map((summary) => summary.structuredReasons.join('|'))
    .sort((left, right) => left.localeCompare(right))
    .join(';;')
}

export function listMissionIntakeNamingHazardCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  descriptors: NamingHazardDescriptorRecordsMap | undefined
  currentCase: Pick<CaseInstance, 'id' | 'tags'>
}): readonly IntakeNamingHazardCrossLinkSummary[] {
  if (!input.reports || !input.descriptors) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.descriptors).length === 0) {
    return []
  }

  const summaries: IntakeNamingHazardCrossLinkSummary[] = []
  const seenTopicRefs = new Set<string>()

  for (const topicKey of resolveMissionIntakeTopicKeys(input.currentCase)) {
    const summary = composeIntakeNamingHazardCrossLinks(
      input.reports,
      input.descriptors,
      topicKey
    )

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

export function composeAllIntakeNamingHazardCrossLinkSummaries(input: {
  reports: InformationIntakeReportsMap | undefined
  descriptors: NamingHazardDescriptorRecordsMap | undefined
}): readonly IntakeNamingHazardCrossLinkSummary[] {
  if (!input.reports || !input.descriptors) {
    return []
  }

  if (Object.keys(input.reports).length === 0 || Object.keys(input.descriptors).length === 0) {
    return []
  }

  return composeAllIntakeNamingHazardCrossLinks(input.reports, input.descriptors)
}
