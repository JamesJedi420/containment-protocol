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
    expect(
      resolveEffectStack(
        { kind: 'strongest', family: 'family:focus' },
        [{ ...weaker, magnitude: 0, duration: 0 }],
        { ...stronger, magnitude: 0, duration: 0 }
      )
    ).toMatchObject({
      ok: true,
      outcome: 'strongest',
      retained: [{ ...weaker, magnitude: 0, duration: 0 }],
    })
    expect(
      resolveEffectStack({ kind: 'strongest', family: 'family:focus' }, [weaker], stronger)
    ).toMatchObject({
      ok: true,
      outcome: 'strongest',
      retained: [stronger],
    })
    expect(
      resolveEffectStack({ kind: 'strongest', family: 'family:focus' }, [weaker], {
        ...stronger,
        magnitude: 2,
      })
    ).toMatchObject({ ok: true, outcome: 'strongest', retained: [weaker] })
    expect(
      resolveEffectStack({ kind: 'reject-duplicate', family: 'family:focus' }, [weaker], stronger)
    ).toMatchObject({
      ok: true,
      outcome: 'rejected',
      retained: [weaker],
    })
  })

  it('extends duration without increasing the original magnitude', () => {
    expect(
      resolveEffectStack({ kind: 'extend-duration', family: 'family:focus' }, [weaker], stronger)
    ).toMatchObject({
      ok: true,
      outcome: 'extended',
      retained: [{ ...weaker, duration: 7 }],
    })
    expect(
      resolveEffectStack(
        { kind: 'extend-duration', family: 'family:focus' },
        [{ ...weaker, magnitude: 0, duration: 0 }],
        { ...stronger, magnitude: 0, duration: 0 }
      )
    ).toMatchObject({ ok: true, retained: [{ ...weaker, magnitude: 0, duration: 0 }] })
  })

  it('caps the effective total without changing the separate instances', () => {
    expect(
      resolveEffectStack({ kind: 'cap-total', family: 'family:focus', cap: 6 }, [weaker], stronger)
    ).toMatchObject({
      ok: true,
      outcome: 'capped',
      retained: [weaker, stronger],
      effectiveMagnitude: 6,
    })
    const third = { ...weaker, id: 'effect:c', magnitude: 1 }
    expect(
      resolveEffectStack(
        { kind: 'cap-total', family: 'family:focus', cap: 6 },
        [weaker, third],
        stronger
      )
    ).toEqual(
      resolveEffectStack(
        { kind: 'cap-total', family: 'family:focus', cap: 6 },
        [third, weaker],
        stronger
      )
    )
  })

  it('bounds maximum caps and rejects duplicate identities across opposed families', () => {
    expect(
      resolveEffectStack(
        { kind: 'cap-total', family: 'family:focus', cap: Number.MAX_SAFE_INTEGER },
        [{ ...weaker, magnitude: Number.MAX_SAFE_INTEGER }],
        { ...stronger, magnitude: 1 }
      )
    ).toMatchObject({ ok: true, effectiveMagnitude: Number.MAX_SAFE_INTEGER })
    expect(
      resolveEffectStack(
        { kind: 'cancel-opposed', family: 'family:panic', opposedFamily: 'family:calm' },
        [{ ...weaker, family: 'family:calm' }],
        { ...stronger, id: weaker.id, family: 'family:panic' }
      )
    ).toMatchObject({ ok: false, reason: 'duplicate-id' })
  })

  it('cancels one explicitly opposed pair without inferring opposition', () => {
    const calm = { ...weaker, family: 'family:calm' }
    const panic = { ...stronger, family: 'family:panic' }
    expect(
      resolveEffectStack(
        { kind: 'cancel-opposed', family: 'family:panic', opposedFamily: 'family:calm' },
        [],
        panic
      )
    ).toMatchObject({ ok: true, outcome: 'accepted', retained: [panic] })
    expect(
      resolveEffectStack(
        { kind: 'cancel-opposed', family: 'family:other', opposedFamily: 'family:calm' },
        [],
        panic
      )
    ).toMatchObject({ ok: false, reason: 'policy-family-mismatch' })
    expect(
      resolveEffectStack(
        { kind: 'cancel-opposed', family: 'family:panic', opposedFamily: 'family:calm' },
        [calm],
        panic
      )
    ).toMatchObject({ ok: true, outcome: 'canceled', retained: [] })
    expect(
      resolveEffectStack(
        { kind: 'cancel-opposed', family: 'family:panic', opposedFamily: 'family:other' },
        [calm],
        panic
      )
    ).toMatchObject({ ok: false, reason: 'invalid-opposition' })
  })

  it('fails closed on duplicate identities, invalid values and ambiguous extension', () => {
    expect(
      resolveEffectStack({ kind: 'strongest', family: 'family:focus' }, [weaker], weaker)
    ).toMatchObject({
      ok: false,
      reason: 'duplicate-id',
    })
    expect(
      resolveEffectStack({ kind: 'cap-total', family: 'family:focus', cap: -1 }, [weaker], stronger)
    ).toMatchObject({
      ok: false,
      reason: 'invalid-cap',
    })
    expect(
      resolveEffectStack({ kind: 'extend-duration', family: 'family:focus' }, [weaker, stronger], {
        ...stronger,
        id: 'effect:c',
      })
    ).toMatchObject({ ok: false, reason: 'ambiguous-extension' })
    expect(
      resolveEffectStack({ kind: 'strongest', family: 'family:focus' }, new Array(1), stronger)
    ).toMatchObject({
      ok: false,
      reason: 'invalid-effect',
    })
    expect(
      resolveEffectStack(
        { kind: 'extend-duration', family: 'family:focus' },
        [{ ...weaker, duration: Number.MAX_SAFE_INTEGER }],
        stronger
      )
    ).toMatchObject({ ok: false, reason: 'duration-overflow' })
  })
})
