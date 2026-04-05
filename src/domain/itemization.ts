import {
  getRecipeFundingCost,
  inventoryItemLabels,
  productionCatalog,
  productionMaterialCatalog,
} from '../data/production'
import {
  getEquipmentCatalogEntries,
  getEquipmentDefinition,
  resolveEquippedItems,
  type EquipmentSlotKind,
} from './equipment'
import { getProcurementListings } from './market'
import { buildMissionRewardPreviewSet } from './missionResults'
import type { CaseInstance, GameState } from './models'

export type ItemizationEntryKind = 'equipment' | 'material'
export type ItemizationSourceChannel =
  | 'inventory'
  | 'equipped'
  | 'fabrication'
  | 'market'
  | 'reward'

export interface ItemizationEntry {
  itemId: string
  label: string
  kind: ItemizationEntryKind
  slot?: EquipmentSlotKind
  tags: string[]
  stock: number
  equipped: number
  queuedOutput: number
  marketListingCount: number
  marketAvailableUnits: number
  bestUnitBuyPrice?: number
  bestUnitSellPrice?: number
  fabricationRecipeId?: string
  fabricationRecipeName?: string
  fabricationDurationWeeks?: number
  fabricationCost?: number
  activeCaseMatchCount: number
  rewardOpportunityCount: number
  sourceChannels: ItemizationSourceChannel[]
}

export interface ItemizationOverview {
  totalStock: number
  stockedItemCount: number
  equipmentStock: number
  materialStock: number
  equippedItemCount: number
  queuedOutputUnits: number
  marketVisibleItemCount: number
  rewardOpportunityItemCount: number
  entries: ItemizationEntry[]
  equipmentEntries: ItemizationEntry[]
  materialEntries: ItemizationEntry[]
  topOperationalItems: ItemizationEntry[]
}

function getOpenCases(game: GameState) {
  return Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved')
}

function buildCaseTagSet(currentCase: CaseInstance) {
  return new Set([...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags])
}

function countTagMatches(caseTagSet: Set<string>, tags: readonly string[]) {
  return tags.reduce((sum, tag) => sum + Number(caseTagSet.has(tag)), 0)
}

function buildMaterialTags(materialId: string) {
  const dependentOutputs = productionCatalog
    .filter((recipe) => Object.prototype.hasOwnProperty.call(recipe.inputMaterials, materialId))
    .flatMap((recipe) => getEquipmentDefinition(recipe.outputItemId)?.tags ?? [])

  return ['material', materialId, ...dependentOutputs]
}

function buildAllItemIds(game: GameState) {
  return [
    ...new Set([
      ...Object.keys(inventoryItemLabels),
      ...Object.keys(game.inventory),
      ...productionMaterialCatalog.map((material) => material.materialId),
      ...getEquipmentCatalogEntries().map((definition) => definition.id),
      ...productionCatalog.map((recipe) => recipe.outputItemId),
      ...getProcurementListings(game).map((listing) => listing.itemId),
    ]),
  ].sort((left, right) => {
    const leftLabel = inventoryItemLabels[left] ?? getEquipmentDefinition(left)?.name ?? left
    const rightLabel = inventoryItemLabels[right] ?? getEquipmentDefinition(right)?.name ?? right

    return leftLabel.localeCompare(rightLabel)
  })
}

function buildMarketPriceSummary(game: GameState) {
  const listings = getProcurementListings(game)

  return new Map(
    [...new Set(listings.map((listing) => listing.itemId))].map((itemId) => {
      const matchingListings = listings.filter((listing) => listing.itemId === itemId)

      return [
        itemId,
        {
          marketListingCount: matchingListings.length,
          marketAvailableUnits: matchingListings.reduce(
            (sum, listing) => sum + listing.remainingAvailability,
            0
          ),
          bestUnitBuyPrice:
            matchingListings.length > 0
              ? Math.min(
                  ...matchingListings.map((listing) => listing.buyPrice / listing.bundleQuantity)
                )
              : undefined,
          bestUnitSellPrice:
            matchingListings.length > 0
              ? Math.max(
                  ...matchingListings.map((listing) => listing.sellPrice / listing.bundleQuantity)
                )
              : undefined,
        },
      ] as const
    })
  )
}

function buildRewardOpportunityCount(game: GameState, itemId: string) {
  return getOpenCases(game).reduce((sum, currentCase) => {
    const preview = buildMissionRewardPreviewSet(currentCase, game.config, game)
    const hasReward = [preview.success, preview.partial].some((reward) =>
      reward.inventoryRewards.some((entry) => entry.itemId === itemId && entry.quantity > 0)
    )

    return sum + Number(hasReward)
  }, 0)
}

function buildActiveCaseMatchCount(
  game: GameState,
  tags: readonly string[],
  kind: ItemizationEntryKind
) {
  if (tags.length === 0) {
    return 0
  }

  return getOpenCases(game).reduce((sum, currentCase) => {
    const caseTags = buildCaseTagSet(currentCase)
    const tagMatches = countTagMatches(caseTags, tags)

    if (kind === 'equipment') {
      return sum + Number(tagMatches > 0)
    }

    return sum + Number(tagMatches >= 2)
  }, 0)
}

function buildQueuedOutputCount(game: GameState, itemId: string) {
  return game.productionQueue.reduce(
    (sum, entry) => sum + (entry.outputItemId === itemId ? entry.outputQuantity : 0),
    0
  )
}

