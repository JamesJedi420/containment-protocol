import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  activateCombatStim,
  applyCombatStimRecoveryDebtAtWeekClose,
  destroyStoredCombatStimInstance,
  equipStoredCombatStimInstance,
  expireCombatStimOverdrivesAtWeekClose,
  getCombatStimStoredInstanceDisposalViews,
  resolveCombatStimActivation,
  resolveCombatStimDisposal,
  resolveEffectiveResponderEnergyBand,
  type CombatStimActivationReasonCode,
} from '../domain/combatStim'
import type { GameState } from '../domain/models'
import {
  applyEquipmentInstanceTransition,
  getEquipmentInstanceAtAgentSlot,
  instantiateEquipmentInstance,
  isCanonicalCombatStimPayload,
} from '../domain/equipmentInstance'
import { equipAgentItem, unequipAgentItem } from '../domain/sim/equipment'
import { queueEquipmentDeconstruction } from '../domain/sim/equipmentDeconstruction'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { hydrateGame } from '../app/store/runTransfer'
import { appendOperationEventDrafts, createCombatStimDisposedDraft } from '../domain/events'
import { validateOperationEventPayload } from '../domain/events/eventValidation'
import { minimalOperationEventPayloads } from './fixtures/minimalOperationEventPayloads'

function createCriticalStimState(reserveBand: 'depleted' | 'overdrawn' = 'depleted') {
  const state = createStartingState()
  const caseId = Object.keys(state.cases).sort()[0]
  const currentCase = state.cases[caseId]
  state.inventory.combat_stims = 1
  state.cases[caseId] = {
    ...currentCase,
    kind: 'raid',
    stage: 4,
    status: 'in_progress',
  }
  state.agents.a_ava = {
    ...state.agents.a_ava,
    status: 'active',
    assignment: { state: 'idle' },
    equipmentSlots: {},
    equipmentEffectScales: {},
    energyBudget: {
      currentReserve: reserveBand === 'depleted' ? 5 : 0,
      reserveBand,
      exertionDebt: reserveBand === 'overdrawn' ? 1 : 0,
      estimateConfidence: 'high',
    },
  }
  return { state, caseId }
}

function equipAndAssignCriticalStim(reserveBand: 'depleted' | 'overdrawn' = 'depleted') {
  const { state, caseId } = createCriticalStimState(reserveBand)
  const equipped = equipAgentItem(state, 'a_ava', 'utility1', 'combat_stims')
  equipped.agents.a_ava.assignment = {
    state: 'assigned',
    caseId,
    teamId: 't_nightwatch',
    startedWeek: equipped.week,
  }
  return equipped
}

