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
})
