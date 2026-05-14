import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { DOWNTIME_CARRY_IN_CALIBRATION, SIDE_WORK_CALIBRATION } from '../domain/sim/calibration'
import { computeDowntimeCarryInForAgent } from '../domain/sim/downtimeCarryIn'
import { setAgentPrimaryDowntimePlan } from '../domain/sim/downtimeSlot'
import {
  OFF_BOOKS_COURIER_LOCKOUT_TAG,
  canSelectOffBooksCourierSideWork,
  resolveOffBooksCourierSideWork,
} from '../domain/sim/downtimeSideWork'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import type { DowntimeActivity } from '../domain/sim/recoveryDowntime'
import { EXPOSURE_RESIDUE_STATUS_FLAG } from '../domain/sim/recoveryImpairments'

describe('SPE-1700 off-books courier side-work', () => {
  it('pays funding and adds exposure residue when fatigue is below the lockout threshold', () => {
    const agent = {
      id: 'a1',
      name: 'A',
      role: 'tech' as const,
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      relationships: {},
      fatigue: 40,
      status: 'active' as const,
    }
    const r = resolveOffBooksCourierSideWork(agent)
    expect(r.fundingDelta).toBe(SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta)
    expect(r.fatigueDelta).toBe(SIDE_WORK_CALIBRATION.offBooksCourierSuccessFatigueDelta)
    expect(r.applyExposureResidue).toBe(true)
    expect(r.applyLockoutTag).toBe(false)
  })

  it('applies lockout branch without payout when fatigue is already high', () => {
    const agent = {
      id: 'a1',
      name: 'A',
      role: 'tech' as const,
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      relationships: {},
      fatigue: SIDE_WORK_CALIBRATION.offBooksCourierHighFatigueThreshold,
      status: 'active' as const,
    }
    const r = resolveOffBooksCourierSideWork(agent)
    expect(r.fundingDelta).toBe(0)
    expect(r.fatigueDelta).toBe(SIDE_WORK_CALIBRATION.offBooksCourierLockoutFatigueDelta)
    expect(r.applyExposureResidue).toBe(false)
    expect(r.applyLockoutTag).toBe(true)
  })

  it('advanceRecoveryDowntimeForWeek grants agency funding on success and stamps last outcome', () => {
    const agents = {
      a1: {
        id: 'a1',
        name: 'A',
        role: 'tech' as const,
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: [],
        relationships: {},
        fatigue: 30,
        status: 'active' as const,
        vitals: {
          health: 100,
          stress: 0,
          morale: 50,
          wounds: 0,
          statusFlags: [] as string[],
        },
      },
    }
    const result = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: agents,
      sourceTeams: {},
      downtimeAssignments: { a1: 'sideWork' as DowntimeActivity },
    })
    expect(result.agencyFundingDelta).toBe(SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta)
    const updated = result.updatedAgents.a1!
    expect(updated.fatigue).toBe(30 + SIDE_WORK_CALIBRATION.offBooksCourierSuccessFatigueDelta)
    expect(updated.vitals?.statusFlags).toContain(EXPOSURE_RESIDUE_STATUS_FLAG)
    expect(updated.downtimeSideWorkLast?.outcome).toBe('paid')
    expect(result.eventDrafts.some((e) => e.type === 'staff.side_work.resolved')).toBe(true)
  })

  it('setAgentPrimaryDowntimePlan refuses sideWork when courier is locked out', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]!
    const agent = game.agents[agentId]!
    const locked: typeof agent = {
      ...agent,
      tags: [...agent.tags, OFF_BOOKS_COURIER_LOCKOUT_TAG],
      assignment: { state: 'idle' as const },
    }
    const g2 = { ...game, agents: { ...game.agents, [agentId]: locked } }
    expect(canSelectOffBooksCourierSideWork(locked)).toBe(false)
    const next = setAgentPrimaryDowntimePlan(g2, agentId, 'sideWork')
    expect(next.agents[agentId]?.downtimeActivity?.activity).not.toBe('sideWork')
  })

  it('computeDowntimeCarryInForAgent surfaces courier lockout readiness penalty', () => {
    const stamp = computeDowntimeCarryInForAgent(
      {
        id: 'x',
        name: 'X',
        role: 'tech',
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: [OFF_BOOKS_COURIER_LOCKOUT_TAG],
        relationships: {},
        fatigue: 50,
        status: 'active',
        downtimeActivity: { activity: 'rest', sinceWeek: 1 },
      },
      3
    )
    expect(stamp?.code).toBe('off-books-courier-lockout')
    expect(stamp?.readinessDelta).toBe(-DOWNTIME_CARRY_IN_CALIBRATION.offBooksCourierLockoutReadinessPenalty)
  })

  it('advanceWeek applies side-work resolution when courier is planned', () => {
    let state = createStartingState()
    const agentId = 'a_ava'
    state = setAgentPrimaryDowntimePlan(state, agentId, 'sideWork')
    expect(state.agents[agentId]?.downtimeActivity?.activity).toBe('sideWork')
    const next = advanceWeek(state)
    expect(next.agents[agentId]?.downtimeSideWorkLast?.outcome).toBe('paid')
    expect(next.agents[agentId]?.downtimeSideWorkLast?.fundingDelta).toBe(
      SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta
    )
    expect(next.agents[agentId]?.vitals?.statusFlags).toContain(EXPOSURE_RESIDUE_STATUS_FLAG)
  })
})
