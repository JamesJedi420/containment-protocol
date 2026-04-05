import { appendOperationEventDrafts } from '../events'
import type { GameState } from '../models'
import { getProcurementListing } from '../market'
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

  if (normalizedBundles > listing.availableBundles || state.funding < totalPrice) {
    return ensureNormalizedGameState(state)
  }

  const nextInventory = {
    ...state.inventory,
    [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + quantity,
  }

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
            transactionId: nextTransactionId(state),
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
