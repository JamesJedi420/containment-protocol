import { describe, expect, it } from 'vitest'
import {
  INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS,
  normalizeIncidentalWitnessSuspicionRecords,
  validateIncidentalWitnessSuspicionRecords,
} from '../src/domain/incidentalWitnessSuspicionRegistry'

describe('incidentalWitnessSuspicionRegistry (SPE-2158)', () => {
  it('accepts fixture records and distinguishes promotion, channel, and suspicion',
    () => {
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
    }
  )

  it('rejects unknown promotion state and duplicate ids',
    () => {
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
      expect(result.issues.some((i) => i.code === 'duplicate_record_id')).toBe(true)
    }
  )

  it('rejects non-array registry',
    () => {
      const result = validateIncidentalWitnessSuspicionRecords({ not: 'array' })
      expect(result.valid).toBe(false)
      expect(result.issues[0].code).toBe('invalid_registry')
    }
  )
})
