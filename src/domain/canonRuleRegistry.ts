/**
 * SPE-2263 — canon rule registry (supernatural consistency tokens, slice 1).
 *
 * Pure registry + consistency resolution. Release-scoped eligibility for
 * shared-universe-derived tokens consumes SPE-3300 membership as an input.
 * Does not implement world-law engines (SPE-151 / SPE-2098).
 */

import {
  resolveReleaseMember,
  type SharedUniverseCanonReleaseCatalog,
  type SharedUniverseCanonReleaseId,
} from './sharedUniverseCanonReleaseCatalog'

export const CANON_RULE_REGISTRY_SCHEMA_VERSION = 'spe-2263.v1' as const
export type CanonRuleRegistrySchemaVersion = typeof CANON_RULE_REGISTRY_SCHEMA_VERSION

export type CanonRuleId = string

export interface CanonRuleExceptionRef {
  readonly exceptionId: string
  readonly caseOrSubjectId: string
  readonly note?: string
}

export interface CanonRuleRecord {
  readonly ruleId: CanonRuleId
  readonly label: string
  readonly domainTags: readonly string[]
  /** Stable outcome token for identical inputs under this rule. */
  readonly behaviorOutcomeToken: string
  readonly exceptionRefs: readonly CanonRuleExceptionRef[]
  readonly supersedesRuleId?: CanonRuleId
  /** When set, rule eligibility is gated by SPE-3300 release membership. */
  readonly sharedUniversePromotedRecordId?: string
}

export interface CanonRuleRegistry {
  readonly schemaVersion: CanonRuleRegistrySchemaVersion
  readonly rules: Readonly<Record<string, CanonRuleRecord>>
}

export type CanonRuleResolutionKind =
  | 'applied'
  | 'exception_recorded'
  | 'unavailable_in_release'
  | 'unknown_rule'
  | 'superseded'

