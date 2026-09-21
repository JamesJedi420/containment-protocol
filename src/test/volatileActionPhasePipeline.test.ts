import { describe, expect, it } from 'vitest'
import {
  VOLATILE_ACTION_PHASE_VARIANT_ID,
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
      stakes: 'present',
      actionPriority: snapshot(actors),
    })
    const replay = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:loading-bay',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
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
        stakes: 'present' as const,
        actionPriority: snapshot([actor('actor:alpha')]),
      },
      message: 'variantId must be volatile_action_v1.',
    },
    {
      name: 'unknown stakes',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
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
        stakes: 'present' as const,
      },
      message: 'actionPriority is required.',
    },
    {
      name: 'mismatched actionPriority encounterId',
      input: {
        encounterId: 'encounter:alpha',
        variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
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
      stakes: 'present',
      actionPriority,
    })
    const none = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-interrupt',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
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
      stakes: 'present',
      actionPriority,
    })
    const none = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:default-hold',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
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
        stakes: 'present',
        actionPriority: snapshot([actor('actor:alpha')]),
        hold: hold as Parameters<typeof resolveVolatileActionPhasePipeline>[0]['hold'],
      })
    ).toThrow(message)
  })
})
