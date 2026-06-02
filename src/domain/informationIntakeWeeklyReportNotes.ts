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
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

const WEEKLY_SYNTHETIC_EVENT_ID_PREFIX = 'weekly-intake:'

const NARRATIVE_SEGMENT_PATTERNS = {
  trace: /:trace-([^:]+)/,
  channel: /:channel-([^:]+)/,
  dispute: /:dispute-([^:]+)/,
  cue: /:cue-([^:]+)/,
} as const

export type WeeklyIntakeNarrativeSegments = {
  readonly trace?: string
  readonly channel?: string
  readonly dispute?: string
  readonly cue?: string
}

type WeeklyIntakeVerificationEventRef =
  | { readonly kind: 'corroboration'; readonly event: CorroborationEvent }
  | { readonly kind: 'contradiction'; readonly event: ContradictionEvent }

function humanizeNarrativeToken(token: string): string {
  return token.replace(/-/g, ' ')
}

export function extractWeeklyIntakeNarrativeSegments(sourceRef: string): WeeklyIntakeNarrativeSegments {
  const trace = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.trace)?.[1]
  const channel = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.channel)?.[1]
  const dispute = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.dispute)?.[1]
  const cue = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.cue)?.[1]

  return {
    ...(trace ? { trace } : {}),
    ...(channel ? { channel } : {}),
    ...(dispute ? { dispute } : {}),
    ...(cue ? { cue } : {}),
  }
}

function isWeeklySyntheticEventId(eventId: string): boolean {
  return eventId.startsWith(WEEKLY_SYNTHETIC_EVENT_ID_PREFIX)
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
      const segments = extractWeeklyIntakeNarrativeSegments(added.event.sourceRef)
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
          'system.week_delta',
          { delta: content }
        )
      )
      sequence += 1
    }
  }

  return notes
}
