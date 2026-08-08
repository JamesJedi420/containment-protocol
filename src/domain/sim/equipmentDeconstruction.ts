import {
  EQUIPMENT_DECONSTRUCTION_PROFILES,
  getEquipmentDeconstructionProfile,
  validateEquipmentDeconstructionProfiles,
} from '../../data/equipmentDeconstruction'
import { inventoryItemLabels } from '../../data/production'
import { getEquipmentCatalogEntries, getEquipmentDefinition } from '../equipment'
import {
  getEquipmentGradeCatalogParticipation,
  getEquipmentGradeCatalogVisibility,
} from '../equipmentGradeCatalog'
import { resolveEquipmentGradeProjection } from '../equipmentGrade'
import {
  resolveEquipmentGradeRecoveryOutcome,
  type EquipmentGradeRecoveryIssue,
  type EquipmentGradeRecoveryResolution,
  type EquipmentRecoveryRestrictionCode,
} from '../equipmentGradeRecovery'
import {
  appendOperationEventDrafts,
  createEquipmentRecoveryCompletedDraft,
  createEquipmentRecoveryStartedDraft,
  type AnyOperationEventDraft,
} from '../events'
import type {
  EquipmentDeconstructionQueueEntry,
  EquipmentRecoveryOutcome,
  GameState,
} from '../models'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'

const UNSAFE_QUEUE_IDS = new Set(['__proto__', 'constructor', 'prototype'])
const INTEGER_INDEX_PATTERN = /^(0|[1-9]\d*)$/
let profilesValidated = false

function ensureProfilesValid() {
  if (profilesValidated) return
  validateEquipmentDeconstructionProfiles(
    EQUIPMENT_DECONSTRUCTION_PROFILES,
    getEquipmentCatalogEntries().map((definition) => ({
      id: definition.id,
      origin: definition.gradeProfile.origin,
    }))
  )
  profilesValidated = true
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function hasOwn(object: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

export function isSafeEquipmentRecoveryQueueId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value === value.trim() &&
    !INTEGER_INDEX_PATTERN.test(value) &&
    !UNSAFE_QUEUE_IDS.has(value)
  )
}

function nextQueueId(state: GameState) {
  const reserved = new Set([
    ...(state.equipmentDeconstructionQueue ?? []).map((entry) => entry.id),
    ...Object.keys(state.equipmentRecoveryOutcomes ?? {}),
  ])
  const baseId = `recovery-${state.week}-${(state.equipmentDeconstructionQueue ?? []).length + 1}-${state.events.length + 1}`
  let candidate = baseId
  let suffix = 2
  while (reserved.has(candidate)) {
    candidate = `${baseId}-${suffix}`
    suffix += 1
  }
  return candidate
}

function profileDeferredResolution(itemId: string): EquipmentGradeRecoveryResolution | undefined {
  const definition = getEquipmentDefinition(itemId)
  if (!definition) return undefined
  const participation = getEquipmentGradeCatalogParticipation(definition.gradeProfile)
  const visibility = getEquipmentGradeCatalogVisibility(definition.gradeProfile)
  return Object.freeze({
    available: false,
    projection: resolveEquipmentGradeProjection(participation, visibility),
    issues: Object.freeze([Object.freeze({ code: 'profile_deferred' as const, field: 'profile' })]),
  })
}

export interface EquipmentDeconstructionPreview {
  readonly itemId: string
  readonly itemName: string
  readonly stock: number
  readonly resolution: EquipmentGradeRecoveryResolution
}

export function resolveEquipmentDeconstructionPreview(
  state: GameState,
  itemId: string
): EquipmentDeconstructionPreview | undefined {
  ensureProfilesValid()
  const definition = getEquipmentDefinition(itemId)
  const profile = getEquipmentDeconstructionProfile(itemId)
  if (!definition || !profile) return undefined
  const stock = Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
  if (profile.state === 'deferred') {
    return Object.freeze({
      itemId,
      itemName: definition.name,
      stock,
      resolution: profileDeferredResolution(itemId)!,
    })
  }

  const restrictions: EquipmentRecoveryRestrictionCode[] = []
  if (Object.values(state.fabricatedEquipmentLots ?? {}).some((lot) => lot.itemId === itemId)) {
    restrictions.push('fabricated_lot_selection_unavailable')
  }
  const condition = (state.damagedEquipmentQueue ?? []).includes(itemId)
    ? ('damaged' as const)
    : ('operational' as const)
  return Object.freeze({
    itemId,
    itemName: definition.name,
    stock,
    resolution: resolveEquipmentGradeRecoveryOutcome(
      profile.rule,
      getEquipmentGradeCatalogParticipation(definition.gradeProfile),
      getEquipmentGradeCatalogVisibility(definition.gradeProfile),
      { condition, restrictions }
    ),
  })
}

