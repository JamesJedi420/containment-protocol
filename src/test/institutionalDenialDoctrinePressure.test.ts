import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildInstitutionalDenialDoctrinePressureReport,
  type InstitutionalDenialDoctrinePressureSignal,
} from '../domain/institutionalDenialDoctrinePressure'
import type { AccommodationAccessAuditFinding } from '../domain/accommodationAccessAudit'
import type { MedicalAccountabilityScorecardFinding } from '../domain/medicalAccountabilityScorecard'
import type { MedicalOutcomeDeviationFinding } from '../domain/medicalOutcomeDeviationAudit'
import type { StaffTreatmentTelemetryFinding } from '../domain/staffTreatmentTelemetry'
import type { TreatmentFailureBlameRoutingFinding } from '../domain/treatmentFailureBlameRouting'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function doctrineSignal(
  overrides: Partial<InstitutionalDenialDoctrinePressureSignal> &
    Pick<InstitutionalDenialDoctrinePressureSignal, 'signalId' | 'kind'>
): InstitutionalDenialDoctrinePressureSignal {
  return { ...overrides }
}

function staffFinding(
  overrides: Partial<StaffTreatmentTelemetryFinding> &
    Pick<StaffTreatmentTelemetryFinding, 'kind' | 'staffId' | 'detail'>
): StaffTreatmentTelemetryFinding {
  return { ...overrides }
}

function deviationFinding(
  overrides: Partial<MedicalOutcomeDeviationFinding> &
    Pick<
      MedicalOutcomeDeviationFinding,
      'kind' | 'severity' | 'subjectId' | 'protocolId' | 'detail'
    >
): MedicalOutcomeDeviationFinding {
  return { ...overrides }
}

function blameFinding(
  overrides: Partial<TreatmentFailureBlameRoutingFinding> &
    Pick<
      TreatmentFailureBlameRoutingFinding,
      'kind' | 'severity' | 'subjectId' | 'protocolId' | 'detail'
    >
): TreatmentFailureBlameRoutingFinding {
  return { ...overrides }
}

function scorecardFinding(
  overrides: Partial<MedicalAccountabilityScorecardFinding> &
    Pick<MedicalAccountabilityScorecardFinding, 'kind' | 'severity' | 'rowId' | 'detail'>
): MedicalAccountabilityScorecardFinding {
  return { ...overrides }
}

function accommodationFinding(
  overrides: Partial<AccommodationAccessAuditFinding> &
    Pick<
      AccommodationAccessAuditFinding,
      'kind' | 'severity' | 'rowId' | 'subjectId' | 'protocolId' | 'detail'
    >
): AccommodationAccessAuditFinding {
  return { ...overrides }
}

