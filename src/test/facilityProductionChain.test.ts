import { describe, expect, it } from 'vitest'
import {
  REPRESENTATIVE_PRODUCTION_CHAINS,
  advanceProductionChain,
  createEmptyProductionChainRegistry,
  createProductionChainRun,
  getProductionChainVariant,
  listProductionChainVariantsForOutputClass,
  projectProductionChainStatus,
  resolveProductionChainStage,
  sanitizeFacilityProductionChainRegistry,
  type ProductionFacilitySnapshot,
} from '../domain/facilityProductionChain'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'

const FIT_REFINER: SpecialistOperatorSlot = {
  roleFamily: 'refinement_technician',
  skillBand: 'competent',
  availabilityBand: 'fit',
}

const FIT_ARCHIVIST: SpecialistOperatorSlot = {
  roleFamily: 'archive_analyst',
  skillBand: 'competent',
  availabilityBand: 'fit',
}

const BASE_FACILITY: ProductionFacilitySnapshot = {
  rolesPresent: ['stockpile', 'processor', 'source', 'lab', 'workshop', 'deployment'],
  stockByMaterialId: {
    'material:ore_chunk': 4,
    'material:ore_lot': 4,
    'material:alloy_sample': 2,
    'material:smelter_crucible': 1,
    'material:process_solvent': 2,
    'material:catalyst_charge': 2,
  },
  dependencyAvailabilityByNodeId: {
    'dep:process_power': 'ready',
    'dep:lab_power': 'ready',
    'dep:workshop_power': 'ready',
  },
}

