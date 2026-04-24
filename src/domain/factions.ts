import { clamp } from './math'
import type { CaseInstance, Contact, FactionRuntimeState, GameState, OperationEvent } from './models'

export interface FactionDefinition {
  id: string
  name: string
  label: string
  category: 'government' | 'institution' | 'occult' | 'corporate' | 'covert' | 'anomaly_polity'
  tags: string[]
  feedback: string
  opportunityLabel: string
  opportunityDetail: string
  hostileDetail: string
  // Etiquette-driven protocol config (optional, only for anomaly polity)
  protocolType?: string
  statusSensitivity?: boolean
  favorLogic?: string
  symbolicOffenseThreshold?: number
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
  description: string
  category: FactionDefinition['category']
  standing: number
  reputation: number
  reputationTier: FactionReputationTier
  pressureScore: number
  stance: 'supportive' | 'contested' | 'hostile'
  matchingCases: number
  reasons: string[]
  feedback: string
  influenceModifiers: FactionInfluenceModifiers
  opportunities: FactionOpportunity[]
  opportunityDetail?: string
  hostileDetail?: string
  contacts: Contact[]
  history: NonNullable<FactionRuntimeState['history']>
  knownModifiers: NonNullable<FactionRuntimeState['knownModifiers']>
  hiddenModifierCount: number
  availableFavors: NonNullable<FactionRuntimeState['availableFavors']>
  recruitUnlocks: NonNullable<FactionRuntimeState['recruitUnlocks']>
  lore: NonNullable<FactionRuntimeState['lore']>
  // SPE-52 compact internal state
  cohesion: number
  agendaPressure: number
  reliability: number
  distortion: number
}

const STANDING_MIN = -20
const STANDING_MAX = 20
const FACTION_PRESSURE_THRESHOLD_BASE = 140

export const FACTION_DEFINITIONS: readonly FactionDefinition[] = [
    {
      id: 'threshold_court',
      name: 'Threshold Court',
      label: 'Threshold Court',
      category: 'anomaly_polity',
      tags: ['anomaly', 'protocol', 'threshold', 'court', 'etiquette'],
      feedback: 'Protocol governs all contact; symbolic offense or favor alters access and intel.',
      opportunityLabel: 'Protocol audience',
      opportunityDetail: 'Correct etiquette grants conditional favor and improved intel access.',
      hostileDetail: 'Symbolic offense restricts cooperation and distorts operational outcomes.',
      protocolType: 'deference-reciprocity-naming',
      statusSensitivity: true,
      favorLogic: 'Correct protocol improves reliability and access; offense increases distortion.',
      symbolicOffenseThreshold: 1,
    },
  {
    id: 'oversight',
    name: 'Oversight Bureau',
    label: 'Oversight Bureau',
    category: 'government',
    tags: ['containment', 'critical', 'infrastructure', 'perimeter', 'breach'],
    feedback: 'Pressure here raises executive scrutiny on unresolved incidents and site breaches.',
    opportunityLabel: 'Executive authorization window',
    opportunityDetail:
      'Supportive standing speeds approvals for site lockdowns and major incident response.',
    hostileDetail:
      'Hostile standing increases oversight scrutiny and accelerates breach-driven pressure.',
  },
  {
    id: 'institutions',
    name: 'Academic Institutions',
    label: 'Academic Institutions',
    category: 'institution',
    tags: ['archive', 'campus', 'research', 'analysis', 'witness'],
    feedback: 'Pressure here amplifies investigation demand and witness-management strain.',
    opportunityLabel: 'Research cooperation',
    opportunityDetail:
      'Supportive standing opens cleaner evidence access and better investigation support.',
    hostileDetail:
      'Hostile standing degrades witness cooperation and increases investigative drag.',
  },
  {
    id: 'occult_networks',
    name: 'Occult Networks',
    label: 'Occult Networks',
    category: 'occult',
    tags: ['occult', 'ritual', 'cult', 'spirit', 'anomaly'],
    feedback: 'Pressure here favors escalation chains and anomaly-heavy operations.',
    opportunityLabel: 'Esoteric informants',
    opportunityDetail:
      'Supportive standing yields ritual leads and cleaner anomaly-handling opportunities.',
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
    opportunityDetail:
      'Supportive standing yields cleaner technical leads and covert opportunity windows.',
    hostileDetail:
      'Hostile standing heightens covert interference and technical incident pressure.',
  },
] as const

