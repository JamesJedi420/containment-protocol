import '../../test/setup'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { vi } from 'vitest'
import { FEEDBACK_MESSAGES, createNote } from '../../data/copy'
import { assignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { GAME_STORE_VERSION } from '../../app/store/runTransfer'
import DashboardPage from './DashboardPage'

vi.mock('./dashboardView', () => ({
  getDashboardMetrics: () => ({
    open: 4,
    inProgress: 2,
    resolved: 6,
    totalScore: 18,
    avgFatigue: 11,
    maxStage: 4,
    deadlineRiskCount: 2,
    criticalStageCount: 1,
    raidUnderstaffedCount: 1,
    overstretchedTeamCount: 3,
  }),
  getPriorityCaseViews: () => [
    {
      currentCase: {
        id: 'case-001',
        title: 'Vampire Nest in the Stockyards',
        stage: 3,
        status: 'open',
        deadlineRemaining: 2,
      },
      priorityScore: 91,
      bestSuccess: 0.84,
      isUnassigned: true,
      hasDeadlineRisk: true,
      isBlockedByRequiredTags: false,
      isRaidAtCapacity: false,
    },
  ],
  getAtRiskTeamViews: () => [
    {
      team: {
        id: 't_nightwatch',
        name: 'Night Watch',
      },
      assignedCase: {
        title: 'Vampire Nest in the Stockyards',
      },
      fatigueBand: 'critical',
      capabilitySummary: {
        averageFatigue: 17,
        coverageTags: ['combat'],
      },
    },
  ],
  getLatestReportSummary: () => ({
    report: {
      week: 3,
      resolvedCases: ['case-002'],
      unresolvedTriggers: ['case-003'],
      spawnedCases: ['case-001'],
      avgFatigue: 11,
      maxStage: 4,
      rngStateBefore: 3030,
      rngStateAfter: 3037,
    },
    score: 9,
  }),
  getFieldStatusViews: () => [
    {
      team: {
        id: 't_nightwatch',
        name: 'Night Watch',
        agentIds: ['a_ava', 'a_kellan', 'a_mina', 'a_rook'],
      },
      assignedCase: {
        id: 'case-001',
        title: 'Vampire Nest in the Stockyards',
      },
      agentCount: 2,
      progressPercent: 50,
      remainingWeeks: 1,
      status: 'deploying',
      signals: {
        deadlineRisk: false,
        criticalStage: false,
        raidUnderstaffed: false,
      },
    },
  ],
  getOperationsDeskAdvisories: () => [
    {
      id: 'advisory-1',
      kind: 'role_coverage',
      severity: 'danger',
      title: 'Vampire Nest in the Stockyards is missing baseline role coverage',
      detail: 'Night Watch comes closest, but still lacks support.',
      caseId: 'case-001',
      teamId: 't_nightwatch',
      agentId: 'a_casey',
    },
  ],
  getOperationsDeskPerformance: () => ({
    resolutionRate: 75,
    queueThroughput: 1,
    activePressure: 4,
    fabricatedStock: 2,
  }),
}))

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

function renderDashboard(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LocationSearchProbe />
              <HistoryNavControls />
              <DashboardPage />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

function createDashboardGame() {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

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
      spawnedCases: ['case-001'],
      maxStage: 4,
      avgFatigue: 11,
      teamStatus: [],
      notes: [createNote('Synthetic dashboard report.')],
    },
  ]

  return game
}

