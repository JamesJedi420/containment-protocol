import '../../test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { type Candidate } from '../../domain/models'
import { useGameStore } from '../../app/store/gameStore'
import RecruitmentPage from './RecruitmentPage'

const baseEvaluation = {
  overallVisible: true,
  overallValue: 72,
  potentialVisible: true,
  potentialTier: 'mid' as const,
  rumorTags: ['steady-aim'],
  impression: 'Strong first impression.',
  teamwork: 'Collaborative.',
  outlook: 'Likely to scale with support.',
}

function buildRecruitmentGame() {
  const game = createStartingState()
  game.week = 5
  game.candidates = [
    {
      id: 'cand-agent-001',
      name: 'Avery Holt',
      portraitId: 'portrait-agent-1',
      age: 28,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 30,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: baseEvaluation,
      agentData: {
        role: 'combat',
        specialization: 'breach-entry',
        stats: { combat: 80, investigation: 42, utility: 48, social: 35 },
        traits: ['steady-aim'],
      },
    } as Candidate,
    {
      id: 'cand-staff-001',
      name: 'Briar Lane',
      portraitId: 'portrait-staff-1',
      age: 36,
      category: 'staff',
      hireStatus: 'candidate',
      weeklyWage: 18,
      revealLevel: 1,
      expiryWeek: 3,
      evaluation: {
        ...baseEvaluation,
        overallVisible: false,
        overallValue: undefined,
      },
      staffData: {
        specialty: 'analysis',
        assignmentType: 'pattern-review',
        passiveBonuses: { analysisQuality: 0.05 },
      },
    } as Candidate,
  ]

  return game
}

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

function renderRecruitmentPage(route = '/recruitment') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="/recruitment"
          element={
            <>
              <LocationSearchProbe />
              <HistoryNavControls />
              <RecruitmentPage />
            </>
          }
        />
        <Route
          path="/agency"
          element={
            <>
              <LocationSearchProbe />
              <HistoryNavControls />
              <div data-testid="agency-page">Agency placeholder</div>
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

describe('RecruitmentPage', () => {
  it('filters candidates and surfaces urgency and wage details', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })

    renderRecruitmentPage()

    expect(screen.getByRole('heading', { name: /^recruitment$/i })).toBeInTheDocument()
    expect(screen.getByText(/open candidates/i)).toBeInTheDocument()
    expect(screen.getByText(/weekly wage and expiry are shown per candidate/i)).toBeInTheDocument()
    expect(screen.getByText(/avery holt/i)).toBeInTheDocument()
    expect(screen.getByText(/briar lane/i)).toBeInTheDocument()
    expect(screen.getAllByText(/expiring soon/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/weekly wage: \$30/i)).toBeInTheDocument()

    const searchInput = screen.getByRole('textbox', { name: /^search$/i })
    await user.type(searchInput, 'briar')

    expect(screen.queryByText(/avery holt/i)).not.toBeInTheDocument()
    expect(screen.getByText(/briar lane/i)).toBeInTheDocument()
    expect(screen.getByText(/overall fit obscured/i)).toBeInTheDocument()
  })

  it('hydrates URL filters and applies candidate board filtering', async () => {
    useGameStore.setState({ game: buildRecruitmentGame() })

    renderRecruitmentPage('/recruitment?q=avery&category=agent&sort=name&expiring=1')

    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toHaveValue('avery')
    })

    expect(screen.getByLabelText('Category')).toHaveValue('agent')
    expect(screen.getByLabelText('Sort')).toHaveValue('name')
    expect(screen.getByLabelText('Expiring soon only')).toBeChecked()
    expect(screen.getByText(/avery holt/i)).toBeInTheDocument()
    expect(screen.queryByText(/briar lane/i)).not.toBeInTheDocument()
  })

  it('updates URL filters and resets to canonical defaults', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })

    renderRecruitmentPage()

    await user.type(screen.getByLabelText('Search'), 'briar')
    await user.selectOptions(screen.getByLabelText('Category'), 'staff')
    await user.selectOptions(screen.getByLabelText('Sort'), 'name')
    await user.click(screen.getByLabelText('Expiring soon only'))

    await waitFor(() => {
      const locationSearch = screen.getByTestId('location-search').textContent ?? ''
      const params = new URLSearchParams(locationSearch.replace(/^\?/, ''))

      expect(params.get('q')).toBe('briar')
      expect(params.get('category')).toBe('staff')
      expect(params.get('sort')).toBe('name')
      expect(params.get('expiring')).toBe('1')
    })

    await user.click(screen.getByRole('button', { name: /reset filters/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('')
    })
  })

  it('rehydrates recruitment filters from URL after remount', async () => {
    useGameStore.setState({ game: buildRecruitmentGame() })
    const route = '/recruitment?q=avery&category=agent&sort=name&expiring=1'

    const firstRender = renderRecruitmentPage(route)

    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toHaveValue('avery')
      expect(screen.getByLabelText('Category')).toHaveValue('agent')
      expect(screen.getByLabelText('Sort')).toHaveValue('name')
      expect(screen.getByLabelText('Expiring soon only')).toBeChecked()
    })

    firstRender.unmount()

    renderRecruitmentPage(route)

    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toHaveValue('avery')
      expect(screen.getByLabelText('Category')).toHaveValue('agent')
      expect(screen.getByLabelText('Sort')).toHaveValue('name')
      expect(screen.getByLabelText('Expiring soon only')).toBeChecked()
    })
  })

  it('normalizes invalid URL params to defaults while preserving valid search', async () => {
    useGameStore.setState({ game: buildRecruitmentGame() })
    renderRecruitmentPage('/recruitment?q=  avery  &category=invalid&sort=broken&expiring=nope')

    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toHaveValue('avery')
    })

    expect(screen.getByLabelText('Category')).toHaveValue('all')
    expect(screen.getByLabelText('Sort')).toHaveValue('expiry')
    expect(screen.getByLabelText('Expiring soon only')).not.toBeChecked()

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?q=avery')
    })
  })

  it('hired candidates are removed from the live recruitment pipeline', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })

    renderRecruitmentPage()

    await user.click(screen.getAllByRole('button', { name: /^hire$/i })[0]!)

    expect(useGameStore.getState().game.candidates).toHaveLength(1)
    expect(useGameStore.getState().game.candidates[0]?.id).toBe('cand-agent-001')
    expect(screen.getByText(/avery holt/i)).toBeInTheDocument()
    expect(screen.queryByText(/briar lane/i)).not.toBeInTheDocument()
  })

  it('disables hire when the domain preview reports insufficient funding', () => {
    const game = buildRecruitmentGame()
    game.funding = 10
    useGameStore.setState({ game })

    renderRecruitmentPage()

    expect(screen.getAllByText(/hiring blocked: insufficient-funding/i).length).toBeGreaterThan(0)
    expect(
      screen
        .getAllByRole('button', { name: /^hire$/i })
        .every((button) => button.hasAttribute('disabled'))
    ).toBe(true)
  })
})

