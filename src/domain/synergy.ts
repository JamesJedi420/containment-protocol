import {
  type ActiveSynergy,
  type Agent,
  type Synergy,
  type Team,
  type TeamResolutionProfile,
  type TeamSynergyProfile,
} from './models'
import { clamp } from './math'

const EMPTY_RESOLUTION_PROFILE: TeamResolutionProfile = {
  fieldPower: 0,
  containment: 0,
  investigation: 0,
  support: 0,
}

/** Rate at which average pairwise trainedRelationship familiarity amplifies active synergies. */
const SYNERGY_BOND_BONUS_RATE = 0.15
/** Maximum bond depth bonus contributed to synergy scoreBonus. */
const MAX_SYNERGY_BOND_BONUS = 1.5

export const TEAM_SYNERGIES: readonly Synergy[] = [
  {
    id: 'containment_triad',
    label: 'Containment Triad',
    requiredTags: ['hunter', 'occultist', 'tech'],
    threshold: 3,
    effect: {
      resolutionBonus: { fieldPower: 2, containment: 3 },
      scoreBonus: 1,
      cohesionBonus: 4,
    },
  },
  {
    id: 'forensic_mesh',
    label: 'Forensic Mesh',
    requiredTags: ['investigator', 'tech', 'scholar'],
    threshold: 2,
    effect: {
      resolutionBonus: { investigation: 3, support: 1 },
      scoreBonus: 1,
      cohesionBonus: 3,
    },
  },
  {
    id: 'occult_anchor',
    label: 'Occult Anchor',
    requiredTags: ['occultist', 'medium', 'spirit'],
    threshold: 2,
    effect: {
      resolutionBonus: { containment: 3, investigation: 1 },
      scoreBonus: 1.5,
      cohesionBonus: 4,
    },
  },
  {
    id: 'triage_cover_loop',
    label: 'Triage Cover Loop',
    requiredTags: ['hunter', 'medic', 'van'],
    threshold: 2,
    effect: {
      resolutionBonus: { fieldPower: 1, support: 3 },
      scoreBonus: 1,
      cohesionBonus: 3,
    },
  },
  {
    id: 'liaison_screen',
    label: 'Liaison Screen',
    requiredTags: ['negotiator', 'investigator', 'medium'],
    threshold: 2,
    effect: {
      resolutionBonus: { investigation: 2, support: 3 },
      scoreBonus: 1,
      cohesionBonus: 3,
    },
  },
  {
    id: 'mobile_lab_doctrine',
    label: 'Mobile Lab Doctrine',
    requiredTags: ['tech', 'investigator', 'lab-kit'],
    threshold: 2,
    effect: {
      resolutionBonus: { containment: 1, investigation: 2, support: 2 },
      scoreBonus: 1,
      cohesionBonus: 2,
    },
  },
] as const

export function createDefaultTeamSynergyProfile(): TeamSynergyProfile {
  return {
    active: [],
    resolutionBonus: { ...EMPTY_RESOLUTION_PROFILE },
    scoreBonus: 0,
    cohesionBonus: 0,
  }
}

export function evaluateTeamSynergy(
  agents: Agent[],
  teamTags: string[] = [],
  synergies: readonly Synergy[] = TEAM_SYNERGIES
): TeamSynergyProfile {
  if (agents.length === 0) {
    return createDefaultTeamSynergyProfile()
  }

  const availableTags = collectSynergyTagSet(agents, teamTags)
  const active = synergies.reduce<ActiveSynergy[]>((matches, synergy) => {
    const matchedTags = synergy.requiredTags.filter((tag) => availableTags.has(normalizeTag(tag)))

    if (matchedTags.length < synergy.threshold) {
      return matches
    }

    matches.push({
      ...synergy,
      matchedTags,
    })
    return matches
  }, [])

  const profile = active.reduce<TeamSynergyProfile>(
    (acc, synergy) => {
      const effect = synergy.effect
      const resolutionBonus = effect.resolutionBonus ?? {}

      acc.active.push(synergy)
      acc.resolutionBonus.fieldPower += resolutionBonus.fieldPower ?? 0
      acc.resolutionBonus.containment += resolutionBonus.containment ?? 0
      acc.resolutionBonus.investigation += resolutionBonus.investigation ?? 0
      acc.resolutionBonus.support += resolutionBonus.support ?? 0
      acc.scoreBonus += effect.scoreBonus ?? 0
      acc.cohesionBonus += effect.cohesionBonus ?? 0

      return acc
    },
    createDefaultTeamSynergyProfile()
  )

  // Bond depth bonus: party training amplifies active synergies.
  // Tags activate the synergy; trained bonds scale it.
  // No active synergies → no bond amplification (bonds alone don't create synergy).
  if (active.length > 0 && agents.length > 1) {
    const pairs = (agents.length * (agents.length - 1)) / 2
    let totalFamiliarity = 0

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const forward = agents[i].progression?.skillTree?.trainedRelationships?.[agents[j].id] ?? 0
        const reverse = agents[j].progression?.skillTree?.trainedRelationships?.[agents[i].id] ?? 0
        totalFamiliarity += (forward + reverse) / 2
      }
    }

    const avgFamiliarity = totalFamiliarity / pairs
    profile.bondDepthBonus = clamp(
      avgFamiliarity * SYNERGY_BOND_BONUS_RATE * active.length,
      0,
      MAX_SYNERGY_BOND_BONUS
    )
  }

  return profile
}

export function collectSynergyTagSet(
  agents: Agent[],
  teamTags: string[] = [],
  team?: Pick<Team, 'tags'>
) {
  const tags = new Set<string>()

  for (const agent of agents) {
    tags.add(normalizeTag(agent.role))

    for (const tag of agent.tags ?? []) {
      tags.add(normalizeTag(tag))
    }

    for (const trait of agent.traits ?? []) {
      tags.add(normalizeTag(trait.id))
    }
  }

  for (const tag of [...teamTags, ...(team?.tags ?? [])]) {
    tags.add(normalizeTag(tag))
  }

  return tags
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase()
}
