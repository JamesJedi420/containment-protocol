import { describe, expect, it } from 'vitest'
import { planPrerequisiteProcessing } from '../domain/prerequisiteProcessing'

const finalRecipe = {
  recipeId: 'final-kit',
  inputMaterials: { calibrated_plate: 3 },
}

const recipes = [
  {
    recipeId: 'refine-alloy',
    outputMaterialId: 'alloy_ingot',
    outputQuantity: 2,
    inputMaterials: [{ materialId: 'ore', quantity: 3 }],
    departmentId: 'engineering',
    taskType: 'repair',
    requiredWork: 2,
  },
  {
    recipeId: 'calibrate-plate',
    outputMaterialId: 'calibrated_plate',
    outputQuantity: 1,
    inputMaterials: [{ materialId: 'alloy_ingot', quantity: 1 }],
    departmentId: 'engineering',
    taskType: 'repair',
    requiredWork: 1,
  },
] as const

describe('planPrerequisiteProcessing', () => {
  it('allocates stock first and returns prerequisite drafts in dependency order', () => {
    const result = planPrerequisiteProcessing(finalRecipe, { calibrated_plate: 1, ore: 6 }, recipes)

    expect(result).toMatchObject({
      state: 'planned',
      inventoryAllocations: { calibrated_plate: 1, ore: 3 },
      finalDependsOnWorkOrderIds: ['final-kit:prerequisite:calibrate-plate:2'],
    })
    expect(result.prerequisiteWorkOrders).toEqual([
      expect.objectContaining({
        id: 'final-kit:prerequisite:refine-alloy:1',
        batchCount: 1,
        outputQuantity: 2,
        requiredWork: 2,
        dependsOnWorkOrderIds: [],
      }),
      expect.objectContaining({
        id: 'final-kit:prerequisite:calibrate-plate:2',
        batchCount: 2,
        outputQuantity: 2,
        requiredWork: 2,
        dependsOnWorkOrderIds: ['final-kit:prerequisite:refine-alloy:1'],
      }),
    ])
  })

  it('replays identically without mutating inputs', () => {
    const inventory = { calibrated_plate: 1, ore: 6 }
    const before = structuredClone(inventory)
    const first = planPrerequisiteProcessing(finalRecipe, inventory, recipes)

    expect(planPrerequisiteProcessing(finalRecipe, inventory, recipes)).toEqual(first)
    expect(inventory).toEqual(before)
  })

  it('reuses planned batch surplus across prerequisite branches', () => {
    const result = planPrerequisiteProcessing(
      { recipeId: 'final', inputMaterials: { assembled_a: 1, assembled_b: 1 } },
      { raw: 2 },
      [
        {
          recipeId: 'make-x',
          outputMaterialId: 'processed_x',
          outputQuantity: 2,
          inputMaterials: [{ materialId: 'raw', quantity: 2 }],
          departmentId: 'engineering',
          taskType: 'repair',
          requiredWork: 1,
        },
        {
          recipeId: 'make-a',
          outputMaterialId: 'assembled_a',
          outputQuantity: 1,
          inputMaterials: [{ materialId: 'processed_x', quantity: 1 }],
          departmentId: 'engineering',
          taskType: 'repair',
          requiredWork: 1,
        },
        {
          recipeId: 'make-b',
          outputMaterialId: 'assembled_b',
          outputQuantity: 1,
          inputMaterials: [{ materialId: 'processed_x', quantity: 1 }],
          departmentId: 'engineering',
          taskType: 'repair',
          requiredWork: 1,
        },
      ]
    )

    expect(result).toMatchObject({ state: 'planned', inventoryAllocations: { raw: 2 } })
    expect(result.prerequisiteWorkOrders.map((order) => order.recipeId)).toEqual([
      'make-x',
      'make-a',
      'make-b',
    ])
    expect(result.prerequisiteWorkOrders[2].dependsOnWorkOrderIds).toEqual([
      'final:prerequisite:make-x:1',
    ])
  })

  it('fails closed for missing, ambiguous, and cyclic processing definitions', () => {
    expect(planPrerequisiteProcessing(finalRecipe, {}, [])).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'missing-processing-recipe', materialId: 'calibrated_plate' }],
    })
    expect(
      planPrerequisiteProcessing(finalRecipe, {}, [
        ...recipes,
        { ...recipes[1], recipeId: 'alternate-plate' },
      ])
    ).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'ambiguous-processing-recipe', materialId: 'calibrated_plate' }],
    })
    expect(
      planPrerequisiteProcessing(finalRecipe, {}, [
        { ...recipes[1], inputMaterials: [{ materialId: 'calibrated_plate', quantity: 1 }] },
      ])
    ).toMatchObject({
      state: 'blocked',
      reasons: [
        {
          code: 'cyclic-processing-dependency',
          materialId: 'calibrated_plate',
          recipeIds: ['calibrate-plate'],
        },
      ],
    })
  })

  it('fails closed for malformed inputs', () => {
    expect(
      planPrerequisiteProcessing({ recipeId: 'bad', inputMaterials: { ore: 0 } }, {}, recipes)
    ).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'invalid-final-recipe' }],
    })
    expect(planPrerequisiteProcessing(finalRecipe, { ore: -1 }, recipes)).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'invalid-inventory' }],
    })
    expect(
      planPrerequisiteProcessing(
        { recipeId: 'bad', inputMaterials: new Map([['ore', 1]]) },
        {},
        recipes
      )
    ).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'invalid-final-recipe' }],
    })
    expect(
      planPrerequisiteProcessing(
        { recipeId: 'safe-key', inputMaterials: { constructor: 1 } },
        {},
        []
      )
    ).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'missing-processing-recipe', materialId: 'constructor' }],
    })
    expect(
      planPrerequisiteProcessing(
        { recipeId: 'overflow', inputMaterials: { calibrated_plate: Number.MAX_SAFE_INTEGER } },
        {},
        recipes
      )
    ).toMatchObject({
      state: 'blocked',
      reasons: [{ code: 'unrepresentable-processing-quantity', materialId: 'alloy_ingot' }],
    })
  })
})
