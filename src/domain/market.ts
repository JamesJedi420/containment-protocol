import {
  getMarketPressureLabel,
  getProductionRecipe,
  getRecipeFundingCost,
  getRecipeMarketBuyCost,
  getRecipeMarketCategory,
  productionCatalog,
  productionMaterialCatalog,
  type MarketListingCategory,
} from '../data/production'
import { createSeededRng, normalizeSeed, randInt } from './math'
import {
  getEquipmentCatalogEntries,
  type EquipmentSlotKind,
} from './equipment'
import type { GameState, OperationEvent } from './models'

export type ProcurementTransactionAction = 'buy' | 'sell'
export type ProcurementListingSource = 'recipe' | 'material' | 'direct_equipment'

export interface ProcurementListing {
  id: string
  source: ProcurementListingSource
  itemId: string
  itemName: string
  description: string
  category: MarketListingCategory
  tags: string[]
  recipeId?: string
  materialId?: string
  featured: boolean
  bundleQuantity: number
  fabricationCost?: number
  buyPrice: number
  sellPrice: number
  pressureLabel: string
  totalAvailability: number
  remainingAvailability: number
  availableBundles: number
  inventoryStock: number
}

export interface ProcurementTransactionView {
  eventId: string
  transactionId: string
  week: number
  marketWeek: number
  action: ProcurementTransactionAction
  listingId: string
  itemId: string
  itemName: string
  category: MarketListingCategory
  quantity: number
  bundleCount: number
  unitPrice: number
  totalPrice: number
  remainingAvailability: number
  timestamp: string
}

interface ProcurementListingDefinition {
  id: string
  source: ProcurementListingSource
  itemId: string
  itemName: string
  description: string
  category: MarketListingCategory
  tags: string[]
  bundleQuantity: number
  recipeId?: string
  materialId?: string
}

type MarketTransactionEvent = Extract<OperationEvent, { type: 'market.transaction_recorded' }>

const MATERIAL_BASE_UNIT_PRICES: Record<string, number> = {
  electronic_parts: 7,
  medical_supplies: 6,
  occult_reagents: 8,
  warding_resin: 9,
  ballistic_supplies: 5,
}

const EQUIPMENT_SLOT_BASE_PRICES: Record<EquipmentSlotKind, number> = {
  primary: 30,
  secondary: 24,
  armor: 28,
  headgear: 20,
  utility1: 18,
  utility2: 18,
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return normalizeSeed(hash >>> 0)
}

function createListingRng(game: GameState, listingId: string) {
  return createSeededRng(
    hashString(
      `${game.rngSeed}:${game.market.week}:${game.market.pressure}:${game.market.featuredRecipeId}:${listingId}`
    )
  )
}

function getAvailabilityProfile(source: ProcurementListingSource) {
  if (source === 'material') {
    return { baseBundles: 5, spread: 4 }
  }

  if (source === 'recipe') {
    return { baseBundles: 2, spread: 2 }
  }

  return { baseBundles: 1, spread: 2 }
}

function getPressureAvailabilityDelta(
  pressure: GameState['market']['pressure'],
  source: ProcurementListingSource
) {
  if (pressure === 'discounted') {
    return source === 'material' ? 2 : 1
  }

  if (pressure === 'tight') {
    return source === 'material' ? -2 : -1
  }

  return 0
}

function getSellRatio(
  pressure: GameState['market']['pressure'],
  featured: boolean
) {
  const baseRatio =
    pressure === 'tight' ? 0.68 : pressure === 'discounted' ? 0.42 : 0.54

  return Math.min(0.8, baseRatio + (featured ? 0.04 : 0))
}

function getDirectEquipmentBasePrice(definition: ReturnType<typeof getEquipmentCatalogEntries>[number]) {
  const premiumTags = ['anti-spirit', 'containment', 'hazmat', 'surveillance']
  const premiumCount = definition.tags.filter((tag) => premiumTags.includes(tag)).length

  return (
    EQUIPMENT_SLOT_BASE_PRICES[definition.slot] +
    definition.quality * 4 +
    premiumCount * 2
  )
}

function getListingDefinitions() {
  const recipeOutputItemIds = new Set(productionCatalog.map((recipe) => recipe.outputItemId))
  const recipeDefinitions: ProcurementListingDefinition[] = productionCatalog.map((recipe) => {
    const definition = getEquipmentCatalogEntries().find((item) => item.id === recipe.outputItemId)

    return {
      id: recipe.recipeId,
      source: 'recipe',
      itemId: recipe.outputItemId,
      itemName: recipe.outputItemName,
      description: recipe.description,
      category: getRecipeMarketCategory(recipe.recipeId),
      tags: definition?.tags ?? [],
      bundleQuantity: recipe.outputQuantity,
      recipeId: recipe.recipeId,
    }
  })

  const materialDefinitions: ProcurementListingDefinition[] = productionMaterialCatalog.map((material) => ({
    id: `material:${material.materialId}`,
    source: 'material',
    itemId: material.materialId,
    itemName: material.name,
    description: material.description,
    category: 'material',
    tags: ['material', material.materialId],
    bundleQuantity: 1,
    materialId: material.materialId,
  }))

  const directEquipmentDefinitions: ProcurementListingDefinition[] = getEquipmentCatalogEntries()
    .filter((definition) => !recipeOutputItemIds.has(definition.id))
    .map((definition) => ({
      id: `gear:${definition.id}`,
      source: 'direct_equipment',
      itemId: definition.id,
      itemName: definition.name,
      description: `${definition.name} field procurement package.`,
      category: 'equipment',
      tags: definition.tags,
      bundleQuantity: 1,
    }))

  return [...recipeDefinitions, ...materialDefinitions, ...directEquipmentDefinitions].sort(
    (left, right) => left.itemName.localeCompare(right.itemName)
  )
}

