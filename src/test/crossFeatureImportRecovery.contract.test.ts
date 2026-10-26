import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as replayView from '../features/operations/historicalRouteReplayView'
import { getHistoricalRouteReplayOperationalExplanations } from '../features/operations/historicalRouteReplayExplanationAdapter'
import { getHistoricalRouteReplayMapChromeViews } from '../features/operations/historicalRouteReplayMapChromeAdapter'
import { createHistoricalRouteReplayVisibilityForFromKnowledge } from '../features/operations/historicalRouteReplayVisibilityFromKnowledge'
import { createStartingState } from '../data/startingState'
import { getCaseListItemView } from '../features/cases/caseView'
import { getCaseListItemBaseView } from '../features/shared/caseListItemView'
import { getTeamListItemView } from '../features/teams/teamView'
import { getTeamListItemView as getSharedTeamListItemView } from '../features/shared/teamView'
import { getCaseTemplateFamily } from '../features/report/reportIntelProjection'
import { getTemplateFamily } from '../features/intel/intelView'
import {
  getCaseTemplateFamily as getSharedCaseTemplateFamily,
  getTemplateFamily as getSharedTemplateFamily,
} from '../features/shared/templateFamilyView'
import { getPriorityCaseViews, getAtRiskTeamViews } from '../features/dashboard/dashboardView'
import {
  getDashboardCaseViews,
  getDashboardTeamViews,
} from '../features/dashboard/sharedDashboardView'

const auditedConsumers = [
  'dashboard/DashboardPage.tsx',
  'dashboard/OperationsReportPanel.tsx',
  'dashboard/EventFeedPanel.tsx',
  'report/ReportDetailPage.tsx',
  'cases/CaseDetailPage.tsx',
  'cases/CaseWeeklyReportsPanel.tsx',
  'agents/AgentDetailPage.tsx',
]

describe('SPE-3438 bounded cross-feature recovery', () => {
  it.each(auditedConsumers)(
    '%s uses only the recorded shared or stable sibling interfaces',
    (file) => {
      const source = readFileSync(resolve('src/features', file), 'utf8')
      const siblingImports = [...source.matchAll(/from\s+['"](\.\.\/[^'"]+)['"]/g)]
        .map((match) => match[1])
        .filter((specifier) => !specifier.startsWith('../../'))
      const allowed = new Set([
        '../shared/operationsRouteDrillDown',
        '../operations/historicalRouteReplayView',
        '../report/operationsReportView',
      ])
      expect(siblingImports.filter((specifier) => !allowed.has(specifier))).toEqual([])
    }
  )

  it.each([
    'dashboard/dashboardView.ts',
    'dashboard/sharedDashboardView.ts',
    'dashboard/dashboardReportProjection.ts',
    ...readdirSync(resolve('src/features/shared')).map((name) => `shared/${name}`),
  ])('%s consumes shared ownership without an import back into a feature', (file) => {
    const source = readFileSync(resolve('src/features', file), 'utf8')
    const featureImports = [...source.matchAll(/from\s+['"]\.\.\/([a-zA-Z0-9_-]+)\//g)]
      .map((match) => match[1])
      .filter((feature) => feature !== 'shared')
    expect(featureImports).toEqual([])
  })

  it('preserves default rows, priority versus insertion ordering, limits, and input state', () => {
    const game = createStartingState()
    const template = Object.values(game.cases)[0]!
    game.cases = {
      low: {
        ...template,
        id: 'low',
        status: 'open',
        stage: 1,
        deadlineRemaining: 10,
        assignedTeamIds: [],
      },
      high: {
        ...template,
        id: 'high',
        status: 'open',
        stage: 4,
        deadlineRemaining: 1,
        assignedTeamIds: [],
      },
      resolved: { ...template, id: 'resolved', status: 'resolved', stage: 5, assignedTeamIds: [] },
      medium: {
        ...template,
        id: 'medium',
        status: 'open',
        stage: 2,
        deadlineRemaining: 5,
        assignedTeamIds: [],
      },
    }
    const team = Object.values(game.teams)[0]!
    game.teams = {
      zulu: { ...team, id: 'zulu', name: 'Zulu', status: { state: 'ready', assignedCaseId: null } },
      alpha: {
        ...team,
        id: 'alpha',
        name: 'Alpha',
        status: { state: 'ready', assignedCaseId: null },
      },
    }
    for (const agent of Object.values(game.agents)) agent.fatigue = 60
    const before = structuredClone(game)
    for (const currentCase of Object.values(game.cases)) {
      expect(getCaseListItemBaseView(currentCase, game)).toEqual(
        getCaseListItemView(currentCase, game)
      )
    }
    expect(getPriorityCaseViews(game, 2).map((view) => view.currentCase.id)).toEqual([
      'high',
      'medium',
    ])
    expect(getDashboardCaseViews(game, 2).map((view) => view.currentCase.id)).toEqual([
      'low',
      'high',
    ])
    expect(getAtRiskTeamViews(game, 1).map((view) => view.team.id)).toEqual(['alpha'])
    expect(getDashboardTeamViews(game, 1).map((view) => view.team.id)).toEqual(['zulu'])
    expect(getPriorityCaseViews({ ...game, cases: {} })).toEqual([])
    expect(getAtRiskTeamViews({ ...game, teams: {} })).toEqual([])
    expect(game).toEqual(before)
  })

  it('keeps feature compatibility interfaces attached to the shared canonical functions', () => {
    expect(getTeamListItemView).toBe(getSharedTeamListItemView)
    expect(getCaseTemplateFamily).toBe(getSharedCaseTemplateFamily)
    expect(getTemplateFamily).toBe(getSharedTemplateFamily)
    expect(getTemplateFamily('raid_beta-1')).toBe('raid')
  })

  it('exposes the existing canonical replay functions without a second implementation', () => {
    expect(replayView.getHistoricalRouteReplayOperationalExplanations).toBe(
      getHistoricalRouteReplayOperationalExplanations
    )
    expect(replayView.getHistoricalRouteReplayMapChromeViews).toBe(
      getHistoricalRouteReplayMapChromeViews
    )
    expect(replayView.createHistoricalRouteReplayVisibilityForFromKnowledge).toBe(
      createHistoricalRouteReplayVisibilityForFromKnowledge
    )
  })
})
