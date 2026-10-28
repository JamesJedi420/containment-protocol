import { describe, expect, it } from 'vitest'
import {
  createCriticalEquipmentDossier,
  createTechnologyProfile,
  evaluateProcessSafetyInformationGate,
  PROCESS_SAFETY_INFORMATION_GATE_OWNER,
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

describe('SPE-872 process safety information gate', () => {
  it('exports owner constant and blocks deep review until baseline is complete', () => {
    expect(PROCESS_SAFETY_INFORMATION_GATE_OWNER).toBe('SPE-872')

    const blocked = evaluateProcessSafetyInformationGate({
      processId: 'proc-alpha',
      substancesComplete: false,
      inventoriesDocumented: true,
      diagramsCurrent: true,
      protectiveInfrastructureDocumented: true,
      technology,
      equipment: [modernEquipment],
    })
    expect(blocked.status).toBe('blocked')
    expect(blocked.deepHazardReviewAllowed).toBe(false)
    expect(blocked.missingPrerequisites).toContain('substances')

    const ready = evaluateProcessSafetyInformationGate({
      processId: 'proc-alpha',
      substancesComplete: true,
      inventoriesDocumented: true,
      diagramsCurrent: true,
      protectiveInfrastructureDocumented: true,
      technology,
      equipment: [modernEquipment],
    })
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
    const withProof = evaluateProcessSafetyInformationGate({
      processId: 'proc-legacy',
      substancesComplete: true,
      inventoriesDocumented: true,
      diagramsCurrent: true,
      protectiveInfrastructureDocumented: true,
      technology,
      equipment: [legacyValid],
    })
    expect(withProof.deepHazardReviewAllowed).toBe(true)
    expect(withProof.legacyAssetsValid).toEqual(['eq-legacy-compressor'])
    expect(withProof.legacyAssetsInvalid).toEqual([])

    const withoutProof = createCriticalEquipmentDossier({
      ...legacyValid,
      safeOperationProofActive: false,
    })
    const blockedLegacy = evaluateProcessSafetyInformationGate({
      processId: 'proc-legacy',
      substancesComplete: true,
      inventoriesDocumented: true,
      diagramsCurrent: true,
      protectiveInfrastructureDocumented: true,
      technology,
      equipment: [withoutProof],
    })
    expect(blockedLegacy.deepHazardReviewAllowed).toBe(false)
    expect(blockedLegacy.legacyAssetsInvalid).toEqual(['eq-legacy-compressor'])
    expect(blockedLegacy.missingPrerequisites).toContain('legacy-proof:eq-legacy-compressor')
  })

  it('fail-closes empty ids and non-finite safe-limit bounds', () => {
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
  })
})
