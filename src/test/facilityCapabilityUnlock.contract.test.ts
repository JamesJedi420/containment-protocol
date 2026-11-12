import { describe, expect, it } from 'vitest'
import { hydrateGame, stripGameTemplates } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import { advanceFacilityUpgrades } from '../domain/facility'
import {
  FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
  FACILITY_CAPABILITY_UNLOCK_ID,
  FACILITY_CAPABILITY_UNLOCK_LIABILITY,
  deriveFacilityCapabilityEffectiveUse,
  sanitizeFacilityCapabilityUnlock,
} from '../domain/facilityCapabilityUnlock'
import {
  type FacilityDependencyAvailability,
  readRepresentativeFacilityDependencyGraph,
} from '../domain/facilityDependencyGraph'
import {
  type FacilityDependencyInputResolution,
  resolveExplicitFacilityDependencyAvailability,
} from '../domain/facilityDependencyInputs'
import type { FacilityEffect, FacilityInstance, GameState } from '../domain/models'

const HUB = 'core:facility_hub'
const ROUTING = 'service:routing'
const ALERT = 'capability:alert_timing'
const LOGISTICS = 'capability:logistics_freshness'
const ARCHIVE = 'service:archive_integrity'
const NODE_IDS = [HUB, ROUTING, ALERT, LOGISTICS, ARCHIVE] as const

function packet(
  overrides: Partial<Record<string, FacilityDependencyAvailability>> = {}
): Record<string, { availability: FacilityDependencyAvailability; sourceRef: string }> {
  const inputs: Record<
    string,
    { availability: FacilityDependencyAvailability; sourceRef: string }
  > = {}
  for (const id of NODE_IDS) {
    inputs[id] = {
      availability: overrides[id] ?? 'ready',
      sourceRef: `source:${id}`,
    }
  }
  return inputs
}

function resolution(
  overrides: Partial<Record<string, FacilityDependencyAvailability>> = {}
): FacilityDependencyInputResolution {
  return resolveExplicitFacilityDependencyAvailability(
    readRepresentativeFacilityDependencyGraph(),
    packet(overrides)
  )
}

function facility(
  overrides: Partial<FacilityInstance> & Pick<FacilityInstance, 'facilityId'>
): FacilityInstance {
  return {
    category: overrides.facilityId,
    level: 1,
    status: 'upgrading',
    effects: { researchSlots: 2 },
    upgradeInProgress: true,
    upgradeStartedWeek: 10,
    upgradeCompleteWeek: 12,
    pendingEffectDeltas: { researchSlots: 1 },
    ...overrides,
  }
}

function campaign(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createStartingState(),
    week: 12,
    ...overrides,
  }
}

