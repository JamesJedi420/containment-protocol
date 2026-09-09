import { describe, expect, it } from 'vitest'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  INTERLOCK_COMPENSATING_CONTROL_ID,
  PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
  parseContainmentClassIntegrity,
} from '../domain/containmentClassInspection'
import {
  BLAST_DOOR_MEMBRANE_ZONE_ID,
  BARRIER_INTEGRITY_WATCH_CONTROL_ID,
  INTERLOCK_MEMBRANE_ZONE_ID,
  PRESSURE_SEAL_MEMBRANE_ZONE_ID,
  parseContainmentBarrierIntegrity,
  parseContainmentBarrierIntegrityRegistry,
  readContainmentBarrierStatus,
  resolveContainmentBarrierIntegrityCoupling,
  zoneIdForContainmentClass,
} from '../domain/containmentBarrierIntegrity'

describe('SPE-877 barrier-integrity coupling kernel', () => {
  it('maps hard-stop to zone breach and compensating continue to flow-restraint only', () => {
    expect(BARRIER_INTEGRITY_WATCH_CONTROL_ID).toBe('barrier_integrity_watch')
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toEqual({
      ok: true,
      previousStatus: 'intact',
      changed: true,
      barrier: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: 'equipment-instance-1-1',
        sourceDeficiencyKind: 'hard_stop',
      },
    })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toMatchObject({
      ok: true,
      changed: true,
      barrier: { status: 'flow_restraint', sourceDeficiencyKind: 'compensating_continue' },
    })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: {
          zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
          status: 'flow_restraint',
          sourceInstanceId: 'equipment-instance-1-1',
          sourceDeficiencyKind: 'compensating_continue',
        },
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toMatchObject({ ok: true, changed: false, barrier: { status: 'flow_restraint' } })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: {
          zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
          status: 'flow_restraint',
          sourceInstanceId: 'equipment-instance-1-1',
          sourceDeficiencyKind: 'compensating_continue',
        },
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toMatchObject({
      ok: true,
      changed: true,
      previousStatus: 'flow_restraint',
      barrier: { status: 'zone_breach', sourceDeficiencyKind: 'hard_stop' },
    })
  })

  it('does not let compensating continue or none close a recorded zone breach', () => {
    const breached = {
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'zone_breach' as const,
      sourceInstanceId: 'equipment-instance-1-1',
      sourceDeficiencyKind: 'hard_stop' as const,
    }
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: breached,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-2',
      })
    ).toEqual({
      ok: true,
      previousStatus: 'zone_breach',
      changed: false,
      barrier: breached,
    })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: breached,
        deficiency: { kind: 'none' },
        sourceInstanceId: 'equipment-instance-1-2',
      })
    ).toMatchObject({ ok: true, changed: false, barrier: { status: 'zone_breach' } })
  })

  it('fails closed on malformed deficiency and drops malformed barrier records', () => {
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        deficiency: { kind: 'hard_stop', extra: true },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(parseContainmentBarrierIntegrity(undefined)).toEqual({
      ok: false,
      code: 'malformed_barrier',
    })
    expect(
      parseContainmentBarrierIntegrity({
        zoneId: 'other_membrane',
        status: 'zone_breach',
        sourceInstanceId: 'equipment-instance-1-1',
        sourceDeficiencyKind: 'hard_stop',
      })
    ).toEqual({ ok: false, code: 'malformed_barrier' })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(readContainmentBarrierStatus({ status: 'zone_breach' })).toBe('intact')
    expect(
      parseContainmentClassIntegrity({
        classId: 'airlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
  })

  it('couples extra-class deficiency into its own zone and fail-closes mixed pairings', () => {
    expect(zoneIdForContainmentClass('pressure_seal')).toBe(PRESSURE_SEAL_MEMBRANE_ZONE_ID)
    expect(zoneIdForContainmentClass('interlock')).toBe(INTERLOCK_MEMBRANE_ZONE_ID)
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        classId: 'pressure_seal',
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-3',
      })
    ).toEqual({
      ok: true,
      previousStatus: 'intact',
      changed: true,
      barrier: {
        zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: 'equipment-instance-1-3',
        sourceDeficiencyKind: 'hard_stop',
      },
    })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        classId: 'pressure_seal',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-3',
      })
    ).toMatchObject({
      ok: true,
      changed: true,
      barrier: {
        zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
        status: 'flow_restraint',
        sourceDeficiencyKind: 'compensating_continue',
      },
    })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        classId: 'interlock',
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-4',
      })
    ).toEqual({
      ok: true,
      previousStatus: 'intact',
      changed: true,
      barrier: {
        zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: 'equipment-instance-1-4',
        sourceDeficiencyKind: 'hard_stop',
      },
    })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        classId: 'interlock',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-4',
      })
    ).toMatchObject({
      ok: true,
      changed: true,
      barrier: {
        zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
        status: 'flow_restraint',
        sourceDeficiencyKind: 'compensating_continue',
      },
    })
    const blastDoorBreach = {
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'zone_breach' as const,
      sourceInstanceId: 'equipment-instance-1-1',
      sourceDeficiencyKind: 'hard_stop' as const,
    }
    const pressureSealRestraint = {
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint' as const,
      sourceInstanceId: 'equipment-instance-1-3',
      sourceDeficiencyKind: 'compensating_continue' as const,
    }
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: blastDoorBreach,
        classId: 'pressure_seal',
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-3',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: blastDoorBreach,
        classId: 'interlock',
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-4',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: pressureSealRestraint,
        deficiency: { kind: 'hard_stop' },
        sourceInstanceId: 'equipment-instance-1-1',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: undefined,
        classId: 'pressure_seal',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-3',
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    const interlockBreach = {
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'zone_breach' as const,
      sourceInstanceId: 'equipment-instance-1-4',
      sourceDeficiencyKind: 'hard_stop' as const,
    }
    expect(
      resolveContainmentBarrierIntegrityCoupling({
        existing: interlockBreach,
        classId: 'interlock',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
        sourceInstanceId: 'equipment-instance-1-5',
      })
    ).toEqual({
      ok: true,
      previousStatus: 'zone_breach',
      changed: false,
      barrier: interlockBreach,
    })
  })

  it('hydrates a keyed registry, legacy singular blast-door, and drops malformed extra-class independently', () => {
    const blastDoor = {
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'zone_breach' as const,
      sourceInstanceId: 'equipment-instance-1-1',
      sourceDeficiencyKind: 'hard_stop' as const,
    }
    const pressureSeal = {
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint' as const,
      sourceInstanceId: 'equipment-instance-1-3',
      sourceDeficiencyKind: 'compensating_continue' as const,
    }
    const interlock = {
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'zone_breach' as const,
      sourceInstanceId: 'equipment-instance-1-4',
      sourceDeficiencyKind: 'hard_stop' as const,
    }
    expect(parseContainmentBarrierIntegrityRegistry(blastDoor)).toEqual({
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: blastDoor,
    })
    expect(
      parseContainmentBarrierIntegrityRegistry({
        [BLAST_DOOR_MEMBRANE_ZONE_ID]: blastDoor,
        [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: pressureSeal,
        [INTERLOCK_MEMBRANE_ZONE_ID]: interlock,
      })
    ).toEqual({
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: blastDoor,
      [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: pressureSeal,
      [INTERLOCK_MEMBRANE_ZONE_ID]: interlock,
    })
    expect(
      parseContainmentBarrierIntegrityRegistry({
        [BLAST_DOOR_MEMBRANE_ZONE_ID]: blastDoor,
        [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: {
          zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
          status: 'zone_breach',
          sourceInstanceId: 'equipment-instance-1-3',
          sourceDeficiencyKind: 'hard_stop',
        },
        [INTERLOCK_MEMBRANE_ZONE_ID]: { status: 'zone_breach' },
      })
    ).toEqual({ [BLAST_DOOR_MEMBRANE_ZONE_ID]: blastDoor })
    expect(
      parseContainmentBarrierIntegrityRegistry({
        [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: { status: 'zone_breach' },
      })
    ).toBeUndefined()
    expect(readContainmentBarrierStatus({ [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: pressureSeal })).toBe(
      'intact'
    )
    expect(
      readContainmentBarrierStatus(
        { [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: pressureSeal },
        PRESSURE_SEAL_MEMBRANE_ZONE_ID
      )
    ).toBe('flow_restraint')
    expect(
      readContainmentBarrierStatus(
        { [INTERLOCK_MEMBRANE_ZONE_ID]: interlock },
        INTERLOCK_MEMBRANE_ZONE_ID
      )
    ).toBe('zone_breach')
  })
})
