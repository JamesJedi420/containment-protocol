// cspell:words unequip
import type { Agent, GameState, Id } from '../models'
import {
  listEquippedItemAssignments,
  type EquipmentSlotKind,
  EQUIPMENT_SLOT_KINDS,
  getEquipmentDefinition,
  getEquipmentSlotAliases,
  getEquipmentSlotItemId,
  validateAgentLoadoutAssignment,
} from '../equipment'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'

function canEditAgentEquipment(agent: Agent | undefined) {
  return Boolean(agent && agent.status === 'active' && agent.assignment?.state === 'idle')
}

function getInventoryStock(state: GameState, itemId: string) {
  return Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
}

function withSlotItem(agent: Agent, slot: EquipmentSlotKind, itemId?: string): Agent {
  const nextSlots = { ...(agent.equipmentSlots ?? {}) }

  for (const alias of getEquipmentSlotAliases(slot)) {
    delete nextSlots[alias]
  }

  if (itemId) {
    nextSlots[slot] = itemId
  }

  return {
    ...agent,
    equipmentSlots: nextSlots,
  }
}

function getSlottedItemIds(agent: Agent) {
  return [
    ...new Set(
      EQUIPMENT_SLOT_KINDS.map((slot) => getEquipmentSlotItemId(agent.equipmentSlots, slot)).filter(
        (itemId): itemId is string => typeof itemId === 'string' && itemId.length > 0
      )
    ),
  ]
}

function withEquipmentQualityMap(agent: Agent): Agent {
  const slottedItemIds = new Set(getSlottedItemIds(agent))
  const nextEquipment = Object.fromEntries(
    Object.entries(agent.equipment ?? {}).filter(([itemId]) => slottedItemIds.has(itemId))
  )

  return {
    ...agent,
    equipment: nextEquipment,
  }
}

function clearAgentSlot(agent: Agent, slot: EquipmentSlotKind): Agent {
  return withEquipmentQualityMap(withSlotItem(agent, slot))
}

function findTransferCandidate(
  state: GameState,
  itemId: string,
  targetAgentId: Id,
  targetSlot: EquipmentSlotKind
) {
  return listEquippedItemAssignments(state.agents, itemId)
    .filter(
      (assignment) =>
        !(assignment.agentId === targetAgentId && assignment.slot === targetSlot) &&
        canEditAgentEquipment(state.agents[assignment.agentId])
    )
    .sort((left, right) => {
      const leftSameAgent = left.agentId === targetAgentId ? 0 : 1
      const rightSameAgent = right.agentId === targetAgentId ? 0 : 1
      if (leftSameAgent !== rightSameAgent) {
        return leftSameAgent - rightSameAgent
      }

      const agentCompare = left.agentId.localeCompare(right.agentId)
      if (agentCompare !== 0) {
        return agentCompare
      }

      return EQUIPMENT_SLOT_KINDS.indexOf(left.slot) - EQUIPMENT_SLOT_KINDS.indexOf(right.slot)
    })
    .at(0)
}

export function equipAgentItem(
  state: GameState,
  agentId: Id,
  slot: EquipmentSlotKind,
  itemId: string
): GameState {
  const agent = state.agents[agentId]
  const definition = getEquipmentDefinition(itemId)

  if (!canEditAgentEquipment(agent) || !definition || !definition.allowedSlots.includes(slot)) {
    return ensureNormalizedGameState(state)
  }

  const assignmentValidation = validateAgentLoadoutAssignment(agent, slot, itemId, {
    state,
  })
  if (!assignmentValidation.valid) {
    return ensureNormalizedGameState(state)
  }

  const currentItemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
  if (currentItemId === itemId) {
    return ensureNormalizedGameState(state)
  }

  let nextState = state
  let nextInventory = { ...state.inventory }
  let transferredFromAssignment = false

  const availableStock = getInventoryStock(nextState, itemId)
  if (availableStock > 0) {
    nextInventory[itemId] = availableStock - 1
  } else {
    const transferCandidate = findTransferCandidate(nextState, itemId, agentId, slot)
    if (!transferCandidate) {
      return ensureNormalizedGameState(state)
    }

    nextState = {
      ...nextState,
      agents: {
        ...nextState.agents,
        [transferCandidate.agentId]: clearAgentSlot(
          nextState.agents[transferCandidate.agentId],
          transferCandidate.slot
        ),
      },
    }
    nextInventory = { ...nextState.inventory }
    transferredFromAssignment = true
  }

  if (currentItemId) {
    nextInventory[currentItemId] = getInventoryStock(nextState, currentItemId) + 1
  }

  if (transferredFromAssignment) {
    nextInventory[itemId] = getInventoryStock(nextState, itemId)
  }

  const targetAgent = nextState.agents[agentId]
  const nextAgent = withEquipmentQualityMap({
    ...withSlotItem(targetAgent, slot, itemId),
    equipment: {
      ...(targetAgent.equipment ?? {}),
      [itemId]: Math.max(1, Math.trunc(definition.quality)),
    },
  })

  return normalizeGameState({
    ...nextState,
    inventory: nextInventory,
    agents: {
      ...nextState.agents,
      [agentId]: nextAgent,
    },
  })
}

export function unequipAgentItem(
  state: GameState,
  agentId: Id,
  slot: EquipmentSlotKind
): GameState {
  const agent = state.agents[agentId]

  if (!canEditAgentEquipment(agent)) {
    return ensureNormalizedGameState(state)
  }

  const currentItemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
  if (!currentItemId) {
    return ensureNormalizedGameState(state)
  }

  const nextAgent = clearAgentSlot(agent, slot)

  return normalizeGameState({
    ...state,
    inventory: {
      ...state.inventory,
      [currentItemId]: getInventoryStock(state, currentItemId) + 1,
    },
    agents: {
      ...state.agents,
      [agentId]: nextAgent,
    },
  })
}
