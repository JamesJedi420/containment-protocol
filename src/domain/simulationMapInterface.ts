import { buildFactionStates, type FactionState } from './factions'
import type { GameState, RelationshipSnapshot } from './models'
import type { MapErrorState } from './mapAwareness'

export type SocialFactKind =
  | 'alliance'
  | 'grievance'
  | 'rumor_path'
  | 'leverage'
  | 'pressure_link'

export type SocialFactVisibility =
  | 'known'
  | 'reported'
  | 'suspected'
  | 'inferred'
  | 'contradicted'
  | 'hidden'

export interface SimulationMapSubject {
  id: string
  label: string
  category: 'agent' | 'faction' | 'agency'
}

export interface SocialMapFact {
  id: string
  fromSubjectId: string
  toSubjectId: string
  kind: SocialFactKind
  visibility: SocialFactVisibility
  confidence: number
  errorState: MapErrorState
  sourceTags: readonly string[]
  detail: string
}

export type WorldZoneStatus =
  | 'safe_hub'
  | 'curfew_zone'
  | 'hostile_territory'
  | 'resistance_pocket'
  | 'industrial_kill_site'
  | 'abandoned_hub'

export interface WorldRemapZone {
  id: string
  label: string
  status: WorldZoneStatus
  routeAccess: 'open' | 'reduced' | 'severed'
  continuity: 'stable' | 'fragile' | 'broken'
  confidence: number
  pressureSources: readonly string[]
}

export interface RouteRemapState {
  safeHubContinuity: 'stable' | 'fragile' | 'broken'
  usableRouteRatio: number
  reducedRouteCount: number
  severedRouteCount: number
  dominantWorldState: WorldZoneStatus
}

export interface UncertaintyHotspot {
  id: string
  category: 'contradiction' | 'false_reading'
  scope: 'social' | 'route'
  confidence: number
  sourceFactIds: readonly string[]
  detail: string
}

export interface LowConfidenceCluster {
  id: string
  scope: 'social' | 'route'
  averageConfidence: number
  memberIds: readonly string[]
  detail: string
}

export interface MapUncertaintySummary {
  contradictionHotspots: readonly UncertaintyHotspot[]
  falseReadingHotspots: readonly UncertaintyHotspot[]
  lowConfidenceClusters: readonly LowConfidenceCluster[]
  warningTags: readonly string[]
}

