import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  authoredContainmentEgressScreenPolicy,
  CONTAINMENT_EGRESS_BOUNDARY_ZONE_ID,
  CONTAINMENT_EGRESS_SCREEN_CAPABILITY,
  openOutboundScreenHold,
  parseFacilityOutboundScreenHolds,
  RESTRICTED_ASSET_CARRIED_CLASS,
  resolveOutboundScreening,
  resolveOutboundSecondaryScreen,
} from '../domain/containmentZoneOutboundScreening'

const POLICY = authoredContainmentEgressScreenPolicy()

function baseRequest(overrides?: Record<string, unknown>) {
  return {
    direction: 'outbound' as const,
    boundaryZoneId: CONTAINMENT_EGRESS_BOUNDARY_ZONE_ID,
    actorId: 'actor:agent-1',
    actorExposed: false,
    carriedClasses: [] as string[],
    screeningCapabilities: [CONTAINMENT_EGRESS_SCREEN_CAPABILITY],
    policies: [POLICY],
    ...overrides,
  }
}

describe('SPE-3189 containment-zone outbound screening', () => {
  it('clears a clean actor with clean/allowed carried state at a controlled boundary', () => {
    const result = resolveOutboundScreening(baseRequest())
    expect(result).toMatchObject({
      decision: 'clear',
      reasons: ['ok'],
      policyId: POLICY.policyId,
      inventoryUnchanged: true,
    })
  })

  it('holds a prohibited carried class with an inspectable reason and no inventory mutation claim', () => {
    const result = resolveOutboundScreening(
      baseRequest({ carriedClasses: ['contraband_sample'] })
    )
    expect(result).toMatchObject({
      decision: 'hold',
      reasons: ['prohibited_carried_class'],
      followUpOwner: 'procedure',
      inventoryUnchanged: true,
    })
  })

  it('routes an exposed actor to SPE-3151 via decontaminate without inventing exposure state', () => {
    const result = resolveOutboundScreening(baseRequest({ actorExposed: true }))
    expect(result).toMatchObject({
      decision: 'decontaminate',
      reasons: ['actor_exposed'],
      followUpOwner: 'SPE-3151',
      inventoryUnchanged: true,
    })
  })

  it('fails closed when a required screening capability is unavailable', () => {
    const result = resolveOutboundScreening(baseRequest({ screeningCapabilities: [] }))
    expect(result).toMatchObject({
      decision: 'escalate',
      reasons: ['screening_capability_unavailable'],
      inventoryUnchanged: true,
    })
  })

  it('resolves secondary screening to clear or escalate without duplicating holds', () => {
    const screening = baseRequest({ carriedClasses: ['controlled_tool'] })
    const opened = openOutboundScreenHold(createStartingState(), {
      holdId: 'hold:secondary-1',
      idempotencyKey: 'idem:secondary-1',
      screening,
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.hold.state).toBe('secondary_pending')
    expect(opened.hold.decision).toBe('secondary_screen')

    const again = openOutboundScreenHold(opened.state, {
      holdId: 'hold:secondary-1-dup',
      idempotencyKey: 'idem:secondary-1',
      screening,
    })
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.hold.holdId).toBe('hold:secondary-1')
    expect(Object.keys(again.state.facilityOutboundScreenHolds ?? {})).toEqual(['hold:secondary-1'])

    const cleared = resolveOutboundSecondaryScreen(opened.state, {
      holdId: 'hold:secondary-1',
      outcome: 'clear',
    })
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect(cleared.hold.state).toBe('cleared')
    expect(cleared.hold.decision).toBe('clear')
    expect(cleared.hold.reasons).toEqual(
      expect.arrayContaining(['policy_requires_secondary', 'secondary_cleared'])
    )

    const clearedAgain = resolveOutboundSecondaryScreen(cleared.state, {
      holdId: 'hold:secondary-1',
      outcome: 'clear',
    })
    expect(clearedAgain.ok).toBe(true)
    if (!clearedAgain.ok) return
    expect(clearedAgain.hold).toEqual(cleared.hold)
  })

  it('quarantine and custody-transfer decisions do not claim inventory mutation', () => {
    expect(
      resolveOutboundScreening(baseRequest({ carriedClasses: ['cursed_residue'] }))
    ).toMatchObject({
      decision: 'quarantine',
      followUpOwner: 'SPE-2934',
      inventoryUnchanged: true,
    })
    expect(
      resolveOutboundScreening(baseRequest({ carriedClasses: ['custody_parcel'] }))
    ).toMatchObject({
      decision: 'custody_transfer_required',
      followUpOwner: 'custody',
      inventoryUnchanged: true,
    })
  })

  it('repeated screening of unchanged state is byte-stable / idempotent', () => {
    const request = baseRequest({ carriedClasses: ['contraband_sample'] })
    const first = resolveOutboundScreening(request)
    const second = resolveOutboundScreening(request)
    expect(second).toEqual(first)
  })

  it('preserves one canonical hold across save/load hydrate', () => {
    const opened = openOutboundScreenHold(createStartingState(), {
      holdId: 'hold:persist-1',
      idempotencyKey: 'idem:persist-1',
      screening: baseRequest({ carriedClasses: ['contraband_sample'] }),
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const loaded = hydrateGame(structuredClone(opened.state))
    expect(loaded.facilityOutboundScreenHolds?.['hold:persist-1']).toMatchObject({
      holdId: 'hold:persist-1',
      state: 'active',
      decision: 'hold',
      reasons: ['prohibited_carried_class'],
    })

    const parsed = parseFacilityOutboundScreenHolds({
      'hold:persist-1': opened.hold,
      'hold:bad': { holdId: 'mismatch' },
    })
    expect(parsed).toEqual({ 'hold:persist-1': opened.hold })
  })

  it('does not apply egress policy to ingress attempts', () => {
    const result = resolveOutboundScreening(baseRequest({ direction: 'inbound' }))
    expect(result).toMatchObject({
      decision: 'escalate',
      reasons: ['ingress_not_outbound'],
    })
  })

  it('clears an authorized SPE-3188 restricted asset without bypassing other screens', () => {
    const authorized = resolveOutboundScreening(
      baseRequest({
        carriedClasses: [RESTRICTED_ASSET_CARRIED_CLASS],
        restrictedAssetCheckoutAuthorized: true,
      })
    )
    expect(authorized).toMatchObject({
      decision: 'clear',
      reasons: expect.arrayContaining(['ok', 'restricted_asset_authorized']),
    })

    const unauthorized = resolveOutboundScreening(
      baseRequest({
        carriedClasses: [RESTRICTED_ASSET_CARRIED_CLASS],
        restrictedAssetCheckoutAuthorized: false,
      })
    )
    expect(unauthorized).toMatchObject({
      decision: 'hold',
      reasons: ['restricted_asset_unauthorized'],
      followUpOwner: 'SPE-3188',
    })

    const stillScreens = resolveOutboundScreening(
      baseRequest({
        carriedClasses: [RESTRICTED_ASSET_CARRIED_CLASS, 'contraband_sample'],
        restrictedAssetCheckoutAuthorized: true,
      })
    )
    expect(stillScreens).toMatchObject({
      decision: 'hold',
      reasons: ['prohibited_carried_class'],
    })
  })
})
