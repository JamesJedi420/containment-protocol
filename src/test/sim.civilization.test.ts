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
  deriveCivilizationPopulationInheritance,
  deriveCivilizationAccessPacket,
  deriveCivilizationAccessDifferential,
  deriveCivilizationEvolutionPacket,
  deriveCivilizationLocalEntities,
  deriveInstitutionAccessSurface,
  deriveInstitutionProfile,
  validateInstitutionProfile,
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

// ---------------------------------------------------------------------------
// SPE-1069 slice 4: civilization-linked population inheritance scaffolding
// ---------------------------------------------------------------------------

describe('deriveCivilizationPopulationInheritance', () => {
  it('derives deterministic inheritance packet for a recruit', () => {
    const civ = classifyCivilization('metropolitan_authority')!

    const packet = deriveCivilizationPopulationInheritance(civ, {
      subjectKind: 'recruit',
      seed: 4401,
      variantIndex: 0,
    })

    expect(packet.packetId).toBe('metropolitan_authority:recruit:4401:0')
    expect(packet.subjectKind).toBe('recruit')
    expect(packet.expectationTags.length).toBeGreaterThan(0)
    expect(packet.traitTags.length).toBeGreaterThan(0)
    expect(packet.loyaltyTags).toContain('loyalty:civic-mandate')
    expect(packet.conflictSurfaceTags.length).toBeGreaterThan(0)
  })

  it('is repeatable for identical civilization and input seed', () => {
    const civ = classifyCivilization('civic_medical_trust')!

    const a = deriveCivilizationPopulationInheritance(civ, {
      subjectKind: 'witness',
      seed: 9001,
      variantIndex: 2,
    })

    const b = deriveCivilizationPopulationInheritance(civ, {
      subjectKind: 'witness',
      seed: 9001,
      variantIndex: 2,
    })

    expect(a).toEqual(b)
  })

  it('produces meaningful inherited differences across civilization types', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const occult = classifyCivilization('hidden_covenant')!

    const govPacket = deriveCivilizationPopulationInheritance(gov, {
      subjectKind: 'specialist',
      seed: 2202,
    })

    const occultPacket = deriveCivilizationPopulationInheritance(occult, {
      subjectKind: 'specialist',
      seed: 2202,
    })

    expect(govPacket.loyaltyTags).toContain('loyalty:civic-mandate')
    expect(occultPacket.loyaltyTags).toContain('loyalty:rite-oath')
    expect(govPacket.conflictSurfaceTags).not.toEqual(occultPacket.conflictSurfaceTags)
    expect(govPacket.resourceAffinityTags).not.toEqual(occultPacket.resourceAffinityTags)
  })

  it('reflects memory/cooperation boundary state in loyalty and conflict outputs', () => {
    const civ = classifyCivilization('gray_market_collective')!
    const baseState = createCivilizationState({
      civilizationId: civ.id,
      diplomaticBaseline: civ.diplomaticBaseline,
    })

    const pressuredState = accumulateCivilizationMemory(baseState, [
      { eventId: 'p1', week: 3, type: 'agency_violated_agreement', intensity: 2 },
      { eventId: 'p2', week: 4, type: 'agency_raided_civilian_site', intensity: 1 },
    ])

    const neutral = deriveCivilizationPopulationInheritance(
      civ,
      { subjectKind: 'witness', seed: 3301 },
      baseState
    )

    const pressured = deriveCivilizationPopulationInheritance(
      civ,
      { subjectKind: 'witness', seed: 3301 },
      pressuredState
    )

    expect(pressuredState.cooperationBand).toBe('opposed')
    expect(neutral.loyaltyTags).toContain('loyalty:agency-conditional')
    expect(pressured.loyaltyTags).toContain('loyalty:agency-resistant')
    expect(pressured.conflictSurfaceTags).toContain('conflict:retaliatory-posture')
    expect(pressured.conflictSurfaceTags).toContain('conflict:memory-grievance')
  })
})

// ---------------------------------------------------------------------------
// SPE-1069 slice 5: civilization resource/knowledge access differentiation
// ---------------------------------------------------------------------------

