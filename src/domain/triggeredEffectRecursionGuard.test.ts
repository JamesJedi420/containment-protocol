import { describe, expect, it } from 'vitest'
import {
  checkTriggeredEffectStep,
  rejectStaticCycle,
  DEFAULT_CHAIN_STEP_BUDGET,
  type EffectStep,
  type ChainState,
} from './triggeredEffectRecursionGuard'

function step(effectId: string, triggerId = 't', chainId = 'c1', parent?: string): EffectStep {
  return { effectId, triggerId, chainId, parentStepId: parent }
}

function apply(state: ChainState | undefined, s: EffectStep, budget?: number) {
  return checkTriggeredEffectStep({ step: s, currentState: state, budget })
}

describe('triggeredEffectRecursionGuard', () => {
  it('allows a finite valid chain below budget', () => {
    let result = apply(undefined, step('e1'))
    expect(result.allowed).toBe(true)
    result = apply(result.nextState, step('e2'))
    expect(result.allowed).toBe(true)
    result = apply(result.nextState, step('e3'))
    expect(result.allowed).toBe(true)
    expect(result.nextState.lineage).toEqual(['e1', 'e2', 'e3'])
    expect(result.nextState.stepCount).toBe(3)
  })

  it('terminates direct self-trigger cycle', () => {
    let result = apply(undefined, step('e1'))
    result = apply(result.nextState, step('e1'))
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('self_trigger_cycle')
    expect(result.nextState.lineage).toEqual(['e1'])
  })

  it('terminates two-effect mutual cycle', () => {
    let result = apply(undefined, step('a'))
    result = apply(result.nextState, step('b'))
    result = apply(result.nextState, step('a'))
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('mutual_cycle')
  })

  it('terminates multi-node repeated lineage cycle', () => {
    let result = apply(undefined, step('a'))
    result = apply(result.nextState, step('b'))
    result = apply(result.nextState, step('c'))
    result = apply(result.nextState, step('a'))
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('multi_node_cycle')
  })

  it('enforces step budget and does not roll back prior steps', () => {
    let state: ChainState | undefined
    for (let i = 0; i < 5; i++) {
      const r = apply(state, step(`e${i}`), 5)
      expect(r.allowed).toBe(true)
      state = r.nextState
    }
    const over = apply(state, step('e5'), 5)
    expect(over.allowed).toBe(false)
    expect(over.reason).toBe('step_budget_exceeded')
    expect(over.nextState.stepCount).toBe(5)
    expect(over.nextState.lineage.length).toBe(5)
  })

  it('is idempotent on duplicate step delivery', () => {
    const first = apply(undefined, step('e1', 'trig1'))
    expect(first.allowed).toBe(true)
    const replay = apply(first.nextState, step('e1', 'trig1'))
    expect(replay.allowed).toBe(true)
    expect(replay.nextState).toBe(first.nextState)
  })

  it('rejects malformed lineage', () => {
    const bad = checkTriggeredEffectStep({ step: { effectId: '', triggerId: 't', chainId: 'c' } as EffectStep })
    expect(bad.allowed).toBe(false)
    expect(bad.reason).toBe('malformed_lineage')
  })

  it('rejectStaticCycle detects obvious authoring cycles', () => {
    expect(rejectStaticCycle([{ from: 'a', to: 'a' }])).toBe(true)
    expect(rejectStaticCycle([{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }])).toBe(true)
    expect(rejectStaticCycle([{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }])).toBe(false)
  })

  it('unrelated chains do not interfere', () => {
    const a = apply(undefined, step('e1', 't', 'chainA'))
    const b = apply(undefined, step('e1', 't', 'chainB'))
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    expect(a.nextState.chainId).not.toBe(b.nextState.chainId)
  })

  it('uses default budget when omitted', () => {
    expect(DEFAULT_CHAIN_STEP_BUDGET).toBe(32)
  })
})