describe('institutionalDenialDoctrinePressure (SPE-2001)', () => {
  it('returns empty report for empty input without throwing', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({})
    expect(report.rows).toEqual([])
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({
      rowCount: 0,
      approvedLanguagePressureCount: 0,
      careModeDiscussionRestrictionCount: 0,
      dissentingStaffExclusionPressureCount: 0,
      treatmentLimitationSuppressionCount: 0,
      subjectDeflectionReinforcementCount: 0,
      patientReportDismissalCount: 0,
      overclassificationPressureCount: 0,
      materialOutcomeSuppressionCount: 0,
      supportAccessRestrictionCount: 0,
      highAlignmentPoorOutcomePressureCount: 0,
      insufficientEvidenceCount: 0,
    })
    expect(report.lines[0]).toBe(
      'Institutional denial doctrine pressure: rows=0, findings=0, critical=0'
    )
  })

  it('builds row from explicit doctrine-pressure signal', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-1',
          kind: 'approved_language_requirement',
          staffId: 'staff:alpha',
          doctrineId: 'doctrine:denial',
          week: 2,
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.rowId).toBe('row:staff-doctrine:staff:alpha:doctrine:denial:2')
    expect(report.rows[0]?.signalCount).toBe(1)
  })

  it('skips invalid blank signalId/kind signals', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({ signalId: '  ', kind: 'approved_language_requirement' }),
        doctrineSignal({ signalId: 'valid', kind: 'support_access_restricted', siteId: 'site:1' }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.siteId).toBe('site:1')
  })

  it('deduplicates duplicate signalId deterministically', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'dup',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:1',
          protocolId: 'protocol:1',
          detail: 'First wins.',
        }),
        doctrineSignal({
          signalId: 'dup',
          kind: 'overclassification_pressure',
          subjectId: 'agent:2',
          protocolId: 'protocol:2',
          detail: 'Second ignored.',
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.findings.some((f) => f.kind === 'patient_report_dismissal')).toBe(true)
    expect(report.findings.some((f) => f.kind === 'overclassification_pressure')).toBe(false)
  })

  it('approved-language signal emits approved_language_pressure', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'lang',
          kind: 'approved_language_requirement',
          staffId: 'staff:lang',
          doctrineId: 'doctrine:lang',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'approved_language_pressure')).toBe(true)
  })

  it('care-mode discussion restriction signal emits care_mode_discussion_restriction', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'care',
          kind: 'care_mode_discussion_restricted',
          siteId: 'site:care',
          week: 1,
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'care_mode_discussion_restriction')).toBe(true)
  })

  it('dissenting staff exclusion signal emits dissenting_staff_exclusion_pressure', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'dissent',
          kind: 'dissenting_staff_exclusion_pressure',
          staffId: 'staff:dissent',
          doctrineId: 'doctrine:dissent',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'dissenting_staff_exclusion_pressure')).toBe(
      true
    )
  })

  it('treatment-limitation suppression signal emits treatment_limitation_suppression', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'limit',
          kind: 'treatment_limitation_suppressed',
          subjectId: 'agent:limit',
          protocolId: 'protocol:limit',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'treatment_limitation_suppression')).toBe(true)
  })

  it('subject-side deflection signal emits subject_deflection_reinforcement', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'deflect',
          kind: 'subject_side_deflection_reinforced',
          subjectId: 'agent:deflect',
          protocolId: 'protocol:deflect',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'subject_deflection_reinforcement')).toBe(true)
  })

  it('patient-report dismissal signal emits patient_report_dismissal', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'patient',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:patient',
          protocolId: 'protocol:patient',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'patient_report_dismissal')).toBe(true)
  })

  it('overclassification signal emits overclassification_pressure', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'over',
          kind: 'overclassification_pressure',
          subjectId: 'agent:over',
          protocolId: 'protocol:over',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'overclassification_pressure')).toBe(true)
  })

  it('material outcome suppression signal emits material_outcome_suppression', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'material',
          kind: 'material_outcome_suppressed',
          subjectId: 'agent:material',
          protocolId: 'protocol:material',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'material_outcome_suppression')).toBe(true)
  })

  it('support access restriction signal emits support_access_restriction', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'support',
          kind: 'support_access_restricted',
          siteId: 'site:support',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'support_access_restriction')).toBe(true)
  })

  it('SPE-2010 high_alignment_low_efficacy fixture emits high_alignment_poor_outcome_pressure', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:telemetry',
          subjectId: 'agent:telemetry',
          protocolId: 'protocol:telemetry',
          week: 4,
          detail: 'Alignment high, efficacy low.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'high_alignment_poor_outcome_pressure')).toBe(
      true
    )
  })

  it('SPE-2006 prohibited_subject_deflection fixture emits subject_deflection_reinforcement', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          severity: 'warning',
          subjectId: 'agent:blame',
          protocolId: 'protocol:blame',
          detail: 'Subject deflection prohibited.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'subject_deflection_reinforcement')).toBe(true)
  })

  it('SPE-2006 missing_treatment_limitation_acknowledgment fixture emits treatment_limitation_suppression', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      blameRoutingFindings: [
        blameFinding({
          kind: 'missing_treatment_limitation_acknowledgment',
          severity: 'warning',
          subjectId: 'agent:ack',
          protocolId: 'protocol:ack',
          detail: 'Limitation acknowledgment missing.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'treatment_limitation_suppression')).toBe(true)
  })

  it('SPE-2003 governance_notification_candidate fixture emits material_outcome_suppression', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'governance_notification_candidate',
          severity: 'warning',
          subjectId: 'agent:gov',
          protocolId: 'protocol:gov',
          detail: 'Governance notification candidate.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'material_outcome_suppression')).toBe(true)
  })

  it('SPE-2003 missing_observation alone does not emit doctrine pressure', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'missing_observation',
          severity: 'info',
          subjectId: 'agent:missing',
          protocolId: 'protocol:missing',
          detail: 'Observation missing.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'material_outcome_suppression')).toBe(false)
    expect(report.findings.some((f) => f.kind === 'insufficient_pressure_evidence')).toBe(true)
  })

  it('SPE-2008 high_alignment_poor_outcome fixture emits high_alignment_poor_outcome_pressure', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      medicalScorecardFindings: [
        scorecardFinding({
          kind: 'high_alignment_poor_outcome',
          severity: 'warning',
          rowId: 'row:score',
          subjectId: 'agent:score',
          protocolId: 'protocol:score',
          detail: 'High alignment with poor outcome.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'high_alignment_poor_outcome_pressure')).toBe(
      true
    )
  })

  it('SPE-2011 care_mode_unavailable fixture emits care_mode_discussion_restriction', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      accommodationFindings: [
        accommodationFinding({
          kind: 'care_mode_unavailable',
          severity: 'warning',
          rowId: 'row:acc',
          subjectId: 'agent:acc',
          protocolId: 'protocol:acc',
          detail: 'Requested care mode unavailable.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'care_mode_discussion_restriction')).toBe(true)
  })

  it('SPE-2011 treatment_limitation_unacknowledged fixture emits treatment_limitation_suppression', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      accommodationFindings: [
        accommodationFinding({
          kind: 'treatment_limitation_unacknowledged',
          severity: 'warning',
          rowId: 'row:acc-limit',
          subjectId: 'agent:acc-limit',
          protocolId: 'protocol:acc-limit',
          detail: 'Treatment limitation unacknowledged.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'treatment_limitation_suppression')).toBe(true)
  })

  it('sparse upstream findings go to deterministic aggregate rows without throwing', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'outcome_below_expected',
          staffId: 'staff:sparse',
          detail: 'Sparse staff finding.',
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.rowId).toBe('row:aggregate')
  })

  it('threshold overrides affect severity', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'pressure',
          kind: 'approved_language_requirement',
          staffId: 'staff:thresh',
          doctrineId: 'doctrine:thresh',
          pressureScore: 95,
        }),
      ],
      options: {
        highPressureThreshold: 50,
        criticalPressureThreshold: 90,
      },
    })
    const finding = report.findings.find((f) => f.kind === 'approved_language_pressure')
    expect(finding?.severity).toBe('critical')
  })

  it('minimum evidence option emits insufficient_pressure_evidence for sparse rows', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      options: { minimumEvidenceCount: 3 },
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'one',
          kind: 'support_access_restricted',
          siteId: 'site:sparse',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'insufficient_pressure_evidence')).toBe(true)
  })

  it('rows/findings/lines sorted deterministically', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'b',
          kind: 'support_access_restricted',
          siteId: 'site:z',
          week: 2,
        }),
        doctrineSignal({
          signalId: 'a',
          kind: 'approved_language_requirement',
          siteId: 'site:a',
          week: 1,
        }),
      ],
    })
    expect(report.rows.map((row) => row.siteId)).toEqual(['site:a', 'site:z'])
    const findingKinds = report.findings.map((finding) => finding.kind)
    expect(findingKinds.indexOf('approved_language_pressure')).toBeLessThan(
      findingKinds.indexOf('support_access_restriction')
    )
  })

  it('frozen inputs are not mutated', () => {
    const signals = Object.freeze([
      doctrineSignal({
        signalId: 'frozen',
        kind: 'patient_report_dismissed',
        subjectId: 'agent:frozen',
        protocolId: 'protocol:frozen',
      }),
    ])
    const staff = Object.freeze([
      staffFinding({
        kind: 'high_alignment_low_efficacy',
        staffId: 'staff:frozen',
        subjectId: 'agent:frozen',
        protocolId: 'protocol:frozen',
        detail: 'Frozen.',
      }),
    ])
    buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: signals,
      staffTelemetryFindings: staff,
    })
    expect(Object.isFrozen(signals)).toBe(true)
    expect(Object.isFrozen(staff)).toBe(true)
  })

  it('summary counts match findings', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 's1',
          kind: 'approved_language_requirement',
          staffId: 'staff:sum',
          doctrineId: 'doctrine:sum',
        }),
        doctrineSignal({
          signalId: 's2',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:sum',
          protocolId: 'protocol:sum',
        }),
      ],
    })
    expect(report.summary.approvedLanguagePressureCount).toBe(
      report.findings.filter((f) => f.kind === 'approved_language_pressure').length
    )
    expect(report.summary.patientReportDismissalCount).toBe(
      report.findings.filter((f) => f.kind === 'patient_report_dismissal').length
    )
    expect(report.summary.rowCount).toBe(report.rows.length)
  })

  it('lines contain no SCP/source strings', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'lines',
          kind: 'subject_side_deflection_reinforced',
          subjectId: 'agent:lines',
          protocolId: 'protocol:lines',
          detail: 'Audit line test.',
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          severity: 'warning',
          subjectId: 'agent:lines',
          protocolId: 'protocol:lines',
          detail: 'Blame routing lines test.',
        }),
      ],
    })
    const joined = report.lines.join('\n').toLowerCase()
    expect(joined).not.toContain('scp-')
    expect(joined).not.toContain('scp ')
    expect(joined).not.toContain('9977')
    expect(report.lines.join('\n')).not.toContain('row:row:')
  })

  it('does not import GameState or UI modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/institutionalDenialDoctrinePressure.ts'),
      'utf8'
    )
    expect(source.includes("from './models'")).toBe(false)
    expect(source.includes('gameStore')).toBe(false)
    expect(source.includes('/features/')).toBe(false)
  })

  it('uses type-only imports from upstream pure helper modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/institutionalDenialDoctrinePressure.ts'),
      'utf8'
    )
    expect(source).toMatch(/import type \{ StaffTreatmentTelemetryFinding \}/)
    expect(source).toMatch(/import type \{ MedicalOutcomeDeviationFinding \}/)
    expect(source).toMatch(/import type \{ TreatmentFailureBlameRoutingFinding \}/)
    expect(source).toMatch(/import type \{ MedicalAccountabilityScorecardFinding \}/)
    expect(source).toMatch(/import type \{ AccommodationAccessAuditFinding \}/)
    expect(source.includes('buildStaffTreatmentTelemetryReport')).toBe(false)
    expect(source.includes('buildMedicalOutcomeDeviationAuditReport')).toBe(false)
    expect(source.includes('buildTreatmentFailureBlameRoutingReport')).toBe(false)
    expect(source.includes('buildMedicalAccountabilityScorecard')).toBe(false)
    expect(source.includes('buildAccommodationAccessAuditReport')).toBe(false)
  })

  it('has no reverse imports from upstream modules', () => {
    const upstreamFiles = [
      'staffTreatmentTelemetry.ts',
      'medicalOutcomeDeviationAudit.ts',
      'treatmentFailureBlameRouting.ts',
      'medicalAccountabilityScorecard.ts',
      'accommodationAccessAudit.ts',
    ]
    for (const file of upstreamFiles) {
      const source = readFileSync(path.join(__dirname, '../domain', file), 'utf8')
      expect(source.includes('institutionalDenialDoctrinePressure')).toBe(false)
    }
  })
})
