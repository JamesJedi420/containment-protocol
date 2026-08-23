import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_DECONSTRUCTION_PROFILES,
  getEquipmentDeconstructionProfile,
  validateEquipmentDeconstructionProfiles,
} from '../data/equipmentDeconstruction'
import { createStartingState } from '../data/startingState'
import { getEquipmentCatalogEntries } from '../domain/equipment'
import {
  resolveEquipmentGradeRecoveryOutcome,
  validateEquipmentGradeRecoveryRule,
} from '../domain/equipmentGradeRecovery'
import {
  advanceEquipmentDeconstructionQueues,
  queueEquipmentDeconstruction,
  resolveEquipmentDeconstructionPreview,
  resolveEquipmentDeconstructionSources,
} from '../domain/sim/equipmentDeconstruction'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { GAME_STORE_VERSION, migratePersistedStore } from '../app/store/runTransfer'
import { createMinimalOperationEvent } from './fixtures/minimalOperationEventPayloads'

const yieldRule = {
  kind: 'yield_threshold' as const,
  pathId: 'component_reclamation' as const,
  baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
  baseWaste: 2,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2' as const,
  bonusMaterialId: 'electronic_parts',
  bonusQuantity: 1,
  wasteReduction: 1,
}

const medicalYieldRule = {
  ...yieldRule,
  baseMaterials: [{ materialId: 'medical_supplies', quantity: 1 }],
  baseWaste: 1,
  bonusMaterialId: 'medical_supplies',
}

const handlingRule = {
  kind: 'handling_threshold' as const,
  pathId: 'ritual_disassembly' as const,
  baseMaterials: [{ materialId: 'occult_reagents', quantity: 1 }],
  baseWaste: 1,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2' as const,
  additionalDurationWeeks: 1,
}

const technologicalProfileIds = [
  'environmental_sampler',
  'encrypted_field_tablet',
  'advanced_recon_suite',
  'signal_intercept_kit',
  'analysis_goggles',
  'tactical_radio',
  'breach_visor',
] as const

