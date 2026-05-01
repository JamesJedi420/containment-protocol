import {
  EQUIPMENT_SLOT_KINDS,
  getEquipmentDefinition,
  getEquipmentLabel,
  getEquipmentSlotItemId,
} from '../../domain/equipment'
import type { Agent, CaseInstance, GameState, Id, Team } from '../../domain/models'
import {
  evaluateResponderForDeployment,
  type ResponderContextTag,
} from '../../domain/responderDutyEvaluation'
import { getTeamMemberIds } from '../../domain/teamSimulation'
import {
  selectSupportIncidentReferenceView,
  type SupportIncidentActionView,
} from './supportIncidentReferenceView'

export type IncidentCommandPackageMode = 'field-compact'
export type IncidentCommandSlotStatus = 'covered' | 'missing'
export type IncidentCommandKitItemStatus = 'equipped' | 'reserve-only' | 'missing'
export type IncidentCommandResponderRoute = 'deploy' | 'hold' | 'blocked'

export interface IncidentCommandRoleSlotView {
  id: string
  label: string
  status: IncidentCommandSlotStatus
  acceptedRoleLabels: string[]
  matchedTags: string[]
  coveredAgents: Array<{ agentId: Id; agentName: string; roleLabel: string }>
  cause?: string
}

export interface IncidentCommandKitItemView {
  itemId: string
  itemLabel: string
  status: IncidentCommandKitItemStatus
  holderNames: string[]
  reserveStock: number
  cause?: string
}

export interface IncidentCommandKitTemplateView {
  id: string
  label: string
  threatClass: string
  matchedTags: string[]
  items: IncidentCommandKitItemView[]
  missingItemCount: number
}

export interface IncidentCommandResponderReadinessView {
  agentId: Id
  agentName: string
  roleLabel: string
  route: IncidentCommandResponderRoute
  score: number
  gearReadiness: 'ready' | 'partial' | 'blocked'
  conditionScore: number
  specializationFit: 'fit' | 'mismatch'
  panicRisk: number
  primaryReason: string
}

export interface IncidentCommandPackageReadinessView {
  encounterId: string
  encounterTitle: string
  mode: IncidentCommandPackageMode
  scopeLabel: string
  summary: string
  teamNames: string[]
  inspectedAgentCount: number
  hiddenResponderCount: number
  roleSlots: IncidentCommandRoleSlotView[]
  kitTemplate: IncidentCommandKitTemplateView
  responderReadiness: IncidentCommandResponderReadinessView[]
  supportBlockers: SupportIncidentActionView[]
  warnings: string[]
}

export interface IncidentCommandPackageReadinessOptions {
  teamIds?: Id[]
  scopeLabel?: string
  maxRoleSlots?: number
  maxResponders?: number
  maxWarnings?: number
  maxSupportBlockers?: number
}

interface CommandRoleSlotDefinition {
  id: string
  label: string
  acceptedRoles: readonly Agent['role'][]
  tagHints: readonly string[]
  always?: boolean
}

interface CommandKitTemplateDefinition {
  id: string
  label: string
  threatClass: string
  tagHints: readonly string[]
  requiredItemIds: readonly string[]
}

const DEFAULT_MAX_ROLE_SLOTS = 4
const DEFAULT_MAX_RESPONDERS = 4
const DEFAULT_MAX_WARNINGS = 4
const DEFAULT_MAX_SUPPORT_BLOCKERS = 3

const COMMAND_ROLE_SLOTS: readonly CommandRoleSlotDefinition[] = [
  {
    id: 'incident-lead',
    label: 'Incident lead',
    acceptedRoles: ['investigator', 'negotiator', 'hunter'],
    tagHints: [],
    always: true,
  },
  {
    id: 'medical-support',
    label: 'Medical support',
    acceptedRoles: ['medic'],
    tagHints: ['medical', 'triage', 'biological', 'hazmat', 'plague', 'toxin', 'injury'],
  },
  {
    id: 'containment-specialist',
    label: 'Containment specialist',
    acceptedRoles: ['occultist', 'medium', 'tech'],
    tagHints: ['containment', 'occult', 'ritual', 'anomaly', 'seal', 'haunt', 'spirit'],
  },
  {
    id: 'signal-control',
    label: 'Signal / comms control',
    acceptedRoles: ['tech', 'field_recon', 'investigator'],
    tagHints: ['signal', 'relay', 'intel', 'surveillance', 'blackout', 'comms', 'communication'],
  },
  {
    id: 'field-security',
    label: 'Field security',
    acceptedRoles: ['hunter', 'field_recon'],
    tagHints: ['combat', 'raid', 'breach', 'threat', 'vampire', 'cryptid', 'beast', 'feral'],
  },
  {
    id: 'evidence-handler',
    label: 'Evidence handler',
    acceptedRoles: ['investigator', 'field_recon', 'tech'],
    tagHints: ['evidence', 'witness', 'analysis', 'investigation', 'recon'],
  },
  {
    id: 'civilian-interface',
    label: 'Civilian interface',
    acceptedRoles: ['negotiator', 'medic', 'investigator'],
    tagHints: ['social', 'interview', 'witness', 'civilian', 'negotiation', 'escort'],
  },
]

