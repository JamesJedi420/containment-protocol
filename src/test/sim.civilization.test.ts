// SPE-1069 slice 1: civilization parent-actor scaffolding tests
import { describe, it, expect } from 'vitest'
import {
  classifyCivilization,
  generateCivilizations,
  deriveSubordinateInstitutionTypes,
  evaluateDiplomaticBaseline,
  CIVILIZATION_TEMPLATES,
  createCivilizationState,
  accumulateCivilizationMemory,
  deriveCivilizationPairConflict,
  deriveCivilizationPairConflicts,
} from '../domain/civilization'

// ---------------------------------------------------------------------------
// classifyCivilization
// ---------------------------------------------------------------------------

describe('classifyCivilization', () => {
  it('returns a profile for a known id', () => {
    const profile = classifyCivilization('metropolitan_authority')
    expect(profile).toBeDefined()
    expect(profile?.id).toBe('metropolitan_authority')
  })

  it('returns correct category for metropolitan_authority', () => {
    const profile = classifyCivilization('metropolitan_authority')
    expect(profile?.category).toBe('government')
  })

  it('returns undefined for an unknown id', () => {
    const result = classifyCivilization('not_a_real_id')
    expect(result).toBeUndefined()
  })

  it('returns a profile for hidden_covenant', () => {
    const profile = classifyCivilization('hidden_covenant')
    expect(profile).toBeDefined()
    expect(profile?.category).toBe('occult')
  })

  it('returns a profile for threshold_assembly', () => {
    const profile = classifyCivilization('threshold_assembly')
    expect(profile).toBeDefined()
    expect(profile?.category).toBe('nonhuman')
  })

  it('returns a profile for civic_medical_trust', () => {
    const profile = classifyCivilization('civic_medical_trust')
    expect(profile?.category).toBe('medical')
  })

  it('returns a profile for gray_market_collective', () => {
    const profile = classifyCivilization('gray_market_collective')
    expect(profile?.category).toBe('criminal')
  })
})

// ---------------------------------------------------------------------------
// CIVILIZATION_TEMPLATES invariants
// ---------------------------------------------------------------------------

