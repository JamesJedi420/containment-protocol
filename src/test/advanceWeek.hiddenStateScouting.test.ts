import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  CONCEALMENT_SCAN_READOUT_PREFIX,
  CONCEALMENT_TELL_READOUT_PREFIX,
  DISPLACEMENT_SCAN_READOUT_PREFIX,
  DISPLACEMENT_TELL_READOUT_PREFIX,
  DETECTION_SCAN_READOUT_PREFIX,
  SIGNATURE_MASK_SCAN_READOUT_PREFIX,
  FALSE_DETECTION_SCAN_READOUT_PREFIX,
} from '../domain/detectionScanReportNotes'
import {
  MODALITY_FALSE_DETECTION_TAG,
  MODALITY_SIGNATURE_MASK_TAG,
} from '../domain/hiddenStateModality'
import { TELL_ROUTE_TIMING_TAG, TELL_THERMAL_RESIDUAL_TAG } from '../domain/hiddenStateModalityTells'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStarterCase } from '../domain/templates/startingCases'

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

function createConcealedInvestigationCase(teamId: string): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-concealed-readout',
      templateId: 'combat_vampire_nest',
    }),
    mode: 'threshold',
    status: 'in_progress',
    weeksRemaining: 1,
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: true,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [teamId],
    infiltrationCoverProfile: undefined,
    infiltrationProbePlan: undefined,
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
  }
}

function tuneConcealedInvestigationCase(
  state: ReturnType<typeof createStartingState>,
  teamId: string,
  overrides: Partial<CaseInstance> = {}
): CaseInstance {
  const baseCase = {
    ...createConcealedInvestigationCase(teamId),
    ...overrides,
  }

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

  throw new Error('Unable to tune a concealed-presence investigation success case.')
}

describe('advanceWeek hidden-state scouting report copy (SPE-2283)', () => {
  it('surfaces concealment-framed detection readout in weekly explanation notes', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_concealed_readout', 60)
    const team: Team = {
      id: 'team-concealed-readout',
      name: 'Concealed readout team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-concealed-readout'] = tuneConcealedInvestigationCase(state, team.id)

    const preAdvance = resolveAssignedCaseForWeek(state.cases['case-concealed-readout'], state, () => 0.5)
    expect(preAdvance.hiddenStateScouting?.active).toBe(true)
    expect(preAdvance.behaviorValidation?.active).toBe(false)

    const nextState = advanceWeek(state)
    const missionResult =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-concealed-readout']
        ?.missionResult

    expect(
      missionResult?.explanationNotes.some((note) => note.includes(CONCEALMENT_SCAN_READOUT_PREFIX))
    ).toBe(true)
    expect(
      missionResult?.explanationNotes.some((note) => note.includes(DETECTION_SCAN_READOUT_PREFIX))
    ).toBe(false)
  })

  it('surfaces displacement-framed readout with decoy locus for false-position cases', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_displaced_readout', 60)
    const team: Team = {
      id: 'team-displaced-readout',
      name: 'Displaced readout team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-concealed-readout'] = tuneConcealedInvestigationCase(state, team.id, {
      hiddenState: 'displaced',
      displacementTarget: 'annex-b',
    })

    const preAdvance = resolveAssignedCaseForWeek(state.cases['case-concealed-readout'], state, () => 0.5)
    expect(preAdvance.hiddenStateScouting?.active).toBe(true)

    const nextState = advanceWeek(state)
    const missionResult =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-concealed-readout']
        ?.missionResult

    expect(
      missionResult?.explanationNotes.some((note) => note.includes(DISPLACEMENT_SCAN_READOUT_PREFIX))
    ).toBe(true)
    expect(
      missionResult?.explanationNotes.some((note) => note.includes('decoy locus annex-b'))
    ).toBe(true)
  })

  it('surfaces concealment tell readout without revealing hidden state', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_concealed_tell', 60)
    const team: Team = {
      id: 'team-concealed-tell',
      name: 'Concealed tell team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-concealed-readout'] = tuneConcealedInvestigationCase(state, team.id, {
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
    })

    const preAdvance = resolveAssignedCaseForWeek(state.cases['case-concealed-readout'], state, () => 0.5)
    expect(preAdvance.hiddenStateModalityTell?.active).toBe(true)

    const nextState = advanceWeek(state)
    const snapshot =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-concealed-readout']

    expect(
      snapshot?.missionResult?.explanationNotes.some((note) =>
        note.includes(CONCEALMENT_TELL_READOUT_PREFIX)
      )
    ).toBe(true)
    expect(snapshot?.hiddenState).not.toBe('revealed')
  })

  it('surfaces displacement tell readout for route-timing tags', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_displaced_tell', 60)
    const team: Team = {
      id: 'team-displaced-tell',
      name: 'Displaced tell team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-concealed-readout'] = tuneConcealedInvestigationCase(state, team.id, {
      hiddenState: 'displaced',
      displacementTarget: 'annex-b',
      tags: [TELL_ROUTE_TIMING_TAG],
    })

    const nextState = advanceWeek(state)
    const missionResult =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-concealed-readout']
        ?.missionResult

    expect(
      missionResult?.explanationNotes.some((note) => note.includes(DISPLACEMENT_TELL_READOUT_PREFIX))
    ).toBe(true)
    expect(
      missionResult?.explanationNotes.some((note) => note.includes('movement log'))
    ).toBe(true)
  })

  it('surfaces signature-mask readout without revealing hidden state', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_signature_mask_readout', 60)
    const team: Team = {
      id: 'team-signature-mask-readout',
      name: 'Signature mask readout team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-concealed-readout'] = tuneConcealedInvestigationCase(state, team.id, {
      tags: [MODALITY_SIGNATURE_MASK_TAG],
    })

    const preAdvance = resolveAssignedCaseForWeek(state.cases['case-concealed-readout'], state, () => 0.5)
    expect(preAdvance.hiddenStateScouting?.active).toBe(true)

    const nextState = advanceWeek(state)
    const snapshot =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-concealed-readout']

    expect(
      snapshot?.missionResult?.explanationNotes.some((note) =>
        note.includes(SIGNATURE_MASK_SCAN_READOUT_PREFIX)
      )
    ).toBe(true)
    expect(snapshot?.hiddenState).not.toBe('revealed')
  })

  it('surfaces false-detection readout without revealing hidden state', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_false_detection_readout', 60)
    const team: Team = {
      id: 'team-false-detection-readout',
      name: 'False-detection readout team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-concealed-readout'] = tuneConcealedInvestigationCase(state, team.id, {
      tags: [MODALITY_FALSE_DETECTION_TAG],
    })

    const preAdvance = resolveAssignedCaseForWeek(state.cases['case-concealed-readout'], state, () => 0.5)
    expect(preAdvance.hiddenStateScouting?.active).toBe(true)

    const nextState = advanceWeek(state)
    const snapshot =
      nextState.reports[nextState.reports.length - 1].caseSnapshots?.['case-concealed-readout']

    expect(
      snapshot?.missionResult?.explanationNotes.some((note) =>
        note.includes(FALSE_DETECTION_SCAN_READOUT_PREFIX)
      )
    ).toBe(true)
    expect(
      snapshot?.missionResult?.explanationNotes.some((note) =>
        note.includes('fabricated maintenance contact')
      )
    ).toBe(true)
    expect(snapshot?.hiddenState).not.toBe('revealed')
  })
})
