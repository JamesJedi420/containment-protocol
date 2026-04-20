// cspell:words pathfinding
import { createDefaultAgentProgression } from '../agentDefaults'
import {
  type Agent,
  type AgentAbility,
  type AgentRole,
  type PotentialTier,
  type StatBlock,
} from '../models'
import { createAgent } from '../agent/factory'

export interface AgentClassTableEntry {
  role: AgentRole
  label: string
  baseStats: StatBlock
  tags: string[]
}

export interface StarterAgentBlueprint {
  id: string
  name: string
  role: AgentRole
  age?: number
  background?: string
  fatigue?: number
  status?: Agent['status']
  tags?: string[]
  relationships?: Record<string, number>
  baseStats?: StatBlock
  potentialTier?: PotentialTier
  growthProfile?: string
  abilities?: AgentAbility[]
}

function normalizeAgentStatus(status: StarterAgentBlueprint['status']) {
  if (
    status === 'active' ||
    status === 'injured' ||
    status === 'recovering' ||
    status === 'resigned' ||
    status === 'dead'
  ) {
    return status
  }

  return 'active'
}

function normalizeFatigue(fatigue: number | undefined) {
  if (typeof fatigue !== 'number' || !Number.isFinite(fatigue)) {
    return 0
  }

  return Math.max(0, Math.trunc(fatigue))
}

export const agentClassTables: Record<AgentRole, AgentClassTableEntry> = {
  hunter: {
    role: 'hunter',
    label: 'Containment Hunter',
    baseStats: { combat: 65, investigation: 35, utility: 45, social: 25 },
    tags: ['combat', 'breach-kit'],
  },
  occultist: {
    role: 'occultist',
    label: 'Occult Specialist',
    baseStats: { combat: 20, investigation: 70, utility: 45, social: 55 },
    tags: ['occult', 'ritual-kit'],
  },
  investigator: {
    role: 'investigator',
    label: 'Case Investigator',
    baseStats: { combat: 35, investigation: 65, utility: 50, social: 40 },
    tags: ['forensics', 'field-kit'],
  },
  field_recon: {
    role: 'field_recon',
    label: 'Field Recon',
    baseStats: { combat: 35, investigation: 72, utility: 68, social: 30 },
    tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
  },
  medium: {
    role: 'medium',
    label: 'Sensitive Operative',
    baseStats: { combat: 15, investigation: 60, utility: 35, social: 70 },
    tags: ['medium', 'sensitivity'],
  },
  tech: {
    role: 'tech',
    label: 'Systems Technician',
    baseStats: { combat: 20, investigation: 75, utility: 70, social: 35 },
    tags: ['tech', 'analyst'],
  },
  medic: {
    role: 'medic',
    label: 'Trauma Medic',
    baseStats: { combat: 25, investigation: 45, utility: 70, social: 60 },
    tags: ['medic', 'triage'],
  },
  negotiator: {
    role: 'negotiator',
    label: 'Liaison Officer',
    baseStats: { combat: 10, investigation: 40, utility: 35, social: 80 },
    tags: ['negotiation', 'liaison'],
  },
}

export function createStarterAgent(blueprint: StarterAgentBlueprint): Agent {
  const classTemplate = agentClassTables[blueprint.role]
  const blueprintStats: Partial<StatBlock> = blueprint.baseStats ?? {}
  const normalizedStatus = normalizeAgentStatus(blueprint.status)
  const baseStats: StatBlock = {
    combat: blueprintStats.combat ?? classTemplate.baseStats.combat,
    investigation: blueprintStats.investigation ?? classTemplate.baseStats.investigation,
    utility: blueprintStats.utility ?? classTemplate.baseStats.utility,
    social: blueprintStats.social ?? classTemplate.baseStats.social,
  }
  const fatigue = normalizeFatigue(blueprint.fatigue)

  return createAgent({
    id: blueprint.id,
    name: blueprint.name,
    role: blueprint.role,
    identity: {
      ...(typeof blueprint.background === 'string' ? { background: blueprint.background } : {}),
    },
    age: blueprint.age,
    baseStats,
    tags: [...new Set([...(classTemplate.tags ?? []), ...(blueprint.tags ?? [])])],
    relationships: { ...(blueprint.relationships ?? {}) },
    progression: createDefaultAgentProgression(
      1,
      blueprint.potentialTier ?? 'C',
      blueprint.growthProfile ?? 'balanced'
    ),
    abilities: [...(blueprint.abilities ?? [])],
    fatigue,
    status: normalizedStatus,
  })
}
