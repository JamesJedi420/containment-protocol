import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import {
  FABRICATED_CONTACT_READOUT_PREFIX,
  STRUCTURAL_ILLUSION_READOUT_PREFIX,
} from '../domain/detectionScanReportNotes'
import {
  applyHiddenStateIllusionLifecyclePass,
  applyIllusionScanProjection,
  buildIllusionLifecycleContext,
  resolveIllusionKindFromCase,
  resolveIllusionAnchorLabel,
} from '../domain/hiddenStateIllusionLifecycle'
import { resolveHiddenStateModality } from '../domain/hiddenStateModality'
import {
  detectionScanTierOrder,
  resolveScoutingWithCaseHiddenState,
} from '../domain/revealPayloadScoutingIntegration'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

const SCOUTING_INPUT = {
  teamCapability: 3,
  anomalyConcealment: 2,
  teamTags: ['recon-specialist'],
  anomalyTags: ['concealment'],
} as const

const SUBJECT = {
  exactIdentity: 'entity:illusion-case',
  category: 'hidden contact',
  hostility: 'latent' as const,
  activeEffects: [],
  dormantEffects: [],
  activeProtections: [],
}

function createIllusionCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-illusion-matrix',
      templateId: 'combat_vampire_nest',
    }),
    mode: 'threshold',
    status: 'in_progress',
    weeksRemaining: 2,
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: ['team-illusion'],
    infiltrationCoverProfile: undefined,
    infiltrationProbePlan: undefined,
    stealthLeaveBehindId: undefined,
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    ...overrides,
  }
}

function createReconObserver(id: string, investigation = 60): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: { combat: 10, investigation, utility: 40, social: 40 },
    tags: ['medium', 'recon-specialist'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

describe('hiddenStateIllusionLifecycle (SPE-2285)', () => {
  it('activates false_entity from hidden + false-entity tag (prefers over structural)', () => {
    const caseData = createIllusionCase({
      tags: ['concealment', 'false-entity', 'structural-illusion'],
    })

    expect(resolveIllusionKindFromCase(caseData)).toBe('false_entity')
    expect(resolveHiddenStateModality(caseData)).toBe('concealed_presence')
  })

  it('activates structural_illusion for displaced cases with structural-illusion tag', () => {
    const caseData = createIllusionCase({
      hiddenState: 'displaced',
      displacementTarget: 'annex-c',
      tags: ['structural-illusion'],
    })

    expect(resolveIllusionKindFromCase(caseData)).toBe('structural_illusion')
    expect(resolveIllusionAnchorLabel(caseData, 'structural_illusion')).toContain('annex-c')
  })

  it('transitions active → disproved → collapsed via counter-detection and mission success', () => {
    const base = createIllusionCase({ tags: ['concealment', 'false-entity'] })
    const active = applyHiddenStateIllusionLifecyclePass(
      base,
      buildIllusionLifecycleContext(base)
    )

    expect(active.hiddenStateIllusionState?.phase).toBe('active')

    const withCounterDetection = { ...active, counterDetection: true }
    const disproved = applyHiddenStateIllusionLifecyclePass(withCounterDetection, {
      ...buildIllusionLifecycleContext(withCounterDetection),
      counterDetection: true,
    })

    expect(disproved.hiddenStateIllusionState?.phase).toBe('disproved')
    expect(disproved.hiddenStateIllusionState?.disproofReason).toContain('counter-detection')

    const collapsed = applyHiddenStateIllusionLifecyclePass(disproved, {
      ...buildIllusionLifecycleContext(disproved),
      missionResult: 'success',
    })

    expect(collapsed.hiddenStateIllusionState).toBeUndefined()
  })

  it('disproves false_entity via sustained recon without revealing canonical subject', () => {
    const caseData = createIllusionCase({
      tags: ['concealment', 'false-entity'],
      hiddenStateScoutingReconCache: {
        knownUnresolvedLayerIds: ['layer:false-entity'],
        scoutingPassCount: 1,
        lastUpdatedWeek: 1,
      },
    })

    const initialized = applyHiddenStateIllusionLifecyclePass(
      caseData,
      buildIllusionLifecycleContext(caseData)
    )
    expect(initialized.hiddenStateIllusionState?.phase).toBe('active')

    const disproved = applyHiddenStateIllusionLifecyclePass(initialized, {
      ...buildIllusionLifecycleContext(initialized),
      reconPassCount: 2,
    })

    expect(disproved.hiddenStateIllusionState?.phase).toBe('disproved')

    const integrated = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_INPUT,
      subject: SUBJECT,
      caseData: disproved,
    })

    expect(integrated.detectionScan.fields.some((field) => field.tier === 'exact_identity')).toBe(
      false
    )
    expect(disproved.hiddenState).toBe('hidden')
  })

  it('projects fabricated contact tiers while illusion is active', () => {
    const caseData = createIllusionCase({
      tags: ['concealment', 'false-entity'],
      hiddenStateIllusionState: {
        kind: 'false_entity',
        phase: 'active',
        anchorLabel: 'fabricated contact at annex-c',
      },
    })

    const integrated = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_INPUT,
      subject: { ...SUBJECT, present: true },
      caseData,
    })

    expect(detectionScanTierOrder(integrated.detectionScan).length).toBeGreaterThan(0)
    expect(
      integrated.detectionScan.fields.some((field) =>
        field.playerFacingValue.includes('fabricated')
      )
    ).toBe(true)

    const projected = applyIllusionScanProjection(integrated.detectionScan, caseData)
    expect(projected.fields[0]?.playerFacingValue).toContain('fabricated')
  })

  it('disproves structural illusion via route traversal without forcing revealed hiddenState', () => {
    const caseData = createIllusionCase({
      hiddenState: 'displaced',
      displacementTarget: 'sector-east',
      tags: ['structural-illusion'],
    })

    const active = applyHiddenStateIllusionLifecyclePass(
      caseData,
      buildIllusionLifecycleContext(caseData)
    )
    expect(active.hiddenStateIllusionState?.phase).toBe('active')

    const withRoute = { ...active, route: 'perimeter-loop' }
    const disproved = applyHiddenStateIllusionLifecyclePass(withRoute, {
      ...buildIllusionLifecycleContext(withRoute),
      route: 'perimeter-loop',
    })

    expect(disproved.hiddenStateIllusionState?.phase).toBe('disproved')
    expect(disproved.hiddenState).toBe('displaced')
  })
})