function createDashboardFeedGame() {
  const game = createDashboardGame()

  game.events = [
    {
      id: 'evt-000001',
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
      id: 'evt-000002',
      schemaVersion: 1,
      type: 'intel.report_generated',
      sourceSystem: 'intel',
      timestamp: '2042-01-08T00:00:00.002Z',
      payload: {
        week: 2,
        resolvedCount: 1,
        failedCount: 0,
        partialCount: 0,
        unresolvedCount: 1,
        spawnedCount: 1,
        noteCount: 3,
        score: 4,
      },
    },
  ]

  return game
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('links dashboard summary cards to the live routes', () => {
  useGameStore.setState({ game: createDashboardGame() })
  renderDashboard()

  expect(screen.getByRole('link', { name: /pending operations/i })).toHaveAttribute(
    'href',
    '/cases'
  )
  expect(screen.getByRole('link', { name: /breach score/i })).toHaveAttribute('href', '/report')
  expect(screen.getByRole('link', { name: /team fatigue \/ avg fatigue/i })).toHaveAttribute(
    'href',
    '/teams'
  )
  expect(screen.getByRole('link', { name: /highest stage/i })).toHaveAttribute('href', '/cases')
  expect(screen.getByRole('link', { name: /deadline risk cases/i })).toHaveAttribute(
    'href',
    '/cases'
  )
  expect(screen.getByRole('link', { name: /critical stage cases/i })).toHaveAttribute(
    'href',
    '/cases'
  )
  expect(screen.getByRole('link', { name: /understaffed raids/i })).toHaveAttribute(
    'href',
    '/cases'
  )
  expect(screen.getByRole('link', { name: /overstretched teams/i })).toHaveAttribute(
    'href',
    '/teams'
  )
})

it('shows a priority queue with destination-title links for cases and teams', () => {
  useGameStore.setState({ game: createDashboardGame() })
  renderDashboard()

  const prioritySection = screen
    .getByRole('heading', { name: /^priority queue$/i })
    .closest('section')

  expect(prioritySection).not.toBeNull()
  expect(
    within(prioritySection!).getByRole('link', { name: /vampire nest in the stockyards/i })
  ).toHaveAttribute('href', '/cases/case-001')

  const atRiskSection = screen.getByRole('heading', { name: /^at-risk teams$/i }).closest('section')

  expect(atRiskSection).not.toBeNull()
  expect(
    within(atRiskSection!).getByRole('link', { name: /response unit night watch/i })
  ).toHaveAttribute('href', '/teams/t_nightwatch')
})

it('links the latest report by week label', () => {
  useGameStore.setState({ game: createDashboardGame() })
  renderDashboard()

  expect(screen.getByRole('heading', { name: /^latest report$/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /week 3/i })).toHaveAttribute('href', '/report/3')
})

it('lets the player select a weekly directive before advancing', async () => {
  const user = userEvent.setup()

  renderDashboard()

  await user.click(screen.getByRole('button', { name: /intel surge/i }))

  expect(useGameStore.getState().game.directiveState.selectedId).toBe('intel-surge')
  expect(screen.getByText(/sharper recruitment visibility this week/i)).toBeInTheDocument()
})

it('shows recent directive history strip when past directives exist', () => {
  const game = createStartingState()
  game.directiveState = {
    selectedId: null,
    history: [
      { week: 1, directiveId: 'intel-surge' },
      { week: 2, directiveId: 'procurement-push' },
    ],
  }
  useGameStore.setState({ game })
  renderDashboard()

  expect(screen.getByText(/week 2 — procurement push/i)).toBeInTheDocument()
  expect(screen.getByText(/week 1 — intel surge/i)).toBeInTheDocument()
})

it('renders and filters the operations feed by source and search text', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardFeedGame() })
  renderDashboard()

  expect(screen.getByRole('heading', { name: /^operations feed$/i })).toBeInTheDocument()
  expect(
    screen.getByText(/night watch assigned to vampire nest in the stockyards/i)
  ).toBeInTheDocument()
  expect(screen.getByText(/week 2 intelligence report logged/i)).toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText(/^source$/i), 'intel')

  expect(
    screen.queryByText(/night watch assigned to vampire nest in the stockyards/i)
  ).not.toBeInTheDocument()
  expect(screen.getByText(/week 2 intelligence report logged/i)).toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText(/^source$/i), 'all')
  await user.selectOptions(screen.getByLabelText(/^category$/i), 'incident_response')

  expect(
    screen.getByText(/night watch assigned to vampire nest in the stockyards/i)
  ).toBeInTheDocument()
  expect(screen.queryByText(/week 2 intelligence report logged/i)).not.toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText(/^category$/i), 'all')
  await user.type(screen.getByLabelText(/search feed/i), 'night watch')

  expect(
    screen.getByText(/night watch assigned to vampire nest in the stockyards/i)
  ).toBeInTheDocument()
  expect(screen.queryByText(/week 2 intelligence report logged/i)).not.toBeInTheDocument()
})

