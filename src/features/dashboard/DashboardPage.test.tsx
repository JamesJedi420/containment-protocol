// cspell:words daywatch kellan medkits
import * as dashboardView from './dashboardView';
import '../../test/setup';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    emergencyActive: false,
    emergencyExpiresWeek: undefined,
    emergencyActivatedWeek: undefined,
    emergencyEffects: undefined,
    emergencyTriggeredBy: undefined,
    campaignGovernance: {
      authority: 0,
      phase: 'complete',
      primacy: 'directorate',
      courtMode: 'fixed_court',
      courtRegionId: 'bio_containment',
      totalUpkeep: 0,
      fundingNet: 0,
      atWarRegions: 0,
      occupiedRegions: 0,
      underSiegeRegions: 0,
      contestedRegions: 0,
      averageFortificationIntegrity: 1,
      actionCount: 0,
      summary: 'ok',
    },
    territorialPower: {
      nodeCount: 2,
      totalYield: 8,
      availableYield: 6,
      suppressedNodeCount: 1,
      openConduitCount: 1,
      blockedConduitCount: 1,
      openConduitCapacity: 4,
      eligibleScopeCount: 1,
      controllers: ['Containment Protocol'],
      lastExpenditure: {
        scopeId: 'node-ash',
        scopeType: 'node',
        nodeId: 'node-ash',
        result: 'spent',
        amount: 4,
        availableYield: 6,
        conduitCapacity: 4,
      },
    },
    supplyNetwork: {
      tracedRegionCount: 3,
      supportedRegionCount: 2,
      unsupportedRegionCount: 1,
      blockedRegions: ['occult_district'],
      readyTransportCount: 1,
      disruptedTransportCount: 0,
      totalSourceThroughput: 2,
      deliveredLift: 2,
      strategicControlScore: 9,
      blockedDetails: ['occult_district: no open route reached Occult Transit Corridor.'],
    },
    regional: {
      regionCount: 3,
      agencyControlled: 2,
      hostileControlled: 1,
      knownRegions: 2,
    },
  }),
  getFilteredEventFeedViews: () => [
    {
      event: {
        id: 'event-001',
        type: 'intel.report_generated',
        sourceSystem: 'intel',
        week: 2,
        timestamp: 123456,
      },
      week: 2,
      title: 'Week 2 intelligence report logged',
      detail: 'Synthetic event for testing',
      sourceLabel: 'Intel',
      typeLabel: 'Intel Report',
      timestampLabel: 'Week 2',
      tone: 'neutral',
      href: undefined,
      searchText: 'week 2 intelligence report logged',
    },
    {
      event: {
        id: 'event-002',
        type: 'assignment.team_assigned',
        sourceSystem: 'assignment',
        week: 2,
        timestamp: 123457,
      },
      week: 2,
      title: 'Night Watch assigned to Vampire Nest in the Stockyards',
      detail: 'Assignment event for testing',
      sourceLabel: 'Assignment',
      typeLabel: 'Team Assigned',
      timestampLabel: 'Week 2',
      tone: 'neutral',
      href: undefined,
      searchText: 'night watch assigned to vampire nest in the stockyards',
    },
  ],
  getPriorityCaseViews: () => [
    // Normal urgent case
    {
      currentCase: {
        id: 'case-001',
        title: 'Vampire Nest in the Stockyards',
        stage: 3,
        deadlineRemaining: 2,
      },
      bestSuccess: 0.84,
      isUnassigned: true,
      hasDeadlineRisk: true,
      isBlockedByRequiredTags: false,
    },
    // Blocked by required tags
    {
      currentCase: {
        id: 'case-002',
        title: 'Haunted Mill',
        stage: 2,
        deadlineRemaining: 1,
      },
      bestSuccess: 0.5,
      isUnassigned: false,
      hasDeadlineRisk: false,
      isBlockedByRequiredTags: true,
    },
  ],
  getAtRiskTeamViews: () => [
    {
      team: { id: 't_nightwatch', name: 'Night Watch' },
      capabilitySummary: { averageFatigue: 11 },
      fatigueBand: 'Elevated',
      assignedCase: {
        id: 'case-001',
        title: 'Vampire Nest in the Stockyards',
      },
    },
    {
      team: { id: 't_daywatch', name: 'Day Watch' },
      capabilitySummary: { averageFatigue: 15 },
      fatigueBand: 'Critical',
      assignedCase: {
        id: 'case-002',
        title: 'Haunted Mill',
      },
    },
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLatestReportSummary: (game: any) => ({
    report: game.reports[0],
    score: 4,
  }),
  getOperationsDeskPerformance: () => ({
    resolutionRate: 0.75,
    queueThroughput: 1,
    otherMetric: 42,
  }),
  getFieldStatusViews: () => ([
    {
      team: { id: 't_nightwatch', name: 'Night Watch', href: '/teams/t_nightwatch' },
      assignedCase: { id: 'case-001', title: 'Vampire Nest in the Stockyards', href: '/cases/case-001', durationWeeks: 2, weeksRemaining: 1 },
      agentCount: 4,
      progressPercent: 50,
      remainingWeeks: 1,
      status: 'deploying',
      signals: { criticalStage: false, deadlineRisk: false, raidUnderstaffed: false },
      // This is the shape expected by the DashboardPage field status panel
      agents: [
        { id: 'a_ava', name: 'ava brooks' },
        { id: 'a_kellan', name: 'father kellan' },
        { id: 'a_mina', name: 'mina park' },
        { id: 'a_rook', name: 'rook' },
      ],
    },
  ]),
  getOperationsDeskAdvisories: () => ([
    {
      id: 'advisory-001',
      kind: 'role_coverage',
      severity: 'warning',
      title: 'Missing baseline role coverage',
      detail: 'At least one required role is not covered by any active team.',
      caseId: 'case-001',
      teamId: 't_nightwatch',
      agentId: 'a_casey',
    },
  ]),
}));