describe('SPE-2829 Combat Stim emergency overdrive', () => {
  it('strictly validates the governed 2/2 materialization event payload', () => {
    const canonical = minimalOperationEventPayloads['equipment.instance_materialized']
    expect(
      validateOperationEventPayload('equipment.instance_materialized', canonical).success
    ).toBe(true)

    const missingResource = { ...canonical, resourceId: undefined }
    expect(
      validateOperationEventPayload('equipment.instance_materialized', missingResource).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('equipment.instance_materialized', {
        ...canonical,
        capacity: 3,
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('equipment.instance_materialized', {
        ...canonical,
        remaining: 1,
      }).success
    ).toBe(false)
  })

  it('materializes one aggregate unit atomically as one equipped 2/2 instance', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 1
    state.agents.a_ava.equipmentSlots = {}
    state.agents.a_ava.equipmentEffectScales = {}

    const equipped = equipAgentItem(state, 'a_ava', 'utility1', 'combat_stims')
    const instance = getEquipmentInstanceAtAgentSlot(equipped, 'a_ava', 'utility1')

    expect(equipped.inventory.combat_stims).toBe(0)
    expect(instance).toMatchObject({
      definitionId: 'combat_stims',
      condition: 'operational',
      payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 2 },
    })
    const unavailable = createStartingState()
    unavailable.inventory.combat_stims = 0
    expect(equipAgentItem(unavailable, 'a_ava', 'utility1', 'combat_stims')).toEqual(unavailable)
    expect(unavailable.equipmentInstances).toEqual({})
  })

  it('governs Combat Stim initialization and rejects generic dose mutation or refill', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 2
    expect(
      instantiateEquipmentInstance(state, 'combat_stims', {
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 1 },
      })
    ).toMatchObject({ ok: false, code: 'invalid_consumable_profile' })

    const created = instantiateEquipmentInstance(state, 'combat_stims')
    if (!created.ok) throw new Error(created.code)
    expect(isCanonicalCombatStimPayload(created.instance.payload)).toBe(true)
    expect(
      applyEquipmentInstanceTransition(
        created.state,
        created.instance.instanceId,
        created.instance,
        {
          ...created.instance,
          payload: { ...created.instance.payload!, remaining: 1 },
        }
      )
    ).toMatchObject({ ok: false, code: 'unauthorized_payload_transition' })
  })

  it.each([
    ['depleted', 'taxed'],
    ['overdrawn', 'depleted'],
  ] as const)(
    'consumes one dose and derives %s → %s without mutating underlying energy',
    (underlying, effective) => {
      const equipped = equipAndAssignCriticalStim(underlying)
      const instance = getEquipmentInstanceAtAgentSlot(equipped, 'a_ava', 'utility1')!
      const energyBefore = equipped.agents.a_ava.energyBudget

      expect(resolveCombatStimActivation(equipped, instance.instanceId)).toMatchObject({
        available: true,
        underlyingBand: underlying,
        effectiveBand: effective,
      })
      const activated = activateCombatStim(equipped, instance.instanceId)
      expect(activated.ok).toBe(true)
      expect(activated.state.equipmentInstances?.[instance.instanceId].payload?.remaining).toBe(1)
      expect(activated.state.agents.a_ava.energyBudget).toEqual(energyBefore)
      expect(activated.state.agents.a_ava.vitals).toEqual(equipped.agents.a_ava.vitals)
      expect(activated.state.agents.a_ava.fatigue).toBe(equipped.agents.a_ava.fatigue)
      expect(activated.state.agents.a_ava.fatigueChannels).toEqual(
        equipped.agents.a_ava.fatigueChannels
      )
      expect(activated.state.agents.a_ava.stats).toEqual(equipped.agents.a_ava.stats)
      expect(resolveEffectiveResponderEnergyBand(activated.state.agents.a_ava)).toBe(effective)
      expect(activated.state.agents.a_ava.overdrive).toMatchObject({
        active: true,
        remainingPhases: 1,
        source: {
          kind: 'combat_stim',
          activationId: `combat-stim-${instance.instanceId}-dose-1`,
          equipmentInstanceId: instance.instanceId,
        },
      })
      expect(activated.state.events.at(-1)).toMatchObject({
        type: 'equipment.combat_stim_activated',
        payload: {
          dosesBefore: 2,
          dosesAfter: 1,
          underlyingBand: underlying,
          effectiveBand: effective,
        },
      })
    }
  )

  it('fails every boundary without consuming a dose or emitting an activation event', () => {
    const equipped = equipAndAssignCriticalStim()
    const instance = getEquipmentInstanceAtAgentSlot(equipped, 'a_ava', 'utility1')!
    const baseEvents = equipped.events.length
    const variants: Array<
      [CombatStimActivationReasonCode, { instanceId: string; state: GameState }]
    > = [
      ['invalid_instance_id', { instanceId: 'Bad Id', state: equipped }],
      ['unknown_instance', { instanceId: 'missing', state: equipped }],
      [
        'wrong_definition',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            equipmentInstances: {
              ...equipped.equipmentInstances,
              [instance.instanceId]: { ...instance, definitionId: 'signal_jammers' },
            },
          },
        },
      ],
      [
        'malformed_payload',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            equipmentInstances: {
              ...equipped.equipmentInstances,
              [instance.instanceId]: {
                ...instance,
                payload: { resourceId: 'wrong', capacity: 2, remaining: 2 },
              },
            },
          },
        },
      ],
      [
        'empty',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            equipmentInstances: {
              ...equipped.equipmentInstances,
              [instance.instanceId]: {
                ...instance,
                payload: { ...instance.payload!, remaining: 0 },
              },
            },
          },
        },
      ],
      [
        'not_equipped',
        {
          instanceId: instance.instanceId,
          state: unequipAgentItem(
            {
              ...equipped,
              agents: {
                ...equipped.agents,
                a_ava: { ...equipped.agents.a_ava, assignment: { state: 'idle' } },
              },
            },
            'a_ava',
            'utility1'
          ),
        },
      ],
      [
        'inoperable',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            equipmentInstances: {
              ...equipped.equipmentInstances,
              [instance.instanceId]: { ...instance, condition: 'damaged' as const },
            },
          },
        },
      ],
      [
        'invalid_responder',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            agents: {
              ...equipped.agents,
              a_ava: { ...equipped.agents.a_ava, status: 'injured' as const },
            },
          },
        },
      ],
      [
        'invalid_context',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            agents: {
              ...equipped.agents,
              a_ava: { ...equipped.agents.a_ava, assignment: { state: 'idle' as const } },
            },
          },
        },
      ],
      [
        'no_overdrive_need',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            agents: {
              ...equipped.agents,
              a_ava: {
                ...equipped.agents.a_ava,
                energyBudget: {
                  currentReserve: 100,
                  reserveBand: 'stable' as const,
                  exertionDebt: 0,
                  estimateConfidence: 'high' as const,
                },
              },
            },
          },
        },
      ],
      [
        'already_overdriven',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            agents: {
              ...equipped.agents,
              a_ava: {
                ...equipped.agents.a_ava,
                overdrive: { active: true, remainingPhases: 1, recoveryDebt: 2 },
              },
            },
          },
        },
      ],
      [
        'recovery_lockout',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            agents: {
              ...equipped.agents,
              a_ava: {
                ...equipped.agents.a_ava,
                overdrive: { active: false, remainingPhases: 0, recoveryDebt: 1 },
              },
            },
          },
        },
      ],
      [
        'stimulant_prohibited',
        {
          instanceId: instance.instanceId,
          state: {
            ...equipped,
            agents: {
              ...equipped.agents,
              a_ava: {
                ...equipped.agents.a_ava,
                vitals: {
                  ...equipped.agents.a_ava.vitals!,
                  statusFlags: [
                    ...(equipped.agents.a_ava.vitals?.statusFlags ?? []),
                    'stimulant-prohibited',
                  ],
                },
              },
            },
          },
        },
      ],
    ]

    for (const [code, variant] of variants) {
      const remainingBefore =
        variant.state.equipmentInstances?.[instance.instanceId]?.payload?.remaining
      const result = activateCombatStim(variant.state, variant.instanceId)
      expect(result).toMatchObject({ ok: false, code })
      expect(result.state.equipmentInstances?.[instance.instanceId]?.payload?.remaining).toBe(
        remainingBefore
      )
      expect(result.state.events).toHaveLength(baseEvents)
    }
  })

  it('expires after the tactical phase, applies two later debt ticks, and clears provenance', () => {
    const equipped = equipAndAssignCriticalStim()
    const instance = getEquipmentInstanceAtAgentSlot(equipped, 'a_ava', 'utility1')!
    const activated = activateCombatStim(equipped, instance.instanceId)
    if (!activated.ok) throw new Error(activated.code)

    const expiry = expireCombatStimOverdrivesAtWeekClose(activated.state)
    const expired = expiry.state
    expect(expired.agents.a_ava.overdrive).toMatchObject({ active: false, recoveryDebt: 2 })
    expect(expiry.eventDrafts.at(-1)?.type).toBe('equipment.combat_stim_overdrive_expired')

    const firstTick = applyCombatStimRecoveryDebtAtWeekClose(expired)
    expect(firstTick.agents.a_ava.overdrive).toMatchObject({ recoveryDebt: 1 })
    expect(firstTick.agents.a_ava.fatigueChannels).toMatchObject({
      physicalExhaustion: 6,
      mentalExhaustion: 6,
      combatStress: 2,
    })
    const secondTick = applyCombatStimRecoveryDebtAtWeekClose(firstTick)
    expect(secondTick.agents.a_ava.overdrive).toEqual({
      active: false,
      remainingPhases: 0,
      recoveryDebt: 0,
    })
    expect(secondTick.agents.a_ava.fatigueChannels).toMatchObject({
      physicalExhaustion: 12,
      mentalExhaustion: 12,
      combatStress: 4,
    })
  })

  it('atomically swaps a stored Combat Stim into an occupied instance-backed slot', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 2
    state.agents.a_ava.equipmentSlots = {}
    state.agents.a_ava.equipmentEffectScales = {}
    const first = instantiateEquipmentInstance(state, 'combat_stims')
    if (!first.ok) throw new Error(first.code)
    const second = instantiateEquipmentInstance(first.state, 'combat_stims')
    if (!second.ok) throw new Error(second.code)

    const equippedFirst = equipStoredCombatStimInstance(
      second.state,
      first.instance.instanceId,
      'a_ava',
      'utility1'
    )
    const swapped = equipStoredCombatStimInstance(
      equippedFirst,
      second.instance.instanceId,
      'a_ava',
      'utility1'
    )

    expect(swapped.equipmentInstances?.[first.instance.instanceId].location).toEqual({
      state: 'stored',
    })
    expect(swapped.equipmentInstances?.[second.instance.instanceId].location).toEqual({
      state: 'equipped',
      agentId: 'a_ava',
      slot: 'utility1',
    })
    expect(swapped.inventory.combat_stims).toBe(0)
  })

  it('round-trips partial and empty instances plus strict provenance without inventing legacy doses', () => {
    const equipped = equipAndAssignCriticalStim()
    const instance = getEquipmentInstanceAtAgentSlot(equipped, 'a_ava', 'utility1')!
    const activated = activateCombatStim(equipped, instance.instanceId)
    if (!activated.ok) throw new Error(activated.code)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(activated.state)))
    expect(hydrated.equipmentInstances?.[instance.instanceId].payload).toEqual({
      resourceId: 'combat_stim_dose',
      capacity: 2,
      remaining: 1,
    })
    expect(hydrated.agents.a_ava.overdrive?.source).toEqual(
      activated.state.agents.a_ava.overdrive?.source
    )

    const legacy = createStartingState()
    legacy.agents.a_mina.equipmentSlots = { utility1: 'combat_stims' }
    expect(hydrateGame(legacy).equipmentInstances).toEqual({})

    const malformedSemantic = hydrateGame({
      ...legacy,
      equipmentInstances: {
        'equipment-instance-legacy-stim': {
          instanceId: 'equipment-instance-legacy-stim',
          definitionId: 'combat_stims',
          condition: 'operational',
          location: { state: 'stored' },
          payload: { resourceId: 'combat_stim_dose', capacity: 3, remaining: 2 },
        },
      },
      agents: {
        ...legacy.agents,
        a_ava: {
          ...legacy.agents.a_ava,
          overdrive: {
            active: false,
            remainingPhases: 0,
            recoveryDebt: 1,
            source: {
              kind: 'combat_stim',
              activationId: '',
              equipmentInstanceId: 'equipment-instance-legacy-stim',
              caseId: 'case-legacy',
            },
          },
        },
      },
    })
    expect(
      malformedSemantic.equipmentInstances?.['equipment-instance-legacy-stim'].payload
    ).toEqual({ resourceId: 'combat_stim_dose', capacity: 3, remaining: 2 })
    expect(
      resolveCombatStimActivation(malformedSemantic, 'equipment-instance-legacy-stim')
    ).toMatchObject({ available: false, reasonCode: 'malformed_payload' })
    expect(malformedSemantic.agents.a_ava.overdrive?.source).toBeUndefined()
  })

  it('expires active Combat Stim overdrive through canonical week close and retains its event', () => {
    const state = createStartingState()
    const caseId = Object.keys(state.cases).sort()[0]
    state.agents.a_ava.overdrive = {
      active: true,
      remainingPhases: 1,
      recoveryDebt: 2,
      source: {
        kind: 'combat_stim',
        activationId: 'combat-stim-equipment-instance-1-1-dose-1',
        equipmentInstanceId: 'equipment-instance-1-1',
        caseId,
      },
    }

    const advanced = advanceWeek(state, 1_000)
    expect({
      overdrive: advanced.agents.a_ava.overdrive,
      expiryEvents: advanced.events.filter(
        (event) => event.type === 'equipment.combat_stim_overdrive_expired'
      ),
    }).toMatchObject({
      overdrive: { active: false, recoveryDebt: 2 },
      expiryEvents: [
        { type: 'equipment.combat_stim_overdrive_expired', payload: { week: state.week } },
      ],
    })
  })
})

