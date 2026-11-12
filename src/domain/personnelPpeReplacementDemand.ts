/**
 * SPE-3441 — personnel PPE replacement demand and authorized fulfillment (slice 1).
 *
 * Pure deficit/candidate resolution over authored role PPE requirements, actual
 * assignment, instance serviceability, stock, and SPE-3394 wearable legality.
 * Fulfillment mutates only through canonical equip (`equipAgentItem` /
 * `equipStoredEquipmentInstance`). Does not own repair (SPE-877), procurement,
 * presets, or a parallel inventory/readiness formula.
 */

import type { Agent, GameState, Id } from './models'
import {
  EQUIPMENT_SLOT_KINDS,
  getEquipmentDefinition,
  getEquipmentSlotItemId,
  validateAgentLoadoutAssignment,
  type EquipmentSlotKind,
} from './equipment'
import {
  getEquipmentInstanceAtAgentSlot,
  listStoredEquipmentInstances,
  type EquipmentInstanceId,
} from './equipmentInstance'

export const PPE_REPLACEMENT_DEMAND_OWNER = 'SPE-3441' as const

export const PPE_DEFICIT_REASONS = [
  'missing_assignment',
  'unserviceable',
  'wrong_definition',
  'insufficient_capability',
  'stock_unavailable',
  'candidate_incompatible',
  'agent_not_editable',
] as const
export type PpeDeficitReason = (typeof PPE_DEFICIT_REASONS)[number]

export interface PersonnelPpeRequirement {
  readonly requirementId: string
  readonly role: Agent['role']
  readonly slot: EquipmentSlotKind
  /** Preferred catalog definition that satisfies the requirement. */
  readonly requiredDefinitionId: string
  /** Capability tags the assigned item must cover (any match). */
  readonly requiredTags: readonly string[]
}

/** Bounded authored fixture: medic armor requires hazmat_suit (biocontainment). */
export const PERSONNEL_PPE_REQUIREMENT_FIXTURES: readonly PersonnelPpeRequirement[] = [
  {
    requirementId: 'ppe:medic:armor:hazmat_suit',
    role: 'medic',
    slot: 'armor',
    requiredDefinitionId: 'hazmat_suit',
    requiredTags: ['biocontainment'],
  },
]

export interface PpeDemandInput {
  readonly agentId: Id
  readonly requirementId: string
}

export interface PpeDemandPacket {
  readonly demandId: string
  readonly agentId: Id
  readonly requirementId: string
  readonly slot: EquipmentSlotKind
  readonly requiredDefinitionId: string
  readonly unmet: boolean
  readonly reasons: readonly PpeDeficitReason[]
  readonly currentDefinitionId?: string
  readonly currentCondition?: 'operational' | 'damaged'
  readonly candidateDefinitionId?: string
  readonly candidateStock: number
  readonly fulfillable: boolean
}

export interface PpeFulfillmentResult {
  readonly ok: boolean
  readonly state: GameState
  readonly demandId: string
  readonly reasons: readonly PpeDeficitReason[]
}

function requirementById(requirementId: string): PersonnelPpeRequirement | undefined {
  return PERSONNEL_PPE_REQUIREMENT_FIXTURES.find((row) => row.requirementId === requirementId)
}

function buildDemandId(agentId: Id, requirementId: string): string {
  return `ppe-demand:${agentId}:${requirementId}`
}

function agentEditable(agent: Agent | undefined): boolean {
  return Boolean(agent && agent.status === 'active' && agent.assignment?.state === 'idle')
}

function itemCoversRequirement(
  definitionId: string,
  requirement: PersonnelPpeRequirement
): boolean {
  if (definitionId === requirement.requiredDefinitionId) {
    return true
  }
  const definition = getEquipmentDefinition(definitionId)
  if (!definition) {
    return false
  }
  return requirement.requiredTags.some((tag) => definition.tags.includes(tag))
}

function catalogStock(state: GameState, itemId: string): number {
  // Damaged aggregate lots are not eligible replacement stock (SPE-877 queue).
  if ((state.damagedEquipmentQueue ?? []).includes(itemId)) {
    return 0
  }
  return Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
}

/**
 * Resolve one personnel PPE demand packet from authoritative assignment,
 * instance condition, and inventory stock. Wearable legality is checked at
 * fulfillment via `validateAgentLoadoutAssignment` (SPE-3394).
 */
