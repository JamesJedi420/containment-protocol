import { describe, expect, it } from 'vitest'
import {
  HARVEST_CAPABILITY_CATALOG,
  aggregateLoadoutModifiers,
  resolveActiveCapabilities,
  resolveHarvestedLoadout,
  swapReserveOrgan,
} from '../domain/hostileLoadouts'
import type { ReserveOrganSlot } from '../domain/models'

describe('resolveHarvestedLoadout', () => {
  it('academic loadout includes primary capability id', () => {
    const loadout = resolveHarvestedLoadout('academic', [], 'test-unit:academic')
    expect(loadout.activeSourceId).toBe('academic')
    expect(loadout.derivedCapabilityIds).toContain('academic:enhanced_cognition')
  })

  it('soldier loadout has higher meleeMod than academic loadout', () => {
    const academicLoadout = resolveHarvestedLoadout('academic', [], 'unit-a:academic')
    const soldierLoadout = resolveHarvestedLoadout('soldier', [], 'unit-a:soldier')

    const academicMods = aggregateLoadoutModifiers(academicLoadout)
    const soldierMods = aggregateLoadoutModifiers(soldierLoadout)

    expect(soldierMods.meleeMod).toBeGreaterThan(academicMods.meleeMod)
  })

  it('is deterministic — same seedKey always produces same capabilityIds', () => {
    const a = resolveHarvestedLoadout('mystic', [], 'unit-det:mystic')
    const b = resolveHarvestedLoadout('mystic', [], 'unit-det:mystic')

    expect(a.derivedCapabilityIds).toEqual(b.derivedCapabilityIds)
  })

  it('null activeSourceId when resolved via aggregateLoadoutModifiers returns zero mods', () => {
    // Build a loadout manually with null active source
    const emptyLoadout = {
      activeSourceId: null as null,
      reserveSlots: [],
      derivedCapabilityIds: [],
      seedKey: 'unit-empty',
    }
    const mods = aggregateLoadoutModifiers(emptyLoadout)
    expect(mods.meleeMod).toBe(0)
    expect(mods.defenseMod).toBe(0)
    expect(mods.controlReachMod).toBe(0)
  })

  it('engineer loadout has structural_exploit capability among catalog entries', () => {
    const engineerCaps = HARVEST_CAPABILITY_CATALOG.engineer
    const ids = engineerCaps.map((c) => c.id)
    expect(ids).toContain('engineer:structural_exploit')
  })
})

describe('swapReserveOrgan', () => {
  it('activates the target reserve slot source and marks slot occupied false', () => {
    const reserveSlots: ReserveOrganSlot[] = [
      { slotIndex: 0, sourceId: 'soldier', occupied: true },
    ]
    const loadout = resolveHarvestedLoadout('academic', reserveSlots, 'unit-swap:academic')
    const swapped = swapReserveOrgan(loadout, 0)

    expect(swapped.activeSourceId).toBe('soldier')
    expect(swapped.reserveSlots[0].occupied).toBe(false)
  })

  it('returns unchanged loadout when target slot is empty', () => {
    const reserveSlots: ReserveOrganSlot[] = [
      { slotIndex: 0, sourceId: 'engineer', occupied: false },
    ]
    const loadout = resolveHarvestedLoadout('academic', reserveSlots, 'unit-swap2:academic')
    const result = swapReserveOrgan(loadout, 0)

    expect(result.activeSourceId).toBe('academic')
  })

  it('returns unchanged loadout when target slot index does not exist', () => {
    const loadout = resolveHarvestedLoadout('mystic', [], 'unit-swap3:mystic')
    const result = swapReserveOrgan(loadout, 99)

    expect(result.activeSourceId).toBe('mystic')
  })

  it('is deterministic — same loadout same slot always produces same capabilities', () => {
    const reserveSlots: ReserveOrganSlot[] = [
      { slotIndex: 0, sourceId: 'administrator', occupied: true },
    ]
    const loadout = resolveHarvestedLoadout('academic', reserveSlots, 'unit-swap-det')
    const a = swapReserveOrgan(loadout, 0)
    const b = swapReserveOrgan(loadout, 0)

    expect(a.derivedCapabilityIds).toEqual(b.derivedCapabilityIds)
    expect(a.activeSourceId).toBe('administrator')
    expect(b.activeSourceId).toBe('administrator')
  })
})

describe('resolveActiveCapabilities', () => {
  it('returns descriptors matching the derived capability ids', () => {
    const loadout = resolveHarvestedLoadout('engineer', [], 'unit-caps:engineer')
    const caps = resolveActiveCapabilities(loadout)

    for (const cap of caps) {
      expect(loadout.derivedCapabilityIds).toContain(cap.id)
    }
  })

  it('returns empty array when activeSourceId is null', () => {
    const loadout = {
      activeSourceId: null as null,
      reserveSlots: [],
      derivedCapabilityIds: [],
      seedKey: 'empty',
    }
    expect(resolveActiveCapabilities(loadout)).toHaveLength(0)
  })
})
