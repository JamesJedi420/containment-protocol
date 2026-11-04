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

  expect(await screen.findByLabelText('Search', {}, { timeout: 5000 })).toHaveValue('stockyards')
  expect(screen.getByLabelText('Sort')).toHaveValue('title')

  await user.click(
    within(screen.getByLabelText('Triage list')).getByRole('link', {
      name: /vampire nest in the stockyards/i,
    })
  )

  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: /vampire nest in the stockyards/i },
      { timeout: 5000 }
    )
  ).toBeInTheDocument()

  await user.click(await screen.findByRole('link', { name: /back to cases/i }, { timeout: 5000 }))

  expect(
    await screen.findByRole('heading', { name: /^cases$/i }, { timeout: 5000 })
  ).toBeInTheDocument()
  expect(await screen.findByLabelText('Search', {}, { timeout: 5000 })).toHaveValue('stockyards')
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

  expect(await screen.findByLabelText('Search', {}, { timeout: 5000 })).toHaveValue('night')
  expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
  expect(screen.getByLabelText('Fatigue')).toHaveValue('critical')
  expect(screen.getByLabelText('Sort')).toHaveValue('name')

  await user.click(
    await screen.findByRole('link', { name: /response unit night watch/i }, { timeout: 5000 })
  )

  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: /response unit night watch/i },
      { timeout: 5000 }
    )
  ).toBeInTheDocument()

  await user.click(await screen.findByRole('link', { name: /back to teams/i }, { timeout: 5000 }))

  expect(
    await screen.findByRole('heading', { name: /^teams$/i }, { timeout: 5000 })
  ).toBeInTheDocument()
  expect(await screen.findByLabelText('Search', {}, { timeout: 5000 })).toHaveValue('night')
  expect(screen.getByLabelText('Assignment')).toHaveValue('assigned')
  expect(screen.getByLabelText('Fatigue')).toHaveValue('critical')
  expect(screen.getByLabelText('Sort')).toHaveValue('name')
})

it('routes dashboard command links into case, team, and report drill-down pages', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardWorkflowGame() })
  renderApp('/')

  expect(
    await screen.findByRole('region', { name: /front desk operations hub/i }, { timeout: 5000 })
  ).toBeInTheDocument()

  await user.click(
    await screen.findByRole('link', { name: /vampire nest in the stockyards/i }, { timeout: 5000 })
  )
  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: /vampire nest in the stockyards/i },
      { timeout: 5000 }
    )
  ).toBeInTheDocument()

  await user.click(
    await screen.findByRole('link', { name: /^operations desk$/i }, { timeout: 5000 })
  )
  const teamStatusSection = (
    await screen.findByRole('heading', { name: /^teams \/ field status$/i }, { timeout: 5000 })
  ).closest('section')

  expect(teamStatusSection).not.toBeNull()

  await user.click(within(teamStatusSection!).getByRole('link', { name: /^night watch$/i }))
  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: /response unit night watch/i },
      { timeout: 5000 }
    )
  ).toBeInTheDocument()

  await user.click(
    await screen.findByRole('link', { name: /^operations desk$/i }, { timeout: 5000 })
  )
  const latestReportSection = (
    await screen.findByRole('heading', { name: /^latest report$/i }, { timeout: 5000 })
  ).closest('section')

  expect(latestReportSection).not.toBeNull()

  await user.click(within(latestReportSection!).getByRole('link', { name: /week 3/i }))
  expect(
    await screen.findByRole('heading', { level: 1, name: /^week 3$/i }, { timeout: 5000 })
  ).toBeInTheDocument()
})
