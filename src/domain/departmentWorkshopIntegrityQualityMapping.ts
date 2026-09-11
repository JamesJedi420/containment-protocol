import {
  isContainmentClassInService,
  parseContainmentClassIntegrity,
  snapshotContainmentClassIntegrity,
  type ContainmentClassId,
} from './containmentClassInspection'
import type { EquipmentInstance } from './equipmentInstance'
import type { DepartmentWorkshopConditionLevel } from './departmentWorkshopQueue'
import type { GameState } from './models'

export const FIELD_CONTAINMENT_DEPARTMENT_ID = 'department:field-containment'
export const FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID =
  'equipment-instance-blast-door-workshop' as const
export const FIELD_CONTAINMENT_BLAST_DOOR_CLASS_ID = 'blast_door' as const

export const EMERGENCY_RESPONSE_DEPARTMENT_ID = 'department:emergency-response'
export const EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID =
  'equipment-instance-pressure-seal-workshop' as const
export const EMERGENCY_RESPONSE_PRESSURE_SEAL_CLASS_ID = 'pressure_seal' as const

export const PROCUREMENT_LOGISTICS_DEPARTMENT_ID = 'department:procurement-logistics'
export const PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID =
  'equipment-instance-interlock-workshop' as const
export const PROCUREMENT_LOGISTICS_INTERLOCK_CLASS_ID = 'interlock' as const

export interface DepartmentWorkshopIntegrityQualityMapping {
  readonly departmentId: string
  readonly instanceId: string
  readonly classId: ContainmentClassId
}

/**
 * Authored production department → containment-class instance bindings for the
 * SPE-2782 equipment-condition completion-quality axis. Unmapped departments
 * remain caller-owned. Biohazard-response stays SPE-2792 room-only.
 */
export const DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS: readonly DepartmentWorkshopIntegrityQualityMapping[] =
  Object.freeze([
    Object.freeze({
      departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
      instanceId: FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      classId: FIELD_CONTAINMENT_BLAST_DOOR_CLASS_ID,
    }),
    Object.freeze({
      departmentId: EMERGENCY_RESPONSE_DEPARTMENT_ID,
      instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
      classId: EMERGENCY_RESPONSE_PRESSURE_SEAL_CLASS_ID,
    }),
    Object.freeze({
      departmentId: PROCUREMENT_LOGISTICS_DEPARTMENT_ID,
      instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
      classId: PROCUREMENT_LOGISTICS_INTERLOCK_CLASS_ID,
    }),
  ])

const AUTHORED_WORKSHOP_INTEGRITY_INSTANCE_IDS: ReadonlySet<string> = new Set(
  DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS.map((mapping) => mapping.instanceId)
)

/** SPE-2877 / SPE-2879: authored SPE-2866 mapping targets are not ordinary destroy/re-agg or mission-casualty eligible. */
export function isAuthoredWorkshopIntegrityInstanceId(instanceId: string): boolean {
  return AUTHORED_WORKSHOP_INTEGRITY_INSTANCE_IDS.has(instanceId)
}

function createWorkshopIntegrityInstance(
  instanceId: string,
  classId: ContainmentClassId
): EquipmentInstance {
  return {
    instanceId,
    definitionId: 'ward_seals',
    location: { state: 'stored' },
    condition: 'operational',
    containmentIntegrity: snapshotContainmentClassIntegrity({
      classId,
      lastInspectionWeek: 1,
      cycleCount: 0,
      deficiency: { kind: 'none' },
    }),
  }
}

/**
 * Authored stored blast-door identity SPE-2866 maps at
 * `department:field-containment`. Starting-state seeds this ID without calling
 * `instantiateEquipmentInstance` (allocator is `equipment-instance-${week}-${ordinal}`)
 * and without debiting aggregate inventory.
 */
export function createFieldContainmentBlastDoorWorkshopInstance(): EquipmentInstance {
  return createWorkshopIntegrityInstance(
    FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
    FIELD_CONTAINMENT_BLAST_DOOR_CLASS_ID
  )
}

/**
 * Authored stored pressure-seal identity mapped at `department:emergency-response`.
 * Starting-state seeds this ID without calling `instantiateEquipmentInstance`
 * and without debiting aggregate inventory.
 */
export function createEmergencyResponsePressureSealWorkshopInstance(): EquipmentInstance {
  return createWorkshopIntegrityInstance(
    EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
    EMERGENCY_RESPONSE_PRESSURE_SEAL_CLASS_ID
  )
}

/**
 * Authored stored interlock identity mapped at `department:procurement-logistics`.
 * Starting-state seeds this ID without calling `instantiateEquipmentInstance`
 * and without debiting aggregate inventory.
 */
export function createProcurementLogisticsInterlockWorkshopInstance(): EquipmentInstance {
  return createWorkshopIntegrityInstance(
    PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
    PROCUREMENT_LOGISTICS_INTERLOCK_CLASS_ID
  )
}

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
