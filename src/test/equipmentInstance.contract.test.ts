import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyContainmentClassDeficiency,
  applyEquipmentInstanceTransition,
  destroyStoredOrdinaryEquipmentInstance,
  getEquipmentInstance,
  getEquipmentInstanceAtAgentSlot,
  instantiateEquipmentInstance,
  listStoredEquipmentInstances,
  reaggregateStoredOrdinaryEquipmentInstance,
  relocateEquipmentInstance,
  repairStoredEquipmentInstanceCondition,
  sanitizeEquipmentInstanceRegistry,
  stabilizeContainmentClassDeficiency,
  applyBlastDoorIntegrityLabor,
  applyInterlockIntegrityLabor,
  applyPressureSealIntegrityLabor,
  type EquipmentInstanceLocation,
} from '../domain/equipmentInstance'
import {
  EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
  FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
  PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
} from '../domain/departmentWorkshopIntegrityQualityMapping'
import {
  canEquipStoredEquipmentInstance,
  equipAgentItem,
  equipStoredEquipmentInstance,
  materializeStoredOrdinaryEquipmentInstance,
  returnFabricatedOrdinaryEquipmentInstanceToLot,
  unequipAgentItem,
} from '../domain/sim/equipment'
import {
  advanceEquipmentDeconstructionQueues,
  queueEquipmentDeconstruction,
  resolveEquipmentDeconstructionPreview,
  resolveEquipmentDeconstructionSources,
} from '../domain/sim/equipmentDeconstruction'
import { hydrateGame } from '../app/store/runTransfer'
import {
  appendOperationEventDrafts,
  createEquipmentInstanceDestroyedDraft,
  createEquipmentInstanceMaterializedDraft,
  createEquipmentInstanceReaggregatedDraft,
  createEquipmentInstanceConditionRepairedDraft,
  createContainmentClassDeficiencyRecordedDraft,
  createContainmentClassStabilizedDraft,
  createEquipmentInstanceStationMutatedDraft,
  createContainmentBarrierIntegrityChangedDraft,
} from '../domain/events'
import { validateOperationEventPayload } from '../domain/events/eventValidation'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  INTERLOCK_COMPENSATING_CONTROL_ID,
  PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
  isContainmentClassInService,
  type ContainmentClassIntegrity,
} from '../domain/containmentClassInspection'
import {
  BLAST_DOOR_MEMBRANE_ZONE_ID,
  INTERLOCK_MEMBRANE_ZONE_ID,
  PRESSURE_SEAL_MEMBRANE_ZONE_ID,
} from '../domain/containmentBarrierIntegrity'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'
import {
  BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
  INTERLOCK_INTEGRITY_LABOR_STATION_ID,
  PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
} from '../domain/equipmentStationMutation'
import type { GameState } from '../domain/models'

function plantContainmentDeficiency(
  state: GameState,
  instanceId: string,
  deficiency: ContainmentClassIntegrity['deficiency']
): GameState {
  const instance = state.equipmentInstances?.[instanceId]
  if (!instance?.containmentIntegrity) {
    throw new Error(`missing containment integrity for ${instanceId}`)
  }
  return {
    ...state,
    equipmentInstances: {
      ...(state.equipmentInstances ?? {}),
      [instanceId]: {
        ...instance,
        containmentIntegrity: {
          ...instance.containmentIntegrity,
          deficiency,
        },
      },
    },
  }
}

function plantEquippedInstance(
  state: GameState,
  instanceId: string,
  location: Extract<EquipmentInstanceLocation, { state: 'equipped' }>
): GameState {
  const instance = state.equipmentInstances?.[instanceId]
  const agent = state.agents[location.agentId]
  if (!instance || !agent) {
    throw new Error(`cannot plant ${instanceId} on ${location.agentId}`)
  }
  return {
    ...state,
    equipmentInstances: {
      ...(state.equipmentInstances ?? {}),
      [instanceId]: { ...instance, location },
    },
    agents: {
      ...state.agents,
      [location.agentId]: {
        ...agent,
        equipmentSlots: {
          ...agent.equipmentSlots,
          [location.slot]: instance.definitionId,
        },
      },
    },
  }
}

