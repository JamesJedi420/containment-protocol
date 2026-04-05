import '../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { createStartingState } from '../data/startingState'
import { createNote } from '../data/copy'
import { assignTeam } from '../domain/sim/assign'
import App from './App'
import { useGameStore } from './store/gameStore'

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  )
}

function createDashboardWorkflowGame() {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

  game.cases['case-001'] = {
    ...game.cases['case-001'],
    stage: 4,
    deadlineRemaining: 1,
  }

  for (const agentId of game.teams.t_nightwatch.agentIds) {
    game.agents[agentId] = {
      ...game.agents[agentId],
      fatigue: 60,
    }
  }

  game.reports = [
    {
      week: 3,
      rngStateBefore: 3030,
      rngStateAfter: 3037,
      newCases: ['case-001'],
      progressedCases: ['case-001'],
      resolvedCases: ['case-002'],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: ['case-003'],
      spawnedCases: ['case-004'],
      maxStage: 4,
      avgFatigue: 18,
      teamStatus: [],
      notes: [createNote('Synthetic dashboard workflow report.')],
    },
  ]

  return game
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('preserves case query state through case-detail navigation and back', async () => {
  const user = userEvent.setup()

  renderApp('/cases?q=stockyards&sort=title')

  expect(screen.getByLabelText('Search')).toHaveValue('stockyards')
  expect(screen.getByLabelText('Sort')).toHaveValue('title')

  await user.click(screen.getByRole('link', { name: /vampire nest in the stockyards/i }))

  expect(
    screen.getByRole('heading', { level: 1, name: /vampire nest in the stockyards/i })
  ).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /back to cases/i }))

  expect(screen.getByRole('heading', { name: /^cases$/i })).toBeInTheDocument()
  expect(screen.getByLabelText('Search')).toHaveValue('stockyards')
  expect(screen.getByLabelText('Sort')).toHaveValue('title')
})

it('preserves team query state through team-detail navigation and back', async () => {
  const user = userEvent.setup()
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

  for (const agentId of game.teams.t_nightwatch.agentIds) {
    game.agents[agentId] = {
      ...game.agents[agentId],
      fatigue: 60,
    }
  }

  useGameStore.setState({ game })
  renderApp('/teams?q=night&assignment=assigned&fatigue=critical&sort=name')

  expect(screen.getByLabelText('Search')).toHaveValue('night')
  expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
  expect(screen.getByLabelText('Fatigue')).toHaveValue('critical')
  expect(screen.getByLabelText('Sort')).toHaveValue('name')

  await user.click(screen.getByRole('link', { name: /response unit night watch/i }))

  expect(
    screen.getByRole('heading', { level: 1, name: /response unit night watch/i })
  ).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /back to teams/i }))

  expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()
  expect(screen.getByLabelText('Search')).toHaveValue('night')
  expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
  expect(screen.getByLabelText('Fatigue')).toHaveValue('critical')
  expect(screen.getByLabelText('Sort')).toHaveValue('name')
})

it('routes dashboard command links into case, team, and report drill-down pages', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardWorkflowGame() })
  renderApp('/')

  const prioritySection = screen
    .getByRole('heading', { name: /^priority queue$/i })
    .closest('section')

  expect(prioritySection).not.toBeNull()

  await user.click(
    within(prioritySection!).getByRole('link', { name: /vampire nest in the stockyards/i })
  )
  expect(
    screen.getByRole('heading', { level: 1, name: /vampire nest in the stockyards/i })
  ).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /^operations desk$/i }))
  const atRiskSection = screen.getByRole('heading', { name: /^at-risk teams$/i }).closest('section')

  expect(atRiskSection).not.toBeNull()

  await user.click(within(atRiskSection!).getByRole('link', { name: /response unit night watch/i }))
  expect(
    screen.getByRole('heading', { level: 1, name: /response unit night watch/i })
  ).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /^operations desk$/i }))
  const latestReportSection = screen
    .getByRole('heading', { name: /^latest report$/i })
    .closest('section')

  expect(latestReportSection).not.toBeNull()

  await user.click(within(latestReportSection!).getByRole('link', { name: /week 3/i }))
  expect(screen.getByRole('heading', { level: 1, name: /^week 3$/i })).toBeInTheDocument()
})
