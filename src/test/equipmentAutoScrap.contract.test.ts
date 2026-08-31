import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY,
  applyEquipmentAutoScrapAtWeekClose,
  disableEquipmentAutoScrapPolicy,
  enableEquipmentAutoScrapPolicy,
  resolveEquipmentAutoScrapGradeDecision,
  resolveEquipmentAutoScrapPreview,
  validateEquipmentAutoScrapPolicy,
} from '../domain/equipmentAutoScrap'
import { queueEquipmentDeconstruction } from '../domain/sim/equipmentDeconstruction'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { queueFabrication } from '../domain/sim/production'
import { GAME_STORE_VERSION, migratePersistedStore } from '../app/store/runTransfer'
import { getEquipmentDefinition } from '../domain/equipment'

describe('equipment Auto-Scrap contract', () => {
  it('strictly validates canonical policy shapes and fails malformed values closed', () => {
    expect(validateEquipmentAutoScrapPolicy({ state: 'disabled' })).toEqual({
      valid: true,
      value: DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY,
    })
    expect(
      validateEquipmentAutoScrapPolicy({ state: 'enabled', thresholdGradeId: 'grade_3' })
    ).toMatchObject({
      valid: true,
      value: { state: 'enabled', thresholdGradeId: 'grade_3' },
    })
    for (const malformed of [
      undefined,
      { state: 'enabled' },
      { state: 'enabled', thresholdGradeId: 'Grade III' },
      { state: 'disabled', thresholdGradeId: 'grade_1' },
      { state: 'enabled', thresholdGradeId: 'grade_1', label: 'Grade I' },
    ]) {
      expect(validateEquipmentAutoScrapPolicy(malformed)).toEqual({
        valid: false,
        value: DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY,
      })
    }
  })

  it('uses canonical ordering and projects hidden Grade I and Grade V identically', () => {
    const gradeIds = ['grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5'] as const
    for (const [gradeIndex, gradeId] of gradeIds.entries()) {
      for (const [thresholdIndex, thresholdGradeId] of gradeIds.entries()) {
        expect(
          resolveEquipmentAutoScrapGradeDecision(
            { state: 'graded', gradeId },
            'known',
            thresholdGradeId
          ).decision
        ).toBe(gradeIndex <= thresholdIndex ? 'include' : 'exclude')
      }
    }

    expect(
      resolveEquipmentAutoScrapGradeDecision(
        { state: 'graded', gradeId: 'grade_1' },
        'known',
        'grade_2'
      )
    ).toMatchObject({
      decision: 'include',
      reasonCode: 'auto_scrap.eligible_at_or_below_threshold',
    })
    expect(
      resolveEquipmentAutoScrapGradeDecision(
        { state: 'graded', gradeId: 'grade_3' },
        'known',
        'grade_2'
      )
    ).toMatchObject({ decision: 'exclude', reasonCode: 'auto_scrap.grade_above_threshold' })

    const hidden1 = resolveEquipmentAutoScrapGradeDecision(
      { state: 'graded', gradeId: 'grade_1' },
      'hidden',
      'grade_3'
    )
    const hidden5 = resolveEquipmentAutoScrapGradeDecision(
      { state: 'graded', gradeId: 'grade_5' },
      'hidden',
      'grade_3'
    )
    expect(hidden1).toEqual(hidden5)
    expect(JSON.stringify(hidden1)).not.toMatch(/grade_[15]|Grade [IVX]|"rank"/)
    expect(
      resolveEquipmentAutoScrapGradeDecision({ state: 'ungraded' }, 'known', 'grade_5')
    ).toMatchObject({ decision: 'exclude', reasonCode: 'auto_scrap.grade_unavailable' })
  })

  it('previews aggregate stock in item-ID order with exact threshold and recovery reasons', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.inventory.signal_jammers = 1
    state.inventory.anomaly_scanner = 3
    state.fabricatedEquipmentLots = {
      fabricated: {
        queueId: 'fabricated',
        recipeId: 'ward-seals',
        itemId: 'ward_seals',
        quantity: 1,
        gradeId: 'grade_1',
        completedWeek: 1,
      },
    }

    const preview = resolveEquipmentAutoScrapPreview(state, 'grade_1')
    expect(preview.entries.map((entry) => entry.itemId)).toEqual([
      'anomaly_scanner',
      'signal_jammers',
      'ward_seals',
    ])
    expect(preview.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'anomaly_scanner',
          decision: 'exclude',
          reasonCodes: ['auto_scrap.recovery_profile_unavailable'],
        }),
        expect.objectContaining({
          itemId: 'signal_jammers',
          decision: 'exclude',
          reasonCodes: ['auto_scrap.grade_above_threshold'],
        }),
        expect.objectContaining({
          itemId: 'ward_seals',
          decision: 'exclude',
          reasonCodes: ['auto_scrap.fabricated_lot_selection_unavailable'],
        }),
      ])
    )
    expect(preview).toMatchObject({ includedQuantity: 0, excludedQuantity: 6 })
  })

  it('routes newly eligible technological stock at or below threshold in item-ID order', () => {
    const state = createStartingState()
    state.inventory.tactical_radio = 1
    state.inventory.environmental_sampler = 1
    state.inventory.advanced_recon_suite = 1
    state.inventory.anomaly_scanner = 1

    const preview = resolveEquipmentAutoScrapPreview(state, 'grade_2')
    expect(
      preview.entries.map((entry) => ({
        itemId: entry.itemId,
        decision: entry.decision,
        reasonCodes: entry.reasonCodes,
      }))
    ).toEqual([
      {
        itemId: 'advanced_recon_suite',
        decision: 'exclude',
        reasonCodes: ['auto_scrap.grade_above_threshold'],
      },
      {
        itemId: 'anomaly_scanner',
        decision: 'exclude',
        reasonCodes: ['auto_scrap.recovery_profile_unavailable'],
      },
      {
        itemId: 'environmental_sampler',
        decision: 'include',
        reasonCodes: ['auto_scrap.eligible_at_or_below_threshold'],
      },
      {
        itemId: 'tactical_radio',
        decision: 'include',
        reasonCodes: ['auto_scrap.eligible_at_or_below_threshold'],
      },
    ])

    const routed = applyEquipmentAutoScrapAtWeekClose(
      enableEquipmentAutoScrapPolicy(state, 'grade_2')
    )
    expect(routed.equipmentDeconstructionQueue?.map((entry) => entry.itemId)).toEqual([
      'environmental_sampler',
      'tactical_radio',
    ])
    expect(routed.inventory).toMatchObject({
      advanced_recon_suite: 1,
      anomaly_scanner: 1,
      environmental_sampler: 0,
      tactical_radio: 0,
    })
  })

  it('routes Grade I Trauma Kit while requiring manual Combat Stim instance selection', () => {
    const state = createStartingState()
    state.inventory.trauma_kit = 1
    state.inventory.combat_stims = 1

    const preview = resolveEquipmentAutoScrapPreview(state, 'grade_1')
    expect(
      preview.entries.map((entry) => ({
        itemId: entry.itemId,
        decision: entry.decision,
        reasonCodes: entry.reasonCodes,
      }))
    ).toEqual([
      {
        itemId: 'combat_stims',
        decision: 'exclude',
        reasonCodes: ['auto_scrap.equipment_instance_selection_unavailable'],
      },
      {
        itemId: 'trauma_kit',
        decision: 'include',
        reasonCodes: ['auto_scrap.eligible_at_or_below_threshold'],
      },
    ])

    const routed = applyEquipmentAutoScrapAtWeekClose(
      enableEquipmentAutoScrapPolicy(state, 'grade_1')
    )
    expect(routed.inventory).toMatchObject({ combat_stims: 1, trauma_kit: 0 })
    expect(routed.equipmentDeconstructionQueue?.map((entry) => entry.itemId)).toEqual([
      'trauma_kit',
    ])
  })

  it('routes only aggregate stock when an ordinary stored instance also exists', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.equipmentInstances = {
      'equipment-instance-ordinary': {
        instanceId: 'equipment-instance-ordinary',
        definitionId: 'signal_jammers',
        location: { state: 'stored' },
        condition: 'operational',
      },
    }

    const routed = applyEquipmentAutoScrapAtWeekClose(
      enableEquipmentAutoScrapPolicy(state, 'grade_2')
    )

    expect(routed.inventory.signal_jammers).toBe(0)
    expect(routed.equipmentInstances).toEqual(state.equipmentInstances)
    expect(routed.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'signal_jammers',
    })
    expect(routed.equipmentDeconstructionQueue?.[0]).not.toHaveProperty('sourceEquipmentInstanceId')
  })

  it('keeps grade decisions independent from recovery condition and non-grade stock axes', () => {
    const operational = createStartingState()
    operational.inventory.medkits = 1
    operational.inventory.ward_seals = 1
    operational.inventory.signal_jammers = 1
    operational.market.featuredRecipeId = 'ritual-components'

    const damaged = structuredClone(operational)
    damaged.damagedEquipmentQueue = ['medkits', 'ward_seals', 'signal_jammers']
    damaged.market.featuredRecipeId = 'silver-rounds'

    const decisionSummary = (state: typeof operational) =>
      resolveEquipmentAutoScrapPreview(state, 'grade_2').entries.map((entry) => ({
        itemId: entry.itemId,
        decision: entry.decision,
        gradeProjection: entry.gradeProjection,
        reasonCodes: entry.reasonCodes,
      }))

    expect(
      ['medkits', 'ward_seals', 'signal_jammers'].map(
        (itemId) => getEquipmentDefinition(itemId)?.gradeProfile.origin
      )
    ).toEqual(['ordinary', 'magical', 'technological'])
    expect(decisionSummary(operational).every((entry) => entry.decision === 'include')).toBe(true)
    expect(decisionSummary(damaged)).toEqual(decisionSummary(operational))
  })

  it('routes every initially safe stock copy through canonical queues and emits bounded telemetry', () => {
    const state = createStartingState()
    state.inventory.medkits = 2
    state.inventory.signal_jammers = 1
    state.inventory.warding_kits = 1
    const enabled = enableEquipmentAutoScrapPolicy(state, 'grade_2')
    const routed = applyEquipmentAutoScrapAtWeekClose(enabled)

    expect(routed.inventory).toMatchObject({ medkits: 0, signal_jammers: 0, warding_kits: 0 })
    expect(routed.equipmentDeconstructionQueue?.map((entry) => entry.itemId)).toEqual([
      'medkits',
      'medkits',
      'signal_jammers',
      'warding_kits',
    ])
    expect(
      routed.events.filter((event) => event.type === 'equipment.recovery_started')
    ).toHaveLength(4)
    expect(routed.events.at(-1)).toMatchObject({
      type: 'equipment.auto_scrap_routed',
      payload: {
        thresholdGradeId: 'grade_2',
        routedQuantity: 4,
        includedItemCount: 3,
      },
    })
    expect(applyEquipmentAutoScrapAtWeekClose(routed)).toBe(routed)
  })

  it('does not emit a policy-change event when the enabled threshold is unchanged', () => {
    const enabled = enableEquipmentAutoScrapPolicy(createStartingState(), 'grade_2')

    expect(enableEquipmentAutoScrapPolicy(enabled, 'grade_2')).toBe(enabled)
    expect(
      enabled.events.filter((event) => event.type === 'equipment.auto_scrap_policy_changed')
    ).toHaveLength(1)
  })

  it('protects equipped, active-process, and fabricated-lot copies through existing authorities', () => {
    const state = createStartingState()
    state.agents.a_mina.equipmentSlots = {
      ...state.agents.a_mina.equipmentSlots,
      utility1: 'signal_jammers',
    }
    state.inventory.signal_jammers = 1
    const withActiveProcess = queueEquipmentDeconstruction(state, 'signal_jammers')
    withActiveProcess.inventory.signal_jammers = 1
    withActiveProcess.fabricatedEquipmentLots = {
      lot: {
        queueId: 'lot',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const enabled = enableEquipmentAutoScrapPolicy(withActiveProcess, 'grade_2')
    const routed = applyEquipmentAutoScrapAtWeekClose(enabled)

    expect(routed.agents.a_mina.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(routed.inventory.signal_jammers).toBe(1)
    expect(routed.equipmentDeconstructionQueue).toEqual(
      withActiveProcess.equipmentDeconstructionQueue
    )
    expect(routed.events.at(-1)).toMatchObject({
      type: 'equipment.auto_scrap_routed',
      payload: {
        routedQuantity: 0,
        exclusionReasonCounts: [
          { reasonCode: 'auto_scrap.fabricated_lot_selection_unavailable', count: 1 },
        ],
      },
    })
  })

  it('unblocks catalog Auto-Scrap only after every fabricated-lot unit is explicitly claimed', () => {
    const state = createStartingState()
    state.inventory.ward_seals = 2
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'ward-seals',
        itemId: 'ward_seals',
        quantity: 1,
        gradeId: 'grade_1',
        completedWeek: 1,
      },
    }

    expect(resolveEquipmentAutoScrapPreview(state, 'grade_1').entries[0]).toMatchObject({
      itemId: 'ward_seals',
      decision: 'exclude',
      quantity: 2,
      reasonCodes: ['auto_scrap.fabricated_lot_selection_unavailable'],
    })

    const claimed = queueEquipmentDeconstruction(state, 'ward_seals', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    expect(resolveEquipmentAutoScrapPreview(claimed, 'grade_1').entries[0]).toMatchObject({
      itemId: 'ward_seals',
      decision: 'include',
      quantity: 1,
      reasonCodes: ['auto_scrap.eligible_at_or_below_threshold'],
    })
  })

  it('disables future routing without cancelling canonical work already queued', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    const queued = queueEquipmentDeconstruction(state, 'medkits')
    queued.inventory.signal_jammers = 1
    queued.equipmentAutoScrapPolicy = { state: 'enabled', thresholdGradeId: 'grade_2' }
    const disabled = disableEquipmentAutoScrapPolicy(queued)
    const unchanged = applyEquipmentAutoScrapAtWeekClose(disabled)

    expect(unchanged.equipmentAutoScrapPolicy).toEqual({ state: 'disabled' })
    expect(unchanged.inventory.signal_jammers).toBe(1)
    expect(unchanged.equipmentDeconstructionQueue).toEqual(queued.equipmentDeconstructionQueue)
    expect(unchanged.events.at(-1)).toMatchObject({
      type: 'equipment.auto_scrap_policy_changed',
      payload: { action: 'disabled', thresholdGradeId: 'grade_2' },
    })
  })

  it('round-trips valid policies and events while malformed policies hydrate disabled', () => {
    const fallback = createStartingState()
    const enabled = enableEquipmentAutoScrapPolicy(fallback, 'grade_4')
    const hydrated = migratePersistedStore({ game: enabled }, GAME_STORE_VERSION, fallback).game
    expect(hydrated.equipmentAutoScrapPolicy).toEqual({
      state: 'enabled',
      thresholdGradeId: 'grade_4',
    })
    expect(hydrated.events.at(-1)).toMatchObject({
      type: 'equipment.auto_scrap_policy_changed',
      payload: { action: 'enabled', thresholdGradeId: 'grade_4' },
    })

    const malformed = migratePersistedStore(
      {
        game: {
          ...fallback,
          equipmentAutoScrapPolicy: { state: 'enabled', thresholdGradeId: 'Grade IV' },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(malformed.equipmentAutoScrapPolicy).toEqual({ state: 'disabled' })
  })

  it('protects newly completed fabricated lots before Auto-Scrap evaluates the week', () => {
    const state = queueFabrication(createStartingState(), 'emf-sensors')
    state.productionQueue = state.productionQueue.map((entry) => ({
      ...entry,
      remainingWeeks: 1,
    }))
    state.equipmentAutoScrapPolicy = { state: 'enabled', thresholdGradeId: 'grade_5' }
    const advanced = advanceWeek(state)

    expect(advanced.inventory.emf_sensors).toBe(1)
    expect(Object.values(advanced.fabricatedEquipmentLots ?? {})).toEqual([
      expect.objectContaining({ itemId: 'emf_sensors', gradeId: 'grade_2' }),
    ])
    expect(
      advanced.equipmentDeconstructionQueue?.some((entry) => entry.itemId === 'emf_sensors')
    ).toBe(false)
    expect(advanced.events).toContainEqual(
      expect.objectContaining({
        type: 'equipment.auto_scrap_routed',
        payload: expect.objectContaining({
          exclusionReasonCounts: expect.arrayContaining([
            {
              reasonCode: 'auto_scrap.fabricated_lot_selection_unavailable',
              count: 1,
            },
          ]),
        }),
      })
    )
  })

  it('advances new canonical recovery jobs normally in the same week-close phase', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    state.equipmentAutoScrapPolicy = { state: 'enabled', thresholdGradeId: 'grade_1' }
    const beforeMaterials = state.inventory.medical_supplies
    const advanced = advanceWeek(state)

    expect(advanced.inventory.medkits).toBe(0)
    expect(advanced.inventory.medical_supplies).toBe(beforeMaterials + 1)
    expect(advanced.equipmentDeconstructionQueue).toEqual([])
    expect(Object.values(advanced.equipmentRecoveryOutcomes ?? {})).toHaveLength(1)
    expect(advanced.events.some((event) => event.type === 'equipment.auto_scrap_routed')).toBe(true)
  })
})