it('has accessible filter panel with proper semantics', () => {
  useGameStore.setState({ game: buildRecruitmentGame() })
  renderRecruitmentPage()

  // Filter region should exist with proper aria-label
  const filterRegion = screen.getByRole('region', { name: /recruitment filters/i })
  expect(filterRegion).toBeInTheDocument()

  // All filter controls should have associated labels and IDs
  expect(screen.getByLabelText(/^search$/i)).toHaveAttribute('id', 'recruitment-search')
  expect(screen.getByLabelText(/^category$/i)).toHaveAttribute('id', 'recruitment-category')
  expect(screen.getByLabelText(/^sort$/i)).toHaveAttribute('id', 'recruitment-sort')
})

it('preserves recruitment filters through agency navigation and back/forward', async () => {
  const user = userEvent.setup()
  useGameStore.setState({ game: buildRecruitmentGame() })
  renderRecruitmentPage('/recruitment')

  await user.type(screen.getByLabelText('Search'), 'avery')
  await user.selectOptions(screen.getByLabelText('Category'), 'agent')

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('?q=avery&category=agent')
  })

  await user.click(screen.getByRole('link', { name: /open agency/i }))

  await waitFor(() => {
    expect(screen.getByTestId('agency-page')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /go back/i }))

  await waitFor(() => {
    expect(screen.getByLabelText('Search')).toHaveValue('avery')
    expect(screen.getByLabelText('Category')).toHaveValue('agent')
  })

  await user.click(screen.getByRole('button', { name: /go forward/i }))

  await waitFor(() => {
    expect(screen.getByTestId('agency-page')).toBeInTheDocument()
  })
})
