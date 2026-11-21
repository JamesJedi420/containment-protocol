/**
 * SPE-1453 — required conclusion validator (pure, caller-owned).
 *
 * Validates that required conclusions have sufficient independent clue-path support.
 * Independence is determined by unique underlyingSourceId; multiple paths from the same
 * source do not count as independent. Does not mutate inputs, evaluate runtime knowledge,
 * or assert absolute truth of any conclusion.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const REQUIRED_CONCLUSION_VALIDATOR_OWNER = 'SPE-1453' as const

export type ClueChannel =
  | 'scene_search'
  | 'autopsy'
  | 'interview'
  | 'tracking'
  | 'archive_research'
  | 'symbolic'
  | 'sensory'
  | 'courier'
  | 'rumor'
  | 'other'

export interface CluePath {
  readonly id: string
  readonly channel: ClueChannel
  readonly underlyingSourceId: string
  readonly confidence?: number
}

export interface RequiredConclusion {
  readonly id: string
  readonly label: string
  readonly requiredIndependentPaths: number
  readonly paths: readonly CluePath[]
}

export interface ConclusionValidation {
  readonly conclusionId: string
  readonly independentPathCount: number
  readonly sufficient: boolean
  readonly warnings: readonly string[]
  readonly owner: typeof REQUIRED_CONCLUSION_VALIDATOR_OWNER
}

function validatePath(path: CluePath, index: number): CluePath {
  if (typeof path !== 'object' || path === null || Array.isArray(path)) {
    throw new Error(`paths[${index}] is invalid`)
  }
  return Object.freeze({
    id: assertNonEmptyId(path.id, `paths[${index}].id`),
    channel: path.channel,
    underlyingSourceId: assertNonEmptyId(path.underlyingSourceId, `paths[${index}].underlyingSourceId`),
    ...(path.confidence !== undefined
      ? { confidence: assertSafeIntegerInRange(path.confidence, `paths[${index}].confidence`, 0, 100) }
      : {}),
  })
}

function validateConclusion(input: RequiredConclusion, index: number): RequiredConclusion {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(`conclusions[${index}] is invalid`)
  }
  if (!Array.isArray(input.paths)) {
    throw new Error(`conclusions[${index}].paths must be an array`)
  }
  return Object.freeze({
    id: assertNonEmptyId(input.id, `conclusions[${index}].id`),
    label: assertNonEmptyId(input.label, `conclusions[${index}].label`),
    requiredIndependentPaths: assertSafeIntegerInRange(
      input.requiredIndependentPaths,
      `conclusions[${index}].requiredIndependentPaths`,
      1,
      20
    ),
    paths: Object.freeze(input.paths.map(validatePath)),
  })
}

/**
 * Validate independent clue-path support for one or more required conclusions.
 * Repeated calls with identical inputs produce identical frozen results.
 */
export function validateRequiredConclusions(
  conclusions: readonly RequiredConclusion[]
): readonly ConclusionValidation[] {
  if (!Array.isArray(conclusions)) {
    throw new Error('conclusions must be an array')
  }
  const validated = conclusions.map(validateConclusion)
  return Object.freeze(
    validated.map((conclusion) => {
      const uniqueSources = new Set(conclusion.paths.map((p) => p.underlyingSourceId))
      const independentPathCount = uniqueSources.size
      const warnings: string[] = []
      if (independentPathCount < conclusion.requiredIndependentPaths) {
        warnings.push(
          `insufficient independent paths: ${independentPathCount} < ${conclusion.requiredIndependentPaths}`
        )
      }
      const sourceCounts = new Map<string, number>()
      for (const path of conclusion.paths) {
        sourceCounts.set(path.underlyingSourceId, (sourceCounts.get(path.underlyingSourceId) ?? 0) + 1)
      }
      for (const [sourceId, count] of sourceCounts) {
        if (count > 1) {
          warnings.push(`false independence: ${count} paths derive from source ${sourceId}`)
        }
      }
      if (conclusion.paths.length === 1 && conclusion.requiredIndependentPaths > 1) {
        warnings.push('single-clue bottleneck')
      }
      return Object.freeze({
        conclusionId: conclusion.id,
        independentPathCount,
        sufficient: independentPathCount >= conclusion.requiredIndependentPaths,
        warnings: Object.freeze(warnings),
        owner: REQUIRED_CONCLUSION_VALIDATOR_OWNER,
      })
    })
  )
}