import { FEEDBACK_MESSAGES, createNote } from '../../data/copy'
import { assignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { GAME_STORE_VERSION } from '../../app/store/runTransfer'
import DashboardPage from './DashboardPage'

// vi.mock example (add more as needed for deterministic results)
// vi.mock('./dashboardView', () => ({
//   getDashboardMetrics: () => ({ ... }),
//   getPriorityCaseViews: () => ([ ... ]),
// }));

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
  );
}


function createDashboardGame() {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch');
  game.cases['case-001'].durationWeeks = 2;
  game.cases['case-001'].weeksRemaining = 1;
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
  ];
  return game;
}


function createDashboardFeedGame() {
  // Feed-specific test data with both week 1 and week 2 reports for surfacing
  const game = createDashboardGame();
  game.reports = [
    {
      week: 1,
      rngStateBefore: 1010,
      rngStateAfter: 1011,
      newCases: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      spawnedCases: [],
      maxStage: 1,
      avgFatigue: 0,
      teamStatus: [],
      notes: [createNote('week 1 intelligence report logged')],
    },
    {
      week: 2,
      rngStateBefore: 2020,
      rngStateAfter: 2022,
      newCases: ['case-001'],
      progressedCases: ['case-001'],
      resolvedCases: ['case-002'],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: ['case-003'],
      spawnedCases: ['case-001'],
      maxStage: 3,
      avgFatigue: 10,
      teamStatus: [],
      notes: [createNote('week 2 intelligence report logged')],
    },
  ];
  game.events = [
    {
      id: 'event-001',
      schemaVersion: 2,
      type: 'intel.report_generated',
      sourceSystem: 'intel',
      payload: {
        week: 2,
        resolvedCount: 1,
        failedCount: 0,
        partialCount: 0,
        unresolvedCount: 0,
        spawnedCount: 0,
        noteCount: 1,
        score: 100,
      },
      timestamp: '123456',
    },
    {
      id: 'event-002',
      schemaVersion: 2,
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      payload: {
        week: 2,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        caseKind: 'case',
        teamId: 't_nightwatch',
        teamName: 'Night Watch',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
      timestamp: '123457',
    },
  ];
  game.week = 2;
  return game;
}


describe('DashboardPage', () => {
  it('surfaces emergency governance banner when active', () => {
    vi.spyOn(dashboardView, 'getDashboardMetrics').mockReturnValue({
      open: 2,
      inProgress: 1,
      resolved: 3,
      totalScore: 10,
      avgFatigue: 8,
      maxStage: 2,
      deadlineRiskCount: 1,
      criticalStageCount: 0,
      raidUnderstaffedCount: 0,
      overstretchedTeamCount: 1,
      emergencyActive: true,
      emergencyExpiresWeek: 7,
      emergencyActivatedWeek: 4,
      emergencyEffects: { maxActiveCasesDelta: -2, fundingBasePerWeekDelta: 100 },
      emergencyTriggeredBy: 'pressure.critical',
      campaignGovernance: {
        authority: 100,
        phase: 'complete',
        primacy: 'directorate',
        courtMode: 'fixed_court',
        courtRegionId: 'bio_containment',
        totalUpkeep: 0,
        atWarRegions: 0,
        occupiedRegions: 0,
        underSiegeRegions: 0,
        contestedRegions: 0,
        // Required properties for CampaignGovernanceSummary
        fundingNet: 0,
        averageFortificationIntegrity: 1,
        actionCount: 0,
        summary: 'ok',
      },
      // Removed properties that belong only in campaignGovernance
      territorialPower: {
        nodeCount: 1,
        totalYield: 4,
        availableYield: 4,
        suppressedNodeCount: 0,
        openConduitCount: 1,
        blockedConduitCount: 0,
        openConduitCapacity: 4,
        eligibleScopeCount: 1,
        controllers: ['Containment Protocol'],
        lastExpenditure: {
          scopeId: 'node-ash',
          scopeType: 'node',
          nodeId: 'node-ash',
          result: 'spent',
          amount: 4,
          availableYield: 4,
          conduitCapacity: 4,
        },
      },
      supplyNetwork: {
        tracedRegionCount: 2,
        supportedRegionCount: 2,
        unsupportedRegionCount: 0,
        blockedRegions: [],
        readyTransportCount: 1,
        disruptedTransportCount: 0,
        totalSourceThroughput: 2,
        deliveredLift: 2,
        strategicControlScore: 5,
        blockedDetails: [],
      },
      regional: {
        regionCount: 3,
        agencyControlled: 2,
        hostileControlled: 1,
        knownRegions: 2,
      },
    });
    useGameStore.setState({ game: createDashboardGame() });
    renderDashboard();
    const banner = screen.getByRole('status', { name: /emergency governance active/i });
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/emergency governance active/i);
    expect(banner).toHaveTextContent(/expires week 7/i);
    expect(banner).toHaveTextContent(/triggered by: pressure.critical/i);
    expect(banner).toHaveTextContent(/operation slots reduced by 2/i);
    expect(banner).toHaveTextContent(/base funding increased by 100/i);
  });
  it('shows empty state when no priority cases or at-risk teams', () => {
    vi.spyOn(dashboardView, 'getPriorityCaseViews').mockReturnValue([])
    vi.spyOn(dashboardView, 'getAtRiskTeamViews').mockReturnValue([])
    useGameStore.setState({ game: createDashboardGame() })
    renderDashboard()
    expect(screen.getByText(/no urgent case pressure/i)).toBeInTheDocument()
    expect(screen.getByText(/no stressed teams are currently flagged/i)).toBeInTheDocument()
  })
  beforeEach(() => {
    useGameStore.persist.clearStorage();
    useGameStore.setState({ game: createStartingState() });
  });

  it('links dashboard summary cards to the live routes', () => {
    useGameStore.setState({ game: createDashboardGame() })
    renderDashboard()
    expect(screen.getByRole('link', { name: /pending operations/i })).toHaveAttribute('href', '/cases')
    expect(screen.getByRole('link', { name: /breach score/i })).toHaveAttribute('href', '/report')
    expect(screen.getByRole('link', { name: /team fatigue \/ avg fatigue/i })).toHaveAttribute('href', '/teams')
    expect(screen.getByRole('link', { name: /highest stage/i })).toHaveAttribute('href', '/cases')
    expect(screen.getByRole('link', { name: /deadline risk cases/i })).toHaveAttribute('href', '/cases')
    expect(screen.getByRole('link', { name: /critical stage cases/i })).toHaveAttribute('href', '/cases')
    expect(screen.getByRole('link', { name: /understaffed raids/i })).toHaveAttribute('href', '/cases')
    expect(screen.getByRole('link', { name: /overstretched teams/i })).toHaveAttribute('href', '/teams')
  })

  it('renders the territorial power panel from canonical dashboard metrics', () => {
    useGameStore.setState({ game: createDashboardGame() })
    renderDashboard()

    expect(screen.getByRole('heading', { name: /territorial power/i })).toBeInTheDocument()
    expect(screen.getByText(/nodes: 2 \/ available yield 6 \/ suppressed 1/i)).toBeInTheDocument()
    expect(screen.getByText(/casting: 1 eligible \/ last expenditure spent 4 from node-ash/i)).toBeInTheDocument()
  })

  it('renders the supply network panel from canonical dashboard metrics', () => {
    useGameStore.setState({ game: createDashboardGame() })
    renderDashboard()

    expect(screen.getByRole('heading', { name: /supply network/i })).toBeInTheDocument()
    expect(screen.getByText(/support: 2\/3 regions traced \/ unsupported 1/i)).toBeInTheDocument()
    expect(screen.getByText(/transport: 1 ready \/ 0 disrupted \/ delivered lift 2/i)).toBeInTheDocument()
    expect(screen.getByText(/blocked paths: occult_district: no open route reached occult transit corridor\./i)).toBeInTheDocument()
  })

  it('shows a priority queue with destination-title links for cases and teams', () => {
    useGameStore.setState({ game: createDashboardGame() })
    renderDashboard()
    const prioritySection = screen.getByRole('heading', { name: /^priority queue$/i }).closest('section')
    expect(prioritySection).not.toBeNull()
    expect(within(prioritySection!).getByRole('link', { name: /vampire nest in the stockyards/i })).toHaveAttribute('href', '/cases/case-001')
    const atRiskSection = screen.getByRole('heading', { name: /^at-risk teams$/i }).closest('section')
    expect(atRiskSection).not.toBeNull()
    expect(within(atRiskSection!).getByRole('link', { name: /response unit night watch/i })).toHaveAttribute('href', '/teams/t_nightwatch')
  })



  it('shows halt guidance when simulation is halted', () => {
    const game = createDashboardGame();
    game.gameOver = true;
    game.gameOverReason = 'Active case capacity exceeded. Directorate overwhelmed.';
    useGameStore.setState({ game });
    renderDashboard();
    const haltPanel = screen.getByRole('status', { name: /simulation halted guidance/i });
    expect(haltPanel).toBeInTheDocument();
    expect(haltPanel).toHaveTextContent(/directorate overwhelmed/i);
  });

  it('shows reset confirmation flow', async () => {
    const user = userEvent.setup();
    const game = createDashboardGame();
    game.week = 6;
    useGameStore.setState({ game });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(screen.getByText(/reset to week 1\?/i)).toBeInTheDocument();
    expect(useGameStore.getState().game.week).toBe(6);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/reset to week 1\?/i)).not.toBeInTheDocument();
    expect(useGameStore.getState().game.week).toBe(6);
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    await user.click(screen.getByRole('button', { name: /confirm reset/i }));
    expect(screen.queryByText(/reset to week 1\?/i)).not.toBeInTheDocument();
    expect(useGameStore.getState().game).toMatchObject({
      week: 1,
      reports: [
        expect.objectContaining({ week: 1 })
      ],
    });
  });


  it('renders and filters the operations feed by source and search text', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: createDashboardFeedGame() })
    renderDashboard()
    expect(screen.getByRole('heading', { name: /^operations feed$/i })).toBeInTheDocument()
    expect(screen.getByText(/night watch assigned to vampire nest in the stockyards/i)).toBeInTheDocument()
    // Check for the actual rendered summary content from the cadence/pressure panel
    expect(screen.getAllByText(/pressure: 6 \(watch\)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/major incidents: 0/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/unresolved momentum: 1/i).length).toBeGreaterThan(0)
    const showAdvancedFiltersButton = screen.getByRole('button', { name: /show advanced filters/i })
    expect(showAdvancedFiltersButton).toHaveAttribute('aria-controls', 'operations-feed-advanced-filters')
    await user.selectOptions(screen.getByLabelText(/^source$/i), 'intel')
    expect(screen.queryByText(/night watch assigned to vampire nest in the stockyards/i)).not.toBeInTheDocument()
    expect(screen.getByText(/week 2 intelligence report logged/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/^source$/i), 'all')
    await user.selectOptions(screen.getByLabelText(/^category$/i), 'incident_response')
    expect(screen.getByText(/night watch assigned to vampire nest in the stockyards/i)).toBeInTheDocument()
    expect(screen.queryByText(/week 2 intelligence report logged/i)).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/^category$/i), 'all')
    await user.type(screen.getByLabelText(/search feed/i), 'night watch')
    expect(screen.getByText(/night watch assigned to vampire nest in the stockyards/i)).toBeInTheDocument()
    expect(screen.queryByText(/week 2 intelligence report logged/i)).not.toBeInTheDocument()
  })




