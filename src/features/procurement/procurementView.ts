// View-model for Procurement / Market Screen (SPE-34)

import { MARKET_SOURCE_LABELS, MARKET_UI_TEXT } from '../../data/copy'
import { assessFundingPressure, getCanonicalFundingState, getProcurementBacklog } from '../../domain/funding'
import {
  getProcurementListings,
  type ProcurementListing,
} from '../../domain/market'
import { useGameStore } from '../../app/store/gameStore'

// Types for the procurement screen
export interface ProcurementOptionView {
  id: string
  name: string
  description?: string
  cost: number
  category?: string
  source?: string
  availability?: string
  accessLabel?: string
  accessDetails?: string[]
  affordable: boolean
  blockers: string[]
  budgetImpact?: string
  pressureConsequences?: string
  afterFunding?: number
  isRecommended?: boolean
  isCritical?: boolean
}

export interface ProcurementBacklogEntryView {
  requestId: string
  name: string
  cost: number
  status: string
}

export interface ProcurementScreenView {
  options: ProcurementOptionView[]
  backlog: ProcurementBacklogEntryView[]
  budget: {
    funding: number
    budgetPressure: number
    blockers: string[]
    pressureConsequences?: string
    backlogSignal?: string
  }
  onRequest: (optionId: string) => void
}

function formatCurrency(value: number) {
  return `$${value}`
}

function mapListingCategory(listing: ProcurementListing): string {
  if (listing.source === 'direct_equipment') {
    return 'Equipment'
  }

  if (listing.source === 'recipe') {
    return 'Market'
  }

  return MARKET_SOURCE_LABELS[listing.source]
}

function buildAvailabilityLabel(listing: ProcurementListing): string {
  if (!listing.accessAvailable) {
    return listing.accessBlockedReason ?? 'Access blocked'
  }

  if (listing.availableBundles <= 0) {
    return MARKET_UI_TEXT.exhaustedListing
  }

  const bundleLabel =
    listing.availableBundles === 1
      ? '1 bundle open'
      : `${listing.availableBundles} bundles open`

  return `${bundleLabel} (${listing.remainingAvailability} units remaining)`
}

function collectNonBudgetBlockers(listing: ProcurementListing): string[] {
  const blockers: string[] = []

  if (!listing.accessAvailable && listing.accessBlockedReason) {
    blockers.push(listing.accessBlockedReason)
  }

  if (listing.marketPacket.blockedReason) {
    blockers.push(listing.marketPacket.blockedReason)
  }

  for (const status of listing.resourceStatuses) {
    if (!status.purchaseAvailable && status.blockerReason) {
      blockers.push(status.blockerReason)
    }
  }

  if (listing.accessAvailable && listing.availableBundles < 1) {
    blockers.push(MARKET_UI_TEXT.exhaustedListing)
  }

  return [...new Set(blockers)]
}

function buildListingOption(
  listing: ProcurementListing,
  funding: number,
  budgetPressure: number
): ProcurementOptionView {
  const cost = listing.buyPrice
  const affordable = funding >= cost
  const afterFunding = funding - cost
  const blockers = collectNonBudgetBlockers(listing)
  const isCritical = budgetPressure >= 3 && affordable && blockers.length === 0
  const isRecommended = budgetPressure < 2 && affordable && blockers.length === 0

  return {
    id: listing.id,
    name: listing.itemName,
    description: listing.description,
    cost,
    category: mapListingCategory(listing),
    source: listing.marketPacket.label,
    availability: buildAvailabilityLabel(listing),
    accessLabel: listing.accessLabel,
    accessDetails: listing.accessDetails,
    affordable,
    blockers,
    budgetImpact: `-${formatCurrency(cost)}`,
    pressureConsequences: listing.pressureLabel,
    afterFunding,
    isCritical,
    isRecommended,
  }
}

function buildFabricationOption(
  listing: ProcurementListing,
  funding: number,
  budgetPressure: number
): ProcurementOptionView | null {
  if (listing.source !== 'recipe' || listing.fabricationCost === undefined || !listing.recipeId) {
    return null
  }

  const cost = listing.fabricationCost
  const affordable = funding >= cost
  const afterFunding = funding - cost
  const blockers: string[] = []
  const isCritical = budgetPressure >= 3 && affordable
  const isRecommended = budgetPressure < 2 && affordable

  return {
    id: listing.recipeId,
    name: listing.itemName,
    description: listing.description,
    cost,
    category: 'Fabrication',
    source: 'Workshop',
    availability: 'Queue when funded',
    affordable,
    blockers,
    budgetImpact: `-${formatCurrency(cost)}`,
    pressureConsequences: undefined,
    afterFunding,
    isCritical,
    isRecommended,
  }
}

// Main view-model function
export function getProcurementScreenView(): ProcurementScreenView {
  const game = useGameStore.getState().game
  const fundingState = getCanonicalFundingState(game)
  const fundingPressure = assessFundingPressure(game)
  const backlog = getProcurementBacklog(fundingState)
  const listings = getProcurementListings(game)

  const listingOptions = listings.map((listing) =>
    buildListingOption(listing, fundingState.funding, fundingPressure.budgetPressure)
  )

  const fabricationOptions = listings
    .map((listing) =>
      buildFabricationOption(listing, fundingState.funding, fundingPressure.budgetPressure)
    )
    .filter((option): option is ProcurementOptionView => option !== null)

  const options = [...listingOptions, ...fabricationOptions]

  const backlogView: ProcurementBacklogEntryView[] = backlog.map((entry) => {
    const listing = listings.find((candidate) => candidate.itemId === entry.itemId)

    return {
      requestId: entry.requestId,
      name: listing?.itemName ?? entry.itemId,
      cost: entry.cost,
      status: entry.status,
    }
  })

  const backlogPending = backlog.filter((entry) => entry.status === 'pending').length
  const backlogStale = backlog.filter(
    (entry) =>
      entry.status === 'pending' &&
      fundingPressure.staleProcurementRequestIds.includes(entry.requestId)
  ).length
  let backlogSignal = ''
  if (backlogPending >= 5) backlogSignal = 'Backlog congestion'
  else if (backlogStale > 0) backlogSignal = 'Delay risk'

  const budget = {
    funding: fundingPressure.funding,
    budgetPressure: fundingPressure.budgetPressure,
    blockers: fundingPressure.reasonCodes,
    pressureConsequences: fundingPressure.budgetPressure >= 2 ? 'High pressure' : 'Low',
    backlogSignal,
  }

  function onRequest(optionId: string) {
    const opt = options.find((candidate) => candidate.id === optionId)
    if (!opt || !opt.affordable || opt.blockers.length > 0) return

    if (opt.category === 'Fabrication') {
      useGameStore.getState().queueFabrication(optionId)
      return
    }

    useGameStore.getState().purchaseMarketInventory(optionId)
  }

  return {
    options,
    backlog: backlogView,
    budget,
    onRequest,
  }
}
