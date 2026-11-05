// cspell:words topbar
import '../../test/setup'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { normalizeGameState } from '../../domain/teamSimulation'
import { useGameStore } from '../../app/store/gameStore'
import { ShellStatusBar } from './ShellStatusBar'

function ShellStatusBarLayout() {
  return (
    <>
      <ShellStatusBar />
      <Outlet />
    </>
  )
}

function renderShellStatusBar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<ShellStatusBarLayout />}>
          <Route path="/" element={<div data-testid="home-route">Home</div>} />
          <Route
            path="/report"
            element={<div data-testid="report-index-route">Report index</div>}
          />
          <Route
            path="/report/:week"
            element={<div data-testid="report-route">Report route</div>}
          />
          <Route path="/agency" element={<div data-testid="agency-route">Agency route</div>} />
          <Route path="/help" element={<div data-testid="help-route">Help route</div>} />
          <Route
            path="/recruitment"
            element={<div data-testid="recruitment-route">Recruitment</div>}
          />
          <Route path="/teams" element={<div data-testid="teams-route">Teams</div>} />
          <Route path="/intel" element={<div data-testid="intel-route">Intel</div>} />
          <Route path="/cases" element={<div data-testid="cases-route">Cases</div>} />
          <Route
            path="/cases/:caseId"
            element={<div data-testid="case-detail-route">Case detail</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function createBaseGame() {
  const game = createStartingState()

  game.week = 9
  game.funding = 512
  game.cases['case-001'] = {
    ...game.cases['case-001'],
    status: 'in_progress',
    contract: {
      offerId: 'offer-1',
      templateId: 'contract-ops',
      name: 'Operations Contract',
      strategyTag: 'income',
      riskLevel: 'medium',
      caseDifficulty: { combat: 10, investigation: 10, utility: 10, social: 10 },
      rewards: { funding: 120 },
      requirements: { recommendedClasses: ['hunter'], discouragedClasses: [] },
      modifiers: [],
      chain: {},
    },
    requiredRoles: [],
    requiredTags: [],
  }

  return normalizeGameState(game)
}

function createPressureGame() {
  const game = createBaseGame()

  game.funding = 8
  game.agency = {
    ...(game.agency ?? {
      containmentRating: game.containmentRating,
      clearanceLevel: game.clearanceLevel,
      funding: game.funding,
    }),
    funding: 8,
    fundingState: {
      ...(game.agency?.fundingState ?? {
        funding: 8,
        fundingBasePerWeek: game.config.fundingBasePerWeek,
        fundingPerResolution: game.config.fundingPerResolution,
        fundingPenaltyPerFail: game.config.fundingPenaltyPerFail,
        fundingPenaltyPerUnresolved: game.config.fundingPenaltyPerUnresolved,
        budgetPressure: 0,
        fundingHistory: [],
        procurementBacklog: [],
      }),
      funding: 8,
      procurementBacklog: [
        {
          requestId: 'req-1',
          itemId: 'ward_seals',
          quantity: 2,
          status: 'pending',
          requestedWeek: 1,
          cost: 12,
        },
      ],
    },
  }
  game.globalPressure = 120

  game.agents['a_ava'] = {
    ...game.agents['a_ava'],
    attritionState: {
      attritionStatus: 'lost',
      attritionCategory: 'injury_exit',
      attritionSinceWeek: 7,
      lossReasonCodes: ['test-loss'],
      replacementPriority: 3,
      retentionPressure: 2,
    },
  }
  game.agents['a_kellan'] = {
    ...game.agents['a_kellan'],
    attritionState: {
      attritionStatus: 'temporarily_unavailable',
      attritionCategory: 'temporary_leave',
      attritionSinceWeek: 8,
      returnEligibleWeek: 11,
      lossReasonCodes: ['test-temp-leave'],
      replacementPriority: 2,
      retentionPressure: 1,
    },
  }

  for (const caseId of Object.keys(game.cases)) {
    game.cases[caseId] = {
      ...game.cases[caseId],
      intelConfidence: 0.2,
      intelUncertainty: 0.8,
      intelLastUpdatedWeek: 1,
    }
  }

  game.teams['t_nightwatch'] = {
    ...game.teams['t_nightwatch'],
    status: { state: 'recovering', assignedCaseId: null },
  }

  return normalizeGameState(game)
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createBaseGame() })
})

