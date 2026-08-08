import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { productionCatalog } from '../data/production'
import { createStartingState } from '../data/startingState'
import {
  getEquipmentCatalogEntries,
  getEquipmentDefinition,
  getEquipmentGradeDistributionReport,
  LICENSED_PROCUREMENT_TAG,
  resolveEquipmentDefinitionGrade,
  validateEquipmentCatalogDefinitions,
  type EquipmentDefinition,
} from '../domain/equipment'
import {
  createEquipmentGradeDistributionReport,
  getEquipmentGradeCatalogParticipation,
  resolveEquipmentGradeCatalogProjection,
  validateEquipmentGradeCatalogProfile,
  type EquipmentGradeCatalogProfile,
} from '../domain/equipmentGradeCatalog'
import { sanitizeDamagedEquipmentQueue } from '../domain/equipmentRecovery'
import { getProcurementListings } from '../domain/market'

function buildCatalogRecord() {
  return Object.fromEntries(
    getEquipmentCatalogEntries().map((definition) => [definition.id, definition])
  ) as Record<string, EquipmentDefinition>
}

const EXPECTED_GRADE_IDS = {
  advanced_recon_suite: 'grade_3',
  analysis_goggles: 'grade_2',
  breach_visor: 'grade_2',
  combat_stims: 'grade_1',
  containment_staff: 'grade_2',
  diplomatic_kit: 'grade_1',
  medkits: 'grade_1',
  emf_sensors: 'grade_2',
  encrypted_field_tablet: 'grade_2',
  environmental_sampler: 'grade_2',
  field_plate: 'grade_1',
  anomaly_scanner: 'grade_2',
  hazmat_suit: 'grade_2',
  occult_detection_array: 'grade_3',
  ritual_components: 'grade_1',
  signal_intercept_kit: 'grade_3',
  signal_jammers: 'grade_2',
  silver_rounds: 'grade_1',
  spectral_em_array: 'grade_2',
  tactical_radio: 'grade_1',
  trauma_kit: 'grade_1',
  ward_seals: 'grade_1',
  warding_kits: 'grade_2',
} as const

function makeProfile(
  overrides: Partial<EquipmentGradeCatalogProfile> = {}
): EquipmentGradeCatalogProfile {
  return {
    state: 'graded',
    gradeId: 'grade_2',
    basis: 'specialized_field',
    origin: 'ordinary',
    functionalClass: 'detection',
    catalogSegment: 'direct_procurement',
    ...overrides,
  } as EquipmentGradeCatalogProfile
}

