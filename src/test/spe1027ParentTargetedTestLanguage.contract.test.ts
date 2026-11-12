/**
 * SPE-1027 parent AC leftover — targeted-test language.
 * Compose shipped seams (SPE-2890 / 2889 / 2935 / 2891 / 2934 / 2981).
 * Contracts only; no new maps. Child Done ≠ automatic parent Done.
 */
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveDepartmentWorkshopThroughput } from '../domain/departmentWorkshopQueue'
import {
  BODY_TRANSFER_CARGO_ID,
  HANDLERS_AVAILABLE_LABOR,
  resolveFacilityHaulBottleneck,
  stampFacilityHaulingLabor,
} from '../domain/facilityHaulingLabor'
import {
  CURSED_EVIDENCE_MISFILE_ID,
  MISMATCHED_OUTCOME,
  resolveFacilityInventoryMismatch,
  stampFacilityInventoryMismatch,
} from '../domain/facilityInventoryMismatch'
import {
  handleAccessControlledStock,
  MUNDANE_SUPPLIES_ZONE_ID,
  WEAPONS_LOCKER_ALLOWED_ZONE,
  WEAPONS_LOCKER_REQUIRED_CLEARANCE,
  WEAPONS_LOCKER_STORAGE_CLASS_ID,
} from '../domain/facilityStockAccess'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  CLEAN_ISOLATION,
  CURSED_OBJECT_QUARANTINE_NODE_ID,
  QUARANTINED_ISOLATION,
  resolveFacilityQuarantineSeparation,
  stampFacilityQuarantine,
} from '../domain/facilityStockQuarantine'
import {
  applyIncorrectStorageSpoilage,
  COLD_STORAGE_REAGENT_STOCK_ID,
  COLD_STORAGE_ZONE_ID,
  MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID,
  MUNDANE_SUPPLIES_STOCK_ID,
} from '../domain/facilityStockSpoilage'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const CLEARED_ALLOWED = {
  classId: WEAPONS_LOCKER_STORAGE_CLASS_ID,
  staffClearance: WEAPONS_LOCKER_REQUIRED_CLEARANCE,
  destinationZone: WEAPONS_LOCKER_ALLOWED_ZONE,
} as const

const ADJACENT_STAGING = {
  inputStaging: 'adjacent',
  outputStaging: 'adjacent',
} as const

const HAUL_PRESENT = {
  cargoId: BODY_TRANSFER_CARGO_ID,
  labor: HANDLERS_AVAILABLE_LABOR,
} as const

