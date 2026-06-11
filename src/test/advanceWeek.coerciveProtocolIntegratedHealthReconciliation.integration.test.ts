import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE } from '../domain/coerciveContainedPersonProtocolRegistry'
import { INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE } from '../domain/psychologicalResilienceRegistry'
import { SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE } from '../domain/surveillanceCapacityInterventionTuningRegistry'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek coercive protocol integrated health reconciliation integration (SPE-2429 slice 2)', () => {
  it('surfaces cross-reconciliation notes when linked fixtures coexist', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    state.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const reconciliationNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'coercive_protocol.integrated_health_reconciliation'
      ) ?? []

    expect(reconciliationNotes.length).toBeGreaterThan(0)
    expect(reconciliationNotes[0]?.content).toContain('Coercive protocol cross-link')
    expect(reconciliationNotes[0]?.content).toContain('subject:cooperative-field-asset-22')
  })

  it('is a no-op when either map is empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const reconciliationNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'coercive_protocol.integrated_health_reconciliation'
      ) ?? []

    expect(reconciliationNotes).toEqual([])
  })
})

describe('advanceWeek coercive protocol integrated health reconciliation integration (SPE-2439 slice 4)', () => {
  it('surfaces surveillance-tuning tension flags when tuning records coexist', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    state.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }
    state.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const reconciliationNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'coercive_protocol.integrated_health_reconciliation'
      ) ?? []

    expect(reconciliationNotes.length).toBeGreaterThan(0)
    expect(reconciliationNotes[0]?.content).toContain('1 tuning record(s)')
    expect(reconciliationNotes[0]?.content).toContain('Surveillance Tuning Monitoring Exceeds Contact')
    expect(reconciliationNotes[0]?.content).toContain(
      `${SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id} (${SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.label})`
    )
    expect(reconciliationNotes[0]?.metadata?.linkedTuningCount).toBe(1)
  })
})

describe('advanceWeek coercive protocol integrated health reconciliation integration (SPE-2440 slice 5)', () => {
  it('surfaces psychological-resilience tension flags when resilience records coexist', () => {
    const protocolWithOperatorLink = {
      ...ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      subjectFitValidationRef: PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef,
    }
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {
      [protocolWithOperatorLink.id]: protocolWithOperatorLink,
    }
    state.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const reconciliationNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'coercive_protocol.integrated_health_reconciliation'
      ) ?? []

    expect(reconciliationNotes.length).toBeGreaterThan(0)
    expect(reconciliationNotes[0]?.content).toContain('1 resilience record(s)')
    expect(reconciliationNotes[0]?.content).toContain('Psychological Resilience Exposure Elevated')
    expect(reconciliationNotes[0]?.content).toContain(
      `${PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id} (${PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.label})`
    )
    expect(reconciliationNotes[0]?.metadata?.linkedResilienceCount).toBe(1)
  })
})
