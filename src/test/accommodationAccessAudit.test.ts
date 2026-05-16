import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildAccommodationAccessAuditReport,
  type AccommodationAccessSignal,
} from '../domain/accommodationAccessAudit'
import type { MedicalOutcomeDeviationFinding } from '../domain/medicalOutcomeDeviationAudit'
import type { TreatmentFailureBlameRoutingFinding } from '../domain/treatmentFailureBlameRouting'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function signal(
  overrides: Partial<AccommodationAccessSignal> &
    Pick<AccommodationAccessSignal, 'signalId' | 'subjectId' | 'protocolId'>
): AccommodationAccessSignal {
  return { ...overrides }
}

function deviationFinding(
  overrides: Partial<MedicalOutcomeDeviationFinding> &
    Pick<MedicalOutcomeDeviationFinding, 'kind' | 'subjectId' | 'protocolId' | 'detail'>
): MedicalOutcomeDeviationFinding {
  return {
    severity: 'warning',
    ...overrides,
  }
}

function blameFinding(
  overrides: Partial<TreatmentFailureBlameRoutingFinding> &
    Pick<TreatmentFailureBlameRoutingFinding, 'kind' | 'subjectId' | 'protocolId' | 'detail'>
): TreatmentFailureBlameRoutingFinding {
  return {
    severity: 'warning',
    ...overrides,
  }
}

