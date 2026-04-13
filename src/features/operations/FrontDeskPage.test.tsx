import '../../test/setup'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import FrontDeskPage from './FrontDeskPage'

function renderFrontDesk() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<FrontDeskPage />} />
        <Route path="/report" element={<p>Reports home</p>} />
        <Route path="/recruitment" element={<p>Recruitment home</p>} />
        <Route path="/teams" element={<p>Teams home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('FrontDeskPage', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('renders the bounded operations hub sections and supports drill-ins', async () => {
    const user = userEvent.setup()
    renderFrontDesk()

    expect(screen.getByRole('region', { name: /operations hub overview/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /operations \/ assignments \/ queues/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /current campaign state/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /active pressures/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent reports \/ events/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /immediate attention/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /teams \/ field status/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /procurement snapshot/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /agency standing/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /latest report/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /weekly reports/i }))
    expect(screen.getByText(/reports home/i)).toBeInTheDocument()
  })

  it('reflects live canonical state and degrades cleanly when optional data is missing', async () => {
    renderFrontDesk()

    expect(screen.getByText(/no reports yet\. advance a week to begin the run\./i)).toBeInTheDocument()
    expect(screen.getByText(/no recent reports or events are available yet\./i)).toBeInTheDocument()

    const next = createStartingState()
    next.trainingQueue = [
      {
        id: 'training-test',
        agentId: 'agent-001',
        agentName: 'Ava Brooks',
        trainingId: 'training-001',
        trainingName: 'Containment Drills',
        remainingWeeks: 2,
      } as never,
    ]
    next.reports = [
      {
        week: 1,
        rngStateBefore: 100,
        rngStateAfter: 101,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 2,
        avgFatigue: 5,
        teamStatus: [],
        notes: [],
      },
    ]

    act(() => {
      useGameStore.setState({ game: next })
    })

    await waitFor(() => {
      expect(screen.getByText(/1 program in the academy queue\./i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^week 1$/i })).toBeInTheDocument()
      expect(screen.getByText(/1 resolved, 0 unresolved triggers, 0 spawned cases/i)).toBeInTheDocument()
    })
  })

  it('logs the selected front-desk routes once per route signature', async () => {
    const { rerender } = renderFrontDesk()

    await waitFor(() => {
      const entries = useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []
      expect(entries.some((entry) => entry.type === 'route.selected')).toBe(true)
    })

    const initialRouteLogCount = (useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []).filter(
      (entry) => entry.type === 'route.selected'
    ).length

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FrontDeskPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const entries = useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []
      expect(entries.filter((entry) => entry.type === 'route.selected')).toHaveLength(
        initialRouteLogCount
      )
    })
  })
})
