import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { MARKET_SOURCE_LABELS, MARKET_UI_TEXT } from '../../data/copy'
import { buildEconomyLoopOverview } from '../../domain/economy'
import {
  getLicensedHandlingAttestationWeekBaselined,
  isLicensedHandlingAttestationStale,
  LICENSED_HANDLING_ATTESTATION_TTL_WEEKS,
} from '../../domain/market'
import { canInvokeEmergencyGrayMarketWaiver } from '../../domain/procurementEmergency'
import {
  DEFAULT_MARKET_FILTERS,
  MARKET_CATEGORY_FILTERS,
  MARKET_SORTS,
  getCurrentWeekMarketTransactions,
  getFeaturedMarketListing,
  getFilteredMarketListings,
  readMarketFilters,
  writeMarketFilters,
  type MarketFilters,
} from './marketView'

const MARKET_SORT_LABELS: Record<(typeof MARKET_SORTS)[number], string> = {
  recommended: 'Recommended',
  name: 'Name',
  'price-asc': 'Buy price (Low to High)',
  'price-desc': 'Buy price (High to Low)',
  availability: 'Availability',
}

const MARKET_CATEGORY_LABELS: Record<(typeof MARKET_CATEGORY_FILTERS)[number], string> = {
  all: 'All categories',
  equipment: 'Equipment',
  component: 'Components',
  material: 'Materials',
  featured: 'Featured only',
}

