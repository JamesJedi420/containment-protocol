import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildTeamCohesionSummary,
  buildTeamCompositionState,
  buildTeamWeakestLinkSummary,
  rankBestAvailableTeams,
  validateTeamComposition,
} from '../domain/teamComposition'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import type { TeamCompositionState } from '../domain/models'

describe('team composition and cohesion rules', () => {
  it('returns deterministic structured validation with explicit coverage buckets', () => {
    const state = createStartingState()
    const team = state.teams.t_nightwatch

    const first = validateTeamComposition(team, state.agents, state.teams)
    const second = validateTeamComposition(team, state.agents, state.teams)

    expect(second).toEqual(first)
    expect(first.requiredRoles).toEqual(['containment', 'investigator', 'support', 'tactical'])
    expect(first.coveredRoles).toEqual(expect.arrayContaining(['containment', 'investigator', 'tactical']))
    expect(Array.isArray(first.issues)).toBe(true)
  })

  it('flags stale restored member references and invalid leader state', () => {
    const state = createStartingState()
    const brokenTeam = {
      ...state.teams.t_nightwatch,
      memberIds: [...(state.teams.t_nightwatch.memberIds ?? []), 'missing-agent-id'],
      agentIds: [...(state.teams.t_nightwatch.agentIds ?? []), 'missing-agent-id'],
      leaderId: 'missing-agent-id',
    }

    const validation = validateTeamComposition(brokenTeam, state.agents, state.teams)

    expect(validation.valid).toBe(false)
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['stale-member-reference', 'invalid-leader'])
    )
  })

  it('derives bounded deterministic cohesion summaries with explicit bands', () => {
    const state = createStartingState()
    const team = state.teams.t_nightwatch

    const summary = buildTeamCohesionSummary(team, state.agents)

    expect(summary.cohesionScore).toBeGreaterThanOrEqual(0)
    expect(summary.cohesionScore).toBeLessThanOrEqual(100)
    expect(summary.fatiguePenalty).toBeGreaterThanOrEqual(0)
    expect(summary.fatiguePenalty).toBeLessThanOrEqual(50)
    expect(['fragile', 'unstable', 'steady', 'strong']).toContain(summary.cohesionBand)
  })

  it('surfaces weakest-link penalties explicitly', () => {
    const state = createStartingState()
    const weakTeam = {
      ...state.teams.t_nightwatch,
      memberIds: ['a_ava'],
      agentIds: ['a_ava'],
      leaderId: 'a_ava',
    }

    const weakest = buildTeamWeakestLinkSummary(weakTeam, state.agents)

    expect(weakest.totalPenalty).toBeGreaterThan(0)
    expect(weakest.penalties.map((penalty) => penalty.code)).toContain('missing-coverage')
  })

  it('ranks best available teams deterministically with required tie-breakers', () => {
    const state = createStartingState()
    const ranked = rankBestAvailableTeams(Object.values(state.teams), state.agents, state.teams)

    expect(ranked.length).toBeGreaterThan(0)

    for (let index = 1; index < ranked.length; index += 1) {
      const left = ranked[index - 1]!
      const right = ranked[index]!
      const leftCompleteness = left.validation.requiredRoles.length - left.validation.missingRoles.length
      const rightCompleteness = right.validation.requiredRoles.length - right.validation.missingRoles.length

      expect(
        leftCompleteness > rightCompleteness ||
          (leftCompleteness === rightCompleteness &&
            (left.cohesion.cohesionScore > right.cohesion.cohesionScore ||
              (left.cohesion.cohesionScore === right.cohesion.cohesionScore &&
                (left.fatigueBurden < right.fatigueBurden ||
                  (left.fatigueBurden === right.fatigueBurden && left.teamId <= right.teamId)))))
      ).toBe(true)
    }
  })

  it('persists normalized composition/cohesion state through save-load', () => {
    const state = createStartingState()
    const composition = buildTeamCompositionState(state.teams.t_nightwatch, state.agents, state.teams)
    const withComposition = {
      ...state,
      teams: {
        ...state.teams,
        t_nightwatch: {
          ...state.teams.t_nightwatch,
          compositionState: composition,
        },
      },
    }

    const roundTripped = loadGameSave(serializeGameSave(withComposition))
    const compositionState = roundTripped.teams.t_nightwatch.compositionState as
      | TeamCompositionState
      | undefined

    expect(compositionState?.cohesion.cohesionScore).toBeGreaterThanOrEqual(0)
    expect(compositionState?.requiredCoverageRoles).toEqual(
      expect.arrayContaining(['containment', 'investigator', 'support', 'tactical'])
    )
  })

  it('surfaces missing and protected niches in the composition state', () => {
    const state = createStartingState()
    const composition = buildTeamCompositionState(state.teams.t_nightwatch, state.agents, state.teams)

    expect(composition.nicheSummary?.protectedNiches).toEqual(['containment'])
    expect(composition.nicheSummary?.substituteNiches).toEqual(
      expect.arrayContaining(['recon', 'support'])
    )
    expect(composition.nicheSummary?.summaryLines.join(' ')).toMatch(/support.*substitutes/i)
  })
})
