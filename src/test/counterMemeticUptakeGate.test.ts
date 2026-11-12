import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_COUNTER_MEMETIC_PLAN,
  evaluateCounterMemeticUptakeGate,
} from '../domain/counterMemeticUptakeGate'
import type { CounterMemeticPlan } from '../domain/counterMemeticUptakeGate'

function plan(overrides: Partial<CounterMemeticPlan> = {}): CounterMemeticPlan {
  return {
    ...EXAMPLE_COUNTER_MEMETIC_PLAN,
    ...overrides,
  }
}

describe('counterMemeticUptakeGate (SPE-2570 / SPE-947 AC row 3)', () => {
  it('returns ready when lore is crafted, distributor set, propagation elapsed, and uptake sufficient', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan(),
    })

    expect(decision.readiness).toBe('ready')
    expect(decision.reasonCodes).toEqual(['countermeasure_ready'])
    expect(decision).toEqual(
      expect.objectContaining({
        planId: 'plan:corrective-lore-wave',
        planLabel: 'Corrective lore wave',
        loreState: 'crafted',
        distributorId: 'distributor:civic-bulletin',
        requiredPropagationWeeks: 2,
        elapsedPropagationWeeks: 2,
        uptakeState: 'sufficient',
      })
    )
  })

  it('blocks when lore is still draft', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({ loreState: 'draft' }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['lore_not_crafted'])
  })

  it('blocks when lore is missing', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({ loreState: 'missing' }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['lore_not_crafted'])
  })

  it('blocks when distributor is missing', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({ distributorId: undefined }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['distributor_missing'])
    expect(decision.distributorId).toBe('')
  })

  it('blocks when distributor is blank', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({ distributorId: '   ' }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['distributor_missing'])
  })

  it('returns propagating when elapsed weeks are below the requirement', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({
        requiredPropagationWeeks: 3,
        elapsedPropagationWeeks: 1,
        uptakeState: 'sufficient',
      }),
    })

    expect(decision.readiness).toBe('propagating')
    expect(decision.reasonCodes).toEqual(['propagation_incomplete'])
  })

  it('blocks when uptake is only partial after propagation completes', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({
        elapsedPropagationWeeks: 2,
        uptakeState: 'partial',
      }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['uptake_insufficient'])
  })

  it('blocks when uptake is none after propagation completes', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({
        elapsedPropagationWeeks: 5,
        uptakeState: 'none',
      }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['uptake_insufficient'])
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = { plan: plan() }

    const first = evaluateCounterMemeticUptakeGate(input)
    const second = evaluateCounterMemeticUptakeGate(input)

    expect(second).toEqual(first)
    expect(first.readiness).toBe('ready')
  })

  it('blocks deterministically when evaluation input is missing', () => {
    const decision = evaluateCounterMemeticUptakeGate(undefined)

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(decision.loreState).toBe('unknown')
  })

  it('blocks when plan is missing', () => {
    const decision = evaluateCounterMemeticUptakeGate({})

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['missing_plan'])
  })

  it('blocks when required propagation weeks are invalid', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({ requiredPropagationWeeks: 0 }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual([
      'countermeasure_blocked',
      'invalid_required_propagation_weeks',
    ])
  })

  it('blocks when lore state is invalid', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: {
        ...plan(),
        loreState: 'published' as CounterMemeticPlan['loreState'],
      },
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.loreState).toBe('unknown')
    expect(decision.reasonCodes).toEqual([
      'countermeasure_blocked',
      'missing_or_invalid_lore_state',
    ])
  })

  it('blocks when uptake state is invalid after other gates pass', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: {
        ...plan(),
        uptakeState: 'viral' as CounterMemeticPlan['uptakeState'],
      },
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.uptakeState).toBe('unknown')
    expect(decision.reasonCodes).toEqual([
      'countermeasure_blocked',
      'missing_or_invalid_uptake_state',
    ])
  })

  it('blocks when uptake is invalid even if propagation is still incomplete', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: {
        ...plan({
          requiredPropagationWeeks: 3,
          elapsedPropagationWeeks: 1,
        }),
        uptakeState: 'viral' as CounterMemeticPlan['uptakeState'],
      },
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual([
      'countermeasure_blocked',
      'missing_or_invalid_uptake_state',
    ])
  })

  it('blocks when elapsed weeks are invalid instead of treating them as propagating', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({
        requiredPropagationWeeks: 2,
        elapsedPropagationWeeks: Number.NaN,
        uptakeState: 'sufficient',
      }),
    })

    expect(decision.elapsedPropagationWeeks).toBe(0)
    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual([
      'countermeasure_blocked',
      'invalid_elapsed_propagation_weeks',
    ])
  })

  it('blocks when elapsed weeks are missing', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: plan({
        requiredPropagationWeeks: 2,
        elapsedPropagationWeeks: undefined as unknown as number,
        uptakeState: 'sufficient',
      }),
    })

    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toEqual([
      'countermeasure_blocked',
      'missing_elapsed_propagation_weeks',
    ])
  })
})
