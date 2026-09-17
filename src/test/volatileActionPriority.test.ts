import { describe, expect, it } from 'vitest'
import {
  VOLATILE_ACTION_PRIORITY_BASE_SCORE,
  recalculateVolatileActionPriority,
  resolveVolatileActionPriority,
  type VolatileActionPriorityActorInput,
  type VolatileActionPriorityFactorCode,
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

function priorityFor(result: ReturnType<typeof resolveVolatileActionPriority>, actorId: string) {
  const priority = result.actorPriorities.find((entry) => entry.actorId === actorId)
  if (!priority) throw new Error(`Missing test priority for ${actorId}.`)
  return priority
}

describe('volatile action priority', () => {
  it('resolves exact actor priority deterministically without depending on input order', () => {
    const actors = [
      actor('actor:alpha', {
        posture: 'braced',
        exposure: 'concealed',
        precision: 85,
        aimCommitment: 'committed',
      }),
      actor('actor:bravo', {
        posture: 'mobile',
        precision: 65,
        aimCommitment: 'tracking',
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('actor:charlie', {
        readiness: 'strained',
        exposure: 'exposed',
        injury: 'minor',
        toolState: 'damaged',
        precision: 35,
      }),
    ]
    const original = structuredClone(actors)

    const first = resolveVolatileActionPriority({
      encounterId: 'encounter:loading-bay',
      mode: { kind: 'per_actor' },
      actors,
    })
    const replay = resolveVolatileActionPriority({
      encounterId: 'encounter:loading-bay',
      mode: { kind: 'per_actor' },
      actors: [...actors].reverse(),
    })

    expect(first).toEqual(replay)
    expect(JSON.stringify(first)).toBe(JSON.stringify(replay))
    expect(actors).toEqual(original)
    expect(first.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:bravo', 'actor:alpha', 'actor:charlie'],
    })
    expect(
      first.actorPriorities.map(({ actorId, priorityScore, priorityRank }) => ({
        actorId,
        priorityScore,
        priorityRank,
      }))
    ).toEqual([
      { actorId: 'actor:bravo', priorityScore: 86, priorityRank: 1 },
      { actorId: 'actor:alpha', priorityScore: 83, priorityRank: 2 },
      { actorId: 'actor:charlie', priorityScore: 34, priorityRank: 3 },
    ])
    expect(priorityFor(first, 'actor:bravo').dominantDriverCodes).toEqual([
      'readiness',
      'targeting_mode',
      'tool_state',
    ])
  })

  it.each<{
    name: string
    factorCode: VolatileActionPriorityFactorCode
    overrides: Partial<VolatileActionPriorityActorInput>
    expectedScoreDelta: number
    expectedFactorDelta: number
  }>([
    {
      name: 'readiness',
      factorCode: 'readiness',
      overrides: { readiness: 'strained' },
      expectedScoreDelta: -6,
      expectedFactorDelta: 2,
    },
    {
      name: 'posture',
      factorCode: 'posture',
      overrides: { posture: 'braced' },
      expectedScoreDelta: 6,
      expectedFactorDelta: 6,
    },
    {
      name: 'exposure',
      factorCode: 'exposure',
      overrides: { exposure: 'pinned' },
      expectedScoreDelta: -10,
      expectedFactorDelta: -8,
    },
    {
      name: 'injury',
      factorCode: 'injury',
      overrides: { injury: 'moderate' },
      expectedScoreDelta: -10,
      expectedFactorDelta: -10,
    },
    {
      name: 'tool state',
      factorCode: 'tool_state',
      overrides: { toolState: 'damaged' },
      expectedScoreDelta: -10,
      expectedFactorDelta: -6,
    },
    {
      name: 'precision',
      factorCode: 'precision',
      overrides: { precision: 90 },
      expectedScoreDelta: 6,
      expectedFactorDelta: 6,
    },
    {
      name: 'aim commitment',
      factorCode: 'aim_commitment',
      overrides: { aimCommitment: 'committed' },
      expectedScoreDelta: 6,
      expectedFactorDelta: 6,
    },
  ])(
    'makes $name an inspectable signed priority driver',
    ({ factorCode, overrides, expectedScoreDelta, expectedFactorDelta }) => {
      const baseline = resolveVolatileActionPriority({
        encounterId: 'encounter:factor-baseline',
        mode: { kind: 'per_actor' },
        actors: [actor('actor:alpha')],
      })
      const changed = resolveVolatileActionPriority({
        encounterId: 'encounter:factor-baseline',
        mode: { kind: 'per_actor' },
        actors: [actor('actor:alpha', overrides)],
      })
      const baselinePriority = priorityFor(baseline, 'actor:alpha')
      const changedPriority = priorityFor(changed, 'actor:alpha')
      const changedFactor = changedPriority.factors.find((entry) => entry.code === factorCode)

      expect(changedPriority.priorityScore).toBe(
        (baselinePriority.priorityScore as number) + expectedScoreDelta
      )
      expect(changedFactor?.delta).toBe(expectedFactorDelta)
      expect(changedPriority.priorityScore).toBe(
        changedPriority.baseScore +
          changedPriority.factors.reduce((total, entry) => total + entry.delta, 0)
      )
      expect(changedPriority.baseScore).toBe(VOLATILE_ACTION_PRIORITY_BASE_SCORE)
      expect(changedPriority.factors.map((entry) => entry.code)).toEqual([
        'readiness',
        'posture',
        'exposure',
        'injury',
        'tool_state',
        'precision',
        'aim_commitment',
        'targeting_mode',
      ])
      expect(changedFactor?.sourceLabel.length).toBeGreaterThan(0)
    }
  )

  it('keeps the calibrated eligible score bounded and fails unavailable action state closed', () => {
    const result = resolveVolatileActionPriority({
      encounterId: 'encounter:bounds',
      mode: { kind: 'per_actor' },
      actors: [
        actor('actor:max', {
          posture: 'braced',
          exposure: 'concealed',
          precision: 100,
          aimCommitment: 'committed',
          targetingMode: 'rapid_nearest_valid',
        }),
        actor('actor:min', {
          readiness: 'critical',
          posture: 'compromised',
          exposure: 'pinned',
          injury: 'moderate',
          toolState: 'damaged',
          precision: 0,
        }),
        actor('actor:blocked', {
          readiness: 'unavailable',
          toolState: 'unavailable',
          targetingMode: 'rapid_nearest_valid',
        }),
      ],
    })

    expect(priorityFor(result, 'actor:max').priorityScore).toBe(97)
    expect(priorityFor(result, 'actor:min').priorityScore).toBe(3)
    expect(priorityFor(result, 'actor:blocked')).toMatchObject({
      eligible: false,
      blockers: ['readiness_unavailable', 'tool_unavailable'],
      priorityScore: null,
      priorityRank: null,
    })
    expect(result.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:max', 'actor:min'],
    })
  })

  it('makes rapid nearest-valid execution faster than explicit designation without resolving outcomes', () => {
    const result = resolveVolatileActionPriority({
      encounterId: 'encounter:targeting-tradeoff',
      mode: { kind: 'per_actor' },
      actors: [
        actor('actor:designated', { targetingMode: 'explicit_designation' }),
        actor('actor:rapid', { targetingMode: 'rapid_nearest_valid' }),
      ],
    })

    expect(result.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:rapid', 'actor:designated'],
    })
    expect(priorityFor(result, 'actor:rapid').priorityScore).toBe(77)
    expect(priorityFor(result, 'actor:designated').priorityScore).toBe(63)
    expect(
      priorityFor(result, 'actor:rapid').factors.find((entry) => entry.code === 'targeting_mode')
    ).toMatchObject({ sourceLabel: 'Rapid nearest-valid', delta: 8 })
    expect(
      priorityFor(result, 'actor:designated').factors.find(
        (entry) => entry.code === 'targeting_mode'
      )
    ).toMatchObject({ sourceLabel: 'Explicit designation', delta: -6 })
  })

  it('recalculates from changed state and reports priority shifts without mutating history', () => {
    const originalActors = [
      actor('actor:alpha', {
        posture: 'braced',
        exposure: 'concealed',
        precision: 90,
        aimCommitment: 'committed',
      }),
      actor('actor:bravo', { targetingMode: 'rapid_nearest_valid' }),
    ]
    const initial = resolveVolatileActionPriority({
      encounterId: 'encounter:precision-shift',
      mode: { kind: 'per_actor' },
      actors: originalActors,
    })
    const frozenHistory = structuredClone(initial)

    const depleted = recalculateVolatileActionPriority(initial, {
      encounterId: 'encounter:precision-shift',
      mode: { kind: 'per_actor' },
      actors: [
        actor('actor:alpha', {
          posture: 'braced',
          exposure: 'exposed',
          toolState: 'damaged',
          precision: 10,
          aimCommitment: 'committed',
        }),
        actor('actor:bravo', { targetingMode: 'rapid_nearest_valid' }),
      ],
    })

    expect(initial.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:alpha', 'actor:bravo'],
    })
    expect(depleted.current.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:bravo', 'actor:alpha'],
    })
    expect(depleted.shifts).toEqual([
      {
        actorId: 'actor:alpha',
        previousRank: 1,
        currentRank: 2,
        previousScore: 83,
        currentScore: 53,
        scoreDelta: -30,
        movement: 'later',
        changedFactorCodes: ['exposure', 'tool_state', 'precision'],
      },
      {
        actorId: 'actor:bravo',
        previousRank: 2,
        currentRank: 1,
        previousScore: 77,
        currentScore: 77,
        scoreDelta: 0,
        movement: 'earlier',
        changedFactorCodes: [],
      },
    ])
    expect(initial).toEqual(frozenHistory)

    const recovered = recalculateVolatileActionPriority(depleted.current, {
      encounterId: 'encounter:precision-shift',
      mode: { kind: 'per_actor' },
      actors: originalActors,
    })
    expect(recovered.current.sequence).toEqual(initial.sequence)
    expect(priorityFor(recovered.current, 'actor:alpha').priorityScore).toBe(83)
  })

  it('uses fallback order and then code-unit actor IDs only after equal state scores', () => {
    const withFallback = resolveVolatileActionPriority({
      encounterId: 'encounter:tie-fallback',
      mode: { kind: 'per_actor' },
      actors: [
        actor('actor:alpha', { fallbackOrder: 2 }),
        actor('actor:bravo', { fallbackOrder: 1 }),
      ],
    })
    const byId = resolveVolatileActionPriority({
      encounterId: 'encounter:tie-id',
      mode: { kind: 'per_actor' },
      actors: [actor('actor:zulu'), actor('actor:alpha')],
    })

    expect(withFallback.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:bravo', 'actor:alpha'],
    })
    expect(byId.sequence).toEqual({
      kind: 'per_actor',
      actorIds: ['actor:alpha', 'actor:zulu'],
    })
  })

  it('supports deterministic state-driven and externally declared bounded side blocks', () => {
    const actors = [
      actor('responder:fast', {
        sideId: 'responders',
        posture: 'braced',
        exposure: 'concealed',
        precision: 100,
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('hostile:fast', {
        sideId: 'hostiles',
        posture: 'braced',
        precision: 80,
        targetingMode: 'rapid_nearest_valid',
      }),
      actor('responder:slow', {
        sideId: 'responders',
        readiness: 'strained',
        injury: 'minor',
        toolState: 'damaged',
        precision: 20,
      }),
      actor('hostile:slow', {
        sideId: 'hostiles',
        readiness: 'critical',
        exposure: 'exposed',
        injury: 'moderate',
        precision: 20,
      }),
    ]
    const perActor = resolveVolatileActionPriority({
      encounterId: 'encounter:side-blocks',
      mode: { kind: 'per_actor' },
      actors,
    })
    const stateDriven = resolveVolatileActionPriority({
      encounterId: 'encounter:side-blocks',
      mode: { kind: 'side_phase' },
      actors,
    })
    const declared = resolveVolatileActionPriority({
      encounterId: 'encounter:side-blocks',
      mode: { kind: 'side_phase', declaredSideOrder: ['hostiles', 'responders'] },
      actors: [...actors].reverse(),
    })

    expect(perActor.sequence).toMatchObject({
      kind: 'per_actor',
      actorIds: ['responder:fast', 'hostile:fast', 'responder:slow', 'hostile:slow'],
    })
    expect(stateDriven.sequence).toEqual({
      kind: 'side_phase',
      precedenceSource: 'state_driven',
      sideGroups: [
        {
          sideId: 'responders',
          sidePhaseIndex: 1,
          actorIds: ['responder:fast', 'responder:slow'],
          leadActorId: 'responder:fast',
          leadPriorityScore: 91,
          dominantDriverCodes: ['readiness', 'targeting_mode', 'posture'],
        },
        {
          sideId: 'hostiles',
          sidePhaseIndex: 2,
          actorIds: ['hostile:fast', 'hostile:slow'],
          leadActorId: 'hostile:fast',
          leadPriorityScore: 89,
          dominantDriverCodes: ['readiness', 'targeting_mode', 'posture'],
        },
      ],
    })
    expect(declared.sequence).toEqual({
      kind: 'side_phase',
      precedenceSource: 'declared',
      sideGroups: [
        {
          sideId: 'hostiles',
          sidePhaseIndex: 1,
          actorIds: ['hostile:fast', 'hostile:slow'],
          leadActorId: 'hostile:fast',
          leadPriorityScore: 89,
          dominantDriverCodes: ['readiness', 'targeting_mode', 'posture'],
        },
        {
          sideId: 'responders',
          sidePhaseIndex: 2,
          actorIds: ['responder:fast', 'responder:slow'],
          leadActorId: 'responder:fast',
          leadPriorityScore: 91,
          dominantDriverCodes: ['readiness', 'targeting_mode', 'posture'],
        },
      ],
    })
    const declaredActorIds =
      declared.sequence.kind === 'side_phase'
        ? declared.sequence.sideGroups.flatMap((group) => group.actorIds)
        : []
    expect(new Set(declaredActorIds).size).toBe(actors.length)
  })

  it('omits empty blocked side groups while retaining their inspectable actor rows', () => {
    const result = resolveVolatileActionPriority({
      encounterId: 'encounter:blocked-side',
      mode: { kind: 'side_phase', declaredSideOrder: ['hostiles', 'responders'] },
      actors: [
        actor('hostile:blocked', {
          sideId: 'hostiles',
          readiness: 'unavailable',
        }),
        actor('responder:ready', { sideId: 'responders' }),
      ],
    })

    expect(result.sequence).toMatchObject({
      kind: 'side_phase',
      sideGroups: [{ sideId: 'responders', actorIds: ['responder:ready'] }],
    })
    expect(priorityFor(result, 'hostile:blocked')).toMatchObject({
      eligible: false,
      priorityScore: null,
    })
  })

  it.each([
    {
      name: 'duplicate actor IDs',
      actors: [actor('actor:alpha'), actor('actor:alpha')],
      mode: { kind: 'per_actor' as const },
      message: /actorId must be unique/,
    },
    {
      name: 'out-of-range precision',
      actors: [actor('actor:alpha', { precision: 101 })],
      mode: { kind: 'per_actor' as const },
      message: /precision must be a safe integer/,
    },
    {
      name: 'untrimmed actor IDs',
      actors: [actor(' actor:alpha')],
      mode: { kind: 'per_actor' as const },
      message: /actorId must be a non-empty trimmed string/,
    },
    {
      name: 'invalid fallback order',
      actors: [actor('actor:alpha', { fallbackOrder: -1 })],
      mode: { kind: 'per_actor' as const },
      message: /fallbackOrder.*non-negative safe integer/,
    },
    {
      name: 'unsupported posture',
      actors: [
        actor('actor:alpha', {
          posture: 'floating' as VolatileActionPriorityActorInput['posture'],
        }),
      ],
      mode: { kind: 'per_actor' as const },
      message: /posture.*unsupported value/,
    },
    {
      name: 'non-finite precision',
      actors: [actor('actor:alpha', { precision: Number.NaN })],
      mode: { kind: 'per_actor' as const },
      message: /precision must be a safe integer/,
    },
    {
      name: 'duplicate declared sides',
      actors: [actor('actor:alpha')],
      mode: {
        kind: 'side_phase' as const,
        declaredSideOrder: ['responders', 'responders'],
      },
      message: /repeats sideId/,
    },
    {
      name: 'incomplete declared sides',
      actors: [actor('actor:alpha'), actor('actor:bravo', { sideId: 'hostiles' })],
      mode: { kind: 'side_phase' as const, declaredSideOrder: ['responders'] },
      message: /every participating side exactly once/,
    },
  ])('rejects $name', ({ actors, mode, message }) => {
    expect(() =>
      resolveVolatileActionPriority({
        encounterId: 'encounter:invalid',
        mode,
        actors,
      })
    ).toThrow(message)
  })
})