describe('deriveCivilizationAccessPacket', () => {
  it('derives deterministic access packet for a civilization', () => {
    const civ = classifyCivilization('civic_medical_trust')!
    const packet = deriveCivilizationAccessPacket(civ)

    expect(packet.packetId).toBe('civic_medical_trust:access:v1')
    expect(packet.civilizationCategory).toBe('medical')
    expect(packet.resourceChannels).toContain('resource:medical-staff')
    expect(packet.knowledgeChannels).toContain('knowledge:clinical-triage')
    expect(packet.accessScore).toBeGreaterThan(0)
  })

  it('is repeatable for identical inputs', () => {
    const civ = classifyCivilization('institute_applied_research')!
    const a = deriveCivilizationAccessPacket(civ)
    const b = deriveCivilizationAccessPacket(civ)
    expect(a).toEqual(b)
  })

  it('shows meaningful cross-civilization access differences', () => {
    const medical = classifyCivilization('civic_medical_trust')!
    const criminal = classifyCivilization('gray_market_collective')!

    const medPacket = deriveCivilizationAccessPacket(medical)
    const crimPacket = deriveCivilizationAccessPacket(criminal)

    expect(medPacket.resourceChannels).toContain('resource:medical-staff')
    expect(crimPacket.resourceChannels).toContain('resource:contraband')
    expect(medPacket.resourceChannels).not.toEqual(crimPacket.resourceChannels)
    expect(medPacket.knowledgeChannels).not.toEqual(crimPacket.knowledgeChannels)
  })

  it('modulates access output when civilization state is pressured/opposed', () => {
    const civ = classifyCivilization('gray_market_collective')!
    const baseState = createCivilizationState({
      civilizationId: civ.id,
      diplomaticBaseline: civ.diplomaticBaseline,
    })
    const pressuredState = accumulateCivilizationMemory(baseState, [
      { eventId: 'a1', week: 2, type: 'agency_violated_agreement', intensity: 2 },
      { eventId: 'a2', week: 3, type: 'agency_raided_civilian_site', intensity: 1 },
    ])

    const neutralPacket = deriveCivilizationAccessPacket(civ, baseState)
    const pressuredPacket = deriveCivilizationAccessPacket(civ, pressuredState)

    expect(pressuredState.cooperationBand).toBe('opposed')
    expect(pressuredPacket.accessScore).toBeLessThanOrEqual(neutralPacket.accessScore)
    expect(pressuredPacket.frictionTags).toContain('access-friction:retaliatory-screening')
    expect(pressuredPacket.frictionTags).toContain('access-friction:memory-review-gate')
  })
})

describe('deriveCivilizationAccessDifferential', () => {
  it('builds deterministic downstream-ready access differential between civilizations', () => {
    const gov = classifyCivilization('metropolitan_authority')!
    const occult = classifyCivilization('hidden_covenant')!

    const diff = deriveCivilizationAccessDifferential(gov, occult)

    expect(diff.pairId).toBe('hidden_covenant::metropolitan_authority')
    expect(diff.onlyAResourceChannels.length).toBeGreaterThan(0)
    expect(diff.onlyBResourceChannels.length).toBeGreaterThan(0)
    expect(diff.onlyAKnowledgeChannels.length).toBeGreaterThan(0)
    expect(diff.onlyBKnowledgeChannels.length).toBeGreaterThan(0)

    const rerun = deriveCivilizationAccessDifferential(gov, occult)
    expect(rerun).toEqual(diff)
  })
})

// ---------------------------------------------------------------------------
// SPE-1069 slice 6: civilization evolution/change scaffolding
// ---------------------------------------------------------------------------

describe('deriveCivilizationEvolutionPacket', () => {
  it('derives deterministic evolution packet with explicit pressure scores and hints', () => {
    const civ = classifyCivilization('hidden_covenant')!
    const packet = deriveCivilizationEvolutionPacket(civ, { seed: 441, week: 12 })

    expect(packet.packetId).toBe('hidden_covenant:evolution:12:441')
    expect(packet.civilizationId).toBe('hidden_covenant')
    expect(packet.pressureScores.radicalization_pressure).toBeGreaterThan(0)
    expect(packet.effectHints.institutionPressureTags.length).toBeGreaterThan(0)
    expect(packet.effectHints.factionPressureTags.length).toBeGreaterThan(0)
    expect(packet.effectHints.campaignPressureTags.length).toBeGreaterThan(0)
  })

  it('is repeatable for identical civilization and week input', () => {
    const civ = classifyCivilization('bureau_exceptional_incidents')!
    const a = deriveCivilizationEvolutionPacket(civ, { seed: 99, week: 20 })
    const b = deriveCivilizationEvolutionPacket(civ, { seed: 99, week: 20 })

    expect(a).toEqual(b)
  })

  it('shows meaningful state-change pressure when memory/cooperation degrades', () => {
    const civ = classifyCivilization('metropolitan_authority')!
    const baseState = createCivilizationState({
      civilizationId: civ.id,
      diplomaticBaseline: civ.diplomaticBaseline,
    })

    const pressuredState = accumulateCivilizationMemory(baseState, [
      { eventId: 'ev-1', week: 4, type: 'agency_violated_agreement', intensity: 2 },
      { eventId: 'ev-2', week: 5, type: 'agency_raided_civilian_site', intensity: 1 },
    ])

    const neutralPacket = deriveCivilizationEvolutionPacket(civ, { seed: 777, week: 30 }, baseState)
    const pressuredPacket = deriveCivilizationEvolutionPacket(civ, { seed: 777, week: 30 }, pressuredState)

    expect(pressuredState.cooperationBand).toBe('opposed')
    expect(pressuredPacket.pressureScores.fragmentation_pressure).toBeGreaterThanOrEqual(
      neutralPacket.pressureScores.fragmentation_pressure
    )
    expect(pressuredPacket.effectHints.riskScore).toBeGreaterThanOrEqual(neutralPacket.effectHints.riskScore)
  })

  it('reflects stabilizing boundary behavior for aligned low-pressure state', () => {
    const civ = classifyCivilization('civic_medical_trust')!
    const alignedState = createCivilizationState({
      civilizationId: civ.id,
      diplomaticBaseline: civ.diplomaticBaseline,
    })

    const packet = deriveCivilizationEvolutionPacket(civ, { seed: 300, week: 8 }, alignedState)

    expect(alignedState.cooperationBand).toBe('aligned')
    expect(packet.pressureScores.reform_pressure).toBeGreaterThanOrEqual(packet.pressureScores.corruption_pressure)
    expect(packet.effectHints.cooperationDeltaHint).toBeGreaterThanOrEqual(0)
  })

  it('drives radicalizing phase under high radicalization pressure input', () => {
    const civ = classifyCivilization('radiant_order')!
    const packet = deriveCivilizationEvolutionPacket(civ, {
      seed: 1500,
      week: 20,
      pressure: {
        radicalization_pressure: 88,
      },
    })

    expect(packet.significantChange).toBe(true)
    expect(packet.dominantDriver).toBe('radicalization_pressure')
    expect(packet.resultingPhase).toBe('radicalizing')
  })
})

