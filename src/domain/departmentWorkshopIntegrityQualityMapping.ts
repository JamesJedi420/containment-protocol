import {
  isContainmentClassInService,
  parseContainmentClassIntegrity,
  type ContainmentClassId,
} from './containmentClassInspection'
import type { DepartmentWorkshopConditionLevel } from './departmentWorkshopQueue'
import type { GameState } from './models'

export const FIELD_CONTAINMENT_DEPARTMENT_ID = 'department:field-containment'
export const FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID =
  'equipment-instance-blast-door-workshop' as const
export const FIELD_CONTAINMENT_BLAST_DOOR_CLASS_ID = 'blast_door' as const

export interface DepartmentWorkshopIntegrityQualityMapping {
  readonly departmentId: string
  readonly instanceId: string
  readonly classId: ContainmentClassId
}

/**
 * Authored production department → blast-door instance binding for the
 * SPE-2782 equipment-condition completion-quality axis. Unmapped departments
 * remain caller-owned. Pressure-seal and interlock are not this seam.
 */
export const DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS: readonly DepartmentWorkshopIntegrityQualityMapping[] =
  Object.freeze([
    Object.freeze({
      departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
      instanceId: FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      classId: FIELD_CONTAINMENT_BLAST_DOOR_CLASS_ID,
    }),
  ])

/**
 * Derives the authoritative equipment condition for one mapped department from
 * live containment integrity. Hard-stop, missing instance, malformed integrity,
 * and wrong class resolve poor. None and compensating continue resolve good.
 * Unmapped departments return undefined so caller-owned equipmentCondition is
 * not overwritten. SPE-2851 condition is not an input.
 */
export function deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
  source: GameState,
  departmentId: string,
  mappings: readonly DepartmentWorkshopIntegrityQualityMapping[] = DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS
): DepartmentWorkshopConditionLevel | undefined {
  if (typeof departmentId !== 'string' || departmentId.length === 0 || !Array.isArray(mappings)) {
    return undefined
  }

  const mapping = mappings.find((candidate) => candidate.departmentId === departmentId)
  if (!mapping) {
    return undefined
  }

  const instance = source.equipmentInstances?.[mapping.instanceId]
  if (!instance) {
    return 'poor'
  }

  const parsed = parseContainmentClassIntegrity(instance.containmentIntegrity)
  if (!parsed.ok || parsed.integrity.classId !== mapping.classId) {
    return 'poor'
  }

  return isContainmentClassInService(parsed.integrity) ? 'good' : 'poor'
}
