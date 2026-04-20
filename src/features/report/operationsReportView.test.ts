import '../../test/setup'
import { describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { loadGameSave, serializeGameSave } from '../../app/store/saveSystem'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import {
  getDeploymentReadinessReportView,
  getMissionRoutingReportView,
  getOperationsReportView,
  getWeakestLinkOutcomeReportView,
  getWeeklyOperationsSummaryView,
} from './operationsReportView'

function createOutcomeState() {
  const state = createStartingState()
  const caseId = Object.keys(state.cases)[0]!
  const teamId = Object.keys(state.teams)[0]!
  const currentCase = state.cases[caseId]!
  const team = state.teams[teamId]!

  state.cases[caseId] = {
    ...currentCase,
    mode: 'deterministic',
    status: 'in_progress',
    assignedTeamIds: [teamId],
    durationWeeks: 1,
    weeksRemaining: 1,
    requiredRoles: [],
    requiredTags: [],
  }
  state.teams[teamId] = {
    ...team,
    memberIds: [...(team.agentIds ?? team.memberIds ?? [])],
    agentIds: [...(team.agentIds ?? team.memberIds ?? [])],
    status: { state: 'deployed', assignedCaseId: caseId },
  }

  return advanceWeek(state)
}

describe('operations report view', () => {
  it('keeps player-facing routing summaries deterministic', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
    }

    const first = getMissionRoutingReportView(state)
    const second = getMissionRoutingReportView(state)

    expect(second).toEqual(first)
    expect(first.length).toBeGreaterThan(0)
    expect(first[0]!.highlights.length).toBeLessThanOrEqual(3)
    expect(first[0]!.details.length).toBeLessThanOrEqual(3)
  })

  it('keeps readiness report output deterministic', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
    }

    const first = getDeploymentReadinessReportView(state)
    const second = getDeploymentReadinessReportView(state)

    expect(second).toEqual(first)
    expect(first.length).toBeGreaterThan(0)
    expect(first[0]!.hardBlockers.length).toBeLessThanOrEqual(3)
    expect(first[0]!.softRisks.length).toBeLessThanOrEqual(3)
    expect(first[0]!.details.length).toBeLessThanOrEqual(3)
  })

  it('keeps weakest-link report output deterministic', () => {
    const state = createOutcomeState()

    const first = getWeakestLinkOutcomeReportView(state)
    const second = getWeakestLinkOutcomeReportView(state)

    expect(second).toEqual(first)
    expect(first.length).toBeGreaterThan(0)
    expect(first[0]!.contributors.length).toBeLessThanOrEqual(3)
    expect(first[0]!.gainSummary.length).toBeGreaterThan(0)
    expect(first[0]!.costSummary.length).toBeGreaterThan(0)
    expect(first[0]!.netSummary.length).toBeGreaterThan(0)
  })

  it('keeps weekly operations summary output deterministic', () => {
    const state = createStartingState()

    const first = getWeeklyOperationsSummaryView(state)
    const second = getWeeklyOperationsSummaryView(state)

    expect(second).toEqual(first)
    expect(first.details.length).toBeLessThanOrEqual(3)
    expect(first.unresolvedTrend.length).toBeLessThanOrEqual(5)
  })

  it('leaves save/load assumptions unaffected because report surfaces stay derived', () => {
    const state = createOutcomeState()
    const before = getOperationsReportView(state)

    const raw = serializeGameSave(state)
    const loaded = loadGameSave(raw)

    expect(raw).not.toContain('dominantFactorLabel')
    expect(raw).not.toContain('operations report')
    expect(getOperationsReportView(loaded)).toEqual(before)
  })
})
