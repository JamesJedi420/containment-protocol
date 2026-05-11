/**
 * SPE-1496: targeted coverage for the bounded post-contract debrief flow.
 *
 * Validates three legs of the slice in isolation:
 *   1. Deterministic debrief record generation from a `WeeklyReportCaseSnapshot`.
 *   2. Bounded next-intent capture round-trips through pure state helpers.
 *   3. Next-intent ordering bias deterministically nudges later contract offers
 *      without overriding unlock conditions.
 */
import { describe, expect, it } from 'vitest'
import '../test/setup'

import { createStartingState } from '../data/startingState'
import {
  buildContractDebriefRecord,
  clearContractNextIntent,
  getContractNextIntent,
  getContractNextIntentLabel,
  getContractNextIntentValues,
  getContractOffers,
  getNextIntentSelectionBias,
  getRecentContractDebriefRecords,
  refreshContractBoard,
  sanitizeContractSystemState,
  setContractNextIntent,
} from '../domain/contracts'
import type {
  ActiveContractRuntime,
  CaseInstance,
  MissionResult,
  WeeklyReport,
  WeeklyReportCaseSnapshot,
} from '../domain/models'

function buildSnapshot(): WeeklyReportCaseSnapshot {
  const missionResult: MissionResult = {
    caseId: 'case-debrief',
    caseTitle: 'Vault Sweep',
    teamsUsed: [{ teamId: 't_nightwatch' }],
    outcome: 'partial',
    hiddenState: 'revealed',
    route: 'transition',
    weakestLink: {
      caseId: 'case-debrief',
      resultKind: 'partial',
      outcomeCategory: 'mixed_resolution',
      recoveryPressureBand: 'elevated',
      contributors: [],
      details: [],
      expectedRecoveryWeeksDelta: 1,
    } as unknown as MissionResult['weakestLink'],
    performanceSummary: {} as MissionResult['performanceSummary'],
    rewards: {
      outcome: 'partial',
      caseType: 'sweep',
      caseTypeLabel: 'Sweep',
      operationValue: 0,
      factors: [],
      fundingDelta: 0,
      containmentDelta: 0,
      strategicValueDelta: 0,
      reputationDelta: 0,
      inventoryRewards: [
        {
          kind: 'material',
          itemId: 'shard-fragment',
          label: 'Shard Fragment',
          quantity: 2,
          tags: [],
        },
      ],
      factionStanding: [
        { factionId: 'oversight', label: 'Oversight Bureau', delta: 2, overlapTags: [] },
      ],
      label: 'Vault Sweep',
      reasons: [],
    },
    penalties: { fundingLoss: 0, containmentLoss: 0, reputationLoss: 0, strategicLoss: 0 },
    fatigueChanges: [
      {
        teamId: 't_nightwatch',
        teamName: 'Nightwatch',
        before: 1,
        after: 6,
        delta: 5,
        stressModifier: 0,
      },
    ],
    injuries: [{ agentId: 'a_ava', agentName: 'Ava', severity: 'moderate', damage: 3 }],
    fatalities: [],
    spawnedConsequences: [
      {
        type: 'queued_follow_up',
        caseId: 'case-followup',
        detail: 'Faction lead surfaced for follow-up.',
      },
    ],
    explanationNotes: [],
  }

  const snapshot = {
    caseId: 'case-debrief',
    title: 'Vault Sweep',
    kind: 'standard',
    mode: 'deterministic',
    status: 'completed',
    stage: 1,
    deadlineRemaining: 0,
    durationWeeks: 1,
    assignedTeamIds: ['t_nightwatch'],
    missionResult,
    contract: {
      templateId: 'oversight-lockdown-retainer',
      factionId: 'oversight',
    } satisfies ActiveContractRuntime,
  } as unknown as WeeklyReportCaseSnapshot
  return snapshot
}

