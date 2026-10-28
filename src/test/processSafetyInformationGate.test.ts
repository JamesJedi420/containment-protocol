import { describe, expect, it } from 'vitest'
import {
  createCriticalEquipmentDossier,
  createTechnologyProfile,
  evaluateProcessSafetyInformationGate,
  PROCESS_SAFETY_INFORMATION_GATE_OWNER,
  type CriticalEquipmentDossier,
  type ProcessSafetyInformationPacket,
  type TechnologyProfile,
} from '../domain/processSafetyInformationGate'

const technology = createTechnologyProfile({
  technologyId: 'tech-cryo-loop',
  intendedOperation: 'closed-loop cryogenic recirculation',
  safeLimits: [
    {
      limitId: 'limit-temp',
      metric: 'coolant-temperature-c',
      bound: -40,
      unit: 'C',
    },
  ],
  deviationConsequences: [
    {
      deviationId: 'dev-overtemp',
      trigger: 'coolant-temperature-c > -40',
      consequence: 'pressure-relief-demand and boil-off risk',
    },
  ],
})

const modernEquipment = createCriticalEquipmentDossier({
  equipmentId: 'eq-pump-1',
  construction: 'stainless-centrifugal',
  protection: 'overpressure-interlock',
  sensing: 'discharge-pressure-transducer',
  shutdown: 'fail-safe-trip',
  relief: 'spring-relief-valve',
  supportSystems: 'backup-power-bus',
  legacy: false,
  safeOperationProofActive: false,
})

const legacyValid = createCriticalEquipmentDossier({
  equipmentId: 'eq-legacy-compressor',
  construction: 'cast-iron-reciprocating',
  protection: 'manual-isolation',
  sensing: 'local-gauge',
  shutdown: 'manual-trip',
  relief: 'rupture-disk',
  supportSystems: 'plant-air',
  legacy: true,
  safeOperationProofActive: true,
})

function basePacket(
  overrides: Partial<ProcessSafetyInformationPacket> = {},
): ProcessSafetyInformationPacket {
  return {
    processId: 'proc-alpha',
    substancesComplete: true,
    inventoriesDocumented: true,
    diagramsCurrent: true,
    protectiveInfrastructureDocumented: true,
    technology,
    equipment: [modernEquipment],
    ...overrides,
  }
}