function createContact(input: Omit<Contact, 'history'> & { history?: Contact['history'] }): Contact {
  return {
    ...input,
    focusTags: [...(input.focusTags ?? [])],
    modifiers: (input.modifiers ?? []).map((modifier) => ({ ...modifier })),
    rewards: (input.rewards ?? []).map((reward) => ({ ...reward })),
    history: {
      interactions: [...(input.history?.interactions ?? [])],
    },
  }
}

function createFactionRuntimeState(
  factionId: string,
  options: {
    reputation?: number
    contacts?: Contact[]
    hiddenModifierCount?: number
    knownModifiers?: FactionRuntimeState['knownModifiers']
    availableFavors?: FactionRuntimeState['availableFavors']
    lore?: FactionRuntimeState['lore']
  } = {}
): FactionRuntimeState {
  const definition = getFactionDefinition(factionId) ?? FACTION_DEFINITIONS[0]!
  const reputation = options.reputation ?? 0

  return {
    id: definition.id,
    name: definition.name,
    label: definition.label,
    reputation,
    reputationTier: getFactionReputationTier(reputation),
    contacts: (options.contacts ?? []).map((contact) => createContact(contact)),
    history: {
      missionsCompleted: 0,
      missionsFailed: 0,
      successRate: 0,
      interactionLog: [],
    },
    knownModifiers: (options.knownModifiers ?? []).map((modifier) => ({ ...modifier })),
    hiddenModifierCount: options.hiddenModifierCount ?? 0,
    availableFavors: (options.availableFavors ?? []).map((favor) => ({ ...favor })),
    recruitUnlocks: [],
    lore: options.lore
      ? {
          discovered: options.lore.discovered.map((entry) => ({ ...entry })),
          remainingCount: options.lore.remainingCount,
        }
      : {
          discovered: [],
          remainingCount: 1,
        },
  }
}

