import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { grantInvestigationQuestionBudget } from '../domain/investigationEconomy'
import { createStarterCase } from '../domain/templates/startingCases'
import { buildStealthLeaveBehindSelectionView } from '../features/cases/stealthLeaveBehindSelectionView'
import type { CaseInstance } from '../domain/models'

function createEligibleCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-stealth-forensic', templateId: 'ops-003' }),
    status: 'in_progress',
    hiddenState: 'hidden',
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'archive', 'records'],
    requiredTags: [],
    preferredTags: [],
    stealthLeaveBehindId: 'leave-behind:leave-trace',
    ...overrides,
  }
}

describe('buildStealthLeaveBehindSelectionView forensic preview', () => {
  it('includes current forensic budget and per-option projected burden', () => {
    let state = createStartingState()
    state.cases['case-stealth-forensic'] = createEligibleCase()
    state = grantInvestigationQuestionBudget(state, {
      caseId: 'case-stealth-forensic',
      domain: 'forensic',
      amount: 3,
    })

    const caseData = state.cases['case-stealth-forensic']!
    const view = buildStealthLeaveBehindSelectionView(caseData, state)

    expect(view.visible).toBe(true)
    expect(view.forensicBudget).toMatchObject({
      granted: 3,
      spent: 0,
      custodyLossBurden: 0,
      remaining: 3,
      markerCount: 0,
    })

    const abandon = view.options.find((option) => option.id === 'leave-behind:abandon-evidence')
    const burn = view.options.find((option) => option.id === 'leave-behind:burn-tool')

    expect(abandon?.projectedCustodyLossBurden).toBe(2)
    expect(abandon?.projectedForensicRemaining).toBe(1)
    expect(burn?.projectedCustodyLossBurden).toBe(0)
    expect(burn?.projectedForensicRemaining).toBe(3)
  })
})