describe('SPE-3360 facility production chain', () => {
  it('authors two variants with the same output class but different profiles', () => {
    const variants = listProductionChainVariantsForOutputClass('output:refined_alloy')
    expect(variants).toHaveLength(2)
    expect(variants[0]!.throughputPerCycle).not.toBe(variants[1]!.throughputPerCycle)
    expect(variants[0]!.logisticsBurden).not.toBe(variants[1]!.logisticsBurden)
    expect(variants[0]!.utilityExposure).not.toBe(variants[1]!.utilityExposure)
    expect(variants.every((v) => v.outputKind === 'facility_durable')).toBe(true)
    expect(REPRESENTATIVE_PRODUCTION_CHAINS.length).toBeGreaterThanOrEqual(3)
  })

  it('advances a compact chain from storage input to facility-produced alloy', () => {
    const run = createProductionChainRun({
      runId: 'run:compact-1',
      chainId: 'chain:compact-smelter',
    })!
    const store = advanceProductionChain({
      run,
      facility: BASE_FACILITY,
      operators: [FIT_REFINER],
    })!
    expect(store.run.state).toBe('producing')
    expect(store.handoff?.materialId).toBe('material:ore_lot')

    const process = advanceProductionChain({
      run: store.run,
      facility: {
        ...BASE_FACILITY,
        stockByMaterialId: {
          ...BASE_FACILITY.stockByMaterialId,
          'material:ore_lot': 4,
        },
      },
      operators: [FIT_REFINER],
    })!
    expect(process.run.state).toBe('completed')
    expect(process.handoff?.facilityProduced).toBe(true)
    expect(process.handoff?.outputKind).toBe('facility_durable')
    expect(process.handoff?.materialId).toBe('material:refined_alloy')
    expect(process.handoff?.quantity).toBe(2)

    const status = projectProductionChainStatus(process.run)!
    expect(status.ownerIssueId).toBe('SPE-3360')
    expect(status.state).toBe('completed')
    expect(status.producedMaterialId).toBe('material:refined_alloy')
  })

  it('blocks missing facility role, missing input, staffing, damage, auxiliary, and dependency', () => {
    const run = createProductionChainRun({
      runId: 'run:block',
      chainId: 'chain:compact-smelter',
    })!

    const missingRole = resolveProductionChainStage({
      run,
      facility: { ...BASE_FACILITY, rolesPresent: ['processor'] },
      operators: [FIT_REFINER],
    })
    expect(missingRole.ok).toBe(false)
    if (!missingRole.ok) {
      expect(missingRole.reasonCodes).toContain('missing_facility_role')
    }

    const missingInput = resolveProductionChainStage({
      run,
      facility: {
        ...BASE_FACILITY,
        stockByMaterialId: { ...BASE_FACILITY.stockByMaterialId, 'material:ore_chunk': 0 },
      },
      operators: [FIT_REFINER],
    })
    expect(missingInput.ok).toBe(false)
    if (!missingInput.ok) {
      expect(missingInput.reasonCodes).toContain('missing_input')
    }

    const staffing = resolveProductionChainStage({
      run: { ...run, currentStageIndex: 1 },
      facility: BASE_FACILITY,
      operators: [FIT_ARCHIVIST],
    })
    expect(staffing.ok).toBe(false)
    if (!staffing.ok) {
      expect(staffing.reasonCodes).toContain('staffing_shortage')
    }

    const damaged = resolveProductionChainStage({
      run: { ...run, currentStageIndex: 1 },
      facility: {
        ...BASE_FACILITY,
        damagedRoles: ['processor'],
      },
      operators: [FIT_REFINER],
    })
    expect(damaged.ok).toBe(false)
    if (!damaged.ok) {
      expect(damaged.reasonCodes).toContain('damaged_facility')
    }

    const missingAux = resolveProductionChainStage({
      run: { ...run, currentStageIndex: 1 },
      facility: {
        ...BASE_FACILITY,
        stockByMaterialId: {
          ...BASE_FACILITY.stockByMaterialId,
          'material:smelter_crucible': 0,
        },
      },
      operators: [FIT_REFINER],
    })
    expect(missingAux.ok).toBe(false)
    if (!missingAux.ok) {
      expect(missingAux.reasonCodes).toContain('missing_auxiliary')
    }

    const depDown = resolveProductionChainStage({
      run: { ...run, currentStageIndex: 1 },
      facility: {
        ...BASE_FACILITY,
        dependencyAvailabilityByNodeId: {
          ...BASE_FACILITY.dependencyAvailabilityByNodeId!,
          'dep:process_power': 'unavailable',
        },
      },
      operators: [FIT_REFINER],
    })
    expect(depDown.ok).toBe(false)
    if (!depDown.ok) {
      expect(depDown.reasonCodes).toContain('dependency_interrupted')
    }
  })

  it('requires external catalyst for recirculation and refuses self-generation', () => {
    const loop = getProductionChainVariant('chain:catalyst-recirculation')!
    expect(loop.externalCatalyst?.materialId).toBe('material:catalyst_charge')
    expect(loop.recirculationLossPerCycle).toBe(1)

    const run = createProductionChainRun({
      runId: 'run:loop',
      chainId: 'chain:catalyst-recirculation',
    })!

    const blocked = resolveProductionChainStage({
      run,
      facility: {
        ...BASE_FACILITY,
        stockByMaterialId: {
          ...BASE_FACILITY.stockByMaterialId,
          'material:catalyst_charge': 0,
        },
      },
      operators: [FIT_REFINER],
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.reasonCodes).toContain('self_generation_blocked')
    }

    const advanced = advanceProductionChain({
      run,
      facility: BASE_FACILITY,
      operators: [FIT_REFINER],
    })!
    expect(advanced.run.cyclesCompleted).toBe(1)
    expect(advanced.run.recirculationBuffer).toBe(1)
    expect(advanced.handoff?.quantity).toBe(1)
    expect(advanced.consumedPreview.some((c) => c.materialId === 'material:catalyst_charge')).toBe(
      true,
    )
    expect(advanced.run.currentStageIndex).toBe(0)
  })

  it('sanitizes registry round-trips and rejects malformed runs', () => {
    const run = createProductionChainRun({
      runId: 'run:save',
      chainId: 'chain:compact-smelter',
    })!
    const registry = sanitizeFacilityProductionChainRegistry({
      version: 1,
      runs: [run],
    })!
    expect(registry.runs).toHaveLength(1)
    expect(sanitizeFacilityProductionChainRegistry(JSON.parse(JSON.stringify(registry)))).toEqual(
      registry,
    )
    expect(sanitizeFacilityProductionChainRegistry(createEmptyProductionChainRegistry())).toEqual(
      createEmptyProductionChainRegistry(),
    )
    expect(
      sanitizeFacilityProductionChainRegistry({
        version: 1,
        runs: [{ ...run, chainId: 'chain:missing' }],
      }),
    ).toBeUndefined()
    expect(sanitizeFacilityProductionChainRegistry({ version: 2, runs: [] })).toBeUndefined()
  })
})
