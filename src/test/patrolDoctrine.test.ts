import { describe, expect, it } from 'vitest'
import {
  createPatrolDoctrineRegistry,
  resolvePatrolDoctrineResponse,
  type PatrolDoctrineRegistry,
} from '../domain/patrolDoctrine'

const registryBase: PatrolDoctrineRegistry = {
  zones: [
    {
      zoneId: 'perimeter-a',
      geometryRef: 'geo:perimeter-a',
      priority: 2,
      pursuitRule: 'limited_pursuit',
      overrideConditions: ['require_clearance'],
    },
    {
      zoneId: 'gate-b',
      geometryRef: 'geo:gate-b',
      priority: 5,
      pursuitRule: 'hold_zone',
      overrideConditions: [],
    },
  ],
  escorts: [
    {
      policyId: 'escort-vip',
      assetTag: 'vip-convoy',
      stance: 'tight',
      abandonOnFailureKinds: ['glamoured_victim'],
    },
  ],
}

describe('SPE-2271 patrol doctrine', () => {
  it('orders zones by priority and changes response from policy without per-unit orders', () => {
    const registry = createPatrolDoctrineRegistry(registryBase)
    expect(registry.zones.map((z) => z.zoneId)).toEqual(['gate-b', 'perimeter-a'])

    const patrol = resolvePatrolDoctrineResponse({
      registry,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: false,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
      },
    })
    expect(patrol.action).toBe('patrol_zone')
    expect(patrol.zoneId).toBe('perimeter-a')

    const pursue = resolvePatrolDoctrineResponse({
      registry,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: true,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
      },
    })
    expect(pursue.action).toBe('pursue_contact')
    expect(pursue.reasons).toContain('pursuit:limited_pursuit')

    const hold = resolvePatrolDoctrineResponse({
      registry,
      stimulus: {
        activeZoneId: 'gate-b',
        contactPresent: true,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
      },
    })
    expect(hold.action).toBe('patrol_zone')
    expect(hold.reasons).toContain('patrol:hold_zone')
  })

  it('represents doctrine failure scenarios including decoy pursuit', () => {
    const decoy = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: true,
        contactIsDecoy: true,
        contactIsGlamoured: false,
        zoneCleared: true,
      },
    })
    expect(decoy.action).toBe('doctrine_failure')
    expect(decoy.failureKind).toBe('decoy_pursuit')

    const uncleared = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: false,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: false,
      },
    })
    expect(uncleared.failureKind).toBe('uncleared_zone')

    const escort = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'gate-b',
        contactPresent: false,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
        escortedAssetTag: 'vip-convoy',
      },
    })
    expect(escort.action).toBe('escort_asset')
    expect(escort.policyId).toBe('escort-vip')

    const glamouredAbandon = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: true,
        contactIsDecoy: false,
        contactIsGlamoured: true,
        zoneCleared: true,
        escortedAssetTag: 'vip-convoy',
      },
    })
    expect(glamouredAbandon.action).toBe('hold_position')
    expect(glamouredAbandon.failureKind).toBe('glamoured_victim')
    expect(glamouredAbandon.reasons).toContain('abandon:glamoured_victim')

    const abandonAlarmRegistry = createPatrolDoctrineRegistry({
      zones: registryBase.zones,
      escorts: [
        {
          policyId: 'escort-alarm',
          assetTag: 'vip-convoy',
          stance: 'abandon_on_alarm',
          abandonOnFailureKinds: [],
        },
      ],
    })
    const abandonAlarm = resolvePatrolDoctrineResponse({
      registry: abandonAlarmRegistry,
      stimulus: {
        activeZoneId: 'gate-b',
        contactPresent: true,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
        escortedAssetTag: 'vip-convoy',
      },
    })
    expect(abandonAlarm.action).toBe('hold_position')
    expect(abandonAlarm.reasons).toContain('escort:abandon_on_alarm')

    const escortBeatsDecoy = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: true,
        contactIsDecoy: true,
        contactIsGlamoured: false,
        zoneCleared: true,
        escortedAssetTag: 'vip-convoy',
      },
    })
    expect(escortBeatsDecoy.action).toBe('escort_asset')
    expect(escortBeatsDecoy.policyId).toBe('escort-vip')
    expect(escortBeatsDecoy.failureKind).toBeNull()

    const glamouredBeatsDecoy = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: true,
        contactIsDecoy: true,
        contactIsGlamoured: true,
        zoneCleared: true,
        escortedAssetTag: 'vip-convoy',
      },
    })
    expect(glamouredBeatsDecoy.action).toBe('hold_position')
    expect(glamouredBeatsDecoy.failureKind).toBe('glamoured_victim')
    expect(glamouredBeatsDecoy.reasons).toContain('abandon:glamoured_victim')

    const abandonAlarmVsDecoy = resolvePatrolDoctrineResponse({
      registry: abandonAlarmRegistry,
      stimulus: {
        activeZoneId: 'perimeter-a',
        contactPresent: true,
        contactIsDecoy: true,
        contactIsGlamoured: false,
        zoneCleared: true,
        escortedAssetTag: 'vip-convoy',
      },
    })
    expect(abandonAlarmVsDecoy.action).toBe('hold_position')
    expect(abandonAlarmVsDecoy.reasons).toContain('escort:abandon_on_alarm')
  })

  it('fails closed on invalid registry packets', () => {
    expect(() => createPatrolDoctrineRegistry({ zones: [], escorts: [] })).toThrow(
      /at least one zone or escort/,
    )
    expect(() =>
      createPatrolDoctrineRegistry({
        zones: [
          { ...registryBase.zones[0]!, zoneId: 'dup' },
          { ...registryBase.zones[1]!, zoneId: 'dup' },
        ],
        escorts: [],
      }),
    ).toThrow(/duplicate zoneId/)
    expect(() =>
      createPatrolDoctrineRegistry({
        zones: [{ ...registryBase.zones[0]!, pursuitRule: 'sprint' as 'hold_zone' }],
        escorts: [],
      }),
    ).toThrow(/pursuitRule is invalid/)

    const unknown = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'missing',
        contactPresent: false,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
      },
    })
    expect(unknown.action).toBe('hold_position')
    expect(unknown.reasons).toEqual(['unknown-zone'])

    const unknownEscort = resolvePatrolDoctrineResponse({
      registry: registryBase,
      stimulus: {
        activeZoneId: 'gate-b',
        contactPresent: false,
        contactIsDecoy: false,
        contactIsGlamoured: false,
        zoneCleared: true,
        escortedAssetTag: 'missing-asset',
      },
    })
    expect(unknownEscort.action).toBe('hold_position')
    expect(unknownEscort.reasons).toEqual(['unknown-escort-asset'])
  })
})