describe('ShellStatusBar', () => {
  it('renders all required summary fields and compact status signals', () => {
    renderShellStatusBar('/')

    expect(screen.getByRole('banner', { name: /shell status bar/i })).toBeInTheDocument()
    expect(screen.getByText(/containment protocol/i)).toBeInTheDocument()
    expect(screen.getByText(/agency tier/i)).toBeInTheDocument()
    expect(screen.getByText(/clearance/i)).toBeInTheDocument()

    const metrics = screen.getByTestId('topbar-metrics-row')
    expect(within(metrics).getByText(/roster/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/contracts/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/^rep$/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/rank/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/money/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/year/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/season/i)).toBeInTheDocument()
    expect(within(metrics).getByText(/weeks/i)).toBeInTheDocument()

    const signals = screen.getByTestId('shell-status-signals-row')
    expect(within(signals).getByText(/budget/i)).toBeInTheDocument()
    expect(within(signals).getByText(/staffing/i)).toBeInTheDocument()
    expect(within(signals).getByText(/readiness/i)).toBeInTheDocument()
    expect(within(signals).getByText(/intel/i)).toBeInTheDocument()
    expect(within(signals).getByText(/alert/i)).toBeInTheDocument()
  })

  it('orders right-side controls correctly and keeps advance week as the final primary action', () => {
    renderShellStatusBar('/')

    const rightActions = screen.getByTestId('topbar-right-actions')
    const orderedActions = Array.from(rightActions.querySelectorAll('[data-topbar-action]')).map(
      (node) => node.getAttribute('data-topbar-action')
    )

    expect(orderedActions).toEqual(['help', 'mute', 'weekly-report', 'settings', 'advance-week'])

    const advanceButton = screen.getByTestId('topbar-advance-button')
    expect(advanceButton).toHaveClass('btn-primary')
    expect(orderedActions.at(-1)).toBe('advance-week')
  })

  it('keeps the empty live region mounted and updates it after a close', async () => {
    const user = userEvent.setup()
    renderShellStatusBar('/')
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toBeEmptyDOMElement()
    await user.click(screen.getByTestId('topbar-advance-button'))
    expect(screen.getByRole('status')).toBe(liveRegion)
    expect(liveRegion).toHaveTextContent(/week 9 closed/i)
  })

  it.each([0, 1, 3])(
    'clears stale announcements after replacing a save at offset %s',
    async (offset) => {
      const user = userEvent.setup()
      renderShellStatusBar('/')
      await user.click(screen.getByTestId('topbar-advance-button'))
      const replacement = structuredClone(useGameStore.getState().game)
      replacement.week += offset
      act(() => {
        useGameStore.setState({ game: replacement })
      })
      expect(screen.queryByTestId('shell-week-status')).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    }
  )

  it('preserves the announcement through config changes and save exports', async () => {
    const user = userEvent.setup()
    renderShellStatusBar('/')
    await user.click(screen.getByTestId('topbar-advance-button'))
    const panel = screen.getByTestId('shell-week-status')
    const message = panel.textContent
    act(() => {
      useGameStore.getState().updateConfig({})
      useGameStore.getState().exportSave()
      useGameStore.getState().exportRun()
    })
    expect(screen.getByTestId('shell-week-status')).toBe(panel)
    expect(panel.textContent).toBe(message)
  })

  it.each(['save', 'run'] as const)('does not announce an imported first close (%s)', (kind) => {
    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().advanceWeek()
    const payload =
      kind === 'save' ? useGameStore.getState().exportSave() : useGameStore.getState().exportRun()
    useGameStore.setState({ game: createStartingState() })
    renderShellStatusBar('/')
    act(() => {
      if (kind === 'save') useGameStore.getState().importSave(payload)
      else useGameStore.getState().importRun(payload)
    })
    expect(screen.queryByTestId('shell-week-status')).not.toBeInTheDocument()
    expect(screen.getByTestId('shell-week-live')).toBeEmptyDOMElement()
    act(() => {
      useGameStore.getState().advanceWeek()
    })
    expect(screen.getByTestId('shell-week-status')).toBeInTheDocument()
  })

  it('announces the closed week outcome, links to its report, and moves focus', async () => {
    const user = userEvent.setup()
    renderShellStatusBar('/')

    expect(screen.queryByTestId('shell-week-status')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-advance-button'))

    const weekStatus = screen.getByTestId('shell-week-status')
    const liveMessage = within(weekStatus).getByRole('status')

    expect(weekStatus).toHaveFocus()
    expect(liveMessage).toHaveTextContent(/week 9 closed/i)
    expect(liveMessage).toHaveTextContent(/\d+ resolved, \d+ partial, \d+ failed/i)
    expect(within(weekStatus).getByRole('link', { name: /open week 9 report/i })).toHaveAttribute(
      'href',
      '/report/9'
    )
  })

  it('announces a store-driven advance so the Front Desk control is covered too', () => {
    renderShellStatusBar('/')

    expect(screen.queryByTestId('shell-week-status')).not.toBeInTheDocument()

    // Front Desk advances through the store directly; the shell button is not involved.
    act(() => {
      useGameStore.getState().advanceWeek()
    })

    const weekStatus = screen.getByTestId('shell-week-status')
    expect(weekStatus).toHaveFocus()
    expect(within(weekStatus).getByRole('status')).toHaveTextContent(/week 9 closed/i)
    expect(within(weekStatus).getByRole('link', { name: /open week 9 report/i })).toHaveAttribute(
      'href',
      '/report/9'
    )
  })

  it('clears the status when the simulation returns to an earlier week', async () => {
    const user = userEvent.setup()
    renderShellStatusBar('/')

    await user.click(screen.getByTestId('topbar-advance-button'))
    expect(screen.getByTestId('shell-week-status')).toBeInTheDocument()

    act(() => {
      useGameStore.setState({ game: createBaseGame() })
    })

    expect(screen.queryByTestId('shell-week-status')).not.toBeInTheDocument()
  })

  it('drills weekly report to the latest available report when the current week report is missing', async () => {
    const user = userEvent.setup()
    const game = createBaseGame()

    game.reports.push({
      week: 8,
      rngStateBefore: 1,
      rngStateAfter: 2,
      newCases: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      spawnedCases: [],
      maxStage: 0,
      avgFatigue: 0,
      teamStatus: [],
      notes: [],
    })
    useGameStore.setState({ game: normalizeGameState(game) })

    renderShellStatusBar('/')

    const weeklyReportLink = screen.getByRole('link', { name: /weekly report for week 8/i })
    expect(weeklyReportLink).toHaveAttribute('href', '/report/8')

    await user.click(weeklyReportLink)
    expect(screen.getByTestId('report-route')).toBeInTheDocument()
  })

  it('updates from live canonical state and surfaces warning indicators when pressure is present', () => {
    renderShellStatusBar('/')

    expect(screen.getByTestId('shell-status-budget')).toHaveAttribute('data-status-tone', 'neutral')
    expect(screen.getByTestId('shell-status-alert')).toHaveAttribute('data-status-tone', 'neutral')

    act(() => {
      useGameStore.setState({ game: createPressureGame() })
    })

    expect(screen.getByTestId('shell-status-budget')).toHaveAttribute('data-status-tone', 'danger')
    expect(screen.getByTestId('shell-status-staffing')).toHaveAttribute(
      'data-status-tone',
      'warning'
    )
    expect(screen.getByTestId('shell-status-readiness')).toHaveAttribute(
      'data-status-tone',
      'danger'
    )
    expect(screen.getByTestId('shell-status-intel')).toHaveAttribute('data-status-tone', 'danger')
    expect(screen.getByTestId('shell-status-alert')).toHaveAttribute('data-status-tone', 'danger')
    expect(screen.getByTestId('shell-status-budget')).toHaveAttribute(
      'title',
      expect.stringMatching(/budget pressure/i)
    )
  })

  it('keeps the strip compact for standard desktop widths', () => {
    renderShellStatusBar('/')

    const topBar = screen.getByRole('banner', { name: /shell status bar/i })
    const strip = screen.getByTestId('shell-status-strip')

    expect(topBar).toHaveClass('topbar-shell')
    expect(strip).toHaveClass('whitespace-nowrap')
  })

  it('aligns triage queue depth with cases URL status filters', () => {
    const game = createBaseGame()
    game.cases = {
      'case-open': {
        ...game.cases['case-001']!,
        id: 'case-open',
        templateId: 'case-open',
        title: 'Open only',
        status: 'open',
        assignedTeamIds: [],
        contract: undefined,
      },
      'case-active': {
        ...game.cases['case-001']!,
        id: 'case-active',
        templateId: 'case-active',
        title: 'In progress',
        status: 'in_progress',
        assignedTeamIds: [],
        contract: undefined,
      },
    }
    useGameStore.setState({ game: normalizeGameState(game) })

    renderShellStatusBar('/cases')
    const allQueue = screen.getByTestId('shell-status-triage-queue')
    expect(allQueue).toHaveTextContent('Queue2')
    cleanup()

    renderShellStatusBar('/cases?status=open')
    const openQueue = screen.getByTestId('shell-status-triage-queue')
    expect(openQueue).toHaveTextContent('Queue1')
    expect(openQueue.textContent).not.toEqual(allQueue.textContent)

    const routableLink = screen.getByTestId('shell-status-triage-routable')
    expect(routableLink).toHaveAttribute('href', '/cases?status=open')
  })

  it('shows triage tail chips on cases routes only', () => {
    const game = createBaseGame()
    game.cases['case-urgent'] = {
      ...game.cases['case-001']!,
      id: 'case-urgent',
      templateId: 'case-urgent',
      title: 'Urgent triage case',
      status: 'open',
      stage: 4,
      deadlineRemaining: 1,
      assignedTeamIds: [],
      contract: undefined,
    }
    useGameStore.setState({ game: normalizeGameState(game) })

    renderShellStatusBar('/agency')
    const agencySignals = screen.getByTestId('shell-status-signals-row')
    expect(
      within(agencySignals).queryByTestId('shell-status-triage-routable')
    ).not.toBeInTheDocument()
    cleanup()

    renderShellStatusBar('/cases')
    const casesSignals = screen.getByTestId('shell-status-signals-row')
    expect(within(casesSignals).getByTestId('shell-status-triage-queue')).toBeInTheDocument()
    expect(within(casesSignals).getByTestId('shell-status-triage-routable')).toBeInTheDocument()
    expect(within(casesSignals).getByTestId('shell-status-triage-urgent')).toHaveAttribute(
      'data-status-tone',
      'warning'
    )
    cleanup()

    renderShellStatusBar('/cases/case-urgent')
    expect(screen.getByTestId('shell-status-triage-routable')).toBeInTheDocument()
  })

  it('disables advance action when simulation is halted', () => {
    const game = createBaseGame()
    game.gameOver = true
    game.gameOverReason = 'Simulation halted for test coverage.'
    useGameStore.setState({ game: normalizeGameState(game) })

    renderShellStatusBar('/')

    const advanceButton = screen.getByTestId('topbar-advance-button')
    expect(advanceButton).toBeDisabled()
    expect(advanceButton).toHaveAttribute('title', 'Simulation halted')
  })
})
