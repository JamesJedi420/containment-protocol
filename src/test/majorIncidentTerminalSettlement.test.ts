import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import type { GameState } from '../domain/models'
import { MissionResultSummary, ReportCaseGroup } from '../features/report/reportDetailHelpers'
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildDerivedMajorIncidentRuntime,
  evaluateMajorIncidentPlan,
  buildPlannedMajorIncidentRuntime,
  getAppliedMajorIncidentRewardPreview,
} from '../domain/majorIncidentOperations'
import {
  isValidMajorIncidentSettlementReceipt,
  rememberMajorIncidentSettlementReceipt,
  settleMajorIncidentTerminal,
} from '../domain/majorIncidentTerminalSettlement'
import { launchMajorIncident } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'

function buildOperationalMajorIncidentCase() {
  const state = createStartingState()
  const currentCase = {
    ...state.cases['case-003'],
    kind: 'raid' as const,
    stage: 4,
    deadlineRemaining: 0,
    raid: { minTeams: 2, maxTeams: 4 },
    requiredTags: [] as string[],
    requiredRoles: [],
    assignedTeamIds: [] as string[],
  }
  const runtime = buildDerivedMajorIncidentRuntime(currentCase, state)
  expect(runtime).not.toBeNull()
  return {
    state,
    currentCase: {
      ...currentCase,
      majorIncident: runtime!,
    },
  }
}

