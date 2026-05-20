import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import {
  buildDisguiseRevealSubjectFromCase,
  detectionScanTierOrder,
} from '../domain/revealPayloadDisguiseIntegration'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

function createBehaviorObserver(id: string, tags: string[], social: number): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation: 50,
      utility: 40,
      social,
    },
    tags: ['medium', ...tags],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

function createHiddenCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-orchestration-reveal',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['infiltration', 'public'],
    requiredTags: ['medium'],
    preferredTags: [],
    assignedTeamIds: ['team-reveal'],
    weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    difficulty: { combat: 0, investigation: 0, utility: 0, social: 40 },
    infiltrationAwareness: 0.35,
    infiltrationCoverProfile: { claimedRole: 'official_inspector', documentTier: 1 },
    ...overrides,
  }
}

describe('revealPayloadOrchestration (SPE-781 slice 4)', () => {
  it('buildDisguiseRevealSubjectFromCase maps cover role and case id', () => {
    const caseData = createHiddenCase()

    expect(buildDisguiseRevealSubjectFromCase(caseData)).toMatchObject({
      exactIdentity: 'entity:case-orchestration-reveal',
      category: 'official inspector cover',
      hostility: 'latent',
      activeProtections: ['document tier 1'],
    })
  })

  it('resolveAssignedCaseForWeek preserves legacy validation while attaching detectionScan', () => {
    const observer = createBehaviorObserver('a_orchestration_reveal', ['liaison', 'negotiation'], 58)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createHiddenCase({ assignedTeamIds: [team.id] })
    const validationContext = {
      supportTags: team.tags,
      teamTags: team.tags,
      leaderId: null,
      infiltrationAwareness: caseData.infiltrationAwareness,
    }

    const legacy = evaluateBehaviorWeightedDisguiseValidation(caseData, [observer], validationContext)
    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.behaviorValidation).toMatchObject({
      active: legacy.active,
      level: legacy.level,
      scoreAdjustment: legacy.scoreAdjustment,
      evidenceSignals: legacy.evidenceSignals,
      counterDetection: legacy.counterDetection,
      shouldDegradeSuccessToPartial: legacy.shouldDegradeSuccessToPartial,
    })
    expect(resolution.behaviorValidation?.detectionScan).toBeDefined()
    expect(detectionScanTierOrder(resolution.behaviorValidation!.detectionScan).length).toBeGreaterThan(
      0
    )
  })

  it('returns inactive validation with presence-only scan when case is not hidden', () => {
    const observer = createBehaviorObserver('a_orchestration_visible', ['liaison'], 58)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createHiddenCase({
      assignedTeamIds: [team.id],
      hiddenState: undefined,
      detectionConfidence: undefined,
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.behaviorValidation?.active).toBe(false)
    expect(detectionScanTierOrder(resolution.behaviorValidation!.detectionScan)).toEqual(['presence'])
    expect(resolution.behaviorValidation?.detectionScan.fields[0]?.playerFacingValue).toBe('no contact')
  })

  it('exposes deeper detection tiers for strong validation than inactive paths', () => {
    const observer = createBehaviorObserver('a_orchestration_tiers', ['liaison', 'negotiation'], 60)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const mismatched = resolveAssignedCaseForWeek(
      createHiddenCase({
        assignedTeamIds: [team.id],
        infiltrationCoverProfile: { claimedRole: 'uniform_guard', documentTier: 2 },
      }),
      state,
      () => 0.5
    )
    const inactive = resolveAssignedCaseForWeek(
      createHiddenCase({
        assignedTeamIds: [team.id],
        hiddenState: undefined,
      }),
      state,
      () => 0.5
    )

    expect(detectionScanTierOrder(mismatched.behaviorValidation!.detectionScan)).toContain('category')
    expect(detectionScanTierOrder(inactive.behaviorValidation!.detectionScan)).toEqual(['presence'])
  })

  it('falls back to infiltration contact when cover role is invalid', () => {
    const caseData = createHiddenCase({
      infiltrationCoverProfile: {
        claimedRole: 'not-a-role' as 'uniform_guard',
        documentTier: 1,
      },
    })

    expect(buildDisguiseRevealSubjectFromCase(caseData).category).toBe('infiltration contact')
  })

  it('does not change resolved effective case detection fields vs legacy validation apply', () => {
    const observer = createBehaviorObserver('a_orchestration_legacy', ['liaison', 'negotiation'], 58)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createHiddenCase({
      assignedTeamIds: [team.id],
      infiltrationAwareness: 0.9,
      counterDetection: true,
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.effectiveCase.detectionConfidence).toBeGreaterThanOrEqual(
      caseData.detectionConfidence ?? 0
    )
    expect(resolution.effectiveCase.counterDetection).toBe(true)
  })
})
