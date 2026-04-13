import { APP_ROUTES } from '../../app/routes'
import { getContractCatalogEntries } from '../../domain/contracts'
import { buildFactionStates, type FactionState } from '../../domain/factions'
import type { Contact, GameState, OperationEvent } from '../../domain/models'
import { buildEventFeedView, type EventFeedTone } from '../dashboard/eventFeedView'

const MAX_EFFECTS = 3
const MAX_CONTACTS = 3
const MAX_HISTORY = 3
const MAX_LORE = 2
const MAX_RECRUIT_CHANNELS = 2

export type FactionViewTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success'

export interface FactionPageMetricView {
  label: string
  value: string
}

export interface FactionRecentActivityView {
  id: string
  title: string
  detail: string
  tone: FactionViewTone
  href?: string
}

export interface FactionContactSummaryView {
  id: string
  name: string
  role: string
  relationshipLabel: string
  tone: FactionViewTone
  summary: string
}

export interface FactionSummaryCardView {
  id: string
  name: string
  description: string
  postureLabel: string
  postureTone: FactionViewTone
  standingLabel: string
  standingTone: FactionViewTone
  stanceLabel: string
  stanceTone: FactionViewTone
  overview: string
  metrics: FactionPageMetricView[]
  contractSummary: string
  contractDetails: string[]
  modifierSummary: string
  modifierDetails: string[]
  hiddenSummary: string
  contacts: FactionContactSummaryView[]
  historySummary: string
  historyItems: FactionRecentActivityView[]
  loreItems: string[]
  benefitItems: string[]
}
  // --- Year 2 Expansion: Faction/Recon Variety ---
  // Additional faction summary cards for new standing-driven opportunities and recon patterns
  export const YEAR2_FACTION_VARIETY: FactionSummaryCardView[] = [
    {
      id: 'oversight-psi-recon',
      name: 'Oversight Psi Recon',
      description: 'Oversight is deploying psi-specialists for deep recon in high-risk containment zones. Successful operations unlock new research and standing bonuses.',
      postureLabel: 'Psi Recon',
      postureTone: 'info',
      standingLabel: 'Strategic',
      standingTone: 'success',
      stanceLabel: 'Supportive',
      stanceTone: 'info',
      overview: 'Psi recon operations open new contract chains and research unlocks for high-standing teams.',
      metrics: [
        { label: 'Psi Ops', value: 'Active' },
        { label: 'Standing Bonus', value: '+2' },
      ],
      contractSummary: 'Psi recon contracts available',
      contractDetails: ['Blacksite Recon Sweep', 'Psi Escalation — Cognitive Breach'],
      modifierSummary: 'Standing-driven bonuses',
      modifierDetails: ['Research unlocks', 'Reduced injury risk'],
      hiddenSummary: '',
      contacts: [],
      historySummary: 'Recent psi recon deployments',
      historyItems: [
        { id: 'psi-1', title: 'Psi Recon Success', detail: 'Unlocked new research', tone: 'success' },
      ],
      loreItems: ['Psi recon is a new standing-driven opportunity for high-trust teams.'],
      benefitItems: ['Research unlocks', 'Standing bonuses'],
    },
    {
      id: 'institutions-ritual-support',
      name: 'Institutions Ritual Support',
      description: 'Academic partners are offering ritual support contracts for teams with high standing. Recon reveals new opportunities and risks.',
      postureLabel: 'Ritual Support',
      postureTone: 'info',
      standingLabel: 'Allied',
      standingTone: 'success',
      stanceLabel: 'Collaborative',
      stanceTone: 'info',
      overview: 'Ritual support contracts and recon reveal new standing-driven opportunities.',
      metrics: [
        { label: 'Ritual Ops', value: 'Available' },
        { label: 'Standing Bonus', value: '+1' },
      ],
      contractSummary: 'Ritual archive recovery contracts',
      contractDetails: ['Ritual Archive Recovery'],
      modifierSummary: 'Standing-driven bonuses',
      modifierDetails: ['Unlocks occult contracts', 'Material rewards'],
      hiddenSummary: '',
      contacts: [],
      historySummary: 'Recent ritual support deployments',
      historyItems: [
        { id: 'ritual-1', title: 'Ritual Support Success', detail: 'Unlocked occult contracts', tone: 'success' },
      ],
      loreItems: ['Ritual support is a new standing-driven opportunity for allied teams.'],
      benefitItems: ['Occult contracts', 'Material rewards'],
    },
  ]
  // --- End Year 2 Expansion ---

