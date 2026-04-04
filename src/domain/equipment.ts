import type { Agent, CaseInstance, DomainStats, EquipmentSlots, StatKey } from './models'
import { cloneDomainStats } from './statDomains'

export type EquipmentSlotKind =
  | 'primary'
  | 'secondary'
  | 'armor'
  | 'headgear'
  | 'utility1'
  | 'utility2'

export const EQUIPMENT_SLOT_KINDS = [
  'primary',
  'secondary',
  'armor',
  'headgear',
  'utility1',
  'utility2',
] as const satisfies readonly EquipmentSlotKind[]

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotKind, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  armor: 'Armor',
  headgear: 'Headgear',
  utility1: 'Utility 1',
  utility2: 'Utility 2',
}

// ============================================================================
// PHASE 1: RARITY TIERS
// ============================================================================

export type EquipmentRarity = 'basic' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export const EQUIPMENT_RARITY_KINDS = [
  'basic',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const satisfies readonly EquipmentRarity[]

export const EQUIPMENT_RARITY_LABELS: Record<EquipmentRarity, string> = {
  basic: 'Basic',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

export function getRarityLabel(rarity: EquipmentRarity): string {
  return EQUIPMENT_RARITY_LABELS[rarity]
}

export function qualityToRarity(quality: number): EquipmentRarity {
  const clampedQuality = Math.max(1, Math.min(5, Math.trunc(quality)))
  return EQUIPMENT_RARITY_KINDS[clampedQuality - 1]
}

export function rarityToQualityMultiplier(rarity: EquipmentRarity): number {
  return EQUIPMENT_RARITY_KINDS.indexOf(rarity) + 1
}

// ============================================================================
// PHASE 2: ENCHANTMENTS
// ============================================================================

export interface EquipmentEnchantment {
  id: string
  label: string
  description?: string
  statModifiers: Partial<DomainStats>
  activationRule?: EquipmentContextRule
  rarity: EquipmentRarity
}

// ============================================================================
// PHASE 3: EQUIPMENT SETS
// ============================================================================

export interface EquipmentSet {
  id: string
  label: string
  itemIds: string[]
  bonuses: Partial<Record<2 | 3 | 'complete', Partial<DomainStats>>>
}

export interface EquipmentEvaluationContext {
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
}

export interface EquipmentContextRule {
  requiredTags?: string[]
  kinds?: CaseInstance['kind'][]
  minDurationWeeks?: number
  minWeights?: Partial<Record<StatKey, number>>
}

export interface EquipmentContextModifier {
  rule: EquipmentContextRule
  statModifiers: Partial<DomainStats>
}

export interface EquipmentDefinition {
  id: string
  name: string
  slot: EquipmentSlotKind
  quality: number
  tags: string[]
  allowedSlots: EquipmentSlotKind[]
  statModifiers: Partial<DomainStats>
  contextModifiers?: EquipmentContextModifier[]
  rarity?: EquipmentRarity
  enchantmentIds?: string[]
}

export interface EquipmentItem {
  id: string
  name: string
  quality: number
  slot: EquipmentSlotKind
  tags: string[]
  rarity: EquipmentRarity
  enchantments: EquipmentEnchantment[]
  activeEnchantments: EquipmentEnchantment[]
  baseModifiers: Partial<DomainStats>
  statModifiers: Partial<DomainStats>
  activeModifiers: Partial<DomainStats>
  contextActive: boolean
}

export interface EquipmentLoadoutSummary {
  slotCount: number
  equippedItemCount: number
  emptySlotCount: number
  activeContextItemCount: number
  loadoutQuality: number
  equippedItemIds: string[]
  equippedTags: string[]
}

export interface TeamEquipmentSummary extends EquipmentLoadoutSummary {
  agentCount: number
  equippedItems: EquipmentItem[]
}

export interface EquippedItemAssignment {
  itemId: string
  agentId: string
  slot: EquipmentSlotKind
}

export const EQUIPMENT_SLOT_ALIASES: Record<EquipmentSlotKind, readonly string[]> = {
  primary: ['primary', 'primaryKit'],
  secondary: ['secondary', 'secondaryKit'],
  armor: ['armor', 'protectiveGear'],
  headgear: ['headgear'],
  utility1: ['utility1', 'utility'],
  utility2: ['utility2', 'utilityKit'],
}

const FORBIDDEN_ITEM_DESIGN_KEYS = [
  'affix',
  'affixes',
  'prefix',
  'prefixes',
  'suffix',
  'suffixes',
  'roll',
  'rolls',
  'rng',
  'random',
  'randomness',
  'seed',
  'variance',
  'varianceMin',
  'varianceMax',
  'minRoll',
  'maxRoll',
  'statVariance',
  'qualityVariance',
] as const

const EQUIPMENT_DEFINITION_KEYS = new Set<keyof EquipmentDefinition>([
  'id',
  'name',
  'slot',
  'quality',
  'tags',
  'allowedSlots',
  'statModifiers',
  'contextModifiers',
  'rarity',
  'enchantmentIds',
])

const EQUIPMENT_CONTEXT_MODIFIER_KEYS = new Set<keyof EquipmentContextModifier>([
  'rule',
  'statModifiers',
])

const EQUIPMENT_CONTEXT_RULE_KEYS = new Set<keyof EquipmentContextRule>([
  'requiredTags',
  'kinds',
  'minDurationWeeks',
  'minWeights',
])

const ENCHANTMENT_CATALOG: Record<string, EquipmentEnchantment> = {
  sharpness: {
    id: 'sharpness',
    label: 'Sharpness',
    description: 'Increases physical strength in combat',
    statModifiers: { physical: { strength: 1, endurance: 0 } },
    rarity: 'uncommon',
  },
  clarity: {
    id: 'clarity',
    label: 'Clarity',
    description: 'Enhances cognitive analysis and investigation',
    statModifiers: { cognitive: { analysis: 1, investigation: 1 } },
    rarity: 'uncommon',
  },
  resonance: {
    id: 'resonance',
    label: 'Resonance',
    description: 'Amplifies anomaly detection and technical control',
    statModifiers: { technical: { anomaly: 2, equipment: 0 } },
    rarity: 'rare',
  },
  fortitude: {
    id: 'fortitude',
    label: 'Fortitude',
    description: 'Strengthens stability and resistance',
    statModifiers: { stability: { resistance: 1, tolerance: 1 } },
    rarity: 'rare',
  },
  vigilance: {
    id: 'vigilance',
    label: 'Vigilance',
    description: 'Boosts tactical awareness and reaction time',
    statModifiers: { tactical: { awareness: 1, reaction: 1 } },
    rarity: 'uncommon',
  },
  empathy: {
    id: 'empathy',
    label: 'Empathy',
    description: 'Enhances social negotiation and influence',
    statModifiers: { social: { negotiation: 1, influence: 1 } },
    rarity: 'uncommon',
    activationRule: { requiredTags: ['negotiation', 'interview', 'witness'] },
  },
}

const EQUIPMENT_SETS: Record<string, EquipmentSet> = {
  combat_set: {
    id: 'combat_set',
    label: 'Combat Set',
    itemIds: ['silver_rounds', 'field_plate', 'combat_stims'],
    bonuses: {
      2: {
        physical: { strength: 1, endurance: 1 },
        tactical: { awareness: 0, reaction: 1 },
      },
      3: {
        physical: { strength: 2, endurance: 2 },
        tactical: { awareness: 1, reaction: 2 },
      },
      complete: {
        physical: { strength: 2, endurance: 3 },
        tactical: { awareness: 1, reaction: 3 },
      },
    },
  },
  occult_set: {
    id: 'occult_set',
    label: 'Occult Set',
    itemIds: ['ward_seals', 'ritual_components', 'warding_kits'],
    bonuses: {
      2: {
        stability: { resistance: 1, tolerance: 1 },
        technical: { equipment: 1, anomaly: 1 },
      },
      3: {
        stability: { resistance: 2, tolerance: 2 },
        technical: { equipment: 1, anomaly: 2 },
      },
      complete: {
        stability: { resistance: 3, tolerance: 2 },
        technical: { equipment: 2, anomaly: 3 },
      },
    },
  },
  investigation_set: {
    id: 'investigation_set',
    label: 'Investigation Set',
    itemIds: ['signal_jammers', 'emf_sensors', 'breach_visor', 'tactical_radio'],
    bonuses: {
      2: {
        cognitive: { analysis: 1, investigation: 1 },
        tactical: { awareness: 1, reaction: 0 },
      },
      3: {
        cognitive: { analysis: 2, investigation: 2 },
        tactical: { awareness: 1, reaction: 1 },
      },
      complete: {
        cognitive: { analysis: 2, investigation: 2 },
        tactical: { awareness: 2, reaction: 2 },
        technical: { equipment: 1, anomaly: 0 },
      },
    },
  },
  support_set: {
    id: 'support_set',
    label: 'Support Set',
    itemIds: ['diplomatic_kit', 'medkits', 'hazmat_suit'],
    bonuses: {
      2: {
        social: { negotiation: 1, influence: 1 },
        stability: { resistance: 1, tolerance: 1 },
      },
      3: {
        social: { negotiation: 2, influence: 1 },
        stability: { resistance: 2, tolerance: 2 },
        cognitive: { analysis: 1, investigation: 0 },
      },
      complete: {
        social: { negotiation: 2, influence: 2 },
        stability: { resistance: 3, tolerance: 2 },
        cognitive: { analysis: 1, investigation: 1 },
      },
    },
  },
  physical_set: {
    id: 'physical_set',
    label: 'Physical Set',
    itemIds: ['silver_rounds', 'containment_staff', 'field_plate'],
    bonuses: {
      2: {
        physical: { strength: 1, endurance: 1 },
        stability: { resistance: 1, tolerance: 0 },
      },
      3: {
        physical: { strength: 2, endurance: 2 },
        stability: { resistance: 1, tolerance: 1 },
        tactical: { awareness: 1, reaction: 0 },
      },
      complete: {
        physical: { strength: 2, endurance: 2 },
        stability: { resistance: 2, tolerance: 1 },
        tactical: { awareness: 1, reaction: 1 },
      },
    },
  },
}

const EQUIPMENT_CATALOG: Record<string, EquipmentDefinition> = {
  silver_rounds: {
    id: 'silver_rounds',
    name: 'Silver Rounds',
    slot: 'primary',
    quality: 1,
    tags: ['combat', 'breach', 'anti-spirit', 'silver', 'threat'],
    allowedSlots: ['primary'],
    rarity: 'uncommon',
    enchantmentIds: ['sharpness'],
    statModifiers: {
      physical: { strength: 2, endurance: 0 },
      tactical: { awareness: 3, reaction: 3 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['combat', 'threat', 'breach', 'raid'],
          kinds: ['case', 'raid'],
        },
        statModifiers: {
          tactical: { awareness: 1, reaction: 1 },
        },
      },
    ],
  },
  ward_seals: {
    id: 'ward_seals',
    name: 'Ward Seals',
    slot: 'secondary',
    quality: 1,
    tags: ['occult', 'containment', 'anti-spirit', 'seal', 'ritual'],
    allowedSlots: ['secondary', 'utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['resonance'],
    statModifiers: {
      stability: { resistance: 2, tolerance: 2 },
      technical: { equipment: 2, anomaly: 3 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['occult', 'ritual', 'anomaly', 'containment', 'seal'],
        },
        statModifiers: {
          technical: { equipment: 1, anomaly: 2 },
          stability: { resistance: 1, tolerance: 1 },
        },
      },
    ],
  },
  medkits: {
    id: 'medkits',
    name: 'Emergency Medkits',
    slot: 'utility1',
    quality: 1,
    tags: ['medical', 'stabilization', 'hazmat', 'support'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['fortitude'],
    statModifiers: {
      social: { negotiation: 1, influence: 1 },
      stability: { resistance: 2, tolerance: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['medical', 'medic', 'triage', 'biological', 'hazmat', 'support'],
        },
        statModifiers: {
          stability: { resistance: 1, tolerance: 1 },
          social: { negotiation: 1, influence: 1 },
        },
      },
    ],
  },
  diplomatic_kit: {
    id: 'diplomatic_kit',
    name: 'Diplomatic Kit',
    slot: 'secondary',
    quality: 1,
    tags: ['social', 'negotiation', 'interview', 'support', 'communication'],
    allowedSlots: ['secondary', 'utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['empathy'],
    statModifiers: {
      social: { negotiation: 3, influence: 2 },
      cognitive: { analysis: 1, investigation: 0 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['interview', 'witness', 'negotiation', 'social'],
        },
        statModifiers: {
          social: { negotiation: 1, influence: 1 },
          cognitive: { analysis: 1, investigation: 1 },
        },
      },
    ],
  },
  signal_jammers: {
    id: 'signal_jammers',
    name: 'Signal Jammers',
    slot: 'utility1',
    quality: 1,
    tags: ['surveillance', 'signal', 'intel', 'analysis'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['clarity'],
    statModifiers: {
      cognitive: { analysis: 3, investigation: 1 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['signal', 'relay', 'analysis', 'intel'],
        },
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
        },
      },
    ],
  },
  emf_sensors: {
    id: 'emf_sensors',
    name: 'EMF Sensors',
    slot: 'utility2',
    quality: 1,
    tags: ['surveillance', 'anomaly', 'analysis', 'evidence', 'field'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['vigilance'],
    statModifiers: {
      cognitive: { analysis: 2, investigation: 3 },
      technical: { equipment: 2, anomaly: 1 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['anomaly', 'evidence', 'witness', 'analysis', 'relay'],
        },
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
          technical: { equipment: 1, anomaly: 1 },
        },
      },
    ],
  },
  anomaly_scanner: {
    id: 'anomaly_scanner',
    name: 'Handheld Anomaly Scanner',
    slot: 'secondary',
    quality: 1,
    tags: ['recon', 'anomaly', 'surveillance', 'analysis', 'field-kit'],
    allowedSlots: ['secondary', 'utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['clarity', 'resonance'],
    statModifiers: {
      cognitive: { analysis: 2, investigation: 2 },
      technical: { equipment: 1, anomaly: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['anomaly', 'occult', 'evidence', 'containment', 'psionic'],
        },
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
          technical: { equipment: 1, anomaly: 1 },
        },
      },
    ],
  },
  spectral_em_array: {
    id: 'spectral_em_array',
    name: 'Spectral / EM Sensor Array',
    slot: 'headgear',
    quality: 1,
    tags: ['recon', 'surveillance', 'signal', 'anomaly', 'field-kit'],
    allowedSlots: ['headgear'],
    rarity: 'uncommon',
    enchantmentIds: ['vigilance', 'resonance'],
    statModifiers: {
      tactical: { awareness: 3, reaction: 1 },
      cognitive: { analysis: 1, investigation: 1 },
      technical: { equipment: 1, anomaly: 1 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['signal', 'relay', 'anomaly', 'witness', 'field'],
        },
        statModifiers: {
          tactical: { awareness: 1, reaction: 1 },
          cognitive: { analysis: 1, investigation: 0 },
        },
      },
    ],
  },
  environmental_sampler: {
    id: 'environmental_sampler',
    name: 'Environmental Sampler',
    slot: 'utility2',
    quality: 1,
    tags: ['recon', 'environmental', 'hazmat', 'evidence', 'field-kit'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['clarity', 'fortitude'],
    statModifiers: {
      cognitive: { analysis: 1, investigation: 2 },
      technical: { equipment: 2, anomaly: 0 },
      stability: { resistance: 1, tolerance: 1 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['hazmat', 'biological', 'chemical', 'plague', 'evidence'],
        },
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
          technical: { equipment: 1, anomaly: 0 },
        },
      },
    ],
  },
  encrypted_field_tablet: {
    id: 'encrypted_field_tablet',
    name: 'Encrypted Field Tablet',
    slot: 'utility1',
    quality: 1,
    tags: ['recon', 'analysis', 'signal', 'communication', 'field-kit'],
    allowedSlots: ['secondary', 'utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['clarity'],
    statModifiers: {
      cognitive: { analysis: 3, investigation: 1 },
      social: { negotiation: 1, influence: 1 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['analysis', 'signal', 'relay', 'interview', 'witness'],
        },
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
          social: { negotiation: 1, influence: 0 },
        },
      },
    ],
  },
  advanced_recon_suite: {
    id: 'advanced_recon_suite',
    name: 'Advanced Recon Suite',
    slot: 'headgear',
    quality: 2,
    tags: ['recon', 'surveillance', 'pathfinding', 'analysis', 'field-kit'],
    allowedSlots: ['headgear'],
    rarity: 'rare',
    enchantmentIds: ['clarity', 'vigilance'],
    statModifiers: {
      tactical: { awareness: 4, reaction: 2 },
      cognitive: { analysis: 2, investigation: 2 },
      technical: { equipment: 1, anomaly: 0 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['field', 'evidence', 'signal', 'relay', 'breach'],
        },
        statModifiers: {
          tactical: { awareness: 2, reaction: 1 },
          cognitive: { analysis: 1, investigation: 1 },
        },
      },
    ],
  },
  occult_detection_array: {
    id: 'occult_detection_array',
    name: 'Occult Detection Array',
    slot: 'utility2',
    quality: 2,
    tags: ['recon', 'occult', 'anomaly', 'surveillance', 'field-kit'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'rare',
    enchantmentIds: ['resonance', 'vigilance'],
    statModifiers: {
      tactical: { awareness: 2, reaction: 0 },
      cognitive: { analysis: 1, investigation: 2 },
      technical: { equipment: 2, anomaly: 3 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['occult', 'ritual', 'spirit', 'anomaly', 'psionic'],
        },
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
          technical: { equipment: 1, anomaly: 2 },
          stability: { resistance: 1, tolerance: 1 },
        },
      },
    ],
  },
  signal_intercept_kit: {
    id: 'signal_intercept_kit',
    name: 'Signal Intercept Kit',
    slot: 'utility1',
    quality: 2,
    tags: ['recon', 'signal', 'cyber', 'analysis', 'field-kit'],
    allowedSlots: ['secondary', 'utility1', 'utility2'],
    rarity: 'rare',
    enchantmentIds: ['clarity', 'vigilance'],
    statModifiers: {
      tactical: { awareness: 2, reaction: 1 },
      cognitive: { analysis: 3, investigation: 1 },
      technical: { equipment: 2, anomaly: 0 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['signal', 'relay', 'cyber', 'information', 'intel'],
        },
        statModifiers: {
          tactical: { awareness: 1, reaction: 1 },
          cognitive: { analysis: 2, investigation: 1 },
          technical: { equipment: 1, anomaly: 0 },
        },
      },
    ],
  },
  warding_kits: {
    id: 'warding_kits',
    name: 'Warding Kits',
    slot: 'secondary',
    quality: 1,
    tags: ['occult', 'containment', 'anti-spirit', 'ritual', 'hazmat'],
    allowedSlots: ['secondary', 'utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['resonance'],
    statModifiers: {
      stability: { resistance: 2, tolerance: 2 },
      technical: { equipment: 2, anomaly: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['occult', 'ritual', 'containment', 'seal', 'anomaly'],
        },
        statModifiers: {
          technical: { equipment: 1, anomaly: 2 },
          stability: { resistance: 1, tolerance: 1 },
        },
      },
    ],
  },
  ritual_components: {
    id: 'ritual_components',
    name: 'Ritual Components',
    slot: 'utility2',
    quality: 1,
    tags: ['occult', 'ritual', 'anomaly', 'analysis', 'containment'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'rare',
    enchantmentIds: ['clarity', 'resonance'],
    statModifiers: {
      cognitive: { analysis: 1, investigation: 2 },
      technical: { equipment: 1, anomaly: 3 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['occult', 'ritual', 'anomaly', 'containment', 'haunt'],
          minDurationWeeks: 2,
        },
        statModifiers: {
          technical: { equipment: 1, anomaly: 1 },
          stability: { resistance: 1, tolerance: 1 },
        },
      },
    ],
  },
  field_plate: {
    id: 'field_plate',
    name: 'Field Plate',
    slot: 'armor',
    quality: 1,
    tags: ['armor', 'hazmat', 'breach', 'protection'],
    allowedSlots: ['armor'],
    rarity: 'uncommon',
    enchantmentIds: ['fortitude'],
    statModifiers: {
      physical: { strength: 1, endurance: 2 },
      stability: { resistance: 2, tolerance: 1 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['combat', 'breach', 'threat', 'raid'],
        },
        statModifiers: {
          physical: { strength: 1, endurance: 1 },
          stability: { resistance: 1, tolerance: 0 },
        },
      },
    ],
  },
  containment_staff: {
    id: 'containment_staff',
    name: 'Containment Staff',
    slot: 'primary',
    quality: 1,
    tags: ['occult', 'containment', 'stabilization', 'support', 'ritual'],
    allowedSlots: ['primary', 'secondary'],
    rarity: 'uncommon',
    enchantmentIds: ['fortitude'],
    statModifiers: {
      stability: { resistance: 3, tolerance: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['occult', 'containment', 'ritual', 'anomaly'],
        },
        statModifiers: {
          stability: { resistance: 1, tolerance: 1 },
          technical: { equipment: 1, anomaly: 1 },
        },
      },
    ],
  },
  hazmat_suit: {
    id: 'hazmat_suit',
    name: 'Hazmat Suit',
    slot: 'armor',
    quality: 1,
    tags: ['armor', 'hazmat', 'protection', 'biocontainment', 'support'],
    allowedSlots: ['armor'],
    rarity: 'uncommon',
    enchantmentIds: ['fortitude'],
    statModifiers: {
      stability: { resistance: 3, tolerance: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['biological', 'hazmat', 'medical', 'support', 'triage'],
        },
        statModifiers: {
          stability: { resistance: 2, tolerance: 1 },
        },
      },
    ],
  },
  analysis_goggles: {
    id: 'analysis_goggles',
    name: 'Analysis Goggles',
    slot: 'headgear',
    quality: 1,
    tags: ['surveillance', 'analysis', 'investigation', 'intel'],
    allowedSlots: ['headgear'],
    rarity: 'uncommon',
    enchantmentIds: ['clarity'],
    statModifiers: {
      cognitive: { analysis: 3, investigation: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['analysis', 'investigation', 'evidence', 'relay'],
        },
        statModifiers: {
          cognitive: { analysis: 2, investigation: 1 },
          technical: { equipment: 1, anomaly: 0 },
        },
      },
    ],
  },
  trauma_kit: {
    id: 'trauma_kit',
    name: 'Trauma Kit',
    slot: 'utility2',
    quality: 1,
    tags: ['medical', 'trauma', 'field', 'physical', 'stabilization'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['fortitude'],
    statModifiers: {
      physical: { endurance: 2, strength: 0 },
      stability: { resistance: 1, tolerance: 2 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['combat', 'breach', 'medical', 'triage'],
        },
        statModifiers: {
          physical: { endurance: 1, strength: 0 },
          stability: { resistance: 1, tolerance: 0 },
        },
      },
    ],
  },
  combat_stims: {
    id: 'combat_stims',
    name: 'Combat Stims',
    slot: 'utility1',
    quality: 1,
    tags: ['combat', 'stimulant', 'physical', 'support', 'medical'],
    allowedSlots: ['utility1', 'utility2'],
    rarity: 'uncommon',
    enchantmentIds: ['sharpness'],
    statModifiers: {
      physical: { endurance: 2, strength: 1 },
      tactical: { reaction: 2, awareness: 0 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['combat', 'threat', 'breach', 'raid'],
        },
        statModifiers: {
          physical: { strength: 1, endurance: 1 },
        },
      },
    ],
  },
  tactical_radio: {
    id: 'tactical_radio',
    name: 'Tactical Radio',
    slot: 'secondary',
    quality: 1,
    tags: ['tactical', 'communication', 'signal', 'field', 'surveillance'],
    allowedSlots: ['secondary', 'utility1'],
    rarity: 'uncommon',
    enchantmentIds: ['vigilance'],
    statModifiers: {
      tactical: { awareness: 2, reaction: 1 },
      cognitive: { analysis: 1, investigation: 0 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['relay', 'signal', 'breach', 'field'],
        },
        statModifiers: {
          tactical: { awareness: 1, reaction: 1 },
        },
      },
    ],
  },
  breach_visor: {
    id: 'breach_visor',
    name: 'Breach Visor',
    slot: 'headgear',
    quality: 1,
    tags: ['surveillance', 'breach', 'witness', 'field'],
    allowedSlots: ['headgear'],
    rarity: 'rare',
    enchantmentIds: ['vigilance'],
    statModifiers: {
      tactical: { awareness: 2, reaction: 1 },
      technical: { equipment: 1, anomaly: 0 },
    },
    contextModifiers: [
      {
        rule: {
          requiredTags: ['breach', 'field', 'combat', 'witness', 'interview'],
          minWeights: { social: 0.2 },
        },
        statModifiers: {
          tactical: { awareness: 1, reaction: 1 },
          social: { negotiation: 1, influence: 1 },
        },
      },
    ],
  },
} as const