describe('SPE-2844 Combat Stim stored-instance disposal', () => {
  function seedStoredStim(remaining: number, instanceId = 'equipment-instance-stored-stim') {
    const state = createStartingState()
    state.inventory.combat_stims = 0
    state.equipmentInstances = {
      [instanceId]: {
        instanceId,
        definitionId: 'combat_stims',
        condition: 'operational',
        location: { state: 'stored' },
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining },
      },
    }
    return state
  }

  it('disposes stored canonical instances at 2/2, 1/2, and 0/2 without changing aggregate stock', () => {
    for (const remaining of [2, 1, 0] as const) {
      const state = seedStoredStim(remaining, `equipment-instance-stored-${remaining}`)
      const disposed = destroyStoredCombatStimInstance(state, `equipment-instance-stored-${remaining}`)
      expect(disposed.ok).toBe(true)
      if (!disposed.ok) throw new Error('expected disposal success')
      expect(disposed.state.inventory.combat_stims).toBe(0)
      expect(disposed.state.equipmentInstances).toEqual({})
      expect(disposed.instance.payload).toEqual({
        resourceId: 'combat_stim_dose',
        capacity: 2,
        remaining,
      })
    }
  })

  it('fails closed for equipped, missing, malformed, recovery-claimed, and overdrive-provenance instances', () => {
    const stored = seedStoredStim(1)
    const equipped = equipStoredCombatStimInstance(stored, 'equipment-instance-stored-stim', 'a_ava', 'utility1')
    expect(destroyStoredCombatStimInstance(equipped, 'equipment-instance-stored-stim')).toMatchObject({
      ok: false,
      code: 'not_stored',
    })

    expect(destroyStoredCombatStimInstance(stored, 'missing')).toMatchObject({
      ok: false,
      code: 'unknown_instance',
    })

    const malformed = {
      ...stored,
      equipmentInstances: {
        'equipment-instance-malformed': {
          instanceId: 'equipment-instance-malformed',
          definitionId: 'combat_stims',
          condition: 'operational' as const,
          location: { state: 'stored' as const },
          payload: { resourceId: 'combat_stim_dose', capacity: 3, remaining: 2 },
        },
      },
    }
    expect(destroyStoredCombatStimInstance(malformed, 'equipment-instance-malformed')).toMatchObject({
      ok: false,
      code: 'malformed_payload',
    })

    const depleted = seedStoredStim(0, 'equipment-instance-depleted-stim')
    const queuedDepleted = queueEquipmentDeconstruction(depleted, 'combat_stims', {
      kind: 'equipment_instance',
      instanceId: 'equipment-instance-depleted-stim',
    })
    expect(queuedDepleted.equipmentDeconstructionQueue).toHaveLength(1)
    const conflicting = {
      ...queuedDepleted,
      equipmentInstances: {
        ...(queuedDepleted.equipmentInstances ?? {}),
        'equipment-instance-depleted-stim': depleted.equipmentInstances!['equipment-instance-depleted-stim'],
      },
    }
    expect(
      destroyStoredCombatStimInstance(conflicting, 'equipment-instance-depleted-stim')
    ).toMatchObject({
      ok: false,
      code: 'recovery_claimed',
    })

    const overdrive = {
      ...stored,
      agents: {
        ...stored.agents,
        a_ava: {
          ...stored.agents.a_ava,
          overdrive: {
            active: false,
            remainingPhases: 0,
            recoveryDebt: 1,
            source: {
              kind: 'combat_stim' as const,
              activationId: 'combat-stim-equipment-instance-stored-stim-dose-1',
              equipmentInstanceId: 'equipment-instance-stored-stim',
              caseId: 'case-1',
            },
          },
        },
      },
    }
    expect(destroyStoredCombatStimInstance(overdrive, 'equipment-instance-stored-stim')).toMatchObject({
      ok: false,
      code: 'overdrive_provenance',
    })
  })

  it('is idempotent on stale replay and round-trips strict disposal events without recreating identity', () => {
    const state = seedStoredStim(2, 'equipment-instance-dispose-a')
    state.equipmentInstances!['equipment-instance-dispose-b'] = {
      instanceId: 'equipment-instance-dispose-b',
      definitionId: 'combat_stims',
      condition: 'operational',
      location: { state: 'stored' },
      payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
    }
    const disposed = destroyStoredCombatStimInstance(state, 'equipment-instance-dispose-a')
    if (!disposed.ok) throw new Error('expected disposal success')
    expect(destroyStoredCombatStimInstance(disposed.state, 'equipment-instance-dispose-a')).toMatchObject({
      ok: false,
      code: 'unknown_instance',
    })
    expect(Object.keys(disposed.state.equipmentInstances ?? {})).toEqual(['equipment-instance-dispose-b'])

    const withEvent = appendOperationEventDrafts(disposed.state, [
      createCombatStimDisposedDraft({
        week: disposed.state.week,
        instanceId: 'equipment-instance-dispose-a',
        definitionId: 'combat_stims',
        definitionName: 'Combat Stims',
        condition: 'operational',
        resourceId: 'combat_stim_dose',
        capacity: 2,
        remaining: 2,
        reason: 'manual_disposal',
      }),
    ])
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(withEvent)))
    expect(hydrated.equipmentInstances).not.toHaveProperty('equipment-instance-dispose-a')
    expect(
      hydrated.events.filter((event) => event.type === 'equipment.combat_stim_disposed')
    ).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({ instanceId: 'equipment-instance-dispose-a', remaining: 2 }),
      }),
    ])
  })

  it('projects stable stored-instance disposal views in code-unit order', () => {
    const state = seedStoredStim(1, 'equipment-instance-b')
    state.equipmentInstances!['equipment-instance-a'] = {
      instanceId: 'equipment-instance-a',
      definitionId: 'combat_stims',
      condition: 'operational',
      location: { state: 'stored' },
      payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 2 },
    }
    expect(getCombatStimStoredInstanceDisposalViews(state).map((view) => view.instanceId)).toEqual([
      'equipment-instance-a',
      'equipment-instance-b',
    ])
    expect(resolveCombatStimDisposal(state, 'equipment-instance-a')).toMatchObject({
      canDispose: true,
      doseLabel: '2/2 doses',
    })
  })
})
