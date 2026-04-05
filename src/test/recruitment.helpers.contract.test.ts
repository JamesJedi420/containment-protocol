import { describe, expect, it } from 'vitest'
import {
  getCandidatePool,
  getRecruitmentPool,
  syncCandidatePoolState,
  syncRecruitmentPoolState,
  type Candidate,
} from '../domain/recruitment'

function makeCandidate(id: string): Candidate {
  return {
    id,
    name: `Candidate ${id}`,
    portraitId: `portrait-${id}`,
    age: 30,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 20,
    weeklyWage: 20,
    revealLevel: 2,
    expiryWeek: 8,
    evaluation: {
      overallVisible: true,
      overall: 70,
      overallValue: 70,
      potentialVisible: true,
      potentialTier: 'mid',
      rumorTags: [],
      impression: 'Solid candidate.',
      teamwork: 'Works with most squads.',
      outlook: 'Steady growth.',
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
      growthProfile: 'steady',
    },
  }
}

describe('recruitment helpers contract', () => {
  it('reads canonical candidates pool even when legacy mirror differs', () => {
    const canonical = [makeCandidate('cand-canonical')]
    const legacyMirror = [makeCandidate('cand-legacy')]

    const state = {
      candidates: canonical,
      recruitmentPool: legacyMirror,
    }

    expect(getCandidatePool(state)).toEqual(canonical)
    expect(getRecruitmentPool(state)).toEqual(canonical)
  })

  it('syncs canonical candidates without mutating legacy mirror field', () => {
    const initialMirror = [makeCandidate('cand-initial-mirror')]
    const nextPool = [makeCandidate('cand-next')]

    const state = {
      candidates: [makeCandidate('cand-old')],
      recruitmentPool: initialMirror,
      marker: 'keep-me',
    }

    const next = syncCandidatePoolState(state, nextPool)

    expect(next.candidates).toEqual(nextPool)
    expect(next.recruitmentPool).toBe(initialMirror)
    expect(next.marker).toBe('keep-me')
  })

  it('keeps deprecated alias writer behavior aligned with canonical writer', () => {
    const state = {
      candidates: [makeCandidate('cand-old')],
      recruitmentPool: [makeCandidate('cand-mirror')],
    }
    const nextPool = [makeCandidate('cand-new')]

    expect(syncRecruitmentPoolState(state, nextPool)).toEqual(
      syncCandidatePoolState(state, nextPool)
    )
  })
})
