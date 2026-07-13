import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { evaluateContentOwnerTakedownResistance, EXAMPLE_RESISTING_CONTENT_OWNER } from '../domain/contentOwnerTakedownResistance'
import { evaluateCounterMemeticUptakeGate, EXAMPLE_COUNTER_MEMETIC_PLAN } from '../domain/counterMemeticUptakeGate'
import { evaluateFootageExposureTraffic, EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT } from '../domain/footageExposureTraffic'
import {
  EXAMPLE_COUNTER_MEMETIC_BLAST,
  EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
  evaluatePlatformOperationDegrade,
} from '../domain/platformOperationDegrade'
import { evaluatePlatformReachMultiplier, EXAMPLE_RUMOR_FORUM_PLATFORM } from '../domain/platformReachMultiplier'
import { evaluatePostCaseMediaPersistence, EXAMPLE_PERSISTING_POST_CASE_MEDIA } from '../domain/postCaseMediaPersistence'
import {
  resolveCounterMemeticUptakeEvaluationInput,
  resolveFootageExposureEvaluationInput,
  resolvePlatformOperationEvaluationInput,
  resolvePlatformReachEvaluationInput,
  resolvePostCaseMediaPersistenceInput,
  resolveTakedownResistanceEvaluationInput,
  sanitizeSpe947ContentOwners,
  sanitizeSpe947CounterMemeticPlans,
  sanitizeSpe947FootageExposureBindings,
  sanitizeSpe947OperationRecords,
  sanitizeSpe947PlatformRecords,
  sanitizeSpe947PostCaseMediaCases,
  sanitizeSpe947TakedownResistanceBindings,
  SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
} from '../domain/spe947EvaluatorPersistence'

