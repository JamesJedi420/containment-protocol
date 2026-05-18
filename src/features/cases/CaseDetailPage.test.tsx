// cspell:words greentape
import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { readPersistentFlag } from '../../domain/flagSystem'
import {
  applySuccessfulInvestigation,
  buildInvestigationAskedFlagId,
} from '../../domain/investigationEconomy'
import { copyInfiltrationProbePlan } from '../../domain/infiltrationProbe'
import { createStarterCase } from '../../domain/templates/startingCases'
import { caseTemplateMap } from '../../domain/templates/caseTemplates'
import CaseDetailPage from './CaseDetailPage'

function renderCaseDetail(route = '/cases/case-001') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/cases/:caseId" element={<CaseDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('renders a direct-entry case detail and supports assign/unassign actions', async () => {
  const user = userEvent.setup()

  renderCaseDetail()

  expect(screen.getAllByText(/vampire nest in the stockyards/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/intelligence stub:/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/required tags/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/preferred tags/i).length).toBeGreaterThan(0)
  expect(screen.getByRole('heading', { name: /encounter profile/i })).toBeInTheDocument()
  expect(screen.getAllByText(/baseline world activity/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/if the operation fails/i)).toBeInTheDocument()
  expect(screen.getByText(/if the case goes unresolved/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /mission result model/i })).toBeInTheDocument()
  expect(screen.getByText(/decisive success/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /assign night watch/i }))

  expect(screen.getByRole('button', { name: /remove night watch/i })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /remove night watch/i }))

  expect(screen.getAllByText(/unassigned/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/^open$/i)).toBeInTheDocument()
})

it('renders a local not-found state for an unknown case', () => {
  renderCaseDetail('/cases/missing-case')

  expect(screen.getByText(/case not found/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to cases/i })).toBeInTheDocument()
})

