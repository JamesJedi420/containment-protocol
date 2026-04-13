// cspell:words topbar
import '../../test/setup'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { normalizeGameState } from '../../domain/teamSimulation'
import { useGameStore } from '../../app/store/gameStore'
import { ShellStatusBar } from './ShellStatusBar'

function renderShellStatusBar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<ShellStatusBar />} />
        <Route path="/report" element={<div data-testid="report-index-route">Report index</div>} />
        <Route path="/report/:week" element={<div data-testid="report-route">Report route</div>} />
        <Route path="/agency" element={<div data-testid="agency-route">Agency route</div>} />
        <Route path="/help" element={<div data-testid="help-route">Help route</div>} />
        <Route path="/recruitment" element={<div data-testid="recruitment-route">Recruitment</div>} />
        <Route path="/teams" element={<div data-testid="teams-route">Teams</div>} />
        <Route path="/intel" element={<div data-testid="intel-route">Intel</div>} />
        <Route path="/cases" element={<div data-testid="cases-route">Cases</div>} />
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

    expect(orderedActions).toEqual([
      'help',
      'mute',
      'weekly-report',
      'settings',
      'advance-week',
    ])

    const advanceButton = screen.getByTestId('topbar-advance-button')
    expect(advanceButton).toHaveClass('btn-primary')
    expect(orderedActions.at(-1)).toBe('advance-week')
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
