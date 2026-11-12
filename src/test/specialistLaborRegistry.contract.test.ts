import { describe, expect, it } from 'vitest'
import {
  isSpecialistAvailabilityBand,
  isSpecialistRoleFamily,
  isSpecialistSkillBand,
  isSpecialistTaskGateOutcome,
  isSpecialistTaskId,
  listSpecialistRoleFamilies,
  listSpecialistTaskIds,
  lookupRequiredRoleFamily,
  projectSpecialistLaborGate,
  requiredRoleFamilyForTask,
  validateSpecialistLaborGateInput,
} from '../domain/specialistLaborRegistry'

describe('SPE-1058 specialist labor / task-gate registry', () => {
  it('exposes authored role families and task ids with exact role requirements', () => {
    expect(listSpecialistRoleFamilies()).toEqual([
      'refinement_technician',
      'ritual_operator',
      'evidence_handler',
      'archive_analyst',
      'containment_engineer',
      'ward_technician',
      'hazardous_artifact_handler',
      'fabrication_specialist',
    ])
    expect(listSpecialistTaskIds()).toEqual([
      'material_refinement',
      'ward_seal_maintenance',
      'evidence_chain_custody',
      'containment_cell_repair',
      'ritual_frame_activation',
      'archive_classification',
      'hazardous_artifact_intake',
      'restraint_fabrication',
    ])
    expect(requiredRoleFamilyForTask('material_refinement')).toBe('refinement_technician')
    expect(requiredRoleFamilyForTask('ward_seal_maintenance')).toBe('ward_technician')
    expect(lookupRequiredRoleFamily('containment_cell_repair')).toBe('containment_engineer')
    expect(lookupRequiredRoleFamily('not_a_task')).toBeUndefined()
    expect(isSpecialistRoleFamily('evidence_handler')).toBe(true)
    expect(isSpecialistRoleFamily('generic_tech')).toBe(false)
    expect(isSpecialistTaskId('archive_classification')).toBe(true)
    expect(isSpecialistTaskId('make_coffee')).toBe(false)
    expect(isSpecialistSkillBand('expert')).toBe(true)
    expect(isSpecialistSkillBand('legendary')).toBe(false)
    expect(isSpecialistAvailabilityBand('fatigued')).toBe(true)
    expect(isSpecialistAvailabilityBand('rested')).toBe(false)
    expect(isSpecialistTaskGateOutcome('stalled')).toBe(true)
    expect(isSpecialistTaskGateOutcome('blocked')).toBe(false)
  })

  it('AC1: deterministic gating stalls when the correct specialist is missing', () => {
    const missing = projectSpecialistLaborGate({
      taskId: 'material_refinement',
      operators: [],
      infrastructurePresent: true,
    })
    expect(missing).toMatchObject({
      taskId: 'material_refinement',
      requiredRoleFamily: 'refinement_technician',
      gateOutcome: 'stalled',
      matchedOperator: null,
      adjacentRejected: false,
      stallReason: 'missing_specialist',
      infrastructurePresent: true,
    })
    expect(missing!.outputQuality.successRate).toBe(0)
    expect(missing!.outputQuality.throughputMultiplier).toBe(0)

    // Adjacent expertise is not a substitute for the required specialty.
    const adjacent = projectSpecialistLaborGate({
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
    expect(adjacent).toMatchObject({
      gateOutcome: 'stalled',
      stallReason: 'adjacent_insufficient',
      adjacentRejected: true,
      matchedOperator: null,
      infrastructurePresent: true,
    })

    const unavailable = projectSpecialistLaborGate({
      taskId: 'ward_seal_maintenance',
      operators: [
        {
          roleFamily: 'ward_technician',
          skillBand: 'expert',
          availabilityBand: 'unavailable',
        },
      ],
    })
    expect(unavailable).toMatchObject({
      gateOutcome: 'stalled',
      stallReason: 'unavailable',
      adjacentRejected: false,
    })
  })

  it('AC2: skill band changes output quality metrics materially', () => {
    const novice = projectSpecialistLaborGate({
      taskId: 'restraint_fabrication',
      operators: [
        {
          roleFamily: 'fabrication_specialist',
          skillBand: 'novice',
          availabilityBand: 'fit',
        },
      ],
    })
    const master = projectSpecialistLaborGate({
      taskId: 'restraint_fabrication',
      operators: [
        {
          roleFamily: 'fabrication_specialist',
          skillBand: 'master',
          availabilityBand: 'fit',
        },
      ],
    })

    expect(novice?.gateOutcome).toBe('degraded')
    expect(master?.gateOutcome).toBe('operable')
    expect(master!.outputQuality.successRate).toBeGreaterThan(novice!.outputQuality.successRate)
    expect(master!.outputQuality.materialPurity).toBeGreaterThan(
      novice!.outputQuality.materialPurity
    )
    expect(master!.outputQuality.contaminationRisk).toBeLessThan(
      novice!.outputQuality.contaminationRisk
    )
    expect(master!.outputQuality.latentDefectRisk).toBeLessThan(
      novice!.outputQuality.latentDefectRisk
    )

    const fatiguedExpert = projectSpecialistLaborGate({
      taskId: 'evidence_chain_custody',
      operators: [
        {
          roleFamily: 'evidence_handler',
          skillBand: 'expert',
          availabilityBand: 'fatigued',
        },
      ],
    })
    const fitExpert = projectSpecialistLaborGate({
      taskId: 'evidence_chain_custody',
      operators: [
        {
          roleFamily: 'evidence_handler',
          skillBand: 'expert',
          availabilityBand: 'fit',
        },
      ],
    })
    expect(fatiguedExpert?.gateOutcome).toBe('degraded')
    expect(fitExpert?.gateOutcome).toBe('operable')
    expect(fatiguedExpert!.outputQuality.throughputMultiplier).toBeLessThan(
      fitExpert!.outputQuality.throughputMultiplier
    )
    expect(fatiguedExpert!.outputQuality.contaminationRisk).toBeGreaterThan(
      fitExpert!.outputQuality.contaminationRisk
    )
  })

  it('selects the best exact-role operator deterministically among candidates', () => {
    const projection = projectSpecialistLaborGate({
      taskId: 'archive_classification',
      operators: [
        {
          roleFamily: 'archive_analyst',
          skillBand: 'competent',
          availabilityBand: 'fatigued',
        },
        {
          roleFamily: 'ritual_operator',
          skillBand: 'master',
          availabilityBand: 'fit',
        },
        {
          roleFamily: 'archive_analyst',
          skillBand: 'expert',
          availabilityBand: 'fit',
        },
        {
          roleFamily: 'archive_analyst',
          skillBand: 'master',
          availabilityBand: 'unavailable',
        },
      ],
    })
    expect(projection).toMatchObject({
      gateOutcome: 'operable',
      matchedOperator: {
        roleFamily: 'archive_analyst',
        skillBand: 'expert',
        availabilityBand: 'fit',
      },
      adjacentRejected: false,
      stallReason: null,
    })
  })

  it('fail-closes malformed inputs', () => {
    expect(projectSpecialistLaborGate(null)).toBeUndefined()
    expect(projectSpecialistLaborGate(undefined)).toBeUndefined()
    expect(projectSpecialistLaborGate({} as never)).toBeUndefined()
    expect(
      projectSpecialistLaborGate({
        taskId: 'not_a_task' as never,
        operators: [],
      })
    ).toBeUndefined()
    expect(
      projectSpecialistLaborGate({
        taskId: 'material_refinement',
        operators: 'none' as never,
      })
    ).toBeUndefined()
    expect(
      projectSpecialistLaborGate({
        taskId: 'material_refinement',
        operators: [
          {
            roleFamily: 'generic_tech' as never,
            skillBand: 'expert',
            availabilityBand: 'fit',
          },
        ],
      })
    ).toBeUndefined()
    expect(
      projectSpecialistLaborGate({
        taskId: 'material_refinement',
        operators: [
          {
            roleFamily: 'refinement_technician',
            skillBand: 'legendary' as never,
            availabilityBand: 'fit',
          },
        ],
      })
    ).toBeUndefined()
    expect(
      projectSpecialistLaborGate({
        taskId: 'material_refinement',
        operators: [
          {
            roleFamily: 'refinement_technician',
            skillBand: 'expert',
            availabilityBand: 'rested' as never,
          },
        ],
      })
    ).toBeUndefined()
    expect(
      projectSpecialistLaborGate({
        taskId: 'material_refinement',
        operators: [],
        infrastructurePresent: 'yes' as never,
      })
    ).toBeUndefined()
    expect(validateSpecialistLaborGateInput([])).toBe(false)
    expect(validateSpecialistLaborGateInput('material_refinement')).toBe(false)
    expect(
      validateSpecialistLaborGateInput({
        taskId: 'material_refinement',
        operators: [],
      })
    ).toBe(true)
  })

  it('returns immutable byte-stable projections on repeat calls', () => {
    const input = Object.freeze({
      taskId: 'hazardous_artifact_intake' as const,
      operators: Object.freeze([
        Object.freeze({
          roleFamily: 'hazardous_artifact_handler' as const,
          skillBand: 'competent' as const,
          availabilityBand: 'impaired' as const,
        }),
      ]),
      infrastructurePresent: true,
    })
    const first = projectSpecialistLaborGate(input)
    const second = projectSpecialistLaborGate(input)
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first!.matchedOperator)).toBe(true)
    expect(Object.isFrozen(first!.outputQuality)).toBe(true)
    expect(first).toMatchObject({
      gateOutcome: 'degraded',
      stallReason: null,
    })
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.gateOutcome = 'operable'
    }).toThrow()
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.outputQuality.successRate = 0
    }).toThrow()
  })

  it('never treats infrastructure alone as sufficient capability', () => {
    const projection = projectSpecialistLaborGate({
      taskId: 'ritual_frame_activation',
      operators: [],
      infrastructurePresent: true,
    })
    expect(projection?.gateOutcome).toBe('stalled')
    expect(projection?.infrastructurePresent).toBe(true)
    expect(projection?.stallReason).toBe('missing_specialist')
  })
})
