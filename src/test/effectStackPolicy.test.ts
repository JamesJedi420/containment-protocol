import { describe, expect, it } from 'vitest'
import { resolveEffectStack, type StackEffect } from '../domain/effectStackPolicy'

describe('authored effect overlap policies', () => {
  const weaker: StackEffect = { id: 'effect:a', family: 'family:focus', magnitude: 2, duration: 3 }
  const stronger: StackEffect = {
    id: 'effect:b',
    family: 'family:focus',
    magnitude: 5,
    duration: 4,
  }

  it('retains the strongest with stable tie ordering and rejects duplicate families when authored', () => {
    expect(resolveEffectStack({ kind: 'strongest' }, [weaker], stronger)).toMatchObject({
      ok: true,
      outcome: 'strongest',
      retained: [stronger],
    })
    expect(
      resolveEffectStack({ kind: 'strongest' }, [weaker], { ...stronger, magnitude: 2 })
    ).toMatchObject({ ok: true, retained: [weaker] })
    expect(resolveEffectStack({ kind: 'reject-duplicate' }, [weaker], stronger)).toMatchObject({
      ok: true,
      outcome: 'rejected',
      retained: [weaker],
    })
  })

  it('extends duration without increasing the original magnitude', () => {
    expect(resolveEffectStack({ kind: 'extend-duration' }, [weaker], stronger)).toMatchObject({
      ok: true,
      outcome: 'extended',
      retained: [{ ...weaker, duration: 7 }],
    })
  })

  it('caps the effective total without changing the separate instances', () => {
    expect(resolveEffectStack({ kind: 'cap-total', cap: 6 }, [weaker], stronger)).toMatchObject({
      ok: true,
      outcome: 'capped',
      retained: [weaker, stronger],
      effectiveMagnitude: 6,
    })
    const third = { ...weaker, id: 'effect:c', magnitude: 1 }
    expect(resolveEffectStack({ kind: 'cap-total', cap: 6 }, [weaker, third], stronger)).toEqual(
      resolveEffectStack({ kind: 'cap-total', cap: 6 }, [third, weaker], stronger)
    )
  })

  it('cancels one explicitly opposed pair without inferring opposition', () => {
    const calm = { ...weaker, family: 'family:calm' }
    const panic = { ...stronger, family: 'family:panic' }
    expect(
      resolveEffectStack({ kind: 'cancel-opposed', opposedFamily: 'family:calm' }, [calm], panic)
    ).toMatchObject({ ok: true, outcome: 'canceled', retained: [] })
    expect(
      resolveEffectStack({ kind: 'cancel-opposed', opposedFamily: 'family:other' }, [calm], panic)
    ).toMatchObject({ ok: false, reason: 'invalid-opposition' })
  })

  it('fails closed on duplicate identities, invalid values and ambiguous extension', () => {
    expect(resolveEffectStack({ kind: 'strongest' }, [weaker], weaker)).toMatchObject({
      ok: false,
      reason: 'duplicate-id',
    })
    expect(resolveEffectStack({ kind: 'cap-total', cap: -1 }, [weaker], stronger)).toMatchObject({
      ok: false,
      reason: 'invalid-cap',
    })
    expect(
      resolveEffectStack({ kind: 'extend-duration' }, [weaker, stronger], {
        ...stronger,
        id: 'effect:c',
      })
    ).toMatchObject({ ok: false, reason: 'ambiguous-extension' })
    expect(resolveEffectStack({ kind: 'strongest' }, new Array(1), stronger)).toMatchObject({
      ok: false,
      reason: 'invalid-effect',
    })
    expect(
      resolveEffectStack(
        { kind: 'extend-duration' },
        [{ ...weaker, duration: Number.MAX_SAFE_INTEGER }],
        stronger
      )
    ).toMatchObject({ ok: false, reason: 'duration-overflow' })
  })
})
