// cspell:words greentape kellan
import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { assignTeam, unassignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { APP_ROUTES, LATEST_REPORT_TEAM_ROSTER_NAVIGATION } from '../../app/routes'
import TeamDetailPage from './TeamDetailPage'
import { beforeEach, it, expect } from 'vitest'

function renderTeamDetail(route = '/teams/t_nightwatch') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/teams/:teamId" element={<TeamDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('renders a direct-entry team detail with roster and capability summary', () => {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  useGameStore.setState({ game })

  renderTeamDetail()

  expect(screen.getByRole('heading', { name: /response unit night watch/i })).toBeInTheDocument()
  expect(screen.getByText(/assigned to:/i)).toHaveTextContent(/vampire nest in the stockyards/i)
  expect(screen.getByText(/capability summary/i)).toBeInTheDocument()
  expect(screen.getAllByText(/ava brooks/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/father kellan/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/avg fatigue/i).length).toBeGreaterThan(0)
  expect(screen.getByRole('region', { name: 'Squad roster' })).not.toHaveFocus()
})

it('renders a local not-found state for an unknown team', () => {
  renderTeamDetail('/teams/missing-team')

  expect(screen.getByText(/team not found/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to teams/i })).toBeInTheDocument()
})

function renderReportRosterLink() {
  function HistoryControls() {
    const navigate = useNavigate()
    return (
      <>
        <button onClick={() => navigate(-1)}>Back</button>
        <button onClick={() => navigate(1)}>Forward</button>
      </>
    )
  }

  render(
    <MemoryRouter initialEntries={['/']}>
      <HistoryControls />
      <Routes>
        <Route
          path="/"
          element={
            <Link
              to={APP_ROUTES.teamDetail('t_nightwatch')}
              state={LATEST_REPORT_TEAM_ROSTER_NAVIGATION}
            >
              Check current roster for Night Watch
            </Link>
          }
        />
        <Route path="/teams/:teamId" element={<TeamDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

it('focuses the roster on fresh report navigation while history can return without refocusing it', async () => {
  const user = userEvent.setup()
  renderReportRosterLink()

  const link = screen.getByRole('link', { name: 'Check current roster for Night Watch' })
  const roster = () => screen.getByRole('region', { name: 'Squad roster' })
  link.focus()
  await user.keyboard('{Enter}')
  expect(roster()).toHaveFocus()
  await user.tab()
  expect(within(roster()).getAllByRole('link')[0]).toHaveFocus()

  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('link', { name: 'Check current roster for Night Watch' })).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Squad roster' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Forward' }))
  expect(roster()).toBeVisible()
  expect(screen.getByRole('button', { name: 'Forward' })).toHaveFocus()
})

it('focuses the available transfer selector when the reported squad is now empty', async () => {
  const user = userEvent.setup()
  const { game, moveAgentBetweenTeams } = useGameStore.getState()
  for (const agentId of game.teams.t_nightwatch!.agentIds) {
    moveAgentBetweenTeams(agentId, null)
  }
  renderReportRosterLink()

  screen.getByRole('link', { name: 'Check current roster for Night Watch' }).focus()
  await user.keyboard('{Enter}')

  const roster = screen.getByRole('region', { name: 'Squad roster' })
  expect(roster).toHaveTextContent('No agents are assigned')
  expect(screen.getByRole('combobox', { name: 'Transfer agent into this squad' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Transfer in' })).toHaveFocus()
})

it('supports squad management actions for editable teams', async () => {
  const user = userEvent.setup()

  renderTeamDetail()

  await user.clear(screen.getByLabelText('Squad name'))
  await user.type(screen.getByLabelText('Squad name'), 'Night Watch Prime')
  await user.click(screen.getByRole('button', { name: /save/i }))
  await user.selectOptions(screen.getByLabelText('Leader'), 'a_mina')
  await user.selectOptions(screen.getByLabelText('Transfer agent into this squad'), 'a_juno')
  await user.click(screen.getByRole('button', { name: /transfer in/i }))

  expect(
    screen.getByRole('heading', { name: /response unit night watch prime/i })
  ).toBeInTheDocument()
  expect(screen.getAllByText(/juno reyes/i).length).toBeGreaterThan(0)
  expect(useGameStore.getState().game.teams['t_nightwatch'].leaderId).toBe('a_mina')
  expect(useGameStore.getState().game.teams['t_nightwatch'].agentIds).toContain('a_juno')
})

it('renders deployment history entries for the selected team with case links', () => {
  const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const released = unassignTeam(assigned, 'case-001', 't_nightwatch')

  released.events.push({
    id: 'evt-case-001-resolved',
    schemaVersion: 1,
    type: 'case.resolved',
    sourceSystem: 'incident',
    timestamp: '2042-01-01T00:00:00.001Z',
    payload: {
      week: 3,
      caseId: 'case-001',
      caseTitle: 'Vampire Nest in the Stockyards',
      mode: 'threshold',
      kind: 'case',
      stage: 3,
      teamIds: ['t_nightwatch'],
    },
  })

  released.events.push({
    id: 'evt-case-002-resolved-other-team',
    schemaVersion: 1,
    type: 'case.resolved',
    sourceSystem: 'incident',
    timestamp: '2042-01-01T00:00:00.002Z',
    payload: {
      week: 4,
      caseId: 'case-002',
      caseTitle: 'Whispering Circle at the Pier',
      mode: 'threshold',
      kind: 'case',
      stage: 2,
      teamIds: ['t_greentape'],
    },
  })

  useGameStore.setState({ game: released })
  renderTeamDetail('/teams/t_nightwatch')

  const historyPanel = screen.getByRole('region', { name: /deployment history/i })

  expect(
    within(historyPanel).getByRole('heading', { name: /deployment history/i })
  ).toBeInTheDocument()
  expect(
    within(historyPanel).getByText(/resolved vampire nest in the stockyards/i)
  ).toBeInTheDocument()
  expect(
    within(historyPanel).getByText(/unassigned from vampire nest in the stockyards/i)
  ).toBeInTheDocument()
  expect(
    within(historyPanel).getByText(/assigned to vampire nest in the stockyards/i)
  ).toBeInTheDocument()

  expect(
    within(historyPanel).getAllByRole('link', { name: /vampire nest in the stockyards/i })[0]
  ).toHaveAttribute('href', '/cases/case-001')
  expect(within(historyPanel).queryByText(/whispering circle at the pier/i)).not.toBeInTheDocument()
})
