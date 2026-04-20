// cspell:words greentape
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

it('supports top-option comparison and shows confidence/commit cues on assignment actions', async () => {
  const user = userEvent.setup()

  renderCasesPage(['/cases'])

  const compareButton = screen.getAllByRole('button', { name: /compare top 2/i })[0]
  expect(compareButton).toHaveAttribute('aria-expanded', 'false')
  const controlsId = compareButton.getAttribute('aria-controls')
  expect(controlsId).toBeTruthy()
  await user.click(compareButton)

  expect(compareButton).toHaveAttribute('aria-expanded', 'true')
  expect(document.getElementById(controlsId!)).not.toBeNull()
  expect(screen.getByText(/success delta:/i)).toBeInTheDocument()
  expect(screen.getByText(/fail delta:/i)).toBeInTheDocument()
  expect(screen.getAllByText(/confidence:/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/commit clarity:/i).length).toBeGreaterThan(0)
})

it('renders a major incident planner and warns when one selected team is much weaker', async () => {
  const user = userEvent.setup()
  const game = createMajorIncidentPlannerState()

  useGameStore.setState({ game })
  renderCasesPage(['/cases'])

  const incidentCard = getCardByName('Regional Fracture Event')
  expect(within(incidentCard).getByText(/major incident planner/i)).toBeInTheDocument()

  await user.click(within(incidentCard).getByRole('button', { name: /alpha team/i }))
  await user.click(within(incidentCard).getByRole('button', { name: /bravo team/i }))
  await user.click(within(incidentCard).getByRole('button', { name: /charlie team/i }))

  expect(within(incidentCard).getByText(/bottlenecking the operation/i)).toBeInTheDocument()
  expect(within(incidentCard).getByText(/weakest-power gate:/i)).toBeInTheDocument()
  expect(within(incidentCard).getAllByText(/reward upside:/i).length).toBeGreaterThan(0)
  expect(within(incidentCard).getAllByText(/operational cost:/i).length).toBeGreaterThan(0)
  expect(within(incidentCard).getAllByText(/net read:/i).length).toBeGreaterThan(0)
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

it('renders the contract board and launches a contract into the live case queue', async () => {
  const user = userEvent.setup()

  renderCasesPage(['/cases'])

  const contractBoard = screen.getByRole('region', { name: /contract board/i })
  expect(within(contractBoard).getByText(/mission board/i)).toBeInTheDocument()

  const launchButton = within(contractBoard).getByRole('button', { name: /launch with/i })
  await user.click(launchButton)

  const activeContractCase = Object.values(useGameStore.getState().game.cases).find(
    (currentCase) => currentCase.contract && currentCase.assignedTeamIds.length > 0
  )

  expect(activeContractCase).toBeDefined()
  expect(useGameStore.getState().game.events.some((event) => event.type === 'case.spawned')).toBe(
    true
  )
})

it('renders keyboard skip links for filters and results', () => {
  renderCasesPage(['/cases'])

  expect(screen.getByRole('link', { name: /skip to case filters/i })).toHaveAttribute(
    'href',
    '#cases-filters'
  )
  expect(screen.getByRole('link', { name: /skip to case results/i })).toHaveAttribute(
    'href',
    '#cases-results'
  )
  expect(document.getElementById('cases-filters')).not.toBeNull()
  expect(document.getElementById('cases-results')).not.toBeNull()
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
    intelConfidence: overrides.intelConfidence ?? 1,
    intelUncertainty: overrides.intelUncertainty ?? 0,
    intelLastUpdatedWeek: overrides.intelLastUpdatedWeek ?? 0,
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

function createMajorIncidentPlannerState() {
  const game = createStartingState()
  const baseAgent = game.agents.a_ava

  game.agents = {}
  game.teams = {}

  game.agents['agent-alpha'] = {
    ...baseAgent,
    id: 'agent-alpha',
    name: 'Alpha',
    role: 'hunter',
    baseStats: { combat: 90, investigation: 82, utility: 78, social: 50 },
    fatigue: 4,
    status: 'active',
  }
  game.agents['agent-bravo'] = {
    ...baseAgent,
    id: 'agent-bravo',
    name: 'Bravo',
    role: 'tech',
    baseStats: { combat: 72, investigation: 86, utility: 94, social: 46 },
    fatigue: 8,
    status: 'active',
  }
  game.agents['agent-charlie'] = {
    ...baseAgent,
    id: 'agent-charlie',
    name: 'Charlie',
    role: 'negotiator',
    baseStats: { combat: 12, investigation: 16, utility: 14, social: 30 },
    fatigue: 10,
    status: 'active',
  }
  game.agents['agent-delta'] = {
    ...baseAgent,
    id: 'agent-delta',
    name: 'Delta',
    role: 'field_recon',
    baseStats: { combat: 74, investigation: 88, utility: 90, social: 54 },
    fatigue: 6,
    status: 'active',
  }

  game.teams['team-alpha'] = {
    id: 'team-alpha',
    name: 'Alpha Team',
    agentIds: ['agent-alpha'],
    memberIds: ['agent-alpha'],
    leaderId: 'agent-alpha',
    tags: ['field'],
  }
  game.teams['team-bravo'] = {
    id: 'team-bravo',
    name: 'Bravo Team',
    agentIds: ['agent-bravo'],
    memberIds: ['agent-bravo'],
    leaderId: 'agent-bravo',
    tags: ['tech'],
  }
  game.teams['team-charlie'] = {
    id: 'team-charlie',
    name: 'Charlie Team',
    agentIds: ['agent-charlie'],
    memberIds: ['agent-charlie'],
    leaderId: 'agent-charlie',
    tags: ['social'],
  }
  game.teams['team-delta'] = {
    id: 'team-delta',
    name: 'Delta Team',
    agentIds: ['agent-delta'],
    memberIds: ['agent-delta'],
    leaderId: 'agent-delta',
    tags: ['recon'],
  }

  game.inventory['medical_supplies'] = 5
  game.inventory['signal_jammers'] = 2
  game.inventory['emf_sensors'] = 2
  game.inventory['silver_rounds'] = 2

  game.cases['incident-major'] = makeCase('incident-major', 'Regional Fracture Event', {
    kind: 'raid',
    stage: 3,
    deadlineRemaining: 1,
    durationWeeks: 4,
    requiredTags: [],
    requiredRoles: [],
    preferredTags: ['field', 'tech', 'analysis'],
    raid: { minTeams: 2, maxTeams: 4 },
  })

  return game
}