describe('SPE-1496 contract debrief record', () => {
  it('builds a deterministic record capturing changed entities and unresolved clocks', () => {
    const snapshot = buildSnapshot()

    const first = buildContractDebriefRecord(snapshot, 5)
    const second = buildContractDebriefRecord(snapshot, 5)

    expect(first).not.toBeNull()
    expect(second).toEqual(first)

    expect(first!.caseId).toBe('case-debrief')
    expect(first!.contractTemplateId).toBe('oversight-lockdown-retainer')
    expect(first!.factionId).toBe('oversight')
    expect(first!.outcome).toBe('partial')
    expect(first!.week).toBe(5)

    // Subject + injury + fatigue + faction shift + evidence + route should all surface.
    const kinds = new Set(first!.changedEntities.map((entity) => entity.kind))
    expect(kinds.has('subject')).toBe(true)
    expect(kinds.has('staff')).toBe(true)
    expect(kinds.has('faction')).toBe(true)
    expect(kinds.has('evidence')).toBe(true)
    expect(kinds.has('route')).toBe(true)

    // Unresolved clocks: recovery pressure + spawned follow-up consequence.
    expect(first!.unresolvedClocks.map((clock) => clock.id).sort()).toEqual(
      ['consequence:case-followup', 'recovery:case-debrief'].sort()
    )

    // Strategic options are bounded subset of ContractNextIntent.
    const intentSet = new Set(getContractNextIntentValues())
    for (const option of first!.strategicOptions) {
      expect(intentSet.has(option.intent)).toBe(true)
      expect(option.label).toBe(getContractNextIntentLabel(option.intent))
    }

    // Each suggested intent appears at most once.
    const intents = first!.strategicOptions.map((option) => option.intent)
    expect(new Set(intents).size).toBe(intents.length)
  })

  it('returns null when the snapshot has no completed mission result', () => {
    const snapshot = {
      caseId: 'case-blank',
      title: 'Empty',
      kind: 'standard',
      mode: 'deterministic',
      status: 'in_progress',
      stage: 1,
      deadlineRemaining: 0,
      durationWeeks: 1,
      assignedTeamIds: [],
    } as unknown as WeeklyReportCaseSnapshot

    expect(buildContractDebriefRecord(snapshot, 1)).toBeNull()
  })

  it('falls back to the case instance contract runtime when the snapshot lacks one', () => {
    const snapshot = buildSnapshot()
    // Strip the snapshot-side contract to force the case-instance fallback.
    delete (snapshot as { contract?: unknown }).contract

    const caseInstance = {
      id: 'case-debrief',
      contract: { templateId: 'institutions-ritual-archive', factionId: 'institutions' },
    } as unknown as CaseInstance

    const record = buildContractDebriefRecord(snapshot, 7, caseInstance)
    expect(record).not.toBeNull()
    expect(record!.contractTemplateId).toBe('institutions-ritual-archive')
    expect(record!.factionId).toBe('institutions')
  })

  it('SPE-1496 (PR #1621 review fix): empty case-instance contract does not block a valid snapshot contract', () => {
    const snapshot = buildSnapshot()
    // The case-instance contract object exists but carries no templateId,
    // which used to short-circuit the snapshot fallback. After the fix it
    // should merge per-field and still resolve to the snapshot's templateId.
    const caseInstance = {
      id: 'case-debrief',
      contract: {},
    } as unknown as CaseInstance

    const record = buildContractDebriefRecord(snapshot, 9, caseInstance)
    expect(record).not.toBeNull()
    expect(record!.contractTemplateId).toBe('oversight-lockdown-retainer')
    expect(record!.factionId).toBe('oversight')
  })

  it('SPE-1496 (PR #1621 review fix): per-field merge prefers case-instance fields when present', () => {
    const snapshot = buildSnapshot()
    // Snapshot side has both templateId + factionId. The case-instance side
    // only supplies a templateId — factionId must still fall back to snapshot.
    const caseInstance = {
      id: 'case-debrief',
      contract: { templateId: 'institutions-ritual-archive' },
    } as unknown as CaseInstance

    const record = buildContractDebriefRecord(snapshot, 9, caseInstance)
    expect(record).not.toBeNull()
    expect(record!.contractTemplateId).toBe('institutions-ritual-archive')
    expect(record!.factionId).toBe('oversight')
  })

  it('SPE-1496 (PR #1621 review fix): infers pursue-faction from numeric standing delta, not detail text', () => {
    const snapshot = buildSnapshot()
    const record = buildContractDebriefRecord(snapshot, 11)
    expect(record).not.toBeNull()
    // The base snapshot has a faction standing delta of +2 for the bound
    // faction. The pursue-faction option must surface based on the structured
    // numeric delta, not because the changed-entity detail string contains '+'.
    const intents = record!.strategicOptions.map((option) => option.intent)
    expect(intents).toContain('pursue-faction')
  })

  it('SPE-1496 (PR #1621 review fix): no pursue-faction when all faction-standing deltas are non-positive', () => {
    const base = buildSnapshot()
    const negativeStanding = {
      ...base,
      missionResult: {
        ...base.missionResult!,
        rewards: {
          ...base.missionResult!.rewards,
          factionStanding: [
            {
              factionId: 'oversight',
              label: 'Oversight Bureau',
              delta: -3,
              overlapTags: [],
            },
          ],
        },
      },
    } as unknown as WeeklyReportCaseSnapshot

    const record = buildContractDebriefRecord(negativeStanding, 11)
    expect(record).not.toBeNull()
    const intents = record!.strategicOptions.map((option) => option.intent)
    expect(intents).not.toContain('pursue-faction')
  })

  it('reads the latest weekly report and emits debrief records', () => {
    const baseSnapshot = buildSnapshot()
    const secondSnapshot = {
      ...baseSnapshot,
      caseId: 'aaa-case',
      title: 'Aaa Case',
    } as WeeklyReportCaseSnapshot
    Object.defineProperty(secondSnapshot, 'caseId', { value: 'aaa-case', enumerable: true })

    const report: WeeklyReport = {
      week: 12,
      summary: '',
      events: [],
      caseSnapshots: {
        [baseSnapshot.caseId]: baseSnapshot,
        [secondSnapshot.caseId]: secondSnapshot,
      },
    } as unknown as WeeklyReport

    const state = {
      reports: [report],
      cases: {},
    }

    const records = getRecentContractDebriefRecords(state)
    // Both snapshots share the same `partial` outcome, so urgency-ranked
    // ordering falls through to the caseId tiebreak.
    expect(records.length).toBe(2)
    expect(records[0]!.caseId).toBe('aaa-case')
    expect(records[1]!.caseId).toBe('case-debrief')
  })

  it('SPE-1496 (PR #1621 review fix): ranks records by urgency so fail/unresolved lead success', () => {
    const partial = buildSnapshot()
    const fail = {
      ...buildSnapshot(),
      caseId: 'zzz-fail',
      title: 'Zeta Failure',
      missionResult: {
        ...buildSnapshot().missionResult!,
        caseId: 'zzz-fail',
        outcome: 'fail' as const,
      },
    } as unknown as WeeklyReportCaseSnapshot
    Object.defineProperty(fail, 'caseId', { value: 'zzz-fail', enumerable: true })
    const success = {
      ...buildSnapshot(),
      caseId: 'aaa-success',
      title: 'Alpha Win',
      missionResult: {
        ...buildSnapshot().missionResult!,
        caseId: 'aaa-success',
        outcome: 'success' as const,
        // No unresolved consequences for the success record so its rank stays
        // last on the urgency axis.
        spawnedConsequences: [],
        weakestLink: undefined,
      },
    } as unknown as WeeklyReportCaseSnapshot
    Object.defineProperty(success, 'caseId', { value: 'aaa-success', enumerable: true })

    const report: WeeklyReport = {
      week: 14,
      summary: '',
      events: [],
      caseSnapshots: {
        [partial.caseId]: partial,
        [fail.caseId]: fail,
        [success.caseId]: success,
      },
    } as unknown as WeeklyReport

    const records = getRecentContractDebriefRecords({ reports: [report], cases: {} })
    expect(records.map((record) => record.outcome)).toEqual(['fail', 'partial', 'success'])
    // The alphabetic-first success case must not become `records[0]` and hide
    // the failure signal from front-desk attention tone derivation.
    expect(records[0]!.caseId).toBe('zzz-fail')
  })

  it('SPE-1496 (PR #1621 review fix): same-urgency records tiebreak on unresolved clock count then caseId', () => {
    const heavyClocks = {
      ...buildSnapshot(),
      caseId: 'mmm-heavy',
      title: 'Heavy Clocks',
      missionResult: {
        ...buildSnapshot().missionResult!,
        caseId: 'mmm-heavy',
        outcome: 'partial' as const,
        spawnedConsequences: [
          {
            type: 'queued_follow_up' as const,
            caseId: 'follow-1',
            detail: 'First follow-up.',
          },
          {
            type: 'queued_follow_up' as const,
            caseId: 'follow-2',
            detail: 'Second follow-up.',
          },
        ],
      },
    } as unknown as WeeklyReportCaseSnapshot
    Object.defineProperty(heavyClocks, 'caseId', { value: 'mmm-heavy', enumerable: true })
    const lightClocks = {
      ...buildSnapshot(),
      caseId: 'aaa-light',
      title: 'Light Clocks',
      missionResult: {
        ...buildSnapshot().missionResult!,
        caseId: 'aaa-light',
        outcome: 'partial' as const,
        spawnedConsequences: [],
        weakestLink: undefined,
      },
    } as unknown as WeeklyReportCaseSnapshot
    Object.defineProperty(lightClocks, 'caseId', { value: 'aaa-light', enumerable: true })

    const report: WeeklyReport = {
      week: 15,
      summary: '',
      events: [],
      caseSnapshots: {
        [heavyClocks.caseId]: heavyClocks,
        [lightClocks.caseId]: lightClocks,
      },
    } as unknown as WeeklyReport

    const records = getRecentContractDebriefRecords({ reports: [report], cases: {} })
    expect(records[0]!.caseId).toBe('mmm-heavy')
    expect(records[1]!.caseId).toBe('aaa-light')
  })
})

