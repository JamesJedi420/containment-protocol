import { describe, expect, it } from 'vitest'
import {
  ASSET_CLASSES,
  DEMO_AGENCY_ALPHA,
  DEMO_AGENCY_BETA,
  DEMO_EQUIPMENT_ASSET_ID,
  DEMO_PERSONNEL_ASSET_ID,
  DEMO_PERSONNEL_OWNERSHIP,
  INTER_AGENCY_OWNERSHIP_TRANSFER_OWNER,
  INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
  TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS,
  applyInternalReassignment,
  attemptTransferDuringLock,
  authorizeTransferRequest,
  completeForcedAdminOwnershipTransfer,
  completeOwnershipTransfer,
  createDemoInterAgencyOwnershipTransferState,
  evaluateTransferEligibility,
  expireLocksAtWeek,
  parseInterAgencyOwnershipTransferState,
} from './interAgencyOwnershipTransfer'

function standardRequest(overrides: {
  requestId: string
  assetId: string
  assetClass: 'personnel' | 'equipment'
  week: number
  authorizationRef?: string
}) {
  return {
    requestId: overrides.requestId,
    assetId: overrides.assetId,
    assetClass: overrides.assetClass,
    fromAgencyId: DEMO_AGENCY_ALPHA,
    toAgencyId: DEMO_AGENCY_BETA,
    authoritativeWeek: overrides.week,
    mode: 'standard' as const,
    authorizationRef: overrides.authorizationRef ?? 'gov:transfer-memo-001',
  }
}

