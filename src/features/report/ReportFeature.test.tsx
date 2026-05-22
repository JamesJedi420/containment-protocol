import '../../test/setup'
import { beforeEach, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { createStartingState } from '../../data/startingState'
import { createNote } from '../../data/copy'
import { useGameStore } from '../../app/store/gameStore'
import { calcWeekScore } from '../../domain/sim/scoring'
import ReportPage from './ReportPage'
import ReportDetailPage from './ReportDetailPage'

function renderReportList() {
  return render(
    <MemoryRouter initialEntries={['/report']}>
      <Routes>
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderReportDetail(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/report/:week" element={<ReportDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('links report list entries into detail routes', () => {
  const game = createStartingState()
  game.reports = [
    {
      week: 1,
      rngStateBefore: 1,
      rngStateAfter: 2,
      newCases: ['case-1'],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      spawnedCases: [],
      maxStage: 1,
      avgFatigue: 0,
      teamStatus: [],
      notes: [],
    },
  ]

  useGameStore.setState({ game })
  renderReportList()

  expect(screen.getByRole('link', { name: /^week 1$/i })).toHaveAttribute('href', '/report/1')
  expect(screen.getByRole('region', { name: /weekly report timeline summary/i })).toBeInTheDocument()
  expect(screen.getByText(/status cue:/i)).toBeInTheDocument()
})

it('shows correct positive, negative, and neutral counts and best/worst week rollup in timeline summary', () => {
  const game = createStartingState()
  const base = {
    rngStateBefore: 1,
    rngStateAfter: 2,
    newCases: [] as string[],
    progressedCases: [] as string[],
    partialCases: [] as string[],
    unresolvedTriggers: [] as string[],
    spawnedCases: [] as string[],
    maxStage: 1,
    avgFatigue: 0,
    teamStatus: [],
    notes: [],
  }
  // Week 1: +100 pts (positive), Week 2: -30 pts (negative), Week 3: 0 pts (neutral)
  game.reports = [
    { ...base, week: 1, resolvedCases: ['case-a'], failedCases: [] },
    { ...base, week: 2, resolvedCases: [], failedCases: ['case-b'] },
    { ...base, week: 3, resolvedCases: [], failedCases: [] },
  ]

  useGameStore.setState({ game })
  renderReportList()

  const summary = screen.getByRole('region', { name: /weekly report timeline summary/i })
  expect(within(summary).getByText(/positive weeks: 1/i)).toBeInTheDocument()
  expect(within(summary).getByText(/negative weeks: 1/i)).toBeInTheDocument()
  expect(within(summary).getByText(/neutral weeks: 1/i)).toBeInTheDocument()
  // Best week should be week 1 (+100 pts), worst should be week 2 (-30 pts)
  expect(within(summary).getByText(/best week: 1/i)).toBeInTheDocument()
  expect(within(summary).getByText(/worst week: 2/i)).toBeInTheDocument()
})

it('renders per-week status cues matching each report score sign', () => {
  const game = createStartingState()
  const base = {
    rngStateBefore: 1,
    rngStateAfter: 2,
    newCases: [] as string[],
    progressedCases: [] as string[],
    partialCases: [] as string[],
    unresolvedTriggers: [] as string[],
    spawnedCases: [] as string[],
    maxStage: 1,
    avgFatigue: 0,
    teamStatus: [],
    notes: [],
  }
  game.reports = [
    { ...base, week: 1, resolvedCases: ['case-a'], failedCases: [] },
    { ...base, week: 2, resolvedCases: [], failedCases: ['case-b'] },
    { ...base, week: 3, resolvedCases: [], failedCases: [] },
  ]

  useGameStore.setState({ game })
  renderReportList()

  expect(screen.getByText('Status cue: Positive week')).toBeInTheDocument()
  expect(screen.getByText('Status cue: Negative week')).toBeInTheDocument()
  expect(screen.getByText('Status cue: Neutral week')).toBeInTheDocument()
})

it('renders snapshot-driven grouped sections and falls back to archived snapshot text', () => {
  const game = createStartingState()
  game.cases['case-001'] = {
    ...game.cases['case-001'],
    title: 'Renamed Live Case',
  }
  game.reports = [
    {
      week: 4,
      rngStateBefore: 12,
      rngStateAfter: 15,
      newCases: ['case-001'],
      progressedCases: ['case-001'],
      resolvedCases: ['case-001', 'missing-case'],
      failedCases: ['missing-case'],
      partialCases: ['missing-case'],
      unresolvedTriggers: ['missing-case'],
      spawnedCases: ['case-001', 'missing-case'],
      maxStage: 3,
      avgFatigue: 8,
      teamStatus: [
        {
          teamId: 'team-1',
          teamName: 'Alpha Unit',
          assignedCaseId: 'missing-case',
          assignedCaseTitle: 'Legacy Live Title',
          avgFatigue: 8,
          fatigueBand: 'strained',
        },
      ],
      caseSnapshots: {
        'case-001': {
          caseId: 'case-001',
          title: 'Snapshot Live Case',
          kind: 'case',
          mode: 'threshold',
          status: 'in_progress',
          stage: 2,
          deadlineRemaining: 4,
          durationWeeks: 3,
          weeksRemaining: 1,
          assignedTeamIds: [],
        },
        'missing-case': {
          caseId: 'missing-case',
          title: 'Archived Dossier',
          kind: 'raid',
          mode: 'deterministic',
          status: 'resolved',
          stage: 4,
          deadlineRemaining: 0,
          durationWeeks: 5,
          assignedTeamIds: [],
        },
      },
      notes: [createNote('Synthetic report note.')],
    },
  ]

  useGameStore.setState({ game })
  renderReportDetail('/report/4')

  expect(screen.getByRole('region', { name: /weekly report dossier/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /operational certainty summary/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /report analysis layout/i })).toBeInTheDocument()
  expect(screen.getByRole('complementary', { name: /team status summary/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /team status/i })).toBeInTheDocument()

  const score = calcWeekScore(game.reports[0]!)

  expect(screen.getByText(/^week 4$/i)).toBeInTheDocument()
  expect(
    screen.getByText(new RegExp(`^${score >= 0 ? '\\+' : ''}${score} pts$`, 'i'))
  ).toBeInTheDocument()
  expect(screen.getByText(/new: 1/i)).toBeInTheDocument()
  expect(screen.getByText(/progressed: 1/i)).toBeInTheDocument()
  expect(screen.getByText(/partial: 1/i)).toBeInTheDocument()
  expect(screen.getByText(/resolved: 2/i)).toBeInTheDocument()
  expect(screen.getByText(/failed: 1/i)).toBeInTheDocument()
  expect(screen.getByText(/spawned: 2/i)).toBeInTheDocument()
  expect(screen.getByText(/unresolved: 1/i)).toBeInTheDocument()
  expect(screen.getByText(/avg fatigue: 8/i)).toBeInTheDocument()
  expect(screen.getByText(/max stage: 3/i)).toBeInTheDocument()
  expect(screen.getByText(/rng before: 12/i)).toBeInTheDocument()
  expect(screen.getByText(/rng after: 15/i)).toBeInTheDocument()
  expect(screen.getByText(/synthetic report note\./i)).toBeInTheDocument()
  expect(screen.getByText(/new cases/i)).toBeInTheDocument()
  expect(screen.getByText(/progressed cases/i)).toBeInTheDocument()
  expect(screen.getByText(/partial cases/i)).toBeInTheDocument()
  expect(screen.getByText('Resolved cases')).toBeInTheDocument()
  expect(screen.getByText(/failed cases/i)).toBeInTheDocument()
  expect(screen.getByText('Unresolved cases')).toBeInTheDocument()
  expect(screen.getByText(/spawned cases/i)).toBeInTheDocument()
  expect(screen.getByText(/team status/i)).toBeInTheDocument()

  const newSection = screen.getByText('New cases').closest('section')
  expect(newSection).not.toBeNull()
  expect(
    within(newSection as HTMLElement).getByRole('link', { name: 'Snapshot Live Case' })
  ).toHaveAttribute('href', '/cases/case-001')
  expect(within(newSection as HTMLElement).queryByText('Renamed Live Case')).not.toBeInTheDocument()

  const resolvedSection = screen.getByText('Resolved cases').closest('section')
  expect(resolvedSection).not.toBeNull()
  expect(within(resolvedSection as HTMLElement).getByText('Archived Dossier')).toBeInTheDocument()
  expect(
    within(resolvedSection as HTMLElement).queryByRole('link', { name: 'Archived Dossier' })
  ).not.toBeInTheDocument()

  const teamEntry = screen.getByText('Alpha Unit').closest('li')
  expect(teamEntry).not.toBeNull()
  expect(within(teamEntry as HTMLElement).getByText('Archived Dossier')).toBeInTheDocument()
  expect(
    within(teamEntry as HTMLElement).queryByRole('link', { name: 'Archived Dossier' })
  ).not.toBeInTheDocument()
})

it('renders empty notes without breaking the report detail layout', () => {
  const game = createStartingState()
  game.reports = [
    {
      week: 2,
      rngStateBefore: 20,
      rngStateAfter: 21,
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
      notes: [],
    },
  ]

  useGameStore.setState({ game })
  renderReportDetail('/report/2')

  expect(screen.getByText(/no notes were recorded for this week\./i)).toBeInTheDocument()
  expect(screen.getByText(/no spawned cases were recorded\./i)).toBeInTheDocument()
  expect(screen.getByText(/no resolved cases were recorded\./i)).toBeInTheDocument()
  expect(screen.getByText(/no failed cases were recorded\./i)).toBeInTheDocument()
  expect(screen.getByText(/no unresolved cases were recorded\./i)).toBeInTheDocument()
})

it('filters report notes by typed note category without relying on text search', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  game.reports = [
    {
      week: 6,
      rngStateBefore: 60,
      rngStateAfter: 61,
      newCases: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      spawnedCases: [],
      maxStage: 2,
      avgFatigue: 3,
      teamStatus: [],
      notes: [
        {
          id: 'note-1',
          content: 'Case resolved entry.',
          timestamp: 1,
          type: 'case.resolved',
          metadata: { caseId: 'case-001' },
        },
        {
          id: 'note-2',
          content: 'Recruitment pipeline generated 2 candidate(s).',
          timestamp: 2,
          type: 'system.recruitment_generated',
          metadata: { count: 2 },
        },
      ],
    },
  ]

  useGameStore.setState({ game })
  renderReportDetail('/report/6')

  expect(screen.getByText(/case resolved entry\./i)).toBeInTheDocument()
  expect(screen.getByText(/recruitment pipeline generated 2 candidate\(s\)\./i)).toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText(/^note category$/i), 'recruitment')

  expect(screen.queryByText(/case resolved entry\./i)).not.toBeInTheDocument()
  expect(screen.getByText(/recruitment pipeline generated 2 candidate\(s\)\./i)).toBeInTheDocument()
})

