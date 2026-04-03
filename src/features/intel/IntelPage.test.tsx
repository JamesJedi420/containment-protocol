import '../../test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import IntelPage from './IntelPage'

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

function renderIntelPage(initialEntries = ['/intel'], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route
          path="/intel"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <IntelPage />
            </>
          }
        />
        <Route
          path="/intel/:templateId"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <div data-testid="intel-detail-page">Intel detail placeholder</div>
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

describe('IntelPage', () => {
  it('renders intel filter region with controls', () => {
    renderIntelPage()

    const filterRegion = screen.getByRole('region', { name: /intel filters/i })

    expect(filterRegion).toBeInTheDocument()
    expect(screen.getByLabelText(/^search$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mode$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^kind$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^pressure$/i)).toBeInTheDocument()
  })

  it('hydrates mode filter from URL deep-link', async () => {
    renderIntelPage(['/intel?mode=threshold'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^mode$/i)).toHaveValue('threshold')
    })

    expect(screen.getByTestId('location-search')).toHaveTextContent('?mode=threshold')
  })

  it('hydrates kind filter from URL deep-link', async () => {
    renderIntelPage(['/intel?kind=case'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^kind$/i)).toHaveValue('case')
    })

    expect(screen.getByTestId('location-search')).toHaveTextContent('?kind=case')
  })

  it('hydrates pressure filter from URL deep-link', async () => {
    renderIntelPage(['/intel?pressure=critical'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^pressure$/i)).toHaveValue('critical')
    })

    expect(screen.getByTestId('location-search')).toHaveTextContent('?pressure=critical')
  })

  it('sanitizes invalid query params and falls back to defaults', async () => {
    renderIntelPage(['/intel?mode=advanced&kind=signal&q=%20%20'])

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('')
    })

    expect(screen.getByLabelText(/^search$/i)).toHaveValue('')
    expect(screen.getByLabelText(/^mode$/i)).toHaveValue('all')
    expect(screen.getByLabelText(/^kind$/i)).toHaveValue('all')
    expect(screen.getByLabelText(/^pressure$/i)).toHaveValue('all')
  })

  it('updates query string when filters change interactively', async () => {
    const user = userEvent.setup()
    renderIntelPage()

    await user.type(screen.getByLabelText(/^search$/i), 'incident')
    await user.selectOptions(screen.getByLabelText(/^mode$/i), 'threshold')
    await user.selectOptions(screen.getByLabelText(/^kind$/i), 'case')
    await user.selectOptions(screen.getByLabelText(/^pressure$/i), 'critical')

    await waitFor(() => {
      const locationSearch = screen.getByTestId('location-search').textContent ?? ''
      const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

      expect(params.get('q')).toBe('incident')
      expect(params.get('mode')).toBe('threshold')
      expect(params.get('kind')).toBe('case')
      expect(params.get('pressure')).toBe('critical')
    })
  })

  it('has accessible filter region with proper semantics', () => {
    renderIntelPage()

    const filterRegion = screen.getByRole('region', { name: /intel filters/i })
    expect(filterRegion).toBeInTheDocument()

    expect(screen.getByLabelText(/^search$/i)).toHaveAttribute('id')
    expect(screen.getByLabelText(/^mode$/i)).toHaveAttribute('id')
    expect(screen.getByLabelText(/^kind$/i)).toHaveAttribute('id')
    expect(screen.getByLabelText(/^pressure$/i)).toHaveAttribute('id')
  })

  it('rehydrates filter controls from URL after remount', async () => {
    const firstRender = renderIntelPage(['/intel?q=incident&mode=threshold&kind=case&pressure=critical'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('incident')
      expect(screen.getByLabelText(/^mode$/i)).toHaveValue('threshold')
      expect(screen.getByLabelText(/^kind$/i)).toHaveValue('case')
      expect(screen.getByLabelText(/^pressure$/i)).toHaveValue('critical')
    })

    firstRender.unmount()

    renderIntelPage(['/intel?q=incident&mode=threshold&kind=case&pressure=critical'])

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('incident')
      expect(screen.getByLabelText(/^mode$/i)).toHaveValue('threshold')
      expect(screen.getByLabelText(/^kind$/i)).toHaveValue('case')
      expect(screen.getByLabelText(/^pressure$/i)).toHaveValue('critical')
    })
  })

  it('restores filter URL when navigating back from intel detail and forward again', async () => {
    const user = userEvent.setup()

    renderIntelPage(
      ['/intel?q=incident&mode=threshold&kind=case&pressure=critical', '/intel/template-1'],
      1
    )

    expect(screen.getByTestId('intel-detail-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /go back/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('incident')
      expect(screen.getByLabelText(/^mode$/i)).toHaveValue('threshold')
      expect(screen.getByLabelText(/^kind$/i)).toHaveValue('case')
      expect(screen.getByLabelText(/^pressure$/i)).toHaveValue('critical')
    })

    await user.click(screen.getByRole('button', { name: /go forward/i }))

    await waitFor(() => {
      expect(screen.getByTestId('intel-detail-page')).toBeInTheDocument()
    })
  })
})