export interface SimulationMapInterface {
  subjects: readonly SimulationMapSubject[]
  socialFacts: readonly SocialMapFact[]
  worldZones: readonly WorldRemapZone[]
  routeState: RouteRemapState
  actionableSignals: readonly string[]
  uncertaintySummary: MapUncertaintySummary
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function sortById<T extends { id: string }>(values: readonly T[]) {
  return [...values].sort((left, right) => left.id.localeCompare(right.id))
}

function uniqueStrings(values: readonly string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function toPairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort((left, right) => left.localeCompare(right)).join(':')
}

function getAgentLabel(state: GameState, agentId: string) {
  return state.agents[agentId]?.name ?? agentId
}

function getRelationshipFactErrorState(visibility: SocialFactVisibility): MapErrorState {
  if (visibility === 'contradicted') {
    return 'contradicted'
  }

  if (visibility === 'suspected' || visibility === 'inferred' || visibility === 'hidden') {
    return 'incomplete'
  }

  if (visibility === 'reported') {
    return 'sensor_limited'
  }

  return 'none'
}

function buildRelationshipFact(
  state: GameState,
  leftAgentId: string,
  rightAgentId: string
): SocialMapFact | null {
  const leftValue = state.agents[leftAgentId]?.relationships[rightAgentId] ?? 0
  const rightValue = state.agents[rightAgentId]?.relationships[leftAgentId] ?? 0
  const strongestSignal = Math.max(Math.abs(leftValue), Math.abs(rightValue))

  if (strongestSignal < 1) {
    return null
  }

  const fromSubjectId = `agent:${leftAgentId}`
  const toSubjectId = `agent:${rightAgentId}`
  const id = `social:relationship:${toPairKey(leftAgentId, rightAgentId)}`
  const pairLabel = `${getAgentLabel(state, leftAgentId)} and ${getAgentLabel(state, rightAgentId)}`

  if ((leftValue > 0 && rightValue < 0) || (leftValue < 0 && rightValue > 0)) {
    return {
      id,
      fromSubjectId,
      toSubjectId,
      kind: 'leverage',
      visibility: 'contradicted',
      confidence: clamp01(0.42 + strongestSignal * 0.08),
      errorState: 'contradicted',
      sourceTags: ['relationship-asymmetry'],
      detail: `${pairLabel} project conflicting social signals; the visible link is unstable.`,
    }
  }

  const positiveSignal = Math.max(leftValue, rightValue)
  const negativeSignal = Math.min(leftValue, rightValue)

  if (positiveSignal >= 1 && negativeSignal >= 0) {
    const visibility: SocialFactVisibility = leftValue >= 1 && rightValue >= 1 ? 'known' : 'reported'
    return {
      id,
      fromSubjectId,
      toSubjectId,
      kind: 'alliance',
      visibility,
      confidence: clamp01(visibility === 'known' ? 0.72 + strongestSignal * 0.09 : 0.58 + strongestSignal * 0.08),
      errorState: getRelationshipFactErrorState(visibility),
      sourceTags: visibility === 'known' ? ['roster'] : ['roster', 'partial-report'],
      detail:
        visibility === 'known'
          ? `${pairLabel} are operating as a known alliance.`
          : `${pairLabel} read as aligned, but the visible social picture is still partial.`,
    }
  }

  if (negativeSignal <= -1 && positiveSignal <= 0) {
    const visibility: SocialFactVisibility = leftValue <= -1 && rightValue <= -1 ? 'known' : 'reported'
    return {
      id,
      fromSubjectId,
      toSubjectId,
      kind: 'grievance',
      visibility,
      confidence: clamp01(visibility === 'known' ? 0.7 + strongestSignal * 0.09 : 0.55 + strongestSignal * 0.08),
      errorState: getRelationshipFactErrorState(visibility),
      sourceTags: visibility === 'known' ? ['roster'] : ['roster', 'partial-report'],
      detail:
        visibility === 'known'
          ? `${pairLabel} are carrying an explicit grievance.`
          : `${pairLabel} show signs of friction, but the depth of the grievance remains unclear.`,
    }
  }

  const kind: SocialFactKind = leftValue >= 1 || rightValue >= 1 ? 'alliance' : 'grievance'
  const visibility: SocialFactVisibility = 'suspected'
  return {
    id,
    fromSubjectId,
    toSubjectId,
    kind,
    visibility,
    confidence: clamp01(0.44 + strongestSignal * 0.07),
    errorState: 'incomplete',
    sourceTags: ['one-sided-read'],
    detail:
      kind === 'alliance'
        ? `${pairLabel} may be aligning, but the visible signal is one-sided.`
        : `${pairLabel} may be drifting into conflict, but the visible signal is one-sided.`,
  }
}

function buildRumorFact(state: GameState, snapshot: RelationshipSnapshot): SocialMapFact {
  const pairKey = toPairKey(snapshot.agentAId, snapshot.agentBId)
  const currentA = state.agents[snapshot.agentAId]?.relationships[snapshot.agentBId] ?? 0
  const currentB = state.agents[snapshot.agentBId]?.relationships[snapshot.agentAId] ?? 0
  const currentAverage = (currentA + currentB) / 2
  const contradicted =
    snapshot.value !== 0 &&
    currentAverage !== 0 &&
    Math.sign(snapshot.value) !== Math.sign(currentAverage)

  return {
    id: `social:rumor:${pairKey}:w${snapshot.week}`,
    fromSubjectId: `agent:${snapshot.agentAId}`,
    toSubjectId: `agent:${snapshot.agentBId}`,
    kind: 'rumor_path',
    visibility: contradicted ? 'contradicted' : 'reported',
    confidence: clamp01(0.46 + Math.min(3, Math.abs(snapshot.value)) * 0.1),
    errorState: contradicted ? 'contradicted' : 'sensor_limited',
    sourceTags: uniqueStrings(['history', snapshot.reason ?? 'external_event']),
    detail: contradicted
      ? `${getAgentLabel(state, snapshot.agentAId)} and ${getAgentLabel(state, snapshot.agentBId)} are still generating rumor traffic, but newer signals contradict the earlier read.`
      : `${getAgentLabel(state, snapshot.agentAId)} and ${getAgentLabel(state, snapshot.agentBId)} are linked by reported rumor traffic from week ${snapshot.week}.`,
  }
}

function buildFactionPressureFact(faction: FactionState): SocialMapFact | null {
  const visiblePressure = faction.pressureScore >= 90 || faction.stance === 'hostile' || faction.standing <= -4
  if (!visiblePressure) {
    return null
  }

  const visibility: SocialFactVisibility =
    faction.stance === 'hostile' || faction.pressureScore >= 130 ? 'known' : 'inferred'

  return {
    id: `social:faction-pressure:${faction.id}`,
    fromSubjectId: `faction:${faction.id}`,
    toSubjectId: 'agency:containment',
    kind: 'pressure_link',
    visibility,
    confidence: clamp01(0.54 + Math.min(160, faction.pressureScore) / 320),
    errorState: visibility === 'inferred' ? 'incomplete' : 'none',
    sourceTags: visibility === 'known' ? ['faction-pressure'] : ['faction-pressure', 'inference'],
    detail:
      visibility === 'known'
        ? `${faction.label} is openly remapping operational pressure against the agency.`
        : `${faction.label} is likely shaping operational pressure, but the link is still inferred.`,
  }
}

function buildFactionLeverageFact(faction: FactionState): SocialMapFact[] {
  return faction.contacts
    .filter((contact) => contact.status === 'active' && (contact.relationship ?? 0) >= 15)
    .map((contact) => ({
      id: `social:faction-leverage:${faction.id}:${contact.id}`,
      fromSubjectId: `faction:${faction.id}`,
      toSubjectId: 'agency:containment',
      kind: 'leverage' as const,
      visibility: 'known' as const,
      confidence: clamp01(0.68 + Math.min(30, (contact.relationship ?? 15) - 15) / 100),
      errorState: 'none' as const,
      sourceTags: ['contact-network'],
      detail: `${faction.label} maintains known leverage through ${contact.name ?? contact.label ?? contact.id}.`,
    }))
}

function buildSocialFacts(state: GameState, factionStates: readonly FactionState[]) {
  const agentIds = Object.keys(state.agents)
    .filter((agentId) => !['dead', 'resigned'].includes(state.agents[agentId]?.status ?? 'dead'))
    .sort((left, right) => left.localeCompare(right))
  const relationshipFacts: SocialMapFact[] = []

  for (let leftIndex = 0; leftIndex < agentIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < agentIds.length; rightIndex += 1) {
      const fact = buildRelationshipFact(state, agentIds[leftIndex]!, agentIds[rightIndex]!)
      if (fact) {
        relationshipFacts.push(fact)
      }
    }
  }

