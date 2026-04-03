import { clamp } from './math'
import type { CaseInstance, GameState, OperationEvent } from './models'

export interface FactionDefinition {
  id: string
  name: string
  label: string
  category: 'government' | 'institution' | 'occult' | 'corporate' | 'covert'
  tags: string[]
  feedback: string
  opportunityLabel: string
  opportunityDetail: string
  hostileDetail: string
}

export interface FactionInfluenceModifiers {
  caseGenerationWeight: number
  rewardModifier: number
  opportunityAccess: number
}

export interface FactionOpportunity {
  id: string
  label: string
  detail: string
  direction: 'positive' | 'negative'
}

export interface FactionCaseMatch {
  factionId: string
  label: string
  standing: number
  overlapTags: string[]
  rewardModifier: number
}

export interface FactionRewardInfluence {
  rewardModifier: number
  matches: FactionCaseMatch[]
}

export interface FactionState {
  id: string
  name: string
  label: string
  category: FactionDefinition['category']
  standing: number
  pressureScore: number
  stance: 'supportive' | 'contested' | 'hostile'
  matchingCases: number
  reasons: string[]
  feedback: string
  influenceModifiers: FactionInfluenceModifiers
  opportunities: FactionOpportunity[]
}

const STANDING_MIN = -20
const STANDING_MAX = 20
const FACTION_PRESSURE_THRESHOLD_BASE = 140

export const FACTION_DEFINITIONS: readonly FactionDefinition[] = [
  {
    id: 'oversight',
    name: 'Oversight Bureau',
    label: 'Oversight Bureau',
    category: 'government',
    tags: ['containment', 'critical', 'infrastructure', 'perimeter', 'breach'],
    feedback: 'Pressure here raises executive scrutiny on unresolved incidents and site breaches.',
    opportunityLabel: 'Executive authorization window',
    opportunityDetail: 'Supportive standing speeds approvals for site lockdowns and major incident response.',
    hostileDetail: 'Hostile standing increases oversight scrutiny and accelerates breach-driven pressure.',
  },
  {
    id: 'institutions',
    name: 'Academic Institutions',
    label: 'Academic Institutions',
    category: 'institution',
    tags: ['archive', 'campus', 'research', 'analysis', 'witness'],
    feedback: 'Pressure here amplifies investigation demand and witness-management strain.',
    opportunityLabel: 'Research cooperation',
    opportunityDetail: 'Supportive standing opens cleaner evidence access and better investigation support.',
    hostileDetail: 'Hostile standing degrades witness cooperation and increases investigative drag.',
  },
  {
    id: 'occult_networks',
    name: 'Occult Networks',
    label: 'Occult Networks',
    category: 'occult',
    tags: ['occult', 'ritual', 'cult', 'spirit', 'anomaly'],
    feedback: 'Pressure here favors escalation chains and anomaly-heavy operations.',
    opportunityLabel: 'Esoteric informants',
    opportunityDetail: 'Supportive standing yields ritual leads and cleaner anomaly-handling opportunities.',
    hostileDetail: 'Hostile standing feeds cult mobilization and anomaly escalation chains.',
  },
  {
    id: 'corporate_supply',
    name: 'Corporate Supply Chains',
    label: 'Corporate Supply Chains',
    category: 'corporate',
    tags: ['chemical', 'biological', 'hazmat', 'signal', 'logistics'],
    feedback: 'Pressure here feeds back into procurement stress and field equipment demand.',
    opportunityLabel: 'Preferred procurement access',
    opportunityDetail: 'Supportive standing improves supply access and softens logistics pressure.',
    hostileDetail: 'Hostile standing tightens supply lines and raises field logistics pressure.',
  },
  {
    id: 'black_budget',
    name: 'Black Budget Programs',
    label: 'Black Budget Programs',
    category: 'covert',
    tags: ['cyber', 'information', 'relay', 'classified', 'tech'],
    feedback: 'Pressure here increases covert competition around intel and technical incidents.',
    opportunityLabel: 'Classified intercepts',
    opportunityDetail: 'Supportive standing yields cleaner technical leads and covert opportunity windows.',
    hostileDetail: 'Hostile standing heightens covert interference and technical incident pressure.',
  },
] as const

function roundModifier(value: number) {
  return Number(value.toFixed(2))
}

function getAgencyState(game: Pick<GameState, 'agency' | 'containmentRating' | 'clearanceLevel' | 'funding'>) {
  return game.agency ?? {
    containmentRating: game.containmentRating,
    clearanceLevel: game.clearanceLevel,
    funding: game.funding,
  }
}

