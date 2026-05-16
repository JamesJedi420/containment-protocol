import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildMedicalOutcomeDeviationAuditReport,
  type MedicalExpectedOutcome,
  type MedicalObservedOutcome,
  type MedicalOutcomeEscalationEvent,
} from '../domain/medicalOutcomeDeviationAudit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function expected(
  overrides: Partial<MedicalExpectedOutcome> &
    Pick<MedicalExpectedOutcome, 'expectationId' | 'subjectId' | 'protocolId' | 'expectedOutcomeScore'>
): MedicalExpectedOutcome {
  return {
    source: 'protocol',
    ...overrides,
  }
}

function observed(
  overrides: Partial<MedicalObservedOutcome> &
    Pick<MedicalObservedOutcome, 'observationId' | 'subjectId' | 'protocolId' | 'actualOutcomeScore'>
): MedicalObservedOutcome {
  return {
    source: 'observation',
    ...overrides,
  }
}

function escalation(
  overrides: Partial<MedicalOutcomeEscalationEvent> &
    Pick<MedicalOutcomeEscalationEvent, 'eventId' | 'subjectId' | 'triggerKind'>
): MedicalOutcomeEscalationEvent {
  return {
    ...overrides,
  }
}

describe('medicalOutcomeDeviationAudit (SPE-2003)', () => {
  it('returns empty report for empty input without throwing', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [],
      observedOutcomes: [],
    })
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({
      pairedObservationCount: 0,
      missingObservationCount: 0,
      outcomeBelowPredictionCount: 0,
      symptomBurdenNotImprovedCount: 0,
      symptomBurdenWorsenedCount: 0,
      escalationAboveExpectedCount: 0,
      governanceNotificationCandidateCount: 0,
      unpairedObservationCount: 0,
      unpairedEscalationEventCount: 0,
    })
    expect(report.lines[0]).toContain('findings=0')
  })

  it('emits outcome_below_prediction at default threshold', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:1',
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 80,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:1',
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 60,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).toContain('outcome_below_prediction')
    expect(report.findings.find((finding) => finding.kind === 'outcome_below_prediction')?.severity).toBe(
      'warning'
    )
  })

  it('does not emit outcome_below_prediction when gap is below threshold', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:gap-low',
          subjectId: 'agent:gap-low',
          protocolId: 'protocol:observe',
          expectedOutcomeScore: 54,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:gap-low',
          subjectId: 'agent:gap-low',
          protocolId: 'protocol:observe',
          actualOutcomeScore: 40,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).not.toContain('outcome_below_prediction')
  })

  it('emits critical outcome_below_prediction for large gaps', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:critical-gap',
          subjectId: 'agent:critical-gap',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:critical-gap',
          subjectId: 'agent:critical-gap',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 50,
        }),
      ],
    })
    const outcomeFinding = report.findings.find(
      (finding) => finding.kind === 'outcome_below_prediction'
    )
    expect(outcomeFinding?.severity).toBe('critical')
    expect(outcomeFinding?.outcomeGap).toBe(40)
  })

  it('emits symptom_burden_not_improved when improvement is insufficient', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:burden',
          subjectId: 'agent:burden',
          protocolId: 'protocol:therapy',
          expectedOutcomeScore: 70,
          expectedSymptomBurdenDelta: -10,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:burden',
          subjectId: 'agent:burden',
          protocolId: 'protocol:therapy',
          actualOutcomeScore: 68,
          symptomBurdenDelta: -4,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).toContain('symptom_burden_not_improved')
  })

  it('emits symptom_burden_worsened with warning or critical severity', () => {
    const warningReport = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:worse',
          subjectId: 'agent:worse',
          protocolId: 'protocol:therapy',
          expectedOutcomeScore: 70,
          expectedSymptomBurdenDelta: -8,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:worse',
          subjectId: 'agent:worse',
          protocolId: 'protocol:therapy',
          actualOutcomeScore: 65,
          symptomBurdenDelta: 3,
        }),
      ],
    })
    expect(warningReport.findings.map((finding) => finding.kind)).toContain('symptom_burden_worsened')
    expect(
      warningReport.findings.find((finding) => finding.kind === 'symptom_burden_worsened')?.severity
    ).toBe('warning')

    const criticalReport = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:worse-critical',
          subjectId: 'agent:worse-critical',
          protocolId: 'protocol:therapy',
          expectedOutcomeScore: 70,
          expectedSymptomBurdenDelta: -8,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:worse-critical',
          subjectId: 'agent:worse-critical',
          protocolId: 'protocol:therapy',
          actualOutcomeScore: 65,
          symptomBurdenDelta: 12,
        }),
      ],
    })
    expect(
      criticalReport.findings.find((finding) => finding.kind === 'symptom_burden_worsened')?.severity
    ).toBe('critical')
  })

  it('emits escalation_above_expected when observed count exceeds expected', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:esc',
          subjectId: 'agent:esc',
          protocolId: 'protocol:contain',
          expectedOutcomeScore: 75,
          expectedEscalationCount: 0,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:esc',
          subjectId: 'agent:esc',
          protocolId: 'protocol:contain',
          actualOutcomeScore: 74,
          escalationCount: 2,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).toContain('escalation_above_expected')
  })

  it('emits missing_observation as info when no observation matches', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:missing',
          subjectId: 'agent:missing',
          protocolId: 'protocol:observe',
          expectedOutcomeScore: 80,
        }),
      ],
      observedOutcomes: [],
    })
    expect(report.findings).toEqual([
      expect.objectContaining({
        kind: 'missing_observation',
        severity: 'info',
        subjectId: 'agent:missing',
      }),
    ])
    expect(report.findings.map((finding) => finding.kind)).not.toContain(
      'governance_notification_candidate'
    )
  })

  it('emits governance_notification_candidate for critical outcome gap', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:gov-gap',
          subjectId: 'agent:gov-gap',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 95,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:gov-gap',
          subjectId: 'agent:gov-gap',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 55,
        }),
      ],
    })
    const governance = report.findings.find(
      (finding) => finding.kind === 'governance_notification_candidate'
    )
    expect(governance).toBeDefined()
    expect(governance?.recommendedNotificationLevel).toBe('site_lead')
  })

  it('emits governance_notification_candidate with governance level for escalation excess', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:gov-esc',
          subjectId: 'agent:gov-esc',
          protocolId: 'protocol:contain',
          expectedOutcomeScore: 88,
          expectedEscalationCount: 0,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:gov-esc',
          subjectId: 'agent:gov-esc',
          protocolId: 'protocol:contain',
          actualOutcomeScore: 87,
          escalationCount: 1,
        }),
      ],
    })
    const governance = report.findings.find(
      (finding) => finding.kind === 'governance_notification_candidate'
    )
    expect(governance?.recommendedNotificationLevel).toBe('governance')
  })

  it('recommends directive level for compound deviation', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:compound',
          subjectId: 'agent:compound',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
          expectedSymptomBurdenDelta: -12,
          expectedEscalationCount: 0,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:compound',
          subjectId: 'agent:compound',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 60,
          symptomBurdenDelta: 5,
          escalationCount: 1,
        }),
      ],
    })
    const governance = report.findings.find(
      (finding) => finding.kind === 'governance_notification_candidate'
    )
    expect(governance?.recommendedNotificationLevel).toBe('directive')
  })

  it('emits no deviation findings when observation meets expectation', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:ok',
          subjectId: 'agent:ok',
          protocolId: 'protocol:observe',
          expectedOutcomeScore: 80,
          expectedSymptomBurdenDelta: -5,
          expectedEscalationCount: 0,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:ok',
          subjectId: 'agent:ok',
          protocolId: 'protocol:observe',
          actualOutcomeScore: 82,
          symptomBurdenDelta: -8,
          escalationCount: 0,
        }),
      ],
    })
    const deviationKinds = report.findings.filter((finding) =>
      [
        'outcome_below_prediction',
        'symptom_burden_not_improved',
        'symptom_burden_worsened',
        'escalation_above_expected',
        'missing_observation',
        'governance_notification_candidate',
      ].includes(finding.kind)
    )
    expect(deviationKinds).toHaveLength(0)
  })

  it('sorts findings deterministically across repeated calls', () => {
    const input = {
      expectedOutcomes: [
        expected({
          expectationId: 'exp:b',
          subjectId: 'agent:b',
          protocolId: 'protocol:z',
          expectedOutcomeScore: 90,
        }),
        expected({
          expectationId: 'exp:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          expectedOutcomeScore: 90,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:b',
          subjectId: 'agent:b',
          protocolId: 'protocol:z',
          actualOutcomeScore: 20,
        }),
        observed({
          observationId: 'obs:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          actualOutcomeScore: 20,
        }),
      ],
    }
    const first = buildMedicalOutcomeDeviationAuditReport(input)
    const second = buildMedicalOutcomeDeviationAuditReport(input)
    expect(first.findings).toEqual(second.findings)
    expect(first.findings[0]?.subjectId).toBe('agent:a')
  })

  it('does not mutate frozen inputs', () => {
    const expectedOutcomes = Object.freeze([
      Object.freeze(
        expected({
          expectationId: 'exp:freeze',
          subjectId: 'agent:freeze',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        })
      ),
    ]) as readonly MedicalExpectedOutcome[]
    const observedOutcomes = Object.freeze([
      Object.freeze(
        observed({
          observationId: 'obs:freeze',
          subjectId: 'agent:freeze',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
        })
      ),
    ]) as readonly MedicalObservedOutcome[]

    buildMedicalOutcomeDeviationAuditReport({ expectedOutcomes, observedOutcomes })

    expect(expectedOutcomes[0]?.expectedOutcomeScore).toBe(90)
    expect(observedOutcomes[0]?.actualOutcomeScore).toBe(20)
  })

  it('applies threshold overrides', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:override',
          subjectId: 'agent:override',
          protocolId: 'protocol:observe',
          expectedOutcomeScore: 60,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:override',
          subjectId: 'agent:override',
          protocolId: 'protocol:observe',
          actualOutcomeScore: 50,
        }),
      ],
      options: { outcomeGapThreshold: 5 },
    })
    expect(report.findings.map((finding) => finding.kind)).toContain('outcome_below_prediction')
  })

  it('deduplicates duplicate expectationId deterministically', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:dup',
          subjectId: 'agent:dup',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        }),
        expected({
          expectationId: 'exp:dup',
          subjectId: 'agent:dup',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 50,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:dup',
          subjectId: 'agent:dup',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
        }),
      ],
    })
    expect(report.summary.outcomeBelowPredictionCount).toBe(1)
    expect(report.findings.find((finding) => finding.kind === 'outcome_below_prediction')?.outcomeGap).toBe(
      70
    )
  })

  it('deduplicates duplicate observationId deterministically', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:obs-dup',
          subjectId: 'agent:obs-dup',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:dup',
          subjectId: 'agent:obs-dup',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
        }),
        observed({
          observationId: 'obs:dup',
          subjectId: 'agent:obs-dup',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 80,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).toContain('outcome_below_prediction')
    expect(report.findings.find((finding) => finding.kind === 'outcome_below_prediction')?.outcomeGap).toBe(
      70
    )
  })

  it('clamps non-finite scores without throwing', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:nan',
          subjectId: 'agent:nan',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: Number.POSITIVE_INFINITY,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:nan',
          subjectId: 'agent:nan',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: Number.NaN,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).not.toContain('outcome_below_prediction')
  })

  it('keeps summary counts aligned with findings', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:summary',
          subjectId: 'agent:summary',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:summary',
          subjectId: 'agent:summary',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
        }),
      ],
    })
    expect(report.summary.outcomeBelowPredictionCount).toBe(
      report.findings.filter((finding) => finding.kind === 'outcome_below_prediction').length
    )
    expect(report.summary.pairedObservationCount).toBe(1)
  })

  it('falls back to week-agnostic observation when expected week has no exact match', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:week',
          subjectId: 'agent:week',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
          expectedByWeek: 4,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:week',
          subjectId: 'agent:week',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
          observedWeek: 2,
        }),
      ],
    })
    expect(report.findings.map((finding) => finding.kind)).toContain('outcome_below_prediction')
    expect(report.summary.pairedObservationCount).toBe(1)
  })

  it('annotates findings with matching escalation triggerKinds', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:triggers',
          subjectId: 'agent:triggers',
          protocolId: 'protocol:contain',
          expectedOutcomeScore: 90,
          expectedEscalationCount: 0,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:triggers',
          subjectId: 'agent:triggers',
          protocolId: 'protocol:contain',
          actualOutcomeScore: 70,
          escalationCount: 1,
        }),
      ],
      escalationEvents: [
        escalation({
          eventId: 'evt:1',
          subjectId: 'agent:triggers',
          protocolId: 'protocol:contain',
          triggerKind: 'symptom_persistence',
        }),
        escalation({
          eventId: 'evt:2',
          subjectId: 'agent:triggers',
          protocolId: 'protocol:contain',
          triggerKind: 'operator_review',
        }),
      ],
    })
    const escalationFinding = report.findings.find(
      (finding) => finding.kind === 'escalation_above_expected'
    )
    expect(escalationFinding?.triggerKinds).toEqual(['operator_review', 'symptom_persistence'])
  })

  it('counts unpaired observations', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [],
      observedOutcomes: [
        observed({
          observationId: 'obs:lonely',
          subjectId: 'agent:lonely',
          protocolId: 'protocol:observe',
          actualOutcomeScore: 50,
        }),
      ],
    })
    expect(report.summary.unpairedObservationCount).toBe(1)
    expect(report.summary.pairedObservationCount).toBe(0)
  })

  it('counts unpaired escalation events', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:evt',
          subjectId: 'agent:evt',
          protocolId: 'protocol:observe',
          expectedOutcomeScore: 80,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:evt',
          subjectId: 'agent:evt',
          protocolId: 'protocol:observe',
          actualOutcomeScore: 79,
        }),
      ],
      escalationEvents: [
        escalation({
          eventId: 'evt:unpaired',
          subjectId: 'agent:other',
          triggerKind: 'system',
        }),
      ],
    })
    expect(report.summary.unpairedEscalationEventCount).toBe(1)
  })

  it('does not import staffTreatmentTelemetry', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/medicalOutcomeDeviationAudit.ts'),
      'utf8'
    )
    expect(source.includes('staffTreatmentTelemetry')).toBe(false)
  })

  it('does not include SCP strings in generated lines', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:lines',
          subjectId: 'agent:lines',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:lines',
          subjectId: 'agent:lines',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
        }),
      ],
    })
    const joined = report.lines.join('\n').toLowerCase()
    expect(joined).not.toContain('scp-')
    expect(joined).not.toContain('scp ')
    expect(joined).not.toContain('9977')
  })

  it('chooses worst observation deterministically when multiple match', () => {
    const report = buildMedicalOutcomeDeviationAuditReport({
      expectedOutcomes: [
        expected({
          expectationId: 'exp:multi',
          subjectId: 'agent:multi',
          protocolId: 'protocol:stabilize',
          expectedOutcomeScore: 90,
        }),
      ],
      observedOutcomes: [
        observed({
          observationId: 'obs:better',
          subjectId: 'agent:multi',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 70,
          escalationCount: 0,
        }),
        observed({
          observationId: 'obs:worst',
          subjectId: 'agent:multi',
          protocolId: 'protocol:stabilize',
          actualOutcomeScore: 20,
          escalationCount: 2,
          symptomBurdenDelta: 8,
        }),
      ],
    })
    expect(
      report.findings.find((finding) => finding.kind === 'outcome_below_prediction')?.observationId
    ).toBe('obs:worst')
    expect(report.summary.pairedObservationCount).toBe(1)
    expect(report.summary.unpairedObservationCount).toBe(1)
  })
})