it('hydrates operations feed filters from URL and canonicalizes invalid params', async () => {
  useGameStore.setState({ game: createDashboardFeedGame() })
  renderDashboard('/?feedQ=%20night%20watch%20&feedSource=bogus&feedCategory=incident_response&feedWeekMin=0&feedWeekMax=NaN&feedEntity=%20%20')

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('night watch')
  })

  expect(screen.getByLabelText(/^source$/i)).toHaveValue('all')
  expect(screen.getByLabelText(/^category$/i)).toHaveValue('incident_response')
  expect(screen.getByLabelText(/^week from$/i)).toHaveValue(null)
  expect(screen.getByLabelText(/^week to$/i)).toHaveValue(null)
  expect(screen.getByLabelText(/entity id/i)).toHaveValue('')

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?feedQ=night+watch&feedCategory=incident_response'
    )
  })
})

it('syncs operations feed filters to URL while editing', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardFeedGame() })
  renderDashboard()

  await user.type(screen.getByLabelText(/search feed/i), 'report')
  await user.selectOptions(screen.getByLabelText(/^source$/i), 'intel')
  await user.selectOptions(screen.getByLabelText(/^type$/i), 'intel.report_generated')
  await user.type(screen.getByLabelText(/^week from$/i), '2')
  await user.type(screen.getByLabelText(/entity id/i), 'case-001')

  await waitFor(() => {
    const params = new URLSearchParams(
      (screen.getByTestId('location-search').textContent ?? '').replace(/^\?/, '')
    )

    expect(params.get('feedQ')).toBe('report')
    expect(params.get('feedSource')).toBe('intel')
    expect(params.get('feedType')).toBe('intel.report_generated')
    expect(params.get('feedWeekMin')).toBe('2')
    expect(params.get('feedEntity')).toBe('case-001')
  })
})

it('preserves feed filters through link navigation and browser back/forward', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardFeedGame() })
  renderDashboard()

  await user.type(screen.getByLabelText(/search feed/i), 'night')
  await user.selectOptions(screen.getByLabelText(/^source$/i), 'assignment')

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?feedQ=night&feedSource=assignment'
    )
  })

  await user.click(screen.getByRole('link', { name: /night watch assigned to vampire nest in the stockyards/i }))

  await user.click(screen.getByRole('button', { name: /go back/i }))

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('night')
    expect(screen.getByLabelText(/^source$/i)).toHaveValue('assignment')
  })

  await user.click(screen.getByRole('button', { name: /go forward/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('feedQ=night+watch')
  })
})

it('rehydrates operations feed filters after remount', async () => {
  useGameStore.setState({ game: createDashboardFeedGame() })
  const firstRender = renderDashboard('/?feedQ=report&feedSource=intel&feedType=intel.report_generated&feedWeekMin=2')

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('report')
    expect(screen.getByLabelText(/^source$/i)).toHaveValue('intel')
    expect(screen.getByLabelText(/^type$/i)).toHaveValue('intel.report_generated')
    expect(screen.getByLabelText(/^week from$/i)).toHaveValue(2)
  })

  firstRender.unmount()

  renderDashboard('/?feedQ=report&feedSource=intel&feedType=intel.report_generated&feedWeekMin=2')

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('report')
    expect(screen.getByLabelText(/^source$/i)).toHaveValue('intel')
    expect(screen.getByLabelText(/^type$/i)).toHaveValue('intel.report_generated')
    expect(screen.getByLabelText(/^week from$/i)).toHaveValue(2)
  })
})

