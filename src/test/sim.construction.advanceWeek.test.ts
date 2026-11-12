import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  CONSTRUCTION_INCOMPLETE_FLAG,
  CONSTRUCTION_PROGRESS_MAX,
  getConstructionProgressClockId,
} from '../domain/constructionProgress'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { readProgressClock } from '../domain/progressClocks'

describe('advanceWeek construction progress (SPE-110 / SPE-1562)', () => {
  it('advances construction progress clocks without construction OperationEvents', () => {
    const state = createStartingState()
    const caseId = 'case-construction-test'
    const baseCase = state.cases['case-001']!

    state.cases[caseId] = {
      ...baseCase,
      id: caseId,
      title: 'Construction Site',
      status: 'open',
      spatialFlags: ['ingress:service_door'],
      deadlineRemaining: 4,
      assignedTeamIds: [],
    }

    const next = advanceWeek(state)
    const clockId = getConstructionProgressClockId(caseId)
    const clock = readProgressClock(next, clockId)

    expect(clock).toBeDefined()
    expect(clock!.value).toBeGreaterThan(0)
    expect(clock!.value).toBeLessThanOrEqual(CONSTRUCTION_PROGRESS_MAX)
    expect(next.cases[caseId]?.spatialFlags).toContain(CONSTRUCTION_INCOMPLETE_FLAG)
    expect(
      next.events.some((event) => String(event.type).includes('construction'))
    ).toBe(false)
  })
})
