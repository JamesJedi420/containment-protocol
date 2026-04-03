import '../../test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { assignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import TeamsPage from './TeamsPage'
import { beforeEach, it, expect } from 'vitest'

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

function renderTeamsPage(route = '/teams') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="/teams"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <TeamsPage />
            </>
          }
        />
        <Route
          path="/teams/:teamId"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <div data-testid="team-detail-page">Team detail placeholder</div>
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

it('sanitizes invalid query params locally and falls back to defaults', async () => {
  renderTeamsPage('/teams?q=watch&assignment=bogus&fatigue=broken&sort=broken')

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?q=watch')
  })

  expect(screen.getByLabelText('Search')).toHaveValue('watch')
  expect(screen.getByLabelText('Assignment')).toHaveValue('all')
  expect(screen.getByLabelText('Fatigue')).toHaveValue('all')
  expect(screen.getByLabelText('Sort')).toHaveValue('fatigue')
  expect(screen.getByRole('link', { name: /response unit night watch/i })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /response unit green tape/i })).not.toBeInTheDocument()
})

it('updates query state, filters assigned teams, and exposes case links', async () => {
  const user = userEvent.setup()
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

  for (const agentId of game.teams.t_nightwatch.agentIds) {
    game.agents[agentId].fatigue = 60
  }

  useGameStore.setState({ game })
  renderTeamsPage()

  await user.type(screen.getByLabelText('Search'), 'night')
  await user.selectOptions(screen.getByLabelText('Assignment'), 'assigned')
  await user.selectOptions(screen.getByLabelText('Fatigue'), 'critical')
  await user.selectOptions(screen.getByLabelText('Sort'), 'name')

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?q=night&assignment=assigned&fatigue=critical&sort=name'
    )
  })

  // Verify overstretched badge appears in the team card (now multiple matches possible with guide)
  expect(screen.getAllByText(/overstretched/i).length).toBeGreaterThan(0)
  expect(screen.getByRole('link', { name: /response unit night watch/i })).toHaveAttribute(
    'href',
    '/teams/t_nightwatch?q=night&assignment=assigned&fatigue=critical&sort=name'
  )
  expect(screen.getByRole('link', { name: /vampire nest in the stockyards/i })).toBeInTheDocument()
  expect(screen.getByText(/assigned to:/i)).toBeInTheDocument()
})

it('rehydrates team filters from URL after remount', async () => {
  useGameStore.setState({ game: createStartingState() })
  const route = '/teams?q=night&assignment=assigned&fatigue=critical&sort=name'

  const firstRender = renderTeamsPage(route)

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('night')
    expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
    expect(screen.getByLabelText('Fatigue')).toHaveValue('critical')
    expect(screen.getByLabelText('Sort')).toHaveValue('name')
  })

  firstRender.unmount()

  renderTeamsPage(route)

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('night')
    expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
    expect(screen.getByLabelText('Fatigue')).toHaveValue('critical')
    expect(screen.getByLabelText('Sort')).toHaveValue('name')
  })
})

it('creates a new squad from the builder panel', async () => {
  const user = userEvent.setup()

  renderTeamsPage()

  await user.type(screen.getByLabelText('New squad name'), 'Archive Wardens')
  await user.selectOptions(screen.getByLabelText('Seed member'), 'a_ava')
  await user.click(screen.getByRole('button', { name: /create squad/i }))

  expect(screen.getByRole('link', { name: /response unit archive wardens/i })).toBeInTheDocument()
  expect(useGameStore.getState().game.teams['t_nightwatch'].agentIds).not.toContain('a_ava')
  expect(
    Object.values(useGameStore.getState().game.teams).some(
      (team) => team.name === 'Archive Wardens' && team.agentIds.includes('a_ava')
    )
  ).toBe(true)
})

it('preserves team filters through detail navigation and browser back/forward', async () => {
  const user = userEvent.setup()
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

  useGameStore.setState({ game })
  renderTeamsPage('/teams')

  await user.type(screen.getByLabelText('Search'), 'night')
  await user.selectOptions(screen.getByLabelText('Assignment'), 'assigned')

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?q=night&assignment=assigned')
  })

  await user.click(screen.getByRole('link', { name: /response unit night watch/i }))

  await waitFor(() => {
    expect(screen.getByTestId('team-detail-page')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /go back/i }))

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('night')
    expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
  })

  await user.click(screen.getByRole('button', { name: /go forward/i }))

  await waitFor(() => {
    expect(screen.getByTestId('team-detail-page')).toBeInTheDocument()
  })
})
