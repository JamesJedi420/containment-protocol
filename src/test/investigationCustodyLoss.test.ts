import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyStealthLeaveBehindInvestigationCustodyLoss,
  buildInvestigationCustodyLossFlagId,
  countInvestigationCustodyLossRefs,
  listInvestigationCustodyLossMarkers,
  readInvestigationCustodyLossMarker,
} from '../domain/investigationCustodyLoss'
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
