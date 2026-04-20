import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { formatOutcomeCountSummary } from '../../domain/reportNotes'
import { buildAgencyOverview, formatCadenceSummary } from '../../domain/strategicState'
import AgencyPage from './AgencyPage'

function makeMinimalGameState(overrides = {}) {
  return {
    ...createStartingState(),
    cases: {},
    reports: [],
    events: [], // Needed for buildFactionStandingMap
    ...overrides,
  }
}

function renderAgencyPage() {
  return render(
    <MemoryRouter initialEntries={['/agency']}>
      <AgencyPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('AgencyPage escalation/pressure cadence surfacing', () => {
  it('shows correct cadence for empty state', () => {
    const overview = buildAgencyOverview(makeMinimalGameState())
    const lines = formatCadenceSummary(overview)
    expect(lines[0]).toMatch(/Pressure: 0/)
    expect(lines[1]).toMatch(/Major incidents: 0/)
    expect(lines[2]).toMatch(/Unresolved momentum: 0/)
    expect(lines[4]).toMatch(/Extra checks: None/)
  })

  it('shows extra checks for urgent escalations', () => {
    const game = makeMinimalGameState({
      cases: {
        c1: {
          id: 'c1',
          title: 'Test Case',
          kind: 'case',
          mode: 'threshold',
          status: 'active',
          stage: 2,
          deadlineRemaining: 1,
          assignedTeamIds: [],
          tags: [],
          raid: undefined,
          onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
          onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
          difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
          weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
          requiredTags: [],
          preferredTags: [],
          durationWeeks: 2,
          weeksRemaining: 2,
          deadlineWeeks: 2,
        },
      },
    })
    const overview = buildAgencyOverview(game)
    const lines = formatCadenceSummary(overview)
    expect(lines[4]).toMatch(/Extra checks: Test Case/)
  })
})

describe('AgencyPage', () => {
  it('renders the agency strategic overview and recommendation sections', () => {
    renderAgencyPage()

    expect(screen.getByRole('heading', { name: /agency command/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /command posture/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /academy and logistics posture/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /strategic threat picture/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /territorial power/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /supply network/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /academy recommendations/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /external faction actors/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /authority transfer & succession/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /latest operations summary/i })).toBeInTheDocument()
    expect(screen.getByText(/containment protocol/i)).toBeInTheDocument()
  })

  it('renders the canonical outcome-band summary from the shared report formatter', () => {
    const game = createStartingState()
    game.reports = [
      {
        week: 3,
        rngStateBefore: 301,
        rngStateAfter: 302,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: ['case-002'],
        partialCases: ['case-003'],
        unresolvedTriggers: ['case-004'],
        spawnedCases: [],
        maxStage: 3,
        avgFatigue: 10,
        teamStatus: [],
        notes: [],
      },
    ]

    useGameStore.setState({ game })
    renderAgencyPage()

    expect(
      screen.getByText(`Outcomes: ${formatOutcomeCountSummary(buildAgencyOverview(game).summary.report)}`)
    ).toBeInTheDocument()
  })

  it('renders canonical authority transfer state from the governance summary', () => {
    const game = createStartingState()
    game.governance = {
      authorities: [
        {
          id: 'authority-directorate',
          label: 'Directorate Mandate',
          class: 'sovereign_authority',
          holderId: 'successor-1',
          holderName: 'Marshal Ives',
          holderStatus: 'active',
          transferredAuthority: 100,
          recognizedLegitimacy: 58,
          practicalControl: 88,
          contested: true,
          unstable: true,
          lastTransferId: 'transfer-1',
        },
      ],
      transfers: [],
      contracts: [
        {
          id: 'contract-1',
          authorityId: 'authority-charter',
          authorityLabel: 'North Charter',
          authorityClass: 'charter_holdings',
          status: 'armed',
          trigger: {
            type: 'week_reached',
            weekAtLeast: 3,
          },
          participants: [],
          claimants: [
            {
              id: 'archivist-vale',
              name: 'Archivist Vale',
              priority: 1,
              basis: ['sealed_instrument'],
              present: true,
              accepts: true,
            },
          ],
          actualLocation: 'records chamber',
          presentInstruments: ['sealed-charter'],
          presentSetupFlags: ['authentication-cleared'],
        },
      ],
      history: [
        {
          transferId: 'transfer-1',
          authorityId: 'authority-directorate',
          authorityLabel: 'Directorate Mandate',
          authorityClass: 'sovereign_authority',
          transferPath: 'recognized_transfer',
          batchId: 'batch-rite',
          batchLabel: 'Night Watch Rite',
          week: 4,
          state: 'contested',
          outcome: 'contested_completion',
          grantedPowerTier: 'ascendant',
          summary:
            'Directorate Mandate settled as contested to Marshal Ives. Authority 100 / legitimacy 58 / control 88.',
          successorName: 'Marshal Ives',
          blockers: [],
          transferredAuthority: 100,
          recognizedLegitimacy: 58,
          practicalControl: 88,
          coercive: true,
          failoverUsed: false,
        },
      ],
    }

    useGameStore.setState({ game })
    renderAgencyPage()

    expect(screen.getByText(/latest batch: night watch rite/i)).toBeInTheDocument()
    expect(screen.getByText(/successor: marshal ives/i)).toBeInTheDocument()
    expect(screen.getByText(/authority 100 \/ legitimacy 58 \/ control 88/i)).toBeInTheDocument()
    expect(screen.getByText(/designated successor: archivist vale/i)).toBeInTheDocument()
  })

  it('renders territorial power lines from the canonical agency summary', () => {
    const game = createStartingState()
    game.territorialPower = {
      nodes: [
        {
          id: 'node-hallow',
          yield: 5,
          suppressed: false,
          controller: 'Containment Protocol',
        },
      ],
      conduits: [
        {
          from: 'node-hallow',
          to: 'ward-prime',
          status: 'open',
          capacity: 3,
        },
      ],
      castingEligibility: [
        {
          scopeId: 'node-hallow',
          scopeType: 'node',
          eligible: true,
        },
      ],
      lastExpenditure: {
        scopeId: 'node-hallow',
        scopeType: 'node',
        nodeId: 'node-hallow',
        result: 'spent',
        amount: 3,
        availableYield: 5,
        conduitCapacity: 3,
      },
    }

    useGameStore.setState({ game })
    renderAgencyPage()

    expect(screen.getByText(/nodes: 1 \/ available yield 5 \/ suppressed 0/i)).toBeInTheDocument()
    expect(screen.getByText(/controllers: containment protocol/i)).toBeInTheDocument()
  })

  it('renders supply network lines from the canonical agency summary', () => {
    const game = createStartingState()
    game.supplyNetwork = {
      nodes: [
        {
          id: 'node-command',
          label: 'Directorate Command',
          type: 'command_center',
          controller: 'agency',
          active: true,
          strategicValue: 3,
          regionTags: ['global'],
        },
        {
          id: 'node-corridor',
          label: 'North Corridor',
          type: 'corridor',
          controller: 'agency',
          active: true,
          strategicValue: 4,
          regionTags: ['occult_district'],
        },
      ],
      sources: [
        {
          id: 'source-command',
          label: 'Directorate Dispatch',
          type: 'command',
          nodeId: 'node-command',
          active: true,
          throughput: 2,
        },
      ],
      links: [
        {
          id: 'link-command-corridor',
          from: 'node-command',
          to: 'node-corridor',
          mode: 'road',
          status: 'open',
          capacity: 1,
        },
      ],
      transportAssets: [
        {
          id: 'transport-main',
          label: 'Main Column',
          class: 'truck_column',
          mode: 'road',
          status: 'ready',
          lift: 1,
          fragility: 2,
          routeNodeIds: ['node-command', 'node-corridor'],
        },
      ],
      traces: [
        {
          regionTag: 'global',
          state: 'supported',
          sourceId: 'source-command',
          sourceLabel: 'Directorate Dispatch',
          targetNodeId: 'node-command',
          targetNodeLabel: 'Directorate Command',
          transportAssetId: 'transport-main',
          transportAssetLabel: 'Main Column',
          pathNodeIds: ['node-command'],
          pathLinkIds: [],
          deliveredLift: 1,
          explanation: 'global: Directorate Dispatch reached Directorate Command via Main Column.',
        },
        {
          regionTag: 'occult_district',
          state: 'supported',
          sourceId: 'source-command',
          sourceLabel: 'Directorate Dispatch',
          targetNodeId: 'node-corridor',
          targetNodeLabel: 'North Corridor',
          transportAssetId: 'transport-main',
          transportAssetLabel: 'Main Column',
          pathNodeIds: ['node-command', 'node-corridor'],
          pathLinkIds: ['link-command-corridor'],
          deliveredLift: 1,
          explanation: 'occult_district: Directorate Dispatch reached North Corridor via Main Column.',
        },
      ],
    }

    useGameStore.setState({ game })
    renderAgencyPage()

    expect(screen.getByText(/support: 2\/2 regions traced \/ unsupported 0/i)).toBeInTheDocument()
    expect(screen.getByText(/transport: 1 ready \/ 0 disrupted \/ delivered lift 2/i)).toBeInTheDocument()
    expect(screen.getByText(/strategic control: 7 \/ source throughput 2/i)).toBeInTheDocument()
  })
})