const COMMAND_KIT_TEMPLATES: readonly CommandKitTemplateDefinition[] = [
  {
    id: 'medical-response',
    label: 'Medical response kit',
    threatClass: 'medical',
    tagHints: ['medical', 'triage', 'biological', 'hazmat', 'plague', 'toxin', 'injury'],
    requiredItemIds: ['medkits', 'hazmat_suit', 'trauma_kit'],
  },
  {
    id: 'occult-containment',
    label: 'Occult containment kit',
    threatClass: 'containment',
    tagHints: ['containment', 'occult', 'ritual', 'anomaly', 'seal', 'haunt', 'spirit'],
    requiredItemIds: ['ward_seals', 'ritual_components', 'warding_kits'],
  },
  {
    id: 'signal-control',
    label: 'Signal control kit',
    threatClass: 'signal',
    tagHints: ['signal', 'relay', 'intel', 'surveillance', 'blackout', 'comms', 'communication'],
    requiredItemIds: ['signal_jammers', 'emf_sensors', 'tactical_radio'],
  },
  {
    id: 'breach-response',
    label: 'Breach response kit',
    threatClass: 'breach',
    tagHints: ['combat', 'raid', 'breach', 'threat', 'vampire', 'cryptid', 'beast', 'feral'],
    requiredItemIds: ['silver_rounds', 'field_plate', 'combat_stims'],
  },
  {
    id: 'evidence-control',
    label: 'Evidence control kit',
    threatClass: 'evidence',
    tagHints: ['evidence', 'witness', 'analysis', 'investigation', 'recon'],
    requiredItemIds: ['emf_sensors', 'analysis_goggles', 'encrypted_field_tablet'],
  },
  {
    id: 'civilian-contact',
    label: 'Civilian contact kit',
    threatClass: 'civilian',
    tagHints: ['social', 'interview', 'witness', 'civilian', 'negotiation', 'escort'],
    requiredItemIds: ['diplomatic_kit', 'tactical_radio', 'medkits'],
  },
  {
    id: 'field-standard',
    label: 'Field standard kit',
    threatClass: 'field',
    tagHints: [],
    requiredItemIds: ['tactical_radio', 'medkits', 'emf_sensors'],
  },
]

function uniqueStable(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function getCasePressureTags(caseData: CaseInstance | undefined) {
  if (!caseData) {
    return []
  }

  const tags = [
    ...caseData.tags,
    ...caseData.requiredTags,
    ...caseData.preferredTags,
    ...(caseData.kind === 'raid' ? ['raid'] : []),
  ].map((tag) => tag.toLowerCase())

  return uniqueStable(tags).sort((left, right) => left.localeCompare(right))
}

function getMatchedTags(tagHints: readonly string[], caseTags: readonly string[]) {
  const tagSet = new Set(caseTags)
  return tagHints.filter((tag) => tagSet.has(tag)).sort((left, right) => left.localeCompare(right))
}

function getTeamIds(
  state: GameState,
  encounterId: string,
  options: IncidentCommandPackageReadinessOptions
) {
  if (options.teamIds && options.teamIds.length > 0) {
    return uniqueStable(options.teamIds)
  }

  return uniqueStable(state.cases[encounterId]?.assignedTeamIds ?? [])
}

function getTeams(state: GameState, teamIds: readonly Id[]) {
  return teamIds.map((teamId) => state.teams[teamId]).filter((team): team is Team => Boolean(team))
}

function getAgentsForTeams(state: GameState, teams: readonly Team[]) {
  const agentIds = uniqueStable(teams.flatMap((team) => getTeamMemberIds(team)))
  return agentIds
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
}

function buildRoleSlotView(
  definition: CommandRoleSlotDefinition,
  agents: readonly Agent[],
  caseTags: readonly string[]
): IncidentCommandRoleSlotView | null {
  const matchedTags = getMatchedTags(definition.tagHints, caseTags)
  if (!definition.always && matchedTags.length === 0) {
    return null
  }

  const coveredAgents = agents
    .filter((agent) => definition.acceptedRoles.includes(agent.role))
    .map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      roleLabel: formatLabel(agent.role),
    }))
    .sort((left, right) => left.agentName.localeCompare(right.agentName))
  const status: IncidentCommandSlotStatus = coveredAgents.length > 0 ? 'covered' : 'missing'
  const acceptedRoleLabels = definition.acceptedRoles.map(formatLabel)

  return {
    id: definition.id,
    label: definition.label,
    status,
    acceptedRoleLabels,
    matchedTags,
    coveredAgents,
    ...(status === 'missing'
      ? {
          cause:
            matchedTags.length > 0
              ? `Case pressure ${matchedTags.join(', ')} needs ${acceptedRoleLabels.join(' / ')} coverage.`
              : `Package has no ${acceptedRoleLabels.join(' / ')} coverage.`,
        }
      : {}),
  }
}

