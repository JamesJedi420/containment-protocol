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
import { triageMission, recomputeMissionRouting } from '../../domain/missionIntakeRouting'
import type { GameState } from '../../domain/models'
import { assignTeam } from '../../domain/sim/assign'
import { createStarterCase } from '../../domain/templates/startingCases'

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
