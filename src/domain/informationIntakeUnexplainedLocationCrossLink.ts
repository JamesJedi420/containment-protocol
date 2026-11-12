/**
 * SPE-854 / SPE-2356 slice 1: intake report ↔ unexplained location cross-link compose.
 *
 * Pure deterministic linkage between persisted information intake reports and
 * unexplained location registry records via shared topic refs — no new persistence
 * fields on intake reports; optional `intakeTopicRef` on location records.
 */

import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
} from './informationIntakeReport'
import { summarizeMixedSourceIntake } from './informationIntakeReport'
import { resolveIntakeExtranormalTopicKeys } from './informationIntakeExtranormalCrossLink'
import type {
  UnexplainedLocationRecord,
  UnexplainedLocationRecordsMap,
} from './unexplainedLocationRegistry'

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

export type IntakeUnexplainedLocationMatchKind = 'intake_topic_ref'

export interface IntakeUnexplainedLocationCrossLink {
  readonly intakeReportId: string
  readonly unexplainedLocationId: string
  readonly topicRef: string
  readonly matchKind: IntakeUnexplainedLocationMatchKind
}

export interface IntakeUnexplainedLocationCrossLinkSummary {
  readonly topicRef: string
  readonly links: readonly IntakeUnexplainedLocationCrossLink[]
  readonly linkedReportCount: number
  readonly linkedLocationCount: number
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
  location: UnexplainedLocationRecord
): IntakeUnexplainedLocationCrossLink | null {
  const reportTopicRef = normalizeToken(report.topicRef)
  if (!reportTopicRef) {
    return null
  }

  const intakeTopicRef = normalizeToken(location.intakeTopicRef ?? '')
  if (intakeTopicRef && topicKeysOverlap(reportTopicRef, intakeTopicRef)) {
    return {
      intakeReportId: report.id,
      unexplainedLocationId: location.id,
      topicRef: intakeTopicRef,
      matchKind: 'intake_topic_ref',
    }
  }

  return null
}

export function listIntakeReportsForUnexplainedLocation(
  reports: InformationIntakeReportsMap | undefined,
  location: UnexplainedLocationRecord
): InformationIntakeReportRecord[] {
  if (!reports) {
    return []
  }

  const linked: InformationIntakeReportRecord[] = []

  for (const report of Object.values(reports)) {
    if (resolveCrossLinkMatch(report, location)) {
      linked.push(report)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function listUnexplainedLocationsForIntakeTopic(
  locations: UnexplainedLocationRecordsMap | undefined,
  topicRef: string
): UnexplainedLocationRecord[] {
  if (!locations) {
    return []
  }

  const normalizedTopicRef = normalizeToken(topicRef)
  if (!normalizedTopicRef) {
    return []
  }

  const linked: UnexplainedLocationRecord[] = []

  for (const location of Object.values(locations)) {
    const intakeTopicRef = normalizeToken(location.intakeTopicRef ?? '')

    if (intakeTopicRef && topicKeysOverlap(normalizedTopicRef, intakeTopicRef)) {
      linked.push(location)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function composeIntakeUnexplainedLocationCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  locations: UnexplainedLocationRecordsMap | undefined,
  topicRef: string
): IntakeUnexplainedLocationCrossLinkSummary {
  const normalizedTopicRef = normalizeToken(topicRef)
  const reportList = normalizedTopicRef
    ? Object.values(reports ?? {}).filter((report) =>
        topicKeysOverlap(normalizedTopicRef, report.topicRef)
      )
    : []
  const locationList = listUnexplainedLocationsForIntakeTopic(locations, normalizedTopicRef)

  reportList.sort((left, right) => left.id.localeCompare(right.id))

  const links: IntakeUnexplainedLocationCrossLink[] = []

  for (const report of reportList) {
    for (const location of locationList) {
      const match = resolveCrossLinkMatch(report, location)
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

    const byLocation = left.unexplainedLocationId.localeCompare(right.unexplainedLocationId)
    if (byLocation !== 0) {
      return byLocation
    }

    return left.intakeReportId.localeCompare(right.intakeReportId)
  })

  const linkedReportIds = new Set(links.map((link) => link.intakeReportId))
  const linkedLocationIds = new Set(links.map((link) => link.unexplainedLocationId))
  const linkedReports = reportList.filter((report) => linkedReportIds.has(report.id))

  const structuredReasons = [
    `topic:${normalizedTopicRef || '(unknown)'}`,
    `link_count:${links.length}`,
    `linked_report_count:${linkedReportIds.size}`,
    `linked_location_count:${linkedLocationIds.size}`,
    links.some((link) => link.matchKind === 'intake_topic_ref')
      ? 'match:intake_topic_ref'
      : 'match:none_intake_topic_ref',
  ].sort((left, right) => left.localeCompare(right))

  return {
    topicRef: normalizedTopicRef || '(unknown)',
    links,
    linkedReportCount: linkedReportIds.size,
    linkedLocationCount: linkedLocationIds.size,
    intakeSummary: linkedReports.length > 0 ? summarizeMixedSourceIntake(linkedReports) : null,
    structuredReasons,
  }
}

/** Compose cross-link summaries for every topic ref present in linked intake reports. */
export function composeAllIntakeUnexplainedLocationCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  locations: UnexplainedLocationRecordsMap | undefined
): readonly IntakeUnexplainedLocationCrossLinkSummary[] {
  const topicRefs = new Set<string>()

  for (const report of Object.values(reports ?? {})) {
    const topicRef = normalizeToken(report.topicRef)
    if (topicRef) {
      topicRefs.add(topicRef)
    }
  }

  return [...topicRefs]
    .sort((left, right) => left.localeCompare(right))
    .map((topicRef) => composeIntakeUnexplainedLocationCrossLinks(reports, locations, topicRef))
    .filter((summary) => summary.links.length > 0)
}