it('renders assignment timeline events for the selected case only', () => {
  const game = createStartingState()

  game.events = [
    {
      id: 'evt-assign-1',
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
      id: 'evt-resolved-1',
      schemaVersion: 1,
      type: 'case.resolved',
      sourceSystem: 'incident',
      timestamp: '2042-01-08T00:00:00.001Z',
      payload: {
        week: 2,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        mode: 'threshold',
        kind: 'case',
        stage: 2,
        teamIds: ['t_nightwatch'],
      },
    },
    {
      id: 'evt-other-case',
      schemaVersion: 1,
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      timestamp: '2042-01-08T00:00:00.002Z',
      payload: {
        week: 3,
        caseId: 'case-002',
        caseTitle: 'The Whispering Archive',
        caseKind: 'case',
        teamId: 't_greentape',
        teamName: 'Green Tape',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
    },
  ]

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-001')

  const timelinePanel = screen.getByRole('region', { name: /assignment timeline/i })

  expect(
    within(timelinePanel).getByRole('heading', { name: /assignment timeline/i })
  ).toBeInTheDocument()
  expect(within(timelinePanel).getByText(/night watch assigned/i)).toBeInTheDocument()
  expect(
    within(timelinePanel).getByText(/vampire nest in the stockyards resolved/i)
  ).toBeInTheDocument()
  expect(within(timelinePanel).queryByText(/the whispering archive/i)).not.toBeInTheDocument()
  expect(within(timelinePanel).getByRole('link', { name: /night watch/i })).toHaveAttribute(
    'href',
    '/teams/t_nightwatch'
  )
})

it('shows concealment prep and toggles covert posture flag', async () => {
  const user = userEvent.setup()
  const game = createStartingState()

  game.cases['case-conceal-ui'] = {
    ...createStarterCase({ id: 'case-conceal-ui', templateId: 'ops-003' }),
    title: 'Covert Access',
    status: 'in_progress',
    tags: ['infiltration', 'archive'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-conceal-ui')

  const panel = screen.getByRole('region', { name: /concealment case prep/i })

  expect(within(panel).getByRole('heading', { name: /concealment prep/i })).toBeInTheDocument()
  expect(within(panel).getByText(/next weekly tick will mark this case as hidden/i)).toBeInTheDocument()

  await user.click(within(panel).getByRole('button', { name: /request covert posture/i }))

  expect(
    useGameStore.getState().game.runtimeState?.globalFlags?.['conceal.case.case-conceal-ui'] ??
      useGameStore.getState().game.globalFlags?.['conceal.case.case-conceal-ui']
  ).toBeTruthy()

  await user.click(within(panel).getByRole('button', { name: /clear covert request/i }))

  const flag =
    useGameStore.getState().game.runtimeState?.globalFlags?.['conceal.case.case-conceal-ui'] ??
    useGameStore.getState().game.globalFlags?.['conceal.case.case-conceal-ui']
  expect(flag === false || flag === undefined).toBe(true)
})

it('shows infiltration prep and sets weekly probe action override', async () => {
  const user = userEvent.setup()
  const game = createStartingState()

  game.cases['case-stealth-ui'] = {
    ...createStarterCase({ id: 'case-stealth-ui', templateId: 'ops-004' }),
    title: 'Archive Access Siege',
    status: 'in_progress',
    hiddenState: 'hidden',
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'archive', 'records'],
    infiltrationProbeProgress: 0.2,
    infiltrationAwareness: 0.3,
    infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
    infiltrationCoverProfile: caseTemplateMap['ops-004'].infiltrationCoverProfile,
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-stealth-ui')

  const panel = screen.getByRole('region', { name: /infiltration case prep/i })

  expect(within(panel).getByRole('heading', { name: /infiltration prep/i })).toBeInTheDocument()
  expect(within(panel).getByText(/probe progress 20%/i)).toBeInTheDocument()
  expect(within(panel).getByText(/uniform guard/i)).toBeInTheDocument()

  const cleanupRow = within(panel).getByText(/clean up cover/i).closest('li')
  expect(cleanupRow).not.toBeNull()
  await user.click(within(cleanupRow as HTMLElement).getByRole('button', { name: /^select$/i }))

  expect(
    useGameStore.getState().game.cases['case-stealth-ui']?.infiltrationWeeklyProbeActionOverride
  ).toBe('cleanup')
  expect(within(panel).getByRole('button', { name: /use plan default/i })).toBeInTheDocument()
})

it('shows stealth leave-behind tradeoff selection for eligible in-progress hidden cases', async () => {
  const user = userEvent.setup()
  const game = createStartingState()

  game.cases['case-stealth-ui'] = {
    ...createStarterCase({ id: 'case-stealth-ui', templateId: 'ops-003' }),
    title: 'Archive Access Siege',
    status: 'in_progress',
    hiddenState: 'hidden',
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'archive', 'records'],
    requiredTags: [],
    preferredTags: [],
    stealthLeaveBehindId: 'leave-behind:leave-trace',
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-stealth-ui')

  const panel = screen.getByRole('region', { name: /stealth leave-behind tradeoff/i })

  expect(within(panel).getByRole('heading', { name: /stealth leave-behind/i })).toBeInTheDocument()
  expect(within(panel).getByLabelText(/forensic investigation budget/i)).toBeInTheDocument()
  expect(within(panel).getByText(/leave forensic trace/i)).toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: /selected/i })).toBeInTheDocument()

  const burnRow = within(panel).getByText(/burn field tool/i).closest('li')
  expect(burnRow).not.toBeNull()
  await user.click(within(burnRow as HTMLElement).getByRole('button', { name: /^select$/i }))

  expect(within(panel).getByText(/burn field tool/i)).toBeInTheDocument()
  expect(within(panel).getAllByRole('button', { name: /selected/i })).toHaveLength(1)
  expect(useGameStore.getState().game.cases['case-stealth-ui']?.stealthLeaveBehindId).toBe(
    'leave-behind:burn-tool'
  )
})

