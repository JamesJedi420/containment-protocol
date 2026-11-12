import { describe, expect, it } from 'vitest'
import {
  AWARENESS_LEVELS,
  DISCLOSURE_PROGRESSION_FIXTURE,
  FALLOUT_PHASES,
  NORMALIZATION_INPUT_FIXTURE,
  NORMALIZATION_INPUT_KINDS,
  projectDisclosureRegionalView,
  validatePublicDisclosureRecord,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'

function baseRecord(
  overrides: Partial<PublicDisclosureRecord> = {}
): PublicDisclosureRecord {
  return {
    id: 'disclosure:test-base',
    label: 'Test base record',
    awarenessLevel: 'secrecy_intact',
    falloutPhase: 'crisis',
    ...overrides,
  }
}

describe('publicDisclosureStateRegistry (SPE-2109 slice 1)', () => {
  it('validates fixture with credible_leak → public_scandal → official_disclosure history preserved', () => {
    const result = validatePublicDisclosureRecord(DISCLOSURE_PROGRESSION_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(DISCLOSURE_PROGRESSION_FIXTURE.transitionHistory).toHaveLength(3)
    expect(DISCLOSURE_PROGRESSION_FIXTURE.transitionHistory?.[0]?.toAwarenessLevel).toBe(
      'credible_leak'
    )
    expect(DISCLOSURE_PROGRESSION_FIXTURE.transitionHistory?.[1]?.toAwarenessLevel).toBe(
      'public_scandal'
    )
    expect(DISCLOSURE_PROGRESSION_FIXTURE.transitionHistory?.[2]?.toAwarenessLevel).toBe(
      'official_disclosure'
    )
    expect(DISCLOSURE_PROGRESSION_FIXTURE.awarenessLevel).toBe('official_disclosure')
  })

  it('allows operational_success and secrecy_failure to coexist on linked contract ref', () => {
    const hook = DISCLOSURE_PROGRESSION_FIXTURE.linkedContractOutcomes?.[0]

    expect(hook?.operationalSuccess).toBe(true)
    expect(hook?.secrecyFailure).toBe(true)
    expect(hook?.contractRef).toBeTruthy()

    const result = validatePublicDisclosureRecord(DISCLOSURE_PROGRESSION_FIXTURE)
    expect(result.valid).toBe(true)
  })

  it('warns when coverCapacityFailure lacks justification ref', () => {
    const result = validatePublicDisclosureRecord(
      baseRecord({
        coverCapacityFailure: true,
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'cover_capacity_failure_without_justification_ref',
        severity: 'warning',
      }),
    ])
  })

  it('round-trips regional trust scores on validation', () => {
    const result = validatePublicDisclosureRecord(DISCLOSURE_PROGRESSION_FIXTURE)

    expect(result.valid).toBe(true)
    expect(DISCLOSURE_PROGRESSION_FIXTURE.trustByRegion).toEqual([
      { regionRef: 'region:coastal-metro', trustScore: 0.31 },
      { regionRef: 'region:inland-corridor', trustScore: 0.52 },
    ])
  })

  it('represents anomaly tourism normalization input without location registry ownership', () => {
    const result = validatePublicDisclosureRecord(NORMALIZATION_INPUT_FIXTURE)

    expect(result.valid).toBe(true)
    expect(NORMALIZATION_INPUT_FIXTURE.normalizationInputs?.[0]?.kind).toBe('anomaly_tourism')
    expect(NORMALIZATION_INPUT_FIXTURE.normalizationInputs?.[0]?.ref).toMatch(/^program:/)
    expect(NORMALIZATION_INPUT_FIXTURE.awarenessLevel).toBe('normalization')
    expect(NORMALIZATION_INPUT_FIXTURE.falloutPhase).toBe('commerce')
  })

  it('warns when official_disclosure lacks prior credible_leak or public_scandal in history', () => {
    const result = validatePublicDisclosureRecord(
      baseRecord({
        awarenessLevel: 'official_disclosure',
        falloutPhase: 'disclosure',
        transitionHistory: [
          {
            fromAwarenessLevel: 'secrecy_intact',
            toAwarenessLevel: 'local_rumor',
            week: 10,
          },
        ],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'official_disclosure_without_prior_leak_or_scandal',
        severity: 'warning',
      }),
    ])
  })

  it('warns when normalization awareness lacks reform or commerce fallout phase', () => {
    const result = validatePublicDisclosureRecord(
      baseRecord({
        awarenessLevel: 'normalization',
        falloutPhase: 'crisis',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'normalization_awareness_without_reform_or_commerce_phase',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise label token in record fields', () => {
    const result = validatePublicDisclosureRecord(
      baseRecord({
        label: 'Foundation breach response',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('projects regional trust view without asserting objective truth', () => {
    const projection = projectDisclosureRegionalView(DISCLOSURE_PROGRESSION_FIXTURE)

    expect(projection.publicAwarenessHint).toBe('official_disclosure')
    expect(projection.regionalTrust).toHaveLength(2)
    expect(projection.regionalTrust[0]?.regionRef).toBe('region:coastal-metro')
    expect(projection.regionalTrust[0]?.trustScore).toBe(0.31)
    expect(projection.label).not.toMatch(/foundation|scp|masquerade/i)
  })

  it('projects regional trust with policy redaction', () => {
    const record = baseRecord({
      trustByRegion: [{ regionRef: 'region:test', trustScore: 0.25 }],
      oversightPressure: 0.8,
      confidence: 0.35,
      redactedFields: ['trust:region:test', 'oversightPressure'],
      unknownFields: ['confidence'],
    })

    const projection = projectDisclosureRegionalView(record, {
      minimumTrustScore: 0.5,
      redactUnknown: true,
    })

    expect(projection.regionalTrust[0]?.trustScore).toBeNull()
    expect(projection.regionalTrust[0]?.redacted).toBe(true)
    expect(projection.oversightPressure).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('round-trips awarenessLevel and falloutPhase unions on validation', () => {
    const record = baseRecord({
      awarenessLevel: 'credible_leak',
      falloutPhase: 'leak',
      normalizationInputs: NORMALIZATION_INPUT_KINDS.map((kind) => ({
        kind,
        descriptor: `${kind}-descriptor`,
      })),
    })

    const result = validatePublicDisclosureRecord(record)

    expect(result.valid).toBe(true)
    expect(AWARENESS_LEVELS).toContain(record.awarenessLevel)
    expect(FALLOUT_PHASES).toContain(record.falloutPhase)
    expect(record.normalizationInputs).toHaveLength(NORMALIZATION_INPUT_KINDS.length)
  })

  it('validates untrusted payloads without throwing when fields are missing or nullish', () => {
    const result = validatePublicDisclosureRecord({} as PublicDisclosureRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      ['invalid_awareness_level', 'invalid_fallout_phase', 'missing_id', 'missing_label'].sort()
    )
  })

  it('validates malformed array fields without throwing on untrusted payloads', () => {
    const result = validatePublicDisclosureRecord({
      id: 'disclosure:malformed',
      label: 'Malformed payload',
      awarenessLevel: 'local_rumor',
      falloutPhase: 'leak',
      trustByRegion: null as unknown as PublicDisclosureRecord['trustByRegion'],
      transitionHistory: 'invalid' as unknown as PublicDisclosureRecord['transitionHistory'],
      normalizationInputs: undefined,
    })

    expect(result.valid).toBe(true)
  })

  it('projects regional view without throwing when array metadata is malformed', () => {
    const projection = projectDisclosureRegionalView({
      id: 'disclosure:malformed-projection',
      label: 'Malformed projection payload',
      awarenessLevel: 'local_rumor',
      falloutPhase: 'leak',
      trustByRegion: 'invalid' as unknown as PublicDisclosureRecord['trustByRegion'],
      unknownFields: [42, null, 'confidence'] as unknown as PublicDisclosureRecord['unknownFields'],
      redactedFields: 'summary' as unknown as PublicDisclosureRecord['redactedFields'],
    })

    expect(projection.regionalTrust).toEqual([])
    expect(projection.unknownFields).toEqual(['confidence'])
  })

  it('sets projection redacted when confidence is below minimumConfidence threshold', () => {
    const projection = projectDisclosureRegionalView(
      baseRecord({
        confidence: 0.35,
      }),
      { minimumConfidence: 0.5 }
    )

    expect(projection.confidence).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      awarenessLevel: 'public_scandal',
      falloutPhase: 'disclosure',
      coverCapacityFailure: true,
      trustByRegion: [{ regionRef: 'region:delta', trustScore: 0.41 }],
    })

    const first = JSON.stringify(validatePublicDisclosureRecord(record))
    const second = JSON.stringify(validatePublicDisclosureRecord(record))

    expect(first).toBe(second)
  })
})
