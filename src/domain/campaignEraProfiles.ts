export type HistoricalEraLayer = 'ancient' | 'medieval' | 'renaissance' | 'colonial'
export type EraRoleId =
  | 'officer'
  | 'courtier'
  | 'preacher'
  | 'scholar'
  | 'forester'
  | 'wizard'
  | 'bard'
  | 'gunsmith'
export type EraEquipmentCategory =
  | 'blackpowder'
  | 'plate_armor'
  | 'printing_press'
  | 'ritual_implements'
  | 'field_medicine'
  | 'clockwork_tools'
export type PowerFamilyId = 'arcane' | 'miracle' | 'folk_rite' | 'alchemy'
export type SettlementStyleId =
  | 'fortified_market_town'
  | 'cathedral_city'
  | 'colonial_outpost'
  | 'ruin_field'
export type SuppressedInteractionSurface =
  | 'wizard_colleges'
  | 'bardic_spellcasting'
  | 'blackpowder_logistics'
  | 'printing_press_distribution'

export interface CampaignEraProfileInput {
  profileId: string
  label: string
  eraLayers: readonly HistoricalEraLayer[]
  allowedRoles: readonly EraRoleId[]
  suppressedRoles?: readonly EraRoleId[]
  availableEquipmentCategories: readonly EraEquipmentCategory[]
  suppressedEquipmentCategories?: readonly EraEquipmentCategory[]
  enabledPowerFamilies: readonly PowerFamilyId[]
  suppressedPowerFamilies?: readonly PowerFamilyId[]
  moneyModel: 'tribute' | 'coinage' | 'mercantile_credit'
  prevalentMonsterFamilies: readonly string[]
  settlementStyleHints: readonly SettlementStyleId[]
  suppressedInteractionSurfaces?: readonly SuppressedInteractionSurface[]
}

export interface CampaignEraProfilePacket {
  profileId: string
  label: string
  eraLayers: HistoricalEraLayer[]
  allowedRoles: EraRoleId[]
  suppressedRoles: EraRoleId[]
  availableEquipmentCategories: EraEquipmentCategory[]
  suppressedEquipmentCategories: EraEquipmentCategory[]
  enabledPowerFamilies: PowerFamilyId[]
  suppressedPowerFamilies: PowerFamilyId[]
  moneyModel: CampaignEraProfileInput['moneyModel']
  prevalentMonsterFamilies: string[]
  settlementStyleHints: SettlementStyleId[]
  suppressedInteractionSurfaces: SuppressedInteractionSurface[]
}

export interface CampaignEraOverlaySurface {
  profileId: string
  mixedEra: boolean
  roleAccess: {
    allowed: EraRoleId[]
    suppressed: EraRoleId[]
  }
  equipmentAvailability: {
    available: EraEquipmentCategory[]
    suppressed: EraEquipmentCategory[]
  }
  powerAvailability: {
    enabled: PowerFamilyId[]
    suppressed: PowerFamilyId[]
  }
  moneyModel: CampaignEraProfileInput['moneyModel']
  monsterPressureFamilies: string[]
  settlementStyleHints: SettlementStyleId[]
  suppressedInteractionSurfaces: SuppressedInteractionSurface[]
}

function normalizeString(value: string) {
  return value.trim()
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values.map((value) => normalizeString(value) as T).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right)
  ) as T[]
}

export function createCampaignEraProfilePacket(
  input: CampaignEraProfileInput
): CampaignEraProfilePacket {
  return {
    profileId: normalizeString(input.profileId),
    label: normalizeString(input.label),
    eraLayers: uniqueSorted(input.eraLayers),
    allowedRoles: uniqueSorted(input.allowedRoles),
    suppressedRoles: uniqueSorted(input.suppressedRoles ?? []),
    availableEquipmentCategories: uniqueSorted(input.availableEquipmentCategories),
    suppressedEquipmentCategories: uniqueSorted(input.suppressedEquipmentCategories ?? []),
    enabledPowerFamilies: uniqueSorted(input.enabledPowerFamilies),
    suppressedPowerFamilies: uniqueSorted(input.suppressedPowerFamilies ?? []),
    moneyModel: input.moneyModel,
    prevalentMonsterFamilies: uniqueSorted(input.prevalentMonsterFamilies),
    settlementStyleHints: uniqueSorted(input.settlementStyleHints),
    suppressedInteractionSurfaces: uniqueSorted(input.suppressedInteractionSurfaces ?? []),
  }
}

export function deriveCampaignEraOverlay(
  packet: CampaignEraProfilePacket
): CampaignEraOverlaySurface {
  return {
    profileId: packet.profileId,
    mixedEra: packet.eraLayers.length > 1,
    roleAccess: {
      allowed: [...packet.allowedRoles],
      suppressed: [...packet.suppressedRoles],
    },
    equipmentAvailability: {
      available: [...packet.availableEquipmentCategories],
      suppressed: [...packet.suppressedEquipmentCategories],
    },
    powerAvailability: {
      enabled: [...packet.enabledPowerFamilies],
      suppressed: [...packet.suppressedPowerFamilies],
    },
    moneyModel: packet.moneyModel,
    monsterPressureFamilies: [...packet.prevalentMonsterFamilies],
    settlementStyleHints: [...packet.settlementStyleHints],
    suppressedInteractionSurfaces: [...packet.suppressedInteractionSurfaces],
  }
}

export function hasSuppressedInteractionSurface(packet: CampaignEraProfilePacket): boolean {
  return (
    packet.suppressedInteractionSurfaces.length > 0 ||
    packet.suppressedRoles.length > 0 ||
    packet.suppressedEquipmentCategories.length > 0 ||
    packet.suppressedPowerFamilies.length > 0
  )
}
