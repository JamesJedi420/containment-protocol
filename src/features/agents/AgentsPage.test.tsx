import '../../test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { assignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import AgentsPage from './AgentsPage'
import AgentDetailPage from './AgentDetailPage'

function renderAgentsPage(route = '/agents') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/agents">
          <Route index element={<AgentsPage />} />
          <Route path=":agentId" element={<AgentDetailPage />} />
        </Route>
      </Routes>
      <LocationSearchProbe />
      <HistoryNavControls />
    </MemoryRouter>
  )
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

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('filters the roster and links into agent detail', async () => {
  const user = userEvent.setup()
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const [primaryAgent, secondaryAgent, trainingAgent] = Object.values(game.agents) as [
    (typeof game.agents)[string],
    (typeof game.agents)[string],
    (typeof game.agents)[string],
  ]

  game.teams.t_nightwatch.agentIds = [primaryAgent.id]
  game.teams.t_nightwatch.assignedCaseId = 'case-001'

  primaryAgent.status = 'active'
  primaryAgent.fatigue = 10

  secondaryAgent.status = 'injured'
  secondaryAgent.fatigue = 68

  trainingAgent.assignment = {
    state: 'training',
    startedWeek: game.week,
    trainingProgramId: 'fieldcraft',
  }
  game.trainingQueue = [
    {
      id: 'training-test-entry',
      trainingId: 'fieldcraft',
      trainingName: 'Fieldcraft',
      scope: 'agent',
      agentId: trainingAgent.id,
      agentName: trainingAgent.name,
      targetStat: 'utility',
      statDelta: 5,
      startedWeek: game.week,
      durationWeeks: 2,
      remainingWeeks: 1,
      fundingCost: 100,
      fatigueDelta: 10,
    },
  ]

  useGameStore.setState({ game })
  renderAgentsPage()

  await user.selectOptions(screen.getByLabelText('Role'), primaryAgent.role)
  await user.selectOptions(screen.getByLabelText('Status'), 'active')
  await user.selectOptions(screen.getByLabelText('Team'), 't_nightwatch')
  await user.selectOptions(screen.getByLabelText('Fatigue'), 'steady')
  await user.selectOptions(screen.getByLabelText('Training state'), 'available')

  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: new RegExp(primaryAgent.name, 'i'),
      })
    ).toBeInTheDocument()
  })

  expect(screen.getByRole('heading', { name: primaryAgent.name, level: 2 })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /open route view/i })).toHaveAttribute(
    'href',
    expect.stringContaining(`/agents/${primaryAgent.id}`)
  )
  expect(screen.queryByText(secondaryAgent.name)).not.toBeInTheDocument()
  expect(screen.queryByText(trainingAgent.name)).not.toBeInTheDocument()
})

it('navigates to agent detail from the roster', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const agent = Object.values(game.agents)[0]!

  game.agents[agent.id].traits = [
    {
      id: 'disciplined',
      label: 'Disciplined',
      description: 'Keeps focus under pressure.',
      modifiers: { overall: 2 },
    },
  ]

  useGameStore.setState({ game })
  renderAgentsPage()

  await user.click(
    screen.getByRole('button', {
      name: new RegExp(agent.name, 'i'),
    })
  )
  await user.click(screen.getByRole('link', { name: /open route view/i }))

  expect(screen.getByRole('heading', { name: agent.name, level: 2 })).toBeInTheDocument()
  expect(screen.getByText(/identity and assignment/i)).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument()
  expect(screen.getByText(/operational snapshot/i)).toBeInTheDocument()
})

it('hydrates filters from URL params and applies text search', async () => {
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)

  useGameStore.setState({ game })
  renderAgentsPage(`/agents?q=${encodeURIComponent(targetAgent.name)}&role=${targetAgent.role}`)

  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: new RegExp(targetAgent.name, 'i'),
      })
    ).toBeInTheDocument()
  })

  expect(screen.getByDisplayValue(targetAgent.name)).toBeInTheDocument()
  expect(screen.getByLabelText('Role')).toHaveValue(targetAgent.role)
  const normalizedSearch = screen.getByTestId('location-search').textContent ?? ''
  const normalizedParams = new URLSearchParams(normalizedSearch.replace(/^\?/, ''))

  expect(normalizedParams.get('q')).toBe(targetAgent.name)
  expect(normalizedParams.get('role')).toBe(targetAgent.role)
})

it('updates query string when filters change and clears back to defaults', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)
  const searchToken = targetAgent.name.split(/\s+/)[0]

  useGameStore.setState({ game })
  renderAgentsPage()

  await user.type(screen.getByLabelText('Search'), searchToken)
  await user.selectOptions(screen.getByLabelText('Role'), targetAgent.role)

  await waitFor(() => {
    const locationSearch = screen.getByTestId('location-search').textContent ?? ''
    const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

    expect(params.get('q')).toBe(searchToken)
    expect(params.get('role')).toBe(targetAgent.role)
  })

  await user.click(screen.getByRole('button', { name: /clear filters/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })
})

it('rehydrates filters from URL after remount', async () => {
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)
  const searchToken = targetAgent.name.split(/\s+/)[0]
  const route = `/agents?q=${encodeURIComponent(searchToken)}&role=${targetAgent.role}`

  useGameStore.setState({ game })
  const firstRender = renderAgentsPage(route)

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(searchToken)
    expect(screen.getByLabelText('Role')).toHaveValue(targetAgent.role)
  })

  firstRender.unmount()

  renderAgentsPage(route)

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(searchToken)
    expect(screen.getByLabelText('Role')).toHaveValue(targetAgent.role)
  })
})

