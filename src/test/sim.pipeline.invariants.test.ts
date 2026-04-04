import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createSeededRng } from '../domain/math'
import { normalizeGameState } from '../domain/teamSimulation'
import { getCaseAssignmentInsights } from '../features/cases/caseInsights'
import { getTeamAssignableCaseViews } from '../features/teams/teamInsights'
import {
  buildResolutionPreviewState,
  estimateOutcomeOdds,
  previewCaseOutcome,
  previewResolutionForTeamIds,
  resolveCase,
} from '../domain/sim/resolve'
import { applyRaids } from '../domain/sim/raid'
import { assignTeam } from '../domain/sim/assign'
import { hireCandidate } from '../domain/sim/hire'
import { createTeam, moveAgentBetweenTeams, renameTeam } from '../domain/sim/teamManagement'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  advanceMarketState,
  advanceProductionQueues,
  queueFabrication,
} from '../domain/sim/production'
import { spawnFromFailures } from '../domain/sim/spawn'
import { advanceTrainingQueues, queueTraining } from '../domain/sim/training'

function previewResolutionFromState(
  currentCase: CaseInstance,
  game: ReturnType<typeof createStartingState>,
  teamIds: string[]
) {
  return previewResolutionForTeamIds(currentCase, buildResolutionPreviewState(game), teamIds)
}

function estimateOddsFromState(
  currentCase: CaseInstance,
  game: ReturnType<typeof createStartingState>,
  teamIds: string[]
) {
  return estimateOutcomeOdds(currentCase, buildResolutionPreviewState(game), teamIds)
}

function previewCaseOutcomeFromState(
  team: Team,
  currentCase: CaseInstance,
  game: ReturnType<typeof createStartingState>
) {
  return previewCaseOutcome(team, currentCase, buildResolutionPreviewState(game))
}

function makeAgent(
  id: string,
  name: string,
  role: Agent['role'],
  tags: string[],
  overrides: Partial<Agent> = {}
): Agent {
  const template = createStartingState().agents.a_ava

  return {
    ...template,
    id,
    name,
    role,
    baseStats: {
      combat: 60,
      investigation: 60,
      utility: 60,
      social: 60,
    },
    tags,
    relationships: {},
    fatigue: 0,
    status: 'active',
    assignment: { state: 'idle' },
    traits: [],
    ...overrides,
  }
}

function makeCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  const template = createStartingState().cases['case-001']

  return {
    ...template,
    id,
    templateId: id,
    title: id,
    description: `${id} description`,
    status: 'open',
    assignedTeamIds: [],
    requiredTags: [],
    preferredTags: [],
    requiredRoles: [],
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    durationWeeks: 1,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    weeksRemaining: undefined,
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 4,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
    ...overrides,
  }
}