describe('spe947EvaluatorPersistence (SPE-2576 / SPE-947)', () => {
  it('defaults starting state to empty SPE-947 evaluator maps', () => {
    const state = createStartingState()

    expect(state.spe947PlatformRecords).toEqual({})
    expect(state.spe947OperationRecords).toEqual({})
    expect(state.spe947ContentArtifacts).toEqual({})
    expect(state.spe947CounterMemeticPlans).toEqual({})
    expect(state.spe947ContentOwners).toEqual({})
    expect(state.spe947PostCaseMediaCases).toEqual({})
    expect(state.spe947FootageExposureBindings).toEqual({})
    expect(state.spe947TakedownResistanceBindings).toEqual({})
    expect(state.spe947VisualTriggerHazardBindings).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitizedPlatforms = sanitizeSpe947PlatformRecords(
      {
        valid: EXAMPLE_RUMOR_FORUM_PLATFORM,
        duplicate: {
          ...EXAMPLE_RUMOR_FORUM_PLATFORM,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          reachFactor: 1,
          viewsPerScaleUnit: 1,
        },
        wrongKey: {
          ...EXAMPLE_RUMOR_FORUM_PLATFORM,
          id: 'platform:other',
        },
        badReachFactor: {
          id: 'platform:bad-factor',
          label: 'Bad factor',
          reachFactor: -1,
          viewsPerScaleUnit: 100,
        },
      },
      fallback
    )

    expect(sanitizedPlatforms[EXAMPLE_RUMOR_FORUM_PLATFORM.id]).toEqual(EXAMPLE_RUMOR_FORUM_PLATFORM)
    expect(sanitizedPlatforms.duplicate).toBeUndefined()
    expect(sanitizedPlatforms.invalid).toBeUndefined()
    expect(sanitizedPlatforms['wrong-key']).toBeUndefined()
    expect(sanitizedPlatforms.badReachFactor).toBeUndefined()
  })

  it('preserves valid SPE-2577 weekly tick fields and drops invalid ones', () => {
    const sanitizedPlatforms = sanitizeSpe947PlatformRecords({
      withDeltas: {
        id: 'platform:with-deltas',
        label: 'With deltas',
        viewCount: 10,
        weeklyViewDelta: 5,
        weeklyUptimeState: 'degraded',
        lastWeeklyTickWeek: 3,
      },
      badViewDelta: {
        id: 'platform:bad-view-delta',
        label: 'Bad view delta',
        weeklyViewDelta: -1,
      },
      badUptimeDelta: {
        id: 'platform:bad-uptime-delta',
        label: 'Bad uptime delta',
        weeklyUptimeState: 'not_a_state',
      },
      badTickWeek: {
        id: 'platform:bad-tick-week',
        label: 'Bad tick week',
        lastWeeklyTickWeek: 0,
      },
    })

    expect(sanitizedPlatforms['platform:with-deltas']).toEqual({
      id: 'platform:with-deltas',
      label: 'With deltas',
      viewCount: 10,
      weeklyViewDelta: 5,
      weeklyUptimeState: 'degraded',
      lastWeeklyTickWeek: 3,
    })
    expect(sanitizedPlatforms['platform:bad-view-delta']).toBeUndefined()
    expect(sanitizedPlatforms['platform:bad-uptime-delta']).toBeUndefined()
    expect(sanitizedPlatforms['platform:bad-tick-week']).toBeUndefined()

    const sanitizedPlans = sanitizeSpe947CounterMemeticPlans({
      withTick: {
        ...EXAMPLE_COUNTER_MEMETIC_PLAN,
        lastWeeklyTickWeek: 4,
      },
      badTick: {
        ...EXAMPLE_COUNTER_MEMETIC_PLAN,
        id: 'plan:bad-tick',
        lastWeeklyTickWeek: 1.5,
      },
    })

    expect(sanitizedPlans[EXAMPLE_COUNTER_MEMETIC_PLAN.id]?.lastWeeklyTickWeek).toBe(4)
    expect(sanitizedPlans['plan:bad-tick']).toBeUndefined()
  })

  it('round-trips EXAMPLE persistence fixture through save/load', () => {
    const state = createStartingState()
    Object.assign(state, SPE_947_EXAMPLE_PERSISTENCE_FIXTURE)

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe947PlatformRecords).toEqual(state.spe947PlatformRecords)
    expect(loaded.spe947OperationRecords).toEqual(state.spe947OperationRecords)
    expect(loaded.spe947ContentArtifacts).toEqual(state.spe947ContentArtifacts)
    expect(loaded.spe947CounterMemeticPlans).toEqual(state.spe947CounterMemeticPlans)
    expect(loaded.spe947ContentOwners).toEqual(state.spe947ContentOwners)
    expect(loaded.spe947PostCaseMediaCases).toEqual(state.spe947PostCaseMediaCases)
    expect(loaded.spe947FootageExposureBindings).toEqual(state.spe947FootageExposureBindings)
    expect(loaded.spe947TakedownResistanceBindings).toEqual(
      state.spe947TakedownResistanceBindings
    )
    expect(loaded.spe947VisualTriggerHazardBindings).toEqual(
      state.spe947VisualTriggerHazardBindings
    )
  })

  it('hydrates persisted SPE-947 evaluator maps through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
        spe947PlatformRecords: {
          ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947PlatformRecords,
          invalid: {
            id: 'platform:invalid',
            label: 'Invalid uptime',
            uptimeState: 'not_a_state',
          },
        },
        spe947ContentArtifacts: {
          [EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id]: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
          invalid: {
            id: 'artifact:invalid',
            label: 'Bad role',
            kind: 'footage',
            role: 'not_a_role',
            exposureWeight: 1,
            attractionWeight: 1,
          },
        },
      },
      fallback
    )

    expect(hydrated.spe947PlatformRecords).toEqual(
      SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947PlatformRecords
    )
    expect(hydrated.spe947ContentArtifacts).toEqual({
      [EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id]: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
    })
  })

  it('feeds SPE-2568–2573 evaluators from persisted shape with EXAMPLE-equivalent decisions', () => {
    const maps = SPE_947_EXAMPLE_PERSISTENCE_FIXTURE

    const reachDecision = evaluatePlatformReachMultiplier(
      resolvePlatformReachEvaluationInput(maps, EXAMPLE_RUMOR_FORUM_PLATFORM.id)
    )
    expect(reachDecision.multiplier).toBe(3)
    expect(reachDecision.reachValue).toBe(30)

    const operationDecision = evaluatePlatformOperationDegrade(
      resolvePlatformOperationEvaluationInput(
        maps,
        EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM.id,
        EXAMPLE_COUNTER_MEMETIC_BLAST.id
      )
    )
    expect(operationDecision.outcome).toBe('ok')

    const uptakeDecision = evaluateCounterMemeticUptakeGate(
      resolveCounterMemeticUptakeEvaluationInput(maps, EXAMPLE_COUNTER_MEMETIC_PLAN.id)
    )
    expect(uptakeDecision.readiness).toBe('ready')

    const footageDecision = evaluateFootageExposureTraffic(
      resolveFootageExposureEvaluationInput(maps, EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id)
    )
    expect(footageDecision.amplified).toBe(true)
    expect(footageDecision.civilianExposureDelta).toBeGreaterThan(0)

    const takedownInput = resolveTakedownResistanceEvaluationInput(
      maps,
      EXAMPLE_RESISTING_CONTENT_OWNER.id
    )
    expect(takedownInput).not.toBeNull()
    const takedownDecision = evaluateContentOwnerTakedownResistance(takedownInput!)
    expect(takedownDecision.outcome).toBe('resists')

    const postCaseInput = resolvePostCaseMediaPersistenceInput(
      maps,
      EXAMPLE_PERSISTING_POST_CASE_MEDIA.caseId ?? 'case:site-echo-7'
    )
    expect(postCaseInput).not.toBeNull()
    const postCaseDecision = evaluatePostCaseMediaPersistence(postCaseInput!)
    expect(postCaseDecision.outcome).toBe('remains_risky')
  })

  it('empty default persisted maps do not falsely satisfy parent AC evaluator scenarios', () => {
    const maps = createStartingState()

    const reachDecision = evaluatePlatformReachMultiplier(
      resolvePlatformReachEvaluationInput(maps, EXAMPLE_RUMOR_FORUM_PLATFORM.id)
    )
    expect(reachDecision.reasonCodes).toContain('missing_platform')

    const operationDecision = evaluatePlatformOperationDegrade(
      resolvePlatformOperationEvaluationInput(
        maps,
        EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM.id,
        EXAMPLE_COUNTER_MEMETIC_BLAST.id
      )
    )
    expect(operationDecision.outcome).not.toBe('ok')

    const uptakeDecision = evaluateCounterMemeticUptakeGate(
      resolveCounterMemeticUptakeEvaluationInput(maps, EXAMPLE_COUNTER_MEMETIC_PLAN.id)
    )
    expect(uptakeDecision.readiness).toBe('blocked')

    const footageDecision = evaluateFootageExposureTraffic(
      resolveFootageExposureEvaluationInput(maps, EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id)
    )
    expect(footageDecision.amplified).toBe(false)

    expect(
      resolveTakedownResistanceEvaluationInput(maps, EXAMPLE_RESISTING_CONTENT_OWNER.id)
    ).toBeNull()

    expect(
      resolvePostCaseMediaPersistenceInput(
        maps,
        EXAMPLE_PERSISTING_POST_CASE_MEDIA.caseId ?? 'case:site-echo-7'
      )
    ).toBeNull()
  })

  it('drops invalid post-case media cases and nested artifacts without throwing', () => {
    const sanitized = sanitizeSpe947PostCaseMediaCases({
      valid: EXAMPLE_PERSISTING_POST_CASE_MEDIA,
      invalidThreshold: {
        caseId: 'case:bad-threshold',
        caseLabel: 'Bad threshold',
        localContainmentSucceeded: true,
        riskThreshold: 0,
        mediaArtifacts: [],
      },
      invalidArtifact: {
        caseId: 'case:bad-artifact',
        caseLabel: 'Bad artifact',
        localContainmentSucceeded: true,
        riskThreshold: 3,
        mediaArtifacts: [
          {
            id: 'media:bad',
            label: 'Bad kind',
            kind: 'not_a_kind',
            persistsAfterContainment: true,
            riskWeight: 1,
          },
        ],
      },
    })

    expect(sanitized['case:site-echo-7']).toEqual(EXAMPLE_PERSISTING_POST_CASE_MEDIA)
    expect(sanitized['case:bad-threshold']).toBeUndefined()
    expect(sanitized['case:bad-artifact']).toBeDefined()
    expect(sanitized['case:bad-artifact']?.mediaArtifacts).toEqual([])
  })

  it('drops invalid takedown bindings with contestedThreshold >= resistThreshold', () => {
    const sanitized = sanitizeSpe947TakedownResistanceBindings({
      valid: {
        ownerId: EXAMPLE_RESISTING_CONTENT_OWNER.id,
        resistThreshold: 8,
        contestedThreshold: 4,
      },
      invalid: {
        ownerId: 'owner:invalid-band',
        resistThreshold: 5,
        contestedThreshold: 5,
      },
    })

    expect(sanitized[EXAMPLE_RESISTING_CONTENT_OWNER.id]).toEqual({
      ownerId: EXAMPLE_RESISTING_CONTENT_OWNER.id,
      resistThreshold: 8,
      contestedThreshold: 4,
    })
    expect(sanitized['owner:invalid-band']).toBeUndefined()
  })

  it('drops invalid footage exposure bindings with negative baselines', () => {
    const sanitized = sanitizeSpe947FootageExposureBindings({
      valid: {
        artifactId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
        baselineCivilianExposure: 10,
      },
      invalid: {
        artifactId: 'artifact:negative-baseline',
        baselineAttractionTraffic: -1,
      },
    })

    expect(sanitized[EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id]).toEqual({
      artifactId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
      baselineCivilianExposure: 10,
    })
    expect(sanitized['artifact:negative-baseline']).toBeUndefined()
  })

  it('drops invalid counter-memetic plans and operations during sanitize', () => {
    const plans = sanitizeSpe947CounterMemeticPlans({
      valid: EXAMPLE_COUNTER_MEMETIC_PLAN,
      invalid: {
        ...EXAMPLE_COUNTER_MEMETIC_PLAN,
        loreState: 'not_a_state',
      },
    })
    expect(plans[EXAMPLE_COUNTER_MEMETIC_PLAN.id]).toEqual(EXAMPLE_COUNTER_MEMETIC_PLAN)
    expect(plans.invalid).toBeUndefined()

    const operations = sanitizeSpe947OperationRecords({
      valid: EXAMPLE_COUNTER_MEMETIC_BLAST,
      invalid: {
        id: 'operation:bad',
        label: 'Bad reach',
        requiredReach: 0,
      },
    })
    expect(operations[EXAMPLE_COUNTER_MEMETIC_BLAST.id]).toEqual(EXAMPLE_COUNTER_MEMETIC_BLAST)
    expect(operations['operation:bad']).toBeUndefined()
  })

  it('drops invalid content owners during sanitize', () => {
    const owners = sanitizeSpe947ContentOwners({
      valid: EXAMPLE_RESISTING_CONTENT_OWNER,
      invalid: {
        id: 'owner:bad',
        label: 'Bad incentives',
        incentives: { audience: -1 },
      },
    })
    expect(owners[EXAMPLE_RESISTING_CONTENT_OWNER.id]).toEqual(EXAMPLE_RESISTING_CONTENT_OWNER)
    expect(owners['owner:bad']).toBeUndefined()
  })
})
