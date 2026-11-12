// cspell:words cand
import { describe, expect, it } from 'vitest'
import {
  AFFILIATION_ONBOARDING_CHECKPOINTS,
  evaluateAffiliationOnboardingReadiness,
  evaluateAffiliationOnboardingReadinessSet,
} from '../domain/affiliationOnboardingReadiness'
import type { Candidate } from '../domain/recruitment'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'cand-onboarding',
    name: 'Candidate Onboarding',
    age: 31,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 20,
    weeklyWage: 20,
    revealLevel: 2,
    expiryWeek: 8,
    origin: 'open-call',
    roleInclination: 'field',
    skills: ['recon-sweep', 'pathing'],
    liabilities: ['deadline-pressure'],
    funnelStage: 'prospect',
    createdWeek: 1,
    lastUpdatedWeek: 1,
    evaluation: {
      overallVisible: true,
      overall: 70,
      overallValue: 70,
      potentialVisible: true,
      potentialTier: 'mid',
      rumorTags: [],
    },
    agentData: {
      role: 'field',
      specialization: 'recon',
      stats: {
        combat: 60,
        investigation: 55,
        utility: 50,
        social: 40,
      },
      traits: ['steady-aim'],
    },
    ...overrides,
  } as Candidate
}

function checkpointOutcomes(candidate: Candidate) {
  return evaluateAffiliationOnboardingReadiness(candidate).checkpointDecisions.map(
    (decision) => `${decision.checkpointLabel}: ${decision.outcomeLabel}`
  )
}

describe('affiliationOnboardingReadiness', () => {
  it('keeps checkpoint ordering stable', () => {
    const decision = evaluateAffiliationOnboardingReadiness(makeCandidate())

    expect(AFFILIATION_ONBOARDING_CHECKPOINTS).toEqual([
      'identity',
      'background',
      'role_fit',
      'training',
      'oath_contract',
    ])
    expect(decision.checkpointDecisions.map((checkpoint) => checkpoint.checkpointLabel)).toEqual([
      'Identity',
      'Background',
      'Role Fit',
      'Training',
      'Oath Contract',
    ])
  })

  it('blocks or requires all prospect checkpoints without granting access', () => {
    const decision = evaluateAffiliationOnboardingReadiness(makeCandidate())

    expect(decision.stage).toBe('prospect')
    expect(decision.fullAccessEligible).toBe(false)
    expect(checkpointOutcomes(makeCandidate())).toEqual([
      'Identity: Required',
      'Background: Blocked',
      'Role Fit: Blocked',
      'Training: Blocked',
      'Oath Contract: Blocked',
    ])
  })

  it('requires background and role fit after contact', () => {
    const decision = evaluateAffiliationOnboardingReadiness(
      makeCandidate({ funnelStage: 'contacted' })
    )

    expect(decision.stage).toBe('contacted')
    expect(decision.checkpointDecisions.map((entry) => entry.outcome)).toEqual([
      'complete',
      'required',
      'required',
      'blocked',
      'blocked',
    ])
  })

  it('uses reveal and scout evidence to complete screening checks deterministically', () => {
    const sparseScreening = evaluateAffiliationOnboardingReadiness(
      makeCandidate({
        funnelStage: 'screening',
        revealLevel: 0,
        scoutReport: {
          stage: 1,
          projectedTier: 'C',
          exactKnown: false,
          confidence: 'low',
        },
      })
    )
    const supportedScreening = evaluateAffiliationOnboardingReadiness(
      makeCandidate({
        funnelStage: 'screening',
        revealLevel: 1,
        scoutReport: {
          stage: 2,
          projectedTier: 'B',
          exactKnown: false,
          confidence: 'high',
        },
      })
    )

    expect(sparseScreening.checkpointDecisions.map((entry) => entry.outcome)).toEqual([
      'complete',
      'required',
      'required',
      'required',
      'blocked',
    ])
    expect(supportedScreening.checkpointDecisions.map((entry) => entry.outcome)).toEqual([
      'complete',
      'complete',
      'complete',
      'required',
      'blocked',
    ])
  })

  it('treats hired candidates as provisional until training and oath evidence are present', () => {
    const provisional = evaluateAffiliationOnboardingReadiness(
      makeCandidate({ funnelStage: 'hired' })
    )
    const trainingReady = evaluateAffiliationOnboardingReadiness(
      makeCandidate({ id: 'cand-cleared', funnelStage: 'hired' }),
      {
        trainingCompletedCandidateIds: ['cand-cleared'],
      }
    )
    const cleared = evaluateAffiliationOnboardingReadiness(
      makeCandidate({ id: 'cand-cleared', funnelStage: 'hired' }),
      {
        trainingCompletedCandidateIds: ['cand-cleared'],
        oathContractCandidateIds: ['cand-cleared'],
      }
    )

    expect(provisional.stage).toBe('provisional')
    expect(provisional.fullAccessEligible).toBe(false)
    expect(provisional.checkpointDecisions.map((entry) => entry.outcome)).toEqual([
      'complete',
      'complete',
      'complete',
      'required',
      'blocked',
    ])
    expect(trainingReady.checkpointDecisions.map((entry) => entry.outcome)).toEqual([
      'complete',
      'complete',
      'complete',
      'complete',
      'required',
    ])
    expect(cleared.stage).toBe('cleared')
    expect(cleared.fullAccessEligible).toBe(true)
    expect(cleared.checkpointDecisions.every((entry) => entry.outcome === 'complete')).toBe(true)
  })

  it('blocks lost and expired candidates', () => {
    const lost = evaluateAffiliationOnboardingReadiness(makeCandidate({ funnelStage: 'lost' }))
    const expired = evaluateAffiliationOnboardingReadiness(
      makeCandidate({ funnelStage: 'screening', hireStatus: 'expired' })
    )

    expect(lost.stage).toBe('lost')
    expect(expired.stage).toBe('lost')
    expect(lost.checkpointDecisions.every((entry) => entry.outcome === 'blocked')).toBe(true)
    expect(expired.checkpointDecisions.every((entry) => entry.outcome === 'blocked')).toBe(true)
  })

  it('falls back deterministically for sparse invalid candidate values without throwing', () => {
    const invalid = {
      id: '',
      name: '',
      funnelStage: 'mystery',
      hireStatus: 'unknown',
    } as unknown as Candidate

    expect(() => evaluateAffiliationOnboardingReadiness(invalid)).not.toThrow()

    const decision = evaluateAffiliationOnboardingReadiness(invalid)

    expect(decision).toMatchObject({
      candidateId: 'candidate:unknown',
      candidateName: 'candidate:unknown',
      stage: 'prospect',
      fullAccessEligible: false,
    })
    expect(decision.reasonCodes).toEqual(
      expect.arrayContaining([
        'invalid_or_missing_funnel_stage',
        'invalid_or_missing_hire_status',
        'missing_candidate_id',
        'missing_candidate_name',
      ])
    )
  })

  it('sorts candidate sets and remains byte-stable across repeated evaluation', () => {
    const candidates = [
      makeCandidate({ id: 'cand-z', name: 'Candidate Zed', funnelStage: 'screening' }),
      makeCandidate({ id: 'cand-a', name: 'Candidate Aster', funnelStage: 'contacted' }),
    ]

    const first = evaluateAffiliationOnboardingReadinessSet(candidates)
    const second = evaluateAffiliationOnboardingReadinessSet(candidates)

    expect(first.map((decision) => decision.candidateId)).toEqual(['cand-a', 'cand-z'])
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
