import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { readPersistentFlag } from '../domain/flagSystem'
import { readProgressClock } from '../domain/progressClocks'
import {
  applySuccessfulInvestigation,
  askInvestigationQuestion,
  buildInvestigationBudgetClockId,
  buildInvestigationProgressRewardClockId,
  listAvailableInvestigationQuestions,
  listInvestigationQuestionSet,
  readInvestigationBudget,
} from '../domain/investigationEconomy'

describe('investigationEconomy', () => {
  it('grants a bounded forensic question budget from successful investigation', () => {
    const caseId = 'case-001'
    const state = applySuccessfulInvestigation(createStartingState(), {
      caseId,
      forensicBudget: 99,
      tacticalBudget: 0,
    })

    const forensicBudget = readInvestigationBudget(state, caseId, 'forensic')

    expect(forensicBudget).toMatchObject({
      maxBudget: 6,
      granted: 6,
      spent: 0,
      remaining: 6,
    })
    expect(
      readProgressClock(state, buildInvestigationBudgetClockId(caseId, 'forensic', 'granted'))
    ).toMatchObject({
      value: 6,
      max: 6,
    })
  })

  it('keeps tactical-read questions distinct from forensic inquiry', () => {
    const forensic = listInvestigationQuestionSet('forensic')
    const tactical = listInvestigationQuestionSet('tactical')
    const tacticalIds = new Set(tactical.map((question) => question.id))

    expect(forensic.every((question) => !tacticalIds.has(question.id))).toBe(true)
  })

  it('spends tactical budget deterministically and converts answer into temporary advantage', () => {
    const caseId = 'case-002'
    let state = applySuccessfulInvestigation(createStartingState(), {
      caseId,
      forensicBudget: 0,
      tacticalBudget: 1,
    })

    const available = listAvailableInvestigationQuestions(state, caseId, 'tactical')
    expect(available.length).toBeGreaterThan(0)

    const first = askInvestigationQuestion(state, {
      caseId,
      domain: 'tactical',
      questionId: 'tactical.immediate-danger-vector',
    })

    expect(first.applied).toBe(true)
    expect(first.remainingBudget).toBe(0)
    expect(first.question?.leverage.type).toBe('temporary_advantage')
    expect(first.leverageFlagId).toBe(
      'investigation.case.case-002.leverage.staged-ingress-advantage'
    )
    expect(readPersistentFlag(first.state, first.leverageFlagId!)).toBe(true)

    state = first.state

    const second = askInvestigationQuestion(state, {
      caseId,
      domain: 'tactical',
      questionId: 'tactical.immediate-danger-vector',
    })

    expect(second.applied).toBe(false)
    expect(second.reason).toBe('budget_exhausted')
    expect(readInvestigationBudget(second.state, caseId, 'tactical').spent).toBe(1)
  })

  it('provides explicit next-step leverage from forensic inquiry', () => {
    const caseId = 'case-003'
    const seeded = applySuccessfulInvestigation(createStartingState(), {
      caseId,
      forensicBudget: 1,
      tacticalBudget: 0,
    })

    const result = askInvestigationQuestion(seeded, {
      caseId,
      domain: 'forensic',
      questionId: 'forensic.present-signature',
    })

    expect(result.applied).toBe(true)
    expect(result.question?.leverage.type).toBe('next_step')
    expect(result.leverageFlagId).toBe('investigation.case.case-003.leverage.secure-evidence-chain')
    expect(readPersistentFlag(result.state, result.leverageFlagId!)).toBe(true)
  })

  it('applies an investigation progress reward independent of combat or loot resolution', () => {
    const caseId = 'case-004'
    const state = applySuccessfulInvestigation(createStartingState(), {
      caseId,
      forensicBudget: 1,
      tacticalBudget: 1,
    })

    expect(
      readProgressClock(state, buildInvestigationProgressRewardClockId(caseId))
    ).toMatchObject({
      value: 1,
      max: 1,
      completed: true,
    })
    expect(
      readPersistentFlag(state, `investigation.case.${caseId}.reward.progress-applied`)
    ).toBe(true)
  })
})
