import { describe, expect, it } from 'vitest'
import type { EquipmentRarity } from '../domain/equipment'
import type { EquipmentGradeParticipation } from '../domain/equipmentGrade'
import {
  EQUIPMENT_GRADE_DEFINITIONS,
  EQUIPMENT_GRADE_IDS,
  EQUIPMENT_GRADE_REGISTRY,
  compareEquipmentGradeIds,
  getEquipmentGradeDefinition,
  getEquipmentGradeRank,
  isEquipmentGradeId,
  resolveEquipmentGradeProjection,
  validateEquipmentGradeParticipation,
} from '../domain/equipmentGrade'

const REPRESENTATIVE_FIXTURES = [
  {
    category: 'ordinary',
    participation: { state: 'graded', gradeId: 'grade_2' },
    rarity: 'basic',
    condition: 'good',
    legacyEffectScale: 1,
    value: 20,
    provenance: 'agency-stock',
  },
  {
    category: 'magical',
    participation: { state: 'graded', gradeId: 'grade_4' },
    rarity: 'rare',
    condition: 'worn',
    legacyEffectScale: 1,
    value: 80,
    provenance: 'occult-cache',
  },
  {
    category: 'technological',
    participation: { state: 'graded', gradeId: 'grade_3' },
    rarity: 'legendary',
    condition: 'damaged',
    legacyEffectScale: 2,
    value: 140,
    provenance: 'prototype-lab',
  },
  {
    category: 'ungraded',
    participation: { state: 'ungraded' },
    rarity: 'uncommon',
    condition: 'good',
    legacyEffectScale: 3,
    value: 35,
    provenance: 'field-recovery',
  },
] as const satisfies readonly {
  category: string
  participation: EquipmentGradeParticipation
  rarity: EquipmentRarity
  condition: string
  legacyEffectScale: number
  value: number
  provenance: string
}[]

