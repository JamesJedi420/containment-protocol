// SPE-110: Construction progress, logistics, and interference tests.
import { describe, it, expect } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  advanceCaseConstructionClock,
  CONSTRUCTION_INCOMPLETE_FLAG,
  CONSTRUCTION_PROGRESS_MAX,
  CONSTRUCTION_READINESS_PENALTY,
  evaluateConstructionLogisticsBonus,
  evaluateConstructionReadinessBurden,
  getConstructionProgressClockId,
  isCaseUnderConstruction,
  isConstructionComplete,
} from '../domain/constructionProgress'
import { advanceDefinedProgressClock, readProgressClock } from '../domain/progressClocks'
import { buildTeamDeploymentReadinessState } from '../domain/deploymentReadiness'
import { buildFactionStates } from '../domain/factions'
import { evaluateThresholdCourtProxyConflict } from '../domain/proxyConflict'

// Helper: build a minimal case under construction (has spatialFlags, deadline > 0)
function buildConstructionCase(id: string, overrides: Record<string, unknown> = {}) {
  const state = createStartingState()
  const base = state.cases['case-001']!
  return {
    ...base,
    id,
    title: `Test Site ${id}`,
    spatialFlags: ['ingress:service_door'],
    deadlineRemaining: 4,
    ...overrides,
  }
}

describe('construction progress — clock helpers', () => {
  it('getConstructionProgressClockId returns a deterministic per-case ID', () => {
    expect(getConstructionProgressClockId('case-abc')).toBe('construction.site.case-abc.progress')
    expect(getConstructionProgressClockId('case-abc')).toBe(
      getConstructionProgressClockId('case-abc')
    )
  })

  it('isCaseUnderConstruction returns true for cases with spatialFlags and active deadline', () => {
    const currentCase = buildConstructionCase('c-test')
    expect(isCaseUnderConstruction(currentCase as Parameters<typeof isCaseUnderConstruction>[0])).toBe(true)
  })

  it('isCaseUnderConstruction returns false when spatialFlags is empty', () => {
    const currentCase = buildConstructionCase('c-test', { spatialFlags: [] })
    expect(isCaseUnderConstruction(currentCase as Parameters<typeof isCaseUnderConstruction>[0])).toBe(false)
  })

  it('isCaseUnderConstruction returns false when deadline expired', () => {
    const currentCase = buildConstructionCase('c-test', { deadlineRemaining: 0 })
    expect(isCaseUnderConstruction(currentCase as Parameters<typeof isCaseUnderConstruction>[0])).toBe(false)
  })
})

describe('construction progress — logistics bonus', () => {
  it('returns +1 when total inventory stock is >= 3', () => {
    const state = createStartingState()
    const totalStock = Object.values(state.inventory).reduce((s, q) => s + q, 0)
    if (totalStock >= 3) {
      expect(evaluateConstructionLogisticsBonus(state)).toBe(1)
    } else {
      state.inventory['medical_supplies'] = 3
      expect(evaluateConstructionLogisticsBonus(state)).toBe(1)
    }
  })

  it('returns 0 when total inventory stock is < 3', () => {
    const state = createStartingState()
    // Empty inventory
    for (const key of Object.keys(state.inventory)) {
      state.inventory[key] = 0
    }
    expect(evaluateConstructionLogisticsBonus(state)).toBe(0)
  })

  it('logistics bonus is deterministic — same inputs produce same output', () => {
    const stateA = createStartingState()
    const stateB = createStartingState()
    stateA.inventory['signal_jammers'] = 5
    stateB.inventory['signal_jammers'] = 5
    expect(evaluateConstructionLogisticsBonus(stateA)).toBe(
      evaluateConstructionLogisticsBonus(stateB)
    )
  })
})

