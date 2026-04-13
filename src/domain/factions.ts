// cspell:words caligo halden kincaid lockdowns march reid varga vell
import { inventoryItemLabels } from '../data/production'
import { clamp } from './math'
import type {
  CaseInstance,
  Contact,
  ContactStatus,
  EventRef,
  Faction,
  FactionModifier,
  FactionReward,
  GameState,
  MissionResolutionKind,
  MissionRewardInventoryGrant,
  OperationEvent,
  ReputationTier,
} from './models'

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

export interface FactionMissionContext {
  scoreAdjustment: number
  reasons: string[]
  matches: Array<{
    factionId: string
    factionName: string
    contactId?: string
    contactName?: string
  }>
}

export interface FactionOutcomeGrantSummary {
  fundingFlat: number
  inventoryRewards: MissionRewardInventoryGrant[]
  favorGrants: Array<{
    factionId: string
    rewardId: string
    label: string
  }>
  recruitUnlocks: FactionRecruitUnlock[]
  reasons: string[]
  grants: Array<{
    factionId: string
    contactId?: string
    kind: 'funding' | 'inventory' | 'favor'
    rewardId?: string
    label: string
    amount?: number
    itemId?: string
    quantity?: number
  }>
}

export interface FactionRecruitUnlock {
  factionId: string
  factionName: string
  contactId?: string
  contactName?: string
  rewardId: string
  label: string
  summary: string
  minTier: ReputationTier
  maxTier?: ReputationTier
  disposition: 'supportive' | 'adversarial'
}

export interface FactionState {
  id: string
  name: string
  label: string
  description: string
  category: FactionDefinition['category']
  reputation: number
  reputationTier: ReputationTier
  standing: number
  pressureScore: number
  stance: 'supportive' | 'contested' | 'hostile'
  matchingCases: number
  reasons: string[]
  feedback: string
  influenceModifiers: FactionInfluenceModifiers
  opportunities: FactionOpportunity[]
  knownModifiers: FactionModifier[]
  hiddenModifierCount: number
  contacts: Contact[]
  history: {
    missionsCompleted: number
    missionsFailed: number
    successRate: number
    interactionLog: EventRef[]
  }
  stateFlags: Faction['stateFlags']
  lore: {
    discovered: Array<{
      id: string
      label: string
      summary: string
    }>
    remainingCount: number
  }
  availableFavors: Array<{
    id: string
    label: string
    count: number
  }>
  recruitUnlocks: FactionRecruitUnlock[]
}

const STANDING_MIN = -20
const STANDING_MAX = 20
const FACTION_PRESSURE_THRESHOLD_BASE = 140
const CONTACT_HOSTILE_THRESHOLD = -50
const CONTACT_INACTIVE_THRESHOLD = -5
const CONTACT_SUPPORTIVE_UNLOCK_THRESHOLD = 15
const CONTACT_ADVERSARIAL_UNLOCK_THRESHOLD = -15
const REPUTATION_TIER_ORDER: ReputationTier[] = [
  'hostile',
  'unfriendly',
  'neutral',
  'friendly',
  'allied',
]
const FACTION_MODIFIER_EFFECTS: readonly FactionModifier['effect'][] = [
  'reward_multiplier',
  'success_bonus',
  'funding_flat',
  'favor_gain',
  'recruit_quality',
]
const FACTION_REWARD_KINDS: readonly FactionReward['kind'][] = ['funding', 'gear', 'favor', 'recruit']

type FactionProfile = {
  description: string
  supportiveMissionTags: string[]
  hostileMissionTags: string[]
  knownModifiers: FactionModifier[]
  hiddenModifiers: FactionModifier[]
  contacts: Array<
    Omit<Contact, 'factionId' | 'relationship' | 'status' | 'history'> & {
      rewards?: FactionReward[]
      modifiers?: FactionModifier[]
    }
  >
  loreEntries: Array<{
    id: string
    label: string
    summary: string
    unlockAfterInteractions: number
  }>
  tierRewards: FactionReward[]
}

export const FACTION_REPUTATION_THRESHOLDS = {
  hostile: -75,
  unfriendly: -25,
  friendly: 25,
  allied: 75,
} as const

