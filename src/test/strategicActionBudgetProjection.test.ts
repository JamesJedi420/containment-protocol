import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { CONSTRUCTION_INCOMPLETE_FLAG } from '../domain/constructionProgress'
import type { GameState } from '../domain/models'
import { assignTeam } from '../domain/sim/assign'
import { projectStrategicActionBudget } from '../domain/strategicActionBudgetProjection'
import { normalizeGameState } from '../domain/teamSimulation'

function withSupportBudget(game: GameState, supportAvailable: number): GameState {
  return normalizeGameState({
    ...game,
    agency: {
      ...game.agency!,
      supportAvailable,
    },
  })
}

function withInProgressDeployments(
  game: GameState,
  caseIds: string[],
  overrides: Partial<Record<string, Partial<GameState['cases'][string]>>> = {}
): GameState {
  let state = normalizeGameState({ ...game })
  const teamIds = Object.keys(state.teams)

  caseIds.forEach((caseId, index) => {
    const teamId = teamIds[index % teamIds.length]
    if (!teamId) {
      throw new Error('Expected at least one team for deployment fixture.')
    }

    state = assignTeam(state, caseId, teamId)
    state = normalizeGameState({
      ...state,
      cases: {
        ...state.cases,
        [caseId]: {
          ...state.cases[caseId]!,
          status: 'in_progress',
          weeksRemaining: 1,
          ...overrides[caseId],
        },
      },
    })
  })

  return state
}

describe('projectStrategicActionBudget', () => {
  it('reports clear budget when support pool covers committed deployments', () => {
    const projection = projectStrategicActionBudget(createStartingState())

    expect(projection.configured).toBe(true)
    expect(projection.constrained).toBe(false)
    expect(projection.committedDemand).toBe(0)
  })

  it('reports constrained budget when deployments exceed support pool', () => {
    const game = withInProgressDeployments(withSupportBudget(createStartingState(), 1), [
      'case-001',
      'case-002',
    ])
    const projection = projectStrategicActionBudget(game)

    expect(projection.constrained).toBe(true)
    expect(projection.deficit).toBe(1)
    expect(projection.totalBudget).toBe(1)
    expect(projection.committedDemand).toBe(2)
  })

  it('hides constraint semantics when support capacity is not configured', () => {
    const game = withInProgressDeployments(createStartingState(), ['case-001', 'case-002'])
    delete game.agency!.supportAvailable

    const projection = projectStrategicActionBudget(game)

    expect(projection.configured).toBe(false)
    expect(projection.constrained).toBe(false)
  })

  it('ranks the highest-scoring pressure lane with a stable id tie-break', () => {
    const base = withSupportBudget(createStartingState(), 0)
    const investigationGame = withInProgressDeployments(base, ['case-001'], {
      'case-001': { tags: ['intel', 'evidence'] },
    })
    const explorationGame = withInProgressDeployments(base, ['case-002'], {
      'case-002': { tags: ['recon', 'survey'] },
    })

    const tiedGame = withInProgressDeployments(base, ['case-001', 'case-002'], {
      'case-001': { tags: ['intel', 'evidence'] },
      'case-002': { tags: ['recon', 'survey'] },
    })

    expect(projectStrategicActionBudget(investigationGame).leadLane?.id).toBe('investigation')
    expect(projectStrategicActionBudget(explorationGame).leadLane?.id).toBe('exploration')
    expect(projectStrategicActionBudget(tiedGame).leadLane?.id).toBe('exploration')
  })

  it('classifies raid deployments as site-incursion lanes', () => {
    const game = withInProgressDeployments(withSupportBudget(createStartingState(), 0), ['case-001'], {
      'case-001': { kind: 'raid', tags: ['occult'] },
    })

    expect(projectStrategicActionBudget(game).leadLane).toEqual({
      id: 'site-incursion',
      label: 'Site incursion',
      score: 1,
    })
  })

  it('classifies construction-flagged deployments as construction lanes', () => {
    const game = withInProgressDeployments(withSupportBudget(createStartingState(), 0), ['case-001'], {
      'case-001': {
        spatialFlags: [CONSTRUCTION_INCOMPLETE_FLAG],
      },
    })

    expect(projectStrategicActionBudget(game).leadLane?.id).toBe('construction')
  })
})
