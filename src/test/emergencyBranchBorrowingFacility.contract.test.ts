import { describe, expect, it } from 'vitest'
import {
  EMERGENCY_BORROWING_FACILITY_ID,
  STRAINED_BRANCH_ID,
  authoredStrainedBranchBorrowingFixture,
  evaluateEmergencyBorrowingAccess,
  projectBorrowingLaterCost,
  projectBranchBorrowingOutcomeDelta,
  projectEmergencyBorrowingEvent,
} from '../domain/emergencyBranchBorrowingFacility'

describe('SPE-1173 emergency branch borrowing facility', () => {
  it('grants temporary emergency support to a strained branch through the shared facility', () => {
    const fixture = authoredStrainedBranchBorrowingFixture()
    expect(fixture.access.facilityId).toBe(EMERGENCY_BORROWING_FACILITY_ID)
    expect(fixture.access.branchId).toBe(STRAINED_BRANCH_ID)
    expect(fixture.access.accessAllowed).toBe(true)
    expect(fixture.event.temporarySupportReceived).toBe(true)
    expect(fixture.event.disposition).toBe('granted')
    expect(fixture.event.inspectable).toBe(true)
  })

  it('fails closed on malformed access packets and blocks consequence-free rescue', () => {
    expect(evaluateEmergencyBorrowingAccess(null)).toBeUndefined()
    expect(
      evaluateEmergencyBorrowingAccess({
        facilityId: EMERGENCY_BORROWING_FACILITY_ID,
        branchId: STRAINED_BRANCH_ID,
        underStrain: true,
        disclosedStrain: true,
        reserveClass: 'staff',
        accessConditions: [],
        centerReserveAvailable: true,
      })?.accessAllowed
    ).toBe(false)

    expect(
      evaluateEmergencyBorrowingAccess({
        facilityId: EMERGENCY_BORROWING_FACILITY_ID,
        branchId: STRAINED_BRANCH_ID,
        underStrain: false,
        disclosedStrain: false,
        reserveClass: 'funds',
        accessConditions: ['collateral'],
        centerReserveAvailable: true,
      })?.refusalReason
    ).toBe('not_under_strain')
  })

  it('creates later cost through stigma, audit pressure, or tighter supervision after a grant', () => {
    const fixture = authoredStrainedBranchBorrowingFixture()
    expect(fixture.laterCost.laterCostCreated).toBe(true)
    expect(fixture.laterCost.costKinds).toEqual(
      expect.arrayContaining(['stigma', 'audit_pressure', 'tighter_supervision'])
    )

    const deniedCost = projectBorrowingLaterCost({
      eventId: 'borrow:denied',
      disposition: 'denied',
      temporarySupportReceived: false,
      accessConditions: ['stigma'],
    })
    expect(deniedCost?.laterCostCreated).toBe(false)
  })

  it('changes branch outcomes when the facility is used, denied, or concealed', () => {
    const granted = authoredStrainedBranchBorrowingFixture().outcome
    expect(granted.outcomeDiffersBecauseOfFacility).toBe(true)
    expect(granted.outcomeNote).toBe('stabilized_by_grant')
    expect(granted.resultingStability).toBe('stable')

    const denied = projectBranchBorrowingOutcomeDelta({
      branchId: STRAINED_BRANCH_ID,
      disposition: 'denied',
      temporarySupportReceived: false,
      baselineStability: 'strained',
    })
    expect(denied).toMatchObject({
      outcomeDiffersBecauseOfFacility: true,
      outcomeNote: 'worsened_by_denial',
      resultingStability: 'collapsing',
    })

    const concealed = projectBranchBorrowingOutcomeDelta({
      branchId: STRAINED_BRANCH_ID,
      disposition: 'concealed',
      temporarySupportReceived: false,
      baselineStability: 'strained',
    })
    expect(concealed).toMatchObject({
      outcomeDiffersBecauseOfFacility: true,
      outcomeNote: 'concealed_strain_unresolved',
      resultingStability: 'strained',
    })
  })

  it('does not deliver temporary support when access was not allowed', () => {
    const event = projectEmergencyBorrowingEvent({
      eventId: 'borrow:invalid-grant',
      facilityId: EMERGENCY_BORROWING_FACILITY_ID,
      branchId: STRAINED_BRANCH_ID,
      reserveClass: 'vehicles',
      disposition: 'granted',
      accessAllowed: false,
    })
    expect(event?.temporarySupportReceived).toBe(false)
  })
})
