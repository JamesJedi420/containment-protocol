import { randInt } from '../domain/math'
import {
  type MarketPressure,
  type MarketState,
  type ProductionMaterialRequirement,
} from '../domain/models'
import { getEquipmentCatalogEntries } from '../domain/equipment'

export interface ProductionMaterialDefinition {
  materialId: string
  name: string
  description: string
  startingStock: number
}

export interface ProductionRecipe {
  recipeId: string
  name: string
  description: string
  outputItemId: string
  outputItemName: string
  outputQuantity: number
  durationWeeks: number
  baseFundingCost: number
  inputMaterials: Record<string, number>
}

export type MarketListingCategory = 'equipment' | 'component' | 'material'

const RECIPE_MARKET_CATEGORY: Record<string, MarketListingCategory> = {
  'ward-seals': 'component',
  'med-kits': 'equipment',
  'silver-rounds': 'component',
  'signal-jammers': 'equipment',
  'emf-sensors': 'equipment',
  'warding-kits': 'equipment',
  'ritual-components': 'component',
}

export const productionMaterialCatalog: ProductionMaterialDefinition[] = [
  {
    materialId: 'electronic_parts',
    name: 'Electronic Parts',
    description: 'Circuit boards, signal relays, and portable sensor housings.',
    startingStock: 8,
  },
  {
    materialId: 'medical_supplies',
    name: 'Medical Supplies',
    description: 'Bandages, stabilizers, and sterile trauma components.',
    startingStock: 8,
  },
  {
    materialId: 'occult_reagents',
    name: 'Occult Reagents',
    description: 'Sanctified salts, reactive chalk, and field ritual consumables.',
    startingStock: 8,
  },
  {
    materialId: 'warding_resin',
    name: 'Warding Resin',
    description: 'Sealant compounds used for wards, barriers, and ritual anchors.',
    startingStock: 6,
  },
  {
    materialId: 'ballistic_supplies',
    name: 'Ballistic Supplies',
    description: 'Casings, propellant, and treated payload stock for ammunition runs.',
    startingStock: 10,
  },
]

export const productionCatalog: ProductionRecipe[] = [
  {
    recipeId: 'ward-seals',
    name: 'Ward Seal Batch',
    description: 'Field-ready containment seals for occult or unstable breach sites.',
    outputItemId: 'ward_seals',
    outputItemName: 'Ward Seals',
    outputQuantity: 2,
    durationWeeks: 2,
    baseFundingCost: 20,
    inputMaterials: {
      occult_reagents: 1,
      warding_resin: 1,
    },
  },
  {
    recipeId: 'med-kits',
    name: 'Emergency Medkits',
    description: 'Rapid trauma kits for high-fatigue and injury-prone operations.',
    outputItemId: 'medkits',
    outputItemName: 'Emergency Medkits',
    outputQuantity: 1,
    durationWeeks: 1,
    baseFundingCost: 16,
    inputMaterials: {
      medical_supplies: 2,
    },
  },
  {
    recipeId: 'silver-rounds',
    name: 'Silver Rounds',
    description: 'Ammunition run for combat-heavy response units.',
    outputItemId: 'silver_rounds',
    outputItemName: 'Silver Rounds',
    outputQuantity: 3,
    durationWeeks: 2,
    baseFundingCost: 18,
    inputMaterials: {
      ballistic_supplies: 2,
      occult_reagents: 1,
    },
  },
  {
    recipeId: 'signal-jammers',
    name: 'Signal Jammers',
    description: 'Portable disruption kits for intel and field-control work.',
    outputItemId: 'signal_jammers',
    outputItemName: 'Signal Jammers',
    outputQuantity: 1,
    durationWeeks: 2,
    baseFundingCost: 22,
    inputMaterials: {
      electronic_parts: 2,
    },
  },
  {
    recipeId: 'emf-sensors',
    name: 'EMF Sensors',
    description: 'Portable EMF arrays for anomaly sweeps, witness sites, and evidence recovery.',
    outputItemId: 'emf_sensors',
    outputItemName: 'EMF Sensors',
    outputQuantity: 1,
    durationWeeks: 2,
    baseFundingCost: 20,
    inputMaterials: {
      electronic_parts: 2,
      occult_reagents: 1,
    },
  },
  {
    recipeId: 'warding-kits',
    name: 'Warding Kits',
    description: 'Portable field kits for rapid ward placement and occult stabilization.',
    outputItemId: 'warding_kits',
    outputItemName: 'Warding Kits',
    outputQuantity: 1,
    durationWeeks: 2,
    baseFundingCost: 24,
    inputMaterials: {
      warding_resin: 2,
      occult_reagents: 1,
    },
  },
  {
    recipeId: 'ritual-components',
    name: 'Ritual Components',
    description: 'Prepared ritual bundles for anomaly handling and occult field work.',
    outputItemId: 'ritual_components',
    outputItemName: 'Ritual Components',
    outputQuantity: 2,
    durationWeeks: 1,
    baseFundingCost: 17,
    inputMaterials: {
      occult_reagents: 2,
      warding_resin: 1,
    },
  },
]

