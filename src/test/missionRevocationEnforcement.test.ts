import { describe, expect, it } from 'vitest'
import {
  evaluateMissionRevocationEnforcement,
  isMissionRevocationClearanceTag,
  missionRequiresRevocationClearance,
} from '../domain/missionRevocationEnforcement'
import type { Agent, CaseInstance, Team } from '../domain/models'

function mission(requiredTags: string[] = []): Pick<CaseInstance, 'requiredTags'> {
  return { requiredTags }
}

function team(tags: string[] = []): Pick<Team, 'id' | 'name' | 'tags'> {
  return {
    id: 'team-revocation',
    name: 'Revocation Team',
    tags,
  }
}

function member(tags: string[] = []): Pick<Agent, 'tags'> {
  return { tags }
}

describe('missionRevocationEnforcement', () => {
  it('does not activate without the explicit mission requirement tag', () => {
    expect(missionRequiresRevocationClearance(mission(['revocation-kind:revocation']))).toBe(false)
    expect(isMissionRevocationClearanceTag(' revocation-clearance ')).toBe(true)

    const result = evaluateMissionRevocationEnforcement({
      mission: mission([]),
      team: team(['revocation-kind:revocation']),
      members: [member(['revocation-surface:mission'])],
    })

    expect(result).toEqual({
      required: false,
      allowed: true,
      decisions: [],
      reasonCodes: [],
    })
  })

  it('allows explicit missions when no active revocation evidence exists', () => {
    const result = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-cause:betrayal', 'revocation-surface:mission']),
      members: [member(['revocation-review:case-note-9'])],
    })

    expect(result).toEqual({
      required: true,
      allowed: true,
      decisions: [],
      reasonCodes: ['no_revocation_evidence'],
    })
  })

  it('blocks suspension, revocation, and quarantine mission access', () => {
    const suspension = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-kind:suspension', 'revocation-surface:mission']),
      members: [member(['revocation-cause:policy-violation'])],
    })
    const revocation = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-kind:revocation']),
      members: [member(['revocation-cause:site-breach'])],
    })
    const quarantine = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-kind:quarantine']),
      members: [member(['revocation-cause:medical-hold'])],
    })

    expect(suspension.allowed).toBe(false)
    expect(suspension.decisions[0]).toMatchObject({
      kind: 'suspension',
      outcome: 'suspended',
    })
    expect(revocation.allowed).toBe(false)
    expect(revocation.decisions[0]?.blockedSurfaces).toContain('mission')
    expect(quarantine.allowed).toBe(false)
    expect(quarantine.reasonCodes).toContain('quarantine_mission_site_movement_blocked')
  })

  it('blocks downgrade, probation, and clearance-review decisions affecting mission access', () => {
    const downgrade = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-kind:downgrade', 'revocation-surface:mission']),
      members: [member(['revocation-cause:exposure-risk'])],
    })
    const probation = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-kind:probation', 'revocation-surface:mission']),
      members: [member(['revocation-cause:policy-violation'])],
    })
    const review = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-kind:clearance-review', 'revocation-surface:mission']),
      members: [member(['revocation-cause:protected-status'])],
    })

    expect(downgrade.allowed).toBe(false)
    expect(downgrade.decisions[0]?.outcome).toBe('downgraded')
    expect(probation.allowed).toBe(false)
    expect(probation.decisions[0]?.trustOutcome).toBe('probation')
    expect(review.allowed).toBe(false)
    expect(review.reasonCodes).toContain('clearance_review_access_restricted')
  })

  it('falls back deterministically for malformed sparse evidence without throwing', () => {
    const first = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team([
        'revocation-kind:not-real',
        'revocation-cause:not-real',
        'revocation-surface:not-real',
        'revocation-review: review-z ',
      ]),
      members: [member(['revocation-review:review-a'])],
    })
    const second = evaluateMissionRevocationEnforcement({
      mission: mission(['revocation-clearance']),
      team: team(['revocation-review:review-a', 'revocation-kind:not-real']),
      members: [member(['revocation-cause:not-real', 'revocation-review:review-z'])],
    })

    expect(() => first).not.toThrow()
    expect(first).toEqual(second)
    expect(first.allowed).toBe(false)
    expect(first.decisions[0]).toMatchObject({
      kind: 'unknown',
      cause: 'unknown',
      outcome: 'restricted',
    })
    expect(first.decisions[0]?.reviewEvidenceRefs).toEqual(['review-a', 'review-z'])
    expect(first.reasonCodes).toContain('invalid_revocation_kind')
    expect(first.reasonCodes).toContain('invalid_revocation_cause')
  })
})
