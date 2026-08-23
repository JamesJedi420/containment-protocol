// cspell:words medkits
import { type GameState } from '../../domain/models'
import {
  type AgentLoadoutReadinessSummary,
  type EquipmentLoadoutSummary,
  type EquipmentSlotKind,
  EQUIPMENT_SLOT_KINDS,
  EQUIPMENT_SLOT_LABELS,
  buildAgentEquipmentSummary,
  buildAgentLoadoutReadinessSummary,
  getEquipmentLabel,
  getRoleCompatibleEquipmentDefinitions,
  getEquipmentSlotItemId,
  getEquipmentTags,
  getEquipmentCatalogEntries,
} from '../../domain/equipment'
import { inventoryItemLabels, productionCatalog } from '../../data/production'
import {
  resolveEquipmentDeconstructionSources,
  resolveEquipmentDeconstructionPreview,
  getEquipmentRecoveryIssueLabel,
  getEquipmentDeconstructionSourceIssueLabel,
  type EquipmentDeconstructionSourceRef,
} from '../../domain/sim/equipmentDeconstruction'
import { canEquipStoredEquipmentInstance } from '../../domain/sim/equipment'
import { resolveEquipmentGradeProjection } from '../../domain/equipmentGrade'
import {
  EQUIPMENT_GRADE_DEFINITIONS,
  getEquipmentGradeDefinition,
  type EquipmentGradeId,
} from '../../domain/equipmentGrade'
import {
  getEquipmentAutoScrapReasonLabel,
  resolveEquipmentAutoScrapPreview,
} from '../../domain/equipmentAutoScrap'
import {
  getCombatStimActivationReasonLabel,
  resolveCombatStimActivation,
  resolveEffectiveResponderEnergyBand,
} from '../../domain/combatStim'
import {
  COMBAT_STIM_DEFINITION_ID,
  getEquipmentInstanceAtAgentSlot,
  isCanonicalCombatStimPayload,
  listStoredEquipmentInstances,
} from '../../domain/equipmentInstance'
import {
  createDefaultResponderEnergyBudget,
  normalizeEnergyBudget,
} from '../../domain/responderEnergyBudget'

export interface GearRecommendation {
  caseId: string
  caseTitle: string
  stage: number
  deadlineRemaining: number
  itemId: string
  itemName: string
  stock: number
  queued: number
  reason: string
}

export interface EquipmentLoadoutOptionView {
  itemId: string
  itemName: string
  tags: string[]
  stock: number
  instanceId?: string
  instanceLabel?: string
  doseLabel?: string
}

export interface EquipmentInstanceMaterializationView {
  itemId: string
  itemName: string
  aggregateStock: number
  storedInstanceCount: number
  equippedInstanceCount: number
  canMaterialize: boolean
  materializationBlocker?: 'damaged_aggregate_stock' | 'fabricated_provenance_required'
}

export interface EquipmentLoadoutSlotView {
  slot: EquipmentSlotKind
  slotLabel: string
  itemId?: string
  itemName: string
  tags: string[]
  instanceId?: string
  doseLabel?: string
  effectiveEnergyLabel?: string
  combatStimActivation?: {
    available: boolean
    blocker?: string
  }
  overdriveLabel?: string
  stockOptions: EquipmentLoadoutOptionView[]
}

export interface AgentEquipmentLoadoutView {
  agentId: string
  agentName: string
  role: string
  assignmentState: string
  editable: boolean
  blockedReason?: string
  summary: EquipmentLoadoutSummary
  readiness: AgentLoadoutReadinessSummary
  slots: EquipmentLoadoutSlotView[]
}

export interface EquipmentDeconstructionView {
  itemId: string
  itemName: string
  stock: number
  source: EquipmentDeconstructionSourceRef
  sourceLabel: string
  sourceQuantity: number
  sources: EquipmentDeconstructionSourceView[]
  gradeLabel: string
  available: boolean
  pathLabel: string
  materialSummary: string
  wasteLabel: string
  durationLabel: string
  conditionLabel: string
  explanation: string
  blocker?: string
}

