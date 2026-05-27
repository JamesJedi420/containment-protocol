import { describe, expect, it } from 'vitest'

import { loadGameSave, serializeGameSave } from '../../app/store/saveSystem'
import { createStartingState } from '../../data/startingState'
import type { MissionRewardBreakdown } from '../models'
import { applyChapterBreakAttritionReset } from './attritionReset'
import { hydrateGame } from '../../app/store/runTransfer'
import {
  DEPLOYMENT_MOMENTUM_MAX_STACKS,
  DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA,
  mergeDeploymentMomentumIntoSuccessRewards,
} from './deploymentMomentum'

describe('deployment momentum (SPE-282)', () => {
  const baseReward = (): MissionRewardBreakdown => ({
    outcome: 'success',
    caseType: 'fixture',
    caseTypeLabel: 'Fixture',
    operationValue: 10,
    factors: [],
    fundingDelta: 0,
    containmentDelta: 5,
    strategicValueDelta: 0,
    reputationDelta: 0,
    inventoryRewards: [],
    factionStanding: [],
    label: 'fixture',
    reasons: [],
  })

  it('earns one stack when average fatigue is above the healthy-return threshold', () => {
    const merged = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: true,
      week: 5,
      preResolutionAgents: [{ fatigue: 80 }, { fatigue: 20 }],
      prior: undefined,
      baseReward: baseReward(),
    })
    expect(merged.nextMomentum?.stacks).toBe(1)
    expect(merged.nextMomentum?.lastSummary).toContain('Earned 1 stack')
    expect(merged.reward.containmentDelta).toBe(5)
  })

  it('does not earn when fatigue is at or below the healthy-return threshold', () => {
    const merged = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: true,
      week: 5,
      preResolutionAgents: [{ fatigue: 10 }, { fatigue: 10 }],
      prior: undefined,
      baseReward: baseReward(),
    })
    expect(merged.nextMomentum).toBeUndefined()
  })

  it('spends a stack for extra containment and can still earn in the same success', () => {
    const prior = { stacks: 2, lastChangeWeek: 1, lastSummary: 'prev' }
    const merged = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: true,
      week: 6,
      preResolutionAgents: [{ fatigue: 90 }],
      prior,
      baseReward: baseReward(),
    })
    expect(merged.nextMomentum?.stacks).toBe(2)
    expect(merged.reward.containmentDelta).toBe(5 + DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA)
    expect(merged.reward.reasons.some((r) => r.includes('Deployment momentum: spent'))).toBe(true)
  })

  it('caps stacks', () => {
    const prior = { stacks: DEPLOYMENT_MOMENTUM_MAX_STACKS }
    const merged = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: true,
      week: 3,
      preResolutionAgents: [{ fatigue: 99 }],
      prior,
      baseReward: baseReward(),
    })
    expect(merged.nextMomentum?.stacks).toBe(DEPLOYMENT_MOMENTUM_MAX_STACKS)
  })

  it('is inactive when momentum surfaces are disabled', () => {
    const br = baseReward()
    const merged = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: false,
      week: 3,
      preResolutionAgents: [{ fatigue: 99 }],
      prior: { stacks: 2 },
      baseReward: br,
    })
    expect(merged.nextMomentum?.stacks).toBe(2)
    expect(merged.reward).toEqual(br)
  })

  it('clears stacks on chapter-break reset while preserving recap text', () => {
    const state = createStartingState()
    state.deploymentMomentum = {
      stacks: 2,
      lastChangeWeek: 4,
      lastSummary: 'test recap',
    }
    const next = applyChapterBreakAttritionReset(state)
    expect(next.deploymentMomentum?.stacks).toBe(0)
    expect(next.deploymentMomentum?.lastSummary).toContain('Chapter break cleared')
  })

  it('round-trips deploymentMomentum through the canonical save envelope', () => {
    const state = createStartingState()
    state.config = {
      ...state.config,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    }
    state.week = 5
    state.deploymentMomentum = { stacks: 1, lastChangeWeek: 4, lastSummary: 'earn test' }
    const loaded = loadGameSave(serializeGameSave(state))
    expect(loaded.deploymentMomentum).toEqual(state.deploymentMomentum)
  })

  it('hydration clamps lastChangeWeek to the loaded campaign week', () => {
    const base = createStartingState()
    const loaded = hydrateGame(
      {
        ...base,
        week: 8,
        config: {
          ...base.config,
          challengeModeEnabled: true,
          durationModel: 'attrition',
        },
        deploymentMomentum: { stacks: 1, lastChangeWeek: 99, lastSummary: 'future week' },
      },
      base
    )
    expect(loaded.week).toBe(8)
    expect(loaded.deploymentMomentum?.lastChangeWeek).toBe(8)
  })

  it('chains two merges the same way advanceWeek does across resolutions in one week', () => {
    const br = baseReward()
    const first = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: true,
      week: 3,
      preResolutionAgents: [{ fatigue: 90 }],
      prior: undefined,
      baseReward: br,
    })
    expect(first.nextMomentum?.stacks).toBe(1)

    const second = mergeDeploymentMomentumIntoSuccessRewards({
      momentumEnabled: true,
      week: 3,
      preResolutionAgents: [{ fatigue: 90 }],
      prior: first.nextMomentum,
      baseReward: br,
    })
    expect(second.nextMomentum?.stacks).toBe(1)
    expect(second.reward.containmentDelta).toBe(br.containmentDelta + DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA)
    expect(second.reward.reasons.some((r) => r.includes('Deployment momentum: spent'))).toBe(true)
  })
})
