import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildDerivedMajorIncidentRuntime,
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
