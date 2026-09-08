import { describe, expect, it } from 'vitest'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
  parseContainmentClassIntegrity,
} from '../domain/containmentClassInspection'
import {
  BLAST_DOOR_MEMBRANE_ZONE_ID,
  BARRIER_INTEGRITY_WATCH_CONTROL_ID,
  parseContainmentBarrierIntegrity,
  readContainmentBarrierStatus,
  resolveContainmentBarrierIntegrityCoupling,
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
    expect(readContainmentBarrierStatus({ status: 'zone_breach' })).toBe('intact')
    expect(
      parseContainmentClassIntegrity({
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
  })
})
