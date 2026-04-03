import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildMissionPenaltyBreakdown,
  buildMissionResult,
  buildMissionRewardBreakdown,
  buildMissionRewardPreviewSet,
} from '../domain/missionResults'

describe('missionResults', () => {
  it('builds deterministic outcome reward previews from case and config', () => {
    const state = createStartingState()
    const currentCase = state.cases['case-001']

    const success = buildMissionRewardBreakdown(currentCase, 'success', state.config)
    const partial = buildMissionRewardBreakdown(currentCase, 'partial', state.config)
    const fail = buildMissionRewardBreakdown(currentCase, 'fail', state.config)
    const unresolved = buildMissionRewardBreakdown(currentCase, 'unresolved', state.config)

    expect(success.fundingDelta).toBeGreaterThan(partial.fundingDelta)
    expect(success.containmentDelta).toBeGreaterThan(partial.containmentDelta)
    expect(success.reputationDelta).toBeGreaterThan(0)
    expect(partial.fundingDelta).toBeGreaterThanOrEqual(0)
    expect(partial.containmentDelta).toBeGreaterThanOrEqual(0)
    expect(fail.fundingDelta).toBeLessThan(0)
    expect(fail.reputationDelta).toBeLessThan(0)
    expect(unresolved.fundingDelta).toBeLessThan(fail.fundingDelta)
    expect(unresolved.containmentDelta).toBeLessThanOrEqual(fail.containmentDelta)
    expect(success.inventoryRewards.length).toBeGreaterThan(0)
    expect(fail.inventoryRewards).toEqual([])
  })

  it('returns a complete preview set for all mission outcomes', () => {
    const state = createStartingState()
    const previews = buildMissionRewardPreviewSet(state.cases['case-001'], state.config)

    expect(Object.keys(previews)).toEqual(['success', 'partial', 'fail', 'unresolved'])
    expect(previews.success.operationValue).toBeGreaterThan(0)
    expect(previews.fail.strategicValueDelta).toBeLessThan(0)
  })

  it('scales reward outputs with higher difficulty and escalation', () => {
    const state = createStartingState()
    const baselineCase = state.cases['case-001']
    const escalatedCase = {
      ...baselineCase,
      stage: baselineCase.stage + 2,
      deadlineRemaining: 1,
      difficulty: {
        combat: baselineCase.difficulty.combat + 2,
        investigation: baselineCase.difficulty.investigation + 1,
        utility: baselineCase.difficulty.utility + 2,
        social: baselineCase.difficulty.social,
      },
    }

    const baselineReward = buildMissionRewardBreakdown(baselineCase, 'success', state.config)
    const escalatedReward = buildMissionRewardBreakdown(escalatedCase, 'success', state.config)

    expect(escalatedReward.operationValue).toBeGreaterThan(baselineReward.operationValue)
    expect(escalatedReward.fundingDelta).toBeGreaterThan(baselineReward.fundingDelta)
    expect(escalatedReward.reputationDelta).toBeGreaterThan(baselineReward.reputationDelta)
    expect(escalatedReward.factors.map((factor: { id: string }) => factor.id)).toEqual([
      'required-score',
      'stage-pressure',
      'raid-pressure',
      'duration-weight',
      'deadline-pressure',
    ])
  })

  it('routes rewards through case family tables for inventory and faction standing', () => {
    const state = createStartingState()
    const occultCase = {
      ...state.cases['case-001'],
      id: 'case-occult',
      tags: ['occult', 'ritual', 'spirit', 'chapel'],
      requiredTags: ['occultist'],
      preferredTags: ['ward-kit'],
      stage: 3,
    }
    const predatorCase = {
      ...state.cases['case-001'],
      id: 'case-predator',
      tags: ['vampire', 'beast', 'night', 'predator'],
      requiredTags: [],
      preferredTags: ['combat'],
      stage: 3,
    }

    const occultReward = buildMissionRewardBreakdown(occultCase, 'success', state.config)
    const predatorReward = buildMissionRewardBreakdown(predatorCase, 'success', state.config)

    expect(occultReward.caseType).toBe('occult')
    expect(
      occultReward.inventoryRewards.map((entry: { itemId: string }) => entry.itemId)
    ).toEqual(
      expect.arrayContaining(['occult_reagents', 'warding_kits'])
    )
    expect(occultReward.factionStanding[0]?.factionId).toBe('occult_networks')

    expect(predatorReward.caseType).toBe('predator_hunt')
    expect(
      predatorReward.inventoryRewards.map((entry: { itemId: string }) => entry.itemId)
    ).toEqual(
      expect.arrayContaining(['ballistic_supplies', 'silver_rounds'])
    )
  })

  it('builds a mission result breakdown with penalties and explanation notes', () => {
    const state = createStartingState()
    const rewards = buildMissionRewardBreakdown(state.cases['case-001'], 'fail', state.config)
    const missionResult = buildMissionResult({
      caseId: 'case-001',
      caseTitle: state.cases['case-001'].title,
      teamsUsed: [{ teamId: 't_nightwatch', teamName: 'Nightwatch' }],
      outcome: 'fail',
      rewards,
      performanceSummary: {
        contribution: 12,
        threatHandled: 5,
        damageTaken: 8,
        healingPerformed: 1,
        evidenceGathered: 0,
        containmentActionsCompleted: 0,
      },
      powerImpact: {
        activeEquipmentIds: ['ward_seals', 'warding_kits'],
        activeKitIds: ['occult-containment-kit'],
        activeProtocolIds: ['containment-doctrine-alpha'],
        equipmentContributionDelta: 4.2,
        kitContributionDelta: 1.8,
        protocolContributionDelta: 2.1,
        equipmentScoreDelta: 3.6,
        kitScoreDelta: 1.4,
        protocolScoreDelta: 1.7,
        kitEffectivenessMultiplier: 1.04,
        protocolEffectivenessMultiplier: 1.03,
        notes: [
          'Gear shifted contribution by +4.2 and score by +3.6.',
          'Kits applied x1.04 effectiveness and +1.4 score.',
          'Protocols shifted contribution by +2.1 and score by +1.7.',
        ],
      },
      fatigueChanges: [
        {
          teamId: 't_nightwatch',
          teamName: 'Nightwatch',
          before: 10,
          after: 18,
          delta: 8,
          stressModifier: 0.12,
        },
      ],
      injuries: [
        {
          agentId: 'a_ava',
          agentName: 'Ava',
          severity: 'moderate',
          damage: 25,
        },
      ],
      spawnedConsequences: [
        {
          type: 'follow_up_case',
          caseId: 'case-spawned-001',
          caseTitle: 'Residual Haunting',
          stage: 2,
          trigger: 'failure',
          detail: 'Spawned follow-up case Residual Haunting at stage 2.',
        },
      ],
      resolutionReasons: ['Team score fell below the required threshold.'],
    })

    expect(missionResult.penalties).toEqual(buildMissionPenaltyBreakdown(rewards))
    expect(missionResult.powerImpact).toMatchObject({
      activeEquipmentIds: ['ward_seals', 'warding_kits'],
      activeKitIds: ['occult-containment-kit'],
      activeProtocolIds: ['containment-doctrine-alpha'],
      equipmentContributionDelta: 4.2,
      protocolScoreDelta: 1.7,
    })
    expect(missionResult.explanationNotes).toEqual(
      expect.arrayContaining([
        'Team score fell below the required threshold.',
        expect.stringContaining('Funding'),
        'Gear shifted contribution by +4.2 and score by +3.6.',
        'Kits applied x1.04 effectiveness and +1.4 score.',
        'Protocols shifted contribution by +2.1 and score by +1.7.',
        'Nightwatch fatigue +8 (10 -> 18).',
        'Ava sustained a moderate injury, 25 damage.',
        'Spawned follow-up case Residual Haunting at stage 2.',
      ])
    )
  })
})
