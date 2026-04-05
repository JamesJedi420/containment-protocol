import '../../test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { assignTeam } from '../../domain/sim/assign'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { getXpThresholdForLevel } from '../../domain/progression'
import AgentDetailPage from './AgentDetailPage'

function renderAgentDetailPage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        <Route path="/registry/:agentId" element={<AgentDetailPage />} />
      </Routes>
      <LocationProbe />
      <HistoryNavControls />
    </MemoryRouter>
  )
}

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

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('renders agent assignment, progression, history, and passive traits', async () => {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const agent = game.agents[Object.keys(game.agents)[0]]!
  const seededXp = getXpThresholdForLevel(4) + 20

  game.teams.t_nightwatch.agentIds = [agent.id]
  game.agents[agent.id] = {
    ...agent,
    status: 'active',
    specialization: 'investigator',
    operationalRole: 'investigation',
    fatigue: 27,
    readinessProfile: {
      state: 'training',
      band: 'strained',
      deploymentEligible: false,
      recoveryRequired: false,
      riskFlags: ['training-locked', 'fatigue-watch'],
    },
    tags: ['disciplined', 'field-hardened'],
    identity: {
      name: agent.name,
      codename: 'NIGHTGLASS',
      callsign: 'NIGHTGLASS',
      age: 34,
      background: 'Former anti-smuggling task force lead.',
    },
    equipment: {
      silver_rounds: 2,
      medkits: 1,
    },
    equipmentSlots: {
      primary: 'silver_rounds',
      utility: 'medkits',
    },
    assignment: { state: 'training', startedWeek: game.week, trainingProgramId: 'core-analysis' },
    progression: {
      xp: seededXp,
      level: 4,
      potentialTier: 'B',
      growthProfile: 'steady',
      skillTree: {
        skillPoints: 3,
        trainedRelationships: {},
      },
    },
    history: {
      counters: {
        assignmentsCompleted: 3,
        casesResolved: 2,
        casesPartiallyResolved: 1,
        casesFailed: 0,
        anomaliesContained: 1,
        recoveryWeeks: 2,
        trainingWeeks: 4,
        trainingsCompleted: 1,
        stressSustained: 18,
        damageSustained: 6,
        anomalyExposures: 2,
        evidenceRecovered: 3,
      },
      casesCompleted: 3,
      trainingsDone: 1,
      bonds: { a_partner: 12 },
      performanceStats: {
        deployments: 3,
        totalContribution: 64,
        totalThreatHandled: 48,
        totalDamageTaken: 16,
        totalHealingPerformed: 12,
        totalEvidenceGathered: 19,
        totalContainmentActionsCompleted: 14,
        totalFieldPower: 81,
        totalContainment: 57,
        totalInvestigation: 39,
        totalSupport: 24,
        totalStressImpact: 18,
        totalEquipmentContributionDelta: 0,
        totalKitContributionDelta: 0,
        totalProtocolContributionDelta: 0,
        totalEquipmentScoreDelta: 0,
        totalKitScoreDelta: 0,
        totalProtocolScoreDelta: 0,
        totalKitEffectivenessDelta: 0,
        totalProtocolEffectivenessDelta: 0,
      },
      alliesWorkedWith: ['a_partner'],
      timeline: [
        {
          week: 1,
          eventType: 'simulation.weekly_tick',
          note: 'Initial roster review',
        },
        {
          week: 2,
          eventType: 'agent.training_completed',
          note: 'Completed fieldcraft',
          eventId: 'evt-1',
        },
      ],
      logs: [
        {
          id: 'evt-hist-1',
          schemaVersion: 1,
          type: 'agent.training_completed',
          sourceSystem: 'agent',
          timestamp: '2042-01-08T00:00:00.001Z',
          payload: {
            week: 2,
            queueId: 'training-test-entry',
            agentId: agent.id,
            agentName: agent.name,
            trainingId: 'core-analysis',
            trainingName: 'Core Analysis',
          },
        },
      ],
    },
    traits: [
      {
        id: 'disciplined',
        label: 'Disciplined',
        description: 'Keeps focus under pressure.',
        modifiers: { overall: 2 },
      },
    ],
    abilities: [
      {
        id: 'triage-rhythm',
        label: 'Triage Rhythm',
        description: 'Keeps the team moving through casualty spikes.',
        type: 'passive',
        effect: { social: 1, overall: 1 },
      },
    ],
  }
  game.trainingQueue = [
    {
      id: 'training-test-entry',
      trainingId: 'core-analysis',
      trainingName: 'Core Analysis',
      scope: 'agent',
      agentId: agent.id,
      agentName: agent.name,
      targetStat: 'investigation',
      statDelta: 4,
      startedWeek: game.week,
      durationWeeks: 3,
      remainingWeeks: 2,
      fundingCost: 120,
      fatigueDelta: 8,
    },
  ]

  useGameStore.setState({ game })
  renderAgentDetailPage(`/agents/${agent.id}`)
  const user = userEvent.setup()

  expect(screen.getByRole('heading', { name: agent.name, level: 2 })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to agents/i })).toBeInTheDocument()
  expect(screen.getByText(/response unit night watch/i)).toBeInTheDocument()
  expect(screen.getAllByText(/vampire nest in the stockyards/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/core analysis \(2w remaining\)/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/operational snapshot/i)).toBeInTheDocument()
  expect(screen.getByText(/current assignment/i)).toBeInTheDocument()
  expect(screen.getByText(/current output/i)).toBeInTheDocument()
  expect(screen.getAllByText(/former anti-smuggling task force lead/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/investigator/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/training locked/i)).toBeInTheDocument()
  expect(screen.getByText(/fatigue watch/i)).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /stats/i })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument()

  // XP value is in History tab
  await user.click(screen.getByRole('tab', { name: /history/i }))
  expect(screen.getByText(String(seededXp))).toBeInTheDocument()

  expect(screen.getAllByText('Disciplined').length).toBeGreaterThan(0)
  expect(screen.getByText(/keeps focus under pressure/i)).toBeInTheDocument()
  expect(screen.getAllByText(/overall \+2/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/completed fieldcraft/i)).toBeInTheDocument()
  expect(screen.getByText(/initial roster review/i)).toBeInTheDocument()
  expect(screen.getByText(/event-linked logs/i)).toBeInTheDocument()
  expect(screen.getAllByText(/readiness/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/risk flags/i)).toBeInTheDocument()
  expect(screen.getByText(/tactical assessment/i)).toBeInTheDocument()
  expect(screen.getAllByText(/xp to next/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/level progress/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/skill points/i).length).toBeGreaterThan(0)

  // Switch to Stats tab to check performance metrics
  await user.click(screen.getByRole('tab', { name: /stats/i }))
  expect(screen.getByText(/healing \/ stabilization/i)).toBeInTheDocument()
  expect(screen.getByText(/evidence gathered/i)).toBeInTheDocument()
  expect(screen.getByText(/live performance model/i)).toBeInTheDocument()

  expect(screen.getByText(/equipment and abilities/i)).toBeInTheDocument()
  expect(screen.getByText(/equipment loadout/i)).toBeInTheDocument()
  expect(screen.getByText(/equipped slots/i)).toBeInTheDocument()
  expect(screen.getByText(/loadout quality/i)).toBeInTheDocument()
  expect(screen.getByText(/nightglass/i)).toBeInTheDocument()
  expect(screen.getByText(/silver rounds/i)).toBeInTheDocument()
  expect(screen.getAllByText(/base additive/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/context bonus/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/total effect/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/quality 1/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/triage rhythm/i)).toBeInTheDocument()
  expect(screen.getByText(/keeps the team moving through casualty spikes/i)).toBeInTheDocument()
  expect(
    screen.getByText(/active during recovery or on medical\/support operations/i)
  ).toBeInTheDocument()
})