export interface EquipmentDeconstructionSourceView {
  source: EquipmentDeconstructionSourceRef
  value: string
  label: string
  quantity: number
  gradeLabel: string
  available: boolean
  blocker?: string
}

export interface EquipmentDeconstructionQueueView {
  id: string
  itemName: string
  gradeLabel: string
  pathLabel: string
  materialSummary: string
  remainingLabel: string
  sourceLabel: string
}

export interface EquipmentAutoScrapEntryView {
  itemId: string
  itemName: string
  quantity: number
  gradeLabel: string
  decision: 'include' | 'exclude'
  reasonLabel: string
}

export interface EquipmentAutoScrapView {
  enabled: boolean
  configuredThresholdGradeId?: EquipmentGradeId
  configuredThresholdLabel?: string
  previewThresholdGradeId: EquipmentGradeId
  previewThresholdLabel: string
  thresholdOptions: ReadonlyArray<Readonly<{ gradeId: EquipmentGradeId; label: string }>>
  includedItemCount: number
  includedQuantity: number
  excludedItemCount: number
  excludedQuantity: number
  entries: EquipmentAutoScrapEntryView[]
}

function getRecoveryPathLabel(pathId: 'component_reclamation' | 'ritual_disassembly') {
  return pathId === 'component_reclamation' ? 'Component reclamation' : 'Ritual disassembly'
}

function formatRecoveryMaterials(materials: readonly { materialName: string; quantity: number }[]) {
  return materials.map((material) => `${material.materialName} ×${material.quantity}`).join(', ')
}

function sourceValue(source: EquipmentDeconstructionSourceRef) {
  if (source.kind === 'catalog') return 'catalog'
  return source.kind === 'fabricated_lot'
    ? `fabricated:${source.fabricationQueueId}`
    : `instance:${source.instanceId}`
}

