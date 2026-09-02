// cspell:words lockdown medkits
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  getAgentEquipmentLoadoutViews,
  getEquipmentDeconstructionViews,
  getEquipmentInstanceMaterializationViews,
  getGearRecommendationsForActiveCases,
} from './equipmentView'
import {
  instantiateEquipmentInstance,
  relocateEquipmentInstance,
} from '../../domain/equipmentInstance'
import { queueEquipmentDeconstruction } from '../../domain/sim/equipmentDeconstruction'

describe('getEquipmentDeconstructionViews', () => {
  it('keeps instance condition independent from aggregate damaged stock', () => {
    const game = createStartingState()
    game.inventory.combat_stims = 1
    game.damagedEquipmentQueue = ['combat_stims']
    game.equipmentInstances = {
      'equipment-instance-live': {
        instanceId: 'equipment-instance-live',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 2, remaining: 1 },
      },
    }

    const view = getEquipmentDeconstructionViews(game, {
      combat_stims: { kind: 'equipment_instance', instanceId: 'equipment-instance-live' },
    }).find((candidate) => candidate.itemId === 'combat_stims')

    expect(view).toMatchObject({
      available: false,
      conditionLabel: 'Operational',
    })
  })

  it('selects an available ordinary instance when aggregate stock is unavailable', () => {
    const game = createStartingState()
    game.inventory.medkits = 0
    game.equipmentInstances = {
      'equipment-instance-medkit': {
        instanceId: 'equipment-instance-medkit',
        definitionId: 'medkits',
        location: { state: 'stored' },
        condition: 'operational',
      },
    }

    expect(
      getEquipmentDeconstructionViews(game).find((candidate) => candidate.itemId === 'medkits')
    ).toMatchObject({
      available: true,
      source: { kind: 'equipment_instance', instanceId: 'equipment-instance-medkit' },
      sourceQuantity: 1,
      conditionLabel: 'Operational',
    })
  })
})

