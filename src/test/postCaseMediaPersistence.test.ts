import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_ADAPTATION_COMMERCIALIZATION_POST_CASE_MEDIA,
  EXAMPLE_CLEARED_POST_CASE_MEDIA,
  EXAMPLE_PERSISTING_POST_CASE_MEDIA,
  evaluatePostCaseMediaPersistence,
  type PostCaseMediaArtifact,
  type PostCaseMediaPersistenceInput,
} from '../domain/postCaseMediaPersistence'

function input(
  overrides: Partial<PostCaseMediaPersistenceInput> = {}
): PostCaseMediaPersistenceInput {
  return {
    ...EXAMPLE_PERSISTING_POST_CASE_MEDIA,
    ...overrides,
    mediaArtifacts:
      overrides.mediaArtifacts !== undefined
        ? overrides.mediaArtifacts
        : EXAMPLE_PERSISTING_POST_CASE_MEDIA.mediaArtifacts,
  }
}

function artifact(overrides: Partial<PostCaseMediaArtifact> = {}): PostCaseMediaArtifact {
  return {
    id: 'media:test',
    label: 'Test media',
    kind: 'hazardous_content',
    persistsAfterContainment: true,
    riskWeight: 2,
    ...overrides,
  }
}

describe('postCaseMediaPersistence (SPE-2573 / SPE-947 AC row 6)', () => {
  it('marks the case remains_risky when containment succeeded and media persist past threshold', () => {
    const decision = evaluatePostCaseMediaPersistence(EXAMPLE_PERSISTING_POST_CASE_MEDIA)

    expect(decision.outcome).toBe('remains_risky')
    expect(decision.remainsRisky).toBe(true)
    expect(decision.reasonCodes).toEqual([
      'derivative_persists',
      'hazardous_content_persists',
      'media_persistence_risk',
      'mirror_persists',
    ])
    expect(decision).toEqual(
      expect.objectContaining({
        caseId: 'case:site-echo-7',
        caseLabel: 'Site Echo-7 residual media',
        localContainmentSucceeded: true,
        persistentArtifactCount: 3,
        persistenceRiskScore: 4.5,
        riskThreshold: 3,
      })
    )
  })

  it('clears when containment succeeded and no media persist past the threshold', () => {
    const decision = evaluatePostCaseMediaPersistence(EXAMPLE_CLEARED_POST_CASE_MEDIA)

    expect(decision.outcome).toBe('cleared')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual(['media_cleared'])
    expect(decision.persistentArtifactCount).toBe(0)
    expect(decision.persistenceRiskScore).toBe(0)
  })

  it('clears when containment succeeded and mediaArtifacts is an empty list', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        mediaArtifacts: [],
      })
    )

    expect(decision.outcome).toBe('cleared')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual(['media_cleared'])
    expect(decision.persistentArtifactCount).toBe(0)
  })

  it('clears when persisting weights sum below the risk threshold', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        riskThreshold: 10,
        mediaArtifacts: [
          artifact({ riskWeight: 2 }),
          artifact({ id: 'media:mirror', kind: 'mirror', riskWeight: 1 }),
        ],
      })
    )

    expect(decision.outcome).toBe('cleared')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.persistenceRiskScore).toBe(3)
    expect(decision.reasonCodes).toEqual(['media_cleared'])
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const first = evaluatePostCaseMediaPersistence(EXAMPLE_PERSISTING_POST_CASE_MEDIA)
    const second = evaluatePostCaseMediaPersistence(EXAMPLE_PERSISTING_POST_CASE_MEDIA)

    expect(second).toEqual(first)
    expect(first.outcome).toBe('remains_risky')
  })

  it('blocks when evaluation input is missing', () => {
    const decision = evaluatePostCaseMediaPersistence(undefined)

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual(['media_persistence_blocked', 'missing_evaluation_input'])
  })

  it('blocks when local containment has not succeeded', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        localContainmentSucceeded: false,
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.localContainmentSucceeded).toBe(false)
    expect(decision.reasonCodes).toEqual([
      'local_containment_not_succeeded',
      'media_persistence_blocked',
    ])
  })

  it('blocks when riskThreshold is missing or invalid', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        riskThreshold: 0,
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual([
      'media_persistence_blocked',
      'missing_or_invalid_risk_threshold',
    ])
  })

  it('blocks when mediaArtifacts are missing', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        mediaArtifacts: null,
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual([
      'media_config_incomplete',
      'media_persistence_blocked',
      'missing_media_artifacts',
    ])
  })

  it('blocks when any present media artifact is invalid (never remains risky)', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        mediaArtifacts: [
          artifact(),
          {
            id: 'media:bad',
            label: 'Bad',
            kind: 'mirror',
            persistsAfterContainment: true,
            riskWeight: Number.NaN,
          } as PostCaseMediaArtifact,
        ],
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toContain('invalid_risk_weight')
    expect(decision.reasonCodes).toContain('media_config_incomplete')
    expect(decision.reasonCodes).toContain('media_persistence_blocked')
  })

  it('blocks when localContainmentSucceeded is not a boolean', () => {
    const decision = evaluatePostCaseMediaPersistence({
      ...EXAMPLE_PERSISTING_POST_CASE_MEDIA,
      localContainmentSucceeded: 'yes' as unknown as boolean,
    })

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual([
      'invalid_local_containment_succeeded',
      'media_persistence_blocked',
    ])
  })

  it('uses raw score for threshold compare so micro-rounding cannot flip the band', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        riskThreshold: 0.0000004,
        mediaArtifacts: [artifact({ riskWeight: 0.00000035 })],
      })
    )

    // Rounded display may be 0, but raw 0.00000035 < 0.0000004 → cleared.
    expect(decision.outcome).toBe('cleared')
    expect(decision.remainsRisky).toBe(false)
  })

  it('marks remains_risky when raw score equals the risk threshold', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        riskThreshold: 3,
        mediaArtifacts: [artifact({ riskWeight: 3 })],
      })
    )

    expect(decision.outcome).toBe('remains_risky')
    expect(decision.remainsRisky).toBe(true)
    expect(decision.persistenceRiskScore).toBe(3)
    expect(decision.reasonCodes).toEqual(['hazardous_content_persists', 'media_persistence_risk'])
  })

  it('blocks when media kind is invalid', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        mediaArtifacts: [
          {
            ...artifact(),
            kind: 'not_a_kind' as PostCaseMediaArtifact['kind'],
          },
        ],
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual([
      'invalid_media_kind',
      'media_config_incomplete',
      'media_persistence_blocked',
    ])
  })

  it('marks remains_risky when adaptation and commercialization kinds persist past threshold (SPE-2606)', () => {
    const decision = evaluatePostCaseMediaPersistence(
      EXAMPLE_ADAPTATION_COMMERCIALIZATION_POST_CASE_MEDIA
    )

    expect(decision.outcome).toBe('remains_risky')
    expect(decision.remainsRisky).toBe(true)
    expect(decision.reasonCodes).toEqual([
      'adaptation_persists',
      'commercialization_persists',
      'media_persistence_risk',
    ])
    expect(decision).toEqual(
      expect.objectContaining({
        caseId: 'case:echo-merch-9',
        caseLabel: 'Site Echo merch adaptation residue',
        localContainmentSucceeded: true,
        persistentArtifactCount: 2,
        persistenceRiskScore: 3.5,
        riskThreshold: 3,
      })
    )
  })

  it('keeps adaptation and commercialization as distinct persist reason codes', () => {
    const adaptationOnly = evaluatePostCaseMediaPersistence(
      input({
        riskThreshold: 1,
        mediaArtifacts: [
          artifact({
            id: 'media:adaptation-only',
            kind: 'adaptation',
            riskWeight: 1,
          }),
        ],
      })
    )
    const commercializationOnly = evaluatePostCaseMediaPersistence(
      input({
        riskThreshold: 1,
        mediaArtifacts: [
          artifact({
            id: 'media:commercial-only',
            kind: 'commercialization',
            riskWeight: 1,
          }),
        ],
      })
    )

    expect(adaptationOnly.reasonCodes).toEqual(['adaptation_persists', 'media_persistence_risk'])
    expect(commercializationOnly.reasonCodes).toEqual([
      'commercialization_persists',
      'media_persistence_risk',
    ])
    expect(adaptationOnly.reasonCodes).not.toEqual(commercializationOnly.reasonCodes)
  })

  it('clears when adaptation/commercialization artifacts do not persist after containment', () => {
    const decision = evaluatePostCaseMediaPersistence(
      input({
        mediaArtifacts: [
          artifact({
            id: 'media:adaptation-scrubbed',
            kind: 'adaptation',
            persistsAfterContainment: false,
            riskWeight: 5,
          }),
          artifact({
            id: 'media:commercial-scrubbed',
            kind: 'commercialization',
            persistsAfterContainment: false,
            riskWeight: 5,
          }),
        ],
      })
    )

    expect(decision.outcome).toBe('cleared')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.persistentArtifactCount).toBe(0)
    expect(decision.reasonCodes).toEqual(['media_cleared'])
  })

  it('blocks when mediaArtifacts is a sparse array', () => {
    const sparse = [artifact()] as PostCaseMediaArtifact[]
    sparse.length = 3

    const decision = evaluatePostCaseMediaPersistence(
      input({
        mediaArtifacts: sparse,
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.remainsRisky).toBe(false)
    expect(decision.reasonCodes).toEqual([
      'media_config_incomplete',
      'media_persistence_blocked',
      'sparse_media_artifacts',
    ])
  })
})
