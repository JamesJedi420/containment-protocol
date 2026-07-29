import { describe, expect, it } from 'vitest'
import {
  applyAdaptationPolicyTierUpgrade,
  applyCaseLifecycleEventToCase,
  applyLifecycleInstitutionalLabelProjection,
  applyPresumedNeutralizedSurveillanceClocks,
  applyWeeklyCaseLifecycleTick,
  cancelCase,
  didAdaptationDemonstratedSignal,
  didComplianceResearchInvalidationSignal,
  didIntakeCredibilityReviewPass,
  didPresumedNeutralizationSignal,
  didProcedureRevisionRecover,
  produceCaseLifecyclePrerequisiteProcessingTerminalSignals,
  resolveAdaptationDemonstratedCaseIds,
  resolveAnomalyConfirmedCaseIds,
  resolveCredibilityReviewPassedCaseIds,
  resolvePresumedNeutralizedCaseIds,
  resolveProcedureRevisedCaseIds,
  resolveResearchInvalidationCaseIds,
} from '../domain/caseLifecycleWeeklyOrchestration'
import type { RecurrentCatastropheRecord } from '../domain/recurrentCatastropheAmeliorationRegistry'
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

function catastropheRecord(
  overrides: Partial<RecurrentCatastropheRecord> = {}
): RecurrentCatastropheRecord {
  return {
    id: 'case:lifecycle-target',
    label: 'Lifecycle adaptation catastrophe',
    recurrenceCadence: 'weekly',
    failureMode: 'manifestation',
    preventionCeiling: 'impossible',
    ameliorationTactics: [{ tactic: 'narrative_containment', active: true }],
    recurrenceCount: 0,
    lastOccurrenceWeek: 1,
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

function terminalSignalSource() {
  const targetCase = makeCase()
  const otherCase = makeCase({
    id: 'case:lifecycle-other',
    templateId: 'template:lifecycle-other',
    title: 'Other lifecycle case',
  })
  const order = (workOrderId: string, caseId: string) => ({
    workOrderId,
    caseId,
    processingRecipeId: `recipe:${workOrderId}`,
    inputMaterials: [{ materialId: `material:${workOrderId}`, quantity: 1 }],
    outputMaterialId: `output:${workOrderId}`,
    outputQuantity: 1,
    departmentId: 'department:records-analysis',
    taskType: 'records_review',
    requiredWork: 2,
    prerequisiteWorkOrderIds: [],
  })
  const orders = {
    'work:zulu': order('work:zulu', targetCase.id),
    'work:alpha': order('work:alpha', targetCase.id),
    'work:other': order('work:other', otherCase.id),
  }
  const reservations = Object.fromEntries(
    Object.values(orders).map((entry) => [
      entry.workOrderId,
      {
        workOrderId: entry.workOrderId,
        caseId: entry.caseId,
        inputMaterials: entry.inputMaterials,
      },
    ])
  )
  const workshopOrders = Object.fromEntries(
    Object.values(orders).map((entry) => [
      entry.workOrderId,
      {
        id: entry.workOrderId,
        caseId: entry.caseId,
        departmentId: entry.departmentId,
        taskType: entry.taskType,
        requiredWork: entry.requiredWork,
      },
    ])
  )

  return {
    week: 2,
    cases: {
      [targetCase.id]: targetCase,
      [otherCase.id]: otherCase,
    },
    caseScopedPrerequisiteProcessingOrders: orders,
    caseScopedPrerequisiteProcessingReservations: reservations,
    caseScopedPrerequisiteProcessingTerminalSignals: {},
    departmentWorkshopWorkOrders: workshopOrders,
    departmentWorkshopCompletionOutcomes: {},
  }
}

describe('caseLifecycleWeeklyOrchestration (SPE-1310 slice 3)', () => {
  it('executes an explicit cancellation command through the lifecycle producer', () => {
    const source = terminalSignalSource()
    const before = structuredClone(source)

    const result = cancelCase(source, 'case:lifecycle-target')

    expect(result.state).toBe('accepted')
    if (result.state !== 'accepted') throw new Error('Expected accepted cancellation')
    expect(result.registeredWorkOrderIds).toEqual(['work:alpha', 'work:zulu'])
    expect(result.reasons).toEqual([])
    expect(result.signals['work:alpha']).toMatchObject({
      caseId: 'case:lifecycle-target',
      reason: 'cancelled',
      terminalWeek: source.week,
    })
    expect(result.signals['work:other']).toBeUndefined()
    expect(source).toEqual(before)
  })

  it.each([
    { caseId: '', reason: 'invalid-case-id' },
    { caseId: '   ', reason: 'invalid-case-id' },
    { caseId: 'case:missing', reason: 'missing-case' },
  ])('blocks invalid cancellation target $caseId', ({ caseId, reason }) => {
    const source = terminalSignalSource()
    const before = structuredClone(source)

    expect(cancelCase(source, caseId)).toEqual({
      state: 'blocked',
      reasons: [reason],
    })
    expect(source).toEqual(before)
  })

  it('blocks resolved cases without inspecting or mutating their prerequisite work', () => {
    const source = terminalSignalSource()
    const resolvedSource = {
      ...source,
      cases: {
        ...source.cases,
        'case:lifecycle-target': {
          ...source.cases['case:lifecycle-target'],
          status: 'resolved' as const,
        },
      },
    }
    const before = structuredClone(resolvedSource)

    expect(cancelCase(resolvedSource, 'case:lifecycle-target')).toEqual({
      state: 'blocked',
      reasons: ['resolved-case'],
    })
    expect(resolvedSource).toEqual(before)
  })

  it('accepts an identical cancellation replay as a no-op', () => {
    const source = terminalSignalSource()
    const first = cancelCase(source, 'case:lifecycle-target')
    if (first.state !== 'accepted') throw new Error('Expected accepted cancellation')
    const withSignals = {
      ...source,
      caseScopedPrerequisiteProcessingTerminalSignals: first.signals,
    }

    const replay = cancelCase(withSignals, 'case:lifecycle-target')

    expect(replay).toEqual({
      state: 'accepted',
      signals: first.signals,
      registeredWorkOrderIds: [],
      reasons: [],
    })
  })

  it.each(['failed', 'cancelled'] as const)(
    'produces explicit %s prerequisite terminal signals in stable work-order order',
    (reason) => {
      const source = terminalSignalSource()
      const before = structuredClone(source)
      const result = produceCaseLifecyclePrerequisiteProcessingTerminalSignals(source, {
        caseId: 'case:lifecycle-target',
        reason,
        terminalWeek: 2,
      })

      expect(result.registeredWorkOrderIds).toEqual(['work:alpha', 'work:zulu'])
      expect(Object.keys(result.signals)).toEqual(['work:alpha', 'work:zulu'])
      expect(result.signals['work:alpha']).toMatchObject({
        workOrderId: 'work:alpha',
        caseId: 'case:lifecycle-target',
        terminalWeek: 2,
        reason,
      })
      expect(result.signals['work:other']).toBeUndefined()
      expect(result.reasons).toEqual([])
      expect(source).toEqual(before)
    }
  )

  it('keeps identical replay idempotent and rejects conflicting durable proof', () => {
    const source = terminalSignalSource()
    const first = produceCaseLifecyclePrerequisiteProcessingTerminalSignals(source, {
      caseId: 'case:lifecycle-target',
      reason: 'failed',
      terminalWeek: 2,
    })
    const withSignals = {
      ...source,
      caseScopedPrerequisiteProcessingTerminalSignals: first.signals,
    }
    const replay = produceCaseLifecyclePrerequisiteProcessingTerminalSignals(withSignals, {
      caseId: 'case:lifecycle-target',
      reason: 'failed',
      terminalWeek: 2,
    })
    const conflict = produceCaseLifecyclePrerequisiteProcessingTerminalSignals(withSignals, {
      caseId: 'case:lifecycle-target',
      reason: 'cancelled',
      terminalWeek: 2,
    })

    expect(replay.registeredWorkOrderIds).toEqual([])
    expect(replay.reasons).toEqual([])
    expect(replay.signals).toEqual(first.signals)
    expect(conflict.registeredWorkOrderIds).toEqual([])
    expect(conflict.reasons).toEqual(['already-terminal', 'already-terminal'])
    expect(conflict.signals).toEqual(first.signals)
  })

  it('isolates malformed provenance and completion proof by work order and case', () => {
    const source = terminalSignalSource()
    const isolatedSource = {
      ...source,
      departmentWorkshopWorkOrders: {
        ...source.departmentWorkshopWorkOrders,
        'work:alpha': {
          ...source.departmentWorkshopWorkOrders['work:alpha'],
          caseId: 'case:lifecycle-other',
        },
      },
      departmentWorkshopCompletionOutcomes: {
        'work:zulu': {
          workOrderId: 'work:zulu',
          caseId: 'case:lifecycle-target',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          completedWeek: 2,
          outcome: 'completed' as const,
        },
      },
    }
    const target = cancelCase(isolatedSource, 'case:lifecycle-target')
    if (target.state !== 'accepted') throw new Error('Expected accepted cancellation')
    const other = cancelCase(
      {
        ...isolatedSource,
        caseScopedPrerequisiteProcessingTerminalSignals: target.signals,
      },
      'case:lifecycle-other'
    )
    if (other.state !== 'accepted') throw new Error('Expected accepted cancellation')

    expect(target.registeredWorkOrderIds).toEqual([])
    expect(target.reasons).toEqual(['mismatched-terminal-provenance', 'already-completed'])
    expect(other.registeredWorkOrderIds).toEqual(['work:other'])
    expect(other.signals['work:other']?.reason).toBe('cancelled')
  })

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
    const currentCase = makeCase({
      lifecycleStage: 'containment',
      lifecycleInstitutionalLabel: 'active_anomaly_file',
    })
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

describe('caseLifecycleWeeklyOrchestration (SPE-1310 slice 5)', () => {
  it('applyCaseLifecycleEventToCase advances containment to presumed_neutralized', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const nextCase = applyCaseLifecycleEventToCase(
      currentCase,
      'presumed_neutralized_entered'
    )

    expect(nextCase.lifecycleStage).toBe('presumed_neutralized')
  })

  it('didPresumedNeutralizationSignal detects new revision:presumed-neutralized ref', () => {
    const priorRecord = complianceRecord({
      complianceState: 'compliant',
      revisionHistoryRefs: ['revision:procedure-v1'],
    })
    const nextRecord = complianceRecord({
      complianceState: 'compliant',
      revisionHistoryRefs: ['revision:procedure-v1', 'revision:presumed-neutralized'],
    })

    expect(didPresumedNeutralizationSignal(priorRecord, nextRecord)).toBe(true)
    expect(
      didPresumedNeutralizationSignal(nextRecord, {
        ...nextRecord,
        revisionHistoryRefs: ['revision:procedure-v1', 'revision:presumed-neutralized'],
      })
    ).toBe(false)
  })

  it('resolvePresumedNeutralizedCaseIds requires explicit documentRef case linkage', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const linkedRecord = complianceRecord({
      id: 'rule-document-compliance:presumed-neutralized',
      documentRef: currentCase.id,
      complianceState: 'compliant',
      revisionHistoryRefs: ['revision:procedure-v1'],
    })

    const priorRecords = { [linkedRecord.id]: linkedRecord }
    const nextRecords = {
      [linkedRecord.id]: {
        ...linkedRecord,
        revisionHistoryRefs: ['revision:procedure-v1', 'revision:presumed-neutralized'],
      },
    }

    expect(
      resolvePresumedNeutralizedCaseIds(priorRecords, nextRecords, {
        [currentCase.id]: currentCase,
      })
    ).toEqual([currentCase.id])
  })

  it('applyPresumedNeutralizedSurveillanceClocks sets due weeks from simulation week', () => {
    const currentCase = makeCase({ lifecycleStage: 'presumed_neutralized' })
    const nextCase = applyPresumedNeutralizedSurveillanceClocks(currentCase, 10)

    expect(nextCase.lifecycleSurveillanceDueWeek).toBe(14)
    expect(nextCase.lifecycleBreachReadinessDueWeek).toBe(18)
  })

  it('didAdaptationDemonstratedSignal detects recurrenceCount advance', () => {
    const priorRecord = catastropheRecord({ recurrenceCount: 1 })
    const nextRecord = catastropheRecord({ recurrenceCount: 2 })

    expect(didAdaptationDemonstratedSignal(priorRecord, nextRecord)).toBe(true)
    expect(didAdaptationDemonstratedSignal(nextRecord, nextRecord)).toBe(false)
  })

  it('resolveAdaptationDemonstratedCaseIds links catastrophe id to cases', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const record = catastropheRecord({ id: currentCase.templateId, recurrenceCount: 1 })
    const priorRecords = { [record.id]: record }
    const nextRecords = {
      [record.id]: { ...record, recurrenceCount: 2, lastOccurrenceWeek: 2 },
    }

    expect(
      resolveAdaptationDemonstratedCaseIds(priorRecords, nextRecords, {
        [currentCase.id]: currentCase,
      })
    ).toEqual([currentCase.id])
  })

  it('applyAdaptationPolicyTierUpgrade escalates containment policy tier', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const elevated = applyAdaptationPolicyTierUpgrade(currentCase)
    const critical = applyAdaptationPolicyTierUpgrade({
      ...currentCase,
      containmentPolicyTier: 'elevated',
    })

    expect(elevated.containmentPolicyTier).toBe('elevated')
    expect(critical.containmentPolicyTier).toBe('critical')

    const criticalCase = {
      ...currentCase,
      containmentPolicyTier: 'critical' as const,
    }
    expect(applyAdaptationPolicyTierUpgrade(criticalCase)).toBe(criticalCase)
  })

  it('applyWeeklyCaseLifecycleTick applies presumed_neutralized disposition with clocks', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const record = complianceRecord({
      id: 'rule-document-compliance:presumed-neutralized-weekly',
      documentRef: currentCase.id,
      complianceState: 'compliant',
      revisionHistoryRefs: ['revision:procedure-v1'],
    })

    const result = applyWeeklyCaseLifecycleTick(
      { [currentCase.id]: currentCase },
      {
        week: 12,
        priorRuleDocumentComplianceRecords: { [record.id]: record },
        nextRuleDocumentComplianceRecords: {
          [record.id]: {
            ...record,
            revisionHistoryRefs: ['revision:procedure-v1', 'revision:presumed-neutralized'],
          },
        },
      }
    )

    expect(result.changed).toBe(true)
    expect(result.cases[currentCase.id]?.lifecycleStage).toBe('presumed_neutralized')
    expect(result.cases[currentCase.id]?.lifecycleSurveillanceDueWeek).toBe(16)
    expect(result.cases[currentCase.id]?.lifecycleBreachReadinessDueWeek).toBe(20)
    expect(result.appliedEvents).toEqual([
      {
        caseId: currentCase.id,
        event: 'presumed_neutralized_entered',
        fromStage: 'containment',
        toStage: 'presumed_neutralized',
      },
    ])
  })

  it('applyWeeklyCaseLifecycleTick upgrades policy tier for adaptation without leaving containment', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const record = catastropheRecord({ id: currentCase.id, recurrenceCount: 1 })

    const result = applyWeeklyCaseLifecycleTick(
      { [currentCase.id]: currentCase },
      {
        week: 3,
        priorRecurrentCatastropheRecords: { [record.id]: record },
        nextRecurrentCatastropheRecords: {
          [record.id]: { ...record, recurrenceCount: 2, lastOccurrenceWeek: 3 },
        },
      }
    )

    expect(result.changed).toBe(true)
    expect(result.cases[currentCase.id]?.lifecycleStage).toBe('containment')
    expect(result.cases[currentCase.id]?.containmentPolicyTier).toBe('elevated')
    expect(result.appliedDispositions).toEqual([
      {
        caseId: currentCase.id,
        kind: 'policy_tier_upgrade',
        fromTier: 'standard',
        toTier: 'elevated',
      },
    ])
  })
})