describe('hiddenStateIllusionLifecycle integration', () => {
  function tuneFalseEntityCase(
    state: ReturnType<typeof createStartingState>,
    teamId: string
  ): CaseInstance {
    const baseCase = createIllusionCase({
      id: 'case-false-entity-readout',
      tags: ['concealment', 'false-entity'],
      assignedTeamIds: [teamId],
      counterDetection: false,
      weeksRemaining: 1,
    })

    for (let investigationDifficulty = 8; investigationDifficulty <= 140; investigationDifficulty += 1) {
      const candidate: CaseInstance = {
        ...baseCase,
        difficulty: {
          combat: 0,
          investigation: investigationDifficulty,
          utility: 0,
          social: 0,
        },
      }
      const resolution = resolveAssignedCaseForWeek(candidate, state, () => 0.5)

      if (
        resolution.outcome.result === 'success' &&
        resolution.hiddenStateScouting?.active === true
      ) {
        return candidate
      }
    }

    throw new Error('Unable to tune false-entity investigation success case.')
  }

  it('surfaces fabricated-contact readout in weekly explanation notes', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_false_entity_readout')
    const team: Team = {
      id: 'team-false-entity-readout',
      name: 'False entity readout team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    state.cases['case-false-entity-readout'] = tuneFalseEntityCase(state, team.id)

    const preAdvance = resolveAssignedCaseForWeek(
      state.cases['case-false-entity-readout'],
      state,
      () => 0.5
    )
    expect(preAdvance.hiddenStateScouting?.active).toBe(true)
    expect(preAdvance.effectiveCase.hiddenStateIllusionState?.phase).toBe('active')

    const nextState = advanceWeek(state)
    const storedCase = nextState.cases['case-false-entity-readout']
    expect(storedCase?.hiddenState).toBe('hidden')
    const missionResult =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-false-entity-readout']
        ?.missionResult

    expect(
      missionResult?.explanationNotes.some((note) =>
        note.includes(FABRICATED_CONTACT_READOUT_PREFIX)
      )
    ).toBe(true)
  })

  it('surfaces structural-illusion readout with decoy locus for displaced structural cases', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_structural_readout')
    const team: Team = {
      id: 'team-structural-readout',
      name: 'Structural illusion readout team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const baseCase = createIllusionCase({
      id: 'case-structural-readout',
      hiddenState: 'displaced',
      displacementTarget: 'annex-b',
      route: 'service-corridor',
      tags: ['structural-illusion'],
      assignedTeamIds: [team.id],
      weeksRemaining: 1,
    })

    let tunedCase: CaseInstance | undefined
    for (let investigationDifficulty = 8; investigationDifficulty <= 140; investigationDifficulty += 1) {
      const candidate: CaseInstance = {
        ...baseCase,
        difficulty: {
          combat: 0,
          investigation: investigationDifficulty,
          utility: 0,
          social: 0,
        },
      }
      const resolution = resolveAssignedCaseForWeek(candidate, state, () => 0.5)
      if (
        resolution.outcome.result === 'success' &&
        resolution.hiddenStateScouting?.active === true
      ) {
        tunedCase = candidate
        break
      }
    }

    if (tunedCase === undefined) {
      throw new Error('Unable to tune structural-illusion investigation success case.')
    }

    state.cases['case-structural-readout'] = tunedCase

    const preAdvance = resolveAssignedCaseForWeek(
      state.cases['case-structural-readout'],
      state,
      () => 0.5
    )
    expect(preAdvance.hiddenStateScouting?.active).toBe(true)

    const nextState = advanceWeek(state)
    const missionResult =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-structural-readout']
        ?.missionResult

    expect(
      missionResult?.explanationNotes.some((note) =>
        note.includes(STRUCTURAL_ILLUSION_READOUT_PREFIX)
      )
    ).toBe(true)
    expect(
      missionResult?.explanationNotes.some((note) => note.includes('decoy locus annex-b'))
    ).toBe(true)
    expect(state.cases['case-structural-readout']?.hiddenState).toBe('displaced')
  })
})
