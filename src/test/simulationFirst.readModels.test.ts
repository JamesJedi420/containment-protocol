import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import { calcWeekScore } from '../domain/sim/scoring'
import { APP_ROUTES } from '../app/routes'
import { getShellMeta } from '../app/shellView'
import { getOperationsDeskPanelsView } from '../features/dashboard/operationsDeskView'
import { getOperationsLeftPanelView } from '../features/operations/operationsLeftView'
import { getReportPageView } from '../features/report/reportView'

describe('simulation-first read models', () => {
  it('derives shell meta for agent detail from live assignment state', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

    const meta = getShellMeta(`${APP_ROUTES.agents}/a_ava`, '', assigned)

    expect(meta.title).toBe(assigned.agents.a_ava.name)
    expect(meta.subtitle).toContain(assigned.cases['case-001'].title)
    expect(meta.backTo).toBe(APP_ROUTES.agents)
  })

  it('builds report page summary and weekly ordering from reports only', () => {
    const game = createStartingState()
    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 2,
        avgFatigue: 4,
        teamStatus: [],
        notes: [],
      },
      {
        week: 2,
        rngStateBefore: 2,
        rngStateAfter: 3,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: ['case-002'],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 3,
        avgFatigue: 7,
        teamStatus: [],
        notes: [],
      },
    ]

    const view = getReportPageView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary?.cumulativeScore).toBe(
      calcWeekScore(game.reports[0]!) + calcWeekScore(game.reports[1]!)
    )
    expect(view.weeklyReports.map((entry) => entry.report.week)).toEqual([2, 1])
  })

  it('builds operations desk panel views without component-side simulation math', () => {
    const game = createStartingState()

    const view = getOperationsDeskPanelsView(game)

    expect(view.fieldStatusViews.length).toBeGreaterThan(0)
    expect(view.fieldStatusViews[0]?.agentNames.length).toBeGreaterThan(0)
    expect(view.market.featuredRecipeName.length).toBeGreaterThan(0)

    const labels = view.inventoryRows.map((entry) => entry.label)
    expect(labels).toEqual([...labels].sort((left, right) => left.localeCompare(right)))
  })

  it('builds operations left panel summaries from deterministic division metrics', () => {
    const game = createStartingState()

    const view = getOperationsLeftPanelView(game)

    expect(view.intelligenceSummary).toMatch(/no intel report generated yet/i)
    expect(view.logisticsSummary).toMatch(/queue capacity available/i)
    expect(view.reserveStaffCount).toBeGreaterThanOrEqual(0)
  })
})
