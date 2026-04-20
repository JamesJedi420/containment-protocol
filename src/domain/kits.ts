// cspell:words pathfinding
import type { Agent, AgentAppliedKit } from './models'
import {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
  hasAnyRuntimeContextTag,
  type RuntimeModifierContext,
  type RuntimeModifierResult,
} from './modifierRuntime'
import { resolveEquippedItems } from './equipment'

interface EquipmentKitThresholdDefinition {
  pieces: number
  effect: RuntimeModifierResult
}

interface EquipmentKitDefinition {
  id: string
  label: string
  requiredItemTags?: readonly string[]
  requiredItemIds?: readonly string[]
  requiredCaseTags?: readonly string[]
  thresholds: readonly EquipmentKitThresholdDefinition[]
}

const EQUIPMENT_KIT_DEFINITIONS: readonly EquipmentKitDefinition[] = [
  {
    id: 'breach-response-kit',
    label: 'Breach Response Kit',
    requiredItemTags: ['breach', 'combat', 'protection', 'threat', 'signal'],
    requiredCaseTags: ['breach', 'combat', 'raid', 'threat', 'outbreak'],
    thresholds: [
      {
        pieces: 2,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.03,
        }),
      },
      {
        pieces: 4,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.04,
        }),
      },
    ],
  },
  {
    id: 'occult-containment-kit',
    label: 'Occult Containment Kit',
    requiredItemTags: ['occult', 'containment', 'ritual', 'anti-spirit', 'anomaly'],
    requiredCaseTags: ['occult', 'containment', 'ritual', 'anomaly', 'spirit', 'seal'],
    thresholds: [
      {
        pieces: 2,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.04,
          stressImpactMultiplier: 0.96,
        }),
      },
      {
        pieces: 4,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.05,
          stressImpactMultiplier: 0.95,
        }),
      },
    ],
  },
  {
    id: 'investigation-survey-suite',
    label: 'Investigation Survey Suite',
    requiredItemTags: ['surveillance', 'analysis', 'evidence', 'signal', 'witness', 'field'],
    requiredCaseTags: ['evidence', 'analysis', 'witness', 'signal', 'relay', 'cyber'],
    thresholds: [
      {
        pieces: 2,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.03,
        }),
      },
      {
        pieces: 3,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.05,
        }),
      },
    ],
  },
  {
    id: 'field-recon-suite',
    label: 'Field Recon Suite',
    requiredItemTags: ['recon', 'field-kit', 'pathfinding'],
    requiredCaseTags: ['field', 'evidence', 'signal', 'anomaly', 'relay', 'occult', 'breach'],
    thresholds: [
      {
        pieces: 2,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.03,
          stressImpactMultiplier: 0.98,
        }),
      },
      {
        pieces: 4,
        effect: createRuntimeModifierResult({
          effectivenessMultiplier: 1.05,
          stressImpactMultiplier: 0.96,
        }),
      },
    ],
  },
] as const

function sortAscending(numbers: readonly number[]) {
  return [...numbers].sort((left, right) => left - right)
}

function getActiveKitThresholds(definition: EquipmentKitDefinition, matchedPieceCount: number) {
  return [...definition.thresholds]
    .filter((threshold) => matchedPieceCount >= threshold.pieces)
    .sort((left, right) => left.pieces - right.pieces)
}

function toAppliedKit(
  definition: EquipmentKitDefinition,
  matchedItemIds: string[],
  matchedTags: string[],
  matchedPieceCount: number,
  activeThresholdDefinitions: readonly EquipmentKitThresholdDefinition[]
): AgentAppliedKit {
  const activeThresholds = sortAscending(
    activeThresholdDefinitions.map((threshold) => threshold.pieces)
  )
  const aggregateEffect = aggregateRuntimeModifierResults(
    activeThresholdDefinitions.map((threshold) => threshold.effect)
  )

  return {
    id: definition.id,
    label: definition.label,
    matchedItemIds,
    matchedTags,
    matchedPieceCount,
    activeThresholds,
    highestActiveThreshold: activeThresholds.at(-1) ?? 0,
    statModifiers: { ...aggregateEffect.statModifiers },
    effectivenessMultiplier: aggregateEffect.effectivenessMultiplier,
    stressImpactMultiplier: aggregateEffect.stressImpactMultiplier,
    moraleRecoveryDelta: aggregateEffect.moraleRecoveryDelta,
  }
}

function matchesKitItem(
  itemId: string,
  itemTags: readonly string[],
  definition: EquipmentKitDefinition
) {
  const matchesId =
    definition.requiredItemIds !== undefined && definition.requiredItemIds.includes(itemId)
  const matchesTag =
    definition.requiredItemTags !== undefined &&
    itemTags.some((tag) => definition.requiredItemTags?.includes(tag))

  return matchesId || matchesTag
}

export function resolveAgentEquipmentKits(
  agent: Agent,
  context: RuntimeModifierContext
): AgentAppliedKit[] {
  const equippedItems = resolveEquippedItems(agent, {
    caseData: context.caseData,
    supportTags: context.supportTags,
    teamTags: context.teamTags,
  })

  if (equippedItems.length === 0) {
    return []
  }

  return EQUIPMENT_KIT_DEFINITIONS.flatMap((definition) => {
    if (
      definition.requiredCaseTags &&
      definition.requiredCaseTags.length > 0 &&
      !hasAnyRuntimeContextTag(context, definition.requiredCaseTags)
    ) {
      return []
    }

    const matchedItems = equippedItems.filter((item) =>
      matchesKitItem(item.id, item.tags, definition)
    )
    const matchedPieceCount = matchedItems.length
    const activeThresholdDefinitions = getActiveKitThresholds(definition, matchedPieceCount)

    if (activeThresholdDefinitions.length === 0) {
      return []
    }

    const matchedItemIds = [...new Set(matchedItems.map((item) => item.id))].sort((left, right) =>
      left.localeCompare(right)
    )
    const matchedTags = [
      ...new Set(
        matchedItems.flatMap((item) =>
          item.tags.filter((tag) => definition.requiredItemTags?.includes(tag))
        )
      ),
    ].sort((left, right) => left.localeCompare(right))

    return [
      toAppliedKit(
        definition,
        matchedItemIds,
        matchedTags,
        matchedPieceCount,
        activeThresholdDefinitions
      ),
    ]
  })
}

export function aggregateEquipmentKitEffects(kits: readonly AgentAppliedKit[]) {
  return aggregateRuntimeModifierResults(
    kits.map((kit) =>
      createRuntimeModifierResult({
        statModifiers: kit.statModifiers,
        effectivenessMultiplier: kit.effectivenessMultiplier,
        stressImpactMultiplier: kit.stressImpactMultiplier,
        moraleRecoveryDelta: kit.moraleRecoveryDelta,
      })
    )
  )
}