describe('ordinary equipment instance authority', () => {
  it('materializes only ordinary stock through the guarded stored-instance command', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.combat_stims = 1

    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    expect(materialized).toMatchObject({
      ok: true,
      instance: {
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
      state: { inventory: { signal_jammers: 0, combat_stims: 1 } },
    })
    expect(materializeStoredOrdinaryEquipmentInstance(state, 'combat_stims')).toMatchObject({
      ok: false,
      code: 'specialized_materialization_required',
      state: { inventory: { signal_jammers: 1, combat_stims: 1 } },
    })
    expect(materializeStoredOrdinaryEquipmentInstance(state, 'missing')).toMatchObject({
      ok: false,
      code: 'unknown_definition',
    })

    state.damagedEquipmentQueue = ['signal_jammers']
    expect(materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')).toMatchObject({
      ok: false,
      code: 'damaged_stock_ambiguity',
    })
  })

  it('does not reuse a same-week instance identity after manual destruction records it', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2

    const first = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!first.ok) throw new Error(first.code)
    const tracked = appendOperationEventDrafts(first.state, [
      createEquipmentInstanceMaterializedDraft({
        week: state.week,
        instanceId: first.instance.instanceId,
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        locationState: 'stored',
      }),
    ])
    const destroyed = destroyStoredOrdinaryEquipmentInstance(tracked, first.instance.instanceId)
    if (!destroyed.ok) throw new Error(destroyed.code)
    const terminal = appendOperationEventDrafts(destroyed.state, [
      createEquipmentInstanceDestroyedDraft({
        week: state.week,
        instanceId: destroyed.instance.instanceId,
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        reason: 'manual_disposal',
      }),
    ])

    const second = materializeStoredOrdinaryEquipmentInstance(terminal, 'signal_jammers')
    if (!second.ok) throw new Error(second.code)

    expect(first.instance.instanceId).toBe('equipment-instance-1-1')
    expect(second.instance.instanceId).toBe('equipment-instance-1-2')
  })

  it('does not reuse a same-week instance identity after re-aggregation records it', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2

    const first = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!first.ok) throw new Error(first.code)
    const tracked = appendOperationEventDrafts(first.state, [
      createEquipmentInstanceMaterializedDraft({
        week: state.week,
        instanceId: first.instance.instanceId,
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        locationState: 'stored',
      }),
    ])
    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      tracked,
      first.instance.instanceId
    )
    if (!reaggregated.ok) throw new Error(reaggregated.code)
    const terminal = appendOperationEventDrafts(reaggregated.state, [
      createEquipmentInstanceReaggregatedDraft({
        week: state.week,
        instanceId: reaggregated.instance.instanceId,
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        reason: 'manual_untracking',
      }),
    ])

    const second = materializeStoredOrdinaryEquipmentInstance(terminal, 'signal_jammers')
    if (!second.ok) throw new Error(second.code)

    expect(first.instance.instanceId).toBe('equipment-instance-1-1')
    expect(second.instance.instanceId).toBe('equipment-instance-1-2')
  })

  it('fails closed when catalog materialization is requested but only fabricated-lot stock remains unclaimed', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }

    expect(materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')).toMatchObject({
      ok: false,
      code: 'fabricated_provenance_required',
      state: { inventory: { signal_jammers: 1 } },
    })

    state.inventory.signal_jammers = 2
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    expect(materialized).toMatchObject({
      ok: true,
      state: { inventory: { signal_jammers: 1 } },
    })
    if (!materialized.ok) throw new Error(materialized.code)
    expect(
      resolveEquipmentDeconstructionSources(materialized.state, 'signal_jammers')
    ).toMatchObject([
      { source: { kind: 'catalog' }, quantity: 0 },
      { source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' }, quantity: 1 },
      {
        source: { kind: 'equipment_instance', instanceId: materialized.instance.instanceId },
        quantity: 1,
      },
    ])
  })

  it('rejects authored workshop identities as equipment recovery sources', () => {
    const state = createStartingState()
    const authoredIds = [
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
      PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
    ] as const

    for (const instanceId of authoredIds) {
      const source = {
        kind: 'equipment_instance' as const,
        instanceId,
      }
      const choice = resolveEquipmentDeconstructionSources(state, 'ward_seals').find((candidate) =>
        candidate.source.kind === 'equipment_instance'
          ? candidate.source.instanceId === instanceId
          : false
      )

      expect(choice).toMatchObject({
        available: false,
        quantity: 0,
        issueCode: 'equipment_instance_authored_workshop_protected',
      })
      expect(resolveEquipmentDeconstructionPreview(state, 'ward_seals', source)).toMatchObject({
        sourceIssueCode: 'equipment_instance_authored_workshop_protected',
        resolution: { available: false },
      })

      const queued = queueEquipmentDeconstruction(state, 'ward_seals', source)
      expect(queued.equipmentDeconstructionQueue).toHaveLength(0)
      expect(queued.equipmentInstances).toHaveProperty(instanceId)
    }

    state.inventory.ward_seals = 1
    const sequential = instantiateEquipmentInstance(state, 'ward_seals')
    if (!sequential.ok) throw new Error(sequential.code)
    const sequentialQueued = queueEquipmentDeconstruction(sequential.state, 'ward_seals', {
      kind: 'equipment_instance',
      instanceId: sequential.instance.instanceId,
    })
    expect(sequentialQueued.equipmentDeconstructionQueue).toHaveLength(1)
    expect(sequentialQueued.equipmentInstances).not.toHaveProperty(sequential.instance.instanceId)
    expect(sequentialQueued.equipmentInstances).toHaveProperty(
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )
  })

  it('materializes one fabricated-lot identity with retained grade provenance', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }

    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    expect(materialized).toMatchObject({
      ok: true,
      instance: {
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
        fabricationOrigin: {
          queueId: 'batch',
          recipeId: 'signal-jammers',
          gradeId: 'grade_2',
          completedWeek: 1,
        },
      },
      state: {
        inventory: { signal_jammers: 0 },
        fabricatedEquipmentLots: { batch: { quantity: 1, trackedInstanceUnits: 1 } },
      },
    })
    if (!materialized.ok) throw new Error(materialized.code)

    expect(
      validateOperationEventPayload(
        'equipment.instance_materialized',
        createEquipmentInstanceMaterializedDraft({
          week: 1,
          instanceId: materialized.instance.instanceId,
          definitionId: 'signal_jammers',
          definitionName: 'Signal Jammers',
          condition: 'operational',
          locationState: 'stored',
          fabricationQueueId: 'batch',
          fabricationRecipeId: 'signal-jammers',
          fabricationGradeId: 'grade_2',
          fabricationCompletedWeek: 1,
        }).payload
      ).success
    ).toBe(true)
    expect(
      validateOperationEventPayload(
        'equipment.instance_materialized',
        createEquipmentInstanceMaterializedDraft({
          week: 1,
          instanceId: materialized.instance.instanceId,
          definitionId: 'signal_jammers',
          definitionName: 'Signal Jammers',
          condition: 'operational',
          locationState: 'stored',
          fabricationQueueId: 'batch',
        }).payload
      ).success
    ).toBe(false)

    expect(
      materializeStoredOrdinaryEquipmentInstance(materialized.state, 'signal_jammers', {
        kind: 'fabricated_lot',
        fabricationQueueId: 'batch',
      })
    ).toMatchObject({ ok: false, code: 'inventory_unavailable' })

    expect(
      reaggregateStoredOrdinaryEquipmentInstance(
        materialized.state,
        materialized.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })

    const relocated = relocateEquipmentInstance(
      materialized.state,
      materialized.instance.instanceId,
      {
        state: 'equipped',
        agentId: 'a_mina',
        slot: 'utility1',
      }
    )
    expect(relocated).toMatchObject({
      ok: true,
      instance: {
        fabricationOrigin: {
          queueId: 'batch',
          gradeId: 'grade_2',
        },
      },
    })

    const preview = resolveEquipmentDeconstructionPreview(materialized.state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: materialized.instance.instanceId,
    })
    expect(preview?.resolution.participation).toMatchObject({
      state: 'graded',
      gradeId: 'grade_2',
    })

    const destroyed = destroyStoredOrdinaryEquipmentInstance(
      materialized.state,
      materialized.instance.instanceId
    )
    expect(destroyed).toMatchObject({ ok: true })
    if (!destroyed.ok) throw new Error(destroyed.code)
    expect(destroyed.state.inventory.signal_jammers).toBe(0)
    expect(destroyed.state.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 1,
      trackedInstanceUnits: 1,
    })
  })

  it('returns one fabricated-origin identity to its source lot without mutating quantity', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 2,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
      sibling: {
        queueId: 'sibling',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_3',
        completedWeek: 1,
      },
    }

    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    expect(materialized).toMatchObject({ ok: true })
    if (!materialized.ok) throw new Error(materialized.code)

    expect(
      reaggregateStoredOrdinaryEquipmentInstance(
        materialized.state,
        materialized.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })

    const returned = returnFabricatedOrdinaryEquipmentInstanceToLot(
      materialized.state,
      materialized.instance.instanceId
    )
    expect(returned).toMatchObject({
      ok: true,
      instance: {
        instanceId: materialized.instance.instanceId,
        definitionId: 'signal_jammers',
        fabricationOrigin: {
          queueId: 'batch',
          recipeId: 'signal-jammers',
          gradeId: 'grade_2',
          completedWeek: 1,
        },
      },
      state: {
        inventory: { signal_jammers: 1 },
        fabricatedEquipmentLots: {
          batch: { quantity: 2, trackedInstanceUnits: 0 },
          sibling: { quantity: 1 },
        },
      },
    })
    if (!returned.ok) throw new Error(returned.code)
    expect(returned.state.equipmentInstances?.[materialized.instance.instanceId]).toBeUndefined()

    expect(
      validateOperationEventPayload(
        'equipment.instance_reaggregated',
        createEquipmentInstanceReaggregatedDraft({
          week: 1,
          instanceId: materialized.instance.instanceId,
          definitionId: 'signal_jammers',
          definitionName: 'Signal Jammers',
          condition: 'operational',
          reason: 'fabricated_lot_return',
          fabricationQueueId: 'batch',
          fabricationRecipeId: 'signal-jammers',
          fabricationGradeId: 'grade_2',
          fabricationCompletedWeek: 1,
        }).payload
      ).success
    ).toBe(true)
    expect(
      validateOperationEventPayload(
        'equipment.instance_reaggregated',
        createEquipmentInstanceReaggregatedDraft({
          week: 1,
          instanceId: materialized.instance.instanceId,
          definitionId: 'signal_jammers',
          definitionName: 'Signal Jammers',
          condition: 'operational',
          reason: 'fabricated_lot_return',
          fabricationQueueId: 'batch',
        }).payload
      ).success
    ).toBe(false)
    expect(
      validateOperationEventPayload(
        'equipment.instance_reaggregated',
        createEquipmentInstanceReaggregatedDraft({
          week: 1,
          instanceId: materialized.instance.instanceId,
          definitionId: 'signal_jammers',
          definitionName: 'Signal Jammers',
          condition: 'operational',
          reason: 'manual_untracking',
          fabricationQueueId: 'batch',
          fabricationRecipeId: 'signal-jammers',
          fabricationGradeId: 'grade_2',
          fabricationCompletedWeek: 1,
        }).payload
      ).success
    ).toBe(false)

    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(
        returned.state,
        materialized.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'stale_transition' })
    expect(returned.state.inventory.signal_jammers).toBe(1)
    expect(returned.state.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 2,
      trackedInstanceUnits: 0,
    })

    const withEvent = appendOperationEventDrafts(returned.state, [
      createEquipmentInstanceReaggregatedDraft({
        week: 1,
        instanceId: materialized.instance.instanceId,
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        reason: 'fabricated_lot_return',
        fabricationQueueId: 'batch',
        fabricationRecipeId: 'signal-jammers',
        fabricationGradeId: 'grade_2',
        fabricationCompletedWeek: 1,
      }),
    ])
    const hydrated = hydrateGame(withEvent)
    expect(hydrated.inventory.signal_jammers).toBe(1)
    expect(hydrated.equipmentInstances?.[materialized.instance.instanceId]).toBeUndefined()
    expect(hydrated.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 2,
      trackedInstanceUnits: 0,
    })
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_reaggregated')
    ).toHaveLength(1)
  })

  it('blocks legacy aggregate loadout assignment from consuming fabricated-lot stock anonymously', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }

    const anonymousEquip = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')
    expect(anonymousEquip.inventory.signal_jammers).toBe(1)
    expect(anonymousEquip.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(anonymousEquip.fabricatedEquipmentLots?.batch?.trackedInstanceUnits).toBeUndefined()
    expect(getEquipmentInstanceAtAgentSlot(anonymousEquip, 'a_mina', 'utility1')).toBeUndefined()

    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    if (!materialized.ok) throw new Error(materialized.code)

    const equipped = equipStoredEquipmentInstance(
      materialized.state,
      materialized.instance.instanceId,
      'a_mina',
      'utility1'
    )
    expect(equipped.inventory.signal_jammers).toBe(0)
    expect(equipped.fabricatedEquipmentLots?.batch?.trackedInstanceUnits).toBe(1)
    expect(getEquipmentInstanceAtAgentSlot(equipped, 'a_mina', 'utility1')).toMatchObject({
      instanceId: materialized.instance.instanceId,
      fabricationOrigin: { queueId: 'batch', gradeId: 'grade_2' },
    })
  })

  it('fails fabricated return-to-lot closed for unsupported identities and missing lots', () => {
    const base = createStartingState()
    base.inventory.signal_jammers = 3
    base.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 2,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }

    const catalog = materializeStoredOrdinaryEquipmentInstance(base, 'signal_jammers')
    expect(catalog).toMatchObject({ ok: true })
    if (!catalog.ok) throw new Error(catalog.code)
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(catalog.state, catalog.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })

    const fabricated = materializeStoredOrdinaryEquipmentInstance(catalog.state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    expect(fabricated).toMatchObject({ ok: true })
    if (!fabricated.ok) throw new Error(fabricated.code)

    const missingLot = {
      ...fabricated.state,
      fabricatedEquipmentLots: {},
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(missingLot, fabricated.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })

    const zeroTracked = {
      ...fabricated.state,
      fabricatedEquipmentLots: {
        batch: {
          ...fabricated.state.fabricatedEquipmentLots!.batch,
          trackedInstanceUnits: 0,
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(zeroTracked, fabricated.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })

    const fractionalTracked = {
      ...fabricated.state,
      fabricatedEquipmentLots: {
        batch: {
          ...fabricated.state.fabricatedEquipmentLots!.batch,
          trackedInstanceUnits: 1.5 as unknown as number,
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(
        fractionalTracked,
        fabricated.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })
    expect(fractionalTracked.equipmentInstances?.[fabricated.instance.instanceId]).toBeDefined()

    const mismatchedOrigin = {
      ...fabricated.state,
      equipmentInstances: {
        ...fabricated.state.equipmentInstances,
        [fabricated.instance.instanceId]: {
          ...fabricated.instance,
          fabricationOrigin: {
            ...fabricated.instance.fabricationOrigin!,
            gradeId: 'grade_3' as const,
          },
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(
        mismatchedOrigin,
        fabricated.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })

    const damaged = {
      ...fabricated.state,
      equipmentInstances: {
        ...fabricated.state.equipmentInstances,
        [fabricated.instance.instanceId]: {
          ...fabricated.instance,
          condition: 'damaged' as const,
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(damaged, fabricated.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_reaggregation_unsupported' })

    const withPayload = {
      ...fabricated.state,
      equipmentInstances: {
        ...fabricated.state.equipmentInstances,
        [fabricated.instance.instanceId]: {
          ...fabricated.instance,
          payload: { resourceId: 'battery_charge', capacity: 2, remaining: 2 },
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(withPayload, fabricated.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'payload_reaggregation_unsupported' })

    const overflow = {
      ...fabricated.state,
      inventory: { ...fabricated.state.inventory, signal_jammers: Number.MAX_SAFE_INTEGER },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(overflow, fabricated.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'inventory_capacity_exceeded' })

    const recoveryClaimed = queueEquipmentDeconstruction(fabricated.state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: fabricated.instance.instanceId,
    })
    const withClaimedIdentity = {
      ...recoveryClaimed,
      equipmentInstances: {
        ...(recoveryClaimed.equipmentInstances ?? {}),
        [fabricated.instance.instanceId]: fabricated.instance,
      },
      fabricatedEquipmentLots: fabricated.state.fabricatedEquipmentLots,
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(
        withClaimedIdentity,
        fabricated.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'recovery_claimed' })

    const stimState = createStartingState()
    stimState.inventory.combat_stims = 1
    const stim = instantiateEquipmentInstance(stimState, 'combat_stims')
    expect(stim).toMatchObject({ ok: true })
    if (!stim.ok) throw new Error(stim.code)
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(stim.state, stim.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'specialized_reaggregation_required' })

    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(fabricated.state, 'missing')
    ).toMatchObject({ ok: false, code: 'stale_transition' })
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(fabricated.state, 'constructor')
    ).toMatchObject({ ok: false, code: 'invalid_instance_id' })
  })

  it('returns an equipped fabricated ordinary identity on an idle agent and clears only that slot', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 3
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 2,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
      sibling: {
        queueId: 'sibling',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_3',
        completedWeek: 1,
      },
    }

    const selected = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    expect(selected).toMatchObject({ ok: true })
    if (!selected.ok) throw new Error(selected.code)
    const sibling = materializeStoredOrdinaryEquipmentInstance(selected.state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'sibling',
    })
    expect(sibling).toMatchObject({ ok: true })
    if (!sibling.ok) throw new Error(sibling.code)

    const equipped = relocateEquipmentInstance(sibling.state, selected.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(equipped).toMatchObject({ ok: true })
    if (!equipped.ok) throw new Error(equipped.code)
    const siblingEquipped = relocateEquipmentInstance(equipped.state, sibling.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility1',
    })
    expect(siblingEquipped).toMatchObject({ ok: true })
    if (!siblingEquipped.ok) throw new Error(siblingEquipped.code)

    const returned = returnFabricatedOrdinaryEquipmentInstanceToLot(
      siblingEquipped.state,
      selected.instance.instanceId
    )
    expect(returned).toMatchObject({
      ok: true,
      instance: {
        instanceId: selected.instance.instanceId,
        definitionId: 'signal_jammers',
        fabricationOrigin: { queueId: 'batch', gradeId: 'grade_2' },
      },
    })
    if (!returned.ok) throw new Error(returned.code)
    expect(returned.state.inventory.signal_jammers).toBe(2)
    expect(returned.state.equipmentInstances).not.toHaveProperty(selected.instance.instanceId)
    expect(getEquipmentInstanceAtAgentSlot(returned.state, 'a_mina', 'utility1')).toBeUndefined()
    expect(returned.state.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(getEquipmentInstanceAtAgentSlot(returned.state, 'a_casey', 'utility1')?.instanceId).toBe(
      sibling.instance.instanceId
    )
    expect(returned.state.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 2,
      trackedInstanceUnits: 0,
    })
    expect(returned.state.fabricatedEquipmentLots?.sibling).toMatchObject({
      quantity: 1,
      trackedInstanceUnits: 1,
    })
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(returned.state, selected.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'stale_transition' })
  })

  it('fails equipped fabricated return-to-lot closed without unequipping', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 1,
      },
    }
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      fabricationOrigin: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        gradeId: 'grade_2',
        completedWeek: 1,
      },
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) throw new Error(created.code)

    const trainingState = {
      ...created.state,
      agents: {
        ...created.state.agents,
        a_mina: {
          ...created.state.agents.a_mina,
          assignment: {
            state: 'training' as const,
            startedWeek: 1,
            trainingProgramId: 'analysis-lab',
          },
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(trainingState, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'agent_not_idle' })
    expect(getEquipmentInstanceAtAgentSlot(trainingState, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )

    const missingLot = {
      ...created.state,
      fabricatedEquipmentLots: {},
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(missingLot, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })
    expect(getEquipmentInstanceAtAgentSlot(missingLot, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )

    const damaged = {
      ...created.state,
      equipmentInstances: {
        ...created.state.equipmentInstances,
        [created.instance.instanceId]: {
          ...created.instance,
          condition: 'damaged' as const,
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(damaged, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_reaggregation_unsupported' })
    expect(getEquipmentInstanceAtAgentSlot(damaged, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )

    const withPayload = {
      ...created.state,
      equipmentInstances: {
        ...created.state.equipmentInstances,
        [created.instance.instanceId]: {
          ...created.instance,
          payload: { resourceId: 'battery_charge', capacity: 2, remaining: 2 },
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(withPayload, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'payload_reaggregation_unsupported' })
    expect(getEquipmentInstanceAtAgentSlot(withPayload, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )

    const stimState = createStartingState()
    stimState.inventory.combat_stims = 1
    const stim = instantiateEquipmentInstance(stimState, 'combat_stims', {
      location: { state: 'equipped', agentId: 'a_ava', slot: 'utility1' },
    })
    expect(stim).toMatchObject({ ok: true })
    if (!stim.ok) throw new Error(stim.code)
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(stim.state, stim.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'specialized_reaggregation_required' })
    expect(getEquipmentInstanceAtAgentSlot(stim.state, 'a_ava', 'utility1')?.instanceId).toBe(
      stim.instance.instanceId
    )

    const catalog = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    expect(catalog).toMatchObject({ ok: true })
    if (!catalog.ok) throw new Error(catalog.code)
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(catalog.state, catalog.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })
    expect(getEquipmentInstanceAtAgentSlot(catalog.state, 'a_mina', 'utility1')?.instanceId).toBe(
      catalog.instance.instanceId
    )
  })

  it('hydrates fabricated-origin instances and rejects mismatched provenance siblings', () => {
    const state = createStartingState()
    state.week = 2
    state.inventory.signal_jammers = 0
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 1,
      },
    }
    state.equipmentInstances = {
      'equipment-instance-1-1': {
        instanceId: 'equipment-instance-1-1',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
        fabricationOrigin: {
          queueId: 'batch',
          recipeId: 'signal-jammers',
          gradeId: 'grade_2',
          completedWeek: 1,
        },
      },
      'equipment-instance-1-2': {
        instanceId: 'equipment-instance-1-2',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
        fabricationOrigin: {
          queueId: 'batch',
          recipeId: 'signal-jammers',
          gradeId: 'grade_3',
          completedWeek: 1,
        },
      },
      'equipment-instance-1-3': {
        instanceId: 'equipment-instance-1-3',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
        fabricationOrigin: {
          queueId: 'missing',
          recipeId: 'signal-jammers',
          gradeId: 'grade_2',
          completedWeek: 1,
        },
      },
    }

    const hydrated = hydrateGame(state)
    expect(hydrated.equipmentInstances?.['equipment-instance-1-1']).toMatchObject({
      fabricationOrigin: { queueId: 'batch', gradeId: 'grade_2' },
    })
    expect(hydrated.equipmentInstances?.['equipment-instance-1-2']).toBeUndefined()
    expect(hydrated.equipmentInstances?.['equipment-instance-1-3']).toBeUndefined()
    expect(hydrated.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 1,
      trackedInstanceUnits: 1,
    })
  })

  it('lists stored instances in stable code-unit order as immutable snapshots', () => {
    const state = createStartingState()
    state.equipmentInstances = {
      'equipment-instance-z': {
        instanceId: 'equipment-instance-z',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
      'equipment-instance-a': {
        instanceId: 'equipment-instance-a',
        definitionId: 'medkits',
        condition: 'damaged',
        location: { state: 'stored' },
      },
    }

    const instances = listStoredEquipmentInstances(state)
    expect(instances.map((instance) => instance.instanceId)).toEqual([
      'equipment-instance-a',
      'equipment-instance-z',
    ])
    expect(listStoredEquipmentInstances(state, 'signal_jammers')).toHaveLength(1)
    expect(Object.isFrozen(instances[0])).toBe(true)
    expect(instances[0]).not.toBe(state.equipmentInstances['equipment-instance-a'])
  })

  it('destroys only the selected stored ordinary identity without restoring aggregate stock', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 3
    state.inventory.electronics = 4
    state.damagedEquipmentQueue = ['signal_jammers']
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    state.equipmentInstances = {
      selected: {
        instanceId: 'selected',
        definitionId: 'signal_jammers',
        condition: 'damaged',
        location: { state: 'stored' },
      },
      sibling: {
        instanceId: 'sibling',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    }

    const destroyed = destroyStoredOrdinaryEquipmentInstance(state, 'selected')
    expect(destroyed).toMatchObject({
      ok: true,
      instance: {
        instanceId: 'selected',
        definitionId: 'signal_jammers',
        condition: 'damaged',
      },
      state: {
        damagedEquipmentQueue: ['signal_jammers'],
        inventory: { signal_jammers: 3, electronics: 4 },
        fabricatedEquipmentLots: { batch: { quantity: 1 } },
        equipmentInstances: { sibling: { instanceId: 'sibling' } },
      },
    })
    if (!destroyed.ok) throw new Error(destroyed.code)
    expect(destroyed.state.equipmentInstances).not.toHaveProperty('selected')
    expect(Object.isFrozen(destroyed.instance)).toBe(true)
    expect(destroyStoredOrdinaryEquipmentInstance(destroyed.state, 'selected')).toMatchObject({
      ok: false,
      code: 'stale_transition',
      state: destroyed.state,
    })
  })

  it('fails closed for unsafe, equipped, Combat Stim, payload-bearing, and recovery-claimed copies', () => {
    const state = createStartingState()
    state.equipmentInstances = {
      equipped: {
        instanceId: 'equipped',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
      },
      stim: {
        instanceId: 'stim',
        definitionId: 'combat_stims',
        condition: 'operational',
        location: { state: 'stored' },
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
      payload: {
        instanceId: 'payload',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
        payload: { resourceId: 'test_payload', capacity: 1, remaining: 1 },
      },
    }

    expect(destroyStoredOrdinaryEquipmentInstance(state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(destroyStoredOrdinaryEquipmentInstance(state, 'missing')).toMatchObject({
      ok: false,
      code: 'stale_transition',
    })
    const trainingState = {
      ...state,
      agents: {
        ...state.agents,
        a_mina: {
          ...state.agents.a_mina,
          assignment: {
            state: 'training' as const,
            startedWeek: 1,
            trainingProgramId: 'analysis-lab',
          },
        },
      },
    }
    expect(destroyStoredOrdinaryEquipmentInstance(trainingState, 'equipped')).toMatchObject({
      ok: false,
      code: 'agent_not_idle',
    })
    expect(destroyStoredOrdinaryEquipmentInstance(state, 'stim')).toMatchObject({
      ok: false,
      code: 'specialized_destruction_required',
    })
    expect(destroyStoredOrdinaryEquipmentInstance(state, 'payload')).toMatchObject({
      ok: false,
      code: 'payload_destruction_unsupported',
    })

    const source = createStartingState()
    source.inventory.signal_jammers = 1
    const materialized = materializeStoredOrdinaryEquipmentInstance(source, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)
    const queued = queueEquipmentDeconstruction(materialized.state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: materialized.instance.instanceId,
    })
    expect(queued.equipmentDeconstructionQueue).toHaveLength(1)
    const conflicting = {
      ...queued,
      equipmentInstances: {
        ...(queued.equipmentInstances ?? {}),
        [materialized.instance.instanceId]: materialized.instance,
      },
    }
    expect(
      destroyStoredOrdinaryEquipmentInstance(conflicting, materialized.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'recovery_claimed' })

    const completed = advanceEquipmentDeconstructionQueues({
      ...queued,
      equipmentDeconstructionQueue: queued.equipmentDeconstructionQueue?.map((entry) => ({
        ...entry,
        remainingWeeks: 1,
      })),
    }).state
    const completedConflict = {
      ...completed,
      equipmentInstances: {
        ...(completed.equipmentInstances ?? {}),
        [materialized.instance.instanceId]: materialized.instance,
      },
    }
    expect(
      destroyStoredOrdinaryEquipmentInstance(completedConflict, materialized.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'recovery_claimed' })
  })

  it('destroys an equipped ordinary identity on an idle agent and clears only that slot', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 3
    state.inventory.electronics = 4
    const created = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)
    const sibling = instantiateEquipmentInstance(created.state, 'signal_jammers')
    if (!sibling.ok) throw new Error(sibling.code)
    const equipped = relocateEquipmentInstance(sibling.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    const siblingEquipped = relocateEquipmentInstance(equipped.state, sibling.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility1',
    })
    if (!siblingEquipped.ok) throw new Error(siblingEquipped.code)

    const destroyed = destroyStoredOrdinaryEquipmentInstance(
      siblingEquipped.state,
      created.instance.instanceId
    )
    expect(destroyed).toMatchObject({
      ok: true,
      instance: { instanceId: created.instance.instanceId, definitionId: 'signal_jammers' },
    })
    if (!destroyed.ok) throw new Error(destroyed.code)
    expect(destroyed.state.inventory.signal_jammers).toBe(1)
    expect(destroyed.state.inventory.electronics).toBe(4)
    expect(destroyed.state.equipmentInstances).not.toHaveProperty(created.instance.instanceId)
    expect(getEquipmentInstanceAtAgentSlot(destroyed.state, 'a_mina', 'utility1')).toBeUndefined()
    expect(destroyed.state.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(
      getEquipmentInstanceAtAgentSlot(destroyed.state, 'a_casey', 'utility1')?.instanceId
    ).toBe(sibling.instance.instanceId)
    expect(destroyed.state.agents.a_casey.equipmentSlots?.utility1).toBe('signal_jammers')
  })

  it('does not unequip a Combat Stim when ordinary destruction is requested', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 1
    const created = instantiateEquipmentInstance(state, 'combat_stims', {
      location: { state: 'equipped', agentId: 'a_ava', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      destroyStoredOrdinaryEquipmentInstance(created.state, created.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'specialized_destruction_required',
    })
    expect(getEquipmentInstanceAtAgentSlot(created.state, 'a_ava', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )
  })

  it('fail-closes destroy and catalog re-aggregation for authored workshop identities', () => {
    const authoredIds = [
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
      PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
    ] as const
    const state = createStartingState()
    const seeded = { ...(state.equipmentInstances ?? {}) }
    expect(state.inventory.ward_seals ?? 0).toBe(0)

    for (const instanceId of authoredIds) {
      const destroyed = destroyStoredOrdinaryEquipmentInstance(state, instanceId)
      expect(destroyed).toMatchObject({
        ok: false,
        code: 'authored_workshop_identity_protected',
      })
      expect(destroyed.state.inventory.ward_seals ?? 0).toBe(0)
      expect(destroyed.state.equipmentInstances).toEqual(seeded)
      expect(
        destroyed.state.events.filter(
          (event) =>
            event.type === 'equipment.instance_destroyed' ||
            event.type === 'equipment.instance_reaggregated'
        )
      ).toEqual([])

      const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(state, instanceId)
      expect(reaggregated).toMatchObject({
        ok: false,
        code: 'authored_workshop_identity_protected',
      })
      expect(reaggregated.state.inventory.ward_seals ?? 0).toBe(0)
      expect(reaggregated.state.equipmentInstances).toEqual(seeded)
      expect(
        reaggregated.state.events.filter(
          (event) =>
            event.type === 'equipment.instance_destroyed' ||
            event.type === 'equipment.instance_reaggregated'
        )
      ).toEqual([])
    }

    const omitted = { ...state, equipmentInstances: {} }
    expect(
      destroyStoredOrdinaryEquipmentInstance(omitted, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID)
    ).toMatchObject({ ok: false, code: 'authored_workshop_identity_protected' })
    expect(omitted.equipmentInstances).toEqual({})
  })

  it('does not relocate an equipped authored workshop identity on destroy or re-agg', () => {
    const state = createStartingState()
    const equipped = plantEquippedInstance(state, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(getEquipmentInstanceAtAgentSlot(equipped, 'a_mina', 'utility1')?.instanceId).toBe(
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )

    const destroyed = destroyStoredOrdinaryEquipmentInstance(
      equipped,
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )
    expect(destroyed).toMatchObject({
      ok: false,
      code: 'authored_workshop_identity_protected',
    })
    expect(destroyed.state.inventory.ward_seals ?? 0).toBe(equipped.inventory.ward_seals ?? 0)
    expect(getEquipmentInstanceAtAgentSlot(destroyed.state, 'a_mina', 'utility1')?.instanceId).toBe(
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )
    expect(
      destroyed.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]?.location
    ).toEqual({ state: 'equipped', agentId: 'a_mina', slot: 'utility1' })

    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      equipped,
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID
    )
    expect(reaggregated).toMatchObject({
      ok: false,
      code: 'authored_workshop_identity_protected',
    })
    expect(reaggregated.state.inventory.ward_seals ?? 0).toBe(equipped.inventory.ward_seals ?? 0)
    expect(
      getEquipmentInstanceAtAgentSlot(reaggregated.state, 'a_mina', 'utility1')?.instanceId
    ).toBe(FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID)
  })

  it('fail-closes new equipped locations for authored workshop identities', () => {
    const authoredIds = [
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
      PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
    ] as const
    const state = createStartingState()
    const seeded = { ...(state.equipmentInstances ?? {}) }

    for (const instanceId of authoredIds) {
      for (const agentId of ['a_mina', 'a_kellan'] as const) {
        const relocated = relocateEquipmentInstance(state, instanceId, {
          state: 'equipped',
          agentId,
          slot: 'utility1',
        })
        expect(relocated).toMatchObject({
          ok: false,
          code: 'authored_workshop_identity_protected',
        })
        expect(relocated.state.equipmentInstances).toEqual(seeded)
        expect(canEquipStoredEquipmentInstance(state, instanceId, agentId, 'utility1')).toBe(false)
        expect(equipStoredEquipmentInstance(state, instanceId, agentId, 'utility1')).toEqual(
          expect.objectContaining({
            equipmentInstances: seeded,
            agents: expect.objectContaining({
              [agentId]: expect.objectContaining({
                equipmentSlots: state.agents[agentId].equipmentSlots,
              }),
            }),
          })
        )
      }
      const stillStored = relocateEquipmentInstance(state, instanceId, { state: 'stored' })
      expect(stillStored).toMatchObject({ ok: true })
      if (!stillStored.ok) throw new Error(stillStored.code)
      expect(stillStored.instance.location).toEqual({ state: 'stored' })
      expect(stillStored.state.equipmentInstances).toEqual(seeded)
    }

    state.inventory.ward_seals = 1
    const sequential = instantiateEquipmentInstance(state, 'ward_seals')
    if (!sequential.ok) throw new Error(sequential.code)
    const ordinary = relocateEquipmentInstance(sequential.state, sequential.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(ordinary).toMatchObject({ ok: true })
    if (!ordinary.ok) throw new Error(ordinary.code)
    expect(ordinary.instance.location).toEqual({
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(
      canEquipStoredEquipmentInstance(
        sequential.state,
        sequential.instance.instanceId,
        'a_mina',
        'utility1'
      )
    ).toBe(true)
  })

  it('returns a planted authored leftover to storage and keeps the same equipped slot', () => {
    const planted = plantEquippedInstance(
      createStartingState(),
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      { state: 'equipped', agentId: 'a_mina', slot: 'utility1' }
    )
    const stored = relocateEquipmentInstance(planted, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID, {
      state: 'stored',
    })
    expect(stored).toMatchObject({ ok: true })
    if (!stored.ok) throw new Error(stored.code)
    expect(stored.instance.location).toEqual({ state: 'stored' })
    expect(getEquipmentInstanceAtAgentSlot(stored.state, 'a_mina', 'utility1')).toBeUndefined()

    const unequipped = unequipAgentItem(planted, 'a_mina', 'utility1')
    expect(
      unequipped.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]?.location
    ).toEqual({ state: 'stored' })
    expect(getEquipmentInstanceAtAgentSlot(unequipped, 'a_mina', 'utility1')).toBeUndefined()

    const sameSlot = relocateEquipmentInstance(planted, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(sameSlot).toMatchObject({ ok: true })
    if (!sameSlot.ok) throw new Error(sameSlot.code)
    expect(sameSlot.instance.location).toEqual({
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })

    const transferred = relocateEquipmentInstance(
      planted,
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      { state: 'equipped', agentId: 'a_kellan', slot: 'utility1' }
    )
    expect(transferred).toMatchObject({
      ok: false,
      code: 'authored_workshop_identity_protected',
    })
    expect(
      transferred.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]?.location
    ).toEqual({ state: 'equipped', agentId: 'a_mina', slot: 'utility1' })
  })

  it('does not transfer an equipped authored leftover through catalog loadout', () => {
    const leftoverOnly = plantEquippedInstance(
      createStartingState(),
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      { state: 'equipped', agentId: 'a_mina', slot: 'utility1' }
    )
    expect(leftoverOnly.inventory.ward_seals ?? 0).toBe(0)
    const attempted = equipAgentItem(leftoverOnly, 'a_kellan', 'utility1', 'ward_seals')
    expect(
      attempted.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]?.location
    ).toEqual({ state: 'equipped', agentId: 'a_mina', slot: 'utility1' })
    expect(getEquipmentInstanceAtAgentSlot(attempted, 'a_kellan', 'utility1')).toBeUndefined()
    expect(attempted.agents.a_mina.equipmentSlots?.utility1).toBe('ward_seals')
    expect(attempted.agents.a_kellan.equipmentSlots?.utility1).toBeUndefined()

    const state = createStartingState()
    state.inventory.ward_seals = 1
    const sequential = instantiateEquipmentInstance(state, 'ward_seals')
    if (!sequential.ok) throw new Error(sequential.code)
    const planted = plantEquippedInstance(
      sequential.state,
      FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      { state: 'equipped', agentId: 'a_mina', slot: 'utility1' }
    )
    const ordinary = relocateEquipmentInstance(planted, sequential.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility2',
    })
    if (!ordinary.ok) throw new Error(ordinary.code)
    const transferred = equipAgentItem(ordinary.state, 'a_kellan', 'utility1', 'ward_seals')
    expect(
      transferred.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]?.location
    ).toEqual({ state: 'equipped', agentId: 'a_mina', slot: 'utility1' })
    expect(getEquipmentInstanceAtAgentSlot(transferred, 'a_kellan', 'utility1')?.instanceId).toBe(
      sequential.instance.instanceId
    )
    expect(transferred.agents.a_mina.equipmentSlots?.utility1).toBe('ward_seals')
    expect(transferred.agents.a_mina.equipmentSlots?.utility2).toBeUndefined()
  })

  it('still destroys and catalog-reaggregates sequential ordinary ward_seals copies', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals')
    expect(created).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-1', definitionId: 'ward_seals' },
    })
    if (!created.ok) throw new Error(created.code)
    expect(created.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    )

    const destroyed = destroyStoredOrdinaryEquipmentInstance(
      created.state,
      created.instance.instanceId
    )
    expect(destroyed).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-1' },
    })
    if (!destroyed.ok) throw new Error(destroyed.code)
    expect(destroyed.state.inventory.ward_seals).toBe(0)
    expect(destroyed.state.equipmentInstances).not.toHaveProperty(created.instance.instanceId)
    expect(destroyed.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]).toEqual(
      state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    )
    expect(
      destroyed.state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID]
    ).toEqual(state.equipmentInstances?.[EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID])
    expect(
      destroyed.state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]
    ).toEqual(state.equipmentInstances?.[PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID])

    const restocked = {
      ...destroyed.state,
      inventory: { ...destroyed.state.inventory, ward_seals: 1 },
    }
    const rematerialized = instantiateEquipmentInstance(restocked, 'ward_seals')
    expect(rematerialized).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-1', definitionId: 'ward_seals' },
    })
    if (!rematerialized.ok) throw new Error(rematerialized.code)
    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      rematerialized.state,
      rematerialized.instance.instanceId
    )
    expect(reaggregated).toMatchObject({ ok: true })
    if (!reaggregated.ok) throw new Error(reaggregated.code)
    expect(reaggregated.state.inventory.ward_seals).toBe(1)
    expect(reaggregated.state.equipmentInstances).not.toHaveProperty(
      rematerialized.instance.instanceId
    )
    expect(
      reaggregated.state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]
    ).toEqual(state.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID])
  })

  it('re-aggregates one exact operational copy without mutating sibling authorities', () => {
    const state = createStartingState()
    state.inventory = { signal_jammers: 3, electronics: 4 }
    state.damagedEquipmentQueue = ['signal_jammers']
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    state.equipmentInstances = {
      selected: {
        instanceId: 'selected',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
      sibling: {
        instanceId: 'sibling',
        definitionId: 'signal_jammers',
        condition: 'damaged',
        location: { state: 'stored' },
      },
    }

    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(state, 'selected')
    expect(reaggregated).toMatchObject({
      ok: true,
      instance: {
        instanceId: 'selected',
        definitionId: 'signal_jammers',
        condition: 'operational',
      },
      state: {
        damagedEquipmentQueue: ['signal_jammers'],
        inventory: { signal_jammers: 4, electronics: 4 },
        fabricatedEquipmentLots: { batch: { quantity: 1 } },
        equipmentInstances: { sibling: { instanceId: 'sibling', condition: 'damaged' } },
      },
    })
    if (!reaggregated.ok) throw new Error(reaggregated.code)
    expect(Object.isFrozen(reaggregated.instance)).toBe(true)
    expect(reaggregated.state.equipmentDeconstructionQueue).toEqual(
      state.equipmentDeconstructionQueue
    )
    expect(reaggregated.state.equipmentRecoveryOutcomes).toEqual(state.equipmentRecoveryOutcomes)
    expect(reaggregated.state.agents.a_mina.equipmentSlots).toEqual(
      state.agents.a_mina.equipmentSlots
    )
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(reaggregated.state, 'selected')
    ).toMatchObject({ ok: false, code: 'stale_transition', state: reaggregated.state })
  })

  it('fails re-aggregation closed for unsupported identities and unsafe aggregate credit', () => {
    const state = createStartingState()
    state.equipmentInstances = {
      equipped: {
        instanceId: 'equipped',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
      },
      damaged: {
        instanceId: 'damaged',
        definitionId: 'signal_jammers',
        condition: 'damaged',
        location: { state: 'stored' },
      },
      stim: {
        instanceId: 'stim',
        definitionId: 'combat_stims',
        condition: 'operational',
        location: { state: 'stored' },
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
      payload: {
        instanceId: 'payload',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
        payload: { resourceId: 'test_payload', capacity: 1, remaining: 1 },
      },
      overflow: {
        instanceId: 'overflow',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    }
    state.inventory.signal_jammers = Number.MAX_SAFE_INTEGER

    expect(reaggregateStoredOrdinaryEquipmentInstance(state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(reaggregateStoredOrdinaryEquipmentInstance(state, 'missing')).toMatchObject({
      ok: false,
      code: 'stale_transition',
    })
    const trainingState = {
      ...state,
      inventory: { ...state.inventory, signal_jammers: 1 },
      agents: {
        ...state.agents,
        a_mina: {
          ...state.agents.a_mina,
          assignment: {
            state: 'training' as const,
            startedWeek: 1,
            trainingProgramId: 'analysis-lab',
          },
        },
      },
    }
    expect(reaggregateStoredOrdinaryEquipmentInstance(trainingState, 'equipped')).toMatchObject({
      ok: false,
      code: 'agent_not_idle',
    })
    expect(reaggregateStoredOrdinaryEquipmentInstance(state, 'damaged')).toMatchObject({
      ok: false,
      code: 'condition_reaggregation_unsupported',
    })
    expect(reaggregateStoredOrdinaryEquipmentInstance(state, 'stim')).toMatchObject({
      ok: false,
      code: 'specialized_reaggregation_required',
    })
    expect(reaggregateStoredOrdinaryEquipmentInstance(state, 'payload')).toMatchObject({
      ok: false,
      code: 'payload_reaggregation_unsupported',
    })
    expect(reaggregateStoredOrdinaryEquipmentInstance(state, 'overflow')).toMatchObject({
      ok: false,
      code: 'inventory_capacity_exceeded',
      state: { equipmentInstances: { overflow: { instanceId: 'overflow' } } },
    })
  })

  it('re-aggregates an equipped ordinary identity on an idle agent and clears only that slot', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 3
    const created = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)
    const sibling = instantiateEquipmentInstance(created.state, 'signal_jammers')
    if (!sibling.ok) throw new Error(sibling.code)
    const equipped = relocateEquipmentInstance(sibling.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    const siblingEquipped = relocateEquipmentInstance(equipped.state, sibling.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility1',
    })
    if (!siblingEquipped.ok) throw new Error(siblingEquipped.code)

    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      siblingEquipped.state,
      created.instance.instanceId
    )
    expect(reaggregated).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        definitionId: 'signal_jammers',
        condition: 'operational',
      },
    })
    if (!reaggregated.ok) throw new Error(reaggregated.code)
    expect(reaggregated.state.inventory.signal_jammers).toBe(2)
    expect(reaggregated.state.equipmentInstances).not.toHaveProperty(created.instance.instanceId)
    expect(reaggregated.state.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(
      getEquipmentInstanceAtAgentSlot(reaggregated.state, 'a_casey', 'utility1')?.instanceId
    ).toBe(sibling.instance.instanceId)
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(reaggregated.state, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'stale_transition' })
  })

  it('rejects equipped fabricated-origin catalog re-aggregation without unequipping', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 1,
      },
    }
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      fabricationOrigin: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        gradeId: 'grade_2',
        completedWeek: 1,
      },
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(created.state, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'fabricated_provenance_required' })
    expect(getEquipmentInstanceAtAgentSlot(created.state, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )
    expect(created.state.inventory.signal_jammers).toBe(0)
  })

  it('rejects re-aggregation for active and completed recovery claims', () => {
    const source = createStartingState()
    source.inventory.signal_jammers = 1
    const materialized = materializeStoredOrdinaryEquipmentInstance(source, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)
    const queued = queueEquipmentDeconstruction(materialized.state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: materialized.instance.instanceId,
    })
    const conflicting = {
      ...queued,
      equipmentInstances: {
        ...(queued.equipmentInstances ?? {}),
        [materialized.instance.instanceId]: materialized.instance,
      },
    }
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(conflicting, materialized.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'recovery_claimed' })

    const completed = advanceEquipmentDeconstructionQueues({
      ...queued,
      equipmentDeconstructionQueue: queued.equipmentDeconstructionQueue?.map((entry) => ({
        ...entry,
        remainingWeeks: 1,
      })),
    }).state
    const completedConflict = {
      ...completed,
      equipmentInstances: {
        ...(completed.equipmentInstances ?? {}),
        [materialized.instance.instanceId]: materialized.instance,
      },
    }
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(
        completedConflict,
        materialized.instance.instanceId
      )
    ).toMatchObject({ ok: false, code: 'recovery_claimed' })
  })

  it('round-trips strict re-aggregation history without recreating or re-crediting identity', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)
    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      materialized.state,
      materialized.instance.instanceId
    )
    if (!reaggregated.ok) throw new Error(reaggregated.code)
    const withEvent = appendOperationEventDrafts(reaggregated.state, [
      createEquipmentInstanceReaggregatedDraft({
        week: reaggregated.state.week,
        instanceId: reaggregated.instance.instanceId,
        definitionId: reaggregated.instance.definitionId,
        definitionName: 'Signal Jammers',
        condition: 'operational',
        reason: 'manual_untracking',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    const validEvent = serialized.events.at(-1)
    serialized.events.push({
      ...validEvent,
      id: 'evt-malformed-reaggregation',
      payload: { ...validEvent.payload, condition: 'damaged' },
    })

    const hydrated = hydrateGame(serialized)
    expect(hydrated.inventory.signal_jammers).toBe(1)
    expect(hydrated.equipmentInstances).not.toHaveProperty(reaggregated.instance.instanceId)
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_reaggregated')
    ).toHaveLength(1)
  })

  it('round-trips a strict destruction event without recreating the deleted identity', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)
    const destroyed = destroyStoredOrdinaryEquipmentInstance(
      materialized.state,
      materialized.instance.instanceId
    )
    if (!destroyed.ok) throw new Error(destroyed.code)
    const withEvent = appendOperationEventDrafts(destroyed.state, [
      createEquipmentInstanceDestroyedDraft({
        week: destroyed.state.week,
        instanceId: destroyed.instance.instanceId,
        definitionId: destroyed.instance.definitionId,
        definitionName: 'Signal Jammers',
        condition: destroyed.instance.condition,
        reason: 'manual_disposal',
      }),
    ])

    const serialized = JSON.parse(JSON.stringify(withEvent))
    const validEvent = serialized.events.at(-1)
    serialized.events.push({
      ...validEvent,
      id: 'evt-malformed-destruction',
      payload: { ...validEvent.payload, instanceId: 'constructor' },
    })
    const hydrated = hydrateGame(serialized)
    expect(hydrated.equipmentInstances).not.toHaveProperty(destroyed.instance.instanceId)
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_destroyed')
    ).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({ instanceId: destroyed.instance.instanceId }),
      }),
    ])
  })

  it('round-trips a strict materialization event with the tracked identity', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)
    const withEvent = appendOperationEventDrafts(materialized.state, [
      createEquipmentInstanceMaterializedDraft({
        week: materialized.state.week,
        instanceId: materialized.instance.instanceId,
        definitionId: materialized.instance.definitionId,
        definitionName: 'Signal Jammers',
        condition: materialized.instance.condition,
        locationState: 'stored',
      }),
    ])

    const serialized = JSON.parse(JSON.stringify(withEvent))
    const validEvent = serialized.events.at(-1)
    serialized.events.push({
      ...validEvent,
      id: 'evt-malformed-materialization',
      payload: { ...validEvent.payload, instanceId: 'constructor' },
    })
    const hydrated = hydrateGame(serialized)
    expect(hydrated.equipmentInstances).toHaveProperty(materialized.instance.instanceId)
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_materialized')
    ).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({ instanceId: materialized.instance.instanceId }),
      }),
    ])
  })

  it('assigns an exact stored instance while atomically preserving displaced stock', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.medkits = 0
    state.agents.a_mina.equipmentSlots = { utility1: 'medkits' }
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)

    const equipped = equipStoredEquipmentInstance(
      materialized.state,
      materialized.instance.instanceId,
      'a_mina',
      'utility1'
    )
    expect(equipped.inventory.signal_jammers).toBe(0)
    expect(equipped.inventory.medkits).toBe(1)
    expect(getEquipmentInstanceAtAgentSlot(equipped, 'a_mina', 'utility1')?.instanceId).toBe(
      materialized.instance.instanceId
    )

    const unequipped = unequipAgentItem(equipped, 'a_mina', 'utility1')
    expect(unequipped.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstance(unequipped, materialized.instance.instanceId)?.location).toEqual({
      state: 'stored',
    })
  })

  it('rejects stale, incompatible, and non-idle generic instance assignment without mutation', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers')
    if (!materialized.ok) throw new Error(materialized.code)

    expect(
      equipStoredEquipmentInstance(
        materialized.state,
        'equipment-instance-missing',
        'a_mina',
        'utility1'
      )
    ).toEqual(materialized.state)
    expect(
      equipStoredEquipmentInstance(
        materialized.state,
        materialized.instance.instanceId,
        'a_mina',
        'weapon'
      )
    ).toEqual(materialized.state)

    const assigned = {
      ...materialized.state,
      agents: {
        ...materialized.state.agents,
        a_mina: {
          ...materialized.state.agents.a_mina,
          assignment: {
            state: 'assigned' as const,
            caseId: 'case-1',
            teamId: 't-01',
            startedWeek: 1,
          },
        },
      },
    }
    expect(
      equipStoredEquipmentInstance(assigned, materialized.instance.instanceId, 'a_mina', 'utility1')
    ).toEqual(assigned)
  })

  it('instantiates one deterministic stored object and decrements aggregate stock exactly once', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2

    const first = instantiateEquipmentInstance(state, 'signal_jammers')
    expect(first).toMatchObject({
      ok: true,
      instance: {
        instanceId: 'equipment-instance-1-1',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    })
    if (!first.ok) throw new Error(first.code)
    expect(first.state.inventory.signal_jammers).toBe(1)
    expect(Object.isFrozen(first.instance)).toBe(true)
    expect(Object.isFrozen(first.instance.location)).toBe(true)
    expect(first.instance).not.toBe(first.state.equipmentInstances?.[first.instance.instanceId])

    const second = instantiateEquipmentInstance(first.state, 'signal_jammers')
    expect(second).toMatchObject({ ok: true, instance: { instanceId: 'equipment-instance-1-2' } })
    expect(second.state.inventory.signal_jammers).toBe(0)
  })

  it('reserves instance IDs owned by active and completed recovery claims', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 2
    const first = instantiateEquipmentInstance(state, 'combat_stims')
    if (!first.ok) throw new Error(first.code)
    const firstId = first.instance.instanceId
    first.state.equipmentInstances![firstId] = {
      ...first.state.equipmentInstances![firstId]!,
      payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
    }
    const queued = queueEquipmentDeconstruction(first.state, 'combat_stims', {
      kind: 'equipment_instance',
      instanceId: firstId,
    })

    const whileQueued = instantiateEquipmentInstance(queued, 'combat_stims')
    expect(whileQueued).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-2' },
    })

    const completed = advanceEquipmentDeconstructionQueues({
      ...queued,
      equipmentDeconstructionQueue: queued.equipmentDeconstructionQueue?.map((entry) => ({
        ...entry,
        remainingWeeks: 1,
      })),
    }).state
    completed.inventory.combat_stims = 1
    const afterCompletion = instantiateEquipmentInstance(completed, 'combat_stims')
    expect(afterCompletion).toMatchObject({
      ok: true,
      instance: { instanceId: 'equipment-instance-1-2' },
    })
  })

  it('fails closed for unavailable, unknown, and item-level damaged stock', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.damagedEquipmentQueue = ['signal_jammers']

    expect(instantiateEquipmentInstance(state, 'missing')).toMatchObject({
      ok: false,
      code: 'unknown_definition',
    })
    expect(instantiateEquipmentInstance(state, 'signal_jammers')).toMatchObject({
      ok: false,
      code: 'damaged_stock_ambiguity',
    })
    state.damagedEquipmentQueue = []
    state.inventory.signal_jammers = 0
    expect(instantiateEquipmentInstance(state, 'signal_jammers')).toMatchObject({
      ok: false,
      code: 'inventory_unavailable',
    })
  })

  it('equips and directly transfers the same authoritative instance between idle agents', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const callerLocation: EquipmentInstanceLocation = {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    }
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: callerLocation,
    })
    if (!created.ok) throw new Error(created.code)
    callerLocation.slot = 'utility2'

    expect(created.state.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(created.state.agents.a_mina.equipmentEffectScales).toEqual({ signal_jammers: 1 })
    expect(getEquipmentInstanceAtAgentSlot(created.state, 'a_mina', 'utility1')?.instanceId).toBe(
      created.instance.instanceId
    )
    const retrieved = getEquipmentInstance(created.state, created.instance.instanceId)!
    expect(retrieved).not.toBe(created.state.equipmentInstances?.[created.instance.instanceId])
    expect(Object.isFrozen(retrieved)).toBe(true)
    expect(created.state.equipmentInstances?.[created.instance.instanceId].location).toEqual({
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })

    const transferred = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility1',
    })
    expect(transferred).toMatchObject({ ok: true })
    if (!transferred.ok) throw new Error(transferred.code)
    expect(transferred.state.inventory.signal_jammers).toBe(0)
    expect(transferred.state.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expect(transferred.state.agents.a_casey.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(transferred.instance.instanceId).toBe(created.instance.instanceId)
  })

  it('rejects occupied slots and non-idle ownership changes', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.agents.a_casey.equipmentSlots = { utility1: 'medkits' }
    const created = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)

    expect(
      relocateEquipmentInstance(created.state, created.instance.instanceId, {
        state: 'equipped',
        agentId: 'a_casey',
        slot: 'utility1',
      })
    ).toMatchObject({ ok: false, code: 'slot_occupied' })

    const equipped = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    const trainingState = {
      ...equipped.state,
      agents: {
        ...equipped.state.agents,
        a_mina: {
          ...equipped.state.agents.a_mina,
          assignment: {
            state: 'training' as const,
            startedWeek: 1,
            trainingProgramId: 'analysis-lab',
          },
        },
      },
    }
    expect(
      relocateEquipmentInstance(trainingState, equipped.instance.instanceId, { state: 'stored' })
    ).toMatchObject({ ok: false, code: 'agent_not_idle' })
  })

  it('applies compare-and-swap mutable state while enforcing identity and payload bounds', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      payload: { resourceId: 'battery_charge', capacity: 2, remaining: 2 },
    })
    if (!created.ok) throw new Error(created.code)
    const expected = created.instance

    const changed = applyEquipmentInstanceTransition(created.state, expected.instanceId, expected, {
      ...expected,
      condition: 'damaged',
      payload: { ...expected.payload!, remaining: 1 },
    })
    expect(changed).toMatchObject({
      ok: true,
      instance: { condition: 'damaged', payload: { capacity: 2, remaining: 1 } },
    })
    if (!changed.ok) throw new Error(changed.code)

    expect(relocateEquipmentInstance(changed.state, 'Bad Id', { state: 'stored' })).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(
      relocateEquipmentInstance(changed.state, 'equipment-instance-9-9', { state: 'stored' })
    ).toMatchObject({ ok: false, code: 'stale_transition' })

    expect(
      applyEquipmentInstanceTransition(changed.state, expected.instanceId, expected, {
        ...expected,
        condition: 'operational',
      })
    ).toMatchObject({ ok: false, code: 'stale_transition' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        {
          ...changed.instance,
          definitionId: 'medkits',
        }
      )
    ).toMatchObject({ ok: false, code: 'immutable_identity' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        {
          ...changed.instance,
          payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 3 },
        }
      )
    ).toMatchObject({ ok: false, code: 'malformed_payload_bounds' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        {
          ...changed.instance,
          location: { state: 'stored', unexpected: true },
        } as never
      )
    ).toMatchObject({ ok: false, code: 'invalid_location' })
    expect(
      applyEquipmentInstanceTransition(
        changed.state,
        changed.instance.instanceId,
        changed.instance,
        { ...changed.instance, debug: true } as never
      )
    ).toMatchObject({ ok: false, code: 'invalid_instance_shape' })
    expect(
      (changed.state.equipmentInstances?.[changed.instance.instanceId] as Record<string, unknown>)
        .debug
    ).toBeUndefined()
    const clearedPayload = applyEquipmentInstanceTransition(
      changed.state,
      changed.instance.instanceId,
      changed.instance,
      { ...changed.instance, payload: undefined }
    )
    if (!clearedPayload.ok) throw new Error(clearedPayload.code)
    expect(
      Object.prototype.hasOwnProperty.call(
        clearedPayload.state.equipmentInstances?.[changed.instance.instanceId] ?? {},
        'payload'
      )
    ).toBe(false)
  })

  it('preserves instance identity through legacy unequip, replacement, and transfer functions', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)

    const unequipped = unequipAgentItem(created.state, 'a_mina', 'utility1')
    expect(unequipped.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstance(unequipped, created.instance.instanceId)?.location).toEqual({
      state: 'stored',
    })

    const reequipped = relocateEquipmentInstance(unequipped, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!reequipped.ok) throw new Error(reequipped.code)
    const replaced = equipAgentItem(reequipped.state, 'a_mina', 'utility1', 'ward_seals')
    expect(replaced.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstance(replaced, created.instance.instanceId)?.location).toEqual({
      state: 'stored',
    })

    const clearedReplacement = unequipAgentItem(replaced, 'a_mina', 'utility1')
    expect(clearedReplacement.inventory.ward_seals).toBe(1)
    expect(clearedReplacement.inventory.signal_jammers).toBe(0)
    const moved = relocateEquipmentInstance(clearedReplacement, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_casey',
      slot: 'utility2',
    })
    if (!moved.ok) throw new Error(moved.code)
    const transferred = equipAgentItem(moved.state, 'a_mina', 'utility2', 'signal_jammers')
    expect(transferred.inventory.signal_jammers).toBe(0)
    expect(getEquipmentInstanceAtAgentSlot(transferred, 'a_mina', 'utility2')?.instanceId).toBe(
      created.instance.instanceId
    )
  })

  it('hydrates valid entries deterministically, stores later conflicts, and drops malformed siblings', () => {
    const state = createStartingState()
    state.agents.a_mina.equipmentSlots = { utility1: 'medkits' }
    const raw = {
      'equipment-instance-1-2': {
        instanceId: 'equipment-instance-1-2',
        definitionId: 'ward_seals',
        condition: 'operational',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
      },
      'equipment-instance-1-1': {
        instanceId: 'equipment-instance-1-1',
        definitionId: 'signal_jammers',
        condition: 'damaged',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
        payload: { resourceId: 'battery_charge', capacity: 4, remaining: 2 },
      },
      'equipment-instance-1-bad': {
        instanceId: 'wrong-key',
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    }

    const hydrated = hydrateGame({ ...state, equipmentInstances: raw })
    expect(sanitizeEquipmentInstanceRegistry(raw, state.agents).issues).toEqual([
      { instanceId: 'equipment-instance-1-2', code: 'duplicate_claim' },
      { instanceId: 'equipment-instance-1-bad', code: 'invalid_instance_id' },
    ])
    expect(Object.keys(hydrated.equipmentInstances ?? {})).toEqual([
      'equipment-instance-1-1',
      'equipment-instance-1-2',
    ])
    expect(hydrated.equipmentInstances?.['equipment-instance-1-1'].location).toEqual({
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    expect(hydrated.equipmentInstances?.['equipment-instance-1-2'].location).toEqual({
      state: 'stored',
    })
    expect(hydrated.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(hydrated.agents.a_mina.equipmentEffectScales).toEqual({ signal_jammers: 1 })

    const roundTripped = hydrateGame(JSON.parse(JSON.stringify(hydrated)))
    expect(roundTripped.equipmentInstances).toEqual(hydrated.equipmentInstances)
    expect(hydrateGame({ ...state, equipmentInstances: undefined }).equipmentInstances).toEqual({})
  })

  it('validates payload and location shapes without inventing ownership', () => {
    const state = createStartingState()
    const result = sanitizeEquipmentInstanceRegistry(
      {
        good: {
          instanceId: 'good',
          definitionId: 'medkits',
          condition: 'operational',
          location: { state: 'stored' },
          payload: { resourceId: 'medical_supply', capacity: 2, remaining: 0 },
        },
        overflow: {
          instanceId: 'overflow',
          definitionId: 'medkits',
          condition: 'operational',
          location: { state: 'stored' },
          payload: { resourceId: 'medical_supply', capacity: 1, remaining: 2 },
        },
        foreign: {
          instanceId: 'foreign',
          definitionId: 'unknown',
          condition: 'operational',
          location: { state: 'stored' },
        },
        inherited: {
          instanceId: 'inherited',
          definitionId: 'constructor',
          condition: 'operational',
          location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
        },
      },
      state.agents
    )

    expect(Object.keys(result.equipmentInstances)).toEqual(['good'])
    expect(result.issues).toEqual([
      { instanceId: 'foreign', code: 'unknown_definition' },
      { instanceId: 'inherited', code: 'unknown_definition' },
      { instanceId: 'overflow', code: 'malformed_payload_bounds' },
    ])
  })

  it('treats instance identity as authoritative over a stale compatibility slot projection', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 0
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)
    const staleProjection = {
      ...created.state,
      agents: {
        ...created.state.agents,
        a_mina: {
          ...created.state.agents.a_mina,
          equipmentSlots: { ...created.state.agents.a_mina.equipmentSlots, utility1: 'ward_seals' },
        },
      },
    }

    const unequipped = unequipAgentItem(staleProjection, 'a_mina', 'utility1')
    expect(unequipped.inventory.signal_jammers).toBe(0)
    expect(unequipped.inventory.ward_seals).toBe(0)
    expect(getEquipmentInstance(unequipped, created.instance.instanceId)?.location).toEqual({
      state: 'stored',
    })
  })

  it('does not transfer an authoritative instance through a mismatched compatibility projection', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 0
    const created = instantiateEquipmentInstance(state, 'signal_jammers', {
      location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)
    const staleProjection = {
      ...created.state,
      agents: {
        ...created.state.agents,
        a_mina: {
          ...created.state.agents.a_mina,
          equipmentSlots: { ...created.state.agents.a_mina.equipmentSlots, utility1: 'ward_seals' },
        },
      },
    }

    const attempted = equipAgentItem(staleProjection, 'a_casey', 'utility1', 'ward_seals')
    expect(attempted.agents.a_casey.equipmentSlots?.utility1).toBeUndefined()
    expect(attempted.inventory.ward_seals).toBe(0)
    expect(getEquipmentInstanceAtAgentSlot(attempted, 'a_mina', 'utility1')?.definitionId).toBe(
      'signal_jammers'
    )
  })

  it('accepts known roster IDs independently of the narrower payload resource-ID format', () => {
    const state = createStartingState()
    const agentId = 'Agent:Upper'
    const agents = {
      ...state.agents,
      [agentId]: { ...state.agents.a_mina, id: agentId },
    }
    const result = sanitizeEquipmentInstanceRegistry(
      {
        'equipment-instance-custom-agent': {
          instanceId: 'equipment-instance-custom-agent',
          definitionId: 'signal_jammers',
          condition: 'operational',
          location: { state: 'equipped', agentId, slot: 'utility1' },
        },
      },
      agents
    )

    expect(result.issues).toEqual([])
    expect(result.equipmentInstances['equipment-instance-custom-agent'].location).toEqual({
      state: 'equipped',
      agentId,
      slot: 'utility1',
    })
    expect(result.agents[agentId].equipmentSlots?.utility1).toBe('signal_jammers')
  })

  it('repairs a stored damaged ordinary identity without mutating inventory or lots', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2
    state.damagedEquipmentQueue = ['medkits']
    const created = instantiateEquipmentInstance(state, 'signal_jammers', { condition: 'damaged' })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) throw new Error(created.code)

    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(created.state, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_reaggregation_unsupported' })
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(created.state, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_reaggregation_unsupported' })

    const repaired = repairStoredEquipmentInstanceCondition(
      created.state,
      created.instance.instanceId
    )
    expect(repaired).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        definitionId: 'signal_jammers',
        condition: 'operational',
        location: { state: 'stored' },
      },
    })
    if (!repaired.ok) throw new Error(repaired.code)
    expect(repaired.state.inventory.signal_jammers).toBe(1)
    expect(repaired.state.damagedEquipmentQueue).toEqual(['medkits'])
    expect(repaired.state.equipmentInstances?.[created.instance.instanceId]?.condition).toBe(
      'operational'
    )

    const reaggregated = reaggregateStoredOrdinaryEquipmentInstance(
      repaired.state,
      created.instance.instanceId
    )
    expect(reaggregated).toMatchObject({ ok: true })
    if (!reaggregated.ok) throw new Error(reaggregated.code)
    expect(reaggregated.state.inventory.signal_jammers).toBe(2)
    expect(reaggregated.state.equipmentInstances).not.toHaveProperty(created.instance.instanceId)
  })

  it('fails closed for missing, equipped, already-operational, and recovery-claimed repair', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 3
    const operational = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!operational.ok) throw new Error(operational.code)
    const damaged = instantiateEquipmentInstance(operational.state, 'signal_jammers', {
      condition: 'damaged',
    })
    if (!damaged.ok) throw new Error(damaged.code)
    const equipped = relocateEquipmentInstance(damaged.state, damaged.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)

    expect(repairStoredEquipmentInstanceCondition(equipped.state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(repairStoredEquipmentInstanceCondition(equipped.state, 'missing')).toMatchObject({
      ok: false,
      code: 'stale_transition',
    })
    expect(
      repairStoredEquipmentInstanceCondition(equipped.state, operational.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_already_operational' })
    expect(
      repairStoredEquipmentInstanceCondition(equipped.state, damaged.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'instance_not_stored' })

    const queued = queueEquipmentDeconstruction(damaged.state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: damaged.instance.instanceId,
    })
    const conflicting = {
      ...queued,
      equipmentInstances: {
        ...(queued.equipmentInstances ?? {}),
        [damaged.instance.instanceId]: damaged.instance,
      },
    }
    expect(
      repairStoredEquipmentInstanceCondition(conflicting, damaged.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'recovery_claimed' })
    expect(conflicting.inventory.signal_jammers).toBe(1)
  })

  it('repairs a fabricated damaged identity then returns it to the source lot', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const materialized = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    if (!materialized.ok) throw new Error(materialized.code)
    const damaged = {
      ...materialized.state,
      equipmentInstances: {
        ...(materialized.state.equipmentInstances ?? {}),
        [materialized.instance.instanceId]: {
          ...materialized.instance,
          condition: 'damaged' as const,
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(damaged, materialized.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_reaggregation_unsupported' })

    const repaired = repairStoredEquipmentInstanceCondition(
      damaged,
      materialized.instance.instanceId
    )
    expect(repaired).toMatchObject({ ok: true, instance: { condition: 'operational' } })
    if (!repaired.ok) throw new Error(repaired.code)
    expect(repaired.state.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 1,
      trackedInstanceUnits: 1,
    })

    const returned = returnFabricatedOrdinaryEquipmentInstanceToLot(
      repaired.state,
      materialized.instance.instanceId
    )
    expect(returned).toMatchObject({ ok: true })
    if (!returned.ok) throw new Error(returned.code)
    expect(returned.state.inventory.signal_jammers).toBe(1)
    expect(returned.state.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 1,
      trackedInstanceUnits: 0,
    })
  })

  it('round-trips a strict condition-repair event without mutating inventory', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const created = instantiateEquipmentInstance(state, 'signal_jammers', { condition: 'damaged' })
    if (!created.ok) throw new Error(created.code)
    const repaired = repairStoredEquipmentInstanceCondition(
      created.state,
      created.instance.instanceId
    )
    if (!repaired.ok) throw new Error(repaired.code)
    const withEvent = appendOperationEventDrafts(repaired.state, [
      createEquipmentInstanceConditionRepairedDraft({
        week: repaired.state.week,
        instanceId: repaired.instance.instanceId,
        definitionId: repaired.instance.definitionId,
        definitionName: 'Signal Jammers',
        previousCondition: 'damaged',
        condition: 'operational',
        reason: 'manual_condition_repair',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    const validEvent = serialized.events.at(-1)
    serialized.events.push({
      ...validEvent,
      id: 'evt-malformed-repair',
      payload: { ...validEvent.payload, previousCondition: 'operational' },
    })

    const hydrated = hydrateGame(serialized)
    expect(hydrated.inventory.signal_jammers).toBe(0)
    expect(hydrated.equipmentInstances?.[created.instance.instanceId]?.condition).toBe(
      'operational'
    )
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_condition_repaired')
    ).toHaveLength(1)

    const second = repairStoredEquipmentInstanceCondition(hydrated, created.instance.instanceId)
    expect(second).toMatchObject({ ok: false, code: 'condition_already_operational' })
  })
})

function blastDoorIntegrity(
  overrides: Partial<ContainmentClassIntegrity> = {}
): ContainmentClassIntegrity {
  return {
    classId: 'blast_door',
    lastInspectionWeek: 1,
    cycleCount: 0,
    deficiency: { kind: 'none' },
    ...overrides,
  }
}

describe('SPE-2860 containment-class integrity on equipment instances', () => {
  it('hydrates compact blast-door, pressure-seal, and interlock integrity and drops unknown or malformed class', () => {
    const state = createStartingState()
    const result = sanitizeEquipmentInstanceRegistry(
      {
        'equipment-instance-1-1': {
          instanceId: 'equipment-instance-1-1',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: blastDoorIntegrity(),
        },
        'equipment-instance-1-2': {
          instanceId: 'equipment-instance-1-2',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'airlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        },
        'equipment-instance-1-3': {
          instanceId: 'equipment-instance-1-3',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: { classId: 'blast_door' },
        },
        'equipment-instance-1-4': {
          instanceId: 'equipment-instance-1-4',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        },
        'equipment-instance-1-5': {
          instanceId: 'equipment-instance-1-5',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        },
      },
      state.agents
    )

    expect(result.equipmentInstances['equipment-instance-1-1']?.containmentIntegrity).toEqual(
      blastDoorIntegrity()
    )
    expect(result.equipmentInstances['equipment-instance-1-4']?.containmentIntegrity).toMatchObject(
      {
        classId: 'pressure_seal',
        deficiency: { kind: 'none' },
      }
    )
    expect(result.equipmentInstances['equipment-instance-1-5']?.containmentIntegrity).toMatchObject(
      {
        classId: 'interlock',
        deficiency: { kind: 'none' },
      }
    )
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { instanceId: 'equipment-instance-1-2', code: 'invalid_containment_class' },
        { instanceId: 'equipment-instance-1-3', code: 'malformed_containment_integrity' },
      ])
    )
    expect(result.equipmentInstances).not.toHaveProperty('equipment-instance-1-2')
    expect(result.equipmentInstances).not.toHaveProperty('equipment-instance-1-3')
  })

  it('records hard-stop versus compensating continuation without touching condition', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) throw new Error(created.code)

    const continued = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'compensating_continue'
    )
    expect(continued).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: {
          classId: 'blast_door',
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
          },
        },
      },
    })
    if (!continued.ok) throw new Error(continued.code)
    expect(isContainmentClassInService(continued.instance.containmentIntegrity)).toBe(true)
    expect(continued.state.inventory.ward_seals).toBe(0)

    const stopped = applyContainmentClassDeficiency(
      continued.state,
      created.instance.instanceId,
      'hard_stop'
    )
    expect(stopped).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'hard_stop' } } },
    })
    if (!stopped.ok) throw new Error(stopped.code)
    expect(isContainmentClassInService(stopped.instance.containmentIntegrity)).toBe(false)
    expect(
      applyContainmentClassDeficiency(
        stopped.state,
        created.instance.instanceId,
        'compensating_continue'
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })
    expect(stopped.state.equipmentInstances?.[created.instance.instanceId]?.condition).toBe(
      'operational'
    )
  })

  it('preserves containment integrity across SPE-2851 repair and hydrates the deficiency event', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({
        deficiency: { kind: 'hard_stop' },
      }),
    })
    if (!created.ok) throw new Error(created.code)

    expect(
      reaggregateStoredOrdinaryEquipmentInstance(created.state, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'condition_reaggregation_unsupported' })

    const repaired = repairStoredEquipmentInstanceCondition(
      created.state,
      created.instance.instanceId,
      BLAST_DOOR_SPARE_PART_ID
    )
    expect(repaired).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: { deficiency: { kind: 'hard_stop' } },
      },
    })
    if (!repaired.ok) throw new Error(repaired.code)
    expect(isContainmentClassInService(repaired.instance.containmentIntegrity)).toBe(false)

    const withEvent = appendOperationEventDrafts(repaired.state, [
      createContainmentClassDeficiencyRecordedDraft({
        week: repaired.state.week,
        instanceId: repaired.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        status: 'due',
        intervalWeeks: 4,
        weeksSinceInspection: 4,
        deficiencyKind: 'hard_stop',
        inService: false,
        reason: 'inspection_cadence_deficiency',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-containment',
      payload: { ...serialized.events.at(-1).payload, classId: 'airlock' },
    })

    const hydrated = hydrateGame(serialized)
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }))
    expect(
      hydrated.events.filter(
        (event) => event.type === 'equipment.containment_class_deficiency_recorded'
      )
    ).toHaveLength(1)
    expect(
      applyContainmentClassDeficiency(
        hydrated,
        created.instance.instanceId,
        'compensating_continue'
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })
  })

  it('fails closed when inspection is still current', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      applyContainmentClassDeficiency(created.state, created.instance.instanceId, 'hard_stop')
    ).toMatchObject({ ok: false, code: 'inspection_not_due' })
  })

  it('preserves hard-stop across generic transitions and rejects compensating overwrite', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)

    const relocated = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'secondary',
    })
    expect(relocated).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'hard_stop' } } },
    })
    if (!relocated.ok) throw new Error(relocated.code)

    const omitted = applyEquipmentInstanceTransition(
      relocated.state,
      created.instance.instanceId,
      relocated.instance,
      {
        instanceId: relocated.instance.instanceId,
        definitionId: relocated.instance.definitionId,
        location: { state: 'stored' },
        condition: relocated.instance.condition,
      }
    )
    expect(omitted).toMatchObject({
      ok: true,
      instance: {
        location: { state: 'stored' },
        containmentIntegrity: { deficiency: { kind: 'hard_stop' } },
      },
    })
    if (!omitted.ok) throw new Error(omitted.code)
    expect(
      applyEquipmentInstanceTransition(
        omitted.state,
        created.instance.instanceId,
        omitted.instance,
        {
          ...omitted.instance,
          containmentIntegrity: blastDoorIntegrity({
            deficiency: {
              kind: 'compensating_continue',
              compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
            },
          }),
        }
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })
  })

  it('fails closed for missing or unsuitable spare parts without mutating repair state', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)
    const snapshot = created.state.equipmentInstances?.[created.instance.instanceId]

    expect(
      repairStoredEquipmentInstanceCondition(created.state, created.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'missing_part' })
    expect(
      repairStoredEquipmentInstanceCondition(created.state, created.instance.instanceId, null)
    ).toMatchObject({ ok: false, code: 'missing_part' })
    expect(
      repairStoredEquipmentInstanceCondition(
        created.state,
        created.instance.instanceId,
        'pressure_seal_gasket'
      )
    ).toMatchObject({ ok: false, code: 'unsuitable_part' })
    expect(created.state.equipmentInstances?.[created.instance.instanceId]).toEqual(snapshot)
    expect(created.state.inventory.ward_seals).toBe(0)
    expect(created.state.damagedEquipmentQueue ?? []).toEqual([])
  })

  it('repairs damaged blast-door with a suitable part without clearing compensating continue', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      }),
    })
    if (!created.ok) throw new Error(created.code)

    const repaired = repairStoredEquipmentInstanceCondition(
      created.state,
      created.instance.instanceId,
      BLAST_DOOR_SPARE_PART_ID
    )
    expect(repaired).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
          },
        },
      },
    })
    if (!repaired.ok) throw new Error(repaired.code)
    expect(isContainmentClassInService(repaired.instance.containmentIntegrity)).toBe(true)
    expect(repaired.state.inventory.ward_seals).toBe(0)
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(repaired.state, created.instance.instanceId)
    ).toMatchObject({ ok: true })
  })
})

