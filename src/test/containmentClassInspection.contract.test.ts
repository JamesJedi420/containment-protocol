import { describe, expect, it } from 'vitest'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  BLAST_DOOR_CONTAINMENT_CLASS,
  CONTAINMENT_CLASS_IDS,
  INTERLOCK_COMPENSATING_CONTROL_ID,
  INTERLOCK_CONTAINMENT_CLASS,
  PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
  PRESSURE_SEAL_CONTAINMENT_CLASS,
  evaluateContainmentInspection,
  isContainmentClassInService,
  parseContainmentClassIntegrity,
  resolveContainmentInspectionCadence,
  resolveStickyContainmentDeficiency,
  resolveTechnicianStabilization,
  resolveContainmentClassWeekCloseInspection,
} from '../domain/containmentClassInspection'

describe('SPE-2860 containment-class inspection cadence', () => {
  it('exposes blast_door, pressure_seal, and interlock as frozen classes', () => {
    expect(CONTAINMENT_CLASS_IDS).toEqual(['blast_door', 'pressure_seal', 'interlock'])
    expect(BLAST_DOOR_CONTAINMENT_CLASS.authoredIntervalWeeks).toBe(4)
    expect(BLAST_DOOR_CONTAINMENT_CLASS.compensatingControlId).toBe(
      BLAST_DOOR_COMPENSATING_CONTROL_ID
    )
    expect(BLAST_DOOR_CONTAINMENT_CLASS.weekCloseDueContinuation).toBe('compensating_continue')
    expect(BLAST_DOOR_CONTAINMENT_CLASS.weekCloseOverdueContinuation).toBe('hard_stop')
    expect(PRESSURE_SEAL_CONTAINMENT_CLASS.authoredIntervalWeeks).toBe(3)
    expect(PRESSURE_SEAL_CONTAINMENT_CLASS.compensatingControlId).toBe(
      PRESSURE_SEAL_COMPENSATING_CONTROL_ID
    )
    expect(PRESSURE_SEAL_CONTAINMENT_CLASS.weekCloseDueContinuation).toBe('compensating_continue')
    expect(PRESSURE_SEAL_CONTAINMENT_CLASS.weekCloseOverdueContinuation).toBe('hard_stop')
    expect(INTERLOCK_CONTAINMENT_CLASS.authoredIntervalWeeks).toBe(2)
    expect(INTERLOCK_CONTAINMENT_CLASS.compensatingControlId).toBe(
      INTERLOCK_COMPENSATING_CONTROL_ID
    )
    expect(INTERLOCK_CONTAINMENT_CLASS.weekCloseDueContinuation).toBe('compensating_continue')
    expect(INTERLOCK_CONTAINMENT_CLASS.weekCloseOverdueContinuation).toBe('hard_stop')
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
    expect(resolveContainmentInspectionCadence('airlock', 0)).toEqual({
      ok: false,
      code: 'invalid_class',
    })
    expect(resolveContainmentInspectionCadence('airlock', 1)).toEqual({
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
        classId: 'airlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      parseContainmentClassIntegrity({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'malformed_integrity' })
    expect(
      parseContainmentClassIntegrity({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'malformed_integrity' })
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

describe('SPE-2862 technician stabilization / deficiency clear', () => {
  it('relieves hard-stop into compensating continue and clears compensating continue to none', () => {
    expect(resolveTechnicianStabilization({ kind: 'hard_stop' })).toEqual({
      ok: true,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      },
      cycleDelta: 1,
    })
    expect(
      resolveTechnicianStabilization({
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      })
    ).toEqual({
      ok: true,
      deficiency: { kind: 'none' },
      cycleDelta: 1,
    })
  })

  it('fails closed for none and malformed deficiency', () => {
    expect(resolveTechnicianStabilization({ kind: 'none' })).toEqual({
      ok: false,
      code: 'no_deficiency',
    })
    expect(resolveTechnicianStabilization(undefined)).toEqual({
      ok: false,
      code: 'malformed_deficiency',
    })
    expect(resolveTechnicianStabilization({ kind: 'compensating_continue' })).toEqual({
      ok: false,
      code: 'malformed_deficiency',
    })
    expect(
      resolveTechnicianStabilization({
        kind: 'compensating_continue',
        compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
      })
    ).toEqual({
      ok: false,
      code: 'malformed_deficiency',
    })
  })

  it('does not change sticky inspection semantics', () => {
    expect(
      resolveStickyContainmentDeficiency(
        { kind: 'hard_stop' },
        {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        }
      )
    ).toEqual({ ok: false, code: 'invalid_continuation' })
  })
})

describe('SPE-877 week-close last-inspection resolver', () => {
  it('no-ops while inspection is current', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
      })
    ).toEqual({ ok: true, action: 'noop' })
  })

  it('stamps due inspections to compensating continue', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'due',
      previousLastInspectionWeek: 1,
      lastInspectionWeek: 5,
      weeksSinceInspection: 4,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      },
      deficiencyChanged: true,
      inService: true,
    })
  })

  it('stamps overdue inspections to hard-stop', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 6,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'overdue',
      lastInspectionWeek: 6,
      deficiency: { kind: 'hard_stop' },
      deficiencyChanged: true,
      inService: false,
    })
  })

  it('keeps sticky hard-stop and still stamps last inspection', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
        existingDeficiency: { kind: 'hard_stop' },
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'due',
      lastInspectionWeek: 5,
      deficiency: { kind: 'hard_stop' },
      deficiencyChanged: false,
      inService: false,
    })
  })

  it('fails closed for inverted weeks', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'blast_door',
        lastInspectionWeek: 8,
        currentWeek: 5,
        cycleCount: 0,
      })
    ).toEqual({ ok: false, code: 'inverted_weeks' })
  })
})

