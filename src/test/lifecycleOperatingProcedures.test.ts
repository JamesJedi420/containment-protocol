import { describe, expect, it } from 'vitest'
import {
  createPhaseProcedure,
  createSafeWorkPermit,
  evaluateLifecycleProcedure,
  evaluateProcedureAttestation,
  evaluateSafeWorkPermitGate,
  LIFECYCLE_OPERATING_PROCEDURES_OWNER,
} from '../domain/lifecycleOperatingProcedures'

const startup = createPhaseProcedure({
  phase: 'startup',
  procedureId: 'proc-startup',
  primaryStep: 'verify-interlocks-then-charge',
  inventoryGuard: 'hazardous-inventory-below-startup-cap',
  materialQualityGuard: 'feedstock-assay-pass',
  deviations: [
    {
      deviationId: 'dev-pressure',
      trigger: 'charge-pressure-high',
      correctionStep: 'vent-to-scrubber-then-recheck',
      avoidanceStep: 'hold-charge-until-relief-verified',
    },
  ],
})

const normal = createPhaseProcedure({
  phase: 'normal_operation',
  procedureId: 'proc-normal',
  primaryStep: 'maintain-steady-state-setpoints',
  inventoryGuard: 'hazardous-inventory-within-band',
  materialQualityGuard: 'ongoing-feedstock-spot-check',
  deviations: [
    {
      deviationId: 'dev-temp',
      trigger: 'coolant-temp-high',
      correctionStep: 'increase-coolant-flow',
      avoidanceStep: 'reduce-throughput-until-stable',
    },
  ],
})

const lotoPermit = createSafeWorkPermit({
  permitId: 'permit-loto-1',
  kind: 'lockout_tagout',
  assetId: 'eq-pump-1',
  windowStartWeek: 10,
  windowEndWeek: 12,
  preconditions: ['energy-isolated', 'tags-hung'],
  authorized: true,
})

describe('SPE-874 lifecycle operating procedures', () => {
  it('exports owner and uses different procedure logic across lifecycle phases', () => {
    expect(LIFECYCLE_OPERATING_PROCEDURES_OWNER).toBe('SPE-874')

    const startupEval = evaluateLifecycleProcedure({
      systemId: 'sys-a',
      phase: 'startup',
      catalog: [startup, normal],
    })
    const normalEval = evaluateLifecycleProcedure({
      systemId: 'sys-a',
      phase: 'normal_operation',
      catalog: [startup, normal],
    })
    expect(startupEval.primaryStep).toBe('verify-interlocks-then-charge')
    expect(normalEval.primaryStep).toBe('maintain-steady-state-setpoints')
    expect(startupEval.inventoryGuard).not.toBe(normalEval.inventoryGuard)
  })

  it('includes explicit correction and avoidance steps on deviation paths', () => {
    expect(startup.deviations[0]?.correctionStep).toMatch(/vent-to-scrubber/)
    expect(startup.deviations[0]?.avoidanceStep).toMatch(/hold-charge/)
    expect(() =>
      createPhaseProcedure({
        ...startup,
        deviations: [],
      }),
    ).toThrow(/at least one deviation path/)
  })

  it('gates high-risk tasks with asset, time-window, and precondition permits', () => {
    const allowed = evaluateSafeWorkPermitGate({
      permit: lotoPermit,
      assetId: 'eq-pump-1',
      currentWeek: 11,
      satisfiedPreconditions: ['energy-isolated', 'tags-hung'],
    })
    expect(allowed.allowed).toBe(true)
    expect(allowed.blockingReasons).toEqual([])

    const blocked = evaluateSafeWorkPermitGate({
      permit: lotoPermit,
      assetId: 'eq-pump-2',
      currentWeek: 15,
      satisfiedPreconditions: ['energy-isolated'],
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.blockingReasons).toEqual([
      'asset-mismatch',
      'outside-window',
      'precondition:tags-hung',
    ])

    const unauthorized = evaluateSafeWorkPermitGate({
      permit: { ...lotoPermit, authorized: false },
      assetId: 'eq-pump-1',
      currentWeek: 11,
      satisfiedPreconditions: ['energy-isolated', 'tags-hung'],
    })
    expect(unauthorized.blockingReasons).toEqual(['not-authorized'])

    expect(() =>
      createSafeWorkPermit({
        ...lotoPermit,
        windowEndWeek: 5,
        windowStartWeek: 10,
      }),
    ).toThrow(/windowEndWeek must be >= windowStartWeek/)
  })

  it('marks procedure sets stale without timely attestation', () => {
    const current = evaluateProcedureAttestation({
      attestation: {
        procedureSetId: 'set-cryo',
        lastAttestedWeek: 40,
        attestationIntervalWeeks: 52,
      },
      currentWeek: 50,
    })
    expect(current.stale).toBe(false)
    expect(current.freshness).toBe('current')

    const atBoundary = evaluateProcedureAttestation({
      attestation: {
        procedureSetId: 'set-cryo',
        lastAttestedWeek: 10,
        attestationIntervalWeeks: 52,
      },
      currentWeek: 62,
    })
    expect(atBoundary.weeksSinceAttestation).toBe(52)
    expect(atBoundary.stale).toBe(false)
    expect(atBoundary.freshness).toBe('current')

    const stale = evaluateProcedureAttestation({
      attestation: {
        procedureSetId: 'set-cryo',
        lastAttestedWeek: 1,
        attestationIntervalWeeks: 52,
      },
      currentWeek: 60,
    })
    expect(stale.stale).toBe(true)
    expect(stale.freshness).toBe('stale')
    expect(stale.weeksSinceAttestation).toBe(59)

    expect(() =>
      evaluateLifecycleProcedure({
        systemId: 'sys-a',
        phase: 'emergency_shutdown',
        catalog: [startup, normal],
      }),
    ).toThrow(/missing for phase emergency_shutdown/)

    expect(() =>
      evaluateLifecycleProcedure({
        systemId: 'sys-a',
        phase: 'startup',
        catalog: [startup, { ...startup, procedureId: 'proc-startup-dup' }],
      }),
    ).toThrow(/ambiguous for phase startup/)
  })
})