export function queueEquipmentDeconstruction(state: GameState, itemId: string): GameState {
  const preview = resolveEquipmentDeconstructionPreview(state, itemId)
  if (!preview || preview.stock < 1 || !preview.resolution.available) {
    return ensureNormalizedGameState(state)
  }
  if (preview.resolution.participation.state !== 'graded') {
    return ensureNormalizedGameState(state)
  }

  const queueId = nextQueueId(state)
  const entry: EquipmentDeconstructionQueueEntry = Object.freeze({
    id: queueId,
    itemId,
    itemName: preview.itemName,
    pathId: preview.resolution.pathId,
    sourceGradeId: preview.resolution.participation.gradeId,
    sourceGradeVisibility: preview.resolution.visibility,
    sourceCondition: preview.resolution.condition,
    outputMaterials: preview.resolution.materials.map((material) => ({
      materialId: material.materialId,
      materialName: inventoryItemLabels[material.materialId] ?? material.materialId,
      quantity: material.quantity,
    })),
    wasteQuantity: preview.resolution.waste,
    startedWeek: state.week,
    durationWeeks: preview.resolution.durationWeeks,
    remainingWeeks: preview.resolution.durationWeeks,
    explanationCodes: [...preview.resolution.explanationCodes],
  })

  const nextState = normalizeGameState({
    ...state,
    inventory: { ...state.inventory, [itemId]: preview.stock - 1 },
    damagedEquipmentQueue: (state.damagedEquipmentQueue ?? []).filter((id) => id !== itemId),
    equipmentDeconstructionQueue: [...(state.equipmentDeconstructionQueue ?? []), entry],
  })

  return appendOperationEventDrafts(nextState, [
    createEquipmentRecoveryStartedDraft({
      week: state.week,
      queueId,
      itemId,
      itemName: preview.itemName,
      pathId: entry.pathId,
      sourceGradeId: entry.sourceGradeId,
      sourceCondition: entry.sourceCondition,
      outputMaterials: entry.outputMaterials,
      wasteQuantity: entry.wasteQuantity,
      etaWeeks: entry.durationWeeks,
    }),
  ])
}

function materialOutputsMatch(
  left: readonly { materialId: string; quantity: number }[],
  right: readonly { materialId: string; quantity: number }[]
) {
  const normalize = (values: readonly { materialId: string; quantity: number }[]) =>
    values
      .map(({ materialId, quantity }) => ({ materialId, quantity }))
      .sort((a, b) => compareCodeUnits(a.materialId, b.materialId))
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
}

function receiptMatchesEntry(
  outcome: EquipmentRecoveryOutcome,
  entry: EquipmentDeconstructionQueueEntry
) {
  return (
    outcome.queueId === entry.id &&
    outcome.itemId === entry.itemId &&
    outcome.pathId === entry.pathId &&
    outcome.sourceGradeId === entry.sourceGradeId &&
    outcome.sourceCondition === entry.sourceCondition &&
    outcome.wasteQuantity === entry.wasteQuantity &&
    materialOutputsMatch(outcome.outputMaterials, entry.outputMaterials)
  )
}

export function advanceEquipmentDeconstructionQueues(state: GameState) {
  const queue = state.equipmentDeconstructionQueue ?? []
  if (queue.length === 0) {
    return { state: ensureNormalizedGameState(state), completed: [], eventDrafts: [] }
  }

  const nextInventory = { ...state.inventory }
  const outcomes = { ...(state.equipmentRecoveryOutcomes ?? {}) }
  const nextQueue: EquipmentDeconstructionQueueEntry[] = []
  const completed: EquipmentDeconstructionQueueEntry[] = []
  const eventDrafts: AnyOperationEventDraft[] = []

  for (const entry of queue) {
    if (!isSafeEquipmentRecoveryQueueId(entry.id)) {
      nextQueue.push(entry)
      continue
    }
    const existing = hasOwn(outcomes, entry.id) ? outcomes[entry.id] : undefined
    if (existing && receiptMatchesEntry(existing, entry)) continue
    if (existing) {
      nextQueue.push(entry)
      continue
    }

    const remainingWeeks = Math.max(0, entry.remainingWeeks - 1)
    if (remainingWeeks > 0) {
      nextQueue.push({ ...entry, remainingWeeks })
      continue
    }

    for (const material of entry.outputMaterials) {
      nextInventory[material.materialId] =
        Math.max(0, Math.trunc(nextInventory[material.materialId] ?? 0)) + material.quantity
    }
    const outcome: EquipmentRecoveryOutcome = Object.freeze({
      queueId: entry.id,
      itemId: entry.itemId,
      pathId: entry.pathId,
      sourceGradeId: entry.sourceGradeId,
      sourceCondition: entry.sourceCondition,
      outputMaterials: entry.outputMaterials.map((material) => Object.freeze({ ...material })),
      wasteQuantity: entry.wasteQuantity,
      completedWeek: state.week,
    })
    outcomes[entry.id] = outcome
    completed.push(entry)
    eventDrafts.push(
      createEquipmentRecoveryCompletedDraft({
        week: state.week,
        queueId: entry.id,
        itemId: entry.itemId,
        itemName: entry.itemName,
        pathId: entry.pathId,
        sourceGradeId: entry.sourceGradeId,
        sourceCondition: entry.sourceCondition,
        outputMaterials: entry.outputMaterials,
        wasteQuantity: entry.wasteQuantity,
      })
    )
  }

  return {
    state: normalizeGameState({
      ...state,
      inventory: nextInventory,
      equipmentDeconstructionQueue: nextQueue,
      equipmentRecoveryOutcomes: outcomes,
    }),
    completed,
    eventDrafts,
  }
}

export function getEquipmentRecoveryIssueLabel(issue: EquipmentGradeRecoveryIssue) {
  switch (issue.code) {
    case 'profile_deferred':
      return 'Recovery profile not yet authored'
    case 'fabricated_lot_selection_unavailable':
      return 'Fabricated batch selection is unavailable'
    case 'hidden_grade':
      return 'Grade outcome is hidden'
    case 'custody_restricted':
      return 'Custody restriction blocks destruction'
    case 'evidence_held':
      return 'Evidence hold blocks destruction'
    case 'authorization_required':
      return 'Destruction authorization is required'
    case 'contamination_quarantine':
      return 'Quarantine is required before dismantling'
    case 'reserved':
      return 'Equipment is reserved by another process'
    case 'unstable_anomaly':
      return 'Unstable anomalous equipment cannot be dismantled'
    default:
      return 'Recovery outcome unavailable'
  }
}
