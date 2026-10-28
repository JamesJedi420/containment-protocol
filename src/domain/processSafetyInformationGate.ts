/**
 * SPE-872 — process safety information gate.
 *
 * Pure caller-owned baseline information prerequisites: deep hazard review
 * stays blocked until substance, technology, and equipment packets are
 * complete and current. Distinct from hazard-analysis workflow (SPE-873),
 * equipment integrity (SPE-877), and startup readiness (SPE-876).
 * No GameState field.
 */

export const PROCESS_SAFETY_INFORMATION_GATE_OWNER = 'SPE-872' as const

export type InformationGateStatus = 'ready' | 'blocked'

export interface TechnologySafeLimit {
  readonly limitId: string
  readonly metric: string
  readonly bound: number
  readonly unit: string
}

export interface TechnologyDeviationConsequence {
  readonly deviationId: string
  readonly trigger: string
  readonly consequence: string
}

export interface TechnologyProfile {
  readonly technologyId: string
  readonly intendedOperation: string
  readonly safeLimits: readonly TechnologySafeLimit[]
  readonly deviationConsequences: readonly TechnologyDeviationConsequence[]
}

export interface CriticalEquipmentDossier {
  readonly equipmentId: string
  readonly construction: string
  readonly protection: string
  readonly sensing: string
  readonly shutdown: string
  readonly relief: string
  readonly supportSystems: string
  /** When true, asset is legacy and requires active safe-operation proof. */
  readonly legacy: boolean
  readonly safeOperationProofActive: boolean
}

export interface ProcessSafetyInformationPacket {
  readonly processId: string
  readonly substancesComplete: boolean
  readonly inventoriesDocumented: boolean
  readonly diagramsCurrent: boolean
  readonly protectiveInfrastructureDocumented: boolean
  readonly technology: TechnologyProfile | null
  readonly equipment: readonly CriticalEquipmentDossier[]
}

