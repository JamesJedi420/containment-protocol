import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import {
  applyEquipmentInstanceTransition,
  instantiateEquipmentInstance,
  relocateEquipmentInstance,
  repairStoredEquipmentInstanceCondition,
} from '../domain/equipmentInstance'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  INTERLOCK_COMPENSATING_CONTROL_ID,
  PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
  isContainmentClassInService,
  type ContainmentClassIntegrity,
} from '../domain/containmentClassInspection'
import { advanceContainmentClassInspectionsAtWeekClose } from '../domain/containmentClassWeekClose'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { appendOperationEventDrafts } from '../domain/events'
import { createContainmentClassInspectedDraft } from '../domain/events/eventBus'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'
import {
  BLAST_DOOR_MEMBRANE_ZONE_ID,
  INTERLOCK_MEMBRANE_ZONE_ID,
  PRESSURE_SEAL_MEMBRANE_ZONE_ID,
} from '../domain/containmentBarrierIntegrity'
import { FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID } from '../domain/departmentWorkshopIntegrityQualityMapping'

function draftsForInstance<T extends { payload?: { instanceId?: string } }>(
  drafts: readonly T[],
  instanceId: string
) {
  return drafts.filter((draft) => draft.payload?.instanceId === instanceId)
}

function inspectEventsFor(
  events: ReadonlyArray<{ type: string; payload?: { instanceId?: string } }>,
  instanceId: string
) {
  return events.filter(
    (event) =>
      event.type === 'equipment.containment_class_inspected' &&
      event.payload?.instanceId === instanceId
  )
}

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

function pressureSealIntegrity(
  overrides: Partial<ContainmentClassIntegrity> = {}
): ContainmentClassIntegrity {
  return {
    classId: 'pressure_seal',
    lastInspectionWeek: 1,
    cycleCount: 0,
    deficiency: { kind: 'none' },
    ...overrides,
  }
}

function interlockIntegrity(
  overrides: Partial<ContainmentClassIntegrity> = {}
): ContainmentClassIntegrity {
  return {
    classId: 'interlock',
    lastInspectionWeek: 1,
    cycleCount: 0,
    deficiency: { kind: 'none' },
    ...overrides,
  }
}

