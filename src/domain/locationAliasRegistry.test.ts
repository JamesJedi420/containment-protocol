import { describe, expect, it } from 'vitest'
import {
  LOCATION_ALIAS_FIXTURE_RECORDS,
  normalizeLocationAliasRecords,
  resolveLocationAlias,
  validateLocationAliasRecords,
} from './locationAliasRegistry'

describe('locationAliasRegistry', () => {
  it('accepts fixture records and resolves aliases deterministically', () => {
    const validation = validateLocationAliasRecords(LOCATION_ALIAS_FIXTURE_RECORDS)
    expect(validation.valid).toBe(true)
    expect(validation.issues).toEqual([])

    const normalized = normalizeLocationAliasRecords(LOCATION_ALIAS_FIXTURE_RECORDS)
    expect(normalized).not.toBeNull()
    expect(normalized).toHaveLength(2)

    expect(resolveLocationAlias('Old Depot', LOCATION_ALIAS_FIXTURE_RECORDS)).toBe(
      'civic-node-central-station'
    )
    expect(resolveLocationAlias('the hall', LOCATION_ALIAS_FIXTURE_RECORDS)).toBe(
      'institution-city-hall'
    )
    expect(resolveLocationAlias('unknown place', LOCATION_ALIAS_FIXTURE_RECORDS)).toBeNull()
  })

  it('rejects duplicate aliases and invalid ids', () => {
    const bad = [
      {
        canonicalId: 'node-a',
        aliases: ['Alpha', 'alpha'],
        kind: 'location',
      },
      {
        canonicalId: 'node-b',
        aliases: ['Alpha'],
        kind: 'location',
      },
    ]
    const validation = validateLocationAliasRecords(bad)
    expect(validation.valid).toBe(false)
    expect(validation.issues.some((i) => i.code === 'duplicate_alias')).toBe(true)

    const invalidId = [
      {
        canonicalId: 'Invalid ID',
        aliases: ['something'],
        kind: 'location',
      },
    ]
    const idValidation = validateLocationAliasRecords(invalidId)
    expect(idValidation.valid).toBe(false)
    expect(idValidation.issues.some((i) => i.code === 'invalid_canonical_id')).toBe(true)
  })

  it('rejects empty aliases and unknown kind', () => {
    const empty = [
      {
        canonicalId: 'node-empty',
        aliases: [],
        kind: 'location',
      },
    ]
    expect(validateLocationAliasRecords(empty).valid).toBe(false)

    const badKind = [
      {
        canonicalId: 'node-kind',
        aliases: ['ok'],
        kind: 'unknown',
      },
    ]
    const result = validateLocationAliasRecords(badKind)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'unknown_kind')).toBe(true)
  })

  it('produces byte-stable normalized output', () => {
    const input = [
      {
        canonicalId: 'z-node',
        aliases: ['Zed', 'Alpha'],
        kind: 'artifact',
      },
      {
        canonicalId: 'a-node',
        aliases: ['Bee'],
        kind: 'procedure',
      },
    ]
    const first = normalizeLocationAliasRecords(input)
    const second = normalizeLocationAliasRecords(input)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first?.[0]?.canonicalId).toBe('a-node')
    expect(first?.[0]?.aliases).toEqual(['Bee'])
  })
})