const EMPTY_EQUIPMENT_LOADOUT_SUMMARY: EquipmentLoadoutSummary = {
  slotCount: EQUIPMENT_SLOT_KINDS.length,
  equippedItemCount: 0,
  emptySlotCount: EQUIPMENT_SLOT_KINDS.length,
  activeContextItemCount: 0,
  loadoutQuality: 0,
  equippedItemIds: [],
  equippedTags: [],
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertNoForbiddenDesignKeys(value: unknown, path: string) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenDesignKeys(entry, `${path}[${index}]`))
    return
  }

  if (!isPlainObject(value)) {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase()
    if (FORBIDDEN_ITEM_DESIGN_KEYS.some((forbidden) => normalizedKey.includes(forbidden))) {
      throw new Error(
        `Invalid equipment definition at ${path}.${key}: deterministic item design forbids ${key}.`
      )
    }

    assertNoForbiddenDesignKeys(nestedValue, `${path}.${key}`)
  }
}

function assertUniqueStringList(values: string[], path: string) {
  const uniqueValues = new Set(values)
  if (uniqueValues.size !== values.length) {
    throw new Error(`Invalid equipment definition at ${path}: duplicate entries are not allowed.`)
  }
}

function assertFiniteStatModifiers(statModifiers: Partial<DomainStats>, path: string) {
  for (const [domainKey, domainValue] of Object.entries(statModifiers)) {
    if (!isPlainObject(domainValue)) {
      throw new Error(`Invalid equipment definition at ${path}.${domainKey}: expected stat block.`)
    }

    for (const [statKey, statValue] of Object.entries(domainValue)) {
      if (typeof statValue !== 'number' || !Number.isFinite(statValue)) {
        throw new Error(
          `Invalid equipment definition at ${path}.${domainKey}.${statKey}: expected finite numeric modifier.`
        )
      }
    }
  }
}

