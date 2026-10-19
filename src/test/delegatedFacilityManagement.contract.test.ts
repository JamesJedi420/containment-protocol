import { describe, expect, it } from 'vitest'
import {
  DELEGATED_FACILITY_ID,
  DELEGATED_MANAGER_ID,
  authoredDelegatedAnnexManagerFixture,
  projectDelegatedAbsenceOperation,
  projectDelegatedMaintenanceRecoveryIntent,
  projectDelegatedManagerAssignment,
  projectDelegatedManagerRiskEffects,
  projectDelegationControlBandwidthTradeoff,
} from '../domain/delegatedFacilityManagement'

describe('SPE-1565 delegated facility management', () => {
  it('runs a facility in player absence through a delegated manager', () => {
    const fixture = authoredDelegatedAnnexManagerFixture()
    expect(fixture.assignment.facilityId).toBe(DELEGATED_FACILITY_ID)
    expect(fixture.assignment.managerId).toBe(DELEGATED_MANAGER_ID)
    expect(fixture.assignment.assignmentValid).toBe(true)
    expect(fixture.absence.runsInPlayerAbsence).toBe(true)
    expect(fixture.absence.outcome).toBe('improve')
    expect(fixture.absence.inspectable).toBe(true)
  })

  it('lets manager attributes change maintenance, growth, or compromise risk materially', () => {
    const fixture = authoredDelegatedAnnexManagerFixture()
    expect(fixture.risks.attributesMateriallyChangeRisk).toBe(true)
    expect(fixture.risks.maintenanceRisk).toBe('reduced')

    const compromised = projectDelegatedManagerRiskEffects({
      managerId: 'manager:risk',
      competence: 'low',
      loyalty: 'low',
      ambition: 'high',
      autonomy: 'high',
    })
    expect(compromised).toMatchObject({
      maintenanceRisk: 'elevated',
      compromiseRisk: 'elevated',
      attributesMateriallyChangeRisk: true,
    })
  })

  it('creates a meaningful tradeoff between direct control and operational bandwidth', () => {
    const fixture = authoredDelegatedAnnexManagerFixture()
    expect(fixture.tradeoff.tradeoffMeaningful).toBe(true)
    expect(fixture.tradeoff.directControlRetained).toBe(false)
    expect(fixture.tradeoff.operationalBandwidthGained).toBe(true)
    expect(fixture.tradeoff.tradeoffNote).toBe('bandwidth_at_control_cost')

    const direct = projectDelegationControlBandwidthTradeoff({
      facilityId: DELEGATED_FACILITY_ID,
      assignmentValid: true,
      playerDirectControl: true,
      autonomy: 'high',
    })
    expect(direct).toMatchObject({
      tradeoffMeaningful: true,
      directControlRetained: true,
      operationalBandwidthGained: false,
      tradeoffNote: 'direct_control_no_bandwidth',
    })
  })

  it('authorizes existing recovery reuse without minting free maintenance resources', () => {
    const fixture = authoredDelegatedAnnexManagerFixture()
    expect(fixture.recoveryIntent.mayConsumeExistingRecoveryTransaction).toBe(true)
    expect(fixture.recoveryIntent.mintsFreeMaintenanceResources).toBe(false)
    expect(fixture.recoveryIntent.recalculatesDebtPrivately).toBe(false)

    expect(
      projectDelegatedMaintenanceRecoveryIntent({
        facilityId: DELEGATED_FACILITY_ID,
        managerId: DELEGATED_MANAGER_ID,
        assignmentValid: true,
        competence: 'low',
        loyalty: 'moderate',
        routineMaintenanceAction: true,
      })?.refusalReason
    ).toBe('competence_or_loyalty_blocks')
  })

  it('fails closed on malformed packets and legitimacy-less assignment', () => {
    expect(projectDelegatedManagerAssignment(null)).toBeUndefined()
    expect(projectDelegatedAbsenceOperation(null)).toBeUndefined()
    expect(
      projectDelegatedManagerAssignment({
        facilityId: DELEGATED_FACILITY_ID,
        managerId: DELEGATED_MANAGER_ID,
        role: 'deputy',
        competence: 'high',
        loyalty: 'moderate',
        ambition: 'moderate',
        autonomy: 'moderate',
        legitimacyAuthority: 'none',
        serviceNodeFront: false,
      })?.assignmentValid
    ).toBe(false)
  })
})
