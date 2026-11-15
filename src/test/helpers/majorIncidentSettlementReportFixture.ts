import { expect } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { loadGameSave, serializeGameSave } from '../../app/store/saveSystem'
import type { GameState } from '../../domain/models'
import {
  buildDerivedMajorIncidentRuntime,
  evaluateMajorIncidentPlan,
} from '../../domain/majorIncidentOperations'
import { isValidMajorIncidentSettlementReceipt } from '../../domain/majorIncidentTerminalSettlement'
import { launchMajorIncident } from '../../domain/sim/assign'
import { advanceWeek } from '../../domain/sim/advanceWeek'

function makeSettlementReportBaseState(): GameState {
  const state = createStartingState()
  return {
    ...state,
    rngSeed: 42,
    rngState: 42,
    agents: {},
    teams: {},
    cases: {},
    templates: {},
    inventory: {},
    knowledge: {},
    agency: { ...state.agency!, supportAvailable: 10 },
    // Keep the scenario's difficulty and payout scale explicit.
    config: {
      ...state.config,
      stageScalar: 1,
      fundingPerResolution: 10,
      containmentDeltaPerResolution: 1,
    },
  }
}

function buildSettlementReportFixture(activeCount: number): GameState {
  const state = makeSettlementReportBaseState()
  const baseAgent = createStartingState().agents.a_ava
  for (let i = 0; i <= activeCount + 4; i++) {
    const agentId = `a${i}`
    state.agents[agentId] = {
      ...baseAgent,
      id: agentId,
      name: `Agent ${i}`,
      baseStats: { combat: 100, investigation: 100, utility: 100, social: 100 },
      fatigue: 0,
      status: 'active',
    }
    state.teams[`t${i}`] = {
      id: `t${i}`,
      name: `Team ${i}`,
      agentIds: [agentId],
      memberIds: [agentId],
      leaderId: agentId,
      tags: [],
    }
  }
  for (let i = 0; i < activeCount; i++) {
    const id = `c${i}`
    state.cases[id] = {
      id,
      templateId: `template-${i}`,
      title: i === 0 ? 'Report Settlement Incident' : `Case ${i}`,
      description: '',
      mode: 'deterministic',
      kind: i === 0 ? 'raid' : 'case',
      status: i === 0 ? 'open' : 'in_progress',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      requiredRoles: [],
      stage: i === 0 ? 3 : 1,
      durationWeeks: 1,
      deadlineWeeks: 5,
      deadlineRemaining: 5,
      assignedTeamIds: i === 0 ? [] : [`t${i + 4}`],
      onPartial: { stageDelta: 0 },
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      ...(i === 0 ? { raid: { minTeams: 2, maxTeams: 4 } } : {}),
    }
  }
  const runtime = buildDerivedMajorIncidentRuntime(state.cases.c0, state)!
  expect(runtime).not.toBeNull()
  const teamIds = Array.from({ length: runtime.requiredTeams }, (_, i) => 't' + i)
  const plan = evaluateMajorIncidentPlan(state, state.cases.c0, teamIds, {
    strategy: 'balanced',
    provisions: [],
  })
  expect(plan?.valid, JSON.stringify(plan)).toBe(true)
  const launched = launchMajorIncident(state, 'c0', teamIds, 'balanced', [])
  expect(launched.cases.c0.status).toBe('in_progress')
  expect(launched.cases.c0.majorIncident).toBeDefined()
  // Construct the last resolution window; actual launch, resolution, resettlement,
  // report building and report consumer remain production implementations.
  launched.cases.c0 = { ...launched.cases.c0, weeksRemaining: 1 }
  return launched
}

export function observeSettlementReport(activeCount: number) {
  const source = buildSettlementReportFixture(activeCount)
  const after = advanceWeek(source, 0)
  const report = after.reports.at(-1)!
  const mission = report.caseSnapshots!.c0.missionResult!
  const receipt = after.cases.c0.majorIncident!.settlementReceipt!
  if (!isValidMajorIncidentSettlementReceipt(receipt)) {
    throw new Error('Expected a valid terminal settlement receipt')
  }
  return { source, after, report, mission, receipt }
}

export function reloadSettlementReport(
  { source, after, report }: ReturnType<typeof observeSettlementReport>,
  relaunch: boolean
) {
  const loaded = loadGameSave(serializeGameSave(after))
  const current = relaunch
    ? launchMajorIncident(loaded, 'c0', source.cases.c0.assignedTeamIds, 'balanced', [])
    : loaded
  return {
    loaded,
    current,
    savedReport: loaded.reports.find((item) => item.week === report.week)!,
    historical: current.reports.find((item) => item.week === report.week)!,
  }
}
