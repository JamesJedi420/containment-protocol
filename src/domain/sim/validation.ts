import { createStartingState } from '../../data/startingState'
import { isAgentAttritionUnavailable } from '../agent/attrition'
import { assessFundingPressure } from '../funding'
import { recomputeMissionRouting, routeMission } from '../missionIntakeRouting'
import {
  type CaseInstance,
  type GameState,
  type MissionPriorityBand,
  type WeeklyDirectiveId,
} from '../models'
import { normalizeGameState } from '../teamSimulation'
import { advanceWeek } from './advanceWeek'
import { assignTeam } from './assign'

const VALIDATION_NOTE_BASE = 1_800_000_000
const BASELINE_REFERENCE_STATE = createStartingState()
const BASELINE_FUNDING_REFERENCE = BASELINE_REFERENCE_STATE.funding
const BASELINE_ROSTER_REFERENCE = Object.keys(BASELINE_REFERENCE_STATE.agents).length

const PRIORITY_SORT_ORDER: Record<MissionPriorityBand, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

export type SimulationValidationScenarioId =
  | 'baseline'
  | 'low-intel'
  | 'high-escalation'
  | 'high-budget-pressure'
  | 'high-attrition'
  | 'mixed-pressure'

export type ValidationPressureSource =
  | 'stable'
  | 'case-load'
  | 'intel'
  | 'escalation'
  | 'budget'
  | 'attrition'

export type ValidationPressureScoreMap = Record<Exclude<ValidationPressureSource, 'stable'>, number>

export interface CurrentSimulationPressureSummary {
  unresolvedCaseCount: number
  attritionPressureCount: number
  budgetPressure: number
  escalationBurden: number
  intelConfidence: number
  pressureScores: ValidationPressureScoreMap
  dominantPressureSource: Exclude<ValidationPressureSource, 'stable'>
  dominantFactor: Exclude<ValidationPressureSource, 'stable'>
}

export interface SimulationValidationWeekSnapshot {
  week: number
  unresolvedCaseCount: number
  attritionPressureCount: number
  budgetPressure: number
  escalationBurden: number
  intelConfidence: number
  missionSuccesses: number
  missionPartials: number
  missionFailures: number
  missionUnresolved: number
  pressureScores: ValidationPressureScoreMap
  dominantPressureSource: Exclude<ValidationPressureSource, 'stable'>
  dominantFactor: Exclude<ValidationPressureSource, 'stable'>
  majorFailure: boolean
  gameOver: boolean
}

export interface SimulationValidationSummary {
  scenarioId: SimulationValidationScenarioId
  label: string
  weeksSimulated: number
  endedByGameOver: boolean
  weekOfFirstMajorFailure: number | null
  dominantPressureSource: ValidationPressureSource
  dominantFactor: ValidationPressureSource
  unresolvedCaseCountTrend: number[]
  attritionTrend: number[]
  budgetPressureTrend: number[]
  escalationTrend: number[]
  intelConfidenceTrend: number[]
  missionOutcomeCounts: {
    success: number
    partial: number
    fail: number
    unresolved: number
  }
}

export interface SimulationValidationRun {
  scenarioId: SimulationValidationScenarioId
  label: string
  initialState: GameState
  finalState: GameState
  weekly: SimulationValidationWeekSnapshot[]
  summary: SimulationValidationSummary
}

export interface SimulationValidationScenarioDefinition {
  id: SimulationValidationScenarioId
  label: string
  maxWeeks: number
}

interface InternalSimulationValidationScenario extends SimulationValidationScenarioDefinition {
  setup?: (state: GameState) => GameState
  beforeWeek?: (state: GameState, weekIndex: number) => GameState
  selectDirective?: (state: GameState, weekIndex: number) => WeeklyDirectiveId | null
}

