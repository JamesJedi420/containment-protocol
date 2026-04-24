// cspell:words cooldown explainability sato unassigns
import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { assignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { queueTraining } from '../../domain/sim/training'
import { RECONCILIATION_COST } from '../../domain/sim/reconciliation'
import TrainingDivisionPage from './TrainingDivisionPage'

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}

function renderTrainingDivisionPage(route = '/training-division') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <TrainingDivisionPage />
    </MemoryRouter>
  )
}

function getAgentCard(agentName: string) {
  const card = screen.getByText(agentName).closest('li')

  expect(card).not.toBeNull()
  return card!
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('TrainingDivisionPage', () => {
  it('hydrates advanced/history panel visibility from URL and keeps it in sync', async () => {
    const user = userEvent.setup()

    renderTrainingDivisionPage('/training-division?advanced=1&history=1')

    expect(screen.getByRole('heading', { name: /academy analysis/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent training events/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /hide advanced panels/i }))
    await user.click(screen.getByRole('button', { name: /hide history panels/i }))

    expect(screen.getByTestId('location-search')).toHaveTextContent('')
    expect(screen.queryByRole('heading', { name: /academy analysis/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /recent training events/i })
    ).not.toBeInTheDocument()
  })

  it('renders keyboard skip links for summary, queue, and roster sections', () => {
    renderTrainingDivisionPage()

    expect(screen.getByRole('link', { name: /skip to training summary/i })).toHaveAttribute(
      'href',
      '#training-summary'
    )
    expect(screen.getByRole('link', { name: /skip to active queue/i })).toHaveAttribute(
      'href',
      '#training-active-queue'
    )
    expect(screen.getByRole('link', { name: /skip to eligible roster/i })).toHaveAttribute(
      'href',
      '#training-roster'
    )
    expect(document.getElementById('training-summary')).not.toBeNull()
    expect(document.getElementById('training-active-queue')).not.toBeNull()
    expect(document.getElementById('training-roster')).not.toBeNull()
  })

  it('shows a recommended next move strip with payoff-oriented detail', () => {
    renderTrainingDivisionPage()

    expect(screen.getByText(/recommended next move/i)).toBeInTheDocument()
    expect(screen.getByText(/best immediate gain:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/best immediate gain:/i)).toHaveLength(1)
    expect(screen.getByText(/confidence:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/commit clarity:/i).length).toBeGreaterThan(0)
  })

  it('groups agents by readiness and links into agent detail', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: assignTeam(createStartingState(), 'case-001', 't_nightwatch') })

    renderTrainingDivisionPage()

    expect(screen.getByRole('heading', { name: /training division/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /academy analysis/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /instructor assignments/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /academy & coaching activity/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /chemistry inspector/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /training catalog/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /active queue/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /eligible roster/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /team drills/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /recent training events/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /recent completions timeline/i })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/no training programs are active\./i)).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /show advanced panels/i })).toHaveAttribute(
      'aria-controls',
      'training-advanced-panels'
    )
    expect(screen.getByRole('button', { name: /show history panels/i })).toHaveAttribute(
      'aria-controls',
      'training-history-panels'
    )

    await user.click(screen.getByRole('button', { name: /show advanced panels/i }))
    await user.click(screen.getByRole('button', { name: /show history panels/i }))

    expect(screen.getByRole('heading', { name: /academy analysis/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /instructor assignments/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /academy & coaching activity/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /chemistry inspector/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent training events/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /recent completions timeline/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/no completed programs recorded yet\./i)).toBeInTheDocument()

    const deployedCard = getAgentCard('Ava Brooks')
    const readyCard = getAgentCard('Dr. Sato')

    expect(within(deployedCard).getByText(/on assignment/i)).toBeInTheDocument()
    expect(within(readyCard).getByText(/ready for training/i)).toBeInTheDocument()
    expect(within(readyCard).getByText(/best projected gain:/i)).toBeInTheDocument()

    const agentLink = within(readyCard).getByRole('link', { name: /^dr\. sato$/i })
    expect(agentLink).toHaveAttribute('href', '/agents/a_sato')

    expect(
      within(deployedCard).getByRole('button', { name: /close-quarters drills/i })
    ).toBeDisabled()
    expect(within(readyCard).getByRole('button', { name: /close-quarters drills/i })).toBeEnabled()

    await user.click(within(readyCard).getByRole('button', { name: /close-quarters drills/i }))

    expect(screen.getByText(/^queue depth$/i).closest('div')).toHaveTextContent('1')
    const queueSection = screen.getByRole('heading', { name: /active queue/i }).closest('article')

    expect(queueSection).not.toBeNull()
    expect(within(queueSection!).getByRole('link', { name: /^dr\. sato$/i })).toBeInTheDocument()
    expect(within(queueSection!).getByText(/close-quarters drills/i)).toBeInTheDocument()
    expect(within(queueSection!).getByText(/2 weeks remaining/i)).toBeInTheDocument()
    expect(within(queueSection!).getByText(/0% complete/i)).toBeInTheDocument()
    expect(within(queueSection!).getByText(/fatigue incurred \+0 \//i)).toBeInTheDocument()
    expect(within(queueSection!).getByText(/cancel refund \$10/i)).toBeInTheDocument()
    expect(within(queueSection!).getByText(/week schedule: \+3, \+3/i)).toBeInTheDocument()
    expect(screen.getByText(/dr\. sato started close-quarters drills/i)).toBeInTheDocument()
    expect(useGameStore.getState().game.trainingQueue).toHaveLength(1)
    expect(useGameStore.getState().game.events.at(-1)).toMatchObject({
      type: 'agent.training_started',
      sourceSystem: 'agent',
      payload: {
        week: 1,
        agentId: 'a_sato',
        agentName: 'Dr. Sato',
        trainingId: 'combat-drills',
      },
    })
    expect(screen.getAllByRole('link', { name: /^dr\. sato$/i })).toHaveLength(2)
  })

  it('upgrades the academy and unlocks tier-1 solo programs from the training page', async () => {
    const user = userEvent.setup()
    const state = { ...createStartingState(), funding: 500, academyTier: 0 }
    useGameStore.setState({ game: state })

    renderTrainingDivisionPage()
    await user.click(screen.getByRole('button', { name: /show advanced panels/i }))

    const satoCard = getAgentCard('Dr. Sato')
    const lockedButton = within(satoCard).getByRole('button', { name: /threat assessment/i })
    expect(lockedButton).toBeDisabled()
    expect(lockedButton).toHaveTextContent(/unlock tier 1/i)

    await user.click(screen.getByRole('button', { name: /upgrade academy \(\$200\)/i }))

    expect(useGameStore.getState().game.academyTier).toBe(1)
    expect(
      within(getAgentCard('Dr. Sato')).getByRole('button', { name: /threat assessment/i })
    ).toBeEnabled()
    expect(screen.getByText(/academy upgraded to tier 1/i)).toBeInTheDocument()
  })

  it('assigns and unassigns an instructor to a compatible trainee from the training page', async () => {
    const user = userEvent.setup()
    const queued = queueTraining(createStartingState(), 'a_sato', 'combat-drills')
    useGameStore.setState({
      game: {
        ...queued,
        staff: {
          ...queued.staff,
          'ins-01': {
            role: 'instructor',
            name: 'Prof. Chen',
            efficiency: 82,
            instructorSpecialty: 'combat',
          },
        },
      },
    })

    renderTrainingDivisionPage()
    await user.click(screen.getByRole('button', { name: /show advanced panels/i }))

    const instructorSection = screen
      .getByRole('heading', { name: /instructor assignments/i })
      .closest('article')!
    expect(within(instructorSection).getByText(/prof\. chen/i)).toBeInTheDocument()

    await user.click(
      within(instructorSection).getByRole('button', { name: /assign to dr\. sato/i })
    )

    expect(useGameStore.getState().game.staff['ins-01']).toMatchObject({
      assignedAgentId: 'a_sato',
    })
    expect(screen.getAllByText(/instructor: prof\. chen \(\+1\)/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/prof\. chen assigned to dr\. sato/i)).toBeInTheDocument()

    await user.click(within(instructorSection).getByRole('button', { name: /unassign/i }))
    expect(useGameStore.getState().game.staff['ins-01']).not.toHaveProperty('assignedAgentId')
    expect(screen.getByText(/prof\. chen removed from dr\. sato/i)).toBeInTheDocument()
  })

  it('shows trained bond summaries for teams with existing party-drill familiarity', () => {
    const game = createStartingState()
    game.agents.a_ava.progression = {
      ...game.agents.a_ava.progression!,
      skillTree: {
        skillPoints: game.agents.a_ava.progression!.skillTree?.skillPoints ?? 0,
        ...(game.agents.a_ava.progression!.skillTree?.specialization
          ? { specialization: game.agents.a_ava.progression!.skillTree.specialization }
          : {}),
        trainedRelationships: {
          ...(game.agents.a_ava.progression!.skillTree?.trainedRelationships ?? {}),
          a_rook: 2,
        },
      },
    }
    game.agents.a_rook.progression = {
      ...game.agents.a_rook.progression!,
      skillTree: {
        skillPoints: game.agents.a_rook.progression!.skillTree?.skillPoints ?? 0,
        ...(game.agents.a_rook.progression!.skillTree?.specialization
          ? { specialization: game.agents.a_rook.progression!.skillTree.specialization }
          : {}),
        trainedRelationships: {
          ...(game.agents.a_rook.progression!.skillTree?.trainedRelationships ?? {}),
          a_ava: 2,
        },
      },
    }
    useGameStore.setState({ game })

    renderTrainingDivisionPage()

    const teamSection = screen.getByRole('heading', { name: /team drills/i }).closest('article')!
    expect(within(teamSection).getByText(/bond depth 2/i)).toBeInTheDocument()
    expect(within(teamSection).getByText(/strongest pair:/i)).toBeInTheDocument()
  })

  it('renders projected score breakdown and recommendation explanation for team drill suggestions', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: createStartingState() })

    renderTrainingDivisionPage()
    await user.click(screen.getByRole('button', { name: /show advanced panels/i }))

    const academySection = screen
      .getByRole('heading', { name: /academy analysis/i })
      .closest('article')!
    expect(within(academySection).getAllByText(/projection \(/i).length).toBeGreaterThanOrEqual(1)
    expect(within(academySection).getAllByText(/modifier deltas:/i).length).toBeGreaterThanOrEqual(
      1
    )
    expect(within(academySection).getAllByText(/why recommended:/i).length).toBeGreaterThanOrEqual(
      1
    )
  })

  it('renders pair-level relationship explainability in chemistry inspector', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.events = [
      {
        id: 'event-relationship-a',
        schemaVersion: 1,
        type: 'agent.relationship_changed',
        sourceSystem: 'agent',
        payload: {
          week: 4,
          agentId: 'a_ava',
          agentName: 'Ava Brooks',
          counterpartId: 'a_sato',
          counterpartName: 'Dr. Sato',
          previousValue: 0.2,
          nextValue: 0.6,
          delta: 0.4,
          reason: 'mission_success',
        },
        timestamp: 'Week 4 · #001',
      },
      {
        id: 'event-relationship-b',
        schemaVersion: 1,
        type: 'agent.relationship_changed',
        sourceSystem: 'agent',
        payload: {
          week: 4,
          agentId: 'a_sato',
          agentName: 'Dr. Sato',
          counterpartId: 'a_ava',
          counterpartName: 'Ava Brooks',
          previousValue: 0.1,
          nextValue: 0.7,
          delta: 0.6,
          reason: 'mission_success',
        },
        timestamp: 'Week 4 · #002',
      },
    ]
    useGameStore.setState({ game })

    renderTrainingDivisionPage()
    await user.click(screen.getByRole('button', { name: /show advanced panels/i }))

    const inspector = screen
      .getByRole('heading', { name: /chemistry inspector/i })
      .closest('article')!
    expect(within(inspector).getByText(/ava brooks ↔ dr\. sato/i)).toBeInTheDocument()
    expect(within(inspector).getAllByText(/mission success/i).length).toBeGreaterThanOrEqual(1)
  })

  it('allows triggering reconciliation for a strained pair from the panel', async () => {
    const user = userEvent.setup()
    const base = createStartingState()
    const game = {
      ...base,
      agents: {
        ...base.agents,
        a_ava: {
          ...base.agents.a_ava,
          relationships: { ...base.agents.a_ava.relationships, a_sato: -1 },
        },
        a_sato: {
          ...base.agents.a_sato,
          relationships: { ...base.agents.a_sato.relationships, a_ava: -0.5 },
        },
      },
    }
    useGameStore.setState({ game })

    renderTrainingDivisionPage()
    await user.click(screen.getByRole('button', { name: /show advanced panels/i }))

    const reconciliationSection = screen
      .getByRole('heading', { name: /relationship reconciliation/i })
      .closest('article')!
    const pairItem = within(reconciliationSection)
      .getByText(/ava brooks ↔ dr\. sato/i)
      .closest('li')!
    const reconcileButton = within(pairItem).getByRole('button', { name: /reconcile \(\$12\)/i })

    await user.click(reconcileButton)

    const next = useGameStore.getState().game
    expect(next.funding).toBe(game.funding - RECONCILIATION_COST)
    expect(next.agents.a_ava.relationships.a_sato ?? 0).toBeGreaterThan(-1)
    expect(next.agents.a_sato.relationships.a_ava ?? 0).toBeGreaterThan(-0.5)
    expect(
      next.events.some(
        (event) =>
          event.type === 'agent.relationship_changed' && event.payload.reason === 'reconciliation'
      )
    ).toBe(true)

    // Weekly cooldown: pair remains listed but cannot be reconciled again this week.
    expect(within(pairItem).getAllByText(/reconciled this week\./i)).toHaveLength(1)
    expect(within(pairItem).getByRole('button', { name: /reconcile \(\$12\)/i })).toBeDisabled()
  })

  it('shows completed training items in the completions timeline', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.events = [
      {
        id: 'event-training-complete',
        schemaVersion: 1,
        type: 'agent.training_completed',
        sourceSystem: 'agent',
        payload: {
          week: 3,
          queueId: 'q-1',
          agentId: 'a_sato',
          agentName: 'Dr. Sato',
          trainingId: 'combat-drills',
          trainingName: 'Close-Quarters Drills',
        },
        timestamp: 'Week 3 · #002',
      },
    ]
    useGameStore.setState({ game })

    renderTrainingDivisionPage()
    await user.click(screen.getByRole('button', { name: /show history panels/i }))

    const timeline = screen
      .getByRole('heading', { name: /recent completions timeline/i })
      .closest('article')

    expect(timeline).not.toBeNull()
    expect(
      within(timeline!).getByText(/week 3: dr\. sato completed close-quarters drills/i)
    ).toBeInTheDocument()
  })

  it('queues team drills from the team roster', async () => {
    const user = userEvent.setup()

    renderTrainingDivisionPage()

    const teamSection = screen.getByRole('heading', { name: /team drills/i }).closest('article')

    expect(teamSection).not.toBeNull()
    const nightWatchCard = within(teamSection!)
      .getByRole('link', { name: /night watch/i })
      .closest('li')

    expect(nightWatchCard).not.toBeNull()
    expect(
      within(nightWatchCard!).getByRole('button', { name: /coordination drill/i })
    ).toBeEnabled()

    await user.click(within(nightWatchCard!).getByRole('button', { name: /coordination drill/i }))

    expect(screen.getByText(/^queue depth$/i).closest('div')).toHaveTextContent('1')
    expect(
      useGameStore.getState().game.trainingQueue.filter((entry) => entry.teamId === 't_nightwatch')
    ).toHaveLength(4)
    expect(screen.getByText(/4 agents \/ coordination drill/i)).toBeInTheDocument()
    expect(
      useGameStore.getState().game.events.filter((event) => event.type === 'agent.training_started')
    ).toHaveLength(4)
  })

  it('filters roster by name search', async () => {
    const user = userEvent.setup()

    renderTrainingDivisionPage()

    const rosterSection = screen
      .getByRole('heading', { name: /eligible roster/i })
      .closest('article')!
    const searchInput = within(rosterSection).getByRole('searchbox', { name: /search/i })
    await user.type(searchInput, 'sato')

    expect(within(rosterSection).getByText(/dr\. sato/i)).toBeInTheDocument()
    expect(within(rosterSection).queryByText(/ava brooks/i)).not.toBeInTheDocument()
  })

  it('resets training filters back to defaults from the header action', async () => {
    const user = userEvent.setup()

    renderTrainingDivisionPage('/training-division?advanced=1&history=1')

    expect(screen.getByText(/filters: default/i)).toBeInTheDocument()

    const rosterSection = screen
      .getByRole('heading', { name: /eligible roster/i })
      .closest('article')!
    const headerSection = screen
      .getByRole('heading', { name: /training division/i })
      .closest('article')!
    const searchInput = within(rosterSection).getByRole('searchbox', { name: /search/i })
    await user.type(searchInput, 'sato')

    expect(screen.getByText(/filters: active/i)).toBeInTheDocument()
    expect(
      within(headerSection).getByRole('button', { name: /reset training filters/i })
    ).toBeInTheDocument()

    await user.click(within(headerSection).getByRole('button', { name: /reset training filters/i }))

    expect(screen.getByText(/filters: default/i)).toBeInTheDocument()
    expect(within(rosterSection).getByText(/ava brooks/i)).toBeInTheDocument()
    expect(within(rosterSection).getByText(/dr\. sato/i)).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent('advanced=1')
    expect(screen.getByTestId('location-search')).toHaveTextContent('history=1')
  })

  it('filters roster by readiness status', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: assignTeam(createStartingState(), 'case-001', 't_nightwatch') })

    renderTrainingDivisionPage()

    const rosterSection = screen
      .getByRole('heading', { name: /eligible roster/i })
      .closest('article')!

    // With 'deployed' filter, Ava Brooks (Nightwatch, deployed) is visible
    const readinessSelect = within(rosterSection).getByRole('combobox', { name: /readiness/i })
    await user.selectOptions(readinessSelect, 'deployed')

    expect(within(rosterSection).getByText(/ava brooks/i)).toBeInTheDocument()

    // Switch to 'ready' — reserve pool agents should appear, deployed should not
    await user.selectOptions(readinessSelect, 'ready')
    expect(within(rosterSection).queryByText(/ava brooks/i)).not.toBeInTheDocument()
  })

  it('filters queue by scope', async () => {
    const user = userEvent.setup()

    renderTrainingDivisionPage()

    // Queue an individual training first
    const rosterSection = screen
      .getByRole('heading', { name: /eligible roster/i })
      .closest('article')!
    const satoCard = within(rosterSection)
      .getByText(/dr\. sato/i)
      .closest('li')!
    await user.click(within(satoCard).getByRole('button', { name: /close-quarters drills/i }))

    const queueSection = screen.getByRole('heading', { name: /active queue/i }).closest('article')!

    // Individual entry is visible in 'all' scope
    expect(within(queueSection).getByRole('link', { name: /dr\. sato/i })).toBeInTheDocument()

    // Switch scope to 'team' — individual entry should disappear from queue
    const scopeSelect = within(queueSection).getByRole('combobox', { name: /scope/i })
    await user.selectOptions(scopeSelect, 'team')

    expect(within(queueSection).queryByRole('link', { name: /dr\. sato/i })).not.toBeInTheDocument()

    // Switch back to 'all'
    await user.selectOptions(scopeSelect, 'all')
    expect(within(queueSection).getByRole('link', { name: /dr\. sato/i })).toBeInTheDocument()
  })

  it('shows a cancelled training event in the recent events timeline', async () => {
    const user = userEvent.setup()

    renderTrainingDivisionPage()

    // Queue Dr. Sato for training then cancel via the queue UI
    const rosterSection = screen
      .getByRole('heading', { name: /eligible roster/i })
      .closest('article')!
    const satoCard = within(rosterSection)
      .getByText(/dr\. sato/i)
      .closest('li')!
    await user.click(within(satoCard).getByRole('button', { name: /close-quarters drills/i }))

    const queueSection = screen.getByRole('heading', { name: /active queue/i }).closest('article')!
    const cancelButton = within(queueSection).getByRole('button', { name: /cancel training/i })
    await user.click(cancelButton)

    await user.click(screen.getByRole('button', { name: /show history panels/i }))

    const eventsSection = screen
      .getByRole('heading', { name: /recent training events/i })
      .closest('article')!

    expect(
      within(eventsSection).getByText(/dr\. sato cancelled close-quarters drills/i)
    ).toBeInTheDocument()
    expect(within(eventsSection).getByText(/refund: \$10/i)).toBeInTheDocument()
  })
})
