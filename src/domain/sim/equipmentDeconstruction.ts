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
import type { EquipmentGradeProjection } from '../equipmentGrade'
import {
  COMBAT_STIM_DEFINITION_ID,
  isCanonicalCombatStimPayload,
  isSafeEquipmentInstanceId,
  type EquipmentInstance,
  type EquipmentInstanceId,
} from '../equipmentInstance'
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
  readonly source: EquipmentDeconstructionSourceRef
  readonly sourceLabel: string
  readonly sourceQuantity: number
  readonly sourceIssueCode?: EquipmentDeconstructionSourceIssueCode
  readonly resolution: EquipmentGradeRecoveryResolution
}

export type EquipmentDeconstructionSourceRef =
  | Readonly<{ kind: 'catalog' }>
  | Readonly<{ kind: 'fabricated_lot'; fabricationQueueId: string }>
  | Readonly<{ kind: 'equipment_instance'; instanceId: EquipmentInstanceId }>

export type EquipmentDeconstructionSourceIssueCode =
  | 'catalog_stock_reserved_for_fabricated_lots'
  | 'fabricated_lot_not_found'
  | 'fabricated_lot_exhausted'
  | 'equipment_instance_required'
  | 'equipment_instance_not_found'
  | 'equipment_instance_not_stored'
  | 'equipment_instance_has_live_doses'
  | 'equipment_instance_payload_malformed'
  | 'equipment_instance_active_overdrive'
  | 'equipment_instance_payload_unsupported'
  | 'equipment_instance_already_claimed'
  | 'stock_unavailable'
  | 'recovery_unavailable'

export interface EquipmentDeconstructionSourceChoice {
  readonly source: EquipmentDeconstructionSourceRef
  readonly label: string
  readonly quantity: number
  readonly available: boolean
  readonly gradeProjection: EquipmentGradeProjection
  readonly issueCode?: EquipmentDeconstructionSourceIssueCode
  readonly completedWeek?: number
  readonly condition?: 'operational' | 'damaged'
  readonly resourceRemaining?: number
  readonly resourceCapacity?: number
}

const CATALOG_SOURCE = Object.freeze({ kind: 'catalog' as const })

function sourceMatches(
  left: EquipmentDeconstructionSourceRef,
  right: EquipmentDeconstructionSourceRef
) {
  if (left.kind !== right.kind) return false
  if (left.kind === 'catalog') return true
  if (left.kind === 'fabricated_lot') {
    return right.kind === 'fabricated_lot' && left.fabricationQueueId === right.fabricationQueueId
  }
  return right.kind === 'equipment_instance' && left.instanceId === right.instanceId
}

function instanceHasActiveOverdrive(state: GameState, instanceId: string) {
  return Object.values(state.agents).some(
    (agent) =>
      agent.overdrive?.source?.kind === 'combat_stim' &&
      agent.overdrive.source.equipmentInstanceId === instanceId &&
      (agent.overdrive.active || agent.overdrive.recoveryDebt > 0)
  )
}

function profileAllowsAggregateRecovery(
  profile: ReturnType<typeof getEquipmentDeconstructionProfile>
) {
  return profile?.state === 'eligible' && profile.sourceAuthority !== 'equipment_instance'
}

function profileAllowsInstanceRecovery(
  profile: ReturnType<typeof getEquipmentDeconstructionProfile>
) {
  return profile?.state === 'eligible' && profile.sourceAuthority !== 'aggregate'
}

function instanceHasRecoveryClaim(state: GameState, instanceId: string) {
  return (
    (state.equipmentDeconstructionQueue ?? []).some(
      (entry) => entry.sourceEquipmentInstanceId === instanceId
    ) ||
    Object.values(state.equipmentRecoveryOutcomes ?? {}).some(
      (outcome) => outcome.sourceEquipmentInstanceId === instanceId
    )
  )
}

