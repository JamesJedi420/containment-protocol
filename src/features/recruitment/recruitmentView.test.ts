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

  it.each(['overall', 'expiry', 'wage', 'name'] as const)(
    'keeps visible order and search results identical when hidden values change under %s sort',
    (sort) => {
      const game = createStartingState()
      const [template] = buildCandidates()
      if (template?.category !== 'agent') throw new Error('Expected an agent candidate fixture')

      const makeCandidate = (id: string, hiddenFit: number): Candidate => ({
        ...template,
        id,
        name: 'Éloïse Holt',
        revealLevel: 0,
        sourceContactName: `Unlisted contact ${hiddenFit}`,
        evaluation: {
          ...template.evaluation,
          overallVisible: false,
          overallValue: hiddenFit,
          potentialVisible: false,
          potentialTier: hiddenFit > 50 ? 'high' : 'low',
        },
        agentData: {
          ...template.agentData,
          traits: [`unlisted-trait-${hiddenFit}`],
          stats: { combat: hiddenFit, investigation: 42, utility: 48, social: 35 },
        },
      })

      const readVisibleResults = () =>
        getRecruitmentCandidateViews(game, { search: ' ÉLOÏSE ', category: 'agent', sort }).map(
          ({ candidate, roleLabel, overallLabel, potentialLabel, sourceLabel }) => ({
            id: candidate.id,
            roleLabel,
            overallLabel,
            potentialLabel,
            sourceLabel,
          })
        )

      game.candidates = [makeCandidate('cand-b', 99), makeCandidate('cand-a', 10)]
      const initial = readVisibleResults()
      expect(initial.map(({ id }) => id)).toEqual(['cand-a', 'cand-b'])
      expect(initial.map(({ overallLabel }) => overallLabel)).toEqual(['Obscured', 'Obscured'])

      game.candidates = [makeCandidate('cand-b', 10), makeCandidate('cand-a', 99)]
      expect(readVisibleResults()).toEqual(initial)
      game.candidates.reverse()
      expect(readVisibleResults()).toEqual(initial)
      expect(getRecruitmentCandidateViews(game, { search: 'Unlisted contact', sort })).toEqual([])
      expect(getRecruitmentCandidateViews(game, { search: 'unlisted-trait', sort })).toEqual([])
    }
  )

  it('uses visible numeric values and places stale or missing values after known values', () => {
    const game = createStartingState()
    game.week = 4
    const [first, second, third] = buildCandidates()
    game.candidates = [
      {
        ...first!,
        expiryWeek: Number.NaN,
        weeklyWage: undefined,
        evaluation: { ...baseEvaluation, overallValue: Number.NaN },
      },
      { ...second!, expiryWeek: 6, evaluation: { ...second!.evaluation, overallValue: 100 } },
      { ...third!, expiryWeek: 6 },
    ]
    const readOrder = (sort: 'expiry' | 'overall' | 'wage') =>
      getRecruitmentCandidateViews(game, { sort }).map(({ candidate }) => candidate.id)

    expect(readOrder('expiry')).toEqual(['cand-charlie', 'cand-bravo', 'cand-alpha'])
    expect(readOrder('overall')).toEqual(['cand-charlie', 'cand-bravo', 'cand-alpha'])
    expect(readOrder('wage')).toEqual(['cand-bravo', 'cand-charlie', 'cand-alpha'])
    expect(getRecruitmentCandidateViews(game, { expiringSoonOnly: true })).toEqual([])
    expect(getRecruitmentCandidateViews(game, { search: 'avery' })[0]?.overallLabel).toBe(
      'Obscured'
    )

    game.candidates = [
      { ...first!, weeklyWage: 25 },
      { ...second!, name: 'Aaron Lane', weeklyWage: 25 },
    ]
    expect(readOrder('wage')).toEqual(['cand-bravo', 'cand-alpha'])
  })

  it('searches displayed specialty and category values instead of legacy storage values', () => {
    const game = createStartingState()
    const [, staff] = buildCandidates()
    if (staff?.category !== 'staff') throw new Error('Expected a staff candidate fixture')
    game.candidates = [
      { ...staff, staffData: { ...staff.staffData, specialty: 'intelligence' } },
      {
        ...staff,
        id: 'cand-specialist',
        category: 'fieldTech',
        staffData: undefined,
      },
    ]
    const readIds = (search: string, category?: string) =>
      getRecruitmentCandidateViews(game, { search, category }).map(({ candidate }) => candidate.id)

    expect(readIds('staff / intel', 'staff')).toEqual(['cand-bravo'])
    expect(readIds('specialist', 'specialist')).toEqual(['cand-specialist'])
    expect(readIds('intelligence')).toEqual([])
    expect(readIds('fieldTech')).toEqual([])
    expect(readIds('specialist', 'staff')).toEqual([])
  })

  it('evaluates a representative board with stable results within one second', () => {
    const game = createStartingState()
    const [, staff] = buildCandidates()
    if (staff?.category !== 'staff') throw new Error('Expected a staff candidate fixture')
    const indices = Array.from({ length: 250 }, (_, index) => String(index).padStart(3, '0'))
    game.candidates = [...indices].reverse().map((index) => ({
      ...staff,
      id: `candidate-${index}`,
      name: `Candidate ${index}`,
    }))

    const started = performance.now()
    const ids = getRecruitmentCandidateViews(game, { category: 'staff', sort: 'name' }).map(
      ({ candidate }) => candidate.id
    )
    expect(performance.now() - started).toBeLessThan(1000)
    expect(ids).toEqual(indices.map((index) => `candidate-${index}`))
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

  it('surfaces stable onboarding readiness labels from candidate state', () => {
    const game = createStartingState()
    game.week = 4
    game.candidates = [
      {
        ...buildCandidates()[0]!,
        funnelStage: 'screening',
        roleInclination: 'field',
        scoutReport: {
          stage: 2,
          projectedTier: 'B',
          exactKnown: false,
          confidence: 'high',
          scoutedWeek: 4,
        },
      },
    ]

    const [view] = getRecruitmentCandidateViews(game)

    expect(view?.onboardingStageLabel).toBe('Stage: Screening')
    expect(view?.onboardingAccessLabel).toBe('Full access pending')
    expect(view?.onboardingCheckpointLabels).toEqual([
      'Identity: Complete',
      'Background: Complete',
      'Role Fit: Complete',
      'Training: Required',
      'Oath Contract: Blocked',
    ])
  })

  it('keeps onboarding readiness byte-stable and leaves empty pools unchanged', () => {
    const game = createStartingState()
    game.week = 4
    game.candidates = buildCandidates()

    const first = JSON.stringify(getRecruitmentCandidateViews(game))
    const second = JSON.stringify(getRecruitmentCandidateViews(game))

    expect(first).toBe(second)

    game.candidates = []

    expect(getRecruitmentCandidateViews(game)).toEqual([])
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
