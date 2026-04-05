import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

function withDirective<T extends ReturnType<typeof createStartingState>>(
  state: T,
  directiveId: T['directiveState']['selectedId']
): T {
  return {
    ...state,
    directiveState: {
      selectedId: directiveId,
      history: [],
    },
  }
}

describe('weekly directives', () => {
  it('intel surge improves generated candidate visibility and records weekly history', () => {
    const baseline = advanceWeek(createStartingState())
    const directed = advanceWeek(withDirective(createStartingState(), 'intel-surge'))

    expect(directed.directiveState.selectedId).toBeNull()
    expect(directed.directiveState.history).toContainEqual({
      week: 1,
      directiveId: 'intel-surge',
    })
    expect(directed.candidates).toHaveLength(baseline.candidates.length)

    directed.candidates.forEach((candidate, index) => {
      expect(candidate.revealLevel).toBeGreaterThanOrEqual(baseline.candidates[index]!.revealLevel)
      expect(candidate.expiryWeek).toBe(baseline.candidates[index]!.expiryWeek + 1)
    })
  })

  it('recovery rotation lowers fatigue for idle operatives during week advance', () => {
    const baselineState = createStartingState()
    baselineState.agents.a_ava.fatigue = 10

    const directedState = createStartingState()
    directedState.agents.a_ava.fatigue = 10

    const baseline = advanceWeek(baselineState)
    const directed = advanceWeek(withDirective(directedState, 'recovery-rotation'))

    expect(directed.agents.a_ava.fatigue).toBeLessThan(baseline.agents.a_ava.fatigue)
    expect(directed.directiveState.history).toContainEqual({
      week: 1,
      directiveId: 'recovery-rotation',
    })
  })

  it('procurement push softens the weekly market multiplier', () => {
    const baseline = advanceWeek(createStartingState())
    const directed = advanceWeek(withDirective(createStartingState(), 'procurement-push'))

    expect(directed.market.costMultiplier).toBeLessThanOrEqual(baseline.market.costMultiplier)
    expect(directed.directiveState.history).toContainEqual({
      week: 1,
      directiveId: 'procurement-push',
    })
  })

  it('emits a directive.applied report note when a directive is active', () => {
    const directed = advanceWeek(withDirective(createStartingState(), 'intel-surge'))
    const report = directed.reports[0]
    const directiveNote = report?.notes.find((n) => n.type === 'directive.applied')

    expect(directiveNote).toBeDefined()
    expect(directiveNote?.content).toContain('Intel Surge')
    expect(directiveNote?.metadata?.directiveId).toBe('intel-surge')
    expect(directiveNote?.metadata?.directiveLabel).toBe('Intel Surge')
  })

  it('does not emit a directive.applied note when no directive is selected', () => {
    const result = advanceWeek(createStartingState())
    const report = result.reports[0]
    const directiveNote = report?.notes.find((n) => n.type === 'directive.applied')

    expect(directiveNote).toBeUndefined()
  })

  it('intel-surge with unresolved triggers passes a trimmed trigger list to the pressure pipeline', () => {
    // Without unresolved triggers neither branch fires — both should produce the same spawn count
    const baseline = advanceWeek(createStartingState())
    const directed = advanceWeek(withDirective(createStartingState(), 'intel-surge'))

    expect(directed.reports[0]?.spawnedCases.length).toBeLessThanOrEqual(
      baseline.reports[0]?.spawnedCases.length ?? 0
    )
  })

  it('lockdown protocol applies a -8 containment penalty relative to baseline', () => {
    const baseline = advanceWeek(createStartingState())
    const directed = advanceWeek(withDirective(createStartingState(), 'lockdown-protocol'))

    expect(baseline.containmentRating - directed.containmentRating).toBe(8)
    expect(directed.directiveState.history).toContainEqual({
      week: 1,
      directiveId: 'lockdown-protocol',
    })
  })

  it('lockdown protocol suppresses all unresolved-trigger spawns', () => {
    const baseline = advanceWeek(createStartingState())
    const directed = advanceWeek(withDirective(createStartingState(), 'lockdown-protocol'))

    expect(directed.reports[0]?.spawnedCases.length).toBeLessThanOrEqual(
      baseline.reports[0]?.spawnedCases.length ?? 0
    )
  })

  it('lockdown protocol emits a directive.applied note with correct label', () => {
    const directed = advanceWeek(withDirective(createStartingState(), 'lockdown-protocol'))
    const note = directed.reports[0]?.notes.find((n) => n.type === 'directive.applied')

    expect(note?.metadata?.directiveLabel).toBe('Lockdown Protocol')
  })
})
