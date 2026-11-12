import { describe, expect, it } from 'vitest'
import { resolveDepartmentWorkshopCompletionQuality } from '../domain/departmentWorkshopQueue'
import {
  projectSpecialistLaborGate,
  type SpecialistLaborGateProjection,
} from '../domain/specialistLaborRegistry'
import { mapSpecialistLaborGateToWorkshopConsume } from '../domain/specialistLaborWorkshopConsume'

function operableProjection(): SpecialistLaborGateProjection {
  const projection = projectSpecialistLaborGate({
    taskId: 'material_refinement',
    operators: [
      {
        roleFamily: 'refinement_technician',
        skillBand: 'expert',
        availabilityBand: 'fit',
      },
    ],
    infrastructurePresent: true,
  })
  expect(projection?.gateOutcome).toBe('operable')
  return projection!
}

function degradedProjection(): SpecialistLaborGateProjection {
  const projection = projectSpecialistLaborGate({
    taskId: 'material_refinement',
    operators: [
      {
        roleFamily: 'refinement_technician',
        skillBand: 'novice',
        availabilityBand: 'fit',
      },
    ],
  })
  expect(projection?.gateOutcome).toBe('degraded')
  return projection!
}

function stalledMissingProjection(): SpecialistLaborGateProjection {
  const projection = projectSpecialistLaborGate({
    taskId: 'material_refinement',
    operators: [],
    infrastructurePresent: true,
  })
  expect(projection?.gateOutcome).toBe('stalled')
  expect(projection?.stallReason).toBe('missing_specialist')
  return projection!
}

function stalledAdjacentProjection(): SpecialistLaborGateProjection {
  const projection = projectSpecialistLaborGate({
    taskId: 'material_refinement',
    operators: [
      {
        roleFamily: 'containment_engineer',
        skillBand: 'master',
        availabilityBand: 'fit',
      },
    ],
    infrastructurePresent: true,
  })
  expect(projection?.gateOutcome).toBe('stalled')
  expect(projection?.adjacentRejected).toBe(true)
  return projection!
}

describe('SPE-3109 specialist labor workshop-consume adapter', () => {
  it('maps operable gates to good specialist condition with consume allowed', () => {
    const view = mapSpecialistLaborGateToWorkshopConsume(operableProjection())
    expect(view).toEqual({
      consumeAllowed: true,
      specialistCondition: 'good',
      gateOutcome: 'operable',
    })
    expect(Object.isFrozen(view)).toBe(true)
  })

  it('maps degraded gates to poor specialist condition with consume still allowed', () => {
    const view = mapSpecialistLaborGateToWorkshopConsume(degradedProjection())
    expect(view).toEqual({
      consumeAllowed: true,
      specialistCondition: 'poor',
      gateOutcome: 'degraded',
    })
    expect(Object.isFrozen(view)).toBe(true)

    // Existing SPE-2768 resolver owns the quality reason when other axes are good.
    const quality = resolveDepartmentWorkshopCompletionQuality({
      inputQuality: 'good',
      specialistCondition: view.specialistCondition!,
      roomContamination: 'good',
    })
    expect(quality).toEqual({
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })

  it('blocks consume for stalled gates and does not invent completing poor quality', () => {
    const missing = mapSpecialistLaborGateToWorkshopConsume(stalledMissingProjection())
    expect(missing).toEqual({
      consumeAllowed: false,
      specialistCondition: null,
      gateOutcome: 'stalled',
    })
    // Stall is not a completing poor-quality tick.
    expect(missing.specialistCondition).not.toBe('poor')
    expect(missing.consumeAllowed).toBe(false)

    // Infrastructure-present on a stalled gate still blocks.
    expect(stalledMissingProjection().infrastructurePresent).toBe(true)
    expect(missing.consumeAllowed).toBe(false)

    // Adjacent-rejected stall stays blocked.
    const adjacent = mapSpecialistLaborGateToWorkshopConsume(stalledAdjacentProjection())
    expect(adjacent).toEqual({
      consumeAllowed: false,
      specialistCondition: null,
      gateOutcome: 'stalled',
    })
  })

  it('fail-closes undefined and malformed projections', () => {
    expect(mapSpecialistLaborGateToWorkshopConsume(undefined)).toEqual({
      consumeAllowed: false,
      specialistCondition: null,
      gateOutcome: null,
    })
    expect(mapSpecialistLaborGateToWorkshopConsume(null)).toEqual({
      consumeAllowed: false,
      specialistCondition: null,
      gateOutcome: null,
    })
    expect(mapSpecialistLaborGateToWorkshopConsume({} as never)).toEqual({
      consumeAllowed: false,
      specialistCondition: null,
      gateOutcome: null,
    })
    expect(
      mapSpecialistLaborGateToWorkshopConsume({
        gateOutcome: 'blocked',
      } as never)
    ).toEqual({
      consumeAllowed: false,
      specialistCondition: null,
      gateOutcome: null,
    })
    // No invented good condition on fail-closed.
    const blocked = mapSpecialistLaborGateToWorkshopConsume(undefined)
    expect(blocked.specialistCondition).toBeNull()
    expect(blocked.specialistCondition).not.toBe('good')
  })

  it('returns byte-stable frozen views for identical outcomes', () => {
    const a = mapSpecialistLaborGateToWorkshopConsume(operableProjection())
    const b = mapSpecialistLaborGateToWorkshopConsume(operableProjection())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(a).toEqual(b)

    const d1 = mapSpecialistLaborGateToWorkshopConsume(degradedProjection())
    const d2 = mapSpecialistLaborGateToWorkshopConsume(degradedProjection())
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2))

    const s1 = mapSpecialistLaborGateToWorkshopConsume(stalledMissingProjection())
    const s2 = mapSpecialistLaborGateToWorkshopConsume(stalledMissingProjection())
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2))
  })

  it('does not overwrite caller-owned quality axes when composing degraded specialist', () => {
    const view = mapSpecialistLaborGateToWorkshopConsume(degradedProjection())
    // Caller owns input / room; adapter only supplied specialistCondition.
    const composed = {
      inputQuality: 'good' as const,
      specialistCondition: view.specialistCondition!,
      roomContamination: 'good' as const,
      dependencyCondition: 'good' as const,
      equipmentCondition: 'good' as const,
      reagentGrade: 'good' as const,
    }
    expect(composed.inputQuality).toBe('good')
    expect(composed.roomContamination).toBe('good')
    expect(composed.dependencyCondition).toBe('good')
    expect(composed.equipmentCondition).toBe('good')
    expect(composed.reagentGrade).toBe('good')
    expect(composed.specialistCondition).toBe('poor')
    expect(resolveDepartmentWorkshopCompletionQuality(composed).qualityReason).toBe(
      'poor_specialist_condition'
    )
  })
})
