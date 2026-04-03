import type {
  Agent,
  AgentActiveProtocol,
  GameState,
  ProtocolGlobalModifiers,
  ProtocolScope,
  ProtocolTier,
  ProtocolType,
} from './models'
import {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
  hasAnyRuntimeContextTag,
  type RuntimeModifierContext,
} from './modifierRuntime'

export interface AgencyProtocolState {
  containmentRating: number
  clearanceLevel: number
  funding: number
  selectionLimit: number
  activeProtocolIds: string[]
  unlockedProtocols: Array<{
    id: string
    label: string
    type: ProtocolType
    tier: ProtocolTier
    scope: ProtocolScope
    unlockReason: string
    globalModifiers: ProtocolGlobalModifiers
    selected: boolean
  }>
}

interface ProtocolDefinition {
  id: string
  label: string
  type: ProtocolType
  tier: ProtocolTier
  scope: ProtocolScope
  unlockReason: (state: AgencyProtocolState) => string
  unlockedWhen: (state: AgencyProtocolState) => boolean
  activeWhen: (context: RuntimeModifierContext, state: AgencyProtocolState) => boolean
  globalModifiers: ReturnType<typeof createRuntimeModifierResult>
}

export interface ProtocolTypeDefinition {
  id: ProtocolType
  label: string
  description: string
  focus: string
}

export interface ProtocolCatalogEntry {
  id: string
  label: string
  type: ProtocolType
  tier: ProtocolTier
  scope: ProtocolScope
}

export const PROTOCOL_TYPE_DEFINITIONS: readonly ProtocolTypeDefinition[] = [
  {
    id: 'survival-focused',
    label: 'Survival-Focused',
    description:
      'Agency doctrine centered on casualty reduction, exposure discipline, and keeping operatives functional under hostile conditions.',
    focus: 'Stress resistance, wounds, and survival in high-pressure paranormal operations.',
  },
  {
    id: 'anomaly-interaction',
    label: 'Anomaly Interaction',
    description:
      'Protocols for direct contact, ritual response, sealing procedures, and safe containment behavior around supernatural entities.',
    focus: 'Containment control, anomaly handling, and ritual execution.',
  },
  {
    id: 'investigation-efficiency',
    label: 'Investigation Efficiency',
    description:
      'Agency knowledge that improves evidence flow, signal exploitation, witness handling, and analytical tempo.',
    focus: 'Investigation throughput, signal processing, and evidence conversion.',
  },
  {
    id: 'operational-endurance',
    label: 'Operational Endurance',
    description:
      'Doctrines for sustaining performance across raids, major incidents, and long-running assignments without collapse in tempo.',
    focus: 'Extended operations, readiness retention, and multi-stage incident pressure.',
  },
] as const

function hasLongOperationContext(context: RuntimeModifierContext) {
  return (context.caseData?.durationWeeks ?? 0) >= 3 || (context.caseData?.stage ?? 0) >= 3
}

