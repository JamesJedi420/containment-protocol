import { describe, expect, it } from 'vitest'
import {
  applyCompetencyDecay,
  applyCompetencyUse,
  buildCompetencyProfileFromAgent,
  evaluateCompetencyTask,
  meetsCertificationGate,
  type CompetencyAgentSource,
} from '../domain/competencyFramework'

function makeAgent(input: {
  id: string
  role: CompetencyAgentSource['role']
  combat: number
  investigation: number
  utility: number
  social: number
  confidence?: 'unknown' | 'low' | 'medium' | 'high' | 'confirmed'
  certifications?: Record<string, { state: 'not_started' | 'in_progress' | 'eligible_review' | 'certified' | 'expired' | 'revoked' }>
  lastTrainingWeek?: number
}) {
  return {
    id: input.id,
    role: input.role,
    baseStats: {
      combat: input.combat,
      investigation: input.investigation,
      utility: input.utility,
      social: input.social,
    },
    progression: {
      xp: 0,
      level: 1,
      potentialTier: 'C',
      growthProfile: 'balanced',
      potentialIntel: {
        confidence: input.confidence ?? 'low',
      },
      certifications: input.certifications ?? {},
      lastTrainingWeek: input.lastTrainingWeek,
      trainingProfile: {
        agentId: input.id,
        currentRole: input.role,
        trainingStatus: 'idle',
        readinessImpact: 0,
      },
    },
  } as CompetencyAgentSource
}

describe('competencyFramework slice 1', () => {
  it('same-role agents can differ by competency profile and task outcomes', () => {
    const strong = makeAgent({
      id: 'agent-strong',
      role: 'investigator',
      combat: 25,
      investigation: 80,
      utility: 30,
      social: 30,
      confidence: 'high',
      lastTrainingWeek: 10,
    })

    const weak = makeAgent({
      id: 'agent-weak',
      role: 'investigator',
      combat: 25,
      investigation: 35,
      utility: 30,
      social: 30,
      confidence: 'low',
      lastTrainingWeek: 10,
    })

    const strongProfile = buildCompetencyProfileFromAgent(strong)
    const weakProfile = buildCompetencyProfileFromAgent(weak)

    expect(strongProfile.role).toBe(weakProfile.role)
    expect(strongProfile.scores.research).toBeGreaterThan(weakProfile.scores.research)

    const requirement = {
      taskId: 'forensics-pass',
      requiredDomain: 'research' as const,
      successThreshold: 60,
      partialThreshold: 40,
    }

    expect(evaluateCompetencyTask(strongProfile, requirement).outcome).toBe('success')
    expect(evaluateCompetencyTask(weakProfile, requirement).outcome).toBe('fail')
  })

  it('thresholded task result branches success / partial / fail deterministically', () => {
    const mid = makeAgent({
      id: 'agent-mid',
      role: 'investigator',
      combat: 25,
      investigation: 50,
      utility: 30,
      social: 30,
    })

    const profile = buildCompetencyProfileFromAgent(mid)
    const requirement = {
      taskId: 'archive-retrieval',
      requiredDomain: 'research' as const,
      successThreshold: 70,
      partialThreshold: 45,
    }

    const result = evaluateCompetencyTask(profile, requirement)
    expect(result.outcome).toBe('partial')

    const failResult = evaluateCompetencyTask(
      { ...profile, scores: { ...profile.scores, research: 20 } },
      requirement
    )
    expect(failResult.outcome).toBe('fail')

    const successResult = evaluateCompetencyTask(
      { ...profile, scores: { ...profile.scores, research: 85 } },
      requirement
    )
    expect(successResult.outcome).toBe('success')
  })

  it('applyCompetencyUse increases competency and stamps last used week', () => {
    const agent = makeAgent({
      id: 'agent-grow',
      role: 'tech',
      combat: 30,
      investigation: 35,
      utility: 50,
      social: 25,
      lastTrainingWeek: 2,
    })

    const profile = buildCompetencyProfileFromAgent(agent)
    const before = profile.scores.technical

    const updated = applyCompetencyUse(profile, 'technical', 6, 2)
    expect(updated.scores.technical).toBeGreaterThan(before)
    expect(updated.lastUsedWeekByDomain.technical).toBe(6)
  })

  it('applyCompetencyDecay decays neglected competencies after threshold', () => {
    const agent = makeAgent({
      id: 'agent-decay',
      role: 'medic',
      combat: 20,
      investigation: 35,
      utility: 70,
      social: 40,
      lastTrainingWeek: 1,
    })

    const profile = buildCompetencyProfileFromAgent(agent)
    const before = profile.scores.medical

    const decayed = applyCompetencyDecay(profile, 12)
    expect(decayed.scores.medical).toBeLessThan(before)
  })

  it('meetsCertificationGate blocks and allows based on certified state', () => {
    const uncertified = makeAgent({
      id: 'agent-cert-1',
      role: 'investigator',
      combat: 25,
      investigation: 60,
      utility: 40,
      social: 35,
      certifications: {
        ritual_ops: { state: 'in_progress' },
      },
    })

    const certified = makeAgent({
      id: 'agent-cert-2',
      role: 'investigator',
      combat: 25,
      investigation: 60,
      utility: 40,
      social: 35,
      certifications: {
        ritual_ops: { state: 'certified' },
      },
    })

    const blocked = meetsCertificationGate(uncertified, ['ritual_ops'])
    expect(blocked.allowed).toBe(false)
    expect(blocked.missingCertifications).toEqual(['ritual_ops'])

    const allowed = meetsCertificationGate(certified, ['ritual_ops'])
    expect(allowed.allowed).toBe(true)
    expect(allowed.missingCertifications).toEqual([])
  })

  it('repeated calls with same input return identical outputs', () => {
    const agent = makeAgent({
      id: 'agent-deterministic',
      role: 'investigator',
      combat: 22,
      investigation: 58,
      utility: 37,
      social: 41,
      confidence: 'medium',
      lastTrainingWeek: 4,
    })

    const a = buildCompetencyProfileFromAgent(agent)
    const b = buildCompetencyProfileFromAgent(agent)
    expect(a).toEqual(b)

    const req = {
      taskId: 'deterministic-check',
      requiredDomain: 'research' as const,
      successThreshold: 55,
      partialThreshold: 40,
      secondaryDomain: 'social' as const,
      secondaryWeight: 0.2,
    }

    const ea = evaluateCompetencyTask(a, req)
    const eb = evaluateCompetencyTask(b, req)
    expect(ea).toEqual(eb)

    const ua = applyCompetencyUse(a, 'research', 8, 1)
    const ub = applyCompetencyUse(b, 'research', 8, 1)
    expect(ua).toEqual(ub)

    const da = applyCompetencyDecay(ua, 15)
    const db = applyCompetencyDecay(ub, 15)
    expect(da).toEqual(db)
  })

  it('optional compact two-domain check works without full synergy system', () => {
    const agent = makeAgent({
      id: 'agent-two-domain',
      role: 'investigator',
      combat: 20,
      investigation: 50,
      utility: 20,
      social: 65,
      lastTrainingWeek: 6,
    })

    const profile = buildCompetencyProfileFromAgent(agent)
    const result = evaluateCompetencyTask(profile, {
      taskId: 'interview-analysis',
      requiredDomain: 'research',
      secondaryDomain: 'social',
      secondaryWeight: 0.3,
      successThreshold: 65,
      partialThreshold: 50,
    })

    expect(result.score).toBeGreaterThan(profile.scores.research)
    expect(['partial', 'success']).toContain(result.outcome)
  })
})
