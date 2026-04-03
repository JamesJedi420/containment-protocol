import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildSuccessCaseOutcomeDraft,
  buildUnresolvedCaseOutcomeDraft,
} from '../domain/sim/caseOutcomePipeline'
import { finalizeMissionResultsFromDrafts } from '../domain/sim/missionFinalizationPipeline'

describe('missionFinalizationPipeline', () => {
  it('materializes mission results with fatigue deltas and parent-linked follow-up consequences', () => {
    const sourceState = createStartingState()
    const nextState = structuredClone(sourceState)
    const teamId = 't_nightwatch'
    const memberId = sourceState.teams[teamId].agentIds[0]

    sourceState.agents[memberId] = {
      ...sourceState.agents[memberId],
      fatigue: 8,
    }
    nextState.agents[memberId] = {
      ...nextState.agents[memberId],
      fatigue: 19,
    }

    nextState.cases['case-followup-test'] = {
      ...nextState.cases['case-002'],
      id: 'case-followup-test',
      title: 'Follow-up Case',
      stage: 3,
    }

    const missionResultByCaseId = finalizeMissionResultsFromDrafts({
      sourceState: {
        teams: sourceState.teams,
        agents: sourceState.agents,
      },
      nextState: {
        teams: nextState.teams,
        agents: nextState.agents,
        cases: nextState.cases,
      },
      spawnedCases: [
        {
          caseId: 'case-followup-test',
          parentCaseId: 'case-001',
          trigger: 'failure',
        },
      ],
      missionResultDraftByCaseId: {
        'case-001': buildSuccessCaseOutcomeDraft({
          caseId: 'case-001',
          caseTitle: sourceState.cases['case-001'].title,
          teamsUsed: [{ teamId, teamName: sourceState.teams[teamId].name }],
          rewards: {
            outcome: 'success',
            caseType: 'general',
            caseTypeLabel: 'General incident',
            operationValue: 15,
            factors: [],
            fundingDelta: 8,
            containmentDelta: 2,
            strategicValueDelta: 6,
            reputationDelta: 2,
            inventoryRewards: [],
            factionStanding: [],
            label: 'Success',
            reasons: [],
          },
          injuries: [],
          resolutionReasons: ['resolved'],
        }),
      },
      activeTeamStressModifiers: {
        [teamId]: 0.25,
      },
    })

    const result = missionResultByCaseId['case-001']
    expect(result).toBeDefined()
    expect(result?.fatigueChanges).toHaveLength(1)
    expect(result?.fatigueChanges[0]).toMatchObject({
      teamId,
      stressModifier: 0.25,
    })
    expect(result?.fatigueChanges[0].after - result!.fatigueChanges[0].before).toBe(
      result?.fatigueChanges[0].delta
    )
    expect(result?.spawnedConsequences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'follow_up_case',
          caseId: 'case-followup-test',
          trigger: 'failure',
        }),
      ])
    )
  })

  it('keeps unresolved outcomes stable with no teams and ignores unrelated spawned records', () => {
    const state = createStartingState()
    const missionResultByCaseId = finalizeMissionResultsFromDrafts({
      sourceState: {
        teams: state.teams,
        agents: state.agents,
      },
      nextState: {
        teams: state.teams,
        agents: state.agents,
        cases: state.cases,
      },
      spawnedCases: [
        {
          caseId: 'case-003',
          parentCaseId: 'case-002',
          trigger: 'unresolved',
        },
      ],
      missionResultDraftByCaseId: {
        'case-001': buildUnresolvedCaseOutcomeDraft({
          caseId: 'case-001',
          caseTitle: state.cases['case-001'].title,
          rewards: {
            outcome: 'unresolved',
            caseType: 'general',
            caseTypeLabel: 'General incident',
            operationValue: 10,
            factors: [],
            fundingDelta: -7,
            containmentDelta: -3,
            strategicValueDelta: -6,
            reputationDelta: -3,
            inventoryRewards: [],
            factionStanding: [],
            label: 'Unresolved',
            reasons: [],
          },
          spawnedConsequences: [],
          explanationNotes: ['Deadline expired.'],
        }),
      },
      activeTeamStressModifiers: {},
    })

    const result = missionResultByCaseId['case-001']
    expect(result).toBeDefined()
    expect(result?.teamsUsed).toEqual([])
    expect(result?.fatigueChanges).toEqual([])
    expect(
      result?.spawnedConsequences.some((consequence) => consequence.caseId === 'case-003')
    ).toBe(false)
  })
})