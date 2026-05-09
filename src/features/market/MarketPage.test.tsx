// @vitest-environment jsdom
import '../../test/setup'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { purchaseMarketInventory } from '../../domain/sim/market'
import { queueFabrication } from '../../domain/sim/production'
import { useGameStore } from '../../app/store/gameStore'
import { DEFAULT_MARKET_FILTERS, getFilteredMarketListings, getMarketListings } from './marketView'
import MarketPage from './MarketPage'

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}

function HistoryNavControls() {
  const navigate = useNavigate()

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Go forward
      </button>
    </div>
  )
}

function renderMarketPage(initialEntries = ['/markets-suppliers'], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route
          path="/markets-suppliers"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <MarketPage />
            </>
          }
        />
        <Route
          path="/equipment"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <div data-testid="equipment-page">Equipment placeholder</div>
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

function createDiscountedMarketState() {
  const game = createStartingState()

  return {
    ...game,
    market: {
      ...game.market,
      pressure: 'discounted' as const,
    },
  }
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('MarketPage', () => {
  it('renders listings, filters, and current week transaction history', () => {
    renderMarketPage()

    expect(screen.getByRole('heading', { name: /^market$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /procurement model/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /economy loop/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /current week procurement log/i })
    ).toBeInTheDocument()
  })

  it('hydrates URL filters from deep-link params', async () => {
    renderMarketPage(['/markets-suppliers?q=kit&category=featured&sort=price-desc'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('kit')
      expect(screen.getByLabelText(/^category$/i)).toHaveValue('featured')
      expect(screen.getByLabelText(/^sort$/i)).toHaveValue('price-desc')
    })

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?q=kit&category=featured&sort=price-desc'
    )
  })

  it('normalizes invalid market query params to canonical defaults', async () => {
    renderMarketPage(['/markets-suppliers?q=%20%20%20&category=bogus&sort=broken'])

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('')
    })

    expect(screen.getByLabelText(/^search$/i)).toHaveValue('')
    expect(screen.getByLabelText(/^category$/i)).toHaveValue('all')
    expect(screen.getByLabelText(/^sort$/i)).toHaveValue('recommended')
  })

  it('updates URL query when market filters change interactively', async () => {
    const user = userEvent.setup()

    renderMarketPage()

    await user.type(screen.getByLabelText(/^search$/i), 'kit')
    await user.selectOptions(screen.getByLabelText(/^category$/i), 'featured')
    await user.selectOptions(screen.getByLabelText(/^sort$/i), 'price-desc')

    await waitFor(() => {
      const locationSearch = screen.getByTestId('location-search').textContent ?? ''
      const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

      expect(params.get('q')).toBe('kit')
      expect(params.get('category')).toBe('featured')
      expect(params.get('sort')).toBe('price-desc')
    })
  })

  it('clears market filters and URL query via clear button', async () => {
    const user = userEvent.setup()

    renderMarketPage(['/markets-suppliers?q=kit&category=featured&sort=price-desc'])

    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('')
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('')
      expect(screen.getByLabelText(/^category$/i)).toHaveValue('all')
      expect(screen.getByLabelText(/^sort$/i)).toHaveValue('recommended')
    })
  })

  it('rehydrates market filters from URL after remount', async () => {
    const firstRender = renderMarketPage(['/markets-suppliers?q=kit&category=featured&sort=name'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('kit')
      expect(screen.getByLabelText(/^category$/i)).toHaveValue('featured')
      expect(screen.getByLabelText(/^sort$/i)).toHaveValue('name')
    })

    firstRender.unmount()

    renderMarketPage(['/markets-suppliers?q=kit&category=featured&sort=name'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('kit')
      expect(screen.getByLabelText(/^category$/i)).toHaveValue('featured')
      expect(screen.getByLabelText(/^sort$/i)).toHaveValue('name')
    })
  })

  it('purchases one bundle and updates funding, inventory, and transaction history', async () => {
    const user = userEvent.setup()
    const initial = createStartingState()
    const listing = getFilteredMarketListings(initial, DEFAULT_MARKET_FILTERS)[0]

    expect(listing).toBeDefined()

    useGameStore.setState({ game: initial })
    renderMarketPage()

    const beforeFunding = useGameStore.getState().game.funding
    const beforeStock = useGameStore.getState().game.inventory[listing!.itemId] ?? 0

    await user.click(screen.getAllByRole('button', { name: /buy 1 bundle/i })[0]!)

    const nextGame = useGameStore.getState().game
    expect(nextGame.funding).toBe(beforeFunding - listing!.buyPrice)
    expect(nextGame.inventory[listing!.itemId]).toBe(beforeStock + listing!.bundleQuantity)
    expect(
      screen.getByText(
        new RegExp(`Purchased ${listing!.bundleQuantity}x ${listing!.itemName}`, 'i')
      )
    ).toBeInTheDocument()
  })

  it('sells one bundle and updates funding, inventory, and transaction history', async () => {
    const user = userEvent.setup()
    const initial = createStartingState()
    const listings = getFilteredMarketListings(initial, DEFAULT_MARKET_FILTERS)
    const listingIndex = listings.findIndex(
      (candidate) => candidate.inventoryStock >= candidate.bundleQuantity
    )
    const listing = listingIndex >= 0 ? listings[listingIndex] : undefined

    expect(listing).toBeDefined()

    useGameStore.setState({ game: initial })
    renderMarketPage()

    const beforeFunding = useGameStore.getState().game.funding
    const beforeStock = useGameStore.getState().game.inventory[listing!.itemId] ?? 0

    await user.click(screen.getAllByRole('button', { name: /sell 1 bundle/i })[listingIndex]!)

    const nextGame = useGameStore.getState().game
    expect(nextGame.funding).toBe(beforeFunding + listing!.sellPrice)
    expect(nextGame.inventory[listing!.itemId]).toBe(beforeStock - listing!.bundleQuantity)
    expect(
      screen.getByText(new RegExp(`Sold ${listing!.bundleQuantity}x ${listing!.itemName}`, 'i'))
    ).toBeInTheDocument()
  })

  it('disables buy actions and shows funding shortfall when funding is insufficient', () => {
    const game = createStartingState()
    game.funding = 0
    useGameStore.setState({ game })

    renderMarketPage()

    const buyButtons = screen.getAllByRole('button', { name: /buy 1 bundle/i })
    expect(buyButtons.length).toBeGreaterThan(0)
    expect(buyButtons[0]).toBeDisabled()
    expect(screen.getAllByText(/need \+\$\d+/i).length).toBeGreaterThan(0)
  })

  it('shows access-class blockers separately from affordable funding', () => {
    const game = createStartingState()
    useGameStore.setState({ game })

    renderMarketPage()

    const restrictedRow = screen.getAllByText(/^advanced recon suite$/i)[0]?.closest('li')

    expect(restrictedRow).toBeTruthy()
    expect(
      within(restrictedRow!).getByText(/access: directorate special channel/i)
    ).toBeInTheDocument()
    expect(within(restrictedRow!).getByText(/funding: affordable/i)).toBeInTheDocument()
    expect(
      within(restrictedRow!).getAllByText(/directorate special channel locked/i).length
    ).toBeGreaterThan(0)
    expect(within(restrictedRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeDisabled()
  })

  it('shows market packet boundaries on procurement listings', () => {
    const game = createStartingState()
    useGameStore.setState({ game })

    renderMarketPage(['/markets-suppliers?q=combat%20stims'])

    const grayMarketRow = screen.getAllByText(/^combat stims$/i)[0]?.closest('li')

    expect(grayMarketRow).toBeTruthy()
    expect(within(grayMarketRow!).getByText(/exchange: gray-market broker/i)).toBeInTheDocument()
    expect(
      within(grayMarketRow!).getByText(/boundary: settlement-gray-market/i)
    ).toBeInTheDocument()
    expect(within(grayMarketRow!).getByText(/legality: covert/i)).toBeInTheDocument()
    expect(within(grayMarketRow!).getByText(/liquidity: thin/i)).toBeInTheDocument()
    expect(within(grayMarketRow!).getByText(/thin covert inventory/i)).toBeInTheDocument()
  })

  it('shows packet access blockers when a boundary forbids trade', () => {
    const game = createStartingState()
    game.legitimacy = {
      sanctionLevel: 'sanctioned',
      accessReason: 'audit posture',
      falloutRisk: 'none',
    }
    useGameStore.setState({ game })

    renderMarketPage(['/markets-suppliers?q=combat%20stims'])

    const grayMarketRow = screen.getAllByText(/^combat stims$/i)[0]?.closest('li')

    expect(grayMarketRow).toBeTruthy()
    expect(
      within(grayMarketRow!).getAllByText(/gray-market broker blocked: sanctioned audit posture/i)
        .length
    ).toBeGreaterThan(0)
    expect(within(grayMarketRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeDisabled()
  })

  it('shows degraded substitution when supplier attention is committed elsewhere', () => {
    const game = createStartingState()
    const fieldPlate = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'field_plate'
    )

    expect(fieldPlate).toBeDefined()

    useGameStore.setState({ game: purchaseMarketInventory(game, fieldPlate!.id, 1) })

    renderMarketPage(['/markets-suppliers?q=hazmat%20suit'])

    const hazmatRow = screen.getAllByText(/^hazmat suit$/i)[0]?.closest('li')

    expect(hazmatRow).toBeTruthy()
    expect(within(hazmatRow!).getByText(/supplier attention: 0\/1 open/i)).toBeInTheDocument()
    expect(within(hazmatRow!).getByText(/allocation state: substituted/i)).toBeInTheDocument()
    expect(within(hazmatRow!).getByText(/displaced use: field plate/i)).toBeInTheDocument()
    expect(within(hazmatRow!).getByText(/degraded substitute:/i)).toHaveTextContent(
      /gray-market broker/i
    )
    expect(within(hazmatRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeEnabled()
    expect(within(hazmatRow!).getByRole('button', { name: /buy 3 bundles/i })).toBeDisabled()
  })

  it('shows reagent stock blocking and degraded reagent substitution', () => {
    const game = queueFabrication(createStartingState(), 'ward-seals')
    useGameStore.setState({ game })

    const firstRender = renderMarketPage(['/markets-suppliers?q=ritual%20components'])

    const ritualListings = screen.getByRole('list', { name: /market listings/i })
    const ritualRow = within(ritualListings)
      .getAllByText(/^ritual components$/i)[0]
      ?.closest('li')

    expect(ritualRow).toBeTruthy()
    expect(within(ritualRow!).getByText(/occult reagents: 0\/1 open/i)).toBeInTheDocument()
    expect(within(ritualRow!).getByText(/reagent stock: committed elsewhere/i)).toBeInTheDocument()
    expect(within(ritualRow!).getByText(/displaced use: ward seal batch/i)).toBeInTheDocument()
    expect(within(ritualRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeDisabled()

    firstRender.unmount()

    renderMarketPage(['/markets-suppliers?q=emf%20sensors'])

    const emfListings = screen.getByRole('list', { name: /market listings/i })
    const emfRow = within(emfListings)
      .getAllByText(/^emf sensors$/i)[0]
      ?.closest('li')

    expect(emfRow).toBeTruthy()
    expect(within(emfRow!).getByText(/occult reagents: 0\/1 open/i)).toBeInTheDocument()
    expect(within(emfRow!).getByText(/reagent stock: substituted/i)).toBeInTheDocument()
    expect(within(emfRow!).getByText(/displaced use: ward seal batch/i)).toBeInTheDocument()
    expect(within(emfRow!).getByText(/degraded substitute:/i)).toHaveTextContent(
      /synthetic reagent substitute/i
    )
    expect(within(emfRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeEnabled()
    expect(within(emfRow!).getByRole('button', { name: /buy 3 bundles/i })).toBeDisabled()
  })

  it('shows licensed handling capacity blocking after a controlled purchase', () => {
    const game = createDiscountedMarketState()
    const combatStims = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(combatStims).toBeDefined()

    useGameStore.setState({ game: purchaseMarketInventory(game, combatStims!.id, 1) })

    renderMarketPage(['/markets-suppliers?q=hazmat%20suit'])

    const hazmatListings = screen.getByRole('list', { name: /market listings/i })
    const hazmatRow = within(hazmatListings)
      .getAllByText(/^hazmat suit$/i)[0]
      ?.closest('li')

    expect(hazmatRow).toBeTruthy()
    expect(within(hazmatRow!).getByText(/licensed handling desk: 0\/1 open/i)).toBeInTheDocument()
    expect(
      within(hazmatRow!).getByText(/licensed handling capacity: committed elsewhere/i)
    ).toBeInTheDocument()
    expect(within(hazmatRow!).getByText(/displaced use: combat stims/i)).toBeInTheDocument()
    expect(within(hazmatRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeDisabled()
  })

  it('shows stale doctrine banner and enables controlled procurement after acknowledgement', async () => {
    const base = createDiscountedMarketState()
    const game = {
      ...base,
      week: 8,
      market: {
        ...base.market,
        licensedHandlingAttestationWeek: 2,
      },
    }
    useGameStore.setState({ game })
    const user = userEvent.setup()
    renderMarketPage(['/markets-suppliers?q=combat%20stims'])

    expect(
      screen.getByRole('region', { name: /licensed handling doctrine attestation/i })
    ).toBeInTheDocument()

    const listings = screen.getByRole('list', { name: /market listings/i })
    const combatRow = within(listings)
      .getAllByText(/^combat stims$/i)[0]
      ?.closest('li')

    expect(combatRow).toBeTruthy()
    expect(
      within(combatRow!).getByText(/licensed handling capacity: attestation stale/i)
    ).toBeInTheDocument()
    expect(within(combatRow!).getByRole('button', { name: /buy 1 bundle/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /acknowledge doctrine/i }))

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: /licensed handling doctrine attestation/i })
      ).not.toBeInTheDocument()
    })

    const listingsAfter = screen.getByRole('list', { name: /market listings/i })
    const combatRowAfter = within(listingsAfter)
      .getAllByText(/^combat stims$/i)[0]
      ?.closest('li')

    expect(within(combatRowAfter!).getByRole('button', { name: /buy 1 bundle/i })).toBeEnabled()
  })

  it('disables sell actions and shows sell-blocked reason when stock is unavailable', () => {
    const game = createStartingState()
    game.inventory = Object.fromEntries(Object.keys(game.inventory).map((itemId) => [itemId, 0]))
    useGameStore.setState({ game })

    renderMarketPage()

    const sellButtons = screen.getAllByRole('button', { name: /sell 1 bundle/i })
    expect(sellButtons.length).toBeGreaterThan(0)
    expect(sellButtons[0]).toBeDisabled()
    expect(screen.getAllByText(/no matching stock available to sell\./i).length).toBeGreaterThan(0)
  })

  it('has accessible market filter region with labeled controls', () => {
    renderMarketPage()

    expect(screen.getByRole('region', { name: /market filters/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^search$/i)).toHaveAttribute('id', 'market-search')
    expect(screen.getByLabelText(/^category$/i)).toHaveAttribute('id', 'market-category')
    expect(screen.getByLabelText(/^sort$/i)).toHaveAttribute('id', 'market-sort')
  })

  it('restores market filters when navigating back from linked route and forward again', async () => {
    const user = userEvent.setup()

    renderMarketPage(
      ['/markets-suppliers?q=kit&category=featured&sort=price-desc', '/equipment'],
      1
    )

    expect(screen.getByTestId('equipment-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /go back/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('kit')
      expect(screen.getByLabelText(/^category$/i)).toHaveValue('featured')
      expect(screen.getByLabelText(/^sort$/i)).toHaveValue('price-desc')
    })

    await user.click(screen.getByRole('button', { name: /go forward/i }))

    await waitFor(() => {
      expect(screen.getByTestId('equipment-page')).toBeInTheDocument()
    })
  })
})
