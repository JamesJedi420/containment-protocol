import { describe, expect, it } from 'vitest'
import {
  evaluateMissionProtectedStatusEnforcement,
  isMissionProtectedStatusClearanceTag,
  missionRequiresProtectedStatusClearance,
} from '../domain/missionProtectedStatusEnforcement'
import type { Agent, CaseInstance, Team } from '../domain/models'

function mission(requiredTags: string[] = []): Pick<CaseInstance, 'requiredTags'> {
  return { requiredTags }
}

function team(tags: string[] = []): Pick<Team, 'id' | 'name' | 'tags'> {
  return {
    id: 'team-protected-status',
    name: 'Protected Status Team',
    tags,
  }
}

function member(tags: string[] = []): Pick<Agent, 'tags'> {
  return { tags }
}

describe('missionProtectedStatusEnforcement', () => {
  it('does not activate without the explicit mission requirement tag', () => {
    expect(missionRequiresProtectedStatusClearance(mission(['protected-status:minor']))).toBe(false)
    expect(isMissionProtectedStatusClearanceTag(' protected-status-clearance ')).toBe(true)

    const result = evaluateMissionProtectedStatusEnforcement({
      mission: mission([]),
      team: team(['protected-status:minor']),
      members: [member(['protected-medical-hold'])],
    })

    expect(result).toEqual({
      required: false,
      allowed: true,
      decisions: [],
      reasonCodes: [],
    })
  })

  it('allows full staff under explicit mission review', () => {
    const result = evaluateMissionProtectedStatusEnforcement({
      mission: mission(['protected-status-clearance']),
      team: team(['protected-status:full-staff']),
      members: [member()],
    })

    expect(result.required).toBe(true)
    expect(result.allowed).toBe(true)
    expect(result.decisions[0]).toMatchObject({
      protectedStatus: 'full_staff',
      action: 'assign_mission',
      outcome: 'allowed',
    })
    expect(result.reasonCodes).toEqual(['full_staff_action_baseline_allowed'])
  })

  it('blocks explicit missions when protected status is missing', () => {
    const result = evaluateMissionProtectedStatusEnforcement({
      mission: mission(['protected-status-clearance']),
      team: team(),
      members: [],
    })

    expect(result.allowed).toBe(false)
    expect(result.decisions[0]).toMatchObject({
      protectedStatus: 'unknown',
      outcome: 'restricted',
    })
    expect(result.reasonCodes).toEqual(['unknown_protected_status_restricted'])
  })

  it('blocks care-protected statuses from mission assignment', () => {
    const result = evaluateMissionProtectedStatusEnforcement({
      mission: mission(['protected-status-clearance']),
      team: team(['protected-status:minor', 'protected-status:patient']),
      members: [member(['protected-status:sapient-remains'])],
    })

    expect(result.allowed).toBe(false)
    expect(result.decisions.map((decision) => decision.protectedStatus)).toEqual([
      'minor',
      'patient',
      'sapient_remains',
    ])
    expect(result.decisions.every((decision) => decision.outcome === 'blocked')).toBe(true)
    expect(result.reasonCodes).toEqual([
      'minor_assign_mission_blocked',
      'patient_assign_mission_blocked',
      'sapient_remains_assign_mission_blocked',
    ])
  })

  it('surfaces restricted staff, external, and due-process reason codes deterministically', () => {
    const first = evaluateMissionProtectedStatusEnforcement({
      mission: mission(['protected-status-clearance']),
      team: team([
        'protected-status:civilian',
        'protected-status:probationary-staff',
        'protected-due-process-required',
      ]),
      members: [member(['protected-review:case-note-7'])],
    })
    const second = evaluateMissionProtectedStatusEnforcement({
      mission: mission(['protected-status-clearance']),
      team: team(['protected-status:probationary_staff', 'protected-due-process-required']),
      members: [member(['protected-status:civilian', 'protected-review:case-note-7'])],
    })

    expect(first).toEqual(second)
    expect(first.allowed).toBe(false)
    expect(first.decisions.map((decision) => decision.protectedStatus)).toEqual([
      'civilian',
      'probationary_staff',
    ])
    expect(first.reasonCodes).toEqual([
      'civilian_mission_access_restricted',
      'probationary_staff_access_restricted',
    ])
  })
})
