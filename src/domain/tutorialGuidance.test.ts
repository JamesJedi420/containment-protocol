import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { setPersistentFlag } from './flagSystem'
import {
  createOperationalExplanationRecord,
  projectOperationalExplanation,
} from './operationalExplanation'
import { selectTutorialGuidance } from './tutorialGuidance'
import type { TutorialGuidanceAdapters, TutorialInputMethod } from './tutorialGuidance'
import {
  createTutorialRegistry,
  createTutorialState,
  transitionTutorial,
} from './tutorialLifecycle'

const definition = createTutorialRegistry([
  {
    id: 'guide',
    version: 1,
    kind: 'contextual',
    allowBack: true,
    replayable: true,
    conditionIds: ['known'],
    steps: [
      { id: 'inspect', conditionIds: ['panel'], triggerId: 'opened', expectedActionId: 'inspect' },
    ],
  },
]).definitions[0]
const game = setPersistentFlag(createStartingState(), 'visible', true)
const context = { activeContextId: 'panel' }
const record = createOperationalExplanationRecord({
  source: { system: 'department_workshop', recordType: 'work_order', recordId: 'work-1' },
  subjectId: 'work-1',
  reasonCode: 'work.blocked',
  severity: 'blocked',
  lifecycle: 'active',
  summary: 'Work is blocked',
  cause: 'Required review is pending',
  currentEffect: 'Cannot start',
  projectedConsequence: 'Delayed outcome',
  correctionCondition: 'Complete review',
  correctiveAction: { label: 'Open review', route: '/review' },
  confidence: 'limited',
  provenance: ['review'],
  blockerCodes: ['pending'],
})
const adapters: TutorialGuidanceAdapters<typeof context> = {
  conditions: { known: { flags: { allFlags: ['visible'] } }, panel: { activeContexts: ['panel'] } },
  resolveContent: () => [
    'Inspect this work order.',
    'Scope: this order only.',
    'Estimate is contested; ask the owner to override.',
  ],
  resolveAction: () => ({
    visible: true,
    label: 'Inspect order',
    available: false,
    explanations: [{ record, permittedDepth: 'detail' }],
  }),
  resolveBinding: () => ({ label: 'Remapped control' }),
}
const input = {
  game,
  context,
  definition,
  triggerIds: ['opened'],
  adapters,
  accessibility: { inputMethod: 'keyboard' as const, supportedInputs: ['keyboard' as const] },
}

