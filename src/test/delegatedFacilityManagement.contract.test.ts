import { describe, expect, it } from 'vitest'
import {
  DELEGATED_FACILITY_ID,
  DELEGATED_MANAGER_ID,
  projectDelegatedAbsenceOperation,
  projectDelegatedMaintenanceRecoveryIntent,
  projectDelegatedManagerAssignment,
  projectDelegatedManagerRiskEffects,
  projectDelegationControlBandwidthTradeoff,
} from '../domain/delegatedFacilityManagement'

function buildAnnexManagerFixture() {
  const assignment = projectDelegatedManagerAssignment({
    facilityId: DELEGATED_FACILITY_ID,
    managerId: DELEGATED_MANAGER_ID,
    role: 'deputy',
    competence: 'high',
    loyalty: 'moderate',
    ambition: 'moderate',
    autonomy: 'moderate',
    legitimacyAuthority: 'owner',
    serviceNodeFront: true,
  })
  if (!assignment) {
    throw new Error('SPE-1565 fixture: assignment failed closed unexpectedly')
  }

  const absence = projectDelegatedAbsenceOperation({
    facilityId: DELEGATED_FACILITY_ID,
    managerId: DELEGATED_MANAGER_ID,
    assignmentValid: assignment.assignmentValid,
    playerAbsent: true,
    competence: assignment.competence,
    loyalty: assignment.loyalty,
    ambition: assignment.ambition,
  })
  if (!absence) {
    throw new Error('SPE-1565 fixture: absence operation failed closed unexpectedly')
  }

  const risks = projectDelegatedManagerRiskEffects({
    managerId: DELEGATED_MANAGER_ID,
    competence: assignment.competence,
    loyalty: assignment.loyalty,
    ambition: assignment.ambition,
    autonomy: assignment.autonomy,
  })
  if (!risks) {
    throw new Error('SPE-1565 fixture: risk projection failed closed unexpectedly')
  }

  const tradeoff = projectDelegationControlBandwidthTradeoff({
    facilityId: DELEGATED_FACILITY_ID,
    assignmentValid: assignment.assignmentValid,
    playerDirectControl: false,
    autonomy: assignment.autonomy,
  })
  if (!tradeoff) {
    throw new Error('SPE-1565 fixture: tradeoff projection failed closed unexpectedly')
  }

  const recoveryIntent = projectDelegatedMaintenanceRecoveryIntent({
    facilityId: DELEGATED_FACILITY_ID,
    managerId: DELEGATED_MANAGER_ID,
    assignmentValid: assignment.assignmentValid,
    competence: assignment.competence,
    loyalty: assignment.loyalty,
    routineMaintenanceAction: true,
  })
  if (!recoveryIntent) {
    throw new Error('SPE-1565 fixture: recovery intent failed closed unexpectedly')
  }

  return Object.freeze({ assignment, absence, risks, tradeoff, recoveryIntent })
}

describe('SPE-1565 delegated facility management', () => {
  it('runs a facility in player absence through a delegated manager', () => {
    const fixture = buildAnnexManagerFixture()
    expect(fixture.assignment.facilityId).toBe(DELEGATED_FACILITY_ID)
    expect(fixture.assignment.managerId).toBe(DELEGATED_MANAGER_ID)
    expect(fixture.assignment.assignmentValid).toBe(true)
    expect(fixture.assignment.masksHiddenFunction).toBe(true)
    expect(fixture.absence.runsInPlayerAbsence).toBe(true)
    expect(fixture.absence.outcome).toBe('improve')
    expect(fixture.absence.inspectable).toBe(true)
  })

  it('lets manager attributes change maintenance, growth, or compromise risk materially', () => {
    const fixture = buildAnnexManagerFixture()
    expect(fixture.risks.attributesMateriallyChangeRisk).toBe(true)
    expect(fixture.risks.maintenanceRisk).toBe('reduced')
    expect(fixture.risks.growthRisk).toBe('reduced')

    const ambitious = projectDelegatedManagerRiskEffects({
      managerId: 'manager:ambitious',
      competence: 'high',
      loyalty: 'moderate',
      ambition: 'high',
      autonomy: 'moderate',
    })
    expect(ambitious?.growthRisk).toBe('elevated')

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
    const fixture = buildAnnexManagerFixture()
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
    const fixture = buildAnnexManagerFixture()
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
        serviceNodeFront: true,
      })
    ).toMatchObject({
      assignmentValid: false,
      masksHiddenFunction: false,
    })
  })
})