describe('getGearRecommendationsForActiveCases', () => {
  it('returns at most five unresolved cases sorted by stage then deadline', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => {
        const stage = 6 - index
        const deadlineRemaining = index + 1

        return [
          `case-${index + 1}`,
          {
            ...sampleCase,
            id: `case-${index + 1}`,
            title: `Case ${index + 1}`,
            status: 'open',
            stage,
            deadlineRemaining,
            tags: [],
            requiredTags: [],
            preferredTags: [],
            assignedTeamIds: [],
          },
        ]
      })
    )

    const recommendations = getGearRecommendationsForActiveCases(game)

    expect(recommendations).toHaveLength(5)
    expect(recommendations.map((item) => item.stage)).toEqual([6, 5, 4, 3, 2])
    expect(recommendations.map((item) => item.caseId)).toEqual([
      'case-1',
      'case-2',
      'case-3',
      'case-4',
      'case-5',
    ])
  })

  it('recommends ward seals for occult-tagged pressure', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = {
      'case-occult': {
        ...sampleCase,
        id: 'case-occult',
        title: 'Ritual Site Lockdown',
        status: 'open',
        stage: 3,
        deadlineRemaining: 2,
        tags: ['occult', 'ritual', 'haunt'],
        requiredTags: ['occult'],
        preferredTags: ['containment'],
        assignedTeamIds: [],
      },
    }

    const recommendations = getGearRecommendationsForActiveCases(game)

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]?.itemId).toBe('ward_seals')
    expect(recommendations[0]?.reason).toMatch(/matches/i)
    expect(recommendations[0]?.stock).toBe(0)
    expect(recommendations[0]?.queued).toBe(0)
  })

  it('tracks queue and stock counts for the recommended item', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = {
      'case-medical': {
        ...sampleCase,
        id: 'case-medical',
        title: 'Biohazard Sweep',
        status: 'open',
        stage: 4,
        deadlineRemaining: 1,
        tags: ['medical', 'biohazard'],
        requiredTags: [],
        preferredTags: ['injury'],
        assignedTeamIds: [],
      },
    }

    game.inventory.medkits = 3
    game.productionQueue = [
      {
        id: 'q-medkits-1',
        recipeId: 'med-kits',
        recipeName: 'Emergency Medkits',
        outputItemId: 'medkits',
        outputItemName: 'Emergency Medkits',
        outputQuantity: 1,
        startedWeek: 1,
        durationWeeks: 1,
        remainingWeeks: 1,
        fundingCost: 14,
        outputGradeId: 'grade_1',
        outputGradeVisibility: 'known',
        outputGradeExplanationCodes: ['fabrication_grade.catalog'],
      },
      {
        id: 'q-medkits-2',
        recipeId: 'med-kits',
        recipeName: 'Emergency Medkits',
        outputItemId: 'medkits',
        outputItemName: 'Emergency Medkits',
        outputQuantity: 1,
        startedWeek: 1,
        durationWeeks: 1,
        remainingWeeks: 1,
        fundingCost: 14,
        outputGradeId: 'grade_1',
        outputGradeVisibility: 'known',
        outputGradeExplanationCodes: ['fabrication_grade.catalog'],
      },
    ]

    const recommendations = getGearRecommendationsForActiveCases(game)

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]?.itemId).toBe('medkits')
    expect(recommendations[0]?.stock).toBe(3)
    expect(recommendations[0]?.queued).toBe(2)
  })

  it('builds deterministic loadout views from agent slots and inventory stock', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 2
    game.agents.a_mina = {
      ...game.agents.a_mina,
      equipmentSlots: {
        utility1: 'signal_jammers',
      },
      equipmentEffectScales: {
        signal_jammers: 1,
      },
    }

    const views = getAgentEquipmentLoadoutViews(game)
    const mina = views.find((view) => view.agentId === 'a_mina')

    expect(mina).toBeDefined()
    expect(mina?.summary.equippedItemCount).toBe(1)
    expect(mina?.summary.loadoutEffectScale).toBe(1)
    expect(mina?.slots.find((slot) => slot.slot === 'utility1')).toMatchObject({
      itemId: 'signal_jammers',
      itemName: 'Signal Jammers',
    })
    expect(mina?.slots.find((slot) => slot.slot === 'utility2')?.stockOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'signal_jammers',
          stock: 2,
        }),
      ])
    )
  })

  it('surfaces Combat Stim catalog and fabricated-lot tracking sources', () => {
    const game = createStartingState()
    game.inventory.combat_stims = 2
    game.fabricatedEquipmentLots = {
      'combat-stim-batch': {
        queueId: 'combat-stim-batch',
        recipeId: 'combat-stims',
        itemId: 'combat_stims',
        quantity: 1,
        gradeId: 'grade_1',
        completedWeek: 1,
      },
    }

    const view = getEquipmentInstanceMaterializationViews(game).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )
    expect(view).toMatchObject({
      itemId: 'combat_stims',
      aggregateStock: 2,
      canMaterialize: true,
      storedInstances: [],
    })
    expect(view?.materializationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: { kind: 'catalog' },
          available: true,
          quantity: 1,
        }),
        expect.objectContaining({
          source: { kind: 'fabricated_lot', fabricationQueueId: 'combat-stim-batch' },
          available: true,
          quantity: 1,
          provenanceLabel: expect.any(String),
        }),
      ])
    )
  })

  it('surfaces stored Combat Stim instances as durable dose-aware choices', () => {
    const game = createStartingState()
    game.inventory.combat_stims = 1
    const created = instantiateEquipmentInstance(game, 'combat_stims')
    if (!created.ok) throw new Error(created.code)

    const ava = getAgentEquipmentLoadoutViews(created.state).find(
      (view) => view.agentId === 'a_ava'
    )
    expect(ava?.slots.find((slot) => slot.slot === 'utility1')?.stockOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'combat_stims',
          instanceId: created.instance.instanceId,
          doseLabel: '2/2 doses',
          stock: 0,
        }),
      ])
    )
  })

  it('preserves unavailable dose labels for noncanonical stored Combat Stims', () => {
    const game = createStartingState()
    game.equipmentInstances = {
      'equipment-instance-legacy': {
        instanceId: 'equipment-instance-legacy',
        definitionId: 'combat_stims',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'combat_stim_dose', capacity: 3, remaining: 2 },
      },
    }

    const ava = getAgentEquipmentLoadoutViews(game).find((view) => view.agentId === 'a_ava')
    expect(ava?.slots.find((slot) => slot.slot === 'utility1')?.stockOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instanceId: 'equipment-instance-legacy',
          doseLabel: 'Dose state unavailable',
        }),
      ])
    )
  })

  it('surfaces generic stored instances separately from aggregate stock', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 2
    const created = instantiateEquipmentInstance(game, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)

    const materialization = getEquipmentInstanceMaterializationViews(created.state).find(
      (view) => view.itemId === 'signal_jammers'
    )
    expect(materialization).toMatchObject({
      itemId: 'signal_jammers',
      itemName: 'Signal Jammers',
      aggregateStock: 1,
      storedInstanceCount: 1,
      equippedInstanceCount: 0,
      canMaterialize: true,
      materializationSources: [{ source: { kind: 'catalog' }, quantity: 1, available: true }],
      storedInstances: [
        {
          instanceId: created.instance.instanceId,
          instanceLabel: `Signal Jammers — ${created.instance.instanceId}`,
          conditionLabel: 'Operational',
          canDestroy: true,
          canRepairCondition: false,
          canReaggregate: true,
        },
      ],
    })

    const mina = getAgentEquipmentLoadoutViews(created.state).find(
      (view) => view.agentId === 'a_mina'
    )
    expect(mina?.slots.find((slot) => slot.slot === 'utility1')?.stockOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'signal_jammers', stock: 1 }),
        expect.objectContaining({
          itemId: 'signal_jammers',
          instanceId: created.instance.instanceId,
          instanceLabel: created.instance.instanceId,
          stock: 0,
        }),
      ])
    )
  })

  it('exposes destroy and re-agg eligibility on idle ordinary equipped slots', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    const created = instantiateEquipmentInstance(game, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)
    const equipped = relocateEquipmentInstance(created.state, created.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_mina',
      slot: 'utility1',
    })
    if (!equipped.ok) throw new Error(equipped.code)

    const mina = getAgentEquipmentLoadoutViews(equipped.state).find(
      (view) => view.agentId === 'a_mina'
    )
    expect(mina?.slots.find((slot) => slot.slot === 'utility1')).toMatchObject({
      instanceId: created.instance.instanceId,
      ordinaryLifecycle: { canDestroy: true, canReaggregate: true },
    })

    const locked = {
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
    const lockedMina = getAgentEquipmentLoadoutViews(locked).find(
      (view) => view.agentId === 'a_mina'
    )
    expect(lockedMina?.slots.find((slot) => slot.slot === 'utility1')?.ordinaryLifecycle).toEqual({
      canDestroy: false,
      destructionBlocker: 'agent_not_idle',
      canReaggregate: false,
      reaggregationBlocker: 'agent_not_idle',
    })
  })

  it('omits ordinary destroy and re-agg from equipped Combat Stim slots', () => {
    const game = createStartingState()
    game.inventory.combat_stims = 1
    const created = instantiateEquipmentInstance(game, 'combat_stims', {
      location: { state: 'equipped', agentId: 'a_ava', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)

    const ava = getAgentEquipmentLoadoutViews(created.state).find(
      (view) => view.agentId === 'a_ava'
    )
    expect(ava?.slots.find((slot) => slot.slot === 'utility1')).toMatchObject({
      instanceId: created.instance.instanceId,
      ordinaryLifecycle: undefined,
    })
  })

  it('lists exact stored identities stably and blocks generic payload destruction', () => {
    const game = createStartingState()
    game.equipmentInstances = {
      z_copy: {
        instanceId: 'z_copy',
        definitionId: 'signal_jammers',
        location: { state: 'stored' },
        condition: 'damaged',
      },
      a_copy: {
        instanceId: 'a_copy',
        definitionId: 'signal_jammers',
        location: { state: 'stored' },
        condition: 'operational',
        payload: { resourceId: 'battery_charge', capacity: 2, remaining: 1 },
      },
    }

    expect(
      getEquipmentInstanceMaterializationViews(game).find(
        (view) => view.itemId === 'signal_jammers'
      )?.storedInstances
    ).toEqual([
      {
        instanceId: 'a_copy',
        instanceLabel: 'Signal Jammers — a_copy',
        conditionLabel: 'Operational',
        canDestroy: false,
        destructionBlocker: 'payload_unsupported',
        canRepairCondition: false,
        canReaggregate: false,
        reaggregationBlocker: 'payload_unsupported',
        canReturnToLot: false,
      },
      {
        instanceId: 'z_copy',
        instanceLabel: 'Signal Jammers — z_copy',
        conditionLabel: 'Damaged',
        canDestroy: true,
        canRepairCondition: true,
        canReaggregate: false,
        reaggregationBlocker: 'condition_unsupported',
        canReturnToLot: false,
      },
    ])
  })

  it('disables destruction for a live identity already claimed by recovery', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    const created = instantiateEquipmentInstance(game, 'signal_jammers')
    if (!created.ok) throw new Error(created.code)
    const queued = queueEquipmentDeconstruction(created.state, 'signal_jammers', {
      kind: 'equipment_instance',
      instanceId: created.instance.instanceId,
    })
    const conflicting = {
      ...queued,
      equipmentInstances: {
        ...(queued.equipmentInstances ?? {}),
        [created.instance.instanceId]: created.instance,
      },
    }

    expect(
      getEquipmentInstanceMaterializationViews(conflicting).find(
        (view) => view.itemId === 'signal_jammers'
      )?.storedInstances
    ).toEqual([
      expect.objectContaining({
        instanceId: created.instance.instanceId,
        canDestroy: false,
        destructionBlocker: 'recovery_claimed',
        canRepairCondition: false,
        canReaggregate: false,
        reaggregationBlocker: 'recovery_claimed',
      }),
    ])
  })

  it('exposes fabricated-lot tracking sources when only batch stock remains', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    game.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }

    expect(
      getEquipmentInstanceMaterializationViews(game).find(
        (view) => view.itemId === 'signal_jammers'
      )
    ).toMatchObject({
      aggregateStock: 1,
      canMaterialize: true,
      materializationSources: [
        { source: { kind: 'catalog' }, quantity: 0, available: false },
        {
          source: { kind: 'fabricated_lot', fabricationQueueId: 'batch' },
          quantity: 1,
          available: true,
          provenanceLabel: 'Grade II',
        },
      ],
    })
  })

  it('does not expose fabricated-lot stock as direct aggregate loadout stock', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    game.inventory.combat_stims = 1
    game.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
      'combat-stim-batch': {
        queueId: 'combat-stim-batch',
        recipeId: 'combat-stims',
        itemId: 'combat_stims',
        quantity: 1,
        gradeId: 'grade_1',
        completedWeek: 1,
      },
    }

    const ava = getAgentEquipmentLoadoutViews(game).find((view) => view.agentId === 'a_ava')
    const utilityOptions = ava?.slots.find((slot) => slot.slot === 'utility1')?.stockOptions ?? []

    expect(utilityOptions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'signal_jammers' }),
        expect.objectContaining({ itemId: 'combat_stims' }),
      ])
    )
  })

  it('hides stored instances that fail the full loadout assignment contract', () => {
    const game = createStartingState()
    game.inventory.advanced_recon_suite = 1
    game.agents.a_rook = {
      ...game.agents.a_rook,
      level: 1,
      progression: {
        ...(game.agents.a_rook.progression ?? {
          xp: 0,
          level: 1,
          potentialTier: 'B',
          growthProfile: 'balanced',
        }),
        level: 1,
      },
    }
    const created = instantiateEquipmentInstance(game, 'advanced_recon_suite')
    if (!created.ok) throw new Error(created.code)

    const rook = getAgentEquipmentLoadoutViews(created.state).find(
      (view) => view.agentId === 'a_rook'
    )
    expect(rook?.slots.find((slot) => slot.slot === 'headgear')?.stockOptions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ instanceId: created.instance.instanceId })])
    )
  })
})
