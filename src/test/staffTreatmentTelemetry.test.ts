import { describe, expect, it } from 'vitest'
import {
  buildStaffTreatmentTelemetryReport,
  type StaffDoctrineAlignmentSignal,
  type TreatmentEfficacySignal,
} from '../domain/staffTreatmentTelemetry'

function align(
  overrides: Partial<StaffDoctrineAlignmentSignal> &
    Pick<StaffDoctrineAlignmentSignal, 'staffId' | 'doctrineId' | 'alignmentScore'>
): StaffDoctrineAlignmentSignal {
  return {
    source: 'certification',
    ...overrides,
  }
}

function outcome(
  overrides: Partial<TreatmentEfficacySignal> &
    Pick<TreatmentEfficacySignal, 'subjectId' | 'protocolId' | 'expectedOutcomeScore' | 'actualOutcomeScore'>
): TreatmentEfficacySignal {
  return {
    ...overrides,
  }
}

describe('staffTreatmentTelemetry (SPE-2010)', () => {
  it('returns empty findings for empty inputs without throwing', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [],
      treatmentOutcomes: [],
    })
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({
      pairedObservationCount: 0,
      insufficientEvidenceCount: 0,
      highAlignmentLowEfficacyCount: 0,
      lowAlignmentHighEfficacyCount: 0,
      outcomeBelowExpectedCount: 0,
      alignmentOutcomeDecoupledCount: 0,
      unpairedAlignmentSignalCount: 0,
      unpairedOutcomeSignalCount: 0,
    })
    expect(report.lines).toEqual(['Staff treatment telemetry: no findings'])
  })

  it('detects high alignment with low efficacy', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-1', doctrineId: 'doctrine:infirmary', alignmentScore: 90 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-1',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-1',
          expectedOutcomeScore: 80,
          actualOutcomeScore: 25,
        }),
      ],
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('high_alignment_low_efficacy')
    expect(report.summary.highAlignmentLowEfficacyCount).toBe(1)
  })

  it('detects low alignment with high efficacy', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-2', doctrineId: 'doctrine:infirmary', alignmentScore: 20 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-2',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-2',
          expectedOutcomeScore: 70,
          actualOutcomeScore: 85,
        }),
      ],
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('low_alignment_high_efficacy')
    expect(report.summary.lowAlignmentHighEfficacyCount).toBe(1)
  })

  it('detects outcome below expected when gap exceeds threshold', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-3', doctrineId: 'doctrine:ward', alignmentScore: 55 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-3',
          protocolId: 'protocol:observe',
          staffId: 'staff:medic-3',
          expectedOutcomeScore: 80,
          actualOutcomeScore: 60,
        }),
      ],
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('outcome_below_expected')
    expect(report.summary.outcomeBelowExpectedCount).toBeGreaterThanOrEqual(1)
  })

  it('emits insufficient_evidence when alignment lacks linkable outcomes', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-4', doctrineId: 'doctrine:ward', alignmentScore: 80 }),
      ],
      treatmentOutcomes: [],
    })

    expect(report.findings).toEqual([
      expect.objectContaining({
        kind: 'insufficient_evidence',
        staffId: 'staff:medic-4',
      }),
    ])
    expect(report.summary.insufficientEvidenceCount).toBe(1)
  })

  it('emits insufficient_evidence when paired outcomes are below minimumEvidenceCount', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-5', doctrineId: 'doctrine:ward', alignmentScore: 80 }),
      ],
      treatmentOutcomes: [],
      options: { minimumEvidenceCount: 2 },
    })

    expect(report.findings[0]?.kind).toBe('insufficient_evidence')
  })

  it('emits no mismatch kinds when alignment and efficacy both agree high', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-6', doctrineId: 'doctrine:ward', alignmentScore: 85 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-6',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-6',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 88,
        }),
      ],
    })

    const mismatchKinds = report.findings.filter((finding) =>
      [
        'high_alignment_low_efficacy',
        'low_alignment_high_efficacy',
        'outcome_below_expected',
        'alignment_outcome_decoupled',
      ].includes(finding.kind)
    )
    expect(mismatchKinds).toHaveLength(0)
  })

  it('sorts findings deterministically by kind, staffId, subjectId, week, protocolId', () => {
    const input = {
      staffSignals: [
        align({ staffId: 'staff:b', doctrineId: 'doctrine:a', alignmentScore: 90 }),
        align({ staffId: 'staff:a', doctrineId: 'doctrine:a', alignmentScore: 20 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:z',
          protocolId: 'protocol:z',
          staffId: 'staff:b',
          expectedOutcomeScore: 33,
          actualOutcomeScore: 20,
        }),
        outcome({
          subjectId: 'agent:a',
          protocolId: 'protocol:a',
          staffId: 'staff:a',
          expectedOutcomeScore: 70,
          actualOutcomeScore: 90,
        }),
      ],
    }

    const first = buildStaffTreatmentTelemetryReport(input)
    const second = buildStaffTreatmentTelemetryReport(input)
    expect(first.findings).toEqual(second.findings)
    expect(first.findings.map((finding) => finding.kind)).toEqual([
      'high_alignment_low_efficacy',
      'low_alignment_high_efficacy',
    ])
  })

  it('does not mutate frozen inputs', () => {
    const staffSignals = Object.freeze([
      Object.freeze(
        align({ staffId: 'staff:medic-7', doctrineId: 'doctrine:ward', alignmentScore: 90 })
      ),
    ]) as readonly StaffDoctrineAlignmentSignal[]
    const treatmentOutcomes = Object.freeze([
      Object.freeze(
        outcome({
          subjectId: 'agent:patient-7',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-7',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 20,
        })
      ),
    ]) as readonly TreatmentEfficacySignal[]

    buildStaffTreatmentTelemetryReport({ staffSignals, treatmentOutcomes })

    expect(staffSignals[0]?.alignmentScore).toBe(90)
    expect(treatmentOutcomes[0]?.actualOutcomeScore).toBe(20)
  })

  it('applies threshold overrides', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-8', doctrineId: 'doctrine:ward', alignmentScore: 60 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-8',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-8',
          expectedOutcomeScore: 80,
          actualOutcomeScore: 55,
        }),
      ],
      options: {
        highAlignmentThreshold: 50,
        lowEfficacyThreshold: 60,
      },
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('high_alignment_low_efficacy')
  })

  it('counts outcomes without staffId as unpaired and does not throw', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-9', doctrineId: 'doctrine:ward', alignmentScore: 90 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:orphan',
          protocolId: 'protocol:observe',
          expectedOutcomeScore: 80,
          actualOutcomeScore: 20,
        }),
      ],
    })

    expect(report.summary.unpairedOutcomeSignalCount).toBe(1)
    expect(report.findings[0]?.kind).toBe('insufficient_evidence')
  })

  it('deduplicates repeated signalId deterministically (first wins after stable sort)', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({
          staffId: 'staff:medic-10',
          doctrineId: 'doctrine:ward',
          alignmentScore: 90,
          signalId: 'align:dup',
        }),
        align({
          staffId: 'staff:medic-10',
          doctrineId: 'doctrine:ward',
          alignmentScore: 10,
          signalId: 'align:dup',
        }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-10',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-10',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 20,
          signalId: 'outcome:dup',
        }),
        outcome({
          subjectId: 'agent:patient-10b',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-10',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 90,
          signalId: 'outcome:dup',
        }),
      ],
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('high_alignment_low_efficacy')
    expect(report.summary.highAlignmentLowEfficacyCount).toBe(1)
  })

  it('detects alignment_outcome_decoupled for mid alignment with material outcome gap', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:medic-11', doctrineId: 'doctrine:ward', alignmentScore: 55 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-11',
          protocolId: 'protocol:observe',
          staffId: 'staff:medic-11',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 50,
        }),
      ],
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('alignment_outcome_decoupled')
  })

  it('falls back to staff-only outcome bucket when week-specific outcomes are missing', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({
          staffId: 'staff:medic-12',
          doctrineId: 'doctrine:ward',
          alignmentScore: 90,
          week: 4,
        }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-12',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-12',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 20,
        }),
      ],
    })

    expect(report.findings.map((finding) => finding.kind)).toContain('high_alignment_low_efficacy')
  })

  it('classifies scores exactly at default high/low thresholds', () => {
    const atThreshold = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:edge-high', doctrineId: 'doctrine:ward', alignmentScore: 70 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:edge-high',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:edge-high',
          expectedOutcomeScore: 80,
          actualOutcomeScore: 40,
        }),
      ],
    })
    expect(atThreshold.findings.map((finding) => finding.kind)).toContain(
      'high_alignment_low_efficacy'
    )

    const atLowBoundary = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:edge-low', doctrineId: 'doctrine:ward', alignmentScore: 40 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:edge-low',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:edge-low',
          expectedOutcomeScore: 70,
          actualOutcomeScore: 50,
        }),
      ],
    })
    expect(atLowBoundary.findings.map((finding) => finding.kind)).not.toContain(
      'high_alignment_low_efficacy'
    )

    const lowHighBoundary = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:edge-lh', doctrineId: 'doctrine:ward', alignmentScore: 40 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:edge-lh',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:edge-lh',
          expectedOutcomeScore: 70,
          actualOutcomeScore: 70,
        }),
      ],
    })
    expect(lowHighBoundary.findings.map((finding) => finding.kind)).toContain(
      'low_alignment_high_efficacy'
    )
  })

  it('treats outcome gap at default threshold as material and below threshold as not', () => {
    const atGap = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:gap', doctrineId: 'doctrine:ward', alignmentScore: 50 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:gap',
          protocolId: 'protocol:observe',
          staffId: 'staff:gap',
          expectedOutcomeScore: 55,
          actualOutcomeScore: 40,
        }),
      ],
    })
    expect(atGap.findings.map((finding) => finding.kind)).toContain('outcome_below_expected')

    const belowGap = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:gap-2', doctrineId: 'doctrine:ward', alignmentScore: 50 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:gap-2',
          protocolId: 'protocol:observe',
          staffId: 'staff:gap-2',
          expectedOutcomeScore: 54,
          actualOutcomeScore: 40,
        }),
      ],
    })
    expect(belowGap.findings.map((finding) => finding.kind)).not.toContain('outcome_below_expected')
  })

  it('clamps non-finite outcome scores without throwing', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({
          staffId: 'staff:nan',
          doctrineId: 'doctrine:ward',
          alignmentScore: 90,
        }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:nan',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:nan',
          expectedOutcomeScore: Number.POSITIVE_INFINITY,
          actualOutcomeScore: Number.NaN,
        }),
      ],
    })
    const mismatch = report.findings.find(
      (finding) => finding.kind === 'high_alignment_low_efficacy'
    )
    expect(mismatch?.efficacyScore).toBe(0)
    expect(mismatch?.alignmentScore).toBe(90)
  })

  it('keeps summary counts aligned with findings', () => {
    const report = buildStaffTreatmentTelemetryReport({
      staffSignals: [
        align({ staffId: 'staff:summary', doctrineId: 'doctrine:ward', alignmentScore: 90 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:summary',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:summary',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 20,
        }),
      ],
    })
    expect(report.summary.highAlignmentLowEfficacyCount).toBe(
      report.findings.filter((finding) => finding.kind === 'high_alignment_low_efficacy').length
    )
    expect(report.summary.pairedObservationCount).toBe(1)
    expect(report.lines[0]).toBe('Staff treatment telemetry report')
  })

  it('produces identical reports for the same state', () => {
    const input = {
      staffSignals: [
        align({ staffId: 'staff:medic-13', doctrineId: 'doctrine:ward', alignmentScore: 90 }),
      ],
      treatmentOutcomes: [
        outcome({
          subjectId: 'agent:patient-13',
          protocolId: 'protocol:stabilize',
          staffId: 'staff:medic-13',
          expectedOutcomeScore: 90,
          actualOutcomeScore: 20,
        }),
      ],
    }
    expect(buildStaffTreatmentTelemetryReport(input)).toEqual(
      buildStaffTreatmentTelemetryReport(input)
    )
  })
})
