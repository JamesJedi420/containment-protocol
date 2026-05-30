import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import {
  appendDetectionScanResolutionReason,
  CONCEALMENT_SCAN_READOUT_PREFIX,
  DETECTION_SCAN_READOUT_PREFIX,
  DISPLACEMENT_SCAN_READOUT_PREFIX,
} from '../domain/detectionScanReportNotes'
import {
  buildDisguiseRevealSubjectFromCase,
  detectionScanTierOrder,
} from '../domain/revealPayloadDisguiseIntegration'
import {
  buildScoutingRevealInputFromCase,
} from '../domain/revealPayloadScoutingIntegration'
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

function createReconObserver(id: string, investigation: number): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation,
      utility: 40,
      social: 40,
    },
    tags: ['medium', 'recon-specialist'],
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

function createConcealedPresenceCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-orchestration-concealed',
      templateId: 'combat_vampire_nest',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: ['team-reveal'],
    infiltrationCoverProfile: undefined,
    infiltrationProbePlan: undefined,
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
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

    const inactiveReasons: string[] = []
    appendDetectionScanResolutionReason(inactiveReasons, inactive.behaviorValidation)
    expect(inactiveReasons).toHaveLength(0)

    const activeReasons: string[] = []
    appendDetectionScanResolutionReason(activeReasons, mismatched.behaviorValidation)
    expect(activeReasons.some((reason) => reason.includes(DETECTION_SCAN_READOUT_PREFIX))).toBe(true)
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

describe('hiddenStateScoutingOrchestration (SPE-2282)', () => {
  it('buildScoutingRevealInputFromCase maps investigation pressure and team capability', () => {
    const observer = createReconObserver('a_scouting_input', 60)
    const caseData = createConcealedPresenceCase()

    expect(buildScoutingRevealInputFromCase(caseData, [observer])).toMatchObject({
      teamCapability: 3,
      anomalyConcealment: 2,
      subject: {
        exactIdentity: 'entity:case-orchestration-concealed',
        category: 'concealed presence',
        present: true,
      },
    })
  })

  it('attach hiddenStateScouting for concealed-presence cases without active disguise validation', () => {
    const observer = createReconObserver('a_concealed_orchestration', 60)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createConcealedPresenceCase({ assignedTeamIds: [team.id] })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.behaviorValidation?.active).toBe(false)
    expect(resolution.hiddenStateScouting?.active).toBe(true)
    expect(detectionScanTierOrder(resolution.hiddenStateScouting!.detectionScan).length).toBeGreaterThan(
      0
    )
  })

  it('anchors false-position hiddenStateScouting readouts to decoy locus', () => {
    const observer = createReconObserver('a_displaced_orchestration', 60)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createConcealedPresenceCase({
      assignedTeamIds: [team.id],
      hiddenState: 'displaced',
      displacementTarget: 'annex-b',
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.hiddenStateScouting?.active).toBe(true)
    const playerFacingValues = resolution.hiddenStateScouting!.detectionScan.fields.map(
      (field) => field.playerFacingValue
    )
    expect(playerFacingValues.some((value) => value.includes('decoy locus annex-b'))).toBe(true)
  })

  it('does not attach hiddenStateScouting when disguised infiltration validation is active', () => {
    const observer = createBehaviorObserver('a_disguise_orchestration', ['liaison', 'negotiation'], 58)
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

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.behaviorValidation?.active).toBe(true)
    expect(resolution.hiddenStateScouting).toBeUndefined()
    expect(resolution.behaviorValidation?.detectionScan).toBeDefined()
  })

  it('strips one modality layer when counter-detection is enabled on concealed cases', () => {
    const observer = createReconObserver('a_counter_orchestration', 60)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createConcealedPresenceCase({
      assignedTeamIds: [team.id],
      counterDetection: true,
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(resolution.hiddenStateScouting?.detectionScan.strippedLayerIds).toContain(
      'layer:concealed-presence'
    )
  })

  it('appends detection readout resolution reasons from hiddenStateScouting when disguise is inactive', () => {
    const observer = createReconObserver('a_report_orchestration', 60)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createConcealedPresenceCase({
      assignedTeamIds: [team.id],
      counterDetection: true,
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)
    const reasons: string[] = []

    appendDetectionScanResolutionReason(
      reasons,
      resolution.behaviorValidation,
      resolution.hiddenStateScouting,
      caseData
    )

    expect(reasons.some((reason) => reason.includes(CONCEALMENT_SCAN_READOUT_PREFIX))).toBe(true)
    expect(reasons.some((reason) => reason.includes(DETECTION_SCAN_READOUT_PREFIX))).toBe(false)
  })

  it('appends displacement readout for false-position hiddenStateScouting', () => {
    const observer = createReconObserver('a_displacement_report', 60)
    const team: Team = {
      id: 'team-reveal',
      name: 'Reveal team',
      agentIds: [observer.id],
      tags: [],
    }
    const state = createStartingState()
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createConcealedPresenceCase({
      assignedTeamIds: [team.id],
      hiddenState: 'displaced',
      displacementTarget: 'annex-b',
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)
    const reasons: string[] = []

    appendDetectionScanResolutionReason(
      reasons,
      resolution.behaviorValidation,
      resolution.hiddenStateScouting,
      caseData
    )

    expect(reasons.some((reason) => reason.includes(DISPLACEMENT_SCAN_READOUT_PREFIX))).toBe(true)
    expect(reasons.some((reason) => reason.includes('decoy locus annex-b'))).toBe(true)
  })
})
