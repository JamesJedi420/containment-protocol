import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import CaseDetailPage from './CaseDetailPage'

function renderCaseDetail(route = '/cases/case-001') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/cases/:caseId" element={<CaseDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('renders a direct-entry case detail and supports assign/unassign actions', async () => {
  const user = userEvent.setup()

  renderCaseDetail()

  expect(screen.getAllByText(/vampire nest in the stockyards/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/intelligence stub:/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/required tags/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/preferred tags/i).length).toBeGreaterThan(0)
  expect(screen.getByRole('heading', { name: /encounter profile/i })).toBeInTheDocument()
  expect(screen.getAllByText(/baseline world activity/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/if the operation fails/i)).toBeInTheDocument()
  expect(screen.getByText(/if the case goes unresolved/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /mission result model/i })).toBeInTheDocument()
  expect(screen.getByText(/decisive success/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /assign night watch/i }))

  expect(screen.getByRole('button', { name: /remove night watch/i })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /remove night watch/i }))

  expect(screen.getAllByText(/unassigned/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/^open$/i)).toBeInTheDocument()
})

it('renders a local not-found state for an unknown case', () => {
  renderCaseDetail('/cases/missing-case')

  expect(screen.getByText(/case not found/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to cases/i })).toBeInTheDocument()
})

it('renders assignment timeline events for the selected case only', () => {
  const game = createStartingState()

  game.events = [
    {
      id: 'evt-assign-1',
      schemaVersion: 1,
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      timestamp: '2042-01-01T00:00:00.001Z',
      payload: {
        week: 1,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        caseKind: 'case',
        teamId: 't_nightwatch',
        teamName: 'Night Watch',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
    },
    {
      id: 'evt-resolved-1',
      schemaVersion: 1,
      type: 'case.resolved',
      sourceSystem: 'incident',
      timestamp: '2042-01-08T00:00:00.001Z',
      payload: {
        week: 2,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        mode: 'threshold',
        kind: 'case',
        stage: 2,
        teamIds: ['t_nightwatch'],
      },
    },
    {
      id: 'evt-other-case',
      schemaVersion: 1,
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      timestamp: '2042-01-08T00:00:00.002Z',
      payload: {
        week: 3,
        caseId: 'case-002',
        caseTitle: 'The Whispering Archive',
        caseKind: 'case',
        teamId: 't_greentape',
        teamName: 'Green Tape',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
    },
  ]

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-001')

  const timelinePanel = screen.getByRole('region', { name: /assignment timeline/i })

  expect(
    within(timelinePanel).getByRole('heading', { name: /assignment timeline/i })
  ).toBeInTheDocument()
  expect(within(timelinePanel).getByText(/night watch assigned/i)).toBeInTheDocument()
  expect(
    within(timelinePanel).getByText(/vampire nest in the stockyards resolved/i)
  ).toBeInTheDocument()
  expect(within(timelinePanel).queryByText(/the whispering archive/i)).not.toBeInTheDocument()
  expect(within(timelinePanel).getByRole('link', { name: /night watch/i })).toHaveAttribute(
    'href',
    '/teams/t_nightwatch'
  )
})
