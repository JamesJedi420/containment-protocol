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

const handlingRule = {
  kind: 'handling_threshold' as const,
  pathId: 'ritual_disassembly' as const,
  baseMaterials: [{ materialId: 'occult_reagents', quantity: 1 }],
  baseWaste: 1,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2' as const,
  additionalDurationWeeks: 1,
}

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
      'completed',
      'active-claim',
    ])
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
          week: 2,
          equipmentDeconstructionQueue: [],
          equipmentRecoveryOutcomes: { [entry.id]: outcome },
          events: [
            { ...baseEvent, id: 'durable-claim-event', payload: eventPayload },
            {
              ...baseEvent,
              id: 'over-capacity-event',
              payload: { ...eventPayload, queueId: 'recovery-over-capacity' },
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
