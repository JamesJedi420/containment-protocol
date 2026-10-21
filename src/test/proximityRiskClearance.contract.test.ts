import { describe, expect, it } from 'vitest'
import {
  evaluateProximityZoneEntry,
  evaluateStrategicEssentialZoneAssignment,
  projectInformationClearanceDecision,
} from '../domain/proximityRiskClearance'

const PROXIMITY_STAFF_ID = 'staff:proximity-eval'
const ANOMALY_CONTACT_ZONE_ID = 'zone:anomaly-direct-contact'
const BRIEFING_ZONE_ID = 'zone:secure-briefing'

describe('SPE-2079 proximity-risk class orthogonal to information clearance', () => {
  it('projects caller-owned information clearance independently', () => {
    expect(
      projectInformationClearanceDecision({
        outcome: 'allowed',
        clearanceLevel: 5,
      })
    ).toMatchObject({
      informationAllowed: true,
      clearanceLevel: 5,
    })

    expect(
      projectInformationClearanceDecision({
        outcome: 'denied',
        reasonCode: 'read_in_incomplete',
      })
    ).toMatchObject({
      informationAllowed: false,
      reasonCode: 'read_in_incomplete',
    })

    expect(projectInformationClearanceDecision({ outcome: 'maybe' })).toBeUndefined()
  })

  it('allows information clearance while denying physical zone entry', () => {
    const result = evaluateProximityZoneEntry({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: ANOMALY_CONTACT_ZONE_ID,
      proximityRiskClass: 'proximity_without_knowledge',
      zoneContactKind: 'direct_anomaly_contact',
      informationClearance: { outcome: 'allowed', clearanceLevel: 9 },
    })

    expect(result).toMatchObject({
      informationAllowed: true,
      proximityAllowed: false,
      entryAllowed: false,
      denialReason: 'proximity_class_insufficient',
      orthogonalityPreserved: true,
    })
    expect(result?.reasonCodes).toContain('proximity_class_insufficient')
  })

  it('allows physical proximity while denying information clearance', () => {
    const result = evaluateProximityZoneEntry({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: BRIEFING_ZONE_ID,
      proximityRiskClass: 'local_essential',
      zoneContactKind: 'local_operations',
      informationClearance: {
        outcome: 'denied',
        reasonCode: 'case_not_read_in',
      },
    })

    expect(result).toMatchObject({
      informationAllowed: false,
      proximityAllowed: true,
      informationClearanceRequired: false,
      entryAllowed: true,
      denialReason: 'none',
      orthogonalityPreserved: true,
    })
    expect(result?.reasonCodes).toEqual(
      expect.arrayContaining(['information_clearance_denied', 'case_not_read_in'])
    )
  })

  it('requires information read-in only when the caller explicitly gates the zone', () => {
    const result = evaluateProximityZoneEntry({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: BRIEFING_ZONE_ID,
      proximityRiskClass: 'local_essential',
      zoneContactKind: 'local_operations',
      informationClearance: {
        outcome: 'denied',
        reasonCode: 'case_not_read_in',
      },
      requiresInformationClearance: true,
    })

    expect(result).toMatchObject({
      informationAllowed: false,
      informationClearanceRequired: true,
      proximityAllowed: true,
      entryAllowed: false,
      denialReason: 'information_clearance_denied',
    })
    expect(result?.reasonCodes).toContain('case_not_read_in')
  })

  it('rejects under-qualified staff for assignment as well as zone entry', () => {
    const input = {
      staffId: PROXIMITY_STAFF_ID,
      zoneId: ANOMALY_CONTACT_ZONE_ID,
      proximityRiskClass: 'operationally_blind' as const,
      zoneContactKind: 'direct_anomaly_contact' as const,
    }
    expect(evaluateStrategicEssentialZoneAssignment(input)).toMatchObject({
      assignmentAllowed: false,
      denialReason: 'proximity_class_insufficient',
      reasonCodes: expect.arrayContaining(['required:direct_contact']),
    })
    expect(
      evaluateProximityZoneEntry({
        ...input,
        informationClearance: { outcome: 'allowed' },
      })
    ).toMatchObject({
      entryAllowed: false,
      denialReason: 'proximity_class_insufficient',
    })
  })

  it('bars strategic-essential from direct anomaly-contact without policy breach flag', () => {
    const assignment = evaluateStrategicEssentialZoneAssignment({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: ANOMALY_CONTACT_ZONE_ID,
      proximityRiskClass: 'strategic_essential_no_entry',
      zoneContactKind: 'direct_anomaly_contact',
    })
    expect(assignment).toMatchObject({
      assignmentAllowed: false,
      denialReason: 'strategic_essential_contact_barred',
      policyBreachFlag: false,
    })

    const deniedEntry = evaluateProximityZoneEntry({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: ANOMALY_CONTACT_ZONE_ID,
      proximityRiskClass: 'strategic_essential_no_entry',
      zoneContactKind: 'direct_anomaly_contact',
      informationClearance: { outcome: 'allowed', clearanceLevel: 10 },
    })
    expect(deniedEntry).toMatchObject({
      informationAllowed: true,
      proximityAllowed: false,
      entryAllowed: false,
      denialReason: 'strategic_essential_contact_barred',
      strategicEssentialContactRequiresBreach: true,
    })
    expect(deniedEntry?.reasonCodes).toContain('strategic_essential_contact_barred')
  })

  it('allows strategic-essential direct contact only with explicit policy breach flag', () => {
    const assignment = evaluateStrategicEssentialZoneAssignment({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: ANOMALY_CONTACT_ZONE_ID,
      proximityRiskClass: 'strategic_essential_no_entry',
      zoneContactKind: 'direct_anomaly_contact',
      policyBreachFlag: true,
    })
    expect(assignment).toMatchObject({
      assignmentAllowed: true,
      denialReason: 'none',
      policyBreachFlag: true,
    })
    expect(assignment?.reasonCodes).toContain('policy_breach_flag_acknowledged')

    const entry = evaluateProximityZoneEntry({
      staffId: PROXIMITY_STAFF_ID,
      zoneId: ANOMALY_CONTACT_ZONE_ID,
      proximityRiskClass: 'strategic_essential_no_entry',
      zoneContactKind: 'direct_anomaly_contact',
      informationClearance: { outcome: 'allowed', clearanceLevel: 10 },
      policyBreachFlag: true,
    })
    expect(entry).toMatchObject({
      entryAllowed: true,
      proximityAllowed: true,
      denialReason: 'none',
      policyBreachFlag: true,
    })
    expect(entry?.reasonCodes).toContain('policy_breach_flag_acknowledged')
  })

  it('admits matching proximity + information and fails closed on malformed input', () => {
    expect(
      evaluateProximityZoneEntry({
        staffId: PROXIMITY_STAFF_ID,
        zoneId: ANOMALY_CONTACT_ZONE_ID,
        proximityRiskClass: 'direct_contact',
        zoneContactKind: 'direct_anomaly_contact',
        informationClearance: { outcome: 'allowed' },
      })
    ).toMatchObject({
      entryAllowed: true,
      denialReason: 'none',
    })

    expect(
      evaluateProximityZoneEntry({
        staffId: '',
        zoneId: ANOMALY_CONTACT_ZONE_ID,
        proximityRiskClass: 'direct_contact',
        zoneContactKind: 'direct_anomaly_contact',
        informationClearance: { outcome: 'allowed' },
      })
    ).toBeUndefined()

    expect(
      evaluateProximityZoneEntry({
        staffId: PROXIMITY_STAFF_ID,
        zoneId: BRIEFING_ZONE_ID,
        proximityRiskClass: 'local_essential',
        zoneContactKind: 'local_operations',
        informationClearance: { outcome: 'allowed' },
        requiresInformationClearance: 'not_a_boolean',
      })
    ).toBeUndefined()

    expect(
      evaluateProximityZoneEntry({
        staffId: PROXIMITY_STAFF_ID,
        zoneId: ANOMALY_CONTACT_ZONE_ID,
        proximityRiskClass: 'not_a_class',
        zoneContactKind: 'direct_anomaly_contact',
        informationClearance: { outcome: 'allowed' },
      })
    ).toBeUndefined()
  })
})
