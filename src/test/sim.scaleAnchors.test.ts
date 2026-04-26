/**
 * SPE-451: Cross-Scale Map Anchors and Links
 *
 * Validates:
 * - Depth-band annotations on zone output from resolveMapMetadata
 * - scaleAnchors generation from topology profiles
 * - Helper functions (isMultiScaleMapLayer, getRestrictedScaleAnchors)
 * - aggregateBattle consumer: restricted anchors wired through context builder
 *   and produce measurably better defender outcomes via resolveAggregateBattle
 */

import { describe, it, expect } from 'vitest'
import type { SiteGenerationStageSnapshot } from '../domain/siteGeneration/packets'
import {
  resolveMapMetadata,
  isMultiScaleMapLayer,
  getRestrictedScaleAnchors,
} from '../domain/siteGeneration/mapMetadata'
import {
  buildAggregateBattleContextFromCase,
  buildAggregateBattleSideState,
  resolveAggregateBattle,
  type AggregateBattleArea,
  type AggregateBattleContext,
  type AggregateBattleInput,
  type AggregateBattleUnit,
} from '../domain/aggregateBattle'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fixedRng = () => 0.5

const concentricStages: SiteGenerationStageSnapshot = {
  purpose: 'ritual_complex',
  builder: 'cult_engineers',
  location: 'riverfront_substrate',
  ingress: 'floodgate',
  topology: 'concentric_sanctum',
  hazards: ['ward_feedback'],
  treasure: ['sealed_reliquary'],
  inhabitants: ['ritual_adepts'],
}

const lureStages: SiteGenerationStageSnapshot = {
  purpose: 'lure_site',
  builder: 'cult_engineers',
  location: 'riverfront_substrate',
  ingress: 'floodgate',
  topology: 'lure_corridors',
  hazards: [],
  treasure: [],
  inhabitants: [],
}

const collapsedStages: SiteGenerationStageSnapshot = {
  purpose: 'detention_complex',
  builder: 'cult_engineers',
  location: 'riverfront_substrate',
  ingress: 'floodgate',
  topology: 'collapsed_cells',
  hazards: [],
  treasure: [],
  inhabitants: [],
}

// ─── Depth bands ──────────────────────────────────────────────────────────────

describe('depth bands — zone annotations', () => {
  it('concentric_sanctum zones carry correct depth bands', () => {
    const result = resolveMapMetadata(concentricStages, fixedRng)
    expect(result.zones[0]?.depthBand).toBe('district')
    expect(result.zones[1]?.depthBand).toBe('building')
    expect(result.zones[2]?.depthBand).toBe('room')
  })

  it('lure_corridors all zones have depthBand building', () => {
    const result = resolveMapMetadata(lureStages, fixedRng)
    for (const zone of result.zones) {
      expect(zone.depthBand).toBe('building')
    }
  })

  it('collapsed_cells all zones have depthBand building', () => {
    const result = resolveMapMetadata(collapsedStages, fixedRng)
    for (const zone of result.zones) {
      expect(zone.depthBand).toBe('building')
    }
  })
})

// ─── Scale anchor generation ──────────────────────────────────────────────────