describe('tutorial guidance adapters', () => {
  it('uses authoritative route conditions without exposing evaluation diagnostics', () => {
    const result = selectTutorialGuidance(input)!
    expect(result.stepId).toBe('inspect')
    expect(result).not.toHaveProperty('eligibility')
    expect(selectTutorialGuidance({ ...input, game: createStartingState() })).toBeUndefined()
    expect(
      selectTutorialGuidance({ ...input, context: { activeContextId: 'elsewhere' } })
    ).toBeUndefined()
    expect(selectTutorialGuidance({ ...input, triggerIds: [] })).toBeUndefined()
  })

  it('shares eligibility with lifecycle commands and does not reconsume an active trigger', () => {
    const started = transitionTutorial(
      definition,
      createTutorialState(definition),
      { type: 'start', expectedRevision: 0 },
      { conditions: { known: { passes: true }, panel: { passes: true } }, triggerIds: ['opened'] }
    ).state
    expect(selectTutorialGuidance({ ...input, lifecycle: started, triggerIds: [] })).toBeDefined()
    expect(
      selectTutorialGuidance({ ...input, lifecycle: started, game: createStartingState() })
    ).toBeUndefined()
  })

  it('fails closed for missing and inherited condition adapters', () => {
    for (const conditions of [
      undefined,
      {},
      Object.create(adapters.conditions ?? {}),
      { known: undefined },
    ]) {
      expect(
        selectTutorialGuidance({ ...input, adapters: { ...adapters, conditions } })
      ).toBeUndefined()
    }
  })

  it.each(['completed', 'dismissed', 'skipped', 'suppressed', 'interrupted', 'canceled'] as const)(
    'does not resurrect %s guidance',
    (status) => {
      expect(
        selectTutorialGuidance({
          ...input,
          lifecycle: {
            ...createTutorialState(definition),
            status,
            ...(status === 'suppressed' ? { resumeStatus: 'not_started' as const } : {}),
          },
        })
      ).toBeUndefined()
    }
  )

  it('rejects stale lifecycle versions without invoking content owners', () => {
    const content = vi.fn(adapters.resolveContent)
    expect(
      selectTutorialGuidance({
        ...input,
        lifecycle: { ...createTutorialState(definition), definitionVersion: 2 },
        adapters: { ...adapters, resolveContent: content },
      })
    ).toBeUndefined()
    expect(content).not.toHaveBeenCalled()
  })

  it('hides empty or owner-hidden guidance', () => {
    for (const content of [undefined, [], [''], ['Valid', ' ']]) {
      expect(
        selectTutorialGuidance({
          ...input,
          adapters: { ...adapters, resolveContent: () => content },
        })
      ).toBeUndefined()
    }
  })

  it('never resolves bindings or exposes data for hidden or missing actions', () => {
    const binding = vi.fn(adapters.resolveBinding)
    for (const action of [undefined, { visible: false as const }]) {
      expect(
        selectTutorialGuidance({
          ...input,
          adapters: { ...adapters, resolveBinding: binding, resolveAction: () => action },
        })
      ).toBeUndefined()
    }
    expect(binding).not.toHaveBeenCalled()
    expect(
      selectTutorialGuidance({
        ...input,
        adapters: {
          conditions: adapters.conditions,
          resolveContent: adapters.resolveContent,
          resolveBinding: binding,
        },
      })
    ).toBeUndefined()
    expect(binding).not.toHaveBeenCalled()
  })

  it('reuses the shared explanation projection capped by the owner', () => {
    const result = selectTutorialGuidance({ ...input, explanationDepth: 'diagnostic' })!
    expect(result.explanations).toEqual([projectOperationalExplanation(record, 'detail')])
    expect(result.explanations[0]).not.toHaveProperty('provenance')
    expect(result.explanations[0]).not.toHaveProperty('projectedConsequence')
    expect(result.semanticText).toContain('Confidence: limited.')
    expect(result.semanticText).toContain('Complete review')
    expect(result.action?.available).toBe(false)
    expect(result.semanticText).toContain('Inspect order: currently unavailable.')
  })

  it('honors the requested shallower depth', () => {
    const result = selectTutorialGuidance(input)!
    expect(result.explanations).toEqual([projectOperationalExplanation(record, 'summary')])
    expect(result.semanticText.join(' ')).not.toContain(record.cause)
  })

  it('drops malformed and ambiguous explanations while keeping ordinary unavailable guidance', () => {
    const result = selectTutorialGuidance({
      ...input,
      adapters: {
        ...adapters,
        resolveAction: () => ({
          visible: true,
          label: 'Inspect',
          available: false,
          explanations: [
            { record, permittedDepth: 'summary' },
            { record, permittedDepth: 'diagnostic' },
            { record: { ...record, id: 'bad' }, permittedDepth: 'summary' },
          ],
        }),
      },
    })!
    expect(result.explanations).toEqual([])
    expect(result.semanticText).toContain('Inspect: currently unavailable.')
  })

  it('does not request explanations or controls for a step without an action', () => {
    const action = vi.fn(adapters.resolveAction)
    const result = selectTutorialGuidance({
      ...input,
      definition: { ...definition, steps: [{ id: 'inspect' }] },
      adapters: { ...adapters, resolveAction: action },
    })!
    expect(result.action).toBeUndefined()
    expect(result.semanticText).toEqual(
      adapters.resolveContent(game, context, definition, definition.steps[0])
    )
    expect(action).not.toHaveBeenCalled()
  })

  it.each(['keyboard', 'controller', 'pointer', 'touch'] as TutorialInputMethod[])(
    'resolves current %s bindings without altering definitions',
    (method) => {
      let label = 'First mapping'
      const binding = vi.fn(() => ({ label }))
      const configured = {
        ...input,
        accessibility: { inputMethod: method, supportedInputs: [method] },
        adapters: { ...adapters, resolveBinding: binding },
      }
      expect(selectTutorialGuidance(configured)?.action?.bindingLabel).toBe('First mapping')
      label = 'New mapping'
      expect(selectTutorialGuidance(configured)?.action?.bindingLabel).toBe('New mapping')
      expect(binding).toHaveBeenLastCalledWith('inspect', method)
      expect(definition.steps[0].expectedActionId).toBe('inspect')
    }
  )

  it('uses deterministic nonblocking fallbacks for missing bindings or capabilities', () => {
    const missing = selectTutorialGuidance({
      ...input,
      adapters: { ...adapters, resolveBinding: () => undefined },
    })!
    expect(missing.action?.bindingStatus).toBe('missing')
    const binding = vi.fn(adapters.resolveBinding)
    const unsupported = selectTutorialGuidance({
      ...input,
      accessibility: {},
      adapters: { ...adapters, resolveBinding: binding },
    })!
    expect(unsupported.action?.bindingStatus).toBe('unsupported')
    expect(unsupported.accessibility).toMatchObject({
      reducedMotion: true,
      hover: false,
      screenReader: false,
      textScale: 1,
    })
    expect(binding).not.toHaveBeenCalled()
    expect(unsupported.semanticText).toEqual(missing.semanticText)
    expect(unsupported.semanticText.join(' ')).toContain('guidance is optional')
  })

  it('preserves semantics for reduced motion, screen readers, scaling and non-hover access', () => {
    const baseline = selectTutorialGuidance({
      ...input,
      explanationDepth: 'detail',
      accessibility: { ...input.accessibility, reducedMotion: false, hover: true },
    })!
    const accessible = selectTutorialGuidance({
      ...input,
      explanationDepth: 'detail',
      accessibility: {
        ...input.accessibility,
        reducedMotion: true,
        hover: false,
        screenReader: true,
        textScale: 2.5,
      },
    })!
    expect(accessible.semanticText).toEqual(baseline.semanticText)
    expect(accessible.semanticText.join(' ')).toContain('contested')
    expect(accessible.accessibility).toMatchObject({
      textScale: 2.5,
      reducedMotion: true,
      screenReader: true,
      criticalMeaningRequiresHover: false,
    })
    for (const textScale of [0, -1, NaN, Infinity]) {
      expect(
        selectTutorialGuidance({ ...input, accessibility: { textScale } })?.accessibility.textScale
      ).toBe(1)
    }
  })

  it('does not mutate campaign, lifecycle or supplied content', () => {
    const lifecycle = createTutorialState(definition)
    const before = JSON.stringify(game)
    const result = selectTutorialGuidance({ ...input, lifecycle })!
    expect(JSON.stringify(game)).toBe(before)
    expect(lifecycle.revision).toBe(0)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.semanticText)).toBe(true)
    expect(Object.isFrozen(result.action)).toBe(true)
    expect(Object.isFrozen(result.explanations)).toBe(true)
  })

  it('orders explanations deterministically and isolates their mutable input references', () => {
    const second = createOperationalExplanationRecord({
      ...record,
      reasonCode: 'work.other',
      severity: 'routine',
    })
    const mutable = JSON.parse(JSON.stringify(record))
    const select = (records: (typeof record)[]) =>
      selectTutorialGuidance({
        ...input,
        explanationDepth: 'diagnostic',
        adapters: {
          ...adapters,
          resolveAction: () => ({
            visible: true,
            label: 'Inspect',
            available: true,
            explanations: records.map((entry) => ({
              record: entry,
              permittedDepth: 'diagnostic' as const,
            })),
          }),
        },
      })!
    const result = select([second, mutable])
    expect(result).toEqual(select([mutable, second]))
    mutable.source.recordId = 'changed'
    mutable.provenance.push('changed')
    expect(result.explanations[0].source.recordId).toBe('work-1')
    expect(result.explanations[0].provenance).toEqual(['review'])
  })

  it('rejects sparse semantic content and treats blank bindings as missing', () => {
    expect(
      selectTutorialGuidance({
        ...input,
        adapters: { ...adapters, resolveContent: () => new Array<string>(2) },
      })
    ).toBeUndefined()
    expect(
      selectTutorialGuidance({
        ...input,
        adapters: { ...adapters, resolveBinding: () => ({ label: ' ' }) },
      })?.action?.bindingStatus
    ).toBe('missing')
  })
})
