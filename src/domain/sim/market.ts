import { appendOperationEventDrafts } from '../events'
import type { FundingState, GameState } from '../models'
import {
  assessCallableObligationProcurement,
  assessFactionFavorExchangeProcurement,
  buildProcurementAllocationPackets,
  getProcurementListing,
  type ProcurementListing,
} from '../market'
import {
  cancelProcurementOrder,
  fulfillProcurementOrder,
  getCanonicalFundingState,
  placeProcurementOrder,
  recomputeBudgetPressure,
} from '../funding'
import { FUNDING_CALIBRATION } from './calibration'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'
import { getCatalogEquipmentStock } from './equipment'

function getNextMarketTransactionSequence(state: GameState) {
  return (
    state.events.reduce(
      (count, event) => (event.type === 'market.transaction_recorded' ? count + 1 : count),
      0
    ) + 1
  )
}

function nextTransactionId(state: GameState) {
  return `market-${state.week}-${state.market.week}-${getNextMarketTransactionSequence(state)}`
}

function readInventoryStock(state: GameState, itemId: string) {
  const value = state.inventory[itemId]
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

export function getMarketSellableInventoryStock(
  state: GameState,
  listing: Pick<ProcurementListing, 'category' | 'itemId'>
) {
  const inventoryStock = readInventoryStock(state, listing.itemId)
  if (listing.category !== 'equipment') return inventoryStock
  return Math.min(inventoryStock, getCatalogEquipmentStock(state, listing.itemId))
}

function nextProcurementRequestId(state: GameState) {
  const pendingCount =
    getCanonicalFundingState(state).procurementBacklog.filter((entry) => entry.status === 'pending')
      .length + 1

  return `market-order-${state.week}-${pendingCount}`
}

function syncGameFundingState(state: GameState, fundingState: FundingState): GameState {
  const agency = state.agency ?? {
    containmentRating: 0,
    clearanceLevel: 1,
    funding: 0,
    supportAvailable: 0,
  }
  const normalizedFundingState = recomputeBudgetPressure(fundingState, state.week)

  return normalizeGameState({
    ...state,
    funding: normalizedFundingState.funding,
    agency: {
      ...agency,
      funding: normalizedFundingState.funding,
      fundingState: normalizedFundingState,
    },
  })
}

function getBacklogDelayWeeks(entry: { delayWeeks?: number }): number {
  return entry.delayWeeks ?? FUNDING_CALIBRATION.procurementDelayedFulfillmentWeeks
}

/** Sets licensed-handling doctrine attestation to the current campaign week (procurement permit slice). */
export function acknowledgeLicensedHandlingDoctrine(state: GameState): GameState {
  return normalizeGameState({
    ...state,
    market: {
      ...state.market,
      licensedHandlingAttestationWeek: state.week,
    },
  })
}

export function purchaseMarketInventory(
  state: GameState,
  listingId: string,
  bundles = 1
): GameState {
  const listing = getProcurementListing(state, listingId)

  if (!listing) {
    return ensureNormalizedGameState(state)
  }

  if (typeof listing.delayedFulfillmentWeeks === 'number' && listing.delayedFulfillmentWeeks > 0) {
    return ensureNormalizedGameState(state)
  }

  const normalizedBundles = Math.max(1, Math.trunc(bundles))
  const quantity = normalizedBundles * listing.bundleQuantity
  const totalPrice = normalizedBundles * listing.buyPrice

  if (
    !listing.cashPurchaseAllowed ||
    !listing.accessAvailable ||
    !listing.resourceStatuses.every((status) => status.purchaseAvailable) ||
    (listing.resourceStatuses.some((status) => status.substitution) && normalizedBundles > 1) ||
    normalizedBundles > listing.availableBundles ||
    state.funding < totalPrice
  ) {
    return ensureNormalizedGameState(state)
  }

  const nextInventory = {
    ...state.inventory,
    [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + quantity,
  }
  const transactionId = nextTransactionId(state)
  const allocations = buildProcurementAllocationPackets({
    listing,
    transactionId,
    quantity,
  })

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        funding: state.funding - totalPrice,
        inventory: nextInventory,
      },
      [
        {
          type: 'market.transaction_recorded',
          sourceSystem: 'production',
          payload: {
            week: state.week,
            marketWeek: state.market.week,
            transactionId,
            action: 'buy',
            listingId: listing.id,
            itemId: listing.itemId,
            itemName: listing.itemName,
            category: listing.category,
            quantity,
            bundleCount: normalizedBundles,
            unitPrice: Math.round((listing.buyPrice / listing.bundleQuantity) * 100) / 100,
            totalPrice,
            remainingAvailability: Math.max(0, listing.remainingAvailability - quantity),
            allocation: allocations[0]!,
            allocations,
          },
        },
      ]
    )
  )
}

