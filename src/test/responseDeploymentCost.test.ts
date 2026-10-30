import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { normalizeAgent } from '../domain/agent/normalize'
import {
  accumulateDeploymentCost,
  assessNextDeployment,
  createDeploymentCostRecord,
  createDeploymentCostRegistry,
  type DeploymentBurden,
  type DeploymentCostRecord,
} from '../domain/responseDeploymentCost'

const empty: DeploymentBurden = {
  payrollLoad: 0,
  gearConsumption: 0,
  moraleHit: 0,
  recoveryTicks: 0,
  inspectionDebt: 0,
}
const profile: DeploymentCostRecord = {
  id: 'mobile-team',
  routine: {
    payrollLoad: 10,
    gearConsumption: 2,
    moraleHit: 15,
    recoveryTicks: 1,
    inspectionDebt: 1,
  },
  high: { payrollLoad: 15, gearConsumption: 4, moraleHit: 25, recoveryTicks: 2, inspectionDebt: 2 },
}

describe('SPE-2272 deployment cost registry', () => {
  it('accumulates multiple dimensions deterministically without mutating inputs', () => {
    const before = structuredClone(profile)
    const first = accumulateDeploymentCost(profile, 'routine', empty)
    expect(first).toEqual(profile.routine)
    expect(accumulateDeploymentCost(profile, 'routine', first)).toEqual({
      payrollLoad: 20,
      gearConsumption: 4,
      moraleHit: 30,
      recoveryTicks: 2,
      inspectionDebt: 2,
    })
    expect(profile).toEqual(before)
    expect(empty).toEqual({
      payrollLoad: 0,
      gearConsumption: 0,
      moraleHit: 0,
      recoveryTicks: 0,
      inspectionDebt: 0,
    })
    expect(Object.isFrozen(first)).toBe(true)
  })

  it('makes high tempo consume gear and recovery faster than routine', () => {
    const routine = accumulateDeploymentCost(profile, 'routine', empty)
    const high = accumulateDeploymentCost(profile, 'high', empty)
    expect(high.gearConsumption).toBeGreaterThan(routine.gearConsumption)
    expect(high.recoveryTicks).toBeGreaterThan(routine.recoveryTicks)
  })

  it('requires lower tempo or resource recovery when caller-owned limits are exhausted', () => {
    const limits = { gearAvailable: 6, moraleAllowance: 60, recoveryCapacity: 3 }
    const afterHigh = accumulateDeploymentCost(profile, 'high', empty)
    expect(assessNextDeployment(profile, 'high', afterHigh, limits)).toEqual({
      allowed: false,
      shortages: ['gear', 'recovery'],
      lowerTempoAvailable: true,
    })
    const afterRoutine = accumulateDeploymentCost(profile, 'routine', afterHigh)
    expect(assessNextDeployment(profile, 'routine', afterRoutine, limits)).toEqual({
      allowed: false,
      shortages: ['gear', 'recovery'],
      lowerTempoAvailable: false,
    })
    expect(limits).toEqual({ gearAvailable: 6, moraleAllowance: 60, recoveryCapacity: 3 })
  })

  it('shows repeated deployment degradation through the existing readiness authority', () => {
    const initial = Object.values(createStartingState().agents)[0]!
    const agent = normalizeAgent({
      ...initial,
      status: 'active',
      fatigue: 0,
      assignment: { state: 'idle' },
      vitals: { ...initial.vitals!, morale: 100, wounds: 0 },
    })
    const first = accumulateDeploymentCost(profile, 'routine', empty)
    const third = accumulateDeploymentCost(
      profile,
      'routine',
      accumulateDeploymentCost(profile, 'routine', first)
    )
    const after = normalizeAgent({
      ...agent,
      vitals: { ...agent.vitals!, morale: 100 - third.moraleHit },
    })
    expect(agent.readinessProfile?.band).toBe('steady')
    expect(after.readinessProfile?.band).toBe('strained')
    expect(agent.vitals?.morale).toBe(100)
  })

  it('orders unique records and rejects malformed costs, identities, tempo and overflow', () => {
    expect(
      createDeploymentCostRegistry([
        { ...profile, id: 'z' },
        { ...profile, id: 'a' },
      ]).map((r) => r.id)
    ).toEqual(['a', 'z'])
    expect(() =>
      createDeploymentCostRegistry([profile, { ...profile, id: ' mobile-team ' }])
    ).toThrow(/duplicate/)
    expect(() =>
      createDeploymentCostRecord({ ...profile, routine: { ...profile.routine, payrollLoad: NaN } })
    ).toThrow()
    expect(() =>
      createDeploymentCostRecord({
        ...profile,
        high: { ...profile.high, gearConsumption: profile.routine.gearConsumption },
      })
    ).toThrow()
    expect(() =>
      createDeploymentCostRecord({ ...profile, routine: { ...empty, payrollLoad: 1 } })
    ).toThrow()
    expect(() => accumulateDeploymentCost(profile, 'other' as never, empty)).toThrow()
    expect(() =>
      accumulateDeploymentCost(profile, 'routine', { ...empty, payrollLoad: 1_000_000 })
    ).toThrow(/exceeds/)
    expect(() =>
      assessNextDeployment(profile, 'high', empty, {
        gearAvailable: -1,
        moraleAllowance: 5,
        recoveryCapacity: 2,
      })
    ).toThrow()
  })
})