describe('SPE-3076 major-incident terminal settlement', () => {
  it('settles once from final outcome and ignores stale reward preview mutation', () => {
    const { currentCase } = buildOperationalMajorIncidentCase()
    const first = settleMajorIncidentTerminal({
      currentCase,
      outcome: { result: 'success', reasons: ['Final window success'] },
      week: 12,
    })
    expect(first.kind).toBe('settled')
    if (first.kind !== 'settled') return

    expect(first.receipt.finalOutcome).toBe('success')
    expect(first.receipt.settlementReason).toContain('Final window')

    const mutated = {
      ...currentCase,
      majorIncident: {
        ...currentCase.majorIncident!,
        rewards: {
          materials: [{ itemId: 'stale-loot', label: 'Stale loot', quantity: 99 }],
          gear: [],
          progressionUnlocks: ['should-not-appear'],
        },
      },
    }
    const map = rememberMajorIncidentSettlementReceipt(undefined, first.receipt)
    const replay = settleMajorIncidentTerminal({
      currentCase: mutated,
      outcome: { result: 'success', reasons: ['Final window success'] },
      week: 12,
      existingReceipts: map,
    })
    expect(replay.kind).toBe('idempotent_replay')
    if (replay.kind !== 'idempotent_replay') return
    expect(replay.receipt).toEqual(first.receipt)
    expect(replay.receipt.rewardEligibility).toEqual(first.receipt.rewardEligibility)
    expect(getAppliedMajorIncidentRewardPreview(mutated.majorIncident!, 'success').progressionUnlocks).toEqual([
      'should-not-appear',
    ])
    expect(replay.receipt.rewardEligibility.progressionUnlocks).not.toContain('should-not-appear')
  })

  it('rejects conflicting duplicate terminalization', () => {
    const { currentCase } = buildOperationalMajorIncidentCase()
    const first = settleMajorIncidentTerminal({
      currentCase,
      outcome: { result: 'success', reasons: ['ok'] },
      week: 3,
    })
    expect(first.kind).toBe('settled')
    if (first.kind !== 'settled') return

    const conflict = settleMajorIncidentTerminal({
      currentCase,
      outcome: { result: 'fail', reasons: ['later fail'] },
      week: 3,
      existingReceipts: rememberMajorIncidentSettlementReceipt(undefined, first.receipt),
    })
    expect(conflict.kind).toBe('rejected')
    if (conflict.kind !== 'rejected') return
    expect(conflict.reasonCode).toBe('receipt_conflict')
  })

  it('does not treat civilian-style success wording as automatic threat neutralization', () => {
    const { currentCase } = buildOperationalMajorIncidentCase()
    const settled = settleMajorIncidentTerminal({
      currentCase,
      outcome: {
        result: 'partial',
        reasons: ['Civilians extracted; active threat persists'],
      },
      week: 8,
    })
    expect(settled.kind).toBe('settled')
    if (settled.kind !== 'settled') return
    expect(settled.receipt.finalOutcome).toBe('partial')
    expect(settled.receipt.reportableOutcome.outcome).toBe('partial')
    expect(settled.receipt.reportableOutcome.summary).not.toMatch(/neutraliz|contain/i)
  })

  it('records authoritative case stage in the settlement receipt', () => {
    const { currentCase } = buildOperationalMajorIncidentCase()
    expect(currentCase.stage).toBe(4)
    expect(currentCase.majorIncident?.stage).toBeUndefined()
    const settled = settleMajorIncidentTerminal({
      currentCase,
      outcome: { result: 'success', reasons: ['stage capture'] },
      week: 2,
    })
    expect(settled.kind).toBe('settled')
    if (settled.kind !== 'settled') return
    expect(settled.receipt.terminalObjectiveState.stage).toBe(4)
  })

  it('rejects incomplete hydrated receipts missing reportableOutcome', () => {
    expect(
      isValidMajorIncidentSettlementReceipt({
        schemaVersion: 'spe-3076.v1',
        receiptId: 'mi-settle:x:y',
        caseId: 'x',
        incidentId: 'y',
        finalOutcome: 'success',
        settledAtWeek: 1,
      }),
    ).toBe(false)
  })

  it('clears prior settlement receipt when planning a relaunch attempt', () => {
    const { state, currentCase } = buildOperationalMajorIncidentCase()
    const first = settleMajorIncidentTerminal({
      currentCase,
      outcome: { result: 'fail', reasons: ['first attempt'] },
      week: 4,
    })
    expect(first.kind).toBe('settled')
    if (first.kind !== 'settled') return
    const withReceipt = {
      ...currentCase,
      majorIncident: {
        ...currentCase.majorIncident!,
        settlementReceiptId: first.receipt.receiptId,
        settlementReceipt: first.receipt,
      },
    }
    const planned = buildPlannedMajorIncidentRuntime(withReceipt, state, {
      strategy: 'balanced',
      provisions: [],
    })
    expect(planned).not.toBeNull()
    expect(planned?.settlementReceipt).toBeUndefined()
    expect(planned?.settlementReceiptId).toBeUndefined()
  })

  it('replays from the persisted runtime receipt without regenerating', () => {
    const { currentCase } = buildOperationalMajorIncidentCase()
    const first = settleMajorIncidentTerminal({
      currentCase,
      outcome: { result: 'fail', reasons: ['attempt failed'] },
      week: 5,
    })
    expect(first.kind).toBe('settled')
    if (first.kind !== 'settled') return
    const stamped = {
      ...currentCase,
      majorIncident: {
        ...currentCase.majorIncident!,
        settlementReceiptId: first.receipt.receiptId,
        settlementReceipt: first.receipt,
      },
    }
    const replay = settleMajorIncidentTerminal({
      currentCase: stamped,
      outcome: { result: 'fail', reasons: ['attempt failed'] },
      week: 5,
      existingReceipts: { [first.receipt.receiptId]: first.receipt },
    })
    expect(replay.kind).toBe('idempotent_replay')
    if (replay.kind !== 'idempotent_replay') return
    expect(replay.receipt).toBe(first.receipt)
  })

  it('advanceWeek stamps exactly-once settlement on operational major incidents', () => {
    const state = createStartingState()
    state.rngSeed = 42
    state.rngState = 42
    const baseAgent = state.agents.a_ava

    state.agents['agent-alpha'] = {
      ...baseAgent,
      id: 'agent-alpha',
      name: 'Alpha',
      role: 'hunter',
      baseStats: { combat: 90, investigation: 80, utility: 74, social: 50 },
      fatigue: 5,
      status: 'active',
    }
    state.agents['agent-bravo'] = {
      ...baseAgent,
      id: 'agent-bravo',
      name: 'Bravo',
      role: 'tech',
      baseStats: { combat: 72, investigation: 86, utility: 92, social: 46 },
      fatigue: 7,
      status: 'active',
    }
    state.agents['agent-charlie'] = {
      ...baseAgent,
      id: 'agent-charlie',
      name: 'Charlie',
      role: 'field_recon',
      baseStats: { combat: 74, investigation: 88, utility: 90, social: 54 },
      fatigue: 9,
      status: 'active',
    }
    state.teams['team-alpha'] = {
      id: 'team-alpha',
      name: 'Alpha Team',
      agentIds: ['agent-alpha'],
      memberIds: ['agent-alpha'],
      leaderId: 'agent-alpha',
      tags: ['field'],
    }
    state.teams['team-bravo'] = {
      id: 'team-bravo',
      name: 'Bravo Team',
      agentIds: ['agent-bravo'],
      memberIds: ['agent-bravo'],
      leaderId: 'agent-bravo',
      tags: ['tech'],
    }
    state.teams['team-charlie'] = {
      id: 'team-charlie',
      name: 'Charlie Team',
      agentIds: ['agent-charlie'],
      memberIds: ['agent-charlie'],
      leaderId: 'agent-charlie',
      tags: ['recon'],
    }

    state.cases['major-incident'] = {
      ...state.cases['case-003'],
      id: 'major-incident',
      title: 'City Fracture',
      kind: 'raid',
      stage: 3,
      deadlineRemaining: 1,
      durationWeeks: 4,
      requiredTags: [],
      requiredRoles: [],
      raid: { minTeams: 2, maxTeams: 4 },
      assignedTeamIds: [],
    }

    let next = launchMajorIncident(
      state,
      'major-incident',
      ['team-alpha', 'team-bravo', 'team-charlie'],
      'balanced',
      [],
    )
    expect(next.cases['major-incident']?.status).toBe('in_progress')
    expect(next.cases['major-incident']?.majorIncident).toBeDefined()

    next = {
      ...next,
      cases: {
        ...next.cases,
        'major-incident': {
          ...next.cases['major-incident']!,
          weeksRemaining: 1,
        },
      },
    }

    const after = advanceWeek(next)
    const settledCase = after.cases['major-incident']
    expect(settledCase?.status).toBe('resolved')
    const runtime = settledCase?.majorIncident
    expect(runtime?.settlementReceiptId).toBeTypeOf('string')
    expect(runtime?.settlementReceipt).toBeDefined()

    const receipt = runtime!.settlementReceipt as {
      receiptId: string
      finalOutcome: string
    }
    expect(['success', 'partial', 'fail']).toContain(receipt.finalOutcome)
    expect(runtime?.settlementReceiptId).toBe(receipt.receiptId)
  })
})

