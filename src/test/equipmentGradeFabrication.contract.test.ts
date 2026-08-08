import { describe, expect, it } from 'vitest'
import {
  getProductionRecipe,
  productionCatalog,
  validateProductionCatalogGradeRules,
  type ProductionRecipe,
} from '../data/production'
import {
  applyAuthorizedFabricatedEquipmentGradeTransformation,
  preserveFabricatedEquipmentGrade,
  resolveEquipmentGradeFabricationOutcome,
  validateEquipmentGradeFabricationRule,
} from '../domain/equipmentGradeFabrication'
import { buildProductionJobSnapshot, resolveProductionRecipeGradeOutcome } from '../domain/crafting'
import { advanceProductionQueues, queueFabrication } from '../domain/sim/production'
import { createStartingState } from '../data/startingState'
import { GAME_STORE_VERSION, migratePersistedStore } from '../app/store/runTransfer'

describe('equipment-grade fabrication contract', () => {
  it('strictly validates every rule kind and rejects unsupported authoring deterministically', () => {
    expect(validateEquipmentGradeFabricationRule({ kind: 'fixed', gradeId: 'grade_1' })).toEqual({
      valid: true,
      value: { kind: 'fixed', gradeId: 'grade_1' },
    })
    expect(validateEquipmentGradeFabricationRule({ kind: 'catalog' })).toMatchObject({
      valid: true,
    })
    expect(
      validateEquipmentGradeFabricationRule({
        kind: 'bounded_catalog',
        minimumGradeId: 'grade_1',
        maximumGradeId: 'grade_3',
      })
    ).toMatchObject({ valid: true })
    expect(
      validateEquipmentGradeFabricationRule({
        kind: 'minimum_catalog',
        minimumGradeId: 'grade_2',
      })
    ).toMatchObject({ valid: true })

    expect(
      validateEquipmentGradeFabricationRule({
        kind: 'bounded_catalog',
        minimumGradeId: 'grade_4',
        maximumGradeId: 'grade_2',
        label: 'Grade IV',
      })
    ).toEqual({
      valid: false,
      issues: [
        { code: 'unexpected_field', field: 'label' },
        { code: 'reversed_grade_range', field: 'maximumGradeId' },
      ],
    })
    expect(validateEquipmentGradeFabricationRule({ kind: 'fixed' })).toEqual({
      valid: false,
      issues: [{ code: 'missing_grade_id', field: 'gradeId' }],
    })
    expect(validateEquipmentGradeFabricationRule({ kind: 'fixed', gradeId: 'Grade I' })).toEqual({
      valid: false,
      issues: [{ code: 'invalid_grade_id', field: 'gradeId' }],
    })
  })

  it('authors all live recipes and covers fixed, catalog, bounded, and minimum resolution', () => {
    expect(() => validateProductionCatalogGradeRules(productionCatalog)).not.toThrow()
    expect(productionCatalog).toHaveLength(7)
    expect(new Set(productionCatalog.map((recipe) => recipe.gradeOutputRule.kind))).toEqual(
      new Set(['fixed', 'catalog', 'bounded_catalog', 'minimum_catalog'])
    )

    expect(resolveProductionRecipeGradeOutcome(getProductionRecipe('ward-seals')!)).toMatchObject({
      valid: true,
      participation: { gradeId: 'grade_1' },
      explanationCodes: ['fabrication_grade.fixed'],
    })
    expect(resolveProductionRecipeGradeOutcome(getProductionRecipe('emf-sensors')!)).toMatchObject({
      valid: true,
      participation: { gradeId: 'grade_2' },
      explanationCodes: ['fabrication_grade.catalog'],
    })
    expect(
      resolveProductionRecipeGradeOutcome(getProductionRecipe('signal-jammers')!)
    ).toMatchObject({
      valid: true,
      participation: { gradeId: 'grade_2' },
      explanationCodes: ['fabrication_grade.bounded_catalog'],
    })
    expect(
      resolveProductionRecipeGradeOutcome(getProductionRecipe('silver-rounds')!)
    ).toMatchObject({
      valid: true,
      participation: { gradeId: 'grade_1' },
      explanationCodes: ['fabrication_grade.minimum_catalog'],
    })
  })

  it('fails closed for ungraded, mismatched, below-minimum, and out-of-range outputs', () => {
    expect(
      resolveEquipmentGradeFabricationOutcome({ kind: 'catalog' }, { state: 'ungraded' }, 'known')
    ).toMatchObject({ valid: false, issues: [{ code: 'output_ungraded' }] })
    expect(
      resolveEquipmentGradeFabricationOutcome(
        { kind: 'fixed', gradeId: 'grade_2' },
        { state: 'graded', gradeId: 'grade_1' },
        'known'
      )
    ).toMatchObject({ valid: false, issues: [{ code: 'fixed_catalog_mismatch' }] })
    expect(
      resolveEquipmentGradeFabricationOutcome(
        { kind: 'minimum_catalog', minimumGradeId: 'grade_3' },
        { state: 'graded', gradeId: 'grade_2' },
        'known'
      )
    ).toMatchObject({ valid: false, issues: [{ code: 'catalog_grade_below_minimum' }] })
    expect(
      resolveEquipmentGradeFabricationOutcome(
        {
          kind: 'bounded_catalog',
          minimumGradeId: 'grade_2',
          maximumGradeId: 'grade_4',
        },
        { state: 'graded', gradeId: 'grade_5' },
        'known'
      )
    ).toMatchObject({ valid: false, issues: [{ code: 'catalog_grade_outside_bounds' }] })
  })

  it('projects every hidden outcome identically without serialized grade details', () => {
    const hiddenLow = resolveEquipmentGradeFabricationOutcome(
      { kind: 'fixed', gradeId: 'grade_1' },
      { state: 'graded', gradeId: 'grade_1' },
      'hidden'
    )
    const hiddenHigh = resolveEquipmentGradeFabricationOutcome(
      { kind: 'fixed', gradeId: 'grade_5' },
      { state: 'graded', gradeId: 'grade_5' },
      'hidden'
    )
    expect(hiddenLow.valid && hiddenLow.projection).toEqual(
      hiddenHigh.valid && hiddenHigh.projection
    )
    const serialized = JSON.stringify(hiddenLow.valid && hiddenLow.projection)
    expect(serialized).toBe(JSON.stringify(hiddenHigh.valid && hiddenHigh.projection))
    expect(serialized).not.toMatch(/grade_[15]|Grade [IV]|rank|equipment\.grade\.grade_/)
  })

  it('snapshots grade independently from unrelated production and equipment axes', () => {
    const source = getProductionRecipe('signal-jammers')!
    const recipe: ProductionRecipe = {
      ...source,
      inputMaterials: { ...source.inputMaterials },
      gradeOutputRule: { ...source.gradeOutputRule },
    }
    const market = createStartingState().market
    const snapshot = buildProductionJobSnapshot(recipe, market)

    recipe.baseFundingCost = 999
    recipe.durationWeeks = 99
    recipe.inputMaterials.electronic_parts = 99
    recipe.gradeOutputRule = { kind: 'fixed', gradeId: 'grade_1' }

    expect(snapshot).toMatchObject({
      outputGradeId: 'grade_2',
      outputGradeVisibility: 'known',
      outputGradeExplanationCodes: ['fabrication_grade.bounded_catalog'],
      durationWeeks: source.durationWeeks,
    })
  })

  it('creates one immutable lot and matching event without duplicating replayed completion', () => {
    const state = createStartingState()
    const queued = queueFabrication(state, 'emf-sensors')
    const ready = {
      ...queued,
      productionQueue: queued.productionQueue.map((entry) => ({ ...entry, remainingWeeks: 1 })),
    }
    const completed = advanceProductionQueues(ready)
    const entry = ready.productionQueue[0]!

    expect(completed.state.fabricatedEquipmentLots?.[entry.id]).toEqual({
      queueId: entry.id,
      recipeId: 'emf-sensors',
      itemId: 'emf_sensors',
      quantity: 1,
      gradeId: 'grade_2',
      completedWeek: state.week,
    })
    expect(completed.eventDrafts[0]).toMatchObject({
      type: 'production.queue_completed',
      payload: { outputGradeId: 'grade_2' },
    })

    const replay = advanceProductionQueues({
      ...completed.state,
      productionQueue: ready.productionQueue,
    })
    expect(replay.state.inventory).toEqual(completed.state.inventory)
    expect(replay.state.fabricatedEquipmentLots).toEqual(completed.state.fabricatedEquipmentLots)
    expect(replay.eventDrafts).toEqual([])
  })

  it('keeps a live job queued when its id conflicts with a different completed lot', () => {
    const queued = queueFabrication(createStartingState(), 'emf-sensors')
    const entry = { ...queued.productionQueue[0]!, remainingWeeks: 1 }
    const inventoryBefore = structuredClone(queued.inventory)
    const result = advanceProductionQueues({
      ...queued,
      productionQueue: [entry],
      fabricatedEquipmentLots: {
        [entry.id]: {
          queueId: entry.id,
          recipeId: entry.recipeId,
          itemId: entry.outputItemId,
          quantity: entry.outputQuantity,
          gradeId: 'grade_1',
          completedWeek: queued.week,
        },
      },
    })

    expect(result.state.productionQueue).toEqual([entry])
    expect(result.state.inventory).toEqual(inventoryBefore)
    expect(result.completed).toEqual([])
    expect(result.eventDrafts).toEqual([])
  })

  it('allocates new queue ids around durable completed-lot ids', () => {
    const state = createStartingState()
    const first = queueFabrication(state, 'med-kits').productionQueue[0]!
    const queued = queueFabrication(
      {
        ...state,
        fabricatedEquipmentLots: {
          [first.id]: {
            queueId: first.id,
            recipeId: first.recipeId,
            itemId: first.outputItemId,
            quantity: first.outputQuantity,
            gradeId: first.outputGradeId,
            completedWeek: state.week,
          },
        },
      },
      'med-kits'
    )

    expect(queued.productionQueue[0]!.id).not.toBe(first.id)
  })

  it('hydrates legacy queues, preserves valid lots, and drops malformed siblings', () => {
    const fallback = createStartingState()
    const queued = queueFabrication(fallback, 'med-kits')
    const legacyQueue = structuredClone(queued.productionQueue)
    const legacyEntry = legacyQueue[0] as unknown as Record<string, unknown>
    legacyEntry.id = 'queue-complete'
    delete legacyEntry.outputGradeId
    delete legacyEntry.outputGradeVisibility
    delete legacyEntry.outputGradeExplanationCodes

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          productionQueue: legacyQueue,
          fabricatedEquipmentLots: JSON.parse(
            JSON.stringify({
              'queue-complete': {
                queueId: 'queue-complete',
                recipeId: 'med-kits',
                itemId: 'medkits',
                quantity: 1,
                gradeId: 'grade_1',
                completedWeek: 1,
              },
              broken: {
                queueId: 'wrong-key',
                recipeId: 'med-kits',
                itemId: 'medkits',
                quantity: 1,
                gradeId: 'grade_5',
                completedWeek: 1,
              },
              constructor: {
                queueId: 'constructor',
                recipeId: 'med-kits',
                itemId: 'medkits',
                quantity: 1,
                gradeId: 'grade_1',
                completedWeek: 1,
              },
              prototype: {
                queueId: 'prototype',
                recipeId: 'med-kits',
                itemId: 'medkits',
                quantity: 1,
                gradeId: 'grade_1',
                completedWeek: 1,
              },
              ['__proto__']: {
                queueId: '__proto__',
                recipeId: 'med-kits',
                itemId: 'medkits',
                quantity: 1,
                gradeId: 'grade_1',
                completedWeek: 1,
              },
            })
          ),
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.productionQueue[0]).toMatchObject({
      outputGradeId: 'grade_1',
      outputGradeVisibility: 'known',
      outputGradeExplanationCodes: ['fabrication_grade.catalog'],
    })
    expect(hydrated.productionQueue[0]!.id).not.toBe('queue-complete')
    expect(hydrated.fabricatedEquipmentLots).toEqual({
      'queue-complete': {
        queueId: 'queue-complete',
        recipeId: 'med-kits',
        itemId: 'medkits',
        quantity: 1,
        gradeId: 'grade_1',
        completedWeek: 1,
      },
    })
  })

  it('drops partial queue grade snapshots instead of treating them as legacy', () => {
    const fallback = createStartingState()
    const queued = queueFabrication(fallback, 'med-kits')
    const partialQueue = structuredClone(queued.productionQueue)
    delete (partialQueue[0] as unknown as Record<string, unknown>).outputGradeVisibility

    const hydrated = migratePersistedStore(
      { game: { ...queued, productionQueue: partialQueue } },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.productionQueue).toEqual([])
  })

  it('keeps an invalid dynamically authored recipe unavailable without mutating state', () => {
    const state = createStartingState()
    const recipe = getProductionRecipe('med-kits')!
    const originalRule = recipe.gradeOutputRule
    recipe.gradeOutputRule = { kind: 'fixed', gradeId: 'grade_2' }

    try {
      expect(queueFabrication(state, 'med-kits')).toBe(state)
    } finally {
      recipe.gradeOutputRule = originalRule
    }
  })

  it('preserves baseline grade unless an explicit authorized transformation changes it', () => {
    const lot = {
      queueId: 'queue-1',
      recipeId: 'med-kits',
      itemId: 'medkits',
      quantity: 1,
      gradeId: 'grade_1' as const,
      completedWeek: 1,
    }
    expect(preserveFabricatedEquipmentGrade(lot)).toEqual(lot)
    expect(
      applyAuthorizedFabricatedEquipmentGradeTransformation(lot, {
        authorized: true,
        authorizationId: 'authorized-upgrade-path',
        gradeId: 'grade_2',
      })
    ).toMatchObject({ gradeId: 'grade_2' })
    expect(
      applyAuthorizedFabricatedEquipmentGradeTransformation(lot, {
        authorized: true,
        authorizationId: 42,
        gradeId: 'grade_5',
      })
    ).toEqual(lot)
    expect(lot.gradeId).toBe('grade_1')
  })
})
