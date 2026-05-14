import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { buildTeamDeploymentReadinessState } from '../domain/deploymentReadiness'
import { assignTeam, unassignTeam } from '../domain/sim/assign'
import { DOWNTIME_CARRY_IN_CALIBRATION } from '../domain/sim/calibration'
import {
  computeDowntimeCarryInForAgent,
  rebuildDeploymentCarryInForCase,
} from '../domain/sim/downtimeCarryIn'
import { EXPOSURE_RESIDUE_STATUS_FLAG } from '../domain/sim/recoveryImpairments'

describe('SPE-1701 downtime deployment carry-in', () => {
  it('computes negative carry-in when residue is present and therapy was foregone', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: [],
        relationships: {},
        fatigue: 40,
        status: 'active',
        downtimeActivity: {
          activity: 'rest',
          sinceWeek: 2,
          foregoneThisInterval: ['therapy', 'coping', 'other'],
        },
        vitals: { statusFlags: [EXPOSURE_RESIDUE_STATUS_FLAG] },
      },
      3
    )
    expect(stamp?.code).toBe('residue-therapy-foregone')
    expect(stamp?.readinessDelta).toBe(
      -DOWNTIME_CARRY_IN_CALIBRATION.residueTherapyForegoneReadinessPenalty
    )
  })

  it('computes positive carry-in for stable-energy rest week without residue', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: [],
        relationships: {},
        fatigue: 20,
        status: 'active',
        downtimeActivity: { activity: 'rest', sinceWeek: 2 },
        recoveryStatus: { state: 'healthy', sinceWeek: 1 },
        trauma: { traumaLevel: 0, traumaTags: [], lastEventWeek: 1 },
        energyBudget: {
          currentReserve: 88,
          reserveBand: 'stable',
          exertionDebt: 0,
          estimateConfidence: 'high',
        },
      },
      3
    )
    expect(stamp?.code).toBe('well-rested-stable-energy')
    expect(stamp?.readinessDelta).toBe(
      DOWNTIME_CARRY_IN_CALIBRATION.wellRestedStableEnergyReadinessBonus
    )
  })

  it('computes lockout carry-in when courier contact is burned', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: ['side-work-lockout:off-books-courier'],
        relationships: {},
        fatigue: 50,
        status: 'active',
        downtimeActivity: { activity: 'rest', sinceWeek: 2 },
      },
      3
    )
    expect(stamp?.code).toBe('off-books-courier-lockout')
    expect(stamp?.readinessDelta).toBe(
      -DOWNTIME_CARRY_IN_CALIBRATION.offBooksCourierLockoutReadinessPenalty
    )
  })

  it('prefers courier lockout carry-in over residue-therapy when both signals apply', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: ['side-work-lockout:off-books-courier'],
        relationships: {},
        fatigue: 40,
        status: 'active',
        downtimeActivity: {
          activity: 'rest',
          sinceWeek: 2,
          foregoneThisInterval: ['therapy', 'coping', 'other', 'sideWork', 'sideWorkTrusted'],
        },
        vitals: { statusFlags: [EXPOSURE_RESIDUE_STATUS_FLAG] },
      },
      3
    )
    expect(stamp?.code).toBe('off-books-courier-lockout')
  })

  it('courier lockout suppresses well-rested stable-energy carry-in', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: ['side-work-lockout:off-books-courier'],
        relationships: {},
        fatigue: 10,
        status: 'active',
        downtimeActivity: { activity: 'rest', sinceWeek: 2 },
        recoveryStatus: { state: 'healthy', sinceWeek: 1 },
        trauma: { traumaLevel: 0, traumaTags: [], lastEventWeek: 1 },
        energyBudget: {
          currentReserve: 90,
          reserveBand: 'stable',
          exertionDebt: 0,
          estimateConfidence: 'high',
        },
      },
      3
    )
    expect(stamp?.code).toBe('off-books-courier-lockout')
  })

  it('prefers negative carry-in when residue and foregone therapy would also satisfy rest bonus', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: [],
        relationships: {},
        fatigue: 10,
        status: 'active',
        downtimeActivity: {
          activity: 'rest',
          sinceWeek: 2,
          foregoneThisInterval: ['therapy'],
        },
        vitals: { statusFlags: [EXPOSURE_RESIDUE_STATUS_FLAG] },
        energyBudget: {
          currentReserve: 90,
          reserveBand: 'stable',
          exertionDebt: 0,
          estimateConfidence: 'high',
        },
      },
      3
    )
    expect(stamp?.code).toBe('residue-therapy-foregone')
  })

  it('stamps carry-in on assignTeam and rebuilds deterministically', () => {
    let state = createStartingState()
    const ids = ['a_ava', 'a_kellan', 'a_mina', 'a_rook'] as const
    const nextAgents = { ...state.agents }
    for (const id of ids) {
      const base = nextAgents[id]!
      nextAgents[id] = {
        ...base,
        downtimeActivity: {
          activity: 'rest',
          sinceWeek: 1,
          foregoneThisInterval: ['therapy', 'coping', 'other'],
        },
        vitals: {
          ...base.vitals,
          statusFlags: [...(base.vitals?.statusFlags ?? []), EXPOSURE_RESIDUE_STATUS_FLAG],
        },
      }
    }
    state = { ...state, agents: nextAgents }
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    const map = assigned.cases['case-001']?.deploymentCarryInByAgentId
    expect(map).toBeDefined()
    for (const id of ids) {
      expect(map?.[id]?.code).toBe('residue-therapy-foregone')
    }
    const again = assignTeam(assigned, 'case-001', 't_nightwatch')
    expect(again.cases['case-001']?.deploymentCarryInByAgentId).toEqual(map)
  })

  it('clears carry-in when last team unassigns to open', () => {
    let state = createStartingState()
    const agentId = 'a_ava'
    const base = state.agents[agentId]!
    state = {
      ...state,
      agents: {
        ...state.agents,
        [agentId]: {
          ...base,
          downtimeActivity: {
            activity: 'rest',
            sinceWeek: 1,
            foregoneThisInterval: ['therapy'],
          },
          vitals: {
            ...base.vitals,
            statusFlags: [...(base.vitals?.statusFlags ?? []), EXPOSURE_RESIDUE_STATUS_FLAG],
          },
        },
      },
    }
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    expect(assigned.cases['case-001']?.deploymentCarryInByAgentId?.[agentId]).toBeDefined()
    const open = unassignTeam(assigned, 'case-001', 't_nightwatch')
    expect(open.cases['case-001']?.deploymentCarryInByAgentId).toBeUndefined()
  })

  it('applies carry-in to readiness only on first in-contract week', () => {
    let state = createStartingState()
    const agentId = 'a_ava'
    const base = state.agents[agentId]!
    state = {
      ...state,
      agents: {
        ...state.agents,
        [agentId]: {
          ...base,
          downtimeActivity: {
            activity: 'rest',
            sinceWeek: 1,
            foregoneThisInterval: ['therapy'],
          },
          vitals: {
            ...base.vitals,
            statusFlags: [...(base.vitals?.statusFlags ?? []), EXPOSURE_RESIDUE_STATUS_FLAG],
          },
        },
      },
    }
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    const rFirst = buildTeamDeploymentReadinessState(assigned, 't_nightwatch')
    expect(rFirst.deploymentCarryInReadinessDelta).toBeLessThan(0)

    const laterWeek = {
      ...assigned,
      cases: {
        ...assigned.cases,
        'case-001': {
          ...assigned.cases['case-001']!,
          weeksRemaining: assigned.cases['case-001']!.durationWeeks - 1,
        },
      },
    }
    const rLater = buildTeamDeploymentReadinessState(laterWeek, 't_nightwatch')
    expect(rLater.deploymentCarryInReadinessDelta).toBeUndefined()
  })

  it('sums positive carry-in with a team-level cap', () => {
    let state = createStartingState()
    const ids = ['a_ava', 'a_kellan', 'a_mina', 'a_rook'] as const
    const nextAgents = { ...state.agents }
    for (const id of ids) {
      const base = nextAgents[id]!
      nextAgents[id] = {
        ...base,
        fatigue: 15,
        downtimeActivity: { activity: 'rest', sinceWeek: 1 },
        recoveryStatus: { state: 'healthy', sinceWeek: 1 },
        trauma: { traumaLevel: 0, traumaTags: [], lastEventWeek: 1 },
        energyBudget: {
          currentReserve: 90,
          reserveBand: 'stable',
          exertionDebt: 0,
          estimateConfidence: 'high',
        },
      }
    }
    state = { ...state, agents: nextAgents }
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    const readiness = buildTeamDeploymentReadinessState(assigned, 't_nightwatch')
    expect(readiness.deploymentCarryInReadinessDelta).toBe(
      DOWNTIME_CARRY_IN_CALIBRATION.teamReadinessDeltaCap
    )
  })

  it('rebuildDeploymentCarryInForCase returns undefined when case is not in progress', () => {
    const state = createStartingState()
    expect(rebuildDeploymentCarryInForCase(state, 'case-001')).toBeUndefined()
  })
})
