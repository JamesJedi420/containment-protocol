import { inventoryItemLabels } from '../data/production'
import { appendOperationEventDrafts } from './events'
import { getAgencyProgressionUnlockLabel, hasAgencyProgressionUnlock } from './agencyProgression'
import { getFactionDefinition, inferFactionIdFromCaseTags } from './factions'
import { sanitizePersistedFieldBasePacket } from './fieldBaseStaging'
import { createMissionIntelState } from './intel'
import { clamp, createSeededRng, normalizeSeed } from './math'
import { applyRivalPressureToContractScalar, buildRivalPressure } from './rivalPressure'
import { getCompletedResearchUnlockIds } from './research'
import {
  buildContractInventoryRewards,
  getContractFundingReward,
  getContractOutcomeRewardMultiplier,
  getContractResearchUnlocks,
} from './contractsRuntime'
import type {
  ActiveContractRuntime,
  CaseInstance,
  CaseTemplate,
  ContractChainDefinition,
  ContractDebriefChangedEntity,
  ContractDebriefRecord,
  ContractDebriefStrategicOption,
  ContractDebriefUnresolvedClock,
  ContractHistoryRecord,
  ContractMaterialDrop,
  ContractModifier,
  ContractNextIntent,
  ContractOffer,
  ContractResearchUnlock,
  ContractRewardPackage,
  ContractRiskLevel,
  ContractStrategyTag,
  ContractSystemState,
  GameState,
  MissionInjuryRecord,
  MissionResolutionKind,
  MissionResult,
  ReputationTier,
  StatBlock,
  Team,
  WeeklyReport,
  WeeklyReportCaseSnapshot,
} from './models'
import { previewResolutionForTeamIds } from './sim/resolve'
import { assignTeam } from './sim/assign'
import { isTeamBlockedByTraining } from './sim/training'
import { instantiateFromTemplate } from './sim/spawn'
import { computeRequiredScore } from './sim/scoring'
import { buildTeamCompositionProfile, getTeamAssignedCaseId } from './teamSimulation'
import { evaluateContractRoleFit, getContractModifierTotal } from './contractsRuntime'
import {
  deriveTownContractPacketContext,
  getTownContractSelectionBias,
  mergeTownContractCaseTags,
} from './townContractGeneration'

const CONTRACT_STRATEGY_ORDER: ContractStrategyTag[] = [
  'income',
  'materials',
  'research',
  'progression',
]

const CONTRACT_TIER_ORDER: ReputationTier[] = [
  'hostile',
  'unfriendly',
  'neutral',
  'friendly',
  'allied',
]

const CONTRACT_OFFER_COUNT = 4

export type ContractSuccessBand = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'
export type ContractRiskBand = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'

export interface ContractRewardRange {
  fundingMin: number
  fundingMax: number
  materials: Array<{
    itemId: string
    label: string
    quantityMin: number
    quantityMax: number
  }>
  research: ContractResearchUnlock[]
}

export interface ContractTeamEvaluation {
  team: Team
  successBand: ContractSuccessBand
  injuryRiskBand: ContractRiskBand
  deathRiskBand: ContractRiskBand
  roleFit: ReturnType<typeof evaluateContractRoleFit>
  rewardRange: ContractRewardRange
  preview: ReturnType<typeof previewResolutionForTeamIds>
  partyOvr: number
}

export type ContractCatalogAvailabilityState = 'available' | 'active' | 'locked' | 'standby'

export interface ContractCatalogEntry {
  boardId: string
  templateId: string
  offerId?: string
  name: string
  description: string
  factionId?: string
  contactId?: string
  strategyTag: ContractStrategyTag
  difficulty: number
  riskLevel: ContractRiskLevel
  durationWeeks: number
  rewards: ContractRewardPackage
  requirements: ContractOffer['requirements']
  modifiers: ContractModifier[]
  chain: ContractChainDefinition
  availabilityState: ContractCatalogAvailabilityState
  blockerCodes: string[]
  blockerDetails: string[]
}

interface ContractTemplateDefinition {
  id: string
  name: string
  description: string
  caseTemplateId: string
  factionId?: string
  strategyTag: ContractStrategyTag
  durationWeeks?: number
  baseDifficultyScalar: number
  baseRewards: ContractRewardPackage
  requirements: ContractOffer['requirements']
  modifiers: ContractModifier[]
  chain: ContractChainDefinition
  /** SPE-1654: optional expedition staging packet (deterministic hooks only). */
  fieldBase?: ContractOffer['fieldBase']
  availability?: {
    minFactionTier?: ReputationTier
    maxFactionTier?: ReputationTier
  }
}

const CONTRACT_RESEARCH_UNLOCKS: Record<string, ContractResearchUnlock> = {
  'archive-ledger-index': {
    id: 'archive-ledger-index',
    label: 'Archive Ledger Index',
    description: 'Recovered catalog keys that open deeper institutional dossier contracts.',
  },
  'occult-spectrum-atlas': {
    id: 'occult-spectrum-atlas',
    label: 'Occult Spectrum Atlas',
    description: 'Pattern notes that improve access to occult collection and reagent chains.',
  },
  'burn-after-read-protocol': {
    id: 'burn-after-read-protocol',
    label: 'Burn-After-Read Protocol',
    description: 'A compartmentalized black-budget process that unlocks deniable follow-on work.',
  },
  'liturgic-containment-index': {
    id: 'liturgic-containment-index',
    label: 'Liturgic Containment Index',
    description:
      'Recovered rite indices that open deeper occult-response catalog and containment work.',
  },
} as const