describe('SPE-2862 technician stabilization / deficiency clear', () => {
  it('relieves sticky hard-stop into compensating continue and preserves later deterioration', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)

    expect(
      applyContainmentClassDeficiency(
        created.state,
        created.instance.instanceId,
        'compensating_continue'
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })

    const relieved = stabilizeContainmentClassDeficiency(created.state, created.instance.instanceId)
    expect(relieved).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: {
          classId: 'blast_door',
          lastInspectionWeek: 1,
          cycleCount: 1,
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
          },
        },
      },
    })
    if (!relieved.ok) throw new Error(relieved.code)
    expect(isContainmentClassInService(relieved.instance.containmentIntegrity)).toBe(true)
    expect(relieved.state.inventory.ward_seals).toBe(0)
    expect(relieved.state.damagedEquipmentQueue ?? []).toEqual([])
    expect(
      applyContainmentClassDeficiency(
        created.state,
        created.instance.instanceId,
        'compensating_continue'
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })

    const laterStop = applyContainmentClassDeficiency(
      { ...relieved.state, week: 5 },
      created.instance.instanceId,
      'hard_stop'
    )
    expect(laterStop).toMatchObject({
      ok: true,
      instance: {
        containmentIntegrity: { deficiency: { kind: 'hard_stop' }, cycleCount: 1 },
      },
    })
    if (!laterStop.ok) throw new Error(laterStop.code)
    expect(
      applyContainmentClassDeficiency(
        laterStop.state,
        created.instance.instanceId,
        'compensating_continue'
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })
  })

  it('clears compensating continue to none without flipping condition', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({
        cycleCount: 2,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      }),
    })
    if (!created.ok) throw new Error(created.code)

    const cleared = stabilizeContainmentClassDeficiency(created.state, created.instance.instanceId)
    expect(cleared).toMatchObject({
      ok: true,
      instance: {
        condition: 'damaged',
        containmentIntegrity: {
          lastInspectionWeek: 1,
          cycleCount: 3,
          deficiency: { kind: 'none' },
        },
      },
    })
    if (!cleared.ok) throw new Error(cleared.code)
    expect(isContainmentClassInService(cleared.instance.containmentIntegrity)).toBe(true)
    expect(
      repairStoredEquipmentInstanceCondition(
        cleared.state,
        created.instance.instanceId,
        BLAST_DOOR_SPARE_PART_ID
      )
    ).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: { deficiency: { kind: 'none' }, cycleCount: 3 },
      },
    })
  })

  it('fails closed for ordinary identities, none, and missing records', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 1
    const ordinary = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!ordinary.ok) throw new Error(ordinary.code)
    const blast = instantiateEquipmentInstance(ordinary.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!blast.ok) throw new Error(blast.code)
    const snapshot = blast.state.equipmentInstances?.[blast.instance.instanceId]

    expect(
      stabilizeContainmentClassDeficiency(ordinary.state, ordinary.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'malformed_containment_integrity' })
    expect(
      stabilizeContainmentClassDeficiency(blast.state, blast.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'no_containment_deficiency' })
    expect(stabilizeContainmentClassDeficiency(blast.state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(
      stabilizeContainmentClassDeficiency(blast.state, 'equipment-instance-9-9')
    ).toMatchObject({
      ok: false,
      code: 'stale_transition',
    })
    expect(blast.state.equipmentInstances?.[blast.instance.instanceId]).toEqual(snapshot)
  })

  it('rejects containment-class relabel through generic instance transitions', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      applyEquipmentInstanceTransition(
        created.state,
        created.instance.instanceId,
        created.instance,
        {
          ...created.instance,
          containmentIntegrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        }
      )
    ).toMatchObject({ ok: false, code: 'immutable_identity' })
    expect(
      applyEquipmentInstanceTransition(
        created.state,
        created.instance.instanceId,
        created.instance,
        {
          ...created.instance,
          containmentIntegrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        }
      )
    ).toMatchObject({ ok: false, code: 'immutable_identity' })
    expect(created.state.equipmentInstances?.[created.instance.instanceId]).toEqual(
      created.instance
    )
  })

  it('relieves and clears extra-class technician stabilization onto authored membranes', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    const pressureSeal = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      },
    })
    if (!pressureSeal.ok) throw new Error(pressureSeal.code)
    expect(pressureSeal.state.containmentBarrierIntegrity).toBeUndefined()

    const relievedSeal = stabilizeContainmentClassDeficiency(
      pressureSeal.state,
      pressureSeal.instance.instanceId
    )
    expect(relievedSeal).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: {
          classId: 'pressure_seal',
          lastInspectionWeek: 1,
          cycleCount: 1,
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
          },
        },
      },
    })
    if (!relievedSeal.ok) throw new Error(relievedSeal.code)
    expect(isContainmentClassInService(relievedSeal.instance.containmentIntegrity)).toBe(true)
    expect(
      relievedSeal.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(
      relievedSeal.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: pressureSeal.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })

    const clearedSeal = stabilizeContainmentClassDeficiency(
      relievedSeal.state,
      pressureSeal.instance.instanceId
    )
    expect(clearedSeal).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: {
          classId: 'pressure_seal',
          cycleCount: 2,
          deficiency: { kind: 'none' },
        },
      },
    })
    if (!clearedSeal.ok) throw new Error(clearedSeal.code)
    expect(clearedSeal.state.containmentBarrierIntegrity).toBeUndefined()

    const interlock = instantiateEquipmentInstance(clearedSeal.state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 4,
        deficiency: { kind: 'hard_stop' },
      },
    })
    if (!interlock.ok) throw new Error(interlock.code)
    const relievedInterlock = stabilizeContainmentClassDeficiency(
      interlock.state,
      interlock.instance.instanceId
    )
    expect(relievedInterlock).toMatchObject({
      ok: true,
      instance: {
        condition: 'damaged',
        containmentIntegrity: {
          classId: 'interlock',
          lastInspectionWeek: 1,
          cycleCount: 5,
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
          },
        },
      },
    })
    if (!relievedInterlock.ok) throw new Error(relievedInterlock.code)
    expect(isContainmentClassInService(relievedInterlock.instance.containmentIntegrity)).toBe(true)
    expect(
      relievedInterlock.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(
      relievedInterlock.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: interlock.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })
  })

  it('hydrates technician stabilization as history without replaying mutations', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)
    const relieved = stabilizeContainmentClassDeficiency(created.state, created.instance.instanceId)
    if (!relieved.ok) throw new Error(relieved.code)

    const withEvent = appendOperationEventDrafts(relieved.state, [
      createContainmentClassStabilizedDraft({
        week: relieved.state.week,
        instanceId: relieved.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        previousDeficiencyKind: 'hard_stop',
        deficiencyKind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        previousCycleCount: 0,
        cycleCount: 1,
        inService: true,
        reason: 'technician_stabilization',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-stabilization',
      payload: { ...serialized.events.at(-1).payload, classId: 'pressure_seal' },
    })

    const hydrated = hydrateGame(serialized)
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(
      blastDoorIntegrity({
        cycleCount: 1,
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      })
    )
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.containment_class_stabilized')
    ).toHaveLength(1)
    expect(
      applyContainmentClassDeficiency(
        created.state,
        created.instance.instanceId,
        'compensating_continue'
      )
    ).toMatchObject({ ok: false, code: 'deficiency_hard_stop' })
  })

  it('does not let SPE-2861 repair clear sticky hard-stop', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)
    const repaired = repairStoredEquipmentInstanceCondition(
      created.state,
      created.instance.instanceId,
      BLAST_DOOR_SPARE_PART_ID
    )
    expect(repaired).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: { deficiency: { kind: 'hard_stop' } },
      },
    })
    if (!repaired.ok) throw new Error(repaired.code)
    expect(isContainmentClassInService(repaired.instance.containmentIntegrity)).toBe(false)
  })
})

