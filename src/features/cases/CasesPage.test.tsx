import '../../test/setup'
import { render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import type { CaseInstance } from '../../domain/models'
import CasesPage from './CasesPage'

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

function renderCasesPage(initialEntries = ['/cases'], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route
          path="/cases"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <CasesPage />
            </>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <>
              <LocationProbe />
              <HistoryNavControls />
              <div data-testid="case-detail-page">Case detail placeholder</div>
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

it('sanitizes invalid query params and preserves canonical case links', async () => {
  renderCasesPage(['/cases?q=stockyards&status=bogus&mode=bogus&stage=bogus&sort=title'])

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?q=stockyards&sort=title')
  })

  expect(screen.getByLabelText('Search')).toHaveValue('stockyards')
  expect(screen.getByLabelText('Status')).toHaveValue('all')
  expect(screen.getByLabelText('Mode')).toHaveValue('all')
  expect(screen.getByLabelText('Stage')).toHaveValue('all')
  expect(screen.getByLabelText('Sort')).toHaveValue('title')

  const caseLink = screen.getByRole('link', { name: /vampire nest in the stockyards/i })
  expect(caseLink).toHaveAttribute('href', '/cases/case-001?q=stockyards&sort=title')
})

it('sorts cases by title from query state', () => {
  const game = createStartingState()
  game.cases = {
    alpha: makeCase('alpha', 'Alpha Case'),
    zulu: makeCase('zulu', 'Zulu Case'),
  }

  useGameStore.setState({ game })

  renderCasesPage(['/cases?sort=title'])

  const caseLinks = screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.startsWith('/cases/'))
  expect(caseLinks[0]).toHaveTextContent('Alpha Case')
  expect(caseLinks[1]).toHaveTextContent('Zulu Case')
})

it('renders urgency markers for triage cases', () => {
  const game = createStartingState()
  game.cases = {
    high: makeCase('high', 'High Risk Case', {
      stage: 4,
      deadlineRemaining: 1,
      durationWeeks: 3,
      weeksRemaining: 2,
    }),
    blocked: makeCase('blocked', 'Blocked Case', {
      requiredRoles: ['technical', 'support'],
      preferredTags: [],
      stage: 2,
      deadlineRemaining: 4,
    }),
    raid: makeCase('raid', 'Raid Capacity Case', {
      kind: 'raid',
      stage: 3,
      assignedTeamIds: ['t_nightwatch', 't_greentape'],
      raid: { minTeams: 2, maxTeams: 2 },
      deadlineRemaining: 2,
      durationWeeks: 4,
    }),
    idle: makeCase('idle', 'Unassigned Case', {
      stage: 1,
      assignedTeamIds: [],
      deadlineRemaining: 5,
      durationWeeks: 2,
    }),
  }

  useGameStore.setState({ game })

  renderCasesPage(['/cases'])

  const highRiskCard = getCardByName('High Risk Case')
  expect(within(highRiskCard).getByText('Unassigned')).toBeInTheDocument()
  expect(within(highRiskCard).getByText('High stage')).toBeInTheDocument()
  expect(within(highRiskCard).getByText('Deadline risk')).toBeInTheDocument()

  const blockedCard = getCardByName('Blocked Case')
  expect(within(blockedCard).getByText('Required-role blocked')).toBeInTheDocument()

  const raidCard = getCardByName('Raid Capacity Case')
  expect(within(raidCard).getByText('Raid at capacity')).toBeInTheDocument()

  const idleCard = getCardByName('Unassigned Case')
  expect(within(idleCard).getByText('Unassigned')).toBeInTheDocument()
})

it('renders recommended action guidance for assignable cases', () => {
  renderCasesPage(['/cases'])

  expect(screen.getAllByText(/recommended action/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/best current success:/i).length).toBeGreaterThan(0)
})

it('toggles the at-risk filter and syncs it to query state', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  game.cases = {
    high: makeCase('high', 'High Risk Case', {
      stage: 4,
      deadlineRemaining: 1,
      durationWeeks: 3,
      weeksRemaining: 2,
    }),
    blocked: makeCase('blocked', 'Blocked Case', {
      requiredRoles: ['technical', 'support'],
      preferredTags: [],
      stage: 2,
      deadlineRemaining: 4,
    }),
    idle: makeCase('idle', 'Low Risk Case', {
      stage: 1,
      assignedTeamIds: [],
      deadlineRemaining: 5,
      durationWeeks: 2,
    }),
    resolved: makeCase('resolved', 'Resolved Critical Case', {
      stage: 5,
      status: 'resolved',
      deadlineRemaining: 1,
    }),
  }

  useGameStore.setState({ game })
  renderCasesPage(['/cases'])

  await user.click(screen.getByRole('button', { name: /at-risk only/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?risk=1')
  })

  expect(screen.getByRole('button', { name: /^at-risk$/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /high risk case/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /blocked case/i })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /low risk case/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /resolved critical case/i })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^at-risk$/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })

  expect(screen.getByRole('button', { name: /at-risk only/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /low risk case/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /resolved critical case/i })).toBeInTheDocument()
})

