import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createInformationIntakeReport } from '../domain/informationIntakeReport'
import type { ExtranormalEventRecord } from '../domain/extranormalEventRegistry'
import { applyWeeklyCaseLifecycleTick } from '../domain/caseLifecycleWeeklyOrchestration'
import type { RuleDocumentComplianceRecord } from '../domain/ruleDocumentComplianceContainmentRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function elevatedDriftComplianceRecord(
  caseId: string,
  overrides: Partial<RuleDocumentComplianceRecord> = {}
): RuleDocumentComplianceRecord {
  return {
    id: 'rule-document-compliance:advance-week-lifecycle-drift',
    label: 'Advance week lifecycle drift record',
    documentRef: caseId,
    bindingStrength: 'contractual',
    complianceState: 'compliant',
    physicalCopyRequired: false,
    ...overrides,
  }
}

describe('advanceWeek case lifecycle integration (SPE-1310 slice 3)', () => {
  it('is a no-op for cases without lifecycleStage when intake credibility review passes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const targetCase = Object.values(state.cases)[0]
    delete targetCase.lifecycleStage

    const report = createInformationIntakeReport({
      id: 'intake:advance-week-uninitialized',
      label: 'Advance week uninitialized lifecycle',
      topicRef: targetCase.id,
      initialSourceClass: 'formal_alert',
      credibility: 'institutional',
      plausibility: 'plausible',
      rumorRisk: 'none',
    })

    state.informationIntakeReports = {
      [report.id]: {
        ...report,
        verificationStatus: 'partially_corroborated',
        corroborationHistory: [
          {
            eventId: 'corr:seed',
            week: 1,
            sourceRef: 'sensor:seed',
            sourceClass: 'technical_trace',
            weight: 0.5,
          },
        ],
      },
    }

    const nextState = advanceWeek(state)

    expect(nextState.cases[targetCase.id]?.lifecycleStage).toBeUndefined()
  })

  it('advances lead to confirmation when linked intake credibility review passes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const targetCase = Object.values(state.cases)[0]
    targetCase.lifecycleStage = 'lead'

    const report = createInformationIntakeReport({
      id: 'intake:advance-week-lead',
      label: 'Advance week lead lifecycle',
      topicRef: targetCase.id,
      initialSourceClass: 'formal_alert',
      credibility: 'institutional',
      plausibility: 'plausible',
      rumorRisk: 'none',
    })

    state.informationIntakeReports = {
      [report.id]: {
        ...report,
        verificationStatus: 'partially_corroborated',
        corroborationHistory: [
          {
            eventId: 'corr:seed',
            week: 1,
            sourceRef: 'sensor:seed',
            sourceClass: 'technical_trace',
            weight: 0.5,
          },
        ],
      },
    }

    const nextState = advanceWeek(state)

    expect(nextState.cases[targetCase.id]?.lifecycleStage).toBe('confirmation')
  })

  it('advances confirmation to containment when extranormal registry confirms anomaly', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const targetCase = Object.values(state.cases)[0]
    targetCase.lifecycleStage = 'confirmation'

    const event: ExtranormalEventRecord = {
      id: 'extranormal:advance-week-confirm',
      label: 'Advance week anomaly confirmation',
      closureState: 'escalated_to_case',
      escalatedCaseRef: targetCase.id,
    }

    state.extranormalEventRecords = {
      [event.id]: event,
    }

    const nextState = advanceWeek(state)

    expect(nextState.cases[targetCase.id]?.lifecycleStage).toBe('containment')
  })
})

describe('advanceWeek case lifecycle integration (SPE-1310 slice 4)', () => {
  it('advances containment to revision when linked compliance drifts through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const targetCase = Object.values(state.cases)[0]
    targetCase.lifecycleStage = 'containment'

    const record = elevatedDriftComplianceRecord(targetCase.id)
    state.week = 139
    state.ruleDocumentComplianceRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)

    expect(nextState.week).toBe(140)
    expect(nextState.cases[targetCase.id]?.lifecycleStage).toBe('revision')
    expect(nextState.ruleDocumentComplianceRecords?.[record.id]?.complianceState).toBe('drifting')
  })

  it('runs containment to revision via advanceWeek then back to containment on registry recovery', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const targetCase = Object.values(state.cases)[0]
    targetCase.lifecycleStage = 'containment'

    const record = elevatedDriftComplianceRecord(targetCase.id)
    state.week = 139
    state.ruleDocumentComplianceRecords = {
      [record.id]: record,
    }

    const afterDriftState = advanceWeek(state)
    expect(afterDriftState.cases[targetCase.id]?.lifecycleStage).toBe('revision')

    const driftingRecord = afterDriftState.ruleDocumentComplianceRecords?.[record.id]
    if (!driftingRecord) {
      throw new Error('expected drifting compliance record after first advanceWeek')
    }

    const priorRecoveryRecords = {
      [record.id]: {
        ...driftingRecord,
        revisionHistoryRefs: ['revision:containment-loop-v1'],
      },
    }
    const nextRecoveryRecords = {
      [record.id]: {
        ...driftingRecord,
        complianceState: 'compliant' as const,
        revisionHistoryRefs: ['revision:containment-loop-v1', 'revision:containment-loop-v2'],
      },
    }

    const recoveryTick = applyWeeklyCaseLifecycleTick(afterDriftState.cases, {
      week: afterDriftState.week,
      priorRuleDocumentComplianceRecords: priorRecoveryRecords,
      nextRuleDocumentComplianceRecords: nextRecoveryRecords,
    })

    expect(recoveryTick.changed).toBe(true)
    expect(recoveryTick.cases[targetCase.id]?.lifecycleStage).toBe('containment')
  })
})
