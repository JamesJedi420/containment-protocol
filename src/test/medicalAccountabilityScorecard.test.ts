import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildMedicalAccountabilityScorecard,
  type MedicalAccountabilitySiteSignal,
} from '../domain/medicalAccountabilityScorecard'
import type { MedicalOutcomeDeviationFinding } from '../domain/medicalOutcomeDeviationAudit'
import type { StaffTreatmentTelemetryFinding } from '../domain/staffTreatmentTelemetry'
import type { TreatmentFailureBlameRoutingFinding } from '../domain/treatmentFailureBlameRouting'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

function siteSignal(
  overrides: Partial<MedicalAccountabilitySiteSignal> &
    Pick<MedicalAccountabilitySiteSignal, 'signalId' | 'siteId'>
): MedicalAccountabilitySiteSignal {
  return { ...overrides }
}

describe('medicalAccountabilityScorecard (SPE-2008)', () => {
  it('returns empty report for empty input without throwing', () => {
    const report = buildMedicalAccountabilityScorecard({})
    expect(report.rows).toEqual([])
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({
      rowCount: 0,
      highAlignmentPoorOutcomeCount: 0,
      outcomeAccountabilityGapCount: 0,
      subjectDeflectionPressureCount: 0,
      treatmentLimitationUnacknowledgedCount: 0,
      accommodationAccessGapCount: 0,
      careModeMissingCount: 0,
      governanceReviewNeededCount: 0,
      insufficientEvidenceCount: 0,
    })
    expect(report.lines[0]).toContain('rows=0')
  })

  it('builds row from staff telemetry finding', () => {
    const report = buildMedicalAccountabilityScorecard({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'outcome_below_expected',
          staffId: 'staff:medic-1',
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          week: 3,
          alignmentScore: 80,
          efficacyScore: 35,
          detail: 'Outcome below expected.',
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({
      staffId: 'staff:medic-1',
      subjectId: 'agent:patient-1',
      protocolId: 'protocol:stabilize',
      week: 3,
      doctrineAlignmentScore: 80,
      treatmentEfficacyScore: 35,
    })
  })

  it('builds row from medical deviation finding', () => {
    const report = buildMedicalAccountabilityScorecard({
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'outcome_below_prediction',
          severity: 'warning',
          subjectId: 'agent:patient-2',
          protocolId: 'protocol:therapy',
          week: 2,
          detail: 'Observed outcome trails prediction.',
        }),
      ],
    })
    expect(report.rows[0]).toMatchObject({
      subjectId: 'agent:patient-2',
      protocolId: 'protocol:therapy',
      week: 2,
      outcomeDeviationCount: 1,
    })
  })

  it('builds row from blame-routing finding', () => {
    const report = buildMedicalAccountabilityScorecard({
      blameRoutingFindings: [
        blameFinding({
          kind: 'approved_accountability_route',
          severity: 'info',
          subjectId: 'agent:patient-3',
          protocolId: 'protocol:stabilize',
          week: 4,
          detail: 'Staff route approved.',
          recommendedAccountabilityFocus: 'staff',
        }),
      ],
    })
    expect(report.rows[0]?.accountabilityRouteQualityScore).toBe(60)
  })

  it('builds row from site signal', () => {
    const report = buildMedicalAccountabilityScorecard({
      siteSignals: [
        siteSignal({
          signalId: 'site-signal:infirmary',
          siteId: 'site:infirmary',
          week: 1,
          accommodationAccessScore: 55,
          careModeCoverageScore: 60,
        }),
      ],
    })
    expect(report.rows[0]).toMatchObject({
      siteId: 'site:infirmary',
      week: 1,
      accommodationAccessScore: 55,
      careModeCoverageScore: 60,
    })
  })

  it('emits high_alignment_poor_outcome when alignment high and efficacy poor', () => {
    const report = buildMedicalAccountabilityScorecard({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:medic-4',
          subjectId: 'agent:patient-4',
          protocolId: 'protocol:stabilize',
          alignmentScore: 85,
          efficacyScore: 30,
          detail: 'High alignment with low efficacy.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'high_alignment_poor_outcome')).toBe(true)
    expect(report.summary.highAlignmentPoorOutcomeCount).toBe(1)
  })

  it('emits outcome_accountability_gap when deviation without accountability quality', () => {
    const report = buildMedicalAccountabilityScorecard({
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'outcome_below_prediction',
          severity: 'warning',
          subjectId: 'agent:patient-5',
          protocolId: 'protocol:stabilize',
          detail: 'Deviation present.',
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'institutional_accountability_required',
          severity: 'warning',
          subjectId: 'agent:patient-5',
          protocolId: 'protocol:stabilize',
          detail: 'Institutional review required.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'outcome_accountability_gap')).toBe(true)
  })

  it('emits subject_deflection_pressure for prohibited subject deflection', () => {
    const report = buildMedicalAccountabilityScorecard({
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          severity: 'critical',
          subjectId: 'agent:patient-6',
          protocolId: 'protocol:stabilize',
          detail: 'Automatic deflection blocked.',
        }),
      ],
    })
    const finding = report.findings.find((f) => f.kind === 'subject_deflection_pressure')
    expect(finding?.severity).toBe('critical')
    expect(report.summary.subjectDeflectionPressureCount).toBe(1)
  })

  it('emits treatment_limitation_unacknowledged from blame routing', () => {
    const report = buildMedicalAccountabilityScorecard({
      blameRoutingFindings: [
        blameFinding({
          kind: 'missing_treatment_limitation_acknowledgment',
          severity: 'warning',
          subjectId: 'agent:patient-7',
          protocolId: 'protocol:stabilize',
          detail: 'Acknowledgment missing.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'treatment_limitation_unacknowledged')).toBe(
      true
    )
  })

  it('emits accommodation_access_gap when accommodation score is low', () => {
    const report = buildMedicalAccountabilityScorecard({
      siteSignals: [
        siteSignal({
          signalId: 'site:low-acc',
          siteId: 'site:ward-a',
          accommodationAccessScore: 25,
        }),
      ],
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'outcome_below_prediction',
          severity: 'warning',
          subjectId: 'agent:ward-a',
          protocolId: 'protocol:ward',
          detail: 'Linked deviation for site row evidence.',
        }),
      ],
    })
    const siteRow = report.rows.find((row) => row.siteId === 'site:ward-a')
    expect(siteRow?.accommodationAccessScore).toBe(25)
    expect(
      report.findings.some(
        (f) => f.kind === 'accommodation_access_gap' && f.siteId === 'site:ward-a'
      )
    ).toBe(true)
  })

  it('emits care_mode_missing when care-mode coverage is low', () => {
    const report = buildMedicalAccountabilityScorecard({
      siteSignals: [
        siteSignal({
          signalId: 'site:low-care',
          siteId: 'site:ward-b',
          careModeCoverageScore: 20,
        }),
      ],
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'missing_observation',
          severity: 'info',
          subjectId: 'agent:patient-8',
          protocolId: 'protocol:observe',
          detail: 'Missing observation only.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'care_mode_missing')).toBe(true)
  })

  it('emits governance_review_needed when governance pressure is high', () => {
    const report = buildMedicalAccountabilityScorecard({
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'governance_notification_candidate',
          severity: 'critical',
          subjectId: 'agent:patient-9',
          protocolId: 'protocol:stabilize',
          detail: 'Governance candidate.',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'governance_review_needed')).toBe(true)
    expect(report.rows[0]?.governanceReviewPressureScore).toBeGreaterThan(0)
  })

  it('emits insufficient_scorecard_evidence for sparse site-only row', () => {
    const report = buildMedicalAccountabilityScorecard({
      siteSignals: [
        siteSignal({
          signalId: 'site:sparse',
          siteId: 'site:sparse',
        }),
      ],
    })
    expect(report.findings.some((f) => f.kind === 'insufficient_scorecard_evidence')).toBe(true)
  })

  it('improves accountability quality for approved accountability route', () => {
    const withApproval = buildMedicalAccountabilityScorecard({
      blameRoutingFindings: [
        blameFinding({
          kind: 'approved_accountability_route',
          severity: 'info',
          subjectId: 'agent:patient-10',
          protocolId: 'protocol:stabilize',
          detail: 'Approved route.',
        }),
      ],
    })
    const withDeflection = buildMedicalAccountabilityScorecard({
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          severity: 'warning',
          subjectId: 'agent:patient-10b',
          protocolId: 'protocol:stabilize',
          detail: 'Deflection blocked.',
        }),
      ],
    })
    expect(withApproval.rows[0]?.accountabilityRouteQualityScore).toBe(60)
    expect(withDeflection.rows[0]?.accountabilityRouteQualityScore).toBe(25)
  })

  it('produces deterministic ordering across repeated calls', () => {
    const input = {
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:z',
          subjectId: 'agent:z',
          protocolId: 'protocol:z',
          week: 2,
          alignmentScore: 90,
          efficacyScore: 20,
          detail: 'Z row.',
        }),
        staffFinding({
          kind: 'outcome_below_expected',
          staffId: 'staff:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          week: 1,
          alignmentScore: 50,
          efficacyScore: 50,
          detail: 'A row.',
        }),
      ],
    }
    const first = buildMedicalAccountabilityScorecard(input)
    const second = buildMedicalAccountabilityScorecard(input)
    expect(first).toEqual(second)
  })

  it('does not mutate frozen inputs', () => {
    const staffTelemetryFindings = Object.freeze([
      Object.freeze(
        staffFinding({
          kind: 'outcome_below_expected',
          staffId: 'staff:immutable',
          detail: 'Immutable staff finding.',
        })
      ),
    ]) as readonly StaffTreatmentTelemetryFinding[]

    const before = JSON.stringify(staffTelemetryFindings)
    buildMedicalAccountabilityScorecard({ staffTelemetryFindings })
    expect(JSON.stringify(staffTelemetryFindings)).toBe(before)
  })

  it('handles duplicate site signal IDs deterministically', () => {
    const report = buildMedicalAccountabilityScorecard({
      siteSignals: [
        siteSignal({
          signalId: 'dup-signal',
          siteId: 'site:dup',
          accommodationAccessScore: 30,
        }),
        siteSignal({
          signalId: 'dup-signal',
          siteId: 'site:dup',
          accommodationAccessScore: 90,
        }),
      ],
    })
    const siteRows = report.rows.filter((row) => row.siteId === 'site:dup')
    expect(siteRows).toHaveLength(1)
    expect(siteRows[0]?.accommodationAccessScore).toBe(30)
  })

  it('applies threshold overrides', () => {
    const report = buildMedicalAccountabilityScorecard({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:thresh',
          subjectId: 'agent:thresh',
          protocolId: 'protocol:thresh',
          alignmentScore: 60,
          efficacyScore: 45,
          detail: 'Borderline row.',
        }),
      ],
      options: {
        highAlignmentThreshold: 55,
        poorOutcomeThreshold: 50,
      },
    })
    expect(report.findings.some((f) => f.kind === 'high_alignment_poor_outcome')).toBe(true)
  })

  it('uses resolved options for inferred alignment and efficacy fallback scores', () => {
    const report = buildMedicalAccountabilityScorecard({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:fallback',
          subjectId: 'agent:fallback',
          protocolId: 'protocol:fallback',
          detail: 'Kind-only telemetry without numeric scores.',
        }),
      ],
      options: {
        highAlignmentThreshold: 88,
        poorOutcomeThreshold: 22,
      },
    })
    expect(report.rows[0]?.doctrineAlignmentScore).toBe(88)
    expect(report.rows[0]?.treatmentEfficacyScore).toBe(22)
  })

  it('summary counts match findings', () => {
    const report = buildMedicalAccountabilityScorecard({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:summary',
          subjectId: 'agent:summary',
          protocolId: 'protocol:summary',
          alignmentScore: 90,
          efficacyScore: 20,
          detail: 'Summary row.',
        }),
      ],
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'outcome_below_prediction',
          severity: 'critical',
          subjectId: 'agent:summary',
          protocolId: 'protocol:summary',
          detail: 'Deviation for summary.',
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          severity: 'critical',
          subjectId: 'agent:summary',
          protocolId: 'protocol:summary',
          detail: 'Deflection for summary.',
        }),
      ],
    })

    expect(report.summary.rowCount).toBe(report.rows.length)
    expect(report.summary.highAlignmentPoorOutcomeCount).toBe(
      report.findings.filter((f) => f.kind === 'high_alignment_poor_outcome').length
    )
    expect(report.summary.outcomeAccountabilityGapCount).toBe(
      report.findings.filter((f) => f.kind === 'outcome_accountability_gap').length
    )
    expect(report.summary.subjectDeflectionPressureCount).toBe(
      report.findings.filter((f) => f.kind === 'subject_deflection_pressure').length
    )
    expect(report.summary.treatmentLimitationUnacknowledgedCount).toBe(
      report.findings.filter((f) => f.kind === 'treatment_limitation_unacknowledged').length
    )
    expect(report.summary.accommodationAccessGapCount).toBe(
      report.findings.filter((f) => f.kind === 'accommodation_access_gap').length
    )
    expect(report.summary.careModeMissingCount).toBe(
      report.findings.filter((f) => f.kind === 'care_mode_missing').length
    )
    expect(report.summary.governanceReviewNeededCount).toBe(
      report.findings.filter((f) => f.kind === 'governance_review_needed').length
    )
    expect(report.summary.insufficientEvidenceCount).toBe(
      report.findings.filter((f) => f.kind === 'insufficient_scorecard_evidence').length
    )
  })

  it('lines contain no SCP or harvest batch source strings', () => {
    const report = buildMedicalAccountabilityScorecard({
      staffTelemetryFindings: [
        staffFinding({
          kind: 'high_alignment_low_efficacy',
          staffId: 'staff:lines',
          subjectId: 'agent:lines',
          protocolId: 'protocol:lines',
          alignmentScore: 88,
          efficacyScore: 22,
          detail: 'Lines test row.',
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          severity: 'warning',
          subjectId: 'agent:lines',
          protocolId: 'protocol:lines',
          detail: 'Deflection lines test.',
        }),
      ],
    })
    const joined = report.lines.join('\n').toLowerCase()
    expect(joined).not.toContain('scp-')
    expect(joined).not.toContain('scp ')
    expect(joined).not.toContain('9977')
  })

  it('does not import GameState or UI modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/medicalAccountabilityScorecard.ts'),
      'utf8'
    )
    expect(source.includes("from './models'")).toBe(false)
    expect(source.includes('gameStore')).toBe(false)
    expect(source.includes('/features/')).toBe(false)
  })

  it('uses type-only imports from upstream modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/medicalAccountabilityScorecard.ts'),
      'utf8'
    )
    expect(source).toMatch(/import type \{ StaffTreatmentTelemetryFinding \}/)
    expect(source).toMatch(/import type \{ MedicalOutcomeDeviationFinding \}/)
    expect(source).toMatch(/import type \{ TreatmentFailureBlameRoutingFinding \}/)
    expect(source.includes('buildStaffTreatmentTelemetryReport')).toBe(false)
    expect(source.includes('buildMedicalOutcomeDeviationAuditReport')).toBe(false)
    expect(source.includes('buildTreatmentFailureBlameRoutingReport')).toBe(false)
  })

  it('has no reverse imports from upstream modules', () => {
    const staffSource = readFileSync(
      path.join(__dirname, '../domain/staffTreatmentTelemetry.ts'),
      'utf8'
    )
    const deviationSource = readFileSync(
      path.join(__dirname, '../domain/medicalOutcomeDeviationAudit.ts'),
      'utf8'
    )
    const blameSource = readFileSync(
      path.join(__dirname, '../domain/treatmentFailureBlameRouting.ts'),
      'utf8'
    )
    expect(staffSource.includes('medicalAccountabilityScorecard')).toBe(false)
    expect(deviationSource.includes('medicalAccountabilityScorecard')).toBe(false)
    expect(blameSource.includes('medicalAccountabilityScorecard')).toBe(false)
  })
})
