import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE } from '../domain/ruleDocumentComplianceContainmentRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyRuleDocumentComplianceTick } from '../domain/ruleDocumentComplianceWeeklyOrchestration'
import type { RuleDocumentComplianceRecord } from '../domain/ruleDocumentComplianceContainmentRegistry'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function elevatedDriftRecord(
  overrides: Partial<RuleDocumentComplianceRecord> = {}
): RuleDocumentComplianceRecord {
  return {
    id: 'rule-document-compliance:integration-elevated-drift',
    label: 'Integration elevated drift record',
    documentRef: 'document:integration-conduct-code',
    bindingStrength: 'contractual',
    complianceState: 'compliant',
    physicalCopyRequired: false,
    ...overrides,
  }
}

describe('advanceWeek rule document compliance integration (SPE-2123 slice 3)', () => {
  it('is a no-op for an empty rule document compliance map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.ruleDocumentComplianceRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.ruleDocumentComplianceRecords).toEqual({})
  })

  it('retains compliance state while projected decay band is stable after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.ruleDocumentComplianceRecords = {
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.ruleDocumentComplianceRecords?.[VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]

    expect(nextState.week).toBe(2)
    expect(record?.complianceState).toBe('compliant')
    expect(record?.physicalCopyRequired).toBe(true)
  })

  it('advances compliant records to drifting when advanceWeek reaches an elevated band week', () => {
    const record = elevatedDriftRecord()
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 139
    state.ruleDocumentComplianceRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const advanced = nextState.ruleDocumentComplianceRecords?.[record.id]

    expect(nextState.week).toBe(140)
    expect(advanced?.complianceState).toBe('drifting')
    expect(advanced?.documentRef).toBe(record.documentRef)
  })

  it('leaves breach records unchanged through advanceWeek', () => {
    const record = elevatedDriftRecord({
      id: 'rule-document-compliance:integration-breach-terminal',
      complianceState: 'breach',
      breachConsequence: 'escalate_review',
    })
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 299
    state.ruleDocumentComplianceRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const advanced = nextState.ruleDocumentComplianceRecords?.[record.id]

    expect(nextState.week).toBe(300)
    expect(advanced).toEqual(record)
  })

  it('matches direct tick output for the post-advance week', () => {
    const record = elevatedDriftRecord()
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 139
    state.ruleDocumentComplianceRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const directTick = applyWeeklyRuleDocumentComplianceTick(
      state.ruleDocumentComplianceRecords,
      nextState.week
    )

    expect(nextState.ruleDocumentComplianceRecords).toEqual(directTick)
  })
})
