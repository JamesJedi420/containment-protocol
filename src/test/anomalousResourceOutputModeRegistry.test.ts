import { describe, expect, it } from 'vitest'
import {
  ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES,
  normalizeAnomalousResourceOutputModes,
  validateAnomalousResourceOutputModes,
} from '../domain/anomalousResourceOutputModeRegistry'

describe('anomalousResourceOutputModeRegistry (SPE-2195 slice 1)', () => {
  it('accepts fixture records with legal modes, rates, interfaces, hazards, refs and occurrence identities', () => {
    expect(validateAnomalousResourceOutputModes(ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES)).toEqual({
      valid: true,
      issues: [],
    })
    const normalized = normalizeAnomalousResourceOutputModes(ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES)
    expect(normalized).not.toBeNull()
    expect(normalized!.map((r) => r.id)).toEqual(['generator-alpha', 'generator-beta'])
  })

  it('rejects unknown output mode', () => {
    const bad = [{ ...ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES[0], outputMode: 'invalid' }]
    const result = validateAnomalousResourceOutputModes(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'unknown_output_mode')).toBe(true)
  })

  it('rejects invalid flow rate', () => {
    const bad = [{ ...ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES[0], flowRate: -1 }]
    const result = validateAnomalousResourceOutputModes(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_flow_rate')).toBe(true)
  })

  it('rejects invalid canonical resource reference', () => {
    const bad = [{ ...ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES[0], canonicalResourceRef: 'not-a-ref' }]
    const result = validateAnomalousResourceOutputModes(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_canonical_resource_ref')).toBe(true)
  })

  it('rejects duplicate ids', () => {
    const dup = [ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES[0], ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES[0]]
    const result = validateAnomalousResourceOutputModes(dup)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'duplicate_id')).toBe(true)
  })

  it('produces byte-stable normalized output for equivalent inputs', () => {
    const a = normalizeAnomalousResourceOutputModes(ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES)
    const b = normalizeAnomalousResourceOutputModes([...ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES].reverse())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