describe('SPE-877 week-close last-inspection auto-advance', () => {
  it('no-ops current blast-door integrity and ordinary identities', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.signal_jammers = 1
    const ordinary = instantiateEquipmentInstance(state, 'signal_jammers')
    if (!ordinary.ok) throw new Error(ordinary.code)
    const created = instantiateEquipmentInstance(ordinary.state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(advanced.state).toBe(created.state)
    expect(advanced.eventDrafts).toEqual([])
    expect(
      created.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(blastDoorIntegrity())
  })

  it('stamps due last-inspection and records compensating continue', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    const integrity =
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    expect(integrity).toMatchObject({
      lastInspectionWeek: 5,
      cycleCount: 0,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      },
    })
    expect(isContainmentClassInService(integrity)).toBe(true)
    expect(advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]?.status).toBe(
      'flow_restraint'
    )
    const createdDrafts = draftsForInstance(advanced.eventDrafts, created.instance.instanceId)
    expect(createdDrafts.map((draft) => draft.type)).toEqual([
      'equipment.containment_class_inspected',
      'equipment.containment_class_deficiency_recorded',
    ])
    expect(createdDrafts[0]?.payload).toMatchObject({
      status: 'due',
      previousLastInspectionWeek: 1,
      lastInspectionWeek: 5,
      reason: 'week_close_auto_advance',
    })
    expect(advanceContainmentClassInspectionsAtWeekClose(advanced.state).eventDrafts).toEqual([])
    expect(advanced.state.equipmentInstances?.[created.instance.instanceId]?.condition).toBe(
      'operational'
    )
  })

  it('stamps due last-inspection on equipped blast-door when the carrier is not idle', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const equipped = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'secondary',
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

    const advanced = advanceContainmentClassInspectionsAtWeekClose(trainingState)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      lastInspectionWeek: 5,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      },
    })
    expect(
      draftsForInstance(advanced.eventDrafts, created.instance.instanceId).map(
        (draft) => draft.type
      )
    ).toEqual([
      'equipment.containment_class_inspected',
      'equipment.containment_class_deficiency_recorded',
    ])
    const equippedInstance = trainingState.equipmentInstances?.[created.instance.instanceId]
    if (!equippedInstance) throw new Error('missing equipped instance')
    expect(
      applyEquipmentInstanceTransition(
        trainingState,
        created.instance.instanceId,
        equippedInstance,
        { ...equippedInstance, location: { state: 'stored' } },
        { allowNonIdleCarrier: true }
      )
    ).toMatchObject({ ok: false, code: 'agent_not_idle' })
  })

  it('stamps overdue last-inspection to hard-stop and couples barrier breach', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 6
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      lastInspectionWeek: 6,
      deficiency: { kind: 'hard_stop' },
    })
    expect(advanced.state.containmentBarrierIntegrity).toMatchObject({
      [BLAST_DOOR_MEMBRANE_ZONE_ID]: {
        status: 'zone_breach',
        sourceDeficiencyKind: 'hard_stop',
      },
    })
  })

  it('keeps sticky hard-stop, stamps last inspection, and skips a second deficiency event', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      lastInspectionWeek: 5,
      cycleCount: 0,
      deficiency: { kind: 'hard_stop' },
    })
    expect(
      draftsForInstance(advanced.eventDrafts, created.instance.instanceId).map(
        (draft) => draft.type
      )
    ).toEqual(['equipment.containment_class_inspected'])
  })

  it('skips inverted-week and malformed integrity without dropping the instance', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity({ lastInspectionWeek: 8 }),
    })
    if (!created.ok) throw new Error(created.code)
    const snapshot = created.state.equipmentInstances?.[created.instance.instanceId]
    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(draftsForInstance(advanced.eventDrafts, created.instance.instanceId)).toEqual([])
    expect(advanced.state.equipmentInstances?.[created.instance.instanceId]).toEqual(snapshot)
    expect(created.state.equipmentInstances?.[created.instance.instanceId]).toEqual(snapshot)

    const malformedState = {
      ...created.state,
      equipmentInstances: {
        ...created.state.equipmentInstances,
        [created.instance.instanceId]: {
          ...snapshot,
          containmentIntegrity: {
            classId: 'blast_door',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
            extra: true,
          },
        },
      },
    }
    const skipped = advanceContainmentClassInspectionsAtWeekClose(malformedState)
    expect(draftsForInstance(skipped.eventDrafts, created.instance.instanceId)).toEqual([])
    expect(skipped.state.equipmentInstances?.[created.instance.instanceId]).toEqual(
      malformedState.equipmentInstances?.[created.instance.instanceId]
    )
  })

  it('does not let SPE-2851 repair clear week-close hard-stop', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 6
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      condition: 'damaged',
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    const repaired = repairStoredEquipmentInstanceCondition(
      advanced.state,
      created.instance.instanceId,
      BLAST_DOOR_SPARE_PART_ID
    )
    expect(repaired).toMatchObject({
      ok: true,
      instance: {
        condition: 'operational',
        containmentIntegrity: { deficiency: { kind: 'hard_stop' }, lastInspectionWeek: 6 },
      },
    })
  })

  it('advances due blast-door integrity through advanceWeek and no-ops the next close', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const closed = advanceWeek(created.state)
    const integrity = closed.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    expect(closed.week).toBe(6)
    expect(integrity).toMatchObject({
      lastInspectionWeek: 5,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
      },
    })
    expect(inspectEventsFor(closed.events, created.instance.instanceId)).toMatchObject([
      {
        payload: {
          week: 5,
          lastInspectionWeek: 5,
          previousLastInspectionWeek: 1,
          status: 'due',
          reason: 'week_close_auto_advance',
        },
      },
    ])

    const second = advanceWeek(closed)
    expect(second.week).toBe(7)
    expect(
      second.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
        ?.lastInspectionWeek
    ).toBe(5)
    expect(inspectEventsFor(second.events, created.instance.instanceId)).toHaveLength(1)
  })

  it('hydrates week-close inspect events as history without replaying mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const withEvents = appendOperationEventDrafts(created.state, [
      createContainmentClassInspectedDraft({
        week: 5,
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'blast_door',
        status: 'due',
        previousLastInspectionWeek: 1,
        lastInspectionWeek: 5,
        intervalWeeks: 4,
        weeksSinceInspection: 4,
        deficiencyKind: 'compensating_continue',
        compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        inService: true,
        reason: 'week_close_auto_advance',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvents))
    serialized.events.push({
      ...serialized.events.at(-1),
      id: 'evt-malformed-inspect',
      payload: { ...serialized.events.at(-1).payload, classId: 'pressure_seal' },
    })

    const hydrated = hydrateGame(serialized)
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(blastDoorIntegrity())
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.containment_class_inspected')
    ).toHaveLength(1)
  })

  it('stamps due pressure-seal last-inspection onto pressure_seal_membrane without writing blast_door_membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 4
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: pressureSealIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      classId: 'pressure_seal',
      lastInspectionWeek: 4,
      cycleCount: 0,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
      },
    })
    expect(
      advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(
      advanced.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toMatchObject({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceDeficiencyKind: 'compensating_continue',
    })
    expect(
      draftsForInstance(advanced.eventDrafts, created.instance.instanceId)[0]?.payload
    ).toMatchObject({
      classId: 'pressure_seal',
      status: 'due',
      compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
      reason: 'week_close_auto_advance',
    })
  })

  it('stamps overdue pressure-seal to hard-stop on pressure_seal_membrane without rewriting blast_door from the extra-class identity', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 5
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: pressureSealIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      classId: 'pressure_seal',
      lastInspectionWeek: 5,
      deficiency: { kind: 'hard_stop' },
    })
    expect(advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toMatchObject(
      {
        zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
        status: 'flow_restraint',
        sourceInstanceId: FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
      }
    )
    expect(
      advanced.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]
    ).toMatchObject({
      zoneId: PRESSURE_SEAL_MEMBRANE_ZONE_ID,
      status: 'zone_breach',
      sourceInstanceId: created.instance.instanceId,
    })
  })

  it('does not let pressure-seal week-close mutate an existing blast-door membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 6
    const door = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!door.ok) throw new Error(door.code)
    const breached = advanceContainmentClassInspectionsAtWeekClose(door.state)
    const blastDoorRecord =
      breached.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    expect(blastDoorRecord?.status).toBe('zone_breach')
    const seal = instantiateEquipmentInstance(breached.state, 'ward_seals', {
      containmentIntegrity: pressureSealIntegrity({ lastInspectionWeek: 1 }),
    })
    if (!seal.ok) throw new Error(seal.code)
    const advanced = advanceContainmentClassInspectionsAtWeekClose(seal.state)
    expect(advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual(
      blastDoorRecord
    )
    expect(
      advanced.state.containmentBarrierIntegrity?.[PRESSURE_SEAL_MEMBRANE_ZONE_ID]?.status
    ).toBe('zone_breach')
    expect(
      advanced.state.equipmentInstances?.[seal.instance.instanceId]?.containmentIntegrity?.classId
    ).toBe('pressure_seal')
  })

  it('hydrates pressure-seal inspect events as history without replaying mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 4
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: pressureSealIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const withEvents = appendOperationEventDrafts(created.state, [
      createContainmentClassInspectedDraft({
        week: 4,
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'pressure_seal',
        status: 'due',
        previousLastInspectionWeek: 1,
        lastInspectionWeek: 4,
        intervalWeeks: 3,
        weeksSinceInspection: 3,
        deficiencyKind: 'compensating_continue',
        compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
        inService: true,
        reason: 'week_close_auto_advance',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvents))
    const hydrated = hydrateGame(serialized)
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(pressureSealIntegrity())
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.containment_class_inspected')
    ).toHaveLength(1)
  })

  it('stamps due interlock last-inspection onto interlock_membrane without writing blast_door_membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: interlockIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      classId: 'interlock',
      lastInspectionWeek: 3,
      cycleCount: 0,
      deficiency: {
        kind: 'compensating_continue',
        compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
      },
    })
    expect(
      advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(advanced.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]).toMatchObject({
      zoneId: INTERLOCK_MEMBRANE_ZONE_ID,
      status: 'flow_restraint',
      sourceDeficiencyKind: 'compensating_continue',
    })
    expect(
      draftsForInstance(advanced.eventDrafts, created.instance.instanceId)[0]?.payload
    ).toMatchObject({
      classId: 'interlock',
      status: 'due',
      compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
      reason: 'week_close_auto_advance',
    })
  })

  it('stamps overdue interlock to hard-stop on interlock_membrane without writing blast_door_membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 4
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: interlockIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)

    const advanced = advanceContainmentClassInspectionsAtWeekClose(created.state)
    expect(
      advanced.state.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toMatchObject({
      classId: 'interlock',
      lastInspectionWeek: 4,
      deficiency: { kind: 'hard_stop' },
    })
    expect(
      advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    ).toBeUndefined()
    expect(advanced.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]?.status).toBe(
      'zone_breach'
    )
  })

  it('does not let interlock week-close mutate an existing blast-door membrane', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.week = 6
    const door = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: blastDoorIntegrity(),
    })
    if (!door.ok) throw new Error(door.code)
    const breached = advanceContainmentClassInspectionsAtWeekClose(door.state)
    const blastDoorRecord =
      breached.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]
    expect(blastDoorRecord?.status).toBe('zone_breach')
    const lock = instantiateEquipmentInstance(breached.state, 'ward_seals', {
      containmentIntegrity: interlockIntegrity({ lastInspectionWeek: 1 }),
    })
    if (!lock.ok) throw new Error(lock.code)
    const advanced = advanceContainmentClassInspectionsAtWeekClose(lock.state)
    expect(advanced.state.containmentBarrierIntegrity?.[BLAST_DOOR_MEMBRANE_ZONE_ID]).toEqual(
      blastDoorRecord
    )
    expect(advanced.state.containmentBarrierIntegrity?.[INTERLOCK_MEMBRANE_ZONE_ID]?.status).toBe(
      'zone_breach'
    )
    expect(
      advanced.state.equipmentInstances?.[lock.instance.instanceId]?.containmentIntegrity?.classId
    ).toBe('interlock')
  })

  it('hydrates interlock inspect events as history without replaying mutation', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 1
    state.week = 3
    const created = instantiateEquipmentInstance(state, 'ward_seals', {
      containmentIntegrity: interlockIntegrity(),
    })
    if (!created.ok) throw new Error(created.code)
    const withEvents = appendOperationEventDrafts(created.state, [
      createContainmentClassInspectedDraft({
        week: 3,
        instanceId: created.instance.instanceId,
        definitionId: 'ward_seals',
        definitionName: 'Ward Seals',
        classId: 'interlock',
        status: 'due',
        previousLastInspectionWeek: 1,
        lastInspectionWeek: 3,
        intervalWeeks: 2,
        weeksSinceInspection: 2,
        deficiencyKind: 'compensating_continue',
        compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
        inService: true,
        reason: 'week_close_auto_advance',
      }),
    ])
    const serialized = JSON.parse(JSON.stringify(withEvents))
    const hydrated = hydrateGame(serialized)
    expect(
      hydrated.equipmentInstances?.[created.instance.instanceId]?.containmentIntegrity
    ).toEqual(interlockIntegrity())
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.containment_class_inspected')
    ).toHaveLength(1)
  })
})
