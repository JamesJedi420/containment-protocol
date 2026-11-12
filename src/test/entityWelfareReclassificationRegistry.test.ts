import { describe, expect, it } from 'vitest'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  PROPOSED_DISPOSITIONS,
  RECLASSIFICATION_STATES,
  REVIEW_GATES,
  projectReclassificationPressure,
  validateEntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecord,
} from '../domain/entityWelfareReclassificationRegistry'

function baseRecord(
  overrides: Partial<EntityWelfareReclassificationRecord> = {}
): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:test-base',
    label: 'Test base record',
    priorThreatLabel: 'provisional-threat',
    proposedDisposition: 'unknown',
    reclassificationState: 'pending',
    ...overrides,
  }
}

describe('entityWelfareReclassificationRegistry (SPE-2114 slice 1)', () => {
  it('validates fixture with pending → approved ethics review and containment revision', () => {
    const result = validateEntityWelfareReclassificationRecord(PENDING_TO_APPROVED_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(PENDING_TO_APPROVED_FIXTURE.reclassificationState).toBe('approved')
    expect(PENDING_TO_APPROVED_FIXTURE.reviewGate).toBe('ethics')
    expect(PENDING_TO_APPROVED_FIXTURE.reviewArtifactRef).toBe('review:ethics-board-packet-44')
    expect(PENDING_TO_APPROVED_FIXTURE.containmentRevisionRefs).toEqual([
      'revision:reduce-force-containment-tier-2',
    ])
    expect(PENDING_TO_APPROVED_FIXTURE.transitionHistory?.[0]).toEqual(
      expect.objectContaining({
        fromState: 'pending',
        toState: 'approved',
        reviewGate: 'ethics',
        reviewArtifactRef: 'review:ethics-board-packet-44',
      })
    )
  })

  it('validates hostile → cooperative fixture with welfare debt accumulation hook', () => {
    const result = validateEntityWelfareReclassificationRecord(HOSTILE_TO_COOPERATIVE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(HOSTILE_TO_COOPERATIVE_FIXTURE.priorThreatLabel).toMatch(/hostile/i)
    expect(HOSTILE_TO_COOPERATIVE_FIXTURE.proposedDisposition).toBe('cooperative')
    expect(HOSTILE_TO_COOPERATIVE_FIXTURE.welfareDebtRef).toMatch(/^welfare-debt:/)
    expect(result.issues).toHaveLength(0)
  })

  it('errors when approved without reviewGate artifact', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        reclassificationState: 'approved',
        reviewGate: 'ethics',
        evidenceBundleRefs: ['evidence:behavior-week-3'],
        containmentRevisionRefs: ['revision:soft-custody'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'terminal_state_without_review_artifact',
        severity: 'error',
      }),
    ])
  })

  it('errors when denied without review artifact', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        reclassificationState: 'denied',
        reviewGate: 'executive',
        evidenceBundleRefs: ['evidence:insufficient-behavior-week-2'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'terminal_state_without_review_artifact',
        severity: 'error',
      }),
    ])
  })

  it('errors when approved without evidence bundles', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        reclassificationState: 'approved',
        reviewGate: 'ethics',
        reviewArtifactRef: 'review:ethics-packet-1',
        containmentRevisionRefs: ['revision:soft-custody'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'approved_without_evidence_bundles',
        severity: 'error',
      }),
    ])
  })

  it('warns when approved softening from hostile posture lacks containment revision', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        priorThreatLabel: 'hostile-predator',
        proposedDisposition: 'cooperative',
        reclassificationState: 'approved',
        reviewGate: 'ethics',
        reviewArtifactRef: 'review:ethics-packet-2',
        evidenceBundleRefs: ['evidence:behavior-week-4'],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'approved_without_containment_revision',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise label token in record fields', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        label: 'Foundation custody review',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on branded object number in record id', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        id: 'reclass:SCP-1731',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_id')).toBe(true)
  })

  it('projects reclassification pressure with welfare debt linkage', () => {
    const projection = projectReclassificationPressure(HOSTILE_TO_COOPERATIVE_FIXTURE)

    expect(projection.recordId).toBe('reclass:apex-threat-behavior-reassessment')
    expect(projection.welfareDebtLinked).toBe(true)
    expect(projection.staffMoraleForecast).toBeGreaterThan(0)
    expect(projection.liabilityForecast).toBeGreaterThan(0)
    expect(projection.publicRiskForecast).toBeLessThan(0.5)
    expect(projection.label).not.toMatch(/foundation|scp|masquerade/i)
  })

  it('redacts pressure forecasts when policy requests unknown redaction', () => {
    const projection = projectReclassificationPressure(
      {
        ...PENDING_TO_APPROVED_FIXTURE,
        unknownFields: ['staffMoraleForecast', 'liabilityForecast', 'publicRiskForecast'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.staffMoraleForecast).toBeNull()
    expect(projection.liabilityForecast).toBeNull()
    expect(projection.publicRiskForecast).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('marks projection redacted when only one forecast field is hidden', () => {
    const projection = projectReclassificationPressure({
      ...PENDING_TO_APPROVED_FIXTURE,
      redactedFields: ['staffMoraleForecast'],
    })

    expect(projection.staffMoraleForecast).toBeNull()
    expect(projection.liabilityForecast).not.toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('errors on goi- franchise token prefix in record label', () => {
    const result = validateEntityWelfareReclassificationRecord(
      baseRecord({
        label: 'goi-arcadia custody review',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('keeps projection finite when record union fields are invalid', () => {
    const projection = projectReclassificationPressure(
      baseRecord({
        reviewGate: 'invalid-gate' as EntityWelfareReclassificationRecord['reviewGate'],
        proposedDisposition: 'invalid-disposition' as EntityWelfareReclassificationRecord['proposedDisposition'],
        reclassificationState: 'invalid-state' as EntityWelfareReclassificationRecord['reclassificationState'],
      })
    )

    expect(Number.isFinite(projection.liabilityForecast)).toBe(true)
    expect(Number.isFinite(projection.publicRiskForecast)).toBe(true)
    expect(projection.reclassificationState).toBe('pending')
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateEntityWelfareReclassificationRecord(PENDING_TO_APPROVED_FIXTURE)
    const second = validateEntityWelfareReclassificationRecord(PENDING_TO_APPROVED_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(PROPOSED_DISPOSITIONS).toEqual([
      'hostile',
      'cooperative',
      'medical',
      'sapient_remains',
      'unknown',
    ])
    expect(REVIEW_GATES).toEqual(['ethics', 'veterinary', 'psych', 'executive'])
    expect(RECLASSIFICATION_STATES).toEqual(['pending', 'approved', 'denied', 'reverted'])
  })
})
