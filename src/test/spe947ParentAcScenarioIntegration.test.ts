/**
 * SPE-947 parent AC row 7 — compose SPE-2568–2573 pure evaluators into parent
 * scenario assertions. Domain-evaluator level only; no GameState / weekly / UI.
 * Child Done ≠ SPE-947 umbrella Done.
 */
import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_RESISTING_CONTENT_OWNER,
  evaluateContentOwnerTakedownResistance,
} from '../domain/contentOwnerTakedownResistance'
import {
  EXAMPLE_COUNTER_MEMETIC_PLAN,
  evaluateCounterMemeticUptakeGate,
} from '../domain/counterMemeticUptakeGate'
import {
  EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
  evaluateFootageExposureTraffic,
} from '../domain/footageExposureTraffic'
import {
  EXAMPLE_COUNTER_MEMETIC_BLAST,
  EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
  evaluatePlatformOperationDegrade,
} from '../domain/platformOperationDegrade'
import {
  EXAMPLE_RUMOR_FORUM_PLATFORM,
  evaluatePlatformReachMultiplier,
} from '../domain/platformReachMultiplier'
import {
  EXAMPLE_PERSISTING_POST_CASE_MEDIA,
  evaluatePostCaseMediaPersistence,
} from '../domain/postCaseMediaPersistence'