function resolveInstanceIssue(
  state: GameState,
  instance: EquipmentInstance,
  profile: ReturnType<typeof getEquipmentDeconstructionProfile>
): EquipmentDeconstructionSourceIssueCode | undefined {
  if (!profileAllowsInstanceRecovery(profile)) {
    return 'recovery_unavailable'
  }
  if (!isSafeEquipmentInstanceId(instance.instanceId)) return 'equipment_instance_not_found'
  if (instance.definitionId !== profile?.itemId) return 'recovery_unavailable'
  if (instance.location.state !== 'stored') return 'equipment_instance_not_stored'
  if (instanceHasRecoveryClaim(state, instance.instanceId)) {
    return 'equipment_instance_already_claimed'
  }
  if (instance.definitionId !== COMBAT_STIM_DEFINITION_ID) {
    return instance.payload === undefined ? undefined : 'equipment_instance_payload_unsupported'
  }
  if (!isCanonicalCombatStimPayload(instance.payload)) {
    return 'equipment_instance_payload_malformed'
  }
  if (instance.payload.remaining > 0) return 'equipment_instance_has_live_doses'
  if (instanceHasActiveOverdrive(state, instance.instanceId)) {
    return 'equipment_instance_active_overdrive'
  }
  return undefined
}

function sourceClaims(state: GameState) {
  const claims = new Map<string, number>()
  const claim = (fabricationQueueId: string | undefined) => {
    if (!fabricationQueueId) return
    claims.set(fabricationQueueId, (claims.get(fabricationQueueId) ?? 0) + 1)
  }
  for (const outcome of Object.values(state.equipmentRecoveryOutcomes ?? {})) {
    claim(outcome.sourceFabricationQueueId)
  }
  for (const entry of state.equipmentDeconstructionQueue ?? []) {
    const completedOutcome = state.equipmentRecoveryOutcomes?.[entry.id]
    if (!completedOutcome || !receiptMatchesEntry(completedOutcome, entry)) {
      claim(entry.sourceFabricationQueueId)
    }
  }
  return claims
}

export function resolveEquipmentDeconstructionSources(
  state: GameState,
  itemId: string
): readonly EquipmentDeconstructionSourceChoice[] {
  ensureProfilesValid()
  const definition = getEquipmentDefinition(itemId)
  if (!definition) return Object.freeze([])
  const profile = getEquipmentDeconstructionProfile(itemId)
  const stock = Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
  const visibility = getEquipmentGradeCatalogVisibility(definition.gradeProfile)
  const claims = sourceClaims(state)
  const lots = Object.values(state.fabricatedEquipmentLots ?? {})
    .filter((lot) => lot.itemId === itemId)
    .sort((left, right) => compareCodeUnits(left.queueId, right.queueId))
  const remainingByLot = lots.map((lot) => ({
    lot,
    remaining: Math.max(0, lot.quantity - (claims.get(lot.queueId) ?? 0)),
  }))
  const outstandingLotUnits = remainingByLot.reduce((total, entry) => total + entry.remaining, 0)
  const catalogQuantity = Math.max(0, stock - outstandingLotUnits)
  const catalogProjection = resolveEquipmentGradeProjection(
    getEquipmentGradeCatalogParticipation(definition.gradeProfile),
    visibility
  )
  const catalogIssueCode = !profileAllowsAggregateRecovery(profile)
    ? ('equipment_instance_required' as const)
    : stock < 1
      ? ('stock_unavailable' as const)
      : catalogQuantity < 1
        ? ('catalog_stock_reserved_for_fabricated_lots' as const)
        : profile?.state !== 'eligible' || catalogProjection.state !== 'graded'
          ? ('recovery_unavailable' as const)
          : undefined
  const choices: EquipmentDeconstructionSourceChoice[] = [
    Object.freeze({
      source: CATALOG_SOURCE,
      label: 'Catalog / unspecified stock',
      quantity: catalogQuantity,
      available: catalogQuantity > 0 && !catalogIssueCode,
      gradeProjection: catalogProjection,
      ...(catalogIssueCode ? { issueCode: catalogIssueCode } : {}),
    }),
  ]
  for (const { lot, remaining } of remainingByLot) {
    const quantity = Math.min(remaining, stock)
    const gradeProjection = resolveEquipmentGradeProjection(
      { state: 'graded', gradeId: lot.gradeId },
      visibility
    )
    const issueCode = !profileAllowsAggregateRecovery(profile)
      ? ('equipment_instance_required' as const)
      : stock < 1
        ? ('stock_unavailable' as const)
        : remaining < 1
          ? ('fabricated_lot_exhausted' as const)
          : profile?.state !== 'eligible' || gradeProjection.state !== 'graded'
            ? ('recovery_unavailable' as const)
            : undefined
    choices.push(
      Object.freeze({
        source: Object.freeze({ kind: 'fabricated_lot' as const, fabricationQueueId: lot.queueId }),
        label: `Fabricated batch ${lot.queueId} / week ${lot.completedWeek}`,
        quantity,
        available: quantity > 0 && !issueCode,
        gradeProjection,
        completedWeek: lot.completedWeek,
        ...(issueCode ? { issueCode } : {}),
      })
    )
  }
  if (profileAllowsInstanceRecovery(profile)) {
    for (const instance of Object.values(state.equipmentInstances ?? {})
      .filter((candidate) => candidate.definitionId === itemId)
      .sort((left, right) => compareCodeUnits(left.instanceId, right.instanceId))) {
      const issueCode =
        resolveInstanceIssue(state, instance, profile) ??
        (catalogProjection.state !== 'graded' ? 'recovery_unavailable' : undefined)
      const payload = isCanonicalCombatStimPayload(instance.payload) ? instance.payload : undefined
      choices.push(
        Object.freeze({
          source: Object.freeze({
            kind: 'equipment_instance' as const,
            instanceId: instance.instanceId,
          }),
          label:
            instance.definitionId !== COMBAT_STIM_DEFINITION_ID
              ? `Equipment instance ${instance.instanceId}`
              : payload
                ? `Equipment instance ${instance.instanceId} / ${payload.remaining} of ${payload.capacity} doses`
                : `Equipment instance ${instance.instanceId} / dose state unavailable`,
          quantity: issueCode ? 0 : 1,
          available: !issueCode,
          gradeProjection: catalogProjection,
          condition: instance.condition,
          ...(payload
            ? { resourceRemaining: payload.remaining, resourceCapacity: payload.capacity }
            : {}),
          ...(issueCode ? { issueCode } : {}),
        })
      )
    }
  }
  return Object.freeze(choices)
}

