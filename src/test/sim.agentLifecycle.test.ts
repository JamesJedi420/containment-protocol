import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createDefaultAgentHistory } from '../domain/agentDefaults'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam, unassignTeam } from '../domain/sim/assign'
import {
  getXpThresholdForLevel,
  getXpThresholdForMaxLevel,
  PROGRESSION_MAX_LEVEL,
} from '../domain/progression'
import { computeTeamScore } from '../domain/sim/scoring'

// ─── Assignment state transitions ────────────────────────────────────────────

describe('assignTeam – agent assignment state', () => {
  it('sets agent.assignment to "assigned" for every agent in the newly assigned team', () => {
    const state = createStartingState()
    const next = assignTeam(state, 'case-001', 't_nightwatch')

    for (const agentId of state.teams['t_nightwatch'].agentIds) {
      expect(next.agents[agentId]?.assignment).toMatchObject({
        state: 'assigned',
        caseId: 'case-001',
        teamId: 't_nightwatch',
        startedWeek: state.week,
      })
      expect(next.agents[agentId]?.assignmentStatus).toMatchObject({
        state: 'assigned',
        caseId: 'case-001',
        teamId: 't_nightwatch',
        startedWeek: state.week,
      })
    }
  })

  it('records startedWeek from the current game week', () => {
    const state = createStartingState()
    state.week = 7
    const next = assignTeam(state, 'case-001', 't_nightwatch')

    const firstAgentId = state.teams['t_nightwatch'].agentIds[0]!
    expect(next.agents[firstAgentId]?.assignment?.startedWeek).toBe(7)
  })

  it('sets replaced team agents back to "idle" when a standard case is reassigned', () => {
    const withAlpha = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const withBravo = assignTeam(withAlpha, 'case-001', 't_greentape')

    for (const agentId of withAlpha.teams['t_nightwatch'].agentIds) {
      expect(withBravo.agents[agentId]?.assignment?.state).toBe('idle')
    }
    for (const agentId of withAlpha.teams['t_greentape'].agentIds) {
      expect(withBravo.agents[agentId]?.assignment?.state).toBe('assigned')
    }
  })

  it('does not override agents whose assignment is "training"', () => {
    const state = createStartingState()
    const firstAgentId = state.teams['t_nightwatch'].agentIds[0]!
    state.agents[firstAgentId] = {
      ...state.agents[firstAgentId]!,
      assignment: { state: 'training', startedWeek: 1 },
    }

    const next = assignTeam(state, 'case-001', 't_nightwatch')

    expect(next).not.toBe(state)
    expect(next.agents[firstAgentId]?.assignment?.state).toBe('training')
    expect(next.teams['t_nightwatch']?.derivedStats?.overall ?? 0).toBeGreaterThan(0)
  })
})

describe('unassignTeam – agent assignment state', () => {
  it('sets agent.assignment to "idle" for every agent in the unassigned team', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const released = unassignTeam(assigned, 'case-001', 't_nightwatch')

    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      expect(released.agents[agentId]?.assignment?.state).toBe('idle')
      expect(released.agents[agentId]?.assignmentStatus).toMatchObject({
        state: 'idle',
        teamId: null,
      })
    }
  })

  it('only clears agents whose assignment matches the case being removed', () => {
    const withAlpha = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const withBoth = assignTeam(withAlpha, 'case-002', 't_greentape')
    const released = unassignTeam(withBoth, 'case-001', 't_nightwatch')

    for (const agentId of withBoth.teams['t_nightwatch'].agentIds) {
      expect(released.agents[agentId]?.assignment?.state).toBe('idle')
    }
    for (const agentId of withBoth.teams['t_greentape'].agentIds) {
      expect(released.agents[agentId]?.assignment?.state).toBe('assigned')
    }
  })
})

// ─── History counters & XP after weekly resolution ───────────────────────────

/** Force all non-target cases to resolved so they don't interfere */
function isolateCase(state: ReturnType<typeof createStartingState>, caseId: string) {
  return {
    ...state,
    cases: Object.fromEntries(
      Object.entries(state.cases).map(([id, c]) => [
        id,
        id === caseId ? c : { ...c, status: 'resolved' as const },
      ])
    ),
  }
}