function buildRoleSlots(
  agents: readonly Agent[],
  caseTags: readonly string[],
  maxRoleSlots: number
) {
  return COMMAND_ROLE_SLOTS.map((definition) => buildRoleSlotView(definition, agents, caseTags))
    .filter((slot): slot is IncidentCommandRoleSlotView => Boolean(slot))
    .sort(
      (left, right) =>
        Number(right.id === 'incident-lead') - Number(left.id === 'incident-lead') ||
        Number(right.status === 'missing') - Number(left.status === 'missing') ||
        right.matchedTags.length - left.matchedTags.length ||
        left.label.localeCompare(right.label)
    )
    .slice(0, maxRoleSlots)
}

function selectKitTemplate(caseTags: readonly string[]) {
  return COMMAND_KIT_TEMPLATES.map((template, index) => ({
    template,
    index,
    matchedTags: getMatchedTags(template.tagHints, caseTags),
  }))
    .sort(
      (left, right) =>
        right.matchedTags.length - left.matchedTags.length ||
        left.index - right.index ||
        left.template.label.localeCompare(right.template.label)
    )
    .at(0)!
}

function getEquippedKitHolders(agents: readonly Agent[], itemId: string) {
  return agents
    .filter((agent) =>
      EQUIPMENT_SLOT_KINDS.some(
        (slot) => getEquipmentSlotItemId(agent.equipmentSlots, slot) === itemId
      )
    )
    .map((agent) => agent.name)
    .sort((left, right) => left.localeCompare(right))
}

function buildKitTemplateView(
  state: GameState,
  agents: readonly Agent[],
  caseTags: readonly string[]
): IncidentCommandKitTemplateView {
  const selected = selectKitTemplate(caseTags)
  const items = selected.template.requiredItemIds.map((itemId) => {
    const definition = getEquipmentDefinition(itemId)
    const itemLabel = definition?.name ?? getEquipmentLabel(itemId)
    const holderNames = getEquippedKitHolders(agents, itemId)
    const reserveStock = Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
    const status: IncidentCommandKitItemStatus =
      holderNames.length > 0 ? 'equipped' : reserveStock > 0 ? 'reserve-only' : 'missing'

    return {
      itemId,
      itemLabel,
      status,
      holderNames,
      reserveStock,
      ...(status === 'reserve-only'
        ? { cause: `${itemLabel} is in reserve but not assigned to this package.` }
        : status === 'missing'
          ? { cause: `${itemLabel} is not equipped by this package and has no reserve stock.` }
          : {}),
    } satisfies IncidentCommandKitItemView
  })

  return {
    id: selected.template.id,
    label: selected.template.label,
    threatClass: selected.template.threatClass,
    matchedTags: selected.matchedTags,
    items,
    missingItemCount: items.filter((item) => item.status !== 'equipped').length,
  }
}

