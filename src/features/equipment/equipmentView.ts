import { type GameState } from '../../domain/models'
import {
  type EquipmentLoadoutSummary,
  type EquipmentSlotKind,
  EQUIPMENT_SLOT_KINDS,
  EQUIPMENT_SLOT_LABELS,
  buildAgentEquipmentSummary,
  getCompatibleEquipmentDefinitions,
  getEquipmentLabel,
  getEquipmentSlotItemId,
  getEquipmentTags,
} from '../../domain/equipment'
import { productionCatalog } from '../../data/production'

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
  assignmentState: string
  editable: boolean
  blockedReason?: string
  summary: EquipmentLoadoutSummary
  slots: EquipmentLoadoutSlotView[]
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
        assignmentState: agent.assignment?.state ?? 'idle',
        editable,
        blockedReason,
        summary: buildAgentEquipmentSummary(agent),
        slots: EQUIPMENT_SLOT_KINDS.map((slot) => {
          const itemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
          return {
            slot,
            slotLabel: EQUIPMENT_SLOT_LABELS[slot],
            itemId,
            itemName: itemId ? getEquipmentLabel(itemId) : 'Empty slot',
            tags: itemId ? getCompatibleItemTags(itemId) : [],
            stockOptions: getCompatibleEquipmentDefinitions(slot)
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
  const caseTags = [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags].map(
    (tag) => tag.toLowerCase()
  )
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