  const rumorFacts = [...(state.relationshipHistory ?? [])]
    .filter((snapshot) => snapshot.reason === 'external_event' || snapshot.reason === 'spontaneous_event' || snapshot.reason === 'betrayal')
    .sort((left, right) => {
      if (left.week !== right.week) {
        return right.week - left.week
      }

      return toPairKey(left.agentAId, left.agentBId).localeCompare(toPairKey(right.agentAId, right.agentBId))
    })
    .slice(0, 6)
    .map((snapshot) => buildRumorFact(state, snapshot))

  const factionFacts = factionStates
    .flatMap((faction) => [buildFactionPressureFact(faction), ...buildFactionLeverageFact(faction)])
    .filter((fact): fact is SocialMapFact => fact !== null)

  return sortById([...relationshipFacts, ...rumorFacts, ...factionFacts])
}

function buildSubjects(
  state: GameState,
  factionStates: readonly FactionState[],
  socialFacts: readonly SocialMapFact[]
) {
  const referencedSubjectIds = new Set(
    socialFacts.flatMap((fact) => [fact.fromSubjectId, fact.toSubjectId])
  )
  const subjects: SimulationMapSubject[] = [
    {
      id: 'agency:containment',
      label: 'Containment Protocol',
      category: 'agency',
    },
  ]

  for (const agentId of Object.keys(state.agents).sort((left, right) => left.localeCompare(right))) {
    const subjectId = `agent:${agentId}`
    if (!referencedSubjectIds.has(subjectId)) {
      continue
    }

    subjects.push({
      id: subjectId,
      label: getAgentLabel(state, agentId),
      category: 'agent',
    })
  }

  for (const faction of factionStates) {
    const subjectId = `faction:${faction.id}`
    if (!referencedSubjectIds.has(subjectId)) {
      continue
    }

    subjects.push({
      id: subjectId,
      label: faction.label,
      category: 'faction',
    })
  }

  return sortById(subjects)
}

