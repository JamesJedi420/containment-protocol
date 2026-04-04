import { describe, expect, it } from 'vitest'
// cspell:words sato
import { trainingCatalog } from '../data/training'
import { buildAcademyOverview, previewTrainingImpact } from '../domain/academy'
import { getAgentStatCap } from '../domain/agentPotential'
import { assignTeam } from '../domain/sim/assign'
import { queueTraining, TRAINING_FATIGUE_GATE } from '../domain/sim/training'
import { createFixtureState } from './storeFixtures'

const combatDrills = trainingCatalog.find((p) => p.trainingId === 'combat-drills')
const coordinationDrill = trainingCatalog.find((p) => p.trainingId === 'coordination-drill')

if (!combatDrills) throw new Error('Missing combat-drills in catalog.')
if (!coordinationDrill) throw new Error('Missing coordination-drill in catalog.')

describe('academy', () => {
  describe('previewTrainingImpact stat ceiling', () => {
    it('returns scoreDelta <= 0 when the target stat is already at the agent ceiling', () => {
      const state = createFixtureState()
      const targetCap = getAgentStatCap(state.agents.a_sato, 'combat')
      const agent = {
        ...state.agents.a_sato,
        baseStats: { ...state.agents.a_sato.baseStats, combat: targetCap },
      }

      const preview = previewTrainingImpact(agent, combatDrills)

      // No stat gain possible — only the fatigue cost contributes (score should not increase)
      expect(preview.scoreDelta).toBeLessThanOrEqual(0)
    })

    it('returns a lower scoreDelta for a near-ceiling agent than an unconstrained one', () => {
      const state = createFixtureState()
      const agent = state.agents.a_sato
      const targetCap = getAgentStatCap(agent, 'combat')

      // Near-ceiling: gains only a sliver of effective space before the personal cap.
      const nearCeilingAgent = {
        ...agent,
        baseStats: { ...agent.baseStats, combat: Math.max(0, targetCap - 1) },
      }
      // Baseline: gains the full statDelta (starts well below ceiling)
      const baselineAgent = {
        ...agent,
        baseStats: {
          ...agent.baseStats,
          combat: Math.max(0, targetCap - combatDrills.statDelta - 10),
        },
      }

      const nearCeilingPreview = previewTrainingImpact(nearCeilingAgent, combatDrills)
      const baselinePreview = previewTrainingImpact(baselineAgent, combatDrills)

      // Near-ceiling agent gains less from the same program
      expect(baselinePreview.scoreDelta).toBeGreaterThan(nearCeilingPreview.scoreDelta)
    })
  })

  describe('buildAcademyOverview team drill suggestions', () => {
    it('populates suggestedTeamDrills with ready teams', () => {
      const state = createFixtureState()

      const overview = buildAcademyOverview(state)

      // Starting state has Night Watch (4 members, ready)
      expect(overview.suggestedTeamDrills.length).toBeGreaterThan(0)
      const nightwatchSuggestion = overview.suggestedTeamDrills.find(
        (s) => s.teamId === 't_nightwatch'
      )

      expect(nightwatchSuggestion).toBeDefined()
      expect(nightwatchSuggestion!.trainingId).toBeTruthy()
      expect(nightwatchSuggestion!.avgScoreDelta).toBeGreaterThanOrEqual(0)
      expect(nightwatchSuggestion!.projectedScoreAfter).toBeGreaterThanOrEqual(
        nightwatchSuggestion!.projectedScoreBefore
      )
      expect(typeof nightwatchSuggestion!.projectedSynergyDelta).toBe('number')
      expect(nightwatchSuggestion!.recommendationReason.length).toBeGreaterThan(0)
      expect(nightwatchSuggestion!.projectionCaseTitle.length).toBeGreaterThan(0)
      expect(nightwatchSuggestion!.fundingCost).toBeGreaterThan(0)
      expect(typeof nightwatchSuggestion!.affordable).toBe('boolean')
    })

    it('still suggests a team drill when only one member is in training (partial-team support)', () => {
      // Phase 6: the academy now only excludes teams with < 2 eligible members,
      // so 1 busy + 3 free should still surface a suggestion.
      const nightwatch = createFixtureState().teams['t_nightwatch']
      const firstMemberId = (nightwatch?.memberIds ?? nightwatch?.agentIds ?? [])[0]

      if (!firstMemberId) throw new Error('Night Watch has no members in starting state')

      const state = queueTraining(createFixtureState(), firstMemberId, 'combat-drills')

      const overview = buildAcademyOverview(state)

      const nightwatchSuggestion = overview.suggestedTeamDrills.find(
        (s) => s.teamId === 't_nightwatch'
      )

      expect(nightwatchSuggestion).toBeDefined()
    })

    it('excludes teams with fewer than 2 eligible members from suggestedTeamDrills', () => {
      // Block 3 of 4 Night Watch members — only 1 remains, below the minimum of 2.
      const nightwatch = createFixtureState().teams['t_nightwatch']
      const memberIds = nightwatch?.memberIds ?? nightwatch?.agentIds ?? []

      if (memberIds.length < 4) throw new Error('Expected 4 Night Watch members')

      const s1 = queueTraining(createFixtureState(), memberIds[0]!, 'combat-drills')
      const s2 = queueTraining(s1, memberIds[1]!, 'combat-drills')
      const s3 = queueTraining(s2, memberIds[2]!, 'combat-drills')

      const overview = buildAcademyOverview(s3)

      const nightwatchSuggestion = overview.suggestedTeamDrills.find(
        (s) => s.teamId === 't_nightwatch'
      )

      expect(nightwatchSuggestion).toBeUndefined()
    })

    it('excludes deployed teams from suggestedTeamDrills', () => {
      const state = assignTeam(createFixtureState(), 'case-001', 't_nightwatch')

      const overview = buildAcademyOverview(state)

      const nightwatchSuggestion = overview.suggestedTeamDrills.find(
        (s) => s.teamId === 't_nightwatch'
      )

      expect(nightwatchSuggestion).toBeUndefined()
    })

    it('returns at most 3 team drill suggestions', () => {
      const state = createFixtureState()

      const overview = buildAcademyOverview(state)

      expect(overview.suggestedTeamDrills.length).toBeLessThanOrEqual(3)
    })

    it('marks suggestions as unaffordable when funding is insufficient', () => {
      const state = { ...createFixtureState(), funding: 0 }

      const overview = buildAcademyOverview(state)

      for (const suggestion of overview.suggestedTeamDrills) {
        expect(suggestion.affordable).toBe(false)
      }
    })

    it('excludes teams where all members are above the fatigue gate from suggestedTeamDrills', () => {
      const state = createFixtureState()
      const tiredAgents = Object.fromEntries(
        Object.entries(state.agents).map(([id, agent]) => [
          id,
          { ...agent, fatigue: TRAINING_FATIGUE_GATE },
        ])
      )

      const overview = buildAcademyOverview({ ...state, agents: tiredAgents })

      expect(overview.suggestedTeamDrills).toHaveLength(0)
    })

    it('still suggests team drills for members whose targetStat is maxed (chemistry-only gate)', () => {
      const state = createFixtureState()
      // Max out utility for every agent — team utility drills should still be suggested
      // because team drills build chemistry and bonds regardless of stat ceiling.
      const maxedAgents = Object.fromEntries(
        Object.entries(state.agents).map(([id, agent]) => [
          id,
          {
            ...agent,
            baseStats: { ...agent.baseStats, utility: getAgentStatCap(agent, 'utility') },
          },
        ])
      )
      const maxedState = { ...state, agents: maxedAgents }

      const overview = buildAcademyOverview(maxedState)

      // A team with eligible members should still receive a drill suggestion
      const nightwatchSuggestion = overview.suggestedTeamDrills.find(
        (s) => s.teamId === 't_nightwatch'
      )
      expect(nightwatchSuggestion).toBeDefined()
    })
  })

  it('excludes agents at or above TRAINING_FATIGUE_GATE from suggestions', () => {
    const state = createFixtureState()
    // Exhaust all idle agents beyond the gate
    const tiredAgents = Object.fromEntries(
      Object.entries(state.agents).map(([id, agent]) => [
        id,
        agent.assignment?.state === 'idle' ? { ...agent, fatigue: TRAINING_FATIGUE_GATE } : agent,
      ])
    )
    const tiredState = { ...state, agents: tiredAgents }

    const overview = buildAcademyOverview(tiredState)

    expect(overview.suggestedPrograms).toHaveLength(0)
  })
})