it('shows investigation question prep and asks a forensic question', async () => {
  const user = userEvent.setup()
  let game = createStartingState()

  game.cases['case-investigation-ui'] = {
    ...createStarterCase({ id: 'case-investigation-ui', templateId: 'ops-003' }),
    title: 'Investigation Prep Case',
    status: 'in_progress',
    weeksRemaining: 2,
    assignedTeamIds: [],
    requiredTags: [],
    preferredTags: [],
  }

  game = applySuccessfulInvestigation(game, {
    caseId: 'case-investigation-ui',
    forensicBudget: 1,
    tacticalBudget: 1,
  })

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-investigation-ui')

  const panel = screen.getByRole('region', { name: /investigation question prep/i })

  expect(within(panel).getByRole('heading', { name: /investigation questions/i })).toBeInTheDocument()
  expect(within(panel).getByText(/concrete signature is present/i)).toBeInTheDocument()

  const forensicSection = within(panel).getByRole('region', { name: /forensic inquiry/i })
  const signatureRow = within(forensicSection)
    .getByText(/concrete signature is present/i)
    .closest('li')
  expect(signatureRow).not.toBeNull()
  await user.click(within(signatureRow as HTMLElement).getByRole('button', { name: /^ask$/i }))

  expect(within(forensicSection).getByRole('button', { name: /asked/i })).toBeInTheDocument()
  expect(within(forensicSection).getByText(/primary residue signature is real/i)).toBeInTheDocument()
  expect(
    readPersistentFlag(
      useGameStore.getState().game,
      buildInvestigationAskedFlagId('case-investigation-ui', 'forensic.present-signature')
    )
  ).toBe(true)
})

it('shows investigation prep empty state when no budget is granted yet', () => {
  const game = createStartingState()

  game.cases['case-investigation-ui'] = {
    ...createStarterCase({ id: 'case-investigation-ui', templateId: 'ops-003' }),
    title: 'Investigation Prep Case',
    status: 'in_progress',
    weeksRemaining: 2,
    assignedTeamIds: [],
    requiredTags: [],
    preferredTags: [],
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-investigation-ui')

  const panel = screen.getByRole('region', { name: /investigation question prep/i })

  expect(within(panel).getByText(/no investigation budget on this case yet/i)).toBeInTheDocument()
  expect(within(panel).queryByRole('region', { name: /forensic inquiry/i })).not.toBeInTheDocument()
})

it('hides investigation question prep when the case is not in progress', () => {
  const game = createStartingState()

  game.cases['case-investigation-ui'] = {
    ...createStarterCase({ id: 'case-investigation-ui', templateId: 'ops-003' }),
    status: 'resolved',
    weeksRemaining: 0,
    assignedTeamIds: [],
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-investigation-ui')

  expect(screen.queryByRole('region', { name: /investigation question prep/i })).not.toBeInTheDocument()
})

it('hides stealth leave-behind tradeoff when the case is not eligible', () => {
  const game = createStartingState()

  game.cases['case-stealth-ui'] = {
    ...createStarterCase({ id: 'case-stealth-ui', templateId: 'ops-003' }),
    title: 'Archive Access Siege',
    status: 'open',
    hiddenState: 'hidden',
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'archive', 'records'],
    stealthLeaveBehindId: 'leave-behind:leave-trace',
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-stealth-ui')

  expect(screen.queryByRole('region', { name: /stealth leave-behind tradeoff/i })).not.toBeInTheDocument()
})

it('shows pre-commit injury, death, and downtime warnings for available teams', () => {
  const game = createStartingState()

  game.cases['case-001'] = {
    ...game.cases['case-001']!,
    title: 'Glasshouse Breach',
    stage: 4,
    tags: ['breach', 'hazmat', 'containment'],
    preferredTags: ['medical', 'containment', 'support'],
    weights: {
      combat: 0.6,
      investigation: 0.05,
      utility: 0.15,
      social: 0.2,
    },
    difficulty: {
      combat: 72,
      investigation: 24,
      utility: 40,
      social: 46,
    },
  }

  useGameStore.setState({ game })
  renderCaseDetail('/cases/case-001')

  const oddsPanel = screen.getByRole('region', { name: /available team odds/i })

  expect(within(oddsPanel).getAllByText(/injury \d+%/i).length).toBeGreaterThan(0)
  expect(within(oddsPanel).getAllByText(/death \d+%/i).length).toBeGreaterThan(0)
  expect(within(oddsPanel).getAllByText(/agent-weeks/i).length).toBeGreaterThan(0)
  expect(
    within(oddsPanel).getAllByText(/survivability|balanced formation|Fatigue is driving/i).length
  ).toBeGreaterThan(0)
})
