/** Spare-part suitability for SPE-2851 stored condition repair. Reads SPE-2860 deficiency; does not consume stock. */

import {
  getContainmentClassCadenceSpec,
  isContainmentClassId,
  parseContainmentDeficiency,
  type ContainmentClassId,
} from './containmentClassInspection'

export const BLAST_DOOR_SPARE_PART_ID = 'blast_door_hinge_seal' as const
export type BlastDoorSparePartId = typeof BLAST_DOOR_SPARE_PART_ID

export const SPARE_PART_IDS = [BLAST_DOOR_SPARE_PART_ID] as const
export type SparePartId = (typeof SPARE_PART_IDS)[number]

const SPARE_PART_BY_CLASS: Readonly<Record<ContainmentClassId, SparePartId>> = Object.freeze({
  blast_door: BLAST_DOOR_SPARE_PART_ID,
})

export type SparePartSuitabilityFailureCode =
  'missing_part' | 'unsuitable_part' | 'invalid_class' | 'malformed_deficiency'

export type SparePartSuitabilityResult =
  | { ok: true; required: false }
  | { ok: true; required: true; sparePartId: SparePartId }
  | { ok: false; code: SparePartSuitabilityFailureCode }

export function getRequiredRepairSparePartId(classId: unknown): SparePartId | undefined {
  if (!isContainmentClassId(classId)) return undefined
  return SPARE_PART_BY_CLASS[classId]
}

/**
 * Typed spare-part gate for stored condition repair.
 * Ordinary identities (omitted class) do not require a part.
 * `blast_door` requires `blast_door_hinge_seal` for every deficiency kind.
 * Deficiency is validated, not used to pick a part or to clear hard-stop.
 */
export function resolveRepairSparePartSuitability(input: {
  classId?: unknown
  deficiency?: unknown
  sparePartId?: unknown
}): SparePartSuitabilityResult {
  if (input.classId === undefined) {
    return { ok: true, required: false }
  }
  if (!isContainmentClassId(input.classId)) {
    return { ok: false, code: 'invalid_class' }
  }
  const spec = getContainmentClassCadenceSpec(input.classId)
  const requiredPart = SPARE_PART_BY_CLASS[input.classId]
  if (!spec || !requiredPart) {
    return { ok: false, code: 'invalid_class' }
  }
  const deficiency = parseContainmentDeficiency(input.deficiency)
  if (!deficiency) {
    return { ok: false, code: 'malformed_deficiency' }
  }
  if (input.sparePartId === undefined || input.sparePartId === null) {
    return { ok: false, code: 'missing_part' }
  }
  if (input.sparePartId !== requiredPart) {
    return { ok: false, code: 'unsuitable_part' }
  }
  return { ok: true, required: true, sparePartId: requiredPart }
}
