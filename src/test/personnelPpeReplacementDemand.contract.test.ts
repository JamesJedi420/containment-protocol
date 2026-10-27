import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createStarterAgent } from '../domain/templates/classTables'
import {
  authorizePersonnelPpeFulfillment,
  getPpeDeficitReasonLabel,
  listPersonnelPpeRequirementFixtures,
  listUnmetPersonnelPpeDemands,
  PPE_REPLACEMENT_DEMAND_OWNER,
  projectPersonnelPpeDemandViews,
  resolvePersonnelPpeDemand,
} from '../domain/personnelPpeReplacementDemand'
import {
  buildAgentLoadoutReadinessSummary,
  getEquipmentSlotItemId,
} from '../domain/equipment'
import { instantiateEquipmentInstance } from '../domain/equipmentInstance'
import { equipAgentItem, equipStoredEquipmentInstance } from '../domain/sim/equipment'
import type { Agent, AgentAssignmentState, GameState } from '../domain/models'

const MEDIC_PPE_REQUIREMENT = 'ppe:medic:armor:hazmat_suit'

const fulfillmentDeps = {
  equipAgentItem,
  equipStoredEquipmentInstance,
}

function withMedic(
  state: GameState,
  options: {
    equipmentSlots?: Agent['equipmentSlots']
    assignment?: AgentAssignmentState
  } = {}
) {
  const baseMedic = createStarterAgent({
    id: 'agent-ppe-medic',
    name: 'PPE Medic',
    role: 'medic',
  })
  const medic: Agent = {
    ...baseMedic,
    ...(options.equipmentSlots ? { equipmentSlots: options.equipmentSlots } : {}),
    ...(options.assignment ? { assignment: options.assignment } : {}),
  }
  return {
    state: {
      ...state,
      agents: {
        ...state.agents,
        [medic.id]: medic,
      },
    } satisfies GameState,
    medicId: medic.id,
  }
}

