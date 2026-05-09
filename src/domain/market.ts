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
import { getEquipmentCatalogEntries, type EquipmentSlotKind } from './equipment'
import type { GameState, OperationEvent } from './models'

export type ProcurementTransactionAction = 'buy' | 'sell'
export type ProcurementListingSource = 'recipe' | 'material' | 'direct_equipment'
export type ProcurementAcquisitionClass = 'standard' | 'restricted'
export type ProcurementAccessChannel = 'open_exchange' | 'directorate_special_channel'
export type ProcurementMarketPacketId = 'agency_supplier_roster' | 'gray_market_broker'
export type ProcurementMarketBoundary = 'agency-supplier-roster' | 'settlement-gray-market'
export type ProcurementLegalityAccessMode = 'licensed' | 'covert'
export type ProcurementParticipantChannelType = 'quartermaster' | 'broker'
export type ProcurementLiquidityProfile = 'stable' | 'thin'

export interface ProcurementMarketPacket {
  id: ProcurementMarketPacketId
  label: string
  marketBoundary: ProcurementMarketBoundary
  legalityAccessMode: ProcurementLegalityAccessMode
  participantChannelType: ProcurementParticipantChannelType
  liquidityProfile: ProcurementLiquidityProfile
  availabilityMultiplier: number
  priceMultiplier: number
  knownDistortions: string[]
  available: boolean
  blockedReason?: string
}

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
  marketPacket: ProcurementMarketPacket
  acquisitionClass: ProcurementAcquisitionClass
  accessChannel: ProcurementAccessChannel
  accessLabel: string
  accessDetails: string[]
  accessAvailable: boolean
  accessBlockedReason?: string
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
type SanctionLevel = NonNullable<GameState['legitimacy']>['sanctionLevel']

interface ProcurementMarketPacketDefinition extends Omit<
  ProcurementMarketPacket,
  'available' | 'blockedReason'
> {
  blockedSanctionLevels?: SanctionLevel[]
  blockedReasonTemplate?: string
}

interface ProcurementAccessRule {
  acquisitionClass: ProcurementAcquisitionClass
  accessChannel: ProcurementAccessChannel
  accessLabel: string
  details: string[]
  requiredClearanceLevel?: number
}

const PROCUREMENT_MARKET_PACKET_DEFINITIONS: Record<
  ProcurementMarketPacketId,
  ProcurementMarketPacketDefinition
> = {
  agency_supplier_roster: {
    id: 'agency_supplier_roster',
    label: 'Agency supplier roster',
    marketBoundary: 'agency-supplier-roster',
    legalityAccessMode: 'licensed',
    participantChannelType: 'quartermaster',
    liquidityProfile: 'stable',
    availabilityMultiplier: 1,
    priceMultiplier: 1,
    knownDistortions: ['Standard weekly supplier pressure only.'],
  },
  gray_market_broker: {
    id: 'gray_market_broker',
    label: 'Gray-market broker',
    marketBoundary: 'settlement-gray-market',
    legalityAccessMode: 'covert',
    participantChannelType: 'broker',
    liquidityProfile: 'thin',
    availabilityMultiplier: 0.65,
    priceMultiplier: 1.25,
    knownDistortions: [
      'Thin covert inventory.',
      'Broker premium applied before weekly exchange pressure.',
    ],
    blockedSanctionLevels: ['sanctioned'],
    blockedReasonTemplate:
      'Gray-market broker blocked: sanctioned audit posture prevents covert exchange.',
  },
}

const DIRECT_EQUIPMENT_MARKET_PACKETS: Partial<Record<string, ProcurementMarketPacketId>> = {
  combat_stims: 'gray_market_broker',
}

const DEFAULT_PROCUREMENT_ACCESS = {
  acquisitionClass: 'standard',
  accessChannel: 'open_exchange',
  accessLabel: 'Open exchange',
  details: ['Standard supplier access.'],
} as const satisfies Omit<ProcurementAccessRule, 'requiredClearanceLevel'>

const PROCUREMENT_ACCESS_RULES: Record<string, ProcurementAccessRule> = {
  'gear:advanced_recon_suite': {
    acquisitionClass: 'restricted',
    accessChannel: 'directorate_special_channel',
    accessLabel: 'Directorate special channel',
    details: [
      'Restricted acquisition class.',
      'Requires directorate clearance before supplier release.',
    ],
    requiredClearanceLevel: 2,
  },
}

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

