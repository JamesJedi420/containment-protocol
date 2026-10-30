import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import {
  repairStoredEquipmentInstanceCondition,
  stabilizeContainmentClassDeficiency,
  type EquipmentInstance,
} from '../domain/equipmentInstance'
import {
  parseEquipmentRecallRegistry,
  reconcileEquipmentRecall,
  WARD_SEAL_BATCH_A_RECALL,
} from '../domain/equipmentRecall'

const campaign = WARD_SEAL_BATCH_A_RECALL

function instance(
  id: string,
  lot: string | undefined,
  condition: 'operational' | 'damaged'
): EquipmentInstance {
  return {
    instanceId: id,
    definitionId: 'ward_seals',
    location: { state: 'stored' },
    condition,
    ...(lot
      ? {
          fabricationOrigin: {
            queueId: lot,
            recipeId: 'ward-seals',
            gradeId: 'grade_2' as const,
            completedWeek: 1,
          },
        }
      : {}),
    containmentIntegrity: {
      classId: 'blast_door',
      lastInspectionWeek: 1,
      cycleCount: 0,
      deficiency: { kind: 'none' },
    },
  }
}

function recallState() {
  const starting = createStartingState()
  return {
    ...starting,
    week: 20,
    facilityStockpile: { blast_door_hinge_seal: 1 },
    fabricatedEquipmentLots: {
      'batch-a': {
        queueId: 'batch-a',
        recipeId: 'ward-seals',
        itemId: 'ward_seals',
        quantity: 2,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 2,
      },
      'batch-b': {
        queueId: 'batch-b',
        recipeId: 'ward-seals',
        itemId: 'ward_seals',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 1,
      },
    },
    equipmentInstances: {
      affected_damaged: instance('affected_damaged', 'batch-a', 'damaged'),
      affected_outstanding: instance('affected_outstanding', 'batch-a', 'operational'),
      unaffected: instance('unaffected', 'batch-b', 'operational'),
      unknown: instance('unknown', undefined, 'operational'),
    },
  }
}

describe('equipment defect recall', () => {
  it('classifies provenance and applies the existing hard-stop disposition idempotently', () => {
    const first = reconcileEquipmentRecall(recallState(), campaign)
    expect(first.record.obligations).toMatchObject({
      affected_damaged: { applicability: 'affected', state: 'dispositioned', reason: 'lot_match' },
      affected_outstanding: { applicability: 'affected', state: 'dispositioned' },
      unaffected: { applicability: 'unaffected', reason: 'lot_mismatch' },
      unknown: { applicability: 'unknown', state: 'unknown', reason: 'provenance_missing' },
    })
    expect(
      first.state.equipmentInstances?.affected_damaged?.containmentIntegrity?.deficiency
    ).toEqual({ kind: 'hard_stop' })
    expect(reconcileEquipmentRecall(first.state, campaign)).toEqual(first)
  })

  it('observes authoritative repair once while another obligation remains outstanding', () => {
    const opened = reconcileEquipmentRecall(recallState(), campaign)
    const repaired = repairStoredEquipmentInstanceCondition(
      opened.state,
      'affected_damaged',
      'blast_door_hinge_seal'
    )
    expect(repaired.ok).toBe(true)
    if (!repaired.ok) throw new Error(repaired.code)
    const repairObserved = reconcileEquipmentRecall(repaired.state, campaign)
    expect(repairObserved.record.obligations.affected_damaged).toMatchObject({
      state: 'dispositioned',
      observedCondition: 'damaged',
    })
    const stabilized = stabilizeContainmentClassDeficiency(repairObserved.state, 'affected_damaged')
    expect(stabilized.ok).toBe(true)
    if (!stabilized.ok) throw new Error(stabilized.code)
    const cleared = stabilizeContainmentClassDeficiency(stabilized.state, 'affected_damaged')
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) throw new Error(cleared.code)
    const reconciled = reconcileEquipmentRecall(cleared.state, campaign)
    expect(reconciled.record.obligations.affected_damaged?.state).toBe('remediated')
    expect(reconciled.record.obligations.affected_outstanding?.state).toBe('dispositioned')
    expect(reconcileEquipmentRecall(reconciled.state, campaign)).toEqual(reconciled)

    const damagedAgain = {
      ...reconciled.state,
      equipmentInstances: {
        ...reconciled.state.equipmentInstances,
        affected_damaged: {
          ...reconciled.state.equipmentInstances?.affected_damaged,
          condition: 'damaged' as const,
        } as EquipmentInstance,
      },
    }
    const reopened = reconcileEquipmentRecall(damagedAgain, campaign)
    expect(reopened.record.obligations.affected_damaged?.state).toBe('dispositioned')
  })

  it('round-trips valid obligations and drops malformed siblings', () => {
    const reconciled = reconcileEquipmentRecall(recallState(), campaign)
    expect(
      hydrateGame(JSON.parse(JSON.stringify(reconciled.state))).equipmentRecallRegistry
    ).toEqual(reconciled.state.equipmentRecallRegistry)
    expect(parseEquipmentRecallRegistry({ bad: { campaignId: 'other', obligations: {} } })).toEqual(
      {}
    )
    expect(
      parseEquipmentRecallRegistry({
        'recall:bad': {
          campaignId: 'recall:bad',
          obligations: {
            bad: {
              instanceId: 'bad',
              applicability: 'unknown',
              state: 'remediated',
              reason: 'provenance_missing',
              observedCondition: 'damaged',
            },
          },
        },
      })['recall:bad']?.obligations
    ).toEqual({})
  })

  it('hard-stops a confirmed recall even when inspection is current', () => {
    const state = recallState()
    const current = state.equipmentInstances?.affected_outstanding
    if (!current?.containmentIntegrity) throw new Error('missing current inspection fixture')
    const result = reconcileEquipmentRecall(
      {
        ...state,
        week: 2,
        equipmentInstances: {
          ...state.equipmentInstances,
          affected_outstanding: {
            ...current,
            containmentIntegrity: { ...current.containmentIntegrity, lastInspectionWeek: 2 },
          },
        },
      },
      campaign
    )
    expect(result.record.obligations.affected_outstanding?.state).toBe('dispositioned')
    expect(
      result.state.equipmentInstances?.affected_outstanding?.containmentIntegrity?.deficiency
    ).toEqual({ kind: 'hard_stop' })
  })

  it('closes an initially operational obligation after authoritative deficiency relief', () => {
    const opened = reconcileEquipmentRecall(recallState(), campaign)
    const stabilized = stabilizeContainmentClassDeficiency(opened.state, 'affected_outstanding')
    if (!stabilized.ok) throw new Error(stabilized.code)
    const cleared = stabilizeContainmentClassDeficiency(stabilized.state, 'affected_outstanding')
    if (!cleared.ok) throw new Error(cleared.code)
    expect(
      reconcileEquipmentRecall(cleared.state, campaign).record.obligations.affected_outstanding
        ?.state
    ).toBe('remediated')
  })
})
