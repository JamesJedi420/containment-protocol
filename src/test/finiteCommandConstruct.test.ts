import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_COMMAND_VOCABULARY_SIZE,
  advanceConstructUnattended,
  bootConstructRuntime,
  createFiniteCommandConstruct,
  issueConstructCommand,
  type ConstructRuntimeState,
  type FiniteCommandConstruct,
} from '../domain/finiteCommandConstruct'

describe('SPE-330 finite-command construct control', () => {
  let construct: FiniteCommandConstruct
  let runtime: ConstructRuntimeState

  beforeEach(() => {
    construct = createFiniteCommandConstruct({
      id: 'proxy-1',
      vocabulary: ['move', 'guard', 'attack_priority_high', 'fallback_retreat'],
      delegatedAuthority: true,
      failSafeMode: 'return',
      failSafeDelayTicks: 5,
    })
    runtime = bootConstructRuntime(construct)
  })

  it('operates only within a fixed bounded vocabulary', () => {
    expect(construct.vocabulary.length).toBeLessThanOrEqual(MAX_COMMAND_VOCABULARY_SIZE)
    const moved = issueConstructCommand(construct, runtime, 'move')
    expect(moved.activeCommand).toBe('move')
    expect(moved.movementMode).toBe('advance')
    expect(() => issueConstructCommand(construct, moved, 'carry')).toThrow(
      /outside construct vocabulary/
    )
  })

  it('changes attack or movement behavior deterministically by command', () => {
    const high = issueConstructCommand(construct, runtime, 'attack_priority_high')
    expect(high.attackPriority).toBe('high')
    expect(high.movementMode).toBe('advance')
    const guard = issueConstructCommand(construct, high, 'guard')
    expect(guard.attackPriority).toBe('low')
    expect(guard.movementMode).toBe('hold')
  })

  it('activates a delayed fail-safe after unattended time', () => {
    const mid = advanceConstructUnattended(construct, runtime, 4)
    expect(mid.failSafeActive).toBe(false)
    const armed = advanceConstructUnattended(construct, mid, 1)
    expect(armed.failSafeActive).toBe(true)
    expect(armed.failSafeMode).toBe('return')
    expect(armed.movementMode).toBe('retreat')
    expect(armed.activeCommand).toBeNull()
    expect(() => issueConstructCommand(construct, armed, 'move')).toThrow(/fail-safe/)
  })

  it('rejects commands without delegated authority', () => {
    const locked = createFiniteCommandConstruct({
      ...construct,
      id: 'proxy-locked',
      delegatedAuthority: false,
    })
    const state = bootConstructRuntime(locked)
    expect(() => issueConstructCommand(locked, state, 'move')).toThrow(/delegated authority/)
  })

  it('is deterministic and does not mutate inputs', () => {
    const input = {
      id: 'proxy-d',
      vocabulary: ['move', 'carry'] as const,
      delegatedAuthority: true,
      failSafeMode: 'hide' as const,
      failSafeDelayTicks: 3,
    }
    const before = structuredClone(input)
    const first = createFiniteCommandConstruct(input)
    const second = createFiniteCommandConstruct(input)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(input).toEqual(before)
  })
})