describe('CIVILIZATION_TEMPLATES invariants', () => {
  it('has exactly 8 templates', () => {
    expect(CIVILIZATION_TEMPLATES).toHaveLength(8)
  })

  it('all templates have non-empty culturePacket.resources', () => {
    for (const t of CIVILIZATION_TEMPLATES) {
      expect(t.culturePacket.resources.length).toBeGreaterThan(0)
    }
  })

  it('all templates have at least one institutionDerivationRule', () => {
    for (const t of CIVILIZATION_TEMPLATES) {
      expect(t.institutionDerivationRules.length).toBeGreaterThan(0)
    }
  })

  it('all templates have memoryCapacity > 0', () => {
    for (const t of CIVILIZATION_TEMPLATES) {
      expect(t.memoryCapacity).toBeGreaterThan(0)
    }
  })

  it('government diplomaticBaseline differs from criminal', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const crim = classifyCivilization('gray_market_collective')!
    expect(gov.diplomaticBaseline).not.toBe(crim.diplomaticBaseline)
  })

  it('academic resources differ from criminal resources', () => {
    const academic = classifyCivilization('institute_applied_research')!
    const criminal = classifyCivilization('gray_market_collective')!
    expect(academic.culturePacket.resources).not.toEqual(criminal.culturePacket.resources)
  })

  it('covers all expected categories', () => {
    const categories = new Set(CIVILIZATION_TEMPLATES.map((t) => t.category))
    expect(categories.has('government')).toBe(true)
    expect(categories.has('religious')).toBe(true)
    expect(categories.has('medical')).toBe(true)
    expect(categories.has('academic')).toBe(true)
    expect(categories.has('criminal')).toBe(true)
    expect(categories.has('occult')).toBe(true)
    expect(categories.has('rival_containment')).toBe(true)
    expect(categories.has('nonhuman')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// generateCivilizations
// ---------------------------------------------------------------------------

describe('generateCivilizations', () => {
  it('returns exactly count profiles', () => {
    const result = generateCivilizations({ seed: 42, count: 3 })
    expect(result.civilizations).toHaveLength(3)
  })

  it('same seed produces same output (determinism)', () => {
    const a = generateCivilizations({ seed: 99, count: 4 })
    const b = generateCivilizations({ seed: 99, count: 4 })
    expect(a.civilizations.map((c) => c.id)).toEqual(b.civilizations.map((c) => c.id))
  })

  it('different seeds produce different selections', () => {
    const a = generateCivilizations({ seed: 1, count: 3 })
    const b = generateCivilizations({ seed: 9999, count: 3 })
    expect(a.civilizations.map((c) => c.id)).not.toEqual(b.civilizations.map((c) => c.id))
  })

  it('returns the seed used', () => {
    const result = generateCivilizations({ seed: 77, count: 2 })
    expect(result.seed).toBe(77)
  })

  it('all generated profiles have non-empty institutionDerivationRules', () => {
    const result = generateCivilizations({ seed: 50, count: 4 })
    for (const civ of result.civilizations) {
      expect(civ.institutionDerivationRules.length).toBeGreaterThan(0)
    }
  })

  it('all generated profiles have memoryCapacity > 0', () => {
    const result = generateCivilizations({ seed: 100, count: 4 })
    for (const civ of result.civilizations) {
      expect(civ.memoryCapacity).toBeGreaterThan(0)
    }
  })

  it('biasCategories filters toward matching templates', () => {
    // With only government bias and count=1, should always pick metropolitan_authority
    const results: string[] = []
    for (let s = 1; s <= 20; s++) {
      const result = generateCivilizations({ seed: s, count: 1, biasCategories: ['government'] })
      results.push(result.civilizations[0]!.id)
    }
    const govCount = results.filter((id) => id === 'metropolitan_authority').length
    // Government is the only government template — biasing toward it should yield it often
    expect(govCount).toBeGreaterThan(0)
  })

  it('count=1 returns exactly one civilization', () => {
    const result = generateCivilizations({ seed: 7, count: 1 })
    expect(result.civilizations).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// deriveSubordinateInstitutionTypes
// ---------------------------------------------------------------------------

describe('deriveSubordinateInstitutionTypes', () => {
  it('returns a non-empty array for government civ', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const result = deriveSubordinateInstitutionTypes(gov, 42)
    expect(result.length).toBeGreaterThan(0)
  })

  it('government civ includes precinct in derivation', () => {
    // High-probability rule (0.8) — should appear with most seeds
    let found = false
    for (let s = 1; s <= 20; s++) {
      const gov = classifyCivilization('metropolitan_authority')!
      if (deriveSubordinateInstitutionTypes(gov, s).includes('precinct')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('medical civ includes clinic in derivation', () => {
    let found = false
    for (let s = 1; s <= 20; s++) {
      const med = classifyCivilization('civic_medical_trust')!
      if (deriveSubordinateInstitutionTypes(med, s).includes('clinic')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('medical civ includes ward in derivation', () => {
    let found = false
    for (let s = 1; s <= 20; s++) {
      const med = classifyCivilization('civic_medical_trust')!
      if (deriveSubordinateInstitutionTypes(med, s).includes('ward')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('occult civ includes shrine in derivation', () => {
    let found = false
    for (let s = 1; s <= 20; s++) {
      const occ = classifyCivilization('hidden_covenant')!
      if (deriveSubordinateInstitutionTypes(occ, s).includes('shrine')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('government and occult return different institution sets', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const occ = classifyCivilization('hidden_covenant')!
    const govTypes = deriveSubordinateInstitutionTypes(gov, 42)
    const occTypes = deriveSubordinateInstitutionTypes(occ, 42)
    expect(govTypes).not.toEqual(occTypes)
  })

  it('same civ + same seed produces same derivation (determinism)', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const a = deriveSubordinateInstitutionTypes(gov, 123)
    const b = deriveSubordinateInstitutionTypes(gov, 123)
    expect(a).toEqual(b)
  })

  it('different seeds produce different derivations', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    let differ = false
    const base = deriveSubordinateInstitutionTypes(gov, 1)
    for (let s = 2; s <= 30; s++) {
      if (deriveSubordinateInstitutionTypes(gov, s).join(',') !== base.join(',')) {
        differ = true
        break
      }
    }
    expect(differ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// evaluateDiplomaticBaseline
// ---------------------------------------------------------------------------

describe('evaluateDiplomaticBaseline', () => {
  it('returns cooperative for metropolitan_authority', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const result = evaluateDiplomaticBaseline(gov)
    expect(result.baseline).toBe('cooperative')
  })

  it('returns suspicious for radiant_order', () => {
    const rel = classifyCivilization('radiant_order')!
    const result = evaluateDiplomaticBaseline(rel)
    expect(result.baseline).toBe('suspicious')
  })

  it('returns exploitative for gray_market_collective', () => {
    const crim = classifyCivilization('gray_market_collective')!
    const result = evaluateDiplomaticBaseline(crim)
    expect(result.baseline).toBe('exploitative')
  })

  it('returns secretly_aligned for hidden_covenant', () => {
    const occ = classifyCivilization('hidden_covenant')!
    const result = evaluateDiplomaticBaseline(occ)
    expect(result.baseline).toBe('secretly_aligned')
  })

  it('returns suspicious for bureau_exceptional_incidents', () => {
    const bur = classifyCivilization('bureau_exceptional_incidents')!
    const result = evaluateDiplomaticBaseline(bur)
    expect(result.baseline).toBe('suspicious')
  })

  it('returns dependent for threshold_assembly', () => {
    const tha = classifyCivilization('threshold_assembly')!
    const result = evaluateDiplomaticBaseline(tha)
    expect(result.baseline).toBe('dependent')
  })

  it('returns a non-empty reason string for all 8 templates', () => {
    for (const t of CIVILIZATION_TEMPLATES) {
      const result = evaluateDiplomaticBaseline(t)
      expect(result.reason.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// AC1 proof: generate one civ, verify full shape
// ---------------------------------------------------------------------------

describe('AC1 integration proof', () => {
  it('generated civ has culture packet, diplomatic baseline, and non-empty institution derivation', () => {
    const { civilizations } = generateCivilizations({ seed: 12345, count: 1 })
    const civ = civilizations[0]!

    // culture packet non-empty
    expect(civ.culturePacket.resources.length).toBeGreaterThan(0)
    expect(civ.culturePacket.ethics.length).toBeGreaterThan(0)

    // diplomatic baseline present and valid
    const validBaselines = [
      'cooperative', 'suspicious', 'hostile', 'dependent',
      'infiltrated', 'exploitative', 'secretly_aligned',
    ]
    expect(validBaselines).toContain(civ.diplomaticBaseline)

    // institution derivation non-empty
    const institutions = deriveSubordinateInstitutionTypes(civ, 12345)
    expect(institutions.length).toBeGreaterThan(0)

    // evaluateDiplomaticBaseline returns matching baseline
    const evaluated = evaluateDiplomaticBaseline(civ)
    expect(evaluated.baseline).toBe(civ.diplomaticBaseline)
    expect(evaluated.reason.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// SPE-1069 slice 2: civilization state + memory + stance updates
// ---------------------------------------------------------------------------

describe('createCivilizationState', () => {
  it('creates compact deterministic state from baseline', () => {
    const state = createCivilizationState({
      civilizationId: 'metropolitan_authority',
      diplomaticBaseline: 'cooperative',
      memoryCapacity: 3,
    })

    expect(state.civilizationId).toBe('metropolitan_authority')
    expect(state.diplomaticBaseline).toBe('cooperative')
    expect(state.cooperation).toBe(66)
    expect(state.cooperationBand).toBe('aligned')
    expect(state.memoryCapacity).toBe(3)
    expect(state.memoryEvents).toEqual([])
    expect(state.rememberedEventIds).toEqual([])
    expect(state.memoryPressure).toBe(0)
  })
})

describe('accumulateCivilizationMemory', () => {
  it('deterministically accumulates memory from explicit events', () => {
    const base = createCivilizationState({
      civilizationId: 'bureau_exceptional_incidents',
      diplomaticBaseline: 'suspicious',
      memoryCapacity: 5,
    })

    const updated = accumulateCivilizationMemory(base, [
      { eventId: 'evt-2', week: 2, type: 'agency_violated_agreement', intensity: 1 },
      { eventId: 'evt-1', week: 1, type: 'agency_shared_intel', intensity: 1 },
    ])

    expect(updated.memoryEvents.map((entry) => entry.eventId)).toEqual(['evt-1', 'evt-2'])
    expect(updated.rememberedEventCounts.agency_shared_intel).toBe(1)
    expect(updated.rememberedEventCounts.agency_violated_agreement).toBe(1)
    expect(updated.cooperation).toBe(39)
    expect(updated.lastMemoryWeek).toBe(2)
  })

  it('ignores repeated events with the same eventId', () => {
    const base = createCivilizationState({
      civilizationId: 'threshold_assembly',
      diplomaticBaseline: 'dependent',
      memoryCapacity: 5,
    })

    const first = accumulateCivilizationMemory(base, [
      { eventId: 'evt-repeat', week: 7, type: 'agency_violated_agreement' },
    ])
    const second = accumulateCivilizationMemory(first, [
      { eventId: 'evt-repeat', week: 7, type: 'agency_violated_agreement' },
    ])

    expect(second.cooperation).toBe(first.cooperation)
    expect(second.rememberedEventCounts.agency_violated_agreement).toBe(1)
    expect(second.memoryEvents).toHaveLength(1)
  })

  it('keeps newest memory events up to memoryCapacity', () => {
    const base = createCivilizationState({
      civilizationId: 'gray_market_collective',
      diplomaticBaseline: 'exploitative',
      memoryCapacity: 2,
    })

    const updated = accumulateCivilizationMemory(base, [
      { eventId: 'evt-a', week: 1, type: 'agency_shared_intel' },
      { eventId: 'evt-b', week: 2, type: 'agency_saved_lives' },
      { eventId: 'evt-c', week: 3, type: 'agency_violated_agreement' },
    ])

    expect(updated.memoryEvents.map((entry) => entry.eventId)).toEqual(['evt-b', 'evt-c'])
    expect(updated.rememberedEventIds).toEqual(['evt-b', 'evt-c'])
  })

  it('changes cooperation band when remembered behavior turns negative', () => {
    const base = createCivilizationState({
      civilizationId: 'metropolitan_authority',
      diplomaticBaseline: 'cooperative',
      memoryCapacity: 6,
    })

    const updated = accumulateCivilizationMemory(base, [
      { eventId: 'evt-1', week: 1, type: 'agency_violated_agreement', intensity: 2 },
      { eventId: 'evt-2', week: 2, type: 'agency_raided_civilian_site', intensity: 1 },
    ])

    expect(base.cooperationBand).toBe('aligned')
    expect(updated.cooperation).toBe(22)
    expect(updated.cooperationBand).toBe('opposed')
    expect(updated.memoryPressure).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// SPE-1069 slice 3: deterministic civilization-pair macro-conflict
// ---------------------------------------------------------------------------

describe('deriveCivilizationPairConflict', () => {
  it('derives a predictable high-tension religious-vs-occult conflict', () => {
    const religious = classifyCivilization('radiant_order')!
    const occult = classifyCivilization('hidden_covenant')!

    const conflict = deriveCivilizationPairConflict(religious, occult)

    expect(conflict.pairId).toBe('hidden_covenant::radiant_order')
    expect(conflict.tensionScore).toBeGreaterThanOrEqual(45)
    expect(['moderate', 'high']).toContain(conflict.severity)
    expect(conflict.institutionPressureTags).toContain('institution:doctrine-friction')
    expect(conflict.signals.some((signal) => signal.axis === 'ideological_collision')).toBe(true)
  })

  it('is repeatable for identical inputs', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const criminal = classifyCivilization('gray_market_collective')!

    const a = deriveCivilizationPairConflict(gov, criminal)
    const b = deriveCivilizationPairConflict(gov, criminal)

    expect(a).toEqual(b)
  })

  it('increases tension when memory state shifts toward opposed cooperation', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const criminal = classifyCivilization('gray_market_collective')!

    const calmGovState = createCivilizationState({
      civilizationId: gov.id,
      diplomaticBaseline: gov.diplomaticBaseline,
    })

    const stressedGovState = accumulateCivilizationMemory(calmGovState, [
      { eventId: 'm1', week: 1, type: 'agency_violated_agreement', intensity: 2 },
      { eventId: 'm2', week: 2, type: 'agency_raided_civilian_site', intensity: 1 },
    ])

    const neutralConflict = deriveCivilizationPairConflict(gov, criminal, calmGovState)
    const stressedConflict = deriveCivilizationPairConflict(gov, criminal, stressedGovState)

    expect(stressedGovState.cooperationBand).toBe('opposed')
    expect(stressedConflict.tensionScore).toBeGreaterThan(neutralConflict.tensionScore)
    expect(stressedConflict.cooperationImpact).toBeLessThanOrEqual(neutralConflict.cooperationImpact)
  })
})

describe('deriveCivilizationPairConflicts', () => {
  it('builds deterministic unique pair conflicts for a civilization set', () => {
    const civilizations = [
      classifyCivilization('metropolitan_authority')!,
      classifyCivilization('gray_market_collective')!,
      classifyCivilization('radiant_order')!,
    ]

    const result = deriveCivilizationPairConflicts(civilizations)

    expect(result).toHaveLength(3)
    expect(new Set(result.map((entry) => entry.pairId)).size).toBe(3)

    const rerun = deriveCivilizationPairConflicts(civilizations)
    expect(rerun).toEqual(result)
  })
})
