import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyEquipmentInstanceTransition,
  getEquipmentInstance,
  getEquipmentInstanceAtAgentSlot,
  instantiateEquipmentInstance,
  relocateEquipmentInstance,
  sanitizeEquipmentInstanceRegistry,
} from '../domain/equipmentInstance'
import { equipAgentItem, unequipAgentItem } from '../domain/sim/equipment'
import { hydrateGame } from '../app/store/runTransfer'

describe('SPE-2828 ordinary equipment instance authority', () => {
  it('instantiates one deterministic stored object and decrements aggregate stock exactly once', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2

    const first = instantiateEquipmentInstance(state, 'signal_jammers')
    expect(first).toMatchObject({
      ok: true,
      instance: {
        instanceId: 'equipment-instance-1-1',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    })
    if (!first.ok) throw new Error(first.code)
    expect(first.state.inventory.signal_jammers).toBe(1)

    const second = instantiateEquipmentInstance(first.state, 'signal_jammers')
    expect(second).toMatchObject({ ok: true, instance: { instanceId: 'equipment-instance-1-2' } })
    expect(second.state.inventory.signal_jammers).toBe(0)
  })

  it('fails closed for unavailable, unknown, and item-level damaged stock', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.damagedEquipmentQueue = ['signal_jammers']

    expect(instantiateEquipmentInstance(state, 'missing')).toMatchObject({
      ok: false,
      code: 'unknown_definition',
    })
    expect(instantiateEquipmentInstance(state, 'signal_jammers')).toMatchObject({
      ok: false,
      code: 'damaged_stock_ambiguity',
    })
    state.damagedEquipmentQueue = []
    state.inventory.signal_jammers = 0
    expect(instantiateEquipmentInstance(state, 'signal_jammers')).toMatchObject({
      ok: false,
      code: 'inventory_unavailable',
    })
  })

  it('equips and directly transfers the same authoritative instance between idle agents', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)

    expect(created.state.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(created.state.agents.a_mina.equipmentEffectScales).toEqual({ signal_jammers: 1 })
    expect(getEquipmentInstanceAtAgentSlot(created.state, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )

    const transferred = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility1',
    })
    expect(transferred).toMatchObject({ ok: true })
    if (!transferred.ok) throw new Error(transferred.code)
    expect(transferred.state.inventory.signal_jammers).toBe(0)
    expect(transferred.state.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(transferred.state.agents.a_casey.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(transferred.instance.instanceId).toBe(created.instance.instanceId)
  })

  it('rejects occupied slots and non-idle ownership changes', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.agents.a_casey.equipmentSlots = { utility1: 'medkits' }
    const created = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)

    expect(
      relocateEquipmentInstance(created.state, created.instance.instanceId, {
        state: 'equipped',
        agentId: 'a_casey',
        slot: 'utility1',
      })
    ).toMatchObject({ ok: false, code: 'slot_occupied' })

    const equipped = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    equipped.state.agents.a_mina.assignment = {
      state: 'training',
      startedWeek: 1,
      trainingProgramId: 'analysis-lab',
    }
    expect(
      relocateEquipmentInstance(equipped.state, equipped.instance.instanceId, { state: 'stored' })
    ).toMatchObject({ ok: false, code: 'agent_not_idle' })
  })

  it('applies compare-and-swap mutable state while enforcing identity and payload bounds', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 1
    const created = instantiateEquipmentInstance(state, 'combat_stims', {
      payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 2 },
    })
    if (!created.ok) throw new Error(created.code)
    const expected = created.instance

    const changed = applyEquipmentInstanceTransition(created.state, expected.instanceId, expected, {
      ...expected,
      condition: 'damaged',
      payload: { ...expected.payload!, remaining: 1 },
    })
    expect(changed).toMatchObject({
      ok: true,
      instance: { condition: 'damaged', payload: { capacity: 2, remaining: 1 } },
    })
    if (!changed.ok) throw new Error(changed.code)

    expect(
      applyEquipmentInstanceTransition(changed.state, expected.instanceId, expected, {
        ...expected,
        condition: 'operational',
      })
    ).toMatchObject({ ok: false, code: 'stale_transition' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        {
          ...changed.instance,
          definitionId: 'medkits',
        }
      )
    ).toMatchObject({ ok: false, code: 'immutable_identity' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        {
          ...changed.instance,
          payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 3 },
        }
      )
    ).toMatchObject({ ok: false, code: 'malformed_payload_bounds' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        {
          ...changed.instance,
          location: { state: 'stored', unexpected: true },
        } as never
      )
    ).toMatchObject({ ok: false, code: 'invalid_location' })
  })

  it('preserves instance identity through legacy unequip, replacement, and transfer functions', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)

    const unequipped = unequipAgentItem(created.state, 'a_mina', 'utility1')
    expect(unequipped.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstance(unequipped, created.instance.instanceId)?.location).toEqual({
      state: 'stored',
    })

    const reequipped = relocateEquipmentInstance(unequipped, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!reequipped.ok) throw new Error(reequipped.code)
    const replaced = equipAgentItem(reequipped.state, 'a_mina', 'utility1', 'ward_seals')
    expect(replaced.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstance(replaced, created.instance.instanceId)?.location).toEqual({
      state: 'stored',
    })

    const clearedReplacement = unequipAgentItem(replaced, 'a_mina', 'utility1')
    const moved = relocateEquipmentInstance(clearedReplacement, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility2',
    })
    if (!moved.ok) throw new Error(moved.code)
    const transferred = equipAgentItem(moved.state, 'a_mina', 'utility2', 'signal_jammers')
    expect(transferred.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstanceAtAgentSlot(transferred, 'a_mina', 'utility2')?.instanceId).toBe(
      created.instance.instanceId
    )
  })

  it('hydrates valid entries deterministically, stores later conflicts, and drops malformed siblings', () => {
    const state = createStartingState()
    state.agents.a_mina.equipmentSlots = { utility1: 'medkits' }
    const raw = {
      'equipment-instance-1-2': {
        instanceId: 'equipment-instance-1-2',
        definitionId: 'ward_seals',
        condition: 'operational',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
      },
      'equipment-instance-1-1': {
        instanceId: 'equipment-instance-1-1',
        definitionId: 'signal_jammers',
        condition: 'damaged',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
        payload: { resourceId: 'battery_charge', capacity: 4, remaining: 2 },
      },
      'equipment-instance-1-bad': {
        instanceId: 'wrong-key',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    }

    const hydrated = hydrateGame({ ...state, equipmentInstances: raw })
    expect(sanitizeEquipmentInstanceRegistry(raw, state.agents).issues).toEqual([
      { instanceId: 'equipment-instance-1-2', code: 'duplicate_claim' },
      { instanceId: 'equipment-instance-1-bad', code: 'invalid_instance_id' },
    ])
    expect(Object.keys(hydrated.equipmentInstances ?? {})).toEqual([
      'equipment-instance-1-1',
      'equipment-instance-1-2',
    ])
    expect(hydrated.equipmentInstances?.['equipment-instance-1-1'].location).toEqual({
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(hydrated.equipmentInstances?.['equipment-instance-1-2'].location).toEqual({
      state: 'stored',
    })
    expect(hydrated.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(hydrated.agents.a_mina.equipmentEffectScales).toEqual({ signal_jammers: 1 })

    const roundTripped = hydrateGame(JSON.parse(JSON.stringify(hydrated)))
    expect(roundTripped.equipmentInstances).toEqual(hydrated.equipmentInstances)
    expect(hydrateGame({ ...state, equipmentInstances: undefined }).equipmentInstances).toEqual({})
  })

  it('validates payload and location shapes without inventing ownership', () => {
    const state = createStartingState()
    const result = sanitizeEquipmentInstanceRegistry(
      {
        good: {
          instanceId: 'good',
          definitionId: 'medkits',
          condition: 'operational',
          location: { state: 'stored' },
          payload: { resourceId: 'medical_supply', capacity: 2, remaining: 0 },
        },
        overflow: {
          instanceId: 'overflow',
          definitionId: 'medkits',
          condition: 'operational',
          location: { state: 'stored' },
          payload: { resourceId: 'medical_supply', capacity: 1, remaining: 2 },
        },
        foreign: {
          instanceId: 'foreign',
          definitionId: 'unknown',
          condition: 'operational',
          location: { state: 'stored' },
        },
      },
      state.agents
    )

    expect(Object.keys(result.equipmentInstances)).toEqual(['good'])
    expect(result.issues).toEqual([
      { instanceId: 'foreign', code: 'invalid_instance_id' },
      { instanceId: 'overflow', code: 'invalid_instance_id' },
    ])
  })
})
