import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
  FIELD_CONTAINMENT_DEPARTMENT_ID,
  createFieldContainmentBlastDoorWorkshopInstance,
  deriveDepartmentWorkshopEquipmentConditionFromIntegrity,
} from '../domain/departmentWorkshopIntegrityQualityMapping'
import { advanceContainmentClassInspectionsAtWeekClose } from '../domain/containmentClassWeekClose'
import {
  destroyStoredOrdinaryEquipmentInstance,
  instantiateEquipmentInstance,
  reaggregateStoredOrdinaryEquipmentInstance,
} from '../domain/equipmentInstance'

describe('SPE-877 seed equipment-instance-blast-door-workshop', () => {
  it('puts the authored blast-door identity in starting state without debiting inventory', () => {
    const state = createStartingState()
    const seeded = state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]

    expect(seeded).toMatchObject({
      instanceId: FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      definitionId: 'ward_seals',
      location: { state: 'stored' },
      condition: 'operational',
      containmentIntegrity: {
        classId: 'blast_door',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    expect(seeded).toEqual(createFieldContainmentBlastDoorWorkshopInstance())
    expect(state.inventory.ward_seals).toBe(0)
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('good')
  })

  it('still fail-closes missing-instance poor when the authored identity is omitted', () => {
    const state = createStartingState()
    state.equipmentInstances = {}

    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('preserves the authored ID across save/load and does not invent it for omitted registries', () => {
    const state = createStartingState()
    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    )

    const roundTripped = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(roundTripped.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    )

    expect(hydrateGame({ ...state, equipmentInstances: undefined }).equipmentInstances).toEqual({})
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        hydrateGame({ ...state, equipmentInstances: undefined }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('allocates sequential instantiate IDs without clobbering the seed', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const created = instantiateEquipmentInstance(state, 'signal_jammers')
    expect(created).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-1', definitionId: 'signal_jammers' },
    })
    if (!created.ok) throw new Error(created.code)

    expect(created.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    )
    expect(created.state.equipmentInstances?.['equipment-instance-1-1']?.definitionId).toBe(
      'signal_jammers'
    )
  })

  it('lets week-close inspect the seeded blast-door identity when cadence is due', () => {
    const state = createStartingState()
    state.week = 5
    const advanced = advanceContainmentClassInspectionsAtWeekClose(state)
    expect(
      advanced.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
        ?.containmentIntegrity
    ).toMatchObject({
      classId: 'blast_door',
      lastInspectionWeek: 5,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: 'secondary_interlock_watch',
      },
    })
    expect(
      advanced.eventDrafts.some(
        (draft) =>
          draft.type === 'equipment.containment_class_inspected' &&
          draft.payload.instanceId === FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
      )
    ).toBe(true)
  })

  it('fail-closes destroy and catalog re-aggregation of the authored blast-door identity', () => {
    const state = createStartingState()
    const destroyed = destroyStoredOrdinaryEquipmentInstance(
      state,
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )
    expect(destroyed).toMatchObject({
      ok: false,
      code: 'authored_workshop_identity_protected',
    })
    expect(destroyed.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    )
    expect(destroyed.state.inventory.ward_seals ?? 0).toBe(0)

    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      state,
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )
    expect(reaggregated).toMatchObject({
      ok: false,
      code: 'authored_workshop_identity_protected',
    })
    expect(reaggregated.state.inventory.ward_seals ?? 0).toBe(0)
  })
})
