import { describe, expect, it } from 'vitest'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  applyWeeklyInfiltrationProbeTick,
  evaluateInfiltrationProbe,
  isInfiltrationProbeEligible,
  readInfiltrationProbeState,
} from '../domain/infiltrationProbe'
import type { CaseInstance } from '../domain/models'

function createInfiltrationCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-infiltrate',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('infiltrationProbe', () => {
  it('requires hidden state and infiltration-family tags', () => {
    expect(isInfiltrationProbeEligible(createInfiltrationCase())).toBe(true)
    expect(
      isInfiltrationProbeEligible(
        createInfiltrationCase({ hiddenState: undefined, infiltrationAwareness: 0.2 })
      )
    ).toBe(false)
    expect(
      isInfiltrationProbeEligible(createInfiltrationCase({ tags: ['combat'], requiredTags: [] }))
    ).toBe(false)
  })

  it('advances probe progress and awareness independently per action', () => {
    const baseline = readInfiltrationProbeState(createInfiltrationCase())
    const access = evaluateInfiltrationProbe(baseline, 'probe_access')
    const route = evaluateInfiltrationProbe(access.nextState, 'probe_route')

    expect(access.nextState.probeProgress).toBeGreaterThan(baseline.probeProgress)
    expect(access.nextState.awareness).toBeGreaterThan(baseline.awareness)
    expect(route.nextState.probeProgress).toBeGreaterThan(access.nextState.probeProgress)
    expect(route.nextState.awareness).toBeGreaterThan(access.nextState.awareness)
  })

  it('fires awareness complication without requiring violent escalation', () => {
    const evaluation = evaluateInfiltrationProbe(
      { probeProgress: 0.2, awareness: 0.5, stage: 'probing' },
      'probe_access'
    )

    expect(evaluation.events.some((event) => event.kind === 'awareness_complication')).toBe(true)
    expect(evaluation.nextState.stage).toBe('exposed')
    expect(evaluation.events.some((event) => event.kind === 'escalation_violent')).toBe(false)
  })

  it('reduces awareness on cleanup while still allowing small progress', () => {
    const evaluation = evaluateInfiltrationProbe(
      { probeProgress: 0.4, awareness: 0.62, stage: 'exposed' },
      'cleanup'
    )

    expect(evaluation.nextState.awareness).toBeLessThan(0.62)
    expect(evaluation.nextState.probeProgress).toBeGreaterThan(0.4)
  })

  it('escalates to violent stage at high awareness', () => {
    const evaluation = evaluateInfiltrationProbe(
      { probeProgress: 0.7, awareness: 0.72, stage: 'exposed' },
      'probe_route'
    )

    expect(evaluation.nextState.stage).toBe('violent')
    expect(evaluation.events.some((event) => event.kind === 'escalation_violent')).toBe(true)
  })

  it('merges violent escalation into case counter-detection fields', () => {
    const weekly = applyWeeklyInfiltrationProbeTick(
      createInfiltrationCase({
        infiltrationProbeProgress: 0.65,
        infiltrationAwareness: 0.72,
        infiltrationStage: 'exposed',
      }),
      4,
      'probe_route'
    )

    expect(weekly.changed).toBe(true)
    expect(weekly.case.infiltrationStage).toBe('violent')
    expect(weekly.case.counterDetection).toBe(true)
    expect(weekly.case.detectionConfidence).toBeGreaterThanOrEqual(0.75)
  })
})