it('hydrates operations feed filters from URL and canonicalizes invalid params', async () => {
  const user = userEvent.setup()
  useGameStore.setState({ game: createDashboardFeedGame() })
  renderDashboard(
    '/?feedQ=%20night%20watch%20&feedSource=bogus&feedCategory=incident_response&feedWeekMin=0&feedWeekMax=NaN&feedEntity=%20%20'
  )

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('night watch')
  })

  expect(screen.getByLabelText(/^source$/i)).toHaveValue('all')
  expect(screen.getByLabelText(/^category$/i)).toHaveValue('incident_response')

  await user.click(screen.getByRole('button', { name: /show advanced filters/i }))

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
  await user.click(screen.getByRole('button', { name: /show advanced filters/i }))
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

  await user.click(
    screen.getByRole('link', { name: /night watch assigned to vampire nest in the stockyards/i })
  )

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
  const firstRender = renderDashboard(
    '/?feedQ=report&feedSource=intel&feedType=intel.report_generated&feedWeekMin=2'
  )

  expect(screen.getByRole('button', { name: /hide advanced filters/i })).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('report')
    expect(screen.getByLabelText(/^source$/i)).toHaveValue('intel')
    expect(screen.getByLabelText(/^type$/i)).toHaveValue('intel.report_generated')
    expect(screen.getByLabelText(/^week from$/i)).toHaveValue(2)
  })

  firstRender.unmount()

  renderDashboard('/?feedQ=report&feedSource=intel&feedType=intel.report_generated&feedWeekMin=2')

  expect(screen.getByRole('button', { name: /hide advanced filters/i })).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByLabelText(/search feed/i)).toHaveValue('report')
    expect(screen.getByLabelText(/^source$/i)).toHaveValue('intel')
    expect(screen.getByLabelText(/^type$/i)).toHaveValue('intel.report_generated')
    expect(screen.getByLabelText(/^week from$/i)).toHaveValue(2)
  })
})