function makeSelectorFixture() {
  const state = createStartingState()

  state.agents = {
    'agent-containment': makeAgent('agent-containment', 'Containment Specialist', 'occultist', [
      'occult',
      'seal',
    ]),
    'agent-tech': makeAgent('agent-tech', 'Tech Specialist', 'tech', ['tech', 'field-kit']),
    'agent-hunter': makeAgent('agent-hunter', 'Hunter Specialist', 'hunter', ['combat']),
  }

  state.teams = {
    'team-good': {
      id: 'team-good',
      name: 'Good Team',
      memberIds: ['agent-containment', 'agent-tech'],
      agentIds: ['agent-containment', 'agent-tech'],
      leaderId: 'agent-containment',
      tags: ['occult', 'tech'],
    },
    'team-bad': {
      id: 'team-bad',
      name: 'Bad Team',
      memberIds: ['agent-hunter'],
      agentIds: ['agent-hunter'],
      leaderId: 'agent-hunter',
      tags: ['combat'],
    },
  } satisfies Record<string, Team>

  state.cases = {
    'case-good': makeCase('case-good', {
      requiredRoles: ['containment', 'technical'],
      requiredTags: ['occult', 'tech'],
      mode: 'threshold',
    }),
    'case-bad': makeCase('case-bad', {
      requiredRoles: ['support'],
      requiredTags: ['medical'],
      mode: 'threshold',
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

function getUniqueCaseIds(buckets: string[][]) {
  return new Set(buckets.flatMap((bucket) => bucket))
}

function buildBucketMembership(buckets: Record<string, string[]>) {
  const membership = new Map<string, string[]>()

  for (const [bucket, caseIds] of Object.entries(buckets)) {
    for (const caseId of caseIds) {
      membership.set(caseId, [...(membership.get(caseId) ?? []), bucket])
    }
  }

  return membership
}

function makeDirtyTeamState() {
  const state = createStartingState()
  const team = state.teams['t_nightwatch']

  state.teams['t_nightwatch'] = {
    ...team,
    memberIds: ['a_ava'],
    agentIds: ['a_ava', 'a_kellan'],
    leaderId: 'missing-agent',
    derivedStats: {
      overall: 0,
      fieldPower: 0,
      containment: 0,
      investigation: 0,
      support: 0,
      cohesion: 0,
      chemistryScore: 0,
      readiness: 0,
    },
    status: {
      state: 'ready',
      assignedCaseId: null,
    },
    assignedCaseId: undefined,
  }

  return state
}

function expectCanonicalNightwatch(state: ReturnType<typeof createStartingState>) {
  const team = state.teams['t_nightwatch']

  expect(team.memberIds).toEqual(team.agentIds)
  expect(team.memberIds!.length).toBeGreaterThan(1)
  expect(team.leaderId).toBeTruthy()
  expect(team.memberIds!).toContain(team.leaderId!)
  expect(team.derivedStats!.overall).toBeGreaterThan(0)
  expect(team.status).toBeDefined()
}

type ResolutionExpectation = 'case.resolved' | 'case.partially_resolved' | 'case.failed'

function makeSingleResolutionState(options: {
  caseId: string
  agentCombat: number
  difficultyCombat: number
  partialMargin: number
  seed: number
}) {
  const { caseId, agentCombat, difficultyCombat, partialMargin, seed } = options
  const state = createStartingState()

  state.rngSeed = seed
  state.rngState = seed
  state.partyCards = undefined
  state.events = []
  state.reports = []
  state.config = {
    ...state.config,
    partialMargin,
  }
  state.agents = {
    'agent-integrity': makeAgent('agent-integrity', 'Integrity Agent', 'hunter', [], {
      baseStats: {
        combat: agentCombat,
        investigation: 0,
        utility: 0,
        social: 0,
      },
    }),
  }
  state.teams = {
    'team-integrity': {
      id: 'team-integrity',
      name: 'Integrity Team',
      memberIds: ['agent-integrity'],
      agentIds: ['agent-integrity'],
      leaderId: 'agent-integrity',
      tags: [],
      assignedCaseId: caseId,
    },
  }
  state.cases = {
    [caseId]: makeCase(caseId, {
      status: 'in_progress',
      assignedTeamIds: ['team-integrity'],
      weeksRemaining: 1,
      mode: 'threshold',
      kind: 'case',
      requiredRoles: [],
      requiredTags: [],
      preferredTags: [],
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      difficulty: {
        combat: difficultyCombat,
        investigation: 0,
        utility: 0,
        social: 0,
      },
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: {
        stageDelta: 1,
        deadlineResetWeeks: 4,
        spawnCount: { min: 0, max: 0 },
        spawnTemplateIds: [],
      },
    }),
  }

  return normalizeGameState(state)
}

function getResolutionEventsForCase(
  events: ReturnType<typeof createStartingState>['events'],
  caseId: string
) {
  return events.filter(
    (event) =>
      ['case.resolved', 'case.partially_resolved', 'case.failed'].includes(event.type) &&
      'caseId' in event.payload &&
      event.payload.caseId === caseId
  )
}

function makeMixedEventStateForOrdering(seed: number) {
  const state = createStartingState()

  state.rngSeed = seed
  state.rngState = seed
  state.events = []
  state.reports = []
  state.partyCards = undefined
  state.config = {
    ...state.config,
    partialMargin: 10,
  }

  state.agents = {
    'agent-strong': makeAgent('agent-strong', 'Strong Agent', 'hunter', [], {
      baseStats: { combat: 200, investigation: 0, utility: 0, social: 0 },
    }),
    'agent-weak': makeAgent('agent-weak', 'Weak Agent', 'hunter', [], {
      baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }),
  }

  state.teams = {
    'team-strong': {
      id: 'team-strong',
      name: 'Strong Team',
      memberIds: ['agent-strong'],
      agentIds: ['agent-strong'],
      leaderId: 'agent-strong',
      tags: [],
      assignedCaseId: 'case-success',
    },
    'team-weak': {
      id: 'team-weak',
      name: 'Weak Team',
      memberIds: ['agent-weak'],
      agentIds: ['agent-weak'],
      leaderId: 'agent-weak',
      tags: [],
      assignedCaseId: 'case-fail',
    },
  }

  state.cases = {
    'case-success': makeCase('case-success', {
      status: 'in_progress',
      assignedTeamIds: ['team-strong'],
      weeksRemaining: 1,
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }),
    'case-fail': makeCase('case-fail', {
      status: 'in_progress',
      assignedTeamIds: ['team-weak'],
      weeksRemaining: 1,
      stage: 2,
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      difficulty: { combat: 900, investigation: 0, utility: 0, social: 0 },
      onFail: { stageDelta: 1, spawnCount: { min: 1, max: 1 }, spawnTemplateIds: ['chem-001'] },
    }),
    'case-escalate': makeCase('case-escalate', {
      status: 'open',
      assignedTeamIds: [],
      deadlineRemaining: 1,
      onUnresolved: {
        stageDelta: 1,
        deadlineResetWeeks: 3,
        spawnCount: { min: 0, max: 0 },
        spawnTemplateIds: [],
      },
    }),
  }

  return normalizeGameState(state)
}

describe('simulation pipeline invariants', () => {
  it('public domain mutators return normalized team state without external store wrapping', () => {
    const base = createStartingState()
    const created = createTeam(base, 'Archive Wardens', 'a_ava')
    const createdTeam = Object.values(created.teams).find((team) => team.name === 'Archive Wardens')

    expect(createdTeam).toBeDefined()
    expect(createdTeam?.memberIds).toEqual(['a_ava'])
    expect(createdTeam?.agentIds).toEqual(['a_ava'])
    expect(createdTeam?.derivedStats).toBeDefined()
    expect(createdTeam?.status).toMatchObject({
      state: 'ready',
      assignedCaseId: null,
    })
    expect(created.teams['t_nightwatch'].memberIds).not.toContain('a_ava')
    expect(created.teams['t_nightwatch'].derivedStats).toBeDefined()

    const assigned = assignTeam(created, 'case-001', createdTeam!.id)

    expect(assigned.teams[createdTeam!.id].status).toMatchObject({
      state: 'resolving',
      assignedCaseId: 'case-001',
    })
    expect(assigned.teams[createdTeam!.id].derivedStats).toBeDefined()
  })

  it('normalizes dirty state on no-op mutators without relying on the store layer', () => {
    const dirty = makeDirtyTeamState()

    const assignNoop = assignTeam(dirty, 'missing-case', 't_nightwatch')
    const teamManagementNoop = renameTeam(dirty, 'missing-team', 'Archive Wardens')
    const hireNoop = hireCandidate(dirty, 'missing-candidate')
    const trainingNoop = queueTraining(dirty, 'a_ava', 'missing-program')
    const productionNoop = queueFabrication(dirty, 'missing-recipe')
    const weeklyNoop = advanceWeek({ ...dirty, gameOver: true })

    expect(assignNoop).not.toBe(dirty)
    expectCanonicalNightwatch(assignNoop)
    expectCanonicalNightwatch(teamManagementNoop)
    expectCanonicalNightwatch(hireNoop)
    expectCanonicalNightwatch(trainingNoop)
    expectCanonicalNightwatch(productionNoop)
    expectCanonicalNightwatch(weeklyNoop)
  })

  it('normalizes queue and market helper states without external wrappers', () => {
    const dirty = makeDirtyTeamState()

    const trainingResult = advanceTrainingQueues({ ...dirty, trainingQueue: [] })
    const productionResult = advanceProductionQueues({ ...dirty, productionQueue: [] })
    const marketResult = advanceMarketState(dirty, createSeededRng(99).next)

    expectCanonicalNightwatch(trainingResult.state)
    expectCanonicalNightwatch(productionResult.state)
    expectCanonicalNightwatch(marketResult.state)
  })

  it('uses one canonical resolution preview path for odds and selector consumption', () => {
    const game = makeSelectorFixture()

    for (const currentCase of Object.values(game.cases)) {
      for (const team of Object.values(game.teams)) {
        const preview = previewResolutionFromState(currentCase, game, [team.id])

        expect(estimateOddsFromState(currentCase, game, [team.id])).toEqual(preview.odds)
      }
    }

    const assignmentInsights = getCaseAssignmentInsights(game.cases['case-good'], game)
    const goodTeamPreview = previewCaseOutcomeFromState(
      game.teams['team-good'],
      game.cases['case-good'],
      game
    )
    const badTeamPreview = previewCaseOutcomeFromState(
      game.teams['team-bad'],
      game.cases['case-good'],
      game
    )

    expect(assignmentInsights.availableTeams.map(({ team }) => team.id)).toEqual(['team-good'])
    expect(
      assignmentInsights.availableTeams[0] && assignmentInsights.availableTeams[0].odds
    ).toEqual(goodTeamPreview.odds)
    expect(
      assignmentInsights.blockedTeams.some(
        (entry) =>
          entry.team.id === 'team-bad' &&
          entry.reason === badTeamPreview.blockedReason &&
          badTeamPreview.preview?.validation?.missingRoles.length
      )
    ).toBe(true)

    const assignableCaseViews = getTeamAssignableCaseViews(game.teams['team-good'], game, 10)
    const assignableCaseIds = assignableCaseViews.map((view) => view.currentCase.id)

    expect(assignableCaseIds).toEqual(['case-good'])
    expect(assignableCaseViews[0]).toMatchObject({
      success: goodTeamPreview.odds?.success,
      partial: goodTeamPreview.odds?.partial,
      fail: goodTeamPreview.odds?.fail,
    })
    expect(
      previewResolutionFromState(game.cases['case-good'], game, ['team-good']).validation?.valid
    ).toBe(true)
    expect(
      previewResolutionFromState(game.cases['case-bad'], game, ['team-good']).validation?.valid
    ).toBe(false)
  })

  it('keeps selector eligibility and preview results aligned with direct domain resolution', () => {
    const game = makeSelectorFixture()
    const goodTeam = game.teams['team-good']
    const badTeam = game.teams['team-bad']
    const currentCase = game.cases['case-good']

    const goodPreview = previewCaseOutcomeFromState(goodTeam, currentCase, game)
    const badPreview = previewCaseOutcomeFromState(badTeam, currentCase, game)
    const goodOutcome = resolveCase(
      currentCase,
      goodTeam.agentIds.map((agentId) => game.agents[agentId]),
      game.config,
      () => 0.1
    )
    const badOutcome = resolveCase(
      currentCase,
      badTeam.agentIds.map((agentId) => game.agents[agentId]),
      game.config,
      () => 0.1
    )

    expect(goodPreview.blockedReason).toBeUndefined()
    expect(goodPreview.preview?.validation?.valid).toBe(true)
    expect(goodPreview.odds).toMatchObject({ success: 1, partial: 0, fail: 0 })
    expect(goodOutcome.result).toBe('success')

    expect(badPreview.blockedReason).toBe('missing-required-roles')
    expect(badPreview.preview?.validation?.valid).toBe(false)
    expect(badPreview.odds).toMatchObject({ success: 0, partial: 0, fail: 1 })
    expect(badOutcome.result).toBe('fail')
    expect(badOutcome.reasons.some((reason) => reason.includes('Missing required roles:'))).toBe(
      true
    )
  })

  it('keeps weekly report buckets mutually exclusive and aligned with emitted events', () => {
    const state = createStartingState()
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')

    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
      preferredTags: [],
    }
    assigned.cases['case-002'] = {
      ...assigned.cases['case-002'],
      status: 'open',
      assignedTeamIds: [],
      deadlineRemaining: 1,
      onUnresolved: {
        ...assigned.cases['case-002'].onUnresolved,
        spawnCount: { min: 0, max: 0 },
        spawnTemplateIds: [],
      },
    }

    const next = advanceWeek(assigned, 1000)
    const report = next.reports.at(-1)

    expect(report).toBeDefined()

    const buckets = {
      resolved: report!.resolvedCases,
      failed: report!.failedCases,
      partial: report!.partialCases,
      unresolved: report!.unresolvedTriggers,
    }
    const bucketValues = Object.values(buckets)
    const uniqueCaseIds = getUniqueCaseIds(bucketValues)
    const totalBucketEntries = bucketValues.reduce((sum, bucket) => sum + bucket.length, 0)
    const membership = buildBucketMembership(buckets)

    expect(uniqueCaseIds.size).toBe(totalBucketEntries)
    for (const caseIds of bucketValues) {
      expect(new Set(caseIds).size).toBe(caseIds.length)
    }
    for (const bucketNames of membership.values()) {
      expect(bucketNames).toHaveLength(1)
    }

    const resolvedEvents = next.events.filter((event) => event.type === 'case.resolved')
    const failedEvents = next.events.filter((event) => event.type === 'case.failed')
    const partialEvents = next.events.filter((event) => event.type === 'case.partially_resolved')
    const escalatedEvents = next.events.filter((event) => event.type === 'case.escalated')
    const terminalEventCaseIds = [
      ...resolvedEvents,
      ...failedEvents,
      ...partialEvents,
      ...escalatedEvents,
    ].map((event) => event.payload.caseId)

    expect(resolvedEvents.map((event) => event.payload.caseId)).toEqual(report!.resolvedCases)
    expect(failedEvents.map((event) => event.payload.caseId)).toEqual(report!.failedCases)
    expect(partialEvents.map((event) => event.payload.caseId)).toEqual(report!.partialCases)
    expect(escalatedEvents.map((event) => event.payload.caseId)).toEqual(report!.unresolvedTriggers)
    expect(new Set(terminalEventCaseIds).size).toBe(terminalEventCaseIds.length)
  })

  it('emits exactly one terminal event per resolution and keeps event order stable', () => {
    const buildState = () => {
      const base = createStartingState()
      const assigned = assignTeam(
        assignTeam(base, 'case-001', 't_nightwatch'),
        'case-002',
        't_greentape'
      )

      assigned.events = []
      assigned.reports = []
      assigned.cases = {
        'case-001': {
          ...assigned.cases['case-001'],
          status: 'in_progress',
          weeksRemaining: 1,
          difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
          weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
          preferredTags: [],
          onFail: {
            ...assigned.cases['case-001'].onFail,
            spawnCount: { min: 0, max: 0 },
            spawnTemplateIds: [],
          },
        },
        'case-002': {
          ...assigned.cases['case-002'],
          status: 'in_progress',
          weeksRemaining: 1,
          difficulty: { combat: 999, investigation: 999, utility: 999, social: 999 },
          preferredTags: [],
          onFail: {
            ...assigned.cases['case-002'].onFail,
            spawnCount: { min: 0, max: 0 },
            spawnTemplateIds: [],
          },
        },
        'case-003': {
          ...assigned.cases['case-003'],
          status: 'open',
          assignedTeamIds: [],
          deadlineRemaining: 1,
          onUnresolved: {
            ...assigned.cases['case-003'].onUnresolved,
            spawnCount: { min: 0, max: 0 },
            spawnTemplateIds: [],
          },
        },
      }

      return assigned
    }

    const runA = advanceWeek(buildState(), 1000)
    const runB = advanceWeek(buildState(), 1000)
    const terminalEventsA = runA.events
      .filter((event) =>
        ['case.resolved', 'case.failed', 'case.partially_resolved', 'case.escalated'].includes(
          event.type
        )
      )
      .map((event) =>
        'caseId' in event.payload ? `${event.type}:${event.payload.caseId}` : event.type
      )
    const terminalEventsB = runB.events
      .filter((event) =>
        ['case.resolved', 'case.failed', 'case.partially_resolved', 'case.escalated'].includes(
          event.type
        )
      )
      .map((event) =>
        'caseId' in event.payload ? `${event.type}:${event.payload.caseId}` : event.type
      )
    const report = runA.reports.at(-1)

    expect(report).toBeDefined()
    expect(terminalEventsA).toEqual([
      'case.resolved:case-001',
      'case.failed:case-002',
      'case.escalated:case-003',
    ])
    expect(terminalEventsA).toEqual(terminalEventsB)
    expect(new Set(terminalEventsA).size).toBe(terminalEventsA.length)
    expect(terminalEventsA).toHaveLength(
      report!.resolvedCases.length +
        report!.failedCases.length +
        report!.partialCases.length +
        report!.unresolvedTriggers.length
    )
  })

  it('emits exactly one outcome event for each resolved case across success, partial, and fail', () => {
    const scenarios: Array<{
      name: string
      expected: ResolutionExpectation
      setup: Parameters<typeof makeSingleResolutionState>[0]
    }> = [
      {
        name: 'success',
        expected: 'case.resolved',
        setup: {
          caseId: 'case-success-only',
          agentCombat: 250,
          difficultyCombat: 1,
          partialMargin: 15,
          seed: 11,
        },
      },
      {
        name: 'partial',
        expected: 'case.partially_resolved',
        setup: {
          caseId: 'case-partial-only',
          agentCombat: 0,
          difficultyCombat: 150,
          partialMargin: 50_000,
          seed: 22,
        },
      },
      {
        name: 'fail',
        expected: 'case.failed',
        setup: {
          caseId: 'case-fail-only',
          agentCombat: 1,
          difficultyCombat: 2_000,
          partialMargin: 1,
          seed: 33,
        },
      },
    ]

    for (const scenario of scenarios) {
      const next = advanceWeek(makeSingleResolutionState(scenario.setup), 1000)
      const report = next.reports.at(-1)
      const outcomeEvents = getResolutionEventsForCase(next.events, scenario.setup.caseId)

      expect(report, `report missing for ${scenario.name}`).toBeDefined()
      expect(outcomeEvents, `unexpected event count for ${scenario.name}`).toHaveLength(1)
      expect(outcomeEvents[0].type, `unexpected outcome type for ${scenario.name}`).toBe(
        scenario.expected
      )
      expect(outcomeEvents[0].payload.week).toBe(report!.week)
    }
  })

  it('does not emit duplicate event ids or duplicate semantic outcome keys in a tick', () => {
    const next = advanceWeek(makeMixedEventStateForOrdering(777), 1000)
    const allIds = next.events.map((event) => event.id)
    const resolutionEvents = next.events.filter(
      (event) =>
        ['case.resolved', 'case.partially_resolved', 'case.failed'].includes(event.type) &&
        'caseId' in event.payload
    )
    const resolutionKeys = resolutionEvents.map((event) => {
      const payload = event.payload
      return 'caseId' in payload
        ? `${event.type}:${payload.caseId}:${payload.week}`
        : `${event.type}:unknown:${payload.week}`
    })

    expect(new Set(allIds).size).toBe(allIds.length)
    expect(new Set(resolutionKeys).size).toBe(resolutionKeys.length)
  })

  it('keeps case performance summaries aligned across events and report snapshots', () => {
    const next = advanceWeek(
      makeSingleResolutionState({
        caseId: 'case-performance-summary',
        agentCombat: 250,
        difficultyCombat: 1,
        partialMargin: 15,
        seed: 44,
      }),
      1000
    )
    const report = next.reports.at(-1)
    const resolvedEvent = next.events.find(
      (event) =>
        event.type === 'case.resolved' && event.payload.caseId === 'case-performance-summary'
    )
    const resolvedPayload =
      resolvedEvent?.type === 'case.resolved' ? resolvedEvent.payload : undefined

    expect(report).toBeDefined()
    expect(resolvedEvent).toBeDefined()
    expect(report?.caseSnapshots?.['case-performance-summary']?.performanceSummary).toEqual(
      resolvedPayload?.performanceSummary
    )
    expect(report?.caseSnapshots?.['case-performance-summary']?.performanceSummary).toMatchObject({
      contribution: expect.any(Number),
      threatHandled: expect.any(Number),
      damageTaken: expect.any(Number),
      healingPerformed: expect.any(Number),
      evidenceGathered: expect.any(Number),
      containmentActionsCompleted: expect.any(Number),
    })
  })

  it('keeps full event ordering stable for identical seeded runs', () => {
    const nextA = advanceWeek(makeMixedEventStateForOrdering(2026), 1000)
    const nextB = advanceWeek(makeMixedEventStateForOrdering(2026), 1000)
    const project = (events: ReturnType<typeof createStartingState>['events']) =>
      events.map((event) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        caseId: 'caseId' in event.payload ? event.payload.caseId : undefined,
        parentCaseId: 'parentCaseId' in event.payload ? event.payload.parentCaseId : undefined,
      }))

    expect(project(nextA.events)).toEqual(project(nextB.events))
  })

  it('preserves causal ordering: failure before spawned child, agency update before intel report, intel last', () => {
    const next = advanceWeek(makeMixedEventStateForOrdering(404), 1000)

    const failIndex = next.events.findIndex(
      (event) => event.type === 'case.failed' && event.payload.caseId === 'case-fail'
    )
    const spawnedIndex = next.events.findIndex(
      (event) =>
        event.type === 'case.spawned' &&
        event.payload.parentCaseId === 'case-fail' &&
        event.payload.trigger === 'failure'
    )
    const agencyIndex = next.events.findIndex(
      (event) => event.type === 'agency.containment_updated'
    )
    const intelIndex = next.events.findIndex((event) => event.type === 'intel.report_generated')

    expect(failIndex).toBeGreaterThan(-1)
    expect(spawnedIndex).toBeGreaterThan(-1)
    expect(failIndex).toBeLessThan(spawnedIndex)

    expect(agencyIndex).toBeGreaterThan(-1)
    expect(intelIndex).toBeGreaterThan(-1)
    expect(agencyIndex).toBeLessThan(intelIndex)
    expect(intelIndex).toBe(next.events.length - 1)
  })

  it('does not resolve the same case twice across weekly ticks', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const firstAgentId = state.teams['t_nightwatch'].agentIds[0]

    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
      preferredTags: [],
    }

    const afterWeekOne = advanceWeek(state, 1000)
    const firstReport = afterWeekOne.reports.at(-1)
    const priorEventCount = afterWeekOne.events.length
    const resolvedCountAfterWeekOne = afterWeekOne.events.filter(
      (event) => event.type === 'case.resolved' && event.payload.caseId === 'case-001'
    ).length
    const countersAfterWeekOne = firstAgentId
      ? {
          casesResolved: afterWeekOne.agents[firstAgentId]?.history?.counters.casesResolved,
          assignmentsCompleted:
            afterWeekOne.agents[firstAgentId]?.history?.counters.assignmentsCompleted,
        }
      : undefined

    expect(firstReport?.resolvedCases).toEqual(['case-001'])
    expect(afterWeekOne.cases['case-001'].status).toBe('resolved')

    const afterWeekTwo = advanceWeek(afterWeekOne, 1001)
    const secondReport = afterWeekTwo.reports.at(-1)
    const weekTwoEvents = afterWeekTwo.events.slice(priorEventCount)
    const resolvedCountAfterWeekTwo = afterWeekTwo.events.filter(
      (event) => event.type === 'case.resolved' && event.payload.caseId === 'case-001'
    ).length

    expect(secondReport?.resolvedCases).not.toContain('case-001')
    expect(
      weekTwoEvents.some(
        (event) => event.type === 'case.resolved' && event.payload.caseId === 'case-001'
      )
    ).toBe(false)
    expect(afterWeekTwo.cases['case-001'].status).toBe('resolved')
    expect(resolvedCountAfterWeekOne).toBe(1)
    expect(resolvedCountAfterWeekTwo).toBe(1)
    if (firstAgentId) {
      expect(afterWeekTwo.agents[firstAgentId]?.history?.counters.casesResolved).toBe(
        countersAfterWeekOne?.casesResolved
      )
      expect(afterWeekTwo.agents[firstAgentId]?.history?.counters.assignmentsCompleted).toBe(
        countersAfterWeekOne?.assignmentsCompleted
      )
    }
  })

  it('does not process newly spawned cases in the same tick', () => {
    const state = assignTeam(createStartingState(), 'case-003', 't_nightwatch')

    state.cases['case-003'] = {
      ...state.cases['case-003'],
      status: 'in_progress',
      weeksRemaining: 1,
      stage: 2,
      difficulty: { combat: 999, investigation: 999, utility: 999, social: 999 },
      onFail: {
        ...state.cases['case-003'].onFail,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['chem-001'],
      },
    }

    const next = advanceWeek(state, 1000)
    const report = next.reports.at(-1)

    expect(report).toBeDefined()
    expect(report!.spawnedCases.length).toBeGreaterThan(0)
    const resolvedEventCaseIds = next.events
      .filter((event) => event.type === 'case.resolved')
      .map((event) => event.payload.caseId)

    for (const spawnedCaseId of report!.spawnedCases) {
      expect(report!.resolvedCases).not.toContain(spawnedCaseId)
      expect(report!.failedCases).not.toContain(spawnedCaseId)
      expect(report!.partialCases).not.toContain(spawnedCaseId)
      expect(report!.unresolvedTriggers).not.toContain(spawnedCaseId)
      expect(report!.progressedCases).not.toContain(spawnedCaseId)
      expect(
        next.events.some(
          (event) =>
            ['case.resolved', 'case.failed', 'case.partially_resolved', 'case.escalated'].includes(
              event.type
            ) &&
            'caseId' in event.payload &&
            event.payload.caseId === spawnedCaseId
        )
      ).toBe(false)
      expect(resolvedEventCaseIds).not.toContain(spawnedCaseId)
      expect(next.cases[spawnedCaseId]?.status).toBe('open')
      expect(next.cases[spawnedCaseId]?.assignedTeamIds).toEqual([])
    }
  })

  it('keeps helper-level raid and spawn paths deterministic with injected seeded rng', () => {
    const spawnState = createStartingState()
    spawnState.cases['case-001'] = {
      ...spawnState.cases['case-001'],
      onFail: {
        ...spawnState.cases['case-001'].onFail,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['chem-001'],
      },
    }

    expect(spawnFromFailures(spawnState, ['case-001'], createSeededRng(17).next)).toEqual(
      spawnFromFailures(spawnState, ['case-001'], createSeededRng(17).next)
    )

    const pressureState = createStartingState()
    pressureState.cases = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => {
        const caseId = `pressure-${index + 1}`

        return [
          caseId,
          {
            ...pressureState.cases['case-001'],
            id: caseId,
            templateId: `template-${index + 1}`,
            title: `Pressure ${index + 1}`,
            status: 'open' as const,
            stage: 3,
            assignedTeamIds: [],
          },
        ]
      })
    )

    expect(applyRaids(pressureState, undefined, createSeededRng(29).next)).toEqual(
      applyRaids(pressureState, undefined, createSeededRng(29).next)
    )
  })
})

