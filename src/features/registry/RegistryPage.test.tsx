import '../../test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { REGISTRY_UI_TEXT } from '../../data/copy'
import AgentDetailPage from '../agents/AgentDetailPage'
import RegistryPage from './RegistryPage'

function createLargeRegistryState(totalAgents: number) {
  const game = createStartingState()
  const baseAgent = Object.values(game.agents)[0]

  if (!baseAgent) {
    return game
  }

  const generatedAgents = Array.from({ length: totalAgents }, (_, index) => {
    const id = `bulk-agent-${String(index + 1).padStart(3, '0')}`

    return [
      id,
      {
        ...baseAgent,
        id,
        name: `Bulk Agent ${String(index + 1).padStart(3, '0')}`,
        fatigue: (index * 3) % 60,
        role: index % 2 === 0 ? 'hunter' : 'investigator',
      },
    ]
  })

  game.agents = Object.fromEntries(generatedAgents)
  return game
}

function LocationSearchProbe() {
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

function renderRegistryPage(initialEntries = ['/registry'], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/registry">
          <Route
            index
            element={
              <>
                <LocationSearchProbe />
                <HistoryNavControls />
                <RegistryPage />
              </>
            }
          />
          <Route path=":agentId" element={<AgentDetailPage />} />
        </Route>
        <Route
          path="/agents"
          element={
            <>
              <LocationSearchProbe />
              <HistoryNavControls />
              <div data-testid="agents-page">Agents placeholder</div>
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

it('hydrates search from URL and filters registry list', async () => {
  const game = createStartingState()
  const [targetAgent, hiddenAgent] = Object.values(game.agents)

  useGameStore.setState({ game })
  renderRegistryPage([`/registry?q=${encodeURIComponent(targetAgent.name)}`])

  await waitFor(() => {
    expect(screen.getByDisplayValue(targetAgent.name)).toBeInTheDocument()
  })

  expect(screen.getByText(targetAgent.name)).toBeInTheDocument()
  expect(screen.queryByText(hiddenAgent.name)).not.toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent(
    `?q=${encodeURIComponent(targetAgent.name)}`
  )
})

it('updates query string when search changes and clears back to defaults', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)
  const searchToken = targetAgent.name.split(/\s+/)[0]

  useGameStore.setState({ game })
  renderRegistryPage(['/registry'])

  await user.type(screen.getByLabelText('Search'), searchToken)

  await waitFor(() => {
    const locationSearch = screen.getByTestId('location-search').textContent ?? ''
    const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

    expect(params.get('q')).toBe(searchToken)
  })

  await user.click(screen.getByRole('button', { name: /clear filters/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })
})

it('normalizes whitespace-only query params to canonical defaults', async () => {
  renderRegistryPage(['/registry?q=%20%20%20'])

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })

  expect(screen.getByLabelText('Search')).toHaveValue('')
})

it('has accessible filter panel with proper semantics', () => {
  useGameStore.setState({ game: createStartingState() })
  renderRegistryPage(['/registry'])

  // Filter region should exist with proper aria-label
  const filterRegion = screen.getByRole('region', { name: /personnel registry filters/i })
  expect(filterRegion).toBeInTheDocument()

  // Search control should have associated label and ID
  const searchInput = screen.getByLabelText(/^search$/i)
  expect(searchInput).toHaveAttribute('id', 'registry-search')
  expect(searchInput).toHaveAttribute('aria-controls', 'registry-results')
  expect(document.getElementById('registry-results')).toBeInTheDocument()
})

it('rehydrates registry search from URL after remount', async () => {
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)

  useGameStore.setState({ game })
  const firstRender = renderRegistryPage([`/registry?q=${encodeURIComponent(targetAgent.name)}`])

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(targetAgent.name)
  })

  firstRender.unmount()

  renderRegistryPage([`/registry?q=${encodeURIComponent(targetAgent.name)}`])

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(targetAgent.name)
  })
})

it('restores registry search after back navigation and supports forward navigation', async () => {
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)

  useGameStore.setState({ game })
  renderRegistryPage([
    `/registry?q=${encodeURIComponent(targetAgent.name)}`,
    '/agents',
  ], 1)

  expect(screen.getByTestId('agents-page')).toBeInTheDocument()

  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /go back/i }))

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(targetAgent.name)
  })

  await user.click(screen.getByRole('button', { name: /go forward/i }))

  await waitFor(() => {
    expect(screen.getByTestId('agents-page')).toBeInTheDocument()
  })
})