export function resolvePersonnelPpeDemand(
  state: GameState,
  input: PpeDemandInput
): PpeDemandPacket | undefined {
  const requirement = requirementById(input.requirementId)
  if (!requirement) {
    return undefined
  }

  const agent = state.agents[input.agentId]
  const demandId = buildDemandId(input.agentId, requirement.requirementId)
  const reasons: PpeDeficitReason[] = []

  if (!agent || agent.role !== requirement.role) {
    return undefined
  }

  if (!agentEditable(agent)) {
    reasons.push('agent_not_editable')
  }

  const currentDefinitionId = getEquipmentSlotItemId(agent.equipmentSlots, requirement.slot)
  const instance = getEquipmentInstanceAtAgentSlot(state, input.agentId, requirement.slot)
  const currentCondition = instance?.condition

  if (!currentDefinitionId) {
    reasons.push('missing_assignment')
  } else {
    if (currentCondition === 'damaged') {
      reasons.push('unserviceable')
    }
    if (!itemCoversRequirement(currentDefinitionId, requirement)) {
      if (currentDefinitionId !== requirement.requiredDefinitionId) {
        reasons.push('wrong_definition')
      }
      reasons.push('insufficient_capability')
    }
  }

  const candidateDefinitionId = requirement.requiredDefinitionId
  const candidateStock = catalogStock(state, candidateDefinitionId)
  const hasStoredOperational = listStoredEquipmentInstances(state).some(
    (entry) =>
      entry.definitionId === candidateDefinitionId && entry.condition === 'operational'
  )

  const unmet =
    reasons.includes('missing_assignment') ||
    reasons.includes('unserviceable') ||
    reasons.includes('wrong_definition') ||
    reasons.includes('insufficient_capability')

  if (unmet && candidateStock <= 0 && !hasStoredOperational) {
    reasons.push('stock_unavailable')
  }

  const uniqueReasons = [...new Set(reasons)]
  const fulfillable =
    unmet &&
    agentEditable(agent) &&
    !uniqueReasons.includes('stock_unavailable') &&
    !uniqueReasons.includes('agent_not_editable')

  return {
    demandId,
    agentId: input.agentId,
    requirementId: requirement.requirementId,
    slot: requirement.slot,
    requiredDefinitionId: requirement.requiredDefinitionId,
    unmet,
    reasons: uniqueReasons,
    ...(currentDefinitionId ? { currentDefinitionId } : {}),
    ...(currentCondition ? { currentCondition } : {}),
    candidateDefinitionId,
    candidateStock,
    fulfillable,
  }
}

export function listPersonnelPpeDemandsForAgent(
  state: GameState,
  agentId: Id
): PpeDemandPacket[] {
  const agent = state.agents[agentId]
  if (!agent) {
    return []
  }
  return PERSONNEL_PPE_REQUIREMENT_FIXTURES.filter((row) => row.role === agent.role)
    .map((row) =>
      resolvePersonnelPpeDemand(state, {
        agentId,
        requirementId: row.requirementId,
      })
    )
    .filter((packet): packet is PpeDemandPacket => packet !== undefined)
}

export function listUnmetPersonnelPpeDemands(state: GameState): PpeDemandPacket[] {
  const packets: PpeDemandPacket[] = []
  for (const agent of Object.values(state.agents)) {
    for (const packet of listPersonnelPpeDemandsForAgent(state, agent.id)) {
      if (packet.unmet) {
        packets.push(packet)
      }
    }
  }
  packets.sort((left, right) => {
    if (left.agentId < right.agentId) return -1
    if (left.agentId > right.agentId) return 1
    if (left.requirementId < right.requirementId) return -1
    if (left.requirementId > right.requirementId) return 1
    return 0
  })
  return packets
}

export interface AuthorizePpeFulfillmentDeps {
  equipAgentItem: (
    state: GameState,
    agentId: Id,
    slot: EquipmentSlotKind,
    itemId: string
  ) => GameState
  equipStoredEquipmentInstance?: (
    state: GameState,
    instanceId: EquipmentInstanceId,
    agentId: Id,
    slot: EquipmentSlotKind
  ) => GameState
}

/**
 * Authorized fulfillment: revalidate demand + loadout, then equip via canonical path.
 */
