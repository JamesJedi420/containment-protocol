import type { CaseTemplate, GameState } from './models'

export interface CaseGenerationPolicy {
  recentSpawnLookbackWeeks: number
  recentTemplateSuppressionMultiplier: number
  familyPenaltyPerRecentSpawn: number
  unseenFamilyBonus: number
  minimumWeightMultiplier: number
}

export const DEFAULT_CASE_GENERATION_POLICY: Readonly<CaseGenerationPolicy> = {
  recentSpawnLookbackWeeks: 4,
  recentTemplateSuppressionMultiplier: 0.55,
  familyPenaltyPerRecentSpawn: 0.12,
  unseenFamilyBonus: 0.22,
  minimumWeightMultiplier: 0.15,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function deriveTemplateFamily(templateId: string) {
  if (!templateId.includes('-')) {
    return templateId
  }

  return templateId.split('-')[0]!
}

export function getRecentSpawnedTemplateCounts(game: GameState, lookbackWeeks: number) {
  const templateCounts = new Map<string, number>()
  const familyCounts = new Map<string, number>()
  const earliestWeek = Math.max(1, game.week - Math.max(1, Math.trunc(lookbackWeeks)) + 1)

  for (const event of game.events) {
    if (event.type !== 'case.spawned') {
      continue
    }

    if (event.payload.week < earliestWeek) {
      continue
    }

    const templateId = event.payload.templateId
    const familyId = deriveTemplateFamily(templateId)

    templateCounts.set(templateId, (templateCounts.get(templateId) ?? 0) + 1)
    familyCounts.set(familyId, (familyCounts.get(familyId) ?? 0) + 1)
  }

  return {
    templateCounts,
    familyCounts,
  }
}

export function applyTemplateDiversityWeight(
  template: CaseTemplate,
  baseWeight: number,
  game: GameState,
  policy: CaseGenerationPolicy = DEFAULT_CASE_GENERATION_POLICY
) {
  if (baseWeight <= 0) {
    return 0
  }

  const { templateCounts, familyCounts } = getRecentSpawnedTemplateCounts(
    game,
    policy.recentSpawnLookbackWeeks
  )
  const templateSeenCount = templateCounts.get(template.templateId) ?? 0
  const familySeenCount = familyCounts.get(deriveTemplateFamily(template.templateId)) ?? 0

  const templateSuppression =
    templateSeenCount > 0
      ? Math.pow(policy.recentTemplateSuppressionMultiplier, templateSeenCount)
      : 1
  const familyPenalty =
    familySeenCount > 0
      ? 1 - familySeenCount * policy.familyPenaltyPerRecentSpawn
      : 1 + policy.unseenFamilyBonus
  const multiplier = clamp(templateSuppression * familyPenalty, policy.minimumWeightMultiplier, 3)

  return baseWeight * multiplier
}