function makeSettlementReportBaseState(): GameState {
  const state = createStartingState()
  return {
    ...state,
    rngSeed: 42,
    rngState: 42,
    agents: {},
    teams: {},
    cases: {},
    templates: {},
    inventory: {},
    knowledge: {},
    agency: { ...state.agency!, supportAvailable: 10 },
    // Keep the scenario's difficulty and payout scale explicit.
    config: {
      ...state.config,
      stageScalar: 1,
      fundingPerResolution: 10,
      containmentDeltaPerResolution: 1,
    },
  }
}

function buildSettlementReportFixture(activeCount: number): GameState {
  const state = makeSettlementReportBaseState()
  const baseAgent = createStartingState().agents.a_ava
  for (let i = 0; i <= activeCount + 4; i++) {
    const agentId = `a${i}`
    state.agents[agentId] = {
      ...baseAgent,
      id: agentId,
      name: `Agent ${i}`,
      baseStats: { combat: 100, investigation: 100, utility: 100, social: 100 },
      fatigue: 0,
      status: 'active',
    }
    state.teams[`t${i}`] = {
      id: `t${i}`,
      name: `Team ${i}`,
      agentIds: [agentId],
      memberIds: [agentId],
      leaderId: agentId,
      tags: [],
    }
  }
  for (let i = 0; i < activeCount; i++) {
    const id = `c${i}`
    state.cases[id] = {
      id,
      templateId: `template-${i}`,
      title: i === 0 ? 'Report Settlement Incident' : `Case ${i}`,
      description: '',
      mode: 'deterministic',
      kind: i === 0 ? 'raid' : 'case',
      status: i === 0 ? 'open' : 'in_progress',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      requiredRoles: [],
      stage: i === 0 ? 3 : 1,
      durationWeeks: 1,
      deadlineWeeks: 5,
      deadlineRemaining: 5,
      assignedTeamIds: i === 0 ? [] : [`t${i + 4}`],
      onPartial: { stageDelta: 0 },
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      ...(i === 0 ? { raid: { minTeams: 2, maxTeams: 4 } } : {}),
    }
  }
  const runtime = buildDerivedMajorIncidentRuntime(state.cases.c0, state)!
  expect(runtime).not.toBeNull()
  const teamIds = Array.from({ length: runtime.requiredTeams }, (_, i) => 't' + i)
  const plan = evaluateMajorIncidentPlan(state, state.cases.c0, teamIds, {
    strategy: 'balanced',
    provisions: [],
  })
  expect(plan?.valid, JSON.stringify(plan)).toBe(true)
  const launched = launchMajorIncident(state, 'c0', teamIds, 'balanced', [])
  expect(launched.cases.c0.status).toBe('in_progress')
  expect(launched.cases.c0.majorIncident).toBeDefined()
  // Construct the last resolution window; actual launch, resolution, resettlement,
  // report building and report consumer remain production implementations.
  launched.cases.c0 = { ...launched.cases.c0, weeksRemaining: 1 }
  return launched
}