function getSellRatio(pressure: GameState['market']['pressure'], featured: boolean) {
  const baseRatio = pressure === 'tight' ? 0.68 : pressure === 'discounted' ? 0.42 : 0.54

  return Math.min(0.8, baseRatio + (featured ? 0.04 : 0))
}

function getDirectEquipmentBasePrice(
  definition: ReturnType<typeof getEquipmentCatalogEntries>[number]
) {
  const premiumTags = ['anti-spirit', 'containment', 'hazmat', 'surveillance']
  const premiumCount = definition.tags.filter((tag) => premiumTags.includes(tag)).length

  return EQUIPMENT_SLOT_BASE_PRICES[definition.slot] + definition.quality * 4 + premiumCount * 2
}

function getClearanceLevel(game: Pick<GameState, 'agency' | 'clearanceLevel'>) {
  return Math.max(1, Math.trunc(game.agency?.clearanceLevel ?? game.clearanceLevel ?? 1))
}

function getSanctionLevel(game: Pick<GameState, 'legitimacy'>): SanctionLevel {
  return game.legitimacy?.sanctionLevel ?? 'tolerated'
}

function buildMarketPacket(
  packetId: ProcurementMarketPacketId,
  game: Pick<GameState, 'legitimacy'>
): ProcurementMarketPacket {
  const definition = PROCUREMENT_MARKET_PACKET_DEFINITIONS[packetId]
  const sanctionLevel = getSanctionLevel(game)
  const blocked = definition.blockedSanctionLevels?.includes(sanctionLevel) ?? false

  return {
    id: definition.id,
    label: definition.label,
    marketBoundary: definition.marketBoundary,
    legalityAccessMode: definition.legalityAccessMode,
    participantChannelType: definition.participantChannelType,
    liquidityProfile: definition.liquidityProfile,
    availabilityMultiplier: definition.availabilityMultiplier,
    priceMultiplier: definition.priceMultiplier,
    knownDistortions: [...definition.knownDistortions],
    available: !blocked,
    ...(blocked
      ? {
          blockedReason:
            definition.blockedReasonTemplate ??
            `${definition.label} blocked by current access posture.`,
        }
      : {}),
  }
}

function getMarketPacketIdForDefinition(
  definition: ProcurementListingDefinition
): ProcurementMarketPacketId {
  if (definition.source === 'direct_equipment') {
    return DIRECT_EQUIPMENT_MARKET_PACKETS[definition.itemId] ?? 'agency_supplier_roster'
  }

  return 'agency_supplier_roster'
}

