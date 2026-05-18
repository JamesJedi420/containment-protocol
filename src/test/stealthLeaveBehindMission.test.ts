import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  resolveAssignedCaseForWeek,
  resolveMissionSuccessDegradeHint,
} from '../domain/caseResolutionOrchestration'
import { evaluateStealthLeaveBehindMissionPressure } from '../domain/stealthLeaveBehindRegistry'
import { caseTemplateMap, caseTemplates } from '../data/caseTemplates'
import { previewResolutionForTeamIds } from '../domain/sim/resolve'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { instantiateFromTemplate } from '../domain/sim/spawn'
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

function createStealthCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-stealth-leave-behind',
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
    stealthLeaveBehindId: 'leave-behind:burn-tool',
    ...overrides,
  }
}

describe('evaluateStealthLeaveBehindMissionPressure', () => {
  it('is inactive without hidden state, concealment tags, or leave-behind id', () => {
    const base = createStealthCase()

    expect(evaluateStealthLeaveBehindMissionPressure({ ...base, hiddenState: 'revealed' }).active).toBe(
      false
    )
    expect(evaluateStealthLeaveBehindMissionPressure({ ...base, hiddenState: 'displaced' }).active).toBe(
      false
    )
    expect(
      evaluateStealthLeaveBehindMissionPressure({
        ...base,
        tags: ['media', 'public'],
      }).active
    ).toBe(false)
    expect(
      evaluateStealthLeaveBehindMissionPressure({ ...base, stealthLeaveBehindId: undefined }).active
    ).toBe(false)
    expect(
      evaluateStealthLeaveBehindMissionPressure({
        ...base,
        stealthLeaveBehindId: 'leave-behind:missing',
      }).active
    ).toBe(false)
  })

  it('scales score malus from registry discoveryRisk', () => {
    const burnTool = evaluateStealthLeaveBehindMissionPressure(createStealthCase())
    const riskDiscovery = evaluateStealthLeaveBehindMissionPressure(
      createStealthCase({ stealthLeaveBehindId: 'leave-behind:risk-discovery' })
    )

    expect(burnTool.active).toBe(true)
    expect(burnTool.scoreAdjustment).toBe(1.3)
    expect(riskDiscovery.scoreAdjustment).toBe(3.5)
    expect(riskDiscovery.scoreAdjustment).toBeGreaterThan(burnTool.scoreAdjustment)
  })

  it('requests partial degrade only for high discovery risk under authority scrutiny', () => {
    const lowRisk = evaluateStealthLeaveBehindMissionPressure(createStealthCase())
    const highRiskNoAuthority = evaluateStealthLeaveBehindMissionPressure(
      createStealthCase({
        stealthLeaveBehindId: 'leave-behind:risk-discovery',
        tags: ['infiltration', 'interview', 'civilian'],
      })
    )
    const highRiskAuthority = evaluateStealthLeaveBehindMissionPressure(
      createStealthCase({
        stealthLeaveBehindId: 'leave-behind:expose-witness',
        tags: ['infiltration', 'media', 'public'],
      })
    )

    expect(lowRisk.shouldDegradeSuccessToPartial).toBe(false)
    expect(highRiskNoAuthority.shouldDegradeSuccessToPartial).toBe(false)
    expect(highRiskAuthority.shouldDegradeSuccessToPartial).toBe(true)
  })
})

describe('resolveMissionSuccessDegradeHint leave-behind priority', () => {
  it('prefers behavior-validation degrade over leave-behind degrade', () => {
    const behaviorReason = 'Behavior mismatch blocked a clean resolution.'
    const leaveBehindReason =
      'Stealth extraction tradeoff under authority scrutiny prevented a clean resolution.'

    const hint = resolveMissionSuccessDegradeHint({
      behaviorValidation: {
        active: true,
        level: 'strong',
        scoreAdjustment: 4.5,
        evidenceSignals: ['hierarchy fit'],
        counterDetection: true,
        shouldDegradeSuccessToPartial: true,
        degradeSuccessReason: behaviorReason,
      },
      stealthLeaveBehindMission: {
        active: true,
        scoreAdjustment: 3.5,
        shouldDegradeSuccessToPartial: true,
        degradeSuccessReason: leaveBehindReason,
      },
    })

    expect(hint.shouldDegrade).toBe(true)
    expect(hint.reason).toBe(behaviorReason)
  })

  it('prefers infiltration stage degrade over leave-behind degrade', () => {
    const stageReason = 'Violent infiltration escalation under authority scrutiny prevented a clean resolution.'
    const leaveBehindReason =
      'Stealth extraction tradeoff under authority scrutiny prevented a clean resolution.'

    const hint = resolveMissionSuccessDegradeHint({
      infiltrationStageMission: {
        active: true,
        scoreAdjustment: 4.5,
        shouldDegradeSuccessToPartial: true,
        degradeSuccessReason: stageReason,
      },
      stealthLeaveBehindMission: {
        active: true,
        scoreAdjustment: 3.5,
        shouldDegradeSuccessToPartial: true,
        degradeSuccessReason: leaveBehindReason,
      },
    })

    expect(hint.shouldDegrade).toBe(true)
    expect(hint.reason).toBe(stageReason)
  })
})

