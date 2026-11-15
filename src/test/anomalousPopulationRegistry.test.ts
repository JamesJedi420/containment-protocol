import { describe, expect, it } from 'vitest'
import {
  appendPopulationRevision,
  projectPopulationRecord,
  validatePopulationRecord,
  type AnomalousPopulationRecord,
} from '../domain/anomalousPopulationRegistry'

const base: AnomalousPopulationRecord = {
  registryId: 'pop:test-community',
  displayName: 'Test Community',
  localNames: ['Locals'],
  aliases: [],
  populationKind: 'sapient_community',
  sapienceBand: 'full',
  socialOrganization: 'clan',
  containmentPosture: 'negotiated_coexistence',
  secrecyState: 'restricted',
  publicVisibility: 'low',
  translationStatus: 'translated',
  provenance: 'field',
  confidence: 0.8,
  relatedPopulationIds: [],
  revisions: [],
}

describe('anomalousPopulationRegistry (SPE-2097 slice 1)', () => {
  it('validates a basic record', () => {
    const result = validatePopulationRecord(base)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('requires identity divergence for hidden populations', () => {
    const hidden = { ...base, secrecyState: 'hidden' as const }
    const result = validatePopulationRecord(hidden)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'missing_identity_divergence')).toBe(true)
  })

  it('warns on species_faction_collapse', () => {
    const collapsed = { ...base, linkedFactionIds: ['pop:test-community'] }
    const result = validatePopulationRecord(collapsed)
    expect(result.valid).toBe(true)
    expect(result.issues.some((i) => i.code === 'species_faction_collapse')).toBe(true)
  })

  it('projects deterministically and redacts low clearance', () => {
    const projected = projectPopulationRecord(base, { clearanceLevel: 2 })
    expect(projected.secrecyState).toBeUndefined()
    expect(projected.redactedFields).toContain('secrecyState')

    const again = projectPopulationRecord(base, { clearanceLevel: 2 })
    expect(JSON.stringify(again)).toBe(JSON.stringify(projected))
  })

  it('redacts classification on untranslated low clearance', () => {
    const untrans = { ...base, translationStatus: 'untranslated' as const }
    const projected = projectPopulationRecord(untrans, { clearanceLevel: 3 })
    expect(projected.populationKind).toBe('disputed_taxon')
    expect(projected.redactedFields).toContain('populationKind')
  })

  it('appends revision without overwriting', () => {
    const revised = appendPopulationRevision(base, 5, 'posture_change', 'containmentPosture:negotiated_coexistence')
    expect(revised.revisions).toHaveLength(1)
    expect(revised.revisions[0].week).toBe(5)
    expect(revised.containmentPosture).toBe(base.containmentPosture)
  })

  it('warns on duplicate local names', () => {
    const dup = { ...base, localNames: ['Locals', 'locals'] }
    const result = validatePopulationRecord(dup)
    expect(result.issues.some((i) => i.code === 'duplicate_normalized_local_name')).toBe(true)
  })
})
