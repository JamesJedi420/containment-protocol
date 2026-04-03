import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildEscalatedCaseOutcomeDraft,
  buildSuccessCaseOutcomeDraft,
  buildUnresolvedCaseOutcomeDraft,
} from '../domain/sim/caseOutcomePipeline'

describe('caseOutcomePipeline', () => {
  it('builds success mission-result draft with expected payload', () => {
    const state = createStartingState()
    const draft = buildSuccessCaseOutcomeDraft({
      caseId: 'case-001',
      caseTitle: state.cases['case-001'].title,
      teamsUsed: [{ teamId: 't_nightwatch', teamName: 'Nightwatch' }],
      rewards: {
        outcome: 'success',
        caseType: 'general',
        caseTypeLabel: 'General incident',
        operationValue: 10,
        factors: [],
        fundingDelta: 5,
        containmentDelta: 1,
        strategicValueDelta: 4,
        reputationDelta: 2,
        inventoryRewards: [],
        factionStanding: [],
        label: 'Success',
        reasons: [],
      },
      injuries: [],
      resolutionReasons: ['resolved'],
    })

    expect(draft).toMatchObject({
      caseId: 'case-001',
      outcome: 'success',
      teamsUsed: [{ teamId: 't_nightwatch', teamName: 'Nightwatch' }],
    })
  })

  it('builds escalated (partial/fail) mission-result draft with spawned consequences', () => {
    const draft = buildEscalatedCaseOutcomeDraft({
      caseId: 'case-009',
      caseTitle: 'Escalated Case',
      teamsUsed: [{ teamId: 't_nightwatch' }],
      outcome: 'fail',
      rewards: {
        outcome: 'fail',
        caseType: 'general',
        caseTypeLabel: 'General incident',
        operationValue: 10,
        factors: [],
        fundingDelta: -5,
        containmentDelta: -2,
        strategicValueDelta: -4,
        reputationDelta: -2,
        inventoryRewards: [],
        factionStanding: [],
        label: 'Fail',
        reasons: [],
      },
      spawnedConsequences: [
        {
          type: 'stage_escalation',
          caseId: 'case-009',
          caseTitle: 'Escalated Case',
          stage: 2,
          detail: 'Escalated.',
        },
      ],
    })

    expect(draft.outcome).toBe('fail')
    expect(draft.spawnedConsequences).toHaveLength(1)
    expect(draft.spawnedConsequences?.[0]).toMatchObject({ type: 'stage_escalation' })
  })

  it('builds unresolved mission-result draft with default power impact', () => {
    const draft = buildUnresolvedCaseOutcomeDraft({
      caseId: 'case-777',
      caseTitle: 'Deadline Case',
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
    })

    expect(draft).toMatchObject({
      caseId: 'case-777',
      outcome: 'unresolved',
      teamsUsed: [],
      explanationNotes: ['Deadline expired.'],
    })
    expect(draft.powerImpact).toBeDefined()
  })
})