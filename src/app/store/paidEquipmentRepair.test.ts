import '../../test/setup'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  applyEquipmentInstanceTransition,
  instantiateEquipmentInstance,
} from '../../domain/equipmentInstance'
import { getCanonicalFundingState } from '../../domain/funding'
import {
  quotePaidEquipmentRepair,
  settlePaidEquipmentRepair,
} from '../../domain/paidEquipmentRepair'
import { loadGameSave, serializeGameSave } from './saveSystem'
import { useGameStore } from './gameStore'

function damaged(classId?: 'blast_door' | 'pressure_seal') {
  const game = createStartingState()
  game.funding = 100
  game.inventory.ward_seals = 1
  const created = instantiateEquipmentInstance(game, 'ward_seals', {
    condition: 'damaged',
    ...(classId
      ? {
          containmentIntegrity: {
            classId,
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' as const },
          },
        }
      : {}),
  })
  if (!created.ok) throw new Error(created.code)
  return created
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('paid equipment repair', () => {
  it('settles the exact quote once, persists its event and cannot replay after load', () => {
    const created = damaged()
    useGameStore.setState({ game: created.state })
    const quote = quotePaidEquipmentRepair(created.state, created.instance.instanceId)
    expect(quote).toMatchObject({ eligible: true, quotedCost: 100 })
    const result = useGameStore
      .getState()
      .repairStoredEquipmentInstanceCondition(created.instance.instanceId, quote.quotedCost)
    expect(result).toMatchObject({
      payment: 'paid',
      charged: 100,
      resultingCondition: 'operational',
    })
    expect(result.state.funding).toBe(0)
    expect(result.state.agency?.funding).toBe(0)
    expect(result.state.agency?.fundingState?.funding).toBe(0)
    expect(result.state.agency?.fundingState?.fundingHistory).toContainEqual(
      expect.objectContaining({
        delta: -100,
        reason: 'equipment_repair',
        sourceId: created.instance.instanceId,
      })
    )
    const loaded = loadGameSave(serializeGameSave(result.state))
    expect(loaded.events.filter((e) => e.type === 'equipment.instance_condition_repaired')).toEqual(
      [
        expect.objectContaining({
          payload: expect.objectContaining({ repairCost: 100, condition: 'operational' }),
        }),
      ]
    )
    useGameStore.setState({ game: loaded })
    const again = useGameStore
      .getState()
      .repairStoredEquipmentInstanceCondition(created.instance.instanceId, quote.quotedCost)
    expect(again).toMatchObject({
      payment: 'not_charged',
      charged: 0,
      failure: 'condition_already_operational',
    })
    expect(useGameStore.getState().game).toBe(loaded)
    expect(loaded.funding).toBe(0)
  })

  it.each([99, -1, NaN])('fails without writes for funding %s', (funding) => {
    const created = damaged()
    const state = { ...created.state, funding }
    const result = settlePaidEquipmentRepair(state, created.instance.instanceId)
    expect(result).toMatchObject({
      payment: 'not_charged',
      charged: 0,
      failure: funding === 99 ? 'insufficient_funding' : 'invalid_funding',
    })
    expect(result.state).toBe(state)
  })

  it('rejects stale quotes and invalid identities without changing state', () => {
    const created = damaged()
    for (const [id, cost, failure] of [
      [created.instance.instanceId, 101, 'stale_quote'],
      ['missing', 100, 'stale_transition'],
      ['__proto__', 100, 'invalid_instance_id'],
    ] as const) {
      const result = settlePaidEquipmentRepair(created.state, id, undefined, cost)
      expect(result).toMatchObject({ payment: 'not_charged', charged: 0, failure })
      expect(result.state).toBe(created.state)
    }
  })

  it('rejects an invalid event week before applying a repair', () => {
    const created = damaged()
    const state = { ...created.state, week: 0 }
    const result = settlePaidEquipmentRepair(state, created.instance.instanceId)
    expect(result).toMatchObject({ payment: 'not_charged', failure: 'invalid_week', charged: 0 })
    expect(result.state).toBe(state)
  })

  it('retains canonical agency mirrors when a legacy agency record is absent', () => {
    const created = damaged()
    const state = { ...created.state, agency: undefined, containmentRating: 63, clearanceLevel: 4 }
    const result = settlePaidEquipmentRepair(state, created.instance.instanceId)
    expect(result.payment).toBe('paid')
    expect(result.state.agency).toMatchObject({
      containmentRating: 63,
      clearanceLevel: 4,
      funding: 0,
    })
  })

  it('preserves both same-week expenses when an identity is damaged and repaired again', () => {
    const created = damaged()
    useGameStore.setState({ game: { ...created.state, funding: 200 } })
    const first = useGameStore
      .getState()
      .repairStoredEquipmentInstanceCondition(created.instance.instanceId, 100)
    expect(first.payment).toBe('paid')
    const current = first.state.equipmentInstances![created.instance.instanceId]!
    const damagedAgain = applyEquipmentInstanceTransition(
      first.state,
      current.instanceId,
      current,
      { ...current, condition: 'damaged' }
    )
    if (!damagedAgain.ok) throw new Error(damagedAgain.code)
    useGameStore.setState({ game: damagedAgain.state })
    const second = useGameStore
      .getState()
      .repairStoredEquipmentInstanceCondition(current.instanceId, 100)
    expect(second.payment).toBe('paid')
    const entries = (game: typeof second.state) =>
      getCanonicalFundingState(game).fundingHistory.filter(
        (entry) => entry.reason === 'equipment_repair' && entry.sourceId === current.instanceId
      )
    expect(second.state.funding).toBe(0)
    expect(entries(second.state)).toHaveLength(2)
    const loaded = loadGameSave(serializeGameSave(second.state))
    expect(loaded.funding).toBe(0)
    expect(entries(loaded)).toHaveLength(2)
    expect(
      loaded.events.filter((event) => event.type === 'equipment.instance_condition_repaired')
    ).toHaveLength(2)
  })

  it('does not consume another named part or charge after a save round trip', () => {
    const created = damaged('pressure_seal')
    useGameStore.setState({
      game: { ...created.state, facilityStockpile: { pressure_seal_gasket: 2 } },
    })
    const result = useGameStore
      .getState()
      .repairStoredEquipmentInstanceCondition(created.instance.instanceId, 100)
    expect(result.payment).toBe('paid')
    const loaded = loadGameSave(serializeGameSave(result.state))
    expect(loaded.facilityStockpile).toEqual({ pressure_seal_gasket: 1 })
    useGameStore.setState({ game: loaded })
    expect(
      useGameStore
        .getState()
        .repairStoredEquipmentInstanceCondition(created.instance.instanceId, 100)
    ).toMatchObject({ payment: 'not_charged', failure: 'condition_already_operational' })
    expect(useGameStore.getState().game).toBe(loaded)
    expect(loaded.funding).toBe(0)
    expect(loaded.facilityStockpile).toEqual({ pressure_seal_gasket: 1 })
    expect(
      loaded.events.filter((event) => event.type === 'equipment.instance_condition_repaired')
    ).toHaveLength(1)
  })

  it.each([
    ['blast_door', 'blast_door_hinge_seal'],
    ['pressure_seal', 'pressure_seal_gasket'],
  ] as const)('uses %s suitability and consumes one part only on success', (classId, part) => {
    const created = damaged(classId)
    const state = { ...created.state, facilityStockpile: { [part]: 2 } }
    for (const spare of [undefined, 'wrong_part']) {
      const failed = settlePaidEquipmentRepair(state, created.instance.instanceId, spare)
      expect(failed.payment).toBe('not_charged')
      expect(failed.state).toBe(state)
    }
    const missing = { ...state, facilityStockpile: {} }
    expect(settlePaidEquipmentRepair(missing, created.instance.instanceId, part)).toMatchObject({
      state: missing,
      failure: 'stock_unavailable',
      charged: 0,
    })
    const result = settlePaidEquipmentRepair(state, created.instance.instanceId, part)
    expect(result).toMatchObject({
      payment: 'paid',
      charged: 100,
      resultingCondition: 'operational',
    })
    expect(result.state.facilityStockpile?.[part]).toBe(1)
    expect(
      result.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(created.instance.containmentIntegrity)
  })
})
