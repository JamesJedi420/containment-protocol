import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  EMERGENCY_RESPONSE_DEPARTMENT_ID,
  EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
  FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
  PROCUREMENT_LOGISTICS_DEPARTMENT_ID,
  PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
  createEmergencyResponsePressureSealWorkshopInstance,
  createProcurementLogisticsInterlockWorkshopInstance,
  deriveDepartmentWorkshopEquipmentConditionFromIntegrity,
} from '../domain/departmentWorkshopIntegrityQualityMapping'
import { instantiateEquipmentInstance } from '../domain/equipmentInstance'

describe('SPE-877 extra-class workshop integrity-quality seeds', () => {
  it('puts authored pressure-seal and interlock identities in starting state without debiting inventory', () => {
    const state = createStartingState()
    const pressure = state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]
    const interlock = state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]

    expect(pressure).toEqual(createEmergencyResponsePressureSealWorkshopInstance())
    expect(interlock).toEqual(createProcurementLogisticsInterlockWorkshopInstance())
    expect(state.inventory.ward_seals).toBe(0)
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('good')
  })

  it('still fail-closes missing-instance poor when extra-class identities are omitted', () => {
    const state = createStartingState()
    const blastDoor = state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    state.equipmentInstances = blastDoor
      ? { [FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]: blastDoor }
      : {}

    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('preserves extra-class IDs across save/load and does not invent them for omitted registries', () => {
    const state = createStartingState()
    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]
    )
    expect(loaded.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]
    )

    const roundTripped = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(roundTripped.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]
    )
    expect(roundTripped.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]
    )

    expect(hydrateGame({ ...state, equipmentInstances: undefined }).equipmentInstances).toEqual({})
  })

  it('allocates sequential instantiate IDs without clobbering extra-class seeds', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const created = instantiateEquipmentInstance(state, 'signal_jammers')
    expect(created).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-1', definitionId: 'signal_jammers' },
    })
    if (!created.ok) throw new Error(created.code)

    expect(
      created.state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]
    ).toEqual(state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID])
    expect(created.state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]
    )
  })
})
