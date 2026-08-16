import {
  validateEquipmentGradeRecoveryRule,
  type EquipmentGradeRecoveryRule,
} from '../domain/equipmentGradeRecovery'
import { productionMaterialCatalog } from './production'

const RECOVERABLE_PRODUCTION_MATERIAL_IDS = new Set(
  productionMaterialCatalog.map((material) => material.materialId)
)

export type EquipmentDeconstructionProfile =
  | Readonly<{
      state: 'eligible'
      itemId: string
      rule: EquipmentGradeRecoveryRule
      sourceAuthority: 'aggregate' | 'equipment_instance'
    }>
  | Readonly<{ state: 'deferred'; itemId: string; reasonCode: 'recovery_profile_not_authored' }>

const eligible = (
  itemId: string,
  rule: EquipmentGradeRecoveryRule
): EquipmentDeconstructionProfile =>
  Object.freeze({
    state: 'eligible',
    itemId,
    rule: Object.freeze(rule),
    sourceAuthority: 'aggregate',
  })
const eligibleInstance = (
  itemId: string,
  rule: EquipmentGradeRecoveryRule
): EquipmentDeconstructionProfile =>
  Object.freeze({
    state: 'eligible',
    itemId,
    rule: Object.freeze(rule),
    sourceAuthority: 'equipment_instance',
  })
const deferred = (itemId: string): EquipmentDeconstructionProfile =>
  Object.freeze({ state: 'deferred', itemId, reasonCode: 'recovery_profile_not_authored' })

const electronicComponentReclamationRule = (): EquipmentGradeRecoveryRule => ({
  kind: 'yield_threshold',
  pathId: 'component_reclamation',
  baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
  baseWaste: 2,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2',
  bonusMaterialId: 'electronic_parts',
  bonusQuantity: 1,
  wasteReduction: 1,
})

const medicalComponentReclamationRule = (): EquipmentGradeRecoveryRule => ({
  kind: 'yield_threshold',
  pathId: 'component_reclamation',
  baseMaterials: [{ materialId: 'medical_supplies', quantity: 1 }],
  baseWaste: 1,
  baseDurationWeeks: 1,
  thresholdGradeId: 'grade_2',
  bonusMaterialId: 'medical_supplies',
  bonusQuantity: 1,
  wasteReduction: 1,
})

export const EQUIPMENT_DECONSTRUCTION_PROFILES = Object.freeze([
  eligible('silver_rounds', {
    kind: 'yield_threshold',
    pathId: 'component_reclamation',
    baseMaterials: [{ materialId: 'ballistic_supplies', quantity: 1 }],
    baseWaste: 1,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    bonusMaterialId: 'ballistic_supplies',
    bonusQuantity: 1,
    wasteReduction: 1,
  }),
  eligible('medkits', medicalComponentReclamationRule()),
  eligible('trauma_kit', medicalComponentReclamationRule()),
  eligibleInstance('combat_stims', medicalComponentReclamationRule()),
  eligible('signal_jammers', electronicComponentReclamationRule()),
  eligible('emf_sensors', electronicComponentReclamationRule()),
  eligible('environmental_sampler', electronicComponentReclamationRule()),
  eligible('encrypted_field_tablet', electronicComponentReclamationRule()),
  eligible('advanced_recon_suite', electronicComponentReclamationRule()),
  eligible('signal_intercept_kit', electronicComponentReclamationRule()),
  eligible('analysis_goggles', electronicComponentReclamationRule()),
  eligible('tactical_radio', electronicComponentReclamationRule()),
  eligible('breach_visor', electronicComponentReclamationRule()),
  eligible('ward_seals', {
    kind: 'handling_threshold',
    pathId: 'ritual_disassembly',
    baseMaterials: [{ materialId: 'occult_reagents', quantity: 1 }],
    baseWaste: 1,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    additionalDurationWeeks: 1,
  }),
  eligible('warding_kits', {
    kind: 'handling_threshold',
    pathId: 'ritual_disassembly',
    baseMaterials: [{ materialId: 'warding_resin', quantity: 1 }],
    baseWaste: 2,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    additionalDurationWeeks: 1,
  }),
  eligible('ritual_components', {
    kind: 'handling_threshold',
    pathId: 'ritual_disassembly',
    baseMaterials: [{ materialId: 'occult_reagents', quantity: 1 }],
    baseWaste: 2,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    additionalDurationWeeks: 1,
  }),
  ...[
    'diplomatic_kit',
    'anomaly_scanner',
    'spectral_em_array',
    'occult_detection_array',
    'field_plate',
    'containment_staff',
    'hazmat_suit',
  ].map(deferred),
] as const satisfies readonly EquipmentDeconstructionProfile[])

const PROFILE_BY_ITEM_ID = new Map(
  EQUIPMENT_DECONSTRUCTION_PROFILES.map((profile) => [profile.itemId, profile])
)

export interface EquipmentRecoveryCatalogEntry {
  readonly id: string
  readonly origin: 'ordinary' | 'magical' | 'technological' | 'hybrid'
}

export function validateEquipmentDeconstructionProfiles(
  profiles: readonly EquipmentDeconstructionProfile[],
  catalogEntries: readonly EquipmentRecoveryCatalogEntry[]
) {
  const catalogById = new Map(catalogEntries.map((entry) => [entry.id, entry]))
  const catalogIds = catalogEntries.map((definition) => definition.id).sort()
  const seen = new Set<string>()
  for (const profile of profiles) {
    if (seen.has(profile.itemId))
      throw new Error(`Duplicate equipment recovery profile: ${profile.itemId}`)
    seen.add(profile.itemId)
    if (!catalogById.has(profile.itemId))
      throw new Error(`Unknown equipment recovery item: ${profile.itemId}`)
    if (profile.state === 'deferred') continue
    if (profile.sourceAuthority === 'equipment_instance' && profile.itemId !== 'combat_stims') {
      throw new Error(`Unsupported equipment instance recovery profile: ${profile.itemId}`)
    }
    const validation = validateEquipmentGradeRecoveryRule(profile.rule)
    if (!validation.valid) {
      throw new Error(
        `Invalid equipment recovery rule for ${profile.itemId}: ${validation.issues.map((issue) => `${issue.field}:${issue.code}`).join(',')}`
      )
    }
    const outputIds = [
      ...validation.value.baseMaterials.map((material) => material.materialId),
      ...(validation.value.kind === 'yield_threshold' ? [validation.value.bonusMaterialId] : []),
    ]
    if (outputIds.some((materialId) => !RECOVERABLE_PRODUCTION_MATERIAL_IDS.has(materialId))) {
      throw new Error(`Unknown equipment recovery material for ${profile.itemId}`)
    }
    const origin = catalogById.get(profile.itemId)!.origin
    if (
      (validation.value.pathId === 'component_reclamation' && origin === 'magical') ||
      (validation.value.pathId === 'ritual_disassembly' && origin === 'technological')
    ) {
      throw new Error(`Equipment recovery path/origin mismatch for ${profile.itemId}`)
    }
  }
  const profileIds = [...seen].sort()
  if (JSON.stringify(profileIds) !== JSON.stringify(catalogIds)) {
    throw new Error('Equipment recovery registry must explicitly cover every catalog definition')
  }
}

export function getEquipmentDeconstructionProfile(itemId: string) {
  return PROFILE_BY_ITEM_ID.get(itemId)
}
