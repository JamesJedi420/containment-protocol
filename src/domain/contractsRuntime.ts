import { clamp } from './math'
import type {
  ActiveContractRuntime,
  Agent,
  ContractModifier,
  ContractModifierEffect,
  ContractResearchUnlock,
  ContractRequirements,
  MissionResolutionKind,
  MissionRewardInventoryGrant,
} from './models'
import { getEquipmentDefinition } from './equipment'
import { inventoryItemLabels } from '../data/production'

export interface ContractRoleFitSummary {
  recommendedHits: number
  discouragedHits: number
  missingRecommended: string[]
  presentDiscouraged: string[]
  scoreAdjustment: number
  reasons: string[]
  suited: boolean
}

function getModifierTotal(
  modifiers: readonly ContractModifier[],
  effect: ContractModifierEffect
) {
  return modifiers
    .filter((modifierEntry) => modifierEntry.effect === effect)
    .reduce((sum, modifierEntry) => sum + (modifierEntry.value ?? 0), 0)
}

function getDistinctRoles(agents: readonly Pick<Agent, 'role'>[]): string[] {
  return [...new Set(agents.map((agent) => agent.role))]
}

export function evaluateContractRoleFit(
  contract:
    | Pick<ActiveContractRuntime, 'requirements' | 'modifiers'>
    | { requirements: ContractRequirements; modifiers?: ContractModifier[] },
  agents: readonly Pick<Agent, 'role'>[]
): ContractRoleFitSummary {
  const distinctRoles = getDistinctRoles(agents)
  const requirements = contract.requirements ?? { recommendedClasses: [], discouragedClasses: [] }
  const recommendedHits = requirements.recommendedClasses.filter((role) =>
    distinctRoles.includes(role)
  ).length
  const discouragedHits = requirements.discouragedClasses.filter((role) =>
    distinctRoles.includes(role)
  ).length
  const missingRecommended = requirements.recommendedClasses.filter(
    (role) => !distinctRoles.includes(role)
  )
  const presentDiscouraged = requirements.discouragedClasses.filter((role) =>
    distinctRoles.includes(role)
  )
  const successBonus = getModifierTotal(contract.modifiers ?? [], 'success_bonus')
  const scoreAdjustment = clamp(
    recommendedHits * 2.25 - discouragedHits * 1.75 - missingRecommended.length * 0.4 + successBonus,
    -8,
    8
  )
  const reasons: string[] = []

  if (recommendedHits > 0) {
    reasons.push(`Recommended coverage +${recommendedHits}`)
  }

  if (discouragedHits > 0) {
    reasons.push(`Discouraged coverage -${discouragedHits}`)
  }

  if (successBonus !== 0) {
    reasons.push(`Contract modifier ${successBonus >= 0 ? '+' : ''}${successBonus.toFixed(1)}`)
  }

  return {
    recommendedHits,
    discouragedHits,
    missingRecommended,
    presentDiscouraged,
    scoreAdjustment: Number(scoreAdjustment.toFixed(2)),
    reasons,
    suited: scoreAdjustment >= 1.5 && discouragedHits === 0,
  }
}

export function getContractModifierTotal(
  contract: Pick<ActiveContractRuntime, 'modifiers'> | { modifiers?: ContractModifier[] } | null | undefined,
  effect: ContractModifierEffect
) {
  return getModifierTotal(contract?.modifiers ?? [], effect)
}

export function getContractOutcomeRewardMultiplier(outcome: MissionResolutionKind) {
  switch (outcome) {
    case 'success':
      return 1
    case 'partial':
      return 0.55
    default:
      return 0
  }
}

function buildInventoryGrant(itemId: string, quantity: number): MissionRewardInventoryGrant | null {
  if (quantity <= 0) {
    return null
  }

  const equipmentDefinition = getEquipmentDefinition(itemId)

  return {
    kind: equipmentDefinition ? 'equipment' : 'material',
    itemId,
    label: inventoryItemLabels[itemId] ?? equipmentDefinition?.name ?? itemId,
    quantity,
    tags: equipmentDefinition?.tags ?? [itemId],
  }
}

export function buildContractInventoryRewards(
  contract: Pick<ActiveContractRuntime, 'rewards' | 'modifiers'>,
  outcome: MissionResolutionKind
) {
  const rewardMultiplier = getContractOutcomeRewardMultiplier(outcome)
  const rewardBonus = getContractModifierTotal(contract, 'reward_bonus')
  const quantityMultiplier = clamp(rewardMultiplier + rewardBonus * 0.1, 0, 1.8)

  return (contract.rewards?.materials ?? [])
    .map((drop) => buildInventoryGrant(drop.itemId, Math.max(0, Math.round(drop.quantity * quantityMultiplier))))
    .filter((grant): grant is MissionRewardInventoryGrant => Boolean(grant))
}

export function getContractFundingReward(
  contract: Pick<ActiveContractRuntime, 'rewards' | 'modifiers'>,
  outcome: MissionResolutionKind
) {
  const rewardMultiplier = getContractOutcomeRewardMultiplier(outcome)
  const rewardBonus = getContractModifierTotal(contract, 'reward_bonus')
  return Math.max(0, Math.round((contract.rewards?.funding ?? 0) * clamp(rewardMultiplier + rewardBonus * 0.1, 0, 1.8)))
}

export function getContractResearchUnlocks(
  contract: Pick<ActiveContractRuntime, 'rewards'>,
  outcome: MissionResolutionKind
): ContractResearchUnlock[] {
  if (outcome !== 'success') {
    return []
  }

  return [...(contract.rewards?.research ?? [])]
}
