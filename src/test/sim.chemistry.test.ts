import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  calcCaseFit,
  calcChemistry,
  calcTeamChemistry,
  summarizeRelationshipModifiers,
} from '../domain/sim/chemistry'
import { deriveRelationshipState, deriveRelationshipStability } from '../domain/sim/relationshipProjection'
import type { Agent, CaseInstance, Team } from '../domain/models'

function makeAgent(id: string, overrides: Partial<Agent> = {}): Agent {
  return {
    id,
    name: `Agent ${id}`,
    role: 'hunter',
    baseStats: { combat: 0, investigation: 0, utility: 0, social: 0 },
    tags: [],
    relationships: {},
    fatigue: 0,
    status: 'active',
    ...overrides,
  }
}

function makeTeam(agentIds: string[], overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-test',
    name: 'Test Team',
    agentIds,
    tags: [],
    ...overrides,
  }
}

function makeCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  const baseCase = createStartingState().cases['case-001']

  return {
    ...baseCase,
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('calcTeamChemistry', () => {
  it('returns zero values when there are no agent pairs', () => {
    expect(calcTeamChemistry([makeAgent('agent-a')])).toEqual({
      relationships: [],
      raw: 0,
      bonus: 0,
      pairs: 0,
      average: 0,
      cohesion: 0.5,
    })
  })

  it('averages reciprocal relationships across pairs and clamps runaway bonuses', () => {
    const chemistry = calcTeamChemistry([
      makeAgent('agent-a', { relationships: { 'agent-b': 8, 'agent-c': -2 } }),
      makeAgent('agent-b', { relationships: { 'agent-a': 4, 'agent-c': 2 } }),
      makeAgent('agent-c', { relationships: { 'agent-a': 0, 'agent-b': 6 } }),
    ])

    expect(chemistry.raw).toBe(9)
    expect(chemistry.pairs).toBe(3)
    expect(chemistry.average).toBe(3)
    expect(chemistry.bonus).toBe(6)
    expect(chemistry.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentAId: 'agent-a',
          agentBId: 'agent-b',
          value: 6,
          modifiers: expect.arrayContaining(['high_trust', 'shared_history', 'mentor_protege']),
        }),
      ])
    )
  })

  it('changes chemistry when relationships change even if the build is identical', () => {
    const positivePair = calcTeamChemistry([
      makeAgent('agent-a', {
        role: 'tech',
        tags: ['tech', 'scholar'],
        relationships: { 'agent-b': 2 },
      }),
      makeAgent('agent-b', {
        role: 'investigator',
        tags: ['investigator', 'scholar'],
        relationships: { 'agent-a': 2 },
      }),
    ])
    const negativePair = calcTeamChemistry([
      makeAgent('agent-a', {
        role: 'tech',
        tags: ['tech', 'scholar'],
        relationships: { 'agent-b': -2 },
      }),
      makeAgent('agent-b', {
        role: 'investigator',
        tags: ['investigator', 'scholar'],
        relationships: { 'agent-a': -2 },
      }),
    ])

    expect(positivePair.raw).toBeGreaterThan(negativePair.raw)
    expect(positivePair.bonus).toBeGreaterThan(negativePair.bonus)
  })

  it('does not derive chemistry from build tags when relationships stay neutral', () => {
    const baseline = calcTeamChemistry([
      makeAgent('agent-a', {
        role: 'hunter',
        tags: ['hunter', 'silver'],
      }),
      makeAgent('agent-b', {
        role: 'occultist',
        tags: ['occultist', 'holy', 'exorcist'],
      }),
    ])
    const matchedBuild = calcTeamChemistry([
      makeAgent('agent-a', {
        role: 'hunter',
        tags: ['hunter', 'tech', 'investigator', 'lab-kit'],
      }),
      makeAgent('agent-b', {
        role: 'occultist',
        tags: ['occultist', 'tech', 'investigator', 'lab-kit'],
      }),
    ])

    expect(matchedBuild.raw).toBe(baseline.raw)
    expect(matchedBuild.bonus).toBe(baseline.bonus)
  })

  it('uses trained coordination and trust modifiers when deriving chemistry bonus', () => {
    const neutral = calcTeamChemistry([makeAgent('agent-a'), makeAgent('agent-b')])
    const coordinated = calcTeamChemistry([
      makeAgent('agent-a', {
        relationships: { 'agent-b': 0.5 },
        progression: {
          skillTree: { skillPoints: 0, trainedRelationships: { 'agent-b': 2 } },
        } as Agent['progression'],
      }),
      makeAgent('agent-b', {
        relationships: { 'agent-a': 0.5 },
        progression: {
          skillTree: { skillPoints: 0, trainedRelationships: { 'agent-a': 2 } },
        } as Agent['progression'],
      }),
    ])

    expect(coordinated.bonus).toBeGreaterThan(neutral.bonus)
    expect(summarizeRelationshipModifiers(coordinated.relationships)).toEqual(
      expect.arrayContaining(['shared history x1', 'trained coordination x1', 'trust x1'])
    )
  })

  it('normalizes chemistry scaling by pair quality rather than exploding only with pair count', () => {
    const threePairTeam = calcTeamChemistry([
      makeAgent('agent-a', { relationships: { 'agent-b': 1, 'agent-c': 1 } }),
      makeAgent('agent-b', { relationships: { 'agent-a': 1, 'agent-c': 1 } }),
      makeAgent('agent-c', { relationships: { 'agent-a': 1, 'agent-b': 1 } }),
    ])
    const sixPairTeam = calcTeamChemistry([
      makeAgent('agent-a', { relationships: { 'agent-b': 1, 'agent-c': 1, 'agent-d': 1 } }),
      makeAgent('agent-b', { relationships: { 'agent-a': 1, 'agent-c': 1, 'agent-d': 1 } }),
      makeAgent('agent-c', { relationships: { 'agent-a': 1, 'agent-b': 1, 'agent-d': 1 } }),
      makeAgent('agent-d', { relationships: { 'agent-a': 1, 'agent-b': 1, 'agent-c': 1 } }),
    ])

    expect(sixPairTeam.average).toBe(threePairTeam.average)
    expect(sixPairTeam.bonus - threePairTeam.bonus).toBeLessThan(2)
  })

  it('keeps relationship state/stability aligned with shared projection helper', () => {
    const chemistry = calcTeamChemistry([
      makeAgent('agent-a', { relationships: { 'agent-b': 0.4 } }),
      makeAgent('agent-b', { relationships: { 'agent-a': 0.4 } }),
    ])

    const pair = chemistry.relationships[0]
    expect(pair).toBeDefined()
    expect(pair.state).toBe(deriveRelationshipState(pair.value))
    expect(pair.stability).toBeCloseTo(
      deriveRelationshipStability(pair.value, pair.modifiers, 0),
      6
    )
  })
})

