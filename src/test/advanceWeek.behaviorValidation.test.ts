import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStarterCase } from '../domain/templates/startingCases'

function createAuthorityReader(id: string) {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation: 55,
      utility: 40,
      social: 70,
    },
    tags: ['medium', 'liaison'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  } satisfies Agent
}

function createAuthorityTeam(id: string, agentId: string) {
  return {
    id,
    name: id,
    agentIds: [agentId],
    tags: [],
  } satisfies Team
}

function createAuthorityScrutinyCase(teamId: string): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-001',
      templateId: 'ops-004',
    }),
    mode: 'deterministic',
    status: 'in_progress',
    weeksRemaining: 1,
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    requiredTags: ['medium'],
    preferredTags: [],
    assignedTeamIds: [teamId],
  }
}

function tuneAuthoritySuccessCase(state: ReturnType<typeof createStartingState>, teamId: string) {
  const baseCase = createAuthorityScrutinyCase(teamId)

  for (let socialDifficulty = 8; socialDifficulty <= 140; socialDifficulty += 1) {
    const candidate: CaseInstance = {
      ...baseCase,
      difficulty: {
        combat: 0,
        investigation: 0,
        utility: 0,
        social: socialDifficulty,
      },
      weights: {
        combat: 0,
        investigation: 0,
        utility: 0,
        social: 1,
      },
    }
    const resolution = resolveAssignedCaseForWeek(candidate, state, () => 0.5)

    if (resolution.outcome.result === 'success' && resolution.behaviorValidation?.level === 'strong') {
      return candidate
    }
  }

  throw new Error('Unable to tune a strong authority-scrutiny success case.')
}

describe('advanceWeek behavior-weighted disguise validation', () => {
  it('reveals a hidden public disguise and downgrades the outcome under authority scrutiny', () => {
    const state = createStartingState()
    const authorityReader = createAuthorityReader('a_authority_reader')
    const authorityTeam = createAuthorityTeam('t_authority_reader', authorityReader.id)
    state.agents[authorityReader.id] = authorityReader
    state.teams[authorityTeam.id] = authorityTeam

    state.reports = []
    state.agency!.supportAvailable = 2

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-001'] = tuneAuthoritySuccessCase(state, authorityTeam.id)

    const preAdvanceResolution = resolveAssignedCaseForWeek(state.cases['case-001'], state, () => 0.5)
    expect(preAdvanceResolution.outcome.result).toBe('success')
    expect(preAdvanceResolution.behaviorValidation?.level).toBe('strong')
    expect(
      preAdvanceResolution.outcome.reasons.some((reason) => reason.includes('Behavior validation:'))
    ).toBe(true)

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const missionResult = lastReport.caseSnapshots?.['case-001']?.missionResult

    expect(missionResult?.outcome).toBe('partial')
    expect(missionResult?.hiddenState).toBe('revealed')
    expect(missionResult?.counterDetection).toBe(true)
    expect(missionResult?.detectionConfidence).toBe(1)
    expect(
      missionResult?.explanationNotes.some((note) => note.includes('Behavior validation:'))
    ).toBe(true)
    expect(
      missionResult?.explanationNotes.some((note) =>
        note.includes('Behavior mismatch triggered visible authority scrutiny')
      )
    ).toBe(true)
    expect(nextState.cases['case-001'].status).toBe('open')
  })
})
