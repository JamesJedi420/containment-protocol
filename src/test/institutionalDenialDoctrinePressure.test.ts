import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildInstitutionalDenialDoctrinePressureReport,
  type InstitutionalDenialDoctrinePressureInput,
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
    expect(report.rows[0]?.rowId).toBe(
      'row:staff-doctrine/staff%3Aalpha/doctrine%3Adenial/2'
    )
    expect(report.rows[0]?.signalCount).toBe(1)
  })

  it('skips invalid blank signalId and invalid kind signals', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({ signalId: '  ', kind: 'approved_language_requirement' }),
        doctrineSignal({
          signalId: 'invalid-kind',
          kind: 'not_a_real_kind' as InstitutionalDenialDoctrinePressureSignal['kind'],
        }),
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

  it('sparse upstream findings go to deterministic staff rows without throwing', () => {
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
    expect(report.rows[0]?.rowId).toBe('row:staff/staff%3Asparse/')
    expect(report.rows[0]?.staffId).toBe('staff:sparse')
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
    expect(source).toMatch(/export interface InstitutionalDenialDoctrinePressureInput/)
    expect(source.includes('buildStaffTreatmentTelemetryReport')).toBe(false)
    expect(source.includes('buildMedicalOutcomeDeviationAuditReport')).toBe(false)
    expect(source.includes('buildTreatmentFailureBlameRoutingReport')).toBe(false)
    expect(source.includes('buildMedicalAccountabilityScorecard')).toBe(false)
    expect(source.includes('buildAccommodationAccessAuditReport')).toBe(false)
  })

  it('distinct colon-containing buckets produce distinct rows and findings', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-a',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:a:b',
          protocolId: 'protocol:c',
          detail: 'Bucket A.',
        }),
        doctrineSignal({
          signalId: 'sig-b',
          kind: 'overclassification_pressure',
          subjectId: 'agent:a',
          protocolId: 'protocol:b:c',
          detail: 'Bucket B.',
        }),
      ],
    })
    expect(report.rows).toHaveLength(2)
    expect(report.rows[0]?.rowId).not.toBe(report.rows[1]?.rowId)
    const rowA = report.rows.find((row) => row.subjectId === 'agent:a:b')
    const rowB = report.rows.find((row) => row.protocolId === 'protocol:b:c')
    expect(rowA).toBeDefined()
    expect(rowB).toBeDefined()
    expect(
      report.findings.find(
        (finding) => finding.rowId === rowA?.rowId && finding.kind === 'patient_report_dismissal'
      )?.detail
    ).toBe('Bucket A.')
    expect(
      report.findings.find(
        (finding) =>
          finding.rowId === rowB?.rowId && finding.kind === 'overclassification_pressure'
      )?.detail
    ).toBe('Bucket B.')
  })

  it('keeps distinct staff telemetry rows for same subject/protocol/week', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:one',
          subjectId: 'agent:shared',
          protocolId: 'protocol:shared',
          week: 2,
          detail: 'Staff one pressure.',
        }),
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:two',
          subjectId: 'agent:shared',
          protocolId: 'protocol:shared',
          week: 2,
          detail: 'Staff two pressure.',
        }),
      ],
    })
    expect(report.rows).toHaveLength(2)
    expect(report.rows.map((row) => row.staffId).sort()).toEqual(['staff:one', 'staff:two'])
    expect(
      report.findings.filter((finding) => finding.kind === 'high_alignment_poor_outcome_pressure')
    ).toHaveLength(2)
  })

  it('skips malformed runtime signals without throwing', () => {
    expect(() =>
      buildInstitutionalDenialDoctrinePressureReport({
        doctrinePressureSignals: [
          { signalId: null, kind: 'approved_language_requirement' } as never,
          { signalId: 'null-kind', kind: null } as never,
          {
            signalId: 'bad-ids',
            kind: 'approved_language_requirement',
            staffId: 42,
            subjectId: false,
          } as never,
          doctrineSignal({
            signalId: 'good',
            kind: 'support_access_restricted',
            siteId: 'site:safe',
          }),
        ],
      })
    ).not.toThrow()
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        { signalId: null, kind: 'approved_language_requirement' } as never,
        { signalId: 'null-kind', kind: null } as never,
        {
          signalId: 'bad-ids',
          kind: 'approved_language_requirement',
          staffId: 42,
          subjectId: false,
        } as never,
        doctrineSignal({
          signalId: 'good',
          kind: 'support_access_restricted',
          siteId: 'site:safe',
        }),
      ],
    })
    const siteRow = report.rows.find((row) => row.siteId === 'site:safe')
    expect(siteRow).toBeDefined()
    expect(siteRow?.staffId).toBeUndefined()
    expect(siteRow?.subjectId).toBeUndefined()
    const aggregateRow = report.rows.find((row) => row.rowId === 'row:aggregate')
    expect(aggregateRow?.siteId).toBeUndefined()
    expect(aggregateRow?.staffId).toBeUndefined()
  })

  it('skips prototype-like signal kinds such as toString', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        { signalId: 'proto', kind: 'toString' } as never,
        doctrineSignal({
          signalId: 'valid',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:proto',
          protocolId: 'protocol:proto',
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.findings.some((finding) => finding.kind === 'patient_report_dismissal')).toBe(
      true
    )
  })

  it('emits insufficient evidence for gated-only upstream rows', () => {
    const institutionalOnly = buildInstitutionalDenialDoctrinePressureReport({
      blameRoutingFindings: [
        blameFinding({
          kind: 'institutional_accountability_required',
          severity: 'warning',
          subjectId: 'agent:gate',
          protocolId: 'protocol:gate',
          detail: 'Institutional accountability only.',
        }),
      ],
    })
    expect(
      institutionalOnly.findings.some((finding) => finding.kind === 'insufficient_pressure_evidence')
    ).toBe(true)
    expect(
      institutionalOnly.findings.some((finding) => finding.kind === 'material_outcome_suppression')
    ).toBe(false)

    const cureOnly = buildInstitutionalDenialDoctrinePressureReport({
      accommodationFindings: [
        accommodationFinding({
          kind: 'cure_only_pressure_high',
          severity: 'warning',
          rowId: 'row:acc-gate',
          subjectId: 'agent:gate',
          protocolId: 'protocol:gate',
          detail: 'Cure-only pressure only.',
        }),
      ],
    })
    expect(cureOnly.findings.some((finding) => finding.kind === 'insufficient_pressure_evidence')).toBe(
      true
    )
    expect(
      cureOnly.findings.some((finding) => finding.kind === 'care_mode_discussion_restriction')
    ).toBe(false)

    const withContext = buildInstitutionalDenialDoctrinePressureReport({
      accommodationFindings: [
        accommodationFinding({
          kind: 'cure_only_pressure_high',
          severity: 'warning',
          rowId: 'row:acc-gate',
          subjectId: 'agent:gate',
          protocolId: 'protocol:gate',
          detail: 'Cure-only pressure only.',
        }),
      ],
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'doctrine',
          kind: 'care_mode_discussion_restricted',
          subjectId: 'agent:gate',
          protocolId: 'protocol:gate',
        }),
      ],
    })
    expect(
      withContext.findings.some((finding) => finding.kind === 'care_mode_discussion_restriction')
    ).toBe(true)
  })

  it('preserves unambiguous staffId from signal-only subject/protocol rows', () => {
    const singleStaff = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-staff',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:signal-staff',
          protocolId: 'protocol:signal-staff',
          staffId: 'staff:signal-only',
          detail: 'Signal-only staff attribution.',
        }),
      ],
    })
    expect(singleStaff.rows[0]?.staffId).toBe('staff:signal-only')
    expect(singleStaff.findings[0]?.staffId).toBe('staff:signal-only')

    const matchingStaff = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-a',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:shared-signal',
          protocolId: 'protocol:shared-signal',
          staffId: 'staff:same',
        }),
        doctrineSignal({
          signalId: 'sig-b',
          kind: 'overclassification_pressure',
          subjectId: 'agent:shared-signal',
          protocolId: 'protocol:shared-signal',
          staffId: 'staff:same',
        }),
      ],
    })
    expect(matchingStaff.rows).toHaveLength(1)
    expect(matchingStaff.rows[0]?.staffId).toBe('staff:same')

    const conflictingStaff = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-conflict-a',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:conflict-signal',
          protocolId: 'protocol:conflict-signal',
          staffId: 'staff:alpha',
        }),
        doctrineSignal({
          signalId: 'sig-conflict-b',
          kind: 'material_outcome_suppressed',
          subjectId: 'agent:conflict-signal',
          protocolId: 'protocol:conflict-signal',
          staffId: 'staff:beta',
        }),
      ],
    })
    expect(conflictingStaff.rows[0]?.staffId).toBeUndefined()
    expect(conflictingStaff.findings.every((finding) => finding.staffId === undefined)).toBe(true)
  })

  it('preserves unambiguous siteId from signal-only subject/protocol rows', () => {
    const singleSite = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-site',
          kind: 'material_outcome_suppressed',
          subjectId: 'agent:signal-site',
          protocolId: 'protocol:signal-site',
          siteId: 'site:signal-only',
        }),
      ],
    })
    expect(singleSite.rows[0]?.siteId).toBe('site:signal-only')

    const conflictingSite = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'sig-site-a',
          kind: 'patient_report_dismissed',
          subjectId: 'agent:conflict-site',
          protocolId: 'protocol:conflict-site',
          siteId: 'site:alpha',
        }),
        doctrineSignal({
          signalId: 'sig-site-b',
          kind: 'support_access_restricted',
          subjectId: 'agent:conflict-site',
          protocolId: 'protocol:conflict-site',
          siteId: 'site:beta',
        }),
      ],
    })
    expect(conflictingSite.rows[0]?.siteId).toBeUndefined()
  })

  it('does not misattribute conflicting optional IDs on aggregate buckets', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      doctrinePressureSignals: [
        doctrineSignal({
          signalId: 'site-only',
          kind: 'support_access_restricted',
          siteId: 'site:aggregate',
        }),
        doctrineSignal({
          signalId: 'staff-only',
          kind: 'dissenting_staff_exclusion_pressure',
          staffId: 'staff:other',
          doctrineId: 'doctrine:other',
        }),
      ],
    })
    expect(report.rows).toHaveLength(2)
    const siteRow = report.rows.find((row) => row.siteId === 'site:aggregate')
    const staffRow = report.rows.find((row) => row.staffId === 'staff:other')
    expect(siteRow?.subjectId).toBeUndefined()
    expect(siteRow?.staffId).toBeUndefined()
    expect(staffRow?.siteId).toBeUndefined()
    expect(staffRow?.subjectId).toBeUndefined()
  })

  it('preserves unambiguous scorecard and accommodation metadata on subject rows', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport({
      medicalScorecardFindings: [
        scorecardFinding({
          kind: 'high_alignment_poor_outcome',
          severity: 'warning',
          rowId: 'row:score-meta',
          subjectId: 'agent:meta',
          protocolId: 'protocol:meta',
          staffId: 'staff:meta',
          siteId: 'site:meta',
          detail: 'Scorecard metadata.',
        }),
      ],
      accommodationFindings: [
        accommodationFinding({
          kind: 'care_mode_unavailable',
          severity: 'warning',
          rowId: 'row:acc-meta',
          subjectId: 'agent:meta',
          protocolId: 'protocol:meta',
          siteId: 'site:meta',
          detail: 'Accommodation metadata.',
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.staffId).toBe('staff:meta')
    expect(report.rows[0]?.siteId).toBe('site:meta')
  })

  it('returns empty deterministic report for nullish runtime input', () => {
    const report = buildInstitutionalDenialDoctrinePressureReport(
      null as unknown as InstitutionalDenialDoctrinePressureInput
    )
    expect(report.rows).toEqual([])
    expect(report.findings).toEqual([])
    expect(report.lines[0]).toBe(
      'Institutional denial doctrine pressure: rows=0, findings=0, critical=0'
    )
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
