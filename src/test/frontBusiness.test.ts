import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { FRONT_BUSINESS_CALIBRATION } from '../domain/sim/calibration'
import { OFF_BOOKS_COURIER_LOCKOUT_TAG, OFF_BOOKS_COURIER_PAID_PREREQ_TAG } from '../domain/sim/downtimeSideWork'
import {
  agencyHasPaidCourierPrerequisite,
  getCourierShellRiskBreakdown,
  openCourierShellFront,
  resolveCourierShellFrontWeekly,
} from '../domain/sim/frontBusiness'
import { normalizeGameState } from '../domain/teamSimulation'
import type { GameState } from '../domain/models'

function withPaidCourierAndFunding(base: GameState, funding: number): GameState {
  const agentId = Object.keys(base.agents)[0]!
  const agent = base.agents[agentId]!
  return normalizeGameState({
    ...base,
    funding,
    agency: {
      ...base.agency!,
      funding,
    },
    agents: {
      ...base.agents,
      [agentId]: {
        ...agent,
        tags: [...agent.tags, OFF_BOOKS_COURIER_PAID_PREREQ_TAG],
      },
    },
  })
}

describe('SPE-1703a courier shell front business', () => {
  it('requires paid courier prerequisite on at least one operative', () => {
    const base = createStartingState()
    expect(agencyHasPaidCourierPrerequisite(base)).toBe(false)
    expect(openCourierShellFront(base).agency?.courierShellFront).toBeUndefined()
  })

  it('opens once, debits funding mirror, and refuses duplicate open', () => {
    const base = withPaidCourierAndFunding(createStartingState(), 9000)
    const opened = openCourierShellFront(base)
    expect(opened.funding).toBe(9000 - FRONT_BUSINESS_CALIBRATION.courierShellStartupCost)
    expect(opened.agency?.funding).toBe(opened.funding)
    expect(opened.agency?.courierShellFront?.type).toBe('courierShell')
    expect(opened.agency?.courierShellFront?.status).toBe('active')
    expect(openCourierShellFront(opened).funding).toBe(opened.funding)
  })

  it('resolves weekly profit on a calm roster', () => {
    const base = withPaidCourierAndFunding(createStartingState(), 9000)
    const opened = openCourierShellFront(base)
    const res = resolveCourierShellFrontWeekly(opened, 1)
    expect(res).not.toBeNull()
    expect(res!.fundingDelta).toBe(FRONT_BUSINESS_CALIBRATION.courierShellWeeklyBase)
    expect(res!.nextFront.status).toBe('active')
    expect(res!.nextFront.lastResolvedWeek).toBe(1)
    expect(res!.applyCollapseBudgetPressureDebt).toBe(false)
  })

  it('is idempotent when lastResolvedWeek matches closed week', () => {
    const base = withPaidCourierAndFunding(createStartingState(), 9000)
    const opened = openCourierShellFront(base)
    const once = resolveCourierShellFrontWeekly(opened, 1)!
    const twice = resolveCourierShellFrontWeekly(
      { ...opened, agency: { ...opened.agency!, courierShellFront: once.nextFront } },
      1
    )
    expect(twice).toBeNull()
  })

  it('collapses under extreme courier-side risk and stamps budget pressure debt', () => {
    const base = withPaidCourierAndFunding(createStartingState(), 12000)
    const opened = openCourierShellFront(base)
    const agents = { ...opened.agents }
    const ids = Object.keys(agents)
    for (let i = 0; i < 4; i += 1) {
      const id = ids[i]!
      const a = agents[id]!
      agents[id] = { ...a, tags: [...a.tags, OFF_BOOKS_COURIER_LOCKOUT_TAG] }
    }
    const stressed: GameState = { ...opened, agents }
    const res = resolveCourierShellFrontWeekly(stressed, 2)
    expect(res).not.toBeNull()
    expect(res!.nextFront.status).toBe('collapsed')
    expect(res!.nextFront.collapseReason).toBe('overstretched')
    expect(res!.applyCollapseBudgetPressureDebt).toBe(true)
    const bd = getCourierShellRiskBreakdown(stressed)
    expect(bd.riskScore).toBeGreaterThanOrEqual(FRONT_BUSINESS_CALIBRATION.courierShellCollapseRiskThreshold)
  })

  it('wires weekly resolution through advanceWeek after downtime', () => {
    const base = withPaidCourierAndFunding(createStartingState(), 12000)
    const opened = openCourierShellFront(base)
    const after = advanceWeek(opened)
    expect(after.agency?.courierShellFront?.lastResolvedWeek).toBe(1)
    expect(typeof after.agency?.courierShellFront?.lastNet).toBe('number')
  })

  it('applies collapse budget pressure debt when the shell collapses through advanceWeek', () => {
    const base = withPaidCourierAndFunding(createStartingState(), 20000)
    const opened = openCourierShellFront(base)
    const agents = { ...opened.agents }
    const ids = Object.keys(agents)
    for (let i = 0; i < 4; i += 1) {
      const id = ids[i]!
      const a = agents[id]!
      agents[id] = { ...a, tags: [...a.tags, OFF_BOOKS_COURIER_LOCKOUT_TAG] }
    }
    const stressed: GameState = normalizeGameState({ ...opened, agents })
    const after = advanceWeek(stressed)
    expect(after.agency?.courierShellFront?.status).toBe('collapsed')
    expect(after.agency?.fundingState?.courierShellBudgetPressureDebt).toBe(
      FRONT_BUSINESS_CALIBRATION.courierShellCollapseBudgetPressureDebt
    )
  })
})
