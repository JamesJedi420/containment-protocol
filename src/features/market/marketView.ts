import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import {
  getAvailableMarketCategories,
  getCurrentMarketTransactions,
  getProcurementListings,
  type ProcurementListing,
  type ProcurementTransactionView,
} from '../../domain/market'
import { type GameState } from '../../domain/models'
import { MARKET_UI_TEXT } from '../../data/copy'

const MARKET_LISTING_CATEGORIES = getAvailableMarketCategories()

export const MARKET_CATEGORY_FILTERS = ['all', ...MARKET_LISTING_CATEGORIES, 'featured'] as const
export const MARKET_SORTS = [
  'recommended',
  'name',
  'price-asc',
  'price-desc',
  'availability',
] as const

export type MarketCategoryFilter = (typeof MARKET_CATEGORY_FILTERS)[number]
export type MarketSort = (typeof MARKET_SORTS)[number]

export interface MarketFilters {
  q: string
  category: MarketCategoryFilter
  sort: MarketSort
}

export interface MarketListingView extends ProcurementListing {
  canBuyOne: boolean
  canBuyThree: boolean
  canSellOne: boolean
  canSellThree: boolean
  buyBlockedReason?: string
  sellBlockedReason?: string
}

export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  q: '',
  category: 'all',
  sort: 'recommended',
}

export function readMarketFilters(searchParams: URLSearchParams): MarketFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    category: readEnumParam(
      searchParams,
      'category',
      MARKET_CATEGORY_FILTERS,
      DEFAULT_MARKET_FILTERS.category
    ),
    sort: readEnumParam(searchParams, 'sort', MARKET_SORTS, DEFAULT_MARKET_FILTERS.sort),
  }
}

export function writeMarketFilters(filters: MarketFilters, baseSearchParams?: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(nextSearchParams, 'category', filters.category, DEFAULT_MARKET_FILTERS.category)
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_MARKET_FILTERS.sort)

  return nextSearchParams
}

export function getMarketListings(game: GameState): MarketListingView[] {
  return getProcurementListings(game).map((listing) => buildListingView(listing, game))
}

export function getFilteredMarketListings(game: GameState, filters: MarketFilters) {
  return getMarketListings(game)
    .filter((listing) => matchesFilters(listing, filters))
    .sort((left, right) => compareListings(left, right, filters.sort))
}

export function getCurrentWeekMarketTransactions(game: GameState): ProcurementTransactionView[] {
  return getCurrentMarketTransactions(game)
}

export function getFeaturedMarketListing(game: GameState) {
  return getMarketListings(game).find((listing) => listing.featured)
}

function buildListingView(listing: ProcurementListing, game: GameState): MarketListingView {
  const canBuyOne = listing.availableBundles >= 1 && game.funding >= listing.buyPrice
  const canBuyThree = listing.availableBundles >= 3 && game.funding >= listing.buyPrice * 3
  const canSellOne = listing.inventoryStock >= listing.bundleQuantity
  const canSellThree = listing.inventoryStock >= listing.bundleQuantity * 3

  let buyBlockedReason: string | undefined
  if (listing.availableBundles < 1) {
    buyBlockedReason = MARKET_UI_TEXT.exhaustedListing
  } else if (game.funding < listing.buyPrice) {
    const shortfall = Math.max(0, listing.buyPrice - game.funding)
    buyBlockedReason = MARKET_UI_TEXT.insufficientFundingBy.replace('{amount}', `$${shortfall}`)
  }

  let sellBlockedReason: string | undefined
  if (listing.inventoryStock < listing.bundleQuantity) {
    sellBlockedReason = MARKET_UI_TEXT.noSellStock
  }

  return {
    ...listing,
    canBuyOne,
    canBuyThree,
    canSellOne,
    canSellThree,
    buyBlockedReason,
    sellBlockedReason,
  }
}

function matchesFilters(listing: MarketListingView, filters: MarketFilters) {
  if (filters.category === 'featured' && !listing.featured) {
    return false
  }

  if (
    filters.category !== 'all' &&
    filters.category !== 'featured' &&
    listing.category !== filters.category
  ) {
    return false
  }

  if (!filters.q) {
    return true
  }

  const query = filters.q.toLowerCase()
  const haystack = [
    listing.itemName,
    listing.description,
    listing.category,
    listing.source,
    ...listing.tags,
    listing.featured ? 'featured' : '',
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function compareListings(left: MarketListingView, right: MarketListingView, sort: MarketSort) {
  if (sort === 'name') {
    return left.itemName.localeCompare(right.itemName)
  }

  if (sort === 'price-asc') {
    return left.buyPrice - right.buyPrice || left.itemName.localeCompare(right.itemName)
  }

  if (sort === 'price-desc') {
    return right.buyPrice - left.buyPrice || left.itemName.localeCompare(right.itemName)
  }

  if (sort === 'availability') {
    return (
      right.availableBundles - left.availableBundles || left.itemName.localeCompare(right.itemName)
    )
  }

  const featuredDelta = Number(right.featured) - Number(left.featured)

  return (
    featuredDelta ||
    right.availableBundles - left.availableBundles ||
    left.buyPrice - right.buyPrice ||
    left.itemName.localeCompare(right.itemName)
  )
}