describe('SPE-1496 next-intent capture', () => {
  it('captures the canonical bounded set and clears cleanly', () => {
    const state = createStartingState()

    expect(getContractNextIntent(state)).toBeNull()

    const captured = setContractNextIntent(state, 'pursue-faction')
    expect(getContractNextIntent(captured)).toBe('pursue-faction')
    expect(captured.contracts?.nextIntentCapturedWeek).toBe(state.week)

    const cleared = clearContractNextIntent(captured)
    expect(getContractNextIntent(cleared)).toBeNull()
    expect(cleared.contracts?.nextIntentCapturedWeek).toBeUndefined()
  })

  it('exposes a stable enum surface for UI iteration', () => {
    const values = getContractNextIntentValues()
    expect(values.length).toBeGreaterThan(0)
    for (const value of values) {
      const label = getContractNextIntentLabel(value)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('SPE-1496 (PR #1621 review fix): sanitize drops capturedWeek when intent is missing', () => {
    const state = createStartingState()
    // Simulate corrupted save data: captured week present, intent absent.
    const captured = sanitizeContractSystemState(
      {
        ...state.contracts,
        nextIntent: undefined,
        nextIntentCapturedWeek: 4,
      },
      state.contracts
    )

    expect(captured.nextIntent).toBeUndefined()
    expect(captured.nextIntentCapturedWeek).toBeUndefined()
  })

  it('SPE-1496 (PR #1621 review fix): sanitize preserves capturedWeek when intent is valid', () => {
    const state = createStartingState()
    const captured = sanitizeContractSystemState(
      {
        ...state.contracts,
        nextIntent: 'chase-lead',
        nextIntentCapturedWeek: 8,
      },
      state.contracts
    )

    expect(captured.nextIntent).toBe('chase-lead')
    expect(captured.nextIntentCapturedWeek).toBe(8)
  })
})

function regenerateBoard(state: ReturnType<typeof createStartingState>) {
  // Bump week to force `refreshContractBoard` past its `generatedWeek === week`
  // early-return without dropping the captured next intent.
  return refreshContractBoard({ ...state, week: state.week + 1 })
}

describe('SPE-1496 next-intent contract suggestion bias', () => {
  it('returns zero bias when no intent is captured and non-zero when one is', () => {
    const state = createStartingState()
    // Use a real definition surfaced on the board.
    const definition = {
      id: 'oversight-lockdown-retainer',
      caseTemplateId: 'institutions-ritual-archive',
      name: 'Oversight Lockdown Retainer',
      description: '',
      strategyTag: 'income',
      durationWeeks: 1,
      factionId: 'oversight',
      requirements: { recommendedClasses: [], discouragedClasses: [] },
      modifiers: [],
      chain: {},
    } as unknown as Parameters<typeof getNextIntentSelectionBias>[1]

    expect(getNextIntentSelectionBias(state, definition)).toBe(0)

    const stabilizing = setContractNextIntent(state, 'stabilize-staff')
    expect(getNextIntentSelectionBias(stabilizing, definition)).toBeGreaterThan(0)
  })

  it('produces distinct bias magnitudes for different intents on the same definition', () => {
    const state = createStartingState()
    const incomeDefinition = {
      id: 'income-test',
      caseTemplateId: 'income-test-case',
      name: 'Income Test',
      description: '',
      strategyTag: 'income',
      durationWeeks: 1,
      requirements: { recommendedClasses: [], discouragedClasses: [] },
      modifiers: [],
      chain: {},
    } as unknown as Parameters<typeof getNextIntentSelectionBias>[1]
    const materialsDefinition = {
      ...incomeDefinition,
      id: 'materials-test',
      name: 'Materials Test',
      strategyTag: 'materials',
    } as unknown as Parameters<typeof getNextIntentSelectionBias>[1]

    const stabilizing = setContractNextIntent(state, 'stabilize-staff')
    const equipping = setContractNextIntent(state, 'prepare-equipment')

    expect(getNextIntentSelectionBias(stabilizing, incomeDefinition)).toBeGreaterThan(
      getNextIntentSelectionBias(stabilizing, materialsDefinition)
    )
    expect(getNextIntentSelectionBias(equipping, materialsDefinition)).toBeGreaterThan(
      getNextIntentSelectionBias(equipping, incomeDefinition)
    )
  })

  it('preserves the captured next intent across `refreshContractBoard`', () => {
    const base = createStartingState()
    const captured = setContractNextIntent(base, 'chase-lead')
    const regenerated = regenerateBoard(captured)
    expect(regenerated.contracts?.nextIntent).toBe('chase-lead')
    expect(regenerated.contracts?.nextIntentCapturedWeek).toBe(base.week)
  })

  it('keeps board generation deterministic for a fixed captured intent', () => {
    const base = createStartingState()
    const stabilizingA = regenerateBoard(setContractNextIntent(base, 'stabilize-staff'))
    const stabilizingB = regenerateBoard(setContractNextIntent(base, 'stabilize-staff'))
    expect(getContractOffers(stabilizingA).map((offer) => offer.templateId)).toEqual(
      getContractOffers(stabilizingB).map((offer) => offer.templateId)
    )
  })

  it('keeps the bias bounded so it cannot override unlock conditions', () => {
    const state = createStartingState()
    const definition = {
      id: 'oversight-lockdown-retainer',
      caseTemplateId: 'institutions-ritual-archive',
      name: 'Oversight Lockdown Retainer',
      description: '',
      strategyTag: 'income',
      durationWeeks: 1,
      factionId: 'oversight',
      requirements: { recommendedClasses: [], discouragedClasses: [] },
      modifiers: [],
      chain: {},
    } as unknown as Parameters<typeof getNextIntentSelectionBias>[1]

    for (const intent of getContractNextIntentValues()) {
      const captured = setContractNextIntent(state, intent)
      const bias = getNextIntentSelectionBias(captured, definition)
      // Total bias is always bounded — the largest single positive lever is the
      // `chase-lead` chain continuation case at +0.55, and the cap on any
      // composite term stays under ~1.0 by construction.
      expect(Math.abs(bias)).toBeLessThan(1)
    }
  })
})