export function getEquipmentDeconstructionViews(
  game: GameState,
  selectedSources: Readonly<Record<string, EquipmentDeconstructionSourceRef>> = {}
): EquipmentDeconstructionView[] {
  return getEquipmentCatalogEntries()
    .map((definition) => {
      const sourceChoices = resolveEquipmentDeconstructionSources(game, definition.id)
      const aggregateStock = Math.max(0, Math.trunc(game.inventory[definition.id] ?? 0))
      const hasInstanceSource = sourceChoices.some(
        (choice) => choice.source.kind === 'equipment_instance'
      )
      if (aggregateStock < 1 && !hasInstanceSource) return undefined
      const requestedSource = selectedSources[definition.id] ?? { kind: 'catalog' as const }
      const requestedChoice = sourceChoices.find(
        (choice) => sourceValue(choice.source) === sourceValue(requestedSource)
      )
      const ordinaryInstanceFallback =
        selectedSources[definition.id] === undefined && definition.id !== COMBAT_STIM_DEFINITION_ID
          ? sourceChoices.find(
              (choice) => choice.available && choice.source.kind === 'equipment_instance'
            )?.source
          : undefined
      const selectedSource = requestedChoice
        ? requestedChoice.available || selectedSources[definition.id] !== undefined
          ? requestedSource
          : (ordinaryInstanceFallback ?? requestedSource)
        : (sourceChoices.find((choice) => choice.available)?.source ?? {
            kind: 'catalog' as const,
          })
      const preview = resolveEquipmentDeconstructionPreview(game, definition.id, selectedSource)
      if (!preview) return undefined
      const sources: EquipmentDeconstructionSourceView[] = sourceChoices.map((choice) => {
        const sourcePreview = resolveEquipmentDeconstructionPreview(
          game,
          definition.id,
          choice.source
        )!
        return {
          source: choice.source,
          value: sourceValue(choice.source),
          label: choice.label,
          quantity: choice.quantity,
          gradeLabel: sourcePreview.resolution.projection.label,
          available: sourcePreview.resolution.available && choice.quantity > 0,
          ...(!sourcePreview.resolution.available
            ? {
                blocker: choice.issueCode
                  ? getEquipmentDeconstructionSourceIssueLabel(choice.issueCode)
                  : sourcePreview.resolution.issues.map(getEquipmentRecoveryIssueLabel).join('; '),
              }
            : {}),
        }
      })
      if (!preview.resolution.available) {
        return {
          itemId: definition.id,
          itemName: definition.name,
          stock: preview.stock,
          source: selectedSource,
          sourceLabel: preview.sourceLabel,
          sourceQuantity: preview.sourceQuantity,
          sources,
          gradeLabel: preview.resolution.projection.label,
          available: false,
          pathLabel: 'Recovery unavailable',
          materialSummary: 'No safe recovery projection',
          wasteLabel: 'Waste unknown',
          durationLabel: 'Duration unknown',
          conditionLabel:
            sourceChoices.find(
              (choice) => sourceValue(choice.source) === sourceValue(selectedSource)
            )?.condition === 'damaged' ||
            (selectedSource.kind !== 'equipment_instance' &&
              (game.damagedEquipmentQueue ?? []).includes(definition.id))
              ? 'Damaged'
              : 'Operational',
          explanation: 'This item cannot enter the bounded recovery flow.',
          blocker: preview.sourceIssueCode
            ? getEquipmentDeconstructionSourceIssueLabel(preview.sourceIssueCode)
            : preview.resolution.issues.map(getEquipmentRecoveryIssueLabel).join('; '),
        }
      }
      return {
        itemId: definition.id,
        itemName: definition.name,
        stock: preview.stock,
        source: selectedSource,
        sourceLabel: preview.sourceLabel,
        sourceQuantity: preview.sourceQuantity,
        sources,
        gradeLabel: preview.resolution.projection.label,
        available: true,
        pathLabel: getRecoveryPathLabel(preview.resolution.pathId),
        materialSummary: preview.resolution.materials
          .map(
            (material) =>
              `${inventoryItemLabels[material.materialId] ?? material.materialId} ×${material.quantity}`
          )
          .join(', '),
        wasteLabel: `Waste ${preview.resolution.waste}`,
        durationLabel: `${preview.resolution.durationWeeks} week${preview.resolution.durationWeeks === 1 ? '' : 's'}`,
        conditionLabel: preview.resolution.condition === 'damaged' ? 'Damaged' : 'Operational',
        explanation:
          preview.resolution.pathId === 'component_reclamation'
            ? 'Canonical grade may retain additional components and reduce waste.'
            : 'Canonical grade may increase controlled handling time without increasing yield.',
      }
    })
    .filter((view): view is EquipmentDeconstructionView => Boolean(view))
    .sort((left, right) => left.itemName.localeCompare(right.itemName))
}

export function getEquipmentDeconstructionQueueViews(
  game: GameState
): EquipmentDeconstructionQueueView[] {
  return (game.equipmentDeconstructionQueue ?? []).map((entry) => ({
    id: entry.id,
    itemName: entry.itemName,
    gradeLabel: resolveEquipmentGradeProjection(
      { state: 'graded', gradeId: entry.sourceGradeId },
      entry.sourceGradeVisibility
    ).label,
    pathLabel: getRecoveryPathLabel(entry.pathId),
    materialSummary: formatRecoveryMaterials(entry.outputMaterials),
    remainingLabel: `${entry.remainingWeeks} week${entry.remainingWeeks === 1 ? '' : 's'} remaining`,
    sourceLabel: entry.sourceEquipmentInstanceId
      ? entry.sourceEquipmentInstanceRemaining !== undefined &&
        entry.sourceEquipmentInstanceCapacity !== undefined
        ? `Equipment instance ${entry.sourceEquipmentInstanceId} / ${entry.sourceEquipmentInstanceRemaining} of ${entry.sourceEquipmentInstanceCapacity} doses`
        : `Equipment instance ${entry.sourceEquipmentInstanceId}`
      : entry.sourceFabricationQueueId
        ? `Fabricated batch ${entry.sourceFabricationQueueId}`
        : 'Catalog / unspecified stock',
  }))
}

