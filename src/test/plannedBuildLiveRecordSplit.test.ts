import { describe, expect, it } from 'vitest'
import { validatePlannedBuildLiveRecordSplit as validate } from '../domain/plannedBuildLiveRecordSplit'

describe('planned and live staff record split', () => {
  const ready = {
    plannedBuildRef: 'plan:one',
    liveRecordRef: 'staff:one',
    promotionGates: [
      { kind: 'clearance', satisfied: true },
      { kind: 'training', satisfied: true },
    ],
  }

  it('accepts linked references only when the caller policy is satisfied', () => {
    const result = validate(ready, ['training', 'clearance'])
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.issues.join(','))
    expect(result.promotionReady).toBe(true)
    expect(result.record).toEqual({ ...ready, promotionGates: [...ready.promotionGates].reverse() })
    expect(Object.isFrozen(result.record.promotionGates[0])).toBe(true)
  })

  it('reports missing and unmet gates for a plan and rejects the same live record', () => {
    const gates = [{ kind: 'training', satisfied: false }]
    const draft = validate({ plannedBuildRef: 'plan:one', promotionGates: gates }, [
      'training',
      'equipment',
    ])
    expect(draft).toMatchObject({
      ok: true,
      promotionReady: false,
      missing: ['equipment'],
      unmet: ['training'],
    })
    expect(
      validate({ plannedBuildRef: 'plan:one', liveRecordRef: 'staff:one', promotionGates: gates }, [
        'training',
        'equipment',
      ])
    ).toEqual({ ok: false, issues: ['live-record-with-unsatisfied-gates'] })
  })

  it('uses only the required kinds supplied by the caller', () => {
    const data = {
      ...ready,
      promotionGates: [
        { kind: 'training', satisfied: true },
        { kind: 'equipment', satisfied: false },
      ],
    }
    expect(validate(data, ['training'])).toMatchObject({ ok: true, promotionReady: true })
    expect(validate(data, ['equipment'])).toEqual({
      ok: false,
      issues: ['live-record-with-unsatisfied-gates'],
    })
  })

  it('rejects malformed, duplicate, and absent policy evidence', () => {
    expect(validate(ready, [])).toMatchObject({ ok: false })
    expect(validate(ready, new Array(1))).toMatchObject({ ok: false })
    const sparse = new Array(2)
    sparse[0] = 'training'
    expect(validate(ready, sparse)).toMatchObject({ ok: false })
    expect(validate(ready, ['training', 'training'])).toMatchObject({ ok: false })
    expect(validate({ ...ready, plannedBuildRef: ' ' }, ['training'])).toMatchObject({ ok: false })
    expect(
      validate(
        {
          ...ready,
          promotionGates: [
            { kind: 'training', satisfied: true },
            { kind: 'training', satisfied: false },
          ],
        },
        ['training']
      )
    ).toMatchObject({ ok: false })
    expect(
      validate({ ...ready, promotionGates: [{ kind: 'training', satisfied: 'yes' }] }, ['training'])
    ).toMatchObject({ ok: false })
    expect(validate(ready, ['unknown'])).toMatchObject({ ok: false })
  })

  it('returns a stable projection independent of caller ordering and later mutation', () => {
    const input = { ...ready, promotionGates: ready.promotionGates.map((gate) => ({ ...gate })) }
    const first = validate(input, ['clearance', 'training'])
    const second = validate({ ...input, promotionGates: [...input.promotionGates].reverse() }, [
      'training',
      'clearance',
    ])
    expect(first).toEqual(second)
    input.promotionGates[0].satisfied = false
    expect(first).toMatchObject({ ok: true, promotionReady: true })
  })
})
