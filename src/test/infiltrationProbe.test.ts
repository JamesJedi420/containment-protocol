import { describe, expect, it } from 'vitest'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  applyWeeklyInfiltrationProbeTick,
  copyInfiltrationProbePlan,
  evaluateInfiltrationProbe,
  getInfiltrationStagePressure,
  isInfiltrationProbeEligible,
  readInfiltrationProbeState,
  resolveWeeklyInfiltrationProbeAction,
} from '../domain/infiltrationProbe'
import { caseTemplateMap } from '../domain/templates/caseTemplates'
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

  it('maps probing-stage awareness to disguise pressure only above complication threshold', () => {
    const probingCase = createInfiltrationCase({ infiltrationStage: 'probing' })

    expect(getInfiltrationStagePressure(probingCase, AWARENESS_COMPLICATION_THRESHOLD - 0.1)).toBe(
      0
    )
    expect(getInfiltrationStagePressure(probingCase, AWARENESS_COMPLICATION_THRESHOLD + 0.05)).toBe(
      0.5
    )
    expect(
      getInfiltrationStagePressure(
        { ...probingCase, infiltrationStage: 'exposed' },
        AWARENESS_COMPLICATION_THRESHOLD - 0.2
      )
    ).toBe(0.5)
  })

  it('resolves weekly action from authored plan before tag heuristics', () => {
    const ops004Plan = copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan)
    const ops001Plan = copyInfiltrationProbePlan(caseTemplateMap['ops-001'].infiltrationProbePlan)

    expect(
      resolveWeeklyInfiltrationProbeAction(
        createInfiltrationCase({
          infiltrationProbePlan: ops004Plan,
          infiltrationAwareness: 0.56,
        })
      )
    ).toBe('cleanup')

    expect(
      resolveWeeklyInfiltrationProbeAction(
        createInfiltrationCase({
          infiltrationProbePlan: ops004Plan,
          infiltrationAwareness: 0.4,
        })
      )
    ).toBe('probe_access')

    expect(
      resolveWeeklyInfiltrationProbeAction(
        createInfiltrationCase({
          infiltrationProbePlan: ops001Plan,
          infiltrationProbeProgress: 0.6,
        })
      )
    ).toBe('probe_route')

    expect(
      resolveWeeklyInfiltrationProbeAction(
        createInfiltrationCase({
          infiltrationProbePlan: ops001Plan,
          infiltrationProbeProgress: 0.2,
        })
      )
    ).toBe('probe_access')
  })

  it('selects probe_route via tag heuristics when no plan is present', () => {
    expect(
      resolveWeeklyInfiltrationProbeAction(
        createInfiltrationCase({
          infiltrationProbePlan: undefined,
          tags: ['infiltration', 'cyber'],
        })
      )
    ).toBe('probe_route')
  })

  it('applies resolved weekly action when action override is omitted', () => {
    const weekly = applyWeeklyInfiltrationProbeTick(
      createInfiltrationCase({
        infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
        infiltrationAwareness: 0.56,
        infiltrationProbeProgress: 0.3,
      }),
      2
    )

    expect(weekly.changed).toBe(true)
    expect(weekly.case.infiltrationAwareness).toBeLessThan(0.56)
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
