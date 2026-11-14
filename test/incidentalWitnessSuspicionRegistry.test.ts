import { describe, expect, it } from 'vitest'
import {
  INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS,
  normalizeIncidentalWitnessSuspicionRecords,
  validateIncidentalWitnessSuspicionRecords,
} from '../src/domain/incidentalWitnessSuspicionRegistry'

describe('incidentalWitnessSuspicionRegistry (SPE-2158)', () => {
  it('accepts fixture records and distinguishes promotion, channel, and suspicion', () => {
    const result = validateIncidentalWitnessSuspicionRecords(
      INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS
    )
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)

    const normalized = normalizeIncidentalWitnessSuspicionRecords(
      INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS
    )
    expect(normalized).not.toBeNull()
    expect(normalized![0].witnessPromotionState).toBe('incidental')
    expect(normalized![0].detectionChannel).toBe('secondary_report')
    expect(normalized![0].suspicionBand).toBe('low')
    expect(normalized![0].delayedActionRefs).toHaveLength(1)
    expect(normalized![1].witnessPromotionState).toBe('promoted_durable')
  })

  it('rejects unknown promotion state', () => {
    const bad = [
      {
        id: 'witness-suspicion:bad',
        witnessActorRef: 'actor:bad',
        witnessPromotionState: 'not-a-state',
        detectionChannel: 'direct_observation',
        suspicionBand: 'none',
        delayedActionRefs: [],
      },
      {
        id: 'witness-suspicion:bad',
        witnessActorRef: 'actor:bad2',
        witnessPromotionState: 'incidental',
        detectionChannel: 'direct_observation',
        suspicionBand: 'none',
        delayedActionRefs: [],
      },
    ]
    const result = validateIncidentalWitnessSuspicionRecords(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'unknown_promotion_state')).toBe(true)
  })

  it('rejects duplicate canonical ids independently of malformed fields', () => {
    const original = INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS[0]!
    const duplicate = { ...original, id: ` ${original.id} ` }
    const input = [original, duplicate]
    expect(
      validateIncidentalWitnessSuspicionRecords(input).issues.some(
        (i) => i.code === 'duplicate_record_id'
      )
    ).toBe(true)
    expect(normalizeIncidentalWitnessSuspicionRecords(input)).toBeNull()
  })

  it('normalizes deterministically and freezes copied delayed metadata without executing it', () => {
    const original = INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS
    const input = original
      .map((record) => ({
        ...record,
        id: ` ${record.id} `,
        witnessActorRef: ` ${record.witnessActorRef} `,
      }))
      .reverse()
    const snapshot = JSON.stringify(input)
    const normalized = normalizeIncidentalWitnessSuspicionRecords(input)!
    expect(normalized).toEqual(normalizeIncidentalWitnessSuspicionRecords(original))
    expect(JSON.stringify(input)).toBe(snapshot)
    expect(Object.isFrozen(normalized)).toBe(true)
    expect(Object.isFrozen(normalized[0])).toBe(true)
    expect(Object.isFrozen(normalized[0]!.delayedActionRefs)).toBe(true)
    expect(Object.isFrozen(normalized[0]!.delayedActionRefs[0])).toBe(true)
    expect(normalized[0]!.delayedActionRefs[0]).not.toBe(original[0]!.delayedActionRefs[0])
    expect(normalizeIncidentalWitnessSuspicionRecords([])).toEqual([])
  })

  it.each([-1, 0.5, Infinity, NaN, '3', null])(
    'rejects invalid delayed step metadata %s',
    (dueAfterSteps) => {
      const input = [
        {
          ...INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS[0]!,
          delayedActionRefs: [
            { refId: 'action:follow-up', actionKind: 'interview', dueAfterSteps },
          ],
        },
      ]
      expect(
        validateIncidentalWitnessSuspicionRecords(input).issues.some(
          (i) => i.code === 'invalid_due_after_steps'
        )
      ).toBe(true)
    }
  )

  it('rejects malformed records and delayed refs without returning null elements', () => {
    for (const entry of [
      null,
      3,
      [],
      { ...INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS[0]!, delayedActionRefs: [null] },
    ]) {
      expect(validateIncidentalWitnessSuspicionRecords([entry]).valid).toBe(false)
    }
    const original = INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS[0]!
    class RecordWithFields {
      constructor() {
        Object.assign(this, original)
      }
    }
    expect(validateIncidentalWitnessSuspicionRecords([new RecordWithFields()]).valid).toBe(true)
    let reads = 0
    const changing = { ...original }
    Object.defineProperty(changing, 'suspicionBand', {
      get: () => (reads++ === 0 ? 'low' : 'invalid'),
    })
    expect(normalizeIncidentalWitnessSuspicionRecords([changing])).toEqual([original])
    expect(reads).toBe(1)
  })

  it.each(['detectionChannel', 'suspicionBand'])('rejects an unknown %s', (field) => {
    expect(
      validateIncidentalWitnessSuspicionRecords([
        { ...INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS[0]!, [field]: 'unknown' },
      ]).valid
    ).toBe(false)
  })

  it('preserves zero and omitted delayed step counts', () => {
    const original = INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS[0]!
    const input = [
      {
        ...original,
        delayedActionRefs: [
          { refId: 'action:zero', actionKind: 'interview', dueAfterSteps: 0 },
          { refId: 'action:later', actionKind: 'interview' },
        ],
      },
    ]
    expect(normalizeIncidentalWitnessSuspicionRecords(input)?.[0]?.delayedActionRefs).toEqual(
      input[0]!.delayedActionRefs
    )
  })

  it('rejects non-array registry', () => {
    const result = validateIncidentalWitnessSuspicionRecords({ not: 'array' })
    expect(result.valid).toBe(false)
    expect(result.issues[0].code).toBe('invalid_registry')
  })
})
