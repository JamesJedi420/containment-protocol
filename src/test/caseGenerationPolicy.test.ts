import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyTemplateDiversityWeight,
  deriveTemplateFamily,
  getRecentSpawnedTemplateCounts,
} from '../domain/caseGenerationPolicy'

describe('caseGenerationPolicy', () => {
  it('derives template family from id prefix', () => {
    expect(deriveTemplateFamily('ops-009')).toBe('ops')
    expect(deriveTemplateFamily('followup_blackout')).toBe('followup_blackout')
  })

  it('suppresses recently repeated templates', () => {
    const state = createStartingState()
    const template = state.templates['ops-001']

    const stateWithRecentSpawns = {
      ...state,
      week: 8,
      events: [
        {
          id: 'evt-case-spawn-1',
          schemaVersion: 1 as const,
          type: 'case.spawned' as const,
          sourceSystem: 'incident' as const,
          timestamp: '2026-01-01T00:00:00.000Z',
          payload: {
            week: 7,
            caseId: 'case-a',
            caseTitle: 'A',
            templateId: 'ops-001',
            kind: 'case' as const,
            stage: 1,
            trigger: 'world_activity' as const,
          },
        },
        {
          id: 'evt-case-spawn-2',
          schemaVersion: 1 as const,
          type: 'case.spawned' as const,
          sourceSystem: 'incident' as const,
          timestamp: '2026-01-02T00:00:00.000Z',
          payload: {
            week: 8,
            caseId: 'case-b',
            caseTitle: 'B',
            templateId: 'ops-001',
            kind: 'case' as const,
            stage: 1,
            trigger: 'world_activity' as const,
          },
        },
      ],
    }

    const baselineWeight = applyTemplateDiversityWeight(template, 2, state)
    const suppressedWeight = applyTemplateDiversityWeight(template, 2, stateWithRecentSpawns)

    expect(suppressedWeight).toBeLessThan(baselineWeight)
  })

  it('applies unseen-family bonus when no recent family spawns exist', () => {
    const state = createStartingState()
    const template = state.templates['occult-008']

    const recentCounts = getRecentSpawnedTemplateCounts(state, 4)
    expect(recentCounts.familyCounts.get('occult')).toBeUndefined()

    const adjustedWeight = applyTemplateDiversityWeight(template, 1, state)
    expect(adjustedWeight).toBeGreaterThan(1)
  })
})