describe('SPE-1027 parent targeted-test language leftovers (SPE-2984)', () => {
  it('storage zoning: cleared staff on allowed zone stamps placement; wrong staff/zone fail-close', () => {
    const state = createStartingState()
    const allowed = handleAccessControlledStock(state, CLEARED_ALLOWED)
    expect(allowed).toMatchObject({
      ok: true,
      classId: WEAPONS_LOCKER_STORAGE_CLASS_ID,
      zone: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
    if (!allowed.ok) throw new Error(allowed.code)
    expect(allowed.state.facilityStockPlacement).toEqual({
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    })

    const uncleared = handleAccessControlledStock(state, {
      ...CLEARED_ALLOWED,
      staffClearance: WEAPONS_LOCKER_REQUIRED_CLEARANCE - 1,
    })
    expect(uncleared).toEqual({ ok: false, state, code: 'clearance_denied' })

    const wrongZone = handleAccessControlledStock(state, {
      ...CLEARED_ALLOWED,
      destinationZone: MUNDANE_SUPPLIES_ZONE_ID,
    })
    expect(wrongZone).toEqual({ ok: false, state, code: 'wrong_zone' })
  })

  it('local staging: fully adjacent staging accelerates workshop throughput vs omit baseline', () => {
    const adjacent = resolveDepartmentWorkshopThroughput(ADJACENT_STAGING)
    expect(adjacent).toEqual({ workUnits: 2, effect: 'adjacent_staging' })

    const omitted = resolveDepartmentWorkshopThroughput(undefined)
    expect(omitted).toEqual({ workUnits: 1, effect: 'baseline' })

    const remote = resolveDepartmentWorkshopThroughput({
      inputStaging: 'remote',
      outputStaging: 'remote',
    })
    expect(remote).toEqual({ workUnits: 1, effect: 'baseline' })
  })

  it('hauling bottlenecks: present handlers resolve moved; omit resolves bottlenecked', () => {
    const state = createStartingState()
    const stamped = stampFacilityHaulingLabor(state, HAUL_PRESENT)
    expect(stamped.ok).toBe(true)
    if (!stamped.ok) throw new Error(stamped.code)

    const moved = resolveFacilityHaulBottleneck(stamped.state, HAUL_PRESENT)
    expect(moved).toMatchObject({
      ok: true,
      cargoId: BODY_TRANSFER_CARGO_ID,
      outcome: 'moved',
      labor: HANDLERS_AVAILABLE_LABOR,
    })

    const omitted = resolveFacilityHaulBottleneck(state, HAUL_PRESENT)
    expect(omitted).toEqual({
      ok: true,
      state,
      cargoId: BODY_TRANSFER_CARGO_ID,
      outcome: 'bottlenecked',
    })
    expect(omitted).not.toMatchObject({ outcome: 'moved' })
  })

  it('spoilage: incorrect zone degrades reagent and contaminates neighbor; correct stays intact', () => {
    const state = createStartingState()
    const intact = applyIncorrectStorageSpoilage(state, {
      stockId: COLD_STORAGE_REAGENT_STOCK_ID,
      storedZone: COLD_STORAGE_ZONE_ID,
    })
    expect(intact.ok).toBe(true)
    if (!intact.ok) throw new Error(intact.code)
    expect(intact.state.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'intact',
    })

    const spoiled = applyIncorrectStorageSpoilage(state, {
      stockId: COLD_STORAGE_REAGENT_STOCK_ID,
      storedZone: MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID,
    })
    expect(spoiled.ok).toBe(true)
    if (!spoiled.ok) throw new Error(spoiled.code)
    expect(spoiled.state.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
  })

  it('quarantine separation: matching isolation resolves separated; omit resolves unknown', () => {
    const state = createStartingState()
    const stamped = stampFacilityQuarantine(state, {
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
    })
    expect(stamped.ok).toBe(true)
    if (!stamped.ok) throw new Error(stamped.code)

    const separated = resolveFacilityQuarantineSeparation(stamped.state, {
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
    })
    expect(separated).toEqual({
      ok: true,
      state: stamped.state,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
      separation: 'separated',
    })

    const clean = stampFacilityQuarantine(state, {
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: CLEAN_ISOLATION,
    })
    expect(clean.ok).toBe(true)
    if (!clean.ok) throw new Error(clean.code)
    const cleanResolved = resolveFacilityQuarantineSeparation(clean.state, {
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: CLEAN_ISOLATION,
    })
    expect(cleanResolved).toMatchObject({
      ok: true,
      isolation: CLEAN_ISOLATION,
      separation: 'separated',
    })
    if (!('isolation' in separated) || !('isolation' in cleanResolved)) {
      throw new Error('expected persisted isolation')
    }
    expect(separated.isolation).not.toBe(cleanResolved.isolation)

    const omitted = resolveFacilityQuarantineSeparation(state, {
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
    })
    expect(omitted).toEqual({
      ok: true,
      state,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      separation: 'unknown',
    })
    expect(omitted).not.toMatchObject({ separation: 'separated' })
  })

  it('inventory mismatch: stamped mismatched resolves mismatched; omit resolves none', () => {
    const state = createStartingState()
    const stamped = stampFacilityInventoryMismatch(state, {
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: MISMATCHED_OUTCOME,
    })
    expect(stamped.ok).toBe(true)
    if (!stamped.ok) throw new Error(stamped.code)

    const mismatched = resolveFacilityInventoryMismatch(stamped.state, {
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
    })
    expect(mismatched).toMatchObject({
      ok: true,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: MISMATCHED_OUTCOME,
    })

    const omitted = resolveFacilityInventoryMismatch(state, {
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
    })
    expect(omitted).toEqual({
      ok: true,
      state,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: 'none',
    })
    expect(omitted).not.toMatchObject({ outcome: MISMATCHED_OUTCOME })
    expect(omitted).not.toMatchObject({ code: 'wrong_zone' })
  })

  it('omit/absent paths do not falsely satisfy parent leftover phrases', () => {
    const state = createStartingState()

    expect(handleAccessControlledStock(state, CLEARED_ALLOWED).ok).toBe(true)
    expect(
      handleAccessControlledStock(state, {
        ...CLEARED_ALLOWED,
        destinationZone: MUNDANE_SUPPLIES_ZONE_ID,
      }).ok
    ).toBe(false)

    expect(resolveDepartmentWorkshopThroughput(undefined).effect).toBe('baseline')
    expect(resolveDepartmentWorkshopThroughput(undefined).workUnits).toBe(1)

    expect(resolveFacilityHaulBottleneck(state, HAUL_PRESENT)).toMatchObject({
      outcome: 'bottlenecked',
    })

    expect(state.facilityStockCondition).toBeUndefined()

    expect(
      resolveFacilityQuarantineSeparation(state, {
        nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
        isolation: QUARANTINED_ISOLATION,
      })
    ).toMatchObject({ separation: 'unknown' })

    expect(
      resolveFacilityInventoryMismatch(state, {
        mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      })
    ).toMatchObject({ outcome: 'none' })
  })

  it('leaves consumeFacilityStock ungated across parent compose scenarios', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }

    const zoned = handleAccessControlledStock(state, CLEARED_ALLOWED)
    if (!zoned.ok) throw new Error(zoned.code)
    const hauled = stampFacilityHaulingLabor(zoned.state, HAUL_PRESENT)
    if (!hauled.ok) throw new Error(hauled.code)
    const spoiled = applyIncorrectStorageSpoilage(hauled.state, {
      stockId: COLD_STORAGE_REAGENT_STOCK_ID,
      storedZone: MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID,
    })
    if (!spoiled.ok) throw new Error(spoiled.code)
    const quarantined = stampFacilityQuarantine(spoiled.state, {
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
    })
    if (!quarantined.ok) throw new Error(quarantined.code)
    const mismatched = stampFacilityInventoryMismatch(quarantined.state, {
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: MISMATCHED_OUTCOME,
    })
    if (!mismatched.ok) throw new Error(mismatched.code)

    const consumed = consumeFacilityStock(mismatched.state, BLAST_DOOR_SPARE_PART_ID)
    expect(consumed.ok).toBe(true)
    if (!consumed.ok) throw new Error(consumed.code)
    expect(consumed.state.facilityStockpile?.[BLAST_DOOR_SPARE_PART_ID]).toBe(1)
  })
})
