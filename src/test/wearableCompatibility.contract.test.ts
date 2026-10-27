import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  expandCoveredRegionRefs,
  BODY_REGION_IDS,
  BODY_REGION_OWNER,
} from '../domain/bodyRegion'
import {
  getEquipmentDefinition,
  getEquipmentSlotItemId,
  validateAgentLoadoutAssignment,
  validateEquipmentCatalogDefinitions,
  getEquipmentCatalogEntries,
  type EquipmentDefinition,
  type EquipmentSlotKind,
} from '../domain/equipment'
import type { Agent, EquipmentSlots } from '../domain/models'
import { getProcurementListings } from '../domain/market'
import { equipAgentItem } from '../domain/sim/equipment'
import {
  formatWearableConflictDiagnostic,
  resolveWearableCompatibility,
  validateWearableOccupancyAuthoring,
  WEARABLE_COMPATIBILITY_OWNER,
  WEARABLE_LAYER_IDS,
} from '../domain/wearableCompatibility'

function catalogRecord() {
  return Object.fromEntries(
    getEquipmentCatalogEntries().map((definition) => [definition.id, definition])
  ) as Record<string, EquipmentDefinition>
}

function hunterWithSlots(slots: EquipmentSlots): Agent {
  const state = createStartingState()
  const agent = Object.values(state.agents).find((entry) => entry.role === 'hunter')
  if (!agent) {
    throw new Error('expected hunter agent in starting state')
  }
  return {
    ...agent,
    equipmentSlots: {
      ...slots,
    },
  }
}

describe('SPE-120 body region vocabulary', () => {
  it('owns a bounded canonical region set', () => {
    expect(BODY_REGION_OWNER).toBe('SPE-120')
    expect(BODY_REGION_IDS).toEqual([
      'head',
      'torso',
      'arm_left',
      'arm_right',
      'leg_left',
      'leg_right',
    ])
  })

  it('expands coverage-group shorthand to canonical region IDs', () => {
    const expanded = expandCoveredRegionRefs(['upper_body', 'leg_left'])
    expect(expanded).toEqual({
      ok: true,
      regions: ['head', 'torso', 'arm_left', 'arm_right', 'leg_left'],
    })
  })

  it('fails closed on unknown region refs', () => {
    expect(expandCoveredRegionRefs(['torso', 'abdomen'])).toEqual({
      ok: false,
      unknownRefs: ['abdomen'],
    })
  })
})