export function getEquipmentAutoScrapView(
  game: GameState,
  previewThresholdGradeId: EquipmentGradeId
): EquipmentAutoScrapView {
  const policy = game.equipmentAutoScrapPolicy
  const preview = resolveEquipmentAutoScrapPreview(game, previewThresholdGradeId)
  return {
    enabled: policy?.state === 'enabled',
    ...(policy?.state === 'enabled'
      ? {
          configuredThresholdGradeId: policy.thresholdGradeId,
          configuredThresholdLabel: getEquipmentGradeDefinition(policy.thresholdGradeId).label,
        }
      : {}),
    previewThresholdGradeId,
    previewThresholdLabel: getEquipmentGradeDefinition(previewThresholdGradeId).label,
    thresholdOptions: EQUIPMENT_GRADE_DEFINITIONS.map(({ id, label }) => ({
      gradeId: id,
      label,
    })),
    includedItemCount: preview.includedItemCount,
    includedQuantity: preview.includedQuantity,
    excludedItemCount: preview.excludedItemCount,
    excludedQuantity: preview.excludedQuantity,
    entries: preview.entries.map((entry) => ({
      itemId: entry.itemId,
      itemName: entry.itemName,
      quantity: entry.quantity,
      gradeLabel: entry.gradeProjection.label,
      decision: entry.decision,
      reasonLabel: entry.reasonCodes.map(getEquipmentAutoScrapReasonLabel).join('; '),
    })),
  }
}

const ITEM_TAG_HINTS: Record<string, string[]> = {
  ward_seals: ['occult', 'ritual', 'breach', 'ward', 'containment', 'haunt', 'curse'],
  medkits: ['biohazard', 'outbreak', 'injury', 'medical', 'plague', 'toxin', 'fatigue'],
  silver_rounds: ['vampire', 'beast', 'combat', 'predator', 'feral', 'raid'],
  signal_jammers: ['signal', 'relay', 'intel', 'comms', 'surveillance', 'blackout', 'memory'],
  emf_sensors: ['anomaly', 'evidence', 'witness', 'relay', 'surveillance', 'analysis'],
  warding_kits: ['occult', 'ritual', 'containment', 'seal', 'haunt', 'curse'],
  ritual_components: ['ritual', 'anomaly', 'analysis', 'archive'],
}

