import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { evaluateTeamSynergy } from '../domain/synergy'
import { buildAgentSquadCompositionProfile } from '../domain/teamSimulation'
import { computeTeamScore } from '../domain/sim/scoring'
import type { Agent } from '../domain/models'

function makeAgent(id: string, role: Agent['role'], tags: string[] = []): Agent {
  return {
    ...createStartingState().agents.a_ava,
    id,
    name: id,
    role,
    tags,
    relationships: {},
    fatigue: 0,
    status: 'active',
    traits: [],
  }
}

describe('evaluateTeamSynergy', () => {
  it('activates modular synergies from role, tag, and doctrine alignment', () => {
    const synergy = evaluateTeamSynergy(
      [
        makeAgent('hunter-a', 'hunter'),
        makeAgent('tech-a', 'tech'),
        makeAgent('investigator-a', 'investigator', ['scholar']),
      ],
      ['lab-kit']
    )

    expect(synergy.active.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['forensic_mesh', 'mobile_lab_doctrine'])
    )
    expect(synergy.resolutionBonus.investigation).toBeGreaterThan(0)
    expect(synergy.scoreBonus).toBeGreaterThan(0)
  })

  it('does not depend on relationship chemistry to activate', () => {
    const positive = evaluateTeamSynergy([
      makeAgent('hunter-a', 'hunter'),
      makeAgent('medic-a', 'medic'),
    ])
    const negative = evaluateTeamSynergy([
      makeAgent('hunter-b', 'hunter', []),
      {
        ...makeAgent('medic-b', 'medic'),
        relationships: { 'hunter-b': -2 },
      },
    ])

    expect(positive.active.map((entry) => entry.id)).toContain('triage_cover_loop')
    expect(negative.active.map((entry) => entry.id)).toContain('triage_cover_loop')
    expect(negative.scoreBonus).toBe(positive.scoreBonus)
  })
})

describe('bond depth bonus from party training', () => {
  it('amplifies active synergy scoreBonus when agents have trained together', () => {
    const baseHunter = makeAgent('hunter-a', 'hunter')
    const baseMedic = makeAgent('medic-a', 'medic')

    // No trainedRelationships — bond amplification should be absent
    const noBonds = evaluateTeamSynergy([baseHunter, baseMedic])

    // Add trainedRelationships on both sides (simulating repeated party training)
    const trainedHunter: Agent = {
      ...baseHunter,
      progression: {
        ...baseHunter.progression!,
        skillTree: {
          skillPoints: 0,
          trainedRelationships: { 'medic-a': 4 },
        },
      },
    }
    const trainedMedic: Agent = {
      ...baseMedic,
      progression: {
        ...baseMedic.progression!,
        skillTree: {
          skillPoints: 0,
          trainedRelationships: { 'hunter-a': 4 },
        },
      },
    }
    const withBonds = evaluateTeamSynergy([trainedHunter, trainedMedic])

    // triage_cover_loop should be active for both (tags, not bonds, activate synergy)
    expect(noBonds.active.map((s) => s.id)).toContain('triage_cover_loop')
    expect(withBonds.active.map((s) => s.id)).toContain('triage_cover_loop')

    // Bonds don't create synergy — they amplify it
    expect(noBonds.bondDepthBonus ?? 0).toBe(0)
    expect(withBonds.bondDepthBonus).toBeGreaterThan(0)
    expect(withBonds.bondDepthBonus).toBeGreaterThan(noBonds.bondDepthBonus ?? 0)
  })

  it('produces no bond bonus when no synergies are active even with high familiarity', () => {
    // Two agents with no synergy-triggering tag overlap but trained together
    const agent1 = makeAgent('analyst-a', 'investigator')
    const agent2 = makeAgent('analyst-b', 'investigator')

    const trainedA: Agent = {
      ...agent1,
      progression: {
        ...agent1.progression!,
        skillTree: {
          skillPoints: 0,
          trainedRelationships: { 'analyst-b': 10 },
        },
      },
    }
    const trainedB: Agent = {
      ...agent2,
      progression: {
        ...agent2.progression!,
        skillTree: {
          skillPoints: 0,
          trainedRelationships: { 'analyst-a': 10 },
        },
      },
    }

    const result = evaluateTeamSynergy([trainedA, trainedB])

    // If no synergies are active, bondDepthBonus must be absent / 0
    if (result.active.length === 0) {
      expect(result.bondDepthBonus ?? 0).toBe(0)
    }
  })
})

describe('build-based synergy in scoring', () => {
  it('raises team score from active build synergy even when chemistry is neutral', () => {
    const caseInstance = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
      difficulty: { combat: 25, investigation: 25, utility: 25, social: 25 },
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    }
    const hunter = makeAgent('hunter-a', 'hunter')
    const medic = makeAgent('medic-a', 'medic')
    const hunterSolo = computeTeamScore([hunter], caseInstance)
    const coordinated = computeTeamScore([hunter, medic], caseInstance)
    const coordinatedProfile = buildAgentSquadCompositionProfile([hunter, medic])

    expect(coordinatedProfile.synergyProfile.active.map((entry) => entry.id)).toContain(
      'triage_cover_loop'
    )
    expect(coordinated.modifierBreakdown.synergyBonus).toBeGreaterThan(0)
    expect(coordinated.reasons.some((reason) => reason.includes('Triage Cover Loop'))).toBe(true)
    expect(coordinated.score).toBeGreaterThan(hunterSolo.score)
  })
})
