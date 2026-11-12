import { describe, expect, it } from 'vitest'
import {
  CREDIBILITY_BANDS,
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  INFORMATION_VERIFICATION_STATUSES,
  INTAKE_SOURCE_CLASSES,
  PLAUSIBILITY_BANDS,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  RUMOR_RISK_BANDS,
  applyContradictionEvent,
  applyCorroborationEvent,
  createInformationIntakeReport,
  deriveInitialVerificationStatus,
  isInformationVerificationStatus,
  summarizeMixedSourceIntake,
  validateInformationIntakeReport,
  type InformationIntakeReportRecord,
} from '../domain/informationIntakeReport'

function baseReport(
  overrides: Partial<InformationIntakeReportRecord> = {}
): InformationIntakeReportRecord {
  return {
    id: 'intake:test-base',
    label: 'Test intake report',
    topicRef: 'topic:test',
    initialSourceClass: 'formal_alert',
    credibility: 'medium',
    plausibility: 'plausible',
    rumorRisk: 'low',
    verificationStatus: 'unverified',
    confidenceScore: 0.45,
    corroborationHistory: [],
    contradictionHistory: [],
    retainedDespiteContradiction: true,
    ...overrides,
  }
}

describe('informationIntakeReport (SPE-854 slice 1)', () => {
  it('exposes canonical intake source and verification unions', () => {
    expect(INTAKE_SOURCE_CLASSES).toContain('formal_alert')
    expect(INTAKE_SOURCE_CLASSES).toContain('rumor_chain')
    expect(INFORMATION_VERIFICATION_STATUSES).toEqual([
      'impossible',
      'contradicted',
      'unverified',
      'partially_corroborated',
      'verified',
      'escalated_confidence',
    ])
    expect(CREDIBILITY_BANDS.length).toBeGreaterThan(0)
    expect(PLAUSIBILITY_BANDS.length).toBeGreaterThan(0)
    expect(RUMOR_RISK_BANDS.length).toBeGreaterThan(0)
    expect(isInformationVerificationStatus('verified')).toBe(true)
    expect(isInformationVerificationStatus('fabricated')).toBe(false)
  })

  it('validates a well-formed intake report', () => {
    const result = validateInformationIntakeReport(baseReport())

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects franchise literal tokens in report fields', () => {
    const result = validateInformationIntakeReport(
      baseReport({ label: 'SCP-adjacent rumor intake' })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('franchise_literal_token')
  })

  it('derives impossible status for implausible non-institutional reports', () => {
    const status = deriveInitialVerificationStatus({
      credibility: 'medium',
      plausibility: 'implausible',
      rumorRisk: 'low',
      initialSourceClass: 'archive_signature',
    })

    expect(status).toBe('impossible')
  })

  it('progresses impossible report through corroboration to verified', () => {
    let report = IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE

    const first = applyCorroborationEvent(report, {
      eventId: 'corr:field-trace-1',
      week: 14,
      sourceRef: 'witness:maintenance-crew',
      sourceClass: 'field_witness',
      weight: 0.2,
      note: 'Crew reports residue matching archive signature.',
    })

    expect(first.report.verificationStatus).toBe('unverified')
    expect(first.report.corroborationHistory).toHaveLength(1)
    expect(first.report.retainedDespiteContradiction).toBe(true)

    report = first.report

    const second = applyCorroborationEvent(report, {
      eventId: 'corr:sensor-2',
      week: 15,
      sourceRef: 'sensor:canal-bridge-grid',
      sourceClass: 'technical_trace',
      weight: 0.55,
    })

    expect(second.report.verificationStatus).toBe('verified')
    expect(second.report.confidenceScore).toBeGreaterThan(report.confidenceScore)

    report = second.report

    const third = applyCorroborationEvent(report, {
      eventId: 'corr:archive-3',
      week: 16,
      sourceRef: 'archive:legends-db',
      sourceClass: 'archive_signature',
      weight: 0.35,
    })

    expect(third.report.verificationStatus).toBe('escalated_confidence')
  })

  it('retains contradicted report and allows later corroboration escalation', () => {
    const created = createInformationIntakeReport({
      id: 'intake:contradicted-retained',
      label: 'Contradicted early sensor readout',
      topicRef: 'topic:warehouse-fire',
      initialSourceClass: 'technical_trace',
      credibility: 'low',
      plausibility: 'uncertain',
      rumorRisk: 'elevated',
      verificationStatus: 'contradicted',
    })

    const contradicted = applyContradictionEvent(created, {
      eventId: 'contra:baseline-1',
      week: 8,
      sourceRef: 'audit:baseline-continuity',
      severity: 'major',
      note: 'Contradicts prior official closure record.',
    })

    expect(contradicted.report.verificationStatus).toBe('contradicted')
    expect(contradicted.report.retainedDespiteContradiction).toBe(true)

    const corroborated = applyCorroborationEvent(contradicted.report, {
      eventId: 'corr:partner-1',
      week: 9,
      sourceRef: 'partner:regional-lab',
      sourceClass: 'partner_channel',
      weight: 0.7,
    })

    expect(corroborated.report.verificationStatus).toBe('verified')
    expect(corroborated.report.corroborationHistory).toHaveLength(1)
  })

  it('summarizes mixed-source conflicting intake on one topic', () => {
    const summary = summarizeMixedSourceIntake([
      IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
      PUBLIC_RUMOR_CONFLICT_FIXTURE,
      FORMAL_ALERT_PARTIAL_FIXTURE,
    ])

    expect(summary.topicRef).toBe('topic:canal-bridge-incident')
    expect(summary.reportCount).toBe(3)
    expect(summary.hasIncompleteIntake).toBe(true)
    expect(summary.hasConflictingVerification).toBe(true)
    expect(summary.rumorSeparatedCount).toBe(2)
    expect(summary.structuredReasons).toContain('verification_conflict')
    expect(summary.structuredReasons).toContain('rumor_separated')
  })

  it('is idempotent when the same corroboration event id is applied twice', () => {
    const event = {
      eventId: 'corr:dup',
      week: 3,
      sourceRef: 'source:dup',
      sourceClass: 'partner_channel' as const,
      weight: 0.5,
    }

    const first = applyCorroborationEvent(baseReport(), event)
    const second = applyCorroborationEvent(first.report, event)

    expect(second.changed).toBe(false)
    expect(second.report.corroborationHistory).toHaveLength(1)
    expect(second.report.verificationStatus).toBe(first.report.verificationStatus)
    expect(second.report.confidenceScore).toBe(first.report.confidenceScore)
  })

  it('rejects duplicate corroboration event ids at validation time', () => {
    const result = validateInformationIntakeReport(
      baseReport({
        corroborationHistory: [
          {
            eventId: 'corr:dup',
            week: 1,
            sourceRef: 'a',
            sourceClass: 'formal_alert',
            weight: 0.2,
          },
          {
            eventId: 'corr:dup',
            week: 2,
            sourceRef: 'b',
            sourceClass: 'public_signal',
            weight: 0.3,
          },
        ],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('duplicate_corroboration_event_id')
  })
})