describe('advanceWeek – agent history and XP after resolution', () => {
  it('sets assignment state to "idle" and increments casesResolved + assignmentsCompleted on success', () => {
    const base = createStartingState()
    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-001': {
              ...base.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    expect(next.reports[0].resolvedCases).toContain('case-001')

    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      const agent = next.agents[agentId]
      expect(agent?.assignment?.state).toBe('idle')
      expect(agent?.assignmentStatus).toMatchObject({ state: 'idle', teamId: null })
      expect(agent?.history?.counters.casesResolved).toBe(1)
      expect(agent?.history?.counters.assignmentsCompleted).toBe(1)
      expect(agent?.history?.counters.casesFailed).toBe(0)
      expect(agent?.history?.counters.casesPartiallyResolved).toBe(0)
      expect(agent?.history?.timeline).toContainEqual(
        expect.objectContaining({
          week: assigned.week,
          eventType: 'case.resolved',
          note: expect.stringContaining(base.cases['case-001']!.title),
        })
      )
    }
  })

  it('adds XP_GAIN_SUCCESS (150) to agent progression on case success', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const startXp = base.agents[firstAgentId]?.progression?.xp ?? 0

    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-001': {
              ...base.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    expect(next.agents[firstAgentId]?.progression?.xp).toBe(startXp + 150)
  })

  it('increments casesFailed + assignmentsCompleted on fail and adds XP_GAIN_FAIL (30)', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const startXp = base.agents[firstAgentId]?.progression?.xp ?? 0

    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-003': {
              ...base.cases['case-003']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 999, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-003'
      ),
      'case-003',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    expect(next.reports[0].failedCases).toContain('case-003')

    const agent = next.agents[firstAgentId]
    expect(agent?.assignment?.state).toBe('idle')
    expect(agent?.history?.counters.casesFailed).toBe(1)
    expect(agent?.history?.counters.assignmentsCompleted).toBe(1)
    expect(agent?.history?.counters.casesResolved).toBe(0)
    expect(agent?.history?.timeline).toContainEqual(
      expect.objectContaining({
        week: assigned.week,
        eventType: 'case.failed',
        note: expect.stringContaining(base.cases['case-003']!.title),
      })
    )
    expect(agent?.progression?.xp).toBe(startXp + 30)
  })

  it('increments casesPartiallyResolved + assignmentsCompleted on partial and adds XP_GAIN_PARTIAL (75)', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const startXp = base.agents[firstAgentId]?.progression?.xp ?? 0

    const partialBase = {
      ...base,
      config: { ...base.config, partialMargin: 20_000 },
    }

    const assigned = assignTeam(
      isolateCase(
        {
          ...partialBase,
          cases: {
            ...partialBase.cases,
            'case-001': {
              ...partialBase.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 200, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )
    const calibratedPartialScore = computeTeamScore(
      assigned.teams['t_nightwatch'].agentIds.map((agentId) => assigned.agents[agentId]!),
      assigned.cases['case-001']
    )

    assigned.rngSeed = 42
    assigned.rngState = 42
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      difficulty: {
        combat: Math.ceil(calibratedPartialScore.score + 1),
        investigation: 0,
        utility: 0,
        social: 0,
      },
    }

    const next = advanceWeek(assigned)

    expect(next.reports[0].partialCases).toContain('case-001')

    const agent = next.agents[firstAgentId]
    expect(agent?.assignment?.state).toBe('idle')
    expect(agent?.history?.counters.casesPartiallyResolved).toBe(1)
    expect(agent?.history?.counters.assignmentsCompleted).toBe(1)
    expect(agent?.history?.counters.casesResolved).toBe(0)
    expect(agent?.history?.counters.casesFailed).toBe(0)
    expect(agent?.history?.timeline).toContainEqual(
      expect.objectContaining({
        week: assigned.week,
        eventType: 'case.partially_resolved',
        note: expect.stringContaining(partialBase.cases['case-001']!.title),
      })
    )
    expect(agent?.progression?.xp).toBe(startXp + 75)
  })

  it('accumulates XP across multiple resolved cases in different weeks', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const startXp = base.agents[firstAgentId]?.progression?.xp ?? 0

    // Week 1 – forced success on case-001
    const state1 = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-001': {
              ...base.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )
    const afterWeek1 = advanceWeek(state1)

    expect(afterWeek1.reports.at(-1)?.resolvedCases).toContain('case-001')
    expect(afterWeek1.agents[firstAgentId]?.progression?.xp).toBe(startXp + 150)
    expect(afterWeek1.agents[firstAgentId]?.history?.counters.casesResolved).toBe(1)
    expect(afterWeek1.agents[firstAgentId]?.history?.counters.assignmentsCompleted).toBe(1)
    expect(afterWeek1.agents[firstAgentId]?.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          week: state1.week,
          eventType: 'assignment.team_assigned',
        }),
        expect.objectContaining({
          week: state1.week,
          eventType: 'case.resolved',
          note: expect.stringContaining(state1.cases['case-001']!.title),
        }),
        expect.objectContaining({
          week: state1.week,
          eventType: 'progression.xp_gained',
          note: expect.stringContaining('+150 XP'),
        }),
      ])
    )

    // Week 2 – forced success on case-002.
    // Reset gameOver: isolateCase forces allResolved=true after week 1 which sets gameOver=true.
    const state2 = assignTeam(
      {
        ...afterWeek1,
        gameOver: false,
        cases: {
          ...afterWeek1.cases,
          'case-002': {
            ...afterWeek1.cases['case-002']!,
            status: 'open',
            mode: 'threshold',
            weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
            difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
            weeksRemaining: 1,
          },
        },
      },
      'case-002',
      't_nightwatch'
    )
    const afterWeek2 = advanceWeek(state2)

    expect(afterWeek2.reports.at(-1)?.resolvedCases).toContain('case-002')
    expect(afterWeek2.agents[firstAgentId]?.progression?.xp).toBe(startXp + 150 + 150)
    expect(afterWeek2.agents[firstAgentId]?.history?.counters.casesResolved).toBe(2)
    expect(afterWeek2.agents[firstAgentId]?.history?.counters.assignmentsCompleted).toBe(2)
    expect(afterWeek2.agents[firstAgentId]?.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          week: state1.week,
          eventType: 'assignment.team_assigned',
        }),
        expect.objectContaining({
          week: state1.week,
          eventType: 'case.resolved',
          note: expect.stringContaining(state1.cases['case-001']!.title),
        }),
        expect.objectContaining({
          week: state2.week,
          eventType: 'assignment.team_assigned',
        }),
        expect.objectContaining({
          week: state2.week,
          eventType: 'case.resolved',
          note: expect.stringContaining(state2.cases['case-002']!.title),
        }),
        expect.objectContaining({
          week: state2.week,
          eventType: 'simulation.weekly_tick',
          note: 'Reached level 2.',
        }),
      ])
    )
  })

  it('levels an agent up when weekly mission xp crosses the next threshold', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const leveledBase = {
      ...base,
      agents: {
        ...base.agents,
        [firstAgentId]: {
          ...base.agents[firstAgentId]!,
          level: 1,
          progression: {
            ...(base.agents[firstAgentId]!.progression ?? {
              xp: 0,
              level: 1,
              potentialTier: 'C' as const,
              growthProfile: 'balanced',
            }),
            xp: getXpThresholdForLevel(2) - 50,
            level: 1,
          },
        },
      },
    }

    const assigned = assignTeam(
      isolateCase(
        {
          ...leveledBase,
          cases: {
            ...leveledBase.cases,
            'case-001': {
              ...leveledBase.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    expect(next.agents[firstAgentId]?.progression?.level).toBe(2)
    expect(next.agents[firstAgentId]?.level).toBe(2)
    expect(next.agents[firstAgentId]?.progression?.skillTree?.skillPoints).toBe(1)
    expect(next.agents[firstAgentId]?.history?.timeline).toContainEqual(
      expect.objectContaining({
        week: leveledBase.week,
        eventType: 'simulation.weekly_tick',
        note: 'Reached level 2.',
      })
    )
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'agent.promoted',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: leveledBase.week,
            agentId: firstAgentId,
            agentName: leveledBase.agents[firstAgentId]?.name,
            newRole: leveledBase.agents[firstAgentId]?.role,
            previousLevel: 1,
            newLevel: 2,
            levelsGained: 1,
            skillPointsGranted: 1,
          }),
        }),
      ])
    )
  })

  it('does not emit agent.promoted when mission xp does not cross a level threshold', () => {
    const base = createStartingState()
    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-001': {
              ...base.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    expect(next.events.some((event) => event.type === 'agent.promoted')).toBe(false)
  })

  it('does not promote beyond PROGRESSION_MAX_LEVEL even when weekly xp is gained', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const cappedBase = {
      ...base,
      agents: {
        ...base.agents,
        [firstAgentId]: {
          ...base.agents[firstAgentId]!,
          level: PROGRESSION_MAX_LEVEL,
          progression: {
            ...(base.agents[firstAgentId]!.progression ?? {
              xp: 0,
              level: 1,
              potentialTier: 'C' as const,
              growthProfile: 'balanced',
            }),
            xp: getXpThresholdForMaxLevel(),
            level: PROGRESSION_MAX_LEVEL,
            skillTree: {
              ...base.agents[firstAgentId]!.progression?.skillTree,
              skillPoints: 7,
              trainedRelationships:
                base.agents[firstAgentId]!.progression?.skillTree?.trainedRelationships ?? {},
            },
          },
        },
      },
    }

    const assigned = assignTeam(
      isolateCase(
        {
          ...cappedBase,
          cases: {
            ...cappedBase.cases,
            'case-001': {
              ...cappedBase.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)
    const updatedAgent = next.agents[firstAgentId]!
    const xpGainEvent = next.events.find(
      (event) => event.type === 'progression.xp_gained' && event.payload.agentId === firstAgentId
    )

    expect(updatedAgent.progression?.level).toBe(PROGRESSION_MAX_LEVEL)
    expect(updatedAgent.level).toBe(PROGRESSION_MAX_LEVEL)
    expect(updatedAgent.progression?.skillTree?.skillPoints).toBe(7)
    expect(next.events.some((event) => event.type === 'agent.promoted')).toBe(false)
    expect(xpGainEvent).toMatchObject(
      expect.objectContaining({
        type: 'progression.xp_gained',
        payload: expect.objectContaining({
          levelsGained: 0,
          level: PROGRESSION_MAX_LEVEL,
        }),
      })
    )
  })
})

// ─── Agent XP gain timeline entries ────────────────────────────────────────

describe('advanceWeek – agent XP gain timeline entries', () => {
  it('adds progression.xp_gained entry on case success', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!

    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-001': {
              ...base.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    const agent = next.agents[firstAgentId]!
    const xpGainEntry = agent.history?.timeline.find(
      (entry) => entry.eventType === 'progression.xp_gained'
    )
    expect(xpGainEntry).toBeDefined()
    expect(xpGainEntry?.note).toContain('Case')
    expect(xpGainEntry?.note).toContain('resolved')
    expect(xpGainEntry?.note).toContain('+150 XP')
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: assigned.week,
            agentId: firstAgentId,
            agentName: agent.name,
            xpAmount: 150,
            totalXp: agent.progression?.xp,
            level: agent.progression?.level,
            levelsGained: 0,
          }),
        }),
      ])
    )
  })

  it('adds progression.xp_gained entry on case partial resolution', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!

    const partialBase = {
      ...base,
      config: { ...base.config, partialMargin: 20_000 },
    }

    const assigned = assignTeam(
      isolateCase(
        {
          ...partialBase,
          cases: {
            ...partialBase.cases,
            'case-001': {
              ...partialBase.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 200, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const calibratedPartialScore = computeTeamScore(
      assigned.teams['t_nightwatch'].agentIds.map((agentId) => assigned.agents[agentId]!),
      assigned.cases['case-001']
    )

    assigned.rngSeed = 42
    assigned.rngState = 42
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      difficulty: {
        combat: Math.ceil(calibratedPartialScore.score + 1),
        investigation: 0,
        utility: 0,
        social: 0,
      },
    }

    const next = advanceWeek(assigned)

    const agent = next.agents[firstAgentId]!
    const xpGainEntry = agent.history?.timeline.find(
      (entry) => entry.eventType === 'progression.xp_gained'
    )
    expect(xpGainEntry).toBeDefined()
    expect(xpGainEntry?.note).toContain('Case')
    expect(xpGainEntry?.note).toContain('partially resolved')
    expect(xpGainEntry?.note).toContain('+75 XP')
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: assigned.week,
            agentId: firstAgentId,
            xpAmount: 75,
            totalXp: agent.progression?.xp,
            level: agent.progression?.level,
            levelsGained: 0,
          }),
        }),
      ])
    )
  })

  it('adds progression.xp_gained entry on case failure', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!

    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-003': {
              ...base.cases['case-003']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 999, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-003'
      ),
      'case-003',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    const agent = next.agents[firstAgentId]!
    const xpGainEntry = agent.history?.timeline.find(
      (entry) => entry.eventType === 'progression.xp_gained'
    )
    expect(xpGainEntry).toBeDefined()
    expect(xpGainEntry?.note).toContain('Case')
    expect(xpGainEntry?.note).toContain('failed')
    expect(xpGainEntry?.note).toContain('+30 XP')
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: assigned.week,
            agentId: firstAgentId,
            xpAmount: 30,
            totalXp: agent.progression?.xp,
            level: agent.progression?.level,
            levelsGained: 0,
          }),
        }),
      ])
    )
  })

  it('keeps xp history aligned with promotion events when a case crosses a level threshold', () => {
    const base = createStartingState()
    const firstAgentId = base.teams['t_nightwatch'].agentIds[0]!
    const leveledBase = {
      ...base,
      agents: {
        ...base.agents,
        [firstAgentId]: {
          ...base.agents[firstAgentId]!,
          level: 1,
          progression: {
            ...(base.agents[firstAgentId]!.progression ?? {
              xp: 0,
              level: 1,
              potentialTier: 'C' as const,
              growthProfile: 'balanced',
            }),
            xp: getXpThresholdForLevel(2) - 20,
            level: 1,
          },
        },
      },
    }

    const assigned = assignTeam(
      isolateCase(
        {
          ...leveledBase,
          cases: {
            ...leveledBase.cases,
            'case-001': {
              ...leveledBase.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)
    const agent = next.agents[firstAgentId]!
    const promotedEvents = next.events.filter((event) => event.type === 'agent.promoted')

    expect(agent.progression?.level).toBe(2)
    expect(agent.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          week: leveledBase.week,
          eventType: 'progression.xp_gained',
          note: expect.stringContaining('+150 XP'),
        }),
        expect.objectContaining({
          week: leveledBase.week,
          eventType: 'simulation.weekly_tick',
          note: 'Reached level 2.',
        }),
      ])
    )
    expect(promotedEvents).toHaveLength(1)
    expect(promotedEvents[0]).toMatchObject({
      type: 'agent.promoted',
      sourceSystem: 'agent',
      payload: expect.objectContaining({
        week: leveledBase.week,
        agentId: firstAgentId,
        agentName: base.agents[firstAgentId]!.name,
        previousLevel: 1,
        newLevel: 2,
        levelsGained: 1,
        skillPointsGranted: 1,
      }),
    })
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: leveledBase.week,
            agentId: firstAgentId,
            xpAmount: 150,
            totalXp: agent.progression?.xp,
            level: 2,
            levelsGained: 1,
          }),
        }),
      ])
    )
  })
})