export function redeemFactionFavorProcurement(
  state: GameState,
  listingId: string,
  bundles = 1
): GameState {
  const listing = getProcurementListing(state, listingId)

  if (!listing?.favorExchange) {
    return ensureNormalizedGameState(state)
  }

  const favorAssessment = assessFactionFavorExchangeProcurement(state, listingId)
  if (!favorAssessment.eligible || !listing.favorRedeemAvailable) {
    return ensureNormalizedGameState(state)
  }

  const normalizedBundles = Math.max(1, Math.trunc(bundles))
  const quantity = normalizedBundles * listing.bundleQuantity

  if (
    !listing.resourceStatuses.every((status) => status.purchaseAvailable) ||
    (listing.resourceStatuses.some((status) => status.substitution) && normalizedBundles > 1) ||
    normalizedBundles > listing.availableBundles
  ) {
    return ensureNormalizedGameState(state)
  }

  const { factionId, favorId } = listing.favorExchange
  const runtime = state.factions?.[factionId]
  if (!runtime) {
    return ensureNormalizedGameState(state)
  }

  const nextFavors = (runtime.availableFavors ?? []).filter((favor) => favor.id !== favorId)
  if (nextFavors.length === (runtime.availableFavors ?? []).length) {
    return ensureNormalizedGameState(state)
  }

  const nextInventory = {
    ...state.inventory,
    [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + quantity,
  }
  const transactionId = nextTransactionId(state)
  const allocations = buildProcurementAllocationPackets({
    listing,
    transactionId,
    quantity,
  })

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        inventory: nextInventory,
        factions: {
          ...state.factions,
          [factionId]: {
            ...runtime,
            availableFavors: nextFavors,
          },
        },
      },
      [
        {
          type: 'market.transaction_recorded',
          sourceSystem: 'production',
          payload: {
            week: state.week,
            marketWeek: state.market.week,
            transactionId,
            action: 'favor_exchange',
            listingId: listing.id,
            itemId: listing.itemId,
            itemName: listing.itemName,
            category: listing.category,
            quantity,
            bundleCount: normalizedBundles,
            unitPrice: 0,
            totalPrice: 0,
            remainingAvailability: Math.max(0, listing.remainingAvailability - quantity),
            allocation: allocations[0]!,
            allocations,
            favorExchangeFactionId: factionId,
            favorExchangeFavorId: favorId,
            favorExchangeLabel: listing.favorExchange.exchangeLabel,
          },
        },
      ]
    )
  )
}