function roundTo(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

function setFunding(state: GameState, funding: number): GameState {
  return {
    ...state,
    funding,
    agency: {
      ...(state.agency ?? {
        containmentRating: state.containmentRating,
        clearanceLevel: state.clearanceLevel,
        funding,
      }),
      funding,
    },
  }
}

function mapUnresolvedCases(
  state: GameState,
  mapper: (currentCase: CaseInstance) => CaseInstance
): GameState {
  return {
    ...state,
    cases: Object.fromEntries(
      Object.entries(state.cases).map(([caseId, currentCase]) => [
        caseId,
        currentCase.status === 'resolved' ? currentCase : mapper(currentCase),
      ])
    ),
  }
}

function applyCampaignIntelPressure(
  state: GameState,
  intelConfidence: number,
  intelUncertainty: number
): GameState {
  return mapUnresolvedCases(state, (currentCase) => ({
    ...currentCase,
    intelConfidence,
    intelUncertainty,
    intelLastUpdatedWeek: Math.max(0, state.week - 3),
  }))
}

function applyBaselineValidationBuffer(state: GameState): GameState {
  return mapUnresolvedCases(state, (currentCase) => ({
    ...currentCase,
    deadlineRemaining: currentCase.deadlineRemaining + 3,
    weeksRemaining:
      currentCase.weeksRemaining === undefined ? undefined : currentCase.weeksRemaining + 2,
  }))
}

function applyCampaignEscalationPressure(state: GameState): GameState {
  return {
    ...mapUnresolvedCases(state, (currentCase) => ({
      ...currentCase,
      stage: Math.max(currentCase.stage, 3),
      escalationLevel: Math.max(currentCase.escalationLevel ?? 0, 2),
      threatDrift: Math.max(currentCase.threatDrift ?? 0, 1),
      timePressure: Math.max(currentCase.timePressure ?? 0, 1),
      deadlineRemaining: Math.min(currentCase.deadlineRemaining, 1),
      onUnresolved: {
        ...currentCase.onUnresolved,
        stageDelta: Math.max(currentCase.onUnresolved.stageDelta ?? 0, 2),
        deadlineResetWeeks: Math.min(currentCase.onUnresolved.deadlineResetWeeks ?? 1, 1),
      },
    })),
    globalPressure: Math.max(state.globalPressure ?? 0, 96),
  }
}

function applyCampaignAttritionPressure(state: GameState): GameState {
  const agentIdsToStress = ['a_ava', 'a_kellan', 'a_sato']

  return {
    ...mapUnresolvedCases(
      {
        ...state,
        config: {
          ...state.config,
          durationModel: 'attrition',
          attritionPerWeek: 8,
        },
      },
      (currentCase) => ({
        ...currentCase,
        durationWeeks: currentCase.durationWeeks + 1,
        weeksRemaining: (currentCase.weeksRemaining ?? currentCase.durationWeeks) + 1,
        difficulty: {
          combat: currentCase.difficulty.combat + 8,
          investigation: currentCase.difficulty.investigation + 8,
          utility: currentCase.difficulty.utility + 8,
          social: currentCase.difficulty.social + 8,
        },
      })
    ),
    agents: Object.fromEntries(
      Object.entries(state.agents).map(([agentId, agent]) => {
        if (!agentIdsToStress.includes(agentId)) {
          return [agentId, { ...agent, fatigue: Math.min(100, agent.fatigue + 10) }]
        }

        return [
          agentId,
          {
            ...agent,
            fatigue: Math.min(100, agent.fatigue + 22),
            status: 'recovering',
            assignment: { state: 'recovery', startedWeek: state.week - 1, teamId: agent.assignment?.teamId },
            recoveryStatus: { state: 'recovering', sinceWeek: state.week - 1 },
            trauma: {
              traumaLevel: Math.max(agent.trauma?.traumaLevel ?? 0, 2),
              traumaTags: [...new Set([...(agent.trauma?.traumaTags ?? []), 'validation-stress'])],
              lastEventWeek: state.week - 1,
            },
          },
        ]
      })
    ),
  }
}

function applyCampaignBudgetPressure(state: GameState): GameState {
  return setFunding(
    {
      ...state,
      config: {
        ...state.config,
        fundingBasePerWeek: 2,
        fundingPerResolution: 4,
        fundingPenaltyPerFail: 14,
        fundingPenaltyPerUnresolved: 18,
      },
    },
    18
  )
}

const INTERNAL_SCENARIOS: readonly InternalSimulationValidationScenario[] = [
  {
    id: 'baseline',
    label: 'Baseline campaign progression',
    maxWeeks: 12,
    setup: applyBaselineValidationBuffer,
  },
  {
    id: 'low-intel',
    label: 'Low-intel campaign',
    maxWeeks: 12,
    setup: (state) => applyCampaignIntelPressure(state, 0.18, 0.82),
    beforeWeek: (state) => applyCampaignIntelPressure(state, 0.18, 0.82),
  },
  {
    id: 'high-escalation',
    label: 'High-escalation campaign',
    maxWeeks: 12,
    setup: applyCampaignEscalationPressure,
    beforeWeek: applyCampaignEscalationPressure,
  },
  {
    id: 'high-budget-pressure',
    label: 'High-budget-pressure campaign',
    maxWeeks: 12,
    setup: applyCampaignBudgetPressure,
  },
  {
    id: 'high-attrition',
    label: 'High-attrition campaign',
    maxWeeks: 12,
    setup: applyCampaignAttritionPressure,
  },
  {
    id: 'mixed-pressure',
    label: 'Mixed-pressure campaign',
    maxWeeks: 12,
    setup: (state) =>
      applyCampaignBudgetPressure(
        applyCampaignAttritionPressure(applyCampaignEscalationPressure(applyCampaignIntelPressure(state, 0.16, 0.84)))
      ),
    beforeWeek: (state) =>
      applyCampaignEscalationPressure(applyCampaignIntelPressure(state, 0.16, 0.84)),
  },
] as const

function getScenarioById(scenarioId: SimulationValidationScenarioId) {
  const scenario = INTERNAL_SCENARIOS.find((entry) => entry.id === scenarioId)
  if (!scenario) {
    throw new Error(`Unknown simulation validation scenario: ${scenarioId}`)
  }

  return scenario
}

function countUnresolvedCases(state: GameState) {
  return Object.values(state.cases).filter((currentCase) => currentCase.status !== 'resolved').length
}

function getAverageIntelConfidence(state: GameState) {
  const activeCases = Object.values(state.cases).filter((currentCase) => currentCase.status !== 'resolved')
  if (activeCases.length === 0) {
    return 1
  }

  return roundTo(
    activeCases.reduce((sum, currentCase) => sum + (currentCase.intelConfidence ?? 1), 0) /
      activeCases.length,
    2
  )
}

function getAverageFatigue(state: GameState) {
  const agents = Object.values(state.agents)
  if (agents.length === 0) {
    return 0
  }

  return Math.round(agents.reduce((sum, agent) => sum + agent.fatigue, 0) / agents.length)
}

function countAttritionPressureAgents(state: GameState) {
  return Object.values(state.agents).filter((agent) => {
    if (isAgentAttritionUnavailable(agent)) {
      return true
    }

    if (agent.status === 'dead' || agent.status === 'resigned' || agent.status === 'injured' || agent.status === 'recovering') {
      return true
    }

    if (agent.assignment?.state === 'recovery') {
      return true
    }

    return agent.recoveryStatus?.state === 'recovering' || agent.recoveryStatus?.state === 'incapacitated'
  }).length
}

export function computeBudgetPressureIndex(funding: number) {
  if (funding <= 0) {
    return 4
  }

  if (funding <= Math.round(BASELINE_FUNDING_REFERENCE * 0.25)) {
    return 3
  }

  if (funding <= Math.round(BASELINE_FUNDING_REFERENCE * 0.5)) {
    return 2
  }

  if (funding <= Math.round(BASELINE_FUNDING_REFERENCE * 0.75)) {
    return 1
  }

  return 0
}

function getEscalationBurden(state: GameState) {
  const activeCaseBurden = Object.values(state.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .reduce(
      (sum, currentCase) =>
        sum +
        Math.max(0, currentCase.escalationLevel ?? 0) +
        Math.max(0, currentCase.threatDrift ?? 0) +
        Math.max(0, currentCase.timePressure ?? 0),
      0
    )
  const ambientPressureBurden = Math.round(Math.max(0, state.globalPressure ?? 0) / 8)

  return (
    (state.globalEscalationLevel ?? 0) +
    (state.globalThreatDrift ?? 0) +
    (state.globalTimePressure ?? 0) +
    activeCaseBurden +
    ambientPressureBurden
  )
}

function buildPressureScores(
  state: GameState,
  unresolvedCaseCount: number,
  attritionPressureCount: number,
  budgetPressure: number,
  escalationBurden: number,
  intelConfidence: number
): ValidationPressureScoreMap {
  const activeCaseCap = Math.max(1, state.config.maxActiveCases)

  return {
    'case-load': roundTo(unresolvedCaseCount / activeCaseCap, 2),
    escalation: roundTo(escalationBurden / 12, 2),
    budget: roundTo(budgetPressure / 3, 2),
    attrition: roundTo(attritionPressureCount / Math.max(3, Math.ceil(BASELINE_ROSTER_REFERENCE / 3)), 2),
    intel:
      unresolvedCaseCount === 0
        ? 0
        : roundTo((1 - intelConfidence) / 0.75, 2),
  }
}

function getDominantPressureSource(
  scores: ValidationPressureScoreMap
): Exclude<ValidationPressureSource, 'stable'> {
  return (Object.entries(scores).sort(([leftSource, leftScore], [rightSource, rightScore]) => {
    if (leftScore !== rightScore) {
      return rightScore - leftScore
    }

    return leftSource.localeCompare(rightSource)
  })[0]?.[0] ?? 'case-load') as Exclude<ValidationPressureSource, 'stable'>
}

function isMajorFailureWeek(
  state: GameState,
  scores: ValidationPressureScoreMap,
  missionCounts: Pick<SimulationValidationWeekSnapshot, 'missionFailures' | 'missionUnresolved'>
) {
  return (
    state.gameOver ||
    Object.values(scores).some((score) => score >= 1) ||
    (scores.intel >= 0.9 && missionCounts.missionFailures + missionCounts.missionUnresolved > 0)
  )
}

export function buildCurrentSimulationPressureSummary(state: GameState): CurrentSimulationPressureSummary {
  const unresolvedCaseCount = countUnresolvedCases(state)
  const attritionPressureCount = countAttritionPressureAgents(state)
  const budgetPressure = Math.max(
    assessFundingPressure(state).budgetPressure,
    computeBudgetPressureIndex(state.funding)
  )
  const escalationBurden = getEscalationBurden(state)
  const intelConfidence = getAverageIntelConfidence(state)
  const pressureScores = buildPressureScores(
    state,
    unresolvedCaseCount,
    attritionPressureCount,
    budgetPressure,
    escalationBurden,
    intelConfidence
  )
  const dominantPressureSource = getDominantPressureSource(pressureScores)

  return {
    unresolvedCaseCount,
    attritionPressureCount,
    budgetPressure,
    escalationBurden,
    intelConfidence,
    pressureScores,
    dominantPressureSource,
    dominantFactor: dominantPressureSource,
  }
}

function compareMissionIds(state: GameState, leftId: string, rightId: string) {
  const leftMission = state.missionRouting?.missions[leftId]
  const rightMission = state.missionRouting?.missions[rightId]

  const leftPriority = PRIORITY_SORT_ORDER[leftMission?.priority ?? 'low']
  const rightPriority = PRIORITY_SORT_ORDER[rightMission?.priority ?? 'low']

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority
  }

  if ((leftMission?.triageScore ?? 0) !== (rightMission?.triageScore ?? 0)) {
    return (rightMission?.triageScore ?? 0) - (leftMission?.triageScore ?? 0)
  }

  const leftCase = state.cases[leftId]
  const rightCase = state.cases[rightId]

  if ((leftCase?.deadlineRemaining ?? 99) !== (rightCase?.deadlineRemaining ?? 99)) {
    return (leftCase?.deadlineRemaining ?? 99) - (rightCase?.deadlineRemaining ?? 99)
  }

  if ((leftCase?.stage ?? 0) !== (rightCase?.stage ?? 0)) {
    return (rightCase?.stage ?? 0) - (leftCase?.stage ?? 0)
  }

  return leftId.localeCompare(rightId)
}

function isTeamAssignable(state: GameState, teamId: string, missionId: string) {
  const team = state.teams[teamId]
  const assignedCaseId = team?.status?.assignedCaseId ?? team?.assignedCaseId ?? null

  return Boolean(team) && (!assignedCaseId || assignedCaseId === missionId)
}

function pickValidationDirective(state: GameState): WeeklyDirectiveId | null {
  const unresolvedCaseCount = countUnresolvedCases(state)
  const budgetPressure = Math.max(
    assessFundingPressure(state).budgetPressure,
    computeBudgetPressureIndex(state.funding)
  )
  const escalationBurden = getEscalationBurden(state)
  const averageFatigue = getAverageFatigue(state)
  const intelConfidence = getAverageIntelConfidence(state)
  const attritionPressureCount = countAttritionPressureAgents(state)
  const urgentOpenCase = Object.values(state.cases).some(
    (currentCase) => currentCase.status !== 'resolved' && currentCase.deadlineRemaining <= 1
  )
  const teamCount = Math.max(1, Object.keys(state.teams).length)

  if (
    urgentOpenCase ||
    unresolvedCaseCount >= Math.min(state.config.maxActiveCases - 1, teamCount + 1) ||
    escalationBurden >= 8
  ) {
    return 'lockdown-protocol'
  }

  if (attritionPressureCount >= 2 || averageFatigue >= 30) {
    return 'recovery-rotation'
  }

  if (intelConfidence <= 0.45) {
    return 'intel-surge'
  }

  if (budgetPressure >= 2) {
    return 'procurement-push'
  }

  return null
}

function applyDirectiveSelection(
  state: GameState,
  scenario: InternalSimulationValidationScenario,
  weekIndex: number
) {
  const selectedId = scenario.selectDirective?.(state, weekIndex) ?? pickValidationDirective(state)

  return {
    ...state,
    directiveState: {
      ...state.directiveState,
      selectedId,
    },
  }
}

function driveValidationAssignments(state: GameState) {
  let nextState: GameState = {
    ...state,
    missionRouting: recomputeMissionRouting(state, state.week),
  }

  const missionIds = [...(nextState.missionRouting?.orderedMissionIds ?? [])]
    .filter((missionId) => nextState.cases[missionId]?.status !== 'resolved')
    .sort((leftId, rightId) => compareMissionIds(nextState, leftId, rightId))

  for (const missionId of missionIds) {
    let currentCase = nextState.cases[missionId]

    if (!currentCase || currentCase.status === 'resolved') {
      continue
    }

    const maxTeams = currentCase.kind === 'raid' ? currentCase.raid?.maxTeams ?? 2 : 1
    let currentAssignedCount = currentCase.assignedTeamIds.filter((teamId) => Boolean(nextState.teams[teamId])).length

    while (currentAssignedCount < maxTeams) {
      nextState = {
        ...nextState,
        missionRouting: recomputeMissionRouting(nextState, nextState.week),
      }

      const routed = routeMission(nextState, missionId)
      const candidateTeamId = routed.rankedCandidates
        .filter((candidate) => candidate.valid)
        .map((candidate) => candidate.teamId)
        .find((teamId) => isTeamAssignable(nextState, teamId, missionId))

      if (!candidateTeamId) {
        break
      }

      const assignedState = assignTeam(nextState, missionId, candidateTeamId)
      const assignedTeamIds = assignedState.cases[missionId]?.assignedTeamIds ?? []

      if (!assignedTeamIds.includes(candidateTeamId)) {
        break
      }

      nextState = assignedState
      currentCase = nextState.cases[missionId]
      currentAssignedCount = currentCase?.assignedTeamIds.filter((teamId) => Boolean(nextState.teams[teamId])).length ?? 0

      if ((currentCase?.kind ?? 'case') !== 'raid') {
        break
      }
    }
  }

  return {
    ...nextState,
    missionRouting: recomputeMissionRouting(nextState, nextState.week),
  }
}

function captureWeeklySnapshot(state: GameState) {
  const report = state.reports.at(-1)

  if (!report) {
    throw new Error('Validation harness expected a weekly report after advancing the simulation.')
  }

  const pressure = buildCurrentSimulationPressureSummary(state)

  return {
    week: report.week,
    unresolvedCaseCount: pressure.unresolvedCaseCount,
    attritionPressureCount: pressure.attritionPressureCount,
    budgetPressure: pressure.budgetPressure,
    escalationBurden: pressure.escalationBurden,
    intelConfidence: pressure.intelConfidence,
    missionSuccesses: report.resolvedCases.length,
    missionPartials: report.partialCases.length,
    missionFailures: report.failedCases.length,
    missionUnresolved: report.unresolvedTriggers.length,
    pressureScores: pressure.pressureScores,
    dominantPressureSource: pressure.dominantPressureSource,
    dominantFactor: pressure.dominantFactor,
    majorFailure: isMajorFailureWeek(state, pressure.pressureScores, {
      missionFailures: report.failedCases.length,
      missionUnresolved: report.unresolvedTriggers.length,
    }),
    gameOver: state.gameOver,
  } satisfies SimulationValidationWeekSnapshot
}

function buildSummary(
  scenario: InternalSimulationValidationScenario,
  weekly: SimulationValidationWeekSnapshot[]
): SimulationValidationSummary {
  const firstFailure = weekly.find((entry) => entry.majorFailure)
  const dominantPressureSource =
    weekly.length === 0
      ? 'stable'
      : firstFailure
        ? firstFailure.dominantPressureSource
        : Math.max(...Object.values(weekly.at(-1)!.pressureScores)) < 0.75
          ? 'stable'
          : weekly.at(-1)!.dominantPressureSource

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    weeksSimulated: weekly.length,
    endedByGameOver: weekly.at(-1)?.gameOver ?? false,
    weekOfFirstMajorFailure: firstFailure?.week ?? null,
    dominantPressureSource,
    dominantFactor: dominantPressureSource,
    unresolvedCaseCountTrend: weekly.map((entry) => entry.unresolvedCaseCount),
    attritionTrend: weekly.map((entry) => entry.attritionPressureCount),
    budgetPressureTrend: weekly.map((entry) => entry.budgetPressure),
    escalationTrend: weekly.map((entry) => entry.escalationBurden),
    intelConfidenceTrend: weekly.map((entry) => entry.intelConfidence),
    missionOutcomeCounts: weekly.reduce(
      (totals, entry) => ({
        success: totals.success + entry.missionSuccesses,
        partial: totals.partial + entry.missionPartials,
        fail: totals.fail + entry.missionFailures,
        unresolved: totals.unresolved + entry.missionUnresolved,
      }),
      { success: 0, partial: 0, fail: 0, unresolved: 0 }
    ),
  }
}

