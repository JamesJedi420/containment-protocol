import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_SCHEMA_DATA_PACK_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
  evaluateModifiableDataPackValidation,
  INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
  PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
  validateModifiableDataPackPayload,
} from '../domain/modifiableDataPackValidation'

describe('modifiableDataPackValidation (SPE-2479 slice 1)', () => {
  it('applies the canonical data-pack fixture with stable pack metadata', () => {
    const decision = evaluateModifiableDataPackValidation(CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE)

    expect(decision.status).toBe('applied')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.packMetadata).toEqual({
      packId: 'datapack:tuning-containment-thresholds',
      schemaVersion: '1.1.0',
      packKind: 'tuning_table',
      authorRef: 'contributor:agent-maintainer',
      sectionCount: 3,
      issueLink: 'SPE-2479',
    })
  })

  it('rejects corrupt structure with deterministic reason codes', () => {
    const decision = evaluateModifiableDataPackValidation(INVALID_MODIFIABLE_DATA_PACK_FIXTURE)

    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual([
      'default_value_type_mismatch',
      'duplicate_section_keys',
      'invalid_field_type',
      'invalid_modifiable_section_shape',
      'invalid_pack_kind',
      'invalid_schema_version',
      'missing_pack_id',
    ])
    expect(decision.validationIssues.map((issue) => issue.code)).toEqual(decision.reasonCodes)
    expect(decision.remediationNotes).toEqual([])
    expect(decision.packMetadata).toBeUndefined()
  })

  it('rejects partial schema payloads with missing required section keys', () => {
    const decision = evaluateModifiableDataPackValidation(PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE)

    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['missing_section_key'])
    expect(decision.packMetadata).toBeUndefined()
  })

  it('returns needs_revision for borderline schema versions', () => {
    const decision = evaluateModifiableDataPackValidation(BORDERLINE_SCHEMA_DATA_PACK_FIXTURE)

    expect(decision.status).toBe('needs_revision')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual(['schema_version_borderline'])
    expect(decision.remediationNotes).toHaveLength(1)
    expect(decision.remediationNotes[0]?.code).toBe('schema_version_borderline')
    expect(decision.packMetadata).toEqual({
      packId: 'datapack:reference-sheet-borderline',
      schemaVersion: '1.0.0',
      packKind: 'reference_sheet',
      authorRef: 'contributor:community-author',
      sectionCount: 2,
      issueLink: 'SPE-75',
    })
  })

  it('safe-fails malformed payloads without throw', () => {
    const validation = validateModifiableDataPackPayload(null as unknown as never)
    const decision = evaluateModifiableDataPackValidation(undefined as unknown as never)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_payload')
    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['invalid_payload'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const payloads = [
      CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
      BORDERLINE_SCHEMA_DATA_PACK_FIXTURE,
      INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
      PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
    ] as const

    for (const payload of payloads) {
      const first = evaluateModifiableDataPackValidation(payload)
      const second = evaluateModifiableDataPackValidation(payload)

      expect(first).toEqual(second)
    }
  })
})
