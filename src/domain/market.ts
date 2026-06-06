import {
  getMarketPressureLabel,
  getProductionMaterial,
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
  getLicensedHandlingRequirement as catalogItemRequiresLicensedHandling,
  type EquipmentSlotKind,
} from './equipment'
import type { MarketTransactionListingResourceStatus } from './events/types'
import type { GameState, MarketPressure, MarketState, OperationEvent } from './models'
import { getCanonicalFundingState, sumInventoryStock } from './funding'
import {
  assessCompromisedAuthorityProcurementDiversion,
  type ProcurementCorruptionRoutingReason,
} from './sim/compromisedAuthority'
import { FUNDING_CALIBRATION } from './sim/calibration'

export type ProcurementTransactionAction = 'buy' | 'sell' | 'favor_exchange' | 'order' | 'fulfill'
export type ProcurementListingSource = 'recipe' | 'material' | 'direct_equipment'
export type ProcurementAcquisitionClass = 'standard' | 'restricted' | 'rare'
export type ProcurementAccessChannel =
  | 'open_exchange'
  | 'directorate_special_channel'
  | 'faction_favor_exchange'
export type ProcurementMarketPacketId = 'agency_supplier_roster' | 'gray_market_broker'
export type ProcurementMarketBoundary = 'agency-supplier-roster' | 'settlement-gray-market'
export type ProcurementLegalityAccessMode = 'licensed' | 'covert'
export type ProcurementParticipantChannelType = 'quartermaster' | 'broker'
export type ProcurementLiquidityProfile = 'stable' | 'thin'
export type ProcurementResourceClass =
  | 'supplier_attention_slot'
  | 'reagent_stock'
  | 'licensed_handling_capacity'
export type ProcurementAllocationUrgency = 'standard' | 'contingency'
export type ProcurementSubstitutionStatus = 'none' | 'degraded_substitute'

/** Weeks after acknowledgement before licensed-handling doctrine must be re-attested (procurement permit slice). */
export const LICENSED_HANDLING_ATTESTATION_TTL_WEEKS = 2

export interface ProcurementAllocationPacket {
  allocationId: string
  resourceClass: ProcurementResourceClass
  source: string
  sourceLabel: string
  destinationUse: string
  destinationLabel: string
  urgency: ProcurementAllocationUrgency
  expectedBenefit: string
  priority: number
  delayWeeks: number
  displacedAlternativeUse?: string
  substitutionStatus: ProcurementSubstitutionStatus
  substitutionSummary?: string
}

export interface ProcurementSubstitutionOption {
  status: 'available'
  source: ProcurementMarketPacketId
  sourceLabel: string
  delayWeeks: number
  priceMultiplier: number
  unitPrice: number
  summary: string
}

export interface ProcurementAllocationStatus {
  resourceClass: ProcurementResourceClass
  source: string
  sourceLabel: string
  capacity: number
  committed: number
  available: number
  required: number
  purchaseAvailable: boolean
  state: 'available' | 'committed_elsewhere' | 'substituted' | 'attestation_stale'
  allocations: ProcurementAllocationPacket[]
  displacedAlternativeUse?: string
  blockerReason?: string
  substitution?: ProcurementSubstitutionOption
}

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
  allocationStatus: ProcurementAllocationStatus
  resourceStatuses: ProcurementAllocationStatus[]
  acquisitionClass: ProcurementAcquisitionClass
  accessChannel: ProcurementAccessChannel
  accessLabel: string
  accessDetails: string[]
  accessAvailable: boolean
  accessBlockedReason?: string
  cashPurchaseAllowed: boolean
  favorRedeemAvailable: boolean
  favorExchange?: FactionFavorExchangeProcurementRule
  /** SPE-2319: supplier lead time when acquisition uses procurement backlog instead of instant exchange. */
  delayedFulfillmentWeeks?: number
  totalAvailability: number
  remainingAvailability: number
  availableBundles: number
  inventoryStock: number
  shortagePressureDetail?: ProcurementShortagePressureDetail
  corruptionRoutingDetail?: ProcurementCorruptionRoutingDetail
}

export interface ProcurementCorruptionRoutingDetail {
  active: boolean
  reasons: ProcurementCorruptionRoutingReason[]
  availabilityPenaltyBundles: number
  officialRole?: string
  benefittingFactionId?: string
}

export type ProcurementShortagePressureReason = 'high-agency-stock' | 'funding-strain'

export interface ProcurementShortagePressureAssessment {
  active: boolean
  reasons: ProcurementShortagePressureReason[]
}

export interface ProcurementShortagePressureDetail {
  active: boolean
  reasons: ProcurementShortagePressureReason[]
  availabilityPenaltyBundles: number
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
  allocation?: ProcurementAllocationPacket
  allocations?: ProcurementAllocationPacket[]
  timestamp: string
  listingResourceStatuses?: readonly MarketTransactionListingResourceStatus[]
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
  inputMaterials?: Record<string, number>
}

