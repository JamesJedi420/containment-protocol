import {
  validateEquipmentGradeRecoveryRule,
  type EquipmentGradeRecoveryRule,
} from '../domain/equipmentGradeRecovery'

const RECOVERABLE_PRODUCTION_MATERIAL_IDS = new Set([
  'electronic_parts',
  'medical_supplies',
  'occult_reagents',
  'warding_resin',
  'ballistic_supplies',
])

export type EquipmentDeconstructionProfile =
  | Readonly<{ state: 'eligible'; itemId: string; rule: EquipmentGradeRecoveryRule }>
  | Readonly<{ state: 'deferred'; itemId: string; reasonCode: 'recovery_profile_not_authored' }>

const eligible = (
  itemId: string,
  rule: EquipmentGradeRecoveryRule
): EquipmentDeconstructionProfile =>
  Object.freeze({ state: 'eligible', itemId, rule: Object.freeze(rule) })
const deferred = (itemId: string): EquipmentDeconstructionProfile =>
  Object.freeze({ state: 'deferred', itemId, reasonCode: 'recovery_profile_not_authored' })

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
  eligible('medkits', {
    kind: 'yield_threshold',
    pathId: 'component_reclamation',
    baseMaterials: [{ materialId: 'medical_supplies', quantity: 1 }],
    baseWaste: 1,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    bonusMaterialId: 'medical_supplies',
    bonusQuantity: 1,
    wasteReduction: 1,
  }),
  eligible('signal_jammers', {
    kind: 'yield_threshold',
    pathId: 'component_reclamation',
    baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
    baseWaste: 2,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    bonusMaterialId: 'electronic_parts',
    bonusQuantity: 1,
    wasteReduction: 1,
  }),
  eligible('emf_sensors', {
    kind: 'yield_threshold',
    pathId: 'component_reclamation',
    baseMaterials: [{ materialId: 'electronic_parts', quantity: 1 }],
    baseWaste: 2,
    baseDurationWeeks: 1,
    thresholdGradeId: 'grade_2',
    bonusMaterialId: 'occult_reagents',
    bonusQuantity: 1,
    wasteReduction: 1,
  }),
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
    'environmental_sampler',
    'encrypted_field_tablet',
    'advanced_recon_suite',
    'occult_detection_array',
    'signal_intercept_kit',
    'field_plate',
    'containment_staff',
    'hazmat_suit',
    'analysis_goggles',
    'trauma_kit',
    'combat_stims',
    'tactical_radio',
    'breach_visor',
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
