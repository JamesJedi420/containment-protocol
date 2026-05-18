import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyStealthLeaveBehindInvestigationCustodyLoss } from '../domain/investigationCustodyLoss'
import {
  applySuccessfulInvestigation,
  askInvestigationQuestion,
  grantInvestigationQuestionBudget,
} from '../domain/investigationEconomy'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  buildInvestigationCasePrepView,
  canAskInvestigationQuestionOnCase,
  canShowInvestigationCasePrepOnCase,
} from '../features/cases/investigationCasePrepView'

function createInProgressCase(id = 'case-investigation-prep') {
  return {
    ...createStarterCase({ id, templateId: 'ops-003' }),
    status: 'in_progress' as const,
    hiddenState: 'hidden' as const,
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'archive'],
    requiredTags: [],
    preferredTags: [],
  }
}

describe('investigationCasePrepView', () => {
  it('is visible only for in-progress cases', () => {
    const inProgress = createInProgressCase()
    expect(canShowInvestigationCasePrepOnCase(inProgress)).toBe(true)
    expect(canShowInvestigationCasePrepOnCase({ ...inProgress, status: 'open' })).toBe(false)
    expect(canShowInvestigationCasePrepOnCase({ ...inProgress, status: 'resolved' })).toBe(false)

    const hidden = buildInvestigationCasePrepView({ ...inProgress, status: 'open' }, createStartingState())
    expect(hidden.visible).toBe(false)
  })

  it('allows asks only for defined in-progress cases', () => {
    const inProgress = createInProgressCase()
    expect(canAskInvestigationQuestionOnCase(inProgress)).toBe(true)
    expect(canAskInvestigationQuestionOnCase(undefined)).toBe(false)
    expect(canAskInvestigationQuestionOnCase({ ...inProgress, status: 'resolved' })).toBe(false)
  })

  it('shows forensic and tactical budgets after investigation grant', () => {
    let state = createStartingState()
    state.cases['case-investigation-prep'] = createInProgressCase()

    state = applySuccessfulInvestigation(state, {
      caseId: 'case-investigation-prep',
      forensicBudget: 2,
      tacticalBudget: 1,
    })

    const view = buildInvestigationCasePrepView(state.cases['case-investigation-prep']!, state)

    expect(view.visible).toBe(true)
    expect(view.forensic.budget).toMatchObject({ granted: 2, spent: 0, remaining: 2 })
    expect(view.tactical.budget).toMatchObject({ granted: 1, spent: 0, remaining: 1 })
    expect(view.forensic.questions.length).toBe(3)
    expect(view.tactical.questions.length).toBe(3)
  })

  it('marks asked questions and reflects spent budget', () => {
    let state = createStartingState()
    state.cases['case-investigation-prep'] = createInProgressCase()
    state = grantInvestigationQuestionBudget(state, {
      caseId: 'case-investigation-prep',
      domain: 'forensic',
      amount: 1,
    })

    state = askInvestigationQuestion(state, {
      caseId: 'case-investigation-prep',
      domain: 'forensic',
      questionId: 'forensic.present-signature',
    }).state

    const view = buildInvestigationCasePrepView(state.cases['case-investigation-prep']!, state)
    const asked = view.forensic.questions.find((q) => q.id === 'forensic.present-signature')

    expect(asked?.asked).toBe(true)
    expect(asked?.canAsk).toBe(false)
    expect(asked?.leverageLabel).toBe('Secure evidence chain')
    expect(view.forensic.budget.spent).toBe(1)
    expect(view.forensic.budget.remaining).toBe(0)

    const unasked = view.forensic.questions.find((q) => q.id === 'forensic.missing-proof')
    expect(unasked?.canAsk).toBe(false)
  })

  it('lists custody strain markers and reduces forensic remaining', () => {
    let state = createStartingState()
    state.cases['case-investigation-prep'] = createInProgressCase()
    state = grantInvestigationQuestionBudget(state, {
      caseId: 'case-investigation-prep',
      domain: 'forensic',
      amount: 3,
    })

    state = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: 'case-investigation-prep',
      leaveBehindId: 'leave-behind:abandon-evidence',
      leaveBehindKind: 'abandon_evidence',
      leaveBehindLabel: 'Abandon compromised evidence',
      custodyLossRefs: ['custody:field-packet', 'custody:chain-seal'],
      week: 2,
    }).state

    const view = buildInvestigationCasePrepView(state.cases['case-investigation-prep']!, state)

    expect(view.custodyMarkers).toHaveLength(2)
    expect(view.custodyMarkers[0]?.ref).toBe('custody:chain-seal')
    expect(view.forensic.budget.custodyLossBurden).toBe(2)
    expect(view.forensic.budget.remaining).toBe(1)
  })
})