it('shows active filter chips and supports reset-advanced without clearing core filters', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardFeedGame() })
  renderDashboard()

  await user.type(screen.getByLabelText(/search feed/i), 'night')
  await user.selectOptions(screen.getByLabelText(/^source$/i), 'assignment')
  await user.click(screen.getByRole('button', { name: /show advanced filters/i }))
  await user.type(screen.getByLabelText(/^week from$/i), '2')
  await user.type(screen.getByLabelText(/entity id/i), 'case-001')

  expect(screen.getByText(/search: night/i)).toBeInTheDocument()
  expect(screen.getByText(/source:/i)).toBeInTheDocument()
  expect(screen.getByText(/week from: 2/i)).toBeInTheDocument()
  expect(screen.getByText(/entity: case-001/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /reset advanced/i }))

  expect(screen.getByLabelText(/^source$/i)).toHaveValue('assignment')
  expect(screen.getByLabelText(/search feed/i)).toHaveValue('night')
  expect(screen.getByLabelText(/^week from$/i)).toHaveValue(null)
  expect(screen.getByLabelText(/entity id/i)).toHaveValue('')
  expect(screen.queryByText(/week from: 2/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/entity: case-001/i)).not.toBeInTheDocument()
})

it('shows field status and allows queueing fabrication from the operations desk', async () => {
  const user = userEvent.setup()

  useGameStore.setState({ game: createDashboardGame() })
  renderDashboard()

  const fieldStatusSection = screen
    .getByRole('heading', { name: /^field status$/i })
    .closest('section')

  expect(fieldStatusSection).not.toBeNull()
  // The UI renders only the agent count, not names, in the field status panel
  expect(
    within(fieldStatusSection!).getByText(/agents:\s*4 agents/i)
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
    // createStartingState always includes a default week 1 report
    reports: [
      expect.objectContaining({
        week: 1,
        maxStage: 1,
      })
    ],
    config: expect.objectContaining({
      maxActiveCases: 9,
      partialMargin: 22,
      stageScalar: 1.08,
    }),
  })
  expect(screen.getByText(FEEDBACK_MESSAGES.runStartedFromCurrentConfig)).toBeInTheDocument()
})
})


