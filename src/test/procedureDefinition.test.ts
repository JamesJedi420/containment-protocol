import { describe, it, expect } from 'vitest'
import {
  validateProcedureDefinition,
  deriveProcedureActivationSummary,
  BINDING_SIGIL,
  RESONANCE_CONSTRUCT,
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
} from '../domain/procedureDefinition'
import type { ProcedureDefinition } from '../domain/procedureDefinition'

// ─── Shared fixture helpers ───────────────────────────────────────────────────

/** Minimal valid non-summoning procedure for edge-case tests. */
function makeMinimalProcedure(overrides: Partial<ProcedureDefinition> = {}): ProcedureDefinition {
  return {
    procedureId: 'test_ward',
    canonicalName: 'Test Ward',
    aliases: [],
    taxonomy: {
      intent: 'protection',
      effectDomain: 'physical',
      executionMethod: 'ritual',
      originTradition: null,
    },
    tier: 1,
    requirements: {
      speech: 'none',
      gesture: 'none',
      toolTags: [],
      reagents: [],
      requiresDiagram: false,
      deviceTags: [],
      environmentalConditions: [],
    },
    activationTiming: 'one_action',
    targeting: {
      geometry: 'self',
      rangeMeters: null,
      resistance: 'none',
      voluntaryResistanceSuppression: false,
      coverSensitive: false,
    },
    persistence: {
      duration: { value: 1, unit: 'hours', maintainable: false },
      dismissible: false,
      expiryState: null,
    },
    restrictions: {
      forbiddenRoles: [],
      requiredCertifications: [],
      requiresSpecialistAccess: false,
      usageCap: null,
    },
    provenance: {
      sourceSystem: 'field_manual',
      acquiredViaResearch: false,
      researchDiscipline: null,
      restrictedFaction: null,
    },
    availability: { rating: 'common' },
    schemaVersion: PROCEDURE_DEFINITION_SCHEMA_VERSION,
    ...overrides,
  }
}

// ─── Validation — valid records ───────────────────────────────────────────────

describe('validateProcedureDefinition — valid records', () => {
  it('accepts BINDING_SIGIL with all canonical fields intact', () => {
    const result = validateProcedureDefinition(BINDING_SIGIL)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.procedureId).toBe('binding_sigil')
    expect(result.definition.canonicalName).toBe('Binding Sigil')
    expect(result.definition.taxonomy.intent).toBe('suppression')
    expect(result.definition.taxonomy.effectDomain).toBe('spiritual')
    expect(result.definition.taxonomy.executionMethod).toBe('ritual')
    expect(result.definition.taxonomy.originTradition).toBe('hermetic')
    expect(result.definition.tier).toBe(3)
    expect(result.definition.activationTiming).toBe('ritual_hours')
    expect(result.definition.targeting.geometry).toBe('single_target')
    expect(result.definition.targeting.rangeMeters).toBe(5)
    expect(result.definition.targeting.resistance).toBe('contested_will')
    expect(result.definition.persistence.duration.value).toBe(24)
    expect(result.definition.persistence.duration.unit).toBe('hours')
    expect(result.definition.restrictions.requiredCertifications).toContain('occult_theory_2')
    expect(result.definition.provenance.sourceSystem).toBe('hermetic_codex')
    expect(result.definition.provenance.acquiredViaResearch).toBe(true)
    expect(result.definition.availability.rating).toBe('uncommon')
    expect(result.definition.availability.sourceCount).toBe(3)
  })

  it('accepts RESONANCE_CONSTRUCT with entity payload and restricted availability', () => {
    const result = validateProcedureDefinition(RESONANCE_CONSTRUCT)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.taxonomy.intent).toBe('summoning')
    expect(result.definition.entityPayload).toBeDefined()
    expect(result.definition.entityPayload?.entityTypeTag).toBe('animate_construct')
    expect(result.definition.entityPayload?.dispositionDefault).toBe('controlled')
    expect(result.definition.entityPayload?.boundToOperator).toBe(true)
    expect(result.definition.availability.rating).toBe('restricted')
    expect(result.definition.restrictions.requiresSpecialistAccess).toBe(true)
    expect(result.definition.provenance.restrictedFaction).toBe('tech_division')
  })

  it('accepts a minimal procedure with no optional fields', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure())
    expect(result.ok).toBe(true)
  })

  it('trims procedureId and canonicalName in validated output', () => {
    const result = validateProcedureDefinition(
      makeMinimalProcedure({
        procedureId: '  trimmed_procedure  ',
        canonicalName: '  Trimmed Procedure Name  ',
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.procedureId).toBe('trimmed_procedure')
    expect(result.definition.canonicalName).toBe('Trimmed Procedure Name')
  })

  it('accepts tier values 1 through 5', () => {
    const tiers = [1, 2, 3, 4, 5] as const
    for (const tier of tiers) {
      const result = validateProcedureDefinition(makeMinimalProcedure({ tier }))
      expect(result.ok).toBe(true)
    }
  })
})

