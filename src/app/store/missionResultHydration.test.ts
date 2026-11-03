import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { hydrateGame, stripGameTemplates } from './runTransfer'

function hydrateSnapshot(fields: Record<string, unknown>) {
  const fallback = createStartingState()
  const caseId = Object.keys(fallback.cases)[0]!
  const saved = {
    ...stripGameTemplates(fallback),
    week: 4,
    cases: {
      ...fallback.cases,
      [caseId]: {
        ...fallback.cases[caseId],
        detectionConfidence: 0.9,
        counterDetection: true,
        displacementTarget: 'current-site',
      },
    },
    reports: [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: [caseId],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
        caseSnapshots: {
          [caseId]: {
            caseId,
            title: 'Historical case',
            kind: 'case',
            mode: 'threshold',
            status: 'resolved',
            stage: 1,
            deadlineRemaining: 0,
            durationWeeks: 1,
            assignedTeamIds: [],
            missionResult: { caseId, outcome: 'success', ...fields },
          },
        },
      },
    ],
  } as unknown as Partial<GameState>
  const hydrated = hydrateGame(saved, fallback)
  return { caseId, fallback, hydrated }
}

describe('weekly report mission-result concealment hydration', () => {
  it.each([
    { detectionConfidence: 0.25, counterDetection: false, displacementTarget: null },
    { detectionConfidence: 1, counterDetection: true, displacementTarget: 'site-alpha' },
    { detectionConfidence: 0, counterDetection: false, displacementTarget: 'site-beta' },
  ])('preserves valid optional fields through repeated hydration: %o', (fields) => {
    const { caseId, fallback, hydrated } = hydrateSnapshot(fields)
    expect(hydrated.reports[0]?.caseSnapshots?.[caseId]?.missionResult).toMatchObject(fields)
    const rehydrated = hydrateGame(stripGameTemplates(hydrated), fallback)
    expect(rehydrated.reports[0]?.caseSnapshots?.[caseId]?.missionResult).toMatchObject(fields)
  })

  it.each([
    { value: -2, expected: 0 },
    { value: 3, expected: 1 },
  ])('bounds finite confidence $value to $expected', ({ value, expected }) => {
    const { caseId, hydrated } = hydrateSnapshot({ detectionConfidence: value })
    expect(hydrated.reports[0]?.caseSnapshots?.[caseId]?.missionResult?.detectionConfidence).toBe(
      expected
    )
  })

  it.each([
    {},
    { detectionConfidence: Number.NaN, counterDetection: 'false', displacementTarget: '' },
    { detectionConfidence: Number.POSITIVE_INFINITY, counterDetection: 0, displacementTarget: {} },
    { detectionConfidence: '0.25', counterDetection: null, displacementTarget: '   ' },
  ])('does not invent missing or malformed historical fields: %o', (fields) => {
    const { caseId, hydrated } = hydrateSnapshot(fields)
    const result = hydrated.reports[0]?.caseSnapshots?.[caseId]?.missionResult
    expect(result).toBeDefined()
    expect(result).not.toHaveProperty('detectionConfidence')
    expect(result).not.toHaveProperty('counterDetection')
    expect(result).not.toHaveProperty('displacementTarget')
  })
})