describe('SPE-947 parent AC scenario integration (SPE-2574 / AC row 7)', () => {
  it('spread: active footage increases civilian exposure and attraction traffic', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
      baselineCivilianExposure: 10,
      baselineAttractionTraffic: 4,
    })

    expect(decision.amplified).toBe(true)
    expect(decision.civilianExposureDelta).toBeGreaterThan(0)
    expect(decision.attractionTrafficDelta).toBeGreaterThan(0)
    expect(decision.resultingCivilianExposure).toBeGreaterThan(10)
    expect(decision.resultingAttractionTraffic).toBeGreaterThan(4)
    expect(decision.reasonCodes).toEqual(['active_spread_amplified'])
  })

  it('reach amplification: configured factor scales anomaly reach with view count', () => {
    const decision = evaluatePlatformReachMultiplier({
      platform: EXAMPLE_RUMOR_FORUM_PLATFORM,
      viewCount: 1000,
      anomalyReach: 10,
    })

    // EXAMPLE: reachFactor 1.5, viewsPerScaleUnit 1000 → multiplier 3; reach 30
    expect(decision.multiplier).toBe(3)
    expect(decision.reachValue).toBe(30)
    expect(decision.viewScale).toBe(1)
    expect(decision.reasonCodes).toEqual(['platform_reach_scaled'])
  })

  it('counter-memetic delay: incomplete propagation keeps the plan propagating, not ready', () => {
    const decision = evaluateCounterMemeticUptakeGate({
      plan: {
        ...EXAMPLE_COUNTER_MEMETIC_PLAN,
        requiredPropagationWeeks: 3,
        elapsedPropagationWeeks: 1,
        uptakeState: 'sufficient',
      },
    })

    expect(decision.readiness).toBe('propagating')
    expect(decision.reasonCodes).toEqual(['propagation_incomplete'])
  })

  it('platform failure: outage fails the operation despite available reach', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: {
        ...EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
        uptimeState: 'outage',
        availableReach: 100,
      },
      operation: EXAMPLE_COUNTER_MEMETIC_BLAST,
    })

    expect(decision.outcome).toBe('failed')
    expect(decision.reasonCodes).toEqual(['platform_outage'])
  })

  it('takedown resistance: audience/status incentives resist shutdown', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: EXAMPLE_RESISTING_CONTENT_OWNER,
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('resists')
    expect(decision.resistanceScore).toBeGreaterThanOrEqual(8)
    expect(decision.reasonCodes).toEqual(['incentive_resistance'])
  })

  it('post-case media: after local containment, persisting media keeps the case risky', () => {
    const decision = evaluatePostCaseMediaPersistence(EXAMPLE_PERSISTING_POST_CASE_MEDIA)

    expect(decision.outcome).toBe('remains_risky')
    expect(decision.remainsRisky).toBe(true)
    expect(decision.localContainmentSucceeded).toBe(true)
    expect(decision.persistenceRiskScore).toBeGreaterThanOrEqual(decision.riskThreshold)
    expect(decision.reasonCodes).toContain('media_persistence_risk')
  })

  it('incomplete-config paths do not falsely satisfy parent AC scenarios', () => {
    const incompleteReach = evaluatePlatformReachMultiplier({
      platform: null,
      viewCount: 5000,
      anomalyReach: 10,
    })
    expect(incompleteReach.reasonCodes).toContain('missing_platform')
    expect(incompleteReach.viewScale).toBe(0)

    const incompleteSpread = evaluateFootageExposureTraffic({
      artifact: null,
      baselineCivilianExposure: 10,
      baselineAttractionTraffic: 4,
    })
    expect(incompleteSpread.amplified).toBe(false)
    expect(incompleteSpread.reasonCodes).toContain('missing_artifact')

    const incompleteGate = evaluateCounterMemeticUptakeGate({
      plan: {
        ...EXAMPLE_COUNTER_MEMETIC_PLAN,
        loreState: 'draft',
      },
    })
    expect(incompleteGate.readiness).not.toBe('ready')
    expect(incompleteGate.reasonCodes).toContain('lore_not_crafted')

    const incompleteOperation = evaluatePlatformOperationDegrade({
      platform: null,
      operation: EXAMPLE_COUNTER_MEMETIC_BLAST,
    })
    expect(incompleteOperation.outcome).toBe('failed')
    expect(incompleteOperation.reasonCodes).toContain('missing_platform')

    const incompleteTakedown = evaluateContentOwnerTakedownResistance({
      owner: null,
      resistThreshold: 8,
    })
    expect(incompleteTakedown.outcome).not.toBe('resists')
    expect(incompleteTakedown.reasonCodes).toContain('missing_owner')

    const incompletePersistenceMissingInput = evaluatePostCaseMediaPersistence(null)
    expect(incompletePersistenceMissingInput.remainsRisky).toBe(false)
    expect(incompletePersistenceMissingInput.outcome).toBe('blocked')
    expect(incompletePersistenceMissingInput.reasonCodes).toContain('missing_evaluation_input')

    const incompletePersistenceMissingMedia = evaluatePostCaseMediaPersistence({
      ...EXAMPLE_PERSISTING_POST_CASE_MEDIA,
      mediaArtifacts: null,
    })
    expect(incompletePersistenceMissingMedia.remainsRisky).toBe(false)
    expect(incompletePersistenceMissingMedia.outcome).toBe('blocked')
    expect(incompletePersistenceMissingMedia.reasonCodes).toContain('media_config_incomplete')
  })

  it('returns byte-stable decisions across all six parent scenario evaluators', () => {
    const reachInput = {
      platform: EXAMPLE_RUMOR_FORUM_PLATFORM,
      viewCount: 250,
      anomalyReach: 4,
    }
    const spreadInput = {
      artifact: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
      baselineCivilianExposure: 10,
      baselineAttractionTraffic: 4,
    }
    const gateInput = {
      plan: {
        ...EXAMPLE_COUNTER_MEMETIC_PLAN,
        requiredPropagationWeeks: 3,
        elapsedPropagationWeeks: 1,
      },
    }
    const operationInput = {
      platform: {
        ...EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
        uptimeState: 'outage' as const,
      },
      operation: EXAMPLE_COUNTER_MEMETIC_BLAST,
    }
    const takedownInput = {
      owner: EXAMPLE_RESISTING_CONTENT_OWNER,
      resistThreshold: 8,
      contestedThreshold: 4,
    }

    const reachFirst = evaluatePlatformReachMultiplier(reachInput)
    const reachSecond = evaluatePlatformReachMultiplier(reachInput)
    expect(reachSecond).toEqual(reachFirst)
    expect(reachFirst.reachValue).toBe(7.5)

    const spreadFirst = evaluateFootageExposureTraffic(spreadInput)
    const spreadSecond = evaluateFootageExposureTraffic(spreadInput)
    expect(spreadSecond).toEqual(spreadFirst)
    expect(spreadFirst.amplified).toBe(true)

    const gateFirst = evaluateCounterMemeticUptakeGate(gateInput)
    const gateSecond = evaluateCounterMemeticUptakeGate(gateInput)
    expect(gateSecond).toEqual(gateFirst)
    expect(gateFirst.readiness).toBe('propagating')

    const operationFirst = evaluatePlatformOperationDegrade(operationInput)
    const operationSecond = evaluatePlatformOperationDegrade(operationInput)
    expect(operationSecond).toEqual(operationFirst)
    expect(operationFirst.outcome).toBe('failed')

    const takedownFirst = evaluateContentOwnerTakedownResistance(takedownInput)
    const takedownSecond = evaluateContentOwnerTakedownResistance(takedownInput)
    expect(takedownSecond).toEqual(takedownFirst)
    expect(takedownFirst.outcome).toBe('resists')

    const persistenceFirst = evaluatePostCaseMediaPersistence(EXAMPLE_PERSISTING_POST_CASE_MEDIA)
    const persistenceSecond = evaluatePostCaseMediaPersistence(EXAMPLE_PERSISTING_POST_CASE_MEDIA)
    expect(persistenceSecond).toEqual(persistenceFirst)
    expect(persistenceFirst.outcome).toBe('remains_risky')
  })
})