export function createInitialFactionState(): NonNullable<GameState['factions']> {
  return {
    oversight: createFactionRuntimeState('oversight', {
      hiddenModifierCount: 1,
      contacts: [
        createContact({
          id: 'oversight-rhodes',
          name: 'Elaine Rhodes',
          role: 'Bureau liaison',
          status: 'inactive',
          relationship: 5,
          focusTags: ['containment', 'authorization'],
          modifiers: [
            {
              id: 'oversight-lockdown-window',
              label: 'Lockdown authorization',
              description: 'Improves access to formal containment actions once active.',
            },
          ],
        }),
      ],
      knownModifiers: [
        {
          id: 'oversight-scrutiny',
          label: 'Executive scrutiny',
          description: 'Unresolved breach pressure accelerates oversight attention.',
        },
      ],
      lore: {
        discovered: [
          {
            label: 'Formal mandate',
            summary: 'Oversight responds fastest to containment and infrastructure incidents.',
          },
        ],
        remainingCount: 1,
      },
    }),
    institutions: createFactionRuntimeState('institutions', {
      contacts: [
        createContact({
          id: 'institutions-halden',
          name: 'Miren Halden',
          label: 'Research fellowship',
          role: 'Research fellowship',
          status: 'active',
          relationship: 20,
          disposition: 'supportive',
          minTier: 'friendly',
          rewardId: 'institutions-halden-research-fellowship',
          summary: 'A fellowship referral channel is available through Halden.',
          focusTags: ['research', 'archive'],
          rewards: [{ id: 'institutions-fellowship', label: 'Research fellowship' }],
          modifiers: [
            {
              id: 'institutions-recruit-quality',
              label: 'Researcher referral quality',
              description: 'Sponsored academic recruits arrive with better investigation upside.',
              effect: 'recruit_quality',
              value: 6,
            },
          ],
        }),
        createContact({
          id: 'institutions-vell',
          name: 'Jonah Vell',
          label: 'Archive cooperation',
          role: 'Archive liaison',
          status: 'active',
          relationship: 16,
          disposition: 'supportive',
          minTier: 'friendly',
          rewardId: 'institutions-vell-archive-channel',
          summary: 'Archive cooperation can surface additional investigation leads.',
          focusTags: ['archive', 'witness'],
        }),
      ],
      hiddenModifierCount: 1,
      knownModifiers: [
        {
          id: 'institutions-evidence-access',
          label: 'Evidence access',
          description: 'Friendly standing improves investigation support and witness access.',
        },
      ],
      lore: {
        discovered: [
          {
            label: 'Campus network',
            summary: 'Institutional contacts can open research-heavy recruitment channels.',
          },
        ],
        remainingCount: 1,
      },
    }),
    occult_networks: createFactionRuntimeState('occult_networks', {
      contacts: [
        createContact({
          id: 'occult-networks-marrow',
          name: 'Marrow Sign',
          role: 'Esoteric informant',
          status: 'inactive',
          relationship: 0,
          focusTags: ['occult', 'ritual'],
        }),
      ],
      hiddenModifierCount: 1,
    }),
    corporate_supply: createFactionRuntimeState('corporate_supply', {
      contacts: [
        createContact({
          id: 'corporate-supply-vale',
          name: 'Nadia Vale',
          role: 'Procurement broker',
          status: 'inactive',
          relationship: 4,
          focusTags: ['logistics', 'hazmat'],
        }),
      ],
    }),
    black_budget: createFactionRuntimeState('black_budget', {
      contacts: [
        createContact({
          id: 'blackbudget-ossian',
          name: 'Lena Ossian',
          label: 'Intercept operative referral',
          role: 'Intercept operative referral',
          status: 'inactive',
          relationship: 8,
          disposition: 'supportive',
          minTier: 'allied',
          rewardId: 'blackbudget-ossian-intercept-operative',
          summary: 'A classified intercept referral channel can open at allied standing.',
          focusTags: ['classified', 'tech'],
          rewards: [{ id: 'blackbudget-intercept-operative', label: 'Intercept operative referral' }],
          modifiers: [
            {
              id: 'blackbudget-recruit-quality',
              label: 'Intercept tradecraft',
              description: 'Sponsored covert recruits arrive with stronger technical screening.',
              effect: 'recruit_quality',
              value: 8,
            },
          ],
        }),
      ],
      hiddenModifierCount: 1,
      knownModifiers: [
        {
          id: 'blackbudget-classified-intercepts',
          label: 'Classified intercepts',
          description: 'Supportive standing improves technical and covert incident leads.',
        },
      ],
    }),
    threshold_court: createFactionRuntimeState('threshold_court', {
      contacts: [
        createContact({
          id: 'threshold-court-envoy',
          name: 'Envoy of Names',
          role: 'Protocol envoy',
          status: 'inactive',
          relationship: 0,
          focusTags: ['protocol', 'threshold'],
        }),
      ],
      hiddenModifierCount: 1,
    }),
  }
}

function roundModifier(value: number) {
  return Number(value.toFixed(2))
}

