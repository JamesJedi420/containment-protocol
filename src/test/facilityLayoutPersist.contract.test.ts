import { describe, expect, it } from 'vitest'
import { hydrateGame, migratePersistedStore } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  normalizeZoneAdjacencies,
  parseFacilityLayoutSnapshot,
  resolveFacilityLayoutSnapshot,
  resolveLayoutArchetypeMetrics,
  resolveMoraleSpaceEffect,
  resolveOversightSpaceEffect,
  resolveRoomAdjacencyOutput,
  resolveSecureContainmentTradeoff,
} from '../domain/facilityLayoutStrategy'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'
import { advanceWeek } from '../domain/sim/advanceWeek'

const ROSTER = Object.freeze([
  Object.freeze({ staffId: 's1', retention: 40, cohesion: 42 }),
  Object.freeze({ staffId: 's2', retention: 50, cohesion: 48 }),
])

const AUTHORED = {
  archetype: 'hidden_annex',
  suggestedArchetype: 'compact_headquarters',
  zoneAdjacencies: [
    { fromZoneId: 'storage', toZoneId: 'medical' },
    { fromZoneId: 'medical', toZoneId: 'containment' },
    { fromZoneId: 'medical', toZoneId: 'medical' },
    { fromZoneId: 'hangar', toZoneId: 'research' },
    { fromZoneId: 'research', toZoneId: 'utilities' },
  ],
  moraleSpaces: ['lounge', 'arcade', 'staff_housing', 'lounge'],
  oversightSpaces: ['legal', 'press_office'],
  rooms: [
    { roomId: 'med_bay', adjacentToCritical: true },
    { roomId: 'med_bay', adjacentToCritical: false },
    { roomId: 'planetarium', adjacentToCritical: true },
    { roomId: 'archive', adjacentToCritical: 'yes' },
    { roomId: 'containment_cell', adjacentToCritical: false },
    'med_bay',
  ],
  containmentMode: 'secure_clean',
  routeKinds: ['vent'],
} as const

function expectedSnapshot() {
  return {
    archetype: 'hidden_annex',
    zoneAdjacencies: [
      { fromZoneId: 'containment', toZoneId: 'medical' },
      { fromZoneId: 'medical', toZoneId: 'storage' },
      { fromZoneId: 'research', toZoneId: 'utilities' },
    ],
    moraleSpaces: ['staff_housing', 'lounge'],
    oversightSpaces: ['legal'],
    rooms: [
      { roomId: 'med_bay', adjacentToCritical: true },
      { roomId: 'containment_cell', adjacentToCritical: false },
    ],
    containmentMode: 'secure_clean',
  }
}

