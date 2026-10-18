import { describe, expect, it } from 'vitest'
import {
  BYPRODUCT_HAZARD_BUILDUP_THRESHOLD,
  BYPRODUCT_LIFECYCLE_STAGES,
  projectByproductRiskSummary,
  validateByproductLifecycle,
} from '../domain/anomalousByproductLifecycle'

function lot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lot-alpha',
    sourceSubjectRef: 'subject:anomaly-7',
    hazardClass: 'toxic_residue',
    vesselId: 'vessel:drum-01',
    processingSectionRef: 'section:processing-bay',
    abatementMethodCode: 'neutralize_slurry',
    storageOutput: 'storage:quarantine-bin-3',
    disposalRoute: 'route:licensed-incineration',
    hazardBuildup: 20,
    failureClock: {
      kind: 'recurring',
      intervalWeeks: 4,
      anchorWeek: 10,
      emergencyResponseHook: 'hook:subsystem-flush',
    },
    incidentHistoryRefs: [] as string[],
    status: 'active',
    auditTrail: [
      { stage: 'source', week: 1, note: 'residue collected' },
      { stage: 'vessel', week: 2, note: 'sealed drum' },
      { stage: 'abatement', week: 3, note: 'neutralized' },
      { stage: 'disposal', week: 4, note: 'routed to incineration' },
    ],
    ...overrides,
  }
}

describe('SPE-2103 anomalous byproduct lifecycle registry', () => {
  it('accepts a lot that progresses source → vessel → abatement → disposal', () => {
    const result = validateByproductLifecycle([lot()])
    expect(result.findings).toEqual([])
    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.auditTrail.map((event) => event.stage)).toEqual([
      ...BYPRODUCT_LIFECYCLE_STAGES,
    ])
    expect(result.records[0]?.disposalRoute).toBe('route:licensed-incineration')
  })

  it('rejects an orphan lot without a source subject ref', () => {
    const result = validateByproductLifecycle([lot({ sourceSubjectRef: '' })])
    expect(result.records).toEqual([])
    expect(result.findings).toEqual([
      { code: 'orphan_lot', severity: 'error', lotId: 'lot-alpha' },
    ])
  })

  it('errors when an active lot is missing a disposal route', () => {
    const withoutRoute = { ...lot() }
    delete (withoutRoute as { disposalRoute?: string }).disposalRoute
    const result = validateByproductLifecycle([withoutRoute])
    expect(result.records).toEqual([])
    expect(result.findings).toEqual([
      { code: 'missing_disposal_route', severity: 'error', lotId: 'lot-alpha' },
    ])
  })

  it('warns when a failure clock lacks an emergency response hook', () => {
    const result = validateByproductLifecycle([
      lot({
        failureClock: {
          kind: 'annual',
          intervalWeeks: 52,
          anchorWeek: 0,
        },
      }),
    ])
    expect(result.records).toHaveLength(1)
    expect(result.findings).toEqual([
      {
        code: 'failure_clock_without_emergency_hook',
        severity: 'warning',
        lotId: 'lot-alpha',
      },
    ])
  })

  it('warns when hazard buildup is over the threshold without incident history', () => {
    const result = validateByproductLifecycle([
      lot({
        hazardBuildup: BYPRODUCT_HAZARD_BUILDUP_THRESHOLD,
        incidentHistoryRefs: [],
      }),
    ])
    expect(result.records).toHaveLength(1)
    expect(result.findings).toEqual([
      {
        code: 'hazard_buildup_without_incident',
        severity: 'warning',
        lotId: 'lot-alpha',
      },
    ])
  })

  it('does not warn on high buildup when an incident ref is present', () => {
    const result = validateByproductLifecycle([
      lot({
        hazardBuildup: BYPRODUCT_HAZARD_BUILDUP_THRESHOLD + 5,
        incidentHistoryRefs: ['incident:spill-9'],
      }),
    ])
    expect(result.findings).toEqual([])
    expect(result.records[0]?.incidentHistoryRefs).toEqual(['incident:spill-9'])
  })

  it('marks the failure clock due at the configured week in the risk summary', () => {
    const summary = projectByproductRiskSummary(lot(), 14)
    expect(summary).toEqual({
      lotId: 'lot-alpha',
      riskBand: 'elevated',
      failureClockDue: true,
      warnings: [],
    })
    expect(projectByproductRiskSummary(lot(), 11)?.failureClockDue).toBe(false)
    // Anchor week is the first due date; the week before stays quiet.
    expect(projectByproductRiskSummary(lot(), 10)?.failureClockDue).toBe(true)
    expect(projectByproductRiskSummary(lot(), 9)?.failureClockDue).toBe(false)
  })

  it('allows quarantined lots without a disposal route (active-only disposal gate)', () => {
    const withoutRoute = { ...lot(), status: 'quarantined' }
    delete (withoutRoute as { disposalRoute?: string }).disposalRoute
    const result = validateByproductLifecycle([withoutRoute])
    expect(result.findings).toEqual([])
    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.status).toBe('quarantined')
    expect(result.records[0]?.disposalRoute).toBeUndefined()
  })

  it('raises critical risk when a due clock has no emergency hook', () => {
    const packet = lot({
      failureClock: {
        kind: 'custom',
        intervalWeeks: 2,
        anchorWeek: 8,
      },
    })
    const summary = projectByproductRiskSummary(packet, 10)
    expect(summary).toEqual({
      lotId: 'lot-alpha',
      riskBand: 'critical',
      failureClockDue: true,
      warnings: ['failure_clock_without_emergency_hook'],
    })
  })

  it('is byte-stable across repeated validation and input order', () => {
    const a = lot({ id: 'lot-a', incidentHistoryRefs: ['incident:b', 'incident:a'] })
    const b = lot({
      id: 'lot-b',
      hazardBuildup: BYPRODUCT_HAZARD_BUILDUP_THRESHOLD,
      incidentHistoryRefs: [],
    })
    const forward = validateByproductLifecycle([a, b])
    const reversed = validateByproductLifecycle([b, a])
    expect(reversed).toEqual(forward)
    expect(JSON.stringify(forward)).toBe(JSON.stringify(validateByproductLifecycle([a, b])))
    expect(forward.records.map((record) => record.id)).toEqual(['lot-a', 'lot-b'])
    expect(forward.records[0]?.incidentHistoryRefs).toEqual(['incident:a', 'incident:b'])
  })

  it('fails closed on a non-array packet', () => {
    expect(validateByproductLifecycle(null)).toEqual({
      records: [],
      findings: [{ code: 'malformed', severity: 'error' }],
    })
  })
})