export function getGearRecommendationsForActiveCases(game: GameState): GearRecommendation[] {
  const unresolved = Object.values(game.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .sort((left, right) => {
      return (
        right.stage - left.stage ||
        left.deadlineRemaining - right.deadlineRemaining ||
        left.title.localeCompare(right.title)
      )
    })

  return unresolved.slice(0, 5).map((currentCase) => {
    const recommendation = chooseBestRecipe(currentCase)
    const queued = game.productionQueue.filter(
      (entry) => entry.outputItemId === recommendation.outputItemId
    ).length
    const stock = game.inventory[recommendation.outputItemId] ?? 0

    return {
      caseId: currentCase.id,
      caseTitle: currentCase.title,
      stage: currentCase.stage,
      deadlineRemaining: currentCase.deadlineRemaining,
      itemId: recommendation.outputItemId,
      itemName: recommendation.outputItemName,
      stock,
      queued,
      reason: buildReason(currentCase, recommendation.outputItemId),
    }
  })
}

export function getAgentEquipmentLoadoutViews(game: GameState): AgentEquipmentLoadoutView[] {
  return Object.values(game.agents)
    .filter((agent) => agent.status !== 'dead')
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((agent) => {
      const editable = agent.status === 'active' && (agent.assignment?.state ?? 'idle') === 'idle'
      const blockedReason = editable
        ? undefined
        : agent.assignment?.state === 'assigned'
          ? 'Locked while deployed.'
          : agent.assignment?.state === 'training'
            ? 'Locked during training.'
            : agent.assignment?.state === 'recovery'
              ? 'Locked during recovery.'
              : agent.status !== 'active'
                ? 'Unavailable for loadout changes.'
                : 'Locked.'

      return {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        assignmentState: agent.assignment?.state ?? 'idle',
        editable,
        blockedReason,
        summary: buildAgentEquipmentSummary(agent),
        readiness: buildAgentLoadoutReadinessSummary(agent, { state: game }),
        slots: EQUIPMENT_SLOT_KINDS.map((slot) => {
          const itemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
          const equippedInstance = getEquipmentInstanceAtAgentSlot(game, agent.id, slot)
          const combatStimActivation =
            equippedInstance?.definitionId === COMBAT_STIM_DEFINITION_ID
              ? resolveCombatStimActivation(game, equippedInstance.instanceId)
              : undefined
          const compatibleDefinitions = getRoleCompatibleEquipmentDefinitions(slot, agent.role)
          const compatibleIds = new Set(compatibleDefinitions.map((definition) => definition.id))
          const storedInstances = listStoredEquipmentInstances(game)
            .filter(
              (instance) =>
                compatibleIds.has(instance.definitionId) &&
                canEquipStoredEquipmentInstance(game, instance.instanceId, agent.id, slot)
            )
            .map((instance) => ({
              itemId: instance.definitionId,
              itemName: getEquipmentLabel(instance.definitionId),
              tags: getCompatibleItemTags(instance.definitionId),
              stock: 0,
              instanceId: instance.instanceId,
              instanceLabel: instance.instanceId,
              doseLabel:
                instance.definitionId === COMBAT_STIM_DEFINITION_ID
                  ? isCanonicalCombatStimPayload(instance.payload)
                    ? `${instance.payload.remaining}/${instance.payload.capacity} doses`
                    : 'Dose state unavailable'
                  : undefined,
            }))
          return {
            slot,
            slotLabel: EQUIPMENT_SLOT_LABELS[slot],
            itemId,
            itemName: itemId ? getEquipmentLabel(itemId) : 'Empty slot',
            tags: itemId ? getCompatibleItemTags(itemId) : [],
            instanceId: equippedInstance?.instanceId,
            doseLabel:
              equippedInstance?.definitionId === COMBAT_STIM_DEFINITION_ID
                ? isCanonicalCombatStimPayload(equippedInstance.payload)
                  ? `${equippedInstance.payload.remaining}/${equippedInstance.payload.capacity} doses`
                  : 'Dose state unavailable'
                : undefined,
            effectiveEnergyLabel:
              equippedInstance?.definitionId === COMBAT_STIM_DEFINITION_ID
                ? `${normalizeEnergyBudget(agent.energyBudget ?? createDefaultResponderEnergyBudget()).reserveBand} → ${combatStimActivation?.effectiveBand ?? resolveEffectiveResponderEnergyBand(agent)}`
                : undefined,
            combatStimActivation: combatStimActivation
              ? {
                  available: combatStimActivation.available,
                  blocker: combatStimActivation.reasonCode
                    ? getCombatStimActivationReasonLabel(combatStimActivation.reasonCode)
                    : undefined,
                }
              : undefined,
            overdriveLabel:
              equippedInstance?.definitionId === COMBAT_STIM_DEFINITION_ID &&
              agent.overdrive?.source?.kind === 'combat_stim'
                ? agent.overdrive.active
                  ? 'Combat Stim overdrive active'
                  : `Combat Stim recovery debt: ${agent.overdrive.recoveryDebt}`
                : undefined,
            stockOptions: [
              ...compatibleDefinitions
                .map((definition) => ({
                  itemId: definition.id,
                  itemName: definition.name,
                  tags: [...definition.tags],
                  stock: Math.max(0, Math.trunc(game.inventory[definition.id] ?? 0)),
                }))
                .filter((option) => option.stock > 0)
                .sort(
                  (left, right) =>
                    right.stock - left.stock || left.itemName.localeCompare(right.itemName)
                ),
              ...storedInstances,
            ],
          } satisfies EquipmentLoadoutSlotView
        }),
      } satisfies AgentEquipmentLoadoutView
    })
}

export function getEquipmentInstanceMaterializationViews(
  game: GameState
): EquipmentInstanceMaterializationView[] {
  return getEquipmentCatalogEntries()
    .filter((definition) => definition.id !== COMBAT_STIM_DEFINITION_ID)
    .map((definition) => {
      const instances = Object.values(game.equipmentInstances ?? {}).filter(
        (instance) => instance.definitionId === definition.id
      )
      const aggregateStock = Math.max(0, Math.trunc(game.inventory[definition.id] ?? 0))
      const hasDamagedAggregateStock = (game.damagedEquipmentQueue ?? []).includes(definition.id)
      const catalogQuantity =
        resolveEquipmentDeconstructionSources(game, definition.id).find(
          (choice) => choice.source.kind === 'catalog'
        )?.quantity ?? 0
      return {
        itemId: definition.id,
        itemName: definition.name,
        aggregateStock,
        storedInstanceCount: instances.filter((instance) => instance.location.state === 'stored')
          .length,
        equippedInstanceCount: instances.filter(
          (instance) => instance.location.state === 'equipped'
        ).length,
        canMaterialize: aggregateStock > 0 && !hasDamagedAggregateStock && catalogQuantity > 0,
        ...(aggregateStock > 0 && hasDamagedAggregateStock
          ? { materializationBlocker: 'damaged_aggregate_stock' as const }
          : aggregateStock > 0 && catalogQuantity < 1
            ? { materializationBlocker: 'fabricated_provenance_required' as const }
            : {}),
      }
    })
    .filter(
      (view) =>
        view.aggregateStock > 0 || view.storedInstanceCount > 0 || view.equippedInstanceCount > 0
    )
    .sort((left, right) => left.itemName.localeCompare(right.itemName))
}

function getCompatibleItemTags(itemId: string) {
  return getEquipmentTags(itemId)
}

function chooseBestRecipe(currentCase: GameState['cases'][string]) {
  const caseTags = new Set(
    [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags].map((tag) =>
      tag.toLowerCase()
    )
  )

  const scored = productionCatalog.map((recipe) => {
    const hints = ITEM_TAG_HINTS[recipe.outputItemId] ?? []
    const tagScore = hints.reduce((sum, hint) => (caseTags.has(hint) ? sum + 2 : sum), 0)
    const raidScore = currentCase.kind === 'raid' && recipe.outputItemId === 'silver_rounds' ? 1 : 0
    const urgencyScore = currentCase.stage >= 4 && recipe.outputItemId === 'medkits' ? 1 : 0

    return {
      recipe,
      score: tagScore + raidScore + urgencyScore,
    }
  })

  return scored
    .sort((left, right) => {
      return right.score - left.score || left.recipe.name.localeCompare(right.recipe.name)
    })
    .at(0)!.recipe
}

function buildReason(currentCase: GameState['cases'][string], itemId: string) {
  const hints = ITEM_TAG_HINTS[itemId] ?? []
  const caseTags = [
    ...currentCase.tags,
    ...currentCase.requiredTags,
    ...currentCase.preferredTags,
  ].map((tag) => tag.toLowerCase())
  const matchedTag = hints.find((hint) => caseTags.includes(hint))

  if (matchedTag) {
    return `Matches ${matchedTag} pressure on this operation.`
  }

  if (currentCase.kind === 'raid') {
    return 'Supports multi-team raid pressure and sustainment.'
  }

  if (currentCase.stage >= 4) {
    return 'High-stage operation: keep reserves ready for attrition swings.'
  }

  return 'General-purpose support while this case remains active.'
}
