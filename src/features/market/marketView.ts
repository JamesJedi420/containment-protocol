import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import { inventoryItemLabels } from '../../data/production'
import { assessFundingPressure, getCanonicalFundingState } from '../../domain/funding'
import {
  getAvailableMarketCategories,
  getCurrentMarketTransactions,
  getProcurementListings,
  type ProcurementListing,
  type ProcurementTransactionView,
} from '../../domain/market'
import { type GameState } from '../../domain/models'
import { purchaseMarketInventory as previewPurchaseMarketInventory } from '../../domain/sim/market'
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

export interface ProcurementBudgetPreviewView {
  label: string
  totalCostLabel: string
  fundingAfterLabel: string
  pressureAfterLabel: string
  consequenceSummary: string
  affordable: boolean
  blockedReason?: string
}

export interface ProcurementOptionListItemView {
  id: string
  title: string
  subtitle: string
  sourceLabel: string
  costLabel: string
  availabilityLabel: string
  affordabilityLabel: string
  tone: 'neutral' | 'info' | 'warning' | 'danger'
  blockerSummary?: string
}

export interface ProcurementDetailView {
  id: string
  title: string
  description: string
  sourceLabel: string
  availabilityLabel: string
  affordabilityLabel: string
  costDetails: string[]
  acquisitionDetails: string[]
  blockerDetails: string[]
  budgetPreviews: ProcurementBudgetPreviewView[]
  backlogImpactSummary: string
  tags: string[]
  canBuyOne: boolean
  canBuyThree: boolean
  canSellOne: boolean
  canSellThree: boolean
  buyBlockedReason?: string
  sellBlockedReason?: string
}

export interface ProcurementBacklogRowView {
  id: string
  title: string
  statusLabel: string
  costLabel: string
  detail: string
  tone: 'neutral' | 'warning' | 'danger'
}

export interface ProcurementBudgetSummaryView {
  fundingLabel: string
  marketPressureLabel: string
  budgetPressureLabel: string
  pendingBacklogLabel: string
  summary: string
  details: string[]
}

