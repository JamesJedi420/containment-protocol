import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { Agent, CaseInstance } from '../domain/models'
import { computeTeamScore } from '../domain/sim/scoring'

const makeAgent = (tags: string[] = []): Agent => ({
  ...createStartingState().agents.a_ava,
  id: 'agent-containment-niche',
  name: 'Agent A',
  role: 'investigator',
  tags,
  baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
  stats: {
    physical: { strength: 1, endurance: 1 },
    tactical: { awareness: 1, reaction: 1 },
    cognitive: { analysis: 1, investigation: 1 },
    social: { negotiation: 1, influence: 1 },
    stability: { resistance: 1, tolerance: 1 },
    technical: { equipment: 1, anomaly: 1 },
  },
  fatigue: 0,
  relationships: {},
  status: 'active',
  assignment: { state: 'idle' },
})

const makeCase = (): CaseInstance => ({
  ...createStartingState().cases['case-001'],
  id: 'case-containment-niche',
  templateId: 'case-containment-niche-template',
  title: 'Containment Niche',
  description: 'Fixture case for containment specialist scoring.',
  kind: 'standard',
  mode: 'threshold',
  tags: [],
  requiredTags: [],
  preferredTags: [],
  difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
  weights: { combat: 0, investigation: 0, utility: 0, social: 0 },
  stage: 1,
  durationWeeks: 1,
  deadlineWeeks: 4,
  deadlineRemaining: 4,
  assignedTeamIds: [],
})

describe('Containment specialist niche effects', () => {
  it('gives +2 bonus for containment-specialist', () => {
    const result = computeTeamScore([makeAgent(['containment-specialist'])], makeCase(), {})

    expect(result.reasons.join(' ')).toMatch(/containment specialist.*\+2/i)
  })

  it('gives -1 penalty for recon-specialist', () => {
    const result = computeTeamScore([makeAgent(['recon-specialist'])], makeCase(), {})

    expect(result.reasons.join(' ')).toMatch(/recon specialist.*-1/i)
  })

  it('gives -2 penalty for recovery-support', () => {
    const result = computeTeamScore([makeAgent(['recovery-support'])], makeCase(), {})

    expect(result.reasons.join(' ')).toMatch(/support specialist.*-2/i)
  })

  it('notes missing specialist', () => {
    const result = computeTeamScore([makeAgent([])], makeCase(), {})

    expect(result.reasons.join(' ')).toMatch(/no containment specialist anchored/i)
  })

  it('applies hybrid penalty for recon+containment', () => {
    const result = computeTeamScore(
      [makeAgent(['containment-specialist', 'recon-specialist'])],
      makeCase(),
      {}
    )

    expect(result.reasons.join(' ')).toMatch(/hybrid.*\+1/i)
  })
})
