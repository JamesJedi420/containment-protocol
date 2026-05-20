import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '../app/routes'
import {
  buildDrillDownHrefWithFeedContext,
  getCaseWeeklyReportWeeks,
  hasEventFeedFilterParams,
  resolveOperationsBackTarget,
} from '../features/operations/operationsRouteDrillDown'
import type { WeeklyReport } from '../domain/models'

function emptyReport(week: number): WeeklyReport {
  return {
    week,
    rngStateBefore: 1,
    rngStateAfter: 2,
    newCases: [],
    progressedCases: [],
    resolvedCases: [],
    failedCases: [],
    partialCases: [],
    unresolvedTriggers: [],
    spawnedCases: [],
    maxStage: 1,
    avgFatigue: 0,
    teamStatus: [],
    notes: [],
  }
}

describe('getCaseWeeklyReportWeeks', () => {
  it('collects weeks from caseSnapshots when case lists are empty', () => {
    const reports: WeeklyReport[] = [
      {
        ...emptyReport(2),
        caseSnapshots: {
          'case-a': {
            caseId: 'case-a',
            title: 'Snapshot only',
            kind: 'case',
            mode: 'containment',
            status: 'in_progress',
            stage: 1,
            deadlineRemaining: 2,
            durationWeeks: 3,
            assignedTeamIds: [],
          },
        },
      },
    ]

    expect(getCaseWeeklyReportWeeks(reports, 'case-a')).toEqual([2])
  })

  it('collects weeks from case lists and note metadata.caseId', () => {
    const reports: WeeklyReport[] = [
      {
        ...emptyReport(1),
        progressedCases: ['case-a'],
      },
      {
        ...emptyReport(3),
        notes: [
          {
            id: 'n-1',
            content: 'Probe strain on case-a',
            timestamp: 1,
            type: 'infiltration.cover_strain',
            metadata: { caseId: 'case-a', week: 3 },
          },
        ],
      },
      {
        ...emptyReport(4),
        notes: [
          {
            id: 'n-2',
            content: 'Mentions case-a in prose only',
            timestamp: 1,
          },
        ],
      },
    ]

    expect(getCaseWeeklyReportWeeks(reports, 'case-a')).toEqual([1, 3])
  })
})

describe('event feed return navigation', () => {
  it('detects feed filter params', () => {
    expect(hasEventFeedFilterParams(new URLSearchParams('feedQ=raid'))).toBe(true)
    expect(hasEventFeedFilterParams(new URLSearchParams('sort=name'))).toBe(false)
  })

  it('merges feed filters onto drill-down hrefs', () => {
    const href = buildDrillDownHrefWithFeedContext(
      APP_ROUTES.caseDetail('case-a'),
      new URLSearchParams('feedQ=raid&feedCategory=incident_response')
    )

    expect(href).toContain('/cases/case-a')
    expect(href).toContain('feedQ=raid')
    expect(href).toContain('feedCategory=incident_response')
  })

  it('preserves existing query strings on drill-down hrefs', () => {
    const href = buildDrillDownHrefWithFeedContext(
      '/cases/case-a?tab=timeline',
      new URLSearchParams('feedQ=raid')
    )

    expect(href).toContain('tab=timeline')
    expect(href).toContain('feedQ=raid')
  })

  it('returns operations desk when feed filters are present', () => {
    const target = resolveOperationsBackTarget(
      new URLSearchParams('feedType=case.resolved'),
      '/cases'
    )

    expect(target.href).toContain('/')
    expect(target.href).toContain('feedType=case.resolved')
    expect(target.label).toBe('Back to operations desk')
  })
})
