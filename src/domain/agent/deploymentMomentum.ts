// SPE-282: Bounded deployment momentum — sustained-operation leverage alongside SPE-281 attrition continuity.

import type {
  Agent,
  DeploymentMomentumState,
  GameConfig,
  GameState,
  MissionRewardBreakdown,
} from '../models'
import { crossSessionAttritionPersistenceEnabled } from './attritionContinuity'
import { getHealthyReturnFatigueThreshold } from '../sim/calibration'

/** Stacks persist with GameState in attrition challenge runs; capped for bounded leverage. */
export const DEPLOYMENT_MOMENTUM_MAX_STACKS = 3

/** Containment rating delta when spending one stack on a qualifying success (bounded). */
export const DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA = 2

function averageFatigue(agents: readonly Pick<Agent, 'fatigue'>[]): number {
  if (agents.length === 0) {
    return 0
  }
  const sum = agents.reduce((acc, agent) => acc + (agent.fatigue ?? 0), 0)
  return sum / agents.length
}

export function deploymentMomentumSurfacesEnabled(
  config: Pick<GameConfig, 'durationModel' | 'challengeModeEnabled'>
): boolean {
  return crossSessionAttritionPersistenceEnabled(config)
}

/**
 * After a confirmed mission success (not degraded to partial): optionally spend then earn stacks.
 * Spend applies first so earning can refill in the same resolution without exceeding the cap.
 */
export function mergeDeploymentMomentumIntoSuccessRewards(input: {
  momentumEnabled: boolean
  week: number
  preResolutionAgents: Pick<Agent, 'fatigue'>[]
  prior: DeploymentMomentumState | undefined
  baseReward: MissionRewardBreakdown
}): { reward: MissionRewardBreakdown; nextMomentum: DeploymentMomentumState | undefined } {
  const { momentumEnabled, week, preResolutionAgents, prior, baseReward } = input

  if (!momentumEnabled) {
    return { reward: baseReward, nextMomentum: prior }
  }

  let stacks = Math.min(DEPLOYMENT_MOMENTUM_MAX_STACKS, Math.max(0, prior?.stacks ?? 0))
  const spendApplied = stacks > 0
  if (spendApplied) {
    stacks -= 1
  }

  const threshold = getHealthyReturnFatigueThreshold(week)
  const avgFat = averageFatigue(preResolutionAgents)
  const sustainedDeployment = avgFat > threshold
  let earned = false
  if (sustainedDeployment && stacks < DEPLOYMENT_MOMENTUM_MAX_STACKS) {
    stacks += 1
    earned = true
  }

  const narrativeParts: string[] = []
  if (spendApplied) {
    narrativeParts.push(
      `Spent 1 stack for +${DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA} containment leverage (remaining ${stacks}).`
    )
  }
  if (earned) {
    narrativeParts.push(
      `Earned 1 stack: average assigned fatigue ${avgFat.toFixed(1)} exceeds healthy-return threshold ${threshold}.`
    )
  }

  if (!spendApplied && !earned) {
    return { reward: baseReward, nextMomentum: prior }
  }

  let reward = baseReward
  if (spendApplied) {
    reward = {
      ...baseReward,
      containmentDelta: baseReward.containmentDelta + DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA,
      reasons: [
        ...baseReward.reasons,
        `Deployment momentum: spent 1 stack for +${DEPLOYMENT_MOMENTUM_SPEND_CONTAINMENT_DELTA} containment (now ${stacks} stack(s)).`,
      ],
    }
  }

  const lastSummary = narrativeParts.join(' ')

  return {
    reward,
    nextMomentum: {
      stacks,
      lastChangeWeek: week,
      lastSummary,
    },
  }
}

/** Operations report / Front Desk line when attrition challenge continuity is active. */
export function formatDeploymentMomentumSummary(state: GameState): string | undefined {
  if (!deploymentMomentumSurfacesEnabled(state.config)) {
    return undefined
  }

  const dm = state.deploymentMomentum
  const prefix = `Deployment momentum: ${dm?.stacks ?? 0}/${DEPLOYMENT_MOMENTUM_MAX_STACKS} stacks.`
  const recap = dm?.lastSummary ?? 'No earn/spend on the last qualifying success.'
  return `${prefix} ${recap} Chapter break resets stacks.`
}
