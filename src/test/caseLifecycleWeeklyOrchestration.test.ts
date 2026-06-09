import { describe, expect, it } from 'vitest'
import {
  applyCaseLifecycleEventToCase,
  applyWeeklyCaseLifecycleTick,
  didComplianceResearchInvalidationSignal,
  didIntakeCredibilityReviewPass,
  didProcedureRevisionRecover,
  resolveAnomalyConfirmedCaseIds,
  resolveCredibilityReviewPassedCaseIds,
  resolveProcedureRevisedCaseIds,
  resolveResearchInvalidationCaseIds,
} from '../domain/caseLifecycleWeeklyOrchestration'
import type { RuleDocumentComplianceRecord } from '../domain/ruleDocumentComplianceContainmentRegistry'
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

function complianceRecord(
  overrides: Partial<RuleDocumentComplianceRecord> = {}
): RuleDocumentComplianceRecord {
  return {
    id: 'rule-document-compliance:lifecycle-test',
    label: 'Lifecycle compliance test record',
    documentRef: 'case:lifecycle-target',
    bindingStrength: 'contractual',
    complianceState: 'compliant',
    physicalCopyRequired: false,
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

describe('caseLifecycleWeeklyOrchestration (SPE-1310 slice 4)', () => {
  it('applyCaseLifecycleEventToCase advances containment to revision on research invalidation', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const nextCase = applyCaseLifecycleEventToCase(currentCase, 'research_invalidation')

    expect(nextCase.lifecycleStage).toBe('revision')
  })

  it('applyCaseLifecycleEventToCase advances revision to containment on procedure revised', () => {
    const currentCase = makeCase({ lifecycleStage: 'revision' })
    const nextCase = applyCaseLifecycleEventToCase(currentCase, 'procedure_revised')

    expect(nextCase.lifecycleStage).toBe('containment')
  })

  it('didComplianceResearchInvalidationSignal detects first drift and breach escalation', () => {
    expect(didComplianceResearchInvalidationSignal('compliant', 'drifting')).toBe(true)
    expect(didComplianceResearchInvalidationSignal('drifting', 'breach')).toBe(true)
    expect(didComplianceResearchInvalidationSignal('drifting', 'drifting')).toBe(false)
    expect(didComplianceResearchInvalidationSignal('breach', 'breach')).toBe(false)
  })

  it('resolveResearchInvalidationCaseIds requires explicit documentRef case linkage', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const linkedRecord = complianceRecord({
      id: 'rule-document-compliance:linked-drift',
      documentRef: currentCase.id,
    })
    const unlinkedRecord = complianceRecord({
      id: 'rule-document-compliance:unlinked-drift',
      documentRef: 'document:unrelated-procedure',
    })

    const priorRecords = {
      [linkedRecord.id]: { ...linkedRecord, complianceState: 'compliant' as const },
      [unlinkedRecord.id]: { ...unlinkedRecord, complianceState: 'compliant' as const },
    }
    const nextRecords = {
      [linkedRecord.id]: { ...linkedRecord, complianceState: 'drifting' as const },
      [unlinkedRecord.id]: { ...unlinkedRecord, complianceState: 'drifting' as const },
    }

    expect(
      resolveResearchInvalidationCaseIds(priorRecords, nextRecords, {
        [currentCase.id]: currentCase,
      })
    ).toEqual([currentCase.id])
  })

  it('didProcedureRevisionRecover detects new revision ref with compliance recovery', () => {
    const priorRecord = complianceRecord({
      complianceState: 'drifting',
      revisionHistoryRefs: ['revision:procedure-v1'],
    })
    const nextRecord = complianceRecord({
      complianceState: 'compliant',
      revisionHistoryRefs: ['revision:procedure-v1', 'revision:procedure-v2'],
    })

    expect(didProcedureRevisionRecover(priorRecord, nextRecord)).toBe(true)
    expect(
      didProcedureRevisionRecover(nextRecord, {
        ...nextRecord,
        revisionHistoryRefs: ['revision:procedure-v1', 'revision:procedure-v2'],
      })
    ).toBe(false)
  })

  it('resolveProcedureRevisedCaseIds links recovery to explicitly referenced cases', () => {
    const currentCase = makeCase({ lifecycleStage: 'revision' })
    const record = complianceRecord({
      id: 'rule-document-compliance:procedure-recovery',
      documentRef: currentCase.templateId,
      revisionHistoryRefs: ['revision:procedure-v1'],
    })

    const priorRecords = {
      [record.id]: { ...record, complianceState: 'drifting' as const },
    }
    const nextRecords = {
      [record.id]: {
        ...record,
        complianceState: 'compliant' as const,
        revisionHistoryRefs: ['revision:procedure-v1', 'revision:procedure-v2'],
      },
    }

    expect(
      resolveProcedureRevisedCaseIds(priorRecords, nextRecords, {
        [currentCase.id]: currentCase,
      })
    ).toEqual([currentCase.id])
  })

  it('applyWeeklyCaseLifecycleTick applies containment revision loop events', () => {
    const containmentCase = makeCase({
      id: 'case:containment-loop',
      lifecycleStage: 'containment',
    })
    const revisionCase = makeCase({
      id: 'case:revision-loop',
      lifecycleStage: 'revision',
    })
    const driftRecord = complianceRecord({
      id: 'rule-document-compliance:containment-drift',
      documentRef: containmentCase.id,
    })
    const recoveryRecord = complianceRecord({
      id: 'rule-document-compliance:revision-recovery',
      documentRef: revisionCase.id,
      revisionHistoryRefs: ['revision:loop-v1'],
    })

    const result = applyWeeklyCaseLifecycleTick(
      {
        [containmentCase.id]: containmentCase,
        [revisionCase.id]: revisionCase,
      },
      {
        week: 8,
        priorRuleDocumentComplianceRecords: {
          [driftRecord.id]: { ...driftRecord, complianceState: 'compliant' },
          [recoveryRecord.id]: { ...recoveryRecord, complianceState: 'drifting' },
        },
        nextRuleDocumentComplianceRecords: {
          [driftRecord.id]: { ...driftRecord, complianceState: 'drifting' },
          [recoveryRecord.id]: {
            ...recoveryRecord,
            complianceState: 'compliant',
            revisionHistoryRefs: ['revision:loop-v1', 'revision:loop-v2'],
          },
        },
      }
    )

    expect(result.changed).toBe(true)
    expect(result.cases[containmentCase.id]?.lifecycleStage).toBe('revision')
    expect(result.cases[revisionCase.id]?.lifecycleStage).toBe('containment')
    expect(result.appliedEvents).toEqual([
      {
        caseId: containmentCase.id,
        event: 'research_invalidation',
        fromStage: 'containment',
        toStage: 'revision',
      },
      {
        caseId: revisionCase.id,
        event: 'procedure_revised',
        fromStage: 'revision',
        toStage: 'containment',
      },
    ])
  })

  it('applyWeeklyCaseLifecycleTick is idempotent when compliance maps are unchanged', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const record = complianceRecord({
      documentRef: currentCase.id,
      complianceState: 'drifting',
    })
    const records = { [record.id]: record }

    const result = applyWeeklyCaseLifecycleTick(
      { [currentCase.id]: currentCase },
      {
        week: 3,
        priorRuleDocumentComplianceRecords: records,
        nextRuleDocumentComplianceRecords: records,
      }
    )

    expect(result.changed).toBe(false)
    expect(result.cases[currentCase.id]?.lifecycleStage).toBe('containment')
  })
})