describe('SPE-2738 inter-agency ownership transfer governance', () => {
  it('exports frozen contract metadata and asset-class lock durations', () => {
    expect(INTER_AGENCY_OWNERSHIP_TRANSFER_OWNER).toBe('SPE-2738')
    expect(INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION).toBe('spe-2738.v1')
    expect(ASSET_CLASSES).toContain('personnel')
    expect(TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS.personnel).toBe(8)
    expect(TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS.equipment).toBe(4)
  })

  it('completes personnel and equipment transfers through the same path', () => {
    let state = createDemoInterAgencyOwnershipTransferState()

    const personnelAuth = authorizeTransferRequest(
      state,
      standardRequest({
        requestId: 'xfer:personnel-001',
        assetId: DEMO_PERSONNEL_ASSET_ID,
        assetClass: 'personnel',
        week: 10,
      }),
    )
    expect(personnelAuth.authorized).toBe(true)

    const personnelDone = completeOwnershipTransfer(
      state,
      standardRequest({
        requestId: 'xfer:personnel-001',
        assetId: DEMO_PERSONNEL_ASSET_ID,
        assetClass: 'personnel',
        week: 10,
      }),
      personnelAuth,
    )
    expect(personnelDone.outcome).toBe('completed')
    state = personnelDone.state
    expect(state.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId).toBe(DEMO_AGENCY_BETA)
    expect(state.provenance[DEMO_PERSONNEL_ASSET_ID]?.length).toBe(1)
    expect(Object.keys(state.locks)).toEqual([DEMO_PERSONNEL_ASSET_ID])

    const equipmentAuth = authorizeTransferRequest(
      state,
      standardRequest({
        requestId: 'xfer:equipment-001',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 11,
      }),
    )
    const equipmentDone = completeOwnershipTransfer(
      state,
      standardRequest({
        requestId: 'xfer:equipment-001',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 11,
      }),
      equipmentAuth,
    )
    expect(equipmentDone.outcome).toBe('completed')
    state = equipmentDone.state
    expect(state.ownership[DEMO_EQUIPMENT_ASSET_ID]?.owningAgencyId).toBe(DEMO_AGENCY_BETA)
    expect(state.locks[DEMO_EQUIPMENT_ASSET_ID]?.expiresAtWeek).toBe(
      11 + TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS.equipment,
    )
  })

  it('creates exactly one lock and provenance entry on successful transfer', () => {
    const state = createDemoInterAgencyOwnershipTransferState()
    const auth = authorizeTransferRequest(
      state,
      standardRequest({
        requestId: 'xfer:equip-lock',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 5,
      }),
    )
    const done = completeOwnershipTransfer(
      state,
      standardRequest({
        requestId: 'xfer:equip-lock',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 5,
      }),
      auth,
    )
    expect(done.outcome).toBe('completed')
    expect(Object.keys(done.state.locks)).toEqual([DEMO_EQUIPMENT_ASSET_ID])
    expect(done.state.provenance[DEMO_EQUIPMENT_ASSET_ID]).toHaveLength(1)
    expect(done.state.completedRequestIds['xfer:equip-lock']).toBe(true)
  })

  it('rejects second transfer during lock with stable reason and remaining duration', () => {
    let state = createDemoInterAgencyOwnershipTransferState()
    const firstAuth = authorizeTransferRequest(
      state,
      standardRequest({
        requestId: 'xfer:first',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 6,
      }),
    )
    state = completeOwnershipTransfer(
      state,
      standardRequest({
        requestId: 'xfer:first',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 6,
      }),
      firstAuth,
    ).state

    const blocked = attemptTransferDuringLock(state, {
      requestId: 'xfer:second',
      assetId: DEMO_EQUIPMENT_ASSET_ID,
      assetClass: 'equipment',
      fromAgencyId: DEMO_AGENCY_BETA,
      toAgencyId: 'agency:gamma-holding',
      authoritativeWeek: 7,
      mode: 'standard',
      authorizationRef: 'gov:transfer-memo-002',
    })
    expect(blocked.outcome).toBe('rejected')
    expect(blocked.reasonCode).toBe('transfer_lock_active')
    expect(blocked.lockRemainingWeeks).toBe(3)
    expect(blocked.state).toBe(state)
    expect(state.ownership[DEMO_EQUIPMENT_ASSET_ID]?.owningAgencyId).toBe(DEMO_AGENCY_BETA)
  })

  it('expires locks when authoritative week reaches expiration', () => {
    let state = createDemoInterAgencyOwnershipTransferState()
    const auth = authorizeTransferRequest(
      state,
      standardRequest({
        requestId: 'xfer:expire',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 6,
      }),
    )
    state = completeOwnershipTransfer(
      state,
      standardRequest({
        requestId: 'xfer:expire',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 6,
      }),
      auth,
    ).state
    expect(state.locks[DEMO_EQUIPMENT_ASSET_ID]?.expiresAtWeek).toBe(10)

    const stillLocked = expireLocksAtWeek(state, 9)
    expect(stillLocked.locks[DEMO_EQUIPMENT_ASSET_ID]).toBeDefined()

    const expired = expireLocksAtWeek(state, 10)
    expect(expired.locks[DEMO_EQUIPMENT_ASSET_ID]).toBeUndefined()

    const afterExpiry = attemptTransferDuringLock(expired, {
      requestId: 'xfer:after-expiry',
      assetId: DEMO_EQUIPMENT_ASSET_ID,
      assetClass: 'equipment',
      fromAgencyId: DEMO_AGENCY_BETA,
      toAgencyId: 'agency:gamma-holding',
      authoritativeWeek: 10,
      mode: 'standard',
      authorizationRef: 'gov:transfer-memo-003',
    })
    expect(afterExpiry.outcome).toBe('completed')
  })

  it('rejects unauthorized, duplicate, and malformed requests without mutation', () => {
    const state = createDemoInterAgencyOwnershipTransferState()
    const snapshot = JSON.stringify(state)

    const unauthorized = attemptTransferDuringLock(
      state,
      standardRequest({
        requestId: 'xfer:bad-auth',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 8,
        authorizationRef: 'invalid-ref',
      }),
    )
    expect(unauthorized.outcome).toBe('rejected')
    expect(unauthorized.reasonCode).toBe('unauthorized_request')
    expect(JSON.stringify(unauthorized.state)).toBe(snapshot)

    const auth = authorizeTransferRequest(
      state,
      standardRequest({
        requestId: 'xfer:dup',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 8,
      }),
    )
    const first = completeOwnershipTransfer(
      state,
      standardRequest({
        requestId: 'xfer:dup',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 8,
      }),
      auth,
    )
    const duplicate = attemptTransferDuringLock(
      first.state,
      standardRequest({
        requestId: 'xfer:dup',
        assetId: DEMO_EQUIPMENT_ASSET_ID,
        assetClass: 'equipment',
        week: 20,
        authorizationRef: 'gov:transfer-memo-dup',
      }),
    )
    expect(duplicate.outcome).toBe('rejected')
    expect(duplicate.reasonCode).toBe('duplicate_request_id')
    expect(Object.keys(duplicate.state.locks)).toEqual(Object.keys(first.state.locks))

    const malformed = evaluateTransferEligibility(state, {
      requestId: '__proto__',
      assetId: DEMO_EQUIPMENT_ASSET_ID,
      assetClass: 'equipment',
      fromAgencyId: DEMO_AGENCY_ALPHA,
      toAgencyId: DEMO_AGENCY_BETA,
      authoritativeWeek: 8,
      mode: 'standard',
    })
    expect(malformed.eligible).toBe(false)
    expect(malformed.reasonCode).toBe('malformed_request')
  })

  it('applies internal reassignment without transfer provenance or lock', () => {
    const state = createDemoInterAgencyOwnershipTransferState()
    const result = applyInternalReassignment(state, {
      assetId: DEMO_PERSONNEL_ASSET_ID,
      owningAgencyId: DEMO_AGENCY_ALPHA,
      internalAssignmentRef: 'unit:alpha-night-watch',
      authoritativeWeek: 9,
    })
    expect(result.outcome).toBe('applied')
    expect(result.state.ownership[DEMO_PERSONNEL_ASSET_ID]?.internalAssignmentRef).toBe(
      'unit:alpha-night-watch',
    )
    expect(result.state.provenance[DEMO_PERSONNEL_ASSET_ID]).toBeUndefined()
    expect(Object.keys(result.state.locks)).toHaveLength(0)
  })

  it('routes forced admin transfer through the same mutation path', () => {
    const state = createDemoInterAgencyOwnershipTransferState()
    const forced = completeForcedAdminOwnershipTransfer(state, {
      requestId: 'xfer:forced-001',
      assetId: DEMO_PERSONNEL_ASSET_ID,
      assetClass: 'personnel',
      fromAgencyId: DEMO_AGENCY_ALPHA,
      toAgencyId: DEMO_AGENCY_BETA,
      authoritativeWeek: 12,
      mode: 'forced_admin',
      authorizationRef: 'admin:override-773',
    })
    expect(forced.outcome).toBe('completed')
    expect(forced.state.provenance[DEMO_PERSONNEL_ASSET_ID]?.[0]?.kind).toBe(
      'forced_admin_transfer',
    )
    expect(forced.state.locks[DEMO_PERSONNEL_ASSET_ID]?.expiresAtWeek).toBe(
      12 + TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS.personnel,
    )
  })

  it('parses demo state deterministically and rejects prototype ids', () => {
    const demo = createDemoInterAgencyOwnershipTransferState()
    const reparsed = parseInterAgencyOwnershipTransferState(JSON.stringify(demo))
    expect(reparsed).toEqual(demo)
    const pollutedOwnership = Object.create(null) as Record<string, unknown>
    pollutedOwnership['__proto__'] = DEMO_PERSONNEL_OWNERSHIP
    expect(
      parseInterAgencyOwnershipTransferState({
        schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
        ownership: pollutedOwnership,
        provenance: Object.create(null),
        locks: Object.create(null),
        completedRequestIds: Object.create(null),
      }),
    ).toBeNull()
  })
})