it('updates structured filters in query params and clears all filters', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)

  useGameStore.setState({ game })
  renderRegistryPage(['/registry'])

  await user.selectOptions(screen.getByLabelText(REGISTRY_UI_TEXT.filterRoleLabel), targetAgent.role)
  await user.selectOptions(screen.getByLabelText(REGISTRY_UI_TEXT.sortLabel), 'fatigue-desc')

  await waitFor(() => {
    const locationSearch = screen.getByTestId('location-search').textContent ?? ''
    const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

    expect(params.get('role')).toBe(targetAgent.role)
    expect(params.get('sort')).toBe('fatigue-desc')
  })

  await user.click(screen.getByRole('button', { name: REGISTRY_UI_TEXT.clearFiltersLabel }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })
})

it('shows result and total counts in registry header', () => {
  const game = createStartingState()
  const totalAgents = Object.values(game.agents).length

  useGameStore.setState({ game })
  renderRegistryPage(['/registry'])

  expect(
    screen.getByText(new RegExp(`\\d+ ${REGISTRY_UI_TEXT.shownLabel} / ${totalAgents} ${REGISTRY_UI_TEXT.totalLabel}`, 'i'))
  ).toBeInTheDocument()
})

it('hydrates page from URL and shows paginated results', async () => {
  const game = createLargeRegistryState(60)
  useGameStore.setState({ game })

  renderRegistryPage(['/registry?page=2'])

  await waitFor(() => {
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument()
  })

  expect(screen.getByTestId('location-search')).toHaveTextContent('?page=2')
  expect(screen.getByText(/bulk agent 026/i)).toBeInTheDocument()
  expect(screen.queryByText(/bulk agent 001/i)).not.toBeInTheDocument()
})

it('updates URL page param when using pagination controls', async () => {
  const user = userEvent.setup()
  const game = createLargeRegistryState(60)
  useGameStore.setState({ game })

  renderRegistryPage(['/registry'])

  await user.click(screen.getByRole('button', { name: /go to next registry page/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?page=2')
  })

  await user.click(screen.getByRole('button', { name: /go to previous registry page/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })
})

it('jumps directly to a numbered page using page jump controls', async () => {
  const user = userEvent.setup()
  const game = createLargeRegistryState(130)
  useGameStore.setState({ game })

  renderRegistryPage(['/registry'])

  await user.click(screen.getByRole('button', { name: /go to registry page 4/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?page=4')
  })

  await waitFor(() => {
    expect(screen.getByText(/page 4 of 6/i)).toBeInTheDocument()
  })

  expect(screen.getByText(/bulk agent 076/i)).toBeInTheDocument()
})

it('resets pagination to first page when a non-page filter changes', async () => {
  const user = userEvent.setup()
  const game = createLargeRegistryState(60)
  useGameStore.setState({ game })

  renderRegistryPage(['/registry?page=2'])

  await waitFor(() => {
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument()
  })

  await user.type(screen.getByLabelText('Search'), 'bulk')

  await waitFor(() => {
    const locationSearch = screen.getByTestId('location-search').textContent ?? ''
    const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

    expect(params.get('q')).toBe('bulk')
    expect(params.get('page')).toBeNull()
  })
})

it('canonicalizes out-of-range page params to the last valid page', async () => {
  const game = createLargeRegistryState(60)
  useGameStore.setState({ game })

  renderRegistryPage(['/registry?page=999'])

  await waitFor(() => {
    expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument()
  })

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?page=3')
  })

  expect(screen.getByText(/bulk agent 051/i)).toBeInTheDocument()
})

it('navigates from registry list to detail and keeps back navigation scoped to registry', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)

  useGameStore.setState({ game })
  renderRegistryPage(['/registry?q=night'])

  await user.click(screen.getByRole('link', { name: targetAgent.name }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 2, name: targetAgent.name })).toBeInTheDocument()
  })

  expect(screen.getByRole('link', { name: /back to registry/i })).toHaveAttribute(
    'href',
    '/registry'
  )
})