describe('stealth leave-behind mission-resolution fallout', () => {
  it('applies leave-behind malus through live case resolution orchestration', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_leave_behind_orchestration')
    const team = createObserverTeam('t_leave_behind_orchestration', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const without = createStealthCase({
      assignedTeamIds: [team.id],
      stealthLeaveBehindId: undefined,
    })
    const withLeaveBehind = createStealthCase({
      assignedTeamIds: [team.id],
      stealthLeaveBehindId: 'leave-behind:risk-discovery',
    })

    const inactive = resolveAssignedCaseForWeek(without, state, () => 0.5)
    const active = resolveAssignedCaseForWeek(withLeaveBehind, state, () => 0.5)

    expect(inactive.stealthLeaveBehindMission?.active).toBe(false)
    expect(active.stealthLeaveBehindMission?.active).toBe(true)
    expect(active.stealthLeaveBehindMission?.scoreAdjustment).toBe(3.5)
    expect(
      active.outcome.reasons.some((reason) => reason.includes('Stealth leave-behind:'))
    ).toBe(true)
  })

  it('matches preview and live score context for authored leave-behind', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_preview_leave_behind')
    const team = createObserverTeam('t_preview_leave_behind', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const stealthCase = createStealthCase({
      assignedTeamIds: [team.id],
      stealthLeaveBehindId: 'leave-behind:expose-witness',
    })
    const baselineCase = { ...stealthCase, stealthLeaveBehindId: undefined }

    const previewActive = previewResolutionForTeamIds(stealthCase, state, [team.id])
    const previewBaseline = previewResolutionForTeamIds(baselineCase, state, [team.id])
    const liveActive = resolveAssignedCaseForWeek(stealthCase, state, () => 0.5)

    const directPressure = evaluateStealthLeaveBehindMissionPressure(stealthCase)
    expect(liveActive.stealthLeaveBehindMission?.scoreAdjustment).toBe(directPressure.scoreAdjustment)
    expect(directPressure.scoreAdjustment).toBe(2.8)
    expect(previewActive.odds.success).toBeLessThanOrEqual(previewBaseline.odds.success)
  })

  it('copies stealthLeaveBehindId from catalog templates at spawn', () => {
    const ops003 = instantiateFromTemplate(caseTemplateMap['ops-003'], () => 0.2, new Set())
    const ops004 = instantiateFromTemplate(caseTemplateMap['ops-004'], () => 0.2, new Set())

    expect(ops003.stealthLeaveBehindId).toBe('leave-behind:leave-trace')
    expect(ops004.stealthLeaveBehindId).toBe('leave-behind:expose-witness')
  })
})

describe('advanceWeek stealth leave-behind mission fallout', () => {
  it('downgrades a successful hidden case when leave-behind tradeoff fires under authority scrutiny', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_advance_leave_behind')
    const team = createObserverTeam('t_advance_leave_behind', observer.id)
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
        detectionConfidence: 0.25,
        counterDetection: false,
        tags: ['infiltration', 'media', 'public'],
        requiredTags: ['medium'],
        preferredTags: [],
        assignedTeamIds: [team.id],
        infiltrationStage: 'probing',
        stealthLeaveBehindId: 'leave-behind:risk-discovery',
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
        resolution.stealthLeaveBehindMission?.shouldDegradeSuccessToPartial &&
        !resolution.infiltrationStageMission?.shouldDegradeSuccessToPartial &&
        !resolution.behaviorValidation?.shouldDegradeSuccessToPartial
      ) {
        tunedCase = candidate
        break
      }
    }

    if (tunedCase === undefined) {
      throw new Error('Unable to tune a leave-behind stealth success case for advanceWeek.')
    }

    state.cases['case-001'] = tunedCase

    const preAdvance = resolveAssignedCaseForWeek(tunedCase, state, () => 0.5)
    expect(preAdvance.outcome.result).toBe('success')
    expect(preAdvance.stealthLeaveBehindMission?.shouldDegradeSuccessToPartial).toBe(true)

    const nextState = advanceWeek(state)
    const missionResult = nextState.reports[nextState.reports.length - 1]?.caseSnapshots?.['case-001']
      ?.missionResult

    expect(missionResult?.outcome).toBe('partial')
    const notes = missionResult?.explanationNotes ?? []
    expect(
      notes.some(
        (note) =>
          note.includes('Stealth extraction tradeoff under authority scrutiny') ||
          note.includes('Stealth leave-behind:')
      )
    ).toBe(true)
    expect(nextState.cases['case-001'].status).toBe('open')
  })
})

describe('infiltration probe template leave-behind catalog', () => {
  it('declares stealthLeaveBehindId on every template with infiltrationProbePlan', () => {
    const missing = caseTemplates
      .filter((template) => template.infiltrationProbePlan !== undefined)
      .filter((template) => !template.stealthLeaveBehindId?.trim())
      .map((template) => template.templateId)

    expect(missing).toEqual([])
  })
})