describe('SPE-877 mutation stations / integrity labor', () => {
  it('applies the authored blast-door bench in place without flipping condition or deficiency', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({
        deficiency: { kind: 'hard_stop' },
      }),
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyBlastDoorIntegrityLabor(created.state, created.instance.instanceId)
    expect(mutated).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        condition: 'damaged',
        location: { state: 'stored' },
        containmentIntegrity: {
          classId: 'blast_door',
          lastInspectionWeek: 1,
          cycleCount: 1,
          deficiency: { kind: 'hard_stop' },
        },
        stationMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
    if (!mutated.ok) throw new Error(mutated.code)
    expect(isContainmentClassInService(mutated.instance.containmentIntegrity)).toBe(false)
    expect(mutated.state.inventory.ward_seals).toBe(0)
    expect(mutated.state.damagedEquipmentQueue ?? []).toEqual([])
    expect(mutated.state.fabricatedEquipmentLots).toEqual(created.state.fabricatedEquipmentLots)
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'station_mutation_reaggregation_unsupported',
    })
    expect(applyBlastDoorIntegrityLabor(mutated.state, created.instance.instanceId)).toMatchObject({
      ok: false,
      code: 'station_mutation_already_applied',
    })
    expect(
      stabilizeContainmentClassDeficiency(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        condition: 'damaged',
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
          },
          cycleCount: 2,
        },
        stationMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
    expect(
      repairStoredEquipmentInstanceCondition(
        mutated.state,
        created.instance.instanceId,
        BLAST_DOOR_SPARE_PART_ID
      )
    ).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        condition: 'operational',
        containmentIntegrity: { deficiency: { kind: 'hard_stop' }, cycleCount: 1 },
        stationMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
  })

  it('fails closed for ordinary, wrong class, equipped, missing, and malformed records', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 3
    const ordinary = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!ordinary.ok) throw new Error(ordinary.code)
    const blast = instantiateEquipmentInstance(ordinary.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!blast.ok) throw new Error(blast.code)
    const pressure = instantiateEquipmentInstance(blast.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!pressure.ok) throw new Error(pressure.code)
    const interlock = instantiateEquipmentInstance(pressure.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!interlock.ok) throw new Error(interlock.code)
    const equipped = relocateEquipmentInstance(interlock.state, blast.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    const snapshot = equipped.state.equipmentInstances

    expect(
      applyBlastDoorIntegrityLabor(ordinary.state, ordinary.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'malformed_containment_integrity' })
    expect(
      applyBlastDoorIntegrityLabor(pressure.state, pressure.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyBlastDoorIntegrityLabor(interlock.state, interlock.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(applyBlastDoorIntegrityLabor(equipped.state, blast.instance.instanceId)).toMatchObject({
      ok: false,
      code: 'instance_not_stored',
    })
    expect(applyBlastDoorIntegrityLabor(equipped.state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(applyBlastDoorIntegrityLabor(equipped.state, 'equipment-instance-9-9')).toMatchObject({
      ok: false,
      code: 'stale_transition',
    })
    expect(equipped.state.equipmentInstances).toEqual(snapshot)
    const queued = queueEquipmentDeconstruction(blast.state, 'ward_seals', {
      kind: 'equipment_instance',
      instanceId: blast.instance.instanceId,
    })
    const claimed = {
      ...queued,
      equipmentInstances: {
        ...(queued.equipmentInstances ?? {}),
        [blast.instance.instanceId]: blast.instance,
      },
    }
    expect(applyBlastDoorIntegrityLabor(claimed, blast.instance.instanceId)).toMatchObject({
      ok: false,
      code: 'recovery_claimed',
    })
    const sanitized = sanitizeEquipmentInstanceRegistry(
      {
        'equipment-instance-1-1': {
          instanceId: 'equipment-instance-1-1',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: blastDoorIntegrity(),
          stationMutation: { stationId: 'other_bench', appliedWeek: 1 },
        },
      },
      equipped.state.agents,
      new Set(),
      equipped.state.fabricatedEquipmentLots
    )
    expect(sanitized.equipmentInstances['equipment-instance-1-1']).toBeUndefined()
    expect(sanitized.issues).toContainEqual({
      instanceId: 'equipment-instance-1-1',
      code: 'malformed_station_mutation',
    })
    const stampedWrongClass = sanitizeEquipmentInstanceRegistry(
      {
        'equipment-instance-1-2': {
          instanceId: 'equipment-instance-1-2',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
        'equipment-instance-1-3': {
          instanceId: 'equipment-instance-1-3',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
      },
      equipped.state.agents,
      new Set(),
      equipped.state.fabricatedEquipmentLots
    )
    expect(stampedWrongClass.equipmentInstances['equipment-instance-1-2']).toBeUndefined()
    expect(stampedWrongClass.equipmentInstances['equipment-instance-1-3']).toBeUndefined()
    expect(stampedWrongClass.issues).toContainEqual({
      instanceId: 'equipment-instance-1-2',
      code: 'malformed_station_mutation',
    })
    expect(stampedWrongClass.issues).toContainEqual({
      instanceId: 'equipment-instance-1-3',
      code: 'malformed_station_mutation',
    })
  })

  it('keeps unstamped blast-door catalog re-aggregation and fail-closes stamped identities', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    const unstamped = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!unstamped.ok) throw new Error(unstamped.code)
    const stampedSource = instantiateEquipmentInstance(unstamped.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!stampedSource.ok) throw new Error(stampedSource.code)
    const mutated = applyBlastDoorIntegrityLabor(
      stampedSource.state,
      stampedSource.instance.instanceId
    )
    if (!mutated.ok) throw new Error(mutated.code)

    const unstampedReturn = reaggregateStoredOrdinaryEquipmentInstance(
      mutated.state,
      unstamped.instance.instanceId
    )
    expect(unstampedReturn).toMatchObject({
      ok: true,
      instance: { instanceId: unstamped.instance.instanceId },
    })
    if (!unstampedReturn.ok) throw new Error(unstampedReturn.code)
    expect(unstampedReturn.state.inventory.ward_seals).toBe(1)
    expect(
      unstampedReturn.state.equipmentInstances?.[unstamped.instance.instanceId]
    ).toBeUndefined()

    const blocked = reaggregateStoredOrdinaryEquipmentInstance(
      unstampedReturn.state,
      stampedSource.instance.instanceId
    )
    expect(blocked).toMatchObject({
      ok: false,
      code: 'station_mutation_reaggregation_unsupported',
    })
    if (blocked.ok) throw new Error('stamped identity must not re-aggregate')
    expect(blocked.state.inventory.ward_seals).toBe(1)
    expect(blocked.state.equipmentInstances?.[stampedSource.instance.instanceId]).toEqual(
      mutated.instance
    )

    const rematerialized = materializeStoredOrdinaryEquipmentInstance(blocked.state, 'ward_seals')
    expect(rematerialized).toMatchObject({ ok: true })
    if (!rematerialized.ok) throw new Error(rematerialized.code)
    expect(rematerialized.instance.instanceId).not.toBe(stampedSource.instance.instanceId)
    expect(rematerialized.instance.stationMutation).toBeUndefined()
    expect(rematerialized.state.equipmentInstances?.[stampedSource.instance.instanceId]).toEqual(
      mutated.instance
    )
  })

  it('fail-closes fabricated ordinary return-to-lot when a station stamp is present', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const fabricated = materializeStoredOrdinaryEquipmentInstance(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    if (!fabricated.ok) throw new Error(fabricated.code)
    const stamped = {
      ...fabricated.state,
      equipmentInstances: {
        ...fabricated.state.equipmentInstances,
        [fabricated.instance.instanceId]: {
          ...fabricated.instance,
          containmentIntegrity: blastDoorIntegrity(),
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(stamped, fabricated.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'station_mutation_reaggregation_unsupported',
    })
    expect(stamped.equipmentInstances?.[fabricated.instance.instanceId]?.instanceId).toBe(
      fabricated.instance.instanceId
    )
    expect(stamped.inventory.signal_jammers).toBe(0)
    expect(stamped.fabricatedEquipmentLots?.batch.trackedInstanceUnits).toBe(
      fabricated.state.fabricatedEquipmentLots?.batch.trackedInstanceUnits
    )
    const damagedStamped = {
      ...stamped,
      equipmentInstances: {
        ...stamped.equipmentInstances,
        [fabricated.instance.instanceId]: {
          ...stamped.equipmentInstances![fabricated.instance.instanceId],
          condition: 'damaged' as const,
        },
      },
    }
    expect(
      returnFabricatedOrdinaryEquipmentInstanceToLot(damagedStamped, fabricated.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'station_mutation_reaggregation_unsupported',
    })
  })

  it('rejects transitions that would persist a stamp on a non-blast-door identity', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const pressure = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!pressure.ok) throw new Error(pressure.code)
    const corrupted = {
      ...pressure.state,
      equipmentInstances: {
        ...pressure.state.equipmentInstances,
        [pressure.instance.instanceId]: {
          ...pressure.instance,
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
      },
    }
    expect(
      relocateEquipmentInstance(corrupted, pressure.instance.instanceId, { state: 'stored' })
    ).toMatchObject({ ok: false, code: 'malformed_station_mutation' })
  })

  it('rejects transitions that would attach blast-door integrity onto an already-stamped identity', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals')
    if (!created.ok) throw new Error(created.code)
    const stampedWithoutClass = {
      ...created.instance,
      stationMutation: {
        stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 1,
      },
    }
    const corrupted = {
      ...created.state,
      equipmentInstances: {
        ...created.state.equipmentInstances,
        [created.instance.instanceId]: stampedWithoutClass,
      },
    }
    expect(
      applyEquipmentInstanceTransition(
        corrupted,
        created.instance.instanceId,
        stampedWithoutClass,
        {
          ...stampedWithoutClass,
          containmentIntegrity: blastDoorIntegrity(),
        }
      )
    ).toMatchObject({ ok: false, code: 'malformed_station_mutation' })
  })

  it('rejects generic transitions that invent or rewrite the station stamp', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      applyEquipmentInstanceTransition(
        created.state,
        created.instance.instanceId,
        created.instance,
        {
          ...created.instance,
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        }
      )
    ).toMatchObject({ ok: false, code: 'unauthorized_station_mutation' })
    const mutated = applyBlastDoorIntegrityLabor(created.state, created.instance.instanceId)
    if (!mutated.ok) throw new Error(mutated.code)
    expect(
      applyEquipmentInstanceTransition(
        mutated.state,
        mutated.instance.instanceId,
        mutated.instance,
        {
          ...mutated.instance,
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 9,
          },
        }
      )
    ).toMatchObject({ ok: false, code: 'unauthorized_station_mutation' })
    const relocated = relocateEquipmentInstance(mutated.state, mutated.instance.instanceId, {
      state: 'stored',
    })
    expect(relocated).toMatchObject({
      ok: true,
      instance: {
        instanceId: mutated.instance.instanceId,
        stationMutation: mutated.instance.stationMutation,
        containmentIntegrity: { cycleCount: 1, deficiency: { kind: 'none' } },
      },
    })
  })

  it('hydrates integrity labor as history without replaying the mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyBlastDoorIntegrityLabor(created.state, created.instance.instanceId)
    if (!mutated.ok) throw new Error(mutated.code)

    const withEvent = appendOperationEventDrafts(mutated.state, [
      createEquipmentInstanceStationMutatedDraft({
        week: mutated.state.week,
        instanceId: mutated.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
        previousCycleCount: 0,
        cycleCount: 1,
        condition: 'operational',
        deficiencyKind: 'none',
        inService: true,
        reason: 'integrity_labor',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-station-mutation',
      payload: { ...serialized.events.at(-1).payload, classId: 'pressure_seal' },
    })

    const hydrated = hydrateGame(serialized)
    expect(hydrated.equipmentInstances?.[created.instance.instanceId]).toEqual(mutated.instance)
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_station_mutated')
    ).toHaveLength(1)
  })

  it('round-trips a valid station stamp across save/load without changing inventory', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      }),
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyBlastDoorIntegrityLabor(created.state, created.instance.instanceId)
    if (!mutated.ok) throw new Error(mutated.code)
    const withEvent = appendOperationEventDrafts(mutated.state, [
      createEquipmentInstanceStationMutatedDraft({
        week: mutated.state.week,
        instanceId: mutated.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
        previousCycleCount: 0,
        cycleCount: 1,
        condition: 'operational',
        deficiencyKind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        inService: true,
        reason: 'integrity_labor',
      }),
    ])
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(withEvent)))
    expect(hydrated.equipmentInstances?.[created.instance.instanceId]).toEqual(mutated.instance)
    expect(hydrated.inventory.ward_seals).toBe(0)
  })
})

