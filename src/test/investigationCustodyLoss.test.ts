import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyStealthLeaveBehindInvestigationCustodyLoss,
  buildInvestigationCustodyLossFlagId,
  countInvestigationCustodyLossRefs,
  listInvestigationCustodyLossMarkers,
  normalizeInvestigationCustodyLossRefForFlag,
  projectInvestigationCustodyLossBurdenAfterRefs,
  readInvestigationCustodyLossMarker,
} from '../domain/investigationCustodyLoss'
import { askInvestigationQuestion, grantInvestigationQuestionBudget } from '../domain/investigationEconomy'
import { evaluateStealthLeaveBehindMissionPressure } from '../domain/stealthLeaveBehindRegistry'
import { readInvestigationBudget } from '../domain/investigationEconomy'
import { createStarterCase } from '../domain/templates/startingCases'

describe('investigationCustodyLoss', () => {
  it('builds stable per-case custody-loss flag ids', () => {
    expect(buildInvestigationCustodyLossFlagId('case-001', 'custody:field-packet')).toBe(
      'investigation.case.case-001.custody-loss.custody-field-packet'
    )
  })

  it('records investigation custody-loss markers from leave-behind refs', () => {
    const state = createStartingState()

    const result = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:abandon-evidence',
      leaveBehindKind: 'abandon_evidence',
      leaveBehindLabel: 'Abandon compromised evidence',
      custodyLossRefs: ['custody:field-packet', 'custody:chain-seal'],
      week: 3,
    })

    expect(result.appliedRefs).toEqual(['custody:field-packet', 'custody:chain-seal'])
    expect(
      readInvestigationCustodyLossMarker(result.state, 'case-001', 'custody:field-packet')
    ).toMatchObject({
      ref: 'custody:field-packet',
      leaveBehindId: 'leave-behind:abandon-evidence',
      kind: 'abandon_evidence',
      appliedWeek: 3,
    })
    expect(countInvestigationCustodyLossRefs(result.state, 'case-001')).toBe(2)
    expect(listInvestigationCustodyLossMarkers(result.state, 'case-001')).toHaveLength(2)
    expect(result.resolutionNote).toContain('custody:field-packet')
  })

  it('dedupes custody-loss markers when the same ref is applied twice', () => {
    const first = applyStealthLeaveBehindInvestigationCustodyLoss({
      state: createStartingState(),
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:burn-tool',
      leaveBehindKind: 'burn_tool',
      leaveBehindLabel: 'Burn field tool',
      custodyLossRefs: ['custody:tool-serial'],
      week: 1,
    })

    const second = applyStealthLeaveBehindInvestigationCustodyLoss({
      state: first.state,
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:burn-tool',
      leaveBehindKind: 'burn_tool',
      leaveBehindLabel: 'Burn field tool',
      custodyLossRefs: ['custody:tool-serial'],
      week: 2,
    })

    expect(second.appliedRefs).toEqual([])
    expect(countInvestigationCustodyLossRefs(second.state, 'case-001')).toBe(1)
  })

  it('projects forensic custody burden after leave-behind refs with apply-equivalent dedupe', () => {
    const state = createStartingState()

    expect(
      projectInvestigationCustodyLossBurdenAfterRefs(state, 'case-001', [
        'custody:field-packet',
        'custody:chain-seal',
      ])
    ).toBe(2)

    const withMarker = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:burn-tool',
      leaveBehindKind: 'burn_tool',
      leaveBehindLabel: 'Burn field tool',
      custodyLossRefs: ['custody:tool-serial'],
      week: 1,
    }).state

    expect(
      projectInvestigationCustodyLossBurdenAfterRefs(withMarker, 'case-001', [
        'custody:tool-serial',
        'custody:field-packet',
      ])
    ).toBe(2)
    expect(
      projectInvestigationCustodyLossBurdenAfterRefs(withMarker, 'case-001', ['!!!', 'custody:field-packet'])
    ).toBe(2)
  })

  it('skips symbolic-only custody refs that do not yield a flag suffix', () => {
    const result = applyStealthLeaveBehindInvestigationCustodyLoss({
      state: createStartingState(),
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:burn-tool',
      leaveBehindKind: 'burn_tool',
      leaveBehindLabel: 'Burn field tool',
      custodyLossRefs: ['!!!', 'custody:tool-serial'],
      week: 1,
    })

    expect(result.appliedRefs).toEqual(['custody:tool-serial'])
    expect(countInvestigationCustodyLossRefs(result.state, 'case-001')).toBe(1)
    expect(normalizeInvestigationCustodyLossRefForFlag('!!!')).toBe('')
  })

  it('dedupes custody refs that collide on the same investigation flag suffix', () => {
    const result = applyStealthLeaveBehindInvestigationCustodyLoss({
      state: createStartingState(),
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:abandon-evidence',
      leaveBehindKind: 'abandon_evidence',
      leaveBehindLabel: 'Abandon compromised evidence',
      custodyLossRefs: ['custody:field-packet', 'custody/field/packet'],
      week: 1,
    })

    expect(result.appliedRefs).toEqual(['custody:field-packet'])
    expect(countInvestigationCustodyLossRefs(result.state, 'case-001')).toBe(1)
    expect(
      normalizeInvestigationCustodyLossRefForFlag('custody:field-packet')
    ).toBe(normalizeInvestigationCustodyLossRefForFlag('custody/field/packet'))
  })

  it('blocks forensic questions when remaining budget is consumed by custody burden only', () => {
    let state = createStartingState()
    state = grantInvestigationQuestionBudget(state, {
      caseId: 'case-001',
      domain: 'forensic',
      amount: 1,
    })
    state = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:burn-tool',
      leaveBehindKind: 'burn_tool',
      leaveBehindLabel: 'Burn field tool',
      custodyLossRefs: ['custody:tool-serial'],
      week: 1,
    }).state

    const asked = askInvestigationQuestion(state, {
      caseId: 'case-001',
      domain: 'forensic',
      questionId: 'forensic.present-signature',
    })

    expect(asked.applied).toBe(false)
    expect(asked.reason).toBe('budget_exhausted')
  })

  it('reduces forensic investigation budget headroom by custody-loss burden', () => {
    let state = createStartingState()
    state = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: 'case-001',
      leaveBehindId: 'leave-behind:leave-trace',
      leaveBehindKind: 'leave_trace',
      leaveBehindLabel: 'Leave forensic trace',
      custodyLossRefs: ['custody:trace-sample', 'custody:mission-window'],
      week: 1,
    }).state

    const budget = readInvestigationBudget(state, 'case-001', 'forensic')

    expect(budget.custodyLossBurden).toBe(2)
    expect(budget.remaining).toBe(Math.max(0, budget.granted - budget.spent - 2))
  })
})

describe('stealth leave-behind custody-loss resolution', () => {
  it('resolves custody-loss refs when mission pressure is active', () => {
    const caseData = {
      ...createStarterCase({ id: 'case-x', templateId: 'ops-003' }),
      hiddenState: 'hidden' as const,
      tags: ['infiltration', 'archive', 'records'],
      stealthLeaveBehindId: 'leave-behind:leave-trace',
    }

    const pressure = evaluateStealthLeaveBehindMissionPressure(caseData)
    expect(pressure.active).toBe(true)
    expect(pressure.custodyLossRefs).toEqual(['custody:trace-sample'])
  })
})
