import { createStartingState } from '../../data/startingState'
import { caseTemplateMap } from '../../data/caseTemplates'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  type InformationIntakeReportRecord,
} from '../../domain/informationIntakeReport'
import {
  applySuccessfulInvestigation,
  askInvestigationQuestion,
} from '../../domain/investigationEconomy'
import { resolveAssignedCaseForWeek } from '../../domain/caseResolutionOrchestration'
import { createInitialFundingState, normalizeFundingState } from '../../domain/funding'
import { triageMission, recomputeMissionRouting } from '../../domain/missionIntakeRouting'
import type { GameState, WeeklyReport } from '../../domain/models'
import { assignTeam } from '../../domain/sim/assign'
import { computeTeamScore } from '../../domain/sim/scoring'
import { createStarterCase } from '../../domain/templates/startingCases'
import { normalizeGameState } from '../../domain/teamSimulation'

export const MVP_LOOP_PROOF_CASE_ID = 'case-mvp-covert'
export const MVP_LOOP_PROOF_TEMPLATE_ID = 'ops-004'
export const MVP_LOOP_FORENSIC_QUESTION_ID = 'forensic.present-signature'
export const MVP_LOOP_INTAKE_TOPIC = 'topic:mvp-covert-incident'

export interface WeeklyMvpLoopProofFixture {
  readonly state: GameState
  readonly teamId: string
}

/** Deterministic starting state with covert case assigned and week-0 prep applied. */
export function createWeeklyMvpLoopProofFixture(): WeeklyMvpLoopProofFixture {
  const [teamId] = Object.keys(createStartingState().teams)
  const template = caseTemplateMap[MVP_LOOP_PROOF_TEMPLATE_ID]

  let state = createStartingState()
  state.reports = []
  state.events = []
  state.agency!.supportAvailable = 3
  state.globalFlags = {}

  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
  }

  for (const team of Object.values(state.teams)) {
    team.assignedCaseId = undefined
    if (team.status) {
      team.status = { ...team.status, assignedCaseId: null }
    }
  }

  const covertCase = createStarterCase({
    id: MVP_LOOP_PROOF_CASE_ID,
    templateId: MVP_LOOP_PROOF_TEMPLATE_ID,
    status: 'in_progress',
  })
  covertCase.mode = 'deterministic'
  covertCase.weeksRemaining = 2
  covertCase.requiredTags = []
  covertCase.preferredTags = []
  covertCase.stealthLeaveBehindId = template.stealthLeaveBehindId
  covertCase.infiltrationAwareness = 0.3
  covertCase.infiltrationProbeProgress = 0.2

  state.cases[MVP_LOOP_PROOF_CASE_ID] = covertCase
  state = assignTeam(state, MVP_LOOP_PROOF_CASE_ID, teamId)

  if (state.cases[MVP_LOOP_PROOF_CASE_ID]?.assignedTeamIds.length !== 1) {
    throw new Error('Expected covert case team assignment before weekly resolve')
  }

  state.globalFlags[`conceal.case.${MVP_LOOP_PROOF_CASE_ID}`] = true

  state = applySuccessfulInvestigation(state, {
    caseId: MVP_LOOP_PROOF_CASE_ID,
    forensicBudget: 1,
    tacticalBudget: 0,
  })

  const asked = askInvestigationQuestion(state, {
    caseId: MVP_LOOP_PROOF_CASE_ID,
    domain: 'forensic',
    questionId: MVP_LOOP_FORENSIC_QUESTION_ID,
  })
  if (!asked.applied) {
    throw new Error(`Expected forensic question prep to apply: ${asked.reason ?? 'unknown'}`)
  }

  return { state: asked.state, teamId }
}

/** Re-applies week-open prep flags after save/load (same as fixture week 0). */
export function applyWeeklyMvpLoopPrepFlags(state: GameState): GameState {
  return {
    ...state,
    globalFlags: {
      ...state.globalFlags,
      [`conceal.case.${MVP_LOOP_PROOF_CASE_ID}`]: true,
    },
  }
}

