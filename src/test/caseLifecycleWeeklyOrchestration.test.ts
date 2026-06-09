import { describe, expect, it } from 'vitest'
import {
  applyCaseLifecycleEventToCase,
  applyWeeklyCaseLifecycleTick,
  didIntakeCredibilityReviewPass,
  resolveAnomalyConfirmedCaseIds,
  resolveCredibilityReviewPassedCaseIds,
} from '../domain/caseLifecycleWeeklyOrchestration'
import { createInformationIntakeReport } from '../domain/informationIntakeReport'
import type { CaseInstance } from '../domain/models'
import type { ExtranormalEventRecord } from '../domain/extranormalEventRegistry'

function makeCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    id: 'case:lifecycle-target',
    templateId: 'template:lifecycle-target',
    title: 'Lifecycle target case',
    description: 'Test case',
    mode: 'standard',
    kind: 'anomaly',
    status: 'open',
    difficulty: {},
    weights: {},
    tags: ['lifecycle-target'],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 4,
    deadlineWeeks: 8,
    deadlineRemaining: 8,
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('caseLifecycleWeeklyOrchestration (SPE-1310 slice 3)', () => {
  it('applyCaseLifecycleEventToCase advances lead to confirmation on credibility review', () => {
    const currentCase = makeCase({ lifecycleStage: 'lead' })
    const nextCase = applyCaseLifecycleEventToCase(currentCase, 'credibility_review_passed')

    expect(nextCase.lifecycleStage).toBe('confirmation')
  })

  it('applyCaseLifecycleEventToCase preserves stage when lifecycleStage is absent', () => {
    const currentCase = makeCase()
    delete currentCase.lifecycleStage

    const nextCase = applyCaseLifecycleEventToCase(currentCase, 'credibility_review_passed')

    expect(nextCase).toBe(currentCase)
    expect(nextCase.lifecycleStage).toBeUndefined()
  })

  it('applyCaseLifecycleEventToCase preserves stage on invalid transition', () => {
    const currentCase = makeCase({ lifecycleStage: 'lead' })
    const nextCase = applyCaseLifecycleEventToCase(currentCase, 'anomaly_confirmed')

    expect(nextCase).toBe(currentCase)
    expect(nextCase.lifecycleStage).toBe('lead')
  })

  it('didIntakeCredibilityReviewPass detects first crossing into verified', () => {
    expect(didIntakeCredibilityReviewPass('partially_corroborated', 'verified')).toBe(true)
    expect(didIntakeCredibilityReviewPass('verified', 'escalated_confidence')).toBe(false)
    expect(didIntakeCredibilityReviewPass(undefined, 'verified')).toBe(true)
  })

  it('resolveCredibilityReviewPassedCaseIds links intake topic refs to active cases', () => {
    const currentCase = makeCase()
    const report = createInformationIntakeReport({
      id: 'intake:lifecycle-credibility',
      label: 'Linked intake credibility probe',
      topicRef: currentCase.id,
      initialSourceClass: 'formal_alert',
      credibility: 'institutional',
      plausibility: 'plausible',
      rumorRisk: 'none',
    })

    const priorReports = {
      [report.id]: { ...report, verificationStatus: 'partially_corroborated' as const },
    }
    const nextReports = {
      [report.id]: { ...report, verificationStatus: 'verified' as const },
    }

    expect(
      resolveCredibilityReviewPassedCaseIds(priorReports, nextReports, {
        [currentCase.id]: currentCase,
      })
    ).toEqual([currentCase.id])
  })

  it('resolveAnomalyConfirmedCaseIds links escalated extranormal events to cases', () => {
    const currentCase = makeCase({ lifecycleStage: 'confirmation' })
    const event: ExtranormalEventRecord = {
      id: 'extranormal:lifecycle-confirm',
      label: 'Escalated anomaly confirmation',
      closureState: 'escalated_to_case',
      escalatedCaseRef: currentCase.id,
    }

    expect(
      resolveAnomalyConfirmedCaseIds({ [event.id]: event }, { [currentCase.id]: currentCase })
    ).toEqual([currentCase.id])
  })

  it('applyWeeklyCaseLifecycleTick applies mapped events in deterministic case order', () => {
    const leadCase = makeCase({ id: 'case:lead', lifecycleStage: 'lead' })
    const confirmationCase = makeCase({
      id: 'case:confirmation',
      lifecycleStage: 'confirmation',
    })
    const report = createInformationIntakeReport({
      id: 'intake:weekly-lifecycle',
      label: 'Weekly lifecycle intake',
      topicRef: leadCase.id,
      initialSourceClass: 'formal_alert',
      credibility: 'institutional',
      plausibility: 'plausible',
      rumorRisk: 'none',
    })
    const event: ExtranormalEventRecord = {
      id: 'extranormal:weekly-lifecycle',
      label: 'Weekly lifecycle confirmation',
      closureState: 'escalated_to_case',
      escalatedCaseRef: confirmationCase.id,
    }

    const result = applyWeeklyCaseLifecycleTick(
      {
        [leadCase.id]: leadCase,
        [confirmationCase.id]: confirmationCase,
      },
      {
        week: 4,
        priorIntakeReports: {
          [report.id]: { ...report, verificationStatus: 'partially_corroborated' },
        },
        nextIntakeReports: {
          [report.id]: { ...report, verificationStatus: 'verified' },
        },
        extranormalEventRecords: {
          [event.id]: event,
        },
      }
    )

    expect(result.changed).toBe(true)
    expect(result.cases[leadCase.id]?.lifecycleStage).toBe('confirmation')
    expect(result.cases[confirmationCase.id]?.lifecycleStage).toBe('containment')
    expect(result.appliedEvents).toEqual([
      {
        caseId: confirmationCase.id,
        event: 'anomaly_confirmed',
        fromStage: 'confirmation',
        toStage: 'containment',
      },
      {
        caseId: leadCase.id,
        event: 'credibility_review_passed',
        fromStage: 'lead',
        toStage: 'confirmation',
      },
    ])
  })

  it('applyWeeklyCaseLifecycleTick leaves cases without lifecycleStage unchanged', () => {
    const uninitializedCase = makeCase({ id: 'case:uninitialized' })
    delete uninitializedCase.lifecycleStage

    const report = createInformationIntakeReport({
      id: 'intake:uninitialized',
      label: 'Uninitialized lifecycle case',
      topicRef: uninitializedCase.id,
      initialSourceClass: 'formal_alert',
      credibility: 'institutional',
      plausibility: 'plausible',
      rumorRisk: 'none',
    })

    const result = applyWeeklyCaseLifecycleTick(
      { [uninitializedCase.id]: uninitializedCase },
      {
        week: 2,
        priorIntakeReports: {
          [report.id]: { ...report, verificationStatus: 'partially_corroborated' },
        },
        nextIntakeReports: {
          [report.id]: { ...report, verificationStatus: 'verified' },
        },
      }
    )

    expect(result.changed).toBe(false)
    expect(result.cases[uninitializedCase.id]?.lifecycleStage).toBeUndefined()
  })
})
