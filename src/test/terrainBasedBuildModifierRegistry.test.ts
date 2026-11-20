import { describe, expect, it } from 'vitest'
import {
  TERRAIN_BUILD_MODIFIER_FIXTURES,
  lookupTerrainBuildModifierRecord,
  normalizeTerrainBuildModifierRecords,
  terrainSupportsConstructionRequirement,
  validateTerrainBuildModifierRecords,
} from '../domain/terrainBasedBuildModifierRegistry'

describe('terrainBasedBuildModifierRegistry (SPE-3356)', () => {
  it('accepts fixture records with legal conditions, outputs, and support classes', () => {
    const result = validateTerrainBuildModifierRecords(TERRAIN_BUILD_MODIFIER_FIXTURES)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('normalizes fixtures order-independently by id', () => {
    const reversed = [...TERRAIN_BUILD_MODIFIER_FIXTURES].reverse()
    const normalized = normalizeTerrainBuildModifierRecords(reversed)
    expect(normalized).not.toBeNull()
    expect(normalized?.map((r) => r.id)).toEqual([
      'terrain-build:contaminated-scar',
      'terrain-build:improved-plot',
      'terrain-build:open-plot',
      'terrain-build:unstable-ground',
    ])
  })

  it('rejects unknown terrain condition and buildability output', () => {
    const bad = [
      {
        id: 'terrain-build:bad',
        terrainCondition: 'volcanic',
        buildabilityOutput: 'buildable',
      },
      {
        id: 'terrain-build:worse',
        terrainCondition: 'open',
        buildabilityOutput: 'impossible',
      },
    ]
    const result = validateTerrainBuildModifierRecords(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.code).sort()).toEqual([
      'unknown_buildability_output',
      'unknown_terrain_condition',
    ])
  })

  it('rejects duplicate record ids', () => {
    const dup = [
      TERRAIN_BUILD_MODIFIER_FIXTURES[0],
      { ...TERRAIN_BUILD_MODIFIER_FIXTURES[0], notes: 'copy' },
    ]
    const result = validateTerrainBuildModifierRecords(dup)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'duplicate_record_id')).toBe(true)
  })

  it('looks up a fixture by id', () => {
    const lookup = lookupTerrainBuildModifierRecord(
      TERRAIN_BUILD_MODIFIER_FIXTURES,
      'terrain-build:contaminated-scar'
    )
    expect(lookup.status).toBe('found')
    if (lookup.status === 'found') {
      expect(lookup.record.buildabilityOutput).toBe('contaminated')
      expect(lookup.record.scarPermanent).toBe(true)
    }
  })

  it('returns unknown for missing id', () => {
    const lookup = lookupTerrainBuildModifierRecord(
      TERRAIN_BUILD_MODIFIER_FIXTURES,
      'terrain-build:missing'
    )
    expect(lookup.status).toBe('unknown_record_id')
  })

  it('distinguishes contaminated/unstable restriction from improved positive modifier', () => {
    const contaminated = TERRAIN_BUILD_MODIFIER_FIXTURES.find(
      (r) => r.id === 'terrain-build:contaminated-scar'
    )!
    const improved = TERRAIN_BUILD_MODIFIER_FIXTURES.find(
      (r) => r.id === 'terrain-build:improved-plot'
    )!
    expect(contaminated.buildabilityOutput).toBe('contaminated')
    expect(improved.buildabilityOutput).toBe('improved')
    expect(improved.costModifier).toBeLessThan(1)
  })

  it('resolves construction support implication deterministically without hierarchy engine', () => {
    const heavy = TERRAIN_BUILD_MODIFIER_FIXTURES.find((r) => r.id === 'terrain-build:open-plot')!
    const light = TERRAIN_BUILD_MODIFIER_FIXTURES.find(
      (r) => r.id === 'terrain-build:unstable-ground'
    )!
    expect(terrainSupportsConstructionRequirement(heavy, 'lightweight')).toBe(true)
    expect(terrainSupportsConstructionRequirement(heavy, 'heavy')).toBe(true)
    expect(terrainSupportsConstructionRequirement(light, 'heavy')).toBe(false)
    expect(terrainSupportsConstructionRequirement(light, 'lightweight')).toBe(true)
    const clearance = TERRAIN_BUILD_MODIFIER_FIXTURES.find(
      (r) => r.id === 'terrain-build:contaminated-scar'
    )!
    expect(terrainSupportsConstructionRequirement(clearance, 'clearance-dependent')).toBe(true)
    expect(terrainSupportsConstructionRequirement(clearance, 'lightweight')).toBe(false)
  })

  it('keeps legal ownership out of the registry contract', () => {
    // No ownership, claim, or permission fields exist on the record type.
    const record = TERRAIN_BUILD_MODIFIER_FIXTURES[0]
    expect(Object.keys(record)).not.toContain('ownership')
    expect(Object.keys(record)).not.toContain('claimState')
    expect(Object.keys(record)).not.toContain('legalPermission')
  })
})