describe('SPE-877 pressure-seal integrity-labor station', () => {
  it('applies the authored pressure-seal bench in place without flipping condition or deficiency', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyPressureSealIntegrityLabor(created.state, created.instance.instanceId)
    expect(mutated).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        condition: 'damaged',
        location: { state: 'stored' },
        containmentIntegrity: {
          classId: 'pressure_seal',
          lastInspectionWeek: 1,
          cycleCount: 1,
          deficiency: { kind: 'hard_stop' },
        },
        stationMutation: {
          stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
    if (!mutated.ok) throw new Error(mutated.code)
    expect(isContainmentClassInService(mutated.instance.containmentIntegrity)).toBe(false)
    expect(mutated.state.inventory.ward_seals).toBe(0)
    expect(mutated.state.damagedEquipmentQueue ?? []).toEqual([])
    expect(mutated.state.containmentBarrierIntegrity).toEqual(
      created.state.containmentBarrierIntegrity
    )
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'station_mutation_reaggregation_unsupported',
    })
    expect(
      applyPressureSealIntegrityLabor(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'station_mutation_already_applied',
    })
    expect(
      stabilizeContainmentClassDeficiency(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        condition: 'damaged',
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
          },
          cycleCount: 2,
        },
        stationMutation: {
          stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
  })

  it('fails closed for ordinary, blast-door, interlock, equipped, missing, and the workshop seed', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 2
    const ordinary = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!ordinary.ok) throw new Error(ordinary.code)
    const pressure = instantiateEquipmentInstance(ordinary.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!pressure.ok) throw new Error(pressure.code)
    const interlock = instantiateEquipmentInstance(pressure.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!interlock.ok) throw new Error(interlock.code)
    const equipped = relocateEquipmentInstance(interlock.state, pressure.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    const snapshot = equipped.state.equipmentInstances

    expect(
      applyPressureSealIntegrityLabor(ordinary.state, ordinary.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'malformed_containment_integrity' })
    expect(
      applyPressureSealIntegrityLabor(ordinary.state, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyBlastDoorIntegrityLabor(pressure.state, pressure.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyPressureSealIntegrityLabor(interlock.state, interlock.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyPressureSealIntegrityLabor(equipped.state, pressure.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'instance_not_stored',
    })
    expect(applyPressureSealIntegrityLabor(equipped.state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(applyPressureSealIntegrityLabor(equipped.state, 'equipment-instance-9-9')).toMatchObject(
      {
        ok: false,
        code: 'stale_transition',
      }
    )
    expect(equipped.state.equipmentInstances).toEqual(snapshot)
    expect(
      applyBlastDoorIntegrityLabor(ordinary.state, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID)
    ).toMatchObject({
      ok: true,
      instance: {
        instanceId: FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
        stationMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
      },
    })
  })

  it('hydrates a matching pressure-seal stamp and drops mixed class/station pairing', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyPressureSealIntegrityLabor(created.state, created.instance.instanceId)
    if (!mutated.ok) throw new Error(mutated.code)
    const withEvent = appendOperationEventDrafts(mutated.state, [
      createEquipmentInstanceStationMutatedDraft({
        week: mutated.state.week,
        instanceId: mutated.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'pressure_seal',
        stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
        previousCycleCount: 0,
        cycleCount: 1,
        condition: 'operational',
        deficiencyKind: 'none',
        inService: true,
        reason: 'integrity_labor',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-pressure-seal-station-mutation',
      payload: { ...serialized.events.at(-1).payload, classId: 'blast_door' },
    })

    const hydrated = hydrateGame(serialized)
    expect(hydrated.equipmentInstances?.[created.instance.instanceId]).toEqual(mutated.instance)
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_station_mutated')
    ).toHaveLength(1)

    const mixedStamp = sanitizeEquipmentInstanceRegistry(
      {
        'equipment-instance-1-2': {
          instanceId: 'equipment-instance-1-2',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: blastDoorIntegrity(),
          stationMutation: {
            stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
        'equipment-instance-1-3': {
          instanceId: 'equipment-instance-1-3',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
        'equipment-instance-1-4': {
          instanceId: 'equipment-instance-1-4',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
          stationMutation: {
            stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
      },
      created.state.agents,
      new Set(),
      created.state.fabricatedEquipmentLots
    )
    expect(mixedStamp.equipmentInstances['equipment-instance-1-2']).toBeUndefined()
    expect(mixedStamp.equipmentInstances['equipment-instance-1-3']).toBeUndefined()
    expect(mixedStamp.equipmentInstances['equipment-instance-1-4']).toBeUndefined()
    expect(mixedStamp.issues).toContainEqual({
      instanceId: 'equipment-instance-1-2',
      code: 'malformed_station_mutation',
    })
    expect(mixedStamp.issues).toContainEqual({
      instanceId: 'equipment-instance-1-3',
      code: 'malformed_station_mutation',
    })
    expect(mixedStamp.issues).toContainEqual({
      instanceId: 'equipment-instance-1-4',
      code: 'malformed_station_mutation',
    })
  })

  it('rejects generic transitions that invent the pressure-seal stamp', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      applyEquipmentInstanceTransition(
        created.state,
        created.instance.instanceId,
        created.instance,
        {
          ...created.instance,
          stationMutation: {
            stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        }
      )
    ).toMatchObject({ ok: false, code: 'unauthorized_station_mutation' })
  })
})

describe('SPE-877 interlock integrity-labor station', () => {
  it('applies the authored interlock bench in place without flipping condition or deficiency', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyInterlockIntegrityLabor(created.state, created.instance.instanceId)
    expect(mutated).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        condition: 'damaged',
        location: { state: 'stored' },
        containmentIntegrity: {
          classId: 'interlock',
          lastInspectionWeek: 1,
          cycleCount: 1,
          deficiency: { kind: 'hard_stop' },
        },
        stationMutation: {
          stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
    if (!mutated.ok) throw new Error(mutated.code)
    expect(isContainmentClassInService(mutated.instance.containmentIntegrity)).toBe(false)
    expect(mutated.state.inventory.ward_seals).toBe(0)
    expect(mutated.state.damagedEquipmentQueue ?? []).toEqual([])
    expect(mutated.state.containmentBarrierIntegrity).toEqual(
      created.state.containmentBarrierIntegrity
    )
    expect(
      reaggregateStoredOrdinaryEquipmentInstance(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'station_mutation_reaggregation_unsupported',
    })
    expect(applyInterlockIntegrityLabor(mutated.state, created.instance.instanceId)).toMatchObject({
      ok: false,
      code: 'station_mutation_already_applied',
    })
    expect(
      stabilizeContainmentClassDeficiency(mutated.state, created.instance.instanceId)
    ).toMatchObject({
      ok: true,
      instance: {
        instanceId: created.instance.instanceId,
        condition: 'damaged',
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
          },
          cycleCount: 2,
        },
        stationMutation: {
          stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 3,
        },
      },
    })
  })

  it('fails closed for ordinary, blast-door, pressure-seal, equipped, missing, and the workshop seed', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.ward_seals = 2
    const ordinary = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!ordinary.ok) throw new Error(ordinary.code)
    const interlock = instantiateEquipmentInstance(ordinary.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!interlock.ok) throw new Error(interlock.code)
    const pressure = instantiateEquipmentInstance(interlock.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!pressure.ok) throw new Error(pressure.code)
    const equipped = relocateEquipmentInstance(pressure.state, interlock.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)
    const snapshot = equipped.state.equipmentInstances

    expect(
      applyInterlockIntegrityLabor(ordinary.state, ordinary.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'malformed_containment_integrity' })
    expect(
      applyInterlockIntegrityLabor(ordinary.state, FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyBlastDoorIntegrityLabor(interlock.state, interlock.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyPressureSealIntegrityLabor(interlock.state, interlock.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyInterlockIntegrityLabor(pressure.state, pressure.instance.instanceId)
    ).toMatchObject({ ok: false, code: 'invalid_containment_class' })
    expect(
      applyInterlockIntegrityLabor(equipped.state, interlock.instance.instanceId)
    ).toMatchObject({
      ok: false,
      code: 'instance_not_stored',
    })
    expect(applyInterlockIntegrityLabor(equipped.state, 'constructor')).toMatchObject({
      ok: false,
      code: 'invalid_instance_id',
    })
    expect(applyInterlockIntegrityLabor(equipped.state, 'equipment-instance-9-9')).toMatchObject({
      ok: false,
      code: 'stale_transition',
    })
    expect(equipped.state.equipmentInstances).toEqual(snapshot)
  })

  it('hydrates a matching interlock stamp and drops mixed class/station pairing', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const mutated = applyInterlockIntegrityLabor(created.state, created.instance.instanceId)
    if (!mutated.ok) throw new Error(mutated.code)
    const withEvent = appendOperationEventDrafts(mutated.state, [
      createEquipmentInstanceStationMutatedDraft({
        week: mutated.state.week,
        instanceId: mutated.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'interlock',
        stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
        previousCycleCount: 0,
        cycleCount: 1,
        condition: 'operational',
        deficiencyKind: 'none',
        inService: true,
        reason: 'integrity_labor',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-interlock-station-mutation',
      payload: { ...serialized.events.at(-1).payload, classId: 'blast_door' },
    })

    const hydrated = hydrateGame(serialized)
    expect(hydrated.equipmentInstances?.[created.instance.instanceId]).toEqual(mutated.instance)
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.instance_station_mutated')
    ).toHaveLength(1)

    const mixedStamp = sanitizeEquipmentInstanceRegistry(
      {
        'equipment-instance-1-2': {
          instanceId: 'equipment-instance-1-2',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: blastDoorIntegrity(),
          stationMutation: {
            stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
        'equipment-instance-1-3': {
          instanceId: 'equipment-instance-1-3',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
          stationMutation: {
            stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
        'equipment-instance-1-4': {
          instanceId: 'equipment-instance-1-4',
          definitionId: 'ward_seals',
          condition: 'operational',
          location: { state: 'stored' },
          containmentIntegrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
          stationMutation: {
            stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        },
      },
      created.state.agents,
      new Set(),
      created.state.fabricatedEquipmentLots
    )
    expect(mixedStamp.equipmentInstances['equipment-instance-1-2']).toBeUndefined()
    expect(mixedStamp.equipmentInstances['equipment-instance-1-3']).toBeUndefined()
    expect(mixedStamp.equipmentInstances['equipment-instance-1-4']).toBeUndefined()
    expect(mixedStamp.issues).toContainEqual({
      instanceId: 'equipment-instance-1-2',
      code: 'malformed_station_mutation',
    })
    expect(mixedStamp.issues).toContainEqual({
      instanceId: 'equipment-instance-1-3',
      code: 'malformed_station_mutation',
    })
    expect(mixedStamp.issues).toContainEqual({
      instanceId: 'equipment-instance-1-4',
      code: 'malformed_station_mutation',
    })
  })

  it('rejects generic transitions that invent the interlock stamp', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    expect(
      applyEquipmentInstanceTransition(
        created.state,
        created.instance.instanceId,
        created.instance,
        {
          ...created.instance,
          stationMutation: {
            stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
            appliedWeek: 1,
          },
        }
      )
    ).toMatchObject({ ok: false, code: 'unauthorized_station_mutation' })
  })
})

describe('SPE-877 barrier-integrity coupling', () => {
  it('propagates blast-door hard-stop into one zone breach', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    expect(created.state.containmentBarrierIntegrity).toBeUndefined()

    const stopped = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'hard_stop'
    )
    expect(stopped).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'hard_stop' } } },
      state: {
        containmentBarrierIntegrity: {
          [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
            zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
            status: 'zone_breach',
            sourceInstanceId: created.instance.instanceId,
            sourceDeficiencyKind: 'hard_stop',
          },
        },
      },
    })
  })

  it('does not open a full breach from compensating continue', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const continued = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'compensating_continue'
    )
    expect(continued).toMatchObject({
      ok: true,
      state: {
        containmentBarrierIntegrity: {
          [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
            status: 'flow_restraint',
            sourceDeficiencyKind: 'compensating_continue',
          },
        },
      },
    })
    if (!continued.ok) throw new Error(continued.code)
    expect(
      continued.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]?.status
    ).not.toBe('zone_breach')
  })

  it('does not let SPE-2862 relief silently close a recorded zone breach', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const stopped = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'hard_stop'
    )
    if (!stopped.ok) throw new Error(stopped.code)
    const relieved = stabilizeContainmentClassDeficiency(stopped.state, created.instance.instanceId)
    expect(relieved).toMatchObject({
      ok: true,
      instance: {
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
          },
        },
      },
      state: {
        containmentBarrierIntegrity: {
          [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
            status: 'zone_breach',
            sourceDeficiencyKind: 'hard_stop',
          },
        },
      },
    })
    if (!relieved.ok) throw new Error(relieved.code)
    const cleared = stabilizeContainmentClassDeficiency(relieved.state, created.instance.instanceId)
    expect(cleared).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
      state: {
        containmentBarrierIntegrity: {
          [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
            status: 'zone_breach',
            sourceDeficiencyKind: 'hard_stop',
          },
        },
      },
    })
  })

  it('omits flow-restraint on technician clear and leaves sibling zones unchanged', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 5
    const blast = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!blast.ok) throw new Error(blast.code)
    const restrainedBlast = applyContainmentClassDeficiency(
      blast.state,
      blast.instance.instanceId,
      'compensating_continue'
    )
    if (!restrainedBlast.ok) throw new Error(restrainedBlast.code)
    const seal = instantiateEquipmentInstance(restrainedBlast.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!seal.ok) throw new Error(seal.code)
    const restrainedSeal = applyContainmentClassDeficiency(
      seal.state,
      seal.instance.instanceId,
      'compensating_continue'
    )
    if (!restrainedSeal.ok) throw new Error(restrainedSeal.code)
    expect(
      restrainedSeal.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]?.status
    ).toBe('flow_restraint')
    expect(
      restrainedSeal.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]?.status
    ).toBe('flow_restraint')

    const clearedSeal = stabilizeContainmentClassDeficiency(
      restrainedSeal.state,
      seal.instance.instanceId
    )
    expect(clearedSeal).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedSeal.ok) throw new Error(clearedSeal.code)
    expect(
      clearedSeal.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(clearedSeal.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: blast.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })

    const clearedBlast = stabilizeContainmentClassDeficiency(
      clearedSeal.state,
      blast.instance.instanceId
    )
    expect(clearedBlast).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedBlast.ok) throw new Error(clearedBlast.code)
    expect(clearedBlast.state.containmentBarrierIntegrity).toBeUndefined()
  })

  it('keeps last-writer flow-restraint when a same-class sibling clears to none', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 5
    const first = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!first.ok) throw new Error(first.code)
    const second = instantiateEquipmentInstance(first.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!second.ok) throw new Error(second.code)
    const secondRestrained = applyContainmentClassDeficiency(
      second.state,
      second.instance.instanceId,
      'compensating_continue'
    )
    if (!secondRestrained.ok) throw new Error(secondRestrained.code)
    const firstRestrained = applyContainmentClassDeficiency(
      secondRestrained.state,
      first.instance.instanceId,
      'compensating_continue'
    )
    if (!firstRestrained.ok) throw new Error(firstRestrained.code)
    expect(
      firstRestrained.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: second.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })

    const clearedFirst = stabilizeContainmentClassDeficiency(
      firstRestrained.state,
      first.instance.instanceId
    )
    expect(clearedFirst).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedFirst.ok) throw new Error(clearedFirst.code)
    expect(clearedFirst.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: second.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })

    const clearedSecond = stabilizeContainmentClassDeficiency(
      clearedFirst.state,
      second.instance.instanceId
    )
    expect(clearedSecond).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedSecond.ok) throw new Error(clearedSecond.code)
    expect(clearedSecond.state.containmentBarrierIntegrity).toBeUndefined()
  })

  it('recouples last-writer flow-restraint from a same-class sibling that stays compensating', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 5
    const first = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!first.ok) throw new Error(first.code)
    const second = instantiateEquipmentInstance(first.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!second.ok) throw new Error(second.code)
    const secondRestrained = applyContainmentClassDeficiency(
      second.state,
      second.instance.instanceId,
      'compensating_continue'
    )
    if (!secondRestrained.ok) throw new Error(secondRestrained.code)
    const firstRestrained = applyContainmentClassDeficiency(
      secondRestrained.state,
      first.instance.instanceId,
      'compensating_continue'
    )
    if (!firstRestrained.ok) throw new Error(firstRestrained.code)

    const clearedSecond = stabilizeContainmentClassDeficiency(
      firstRestrained.state,
      second.instance.instanceId
    )
    expect(clearedSecond).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedSecond.ok) throw new Error(clearedSecond.code)
    expect(clearedSecond.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: first.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })
    expect(
      clearedSecond.state.equipmentInstances?.[first.instance.instanceId]?.containmentIntegrity
        ?.deficiency
    ).toMatchObject({ kind: 'compensating_continue' })
  })

  it('recouples extra-class last-writer flow-restraint from a remaining compensating sibling', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 4
    state.week = 5
    const firstSeal = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ classId: 'pressure_seal' }),
    })
    if (!firstSeal.ok) throw new Error(firstSeal.code)
    const secondSeal = instantiateEquipmentInstance(firstSeal.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ classId: 'pressure_seal' }),
    })
    if (!secondSeal.ok) throw new Error(secondSeal.code)
    const secondSealRestrained = applyContainmentClassDeficiency(
      secondSeal.state,
      secondSeal.instance.instanceId,
      'compensating_continue'
    )
    if (!secondSealRestrained.ok) throw new Error(secondSealRestrained.code)
    const firstSealRestrained = applyContainmentClassDeficiency(
      secondSealRestrained.state,
      firstSeal.instance.instanceId,
      'compensating_continue'
    )
    if (!firstSealRestrained.ok) throw new Error(firstSealRestrained.code)
    const clearedSecondSeal = stabilizeContainmentClassDeficiency(
      firstSealRestrained.state,
      secondSeal.instance.instanceId
    )
    expect(clearedSecondSeal).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedSecondSeal.ok) throw new Error(clearedSecondSeal.code)
    expect(
      clearedSecondSeal.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: firstSeal.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })

    const firstInterlock = instantiateEquipmentInstance(clearedSecondSeal.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ classId: 'interlock' }),
    })
    if (!firstInterlock.ok) throw new Error(firstInterlock.code)
    const secondInterlock = instantiateEquipmentInstance(firstInterlock.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ classId: 'interlock' }),
    })
    if (!secondInterlock.ok) throw new Error(secondInterlock.code)
    const secondInterlockRestrained = applyContainmentClassDeficiency(
      secondInterlock.state,
      secondInterlock.instance.instanceId,
      'compensating_continue'
    )
    if (!secondInterlockRestrained.ok) throw new Error(secondInterlockRestrained.code)
    const firstInterlockRestrained = applyContainmentClassDeficiency(
      secondInterlockRestrained.state,
      firstInterlock.instance.instanceId,
      'compensating_continue'
    )
    if (!firstInterlockRestrained.ok) throw new Error(firstInterlockRestrained.code)
    const clearedSecondInterlock = stabilizeContainmentClassDeficiency(
      firstInterlockRestrained.state,
      secondInterlock.instance.instanceId
    )
    expect(clearedSecondInterlock).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedSecondInterlock.ok) throw new Error(clearedSecondInterlock.code)
    expect(
      clearedSecondInterlock.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: firstInterlock.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })
    expect(
      clearedSecondInterlock.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: firstSeal.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })
  })

  it('picks the lexicographically first remaining compensating sibling after last-writer omit', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 3
    state.week = 5
    const first = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!first.ok) throw new Error(first.code)
    const second = instantiateEquipmentInstance(first.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!second.ok) throw new Error(second.code)
    const third = instantiateEquipmentInstance(second.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!third.ok) throw new Error(third.code)
    const thirdRestrained = applyContainmentClassDeficiency(
      third.state,
      third.instance.instanceId,
      'compensating_continue'
    )
    if (!thirdRestrained.ok) throw new Error(thirdRestrained.code)
    const secondRestrained = applyContainmentClassDeficiency(
      thirdRestrained.state,
      second.instance.instanceId,
      'compensating_continue'
    )
    if (!secondRestrained.ok) throw new Error(secondRestrained.code)
    const firstRestrained = applyContainmentClassDeficiency(
      secondRestrained.state,
      first.instance.instanceId,
      'compensating_continue'
    )
    if (!firstRestrained.ok) throw new Error(firstRestrained.code)
    expect(first.instance.instanceId < second.instance.instanceId).toBe(true)
    expect(
      firstRestrained.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: third.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })

    const clearedThird = stabilizeContainmentClassDeficiency(
      firstRestrained.state,
      third.instance.instanceId
    )
    expect(clearedThird).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedThird.ok) throw new Error(clearedThird.code)
    expect(clearedThird.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: first.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })
  })

  it('upgrades omitted last-writer flow-restraint to zone-breach from a remaining hard-stop sibling', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 5
    const first = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!first.ok) throw new Error(first.code)
    const second = instantiateEquipmentInstance(first.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!second.ok) throw new Error(second.code)
    const firstRestrained = applyContainmentClassDeficiency(
      second.state,
      first.instance.instanceId,
      'compensating_continue'
    )
    if (!firstRestrained.ok) throw new Error(firstRestrained.code)
    expect(
      firstRestrained.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceInstanceId: first.instance.instanceId,
      sourceDeficiencyKind: 'compensating_continue',
    })
    const plantedHardStop = plantContainmentDeficiency(
      firstRestrained.state,
      second.instance.instanceId,
      { kind: 'hard_stop' }
    )

    const clearedFirst = stabilizeContainmentClassDeficiency(
      plantedHardStop,
      first.instance.instanceId
    )
    expect(clearedFirst).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!clearedFirst.ok) throw new Error(clearedFirst.code)
    expect(clearedFirst.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'zone_breach',
      sourceInstanceId: second.instance.instanceId,
      sourceDeficiencyKind: 'hard_stop',
    })
  })

  it('does not let extra-class hard-stop relief close a recorded zone breach', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 5
    const seal = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!seal.ok) throw new Error(seal.code)
    const stoppedSeal = applyContainmentClassDeficiency(
      seal.state,
      seal.instance.instanceId,
      'hard_stop'
    )
    if (!stoppedSeal.ok) throw new Error(stoppedSeal.code)
    const relievedSeal = stabilizeContainmentClassDeficiency(
      stoppedSeal.state,
      seal.instance.instanceId
    )
    expect(relievedSeal).toMatchObject({
      ok: true,
      instance: {
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
          },
        },
      },
      state: {
        containmentBarrierIntegrity: {
          [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: {
            status: 'zone_breach',
            sourceDeficiencyKind: 'hard_stop',
          },
        },
      },
    })

    const interlock = instantiateEquipmentInstance(stoppedSeal.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!interlock.ok) throw new Error(interlock.code)
    const stoppedInterlock = applyContainmentClassDeficiency(
      interlock.state,
      interlock.instance.instanceId,
      'hard_stop'
    )
    if (!stoppedInterlock.ok) throw new Error(stoppedInterlock.code)
    const relievedInterlock = stabilizeContainmentClassDeficiency(
      stoppedInterlock.state,
      interlock.instance.instanceId
    )
    expect(relievedInterlock).toMatchObject({
      ok: true,
      instance: {
        containmentIntegrity: {
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
          },
        },
      },
    })
    if (!relievedInterlock.ok) throw new Error(relievedInterlock.code)
    expect(
      relievedInterlock.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]?.status
    ).toBe('zone_breach')
    expect(
      relievedInterlock.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]?.status
    ).toBe('zone_breach')
  })

  it('does not recouple an already-intact zone when clearing compensating continue', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      }),
    })
    if (!created.ok) throw new Error(created.code)
    expect(created.state.containmentBarrierIntegrity).toBeUndefined()
    const cleared = stabilizeContainmentClassDeficiency(created.state, created.instance.instanceId)
    expect(cleared).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'none' } } },
    })
    if (!cleared.ok) throw new Error(cleared.code)
    expect(cleared.state.containmentBarrierIntegrity).toBeUndefined()
  })

  it('hydrates technician-relief omit as history without replaying barrier mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const restrained = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'compensating_continue'
    )
    if (!restrained.ok) throw new Error(restrained.code)
    const withEvent = appendOperationEventDrafts(restrained.state, [
      createContainmentBarrierIntegrityChangedDraft({
        week: restrained.state.week,
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        previousStatus: 'intact',
        status: 'flow_restraint',
        sourceDeficiencyKind: 'compensating_continue',
        reason: 'deficiency_coupling',
      }),
    ])
    const cleared = stabilizeContainmentClassDeficiency(withEvent, created.instance.instanceId)
    if (!cleared.ok) throw new Error(cleared.code)
    expect(cleared.state.containmentBarrierIntegrity).toBeUndefined()
    const serialized = JSON.parse(JSON.stringify(cleared.state))
    const hydrated = hydrateGame(serialized)
    expect(hydrated.containmentBarrierIntegrity).toBeUndefined()
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity?.deficiency
    ).toEqual({ kind: 'none' })
    expect(
      hydrated.events.filter(
        (event) => event.type === 'equipment.containment_barrier_integrity_changed'
      )
    ).toHaveLength(1)
  })

  it('does not treat SPE-2851 damaged or ordinary identities as a breach', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.signal_jammers = 1
    const ordinary = instantiateEquipmentInstance(state, 'signal_jammers', {
      condition: 'damaged',
    })
    if (!ordinary.ok) throw new Error(ordinary.code)
    const damagedDoor = instantiateEquipmentInstance(ordinary.state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!damagedDoor.ok) throw new Error(damagedDoor.code)
    expect(damagedDoor.state.containmentBarrierIntegrity).toBeUndefined()
    expect(
      applyContainmentClassDeficiency(damagedDoor.state, ordinary.instance.instanceId, 'hard_stop')
    ).toMatchObject({ ok: false, code: 'malformed_containment_integrity' })
    const repaired = repairStoredEquipmentInstanceCondition(
      damagedDoor.state,
      damagedDoor.instance.instanceId,
      BLAST_DOOR_SPARE_PART_ID
    )
    expect(repaired).toMatchObject({ ok: true })
    if (!repaired.ok) throw new Error(repaired.code)
    expect(repaired.state.containmentBarrierIntegrity).toBeUndefined()
  })

  it('round-trips a valid recorded zone breach through hydration', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const stopped = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'hard_stop'
    )
    if (!stopped.ok) throw new Error(stopped.code)
    expect(stopped.state.containmentBarrierIntegrity).toEqual({
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: created.instance.instanceId,
        sourceDeficiencyKind: 'hard_stop',
      },
    })

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(stopped.state)))
    expect(hydrated.containmentBarrierIntegrity).toEqual(stopped.state.containmentBarrierIntegrity)
    expect(hydrated.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]?.status).toBe(
      'zone_breach'
    )
  })

  it('hydrates the barrier event as history without replaying mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const stopped = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'hard_stop'
    )
    if (!stopped.ok) throw new Error(stopped.code)

    const withEvent = appendOperationEventDrafts(stopped.state, [
      createContainmentBarrierIntegrityChangedDraft({
        week: stopped.state.week,
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        previousStatus: 'intact',
        status: 'zone_breach',
        sourceDeficiencyKind: 'hard_stop',
        reason: 'deficiency_coupling',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.containmentBarrierIntegrity = {
      zoneId: 'other_membrane',
      status: 'zone_breach',
      sourceInstanceId: created.instance.instanceId,
      sourceDeficiencyKind: 'hard_stop',
    }
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-barrier',
      payload: { ...serialized.events.at(-1).payload, zoneId: 'other_membrane' },
    })

    const hydrated = hydrateGame(serialized)
    expect(hydrated.containmentBarrierIntegrity).toBeUndefined()
    expect(
      hydrated.events.filter(
        (event) => event.type === 'equipment.containment_barrier_integrity_changed'
      )
    ).toHaveLength(1)
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }))
  })

  it('propagates pressure-seal hard-stop into pressure_seal_membrane without writing blast_door_membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const stopped = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'hard_stop'
    )
    expect(stopped).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'hard_stop' } } },
    })
    if (!stopped.ok) throw new Error(stopped.code)
    expect(stopped.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toBeUndefined()
    expect(stopped.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'zone_breach',
      sourceInstanceId: created.instance.instanceId,
      sourceDeficiencyKind: 'hard_stop',
    })
  })

  it('writes pressure-seal compensating continue as flow-restraint on its own zone', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 4
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const continued = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'compensating_continue'
    )
    if (!continued.ok) throw new Error(continued.code)
    expect(
      continued.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(
      continued.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toMatchObject({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceDeficiencyKind: 'compensating_continue',
    })
  })

  it('does not clobber a recorded blast-door breach when pressure-seal writes its zone', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 6
    const door = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!door.ok) throw new Error(door.code)
    const breached = applyContainmentClassDeficiency(
      door.state,
      door.instance.instanceId,
      'hard_stop'
    )
    if (!breached.ok) throw new Error(breached.code)
    const blastDoorRecord =
      breached.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    expect(blastDoorRecord?.status).toBe('zone_breach')
    const seal = instantiateEquipmentInstance(breached.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'pressure_seal',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!seal.ok) throw new Error(seal.code)
    const stopped = applyContainmentClassDeficiency(
      seal.state,
      seal.instance.instanceId,
      'hard_stop'
    )
    if (!stopped.ok) throw new Error(stopped.code)
    expect(stopped.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual(
      blastDoorRecord
    )
    expect(
      stopped.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]?.status
    ).toBe('zone_breach')
  })

  it('propagates interlock hard-stop into interlock_membrane without writing blast_door_membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 4
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const stopped = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'hard_stop'
    )
    expect(stopped).toMatchObject({
      ok: true,
      instance: { containmentIntegrity: { deficiency: { kind: 'hard_stop' } } },
    })
    if (!stopped.ok) throw new Error(stopped.code)
    expect(stopped.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toBeUndefined()
    expect(stopped.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]).toEqual({
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'zone_breach',
      sourceInstanceId: created.instance.instanceId,
      sourceDeficiencyKind: 'hard_stop',
    })
  })

  it('writes interlock compensating continue as flow-restraint on its own zone', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const continued = applyContainmentClassDeficiency(
      created.state,
      created.instance.instanceId,
      'compensating_continue'
    )
    if (!continued.ok) throw new Error(continued.code)
    expect(
      continued.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(continued.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]).toMatchObject(
      {
        zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
        status: 'flow_restraint',
        sourceDeficiencyKind: 'compensating_continue',
      }
    )
  })

  it('does not clobber a recorded blast-door breach when interlock writes its zone', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 6
    const door = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!door.ok) throw new Error(door.code)
    const breached = applyContainmentClassDeficiency(
      door.state,
      door.instance.instanceId,
      'hard_stop'
    )
    if (!breached.ok) throw new Error(breached.code)
    const blastDoorRecord =
      breached.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    expect(blastDoorRecord?.status).toBe('zone_breach')
    const lock = instantiateEquipmentInstance(breached.state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'none' },
      },
    })
    if (!lock.ok) throw new Error(lock.code)
    const stopped = applyContainmentClassDeficiency(
      lock.state,
      lock.instance.instanceId,
      'hard_stop'
    )
    if (!stopped.ok) throw new Error(stopped.code)
    expect(stopped.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual(
      blastDoorRecord
    )
    expect(stopped.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]?.status).toBe(
      'zone_breach'
    )
  })

  it('hydrates a legacy singular blast-door record into the keyed registry', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const serialized = JSON.parse(JSON.stringify(created.state))
    serialized.containmentBarrierIntegrity = {
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: 'zone_breach',
      sourceInstanceId: created.instance.instanceId,
      sourceDeficiencyKind: 'hard_stop',
    }
    const hydrated = hydrateGame(serialized)
    expect(hydrated.containmentBarrierIntegrity).toEqual({
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: created.instance.instanceId,
        sourceDeficiencyKind: 'hard_stop',
      },
    })
  })

  it('drops a singular extra-class record instead of promoting it into the keyed registry', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const serialized = JSON.parse(JSON.stringify(created.state))
    serialized.containmentBarrierIntegrity = {
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'zone_breach',
      sourceInstanceId: created.instance.instanceId,
      sourceDeficiencyKind: 'hard_stop',
    }
    const hydrated = hydrateGame(serialized)
    expect(hydrated.containmentBarrierIntegrity).toBeUndefined()
  })

  it('drops a malformed extra-class zone independently of a valid blast-door membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const serialized = JSON.parse(JSON.stringify(created.state))
    serialized.containmentBarrierIntegrity = {
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: created.instance.instanceId,
        sourceDeficiencyKind: 'hard_stop',
      },
      [PRESSURE_SEAL_MEMBRANE_ZONE_ID]: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: created.instance.instanceId,
        sourceDeficiencyKind: 'hard_stop',
      },
      [INTERLOCK_MEMBRANE_ZONE_ID]: { status: 'zone_breach' },
    }
    const hydrated = hydrateGame(serialized)
    expect(hydrated.containmentBarrierIntegrity).toEqual({
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: created.instance.instanceId,
        sourceDeficiencyKind: 'hard_stop',
      },
    })
  })

  it('hydrates extra-class barrier events as history without replaying mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 4
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: {
        classId: 'interlock',
        lastInspectionWeek: 1,
        cycleCount: 0,
        deficiency: { kind: 'hard_stop' },
      },
    })
    if (!created.ok) throw new Error(created.code)
    const withEvent = appendOperationEventDrafts(created.state, [
      createContainmentBarrierIntegrityChangedDraft({
        week: created.state.week,
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'interlock',
        zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
        previousStatus: 'intact',
        status: 'zone_breach',
        sourceDeficiencyKind: 'hard_stop',
        reason: 'deficiency_coupling',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvent))
    serialized.containmentBarrierIntegrity = {
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'zone_breach',
        sourceInstanceId: created.instance.instanceId,
        sourceDeficiencyKind: 'hard_stop',
      },
    }
    const hydrated = hydrateGame(serialized)
    expect(hydrated.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]?.status).toBe(
      'zone_breach'
    )
    expect(hydrated.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]).toBeUndefined()
    expect(
      hydrated.events.filter(
        (event) => event.type === 'equipment.containment_barrier_integrity_changed'
      )
    ).toHaveLength(1)
    expect(hydrated.events.at(-1)?.payload).toMatchObject({
      classId: 'interlock',
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
    })
  })
})
