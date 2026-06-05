import { describe, it, expect } from 'vitest'
import {
  createInitialFundingState,
  applyFundingIncome,
  applyFundingExpense,
  applyWeeklyOperatingCostToFundingState,
  computeWeeklyOperatingCost,
  hasWeeklyOperatingCostForWeek,
  placeProcurementOrder,
  fulfillProcurementOrder,
  cancelProcurementOrder,
  recomputeBudgetPressure,
  getCompactFundingSummary,
  normalizeFundingState,
  sanitizeCourierShellFrontState,
  sanitizeMaintenanceSpecialistsAvailable,
} from './funding'

describe('Funding, Procurement, & Budget Pressure System', () => {
  const basePerWeek = 1000
  const perResolution = 500
  const penaltyPerFail = 300
  const penaltyPerUnresolved = 400
  const initialFunding = 2000
  const week = 1

  it('creates initial funding state', () => {
    const state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, initialFunding)
    expect(state.funding).toBe(initialFunding)
    expect(state.fundingBasePerWeek).toBe(basePerWeek)
    expect(state.fundingPerResolution).toBe(perResolution)
    expect(state.fundingPenaltyPerFail).toBe(penaltyPerFail)
    expect(state.fundingPenaltyPerUnresolved).toBe(penaltyPerUnresolved)
    expect(state.budgetPressure).toBe(0)
    expect(state.fundingHistory).toHaveLength(0)
    expect(state.procurementBacklog).toHaveLength(0)
  })

  it('applies funding income and logs history', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, initialFunding)
    state = applyFundingIncome(state, 500, 'mission_reward', week)
    expect(state.funding).toBe(initialFunding + 500)
    expect(state.fundingHistory.at(-1)).toMatchObject({ delta: 500, reason: 'mission_reward', week })
  })

  it('applies funding expense and logs history', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, initialFunding)
    state = applyFundingExpense(state, 200, 'training_cost', week)
    expect(state.funding).toBe(initialFunding - 200)
    expect(state.fundingHistory.at(-1)).toMatchObject({ delta: -200, reason: 'training_cost', week })
  })

  it('computes deterministic weekly operating cost and applies it once per closed week', () => {
    const agents = { a: {}, b: {}, c: {} } as Record<string, object>
    const weekOneCost = computeWeeklyOperatingCost({ agents, supportStaff: undefined }, 1)
    expect(weekOneCost).toBe(20)

    const weekFourCost = computeWeeklyOperatingCost({ agents, supportStaff: undefined }, 4)
    expect(weekFourCost).toBe(32)

    const state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 100)
    const firstPass = applyWeeklyOperatingCostToFundingState(state, { agents, supportStaff: undefined }, 1)
    expect(firstPass.appliedAmount).toBe(20)
    expect(firstPass.state.funding).toBe(80)
    expect(hasWeeklyOperatingCostForWeek(firstPass.state, 1)).toBe(true)

    const secondPass = applyWeeklyOperatingCostToFundingState(firstPass.state, { agents, supportStaff: undefined }, 1)
    expect(secondPass.appliedAmount).toBe(0)
    expect(secondPass.state.funding).toBe(80)
  })

  it('places procurement order, deducts cost, and logs', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 1000)
    state = placeProcurementOrder(state, {
      requestId: 'req1',
      itemId: 'itemA',
      quantity: 2,
      requestedWeek: week,
      cost: 300,
    })
    expect(state.funding).toBe(700)
    expect(state.procurementBacklog).toHaveLength(1)
    expect(state.procurementBacklog[0].status).toBe('pending')
    expect(state.fundingHistory.at(-1)).toMatchObject({ delta: -300, reason: 'market_transaction', sourceId: 'req1' })
  })

  it('fulfills procurement order', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 1000)
    state = placeProcurementOrder(state, {
      requestId: 'req2',
      itemId: 'itemB',
      quantity: 1,
      requestedWeek: week,
      cost: 200,
    })
    state = fulfillProcurementOrder(state, 'req2', week + 1)
    expect(state.procurementBacklog[0].status).toBe('fulfilled')
    expect(state.procurementBacklog[0].fulfilledWeek).toBe(week + 1)
  })

  it('cancels procurement order', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 1000)
    state = placeProcurementOrder(state, {
      requestId: 'req3',
      itemId: 'itemC',
      quantity: 1,
      requestedWeek: week,
      cost: 100,
    })
    state = cancelProcurementOrder(state, 'req3', week + 2, 'blocked')
    expect(state.procurementBacklog[0].status).toBe('cancelled')
    expect(state.procurementBacklog[0].fulfilledWeek).toBe(week + 2)
    expect(state.procurementBacklog[0].blockedReason).toBe('blocked')
  })

  it('recomputes budget pressure for negative funding and backlog', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 0)
    // Negative funding
    state = applyFundingExpense(state, 100, 'training_cost', week)
    state = recomputeBudgetPressure(state)
    expect(state.budgetPressure).toBeGreaterThanOrEqual(1)
    // Large backlog (reset funding to allow cost 0 orders)
    state = { ...state, funding: 1 }
    for (let i = 0; i < 8; ++i) {
      state = placeProcurementOrder(state, {
        requestId: `reqB${i}`,
        itemId: 'itemB',
        quantity: 1,
        requestedWeek: week + i,
        cost: 0,
      })
    }
    state = recomputeBudgetPressure(state)
    expect(state.budgetPressure).toBeGreaterThanOrEqual(2)
  })

  it('returns compact funding summary', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 100)
    state = placeProcurementOrder(state, {
      requestId: 'req4',
      itemId: 'itemD',
      quantity: 1,
      requestedWeek: week,
      cost: 10,
    })
    state = recomputeBudgetPressure(state)
    const summary = getCompactFundingSummary(state)
    expect(summary.funding).toBe(90)
    expect(summary.backlog).toBe(1)
    expect(summary.budgetPressure).toBe(state.budgetPressure)
  })

  it('throws on invalid procurement order (insufficient funds)', () => {
    const state = createInitialFundingState(
      basePerWeek,
      perResolution,
      penaltyPerFail,
      penaltyPerUnresolved,
      10
    )
    expect(() =>
      placeProcurementOrder(state, {
        requestId: 'req5',
        itemId: 'itemE',
        quantity: 1,
        requestedWeek: week,
        cost: 100,
      })
    ).toThrow('Insufficient funds')
  })

  it('sanitizes courier shell debt before recomputing budget pressure', () => {
    const state = createInitialFundingState(
      basePerWeek,
      perResolution,
      penaltyPerFail,
      penaltyPerUnresolved,
      initialFunding
    )

    const normalized = normalizeFundingState(
      initialFunding,
      {
        fundingBasePerWeek: basePerWeek,
        fundingPerResolution: perResolution,
        fundingPenaltyPerFail: penaltyPerFail,
        fundingPenaltyPerUnresolved: penaltyPerUnresolved,
      },
      {
        ...state,
        courierShellBudgetPressureDebt: Number.NaN,
      },
      week
    )

    expect(normalized.courierShellBudgetPressureDebt).toBeUndefined()
    expect(Number.isFinite(normalized.budgetPressure)).toBe(true)
  })

  it('sanitizes courier shell front weeks and collapse reason (SPE-449–450)', () => {
    const front = sanitizeCourierShellFrontState(
      {
        type: 'courierShell',
        status: 'collapsed',
        startedWeek: 2,
        startupCostPaid: 400,
        lastResolvedWeek: 99,
        exposureBand: 'bogus',
        collapseReason: 'overstretched',
      },
      5
    )

    expect(front).toMatchObject({
      status: 'collapsed',
      startedWeek: 2,
      lastResolvedWeek: 5,
      exposureBand: 'elevated',
      collapseReason: 'overstretched',
    })
  })

  it('clamps maintenance specialists to bounded capacity (SPE-452)', () => {
    expect(sanitizeMaintenanceSpecialistsAvailable(-3)).toBe(0)
    expect(sanitizeMaintenanceSpecialistsAvailable(250)).toBe(99)
    expect(sanitizeMaintenanceSpecialistsAvailable(Number.NaN)).toBeUndefined()
  })

  it('clamps negative procurement cost to zero on normalize (SPE-457)', () => {
    const normalized = normalizeFundingState(
      500,
      {
        fundingBasePerWeek: basePerWeek,
        fundingPerResolution: perResolution,
        fundingPenaltyPerFail: penaltyPerFail,
        fundingPenaltyPerUnresolved: penaltyPerUnresolved,
      },
      {
        ...createInitialFundingState(
          basePerWeek,
          perResolution,
          penaltyPerFail,
          penaltyPerUnresolved,
          500
        ),
        procurementBacklog: [
          {
            requestId: 'req-negative-cost',
            itemId: 'medkits',
            quantity: 1,
            status: 'pending',
            requestedWeek: week,
            cost: -25,
          },
        ],
      },
      week
    )

    expect(normalized.procurementBacklog[0]?.cost).toBe(0)
  })

  it('dedupes procurement backlog requestId keeping earliest week (SPE-458)', () => {
    const normalized = normalizeFundingState(
      500,
      {
        fundingBasePerWeek: basePerWeek,
        fundingPerResolution: perResolution,
        fundingPenaltyPerFail: penaltyPerFail,
        fundingPenaltyPerUnresolved: penaltyPerUnresolved,
      },
      {
        ...createInitialFundingState(
          basePerWeek,
          perResolution,
          penaltyPerFail,
          penaltyPerUnresolved,
          500
        ),
        procurementBacklog: [
          {
            requestId: 'req-dup',
            itemId: 'medkits',
            quantity: 1,
            status: 'pending',
            requestedWeek: week,
            cost: 5,
          },
          {
            requestId: 'req-dup',
            itemId: 'medkits',
            quantity: 3,
            status: 'fulfilled',
            requestedWeek: week + 2,
            cost: 9,
          },
        ],
      },
      week
    )

    expect(normalized.procurementBacklog).toHaveLength(1)
    expect(normalized.procurementBacklog[0]).toMatchObject({
      requestId: 'req-dup',
      requestedWeek: week,
      quantity: 1,
    })
  })

  it('throws on invalid status transitions', () => {
    let state = createInitialFundingState(basePerWeek, perResolution, penaltyPerFail, penaltyPerUnresolved, 100)
    state = placeProcurementOrder(state, {
      requestId: 'req6',
      itemId: 'itemF',
      quantity: 1,
      requestedWeek: week,
      cost: 10,
    })
    state = fulfillProcurementOrder(state, 'req6', week + 1)
    expect(() => fulfillProcurementOrder(state, 'req6', week + 2)).toThrow('Order not pending')
    expect(() => cancelProcurementOrder(state, 'req6', week + 2)).toThrow('Order not pending')
  })
})