describe('equipment-grade recovery contract', () => {
  it('strictly validates rule kinds and stable malformed-rule issues', () => {
    expect(validateEquipmentGradeRecoveryRule(yieldRule)).toMatchObject({ valid: true })
    expect(validateEquipmentGradeRecoveryRule(handlingRule)).toMatchObject({ valid: true })
    expect(
      validateEquipmentGradeRecoveryRule({
        kind: 'grade_neutral',
        pathId: 'component_reclamation',
        baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
        baseWaste: 0,
        baseDurationWeeks: 1,
      })
    ).toMatchObject({ valid: true })
    expect(
      validateEquipmentGradeRecoveryRule({
        ...yieldRule,
        thresholdGradeId: 'Grade II',
        label: 'High quality',
      })
    ).toEqual({
      valid: false,
      issues: [
        { code: 'unexpected_field', field: 'label' },
        { code: 'invalid_grade_id', field: 'thresholdGradeId' },
      ],
    })
  })

  it('explicitly covers the catalog and authors both recovery paths', () => {
    const catalog = getEquipmentCatalogEntries()
    expect(() =>
      validateEquipmentDeconstructionProfiles(
        EQUIPMENT_DECONSTRUCTION_PROFILES,
        catalog.map((definition) => ({
          id: definition.id,
          origin: definition.gradeProfile.origin,
        }))
      )
    ).not.toThrow()
    expect(EQUIPMENT_DECONSTRUCTION_PROFILES.map((profile) => profile.itemId).sort()).toEqual(
      getEquipmentCatalogEntries()
        .map((definition) => definition.id)
        .sort()
    )
    expect(getEquipmentDeconstructionProfile('signal_jammers')).toMatchObject({
      state: 'eligible',
      rule: { pathId: 'component_reclamation' },
    })
    expect(getEquipmentDeconstructionProfile('warding_kits')).toMatchObject({
      state: 'eligible',
      rule: { pathId: 'ritual_disassembly' },
    })
    expect(
      ['medkits', 'ward_seals', 'signal_jammers'].map(
        (itemId) => catalog.find((definition) => definition.id === itemId)?.gradeProfile.origin
      )
    ).toEqual(['ordinary', 'magical', 'technological'])

    expect(
      EQUIPMENT_DECONSTRUCTION_PROFILES.filter((profile) => profile.state === 'eligible')
    ).toHaveLength(16)
    expect(
      EQUIPMENT_DECONSTRUCTION_PROFILES.filter((profile) => profile.state === 'deferred').map(
        (profile) => profile.itemId
      )
    ).toEqual([
      'diplomatic_kit',
      'anomaly_scanner',
      'spectral_em_array',
      'occult_detection_array',
      'field_plate',
      'containment_staff',
      'hazmat_suit',
    ])
    for (const itemId of technologicalProfileIds) {
      expect(getEquipmentDeconstructionProfile(itemId)).toEqual({
        state: 'eligible',
        itemId,
        rule: yieldRule,
        sourceAuthority: 'aggregate_and_instance',
      })
    }
    expect(getEquipmentDeconstructionProfile('trauma_kit')).toEqual({
      state: 'eligible',
      itemId: 'trauma_kit',
      rule: medicalYieldRule,
      sourceAuthority: 'aggregate_and_instance',
    })
    expect(getEquipmentDeconstructionProfile('combat_stims')).toEqual({
      state: 'eligible',
      itemId: 'combat_stims',
      rule: medicalYieldRule,
      sourceAuthority: 'equipment_instance',
    })
    expect(() =>
      validateEquipmentDeconstructionProfiles(
        EQUIPMENT_DECONSTRUCTION_PROFILES.map((profile) =>
          profile.itemId === 'medkits' && profile.state === 'eligible'
            ? { ...profile, sourceAuthority: 'equipment_instance' as const }
            : profile
        ),
        catalog.map((definition) => ({
          id: definition.id,
          origin: definition.gradeProfile.origin,
        }))
      )
    ).toThrow('Unsupported equipment instance recovery profile: medkits')
  })

  it('recovers only an explicitly selected stored depleted Combat Stim instance', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 1
    state.equipmentInstances = {
      'equipment-instance-empty': {
        instanceId: 'equipment-instance-empty',
        definitionId: 'combat_stims',
        location: { state: 'stored' as const },
        condition: 'operational' as const,
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
    }

    expect(resolveEquipmentDeconstructionSources(state, 'combat_stims')).toMatchObject([
      {
        source: { kind: 'catalog' },
        available: false,
        issueCode: 'equipment_instance_required',
      },
      {
        source: { kind: 'equipment_instance', instanceId: 'equipment-instance-empty' },
        quantity: 1,
        available: true,
        condition: 'operational',
        resourceRemaining: 0,
        resourceCapacity: 2,
      },
    ])
    expect(queueEquipmentDeconstruction(state, 'combat_stims')).toBe(state)
    state.fabricatedEquipmentLots = {
      'combat-stim-batch': {
        queueId: 'combat-stim-batch',
        recipeId: 'combat-stims',
        itemId: 'combat_stims',
        quantity: 1,
        gradeId: 'grade_1',
        completedWeek: 1,
      },
    }
    expect(resolveEquipmentDeconstructionSources(state, 'combat_stims')).toContainEqual(
      expect.objectContaining({
        source: { kind: 'fabricated_lot', fabricationQueueId: 'combat-stim-batch' },
        available: false,
        issueCode: 'equipment_instance_required',
      })
    )

    const queued = queueEquipmentDeconstruction(state, 'combat_stims', {
      kind: 'equipment_instance',
      instanceId: 'equipment-instance-empty',
    })
    expect(queued.inventory.combat_stims).toBe(1)
    expect(queued.equipmentInstances).toEqual({})
    expect(queued.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'combat_stims',
      sourceGradeId: 'grade_1',
      sourceCondition: 'operational',
      sourceEquipmentInstanceId: 'equipment-instance-empty',
      sourceEquipmentInstanceResourceId: 'combat_stim_dose',
      sourceEquipmentInstanceCapacity: 2,
      sourceEquipmentInstanceRemaining: 0,
      outputMaterials: [
        { materialId: 'medical_supplies', materialName: 'Medical Supplies', quantity: 1 },
      ],
      wasteQuantity: 1,
      durationWeeks: 1,
    })
    expect(queued.events.at(-1)).toMatchObject({
      type: 'equipment.recovery_started',
      payload: {
        sourceEquipmentInstanceId: 'equipment-instance-empty',
        sourceEquipmentInstanceResourceId: 'combat_stim_dose',
        sourceEquipmentInstanceCapacity: 2,
        sourceEquipmentInstanceRemaining: 0,
      },
    })

    const completed = advanceEquipmentDeconstructionQueues(queued)
    const queueId = queued.equipmentDeconstructionQueue![0]!.id
    expect(completed.state.equipmentRecoveryOutcomes?.[queueId]).toMatchObject({
      sourceEquipmentInstanceId: 'equipment-instance-empty',
      sourceEquipmentInstanceResourceId: 'combat_stim_dose',
      sourceEquipmentInstanceCapacity: 2,
      sourceEquipmentInstanceRemaining: 0,
    })
    expect(completed.eventDrafts[0]).toMatchObject({
      type: 'equipment.recovery_completed',
      payload: { sourceEquipmentInstanceId: 'equipment-instance-empty' },
    })
  })

  it('recovers an exact stored ordinary instance alongside catalog and fabricated sources', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2
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
      'equipment-instance-ordinary': {
        instanceId: 'equipment-instance-ordinary',
        definitionId: 'signal_jammers',
        location: { state: 'stored' },
        condition: 'damaged',
      },
      'equipment-instance-other': {
        instanceId: 'equipment-instance-other',
        definitionId: 'signal_jammers',
        location: { state: 'stored' },
        condition: 'operational',
      },
    }

    expect(resolveEquipmentDeconstructionSources(state, 'signal_jammers')).toMatchObject([
      { source: { kind: 'catalog' }, quantity: 1, available: true },
      {
        source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' },
        quantity: 1,
        available: true,
      },
      {
        source: { kind: 'equipment_instance', instanceId: 'equipment-instance-ordinary' },
        label: 'Equipment instance equipment-instance-ordinary',
        quantity: 1,
        available: true,
        condition: 'damaged',
      },
      {
        source: { kind: 'equipment_instance', instanceId: 'equipment-instance-other' },
        quantity: 1,
        available: true,
      },
    ])

    const queued = queueEquipmentDeconstruction(state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: 'equipment-instance-ordinary',
    })
    expect(queued.inventory.signal_jammers).toBe(2)
    expect(queued.damagedEquipmentQueue).toEqual(['signal_jammers'])
    expect(queued.fabricatedEquipmentLots).toEqual(state.fabricatedEquipmentLots)
    expect(queued.equipmentInstances).toEqual({
      'equipment-instance-other': state.equipmentInstances['equipment-instance-other'],
    })
    expect(queued.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'signal_jammers',
      sourceGradeId: 'grade_2',
      sourceCondition: 'damaged',
      sourceEquipmentInstanceId: 'equipment-instance-ordinary',
    })
    expect(queued.equipmentDeconstructionQueue?.[0]).not.toHaveProperty(
      'sourceEquipmentInstanceResourceId'
    )
    expect(queued.events.at(-1)).toMatchObject({
      type: 'equipment.recovery_started',
      payload: { sourceEquipmentInstanceId: 'equipment-instance-ordinary' },
    })

    const completed = advanceEquipmentDeconstructionQueues(queued)
    const queueId = queued.equipmentDeconstructionQueue![0]!.id
    expect(completed.state.equipmentRecoveryOutcomes?.[queueId]).toMatchObject({
      itemId: 'signal_jammers',
      sourceEquipmentInstanceId: 'equipment-instance-ordinary',
      sourceCondition: 'damaged',
    })
    expect(advanceEquipmentDeconstructionQueues(completed.state).completed).toEqual([])
  })

  it('fails ordinary instance recovery closed for invalid location, payload, identity, and claims', () => {
    const state = createStartingState()
    state.equipmentInstances = {
      'equipment-instance-equipped': {
        instanceId: 'equipment-instance-equipped',
        definitionId: 'signal_jammers',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
        condition: 'operational',
      },
      'equipment-instance-payload': {
        instanceId: 'equipment-instance-payload',
        definitionId: 'signal_jammers',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'unsupported_charge', capacity: 2, remaining: 1 },
      },
      'equipment-instance-foreign': {
        instanceId: 'equipment-instance-foreign',
        definitionId: 'medkits',
        location: { state: 'stored' },
        condition: 'operational',
      },
      constructor: {
        instanceId: 'constructor',
        definitionId: 'signal_jammers',
        location: { state: 'stored' as const },
        condition: 'operational' as const,
      },
    }

    const issues = Object.fromEntries(
      resolveEquipmentDeconstructionSources(state, 'signal_jammers')
        .filter((choice) => choice.source.kind === 'equipment_instance')
        .map((choice) => [
          choice.source.kind === 'equipment_instance' ? choice.source.instanceId : '',
          choice.issueCode,
        ])
    )
    expect(issues).toMatchObject({
      'equipment-instance-equipped': 'equipment_instance_not_stored',
      'equipment-instance-payload': 'equipment_instance_payload_unsupported',
      constructor: 'equipment_instance_not_found',
    })
    expect(
      queueEquipmentDeconstruction(state, 'signal_jammers', {
        kind: 'equipment_instance',
        instanceId: 'equipment-instance-foreign',
      })
    ).toBe(state)
    expect(
      queueEquipmentDeconstruction(state, 'signal_jammers', {
        kind: 'equipment_instance',
        instanceId: 'equipment-instance-missing',
      })
    ).toBe(state)

    const deferred = {
      ...state,
      equipmentInstances: {
        'equipment-instance-deferred': {
          instanceId: 'equipment-instance-deferred',
          definitionId: 'diplomatic_kit',
          location: { state: 'stored' as const },
          condition: 'operational' as const,
        },
      },
    }
    expect(
      queueEquipmentDeconstruction(deferred, 'diplomatic_kit', {
        kind: 'equipment_instance',
        instanceId: 'equipment-instance-deferred',
      })
    ).toBe(deferred)

    const claimable = {
      ...state,
      equipmentInstances: {
        'equipment-instance-claimed': {
          instanceId: 'equipment-instance-claimed',
          definitionId: 'signal_jammers',
          location: { state: 'stored' as const },
          condition: 'operational' as const,
        },
      },
    }
    const claimed = queueEquipmentDeconstruction(claimable, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: 'equipment-instance-claimed',
    })
    const duplicateLiveState = {
      ...claimed,
      equipmentInstances: claimable.equipmentInstances,
    }
    expect(
      resolveEquipmentDeconstructionSources(duplicateLiveState, 'signal_jammers')
    ).toContainEqual(
      expect.objectContaining({
        source: { kind: 'equipment_instance', instanceId: 'equipment-instance-claimed' },
        issueCode: 'equipment_instance_already_claimed',
        available: false,
      })
    )
  })

  it('fails Combat Stim recovery closed for live doses, equipped units, malformed payloads, and debt', () => {
    const state = createStartingState()
    state.equipmentInstances = {
      'equipment-instance-full': {
        instanceId: 'equipment-instance-full',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 2 },
      },
      'equipment-instance-partial': {
        instanceId: 'equipment-instance-partial',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 1 },
      },
      'equipment-instance-equipped': {
        instanceId: 'equipment-instance-equipped',
        definitionId: 'combat_stims',
        location: { state: 'equipped', agentId: 'a_mina', slot: 'utility1' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
      'equipment-instance-malformed': {
        instanceId: 'equipment-instance-malformed',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'wrong', capacity: 2, remaining: 0 },
      },
      'equipment-instance-debt': {
        instanceId: 'equipment-instance-debt',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
      constructor: {
        instanceId: 'constructor',
        definitionId: 'combat_stims',
        location: { state: 'stored' as const },
        condition: 'operational' as const,
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
    }
    state.agents.a_mina.overdrive = {
      active: false,
      remainingPhases: 0,
      recoveryDebt: 1,
      source: {
        kind: 'combat_stim',
        activationId: 'combat-stim-equipment-instance-debt-dose-2',
        equipmentInstanceId: 'equipment-instance-debt',
        caseId: 'c_briarwood',
      },
    }

    const blockedSources = resolveEquipmentDeconstructionSources(state, 'combat_stims').filter(
      (choice) => choice.source.kind === 'equipment_instance'
    )
    const issues = Object.fromEntries(
      blockedSources.map((choice) => [
        choice.source.kind === 'equipment_instance' ? choice.source.instanceId : '',
        choice.issueCode,
      ])
    )
    expect(issues).toEqual({
      'equipment-instance-debt': 'equipment_instance_active_overdrive',
      'equipment-instance-equipped': 'equipment_instance_not_stored',
      'equipment-instance-full': 'equipment_instance_has_live_doses',
      'equipment-instance-malformed': 'equipment_instance_payload_malformed',
      'equipment-instance-partial': 'equipment_instance_has_live_doses',
      constructor: 'equipment_instance_not_found',
    })
    expect(blockedSources.every((choice) => choice.quantity === 0 && !choice.available)).toBe(true)
    for (const instanceId of Object.keys(state.equipmentInstances)) {
      expect(
        queueEquipmentDeconstruction(state, 'combat_stims', {
          kind: 'equipment_instance',
          instanceId,
        })
      ).toBe(state)
    }
  })

  it('resolves Trauma Kit through the canonical Grade I medical recovery rule', () => {
    const profile = getEquipmentDeconstructionProfile('trauma_kit')
    if (!profile || profile.state !== 'eligible') throw new Error('Missing Trauma Kit profile')

    const operational = resolveEquipmentGradeRecoveryOutcome(
      profile.rule,
      { state: 'graded', gradeId: 'grade_1' },
      'known',
      {
        condition: 'operational',
        rarity: 'legendary',
        price: 999_999,
        legacyEffectScale: 99,
        provenance: 'untrusted',
      } as Parameters<typeof resolveEquipmentGradeRecoveryOutcome>[3]
    )
    const damaged = resolveEquipmentGradeRecoveryOutcome(
      profile.rule,
      { state: 'graded', gradeId: 'grade_1' },
      'known',
      { condition: 'damaged' }
    )

    expect(operational).toMatchObject({
      available: true,
      participation: { gradeId: 'grade_1' },
      materials: [{ materialId: 'medical_supplies', quantity: 1 }],
      waste: 1,
      durationWeeks: 1,
    })
    expect(damaged).toMatchObject({
      available: true,
      participation: { gradeId: 'grade_1' },
      materials: [{ materialId: 'medical_supplies', quantity: 1 }],
      waste: 2,
      durationWeeks: 1,
    })
  })

  it('applies the technological Grade II yield threshold without Grade III scaling', () => {
    const resolveProfile = (
      itemId: (typeof technologicalProfileIds)[number],
      gradeId: 'grade_1' | 'grade_2' | 'grade_3'
    ) => {
      const profile = getEquipmentDeconstructionProfile(itemId)
      if (!profile || profile.state !== 'eligible') throw new Error(`Missing profile: ${itemId}`)
      return resolveEquipmentGradeRecoveryOutcome(
        profile.rule,
        { state: 'graded', gradeId },
        'known',
        { condition: 'operational' }
      )
    }

    expect(resolveProfile('tactical_radio', 'grade_1')).toMatchObject({
      available: true,
      materials: [{ materialId: 'electronic_parts', quantity: 1 }],
      waste: 2,
      durationWeeks: 1,
    })
    for (const [itemId, gradeId] of [
      ['environmental_sampler', 'grade_2'],
      ['advanced_recon_suite', 'grade_3'],
    ] as const) {
      expect(resolveProfile(itemId, gradeId)).toMatchObject({
        available: true,
        materials: [{ materialId: 'electronic_parts', quantity: 2 }],
        waste: 1,
        durationWeeks: 1,
      })
    }
  })

  it('uses grade for component yield but for ritual handling time instead of universal yield', () => {
    const grade1Yield = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_1' },
      'known',
      { condition: 'operational' }
    )
    const grade2Yield = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'operational' }
    )
    const grade1Ritual = resolveEquipmentGradeRecoveryOutcome(
      handlingRule,
      { state: 'graded', gradeId: 'grade_1' },
      'known',
      { condition: 'operational' }
    )
    const grade2Ritual = resolveEquipmentGradeRecoveryOutcome(
      handlingRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'operational' }
    )

    expect(grade1Yield).toMatchObject({ available: true, materials: [{ quantity: 1 }], waste: 2 })
    expect(grade2Yield).toMatchObject({ available: true, materials: [{ quantity: 2 }], waste: 1 })
    expect(grade1Ritual).toMatchObject({
      available: true,
      materials: [{ quantity: 1 }],
      durationWeeks: 1,
    })
    expect(grade2Ritual).toMatchObject({
      available: true,
      materials: [{ quantity: 1 }],
      durationWeeks: 2,
    })
  })

  it('projects hidden grades identically and exposes no grade-specific serialized fields', () => {
    const hidden1 = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_1' },
      'hidden',
      { condition: 'operational' }
    )
    const hidden5 = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_5' },
      'hidden',
      { condition: 'operational' }
    )
    expect(hidden1).toEqual(hidden5)
    expect(JSON.stringify(hidden1)).not.toMatch(/grade_[15]|Grade [IVX]|"rank"/)
  })

  it('requires an explicit neutral rule for ungraded equipment', () => {
    const blocked = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'ungraded' },
      'known',
      { condition: 'operational' }
    )
    const neutral = resolveEquipmentGradeRecoveryOutcome(
      {
        kind: 'grade_neutral',
        pathId: 'component_reclamation',
        baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
        baseWaste: 1,
        baseDurationWeeks: 1,
      },
      { state: 'ungraded' },
      'known',
      { condition: 'operational' }
    )
    expect(blocked).toMatchObject({
      available: false,
      issues: [{ code: 'ungraded_requires_neutral_rule' }],
    })
    expect(neutral).toMatchObject({ available: true, projection: { state: 'ungraded' } })
  })

  it('keeps condition and restrictions independent from authoritative grade', () => {
    const operational = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'operational' }
    )
    const damaged = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      { condition: 'damaged' }
    )
    const restricted = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_5' },
      'known',
      { condition: 'operational', restrictions: ['evidence_held', 'authorization_required'] }
    )
    expect(operational).toMatchObject({
      available: true,
      participation: { gradeId: 'grade_2' },
      waste: 1,
    })
    expect(damaged).toMatchObject({
      available: true,
      participation: { gradeId: 'grade_2' },
      waste: 2,
    })
    expect(restricted).toMatchObject({
      available: false,
      issues: [{ code: 'authorization_required' }, { code: 'evidence_held' }],
    })

    const unrelatedAxes = resolveEquipmentGradeRecoveryOutcome(
      yieldRule,
      { state: 'graded', gradeId: 'grade_2' },
      'known',
      {
        condition: 'operational',
        rarity: 'legendary',
        price: 999_999,
        legacyEffectScale: 99,
        providerReliability: 0,
      } as Parameters<typeof resolveEquipmentGradeRecoveryOutcome>[3]
    )
    expect(unrelatedAxes).toEqual(operational)
  })

  it('queues catalog stock atomically and requires an explicit fabricated-lot source', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.damagedEquipmentQueue = ['signal_jammers']
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers')
    expect(queued.inventory.signal_jammers).toBe(0)
    expect(queued.damagedEquipmentQueue).toEqual([])
    expect(queued.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'signal_jammers',
      sourceGradeId: 'grade_2',
      sourceCondition: 'damaged',
      pathId: 'component_reclamation',
    })
    expect(state.inventory.signal_jammers).toBe(1)

    const fabricated = createStartingState()
    fabricated.inventory.signal_jammers = 1
    fabricated.fabricatedEquipmentLots = {
      completed: {
        queueId: 'completed',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    expect(resolveEquipmentDeconstructionPreview(fabricated, 'signal_jammers')).toMatchObject({
      resolution: {
        available: false,
        issues: [{ code: 'fabricated_lot_selection_unavailable' }],
      },
    })
    expect(queueEquipmentDeconstruction(fabricated, 'signal_jammers')).toBe(fabricated)

    const lotQueued = queueEquipmentDeconstruction(fabricated, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'completed',
    })
    expect(lotQueued.inventory.signal_jammers).toBe(0)
    expect(lotQueued.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'signal_jammers',
      sourceGradeId: 'grade_2',
      sourceFabricationQueueId: 'completed',
    })
    expect(lotQueued.fabricatedEquipmentLots).toEqual(fabricated.fabricatedEquipmentLots)
  })

  it('queues newly eligible technological stock through the canonical recovery path', () => {
    let state = createStartingState()
    state.inventory.tactical_radio = 1
    state.inventory.environmental_sampler = 1
    state.inventory.advanced_recon_suite = 1

    for (const itemId of [
      'tactical_radio',
      'environmental_sampler',
      'advanced_recon_suite',
    ] as const) {
      const before = state.inventory[itemId]
      state = queueEquipmentDeconstruction(state, itemId)
      expect(state.inventory[itemId]).toBe(before - 1)
    }

    expect(
      state.equipmentDeconstructionQueue?.map((entry) => ({
        itemId: entry.itemId,
        sourceGradeId: entry.sourceGradeId,
        pathId: entry.pathId,
        outputMaterials: entry.outputMaterials,
        wasteQuantity: entry.wasteQuantity,
        remainingWeeks: entry.remainingWeeks,
      }))
    ).toEqual([
      {
        itemId: 'tactical_radio',
        sourceGradeId: 'grade_1',
        pathId: 'component_reclamation',
        outputMaterials: [
          { materialId: 'electronic_parts', materialName: 'Electronic Parts', quantity: 1 },
        ],
        wasteQuantity: 2,
        remainingWeeks: 1,
      },
      {
        itemId: 'environmental_sampler',
        sourceGradeId: 'grade_2',
        pathId: 'component_reclamation',
        outputMaterials: [
          { materialId: 'electronic_parts', materialName: 'Electronic Parts', quantity: 2 },
        ],
        wasteQuantity: 1,
        remainingWeeks: 1,
      },
      {
        itemId: 'advanced_recon_suite',
        sourceGradeId: 'grade_3',
        pathId: 'component_reclamation',
        outputMaterials: [
          { materialId: 'electronic_parts', materialName: 'Electronic Parts', quantity: 2 },
        ],
        wasteQuantity: 1,
        remainingWeeks: 1,
      },
    ])
  })

  it('queues and completes Trauma Kit recovery with matching receipt and event', () => {
    const state = createStartingState()
    state.inventory.trauma_kit = 1

    const queued = queueEquipmentDeconstruction(state, 'trauma_kit')
    expect(queued.inventory.trauma_kit).toBe(0)
    expect(state.inventory.trauma_kit).toBe(1)
    expect(queued.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'trauma_kit',
      sourceGradeId: 'grade_1',
      pathId: 'component_reclamation',
      outputMaterials: [
        { materialId: 'medical_supplies', materialName: 'Medical Supplies', quantity: 1 },
      ],
      wasteQuantity: 1,
      remainingWeeks: 1,
    })

    const entry = queued.equipmentDeconstructionQueue![0]!
    const completed = advanceEquipmentDeconstructionQueues(queued)
    expect(completed.state.inventory.medical_supplies).toBe(state.inventory.medical_supplies + 1)
    expect(completed.state.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      itemId: 'trauma_kit',
      sourceGradeId: 'grade_1',
      outputMaterials: [
        { materialId: 'medical_supplies', materialName: 'Medical Supplies', quantity: 1 },
      ],
      wasteQuantity: 1,
    })
    expect(completed.eventDrafts).toEqual([
      expect.objectContaining({
        type: 'equipment.recovery_completed',
        payload: expect.objectContaining({
          itemId: 'trauma_kit',
          sourceGradeId: 'grade_1',
        }),
      }),
    ])
  })

  it('resolves catalog and fabricated sources and claims each batch unit exactly once', () => {
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
    }

    expect(resolveEquipmentDeconstructionSources(state, 'signal_jammers')).toMatchObject([
      { source: { kind: 'catalog' }, quantity: 1, available: true },
      {
        source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' },
        quantity: 2,
        available: true,
      },
    ])

    const first = queueEquipmentDeconstruction(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const second = queueEquipmentDeconstruction(first, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const exhausted = queueEquipmentDeconstruction(second, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })

    expect(second.inventory.signal_jammers).toBe(1)
    expect(second.equipmentDeconstructionQueue).toHaveLength(2)
    expect(exhausted).toBe(second)
    expect(resolveEquipmentDeconstructionSources(second, 'signal_jammers')).toMatchObject([
      { source: { kind: 'catalog' }, quantity: 1, available: true },
      {
        source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' },
        quantity: 0,
        available: false,
        issueCode: 'fabricated_lot_exhausted',
      },
    ])

    const activeEntry = first.equipmentDeconstructionQueue![0]!
    const conflictingReceipt = {
      queueId: activeEntry.id,
      itemId: activeEntry.itemId,
      pathId: activeEntry.pathId,
      sourceGradeId: activeEntry.sourceGradeId,
      sourceCondition: activeEntry.sourceCondition,
      outputMaterials: activeEntry.outputMaterials,
      wasteQuantity: activeEntry.wasteQuantity,
      completedWeek: first.week,
    }
    expect(
      resolveEquipmentDeconstructionSources(
        {
          ...first,
          inventory: { ...first.inventory, signal_jammers: 1 },
          fabricatedEquipmentLots: {
            batch: { ...first.fabricatedEquipmentLots!.batch!, quantity: 1 },
          },
          equipmentRecoveryOutcomes: { [activeEntry.id]: conflictingReceipt },
        },
        'signal_jammers'
      )
    ).toMatchObject([
      { source: { kind: 'catalog' }, quantity: 1 },
      {
        source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' },
        quantity: 0,
        issueCode: 'fabricated_lot_exhausted',
      },
    ])
  })

  it('completes once with matching materials/event and preserves conflicting live jobs', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers')
    const entry = { ...queued.equipmentDeconstructionQueue![0]!, remainingWeeks: 1 }
    const ready = { ...queued, equipmentDeconstructionQueue: [entry] }
    const completed = advanceEquipmentDeconstructionQueues(ready)
    expect(completed.state.inventory.electronic_parts).toBe(ready.inventory.electronic_parts + 2)
    expect(completed.state.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      queueId: entry.id,
      sourceGradeId: 'grade_2',
      outputMaterials: [{ materialId: 'electronic_parts', quantity: 2 }],
    })
    expect(completed.eventDrafts[0]).toMatchObject({
      type: 'equipment.recovery_completed',
      payload: { sourceGradeId: 'grade_2' },
    })

    const replay = advanceEquipmentDeconstructionQueues({
      ...completed.state,
      equipmentDeconstructionQueue: [entry],
    })
    expect(replay.state.inventory).toEqual(completed.state.inventory)
    expect(replay.eventDrafts).toEqual([])

    const conflict = advanceEquipmentDeconstructionQueues({
      ...ready,
      equipmentRecoveryOutcomes: {
        [entry.id]: {
          queueId: entry.id,
          itemId: entry.itemId,
          pathId: entry.pathId,
          sourceGradeId: 'grade_1',
          sourceCondition: entry.sourceCondition,
          outputMaterials: entry.outputMaterials,
          wasteQuantity: entry.wasteQuantity,
          completedWeek: ready.week,
        },
      },
    })
    expect(conflict.state.equipmentDeconstructionQueue).toEqual([entry])
    expect(conflict.eventDrafts).toEqual([])
  })

  it('retains fabricated provenance through completion and its matching event', () => {
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
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const entry = { ...queued.equipmentDeconstructionQueue![0]!, remainingWeeks: 1 }
    const completed = advanceEquipmentDeconstructionQueues({
      ...queued,
      equipmentDeconstructionQueue: [entry],
    })

    expect(completed.state.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      sourceGradeId: 'grade_2',
      sourceFabricationQueueId: 'batch',
    })
    expect(completed.eventDrafts[0]).toMatchObject({
      payload: { sourceFabricationQueueId: 'batch' },
    })
    expect(completed.state.fabricatedEquipmentLots).toEqual(state.fabricatedEquipmentLots)

    const replayState = {
      ...completed.state,
      inventory: { ...completed.state.inventory, signal_jammers: 1 },
      equipmentDeconstructionQueue: [entry],
    }
    expect(resolveEquipmentDeconstructionSources(replayState, 'signal_jammers')).toMatchObject([
      { source: { kind: 'catalog' }, quantity: 1 },
      {
        source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' },
        quantity: 0,
        issueCode: 'fabricated_lot_exhausted',
      },
    ])
  })

  it('round-trips valid queues and receipts while dropping malformed siblings', () => {
    const fallback = createStartingState()
    fallback.inventory.signal_jammers = 1
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers')
    const entry = queued.equipmentDeconstructionQueue![0]!
    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentDeconstructionQueue: [
            entry,
            { ...entry, id: 'missing-explanations', explanationCodes: undefined },
            { ...entry, id: 'missing-timing', durationWeeks: undefined },
            { ...entry, id: 'fractional-timing', remainingWeeks: 0.5 },
          ],
          equipmentRecoveryOutcomes: {
            [entry.id]: {
              queueId: entry.id,
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: entry.sourceGradeId,
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 1,
            },
            valid: {
              queueId: 'valid',
              itemId: 'signal_jammers',
              pathId: 'component_reclamation',
              sourceGradeId: 'grade_2',
              sourceCondition: 'operational',
              outputMaterials: entry.outputMaterials,
              wasteQuantity: 1,
              completedWeek: 1,
            },
            constructor: {
              queueId: 'constructor',
              itemId: 'signal_jammers',
              pathId: 'component_reclamation',
              sourceGradeId: 'grade_2',
              sourceCondition: 'operational',
              outputMaterials: entry.outputMaterials,
              wasteQuantity: 1,
              completedWeek: 1,
            },
            broken: { queueId: 'wrong' },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue).toHaveLength(1)
    expect(hydrated.equipmentDeconstructionQueue?.[0]?.id).toBe(entry.id)
    expect(hydrated.equipmentRecoveryOutcomes).toEqual(
      expect.objectContaining({
        [entry.id]: expect.objectContaining({ queueId: entry.id }),
        valid: expect.objectContaining({ queueId: 'valid', sourceGradeId: 'grade_2' }),
      })
    )
    const replay = advanceEquipmentDeconstructionQueues(hydrated)
    expect(replay.state.inventory).toEqual(hydrated.inventory)
    expect(replay.state.equipmentDeconstructionQueue).toEqual([])

    const conflictHydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentDeconstructionQueue: [entry],
          equipmentRecoveryOutcomes: {
            [entry.id]: {
              queueId: entry.id,
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: 'grade_1',
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 1,
            },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    const conflictReplay = advanceEquipmentDeconstructionQueues(conflictHydrated)
    expect(conflictReplay.state.inventory).toEqual(conflictHydrated.inventory)
    expect(conflictReplay.state.equipmentDeconstructionQueue?.[0]?.id).toBe(entry.id)
  })

  it('hydrates instance recovery provenance deterministically and removes duplicate live identity', () => {
    const fallback = createStartingState()
    fallback.equipmentInstances = {
      'equipment-instance-empty': {
        instanceId: 'equipment-instance-empty',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
    }
    const queued = queueEquipmentDeconstruction(fallback, 'combat_stims', {
      kind: 'equipment_instance',
      instanceId: 'equipment-instance-empty',
    })
    const entry = queued.equipmentDeconstructionQueue![0]!
    const duplicateLive = fallback.equipmentInstances!['equipment-instance-empty']!

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentInstances: { 'equipment-instance-empty': duplicateLive },
          equipmentDeconstructionQueue: [
            { ...entry, id: 'recovery-z' },
            entry,
            {
              ...entry,
              id: 'recovery-malformed',
              sourceEquipmentInstanceRemaining: 1,
            },
            { ...entry, id: 'recovery-wrong-grade', sourceGradeId: 'grade_2' },
          ],
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue).toHaveLength(1)
    expect(hydrated.equipmentDeconstructionQueue?.[0]).toMatchObject({
      id: entry.id,
      sourceEquipmentInstanceId: 'equipment-instance-empty',
      sourceEquipmentInstanceRemaining: 0,
    })
    expect(hydrated.equipmentInstances).toEqual({})
    expect(hydrated.events).toContainEqual(
      expect.objectContaining({
        type: 'equipment.recovery_started',
        payload: expect.objectContaining({
          queueId: entry.id,
          sourceEquipmentInstanceId: 'equipment-instance-empty',
        }),
      })
    )

    const completed = advanceEquipmentDeconstructionQueues(queued)
    const completedState = {
      ...completed.state,
      events: queued.events,
      equipmentInstances: { 'equipment-instance-empty': duplicateLive },
    }
    const completedHydrated = migratePersistedStore(
      { game: completedState },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(completedHydrated.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      sourceEquipmentInstanceId: 'equipment-instance-empty',
      sourceEquipmentInstanceRemaining: 0,
    })
    expect(completedHydrated.equipmentInstances).toEqual({})
  })

  it('hydrates ID-only ordinary instance claims and drops malformed provenance siblings', () => {
    const fallback = createStartingState()
    const instance = {
      instanceId: 'equipment-instance-ordinary',
      definitionId: 'signal_jammers',
      location: { state: 'stored' as const },
      condition: 'operational' as const,
    }
    fallback.equipmentInstances = { [instance.instanceId]: instance }
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: instance.instanceId,
    })
    const entry = queued.equipmentDeconstructionQueue![0]!

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentInstances: { [instance.instanceId]: instance },
          equipmentDeconstructionQueue: [
            entry,
            { ...entry, id: 'recovery-ordinary-duplicate' },
            {
              ...entry,
              id: 'recovery-ordinary-partial-resource',
              sourceEquipmentInstanceResourceId: 'unsupported_charge',
            },
            {
              ...entry,
              id: 'recovery-ordinary-mixed',
              sourceFabricationQueueId: 'missing-batch',
            },
            { ...entry, id: 'recovery-ordinary-wrong-grade', sourceGradeId: 'grade_1' },
            { ...entry, id: 'recovery-ordinary-deferred', itemId: 'diplomatic_kit' },
          ],
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue).toHaveLength(1)
    expect(hydrated.equipmentDeconstructionQueue?.[0]).toMatchObject({
      id: entry.id,
      itemId: 'signal_jammers',
      sourceEquipmentInstanceId: instance.instanceId,
    })
    expect(hydrated.equipmentDeconstructionQueue?.[0]).not.toHaveProperty(
      'sourceEquipmentInstanceResourceId'
    )
    expect(hydrated.equipmentInstances).toEqual({})

    const completed = advanceEquipmentDeconstructionQueues(queued)
    const completedHydrated = migratePersistedStore(
      {
        game: {
          ...completed.state,
          equipmentInstances: { [instance.instanceId]: instance },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(completedHydrated.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      itemId: 'signal_jammers',
      sourceEquipmentInstanceId: instance.instanceId,
    })
    expect(completedHydrated.equipmentInstances).toEqual({})
  })

  it('drops hydrated instance recovery claims while Combat Stim overdrive debt owns the instance', () => {
    const fallback = createStartingState()
    const instance = {
      instanceId: 'equipment-instance-empty',
      definitionId: 'combat_stims' as const,
      location: { state: 'stored' as const },
      condition: 'operational' as const,
      payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
    }
    fallback.equipmentInstances = { [instance.instanceId]: instance }
    const queued = queueEquipmentDeconstruction(fallback, 'combat_stims', {
      kind: 'equipment_instance',
      instanceId: instance.instanceId,
    })
    const agentId = Object.keys(queued.agents).sort()[0]!
    const agent = queued.agents[agentId]!

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          agents: {
            ...queued.agents,
            [agentId]: {
              ...agent,
              overdrive: {
                active: false,
                remainingPhases: 0,
                recoveryDebt: 1,
                source: {
                  kind: 'combat_stim',
                  activationId: 'combat-stim-equipment-instance-empty-dose-2',
                  equipmentInstanceId: instance.instanceId,
                  caseId: 'case-001',
                },
              },
            },
          },
          equipmentInstances: { [instance.instanceId]: instance },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue).toEqual([])
    expect(hydrated.equipmentRecoveryOutcomes).toEqual({})
    expect(hydrated.equipmentInstances?.[instance.instanceId]).toEqual(instance)
    expect(hydrated.agents[agentId]?.overdrive).toMatchObject({
      recoveryDebt: 1,
      source: { equipmentInstanceId: instance.instanceId },
    })
  })

  it('clears an equipped compatibility projection when a recovery claim wins the instance', () => {
    const fallback = createStartingState()
    const instanceId = 'equipment-instance-empty'
    fallback.equipmentInstances = {
      [instanceId]: {
        instanceId,
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 0 },
      },
    }
    const queued = queueEquipmentDeconstruction(fallback, 'combat_stims', {
      kind: 'equipment_instance',
      instanceId,
    })
    const agentId = Object.keys(queued.agents).sort()[0]!
    const agent = queued.agents[agentId]!

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          agents: {
            ...queued.agents,
            [agentId]: {
              ...agent,
              equipmentSlots: { ...(agent.equipmentSlots ?? {}), utility1: 'combat_stims' },
              equipmentEffectScales: {
                ...(agent.equipmentEffectScales ?? {}),
                combat_stims: 1,
              },
            },
          },
          equipmentInstances: {
            [instanceId]: {
              ...fallback.equipmentInstances[instanceId]!,
              location: { state: 'equipped', agentId, slot: 'utility1' },
            },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue?.[0]?.sourceEquipmentInstanceId).toBe(instanceId)
    expect(hydrated.equipmentInstances).toEqual({})
    expect(hydrated.agents[agentId]?.equipmentSlots?.utility1).toBeUndefined()
    expect(hydrated.agents[agentId]?.equipmentEffectScales?.combat_stims).toBeUndefined()
  })

  it('hydrates fabricated claims deterministically and gives completed outcomes priority', () => {
    const fallback = createStartingState()
    fallback.inventory.signal_jammers = 1
    fallback.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const entry = queued.equipmentDeconstructionQueue![0]!

    const overClaimed = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentDeconstructionQueue: [
            { ...entry, id: 'recovery-b' },
            { ...entry, id: 'recovery-a' },
            { ...entry, id: 'foreign', sourceFabricationQueueId: 'missing' },
          ],
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(overClaimed.equipmentDeconstructionQueue).toHaveLength(1)
    expect(overClaimed.equipmentDeconstructionQueue?.[0]).toMatchObject({
      id: 'recovery-a',
      sourceFabricationQueueId: 'batch',
    })

    const duplicateOperational = { ...entry, id: 'duplicate-claim' }
    const duplicateDamaged = {
      ...entry,
      id: 'duplicate-claim',
      sourceCondition: 'damaged' as const,
    }
    const hydrateDuplicates = (
      equipmentDeconstructionQueue: typeof queued.equipmentDeconstructionQueue
    ) =>
      migratePersistedStore(
        {
          game: { ...queued, equipmentDeconstructionQueue },
        },
        GAME_STORE_VERSION,
        fallback
      ).game.equipmentDeconstructionQueue
    expect(hydrateDuplicates([duplicateOperational, duplicateDamaged])).toEqual([])
    expect(hydrateDuplicates([duplicateDamaged, duplicateOperational])).toEqual([])
    const missingIdClaim = { ...entry, id: '' }
    const unsafeIdClaim = { ...entry, id: 'constructor' }
    expect(hydrateDuplicates([missingIdClaim, unsafeIdClaim])).toEqual([])
    expect(hydrateDuplicates([unsafeIdClaim, missingIdClaim])).toEqual([])

    const hydrateTwoClaims = (
      equipmentDeconstructionQueue: typeof queued.equipmentDeconstructionQueue
    ) =>
      migratePersistedStore(
        {
          game: {
            ...queued,
            fabricatedEquipmentLots: {
              batch: { ...queued.fabricatedEquipmentLots!.batch!, quantity: 2 },
            },
            equipmentDeconstructionQueue,
          },
        },
        GAME_STORE_VERSION,
        fallback
      ).game.equipmentDeconstructionQueue?.map(({ id }) => id)
    const recoveryA = { ...entry, id: 'recovery-a' }
    const recoveryB = { ...entry, id: 'recovery-b' }
    expect(hydrateTwoClaims([recoveryB, recoveryA])).toEqual(['recovery-a', 'recovery-b'])
    expect(hydrateTwoClaims([recoveryA, recoveryB])).toEqual(['recovery-a', 'recovery-b'])

    const completedWins = migratePersistedStore(
      {
        game: {
          ...queued,
          equipmentDeconstructionQueue: [{ ...entry, id: 'active-claim' }],
          equipmentRecoveryOutcomes: {
            completed: {
              queueId: 'completed',
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: entry.sourceGradeId,
              sourceFabricationQueueId: 'batch',
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 1,
            },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(completedWins.equipmentRecoveryOutcomes?.completed).toMatchObject({
      sourceFabricationQueueId: 'batch',
    })
    expect(completedWins.equipmentDeconstructionQueue).toEqual([])

    const staleCompletedQueue = migratePersistedStore(
      {
        game: {
          ...queued,
          inventory: { ...queued.inventory, signal_jammers: 2 },
          fabricatedEquipmentLots: {
            batch: { ...queued.fabricatedEquipmentLots!.batch!, quantity: 2 },
          },
          equipmentDeconstructionQueue: [
            { ...entry, id: 'completed' },
            { ...entry, id: 'active-claim' },
          ],
          equipmentRecoveryOutcomes: {
            completed: {
              queueId: 'completed',
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: entry.sourceGradeId,
              sourceFabricationQueueId: 'batch',
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 1,
            },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(staleCompletedQueue.equipmentDeconstructionQueue?.map(({ id }) => id)).toEqual([
      'active-claim',
      'completed',
    ])

    const postCompletionQueue = migratePersistedStore(
      {
        game: {
          ...queued,
          week: 2,
          fabricatedEquipmentLots: {
            batch: { ...queued.fabricatedEquipmentLots!.batch!, quantity: 2 },
          },
          equipmentDeconstructionQueue: [{ ...entry, startedWeek: 2 }],
          equipmentRecoveryOutcomes: {
            [entry.id]: {
              queueId: entry.id,
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: entry.sourceGradeId,
              sourceFabricationQueueId: 'batch',
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 1,
            },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(postCompletionQueue.equipmentRecoveryOutcomes?.[entry.id]).toBeDefined()
    expect(postCompletionQueue.equipmentDeconstructionQueue).toEqual([])

    const preFabricationQueue = migratePersistedStore(
      {
        game: {
          ...queued,
          week: 3,
          fabricatedEquipmentLots: {
            batch: { ...queued.fabricatedEquipmentLots!.batch!, completedWeek: 2 },
          },
          equipmentDeconstructionQueue: [{ ...entry, startedWeek: 1 }],
          equipmentRecoveryOutcomes: {
            [entry.id]: {
              queueId: entry.id,
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: entry.sourceGradeId,
              sourceFabricationQueueId: 'batch',
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 3,
            },
          },
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game
    expect(preFabricationQueue.equipmentRecoveryOutcomes?.[entry.id]).toBeDefined()
    expect(preFabricationQueue.equipmentDeconstructionQueue).toEqual([])
  })

  it('rejects fabricated provenance whose durable claim predates or disagrees with its lot', () => {
    const fallback = createStartingState()
    fallback.week = 2
    fallback.inventory.signal_jammers = 1
    fallback.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const entry = queued.equipmentDeconstructionQueue![0]!
    const baseEvent = createMinimalOperationEvent('equipment.recovery_started')
    const eventPayload = {
      ...baseEvent.payload,
      week: 2,
      sourceFabricationQueueId: 'batch',
    }

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          week: 2,
          fabricatedEquipmentLots: {
            batch: { ...fallback.fabricatedEquipmentLots.batch!, completedWeek: 2 },
          },
          equipmentDeconstructionQueue: [{ ...entry, startedWeek: 1 }],
          equipmentRecoveryOutcomes: {
            [entry.id]: {
              queueId: entry.id,
              itemId: entry.itemId,
              pathId: entry.pathId,
              sourceGradeId: entry.sourceGradeId,
              sourceFabricationQueueId: 'batch',
              sourceCondition: entry.sourceCondition,
              outputMaterials: entry.outputMaterials,
              wasteQuantity: entry.wasteQuantity,
              completedWeek: 1,
            },
          },
          events: [
            { ...baseEvent, id: 'valid-lot-event', payload: eventPayload },
            {
              ...baseEvent,
              id: 'missing-lot-event',
              payload: { ...eventPayload, sourceFabricationQueueId: 'missing' },
            },
            {
              ...baseEvent,
              id: 'mismatched-lot-event',
              payload: { ...eventPayload, sourceGradeId: 'grade_3' },
            },
          ],
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentRecoveryOutcomes).toEqual({})
    expect(hydrated.equipmentDeconstructionQueue).toEqual([])
    expect(hydrated.events).toEqual([])
  })

  it('bounds recovery-event provenance by the sanitized durable lot claims', () => {
    const fallback = createStartingState()
    fallback.week = 3
    fallback.inventory.signal_jammers = 1
    fallback.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const entry = queued.equipmentDeconstructionQueue![0]!
    const baseEvent = createMinimalOperationEvent('equipment.recovery_completed')
    const eventPayload = {
      ...baseEvent.payload,
      week: 2,
      queueId: entry.id,
      sourceFabricationQueueId: 'batch',
    }
    const outcome = {
      queueId: entry.id,
      itemId: entry.itemId,
      pathId: entry.pathId,
      sourceGradeId: entry.sourceGradeId,
      sourceFabricationQueueId: 'batch',
      sourceCondition: entry.sourceCondition,
      outputMaterials: entry.outputMaterials,
      wasteQuantity: entry.wasteQuantity,
      completedWeek: 2,
    }

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          week: 3,
          equipmentDeconstructionQueue: [],
          equipmentRecoveryOutcomes: { [entry.id]: outcome },
          events: [
            { ...baseEvent, id: 'durable-claim-event', payload: eventPayload },
            {
              ...baseEvent,
              id: 'over-capacity-event',
              payload: { ...eventPayload, queueId: 'recovery-over-capacity' },
            },
            {
              ...baseEvent,
              id: 'wrong-completion-week-event',
              payload: { ...eventPayload, week: 1 },
            },
            {
              ...baseEvent,
              id: 'missing-provenance-event',
              payload: {
                ...baseEvent.payload,
                week: 2,
                queueId: entry.id,
              },
            },
            {
              ...createMinimalOperationEvent('equipment.recovery_started'),
              id: 'post-completion-start-event',
              payload: {
                ...createMinimalOperationEvent('equipment.recovery_started').payload,
                week: 3,
                queueId: entry.id,
                sourceFabricationQueueId: 'batch',
              },
            },
          ],
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentRecoveryOutcomes?.[entry.id]).toMatchObject({
      sourceFabricationQueueId: 'batch',
    })
    expect(hydrated.events.map(({ id }) => id)).toEqual(['durable-claim-event'])
  })

  it('matches fabricated recovery-started events to the active queue start week', () => {
    const fallback = createStartingState()
    fallback.week = 2
    fallback.inventory.signal_jammers = 1
    fallback.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    const queued = queueEquipmentDeconstruction(fallback, 'signal_jammers', {
      kind: 'fabricated_lot',
      fabricationQueueId: 'batch',
    })
    const entry = queued.equipmentDeconstructionQueue![0]!
    const baseEvent = createMinimalOperationEvent('equipment.recovery_started')
    const eventPayload = {
      ...baseEvent.payload,
      week: entry.startedWeek,
      queueId: entry.id,
      sourceFabricationQueueId: 'batch',
    }

    const hydrated = migratePersistedStore(
      {
        game: {
          ...queued,
          events: [
            { ...baseEvent, id: 'matching-start-event', payload: eventPayload },
            {
              ...baseEvent,
              id: 'wrong-start-week-event',
              payload: { ...eventPayload, week: entry.startedWeek - 1 },
            },
            {
              ...baseEvent,
              id: 'wrong-eta-event',
              payload: { ...eventPayload, etaWeeks: entry.durationWeeks + 1 },
            },
          ],
        },
      },
      GAME_STORE_VERSION,
      fallback
    ).game

    expect(hydrated.equipmentDeconstructionQueue?.[0]?.id).toBe(entry.id)
    expect(hydrated.events.map(({ id }) => id)).toEqual(['matching-start-event'])
  })

  it('advances recovery through the canonical week-close queue phase', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    const queued = queueEquipmentDeconstruction(state, 'signal_jammers')
    const advanced = advanceWeek({
      ...queued,
      equipmentDeconstructionQueue: queued.equipmentDeconstructionQueue?.map((entry) => ({
        ...entry,
        remainingWeeks: 1,
      })),
    })

    expect(advanced.equipmentDeconstructionQueue).toEqual([])
    expect(Object.values(advanced.equipmentRecoveryOutcomes ?? {})).toHaveLength(1)
    expect(advanced.inventory.electronic_parts).toBe(queued.inventory.electronic_parts + 2)
  })
})