it('normalizes invalid query params to canonical defaults', async () => {
  useGameStore.setState({ game: createStartingState() })
  renderAgentsPage('/agents?role=invalid&status=???&team=ghost&fatigue=oops&training=nope&q=%20%20')

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('')
    expect(screen.getByLabelText('Role')).toHaveValue('all')
    expect(screen.getByLabelText('Status')).toHaveValue('all')
    expect(screen.getByLabelText('Team')).toHaveValue('all')
    expect(screen.getByLabelText('Fatigue')).toHaveValue('all')
    expect(screen.getByLabelText('Training state')).toHaveValue('all')
  })
})

it('shows the empty state for unmatched text search', async () => {
  useGameStore.setState({ game: createStartingState() })
  renderAgentsPage('/agents?q=__definitely_not_a_real_agent__')

  await waitFor(() => {
    expect(screen.getAllByText(/no agents match the current filters/i)).toHaveLength(1)
  })
})

it('has accessible filter panel with proper semantics', () => {
  useGameStore.setState({ game: createStartingState() })
  renderAgentsPage()

  // Filter region should exist with proper aria-label
  const filterRegion = screen.getByRole('region', { name: /agent filters/i })
  expect(filterRegion).toBeInTheDocument()

  // All filter controls should have associated labels and IDs
  expect(screen.getByLabelText(/^search$/i)).toHaveAttribute('id', 'agents-search')
  expect(screen.getByLabelText(/^role$/i)).toHaveAttribute('id', 'agents-role')
  expect(screen.getByLabelText(/^status$/i)).toHaveAttribute('id', 'agents-status')
  expect(screen.getByLabelText(/^team$/i)).toHaveAttribute('id', 'agents-team')
  expect(screen.getByLabelText(/^fatigue$/i)).toHaveAttribute('id', 'agents-fatigue')
  expect(screen.getByLabelText(/^training/i)).toHaveAttribute('id', 'agents-training')
})

it('preserves filter and embedded tab query when navigating detail then back/forward', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const [targetAgent] = Object.values(game.agents)
  const searchToken = targetAgent.name.split(/\s+/)[0]

  useGameStore.setState({ game })
  renderAgentsPage(`/agents?q=${encodeURIComponent(searchToken)}&role=${targetAgent.role}`)

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(searchToken)
  })

  await user.click(
    screen.getByRole('button', {
      name: new RegExp(targetAgent.name, 'i'),
    })
  )

  await user.click(screen.getByRole('tab', { name: /history/i }))

  await waitFor(() => {
    const locationSearch = screen.getByTestId('location-search').textContent ?? ''
    const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

    expect(params.get('q')).toBe(searchToken)
    expect(params.get('role')).toBe(targetAgent.role)
    expect(params.get('tab')).toBe('history')
  })

  const routeViewLink = screen.getByRole('link', { name: /open route view/i })
  expect(routeViewLink).toHaveAttribute('href', expect.stringContaining('tab=history'))

  await user.click(screen.getByRole('link', { name: /open route view/i }))

  await waitFor(() => {
    expect(screen.getByText(/identity and assignment/i)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')
  })

  await user.click(screen.getByRole('button', { name: /go back/i }))

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue(searchToken)
    expect(screen.getByLabelText('Role')).toHaveValue(targetAgent.role)
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=history')
  })

  await user.click(screen.getByRole('button', { name: /go forward/i }))

  await waitFor(() => {
    expect(screen.getByText(/identity and assignment/i)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')
  })
})

it('remembers per-agent embedded tab selection in localStorage', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const [firstAgent, secondAgent] = Object.values(game.agents) as [
    (typeof game.agents)[string],
    (typeof game.agents)[string],
  ]

  useGameStore.setState({ game })
  renderAgentsPage()

  // Select first agent and switch to morale tab
  await user.click(
    screen.getByRole('button', {
      name: new RegExp(firstAgent.name, 'i'),
    })
  )

  await user.click(screen.getByRole('tab', { name: /morale/i }))

  await waitFor(() => {
    expect(screen.getByRole('tab', { name: /morale/i })).toHaveAttribute('aria-selected', 'true')
  })

  // Verify localStorage was updated
  expect(localStorage.getItem(`agentTab-${firstAgent.id}`)).toBe('morale')

  // Select second agent (should default tab since nothing stored)
  await user.click(
    screen.getByRole('button', {
      name: new RegExp(secondAgent.name, 'i'),
    })
  )

  await waitFor(() => {
    expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute('aria-selected', 'true')
  })

  // Switch second agent to history
  await user.click(screen.getByRole('tab', { name: /history/i }))

  await waitFor(() => {
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')
  })

  expect(localStorage.getItem(`agentTab-${secondAgent.id}`)).toBe('history')

  // Switch back to first agent — should recall morale
  await user.click(
    screen.getByRole('button', {
      name: new RegExp(firstAgent.name, 'i'),
    })
  )

  await waitFor(() => {
    expect(screen.getByRole('tab', { name: /morale/i })).toHaveAttribute('aria-selected', 'true')
  })
})