function getAgencyState(
  game: Pick<GameState, 'agency' | 'containmentRating' | 'clearanceLevel' | 'funding'>
) {
  return (
    game.agency ?? {
      containmentRating: game.containmentRating,
      clearanceLevel: game.clearanceLevel,
      funding: game.funding,
    }
  )
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

export function getFactionHostileMissionTags(factionId: string) {
  return getFactionDefinitionTags(factionId)
}

export function getFactionSupportiveMissionTags(factionId: string) {
  return getFactionDefinitionTags(factionId)
}

export function inferFactionIdFromCaseTags(template: {
  tags?: readonly string[]
  requiredTags?: readonly string[]
  preferredTags?: readonly string[]
}) {
  const tags = [
    ...new Set([...(template.tags ?? []), ...(template.requiredTags ?? []), ...(template.preferredTags ?? [])]),
  ]

  return [...FACTION_DEFINITIONS]
    .map((faction) => ({
      faction,
      overlap: faction.tags.filter((tag) => tags.includes(tag)).length,
    }))
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap || left.faction.id.localeCompare(right.faction.id))[0]
    ?.faction.id
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

export type FactionReputationTier = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'

export interface FactionRecruitUnlock {
  factionId: string
  factionName: string
  contactId?: string
  contactName?: string
  label: string
  summary?: string
  disposition?: string
  minTier?: FactionReputationTier
  maxTier?: FactionReputationTier
  rewardId: string
}

interface FactionContactModifier {
  effect?: string
  value?: number
}

interface FactionContactState {
  id: string
  name?: string
  label?: string
  role?: string
  summary?: string
  status?: string
  relationship?: number
  disposition?: string
  minTier?: FactionReputationTier
  maxTier?: FactionReputationTier
  rewardId?: string
  modifiers?: readonly FactionContactModifier[]
}

interface RuntimeFactionState {
  id?: string
  name?: string
  label?: string
  reputation?: number
  reputationTier?: FactionReputationTier
  contacts?: readonly FactionContactState[]
}

function getRuntimeFactionEntries(factions: GameState['factions']) {
  return Object.entries((factions ?? {}) as Record<string, RuntimeFactionState>)
}

function cloneContact(contact: Contact): Contact {
  return {
    ...contact,
    focusTags: [...(contact.focusTags ?? [])],
    modifiers: (contact.modifiers ?? []).map((modifier) => ({ ...modifier })),
    rewards: (contact.rewards ?? []).map((reward) => ({ ...reward })),
    history: {
      interactions: [...contact.history.interactions],
    },
  }
}

function getTierRank(tier: FactionReputationTier) {
  return ['hostile', 'unfriendly', 'neutral', 'friendly', 'allied'].indexOf(tier)
}

function isTierAtLeast(current: FactionReputationTier, minimum?: FactionReputationTier) {
  return !minimum || getTierRank(current) >= getTierRank(minimum)
}

function isTierAtMost(current: FactionReputationTier, maximum?: FactionReputationTier) {
  return !maximum || getTierRank(current) <= getTierRank(maximum)
}

export function getFactionReputationTier(reputation: number): FactionReputationTier {
  if (reputation >= 75) return 'allied'
  if (reputation >= 35) return 'friendly'
  if (reputation <= -50) return 'hostile'
  if (reputation <= -15) return 'unfriendly'
  return 'neutral'
}

export function getFactionRecruitUnlocks({
  factions,
}: {
  factions: GameState['factions']
}): FactionRecruitUnlock[] {
  return getRuntimeFactionEntries(factions)
    .flatMap(([factionKey, faction]) => {
      const factionId = faction.id ?? factionKey
      const definition = getFactionDefinition(factionId)
      const reputation = typeof faction.reputation === 'number' ? faction.reputation : 0
      const reputationTier = getFactionReputationTier(reputation)

      return (faction.contacts ?? [])
        .filter((contact) => contact.status === 'active')
        .filter((contact) => (contact.relationship ?? 0) >= 15)
        .filter((contact) => isTierAtLeast(reputationTier, contact.minTier ?? 'friendly'))
        .filter((contact) => isTierAtMost(reputationTier, contact.maxTier))
        .map((contact) => ({
          factionId,
          factionName: faction.name ?? faction.label ?? definition?.name ?? factionId,
          contactId: contact.id,
          contactName: contact.name,
          label: contact.label ?? contact.role ?? contact.summary ?? contact.name ?? 'Recruit channel',
          summary: contact.summary,
          disposition: contact.disposition ?? 'supportive',
          minTier: contact.minTier ?? 'friendly',
          maxTier: contact.maxTier,
          rewardId: contact.rewardId ?? `${factionId}-${contact.id}-recruit`,
        }))
    })
    .sort((left, right) => left.factionId.localeCompare(right.factionId) || left.label.localeCompare(right.label))
}

export function getFactionRecruitQualityModifier(
  { factions }: { factions: GameState['factions'] },
  source: { factionId?: string; contactId?: string }
) {
  if (!source.factionId || !source.contactId) {
    return 0
  }

  const faction = ((factions ?? {}) as Record<string, RuntimeFactionState>)[source.factionId]
  const contact = faction?.contacts?.find((entry) => entry.id === source.contactId)

  return (contact?.modifiers ?? [])
    .filter((modifier) => modifier.effect === 'recruit_quality')
    .reduce((sum, modifier) => sum + (modifier.value ?? 0), 0)
}

export function applyFactionRecruitInteraction(
  factions: GameState['factions'],
  input: {
    factionId?: string
    contactId?: string
    reputationDelta?: number
    relationshipDelta?: number
  }
): NonNullable<GameState['factions']> {
  const current = { ...(factions ?? {}) } as NonNullable<GameState['factions']>
  if (!input.factionId || !current[input.factionId]) {
    return current
  }

  const faction = current[input.factionId]
  const reputation = clamp((faction.reputation ?? 0) + (input.reputationDelta ?? 0), -100, 100)

  return {
    ...current,
    [input.factionId]: {
      ...faction,
      reputation,
      reputationTier: getFactionReputationTier(reputation),
      contacts: (faction.contacts ?? []).map((contact) => {
        if (contact.id !== input.contactId) {
          return contact
        }

        const relationship = clamp(
          (contact.relationship ?? 0) + (input.relationshipDelta ?? 0),
          -100,
          100
        )

        return {
          ...contact,
          relationship,
          status: relationship <= -40 ? 'hostile' : relationship >= 15 ? 'active' : contact.status,
        }
      }),
    },
  }
}

export function diffFactionRecruitUnlocks(
  previousUnlocks: readonly FactionRecruitUnlock[],
  nextUnlocks: readonly FactionRecruitUnlock[]
) {
  const previousKeys = new Set(
    previousUnlocks.map((unlock) => `${unlock.factionId}:${unlock.contactId ?? ''}:${unlock.rewardId}`)
  )

  return nextUnlocks.filter(
    (unlock) => !previousKeys.has(`${unlock.factionId}:${unlock.contactId ?? ''}:${unlock.rewardId}`)
  )
}

export function buildFactionMissionContext(
  currentCase: Pick<CaseInstance, 'factionId' | 'tags' | 'requiredTags' | 'preferredTags'>,
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'reports'
    | 'market'
    | 'events'
  >
) {
  const factionStates = buildFactionStates(game)
  const matches = buildFactionCaseMatches(currentCase, factionStates)
  const primary =
    factionStates.find((faction) => faction.id === currentCase.factionId) ?? matches[0]?.factionState

  if (!primary) {
    return {
      scoreAdjustment: 0,
      reasons: [] as string[],
    }
  }

  const scoreAdjustment = Math.round(primary.influenceModifiers.rewardModifier * 100)

  return {
    scoreAdjustment,
    reasons:
      scoreAdjustment === 0
        ? []
        : [`${primary.label} ${scoreAdjustment > 0 ? 'support' : 'interference'} ${scoreAdjustment >= 0 ? '+' : ''}${scoreAdjustment}`],
  }
}

function buildFactionInfluenceModifiers(
  standing: number,
  pressureScore: number
): FactionInfluenceModifiers {
  const standingCaseBias =
    standing >= 8 ? -0.1 : standing >= 4 ? -0.05 : standing <= -8 ? 0.14 : standing <= -4 ? 0.08 : 0
  const pressureCaseBias = pressureScore >= 160 ? 0.08 : pressureScore >= 90 ? 0.04 : 0
  const caseGenerationWeight = roundModifier(
    clamp(1 + standingCaseBias + pressureCaseBias, 0.85, 1.3)
  )

  const standingRewardBias =
    standing >= 8
      ? 0.12
      : standing >= 4
        ? 0.07
        : standing <= -8
          ? -0.12
          : standing <= -4
            ? -0.07
            : 0
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

function collectCaseTags(
  currentCase: Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>
) {
  return [
    ...new Set([...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags]),
  ]
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
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'reports'
    | 'market'
    | 'events'
  >
): FactionRewardInfluence {
  const factionStates = buildFactionStates(game as GameState)
  const matches = buildFactionCaseMatches(currentCase, factionStates)
  const activeMatches = matches.slice(0, currentCase.kind === 'raid' ? 2 : 1)
  // SPE-52: Add anchor faction's reliability as a deterministic modifier to rewardModifier
  let anchorReliability = 0
  if (factionStates.length > 0) {
    anchorReliability = factionStates[0].reliability
  }
  // Map reliability (0-100) to a modifier in [-0.08, +0.08] (centered at 50)
  const reliabilityModifier = ((anchorReliability - 50) / 50) * 0.08
  const rewardModifier = roundModifier(
    activeMatches.reduce((sum, entry, index) => {
      const scale = index === 0 ? 1 : 0.5
      return sum + entry.factionState.influenceModifiers.rewardModifier * scale
    }, 0) + reliabilityModifier
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

export function getFactionPressureSpawnThreshold(
  faction: Pick<FactionState, 'standing' | 'pressureScore'>
) {
  const standingAdjustment =
    faction.standing <= -8
      ? -20
      : faction.standing <= -4
        ? -10
        : faction.standing >= 8
          ? 15
          : faction.standing >= 4
            ? 8
            : 0
  const pressureAdjustment = faction.pressureScore >= 180 ? -5 : 0

  return FACTION_PRESSURE_THRESHOLD_BASE + standingAdjustment + pressureAdjustment
}

export function buildFactionStates(
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'reports'
    | 'market'
    | 'events'
  > &
    Partial<Pick<GameState, 'factions'>>
): FactionState[] {
  const openCases = getOpenCases(game)
  const agency = getAgencyState(game)
  const unresolvedMomentum = getRecentUnresolvedMomentum(game)
  const standingByFactionId = buildFactionStandingMap(game)
  const runtimeFactions = game.factions ?? createInitialFactionState()

  return FACTION_DEFINITIONS.map((faction, idx) => {
    const runtime = runtimeFactions[faction.id] ?? createFactionRuntimeState(faction.id)
    const matchingCases = openCases.filter((currentCase) =>
      collectCaseTags(currentCase).some((tag) => faction.tags.includes(tag))
    )
    const pressureScore =
      matchingCases.reduce((sum, currentCase) => sum + getCasePressureScore(currentCase), 0) +
      getMarketPressureFactor(game.market.pressure) +
      unresolvedMomentum * 2
    const standing = standingByFactionId[faction.id] ?? 0
    const reputation = clamp(runtime.reputation ?? 0, -100, 100)
    const reputationTier = getFactionReputationTier(reputation)
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

    // SPE-52: Only the first faction (anchor) gets compact internal state for now
    const isAnchor = idx === 0

    // Canonical bounds: Only clamp if negative, allow overflow unless canonical
    let cohesion = isAnchor ? 60 + standing * 2 - pressureScore * 0.1 : 0
    let agendaPressure = isAnchor ? pressureScore * 0.5 : 0
    let reliability = isAnchor ? 50 + standing - agendaPressure * 0.2 : 0
    let distortion = isAnchor ? agendaPressure * 0.3 + (100 - cohesion) * 0.2 : 0

    // Internal event-driven fracture: if agendaPressure or distortion exceeds threshold, trigger fracture
    if (isAnchor) {
      const FRACTURE_AGENDA_PRESSURE = 80
      const FRACTURE_DISTORTION = 70
      if (agendaPressure > FRACTURE_AGENDA_PRESSURE || distortion > FRACTURE_DISTORTION) {
        cohesion -= 12
        distortion += 10
      }
      // Clamp only to prevent negative values (canonical: no upper bound unless specified)
      if (cohesion < 0) cohesion = 0
      if (agendaPressure < 0) agendaPressure = 0
      if (reliability < 0) reliability = 0
      if (distortion < 0) distortion = 0
      // Optionally: could expose fracture event/flag in state for testability
    }

    return {
      id: faction.id,
      name: faction.name,
      label: faction.label,
      description: faction.feedback,
      category: faction.category,
      standing,
      reputation,
      reputationTier,
      pressureScore,
      stance,
      matchingCases: matchingCases.length,
      reasons: matchingCases.slice(0, 3).map((currentCase) => currentCase.title),
      feedback: faction.feedback,
      influenceModifiers,
      opportunities,
      contacts: (runtime.contacts ?? []).map((contact) => cloneContact(contact as Contact)),
      history: {
        missionsCompleted: runtime.history?.missionsCompleted ?? 0,
        missionsFailed: runtime.history?.missionsFailed ?? 0,
        successRate: runtime.history?.successRate ?? 0,
        interactionLog: [...(runtime.history?.interactionLog ?? [])],
      },
      knownModifiers: (runtime.knownModifiers ?? []).map((modifier) => ({ ...modifier })),
      hiddenModifierCount: runtime.hiddenModifierCount ?? 0,
      availableFavors: (runtime.availableFavors ?? []).map((favor) => ({ ...favor })),
      recruitUnlocks: (runtime.recruitUnlocks ?? []).map((unlock) => ({ ...unlock })),
      lore: runtime.lore
        ? {
            discovered: runtime.lore.discovered.map((entry) => ({ ...entry })),
            remainingCount: runtime.lore.remainingCount,
          }
        : {
            discovered: [],
            remainingCount: 0,
          },
      cohesion,
      agendaPressure,
      reliability,
      distortion,
    }
  }).sort(
    (left, right) =>
      right.pressureScore - left.pressureScore ||
      right.standing - left.standing ||
      left.label.localeCompare(right.label)
  )
}
