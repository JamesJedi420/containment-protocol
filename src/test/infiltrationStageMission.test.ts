import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  resolveAssignedCaseForWeek,
  resolveMissionSuccessDegradeHint,
} from '../domain/caseResolutionOrchestration'
import { evaluateInfiltrationStageMissionPressure } from '../domain/infiltrationProbe'
import { previewResolutionForTeamIds } from '../domain/sim/resolve'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

function createBehaviorObserver(id: string) {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation: 50,
      utility: 40,
      social: 30,
    },
    tags: ['medium', 'liaison'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  } satisfies Agent
}

function createObserverTeam(id: string, agentId: string) {
  return {
    id,
    name: id,
    agentIds: [agentId],
    tags: [],
  } satisfies Team
}

function createInfiltrationBriefingCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-infiltration-stage',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['infiltration', 'media', 'public'],
    requiredTags: ['medium'],
    preferredTags: [],
    assignedTeamIds: [],
    infiltrationCoverProfile: {
      claimedRole: 'official_inspector',
      documentTier: 2,
      doctrineBand: 0.4,
    },
    ...overrides,
  }
}

describe('infiltration stage mission-resolution fallout', () => {
  it('orders stage malus probing < exposed < violent', () => {
    const base = createInfiltrationBriefingCase()

    expect(evaluateInfiltrationStageMissionPressure({ ...base, infiltrationStage: 'probing' }).active).toBe(
      false
    )

    const exposed = evaluateInfiltrationStageMissionPressure({
      ...base,
      infiltrationStage: 'exposed',
    })
    const violent = evaluateInfiltrationStageMissionPressure({
      ...base,
      infiltrationStage: 'violent',
    })

    expect(exposed.active).toBe(true)
    expect(violent.active).toBe(true)
    expect(exposed.scoreAdjustment).toBeGreaterThan(0)
    expect(violent.scoreAdjustment).toBeGreaterThan(exposed.scoreAdjustment)
  })

  it('applies violent-stage malus through live case resolution orchestration', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_stage_orchestration')
    const team = createObserverTeam('t_stage_orchestration', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const probingCase = createInfiltrationBriefingCase({
      infiltrationStage: 'probing',
      infiltrationAwareness: 0.3,
      assignedTeamIds: [team.id],
    })
    const violentCase = createInfiltrationBriefingCase({
      infiltrationStage: 'violent',
      infiltrationAwareness: 0.85,
      counterDetection: true,
      detectionConfidence: 0.75,
      assignedTeamIds: [team.id],
    })

    const probingResolution = resolveAssignedCaseForWeek(probingCase, state, () => 0.5)
    const violentResolution = resolveAssignedCaseForWeek(violentCase, state, () => 0.5)

    expect(probingResolution.infiltrationStageMission?.active).toBe(false)
    expect(violentResolution.infiltrationStageMission?.active).toBe(true)
    expect(violentResolution.infiltrationStageMission?.scoreAdjustment).toBeGreaterThan(0)
    expect(
      violentResolution.outcome.reasons.some((reason) => reason.includes('Infiltration stage:'))
    ).toBe(true)
    expect(
      (probingResolution.infiltrationStageMission?.scoreAdjustment ?? 0) <
        (violentResolution.infiltrationStageMission?.scoreAdjustment ?? 0)
    ).toBe(true)
  })

  it('applies exposed-stage malus between probing and violent in orchestration', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_exposed_orchestration')
    const team = createObserverTeam('t_exposed_orchestration', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const base = createInfiltrationBriefingCase({
      infiltrationAwareness: 0.6,
      assignedTeamIds: [team.id],
    })

    const probing = resolveAssignedCaseForWeek(
      { ...base, infiltrationStage: 'probing' },
      state,
      () => 0.5
    )
    const exposed = resolveAssignedCaseForWeek(
      { ...base, infiltrationStage: 'exposed', detectionConfidence: 0.55 },
      state,
      () => 0.5
    )
    const violent = resolveAssignedCaseForWeek(
      {
        ...base,
        infiltrationStage: 'violent',
        counterDetection: true,
        detectionConfidence: 0.75,
      },
      state,
      () => 0.5
    )

    expect(probing.infiltrationStageMission?.scoreAdjustment ?? 0).toBe(0)
    expect(exposed.infiltrationStageMission?.scoreAdjustment).toBe(2.5)
    expect(violent.infiltrationStageMission?.scoreAdjustment).toBe(4.5)
    expect(resolveMissionSuccessDegradeHint({ infiltrationStageMission: exposed }).shouldDegrade).toBe(
      false
    )
    expect(
      resolveMissionSuccessDegradeHint({
        infiltrationStageMission: violent.infiltrationStageMission,
      }).shouldDegrade
    ).toBe(true)
  })

  it('matches preview and live score context for violent infiltration stage', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_preview_stage')
    const team = createObserverTeam('t_preview_stage', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const violentCase = createInfiltrationBriefingCase({
      infiltrationStage: 'violent',
      infiltrationAwareness: 0.85,
      counterDetection: true,
      detectionConfidence: 0.75,
      assignedTeamIds: [team.id],
    })
    const probingCase = { ...violentCase, infiltrationStage: 'probing' as const, counterDetection: false }

    const previewViolent = previewResolutionForTeamIds(violentCase, state, [team.id])
    const previewProbing = previewResolutionForTeamIds(probingCase, state, [team.id])
    const liveViolent = resolveAssignedCaseForWeek(violentCase, state, () => 0.5)
    const liveProbing = resolveAssignedCaseForWeek(probingCase, state, () => 0.5)

    expect(liveViolent.infiltrationStageMission?.scoreAdjustment).toBe(4.5)
    expect(liveProbing.infiltrationStageMission?.active).toBe(false)
    expect(previewViolent.odds.success).toBeLessThanOrEqual(previewProbing.odds.success)
    expect(
      previewViolent.odds.success < previewProbing.odds.success ||
        (liveViolent.infiltrationStageMission?.scoreAdjustment ?? 0) >
          (liveProbing.infiltrationStageMission?.scoreAdjustment ?? 0)
    ).toBe(true)
  })
})

