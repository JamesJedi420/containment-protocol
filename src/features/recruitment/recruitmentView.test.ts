// cspell:words cand
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { type Candidate } from '../../domain/models'
import {
  getRecruitmentCandidateViews,
  getRecruitmentMetrics,
  getRecruitmentScoutingOverview,
} from './recruitmentView'

const baseEvaluation = {
  overallVisible: true,
  overallValue: 72,
  potentialVisible: true,
  potentialTier: 'mid' as const,
  rumorTags: ['steady-aim'],
  impression: 'Strong first impression.',
  teamwork: 'Collaborative.',
  outlook: 'Likely to scale with support.',
}

function buildCandidates(): Candidate[] {
  return [
    {
      id: 'cand-alpha',
      name: 'Avery Holt',
      portraitId: 'portrait-agent-1',
      age: 28,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 30,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: baseEvaluation,
      agentData: {
        role: 'combat',
        specialization: 'breach-entry',
        stats: { combat: 80, investigation: 42, utility: 48, social: 35 },
        traits: ['steady-aim'],
      },
    },
    {
      id: 'cand-bravo',
      name: 'Briar Lane',
      portraitId: 'portrait-staff-1',
      age: 36,
      category: 'staff',
      hireStatus: 'candidate',
      weeklyWage: 18,
      revealLevel: 1,
      expiryWeek: 3,
      evaluation: {
        ...baseEvaluation,
        overallVisible: false,
        overallValue: undefined,
      },
      staffData: {
        specialty: 'analysis',
        assignmentType: 'pattern-review',
        passiveBonuses: { analysisQuality: 0.05 },
      },
    },
    {
      id: 'cand-charlie',
      name: 'Case Rowan',
      portraitId: 'portrait-agent-2',
      age: 31,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 24,
      revealLevel: 2,
      expiryWeek: 4,
      evaluation: {
        ...baseEvaluation,
        overallValue: 91,
      },
      agentData: {
        role: 'support',
        specialization: 'medical-support',
        stats: { combat: 44, investigation: 53, utility: 71, social: 56 },
        traits: ['rapid-triage'],
      },
    },
  ]
}