export interface FactionPageView {
  summary: string
  metrics: FactionPageMetricView[]
  recentActivity: FactionRecentActivityView[]
  factions: FactionSummaryCardView[]
  links: Array<{
    label: string
    href: string
    description: string
  }>
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatSigned(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`
}

function capitalize(value: string) {
  return value.length > 0 ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value
}

function uniqueBounded(values: string[], limit: number) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].slice(0, limit)
}

function mapEventTone(tone: EventFeedTone): FactionViewTone {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'info'
}

function getReputationTone(reputationTier: FactionState['reputationTier']): FactionViewTone {
  if (reputationTier === 'hostile') {
    return 'danger'
  }

  if (reputationTier === 'unfriendly') {
    return 'warning'
  }

  if (reputationTier === 'allied') {
    return 'success'
  }

  if (reputationTier === 'friendly') {
    return 'info'
  }

  return 'neutral'
}

function getStanceTone(stance: FactionState['stance']): FactionViewTone {
  if (stance === 'hostile') {
    return 'danger'
  }

  if (stance === 'supportive') {
    return 'success'
  }

  return 'warning'
}

function getPostureTone(faction: Pick<FactionState, 'stance' | 'reputationTier'>): FactionViewTone {
  if (faction.reputationTier === 'hostile') {
    return 'danger'
  }

  return getStanceTone(faction.stance)
}

function getContactTone(contact: Pick<Contact, 'status' | 'relationship'>): FactionViewTone {
  if (contact.status === 'hostile') {
    return 'danger'
  }

  if (contact.status === 'inactive') {
    return 'warning'
  }

  return contact.relationship >= 15 ? 'success' : 'info'
}

function getContactRecentActivity(game: GameState, factionId: string, contactId: string) {
  const matchingEvents = game.events
    .filter((event) => matchesFactionEvent(event, factionId, contactId))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))

  return {
    count: matchingEvents.length,
    latestTimestamp: matchingEvents[0]?.timestamp ?? '',
  }
}

function getContactImpactScore(contact: Contact) {
  return (
    (contact.rewards?.length ?? 0) * 3 +
    (contact.modifiers?.length ?? 0) * 2 +
    (contact.focusTags?.length ?? 0)
  )
}

function getContactStatusPriority(status: Contact['status']) {
  if (status === 'active') return 0
  if (status === 'inactive') return 1
  return 2
}

function getContactSummary(
  contact: Contact,
  options?: {
    recentInteractionCount?: number
  }
) {
  const recentInteractionCount = options?.recentInteractionCount ?? 0

  return uniqueBounded(
    [
      recentInteractionCount > 0
        ? `${pluralize(recentInteractionCount, 'recent channel event')} still shape this contact.`
        : '',
      contact.focusTags && contact.focusTags.length > 0
        ? `Focus: ${contact.focusTags.slice(0, 2).join(', ')}.`
        : '',
      contact.modifiers && contact.modifiers.length > 0
        ? `Effects: ${contact.modifiers.slice(0, 2).map((modifier) => modifier.label).join(', ')}.`
        : '',
      contact.rewards && contact.rewards.length > 0
        ? `Rewards: ${contact.rewards.slice(0, 2).map((reward) => reward.label).join(', ')}.`
        : '',
      contact.history.interactions.length > 0
        ? `${pluralize(contact.history.interactions.length, 'logged interaction')} tied to this channel.`
        : '',
    ],
    2
  ).join(' ')
}

function matchesFactionEvent(
  event: OperationEvent,
  factionId: string,
  contactId?: string
) {
  const payload = event.payload as { factionId?: string; contactId?: string } | undefined

  if (payload?.factionId !== factionId) {
    return false
  }

  if (contactId) {
    return payload.contactId === contactId
  }

  return true
}

function buildRecentActivityViews(events: OperationEvent[]) {
  return events
    .slice()
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .map((event) => buildEventFeedView(event))
    .slice(0, MAX_HISTORY)
    .map((view) => ({
      id: view.event.id,
      title: view.title,
      detail: view.detail,
      tone: mapEventTone(view.tone),
      ...(view.href ? { href: view.href } : {}),
    }))
}

function buildFactionRecentActivity(game: GameState, faction: FactionState) {
  const referencedIds = new Set(faction.history.interactionLog.map((entry) => entry.eventId))
  const explicitEvents = game.events.filter((event) => referencedIds.has(event.id))
  const derivedEvents = game.events.filter((event) => matchesFactionEvent(event, faction.id))
  const combined = [...explicitEvents, ...derivedEvents].filter(
    (event, index, all) => all.findIndex((candidate) => candidate.id === event.id) === index
  )

  return buildRecentActivityViews(combined)
}

function buildFactionContractSummary(
  faction: FactionState,
  contractsByFactionId: Map<
    string,
    {
      available: number
      locked: number
      active: number
    }
  >
) {
  const contractState = contractsByFactionId.get(faction.id) ?? {
    available: 0,
    locked: 0,
    active: 0,
  }

  return {
    summary:
      contractState.available > 0 || contractState.locked > 0 || contractState.active > 0
        ? `${pluralize(contractState.available, 'live contract channel')}, ${pluralize(
            contractState.locked,
            'blocked chain'
          )}, ${pluralize(contractState.active, 'active deployment')} tied to this faction.`
        : 'No current contract board channels are directly tied to this faction.',
    details: uniqueBounded(
      [
        faction.feedback,
        faction.opportunities.length > 0
          ? `Openings: ${faction.opportunities.slice(0, 2).map((entry) => entry.label).join(', ')}.`
          : '',
        faction.reasons.length > 0
          ? `Current drivers: ${faction.reasons.slice(0, 2).join(', ')}.`
          : '',
      ],
      3
    ),
  }
}

function buildModifierSummary(faction: FactionState) {
  const visible = faction.knownModifiers.slice(0, MAX_EFFECTS)
  const modifierSummary =
    visible.length > 0
      ? `Known effects: ${visible.map((modifier) => modifier.label).join(', ')}.`
      : 'No faction effects are currently confirmed.'

  return {
    modifierSummary,
    modifierDetails: uniqueBounded(
      visible.map((modifier) => `${modifier.label}: ${modifier.description}`),
      MAX_EFFECTS
    ),
    hiddenSummary:
      faction.hiddenModifierCount > 0
        ? `Unknown influence detected: ${pluralize(faction.hiddenModifierCount, 'hidden effect')} remain unrevealed. More interaction or intel can confirm them.`
        : 'No unresolved hidden influences remain.',
  }
}

function buildBenefitItems(faction: FactionState) {
  return uniqueBounded(
    [
      ...faction.availableFavors
        .slice(0, 2)
        .map((entry) => `${entry.label} x${entry.count} banked.`),
      ...faction.recruitUnlocks
        .slice(0, MAX_RECRUIT_CHANNELS)
        .map((unlock) => `${unlock.label}${unlock.contactName ? ` via ${unlock.contactName}` : ''}.`),
    ],
    4
  )
}

function buildFactionCardView(
  game: GameState,
  faction: FactionState,
  contractsByFactionId: Map<
    string,
    {
      available: number
      locked: number
      active: number
    }
  >
): FactionSummaryCardView {
  const recentActivity = buildFactionRecentActivity(game, faction)
  const contractSummary = buildFactionContractSummary(faction, contractsByFactionId)
  const modifierSummary = buildModifierSummary(faction)
  const rankedContacts = faction.contacts
    .slice()
    .sort((left, right) => {
      const leftRecent = getContactRecentActivity(game, faction.id, left.id)
      const rightRecent = getContactRecentActivity(game, faction.id, right.id)
      const leftRecentCount = Math.max(left.history.interactions.length, leftRecent.count)
      const rightRecentCount = Math.max(right.history.interactions.length, rightRecent.count)

      return (
        getContactStatusPriority(left.status) - getContactStatusPriority(right.status) ||
        getContactImpactScore(right) - getContactImpactScore(left) ||
        rightRecentCount - leftRecentCount ||
        rightRecent.latestTimestamp.localeCompare(leftRecent.latestTimestamp) ||
        right.relationship - left.relationship ||
        left.name.localeCompare(right.name)
      )
    })

  return {
    id: faction.id,
    name: faction.label,
    description: faction.description,
    postureLabel: `${capitalize(faction.stance)} / ${capitalize(faction.reputationTier)}`,
    postureTone: getPostureTone(faction),
    standingLabel: `${capitalize(faction.reputationTier)} standing`,
    standingTone: getReputationTone(faction.reputationTier),
    stanceLabel: `${capitalize(faction.stance)} posture`,
    stanceTone: getStanceTone(faction.stance),
    overview: `${faction.label} is currently ${faction.reputationTier} with standing ${formatSigned(
      faction.standing
    )} and pressure ${faction.pressureScore}.`,
    metrics: [
      { label: 'Reputation', value: formatSigned(faction.reputation) },
      { label: 'Standing', value: formatSigned(faction.standing) },
      { label: 'Success rate', value: `${faction.history.successRate.toFixed(0)}%` },
      {
        label: 'Mission history',
        value: `${faction.history.missionsCompleted}/${faction.history.missionsFailed}`,
      },
    ],
    contractSummary: contractSummary.summary,
    contractDetails: contractSummary.details,
    modifierSummary: modifierSummary.modifierSummary,
    modifierDetails: modifierSummary.modifierDetails,
    hiddenSummary: modifierSummary.hiddenSummary,
    contacts: rankedContacts.slice(0, MAX_CONTACTS).map((contact) => {
      const recentActivity = getContactRecentActivity(game, faction.id, contact.id)
      const recentInteractionCount = Math.max(contact.history.interactions.length, recentActivity.count)

      return {
        id: contact.id,
        name: contact.name,
        role: contact.role,
        relationshipLabel: `${formatSigned(contact.relationship)} / ${contact.status}`,
        tone: getContactTone(contact),
        summary:
          getContactSummary(contact, { recentInteractionCount }) ||
          'No additional rewards or effect references are currently exposed for this contact.',
      }
    }),
    historySummary:
      recentActivity.length > 0
        ? `${pluralize(recentActivity.length, 'recent faction event')} are available for review.`
        : `${pluralize(
            faction.history.missionsCompleted + faction.history.missionsFailed,
            'recorded interaction'
          )} in campaign history so far.`,
    historyItems: recentActivity,
    loreItems: uniqueBounded(
      [
        ...faction.lore.discovered.slice(0, MAX_LORE).map((entry) => `${entry.label}: ${entry.summary}`),
        faction.lore.remainingCount > 0
          ? `${pluralize(faction.lore.remainingCount, 'lore thread')} remain undiscovered.`
          : '',
      ],
      MAX_LORE + 1
    ),
    benefitItems: buildBenefitItems(faction),
  }
}

export function getFactionPageView(game: GameState): FactionPageView {
  const factions = buildFactionStates(game)
  const contractCatalog = getContractCatalogEntries(game)
  const contractsByFactionId = new Map<
    string,
    {
      available: number
      locked: number
      active: number
    }
  >()

  for (const entry of contractCatalog) {
    if (!entry.factionId) {
      continue
    }

    const current = contractsByFactionId.get(entry.factionId) ?? {
      available: 0,
      locked: 0,
      active: 0,
    }

    if (entry.availabilityState === 'available') {
      current.available += 1
    } else if (entry.availabilityState === 'locked') {
      current.locked += 1
    } else if (entry.availabilityState === 'active') {
      current.active += 1
    }

    contractsByFactionId.set(entry.factionId, current)
  }

  const hostileCount = factions.filter(
    (faction) => faction.stance === 'hostile' || faction.reputationTier === 'hostile'
  ).length
  const activeContacts = factions.reduce(
    (sum, faction) => sum + faction.contacts.filter((contact) => contact.status === 'active').length,
    0
  )
  const hiddenEffects = factions.reduce((sum, faction) => sum + faction.hiddenModifierCount, 0)
  const positiveChannels = factions.reduce((sum, faction) => sum + faction.availableFavors.length, 0)

  return {
    summary:
      hostileCount > 0
        ? `${pluralize(factions.length, 'tracked faction')}, ${pluralize(
            hostileCount,
            'hostile posture'
          )}, and ${pluralize(hiddenEffects, 'unresolved hidden effect')} are shaping current contract and campaign posture.`
        : `${pluralize(factions.length, 'tracked faction')} with ${pluralize(
            activeContacts,
            'active contact channel'
          )} and ${pluralize(hiddenEffects, 'unresolved hidden effect')} feeding current campaign posture.`,
    metrics: [
      { label: 'Tracked factions', value: String(factions.length) },
      { label: 'Hostile postures', value: String(hostileCount) },
      { label: 'Active contacts', value: String(activeContacts) },
      { label: 'Open favors', value: String(positiveChannels) },
    ],
    recentActivity: buildRecentActivityViews(
      game.events.filter((event) => {
        const payload = event.payload as { factionId?: string } | undefined
        return event.type.startsWith('faction.') || Boolean(payload?.factionId)
      })
    ),
    factions: factions.map((faction) => buildFactionCardView(game, faction, contractsByFactionId)),
    links: [
      {
        label: 'Open contracts',
        href: APP_ROUTES.contracts,
        description: 'Review live faction-linked contract channels and blockers.',
      },
      {
        label: 'Open recruitment',
        href: APP_ROUTES.recruitment,
        description: 'Inspect faction-backed recruitment channels and sponsored leads.',
      },
      {
        label: 'Open reports',
        href: APP_ROUTES.report,
        description: 'Review weekly notes and operation history.',
      },
    ],
  }
}
