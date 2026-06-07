import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
} from '../domain/namingHazardDescriptorRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyNamingHazardDescriptorTick } from '../domain/namingHazardDescriptorWeeklyOrchestration'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek naming-hazard descriptor integration (SPE-2116 slice 4)', () => {
  it('is a no-op for an empty naming-hazard map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.namingHazardDescriptorRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.namingHazardDescriptorRecords).toEqual({})
  })

  it('escalates substitution policy after advanceWeek on persisted records', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.namingHazardDescriptorRecords?.[CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]

    expect(nextState.week).toBe(5)
    expect(nextRecord?.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
    expect(nextRecord?.unknownFields).toEqual(['orchestration_week:5'])
    expect(nextRecord?.safeDescriptorPool).toEqual(
      CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.safeDescriptorPool
    )
  })

  it('applies only one orchestration step per week after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 1
    state.namingHazardDescriptorRecords = {
      [DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]: DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.namingHazardDescriptorRecords?.[DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]

    expect(nextState.week).toBe(2)
    expect(nextRecord?.uiSubstitutionPolicy).toBe('redacted')
    expect(nextRecord?.mapLabelMode).toBe('redacted')
    expect(nextRecord?.confidence).toBe(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.confidence)
  })

  it('matches direct tick output for the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 3
    state.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const directTick = applyWeeklyNamingHazardDescriptorTick(
      state.namingHazardDescriptorRecords,
      nextState.week
    )

    expect(nextState.namingHazardDescriptorRecords).toEqual(directTick)
  })
})
