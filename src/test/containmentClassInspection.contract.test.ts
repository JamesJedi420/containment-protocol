import { describe, expect, it } from 'vitest'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  BLAST_DOOR_CONTAINMENT_CLASS,
  CONTAINMENT_CLASS_IDS,
  evaluateContainmentInspection,
  isContainmentClassInService,
  parseContainmentClassIntegrity,
  resolveContainmentInspectionCadence,
  resolveStickyContainmentDeficiency,
} from '../domain/containmentClassInspection'

describe('SPE-2860 containment-class inspection cadence', () => {
  it('exposes exactly one frozen class', () => {
    expect(CONTAINMENT_CLASS_IDS).toEqual(['blast_door'])
    expect(BLAST_DOOR_CONTAINMENT_CLASS.authoredIntervalWeeks).toBe(4)
    expect(BLAST_DOOR_CONTAINMENT_CLASS.compensatingControlId).toBe(
      BLAST_DOOR_COMPENSATING_CONTROL_ID
    )
  })

  it('intensifies cadence from cycle history and stays deterministic', () => {
    expect(resolveContainmentInspectionCadence('blast_door', 0)).toEqual({
      ok: true,
      classId: 'blast_door',
      intervalWeeks: 4,
    })
    expect(resolveContainmentInspectionCadence('blast_door', 2)).toEqual({
      ok: true,
      classId: 'blast_door',
      intervalWeeks: 3,
    })
    expect(resolveContainmentInspectionCadence('blast_door', 2)).toEqual(
      resolveContainmentInspectionCadence('blast_door', 2)
    )
    expect(resolveContainmentInspectionCadence('blast_door', 100)).toEqual({
      ok: true,
      classId: 'blast_door',
      intervalWeeks: 1,
    })
  })

  it('maps current, due, and overdue from weeks since inspection', () => {
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
      })
    ).toMatchObject({ ok: true, status: 'current', deficiency: { kind: 'none' }, inService: true })
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      status: 'due',
      deficiency: { kind: 'none' },
      inService: true,
    })
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
        continuation: 'hard_stop',
      })
    ).toMatchObject({
      ok: true,
      status: 'due',
      deficiency: { kind: 'hard_stop' },
      inService: false,
    })
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 6,
        cycleCount: 0,
        continuation: 'compensating_continue',
      })
    ).toMatchObject({
      ok: true,
      status: 'overdue',
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      },
      inService: true,
    })
  })

  it('keeps hard-stop sticky against compensating continuation', () => {
    expect(
      resolveStickyContainmentDeficiency(
        { kind: 'hard_stop' },
        {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        }
      )
    ).toEqual({ ok: false, code: 'invalid_continuation' })
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 6,
        cycleCount: 0,
        existingDeficiency: { kind: 'hard_stop' },
        continuation: 'compensating_continue',
      })
    ).toEqual({ ok: false, code: 'invalid_continuation' })
    expect(
      isContainmentClassInService({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      })
    ).toBe(false)
    expect(
      isContainmentClassInService({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      })
    ).toBe(true)
  })

  it('fails closed for missing, malformed, and unknown class', () => {
    expect(resolveContainmentInspectionCadence('pressure_seal', 0)).toEqual({
      ok: false,
      code: 'invalid_class',
    })
    expect(resolveContainmentInspectionCadence('interlock', 1)).toEqual({
      ok: false,
      code: 'invalid_class',
    })
    expect(resolveContainmentInspectionCadence('blast_door', -1)).toEqual({
      ok: false,
      code: 'invalid_history',
    })
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 3,
        currentWeek: 2,
        cycleCount: 0,
      })
    ).toEqual({ ok: false, code: 'inverted_weeks' })
    expect(
      evaluateContainmentInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1.5,
        currentWeek: 4,
        cycleCount: 0,
      })
    ).toEqual({ ok: false, code: 'invalid_weeks' })
    expect(parseContainmentClassIntegrity(undefined)).toEqual({
      ok: false,
      code: 'malformed_integrity',
    })
    expect(
      parseContainmentClassIntegrity({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      parseContainmentClassIntegrity({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'compensating_continue' },
      })
    ).toEqual({ ok: false, code: 'malformed_integrity' })
  })
})