function isMarketTransactionEvent(event: OperationEvent): event is MarketTransactionEvent {
  return event.type === 'market.transaction_recorded'
}

function getBoughtQuantityForListing(game: GameState, listingId: string, marketWeek = game.market.week) {
  return game.events
    .filter((event) => isMarketTransactionEvent(event))
    .filter(
      (event) =>
        event.payload.marketWeek === marketWeek &&
        event.payload.listingId === listingId &&
        event.payload.action === 'buy'
    )
    .reduce((sum, event) => sum + event.payload.quantity, 0)
}

function getSoldQuantityForListing(game: GameState, listingId: string, marketWeek = game.market.week) {
  return game.events
    .filter((event) => isMarketTransactionEvent(event))
    .filter(
      (event) =>
        event.payload.marketWeek === marketWeek &&
        event.payload.listingId === listingId &&
        event.payload.action === 'sell'
    )
    .reduce((sum, event) => sum + event.payload.quantity, 0)
}

function getBaseAvailability(
  definition: ProcurementListingDefinition,
  game: GameState
) {
  const rng = createListingRng(game, definition.id)
  const profile = getAvailabilityProfile(definition.source)
  const featuredBonus =
    definition.recipeId !== undefined && definition.recipeId === game.market.featuredRecipeId ? 1 : 0
  const bundleAvailability = Math.max(
    0,
    profile.baseBundles +
      randInt(rng.next, 0, profile.spread) +
      getPressureAvailabilityDelta(game.market.pressure, definition.source) +
      featuredBonus
  )

  return bundleAvailability * definition.bundleQuantity
}

function getBuyPrice(definition: ProcurementListingDefinition, game: GameState) {
  if (definition.recipeId) {
    const recipe = getProductionRecipe(definition.recipeId)
    if (recipe) {
      return getRecipeMarketBuyCost(recipe, game.market)
    }
  }

  if (definition.materialId) {
    const baseUnitPrice = MATERIAL_BASE_UNIT_PRICES[definition.materialId] ?? 6
    return Math.max(1, Math.round(baseUnitPrice * definition.bundleQuantity * game.market.costMultiplier))
  }

  const equipmentDefinition = getEquipmentCatalogEntries().find(
    (equipment) => equipment.id === definition.itemId
  )
  const baseUnitPrice = equipmentDefinition ? getDirectEquipmentBasePrice(equipmentDefinition) : 20

  return Math.max(1, Math.round(baseUnitPrice * definition.bundleQuantity * game.market.costMultiplier))
}

function buildListing(definition: ProcurementListingDefinition, game: GameState): ProcurementListing {
  const buyPrice = getBuyPrice(definition, game)
  const fabricationCost =
    definition.recipeId !== undefined
      ? getProductionRecipe(definition.recipeId)
        ? getRecipeFundingCost(getProductionRecipe(definition.recipeId)!, game.market)
        : undefined
      : undefined
  const featured = definition.recipeId === game.market.featuredRecipeId
  const totalAvailability = getBaseAvailability(definition, game)
  const remainingAvailability = Math.max(
    0,
    totalAvailability -
      getBoughtQuantityForListing(game, definition.id) +
      getSoldQuantityForListing(game, definition.id)
  )
  const sellPrice = Math.max(1, Math.round(buyPrice * getSellRatio(game.market.pressure, featured)))

  return {
    ...definition,
    featured,
    fabricationCost,
    buyPrice,
    sellPrice,
    pressureLabel: getMarketPressureLabel(game.market.pressure),
    totalAvailability,
    remainingAvailability,
    availableBundles: Math.floor(remainingAvailability / definition.bundleQuantity),
    inventoryStock: game.inventory[definition.itemId] ?? 0,
  }
}

export function getProcurementListings(game: GameState) {
  return getListingDefinitions().map((definition) => buildListing(definition, game))
}

export function getProcurementListing(game: GameState, listingId: string) {
  return getProcurementListings(game).find((listing) => listing.id === listingId)
}

export function getCurrentMarketTransactions(
  game: GameState,
  marketWeek = game.market.week
): ProcurementTransactionView[] {
  return game.events
    .filter((event) => isMarketTransactionEvent(event))
    .filter((event) => event.payload.marketWeek === marketWeek)
    .map((event) => ({
      eventId: event.id,
      transactionId: event.payload.transactionId,
      week: event.payload.week,
      marketWeek: event.payload.marketWeek,
      action: event.payload.action,
      listingId: event.payload.listingId,
      itemId: event.payload.itemId,
      itemName: event.payload.itemName,
      category: event.payload.category,
      quantity: event.payload.quantity,
      bundleCount: event.payload.bundleCount,
      unitPrice: event.payload.unitPrice,
      totalPrice: event.payload.totalPrice,
      remainingAvailability: event.payload.remainingAvailability,
      timestamp: event.timestamp,
    }))
    .sort(
      (left, right) =>
        right.timestamp.localeCompare(left.timestamp) ||
        right.transactionId.localeCompare(left.transactionId)
    )
}

export function getAvailableMarketCategories() {
  return ['equipment', 'component', 'material'] as const
}

export function getMarketItemLabel(game: GameState, listingId: string) {
  return getProcurementListing(game, listingId)?.itemName ?? listingId
}
