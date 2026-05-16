import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildTreatmentFailureBlameRoutingReport,
  type ProposedBlameAttribution,
  type TreatmentFailureContext,
  type TreatmentLimitationAcknowledgment,
} from '../domain/treatmentFailureBlameRouting'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function failureContext(
  overrides: Partial<TreatmentFailureContext> &
    Pick<TreatmentFailureContext, 'contextId' | 'subjectId' | 'protocolId' | 'failureSignals'>
): TreatmentFailureContext {
  return {
    source: 'deviation_audit',
    severity: 'warning',
    ...overrides,
  }
}

function attribution(
  overrides: Partial<ProposedBlameAttribution> &
    Pick<ProposedBlameAttribution, 'attributionId' | 'subjectId' | 'protocolId' | 'target'>
): ProposedBlameAttribution {
  return {
    source: 'incident_review',
    ...overrides,
  }
}

function acknowledgment(
  overrides: Partial<TreatmentLimitationAcknowledgment> &
    Pick<
      TreatmentLimitationAcknowledgment,
      'acknowledgmentId' | 'subjectId' | 'protocolId' | 'limitationKind' | 'acknowledgedBy'
    >
): TreatmentLimitationAcknowledgment {
  return {
    source: 'clinical',
    ...overrides,
  }
}

