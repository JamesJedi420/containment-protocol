import { describe, expect, it } from 'vitest'
import {
  DISPOSITION_CHAIN_ITEM_FIXTURE,
  FALSE_POSITIVE_ITEM_FIXTURE,
  MINOR_ANOMALY_DISPOSITIONS,
  projectMinorAnomalyForOperator,
  validateMinorAnomalyRecord,
  type MinorAnomalyRecord,
} from '../domain/minorAnomalyItemRegistry'

function baseRecord(overrides: Partial<MinorAnomalyRecord> = {}): MinorAnomalyRecord {
  return {
    id: 'item:test-base',
    label: 'Test base item',
    disposition: 'recovered',
    latentRiskScore: 12,
    ...overrides,
  }
}

describe('minorAnomalyItemRegistry (SPE-2104 slice 1)', () => {
  it('validates disposition chain fixture recovered → stored → staff_use with statusHistory', () => {
    const result = validateMinorAnomalyRecord(DISPOSITION_CHAIN_ITEM_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(DISPOSITION_CHAIN_ITEM_FIXTURE.disposition).toBe('staff_use')
    expect(DISPOSITION_CHAIN_ITEM_FIXTURE.statusHistory).toEqual([
      { fromDisposition: 'recovered', toDisposition: 'stored', week: 9, note: 'Logged in low-priority vault.' },
      { fromDisposition: 'stored', toDisposition: 'staff_use', week: 22, note: 'Issued for calibration drills.' },
    ])
  })

  it('validates false_positive_returned when investigationRef is present', () => {
    const result = validateMinorAnomalyRecord(FALSE_POSITIVE_ITEM_FIXTURE)

    expect(result.valid).toBe(true)
    expect(FALSE_POSITIVE_ITEM_FIXTURE.disposition).toBe('false_positive_returned')
    expect(FALSE_POSITIVE_ITEM_FIXTURE.investigationRef).toBe('investigation:false-positive-key-blank-41')
  })

  it('errors when false_positive_returned lacks investigationRef', () => {
    const result = validateMinorAnomalyRecord(
      baseRecord({
        disposition: 'false_positive_returned',
        statusHistory: [
          {
            fromDisposition: 'under_investigation',
            toDisposition: 'false_positive_returned',
            week: 10,
          },
        ],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'false_positive_without_investigation_ref',
        severity: 'error',
      }),
    ])
  })

  it('warns on legacy status without history on multi-step disposition', () => {
    const result = validateMinorAnomalyRecord(
      baseRecord({
        disposition: 'staff_use',
        status: 'staff_use',
        latentRiskScore: 10,
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'legacy_status_without_history',
          severity: 'warning',
        }),
        expect.objectContaining({
          code: 'status_history_missing_on_revised_disposition',
          severity: 'error',
        }),
      ])
    )
  })

  it('warns on latent_risk_underestimate for lowValue with score 0 and public disruption hook', () => {
    const result = validateMinorAnomalyRecord(
      baseRecord({
        lowValue: true,
        latentRiskScore: 0,
        publicDisruptionRef: 'disruption:civic-plaza-rumor',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'latent_risk_underestimate',
        severity: 'warning',
      }),
    ])
  })

  it('errors on destroyed without authorization when policy requires it', () => {
    const result = validateMinorAnomalyRecord(
      baseRecord({
        disposition: 'destroyed',
        statusHistory: [{ fromDisposition: 'stored', toDisposition: 'destroyed', week: 30 }],
      }),
      { requireDestructionAuthorization: true }
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'destroyed_without_authorization',
        severity: 'error',
      }),
    ])
  })

  it('accepts destroyed when destructionAuthorizationRef is present under strict policy', () => {
    const result = validateMinorAnomalyRecord(
      baseRecord({
        disposition: 'destroyed',
        destructionAuthorizationRef: 'auth:field-destruction-9',
        statusHistory: [{ fromDisposition: 'stored', toDisposition: 'destroyed', week: 30 }],
      }),
      { requireDestructionAuthorization: true }
    )

    expect(result.valid).toBe(true)
  })

  it('errors when revised disposition lacks statusHistory', () => {
    const result = validateMinorAnomalyRecord(
      baseRecord({
        disposition: 'stored',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'status_history_missing_on_revised_disposition',
        severity: 'error',
      }),
    ])
  })

  it('round-trips disposition enum on validation', () => {
    for (const disposition of MINOR_ANOMALY_DISPOSITIONS) {
      const needsHistory = disposition !== 'recovered' && disposition !== 'pending_review'
      const record = baseRecord({
        disposition,
        ...(disposition === 'false_positive_returned'
          ? { investigationRef: 'investigation:test' }
          : {}),
        ...(needsHistory
          ? {
              statusHistory: [
                { fromDisposition: 'recovered', toDisposition: disposition, week: 1 },
              ],
            }
          : {}),
        ...(disposition === 'destroyed'
          ? { destructionAuthorizationRef: 'auth:test' }
          : {}),
      })

      const result = validateMinorAnomalyRecord(record, {
        requireDestructionAuthorization: disposition === 'destroyed',
      })

      expect(result.valid).toBe(true)
    }
  })

  it('projects recovery site separately from suspected origin for operator surfaces', () => {
    const projection = projectMinorAnomalyForOperator(DISPOSITION_CHAIN_ITEM_FIXTURE)

    expect(projection).toEqual({
      itemId: 'item:ceramic-whistle-fragment',
      recoverySiteRef: 'site:archive-basement-locker',
      suspectedOriginRef: 'site:riverside-flea-stall',
      currentCustodyRef: 'custody:staff-locker-12',
      disposition: 'staff_use',
      confidence: 0.58,
      redacted: false,
      unknownFields: [],
    })
  })

  it('keeps redacted recovery and origin refs visible when suppress policy is false', () => {
    const redactedRecord = baseRecord({
      recoverySiteRef: 'site:restricted-vault',
      suspectedOriginRef: 'site:unknown-stall',
      redactedFields: ['recoverySiteRef', 'suspectedOriginRef'],
    })

    const projection = projectMinorAnomalyForOperator(redactedRecord, {
      suppressRedactedRecoverySite: false,
      suppressRedactedOrigin: false,
    })

    expect(projection.recoverySiteRef).toBe('site:restricted-vault')
    expect(projection.suspectedOriginRef).toBe('site:unknown-stall')
  })

  it('warns when lowValue is set without a declared latentRiskScore on untrusted payloads', () => {
    const result = validateMinorAnomalyRecord({
      id: 'item:unscored-trinket',
      label: 'Unscored trinket',
      disposition: 'recovered',
      lowValue: true,
    } as MinorAnomalyRecord)

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'low_value_without_latent_risk_score',
        severity: 'warning',
      }),
    ])
    expect(result.issues.some((issue) => issue.code === 'invalid_latent_risk_score')).toBe(false)
  })

  it('respects operator projection policy minimum confidence and redaction', () => {
    const redactedRecord = baseRecord({
      recoverySiteRef: 'site:restricted-vault',
      suspectedOriginRef: 'site:unknown-stall',
      currentCustodyRef: 'custody:sealed-bin',
      confidence: 0.4,
      redactedFields: ['recoverySiteRef', 'suspectedOriginRef'],
      unknownFields: ['confidence'],
    })

    const projection = projectMinorAnomalyForOperator(redactedRecord, {
      minimumConfidence: 0.5,
      redactUnknown: true,
      suppressRedactedRecoverySite: true,
      suppressRedactedOrigin: true,
    })

    expect(projection.recoverySiteRef).toBeNull()
    expect(projection.suspectedOriginRef).toBeNull()
    expect(projection.confidence).toBeNull()
    expect(projection.redacted).toBe(true)
    expect(projection.unknownFields).toEqual(['confidence'])
  })

  it('validates untrusted payloads without throwing when fields are missing or nullish', () => {
    const result = validateMinorAnomalyRecord({} as MinorAnomalyRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'invalid_disposition',
        'invalid_latent_risk_score',
        'missing_id',
        'missing_label',
      ].sort()
    )
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      disposition: 'assigned',
      status: 'assigned',
      statusHistory: [{ fromDisposition: 'stored', toDisposition: 'assigned', week: 15 }],
      lowValue: true,
      latentRiskScore: 0,
      publicDisruptionRef: 'disruption:loading-dock',
    })

    const first = JSON.stringify(validateMinorAnomalyRecord(record))
    const second = JSON.stringify(validateMinorAnomalyRecord(record))

    expect(first).toBe(second)
  })
})