describe('accommodationAccessAudit (SPE-2011)', () => {
  it('returns empty report for empty input without throwing', () => {
    const report = buildAccommodationAccessAuditReport({ accommodationSignals: [] })
    expect(report.rows).toEqual([])
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({
      rowCount: 0,
      accommodationAccessGapCount: 0,
      cureOnlyPressureHighCount: 0,
      careModeUnavailableCount: 0,
      maintenanceFramedAsFailureCount: 0,
      treatmentLimitationUnacknowledgedCount: 0,
      outcomeWorsenedWithoutAccommodationReviewCount: 0,
      accountabilityRouteConflictCount: 0,
      insufficientEvidenceCount: 0,
    })
    expect(report.lines[0]).toContain('rows=0')
    expect(report.lines[0]).toContain('findings=0')
  })

  it('builds row from valid accommodation signal', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:1',
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          siteId: 'site:alpha',
          week: 2,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['accommodation', 'stabilization'],
          accommodationAccessScore: 55,
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({
      rowId: 'accommodation:sig:1',
      signalId: 'sig:1',
      subjectId: 'agent:patient-1',
      protocolId: 'protocol:stabilize',
      siteId: 'site:alpha',
      week: 2,
      offeredCareModes: ['accommodation', 'stabilization'],
    })
  })

  it('skips invalid blank signalId, subjectId, and protocolId', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({ signalId: '', subjectId: 'agent:a', protocolId: 'protocol:p' }),
        signal({ signalId: 'sig:a', subjectId: '  ', protocolId: 'protocol:p' }),
        signal({ signalId: 'sig:b', subjectId: 'agent:b', protocolId: '' }),
        signal({
          signalId: 'sig:valid',
          subjectId: 'agent:valid',
          protocolId: 'protocol:ok',
          accommodationAccessScore: 80,
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.signalId).toBe('sig:valid')
  })

  it('deduplicates duplicate signalId deterministically', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:dup',
          subjectId: 'agent:first',
          protocolId: 'protocol:a',
          accommodationAccessScore: 10,
        }),
        signal({
          signalId: 'sig:dup',
          subjectId: 'agent:second',
          protocolId: 'protocol:b',
          accommodationAccessScore: 90,
        }),
      ],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.subjectId).toBe('agent:first')
    expect(report.rows[0]?.accommodationAccessScore).toBe(10)
  })

  it('emits accommodation_access_gap for low accommodation access', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:low',
          subjectId: 'agent:low',
          protocolId: 'protocol:care',
          accommodationAccessScore: 30,
          cureOnlyPressureScore: 50,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'accommodation_access_gap')
    expect(finding?.severity).toBe('warning')
  })

  it('emits critical accommodation_access_gap when score is zero', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:zero',
          subjectId: 'agent:zero',
          protocolId: 'protocol:care',
          accommodationAccessScore: 0,
          cureOnlyPressureScore: 50,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'accommodation_access_gap')
    expect(finding?.severity).toBe('critical')
  })

  it('emits cure_only_pressure_high for high cure-only pressure', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:pressure',
          subjectId: 'agent:pressure',
          protocolId: 'protocol:care',
          accommodationAccessScore: 60,
          cureOnlyPressureScore: 75,
          requestedCareMode: 'maintenance',
          offeredCareModes: ['maintenance'],
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'cure_only_pressure_high')
    expect(finding?.severity).toBe('warning')
  })

  it('emits critical cure_only_pressure_high when score is 100', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:max',
          subjectId: 'agent:max',
          protocolId: 'protocol:care',
          accommodationAccessScore: 60,
          cureOnlyPressureScore: 100,
          requestedCareMode: 'maintenance',
          offeredCareModes: ['maintenance'],
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'cure_only_pressure_high')
    expect(finding?.severity).toBe('critical')
  })

  it('emits care_mode_unavailable when requested mode is missing from offered modes', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:mode',
          subjectId: 'agent:mode',
          protocolId: 'protocol:care',
          accommodationAccessScore: 60,
          cureOnlyPressureScore: 50,
          requestedCareMode: 'symptom_management',
          offeredCareModes: ['cure_attempt', 'stabilization'],
        }),
      ],
    })
    const finding = report.findings.find((row) => row.kind === 'care_mode_unavailable')
    expect(finding?.severity).toBe('warning')
  })

  it('emits critical care_mode_unavailable for unavailable accommodation or maintenance', () => {
    const accommodationReport = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:acc',
          subjectId: 'agent:acc',
          protocolId: 'protocol:care',
          accommodationAccessScore: 60,
          cureOnlyPressureScore: 50,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    const maintenanceReport = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:maint',
          subjectId: 'agent:maint',
          protocolId: 'protocol:care',
          accommodationAccessScore: 60,
          cureOnlyPressureScore: 50,
          requestedCareMode: 'maintenance',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    expect(
      accommodationReport.findings.find((row) => row.kind === 'care_mode_unavailable')?.severity
    ).toBe('critical')
    expect(
      maintenanceReport.findings.find((row) => row.kind === 'care_mode_unavailable')?.severity
    ).toBe('critical')
  })

  it('emits maintenance_framed_as_failure under doctrine pressure', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:doctrine',
          subjectId: 'agent:doctrine',
          protocolId: 'protocol:care',
          requestedCareMode: 'maintenance',
          offeredCareModes: ['cure_attempt'],
          denialRationale: 'doctrine_pressure',
          cureOnlyPressureScore: 80,
          accommodationAccessScore: 60,
        }),
      ],
    })
    expect(
      report.findings.some((finding) => finding.kind === 'maintenance_framed_as_failure')
    ).toBe(true)
  })

  it('emits treatment_limitation_unacknowledged for limitation denial without acknowledgment', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:limit',
          subjectId: 'agent:limit',
          protocolId: 'protocol:care',
          denialRationale: 'protocol_ceiling',
          treatmentLimitationAcknowledged: false,
          accommodationAccessScore: 50,
          cureOnlyPressureScore: 40,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['stabilization'],
        }),
      ],
    })
    expect(
      report.findings.some((finding) => finding.kind === 'treatment_limitation_unacknowledged')
    ).toBe(true)
  })

  it('suppresses local treatment_limitation_unacknowledged when limitation is acknowledged', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:ack',
          subjectId: 'agent:ack',
          protocolId: 'protocol:care',
          denialRationale: 'resource_limit',
          treatmentLimitationAcknowledged: true,
          accommodationAccessScore: 50,
          cureOnlyPressureScore: 40,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['stabilization'],
        }),
      ],
    })
    expect(
      report.findings.some((finding) => finding.kind === 'treatment_limitation_unacknowledged')
    ).toBe(false)
  })

  it('emits treatment_limitation_unacknowledged from matching SPE-2006 upstream finding', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:upstream-ack',
          subjectId: 'agent:upstream',
          protocolId: 'protocol:care',
          accommodationAccessScore: 50,
          cureOnlyPressureScore: 40,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['stabilization'],
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'missing_treatment_limitation_acknowledgment',
          subjectId: 'agent:upstream',
          protocolId: 'protocol:care',
          detail: 'Fixture upstream missing acknowledgment.',
        }),
      ],
    })
    expect(
      report.findings.some((finding) => finding.kind === 'treatment_limitation_unacknowledged')
    ).toBe(true)
  })

  it('emits outcome_worsened_without_accommodation_review from matching deviation finding', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:outcome',
          subjectId: 'agent:outcome',
          protocolId: 'protocol:care',
          week: 3,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['stabilization', 'cure_attempt'],
          accommodationAccessScore: 50,
          cureOnlyPressureScore: 40,
        }),
      ],
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'symptom_burden_worsened',
          subjectId: 'agent:outcome',
          protocolId: 'protocol:care',
          week: 3,
          severity: 'critical',
          detail: 'Symptom burden worsened.',
        }),
      ],
    })
    const finding = report.findings.find(
      (row) => row.kind === 'outcome_worsened_without_accommodation_review'
    )
    expect(finding?.severity).toBe('critical')
  })

  it('emits accountability_route_conflicts_with_limitation from matching blame finding', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:blame',
          subjectId: 'agent:blame',
          protocolId: 'protocol:care',
          denialRationale: 'doctrine_pressure',
          treatmentLimitationAcknowledged: false,
          accommodationAccessScore: 50,
          cureOnlyPressureScore: 40,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['stabilization'],
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'prohibited_subject_deflection',
          subjectId: 'agent:blame',
          protocolId: 'protocol:care',
          severity: 'critical',
          detail: 'Subject deflection blocked.',
        }),
      ],
    })
    const finding = report.findings.find(
      (row) => row.kind === 'accountability_route_conflicts_with_limitation'
    )
    expect(finding?.severity).toBe('critical')
  })

  it('does not match upstream findings for unrelated subject, protocol, or week', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:match',
          subjectId: 'agent:match',
          protocolId: 'protocol:care',
          week: 1,
          accommodationAccessScore: 50,
          cureOnlyPressureScore: 40,
          requestedCareMode: 'stabilization',
          offeredCareModes: ['stabilization'],
        }),
      ],
      medicalDeviationFindings: [
        deviationFinding({
          kind: 'symptom_burden_worsened',
          subjectId: 'agent:other',
          protocolId: 'protocol:care',
          detail: 'Wrong subject.',
        }),
        deviationFinding({
          kind: 'symptom_burden_worsened',
          subjectId: 'agent:match',
          protocolId: 'protocol:other',
          detail: 'Wrong protocol.',
        }),
        deviationFinding({
          kind: 'symptom_burden_worsened',
          subjectId: 'agent:match',
          protocolId: 'protocol:care',
          week: 9,
          detail: 'Wrong week.',
        }),
      ],
      blameRoutingFindings: [
        blameFinding({
          kind: 'institutional_accountability_required',
          subjectId: 'agent:other',
          protocolId: 'protocol:care',
          detail: 'Wrong subject blame.',
        }),
      ],
    })
    expect(
      report.findings.some(
        (finding) => finding.kind === 'outcome_worsened_without_accommodation_review'
      )
    ).toBe(false)
    expect(
      report.findings.some(
        (finding) => finding.kind === 'accountability_route_conflicts_with_limitation'
      )
    ).toBe(false)
  })

  it('emits insufficient_accommodation_evidence for sparse row', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:sparse',
          subjectId: 'agent:sparse',
          protocolId: 'protocol:care',
        }),
      ],
    })
    expect(
      report.findings.some((finding) => finding.kind === 'insufficient_accommodation_evidence')
    ).toBe(true)
  })

  it('applies threshold overrides from options', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:opts',
          subjectId: 'agent:opts',
          protocolId: 'protocol:care',
          accommodationAccessScore: 55,
          cureOnlyPressureScore: 65,
        }),
      ],
      options: {
        lowAccommodationAccessThreshold: 50,
        highCureOnlyPressureThreshold: 80,
        minimumEvidenceCount: 3,
      },
    })
    expect(
      report.findings.some((finding) => finding.kind === 'accommodation_access_gap')
    ).toBe(false)
    expect(
      report.findings.some((finding) => finding.kind === 'cure_only_pressure_high')
    ).toBe(false)
    expect(
      report.findings.some((finding) => finding.kind === 'insufficient_accommodation_evidence')
    ).toBe(true)
  })

  it('sorts rows, findings, and lines deterministically', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:z',
          subjectId: 'agent:z',
          protocolId: 'protocol:z',
          siteId: 'site:b',
          accommodationAccessScore: 0,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['cure_attempt'],
        }),
        signal({
          signalId: 'sig:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          siteId: 'site:a',
          cureOnlyPressureScore: 100,
          requestedCareMode: 'maintenance',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    expect(report.rows.map((row) => row.signalId)).toEqual(['sig:a', 'sig:z'])
    const reportRepeat = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:z',
          subjectId: 'agent:z',
          protocolId: 'protocol:z',
          siteId: 'site:b',
          accommodationAccessScore: 0,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['cure_attempt'],
        }),
        signal({
          signalId: 'sig:a',
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          siteId: 'site:a',
          cureOnlyPressureScore: 100,
          requestedCareMode: 'maintenance',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    expect(reportRepeat.rows).toEqual(report.rows)
    expect(reportRepeat.findings).toEqual(report.findings)
    expect(reportRepeat.lines).toEqual(report.lines)
    expect(report.findings[0]?.severity).toBe('critical')
    expect(report.lines.length).toBeGreaterThan(1)
  })

  it('does not mutate frozen inputs', () => {
    const accommodationSignals = Object.freeze([
      Object.freeze(
        signal({
          signalId: 'sig:frozen',
          subjectId: 'agent:frozen',
          protocolId: 'protocol:frozen',
          offeredCareModes: Object.freeze(['cure_attempt'] as const),
        })
      ),
    ])
    const medicalDeviationFindings = Object.freeze([
      Object.freeze(
        deviationFinding({
          kind: 'outcome_below_prediction',
          subjectId: 'agent:other',
          protocolId: 'protocol:other',
          detail: 'Unrelated.',
        })
      ),
    ])
    buildAccommodationAccessAuditReport({
      accommodationSignals,
      medicalDeviationFindings,
    })
    expect(accommodationSignals).toHaveLength(1)
    expect(medicalDeviationFindings).toHaveLength(1)
  })

  it('summary counts match findings', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:summary',
          subjectId: 'agent:summary',
          protocolId: 'protocol:care',
          accommodationAccessScore: 10,
          cureOnlyPressureScore: 90,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['cure_attempt'],
          denialRationale: 'protocol_ceiling',
          treatmentLimitationAcknowledged: false,
        }),
      ],
    })
    expect(report.summary.rowCount).toBe(report.rows.length)
    expect(report.summary.accommodationAccessGapCount).toBe(
      report.findings.filter((finding) => finding.kind === 'accommodation_access_gap').length
    )
    expect(report.summary.cureOnlyPressureHighCount).toBe(
      report.findings.filter((finding) => finding.kind === 'cure_only_pressure_high').length
    )
    expect(report.summary.careModeUnavailableCount).toBe(
      report.findings.filter((finding) => finding.kind === 'care_mode_unavailable').length
    )
    expect(report.summary.treatmentLimitationUnacknowledgedCount).toBe(
      report.findings.filter((finding) => finding.kind === 'treatment_limitation_unacknowledged')
        .length
    )
    expect(report.summary.insufficientEvidenceCount).toBe(
      report.findings.filter((finding) => finding.kind === 'insufficient_accommodation_evidence')
        .length
    )
  })

  it('dedupes and sorts offered care modes', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:modes',
          subjectId: 'agent:modes',
          protocolId: 'protocol:care',
          offeredCareModes: ['stabilization', 'cure_attempt', 'stabilization', 'accommodation'],
          accommodationAccessScore: 80,
        }),
      ],
    })
    expect(report.rows[0]?.offeredCareModes).toEqual([
      'accommodation',
      'cure_attempt',
      'stabilization',
    ])
  })

  it('lines contain no SCP or source-specific strings', () => {
    const report = buildAccommodationAccessAuditReport({
      accommodationSignals: [
        signal({
          signalId: 'sig:lines',
          subjectId: 'agent:lines',
          protocolId: 'protocol:care',
          accommodationAccessScore: 0,
          cureOnlyPressureScore: 100,
          requestedCareMode: 'accommodation',
          offeredCareModes: ['cure_attempt'],
        }),
      ],
    })
    const joined = report.lines.join('\n').toLowerCase()
    expect(joined).not.toContain('scp-')
    expect(joined).not.toContain('scp ')
    expect(joined).not.toContain('9977')
  })

  it('does not import medicalAccountabilityScorecard, GameState, or UI modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/accommodationAccessAudit.ts'),
      'utf8'
    )
    expect(source.includes('medicalAccountabilityScorecard')).toBe(false)
    expect(source.includes("from './models'")).toBe(false)
    expect(source.includes('gameStore')).toBe(false)
    expect(source.includes('/features/')).toBe(false)
  })

  it('uses type-only imports from SPE-2003 and SPE-2006 modules', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/accommodationAccessAudit.ts'),
      'utf8'
    )
    expect(source).toContain("import type { MedicalOutcomeDeviationFinding }")
    expect(source).toContain("import type { TreatmentFailureBlameRoutingFinding }")
    expect(source.includes('buildMedicalOutcomeDeviationAuditReport')).toBe(false)
    expect(source.includes('buildTreatmentFailureBlameRoutingReport')).toBe(false)
  })
})