export function hasOutstandingFabricatedEquipmentLotUnits(state: GameState, itemId: string) {
  return resolveEquipmentDeconstructionSources(state, itemId).some(
    (choice) => choice.source.kind === 'fabricated_lot' && choice.quantity > 0
  )
}

export function resolveEquipmentDeconstructionPreview(
  state: GameState,
  itemId: string,
  source: EquipmentDeconstructionSourceRef = CATALOG_SOURCE
): EquipmentDeconstructionPreview | undefined {
  ensureProfilesValid()
  const definition = getEquipmentDefinition(itemId)
  const profile = getEquipmentDeconstructionProfile(itemId)
  if (!definition || !profile) return undefined
  const aggregateStock = Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
  const choices = resolveEquipmentDeconstructionSources(state, itemId)
  const choice = choices.find((candidate) => sourceMatches(candidate.source, source))
  const selectedLot =
    choice?.source.kind === 'fabricated_lot'
      ? state.fabricatedEquipmentLots?.[choice.source.fabricationQueueId]
      : undefined
  const selectedInstance =
    choice?.source.kind === 'equipment_instance'
      ? state.equipmentInstances?.[choice.source.instanceId]
      : undefined
  const participation = selectedLot
    ? {
        state: 'graded' as const,
        gradeId: selectedLot.gradeId,
      }
    : getEquipmentGradeCatalogParticipation(definition.gradeProfile)
  const visibility = getEquipmentGradeCatalogVisibility(definition.gradeProfile)
  const sourceIssueCode =
    choice?.issueCode ??
    (choice
      ? undefined
      : source.kind === 'equipment_instance'
        ? 'equipment_instance_not_found'
        : 'fabricated_lot_not_found')
  const sourceRestrictions: EquipmentRecoveryRestrictionCode[] = sourceIssueCode
    ? [
        source.kind === 'equipment_instance' || sourceIssueCode === 'equipment_instance_required'
          ? 'equipment_instance_selection_unavailable'
          : 'fabricated_lot_selection_unavailable',
      ]
    : []
  const stock =
    profile.state === 'eligible' && !profileAllowsAggregateRecovery(profile)
      ? Object.values(state.equipmentInstances ?? {}).filter(
          (instance) => instance.definitionId === itemId
        ).length
      : aggregateStock
  if (profile.state === 'deferred') {
    return Object.freeze({
      itemId,
      itemName: definition.name,
      stock,
      source,
      sourceLabel: choice?.label ?? 'Recovery source unavailable',
      sourceQuantity: choice?.quantity ?? 0,
      ...(sourceIssueCode ? { sourceIssueCode } : {}),
      resolution: profileDeferredResolution(itemId)!,
    })
  }

  const condition =
    selectedInstance?.condition ??
    ((state.damagedEquipmentQueue ?? []).includes(itemId)
      ? ('damaged' as const)
      : ('operational' as const))
  return Object.freeze({
    itemId,
    itemName: definition.name,
    stock,
    source,
    sourceLabel: choice?.label ?? 'Recovery source unavailable',
    sourceQuantity: choice?.quantity ?? 0,
    ...(sourceIssueCode ? { sourceIssueCode } : {}),
    resolution: resolveEquipmentGradeRecoveryOutcome(profile.rule, participation, visibility, {
      condition,
      restrictions: sourceRestrictions,
    }),
  })
}