function observeSettlementReport(activeCount: number) {
  const source = buildSettlementReportFixture(activeCount)
  const after = advanceWeek(source, 0)
  const report = after.reports.at(-1)!
  const mission = report.caseSnapshots!.c0.missionResult!
  const receipt = after.cases.c0.majorIncident!.settlementReceipt!
  if (!isValidMajorIncidentSettlementReceipt(receipt)) {
    throw new Error('Expected a valid terminal settlement receipt')
  }
  const html = renderToStaticMarkup(createElement(MissionResultSummary, { missionResult: mission }))
  return { source, after, report, mission, receipt, html }
}

describe('SPE-3076 final settlement report handoff', () => {
  it.each([
    { activeCount: 4, outcome: 'success', rewards: 'Funding +30, containment +5, reputation +18.' },
    { activeCount: 5, outcome: 'partial', rewards: 'Funding +14, containment +2, reputation +7.' },
  ] as const)(
    'reports the final $outcome receipt with $activeCount concurrent operations',
    ({ activeCount, outcome, rewards }) => {
      const { after, report, mission, receipt, html } = observeSettlementReport(activeCount)
      expect(after.coordinationFrictionActive).toBe(activeCount === 5)
      expect(receipt.finalOutcome).toBe(outcome)
      expect(receipt.reportableOutcome.outcome).toBe(outcome)
      expect(mission.outcome).toBe(outcome)
      expect(outcome === 'partial' ? report.partialCases : report.resolvedCases).toContain('c0')
      expect(outcome === 'partial' ? report.resolvedCases : report.partialCases).not.toContain('c0')
      expect(
        mission.explanationNotes.filter((note) =>
          note.startsWith('Major-incident terminal settlement: ')
        )
      ).toEqual([
        `Major-incident terminal settlement: ${receipt.reportableOutcome.summary} (${receipt.receiptId})`,
      ])
      expect(mission.explanationNotes).toContain('Weakest-link outcome: clean_success')
      expect(mission.explanationNotes.some((note) => note.startsWith('Aggregate battle: '))).toBe(
        true
      )
      expect(
        mission.explanationNotes.some((note) => note.startsWith('Durable contacts marked: '))
      ).toBe(true)
      expect(
        mission.explanationNotes.filter((note) => note.startsWith('Funding '))
      ).toEqual([rewards])
      expect(
        mission.explanationNotes.some((note) => note.includes('Command-coordination friction'))
      ).toBe(activeCount === 5)
      expect(html).toContain(receipt.reportableOutcome.summary)
      expect(html).not.toContain(
        outcome === 'partial' ? 'settled as success' : 'settled as partial'
      )
    }
  )

  it.each([4, 5])(
    'preserves the final report through replay, save/load and valid relaunch with %i operations',
    (activeCount) => {
      const { source, after, report, mission, receipt } = observeSettlementReport(activeCount)
      const replay = advanceWeek(source, 0)
      expect(replay.reports.at(-1)!.caseSnapshots!.c0.missionResult).toEqual(mission)
      expect(replay.cases.c0.majorIncident!.settlementReceipt).toEqual(receipt)
      const loaded = loadGameSave(serializeGameSave(after))
      const savedReport = loaded.reports.find((item) => item.week === report.week)!
      expect(savedReport.caseSnapshots!.c0.missionResult).toMatchObject({
        caseId: mission.caseId,
        outcome: mission.outcome,
        explanationNotes: mission.explanationNotes,
      })
      expect(loaded.cases.c0.majorIncident!.settlementReceipt).toEqual(receipt)
      // Only partial outcomes remain open and can be relaunched through the normal command.
      const current =
        activeCount === 5
          ? launchMajorIncident(loaded, 'c0', source.cases.c0.assignedTeamIds, 'balanced', [])
          : loaded
      if (activeCount === 5) {
        expect(current.cases.c0.status).toBe('in_progress')
        expect(current.cases.c0.majorIncident!.settlementReceipt).toBeUndefined()
      }
      const historical = current.reports.find((item) => item.week === report.week)!
      expect(historical.caseSnapshots!.c0.missionResult).toEqual(
        savedReport.caseSnapshots!.c0.missionResult
      )
      const groupHtml = renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(ReportCaseGroup, {
            title: 'Settled cases',
            emptyLabel: 'None',
            caseIds: activeCount === 5 ? historical.partialCases : historical.resolvedCases,
            existingCaseIds: new Set(Object.keys(current.cases)),
            currentCases: current.cases,
            snapshots: historical.caseSnapshots,
          })
        )
      )
      expect(groupHtml).toContain(receipt.reportableOutcome.summary)
      expect(groupHtml).not.toContain(
        activeCount === 5 ? 'settled as success' : 'settled as partial'
      )
    }
  )
})
