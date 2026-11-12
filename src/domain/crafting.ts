import {
  getRecipeFundingCost,
  getRecipeInputMaterials,
  type ProductionRecipe,
} from '../data/production'
import { getEquipmentDefinition } from './equipment'
import {
  getEquipmentGradeCatalogParticipation,
  getEquipmentGradeCatalogVisibility,
} from './equipmentGradeCatalog'
import {
  resolveEquipmentGradeFabricationOutcome,
  type EquipmentGradeFabricationExplanationCode,
  type EquipmentGradeFabricationResolution,
} from './equipmentGradeFabrication'
import {
  resolveEquipmentGradeProjection,
  type EquipmentGradeId,
  type EquipmentGradeProjection,
  type EquipmentGradeVisibility,
} from './equipmentGrade'
import type { MarketState, ProductionMaterialRequirement, ProductionQueueEntry } from './models'

export interface ProductionJobSnapshot {
  recipeId: string
  recipeName: string
  recipeDescription: string
  outputItemId: string
  outputItemName: string
  outputQuantity: number
  inputMaterials: ProductionMaterialRequirement[]
  durationWeeks: number
  fundingCost: number
  outputGradeId: EquipmentGradeId
  outputGradeVisibility: EquipmentGradeVisibility
  outputGradeExplanationCodes: readonly EquipmentGradeFabricationExplanationCode[]
}

export function resolveProductionRecipeGradeOutcome(
  recipe: ProductionRecipe,
  requestedVisibility?: EquipmentGradeVisibility
): EquipmentGradeFabricationResolution {
  const definition = getEquipmentDefinition(recipe.outputItemId)
  if (!definition) {
    return Object.freeze({
      valid: false,
      issues: Object.freeze([
        Object.freeze({ code: 'output_ungraded' as const, field: 'outputItemId' }),
      ]),
    })
  }

  const authoredVisibility = getEquipmentGradeCatalogVisibility(definition.gradeProfile)
  const visibility =
    authoredVisibility === 'hidden' || requestedVisibility === 'hidden' ? 'hidden' : 'known'
  return resolveEquipmentGradeFabricationOutcome(
    recipe.gradeOutputRule,
    getEquipmentGradeCatalogParticipation(definition.gradeProfile),
    visibility
  )
}

export function projectProductionQueueGrade(
  entry: Pick<ProductionQueueEntry, 'outputGradeId' | 'outputGradeVisibility'>
): EquipmentGradeProjection {
  return resolveEquipmentGradeProjection(
    { state: 'graded', gradeId: entry.outputGradeId },
    entry.outputGradeVisibility
  )
}

export function getProductionGradeExplanationLabel(
  code: EquipmentGradeFabricationExplanationCode
) {
  switch (code) {
    case 'fabrication_grade.fixed':
      return 'Fixed by the authored production process'
    case 'fabrication_grade.catalog':
      return 'Matches the canonical equipment definition'
    case 'fabrication_grade.bounded_catalog':
      return 'Canonical definition verified within the supported grade range'
    case 'fabrication_grade.minimum_catalog':
      return 'Canonical definition verified against the minimum supported grade'
  }
}

export function buildProductionJobSnapshot(
  recipe: ProductionRecipe,
  market: MarketState
): ProductionJobSnapshot {
  const gradeOutcome = resolveProductionRecipeGradeOutcome(recipe)
  if (!gradeOutcome.valid) {
    throw new Error(
      `Cannot build fabrication snapshot for recipe "${recipe.recipeId}": ${gradeOutcome.issues
        .map((issue) => `${issue.field}:${issue.code}`)
        .join(',')}`
    )
  }

  return {
    recipeId: recipe.recipeId,
    recipeName: recipe.name,
    recipeDescription: recipe.description,
    outputItemId: recipe.outputItemId,
    outputItemName: recipe.outputItemName,
    outputQuantity: recipe.outputQuantity,
    inputMaterials: getRecipeInputMaterials(recipe),
    durationWeeks: recipe.durationWeeks,
    fundingCost: getRecipeFundingCost(recipe, market),
    outputGradeId: gradeOutcome.participation.gradeId,
    outputGradeVisibility: gradeOutcome.visibility,
    outputGradeExplanationCodes: [...gradeOutcome.explanationCodes],
  }
}

export function buildProductionQueueEntry(
  id: string,
  startedWeek: number,
  snapshot: ProductionJobSnapshot
): ProductionQueueEntry {
  return {
    id,
    recipeId: snapshot.recipeId,
    recipeName: snapshot.recipeName,
    recipeDescription: snapshot.recipeDescription,
    outputItemId: snapshot.outputItemId,
    outputItemName: snapshot.outputItemName,
    outputQuantity: snapshot.outputQuantity,
    inputMaterials: snapshot.inputMaterials.map((material) => ({ ...material })),
    startedWeek,
    durationWeeks: snapshot.durationWeeks,
    remainingWeeks: snapshot.durationWeeks,
    fundingCost: snapshot.fundingCost,
    outputGradeId: snapshot.outputGradeId,
    outputGradeVisibility: snapshot.outputGradeVisibility,
    outputGradeExplanationCodes: [...snapshot.outputGradeExplanationCodes],
  }
}

export function formatProductionMaterialSummary(
  materials: readonly ProductionMaterialRequirement[] | undefined
) {
  if (!materials || materials.length === 0) {
    return 'No input materials'
  }

  return materials.map((material) => `${material.materialName} x${material.quantity}`).join(', ')
}

export function formatProductionOutputLabel(quantity: number, outputName: string) {
  return `${quantity}x ${outputName}`
}
