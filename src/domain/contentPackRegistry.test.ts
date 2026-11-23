import { describe, expect, it } from 'vitest'
import {
  createEmptyContentPackRegistry,
  registerContentPack,
  selectContentPacks,
  type ContentPack,
} from './contentPackRegistry'

describe('contentPackRegistry (SPE-1510)', () => {
  const corePack: ContentPack = {
    id: 'core-anomalies',
    name: 'Core Anomalies',
    kind: 'core',
    entries: ['anomaly:scp-173', 'anomaly:scp-682'],
  }
  const regionalPack: ContentPack = {
    id: 'midwest-hazards',
    name: 'Midwest Local Hazards',
    kind: 'regional',
    entries: ['hazard:corn-field', 'hazard:river-bend'],
    includeWhen: { biome: 'midwest' },
  }
  const restrictedPack: ContentPack = {
    id: 'restricted-faction',
    name: 'Restricted Faction Patterns',
    kind: 'faction',
    entries: ['pattern:hostile-doctrine'],
    excludeWhen: { legality: 'legal' },
  }

  it('registers two packs and selects both under matching context', () => {
    let registry = createEmptyContentPackRegistry()
    registry = registerContentPack(registry, corePack)!
    registry = registerContentPack(registry, regionalPack)!
    expect(registry).not.toBeNull()

    const selected = selectContentPacks(registry, { biome: 'midwest' })
    expect(selected).toHaveLength(2)
    expect(selected.map((s) => s.packId).sort()).toEqual(['core-anomalies', 'midwest-hazards'])
    expect(selected.every((s) => s.provenance.startsWith('SPE-1510:'))).toBe(true)
  })

  it('applies context gate so regional pack is excluded outside biome', () => {
    let registry = createEmptyContentPackRegistry()
    registry = registerContentPack(registry, corePack)!
    registry = registerContentPack(registry, regionalPack)!

    const selected = selectContentPacks(registry, { biome: 'coastal' })
    expect(selected).toHaveLength(1)
    expect(selected[0]!.packId).toBe('core-anomalies')
    expect(selected[0]!.provenance).toBe('SPE-1510:core-anomalies:core')
  })

  it('retains pack provenance on selected results', () => {
    let registry = createEmptyContentPackRegistry()
    registry = registerContentPack(registry, restrictedPack)!

    const selected = selectContentPacks(registry, { legality: 'restricted' })
    expect(selected).toHaveLength(1)
    expect(selected[0]!.provenance).toContain('restricted-faction')
    expect(selected[0]!.entries).toEqual(['pattern:hostile-doctrine'])
  })

  it('rejects unsafe or oversized registration', () => {
    const registry = createEmptyContentPackRegistry()
    const bad = registerContentPack(registry, {
      id: '__proto__',
      name: 'bad',
      kind: 'core',
      entries: [],
    })
    expect(bad).toBeNull()
  })
})
