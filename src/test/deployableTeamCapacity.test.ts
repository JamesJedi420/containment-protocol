import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_DEPLOYABLE_TEAMS,
  MAX_MAX_DEPLOYABLE_TEAMS,
  MIN_MAX_DEPLOYABLE_TEAMS,
  ORGANIZATION_CAPACITY_EXHAUSTED,
  TERMINAL_PROGRESSION_STEP,
  TIER1_DEPLOYABLE_TEAM_CAPACITY,
  assessOrganizationDeployableCapacity,
  resolveDeployableTeamCapacity,
} from '../domain/deployableTeamCapacity'

describe('SPE-3497 deployable-team capacity progression resolver', () => {
  it('resolves Tier 1 to capacity 4 for every ceiling in 6–30', () => {
    for (let ceiling = MIN_MAX_DEPLOYABLE_TEAMS; ceiling <= MAX_MAX_DEPLOYABLE_TEAMS; ceiling++) {
      const resolved = resolveDeployableTeamCapacity({
        maxDeployableTeams: ceiling,
        progressionStep: 0,
      })
      expect(resolved.capacity).toBe(TIER1_DEPLOYABLE_TEAM_CAPACITY)
      expect(resolved.provenance.clampedStep).toBe(0)
      expect(resolved.provenance.ceiling).toBe(ceiling)
    }
  })

  it('reaches the configured ceiling at the terminal progression step', () => {
    for (const ceiling of [
      MIN_MAX_DEPLOYABLE_TEAMS,
      DEFAULT_MAX_DEPLOYABLE_TEAMS,
      MAX_MAX_DEPLOYABLE_TEAMS,
    ]) {
      const resolved = resolveDeployableTeamCapacity({
        maxDeployableTeams: ceiling,
        progressionStep: TERMINAL_PROGRESSION_STEP,
      })
      expect(resolved.capacity).toBe(ceiling)
      expect(resolved.provenance.clampedStep).toBe(TERMINAL_PROGRESSION_STEP)
    }
  })

  it('is monotonic and never exceeds the ceiling', () => {
    const ceiling = DEFAULT_MAX_DEPLOYABLE_TEAMS
    let previous = 0
    for (let step = 0; step <= TERMINAL_PROGRESSION_STEP; step++) {
      const { capacity } = resolveDeployableTeamCapacity({
        maxDeployableTeams: ceiling,
        progressionStep: step,
      })
      expect(capacity).toBeGreaterThanOrEqual(previous)
      expect(capacity).toBeLessThanOrEqual(ceiling)
      previous = capacity
    }
  })

  it('applies floor rounding at mid progression for default ceiling 16', () => {
    // 4 + floor((16-4)*6/12) = 4 + floor(6) = 10
    expect(
      resolveDeployableTeamCapacity({
        maxDeployableTeams: DEFAULT_MAX_DEPLOYABLE_TEAMS,
        progressionStep: 6,
      }).capacity
    ).toBe(10)
    // 4 + floor((16-4)*1/12) = 4 + floor(1) = 5
    expect(
      resolveDeployableTeamCapacity({
        maxDeployableTeams: DEFAULT_MAX_DEPLOYABLE_TEAMS,
        progressionStep: 1,
      }).capacity
    ).toBe(5)
    // 4 + floor((6-4)*1/12) = 4 + floor(2/12) = 4
    expect(
      resolveDeployableTeamCapacity({
        maxDeployableTeams: MIN_MAX_DEPLOYABLE_TEAMS,
        progressionStep: 1,
      }).capacity
    ).toBe(4)
  })

  it('clamps negative and overshoot progression steps', () => {
    expect(
      resolveDeployableTeamCapacity({
        maxDeployableTeams: 20,
        progressionStep: -3,
      }).capacity
    ).toBe(TIER1_DEPLOYABLE_TEAM_CAPACITY)
    expect(
      resolveDeployableTeamCapacity({
        maxDeployableTeams: 20,
        progressionStep: 99,
      }).capacity
    ).toBe(20)
  })

  it('rejects allocations that exceed organization capacity with a distinct reason', () => {
    const assessment = assessOrganizationDeployableCapacity({
      maxDeployableTeams: DEFAULT_MAX_DEPLOYABLE_TEAMS,
      progressionStep: 0,
      currentUsage: 3,
      requestedAdditional: 2,
    })
    expect(assessment.allowed).toBe(false)
    expect(assessment.reason).toBe(ORGANIZATION_CAPACITY_EXHAUSTED)
    expect(assessment.blockKind).toBe('organization')
    expect(assessment.reason).not.toBe('capacity-locked')
    expect(assessment.capacity).toBe(4)
    expect(assessment.projectedUsage).toBe(5)
  })

  it('allows allocations that stay within capacity and never reports capacity-locked', () => {
    const assessment = assessOrganizationDeployableCapacity({
      maxDeployableTeams: DEFAULT_MAX_DEPLOYABLE_TEAMS,
      progressionStep: 0,
      currentUsage: 2,
      requestedAdditional: 2,
    })
    expect(assessment.allowed).toBe(true)
    expect(assessment.reason).toBeNull()
    expect(assessment.blockKind).toBeNull()
    expect(JSON.stringify(assessment)).not.toContain('capacity-locked')
  })

  it('rejects invalid ceilings and malformed inputs without mutating callers', () => {
    const input = { maxDeployableTeams: 16, progressionStep: 3 }
    expect(() =>
      resolveDeployableTeamCapacity({ maxDeployableTeams: 5, progressionStep: 0 })
    ).toThrow(/6–30/)
    expect(() =>
      resolveDeployableTeamCapacity({ maxDeployableTeams: 31, progressionStep: 0 })
    ).toThrow(/6–30/)
    expect(() =>
      assessOrganizationDeployableCapacity({
        maxDeployableTeams: 16,
        progressionStep: 0,
        currentUsage: -1,
        requestedAdditional: 1,
      })
    ).toThrow(/nonnegative/)
    expect(() =>
      assessOrganizationDeployableCapacity({
        maxDeployableTeams: 16,
        progressionStep: 0,
        currentUsage: Number.MAX_SAFE_INTEGER,
        requestedAdditional: 1,
      })
    ).toThrow(/overflows safe integer/)
    expect(input).toEqual({ maxDeployableTeams: 16, progressionStep: 3 })
  })
})