describe('SPE-3388 facility capability unlock', () => {
  it('uses the production biohazard facility id without a second catalog', () => {
    expect(FACILITY_CAPABILITY_UNLOCK_FACILITY_ID).toBe(BIOHAZARD_RESPONSE_FACILITY_ID)
    expect(FACILITY_CAPABILITY_UNLOCK_ID).toBe(ALERT)
    expect(FACILITY_CAPABILITY_UNLOCK_ID).not.toBe(LOGISTICS)
  })

  it('grants one unlock and its liability when the lab upgrade completes at level 2', () => {
    const before = facility({ facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID })
    const state = campaign({
      facilityState: { facilities: { [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: before } },
    })
    const granted = advanceFacilityUpgrades(state)
    expect(granted.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]).toMatchObject(
      {
        level: 2,
        status: 'active',
        effects: { researchSlots: 3 },
      }
    )
    expect(
      granted.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.pendingEffectDeltas
    ).toBeUndefined()
    expect(granted.facilityCapabilityUnlock).toEqual({
      capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
      liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
      acquiredWeek: 12,
    })
    expect(granted.facilityCapabilityUnlock).not.toBe(state.facilityCapabilityUnlock)
  })

  it('does not rewrite the unlock or installed effects on a second completion', () => {
    const first = advanceFacilityUpgrades(
      campaign({
        facilityState: {
          facilities: {
            [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: facility({
              facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
            }),
          },
        },
      })
    )
    const unlock = first.facilityCapabilityUnlock
    const effects = first.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.effects
    const again = advanceFacilityUpgrades({
      ...first,
      week: 20,
      facilityState: {
        facilities: {
          [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: {
            ...first.facilityState!.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]!,
            status: 'upgrading',
            upgradeInProgress: true,
            upgradeStartedWeek: 18,
            upgradeCompleteWeek: 20,
            pendingEffectDeltas: { trainingSlots: 4 },
          },
        },
      },
    })
    expect(again.facilityCapabilityUnlock).toBe(unlock)
    expect(again.facilityCapabilityUnlock).toEqual({
      capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
      liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
      acquiredWeek: 12,
    })
    expect(
      again.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.effects
    ).toEqual({
      ...effects,
      trainingSlots: 4,
    })
    expect(again.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.level).toBe(3)
  })

  it('refuses an unqualified, in-progress, missing, or unrelated upgrade', () => {
    const low = advanceFacilityUpgrades(
      campaign({
        facilityState: {
          facilities: {
            [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: facility({
              facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
              level: 0,
            }),
          },
        },
      })
    )
    expect(low.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.level).toBe(1)
    expect(low.facilityCapabilityUnlock).toBeUndefined()

    const pending = campaign({
      week: 11,
      facilityState: {
        facilities: {
          [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: facility({
            facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
          }),
        },
      },
    })
    expect(advanceFacilityUpgrades(pending)).toBe(pending)
    expect(pending.facilityCapabilityUnlock).toBeUndefined()

    const missing = campaign({ facilityState: { facilities: {} } })
    expect(advanceFacilityUpgrades(missing)).toBe(missing)

    const otherEffects: FacilityEffect = { researchSlots: 2 }
    const other = advanceFacilityUpgrades(
      campaign({
        facilityState: {
          facilities: {
            research_lab: facility({
              facilityId: 'research_lab',
              effects: otherEffects,
              pendingEffectDeltas: { researchSlots: 1 },
            }),
          },
        },
      })
    )
    expect(other.facilityCapabilityUnlock).toBeUndefined()
    expect(other.facilityState?.facilities.research_lab?.effects).toEqual({ researchSlots: 3 })
  })

  it('suspends and restores effective use without clearing the unlock', () => {
    const granted = advanceFacilityUpgrades(
      campaign({
        facilityState: {
          facilities: {
            [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: facility({
              facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
            }),
          },
        },
      })
    )
    const unlock = granted.facilityCapabilityUnlock
    expect(unlock).toBeDefined()
    if (!unlock) throw new Error('expected unlock')

    const ready = deriveFacilityCapabilityEffectiveUse(unlock, resolution())
    const degraded = deriveFacilityCapabilityEffectiveUse(
      unlock,
      resolution({ [ROUTING]: 'degraded' })
    )
    const suspended = deriveFacilityCapabilityEffectiveUse(
      unlock,
      resolution({ [ALERT]: 'unavailable' })
    )
    const restored = deriveFacilityCapabilityEffectiveUse(unlock, resolution())

    expect(ready).toEqual({ use: 'ready', capabilityId: ALERT, unlock })
    expect(degraded).toEqual({ use: 'degraded', capabilityId: ALERT, unlock })
    expect(suspended).toEqual({ use: 'suspended', capabilityId: ALERT, unlock })
    expect(restored).toEqual(ready)
    expect(ready.unlock).toBe(unlock)
    expect(degraded.unlock).toBe(unlock)
    expect(suspended.unlock).toBe(unlock)
    expect(restored.unlock).toBe(unlock)
    expect(granted.facilityCapabilityUnlock).toEqual({
      capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
      liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
      acquiredWeek: 12,
    })
  })

  it('suspends on a rejected resolution or a missing alert node and leaves the record', () => {
    const unlock = {
      capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
      liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
      acquiredWeek: 4,
    } as const
    const rejected = resolveExplicitFacilityDependencyAvailability(
      readRepresentativeFacilityDependencyGraph(),
      { status: 'active' }
    )
    expect(rejected.ok).toBe(false)
    expect(deriveFacilityCapabilityEffectiveUse(unlock, rejected)).toEqual({
      use: 'suspended',
      capabilityId: ALERT,
      unlock,
    })

    const missing: FacilityDependencyInputResolution = { ok: true, results: [], inputs: {} }
    expect(deriveFacilityCapabilityEffectiveUse(unlock, missing).use).toBe('suspended')
    expect(deriveFacilityCapabilityEffectiveUse(unlock, missing).unlock).toBe(unlock)

    expect(deriveFacilityCapabilityEffectiveUse(undefined, resolution()).use).toBe('never_unlocked')
    expect(deriveFacilityCapabilityEffectiveUse(undefined, resolution()).unlock).toBeUndefined()
  })

  it('preserves a well-formed unlock across save and load, including a later locked facility', () => {
    const granted = advanceFacilityUpgrades(
      campaign({
        facilityState: {
          facilities: {
            [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: facility({
              facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
            }),
          },
        },
      })
    )
    const locked: GameState = {
      ...granted,
      facilityState: {
        facilities: {
          [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: {
            ...granted.facilityState!.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]!,
            status: 'locked',
          },
        },
      },
    }
    const loaded = hydrateGame(JSON.parse(JSON.stringify(stripGameTemplates(locked))))
    expect(loaded.facilityCapabilityUnlock).toEqual(granted.facilityCapabilityUnlock)
    expect(loaded.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.status).toBe(
      'locked'
    )
    expect(
      loaded.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]?.effects
    ).toEqual({ researchSlots: 3 })
    expect(loaded.facilityCapabilityUnlock).toEqual(
      hydrateGame(JSON.parse(JSON.stringify(stripGameTemplates(loaded)))).facilityCapabilityUnlock
    )
  })

  it('omits a legacy save and drops tampered packets without fabricating an unlock', () => {
    const legacy = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(legacy.facilityCapabilityUnlock).toBeUndefined()

    const packets: unknown[] = [
      [{ capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: 4 }],
      [
        { capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: 4 },
        { capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: 4 },
      ],
      {
        capabilityId: 'capability:logistics_freshness',
        liability: 'dangerous_use',
        acquiredWeek: 4,
      },
      { capabilityId: ALERT, liability: 'corruption', acquiredWeek: 4 },
      { capabilityId: ALERT, acquiredWeek: 4 },
      { capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: 4, extra: true },
      { capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: Number.NaN },
      { capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: 1.5 },
      { capabilityId: ALERT, liability: 'dangerous_use', acquiredWeek: 0 },
    ]
    for (const facilityCapabilityUnlock of packets) {
      expect(sanitizeFacilityCapabilityUnlock(facilityCapabilityUnlock)).toBeUndefined()
      const loaded = hydrateGame({ ...createStartingState(), facilityCapabilityUnlock })
      expect(loaded.facilityCapabilityUnlock).toBeUndefined()
    }

    const kept = hydrateGame({
      ...createStartingState(),
      facilityState: {
        facilities: {
          [FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]: {
            facilityId: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
            category: FACILITY_CAPABILITY_UNLOCK_FACILITY_ID,
            level: 1,
            status: 'active',
            effects: { researchSlots: 2 },
          },
        },
      },
      facilityCapabilityUnlock: {
        capabilityId: ALERT,
        liability: 'dangerous_use',
        acquiredWeek: 4,
      },
    })
    expect(kept.facilityCapabilityUnlock).toEqual({
      capabilityId: ALERT,
      liability: 'dangerous_use',
      acquiredWeek: 4,
    })
    expect(kept.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]).toMatchObject({
      level: 1,
      effects: { researchSlots: 2 },
    })
  })
})
