/**
 * SPE-2113: normalize authored concealment activation triggers for case content JSON.
 *
 * Case templates normalize authored rows in `buildCaseTemplateCatalog`; spawn copies them onto cases.
 */

import type {
  ConcealmentActivationMode,
  ConcealmentActivationTrigger,
  ConcealmentActivationTriggerCondition,
} from './hiddenStateActivation'

export interface AuthoredConcealmentActivationTriggerCondition {
  anyTag?: readonly string[]
  allTags?: readonly string[]
  globalFlag?: string
  minHiddenModifierCount?: number
  minInvestigationWeight?: number
}

export interface AuthoredConcealmentActivationTrigger {
  id: string
  mode?: ConcealmentActivationMode
  when?: AuthoredConcealmentActivationTriggerCondition
  displacementTarget?: string | null
  detectionConfidence?: number
}

function isAuthoredTriggerRecord(value: unknown): value is Partial<AuthoredConcealmentActivationTrigger> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeAuthoredTriggerId(id: unknown): string | undefined {
  if (typeof id !== 'string') {
    return undefined
  }

  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function copyNonEmptyStringList(values: unknown): string[] | undefined {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined
  }

  const strings = values
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return strings.length > 0 ? [...new Set(strings)] : undefined
}

function normalizeMode(mode: unknown): ConcealmentActivationMode | undefined {
  if (mode === 'hidden' || mode === 'displaced') {
    return mode
  }

  return undefined
}

function normalizeDetectionConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return value >= 0 && value <= 1 ? value : undefined
}

function normalizeDisplacementTarget(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function slimTriggerCondition(
  when: AuthoredConcealmentActivationTriggerCondition | null | undefined
): ConcealmentActivationTriggerCondition | undefined {
  if (when == null) {
    return undefined
  }

  const out: ConcealmentActivationTriggerCondition = {}
  const anyTag = copyNonEmptyStringList(when.anyTag)
  if (anyTag !== undefined) {
    out.anyTag = anyTag
  }

  const allTags = copyNonEmptyStringList(when.allTags)
  if (allTags !== undefined) {
    out.allTags = allTags
  }

  if (typeof when.globalFlag === 'string') {
    const flag = when.globalFlag.trim()
    if (flag.length > 0) {
      out.globalFlag = flag
    }
  }

  if (
    typeof when.minHiddenModifierCount === 'number' &&
    Number.isFinite(when.minHiddenModifierCount) &&
    when.minHiddenModifierCount >= 0
  ) {
    out.minHiddenModifierCount = when.minHiddenModifierCount
  }

  if (
    typeof when.minInvestigationWeight === 'number' &&
    Number.isFinite(when.minInvestigationWeight) &&
    when.minInvestigationWeight >= 0
  ) {
    out.minInvestigationWeight = when.minInvestigationWeight
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function slimAuthoredTrigger(
  authored: AuthoredConcealmentActivationTrigger
): ConcealmentActivationTrigger | undefined {
  const id = normalizeAuthoredTriggerId(authored.id)
  if (id === undefined) {
    return undefined
  }

  const mode = normalizeMode(authored.mode) ?? 'hidden'
  const when = slimTriggerCondition(authored.when)
  const detectionConfidence = normalizeDetectionConfidence(authored.detectionConfidence)
  const displacementTarget = normalizeDisplacementTarget(authored.displacementTarget)

  const trigger: ConcealmentActivationTrigger = { id, mode }

  if (when !== undefined) {
    trigger.when = when
  }
  if (detectionConfidence !== undefined) {
    trigger.detectionConfidence = detectionConfidence
  }
  if (displacementTarget !== undefined) {
    trigger.displacementTarget = displacementTarget
  }

  return trigger
}

/** Normalizes optional template-authored rows; returns `undefined` when the catalog omits triggers. */
export function resolveConcealmentTriggersForTemplate(
  authoredTriggers: readonly AuthoredConcealmentActivationTrigger[] | undefined
): readonly ConcealmentActivationTrigger[] | undefined {
  if (authoredTriggers === undefined) {
    return undefined
  }

  const normalized = buildConcealmentActivationTriggersFromAuthored(authoredTriggers)
  return normalized.length > 0 ? normalized : undefined
}

export function buildConcealmentActivationTriggersFromAuthored(
  authoredTriggers: readonly AuthoredConcealmentActivationTrigger[] | unknown
): readonly ConcealmentActivationTrigger[] {
  if (!Array.isArray(authoredTriggers)) {
    return []
  }

  const result: ConcealmentActivationTrigger[] = []

  for (const entry of authoredTriggers) {
    if (!isAuthoredTriggerRecord(entry)) {
      continue
    }

    const slimmed = slimAuthoredTrigger(entry as AuthoredConcealmentActivationTrigger)
    if (slimmed !== undefined) {
      result.push(slimmed)
    }
  }

  return result
}
