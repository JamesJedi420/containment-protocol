import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_DECONSTRUCTION_PROFILES,
  getEquipmentDeconstructionProfile,
  validateEquipmentDeconstructionProfiles,
} from '../data/equipmentDeconstruction'
import { createStartingState } from '../data/startingState'
import { getEquipmentCatalogEntries } from '../domain/equipment'
import {
  resolveEquipmentGradeRecoveryOutcome,
  validateEquipmentGradeRecoveryRule,
} from '../domain/equipmentGradeRecovery'
import {
  advanceEquipmentDeconstructionQueues,
  queueEquipmentDeconstruction,
  resolveEquipmentDeconstructionPreview,
} from '../domain/sim/equipmentDeconstruction'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { GAME_STORE_VERSION, migratePersistedStore } from '../app/store/runTransfer'

const yieldRule = {
  kind: 'yield_threshold' as const,
  pathId: 'component_reclamation' as const,
  baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
  baseWaste: 2,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2' as const,
  bonusMaterialId: 'electronic_parts',
  bonusQuantity: 1,
  wasteReduction: 1,
}

const handlingRule = {
  kind: 'handling_threshold' as const,
  pathId: 'ritual_disassembly' as const,
  baseMaterials: [{ materialId: 'occult_reagents', quantity: 1 }],
  baseWaste: 1,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2' as const,
  additionalDurationWeeks: 1,
}