// ─── Agent history timeline population (assign/unassign/resolve) ────────────

describe('assignTeam – agent history timeline population', () => {
  it('adds assignment.team_assigned entry to each agent in the assigned team', () => {
    const state = createStartingState()

    const next = assignTeam(state, 'case-001', 't_nightwatch')

    for (const agentId of state.teams['t_nightwatch'].agentIds) {
      const agent = next.agents[agentId]
      expect(agent?.history?.timeline).toContainEqual(
        expect.objectContaining({
          week: state.week,
          eventType: 'assignment.team_assigned',
          note: expect.stringContaining(state.cases['case-001']!.title),
        })
      )
    }
  })

  it('preserves existing timeline entries when adding assignment entry', () => {
    const state = createStartingState()
    const agentId = state.teams['t_nightwatch'].agentIds[0]!

    // Manually add an existing history entry
    state.agents[agentId] = {
      ...state.agents[agentId]!,
      history: {
        ...createDefaultAgentHistory(),
        timeline: [{ week: state.week - 1, eventType: 'agent.hired' as const, note: 'Hired' }],
      },
    }

    const next = assignTeam(state, 'case-001', 't_nightwatch')

    const agent = next.agents[agentId]
    expect(agent?.history?.timeline).toHaveLength(2)
    expect(agent?.history?.timeline[0]).toMatchObject({
      eventType: 'agent.hired',
    })
    expect(agent?.history?.timeline[1]).toMatchObject({
      eventType: 'assignment.team_assigned',
      note: expect.stringContaining(state.cases['case-001']!.title),
    })
  })
})

