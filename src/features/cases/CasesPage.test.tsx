// cspell:words greentape
import '../../test/setup'
import { render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '../../app/store/gameStore'
import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import { normalizeMissionRoutingState } from '../../domain/missionIntakeRouting'
import { copyInfiltrationProbePlan } from '../../domain/infiltrationProbe'
import type { CaseInstance } from '../../domain/models'
import { caseTemplateMap } from '../../domain/templates/caseTemplates'
import { createStarterCase } from '../../domain/templates/startingCases'
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

  const caseLink = screen
    .getAllByRole('link', { name: /vampire nest in the stockyards/i })
    .find((link) => link.getAttribute('href')?.includes('/cases/case-001?'))
  expect(caseLink).toBeDefined()
  expect(caseLink).toHaveAttribute(
    'href',
    '/cases/case-001?q=stockyards&sort=title&case=case-001'
  )
})

it('sorts cases by title from query state', () => {
  const game = createStartingState()
  game.cases = {
    alpha: makeCase('alpha', 'Alpha Case'),
    zulu: makeCase('zulu', 'Zulu Case'),
  }

  useGameStore.setState({ game })

  renderCasesPage(['/cases?sort=title'])

  const triageList = screen.getByLabelText('Triage list')
  const alphaLink = within(triageList).getByTestId('case-title-link-alpha')
  const zuluLink = within(triageList).getByTestId('case-title-link-zulu')
  expect(alphaLink.compareDocumentPosition(zuluLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('renders urgency markers for triage cases', async () => {
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
  await selectTriageCase(user, 'High Risk Case')

  const highRiskCard = getCardByName('High Risk Case')
  expect(within(highRiskCard).getByText('Unassigned')).toBeInTheDocument()
  expect(within(highRiskCard).getByText('High stage')).toBeInTheDocument()
  expect(within(highRiskCard).getByText('Deadline risk')).toBeInTheDocument()

  await selectTriageCase(user, 'Blocked Case')
  const blockedCard = getCardByName('Blocked Case')
  expect(within(blockedCard).getByText('Required-role blocked')).toBeInTheDocument()

  await selectTriageCase(user, 'Raid Capacity Case')
  const raidCard = getCardByName('Raid Capacity Case')
  expect(within(raidCard).getByText('Raid at capacity')).toBeInTheDocument()

  await selectTriageCase(user, 'Unassigned Case')
  const idleCard = getCardByName('Unassigned Case')
  expect(within(idleCard).getByText('Unassigned')).toBeInTheDocument()
})

it('renders covert prep markers on triage list rows', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const assignedTeamId = Object.keys(game.teams)[0]!
  game.cases = {
    covert: {
      ...createStarterCase({ id: 'covert', templateId: 'ops-004' }),
      status: 'in_progress',
      title: 'Covert Infiltration Case',
      stage: 4,
      hiddenState: 'hidden',
      infiltrationProbeProgress: 0.35,
      infiltrationAwareness: 0.5,
      infiltrationStage: 'probing',
      tags: ['infiltration', 'media', 'public'],
      infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
      infiltrationCoverProfile: caseTemplateMap['ops-004'].infiltrationCoverProfile,
      stealthLeaveBehindId: 'leave-behind:risk-discovery',
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [assignedTeamId],
    },
    plain: makeCase('plain', 'Plain Open Case', { status: 'open' }),
  }

  useGameStore.setState({ game })

  renderCasesPage(['/cases'])
  await selectTriageCase(user, 'Covert Infiltration Case')

  const listChips = screen.getByTestId('case-triage-chips-covert')
  expect(within(listChips).getByText(/Probe 35%/)).toBeInTheDocument()
  expect(within(listChips).getByText(/awareness 50%/)).toBeInTheDocument()
  expect(within(listChips).getByText('Leave-behind staged')).toBeInTheDocument()

  const covertCard = getCardByName('Covert Infiltration Case')
  const markerRegion = within(covertCard).getByLabelText('Case triage markers')
  expect(within(markerRegion).getByText(/Probe 35%/)).toBeInTheDocument()
  expect(within(markerRegion).getByText(/awareness 50%/)).toBeInTheDocument()
  expect(within(markerRegion).getByText('Cover strain')).toBeInTheDocument()
  expect(within(markerRegion).getByText('Leave-behind staged')).toBeInTheDocument()
  expect(
    within(covertCard).getAllByText(/Deferring may let infiltration exposure escalate/i)
  ).toHaveLength(1)

  expect(markerRegion.querySelectorAll('span').length).toBe(5)

  const compareTable = within(covertCard).getByRole('table', {
    name: 'Deferral and covert prep comparison',
  })
  expect(within(compareTable).getByText('Covert prep load')).toBeInTheDocument()
  expect(within(compareTable).getByText('If deferred')).toBeInTheDocument()
  expect(within(compareTable).getByText('Carryover')).toBeInTheDocument()
  expect(within(covertCard).getByText(/Escalation carryover:/)).toBeInTheDocument()

  await selectTriageCase(user, 'Plain Open Case')
  const plainCard = getCardByName('Plain Open Case')
  expect(within(plainCard).queryByText('Leave-behind staged')).not.toBeInTheDocument()
  expect(within(plainCard).queryByText(/Probe \d+%/)).not.toBeInTheDocument()
})

it('renders concealment prep chip on triage list rows', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  game.cases = {
    conceal: {
      ...createStarterCase({ id: 'conceal', templateId: 'ops-003' }),
      status: 'in_progress',
      title: 'Covert Preview Case',
      tags: ['infiltration'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
    },
  }

  useGameStore.setState({ game })

  renderCasesPage(['/cases'])

  const listChips = screen.getByTestId('case-triage-chips-conceal')
  expect(within(listChips).getByText('Covert next week')).toBeInTheDocument()

  await selectTriageCase(user, 'Covert Preview Case')
  expect(within(getCardByName('Covert Preview Case')).getByText('Covert next week')).toBeInTheDocument()
})

it('renders recommended action guidance for assignable cases', async () => {
  const user = userEvent.setup()
  renderCasesPage(['/cases'])

  expect(
    screen.getByText(
      /core loop: triage cases here, open each dossier to prep, then advance week from front desk and review the new report\./i
    )
  ).toBeInTheDocument()

  await selectTriageCase(user, 'The Whispering Archive')

  const detail = getCardByName('The Whispering Archive')
  expect(within(detail).getByText(/recommended action/i)).toBeInTheDocument()
  expect(within(detail).getByText(/best current success:/i)).toBeInTheDocument()
  expect(within(detail).getByRole('link', { name: /open prep dossier/i })).toBeInTheDocument()
})

it('renders open intel dossier quick action and next-step copy for each case card', async () => {
  const user = userEvent.setup()
  renderCasesPage(['/cases'])

  await selectTriageCase(user, 'The Whispering Archive')

  const detail = getCardByName('The Whispering Archive')
  expect(within(detail).getByRole('link', { name: /open intel dossier/i })).toBeInTheDocument()
  expect(
    within(detail).getByText(/next step: assign response units, then advance week from front desk\./i)
  ).toBeInTheDocument()
})

it('supports top-option comparison and shows confidence/commit cues on assignment actions', async () => {
  const user = userEvent.setup()

  renderCasesPage(['/cases'])
  await selectTriageCase(user, 'The Whispering Archive')

  const detail = getCardByName('The Whispering Archive')
  const compareButton = within(detail).getByRole('button', { name: /compare top 2/i })
  expect(compareButton).toHaveAttribute('aria-expanded', 'false')
  const controlsId = compareButton.getAttribute('aria-controls')
  expect(controlsId).toBeTruthy()
  await user.click(compareButton)

  expect(compareButton).toHaveAttribute('aria-expanded', 'true')
  expect(document.getElementById(controlsId!)).not.toBeNull()
  expect(within(detail).getByText(/success delta:/i)).toBeInTheDocument()
  expect(within(detail).getByText(/fail delta:/i)).toBeInTheDocument()
  expect(within(detail).getAllByText(/confidence:/i).length).toBeGreaterThan(0)
  expect(within(detail).getAllByText(/commit clarity:/i).length).toBeGreaterThan(0)
})

it('renders a major incident planner and warns when one selected team is much weaker', async () => {
  const user = userEvent.setup()
  const game = createMajorIncidentPlannerState()

  useGameStore.setState({ game })
  renderCasesPage(['/cases'])
  await selectTriageCase(user, 'Regional Fracture Event')

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
  expect(screen.getAllByRole('link', { name: /high risk case/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /blocked case/i }).length).toBeGreaterThan(0)
  expect(screen.queryAllByRole('link', { name: /low risk case/i })).toHaveLength(0)
  expect(screen.queryByRole('link', { name: /resolved critical case/i })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^at-risk$/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })

  expect(screen.getByRole('button', { name: /at-risk only/i })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /low risk case/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /resolved critical case/i }).length).toBeGreaterThan(0)
})

