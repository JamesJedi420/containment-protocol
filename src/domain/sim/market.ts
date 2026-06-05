import { appendOperationEventDrafts } from '../events'
import type { GameState } from '../models'
import {
  assessFactionFavorExchangeProcurement,
  buildProcurementAllocationPackets,
  getProcurementListing,
} from '../market'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'

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
  if (!favorAssessment.eligible) {
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

export function sellMarketInventory(state: GameState, listingId: string, bundles = 1): GameState {
  const listing = getProcurementListing(state, listingId)

  if (!listing) {
    return ensureNormalizedGameState(state)
  }

  const normalizedBundles = Math.max(1, Math.trunc(bundles))
  const quantity = normalizedBundles * listing.bundleQuantity
  const availableInventory = state.inventory[listing.itemId] ?? 0

  if (availableInventory < quantity) {
    return ensureNormalizedGameState(state)
  }

  const totalPrice = normalizedBundles * listing.sellPrice
  const nextInventory = {
    ...state.inventory,
    [listing.itemId]: Math.max(0, availableInventory - quantity),
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