const CONTRACT_TEMPLATES: readonly ContractTemplateDefinition[] = [
  // --- Year 2 Expansion ---
  {
    id: 'ops-blacksite-recon',
    name: 'Blacksite Recon Sweep',
    description:
      'A dormant blacksite has come back online after a decade dark. Factional interest is high, and the site is rumored to contain both classified research and hazardous materials. Multiple teams are recommended for parallel sweep and containment.',
    caseTemplateId: 'combat-001',
    factionId: 'oversight',
    strategyTag: 'materials',
    durationWeeks: 3,
    baseDifficultyScalar: 1.2,
    baseRewards: {
      funding: 40,
      materials: [
        { itemId: 'hazmat_kit', label: 'Hazmat Kit', quantity: 1 },
        { itemId: 'classified_docs', label: 'Classified Docs', quantity: 1 },
      ],
      research: [CONTRACT_RESEARCH_UNLOCKS['burn-after-read-protocol']],
    },
    requirements: {
      recommendedClasses: ['field_recon', 'tech'],
      discouragedClasses: ['negotiator'],
    },
    modifiers: [
      {
        id: 'blacksite-hazard',
        label: 'Hazardous Site',
        description: 'Injury risk is elevated due to unknown containment failures.',
        effect: 'injury_risk',
        value: 8,
      },
      {
        id: 'classified-access',
        label: 'Classified Access',
        description: 'Unlocks additional research if completed successfully.',
        effect: 'reward_bonus',
        value: 0.7,
      },
    ],
    chain: {
      nextContracts: ['ops-blacksite-exfil'],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  {
    id: 'ops-blacksite-exfil',
    name: 'Blacksite Exfiltration',
    description:
      'Following the recon sweep, a hostile force is attempting to extract sensitive assets from the blacksite. Teams must intercept and secure the exfil route before the convoy escapes.',
    caseTemplateId: 'combat-001',
    factionId: 'oversight',
    strategyTag: 'income',
    durationWeeks: 2,
    baseDifficultyScalar: 1.3,
    baseRewards: {
      funding: 50,
      materials: [
        { itemId: 'warding_resin', label: 'Warding Resin', quantity: 2 },
        { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 1 },
      ],
    },
    requirements: {
      recommendedClasses: ['combat', 'field_recon'],
      discouragedClasses: ['scholar'],
    },
    modifiers: [
      {
        id: 'exfil-timer',
        label: 'Tight Exfil Timer',
        description: 'Shortened window increases pressure and risk.',
        effect: 'difficulty_flat',
        value: 4,
      },
    ],
    chain: {
      unlockConditions: [
        {
          type: 'completed_contract',
          contractTemplateId: 'ops-blacksite-recon',
          minimumOutcome: 'partial',
        },
      ],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  {
    id: 'institutions-ritual-archive',
    name: 'Ritual Archive Recovery',
    description:
      'A hidden ritual archive has been discovered beneath a university annex. The site is unstable and may collapse if not handled with care. Teams must recover occult records and secure hazardous materials.',
    caseTemplateId: 'puzzle_whispering_archive',
    factionId: 'institutions',
    strategyTag: 'research',
    durationWeeks: 3,
    baseDifficultyScalar: 1.15,
    baseRewards: {
      funding: 28,
      research: [CONTRACT_RESEARCH_UNLOCKS['liturgic-containment-index']],
      materials: [
        { itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 2 },
        { itemId: 'hazmat_kit', label: 'Hazmat Kit', quantity: 1 },
      ],
    },
    requirements: {
      recommendedClasses: ['scholar', 'medium'],
      discouragedClasses: ['combat'],
    },
    modifiers: [
      {
        id: 'archive-instability',
        label: 'Unstable Archive',
        description: 'Site instability increases risk of partial failure.',
        effect: 'injury_risk',
        value: 5,
      },
    ],
    chain: {
      unlockConditions: [
        {
          type: 'research_unlocked',
          researchId: 'occult-spectrum-atlas',
        },
      ],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  // --- End Year 2 Expansion ---
  {
    id: 'oversight-lockdown-retainer',
    name: 'Oversight Lockdown Retainer',
    description:
      'Oversight needs a rapid-response team on call to stabilize a live containment spill before it becomes public-facing.',
    caseTemplateId: 'chem-001',
    factionId: 'oversight',
    strategyTag: 'income',
    durationWeeks: 2,
    baseDifficultyScalar: 0.96,
    baseRewards: {
      funding: 30,
      materials: [{ itemId: 'warding_resin', label: 'Warding Resin', quantity: 2 }],
    },
    requirements: {
      recommendedClasses: ['tech', 'field_recon'],
      discouragedClasses: ['negotiator'],
    },
    modifiers: [
      {
        id: 'oversight-retainer-bonus',
        label: 'Retainer clause',
        description: 'Oversight pays out quickly when the incident is handled cleanly.',
        effect: 'reward_bonus',
        value: 0.5,
      },
    ],
    chain: {
      nextContracts: ['oversight-clean-room-audit'],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  {
    id: 'oversight-clean-room-audit',
    name: 'Clean Room Audit Window',
    description:
      'Oversight wants a team to seal a classified archive and verify no contaminated paper trail survives the breach response.',
    caseTemplateId: 'ops-003',
    factionId: 'oversight',
    strategyTag: 'progression',
    durationWeeks: 2,
    baseDifficultyScalar: 1.08,
    baseRewards: {
      funding: 34,
      materials: [{ itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 2 }],
    },
    requirements: {
      recommendedClasses: ['investigator', 'field_recon'],
      discouragedClasses: ['hunter'],
    },
    modifiers: [
      {
        id: 'oversight-clean-room-pressure',
        label: 'Compressed approval window',
        description: 'Tighter oversight demands make the operation less forgiving.',
        effect: 'difficulty_flat',
        value: 3,
      },
    ],
    chain: {
      unlockConditions: [
        {
          type: 'completed_contract',
          contractTemplateId: 'oversight-lockdown-retainer',
          minimumOutcome: 'partial',
        },
      ],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'institutions-ledger-recovery',
    name: 'Ledger Recovery Order',
    description:
      'Academic partners need sealed record access restored before a purge cycle wipes the evidence chain clean.',
    caseTemplateId: 'ops-003',
    factionId: 'institutions',
    strategyTag: 'research',
    durationWeeks: 2,
    baseDifficultyScalar: 1,
    baseRewards: {
      funding: 20,
      research: [CONTRACT_RESEARCH_UNLOCKS['archive-ledger-index']],
    },
    requirements: {
      recommendedClasses: ['investigator', 'field_recon'],
      discouragedClasses: ['hunter'],
    },
    modifiers: [
      {
        id: 'ledger-paper-trail',
        label: 'Paper trail',
        description: 'Structured evidence flow improves overall contract success.',
        effect: 'success_bonus',
        value: 1.8,
      },
    ],
    chain: {
      nextContracts: ['institutions-annex-breach'],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  {
    id: 'institutions-annex-breach',
    name: 'Annex Breach Review',
    description:
      'A sealed research annex is slipping out of archival custody and needs a disciplined recovery team before the site shutters itself.',
    caseTemplateId: 'puzzle_whispering_archive',
    factionId: 'institutions',
    strategyTag: 'research',
    durationWeeks: 3,
    baseDifficultyScalar: 1.16,
    baseRewards: {
      funding: 24,
      research: [CONTRACT_RESEARCH_UNLOCKS['occult-spectrum-atlas']],
      materials: [{ itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 2 }],
    },
    requirements: {
      recommendedClasses: ['investigator', 'medium'],
      discouragedClasses: ['hunter'],
    },
    modifiers: [
      {
        id: 'annex-instability',
        label: 'Instability',
        description: 'Cognitive bleed raises injury exposure if the operation drags.',
        effect: 'injury_risk',
        value: 6,
      },
    ],
    chain: {
      unlockConditions: [
        {
          type: 'completed_contract',
          contractTemplateId: 'institutions-ledger-recovery',
          minimumOutcome: 'success',
        },
        {
          type: 'research_unlocked',
          researchId: 'archive-ledger-index',
        },
      ],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'supply-salvage-window',
    name: 'Supply Salvage Window',
    description:
      'Corporate suppliers are willing to release rare salvage if a contamination route is cleared before the next procurement handoff.',
    caseTemplateId: 'ops-006',
    factionId: 'corporate_supply',
    strategyTag: 'materials',
    durationWeeks: 1,
    baseDifficultyScalar: 0.92,
    baseRewards: {
      funding: 12,
      materials: [
        { itemId: 'medical_supplies', label: 'Medical Supplies', quantity: 3 },
        { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 2 },
      ],
    },
    requirements: {
      recommendedClasses: ['medic', 'field_recon'],
      discouragedClasses: ['negotiator'],
    },
    modifiers: [
      {
        id: 'salvage-exposure',
        label: 'Residue exposure',
        description: 'Supply-chain salvage comes with moderate exposure risk.',
        effect: 'injury_risk',
        value: 4,
      },
    ],
    chain: {
      nextContracts: ['supply-occult-salvage'],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  {
    id: 'supply-occult-salvage',
    name: 'Occult Salvage Reclamation',
    description:
      'A preferred supplier will release occult stockpiles if the recovered inventory can be authenticated in the field.',
    caseTemplateId: 'ops-005',
    factionId: 'corporate_supply',
    strategyTag: 'materials',
    durationWeeks: 2,
    baseDifficultyScalar: 1.12,
    baseRewards: {
      funding: 16,
      materials: [
        { itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 3 },
        { itemId: 'warding_resin', label: 'Warding Resin', quantity: 2 },
      ],
    },
    requirements: {
      recommendedClasses: ['occultist', 'field_recon'],
      discouragedClasses: ['negotiator'],
    },
    modifiers: [
      {
        id: 'ritual-residue',
        label: 'Ritual residue',
        description: 'Unstable stockpiles slightly raise both difficulty and exposure.',
        effect: 'difficulty_flat',
        value: 2,
      },
      {
        id: 'ritual-residue-risk',
        label: 'Backwash risk',
        description: 'Mishandled salvage can turn lethal in a hurry.',
        effect: 'death_risk',
        value: 4,
      },
    ],
    chain: {
      unlockConditions: [
        {
          type: 'completed_contract',
          contractTemplateId: 'supply-salvage-window',
          minimumOutcome: 'partial',
        },
      ],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'black-budget-ghost-intercept',
    name: 'Ghost Intercept',
    description:
      'A black-budget handler is offering deniable funding if your team can collapse a ghost relay without leaving a trace in the chain.',
    caseTemplateId: 'ops-001',
    factionId: 'black_budget',
    strategyTag: 'progression',
    durationWeeks: 2,
    baseDifficultyScalar: 1.04,
    baseRewards: {
      funding: 26,
      research: [CONTRACT_RESEARCH_UNLOCKS['burn-after-read-protocol']],
    },
    requirements: {
      recommendedClasses: ['field_recon', 'tech'],
      discouragedClasses: ['medic'],
    },
    modifiers: [
      {
        id: 'burn-window',
        label: 'Burn window',
        description: 'Fast-moving covert work rewards clean execution.',
        effect: 'success_bonus',
        value: 1.2,
      },
      {
        id: 'deniable-funding',
        label: 'Deniable funding',
        description: 'Black-budget work pays above the board rate.',
        effect: 'reward_bonus',
        value: 0.7,
      },
    ],
    chain: {
      nextContracts: ['black-budget-clean-exfil'],
    },
    availability: {
      minFactionTier: 'neutral',
    },
  },
  {
    id: 'black-budget-clean-exfil',
    name: 'Clean Exfil Corridor',
    description:
      'A covert transfer chain is exposed and needs a disciplined team to recover assets before the corridor burns down.',
    caseTemplateId: 'info-001',
    factionId: 'black_budget',
    strategyTag: 'progression',
    durationWeeks: 3,
    baseDifficultyScalar: 1.18,
    baseRewards: {
      funding: 38,
      materials: [{ itemId: 'ballistic_supplies', label: 'Ballistic Supplies', quantity: 2 }],
    },
    requirements: {
      recommendedClasses: ['field_recon', 'hunter'],
      discouragedClasses: ['negotiator'],
    },
    modifiers: [
      {
        id: 'crossfire-pressure',
        label: 'Crossfire pressure',
        description: 'The corridor is violent enough to raise injury exposure.',
        effect: 'injury_risk',
        value: 8,
      },
      {
        id: 'terminal-window',
        label: 'Terminal window',
        description: 'Failure can become catastrophic once the exfil starts moving.',
        effect: 'death_risk',
        value: 6,
      },
    ],
    chain: {
      unlockConditions: [
        {
          type: 'completed_contract',
          contractTemplateId: 'black-budget-ghost-intercept',
          minimumOutcome: 'success',
        },
      ],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'oversight-compliance-dragnet',
    name: 'Compliance Dragnet',
    description:
      'Relations with Oversight have soured. The resulting contract work is mostly damage control, forced documentation, and politically dangerous cleanup.',
    caseTemplateId: 'ops-004',
    factionId: 'oversight',
    strategyTag: 'income',
    durationWeeks: 1,
    baseDifficultyScalar: 1.02,
    baseRewards: {
      funding: 22,
    },
    requirements: {
      recommendedClasses: ['negotiator', 'field_recon'],
      discouragedClasses: ['hunter'],
    },
    modifiers: [
      {
        id: 'hostile-scrutiny',
        label: 'Hostile scrutiny',
        description: 'Adverse oversight adds pressure and failure risk.',
        effect: 'difficulty_flat',
        value: 2,
      },
      {
        id: 'hostile-scrutiny-risk',
        label: 'Political blowback',
        description: 'A bad outcome here is more damaging than usual.',
        effect: 'injury_risk',
        value: 2,
      },
    ],
    chain: {},
    availability: {
      maxFactionTier: 'unfriendly',
    },
  },
  {
    id: 'corporate-counterintel-screen',
    name: 'Counterintel Screen',
    description:
      'A hostile supplier network is probing your acquisition channels. The contract is risky, but it can blunt infiltration pressure and recover seized stock.',
    caseTemplateId: 'info-001',
    factionId: 'corporate_supply',
    strategyTag: 'materials',
    durationWeeks: 2,
    baseDifficultyScalar: 1.1,
    baseRewards: {
      funding: 18,
      materials: [{ itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 3 }],
    },
    requirements: {
      recommendedClasses: ['tech', 'field_recon'],
      discouragedClasses: ['medic'],
    },
    modifiers: [
      {
        id: 'counterintel-window',
        label: 'Counterintel window',
        description: 'Adversarial work raises both difficulty and casualty exposure.',
        effect: 'difficulty_flat',
        value: 3,
      },
      {
        id: 'counterintel-fatality',
        label: 'Unknown variable escalation',
        description: 'Counterintel failures can turn lethal fast.',
        effect: 'death_risk',
        value: 5,
      },
    ],
    chain: {},
    availability: {
      maxFactionTier: 'unfriendly',
    },
  },
  {
    id: 'institutions-liturgy-expedition',
    name: 'Liturgy Expedition',
    description:
      'Recovered containment liturgy has opened a narrow expedition window into an institutional archive vault before rival custodians can erase the trail.',
    fieldBase: {
      label: 'vault-approach-bivouac',
      quality: { safety: 2, medical: 2, supply: 3, extractionAccess: 1 },
    },
    caseTemplateId: 'occult-005',
    factionId: 'institutions',
    strategyTag: 'research',
    durationWeeks: 3,
    baseDifficultyScalar: 1.28,
    baseRewards: {
      funding: 22,
      materials: [
        { itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 3 },
        { itemId: 'warding_resin', label: 'Warding Resin', quantity: 2 },
      ],
      research: [CONTRACT_RESEARCH_UNLOCKS['liturgic-containment-index']],
    },
    requirements: {
      recommendedClasses: ['investigator', 'medium', 'field_recon'],
      discouragedClasses: ['hunter'],
    },
    modifiers: [
      {
        id: 'liturgy-expedition-window',
        label: 'Liturgical anchor points',
        description: 'Clear rite mapping slightly improves clean execution odds.',
        effect: 'success_bonus',
        value: 2.2,
      },
    ],
    chain: {
      unlockConditions: [{ type: 'progression_unlock', unlockId: 'containment-liturgy' }],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'oversight-anchor-restoration',
    name: 'Anchor Restoration Protocol',
    description:
      'Oversight is authorizing a high-tier anomaly stabilization run to restore a fractured anchor chain before the next sectoral collapse cycle hits.',
    caseTemplateId: 'escalation-001',
    factionId: 'oversight',
    strategyTag: 'progression',
    durationWeeks: 3,
    baseDifficultyScalar: 1.34,
    baseRewards: {
      funding: 24,
      materials: [
        { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 3 },
        { itemId: 'warding_resin', label: 'Warding Resin', quantity: 2 },
      ],
    },
    requirements: {
      recommendedClasses: ['tech', 'investigator', 'field_recon'],
      discouragedClasses: ['negotiator'],
    },
    modifiers: [
      {
        id: 'anchor-protocol-burden',
        label: 'Anchor synchronization burden',
        description: 'The restoration window is less forgiving than standard containment work.',
        effect: 'difficulty_flat',
        value: 4,
      },
    ],
    chain: {
      unlockConditions: [{ type: 'progression_unlock', unlockId: 'fracture-anchor-protocol' }],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'black-budget-cult-burn',
    name: 'Cult Burn Operation',
    description:
      'Black-budget handlers are offering a deniable strike contract against ritual infrastructure identified in the counter-cult dossier.',
    caseTemplateId: 'ops-007',
    factionId: 'black_budget',
    strategyTag: 'income',
    durationWeeks: 2,
    baseDifficultyScalar: 1.26,
    baseRewards: {
      funding: 46,
      materials: [{ itemId: 'ballistic_supplies', label: 'Ballistic Supplies', quantity: 2 }],
    },
    requirements: {
      recommendedClasses: ['field_recon', 'negotiator', 'hunter'],
      discouragedClasses: ['medic'],
    },
    modifiers: [
      {
        id: 'cult-burn-overwatch',
        label: 'Prepared kill chain',
        description: 'Actionable dossier intelligence improves mission payoff.',
        effect: 'reward_bonus',
        value: 0.8,
      },
      {
        id: 'cult-burn-retaliation',
        label: 'Retaliation risk',
        description: 'A failed burn can get lethal quickly.',
        effect: 'death_risk',
        value: 5,
      },
    ],
    chain: {
      unlockConditions: [{ type: 'progression_unlock', unlockId: 'counter-cult-dossier' }],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'black-budget-stormgrid-burn',
    name: 'Stormgrid Relay Burn',
    description:
      'Telemetry from the stormgrid has exposed a narrow relay-collapse window for a covert black-budget interdiction team.',
    caseTemplateId: 'info-001',
    factionId: 'black_budget',
    strategyTag: 'materials',
    durationWeeks: 3,
    baseDifficultyScalar: 1.36,
    baseRewards: {
      funding: 28,
      materials: [
        { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 4 },
        { itemId: 'ballistic_supplies', label: 'Ballistic Supplies', quantity: 2 },
      ],
    },
    requirements: {
      recommendedClasses: ['tech', 'field_recon', 'investigator'],
      discouragedClasses: ['medic'],
    },
    modifiers: [
      {
        id: 'stormgrid-relay-chaos',
        label: 'Relay instability',
        description:
          'Unstable relay cutovers make the operation harsher than normal intercept work.',
        effect: 'injury_risk',
        value: 6,
      },
    ],
    chain: {
      unlockConditions: [{ type: 'progression_unlock', unlockId: 'stormgrid-telemetry' }],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
  {
    id: 'oversight-blacksite-retrofit',
    name: 'Blacksite Retrofit Recovery',
    description:
      'Oversight has opened a retrofit recovery window to secure recovered evidence-control infrastructure before automated purge logic catches up.',
    caseTemplateId: 'ops-008',
    factionId: 'oversight',
    strategyTag: 'materials',
    durationWeeks: 3,
    baseDifficultyScalar: 1.32,
    baseRewards: {
      funding: 26,
      materials: [
        { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 3 },
        { itemId: 'medical_supplies', label: 'Medical Supplies', quantity: 3 },
      ],
    },
    requirements: {
      recommendedClasses: ['investigator', 'tech', 'field_recon'],
      discouragedClasses: ['hunter'],
    },
    modifiers: [
      {
        id: 'retrofit-custody-window',
        label: 'Custody chain window',
        description: 'Recovered retrofit records make successful salvage more valuable.',
        effect: 'reward_bonus',
        value: 0.6,
      },
    ],
    chain: {
      unlockConditions: [{ type: 'progression_unlock', unlockId: 'blacksite-retrofit' }],
    },
    availability: {
      minFactionTier: 'friendly',
    },
  },
] as const

function createEmptyContractSystemState(): ContractSystemState {
  return {
    generatedWeek: 0,
    offers: [],
    history: {},
    unlockedResearchIds: [],
  }
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return normalizeSeed(hash >>> 0)
}

function getTierRank(tier: ReputationTier) {
  return CONTRACT_TIER_ORDER.indexOf(tier)
}

function compareOutcomeRank(
  left: MissionResolutionKind | 'none',
  right: MissionResolutionKind | 'none'
) {
  const order: Array<MissionResolutionKind | 'none'> = [
    'none',
    'unresolved',
    'fail',
    'partial',
    'success',
  ]
  return order.indexOf(left) - order.indexOf(right)
}

function getOutcomeMeetsMinimum(
  value: MissionResolutionKind | 'none',
  minimum: MissionResolutionKind | undefined
) {
  if (!minimum) {
    return value === 'partial' || value === 'success'
  }

  return compareOutcomeRank(value, minimum) >= 0
}

function getFactionTier(state: GameState, factionId: string | undefined): ReputationTier {
  return factionId ? (state.factions?.[factionId]?.reputationTier ?? 'neutral') : 'neutral'
}

function getFactionRewardMultiplier(state: GameState, factionId: string | undefined) {
  switch (getFactionTier(state, factionId)) {
    case 'hostile':
      return 1.12
    case 'unfriendly':
      return 1.03
    case 'friendly':
      return 1.15
    case 'allied':
      return 1.28
    default:
      return 1
  }
}

function getHistorySignature(history: ContractSystemState['history']) {
  return Object.entries(history)
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(
      ([templateId, record]) =>
        `${templateId}:${record.completions}:${record.bestOutcome}:${record.lastOutcome ?? 'none'}:${record.lastCompletedWeek ?? 0}`
    )
    .join('|')
}

function buildContractSeed(state: GameState, salt: string) {
  const contracts = sanitizeContractSystemState(state.contracts)
  const factionSignature = Object.values(state.factions ?? {})
    .map((faction) => `${faction.id}:${faction.reputationTier}:${faction.reputation}`)
    .sort((left, right) => left.localeCompare(right))
    .join('|')

  return hashString(
    [
      state.rngSeed,
      state.week,
      salt,
      contracts.unlockedResearchIds
        .slice()
        .sort((left, right) => left.localeCompare(right))
        .join('|'),
      getHistorySignature(contracts.history),
      factionSignature,
    ].join('::')
  )
}

function getCurrentProgressionFactor(state: GameState) {
  const reportsCompleted = state.reports.length
  const academy = state.academyTier ?? 0

  return clamp(
    0.16 +
      (state.week - 1) * 0.035 +
      Math.max(0, state.clearanceLevel - 1) * 0.06 +
      academy * 0.04 +
      reportsCompleted * 0.01,
    0.16,
    0.95
  )
}

function getAvailablePowerFactor(state: GameState) {
  const availableTeams = Object.values(state.teams).filter(
    (team) => !getTeamAssignedCaseId(team) && !isTeamBlockedByTraining(team, state.agents)
  )

  if (availableTeams.length === 0) {
    return 0.22
  }

  const profiles = availableTeams.map((team) => buildTeamCompositionProfile(team, state.agents))
  const bestOverall = Math.max(...profiles.map((profile) => profile.derivedStats.overall), 0)
  const averageOverall =
    profiles.reduce((sum, profile) => sum + profile.derivedStats.overall, 0) / profiles.length

  return clamp((bestOverall * 0.65 + averageOverall * 0.35) / 100, 0.18, 0.98)
}

function cloneRewards(rewards: ContractRewardPackage): ContractRewardPackage {
  return {
    funding: rewards.funding,
    ...(rewards.materials
      ? {
          materials: rewards.materials.map((drop) => ({ ...drop })),
        }
      : {}),
    ...(rewards.research
      ? {
          research: rewards.research.map((unlock) => ({ ...unlock })),
        }
      : {}),
  }
}

function scaleDifficultyProfile(baseDifficulty: StatBlock, scalar: number, difficultyFlat: number) {
  const flatPerAxis = difficultyFlat / 4

  return {
    combat: Math.max(1, Math.round(baseDifficulty.combat * scalar + flatPerAxis)),
    investigation: Math.max(1, Math.round(baseDifficulty.investigation * scalar + flatPerAxis)),
    utility: Math.max(1, Math.round(baseDifficulty.utility * scalar + flatPerAxis)),
    social: Math.max(1, Math.round(baseDifficulty.social * scalar + flatPerAxis)),
  } satisfies StatBlock
}

function buildContractCaseSkeleton(
  offer: Pick<
    ContractOffer,
    | 'id'
    | 'templateId'
    | 'caseTemplateId'
    | 'name'
    | 'description'
    | 'factionId'
    | 'caseDifficulty'
    | 'durationWeeks'
    | 'strategyTag'
    | 'riskLevel'
    | 'rewards'
    | 'lootTableId'
    | 'requirements'
    | 'modifiers'
    | 'chain'
    | 'fieldBase'
  >,
  template: CaseTemplate,
  caseId: string,
  week = 1,
  state?: GameState
): CaseInstance {
  const townContext = state ? deriveTownContractPacketContext(state) : null
  const baseTags = [...new Set([...template.tags, 'contract', `strategy-${offer.strategyTag}`])]
  const tags = mergeTownContractCaseTags(baseTags, townContext, template.tags)

  return {
    id: caseId,
    templateId: template.templateId,
    title: offer.name,
    description: offer.description,
    factionId: offer.factionId ?? template.factionId ?? inferFactionIdFromCaseTags(template),
    contactId: template.contactId,
    contract: {
      offerId: offer.id,
      templateId: offer.templateId,
      name: offer.name,
      strategyTag: offer.strategyTag,
      riskLevel: offer.riskLevel,
      caseDifficulty: { ...offer.caseDifficulty },
      rewards: cloneRewards(offer.rewards),
      lootTableId: offer.lootTableId,
      requirements: {
        recommendedClasses: [...offer.requirements.recommendedClasses],
        discouragedClasses: [...offer.requirements.discouragedClasses],
      },
      modifiers: offer.modifiers.map((modifier) => ({ ...modifier })),
      chain: {
        ...(offer.chain.nextContracts ? { nextContracts: [...offer.chain.nextContracts] } : {}),
        ...(offer.chain.unlockConditions
          ? {
              unlockConditions: offer.chain.unlockConditions.map((condition) => ({ ...condition })),
            }
          : {}),
      },
      ...(offer.fieldBase
        ? {
            fieldBase: {
              label: offer.fieldBase.label,
              quality: { ...offer.fieldBase.quality },
            },
          }
        : {}),
    } satisfies ActiveContractRuntime,
    // Contracts always use probabilistic resolution so preview bands and live results
    // share the same continuous success model regardless of the source template mode.
    mode: 'probability',
    kind: template.kind,
    status: 'open',
    difficulty: { ...offer.caseDifficulty },
    weights: { ...template.weights },
    tags,
    requiredTags: [...(template.requiredTags ?? [])],
    requiredRoles: [...(template.requiredRoles ?? [])],
    preferredTags: [...(template.preferredTags ?? [])],
    stage: 1,
    durationWeeks: offer.durationWeeks,
    deadlineWeeks: template.deadlineWeeks,
    deadlineRemaining: template.deadlineWeeks,
    ...createMissionIntelState(week),
    assignedTeamIds: [],
    onFail: { ...template.onFail },
    onUnresolved: { ...template.onUnresolved },
    pressureValue: template.pressureValue,
    regionTag: template.regionTag,
    raid: template.raid,
  }
}

function buildOfferId(state: GameState, templateId: string, slotIndex: number) {
  return `contract-${state.week}-${slotIndex + 1}-${templateId}`
}

function getContractDefinition(templateId: string) {
  return CONTRACT_TEMPLATES.find((definition) => definition.id === templateId)
}

/** Hydration: resolve a persisted contract template id against the canonical catalog. */
export function resolveContractTemplateDefinition(templateId: string) {
  return getContractDefinition(templateId)
}

/** Contract modifier id that triggers SPE-17 execution-instability overlay (not intel-friction scoring). */
export const CONTRACT_ARCHIVE_INSTABILITY_MODIFIER_ID = 'archive-instability' as const

/**
 * Returns a stable human-readable clause description when the case's contract template
 * includes the archive-instability modifier; otherwise null.
 */
export function describeContractArchiveInstabilityClause(
  caseInstance: CaseInstance
): string | null {
  const templateId = caseInstance.contract?.templateId
  if (!templateId || typeof templateId !== 'string') {
    return null
  }
  const definition = getContractDefinition(templateId)
  const modifier = definition?.modifiers.find(
    (m) => m.id === CONTRACT_ARCHIVE_INSTABILITY_MODIFIER_ID
  )
  if (!modifier) {
    return null
  }
  return `${modifier.label}: ${modifier.description}`
}

function getContractDisplayLabel(templateId: string) {
  return getContractDefinition(templateId)?.name ?? templateId
}

function formatContractResolutionLabel(value: MissionResolutionKind | 'none' | undefined) {
  switch (value) {
    case 'success':
      return 'success'
    case 'partial':
      return 'partial'
    case 'fail':
      return 'fail'
    case 'unresolved':
      return 'unresolved'
    default:
      return 'none'
  }
}

function formatContractTierLabel(value: ReputationTier) {
  return value.replace(/_/g, ' ')
}

function formatContractIdLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildContractPreviewOffer(
  state: GameState,
  definition: ContractTemplateDefinition,
  slotIndex: number,
  progressionFactor: number,
  powerFactor: number
) {
  return (
    buildOfferFromDefinition(state, definition, slotIndex, progressionFactor, powerFactor) ?? {
      id: `contract-preview-${definition.id}`,
      templateId: definition.id,
      caseTemplateId: definition.caseTemplateId,
      name: definition.name,
      description: definition.description,
      factionId: definition.factionId,
      difficulty: 0,
      caseDifficulty: {
        combat: 1,
        investigation: 1,
        utility: 1,
        social: 1,
      },
      riskLevel: 'low' as const,
      durationWeeks:
        definition.durationWeeks ?? state.templates[definition.caseTemplateId]?.durationWeeks ?? 1,
      rewards: buildRewardPackage(state, definition),
      requirements: {
        recommendedClasses: [...definition.requirements.recommendedClasses],
        discouragedClasses: [...definition.requirements.discouragedClasses],
      },
      modifiers: definition.modifiers.map((modifier) => ({ ...modifier })),
      chain: {
        ...(definition.chain.nextContracts
          ? { nextContracts: [...definition.chain.nextContracts] }
          : {}),
        ...(definition.chain.unlockConditions
          ? {
              unlockConditions: definition.chain.unlockConditions.map((condition) => ({
                ...condition,
              })),
            }
          : {}),
      },
      strategyTag: definition.strategyTag,
      generatedWeek: state.week,
    }
  )
}

function buildSelectionScore(
  state: GameState,
  definition: ContractTemplateDefinition,
  progressionFactor: number,
  powerFactor: number
) {
  const seed = buildContractSeed(state, `${definition.id}:selection`)
  const rng = createSeededRng(seed)
  const contracts = sanitizeContractSystemState(state.contracts)
  const factionTier = getFactionTier(state, definition.factionId)
  const factionBias =
    factionTier === 'allied'
      ? 0.18
      : factionTier === 'friendly'
        ? 0.1
        : factionTier === 'hostile'
          ? 0.12
          : factionTier === 'unfriendly'
            ? 0.08
            : 0
  const freshnessPenalty =
    state.contracts?.history?.[definition.id]?.lastCompletedWeek === state.week - 1 ? 0.22 : 0
  const progressionUnlockBias = (definition.chain.unlockConditions ?? []).some(
    (condition) =>
      condition.type === 'progression_unlock' &&
      hasAgencyProgressionUnlock(state, condition.unlockId ?? '')
  )
    ? 0.45
    : 0
  const recentChainCompletionBias = (definition.chain.unlockConditions ?? []).some((condition) => {
    if (condition.type !== 'completed_contract') {
      return false
    }

    const record = contracts.history[condition.contractTemplateId ?? '']
    return (
      getOutcomeMeetsMinimum(record?.bestOutcome ?? 'none', condition.minimumOutcome) &&
      record?.lastCompletedWeek === state.week - 1
    )
  })
    ? 0.85
    : 0
  const nextIntentBias = getNextIntentSelectionBias(state, definition)
  const template = state.templates[definition.caseTemplateId]
  const townContext = deriveTownContractPacketContext(state)
  const townBias = template
    ? getTownContractSelectionBias(townContext, template.tags)
    : 0

  return (
    rng.next() +
    progressionFactor * 0.35 +
    powerFactor * 0.2 +
    factionBias +
    progressionUnlockBias +
    recentChainCompletionBias +
    nextIntentBias +
    townBias -
    freshnessPenalty
  )
}

/**
 * SPE-1496: deterministic bias term used by `buildSelectionScore` to align contract
 * ordering with the player's captured next intent. Bias is bounded and additive —
 * it never overrides unlock conditions and only nudges ordering.
 */
export function getNextIntentSelectionBias(
  state: GameState,
  definition: ContractTemplateDefinition
): number {
  const contracts = sanitizeContractSystemState(state.contracts)
  const intent = contracts.nextIntent ?? null

  if (!intent) {
    return 0
  }

  const factionTier = getFactionTier(state, definition.factionId)
  const hasChainContinuation = (definition.chain.unlockConditions ?? []).some(
    (condition) => condition.type === 'completed_contract'
  )
  const strategy = definition.strategyTag
  const riskBoost = definition.modifiers
    .filter((modifier) => modifier.effect === 'difficulty_flat' || modifier.effect === 'death_risk')
    .reduce((sum, modifier) => sum + (modifier.value ?? 0), 0)

  switch (intent) {
    case 'chase-lead':
      // Boost contracts that continue an unlocked chain (closes the open lead the
      // player just surfaced) and progression-tagged work that depends on prior runs.
      return (hasChainContinuation ? 0.55 : 0) + (strategy === 'progression' ? 0.18 : 0)

    case 'stabilize-staff':
      // Prefer lower-risk income and materials work; downrank high lethality contracts.
      return (
        (strategy === 'income' ? 0.32 : 0) +
        (strategy === 'materials' ? 0.18 : 0) -
        Math.min(0.55, riskBoost * 0.04)
      )

    case 'repair-agency':
      // Bias toward research/progression work and faction-friendly channels that lift standing.
      return (
        (strategy === 'research' ? 0.28 : 0) +
        (strategy === 'progression' ? 0.2 : 0) +
        (factionTier === 'friendly' || factionTier === 'allied' ? 0.18 : 0)
      )

    case 'pursue-faction':
      // Boost contracts attached to the player's strongest cooperative faction.
      if (!definition.factionId) {
        return -0.12
      }
      return (
        (factionTier === 'allied' ? 0.55 : 0) +
        (factionTier === 'friendly' ? 0.32 : 0) +
        (factionTier === 'hostile' ? -0.18 : 0)
      )

    case 'prepare-equipment':
      // Bias toward materials-focused contracts that refill the supply chain.
      return strategy === 'materials' ? 0.42 : strategy === 'income' ? 0.12 : 0

    case 'answer-emergency':
      // Bias toward income/progression work with elevated pressure (emergency posture).
      return (
        (strategy === 'income' ? 0.28 : 0) +
        (strategy === 'progression' ? 0.2 : 0) +
        Math.min(0.35, riskBoost * 0.03)
      )

    default: {
      const _exhaustive: never = intent
      return _exhaustive
    }
  }
}

function meetsUnlockCondition(
  state: GameState,
  condition: NonNullable<ContractChainDefinition['unlockConditions']>[number]
) {
  const contracts = sanitizeContractSystemState(state.contracts)
  const completedResearchUnlockIds = new Set([
    ...contracts.unlockedResearchIds,
    ...getCompletedResearchUnlockIds(state),
  ])

  switch (condition.type) {
    case 'completed_contract': {
      const record = contracts.history[condition.contractTemplateId ?? '']
      return getOutcomeMeetsMinimum(
        record?.bestOutcome ?? 'none',
        condition.minimumOutcome ?? 'success'
      )
    }
    case 'research_unlocked':
      return completedResearchUnlockIds.has(condition.researchId ?? '')
    case 'faction_tier':
      return (
        getTierRank(getFactionTier(state, condition.factionId ?? '')) >=
        getTierRank(condition.minimumTier ?? 'neutral')
      )
    case 'progression_unlock':
      return hasAgencyProgressionUnlock(state, condition.unlockId ?? '')
    default:
      return false
  }
}

function getContractAvailabilityBlockers(state: GameState, definition: ContractTemplateDefinition) {
  const contracts = sanitizeContractSystemState(state.contracts)
  const blockers: Array<{ code: string; detail: string }> = []
  const template = state.templates[definition.caseTemplateId]

  if (!template) {
    blockers.push({
      code: 'missing-case-template',
      detail: `Template ${definition.caseTemplateId} is missing, so this contract cannot be generated.`,
    })
    return blockers
  }

  const activeContractTemplateIds = new Set(
    Object.values(state.cases)
      .map((currentCase) => currentCase.contract?.templateId)
      .filter((templateId): templateId is string => Boolean(templateId))
  )

  if (activeContractTemplateIds.has(definition.id)) {
    blockers.push({
      code: 'active-contract',
      detail: 'A live contract from this channel is already in the field.',
    })
  }

  const factionTier = getFactionTier(state, definition.factionId)
  const factionLabel =
    definition.factionId && getFactionDefinition(definition.factionId)?.label
      ? getFactionDefinition(definition.factionId)!.label
      : definition.factionId
        ? formatContractIdLabel(definition.factionId)
        : 'Open channel'

  if (
    definition.availability?.minFactionTier &&
    getTierRank(factionTier) < getTierRank(definition.availability.minFactionTier)
  ) {
    blockers.push({
      code: 'min-faction-tier',
      detail: `Requires ${factionLabel} standing ${formatContractTierLabel(
        definition.availability.minFactionTier
      )}. Current standing ${formatContractTierLabel(factionTier)}.`,
    })
  }

  if (
    definition.availability?.maxFactionTier &&
    getTierRank(factionTier) > getTierRank(definition.availability.maxFactionTier)
  ) {
    blockers.push({
      code: 'max-faction-tier',
      detail: `Only appears at ${factionLabel} standing ${formatContractTierLabel(
        definition.availability.maxFactionTier
      )} or worse. Current standing ${formatContractTierLabel(factionTier)}.`,
    })
  }

  for (const condition of definition.chain.unlockConditions ?? []) {
    if (meetsUnlockCondition(state, condition)) {
      continue
    }

    switch (condition.type) {
      case 'completed_contract': {
        const contractTemplateId = condition.contractTemplateId ?? ''
        const record = contracts.history[contractTemplateId]
        blockers.push({
          code: 'missing-contract-chain',
          detail: `Requires ${getContractDisplayLabel(
            contractTemplateId
          )} to reach ${formatContractResolutionLabel(
            condition.minimumOutcome ?? 'success'
          )}. Current best outcome ${formatContractResolutionLabel(record?.bestOutcome)}.`,
        })
        break
      }
      case 'research_unlocked':
        blockers.push({
          code: 'missing-research-unlock',
          detail: `Requires research unlock ${formatContractIdLabel(condition.researchId ?? '')}.`,
        })
        break
      case 'faction_tier':
        blockers.push({
          code: 'missing-faction-tier',
          detail: `Requires ${getFactionDefinition(condition.factionId ?? '')?.label ?? formatContractIdLabel(condition.factionId ?? '')} standing ${formatContractTierLabel(
            condition.minimumTier ?? 'neutral'
          )}. Current standing ${formatContractTierLabel(
            getFactionTier(state, condition.factionId ?? '')
          )}.`,
        })
        break
      case 'progression_unlock':
        blockers.push({
          code: 'missing-progression-unlock',
          detail: `Requires progression unlock ${getAgencyProgressionUnlockLabel(
            condition.unlockId ?? ''
          )}.`,
        })
        break
      default:
        blockers.push({
          code: 'unknown-lock',
          detail: `Additional unlock requirements still block ${definition.name}.`,
        })
        break
    }
  }

  return blockers
}

function isDefinitionEligible(state: GameState, definition: ContractTemplateDefinition) {
  const template = state.templates[definition.caseTemplateId]

  if (!template) {
    return false
  }

  const activeContractTemplateIds = new Set(
    Object.values(state.cases)
      .map((currentCase) => currentCase.contract?.templateId)
      .filter((templateId): templateId is string => Boolean(templateId))
  )

  if (activeContractTemplateIds.has(definition.id)) {
    return false
  }

  const factionTier = getFactionTier(state, definition.factionId)
  if (
    definition.availability?.minFactionTier &&
    getTierRank(factionTier) < getTierRank(definition.availability.minFactionTier)
  ) {
    return false
  }
  if (
    definition.availability?.maxFactionTier &&
    getTierRank(factionTier) > getTierRank(definition.availability.maxFactionTier)
  ) {
    return false
  }

  return (definition.chain.unlockConditions ?? []).every((condition) =>
    meetsUnlockCondition(state, condition)
  )
}

function buildRewardPackage(
  state: GameState,
  definition: ContractTemplateDefinition
): ContractRewardPackage {
  const rewardMultiplier = getFactionRewardMultiplier(state, definition.factionId)
  const rewardBonus = definition.modifiers
    .filter((modifier) => modifier.effect === 'reward_bonus')
    .reduce((sum, modifier) => sum + (modifier.value ?? 0), 0)
  const factionScalar = clamp(rewardMultiplier + rewardBonus * 0.1, 0.6, 1.9)
  const scalar = applyRivalPressureToContractScalar(factionScalar, buildRivalPressure(state))

  return {
    funding: Math.max(0, Math.round(definition.baseRewards.funding * scalar)),
    ...(definition.baseRewards.materials
      ? {
          materials: definition.baseRewards.materials.map((drop) => ({
            ...drop,
            quantity: Math.max(1, Math.round(drop.quantity * scalar)),
          })),
        }
      : {}),
    ...(definition.baseRewards.research
      ? {
          research: definition.baseRewards.research.map((unlock) => ({ ...unlock })),
        }
      : {}),
  }
}

function deriveRiskLevel(
  difficulty: number,
  modifiers: readonly ContractModifier[]
): ContractRiskLevel {
  const injuryPressure = modifiers
    .filter((modifier) => modifier.effect === 'injury_risk' || modifier.effect === 'death_risk')
    .reduce((sum, modifier) => sum + (modifier.value ?? 0), 0)
  const effectiveDifficulty = difficulty + injuryPressure

  if (effectiveDifficulty >= 70) {
    return 'extreme'
  }
  if (effectiveDifficulty >= 54) {
    return 'high'
  }
  if (effectiveDifficulty >= 38) {
    return 'medium'
  }
  return 'low'
}

function buildOfferFromDefinition(
  state: GameState,
  definition: ContractTemplateDefinition,
  slotIndex: number,
  progressionFactor: number,
  powerFactor: number
): ContractOffer | null {
  const template = state.templates[definition.caseTemplateId]

  if (!template) {
    return null
  }

  const scalar = clamp(
    definition.baseDifficultyScalar +
      progressionFactor * 0.38 +
      powerFactor * 0.28 +
      (getFactionTier(state, definition.factionId) === 'hostile' ? 0.08 : 0),
    0.82,
    1.72
  )
  const difficultyFlat = definition.modifiers
    .filter((modifier) => modifier.effect === 'difficulty_flat')
    .reduce((sum, modifier) => sum + (modifier.value ?? 0), 0)
  const caseDifficulty = scaleDifficultyProfile(template.difficulty, scalar, difficultyFlat)
  const previewCase = buildContractCaseSkeleton(
    {
      id: buildOfferId(state, definition.id, slotIndex),
      templateId: definition.id,
      caseTemplateId: definition.caseTemplateId,
      name: definition.name,
      description: definition.description,
      factionId: definition.factionId,
      caseDifficulty,
      durationWeeks: definition.durationWeeks ?? template.durationWeeks,
      strategyTag: definition.strategyTag,
      riskLevel: 'low',
      rewards: buildRewardPackage(state, definition),
      requirements: definition.requirements,
      modifiers: definition.modifiers.map((modifier) => ({ ...modifier })),
      chain: definition.chain,
      ...(definition.fieldBase
        ? {
            fieldBase: {
              label: definition.fieldBase.label,
              quality: { ...definition.fieldBase.quality },
            },
          }
        : {}),
    },
    template,
    `contract-preview-${definition.id}`,
    state.week,
    state
  )
  const difficulty = Math.max(1, Math.round(computeRequiredScore(previewCase, state.config)))
  const riskLevel = deriveRiskLevel(difficulty, definition.modifiers)

  return {
    id: buildOfferId(state, definition.id, slotIndex),
    templateId: definition.id,
    caseTemplateId: definition.caseTemplateId,
    name: definition.name,
    description: definition.description,
    factionId: definition.factionId,
    difficulty,
    caseDifficulty,
    riskLevel,
    durationWeeks: definition.durationWeeks ?? template.durationWeeks,
    rewards: buildRewardPackage(state, definition),
    requirements: {
      recommendedClasses: [...definition.requirements.recommendedClasses],
      discouragedClasses: [...definition.requirements.discouragedClasses],
    },
    modifiers: definition.modifiers.map((modifier) => ({ ...modifier })),
    chain: {
      ...(definition.chain.nextContracts
        ? { nextContracts: [...definition.chain.nextContracts] }
        : {}),
      ...(definition.chain.unlockConditions
        ? {
            unlockConditions: definition.chain.unlockConditions.map((condition) => ({
              ...condition,
            })),
          }
        : {}),
    },
    ...(definition.fieldBase
      ? {
          fieldBase: {
            label: definition.fieldBase.label,
            quality: { ...definition.fieldBase.quality },
          },
        }
      : {}),
    strategyTag: definition.strategyTag,
    generatedWeek: state.week,
  }
}

function generateContractOffers(state: GameState) {
  const progressionFactor = getCurrentProgressionFactor(state)
  const powerFactor = getAvailablePowerFactor(state)
  const eligible = CONTRACT_TEMPLATES.filter((definition) =>
    isDefinitionEligible(state, definition)
  )
  const ranked = eligible
    .map((definition) => ({
      definition,
      score: buildSelectionScore(state, definition, progressionFactor, powerFactor),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.definition.name.localeCompare(right.definition.name)
    )

  const chosenDefinitions: ContractTemplateDefinition[] = []

  for (const strategyTag of CONTRACT_STRATEGY_ORDER) {
    const match = ranked.find(
      (entry) =>
        entry.definition.strategyTag === strategyTag &&
        !chosenDefinitions.some((current) => current.id === entry.definition.id)
    )

    if (match) {
      chosenDefinitions.push(match.definition)
    }
  }

  for (const entry of ranked) {
    if (chosenDefinitions.length >= CONTRACT_OFFER_COUNT) {
      break
    }

    if (!chosenDefinitions.some((current) => current.id === entry.definition.id)) {
      chosenDefinitions.push(entry.definition)
    }
  }

  return chosenDefinitions
    .slice(0, CONTRACT_OFFER_COUNT)
    .map((definition, index) =>
      buildOfferFromDefinition(state, definition, index, progressionFactor, powerFactor)
    )
    .filter((offer): offer is ContractOffer => Boolean(offer))
}

export function sanitizeContractSystemState(
  value: unknown,
  fallback: ContractSystemState = createEmptyContractSystemState()
): ContractSystemState {
  if (!value || typeof value !== 'object') {
    return {
      generatedWeek: fallback.generatedWeek,
      offers: [...fallback.offers],
      history: { ...fallback.history },
      unlockedResearchIds: [...fallback.unlockedResearchIds],
    }
  }

  const raw = value as Partial<ContractSystemState>
  const offers = Array.isArray(raw.offers)
    ? raw.offers
        .filter((offer): offer is ContractOffer => typeof offer?.id === 'string')
        .map((offer) => {
          const sanitizedFieldBase = sanitizePersistedFieldBasePacket(offer.fieldBase)
          const offerWithoutFieldBase = { ...offer }
          delete offerWithoutFieldBase.fieldBase
          return {
          ...offerWithoutFieldBase,
          caseDifficulty: {
            combat: Math.max(1, Math.round(offer.caseDifficulty?.combat ?? offer.difficulty ?? 1)),
            investigation: Math.max(
              1,
              Math.round(offer.caseDifficulty?.investigation ?? offer.difficulty ?? 1)
            ),
            utility: Math.max(
              1,
              Math.round(offer.caseDifficulty?.utility ?? offer.difficulty ?? 1)
            ),
            social: Math.max(1, Math.round(offer.caseDifficulty?.social ?? offer.difficulty ?? 1)),
          },
          requirements: {
            recommendedClasses: Array.isArray(offer.requirements?.recommendedClasses)
              ? [...offer.requirements.recommendedClasses]
              : [],
            discouragedClasses: Array.isArray(offer.requirements?.discouragedClasses)
              ? [...offer.requirements.discouragedClasses]
              : [],
          },
          modifiers: Array.isArray(offer.modifiers)
            ? offer.modifiers.map((modifier) => ({ ...modifier }))
            : [],
          rewards: {
            funding: Math.max(0, Math.round(offer.rewards?.funding ?? 0)),
            ...(offer.rewards?.materials
              ? { materials: offer.rewards.materials.map((drop) => ({ ...drop })) }
              : {}),
            ...(offer.rewards?.research
              ? { research: offer.rewards.research.map((unlock) => ({ ...unlock })) }
              : {}),
          },
          chain: {
            ...(Array.isArray(offer.chain?.nextContracts)
              ? { nextContracts: [...offer.chain.nextContracts] }
              : {}),
            ...(Array.isArray(offer.chain?.unlockConditions)
              ? {
                  unlockConditions: offer.chain.unlockConditions.map((condition) => ({
                    ...condition,
                  })),
                }
              : {}),
          },
          ...(sanitizedFieldBase ? { fieldBase: sanitizedFieldBase } : {}),
          }
        })
    : [...fallback.offers]

  const history =
    raw.history && typeof raw.history === 'object'
      ? Object.fromEntries(
          Object.entries(raw.history).map(([templateId, record]) => {
            const current = record as Partial<ContractHistoryRecord> | undefined
            return [
              templateId,
              {
                completions: Math.max(0, Math.round(current?.completions ?? 0)),
                bestOutcome:
                  current?.bestOutcome === 'success' ||
                  current?.bestOutcome === 'partial' ||
                  current?.bestOutcome === 'fail' ||
                  current?.bestOutcome === 'unresolved'
                    ? current.bestOutcome
                    : 'none',
                ...(current?.lastOutcome
                  ? {
                      lastOutcome:
                        current.lastOutcome === 'success' ||
                        current.lastOutcome === 'partial' ||
                        current.lastOutcome === 'fail' ||
                        current.lastOutcome === 'unresolved'
                          ? current.lastOutcome
                          : undefined,
                    }
                  : {}),
                ...(typeof current?.lastCompletedWeek === 'number'
                  ? { lastCompletedWeek: Math.max(1, Math.round(current.lastCompletedWeek)) }
                  : {}),
              } satisfies ContractHistoryRecord,
            ]
          })
        )
      : { ...fallback.history }

  const nextIntent = normalizeContractNextIntent(raw.nextIntent ?? fallback.nextIntent)
  // SPE-1496 (PR #1621 review fix): only carry `nextIntentCapturedWeek` forward
  // when a valid `nextIntent` is present. This keeps corrupted / partial save
  // data from leaving a captured-week value without a captured intent, which is
  // inconsistent with `clearContractNextIntent` and with the field's meaning.
  const rawCapturedWeek =
    typeof raw.nextIntentCapturedWeek === 'number' && Number.isFinite(raw.nextIntentCapturedWeek)
      ? Math.max(0, Math.round(raw.nextIntentCapturedWeek))
      : fallback.nextIntentCapturedWeek
  const nextIntentCapturedWeek = nextIntent ? rawCapturedWeek : undefined

  return {
    generatedWeek:
      typeof raw.generatedWeek === 'number' && Number.isFinite(raw.generatedWeek)
        ? Math.max(0, Math.round(raw.generatedWeek))
        : fallback.generatedWeek,
    offers,
    history,
    unlockedResearchIds: Array.isArray(raw.unlockedResearchIds)
      ? raw.unlockedResearchIds.filter((entry): entry is string => typeof entry === 'string')
      : [...fallback.unlockedResearchIds],
    ...(nextIntent ? { nextIntent } : {}),
    ...(typeof nextIntentCapturedWeek === 'number' ? { nextIntentCapturedWeek } : {}),
  }
}

const CONTRACT_NEXT_INTENT_VALUES: readonly ContractNextIntent[] = [
  'chase-lead',
  'stabilize-staff',
  'repair-agency',
  'pursue-faction',
  'prepare-equipment',
  'answer-emergency',
] as const

function normalizeContractNextIntent(value: unknown): ContractNextIntent | null {
  if (
    typeof value === 'string' &&
    (CONTRACT_NEXT_INTENT_VALUES as readonly string[]).includes(value)
  ) {
    return value as ContractNextIntent
  }
  return null
}

/** Bounded canonical list for UI surfaces and tests. */
export function getContractNextIntentValues(): readonly ContractNextIntent[] {
  return CONTRACT_NEXT_INTENT_VALUES
}

/** Player-facing label for an intent value. Pure derivation. */
export function getContractNextIntentLabel(intent: ContractNextIntent): string {
  switch (intent) {
    case 'chase-lead':
      return 'Chase the open lead'
    case 'stabilize-staff':
      return 'Stabilize staff'
    case 'repair-agency':
      return 'Repair agency standing'
    case 'pursue-faction':
      return 'Pursue faction channel'
    case 'prepare-equipment':
      return 'Prepare equipment'
    case 'answer-emergency':
      return 'Answer emergency pressure'
    default: {
      // Exhaustiveness guard; ContractNextIntent is a closed union.
      const _exhaustive: never = intent
      return _exhaustive
    }
  }
}

export function getContractNextIntent(state: GameState): ContractNextIntent | null {
  return sanitizeContractSystemState(state.contracts).nextIntent ?? null
}

/** Capture a bounded post-contract next intent. Pass `null` to clear. */
export function setContractNextIntent(
  state: GameState,
  intent: ContractNextIntent | null
): GameState {
  const contracts = sanitizeContractSystemState(state.contracts)
  const normalized = intent ? normalizeContractNextIntent(intent) : null

  if ((contracts.nextIntent ?? null) === normalized) {
    return state
  }

  const nextContracts: ContractSystemState = {
    ...contracts,
    nextIntent: normalized,
    ...(normalized ? { nextIntentCapturedWeek: state.week } : {}),
  }

  if (!normalized) {
    delete (nextContracts as { nextIntentCapturedWeek?: number }).nextIntentCapturedWeek
  }

  return {
    ...state,
    contracts: nextContracts,
  }
}

export function clearContractNextIntent(state: GameState): GameState {
  return setContractNextIntent(state, null)
}

export function refreshContractBoard(state: GameState): GameState {
  const contracts = sanitizeContractSystemState(state.contracts)

  if (contracts.generatedWeek === state.week) {
    return {
      ...state,
      contracts,
    }
  }

  return {
    ...state,
    contracts: {
      generatedWeek: state.week,
      offers: generateContractOffers({
        ...state,
        contracts,
      }),
      history: contracts.history,
      unlockedResearchIds: [...contracts.unlockedResearchIds],
      // SPE-1496: preserve the bounded next-intent capture across board regeneration
      // so the bias term in `buildSelectionScore` reflects player intent until
      // the player clears it.
      ...(contracts.nextIntent ? { nextIntent: contracts.nextIntent } : {}),
      ...(typeof contracts.nextIntentCapturedWeek === 'number'
        ? { nextIntentCapturedWeek: contracts.nextIntentCapturedWeek }
        : {}),
      ...(contracts.active ? { active: { ...contracts.active } } : {}),
    },
  }
}

export function getContractOffers(state: GameState) {
  return sanitizeContractSystemState(state.contracts).offers
}

export function getContractCatalogEntries(state: GameState): ContractCatalogEntry[] {
  const contracts = sanitizeContractSystemState(state.contracts)
  const progressionFactor = getCurrentProgressionFactor(state)
  const powerFactor = getAvailablePowerFactor(state)
  const offersByTemplateId = new Map(
    contracts.offers.map((offer) => [offer.templateId, offer] as const)
  )
  const activeContractTemplateIds = new Set(
    Object.values(state.cases)
      .map((currentCase) => currentCase.contract?.templateId)
      .filter((templateId): templateId is string => Boolean(templateId))
  )

  return CONTRACT_TEMPLATES.map((definition, index) => {
    const offer = offersByTemplateId.get(definition.id)
    const caseTemplate = state.templates[definition.caseTemplateId]
    const preview =
      offer ?? buildContractPreviewOffer(state, definition, index, progressionFactor, powerFactor)
    const blockers =
      offer !== undefined
        ? []
        : getContractAvailabilityBlockers(state, definition).filter(
            (blocker, blockerIndex, all) =>
              all.findIndex(
                (candidate) =>
                  candidate.code === blocker.code && candidate.detail === blocker.detail
              ) === blockerIndex
          )
    const availabilityState: ContractCatalogAvailabilityState = offer
      ? 'available'
      : activeContractTemplateIds.has(definition.id)
        ? 'active'
        : blockers.length > 0
          ? 'locked'
          : 'standby'

    return {
      boardId: offer ? offer.id : `catalog:${definition.id}`,
      templateId: definition.id,
      ...(offer ? { offerId: offer.id } : {}),
      name: preview.name,
      description: preview.description,
      factionId: preview.factionId,
      ...(caseTemplate?.contactId ? { contactId: caseTemplate.contactId } : {}),
      strategyTag: preview.strategyTag,
      difficulty: preview.difficulty,
      riskLevel: preview.riskLevel,
      durationWeeks: preview.durationWeeks,
      rewards: cloneRewards(preview.rewards),
      requirements: {
        recommendedClasses: [...preview.requirements.recommendedClasses],
        discouragedClasses: [...preview.requirements.discouragedClasses],
      },
      modifiers: preview.modifiers.map((modifier) => ({ ...modifier })),
      chain: {
        ...(preview.chain.nextContracts ? { nextContracts: [...preview.chain.nextContracts] } : {}),
        ...(preview.chain.unlockConditions
          ? {
              unlockConditions: preview.chain.unlockConditions.map((condition) => ({
                ...condition,
              })),
            }
          : {}),
      },
      availabilityState,
      blockerCodes: blockers.map((blocker) => blocker.code),
      blockerDetails: blockers.map((blocker) => blocker.detail),
    } satisfies ContractCatalogEntry
  })
}

function buildSuccessBand(value: number): ContractSuccessBand {
  if (value >= 0.82) {
    return 'Very High'
  }
  if (value >= 0.6) {
    return 'High'
  }
  if (value >= 0.35) {
    return 'Moderate'
  }
  if (value >= 0.15) {
    return 'Low'
  }
  return 'Very Low'
}

export function buildContractRewardRange(
  offer: Pick<ContractOffer, 'rewards' | 'modifiers'>
): ContractRewardRange {
  const partialMultiplier = getContractOutcomeRewardMultiplier('partial')
  const successMultiplier = getContractOutcomeRewardMultiplier('success')
  const rewardBonus = getContractModifierTotal(offer, 'reward_bonus')
  const minMultiplier = clamp(partialMultiplier + rewardBonus * 0.1, 0, 1.8)
  const maxMultiplier = clamp(successMultiplier + rewardBonus * 0.1, 0, 1.8)

  return {
    fundingMin: Math.max(0, Math.round(offer.rewards.funding * minMultiplier)),
    fundingMax: Math.max(0, Math.round(offer.rewards.funding * maxMultiplier)),
    materials: (offer.rewards.materials ?? []).map((drop) => ({
      itemId: drop.itemId,
      label: drop.label,
      quantityMin: Math.max(0, Math.round(drop.quantity * minMultiplier)),
      quantityMax: Math.max(0, Math.round(drop.quantity * maxMultiplier)),
    })),
    research: [...(offer.rewards.research ?? [])],
  }
}

export function buildContractPreviewCase(
  state: GameState,
  offer: ContractOffer,
  caseId = `contract-preview-${offer.id}`
) {
  const template = state.templates[offer.caseTemplateId]

  if (!template) {
    return null
  }

  return buildContractCaseSkeleton(offer, template, caseId, state.week, state)
}

function getAvailableTeamsForContract(state: GameState) {
  return Object.values(state.teams).filter(
    (team) => !getTeamAssignedCaseId(team) && !isTeamBlockedByTraining(team, state.agents)
  )
}

export function evaluateContractForTeam(
  state: GameState,
  offer: ContractOffer,
  teamId: string
): ContractTeamEvaluation | null {
  const team = state.teams[teamId]
  const previewCase = buildContractPreviewCase(state, offer)

  if (!team || !previewCase) {
    return null
  }

  const preview = previewResolutionForTeamIds(previewCase, state, [teamId])
  if (preview.odds.blockedByRequiredRoles || preview.odds.blockedByRequiredTags) {
    return null
  }

  const teamMembers = team.agentIds
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is NonNullable<GameState['agents'][string]> => Boolean(agent))
  const roleFit = evaluateContractRoleFit(offer, teamMembers)

  return {
    team,
    successBand: buildSuccessBand(preview.odds.success),
    injuryRiskBand: preview.injuryForecast.injuryRiskBand,
    deathRiskBand: preview.injuryForecast.deathRiskBand,
    roleFit,
    rewardRange: buildContractRewardRange(offer),
    preview,
    partyOvr: buildTeamCompositionProfile(team, state.agents).derivedStats.overall,
  }
}

function compareContractTeamEvaluations(
  left: ContractTeamEvaluation,
  right: ContractTeamEvaluation
) {
  return (
    right.preview.odds.success - left.preview.odds.success ||
    right.roleFit.scoreAdjustment - left.roleFit.scoreAdjustment ||
    right.preview.odds.chemistry - left.preview.odds.chemistry ||
    right.partyOvr - left.partyOvr ||
    left.team.name.localeCompare(right.team.name)
  )
}

export function getBestContractTeamSuggestion(state: GameState, offer: ContractOffer) {
  return getAvailableTeamsForContract(state)
    .map((team) => evaluateContractForTeam(state, offer, team.id))
    .filter((evaluation): evaluation is ContractTeamEvaluation => Boolean(evaluation))
    .sort(compareContractTeamEvaluations)[0]
}

export function getContractTeamSuggestions(state: GameState, offer: ContractOffer) {
  return getAvailableTeamsForContract(state)
    .map((team) => evaluateContractForTeam(state, offer, team.id))
    .filter((evaluation): evaluation is ContractTeamEvaluation => Boolean(evaluation))
    .sort(compareContractTeamEvaluations)
}

function buildLaunchReason(offer: ContractOffer) {
  const factionLabel = offer.factionId ? getFactionDefinition(offer.factionId)?.label : undefined
  return factionLabel
    ? `${factionLabel} pushed a live contract onto the weekly board.`
    : 'Weekly contract launched into the incident queue.'
}

export function launchContract(state: GameState, offerId: string, teamId: string): GameState {
  const contracts = sanitizeContractSystemState(state.contracts)
  const offer = contracts.offers.find((currentOffer) => currentOffer.id === offerId)
  const previewCase = offer ? buildContractPreviewCase(state, offer) : null

  if (!offer || !previewCase) {
    return state
  }

  const teamEvaluation = evaluateContractForTeam(state, offer, teamId)
  if (!teamEvaluation) {
    return state
  }

  const template = state.templates[offer.caseTemplateId]
  if (!template) {
    return state
  }

  const launchSeed = buildContractSeed(state, `launch:${offer.id}`)
  const usedIds = new Set(Object.keys(state.cases))
  const rng = createSeededRng(launchSeed)
  const instantiated = instantiateFromTemplate(template, rng.next, usedIds, state.week)
  const launchedCase = buildContractCaseSkeleton(offer, template, instantiated.id, state.week, state)
  const nextState = appendOperationEventDrafts(
    {
      ...state,
      cases: {
        ...state.cases,
        [launchedCase.id]: launchedCase,
      },
      contracts: {
        ...contracts,
        offers: contracts.offers.filter((currentOffer) => currentOffer.id !== offer.id),
      },
    },
    [
      {
        type: 'case.spawned',
        sourceSystem: 'incident',
        payload: {
          week: state.week,
          caseId: launchedCase.id,
          caseTitle: launchedCase.title,
          templateId: launchedCase.templateId,
          kind: launchedCase.kind,
          stage: launchedCase.stage,
          trigger: offer.factionId ? 'faction_offer' : 'world_activity',
          factionId: offer.factionId,
          factionLabel: offer.factionId ? getFactionDefinition(offer.factionId)?.label : undefined,
          sourceReason: buildLaunchReason(offer),
        },
      },
    ]
  )

  return assignTeam(nextState, launchedCase.id, teamId)
}

export function recordContractOutcome(
  contracts: ContractSystemState | undefined,
  activeContract: ActiveContractRuntime | undefined,
  outcome: MissionResolutionKind,
  week: number
) {
  const nextContracts = sanitizeContractSystemState(contracts)
  if (!activeContract) {
    return nextContracts
  }

  const templateId =
    activeContract.templateId ??
    activeContract.contractId ??
    activeContract.offerId ??
    activeContract.caseId ??
    ''
  const currentRecord = nextContracts.history[templateId] ?? {
    completions: 0,
    bestOutcome: 'none',
  }
  const completed = outcome === 'success' || outcome === 'partial'
  const bestOutcome =
    compareOutcomeRank(outcome, currentRecord.bestOutcome) > 0 ? outcome : currentRecord.bestOutcome
  const nextResearchIds = [
    ...new Set([
      ...nextContracts.unlockedResearchIds,
      ...getContractResearchUnlocks(activeContract, outcome).map((unlock) => unlock.id),
    ]),
  ].sort((left, right) => left.localeCompare(right))

  return {
    ...nextContracts,
    history: {
      ...nextContracts.history,
      [templateId]: {
        completions: currentRecord.completions + (completed ? 1 : 0),
        bestOutcome,
        lastOutcome: outcome,
        ...(completed
          ? { lastCompletedWeek: week }
          : currentRecord.lastCompletedWeek
            ? { lastCompletedWeek: currentRecord.lastCompletedWeek }
            : {}),
      },
    },
    unlockedResearchIds: nextResearchIds,
  }
}

export function getContractFundingDelta(
  activeContract: ActiveContractRuntime | undefined,
  outcome: MissionResolutionKind
) {
  return activeContract ? getContractFundingReward(activeContract, outcome) : 0
}

export function getContractInventoryRewardGrants(
  activeContract: ActiveContractRuntime | undefined,
  outcome: MissionResolutionKind
) {
  return activeContract ? buildContractInventoryRewards(activeContract, outcome) : []
}

export function getContractResearchRewards(
  activeContract: ActiveContractRuntime | undefined,
  outcome: MissionResolutionKind
) {
  return activeContract ? getContractResearchUnlocks(activeContract, outcome) : []
}

export function getContractStrategyLabel(strategyTag: ContractStrategyTag) {
  switch (strategyTag) {
    case 'income':
      return 'Income'
    case 'materials':
      return 'Materials'
    case 'research':
      return 'Research'
    default:
      return 'Progression'
  }
}

export function getContractFactionLabel(offer: Pick<ContractOffer, 'factionId'>) {
  return offer.factionId
    ? (getFactionDefinition(offer.factionId)?.label ?? offer.factionId)
    : 'Open channel'
}

export function getContractChainLabels(offer: Pick<ContractOffer, 'chain'>) {
  return (offer.chain.nextContracts ?? []).map((templateId) => ({
    id: templateId,
    label: getContractDisplayLabel(templateId),
  }))
}

export function getContractMaterialLabel(material: Pick<ContractMaterialDrop, 'itemId' | 'label'>) {
  return material.label || inventoryItemLabels[material.itemId] || material.itemId
}

// ---------------------------------------------------------------------------
// SPE-1496: post-contract debrief surface (deterministic; no prose recap)
// ---------------------------------------------------------------------------

function mapOutcomeLabel(outcome: MissionResolutionKind): string {
  switch (outcome) {
    case 'success':
      return 'resolved cleanly'
    case 'partial':
      return 'partially contained'
    case 'fail':
      return 'failed in the field'
    case 'unresolved':
    default:
      return 'lapsed without resolution'
  }
}

function describeFatalities(missionResult: MissionResult): ContractDebriefChangedEntity[] {
  return (missionResult.fatalities ?? []).map((fatality) => ({
    kind: 'staff' as const,
    id: `fatality:${fatality.agentId}`,
    label: fatality.agentName ?? fatality.agentId,
    detail: `Lost in the field${fatality.reason ? ` (${fatality.reason})` : ''}.`,
  }))
}

function describeInjuries(
  injuries: readonly MissionInjuryRecord[]
): ContractDebriefChangedEntity[] {
  return injuries.map((injury) => ({
    kind: 'staff' as const,
    id: `injury:${injury.agentId}`,
    label: injury.agentName,
    detail: `${injury.severity} injury${injury.damage > 0 ? ` / ${injury.damage} damage` : ''}.`,
  }))
}

function describeFatigueShifts(missionResult: MissionResult): ContractDebriefChangedEntity[] {
  return missionResult.fatigueChanges
    .filter((change) => Math.abs(change.delta) >= 3)
    .map((change) => ({
      kind: 'staff' as const,
      id: `fatigue:${change.teamId}`,
      label: change.teamName ?? change.teamId,
      detail: `Fatigue ${change.before} -> ${change.after} (${change.delta >= 0 ? '+' : ''}${change.delta}).`,
    }))
}

function describeFactionShifts(missionResult: MissionResult): ContractDebriefChangedEntity[] {
  return missionResult.rewards.factionStanding
    .filter((standing) => standing.delta !== 0)
    .map((standing) => ({
      kind: 'faction' as const,
      id: `faction:${standing.factionId}`,
      label: standing.label,
      detail: `Standing ${standing.delta > 0 ? '+' : ''}${standing.delta}.`,
    }))
}

function describeEvidenceGains(missionResult: MissionResult): ContractDebriefChangedEntity[] {
  return missionResult.rewards.inventoryRewards
    .filter((grant) => grant.quantity > 0)
    .map((grant) => ({
      kind: 'evidence' as const,
      id: `inventory:${grant.itemId}`,
      label: grant.label,
      detail: `${grant.quantity}x recovered (${grant.kind}).`,
    }))
}

function describeRoute(
  missionResult: MissionResult,
  snapshot: WeeklyReportCaseSnapshot
): ContractDebriefChangedEntity | null {
  const route = missionResult.route
  if (!route) {
    return null
  }
  return {
    kind: 'route',
    id: `route:${snapshot.caseId}`,
    label: 'Route confirmed',
    detail: `Operational route ${route}.`,
  }
}

/**
 * Loosely-typed extraction of contract runtime data from either source. Both
 * `WeeklyReportCaseSnapshot` and `CaseInstance.contract` only formally guarantee
 * `templateId` plus an index signature, so we read the fields we care about
 * through optional access rather than casting the whole object to
 * `ActiveContractRuntime`.
 */
type ContractRuntimeBag = {
  templateId?: unknown
  contractId?: unknown
  offerId?: unknown
  factionId?: unknown
}

function readContractRuntimeBag(value: unknown): ContractRuntimeBag | undefined {
  if (value && typeof value === 'object') {
    return value as ContractRuntimeBag
  }
  return undefined
}

function pickContractStringField(
  ...candidates: Array<ContractRuntimeBag | undefined>
): string | null {
  for (const bag of candidates) {
    if (!bag) {
      continue
    }
    for (const field of ['templateId', 'contractId', 'offerId'] as const) {
      const value = bag[field]
      if (typeof value === 'string' && value.length > 0) {
        return value
      }
    }
  }
  return null
}

function pickFactionId(...candidates: Array<ContractRuntimeBag | undefined>): string | undefined {
  for (const bag of candidates) {
    if (!bag) {
      continue
    }
    const value = bag.factionId
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return undefined
}

function describeSubject(
  missionResult: MissionResult,
  snapshot: WeeklyReportCaseSnapshot
): ContractDebriefChangedEntity {
  const hidden = missionResult.hiddenState
  const detail = hidden
    ? `Subject state ${hidden} after the operation.`
    : `Operation ${mapOutcomeLabel(missionResult.outcome)}.`

  return {
    kind: 'subject',
    id: `subject:${snapshot.caseId}`,
    label: snapshot.title,
    detail,
  }
}

function describeUnresolvedClocks(missionResult: MissionResult): ContractDebriefUnresolvedClock[] {
  const clocks: ContractDebriefUnresolvedClock[] = []
  const weakestLink = missionResult.weakestLink

  if (weakestLink?.recoveryPressureBand) {
    clocks.push({
      id: `recovery:${missionResult.caseId}`,
      label: 'Recovery pressure',
      detail: `Weakest-link recovery pressure ${weakestLink.recoveryPressureBand}.`,
    })
  }

  for (const consequence of missionResult.spawnedConsequences) {
    clocks.push({
      id: `consequence:${consequence.caseId}`,
      label:
        consequence.type === 'stage_escalation'
          ? 'Escalation clock'
          : consequence.type === 'queued_follow_up'
            ? 'Queued follow-up'
            : 'Follow-up case',
      detail: consequence.detail,
    })
  }

  return clocks
}

/**
 * SPE-1496 (PR #1621 review fix): `buildStrategicOptions` accepts the
 * structured numeric `factionStanding` array from `MissionResult.rewards`
 * directly so the "faction standing improved" inference no longer depends on
 * parsing the human-readable `detail` string of a faction changed-entity. The
 * `changedEntities` / `unresolvedClocks` inputs are still used for the other
 * inferences because those already key off id prefixes, not free-form copy.
 */
function buildStrategicOptions(
  record: Pick<
    ContractDebriefRecord,
    'outcome' | 'changedEntities' | 'unresolvedClocks' | 'factionId'
  > & {
    factionStanding: MissionResult['rewards']['factionStanding']
  }
): ContractDebriefStrategicOption[] {
  const options: ContractDebriefStrategicOption[] = []
  const staffChanges = record.changedEntities.filter((entity) => entity.kind === 'staff')
  const evidenceChanges = record.changedEntities.filter((entity) => entity.kind === 'evidence')

  if (record.unresolvedClocks.some((clock) => clock.id.startsWith('consequence:'))) {
    options.push({
      intent: 'chase-lead',
      label: getContractNextIntentLabel('chase-lead'),
      reason: 'A follow-up case is queued from this operation.',
    })
  }

  if (
    staffChanges.some((entity) => entity.id.startsWith('fatality:')) ||
    staffChanges.filter((entity) => entity.id.startsWith('injury:')).length >= 2 ||
    record.unresolvedClocks.some((clock) => clock.id.startsWith('recovery:'))
  ) {
    options.push({
      intent: 'stabilize-staff',
      label: getContractNextIntentLabel('stabilize-staff'),
      reason: 'Staff impact and recovery pressure need to be cleared before redeployment.',
    })
  }

  if (record.outcome === 'fail' || record.outcome === 'unresolved') {
    options.push({
      intent: 'repair-agency',
      label: getContractNextIntentLabel('repair-agency'),
      reason: 'Agency standing slipped from this operation.',
    })
  }

  const factionImproved = record.factionStanding.some((standing) => standing.delta > 0)
  if (record.factionId && factionImproved) {
    options.push({
      intent: 'pursue-faction',
      label: getContractNextIntentLabel('pursue-faction'),
      reason: 'Faction standing improved — keep the channel hot.',
    })
  }

  if (evidenceChanges.length > 0) {
    options.push({
      intent: 'prepare-equipment',
      label: getContractNextIntentLabel('prepare-equipment'),
      reason: 'Recovered evidence/materials are ready for fabrication or supply.',
    })
  }

  if (
    record.outcome !== 'success' ||
    record.unresolvedClocks.some((clock) => clock.id.startsWith('recovery:'))
  ) {
    options.push({
      intent: 'answer-emergency',
      label: getContractNextIntentLabel('answer-emergency'),
      reason: 'Active pressure is still elevated; surge response is available.',
    })
  }

  return dedupeStrategicOptions(options)
}

function dedupeStrategicOptions(
  options: ContractDebriefStrategicOption[]
): ContractDebriefStrategicOption[] {
  const seen = new Set<ContractNextIntent>()
  const deduped: ContractDebriefStrategicOption[] = []

  for (const option of options) {
    if (seen.has(option.intent)) {
      continue
    }
    seen.add(option.intent)
    deduped.push(option)
  }

  return deduped
}

/**
 * SPE-1496: deterministic per-contract debrief record. Pure derivation from the
 * supplied mission result and snapshot — no game-state side effects. Surfaces a
 * compact digest of changed entities, unresolved clocks, and a bounded set of
 * strategic options that map directly onto `ContractNextIntent` values.
 */
export function buildContractDebriefRecord(
  snapshot: WeeklyReportCaseSnapshot,
  reportWeek: number,
  caseInstance?: CaseInstance
): ContractDebriefRecord | null {
  const missionResult = snapshot.missionResult
  if (!missionResult) {
    return null
  }

  // SPE-1496 (PR #1621 review fix): merge contract runtime fields from both the
  // live `CaseInstance` and the `WeeklyReportCaseSnapshot` per field, instead of
  // picking one source wholesale. The case-instance contract takes precedence
  // when it actually carries a value for the field, but missing fields fall
  // back to the snapshot so an empty case-instance contract object can never
  // suppress a valid snapshot contract.
  const caseBag = readContractRuntimeBag(caseInstance?.contract)
  const snapshotBag = readContractRuntimeBag((snapshot as { contract?: unknown }).contract)
  const templateId = pickContractStringField(caseBag, snapshotBag)

  if (!templateId) {
    return null
  }

  const factionId = pickFactionId(caseBag, snapshotBag) ?? caseInstance?.factionId
  const factionLabel = factionId ? (getFactionDefinition(factionId)?.label ?? factionId) : undefined

  const changedEntities: ContractDebriefChangedEntity[] = [
    describeSubject(missionResult, snapshot),
    ...describeFatalities(missionResult),
    ...describeInjuries(missionResult.injuries),
    ...describeFatigueShifts(missionResult),
    ...describeFactionShifts(missionResult),
    ...describeEvidenceGains(missionResult),
  ]
  const routeEntity = describeRoute(missionResult, snapshot)
  if (routeEntity) {
    changedEntities.push(routeEntity)
  }

  const unresolvedClocks = describeUnresolvedClocks(missionResult)

  const factionSummary = factionLabel ? `${factionLabel} channel` : 'Open channel'
  const summary = `${snapshot.title} ${mapOutcomeLabel(missionResult.outcome)} via ${factionSummary}.`

  const strategicOptions = buildStrategicOptions({
    outcome: missionResult.outcome,
    changedEntities,
    unresolvedClocks,
    factionStanding: missionResult.rewards.factionStanding,
    ...(factionId ? { factionId } : {}),
  })

  return {
    caseId: snapshot.caseId,
    caseTitle: snapshot.title,
    contractTemplateId: templateId,
    ...(factionId ? { factionId } : {}),
    ...(factionLabel ? { factionLabel } : {}),
    outcome: missionResult.outcome,
    week: reportWeek,
    summary,
    changedEntities,
    unresolvedClocks,
    strategicOptions,
  }
}

/**
 * SPE-1496 (PR #1621 review fix): bounded urgency ranking for the latest-report
 * debrief records. Lower number = more urgent, which sorts first.
 *
 * The order is intentionally compact and deterministic — failure and unresolved
 * outcomes lead so the front-desk attention tone derived from `records[0]`
 * surfaces the most pressing signal in a week that mixes outcomes.
 */
const DEBRIEF_OUTCOME_URGENCY_RANK: Record<MissionResolutionKind, number> = {
  fail: 0,
  unresolved: 1,
  partial: 2,
  success: 3,
}

function compareDebriefRecordsByUrgency(
  left: ContractDebriefRecord,
  right: ContractDebriefRecord
): number {
  const outcomeDelta =
    DEBRIEF_OUTCOME_URGENCY_RANK[left.outcome] - DEBRIEF_OUTCOME_URGENCY_RANK[right.outcome]
  if (outcomeDelta !== 0) {
    return outcomeDelta
  }
  const clockDelta = right.unresolvedClocks.length - left.unresolvedClocks.length
  if (clockDelta !== 0) {
    return clockDelta
  }
  return left.caseId.localeCompare(right.caseId)
}

/**
 * SPE-1496: scan the most recent weekly report for completed contract operations
 * and emit their structured debrief records.
 *
 * Records are ordered by urgency (`fail` > `unresolved` > `partial` > `success`),
 * with ties broken by unresolved-clock count (more clocks first) and finally by
 * `caseId` ascending for full determinism. This lets downstream surfaces such
 * as the front-desk attention item read `records[0]` and trust it represents
 * the most pressing signal in the week, not just the alphabetic first case.
 */
export function getRecentContractDebriefRecords(
  game: Pick<GameState, 'reports' | 'cases'>,
  limit = 3
): ContractDebriefRecord[] {
  const latest: WeeklyReport | undefined = game.reports.at(-1)
  if (!latest) {
    return []
  }

  // Iterate snapshots in caseId order first so record construction itself is
  // deterministic; the final `sort` below then re-orders by urgency.
  const snapshots = Object.values(latest.caseSnapshots ?? {})
    .filter(
      (snapshot): snapshot is WeeklyReportCaseSnapshot =>
        Boolean(snapshot?.missionResult) &&
        // A case-snapshot represents a completed contract operation when the
        // mission result reports a terminal outcome and the snapshot's case
        // still has contract runtime data (or carried it in the snapshot).
        (snapshot.missionResult?.outcome === 'success' ||
          snapshot.missionResult?.outcome === 'partial' ||
          snapshot.missionResult?.outcome === 'fail' ||
          snapshot.missionResult?.outcome === 'unresolved')
    )
    .sort((left, right) => left.caseId.localeCompare(right.caseId))

  const records: ContractDebriefRecord[] = []

  for (const snapshot of snapshots) {
    const caseInstance = game.cases[snapshot.caseId]
    const record = buildContractDebriefRecord(snapshot, latest.week, caseInstance)
    if (record) {
      records.push(record)
    }
  }

  records.sort(compareDebriefRecordsByUrgency)
  return records.slice(0, Math.max(0, limit))
}
