/**
 * SPE-854 / SPE-2358 slice 1: intake report ↔ naming-hazard descriptor cross-link compose.
 *
 * Pure deterministic linkage between persisted information intake reports and
 * naming-hazard descriptor registry records via shared topic refs — no new persistence
 * fields on intake reports; optional `intakeTopicRef` on naming-hazard descriptors.
 */

import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
} from './informationIntakeReport'
import { summarizeMixedSourceIntake } from './informationIntakeReport'
import { resolveIntakeExtranormalTopicKeys } from './informationIntakeExtranormalCrossLink'
import type {
  NamingHazardDescriptorRecord,
  NamingHazardDescriptorRecordsMap,
} from './namingHazardDescriptorRegistry'

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

export type IntakeNamingHazardMatchKind = 'intake_topic_ref'

export interface IntakeNamingHazardCrossLink {
  readonly intakeReportId: string
  readonly namingHazardDescriptorId: string
  readonly topicRef: string
  readonly matchKind: IntakeNamingHazardMatchKind
}

export interface IntakeNamingHazardCrossLinkSummary {
  readonly topicRef: string
  readonly links: readonly IntakeNamingHazardCrossLink[]
  readonly linkedReportCount: number
  readonly linkedDescriptorCount: number
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
  descriptor: NamingHazardDescriptorRecord
): IntakeNamingHazardCrossLink | null {
  const reportTopicRef = normalizeToken(report.topicRef)
  if (!reportTopicRef) {
    return null
  }

  const intakeTopicRef = normalizeToken(descriptor.intakeTopicRef ?? '')
  if (intakeTopicRef && topicKeysOverlap(reportTopicRef, intakeTopicRef)) {
    return {
      intakeReportId: report.id,
      namingHazardDescriptorId: descriptor.id,
      topicRef: intakeTopicRef,
      matchKind: 'intake_topic_ref',
    }
  }

  return null
}

export function listIntakeReportsForNamingHazardDescriptor(
  reports: InformationIntakeReportsMap | undefined,
  descriptor: NamingHazardDescriptorRecord
): InformationIntakeReportRecord[] {
  if (!reports) {
    return []
  }

  const linked: InformationIntakeReportRecord[] = []

  for (const report of Object.values(reports)) {
    if (resolveCrossLinkMatch(report, descriptor)) {
      linked.push(report)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function listNamingHazardDescriptorsForIntakeTopic(
  descriptors: NamingHazardDescriptorRecordsMap | undefined,
  topicRef: string
): NamingHazardDescriptorRecord[] {
  if (!descriptors) {
    return []
  }

  const normalizedTopicRef = normalizeToken(topicRef)
  if (!normalizedTopicRef) {
    return []
  }

  const linked: NamingHazardDescriptorRecord[] = []

  for (const descriptor of Object.values(descriptors)) {
    const intakeTopicRef = normalizeToken(descriptor.intakeTopicRef ?? '')

    if (intakeTopicRef && topicKeysOverlap(normalizedTopicRef, intakeTopicRef)) {
      linked.push(descriptor)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export function composeIntakeNamingHazardCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  descriptors: NamingHazardDescriptorRecordsMap | undefined,
  topicRef: string
): IntakeNamingHazardCrossLinkSummary {
  const normalizedTopicRef = normalizeToken(topicRef)
  const reportList = normalizedTopicRef
    ? Object.values(reports ?? {}).filter((report) =>
        topicKeysOverlap(normalizedTopicRef, report.topicRef)
      )
    : []
  const descriptorList = listNamingHazardDescriptorsForIntakeTopic(
    descriptors,
    normalizedTopicRef
  )

  reportList.sort((left, right) => left.id.localeCompare(right.id))

  const links: IntakeNamingHazardCrossLink[] = []

  for (const report of reportList) {
    for (const descriptor of descriptorList) {
      const match = resolveCrossLinkMatch(report, descriptor)
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

    const byDescriptor = left.namingHazardDescriptorId.localeCompare(
      right.namingHazardDescriptorId
    )
    if (byDescriptor !== 0) {
      return byDescriptor
    }

    return left.intakeReportId.localeCompare(right.intakeReportId)
  })

  const linkedReportIds = new Set(links.map((link) => link.intakeReportId))
  const linkedDescriptorIds = new Set(links.map((link) => link.namingHazardDescriptorId))
  const linkedReports = reportList.filter((report) => linkedReportIds.has(report.id))

  const structuredReasons = [
    `topic:${normalizedTopicRef || '(unknown)'}`,
    `link_count:${links.length}`,
    `linked_report_count:${linkedReportIds.size}`,
    `linked_descriptor_count:${linkedDescriptorIds.size}`,
    links.some((link) => link.matchKind === 'intake_topic_ref')
      ? 'match:intake_topic_ref'
      : 'match:none_intake_topic_ref',
  ].sort((left, right) => left.localeCompare(right))

  return {
    topicRef: normalizedTopicRef || '(unknown)',
    links,
    linkedReportCount: linkedReportIds.size,
    linkedDescriptorCount: linkedDescriptorIds.size,
    intakeSummary: linkedReports.length > 0 ? summarizeMixedSourceIntake(linkedReports) : null,
    structuredReasons,
  }
}

/** Compose cross-link summaries for every topic ref present in linked intake reports. */
export function composeAllIntakeNamingHazardCrossLinks(
  reports: InformationIntakeReportsMap | undefined,
  descriptors: NamingHazardDescriptorRecordsMap | undefined
): readonly IntakeNamingHazardCrossLinkSummary[] {
  const topicRefs = new Set<string>()

  for (const report of Object.values(reports ?? {})) {
    const topicRef = normalizeToken(report.topicRef)
    if (topicRef) {
      topicRefs.add(topicRef)
    }
  }

  return [...topicRefs]
    .sort((left, right) => left.localeCompare(right))
    .map((topicRef) => composeIntakeNamingHazardCrossLinks(reports, descriptors, topicRef))
    .filter((summary) => summary.links.length > 0)
}
