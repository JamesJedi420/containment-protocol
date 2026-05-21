import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildInfiltrationEncounterReportContext,
  enrichInfiltrationThresholdSummary,
  formatInfiltrationWeeklyEncounterSummary,
  resolveInfiltrationProbeActionSource,
} from '../domain/infiltrationEncounterReportNotes'
import { countInvestigationCustodyLossRefs } from '../domain/investigationCustodyLoss'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyInfiltrationWeeklyProbeActionOverride } from '../domain/infiltrationProbeOverride'
import { createStarterCase } from '../domain/templates/startingCases'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createWeeklyMvpLoopProofFixture } from './helpers/weeklyMvpLoopProof'

function createBehaviorObserver(id: string): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: { combat: 10, investigation: 50, utility: 40, social: 30 },
    tags: ['medium', 'liaison'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

function createObserverTeam(id: string, agentId: string): Team {
  return { id, name: id, agentIds: [agentId], tags: [] }
}

describe('infiltrationEncounterReportCopy', () => {
  it('formats weekly encounter summary with authored plan, cover role, and leave-behind', () => {
    const { state } = createWeeklyMvpLoopProofFixture()
    const caseData = state.cases['case-mvp-covert']!
    caseData.hiddenState = 'hidden'
    caseData.tags = [...caseData.tags, 'infiltration']

    const context = buildInfiltrationEncounterReportContext(caseData)
    expect(context).toBeDefined()
    expect(resolveInfiltrationProbeActionSource(caseData)).toBe('authored')
    expect(context?.coverRole).toBe('uniform_guard')
    expect(context?.leaveBehindLabel).toBe('Expose cooperating witness')

    const summary = formatInfiltrationWeeklyEncounterSummary(context!)
    expect(summary).toContain('Authored probe plan')
    expect(summary).toContain('uniform guard cover')
    expect(summary).toContain('Expose cooperating witness')
    expect(summary).toContain('access probe')
  })

  it('prefixes threshold summaries with weekly prep context', () => {
    const caseData = createStarterCase({
      id: 'case-enrich',
      templateId: 'ops-004',
      status: 'in_progress',
    })
    caseData.hiddenState = 'hidden'
    caseData.tags = ['infiltration', 'media', 'public']
    caseData.infiltrationWeeklyProbeActionOverride = 'cleanup'
    caseData.infiltrationCoverProfile = {
      claimedRole: 'uniform_guard',
      documentTier: 0,
    }
    caseData.infiltrationProbePlan = { defaultAction: 'probe_access' }

    const context = buildInfiltrationEncounterReportContext(caseData)
    expect(context).toBeDefined()

    const enriched = enrichInfiltrationThresholdSummary(
      'Cover strain is visible to local observers.',
      context!
    )
    expect(enriched).toContain('cover cleanup')
    expect(enriched).toContain('uniform guard cover')
    expect(enriched).toContain('Cover strain is visible')
  })

  it('emits infiltration.weekly_encounter on routine covert weeks without threshold crossings', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-routine': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const covertCase = createStarterCase({
      id: 'case-routine',
      templateId: 'ops-004',
      status: 'in_progress',
      assignedTeamIds: [teamId],
    })
    covertCase.mode = 'deterministic'
    covertCase.weeksRemaining = 3
    covertCase.hiddenState = 'hidden'
    covertCase.infiltrationAwareness = 0.05
    covertCase.infiltrationProbeProgress = 0.02
    covertCase.infiltrationStage = 'probing'
    covertCase.tags = ['infiltration', 'field']

    state.cases['case-routine'] = covertCase

    const nextState = advanceWeek(state)
    const report = nextState.reports[nextState.reports.length - 1]

    expect(
      report?.notes.some((note) => note.type === 'infiltration.weekly_encounter')
    ).toBe(true)

    const weeklyNote = report?.notes.find((note) => note.type === 'infiltration.weekly_encounter')
    expect(weeklyNote?.content).toContain('Public Safety Briefing')
    expect(weeklyNote?.metadata?.probeAction).toBeDefined()
  })

  it('emits infiltration.leave_behind_tradeoff when mission resolves with custody loss', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('agent_leave_behind_report')
    const team = createObserverTeam('team_leave_behind_report', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    state.reports = []
    state.agency!.supportAvailable = 3

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    let tunedCase: CaseInstance | undefined

    for (let socialDifficulty = 8; socialDifficulty <= 140; socialDifficulty += 1) {
      const candidate: CaseInstance = {
        ...createStarterCase({
          id: 'case-leave',
          templateId: 'ops-004',
          status: 'in_progress',
          assignedTeamIds: [team.id],
        }),
        mode: 'deterministic',
        weeksRemaining: 1,
        hiddenState: 'hidden',
        detectionConfidence: 0.25,
        counterDetection: false,
        tags: ['infiltration', 'media', 'public'],
        requiredTags: ['medium'],
        preferredTags: [],
        assignedTeamIds: [team.id],
        stealthLeaveBehindId: 'leave-behind:expose-witness',
        difficulty: {
          combat: 0,
          investigation: 0,
          utility: 0,
          social: socialDifficulty,
        },
        weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
      }

      const resolution = resolveAssignedCaseForWeek(candidate, state, () => 0.5)

      if (
        resolution.outcome.result === 'success' &&
        resolution.stealthLeaveBehindMission?.active &&
        resolution.stealthLeaveBehindMission.custodyLossRefs.length > 0
      ) {
        tunedCase = candidate
        break
      }
    }

    if (tunedCase === undefined) {
      throw new Error('Unable to tune a leave-behind mission case for report copy test.')
    }

    state.cases['case-leave'] = tunedCase

    const nextState = advanceWeek(state)
    const report = nextState.reports[nextState.reports.length - 1]

    expect(
      report?.notes.some((note) => note.type === 'infiltration.leave_behind_tradeoff')
    ).toBe(true)

    const tradeoffNote = report?.notes.find(
      (note) => note.type === 'infiltration.leave_behind_tradeoff'
    )
    expect(tradeoffNote?.content).toContain('Expose cooperating witness')
    expect(tradeoffNote?.metadata?.leaveBehindLabel).toBe('Expose cooperating witness')
  })

  it('emits infiltration.leave_behind_tradeoff without custody strain when refs are empty (IC-06)', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('agent_leave_behind_no_custody')
    const team = createObserverTeam('team_leave_behind_no_custody', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    state.reports = []
    state.agency!.supportAvailable = 3

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    let tunedCase: CaseInstance | undefined

    for (let socialDifficulty = 8; socialDifficulty <= 140; socialDifficulty += 1) {
      const candidate: CaseInstance = {
        ...createStarterCase({
          id: 'case-leave-no-custody',
          templateId: 'ops-004',
          status: 'in_progress',
          assignedTeamIds: [team.id],
        }),
        mode: 'deterministic',
        weeksRemaining: 1,
        hiddenState: 'hidden',
        detectionConfidence: 0.25,
        counterDetection: false,
        tags: ['infiltration', 'media', 'public'],
        requiredTags: ['medium'],
        preferredTags: [],
        assignedTeamIds: [team.id],
        stealthLeaveBehindId: 'leave-behind:burn-tool',
        difficulty: {
          combat: 0,
          investigation: 0,
          utility: 0,
          social: socialDifficulty,
        },
        weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
      }

      const resolution = resolveAssignedCaseForWeek(candidate, state, () => 0.5)

      if (
        resolution.outcome.result === 'success' &&
        resolution.stealthLeaveBehindMission?.active
      ) {
        tunedCase = candidate
        break
      }
    }

    if (tunedCase === undefined) {
      throw new Error('Unable to tune a leave-behind mission case for no-custody report test.')
    }

    state.cases['case-leave-no-custody'] = tunedCase

    const nextState = advanceWeek(state)
    const report = nextState.reports[nextState.reports.length - 1]

    expect(
      report?.notes.some((note) => note.type === 'infiltration.leave_behind_tradeoff')
    ).toBe(true)

    const tradeoffNote = report?.notes.find(
      (note) => note.type === 'infiltration.leave_behind_tradeoff'
    )
    expect(tradeoffNote?.content).toContain('Burn field tool')
    expect(tradeoffNote?.content).toMatch(/Stealth leave-behind applied/)
    expect(tradeoffNote?.content).not.toMatch(/Investigation strain:/i)
    expect(tradeoffNote?.metadata?.leaveBehindLabel).toBe('Burn field tool')
    expect(countInvestigationCustodyLossRefs(nextState, 'case-leave-no-custody')).toBe(0)
  })

  it('includes player override in enriched threshold report notes', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-ops-004-cover': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const covertCase = createStarterCase({
      id: 'case-ops-004-cover',
      templateId: 'ops-004',
      status: 'in_progress',
      assignedTeamIds: [teamId],
    })
    covertCase.mode = 'deterministic'
    covertCase.weeksRemaining = 2
    covertCase.infiltrationAwareness = 0.3
    covertCase.infiltrationProbeProgress = 0.2
    covertCase.hiddenState = 'hidden'
    covertCase.tags = ['infiltration', 'media', 'public']
    covertCase.infiltrationCoverProfile = {
      claimedRole: 'uniform_guard',
      documentTier: 0,
    }

    state.cases['case-ops-004-cover'] = covertCase

    const withOverride = applyInfiltrationWeeklyProbeActionOverride(state, {
      caseId: 'case-ops-004-cover',
      action: 'probe_route',
    })
    expect(withOverride.applied).toBe(true)

    const nextState = advanceWeek(withOverride.state)
    const strainNote = nextState.reports
      .flatMap((report) => report.notes)
      .find((note) => note.type === 'infiltration.cover_strain')

    expect(strainNote).toBeDefined()
    expect(strainNote?.content).toMatch(/route probe|Weekly prep selected route probe/)
    expect(strainNote?.content).toMatch(/player override|Weekly prep/)
    expect(strainNote?.content).toMatch(/awareness/i)
    expect(strainNote?.metadata?.probeAction).toBe('probe_route')
    expect(strainNote?.metadata?.probeActionSource).toBe('override')
    expect(typeof strainNote?.metadata?.infiltrationAwareness).toBe('number')
  })

  it('does not emit duplicate weekly_encounter when threshold events already fired', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-ops-004-cover': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const covertCase = createStarterCase({
      id: 'case-dup-check',
      templateId: 'ops-004',
      status: 'in_progress',
      assignedTeamIds: [teamId],
    })
    covertCase.mode = 'deterministic'
    covertCase.weeksRemaining = 2
    covertCase.hiddenState = 'hidden'
    covertCase.tags = ['infiltration', 'media', 'public']
    covertCase.infiltrationAwareness = 0.3
    covertCase.infiltrationProbeProgress = 0.2
    covertCase.infiltrationCoverProfile = {
      claimedRole: 'uniform_guard',
      documentTier: 0,
    }

    state.cases['case-dup-check'] = covertCase

    const nextState = advanceWeek(state)
    const report = nextState.reports[nextState.reports.length - 1]
    const weeklyCount = report?.notes.filter(
      (note) => note.type === 'infiltration.weekly_encounter'
    ).length

    expect(weeklyCount).toBe(0)
    expect(
      report?.notes.some((note) => note.type?.startsWith('infiltration.') ?? false)
    ).toBe(true)
  })
})