// ─── Validation — invalid records ────────────────────────────────────────────

describe('validateProcedureDefinition — invalid records', () => {
  it('returns empty_procedure_id for blank procedureId', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure({ procedureId: '   ' }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('empty_procedure_id')
    expect(result.field).toBe('procedureId')
  })

  it('returns empty_canonical_name for blank canonicalName', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure({ canonicalName: '' }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('empty_canonical_name')
    expect(result.field).toBe('canonicalName')
  })

  it('returns empty_canonical_name for whitespace-only canonicalName', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure({ canonicalName: '   ' }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('empty_canonical_name')
    expect(result.field).toBe('canonicalName')
  })

  it('returns invalid_tier for tier value 0', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure({ tier: 0 as 1 }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('invalid_tier')
    expect(result.field).toBe('tier')
  })

  it('returns invalid_tier for tier value 6', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure({ tier: 6 as 5 }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('invalid_tier')
  })

  it('returns invalid_taxonomy_combination for martial execution with required speech', () => {
    const result = validateProcedureDefinition(
      makeMinimalProcedure({
        taxonomy: {
          intent: 'disruption',
          effectDomain: 'physical',
          executionMethod: 'martial',
          originTradition: null,
        },
        requirements: {
          speech: 'required',
          gesture: 'none',
          toolTags: [],
          reagents: [],
          requiresDiagram: false,
          deviceTags: [],
          environmentalConditions: [],
        },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('invalid_taxonomy_combination')
    expect(result.field).toBe('taxonomy.executionMethod')
  })

  it('returns missing_entity_payload when intent is summoning and entityPayload is absent', () => {
    const result = validateProcedureDefinition(
      makeMinimalProcedure({
        taxonomy: {
          intent: 'summoning',
          effectDomain: 'spiritual',
          executionMethod: 'ritual',
          originTradition: null,
        },
        // entityPayload intentionally omitted
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('missing_entity_payload')
    expect(result.field).toBe('entityPayload')
  })

  it('returns invalid_reagent_quantity for negative reagent quantity', () => {
    const result = validateProcedureDefinition(
      makeMinimalProcedure({
        requirements: {
          speech: 'none',
          gesture: 'none',
          toolTags: [],
          reagents: [{ tag: 'dust', quantity: -1, consumable: true }],
          requiresDiagram: false,
          deviceTags: [],
          environmentalConditions: [],
        },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('invalid_reagent_quantity')
  })

  it('returns negative_range for negative rangeMeters', () => {
    const result = validateProcedureDefinition(
      makeMinimalProcedure({
        targeting: {
          geometry: 'single_target',
          rangeMeters: -1,
          resistance: 'none',
          voluntaryResistanceSuppression: false,
          coverSensitive: false,
        },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('negative_range')
  })

  it('returns invalid_source_count for negative sourceCount in availability', () => {
    const result = validateProcedureDefinition(
      makeMinimalProcedure({
        availability: { rating: 'rare', sourceCount: -1 },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected failure')
    expect(result.error).toBe('invalid_source_count')
    expect(result.field).toBe('availability.sourceCount')
  })
})

// ─── Alias handling ───────────────────────────────────────────────────────────

describe('alias handling', () => {
  it('preserves all aliases on a valid procedure', () => {
    const result = validateProcedureDefinition(BINDING_SIGIL)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.aliases).toEqual(['iron_ward', 'containment_glyph'])
  })

  it('accepts an empty aliases array', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure({ aliases: [] }))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.aliases).toEqual([])
  })

  it('preserves aliases without deduplication or modification', () => {
    const aliases = ['alias_a', 'alias_b', 'alias_c'] as const
    const result = validateProcedureDefinition(makeMinimalProcedure({ aliases }))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.aliases).toEqual(['alias_a', 'alias_b', 'alias_c'])
  })
})

// ─── Provenance capture ───────────────────────────────────────────────────────

describe('provenance capture', () => {
  it('passes provenance fields through without modification', () => {
    const result = validateProcedureDefinition(BINDING_SIGIL)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    const prov = result.definition.provenance
    expect(prov.sourceSystem).toBe('hermetic_codex')
    expect(prov.acquiredViaResearch).toBe(true)
    expect(prov.researchDiscipline).toBe('occult_theory')
    expect(prov.restrictedFaction).toBeNull()
  })

  it('captures restrictedFaction from RESONANCE_CONSTRUCT provenance', () => {
    const result = validateProcedureDefinition(RESONANCE_CONSTRUCT)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.provenance.restrictedFaction).toBe('tech_division')
    expect(result.definition.provenance.researchDiscipline).toBe('engineering')
  })

  it('accepts null provenance fields for procedures with no tradition or faction', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure())
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.provenance.researchDiscipline).toBeNull()
    expect(result.definition.provenance.restrictedFaction).toBeNull()
    expect(result.definition.taxonomy.originTradition).toBeNull()
  })
})

// ─── Downstream field consumption ────────────────────────────────────────────

describe('deriveProcedureActivationSummary — downstream field consumption', () => {
  it('reads geometry, range, and resistance from BINDING_SIGIL without prose re-derivation', () => {
    const summary = deriveProcedureActivationSummary(BINDING_SIGIL)
    expect(summary.procedureId).toBe('binding_sigil')
    expect(summary.canonicalName).toBe('Binding Sigil')
    expect(summary.geometry).toBe('single_target')
    expect(summary.effectiveRangeMeters).toBe(5)
    expect(summary.resistance).toBe('contested_will')
    expect(summary.isInstant).toBe(false)
    expect(summary.requiresSpecialistAccess).toBe(false)
  })

  it('builds correct durationLabel from numeric value + unit for BINDING_SIGIL', () => {
    const summary = deriveProcedureActivationSummary(BINDING_SIGIL)
    expect(summary.durationLabel).toBe('24 hours')
  })

  it('reads geometry, range, and resistance from RESONANCE_CONSTRUCT', () => {
    const summary = deriveProcedureActivationSummary(RESONANCE_CONSTRUCT)
    expect(summary.geometry).toBe('self')
    expect(summary.effectiveRangeMeters).toBeNull()
    expect(summary.resistance).toBe('none')
    expect(summary.requiresSpecialistAccess).toBe(true)
  })

  it('builds "until dismissed" durationLabel for RESONANCE_CONSTRUCT', () => {
    const summary = deriveProcedureActivationSummary(RESONANCE_CONSTRUCT)
    expect(summary.durationLabel).toBe('until dismissed')
  })

  it('builds "permanent" durationLabel for permanent procedures', () => {
    const summary = deriveProcedureActivationSummary(
      makeMinimalProcedure({
        persistence: {
          duration: { value: null, unit: 'permanent', maintainable: false },
          dismissible: false,
          expiryState: null,
        },
      })
    )
    expect(summary.durationLabel).toBe('permanent')
  })

  it('marks isInstant true for instant activation timing', () => {
    const summary = deriveProcedureActivationSummary(
      makeMinimalProcedure({ activationTiming: 'instant' })
    )
    expect(summary.isInstant).toBe(true)
  })

  it('is deterministic: same definition produces identical summary', () => {
    const a = deriveProcedureActivationSummary(BINDING_SIGIL)
    const b = deriveProcedureActivationSummary(BINDING_SIGIL)
    expect(a).toEqual(b)
  })
})

// ─── Schema version ─────────────────────────────────────────────────────

describe('ProcedureDefinition — schemaVersion discriminant', () => {
  it('validator stamps schemaVersion on the validated output', () => {
    const result = validateProcedureDefinition(makeMinimalProcedure())
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.schemaVersion).toBe('spe-1274.v1')
    expect(result.definition.schemaVersion).toBe(PROCEDURE_DEFINITION_SCHEMA_VERSION)
  })

  it('validator overwrites any incoming schemaVersion with the canonical value', () => {
    const input = makeMinimalProcedure({ schemaVersion: 'spe-1274.v1' })
    const result = validateProcedureDefinition(input)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected ok')
    expect(result.definition.schemaVersion).toBe(PROCEDURE_DEFINITION_SCHEMA_VERSION)
  })

  it('BINDING_SIGIL exemplar carries the canonical schemaVersion', () => {
    expect(BINDING_SIGIL.schemaVersion).toBe(PROCEDURE_DEFINITION_SCHEMA_VERSION)
  })

  it('RESONANCE_CONSTRUCT exemplar carries the canonical schemaVersion', () => {
    expect(RESONANCE_CONSTRUCT.schemaVersion).toBe(PROCEDURE_DEFINITION_SCHEMA_VERSION)
  })
})