describe('SPE-3441 personnel PPE replacement demand', () => {
  it('owns the PPE demand slice boundary', () => {
    expect(PPE_REPLACEMENT_DEMAND_OWNER).toBe('SPE-3441')
    expect(listPersonnelPpeRequirementFixtures()).toEqual([
      expect.objectContaining({
        requirementId: MEDIC_PPE_REQUIREMENT,
        role: 'medic',
        slot: 'armor',
        requiredDefinitionId: 'hazmat_suit',
      }),
    ])
    expect(getPpeDeficitReasonLabel('missing_assignment')).toMatch(/not assigned/i)
  })

  it('emits unmet demand when required PPE is missing', () => {
    const base = createStartingState()
    const { state, medicId } = withMedic(base)
    const demand = resolvePersonnelPpeDemand(state, {
      agentId: medicId,
      requirementId: MEDIC_PPE_REQUIREMENT,
    })

    expect(demand).toMatchObject({
      unmet: true,
      fulfillable: false,
      reasons: expect.arrayContaining(['missing_assignment', 'stock_unavailable']),
      requiredDefinitionId: 'hazmat_suit',
      candidateStock: 0,
    })
    expect(listUnmetPersonnelPpeDemands(state).map((row) => row.agentId)).toContain(medicId)
  })

  it('marks demand unserviceable when equipped instance is damaged', () => {
    const base = createStartingState()
    const { state: withAgent, medicId } = withMedic(base)
    const stocked: GameState = {
      ...withAgent,
      inventory: { ...withAgent.inventory, hazmat_suit: 1 },
    }
    const created = instantiateEquipmentInstance(stocked, 'hazmat_suit', {
      condition: 'damaged',
      location: { state: 'equipped', agentId: medicId, slot: 'armor' },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const demand = resolvePersonnelPpeDemand(created.state, {
      agentId: medicId,
      requirementId: MEDIC_PPE_REQUIREMENT,
    })
    expect(demand?.unmet).toBe(true)
    expect(demand?.reasons).toContain('unserviceable')
    expect(demand?.currentCondition).toBe('damaged')
  })

  it('flags wrong definition when armor lacks biocontainment capability', () => {
    const base = createStartingState()
    const { state, medicId } = withMedic(base, {
      equipmentSlots: { armor: 'fixture_wearable_mid_torso_vest' },
    })
    expect(getEquipmentSlotItemId(state.agents[medicId]?.equipmentSlots, 'armor')).toBe(
      'fixture_wearable_mid_torso_vest'
    )
    const demand = resolvePersonnelPpeDemand(state, {
      agentId: medicId,
      requirementId: MEDIC_PPE_REQUIREMENT,
    })
    expect(demand?.unmet).toBe(true)
    expect(demand?.reasons).toEqual(
      expect.arrayContaining(['wrong_definition', 'insufficient_capability', 'stock_unavailable'])
    )
  })

  it('fulfills authorized replacement from catalog stock through canonical equip', () => {
    const base = createStartingState()
    const { state: seeded, medicId } = withMedic(base)
    const withStock: GameState = {
      ...seeded,
      inventory: {
        ...seeded.inventory,
        hazmat_suit: 1,
      },
    }

    const beforeViews = projectPersonnelPpeDemandViews(withStock)
    expect(beforeViews.some((row) => row.agentId === medicId && row.fulfillable)).toBe(true)

    const result = authorizePersonnelPpeFulfillment(
      withStock,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(result.ok).toBe(true)
    expect(getEquipmentSlotItemId(result.state.agents[medicId]?.equipmentSlots, 'armor')).toBe(
      'hazmat_suit'
    )
    expect(result.state.inventory.hazmat_suit ?? 0).toBe(0)

    const after = resolvePersonnelPpeDemand(result.state, {
      agentId: medicId,
      requirementId: MEDIC_PPE_REQUIREMENT,
    })
    expect(after?.unmet).toBe(false)
    expect(projectPersonnelPpeDemandViews(result.state).some((row) => row.agentId === medicId)).toBe(
      false
    )

    const readiness = buildAgentLoadoutReadinessSummary(result.state.agents[medicId]!, {
      state: result.state,
    })
    expect(readiness.equippedItemCount).toBeGreaterThan(0)
  })

  it('replaces a damaged required PPE instance from catalog stock', () => {
    const base = createStartingState()
    const { state: withAgent, medicId } = withMedic(base)
    const stocked: GameState = {
      ...withAgent,
      inventory: { ...withAgent.inventory, hazmat_suit: 2 },
    }
    const created = instantiateEquipmentInstance(stocked, 'hazmat_suit', {
      condition: 'damaged',
      location: { state: 'equipped', agentId: medicId, slot: 'armor' },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.state.inventory.hazmat_suit ?? 0).toBe(1)

    const result = authorizePersonnelPpeFulfillment(
      created.state,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )

    expect(result.ok).toBe(true)
    expect(result.state.inventory.hazmat_suit ?? 0).toBe(0)
    expect(getEquipmentSlotItemId(result.state.agents[medicId]?.equipmentSlots, 'armor')).toBe(
      'hazmat_suit'
    )
    expect(
      resolvePersonnelPpeDemand(result.state, {
        agentId: medicId,
        requirementId: MEDIC_PPE_REQUIREMENT,
      })?.unmet
    ).toBe(false)
  })

  it('fulfills from stored operational instance when catalog stock is empty', () => {
    const base = createStartingState()
    const { state: seeded, medicId } = withMedic(base)
    const stocked: GameState = {
      ...seeded,
      inventory: { ...seeded.inventory, hazmat_suit: 1 },
    }
    const created = instantiateEquipmentInstance(stocked, 'hazmat_suit', {
      condition: 'operational',
      location: { state: 'stored' },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.state.inventory.hazmat_suit ?? 0).toBe(0)

    const result = authorizePersonnelPpeFulfillment(
      created.state,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(result.ok).toBe(true)
    expect(getEquipmentSlotItemId(result.state.agents[medicId]?.equipmentSlots, 'armor')).toBe(
      'hazmat_suit'
    )
  })

  it('denies fulfillment without stock and leaves assignments untouched', () => {
    const base = createStartingState()
    const { state, medicId } = withMedic(base, {
      equipmentSlots: { armor: 'fixture_wearable_mid_torso_vest' },
    })
    const inventoryBefore = { ...state.inventory }
    const result = authorizePersonnelPpeFulfillment(
      state,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(result.ok).toBe(false)
    expect(result.reasons).toContain('stock_unavailable')
    expect(result.state).toBe(state)
    expect(result.state.inventory).toEqual(inventoryBefore)
    expect(getEquipmentSlotItemId(result.state.agents[medicId]?.equipmentSlots, 'armor')).toBe(
      'fixture_wearable_mid_torso_vest'
    )
  })

  it('denies fulfillment while operative is not editable', () => {
    const base = createStartingState()
    const { state, medicId } = withMedic(base, {
      assignment: {
        state: 'assigned',
        caseId: 'case-1',
        teamId: 'team-1',
        startedWeek: 1,
      },
    })
    expect(state.agents[medicId]?.assignment?.state).toBe('assigned')
    const withStock: GameState = {
      ...state,
      inventory: { ...state.inventory, hazmat_suit: 1 },
    }
    const result = authorizePersonnelPpeFulfillment(
      withStock,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(result.ok).toBe(false)
    expect(result.reasons).toContain('agent_not_editable')
    expect(result.state).toBe(withStock)
  })

  it('is idempotent: second fulfillment after success does not consume stock twice', () => {
    const base = createStartingState()
    const { state: seeded, medicId } = withMedic(base)
    const withStock: GameState = {
      ...seeded,
      inventory: { ...seeded.inventory, hazmat_suit: 2 },
    }
    const first = authorizePersonnelPpeFulfillment(
      withStock,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(first.ok).toBe(true)
    expect(first.state.inventory.hazmat_suit).toBe(1)

    const second = authorizePersonnelPpeFulfillment(
      first.state,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(second.ok).toBe(false)
    expect(second.state.inventory.hazmat_suit).toBe(1)
    expect(getEquipmentSlotItemId(second.state.agents[medicId]?.equipmentSlots, 'armor')).toBe(
      'hazmat_suit'
    )
  })

  it('rolls back when the equip mutation does not apply the replacement', () => {
    const base = createStartingState()
    const { state: seeded, medicId } = withMedic(base)
    const withStock: GameState = {
      ...seeded,
      inventory: { ...seeded.inventory, hazmat_suit: 1 },
    }
    const noopDeps = {
      equipAgentItem: (game: GameState) => game,
    }
    const denied = authorizePersonnelPpeFulfillment(
      withStock,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      noopDeps
    )
    expect(denied.ok).toBe(false)
    expect(denied.reasons).toContain('stock_unavailable')
    expect(denied.state).toBe(withStock)
    expect(getEquipmentSlotItemId(denied.state.agents[medicId]?.equipmentSlots, 'armor')).toBeUndefined()
  })

  it('rejects damaged stored hazmat as fulfillment stock', () => {
    const base = createStartingState()
    const { state: seeded, medicId } = withMedic(base)
    const stocked: GameState = {
      ...seeded,
      inventory: { ...seeded.inventory, hazmat_suit: 1 },
    }
    const created = instantiateEquipmentInstance(stocked, 'hazmat_suit', {
      condition: 'damaged',
      location: { state: 'stored' },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const demand = resolvePersonnelPpeDemand(created.state, {
      agentId: medicId,
      requirementId: MEDIC_PPE_REQUIREMENT,
    })
    expect(demand?.fulfillable).toBe(false)
    expect(demand?.reasons).toContain('stock_unavailable')
    const result = authorizePersonnelPpeFulfillment(
      created.state,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(result.ok).toBe(false)
  })

  it('excludes damaged aggregate queue stock from fulfillment candidates', () => {
    const base = createStartingState()
    const { state: seeded, medicId } = withMedic(base)
    const withDamagedLot: GameState = {
      ...seeded,
      inventory: { ...seeded.inventory, hazmat_suit: 1 },
      damagedEquipmentQueue: [...(seeded.damagedEquipmentQueue ?? []), 'hazmat_suit'],
    }
    const demand = resolvePersonnelPpeDemand(withDamagedLot, {
      agentId: medicId,
      requirementId: MEDIC_PPE_REQUIREMENT,
    })
    expect(demand?.fulfillable).toBe(false)
    expect(demand?.reasons).toContain('stock_unavailable')
    const result = authorizePersonnelPpeFulfillment(
      withDamagedLot,
      { agentId: medicId, requirementId: MEDIC_PPE_REQUIREMENT },
      fulfillmentDeps
    )
    expect(result.ok).toBe(false)
    expect(result.state).toBe(withDamagedLot)
  })
})
