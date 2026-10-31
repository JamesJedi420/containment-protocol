import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyDualResourceDrain,
  createDrainTargetSnapshot,
  createDualResourceDrainEffect,
  isPersistentStolenCognition,
  type DrainTargetSnapshot,
  type DualResourceDrainEffect,
} from '../domain/biologicalMnemonicDrain'

describe('SPE-270 biological and mnemonic drain', () => {
  let target: DrainTargetSnapshot
  let effect: DualResourceDrainEffect

  beforeEach(() => {
    target = createDrainTargetSnapshot({
      actorId: 'op-1',
      biologicalReserve: 40,
      mnemonicIntegrity: 30,
    })
    effect = createDualResourceDrainEffect({
      id: 'leech-strike',
      biologicalTarget: 'blood',
      mnemonicTarget: 'memory',
      biologicalAmount: 10,
      mnemonicAmount: 8,
      cognitionFragmentId: 'frag-memory-a',
    })
  })

  it('drains both biological and mnemonic resources in one effect', () => {
    const result = applyDualResourceDrain(target, effect)
    expect(result.biologicalDrained).toBe(10)
    expect(result.mnemonicDrained).toBe(8)
    expect(result.biologicalRemaining).toBe(30)
    expect(result.mnemonicRemaining).toBe(22)
    expect(result.aftermath).toBe('sedation_vulnerability')
  })

  it('persists stolen cognition as a separable payload beyond the attack', () => {
    const result = applyDualResourceDrain(target, effect)
    expect(result.stolenCognition.persistsBeyondAttack).toBe(true)
    expect(result.stolenCognition.fragmentId).toBe('frag-memory-a')
    expect(result.stolenCognition.amount).toBe(8)
    expect(isPersistentStolenCognition(result.stolenCognition)).toBe(true)
  })

  it('selects typed aftermath for identity and deeper depletion otherwise', () => {
    const identity = createDualResourceDrainEffect({
      id: 'id-siphon',
      biologicalTarget: 'vitality',
      mnemonicTarget: 'identity',
      biologicalAmount: 5,
      mnemonicAmount: 5,
      cognitionFragmentId: 'frag-id',
    })
    expect(applyDualResourceDrain(target, identity).aftermath).toBe('typed_subsystem_loss')

    const knowledge = createDualResourceDrainEffect({
      id: 'know-siphon',
      biologicalTarget: 'stamina',
      mnemonicTarget: 'knowledge',
      biologicalAmount: 5,
      mnemonicAmount: 5,
      cognitionFragmentId: 'frag-k',
    })
    expect(applyDualResourceDrain(target, knowledge).aftermath).toBe('deeper_depletion')
  })

  it('clamps drain to remaining reserves and fail-closes empty dual channels', () => {
    const low = createDrainTargetSnapshot({
      actorId: 'op-2',
      biologicalReserve: 3,
      mnemonicIntegrity: 2,
    })
    const heavy = createDualResourceDrainEffect({
      id: 'heavy',
      biologicalTarget: 'vitality',
      mnemonicTarget: 'knowledge',
      biologicalAmount: 20,
      mnemonicAmount: 20,
      cognitionFragmentId: 'frag-h',
    })
    const result = applyDualResourceDrain(low, heavy)
    expect(result.biologicalDrained).toBe(3)
    expect(result.mnemonicDrained).toBe(2)
    expect(result.biologicalRemaining).toBe(0)
    expect(result.mnemonicRemaining).toBe(0)

    expect(() =>
      applyDualResourceDrain(
        createDrainTargetSnapshot({ actorId: 'op-3', biologicalReserve: 0, mnemonicIntegrity: 10 }),
        effect
      )
    ).toThrow(/remaining/)
  })

  it('fail-closes malformed effect and target inputs', () => {
    expect(() =>
      createDualResourceDrainEffect({
        id: 'x',
        biologicalTarget: 'hp' as 'blood',
        mnemonicTarget: 'memory',
        biologicalAmount: 5,
        mnemonicAmount: 5,
        cognitionFragmentId: 'f',
      })
    ).toThrow(/biologicalTarget/)
    expect(() =>
      createDrainTargetSnapshot({ actorId: 'x', biologicalReserve: 101, mnemonicIntegrity: 10 })
    ).toThrow(/biologicalReserve/)
  })

  it('is deterministic and does not mutate inputs', () => {
    const t = { actorId: 'op-d', biologicalReserve: 20, mnemonicIntegrity: 20 }
    const e = {
      id: 'd',
      biologicalTarget: 'blood' as const,
      mnemonicTarget: 'memory' as const,
      biologicalAmount: 4,
      mnemonicAmount: 4,
      cognitionFragmentId: 'frag-d',
    }
    const beforeT = structuredClone(t)
    const beforeE = structuredClone(e)
    const first = applyDualResourceDrain(t, e)
    const second = applyDualResourceDrain(t, e)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.stolenCognition)).toBe(true)
    expect(t).toEqual(beforeT)
    expect(e).toEqual(beforeE)
  })
})