describe('SPE-3394 wearable layer × region compatibility', () => {
  it('owns wearable-layer vocabulary separately from SPE-120 regions', () => {
    expect(WEARABLE_COMPATIBILITY_OWNER).toBe('SPE-3394')
    expect([...WEARABLE_LAYER_IDS]).toEqual(['skin', 'under', 'mid', 'shell', 'outer'])
  })

  it('rejects malformed occupancy authoring', () => {
    expect(validateWearableOccupancyAuthoring({ occupiedLayers: [], coveredRegions: ['torso'] }).valid).toBe(
      false
    )
    expect(
      validateWearableOccupancyAuthoring({
        occupiedLayers: ['mid', 'not-a-layer'],
        coveredRegions: ['torso'],
      }).unknownLayers
    ).toEqual(['not-a-layer'])
    expect(
      validateWearableOccupancyAuthoring({
        occupiedLayers: ['mid'],
        coveredRegions: ['abdomen'],
      }).unknownRegions
    ).toEqual(['abdomen'])
    const duplicateRegion = validateWearableOccupancyAuthoring({
      occupiedLayers: ['mid'],
      coveredRegions: ['torso', 'torso'],
    })
    expect(duplicateRegion.valid).toBe(false)
    expect(duplicateRegion.issues).toContain('duplicate-region')
  })

  it('conflicts when layer sets and region sets both intersect', () => {
    const result = resolveWearableCompatibility([
      {
        itemId: 'a',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
      {
        itemId: 'b',
        occupancy: { occupiedLayers: ['mid', 'shell'], coveredRegions: ['torso', 'head'] },
      },
    ])
    expect(result.compatible).toBe(false)
    expect(result.conflicts).toEqual([
      {
        code: 'layer_region_overlap',
        blockingItemId: 'a',
        conflictingItemId: 'b',
        overlappingLayers: ['mid'],
        overlappingRegions: ['torso'],
      },
    ])
  })

  it('allows same layer with disjoint regions', () => {
    const result = resolveWearableCompatibility([
      {
        itemId: 'vest',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
      {
        itemId: 'greaves',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['leg_left', 'leg_right'] },
      },
    ])
    expect(result.compatible).toBe(true)
    expect(result.conflicts).toEqual([])
  })

  it('allows same region on different layers', () => {
    const result = resolveWearableCompatibility([
      {
        itemId: 'vest',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
      {
        itemId: 'undersuit',
        occupancy: { occupiedLayers: ['under'], coveredRegions: ['torso'] },
      },
    ])
    expect(result.compatible).toBe(true)
  })

  it('multi-layer items conflict on any overlapping declared layer for a shared region', () => {
    const result = resolveWearableCompatibility([
      {
        itemId: 'vest',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
      {
        itemId: 'suit',
        occupancy: { occupiedLayers: ['under', 'mid'], coveredRegions: ['torso'] },
      },
    ])
    expect(result.compatible).toBe(false)
    expect(result.conflicts[0]?.overlappingLayers).toEqual(['mid'])
  })

  it('orders conflict item IDs and conflict lists by stable code-unit order', () => {
    const result = resolveWearableCompatibility([
      {
        itemId: 'item_B',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
      {
        itemId: 'item-a',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
      {
        itemId: 'item_A',
        occupancy: { occupiedLayers: ['mid'], coveredRegions: ['torso'] },
      },
    ])

    expect(result.conflicts.map(formatWearableConflictDiagnostic)).toEqual([
      'wearable-overlap:item-a+item_A:layers=mid:regions=torso',
      'wearable-overlap:item-a+item_B:layers=mid:regions=torso',
      'wearable-overlap:item_A+item_B:layers=mid:regions=torso',
    ])
  })

  it('formats stable accessible conflict diagnostics', () => {
    expect(
      formatWearableConflictDiagnostic({
        code: 'layer_region_overlap',
        blockingItemId: 'a',
        conflictingItemId: 'b',
        overlappingLayers: ['mid'],
        overlappingRegions: ['torso'],
      })
    ).toBe('wearable-overlap:a+b:layers=mid:regions=torso')
  })

  it('keeps live catalog valid with authored occupancy fixtures', () => {
    expect(() => validateEquipmentCatalogDefinitions(catalogRecord())).not.toThrow()
    const vest = getEquipmentDefinition('fixture_wearable_mid_torso_vest')
    expect(vest?.wearableOccupancy).toEqual({
      occupiedLayers: ['mid'],
      coveredRegions: ['torso'],
    })
    const procurementIds = getProcurementListings(createStartingState()).map(
      (listing) => listing.itemId
    )
    expect(procurementIds.some((itemId) => itemId.startsWith('fixture_wearable_'))).toBe(false)
  })

  it('rejects illegal wearable overlap through canonical assignment validation', () => {
    const agent = hunterWithSlots({
      armor: 'fixture_wearable_mid_torso_vest',
    })
    const result = validateAgentLoadoutAssignment(
      agent,
      'utility1',
      'fixture_wearable_mid_torso_overlay'
    )
    expect(result.valid).toBe(false)
    expect(result.blockingIssues).toContain('wearable-layer-region-overlap')
    expect(result.wearableConflicts).toHaveLength(1)
    expect(result.conflicts[0]).toContain('wearable-overlap:')
  })

  it('rejects duplicate wearable definitions when two slots overlap physically', () => {
    const agent = hunterWithSlots({
      utility1: 'fixture_wearable_mid_torso_overlay',
    })
    const result = validateAgentLoadoutAssignment(
      agent,
      'utility2',
      'fixture_wearable_mid_torso_overlay'
    )

    expect(result.valid).toBe(false)
    expect(result.blockingIssues).toContain('wearable-layer-region-overlap')
    expect(result.wearableConflicts).toEqual([
      {
        code: 'layer_region_overlap',
        blockingItemId: 'fixture_wearable_mid_torso_overlay',
        conflictingItemId: 'fixture_wearable_mid_torso_overlay',
        overlappingLayers: ['mid'],
        overlappingRegions: ['torso'],
      },
    ])
  })

  it('allows same-layer disjoint-region and same-region different-layer assignments', () => {
    const withVest = hunterWithSlots({
      armor: 'fixture_wearable_mid_torso_vest',
    })
    const greaves = validateAgentLoadoutAssignment(
      withVest,
      'utility2',
      'fixture_wearable_mid_greaves'
    )
    expect(greaves.valid).toBe(true)
    expect(greaves.wearableConflicts).toEqual([])

    const undersuit = validateAgentLoadoutAssignment(
      withVest,
      'utility1',
      'fixture_wearable_under_torso'
    )
    expect(undersuit.valid).toBe(true)
  })

  it('rejects multi-layer overlap through assignment and leaves state unchanged on equip', () => {
    const state = createStartingState()
    const hunter = Object.values(state.agents).find((entry) => entry.role === 'hunter')
    if (!hunter) {
      throw new Error('expected hunter')
    }

    const withStock = {
      ...state,
      inventory: {
        ...state.inventory,
        fixture_wearable_mid_torso_vest: 1,
        fixture_wearable_under_mid_torso_suit: 1,
      },
      agents: {
        ...state.agents,
        [hunter.id]: {
          ...hunter,
          equipmentSlots: {},
        },
      },
    }

    const afterVest = equipAgentItem(
      withStock,
      hunter.id,
      'armor',
      'fixture_wearable_mid_torso_vest'
    )
    expect(getEquipmentSlotItemId(afterVest.agents[hunter.id]?.equipmentSlots, 'armor')).toBe(
      'fixture_wearable_mid_torso_vest'
    )

    const rejected = equipAgentItem(
      afterVest,
      hunter.id,
      'utility1' satisfies EquipmentSlotKind,
      'fixture_wearable_under_mid_torso_suit'
    )
    expect(getEquipmentSlotItemId(rejected.agents[hunter.id]?.equipmentSlots, 'utility1')).toBeUndefined()
    expect(getEquipmentSlotItemId(rejected.agents[hunter.id]?.equipmentSlots, 'armor')).toBe(
      'fixture_wearable_mid_torso_vest'
    )
    expect(rejected.inventory.fixture_wearable_under_mid_torso_suit).toBe(1)
  })

  it('preserves legacy assignment behavior for definitions without occupancy', () => {
    const agent = hunterWithSlots({})
    const result = validateAgentLoadoutAssignment(agent, 'armor', 'field_plate')
    expect(result.blockingIssues).not.toContain('wearable-layer-region-overlap')
    expect(result.wearableConflicts).toEqual([])
    expect(getEquipmentDefinition('field_plate')?.wearableOccupancy).toBeUndefined()
  })

  it('exposes typed wearable conflicts for preset/UI consumers without local overlap math', () => {
    const agent = hunterWithSlots({
      armor: 'fixture_wearable_mid_torso_vest',
    })
    const result = validateAgentLoadoutAssignment(
      agent,
      'utility1',
      'fixture_wearable_under_mid_torso_suit'
    )
    // SPE-3078 / UI consume this contract rather than recomputing layer×region sets.
    expect(result.wearableConflicts[0]).toMatchObject({
      code: 'layer_region_overlap',
      overlappingLayers: ['mid'],
      overlappingRegions: ['torso'],
    })
  })

  it('rejects two slotted copies of the same wearable occupancy definition', () => {
    const state = createStartingState()
    const hunter = Object.values(state.agents).find((entry) => entry.role === 'hunter')
    if (!hunter) {
      throw new Error('expected hunter')
    }
    const agent = {
      ...hunter,
      equipmentSlots: {
        utility1: 'fixture_wearable_mid_torso_overlay',
      },
    }
    const withStock = {
      ...state,
      inventory: {
        ...state.inventory,
        fixture_wearable_mid_torso_overlay: 1,
      },
      agents: {
        ...state.agents,
        [hunter.id]: agent,
      },
    }
    const result = validateAgentLoadoutAssignment(
      agent,
      'utility2',
      'fixture_wearable_mid_torso_overlay',
      { state: withStock }
    )
    expect(result.valid).toBe(false)
    expect(result.blockingIssues).toContain('wearable-layer-region-overlap')
  })

  it('allows same-agent transfer of one wearable copy when stock is empty', () => {
    const state = createStartingState()
    const hunter = Object.values(state.agents).find((entry) => entry.role === 'hunter')
    if (!hunter) {
      throw new Error('expected hunter')
    }
    const agent = {
      ...hunter,
      equipmentSlots: {
        utility1: 'fixture_wearable_mid_torso_overlay',
      },
    }
    const noStock = {
      ...state,
      inventory: {
        ...state.inventory,
        fixture_wearable_mid_torso_overlay: 0,
      },
      agents: {
        ...state.agents,
        [hunter.id]: agent,
      },
    }
    const result = validateAgentLoadoutAssignment(
      agent,
      'utility2',
      'fixture_wearable_mid_torso_overlay',
      { state: noStock }
    )
    expect(result.blockingIssues).not.toContain('wearable-layer-region-overlap')
    expect(result.wearableConflicts).toEqual([])
  })
})
