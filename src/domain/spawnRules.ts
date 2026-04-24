import type { SpawnRule } from './models'

export interface NormalizedSpawnRule extends SpawnRule {
  stageDelta: number
  spawnCount: { min: number; max: number }
  spawnTemplateIds: string[]
}

export function normalizeSpawnRule(rule: SpawnRule): NormalizedSpawnRule {
  return {
    ...rule,
    stageDelta: rule.stageDelta ?? 0,
    spawnCount: {
      min: rule.spawnCount?.min ?? 0,
      max: rule.spawnCount?.max ?? 0,
    },
    spawnTemplateIds: [...(rule.spawnTemplateIds ?? [])],
  }
}