it('navigates between adjacent weekly reports from the detail header', async () => {
  const user = userEvent.setup()
  const game = createStartingState()
  const emptyReport = {
    rngStateBefore: 1,
    rngStateAfter: 2,
    newCases: [] as string[],
    progressedCases: [] as string[],
    resolvedCases: [] as string[],
    failedCases: [] as string[],
    partialCases: [] as string[],
    unresolvedTriggers: [] as string[],
    spawnedCases: [] as string[],
    maxStage: 1,
    avgFatigue: 0,
    teamStatus: [],
    notes: [],
  }

  game.reports = [
    { ...emptyReport, week: 2 },
    { ...emptyReport, week: 4 },
  ]

  useGameStore.setState({ game })
  renderReportDetail('/report/4')

  expect(screen.getByRole('navigation', { name: /weekly report navigation/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /previous week \(2\)/i })).toHaveAttribute('href', '/report/2')
  expect(screen.queryByRole('link', { name: /next week/i })).not.toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /previous week \(2\)/i }))

  expect(screen.getByText(/^week 2$/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /next week \(4\)/i })).toHaveAttribute('href', '/report/4')
})

it('shows only a next-week link on the earliest available report', () => {
  const game = createStartingState()
  const emptyReport = {
    rngStateBefore: 1,
    rngStateAfter: 2,
    newCases: [] as string[],
    progressedCases: [] as string[],
    resolvedCases: [] as string[],
    failedCases: [] as string[],
    partialCases: [] as string[],
    unresolvedTriggers: [] as string[],
    spawnedCases: [] as string[],
    maxStage: 1,
    avgFatigue: 0,
    teamStatus: [],
    notes: [],
  }

  game.reports = [
    { ...emptyReport, week: 1 },
    { ...emptyReport, week: 3 },
  ]

  useGameStore.setState({ game })
  renderReportDetail('/report/1')

  expect(screen.getByRole('link', { name: /next week \(3\)/i })).toHaveAttribute('href', '/report/3')
  expect(screen.queryByRole('link', { name: /previous week/i })).not.toBeInTheDocument()
})

it('omits week navigation when only one weekly report exists', () => {
  const game = createStartingState()
  game.reports = [
    {
      week: 3,
      rngStateBefore: 1,
      rngStateAfter: 2,
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
      notes: [],
    },
  ]

  useGameStore.setState({ game })
  renderReportDetail('/report/3')

  expect(screen.queryByRole('navigation', { name: /weekly report navigation/i })).not.toBeInTheDocument()
})

it('renders a local not-found state for unknown report weeks', () => {
  renderReportDetail('/report/999')

  expect(screen.getByText(/report not found/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to reports/i })).toHaveAttribute('href', '/report')
  expect(screen.queryByRole('navigation', { name: /weekly report navigation/i })).not.toBeInTheDocument()
})

it('renders not-found without week navigation for non-integer week routes', () => {
  renderReportDetail('/report/2.5')

  expect(screen.getByText(/report not found/i)).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: /weekly report navigation/i })).not.toBeInTheDocument()
})
