import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseInstance } from '../domain/models'
import { buildEscalationConsequenceNote } from '../domain/reportNotes'
import { createDeadlineEscalationTransition } from '../domain/sim/escalation'

const makeEscalationCase = (overrides: Partial<CaseInstance> = {}): CaseInstance => ({
  ...createStartingState().cases['case-001'],
  id: 'case-esc-1',
  templateId: 'case-escalation-consequence',
  title: 'Escalation Fixture',
  description: 'Fixture for escalation consequence note coverage.',
  kind: 'standard',
  stage: 4,
  deadlineRemaining: 2,
  deadlineWeeks: 2,
  onUnresolved: { stageDelta: 1, deadlineResetWeeks: 2, convertToRaidAtStage: 5 },
  tags: ['containment-specialist'],
  threatFamily: 'containment',
  assignedTeamIds: [],
  ...overrides,
})

describe('escalation consequence integration', () => {
  it('routes severe-hit outcomes for max escalation without countermeasures', () => {
    const { nextCase } = createDeadlineEscalationTransition(makeEscalationCase({ tags: [] }))

    expect(nextCase.stage).toBe(5)
    expect(nextCase.consequences).toContain('contained')
    expect(nextCase.severeHit).toContain('breach')

    const note = buildEscalationConsequenceNote(nextCase, 1)

    expect(note).not.toBeNull()
    expect(note?.content).toContain('Escalation Consequences')
    expect(note?.content).toContain('No effective countermeasures present.')
    expect(note?.metadata?.severeHit ?? []).toContain('breach')
  })

  it('applies only consequence ladder if countermeasures present', () => {
    const { nextCase } = createDeadlineEscalationTransition(
      makeEscalationCase({ tags: ['containment-specialist'] })
    )

    expect(nextCase.consequences).toContain('contained')
    expect(nextCase.severeHit).toHaveLength(0)

    const note = buildEscalationConsequenceNote(nextCase, 1)

    expect(note).not.toBeNull()
    expect(note?.content).toContain('Effective countermeasures: containment-specialist')
    expect(note?.metadata?.severeHit ?? []).toHaveLength(0)
  })

  it('routes catastrophic band consequences for low stage', () => {
    const { nextCase } = createDeadlineEscalationTransition(
      makeEscalationCase({ stage: -1, tags: [] })
    )

    expect(nextCase.stage).toBe(0)
    expect(nextCase.consequences).toContain('breach')
    expect(nextCase.severeHit).toHaveLength(0)
  })
})
