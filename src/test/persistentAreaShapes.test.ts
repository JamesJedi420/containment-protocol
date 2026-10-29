import { describe, expect, it } from 'vitest'
import {
  createPersistentAreaShape,
  defaultConduitForFamily,
  evaluatePersistentAreaShape,
  routeSurfaceAdjacency,
  type PersistentAreaShape,
  type SurfaceNode,
} from '../domain/persistentAreaShapes'

const cloudBase: PersistentAreaShape = {
  shapeId: 'cloud-toxin',
  family: 'cloud',
  conduit: 'volume_fill',
  layers: ['vision_denial', 'burning'],
  dwellTicksToEscalate: 3,
  anchorLocationId: 'room-a',
  active: true,
}

const wallBase: PersistentAreaShape = {
  shapeId: 'wall-charge',
  family: 'wall',
  conduit: 'surfaceAdjacency',
  layers: ['charge', 'selective_barrier', 'movement_denial'],
  dwellTicksToEscalate: 2,
  anchorLocationId: 'corridor-1',
  active: true,
}

const surfaces: SurfaceNode[] = [
  { surfaceId: 'floor-a', adjacentSurfaceIds: ['wall-ab', 'floor-b'] },
  { surfaceId: 'wall-ab', adjacentSurfaceIds: ['floor-a', 'floor-b'] },
  { surfaceId: 'floor-b', adjacentSurfaceIds: ['wall-ab', 'floor-a'] },
  { surfaceId: 'isolated', adjacentSurfaceIds: [] },
]

describe('SPE-408 persistent area shapes', () => {
  it('uses distinct operational defaults for cloud vs wall families', () => {
    expect(defaultConduitForFamily('cloud')).toBe('volume_fill')
    expect(defaultConduitForFamily('wall')).toBe('surfaceAdjacency')
    const cloud = createPersistentAreaShape(cloudBase)
    const wall = createPersistentAreaShape(wallBase)
    expect(cloud.conduit).toBe('volume_fill')
    expect(wall.conduit).toBe('surfaceAdjacency')
    expect(cloud.layers).toEqual(['vision_denial', 'burning'])
  })

  it('escalates layered effects only after dwell threshold', () => {
    const pending = evaluatePersistentAreaShape({
      shape: cloudBase,
      contact: { locationId: 'room-a', dwellTicks: 1 },
    })
    expect(pending.escalated).toBe(false)
    expect(pending.activeLayers).toEqual(['vision_denial'])

    const escalated = evaluatePersistentAreaShape({
      shape: cloudBase,
      contact: { locationId: 'room-a', dwellTicks: 3 },
    })
    expect(escalated.escalated).toBe(true)
    expect(escalated.activeLayers).toEqual(['vision_denial', 'burning'])
    expect(escalated.reasons).toContain('dwell-escalated')
  })

  it('routes surfaceAdjacency without treating disconnected surfaces as infected', () => {
    const routed = routeSurfaceAdjacency({
      originSurfaceId: 'floor-a',
      surfaces,
      maxHops: 2,
    })
    expect(routed).toEqual(['floor-a', 'floor-b', 'wall-ab'])
    expect(routed).not.toContain('isolated')

    const wallHit = evaluatePersistentAreaShape({
      shape: wallBase,
      contact: {
        locationId: 'corridor-1',
        dwellTicks: 2,
        contactingSurfaceId: 'floor-a',
      },
      surfaces,
    })
    expect(wallHit.surfaceRoutedIds).toEqual(['floor-a', 'floor-b', 'wall-ab'])
    expect(wallHit.activeLayers).toEqual(['charge', 'selective_barrier', 'movement_denial'])
  })

  it('requires surface contact for walls and relocates mobile anchors without stale exposure', () => {
    const noContact = evaluatePersistentAreaShape({
      shape: wallBase,
      contact: { locationId: 'corridor-1', dwellTicks: 5 },
    })
    expect(noContact.activeLayers).toEqual([])
    expect(noContact.escalated).toBe(false)
    expect(noContact.reasons).not.toContain('dwell-escalated')
    expect(noContact.reasons.some((r) => r.startsWith('no-contact:'))).toBe(true)

    const remoteSurface = evaluatePersistentAreaShape({
      shape: wallBase,
      contact: {
        locationId: 'other-room',
        dwellTicks: 5,
        contactingSurfaceId: 'floor-a',
      },
      surfaces,
    })
    expect(remoteSurface.activeLayers).toEqual([])
    expect(remoteSurface.reasons).toContain('outside-footprint')

    const surfaceAdjWithoutSurface = evaluatePersistentAreaShape({
      shape: { ...cloudBase, conduit: 'surfaceAdjacency' },
      contact: { locationId: 'room-a', dwellTicks: 3 },
    })
    expect(surfaceAdjWithoutSurface.activeLayers).toEqual([])
    expect(surfaceAdjWithoutSurface.reasons.some((r) => r.startsWith('no-contact:'))).toBe(true)

    const moved = evaluatePersistentAreaShape({
      shape: { ...cloudBase, anchorLocationId: 'room-b' },
      contact: { locationId: 'room-b', dwellTicks: 3 },
      priorExposedLocationIds: ['room-a', 'room-b'],
    })
    expect(moved.affectedLocationIds).toEqual(['room-b'])
    expect(moved.reasons).toContain('stale-cleared:room-a')
    expect(moved.reasons).not.toContain('stale-cleared:room-b')
  })

  it('fails closed on invalid packets and inactive shapes', () => {
    expect(() =>
      createPersistentAreaShape({ ...cloudBase, layers: [] }),
    ).toThrow(/at least one hazard layer/)
    expect(() =>
      createPersistentAreaShape({ ...cloudBase, dwellTicksToEscalate: 0 }),
    ).toThrow(/dwellTicksToEscalate/)
    expect(() =>
      routeSurfaceAdjacency({ originSurfaceId: 'missing', surfaces, maxHops: 1 }),
    ).toThrow(/unknown origin surface/)

    const inactive = evaluatePersistentAreaShape({
      shape: { ...cloudBase, active: false },
      contact: { locationId: 'room-a', dwellTicks: 9 },
    })
    expect(inactive.reasons).toEqual(['inactive'])
    expect(inactive.affectedLocationIds).toEqual([])
  })
})