it('shows field status and allows queueing fabrication from the operations desk', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardGame() })
  renderDashboard()

  const fieldStatusSection = screen
    .getByRole('heading', { name: /^field status$/i })
    .closest('section')

  expect(fieldStatusSection).not.toBeNull()
  expect(
    within(fieldStatusSection!).getByText(/agents: ava brooks, father kellan, mina park, rook/i)
  ).toBeInTheDocument()
  expect(within(fieldStatusSection!).getByRole('link', { name: /night watch/i })).toHaveAttribute(
    'href',
    '/teams/t_nightwatch'
  )
  expect(
    within(fieldStatusSection!).getByRole('link', { name: /vampire nest in the stockyards/i })
  ).toHaveAttribute('href', '/cases/case-001')
  expect(fieldStatusSection!).toHaveTextContent(/50%/i)
  expect(fieldStatusSection!).toHaveTextContent(/1w/iu)
  expect(fieldStatusSection!).toHaveTextContent(/deploying/iu)
  const fieldProgress = within(fieldStatusSection!).getByRole('progressbar', {
    name: /night watch/i,
  })
  expect(fieldProgress).toHaveAttribute('value', '50')
  expect(fieldProgress).toHaveAttribute('max', '100')

  const advisorySection = screen
    .getByRole('heading', { name: /advisory \/ analysis/i })
    .closest('section')

  expect(advisorySection).not.toBeNull()
  expect(advisorySection!).toHaveTextContent(/missing baseline role coverage/i)
  expect(within(advisorySection!).getByRole('link', { name: /open case/i })).toHaveAttribute(
    'href',
    '/cases/case-001'
  )
  expect(within(advisorySection!).getByRole('link', { name: /open team/i })).toHaveAttribute(
    'href',
    '/teams/t_nightwatch'
  )
  expect(within(advisorySection!).getByRole('link', { name: /open agent/i })).toHaveAttribute(
    'href',
    '/agents/a_casey'
  )

  const fabricationSection = screen
    .getByRole('heading', { name: /^fabrication queue$/i })
    .closest('section')
  const marketSection = screen
    .getByRole('heading', { name: /^resource market$/i })
    .closest('section')
  const performanceSection = screen
    .getByRole('heading', { name: /^performance metrics$/i })
    .closest('section')

  expect(fabricationSection).not.toBeNull()
  expect(
    within(fabricationSection!).getByRole('button', { name: /queue emergency medkits/i })
  ).toBeInTheDocument()
  expect(within(fabricationSection!).getByText(/ward seal batch/i)).toBeInTheDocument()
  expect(marketSection).not.toBeNull()
  expect(within(marketSection!).getByText(/ward seal batch/i)).toBeInTheDocument()
  expect(within(marketSection!).getByText(/^1\.00x$/i)).toBeInTheDocument()

  expect(performanceSection).not.toBeNull()
  expect(performanceSection!).toHaveTextContent(/resolution rate/iu)
  expect(performanceSection!).toHaveTextContent(/75%/iu)
  expect(performanceSection!).toHaveTextContent(/queue throughput/iu)
  expect(performanceSection!).toHaveTextContent(/(^|\D)1(\D|$)/u)

  await user.click(screen.getByRole('button', { name: /queue emergency medkits/i }))

  expect(useGameStore.getState().game.productionQueue).toHaveLength(1)
  expect(useGameStore.getState().game.events.at(-1)).toMatchObject({
    type: 'production.queue_started',
  })
  expect(
    within(fabricationSection!).getByText(/started week 1 \/ 1w duration/i)
  ).toBeInTheDocument()
})

it('exports the current run into the transfer editor', async () => {
  const user = userEvent.setup()
  useGameStore.setState({ game: createDashboardGame() })
  renderDashboard()

  await user.click(screen.getByRole('button', { name: /export run/i }))

  const payload = JSON.parse((screen.getByLabelText(/run payload/i) as HTMLTextAreaElement).value)

  expect(payload).toMatchObject({
    kind: 'containment-protocol-run',
    version: GAME_STORE_VERSION,
    game: expect.objectContaining({
      week: 1,
      rngSeed: expect.any(Number),
      config: expect.objectContaining({
        maxActiveCases: 7,
      }),
    }),
  })
  expect(typeof payload.exportedAt).toBe('string')
})