describe('caseLifecycleWeeklyOrchestration (SPE-1310 slice 6)', () => {
  it('applyLifecycleInstitutionalLabelProjection sets label from lifecycle stage', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const nextCase = applyLifecycleInstitutionalLabelProjection(currentCase)

    expect(nextCase.lifecycleInstitutionalLabel).toBe('active_anomaly_file')
  })

  it('applyLifecycleInstitutionalLabelProjection ignores containmentPolicyTier', () => {
    const currentCase = makeCase({
      lifecycleStage: 'containment',
      containmentPolicyTier: 'critical',
    })
    const nextCase = applyLifecycleInstitutionalLabelProjection(currentCase)

    expect(nextCase.lifecycleInstitutionalLabel).toBe('active_anomaly_file')
  })

  it('applyWeeklyCaseLifecycleTick projects institutional label on presumed_neutralized entry', () => {
    const currentCase = makeCase({ lifecycleStage: 'containment' })
    const record = complianceRecord({
      id: 'rule-document-compliance:presumed-neutralized-label',
      documentRef: currentCase.id,
      complianceState: 'compliant',
      revisionHistoryRefs: ['revision:procedure-v1'],
    })

    const result = applyWeeklyCaseLifecycleTick(
      { [currentCase.id]: currentCase },
      {
        week: 5,
        priorRuleDocumentComplianceRecords: { [record.id]: record },
        nextRuleDocumentComplianceRecords: {
          [record.id]: {
            ...record,
            revisionHistoryRefs: ['revision:procedure-v1', 'revision:presumed-neutralized'],
          },
        },
      }
    )

    expect(result.cases[currentCase.id]?.lifecycleInstitutionalLabel).toBe(
      'presumed_clear_surveillance_obligations'
    )
  })

  it('applyWeeklyCaseLifecycleTick keeps institutional label stable on policy-tier upgrade only', () => {
    const currentCase = makeCase({
      lifecycleStage: 'containment',
      lifecycleInstitutionalLabel: 'active_anomaly_file',
    })
    const record = catastropheRecord({ id: currentCase.id, recurrenceCount: 1 })

    const result = applyWeeklyCaseLifecycleTick(
      { [currentCase.id]: currentCase },
      {
        week: 3,
        priorRecurrentCatastropheRecords: { [record.id]: record },
        nextRecurrentCatastropheRecords: {
          [record.id]: { ...record, recurrenceCount: 2, lastOccurrenceWeek: 3 },
        },
      }
    )

    expect(result.cases[currentCase.id]?.containmentPolicyTier).toBe('elevated')
    expect(result.cases[currentCase.id]?.lifecycleInstitutionalLabel).toBe('active_anomaly_file')
  })

  it('applyWeeklyCaseLifecycleTick backfills institutional label without lifecycle events', () => {
    const currentCase = makeCase({ lifecycleStage: 'confirmation' })

    const result = applyWeeklyCaseLifecycleTick({ [currentCase.id]: currentCase }, { week: 1 })

    expect(result.changed).toBe(true)
    expect(result.cases[currentCase.id]?.lifecycleInstitutionalLabel).toBe('credibility_screening')
  })
})
