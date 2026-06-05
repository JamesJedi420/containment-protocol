/**
 * SPE-854 slice 7: surface weekly intake verification narratives in weekly report notes.
 *
 * Projects synthetic corroboration/contradiction events (and narrative sourceRef segments)
 * into deterministic report notes — no InformationIntakeReportRecord schema changes.
 */

import type {
  ContradictionEvent,
  CorroborationEvent,
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
  InformationVerificationStatus,
} from './informationIntakeReport'
import {
  buildWeeklyIntakeCaseOutcomeMetadata,
  deriveWeeklyIntakeNarrativeSegments,
  extractWeeklyIntakeNarrativeSegmentsFromSourceRef,
  type WeeklyIntakeNarrativeSegments,
} from './informationIntakeWeeklyNarrativeTemplates'
import type { CaseInstance, ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

const WEEKLY_SYNTHETIC_EVENT_ID_PREFIX = 'weekly-intake:'

export type { WeeklyIntakeNarrativeSegments }

type WeeklyIntakeReportCaseContext = Pick<
  CaseInstance,
  'id' | 'stage' | 'status' | 'tags' | 'requiredTags' | 'preferredTags'
>

type WeeklyIntakeVerificationEventRef =
  | { readonly kind: 'corroboration'; readonly event: CorroborationEvent }
  | { readonly kind: 'contradiction'; readonly event: ContradictionEvent }

function humanizeNarrativeToken(token: string): string {
  return token.replace(/-/g, ' ')
}

export function extractWeeklyIntakeNarrativeSegments(sourceRef: string): WeeklyIntakeNarrativeSegments {
  return extractWeeklyIntakeNarrativeSegmentsFromSourceRef(sourceRef)
}

function isWeeklySyntheticEventId(eventId: string): boolean {
  return eventId.startsWith(WEEKLY_SYNTHETIC_EVENT_ID_PREFIX)
}

function extractLinkedCaseIdsFromSourceRef(sourceRef: string): readonly string[] {
  const parts = sourceRef.split(':')
  const caseSegment = parts[1] === 'weekly-intake' ? parts[3] : undefined
  if (!caseSegment || caseSegment === 'no-case-link') {
    return []
  }

  return caseSegment
    .split('+')
    .map((caseId) => caseId.trim())
    .filter((caseId) => caseId.length > 0)
    .sort((left, right) => left.localeCompare(right))
}

function resolveLinkedCaseIdsForReport(
  report: InformationIntakeReportRecord,
  sourceRef: string,
  casesById: Record<string, WeeklyIntakeReportCaseContext> | null | undefined
): readonly string[] {
  const fromSourceRef = extractLinkedCaseIdsFromSourceRef(sourceRef)
  if (fromSourceRef.length > 0) {
    return fromSourceRef
  }

  const cases = Object.values(casesById ?? {})
  if (cases.length === 0) {
    return []
  }

  const normalizedTopicRef = report.topicRef.trim().toLowerCase()
  const exactMatches = cases
    .filter((currentCase) => currentCase.id.trim().toLowerCase() === normalizedTopicRef)
    .map((currentCase) => currentCase.id)
    .sort((left, right) => left.localeCompare(right))

  if (exactMatches.length > 0) {
    return exactMatches
  }

  return []
}

function resolveWeeklyIntakeNarrativeSegments(input: {
  report: InformationIntakeReportRecord
  eventKind: 'corroboration' | 'contradiction'
  sourceRef: string
  week: number
  casesById: Record<string, WeeklyIntakeReportCaseContext> | null | undefined
}): WeeklyIntakeNarrativeSegments {
  const linkedCaseIds = resolveLinkedCaseIdsForReport(input.report, input.sourceRef, input.casesById)
  const metadata = buildWeeklyIntakeCaseOutcomeMetadata(linkedCaseIds, Object.values(input.casesById ?? {}))

  return deriveWeeklyIntakeNarrativeSegments({
    sourceRef: input.sourceRef,
    eventKind: input.eventKind,
    metadata,
    hasLinkedCases: linkedCaseIds.length > 0,
    reportId: input.report.id,
    week: input.week,
    topicRef: input.report.topicRef,
  })
}

function formatVerificationStatusLabel(status: InformationVerificationStatus): string {
  return status.replace(/_/g, ' ')
}

function formatCorroborationNoteContent(
  report: InformationIntakeReportRecord,
  segments: WeeklyIntakeNarrativeSegments
): string {
  const traceLabel = segments.trace ? humanizeNarrativeToken(segments.trace) : 'ambient trace'
  const channelLabel = segments.channel ? humanizeNarrativeToken(segments.channel) : 'routing channel'
  return `Intake verification — ${report.label}: corroboration (${traceLabel}; ${channelLabel}). Status: ${formatVerificationStatusLabel(report.verificationStatus)}.`
}

function formatContradictionNoteContent(
  report: InformationIntakeReportRecord,
  event: ContradictionEvent,
  segments: WeeklyIntakeNarrativeSegments
): string {
  const disputeLabel = segments.dispute ? humanizeNarrativeToken(segments.dispute) : 'signal dispute'
  const cueLabel = segments.cue ? humanizeNarrativeToken(segments.cue) : 'audit cue'
  const severityLabel = event.severity === 'major' ? 'major' : 'minor'
  return `Intake verification — ${report.label}: ${severityLabel} contradiction (${disputeLabel}; ${cueLabel}). Status: ${formatVerificationStatusLabel(report.verificationStatus)}.`
}

function collectPriorWeeklySyntheticEventIds(report: InformationIntakeReportRecord | undefined): Set<string> {
  const ids = new Set<string>()
  if (!report) {
    return ids
  }

  for (const event of report.corroborationHistory) {
    if (isWeeklySyntheticEventId(event.eventId)) {
      ids.add(event.eventId)
    }
  }
  for (const event of report.contradictionHistory) {
    if (isWeeklySyntheticEventId(event.eventId)) {
      ids.add(event.eventId)
    }
  }

  return ids
}

function collectAddedWeeklySyntheticEvents(
  priorReport: InformationIntakeReportRecord | undefined,
  nextReport: InformationIntakeReportRecord,
  week: number
): WeeklyIntakeVerificationEventRef[] {
  const priorIds = collectPriorWeeklySyntheticEventIds(priorReport)
  const added: WeeklyIntakeVerificationEventRef[] = []

  for (const event of nextReport.corroborationHistory) {
    if (
      event.week === week &&
      isWeeklySyntheticEventId(event.eventId) &&
      !priorIds.has(event.eventId)
    ) {
      added.push({ kind: 'corroboration', event })
    }
  }

  for (const event of nextReport.contradictionHistory) {
    if (
      event.week === week &&
      isWeeklySyntheticEventId(event.eventId) &&
      !priorIds.has(event.eventId)
    ) {
      added.push({ kind: 'contradiction', event })
    }
  }

  return added
}

/**
 * Builds deterministic weekly report notes for intake verification events added this tick.
 */
export function buildWeeklyIntakeVerificationReportNotes(input: {
  priorReports: InformationIntakeReportsMap | null | undefined
  nextReports: InformationIntakeReportsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
  casesById?: Record<string, WeeklyIntakeReportCaseContext> | null
}): ReportNote[] {
  const priorReports = input.priorReports ?? {}
  const nextReports = input.nextReports ?? {}
  const reportIds = Object.keys(nextReports).sort((left, right) => left.localeCompare(right))

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const reportId of reportIds) {
    const nextReport = nextReports[reportId]
    if (!nextReport) {
      continue
    }

    const addedEvents = collectAddedWeeklySyntheticEvents(priorReports[reportId], nextReport, input.week)
    addedEvents.sort((left, right) => left.event.eventId.localeCompare(right.event.eventId))

    for (const added of addedEvents) {
      const segments = resolveWeeklyIntakeNarrativeSegments({
        report: nextReport,
        eventKind: added.kind,
        sourceRef: added.event.sourceRef,
        week: input.week,
        casesById: input.casesById,
      })
      const content =
        added.kind === 'corroboration'
          ? formatCorroborationNoteContent(nextReport, segments)
          : formatContradictionNoteContent(nextReport, added.event, segments)

      notes.push(
        createDeterministicReportNote(
          content,
          input.week,
          sequence,
          input.baseTimestamp,
          'information_intake.verification',
          {
            reportId,
            reportLabel: nextReport.label,
            eventKind: added.kind,
            verificationStatus: nextReport.verificationStatus,
            week: input.week,
          }
        )
      )
      sequence += 1
    }
  }

  return notes
}
