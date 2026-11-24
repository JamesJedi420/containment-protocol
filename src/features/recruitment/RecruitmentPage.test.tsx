// cspell:words cand
import '../../test/setup'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { type Candidate } from '../../domain/models'
import { useGameStore } from '../../app/store/gameStore'
import RecruitmentPage from './RecruitmentPage'
import { RECRUITMENT_LIST_PREFERENCES_KEY } from './recruitmentListPreferences'

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
        specialization: 'recon',
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
  localStorage.removeItem(RECRUITMENT_LIST_PREFERENCES_KEY)
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
    const averyCard = screen.getByText(/^avery holt$/i).closest('li')
    expect(averyCard).not.toBeNull()
    expect(within(averyCard!).getByText(/weekly wage:/i)).toHaveTextContent(/\$30/i)
    expect(within(averyCard!).getByText(/clearance readiness/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/stage: prospect/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/full access pending/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/identity: required/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/oath contract: blocked/i)).toBeInTheDocument()

    const searchInput = screen.getByRole('textbox', { name: /^search$/i })
    await user.type(searchInput, 'briar')

    expect(screen.queryByText(/avery holt/i)).not.toBeInTheDocument()
    expect(screen.getByText(/briar lane/i)).toBeInTheDocument()
    expect(screen.getByText(/overall fit obscured/i)).toBeInTheDocument()
  })

  it('rejects a stale operative offer and rechecks faction policy before hiring', async () => {
    const user = userEvent.setup()
    const game = buildRecruitmentGame()
    game.funding = 120
    const candidate = game.candidates.find((entry) => entry.category === 'agent')!
    const offer: Candidate = {
      ...candidate,
      revealLevel: 0,
      evaluation: {
        ...candidate.evaluation,
        overallVisible: false,
        potentialVisible: false,
      },
      sourceFactionId: 'black_budget',
      sourceRequiredTier: 'allied',
    }
    const faction = game.factions?.black_budget
    if (!faction) throw new Error('Expected Black Budget faction in the starting campaign')
    const initial = {
      ...game,
      candidates: [offer],
      factions: { ...game.factions, black_budget: { ...faction, reputation: 80 } },
    }
    useGameStore.setState({ game: initial })
    renderRecruitmentPage()

    const hire = screen.getByRole('button', { name: 'Hire' })
    expect(hire).toBeEnabled()
    expect(screen.getByText(/Hire outcome: Field Recon/i)).toBeInTheDocument()

    const changedRole = {
      ...initial,
      candidates: [{ ...offer, agentData: { ...offer.agentData, specialization: 'patrol' } }],
    }
    act(() => {
      useGameStore.setState({ game: changedRole })
      // The rendered button still represents the old offer during this update.
      fireEvent.click(hire)
    })
    expect(useGameStore.getState().game).toEqual(changedRole)
    expect(screen.getByText('Avery Holt')).toBeInTheDocument()

    const policyBlocked = {
      ...changedRole,
      factions: { ...changedRole.factions, black_budget: { ...faction, reputation: 0 } },
    }
    act(() => {
      useGameStore.setState({ game: policyBlocked })
      // The role now matches, but the live faction no longer permits the offer.
      fireEvent.click(hire)
    })
    expect(useGameStore.getState().game).toEqual(policyBlocked)
    expect(screen.getByText('Avery Holt')).toBeInTheDocument()
    expect(screen.getByText(/Hiring blocked: faction-locked/i)).toBeInTheDocument()
    expect(screen.getByText(/overall fit obscured/i)).toBeInTheDocument()
    expect(hire).toBeDisabled()

    act(() => useGameStore.setState({ game: changedRole }))
    await user.click(hire)
    const hired = useGameStore.getState().game
    expect(hired.agents[offer.id]?.role).toBe('hunter')
    expect(hired.funding).toBe(90)
    expect(hired.candidates).toEqual([])
    expect(hired.events.filter((event) => event.type === 'agent.hired')).toHaveLength(1)
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

  it('restores browser-local filters on an ordinary visit and clears them with Reset filters', async () => {
    const user = userEvent.setup()
    const game = buildRecruitmentGame()
    useGameStore.setState({ game })
    const firstVisit = renderRecruitmentPage()

    await user.type(screen.getByLabelText('Search'), 'avery')
    await user.selectOptions(screen.getByLabelText('Category'), 'agent')
    await user.selectOptions(screen.getByLabelText('Sort'), 'name')
    await user.click(screen.getByLabelText('Expiring soon only'))
    firstVisit.unmount()

    const secondVisit = renderRecruitmentPage()
    expect(screen.getByText('Saved filters restored')).toHaveRole('status')
    expect(screen.getByLabelText('Search')).toHaveValue('avery')
    expect(screen.getByLabelText('Category')).toHaveValue('agent')
    expect(screen.getByLabelText('Sort')).toHaveValue('name')
    expect(screen.getByLabelText('Expiring soon only')).toBeChecked()
    const board = within(screen.getByRole('article', { name: 'Candidate board' }))
    expect(board.getByText('Avery Holt')).toBeInTheDocument()
    expect(board.queryByText('Briar Lane')).not.toBeInTheDocument()

    screen.getByRole('button', { name: 'Reset filters' }).focus()
    await user.keyboard('{Enter}')
    expect(localStorage.getItem(RECRUITMENT_LIST_PREFERENCES_KEY)).toBeNull()
    expect(useGameStore.getState().game).toBe(game)
    secondVisit.unmount()

    renderRecruitmentPage()
    expect(screen.getByLabelText('Search')).toHaveValue('')
    expect(screen.getByLabelText('Category')).toHaveValue('all')
    expect(screen.getByLabelText('Sort')).toHaveValue('expiry')
    expect(screen.getByLabelText('Expiring soon only')).not.toBeChecked()
  })

  it('updates an already-mounted live region when saved filters are restored', () => {
    localStorage.setItem(RECRUITMENT_LIST_PREFERENCES_KEY, 'sort=name')
    const observer = new MutationObserver(() => {})
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    renderRecruitmentPage()

    const status = screen.getByText('Saved filters restored')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(observer.takeRecords().some((record) => record.target === status)).toBe(true)
    observer.disconnect()
  })

  it('opens an explicit candidate excluded by saved filters and keeps the saved filters intact', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })
    const saved = 'q=briar&category=staff&sort=wage'
    localStorage.setItem(RECRUITMENT_LIST_PREFERENCES_KEY, saved)

    renderRecruitmentPage('/recruitment?candidate=cand-agent-001')

    const board = within(screen.getByRole('article', { name: 'Candidate board' }))
    expect(board.getByText('Avery Holt')).toBeInTheDocument()
    expect(board.queryByText('Briar Lane')).not.toBeInTheDocument()
    await user.click(board.getByRole('button', { name: 'Clear candidate filter' }))
    expect(board.getByText('Avery Holt')).toBeInTheDocument()
    expect(board.getByText('Briar Lane')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toHaveValue('')
    expect(localStorage.getItem(RECRUITMENT_LIST_PREFERENCES_KEY)).toBe(saved)
  })

  it('keeps both changes when filter controls fire before the router renders', () => {
    renderRecruitmentPage()

    act(() => {
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'agent' } })
      fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'name' } })
    })

    expect(screen.getByLabelText('Category')).toHaveValue('agent')
    expect(screen.getByLabelText('Sort')).toHaveValue('name')
    expect(localStorage.getItem(RECRUITMENT_LIST_PREFERENCES_KEY)).toBe('category=agent&sort=name')
  })

  it.each(['?sort=expiry', '?candidate=missing'])(
    'keeps explicit defaults after normalizing %s to an empty query',
    (search) => {
      localStorage.setItem(RECRUITMENT_LIST_PREFERENCES_KEY, 'q=briar&sort=name')

      renderRecruitmentPage(`/recruitment${search}`)

      expect(screen.getByTestId('location-search').textContent).toBe('')
      expect(screen.getByLabelText('Search')).toHaveValue('')
      expect(screen.getByLabelText('Sort')).toHaveValue('expiry')
      expect(localStorage.getItem(RECRUITMENT_LIST_PREFERENCES_KEY)).toBe('q=briar&sort=name')
    }
  )

  it('normalizes saved query values through the same rules as the live controls', () => {
    useGameStore.setState({ game: buildRecruitmentGame() })
    localStorage.setItem(
      RECRUITMENT_LIST_PREFERENCES_KEY,
      'q=++avery++&category=retired&sort=unknown&expiring=invalid&candidate=cand-staff-001'
    )

    renderRecruitmentPage()

    expect(screen.getByLabelText('Search')).toHaveValue('avery')
    expect(screen.getByLabelText('Category')).toHaveValue('all')
    expect(screen.getByLabelText('Sort')).toHaveValue('expiry')
    expect(screen.getByLabelText('Expiring soon only')).not.toBeChecked()
    expect(screen.queryByRole('button', { name: 'Clear candidate filter' })).not.toBeInTheDocument()
  })

  it.each(['{broken-json', `q=${'x'.repeat(2048)}`])(
    'uses default filters when saved data is malformed or oversized',
    (saved) => {
      localStorage.setItem(RECRUITMENT_LIST_PREFERENCES_KEY, saved)

      renderRecruitmentPage()

      expect(screen.getByLabelText('Search')).toHaveValue('')
      expect(screen.getByLabelText('Sort')).toHaveValue('expiry')
      expect(screen.queryByText('Saved filters restored')).not.toBeInTheDocument()
    }
  )

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

  it('lets the player commission a scout report for agent recruits', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })
    const fundingBefore = useGameStore.getState().game.funding

    renderRecruitmentPage()

    await user.click(screen.getByRole('button', { name: /^scout/i }))

    expect(useGameStore.getState().game.funding).toBeLessThan(fundingBefore)
    expect(useGameStore.getState().game.candidates[0]?.scoutReport).toBeDefined()
    const averyCard = screen.getByText(/^avery holt$/i).closest('li')
    expect(averyCard).not.toBeNull()
    expect(within(averyCard!).getByText(/scout report: projected /i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/scout confidence: /i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/broad ceiling bands:/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/known now:/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/uncertainty:/i)).toBeInTheDocument()
    expect(within(averyCard!).getByText(/next scout:/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /scouting posture/i })).toBeInTheDocument()
    expect(screen.getByText(/recent scouting outcomes/i)).toBeInTheDocument()
    expect(screen.getByText(/avery holt scouting initiated/i)).toBeInTheDocument()
  })

  it('uses the exact live candidate from a scouting notice and restores the prior board on Back', async () => {
    const user = userEvent.setup()
    const game = buildRecruitmentGame()
    game.candidates[0]!.id = 'candidate:avery & 1'
    useGameStore.setState({ game })
    renderRecruitmentPage('/recruitment?sort=name')

    const board = within(screen.getByRole('article', { name: 'Candidate board' }))
    await user.click(board.getByRole('button', { name: /^scout/i }))
    const committedGame = useGameStore.getState().game
    const noticeLink = screen.getByRole('link', {
      name: 'View candidate: Avery Holt scouting initiated',
    })
    noticeLink.focus()
    await user.keyboard('{Enter}')

    const search = screen.getByTestId('location-search').textContent ?? ''
    expect(new URLSearchParams(search).get('candidate')).toBe('candidate:avery & 1')
    expect(board.getByRole('heading', { name: 'Candidate board' })).toHaveFocus()
    expect(board.getByRole('status')).toHaveTextContent('from the scouting notice')
    expect(board.getByText('Avery Holt')).toBeInTheDocument()
    expect(board.queryByText('Briar Lane')).not.toBeInTheDocument()
    expect(useGameStore.getState().game).toBe(committedGame)

    await user.click(board.getByRole('button', { name: /^follow-up scout/i }))
    const refinedNotice = screen.getByRole('link', {
      name: 'View candidate: Avery Holt scouting refined',
    })
    refinedNotice.focus()
    await user.keyboard('{Enter}')
    expect(board.getByRole('heading', { name: 'Candidate board' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByTestId('location-search')).toHaveTextContent('?sort=name')
    expect(board.getByText('Briar Lane')).toBeInTheDocument()
  })

  it.each([
    { saved: null, priorSort: 'expiry' },
    { saved: 'sort=wage', priorSort: 'wage' },
  ])(
    'restores the prior queryless board after editing a notice ($priorSort)',
    async ({ saved, priorSort }) => {
      const user = userEvent.setup()
      useGameStore.setState({ game: buildRecruitmentGame() })
      if (saved) localStorage.setItem(RECRUITMENT_LIST_PREFERENCES_KEY, saved)
      renderRecruitmentPage()

      expect(screen.getByLabelText('Sort')).toHaveValue(priorSort)
      const board = within(screen.getByRole('article', { name: 'Candidate board' }))
      await user.click(board.getByRole('button', { name: /^scout/i }))
      await user.click(
        screen.getByRole('link', { name: 'View candidate: Avery Holt scouting initiated' })
      )
      await user.selectOptions(screen.getByLabelText('Sort'), 'name')
      await user.click(screen.getByRole('button', { name: 'Go back' }))
      expect(screen.getByLabelText('Sort')).toHaveValue(priorSort)
      expect(localStorage.getItem(RECRUITMENT_LIST_PREFERENCES_KEY)).toContain('sort=name')
    }
  )

  it('can clear a candidate target while keeping compatible board filters', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })
    renderRecruitmentPage('/recruitment?candidate=cand-agent-001&category=agent&expiring=1')

    const board = within(screen.getByRole('article', { name: 'Candidate board' }))
    expect(board.getByText('Avery Holt')).toBeInTheDocument()
    const sortControl = screen.getByRole('combobox', { name: 'Sort' })
    await user.selectOptions(sortControl, 'name')
    expect(sortControl).toHaveFocus()
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?category=agent&sort=name&expiring=1&candidate=cand-agent-001'
    )
    expect(board.getByRole('status')).toBeInTheDocument()

    await user.click(board.getByRole('button', { name: 'Clear candidate filter' }))
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?category=agent&sort=name&expiring=1'
    )
    expect(board.queryByRole('status')).not.toBeInTheDocument()
    expect(board.queryByText('Briar Lane')).not.toBeInTheDocument()
  })

  it.each(['missing', 'expired', 'unavailable', 'excluded by the board filter'])(
    'falls back to the filtered board when the target is %s',
    async (condition) => {
      const game = buildRecruitmentGame()
      const candidate = game.candidates[0]!
      if (condition === 'missing') game.candidates.shift()
      if (condition === 'expired') candidate.expiryWeek = game.week - 1
      if (condition === 'unavailable') candidate.hireStatus = 'reserved'
      useGameStore.setState({ game })
      const filters = condition === 'excluded by the board filter' ? 'category=staff' : 'sort=name'
      renderRecruitmentPage(`/recruitment?candidate=${candidate.id}&${filters}`)

      await waitFor(() => {
        expect(screen.getByTestId('location-search')).toHaveTextContent(`?${filters}`)
      })
      const board = within(screen.getByRole('article', { name: 'Candidate board' }))
      expect(board.queryByRole('status')).not.toBeInTheDocument()
      expect(board.getByText('Briar Lane')).toBeInTheDocument()
    }
  )

  it('shows the eventual hire class for remapped agent candidates', () => {
    useGameStore.setState({ game: buildRecruitmentGame() })

    renderRecruitmentPage()

    expect(screen.getByText(/hire outcome: field recon/i)).toBeInTheDocument()
    expect(screen.getByText(/field recon path/i)).toBeInTheDocument()
  })

  it('opens the confirmed candidate with exact ceiling intel after a deep scan', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: buildRecruitmentGame() })

    renderRecruitmentPage()

    await user.click(screen.getByRole('button', { name: /^scout/i }))
    await user.click(screen.getByRole('button', { name: /^follow-up scout/i }))
    await user.click(screen.getByRole('button', { name: /^deep recon scan/i }))

    await user.click(
      await screen.findByRole('link', { name: 'View candidate: Avery Holt intel confirmed' })
    )

    const board = within(screen.getByRole('article', { name: 'Candidate board' }))
    expect(screen.getByTestId('location-search')).toHaveTextContent('?candidate=cand-agent-001')
    expect(board.getByText(/confirmed ceiling intel:/i)).toBeInTheDocument()
    expect(board.queryByText(/broad ceiling bands:/i)).not.toBeInTheDocument()
    expect(board.queryByText('Briar Lane')).not.toBeInTheDocument()
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
