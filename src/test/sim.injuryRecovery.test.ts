import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'

function isolateCase(state: ReturnType<typeof createStartingState>, caseId: string) {
  return {
    ...state,
    cases: Object.fromEntries(
      Object.entries(state.cases).map(([id, currentCase]) => [
        id,
        id === caseId ? currentCase : { ...currentCase, status: 'resolved' as const },
      ])
    ),
  }
}

function createGuaranteedFailureState() {
  const base = createStartingState()
  const prepared = isolateCase(
    {
      ...base,
      agents: {
        ...base.agents,
        a_ava: {
          ...base.agents.a_ava,
          fatigue: 90,
        },
      },
      cases: {
        ...base.cases,
        'case-003': {
          ...base.cases['case-003']!,
          mode: 'threshold',
          weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
          difficulty: { combat: 999, investigation: 0, utility: 0, social: 0 },
          weeksRemaining: 1,
          stage: 3,
        },
      },
    },
    'case-003'
  )

  return assignTeam(prepared, 'case-003', 't_nightwatch')
}

describe('injury and recovery lifecycle', () => {
  it('marks high-fatigue failed agents as injured and emits an injury event', () => {
    const assigned = createGuaranteedFailureState()
    const next = advanceWeek(assigned)

    expect(next.reports[0].failedCases).toContain('case-003')
    expect(next.agents.a_ava.status).toBe('injured')
    expect(next.agents.a_ava.assignment).toMatchObject({
      state: 'recovery',
      teamId: 't_nightwatch',
      startedWeek: assigned.week,
    })
    expect(next.agents.a_ava.assignmentStatus).toMatchObject({
      state: 'recovering',
      teamId: 't_nightwatch',
    })
    expect(next.agents.a_ava.serviceRecord?.lastCaseWeek).toBe(assigned.week)
    expect(next.agents.a_ava.serviceRecord?.lastRecoveryWeek).toBe(assigned.week)
    expect(next.agents.a_ava.readinessProfile).toMatchObject({
      state: 'recovering',
      deploymentEligible: false,
      recoveryRequired: true,
    })
    expect(next.agents.a_ava.vitals?.statusFlags).toEqual(
      expect.arrayContaining(['injured', 'injury:moderate'])
    )
    expect(next.agents.a_ava.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'case.failed' }),
        expect.objectContaining({
          eventType: 'agent.injured',
          note: expect.stringContaining(assigned.cases['case-003']!.title),
        }),
        expect.objectContaining({
          eventType: 'progression.xp_gained',
          note: expect.stringContaining('+30 XP'),
        }),
      ])
    )
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'agent.injured',
          payload: expect.objectContaining({
            agentId: 'a_ava',
            severity: 'moderate',
          }),
        }),
      ])
    )
  })

  it('does not injure agents on successful resolution even with high fatigue', () => {
    const base = createStartingState()
    const assigned = assignTeam(
      isolateCase(
        {
          ...base,
          agents: {
            ...base.agents,
            a_ava: {
              ...base.agents.a_ava,
              fatigue: 90,
            },
          },
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
    expect(next.agents.a_ava.status).toBe('active')
    expect(next.events.some((event) => event.type === 'agent.injured')).toBe(false)
  })

  it('advances injured agents through recovering and back to active duty', () => {
    const injured = advanceWeek(createGuaranteedFailureState())
    const recoveryBase = {
      ...injured,
      gameOver: false,
      cases: Object.fromEntries(
        Object.entries(injured.cases).map(([id, currentCase]) => [
          id,
          { ...currentCase, status: 'resolved' as const, assignedTeamIds: [] },
        ])
      ),
    }

    const afterOneWeek = advanceWeek(recoveryBase)
    expect(afterOneWeek.agents.a_ava.status).toBe('recovering')
    expect(afterOneWeek.agents.a_ava.assignment).toMatchObject({ state: 'recovery' })
    expect(afterOneWeek.agents.a_ava.history?.counters.recoveryWeeks).toBe(1)
    expect(afterOneWeek.agents.a_ava.history?.timeline.at(-1)).toMatchObject({
      eventType: 'simulation.weekly_tick',
      note: expect.stringContaining('recovering'),
    })

    const afterTwoWeeks = advanceWeek({ ...afterOneWeek, gameOver: false })
    expect(afterTwoWeeks.agents.a_ava.status).toBe('recovering')
    expect(afterTwoWeeks.agents.a_ava.history?.counters.recoveryWeeks).toBe(2)

    const afterThreeWeeks = advanceWeek({ ...afterTwoWeeks, gameOver: false })
    expect(afterThreeWeeks.agents.a_ava.status).toBe('active')
    expect(afterThreeWeeks.agents.a_ava.assignment).toMatchObject({ state: 'idle' })
    expect(afterThreeWeeks.agents.a_ava.readinessProfile?.state).toBe('ready')
    expect(afterThreeWeeks.agents.a_ava.vitals?.statusFlags).not.toEqual(
      expect.arrayContaining(['injury:moderate'])
    )
    expect(afterThreeWeeks.agents.a_ava.history?.counters.recoveryWeeks).toBe(3)
    expect(afterThreeWeeks.agents.a_ava.history?.timeline.at(-1)).toMatchObject({
      eventType: 'simulation.weekly_tick',
      note: expect.stringContaining('active duty'),
    })
  })

  it('applies recovery-phase trait penalties to morale restoration', () => {
    const base = createStartingState()
    const recoveryBase = isolateCase(
      {
        ...base,
        week: 4,
        agents: {
          ...base.agents,
          a_ava: {
            ...base.agents.a_ava,
            status: 'recovering',
            traits: [
              {
                id: 'occult-scar',
                label: 'Occult Scar',
                description: 'Recovered from exposure, but morale restoration lags behind.',
                modifiers: {},
              },
            ],
            assignment: {
              state: 'recovery',
              teamId: 't_nightwatch',
              startedWeek: 2,
            },
            vitals: {
              ...(base.agents.a_ava.vitals ?? {
                health: 75,
                stress: base.agents.a_ava.fatigue,
                morale: 60,
                wounds: 10,
                statusFlags: [],
              }),
              morale: 60,
              wounds: 10,
              statusFlags: ['recovering', 'injury:minor'],
            },
          },
        },
      },
      'case-001'
    )

    const next = advanceWeek(recoveryBase)

    expect(next.agents.a_ava.status).toBe('active')
    expect(next.agents.a_ava.assignment).toMatchObject({ state: 'idle' })
    expect(next.agents.a_ava.vitals?.morale).toBe(65)
  })

  it('applies passive ability recovery bonuses through the weekly recovery path', () => {
    const base = createStartingState()
    const recoveryBase = isolateCase(
      {
        ...base,
        week: 4,
        agents: {
          ...base.agents,
          a_ava: {
            ...base.agents.a_ava,
            status: 'recovering',
            abilities: [
              {
                id: 'triage-rhythm',
                label: 'Triage Rhythm',
                type: 'passive',
                effect: {},
              },
            ],
            assignment: {
              state: 'recovery',
              teamId: 't_nightwatch',
              startedWeek: 2,
            },
            vitals: {
              ...(base.agents.a_ava.vitals ?? {
                health: 75,
                stress: base.agents.a_ava.fatigue,
                morale: 60,
                wounds: 10,
                statusFlags: [],
              }),
              morale: 60,
              wounds: 10,
              statusFlags: ['recovering', 'injury:minor'],
            },
          },
        },
      },
      'case-001'
    )

    const next = advanceWeek(recoveryBase)

    expect(next.agents.a_ava.status).toBe('active')
    expect(next.agents.a_ava.vitals?.morale).toBe(74)
  })

  it('does not add recovery-phase morale bonuses for generic passive support buffs', () => {
    const base = createStartingState()
    const baseRecoveryState = isolateCase(
      {
        ...base,
        week: 4,
        agents: {
          ...base.agents,
          a_ava: {
            ...base.agents.a_ava,
            status: 'recovering',
            abilities: [],
            assignment: {
              state: 'recovery',
              teamId: 't_nightwatch',
              startedWeek: 2,
            },
            vitals: {
              ...(base.agents.a_ava.vitals ?? {
                health: 75,
                stress: base.agents.a_ava.fatigue,
                morale: 60,
                wounds: 10,
                statusFlags: [],
              }),
              morale: 60,
              wounds: 10,
              statusFlags: ['recovering', 'injury:minor'],
            },
          },
        },
      },
      'case-001'
    )
    const passiveRecoveryState = {
      ...baseRecoveryState,
      agents: {
        ...baseRecoveryState.agents,
        a_ava: {
          ...baseRecoveryState.agents.a_ava,
          abilities: [
            {
              id: 'bedside-manner',
              label: 'Bedside Manner',
              type: 'passive' as const,
              effect: { presence: 4 },
            },
          ],
        },
      },
    }

    const baseline = advanceWeek(baseRecoveryState)
    const withGenericPassive = advanceWeek(passiveRecoveryState)

    expect(withGenericPassive.agents.a_ava.status).toBe('active')
    expect(withGenericPassive.agents.a_ava.vitals?.morale).toBe(
      baseline.agents.a_ava.vitals?.morale
    )
  })

  it('keeps recovering agents out of redeployment while allowing active teammates to deploy', () => {
    const injured = advanceWeek(createGuaranteedFailureState())
    const readyToRedeploy = {
      ...injured,
      gameOver: false,
      cases: {
        ...injured.cases,
        'case-002': {
          ...injured.cases['case-002']!,
          status: 'open' as const,
          assignedTeamIds: [],
          weeksRemaining: undefined,
        },
      },
    }

    const next = assignTeam(readyToRedeploy, 'case-002', 't_nightwatch')

    expect(next.cases['case-002'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(next.agents.a_ava.assignment).toMatchObject({ state: 'recovery' })
    expect(next.agents.a_kellan.assignment?.state).toBe('assigned')
  })

  it('blocks assignment when a team has no active members available', () => {
    const base = createStartingState()
    const inactiveTeamState = {
      ...base,
      agents: Object.fromEntries(
        Object.entries(base.agents).map(([agentId, agent]) => [
          agentId,
          base.teams.t_nightwatch.agentIds.includes(agentId)
            ? {
                ...agent,
                status: 'recovering' as const,
                assignment: {
                  state: 'recovery' as const,
                  teamId: 't_nightwatch',
                  startedWeek: base.week,
                },
              }
            : agent,
        ])
      ),
    }

    const next = assignTeam(inactiveTeamState, 'case-001', 't_nightwatch')

    expect(next.cases['case-001'].assignedTeamIds).toEqual([])
    expect(next.cases['case-001'].status).toBe('open')
  })
})
