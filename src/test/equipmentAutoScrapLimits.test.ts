import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyEquipmentAutoScrapAtWeekClose,
  resolveEquipmentAutoScrapPreview,
} from '../domain/equipmentAutoScrap'
import * as recovery from '../domain/sim/equipmentDeconstruction'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { queueFabrication } from '../domain/sim/production'
import {
  fulfillPendingProcurementBacklogAtWeekClose,
  placeDelayedMarketOrder,
  purchaseMarketInventory,
} from '../domain/sim/market'
import { getProcurementListings } from '../domain/market'
import { getCanonicalFundingState } from '../domain/funding'
import { equipAgentItem, unequipAgentItem } from '../domain/sim/equipment'
import { parseRunExport, serializeRunExport } from '../app/store/runTransfer'

function enabledStock() {
  const state = createStartingState()
  state.inventory = { medkits: 34, ward_seals: 2 }
  state.equipmentAutoScrapPolicy = { state: 'enabled', thresholdGradeId: 'grade_1' }
  return state
}

describe('Auto-Scrap processing limits', () => {
  it('preserves equipped stock when returning or replacing it would exceed capacity', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    const equipped = equipAgentItem(state, 'a_casey', 'utility2', 'medkits')
    expect(equipped.agents.a_casey.equipmentSlots?.utility2).toBe('medkits')
    equipped.inventory = { ...equipped.inventory, medkits: Number.MAX_SAFE_INTEGER }
    const loaded = parseRunExport(serializeRunExport(equipped))
    const refused = unequipAgentItem(loaded, 'a_casey', 'utility2')
    expect(refused.inventory.medkits).toBe(Number.MAX_SAFE_INTEGER)
    expect(refused.agents.a_casey.equipmentSlots?.utility2).toBe('medkits')
    expect(() => parseRunExport(serializeRunExport(refused))).not.toThrow()
    const withRoom = {
      ...refused,
      inventory: { ...refused.inventory, medkits: Number.MAX_SAFE_INTEGER - 1 },
    }
    const returned = unequipAgentItem(withRoom, 'a_casey', 'utility2')
    expect(returned.inventory.medkits).toBe(Number.MAX_SAFE_INTEGER)
    expect(returned.agents.a_casey.equipmentSlots?.utility2).toBeUndefined()

    const swapState = createStartingState()
    swapState.inventory.ward_seals = 1
    swapState.inventory.signal_jammers = 1
    const sealed = equipAgentItem(swapState, 'a_mina', 'utility1', 'ward_seals')
    sealed.inventory = { ...sealed.inventory, ward_seals: Number.MAX_SAFE_INTEGER }
    const swapped = equipAgentItem(sealed, 'a_mina', 'utility1', 'signal_jammers')
    expect(swapped.inventory.ward_seals).toBe(Number.MAX_SAFE_INTEGER)
    expect(swapped.inventory.signal_jammers).toBe(1)
    expect(swapped.agents.a_mina.equipmentSlots?.utility1).toBe('ward_seals')
  })

  it('refuses purchases at capacity without spending and preserves pending deliveries', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find(
      (entry) =>
        entry.cashPurchaseAllowed &&
        entry.accessAvailable &&
        entry.availableBundles > 0 &&
        !entry.delayedFulfillmentWeeks &&
        entry.buyPrice <= state.funding &&
        entry.resourceStatuses.every((status) => status.purchaseAvailable)
    )!
    expect(listing).toBeDefined()
    state.inventory[listing.itemId] = Number.MAX_SAFE_INTEGER
    const refused = purchaseMarketInventory(state, listing.id)
    expect(refused.funding).toBe(state.funding)
    expect(refused.inventory[listing.itemId]).toBe(Number.MAX_SAFE_INTEGER)
    expect(refused.events).toEqual(state.events)

    state.inventory.field_plate = Number.MAX_SAFE_INTEGER
    const ordered = placeDelayedMarketOrder(state, 'gear:field_plate')
    const delayed = fulfillPendingProcurementBacklogAtWeekClose(ordered, 2)
    expect(delayed.inventory.field_plate).toBe(Number.MAX_SAFE_INTEGER)
    expect(getCanonicalFundingState(delayed).procurementBacklog[0]?.status).toBe('pending')
    delayed.inventory = { ...delayed.inventory, field_plate: Number.MAX_SAFE_INTEGER - 1 }
    const fulfilled = fulfillPendingProcurementBacklogAtWeekClose(delayed, 3)
    expect(fulfilled.inventory.field_plate).toBe(Number.MAX_SAFE_INTEGER)
    expect(getCanonicalFundingState(fulfilled).procurementBacklog[0]?.status).toBe('fulfilled')
  })

  it('keeps a recovery job intact until all material outputs fit', () => {
    const state = enabledStock()
    const queued = recovery.queueEquipmentDeconstruction(state, 'medkits')
    const job = queued.equipmentDeconstructionQueue![0]
    expect(job.outputMaterials.length).toBeGreaterThan(0)
    const material = job.outputMaterials[0]
    queued.inventory = { ...queued.inventory, [material.materialId]: Number.MAX_SAFE_INTEGER }
    const delayed = recovery.advanceEquipmentDeconstructionQueues(queued)
    expect(delayed.completed).toEqual([])
    expect(delayed.state.equipmentDeconstructionQueue).toHaveLength(1)
    expect(delayed.state.inventory[material.materialId]).toBe(Number.MAX_SAFE_INTEGER)
    const restored = parseRunExport(serializeRunExport(delayed.state))
    expect(restored.equipmentDeconstructionQueue).toHaveLength(1)
    restored.inventory = {
      ...restored.inventory,
      [material.materialId]: Number.MAX_SAFE_INTEGER - material.quantity,
    }
    const completed = recovery.advanceEquipmentDeconstructionQueues(restored)
    expect(completed.completed).toHaveLength(1)
    expect(completed.state.inventory[material.materialId]).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('defers fabrication at inventory capacity and completes after Auto-Scrap makes room', () => {
    const state = enabledStock()
    state.inventory.medkits = Number.MAX_SAFE_INTEGER
    state.inventory.medical_supplies = 2
    const queued = queueFabrication(state, 'med-kits')
    expect(queued.productionQueue).toHaveLength(1)
    const firstWeek = advanceWeek(parseRunExport(serializeRunExport(queued)))
    expect(firstWeek.productionQueue).toHaveLength(1)
    expect(firstWeek.inventory.medkits).toBe(Number.MAX_SAFE_INTEGER - 32)
    expect(firstWeek.events.some((event) => event.type === 'production.queue_completed')).toBe(
      false
    )
    const secondWeek = advanceWeek(parseRunExport(serializeRunExport(firstWeek)))
    expect(secondWeek.productionQueue).toHaveLength(0)
    expect(secondWeek.inventory.medkits).toBeLessThan(Number.MAX_SAFE_INTEGER)
    expect(Object.keys(secondWeek.fabricatedEquipmentLots ?? {})).toHaveLength(1)
  })

  it('shares a 32-attempt budget across item IDs and preserves the remaining stock', () => {
    const state = enabledStock()
    const routed = applyEquipmentAutoScrapAtWeekClose(state)

    expect(routed.equipmentDeconstructionQueue).toHaveLength(32)
    expect(routed.equipmentDeconstructionQueue?.every((entry) => entry.itemId === 'medkits')).toBe(
      true
    )
    expect(routed.inventory).toEqual({ medkits: 2, ward_seals: 2 })
    expect(state.inventory).toEqual({ medkits: 34, ward_seals: 2 })
    expect(routed.events.at(-1)).toMatchObject({ payload: { routedQuantity: 32 } })
    expect(applyEquipmentAutoScrapAtWeekClose(routed)).toBe(routed)
  })

  it('continues deferred stock after save/load at the next canonical week close', () => {
    const routed = applyEquipmentAutoScrapAtWeekClose(enabledStock())
    const loaded = parseRunExport(serializeRunExport(routed))
    expect(loaded.inventory).toEqual({ medkits: 2, ward_seals: 2 })

    const nextWeek = advanceWeek(loaded)
    expect(nextWeek.inventory.medkits).toBe(0)
    expect(nextWeek.inventory.ward_seals).toBe(0)
    expect(
      nextWeek.events.filter((event) => event.type === 'equipment.auto_scrap_routed')
    ).toHaveLength(2)
  })

  it('rejects an unsafe direct-runtime quantity before preview or queue work', () => {
    const state = enabledStock()
    state.inventory.medkits = Number.MAX_SAFE_INTEGER + 1
    expect(() => resolveEquipmentAutoScrapPreview(state, 'grade_1')).toThrow(/safe integer range/)
  })

  it('bounds work for the largest supported count without discarding unprocessed stock', () => {
    const state = enabledStock()
    state.inventory = { medkits: Number.MAX_SAFE_INTEGER }
    const command = recovery.queueEquipmentDeconstruction
    let attempts = 0
    const queue = vi
      .spyOn(recovery, 'queueEquipmentDeconstruction')
      .mockImplementation((...args) => {
        if (++attempts > 32) throw new Error('Test work budget exceeded')
        return command(...args)
      })
    try {
      const routed = applyEquipmentAutoScrapAtWeekClose(state)
      expect(attempts).toBe(32)
      expect(routed.inventory.medkits).toBe(Number.MAX_SAFE_INTEGER - 32)
      expect(routed.equipmentDeconstructionQueue).toHaveLength(32)
    } finally {
      queue.mockRestore()
    }
  })

  it('stops an item when the canonical command returns a new object without consuming stock', () => {
    const state = enabledStock()
    state.inventory = { medkits: 3 }
    const queue = vi
      .spyOn(recovery, 'queueEquipmentDeconstruction')
      .mockImplementation((game) => ({ ...game }))
    try {
      const routed = applyEquipmentAutoScrapAtWeekClose(state)
      expect(queue).toHaveBeenCalledTimes(1)
      expect(routed.inventory.medkits).toBe(3)
      expect(routed.equipmentDeconstructionQueue ?? []).toEqual([])
      expect(routed.events.at(-1)).toMatchObject({ payload: { routedQuantity: 0 } })
    } finally {
      queue.mockRestore()
    }
  })
})