it('renders the case assignment guidance panel', () => {
  renderCasesPage(['/cases'])

  expect(screen.getByRole('region', { name: /case assignment guidance/i })).toBeInTheDocument()
  expect(screen.getByText(/mode determines how success is calculated/i)).toBeInTheDocument()
  expect(
    screen.getByText(/some cases require specific team tags or baseline role coverage/i)
  ).toBeInTheDocument()
  expect(screen.getByText(/stage 4\+ cases auto-escalate/i)).toBeInTheDocument()
})

it('rehydrates case filters from URL after remount', async () => {
  const firstRender = renderCasesPage([
    '/cases?q=stockyards&status=open&mode=threshold&stage=high&sort=title&risk=1',
  ])

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('stockyards')
    expect(screen.getByLabelText('Status')).toHaveValue('open')
    expect(screen.getByLabelText('Mode')).toHaveValue('threshold')
    expect(screen.getByLabelText('Sort')).toHaveValue('title')
  })

  firstRender.unmount()

  renderCasesPage(['/cases?q=stockyards&status=open&mode=threshold&stage=high&sort=title&risk=1'])

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('stockyards')
    expect(screen.getByLabelText('Status')).toHaveValue('open')
    expect(screen.getByLabelText('Mode')).toHaveValue('threshold')
    expect(screen.getByLabelText('Sort')).toHaveValue('title')
  })
})

it('restores case filters after back navigation from detail and supports forward navigation', async () => {
  const user = userEvent.setup()

  renderCasesPage(
    ['/cases?q=stockyards&status=open&mode=threshold&sort=title', '/cases/case-001'],
    1
  )

  expect(screen.getByTestId('case-detail-page')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /go back/i }))

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('stockyards')
    expect(screen.getByLabelText('Status')).toHaveValue('open')
    expect(screen.getByLabelText('Mode')).toHaveValue('threshold')
    expect(screen.getByLabelText('Sort')).toHaveValue('title')
  })

  await user.click(screen.getByRole('button', { name: /go forward/i }))

  await waitFor(() => {
    expect(screen.getByTestId('case-detail-page')).toBeInTheDocument()
  })
})

it('shows a clear-filters recovery action in empty results state', async () => {
  const user = userEvent.setup()

  renderCasesPage(['/cases?q=definitely-no-match'])

  const emptyRegion = screen.getByRole('region', { name: /no matching cases/i })
  expect(emptyRegion).toBeInTheDocument()
  expect(within(emptyRegion).getByRole('button', { name: /clear filters/i })).toBeInTheDocument()

  await user.click(within(emptyRegion).getByRole('button', { name: /clear filters/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })
})

function getCardByName(name: string) {
  const link = screen.getByRole('link', { name: new RegExp(name, 'i') })
  return link.closest('li') as HTMLElement
}

function makeCase(id: string, title: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...overrides,
    id,
    templateId: overrides.templateId ?? id,
    title,
    description: overrides.description ?? `${title} details`,
    kind: overrides.kind ?? 'case',
    status: overrides.status ?? 'open',
    mode: overrides.mode ?? 'threshold',
    difficulty: overrides.difficulty ?? DEFAULT_DIFFICULTY,
    weights: overrides.weights ?? DEFAULT_WEIGHTS,
    tags: overrides.tags ?? [],
    stage: overrides.stage ?? 1,
    durationWeeks: overrides.durationWeeks ?? 2,
    weeksRemaining: overrides.weeksRemaining,
    deadlineWeeks: overrides.deadlineWeeks ?? 3,
    deadlineRemaining: overrides.deadlineRemaining ?? 3,
    assignedTeamIds: overrides.assignedTeamIds ?? [],
    requiredRoles: overrides.requiredRoles ?? [],
    requiredTags: overrides.requiredTags ?? [],
    preferredTags: overrides.preferredTags ?? [],
    onFail: overrides.onFail ?? DEFAULT_SPAWN_RULE,
    onUnresolved: overrides.onUnresolved ?? DEFAULT_SPAWN_RULE,
    raid: overrides.kind === 'raid' ? (overrides.raid ?? { minTeams: 2, maxTeams: 2 }) : undefined,
  }
}

const DEFAULT_DIFFICULTY = {
  combat: 10,
  investigation: 10,
  utility: 10,
  social: 10,
}

const DEFAULT_WEIGHTS = {
  combat: 0.25,
  investigation: 0.25,
  utility: 0.25,
  social: 0.25,
}

const DEFAULT_SPAWN_RULE = {
  stageDelta: 1,
  spawnCount: { min: 0, max: 1 },
  spawnTemplateIds: ['alpha'],
}