describe('previewTrainingImpact instructor and recoveryBonus', () => {
  it('includes instructor bonus in scoreDelta when instructorBonus is passed', () => {
    const state = createFixtureState()
    const agent = state.agents.a_sato

    const basePreview = previewTrainingImpact(agent, combatDrills!, 0, 0)
    const boostedPreview = previewTrainingImpact(agent, combatDrills!, 0, 1)

    expect(boostedPreview.scoreDelta).toBeGreaterThan(basePreview.scoreDelta)
  })

  it('exposes recoveryBonus from programs that grant it', () => {
    const enduranceProtocol = trainingCatalog.find((p) => p.trainingId === 'endurance-protocol')
    if (!enduranceProtocol) throw new Error('Missing endurance-protocol')

    const preview = previewTrainingImpact(createFixtureState().agents.a_sato, enduranceProtocol)

    expect(preview.recoveryBonus).toBeGreaterThan(0)
  })

  it('recoveryBonus is undefined for programs that do not grant it', () => {
    const preview = previewTrainingImpact(createFixtureState().agents.a_sato, combatDrills!)

    expect(preview.recoveryBonus).toBeUndefined()
  })

  it('exposes direct stability deltas for psych-conditioning', () => {
    const psychConditioning = trainingCatalog.find((p) => p.trainingId === 'psych-conditioning')
    if (!psychConditioning) throw new Error('Missing psych-conditioning')

    const preview = previewTrainingImpact(createFixtureState().agents.a_sato, psychConditioning)

    expect(preview.stabilityResistanceDelta).toBeGreaterThan(0)
    expect(preview.stabilityToleranceDelta).toBeGreaterThan(0)
  })
})