describe('unassignTeam – agent history timeline population', () => {
  it('adds assignment.team_unassigned entry to each agent in the unassigned team', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

    const released = unassignTeam(assigned, 'case-001', 't_nightwatch')

    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      const agent = released.agents[agentId]
      const unassignEntry = agent?.history?.timeline.find(
        (entry) => entry.eventType === 'assignment.team_unassigned'
      )
      expect(unassignEntry).toBeDefined()
      expect(unassignEntry?.note).toContain(assigned.cases['case-001']!.title)
    }
  })

  it('records week and case title in unassignment entry', () => {
    const state = createStartingState()
    state.week = 5
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    const agentId = state.teams['t_nightwatch'].agentIds[0]!

    const released = unassignTeam(assigned, 'case-001', 't_nightwatch')

    const unassignEntry = released.agents[agentId]?.history?.timeline.find(
      (entry) => entry.eventType === 'assignment.team_unassigned'
    )
    expect(unassignEntry).toMatchObject({
      week: 5,
      eventType: 'assignment.team_unassigned',
      note: expect.stringContaining(state.cases['case-001']!.title),
    })
  })
})

describe('advanceWeek – agent history timeline for case resolution', () => {
  it('adds case.resolved entry to timeline when case succeeds', () => {
    const base = createStartingState()
    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-001': {
              ...base.cases['case-001']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-001'
      ),
      'case-001',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      const agent = next.agents[agentId]
      const resolvedEntry = agent?.history?.timeline.find(
        (entry) => entry.eventType === 'case.resolved'
      )
      expect(resolvedEntry).toBeDefined()
      expect(resolvedEntry?.note).toContain(base.cases['case-001']!.title)
    }
  })

  it('adds case.failed entry to timeline when case fails', () => {
    const base = createStartingState()
    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          cases: {
            ...base.cases,
            'case-003': {
              ...base.cases['case-003']!,
              mode: 'threshold',
              weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
              difficulty: { combat: 999, investigation: 0, utility: 0, social: 0 },
              weeksRemaining: 1,
            },
          },
        },
        'case-003'
      ),
      'case-003',
      't_nightwatch'
    )

    const next = advanceWeek(assigned)

    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      const agent = next.agents[agentId]
      const failedEntry = agent?.history?.timeline.find(
        (entry) => entry.eventType === 'case.failed'
      )
      expect(failedEntry).toBeDefined()
      expect(failedEntry?.note).toContain(base.cases['case-003']!.title)
    }
  })
})