describe('calcCaseFit', () => {
  it('returns zero when the team has no assigned agents', () => {
    const chemistry = calcCaseFit(
      makeCase(),
      makeTeam([]),
      { 'agent-a': makeAgent('agent-a') },
      { stageScalar: 1.2 }
    )

    expect(chemistry).toBe(0)
  })

  it('ignores dead agents for both score contribution and preferred-tag bonuses', () => {
    const chemistry = calcCaseFit(
      makeCase({
        preferredTags: ['tech', 'occult'],
        difficulty: { combat: 0, investigation: 0, utility: 50, social: 0 },
        weights: { combat: 0, investigation: 0, utility: 1, social: 0 },
      }),
      makeTeam(['agent-live', 'agent-dead']),
      {
        'agent-live': makeAgent('agent-live', {
          baseStats: { combat: 0, investigation: 0, utility: 40, social: 0 },
          tags: ['tech'],
        }),
        'agent-dead': makeAgent('agent-dead', {
          baseStats: { combat: 0, investigation: 0, utility: 100, social: 0 },
          tags: ['occult'],
          status: 'dead',
        }),
      },
      { stageScalar: 1.2 }
    )

    expect(chemistry).toBeCloseTo(0.9, 6)
  })

  it('ignores resigned agents for both score contribution and preferred-tag bonuses', () => {
    const chemistry = calcCaseFit(
      makeCase({
        preferredTags: ['tech', 'occult'],
        difficulty: { combat: 0, investigation: 0, utility: 50, social: 0 },
        weights: { combat: 0, investigation: 0, utility: 1, social: 0 },
      }),
      makeTeam(['agent-live', 'agent-resigned']),
      {
        'agent-live': makeAgent('agent-live', {
          baseStats: { combat: 0, investigation: 0, utility: 40, social: 0 },
          tags: ['tech'],
        }),
        'agent-resigned': makeAgent('agent-resigned', {
          baseStats: { combat: 0, investigation: 0, utility: 100, social: 0 },
          tags: ['occult'],
          status: 'resigned',
        }),
      },
      { stageScalar: 1.2 }
    )

    expect(chemistry).toBeCloseTo(0.9, 6)
  })

  it('applies fatigue before stage-scaled difficulty when computing chemistry', () => {
    const chemistry = calcCaseFit(
      makeCase({
        stage: 2,
        difficulty: { combat: 50, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      }),
      makeTeam(['agent-a']),
      {
        'agent-a': makeAgent('agent-a', {
          baseStats: { combat: 75, investigation: 0, utility: 0, social: 0 },
          fatigue: 20,
        }),
      },
      { stageScalar: 1.5 }
    )

    expect(chemistry).toBeCloseTo(0.8, 6)
  })

  it('returns full chemistry when the case has no weighted difficulty', () => {
    const chemistry = calcCaseFit(
      makeCase({
        difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 0, investigation: 0, utility: 0, social: 0 },
      }),
      makeTeam(['agent-a']),
      {
        'agent-a': makeAgent('agent-a', {
          baseStats: { combat: 10, investigation: 0, utility: 0, social: 0 },
        }),
      },
      { stageScalar: 1.2 }
    )

    expect(chemistry).toBe(1)
  })

  it('keeps calcChemistry as a deprecated compatibility alias', () => {
    const currentCase = makeCase({
      difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    })
    const team = makeTeam(['agent-a'])
    const agents = {
      'agent-a': makeAgent('agent-a', {
        baseStats: { combat: 20, investigation: 0, utility: 0, social: 0 },
      }),
    }

    expect(calcChemistry(currentCase, team, agents, { stageScalar: 1.2 })).toBe(
      calcCaseFit(currentCase, team, agents, { stageScalar: 1.2 })
    )
  })
})