function getResponderContextTags(caseTags: readonly string[]): ResponderContextTag[] {
  const tags = new Set(caseTags)
  const contexts = new Set<ResponderContextTag>()

  if (['occult', 'ritual', 'spirit', 'haunt', 'seal'].some((tag) => tags.has(tag))) {
    contexts.add('ritual')
  }

  if (['containment', 'breach', 'anomaly', 'raid', 'threat'].some((tag) => tags.has(tag))) {
    contexts.add('containment_breach')
  }

  if (['combat', 'vampire', 'cryptid', 'beast', 'feral'].some((tag) => tags.has(tag))) {
    contexts.add('close_combat')
  }

  if (['escort', 'civilian', 'social', 'negotiation'].some((tag) => tags.has(tag))) {
    contexts.add('escort')
  }

  if (['signal', 'blackout', 'relay', 'comms', 'communication'].some((tag) => tags.has(tag))) {
    contexts.add('blackout')
  }

  if (
    ['witness', 'evidence', 'surveillance', 'analysis', 'investigation'].some((tag) =>
      tags.has(tag)
    )
  ) {
    contexts.add('indirect_visual_threat')
  }

  if (contexts.size === 0) {
    contexts.add('containment_breach')
  }

  return [...contexts].sort((left, right) => left.localeCompare(right))
}

function isThreatVisible(caseData: CaseInstance | undefined, caseTags: readonly string[]) {
  if (!caseData) {
    return false
  }

  return (
    caseData.stage >= 3 ||
    ['threat', 'breach', 'anomaly', 'haunt', 'spirit', 'combat', 'raid'].some((tag) =>
      caseTags.includes(tag)
    )
  )
}

function isThreatReachable(caseTags: readonly string[]) {
  return !['signal', 'blackout', 'relay', 'surveillance', 'haunt', 'spirit'].some((tag) =>
    caseTags.includes(tag)
  )
}

function getPrimaryReadinessReason(reasons: readonly string[]) {
  return reasons.find((reason) => reason.startsWith('blocked:')) ?? reasons[0] ?? 'ready'
}

function stripTrailingPeriod(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value
}

function buildResponderReadiness(
  state: GameState,
  caseData: CaseInstance | undefined,
  agents: readonly Agent[],
  caseTags: readonly string[],
  maxResponders: number
) {
  const contextTags = getResponderContextTags(caseTags)
  const visibleThreat = isThreatVisible(caseData, caseTags)
  const threatReachable = isThreatReachable(caseTags)
  const responders = agents.map((agent) => {
    const evaluation = evaluateResponderForDeployment({
      agent,
      missionRequiredTags: caseData?.requiredTags ?? [],
      contextTags,
      visibleThreat,
      threatReachable,
      state,
    })

    return {
      agentId: agent.id,
      agentName: agent.name,
      roleLabel: formatLabel(agent.role),
      route: evaluation.route,
      score: evaluation.effectiveOutputScore,
      gearReadiness: evaluation.readiness.gearReadiness,
      conditionScore: evaluation.readiness.conditionScore,
      specializationFit: evaluation.specialization.fit,
      panicRisk: evaluation.perceivedDanger.panicRisk,
      primaryReason: getPrimaryReadinessReason(evaluation.reasons),
    } satisfies IncidentCommandResponderReadinessView
  })

  const sorted = responders.sort(
    (left, right) =>
      routePriority(left.route) - routePriority(right.route) ||
      left.score - right.score ||
      left.agentName.localeCompare(right.agentName)
  )

  return {
    responders: sorted.slice(0, maxResponders),
    hiddenResponderCount: Math.max(0, sorted.length - maxResponders),
  }
}

function routePriority(route: IncidentCommandResponderRoute) {
  if (route === 'blocked') {
    return 0
  }

  if (route === 'hold') {
    return 1
  }

  return 2
}

function buildWarnings(input: {
  roleSlots: readonly IncidentCommandRoleSlotView[]
  kitTemplate: IncidentCommandKitTemplateView
  responderReadiness: readonly IncidentCommandResponderReadinessView[]
  supportBlockers: readonly SupportIncidentActionView[]
  hiddenResponderCount: number
}) {
  const warnings: string[] = []
  const missingSlot = input.roleSlots.find((slot) => slot.status === 'missing')
  const missingKitItem = input.kitTemplate.items.find((item) => item.status !== 'equipped')
  const blockedResponder = input.responderReadiness.find(
    (responder) => responder.route !== 'deploy'
  )
  const supportBlocker = input.supportBlockers[0]

  if (missingSlot?.cause) {
    warnings.push(`Role-slot weakness: ${missingSlot.cause}`)
  }

  if (missingKitItem?.cause) {
    warnings.push(`Kit mismatch: ${missingKitItem.cause}`)
  }

  if (blockedResponder) {
    warnings.push(
      `Responder readiness: ${blockedResponder.agentName} is ${blockedResponder.route} (${blockedResponder.primaryReason}).`
    )
  }

  if (supportBlocker) {
    warnings.push(
      `Live support blocker: ${supportBlocker.label}${
        supportBlocker.cause ? ` - ${stripTrailingPeriod(supportBlocker.cause)}` : ''
      }.`
    )
  }

  if (input.hiddenResponderCount > 0) {
    warnings.push(
      `${input.hiddenResponderCount} additional responder(s) hidden to preserve compact command view.`
    )
  }

  return uniqueStable(warnings)
}