const PROTOCOL_DEFINITIONS: readonly ProtocolDefinition[] = [
  {
    id: 'field-clearance-protocol',
    label: 'Field Clearance Protocol',
    type: 'investigation-efficiency',
    tier: 'operations',
    scope: {
      kind: 'tag',
      tags: ['analyst', 'analysis', 'tech'],
    },
    unlockReason: (state) => `Clearance level ${state.clearanceLevel} authorizes enhanced field procedures.`,
    unlockedWhen: (state) => state.clearanceLevel >= 2,
    activeWhen: (context) =>
      hasAnyRuntimeContextTag(context, ['evidence', 'analysis', 'signal', 'witness', 'relay', 'cyber']),
    globalModifiers: createRuntimeModifierResult({
      effectivenessMultiplier: 1.03,
    }),
  },
  {
    id: 'containment-doctrine-alpha',
    label: 'Containment Doctrine Alpha',
    type: 'anomaly-interaction',
    tier: 'containment',
    scope: {
      kind: 'all_agents',
    },
    unlockReason: (state) =>
      `Containment rating ${state.containmentRating} unlocked advanced anomaly-control doctrine.`,
    unlockedWhen: (state) => state.containmentRating >= 80,
    activeWhen: (context) =>
      hasAnyRuntimeContextTag(context, ['occult', 'containment', 'ritual', 'anomaly', 'spirit', 'seal']),
    globalModifiers: createRuntimeModifierResult({
      effectivenessMultiplier: 1.03,
      stressImpactMultiplier: 0.95,
    }),
  },
  {
    id: 'crisis-command-uplink',
    label: 'Crisis Command Uplink',
    type: 'operational-endurance',
    tier: 'directorate',
    scope: {
      kind: 'role',
      roles: ['hunter', 'tech', 'medic'],
    },
    unlockReason: (state) =>
      `Directorate uplink is available at clearance ${state.clearanceLevel} with $${state.funding} in reserve.`,
    unlockedWhen: (state) => state.clearanceLevel >= 3 && state.funding >= 150,
    activeWhen: (context) =>
      (context.caseData?.kind === 'raid' || (context.caseData?.stage ?? 0) >= 4) &&
      hasAnyRuntimeContextTag(context, ['raid', 'breach', 'outbreak', 'threat', 'containment']),
    globalModifiers: createRuntimeModifierResult({
      effectivenessMultiplier: 1.04,
    }),
  },
  {
    id: 'anomaly-resistance-training',
    label: 'Anomaly Resistance Training',
    type: 'survival-focused',
    tier: 'operations',
    scope: {
      kind: 'all_agents',
    },
    unlockReason: (state) =>
      `Containment rating ${state.containmentRating} supports standardized anomaly-exposure conditioning for field operatives.`,
    unlockedWhen: (state) => state.containmentRating >= 76 && state.clearanceLevel >= 2,
    activeWhen: (context) =>
      hasAnyRuntimeContextTag(context, [
        'occult',
        'anomaly',
        'containment',
        'spirit',
        'ritual',
        'seal',
        'hazmat',
      ]) || hasLongOperationContext(context),
    globalModifiers: createRuntimeModifierResult({
      effectivenessMultiplier: 1.02,
      stressImpactMultiplier: 0.9,
    }),
  },
] as const

export function listProtocolCatalog(): ProtocolCatalogEntry[] {
  return PROTOCOL_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    type: definition.type,
    tier: definition.tier,
    scope: definition.scope,
  }))
}

function getAgencyState(
  game: Pick<GameState, 'agency' | 'containmentRating' | 'clearanceLevel' | 'funding'>
) {
  return game.agency ?? {
    containmentRating: game.containmentRating,
    clearanceLevel: game.clearanceLevel,
    funding: game.funding,
  }
}

function createProtocolGlobalModifiers(
  value: ReturnType<typeof createRuntimeModifierResult>
): ProtocolGlobalModifiers {
  return {
    statModifiers: {},
    effectivenessMultiplier: value.effectivenessMultiplier,
    stressImpactMultiplier: value.stressImpactMultiplier,
    moraleRecoveryDelta: value.moraleRecoveryDelta,
  }
}

function getProtocolSelectionLimit(agency: GameState['agency'], clearanceLevel: number) {
  const explicitLimit = agency?.protocolSelectionLimit

  if (typeof explicitLimit === 'number' && Number.isFinite(explicitLimit)) {
    return Math.max(1, Math.trunc(explicitLimit))
  }

  return Math.max(1, Math.min(3, Math.trunc(clearanceLevel)))
}

function getDefaultActiveProtocolIds(
  unlockedProtocolIds: readonly string[],
  selectionLimit: number
) {
  return unlockedProtocolIds.slice(0, selectionLimit)
}

