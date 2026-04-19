import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildAgencyOverview,
  buildAgencyRanking,
  buildEncounterGenerationView,
  buildEncounterStructureState,
  buildEndgameScalingState,
  buildFactionStates,
  buildMajorIncidentState,
  formatCadenceSummary,
  formatDifficultyPressureSummary,
  formatEndgameThresholdSummary,
} from '../domain/strategicState'

describe('strategicState', () => {
  it('builds deterministic encounter generation pressure from open cases', () => {
    const game = createStartingState()
    const view = buildEncounterGenerationView(game)

    expect(view.openSlots).toBe(game.config.maxActiveCases - Object.keys(game.cases).length)
    expect(view.pressureTags.some((entry) => entry.tag === 'cult')).toBe(true)
    expect(view.likelyFollowUps.map((entry) => entry.templateId)).toContain(
      'followup_missing_persons'
    )
    expect(view.likelyRaidConversions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caseId: 'case-001',
          trigger: 'unresolved',
        }),
      ])
    )
  })

  it('tracks major incident pressure and faction pressure deterministically', () => {
    const game = createStartingState()
    game.cases['case-003'] = {
      ...game.cases['case-003'],
      stage: 4,
      deadlineRemaining: 1,
    }
    game.reports = [
      {
        week: 1,
        rngStateBefore: 10,
        rngStateAfter: 11,
        newCases: [],
        progressedCases: ['case-003'],
        resolvedCases: [],
        failedCases: ['case-002'],
        partialCases: [],
        unresolvedTriggers: ['case-001'],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 12,
        teamStatus: [],
        notes: [],
      },
    ]

    const firstIncidentState = buildMajorIncidentState(game)
    const secondIncidentState = buildMajorIncidentState(game)
    const factions = buildFactionStates(game)

    expect(firstIncidentState).toEqual(secondIncidentState)
    expect(firstIncidentState.incidents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caseId: 'case-003',
          archetypeLabel: 'Coordinated cult operation',
          currentStageLabel: expect.any(String),
          modifiers: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
            }),
          ]),
          progression: expect.arrayContaining([
            expect.objectContaining({
              index: expect.any(Number),
              status: expect.any(String),
            }),
          ]),
        }),
      ])
    )
    expect(firstIncidentState.pressureScore).toBeGreaterThan(0)
    expect(factions[0]!.pressureScore).toBeGreaterThanOrEqual(factions[1]!.pressureScore)
    expect(factions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'occult_networks',
          standing: expect.any(Number),
          matchingCases: expect.any(Number),
          influenceModifiers: expect.objectContaining({
            rewardModifier: expect.any(Number),
          }),
        }),
      ])
    )
  })

  it('builds agency ranking and overview from the same deterministic source state', () => {
    const game = createStartingState()
    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: ['case-001'],
        progressedCases: ['case-001'],
        resolvedCases: ['case-002'],
        failedCases: [],
        partialCases: ['case-003'],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 3,
        avgFatigue: 8,
        teamStatus: [],
        notes: [],
      },
    ]

    const ranking = buildAgencyRanking(game)
    const overview = buildAgencyOverview(game)

    expect(overview.ranking).toEqual(ranking)
    expect(overview.summary.ranking).toEqual({
      score: ranking.score,
      tier: ranking.tier,
    })
    expect(overview.academy.readyAgents).toBeGreaterThanOrEqual(0)
    expect(overview.logistics.featuredRecipeId).toBe(game.market.featuredRecipeId)
    expect(overview.encounters.openSlots).toBeGreaterThanOrEqual(0)
    expect(overview.factions.length).toBeGreaterThan(0)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(ranking.tier)
    expect(ranking.score).toBeGreaterThanOrEqual(0)
  })

  it('builds encounter structure from case origins, types, and escalation chains', () => {
    const game = createStartingState()
    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: ['case-001'],
        resolvedCases: [],
        failedCases: ['case-003'],
        partialCases: [],
        unresolvedTriggers: ['case-001'],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 10,
        teamStatus: [],
        notes: [],
      },
    ]

    const structure = buildEncounterStructureState(game)

    expect(structure.totalOpenCases).toBeGreaterThan(0)
    expect(structure.types).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          encounterType: 'cryptid_sighting',
          count: expect.any(Number),
        }),
      ])
    )
    expect(structure.origins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Baseline world activity',
        }),
      ])
    )
    expect(structure.urgentEscalations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caseId: 'case-001',
          nextStage: expect.any(Number),
          followUpCount: expect.any(Number),
        }),
      ])
    )
  })

  it('builds endgame scaling from major incident pressure, team requirements, and thresholds', () => {
    const game = createStartingState()
    game.cases['case-003'] = {
      ...game.cases['case-003'],
      stage: 5,
      deadlineRemaining: 0,
      assignedTeamIds: ['t_alpha', 't_bravo'],
    }

    const scaling = buildEndgameScalingState(game)

    expect(scaling.activeIncidents).toBeGreaterThan(0)
    expect(scaling.totalRequiredTeams).toBeGreaterThan(0)
    expect(scaling.totalRecommendedTeams).toBeGreaterThanOrEqual(scaling.totalRequiredTeams)
    expect(scaling.averageDifficultyMultiplier).toBeGreaterThan(1)
    expect(scaling.progressionBands.reduce((sum, band) => sum + band.count, 0)).toBe(
      scaling.activeIncidents
    )
    expect(['watch', 'danger', 'crisis']).toContain(scaling.severity)
  })

  it('formats canonical cadence, threshold, and difficulty-pressure summaries for shared surfaces', () => {
    expect(
      formatCadenceSummary({
        incidents: {
          pressureScore: 6,
          severity: 'watch',
          incidents: [],
          unresolvedMomentum: 1,
        },
        endgame: {
          nextThreshold: 8,
          pressureToNextThreshold: 2,
        },
        encounterStructure: {
          urgentEscalations: [],
        },
      })
    ).toEqual([
      'Pressure: 6 (watch)',
      'Major incidents: 0',
      'Unresolved momentum: 1',
      'Endgame threshold: 8 (2 to next)',
      'Extra checks: None',
    ])
    expect(
      formatCadenceSummary({
        incidents: {
          pressureScore: 18,
          severity: 'danger',
          incidents: [{ caseId: 'case-urgent' }],
          unresolvedMomentum: 3,
        },
        endgame: {
          nextThreshold: null,
          pressureToNextThreshold: 0,
        },
        encounterStructure: {
          urgentEscalations: [
            {
              caseId: 'case-urgent',
              caseTitle: 'Threshold Bloom',
              stage: 3,
              nextStage: 4,
              followUpCount: 1,
              convertsToRaid: true,
            },
          ],
        },
      })[4]
    ).toBe('Extra checks: Threshold Bloom (stage 3→4, raid)')
    expect(formatEndgameThresholdSummary({ nextThreshold: 8, pressureToNextThreshold: 2 })).toBe(
      '2 pressure until 8.'
    )
    expect(
      formatEndgameThresholdSummary({ nextThreshold: null, pressureToNextThreshold: 0 })
    ).toBe('Already at crisis ceiling.')
    expect(
      formatDifficultyPressureSummary({
        combat: 2,
        social: 1,
      })
    ).toBe('combat +2 / social +1')
  })
})