export const FACTION_DEFINITIONS: readonly FactionDefinition[] = [
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

function reward(
  id: string,
  label: string,
  description: string,
  kind: FactionReward['kind'],
  minTier: ReputationTier,
  extras: Partial<FactionReward> = {}
): FactionReward {
  return {
    id,
    label,
    description,
    kind,
    minTier,
    disposition: 'supportive',
    ...extras,
  }
}

function modifier(
  id: string,
  label: string,
  description: string,
  effect: FactionModifier['effect'],
  value: number,
  tags: string[]
): FactionModifier {
  return { id, label, description, effect, value, tags }
}

const FACTION_PROFILE_MAP: Record<string, FactionProfile> = {
  oversight: {
    description:
      'Executive containment auditors and emergency authorizers who can accelerate or choke critical site response.',
    supportiveMissionTags: ['containment', 'critical', 'perimeter', 'breach'],
    hostileMissionTags: ['classified', 'cyber', 'information', 'breach'],
    knownModifiers: [
      modifier(
        'oversight-rapid-authorizations',
        'Rapid authorizations',
        'Improves mission payouts on perimeter and breach incidents.',
        'reward_multiplier',
        0.08,
        ['containment', 'critical', 'infrastructure', 'perimeter', 'breach']
      ),
    ],
    hiddenModifiers: [
      modifier(
        'oversight-audit-shadow',
        'Audit shadow',
        'Quiet scrutiny undermines classified response work when trust collapses.',
        'success_bonus',
        -3,
        ['classified', 'cyber', 'information']
      ),
    ],
    contacts: [
      {
        id: 'oversight-march',
        name: 'Evelyn March',
        role: 'Deputy director',
        focusTags: ['containment', 'perimeter', 'breach'],
        modifiers: [
          modifier(
            'oversight-march-rapid-clearance',
            'Rapid clearance',
            'March accelerates cleaner containment and perimeter operations when relations hold.',
            'reward_multiplier',
            0.04,
            ['containment', 'perimeter', 'breach']
          ),
        ],
        rewards: [
          reward(
            'oversight-waiver',
            'Executive waiver',
            'Bank a one-use favor from the executive office.',
            'favor',
            'friendly'
          ),
        ],
      },
      {
        id: 'oversight-reid',
        name: 'Anton Reid',
        role: 'Containment marshal',
        focusTags: ['critical', 'containment', 'raid'],
        modifiers: [
          modifier(
            'oversight-reid-hardline',
            'Hardline briefings',
            'Reid improves execution against breach-heavy incidents when he backs the agency.',
            'success_bonus',
            1,
            ['critical', 'containment', 'raid', 'breach']
          ),
        ],
        rewards: [
          reward(
            'oversight-marshal-referral',
            'Marshal referral',
            'Unlocks a vetted containment-oriented recruit.',
            'recruit',
            'allied'
          ),
        ],
      },
    ],
    loreEntries: [
      {
        id: 'oversight-lore-audit',
        label: 'Audit ladder',
        summary:
          'The bureau splits between public compliance staff and sealed-response directors who appear only after major breaches.',
        unlockAfterInteractions: 2,
      },
      {
        id: 'oversight-lore-board',
        label: 'Emergency board',
        summary:
          'A closed emergency board can overrule normal containment posture when the bureau decides the optics are irrecoverable.',
        unlockAfterInteractions: 5,
      },
    ],
    tierRewards: [
      reward(
        'oversight-stipend',
        'Oversight stipend',
        'Executive budget stipend for clean containment performance.',
        'funding',
        'friendly',
        { amount: 4 }
      ),
      reward(
        'oversight-seals',
        'Containment seal allotment',
        'Emergency ward seal allocation.',
        'gear',
        'allied',
        { itemId: 'ward_seals', quantity: 1 }
      ),
    ],
  },
  institutions: {
    description:
      'Academic partners, archives, and clinics that shape witness access, evidence handling, and research tempo.',
    supportiveMissionTags: ['archive', 'campus', 'research', 'analysis', 'witness'],
    hostileMissionTags: ['combat', 'raid', 'threat', 'witness'],
    knownModifiers: [
      modifier(
        'institutions-peer-review',
        'Peer review network',
        'Improves success odds on research and witness-heavy incidents.',
        'success_bonus',
        2,
        ['archive', 'campus', 'research', 'analysis', 'witness']
      ),
    ],
    hiddenModifiers: [
      modifier(
        'institutions-ethics-freeze',
        'Ethics freeze',
        'Administrative hesitation quietly suppresses violent solutions near partner institutions.',
        'reward_multiplier',
        -0.06,
        ['combat', 'raid', 'threat']
      ),
    ],
    contacts: [
      {
        id: 'institutions-halden',
        name: 'Miren Halden',
        role: 'Research chair',
        focusTags: ['analysis', 'research', 'archive'],
        modifiers: [
          modifier(
            'institutions-halden-peer-channel',
            'Peer channel',
            'Halden routes evidence and peer review through trusted research channels.',
            'success_bonus',
            1.5,
            ['analysis', 'research', 'archive']
          ),
        ],
        rewards: [
          reward(
            'institutions-fellowship',
            'Research fellowship',
            'Unlocks a research-backed recruit with stronger investigation upside.',
            'recruit',
            'friendly'
          ),
        ],
      },
      {
        id: 'institutions-vell',
        name: 'Jonah Vell',
        role: 'Archive custodian',
        focusTags: ['witness', 'archive', 'campus'],
        modifiers: [
          modifier(
            'institutions-vell-catalog-access',
            'Catalog access',
            'Vell improves archive and witness recoveries when the channel stays warm.',
            'reward_multiplier',
            0.03,
            ['witness', 'archive', 'campus']
          ),
        ],
      },
    ],
    loreEntries: [
      {
        id: 'institutions-lore-catalog',
        label: 'Shadow catalog',
        summary:
          'Partner archives maintain a hidden ledger of impossible findings that never enters public research channels.',
        unlockAfterInteractions: 2,
      },
      {
        id: 'institutions-lore-donors',
        label: 'Endowment pressures',
        summary:
          'Several institutions are protected by donors who care more about anomaly ownership than public safety.',
        unlockAfterInteractions: 5,
      },
    ],
    tierRewards: [
      reward(
        'institutions-sensor-grant',
        'Lab sensor grant',
        'Partner labs route advanced sensors into your inventory rewards.',
        'gear',
        'friendly',
        { itemId: 'emf_sensors', quantity: 1 }
      ),
    ],
  },
  occult_networks: {
    description:
      'Esoteric brokers, ward-smugglers, and ritual intermediaries who can surface leads or quietly tilt anomaly responses.',
    supportiveMissionTags: ['occult', 'anomaly', 'spirit', 'reliquary'],
    hostileMissionTags: ['cult', 'ritual', 'haunt', 'critical'],
    knownModifiers: [
      modifier(
        'occult-esoteric-leads',
        'Esoteric leads',
        'Improves payouts on ritual and anomaly incidents.',
        'reward_multiplier',
        0.1,
        ['occult', 'ritual', 'cult', 'spirit', 'anomaly']
      ),
    ],
    hiddenModifiers: [
      modifier(
        'occult-blood-price',
        'Blood price',
        'Occult favors quietly raise risk around public-facing incidents.',
        'success_bonus',
        -2,
        ['critical', 'witness', 'campus']
      ),
    ],
    contacts: [
      {
        id: 'occult-caligo',
        name: 'Seraphine Caligo',
        role: 'Veil broker',
        focusTags: ['occult', 'ritual', 'spirit'],
        modifiers: [
          modifier(
            'occult-caligo-veil-map',
            'Veil map',
            'Caligo improves occult routes and ritual payouts while she stays engaged.',
            'reward_multiplier',
            0.05,
            ['occult', 'ritual', 'spirit']
          ),
        ],
        rewards: [
          reward(
            'occult-broker-favor',
            'Brokered ward',
            'Bank a one-use occult favor.',
            'favor',
            'friendly'
          ),
        ],
      },
      {
        id: 'occult-nem',
        name: 'Nem Vireo',
        role: 'Circle mediator',
        focusTags: ['cult', 'anomaly', 'haunt'],
        modifiers: [
          modifier(
            'occult-nem-circle-signal',
            'Circle signal',
            'Nem sharpens anomaly handling when the circle is still aligned.',
            'success_bonus',
            1.5,
            ['cult', 'anomaly', 'haunt']
          ),
        ],
        rewards: [
          reward(
            'occult-medium-referral',
            'Circle referral',
            'Unlocks a specialist recruit with stronger anomaly handling.',
            'recruit',
            'allied'
          ),
          reward(
            'occult-embedded-acolyte',
            'Embedded acolyte',
            'A likely infiltrator with occult access surfaces through hostile channels.',
            'recruit',
            'hostile',
            {
              maxTier: 'unfriendly',
              disposition: 'adversarial',
            }
          ),
        ],
      },
    ],
    loreEntries: [
      {
        id: 'occult-lore-ledger',
        label: 'Ritual ledger',
        summary:
          'The largest occult networks track debts as carefully as rites; every favor has a ledger entry.',
        unlockAfterInteractions: 2,
      },
      {
        id: 'occult-lore-shards',
        label: 'Shard market',
        summary:
          'Occult brokers move relic fragments through a shard market shared with academic and covert buyers.',
        unlockAfterInteractions: 5,
      },
    ],
    tierRewards: [
      reward(
        'occult-kit-allotment',
        'Warding kit allotment',
        'Occult allies route prepared ritual gear into mission rewards.',
        'gear',
        'friendly',
        { itemId: 'warding_kits', quantity: 1 }
      ),
    ],
  },
  corporate_supply: {
    description:
      'Procurement brokers and logistics contractors who influence field gear quality, delivery tempo, and vendor access.',
    supportiveMissionTags: ['logistics', 'signal', 'hazmat', 'chemical'],
    hostileMissionTags: ['chemical', 'biological', 'hazmat', 'logistics'],
    knownModifiers: [
      modifier(
        'supply-preferred-vendor',
        'Preferred vendor status',
        'Improves payout efficiency across logistics-heavy incidents.',
        'reward_multiplier',
        0.09,
        ['chemical', 'biological', 'hazmat', 'signal', 'logistics']
      ),
    ],
    hiddenModifiers: [
      modifier(
        'supply-lockout',
        'Vendor lockout',
        'Supply retaliation penalizes mission certainty when chain pressure spikes.',
        'success_bonus',
        -2,
        ['chemical', 'biological', 'signal', 'logistics']
      ),
    ],
    contacts: [
      {
        id: 'supply-varga',
        name: 'Inez Varga',
        role: 'Quartermaster liaison',
        focusTags: ['logistics', 'signal', 'hazmat'],
        modifiers: [
          modifier(
            'supply-varga-expedite-lane',
            'Expedite lane',
            'Varga accelerates clean logistics and signal deployments for trusted teams.',
            'reward_multiplier',
            0.04,
            ['logistics', 'signal', 'hazmat']
          ),
        ],
        rewards: [
          reward(
            'supply-expedite',
            'Expedite token',
            'Bank a vendor favor for future logistics leverage.',
            'favor',
            'friendly'
          ),
        ],
      },
      {
        id: 'supply-rowe',
        name: 'Malik Rowe',
        role: 'Contract broker',
        focusTags: ['chemical', 'biological', 'logistics'],
        modifiers: [
          modifier(
            'supply-rowe-brokerage',
            'Brokerage leverage',
            'Rowe improves chain-heavy field work while his contracts stay active.',
            'success_bonus',
            1,
            ['chemical', 'biological', 'logistics']
          ),
        ],
        rewards: [
          reward(
            'supply-engineer-referral',
            'Contract engineer referral',
            'Unlocks a supply-backed recruit from vendor field programs.',
            'recruit',
            'allied'
          ),
          reward(
            'supply-vendor-plant',
            'Vendor plant',
            'An embedded contractor appears when supply relations turn openly adversarial.',
            'recruit',
            'hostile',
            {
              maxTier: 'unfriendly',
              disposition: 'adversarial',
            }
          ),
        ],
      },
    ],
    loreEntries: [
      {
        id: 'supply-lore-triage',
        label: 'Silent triage',
        summary:
          'Major suppliers quietly triage which sites receive the best equipment based on internal risk ledgers.',
        unlockAfterInteractions: 2,
      },
      {
        id: 'supply-lore-auctions',
        label: 'After-hours auctions',
        summary:
          'Sensitive field gear circulates through invitation-only auctions shared with occult and covert buyers.',
        unlockAfterInteractions: 5,
      },
    ],
    tierRewards: [
      reward(
        'supply-sensor-crate',
        'Intercept crate',
        'Trusted vendors route signal-control gear into rewards.',
        'gear',
        'friendly',
        { itemId: 'signal_jammers', quantity: 1 }
      ),
      reward(
        'supply-medical-crate',
        'Medical reserve crate',
        'A reserve shipment of field medkits.',
        'gear',
        'allied',
        { itemId: 'medkits', quantity: 1 }
      ),
    ],
  },
  black_budget: {
    description:
      'Compartmentalized intelligence cells competing for intercepts, classified relics, and technical leverage.',
    supportiveMissionTags: ['cyber', 'relay', 'classified', 'tech'],
    hostileMissionTags: ['classified', 'information', 'tech', 'witness'],
    knownModifiers: [
      modifier(
        'blackbudget-intercepts',
        'Intercept access',
        'Improves outcome odds on cyber, relay, and classified operations.',
        'success_bonus',
        2,
        ['cyber', 'information', 'relay', 'classified', 'tech']
      ),
    ],
    hiddenModifiers: [
      modifier(
        'blackbudget-poaching',
        'Asset poaching',
        'Covert competition quietly suppresses payouts around archive and witness incidents.',
        'reward_multiplier',
        -0.07,
        ['archive', 'witness', 'research']
      ),
    ],
    contacts: [
      {
        id: 'blackbudget-kincaid',
        name: 'Dax Kincaid',
        role: 'Signals handler',
        focusTags: ['cyber', 'relay', 'signal'],
        modifiers: [
          modifier(
            'blackbudget-kincaid-intercepts',
            'Intercept routing',
            'Kincaid improves relay and cyber recoveries while his channel stays open.',
            'reward_multiplier',
            0.05,
            ['cyber', 'relay', 'signal']
          ),
        ],
        rewards: [
          reward(
            'blackbudget-intercept-favor',
            'Intercept authority',
            'Bank a covert intercept favor.',
            'favor',
            'friendly'
          ),
        ],
      },
      {
        id: 'blackbudget-ossian',
        name: 'Lena Ossian',
        role: 'Program broker',
        focusTags: ['classified', 'information', 'tech'],
        modifiers: [
          modifier(
            'blackbudget-ossian-brokerage',
            'Brokerage cell',
            'Ossian sharpens classified operations when she actively backs the agency.',
            'success_bonus',
            1.5,
            ['classified', 'information', 'tech']
          ),
        ],
        rewards: [
          reward(
            'blackbudget-operative-referral',
            'Intercept operative referral',
            'Unlocks a covert technical recruit.',
            'recruit',
            'allied'
          ),
          reward(
            'blackbudget-embedded-operative',
            'Embedded operative',
            'A black-budget operative appears through an adversarial channel with clear infiltration risk.',
            'recruit',
            'hostile',
            {
              maxTier: 'unfriendly',
              disposition: 'adversarial',
            }
          ),
        ],
      },
    ],
    loreEntries: [
      {
        id: 'blackbudget-lore-cells',
        label: 'Cell structure',
        summary:
          'Black-budget work is split across cells that rarely trust each other, which is why help from one contact often angers another.',
        unlockAfterInteractions: 2,
      },
      {
        id: 'blackbudget-lore-recoveries',
        label: 'Competing recoveries',
        summary:
          'Several programs care less about containment than about recovering anomalous signals before anyone else can catalog them.',
        unlockAfterInteractions: 5,
      },
    ],
    tierRewards: [
      reward(
        'blackbudget-stipend',
        'Covert retainer',
        'Classified performance retainer routed through sealed accounts.',
        'funding',
        'friendly',
        { amount: 5 }
      ),
      reward(
        'blackbudget-sensor-suite',
        'Spectral intercept suite',
        'Covert procurement routes advanced sensors into rewards.',
        'gear',
        'allied',
        { itemId: 'emf_sensors', quantity: 1 }
      ),
    ],
  },
}

function roundModifier(value: number) {
  return Number(value.toFixed(2))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function sanitizeEventRefs(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry) => ({
      eventId: typeof entry.eventId === 'string' ? entry.eventId : '',
      type: typeof entry.type === 'string' ? entry.type : undefined,
      week: typeof entry.week === 'number' ? Math.max(1, Math.trunc(entry.week)) : undefined,
    }))
    .filter((entry) => entry.eventId.length > 0)
}

