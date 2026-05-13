import type {
  Agent,
  AgentEnergyBudgetState,
  AgentEnergyReserveBand,
  AgentFatigueChannels,
} from './models'
import { createDefaultFatigueChannels } from './agentFatigueChannels'
import { clamp } from './math'
import { RESPONDER_ENERGY_CALIBRATION } from './sim/calibration'

export type ResponderDutyCostClass = keyof typeof RESPONDER_ENERGY_CALIBRATION.dutyCosts

export interface ResponderEnergyBandInput {
  currentReserve: number
  exertionDebt: number
}

export interface ResponderEnergyExertionResult {
  energyBudget: AgentEnergyBudgetState
  fatigueChannels: AgentFatigueChannels
}

export function getResponderDutyCost(dutyClass: ResponderDutyCostClass): number {
  return RESPONDER_ENERGY_CALIBRATION.dutyCosts[dutyClass]
}

export function classifyResponderEnergyReserve({
  currentReserve,
  exertionDebt,
}: ResponderEnergyBandInput): AgentEnergyReserveBand {
  if (exertionDebt > 0) {
    return 'overdrawn'
  }

  if (currentReserve >= RESPONDER_ENERGY_CALIBRATION.reserveBands.stable) {
    return 'stable'
  }

  if (currentReserve >= RESPONDER_ENERGY_CALIBRATION.reserveBands.taxed) {
    return 'taxed'
  }

  return 'depleted'
}

export function createDefaultResponderEnergyBudget(): AgentEnergyBudgetState {
  const currentReserve = RESPONDER_ENERGY_CALIBRATION.defaultReserve

  return {
    currentReserve,
    reserveBand: classifyResponderEnergyReserve({ currentReserve, exertionDebt: 0 }),
    exertionDebt: 0,
    estimateConfidence: 'medium',
  }
}

function getPhysicalCapacity(agent: Agent): number {
  if (agent.stats) {
    return Math.round((agent.stats.physical.strength + agent.stats.physical.endurance) / 2)
  }

  return Math.round((agent.baseStats.combat + agent.baseStats.utility) / 2)
}

function getConditioningMultiplier(agent: Agent): number {
  const capacity = getPhysicalCapacity(agent)
  const { conditioningThresholds, conditioningMultipliers } = RESPONDER_ENERGY_CALIBRATION

  if (capacity >= conditioningThresholds.strong) {
    return conditioningMultipliers.strong
  }

  if (capacity >= conditioningThresholds.capable) {
    return conditioningMultipliers.capable
  }

  if (capacity < conditioningThresholds.strained) {
    return conditioningMultipliers.strained
  }

  return conditioningMultipliers.baseline
}

function getStatusMultiplier(agent: Agent): number {
  if (agent.status === 'injured') {
    return RESPONDER_ENERGY_CALIBRATION.statusMultipliers.injured
  }

  if (agent.status === 'recovering' || agent.assignment?.state === 'recovery') {
    return RESPONDER_ENERGY_CALIBRATION.statusMultipliers.recovering
  }

  return 1
}

function normalizeEnergyBudget(energyBudget: AgentEnergyBudgetState): AgentEnergyBudgetState {
  const currentReserve = clamp(energyBudget.currentReserve, 0, 100)
  const exertionDebt = Math.max(0, Math.trunc(energyBudget.exertionDebt))

  return {
    ...energyBudget,
    currentReserve,
    exertionDebt,
    reserveBand: classifyResponderEnergyReserve({ currentReserve, exertionDebt }),
  }
}

export function resolveResponderExertionCost(
  agent: Agent,
  dutyClass: ResponderDutyCostClass
): number {
  const baseCost = getResponderDutyCost(dutyClass)
  if (dutyClass === 'idle_upkeep') {
    return baseCost
  }

  const energyBudget = normalizeEnergyBudget(agent.energyBudget ?? createDefaultResponderEnergyBudget())
  const reserveBandMultiplier =
    RESPONDER_ENERGY_CALIBRATION.reserveBandMultipliers[energyBudget.reserveBand]

  return Math.max(
    1,
    Math.round(
      baseCost *
        getConditioningMultiplier(agent) *
        getStatusMultiplier(agent) *
        reserveBandMultiplier
    )
  )
}

function applyOverdrawnPhysicalBurden(
  channels: AgentFatigueChannels,
  exertionCost: number,
  exertionDebt: number
): AgentFatigueChannels {
  if (exertionDebt <= 0) {
    return channels
  }

  const rawDelta =
    Math.ceil(exertionDebt / RESPONDER_ENERGY_CALIBRATION.overdrawnPhysicalDebtDivisor) +
    Math.ceil(exertionCost * RESPONDER_ENERGY_CALIBRATION.overdrawnPhysicalCostShare)
  const physicalDelta = Math.min(RESPONDER_ENERGY_CALIBRATION.maxOverdrawnPhysicalDelta, rawDelta)

  return {
    ...channels,
    physicalExhaustion: clamp(channels.physicalExhaustion + physicalDelta, 0, 100),
  }
}

export function applyResponderEnergyRecovery(
  energyBudget: AgentEnergyBudgetState
): AgentEnergyBudgetState {
  const normalizedBudget = normalizeEnergyBudget(energyBudget)

  if (normalizedBudget.reserveBand === 'stable' && normalizedBudget.exertionDebt <= 0) {
    return normalizedBudget
  }

  const debtRecovered = Math.min(
    normalizedBudget.exertionDebt,
    RESPONDER_ENERGY_CALIBRATION.idleDebtRecovery
  )
  const exertionDebt = normalizedBudget.exertionDebt - debtRecovered
  const reserveRecovery = exertionDebt > 0 ? 0 : RESPONDER_ENERGY_CALIBRATION.idleReserveRecovery
  const currentReserve = clamp(normalizedBudget.currentReserve + reserveRecovery, 0, 100)

  return {
    ...normalizedBudget,
    currentReserve,
    exertionDebt,
    reserveBand: classifyResponderEnergyReserve({ currentReserve, exertionDebt }),
  }
}

export function applyResponderEnergyExertion(
  agent: Agent,
  dutyClass: ResponderDutyCostClass,
  sourceChannels: AgentFatigueChannels = agent.fatigueChannels ?? createDefaultFatigueChannels()
): ResponderEnergyExertionResult {
  const previousBudget = normalizeEnergyBudget(agent.energyBudget ?? createDefaultResponderEnergyBudget())
  const currentReserve = clamp(previousBudget.currentReserve, 0, 100)
  const exertionCost = resolveResponderExertionCost(agent, dutyClass)
  const rawReserve = currentReserve - exertionCost
  const exertionDebt = previousBudget.exertionDebt + Math.max(0, -rawReserve)
  const nextReserve = clamp(rawReserve, 0, 100)
  const reserveBand = classifyResponderEnergyReserve({
    currentReserve: nextReserve,
    exertionDebt,
  })
  const energyBudget: AgentEnergyBudgetState = {
    currentReserve: nextReserve,
    reserveBand,
    exertionDebt,
    estimateConfidence: previousBudget.estimateConfidence,
    lastDutyCost: exertionCost,
  }

  return {
    energyBudget,
    fatigueChannels: applyOverdrawnPhysicalBurden(sourceChannels, exertionCost, exertionDebt),
  }
}