type MarketTransactionEvent = Extract<OperationEvent, { type: 'market.transaction_recorded' }>
type SanctionLevel = NonNullable<GameState['legitimacy']>['sanctionLevel']

const SUPPLIER_ATTENTION_CAPACITY: Record<ProcurementMarketPacketId, number> = {
  agency_supplier_roster: 1,
  gray_market_broker: 1,
}

const DEGRADED_SUBSTITUTE_PRICE_MULTIPLIER = 1.35
const DEGRADED_SUBSTITUTE_DELAY_WEEKS = 1
const REAGENT_STOCK_MATERIAL_ID = 'occult_reagents'
const REAGENT_STOCK_CAPACITY = 1
const DEGRADED_REAGENT_SUBSTITUTE_PRICE_MULTIPLIER = 1.25
const DEGRADED_REAGENT_SUBSTITUTE_DELAY_WEEKS = 1
const LICENSED_HANDLING_SOURCE_ID = 'licensed_handling_desk'
const LICENSED_HANDLING_SOURCE_LABEL = 'Licensed handling desk'
const LICENSED_HANDLING_CAPACITY = 1

/** Missing save field: assume week 1 attestation so long-running saves surface stale doctrine once migrated. */
export function getLicensedHandlingAttestationWeekBaselined(
  game: Pick<GameState, 'week' | 'market'>
) {
  return game.market.licensedHandlingAttestationWeek ?? 1
}

export function isLicensedHandlingAttestationStale(game: Pick<GameState, 'week' | 'market'>) {
  return (
    game.week >
    getLicensedHandlingAttestationWeekBaselined(game) + LICENSED_HANDLING_ATTESTATION_TTL_WEEKS
  )
}

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
  delayedFulfillmentWeeks?: number
}

export interface FactionFavorExchangeProcurementRule {
  factionId: string
  favorId: string
  exchangeLabel: string
  details: string[]
}

export interface FactionFavorExchangeAssessment {
  listingId: string
  eligible: boolean
  reasonCode: 'favor-exchange-ready' | 'favor-exchange-missing' | 'not-favor-exchange-listing'
  detail: string
}