/** SPE-2323: call open faction obligation to acquire a cash listing without spending funding. */
export function callCallableObligationProcurement(
  state: GameState,
  listingId: string,
  bundles = 1
): GameState {
  const listing = getProcurementListing(state, listingId)

  if (!listing?.callableObligation || !listing.cashPurchaseAllowed) {
    return ensureNormalizedGameState(state)
  }

  const obligationAssessment = assessCallableObligationProcurement(state, listingId)
  if (!obligationAssessment.eligible || !listing.accessAvailable) {
    return ensureNormalizedGameState(state)
  }

  const normalizedBundles = Math.max(1, Math.trunc(bundles))
  const quantity = normalizedBundles * listing.bundleQuantity
  const fundingState = getCanonicalFundingState(state)
  const totalPrice = normalizedBundles * listing.buyPrice

  if (totalPrice <= fundingState.funding) {
    return ensureNormalizedGameState(state)
  }

  if (
    !listing.resourceStatuses.every((status) => status.purchaseAvailable) ||
    (listing.resourceStatuses.some((status) => status.substitution) && normalizedBundles > 1) ||
    normalizedBundles > listing.availableBundles
  ) {
    return ensureNormalizedGameState(state)
  }

  const { factionId, favorId, obligationLabel } = listing.callableObligation
  const runtime = state.factions?.[factionId]
  if (!runtime) {
    return ensureNormalizedGameState(state)
  }

  const nextFavors = (runtime.availableFavors ?? []).filter((favor) => favor.id !== favorId)
  if (nextFavors.length === (runtime.availableFavors ?? []).length) {
    return ensureNormalizedGameState(state)
  }

  const nextInventory = {
    ...state.inventory,
    [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + quantity,
  }
  const transactionId = nextTransactionId(state)
  const allocations = buildProcurementAllocationPackets({
    listing,
    transactionId,
    quantity,
  })

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        inventory: nextInventory,
        factions: {
          ...state.factions,
          [factionId]: {
            ...runtime,
            availableFavors: nextFavors,
          },
        },
      },
      [
        {
          type: 'market.transaction_recorded',
          sourceSystem: 'production',
          payload: {
            week: state.week,
            marketWeek: state.market.week,
            transactionId,
            action: 'callable_obligation',
            listingId: listing.id,
            itemId: listing.itemId,
            itemName: listing.itemName,
            category: listing.category,
            quantity,
            bundleCount: normalizedBundles,
            unitPrice: 0,
            totalPrice: 0,
            remainingAvailability: Math.max(0, listing.remainingAvailability - quantity),
            allocation: allocations[0]!,
            allocations,
            callableObligationFactionId: factionId,
            callableObligationFavorId: favorId,
            callableObligationLabel: obligationLabel,
          },
        },
      ]
    )
  )
}

/** SPE-2319: place a delayed supplier order — funding deducted now, inventory on week-close fulfillment. */
export function placeDelayedMarketOrder(
  state: GameState,
  listingId: string,
  bundles = 1
): GameState {
  const listing = getProcurementListing(state, listingId)

  if (
    !listing ||
    typeof listing.delayedFulfillmentWeeks !== 'number' ||
    listing.delayedFulfillmentWeeks < 1 ||
    !listing.cashPurchaseAllowed ||
    !listing.accessAvailable ||
    listing.accessChannel === 'faction_favor_exchange'
  ) {
    return ensureNormalizedGameState(state)
  }

  const normalizedBundles = Math.max(1, Math.trunc(bundles))
  const quantity = normalizedBundles * listing.bundleQuantity
  const totalPrice = normalizedBundles * listing.buyPrice
  const fundingState = getCanonicalFundingState(state)

  if (totalPrice > fundingState.funding) {
    return ensureNormalizedGameState(state)
  }

  const requestId = nextProcurementRequestId(state)
  const delayWeeks = listing.delayedFulfillmentWeeks
  const withOrder = placeProcurementOrder(fundingState, {
    requestId,
    itemId: listing.itemId,
    quantity,
    requestedWeek: state.week,
    cost: totalPrice,
    listingId: listing.id,
    delayWeeks,
  })
  const transactionId = nextTransactionId(state)

  return syncGameFundingState(
    appendOperationEventDrafts(state, [
      {
        type: 'market.transaction_recorded',
        sourceSystem: 'production',
        payload: {
          week: state.week,
          marketWeek: state.market.week,
          transactionId,
          action: 'order',
          listingId: listing.id,
          itemId: listing.itemId,
          itemName: listing.itemName,
          category: listing.category,
          quantity,
          bundleCount: normalizedBundles,
          unitPrice: Math.round((listing.buyPrice / listing.bundleQuantity) * 100) / 100,
          totalPrice,
          remainingAvailability: listing.remainingAvailability,
        },
      },
    ]),
    withOrder
  )
}