describe('construction progress — clock advancement', () => {
  it('advances construction clock by delta and records progress', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-adv')
    state.cases['case-adv'] = currentCase as typeof state.cases[string]

    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], 1)
    const clock = readProgressClock(state, getConstructionProgressClockId('case-adv'))
    expect(clock).not.toBeNull()
    expect(clock!.value).toBe(1)
    expect(clock!.max).toBe(CONSTRUCTION_PROGRESS_MAX)
  })

  it('does not exceed max — clamped at CONSTRUCTION_PROGRESS_MAX', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-cap')
    state.cases['case-cap'] = currentCase as typeof state.cases[string]

    // Advance far beyond max
    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], 10)
    const clock = readProgressClock(state, getConstructionProgressClockId('case-cap'))
    expect(clock!.value).toBeLessThanOrEqual(CONSTRUCTION_PROGRESS_MAX)
  })

  it('isConstructionComplete returns false before threshold', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-check')
    state.cases['case-check'] = currentCase as typeof state.cases[string]

    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], 2)
    expect(isConstructionComplete(state, 'case-check')).toBe(false)
  })

  it('isConstructionComplete returns true at threshold', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-done')
    state.cases['case-done'] = currentCase as typeof state.cases[string]

    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], CONSTRUCTION_PROGRESS_MAX)
    expect(isConstructionComplete(state, 'case-done')).toBe(true)
  })

  it('delta = 0 leaves clock unchanged (interference stall)', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-stall')
    state.cases['case-stall'] = currentCase as typeof state.cases[string]

    // First advance to 2
    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], 2)
    // Then delta = 0 (interference)
    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], 0)
    const clock = readProgressClock(state, getConstructionProgressClockId('case-stall'))
    expect(clock!.value).toBe(2)
  })

  it('deterministic — identical advances on identical states produce identical clocks', () => {
    const stateA = createStartingState()
    const stateB = createStartingState()
    const caseA = buildConstructionCase('case-det')
    const caseB = { ...caseA }
    stateA.cases['case-det'] = caseA as typeof stateA.cases[string]
    stateB.cases['case-det'] = caseB as typeof stateB.cases[string]

    const resultA = advanceCaseConstructionClock(stateA, caseA as Parameters<typeof advanceCaseConstructionClock>[1], 1)
    const resultB = advanceCaseConstructionClock(stateB, caseB as Parameters<typeof advanceCaseConstructionClock>[1], 1)

    expect(
      readProgressClock(resultA, getConstructionProgressClockId('case-det'))
    ).toEqual(
      readProgressClock(resultB, getConstructionProgressClockId('case-det'))
    )
  })
})

describe('construction progress — interference projection', () => {
  it('proxy interference is detectable from faction state when agendaPressure > 60', () => {
    const state = createStartingState()
    const factions = buildFactionStates(state)
    const court = factions.find((f) => f.id === 'threshold_court')!
    const highPressure = { ...court, agendaPressure: 80 }
    expect(evaluateThresholdCourtProxyConflict(highPressure).effect).toBe('proxy_interference')
  })

  it('no interference when faction is stable', () => {
    const state = createStartingState()
    const factions = buildFactionStates(state)
    const court = factions.find((f) => f.id === 'threshold_court')!
    const stable = { ...court, agendaPressure: 10, distortion: 0 }
    expect(evaluateThresholdCourtProxyConflict(stable).effect).toBe('none')
  })

  it('interference stall: delta is 0 when interference active (simulated path)', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-interfere')
    state.cases['case-interfere'] = currentCase as typeof state.cases[string]

    // Simulate: delta = 0 under interference
    const deltaWithInterference = 0
    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], deltaWithInterference)
    const clock = readProgressClock(state, getConstructionProgressClockId('case-interfere'))
    // Clock should not exist or have value 0 since delta was 0
    expect(clock === null || clock.value === 0).toBe(true)
  })

  it('without interference: delta is 1 + logistics bonus, advancing progress', () => {
    let state = createStartingState()
    const currentCase = buildConstructionCase('case-no-interfere')
    state.cases['case-no-interfere'] = currentCase as typeof state.cases[string]
    // Ensure adequate logistics
    state.inventory['medical_supplies'] = 3

    const logisticsBonus = evaluateConstructionLogisticsBonus(state)
    const delta = 1 + logisticsBonus // = 2 with adequate stock
    state = advanceCaseConstructionClock(state, currentCase as Parameters<typeof advanceCaseConstructionClock>[1], delta)
    const clock = readProgressClock(state, getConstructionProgressClockId('case-no-interfere'))
    expect(clock!.value).toBe(delta)
  })
})

