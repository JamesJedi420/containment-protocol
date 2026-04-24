// cspell:words exfiltration greentape kellan sato unassigns
import '../test/setup'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'
import { calcWeekScore } from '../domain/sim/scoring'
import { createNote, TEST_CONTRACTS } from '../data/copy'
import App from './App'
import { useGameStore } from './store/gameStore'
import { advanceFakeTimers, flushMicrotasks, mockClipboardWriteText } from '../test/timers'

const activeCaseCap = createStartingState().config.maxActiveCases
const originalClipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')
const RAID_CASE_TITLE = /containment raid: sector 7 reagent surge/i
const VAMPIRE_NEST_CASE_TITLE = /vampire nest in the stockyards/i
const TECH_GATE_CASE_TITLE = /classified data exfiltration\.?\s[:—-]\s*node gamma/i
const CASES_PAGE_HEADING = /^cases$/i
const NIGHTWATCH_NAME = /night watch/i
const GREENTAPE_NAME = /green tape/i

// Case and team assignment status patterns — sourced from test contracts to prevent brittleness
const ASSIGNED_NIGHTWATCH = new RegExp(`${TEST_CONTRACTS.caseAssignmentLabel}:\\s*night watch`, 'i')
const ASSIGNED_GREENTAPE = new RegExp(`${TEST_CONTRACTS.caseAssignmentLabel}:\\s*green tape`, 'i')
const ASSIGNED_NIGHTWATCH_AND_GREENTAPE = new RegExp(
  `${TEST_CONTRACTS.caseAssignmentLabel}:\\s*night watch,\\s*green tape`,
  'i'
)
const ASSIGNED_TO = new RegExp(`${TEST_CONTRACTS.caseAssignmentTo}:`, 'i')
const UNASSIGNED = new RegExp(TEST_CONTRACTS.caseUnassignedMarker, 'i')
const STATUS_OPEN = new RegExp(TEST_CONTRACTS.caseStatus('open'), 'i')
const STATUS_ACTIVE = new RegExp(TEST_CONTRACTS.caseStatus('in_progress'), 'i')

function getNightWatchCard() {
  return getTeamCard(NIGHTWATCH_NAME)
}

function getGreenTapeCard() {
  return getTeamCard(GREENTAPE_NAME)
}

function getAdvanceWeekButton() {
  return within(screen.getByRole('region', { name: /simulation controls/i })).getByRole('button', {
    name: /advance week/i,
  })
}

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  )
}

function createGameWithReports() {
  const seeded = assignTeam(createStartingState(), 'case-003', 't_nightwatch')

  seeded.cases['case-003'] = {
    ...seeded.cases['case-003'],
    weeksRemaining: 1,
    onFail: {
      ...seeded.cases['case-003'].onFail,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['chem-001'],
    },
  }

  const afterOne = advanceWeek(seeded)
  const firstReport = {
    ...afterOne.reports[0]!,
    notes: afterOne.reports[0]?.notes?.length
      ? afterOne.reports[0]!.notes
      : [createNote('Synthetic first report.')],
  }
  const secondReport = {
    ...firstReport,
    week: firstReport.week + 1,
    rngStateBefore: firstReport.rngStateAfter,
    rngStateAfter: firstReport.rngStateAfter + 1,
    newCases: [],
    progressedCases: [],
    resolvedCases: ['case-001'],
    failedCases: [],
    unresolvedTriggers: [],
    spawnedCases: [],
    notes: [createNote('Synthetic follow-up report.')],
  }

  return {
    ...afterOne,
    week: afterOne.week + 1,
    rngState: secondReport.rngStateAfter,
    reports: [firstReport, secondReport],
  }
}

function createGameWithTechGateCase() {
  const game = createStartingState()

  game.cases['case-tech'] = {
    ...game.cases['case-001'],
    id: 'case-tech',
    templateId: 'info-001',
    title: 'Classified Data Exfiltration — Node Gamma',
    requiredTags: ['tech'],
    preferredTags: ['hacker', 'analyst'],
    deadlineRemaining: 3,
    assignedTeamIds: [],
    weeksRemaining: undefined,
  }

  return game
}

function createReportCoverageGame() {
  const game = createStartingState()

  game.reports = [
    {
      week: 4,
      rngStateBefore: 4040,
      rngStateAfter: 4041,
      newCases: ['case-a'],
      progressedCases: ['case-002'],
      resolvedCases: ['case-001'],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: ['case-003'],
      spawnedCases: ['case-a'],
      maxStage: 3,
      avgFatigue: 9,
      teamStatus: [],
      notes: [],
    },
  ]

  return game
}

function createTeamsCoverageGame() {
  const game = createStartingState()

  game.teams['team-empty'] = {
    id: 'team-empty',
    name: 'Empty Unit',
    agentIds: [],
    tags: ['support'],
  }

  return game
}

function createGameWithRaidCase() {
  const game = createStartingState()

  game.cases['case-001'] = {
    ...game.cases['case-001'],
    title: 'Containment Raid: Sector 7 Reagent Surge',
    kind: 'raid',
    raid: { minTeams: 2, maxTeams: 2 },
  }

  return game
}

