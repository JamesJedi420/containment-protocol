import { describe, expect, it } from 'vitest'
import {
  createPreActivationReadinessSnapshot,
  evaluatePreActivationSafetyReadiness,
  PRE_ACTIVATION_SAFETY_READINESS_OWNER,
  readinessBundleForKind,
  type PreActivationReadinessSnapshot,
} from '../domain/preActivationSafetyReadiness'

function readyFirstStartup(
  overrides: Partial<PreActivationReadinessSnapshot> = {},
): PreActivationReadinessSnapshot {
  return createPreActivationReadinessSnapshot({
    systemId: 'sys-cryo-a',
    activationKind: 'first_startup',
    constructionComplete: true,
    proceduresAvailable: true,
    reviewFindingsClosed: true,
    changeRequirementsSatisfied: true,
    trainingComplete: true,
    ...overrides,
  })
}

describe('SPE-876 pre-activation safety readiness', () => {
  it('exports owner and blocks hazardous activation until readiness is met', () => {
    expect(PRE_ACTIVATION_SAFETY_READINESS_OWNER).toBe('SPE-876')

    const blocked = evaluatePreActivationSafetyReadiness(
      readyFirstStartup({ constructionComplete: false }),
    )
    expect(blocked.authority).toBe('blocked')
    expect(blocked.activationAllowed).toBe(false)
    expect(blocked.blockingConditions).toContain('construction')

    const authorized = evaluatePreActivationSafetyReadiness(readyFirstStartup())
    expect(authorized.authority).toBe('authorized')
    expect(authorized.activationAllowed).toBe(true)
    expect(authorized.blockingConditions).toEqual([])
  })

  it('uses a different readiness bundle for restart-after-shutdown vs first startup', () => {
    expect(readinessBundleForKind('first_startup')).toEqual([
      'construction',
      'procedures',
      'review_findings',
      'change_requirements',
      'training',
    ])
    expect(readinessBundleForKind('restart_after_shutdown')).toEqual([
      'procedures',
      'review_findings',
      'training',
    ])
    expect(readinessBundleForKind('restart_after_major_change')).toEqual(
      readinessBundleForKind('first_startup'),
    )

    const restartWithoutConstruction = evaluatePreActivationSafetyReadiness(
      createPreActivationReadinessSnapshot({
        systemId: 'sys-cryo-a',
        activationKind: 'restart_after_shutdown',
        constructionComplete: false,
        proceduresAvailable: true,
        reviewFindingsClosed: true,
        changeRequirementsSatisfied: false,
        trainingComplete: true,
      }),
    )
    expect(restartWithoutConstruction.activationAllowed).toBe(true)
    expect(restartWithoutConstruction.requiredBundle).not.toContain('construction')

    const firstStartupSameFlags = evaluatePreActivationSafetyReadiness(
      readyFirstStartup({
        constructionComplete: false,
        changeRequirementsSatisfied: false,
      }),
    )
    expect(firstStartupSameFlags.activationAllowed).toBe(false)
    expect(firstStartupSameFlags.blockingConditions).toEqual([
      'change_requirements',
      'construction',
    ])
  })

  it('blocks go-live when unresolved review findings or training gaps remain', () => {
    const openReview = evaluatePreActivationSafetyReadiness(
      readyFirstStartup({ reviewFindingsClosed: false }),
    )
    expect(openReview.activationAllowed).toBe(false)
    expect(openReview.blockingConditions).toContain('review_findings')

    const trainingGap = evaluatePreActivationSafetyReadiness(
      readyFirstStartup({ trainingComplete: false }),
    )
    expect(trainingGap.activationAllowed).toBe(false)
    expect(trainingGap.blockingConditions).toContain('training')

    const majorChangeOpenReview = evaluatePreActivationSafetyReadiness(
      createPreActivationReadinessSnapshot({
        systemId: 'sys-cryo-a',
        activationKind: 'restart_after_major_change',
        constructionComplete: true,
        proceduresAvailable: true,
        reviewFindingsClosed: false,
        changeRequirementsSatisfied: true,
        trainingComplete: true,
      }),
    )
    expect(majorChangeOpenReview.activationAllowed).toBe(false)
    expect(majorChangeOpenReview.blockingConditions).toEqual(['review_findings'])
  })

  it('fail-closes empty system ids and invalid activation kinds', () => {
    expect(() =>
      createPreActivationReadinessSnapshot({
        ...readyFirstStartup(),
        systemId: '  ',
      }),
    ).toThrow(/systemId is required/)

    expect(() =>
      createPreActivationReadinessSnapshot({
        ...readyFirstStartup(),
        activationKind: 'soft_start' as PreActivationReadinessSnapshot['activationKind'],
      }),
    ).toThrow(/activationKind is invalid/)
  })
})