export function queueEquipmentDeconstruction(
  state: GameState,
  itemId: string,
  source: EquipmentDeconstructionSourceRef = CATALOG_SOURCE
): GameState {
  const preview = resolveEquipmentDeconstructionPreview(state, itemId, source)
  if (!preview || preview.sourceQuantity < 1 || !preview.resolution.available) {
    return ensureNormalizedGameState(state)
  }
  if (preview.resolution.participation.state !== 'graded') {
    return ensureNormalizedGameState(state)
  }

  const queueId = nextQueueId(state)
  const profile = getEquipmentDeconstructionProfile(itemId)
  const sourceInstance =
    source.kind === 'equipment_instance' ? state.equipmentInstances?.[source.instanceId] : undefined
  const sourceInstancePayload = sourceInstance?.payload
  if (
    source.kind === 'equipment_instance' &&
    (!sourceInstance ||
      sourceInstance.definitionId !== itemId ||
      resolveInstanceIssue(state, sourceInstance, profile) !== undefined)
  ) {
    return ensureNormalizedGameState(state)
  }
  const entry: EquipmentDeconstructionQueueEntry = Object.freeze({
    id: queueId,
    itemId,
    itemName: preview.itemName,
    pathId: preview.resolution.pathId,
    sourceGradeId: preview.resolution.participation.gradeId,
    sourceGradeVisibility: preview.resolution.visibility,
    ...(source.kind === 'fabricated_lot'
      ? { sourceFabricationQueueId: source.fabricationQueueId }
      : {}),
    ...(source.kind === 'equipment_instance'
      ? {
          sourceEquipmentInstanceId: source.instanceId,
          ...(isCanonicalCombatStimPayload(sourceInstancePayload)
            ? {
                sourceEquipmentInstanceResourceId: sourceInstancePayload.resourceId,
                sourceEquipmentInstanceCapacity: sourceInstancePayload.capacity,
                sourceEquipmentInstanceRemaining: sourceInstancePayload.remaining,
              }
            : {}),
        }
      : {}),
    sourceCondition: preview.resolution.condition,
    outputMaterials: preview.resolution.materials.map((material) => ({
      materialId: material.materialId,
      materialName: inventoryItemLabels[material.materialId]!,
      quantity: material.quantity,
    })),
    wasteQuantity: preview.resolution.waste,
    startedWeek: state.week,
    durationWeeks: preview.resolution.durationWeeks,
    remainingWeeks: preview.resolution.durationWeeks,
    explanationCodes: [...preview.resolution.explanationCodes],
  })

  const nextEquipmentInstances = { ...(state.equipmentInstances ?? {}) }
  if (source.kind === 'equipment_instance') delete nextEquipmentInstances[source.instanceId]
  const nextState = normalizeGameState({
    ...state,
    inventory:
      source.kind === 'equipment_instance'
        ? state.inventory
        : { ...state.inventory, [itemId]: Math.max(0, (state.inventory[itemId] ?? 0) - 1) },
    equipmentInstances: nextEquipmentInstances,
    damagedEquipmentQueue:
      source.kind === 'equipment_instance'
        ? state.damagedEquipmentQueue
        : (state.damagedEquipmentQueue ?? []).filter((id) => id !== itemId),
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
      ...(entry.sourceFabricationQueueId
        ? { sourceFabricationQueueId: entry.sourceFabricationQueueId }
        : {}),
      ...(entry.sourceEquipmentInstanceId
        ? {
            sourceEquipmentInstanceId: entry.sourceEquipmentInstanceId,
            ...(entry.sourceEquipmentInstanceResourceId !== undefined
              ? {
                  sourceEquipmentInstanceResourceId: entry.sourceEquipmentInstanceResourceId,
                  sourceEquipmentInstanceCapacity: entry.sourceEquipmentInstanceCapacity,
                  sourceEquipmentInstanceRemaining: entry.sourceEquipmentInstanceRemaining,
                }
              : {}),
          }
        : {}),
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
    outcome.sourceFabricationQueueId === entry.sourceFabricationQueueId &&
    outcome.sourceEquipmentInstanceId === entry.sourceEquipmentInstanceId &&
    outcome.sourceEquipmentInstanceResourceId === entry.sourceEquipmentInstanceResourceId &&
    outcome.sourceEquipmentInstanceCapacity === entry.sourceEquipmentInstanceCapacity &&
    outcome.sourceEquipmentInstanceRemaining === entry.sourceEquipmentInstanceRemaining &&
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
      ...(entry.sourceFabricationQueueId
        ? { sourceFabricationQueueId: entry.sourceFabricationQueueId }
        : {}),
      ...(entry.sourceEquipmentInstanceId
        ? {
            sourceEquipmentInstanceId: entry.sourceEquipmentInstanceId,
            ...(entry.sourceEquipmentInstanceResourceId !== undefined
              ? {
                  sourceEquipmentInstanceResourceId: entry.sourceEquipmentInstanceResourceId,
                  sourceEquipmentInstanceCapacity: entry.sourceEquipmentInstanceCapacity,
                  sourceEquipmentInstanceRemaining: entry.sourceEquipmentInstanceRemaining,
                }
              : {}),
          }
        : {}),
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
        ...(entry.sourceFabricationQueueId
          ? { sourceFabricationQueueId: entry.sourceFabricationQueueId }
          : {}),
        ...(entry.sourceEquipmentInstanceId
          ? {
              sourceEquipmentInstanceId: entry.sourceEquipmentInstanceId,
              ...(entry.sourceEquipmentInstanceResourceId !== undefined
                ? {
                    sourceEquipmentInstanceResourceId: entry.sourceEquipmentInstanceResourceId,
                    sourceEquipmentInstanceCapacity: entry.sourceEquipmentInstanceCapacity,
                    sourceEquipmentInstanceRemaining: entry.sourceEquipmentInstanceRemaining,
                  }
                : {}),
            }
          : {}),
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
    case 'equipment_instance_selection_unavailable':
      return 'An eligible stored equipment instance must be selected'
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

export function getEquipmentDeconstructionSourceIssueLabel(
  code: EquipmentDeconstructionSourceIssueCode
) {
  const labels: Record<EquipmentDeconstructionSourceIssueCode, string> = {
    catalog_stock_reserved_for_fabricated_lots:
      'Catalog stock is reserved for outstanding fabricated batches',
    fabricated_lot_not_found: 'Fabricated batch is unavailable',
    fabricated_lot_exhausted: 'Fabricated batch has already been claimed',
    equipment_instance_required: 'Manual equipment-instance selection is required',
    equipment_instance_not_found: 'Equipment instance is unavailable',
    equipment_instance_not_stored: 'Equipment instance must be stored before recovery',
    equipment_instance_has_live_doses: 'Live Combat Stim doses must be used or disposed separately',
    equipment_instance_payload_malformed: 'Combat Stim dose state is malformed',
    equipment_instance_active_overdrive: 'Combat Stim instance still owns active recovery debt',
    equipment_instance_payload_unsupported:
      'Payload-bearing ordinary equipment cannot enter recovery',
    equipment_instance_already_claimed: 'Equipment instance has already been claimed for recovery',
    stock_unavailable: 'Aggregate stock is unavailable',
    recovery_unavailable: 'Recovery is unavailable for this source',
  }
  return labels[code]
}