function createGameWithRaidCaseAndExtraTeam() {
  return addCharlieUnit(createGameWithRaidCase())
}

function addCharlieUnit(game: ReturnType<typeof createGameWithRaidCase>) {
  const nextGame = { ...game }

  nextGame.agents['agent-007'] = {
    id: 'agent-007',
    name: 'Spec. Mercer',
    role: 'hunter',
    baseStats: { combat: 55, investigation: 35, utility: 40, social: 20 },
    tags: ['combat'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }

  nextGame.teams['team-charlie'] = {
    id: 'team-charlie',
    name: 'Charlie Unit',
    agentIds: ['agent-007'],
    tags: ['van'],
  }

  return nextGame
}

function createCasesCoverageGame() {
  const game = createStartingState()

  game.cases['case-001'] = {
    ...game.cases['case-001'],
    stage: 2,
    assignedTeamIds: ['t_greentape'],
    status: 'open',
  }

  game.cases['case-002'] = {
    ...game.cases['case-002'],
    stage: 3,
    status: 'in_progress',
    assignedTeamIds: ['t_nightwatch'],
    weeksRemaining: 1,
  }

  game.cases['case-003'] = {
    ...game.cases['case-003'],
    stage: 4,
    status: 'resolved',
    assignedTeamIds: [],
    weeksRemaining: undefined,
  }

  game.cases['case-004'] = {
    ...game.cases['case-001'],
    id: 'case-004',
    templateId: 'chem-001',
    title: 'Containment Breach: Overflow Checkpoint',
    description: 'Synthetic coverage case with no free units to validate the odds fallback.',
    stage: 1,
    status: 'open',
    assignedTeamIds: [],
    deadlineRemaining: 2,
    weeksRemaining: undefined,
    requiredTags: [],
    preferredTags: [],
  }

  game.teams['t_nightwatch'] = {
    ...game.teams['t_nightwatch'],
    assignedCaseId: 'case-002',
  }

  game.teams['t_greentape'] = {
    ...game.teams['t_greentape'],
    assignedCaseId: 'case-001',
  }

  return game
}

function getRaidCaseListItem() {
  return getCaseListItem(RAID_CASE_TITLE)
}

function getCaseListItem(caseTitle: RegExp | string) {
  const caseItem = screen.getByText(caseTitle).closest('li')

  expect(caseItem).not.toBeNull()
  return caseItem!
}

function getTeamCard(teamName: RegExp | string) {
  const teamLink = screen.getByRole('link', { name: toTeamLinkName(teamName) })
  const teamCard = teamLink.closest('li')

  expect(teamCard).not.toBeNull()
  return teamCard!
}

function toTeamLinkName(teamName: RegExp | string) {
  if (teamName instanceof RegExp) {
    return new RegExp(`response unit\\s+${teamName.source}`, teamName.flags)
  }

  return new RegExp(`response unit\\s+${escapeRegExp(teamName)}`, 'i')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expectTeamAssignedCase(teamCard: HTMLElement, caseTitle: RegExp | string) {
  expect(within(teamCard).getByText(ASSIGNED_TO)).toBeInTheDocument()
  expect(within(teamCard).getByRole('link', { name: caseTitle })).toBeInTheDocument()
}

function expectTeamUnassigned(teamCard: HTMLElement) {
  expect(within(teamCard).getAllByText(UNASSIGNED).length).toBeGreaterThan(0)
}

function getAlphaUnitCard() {
  return getTeamCard(NIGHTWATCH_NAME)
}

function getBravoUnitCard() {
  return getTeamCard(GREENTAPE_NAME)
}

function getReportCard(week: number) {
  const reportCard = screen.getByText(`Week ${week}`).closest('li')

  expect(reportCard).not.toBeNull()
  return reportCard!
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

afterEach(() => {
  vi.restoreAllMocks()

  if (originalClipboard) {
    Object.defineProperty(window.navigator, 'clipboard', originalClipboard)
    return
  }

  Reflect.deleteProperty(window.navigator, 'clipboard')
})

describe('game app routes', () => {
  it('renders the empty report route before any weeks advance', () => {
    renderApp('/report')

    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument()
    expect(
      screen.getByText(/no reports yet\. advance a week to begin the run\./i)
    ).toBeInTheDocument()
  })

  it('renders report cards without a notes block when a report has no notes', () => {
    useGameStore.setState({ game: createReportCoverageGame() })
    renderApp('/report')

    expect(screen.getByText(/cumulative score: 50/i)).toBeInTheDocument()
    expect(screen.getByText(/^Week 4$/i)).toBeInTheDocument()
    expect(screen.queryByText(/field notes/i)).not.toBeInTheDocument()
  })

  it('moves directly between the live pages without routing back through the dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/cases')

    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^teams$/i }))
    expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^reports$/i }))
    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^cases$/i }))
    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()
  })

  it('supports direct entry to a case detail route and its back link', async () => {
    const user = userEvent.setup()
    renderApp('/cases/case-001')

    expect(
      screen.getByRole('heading', { level: 1, name: /vampire nest in the stockyards/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to cases/i })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: /back to cases/i })[0]!)

    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()
  })

  it('supports direct entry to a team detail route and its back link', async () => {
    const user = userEvent.setup()
    renderApp('/teams/t_nightwatch')

    expect(
      screen.getByRole('heading', { level: 1, name: /response unit night watch/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to teams/i })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: /back to teams/i })[0]!)

    expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()
  })

  it('supports direct entry to a report detail route and its back link', async () => {
    const user = userEvent.setup()
    const game = createGameWithReports()
    const latestReport = game.reports.at(-1)

    expect(latestReport).toBeDefined()

    useGameStore.setState({ game })
    renderApp(`/report/${latestReport!.week}`)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: new RegExp(`^week ${latestReport!.week}$`, 'i'),
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to reports/i })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: /back to reports/i })[0]!)

    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument()
  })

  it('renders a local not-found state for an unknown case id', async () => {
    const user = userEvent.setup()
    renderApp('/cases/not-a-real-case')

    expect(screen.getByRole('heading', { level: 1, name: /case not found/i })).toBeInTheDocument()
    expect(
      screen.getAllByText(/requested operation is not present in the current state/i).length
    ).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('link', { name: /back to cases/i })[0]!)

    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()
  })

  it('renders a local not-found state for an unknown team id', async () => {
    const user = userEvent.setup()
    renderApp('/teams/not-a-real-team')

    expect(screen.getByRole('heading', { level: 1, name: /team not found/i })).toBeInTheDocument()
    expect(
      screen.getAllByText(/requested response unit is not present in the current state/i).length
    ).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('link', { name: /back to teams/i })[0]!)

    expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()
  })

  it('renders a local not-found state for an unknown report week', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: createGameWithReports() })
    renderApp('/report/999')

    expect(screen.getByRole('heading', { level: 1, name: /report not found/i })).toBeInTheDocument()
    expect(
      screen.getAllByText(/requested weekly report is not present in the current state/i).length
    ).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('link', { name: /back to reports/i })[0]!)

    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument()
  })

  it('navigates from list pages into detail routes and keeps primary nav working there', async () => {
    const user = userEvent.setup()
    const game = createGameWithReports()
    const latestReport = game.reports.at(-1)

    expect(latestReport).toBeDefined()

    useGameStore.setState({ game })
    renderApp('/cases')

    await user.click(screen.getByRole('link', { name: VAMPIRE_NEST_CASE_TITLE }))
    expect(
      screen.getByRole('heading', { level: 1, name: /vampire nest in the stockyards/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^teams$/i }))
    expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: NIGHTWATCH_NAME }))
    expect(
      screen.getByRole('heading', { level: 1, name: /response unit night watch/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^reports$/i }))
    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument()

    await user.click(
      screen.getByRole('link', { name: new RegExp(`^week ${latestReport!.week}$`, 'i') })
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: new RegExp(`^week ${latestReport!.week}$`, 'i'),
      })
    ).toBeInTheDocument()
  })

  it('renders the dashboard and navigates to cases', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByRole('heading', { name: /containment protocol/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^operations desk$/i })).toBeInTheDocument()
    expect(screen.getByText(/^pending operations$/i)).toBeInTheDocument()
    expect(screen.getByText(/^active deployments$/i)).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`week 1 / active cap ${activeCaseCap}`, 'i'))
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^cases$/i }))

    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()
    expect(screen.getByText(VAMPIRE_NEST_CASE_TITLE)).toBeInTheDocument()
  })

  it('assigns a team from cases and reflects it on teams', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: /^cases$/i }))
    const vampireNestCase = getCaseListItem(VAMPIRE_NEST_CASE_TITLE)

    await user.click(within(vampireNestCase!).getByRole('button', { name: /assign night watch/i }))

    expect(screen.getByText(ASSIGNED_NIGHTWATCH)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^teams$/i }))

    const nightWatchCard = getNightWatchCard()
    expectTeamAssignedCase(nightWatchCard, VAMPIRE_NEST_CASE_TITLE)
  })

  it('reassigns a standard case and keeps both teams pages aligned', async () => {
    const user = userEvent.setup()
    renderApp('/cases')

    const vampireNestCase = getCaseListItem(VAMPIRE_NEST_CASE_TITLE)

    await user.click(within(vampireNestCase!).getByRole('button', { name: /assign night watch/i }))
    await user.click(within(vampireNestCase!).getByRole('button', { name: /assign green tape/i }))

    expect(within(vampireNestCase!).getByText(ASSIGNED_GREENTAPE)).toBeInTheDocument()
    expect(within(vampireNestCase!).queryByText(ASSIGNED_NIGHTWATCH)).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^teams$/i }))

    const nightWatchCard = getNightWatchCard()
    const greenTapeCard = getGreenTapeCard()
    expectTeamUnassigned(nightWatchCard)
    expectTeamAssignedCase(greenTapeCard, VAMPIRE_NEST_CASE_TITLE)
  })

  it('unassigns a team and returns the case to the open pool', async () => {
    const user = userEvent.setup()
    renderApp('/cases')

    const vampireNestCase = getCaseListItem(VAMPIRE_NEST_CASE_TITLE)

    await user.click(within(vampireNestCase!).getByRole('button', { name: /assign night watch/i }))
    await user.click(within(vampireNestCase!).getByRole('button', { name: /remove night watch/i }))

    expect(within(vampireNestCase!).queryByText(/assigned:/i)).not.toBeInTheDocument()
    expect(vampireNestCase!).toHaveTextContent(STATUS_OPEN)

    await user.click(screen.getByRole('link', { name: /^teams$/i }))

    const nightWatchCard = getNightWatchCard()
    expectTeamUnassigned(nightWatchCard)
  })

  it('assigns and removes multiple teams on a raid while keeping teams aligned', async () => {
    const user = userEvent.setup()

    useGameStore.setState({ game: createGameWithRaidCase() })
    renderApp('/cases')

    const raidCase = getRaidCaseListItem()
    expect(within(raidCase!).getByText(/assign up to 2 teams/i)).toBeInTheDocument()

    await user.click(within(raidCase!).getByRole('button', { name: /assign night watch/i }))
    await user.click(within(raidCase!).getByRole('button', { name: /assign green tape/i }))

    expect(within(raidCase!).getByText(ASSIGNED_NIGHTWATCH_AND_GREENTAPE)).toBeInTheDocument()
    expect(raidCase!).toHaveTextContent(STATUS_ACTIVE)

    await user.click(screen.getByRole('link', { name: /^teams$/i }))

    const alphaCard = getAlphaUnitCard()
    const bravoCard = getBravoUnitCard()
    expectTeamAssignedCase(alphaCard, /containment raid: sector 7 reagent surge/i)
    expectTeamAssignedCase(bravoCard, /containment raid: sector 7 reagent surge/i)

    await user.click(screen.getByRole('link', { name: /^cases$/i }))

    const raidCaseAfterReturn = getRaidCaseListItem()
    await user.click(
      within(raidCaseAfterReturn!).getByRole('button', { name: /remove night watch/i })
    )

    const updatedRaidCase = getRaidCaseListItem()
    expect(within(updatedRaidCase!).getByText(ASSIGNED_GREENTAPE)).toBeInTheDocument()
    expect(
      within(updatedRaidCase!).queryByText(ASSIGNED_NIGHTWATCH_AND_GREENTAPE)
    ).not.toBeInTheDocument()
    expect(updatedRaidCase!).toHaveTextContent(STATUS_ACTIVE)

    await user.click(screen.getByRole('link', { name: /^teams$/i }))

    expectTeamUnassigned(getAlphaUnitCard())
    expectTeamAssignedCase(getBravoUnitCard(), /containment raid: sector 7 reagent surge/i)
  })

  it('blocks teams missing required tags and still allows a valid team assignment', async () => {
    const user = userEvent.setup()

    useGameStore.setState({ game: createGameWithTechGateCase() })
    renderApp('/cases')

    const techGateCase = getCaseListItem(TECH_GATE_CASE_TITLE)
    expect(within(techGateCase!).getByText(/required tags: tech/i)).toBeInTheDocument()

    const nightWatchButton = within(techGateCase!).getByRole('button', {
      name: /assign night watch/i,
    })
    const greenTapeButton = within(techGateCase!).queryByRole('button', {
      name: /assign green tape/i,
    })

    expect(nightWatchButton).toBeEnabled()
    expect(greenTapeButton).not.toBeInTheDocument()

    await user.click(nightWatchButton)

    expect(within(techGateCase!).getByText(ASSIGNED_NIGHTWATCH)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^teams$/i }))

    const nightWatchCard = getNightWatchCard()
    const greenTapeCard = getGreenTapeCard()
    expectTeamAssignedCase(nightWatchCard, TECH_GATE_CASE_TITLE)
    expectTeamUnassigned(greenTapeCard)
  })

  it('hides extra raid assignment options once the raid reaches capacity', async () => {
    const user = userEvent.setup()

    useGameStore.setState({ game: createGameWithRaidCaseAndExtraTeam() })
    renderApp('/cases')

    const raidCase = getRaidCaseListItem()
    expect(
      within(raidCase!).getByRole('button', { name: /assign charlie unit/i })
    ).toBeInTheDocument()

    await user.click(within(raidCase!).getByRole('button', { name: /assign night watch/i }))
    await user.click(within(raidCase!).getByRole('button', { name: /assign green tape/i }))

    const fullRaidCase = getRaidCaseListItem()
    expect(
      within(fullRaidCase!).queryByRole('button', { name: /assign charlie unit/i })
    ).not.toBeInTheDocument()

    await user.click(within(fullRaidCase!).getByRole('button', { name: /remove night watch/i }))

    const reopenedRaidCase = getRaidCaseListItem()
    expect(
      within(reopenedRaidCase!).getByRole('button', { name: /assign charlie unit/i })
    ).toBeInTheDocument()
  })

  it('renders stage, status, and odds edge cases for the cases route', () => {
    useGameStore.setState({ game: createCasesCoverageGame() })
    renderApp('/cases')

    const stageTwoCase = getCaseListItem(/vampire nest in the stockyards/i)
    const stageThreeCase = getCaseListItem(/whispering archive/i)
    const stageFourCase = getCaseListItem(/eclipse ritual/i)
    const oddsFallbackCase = getCaseListItem(/overflow checkpoint/i)

    expect(within(stageTwoCase!).getByText(/^stage 2$/i)).toHaveClass(
      'bg-yellow-900/50',
      'text-yellow-300'
    )
    expect(within(stageThreeCase!).getByText(/^stage 3$/i)).toHaveClass(
      'bg-orange-900/50',
      'text-orange-300'
    )
    expect(within(stageFourCase!).getByText(/^stage 4$/i)).toHaveClass(
      'bg-red-900/50',
      'text-red-300'
    )

    expect(within(stageThreeCase!).getByText(/remaining: 1 week/i)).toBeInTheDocument()
    expect(within(stageThreeCase!).getByText(/assigned: night watch/i)).toBeInTheDocument()
    expect(
      within(stageFourCase!).queryByRole('button', { name: /assign/i })
    ).not.toBeInTheDocument()

    expect(within(oddsFallbackCase!).getByText(/success: 0%/i)).toBeInTheDocument()
    expect(within(oddsFallbackCase!).queryByRole('button', { name: /assign/i })).toBeNull()
    expect(within(oddsFallbackCase!).queryByText(/required tags:/i)).not.toBeInTheDocument()
    expect(within(oddsFallbackCase!).queryByText(/preferred tags:/i)).not.toBeInTheDocument()
  })

  it('renders zero-fatigue dashboard stats when the roster is empty', () => {
    const game = createStartingState()
    game.agents = {}
    useGameStore.setState({ game })
    renderApp()

    const avgFatigueCard = screen.getByRole('link', { name: /team fatigue\s*\/\s*avg fatigue/i })
    const valueNode = within(avgFatigueCard).getByTestId(
      'dashboard-stat-value-team-fatigue-/-avg-fatigue'
    )
    expect(valueNode).toHaveTextContent('0')
  })

  it('renders an empty team card with zero fatigue and no assigned case', () => {
    useGameStore.setState({ game: createTeamsCoverageGame() })
    renderApp('/teams')

    const emptyTeamCard = getTeamCard(/empty unit/i)

    expectTeamUnassigned(emptyTeamCard)
    expect(within(emptyTeamCard!).getByText(/avg fatigue 0/i)).toBeInTheDocument()
  })

  it('updates balance presets and seed from simulation controls', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /^nightmare$/i }))

    expect(screen.getByText(/week 1 \/ active cap 5/i)).toBeInTheDocument()
    expect(useGameStore.getState().game.config.challengeModeEnabled).toBe(true)
    expect(useGameStore.getState().game.config.durationModel).toBe('attrition')

    const controls = screen
      .getByRole('heading', { name: /simulation controls/i })
      .closest('section')

    expect(controls).not.toBeNull()

    const seedInput = within(controls!).getByRole('spinbutton', { name: /^seed$/i })

    fireEvent.change(seedInput, { target: { value: '2024' } })

    expect(seedInput).toHaveValue(2024)
    expect(useGameStore.getState().game.rngSeed).toBe(2024)
    expect(useGameStore.getState().game.rngState).toBe(2024)
  })

  it('keeps attrition locked until nightmare challenge mode is applied', async () => {
    const user = userEvent.setup()
    renderApp()

    const controls = screen
      .getByRole('heading', { name: /simulation controls/i })
      .closest('section')

    expect(controls).not.toBeNull()

    const durationModelSelect = within(controls!).getByRole('combobox', {
      name: /^duration model$/i,
    })

    expect(durationModelSelect).toBeDisabled()
    expect(
      screen.getByText(/apply nightmare to unlock attrition pressure for challenge runs\./i)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^nightmare$/i }))

    expect(durationModelSelect).toBeEnabled()
    expect(
      screen.getByText(
        /challenge mode is active\. attrition pressure makes long operations harder each week\./i
      )
    ).toBeInTheDocument()
    expect(useGameStore.getState().game.config.durationModel).toBe('attrition')
  })

  it('updates dashboard config controls and rounds persisted numeric values', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /^nightmare$/i }))

    const controls = screen
      .getByRole('heading', { name: /simulation controls/i })
      .closest('section')

    expect(controls).not.toBeNull()

    fireEvent.change(within(controls!).getByRole('spinbutton', { name: /^stage scalar$/i }), {
      target: { value: '1.234' },
    })
    fireEvent.change(within(controls!).getByRole('spinbutton', { name: /^partial margin$/i }), {
      target: { value: '19' },
    })
    fireEvent.change(within(controls!).getByRole('spinbutton', { name: /^active cap$/i }), {
      target: { value: '11' },
    })
    fireEvent.change(within(controls!).getByRole('spinbutton', { name: /^attrition \/ week$/i }), {
      target: { value: '6' },
    })
    fireEvent.change(within(controls!).getByRole('spinbutton', { name: /^probability k$/i }), {
      target: { value: '2.66' },
    })
    fireEvent.change(within(controls!).getByRole('spinbutton', { name: /^raid team penalty$/i }), {
      target: { value: '0.575' },
    })
    await user.selectOptions(
      within(controls!).getByRole('combobox', { name: /^duration model$/i }),
      'attrition'
    )

    expect(screen.getByText(/week 1 \/ active cap 11/i)).toBeInTheDocument()
    expect(useGameStore.getState().game.config).toMatchObject({
      stageScalar: 1.23,
      partialMargin: 19,
      maxActiveCases: 11,
      challengeModeEnabled: true,
      attritionPerWeek: 6,
      probabilityK: 2.66,
      raidCoordinationPenaltyPerExtraTeam: 0.57,
      durationModel: 'attrition',
    })
  })

  it('returns to capacity mode when a non-challenge preset is applied after nightmare', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /^nightmare$/i }))
    await user.click(screen.getByRole('button', { name: /^standard$/i }))

    const controls = screen
      .getByRole('heading', { name: /simulation controls/i })
      .closest('section')

    expect(controls).not.toBeNull()

    expect(within(controls!).getByRole('combobox', { name: /^duration model$/i })).toBeDisabled()
    expect(useGameStore.getState().game.config).toMatchObject({
      challengeModeEnabled: false,
      durationModel: 'capacity',
      maxActiveCases: 7,
    })
  })

  it('pluralizes the latest report summary when multiple entries are present', () => {
    const game = createStartingState()

    game.reports = [
      {
        week: 2,
        rngStateBefore: 2024,
        rngStateAfter: 2025,
        newCases: ['case-a', 'case-b'],
        progressedCases: ['case-001'],
        resolvedCases: ['case-001', 'case-002'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: ['case-003', 'case-004'],
        spawnedCases: ['case-005', 'case-006'],
        maxStage: 4,
        avgFatigue: 12,
        teamStatus: [],
        notes: [createNote('Synthetic plural summary.')],
      },
    ]

    useGameStore.setState({ game })
    renderApp()

    expect(screen.getByText(/2 resolved, 2 unresolved triggers, 2 spawned cases/i)).toBeInTheDocument()
    expect(
      screen.getByText(/avg fatigue 12 \/ max stage 4 \/ rng before 2024 -> 2025/i)
    ).toBeInTheDocument()
  })

  it('omits the plus prefix when the latest report score is negative', () => {
    const game = createStartingState()

    game.reports = [
      {
        week: 3,
        rngStateBefore: 3030,
        rngStateAfter: 3031,
        newCases: ['case-x'],
        progressedCases: ['case-y'],
        resolvedCases: [],
        failedCases: ['case-y'],
        partialCases: ['case-z'],
        unresolvedTriggers: ['case-x'],
        spawnedCases: ['case-x'],
        maxStage: 5,
        avgFatigue: 18,
        teamStatus: [],
        notes: [createNote('Synthetic negative summary.')],
      },
    ]

    useGameStore.setState({ game })
    renderApp()

    const latestScore = calcWeekScore(game.reports[0]!)
    const latestReportSection = screen
      .getByRole('heading', { name: /^latest report$/i })
      .closest('section')

    expect(latestReportSection).not.toBeNull()
    expect(within(latestReportSection!).getByRole('link', { name: /week 3/i })).toBeInTheDocument()
    expect(
      within(latestReportSection!).getByText(new RegExp(`${latestScore} pts`, 'i'))
    ).toBeInTheDocument()
    expect(
      within(latestReportSection!).getByText(/1 unresolved trigger, 1 spawned/i)
    ).toBeInTheDocument()
  })

  it('generates a fresh seed from the dashboard controls', async () => {
    const user = userEvent.setup()
    vi.spyOn(Date, 'now').mockReturnValue(20260324)
    renderApp()

    await user.click(screen.getByRole('button', { name: /^new seed$/i }))

    const controls = screen
      .getByRole('heading', { name: /simulation controls/i })
      .closest('section')

    expect(controls).not.toBeNull()
    expect(within(controls!).getByRole('spinbutton', { name: /^seed$/i })).toHaveValue(20260324)
    expect(useGameStore.getState().game.rngSeed).toBe(20260324)
    expect(useGameStore.getState().game.rngState).toBe(20260324)
  })

  it('copies the current seed and clears the success message after its timeout', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)

    mockClipboardWriteText(writeText)

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /^copy seed$/i }))
    await flushMicrotasks()

    expect(writeText).toHaveBeenCalledWith(String(useGameStore.getState().game.rngSeed))
    expect(screen.getByText(/seed copied\./i)).toBeInTheDocument()

    advanceFakeTimers(1200)

    expect(screen.getByText(/seed can be shared for reproducible runs\./i)).toBeInTheDocument()
  })

  it('shows clipboard failure feedback and clears it after its timeout', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard blocked'))

    mockClipboardWriteText(writeText)

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /^copy seed$/i }))
    await flushMicrotasks()

    expect(screen.getByText(/copy unavailable\./i)).toBeInTheDocument()

    advanceFakeTimers(1600)

    expect(screen.getByText(/seed can be shared for reproducible runs\./i)).toBeInTheDocument()
  })

  it('falls back to the unavailable clipboard message when clipboard support is missing', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /^copy seed$/i }))

    expect(screen.getByText(/copy unavailable\./i)).toBeInTheDocument()
    expect(useGameStore.getState().game.rngSeed).toBe(createStartingState().rngSeed)

    if (originalClipboard) {
      Object.defineProperty(window.navigator, 'clipboard', originalClipboard)
    }
  })

  it('advances a week and exposes the generated report', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(getAdvanceWeekButton())

    expect(
      screen.getByText(new RegExp(`week 2 / active cap ${activeCaseCap}`, 'i'))
    ).toBeInTheDocument()
    const latestReportSection = screen
      .getByRole('heading', { name: /^latest report$/i })
      .closest('section')

    expect(latestReportSection).not.toBeNull()
    expect(within(latestReportSection!).getByRole('link', { name: /^week 1/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^reports$/i }))

    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument()
    expect(screen.getByText(/cumulative score: -?\d+/i)).toBeInTheDocument()
    expect(screen.getByText(/^Resolved: 0$/i)).toBeInTheDocument()
  })

  it('renders detailed report cards and shows the newest report first', () => {
    const game = createGameWithReports()
    const [firstReport, secondReport] = game.reports

    useGameStore.setState({ game })
    renderApp('/report')

    const totalScore = game.reports.reduce((sum, report) => sum + calcWeekScore(report), 0)
    const weekHeadings = screen.getAllByText(/^Week \d+$/i)

    expect(screen.getByText(new RegExp(`cumulative score: ${totalScore}`, 'i'))).toBeInTheDocument()
    expect(weekHeadings[0]).toHaveTextContent(`Week ${secondReport!.week}`)
    expect(weekHeadings[1]).toHaveTextContent(`Week ${firstReport!.week}`)

    const firstReportCard = getReportCard(firstReport!.week)
    const secondReportCard = getReportCard(secondReport!.week)
    const firstWeekScore = calcWeekScore(firstReport!)
    const secondWeekScore = calcWeekScore(secondReport!)

    expect(
      within(firstReportCard!).getByText(`${firstWeekScore >= 0 ? '+' : ''}${firstWeekScore} pts`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`Resolved: ${firstReport!.resolvedCases.length}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`Unresolved: ${firstReport!.unresolvedTriggers.length}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`Spawned: ${firstReport!.spawnedCases.length}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`Failed: ${firstReport!.failedCases.length}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`Avg Fatigue: ${firstReport!.avgFatigue}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`Max Stage: ${firstReport!.maxStage}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`RNG Before: ${firstReport!.rngStateBefore}`)
    ).toBeInTheDocument()
    expect(
      within(firstReportCard!).getByText(`RNG After: ${firstReport!.rngStateAfter}`)
    ).toBeInTheDocument()
    expect(within(firstReportCard!).getByText(firstReport!.notes[0]!.content)).toBeInTheDocument()

    expect(
      within(secondReportCard!).getByText(
        `${secondWeekScore >= 0 ? '+' : ''}${secondWeekScore} pts`
      )
    ).toBeInTheDocument()
    expect(within(secondReportCard!).getByText('Synthetic follow-up report.')).toBeInTheDocument()
  })

  it('shows a halted simulation state and reset clears the lock', async () => {
    const user = userEvent.setup()
    const game = {
      ...createGameWithReports(),
      gameOver: true,
      gameOverReason: 'Active case cap exceeded.',
    }

    useGameStore.setState({ game })
    renderApp()

    expect(screen.getByText(/simulation halted: active case cap exceeded\./i)).toBeInTheDocument()
    expect(getAdvanceWeekButton()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^reset$/i }))
    await user.click(screen.getByRole('button', { name: /confirm reset/i }))

    expect(screen.queryByText(/simulation halted:/i)).not.toBeInTheDocument()
    expect(getAdvanceWeekButton()).toBeEnabled()
    expect(
      screen.getByText(new RegExp(`week 1 / active cap ${activeCaseCap}`, 'i'))
    ).toBeInTheDocument()
  })

  it('uses the default halted reason when no explicit gameOverReason is present', () => {
    useGameStore.setState({
      game: {
        ...createStartingState(),
        gameOver: true,
      },
    })
    renderApp()

    expect(
      screen.getByText(
        /simulation halted: breach threshold crossed\. containment protocol failed\./i
      )
    ).toBeInTheDocument()
    expect(getAdvanceWeekButton()).toBeDisabled()
  })

  it('resets the simulation back to the initial dashboard state', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(getAdvanceWeekButton())
    await user.click(screen.getByRole('button', { name: /^reset$/i }))
    await user.click(screen.getByRole('button', { name: /confirm reset/i }))

    expect(
      screen.getByText(new RegExp(`week 1 / active cap ${activeCaseCap}`, 'i'))
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no reports yet\. advance a week to begin the run\./i)
    ).toBeInTheDocument()
  })

  it('shows all three starter cases on the cases route', () => {
    renderApp('/cases')

    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()
    expect(screen.getByText(/vampire nest in the stockyards/i)).toBeInTheDocument()
    expect(screen.getByText(/the whispering archive/i)).toBeInTheDocument()
    expect(screen.getByText(/eclipse ritual at the riverfront/i)).toBeInTheDocument()
  })

  it('shows both starter teams and all eight agents on the teams route', () => {
    renderApp('/teams')
    const nightWatchCard = getNightWatchCard()
    const greenTapeCard = getGreenTapeCard()

    expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()
    expect(
      within(nightWatchCard).getByRole('link', { name: /response unit night watch/i })
    ).toBeInTheDocument()
    expect(
      within(greenTapeCard).getByRole('link', { name: /response unit green tape/i })
    ).toBeInTheDocument()
    expect(within(nightWatchCard).getAllByText(/ava brooks/i).length).toBeGreaterThan(0)
    expect(within(nightWatchCard).getAllByText(/father kellan/i).length).toBeGreaterThan(0)
    expect(within(nightWatchCard).getAllByText(/mina park/i).length).toBeGreaterThan(0)
    expect(within(nightWatchCard).getAllByText(/^rook$/i).length).toBeGreaterThan(0)
    expect(within(greenTapeCard).getAllByText(/dr\. sato/i).length).toBeGreaterThan(0)
    expect(within(greenTapeCard).getAllByText(/juno reyes/i).length).toBeGreaterThan(0)
    expect(within(greenTapeCard).getAllByText(/eli grant/i).length).toBeGreaterThan(0)
    expect(within(greenTapeCard).getAllByText(/casey holt/i).length).toBeGreaterThan(0)
  })

  it('supports direct entry to a case detail route', () => {
    renderApp('/cases/case-001')

    expect(
      screen.getAllByRole('heading', { name: VAMPIRE_NEST_CASE_TITLE }).length
    ).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /back to cases/i })).toBeInTheDocument()
    expect(screen.getByText(/available team odds/i)).toBeInTheDocument()
  })

  it('supports direct entry to a team detail route', () => {
    useGameStore.setState({
      game: assignTeam(createStartingState(), 'case-001', 't_nightwatch'),
    })
    renderApp('/teams/t_nightwatch')

    expect(
      screen.getAllByRole('heading', { name: /response unit night watch/i }).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: VAMPIRE_NEST_CASE_TITLE })[0]).toHaveAttribute(
      'href',
      '/cases/case-001'
    )
    expect(screen.getByRole('link', { name: /back to teams/i })).toBeInTheDocument()
  })

  it('supports direct entry to a report detail route', () => {
    const game = createGameWithReports()
    const latestReport = game.reports.at(-1)

    useGameStore.setState({ game })
    renderApp(`/report/${latestReport!.week}`)

    expect(
      screen.getByRole('heading', { name: new RegExp(`^week ${latestReport!.week}$`, 'i') })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to reports/i })).toBeInTheDocument()
    expect(screen.getByText(/field notes/i)).toBeInTheDocument()
  })

  it('navigates from the cases list into detail and back again', async () => {
    const user = userEvent.setup()
    renderApp('/cases')

    await user.click(screen.getByRole('link', { name: VAMPIRE_NEST_CASE_TITLE }))

    expect(
      screen.getAllByRole('heading', { name: VAMPIRE_NEST_CASE_TITLE }).length
    ).toBeGreaterThan(0)

    await user.click(screen.getByRole('link', { name: /back to cases/i }))

    expect(screen.getByRole('heading', { name: CASES_PAGE_HEADING })).toBeInTheDocument()
    expect(screen.getByText(VAMPIRE_NEST_CASE_TITLE)).toBeInTheDocument()
  })

  it('keeps primary shell navigation working from a detail route', async () => {
    const user = userEvent.setup()
    const game = createGameWithReports()
    const latestReport = game.reports.at(-1)

    useGameStore.setState({ game })
    renderApp('/cases/case-001')

    await user.click(screen.getByRole('link', { name: /^teams$/i }))
    expect(screen.getByRole('heading', { name: /^teams$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^reports$/i }))
    expect(
      screen.getByRole('link', {
        name: new RegExp(`^week ${latestReport!.week}$`, 'i'),
      })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('link', {
        name: new RegExp(`^week ${latestReport!.week}$`, 'i'),
      })
    )
    expect(
      screen.getByRole('heading', { name: new RegExp(`^week ${latestReport!.week}$`, 'i') })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^operations desk$/i }))
    expect(screen.getByRole('heading', { name: /containment protocol/i })).toBeInTheDocument()
  })

  it('renders local not-found states for invalid nested detail params', () => {
    renderApp('/cases/missing-case')
    expect(screen.getByRole('heading', { level: 1, name: /case not found/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /back to cases/i }).length).toBeGreaterThan(0)
  })

  it('assigns and unassigns from case detail while keeping team detail aligned', async () => {
    const user = userEvent.setup()
    renderApp('/cases/case-001')

    await user.click(screen.getByRole('button', { name: /assign night watch/i }))
    expect(screen.getByRole('button', { name: /remove night watch/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^teams$/i }))
    await user.click(screen.getByRole('link', { name: /response unit night watch/i }))

    expect(screen.getAllByRole('link', { name: VAMPIRE_NEST_CASE_TITLE })[0]).toHaveAttribute(
      'href',
      '/cases/case-001'
    )

    await user.click(screen.getByRole('link', { name: /^cases$/i }))
    await user.click(screen.getByRole('link', { name: VAMPIRE_NEST_CASE_TITLE }))
    await user.click(screen.getByRole('button', { name: /remove night watch/i }))

    expect(screen.getAllByText(/unassigned/i).length).toBeGreaterThan(0)
  })
})