// ---------------------------------------------------------------------------
// SPE-1069 slice 7: local institution/faction derivation from parent actors
// ---------------------------------------------------------------------------

describe('deriveCivilizationLocalEntities', () => {
  it('derives local institutions tied to a parent civilization', () => {
    const parent = classifyCivilization('metropolitan_authority')!
    const packet = deriveCivilizationLocalEntities(parent, { seed: 901, week: 14 })

    expect(packet.parentCivilizationId).toBe(parent.id)
    expect(packet.packetId).toBe('metropolitan_authority:locals:14:901')
    expect(packet.entities.length).toBeGreaterThan(0)
    expect(packet.entities.every((entity) => entity.parentCivilizationId === parent.id)).toBe(true)
    expect(packet.entities.some((entity) => entity.entityType === 'institution')).toBe(true)
  })

  it('is repeatable for identical seed/week input', () => {
    const parent = classifyCivilization('civic_medical_trust')!
    const a = deriveCivilizationLocalEntities(parent, { seed: 33, week: 8 })
    const b = deriveCivilizationLocalEntities(parent, { seed: 33, week: 8 })

    expect(a).toEqual(b)
  })

  it('shows meaningful variation across civilization categories', () => {
    const medical = classifyCivilization('civic_medical_trust')!
    const occult = classifyCivilization('hidden_covenant')!

    const medPacket = deriveCivilizationLocalEntities(medical, { seed: 100, week: 22 })
    const occPacket = deriveCivilizationLocalEntities(occult, { seed: 100, week: 22 })

    expect(medPacket.entities[0]?.institutionKind).not.toBe(occPacket.entities[0]?.institutionKind)
    expect(medPacket.entities[0]?.culturalMarkers).not.toEqual(occPacket.entities[0]?.culturalMarkers)
    expect(medPacket.entities[0]?.roleTags).not.toEqual(occPacket.entities[0]?.roleTags)
  })

  it('reflects pressured boundary state in conflict hooks', () => {
    const parent = classifyCivilization('gray_market_collective')!
    const baseState = createCivilizationState({
      civilizationId: parent.id,
      diplomaticBaseline: parent.diplomaticBaseline,
    })
    const pressuredState = accumulateCivilizationMemory(baseState, [
      { eventId: 'loc-1', week: 2, type: 'agency_violated_agreement', intensity: 2 },
      { eventId: 'loc-2', week: 3, type: 'agency_raided_civilian_site', intensity: 1 },
    ])

    const neutral = deriveCivilizationLocalEntities(parent, { seed: 42, week: 9 }, baseState)
    const pressured = deriveCivilizationLocalEntities(parent, { seed: 42, week: 9 }, pressuredState)

    expect(pressuredState.cooperationBand).toBe('opposed')
    expect(
      neutral.entities.some((entity) => entity.conflictHooks.includes('hook:cooperation-opposed'))
    ).toBe(false)
    expect(
      pressured.entities.some((entity) => entity.conflictHooks.includes('hook:cooperation-opposed'))
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// SPE-698 slice 1: institution profile schema + bounded downstream consumer
// ---------------------------------------------------------------------------

describe('deriveInstitutionProfile', () => {
  it('derives a deterministic institution profile with structured identity and access fields', () => {
    const civ = classifyCivilization('radiant_order')!
    const profile = deriveInstitutionProfile(civ, {
      institutionKind: 'sanctuary',
      seed: 515,
      week: 18,
    })

    expect(profile.profileId).toBe('radiant_order:profile:18:1:sanctuary')
    expect(profile.publicIdentity.displayName).toBe('Sanctuary Office')
    expect(profile.publicIdentity.formalName).toBe('Radiant Order Sanctuary')
    expect(profile.visualIdentifiers).toContain('symbol:devotional-icon')
    expect(profile.doctrineTags).toContain('doctrine:ritual-orthodoxy')
    expect(profile.permissionTags.some((tag) => tag.startsWith('permission:access-'))).toBe(true)
    expect(profile.operationalTags).toContain('operation:kind-sanctuary')
  })

  it('adds deterministic branch linkage only when repeated branch structure is needed', () => {
    const civ = classifyCivilization('metropolitan_authority')!
    const profile = deriveInstitutionProfile(civ, {
      institutionKind: 'precinct',
      seed: 101,
      week: 9,
      branchIndex: 2,
    })

    expect(profile.umbrellaProfileId).toBe('metropolitan_authority:umbrella:precinct')
    expect(profile.branchKey).toBe('precinct-2')
    expect(profile.aliases).toContain('Precinct Branch 2')
  })

  it('is repeatable for identical inputs', () => {
    const civ = classifyCivilization('hidden_covenant')!
    const a = deriveInstitutionProfile(civ, {
      institutionKind: 'shrine',
      seed: 707,
      week: 4,
    })
    const b = deriveInstitutionProfile(civ, {
      institutionKind: 'shrine',
      seed: 707,
      week: 4,
    })

    expect(a).toEqual(b)
  })
})

describe('validateInstitutionProfile', () => {
  it('accepts a valid deterministic profile', () => {
    const civ = classifyCivilization('civic_medical_trust')!
    const profile = deriveInstitutionProfile(civ, {
      institutionKind: 'clinic',
      seed: 311,
      week: 6,
    })

    expect(validateInstitutionProfile(profile)).toEqual([])
  })

  it('flags unsorted or incomplete profile fields', () => {
    const errors = validateInstitutionProfile({
      profileId: 'broken',
      parentCivilizationId: 'broken-civ',
      institutionKind: '',
      publicIdentity: {
        displayName: '',
        formalName: '',
        visibleRole: '',
      },
      aliases: ['Zulu', 'Alpha'],
      visualIdentifiers: [],
      doctrineTags: ['doctrine:z', 'doctrine:a'],
      permissionTags: [],
      operationalTags: [],
      umbrellaProfileId: 'broken:umbrella',
    })

    expect(errors).toContain('Missing institutionKind')
    expect(errors).toContain('Missing publicIdentity.displayName')
    expect(errors).toContain('broken: visualIdentifiers array is empty')
    expect(errors).toContain('broken: doctrineTags must be unique-sorted')
    expect(errors).toContain('broken: umbrellaProfileId and branchKey must appear together')
  })
})

describe('deriveInstitutionAccessSurface', () => {
  it('produces downstream-ready access and identity hints from an institution profile', () => {
    const civ = classifyCivilization('bureau_exceptional_incidents')!
    const profile = deriveInstitutionProfile(civ, {
      institutionKind: 'field-office',
      seed: 902,
      week: 16,
    })

    const surface = deriveInstitutionAccessSurface(profile)

    expect(surface.profileId).toBe(profile.profileId)
    expect(surface.accessHints).toContain('access:role-field-office')
    expect(surface.conflictHooks.some((tag) => tag.startsWith('hook:doctrine-'))).toBe(true)
    expect(surface.culturalMarkers.some((tag) => tag.startsWith('symbol:'))).toBe(true)
  })

  it('is consumed by local institution derivation without breaking determinism', () => {
    const civ = classifyCivilization('metropolitan_authority')!
    const packet = deriveCivilizationLocalEntities(civ, { seed: 901, week: 14 })
    const institution = packet.entities.find((entity) => entity.entityType === 'institution')

    expect(institution?.institutionProfile?.profileId).toBe(
      'metropolitan_authority:profile:14:1:precinct'
    )
    expect(institution?.accessHints.some((tag) => tag.startsWith('access:role-'))).toBe(true)
    expect(institution?.conflictHooks.some((tag) => tag.startsWith('hook:doctrine-'))).toBe(true)
    expect(institution?.culturalMarkers.some((tag) => tag.startsWith('symbol:'))).toBe(true)
    expect(
      institution?.institutionProfile
        ? validateInstitutionProfile(institution.institutionProfile)
        : ['missing']
    ).toEqual([])
  })
})