function buildSummary(input: {
  teamNames: readonly string[]
  inspectedAgentCount: number
  roleSlots: readonly IncidentCommandRoleSlotView[]
  kitTemplate: IncidentCommandKitTemplateView
  responderReadiness: readonly IncidentCommandResponderReadinessView[]
  supportBlockers: readonly SupportIncidentActionView[]
}) {
  if (input.teamNames.length === 0) {
    return 'No command package is selected for this incident.'
  }

  const coveredRoles = input.roleSlots.filter((slot) => slot.status === 'covered').length
  const equippedKitItems = input.kitTemplate.items.filter(
    (item) => item.status === 'equipped'
  ).length
  const deployableResponders = input.responderReadiness.filter(
    (responder) => responder.route === 'deploy'
  ).length
  const teamLabel = input.teamNames.join(' / ')

  return `${teamLabel}: ${coveredRoles}/${input.roleSlots.length} roles covered / ${equippedKitItems}/${input.kitTemplate.items.length} kit items equipped / ${deployableResponders}/${input.inspectedAgentCount} responders deployable / ${input.supportBlockers.length} support blockers.`
}

export function selectIncidentCommandPackageReadinessView(
  state: GameState,
  encounterId: string,
  options: IncidentCommandPackageReadinessOptions = {}
): IncidentCommandPackageReadinessView {
  const maxRoleSlots = Math.max(1, Math.trunc(options.maxRoleSlots ?? DEFAULT_MAX_ROLE_SLOTS))
  const maxResponders = Math.max(1, Math.trunc(options.maxResponders ?? DEFAULT_MAX_RESPONDERS))
  const maxWarnings = Math.max(1, Math.trunc(options.maxWarnings ?? DEFAULT_MAX_WARNINGS))
  const maxSupportBlockers = Math.max(
    1,
    Math.trunc(options.maxSupportBlockers ?? DEFAULT_MAX_SUPPORT_BLOCKERS)
  )
  const caseData = state.cases[encounterId]
  const teamIds = getTeamIds(state, encounterId, options)
  const teams = getTeams(state, teamIds)
  const agents = getAgentsForTeams(state, teams)
  const caseTags = getCasePressureTags(caseData)
  const roleSlots = buildRoleSlots(agents, caseTags, maxRoleSlots)
  const kitTemplate = buildKitTemplateView(state, agents, caseTags)
  const { responders, hiddenResponderCount } = buildResponderReadiness(
    state,
    caseData,
    agents,
    caseTags,
    maxResponders
  )
  const supportReference = selectSupportIncidentReferenceView(state, encounterId, {
    teamIds,
    scopeLabel: options.scopeLabel,
    maxBlockedActions: maxSupportBlockers,
  })
  const supportBlockers = supportReference.blockedActions.slice(0, maxSupportBlockers)
  const warnings = buildWarnings({
    roleSlots,
    kitTemplate,
    responderReadiness: responders,
    supportBlockers,
    hiddenResponderCount,
  }).slice(0, maxWarnings)
  const teamNames = teams.map((team) => team.name)

  return {
    encounterId,
    encounterTitle: caseData?.title ?? encounterId,
    mode: 'field-compact',
    scopeLabel: options.scopeLabel ?? 'Incident command package',
    summary: buildSummary({
      teamNames,
      inspectedAgentCount: agents.length,
      roleSlots,
      kitTemplate,
      responderReadiness: responders,
      supportBlockers,
    }),
    teamNames,
    inspectedAgentCount: agents.length,
    hiddenResponderCount,
    roleSlots,
    kitTemplate,
    responderReadiness: responders,
    supportBlockers,
    warnings,
  }
}
