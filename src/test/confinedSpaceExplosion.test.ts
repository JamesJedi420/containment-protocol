import { describe, expect, it } from 'vitest'
import {
  CONFINED_SPACE_EXPLOSION_OWNER,
  createVolatileBuildupSnapshot,
  evaluateConfinedSpaceExplosion,
} from '../domain/confinedSpaceExplosion'

describe('SPE-263 confined-space explosion propagation', () => {
  it('exports owner and changes blast behavior for confined geometry', () => {
    expect(CONFINED_SPACE_EXPLOSION_OWNER).toBe('SPE-263')

    const open = evaluateConfinedSpaceExplosion(
      createVolatileBuildupSnapshot({
        spaceId: 'space-yard',
        geometry: 'open',
        volatileLevel: 10,
        warningThreshold: 4,
        ignitionThreshold: 8,
        ignitionSourcePresent: true,
      }),
    )
    const tunnel = evaluateConfinedSpaceExplosion(
      createVolatileBuildupSnapshot({
        spaceId: 'space-tunnel',
        geometry: 'tunnel',
        volatileLevel: 10,
        warningThreshold: 4,
        ignitionThreshold: 8,
        ignitionSourcePresent: true,
      }),
    )

    expect(open.ignited).toBe(true)
    expect(tunnel.ignited).toBe(true)
    expect(open.blastShape).toBe('radial_open')
    expect(tunnel.blastShape).toBe('channeled_axial')
    expect(tunnel.blastIntensity).toBeGreaterThan(open.blastIntensity)
    expect(tunnel.reasons).toContain('confined-amplification')
    expect(open.reasons).toContain('open-radial')

    const shaft = evaluateConfinedSpaceExplosion(
      createVolatileBuildupSnapshot({
        spaceId: 'space-shaft-ignite',
        geometry: 'shaft',
        volatileLevel: 10,
        warningThreshold: 4,
        ignitionThreshold: 8,
        ignitionSourcePresent: true,
      }),
    )
    const corridor = evaluateConfinedSpaceExplosion(
      createVolatileBuildupSnapshot({
        spaceId: 'space-corridor',
        geometry: 'corridor',
        volatileLevel: 10,
        warningThreshold: 4,
        ignitionThreshold: 8,
        ignitionSourcePresent: true,
      }),
    )
    expect(shaft.blastShape).toBe('amplified_confined')
    expect(shaft.blastIntensity).toBe(20)
    expect(corridor.blastShape).toBe('channeled_axial')
    expect(corridor.blastIntensity).toBe(12.5)
  })

  it('shows a warning before ignition under explicit threshold conditions', () => {
    const warning = evaluateConfinedSpaceExplosion(
      createVolatileBuildupSnapshot({
        spaceId: 'space-shaft',
        geometry: 'shaft',
        volatileLevel: 5,
        warningThreshold: 4,
        ignitionThreshold: 8,
        ignitionSourcePresent: true,
      }),
    )
    expect(warning.ignitionState).toBe('warning')
    expect(warning.warningVisible).toBe(true)
    expect(warning.ignited).toBe(false)
    expect(warning.blastShape).toBe('none')
    expect(warning.reasons).toContain('warning:volatile-threshold')

    const deferred = evaluateConfinedSpaceExplosion(
      createVolatileBuildupSnapshot({
        spaceId: 'space-shaft',
        geometry: 'shaft',
        volatileLevel: 9,
        warningThreshold: 4,
        ignitionThreshold: 8,
        ignitionSourcePresent: false,
      }),
    )
    expect(deferred.ignited).toBe(false)
    expect(deferred.warningVisible).toBe(true)
    expect(deferred.reasons).toContain('ignition-deferred:no-source')
  })

  it('fail-closes invalid geometry and inverted thresholds', () => {
    expect(() =>
      createVolatileBuildupSnapshot({
        spaceId: 'space-x',
        geometry: 'open',
        volatileLevel: 1,
        warningThreshold: 5,
        ignitionThreshold: 2,
        ignitionSourcePresent: true,
      }),
    ).toThrow(/ignitionThreshold must be >= warningThreshold/)

    expect(() =>
      createVolatileBuildupSnapshot({
        spaceId: 'space-x',
        geometry: 'room' as 'open',
        volatileLevel: 1,
        warningThreshold: 1,
        ignitionThreshold: 2,
        ignitionSourcePresent: true,
      }),
    ).toThrow(/geometry is invalid/)

    expect(() =>
      createVolatileBuildupSnapshot({
        spaceId: '  ',
        geometry: 'open',
        volatileLevel: 1,
        warningThreshold: 1,
        ignitionThreshold: 2,
        ignitionSourcePresent: true,
      }),
    ).toThrow(/spaceId is required/)

    expect(() =>
      createVolatileBuildupSnapshot({
        spaceId: 'space-x',
        geometry: 'open',
        volatileLevel: Number.NaN,
        warningThreshold: 1,
        ignitionThreshold: 2,
        ignitionSourcePresent: true,
      }),
    ).toThrow(/volatileLevel must be a finite number/)
  })
})
