import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applySuccessfulInvestigation } from '../domain/investigationEconomy'
import { createStarterCase } from '../domain/templates/startingCases'
import { buildWeeklyCasePrepView } from '../features/cases/weeklyCasePrepView'

describe('weeklyCasePrepView', () => {
  it('is visible when any prep subsection applies', () => {
    const state = createStartingState()
    state.cases['case-weekly-prep'] = {
      ...createStarterCase({ id: 'case-weekly-prep', templateId: 'ops-003' }),
      status: 'in_progress',
      tags: ['infiltration'],
      requiredTags: [],
      preferredTags: [],
    }

    const view = buildWeeklyCasePrepView(state.cases['case-weekly-prep']!, state)

    expect(view.visible).toBe(true)
    expect(view.sections.concealment).toBe(true)
    expect(view.sections.infiltration).toBe(false)
  })

  it('shows shared forensic budget when stealth or investigation prep applies', () => {
    let state = createStartingState()
    state.cases['case-weekly-prep'] = {
      ...createStarterCase({ id: 'case-weekly-prep', templateId: 'ops-003' }),
      status: 'in_progress',
      hiddenState: 'hidden',
      tags: ['infiltration', 'archive', 'records'],
      stealthLeaveBehindId: 'leave-behind:leave-trace',
      requiredTags: [],
      preferredTags: [],
    }

    state = applySuccessfulInvestigation(state, {
      caseId: 'case-weekly-prep',
      forensicBudget: 1,
      tacticalBudget: 1,
    })

    const view = buildWeeklyCasePrepView(state.cases['case-weekly-prep']!, state)

    expect(view.showSharedForensicBudget).toBe(true)
    expect(view.forensicBudget.remaining).toBeGreaterThan(0)
    expect(view.sections.stealthLeaveBehind).toBe(true)
    expect(view.sections.investigation).toBe(true)
  })
})