describe('equipment-grade recovery contract', () => {
  it('strictly validates rule kinds and stable malformed-rule issues', () => {
    expect(validateEquipmentGradeRecoveryRule(yieldRule)).toMatchObject({ valid: true })
    expect(validateEquipmentGradeRecoveryRule(handlingRule)).toMatchObject({ valid: true })
    expect(
      validateEquipmentGradeRecoveryRule({
        kind: 'grade_neutral',
        pathId: 'component_reclamation',
        baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
        baseWaste: 0,
        baseDurationWeeks: 1,
      })
    ).toMatchObject({ valid: true })
    expect(
      validateEquipmentGradeRecoveryRule({
        ...yieldRule,
        thresholdGradeId: 'Grade II',
        label: 'High quality',
      })
    ).toEqual({
      valid: false,
      issues: [
        { code: 'unexpected_field', field: 'label' },
        { code: 'invalid_grade_id', field: 'thresholdGradeId' },
      ],
    })
  })

  it('explicitly covers the catalog and authors both recovery paths', () => {
    const catalog = getEquipmentCatalogEntries()
    expect(() =>
      validateEquipmentDeconstructionProfiles(
        EQUIPMENT_DECONSTRUCTION_PROFILES,
        catalog.map((definition) => ({
          id: definition.id,
          origin: definition.gradeProfile.origin,
        }))
      )
    ).not.toThrow()
    expect(EQUIPMENT_DECONSTRUCTION_PROFILES.map((profile) => profile.itemId).sort()).toEqual(
      getEquipmentCatalogEntries()
        .map((definition) => definition.id)
        .sort()
    )
    expect(getEquipmentDeconstructionProfile('signal_jammers')).toMatchObject({
      state: 'eligible',
      rule: { pathId: 'component_reclamation' },
    })
    expect(getEquipmentDeconstructionProfile('warding_kits')).toMatchObject({
      state: 'eligible',
      rule: { pathId: 'ritual_disassembly' },
    })
    expect(
      ['medkits', 'ward_seals', 'signal_jammers'].map(
        (itemId) => catalog.find((definition) => definition.id === itemId)?.gradeProfile.origin
      )
    ).toEqual(['ordinary', 'magical', 'technological'])
  })

  it('uses grade for component yield but for ritual handling time instead of universal yield', () => {
    const grade1Yield = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_1' },
      'known',
      { condition: 'operational' }
    )
    const grade2Yield = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'operational' }
    )
    const grade1Ritual = resolveEquipmentGradeRecoveryOutcome(
      handlingRule,
      { state: 'graded', gradeId: 'grade_1' },
      'known',
      { condition: 'operational' }
    )
    const grade2Ritual = resolveEquipmentGradeRecoveryOutcome(
      handlingRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'operational' }
    )

    expect(grade1Yield).toMatchObject({ available: true, materials: [{ quantity: 1 }], waste: 2 })
    expect(grade2Yield).toMatchObject({ available: true, materials: [{ quantity: 2 }], waste: 1 })
    expect(grade1Ritual).toMatchObject({
      available: true,
      materials: [{ quantity: 1 }],
      durationWeeks: 1,
    })
    expect(grade2Ritual).toMatchObject({
      available: true,
      materials: [{ quantity: 1 }],
      durationWeeks: 2,
    })
  })

  it('projects hidden grades identically and exposes no grade-specific serialized fields', () => {
    const hidden1 = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_1' },
      'hidden',
      { condition: 'operational' }
    )
    const hidden5 = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_5' },
      'hidden',
      { condition: 'operational' }
    )
    expect(hidden1).toEqual(hidden5)
    expect(JSON.stringify(hidden1)).not.toMatch(/grade_[15]|Grade [IVX]|"rank"/)
  })

  it('requires an explicit neutral rule for ungraded equipment', () => {
    const blocked = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'ungraded' },
      'known',
      { condition: 'operational' }
    )
    const neutral = resolveEquipmentGradeRecoveryOutcome(
      {
        kind: 'grade_neutral',
        pathId: 'component_reclamation',
        baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
        baseWaste: 1,
        baseDurationWeeks: 1,
      },
      { state: 'ungraded' },
      'known',
      { condition: 'operational' }
    )
    expect(blocked).toMatchObject({
      available: false,
      issues: [{ code: 'ungraded_requires_neutral_rule' }],
    })
    expect(neutral).toMatchObject({ available: true, projection: { state: 'ungraded' } })
  })

  it('keeps condition and restrictions independent from authoritative grade', () => {
    const operational = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'operational' }
    )
    const damaged = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'damaged' }
    )
    const restricted = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_5' },
      'known',
      { condition: 'operational', restrictions: ['evidence_held', 'authorization_required'] }
    )
    expect(operational).toMatchObject({
      available: true,
      participation: { gradeId: 'grade_2' },
      waste: 1,
    })
    expect(damaged).toMatchObject({
      available: true,
      participation: { gradeId: 'grade_2' },
      waste: 2,
    })
    expect(restricted).toMatchObject({
      available: false,
      issues: [{ code: 'authorization_required' }, { code: 'evidence_held' }],
    })

    const unrelatedAxes = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      {
        condition: 'operational',
        rarity: 'legendary',
        price: 999_999,
        legacyEffectScale: 99,
        providerReliability: 0,
      } as Parameters<typeof resolveEquipmentGradeRecoveryOutcome>[3]
    )
    expect(unrelatedAxes).toEqual(operational)
  })

  it('queues atomically, removes repair reservation, and blocks fabricated-lot ambiguity', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.damagedEquipmentQueue = ['signal_jammers']
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers')
    expect(queued.inventory.signal_jammers).toBe(0)
    expect(queued.damagedEquipmentQueue).toEqual([])
    expect(queued.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'signal_jammers',
      sourceGradeId: 'grade_2',
      sourceCondition: 'damaged',
      pathId: 'component_reclamation',
    })
    expect(state.inventory.signal_jammers).toBe(1)

    const fabricated = createStartingState()
    fabricated.inventory.signal_jammers = 1
    fabricated.fabricatedEquipmentLots = {
      completed: {
        queueId: 'completed',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    expect(resolveEquipmentDeconstructionPreview(fabricated, 'signal_jammers')).toMatchObject({
      resolution: {
        available: false,
        issues: [{ code: 'fabricated_lot_selection_unavailable' }],
      },
    })
    expect(queueEquipmentDeconstruction(fabricated, 'signal_jammers')).toBe(fabricated)
  })

  it('completes once with matching materials/event and preserves conflicting live jobs', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers')
    const entry = { ...queued.equipmentDeconstructionQueue![0]!, remainingWeeks: 1 }
    const ready = { ...queued, equipmentDeconstructionQueue: [entry] }
    const completed = advanceEquipmentDeconstructionQueues(ready)
    expect(completed.state.inventory.electronic_parts).toBe(ready.inventory.electronic_parts + 2)
    expect(completed.state.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      queueId: entry.id,
      sourceGradeId: 'grade_2',
      outputMaterials: [{ materialId: 'electronic_parts', quantity: 2 }],
    })
    expect(completed.eventDrafts[0]).toMatchObject({
      type: 'equipment.recovery_completed',
      payload: { sourceGradeId: 'grade_2' },
    })

    const replay = advanceEquipmentDeconstructionQueues({
      ...completed.state,
      equipmentDeconstructionQueue: [entry],
    })
    expect(replay.state.inventory).toEqual(completed.state.inventory)
    expect(replay.eventDrafts).toEqual([])

    const conflict = advanceEquipmentDeconstructionQueues({
      ...ready,
      equipmentRecoveryOutcomes: {
        [entry.id]: {
          queueId: entry.id,
          itemId: entry.itemId,
          pathId: entry.pathId,
          sourceGradeId: 'grade_1',
          sourceCondition: entry.sourceCondition,
          outputMaterials: entry.outputMaterials,
          wasteQuantity: entry.wasteQuantity,
          completedWeek: ready.week,
        },
      },
    })
    expect(conflict.state.equipmentDeconstructionQueue).toEqual([entry])
    expect(conflict.eventDrafts).toEqual([])
  })

  it('round-trips valid queues and receipts while dropping malformed siblings', () => {
    const fallback = createStartingState()
    fallback.inventory.signal_jammers = 1
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers')
    const entry = queued.equipmentDeconstructionQueue![0]!
    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentRecoveryOutcomes: {
            valid: {
              queueId: 'valid',
              itemId: 'signal_jammers',
              pathId: 'component_reclamation',
              sourceGradeId: 'grade_2',
              sourceCondition: 'operational',
              outputMaterials: entry.outputMaterials,
              wasteQuantity: 1,
              completedWeek: 1,
            },
            constructor: {
              queueId: 'constructor',
              itemId: 'signal_jammers',
              pathId: 'component_reclamation',
              sourceGradeId: 'grade_2',
              sourceCondition: 'operational',
              outputMaterials: entry.outputMaterials,
              wasteQuantity: 1,
              completedWeek: 1,
            },
            broken: { queueId: 'wrong' },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue).toHaveLength(1)
    expect(hydrated.equipmentRecoveryOutcomes).toEqual({
      valid: expect.objectContaining({ queueId: 'valid', sourceGradeId: 'grade_2' }),
    })
  })

  it('advances recovery through the canonical week-close queue phase', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers')
    const advanced = advanceWeek({
      ...queued,
      equipmentDeconstructionQueue: queued.equipmentDeconstructionQueue?.map((entry) => ({
        ...entry,
        remainingWeeks: 1,
      })),
    })

    expect(advanced.equipmentDeconstructionQueue).toEqual([])
    expect(Object.values(advanced.equipmentRecoveryOutcomes ?? {})).toHaveLength(1)
    expect(advanced.inventory.electronic_parts).toBe(queued.inventory.electronic_parts + 2)
  })
})
