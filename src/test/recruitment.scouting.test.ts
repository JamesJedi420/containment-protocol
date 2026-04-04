import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { Candidate } from '../domain/models'
import { evaluateRecruitmentScoutSupport } from '../domain/recon'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assessCandidateScouting, scoutCandidate } from '../domain/sim/recruitmentScouting'

function makeAgentCandidate(): Extract<Candidate, { category: 'agent' }> {
  return {
    id: 'cand-scout-01',
    name: 'Scout Target',
    age: 27,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 18,
    weeklyWage: 18,
    revealLevel: 0,
    expiryWeek: 4,
    actualPotentialTier: 'A',
    evaluation: {
      overallVisible: false,
      overallValue: 76,
      potentialVisible: false,
      potentialTier: 'mid',
      rumorTags: ['steady-aim'],
      impression: 'steady',
      teamwork: 'cooperative',
      outlook: 'unknown',
    },
    agentData: {
      role: 'combat',
      specialization: 'breach-entry',
      stats: {
        combat: 72,
        investigation: 44,
        utility: 40,
        social: 36,
      },
      traits: ['steady-aim'],
      growthProfile: 'balanced',
    },
  }
}

describe('recruitment scouting', () => {
  it('creates projected intel on the first scout and keeps the candidate eligible for refinement', () => {
    const candidate = makeAgentCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }

    expect(assessCandidateScouting(state, candidate.id)).toMatchObject({
      canScout: true,
      cost: expect.any(Number),
      nextStage: 1,
    })

    const scouted = scoutCandidate({ ...state, rngState: 1234 }, candidate.id)
    expect(scouted.candidates[0]?.scoutReport).toMatchObject({
      stage: 1,
      exactKnown: false,
      projectedTier: expect.stringMatching(/F|D|C|B|A|S/),
      confidence: expect.stringMatching(/low|medium/),
    })
    expect(assessCandidateScouting(scouted, candidate.id)).toMatchObject({
      canScout: true,
      nextStage: 2,
    })
    expect(scouted.events.at(-1)).toMatchObject({
      type: 'recruitment.scouting_initiated',
      sourceSystem: 'intel',
      payload: {
        week: 1,
        candidateId: candidate.id,
        candidateName: candidate.name,
        stage: 1,
        projectedTier: scouted.candidates[0]?.scoutReport?.projectedTier,
        confidence: scouted.candidates[0]?.scoutReport?.confidence,
        fundingCost: expect.any(Number),
      },
    })
  })

  it('applies a scout report, raises reveal level, and deducts funding deterministically', () => {
    const candidate = makeAgentCandidate()
    const state = {
      ...createStartingState(),
      week: 3,
      rngSeed: 4242,
      rngState: 4242,
      funding: 100,
      candidates: [candidate],
    }

    const next = scoutCandidate(state, candidate.id)
    const scoutedCandidate = next.candidates[0]

    expect(next.funding).toBeLessThan(state.funding)
    expect(next.rngState).not.toBe(state.rngState)
    expect(scoutedCandidate?.revealLevel).toBe(1)
    expect(scoutedCandidate?.scoutReport).toMatchObject({
      stage: 1,
      projectedTier: expect.stringMatching(/F|D|C|B|A|S/),
      exactKnown: false,
      confidence: expect.stringMatching(/low|medium/),
      scoutedWeek: 3,
    })
  })

  it('improves scouting confidence on a follow-up pass', () => {
    const candidate = makeAgentCandidate()
    const state = {
      ...createStartingState(),
      week: 3,
      rngSeed: 5150,
      rngState: 5150,
      funding: 100,
      candidates: [candidate],
    }

    const firstPass = scoutCandidate(state, candidate.id)
    const secondPass = scoutCandidate(firstPass, candidate.id)
    const firstReport = firstPass.candidates[0]?.scoutReport
    const secondReport = secondPass.candidates[0]?.scoutReport
    const confidenceRank = {
      low: 1,
      medium: 2,
      high: 3,
      confirmed: 4,
    } as const

    expect(firstReport).toBeDefined()
    expect(secondReport).toMatchObject({
      stage: 2,
      exactKnown: false,
      confidence: expect.stringMatching(/medium|high/),
    })

    if (!firstReport || !secondReport) {
      throw new Error('Expected scout reports for both scouting passes.')
    }

    expect(confidenceRank[secondReport.confidence]).toBeGreaterThan(
      confidenceRank[firstReport.confidence]
    )
    expect(secondPass.events.at(-1)).toMatchObject({
      type: 'recruitment.scouting_refined',
      sourceSystem: 'intel',
      payload: {
        candidateId: candidate.id,
        stage: 2,
        previousProjectedTier: firstReport.projectedTier,
        previousConfidence: firstReport.confidence,
        projectedTier: secondReport.projectedTier,
        confidence: secondReport.confidence,
      },
    })
  })

  it('uses a deep scan to confirm the exact tier and replace earlier projected intel', () => {
    const candidate = makeAgentCandidate()
    candidate.actualPotentialTier = 'A'
    candidate.scoutReport = {
      stage: 2,
      projectedTier: 'C',
      exactKnown: false,
      confidence: 'high',
      scoutedWeek: 2,
    }
    const state = {
      ...createStartingState(),
      week: 4,
      rngState: 8008,
      funding: 100,
      candidates: [candidate],
    }

    const next = scoutCandidate(state, candidate.id)

    expect(next.candidates[0]?.scoutReport).toMatchObject({
      stage: 3,
      projectedTier: 'A',
      confirmedTier: 'A',
      exactKnown: true,
      confidence: 'confirmed',
      scoutedWeek: 4,
    })
    expect(assessCandidateScouting(next, candidate.id)).toMatchObject({
      canScout: false,
      reason: 'intel_confirmed',
    })
    expect(next.events.at(-1)).toMatchObject({
      type: 'recruitment.intel_confirmed',
      sourceSystem: 'intel',
      payload: {
        candidateId: candidate.id,
        candidateName: candidate.name,
        stage: 3,
        previousProjectedTier: 'C',
        previousConfidence: 'high',
        projectedTier: 'A',
        confirmedTier: 'A',
        confidence: 'confirmed',
        fundingCost: expect.any(Number),
      },
    })
  })

  it('uses field recon operatives to lower scout cost and deepen the reveal', () => {
    const candidate = makeAgentCandidate()
    const baselineState = {
      ...createStartingState(),
      week: 2,
      rngState: 2222,
      funding: 120,
      candidates: [candidate],
    }
    const reconState = {
      ...baselineState,
      agents: {
        ...baselineState.agents,
        'recon-a': {
          ...baselineState.agents.a_mina,
          id: 'recon-a',
          name: 'Recon A',
          role: 'field_recon' as const,
          tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
          baseStats: { combat: 42, investigation: 84, utility: 80, social: 28 },
          equipmentSlots: {
            secondary: 'anomaly_scanner',
            headgear: 'advanced_recon_suite',
            utility1: 'signal_intercept_kit',
            utility2: 'occult_detection_array',
          },
        },
        'recon-b': {
          ...baselineState.agents.a_ava,
          id: 'recon-b',
          name: 'Recon B',
          role: 'field_recon' as const,
          tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
          baseStats: { combat: 38, investigation: 78, utility: 74, social: 30 },
          equipmentSlots: {
            secondary: 'encrypted_field_tablet',
            headgear: 'spectral_em_array',
            utility1: 'signal_intercept_kit',
            utility2: 'environmental_sampler',
          },
        },
      },
    }

    const baselineAssessment = assessCandidateScouting(baselineState, candidate.id)
    const reconAssessment = assessCandidateScouting(reconState, candidate.id)
    const scouted = scoutCandidate(reconState, candidate.id)

    expect(reconAssessment.cost).toBeLessThan(baselineAssessment.cost)
    expect(scouted.candidates[0]?.revealLevel).toBe(2)
    expect(assessCandidateScouting(scouted, candidate.id)).toMatchObject({
      canScout: true,
      nextStage: 2,
    })
  })

  it('carries scouting events into the next weekly report dossier notes', () => {
    const candidate = makeAgentCandidate()
    const state = {
      ...createStartingState(),
      week: 3,
      rngState: 3333,
      funding: 120,
      candidates: [candidate],
    }

    const scouted = scoutCandidate(state, candidate.id)
    const next = advanceWeek(scouted)
    const latestReport = next.reports.at(-1)

    expect(latestReport?.week).toBe(3)
    expect(latestReport?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'recruitment.scouting_initiated',
          metadata: expect.objectContaining({
            candidateId: candidate.id,
            candidateName: candidate.name,
          }),
        }),
      ])
    )
  })

  it('weights field recon as the strongest scouting contributor even against similarly equipped roles', () => {
    const state = createStartingState()
    const baseAgent = state.agents.a_mina
    const sharedLoadout = {
      secondary: 'anomaly_scanner',
      headgear: 'advanced_recon_suite',
      utility1: 'signal_intercept_kit',
      utility2: 'occult_detection_array',
    } as const
    const sharedStats = { combat: 42, investigation: 82, utility: 78, social: 32 }

    const fieldReconSupport = evaluateRecruitmentScoutSupport({
      recon: {
        ...baseAgent,
        id: 'recon',
        role: 'field_recon',
        status: 'active',
        fatigue: 8,
        assignment: { state: 'idle' },
        tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
        baseStats: sharedStats,
        equipmentSlots: sharedLoadout,
      },
    })
    const investigatorSupport = evaluateRecruitmentScoutSupport({
      investigator: {
        ...baseAgent,
        id: 'investigator',
        role: 'investigator',
        status: 'active',
        fatigue: 8,
        assignment: { state: 'idle' },
        tags: ['forensics', 'field-kit', 'surveillance'],
        baseStats: sharedStats,
        equipmentSlots: sharedLoadout,
      },
    })
    const hunterSupport = evaluateRecruitmentScoutSupport({
      hunter: {
        ...baseAgent,
        id: 'hunter',
        role: 'hunter',
        status: 'active',
        fatigue: 8,
        assignment: { state: 'idle' },
        tags: ['combat', 'breach-kit'],
        baseStats: sharedStats,
        equipmentSlots: sharedLoadout,
      },
    })

    expect(fieldReconSupport.supportScore).toBeGreaterThan(investigatorSupport.supportScore)
    expect(investigatorSupport.supportScore).toBeGreaterThan(hunterSupport.supportScore)
  })

  it('heavily discounts deployed or recovering operatives when calculating scout support', () => {
    const state = createStartingState()
    const baseAgent = state.agents.a_ava
    const reconBase = {
      ...baseAgent,
      role: 'field_recon' as const,
      tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
      baseStats: { combat: 38, investigation: 80, utility: 76, social: 30 },
      equipmentSlots: {
        secondary: 'anomaly_scanner',
        headgear: 'advanced_recon_suite',
        utility1: 'signal_intercept_kit',
        utility2: 'environmental_sampler',
      },
    }

    const reserveSupport = evaluateRecruitmentScoutSupport({
      recon: {
        ...reconBase,
        id: 'recon-reserve',
        status: 'active',
        fatigue: 10,
        assignment: { state: 'idle' },
      },
    })
    const deployedSupport = evaluateRecruitmentScoutSupport({
      recon: {
        ...reconBase,
        id: 'recon-deployed',
        status: 'active',
        fatigue: 10,
        assignment: {
          state: 'assigned',
          caseId: 'case-001',
          teamId: 't_nightwatch',
          startedWeek: 2,
        },
      },
    })
    const recoveringSupport = evaluateRecruitmentScoutSupport({
      recon: {
        ...reconBase,
        id: 'recon-recovering',
        status: 'recovering',
        fatigue: 55,
        assignment: { state: 'recovery', startedWeek: 3 },
      },
    })

    expect(reserveSupport.supportScore).toBeGreaterThan(deployedSupport.supportScore)
    expect(deployedSupport.supportScore).toBeGreaterThan(recoveringSupport.supportScore)
  })
})
