import { describe, expect, it } from 'vitest'
import { resolveMapMetadata } from '../domain/siteGeneration/mapMetadata'
import type { SiteGenerationStageSnapshot } from '../domain/siteGeneration/packets'

function makeStages(overrides: Partial<SiteGenerationStageSnapshot> = {}): SiteGenerationStageSnapshot {
  return {
    purpose: 'ritual_complex',
    builder: 'cult_engineers',
    location: 'riverfront_substrate',
    ingress: 'floodgate',
    topology: 'concentric_sanctum',
    hazards: ['ward_feedback', 'ritual_backwash'],
    treasure: ['sealed_reliquary'],
    inhabitants: ['ritual_adepts'],
    ...overrides,
  }
}

function createSequenceRng(values: number[]) {
  let index = 0
  return () => (index < values.length ? values[index++]! : 0.5)
}

describe('resolveMapMetadata', () => {
  describe('determinism', () => {
    it('returns identical results for identical stages and rng stream', () => {
      const stages = makeStages()
      const rngA = createSequenceRng([0.3, 0.7, 0.1, 0.9])
      const rngB = createSequenceRng([0.3, 0.7, 0.1, 0.9])

      const resultA = resolveMapMetadata(stages, rngA)
      const resultB = resolveMapMetadata(stages, rngB)

      expect(resultA).toEqual(resultB)
    })

    it('produces different results when ingress differs and rng threshold is boundary-sensitive', () => {
      const stagesFloodgate = makeStages({ ingress: 'floodgate' })
      const stagesShaft = makeStages({ ingress: 'maintenance_shaft' })
      const highRoll = createSequenceRng([0.99])
      const highRollB = createSequenceRng([0.99])

      const floodgateResult = resolveMapMetadata(stagesFloodgate, highRoll)
      const shaftResult = resolveMapMetadata(stagesShaft, highRollB)

      // maintenance_shaft at high roll should add concealed_shaft; floodgate should not
      const floodgateShaftCount = floodgateResult.zones.flatMap((z) => z.hiddenSymbolIds).filter((id) => id === 'concealed_shaft').length
      const shaftShaftCount = shaftResult.zones.flatMap((z) => z.hiddenSymbolIds).filter((id) => id === 'concealed_shaft').length

      expect(shaftShaftCount).toBeGreaterThan(floodgateShaftCount)
    })
  })

  describe('concentric_sanctum (map-metadata-first)', () => {
    it('resolves authoringMode as map-metadata-first', () => {
      const result = resolveMapMetadata(makeStages({ topology: 'concentric_sanctum' }), createSequenceRng([0.1]))
      expect(result.authoringMode).toBe('map-metadata-first')
    })

    it('produces three named zones', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const zoneIds = result.zones.map((z) => z.id)

      expect(zoneIds).toContain('outer_ring')
      expect(zoneIds).toContain('middle_ring')
      expect(zoneIds).toContain('inner_sanctum')
    })

    it('outer_ring has structural_crack as a visible symbol', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const outer = result.zones.find((z) => z.id === 'outer_ring')

      expect(outer).toBeDefined()
      expect(outer!.symbolIds).toContain('structural_crack')
      expect(outer!.hiddenSymbolIds).not.toContain('structural_crack')
    })

    it('ward_feedback hazard places ward_glyph as hidden in middle_ring and inner_sanctum', () => {
      const result = resolveMapMetadata(
        makeStages({ hazards: ['ward_feedback'] }),
        createSequenceRng([0.1])
      )
      const middle = result.zones.find((z) => z.id === 'middle_ring')
      const inner = result.zones.find((z) => z.id === 'inner_sanctum')

      expect(middle!.hiddenSymbolIds).toContain('ward_glyph')
      expect(inner!.hiddenSymbolIds).toContain('ward_glyph')
    })

    it('ward_glyph is not placed when ward_feedback hazard is absent', () => {
      const result = resolveMapMetadata(
        makeStages({ hazards: ['structural_fall'] }),
        createSequenceRng([0.1])
      )
      const allHidden = result.zones.flatMap((z) => z.hiddenSymbolIds)

      expect(allHidden).not.toContain('ward_glyph')
    })
  })

  describe('route annotations', () => {
    it('outer_to_middle route has routeClass choke', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const route = result.routes.find((r) => r.id === 'outer_to_middle')

      expect(route).toBeDefined()
      expect(route!.routeClass).toBe('choke')
    })

    it('outer_to_middle route lists choke_bolt as an active symbol', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const route = result.routes.find((r) => r.id === 'outer_to_middle')

      expect(route!.activeSymbolIds).toContain('choke_bolt')
    })

    it('middle_to_inner route lists ward_glyph as an active symbol', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const route = result.routes.find((r) => r.id === 'middle_to_inner')

      expect(route!.activeSymbolIds).toContain('ward_glyph')
    })
  })

  describe('legend and symbol interaction hints', () => {
    it('legend includes choke_bolt with passRestriction single-file', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const chokeBolt = result.legend.find((s) => s.id === 'choke_bolt')

      expect(chokeBolt).toBeDefined()
      expect(chokeBolt!.routeEffect).not.toBeNull()
      expect(chokeBolt!.routeEffect!.passRestriction).toBe('single-file')
    })

    it('choke_bolt is not hidden — visible on initial map layer', () => {
      const result = resolveMapMetadata(makeStages(), createSequenceRng([0.1]))
      const chokeBolt = result.legend.find((s) => s.id === 'choke_bolt')

      expect(chokeBolt!.hiddenUntilReveal).toBe(false)
    })

    it('ward_glyph has routeEffect with single-file restriction', () => {
      const result = resolveMapMetadata(
        makeStages({ hazards: ['ward_feedback'] }),
        createSequenceRng([0.1])
      )
      const wardGlyph = result.legend.find((s) => s.id === 'ward_glyph')

      expect(wardGlyph).toBeDefined()
      expect(wardGlyph!.routeEffect!.passRestriction).toBe('single-file')
    })

    it('ward_glyph is flagged hidden until reveal', () => {
      const result = resolveMapMetadata(
        makeStages({ hazards: ['ward_feedback'] }),
        createSequenceRng([0.1])
      )
      const wardGlyph = result.legend.find((s) => s.id === 'ward_glyph')

      expect(wardGlyph!.hiddenUntilReveal).toBe(true)
    })
  })

  describe('lure_corridors (map-metadata-first)', () => {
    it('resolves authoringMode as map-metadata-first', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'lure_corridors', hazards: ['predator_ambush', 'blood_traps'] }),
        createSequenceRng([0.1])
      )
      expect(result.authoringMode).toBe('map-metadata-first')
    })

    it('bait_to_collapse route is rigged', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'lure_corridors', hazards: ['predator_ambush', 'blood_traps'] }),
        createSequenceRng([0.1])
      )
      const route = result.routes.find((r) => r.id === 'bait_to_collapse')

      expect(route!.routeClass).toBe('rigged')
    })

    it('blood_traps hazard places blood_trap_marker hidden in collapse_throat', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'lure_corridors', hazards: ['blood_traps'] }),
        createSequenceRng([0.1])
      )
      const collapse = result.zones.find((z) => z.id === 'collapse_throat')

      expect(collapse!.hiddenSymbolIds).toContain('blood_trap_marker')
    })

    it('predator_ambush hazard places predator_cache hidden in bait_chamber', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'lure_corridors', hazards: ['predator_ambush'] }),
        createSequenceRng([0.1])
      )
      const bait = result.zones.find((z) => z.id === 'bait_chamber')

      expect(bait!.hiddenSymbolIds).toContain('predator_cache')
    })
  })

  describe('collapsed_cells (prose-key-first)', () => {
    it('resolves authoringMode as prose-key-first', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'collapsed_cells', hazards: ['structural_fall'] }),
        createSequenceRng([0.1])
      )
      expect(result.authoringMode).toBe('prose-key-first')
    })

    it('still provides zone annotations as supplemental data', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'collapsed_cells', hazards: [] }),
        createSequenceRng([0.1])
      )
      expect(result.zones.length).toBeGreaterThan(0)
    })

    it('structural_fall hazard places structural_crack in cell_block (visible)', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'collapsed_cells', hazards: ['structural_fall'] }),
        createSequenceRng([0.1])
      )
      const cellBlock = result.zones.find((z) => z.id === 'cell_block')

      expect(cellBlock!.symbolIds).toContain('structural_crack')
    })
  })

  describe('pipeline integration — mapLayer on pipeline result', () => {
    it('resolveSiteGenerationStages includes mapLayer in result', async () => {
      const { resolveSiteGenerationStages } = await import('../domain/siteGeneration')
      const rng = createSequenceRng([0.11, 0.75, 0.25, 0.33, 0.66, 0.42, 0.88, 0.04, 0.57, 0.9])
      const result = resolveSiteGenerationStages('mixed_eclipse_ritual', rng)

      expect(result).not.toBeNull()
      expect(result!.mapLayer).toBeDefined()
      expect(result!.mapLayer.authoringMode).toMatch(/^(map-metadata-first|prose-key-first)$/)
      expect(Array.isArray(result!.mapLayer.zones)).toBe(true)
      expect(Array.isArray(result!.mapLayer.routes)).toBe(true)
      expect(Array.isArray(result!.mapLayer.legend)).toBe(true)
    })

    it('pipeline result mapLayer is deterministic end-to-end', async () => {
      const { resolveSiteGenerationStages } = await import('../domain/siteGeneration')
      const stream = [0.11, 0.75, 0.25, 0.33, 0.66, 0.42, 0.88, 0.04, 0.57, 0.9, 0.3, 0.7]
      const resultA = resolveSiteGenerationStages('mixed_eclipse_ritual', createSequenceRng(stream))
      const resultB = resolveSiteGenerationStages('mixed_eclipse_ritual', createSequenceRng(stream))

      expect(resultA!.mapLayer).toEqual(resultB!.mapLayer)
    })
  })

  describe('occupier known-topology subset', () => {
    it('collapsed_cells: occupierKnownRouteIds is empty — concealed route excluded', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'collapsed_cells', hazards: [] }),
        createSequenceRng([0.5]),
      )
      expect(result.occupierKnownRouteIds).toEqual([])
    })

    it('concentric_sanctum: both choke routes are occupier-known', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'concentric_sanctum' }),
        createSequenceRng([0.1]),
      )
      expect(result.occupierKnownRouteIds).toContain('outer_to_middle')
      expect(result.occupierKnownRouteIds).toContain('middle_to_inner')
      expect(result.occupierKnownRouteIds).toHaveLength(2)
    })

    it('lure_corridors: both routes are occupier-known (rigged = occupier-placed)', () => {
      const result = resolveMapMetadata(
        makeStages({ topology: 'lure_corridors', hazards: ['predator_ambush', 'blood_traps'] }),
        createSequenceRng([0.5]),
      )
      expect(result.occupierKnownRouteIds).toContain('entry_to_bait')
      expect(result.occupierKnownRouteIds).toContain('bait_to_collapse')
      expect(result.occupierKnownRouteIds).toHaveLength(2)
    })

    it('occupierKnownRouteIds is deterministic across identical calls', () => {
      const stagesA = makeStages({ topology: 'concentric_sanctum' })
      const stagesB = makeStages({ topology: 'concentric_sanctum' })
      const resultA = resolveMapMetadata(stagesA, createSequenceRng([0.1]))
      const resultB = resolveMapMetadata(stagesB, createSequenceRng([0.1]))
      expect(resultA.occupierKnownRouteIds).toEqual(resultB.occupierKnownRouteIds)
    })
  })
})