describe('stale derived fields', () => {
  it('stale derivedStats in input are overwritten by moveAgentBetweenTeams output', () => {
    const dirty = createStartingState()
    dirty.teams['t_nightwatch'] = {
      ...dirty.teams['t_nightwatch'],
      derivedStats: {
        overall: 0,
        fieldPower: 0,
        containment: 0,
        investigation: 0,
        support: 0,
        cohesion: 0,
        chemistryScore: 0,
        readiness: 0,
      },
    }

    const next = moveAgentBetweenTeams(dirty, 'a_ava', null)

    expect(next.teams['t_nightwatch'].derivedStats!.overall).toBeGreaterThan(0)
    expect(next.teams['t_nightwatch'].derivedStats).toEqual(
      normalizeGameState(next).teams['t_nightwatch'].derivedStats
    )
  })

  it('normalizeGameState is idempotent — second pass equals first', () => {
    const step1 = normalizeGameState(createStartingState())
    const step2 = normalizeGameState(step1)

    expect(step2.teams).toEqual(step1.teams)
  })

  it('normalizeGameState prunes stale case team ids and clears dangling team case pointers', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      assignedTeamIds: ['t_nightwatch', 'missing-team'],
    }
    state.teams['t_greentape'] = {
      ...state.teams['t_greentape'],
      assignedCaseId: 'missing-case',
    }

    const next = normalizeGameState(state)

    expect(next.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(next.teams['t_greentape'].assignedCaseId).toBeUndefined()
    expect(next.teams['t_greentape'].status?.assignedCaseId ?? null).toBeNull()
  })

  it('every team-mutating domain mutator emits already-normalized team state', () => {
    const base = createStartingState()
    const cases: Array<[string, ReturnType<typeof createStartingState>]> = [
      ['assignTeam', assignTeam(base, 'case-001', 't_nightwatch')],
      ['createTeam', createTeam(base, 'New Squad', 'a_ava')],
      ['moveAgentBetweenTeams', moveAgentBetweenTeams(base, 'a_ava', null)],
      ['renameTeam', renameTeam(base, 't_nightwatch', 'Renamed Squad')],
      ['advanceWeek', advanceWeek(base)],
    ]

    for (const [name, result] of cases) {
      expect(normalizeGameState(result).teams, `mutator: ${name}`).toEqual(result.teams)
    }
  })
})
