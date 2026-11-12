import { describe, expect, it } from 'vitest'
import {
  compareLayoutArchetypes,
  CRITICAL_ADJACENCY_ROOM_ID,
  normalizeZoneAdjacencies,
  resolveLayoutArchetypeMetrics,
  resolveMoraleSpaceEffect,
  resolveOversightSpaceEffect,
  resolveRoomAdjacencyOutput,
  resolveRouteTraversal,
  resolveSecureContainmentTradeoff,
  summarizeLayoutForDebug,
} from '../domain/facilityLayoutStrategy'

const ROSTER = Object.freeze([
  Object.freeze({ staffId: 's1', retention: 40, cohesion: 42 }),
  Object.freeze({ staffId: 's2', retention: 50, cohesion: 48 }),
])

describe('SPE-1026 facility layout strategy kernel', () => {
  it('AC1: hidden_annex raises secrecy vs compact while increasing staff travel time', () => {
    const comparison = compareLayoutArchetypes('hidden_annex', 'compact_headquarters')
    expect(comparison).toBeDefined()
    if (!comparison) throw new Error('missing comparison')
    expect(comparison.secrecyDelta).toBeGreaterThan(0)
    expect(comparison.staffTravelTimeDelta).toBeGreaterThan(0)
    expect(comparison.staffingEfficiencyDelta).toBeLessThan(0)

    const remote = compareLayoutArchetypes('remote_safehouse', 'compact_headquarters')
    expect(remote?.spreadResistanceDelta).toBeGreaterThan(0)
    expect(remote?.staffTravelTimeDelta).toBeGreaterThan(0)
  })

  it('AC2: distributed_campus raises capacity vs compact while increasing upgrade cost', () => {
    const comparison = compareLayoutArchetypes('distributed_campus', 'compact_headquarters')
    expect(comparison).toBeDefined()
    if (!comparison) throw new Error('missing comparison')
    expect(comparison.capacityDelta).toBeGreaterThan(0)
    expect(comparison.upgradeCostDelta).toBeGreaterThan(0)
    expect(comparison.secrecyDelta).toBeLessThan(0)
  })

  it('AC3: med_bay response/throughput differ when adjacent to containment_cell', () => {
    const adjacent = resolveRoomAdjacencyOutput('med_bay', true)
    const remote = resolveRoomAdjacencyOutput('med_bay', false)
    expect(adjacent).toMatchObject({
      roomId: 'med_bay',
      adjacentToCritical: true,
      breachIsolation: 'tight',
    })
    expect(remote).toMatchObject({
      roomId: 'med_bay',
      adjacentToCritical: false,
      breachIsolation: 'loose',
    })
    expect(adjacent!.responseTime).toBeLessThan(remote!.responseTime)
    expect(adjacent!.throughput).toBeGreaterThan(remote!.throughput)
    expect(adjacent!.efficiency).toBeGreaterThan(remote!.efficiency)
    expect(CRITICAL_ADJACENCY_ROOM_ID).toBe('containment_cell')
  })

  it('AC4: vertical routes differ in traversal cost or breach-spread vs flat corridor', () => {
    const flat = resolveRouteTraversal('flat_corridor')
    const elevator = resolveRouteTraversal('elevator')
    const vent = resolveRouteTraversal('vent')
    expect(flat).toMatchObject({ isVertical: false, traversalCost: 10, breachSpread: 40 })
    expect(elevator).toMatchObject({ isVertical: true })
    expect(vent).toMatchObject({ isVertical: true })
    expect(elevator!.traversalCost).toBeGreaterThan(flat!.traversalCost)
    expect(elevator!.breachSpread).toBeLessThan(flat!.breachSpread)
    expect(vent!.breachSpread).toBeGreaterThan(flat!.breachSpread)
    expect(vent!.traversalCost).toBeGreaterThan(flat!.traversalCost)
  })

  it('AC5: morale-support space raises retention/cohesion for the same roster', () => {
    const before = resolveMoraleSpaceEffect([], ROSTER)
    const after = resolveMoraleSpaceEffect(['staff_housing', 'lounge'], ROSTER)
    expect(before.retention).toBe(45)
    expect(before.cohesion).toBe(45)
    expect(after.retention).toBeGreaterThan(before.retention)
    expect(after.cohesion).toBeGreaterThan(before.cohesion)
    expect(after.spacesPresent).toEqual(['staff_housing', 'lounge'])
  })

  it('AC6: leadership/admin space raises oversight/audit-pressure when present', () => {
    const before = resolveOversightSpaceEffect([])
    const after = resolveOversightSpaceEffect(['director_office', 'internal_affairs'])
    expect(before.oversight).toBe(20)
    expect(before.auditPressure).toBe(15)
    expect(after.oversight).toBeGreaterThan(before.oversight)
    expect(after.auditPressure).toBeGreaterThan(before.auditPressure)
    expect(after.spacesPresent).toEqual(['director_office', 'internal_affairs'])
  })

  it('AC7: secure_clean containment imposes travel/morale/logistics cost vs open_porous', () => {
    const open = resolveSecureContainmentTradeoff('open_porous')
    const secure = resolveSecureContainmentTradeoff('secure_clean')
    expect(secure!.secrecy).toBeGreaterThan(open!.secrecy)
    expect(secure!.travelTime).toBeGreaterThan(open!.travelTime)
    expect(secure!.morale).toBeLessThan(open!.morale)
    expect(secure!.logisticsThroughput).toBeLessThan(open!.logisticsThroughput)
  })

  it('fail-closes unknown archetype, room, route, and containment mode', () => {
    expect(resolveLayoutArchetypeMetrics('bunker_mega')).toBeUndefined()
    expect(compareLayoutArchetypes('compact_headquarters', null)).toBeUndefined()
    expect(resolveRoomAdjacencyOutput('parking_garage', true)).toBeUndefined()
    expect(resolveRouteTraversal('teleporter')).toBeUndefined()
    expect(resolveSecureContainmentTradeoff('max_security')).toBeUndefined()
  })

  it('normalizes zone adjacency deterministically and drops malformed edges', () => {
    const edges = normalizeZoneAdjacencies([
      { fromZoneId: 'containment', toZoneId: 'medical' },
      { fromZoneId: 'medical', toZoneId: 'containment' },
      { fromZoneId: 'storage', toZoneId: 'storage' },
      { fromZoneId: 'nope', toZoneId: 'medical' },
      null,
      { fromZoneId: 'administration', toZoneId: 'operations' },
    ])
    expect(edges).toEqual([
      { fromZoneId: 'administration', toZoneId: 'operations' },
      { fromZoneId: 'containment', toZoneId: 'medical' },
    ])
  })

  it('summarizes layout for planning/debug with legible zone map and route burdens', () => {
    const summary = summarizeLayoutForDebug({
      archetype: 'hidden_annex',
      zones: ['containment', 'medical', 'administration', 'unknown_zone'],
      adjacencies: [
        { fromZoneId: 'medical', toZoneId: 'containment' },
        { fromZoneId: 'administration', toZoneId: 'operations' },
      ],
      routeKinds: ['flat_corridor', 'vent', 'elevator'],
    })
    expect(summary).toMatchObject({
      archetype: 'hidden_annex',
      zoneCount: 3,
    })
    expect(summary!.metrics.secrecy).toBeGreaterThan(
      resolveLayoutArchetypeMetrics('compact_headquarters')!.secrecy
    )
    expect(summary!.keyAdjacencies).toEqual([
      { fromZoneId: 'administration', toZoneId: 'operations' },
      { fromZoneId: 'containment', toZoneId: 'medical' },
    ])
    expect(summary!.routeBurdens.map((route) => route.routeKind)).toEqual([
      'flat_corridor',
      'elevator',
      'vent',
    ])
  })

  it('ignores unknown morale/oversight spaces and preserves roster baseline', () => {
    const morale = resolveMoraleSpaceEffect(['spa', 'staff_housing'], ROSTER)
    expect(morale.spacesPresent).toEqual(['staff_housing'])
    expect(morale.retention).toBe(53)

    const oversight = resolveOversightSpaceEffect(['cafeteria', 'legal'])
    expect(oversight.spacesPresent).toEqual(['legal'])
    expect(oversight.auditPressure).toBe(27)
  })
})