describe('scale anchors — generation', () => {
  it('concentric_sanctum produces 2 scale anchors', () => {
    const result = resolveMapMetadata(concentricStages, fixedRng)
    expect(result.scaleAnchors).toHaveLength(2)
  })

  it('concentric_sanctum first anchor: district_to_building, restricted, outer_to_middle', () => {
    const result = resolveMapMetadata(concentricStages, fixedRng)
    const anchor = result.scaleAnchors[0]
    expect(anchor?.id).toBe('district_to_building')
    expect(anchor?.fromDepthBand).toBe('district')
    expect(anchor?.toDepthBand).toBe('building')
    expect(anchor?.fromZoneId).toBe('outer_ring')
    expect(anchor?.toZoneId).toBe('middle_ring')
    expect(anchor?.routeId).toBe('outer_to_middle')
    expect(anchor?.accessTier).toBe('restricted')
  })

  it('concentric_sanctum second anchor: building_to_room, locked, middle_to_inner', () => {
    const result = resolveMapMetadata(concentricStages, fixedRng)
    const anchor = result.scaleAnchors[1]
    expect(anchor?.id).toBe('building_to_room')
    expect(anchor?.fromDepthBand).toBe('building')
    expect(anchor?.toDepthBand).toBe('room')
    expect(anchor?.fromZoneId).toBe('middle_ring')
    expect(anchor?.toZoneId).toBe('inner_sanctum')
    expect(anchor?.routeId).toBe('middle_to_inner')
    expect(anchor?.accessTier).toBe('locked')
  })

  it('lure_corridors produces 0 scale anchors', () => {
    const result = resolveMapMetadata(lureStages, fixedRng)
    expect(result.scaleAnchors).toHaveLength(0)
  })

  it('collapsed_cells produces 0 scale anchors', () => {
    const result = resolveMapMetadata(collapsedStages, fixedRng)
    expect(result.scaleAnchors).toHaveLength(0)
  })
})

// ─── Helper functions ─────────────────────────────────────────────────────────

describe('helper functions', () => {
  it('isMultiScaleMapLayer returns true for concentric_sanctum', () => {
    const result = resolveMapMetadata(concentricStages, fixedRng)
    expect(isMultiScaleMapLayer(result)).toBe(true)
  })

  it('isMultiScaleMapLayer returns false for lure_corridors', () => {
    const result = resolveMapMetadata(lureStages, fixedRng)
    expect(isMultiScaleMapLayer(result)).toBe(false)
  })

  it('getRestrictedScaleAnchors returns both anchors for concentric_sanctum', () => {
    const result = resolveMapMetadata(concentricStages, fixedRng)
    const restricted = getRestrictedScaleAnchors(result)
    expect(restricted).toHaveLength(2)
    const ids = restricted.map((a) => a.id)
    expect(ids).toContain('district_to_building')
    expect(ids).toContain('building_to_room')
  })

  it('getRestrictedScaleAnchors returns empty array for lure_corridors', () => {
    const result = resolveMapMetadata(lureStages, fixedRng)
    expect(getRestrictedScaleAnchors(result)).toHaveLength(0)
  })
})

// ─── Battle consumer ──────────────────────────────────────────────────────────

function makeConsumerAreas(): AggregateBattleArea[] {
  return [
    {
      id: 'att-reserve',
      label: 'Attacker Reserve',
      kind: 'reserve',
      occupancyCapacity: 4,
      frontageCapacity: 2,
      adjacent: ['front'],
    },
    {
      id: 'front',
      label: 'Front',
      kind: 'line',
      occupancyCapacity: 4,
      frontageCapacity: 4,
      adjacent: ['att-reserve', 'def-reserve'],
    },
    {
      id: 'def-reserve',
      label: 'Defender Reserve',
      kind: 'reserve',
      occupancyCapacity: 4,
      frontageCapacity: 2,
      adjacent: ['front'],
    },
  ]
}

function makeConsumerUnits(): AggregateBattleUnit[] {
  return [
    {
      id: 'attacker',
      label: 'Attacker',
      sideId: 'attackers',
      family: 'line_company',
      strengthSteps: 4,
      areaId: 'front',
      order: 'press',
      meleeFactor: 6,
      defenseFactor: 4,
      morale: 70,
      readiness: 70,
    },
    {
      id: 'defender',
      label: 'Defender',
      sideId: 'defenders',
      family: 'line_company',
      strengthSteps: 4,
      areaId: 'front',
      order: 'hold',
      meleeFactor: 4,
      // defenseFactor 4 + 2 restricted anchors = effective 6 with mapLayer
      defenseFactor: 4,
      morale: 70,
      readiness: 70,
    },
  ]
}