describe('equipment catalog canonical-grade migration', () => {
  it('assigns every supported definition one explicit canonical profile', () => {
    const definitions = getEquipmentCatalogEntries()
    const craftableIds = new Set(productionCatalog.map((recipe) => recipe.outputItemId))
    const assignments = Object.fromEntries(
      definitions.map((definition) => [
        definition.id,
        definition.gradeProfile.state === 'graded' ||
        definition.gradeProfile.state === 'hidden_until_identified'
          ? definition.gradeProfile.gradeId
          : definition.gradeProfile.state,
      ])
    )

    expect(assignments).toEqual(EXPECTED_GRADE_IDS)
    expect(definitions).toHaveLength(23)
    for (const definition of definitions) {
      expect(validateEquipmentGradeCatalogProfile(definition.gradeProfile)).toMatchObject({
        valid: true,
      })
      const expectedSegment = definition.tags.includes(LICENSED_PROCUREMENT_TAG)
        ? 'licensed_procurement'
        : craftableIds.has(definition.id)
          ? 'craftable'
          : 'direct_procurement'
      expect(definition.gradeProfile.catalogSegment).toBe(expectedSegment)
    }
  })

  it('strictly rejects missing, display-label, mismatched-rubric, and unexpected fields', () => {
    expect(validateEquipmentGradeCatalogProfile(undefined)).toEqual({
      valid: false,
      issues: [{ code: 'invalid_shape', field: '$' }],
    })
    expect(
      validateEquipmentGradeCatalogProfile({ ...makeProfile(), gradeId: 'Grade II' })
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([{ code: 'invalid_grade_id', field: 'gradeId' }]),
    })
    expect(
      validateEquipmentGradeCatalogProfile({ ...makeProfile(), gradeId: 'grade_3' })
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([{ code: 'grade_basis_mismatch', field: 'gradeId' }]),
    })
    expect(
      validateEquipmentGradeCatalogProfile({ ...makeProfile(), rarity: 'rare' })
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([{ code: 'unexpected_field', field: 'rarity' }]),
    })
    expect(
      validateEquipmentGradeCatalogProfile({ ...makeProfile(), condition: 'pristine' })
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([{ code: 'unexpected_field', field: 'condition' }]),
    })

    expect(
      validateEquipmentGradeCatalogProfile({ ...makeProfile(), variantId: '  reinforced  ' })
    ).toMatchObject({ valid: true, value: { variantId: 'reinforced' } })
    expect(
      validateEquipmentGradeCatalogProfile({
        state: 'intentionally_ungraded',
        reason: '  outside durable equipment semantics  ',
        origin: 'ordinary',
        functionalClass: 'medical',
        catalogSegment: 'craftable',
      })
    ).toMatchObject({
      valid: true,
      value: { reason: 'outside durable equipment semantics' },
    })

    const missingProfileCatalog = buildCatalogRecord()
    delete (missingProfileCatalog.medkits as Partial<EquipmentDefinition>).gradeProfile
    expect(() => validateEquipmentCatalogDefinitions(missingProfileCatalog)).toThrow(
      /gradeProfile: invalid_shape:\$/
    )
  })

  it('supports every authoring state while keeping hidden truth fail-closed', () => {
    const profiles: EquipmentGradeCatalogProfile[] = [
      makeProfile(),
      makeProfile({ state: 'hidden_until_identified' }),
      {
        state: 'intentionally_ungraded',
        reason: 'Consumable supply without a durable construction baseline.',
        origin: 'ordinary',
        functionalClass: 'medical',
        catalogSegment: 'craftable',
      },
      {
        state: 'excluded_by_taxonomy',
        reason: 'Catalog record is outside equipment-grade semantics.',
        origin: 'ordinary',
        functionalClass: 'medical',
        catalogSegment: 'craftable',
      },
      {
        state: 'blocked_pending_design_review',
        reason: 'Construction baseline is not approved.',
        origin: 'hybrid',
        functionalClass: 'containment',
        catalogSegment: 'direct_procurement',
      },
    ]

    expect(profiles.map((profile) => validateEquipmentGradeCatalogProfile(profile).valid)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ])
    expect(profiles.map(getEquipmentGradeCatalogParticipation)).toEqual([
      { state: 'graded', gradeId: 'grade_2' },
      { state: 'graded', gradeId: 'grade_2' },
      { state: 'ungraded' },
      { state: 'ungraded' },
      { state: 'ungraded' },
    ])

    const hiddenLow = resolveEquipmentGradeCatalogProjection(
      makeProfile({
        state: 'hidden_until_identified',
        gradeId: 'grade_1',
        basis: 'standard_issue',
      })
    )
    const hiddenHigh = resolveEquipmentGradeCatalogProjection(
      makeProfile({
        state: 'hidden_until_identified',
        gradeId: 'grade_5',
        basis: 'singular_masterwork',
      })
    )
    const hiddenBlocked = resolveEquipmentGradeCatalogProjection(profiles[4])

    expect(hiddenHigh).toEqual(hiddenLow)
    expect(hiddenBlocked).toEqual(hiddenLow)
    expect(JSON.stringify([hiddenLow, hiddenHigh, hiddenBlocked])).not.toMatch(
      /grade_[1-5]|Grade [IVX]+|rank/i
    )
  })

  it('keeps grade independent from rarity, legacy effect scale, and operational fields', () => {
    const definition = getEquipmentDefinition('breach_visor')!
    const changedAxes: EquipmentDefinition = {
      ...definition,
      rarity: 'basic',
      legacyEffectScale: 5,
      statModifiers: {},
    }

    expect(resolveEquipmentGradeCatalogProjection(changedAxes.gradeProfile)).toEqual(
      resolveEquipmentDefinitionGrade('breach_visor')
    )

    const changedGrade: EquipmentDefinition = {
      ...definition,
      gradeProfile: {
        ...definition.gradeProfile,
        state: 'graded',
        gradeId: 'grade_4',
        basis: 'experimental_prototype',
      },
    }
    expect({
      rarity: changedGrade.rarity,
      legacyEffectScale: changedGrade.legacyEffectScale,
      statModifiers: changedGrade.statModifiers,
    }).toEqual({
      rarity: definition.rarity,
      legacyEffectScale: definition.legacyEffectScale,
      statModifiers: definition.statModifiers,
    })
  })

  it('rejects inconsistent operational duplicates unless an authored variant explains them', () => {
    const catalog = buildCatalogRecord()
    const source = catalog.field_plate
    catalog.field_plate_copy = {
      ...source,
      id: 'field_plate_copy',
      name: 'Field Plate Copy',
      gradeProfile: {
        ...source.gradeProfile,
        state: 'graded',
        gradeId: 'grade_2',
        basis: 'specialized_field',
      },
    }

    expect(() => validateEquipmentCatalogDefinitions(catalog)).toThrow(
      /different grade.*variantId/i
    )

    catalog.field_plate_copy.gradeProfile = {
      ...catalog.field_plate_copy.gradeProfile,
      variantId: 'reinforced-construction',
    }
    expect(() => validateEquipmentCatalogDefinitions(catalog)).not.toThrow()
  })

  it('reports deterministic grade distributions by origin, function, and segment', () => {
    const first = getEquipmentGradeDistributionReport()
    const second = getEquipmentGradeDistributionReport()
    const reversed = createEquipmentGradeDistributionReport(getEquipmentCatalogEntries().reverse())

    expect(second).toEqual(first)
    expect(reversed).toEqual(first)
    expect(first).toMatchObject({
      totalDefinitions: 23,
      byState: { graded: 23 },
      byGrade: { grade_1: 9, grade_2: 11, grade_3: 3, grade_4: 0, grade_5: 0 },
      totalsByOrigin: { ordinary: 6, magical: 4, technological: 9, hybrid: 4 },
      totalsByFunctionalClass: {
        combat: 1,
        communications: 4,
        containment: 4,
        detection: 8,
        diplomacy: 1,
        medical: 3,
        protection: 2,
      },
      totalsByCatalogSegment: {
        craftable: 7,
        direct_procurement: 14,
        licensed_procurement: 2,
      },
      byOrigin: {
        ordinary: { grade_1: 5, grade_2: 1 },
        magical: { grade_1: 2, grade_2: 2 },
        technological: { grade_1: 1, grade_2: 6, grade_3: 2 },
        hybrid: { grade_1: 1, grade_2: 2, grade_3: 1 },
      },
      byFunctionalClass: {
        detection: { grade_1: 0, grade_2: 6, grade_3: 2 },
        medical: { grade_1: 3, grade_2: 0, grade_3: 0 },
      },
      byCatalogSegment: {
        craftable: { grade_1: 4, grade_2: 3, grade_3: 0 },
        direct_procurement: { grade_1: 4, grade_2: 7, grade_3: 3 },
        licensed_procurement: { grade_1: 1, grade_2: 1, grade_3: 0 },
      },
    })
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.byOrigin.ordinary)).toBe(true)
  })

  it('does not leak hidden grades through distribution diagnostics', () => {
    const low = createEquipmentGradeDistributionReport([
      {
        id: 'hidden',
        gradeProfile: makeProfile({
          state: 'hidden_until_identified',
          gradeId: 'grade_1',
          basis: 'standard_issue',
        }),
      },
    ])
    const high = createEquipmentGradeDistributionReport([
      {
        id: 'hidden',
        gradeProfile: makeProfile({
          state: 'hidden_until_identified',
          gradeId: 'grade_5',
          basis: 'singular_masterwork',
        }),
      },
    ])

    expect(high).toEqual(low)
    expect(low.byState.hidden_until_identified).toBe(1)
    expect(Object.values(low.byGrade)).toEqual([0, 0, 0, 0, 0])
    expect(JSON.stringify(high)).toBe(JSON.stringify(low))
  })

  it('preserves item identity through saves and existing catalog consumers', () => {
    const state = createStartingState()
    state.inventory.medkits = 3
    state.inventory.field_plate = 1
    state.agents.a_ava.equipmentSlots = {
      ...state.agents.a_ava.equipmentSlots,
      armor: 'field_plate',
    }

    const serialized = serializeGameSave(state)
    const loaded = loadGameSave(serialized)

    expect(serialized).not.toMatch(/gradeProfile|grade_[1-5]/)
    expect(loaded.inventory.medkits).toBe(3)
    expect(loaded.inventory.field_plate).toBe(1)
    const loadedArmor = loaded.agents.a_ava.equipmentSlots?.armor
    expect(loadedArmor).toBe('field_plate')
    expect(resolveEquipmentDefinitionGrade(loadedArmor!)).toMatchObject({
      state: 'graded',
      gradeId: 'grade_1',
    })
    expect(resolveEquipmentDefinitionGrade('missing-equipment')).toBeUndefined()

    for (const recipe of productionCatalog) {
      expect(resolveEquipmentDefinitionGrade(recipe.outputItemId)).toBeDefined()
    }
    expect(sanitizeDamagedEquipmentQueue(['field_plate'], loaded.inventory)).toEqual([
      'field_plate',
    ])

    const catalogIds = new Set(getEquipmentCatalogEntries().map((definition) => definition.id))
    const equipmentListings = getProcurementListings(loaded).filter((listing) =>
      catalogIds.has(listing.itemId)
    )
    expect(equipmentListings.length).toBeGreaterThan(0)
    expect(JSON.stringify(equipmentListings)).not.toMatch(/gradeProfile|grade_[1-5]/)
  })
})