describe('SPE-2864 pressure-seal containment-class inspection kernel', () => {
  it('intensifies cadence from cycle history and stays deterministic', () => {
    expect(resolveContainmentInspectionCadence('pressure_seal', 0)).toEqual({
      ok: true,
      classId: 'pressure_seal',
      intervalWeeks: 3,
    })
    expect(resolveContainmentInspectionCadence('pressure_seal', 2)).toEqual({
      ok: true,
      classId: 'pressure_seal',
      intervalWeeks: 2,
    })
    expect(resolveContainmentInspectionCadence('pressure_seal', 2)).toEqual(
      resolveContainmentInspectionCadence('pressure_seal', 2)
    )
    expect(resolveContainmentInspectionCadence('pressure_seal', 100)).toEqual({
      ok: true,
      classId: 'pressure_seal',
      intervalWeeks: 1,
    })
  })

  it('maps current, due, and overdue from weeks since inspection', () => {
    expect(
      evaluateContainmentInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 3,
        cycleCount: 0,
      })
    ).toMatchObject({ ok: true, status: 'current', deficiency: { kind: 'none' }, inService: true })
    expect(
      evaluateContainmentInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 4,
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
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
        continuation: 'compensating_continue',
      })
    ).toMatchObject({
      ok: true,
      status: 'overdue',
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
      },
      inService: true,
    })
  })

  it('keeps hard-stop sticky against compensating continuation', () => {
    expect(
      evaluateContainmentInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
        existingDeficiency: { kind: 'hard_stop' },
        continuation: 'compensating_continue',
      })
    ).toEqual({ ok: false, code: 'invalid_continuation' })
    expect(
      isContainmentClassInService({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      })
    ).toBe(false)
  })

  it('hydrates valid pressure-seal integrity and rejects mixed class/control pairings', () => {
    expect(
      parseContainmentClassIntegrity({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      })
    ).toMatchObject({
      ok: true,
      integrity: { classId: 'pressure_seal', deficiency: { kind: 'none' } },
    })
    expect(
      parseContainmentClassIntegrity({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
        },
      })
    ).toMatchObject({
      ok: true,
      integrity: {
        classId: 'pressure_seal',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
        },
      },
    })
    expect(
      evaluateContainmentInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
        existingDeficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'invalid_continuation' })
  })

  it('stamps due inspections to compensating continue and overdue to hard-stop', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      classId: 'pressure_seal',
      status: 'due',
      lastInspectionWeek: 4,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
      },
      deficiencyChanged: true,
      inService: true,
    })
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 5,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'overdue',
      lastInspectionWeek: 5,
      deficiency: { kind: 'hard_stop' },
      deficiencyChanged: true,
      inService: false,
    })
  })

  it('keeps sticky hard-stop and still stamps last inspection', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
        existingDeficiency: { kind: 'hard_stop' },
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'due',
      lastInspectionWeek: 4,
      deficiency: { kind: 'hard_stop' },
      deficiencyChanged: false,
      inService: false,
    })
  })
})