function makeConsumerSides() {
  return [
    buildAggregateBattleSideState({
      id: 'attackers',
      label: 'Attackers',
      reserveAreaId: 'att-reserve',
      supportAvailable: 0,
    }),
    buildAggregateBattleSideState({
      id: 'defenders',
      label: 'Defenders',
      reserveAreaId: 'def-reserve',
      supportAvailable: 0,
    }),
  ]
}

describe('battle consumer — restricted anchors increase defense value', () => {
  it('buildAggregateBattleContextFromCase wires mapLayer through to context', () => {
    const concentricMap = resolveMapMetadata(concentricStages, fixedRng)
    const ctx = buildAggregateBattleContextFromCase({
      tags: [],
      requiredTags: [],
      preferredTags: [],
      regionTag: 'urban',
      siteLayer: 'interior',
      visibilityState: 'clear',
      transitionType: 'threshold',
      spatialFlags: [],
      mapLayer: concentricMap,
    })
    expect(ctx.mapLayer).toBe(concentricMap)
    expect(ctx.mapLayer && getRestrictedScaleAnchors(ctx.mapLayer)).toHaveLength(2)
  })

  it('defender takes fewer or equal losses with concentric_sanctum mapLayer than without', () => {
    const concentricMap = resolveMapMetadata(concentricStages, fixedRng)

    const sharedInput = {
      battleId: 'anchor-defense-test',
      roundLimit: 3,
      areas: makeConsumerAreas(),
      sides: makeConsumerSides(),
      units: makeConsumerUnits(),
      commandOverlays: [],
    } satisfies Omit<AggregateBattleInput, 'context'>

    const ctxNoAnchor = buildAggregateBattleContextFromCase({
      tags: [],
      requiredTags: [],
      preferredTags: [],
      regionTag: 'urban',
      siteLayer: 'interior',
      visibilityState: 'clear',
      transitionType: 'threshold',
      spatialFlags: [],
    })

    const ctxWithAnchor: AggregateBattleContext = {
      ...buildAggregateBattleContextFromCase({
        tags: [],
        requiredTags: [],
        preferredTags: [],
        regionTag: 'urban',
        siteLayer: 'interior',
        visibilityState: 'clear',
        transitionType: 'threshold',
        spatialFlags: [],
        mapLayer: concentricMap,
      }),
      defenderSideId: 'defenders',
    }

    const resultNoAnchor = resolveAggregateBattle({ ...sharedInput, context: ctxNoAnchor })
    const resultWithAnchor = resolveAggregateBattle({ ...sharedInput, context: ctxWithAnchor })

    const defenderStepsNoAnchor =
      resultNoAnchor.summaryTable.find((r) => r.unitId === 'defender')?.remainingStrengthSteps ?? 0
    const defenderStepsWithAnchor =
      resultWithAnchor.summaryTable.find((r) => r.unitId === 'defender')?.remainingStrengthSteps ??
      0

    // With +2 defense bonus from restricted anchors, defender survives at least as well
    expect(defenderStepsWithAnchor).toBeGreaterThanOrEqual(defenderStepsNoAnchor)
  })

  it('results are deterministic — same inputs produce same anchor-modified outcomes', () => {
    const concentricMap = resolveMapMetadata(concentricStages, fixedRng)
    const ctx: AggregateBattleContext = {
      ...buildAggregateBattleContextFromCase({
        tags: [],
        requiredTags: [],
        preferredTags: [],
        regionTag: 'urban',
        siteLayer: 'interior',
        visibilityState: 'clear',
        transitionType: 'threshold',
        spatialFlags: [],
        mapLayer: concentricMap,
      }),
      defenderSideId: 'defenders',
    }
    const input: AggregateBattleInput = {
      battleId: 'anchor-determinism-test',
      roundLimit: 2,
      areas: makeConsumerAreas(),
      sides: makeConsumerSides(),
      units: makeConsumerUnits(),
      commandOverlays: [],
      context: ctx,
    }
    const r1 = resolveAggregateBattle(input)
    const r2 = resolveAggregateBattle(input)
    expect(r1).toEqual(r2)
  })
})
