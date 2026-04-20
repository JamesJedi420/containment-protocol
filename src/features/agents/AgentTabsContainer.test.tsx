// cspell:words callsign fieldcraft nightglass
import '../../test/setup'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createStartingState } from '../../data/startingState'
import { getXpThresholdForLevel } from '../../domain/progression'
import { assignTeam } from '../../domain/sim/assign'
import type { Agent, GameState } from '../../domain/models'
import { AgentTabsContainer } from './AgentTabsContainer'
import { getAgentView } from './agentView'
import type { TabType } from './agentTabsModel'

function renderTabs(game: GameState, agentId: string) {
  const view = getAgentView(game, agentId)

  if (!view) {
    throw new Error(`Missing agent view for ${agentId}.`)
  }

  render(<AgentTabsContainer view={view} />)

  return view
}

function renderMultipleTabContainers(game: GameState, agentIds: string[]) {
  const views = agentIds.map((agentId) => {
    const view = getAgentView(game, agentId)

    if (!view) {
      throw new Error(`Missing agent view for ${agentId}.`)
    }

    return view
  })

  render(
    <>
      {views.map((view) => (
        <AgentTabsContainer key={view.agent.id} view={view} />
      ))}
    </>
  )

  return views
}

function getMetricValue(label: string) {
  const metricLabel = screen.getByText(new RegExp(`^${escapeRegExp(label)}$`, 'i'))
  const card = metricLabel.closest('div')

  if (!card) {
    throw new Error(`Missing metric card for ${label}.`)
  }

  const values = within(card).getAllByText((content, element) => {
    if (!element || element === metricLabel) {
      return false
    }

    return Boolean(content.trim())
  })

  return values.at(-1)?.textContent ?? ''
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildDetailedAgentGame() {
  const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
  const agent = game.agents[Object.keys(game.agents)[0]] as Agent
  const seededXp = getXpThresholdForLevel(4) + 20

  game.teams.t_nightwatch.agentIds = [agent.id]
  game.teams.t_nightwatch.assignedCaseId = 'case-001'
  game.agents[agent.id] = {
    ...agent,
    status: 'active',
    fatigue: 27,
    vitals: {
      health: 82,
      stress: 27,
      morale: 73,
      wounds: 14,
      statusFlags: ['scarred', 'exposed'],
    },
    identity: {
      name: agent.name,
      codename: 'NIGHTGLASS',
      callsign: 'NIGHTGLASS',
      age: 34,
      background: 'Former anti-smuggling task force lead.',
    },
    assignment: {
      state: 'training',
      startedWeek: game.week,
      trainingProgramId: 'core-analysis',
    },
    progression: {
      xp: seededXp,
      level: 4,
      potentialTier: 'B',
      growthProfile: 'steady',
      potentialIntel: {
        visibleTier: 'B',
        exactKnown: true,
        confidence: 'confirmed',
        discoveryProgress: 100,
        source: 'academy_record',
      },
      growthStats: {
        insight: 2,
        resilience: 1,
      },
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
      alliesWorkedWith: ['a_partner', 'a_handler'],
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
        {
          week: 4,
          eventType: 'agent.promoted',
          note: 'Level 4 certification complete',
          eventId: 'evt-2',
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
        {
          id: 'evt-hist-2',
          schemaVersion: 1,
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          timestamp: '2042-01-15T00:00:00.001Z',
          payload: {
            week: 4,
            agentId: agent.id,
            agentName: agent.name,
            xpAmount: 45,
            reason: 'case-resolution',
            totalXp: seededXp,
            level: 4,
            levelsGained: 0,
          },
        },
      ],
    },
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

  return { game, agentId: agent.id, seededXp }
}

function buildSparseAgentGame() {
  const game = createStartingState()
  const agent = game.agents.a_ava

  game.agents.a_ava = {
    ...agent,
    vitals: {
      ...(agent.vitals ?? {}),
      health: agent.vitals?.health ?? 100,
      stress: agent.vitals?.stress ?? agent.fatigue,
      morale: agent.vitals?.morale ?? 100,
      wounds: agent.vitals?.wounds ?? 0,
      statusFlags: [],
    },
    history: {
      counters: {
        assignmentsCompleted: 0,
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
        deployments: 0,
        totalContribution: 0,
        totalThreatHandled: 0,
        totalDamageTaken: 0,
        totalHealingPerformed: 0,
        totalEvidenceGathered: 0,
        totalContainmentActionsCompleted: 0,
        totalFieldPower: 0,
        totalContainment: 0,
        totalInvestigation: 0,
        totalSupport: 0,
        totalStressImpact: 0,
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

  return { game, agentId: agent.id }
}

describe('AgentTabsContainer', () => {
  it('renders scoped vitals, performance, morale, and history details for the improved panel', async () => {
    const user = userEvent.setup()
    const { game, agentId, seededXp } = buildDetailedAgentGame()
    const view = renderTabs(game, agentId)

    expect(screen.getByText(/live performance model/i)).toBeInTheDocument()
    expect(screen.queryByText(/event-linked logs/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/status flags/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /vitals/i }))

    expect(getMetricValue('Status')).toBe(view.agent.status)
    expect(getMetricValue('Health')).toBe(String(view.materialized.vitals.health))
    expect(screen.getByText(/scarred, exposed/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /stats/i }))

    expect(screen.getByText(/live performance model/i)).toBeInTheDocument()
    expect(screen.queryByText(/status flags/i)).not.toBeInTheDocument()
    expect(getMetricValue('Field power')).toBe(
      formatMetric(view.materialized.performance.fieldPower)
    )
    expect(getMetricValue('Containment')).toBe(
      formatMetric(view.materialized.performance.containment)
    )
    expect(getMetricValue('Investigation')).toBe(
      formatMetric(view.materialized.performance.investigation)
    )
    expect(getMetricValue('Support')).toBe(formatMetric(view.materialized.performance.support))
    expect(getMetricValue('Stress impact')).toBe(
      formatMetric(view.materialized.performance.stressImpact)
    )
    expect(getMetricValue('Contribution')).toBe(
      formatMetric(view.materialized.performance.contribution)
    )
    expect(getMetricValue('Threat handled')).toBe(
      formatMetric(view.materialized.performance.threatHandled)
    )
    expect(getMetricValue('Damage taken')).toBe(
      formatMetric(view.materialized.performance.damageTaken)
    )
    expect(getMetricValue('Healing / stabilization')).toBe(
      formatMetric(view.materialized.performance.healingPerformed)
    )
    expect(getMetricValue('Evidence gathered')).toBe(
      formatMetric(view.materialized.performance.evidenceGathered)
    )
    expect(getMetricValue('Containment actions')).toBe(
      formatMetric(view.materialized.performance.containmentActionsCompleted)
    )

    await user.click(screen.getByRole('tab', { name: /morale/i }))

    expect(
      screen.getByText(new RegExp(`Current fatigue: ${view.agent.fatigue}%`, 'i'))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`Current stress: ${view.materialized.vitals.stress}%`, 'i'))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`Level ${view.materialized.progression.level} operative`, 'i'))
    ).toBeInTheDocument()
    expect(screen.getByText(/steady profile\. Potential tier confirmed: B\./i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /history/i }))

    expect(getMetricValue('XP')).toBe(String(seededXp))
    expect(getMetricValue('Skill points')).toBe(
      String(view.materialized.progression.skillTree.skillPoints)
    )
    expect(screen.getByText(/growth profile: steady\./i)).toBeInTheDocument()
    expect(screen.getByText(/insight \+2 \/ resilience \+1/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${view.materialized.progression.xpIntoCurrentLevel}/${view.materialized.progression.xpToNextLevel} XP into the current level band`,
          'i'
        )
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `Next threshold at ${view.materialized.progression.nextLevelThresholdXp} total XP`,
          'i'
        )
      )
    ).toBeInTheDocument()
    expect(getMetricValue('Contribution total')).toBe(
      formatMetric(view.materialized.history.performanceStats.totalContribution)
    )
    expect(getMetricValue('Evidence total')).toBe(
      formatMetric(view.materialized.history.performanceStats.totalEvidenceGathered)
    )
    expect(screen.getByText(/a_partner, a_handler/i)).toBeInTheDocument()

    const latestTimelineEntry = screen.getByText(/level 4 certification complete/i)
    const earliestTimelineEntry = screen.getByText(/initial roster review/i)
    const latestLogEntry = screen.getByText('2042-01-15T00:00:00.001Z').closest('li')
    const earliestLogEntry = screen.getByText('2042-01-08T00:00:00.001Z').closest('li')

    if (!latestLogEntry || !earliestLogEntry) {
      throw new Error('Expected event-linked log list items to be present.')
    }

    expect(
      latestTimelineEntry.compareDocumentPosition(earliestTimelineEntry) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      latestLogEntry.compareDocumentPosition(earliestLogEntry) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('renders stable empty-state fallbacks for sparse agent detail history and vitals', async () => {
    const user = userEvent.setup()
    const { game, agentId } = buildSparseAgentGame()

    renderTabs(game, agentId)

    await user.click(screen.getByRole('tab', { name: /vitals/i }))
    expect(screen.getByText(/^none$/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /history/i }))

    expect(screen.getByText(/^none$/i)).toBeInTheDocument()
    expect(screen.getByText(/no history entries recorded yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no event-linked logs recorded yet/i)).toBeInTheDocument()
  })

  it('keeps exact stat caps hidden until potential intel is confirmed', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    const agent = game.agents.a_ava

    game.agents.a_ava = {
      ...agent,
      progression: {
        ...(agent.progression ?? {
          xp: 0,
          level: 1,
          potentialTier: 'A',
          growthProfile: 'steady',
        }),
        potentialTier: 'A',
        growthProfile: 'steady',
        potentialIntel: {
          visibleTier: 'B',
          exactKnown: false,
          confidence: 'medium',
          discoveryProgress: 45,
          source: 'recruitment_scout',
        },
      },
    }

    const view = renderTabs(game, 'a_ava')

    await user.click(screen.getByRole('tab', { name: /stats/i }))

    expect(view.materialized.progression.displayStatCaps).toBeUndefined()
    expect(view.materialized.progression.projectedStatCapRanges).toBeDefined()
    expect(screen.queryByText(/^Combat ceiling$/i)).not.toBeInTheDocument()
    expect(screen.getByText(/^Projected combat ceiling band$/i)).toBeInTheDocument()
    expect(getMetricValue('Projected combat ceiling band')).toMatch(/^\d{2,3}-\d{2,3}$/)
  })

  it('supports keyboard navigation and keeps tab semantics aligned with the active panel', async () => {
    const user = userEvent.setup()
    const { game, agentId } = buildDetailedAgentGame()

    renderTabs(game, agentId)

    const statsTab = screen.getByRole('tab', { name: /stats/i })
    const moraleTab = screen.getByRole('tab', { name: /morale/i })
    const historyTab = screen.getByRole('tab', { name: /history/i })
    const vitalsTab = screen.getByRole('tab', { name: /vitals/i })

    expect(statsTab).toHaveAttribute('aria-selected', 'true')
    expect(statsTab).toHaveAttribute('tabindex', '0')
    expect(moraleTab).toHaveAttribute('tabindex', '-1')

    statsTab.focus()
    await user.keyboard('{ArrowRight}')

    expect(moraleTab).toHaveFocus()
    expect(moraleTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      moraleTab.getAttribute('id') ?? ''
    )

    await user.keyboard('{End}')

    expect(historyTab).toHaveFocus()
    expect(historyTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/event-linked logs/i)).toBeInTheDocument()

    await user.keyboard('{Home}')

    expect(vitalsTab).toHaveFocus()
    expect(vitalsTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/status flags/i)).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')

    expect(historyTab).toHaveFocus()
    expect(historyTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/event-linked logs/i)).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')

    expect(vitalsTab).toHaveFocus()
    expect(vitalsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('generates unique tab and panel ids when multiple tab containers are rendered together', () => {
    const { game, agentId } = buildDetailedAgentGame()
    const secondAgentId = Object.keys(game.agents).find((id) => id !== agentId)

    if (!secondAgentId) {
      throw new Error('Expected a second agent in the game state for multi-instance testing.')
    }

    renderMultipleTabContainers(game, [agentId, secondAgentId])

    const tabs = screen.getAllByRole('tab')
    const panels = screen.getAllByRole('tabpanel')
    const tabIds = tabs.map((tab) => tab.getAttribute('id')).filter(Boolean)
    const panelIds = panels.map((panel) => panel.getAttribute('id')).filter(Boolean)

    expect(new Set(tabIds).size).toBe(tabIds.length)
    expect(new Set(panelIds).size).toBe(panelIds.length)
  })

  it('supports controlled mode and delegates tab changes to the parent callback', async () => {
    const user = userEvent.setup()
    const { game, agentId } = buildDetailedAgentGame()
    const view = getAgentView(game, agentId)

    if (!view) {
      throw new Error(`Missing agent view for ${agentId}.`)
    }

    const changes: TabType[] = []
    const { rerender } = render(
      <AgentTabsContainer
        view={view}
        activeTab="history"
        onTabChange={(tab) => changes.push(tab)}
      />
    )

    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/event-linked logs/i)).toBeInTheDocument()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /morale/i }))

    expect(changes).toEqual(['morale'])
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')

    rerender(
      <AgentTabsContainer view={view} activeTab="morale" onTabChange={(tab) => changes.push(tab)} />
    )

    expect(screen.getByRole('tab', { name: /morale/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/fatigue impact/i)).toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-live', 'polite')
  })

  it('keeps the active tab stable when the view prop updates during a rerender', async () => {
    const user = userEvent.setup()
    const { game, agentId } = buildDetailedAgentGame()
    const initialView = getAgentView(game, agentId)

    if (!initialView) {
      throw new Error(`Missing agent view for ${agentId}.`)
    }

    const { rerender } = render(<AgentTabsContainer view={initialView} />)

    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')

    const currentAgent = game.agents[agentId]!
    const currentHistory = currentAgent.history!

    game.agents[agentId] = {
      ...currentAgent,
      fatigue: 50,
      history: {
        ...currentHistory,
        casesCompleted: currentHistory.casesCompleted,
        trainingsDone: currentHistory.trainingsDone,
        bonds: { ...currentHistory.bonds },
        performanceStats: { ...currentHistory.performanceStats },
        alliesWorkedWith: [...currentHistory.alliesWorkedWith],
        timeline: [...currentHistory.timeline],
        logs: [...currentHistory.logs],
        counters: {
          ...currentHistory.counters,
          stressSustained: 21,
        },
      },
    }

    const updatedView = getAgentView(game, agentId)

    if (!updatedView) {
      throw new Error(`Missing updated agent view for ${agentId}.`)
    }

    rerender(<AgentTabsContainer view={updatedView} />)

    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/event-linked logs/i)).toBeInTheDocument()
    expect(getMetricValue('Stress sustained')).toBe('21')
  })

  it('supports swipe gestures on mobile to navigate tabs', async () => {
    const { game, agentId } = buildDetailedAgentGame()

    renderTabs(game, agentId)

    const tabRail = screen.getByRole('tablist')

    // Swipe left (move backward in tab order)
    fireEvent.touchStart(tabRail, {
      changedTouches: [{ screenX: 300, screenY: 100 }],
    })
    fireEvent.touchMove(tabRail, {
      changedTouches: [{ screenX: 150, screenY: 100 }],
    })
    fireEvent.touchEnd(tabRail, {
      changedTouches: [{ screenX: 150, screenY: 100 }],
    })

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /vitals/i })).toHaveAttribute('aria-selected', 'true')
    })

    // Swipe right (move forward in tab order)
    fireEvent.touchStart(tabRail, {
      changedTouches: [{ screenX: 150, screenY: 100 }],
    })
    fireEvent.touchMove(tabRail, {
      changedTouches: [{ screenX: 300, screenY: 100 }],
    })
    fireEvent.touchEnd(tabRail, {
      changedTouches: [{ screenX: 300, screenY: 100 }],
    })

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('provides granular ARIA labels and tab panel announcements', async () => {
    const { game, agentId } = buildDetailedAgentGame()

    renderTabs(game, agentId)

    const statsTrigger = screen.getByRole('tab', { name: /stats/i })
    expect(statsTrigger).toHaveAttribute('aria-label', expect.stringContaining('Stats'))
    expect(statsTrigger).toHaveAttribute('aria-label', expect.stringContaining('Contribution'))

    const tabPanel = screen.getByRole('tabpanel')
    expect(tabPanel).toHaveAttribute('aria-live', 'polite')
    expect(tabPanel).toHaveAttribute('aria-label', expect.stringContaining('panel content'))
  })

  it('handles rapid keyboard navigation without losing state', async () => {
    const user = userEvent.setup()
    const { game, agentId } = buildDetailedAgentGame()

    renderTabs(game, agentId)

    // Rapidly navigate forward through tabs multiple times
    for (let i = 0; i < 10; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Verify final state is valid (exactly one tab active)
    const activeTabs = screen.getAllByRole('tab', { selected: true })
    expect(activeTabs).toHaveLength(1)

    // Verify the active tab is one of the valid tabs
    const activeTabName = activeTabs[0]?.getAttribute('aria-label')
    expect(activeTabName).toMatch(/vitals|stats|morale|history/i)
  })
})
