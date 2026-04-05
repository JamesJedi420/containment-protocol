import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { listEquippedItemAssignments } from '../domain/equipment'
import { equipAgentItem, unequipAgentItem } from '../domain/sim/equipment'
import { computeTeamScore } from '../domain/sim/scoring'
import { getTeamMembers } from '../domain/teamSimulation'

describe('equipment simulation', () => {
  it('equips an item by consuming inventory and filling the requested slot', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const next = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')

    expect(next.inventory.signal_jammers).toBe(0)
    expect(next.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(next.agents.a_mina.equipment?.signal_jammers).toBe(1)
  })

  it('unequips an item by clearing the slot and returning inventory stock', () => {
    const state = createStartingState()
    state.inventory.medkits = 1

    const equipped = equipAgentItem(state, 'a_casey', 'utility2', 'medkits')
    const next = unequipAgentItem(equipped, 'a_casey', 'utility2')

    expect(next.inventory.medkits).toBe(1)
    expect(next.agents.a_casey.equipmentSlots?.utility2).toBeUndefined()
    expect(next.agents.a_casey.equipment?.medkits).toBeUndefined()
  })

  it('replaces an equipped item by returning prior stock and consuming the new item', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.signal_jammers = 1

    const first = equipAgentItem(state, 'a_mina', 'utility1', 'ward_seals')
    const next = equipAgentItem(first, 'a_mina', 'utility1', 'signal_jammers')

    expect(next.inventory.ward_seals).toBe(1)
    expect(next.inventory.signal_jammers).toBe(0)
    expect(next.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(next.agents.a_mina.equipment?.ward_seals).toBeUndefined()
    expect(next.agents.a_mina.equipment?.signal_jammers).toBe(1)
  })

  it('canonicalizes equipped item quality to the fixed catalog definition', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.agents.a_mina = {
      ...state.agents.a_mina,
      equipment: {
        signal_jammers: 9,
      },
    }

    const next = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')

    expect(next.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(next.agents.a_mina.equipment?.signal_jammers).toBe(1)
  })

  it('safely reassigns an equipped item between idle agents when stock is unavailable', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const equipped = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')
    const next = equipAgentItem(equipped, 'a_casey', 'utility1', 'signal_jammers')

    expect(next.inventory.signal_jammers).toBe(0)
    expect(next.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(next.agents.a_mina.equipment?.signal_jammers).toBeUndefined()
    expect(next.agents.a_casey.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(listEquippedItemAssignments(next.agents, 'signal_jammers')).toEqual([
      {
        itemId: 'signal_jammers',
        agentId: 'a_casey',
        slot: 'utility1',
      },
    ])
  })

  it('reassigns an equipped item between compatible slots on the same idle agent without creating duplicates', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1

    const first = equipAgentItem(state, 'a_mina', 'utility1', 'ward_seals')
    const next = equipAgentItem(first, 'a_mina', 'secondary', 'ward_seals')

    expect(next.inventory.ward_seals).toBe(0)
    expect(next.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(next.agents.a_mina.equipmentSlots?.secondary).toBe('ward_seals')
    expect(listEquippedItemAssignments(next.agents, 'ward_seals')).toEqual([
      {
        itemId: 'ward_seals',
        agentId: 'a_mina',
        slot: 'secondary',
      },
    ])
  })

  it('does not strip gear from a non-idle owner during reassignment attempts', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const equipped = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')
    equipped.agents.a_mina = {
      ...equipped.agents.a_mina,
      assignment: {
        state: 'assigned',
        startedWeek: 1,
        teamId: 't_nightwatch',
        caseId: 'case-001',
      },
    }

    const next = equipAgentItem(equipped, 'a_casey', 'utility1', 'signal_jammers')

    expect(next.inventory.signal_jammers).toBe(0)
    expect(next.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(next.agents.a_casey.equipmentSlots?.utility1).toBeUndefined()
    expect(listEquippedItemAssignments(next.agents, 'signal_jammers')).toEqual([
      {
        itemId: 'signal_jammers',
        agentId: 'a_mina',
        slot: 'utility1',
      },
    ])
  })

  it('blocks equipment changes when the operative is not idle', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.agents.a_mina = {
      ...state.agents.a_mina,
      assignment: {
        state: 'training',
        startedWeek: 1,
        trainingProgramId: 'analysis-lab',
      },
    }

    const next = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')

    expect(next.inventory.signal_jammers).toBe(1)
    expect(next.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(next.agents.a_mina.assignment?.state).toBe('training')
  })

  it('uses crafted output items in the same deterministic loadout system', () => {
    const state = createStartingState()
    state.inventory.emf_sensors = 1

    const next = equipAgentItem(state, 'a_mina', 'utility2', 'emf_sensors')

    expect(next.inventory.emf_sensors).toBe(0)
    expect(next.agents.a_mina.equipmentSlots?.utility2).toBe('emf_sensors')
    expect(next.agents.a_mina.equipment?.emf_sensors).toBe(1)
  })

  it('feeds equipped gear into deterministic team score evaluation', () => {
    const state = createStartingState()
    state.inventory.field_plate = 1
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['combat', 'breach'],
      requiredTags: [],
      preferredTags: [],
      weights: { combat: 0.7, investigation: 0.1, utility: 0.1, social: 0.1 },
    }

    const currentCase = state.cases['case-001']
    const team = state.teams.t_nightwatch
    const beforeScore = computeTeamScore(getTeamMembers(team, state.agents), currentCase, {
      inventory: state.inventory,
      supportTags: team.tags,
      leaderId: team.leaderId ?? null,
    })
    const next = equipAgentItem(state, 'a_ava', 'armor', 'field_plate')
    const afterScore = computeTeamScore(
      getTeamMembers(next.teams.t_nightwatch, next.agents),
      currentCase,
      {
        inventory: next.inventory,
        supportTags: next.teams.t_nightwatch.tags,
        leaderId: next.teams.t_nightwatch.leaderId ?? null,
      }
    )

    expect(afterScore.score).toBeGreaterThan(beforeScore.score)
    expect(afterScore.equipmentSummary.loadout.equippedItemCount).toBe(1)
    expect(afterScore.equipmentSummary.loadout.equippedItemIds).toContain('field_plate')
    expect(afterScore.powerSummary.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'field_plate',
          equippedCount: 1,
          stockOnHand: 0,
        }),
      ])
    )
  })
})
