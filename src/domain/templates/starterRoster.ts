import { assertKnownAuthoredAbilities } from '../abilities'
import { type Team } from '../models'
import { createStarterAgent, type StarterAgentBlueprint } from './classTables'

export const starterRosterBlueprints: StarterAgentBlueprint[] = [
  // Night Watch — combat-forward, some investigation and tech
  {
    id: 'a_ava',
    name: 'Ava Brooks',
    role: 'hunter',
    fatigue: 10,
    tags: ['hunter', 'silver'],
    relationships: { a_kellan: 2, a_mina: 1 },
    baseStats: { combat: 70, investigation: 30, utility: 20, social: 20 },
  },
  {
    id: 'a_kellan',
    name: 'Father Kellan',
    role: 'occultist',
    fatigue: 5,
    tags: ['occultist', 'holy', 'exorcist'],
    relationships: { a_ava: 2, a_mina: -1 },
    baseStats: { combat: 40, investigation: 40, utility: 30, social: 40 },
  },
  {
    id: 'a_mina',
    name: 'Mina Park',
    role: 'investigator',
    fatigue: 0,
    tags: ['investigator', 'scholar'],
    relationships: { a_ava: 1, a_kellan: -1, a_rook: 2 },
    baseStats: { combat: 20, investigation: 60, utility: 20, social: 30 },
  },
  {
    id: 'a_rook',
    name: 'Rook',
    role: 'tech',
    fatigue: 0,
    tags: ['tech'],
    relationships: { a_mina: 2 },
    baseStats: { combat: 10, investigation: 30, utility: 60, social: 20 },
  },
  // Green Tape — investigation, utility, and social oriented
  {
    id: 'a_sato',
    name: 'Dr. Sato',
    role: 'occultist',
    fatigue: 5,
    tags: ['occultist', 'scholar'],
    relationships: { a_juno: 2 },
    baseStats: { combat: 10, investigation: 70, utility: 40, social: 20 },
  },
  {
    id: 'a_juno',
    name: 'Juno Reyes',
    role: 'medium',
    fatigue: 0,
    tags: ['medium', 'spirit'],
    relationships: { a_sato: 2, a_eli: -1 },
    baseStats: { combat: 10, investigation: 50, utility: 50, social: 30 },
    abilities: [
      {
        id: 'ward-hum',
        label: 'Ward Hum',
        description: 'Keeps Juno centered around anomaly pressure and improves containment posture.',
        type: 'passive',
        effect: { presence: 1, anomaly: 2 },
      },
    ],
  },
  {
    id: 'a_eli',
    name: 'Eli Grant',
    role: 'negotiator',
    fatigue: 0,
    tags: ['negotiator'],
    relationships: { a_juno: -1, a_casey: 1 },
    baseStats: { combat: 10, investigation: 30, utility: 20, social: 70 },
    abilities: [
      {
        id: 'civil-calibration',
        label: 'Civil Calibration',
        description: 'Maintains a steady diplomatic cadence that boosts Eli\'s support presence.',
        type: 'passive',
        effect: { presence: 3 },
      },
    ],
  },
  {
    id: 'a_casey',
    name: 'Casey Holt',
    role: 'medic',
    fatigue: 0,
    tags: ['medic'],
    relationships: { a_eli: 1 },
    baseStats: { combat: 30, investigation: 20, utility: 50, social: 30 },
    abilities: [
      {
        id: 'triage-rhythm',
        label: 'Triage Rhythm',
        description: 'Lets Casey stabilize teams faster during support operations and recovery.',
        type: 'passive',
        effect: { presence: 3, resilience: 2 },
      },
    ],
  },
]

assertKnownAuthoredAbilities(
  starterRosterBlueprints.map(({ id, name, abilities }) => ({
    ownerId: id,
    ownerName: name,
    abilities,
  })),
  'starter roster abilities'
)

export const starterTeamTemplates: Team[] = [
  {
    id: 't_nightwatch',
    name: 'Night Watch',
    agentIds: ['a_ava', 'a_kellan', 'a_mina', 'a_rook'],
    tags: ['van'],
  },
  {
    id: 't_greentape',
    name: 'Green Tape',
    agentIds: ['a_sato', 'a_juno', 'a_eli', 'a_casey'],
    tags: ['lab-kit'],
  },
]

export const starterRoster = Object.fromEntries(
  starterRosterBlueprints.map((blueprint) => {
    const agent = createStarterAgent(blueprint)
    return [agent.id, agent]
  })
)

export const starterTeams = Object.fromEntries(
  starterTeamTemplates.map((team) => [
    team.id,
    {
      ...team,
      agentIds: [...team.agentIds],
      tags: [...team.tags],
    },
  ])
)