function buildMvpLoopIntakeReports(): Record<string, InformationIntakeReportRecord> {
  const topicRef = MVP_LOOP_INTAKE_TOPIC

  return {
    [FORMAL_ALERT_PARTIAL_FIXTURE.id]: {
      ...FORMAL_ALERT_PARTIAL_FIXTURE,
      topicRef,
    },
    [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: {
      ...PUBLIC_RUMOR_CONFLICT_FIXTURE,
      topicRef,
    },
  }
}

/**
 * Links mixed-source intake to the covert case topic and recomputes mission routing
 * for triage assertions (SPE-2309 slice 3).
 */
export function applyWeeklyMvpLoopIntakeAndTriage(state: GameState): GameState {
  const covertCase = state.cases[MVP_LOOP_PROOF_CASE_ID]
  if (!covertCase) {
    throw new Error('Expected covert MVP loop case before intake/triage wiring')
  }

  const taggedCovert = {
    ...covertCase,
    tags: [...new Set([...covertCase.tags, MVP_LOOP_INTAKE_TOPIC])],
    weeksRemaining: Math.max(covertCase.weeksRemaining ?? 0, 5),
  }

  const withCase: GameState = {
    ...state,
    agency: state.agency ? { ...state.agency, supportAvailable: 5 } : state.agency,
    cases: {
      ...state.cases,
      [MVP_LOOP_PROOF_CASE_ID]: taggedCovert,
    },
    informationIntakeReports: {
      ...state.informationIntakeReports,
      ...buildMvpLoopIntakeReports(),
    },
  }

  return {
    ...withCase,
    missionRouting: recomputeMissionRouting(withCase),
  }
}

/** Live triage scores for the same covert mission with and without linked intake (Claim 1). */
export function readWeeklyMvpLoopTriageScores(state: GameState) {
  const covertCase = state.cases[MVP_LOOP_PROOF_CASE_ID]
  if (!covertCase) {
    throw new Error('Expected covert MVP loop case for triage reads')
  }

  const withoutIntake = triageMission(
    { ...state, informationIntakeReports: {} },
    covertCase
  )
  const withIntake = triageMission(state, covertCase)

  return { withoutIntake, withIntake }
}

/** Latest mission snapshot for the covert MVP case (report-order agnostic). */
export function readWeeklyMvpLoopCovertMissionResult(state: GameState) {
  for (let index = state.reports.length - 1; index >= 0; index -= 1) {
    const snapshot = state.reports[index]?.caseSnapshots?.[MVP_LOOP_PROOF_CASE_ID]?.missionResult
    if (snapshot) {
      return snapshot
    }
  }
  return undefined
}

/** Collects report notes by type across all weeks (stable for carryover assertions). */
export function collectWeeklyMvpLoopReportNotesByType(
  reports: readonly WeeklyReport[],
  noteType: string
) {
  return reports.flatMap(
    (report) => report.notes?.filter((note) => note.type === noteType) ?? []
  )
}

/**
 * Calibrates the covert case to resolve this week in the partial band (Claim 3).
 * Preserves assignment and prep flags from the base fixture.
 */
export function tuneWeeklyMvpLoopCovertForPartialBand(
  state: GameState,
  teamId: string
): GameState {
  const team = state.teams[teamId]
  const covertCase = state.cases[MVP_LOOP_PROOF_CASE_ID]
  if (!team || !covertCase) {
    throw new Error('Expected covert MVP loop case and team before partial-band tuning')
  }

  const memberAgents = team.agentIds.map((agentId) => state.agents[agentId]!).filter(Boolean)
  const thresholdCase = {
    ...covertCase,
    mode: 'threshold' as const,
    status: 'in_progress' as const,
    weeksRemaining: 1,
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    difficulty: { combat: 200, investigation: 0, utility: 0, social: 0 },
    requiredTags: [],
    preferredTags: [],
  }

  const calibratedPartialScore = computeTeamScore(memberAgents, thresholdCase)
  const tunedCase = {
    ...thresholdCase,
    difficulty: {
      combat: Math.ceil(calibratedPartialScore.score + 1),
      investigation: 0,
      utility: 0,
      social: 0,
    },
  }

  const preflight = resolveAssignedCaseForWeek(tunedCase, state, () => 0.5)
  if (preflight.outcome.result !== 'partial') {
    throw new Error(
      `Expected partial-band preflight for covert case, got ${preflight.outcome.result}`
    )
  }

  return {
    ...state,
    config: { ...state.config, partialMargin: 20_000 },
    cases: {
      ...state.cases,
      [MVP_LOOP_PROOF_CASE_ID]: tunedCase,
    },
  }
}

/**
 * Applies institutional pressure + recovery carryover inputs (Claim 4).
 * Pair with partial-band tuning and advanceWeek; reuses funding/support patterns from integration tests.
 */
export function applyWeeklyMvpLoopInstitutionalPressure(
  state: GameState,
  teamId: string
): GameState {
  const team = state.teams[teamId]
  if (!team) {
    throw new Error('Expected MVP loop team before institutional pressure wiring')
  }

  const recoveringAgentId = team.agentIds.find((agentId) => {
    const agent = state.agents[agentId]
    return agent && agent.status === 'active'
  })
  if (!recoveringAgentId) {
    throw new Error('Expected an active operative for recovery carryover wiring')
  }

  const campaignWeek = Math.max(8, state.week)
  const funding = state.funding
  const baseFundingState = createInitialFundingState(
    state.config.fundingBasePerWeek,
    state.config.fundingPerResolution,
    state.config.fundingPenaltyPerFail,
    state.config.fundingPenaltyPerUnresolved,
    funding
  )
  const fundingState = normalizeFundingState(
    funding,
    state.config,
    {
      ...baseFundingState,
      funding,
      procurementBacklog: [
        {
          requestId: 'mvp-loop-stale-procurement',
          itemId: 'medkits',
          quantity: 1,
          status: 'pending' as const,
          requestedWeek: Math.max(1, campaignWeek - 6),
          cost: 5,
        },
      ],
      fundingHistory: Array.from({ length: 4 }, (_, index) => ({
        week: Math.max(1, campaignWeek - index),
        delta: -6,
        reason: index % 2 === 0 ? ('failure_penalty' as const) : ('unresolved_penalty' as const),
        sourceId: `mvp-loop-penalty-${index + 1}`,
      })),
    },
    campaignWeek
  )

  const pressured = normalizeGameState({
    ...state,
    week: campaignWeek,
    agency: {
      ...(state.agency ?? {
        containmentRating: state.containmentRating,
        clearanceLevel: state.clearanceLevel,
        funding,
      }),
      supportAvailable: 0,
      funding,
      fundingState,
    },
    agents: {
      ...state.agents,
      [recoveringAgentId]: {
        ...state.agents[recoveringAgentId]!,
        status: 'recovering',
        assignment: {
          state: 'recovery',
          startedWeek: campaignWeek - 1,
          teamId,
        },
        recoveryStatus: { state: 'recovering', sinceWeek: campaignWeek - 1 },
        fatigue: 28,
        trauma: {
          traumaLevel: 1,
          traumaTags: ['mvp-loop-pressure'],
          lastEventWeek: campaignWeek - 1,
        },
      },
    },
  })

  const triage = triageMission(pressured, pressured.cases[MVP_LOOP_PROOF_CASE_ID]!)
  if (!triage.reasonCodes.includes('budget-pressure-high')) {
    throw new Error('Expected budget-pressure-high on covert triage under institutional pressure')
  }

  return pressured
}
