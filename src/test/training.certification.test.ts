import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  advanceTrainingCertificationState,
  advanceTrainingQueues,
  buildTrainingCertificationSummary,
  getCertificationDefinitions,
  getTrainingProgramsByCategory,
  queueTraining,
  reviewCertification,
  transitionCertification,
} from '../domain/sim/training-compat'

describe('training certification system', () => {
  it('provides deterministic compact selectors for category programs and certification definitions', () => {
    const firstCategory = getTrainingProgramsByCategory('core_role_drills')
    const secondCategory = getTrainingProgramsByCategory('core_role_drills')
    const firstDefinitions = getCertificationDefinitions()
    const secondDefinitions = getCertificationDefinitions()

    expect(secondCategory).toEqual(firstCategory)
    expect(firstCategory.length).toBeGreaterThan(0)
    expect(secondDefinitions).toEqual(firstDefinitions)
    expect(firstDefinitions.length).toBeGreaterThan(0)
  })

  it('moves certification from not_started to in_progress only through explicit training assignment', () => {
    const state = createStartingState()
    const before = buildTrainingCertificationSummary(state.agents.a_ava, state.week)
    const queued = queueTraining(state, 'a_ava', 'combat-drills')
    const after = buildTrainingCertificationSummary(queued.agents.a_ava, queued.week)

    const beforeCombatCert = before.certifications.find(
      (certification) => certification.certificationId === 'combat-operator-cert'
    )
    const afterCombatCert = after.certifications.find(
      (certification) => certification.certificationId === 'combat-operator-cert'
    )

    expect(beforeCombatCert?.state).toBe('not_started')
    expect(afterCombatCert?.state).toBe('in_progress')
  })

  it('advances certification milestones deterministically to eligible_review then certified via explicit review', () => {
    const state = {
      ...createStartingState(),
      academyTier: 1,
      funding: 999,
    }

    let next = queueTraining(state, 'a_ava', 'combat-drills')
    next = {
      ...next,
      trainingQueue: next.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }
    next = advanceTrainingQueues(next).state

    next = queueTraining(next, 'a_ava', 'threat-assessment')
    next = {
      ...next,
      trainingQueue: next.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }
    next = advanceTrainingQueues(next).state
    next = advanceTrainingCertificationState(next)

    const summary = buildTrainingCertificationSummary(next.agents.a_ava, next.week)
    const combatCert = summary.certifications.find(
      (certification) => certification.certificationId === 'combat-operator-cert'
    )

    expect(combatCert?.state).toBe('eligible_review')

    const transitioned = transitionCertification(next, 'a_ava', 'combat-operator-cert', 'certified')
    expect(transitioned.result.valid).toBe(true)

    const certifiedSummary = buildTrainingCertificationSummary(
      transitioned.state.agents.a_ava,
      transitioned.state.week
    )
    expect(
      certifiedSummary.certifications.find(
        (certification) => certification.certificationId === 'combat-operator-cert'
      )?.state
    ).toBe('certified')
  })

  it('rejects invalid certification transitions with explicit reasons', () => {
    const state = createStartingState()

    const invalid = transitionCertification(state, 'a_ava', 'combat-operator-cert', 'certified')

    expect(invalid.result.valid).toBe(false)
    expect(invalid.result.blockingIssues).toContain('invalid-transition')
  })

  it('tracks failed review attempts deterministically when review is denied', () => {
    const state = createStartingState()

    const denied = reviewCertification(state, 'a_ava', 'combat-operator-cert', false)

    expect('approved' in denied).toBe(true)
    if (!('approved' in denied)) {
      throw new Error('Expected denied review result shape.')
    }

    expect(denied.approved).toBe(false)
    expect(denied.reason).toBe('review-denied')
    expect(
      denied.state.agents.a_ava.progression?.failedAttemptsByTrainingId?.['cert:combat-operator-cert']
    ).toBe(1)
  })

  it('preserves training/certification state through save-load', () => {
    const state = {
      ...createStartingState(),
      academyTier: 1,
      funding: 999,
    }

    let next = queueTraining(state, 'a_ava', 'combat-drills')
    next = {
      ...next,
      trainingQueue: next.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }
    next = advanceTrainingQueues(next).state

    const roundTripped = loadGameSave(serializeGameSave(next))
    const summary = buildTrainingCertificationSummary(roundTripped.agents.a_ava, roundTripped.week)

    expect(summary.trainingPoints).toBeGreaterThan(0)
    expect(summary.certifications.some((certification) => certification.progress > 0)).toBe(true)
    expect(roundTripped.agents.a_ava.progression?.trainingHistory?.length).toBeGreaterThan(0)
  })
})