function sanitizeCounter(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function sanitizeModifierList(value: unknown, fallback: readonly FactionModifier[] = []) {
  if (!Array.isArray(value)) {
    return cloneModifiers(fallback)
  }

  const sanitized = value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .flatMap((entry) => {
      if (
        typeof entry.id !== 'string' ||
        entry.id.length === 0 ||
        typeof entry.label !== 'string' ||
        entry.label.length === 0 ||
        typeof entry.description !== 'string' ||
        entry.description.length === 0 ||
        !FACTION_MODIFIER_EFFECTS.includes(entry.effect as FactionModifier['effect']) ||
        typeof entry.value !== 'number' ||
        !Number.isFinite(entry.value)
      ) {
        return []
      }

      return [
        {
          id: entry.id,
          label: entry.label,
          description: entry.description,
          effect: entry.effect as FactionModifier['effect'],
          value: entry.value,
          ...(Array.isArray(entry.tags) ? { tags: sanitizeStringList(entry.tags) } : {}),
        } satisfies FactionModifier,
      ]
    })

  return sanitized
}

function sanitizeRewardList(value: unknown, fallback: readonly FactionReward[] = []) {
  if (!Array.isArray(value)) {
    return cloneRewards(fallback)
  }

  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .flatMap((entry) => {
      if (
        typeof entry.id !== 'string' ||
        entry.id.length === 0 ||
        typeof entry.label !== 'string' ||
        entry.label.length === 0 ||
        typeof entry.description !== 'string' ||
        entry.description.length === 0 ||
        !FACTION_REWARD_KINDS.includes(entry.kind as FactionReward['kind']) ||
        !REPUTATION_TIER_ORDER.includes(entry.minTier as ReputationTier)
      ) {
        return []
      }

      if (
        entry.maxTier !== undefined &&
        !REPUTATION_TIER_ORDER.includes(entry.maxTier as ReputationTier)
      ) {
        return []
      }

      if (
        entry.disposition !== undefined &&
        entry.disposition !== 'supportive' &&
        entry.disposition !== 'adversarial'
      ) {
        return []
      }

      const amount =
        typeof entry.amount === 'number' && Number.isFinite(entry.amount) ? entry.amount : undefined
      const quantity =
        typeof entry.quantity === 'number' && Number.isFinite(entry.quantity)
          ? Math.max(0, Math.trunc(entry.quantity))
          : undefined

      return [
        {
          id: entry.id,
          label: entry.label,
          description: entry.description,
          kind: entry.kind as FactionReward['kind'],
          minTier: entry.minTier as ReputationTier,
          ...(entry.maxTier !== undefined ? { maxTier: entry.maxTier as ReputationTier } : {}),
          ...(entry.disposition !== undefined
            ? { disposition: entry.disposition as 'supportive' | 'adversarial' }
            : {}),
          ...(amount !== undefined ? { amount } : {}),
          ...(typeof entry.itemId === 'string' && entry.itemId.length > 0 ? { itemId: entry.itemId } : {}),
          ...(quantity !== undefined ? { quantity } : {}),
          ...(typeof entry.contactId === 'string' && entry.contactId.length > 0
            ? { contactId: entry.contactId }
            : {}),
        } satisfies FactionReward,
      ]
    })
}

function cloneModifiers(modifiers: readonly FactionModifier[]) {
  return modifiers.map((modifierEntry) => ({
    ...modifierEntry,
    ...(modifierEntry.tags ? { tags: [...modifierEntry.tags] } : {}),
  }))
}

function cloneRewards(rewards: readonly FactionReward[]) {
  return rewards.map((rewardEntry) => ({ ...rewardEntry }))
}

function buildFactionFromProfile(definition: FactionDefinition): Faction {
  const profile = FACTION_PROFILE_MAP[definition.id]

  return {
    id: definition.id,
    name: definition.name,
    description: profile.description,
    reputation: 0,
    reputationTier: 'neutral',
    modifiers: {
      known: cloneModifiers(profile.knownModifiers),
      hidden: cloneModifiers(profile.hiddenModifiers),
    },
    contacts: profile.contacts.map((contact) => ({
      ...contact,
      factionId: definition.id,
      relationship: 0,
      status: 'active' as const,
      ...(contact.focusTags ? { focusTags: [...contact.focusTags] } : {}),
      ...(contact.rewards ? { rewards: cloneRewards(contact.rewards) } : {}),
      ...(contact.modifiers ? { modifiers: cloneModifiers(contact.modifiers) } : {}),
      history: {
        interactions: [],
      },
    })),
    lore: {
      entries: profile.loreEntries.map((entry) => ({ ...entry })),
      discoveredEntryIds: [],
    },
    history: {
      missionsCompleted: 0,
      missionsFailed: 0,
      interactionLog: [],
      revealedHiddenModifierIds: [],
    },
    stateFlags: {
      isHostile: false,
      isUnlocked: true,
    },
    availableFavors: {},
  }
}

function clampFactionReputation(value: number) {
  return clamp(Math.round(value), -100, 100)
}

function clampContactRelationship(value: number) {
  return clamp(Math.round(value), -100, 100)
}

function computeSuccessRate(missionsCompleted: number, missionsFailed: number) {
  const total = missionsCompleted + missionsFailed
  return total === 0 ? 0 : Number(((missionsCompleted / total) * 100).toFixed(1))
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

export function getFactionReputationTier(reputation: number): ReputationTier {
  if (reputation <= FACTION_REPUTATION_THRESHOLDS.hostile) {
    return 'hostile'
  }

  if (reputation <= FACTION_REPUTATION_THRESHOLDS.unfriendly) {
    return 'unfriendly'
  }

  if (reputation >= FACTION_REPUTATION_THRESHOLDS.allied) {
    return 'allied'
  }

  if (reputation >= FACTION_REPUTATION_THRESHOLDS.friendly) {
    return 'friendly'
  }

  return 'neutral'
}

export function getContactStatus(relationship: number): ContactStatus {
  if (relationship <= CONTACT_HOSTILE_THRESHOLD) {
    return 'hostile'
  }

  if (relationship < CONTACT_INACTIVE_THRESHOLD) {
    return 'inactive'
  }

  return 'active'
}

export function createDefaultFactionStateMap() {
  return Object.fromEntries(
    FACTION_DEFINITIONS.map((definition) => [definition.id, buildFactionFromProfile(definition)])
  ) as Record<string, Faction>
}

export function sanitizeFactionStateMap(
  value: unknown,
  fallback = createDefaultFactionStateMap()
) {
  if (!isRecord(value)) {
    return fallback
  }

  const nextFactions = createDefaultFactionStateMap()

  for (const definition of FACTION_DEFINITIONS) {
    const rawFaction = value[definition.id]
    if (!isRecord(rawFaction)) {
      nextFactions[definition.id] = fallback[definition.id] ?? nextFactions[definition.id]
      continue
    }

    const base = nextFactions[definition.id]
    const reputation = clampFactionReputation(
      typeof rawFaction.reputation === 'number' ? rawFaction.reputation : base.reputation
    )
    const reputationTier = getFactionReputationTier(reputation)
    const rawContacts = Array.isArray(rawFaction.contacts) ? rawFaction.contacts : []

    nextFactions[definition.id] = {
      ...base,
      reputation,
      reputationTier,
      modifiers: {
        known: sanitizeModifierList(
          isRecord(rawFaction.modifiers) ? rawFaction.modifiers.known : [],
          base.modifiers.known
        ),
        hidden: sanitizeModifierList(
          isRecord(rawFaction.modifiers) ? rawFaction.modifiers.hidden : [],
          base.modifiers.hidden
        ),
      },
      contacts: base.contacts.map((contact) => {
        const rawContact = rawContacts.find(
          (entry) => isRecord(entry) && entry.id === contact.id
        ) as Record<string, unknown> | undefined
        const relationship = clampContactRelationship(
          typeof rawContact?.relationship === 'number' ? rawContact.relationship : contact.relationship
        )
        const rewards = sanitizeRewardList(rawContact?.rewards, contact.rewards ?? [])
        const modifiers = sanitizeModifierList(rawContact?.modifiers, contact.modifiers ?? [])
        return {
          ...contact,
          relationship,
          status:
            rawContact?.status === 'active' ||
            rawContact?.status === 'hostile' ||
            rawContact?.status === 'inactive'
              ? rawContact.status
              : getContactStatus(relationship),
          ...(Array.isArray(rawContact?.rewards) || contact.rewards
            ? { rewards }
            : {}),
          ...(Array.isArray(rawContact?.modifiers) || contact.modifiers
            ? { modifiers }
            : {}),
          history: {
            interactions: sanitizeEventRefs(
              isRecord(rawContact?.history) ? rawContact.history.interactions : []
            ),
          },
        }
      }),
      lore: {
        entries: base.lore.entries,
        discoveredEntryIds: sanitizeStringList(
          isRecord(rawFaction.lore) ? rawFaction.lore.discoveredEntryIds : []
        ).filter((entryId) => base.lore.entries.some((entry) => entry.id === entryId)),
      },
      history: {
        missionsCompleted: sanitizeCounter(
          isRecord(rawFaction.history) ? rawFaction.history.missionsCompleted : 0
        ),
        missionsFailed: sanitizeCounter(
          isRecord(rawFaction.history) ? rawFaction.history.missionsFailed : 0
        ),
        interactionLog: sanitizeEventRefs(
          isRecord(rawFaction.history) ? rawFaction.history.interactionLog : []
        ),
        revealedHiddenModifierIds: sanitizeStringList(
          isRecord(rawFaction.history) ? rawFaction.history.revealedHiddenModifierIds : []
        ).filter((entryId) => base.modifiers.hidden.some((entry) => entry.id === entryId)),
      },
      stateFlags: {
        isHostile: reputationTier === 'hostile',
        isUnlocked:
          isRecord(rawFaction.stateFlags) && typeof rawFaction.stateFlags.isUnlocked === 'boolean'
            ? rawFaction.stateFlags.isUnlocked
            : base.stateFlags.isUnlocked,
      },
      availableFavors: Object.fromEntries(
        Object.entries(isRecord(rawFaction.availableFavors) ? rawFaction.availableFavors : {}).flatMap(
          ([rewardId, count]) =>
            typeof count === 'number' && Number.isFinite(count) && count > 0
              ? [[rewardId, Math.max(0, Math.trunc(count))] as const]
              : []
        )
      ),
    }
  }

  return nextFactions
}

export function getFactionDefinition(factionId: string) {
  return FACTION_DEFINITIONS.find((faction) => faction.id === factionId) ?? null
}

export function getFactionDefinitionTags(factionId: string) {
  return getFactionDefinition(factionId)?.tags ?? []
}

export function buildFactionStandingMap(
  game: Pick<GameState, 'events'> & Partial<Pick<GameState, 'factions'>>
) {
  if (game.factions && Object.keys(game.factions).length > 0) {
    return Object.fromEntries(
      FACTION_DEFINITIONS.map((faction) => [
        faction.id,
        clamp(Math.round((game.factions?.[faction.id]?.reputation ?? 0) / 5), STANDING_MIN, STANDING_MAX),
      ])
    )
  }

  const standings = Object.fromEntries(FACTION_DEFINITIONS.map((faction) => [faction.id, 0]))
  const standingEvents = game.events.filter(
    (event): event is Extract<OperationEvent, { type: 'faction.standing_changed' }> =>
      event.type === 'faction.standing_changed'
  )

  if (standingEvents.length > 0) {
    for (const event of standingEvents) {
      standings[event.payload.factionId] = clamp(
        typeof event.payload.standingAfter === 'number'
          ? event.payload.standingAfter
          : (standings[event.payload.factionId] ?? 0) + event.payload.delta,
        STANDING_MIN,
        STANDING_MAX
      )
    }

    return standings
  }

  return buildStandingMapFromRewardEvents(game.events)
}

export function inferFactionIdFromCaseTags(
  source:
    | Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'> & Partial<Pick<CaseInstance, 'factionId'>>
    | {
        tags: string[]
        requiredTags?: string[]
        preferredTags?: string[]
        factionId?: string
      }
) {
  if (typeof source.factionId === 'string' && source.factionId.length > 0) {
    return source.factionId
  }

  const tags = collectCaseTags({
    tags: source.tags,
    requiredTags: source.requiredTags ?? [],
    preferredTags: source.preferredTags ?? [],
  })
  const bestMatch = FACTION_DEFINITIONS.map((faction) => ({
    factionId: faction.id,
    overlap: faction.tags.filter((tag) => tags.includes(tag)).length,
  }))
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap || left.factionId.localeCompare(right.factionId))
    .at(0)

  return bestMatch?.factionId
}

function getFactionRecord(
  game: Partial<Pick<GameState, 'factions'>>,
  factionId: string
) {
  return sanitizeFactionStateMap(game.factions ?? {})[factionId]
}

function getImplicitRevealCount(faction: Pick<Faction, 'history'>) {
  const total = getFactionInteractionProgressCount(faction)
  if (total >= 5) {
    return 2
  }

  if (total >= 2) {
    return 1
  }

  return 0
}

function getFactionInteractionProgressCount(faction: Pick<Faction, 'history'>) {
  const missionCount = faction.history.missionsCompleted + faction.history.missionsFailed
  const loggedInteractionCount = new Set(
    faction.history.interactionLog.map((entry) => entry.eventId)
  ).size

  return Math.max(missionCount, loggedInteractionCount)
}

function getRevealedHiddenModifierIds(faction: Faction) {
  const revealed = new Set(faction.history.revealedHiddenModifierIds)
  const implicitRevealCount = getImplicitRevealCount(faction)

  for (const modifierEntry of faction.modifiers.hidden.slice(0, implicitRevealCount)) {
    revealed.add(modifierEntry.id)
  }

  return revealed
}

function getVisibleFactionModifiers(faction: Faction) {
  const revealed = getRevealedHiddenModifierIds(faction)
  return [
    ...faction.modifiers.known,
    ...faction.modifiers.hidden.filter((modifierEntry) => revealed.has(modifierEntry.id)),
  ]
}

function getDiscoveredLoreEntries(faction: Faction) {
  const discoveredIds = new Set(faction.lore.discoveredEntryIds)
  const interactionCount = getFactionInteractionProgressCount(faction)

  for (const entry of faction.lore.entries) {
    if (interactionCount >= entry.unlockAfterInteractions) {
      discoveredIds.add(entry.id)
    }
  }

  return faction.lore.entries.filter((entry) => discoveredIds.has(entry.id))
}

function getAllFactionModifiers(faction: Faction, contact: Contact | null = null) {
  const contactModifiers =
    contact && contact.status === 'active' ? contact.modifiers ?? [] : []

  return [...faction.modifiers.known, ...faction.modifiers.hidden, ...contactModifiers]
}

function getModifierMatches(
  modifiers: readonly FactionModifier[],
  caseTags: readonly string[],
  effect: FactionModifier['effect']
) {
  return modifiers.filter(
    (modifierEntry) =>
      modifierEntry.effect === effect &&
      ((modifierEntry.tags?.length ?? 0) === 0 ||
        (modifierEntry.tags ?? []).some((tag) => caseTags.includes(tag)))
  )
}

function getRecruitmentModifierValue(
  modifiers: readonly FactionModifier[],
  effect: Extract<FactionModifier['effect'], 'recruit_quality'>
) {
  return modifiers
    .filter(
      (modifierEntry) =>
        modifierEntry.effect === effect &&
        ((modifierEntry.tags?.length ?? 0) === 0 ||
          (modifierEntry.tags ?? []).some((tag) => tag === 'recruit' || tag === 'recruitment'))
    )
    .reduce((sum, modifierEntry) => sum + modifierEntry.value, 0)
}

function getTierScoreAdjustment(tier: ReputationTier) {
  switch (tier) {
    case 'allied':
      return 2
    case 'friendly':
      return 1
    case 'unfriendly':
      return -1
    case 'hostile':
      return -2.5
    default:
      return 0
  }
}

function getContactScoreAdjustment(contact: Contact | null) {
  if (!contact) {
    return 0
  }

  if (contact.status === 'hostile') {
    return -2
  }

  if (contact.status === 'inactive') {
    return -0.5
  }

  return clamp(contact.relationship / 25, -2, 2)
}

function getContactRewardAdjustment(contact: Contact | null) {
  if (!contact) {
    return 0
  }

  if (contact.status === 'hostile') {
    return -0.03
  }

  if (contact.status === 'inactive') {
    return -0.01
  }

  return clamp(contact.relationship / 400, -0.04, 0.04)
}

function isTierAtLeast(current: ReputationTier, minimum: ReputationTier) {
  return REPUTATION_TIER_ORDER.indexOf(current) >= REPUTATION_TIER_ORDER.indexOf(minimum)
}

function isTierAtMost(current: ReputationTier, maximum: ReputationTier) {
  return REPUTATION_TIER_ORDER.indexOf(current) <= REPUTATION_TIER_ORDER.indexOf(maximum)
}

function isRewardTierEligible(
  tier: ReputationTier,
  rewardEntry: Pick<FactionReward, 'minTier' | 'maxTier'>
) {
  return (
    isTierAtLeast(tier, rewardEntry.minTier) &&
    (!rewardEntry.maxTier || isTierAtMost(tier, rewardEntry.maxTier))
  )
}

function isSupportiveContactEligible(contact: Contact | null) {
  return (
    contact === null ||
    (contact.status === 'active' && contact.relationship >= CONTACT_SUPPORTIVE_UNLOCK_THRESHOLD)
  )
}

function isAdversarialContactEligible(
  faction: Pick<Faction, 'reputationTier'>,
  contact: Contact | null
) {
  return (
    faction.reputationTier === 'hostile' ||
    faction.reputationTier === 'unfriendly' ||
    (contact !== null &&
      (contact.status === 'hostile' ||
        contact.relationship <= CONTACT_ADVERSARIAL_UNLOCK_THRESHOLD))
  )
}

function isRewardUnlockedForFaction(faction: Faction, contact: Contact | null, rewardEntry: FactionReward) {
  if (!isRewardTierEligible(faction.reputationTier, rewardEntry)) {
    return false
  }

  if (rewardEntry.disposition === 'adversarial') {
    return isAdversarialContactEligible(faction, contact)
  }

  if (rewardEntry.kind === 'recruit') {
    return isSupportiveContactEligible(contact)
  }

  return contact === null || contact.status === 'active'
}

function buildFactionInfluenceModifiers(
  standing: number,
  reputationTier: ReputationTier,
  pressureScore: number
): FactionInfluenceModifiers {
  const standingCaseBias =
    standing >= 8 ? -0.1 : standing >= 4 ? -0.05 : standing <= -8 ? 0.14 : standing <= -4 ? 0.08 : 0
  const tierCaseBias =
    reputationTier === 'allied'
      ? -0.05
      : reputationTier === 'friendly'
        ? -0.025
        : reputationTier === 'hostile'
          ? 0.07
          : reputationTier === 'unfriendly'
            ? 0.03
            : 0
  const pressureCaseBias = pressureScore >= 160 ? 0.08 : pressureScore >= 90 ? 0.04 : 0
  const caseGenerationWeight = roundModifier(
    clamp(1 + standingCaseBias + tierCaseBias + pressureCaseBias, 0.8, 1.35)
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
  const tierRewardBias =
    reputationTier === 'allied'
      ? 0.04
      : reputationTier === 'friendly'
        ? 0.02
        : reputationTier === 'hostile'
          ? -0.04
          : reputationTier === 'unfriendly'
            ? -0.02
            : 0
  const pressureRewardBias = pressureScore >= 160 ? -0.04 : pressureScore >= 90 ? -0.015 : 0
  const rewardModifier = roundModifier(
    clamp(standingRewardBias + tierRewardBias + pressureRewardBias, -0.18, 0.2)
  )

  const opportunityAccess = clamp(
    (standing >= 8 ? 3 : standing >= 4 ? 2 : standing <= -8 ? -2 : standing <= -4 ? -1 : 0) +
      (pressureScore >= 160 ? -1 : pressureScore < 50 && standing > 0 ? 1 : 0) +
      (reputationTier === 'allied' ? 1 : reputationTier === 'hostile' ? -1 : 0),
    -2,
    5
  )

  return {
    caseGenerationWeight,
    rewardModifier,
    opportunityAccess,
  }
}

function buildFactionOpportunities(
  faction: FactionDefinition,
  factionRecord: Faction,
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

  if (pressureScore >= 90 || factionRecord.reputationTier === 'hostile') {
    opportunities.push({
      id: `${faction.id}-pressure-window`,
      label: 'Pressure spike',
      detail: faction.hostileDetail,
      direction: 'negative',
    })
  }

  for (const [rewardId, count] of Object.entries(factionRecord.availableFavors ?? {})) {
    if (count <= 0) {
      continue
    }

    opportunities.push({
      id: `${faction.id}-${rewardId}`,
      label: 'Banked favor',
      detail: `${count} favor${count === 1 ? '' : 's'} ready through this channel.`,
      direction: 'positive',
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
  currentCase: Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'> &
    Partial<Pick<CaseInstance, 'factionId'>>,
  factionStates: readonly FactionState[]
) {
  const tags = collectCaseTags(currentCase)

  if (currentCase.factionId) {
    const explicitMatch = factionStates.find((factionState) => factionState.id === currentCase.factionId)

    if (explicitMatch) {
      return [
        {
          factionState: explicitMatch,
          overlapTags: getFactionDefinitionTags(explicitMatch.id).filter((tag) => tags.includes(tag)),
        },
      ]
    }
  }

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

function getFactionContactForCase(
  faction: Faction,
  currentCase: Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'> &
    Partial<Pick<CaseInstance, 'contactId'>>
) {
  if (currentCase.contactId) {
    const explicitContact = faction.contacts.find((contact) => contact.id === currentCase.contactId)
    if (explicitContact) {
      return explicitContact
    }
  }

  const tags = collectCaseTags(currentCase)

  return [...faction.contacts]
    .sort((left, right) => {
      const leftOverlap = (left.focusTags ?? []).filter((tag) => tags.includes(tag)).length
      const rightOverlap = (right.focusTags ?? []).filter((tag) => tags.includes(tag)).length
      return rightOverlap - leftOverlap || right.relationship - left.relationship
    })
    .at(0) ?? null
}

function buildInventoryGrant(itemId: string, quantity: number): MissionRewardInventoryGrant | null {
  if (quantity <= 0) {
    return null
  }

  return {
    kind: 'equipment',
    itemId,
    label: inventoryItemLabels[itemId] ?? itemId,
    quantity,
    tags: [itemId],
  }
}

function getEligibleRewards(faction: Faction, contact: Contact | null) {
  const profile = FACTION_PROFILE_MAP[faction.id]
  const factionRewards = profile?.tierRewards ?? []
  const contactRewards = contact ? contact.rewards ?? [] : []

  return [...factionRewards, ...contactRewards].filter((rewardEntry) =>
    isRewardUnlockedForFaction(faction, contact, rewardEntry)
  )
}

function mapRecruitUnlock(
  faction: Faction,
  contact: Contact | null,
  rewardEntry: FactionReward
): FactionRecruitUnlock {
  return {
    factionId: faction.id,
    factionName: faction.name,
    ...(contact ? { contactId: contact.id, contactName: contact.name } : {}),
    rewardId: rewardEntry.id,
    label: rewardEntry.label,
    summary: rewardEntry.description,
    minTier: rewardEntry.minTier,
    ...(rewardEntry.maxTier ? { maxTier: rewardEntry.maxTier } : {}),
    disposition: rewardEntry.disposition ?? 'supportive',
  }
}

export function buildFactionRewardInfluence(
  currentCase: Pick<CaseInstance, 'kind' | 'tags' | 'requiredTags' | 'preferredTags'> &
    Partial<Pick<CaseInstance, 'factionId' | 'contactId'>>,
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
): FactionRewardInfluence {
  const factionStates = buildFactionStates(game as GameState)
  const matches = buildFactionCaseMatches(currentCase, factionStates)
  const caseTags = collectCaseTags(currentCase)
  const activeMatches = matches.slice(0, currentCase.kind === 'raid' ? 2 : 1).map((entry, index) => {
    const scale = index === 0 ? 1 : 0.5
    const faction = getFactionRecord(game, entry.factionState.id)
    const contact = faction ? getFactionContactForCase(faction, currentCase) : null
    const modifierBonus = faction
      ? getModifierMatches(getAllFactionModifiers(faction, contact), caseTags, 'reward_multiplier').reduce(
          (modifierSum, modifierEntry) => modifierSum + modifierEntry.value,
          0
        )
      : 0
    const appliedRewardModifier =
      entry.factionState.influenceModifiers.rewardModifier +
      modifierBonus +
      getContactRewardAdjustment(contact)

    return {
      ...entry,
      appliedRewardModifier,
      scale,
    }
  })
  const rewardModifier = roundModifier(
    activeMatches.reduce(
      (sum, entry) => sum + entry.appliedRewardModifier * entry.scale,
      0
    )
  )

  return {
    rewardModifier,
    matches: activeMatches.map(({ factionState, overlapTags }) => ({
      factionId: factionState.id,
      label: factionState.label,
      standing: factionState.standing,
      overlapTags,
      rewardModifier: roundModifier(
        activeMatches.find((entry) => entry.factionState.id === factionState.id)
          ?.appliedRewardModifier ?? factionState.influenceModifiers.rewardModifier
      ),
    })),
  }
}

export function buildFactionMissionContext(
  currentCase: Pick<CaseInstance, 'kind' | 'tags' | 'requiredTags' | 'preferredTags'> &
    Partial<Pick<CaseInstance, 'factionId' | 'contactId'>>,
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
): FactionMissionContext {
  const factionStates = buildFactionStates(game as GameState)
  const caseTags = collectCaseTags(currentCase)
  const activeMatches = buildFactionCaseMatches(currentCase, factionStates).slice(
    0,
    currentCase.kind === 'raid' ? 2 : 1
  )

  const reasons: string[] = []
  const scoreAdjustment = roundModifier(
    activeMatches.reduce((sum, entry, index) => {
      const faction = getFactionRecord(game, entry.factionState.id)
      if (!faction) {
        return sum
      }

      const contact = getFactionContactForCase(faction, currentCase)
      const modifierBonus = getModifierMatches(
        getAllFactionModifiers(faction, contact),
        caseTags,
        'success_bonus'
      ).reduce((modifierSum, modifierEntry) => modifierSum + modifierEntry.value, 0)
      const tierBonus = getTierScoreAdjustment(faction.reputationTier)
      const contactBonus = getContactScoreAdjustment(contact)

      if (modifierBonus !== 0) {
        reasons.push(
          `${entry.factionState.label}: modifier pressure ${modifierBonus >= 0 ? '+' : ''}${modifierBonus.toFixed(1)}`
        )
      }

      if (contact && contactBonus !== 0) {
        reasons.push(
          `${contact.name}: relationship effect ${contactBonus >= 0 ? '+' : ''}${contactBonus.toFixed(1)}`
        )
      }

      return sum + (tierBonus + modifierBonus + contactBonus) * (index === 0 ? 1 : 0.5)
    }, 0)
  )

  return {
    scoreAdjustment,
    reasons,
    matches: activeMatches.map((entry) => {
      const faction = getFactionRecord(game, entry.factionState.id)
      const contact = faction ? getFactionContactForCase(faction, currentCase) : null
      return {
        factionId: entry.factionState.id,
        factionName: entry.factionState.label,
        ...(contact ? { contactId: contact.id, contactName: contact.name } : {}),
      }
    }),
  }
}

export function buildFactionOutcomeGrants(
  currentCase: Pick<CaseInstance, 'kind' | 'tags' | 'requiredTags' | 'preferredTags'> &
    Partial<Pick<CaseInstance, 'factionId' | 'contactId'>>,
  outcome: MissionResolutionKind,
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
): FactionOutcomeGrantSummary {
  if (outcome === 'fail' || outcome === 'unresolved') {
    return {
      fundingFlat: 0,
      inventoryRewards: [],
      favorGrants: [],
      recruitUnlocks: [],
      reasons: [],
      grants: [],
    }
  }

  const factionStates = buildFactionStates(game as GameState)
  const activeMatches = buildFactionCaseMatches(currentCase, factionStates).slice(
    0,
    currentCase.kind === 'raid' ? 2 : 1
  )

  let fundingFlat = 0
  const inventoryRewards: MissionRewardInventoryGrant[] = []
  const favorGrants: FactionOutcomeGrantSummary['favorGrants'] = []
  const recruitUnlocks: FactionOutcomeGrantSummary['recruitUnlocks'] = []
  const reasons: string[] = []
  const grants: FactionOutcomeGrantSummary['grants'] = []

  for (const entry of activeMatches) {
    const faction = getFactionRecord(game, entry.factionState.id)
    if (!faction) {
      continue
    }

    const contact = getFactionContactForCase(faction, currentCase)
    const caseTags = collectCaseTags(currentCase)
    const modifierPool = getAllFactionModifiers(faction, contact)
    const eligibleRewards = getEligibleRewards(faction, contact)
    const fundingFlatModifier = Math.round(
      getModifierMatches(modifierPool, caseTags, 'funding_flat').reduce(
        (sum, modifierEntry) => sum + modifierEntry.value,
        0
      )
    )
    const favorGainModifier = Math.max(
      0,
      Math.round(
        getModifierMatches(modifierPool, caseTags, 'favor_gain').reduce(
          (sum, modifierEntry) => sum + modifierEntry.value,
          0
        )
      )
    )

    if (fundingFlatModifier !== 0) {
      const modifiedAmount =
        outcome === 'success'
          ? fundingFlatModifier
          : Math.sign(fundingFlatModifier) * Math.max(1, Math.round(Math.abs(fundingFlatModifier) * 0.5))
      fundingFlat += modifiedAmount
      reasons.push(`Faction modifier: ${modifiedAmount >= 0 ? '+' : ''}$${modifiedAmount}.`)
    }

    for (const rewardEntry of eligibleRewards) {
      if (rewardEntry.kind === 'funding' && typeof rewardEntry.amount === 'number') {
        const amount =
          outcome === 'success' ? rewardEntry.amount : Math.max(1, Math.round(rewardEntry.amount * 0.5))
        fundingFlat += amount
        grants.push({
          factionId: faction.id,
          ...(contact ? { contactId: contact.id } : {}),
          kind: 'funding',
          rewardId: rewardEntry.id,
          label: rewardEntry.label,
          amount,
        })
        reasons.push(`${rewardEntry.label}: +$${amount}.`)
        continue
      }

      if (rewardEntry.kind === 'gear' && rewardEntry.itemId && outcome === 'success') {
        const inventoryGrant = buildInventoryGrant(rewardEntry.itemId, rewardEntry.quantity ?? 1)
        if (!inventoryGrant) {
          continue
        }
        inventoryRewards.push(inventoryGrant)
        grants.push({
          factionId: faction.id,
          ...(contact ? { contactId: contact.id } : {}),
          kind: 'inventory',
          rewardId: rewardEntry.id,
          label: rewardEntry.label,
          itemId: inventoryGrant.itemId,
          quantity: inventoryGrant.quantity,
        })
        reasons.push(`${rewardEntry.label}: ${inventoryGrant.label} x${inventoryGrant.quantity}.`)
        continue
      }

      if (rewardEntry.kind === 'favor' && outcome === 'success') {
        const totalFavorCount = 1 + favorGainModifier
        for (let index = 0; index < totalFavorCount; index += 1) {
          favorGrants.push({
            factionId: faction.id,
            rewardId: rewardEntry.id,
            label: rewardEntry.label,
          })
          grants.push({
            factionId: faction.id,
            ...(contact ? { contactId: contact.id } : {}),
            kind: 'favor',
            rewardId: rewardEntry.id,
            label: rewardEntry.label,
            amount: 1,
          })
        }
        reasons.push(
          `${rewardEntry.label}: ${totalFavorCount > 1 ? `${totalFavorCount} favors banked.` : 'favor banked.'}`
        )
        continue
      }

      if (rewardEntry.kind === 'recruit') {
        recruitUnlocks.push({
          ...mapRecruitUnlock(faction, contact, rewardEntry),
        })
      }
    }
  }

  return {
    fundingFlat,
    inventoryRewards,
    favorGrants,
    recruitUnlocks,
    reasons,
    grants,
  }
}

export function getFactionRecruitUnlocks(game: Pick<GameState, 'factions'>) {
  const factions = sanitizeFactionStateMap(game.factions ?? {})

  return Object.values(factions).flatMap((faction) => {
    const factionLevelUnlocks = getEligibleRewards(faction, null)
      .filter((rewardEntry) => rewardEntry.kind === 'recruit')
      .map((rewardEntry) => mapRecruitUnlock(faction, null, rewardEntry))
    const contactUnlocks = faction.contacts.flatMap((contact) =>
      (contact.rewards ?? [])
        .filter(
          (rewardEntry) =>
            rewardEntry.kind === 'recruit' && isRewardUnlockedForFaction(faction, contact, rewardEntry)
        )
        .map((rewardEntry) => mapRecruitUnlock(faction, contact, rewardEntry))
    )

    return [...factionLevelUnlocks, ...contactUnlocks]
  })
}

export function getFactionRecruitQualityModifier(
  game: Pick<GameState, 'factions'>,
  input: { factionId?: string; contactId?: string }
) {
  if (!input.factionId) {
    return 0
  }

  const factions = sanitizeFactionStateMap(game.factions ?? {})
  const faction = factions[input.factionId]

  if (!faction) {
    return 0
  }

  const contact = input.contactId
    ? faction.contacts.find((entry) => entry.id === input.contactId) ?? null
    : null

  return Math.round(getRecruitmentModifierValue(getAllFactionModifiers(faction, contact), 'recruit_quality'))
}

export function diffFactionRecruitUnlocks(
  previousUnlocks: readonly FactionRecruitUnlock[],
  nextUnlocks: readonly FactionRecruitUnlock[]
) {
  const previousKeys = new Set(
    previousUnlocks.map((unlock) => `${unlock.factionId}:${unlock.contactId ?? ''}:${unlock.rewardId}`)
  )

  return nextUnlocks.filter(
    (unlock) =>
      !previousKeys.has(`${unlock.factionId}:${unlock.contactId ?? ''}:${unlock.rewardId}`)
  )
}

export function applyFactionMissionOutcome(
  factions: Record<string, Faction>,
  change: {
    factionId: string
    delta: number
    contactId?: string
    contactDelta?: number
  },
  outcome: MissionResolutionKind
) {
  const nextFactions = sanitizeFactionStateMap(factions)
  const faction = nextFactions[change.factionId]

  if (!faction) {
    return nextFactions
  }

  const reputation = clampFactionReputation(faction.reputation + change.delta)
  const reputationTier = getFactionReputationTier(reputation)
  const missionsCompleted =
    faction.history.missionsCompleted + (outcome === 'success' || outcome === 'partial' ? 1 : 0)
  const missionsFailed =
    faction.history.missionsFailed + (outcome === 'fail' || outcome === 'unresolved' ? 1 : 0)
  const revealedHiddenModifierIds = new Set(faction.history.revealedHiddenModifierIds)
  const totalMissionInteractions = missionsCompleted + missionsFailed

  if (totalMissionInteractions >= 2 && faction.modifiers.hidden[0]) {
    revealedHiddenModifierIds.add(faction.modifiers.hidden[0].id)
  }

  if (totalMissionInteractions >= 5 && faction.modifiers.hidden[1]) {
    revealedHiddenModifierIds.add(faction.modifiers.hidden[1].id)
  }

  nextFactions[change.factionId] = {
    ...faction,
    reputation,
    reputationTier,
    contacts: faction.contacts.map((contact) => {
      if (contact.id !== change.contactId) {
        return contact
      }

      const relationship = clampContactRelationship(contact.relationship + (change.contactDelta ?? 0))
      return {
        ...contact,
        relationship,
        status: getContactStatus(relationship),
      }
    }),
    lore: {
      ...faction.lore,
      discoveredEntryIds: getDiscoveredLoreEntries({
        ...faction,
        history: {
          ...faction.history,
          missionsCompleted,
          missionsFailed,
        },
      }).map((entry) => entry.id),
    },
    history: {
      missionsCompleted,
      missionsFailed,
      interactionLog: faction.history.interactionLog,
      revealedHiddenModifierIds: [...revealedHiddenModifierIds],
    },
    stateFlags: {
      ...faction.stateFlags,
      isHostile: reputationTier === 'hostile',
    },
  }

  return nextFactions
}

export function applyFactionFavorGrants(
  factions: Record<string, Faction>,
  grants: readonly { factionId: string; rewardId: string }[]
) {
  if (grants.length === 0) {
    return factions
  }

  const nextFactions = sanitizeFactionStateMap(factions)

  for (const grant of grants) {
    const faction = nextFactions[grant.factionId]
    if (!faction) {
      continue
    }

    nextFactions[grant.factionId] = {
      ...faction,
      availableFavors: {
        ...faction.availableFavors,
        [grant.rewardId]: (faction.availableFavors?.[grant.rewardId] ?? 0) + 1,
      },
    }
  }

  return nextFactions
}

export function applyFactionRecruitInteraction(
  factions: Record<string, Faction>,
  input: {
    factionId?: string
    contactId?: string
    relationshipDelta?: number
    reputationDelta?: number
  }
) {
  if (!input.factionId) {
    return factions
  }

  const nextFactions = sanitizeFactionStateMap(factions)
  const faction = nextFactions[input.factionId]
  if (!faction) {
    return nextFactions
  }

  const reputation = clampFactionReputation(faction.reputation + (input.reputationDelta ?? 0))
  const reputationTier = getFactionReputationTier(reputation)

  nextFactions[input.factionId] = {
    ...faction,
    reputation,
    reputationTier,
    contacts: faction.contacts.map((contact) => {
      if (contact.id !== input.contactId) {
        return contact
      }

      const relationship = clampContactRelationship(
        contact.relationship + (input.relationshipDelta ?? 0)
      )
      return {
        ...contact,
        relationship,
        status: getContactStatus(relationship),
      }
    }),
    stateFlags: {
      ...faction.stateFlags,
      isHostile: reputationTier === 'hostile',
    },
  }

  return nextFactions
}

export function getFactionSupportiveMissionTags(factionId: string) {
  return FACTION_PROFILE_MAP[factionId]?.supportiveMissionTags ?? getFactionDefinitionTags(factionId)
}

export function getFactionHostileMissionTags(factionId: string) {
  return FACTION_PROFILE_MAP[factionId]?.hostileMissionTags ?? getFactionDefinitionTags(factionId)
}

export function getFactionPressureSpawnThreshold(
  faction: Pick<FactionState, 'standing' | 'pressureScore' | 'reputationTier'>
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
  const reputationAdjustment =
    faction.reputationTier === 'hostile'
      ? -12
      : faction.reputationTier === 'unfriendly'
        ? -6
        : faction.reputationTier === 'allied'
          ? 8
          : 0
  const pressureAdjustment = faction.pressureScore >= 180 ? -5 : 0

  return FACTION_PRESSURE_THRESHOLD_BASE + standingAdjustment + reputationAdjustment + pressureAdjustment
}

export function buildFactionStates(
  game: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
): FactionState[] {
  const openCases = getOpenCases(game)
  const agency = getAgencyState(game)
  const unresolvedMomentum = getRecentUnresolvedMomentum(game)
  const factionRecords = sanitizeFactionStateMap(game.factions ?? {})
  const standingByFactionId = buildFactionStandingMap(game)

  return FACTION_DEFINITIONS.map((faction) => {
    const factionRecord = factionRecords[faction.id] ?? buildFactionFromProfile(faction)
    const visibleModifiers = getVisibleFactionModifiers(factionRecord)
    const discoveredLore = getDiscoveredLoreEntries(factionRecord)
    const matchingCases = openCases.filter((currentCase) =>
      collectCaseTags(currentCase).some((tag) => faction.tags.includes(tag))
    )
    const pressureScore =
      matchingCases.reduce((sum, currentCase) => sum + getCasePressureScore(currentCase), 0) +
      getMarketPressureFactor(game.market.pressure) +
      unresolvedMomentum * 2
    const standing = standingByFactionId[faction.id] ?? 0
    const reputationTier = getFactionReputationTier(factionRecord.reputation)
    const influenceModifiers = buildFactionInfluenceModifiers(
      standing,
      reputationTier,
      pressureScore
    )
    const opportunities = buildFactionOpportunities(
      faction,
      {
        ...factionRecord,
        reputationTier,
      },
      pressureScore,
      influenceModifiers
    )
    const stance: FactionState['stance'] =
      reputationTier === 'allied' || (standing >= 6 && pressureScore < 90 && agency.containmentRating >= 60)
        ? 'supportive'
        : reputationTier === 'hostile' || standing <= -6 || pressureScore >= 110
          ? 'hostile'
          : 'contested'

    return {
      id: faction.id,
      name: faction.name,
      label: faction.label,
      description: FACTION_PROFILE_MAP[faction.id]?.description ?? faction.feedback,
      category: faction.category,
      reputation: factionRecord.reputation,
      reputationTier,
      standing,
      pressureScore,
      stance,
      matchingCases: matchingCases.length,
      reasons: matchingCases.slice(0, 3).map((currentCase) => currentCase.title),
      feedback: faction.feedback,
      influenceModifiers,
      opportunities,
      knownModifiers: visibleModifiers,
      hiddenModifierCount: Math.max(
        0,
        factionRecord.modifiers.hidden.length -
          visibleModifiers.filter((modifierEntry) =>
            factionRecord.modifiers.hidden.some((hiddenEntry) => hiddenEntry.id === modifierEntry.id)
          ).length
      ),
      contacts: factionRecord.contacts.map((contact) => ({
        ...contact,
        status: getContactStatus(contact.relationship),
      })),
      history: {
        missionsCompleted: factionRecord.history.missionsCompleted,
        missionsFailed: factionRecord.history.missionsFailed,
        successRate: computeSuccessRate(
          factionRecord.history.missionsCompleted,
          factionRecord.history.missionsFailed
        ),
        interactionLog: [...factionRecord.history.interactionLog],
      },
      stateFlags: {
        ...factionRecord.stateFlags,
        isHostile: reputationTier === 'hostile',
      },
      lore: {
        discovered: discoveredLore,
        remainingCount: Math.max(0, factionRecord.lore.entries.length - discoveredLore.length),
      },
      availableFavors: Object.entries(factionRecord.availableFavors ?? {})
        .map(([rewardId, count]) => ({
          id: rewardId,
          label:
            [
              ...FACTION_PROFILE_MAP[faction.id].tierRewards,
              ...factionRecord.contacts.flatMap((contact) => contact.rewards ?? []),
            ].find((rewardEntry) => rewardEntry.id === rewardId)?.label ?? rewardId,
          count,
        }))
        .filter((entry) => entry.count > 0),
      recruitUnlocks: getFactionRecruitUnlocks({ factions: factionRecords }).filter(
        (unlock) => unlock.factionId === faction.id
      ),
    }
  }).sort(
    (left, right) =>
      right.pressureScore - left.pressureScore ||
      right.reputation - left.reputation ||
      left.label.localeCompare(right.label)
  )
}