it('re-clicking the active triage tab does not clear the case query', async () => {
  const user = userEvent.setup()

  renderCasesPage(['/cases?case=case-001&tab=all'])

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('case=case-001')
  })

  await user.click(screen.getByRole('tab', { name: /^all\b/i }))

  expect(screen.getByTestId('location-search')).toHaveTextContent('case=case-001')
})

it('preserves case query when the selected case remains visible after a tab change', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const teamId = Object.keys(game.teams)[0]!
  const caseId = 'case-001'
  game.cases = {
    ...game.cases,
    [caseId]: {
      ...game.cases[caseId]!,
      status: 'in_progress',
      assignedTeamIds: [teamId],
    },
  }

  useGameStore.setState({ game })
  renderCasesPage([`/cases?case=${caseId}&tab=all`])

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent(`case=${caseId}`)
  })

  await user.click(screen.getByRole('tab', { name: /assigned/i }))

  await waitFor(() => {
    const search = screen.getByTestId('location-search').textContent ?? ''
    expect(search).toContain('tab=assigned')
    expect(search).toContain(`case=${caseId}`)
  })
})

it('filters triage list by tab and syncs tab to query state', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const teamId = Object.keys(game.teams)[0]!
  game.cases = {
    assigned: makeCase('assigned', 'Assigned Case', {
      status: 'in_progress',
      assignedTeamIds: [teamId],
    }),
    open: makeCase('open', 'Open Case', { status: 'open' }),
  }

  useGameStore.setState({ game })
  renderCasesPage(['/cases'])

  await user.click(screen.getByRole('tab', { name: /assigned/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=assigned')
  })

  expect(screen.getAllByRole('link', { name: /assigned case/i }).length).toBeGreaterThan(0)
  expect(screen.queryAllByRole('link', { name: /^open case$/i })).toHaveLength(0)
  expect(screen.getByLabelText(/mission triage context/i)).toBeInTheDocument()
})