function assertAllowedKeys(input: Record<string, unknown>, allowedKeys: Set<string>, path: string) {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Invalid equipment definition at ${path}: unexpected key "${key}".`)
    }
  }
}

export function validateEquipmentCatalogDefinitions(catalog: Record<string, EquipmentDefinition>) {
  for (const [itemId, definition] of Object.entries(catalog)) {
    assertNoForbiddenDesignKeys(definition, `equipment.${itemId}`)
    assertAllowedKeys(
      definition as unknown as Record<string, unknown>,
      EQUIPMENT_DEFINITION_KEYS as unknown as Set<string>,
      `equipment.${itemId}`
    )

    if (definition.id !== itemId) {
      throw new Error(
        `Invalid equipment definition at equipment.${itemId}: id "${definition.id}" must match catalog key.`
      )
    }

    if (!EQUIPMENT_SLOT_KINDS.includes(definition.slot)) {
      throw new Error(
        `Invalid equipment definition at equipment.${itemId}: slot "${definition.slot}" is not supported.`
      )
    }

    if (!Number.isInteger(definition.quality) || definition.quality < 1) {
      throw new Error(
        `Invalid equipment definition at equipment.${itemId}: quality must be a positive integer.`
      )
    }

    if (definition.allowedSlots.length === 0) {
      throw new Error(
        `Invalid equipment definition at equipment.${itemId}: allowedSlots cannot be empty.`
      )
    }

    assertUniqueStringList(definition.tags, `equipment.${itemId}.tags`)
    assertUniqueStringList(definition.allowedSlots, `equipment.${itemId}.allowedSlots`)

    if (!definition.allowedSlots.includes(definition.slot)) {
      throw new Error(
        `Invalid equipment definition at equipment.${itemId}: primary slot "${definition.slot}" must be allowed.`
      )
    }

    assertFiniteStatModifiers(definition.statModifiers, `equipment.${itemId}.statModifiers`)

    for (const [index, modifier] of (definition.contextModifiers ?? []).entries()) {
      assertAllowedKeys(
        modifier as unknown as Record<string, unknown>,
        EQUIPMENT_CONTEXT_MODIFIER_KEYS as unknown as Set<string>,
        `equipment.${itemId}.contextModifiers[${index}]`
      )
      assertAllowedKeys(
        modifier.rule as unknown as Record<string, unknown>,
        EQUIPMENT_CONTEXT_RULE_KEYS as unknown as Set<string>,
        `equipment.${itemId}.contextModifiers[${index}].rule`
      )

      if (
        modifier.rule.minDurationWeeks !== undefined &&
        (!Number.isInteger(modifier.rule.minDurationWeeks) || modifier.rule.minDurationWeeks < 0)
      ) {
        throw new Error(
          `Invalid equipment definition at equipment.${itemId}.contextModifiers[${index}].rule.minDurationWeeks: expected non-negative integer.`
        )
      }

      if (modifier.rule.requiredTags) {
        assertUniqueStringList(
          modifier.rule.requiredTags,
          `equipment.${itemId}.contextModifiers[${index}].rule.requiredTags`
        )
      }

      if (modifier.rule.kinds) {
        assertUniqueStringList(
          modifier.rule.kinds,
          `equipment.${itemId}.contextModifiers[${index}].rule.kinds`
        )
      }

      if (modifier.rule.minWeights) {
        for (const [weightKey, weightValue] of Object.entries(modifier.rule.minWeights)) {
          if (typeof weightValue !== 'number' || !Number.isFinite(weightValue) || weightValue < 0) {
            throw new Error(
              `Invalid equipment definition at equipment.${itemId}.contextModifiers[${index}].rule.minWeights.${weightKey}: expected non-negative finite weight.`
            )
          }
        }
      }

      assertFiniteStatModifiers(
        modifier.statModifiers,
        `equipment.${itemId}.contextModifiers[${index}].statModifiers`
      )
    }
  }
}

validateEquipmentCatalogDefinitions(EQUIPMENT_CATALOG)

export function createDefaultEquipmentLoadoutSummary(): EquipmentLoadoutSummary {
  return {
    ...EMPTY_EQUIPMENT_LOADOUT_SUMMARY,
    equippedItemIds: [],
    equippedTags: [],
  }
}

export function createDefaultTeamEquipmentSummary(): TeamEquipmentSummary {
  return {
    ...createDefaultEquipmentLoadoutSummary(),
    agentCount: 0,
    equippedItems: [],
  }
}

export function getEquipmentCatalogEntries() {
  return Object.values(EQUIPMENT_CATALOG)
    .map((definition) => ({
      ...definition,
      allowedSlots: [...definition.allowedSlots],
      tags: [...definition.tags],
      contextModifiers: definition.contextModifiers?.map((modifier) => ({
        ...modifier,
        rule: {
          ...modifier.rule,
          requiredTags: modifier.rule.requiredTags
            ? [...modifier.rule.requiredTags]
            : modifier.rule.requiredTags,
          kinds: modifier.rule.kinds ? [...modifier.rule.kinds] : modifier.rule.kinds,
          minWeights: modifier.rule.minWeights
            ? { ...modifier.rule.minWeights }
            : modifier.rule.minWeights,
        },
        statModifiers: cloneDomainStats({
          physical: {
            strength: modifier.statModifiers.physical?.strength ?? 0,
            endurance: modifier.statModifiers.physical?.endurance ?? 0,
          },
          tactical: {
            awareness: modifier.statModifiers.tactical?.awareness ?? 0,
            reaction: modifier.statModifiers.tactical?.reaction ?? 0,
          },
          cognitive: {
            analysis: modifier.statModifiers.cognitive?.analysis ?? 0,
            investigation: modifier.statModifiers.cognitive?.investigation ?? 0,
          },
          social: {
            negotiation: modifier.statModifiers.social?.negotiation ?? 0,
            influence: modifier.statModifiers.social?.influence ?? 0,
          },
          stability: {
            resistance: modifier.statModifiers.stability?.resistance ?? 0,
            tolerance: modifier.statModifiers.stability?.tolerance ?? 0,
          },
          technical: {
            equipment: modifier.statModifiers.technical?.equipment ?? 0,
            anomaly: modifier.statModifiers.technical?.anomaly ?? 0,
          },
        }),
      })),
      statModifiers: cloneDomainStats({
        physical: {
          strength: definition.statModifiers.physical?.strength ?? 0,
          endurance: definition.statModifiers.physical?.endurance ?? 0,
        },
        tactical: {
          awareness: definition.statModifiers.tactical?.awareness ?? 0,
          reaction: definition.statModifiers.tactical?.reaction ?? 0,
        },
        cognitive: {
          analysis: definition.statModifiers.cognitive?.analysis ?? 0,
          investigation: definition.statModifiers.cognitive?.investigation ?? 0,
        },
        social: {
          negotiation: definition.statModifiers.social?.negotiation ?? 0,
          influence: definition.statModifiers.social?.influence ?? 0,
        },
        stability: {
          resistance: definition.statModifiers.stability?.resistance ?? 0,
          tolerance: definition.statModifiers.stability?.tolerance ?? 0,
        },
        technical: {
          equipment: definition.statModifiers.technical?.equipment ?? 0,
          anomaly: definition.statModifiers.technical?.anomaly ?? 0,
        },
      }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function getCompatibleEquipmentDefinitions(slot: EquipmentSlotKind) {
  return getEquipmentCatalogEntries().filter((definition) => definition.allowedSlots.includes(slot))
}

export function getEquipmentSlotAliases(slot: EquipmentSlotKind) {
  return EQUIPMENT_SLOT_ALIASES[slot]
}

export function getEquipmentSlotItemId(
  equipmentSlots: EquipmentSlots | undefined,
  slot: EquipmentSlotKind
) {
  const aliases = EQUIPMENT_SLOT_ALIASES[slot]

  for (const alias of aliases) {
    const itemId = equipmentSlots?.[alias]
    if (typeof itemId === 'string' && itemId.length > 0) {
      return itemId
    }
  }

  return undefined
}

export function listEquippedItemAssignments(
  agents: Record<string, Agent>,
  itemId?: string
): EquippedItemAssignment[] {
  return Object.values(agents)
    .flatMap((agent) =>
      EQUIPMENT_SLOT_KINDS.map((slot) => {
        const slottedItemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
        if (!slottedItemId) {
          return null
        }

        if (itemId && slottedItemId !== itemId) {
          return null
        }

        return {
          itemId: slottedItemId,
          agentId: agent.id,
          slot,
        } satisfies EquippedItemAssignment
      })
    )
    .filter((assignment): assignment is EquippedItemAssignment => Boolean(assignment))
    .sort((left, right) => {
      const itemCompare = left.itemId.localeCompare(right.itemId)
      if (itemCompare !== 0) {
        return itemCompare
      }

      const agentCompare = left.agentId.localeCompare(right.agentId)
      if (agentCompare !== 0) {
        return agentCompare
      }

      return EQUIPMENT_SLOT_KINDS.indexOf(left.slot) - EQUIPMENT_SLOT_KINDS.indexOf(right.slot)
    })
}

function getItemQuality(_agent: Agent, definition: EquipmentDefinition) {
  return Math.max(1, Math.trunc(definition.quality))
}

function scaleStatModifiers(
  statModifiers: Partial<DomainStats>,
  quality: number
): Partial<DomainStats> {
  return {
    ...(statModifiers.physical
      ? {
          physical: {
            strength: (statModifiers.physical.strength ?? 0) * quality,
            endurance: (statModifiers.physical.endurance ?? 0) * quality,
          },
        }
      : {}),
    ...(statModifiers.tactical
      ? {
          tactical: {
            awareness: (statModifiers.tactical.awareness ?? 0) * quality,
            reaction: (statModifiers.tactical.reaction ?? 0) * quality,
          },
        }
      : {}),
    ...(statModifiers.cognitive
      ? {
          cognitive: {
            analysis: (statModifiers.cognitive.analysis ?? 0) * quality,
            investigation: (statModifiers.cognitive.investigation ?? 0) * quality,
          },
        }
      : {}),
    ...(statModifiers.social
      ? {
          social: {
            negotiation: (statModifiers.social.negotiation ?? 0) * quality,
            influence: (statModifiers.social.influence ?? 0) * quality,
          },
        }
      : {}),
    ...(statModifiers.stability
      ? {
          stability: {
            resistance: (statModifiers.stability.resistance ?? 0) * quality,
            tolerance: (statModifiers.stability.tolerance ?? 0) * quality,
          },
        }
      : {}),
    ...(statModifiers.technical
      ? {
          technical: {
            equipment: (statModifiers.technical.equipment ?? 0) * quality,
            anomaly: (statModifiers.technical.anomaly ?? 0) * quality,
          },
        }
      : {}),
  }
}

function mergeScaledModifiers(
  left: Partial<DomainStats>,
  right: Partial<DomainStats>
): Partial<DomainStats> {
  return {
    physical: {
      strength: (left.physical?.strength ?? 0) + (right.physical?.strength ?? 0),
      endurance: (left.physical?.endurance ?? 0) + (right.physical?.endurance ?? 0),
    },
    tactical: {
      awareness: (left.tactical?.awareness ?? 0) + (right.tactical?.awareness ?? 0),
      reaction: (left.tactical?.reaction ?? 0) + (right.tactical?.reaction ?? 0),
    },
    cognitive: {
      analysis: (left.cognitive?.analysis ?? 0) + (right.cognitive?.analysis ?? 0),
      investigation: (left.cognitive?.investigation ?? 0) + (right.cognitive?.investigation ?? 0),
    },
    social: {
      negotiation: (left.social?.negotiation ?? 0) + (right.social?.negotiation ?? 0),
      influence: (left.social?.influence ?? 0) + (right.social?.influence ?? 0),
    },
    stability: {
      resistance: (left.stability?.resistance ?? 0) + (right.stability?.resistance ?? 0),
      tolerance: (left.stability?.tolerance ?? 0) + (right.stability?.tolerance ?? 0),
    },
    technical: {
      equipment: (left.technical?.equipment ?? 0) + (right.technical?.equipment ?? 0),
      anomaly: (left.technical?.anomaly ?? 0) + (right.technical?.anomaly ?? 0),
    },
  }
}

function buildContextTagSet(context: EquipmentEvaluationContext) {
  return new Set([
    ...(context.caseData?.tags ?? []),
    ...(context.caseData?.requiredTags ?? []),
    ...(context.caseData?.preferredTags ?? []),
    ...(context.supportTags ?? []),
    ...(context.teamTags ?? []),
  ])
}

function ruleMatchesContext(rule: EquipmentContextRule, context: EquipmentEvaluationContext) {
  if (rule.kinds && rule.kinds.length > 0) {
    if (!context.caseData || !rule.kinds.includes(context.caseData.kind)) {
      return false
    }
  }

  if (rule.minDurationWeeks !== undefined) {
    if ((context.caseData?.durationWeeks ?? 0) < rule.minDurationWeeks) {
      return false
    }
  }

  if (rule.minWeights) {
    if (!context.caseData) {
      return false
    }

    for (const [key, minWeight] of Object.entries(rule.minWeights) as [StatKey, number][]) {
      if ((context.caseData.weights[key] ?? 0) < minWeight) {
        return false
      }
    }
  }

  if (rule.requiredTags && rule.requiredTags.length > 0) {
    const contextTags = buildContextTagSet(context)
    if (!rule.requiredTags.some((tag) => contextTags.has(tag))) {
      return false
    }
  }

  return true
}

function resolveContextualModifiers(
  definition: EquipmentDefinition,
  quality: number,
  context: EquipmentEvaluationContext
) {
  return (definition.contextModifiers ?? []).reduce<Partial<DomainStats>>((merged, modifier) => {
    if (!ruleMatchesContext(modifier.rule, context)) {
      return merged
    }

    return mergeScaledModifiers(merged, scaleStatModifiers(modifier.statModifiers, quality))
  }, {})
}

function resolveEnchantmentsForItem(definition: EquipmentDefinition): EquipmentEnchantment[] {
  const enchantmentIds = definition.enchantmentIds ?? []
  return enchantmentIds
    .map((id) => ENCHANTMENT_CATALOG[id])
    .filter((enchantment): enchantment is EquipmentEnchantment => Boolean(enchantment))
}

function resolveActiveEnchantments(
  enchantments: EquipmentEnchantment[],
  context: EquipmentEvaluationContext
): EquipmentEnchantment[] {
  return enchantments.filter((enchantment) => {
    if (!enchantment.activationRule) {
      return true
    }

    return ruleMatchesContext(enchantment.activationRule, context)
  })
}

function mergeEnchantmentModifiers(
  enchantments: EquipmentEnchantment[],
  quality: number
): Partial<DomainStats> {
  return enchantments.reduce<Partial<DomainStats>>((merged, enchantment) => {
    return mergeScaledModifiers(merged, scaleStatModifiers(enchantment.statModifiers, quality))
  }, {})
}

function resolveActiveEquipmentSets(items: EquipmentItem[]): EquipmentSet[] {
  const equippedItemIds = new Set(items.map((item) => item.id))
  return Object.values(EQUIPMENT_SETS).filter((set) => {
    const itemsInSet = set.itemIds.filter((id) => equippedItemIds.has(id))
    return itemsInSet.length >= 2
  })
}

function calculateSetBonuses(sets: EquipmentSet[], items: EquipmentItem[]): Partial<DomainStats> {
  const equippedItemIds = new Set(items.map((item) => item.id))
  const avgQuality =
    items.length > 0 ? items.reduce((sum, item) => sum + item.quality, 0) / items.length : 1

  return sets.reduce<Partial<DomainStats>>((merged, set) => {
    const itemsInSet = set.itemIds.filter((id) => equippedItemIds.has(id))
    const itemCount = itemsInSet.length

    let bonus: Partial<DomainStats> | undefined
    if (itemCount === set.itemIds.length) {
      bonus = set.bonuses.complete
    } else if (itemCount === 3 && set.bonuses[3]) {
      bonus = set.bonuses[3]
    } else if (itemCount >= 2) {
      bonus = set.bonuses[2]
    }

    if (bonus) {
      return mergeScaledModifiers(merged, scaleStatModifiers(bonus, avgQuality))
    }

    return merged
  }, {})
}

export function getEquipmentDefinition(itemId: string) {
  return EQUIPMENT_CATALOG[itemId]
}

export function getEquipmentLabel(itemId: string) {
  return EQUIPMENT_CATALOG[itemId]?.name ?? itemId
}

export function getEquipmentTags(itemId: string) {
  return [...(EQUIPMENT_CATALOG[itemId]?.tags ?? [])]
}

export function hasEquipmentStatModifiers(modifiers: Partial<DomainStats>) {
  return Object.values(modifiers).some(
    (domain) =>
      domain !== undefined &&
      Object.values(domain).some(
        (value) => typeof value === 'number' && Number.isFinite(value) && value !== 0
      )
  )
}

export function resolveEquippedItems(
  agent: Agent,
  context: EquipmentEvaluationContext = {}
): EquipmentItem[] {
  return EQUIPMENT_SLOT_KINDS.map((slot) => {
    const itemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
    if (!itemId) {
      return null
    }

    const definition = getEquipmentDefinition(itemId)
    if (!definition || !definition.allowedSlots.includes(slot)) {
      return null
    }

    const quality = getItemQuality(agent, definition)
    const baseModifiers = scaleStatModifiers(definition.statModifiers, quality)
    const activeModifiers = resolveContextualModifiers(definition, quality, context)
    const contextActive = hasEquipmentStatModifiers(activeModifiers)

    // Resolve enchantments
    const enchantments = resolveEnchantmentsForItem(definition)
    const activeEnchantments = resolveActiveEnchantments(enchantments, context)
    const enchantmentModifiers = mergeEnchantmentModifiers(activeEnchantments, quality)

    return {
      id: definition.id,
      name: definition.name,
      slot,
      quality,
      tags: [...definition.tags],
      rarity: definition.rarity ?? 'basic',
      enchantments,
      activeEnchantments,
      baseModifiers,
      statModifiers: mergeScaledModifiers(
        mergeScaledModifiers(baseModifiers, activeModifiers),
        enchantmentModifiers
      ),
      activeModifiers,
      contextActive,
    } satisfies EquipmentItem
  }).filter((item): item is EquipmentItem => Boolean(item))
}

function buildLoadoutSummary(items: EquipmentItem[], slotCount: number): EquipmentLoadoutSummary {
  return {
    slotCount,
    equippedItemCount: items.length,
    emptySlotCount: Math.max(0, slotCount - items.length),
    activeContextItemCount: items.filter((item) => item.contextActive).length,
    loadoutQuality: items.reduce((total, item) => total + item.quality, 0),
    equippedItemIds: items.map((item) => item.id),
    equippedTags: [...new Set(items.flatMap((item) => item.tags))].sort((left, right) =>
      left.localeCompare(right)
    ),
  }
}

export function buildAgentEquipmentSummary(
  agent: Agent,
  context: EquipmentEvaluationContext = {}
): EquipmentLoadoutSummary {
  return buildLoadoutSummary(resolveEquippedItems(agent, context), EQUIPMENT_SLOT_KINDS.length)
}

export function buildTeamEquipmentSummary(
  agents: Agent[],
  context: EquipmentEvaluationContext = {}
): TeamEquipmentSummary {
  const equippedItems = agents.flatMap((agent) => resolveEquippedItems(agent, context))
  return {
    ...buildLoadoutSummary(equippedItems, agents.length * EQUIPMENT_SLOT_KINDS.length),
    agentCount: agents.length,
    equippedItems,
  }
}

export function mergeEquipmentStatModifiers(
  items: EquipmentItem[],
  includeSetBonuses: boolean = true
): Partial<DomainStats> {
  const itemModifiers = items.reduce<Partial<DomainStats>>(
    (merged, item) => mergeScaledModifiers(merged, item.statModifiers),
    {}
  )

  if (!includeSetBonuses) {
    return itemModifiers
  }

  const activeSets = resolveActiveEquipmentSets(items)
  const setBonus = calculateSetBonuses(activeSets, items)

  return mergeScaledModifiers(itemModifiers, setBonus)
}

export function applyEquipmentModifiers(
  stats: DomainStats,
  equipmentModifiers: Partial<DomainStats>
): DomainStats {
  const result = cloneDomainStats(stats)

  if (equipmentModifiers.physical) {
    result.physical.strength += equipmentModifiers.physical.strength ?? 0
    result.physical.endurance += equipmentModifiers.physical.endurance ?? 0
  }

  if (equipmentModifiers.tactical) {
    result.tactical.awareness += equipmentModifiers.tactical.awareness ?? 0
    result.tactical.reaction += equipmentModifiers.tactical.reaction ?? 0
  }

  if (equipmentModifiers.cognitive) {
    result.cognitive.analysis += equipmentModifiers.cognitive.analysis ?? 0
    result.cognitive.investigation += equipmentModifiers.cognitive.investigation ?? 0
  }

  if (equipmentModifiers.social) {
    result.social.negotiation += equipmentModifiers.social.negotiation ?? 0
    result.social.influence += equipmentModifiers.social.influence ?? 0
  }

  if (equipmentModifiers.stability) {
    result.stability.resistance += equipmentModifiers.stability.resistance ?? 0
    result.stability.tolerance += equipmentModifiers.stability.tolerance ?? 0
  }

  if (equipmentModifiers.technical) {
    result.technical.equipment += equipmentModifiers.technical.equipment ?? 0
    result.technical.anomaly += equipmentModifiers.technical.anomaly ?? 0
  }

  return result
}

export function resolveAgentEquipmentModifiers(
  agent: Agent,
  context: EquipmentEvaluationContext = {}
) {
  return mergeEquipmentStatModifiers(resolveEquippedItems(agent, context))
}