describe('construction readiness burden', () => {
  it('returns 0 when case has no construction.incomplete flag', () => {
    const state = createStartingState()
    // case-001 exists but has no construction.incomplete flag by default
    expect(evaluateConstructionReadinessBurden(state, 'case-001')).toBe(0)
  })

  it('returns CONSTRUCTION_READINESS_PENALTY when construction.incomplete flag is set and clock is not complete', () => {
    let state = createStartingState()
    const clockId = getConstructionProgressClockId('case-001')

    // Set the incomplete flag on the case
    state.cases['case-001'] = {
      ...state.cases['case-001']!,
      spatialFlags: [...(state.cases['case-001']?.spatialFlags ?? []), CONSTRUCTION_INCOMPLETE_FLAG],
    }
    // Set clock to incomplete (value 1 of 4)
    state = advanceDefinedProgressClock(state, clockId, 1, {
      label: 'Construction: Test',
      max: CONSTRUCTION_PROGRESS_MAX,
    })

    expect(evaluateConstructionReadinessBurden(state, 'case-001')).toBe(CONSTRUCTION_READINESS_PENALTY)
  })

  it('returns 0 when clock is at max (construction complete)', () => {
    let state = createStartingState()
    const clockId = getConstructionProgressClockId('case-001')

    state.cases['case-001'] = {
      ...state.cases['case-001']!,
      spatialFlags: [...(state.cases['case-001']?.spatialFlags ?? []), CONSTRUCTION_INCOMPLETE_FLAG],
    }
    // Complete the clock
    state = advanceDefinedProgressClock(state, clockId, CONSTRUCTION_PROGRESS_MAX, {
      label: 'Construction: Test',
      max: CONSTRUCTION_PROGRESS_MAX,
    })

    expect(evaluateConstructionReadinessBurden(state, 'case-001')).toBe(0)
  })

  it('construction burden reduces readiness score in buildTeamDeploymentReadinessState', () => {
    const baseline = createStartingState()
    baseline.cases['case-001'] = {
      ...baseline.cases['case-001']!,
      requiredRoles: [],
      requiredTags: [],
    }
    // Add fatigue so the formula value sits below 100, making the burden penalty observable.
    for (const memberId of baseline.teams.t_nightwatch.agentIds ?? baseline.teams.t_nightwatch.memberIds) {
      baseline.agents[memberId] = { ...baseline.agents[memberId]!, fatigue: 50 }
    }
    const baselineReadiness = buildTeamDeploymentReadinessState(baseline, 't_nightwatch', 'case-001')

    // Now add construction.incomplete flag and an incomplete clock
    let withConstruction = createStartingState()
    withConstruction.cases['case-001'] = {
      ...withConstruction.cases['case-001']!,
      requiredRoles: [],
      requiredTags: [],
      spatialFlags: [
        ...(withConstruction.cases['case-001']?.spatialFlags ?? []),
        CONSTRUCTION_INCOMPLETE_FLAG,
      ],
    }
    for (const memberId of withConstruction.teams.t_nightwatch.agentIds ?? withConstruction.teams.t_nightwatch.memberIds) {
      withConstruction.agents[memberId] = { ...withConstruction.agents[memberId]!, fatigue: 50 }
    }
    const clockId = getConstructionProgressClockId('case-001')
    withConstruction = advanceDefinedProgressClock(withConstruction, clockId, 1, {
      label: 'Construction: Test',
      max: CONSTRUCTION_PROGRESS_MAX,
    })

    const constructionReadiness = buildTeamDeploymentReadinessState(
      withConstruction,
      't_nightwatch',
      'case-001'
    )

    expect(constructionReadiness.readinessScore).toBeLessThan(baselineReadiness.readinessScore)
    expect(baselineReadiness.readinessScore - constructionReadiness.readinessScore).toBe(
      CONSTRUCTION_READINESS_PENALTY
    )
  })

  it('construction burden is independent of inventory stock changes', () => {
    let stateA = createStartingState()
    let stateB = createStartingState()
    const clockId = getConstructionProgressClockId('case-001')

    const applyBurden = (s: typeof stateA) => {
      s.cases['case-001'] = {
        ...s.cases['case-001']!,
        spatialFlags: [...(s.cases['case-001']?.spatialFlags ?? []), CONSTRUCTION_INCOMPLETE_FLAG],
      }
      return advanceDefinedProgressClock(s, clockId, 1, {
        label: 'Construction: Test',
        max: CONSTRUCTION_PROGRESS_MAX,
      })
    }

    stateA = applyBurden(stateA)
    stateB = applyBurden(stateB)

    // Different inventory, same construction state
    stateA.inventory['medical_supplies'] = 0
    stateB.inventory['medical_supplies'] = 10

    expect(evaluateConstructionReadinessBurden(stateA, 'case-001')).toBe(
      evaluateConstructionReadinessBurden(stateB, 'case-001')
    )
    expect(evaluateConstructionReadinessBurden(stateA, 'case-001')).toBe(CONSTRUCTION_READINESS_PENALTY)
  })
})
