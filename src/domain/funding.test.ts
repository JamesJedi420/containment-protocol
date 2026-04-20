import { describe, it, expect } from 'vitest'
import {
  createInitialFundingState,
  applyFundingIncome,
  applyFundingExpense,
  placeProcurementOrder,
  fulfillProcurementOrder,
  cancelProcurementOrder,
  recomputeBudgetPressure,
  getCompactFundingSummary,
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