const FAVOR_EXCHANGE_PROCUREMENT_RULES: Record<string, FactionFavorExchangeProcurementRule> = {
  'gear:containment_staff': {
    factionId: 'corporate_supply',
    favorId: 'corporate-supply-salvage-credit',
    exchangeLabel: 'Salvage reclamation favor',
    details: [
      'Rare containment gear circulates only through supplier salvage credit.',
      'Cash purchase is blocked; redeem the open corporate_supply favor instead.',
    ],
  },
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
  'gear:field_plate': {
    acquisitionClass: 'standard',
    accessChannel: 'open_exchange',
    accessLabel: 'Supplier delivery order',
    details: [
      'Replacement field armor restores lost protection without expanding roster capacity.',
      'Funding is charged when the order is placed; inventory arrives after supplier lead time.',
    ],
    delayedFulfillmentWeeks: FUNDING_CALIBRATION.procurementDelayedFulfillmentWeeks,
  },
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
  'gear:containment_staff': {
    acquisitionClass: 'rare',
    accessChannel: 'faction_favor_exchange',
    accessLabel: 'Faction favor exchange',
    details: FAVOR_EXCHANGE_PROCUREMENT_RULES['gear:containment_staff']!.details,
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

/** Inputs needed to evaluate sanction blocks and crisis waiver overrides on procurement packets. */
export type ProcurementMarketPacketContext = Pick<
  GameState,
  'legitimacy' | 'week' | 'emergencyGrayMarketWaiverWeek'
>

export function hasActiveEmergencyGrayMarketWaiver(
  game: Pick<GameState, 'week' | 'emergencyGrayMarketWaiverWeek'>
): boolean {
  return game.emergencyGrayMarketWaiverWeek === game.week
}

function buildMarketPacket(
  packetId: ProcurementMarketPacketId,
  game: ProcurementMarketPacketContext
): ProcurementMarketPacket {
  const definition = PROCUREMENT_MARKET_PACKET_DEFINITIONS[packetId]
  const sanctionLevel = getSanctionLevel(game)
  let blocked = definition.blockedSanctionLevels?.includes(sanctionLevel) ?? false

  if (
    blocked &&
    packetId === 'gray_market_broker' &&
    sanctionLevel === 'sanctioned' &&
    hasActiveEmergencyGrayMarketWaiver(game)
  ) {
    blocked = false
  }

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

export function getProcurementMarketPackets(game: ProcurementMarketPacketContext) {
  return (Object.keys(PROCUREMENT_MARKET_PACKET_DEFINITIONS) as ProcurementMarketPacketId[])
    .map((packetId) => buildMarketPacket(packetId, game))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function getProcurementMarketPacket(
  game: ProcurementMarketPacketContext,
  packetId: ProcurementMarketPacketId
) {
  return buildMarketPacket(packetId, game)
}

function hasOpenFactionFavor(
  game: Pick<GameState, 'factions'>,
  factionId: string,
  favorId: string
) {
  const runtime = game.factions?.[factionId]
  return (runtime?.availableFavors ?? []).some((favor) => favor.id === favorId)
}

export function getFactionFavorExchangeProcurementRule(listingId: string) {
  return FAVOR_EXCHANGE_PROCUREMENT_RULES[listingId]
}

export function assessFactionFavorExchangeProcurement(
  game: Pick<GameState, 'factions'>,
  listingId: string
): FactionFavorExchangeAssessment {
  const rule = getFactionFavorExchangeProcurementRule(listingId)
  if (!rule) {
    return {
      listingId,
      eligible: false,
      reasonCode: 'not-favor-exchange-listing',
      detail: 'Listing is not configured for faction favor exchange.',
    }
  }

  if (!hasOpenFactionFavor(game, rule.factionId, rule.favorId)) {
    return {
      listingId,
      eligible: false,
      reasonCode: 'favor-exchange-missing',
      detail: `${rule.exchangeLabel} required from ${rule.factionId}; no open favor is available.`,
    }
  }

  return {
    listingId,
    eligible: true,
    reasonCode: 'favor-exchange-ready',
    detail: `${rule.exchangeLabel} from ${rule.factionId} can redeem this listing without spending funding.`,
  }
}

function assessProcurementAccess(
  definition: ProcurementListingDefinition,
  game: GameState,
  marketPacket: ProcurementMarketPacket
) {
  const rule = PROCUREMENT_ACCESS_RULES[definition.id] ?? DEFAULT_PROCUREMENT_ACCESS
  const favorExchange = getFactionFavorExchangeProcurementRule(definition.id)
  const clearanceLevel = getClearanceLevel(game)
  const accessDetails = [...marketPacket.knownDistortions, ...rule.details]

  if (typeof rule.requiredClearanceLevel === 'number') {
    accessDetails.push(`Clearance ${rule.requiredClearanceLevel}+ required.`)
  }

  if (favorExchange) {
    const favorAssessment = assessFactionFavorExchangeProcurement(game, definition.id)
    accessDetails.push(favorAssessment.detail)
  }

  const clearanceBlocked =
    typeof rule.requiredClearanceLevel === 'number' && clearanceLevel < rule.requiredClearanceLevel
  const accessBlockedReason = clearanceBlocked
    ? `${rule.accessLabel} locked: requires clearance ${rule.requiredClearanceLevel}; current clearance ${clearanceLevel}.`
    : marketPacket.blockedReason
  const cashPurchaseAllowed = rule.accessChannel !== 'faction_favor_exchange'
  const channelAvailable = marketPacket.available && accessBlockedReason === undefined

  return {
    acquisitionClass: rule.acquisitionClass,
    accessChannel: rule.accessChannel,
    accessLabel: rule.accessLabel,
    accessDetails,
    cashPurchaseAllowed,
    ...(favorExchange ? { favorExchange } : {}),
    accessAvailable: cashPurchaseAllowed && channelAvailable,
    favorRedeemAvailable: Boolean(favorExchange && channelAvailable),
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
      inputMaterials: recipe.inputMaterials,
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

/** Buy/sell quantities per listing for one market week, from a single event-log pass. */
interface ListingTransactionTotals {
  boughtByListingId: Record<string, number>
  soldByListingId: Record<string, number>
}

function getListingTransactionTotalsForWeek(
  events: GameState['events'],
  marketWeek: number
): ListingTransactionTotals {
  const boughtByListingId: Record<string, number> = {}
  const soldByListingId: Record<string, number> = {}

  for (const event of events) {
    if (!isMarketTransactionEvent(event) || event.payload.marketWeek !== marketWeek) {
      continue
    }

    const listingId = event.payload.listingId
    const quantity = event.payload.quantity

    switch (event.payload.action) {
      case 'buy':
      case 'favor_exchange':
        boughtByListingId[listingId] = (boughtByListingId[listingId] ?? 0) + quantity
        break
      case 'sell':
        soldByListingId[listingId] = (soldByListingId[listingId] ?? 0) + quantity
        break
      default: {
        const _exhaustive: never = event.payload.action
        void _exhaustive
        break
      }
    }
  }

  return { boughtByListingId, soldByListingId }
}

function getCurrentSupplierAttentionAllocations(
  game: GameState,
  marketWeek = game.market.week
): ProcurementAllocationPacket[] {
  return game.events
    .filter((event) => isMarketTransactionEvent(event))
    .filter(
      (event) =>
        (event.payload.action === 'buy' || event.payload.action === 'favor_exchange') &&
        event.payload.marketWeek === marketWeek
    )
    .flatMap((event) => getMarketTransactionAllocationPackets(event))
    .filter((allocation) => allocation.resourceClass === 'supplier_attention_slot')
    .sort((left, right) => left.allocationId.localeCompare(right.allocationId))
}

export function getProcurementAllocations(game: GameState, marketWeek = game.market.week) {
  return [
    ...getCurrentSupplierAttentionAllocations(game, marketWeek),
    ...getCurrentReagentStockAllocations(game, REAGENT_STOCK_MATERIAL_ID, marketWeek),
    ...getCurrentLicensedHandlingAllocations(game, marketWeek),
  ].sort((left, right) => left.allocationId.localeCompare(right.allocationId))
}

function getMarketTransactionAllocationPackets(event: MarketTransactionEvent) {
  if (event.payload.allocations && event.payload.allocations.length > 0) {
    return event.payload.allocations
  }

  return event.payload.allocation ? [event.payload.allocation] : []
}

function getSupplierAttentionCapacity(packetId: ProcurementMarketPacketId) {
  return SUPPLIER_ATTENTION_CAPACITY[packetId] ?? 0
}

function createOpenAllocationStatus(
  packet: ProcurementMarketPacket,
  allocations: ProcurementAllocationPacket[]
): ProcurementAllocationStatus {
  const packetAllocations = allocations.filter((allocation) => allocation.source === packet.id)
  const capacity = getSupplierAttentionCapacity(packet.id)
  const available = Math.max(0, capacity - packetAllocations.length)

  return {
    resourceClass: 'supplier_attention_slot',
    source: packet.id,
    sourceLabel: packet.label,
    capacity,
    committed: packetAllocations.length,
    available,
    required: 1,
    purchaseAvailable: packet.available && available >= 1,
    state: packet.available && available >= 1 ? 'available' : 'committed_elsewhere',
    allocations: packetAllocations,
    ...(available < 1
      ? {
          displacedAlternativeUse: packetAllocations[0]?.destinationLabel ?? packet.label,
          blockerReason: `${packet.label} attention committed to ${packetAllocations[0]?.destinationLabel ?? 'another request'} this market week.`,
        }
      : {}),
  }
}

function getReagentMaterialName(materialId: string) {
  return getProductionMaterial(materialId)?.name ?? materialId
}

function getCurrentReagentStockAllocations(
  game: GameState,
  materialId: string,
  marketWeek = game.market.week
): ProcurementAllocationPacket[] {
  const materialName = getReagentMaterialName(materialId)
  const fabricationAllocations = game.productionQueue.flatMap((entry) => {
    const material = entry.inputMaterials?.find((candidate) => candidate.materialId === materialId)

    if (!material) {
      return []
    }

    return [
      {
        allocationId: `${entry.id}:reagent-stock:${materialId}`,
        resourceClass: 'reagent_stock',
        source: materialId,
        sourceLabel: materialName,
        destinationUse: `fabrication:${entry.recipeId}`,
        destinationLabel: entry.recipeName,
        urgency: 'standard',
        expectedBenefit: `${material.quantity}x ${material.materialName} committed to fabrication`,
        priority: 1,
        delayWeeks: Math.max(0, Math.trunc(entry.remainingWeeks)),
        substitutionStatus: 'none',
      } satisfies ProcurementAllocationPacket,
    ]
  })
  const marketAllocations = game.events
    .filter((event) => isMarketTransactionEvent(event))
    .filter(
      (event) =>
        (event.payload.action === 'buy' || event.payload.action === 'favor_exchange') &&
        event.payload.marketWeek === marketWeek
    )
    .flatMap((event) => getMarketTransactionAllocationPackets(event))
    .filter(
      (allocation) =>
        allocation.resourceClass === 'reagent_stock' && allocation.source === materialId
    )

  return [...fabricationAllocations, ...marketAllocations].sort((left, right) =>
    left.allocationId.localeCompare(right.allocationId)
  )
}

function getReagentRequirement(definition: ProcurementListingDefinition) {
  return definition.inputMaterials?.[REAGENT_STOCK_MATERIAL_ID] ?? 0
}

function createReagentAllocationStatus(
  definition: ProcurementListingDefinition,
  game: GameState,
  baseBuyPrice: number
): ProcurementAllocationStatus | undefined {
  const required = getReagentRequirement(definition)

  if (required <= 0) {
    return undefined
  }

  const sourceLabel = getReagentMaterialName(REAGENT_STOCK_MATERIAL_ID)
  const allocations = getCurrentReagentStockAllocations(game, REAGENT_STOCK_MATERIAL_ID)
  const available = Math.max(0, REAGENT_STOCK_CAPACITY - allocations.length)
  const baseStatus: ProcurementAllocationStatus = {
    resourceClass: 'reagent_stock',
    source: REAGENT_STOCK_MATERIAL_ID,
    sourceLabel,
    capacity: REAGENT_STOCK_CAPACITY,
    committed: allocations.length,
    available,
    required,
    purchaseAvailable: available >= required,
    state: available >= required ? 'available' : 'committed_elsewhere',
    allocations,
    ...(available < required
      ? {
          displacedAlternativeUse: allocations[0]?.destinationLabel ?? sourceLabel,
          blockerReason: `${sourceLabel} stock committed to ${allocations[0]?.destinationLabel ?? 'another reagent use'} this market week.`,
        }
      : {}),
  }

  if (baseStatus.purchaseAvailable || definition.category !== 'equipment') {
    return baseStatus
  }

  const substitution: ProcurementSubstitutionOption = {
    status: 'available',
    source: 'gray_market_broker',
    sourceLabel: 'Synthetic reagent substitute',
    delayWeeks: DEGRADED_REAGENT_SUBSTITUTE_DELAY_WEEKS,
    priceMultiplier: DEGRADED_REAGENT_SUBSTITUTE_PRICE_MULTIPLIER,
    unitPrice: Math.max(1, Math.round(baseBuyPrice * DEGRADED_REAGENT_SUBSTITUTE_PRICE_MULTIPLIER)),
    summary: `Synthetic reagent substitute can cover ${definition.itemName} after ${baseStatus.displacedAlternativeUse ?? sourceLabel} displaced certified reagent stock; +${Math.round((DEGRADED_REAGENT_SUBSTITUTE_PRICE_MULTIPLIER - 1) * 100)}% cost and ${DEGRADED_REAGENT_SUBSTITUTE_DELAY_WEEKS}w handling delay.`,
  }

  return {
    ...baseStatus,
    purchaseAvailable: true,
    state: 'substituted',
    blockerReason: undefined,
    substitution,
  }
}

function getCurrentLicensedHandlingAllocations(
  game: GameState,
  marketWeek = game.market.week
): ProcurementAllocationPacket[] {
  return game.events
    .filter((event) => isMarketTransactionEvent(event))
    .filter(
      (event) =>
        (event.payload.action === 'buy' || event.payload.action === 'favor_exchange') &&
        event.payload.marketWeek === marketWeek
    )
    .flatMap((event) => getMarketTransactionAllocationPackets(event))
    .filter(
      (allocation) =>
        allocation.resourceClass === 'licensed_handling_capacity' &&
        allocation.source === LICENSED_HANDLING_SOURCE_ID
    )
    .sort((left, right) => left.allocationId.localeCompare(right.allocationId))
}

/** Units of licensed-handling desk capacity required (0 or 1), from equipment catalog tags. */
function getLicensedHandlingUnits(definition: ProcurementListingDefinition) {
  return catalogItemRequiresLicensedHandling(definition.itemId) ? 1 : 0
}

function createLicensedHandlingAllocationStatus(
  definition: ProcurementListingDefinition,
  game: GameState
): ProcurementAllocationStatus | undefined {
  const required = getLicensedHandlingUnits(definition)

  if (required <= 0) {
    return undefined
  }

  const allocations = getCurrentLicensedHandlingAllocations(game)
  const available = Math.max(0, LICENSED_HANDLING_CAPACITY - allocations.length)
  const attestationWeek = getLicensedHandlingAttestationWeekBaselined(game)

  if (isLicensedHandlingAttestationStale(game)) {
    return {
      resourceClass: 'licensed_handling_capacity',
      source: LICENSED_HANDLING_SOURCE_ID,
      sourceLabel: LICENSED_HANDLING_SOURCE_LABEL,
      capacity: LICENSED_HANDLING_CAPACITY,
      committed: allocations.length,
      available,
      required,
      purchaseAvailable: false,
      state: 'attestation_stale',
      allocations,
      blockerReason: `${LICENSED_HANDLING_SOURCE_LABEL} doctrine attestation is stale (last acknowledged week ${attestationWeek}). Acknowledge current doctrine on the procurement screen before controlled procurement.`,
    }
  }

  return {
    resourceClass: 'licensed_handling_capacity',
    source: LICENSED_HANDLING_SOURCE_ID,
    sourceLabel: LICENSED_HANDLING_SOURCE_LABEL,
    capacity: LICENSED_HANDLING_CAPACITY,
    committed: allocations.length,
    available,
    required,
    purchaseAvailable: available >= required,
    state: available >= required ? 'available' : 'committed_elsewhere',
    allocations,
    ...(available < required
      ? {
          displacedAlternativeUse:
            allocations[0]?.destinationLabel ?? LICENSED_HANDLING_SOURCE_LABEL,
          blockerReason: `${LICENSED_HANDLING_SOURCE_LABEL} capacity committed to ${allocations[0]?.destinationLabel ?? 'another controlled procurement'} this market week.`,
        }
      : {}),
  }
}

function getDegradedSubstitutionOption(
  definition: ProcurementListingDefinition,
  game: GameState,
  baseBuyPrice: number,
  displacedAlternativeUse: string | undefined,
  allocations: ProcurementAllocationPacket[]
): ProcurementSubstitutionOption | undefined {
  if (definition.source !== 'direct_equipment') {
    return undefined
  }

  const substitutePacket = buildMarketPacket('gray_market_broker', game)
  const substituteStatus = createOpenAllocationStatus(substitutePacket, allocations)

  if (!substitutePacket.available || substituteStatus.available < 1) {
    return undefined
  }

  return {
    status: 'available',
    source: substitutePacket.id,
    sourceLabel: substitutePacket.label,
    delayWeeks: DEGRADED_SUBSTITUTE_DELAY_WEEKS,
    priceMultiplier: DEGRADED_SUBSTITUTE_PRICE_MULTIPLIER,
    unitPrice: Math.max(1, Math.round(baseBuyPrice * DEGRADED_SUBSTITUTE_PRICE_MULTIPLIER)),
    summary: `${substitutePacket.label} can cover ${definition.itemName} after ${displacedAlternativeUse ?? 'the roster slot'} displaced the roster request; +${Math.round((DEGRADED_SUBSTITUTE_PRICE_MULTIPLIER - 1) * 100)}% cost and ${DEGRADED_SUBSTITUTE_DELAY_WEEKS}w handling delay.`,
  }
}

function buildAllocationStatus(
  definition: ProcurementListingDefinition,
  game: GameState,
  packet: ProcurementMarketPacket,
  baseBuyPrice: number
): ProcurementAllocationStatus {
  const allocations = getCurrentSupplierAttentionAllocations(game)
  const status = createOpenAllocationStatus(packet, allocations)

  if (status.purchaseAvailable || !packet.available || packet.id !== 'agency_supplier_roster') {
    return status
  }

  const substitution = getDegradedSubstitutionOption(
    definition,
    game,
    baseBuyPrice,
    status.displacedAlternativeUse,
    allocations
  )

  if (!substitution) {
    return status
  }

  return {
    ...status,
    purchaseAvailable: true,
    state: 'substituted',
    blockerReason: undefined,
    substitution,
  }
}

export function assessProcurementShortagePressure(
  game: Pick<GameState, 'agency' | 'config' | 'funding' | 'week' | 'inventory'>
): ProcurementShortagePressureAssessment {
  const cal = FUNDING_CALIBRATION.procurementShortagePressure
  const reasons: ProcurementShortagePressureReason[] = []

  if (sumInventoryStock(game.inventory) > cal.stockThreshold) {
    reasons.push('high-agency-stock')
  }

  const fundingState = getCanonicalFundingState(game)
  const staleProcurementBacklog = fundingState.procurementBacklog.some(
    (entry) =>
      entry.status === 'pending' &&
      game.week - entry.requestedWeek > FUNDING_CALIBRATION.budgetPressure.staleBacklogWeeks
  )
  if (
    fundingState.budgetPressure >= cal.budgetPressureThreshold ||
    staleProcurementBacklog
  ) {
    reasons.push('funding-strain')
  }

  return {
    active: reasons.length > 0,
    reasons,
  }
}

export function applyShortagePressureToBundleAvailability(
  definition: Pick<ProcurementListingDefinition, 'id'>,
  game: Pick<GameState, 'agency' | 'config' | 'funding' | 'week' | 'inventory'>,
  bundleAvailability: number
): number {
  const cal = FUNDING_CALIBRATION.procurementShortagePressure

  if (definition.id !== cal.listingId) {
    return bundleAvailability
  }

  const assessment = assessProcurementShortagePressure(game)
  if (!assessment.active) {
    return bundleAvailability
  }

  return Math.max(
    cal.minBundles,
    bundleAvailability - cal.availabilityPenaltyBundles
  )
}

export function assessProcurementCorruptionRouting(
  game: Pick<GameState, 'compromisedAuthority'>
) {
  return assessCompromisedAuthorityProcurementDiversion(game)
}

export function applyCorruptionRoutingToBundleAvailability(
  definition: Pick<ProcurementListingDefinition, 'id'>,
  game: Pick<GameState, 'compromisedAuthority'>,
  bundleAvailability: number
): number {
  const cal = FUNDING_CALIBRATION.procurementCorruptionRouting

  if (definition.id !== cal.listingId) {
    return bundleAvailability
  }

  const assessment = assessProcurementCorruptionRouting(game)
  if (!assessment.active) {
    return bundleAvailability
  }

  return Math.max(
    cal.minBundles,
    bundleAvailability - cal.availabilityPenaltyBundles
  )
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

  const packetAdjustedBundleAvailability = marketPacket.available
    ? Math.max(0, Math.floor(bundleAvailability * marketPacket.availabilityMultiplier))
    : 0
  const shortageAdjustedBundleAvailability = applyShortagePressureToBundleAvailability(
    definition,
    game,
    packetAdjustedBundleAvailability
  )
  const adjustedBundleAvailability = applyCorruptionRoutingToBundleAvailability(
    definition,
    game,
    shortageAdjustedBundleAvailability
  )

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
  game: GameState,
  transactionTotals: ListingTransactionTotals
): ProcurementListing {
  const marketPacket = buildMarketPacket(getMarketPacketIdForDefinition(definition), game)
  const baseBuyPrice = getBuyPrice(definition, game, marketPacket)
  const allocationStatus = buildAllocationStatus(definition, game, marketPacket, baseBuyPrice)
  const reagentAllocationStatus = createReagentAllocationStatus(
    definition,
    game,
    allocationStatus.substitution?.unitPrice ?? baseBuyPrice
  )
  const licensedHandlingStatus = createLicensedHandlingAllocationStatus(definition, game)
  const resourceStatuses = [
    allocationStatus,
    ...(reagentAllocationStatus ? [reagentAllocationStatus] : []),
    ...(licensedHandlingStatus ? [licensedHandlingStatus] : []),
  ]
  const buyPrice =
    reagentAllocationStatus?.substitution?.unitPrice ??
    allocationStatus.substitution?.unitPrice ??
    baseBuyPrice
  const fabricationCost =
    definition.recipeId !== undefined
      ? getProductionRecipe(definition.recipeId)
        ? getRecipeFundingCost(getProductionRecipe(definition.recipeId)!, game.market)
        : undefined
      : undefined
  const featured = definition.recipeId === game.market.featuredRecipeId
  const shortageAssessment = assessProcurementShortagePressure(game)
  const shortageCalibration = FUNDING_CALIBRATION.procurementShortagePressure
  const corruptionAssessment = assessProcurementCorruptionRouting(game)
  const corruptionCalibration = FUNDING_CALIBRATION.procurementCorruptionRouting
  const totalAvailability = getBaseAvailability(definition, game, marketPacket)
  const bought = transactionTotals.boughtByListingId[definition.id] ?? 0
  const sold = transactionTotals.soldByListingId[definition.id] ?? 0
  const remainingAvailability = Math.max(0, totalAvailability - bought + sold)
  const sellPrice = Math.max(
    1,
    Math.round(baseBuyPrice * getSellRatio(game.market.pressure, featured))
  )
  const access = assessProcurementAccess(definition, game, marketPacket)

  const accessRule = PROCUREMENT_ACCESS_RULES[definition.id] ?? DEFAULT_PROCUREMENT_ACCESS
  const delayedFulfillmentWeeks = accessRule.delayedFulfillmentWeeks

  return {
    ...definition,
    featured,
    fabricationCost,
    buyPrice,
    sellPrice,
    pressureLabel: getMarketPressureLabel(game.market.pressure),
    marketPacket,
    allocationStatus,
    resourceStatuses,
    ...access,
    ...(typeof delayedFulfillmentWeeks === 'number' ? { delayedFulfillmentWeeks } : {}),
    totalAvailability,
    remainingAvailability,
    availableBundles: Math.floor(remainingAvailability / definition.bundleQuantity),
    inventoryStock: game.inventory[definition.itemId] ?? 0,
    ...(definition.id === shortageCalibration.listingId && shortageAssessment.active
      ? {
          shortagePressureDetail: {
            active: true,
            reasons: shortageAssessment.reasons,
            availabilityPenaltyBundles: shortageCalibration.availabilityPenaltyBundles,
          },
        }
      : {}),
    ...(definition.id === corruptionCalibration.listingId && corruptionAssessment.active
      ? {
          corruptionRoutingDetail: {
            active: true,
            reasons: corruptionAssessment.reasons,
            availabilityPenaltyBundles: corruptionCalibration.availabilityPenaltyBundles,
            ...(corruptionAssessment.officialRole
              ? { officialRole: corruptionAssessment.officialRole }
              : {}),
            ...(corruptionAssessment.benefittingFactionId
              ? { benefittingFactionId: corruptionAssessment.benefittingFactionId }
              : {}),
          },
        }
      : {}),
  }
}

export function buildProcurementAllocationPacket(input: {
  listing: ProcurementListing
  transactionId: string
  quantity: number
}): ProcurementAllocationPacket {
  return buildProcurementAllocationPackets(input)[0]!
}

export function buildProcurementAllocationPackets(input: {
  listing: ProcurementListing
  transactionId: string
  quantity: number
}): ProcurementAllocationPacket[] {
  return input.listing.resourceStatuses.map((status) =>
    buildProcurementAllocationPacketForStatus(status, input)
  )
}

function buildProcurementAllocationPacketForStatus(
  status: ProcurementAllocationStatus,
  input: {
    listing: ProcurementListing
    transactionId: string
    quantity: number
  }
): ProcurementAllocationPacket {
  const statusSubstitution = status.substitution
  const source = statusSubstitution?.source ?? status.source
  const sourceLabel = statusSubstitution?.sourceLabel ?? status.sourceLabel
  const displacedAlternativeUse = status.displacedAlternativeUse

  return {
    allocationId: `${input.transactionId}:${status.resourceClass}`,
    resourceClass: status.resourceClass,
    source,
    sourceLabel,
    destinationUse: input.listing.id,
    destinationLabel: input.listing.itemName,
    urgency: statusSubstitution ? 'contingency' : 'standard',
    expectedBenefit: `${input.quantity}x ${input.listing.itemName}`,
    priority: input.listing.featured ? 2 : 1,
    delayWeeks: statusSubstitution?.delayWeeks ?? 0,
    ...(displacedAlternativeUse ? { displacedAlternativeUse } : {}),
    substitutionStatus: statusSubstitution ? 'degraded_substitute' : 'none',
    ...(statusSubstitution ? { substitutionSummary: statusSubstitution.summary } : {}),
  }
}

export function getProcurementListings(game: GameState) {
  const transactionTotals = getListingTransactionTotalsForWeek(game.events, game.market.week)
  return getListingDefinitions().map((definition) =>
    buildListing(definition, game, transactionTotals)
  )
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
      ...(event.payload.allocation ? { allocation: event.payload.allocation } : {}),
      ...(event.payload.allocations ? { allocations: event.payload.allocations } : {}),
      timestamp: event.timestamp,
      listingResourceStatuses: event.payload.listingResourceStatuses,
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

const PERSISTED_MARKET_PRESSURES: readonly MarketPressure[] = ['discounted', 'stable', 'tight']

const PRODUCTION_RECIPE_IDS = new Set(productionCatalog.map((recipe) => recipe.recipeId))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeMarketInteger(value: number | undefined, fallback: number, min: number, max?: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback
  const boundedMin = Math.max(min, finiteValue)

  if (typeof max === 'number') {
    return Math.min(max, boundedMin)
  }

  return boundedMin
}

function sanitizeMarketDecimal(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback

  return Math.min(max, Math.max(min, finiteValue))
}

function isMarketPressure(value: unknown): value is MarketPressure {
  return (
    typeof value === 'string' &&
    (PERSISTED_MARKET_PRESSURES as readonly string[]).includes(value)
  )
}

/** SPE-454: canonical exchange multiplier for each persisted pressure band. */
export function getCanonicalMarketCostMultiplier(pressure: MarketPressure): number {
  if (pressure === 'discounted') {
    return 0.9
  }

  if (pressure === 'tight') {
    return 1.15
  }

  return 1
}

/** SPE-446: unknown featured ids fall back to a catalog recipe (never persist phantom recipes). */
export function sanitizeFeaturedRecipeId(value: unknown, fallbackRecipeId: string): string {
  if (typeof value === 'string' && value.length > 0 && PRODUCTION_RECIPE_IDS.has(value)) {
    return value
  }

  if (PRODUCTION_RECIPE_IDS.has(fallbackRecipeId)) {
    return fallbackRecipeId
  }

  return productionCatalog[0]?.recipeId ?? 'ward-seals'
}

/**
 * SPE-446–448: normalize persisted market snapshots on import.
 * `listings` are derived at read time — strip any persisted copy (SPE-448).
 */
export function sanitizePersistedMarketState(
  value: unknown,
  fallback: MarketState,
  campaignWeek: number
): MarketState {
  if (!isRecord(value)) {
    return { ...fallback, week: campaignWeek }
  }

  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))
  const attestationFallback = fallback.licensedHandlingAttestationWeek ?? fallback.week
  const pressure = isMarketPressure(value.pressure) ? value.pressure : fallback.pressure
  const boundedCostMultiplier = sanitizeMarketDecimal(
    value.costMultiplier as number | undefined,
    getCanonicalMarketCostMultiplier(pressure),
    0.5,
    2
  )
  const canonicalCostMultiplier = getCanonicalMarketCostMultiplier(pressure)
  const costMultiplier =
    boundedCostMultiplier === canonicalCostMultiplier
      ? boundedCostMultiplier
      : canonicalCostMultiplier

  return {
    week: cappedWeek,
    featuredRecipeId: sanitizeFeaturedRecipeId(value.featuredRecipeId, fallback.featuredRecipeId),
    pressure,
    costMultiplier,
    licensedHandlingAttestationWeek: sanitizeMarketInteger(
      value.licensedHandlingAttestationWeek as number | undefined,
      attestationFallback,
      1,
      cappedWeek
    ),
  }
}