export function getSimulationValidationScenarios(): SimulationValidationScenarioDefinition[] {
  return INTERNAL_SCENARIOS.map(({ id, label, maxWeeks }) => ({
    id,
    label,
    maxWeeks,
  }))
}

export function formatSimulationValidationSummary(summary: SimulationValidationSummary) {
  return [
    `${summary.scenarioId} | firstFailure=${summary.weekOfFirstMajorFailure ?? 'none'} | dominant=${summary.dominantPressureSource} | weeks=${summary.weeksSimulated}`,
    `unresolved=[${summary.unresolvedCaseCountTrend.join(', ')}]`,
    `attrition=[${summary.attritionTrend.join(', ')}]`,
    `budget=[${summary.budgetPressureTrend.join(', ')}]`,
    `escalation=[${summary.escalationTrend.join(', ')}]`,
    `intel=[${summary.intelConfidenceTrend.join(', ')}]`,
    `missions=success:${summary.missionOutcomeCounts.success}, partial:${summary.missionOutcomeCounts.partial}, fail:${summary.missionOutcomeCounts.fail}, unresolved:${summary.missionOutcomeCounts.unresolved}`,
  ].join(' | ')
}

export function runSimulationValidationScenario(
  scenarioId: SimulationValidationScenarioId
): SimulationValidationRun {
  const scenario = getScenarioById(scenarioId)
  let state = createStartingState()

  state = normalizeGameState(scenario.setup?.(state) ?? state)
  const initialState = structuredClone(state)
  const weekly: SimulationValidationWeekSnapshot[] = []

  for (let weekIndex = 0; weekIndex < scenario.maxWeeks; weekIndex += 1) {
    state = normalizeGameState(scenario.beforeWeek?.(state, weekIndex) ?? state)
    state = applyDirectiveSelection(state, scenario, weekIndex)
    state = driveValidationAssignments(state)
    state = advanceWeek(state, VALIDATION_NOTE_BASE + weekIndex)

    weekly.push(captureWeeklySnapshot(state))

    if (state.gameOver) {
      break
    }
  }

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    initialState,
    finalState: state,
    weekly,
    summary: buildSummary(scenario, weekly),
  }
}

export function runSimulationValidationSuite() {
  return INTERNAL_SCENARIOS.map((scenario) => runSimulationValidationScenario(scenario.id))
}