export default function MarketPage() {
  const {
    game,
    purchaseMarketInventory,
    placeDelayedMarketOrder,
    redeemFactionFavorProcurement,
    sellMarketInventory,
    acknowledgeLicensedHandlingDoctrine,
    invokeEmergencyGrayMarketWaiver,
  } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readMarketFilters(searchParams)
  const normalizedSearchParams = writeMarketFilters(filters)
  const normalizedSearch = normalizedSearchParams.toString()
  const listings = getFilteredMarketListings(game, filters)
  const featuredListing = getFeaturedMarketListing(game)
  const transactions = getCurrentWeekMarketTransactions(game)
  const economy = buildEconomyLoopOverview(game)

  useEffect(() => {
    if (searchParams.toString() !== normalizedSearch) {
      setSearchParams(normalizedSearchParams, { replace: true })
    }
  }, [normalizedSearch, normalizedSearchParams, searchParams, setSearchParams])

  function updateFilters(patch: Partial<MarketFilters>) {
    setSearchParams(writeMarketFilters({ ...filters, ...patch }), { replace: true })
  }

  const totalAvailability = listings.reduce((sum, listing) => sum + listing.availableBundles, 0)
  const inventoryBackedListings = listings.filter((listing) => listing.inventoryStock > 0).length

  return (
    <section className="space-y-4">
      <article
        className="panel panel-primary space-y-3"
        role="region"
        aria-label="Procurement overview"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{MARKET_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{MARKET_UI_TEXT.pageSubtitle}</p>
          </div>

          <div className="flex gap-2">
            <Link to={APP_ROUTES.fabrication} className="btn btn-sm btn-ghost">
              Fabrication Lab
            </Link>
            <Link to={APP_ROUTES.equipment} className="btn btn-sm btn-ghost">
              Quartermaster
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label={MARKET_UI_TEXT.pressureLabel} value={game.market.pressure.toUpperCase()} />
          <Metric
            label={MARKET_UI_TEXT.multiplierLabel}
            value={`${game.market.costMultiplier.toFixed(2)}x`}
          />
          <Metric
            label={MARKET_UI_TEXT.featuredLabel}
            value={featuredListing?.itemName ?? game.market.featuredRecipeId}
          />
          <Metric label={MARKET_UI_TEXT.availableFundingLabel} value={`$${game.funding}`} />
        </div>
      </article>

      <article
        className="panel panel-support space-y-3"
        role="region"
        aria-label="Procurement model"
      >
        <h3 className="text-base font-semibold">Procurement model</h3>
        <p className="text-sm opacity-60">
          Listings are derived deterministically from the current market week, supply pressure,
          featured fabrication output, market packets, seeded availability, and explicit access
          classes. Procurement reduces weekly channel availability. Selling returns stock to the
          exchange at a lower recovery price for the same week.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Market week" value={String(game.market.week)} />
          <Metric label="Visible listings" value={String(listings.length)} />
          <Metric label="Available bundles" value={String(totalAvailability)} />
          <Metric label="Stocked listings" value={String(inventoryBackedListings)} />
        </div>
      </article>

      <article className="panel panel-support space-y-3" role="region" aria-label="Economy loop">
        <h3 className="text-base font-semibold">Economy loop</h3>
        <p className="text-sm opacity-60">
          Procurement, fabrication, and operation rewards now resolve into one deterministic supply
          picture. Market transactions change funding immediately, fabrication converts materials
          into gear over weekly time, and mission rewards feed new stock back into the ledger.
        </p>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Net procurement" value={`$${economy.transactionSummary.netFunding}`} />
          <Metric label="Reward funding" value={`$${economy.rewardFlow.funding}`} />
          <Metric label="Liquidation value" value={`$${economy.inventoryLiquidationValue}`} />
          <Metric label="Queued outputs" value={String(economy.queuedOutputUnits)} />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Fabrication edge</p>
            <ul className="mt-2 space-y-2 text-sm">
              {economy.bestRecipeEdges.map((entry) => (
                <li key={entry.recipeId}>
                  <span className="font-medium">{entry.recipeName}</span>
                  <span className="opacity-60">
                    {' '}
                    / save ${entry.savings} / fabricate ${entry.fabricationCost} / market $
                    {entry.marketCost}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Material pressure</p>
            <ul className="mt-2 space-y-2 text-sm">
              {economy.materialPressure.map((entry) => (
                <li key={entry.materialId}>
                  <span className="font-medium">{entry.label}</span>
                  <span className="opacity-60">
                    {' '}
                    / stock {entry.stock} / queued demand {entry.queuedDemand} / blocked recipes{' '}
                    {entry.blockingRecipeCount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>

      {isLicensedHandlingAttestationStale(game) ? (
        <article
          className="panel space-y-3 border-amber-500/35 bg-amber-950/25"
          role="region"
          aria-label="Licensed handling doctrine attestation"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-amber-100">
                Licensed handling doctrine attestation stale
              </h3>
              <p className="mt-1 text-sm opacity-80">
                Last acknowledged campaign week {getLicensedHandlingAttestationWeekBaselined(game)}.
                Controlled procurement that uses the licensed handling desk is blocked until
                doctrine is re-attested (required after more than{' '}
                {LICENSED_HANDLING_ATTESTATION_TTL_WEEKS} campaign week
                {LICENSED_HANDLING_ATTESTATION_TTL_WEEKS === 1 ? '' : 's'} since that
                acknowledgement).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary shrink-0"
              onClick={acknowledgeLicensedHandlingDoctrine}
            >
              Acknowledge doctrine
            </button>
          </div>
        </article>
      ) : null}

      {canInvokeEmergencyGrayMarketWaiver(game) ? (
        <article
          className="panel space-y-3 border-rose-500/35 bg-rose-950/20"
          role="region"
          aria-label="Emergency gray-market waiver"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-rose-100">Crisis procurement waiver</h3>
              <p className="mt-1 text-sm opacity-80">
                Crisis pressure band + sanctioned posture: record a one-week waiver to reach the
                gray-market broker despite audit lockout. Applies legitimacy fallout risk.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary shrink-0"
              onClick={invokeEmergencyGrayMarketWaiver}
            >
              Record emergency waiver
            </button>
          </div>
        </article>
      ) : null}
      <article className="panel panel-primary space-y-4" role="region" aria-label="Market filters">
        <div className="grid gap-3 md:grid-cols-3">
          <FilterInput
            id="market-search"
            label="Search"
            value={filters.q}
            onChange={(value) => updateFilters({ q: value })}
            type="search"
            placeholder="Search procurement channels"
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            inputClassName="form-input"
          />

          <FilterSelect
            id="market-category"
            label="Category"
            value={filters.category}
            onChange={(value) => updateFilters({ category: value as MarketFilters['category'] })}
            options={MARKET_CATEGORY_FILTERS.map((option) => ({
              value: option,
              label: MARKET_CATEGORY_LABELS[option],
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />

          <FilterSelect
            id="market-sort"
            label="Sort"
            value={filters.sort}
            onChange={(value) => updateFilters({ sort: value as MarketFilters['sort'] })}
            options={MARKET_SORTS.map((option) => ({
              value: option,
              label: MARKET_SORT_LABELS[option],
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-sm opacity-70">
          <p>
            Showing {listings.length} procurement line{listings.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() =>
              setSearchParams(writeMarketFilters(DEFAULT_MARKET_FILTERS), { replace: true })
            }
          >
            Clear filters
          </button>
        </div>
      </article>

      {listings.length > 0 ? (
        <ul className="space-y-3" aria-label="Market listings">
          {listings.map((listing) => (
            <li key={listing.id} className="panel panel-support space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{listing.itemName}</p>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-60">
                    {MARKET_SOURCE_LABELS[listing.source]} /{' '}
                    {listing.featured ? 'Featured' : listing.category}
                  </p>
                  <p className="mt-1 text-sm opacity-65">{listing.description}</p>
                </div>

                <div className="text-right text-xs uppercase tracking-[0.2em] opacity-60">
                  <p>Stock {listing.inventoryStock}</p>
                  <p>{listing.availableBundles} bundle(s) left</p>
                </div>
              </div>

              <div className="grid gap-2 text-sm opacity-75 md:grid-cols-5">
                <p>Bundle qty: {listing.bundleQuantity}</p>
                <p>Buy: ${listing.buyPrice}</p>
                <p>Sell: ${listing.sellPrice}</p>
                <p>Pressure: {listing.pressureLabel}</p>
                <p>Access: {listing.accessLabel}</p>
              </div>

              <div className="grid gap-2 text-xs opacity-70 md:grid-cols-3">
                <p>Acquisition: {listing.acquisitionClass}</p>
                <p>
                  Funding:{' '}
                  {listing.canAffordOne
                    ? `Affordable with $${game.funding} on hand`
                    : (listing.budgetBlockedReason ?? 'Budget blocked')}
                </p>
                <p>
                  Availability:{' '}
                  {listing.accessAvailable
                    ? listing.availableBundles > 0
                      ? `${listing.availableBundles} bundle(s) open`
                      : (listing.availabilityBlockedReason ?? 'Channel exhausted')
                    : (listing.accessBlockedReason ?? 'Access blocked')}
                </p>
              </div>

              <div className="grid gap-2 text-xs opacity-70 md:grid-cols-4">
                <p>Exchange: {listing.marketPacket.label}</p>
                <p>Boundary: {listing.marketPacket.marketBoundary}</p>
                <p>Legality: {listing.marketPacket.legalityAccessMode}</p>
                <p>Liquidity: {listing.marketPacket.liquidityProfile}</p>
              </div>

              <div className="grid gap-2 text-xs opacity-70 md:grid-cols-3">
                <p>
                  Supplier attention: {listing.allocationStatus.available}/
                  {listing.allocationStatus.capacity} open
                </p>
                <p>Allocation state: {listing.allocationStatus.state.replace(/_/g, ' ')}</p>
                <p>
                  Displaced use:{' '}
                  {listing.allocationStatus.displacedAlternativeUse ?? 'None this market week'}
                </p>
              </div>

              {listing.allocationStatus.substitution ? (
                <p className="text-xs text-amber-200">
                  Degraded substitute: {listing.allocationStatus.substitution.summary}
                </p>
              ) : null}

              {listing.resourceStatuses
                .filter((status) => status !== listing.allocationStatus)
                .map((status) => (
                  <div
                    key={`${listing.id}-${status.resourceClass}-${status.source}`}
                    className="grid gap-2 text-xs opacity-70 md:grid-cols-3"
                  >
                    <p>
                      {status.sourceLabel}: {status.available}/{status.capacity} open
                    </p>
                    <p>
                      {status.resourceClass.replace(/_/g, ' ')}: {status.state.replace(/_/g, ' ')}
                    </p>
                    <p>
                      Displaced use: {status.displacedAlternativeUse ?? 'None this market week'}
                    </p>
                  </div>
                ))}

              {listing.resourceStatuses
                .filter((status) => status !== listing.allocationStatus && status.substitution)
                .map((status) => (
                  <p
                    key={`${listing.id}-${status.resourceClass}-${status.source}-substitution`}
                    className="text-xs text-amber-200"
                  >
                    Degraded substitute: {status.substitution!.summary}
                  </p>
                ))}

              {listing.marketPacket.knownDistortions.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs opacity-65">
                  {listing.marketPacket.knownDistortions.map((distortion) => (
                    <span
                      key={`${listing.id}-${distortion}`}
                      className="rounded border border-white/10 px-2 py-1"
                    >
                      {distortion}
                    </span>
                  ))}
                </div>
              ) : null}

              {listing.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs opacity-65">
                  {listing.tags.map((tag) => (
                    <span
                      key={`${listing.id}-${tag}`}
                      className="rounded border border-white/10 px-2 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {listing.fabricationCost !== undefined ? (
                <p className="text-xs opacity-60">Fabrication cost: ${listing.fabricationCost}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                {!listing.cashPurchaseAllowed && listing.favorExchange ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!listing.canRedeemFavorOne}
                      onClick={() => redeemFactionFavorProcurement(listing.id, 1)}
                    >
                      {MARKET_UI_TEXT.redeemFavorOne}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={!listing.canRedeemFavorThree}
                      onClick={() => redeemFactionFavorProcurement(listing.id, 3)}
                    >
                      {MARKET_UI_TEXT.redeemFavorThree}
                    </button>
                  </>
                ) : listing.delayedFulfillmentWeeks ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!listing.canOrderOne}
                      onClick={() => placeDelayedMarketOrder(listing.id, 1)}
                    >
                      {MARKET_UI_TEXT.orderOne}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={!listing.canOrderThree}
                      onClick={() => placeDelayedMarketOrder(listing.id, 3)}
                    >
                      {MARKET_UI_TEXT.orderThree}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!listing.canBuyOne}
                      onClick={() => purchaseMarketInventory(listing.id, 1)}
                    >
                      {MARKET_UI_TEXT.buyOne}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={!listing.canBuyThree}
                      onClick={() => purchaseMarketInventory(listing.id, 3)}
                    >
                      {MARKET_UI_TEXT.buyThree}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={!listing.canSellOne}
                  onClick={() => sellMarketInventory(listing.id, 1)}
                >
                  {MARKET_UI_TEXT.sellOne}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={!listing.canSellThree}
                  onClick={() => sellMarketInventory(listing.id, 3)}
                >
                  {MARKET_UI_TEXT.sellThree}
                </button>
              </div>

              {listing.buyBlockedReason || listing.orderBlockedReason || listing.sellBlockedReason ? (
                <div className="space-y-1 text-xs text-amber-200">
                  {listing.buyBlockedReason ? <p>{listing.buyBlockedReason}</p> : null}
                  {listing.orderBlockedReason ? <p>{listing.orderBlockedReason}</p> : null}
                  {listing.sellBlockedReason ? <p>{listing.sellBlockedReason}</p> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel panel-support p-4 text-sm opacity-70">
          {MARKET_UI_TEXT.noListings}
        </div>
      )}

      <article className="panel panel-support space-y-3" role="region" aria-label="Procurement log">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{MARKET_UI_TEXT.transactionLogHeading}</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
          </p>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm opacity-60">{MARKET_UI_TEXT.noTransactions}</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((transaction) => (
              <li key={transaction.eventId} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {transaction.action === 'buy'
                        ? 'Purchased'
                        : transaction.action === 'order'
                          ? 'Ordered'
                          : transaction.action === 'fulfill'
                            ? 'Delivered'
                            : 'Sold'}{' '}
                      {transaction.quantity}x {transaction.itemName}
                    </p>
                    <p className="text-sm opacity-60">
                      Week {transaction.week} / Market week {transaction.marketWeek}
                    </p>
                    {transaction.allocation ? (
                      <p className="text-xs opacity-60">
                        Allocation: {transaction.allocation.sourceLabel} /{' '}
                        {transaction.allocation.substitutionStatus.replace(/_/g, ' ')}
                        {transaction.allocation.delayWeeks > 0
                          ? ` / ${transaction.allocation.delayWeeks}w delay`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm opacity-70">
                    <p>
                      {transaction.action === 'buy' ? '-' : '+'}${transaction.totalPrice}
                    </p>
                    <p>{transaction.remainingAvailability} units left</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
