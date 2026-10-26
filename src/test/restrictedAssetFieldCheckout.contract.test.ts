import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  recordRestrictedObjectStored,
  RELIQUARY_KEY_SET_COMPONENT_IDS,
  RELIQUARY_KEY_SET_ID,
  resolveRestrictedObjectRelease,
} from '../domain/facilityRestrictedObjectRelease'
import {
  authorizeRestrictedAssetCheckout,
  authoredReliquaryFieldCheckoutFixture,
  evaluateRestrictedAssetCheckoutOverdue,
  parseFacilityRestrictedAssetCheckouts,
  presentRestrictedAssetReturn,
  resolveRestrictedAssetCheckoutAuthorization,
  resolveRestrictedAssetCheckoutFailure,
  startRestrictedAssetCheckout,
  verifyRestrictedAssetReturn,
} from '../domain/restrictedAssetFieldCheckout'

const FIXTURE = authoredReliquaryFieldCheckoutFixture()

function withStoredSet(state = createStartingState()) {
  const stored = recordRestrictedObjectStored(state, {
    setId: RELIQUARY_KEY_SET_ID,
    components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
  })
  expect(stored.ok).toBe(true)
  if (!stored.ok) throw new Error('expected stored set')
  return stored.state
}

describe('SPE-3188 restricted-asset field checkout', () => {
  it('authorizes, checks out, presents, and verifies return restoring SPE-2911 stored without changing set identity', () => {
    const baseline = withStoredSet()
    const inventoryBefore = structuredClone(baseline.inventory)

    const authorized = authorizeRestrictedAssetCheckout(baseline, {
      ...FIXTURE,
      authorized: true,
      requiresIndependentVerifier: true,
    })
    expect(authorized.ok).toBe(true)
    if (!authorized.ok) return
    expect(authorized.checkout.state).toBe('authorized')
    expect(authorized.checkout.setId).toBe(RELIQUARY_KEY_SET_ID)

    const started = startRestrictedAssetCheckout(authorized.state, {
      checkoutId: FIXTURE.checkoutId,
    })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.checkout.state).toBe('checked_out')
    expect(resolveRestrictedObjectRelease(started.state, { setId: RELIQUARY_KEY_SET_ID })).toMatchObject({
      ok: true,
      mode: 'inspection',
    })

    const presented = presentRestrictedAssetReturn(started.state, {
      checkoutId: FIXTURE.checkoutId,
    })
    expect(presented.ok).toBe(true)
    if (!presented.ok) return
    expect(presented.checkout.state).toBe('return_presented')
    expect(resolveRestrictedObjectRelease(presented.state, { setId: RELIQUARY_KEY_SET_ID })).toMatchObject({
      ok: true,
      mode: 'inspection',
    })

    const custodianVerify = verifyRestrictedAssetReturn(presented.state, {
      checkoutId: FIXTURE.checkoutId,
      verifierId: FIXTURE.custodianId,
    })
    expect(custodianVerify.ok).toBe(false)
    if (custodianVerify.ok) return
    expect(custodianVerify.code).toBe('verifier_ineligible')
    expect(custodianVerify.state).toBe(presented.state)

    const verified = verifyRestrictedAssetReturn(presented.state, {
      checkoutId: FIXTURE.checkoutId,
      verifierId: FIXTURE.verifierId,
    })
    expect(verified.ok).toBe(true)
    if (!verified.ok) return
    expect(verified.checkout.state).toBe('closed')
    expect(verified.checkout.attestedVerifierId).toBe(FIXTURE.verifierId)
    expect(resolveRestrictedObjectRelease(verified.state, { setId: RELIQUARY_KEY_SET_ID })).toMatchObject({
      ok: true,
      mode: 'stored',
      components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    })
    expect(verified.state.inventory).toEqual(inventoryBefore)

    const again = verifyRestrictedAssetReturn(verified.state, {
      checkoutId: FIXTURE.checkoutId,
      verifierId: FIXTURE.verifierId,
    })
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.state).toBe(verified.state)
    expect(again.checkout.state).toBe('closed')
  })

  it('fails closed for unauthorized checkout and incomplete component sets', () => {
    const baseline = withStoredSet()
    const denied = authorizeRestrictedAssetCheckout(baseline, {
      ...FIXTURE,
      authorized: false,
    })
    expect(denied.ok).toBe(false)
    if (denied.ok) return
    expect(denied.code).toBe('unauthorized')
    expect(denied.state).toBe(baseline)

    const incomplete = authorizeRestrictedAssetCheckout(baseline, {
      ...FIXTURE,
      authorized: true,
      components: [RELIQUARY_KEY_SET_COMPONENT_IDS[0]],
    })
    expect(incomplete.ok).toBe(false)
    if (incomplete.ok) return
    expect(incomplete.code).toBe('incomplete_set')
    expect(incomplete.state).toBe(baseline)
  })

  it('marks overdue after the return deadline and supports lost without inventing inventory', () => {
    const baseline = withStoredSet()
    baseline.week = 1
    const authorized = authorizeRestrictedAssetCheckout(baseline, {
      ...FIXTURE,
      authorized: true,
      returnDeadlineWeek: 2,
    })
    expect(authorized.ok).toBe(true)
    if (!authorized.ok) return
    const started = startRestrictedAssetCheckout(authorized.state, {
      checkoutId: FIXTURE.checkoutId,
    })
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const early = evaluateRestrictedAssetCheckoutOverdue(started.state, {
      checkoutId: FIXTURE.checkoutId,
      campaignWeek: 2,
    })
    expect(early.ok).toBe(false)

    const overdue = evaluateRestrictedAssetCheckoutOverdue(started.state, {
      checkoutId: FIXTURE.checkoutId,
      campaignWeek: 3,
    })
    expect(overdue.ok).toBe(true)
    if (!overdue.ok) return
    expect(overdue.checkout.state).toBe('overdue')

    const inventoryBefore = structuredClone(overdue.state.inventory)
    const lost = resolveRestrictedAssetCheckoutFailure(overdue.state, {
      checkoutId: FIXTURE.checkoutId,
      outcome: 'lost',
    })
    expect(lost.ok).toBe(true)
    if (!lost.ok) return
    expect(lost.checkout.state).toBe('lost')
    expect(lost.state.inventory).toEqual(inventoryBefore)
  })

  it('round-trips checkout registry through hydrate without duplication', () => {
    const baseline = withStoredSet()
    const authorized = authorizeRestrictedAssetCheckout(baseline, {
      ...FIXTURE,
      authorized: true,
    })
    expect(authorized.ok).toBe(true)
    if (!authorized.ok) return
    const started = startRestrictedAssetCheckout(authorized.state, {
      checkoutId: FIXTURE.checkoutId,
    })
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const loaded = hydrateGame(structuredClone(started.state))
    expect(loaded.facilityRestrictedAssetCheckouts?.[FIXTURE.checkoutId]?.state).toBe('checked_out')
    expect(loaded.facilityRestrictedObjectRelease?.[RELIQUARY_KEY_SET_ID]?.mode).toBe('inspection')

    const parsed = parseFacilityRestrictedAssetCheckouts({
      [FIXTURE.checkoutId]: {
        ...started.checkout,
        components: ['not-a-component'],
      },
      'bad': { checkoutId: 'mismatch' },
    })
    expect(parsed).toBeUndefined()

    const auth = resolveRestrictedAssetCheckoutAuthorization(loaded, {
      checkoutId: FIXTURE.checkoutId,
    })
    expect(auth).toEqual({
      ok: true,
      authorized: true,
      checkoutId: FIXTURE.checkoutId,
      state: 'checked_out',
    })
  })
})
