import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { Agent, CaseInstance, GameState } from '../domain/models'
import { buildMissionInjuryForecast } from '../domain/sim/injuryForecast'
import { previewResolutionForTeamIds } from '../domain/sim/resolve'

function getTeamAgents(state: GameState, teamId: string) {
  return state.teams[teamId]!.agentIds
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
}

function buildSurvivabilityStressCase(state: GameState): CaseInstance {
  return {
    ...state.cases['case-001']!,
    title: 'Glasshouse Breach',
    stage: 4,
    kind: 'case',
    assignedTeamIds: [],
    status: 'open',
    weeksRemaining: 1,
    deadlineRemaining: 2,
    tags: ['breach', 'hazmat', 'containment'],
    requiredTags: [],
    preferredTags: ['medical', 'containment', 'support'],
    weights: {
      combat: 0.6,
      investigation: 0.05,
      utility: 0.15,
      social: 0.2,
    },
    difficulty: {
      combat: 72,
      investigation: 24,
      utility: 40,
      social: 46,
    },
  }
}

describe('mission injury forecast', () => {
  it('warns when a formation has offense but weak survivability', () => {
    const state = createStartingState()
    const currentCase = buildSurvivabilityStressCase(state)
    const preview = previewResolutionForTeamIds(currentCase, state, ['t_nightwatch'])

    expect(preview.injuryForecast.injuryChance).toBeGreaterThan(0)
    expect(preview.injuryForecast.expectedDowntimeWeeks).toBeGreaterThan(0)
    expect(preview.injuryForecast.primaryWarning).toMatch(
      /survivability|casualty risk|failed week/i
    )
    expect(preview.injuryForecast.guidance).toMatch(/balanced formation|support operative|containment specialist/i)
    expect(preview.injuryForecast.reasons.join(' ')).toMatch(
      /stabilization|containment|mission failing|casualties/i
    )
  })

  it('gives the balanced team lower casualty exposure at the same success target', () => {
    const state = createStartingState()
    const currentCase = buildSurvivabilityStressCase(state)
    const fixedSuccessChance = 0.45

    const nightWatchPreview = previewResolutionForTeamIds(currentCase, state, ['t_nightwatch'])
    const greenTapePreview = previewResolutionForTeamIds(currentCase, state, ['t_greentape'])

    const nightWatchForecast = buildMissionInjuryForecast({
      currentCase,
      agents: getTeamAgents(state, 't_nightwatch'),
      successChance: fixedSuccessChance,
      performanceSummary: nightWatchPreview.performanceSummary,
    })
    const greenTapeForecast = buildMissionInjuryForecast({
      currentCase,
      agents: getTeamAgents(state, 't_greentape'),
      successChance: fixedSuccessChance,
      performanceSummary: greenTapePreview.performanceSummary,
    })

    expect(greenTapeForecast.injuryChance).toBeLessThan(nightWatchForecast.injuryChance)
    expect(greenTapeForecast.expectedDowntimeWeeks).toBeLessThan(
      nightWatchForecast.expectedDowntimeWeeks
    )
  })
})
