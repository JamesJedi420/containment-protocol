import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseTemplate } from '../domain/models'
import { applyRaids } from '../domain/sim/raid'
import {
  applySpawnRule,
  instantiateFromTemplate,
  spawnCase,
  spawnFromEscalations,
  spawnFromFailures,
} from '../domain/sim/spawn'

function createSequenceRng(values: number[]) {
  let index = 0

  return () => {
    if (index >= values.length) {
      throw new Error('RNG sequence exhausted')
    }

    return values[index++]!
  }
}

describe('spawn flows', () => {
  it('instantiates deterministic case IDs from templates with seeded rng', () => {
    const state = createStartingState()
    const template = state.templates['chem-001']

    const caseA = instantiateFromTemplate(
      template,
      createSequenceRng([0.25]),
      new Set(['case-001'])
    )
    const caseB = instantiateFromTemplate(
      template,
      createSequenceRng([0.25]),
      new Set(['case-001'])
    )

    expect(caseA.id).toBe(caseB.id)
    expect(caseA.templateId).toBe('chem-001')
    expect(caseA.status).toBe('open')
    expect(caseA.stage).toBe(1)
  })

  it('fills missing optional tag lists when instantiating a template', () => {
    const template: CaseTemplate = {
      templateId: 'custom-001',
      title: 'Custom Template',
      description: 'Custom template for coverage.',
      mode: 'threshold',
      kind: 'case',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      durationWeeks: 1,
      deadlineWeeks: 1,
      tags: [],
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    }

    const caseInstance = instantiateFromTemplate(template, () => 0.25, new Set())

    expect(caseInstance.requiredTags).toEqual([])
    expect(caseInstance.preferredTags).toEqual([])
  })

  it('derives pressure metadata when templates omit explicit pressure fields', () => {
    const template: CaseTemplate = {
      templateId: 'custom-pressure-001',
      title: 'Custom Pressure Template',
      description: 'Custom pressure template for coverage.',
      mode: 'threshold',
      kind: 'case',
      difficulty: { combat: 20, investigation: 40, utility: 35, social: 10 },
      weights: { combat: 0.2, investigation: 0.5, utility: 0.2, social: 0.1 },
      durationWeeks: 2,
      deadlineWeeks: 2,
      tags: ['occult', 'ritual'],
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 2, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    }

    const caseInstance = instantiateFromTemplate(template, () => 0.25, new Set())

    expect(caseInstance.pressureValue).toBeGreaterThan(0)
    expect(caseInstance.regionTag).toBe('occult_district')
  })

  it('applies spawn rule escalation metadata and converts to raid at threshold', () => {
    const state = createStartingState()
    const parent = {
      ...state.cases['case-001'],
      stage: 2,
      weeksRemaining: 1,
      assignedTeamIds: ['team-alpha'],
    }

    const rule = {
      ...parent.onUnresolved,
      stageDelta: 1,
      deadlineResetWeeks: 2,
      convertToRaidAtStage: 3,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['chem-001'],
    }

    const { mutated, spawned, notes } = applySpawnRule(
      parent,
      rule,
      state.templates,
      createSequenceRng([0, 0, 0.2]),
      new Set(Object.keys(state.cases))
    )

    expect(mutated).toMatchObject({
      stage: 3,
      status: 'open',
      kind: 'raid',
      weeksRemaining: undefined,
      deadlineRemaining: 2,
      assignedTeamIds: [],
    })
    expect(spawned).toHaveLength(1)
    expect(spawned[0]).toMatchObject({ templateId: 'chem-001', status: 'open', stage: 1 })
    expect(notes).toContain('Converted to multi-team operation.')
    expect(notes).toContain('1 follow-up operation(s) opened.')
  })

  it('falls back to available templates when requested spawn template IDs are missing', () => {
    const state = createStartingState()
    const parent = state.cases['case-001']
    const templates = { 'bio-001': state.templates['bio-001'] }

    const { spawned } = applySpawnRule(
      parent,
      {
        ...parent.onFail,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['missing-template'],
      },
      templates,
      createSequenceRng([0, 0, 0, 0.3]),
      new Set(Object.keys(state.cases))
    )

    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.templateId).toBe('bio-001')
  })

  it('prefers valid requested spawn templates when the list contains missing entries', () => {
    const state = createStartingState()
    const parent = state.cases['case-001']

    const { spawned } = applySpawnRule(
      parent,
      {
        ...parent.onFail,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['missing-template', 'bio-001'],
      },
      state.templates,
      createSequenceRng([0, 0.4, 0.2]),
      new Set(Object.keys(state.cases))
    )

    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.templateId).toBe('bio-001')
  })

  it('returns no spawn notes when the spawn count is zero', () => {
    const state = createStartingState()
    const parent = state.cases['case-001']

    const { spawned, notes } = applySpawnRule(
      parent,
      {
        ...parent.onFail,
        spawnCount: { min: 0, max: 0 },
        spawnTemplateIds: ['bio-001'],
      },
      state.templates,
      createSequenceRng([0]),
      new Set(Object.keys(state.cases))
    )

    expect(spawned).toHaveLength(0)
    expect(notes).toEqual([])
  })

  it('returns no spawn cases when no templates are available for a rule', () => {
    const state = createStartingState()
    const parent = state.cases['case-001']

    const { spawned, notes } = applySpawnRule(
      parent,
      {
        ...parent.onFail,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['missing-template'],
      },
      {},
      createSequenceRng([0]),
      new Set(Object.keys(state.cases))
    )

    expect(spawned).toHaveLength(0)
    expect(notes).toEqual([])
  })

  it('reserves unique IDs across failure spawns in the same batch', () => {
    const state = createStartingState()
    const startingCaseCount = Object.keys(state.cases).length

    state.cases['case-001'] = {
      ...state.cases['case-001'],
      onFail: {
        ...state.cases['case-001'].onFail,
        spawnCount: { min: 2, max: 2 },
        spawnTemplateIds: ['chem-001'],
      },
    }

    const rng = createSequenceRng([0, 0, 0, 0, 0, 0.1])
    const next = spawnFromFailures(state, ['case-001'], rng)

    expect(next.spawnedCaseIds).toHaveLength(2)
    expect(new Set(next.spawnedCaseIds).size).toBe(2)
    expect(Object.keys(next.state.cases)).toHaveLength(startingCaseCount + 2)
  })

  it('returns the original state when escalation sources are missing', () => {
    const state = createStartingState()
    const next = spawnFromEscalations(state, ['missing-case'], createSequenceRng([0]))

    expect(next.state).toBe(state)
    expect(next.spawnedCaseIds).toEqual([])
    expect(next.notes).toEqual([])
  })

  it('spawns a raid spillover case with raid metadata', () => {
    const state = createStartingState()
    const raidCase = spawnCase(state, state.cases['case-001'], 'raid', ['raid-001'], () => 0.1)

    expect(raidCase.kind).toBe('raid')
    expect(raidCase.stage).toBe(2)
    expect(raidCase.title).toMatch(/raid spillover/i)
    expect(raidCase.raid).toEqual(state.templates['raid-001'].raid)
  })

  it('spawns an escalation case without raid spillover metadata', () => {
    const state = createStartingState()
    const escalationCase = spawnCase(
      state,
      state.cases['case-001'],
      'escalation',
      ['chem-001'],
      () => 0.1
    )

    expect(escalationCase.kind).toBe('case')
    expect(escalationCase.stage).toBe(2)
    expect(escalationCase.title).toBe(state.templates['chem-001'].title)
    expect(escalationCase.raid).toEqual(state.templates['chem-001'].raid)
  })

  it('throws when spawning a case from an empty template catalog', () => {
    const state = createStartingState()
    state.templates = {}

    expect(() => spawnCase(state, null, 'escalation', [], () => 0.1)).toThrow(
      'No templates available in state'
    )
  })

  it('reserves unique IDs when a raid spawns multiple spillover cases', () => {
    const state = createStartingState()
    const startingCaseCount = Object.keys(state.cases).length

    state.templates = {
      'chem-001': state.templates['chem-001'],
    }
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      stage: 3,
      status: 'open',
    }

    const rng = createSequenceRng([0, 0, 0, 0, 0, 0, 0.1])
    const next = applyRaids(state, ['case-001'], rng)

    expect(next.spawnedCaseIds).toHaveLength(2)
    expect(new Set(next.spawnedCaseIds).size).toBe(2)
    expect(Object.keys(next.state.cases)).toHaveLength(startingCaseCount + 2)
    expect(next.spawnedCaseIds.every((caseId) => next.state.cases[caseId]?.kind === 'raid')).toBe(
      true
    )
  })
})