describe('recruitment view contract', () => {
  it('filters, sorts, and preserves hidden candidate fit without fabricating data', () => {
    const game = createStartingState()
    game.week = 4
    game.candidates = buildCandidates()

    const views = getRecruitmentCandidateViews(game, {
      search: 'case',
      sort: 'overall',
    })

    expect(views.map((view) => view.candidate.id)).toEqual(['cand-charlie'])
    expect(views[0]!.overallLabel).toBe('91')

    const hiddenView = getRecruitmentCandidateViews(game, {
      search: 'briar',
      sort: 'expiry',
    })[0]

    expect(hiddenView).toMatchObject({
      candidate: expect.objectContaining({ id: 'cand-bravo' }),
      hiddenOverall: true,
      overallLabel: 'Obscured',
      potentialLabel: 'mid',
      expiringSoon: true,
      preview: expect.objectContaining({
        canHire: true,
        reasons: [],
        estimatedValue: expect.any(Number),
      }),
    })
  })

  it('reports recruitment pressure metrics from the current pipeline', () => {
    const game = createStartingState()
    game.week = 4
    game.candidates = buildCandidates()

    expect(getRecruitmentMetrics(game)).toEqual({
      total: 3,
      agents: 2,
      staff: 1,
      specialists: 0,
      expiringSoon: 2,
      replacementPressure: 0,
      staffingGap: 0,
      criticalRoleLossCount: 0,
      temporaryUnavailableCount: 0,
      recruitmentPriorityBand: 'stable',
    })
  })

  it('surfaces the eventual hire class when a recruit remaps into field recon', () => {
    const game = createStartingState()
    game.candidates = [
      {
        id: 'cand-recon-map',
        name: 'Recon Prospect',
        portraitId: 'portrait-agent-3',
        age: 29,
        category: 'agent',
        hireStatus: 'available',
        weeklyWage: 28,
        weeklyCost: 28,
        revealLevel: 2,
        expiryWeek: 5,
        evaluation: baseEvaluation,
        agentData: {
          role: 'combat',
          specialization: 'signal-intercept',
          stats: { combat: 63, investigation: 58, utility: 61, social: 32 },
          traits: ['signal-hunter'],
        },
      },
    ]

    const [view] = getRecruitmentCandidateViews(game)

    expect(view?.hireOutcomeLabel).toBe('Field Recon')
  })

  it('keeps exact ceiling intel hidden until scouting is confirmed', () => {
    const game = createStartingState()
    game.candidates = [
      {
        id: 'cand-scout-stage-one',
        name: 'Scout Stage One',
        portraitId: 'portrait-agent-4',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyWage: 24,
        revealLevel: 1,
        expiryWeek: 6,
        actualPotentialTier: 'A',
        evaluation: {
          ...baseEvaluation,
          overallVisible: false,
          overallValue: 79,
          potentialVisible: false,
        },
        scoutReport: {
          stage: 1,
          projectedTier: 'B',
          exactKnown: false,
          confidence: 'medium',
          scoutedWeek: 4,
        },
        agentData: {
          role: 'combat',
          specialization: 'recon',
          stats: { combat: 68, investigation: 57, utility: 54, social: 39 },
          visibleStats: { combat: 70, investigation: 60, utility: 50, social: 40 },
          traits: ['steady-aim'],
          growthProfile: 'balanced',
        },
      },
    ]

    const [view] = getRecruitmentCandidateViews(game)

    expect(view?.scoutDepthLabel).toBe('Initial scout')
    expect(view?.scoutConfidenceLabel).toBe('Medium confidence')
    expect(view?.capIntelLabel).toBe('Broad ceiling bands')
    expect(view?.capIntelDetails.every((detail) => detail.includes('-'))).toBe(true)
    expect(view?.knownNowSummary).toContain('Projected B tier')
    expect(view?.uncertaintySummary).toContain('Exact caps remain hidden')
    expect(view?.nextScanSummary).toContain('follow-up scout')
  })

  it('reveals exact ceiling intel once scouting is confirmed', () => {
    const game = createStartingState()
    game.candidates = [
      {
        id: 'cand-scout-confirmed',
        name: 'Scout Confirmed',
        portraitId: 'portrait-agent-5',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyWage: 24,
        revealLevel: 2,
        expiryWeek: 6,
        actualPotentialTier: 'A',
        evaluation: {
          ...baseEvaluation,
          overallVisible: true,
          overallValue: 81,
        },
        scoutReport: {
          stage: 3,
          projectedTier: 'A',
          confirmedTier: 'A',
          exactKnown: true,
          confidence: 'confirmed',
          scoutedWeek: 4,
        },
        agentData: {
          role: 'combat',
          specialization: 'recon',
          stats: { combat: 68, investigation: 57, utility: 54, social: 39 },
          visibleStats: { combat: 68, investigation: 57, utility: 54, social: 39 },
          traits: ['steady-aim'],
          growthProfile: 'balanced',
        },
      },
    ]

    const [view] = getRecruitmentCandidateViews(game)

    expect(view?.scoutDepthLabel).toBe('Confirmed intel')
    expect(view?.scoutConfidenceLabel).toBe('Confirmed intel')
    expect(view?.capIntelLabel).toBe('Confirmed ceiling intel')
    expect(view?.capIntelDetails.every((detail) => !detail.includes('-'))).toBe(true)
    expect(view?.knownNowSummary).toContain('exact ceiling values are now visible')
    expect(view?.uncertaintySummary).toContain('No critical scouting uncertainty remains')
    expect(view?.nextScanSummary).toContain('will not improve')
  })

  it('surfaces field recon as the strongest current scouting identity in the overview', () => {
    const game = createStartingState()
    game.agents = {
      recon: {
        ...game.agents.a_mina,
        id: 'recon',
        role: 'field_recon',
        status: 'active',
        fatigue: 8,
        assignment: { state: 'idle' },
        tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
        baseStats: { combat: 42, investigation: 84, utility: 80, social: 28 },
        equipmentSlots: {
          secondary: 'anomaly_scanner',
          headgear: 'advanced_recon_suite',
          utility1: 'signal_intercept_kit',
          utility2: 'occult_detection_array',
        },
      },
      investigator: {
        ...game.agents.a_ava,
        id: 'investigator',
        role: 'investigator',
        status: 'active',
        fatigue: 10,
        assignment: { state: 'idle' },
        tags: ['forensics', 'field-kit', 'surveillance'],
        baseStats: { combat: 38, investigation: 74, utility: 66, social: 34 },
      },
    }
    game.candidates = buildCandidates()

    const overview = getRecruitmentScoutingOverview(game)

    expect(overview.fieldReconCount).toBe(1)
    expect(overview.supportSummary).toMatch(/Field Recon leads current scouting support/i)
    expect(overview.revealSummary).toMatch(/initial scans|first-pass scans/i)
  })
})