describe('canonical equipment-grade contract', () => {
  it('defines one frozen, unique, ascending Grade I-V registry', () => {
    expect(EQUIPMENT_GRADE_IDS).toEqual(['grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5'])
    expect(EQUIPMENT_GRADE_DEFINITIONS.map(({ rank }) => rank)).toEqual([1, 2, 3, 4, 5])
    expect(EQUIPMENT_GRADE_DEFINITIONS.map(({ label }) => label)).toEqual([
      'Grade I',
      'Grade II',
      'Grade III',
      'Grade IV',
      'Grade V',
    ])
    expect(EQUIPMENT_GRADE_DEFINITIONS.map(({ localizationKey }) => localizationKey)).toEqual(
      EQUIPMENT_GRADE_IDS.map((gradeId) => `equipment.grade.${gradeId}`)
    )
    expect(new Set(EQUIPMENT_GRADE_IDS).size).toBe(5)
    expect(Object.isFrozen(EQUIPMENT_GRADE_IDS)).toBe(true)
    expect(Object.isFrozen(EQUIPMENT_GRADE_DEFINITIONS)).toBe(true)
    expect(Object.isFrozen(EQUIPMENT_GRADE_REGISTRY)).toBe(true)
    expect(EQUIPMENT_GRADE_DEFINITIONS.every(Object.isFrozen)).toBe(true)
  })

  it('looks up, ranks, validates, and compares stable grade identifiers', () => {
    for (const [index, gradeId] of EQUIPMENT_GRADE_IDS.entries()) {
      expect(isEquipmentGradeId(gradeId)).toBe(true)
      expect(getEquipmentGradeDefinition(gradeId)).toBe(EQUIPMENT_GRADE_REGISTRY[gradeId])
      expect(getEquipmentGradeRank(gradeId)).toBe(index + 1)
    }

    expect(isEquipmentGradeId('grade_0')).toBe(false)
    expect(isEquipmentGradeId('legendary')).toBe(false)
    expect(compareEquipmentGradeIds('grade_1', 'grade_5')).toBeLessThan(0)
    expect(compareEquipmentGradeIds('grade_5', 'grade_1')).toBeGreaterThan(0)
    expect(compareEquipmentGradeIds('grade_3', 'grade_3')).toBe(0)
  })

  it('strictly validates graded and ungraded participation', () => {
    for (const gradeId of EQUIPMENT_GRADE_IDS) {
      expect(validateEquipmentGradeParticipation({ state: 'graded', gradeId })).toEqual({
        valid: true,
        value: { state: 'graded', gradeId },
      })
    }
    expect(validateEquipmentGradeParticipation({ state: 'ungraded' })).toEqual({
      valid: true,
      value: { state: 'ungraded' },
    })

    expect(validateEquipmentGradeParticipation(null)).toEqual({
      valid: false,
      issues: [{ code: 'invalid_shape', field: '$' }],
    })
    expect(validateEquipmentGradeParticipation({ state: 'graded' })).toEqual({
      valid: false,
      issues: [{ code: 'missing_grade_id', field: 'gradeId' }],
    })
    expect(validateEquipmentGradeParticipation({ state: 'graded', gradeId: 'grade_6' })).toEqual({
      valid: false,
      issues: [{ code: 'invalid_grade_id', field: 'gradeId' }],
    })
    expect(validateEquipmentGradeParticipation({ state: 'ungraded', gradeId: 'grade_1' })).toEqual({
      valid: false,
      issues: [{ code: 'unexpected_grade_id', field: 'gradeId' }],
    })
    expect(validateEquipmentGradeParticipation({ state: 'unknown' })).toEqual({
      valid: false,
      issues: [{ code: 'invalid_state', field: 'state' }],
    })
    expect(validateEquipmentGradeParticipation({ gradeId: 'grade_1' })).toEqual({
      valid: false,
      issues: [
        { code: 'invalid_state', field: 'state' },
        { code: 'unexpected_field', field: 'gradeId' },
      ],
    })
    expect(
      validateEquipmentGradeParticipation({
        state: 'graded',
        gradeId: 'grade_1',
        condition: 'good',
        rarity: 'basic',
      })
    ).toEqual({
      valid: false,
      issues: [
        { code: 'unexpected_field', field: 'condition' },
        { code: 'unexpected_field', field: 'rarity' },
      ],
    })
  })

  it('projects known graded and ungraded participation with non-hover text', () => {
    const graded = resolveEquipmentGradeProjection({ state: 'graded', gradeId: 'grade_3' }, 'known')
    const ungraded = resolveEquipmentGradeProjection({ state: 'ungraded' }, 'known')

    expect(graded).toEqual({
      state: 'graded',
      gradeId: 'grade_3',
      rank: 3,
      label: 'Grade III',
      localizationKey: 'equipment.grade.grade_3',
      accessibleText: 'Equipment grade: Grade III',
      debugText: 'equipment-grade:grade_3',
    })
    expect(ungraded).toEqual({
      state: 'ungraded',
      label: 'Ungraded',
      localizationKey: 'equipment.grade.ungraded',
      accessibleText: 'Equipment grade: Ungraded',
      debugText: 'equipment-grade:ungraded',
    })
    expect(Object.isFrozen(graded)).toBe(true)
    expect(Object.isFrozen(ungraded)).toBe(true)
  })

  it('uses one identical leak-free projection for every hidden truth', () => {
    const hiddenGradeOne = resolveEquipmentGradeProjection(
      { state: 'graded', gradeId: 'grade_1' },
      'hidden'
    )
    const hiddenGradeFive = resolveEquipmentGradeProjection(
      { state: 'graded', gradeId: 'grade_5' },
      'hidden'
    )
    const hiddenUngraded = resolveEquipmentGradeProjection({ state: 'ungraded' }, 'hidden')

    expect(hiddenGradeOne).toEqual(hiddenGradeFive)
    expect(hiddenGradeOne).toEqual(hiddenUngraded)
    expect(Object.isFrozen(hiddenGradeOne)).toBe(true)
    expect(Object.isFrozen(hiddenGradeFive)).toBe(true)
    expect(Object.isFrozen(hiddenUngraded)).toBe(true)
    expect(hiddenGradeOne).toEqual({
      state: 'unknown',
      label: 'Grade unknown',
      localizationKey: 'equipment.grade.unknown',
      accessibleText: 'Equipment grade: Unknown',
      debugText: 'equipment-grade:unknown',
    })

    const serialized = JSON.stringify([hiddenGradeOne, hiddenGradeFive, hiddenUngraded])
    expect(serialized).not.toMatch(/grade_[1-5]/)
    expect(serialized).not.toMatch(/Grade [IVX]/)
    expect(serialized).not.toMatch(/"rank"/)
  })

  it('resolves ordinary, magical, technological, and ungraded fixtures without axis coupling', () => {
    const projections = REPRESENTATIVE_FIXTURES.map((fixture) => ({
      category: fixture.category,
      projection: resolveEquipmentGradeProjection(fixture.participation, 'known'),
    }))

    expect(projections.map(({ category }) => category)).toEqual([
      'ordinary',
      'magical',
      'technological',
      'ungraded',
    ])
    expect(projections.map(({ projection }) => projection.state)).toEqual([
      'graded',
      'graded',
      'graded',
      'ungraded',
    ])

    const baseline = REPRESENTATIVE_FIXTURES[0]
    const changedExternalAxes = {
      ...baseline,
      rarity: 'legendary' as const,
      condition: 'destroyed',
      legacyEffectScale: 99,
      value: 9_999,
      provenance: 'unknown-origin',
    }
    expect(resolveEquipmentGradeProjection(changedExternalAxes.participation, 'known')).toEqual(
      resolveEquipmentGradeProjection(baseline.participation, 'known')
    )

    const changedGrade = {
      ...baseline,
      participation: { state: 'graded', gradeId: 'grade_5' },
    } as const
    expect({
      rarity: changedGrade.rarity,
      condition: changedGrade.condition,
      legacyEffectScale: changedGrade.legacyEffectScale,
      value: changedGrade.value,
      provenance: changedGrade.provenance,
    }).toEqual({
      rarity: baseline.rarity,
      condition: baseline.condition,
      legacyEffectScale: baseline.legacyEffectScale,
      value: baseline.value,
      provenance: baseline.provenance,
    })
  })
})