export interface CanonRuleResolution {
  readonly kind: CanonRuleResolutionKind
  readonly ruleId: CanonRuleId
  readonly outcomeToken: string | null
  readonly exceptionId?: string
  readonly explanation: string
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function createEmptyCanonRuleRegistry(): CanonRuleRegistry {
  return Object.freeze({
    schemaVersion: CANON_RULE_REGISTRY_SCHEMA_VERSION,
    rules: Object.freeze(Object.create(null) as Record<string, CanonRuleRecord>),
  })
}

export function upsertCanonRule(
  registry: CanonRuleRegistry,
  rule: CanonRuleRecord,
): CanonRuleRegistry {
  const ruleId = rule.ruleId.trim()
  const next: Record<string, CanonRuleRecord> = Object.create(null)
  for (const [id, entry] of Object.entries(registry.rules)) {
    next[id] = entry
  }
  next[ruleId] = Object.freeze({
    ...rule,
    ruleId,
    domainTags: Object.freeze([...rule.domainTags].sort(compareStrings)),
    exceptionRefs: Object.freeze(
      [...rule.exceptionRefs].sort((a, b) =>
        compareStrings(a.exceptionId, b.exceptionId),
      ),
    ),
  })
  return Object.freeze({
    schemaVersion: CANON_RULE_REGISTRY_SCHEMA_VERSION,
    rules: Object.freeze(next),
  })
}

/**
 * Resolve a canon rule for a case/subject. Same rule → same outcome unless an
 * explicit exception is recorded for that subject. Shared-universe-derived
 * rules are unavailable when the campaign-bound release lacks membership.
 */
export function resolveCanonRule(input: {
  readonly registry: CanonRuleRegistry
  readonly ruleId: CanonRuleId
  readonly caseOrSubjectId: string
  readonly boundReleaseId?: SharedUniverseCanonReleaseId | null
  readonly releaseCatalog?: SharedUniverseCanonReleaseCatalog | null
}): CanonRuleResolution {
  const ruleId = input.ruleId.trim()
  const rule = input.registry.rules[ruleId]
  if (!rule) {
    return Object.freeze({
      kind: 'unknown_rule' as const,
      ruleId,
      outcomeToken: null,
      explanation: `Unknown canon rule ${ruleId}`,
    })
  }

  // Prefer active superseding rule when present in registry.
  for (const candidate of Object.values(input.registry.rules)) {
    if (candidate.supersedesRuleId?.trim() === ruleId) {
      return Object.freeze({
        kind: 'superseded' as const,
        ruleId,
        outcomeToken: null,
        explanation: `Rule ${ruleId} is superseded by ${candidate.ruleId}`,
      })
    }
  }

  if (rule.sharedUniversePromotedRecordId) {
    const releaseId = input.boundReleaseId?.trim()
    if (!releaseId || !input.releaseCatalog) {
      return Object.freeze({
        kind: 'unavailable_in_release' as const,
        ruleId,
        outcomeToken: null,
        explanation:
          'Shared-universe-derived rule requires a bound release and catalog',
      })
    }
    const membership = resolveReleaseMember(
      input.releaseCatalog,
      releaseId,
      rule.sharedUniversePromotedRecordId,
    )
    if (membership.kind !== 'present_exact_revision') {
      return Object.freeze({
        kind: 'unavailable_in_release' as const,
        ruleId,
        outcomeToken: null,
        explanation: `Promoted record ${rule.sharedUniversePromotedRecordId} is ${membership.kind} under release ${releaseId}`,
      })
    }
  }

  const subjectId = input.caseOrSubjectId.trim()
  const exception = rule.exceptionRefs.find(
    (entry) => entry.caseOrSubjectId.trim() === subjectId,
  )
  if (exception) {
    return Object.freeze({
      kind: 'exception_recorded' as const,
      ruleId,
      outcomeToken: null,
      exceptionId: exception.exceptionId,
      explanation:
        exception.note ??
        `Explicit exception ${exception.exceptionId} for ${subjectId}`,
    })
  }

  return Object.freeze({
    kind: 'applied' as const,
    ruleId,
    outcomeToken: rule.behaviorOutcomeToken,
    explanation: `Applied ${ruleId} → ${rule.behaviorOutcomeToken}`,
  })
}

export function sanitizeCanonRuleRegistry(input: unknown): CanonRuleRegistry {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return createEmptyCanonRuleRegistry()
  }
  const record = input as Record<string, unknown>
  if (record.schemaVersion !== CANON_RULE_REGISTRY_SCHEMA_VERSION) {
    return createEmptyCanonRuleRegistry()
  }
  if (typeof record.rules !== 'object' || record.rules === null || Array.isArray(record.rules)) {
    return createEmptyCanonRuleRegistry()
  }
  let registry = createEmptyCanonRuleRegistry()
  for (const [id, value] of Object.entries(record.rules as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue
    const entry = value as Record<string, unknown>
    if (typeof entry.ruleId !== 'string' || entry.ruleId.trim() !== id.trim()) continue
    if (typeof entry.label !== 'string' || typeof entry.behaviorOutcomeToken !== 'string') continue
    if (!Array.isArray(entry.domainTags) || !Array.isArray(entry.exceptionRefs)) continue
    const exceptions: CanonRuleExceptionRef[] = []
    for (const rawException of entry.exceptionRefs) {
      if (typeof rawException !== 'object' || rawException === null) continue
      const exception = rawException as Record<string, unknown>
      if (
        typeof exception.exceptionId !== 'string' ||
        typeof exception.caseOrSubjectId !== 'string'
      ) {
        continue
      }
      exceptions.push(
        Object.freeze({
          exceptionId: exception.exceptionId,
          caseOrSubjectId: exception.caseOrSubjectId,
          note: typeof exception.note === 'string' ? exception.note : undefined,
        }),
      )
    }
    registry = upsertCanonRule(registry, {
      ruleId: entry.ruleId,
      label: entry.label,
      domainTags: entry.domainTags.filter((tag): tag is string => typeof tag === 'string'),
      behaviorOutcomeToken: entry.behaviorOutcomeToken,
      exceptionRefs: exceptions,
      supersedesRuleId:
        typeof entry.supersedesRuleId === 'string' ? entry.supersedesRuleId : undefined,
      sharedUniversePromotedRecordId:
        typeof entry.sharedUniversePromotedRecordId === 'string'
          ? entry.sharedUniversePromotedRecordId
          : undefined,
    })
  }
  return registry
}