/**
 * SPE-2319: idempotent week-close fulfillment for pending procurement backlog entries.
 * Called from advanceWeek after operating-cost application.
 */
export function fulfillPendingProcurementBacklogAtWeekClose(
  state: GameState,
  closedWeek: number
): GameState {
  const week = Math.max(1, Math.trunc(closedWeek))
  let fundingState = getCanonicalFundingState(state, week)
  let nextState = state
  const eventDrafts: Parameters<typeof appendOperationEventDrafts>[1] = []

  for (const entry of fundingState.procurementBacklog) {
    if (entry.status !== 'pending' || !entry.listingId) {
      continue
    }

    const dueWeek = entry.requestedWeek + getBacklogDelayWeeks(entry)
    if (week < dueWeek) {
      continue
    }

    const listingId = entry.listingId ?? `gear:${entry.itemId}`
    const listing = getProcurementListing(nextState, listingId)
    const requiredBundles = Math.ceil(entry.quantity / Math.max(1, listing?.bundleQuantity ?? 1))

    if (!listing || listing.availableBundles < requiredBundles) {
      fundingState = cancelProcurementOrder(
        fundingState,
        entry.requestId,
        week,
        'supplier_allocation_exhausted'
      )
      continue
    }

    fundingState = fulfillProcurementOrder(fundingState, entry.requestId, week)
    const nextInventory = {
      ...nextState.inventory,
      [entry.itemId]: (nextState.inventory[entry.itemId] ?? 0) + entry.quantity,
    }
    nextState = {
      ...nextState,
      inventory: nextInventory,
    }

    eventDrafts.push({
      type: 'market.transaction_recorded',
      sourceSystem: 'production',
      payload: {
        week,
        marketWeek: nextState.market.week,
        transactionId: `market-fulfill-${entry.requestId}`,
        action: 'fulfill',
        listingId,
        itemId: entry.itemId,
        itemName: listing.itemName,
        category: listing.category,
        quantity: entry.quantity,
        bundleCount: requiredBundles,
        unitPrice: Math.round((entry.cost / entry.quantity) * 100) / 100,
        totalPrice: entry.cost,
        remainingAvailability: Math.max(0, listing.remainingAvailability - entry.quantity),
      },
    })
  }

  if (eventDrafts.length === 0) {
    return syncGameFundingState(nextState, fundingState)
  }

  return syncGameFundingState(appendOperationEventDrafts(nextState, eventDrafts), fundingState)
}

export function sellMarketInventory(state: GameState, listingId: string, bundles = 1): GameState {
  const listing = getProcurementListing(state, listingId)

  if (!listing) {
    return ensureNormalizedGameState(state)
  }

  const normalizedBundles = Math.max(1, Math.trunc(bundles))
  const quantity = normalizedBundles * listing.bundleQuantity
  const availableInventory = getMarketSellableInventoryStock(state, listing)

  if (availableInventory < quantity) {
    return ensureNormalizedGameState(state)
  }

  const totalPrice = normalizedBundles * listing.sellPrice
  const inventoryStock = readInventoryStock(state, listing.itemId)
  const nextInventory = {
    ...state.inventory,
    [listing.itemId]: Math.max(0, inventoryStock - quantity),
  }

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        funding: state.funding + totalPrice,
        inventory: nextInventory,
      },
      [
        {
          type: 'market.transaction_recorded',
          sourceSystem: 'production',
          payload: {
            week: state.week,
            marketWeek: state.market.week,
            transactionId: nextTransactionId(state),
            action: 'sell',
            listingId: listing.id,
            itemId: listing.itemId,
            itemName: listing.itemName,
            category: listing.category,
            quantity,
            bundleCount: normalizedBundles,
            unitPrice: Math.round((listing.sellPrice / listing.bundleQuantity) * 100) / 100,
            totalPrice,
            remainingAvailability: listing.remainingAvailability + quantity,
          },
        },
      ]
    )
  )
}
