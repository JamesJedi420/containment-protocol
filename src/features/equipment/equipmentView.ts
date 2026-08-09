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
  resolveEquipmentDeconstructionPreview,
  getEquipmentRecoveryIssueLabel,
} from '../../domain/sim/equipmentDeconstruction'
import { resolveEquipmentGradeProjection } from '../../domain/equipmentGrade'
import { getEquipmentGradeDefinition, type EquipmentGradeId } from '../../domain/equipmentGrade'
import {
  getEquipmentAutoScrapReasonLabel,
  resolveEquipmentAutoScrapPreview,
} from '../../domain/equipmentAutoScrap'

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
}

export interface EquipmentLoadoutSlotView {
  slot: EquipmentSlotKind
  slotLabel: string
  itemId?: string
  itemName: string
  tags: string[]
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

export interface EquipmentDeconstructionQueueView {
  id: string
  itemName: string
  gradeLabel: string
  pathLabel: string
  materialSummary: string
  remainingLabel: string
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
  previewThresholdGradeId: EquipmentGradeId
  previewThresholdLabel: string
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

export function getEquipmentDeconstructionViews(game: GameState): EquipmentDeconstructionView[] {
  return getEquipmentCatalogEntries()
    .map((definition) => {
      const stock = Math.max(0, Math.trunc(game.inventory[definition.id] ?? 0))
      if (stock < 1) return undefined
      const preview = resolveEquipmentDeconstructionPreview(game, definition.id)
      if (!preview) return undefined
      if (!preview.resolution.available) {
        return {
          itemId: definition.id,
          itemName: definition.name,
          stock,
          gradeLabel: preview.resolution.projection.label,
          available: false,
          pathLabel: 'Recovery unavailable',
          materialSummary: 'No safe recovery projection',
          wasteLabel: 'Waste unknown',
          durationLabel: 'Duration unknown',
          conditionLabel: (game.damagedEquipmentQueue ?? []).includes(definition.id)
            ? 'Damaged'
            : 'Operational',
          explanation: 'This item cannot enter the bounded recovery flow.',
          blocker: preview.resolution.issues.map(getEquipmentRecoveryIssueLabel).join('; '),
        }
      }
      return {
        itemId: definition.id,
        itemName: definition.name,
        stock,
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
    ...(policy?.state === 'enabled' ? { configuredThresholdGradeId: policy.thresholdGradeId } : {}),
    previewThresholdGradeId,
    previewThresholdLabel: getEquipmentGradeDefinition(previewThresholdGradeId).label,
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
          return {
            slot,
            slotLabel: EQUIPMENT_SLOT_LABELS[slot],
            itemId,
            itemName: itemId ? getEquipmentLabel(itemId) : 'Empty slot',
            tags: itemId ? getCompatibleItemTags(itemId) : [],
            stockOptions: getRoleCompatibleEquipmentDefinitions(slot, agent.role)
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
          } satisfies EquipmentLoadoutSlotView
        }),
      } satisfies AgentEquipmentLoadoutView
    })
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