export function getProcurementMarketPackets(game: Pick<GameState, 'legitimacy'>) {
  return (Object.keys(PROCUREMENT_MARKET_PACKET_DEFINITIONS) as ProcurementMarketPacketId[])
    .map((packetId) => buildMarketPacket(packetId, game))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function getProcurementMarketPacket(
  game: Pick<GameState, 'legitimacy'>,
  packetId: ProcurementMarketPacketId
) {
  return buildMarketPacket(packetId, game)
}

function assessProcurementAccess(
  definition: ProcurementListingDefinition,
  game: GameState,
  marketPacket: ProcurementMarketPacket
) {
  const rule = PROCUREMENT_ACCESS_RULES[definition.id] ?? DEFAULT_PROCUREMENT_ACCESS
  const clearanceLevel = getClearanceLevel(game)
  const accessDetails = [...marketPacket.knownDistortions, ...rule.details]

  if (typeof rule.requiredClearanceLevel === 'number') {
    accessDetails.push(`Clearance ${rule.requiredClearanceLevel}+ required.`)
  }

  const ruleBlockedReason =
    typeof rule.requiredClearanceLevel === 'number' && clearanceLevel < rule.requiredClearanceLevel
      ? `${rule.accessLabel} locked: requires clearance ${rule.requiredClearanceLevel}; current clearance ${clearanceLevel}.`
      : undefined
  const accessBlockedReason = marketPacket.blockedReason ?? ruleBlockedReason

  return {
    acquisitionClass: rule.acquisitionClass,
    accessChannel: rule.accessChannel,
    accessLabel: rule.accessLabel,
    accessDetails,
    accessAvailable: marketPacket.available && accessBlockedReason === undefined,
    ...(accessBlockedReason ? { accessBlockedReason } : {}),
  }
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

  const materialDefinitions: ProcurementListingDefinition[] = productionMaterialCatalog.map(
    (material) => ({
      id: `material:${material.materialId}`,
      source: 'material',
      itemId: material.materialId,
      itemName: material.name,
      description: material.description,
      category: 'material',
      tags: ['material', material.materialId],
      bundleQuantity: 1,
      materialId: material.materialId,
    })
  )

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

function getBoughtQuantityForListing(
  game: GameState,
  listingId: string,
  marketWeek = game.market.week
) {
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

function getSoldQuantityForListing(
  game: GameState,
  listingId: string,
  marketWeek = game.market.week
) {
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
  game: GameState,
  marketPacket: ProcurementMarketPacket
) {
  const rng = createListingRng(game, definition.id)
  const profile = getAvailabilityProfile(definition.source)
  const featuredBonus =
    definition.recipeId !== undefined && definition.recipeId === game.market.featuredRecipeId
      ? 1
      : 0
  const bundleAvailability = Math.max(
    0,
    profile.baseBundles +
      randInt(rng.next, 0, profile.spread) +
      getPressureAvailabilityDelta(game.market.pressure, definition.source) +
      featuredBonus
  )

  const adjustedBundleAvailability = marketPacket.available
    ? Math.max(0, Math.floor(bundleAvailability * marketPacket.availabilityMultiplier))
    : 0

  return adjustedBundleAvailability * definition.bundleQuantity
}

function getBuyPrice(
  definition: ProcurementListingDefinition,
  game: GameState,
  marketPacket: ProcurementMarketPacket
) {
  const applyPacketPrice = (basePrice: number) =>
    Math.max(1, Math.round(basePrice * marketPacket.priceMultiplier))

  if (definition.recipeId) {
    const recipe = getProductionRecipe(definition.recipeId)
    if (recipe) {
      return applyPacketPrice(getRecipeMarketBuyCost(recipe, game.market))
    }
  }

  if (definition.materialId) {
    const baseUnitPrice = MATERIAL_BASE_UNIT_PRICES[definition.materialId] ?? 6
    return applyPacketPrice(
      Math.max(
        1,
        Math.round(baseUnitPrice * definition.bundleQuantity * game.market.costMultiplier)
      )
    )
  }

  const equipmentDefinition = getEquipmentCatalogEntries().find(
    (equipment) => equipment.id === definition.itemId
  )
  const baseUnitPrice = equipmentDefinition ? getDirectEquipmentBasePrice(equipmentDefinition) : 20

  return applyPacketPrice(
    Math.max(1, Math.round(baseUnitPrice * definition.bundleQuantity * game.market.costMultiplier))
  )
}

function buildListing(
  definition: ProcurementListingDefinition,
  game: GameState
): ProcurementListing {
  const marketPacket = buildMarketPacket(getMarketPacketIdForDefinition(definition), game)
  const buyPrice = getBuyPrice(definition, game, marketPacket)
  const fabricationCost =
    definition.recipeId !== undefined
      ? getProductionRecipe(definition.recipeId)
        ? getRecipeFundingCost(getProductionRecipe(definition.recipeId)!, game.market)
        : undefined
      : undefined
  const featured = definition.recipeId === game.market.featuredRecipeId
  const totalAvailability = getBaseAvailability(definition, game, marketPacket)
  const remainingAvailability = Math.max(
    0,
    totalAvailability -
      getBoughtQuantityForListing(game, definition.id) +
      getSoldQuantityForListing(game, definition.id)
  )
  const sellPrice = Math.max(1, Math.round(buyPrice * getSellRatio(game.market.pressure, featured)))
  const access = assessProcurementAccess(definition, game, marketPacket)

  return {
    ...definition,
    featured,
    fabricationCost,
    buyPrice,
    sellPrice,
    pressureLabel: getMarketPressureLabel(game.market.pressure),
    marketPacket,
    ...access,
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