function buildAgencyHubZone(responderScarcity: number, severeOpenCases: number): WorldRemapZone {
  if (responderScarcity >= 0.72 && severeOpenCases >= 3) {
    return {
      id: 'zone:agency-command',
      label: 'Agency Command',
      status: 'abandoned_hub',
      routeAccess: 'severed',
      continuity: 'broken',
      confidence: 0.88,
      pressureSources: ['responder_absence', 'incident_overload'],
    }
  }

  return {
    id: 'zone:agency-command',
    label: 'Agency Command',
    status: 'safe_hub',
    routeAccess: responderScarcity >= 0.48 ? 'reduced' : 'open',
    continuity: responderScarcity >= 0.48 ? 'fragile' : 'stable',
    confidence: responderScarcity >= 0.48 ? 0.72 : 0.9,
    pressureSources: responderScarcity >= 0.48 ? ['responder_absence'] : ['command_continuity'],
  }
}

function buildWorldZones(
  responderScarcity: number,
  severeOpenCases: number,
  openCaseCount: number,
  factionStates: readonly FactionState[]
) {
  const oversight = factionStates.find((faction) => faction.id === 'oversight')
  const corporateSupply = factionStates.find((faction) => faction.id === 'corporate_supply')
  const occultNetworks = factionStates.find((faction) => faction.id === 'occult_networks')
  const institutions = factionStates.find((faction) => faction.id === 'institutions')
  const zones: WorldRemapZone[] = [buildAgencyHubZone(responderScarcity, severeOpenCases)]

  const curfewPressure = (oversight?.pressureScore ?? 0) >= 110 || (oversight?.standing ?? 0) <= -6 || openCaseCount >= 5
  zones.push({
    id: 'zone:civic-corridors',
    label: 'Civic Corridors',
    status: curfewPressure ? 'curfew_zone' : 'safe_hub',
    routeAccess: curfewPressure && responderScarcity >= 0.68 ? 'severed' : curfewPressure ? 'reduced' : 'open',
    continuity: curfewPressure ? 'fragile' : 'stable',
    confidence: curfewPressure ? 0.79 : 0.83,
    pressureSources: curfewPressure ? ['oversight_pressure', 'public_lockdown'] : ['civil_routine'],
  })

  const industrialKillSite =
    (corporateSupply?.pressureScore ?? 0) >= 100 ||
    (corporateSupply?.standing ?? 0) <= -6 ||
    severeOpenCases >= 2
  zones.push({
    id: 'zone:industrial-perimeter',
    label: 'Industrial Perimeter',
    status: industrialKillSite ? 'industrial_kill_site' : 'safe_hub',
    routeAccess: industrialKillSite && responderScarcity >= 0.6 ? 'severed' : industrialKillSite ? 'reduced' : 'open',
    continuity: industrialKillSite ? 'broken' : 'stable',
    confidence: industrialKillSite ? 0.81 : 0.77,
    pressureSources: industrialKillSite ? ['supply_hostility', 'killzone_pressure'] : ['industrial_access'],
  })

  const hostileShadow =
    (occultNetworks?.pressureScore ?? 0) >= 100 ||
    (occultNetworks?.standing ?? 0) <= -6 ||
    occultNetworks?.stance === 'hostile'
  zones.push({
    id: 'zone:shadow-network',
    label: 'Shadow Network',
    status: hostileShadow ? 'hostile_territory' : 'resistance_pocket',
    routeAccess: hostileShadow ? 'severed' : responderScarcity >= 0.52 ? 'reduced' : 'open',
    continuity: hostileShadow ? 'broken' : responderScarcity >= 0.52 ? 'fragile' : 'stable',
    confidence: hostileShadow ? 0.84 : 0.63,
    pressureSources: hostileShadow ? ['occult_hostility', 'hidden_route_capture'] : ['counter-networking'],
  })

  const resistancePocket = responderScarcity >= 0.45 || (institutions?.standing ?? 0) >= 4
  zones.push({
    id: 'zone:mutual-aid-cells',
    label: 'Mutual Aid Cells',
    status: resistancePocket ? 'resistance_pocket' : 'safe_hub',
    routeAccess: responderScarcity >= 0.7 ? 'reduced' : 'open',
    continuity: responderScarcity >= 0.7 ? 'fragile' : 'stable',
    confidence: resistancePocket ? 0.69 : 0.76,
    pressureSources: resistancePocket ? ['civilian_adaptation', 'institutional_backchannels'] : ['routine_support'],
  })

  return sortById(zones)
}

