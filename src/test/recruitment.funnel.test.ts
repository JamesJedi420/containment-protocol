// cspell:words cand pathing
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { type Candidate } from '../domain/models'
import {
  buildRecruitmentFunnelSummary,
  listCandidatesByFunnelStage,
  transitionRecruitmentCandidate,
} from '../domain/recruitment'
import { hireCandidate } from '../domain/sim/hire'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

function makeCandidate(id: string): Candidate {
  return {
    id,
    name: `Candidate ${id}`,
    age: 30,
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
    availabilityWindow: {
      opensWeek: 1,
      closesWeek: 8,
    },
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
  }
}

describe('recruitment funnel transitions', () => {
  it('advances candidate through prospect -> contacted -> screening deterministically', () => {
    const state = createStartingState()
    state.candidates = [makeCandidate('cand-funnel-1')]

    const contacted = transitionRecruitmentCandidate(state, 'cand-funnel-1', {
      toStage: 'contacted',
      week: 2,
      note: 'Initial outreach complete',
    })

    expect(contacted.transitioned).toBe(true)
    expect(contacted.state.candidates[0]).toMatchObject({
      funnelStage: 'contacted',
      lastUpdatedWeek: 2,
      hireStatus: 'available',
      transitionNotes: ['Initial outreach complete'],
    })

    const screened = transitionRecruitmentCandidate(contacted.state, 'cand-funnel-1', {
      toStage: 'screening',
      week: 3,
      note: 'Screening packet approved',
    })

    expect(screened.transitioned).toBe(true)
    expect(screened.state.candidates[0]).toMatchObject({
      funnelStage: 'screening',
      lastUpdatedWeek: 3,
      transitionNotes: ['Initial outreach complete', 'Screening packet approved'],
    })
  })

  it('rejects invalid stage transitions', () => {
    const state = createStartingState()
    state.candidates = [makeCandidate('cand-funnel-2')]

    const invalid = transitionRecruitmentCandidate(state, 'cand-funnel-2', {
      toStage: 'hired',
      week: 2,
    })

    expect(invalid.transitioned).toBe(false)
    expect(invalid.reason).toBe('invalid_transition')
    expect(invalid.state.candidates[0]?.funnelStage).toBe('prospect')
  })

  it('supports explicit lost transitions with reason metadata', () => {
    const state = createStartingState()
    state.candidates = [makeCandidate('cand-funnel-3')]

    const lost = transitionRecruitmentCandidate(state, 'cand-funnel-3', {
      toStage: 'lost',
      week: 4,
      lossReason: 'window-expired',
      note: 'Candidate timed out',
    })

    expect(lost.transitioned).toBe(true)
    expect(lost.state.candidates[0]).toMatchObject({
      funnelStage: 'lost',
      hireStatus: 'expired',
      lossReason: 'window-expired',
      lastUpdatedWeek: 4,
    })
  })

  it('builds compact funnel summaries and stage selectors for downstream systems', () => {
    const state = createStartingState()
    state.candidates = [
      makeCandidate('cand-funnel-a'),
      {
        ...makeCandidate('cand-funnel-b'),
        funnelStage: 'contacted',
      },
      {
        ...makeCandidate('cand-funnel-c'),
        funnelStage: 'screening',
      },
    ]

    const summary = buildRecruitmentFunnelSummary(state)
    const screening = listCandidatesByFunnelStage(state, 'screening')

    expect(summary.totalCandidates).toBe(3)
    expect(summary.stageCounts.prospect).toBe(1)
    expect(summary.stageCounts.contacted).toBe(1)
    expect(summary.stageCounts.screening).toBe(1)
    expect(summary.replacementNeed).toMatchObject({
      replacementPressure: 0,
      staffingGap: 0,
      criticalRoleLossCount: 0,
      temporaryUnavailableCount: 0,
      priorityBand: 'stable',
    })
    expect(screening.map((candidate) => candidate.id)).toEqual(['cand-funnel-c'])
  })

  it('keeps save/load compatibility for funnel state metadata', () => {
    const state = createStartingState()
    const funnelCandidate: Candidate = {
      ...makeCandidate('cand-funnel-save'),
      funnelStage: 'screening',
      transitionNotes: ['Reached screening'],
      createdWeek: 1,
      lastUpdatedWeek: 5,
    }

    state.candidates = [funnelCandidate]
    state.recruitmentPool = [funnelCandidate]

    const roundTripped = loadGameSave(serializeGameSave(state))

    expect(roundTripped.candidates[0]).toMatchObject({
      id: 'cand-funnel-save',
      funnelStage: 'screening',
      transitionNotes: ['Reached screening'],
      createdWeek: 1,
      lastUpdatedWeek: 5,
    })
  })

  it('preserves candidate-derived state when hiring after screening', () => {
    const state = createStartingState()
    state.candidates = [
      {
        ...makeCandidate('cand-hire-1'),
        funnelStage: 'screening',
      },
    ]

    const next = hireCandidate(state, 'cand-hire-1')

    expect(next.candidates).toHaveLength(0)
    expect(next.agents['cand-hire-1']).toMatchObject({
      id: 'cand-hire-1',
      status: 'active',
      progression: expect.objectContaining({
        potentialTier: expect.any(String),
      }),
    })
  })
})