it('shows triage context footer when filters match no cases', () => {
  renderCasesPage(['/cases?q=definitely-no-match'])

  expect(screen.getByRole('region', { name: /case triage queue/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /no matching cases/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/mission triage context/i)).toBeInTheDocument()
  expect(screen.getByText(/teams available:/i)).toBeInTheDocument()
})

it('sets defer disposition from triage detail panel', async () => {
  const user = userEvent.setup()
  const game = {
    ...createStartingState(),
    missionRouting: normalizeMissionRoutingState(createStartingState()),
    cases: {
      ...createStartingState().cases,
      'case-triage-defer': makeCase('case-triage-defer', 'Defer Me Case', { status: 'open' }),
    },
  }

  useGameStore.setState({ game })
  renderCasesPage(['/cases?case=case-triage-defer'])

  await selectTriageCase(user, 'Defer Me Case')

  await user.click(
    screen.getByRole('button', { name: MISSION_TRIAGE_DISPOSITION_LABELS.defer, exact: true })
  )

  expect(
    useGameStore.getState().game.missionRouting?.missions['case-triage-defer']?.routingState
  ).toBe('deferred')

  const listChips = screen.getByTestId('case-triage-chips-case-triage-defer')
  expect(within(listChips).getByText(MISSION_TRIAGE_DISPOSITION_LABELS.activeDefer)).toBeInTheDocument()

  const detail = getCardByName('Defer Me Case')
  expect(within(detail).getByLabelText('Triage disposition')).toBeInTheDocument()
  expect(
    within(detail).getByRole('button', { name: MISSION_TRIAGE_DISPOSITION_LABELS.defer, exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  expect(
    within(detail).getByRole('button', { name: MISSION_TRIAGE_DISPOSITION_LABELS.clear })
  ).toBeInTheDocument()
})

it('sanitizes stale case query when the case is outside the filtered triage list', async () => {
  renderCasesPage(['/cases?case=case-does-not-exist&status=open'])

  await waitFor(() => {
    const search = screen.getByTestId('location-search').textContent ?? ''
    expect(search).not.toContain('case=case-does-not-exist')
  })
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
  return screen.getByRole('region', {
    name: new RegExp(`Case triage detail:.*${name}`, 'i'),
  })
}

async function selectTriageCase(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`Select ${name} for triage detail`, 'i') }))
  await screen.findByRole('region', {
    name: new RegExp(`Case triage detail:.*${name}`, 'i'),
  })
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
