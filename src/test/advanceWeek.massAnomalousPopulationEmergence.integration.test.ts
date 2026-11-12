import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
  type PopulationEmergenceRecord,
} from '../domain/massAnomalousPopulationEmergenceRegistry'
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

function zeroBacklogCopy(record: PopulationEmergenceRecord): PopulationEmergenceRecord {
  return {
    ...record,
    registrationBacklogWeeks: 0,
  }
}

describe('advanceWeek mass anomalous population emergence integration (SPE-2122 slice 3)', () => {
  it('is a no-op for an empty population emergence map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.massAnomalousPopulationEmergenceRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.massAnomalousPopulationEmergenceRecords).toEqual({})
  })

  it('decays registration backlog after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 12
    state.massAnomalousPopulationEmergenceRecords = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.massAnomalousPopulationEmergenceRecords?.[MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]

    expect(nextState.week).toBe(13)
    expect(nextRecord?.registrationBacklogWeeks).toBe(5)
    expect(nextRecord?.triageLanes).toEqual(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.triageLanes)
    expect(nextRecord?.securitySurgeRefs).toEqual(
      MANAGED_DISCLOSURE_BACKLOG_FIXTURE.securitySurgeRefs
    )
  })

  it('preserves zero-backlog fixture copies byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 8
    const managedCopy = zeroBacklogCopy(MANAGED_DISCLOSURE_BACKLOG_FIXTURE)
    const collapsedCopy = zeroBacklogCopy(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE)
    state.massAnomalousPopulationEmergenceRecords = {
      [managedCopy.id]: managedCopy,
      [collapsedCopy.id]: collapsedCopy,
    }

    const nextState = advanceWeek(state)

    expect(
      nextState.massAnomalousPopulationEmergenceRecords?.[MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]
    ).toEqual(managedCopy)
    expect(
      nextState.massAnomalousPopulationEmergenceRecords?.[
        COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id
      ]
    ).toEqual(collapsedCopy)
  })

  it('decays multiple records in stable id order through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 20
    state.massAnomalousPopulationEmergenceRecords = {
      [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(
      nextState.massAnomalousPopulationEmergenceRecords?.[MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]
        ?.registrationBacklogWeeks
    ).toBe(5)
    expect(
      nextState.massAnomalousPopulationEmergenceRecords?.[
        COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id
      ]?.registrationBacklogWeeks
    ).toBe(9)
  })
})