function buildEquippedCount(game: GameState, itemId: string) {
  return Object.values(game.agents)
    .filter((agent) => agent.status !== 'dead')
    .flatMap((agent) => resolveEquippedItems(agent))
    .filter((item) => item.id === itemId).length
}

export function buildItemizationOverview(game: GameState): ItemizationOverview {
  const materialIds = new Set(productionMaterialCatalog.map((material) => material.materialId))
  const equipmentDefinitions = new Map(
    getEquipmentCatalogEntries().map((definition) => [definition.id, definition] as const)
  )
  const marketSummary = buildMarketPriceSummary(game)

  const entries = buildAllItemIds(game).map((itemId) => {
    const equipmentDefinition = equipmentDefinitions.get(itemId)
    const isMaterial = materialIds.has(itemId)
    const kind: ItemizationEntryKind = isMaterial ? 'material' : 'equipment'
    const market = marketSummary.get(itemId)
    const fabricationRecipe = productionCatalog.find((recipe) => recipe.outputItemId === itemId)
    const tags = equipmentDefinition ? [...equipmentDefinition.tags] : buildMaterialTags(itemId)
    const stock = Math.max(0, Math.trunc(game.inventory[itemId] ?? 0))
    const equipped = kind === 'equipment' ? buildEquippedCount(game, itemId) : 0
    const queuedOutput = buildQueuedOutputCount(game, itemId)
    const rewardOpportunityCount = buildRewardOpportunityCount(game, itemId)
    const activeCaseMatchCount = buildActiveCaseMatchCount(game, tags, kind)
    const sourceChannels: ItemizationSourceChannel[] = []

    if (stock > 0) {
      sourceChannels.push('inventory')
    }
    if (equipped > 0) {
      sourceChannels.push('equipped')
    }
    if (fabricationRecipe) {
      sourceChannels.push('fabrication')
    }
    if ((market?.marketListingCount ?? 0) > 0) {
      sourceChannels.push('market')
    }
    if (rewardOpportunityCount > 0) {
      sourceChannels.push('reward')
    }

    return {
      itemId,
      label: inventoryItemLabels[itemId] ?? equipmentDefinition?.name ?? itemId,
      kind,
      slot: equipmentDefinition?.slot,
      tags,
      stock,
      equipped,
      queuedOutput,
      marketListingCount: market?.marketListingCount ?? 0,
      marketAvailableUnits: market?.marketAvailableUnits ?? 0,
      bestUnitBuyPrice:
        market?.bestUnitBuyPrice !== undefined
          ? Number(market.bestUnitBuyPrice.toFixed(2))
          : undefined,
      bestUnitSellPrice:
        market?.bestUnitSellPrice !== undefined
          ? Number(market.bestUnitSellPrice.toFixed(2))
          : undefined,
      fabricationRecipeId: fabricationRecipe?.recipeId,
      fabricationRecipeName: fabricationRecipe?.name,
      fabricationDurationWeeks: fabricationRecipe?.durationWeeks,
      fabricationCost: fabricationRecipe
        ? getRecipeFundingCost(fabricationRecipe, game.market)
        : undefined,
      activeCaseMatchCount,
      rewardOpportunityCount,
      sourceChannels,
    } satisfies ItemizationEntry
  })

  const sortedEntries = entries.sort((left, right) => {
    const leftOperationalScore =
      left.activeCaseMatchCount * 3 +
      left.rewardOpportunityCount * 2 +
      left.equipped +
      left.queuedOutput
    const rightOperationalScore =
      right.activeCaseMatchCount * 3 +
      right.rewardOpportunityCount * 2 +
      right.equipped +
      right.queuedOutput

    return (
      rightOperationalScore - leftOperationalScore ||
      right.stock - left.stock ||
      left.label.localeCompare(right.label)
    )
  })

  return {
    totalStock: sortedEntries.reduce((sum, entry) => sum + entry.stock, 0),
    stockedItemCount: sortedEntries.filter((entry) => entry.stock > 0).length,
    equipmentStock: sortedEntries
      .filter((entry) => entry.kind === 'equipment')
      .reduce((sum, entry) => sum + entry.stock, 0),
    materialStock: sortedEntries
      .filter((entry) => entry.kind === 'material')
      .reduce((sum, entry) => sum + entry.stock, 0),
    equippedItemCount: sortedEntries.reduce((sum, entry) => sum + entry.equipped, 0),
    queuedOutputUnits: sortedEntries.reduce((sum, entry) => sum + entry.queuedOutput, 0),
    marketVisibleItemCount: sortedEntries.filter((entry) => entry.marketListingCount > 0).length,
    rewardOpportunityItemCount: sortedEntries.filter((entry) => entry.rewardOpportunityCount > 0)
      .length,
    entries: sortedEntries,
    equipmentEntries: sortedEntries.filter((entry) => entry.kind === 'equipment'),
    materialEntries: sortedEntries.filter((entry) => entry.kind === 'material'),
    topOperationalItems: sortedEntries
      .filter(
        (entry) =>
          entry.activeCaseMatchCount > 0 ||
          entry.rewardOpportunityCount > 0 ||
          entry.equipped > 0 ||
          entry.queuedOutput > 0
      )
      .slice(0, 8),
  }
}