export interface ProcessSafetyInformationGateState {
  readonly processId: string
  readonly status: InformationGateStatus
  readonly deepHazardReviewAllowed: boolean
  readonly missingPrerequisites: readonly string[]
  readonly legacyAssetsValid: readonly string[]
  readonly legacyAssetsInvalid: readonly string[]
  readonly reasons: readonly string[]
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`process safety information ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requireFiniteNumber(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`process safety information ${label} must be a finite number`)
  }
  return value
}

/**
 * Fail-closed create for one technology profile with reusable safe limits
 * and deviation consequences.
 */
export function createTechnologyProfile(input: TechnologyProfile): TechnologyProfile {
  const technologyId = requireNonEmpty(input.technologyId, 'technologyId')
  const intendedOperation = requireNonEmpty(input.intendedOperation, 'intendedOperation')

  const safeLimits = (input.safeLimits ?? []).map((limit) =>
    Object.freeze({
      limitId: requireNonEmpty(limit.limitId, 'safeLimit.limitId'),
      metric: requireNonEmpty(limit.metric, 'safeLimit.metric'),
      bound: requireFiniteNumber(limit.bound, 'safeLimit.bound'),
      unit: requireNonEmpty(limit.unit, 'safeLimit.unit'),
    }),
  )
  if (safeLimits.length === 0) {
    throw new Error('process safety information technology requires at least one safeLimit')
  }

  const deviationConsequences = (input.deviationConsequences ?? []).map((entry) =>
    Object.freeze({
      deviationId: requireNonEmpty(entry.deviationId, 'deviation.deviationId'),
      trigger: requireNonEmpty(entry.trigger, 'deviation.trigger'),
      consequence: requireNonEmpty(entry.consequence, 'deviation.consequence'),
    }),
  )
  if (deviationConsequences.length === 0) {
    throw new Error(
      'process safety information technology requires at least one deviationConsequence',
    )
  }

  return Object.freeze({
    technologyId,
    intendedOperation,
    safeLimits: Object.freeze(safeLimits),
    deviationConsequences: Object.freeze(deviationConsequences),
  })
}

/**
 * Fail-closed create for one critical-equipment dossier.
 * Legacy assets require active safe-operation proof to remain valid.
 */
export function createCriticalEquipmentDossier(
  input: CriticalEquipmentDossier,
): CriticalEquipmentDossier {
  return Object.freeze({
    equipmentId: requireNonEmpty(input.equipmentId, 'equipmentId'),
    construction: requireNonEmpty(input.construction, 'construction'),
    protection: requireNonEmpty(input.protection, 'protection'),
    sensing: requireNonEmpty(input.sensing, 'sensing'),
    shutdown: requireNonEmpty(input.shutdown, 'shutdown'),
    relief: requireNonEmpty(input.relief, 'relief'),
    supportSystems: requireNonEmpty(input.supportSystems, 'supportSystems'),
    legacy: Boolean(input.legacy),
    safeOperationProofActive: Boolean(input.safeOperationProofActive),
  })
}

function tryValidateTechnology(
  technology: TechnologyProfile | null | undefined,
): { ok: true; profile: TechnologyProfile } | { ok: false; reason: string } {
  if (technology == null) {
    return { ok: false, reason: 'technology-profile' }
  }
  try {
    return { ok: true, profile: createTechnologyProfile(technology) }
  } catch {
    return { ok: false, reason: 'technology-profile-incomplete' }
  }
}

function tryValidateEquipment(
  dossier: CriticalEquipmentDossier,
): { ok: true; dossier: CriticalEquipmentDossier } | { ok: false; reason: string } {
  try {
    return { ok: true, dossier: createCriticalEquipmentDossier(dossier) }
  } catch {
    const id =
      typeof dossier?.equipmentId === 'string' && dossier.equipmentId.trim()
        ? dossier.equipmentId.trim()
        : 'unknown'
    return { ok: false, reason: `equipment-incomplete:${id}` }
  }
}

/**
 * Evaluate the information gate for one process.
 * Deep hazard review is allowed only when all baseline packets are complete
 * and every legacy asset has active safe-operation proof.
 * Raw packets are revalidated through the same fail-closed constructors.
 */
export function evaluateProcessSafetyInformationGate(
  packet: ProcessSafetyInformationPacket,
): ProcessSafetyInformationGateState {
  const processId = requireNonEmpty(packet.processId, 'processId')
  const missing: string[] = []
  const reasons: string[] = []
  const legacyValid: string[] = []
  const legacyInvalid: string[] = []

  if (!packet.substancesComplete) {
    missing.push('substances')
    reasons.push('missing:substances')
  }
  if (!packet.inventoriesDocumented) {
    missing.push('inventories')
    reasons.push('missing:inventories')
  }
  if (!packet.diagramsCurrent) {
    missing.push('diagrams')
    reasons.push('missing:diagrams')
  }
  if (!packet.protectiveInfrastructureDocumented) {
    missing.push('protective-infrastructure')
    reasons.push('missing:protective-infrastructure')
  }

  const technologyResult = tryValidateTechnology(packet.technology)
  if (!technologyResult.ok) {
    missing.push(technologyResult.reason)
    reasons.push(
      technologyResult.reason === 'technology-profile'
        ? 'missing:technology-profile'
        : 'incomplete:technology-profile',
    )
  }

  const rawEquipment = packet.equipment ?? []
  if (rawEquipment.length === 0) {
    missing.push('equipment-dossiers')
    reasons.push('missing:equipment-dossiers')
  }

  const seenIds = new Set<string>()
  const validated: CriticalEquipmentDossier[] = []
  for (const entry of rawEquipment) {
    const result = tryValidateEquipment(entry)
    if (!result.ok) {
      missing.push(result.reason)
      reasons.push(`incomplete:equipment:${result.reason.replace(/^equipment-incomplete:/, '')}`)
      continue
    }
    if (seenIds.has(result.dossier.equipmentId)) {
      missing.push(`equipment-duplicate:${result.dossier.equipmentId}`)
      reasons.push(`duplicate:equipment:${result.dossier.equipmentId}`)
      continue
    }
    seenIds.add(result.dossier.equipmentId)
    validated.push(result.dossier)
  }

  for (const dossier of [...validated].sort((a, b) => compareAscii(a.equipmentId, b.equipmentId))) {
    if (!dossier.legacy) continue
    if (dossier.safeOperationProofActive) {
      legacyValid.push(dossier.equipmentId)
      reasons.push(`legacy-valid:${dossier.equipmentId}`)
    } else {
      legacyInvalid.push(dossier.equipmentId)
      missing.push(`legacy-proof:${dossier.equipmentId}`)
      reasons.push(`legacy-invalid:${dossier.equipmentId}`)
    }
  }

  const ready = missing.length === 0
  return Object.freeze({
    processId,
    status: ready ? 'ready' : 'blocked',
    deepHazardReviewAllowed: ready,
    missingPrerequisites: Object.freeze([...missing].sort(compareAscii)),
    legacyAssetsValid: Object.freeze(legacyValid),
    legacyAssetsInvalid: Object.freeze(legacyInvalid),
    reasons: Object.freeze([...reasons].sort(compareAscii)),
  })
}