describe('SPE-877 interlock containment-class inspection kernel', () => {
  it('intensifies cadence from cycle history and stays deterministic', () => {
    expect(resolveContainmentInspectionCadence('interlock', 0)).toEqual({
      ok: true,
      classId: 'interlock',
      intervalWeeks: 2,
    })
    expect(resolveContainmentInspectionCadence('interlock', 2)).toEqual({
      ok: true,
      classId: 'interlock',
      intervalWeeks: 1,
    })
    expect(resolveContainmentInspectionCadence('interlock', 2)).toEqual(
      resolveContainmentInspectionCadence('interlock', 2)
    )
    expect(resolveContainmentInspectionCadence('interlock', 100)).toEqual({
      ok: true,
      classId: 'interlock',
      intervalWeeks: 1,
    })
  })

  it('maps current, due, and overdue from weeks since inspection', () => {
    expect(
      evaluateContainmentInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 2,
        cycleCount: 0,
      })
    ).toMatchObject({ ok: true, status: 'current', deficiency: { kind: 'none' }, inService: true })
    expect(
      evaluateContainmentInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 3,
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
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
        continuation: 'compensating_continue',
      })
    ).toMatchObject({
      ok: true,
      status: 'overdue',
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
      },
      inService: true,
    })
  })

  it('keeps hard-stop sticky against compensating continuation', () => {
    expect(
      evaluateContainmentInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
        existingDeficiency: { kind: 'hard_stop' },
        continuation: 'compensating_continue',
      })
    ).toEqual({ ok: false, code: 'invalid_continuation' })
    expect(
      isContainmentClassInService({
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      })
    ).toBe(false)
  })

  it('hydrates valid interlock integrity and rejects mixed class/control pairings', () => {
    expect(
      parseContainmentClassIntegrity({
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      })
    ).toMatchObject({
      ok: true,
      integrity: { classId: 'interlock', deficiency: { kind: 'none' } },
    })
    expect(
      parseContainmentClassIntegrity({
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
      })
    ).toMatchObject({
      ok: true,
      integrity: {
        classId: 'interlock',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
      },
    })
    expect(
      parseContainmentClassIntegrity({
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'malformed_integrity' })
    expect(
      parseContainmentClassIntegrity({
        classId: 'blast_door',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'malformed_integrity' })
    expect(
      parseContainmentClassIntegrity({
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'malformed_integrity' })
    expect(
      evaluateContainmentInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 3,
        cycleCount: 0,
        existingDeficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      })
    ).toEqual({ ok: false, code: 'invalid_continuation' })
  })

  it('stamps due inspections to compensating continue and overdue to hard-stop', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 3,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      classId: 'interlock',
      status: 'due',
      lastInspectionWeek: 3,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
      },
      deficiencyChanged: true,
      inService: true,
    })
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 4,
        cycleCount: 0,
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'overdue',
      lastInspectionWeek: 4,
      deficiency: { kind: 'hard_stop' },
      deficiencyChanged: true,
      inService: false,
    })
  })

  it('keeps sticky hard-stop and still stamps last inspection', () => {
    expect(
      resolveContainmentClassWeekCloseInspection({
        classId: 'interlock',
        lastInspectionWeek: 1,
        currentWeek: 3,
        cycleCount: 0,
        existingDeficiency: { kind: 'hard_stop' },
      })
    ).toMatchObject({
      ok: true,
      action: 'advance',
      status: 'due',
      lastInspectionWeek: 3,
      deficiency: { kind: 'hard_stop' },
      deficiencyChanged: false,
      inService: false,
    })
  })
})