function getWorldStatusSeverity(status: WorldZoneStatus) {
  switch (status) {
    case 'abandoned_hub':
      return 6
    case 'industrial_kill_site':
      return 5
    case 'hostile_territory':
      return 4
    case 'curfew_zone':
      return 3
    case 'resistance_pocket':
      return 2
    case 'safe_hub':
    default:
      return 1
  }
}

function buildRouteState(worldZones: readonly WorldRemapZone[]): RouteRemapState {
  const agencyHub = worldZones.find((zone) => zone.id === 'zone:agency-command')
  const reducedRouteCount = worldZones.filter((zone) => zone.routeAccess === 'reduced').length
  const severedRouteCount = worldZones.filter((zone) => zone.routeAccess === 'severed').length
  const usableRouteRatio =
    worldZones.length === 0
      ? 1
      : clamp01(
          worldZones.reduce((sum, zone) => {
            if (zone.routeAccess === 'open') return sum + 1
            if (zone.routeAccess === 'reduced') return sum + 0.5
            return sum
          }, 0) / worldZones.length
        )
  const dominantWorldState =
    [...worldZones].sort((left, right) => {
      const severityDelta = getWorldStatusSeverity(right.status) - getWorldStatusSeverity(left.status)
      if (severityDelta !== 0) {
        return severityDelta
      }

      return left.id.localeCompare(right.id)
    })[0]?.status ?? 'safe_hub'

  return {
    safeHubContinuity: agencyHub?.continuity ?? 'stable',
    usableRouteRatio,
    reducedRouteCount,
    severedRouteCount,
    dominantWorldState,
  }
}

function buildActionableSignals(worldZones: readonly WorldRemapZone[], routeState: RouteRemapState) {
  const signals: string[] = []

  if (routeState.safeHubContinuity === 'broken') {
    signals.push('Safe-hub continuity is breaking under responder absence.')
  }

  if (worldZones.some((zone) => zone.status === 'curfew_zone')) {
    signals.push('Civic movement is collapsing into curfew-managed corridors.')
  }

  if (worldZones.some((zone) => zone.status === 'hostile_territory')) {
    signals.push('Hostile dominance has remapped outer movement into hostile territory.')
  }

  if (worldZones.some((zone) => zone.status === 'industrial_kill_site')) {
    signals.push('Industrial approaches are reading as operational kill sites.')
  }

  if (worldZones.some((zone) => zone.status === 'resistance_pocket')) {
    signals.push('Resistance pockets are sustaining access where formal routes are weakening.')
  }

  return uniqueStrings(signals).slice(0, 4)
}

