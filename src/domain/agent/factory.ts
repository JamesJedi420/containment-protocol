import {
  createDefaultAgentAssignmentState,
  createDefaultAgentHistory,
  createDefaultAgentIdentity,
  createDefaultAgentProgression,
  createDefaultAgentServiceRecord,
  createDefaultAgentVitals,
  deriveAssignmentStatus,
  deriveDomainStatsFromBase,
} from '../agentDefaults'
import type {
  Agent,
  AgentAbility,
  AgentAbilityState,
  AgentAssignmentState,
  AgentHistory,
  AgentIdentity,
  AgentProgression,
  AgentRole,
  AgentServiceRecord,
  AgentTrait,
  AgentVitals,
  DomainStats,
  EquipmentSlots,
} from './models'
import type { StatBlock } from '../models'
import { normalizeAgent } from './normalize'

export interface CreateAgentInput {
  id: string
  name: string
  role: AgentRole
  specialization?: string
  baseStats: StatBlock
  identity?: Partial<AgentIdentity>
  age?: number
  operationalRole?: Agent['operationalRole']
  stats?: Partial<DomainStats>
  vitals?: AgentVitals
  serviceRecord?: AgentServiceRecord
  progression?: AgentProgression
  equipment?: Agent['equipment']
  equipmentSlots?: EquipmentSlots
  traits?: AgentTrait[]
  abilities?: AgentAbility[]
  abilityState?: AgentAbilityState
  history?: AgentHistory
  assignment?: AgentAssignmentState
  tags?: string[]
  relationships?: Record<string, number>
  fatigue?: number
  status?: Agent['status']
  createdWeek?: number
}

function normalizeAgentStatus(status: Agent['status'] | undefined): Agent['status'] {
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

  return Math.max(0, Math.round(fatigue))
}

export function mapAgentRoleToOperationalRole(role: AgentRole): Agent['operationalRole'] {
  if (role === 'hunter') {
    return 'field'
  }

  if (role === 'occultist' || role === 'medium') {
    return 'containment'
  }

  if (role === 'investigator' || role === 'field_recon' || role === 'tech') {
    return 'investigation'
  }

  return 'support'
}

export function mergeDomainStats(
  baseStats: DomainStats,
  partial: Partial<DomainStats> | undefined
): DomainStats {
  return {
    physical: { ...baseStats.physical, ...(partial?.physical ?? {}) },
    tactical: { ...baseStats.tactical, ...(partial?.tactical ?? {}) },
    cognitive: { ...baseStats.cognitive, ...(partial?.cognitive ?? {}) },
    social: { ...baseStats.social, ...(partial?.social ?? {}) },
    stability: { ...baseStats.stability, ...(partial?.stability ?? {}) },
    technical: { ...baseStats.technical, ...(partial?.technical ?? {}) },
  }
}

export function createAgent(input: CreateAgentInput): Agent {
  const status = normalizeAgentStatus(input.status)
  const fatigue = normalizeFatigue(input.fatigue)
  const baseDomainStats = deriveDomainStatsFromBase(input.baseStats)
  const assignment = input.assignment ?? createDefaultAgentAssignmentState()
  const identity: AgentIdentity = {
    ...createDefaultAgentIdentity(input.name),
    ...input.identity,
    ...(typeof input.age === 'number' ? { age: input.age } : {}),
  }
  const progression = input.progression ?? createDefaultAgentProgression(1)
  const serviceRecord =
    input.serviceRecord ?? createDefaultAgentServiceRecord(input.createdWeek ?? 1)

  return normalizeAgent({
    id: input.id,
    name: input.name,
    role: input.role,
    specialization: input.specialization ?? input.role,
    operationalRole: input.operationalRole ?? mapAgentRoleToOperationalRole(input.role),
    age: identity.age,
    identity,
    baseStats: input.baseStats,
    stats: mergeDomainStats(baseDomainStats, input.stats),
    vitals: input.vitals ?? createDefaultAgentVitals(fatigue, status),
    serviceRecord,
    progression,
    equipment: input.equipment ?? {},
    equipmentSlots: input.equipmentSlots ?? {},
    traits: input.traits ?? [],
    abilities: input.abilities ?? [],
    ...(input.abilityState ? { abilityState: input.abilityState } : {}),
    history: input.history ?? createDefaultAgentHistory(),
    assignment,
    assignmentStatus: deriveAssignmentStatus(assignment),
    level: progression.level,
    tags: input.tags ?? [],
    relationships: input.relationships ?? {},
    fatigue,
    status,
  })
}