export interface ProcurementScreenView {
  summary: string
  listings: ProcurementOptionListItemView[]
  selectedListingId: string | null
  selectedDetail: ProcurementDetailView | null
  budgetSummary: ProcurementBudgetSummaryView
  backlogRows: ProcurementBacklogRowView[]
  transactions: ProcurementTransactionView[]
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

export function getProcurementScreenView(
  game: GameState,
  filters: MarketFilters,
  selectedListingId?: string | null
): ProcurementScreenView {
  const listings = getFilteredMarketListings(game, filters)
  const fundingState = getCanonicalFundingState(game)
  const fundingPressure = assessFundingPressure(game)
  const selectedListing = listings.find((listing) => listing.id === selectedListingId) ?? listings[0] ?? null
  const pendingBacklog = fundingState.procurementBacklog.filter((entry) => entry.status === 'pending')
  const staleRequestIds = new Set(fundingPressure.staleProcurementRequestIds)
  const transactions = getCurrentWeekMarketTransactions(game).slice(0, 5)

  return {
    summary:
      listings.length > 0
        ? `${listings.length} procurement channel${listings.length === 1 ? '' : 's'} visible, ${pendingBacklog.length} pending supplier request${pendingBacklog.length === 1 ? '' : 's'}, budget pressure ${fundingPressure.budgetPressure}/4.`
        : `No visible procurement channels match the current filter set. Budget pressure is ${fundingPressure.budgetPressure}/4 with ${pendingBacklog.length} pending supplier request${pendingBacklog.length === 1 ? '' : 's'}.`,
    listings: listings.map((listing) => buildProcurementOptionListItem(listing, game)),
    selectedListingId: selectedListing?.id ?? null,
    selectedDetail: selectedListing ? buildProcurementDetailView(selectedListing, game) : null,
    budgetSummary: buildProcurementBudgetSummary(game, fundingState, fundingPressure, pendingBacklog.length),
    backlogRows: pendingBacklog.slice(0, 5).map((entry, index) => {
      const listingLabel =
        listings.find((listing) => listing.itemId === entry.itemId)?.itemName ??
        inventoryItemLabels[entry.itemId] ??
        entry.itemId

      return {
        id: entry.requestId,
        title: listingLabel,
        statusLabel: staleRequestIds.has(entry.requestId) ? 'Stale pending' : 'Pending',
        costLabel: `$${entry.cost}`,
        detail: `Queue ${index + 1} / requested week ${entry.requestedWeek} / qty ${entry.quantity}`,
        tone: staleRequestIds.has(entry.requestId) ? 'danger' : 'warning',
      } satisfies ProcurementBacklogRowView
    }),
    transactions,
  }
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

function formatCurrency(value: number) {
  return `$${value}`
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function uniqueBounded(values: string[], limit: number) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].slice(0, limit)
}

function getListingTone(listing: MarketListingView): ProcurementOptionListItemView['tone'] {
  if (listing.availableBundles <= 0) {
    return 'danger'
  }

  if (!listing.canBuyOne) {
    return 'warning'
  }

  if (listing.featured) {
    return 'info'
  }

  return 'neutral'
}

function buildProcurementOptionListItem(
  listing: MarketListingView,
  game: GameState
): ProcurementOptionListItemView {
  const tone = getListingTone(listing)

  return {
    id: listing.id,
    title: listing.itemName,
    subtitle: listing.description,
    sourceLabel: `${listing.featured ? 'Featured / ' : ''}${listing.source.replace(/_/g, ' ')}`,
    costLabel: `${formatCurrency(listing.buyPrice)} / bundle`,
    availabilityLabel:
      listing.availableBundles > 0
        ? `${pluralize(listing.availableBundles, 'bundle')} open`
        : 'Channel exhausted',
    affordabilityLabel:
      game.funding >= listing.buyPrice
        ? `Affordable now (${formatCurrency(game.funding)} on hand)`
        : MARKET_UI_TEXT.insufficientFundingBy.replace(
            '{amount}',
            formatCurrency(Math.max(0, listing.buyPrice - game.funding))
          ),
    tone,
    ...(listing.buyBlockedReason || listing.sellBlockedReason
      ? { blockerSummary: listing.buyBlockedReason ?? listing.sellBlockedReason }
      : {}),
  }
}

function buildBudgetPreview(
  game: GameState,
  listing: MarketListingView,
  bundles: number
): ProcurementBudgetPreviewView {
  const totalCost = listing.buyPrice * bundles

  if (listing.availableBundles < bundles) {
    return {
      label: `Buy ${bundles}`,
      totalCostLabel: formatCurrency(totalCost),
      fundingAfterLabel: formatCurrency(game.funding),
      pressureAfterLabel: `${assessFundingPressure(game).budgetPressure}/4`,
      consequenceSummary:
        listing.availableBundles < 1
          ? 'No supplier stock remains on the current market week.'
          : `Only ${pluralize(listing.availableBundles, 'bundle')} remain visible this week.`,
      affordable: false,
      blockedReason:
        listing.availableBundles < 1
          ? MARKET_UI_TEXT.exhaustedListing
          : `Only ${pluralize(listing.availableBundles, 'bundle')} are available right now.`,
    }
  }

  if (game.funding < totalCost) {
    return {
      label: `Buy ${bundles}`,
      totalCostLabel: formatCurrency(totalCost),
      fundingAfterLabel: formatCurrency(game.funding),
      pressureAfterLabel: `${assessFundingPressure(game).budgetPressure}/4`,
      consequenceSummary: 'Current funds do not cover this procurement action.',
      affordable: false,
      blockedReason: MARKET_UI_TEXT.insufficientFundingBy.replace(
        '{amount}',
        formatCurrency(Math.max(0, totalCost - game.funding))
      ),
    }
  }

  const nextGame = previewPurchaseMarketInventory(game, listing.id, bundles)
  const nextFundingPressure = assessFundingPressure(nextGame)
  const currentFundingPressure = assessFundingPressure(game)
  const pressureDelta = nextFundingPressure.budgetPressure - currentFundingPressure.budgetPressure

  return {
    label: `Buy ${bundles}`,
    totalCostLabel: formatCurrency(totalCost),
    fundingAfterLabel: formatCurrency(nextGame.funding),
    pressureAfterLabel: `${nextFundingPressure.budgetPressure}/4`,
    consequenceSummary:
      pressureDelta > 0
        ? `Raises budget pressure by ${pressureDelta} step${pressureDelta === 1 ? '' : 's'} and leaves ${formatCurrency(nextGame.funding)} available.`
        : `Leaves budget pressure steady and drops funding to ${formatCurrency(nextGame.funding)}.`,
    affordable: true,
  }
}

function buildProcurementDetailView(listing: MarketListingView, game: GameState): ProcurementDetailView {
  const selectedTransactions = getCurrentWeekMarketTransactions(game)
    .filter((entry) => entry.listingId === listing.id)
    .slice(0, 2)

  return {
    id: listing.id,
    title: listing.itemName,
    description: listing.description,
    sourceLabel: listing.source.replace(/_/g, ' '),
    availabilityLabel:
      listing.availableBundles > 0
        ? `${pluralize(listing.availableBundles, 'bundle')} open this week`
        : 'Supplier channel exhausted this week',
    affordabilityLabel:
      listing.canBuyOne
        ? `Affordable now at ${formatCurrency(listing.buyPrice)} per bundle`
        : listing.buyBlockedReason ?? 'Current funding does not cover this procurement action.',
    costDetails: uniqueBounded(
      [
        `Buy 1 bundle: ${formatCurrency(listing.buyPrice)} for ${listing.bundleQuantity} unit${listing.bundleQuantity === 1 ? '' : 's'}.`,
        `Buy 3 bundles: ${formatCurrency(listing.buyPrice * 3)} if stock and funding hold.`,
        `Sell 1 bundle: ${formatCurrency(listing.sellPrice)} recovery value.`,
        typeof listing.fabricationCost === 'number'
          ? `Fabrication alternative: ${formatCurrency(listing.fabricationCost)}.`
          : 'No fabrication alternative is exposed for this line.',
      ],
      4
    ),
    acquisitionDetails: uniqueBounded(
      [
        `Source: ${listing.featured ? 'featured ' : ''}${listing.source.replace(/_/g, ' ')} / ${listing.category}.`,
        `Current stock on hand: ${listing.inventoryStock}.`,
        `Market pressure: ${listing.pressureLabel}.`,
        selectedTransactions.length > 0
          ? `This week: ${selectedTransactions
              .map(
                (entry) =>
                  `${entry.action === 'buy' ? 'bought' : 'sold'} ${entry.quantity} for ${formatCurrency(entry.totalPrice)}`
              )
              .join('; ')}.`
          : 'No current-week transaction has hit this line yet.',
      ],
      4
    ),
    blockerDetails: uniqueBounded(
      [
        listing.buyBlockedReason ?? '',
        listing.sellBlockedReason ?? '',
        listing.availableBundles < 1
          ? 'Current-week supplier availability is exhausted for this listing.'
          : '',
        typeof listing.fabricationCost === 'number'
          ? 'Fabrication remains the slower but stable fallback if supplier stock collapses.'
          : '',
      ],
      4
    ),
    budgetPreviews: [buildBudgetPreview(game, listing, 1), buildBudgetPreview(game, listing, 3)],
    backlogImpactSummary:
      'Direct market procurement resolves immediately through the live weekly exchange and does not add a new supplier backlog entry.',
    tags: listing.tags.slice(0, 6),
    canBuyOne: listing.canBuyOne,
    canBuyThree: listing.canBuyThree,
    canSellOne: listing.canSellOne,
    canSellThree: listing.canSellThree,
    ...(listing.buyBlockedReason ? { buyBlockedReason: listing.buyBlockedReason } : {}),
    ...(listing.sellBlockedReason ? { sellBlockedReason: listing.sellBlockedReason } : {}),
  }
}

function buildProcurementBudgetSummary(
  game: GameState,
  fundingState: ReturnType<typeof getCanonicalFundingState>,
  fundingPressure: ReturnType<typeof assessFundingPressure>,
  pendingBacklogCount: number
): ProcurementBudgetSummaryView {
  return {
    fundingLabel: formatCurrency(game.funding),
    marketPressureLabel: game.market.pressure.toUpperCase(),
    budgetPressureLabel: `${fundingPressure.budgetPressure}/4`,
    pendingBacklogLabel: String(pendingBacklogCount),
    summary:
      pendingBacklogCount > 0
        ? `${pluralize(pendingBacklogCount, 'pending supplier request')} and budget pressure ${fundingPressure.budgetPressure}/4 are currently shaping procurement flexibility.`
        : `Budget pressure is ${fundingPressure.budgetPressure}/4 and there are no pending supplier requests.`,
    details: uniqueBounded(
      [
        `Available funding: ${formatCurrency(fundingState.funding)}.`,
        fundingPressure.staleProcurementRequestIds.length > 0
          ? `${pluralize(fundingPressure.staleProcurementRequestIds.length, 'stale supplier request')} are now pressuring upgrades and readiness.`
          : '',
        fundingPressure.severeConstraint
          ? 'Current budget strain is severe enough to constrain facility progression and recovery throughput.'
          : fundingPressure.constrained
            ? 'Budget strain is present, but not yet at the severe constraint threshold.'
            : 'No current budget constraint is blocking wider campaign systems.',
        fundingPressure.pendingProcurementRequestIds.length > 0
          ? `${pluralize(fundingPressure.pendingProcurementRequestIds.length, 'backlog entry')} are already consuming supplier attention.`
          : '',
      ],
      4
    ),
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
