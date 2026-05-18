import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import { applyConcealmentActivationToCase } from '../domain/hiddenStateActivation'
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
  it('activates behavior validation after tag-driven concealment activation', () => {
    const observer = createBehaviorObserver('a_behavior_reader', ['liaison'], 55)
    const hiddenCase = applyConcealmentActivationToCase(
      createHiddenBriefingCase({
        hiddenState: undefined,
        detectionConfidence: undefined,
        counterDetection: undefined,
        tags: ['infiltration', 'public'],
      }),
      { globalFlags: {} }
    )

    expect(hiddenCase.hiddenState).toBe('hidden')
    const result = evaluateBehaviorWeightedDisguiseValidation(hiddenCase, [observer])
    expect(result.active).toBe(true)
    expect(result.level).not.toBe('none')
  })

  it('applies cover-role scrutiny through live case resolution orchestration', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_ops004_orchestration', ['liaison'], 30)
    const team = createObserverTeam('t_ops004_orchestration', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const baseCase = createHiddenBriefingCase({
      tags: ['infiltration', 'media', 'public'],
      infiltrationAwareness: 0.6,
      infiltrationStage: 'probing',
      assignedTeamIds: [team.id],
      infiltrationCoverProfile: {
        claimedRole: 'uniform_guard',
        documentTier: 2,
        doctrineBand: 0.4,
      },
    })

    const mismatched = resolveAssignedCaseForWeek(baseCase, state, () => 0.5)
    const compatible = resolveAssignedCaseForWeek(
      {
        ...baseCase,
        infiltrationCoverProfile: {
          claimedRole: 'official_inspector',
          documentTier: 2,
          doctrineBand: 0.4,
        },
      },
      state,
      () => 0.5
    )

    expect(mismatched.behaviorValidation?.level).toBe('strong')
    expect(mismatched.behaviorValidation?.evidenceSignals).toContain('cover role mismatch')
    expect(
      mismatched.outcome.reasons.some((reason) => reason.includes('cover role mismatch'))
    ).toBe(true)
    expect(compatible.behaviorValidation?.level).toBe('meaningful')
    expect(compatible.behaviorValidation?.evidenceSignals).not.toContain('cover role mismatch')
  })

  it('escalates validation when claimed cover role clashes with authority scrutiny', () => {
    const observer = createBehaviorObserver('a_role_scrutiny', ['liaison'], 30)
    const hiddenCase = createHiddenBriefingCase({
      tags: ['infiltration', 'media', 'public'],
      infiltrationAwareness: 0.6,
      infiltrationCoverProfile: {
        claimedRole: 'uniform_guard',
        documentTier: 2,
      },
    })

    const mismatched = evaluateBehaviorWeightedDisguiseValidation(hiddenCase, [observer])
    const compatible = evaluateBehaviorWeightedDisguiseValidation(
      {
        ...hiddenCase,
        infiltrationCoverProfile: {
          claimedRole: 'official_inspector',
          documentTier: 2,
        },
      },
      [observer]
    )

    expect(mismatched.active).toBe(true)
    expect(mismatched.level).toBe('strong')
    expect(mismatched.evidenceSignals).toContain('cover role mismatch')
    expect(compatible.active).toBe(true)
    expect(compatible.level).toBe('meaningful')
    expect(compatible.evidenceSignals).not.toContain('cover role mismatch')
  })

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
