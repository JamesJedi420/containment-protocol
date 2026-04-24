// Tests for knowledge-state gating/risk in missionResults/protocols
import { describe, it, expect } from 'vitest'
import { buildMissionResult } from '../domain/missionResults'
import { applyDefeatConditionKnowledge } from '../domain/knowledge'
import type { MissionResultInput } from '../domain/missionResults'

describe('MissionResult knowledge-state gating', () => {
  it('should add a risk note if defeat-condition certainty is below required', () => {
    const teamId = 'T1', anomalyId = 'A1'
    const knowledge = applyDefeatConditionKnowledge({}, teamId, anomalyId, 'suspected', 2)
    const input: MissionResultInput = {
      caseId: 'C1',
      caseTitle: 'Test Case',
      teamsUsed: [{ teamId }],
      outcome: 'success',
      rewards: { outcome: 'success', reasons: [], factors: [], operationValue: 10, fundingDelta: 0, containmentDelta: 0, reputationDelta: 0, strategicValueDelta: 0, inventoryRewards: [], factionStanding: [], caseType: 'general', caseTypeLabel: 'General', label: 'Success' },
      performanceSummary: undefined,
      powerImpact: undefined,
      fatigueChanges: [],
      injuries: [],
      spawnedConsequences: [],
      resolutionReasons: [],
      explanationNotes: [],
      knowledge,
      requiredDefeatCertainty: 'family',
      anomalyId
    }
    const result = buildMissionResult(input)
    expect(result.explanationNotes.some((n) => n.includes('Insufficient defeat-condition certainty'))).toBe(true)
  })
})