it('renders a local not found state for unknown agent ids', () => {
  renderAgentDetailPage('/agents/missing-agent')

  expect(screen.getByText(/agent not found/i)).toBeInTheDocument()
  expect(screen.getByText(/requested agent is not present/i)).toBeInTheDocument()
})

it('uses registry-specific back navigation on registry detail routes', () => {
  const game = createStartingState()
  const agent = game.agents[Object.keys(game.agents)[0]]!

  useGameStore.setState({ game })
  renderAgentDetailPage(`/registry/${agent.id}?q=test-filter`)

  expect(screen.getByRole('link', { name: /back to registry/i })).toHaveAttribute(
    'href',
    '/registry?q=test-filter'
  )
})

it('hydrates the active tab from the route search params and keeps tab-only state out of the back link', async () => {
  const user = userEvent.setup()
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const agent = game.agents[Object.keys(game.agents)[0]]!
  const seededXp = getXpThresholdForLevel(4) + 20

  game.agents[agent.id] = {
    ...agent,
    status: 'active',
    progression: {
      ...agent.progression,
      xp: seededXp,
      level: 4,
      potentialTier: 'B',
      growthProfile: 'steady',
      skillTree: {
        skillPoints: 2,
        trainedRelationships: {},
      },
    },
    history: {
      ...agent.history,
      counters: {
        assignmentsCompleted: 1,
        casesResolved: 1,
        casesPartiallyResolved: 0,
        casesFailed: 0,
        anomaliesContained: 0,
        recoveryWeeks: 0,
        trainingWeeks: 0,
        trainingsCompleted: 0,
        stressSustained: 0,
        damageSustained: 0,
        anomalyExposures: 0,
        evidenceRecovered: 0,
      },
      casesCompleted: 1,
      trainingsDone: 0,
      bonds: {},
      performanceStats: {
        deployments: 1,
        totalContribution: 10,
        totalThreatHandled: 8,
        totalDamageTaken: 1,
        totalHealingPerformed: 0,
        totalEvidenceGathered: 2,
        totalContainmentActionsCompleted: 1,
        totalFieldPower: 10,
        totalContainment: 8,
        totalInvestigation: 6,
        totalSupport: 3,
        totalStressImpact: 2,
        totalEquipmentContributionDelta: 0,
        totalKitContributionDelta: 0,
        totalProtocolContributionDelta: 0,
        totalEquipmentScoreDelta: 0,
        totalKitScoreDelta: 0,
        totalProtocolScoreDelta: 0,
        totalKitEffectivenessDelta: 0,
        totalProtocolEffectivenessDelta: 0,
      },
      alliesWorkedWith: [],
      timeline: [],
      logs: [],
    },
  }

  useGameStore.setState({ game })
  renderAgentDetailPage(`/agents/${agent.id}?q=nightglass&tab=history`)

  expect(screen.getByText(String(seededXp))).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /back to agents/i })).toHaveAttribute(
    'href',
    '/agents?q=nightglass'
  )

  await user.click(screen.getByRole('tab', { name: /morale/i }))

  expect(screen.getByText(/fatigue impact/i)).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent('tab=morale')
})