function buildUncertaintySummary(
  socialFacts: readonly SocialMapFact[],
  worldZones: readonly WorldRemapZone[],
  routeState: RouteRemapState
): MapUncertaintySummary {
  const contradictionFacts = socialFacts.filter(
    (fact) => fact.visibility === 'contradicted' || fact.errorState === 'contradicted'
  )
  const contradictionHotspots: UncertaintyHotspot[] = contradictionFacts.map((fact) => ({
    id: `uncertainty:contradiction:${fact.id}`,
    category: 'contradiction',
    scope: 'social',
    confidence: clamp01(Math.max(0.35, fact.confidence)),
    sourceFactIds: [fact.id],
    detail: `${fact.detail} This social link is currently contradiction-prone.`,
  }))

  const falseReadingFacts = socialFacts.filter((fact) => {
    if (fact.kind === 'rumor_path' && fact.visibility === 'contradicted') {
      return true
    }

    if (fact.sourceTags.includes('one-sided-read') && fact.confidence <= 0.56) {
      return true
    }

    return fact.errorState === 'sensor_limited' && fact.confidence <= 0.6
  })
  const falseReadingHotspots: UncertaintyHotspot[] = falseReadingFacts.map((fact) => ({
    id: `uncertainty:false-reading:${fact.id}`,
    category: 'false_reading',
    scope: 'social',
    confidence: clamp01(Math.max(0.3, fact.confidence)),
    sourceFactIds: [fact.id],
    detail: `${fact.detail} This read carries elevated false-interpretation risk.`,
  }))

  const lowConfidenceSocialFacts = socialFacts.filter((fact) => {
    return fact.confidence <= 0.58 || fact.errorState === 'incomplete' || fact.errorState === 'sensor_limited'
  })
  const lowConfidenceRouteZones = worldZones.filter((zone) => zone.confidence <= 0.74)
  const lowConfidenceClusters: LowConfidenceCluster[] = []

  if (lowConfidenceSocialFacts.length > 0) {
    lowConfidenceClusters.push({
      id: 'uncertainty:cluster:social-readings',
      scope: 'social',
      averageConfidence: clamp01(
        lowConfidenceSocialFacts.reduce((sum, fact) => sum + fact.confidence, 0) /
          lowConfidenceSocialFacts.length
      ),
      memberIds: lowConfidenceSocialFacts.map((fact) => fact.id).sort((left, right) => left.localeCompare(right)),
      detail: `${lowConfidenceSocialFacts.length} social links are low-confidence or partially observed.`,
    })
  }

  if (lowConfidenceRouteZones.length > 0) {
    lowConfidenceClusters.push({
      id: 'uncertainty:cluster:route-zones',
      scope: 'route',
      averageConfidence: clamp01(
        lowConfidenceRouteZones.reduce((sum, zone) => sum + zone.confidence, 0) / lowConfidenceRouteZones.length
      ),
      memberIds: lowConfidenceRouteZones.map((zone) => zone.id).sort((left, right) => left.localeCompare(right)),
      detail: `${lowConfidenceRouteZones.length} route-adjacent zones are being interpreted below high-confidence threshold.`,
    })
  }

  const warningTags: string[] = []
  if (contradictionHotspots.length > 0) {
    warningTags.push('scope:relationship:contradiction-hotspot')
  }
  if (falseReadingHotspots.length > 0) {
    warningTags.push('scope:relationship:false-reading-risk')
  }
  if (lowConfidenceClusters.some((cluster) => cluster.scope === 'route')) {
    warningTags.push('scope:routes:low-confidence-cluster')
  }
  if (routeState.safeHubContinuity === 'broken') {
    warningTags.push('scope:agency-hub:continuity-broken')
  }
  if (
    routeState.dominantWorldState === 'abandoned_hub' ||
    routeState.dominantWorldState === 'industrial_kill_site' ||
    routeState.dominantWorldState === 'hostile_territory'
  ) {
    warningTags.push('scope:world:critical-dominance')
  }

  return {
    contradictionHotspots: sortById(contradictionHotspots),
    falseReadingHotspots: sortById(falseReadingHotspots),
    lowConfidenceClusters: sortById(lowConfidenceClusters),
    warningTags: uniqueStrings(warningTags),
  }
}

export function buildSimulationMapInterface(game: GameState): SimulationMapInterface {
  const factionStates = buildFactionStates(game)
  const openCases = Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved')
  const severeOpenCases = openCases.filter(
    (currentCase) => currentCase.stage >= 4 || currentCase.deadlineRemaining <= 1
  ).length
  const responderPool = Object.values(game.agents).filter(
    (agent) => agent.status !== 'dead' && agent.status !== 'resigned'
  )
  const readyResponders = responderPool.filter(
    (agent) => agent.status === 'active' && (agent.assignment?.state ?? 'idle') === 'idle'
  ).length
  const responderScarcity =
    responderPool.length === 0
      ? 1
      : clamp01(1 - readyResponders / Math.max(3, responderPool.length))
  const socialFacts = buildSocialFacts(game, factionStates)
  const subjects = buildSubjects(game, factionStates, socialFacts)
  const worldZones = buildWorldZones(
    responderScarcity,
    severeOpenCases,
    openCases.length,
    factionStates
  )
  const routeState = buildRouteState(worldZones)

  return {
    subjects,
    socialFacts,
    worldZones,
    routeState,
    actionableSignals: buildActionableSignals(worldZones, routeState),
    uncertaintySummary: buildUncertaintySummary(socialFacts, worldZones, routeState),
  }
}
