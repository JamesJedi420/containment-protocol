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
import {
  COMBAT_STIM_DEFINITION_ID,
  getEquipmentInstance,
  getEquipmentInstanceAtAgentSlot,
  instantiateEquipmentInstance,
  relocateEquipmentInstance,
  type EquipmentInstance,
  type EquipmentInstanceId,
  type EquipmentInstanceMutationResult,
} from '../equipmentInstance'
import { resolveEquipmentDeconstructionSources } from './equipmentDeconstruction'

function canEditAgentEquipment(agent: Agent | undefined) {
  return Boolean(agent && agent.status === 'active' && agent.assignment?.state === 'idle')
}

function getInventoryStock(state: GameState, itemId: string) {
  return Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
}

export function materializeStoredOrdinaryEquipmentInstance(
  state: GameState,
  definitionId: string
): EquipmentInstanceMutationResult {
  const normalized = ensureNormalizedGameState(state)
  const definition = getEquipmentDefinition(definitionId)
  if (!definition) return { ok: false, state: normalized, code: 'unknown_definition' }
  if (definitionId === COMBAT_STIM_DEFINITION_ID) {
    return { ok: false, state: normalized, code: 'specialized_materialization_required' }
  }
  if (getInventoryStock(normalized, definitionId) < 1) {
    return { ok: false, state: normalized, code: 'inventory_unavailable' }
  }
  if ((normalized.damagedEquipmentQueue ?? []).includes(definitionId)) {
    return { ok: false, state: normalized, code: 'damaged_stock_ambiguity' }
  }
  const catalogSource = resolveEquipmentDeconstructionSources(normalized, definitionId).find(
    (choice) => choice.source.kind === 'catalog'
  )
  if (!catalogSource || catalogSource.quantity < 1) {
    return { ok: false, state: normalized, code: 'fabricated_provenance_required' }
  }
  return instantiateEquipmentInstance(normalized, definitionId, {
    location: { state: 'stored' },
    condition: 'operational',
  })
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

function withEquipmentEffectScaleMap(agent: Agent): Agent {
  const slottedItemIds = new Set(getSlottedItemIds(agent))
  const nextEffectScales = Object.fromEntries(
    Object.entries(agent.equipmentEffectScales ?? {}).filter(([itemId]) =>
      slottedItemIds.has(itemId)
    )
  )

  return {
    ...agent,
    equipmentEffectScales: nextEffectScales,
  }
}

function clearAgentSlot(agent: Agent, slot: EquipmentSlotKind): Agent {
  return withEquipmentEffectScaleMap(withSlotItem(agent, slot))
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
        canEditAgentEquipment(state.agents[assignment.agentId]) &&
        (getEquipmentInstanceAtAgentSlot(state, assignment.agentId, assignment.slot)
          ?.definitionId ?? itemId) === itemId
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

  const currentInstance = getEquipmentInstanceAtAgentSlot(state, agentId, slot)
  const currentItemId =
    currentInstance?.definitionId ?? getEquipmentSlotItemId(agent.equipmentSlots, slot)
  if (currentItemId === itemId) {
    return ensureNormalizedGameState(state)
  }

  if (itemId === COMBAT_STIM_DEFINITION_ID && getInventoryStock(state, itemId) > 0) {
    const interim = currentItemId ? unequipAgentItem(state, agentId, slot) : state
    const materialized = instantiateEquipmentInstance(interim, itemId, {
      location: { state: 'equipped', agentId, slot },
    })
    return materialized.ok ? materialized.state : ensureNormalizedGameState(state)
  }

  let nextState = state
  let nextInventory = { ...state.inventory }
  let transferredFromAssignment = false
  let transferredInstance: EquipmentInstance | undefined

  const availableStock = getInventoryStock(nextState, itemId)
  if (availableStock > 0) {
    nextInventory[itemId] = availableStock - 1
  } else {
    const transferCandidate = findTransferCandidate(nextState, itemId, agentId, slot)
    if (!transferCandidate) {
      return ensureNormalizedGameState(state)
    }

    transferredInstance = getEquipmentInstanceAtAgentSlot(
      nextState,
      transferCandidate.agentId,
      transferCandidate.slot
    )

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

  if (currentItemId && !currentInstance) {
    nextInventory[currentItemId] = getInventoryStock(nextState, currentItemId) + 1
  }

  if (transferredFromAssignment) {
    nextInventory[itemId] = getInventoryStock(nextState, itemId)
  }

  const targetAgent = nextState.agents[agentId]
  const nextAgent = withEquipmentEffectScaleMap({
    ...withSlotItem(targetAgent, slot, itemId),
    equipmentEffectScales: {
      ...(targetAgent.equipmentEffectScales ?? {}),
      [itemId]: Math.max(1, Math.trunc(definition.legacyEffectScale)),
    },
  })

  const nextEquipmentInstances = { ...(nextState.equipmentInstances ?? {}) }
  if (currentInstance) {
    nextEquipmentInstances[currentInstance.instanceId] = {
      ...currentInstance,
      location: { state: 'stored' },
    }
  }
  if (transferredInstance) {
    nextEquipmentInstances[transferredInstance.instanceId] = {
      ...transferredInstance,
      location: { state: 'equipped', agentId, slot },
    }
  }

  return normalizeGameState({
    ...nextState,
    inventory: nextInventory,
    equipmentInstances: nextEquipmentInstances,
    agents: {
      ...nextState.agents,
      [agentId]: nextAgent,
    },
  })
}

export function equipStoredEquipmentInstance(
  state: GameState,
  instanceId: EquipmentInstanceId,
  agentId: Id,
  slot: EquipmentSlotKind
): GameState {
  const instance = getEquipmentInstance(state, instanceId)
  if (!instance || instance.location.state !== 'stored') {
    return ensureNormalizedGameState(state)
  }

  const direct = relocateEquipmentInstance(state, instanceId, {
    state: 'equipped',
    agentId,
    slot,
  })
  if (direct.ok) return direct.state
  if (direct.code !== 'slot_occupied') return ensureNormalizedGameState(state)

  const occupyingInstance = getEquipmentInstanceAtAgentSlot(state, agentId, slot)
  let interim = state
  if (occupyingInstance) {
    const stored = relocateEquipmentInstance(state, occupyingInstance.instanceId, {
      state: 'stored',
    })
    if (!stored.ok) return ensureNormalizedGameState(state)
    interim = stored.state
  } else if (getEquipmentSlotItemId(state.agents[agentId]?.equipmentSlots, slot)) {
    interim = unequipAgentItem(state, agentId, slot)
  }

  const relocated = relocateEquipmentInstance(interim, instanceId, {
    state: 'equipped',
    agentId,
    slot,
  })
  return relocated.ok ? relocated.state : ensureNormalizedGameState(state)
}

export function canEquipStoredEquipmentInstance(
  state: GameState,
  instanceId: EquipmentInstanceId,
  agentId: Id,
  slot: EquipmentSlotKind
): boolean {
  const instance = getEquipmentInstance(state, instanceId)
  const agent = state.agents[agentId]
  if (!instance || instance.location.state !== 'stored' || !canEditAgentEquipment(agent)) {
    return false
  }

  return validateAgentLoadoutAssignment(agent, slot, instance.definitionId, {
    state: {
      ...state,
      inventory: {
        ...state.inventory,
        [instance.definitionId]: getInventoryStock(state, instance.definitionId) + 1,
      },
    },
  }).valid
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

  const currentInstance = getEquipmentInstanceAtAgentSlot(state, agentId, slot)
  const currentItemId =
    currentInstance?.definitionId ?? getEquipmentSlotItemId(agent.equipmentSlots, slot)
  if (!currentItemId) {
    return ensureNormalizedGameState(state)
  }

  const nextAgent = clearAgentSlot(agent, slot)
  return normalizeGameState({
    ...state,
    inventory: currentInstance
      ? state.inventory
      : {
          ...state.inventory,
          [currentItemId]: getInventoryStock(state, currentItemId) + 1,
        },
    equipmentInstances: currentInstance
      ? {
          ...(state.equipmentInstances ?? {}),
          [currentInstance.instanceId]: {
            ...currentInstance,
            location: { state: 'stored' },
          },
        }
      : state.equipmentInstances,
    agents: {
      ...state.agents,
      [agentId]: nextAgent,
    },
  })
}
