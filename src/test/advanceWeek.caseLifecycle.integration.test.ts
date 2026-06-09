import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createInformationIntakeReport } from '../domain/informationIntakeReport'
import type { ExtranormalEventRecord } from '../domain/extranormalEventRegistry'
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
