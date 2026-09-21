import { describe, expect, it } from 'vitest'
import {
  VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
  VOLATILE_ACTION_HAZARD_REDUCTION_PHASE_BY_STEP,
  VOLATILE_ACTION_HAZARD_REDUCTION_STEP_IDS,
  VOLATILE_ACTION_PHASE_MODES,
  VOLATILE_ACTION_PHASE_VARIANT_ID,
  VOLATILE_ACTION_PHASE_VARIANT_IDS,
  VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
  VOLATILE_ACTION_REACTION_WINDOW_ID,
  VOLATILE_ACTION_V1_PHASE_IDS,
  resolveVolatileActionPhasePipeline,
} from '../domain/volatileActionPhasePipeline'
import {
  resolveVolatileActionPriority,
  type VolatileActionPriorityActorInput,
  type VolatileActionPriorityRequest,
} from '../domain/volatileActionPriority'

function actor(
  actorId: string,
  overrides: Partial<VolatileActionPriorityActorInput> = {}
): VolatileActionPriorityActorInput {
  return {
    actorId,
    sideId: 'responders',
    readiness: 'steady',
    posture: 'guarded',
    exposure: 'covered',
    injury: 'none',
    toolState: 'operational',
    precision: 50,
    aimCommitment: 'none',
    targetingMode: 'explicit_designation',
    ...overrides,
  }
}

function snapshot(
  actors: readonly VolatileActionPriorityActorInput[],
  mode: VolatileActionPriorityRequest['mode'] = { kind: 'per_actor' }
): VolatileActionPriorityRequest {
  return { mode, actors }
}

