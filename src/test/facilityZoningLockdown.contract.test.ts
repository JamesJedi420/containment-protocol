import { describe, expect, it } from 'vitest'
import {
  ZONING_FACILITY_ID,
  evaluateZoneAccess,
  projectFacilityZoningModel,
  projectOperationalZonePacket,
  projectZoningDebugSummary,
  resolveCirculationUnderPosture,
} from '../domain/facilityZoningLockdown'

const PUBLIC_ZONE = {
  zoneId: 'zone:lobby-front',
  zoneFunction: 'public_cover' as const,
}
const OPS_ZONE = {
  zoneId: 'zone:ops-floor',
  zoneFunction: 'operations' as const,
}
const HAZARD_ZONE = {
  zoneId: 'zone:test-cell-a',
  zoneFunction: 'hazard_test' as const,
  contiguousGroupId: 'wing:isolation-east',
}
const VAULT_ZONE = {
  zoneId: 'zone:deep-vault-1',
  zoneFunction: 'deep_vault' as const,
  contiguousGroupId: 'wing:isolation-east',
}
const CONTAINMENT_ZONE = {
  zoneId: 'zone:containment-ring',
  zoneFunction: 'containment' as const,
}

describe('SPE-292 facility zoning, access bands, and lockdown response', () => {
  it('projects distinct operational zone packets with different risk and access rules', () => {
    const publicZone = projectOperationalZonePacket(PUBLIC_ZONE)
    const hazard = projectOperationalZonePacket(HAZARD_ZONE)
    const vault = projectOperationalZonePacket(VAULT_ZONE)

    expect(publicZone).toMatchObject({
      zoneFunction: 'public_cover',
      minimumAccessBand: 'enter',
      riskBand: 'low',
      hazardIsolated: false,
      baselineCirculation: 'open',
    })
    expect(hazard).toMatchObject({
      zoneFunction: 'hazard_test',
      minimumAccessBand: 'operate',
      riskBand: 'critical',
      hazardIsolated: true,
      baselineCirculation: 'emergency_only',
      contiguousGroupId: 'wing:isolation-east',
    })
    expect(vault).toMatchObject({
      zoneFunction: 'deep_vault',
      minimumAccessBand: 'command',
      riskBand: 'critical',
      hazardIsolated: true,
      baselineCirculation: 'sealed',
    })
    expect(publicZone?.minimumAccessBand).not.toBe(vault?.minimumAccessBand)
    expect(publicZone?.riskBand).not.toBe(hazard?.riskBand)
  })

  it('builds one facility model with distinct functions under a reusable zone schema', () => {
    const model = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'normal',
      zones: [PUBLIC_ZONE, OPS_ZONE, HAZARD_ZONE, CONTAINMENT_ZONE, VAULT_ZONE],
    })

    expect(model).toMatchObject({
      facilityId: ZONING_FACILITY_ID,
      posture: 'normal',
      alarmState: 'quiet',
      usesDistinctRiskAndAccessRules: true,
    })
    expect(model?.distinctFunctions).toEqual(
      expect.arrayContaining([
        'public_cover',
        'operations',
        'hazard_test',
        'containment',
        'deep_vault',
      ])
    )
    expect(model?.zones).toHaveLength(5)
  })

  it('changes circulation under containment alarm and lockdown', () => {
    expect(
      resolveCirculationUnderPosture('open', 'containment_alarm', 'public_cover')
    ).toBe('staff_only')
    expect(
      resolveCirculationUnderPosture('staff_only', 'containment_alarm', 'containment')
    ).toBe('emergency_only')
    expect(
      resolveCirculationUnderPosture('emergency_only', 'containment_alarm', 'hazard_test')
    ).toBe('sealed')

    expect(resolveCirculationUnderPosture('open', 'lockdown', 'public_cover')).toBe(
      'staff_only'
    )
    expect(
      resolveCirculationUnderPosture('staff_only', 'lockdown', 'operations')
    ).toBe('emergency_only')
    expect(resolveCirculationUnderPosture('staff_only', 'lockdown', 'containment')).toBe(
      'sealed'
    )
    expect(
      resolveCirculationUnderPosture('emergency_only', 'lockdown', 'hazard_test')
    ).toBe('sealed')
  })

  it('applies lockdown circulation change across the facility model', () => {
    const normal = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'normal',
      zones: [PUBLIC_ZONE, OPS_ZONE, HAZARD_ZONE, CONTAINMENT_ZONE],
    })
    const lockdown = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'lockdown',
      zones: [PUBLIC_ZONE, OPS_ZONE, HAZARD_ZONE, CONTAINMENT_ZONE],
    })

    expect(normal?.alarmState).toBe('quiet')
    expect(lockdown?.alarmState).toBe('lockdown')

    const normalOps = normal?.zones.find((z) => z.zoneId === 'zone:ops-floor')
    const lockdownOps = lockdown?.zones.find((z) => z.zoneId === 'zone:ops-floor')
    expect(normalOps?.circulationMode).toBe('staff_only')
    expect(lockdownOps).toMatchObject({
      circulationMode: 'emergency_only',
      circulationChangedFromBaseline: true,
      alarmState: 'lockdown',
    })

    const lockdownHazard = lockdown?.zones.find((z) => z.zoneId === 'zone:test-cell-a')
    expect(lockdownHazard).toMatchObject({
      circulationMode: 'sealed',
      activityPolicy: 'suspended',
      hazardIsolated: true,
    })
  })

  it('evaluates access bands, hazard isolation, and sealed circulation deterministically', () => {
    const lockdown = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'lockdown',
      zones: [PUBLIC_ZONE, HAZARD_ZONE, VAULT_ZONE],
    })
    const hazard = lockdown!.zones.find((z) => z.zoneId === 'zone:test-cell-a')!
    const publicZone = lockdown!.zones.find((z) => z.zoneId === 'zone:lobby-front')!

    const deniedBand = evaluateZoneAccess({
      facilityId: ZONING_FACILITY_ID,
      actorId: 'actor:visitor',
      actorAccessBand: 'enter',
      zone: hazard,
    })
    expect(deniedBand).toMatchObject({
      accessAllowed: false,
      denialReason: 'hazard_isolation_blocks_entry',
      hazardIsolated: true,
    })

    const sealed = evaluateZoneAccess({
      facilityId: ZONING_FACILITY_ID,
      actorId: 'actor:commander',
      actorAccessBand: 'command',
      zone: hazard,
    })
    expect(sealed).toMatchObject({
      accessAllowed: false,
      denialReason: 'circulation_sealed',
      alarmState: 'lockdown',
      circulationMode: 'sealed',
    })

    const lobbyOk = evaluateZoneAccess({
      facilityId: ZONING_FACILITY_ID,
      actorId: 'actor:staff',
      actorAccessBand: 'enter',
      zone: publicZone,
    })
    expect(lobbyOk).toMatchObject({
      accessAllowed: true,
      denialReason: 'none',
      circulationMode: 'staff_only',
    })
  })

  it('keeps activity suspension distinct from circulation when circulation is not evaluated', () => {
    const alarm = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'containment_alarm',
      zones: [HAZARD_ZONE],
    })
    const hazard = alarm!.zones.find((z) => z.zoneId === 'zone:test-cell-a')!

    const passageOnly = evaluateZoneAccess({
      facilityId: ZONING_FACILITY_ID,
      actorId: 'actor:tech',
      actorAccessBand: 'command',
      zone: { ...hazard, circulationMode: 'staff_only' },
      evaluateCirculation: true,
      evaluateActivity: false,
    })
    expect(passageOnly).toMatchObject({
      accessAllowed: true,
      activityPolicy: 'suspended',
    })

    const workGate = evaluateZoneAccess({
      facilityId: ZONING_FACILITY_ID,
      actorId: 'actor:tech',
      actorAccessBand: 'command',
      zone: { ...hazard, circulationMode: 'staff_only' },
      evaluateCirculation: true,
      evaluateActivity: true,
    })
    expect(workGate).toMatchObject({
      accessAllowed: false,
      denialReason: 'activity_suspended',
    })
  })

  it('projects legible debug summary lines for zoning and circulation changes', () => {
    const lockdown = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'lockdown',
      zones: [PUBLIC_ZONE, OPS_ZONE, HAZARD_ZONE],
    })
    const summary = projectZoningDebugSummary(lockdown!)

    expect(summary.facilityId).toBe(ZONING_FACILITY_ID)
    expect(summary.posture).toBe('lockdown')
    expect(summary.alarmState).toBe('lockdown')
    expect(summary.lines.length).toBe(3)
    expect(summary.lines[0]).toContain('zone:lobby-front')
    expect(summary.lines.some((line) => line.includes('hazard-isolated'))).toBe(true)
    expect(summary.circulationChanges.length).toBeGreaterThan(0)
    expect(summary.circulationChanges.some((line) => line.includes('under lockdown'))).toBe(
      true
    )
  })

  it('does not loosen a stricter caller baseline under lockdown', () => {
    expect(
      resolveCirculationUnderPosture('sealed', 'lockdown', 'public_cover')
    ).toBe('sealed')
    expect(
      resolveCirculationUnderPosture('sealed', 'lockdown', 'operations')
    ).toBe('sealed')

    const model = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'lockdown',
      zones: [
        {
          zoneId: 'zone:containment-strict',
          zoneFunction: 'containment',
          baselineActivityPolicy: 'suspended',
        },
      ],
    })
    expect(model?.zones[0]).toMatchObject({
      activityPolicy: 'suspended',
      circulationMode: 'sealed',
    })
  })

  it('blocks enter-band actors on hazard-isolated zones even when minimum is enter', () => {
    const model = projectFacilityZoningModel({
      facilityId: ZONING_FACILITY_ID,
      posture: 'normal',
      zones: [
        {
          zoneId: 'zone:ad-hoc-isolation',
          zoneFunction: 'public_cover',
          minimumAccessBand: 'enter',
          hazardIsolated: true,
        },
      ],
    })
    const zone = model!.zones[0]
    expect(
      evaluateZoneAccess({
        facilityId: ZONING_FACILITY_ID,
        actorId: 'actor:visitor',
        actorAccessBand: 'enter',
        zone,
      })
    ).toMatchObject({
      accessAllowed: false,
      denialReason: 'hazard_isolation_blocks_entry',
    })
  })

  it('fails closed on malformed packets and duplicate zone ids', () => {
    expect(projectOperationalZonePacket({ zoneId: '', zoneFunction: 'operations' })).toBe(
      undefined
    )
    expect(
      projectOperationalZonePacket({ zoneId: 'zone:x', zoneFunction: 'museum' })
    ).toBeUndefined()
    expect(
      projectFacilityZoningModel({
        facilityId: ZONING_FACILITY_ID,
        posture: 'normal',
        zones: [PUBLIC_ZONE, { ...PUBLIC_ZONE }],
      })
    ).toBeUndefined()
    expect(
      evaluateZoneAccess({
        facilityId: ZONING_FACILITY_ID,
        actorId: 'actor:x',
        actorAccessBand: 'superuser',
        zone: projectFacilityZoningModel({
          facilityId: ZONING_FACILITY_ID,
          posture: 'normal',
          zones: [PUBLIC_ZONE],
        })!.zones[0],
      })
    ).toBeUndefined()
  })
})
