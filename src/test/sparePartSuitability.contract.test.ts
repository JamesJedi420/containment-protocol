import { describe, expect, it } from 'vitest'
import { BLAST_DOOR_COMPENSATING_CONTROL_ID } from '../domain/containmentClassInspection'
import {
  BLAST_DOOR_SPARE_PART_ID,
  getRequiredRepairSparePartId,
  resolveRepairSparePartSuitability,
  SPARE_PART_IDS,
} from '../domain/sparePartSuitability'

describe('spare-part suitability for SPE-2851 repair', () => {
  it('exposes exactly one named blast-door spare part', () => {
    expect(SPARE_PART_IDS).toEqual(['blast_door_hinge_seal'])
    expect(getRequiredRepairSparePartId('blast_door')).toBe(BLAST_DOOR_SPARE_PART_ID)
    expect(getRequiredRepairSparePartId(undefined)).toBeUndefined()
    expect(getRequiredRepairSparePartId('pressure_seal')).toBeUndefined()
  })

  it('does not require a part for ordinary identities without a containment class', () => {
    expect(resolveRepairSparePartSuitability({})).toEqual({ ok: true, required: false })
    expect(resolveRepairSparePartSuitability({ sparePartId: BLAST_DOOR_SPARE_PART_ID })).toEqual({
      ok: true,
      required: false,
    })
  })

  it('accepts the named part for every blast-door deficiency kind', () => {
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'none' },
        sparePartId: BLAST_DOOR_SPARE_PART_ID,
      })
    ).toEqual({ ok: true, required: true, sparePartId: BLAST_DOOR_SPARE_PART_ID })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'hard_stop' },
        sparePartId: BLAST_DOOR_SPARE_PART_ID,
      })
    ).toEqual({ ok: true, required: true, sparePartId: BLAST_DOOR_SPARE_PART_ID })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
        sparePartId: BLAST_DOOR_SPARE_PART_ID,
      })
    ).toEqual({ ok: true, required: true, sparePartId: BLAST_DOOR_SPARE_PART_ID })
  })

  it('fails closed for missing, unsuitable, unknown class, and malformed deficiency', () => {
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'hard_stop' },
      })
    ).toEqual({ ok: false, code: 'missing_part' })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'hard_stop' },
        sparePartId: null,
      })
    ).toEqual({ ok: false, code: 'missing_part' })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'hard_stop' },
        sparePartId: 'pressure_seal_gasket',
      })
    ).toEqual({ ok: false, code: 'unsuitable_part' })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'hard_stop' },
        sparePartId: 1,
      })
    ).toEqual({ ok: false, code: 'unsuitable_part' })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'pressure_seal',
        deficiency: { kind: 'none' },
        sparePartId: BLAST_DOOR_SPARE_PART_ID,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        sparePartId: BLAST_DOOR_SPARE_PART_ID,
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
    expect(
      resolveRepairSparePartSuitability({
        classId: 'blast_door',
        deficiency: { kind: 'compensating_continue' },
        sparePartId: BLAST_DOOR_SPARE_PART_ID,
      })
    ).toEqual({ ok: false, code: 'malformed_deficiency' })
  })
})
