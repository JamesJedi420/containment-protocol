import { describe, expect, it } from 'vitest'
import {
  evaluateMissionDualLoyaltyEnforcement,
  isMissionDualLoyaltyClearanceTag,
  missionRequiresDualLoyaltyClearance,
} from '../domain/missionDualLoyaltyEnforcement'
import type { Agent, CaseInstance, Team } from '../domain/models'

function mission(requiredTags: string[] = []): Pick<CaseInstance, 'requiredTags'> {
  return { requiredTags }
}

function team(tags: string[] = []): Pick<Team, 'id' | 'name' | 'tags'> {
  return {
    id: 'team-dual-loyalty',
    name: 'Dual Loyalty Team',
    tags,
  }
}

function member(tags: string[] = []): Pick<Agent, 'tags'> {
  return { tags }
}

describe('missionDualLoyaltyEnforcement', () => {
  it('does not activate without the explicit mission requirement tag', () => {
    expect(missionRequiresDualLoyaltyClearance(mission(['dual-loyalty:criminal']))).toBe(false)
    expect(isMissionDualLoyaltyClearanceTag(' dual-loyalty-clearance ')).toBe(true)

    const result = evaluateMissionDualLoyaltyEnforcement({
      mission: mission([]),
      team: team(['dual-loyalty:criminal']),
      members: [member(['dual-loyalty:blocked'])],
    })

    expect(result).toEqual({
      required: false,
      allowed: true,
      decisions: [],
      reasonCodes: [],
    })
  })

  it('allows clean agency-loyal teams under explicit review', () => {
    const result = evaluateMissionDualLoyaltyEnforcement({
      mission: mission(['dual-loyalty-clearance']),
      team: team(),
      members: [member()],
    })

    expect(result.required).toBe(true)
    expect(result.allowed).toBe(true)
    expect(result.decisions[0]).toMatchObject({
      primaryAnchor: 'agency',
      secondaryAnchors: [],
      riskLevel: 'none',
    })
    expect(result.reasonCodes).toEqual(['no_dual_loyalty_risk', 'single_loyalty_anchor'])
  })

  it('allows watch-only benign overlaps', () => {
    const result = evaluateMissionDualLoyaltyEnforcement({
      mission: mission(['dual-loyalty-clearance']),
      team: team(['dual-loyalty:civic']),
      members: [member(['dual-loyalty:medical'])],
    })

    expect(result.allowed).toBe(true)
    expect(result.decisions[0]?.riskLevel).toBe('watch')
    expect(result.decisions[0]?.restrictedSurfaces).toEqual([])
    expect(result.reasonCodes).toEqual([
      'benign_civic_overlap_watch',
      'benign_medical_overlap_watch',
    ])
  })

  it('blocks restricted overlaps from mission routing', () => {
    const result = evaluateMissionDualLoyaltyEnforcement({
      mission: mission(['dual-loyalty-clearance']),
      team: team(['dual-loyalty:criminal']),
      members: [member(['dual-loyalty:patron'])],
    })

    expect(result.allowed).toBe(false)
    expect(result.decisions[0]?.riskLevel).toBe('restricted')
    expect(result.decisions[0]?.restrictedSurfaces).toContain('mission')
    expect(result.reasonCodes).toEqual(['restricted_criminal_overlap', 'restricted_patron_overlap'])
  })

  it('blocks explicit hostile evidence tags', () => {
    const result = evaluateMissionDualLoyaltyEnforcement({
      mission: mission(['dual-loyalty-clearance']),
      team: team(['dual-loyalty:blocked']),
      members: [],
    })

    expect(result.allowed).toBe(false)
    expect(result.decisions[0]?.riskLevel).toBe('blocked')
    expect(result.decisions[0]?.restrictedSurfaces).toContain('mission')
    expect(result.reasonCodes).toEqual(['hostile_evidence_blocked', 'single_loyalty_anchor'])
  })

  it('sorts anchors and reason codes deterministically', () => {
    const first = evaluateMissionDualLoyaltyEnforcement({
      mission: mission(['dual-loyalty-clearance']),
      team: team(['loyalty-primary:civic', 'dual-loyalty:occult', 'dual-loyalty:criminal']),
      members: [member(['dual-loyalty:restricted'])],
    })
    const second = evaluateMissionDualLoyaltyEnforcement({
      mission: mission(['dual-loyalty-clearance']),
      team: team(['dual-loyalty:criminal', 'dual-loyalty:restricted', 'dual-loyalty:occult']),
      members: [member(['loyalty-primary:civic'])],
    })

    expect(first).toEqual(second)
    expect(first.decisions[0]?.primaryAnchor).toBe('civic')
    expect(first.decisions[0]?.secondaryAnchors).toEqual(['criminal', 'occult'])
    expect(first.reasonCodes).toEqual([
      'conflict_evidence_restricted',
      'restricted_criminal_overlap',
      'restricted_occult_overlap',
    ])
  })
})