describe('SPE-872 process safety information gate', () => {
  it('exports owner constant and blocks deep review until baseline is complete', () => {
    expect(PROCESS_SAFETY_INFORMATION_GATE_OWNER).toBe('SPE-872')

    const blocked = evaluateProcessSafetyInformationGate(
      basePacket({ substancesComplete: false }),
    )
    expect(blocked.status).toBe('blocked')
    expect(blocked.deepHazardReviewAllowed).toBe(false)
    expect(blocked.missingPrerequisites).toContain('substances')

    const ready = evaluateProcessSafetyInformationGate(basePacket())
    expect(ready.status).toBe('ready')
    expect(ready.deepHazardReviewAllowed).toBe(true)
    expect(ready.missingPrerequisites).toEqual([])
  })

  it('requires reusable safe limits and deviation consequences on technology profiles', () => {
    expect(technology.safeLimits).toHaveLength(1)
    expect(technology.deviationConsequences).toHaveLength(1)
    expect(technology.safeLimits[0]?.metric).toBe('coolant-temperature-c')
    expect(technology.deviationConsequences[0]?.consequence).toMatch(/boil-off/)

    expect(() =>
      createTechnologyProfile({
        technologyId: 'tech-empty',
        intendedOperation: 'noop',
        safeLimits: [],
        deviationConsequences: [
          {
            deviationId: 'd1',
            trigger: 'x',
            consequence: 'y',
          },
        ],
      }),
    ).toThrow(/at least one safeLimit/)

    expect(() =>
      createTechnologyProfile({
        technologyId: 'tech-empty-dev',
        intendedOperation: 'noop',
        safeLimits: [
          {
            limitId: 'l1',
            metric: 'm',
            bound: 1,
            unit: 'u',
          },
        ],
        deviationConsequences: [],
      }),
    ).toThrow(/at least one deviationConsequence/)
  })

  it('keeps legacy assets valid only when safe-operation proof is active', () => {
    const withProof = evaluateProcessSafetyInformationGate(
      basePacket({ equipment: [legacyValid] }),
    )
    expect(withProof.deepHazardReviewAllowed).toBe(true)
    expect(withProof.legacyAssetsValid).toEqual(['eq-legacy-compressor'])
    expect(withProof.legacyAssetsInvalid).toEqual([])

    const withoutProof = createCriticalEquipmentDossier({
      ...legacyValid,
      safeOperationProofActive: false,
    })
    const blockedLegacy = evaluateProcessSafetyInformationGate(
      basePacket({ equipment: [withoutProof] }),
    )
    expect(blockedLegacy.deepHazardReviewAllowed).toBe(false)
    expect(blockedLegacy.legacyAssetsInvalid).toEqual(['eq-legacy-compressor'])
    expect(blockedLegacy.missingPrerequisites).toContain('legacy-proof:eq-legacy-compressor')
  })

  it('fail-closes empty ids, non-finite bounds, nullish technology, and raw packet bypasses', () => {
    expect(() =>
      createCriticalEquipmentDossier({
        ...modernEquipment,
        equipmentId: '   ',
      }),
    ).toThrow(/equipmentId is required/)

    expect(() =>
      createTechnologyProfile({
        ...technology,
        safeLimits: [
          {
            limitId: 'bad',
            metric: 'm',
            bound: Number.NaN,
            unit: 'u',
          },
        ],
      }),
    ).toThrow(/safeLimit.bound must be a finite number/)

    const nullTech = evaluateProcessSafetyInformationGate(basePacket({ technology: null }))
    expect(nullTech.deepHazardReviewAllowed).toBe(false)
    expect(nullTech.missingPrerequisites).toContain('technology-profile')

    const undefinedTech = evaluateProcessSafetyInformationGate(
      basePacket({
        technology: undefined as unknown as TechnologyProfile | null,
      }),
    )
    expect(undefinedTech.deepHazardReviewAllowed).toBe(false)
    expect(undefinedTech.missingPrerequisites).toContain('technology-profile')

    const malformedTech = evaluateProcessSafetyInformationGate(
      basePacket({
        technology: {
          technologyId: '',
          intendedOperation: '',
          safeLimits: [
            {
              limitId: 'x',
              metric: 'm',
              bound: Number.NaN,
              unit: 'u',
            },
          ],
          deviationConsequences: [
            {
              deviationId: 'd',
              trigger: 't',
              consequence: 'c',
            },
          ],
        },
      }),
    )
    expect(malformedTech.deepHazardReviewAllowed).toBe(false)
    expect(malformedTech.missingPrerequisites).toContain('technology-profile-incomplete')

    const emptyEquipment = evaluateProcessSafetyInformationGate(basePacket({ equipment: [] }))
    expect(emptyEquipment.missingPrerequisites).toContain('equipment-dossiers')

    const blankDossier = evaluateProcessSafetyInformationGate(
      basePacket({
        equipment: [
          {
            ...modernEquipment,
            equipmentId: '',
          } as CriticalEquipmentDossier,
        ],
      }),
    )
    expect(blankDossier.deepHazardReviewAllowed).toBe(false)
    expect(blankDossier.missingPrerequisites.some((entry) => entry.startsWith('equipment-incomplete'))).toBe(
      true,
    )

    const duplicates = evaluateProcessSafetyInformationGate(
      basePacket({
        equipment: [modernEquipment, { ...modernEquipment }],
      }),
    )
    expect(duplicates.missingPrerequisites).toContain('equipment-duplicate:eq-pump-1')

    const multiMissing = evaluateProcessSafetyInformationGate(
      basePacket({
        inventoriesDocumented: false,
        diagramsCurrent: false,
        protectiveInfrastructureDocumented: false,
      }),
    )
    expect(multiMissing.missingPrerequisites).toEqual([
      'diagrams',
      'inventories',
      'protective-infrastructure',
    ])
  })
})
