import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import type { Agent, CaseInstance, GameState, Team } from '../domain/models'
import { previewResolutionForTeamIds } from '../domain/sim/resolve'
import { createStarterCase } from '../domain/templates/startingCases'

function createBehaviorObserver(id: string, tags: string[], social: number) {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation: 50,
      utility: 40,
      social,
    },
    tags: ['medium', ...tags],
    relationships: {},
    fatigue: 0,
    status: 'active',
  } satisfies Agent
}

function createObserverTeam(id: string, agentId: string) {
  return {
    id,
    name: id,
    agentIds: [agentId],
    tags: [],
  } satisfies Team
}

function createHiddenBriefingCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-behavior',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    requiredTags: ['medium'],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

function tuneBehaviorGateCase(
  state: GameState,
  hiddenCase: CaseInstance,
  teamId: string
): CaseInstance {
  for (let socialDifficulty = 8; socialDifficulty <= 120; socialDifficulty += 1) {
    const candidate: CaseInstance = {
      ...hiddenCase,
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
    const hiddenPreview = previewResolutionForTeamIds(candidate, state, [teamId])
    const visiblePreview = previewResolutionForTeamIds(
      {
        ...candidate,
        hiddenState: undefined,
        detectionConfidence: undefined,
        counterDetection: undefined,
      },
      state,
      [teamId]
    )

    if (hiddenPreview.odds.success === 1 && visiblePreview.odds.success === 0) {
      return candidate
    }
  }

  throw new Error('Unable to tune a hidden behavior-validation threshold case.')
}

describe('behavior-weighted disguise validation', () => {
  it('stays inactive on hidden cases without behavior-scrutiny context', () => {
    const state = createStartingState()
    const observer = state.agents.a_mina
    const hiddenCase: CaseInstance = {
      ...state.cases['case-001'],
      hiddenState: 'hidden',
      detectionConfidence: 0.2,
      counterDetection: false,
    }

    const result = evaluateBehaviorWeightedDisguiseValidation(hiddenCase, [observer])

    expect(result.active).toBe(false)
    expect(result.level).toBe('none')
    expect(result.scoreAdjustment).toBe(0)
    expect(result.counterDetection).toBe(false)
  })

  it('uses the same behavior gate in preview and live threshold resolution', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_behavior_reader', ['liaison'], 30)
    const team = createObserverTeam('t_behavior_reader', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const hiddenCase = tuneBehaviorGateCase(
      state,
      createHiddenBriefingCase(),
      team.id
    )
    const hiddenPreview = previewResolutionForTeamIds(hiddenCase, state, [team.id])
    const visiblePreview = previewResolutionForTeamIds(
      {
        ...hiddenCase,
        hiddenState: undefined,
        detectionConfidence: undefined,
        counterDetection: undefined,
      },
      state,
      [team.id]
    )
    const live = resolveAssignedCaseForWeek(
      {
        ...hiddenCase,
        assignedTeamIds: [team.id],
      },
      state,
      () => 0.5
    )

    expect(hiddenPreview.odds.success).toBe(1)
    expect(visiblePreview.odds.success).toBe(0)
    expect(live.outcome.result).toBe('success')
    expect(live.behaviorValidation?.level).toBe('meaningful')
    expect(live.behaviorValidation?.scoreAdjustment).toBeGreaterThan(0)
    expect(live.outcome.reasons.some((reason) => reason.includes('Behavior validation:'))).toBe(
      true
    )
  })
})
