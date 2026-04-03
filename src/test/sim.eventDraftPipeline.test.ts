import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildCaseEscalatedEventDraft,
  buildCaseFailedEventDraft,
  buildCasePartiallyResolvedEventDraft,
  buildCaseRaidConvertedEventDraft,
  buildCaseResolvedEventDraft,
} from '../domain/sim/eventDraftPipeline'

const rewardBreakdown = {
  outcome: 'success',
  caseType: 'general',
  caseTypeLabel: 'General incident',
  operationValue: 10,
  factors: [],
  fundingDelta: 5,
  containmentDelta: 2,
  strategicValueDelta: 3,
  reputationDelta: 1,
  inventoryRewards: [],
  factionStanding: [],
  label: 'Success',
  reasons: [],
} as const

describe('eventDraftPipeline', () => {
  it('builds a resolved event draft with copied team ids', () => {
    const state = createStartingState()
    const caseData = state.cases['case-001']
    const teamIds = [...caseData.assignedTeamIds]

    const draft = buildCaseResolvedEventDraft({
      week: state.week,
      caseData,
      teamIds,
      rewardBreakdown,
      performanceSummary: {
        successRate: 0.8,
        averagePower: 12,
        averagePrecision: 9,
      },
    })

    teamIds.push('t_fake')

    expect(draft).toMatchObject({
      type: 'case.resolved',
      sourceSystem: 'incident',
      payload: {
        week: state.week,
        caseId: caseData.id,
        caseTitle: caseData.title,
        mode: caseData.mode,
        kind: caseData.kind,
        stage: caseData.stage,
        rewardBreakdown,
      },
    })
    expect(draft.payload.teamIds).not.toContain('t_fake')
  })

  it('builds failed and partially_resolved drafts with from/to stage transitions', () => {
    const state = createStartingState()
    const caseData = state.cases['case-001']

    const failed = buildCaseFailedEventDraft({
      week: state.week,
      caseData,
      toStage: caseData.stage + 1,
      teamIds: caseData.assignedTeamIds,
      rewardBreakdown,
    })
    const partial = buildCasePartiallyResolvedEventDraft({
      week: state.week,
      caseData,
      toStage: caseData.stage + 1,
      teamIds: caseData.assignedTeamIds,
      rewardBreakdown,
    })

    expect(failed).toMatchObject({
      type: 'case.failed',
      sourceSystem: 'incident',
      payload: {
        caseId: caseData.id,
        fromStage: caseData.stage,
        toStage: caseData.stage + 1,
      },
    })
    expect(partial).toMatchObject({
      type: 'case.partially_resolved',
      sourceSystem: 'incident',
      payload: {
        caseId: caseData.id,
        fromStage: caseData.stage,
        toStage: caseData.stage + 1,
      },
    })
  })

  it('builds escalated and raid_converted drafts with escalation details', () => {
    const state = createStartingState()
    const caseData = state.cases['case-002']

    const escalated = buildCaseEscalatedEventDraft({
      week: state.week,
      caseData,
      toStage: caseData.stage + 1,
      rewardBreakdown,
      trigger: 'deadline',
      deadlineRemaining: 0,
      convertedToRaid: true,
    })

    const raidConverted = buildCaseRaidConvertedEventDraft({
      week: state.week,
      caseData,
      stage: caseData.stage + 1,
      trigger: 'deadline',
      minTeams: 2,
      maxTeams: 3,
    })

    expect(escalated).toMatchObject({
      type: 'case.escalated',
      sourceSystem: 'incident',
      payload: {
        caseId: caseData.id,
        fromStage: caseData.stage,
        toStage: caseData.stage + 1,
        trigger: 'deadline',
        deadlineRemaining: 0,
        convertedToRaid: true,
        rewardBreakdown,
      },
    })

    expect(raidConverted).toMatchObject({
      type: 'case.raid_converted',
      sourceSystem: 'incident',
      payload: {
        caseId: caseData.id,
        stage: caseData.stage + 1,
        trigger: 'deadline',
        minTeams: 2,
        maxTeams: 3,
      },
    })
  })
})