describe('advanceWeek infiltration stage mission fallout', () => {
  it('downgrades a successful hidden infiltration when stage is violent under authority scrutiny', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_advance_stage')
    const team = createObserverTeam('t_advance_stage', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []
    state.agency!.supportAvailable = 2

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    let tunedCase: CaseInstance | undefined

    for (let socialDifficulty = 8; socialDifficulty <= 140; socialDifficulty += 1) {
      const candidate: CaseInstance = {
        ...createStarterCase({ id: 'case-001', templateId: 'ops-004' }),
        mode: 'deterministic',
        status: 'in_progress',
        weeksRemaining: 1,
        hiddenState: 'hidden',
        detectionConfidence: 0.75,
        counterDetection: true,
        tags: ['infiltration', 'media', 'public'],
        requiredTags: ['medium'],
        preferredTags: [],
        assignedTeamIds: [team.id],
        infiltrationStage: 'violent',
        infiltrationAwareness: 0.85,
        infiltrationCoverProfile: {
          claimedRole: 'official_inspector',
          documentTier: 2,
          doctrineBand: 0.4,
        },
        difficulty: {
          combat: 0,
          investigation: 0,
          utility: 0,
          social: socialDifficulty,
        },
        weights: {
          combat: 0,
          investigation: 0,
          utility: 0,
          social: 1,
        },
      }

      const resolution = resolveAssignedCaseForWeek(candidate, state, () => 0.5)

      if (
        resolution.outcome.result === 'success' &&
        resolution.infiltrationStageMission?.shouldDegradeSuccessToPartial
      ) {
        tunedCase = candidate
        break
      }
    }

    if (tunedCase === undefined) {
      throw new Error('Unable to tune a violent-stage infiltration success case for advanceWeek.')
    }

    state.cases['case-001'] = tunedCase

    const preAdvance = resolveAssignedCaseForWeek(tunedCase, state, () => 0.5)
    expect(preAdvance.outcome.result).toBe('success')
    expect(preAdvance.infiltrationStageMission?.shouldDegradeSuccessToPartial).toBe(true)

    const nextState = advanceWeek(state)
    const missionResult = nextState.reports[nextState.reports.length - 1]?.caseSnapshots?.['case-001']
      ?.missionResult

    expect(missionResult?.outcome).toBe('partial')
    const notes = missionResult?.explanationNotes ?? []
    expect(
      notes.some(
        (note) =>
          note.includes('Violent infiltration escalation under authority scrutiny') ||
          note.includes('Infiltration stage:')
      )
    ).toBe(true)
    expect(nextState.cases['case-001'].status).toBe('open')
  })
})