it('shows visible feedback when an import payload is invalid', async () => {
  const user = userEvent.setup()
  useGameStore.setState({ game: createStartingState() })
  renderDashboard()

  await user.type(screen.getByLabelText(/run payload/i), 'not-json')
  await user.click(screen.getByRole('button', { name: /import run/i }))

  expect(screen.getByText(/not valid/i)).toBeInTheDocument()
  expect(useGameStore.getState().game).toEqual(createStartingState())
})

it('starts a fresh run from the current config without changing the config', async () => {
  const user = userEvent.setup()
  useGameStore.setState({
    game: {
      ...createDashboardGame(),
      week: 6,
      rngSeed: 77,
      rngState: 77,
      reports: [
        {
          week: 5,
          rngStateBefore: 77,
          rngStateAfter: 78,
          newCases: [],
          progressedCases: [],
          resolvedCases: [],
          failedCases: [],
          partialCases: [],
          unresolvedTriggers: [],
          spawnedCases: [],
          maxStage: 2,
          avgFatigue: 5,
          teamStatus: [],
          notes: [],
        },
      ],
      config: {
        ...createStartingState().config,
        maxActiveCases: 9,
        partialMargin: 22,
        stageScalar: 1.08,
      },
    },
  })
  renderDashboard()

  await user.click(screen.getByRole('button', { name: /new run from current config/i }))

  expect(useGameStore.getState().game).toMatchObject({
    week: 1,
    rngSeed: 77,
    rngState: 77,
    reports: [],
    config: expect.objectContaining({
      maxActiveCases: 9,
      partialMargin: 22,
      stageScalar: 1.08,
    }),
  })
  expect(screen.getByText(FEEDBACK_MESSAGES.runStartedFromCurrentConfig)).toBeInTheDocument()
})

it('shows halt guidance when simulation is halted', () => {
  const game = createStartingState()
  game.gameOver = true
  game.gameOverReason = 'Active case capacity exceeded. Directorate overwhelmed.'
  useGameStore.setState({ game })
  renderDashboard()

  const haltPanel = screen.getByRole('status', { name: /simulation halted guidance/i })
  expect(haltPanel).toBeInTheDocument()
  expect(within(haltPanel).getByText('Case capacity exceeded')).toBeInTheDocument()
  expect(within(haltPanel).getByText(/next step:/i)).toBeInTheDocument()
})

it('uses a two-step reset confirmation before restoring the starting state', async () => {
  const user = userEvent.setup()
  useGameStore.setState({
    game: {
      ...createDashboardGame(),
      week: 6,
      rngSeed: 77,
      rngState: 91,
      reports: [
        {
          week: 5,
          rngStateBefore: 77,
          rngStateAfter: 91,
          newCases: [],
          progressedCases: [],
          resolvedCases: [],
          failedCases: [],
          partialCases: [],
          unresolvedTriggers: [],
          spawnedCases: [],
          maxStage: 2,
          avgFatigue: 5,
          teamStatus: [],
          notes: [],
        },
      ],
    },
  })
  renderDashboard()

  await user.click(screen.getByRole('button', { name: /^reset$/i }))

  expect(screen.getByText(/reset to week 1\?/i)).toBeInTheDocument()
  expect(useGameStore.getState().game.week).toBe(6)

  await user.click(screen.getByRole('button', { name: /cancel/i }))

  expect(screen.queryByText(/reset to week 1\?/i)).not.toBeInTheDocument()
  expect(useGameStore.getState().game.week).toBe(6)

  await user.click(screen.getByRole('button', { name: /^reset$/i }))
  await user.click(screen.getByRole('button', { name: /confirm reset/i }))

  expect(screen.queryByText(/reset to week 1\?/i)).not.toBeInTheDocument()
  expect(useGameStore.getState().game).toMatchObject({
    week: 1,
    reports: [],
  })
})