export const inventoryItemLabels: Record<string, string> = Object.fromEntries([
  ...productionMaterialCatalog.map((material) => [material.materialId, material.name] as const),
  ...getEquipmentCatalogEntries().map((definition) => [definition.id, definition.name] as const),
  ...productionCatalog.map((recipe) => [recipe.outputItemId, recipe.outputItemName] as const),
])

export function getProductionRecipe(recipeId: string) {
  return productionCatalog.find((recipe) => recipe.recipeId === recipeId)
}

export function getProductionMaterial(materialId: string) {
  return productionMaterialCatalog.find((material) => material.materialId === materialId)
}

export function getRecipeInputMaterials(recipe: ProductionRecipe): ProductionMaterialRequirement[] {
  return Object.entries(recipe.inputMaterials)
    .map(([materialId, quantity]) => ({
      materialId,
      quantity,
      materialName: inventoryItemLabels[materialId] ?? materialId,
    }))
    .sort((left, right) => left.materialName.localeCompare(right.materialName))
}

export function hasRecipeMaterialStock(
  recipe: ProductionRecipe,
  inventory: Record<string, number>
) {
  return Object.entries(recipe.inputMaterials).every(
    ([materialId, quantity]) => (inventory[materialId] ?? 0) >= quantity
  )
}

export function getMissingRecipeMaterials(
  recipe: ProductionRecipe,
  inventory: Record<string, number>
) {
  return getRecipeInputMaterials(recipe).filter(
    (material) => (inventory[material.materialId] ?? 0) < material.quantity
  )
}

export function createStartingInventory() {
  const inventory = Object.fromEntries(
    Object.keys(inventoryItemLabels).map((itemId) => [itemId, 0])
  ) as Record<string, number>

  for (const material of productionMaterialCatalog) {
    inventory[material.materialId] = material.startingStock
  }

  return inventory
}

export function createStartingMarket(): MarketState {
  return {
    week: 1,
    featuredRecipeId: productionCatalog[0]?.recipeId ?? 'ward-seals',
    pressure: 'stable',
    costMultiplier: 1,
  }
}

export function getRecipeFundingCost(recipe: ProductionRecipe, market: MarketState) {
  const featuredDiscount = market.featuredRecipeId === recipe.recipeId ? 0.12 : 0
  const modifier = Math.max(0.7, market.costMultiplier - featuredDiscount)

  return Math.max(1, Math.round(recipe.baseFundingCost * modifier))
}

export function getRecipeMarketBuyCost(recipe: ProductionRecipe, market: MarketState) {
  const fabricationCost = getRecipeFundingCost(recipe, market)
  const procurementMarkup = 1.4

  return Math.max(1, Math.round(fabricationCost * procurementMarkup))
}

export function getRecipeMarketCategory(recipeId: string): MarketListingCategory {
  return RECIPE_MARKET_CATEGORY[recipeId] ?? 'equipment'
}

export function getMarketPressureLabel(pressure: MarketPressure) {
  if (pressure === 'discounted') {
    return 'Surplus'
  }

  if (pressure === 'tight') {
    return 'Shortage'
  }

  return 'Stable'
}

export function rollNextMarket(week: number, rng: () => number): MarketState {
  const featuredRecipe =
    productionCatalog[randInt(rng, 0, Math.max(productionCatalog.length - 1, 0))] ??
    productionCatalog[0]
  const pressureRoll = randInt(rng, 0, 2)
  const pressure: MarketPressure =
    pressureRoll === 0 ? 'discounted' : pressureRoll === 2 ? 'tight' : 'stable'
  const costMultiplier = pressure === 'discounted' ? 0.9 : pressure === 'tight' ? 1.15 : 1

  return {
    week,
    featuredRecipeId: featuredRecipe?.recipeId ?? 'ward-seals',
    pressure,
    costMultiplier,
  }
}
