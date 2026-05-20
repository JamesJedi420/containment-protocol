import { APP_ROUTES } from '../../app/routes'
import {
  EVENT_FEED_PARAM_KEYS,
  readEventFeedFilters,
  writeEventFeedFilters,
} from '../dashboard/eventFeedView'
import type { ReportNote, WeeklyReport } from '../../domain/models'

function reportListsCase(report: WeeklyReport, caseId: string): boolean {
  return (
    report.newCases.includes(caseId) ||
    report.progressedCases.includes(caseId) ||
    report.resolvedCases.includes(caseId) ||
    report.failedCases.includes(caseId) ||
    report.partialCases.includes(caseId) ||
    report.unresolvedTriggers.includes(caseId) ||
    report.spawnedCases.includes(caseId) ||
    report.teamStatus.some((entry) => entry.assignedCaseId === caseId)
  )
}

function reportNoteReferencesCase(note: ReportNote, caseId: string): boolean {
  const metadataCaseId = note.metadata?.caseId

  return typeof metadataCaseId === 'string' && metadataCaseId === caseId
}

/** Report weeks that mention `caseId` in lists, team status, or structured notes. */
export function getCaseWeeklyReportWeeks(
  reports: readonly WeeklyReport[],
  caseId: string
): number[] {
  const weeks = new Set<number>()

  for (const report of reports) {
    if (
      reportListsCase(report, caseId) ||
      report.notes.some((note) => reportNoteReferencesCase(note, caseId))
    ) {
      weeks.add(report.week)
    }
  }

  return [...weeks].sort((left, right) => left - right)
}

export function hasEventFeedFilterParams(searchParams: URLSearchParams): boolean {
  return Object.values(EVENT_FEED_PARAM_KEYS).some((key) => searchParams.has(key))
}

/** Merge active event-feed filters onto a drill-down href for return navigation. */
export function buildDrillDownHrefWithFeedContext(
  href: string,
  searchParams: URLSearchParams
): string {
  if (!hasEventFeedFilterParams(searchParams)) {
    return href
  }

  const [pathname, existingSearch = ''] = href.split('?')
  const merged = writeEventFeedFilters(
    readEventFeedFilters(searchParams),
    new URLSearchParams(existingSearch)
  )
  const serialized = merged.toString()

  return serialized.length > 0 ? `${pathname}?${serialized}` : pathname
}

export function resolveOperationsBackTarget(
  searchParams: URLSearchParams,
  defaultBack: string
): { href: string; label: string } {
  if (hasEventFeedFilterParams(searchParams)) {
    const feedSearch = writeEventFeedFilters(readEventFeedFilters(searchParams)).toString()

    return {
      href: feedSearch.length > 0 ? `${APP_ROUTES.operationsDesk}?${feedSearch}` : APP_ROUTES.operationsDesk,
      label: 'Back to operations desk',
    }
  }

  return { href: defaultBack, label: '' }
}