describe('volatile action phase pipeline', () => {
  it('resolves byte-stable phase order and reaction window without depending on input order', () => {
    const actors = [
      actor('actor:alpha', { posture: 'braced', precision: 85, aimCommitment: 'committed' }),
      actor('actor:bravo', {
        posture: 'mobile',
        precision: 65,
        aimCommitment: 'tracking',
        targetingMode: 'rapid_nearest_valid',
      }),
    ]
    const original = structuredClone(actors)

    const first = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:loading-bay',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot(actors),
    })
    const replay = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:loading-bay',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([...actors].reverse()),
    })

    expect(first).toEqual(replay)
    expect(JSON.stringify(first)).toBe(JSON.stringify(replay))
    expect(actors).toEqual(original)
    expect(first.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
    expect(first.phases.every((phase) => phase.status === 'ran')).toBe(true)
    expect(first.bypassed).toBe(false)
    expect(first.actorIds).toEqual(['actor:bravo', 'actor:alpha'])
    expect(first.variantId).toBe(VOLATILE_ACTION_PHASE_VARIANT_ID)
    expect(first.mode).toBe('advanced_action')
    expect(first.interrupt).toEqual({ kind: 'none' })
    expect(first.hold).toEqual({ kind: 'none' })
    expect(first.reactionWindow).toEqual({
      id: VOLATILE_ACTION_REACTION_WINDOW_ID,
      attachAfterPhaseId: 'posture_commit',
      actorIds: ['actor:bravo', 'actor:alpha'],
    })
    expect(first.actionPriority).toEqual(
      resolveVolatileActionPriority({
        encounterId: 'encounter:loading-bay',
        mode: { kind: 'per_actor' },
        actors,
      })
    )
  })

  it('skips only clash and emission on explicit no-stakes bypass', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:routine',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'none',
      actionPriority: snapshot([actor('actor:alpha')]),
    })

    expect(result.bypassed).toBe(true)
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'skipped' },
      { id: 'effect_emission', status: 'skipped' },
      { id: 'cleanup', status: 'ran' },
    ])
    expect(result.interrupt).toEqual({ kind: 'none' })
    expect(result.hold).toEqual({ kind: 'none' })
    expect(result.reactionWindow.attachAfterPhaseId).toBe('posture_commit')
    expect(result.reactionWindow.actorIds).toEqual(['actor:alpha'])
  })

  it('walks side_phase actors in SPE-54 block order rather than insertion order', () => {
    const actors = [
      actor('hostile:slow', {
        sideId: 'hostiles',
        readiness: 'critical',
        exposure: 'exposed',
        injury: 'moderate',
        precision: 20,
      }),
      actor('responder:fast', {
        posture: 'braced',
        exposure: 'concealed',
        precision: 90,
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('hostile:fast', {
        sideId: 'hostiles',
        posture: 'mobile',
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('responder:slow', { readiness: 'strained', precision: 30 }),
    ]

    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:side-blocks',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot(actors, { kind: 'side_phase' }),
    })
    const priority = resolveVolatileActionPriority({
      encounterId: 'encounter:side-blocks',
      mode: { kind: 'side_phase' },
      actors,
    })

    expect(priority.sequence.kind).toBe('side_phase')
    expect(result.actorIds).toEqual([
      'responder:fast',
      'responder:slow',
      'hostile:fast',
      'hostile:slow',
    ])
    expect(result.actorIds).not.toEqual(actors.map((entry) => entry.actorId))
    expect(result.reactionWindow.actorIds).toEqual(result.actorIds)
  })

  it.each([
    {
      name: 'missing encounterId',
      input: {
        encounterId: '  ',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present' as const,
        actionPriority: snapshot([actor('actor:alpha')]),
      },
      message: 'encounterId must be a non-empty trimmed string.',
    },
    {
      name: 'invalid variant',
      input: {
        encounterId: 'encounter:alpha',
        variantId: 'other_variant',
        mode: 'advanced_action',
        stakes: 'present' as const,
        actionPriority: snapshot([actor('actor:alpha')]),
      },
      message: 'variantId must be volatile_action_v1 or volatile_action_procedure_v1.',
    },
    {
      name: 'missing mode',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        stakes: 'present' as const,
        actionPriority: snapshot([actor('actor:alpha')]),
      },
      message: 'mode must be task, test, or advanced_action.',
    },
    {
      name: 'unknown mode',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'montage',
        stakes: 'present' as const,
        actionPriority: snapshot([actor('actor:alpha')]),
      },
      message: 'mode must be task, test, or advanced_action.',
    },
    {
      name: 'unknown stakes',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'maybe',
        actionPriority: snapshot([actor('actor:alpha')]),
      },
      message: 'stakes must be none or present.',
    },
    {
      name: 'missing actionPriority',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present' as const,
      },
      message: 'actionPriority is required.',
    },
    {
      name: 'mismatched actionPriority encounterId',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present' as const,
        actionPriority: { ...snapshot([actor('actor:alpha')]), encounterId: 'encounter:other' },
      },
      message: 'actionPriority encounterId must match the pipeline encounterId.',
    },
  ])('fails closed for $name', ({ input, message }) => {
    expect(() =>
      resolveVolatileActionPhasePipeline(
        input as Parameters<typeof resolveVolatileActionPhasePipeline>[0]
      )
    ).toThrow(message)
  })

  it('treats omitted interrupt and kind none as the SPE-2900 default', () => {
    const actionPriority = snapshot([actor('actor:alpha')])
    const omitted = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-interrupt',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
    })
    const none = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-interrupt',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
      interrupt: { kind: 'none' },
    })

    expect(omitted).toEqual(none)
    expect(JSON.stringify(omitted)).toBe(JSON.stringify(none))
    expect(omitted.interrupt).toEqual({ kind: 'none' })
    expect(omitted.hold).toEqual({ kind: 'none' })
    expect(omitted.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'ran' },
      { id: 'effect_emission', status: 'ran' },
      { id: 'cleanup', status: 'ran' },
    ])
  })

  it.each([
    {
      kind: 'prepend' as const,
      laterStatus: 'prepended' as const,
    },
    {
      kind: 'truncate' as const,
      laterStatus: 'truncated' as const,
    },
    {
      kind: 'redirect' as const,
      laterStatus: 'redirected' as const,
    },
  ])(
    'rewrites later-phase statuses to $laterStatus when stakes are present',
    ({ kind, laterStatus }) => {
      const actors = [
        actor('actor:alpha', { precision: 80 }),
        actor('actor:bravo', { precision: 40 }),
      ]
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:interrupt',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot(actors),
        interrupt: { kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      })
      const priority = resolveVolatileActionPriority({
        encounterId: 'encounter:interrupt',
        mode: { kind: 'per_actor' },
        actors,
      })

      expect(result.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
      expect(result.phases).toEqual([
        { id: 'posture_commit', status: 'ran' },
        { id: 'environmental_read', status: laterStatus },
        { id: 'clash_window', status: laterStatus },
        { id: 'effect_emission', status: laterStatus },
        { id: 'cleanup', status: laterStatus },
      ])
      expect(result.interrupt).toEqual({
        kind,
        windowId: VOLATILE_ACTION_REACTION_WINDOW_ID,
      })
      expect(result.bypassed).toBe(false)
      expect(result.reactionWindow).toEqual({
        id: VOLATILE_ACTION_REACTION_WINDOW_ID,
        attachAfterPhaseId: 'posture_commit',
        actorIds: result.actorIds,
      })
      expect(result.actionPriority).toEqual(priority)
    }
  )

  it.each(['prepend', 'truncate', 'redirect'] as const)(
    'keeps no-stakes clash and emission skipped under %s',
    (kind) => {
      const laterStatus =
        kind === 'prepend' ? 'prepended' : kind === 'truncate' ? 'truncated' : 'redirected'
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:no-stakes-interrupt',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'none',
        actionPriority: snapshot([actor('actor:alpha')]),
        interrupt: { kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      })

      expect(result.bypassed).toBe(true)
      expect(result.phases).toEqual([
        { id: 'posture_commit', status: 'ran' },
        { id: 'environmental_read', status: laterStatus },
        { id: 'clash_window', status: 'skipped' },
        { id: 'effect_emission', status: 'skipped' },
        { id: 'cleanup', status: laterStatus },
      ])
      expect(result.interrupt).toEqual({
        kind,
        windowId: VOLATILE_ACTION_REACTION_WINDOW_ID,
      })
    }
  )

  it('does not reorder side_phase actors when an interrupt rewrites later statuses', () => {
    const actors = [
      actor('hostile:slow', {
        sideId: 'hostiles',
        readiness: 'critical',
        exposure: 'exposed',
        injury: 'moderate',
        precision: 20,
      }),
      actor('responder:fast', {
        posture: 'braced',
        exposure: 'concealed',
        precision: 90,
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('hostile:fast', {
        sideId: 'hostiles',
        posture: 'mobile',
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('responder:slow', { readiness: 'strained', precision: 30 }),
    ]

    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:side-blocks-interrupt',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot(actors, { kind: 'side_phase' }),
      interrupt: { kind: 'truncate', windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
    })
    const priority = resolveVolatileActionPriority({
      encounterId: 'encounter:side-blocks-interrupt',
      mode: { kind: 'side_phase' },
      actors,
    })

    expect(result.actorIds).toEqual([
      'responder:fast',
      'responder:slow',
      'hostile:fast',
      'hostile:slow',
    ])
    expect(result.actorIds).toEqual(
      priority.sequence.kind === 'side_phase'
        ? priority.sequence.sideGroups.flatMap((group) => group.actorIds)
        : priority.sequence.actorIds
    )
    expect(result.reactionWindow.actorIds).toEqual(result.actorIds)
    expect(result.actionPriority).toEqual(priority)
    expect(result.phases[0]).toEqual({ id: 'posture_commit', status: 'ran' })
    expect(result.phases.slice(1).every((phase) => phase.status === 'truncated')).toBe(true)
  })

  it.each([
    {
      name: 'non-object interrupt',
      interrupt: 'prepend',
      message: 'interrupt is required.',
    },
    {
      name: 'null interrupt',
      interrupt: null,
      message: 'interrupt is required.',
    },
    {
      name: 'array interrupt',
      interrupt: [{ kind: 'none' }],
      message: 'interrupt is required.',
    },
    {
      name: 'unknown interrupt kind',
      interrupt: { kind: 'cancel', windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      message: 'interrupt kind must be none, prepend, truncate, or redirect.',
    },
    {
      name: 'missing interrupt windowId',
      interrupt: { kind: 'prepend' },
      message: 'interrupt windowId is required.',
    },
    {
      name: 'wrong interrupt windowId',
      interrupt: { kind: 'truncate', windowId: 'after_clash' },
      message: 'interrupt windowId must be after_posture_commit.',
    },
    {
      name: 'empty interrupt windowId',
      interrupt: { kind: 'redirect', windowId: '  ' },
      message: 'interrupt windowId must be a non-empty trimmed string.',
    },
  ])('fails closed for $name', ({ interrupt, message }) => {
    expect(() =>
      resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:interrupt-authority',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        interrupt: interrupt as Parameters<
          typeof resolveVolatileActionPhasePipeline
        >[0]['interrupt'],
      })
    ).toThrow(message)
  })

  it('treats omitted hold and kind none as the SPE-2901 default', () => {
    const actionPriority = snapshot([actor('actor:alpha')])
    const omitted = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-hold',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
    })
    const none = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-hold',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
      hold: { kind: 'none' },
    })

    expect(omitted).toEqual(none)
    expect(JSON.stringify(omitted)).toBe(JSON.stringify(none))
    expect(omitted.hold).toEqual({ kind: 'none' })
    expect(omitted.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'ran' },
      { id: 'effect_emission', status: 'ran' },
      { id: 'cleanup', status: 'ran' },
    ])
  })

  it('holds clash and emission on explicit hold_aim', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:hold-aim',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      hold: { kind: 'hold_aim', instanceId: 'encounter:hold-aim' },
    })

    expect(result.hold).toEqual({ kind: 'hold_aim', instanceId: 'encounter:hold-aim' })
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'held' },
      { id: 'effect_emission', status: 'held' },
      { id: 'cleanup', status: 'ran' },
    ])
    expect(result.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
  })

  it('aborts clash and emission with an inspectable reason', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:abort',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      hold: {
        kind: 'abort',
        instanceId: 'procedure:abort-line',
        reason: 'lost_line_of_sight',
      },
    })

    expect(result.hold).toEqual({
      kind: 'abort',
      instanceId: 'procedure:abort-line',
      reason: 'lost_line_of_sight',
    })
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'aborted' },
      { id: 'effect_emission', status: 'aborted' },
      { id: 'cleanup', status: 'ran' },
    ])
  })

  it('delays only effect_emission on explicit delayed_emission', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:delay',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      hold: { kind: 'delayed_emission', instanceId: 'encounter:delay' },
    })

    expect(result.hold).toEqual({
      kind: 'delayed_emission',
      instanceId: 'encounter:delay',
    })
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'ran' },
      { id: 'effect_emission', status: 'delayed' },
      { id: 'cleanup', status: 'ran' },
    ])
  })

  it.each(['hold_aim', 'abort', 'delayed_emission'] as const)(
    'keeps no-stakes clash and emission skipped under %s',
    (kind) => {
      const hold =
        kind === 'abort'
          ? {
              kind,
              instanceId: 'encounter:no-stakes-hold',
              reason: 'no_stakes_abort',
            }
          : { kind, instanceId: 'encounter:no-stakes-hold' }
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:no-stakes-hold',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'none',
        actionPriority: snapshot([actor('actor:alpha')]),
        hold,
      })

      expect(result.bypassed).toBe(true)
      expect(result.phases).toEqual([
        { id: 'posture_commit', status: 'ran' },
        { id: 'environmental_read', status: 'ran' },
        { id: 'clash_window', status: 'skipped' },
        { id: 'effect_emission', status: 'skipped' },
        { id: 'cleanup', status: 'ran' },
      ])
      expect(result.hold.kind).toBe(kind)
    }
  )

  it.each(['prepend', 'truncate', 'redirect'] as const)(
    'keeps interrupt rewrite on emission instead of delaying it under %s',
    (kind) => {
      const laterStatus =
        kind === 'prepend' ? 'prepended' : kind === 'truncate' ? 'truncated' : 'redirected'
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:interrupt-delay',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        interrupt: { kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
        hold: { kind: 'delayed_emission', instanceId: 'encounter:interrupt-delay' },
      })

      expect(result.phases).toEqual([
        { id: 'posture_commit', status: 'ran' },
        { id: 'environmental_read', status: laterStatus },
        { id: 'clash_window', status: laterStatus },
        { id: 'effect_emission', status: laterStatus },
        { id: 'cleanup', status: laterStatus },
      ])
      expect(result.hold).toEqual({
        kind: 'delayed_emission',
        instanceId: 'encounter:interrupt-delay',
      })
      expect(result.interrupt).toEqual({
        kind,
        windowId: VOLATILE_ACTION_REACTION_WINDOW_ID,
      })
    }
  )

  it('does not infer hold from actor array order', () => {
    const actors = [
      actor('actor:alpha', { precision: 80 }),
      actor('actor:bravo', { precision: 40 }),
    ]
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:order-hold',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([...actors].reverse()),
    })

    expect(result.hold).toEqual({ kind: 'none' })
    expect(result.phases.every((phase) => phase.status === 'ran')).toBe(true)
  })

  it.each([
    {
      name: 'non-object hold',
      hold: 'hold_aim',
      message: 'hold is required.',
    },
    {
      name: 'null hold',
      hold: null,
      message: 'hold is required.',
    },
    {
      name: 'array hold',
      hold: [{ kind: 'none' }],
      message: 'hold is required.',
    },
    {
      name: 'unknown hold kind',
      hold: { kind: 'pause', instanceId: 'encounter:hold-authority' },
      message: 'hold kind must be none, hold_aim, abort, or delayed_emission.',
    },
    {
      name: 'missing hold instanceId',
      hold: { kind: 'hold_aim' },
      message: 'hold instanceId is required.',
    },
    {
      name: 'empty hold instanceId',
      hold: { kind: 'delayed_emission', instanceId: '  ' },
      message: 'hold instanceId must be a non-empty trimmed string.',
    },
    {
      name: 'unsafe hold instanceId',
      hold: { kind: 'hold_aim', instanceId: '__proto__' },
      message: 'hold instanceId is unsafe.',
    },
    {
      name: 'integer-index hold instanceId',
      hold: { kind: 'hold_aim', instanceId: '0' },
      message: 'hold instanceId is unsafe.',
    },
    {
      name: 'abort without reason',
      hold: { kind: 'abort', instanceId: 'encounter:hold-authority' },
      message: 'hold reason is required.',
    },
    {
      name: 'abort with empty reason',
      hold: { kind: 'abort', instanceId: 'encounter:hold-authority', reason: '  ' },
      message: 'hold reason must be a non-empty trimmed string.',
    },
  ])('fails closed for $name', ({ hold, message }) => {
    expect(() =>
      resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:hold-authority',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        hold: hold as Parameters<typeof resolveVolatileActionPhasePipeline>[0]['hold'],
      })
    ).toThrow(message)
  })

  it('keeps the procedure variant on the same inspectable phase ids', () => {
    const actors = [
      actor('actor:alpha', { posture: 'braced', precision: 85, aimCommitment: 'committed' }),
      actor('actor:bravo', {
        posture: 'mobile',
        precision: 65,
        aimCommitment: 'tracking',
        targetingMode: 'rapid_nearest_valid',
      }),
    ]
    const actionPriority = snapshot(actors)
    const baseline = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:procedure-variant',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'task',
      stakes: 'present',
      actionPriority,
    })
    const procedure = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:procedure-variant',
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'task',
      stakes: 'present',
      actionPriority,
    })

    expect([...VOLATILE_ACTION_PHASE_VARIANT_IDS]).toEqual([
      VOLATILE_ACTION_PHASE_VARIANT_ID,
      VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
    ])
    expect(procedure.variantId).toBe(VOLATILE_ACTION_PROCEDURE_VARIANT_ID)
    expect(procedure.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
    expect(procedure.phases).toEqual(baseline.phases)
    expect(procedure.bypassed).toBe(baseline.bypassed)
    expect(procedure.actorIds).toEqual(baseline.actorIds)
    expect(procedure.actionPriority).toEqual(baseline.actionPriority)
    expect(procedure.mode).toBe('task')
  })

  it.each([...VOLATILE_ACTION_PHASE_MODES])(
    'does not change SPE-54 scores when mode is %s',
    (mode) => {
      const actors = [
        actor('actor:alpha', { precision: 80 }),
        actor('actor:bravo', { precision: 40 }),
      ]
      const actionPriority = snapshot(actors)
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:mode-scores',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode,
        stakes: 'present',
        actionPriority,
      })
      const priority = resolveVolatileActionPriority({
        encounterId: 'encounter:mode-scores',
        mode: { kind: 'per_actor' },
        actors,
      })

      expect(result.mode).toBe(mode)
      expect(result.actionPriority).toEqual(priority)
      expect(JSON.stringify(result.actionPriority)).toBe(JSON.stringify(priority))
    }
  )

  it('does not infer variant or mode from actor array order', () => {
    const actors = [
      actor('actor:alpha', { precision: 80 }),
      actor('actor:bravo', { precision: 40 }),
    ]
    const reversed = [...actors].reverse()
    const procedureTask = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:order-tags',
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'task',
      stakes: 'present',
      actionPriority: snapshot(reversed),
    })
    const v1Test = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:order-tags',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'test',
      stakes: 'present',
      actionPriority: snapshot(actors),
    })

    expect(procedureTask.variantId).toBe(VOLATILE_ACTION_PROCEDURE_VARIANT_ID)
    expect(procedureTask.mode).toBe('task')
    expect(v1Test.variantId).toBe(VOLATILE_ACTION_PHASE_VARIANT_ID)
    expect(v1Test.mode).toBe('test')
    expect(procedureTask.actorIds).toEqual(v1Test.actorIds)
    expect(procedureTask.actionPriority).toEqual(v1Test.actionPriority)
    expect(procedureTask.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
  })

  it.each([
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'task' as const,
    },
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'test' as const,
    },
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'advanced_action' as const,
    },
  ])('applies no-stakes skip identically on $variantId in $mode', ({ variantId, mode }) => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:procedure-no-stakes',
      variantId,
      mode,
      stakes: 'none',
      actionPriority: snapshot([actor('actor:alpha')]),
    })

    expect(result.variantId).toBe(variantId)
    expect(result.mode).toBe(mode)
    expect(result.bypassed).toBe(true)
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'skipped' },
      { id: 'effect_emission', status: 'skipped' },
      { id: 'cleanup', status: 'ran' },
    ])
  })

  it('composes interrupt and hold identically on the procedure variant', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:procedure-compose',
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'test',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      interrupt: { kind: 'truncate', windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      hold: { kind: 'delayed_emission', instanceId: 'encounter:procedure-compose' },
    })
    const baseline = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:procedure-compose',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      interrupt: { kind: 'truncate', windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      hold: { kind: 'delayed_emission', instanceId: 'encounter:procedure-compose' },
    })

    expect(result.phases).toEqual(baseline.phases)
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'truncated' },
      { id: 'clash_window', status: 'truncated' },
      { id: 'effect_emission', status: 'truncated' },
      { id: 'cleanup', status: 'truncated' },
    ])
    expect(result.variantId).toBe(VOLATILE_ACTION_PROCEDURE_VARIANT_ID)
    expect(result.mode).toBe('test')
    expect(baseline.variantId).toBe(VOLATILE_ACTION_PHASE_VARIANT_ID)
    expect(baseline.mode).toBe('advanced_action')
  })

  it('treats omitted hazard and kind none as the SPE-2912 default', () => {
    const actionPriority = snapshot([actor('actor:alpha')])
    const omitted = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-hazard',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
    })
    const none = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-hazard',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
      hazard: { kind: 'none' },
    })

    expect(omitted).toEqual(none)
    expect(JSON.stringify(omitted)).toBe(JSON.stringify(none))
    expect(omitted.hazard).toEqual({ kind: 'none' })
    expect(omitted.hazardDeclaration).toEqual({
      declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      status: 'none',
    })
    expect(omitted.consequenceReduction).toEqual([])
    expect(omitted.phases.every((phase) => phase.status === 'ran')).toBe(true)
  })

  it('declares an authored impending hazard before commitment and ladders through ordered phases', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:hazard',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(result.hazard).toEqual({
      kind: 'impending',
      hazardId: 'hazard:rupture',
      declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
    })
    expect(result.hazardDeclaration).toEqual({
      declaredAtPhaseId: 'posture_commit',
      status: 'declared',
    })
    expect([...VOLATILE_ACTION_HAZARD_REDUCTION_STEP_IDS]).toEqual(['expose', 'mitigate', 'apply'])
    expect(result.consequenceReduction).toEqual([
      { id: 'expose', phaseId: 'environmental_read', status: 'ran' },
      { id: 'mitigate', phaseId: 'clash_window', status: 'ran' },
      { id: 'apply', phaseId: 'effect_emission', status: 'ran' },
    ])
    expect(VOLATILE_ACTION_HAZARD_REDUCTION_PHASE_BY_STEP).toEqual({
      expose: 'environmental_read',
      mitigate: 'clash_window',
      apply: 'effect_emission',
    })
    expect(result.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
    expect(result.phases.every((phase) => phase.status === 'ran')).toBe(true)
    expect(result.hazardDeclaration.declaredAtPhaseId).toBe(result.phases[0]?.id)
    expect(result.consequenceReduction[0]?.phaseId).toBe('environmental_read')
    expect(result.consequenceReduction[2]?.phaseId).not.toBe('cleanup')
  })

  it('does not enter volatile hazard resolution on no-stakes and still skips clash plus emission', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:no-stakes-hazard',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'none',
      actionPriority: snapshot([actor('actor:alpha')]),
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(result.bypassed).toBe(true)
    expect(result.hazard.kind).toBe('impending')
    expect(result.hazardDeclaration).toEqual({
      declaredAtPhaseId: 'posture_commit',
      status: 'bypassed',
    })
    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'skipped' },
      { id: 'effect_emission', status: 'skipped' },
      { id: 'cleanup', status: 'ran' },
    ])
    expect(result.consequenceReduction).toEqual([
      { id: 'expose', phaseId: 'environmental_read', status: 'skipped' },
      { id: 'mitigate', phaseId: 'clash_window', status: 'skipped' },
      { id: 'apply', phaseId: 'effect_emission', status: 'skipped' },
    ])
  })

  it.each(['prepend', 'truncate', 'redirect'] as const)(
    'does not revive skipped clash or emission under no-stakes interrupt %s with a hazard',
    (kind) => {
      const laterStatus =
        kind === 'prepend' ? 'prepended' : kind === 'truncate' ? 'truncated' : 'redirected'
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:no-stakes-hazard-interrupt',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'none',
        actionPriority: snapshot([actor('actor:alpha')]),
        interrupt: { kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
        hazard: {
          kind: 'impending',
          hazardId: 'hazard:rupture',
          declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
        },
      })

      expect(result.bypassed).toBe(true)
      expect(result.phases).toEqual([
        { id: 'posture_commit', status: 'ran' },
        { id: 'environmental_read', status: laterStatus },
        { id: 'clash_window', status: 'skipped' },
        { id: 'effect_emission', status: 'skipped' },
        { id: 'cleanup', status: laterStatus },
      ])
      expect(result.hazardDeclaration.status).toBe('bypassed')
      expect(result.consequenceReduction.every((step) => step.status === 'skipped')).toBe(true)
    }
  )

  it.each(['hold_aim', 'abort', 'delayed_emission'] as const)(
    'does not revive skipped clash or emission under no-stakes %s with a hazard',
    (kind) => {
      const hold =
        kind === 'abort'
          ? {
              kind,
              instanceId: 'encounter:no-stakes-hazard-hold',
              reason: 'no_stakes_abort',
            }
          : { kind, instanceId: 'encounter:no-stakes-hazard-hold' }
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:no-stakes-hazard-hold',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'none',
        actionPriority: snapshot([actor('actor:alpha')]),
        hold,
        hazard: {
          kind: 'impending',
          hazardId: 'hazard:rupture',
          declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
        },
      })

      expect(result.phases).toEqual([
        { id: 'posture_commit', status: 'ran' },
        { id: 'environmental_read', status: 'ran' },
        { id: 'clash_window', status: 'skipped' },
        { id: 'effect_emission', status: 'skipped' },
        { id: 'cleanup', status: 'ran' },
      ])
      expect(result.hazardDeclaration.status).toBe('bypassed')
      expect(result.consequenceReduction).toEqual([
        { id: 'expose', phaseId: 'environmental_read', status: 'skipped' },
        { id: 'mitigate', phaseId: 'clash_window', status: 'skipped' },
        { id: 'apply', phaseId: 'effect_emission', status: 'skipped' },
      ])
    }
  )

  it('uses existing interrupt phase statuses for the reduction ladder', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:hazard-interrupt',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      interrupt: { kind: 'truncate', windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'truncated' },
      { id: 'clash_window', status: 'truncated' },
      { id: 'effect_emission', status: 'truncated' },
      { id: 'cleanup', status: 'truncated' },
    ])
    expect(result.hazardDeclaration.status).toBe('declared')
    expect(result.consequenceReduction).toEqual([
      { id: 'expose', phaseId: 'environmental_read', status: 'truncated' },
      { id: 'mitigate', phaseId: 'clash_window', status: 'truncated' },
      { id: 'apply', phaseId: 'effect_emission', status: 'truncated' },
    ])
  })

  it('uses existing hold phase statuses for the reduction ladder', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:hazard-hold',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      hold: { kind: 'hold_aim', instanceId: 'encounter:hazard-hold' },
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'held' },
      { id: 'effect_emission', status: 'held' },
      { id: 'cleanup', status: 'ran' },
    ])
    expect(result.consequenceReduction).toEqual([
      { id: 'expose', phaseId: 'environmental_read', status: 'ran' },
      { id: 'mitigate', phaseId: 'clash_window', status: 'held' },
      { id: 'apply', phaseId: 'effect_emission', status: 'held' },
    ])
  })

  it('does not infer hazard from SPE-54 scores, array order, variant, or mode', () => {
    const actors = [
      actor('actor:alpha', { precision: 80 }),
      actor('actor:bravo', { precision: 40 }),
    ]
    const omitted = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:order-hazard',
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'task',
      stakes: 'present',
      actionPriority: snapshot([...actors].reverse()),
    })
    const declared = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:order-hazard',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'test',
      stakes: 'present',
      actionPriority: snapshot(actors),
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:authored',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(omitted.hazard).toEqual({ kind: 'none' })
    expect(omitted.hazardDeclaration.status).toBe('none')
    expect(omitted.consequenceReduction).toEqual([])
    expect(declared.hazard).toEqual({
      kind: 'impending',
      hazardId: 'hazard:authored',
      declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
    })
    expect(declared.variantId).toBe(VOLATILE_ACTION_PHASE_VARIANT_ID)
    expect(declared.mode).toBe('test')
    expect(omitted.variantId).toBe(VOLATILE_ACTION_PROCEDURE_VARIANT_ID)
    expect(omitted.mode).toBe('task')
    expect(omitted.actorIds).toEqual(declared.actorIds)
    expect(omitted.actionPriority).toEqual(declared.actionPriority)
    expect(declared.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
  })

  it('keeps SPE-54 fallback then actor id ties when a hazard is declared', () => {
    const actors = [
      actor('actor:alpha', { fallbackOrder: 2 }),
      actor('actor:bravo', { fallbackOrder: 1 }),
    ]
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:hazard-tie',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot(actors),
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:tie',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })
    const priority = resolveVolatileActionPriority({
      encounterId: 'encounter:hazard-tie',
      mode: { kind: 'per_actor' },
      actors,
    })

    expect(result.actorIds).toEqual(['actor:bravo', 'actor:alpha'])
    expect(result.actionPriority).toEqual(priority)
    expect(result.mode).toBe('advanced_action')
    expect(result.variantId).toBe(VOLATILE_ACTION_PHASE_VARIANT_ID)
  })

  it.each([
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'task' as const,
    },
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'test' as const,
    },
    {
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action' as const,
    },
  ])(
    'keeps variant $variantId and mode $mode unchanged with an impending hazard',
    ({ variantId, mode }) => {
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:hazard-tags',
        variantId,
        mode,
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        hazard: {
          kind: 'impending',
          hazardId: 'hazard:rupture',
          declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
        },
      })

      expect(result.variantId).toBe(variantId)
      expect(result.mode).toBe(mode)
      expect(result.hazardDeclaration.status).toBe('declared')
      expect(result.phases.map((phase) => phase.id)).toEqual([...VOLATILE_ACTION_V1_PHASE_IDS])
    }
  )

  it.each([
    {
      name: 'non-object hazard',
      hazard: 'impending',
      message: 'hazard is required.',
    },
    {
      name: 'null hazard',
      hazard: null,
      message: 'hazard is required.',
    },
    {
      name: 'array hazard',
      hazard: [{ kind: 'none' }],
      message: 'hazard is required.',
    },
    {
      name: 'unknown hazard kind',
      hazard: {
        kind: 'inferred',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
      message: 'hazard kind must be none or impending.',
    },
    {
      name: 'missing hazardId',
      hazard: {
        kind: 'impending',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
      message: 'hazard hazardId is required.',
    },
    {
      name: 'empty hazardId',
      hazard: {
        kind: 'impending',
        hazardId: '  ',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
      message: 'hazard hazardId must be a non-empty trimmed string.',
    },
    {
      name: 'unsafe hazardId',
      hazard: {
        kind: 'impending',
        hazardId: '__proto__',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
      message: 'hazard hazardId is unsafe.',
    },
    {
      name: 'integer-index hazardId',
      hazard: {
        kind: 'impending',
        hazardId: '0',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
      message: 'hazard hazardId is unsafe.',
    },
    {
      name: 'missing declaredAtPhaseId',
      hazard: { kind: 'impending', hazardId: 'hazard:rupture' },
      message: 'hazard declaredAtPhaseId is required.',
    },
    {
      name: 'declaration after emission',
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: 'effect_emission',
      },
      message: 'hazard declaredAtPhaseId must be posture_commit.',
    },
    {
      name: 'empty declaredAtPhaseId',
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: '  ',
      },
      message: 'hazard declaredAtPhaseId must be a non-empty trimmed string.',
    },
  ])('fails closed for $name', ({ hazard, message }) => {
    expect(() =>
      resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:hazard-authority',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        hazard: hazard as Parameters<typeof resolveVolatileActionPhasePipeline>[0]['hazard'],
      })
    ).toThrow(message)
  })

  it('always emits an inspectable explanation from resolved statuses without an authored ledger', () => {
    const actionPriority = snapshot([actor('actor:alpha')])
    const omitted = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-default',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
    })
    const none = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-default',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority,
      interrupt: { kind: 'none' },
      hold: { kind: 'none' },
      hazard: { kind: 'none' },
    })

    expect(omitted.explanation).toEqual(none.explanation)
    expect(JSON.stringify(omitted.explanation)).toBe(JSON.stringify(none.explanation))
    expect(omitted.explanation).toEqual({
      phases: [
        { id: 'posture_commit', status: 'ran', reason: 'ran_posture_commit' },
        { id: 'environmental_read', status: 'ran', reason: 'ran' },
        { id: 'clash_window', status: 'ran', reason: 'ran' },
        { id: 'effect_emission', status: 'ran', reason: 'ran' },
        { id: 'cleanup', status: 'ran', reason: 'ran' },
      ],
      bypass: { bypassed: false, reason: 'stakes_present' },
      interrupt: { kind: 'none', reason: 'interrupt_none' },
      hold: { kind: 'none', reason: 'hold_none' },
      hazardDeclaration: { status: 'none', reason: 'hazard_none' },
      consequenceReduction: [],
    })
    expect(JSON.stringify(omitted.explanation)).not.toMatch(/priorityScore|dominantDriver/)
  })

  it('explains no-stakes skip without entering clash or emission, including bypassed expose', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-no-stakes',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'none',
      actionPriority: snapshot([actor('actor:alpha')]),
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(result.explanation.bypass).toEqual({ bypassed: true, reason: 'stakes_none' })
    expect(result.explanation.phases).toEqual([
      { id: 'posture_commit', status: 'ran', reason: 'ran_posture_commit' },
      { id: 'environmental_read', status: 'ran', reason: 'ran' },
      { id: 'clash_window', status: 'skipped', reason: 'skipped_stakes_none' },
      { id: 'effect_emission', status: 'skipped', reason: 'skipped_stakes_none' },
      { id: 'cleanup', status: 'ran', reason: 'ran' },
    ])
    expect(result.explanation.hazardDeclaration).toEqual({
      status: 'bypassed',
      reason: 'hazard_bypassed_stakes_none',
    })
    expect(result.explanation.consequenceReduction).toEqual([
      {
        id: 'expose',
        phaseId: 'environmental_read',
        status: 'skipped',
        reason: 'ladder_skipped_stakes_none',
      },
      {
        id: 'mitigate',
        phaseId: 'clash_window',
        status: 'skipped',
        reason: 'ladder_skipped_stakes_none',
      },
      {
        id: 'apply',
        phaseId: 'effect_emission',
        status: 'skipped',
        reason: 'ladder_skipped_stakes_none',
      },
    ])
    expect(result.explanation.phases[1]?.status).toBe('ran')
    expect(result.explanation.consequenceReduction[0]?.status).toBe('skipped')
  })

  it.each([
    { kind: 'prepend' as const, laterReason: 'interrupt_prepend' as const },
    { kind: 'truncate' as const, laterReason: 'interrupt_truncate' as const },
    { kind: 'redirect' as const, laterReason: 'interrupt_redirect' as const },
  ])(
    'explains $kind interrupt from already-resolved later-phase statuses',
    ({ kind, laterReason }) => {
      const laterStatus =
        kind === 'prepend' ? 'prepended' : kind === 'truncate' ? 'truncated' : 'redirected'
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:explanation-interrupt',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        interrupt: { kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      })

      expect(result.explanation.interrupt).toEqual({ kind, reason: laterReason })
      expect(result.explanation.phases).toEqual([
        { id: 'posture_commit', status: 'ran', reason: 'ran_posture_commit' },
        { id: 'environmental_read', status: laterStatus, reason: laterReason },
        { id: 'clash_window', status: laterStatus, reason: laterReason },
        { id: 'effect_emission', status: laterStatus, reason: laterReason },
        { id: 'cleanup', status: laterStatus, reason: laterReason },
      ])
    }
  )

  it.each(['prepend', 'truncate', 'redirect'] as const)(
    'keeps no-stakes skip explanation over interrupt rewrite under %s',
    (kind) => {
      const laterStatus =
        kind === 'prepend' ? 'prepended' : kind === 'truncate' ? 'truncated' : 'redirected'
      const laterReason =
        kind === 'prepend'
          ? 'interrupt_prepend'
          : kind === 'truncate'
            ? 'interrupt_truncate'
            : 'interrupt_redirect'
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:explanation-no-stakes-interrupt',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'none',
        actionPriority: snapshot([actor('actor:alpha')]),
        interrupt: { kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      })

      expect(result.explanation.bypass.reason).toBe('stakes_none')
      expect(result.explanation.phases).toEqual([
        { id: 'posture_commit', status: 'ran', reason: 'ran_posture_commit' },
        { id: 'environmental_read', status: laterStatus, reason: laterReason },
        { id: 'clash_window', status: 'skipped', reason: 'skipped_stakes_none' },
        { id: 'effect_emission', status: 'skipped', reason: 'skipped_stakes_none' },
        { id: 'cleanup', status: laterStatus, reason: laterReason },
      ])
    }
  )

  it.each([
    {
      hold: { kind: 'hold_aim' as const, instanceId: 'encounter:explanation-hold' },
      holdReason: 'hold_aim' as const,
      clash: { status: 'held' as const, reason: 'hold_aim' as const },
      emission: { status: 'held' as const, reason: 'hold_aim' as const },
    },
    {
      hold: {
        kind: 'abort' as const,
        instanceId: 'encounter:explanation-hold',
        reason: 'lost_line_of_sight',
      },
      holdReason: 'hold_abort' as const,
      clash: { status: 'aborted' as const, reason: 'hold_abort' as const },
      emission: { status: 'aborted' as const, reason: 'hold_abort' as const },
    },
    {
      hold: { kind: 'delayed_emission' as const, instanceId: 'encounter:explanation-hold' },
      holdReason: 'hold_delayed_emission' as const,
      clash: { status: 'ran' as const, reason: 'ran' as const },
      emission: { status: 'delayed' as const, reason: 'hold_delayed_emission' as const },
    },
  ])(
    'explains $hold.kind from already-resolved hold statuses',
    ({ hold, holdReason, clash, emission }) => {
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:explanation-hold',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
        mode: 'advanced_action',
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        hold,
      })

      expect(result.explanation.hold).toEqual({ kind: hold.kind, reason: holdReason })
      expect(result.explanation.phases).toEqual([
        { id: 'posture_commit', status: 'ran', reason: 'ran_posture_commit' },
        { id: 'environmental_read', status: 'ran', reason: 'ran' },
        { id: 'clash_window', status: clash.status, reason: clash.reason },
        { id: 'effect_emission', status: emission.status, reason: emission.reason },
        { id: 'cleanup', status: 'ran', reason: 'ran' },
      ])
    }
  )

  it('keeps no-stakes skip and interrupt rewrite explanations over hold', () => {
    const skipped = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-hold-precedence',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'none',
      actionPriority: snapshot([actor('actor:alpha')]),
      hold: { kind: 'hold_aim', instanceId: 'encounter:explanation-hold-precedence' },
    })
    const rewritten = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-hold-precedence',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      interrupt: { kind: 'truncate', windowId: VOLATILE_ACTION_REACTION_WINDOW_ID },
      hold: { kind: 'delayed_emission', instanceId: 'encounter:explanation-hold-precedence' },
    })

    expect(skipped.explanation.hold.reason).toBe('hold_aim')
    expect(skipped.explanation.phases[2]).toEqual({
      id: 'clash_window',
      status: 'skipped',
      reason: 'skipped_stakes_none',
    })
    expect(rewritten.explanation.hold.reason).toBe('hold_delayed_emission')
    expect(rewritten.explanation.interrupt.reason).toBe('interrupt_truncate')
    expect(rewritten.explanation.phases[3]).toEqual({
      id: 'effect_emission',
      status: 'truncated',
      reason: 'interrupt_truncate',
    })
  })

  it('explains hazard declaration and ladder steps without changing phase statuses', () => {
    const result = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-hazard',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([actor('actor:alpha')]),
      hold: { kind: 'hold_aim', instanceId: 'encounter:explanation-hazard' },
      hazard: {
        kind: 'impending',
        hazardId: 'hazard:rupture',
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      },
    })

    expect(result.phases).toEqual([
      { id: 'posture_commit', status: 'ran' },
      { id: 'environmental_read', status: 'ran' },
      { id: 'clash_window', status: 'held' },
      { id: 'effect_emission', status: 'held' },
      { id: 'cleanup', status: 'ran' },
    ])
    expect(result.explanation.hazardDeclaration).toEqual({
      status: 'declared',
      reason: 'hazard_declared_at_posture_commit',
    })
    expect(result.explanation.consequenceReduction).toEqual([
      { id: 'expose', phaseId: 'environmental_read', status: 'ran', reason: 'ran' },
      { id: 'mitigate', phaseId: 'clash_window', status: 'held', reason: 'hold_aim' },
      { id: 'apply', phaseId: 'effect_emission', status: 'held', reason: 'hold_aim' },
    ])
  })

  it.each([
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'task' as const,
    },
    {
      variantId: VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
      mode: 'test' as const,
    },
    {
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action' as const,
    },
  ])(
    'keeps variant $variantId and mode $mode unchanged when explanation is present',
    ({ variantId, mode }) => {
      const result = resolveVolatileActionPhasePipeline({
        encounterId: 'encounter:explanation-tags',
        variantId,
        mode,
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
      })

      expect(result.variantId).toBe(variantId)
      expect(result.mode).toBe(mode)
      expect(result.explanation.bypass.reason).toBe('stakes_present')
      expect(result.explanation.phases.map((phase) => phase.id)).toEqual([
        ...VOLATILE_ACTION_V1_PHASE_IDS,
      ])
    }
  )

  it('does not infer explanation from SPE-54 scores or actor array order', () => {
    const actors = [
      actor('actor:alpha', { precision: 80 }),
      actor('actor:bravo', { precision: 40 }),
    ]
    const first = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-order',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot(actors),
    })
    const reversed = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:explanation-order',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: snapshot([...actors].reverse()),
    })

    expect(first.explanation).toEqual(reversed.explanation)
    expect(JSON.stringify(first.explanation)).not.toMatch(/actor:alpha|actor:bravo|priorityScore/)
  })
})