describe('SPE-2986 facility layout snapshot persist', () => {
  it('parses omit and malformed values to the absent baseline', () => {
    expect(parseFacilityLayoutSnapshot(undefined)).toBeUndefined()
    expect(parseFacilityLayoutSnapshot(null)).toBeUndefined()
    expect(parseFacilityLayoutSnapshot([])).toBeUndefined()
    expect(parseFacilityLayoutSnapshot('hidden_annex')).toBeUndefined()
    expect(parseFacilityLayoutSnapshot(1)).toBeUndefined()
    expect(parseFacilityLayoutSnapshot({})).toBeUndefined()
    expect(
      parseFacilityLayoutSnapshot({
        archetype: 'mega_base',
        zoneAdjacencies: 'nope',
        moraleSpaces: null,
        oversightSpaces: { legal: true },
        rooms: { med_bay: true },
        containmentMode: 'fortress',
      })
    ).toBeUndefined()
    expect(
      parseFacilityLayoutSnapshot({
        archetype: 12,
        zoneAdjacencies: [{ fromZoneId: 'hangar', toZoneId: 'medical' }],
      })
    ).toBeUndefined()
  })

  it('preserves valid authored records and rejects unknown ids without guessing', () => {
    const parsed = parseFacilityLayoutSnapshot(AUTHORED)
    expect(parsed).toEqual(expectedSnapshot())
    expect(parsed?.archetype).toBe('hidden_annex')
    expect(parsed?.archetype).not.toBe('compact_headquarters')
    expect(parsed?.zoneAdjacencies).toEqual(normalizeZoneAdjacencies(AUTHORED.zoneAdjacencies))
    expect(parsed?.rooms.find((room) => room.roomId === 'med_bay')?.adjacentToCritical).toBe(true)
    expect(parsed?.rooms.some((room) => room.roomId === 'archive')).toBe(false)
  })

  it('does not mutate the input snapshot', () => {
    const input = {
      archetype: 'compact_headquarters',
      zoneAdjacencies: [{ fromZoneId: 'storage', toZoneId: 'medical' }],
      moraleSpaces: ['lounge'],
    }
    const before = structuredClone(input)
    parseFacilityLayoutSnapshot(input)
    expect(input).toEqual(before)
  })

  it('drops zone edges whose ids are inherited rather than own properties', () => {
    const inherited = Object.create({
      fromZoneId: 'medical',
      toZoneId: 'storage',
    }) as Record<string, unknown>
    const parsed = parseFacilityLayoutSnapshot({
      archetype: 'hidden_annex',
      zoneAdjacencies: [inherited],
    })
    expect(parsed?.archetype).toBe('hidden_annex')
    expect(parsed?.zoneAdjacencies).toEqual([])
  })

  it('ignores inherited archetype and keeps an own morale space', () => {
    const raw = Object.create({ archetype: 'hidden_annex' }) as Record<string, unknown>
    raw.moraleSpaces = ['lounge']
    const parsed = parseFacilityLayoutSnapshot(raw)
    expect(parsed?.archetype).toBeUndefined()
    expect(parsed?.moraleSpaces).toEqual(['lounge'])
  })

  it('resolves persisted inputs with the pure kernel helpers', () => {
    const parsed = parseFacilityLayoutSnapshot(AUTHORED)
    expect(parsed).toBeDefined()
    if (!parsed) throw new Error('missing snapshot')
    const resolved = resolveFacilityLayoutSnapshot(parsed, ROSTER)
    expect(resolved.archetypeMetrics).toEqual(resolveLayoutArchetypeMetrics(parsed.archetype))
    expect(resolved.zoneAdjacencies).toEqual(normalizeZoneAdjacencies(AUTHORED.zoneAdjacencies))
    expect(resolved.morale).toEqual(resolveMoraleSpaceEffect(parsed.moraleSpaces, ROSTER))
    expect(resolved.oversight).toEqual(resolveOversightSpaceEffect(parsed.oversightSpaces))
    expect(resolved.containment).toEqual(resolveSecureContainmentTradeoff(parsed.containmentMode))
    expect(resolved.rooms).toEqual(
      parsed.rooms.map((room) => resolveRoomAdjacencyOutput(room.roomId, room.adjacentToCritical))
    )

    const baseline = resolveFacilityLayoutSnapshot(undefined, ROSTER)
    expect(baseline.archetypeMetrics).toBeUndefined()
    expect(baseline.zoneAdjacencies).toEqual([])
    expect(baseline.morale).toEqual(resolveMoraleSpaceEffect([], ROSTER))
    expect(baseline.oversight).toEqual(resolveOversightSpaceEffect([]))
    expect(baseline.containment).toBeUndefined()
    expect(baseline.rooms).toEqual([])
  })

  it('does not inherit a fallback snapshot when the field is omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityLayoutSnapshot: parseFacilityLayoutSnapshot(AUTHORED),
    }
    const hydrated = hydrateGame({ ...starting, facilityLayoutSnapshot: undefined }, fallback)
    expect(hydrated.facilityLayoutSnapshot).toBeUndefined()
    expect(fallback.facilityLayoutSnapshot).toEqual(expectedSnapshot())
    expect(createStartingState().facilityLayoutSnapshot).toBeUndefined()
  })

  it('hydrates a malformed snapshot to baseline without taking the fallback', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityLayoutSnapshot: parseFacilityLayoutSnapshot({
        archetype: 'compact_headquarters',
      }),
    }
    const hydrated = hydrateGame(
      {
        ...starting,
        facilityLayoutSnapshot: {
          archetype: 'mega_base',
          zoneAdjacencies: [{ fromZoneId: 'hangar', toZoneId: 'medical' }],
          rooms: [{ roomId: 'med_bay', adjacentToCritical: 'yes' }],
        },
      },
      fallback
    )
    expect(hydrated.facilityLayoutSnapshot).toBeUndefined()
    expect(fallback.facilityLayoutSnapshot?.archetype).toBe('compact_headquarters')
    expect(() =>
      parseFacilityLayoutSnapshot({
        archetype: 'mega_base',
        zoneAdjacencies: null,
      })
    ).not.toThrow()
  })

  it('round-trips a valid archetype, zone adjacencies, and space sets', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.departmentLocalStaging = {
      'department:records-analysis': { inputStaging: 'adjacent', outputStaging: 'remote' },
    }
    state.facilityLayoutSnapshot = parseFacilityLayoutSnapshot(AUTHORED)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityLayoutSnapshot).toEqual(expectedSnapshot())
    expect(hydrated.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(hydrated.departmentLocalStaging).toEqual({
      'department:records-analysis': { inputStaging: 'adjacent', outputStaging: 'remote' },
    })

    const migrated = migratePersistedStore(
      { game: JSON.parse(JSON.stringify(state)) },
      6,
      createStartingState()
    )
    expect(migrated.game.facilityLayoutSnapshot).toEqual(expectedSnapshot())
  })

  it('does not consume or rewrite the snapshot at week-close', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.departmentLocalStaging = {
      'department:records-analysis': { inputStaging: 'remote', outputStaging: 'remote' },
    }
    state.facilityLayoutSnapshot = parseFacilityLayoutSnapshot(AUTHORED)
    const snapshotBefore = structuredClone(state.facilityLayoutSnapshot)
    const stockBefore = structuredClone(state.facilityStockpile)
    const stagingBefore = structuredClone(state.departmentLocalStaging)
    const next = advanceWeek(state, Date.UTC(2026, 0, 1))
    expect(next.facilityLayoutSnapshot).toEqual(snapshotBefore)
    expect(next.facilityStockpile).toEqual(stockBefore)
    expect(next.departmentLocalStaging).toEqual(stagingBefore)
    expect(next.week).toBe(state.week + 1)
  })
})
