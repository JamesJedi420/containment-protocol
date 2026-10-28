import { describe, expect, it } from 'vitest'
import {
  ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
  DEMO_DUTY_OBLIGATION_REGISTRY,
  DUTY_OBLIGATION_REGISTRY_OWNER,
  DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
  DUTY_ROLE_IDS,
  evaluateDutyAgainstRequirementOutcome,
  evaluateOmissionAgainstDuty,
  evaluatePeriodBoundObligation,
  FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
  lookupObligationsForRole,
  parseDutyObligationRegistry,
  parseSpe2805TerminalDecisionProvenance,
} from './dutyObligationRegistry'
import type { DutyConsumptionProjection } from './containmentRequirementFulfillment'

describe('SPE-1135 duty and obligation registry', () => {
  it('exports contract metadata and explicit role obligations', () => {
    expect(DUTY_OBLIGATION_REGISTRY_OWNER).toBe('SPE-1135')
    expect(DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION).toBe('spe-1135.v1')
    expect(DUTY_ROLE_IDS).toContain('field_lead')
    const fieldLead = lookupObligationsForRole(DEMO_DUTY_OBLIGATION_REGISTRY, 'field_lead')
    expect(fieldLead.length).toBeGreaterThan(0)
    expect(fieldLead[0]?.dutyKind).toBe('escalation')
  })

  it('looks up obligations by role deterministically', () => {
    const archivist = lookupObligationsForRole(
      DEMO_DUTY_OBLIGATION_REGISTRY,
      'archivist'
    )
    expect(archivist.map((o) => o.id)).toEqual(['duty:archivist:record-upkeep-q1'])
    expect(lookupObligationsForRole(DEMO_DUTY_OBLIGATION_REGISTRY, 'medic')).toEqual([])
    expect(lookupObligationsForRole(DEMO_DUTY_OBLIGATION_REGISTRY, 'not-a-role')).toEqual([])
  })

  it('evaluates actionable omission against duty rather than outcome alone', () => {
    const omission = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance: { decisionRef: 'dec:corr-1', kind: 'actionable' },
      actObserved: false,
    })
    expect(omission.result).toBe('actionable_omission')
    expect(omission.reasonCodes).toContain('omission:actionable_breach')

    const compliant = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance: { decisionRef: 'dec:corr-1', kind: 'actionable' },
      actObserved: true,
    })
    expect(compliant.result).toBe('act_observed_compliant')
  })

  it('does not treat expired terminal windows as actionable omissions', () => {
    const expired = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance: {
        decisionRef: 'dec:corr-expired',
        kind: 'expired',
        terminalReason: 'timeout',
      },
      actObserved: false,
    })
    expect(expired.result).toBe('no_omission_terminal_window')

    const refusal = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance: { decisionRef: 'dec:corr-refused', kind: 'explicit_refusal' },
      actObserved: false,
    })
    expect(refusal.result).toBe('explicit_refusal_recorded')
  })

  it('distinguishes period satisfaction, noncompliance, and terminal impossibility', () => {
    const satisfied = evaluatePeriodBoundObligation({
      obligation: ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
      campaignWeek: 11,
      qualifyingActionWeek: 11,
    })
    expect(satisfied.result).toBe('period_satisfied')

    const beforeTransition = evaluatePeriodBoundObligation({
      obligation: ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
      campaignWeek: 12,
      qualifyingActionWeek: 12,
    })
    expect(beforeTransition.result).toBe('period_satisfied')

    const afterTransition = evaluatePeriodBoundObligation({
      obligation: ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
      campaignWeek: 13,
    })
    expect(afterTransition.result).toBe('period_noncompliant')

    const terminal = evaluatePeriodBoundObligation({
      obligation: ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
      campaignWeek: 11,
      terminalProvenance: { decisionRef: 'dec:period-expired', kind: 'canceled' },
    })
    expect(terminal.result).toBe('period_terminal_no_breach')

    const rollover = evaluatePeriodBoundObligation({
      obligation: ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
      campaignWeek: 13,
      priorPeriodOutcome: 'period_satisfied',
    })
    expect(rollover.auditablePriorPeriodOutcome).toBe('period_satisfied')
    expect(rollover.result).toBe('period_noncompliant')
  })

  it('consumes SPE-3181 duty outcome projection as downstream effect', () => {
    const projection: DutyConsumptionProjection = Object.freeze({
      dutyOwner: 'SPE-1135',
      requirementId: 'req:containment-info',
      subjectRef: 'subject:anomaly-alpha',
      windowId: 'win:1',
      requirementState: 'deficient',
      requirementRemainsAuthority: true,
      fulfillmentOutcome: 'deficient',
      reasonCodes: Object.freeze(['duty_consumes_requirement_outcome']),
    })

    const dutyEval = evaluateDutyAgainstRequirementOutcome(
      DEMO_DUTY_OBLIGATION_REGISTRY,
      'field_lead',
      projection
    )
    expect(dutyEval?.compliance).toBe('breach')
    expect(dutyEval?.requirementRemainsAuthority).toBe(true)
    expect(dutyEval?.fulfillmentOutcome).toBe('deficient')

    const terminalProjection: DutyConsumptionProjection = Object.freeze({
      ...projection,
      requirementState: 'pending',
      fulfillmentOutcome: 'pending',
    })
    const terminalDuty = evaluateDutyAgainstRequirementOutcome(
      DEMO_DUTY_OBLIGATION_REGISTRY,
      'field_lead',
      terminalProjection,
      {
        provenance: { decisionRef: 'dec:expired', kind: 'expired' },
        actObserved: false,
      }
    )
    expect(terminalDuty?.compliance).toBe('terminal_no_breach')
  })

  it('parses registry fail-closed and rejects prototype ids', () => {
    const serialized = JSON.stringify(DEMO_DUTY_OBLIGATION_REGISTRY)
    const reparsed = parseDutyObligationRegistry(JSON.parse(serialized))
    expect(reparsed).not.toBeNull()
    expect(reparsed!.obligations).toEqual(DEMO_DUTY_OBLIGATION_REGISTRY.obligations)
    expect(reparsed!.roleIndex).toEqual(DEMO_DUTY_OBLIGATION_REGISTRY.roleIndex)
    expect(
      parseDutyObligationRegistry({
        schemaVersion: DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
        obligations: {
          constructor: {
            ...FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
            id: 'constructor',
          },
        },
      })
    ).toBeNull()
    expect(parseSpe2805TerminalDecisionProvenance({ kind: 'expired' })).toBeUndefined()
  })
})