it('falls back to the default tab when the route receives an invalid tab value', () => {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const agent = game.agents[Object.keys(game.agents)[0]]!

  useGameStore.setState({ game })
  renderAgentDetailPage(`/agents/${agent.id}?tab=invalid-tab`)

  expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText(/live performance model/i)).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).not.toHaveTextContent('tab=invalid-tab')
})

it('preserves tab state through browser-style back and forward navigation', async () => {
  const user = userEvent.setup()
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const agent = game.agents[Object.keys(game.agents)[0]]!
  const seededXp = getXpThresholdForLevel(4) + 20

  game.agents[agent.id] = {
    ...agent,
    status: 'active',
    progression: {
      ...agent.progression,
      xp: seededXp,
      level: 4,
      potentialTier: 'B',
      growthProfile: 'steady',
      skillTree: {
        skillPoints: 1,
        trainedRelationships: {},
      },
    },
    history: {
      ...agent.history,
      counters: {
        assignmentsCompleted: 1,
        casesResolved: 0,
        casesPartiallyResolved: 0,
        casesFailed: 0,
        anomaliesContained: 0,
        recoveryWeeks: 0,
        trainingWeeks: 0,
        trainingsCompleted: 0,
        stressSustained: 0,
        damageSustained: 0,
        anomalyExposures: 0,
        evidenceRecovered: 0,
      },
      casesCompleted: 0,
      trainingsDone: 0,
      bonds: {},
      performanceStats: {
        deployments: 1,
        totalContribution: 4,
        totalThreatHandled: 3,
        totalDamageTaken: 1,
        totalHealingPerformed: 0,
        totalEvidenceGathered: 0,
        totalContainmentActionsCompleted: 0,
        totalFieldPower: 4,
        totalContainment: 3,
        totalInvestigation: 2,
        totalSupport: 1,
        totalStressImpact: 1,
        totalEquipmentContributionDelta: 0,
        totalKitContributionDelta: 0,
        totalProtocolContributionDelta: 0,
        totalEquipmentScoreDelta: 0,
        totalKitScoreDelta: 0,
        totalProtocolScoreDelta: 0,
        totalKitEffectivenessDelta: 0,
        totalProtocolEffectivenessDelta: 0,
      },
      alliesWorkedWith: [],
      timeline: [],
      logs: [],
    },
  }

  useGameStore.setState({ game })
  renderAgentDetailPage(`/agents/${agent.id}`)

  expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute('aria-selected', 'true')

  await user.click(screen.getByRole('tab', { name: /history/i }))
  expect(screen.getByText(String(seededXp))).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent('tab=history')

  await user.click(screen.getByRole('tab', { name: /morale/i }))
  expect(screen.getByText(/fatigue impact/i)).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent('tab=morale')

  await user.click(screen.getByRole('button', { name: /go back/i }))
  expect(screen.getByText(String(seededXp))).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent('tab=history')

  await user.click(screen.getByRole('button', { name: /go back/i }))
  expect(screen.getByText(/live performance model/i)).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByTestId('location-search')).not.toHaveTextContent('tab=')

  await user.click(screen.getByRole('button', { name: /go forward/i }))
  expect(screen.getByText(String(seededXp))).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent('tab=history')

  await user.click(screen.getByRole('button', { name: /go forward/i }))
  expect(screen.getByText(/fatigue impact/i)).toBeInTheDocument()
  expect(screen.getByTestId('location-search')).toHaveTextContent('tab=morale')
})
