import '../../test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { DEFAULT_MARKET_FILTERS, getFilteredMarketListings } from './marketView'
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
    expect(screen.getByRole('heading', { name: /current week procurement log/i })).toBeInTheDocument()
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
    expect(screen.getByText(new RegExp(`Purchased ${listing!.bundleQuantity}x ${listing!.itemName}`, 'i'))).toBeInTheDocument()
  })

  it('sells one bundle and updates funding, inventory, and transaction history', async () => {
    const user = userEvent.setup()
    const initial = createStartingState()
    const listings = getFilteredMarketListings(initial, DEFAULT_MARKET_FILTERS)
    const listingIndex = listings.findIndex((candidate) => candidate.inventoryStock >= candidate.bundleQuantity)
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
    expect(screen.getByText(new RegExp(`Sold ${listing!.bundleQuantity}x ${listing!.itemName}`, 'i'))).toBeInTheDocument()
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

    renderMarketPage(['/markets-suppliers?q=kit&category=featured&sort=price-desc', '/equipment'], 1)

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