export function authorizePersonnelPpeFulfillment(
  state: GameState,
  input: PpeDemandInput,
  deps: AuthorizePpeFulfillmentDeps
): PpeFulfillmentResult {
  const demand = resolvePersonnelPpeDemand(state, input)
  if (!demand) {
    return {
      ok: false,
      state,
      demandId: buildDemandId(input.agentId, input.requirementId),
      reasons: ['insufficient_capability'],
    }
  }

  if (!demand.unmet) {
    return { ok: false, state, demandId: demand.demandId, reasons: [] }
  }

  if (!demand.fulfillable) {
    return {
      ok: false,
      state,
      demandId: demand.demandId,
      reasons: demand.reasons,
    }
  }

  const agent = state.agents[input.agentId]
  if (!agent) {
    return {
      ok: false,
      state,
      demandId: demand.demandId,
      reasons: ['agent_not_editable'],
    }
  }

  const itemId = demand.requiredDefinitionId
  const preferCatalog = catalogStock(state, itemId) > 0
  const stored = preferCatalog
    ? undefined
    : listStoredEquipmentInstances(state).find(
        (entry) => entry.definitionId === itemId && entry.condition === 'operational'
      )

  // Stored candidates are validated with +1 phantom catalog stock (same contract as
  // canEquipStoredEquipmentInstance) so inventory-unavailable does not false-deny.
  const validationState: GameState = stored
    ? {
        ...state,
        inventory: {
          ...state.inventory,
          [itemId]: catalogStock(state, itemId) + 1,
        },
      }
    : state
  const validation = validateAgentLoadoutAssignment(agent, demand.slot, itemId, {
    state: validationState,
  })
  if (!validation.valid) {
    return {
      ok: false,
      state,
      demandId: demand.demandId,
      reasons: ['candidate_incompatible'],
    }
  }

  const nextState =
    stored && deps.equipStoredEquipmentInstance
      ? deps.equipStoredEquipmentInstance(state, stored.instanceId, input.agentId, demand.slot)
      : deps.equipAgentItem(state, input.agentId, demand.slot, itemId)

  const after = resolvePersonnelPpeDemand(nextState, input)
  const equipped = getEquipmentSlotItemId(
    nextState.agents[input.agentId]?.equipmentSlots,
    demand.slot
  )
  if (!after || after.unmet || equipped !== itemId) {
    return {
      ok: false,
      state,
      demandId: demand.demandId,
      reasons: ['stock_unavailable'],
    }
  }

  return {
    ok: true,
    state: nextState,
    demandId: demand.demandId,
    reasons: [],
  }
}

const PPE_DEFICIT_REASON_LABELS: Record<PpeDeficitReason, string> = {
  missing_assignment: 'Required PPE is not assigned',
  unserviceable: 'Assigned PPE is unserviceable',
  wrong_definition: 'Assigned item is not the required PPE definition',
  insufficient_capability: 'Assigned item lacks required protective capability',
  stock_unavailable: 'No eligible replacement stock available',
  candidate_incompatible: 'Replacement candidate failed loadout validation',
  agent_not_editable: 'Operative cannot change loadout in current state',
}

export function getPpeDeficitReasonLabel(reason: PpeDeficitReason): string {
  return PPE_DEFICIT_REASON_LABELS[reason]
}

/** Stable projection rows for Equipment loadout / readiness consumers. */
export interface PersonnelPpeDemandViewRow {
  readonly demandId: string
  readonly agentId: Id
  readonly agentName: string
  readonly requirementId: string
  readonly slot: EquipmentSlotKind
  readonly requiredDefinitionId: string
  readonly unmet: boolean
  readonly fulfillable: boolean
  readonly reasons: readonly PpeDeficitReason[]
  readonly reasonSummary: string
}

export function projectPersonnelPpeDemandViews(state: GameState): PersonnelPpeDemandViewRow[] {
  return listUnmetPersonnelPpeDemands(state).map((packet) => {
    const agent = state.agents[packet.agentId]
    return {
      demandId: packet.demandId,
      agentId: packet.agentId,
      agentName: agent?.name ?? packet.agentId,
      requirementId: packet.requirementId,
      slot: packet.slot,
      requiredDefinitionId: packet.requiredDefinitionId,
      unmet: packet.unmet,
      fulfillable: packet.fulfillable,
      reasons: packet.reasons,
      reasonSummary: packet.reasons.join(', ') || 'none',
    }
  })
}

export function listPersonnelPpeRequirementFixtures(): readonly PersonnelPpeRequirement[] {
  return PERSONNEL_PPE_REQUIREMENT_FIXTURES
}

export function listSupportedPpeSlots(): readonly EquipmentSlotKind[] {
  return EQUIPMENT_SLOT_KINDS
}
