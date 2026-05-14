import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { DOWNTIME_CARRY_IN_CALIBRATION, SIDE_WORK_CALIBRATION } from '../domain/sim/calibration'
import { computeDowntimeCarryInForAgent } from '../domain/sim/downtimeCarryIn'
import { setAgentPrimaryDowntimePlan, canSelectOffBooksCourierSideWork } from '../domain/sim/downtimeSlot'
import {
  OFF_BOOKS_COURIER_LOCKOUT_TAG,
  OFF_BOOKS_COURIER_PAID_PREREQ_TAG,
  canSelectTrustedCourierSideWork,
  getTrustedCourierPrimaryBlocker,
  isInactiveSideWorkResolution,
  resolveOffBooksCourierSideWork,
  resolveTrustedCourierSideWork,
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
    expect(updated.tags).toContain(OFF_BOOKS_COURIER_PAID_PREREQ_TAG)
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
    expect(next.agents[agentId]?.tags).toContain(OFF_BOOKS_COURIER_PAID_PREREQ_TAG)
    expect(next.agents[agentId]?.downtimeSideWorkLast?.fundingDelta).toBe(
      SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta
    )
    expect(next.agents[agentId]?.vitals?.statusFlags).toContain(EXPOSURE_RESIDUE_STATUS_FLAG)
  })

  it('isolates courier funding delta in paired advanceWeek runs (rest vs sideWork)', () => {
    const base = createStartingState()
    const withRest = setAgentPrimaryDowntimePlan(base, 'a_ava', 'rest')
    const withCourier = setAgentPrimaryDowntimePlan(base, 'a_ava', 'sideWork')
    const nextRest = advanceWeek(withRest)
    const nextCourier = advanceWeek(withCourier)
    const delta = SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta
    expect(nextCourier.funding - nextRest.funding).toBe(delta)
    expect((nextCourier.agency?.funding ?? 0) - (nextRest.agency?.funding ?? 0)).toBe(delta)
  })

  it('coerces persisted sideWork to rest when locked out and records denied outcome', () => {
    const agents = {
      a1: {
        id: 'a1',
        name: 'A',
        role: 'tech' as const,
        baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
        tags: [OFF_BOOKS_COURIER_LOCKOUT_TAG],
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
        downtimeActivity: { activity: 'sideWork' as const, sinceWeek: 1 },
      },
    }
    const result = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: agents,
      sourceTeams: {},
      downtimeAssignments: { a1: 'sideWork' as DowntimeActivity },
    })
    const updated = result.updatedAgents.a1!
    expect(updated.downtimeActivity?.activity).toBe('rest')
    expect(updated.downtimeSideWorkLast?.outcome).toBe('denied')
    expect(result.agencyFundingDelta).toBeUndefined()
    expect(result.eventDrafts.some((e) => e.type === 'staff.side_work.resolved')).toBe(false)
  })
})

describe('SPE-1702 trusted courier prerequisite gate', () => {
  it('resolveTrustedCourierSideWork is inactive without paid-courier prerequisite tag', () => {
    const agent = {
      id: 'a1',
      name: 'A',
      role: 'tech' as const,
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      relationships: {},
      fatigue: 30,
      status: 'active' as const,
    }
    expect(isInactiveSideWorkResolution(resolveTrustedCourierSideWork(agent))).toBe(true)
  })

  it('paid courier week stamps prerequisite tag and unlocks trusted selection', () => {
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
        assignment: { state: 'idle' as const },
      },
    }
    const afterCourier = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: agents,
      sourceTeams: {},
      downtimeAssignments: { a1: 'sideWork' as DowntimeActivity },
    })
    const u = afterCourier.updatedAgents.a1!
    expect(u.tags).toContain(OFF_BOOKS_COURIER_PAID_PREREQ_TAG)
    expect(canSelectTrustedCourierSideWork(u)).toBe(true)
    expect(getTrustedCourierPrimaryBlocker(u)).toBeNull()
  })

  it('trusted courier pays higher bounded funding than base courier when eligible', () => {
    const agent = {
      id: 'a1',
      name: 'A',
      role: 'tech' as const,
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [OFF_BOOKS_COURIER_PAID_PREREQ_TAG],
      relationships: {},
      fatigue: 40,
      status: 'active' as const,
    }
    const r = resolveTrustedCourierSideWork(agent)
    expect(r.fundingDelta).toBe(SIDE_WORK_CALIBRATION.trustedCourierSuccessFundingDelta)
    expect(r.fundingDelta).toBeGreaterThan(SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta)
    expect(r.fatigueDelta).toBe(SIDE_WORK_CALIBRATION.trustedCourierSuccessFatigueDelta)
    expect(r.applyExposureResidue).toBe(true)
  })

  it('setAgentPrimaryDowntimePlan refuses sideWorkTrusted without prerequisite tag', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]!
    const agent = game.agents[agentId]!
    const idle: typeof agent = { ...agent, assignment: { state: 'idle' as const } }
    const g2 = { ...game, agents: { ...game.agents, [agentId]: idle } }
    expect(canSelectTrustedCourierSideWork(idle)).toBe(false)
    expect(getTrustedCourierPrimaryBlocker(idle)).toBe('missing_paid_courier')
    const next = setAgentPrimaryDowntimePlan(g2, agentId, 'sideWorkTrusted')
    expect(next.agents[agentId]?.downtimeActivity?.activity).not.toBe('sideWorkTrusted')
  })

  it('setAgentPrimaryDowntimePlan refuses sideWorkTrusted when courier lockout is present', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]!
    const agent = game.agents[agentId]!
    const locked: typeof agent = {
      ...agent,
      tags: [...agent.tags, OFF_BOOKS_COURIER_LOCKOUT_TAG, OFF_BOOKS_COURIER_PAID_PREREQ_TAG],
      assignment: { state: 'idle' as const },
    }
    const g2 = { ...game, agents: { ...game.agents, [agentId]: locked } }
    expect(getTrustedCourierPrimaryBlocker(locked)).toBe('courier_lockout')
    const next = setAgentPrimaryDowntimePlan(g2, agentId, 'sideWorkTrusted')
    expect(next.agents[agentId]?.downtimeActivity?.activity).not.toBe('sideWorkTrusted')
  })

  it('coerces persisted sideWorkTrusted to rest when ineligible and records denied outcome', () => {
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
        downtimeActivity: { activity: 'sideWorkTrusted' as const, sinceWeek: 1 },
      },
    }
    const result = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: agents,
      sourceTeams: {},
      downtimeAssignments: { a1: 'sideWorkTrusted' as DowntimeActivity },
    })
    const updated = result.updatedAgents.a1!
    expect(updated.downtimeActivity?.activity).toBe('rest')
    expect(updated.downtimeSideWorkLast?.outcome).toBe('denied')
    expect(updated.downtimeSideWorkLast?.optionId).toBe('trustedCourier')
  })

  it('trusted courier lockout uses shared courier lockout tag at stricter fatigue threshold', () => {
    const agent = {
      id: 'a1',
      name: 'A',
      role: 'tech' as const,
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [OFF_BOOKS_COURIER_PAID_PREREQ_TAG],
      relationships: {},
      fatigue: SIDE_WORK_CALIBRATION.trustedCourierHighFatigueThreshold,
      status: 'active' as const,
    }
    const r = resolveTrustedCourierSideWork(agent)
    expect(r.applyLockoutTag).toBe(true)
    expect(r.fundingDelta).toBe(0)
  })
})