describe('treatmentFailureBlameRouting (SPE-2006)', () => {
  it('returns empty report for empty input without throwing', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [],
      proposedAttributions: [],
    })
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({
      failureContextCount: 0,
      prohibitedDeflectionCount: 0,
      missingAcknowledgmentCount: 0,
      approvedRouteCount: 0,
      institutionalAccountabilityRequiredCount: 0,
      insufficientEvidenceCount: 0,
      unpairedAttributionCount: 0,
    })
    expect(report.lines[0]).toContain('findings=0')
  })

  it('emits critical prohibited_subject_deflection for automatic subject_language_noncompliance', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:critical',
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          failureSignals: ['outcome_below_prediction'],
          severity: 'critical',
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:auto-lang',
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          target: 'subject_language_noncompliance',
          source: 'auto',
          isAutomatic: true,
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'prohibited_subject_deflection')
    expect(finding?.severity).toBe('critical')
    expect(finding?.recommendedAccountabilityFocus).toBe('institutional')
  })

  it('emits warning prohibited_subject_deflection for manual subject_belief_noncompliance', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:warn',
          subjectId: 'agent:patient-2',
          protocolId: 'protocol:therapy',
          failureSignals: ['symptom_burden_worsened'],
          severity: 'warning',
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:belief',
          subjectId: 'agent:patient-2',
          protocolId: 'protocol:therapy',
          target: 'subject_belief_noncompliance',
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'prohibited_subject_deflection')
    expect(finding?.severity).toBe('warning')
  })

  it('approves subject-side route when acknowledgment exists', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:ack',
          subjectId: 'agent:patient-3',
          protocolId: 'protocol:observe',
          failureSignals: ['escalation_above_expected'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:identity',
          subjectId: 'agent:patient-3',
          protocolId: 'protocol:observe',
          target: 'subject_identity_noncompliance',
        }),
      ],
      limitationAcknowledgments: [
        acknowledgment({
          acknowledgmentId: 'ack:1',
          subjectId: 'agent:patient-3',
          protocolId: 'protocol:observe',
          limitationKind: 'protocol_ceiling',
          acknowledgedBy: 'clinician',
        }),
      ],
    })
    expect(report.findings.map((row) => row.kind)).toContain('approved_accountability_route')
    expect(report.findings.map((row) => row.kind)).not.toContain('prohibited_subject_deflection')
    const approved = report.findings.find((row) => row.kind === 'approved_accountability_route')
    expect(approved?.recommendedAccountabilityFocus).toBe('shared')
  })

  it('emits missing_treatment_limitation_acknowledgment for protocol_limitation without acknowledgment', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:inst',
          subjectId: 'agent:patient-4',
          protocolId: 'protocol:contain',
          failureSignals: ['outcome_below_prediction'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:protocol',
          subjectId: 'agent:patient-4',
          protocolId: 'protocol:contain',
          target: 'protocol_limitation',
        }),
      ],
    })
    expect(report.findings.map((row) => row.kind)).toContain(
      'missing_treatment_limitation_acknowledgment'
    )
  })

  it('approves protocol_limitation when acknowledgment exists', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:inst-ack',
          subjectId: 'agent:patient-5',
          protocolId: 'protocol:contain',
          failureSignals: ['governance_notification_candidate'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:protocol-ack',
          subjectId: 'agent:patient-5',
          protocolId: 'protocol:contain',
          target: 'resource_constraint',
        }),
      ],
      limitationAcknowledgments: [
        acknowledgment({
          acknowledgmentId: 'ack:inst',
          subjectId: 'agent:patient-5',
          protocolId: 'protocol:contain',
          limitationKind: 'resource_ceiling',
          acknowledgedBy: 'site_lead',
        }),
      ],
    })
    const approved = report.findings.find((row) => row.kind === 'approved_accountability_route')
    expect(approved?.recommendedAccountabilityFocus).toBe('institutional')
  })

  it('approves staff_execution_gap with material failure and staff focus', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:staff',
          subjectId: 'agent:patient-6',
          protocolId: 'protocol:ward',
          failureSignals: ['outcome_below_prediction'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:staff',
          subjectId: 'agent:patient-6',
          protocolId: 'protocol:ward',
          target: 'staff_execution_gap',
        }),
      ],
    })
    const approved = report.findings.find((row) => row.kind === 'approved_accountability_route')
    expect(approved?.recommendedAccountabilityFocus).toBe('staff')
  })

  it('emits institutional_accountability_required when only subject-side routes are proposed', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:only-subject',
          subjectId: 'agent:patient-7',
          protocolId: 'protocol:stabilize',
          failureSignals: ['outcome_below_prediction'],
          severity: 'critical',
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:lang',
          subjectId: 'agent:patient-7',
          protocolId: 'protocol:stabilize',
          target: 'subject_language_noncompliance',
        }),
        attribution({
          attributionId: 'attr:testimony',
          subjectId: 'agent:patient-7',
          protocolId: 'protocol:stabilize',
          target: 'subject_testimony_unreliable',
        }),
      ],
    })
    expect(report.findings.map((row) => row.kind)).toContain('institutional_accountability_required')
    const required = report.findings.find(
      (row) => row.kind === 'institutional_accountability_required'
    )
    expect(required?.severity).toBe('critical')
    expect(required?.recommendedAccountabilityFocus).toBe('institutional')
  })

  it('emits insufficient_failure_evidence when no material failure context exists', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:orphan',
          subjectId: 'agent:orphan',
          protocolId: 'protocol:observe',
          target: 'subject_belief_noncompliance',
        }),
      ],
    })
    expect(report.findings).toEqual([
      expect.objectContaining({
        kind: 'insufficient_failure_evidence',
        attributionId: 'attr:orphan',
      }),
    ])
    expect(report.summary.unpairedAttributionCount).toBe(1)
  })

  it('does not treat missing_observation alone as material failure', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:missing',
          subjectId: 'agent:patient-8',
          protocolId: 'protocol:observe',
          failureSignals: ['missing_observation'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:missing',
          subjectId: 'agent:patient-8',
          protocolId: 'protocol:observe',
          target: 'subject_language_noncompliance',
        }),
      ],
    })
    expect(report.findings.map((row) => row.kind)).toEqual(['insufficient_failure_evidence'])
    expect(report.findings.map((row) => row.kind)).not.toContain('prohibited_subject_deflection')
  })

  it('honors custom materialFailureSignals option', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:custom',
          subjectId: 'agent:patient-9',
          protocolId: 'protocol:therapy',
          failureSignals: ['symptom_burden_not_improved'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:custom',
          subjectId: 'agent:patient-9',
          protocolId: 'protocol:therapy',
          target: 'subject_belief_noncompliance',
        }),
      ],
      options: {
        materialFailureSignals: ['symptom_burden_not_improved'],
      },
    })
    expect(report.findings.map((row) => row.kind)).toContain('prohibited_subject_deflection')
  })

  it('prefers same-week context and acknowledgment when attribution week is set', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:week-3',
          subjectId: 'agent:week',
          protocolId: 'protocol:contain',
          week: 3,
          failureSignals: ['missing_observation'],
        }),
        failureContext({
          contextId: 'ctx:week-4',
          subjectId: 'agent:week',
          protocolId: 'protocol:contain',
          week: 4,
          failureSignals: ['outcome_below_prediction'],
          severity: 'warning',
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:week',
          subjectId: 'agent:week',
          protocolId: 'protocol:contain',
          week: 4,
          target: 'protocol_limitation',
        }),
      ],
      limitationAcknowledgments: [
        acknowledgment({
          acknowledgmentId: 'ack:week-3',
          subjectId: 'agent:week',
          protocolId: 'protocol:contain',
          week: 3,
          limitationKind: 'protocol_ceiling',
          acknowledgedBy: 'governance',
        }),
        acknowledgment({
          acknowledgmentId: 'ack:week-4',
          subjectId: 'agent:week',
          protocolId: 'protocol:contain',
          week: 4,
          limitationKind: 'governance_constraint',
          acknowledgedBy: 'governance',
        }),
      ],
    })
    const approved = report.findings.find((row) => row.kind === 'approved_accountability_route')
    expect(approved?.contextId).toBe('ctx:week-4')
    expect(approved?.acknowledgmentId).toBe('ack:week-4')
  })

  it('matches week-agnostic failure context to attributed week', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:agnostic',
          subjectId: 'agent:agnostic',
          protocolId: 'protocol:ward',
          failureSignals: ['escalation_above_expected'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:agnostic',
          subjectId: 'agent:agnostic',
          protocolId: 'protocol:ward',
          week: 2,
          target: 'staff_execution_gap',
        }),
      ],
    })
    expect(report.findings.map((row) => row.kind)).toContain('approved_accountability_route')
    expect(report.summary.unpairedAttributionCount).toBe(0)
  })

  it('deduplicates duplicate contextId deterministically', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:dup',
          subjectId: 'agent:dup',
          protocolId: 'protocol:stabilize',
          failureSignals: ['outcome_below_prediction'],
          severity: 'warning',
        }),
        failureContext({
          contextId: 'ctx:dup',
          subjectId: 'agent:dup',
          protocolId: 'protocol:stabilize',
          failureSignals: ['governance_notification_candidate'],
          severity: 'critical',
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:dup',
          subjectId: 'agent:dup',
          protocolId: 'protocol:stabilize',
          target: 'staff_execution_gap',
        }),
      ],
    })
    const approved = report.findings.find((row) => row.kind === 'approved_accountability_route')
    expect(approved?.contextId).toBe('ctx:dup')
    expect(report.summary.failureContextCount).toBe(1)
  })

  it('deduplicates duplicate attributionId deterministically', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:attr-dup',
          subjectId: 'agent:attr-dup',
          protocolId: 'protocol:observe',
          failureSignals: ['outcome_below_prediction'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:dup',
          subjectId: 'agent:attr-dup',
          protocolId: 'protocol:observe',
          target: 'staff_execution_gap',
        }),
        attribution({
          attributionId: 'attr:dup',
          subjectId: 'agent:attr-dup',
          protocolId: 'protocol:observe',
          target: 'subject_language_noncompliance',
        }),
      ],
    })
    expect(report.findings.filter((row) => row.attributionId === 'attr:dup').length).toBeGreaterThan(0)
    expect(
      report.findings.find(
        (row) => row.attributionId === 'attr:dup' && row.target === 'staff_execution_gap'
      )
    ).toBeDefined()
  })

  it('deduplicates duplicate acknowledgmentId deterministically', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:ack-dup',
          subjectId: 'agent:ack-dup',
          protocolId: 'protocol:contain',
          failureSignals: ['outcome_below_prediction'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:ack-dup',
          subjectId: 'agent:ack-dup',
          protocolId: 'protocol:contain',
          target: 'protocol_limitation',
        }),
      ],
      limitationAcknowledgments: [
        acknowledgment({
          acknowledgmentId: 'ack:dup',
          subjectId: 'agent:ack-dup',
          protocolId: 'protocol:contain',
          limitationKind: 'protocol_ceiling',
          acknowledgedBy: 'clinician',
        }),
        acknowledgment({
          acknowledgmentId: 'ack:dup',
          subjectId: 'agent:ack-dup',
          protocolId: 'protocol:contain',
          limitationKind: 'other',
          acknowledgedBy: 'system',
        }),
      ],
    })
    expect(report.findings.map((row) => row.kind)).toContain('approved_accountability_route')
    expect(report.findings.map((row) => row.kind)).not.toContain(
      'missing_treatment_limitation_acknowledgment'
    )
  })

  it('sorts findings deterministically across repeated calls', () => {
    const input = {
      failureContexts: [
        failureContext({
          contextId: 'ctx:b',
          subjectId: 'agent:b',
          protocolId: 'protocol:z',
          failureSignals: ['outcome_below_prediction'],
        }),
        failureContext({
          contextId: 'ctx:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          failureSignals: ['symptom_burden_worsened'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:b',
          subjectId: 'agent:b',
          protocolId: 'protocol:z',
          target: 'subject_language_noncompliance',
        }),
        attribution({
          attributionId: 'attr:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          target: 'staff_execution_gap',
        }),
      ],
    }
    const first = buildTreatmentFailureBlameRoutingReport(input)
    const second = buildTreatmentFailureBlameRoutingReport(input)
    expect(first.findings).toEqual(second.findings)
  })

  it('does not mutate frozen inputs', () => {
    const failureContexts = Object.freeze([
      Object.freeze(
        failureContext({
          contextId: 'ctx:freeze',
          subjectId: 'agent:freeze',
          protocolId: 'protocol:stabilize',
          failureSignals: ['outcome_below_prediction'],
        })
      ),
    ]) as readonly TreatmentFailureContext[]
    const proposedAttributions = Object.freeze([
      Object.freeze(
        attribution({
          attributionId: 'attr:freeze',
          subjectId: 'agent:freeze',
          protocolId: 'protocol:stabilize',
          target: 'subject_language_noncompliance',
        })
      ),
    ]) as readonly ProposedBlameAttribution[]

    buildTreatmentFailureBlameRoutingReport({ failureContexts, proposedAttributions })

    expect(failureContexts[0]?.failureSignals).toEqual(['outcome_below_prediction'])
    expect(proposedAttributions[0]?.target).toBe('subject_language_noncompliance')
  })

  it('keeps summary counts aligned with findings', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:summary',
          subjectId: 'agent:summary',
          protocolId: 'protocol:stabilize',
          failureSignals: ['outcome_below_prediction'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:summary',
          subjectId: 'agent:summary',
          protocolId: 'protocol:stabilize',
          target: 'subject_language_noncompliance',
          isAutomatic: true,
          source: 'auto',
        }),
      ],
    })
    expect(report.summary.prohibitedDeflectionCount).toBe(
      report.findings.filter((row) => row.kind === 'prohibited_subject_deflection').length
    )
    expect(report.summary.failureContextCount).toBe(1)
  })

  it('does not include SCP strings in generated lines', () => {
    const report = buildTreatmentFailureBlameRoutingReport({
      failureContexts: [
        failureContext({
          contextId: 'ctx:lines',
          subjectId: 'agent:lines',
          protocolId: 'protocol:stabilize',
          failureSignals: ['outcome_below_prediction'],
        }),
      ],
      proposedAttributions: [
        attribution({
          attributionId: 'attr:lines',
          subjectId: 'agent:lines',
          protocolId: 'protocol:stabilize',
          target: 'subject_language_noncompliance',
          isAutomatic: true,
          source: 'auto',
        }),
      ],
    })
    const joined = report.lines.join('\n').toLowerCase()
    expect(joined).not.toContain('scp-')
    expect(joined).not.toContain('scp ')
    expect(joined).not.toContain('9977')
  })

  it('does not import medicalOutcomeDeviationAudit', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/treatmentFailureBlameRouting.ts'),
      'utf8'
    )
    expect(source.includes('medicalOutcomeDeviationAudit')).toBe(false)
  })

  it('does not import staffTreatmentTelemetry', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/treatmentFailureBlameRouting.ts'),
      'utf8'
    )
    expect(source.includes('staffTreatmentTelemetry')).toBe(false)
  })

  it('does not import GameState or UI modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/treatmentFailureBlameRouting.ts'),
      'utf8'
    )
    expect(source.includes("from './models'")).toBe(false)
    expect(source.includes('gameStore')).toBe(false)
    expect(source.includes('/features/')).toBe(false)
  })
})