function getOpenCases(game: Pick<GameState, 'cases'>) {
  return Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved')
}

function getCasePressureScore(currentCase: CaseInstance) {
  return (
    currentCase.stage * 12 +
    (currentCase.kind === 'raid' ? 18 : 0) +
    Math.max(0, 3 - currentCase.deadlineRemaining) * 8 +
    (currentCase.status === 'in_progress' ? 4 : 0)
  )
}

function getRecentUnresolvedMomentum(game: Pick<GameState, 'reports'>) {
  return game.reports
    .slice(-3)
    .reduce((sum, report) => sum + report.unresolvedTriggers.length + report.failedCases.length, 0)
}

function getMarketPressureFactor(pressure: GameState['market']['pressure']) {
  if (pressure === 'tight') {
    return 8
  }

  if (pressure === 'discounted') {
    return -4
  }

  return 0
}

function getRewardBreakdownFromEvent(event: OperationEvent) {
  switch (event.type) {
    case 'case.resolved':
    case 'case.partially_resolved':
    case 'case.failed':
    case 'case.escalated':
      return event.payload.rewardBreakdown
    default:
      return undefined
  }
}

function buildStandingMapFromRewardEvents(events: readonly OperationEvent[]) {
  const standings = Object.fromEntries(FACTION_DEFINITIONS.map((faction) => [faction.id, 0]))

  for (const event of events) {
    const rewardBreakdown = getRewardBreakdownFromEvent(event)

    if (!rewardBreakdown) {
      continue
    }

    for (const change of rewardBreakdown.factionStanding) {
      standings[change.factionId] = clamp(
        (standings[change.factionId] ?? 0) + change.delta,
        STANDING_MIN,
        STANDING_MAX
      )
    }
  }

  return standings
}

export function getFactionDefinition(factionId: string) {
  return FACTION_DEFINITIONS.find((faction) => faction.id === factionId) ?? null
}

export function getFactionDefinitionTags(factionId: string) {
  return getFactionDefinition(factionId)?.tags ?? []
}

export function buildFactionStandingMap(game: Pick<GameState, 'events'>) {
  const standings = Object.fromEntries(FACTION_DEFINITIONS.map((faction) => [faction.id, 0]))
  const standingEvents = game.events.filter(
    (event): event is Extract<OperationEvent, { type: 'faction.standing_changed' }> =>
      event.type === 'faction.standing_changed'
  )

  if (standingEvents.length > 0) {
    for (const event of standingEvents) {
      standings[event.payload.factionId] = clamp(
        (standings[event.payload.factionId] ?? 0) + event.payload.delta,
        STANDING_MIN,
        STANDING_MAX
      )
    }

    return standings
  }

  return buildStandingMapFromRewardEvents(game.events)
}

function buildFactionInfluenceModifiers(standing: number, pressureScore: number): FactionInfluenceModifiers {
  const standingCaseBias =
    standing >= 8 ? -0.1 : standing >= 4 ? -0.05 : standing <= -8 ? 0.14 : standing <= -4 ? 0.08 : 0
  const pressureCaseBias = pressureScore >= 160 ? 0.08 : pressureScore >= 90 ? 0.04 : 0
  const caseGenerationWeight = roundModifier(
    clamp(1 + standingCaseBias + pressureCaseBias, 0.85, 1.3)
  )

  const standingRewardBias =
    standing >= 8 ? 0.12 : standing >= 4 ? 0.07 : standing <= -8 ? -0.12 : standing <= -4 ? -0.07 : 0
  const pressureRewardBias = pressureScore >= 160 ? -0.04 : pressureScore >= 90 ? -0.015 : 0
  const rewardModifier = roundModifier(clamp(standingRewardBias + pressureRewardBias, -0.16, 0.16))

  const opportunityAccess = clamp(
    (standing >= 8 ? 3 : standing >= 4 ? 2 : standing <= -8 ? -2 : standing <= -4 ? -1 : 0) +
      (pressureScore >= 160 ? -1 : pressureScore < 50 && standing > 0 ? 1 : 0),
    -2,
    4
  )

  return {
    caseGenerationWeight,
    rewardModifier,
    opportunityAccess,
  }
}

function buildFactionOpportunities(
  faction: FactionDefinition,
  standing: number,
  pressureScore: number,
  modifiers: FactionInfluenceModifiers
) {
  const opportunities: FactionOpportunity[] = []

  if (modifiers.opportunityAccess >= 2) {
    opportunities.push({
      id: `${faction.id}-support-window`,
      label: faction.opportunityLabel,
      detail: faction.opportunityDetail,
      direction: 'positive',
    })
  }

  if (pressureScore >= 90 || standing <= -4) {
    opportunities.push({
      id: `${faction.id}-pressure-window`,
      label: 'Pressure spike',
      detail: faction.hostileDetail,
      direction: 'negative',
    })
  }

  return opportunities
}

