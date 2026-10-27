import { describe, expect, it } from 'vitest'
import {
  REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS,
  REGIONAL_CROSS_REGISTER_CHECK_ID,
  decideRegionalCrossRegisterEventAuthority,
  listStepsByDisposition,
} from '../domain/regionalCrossRegisterEventAuthority'

describe('SPE-3417 regional cross-register event authority', () => {
  it('records a stable evidence matrix covering plot, civic, and facility families', () => {
    const families = new Set(REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS.map((s) => s.stateFamily))
    expect(families.has('plot_claim')).toBe(true)
    expect(families.has('civic_condition')).toBe(true)
    expect(families.has('facility_lifecycle')).toBe(true)
    expect(REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS.length).toBeGreaterThanOrEqual(10)
  })

  it('rejects a universal SPE-1090 cross-register event engine', () => {
    const decision = decideRegionalCrossRegisterEventAuthority()
    expect(decision.checkId).toBe(REGIONAL_CROSS_REGISTER_CHECK_ID)
    expect(decision.overallDisposition).toBe('no_justified_feature')
    expect(decision.candidateFollowUps.length).toBeGreaterThan(0)

    const unjustified = listStepsByDisposition('no_justified_feature')
    expect(unjustified.some((s) => s.ownerIssueId === 'SPE-1090')).toBe(true)
    expect(unjustified.some((s) => s.stepId === 'R8')).toBe(true)
  })

  it('marks absent plot/civic/compound contracts as confirmed missing under their parents', () => {
    const missing = listStepsByDisposition('confirmed_missing_implementation_slice')
    const owners = new Set(missing.map((s) => s.verificationOwnerIssueId))
    expect(owners.has('SPE-3354')).toBe(true)
    expect(owners.has('SPE-3357')).toBe(true)
    expect(owners.has('SPE-1503')).toBe(true)
  })

  it('preserves narrow shipped evidence as already covered', () => {
    const covered = listStepsByDisposition('already_covered_no_update')
    const owners = new Set(covered.map((s) => s.ownerIssueId))
    expect(owners.has('SPE-2273')).toBe(true)
    expect(owners.has('SPE-1606')).toBe(true)
    expect(owners.has('SPE-3184')).toBe(true)
    expect(owners.has('SPE-3359')).toBe(true)
  })

  it('replays the decision identically', () => {
    expect(decideRegionalCrossRegisterEventAuthority()).toEqual(
      decideRegionalCrossRegisterEventAuthority(),
    )
  })
})