function getSelectedActiveProtocolIds(
  agency: GameState['agency'],
  unlockedProtocolIds: readonly string[],
  selectionLimit: number
) {
  const explicitSelection = Array.isArray(agency?.activeProtocolIds)

  if (!explicitSelection) {
    return getDefaultActiveProtocolIds(unlockedProtocolIds, selectionLimit)
  }

  const unlockedSet = new Set(unlockedProtocolIds)
  const selected = [...new Set(agency!.activeProtocolIds!.filter((id) => unlockedSet.has(id)))]

  return selected.slice(0, selectionLimit)
}

function matchesProtocolScope(agent: Agent, scope: ProtocolScope) {
  if (scope.kind === 'all_agents') {
    return true
  }

  if (scope.kind === 'role') {
    return scope.roles.includes(agent.role)
  }

  return scope.tags.some((tag) => agent.tags.includes(tag))
}

export function buildAgencyProtocolState(
  game: Pick<GameState, 'agency' | 'containmentRating' | 'clearanceLevel' | 'funding'>
): AgencyProtocolState {
  const agency = getAgencyState(game)
  const selectionLimit = getProtocolSelectionLimit(game.agency, agency.clearanceLevel)
  const state: AgencyProtocolState = {
    containmentRating: agency.containmentRating,
    clearanceLevel: agency.clearanceLevel,
    funding: agency.funding,
    selectionLimit,
    activeProtocolIds: [],
    unlockedProtocols: [],
  }

  const unlockedProtocols = PROTOCOL_DEFINITIONS.flatMap((definition) =>
    definition.unlockedWhen(state)
      ? [
          {
            id: definition.id,
            label: definition.label,
            type: definition.type,
            tier: definition.tier,
            scope: definition.scope,
            unlockReason: definition.unlockReason(state),
            globalModifiers: createProtocolGlobalModifiers(definition.globalModifiers),
            selected: false,
          },
        ]
      : []
  )
  const activeProtocolIds = getSelectedActiveProtocolIds(
    game.agency,
    unlockedProtocols.map((protocol) => protocol.id),
    selectionLimit
  )

  state.activeProtocolIds = activeProtocolIds
  state.unlockedProtocols = unlockedProtocols.map((protocol) => ({
    ...protocol,
    selected: activeProtocolIds.includes(protocol.id),
  }))

  return state
}

function findDefinition(protocolId: string) {
  return PROTOCOL_DEFINITIONS.find((definition) => definition.id === protocolId)
}

export function resolveAgentProtocolEffects(
  agent: Agent,
  context: RuntimeModifierContext,
  protocolState?: AgencyProtocolState
): AgentActiveProtocol[] {
  if (!protocolState || protocolState.unlockedProtocols.length === 0) {
    return []
  }

  return protocolState.unlockedProtocols.flatMap((protocol) => {
    const definition = findDefinition(protocol.id)

    if (
      !definition ||
      !protocol.selected ||
      !matchesProtocolScope(agent, definition.scope) ||
      !definition.activeWhen(context, protocolState)
    ) {
      return []
    }

    return [
      {
        id: definition.id,
        label: definition.label,
        type: definition.type,
        tier: definition.tier,
        scope: definition.scope,
        unlockReason: protocol.unlockReason,
        globalModifiers: createProtocolGlobalModifiers(definition.globalModifiers),
        statModifiers: {},
        effectivenessMultiplier: definition.globalModifiers.effectivenessMultiplier,
        stressImpactMultiplier: definition.globalModifiers.stressImpactMultiplier,
        moraleRecoveryDelta: definition.globalModifiers.moraleRecoveryDelta,
      } satisfies AgentActiveProtocol,
    ]
  })
}

export function aggregateProtocolEffects(protocols: readonly AgentActiveProtocol[]) {
  return aggregateRuntimeModifierResults(
    protocols.map((protocol) =>
      createRuntimeModifierResult({
        statModifiers: protocol.statModifiers,
        effectivenessMultiplier: protocol.effectivenessMultiplier,
        stressImpactMultiplier: protocol.stressImpactMultiplier,
        moraleRecoveryDelta: protocol.moraleRecoveryDelta,
      })
    )
  )
}