function collectCaseTags(currentCase: Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>) {
  return [...new Set([...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags])]
}

function buildFactionCaseMatches(
  currentCase: Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>,
  factionStates: readonly FactionState[]
) {
  const tags = collectCaseTags(currentCase)

  return factionStates
    .map((factionState) => ({
      factionState,
      overlapTags: getFactionDefinitionTags(factionState.id).filter((tag) => tags.includes(tag)),
    }))
    .filter((entry) => entry.overlapTags.length > 0)
    .sort(
      (left, right) =>
        right.overlapTags.length - left.overlapTags.length ||
        right.factionState.influenceModifiers.rewardModifier -
          left.factionState.influenceModifiers.rewardModifier ||
        left.factionState.label.localeCompare(right.factionState.label)
    )
}

export function buildFactionRewardInfluence(
  currentCase: Pick<CaseInstance, 'kind' | 'tags' | 'requiredTags' | 'preferredTags'>,
  game: Pick<GameState, 'agency' | 'containmentRating' | 'clearanceLevel' | 'funding' | 'cases' | 'reports' | 'market' | 'events'>
): FactionRewardInfluence {
  const factionStates = buildFactionStates(game as GameState)
  const matches = buildFactionCaseMatches(currentCase, factionStates)
  const activeMatches = matches.slice(0, currentCase.kind === 'raid' ? 2 : 1)
  const rewardModifier = roundModifier(
    activeMatches.reduce((sum, entry, index) => {
      const scale = index === 0 ? 1 : 0.5
      return sum + entry.factionState.influenceModifiers.rewardModifier * scale
    }, 0)
  )

  return {
    rewardModifier,
    matches: activeMatches.map(({ factionState, overlapTags }) => ({
      factionId: factionState.id,
      label: factionState.label,
      standing: factionState.standing,
      overlapTags,
      rewardModifier: factionState.influenceModifiers.rewardModifier,
    })),
  }
}

export function getFactionPressureSpawnThreshold(faction: Pick<FactionState, 'standing' | 'pressureScore'>) {
  const standingAdjustment =
    faction.standing <= -8 ? -20 : faction.standing <= -4 ? -10 : faction.standing >= 8 ? 15 : faction.standing >= 4 ? 8 : 0
  const pressureAdjustment = faction.pressureScore >= 180 ? -5 : 0

  return FACTION_PRESSURE_THRESHOLD_BASE + standingAdjustment + pressureAdjustment
}

export function buildFactionStates(
  game: Pick<GameState, 'agency' | 'containmentRating' | 'clearanceLevel' | 'funding' | 'cases' | 'reports' | 'market' | 'events'>
): FactionState[] {
  const openCases = getOpenCases(game)
  const agency = getAgencyState(game)
  const unresolvedMomentum = getRecentUnresolvedMomentum(game)
  const standingByFactionId = buildFactionStandingMap(game)

  return FACTION_DEFINITIONS.map((faction) => {
    const matchingCases = openCases.filter((currentCase) =>
      collectCaseTags(currentCase).some((tag) => faction.tags.includes(tag))
    )
    const pressureScore =
      matchingCases.reduce((sum, currentCase) => sum + getCasePressureScore(currentCase), 0) +
      getMarketPressureFactor(game.market.pressure) +
      unresolvedMomentum * 2
    const standing = standingByFactionId[faction.id] ?? 0
    const influenceModifiers = buildFactionInfluenceModifiers(standing, pressureScore)
    const opportunities = buildFactionOpportunities(
      faction,
      standing,
      pressureScore,
      influenceModifiers
    )
    const stance: FactionState['stance'] =
      standing >= 6 && pressureScore < 90 && agency.containmentRating >= 60
        ? 'supportive'
        : standing <= -6 || pressureScore >= 110
          ? 'hostile'
          : 'contested'

    return {
      id: faction.id,
      name: faction.name,
      label: faction.label,
      category: faction.category,
      standing,
      pressureScore,
      stance,
      matchingCases: matchingCases.length,
      reasons: matchingCases.slice(0, 3).map((currentCase) => currentCase.title),
      feedback: faction.feedback,
      influenceModifiers,
      opportunities,
    }
  }).sort(
    (left, right) =>
      right.pressureScore - left.pressureScore ||
      right.standing - left.standing ||
      left.label.localeCompare(right.label)
  )
}
