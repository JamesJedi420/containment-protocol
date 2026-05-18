/**
 * SPE-521 slice 2: normalize authored infiltration probe plans for case templates.
 */

import type {
  InfiltrationProbeAction,
  InfiltrationProbePlan,
  InfiltrationProbeProgressActionRule,
} from './infiltrationProbe'
import { isInfiltrationProbeAction } from './infiltrationProbe'

export interface AuthoredInfiltrationProbeProgressActionRule {
  belowProbeProgress?: number
  action?: string
}

export interface AuthoredInfiltrationProbePlan {
  defaultAction?: string
  actionWhenProbeProgressBelow?: readonly AuthoredInfiltrationProbeProgressActionRule[]
  cleanupWhenAwarenessAtLeast?: number
}

function isAuthoredPlanRecord(value: unknown): value is Partial<AuthoredInfiltrationProbePlan> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeProbeAction(action: unknown): InfiltrationProbeAction | undefined {
  if (typeof action !== 'string') {
    return undefined
  }

  const trimmed = action.trim() as InfiltrationProbeAction
  return isInfiltrationProbeAction(trimmed) ? trimmed : undefined
}

function normalizeProgressThreshold(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return value >= 0 && value <= 1 ? value : undefined
}

function normalizeProgressRules(
  rules: readonly AuthoredInfiltrationProbeProgressActionRule[] | undefined
): readonly InfiltrationProbeProgressActionRule[] | undefined {
  if (!Array.isArray(rules) || rules.length === 0) {
    return undefined
  }

  const normalized: InfiltrationProbeProgressActionRule[] = []

  for (const entry of rules) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }

    const belowProbeProgress = normalizeProgressThreshold(entry.belowProbeProgress)
    const action = normalizeProbeAction(entry.action)

    if (belowProbeProgress === undefined || action === undefined) {
      continue
    }

    normalized.push({ belowProbeProgress, action })
  }

  if (normalized.length === 0) {
    return undefined
  }

  return [...normalized].sort((left, right) => left.belowProbeProgress - right.belowProbeProgress)
}

export function buildInfiltrationProbePlanFromAuthored(
  authored: AuthoredInfiltrationProbePlan | undefined | null
): InfiltrationProbePlan | undefined {
  if (authored == null) {
    return undefined
  }

  const defaultAction = normalizeProbeAction(authored.defaultAction)
  const actionWhenProbeProgressBelow = normalizeProgressRules(authored.actionWhenProbeProgressBelow)
  const cleanupWhenAwarenessAtLeast = normalizeProgressThreshold(authored.cleanupWhenAwarenessAtLeast)

  const plan: InfiltrationProbePlan = {}

  if (defaultAction !== undefined) {
    plan.defaultAction = defaultAction
  }
  if (actionWhenProbeProgressBelow !== undefined) {
    plan.actionWhenProbeProgressBelow = actionWhenProbeProgressBelow
  }
  if (cleanupWhenAwarenessAtLeast !== undefined) {
    plan.cleanupWhenAwarenessAtLeast = cleanupWhenAwarenessAtLeast
  }

  return Object.keys(plan).length > 0 ? plan : undefined
}

export function buildInfiltrationProbePlanFromAuthoredRecord(
  authored: unknown
): InfiltrationProbePlan | undefined {
  if (!isAuthoredPlanRecord(authored)) {
    return undefined
  }

  return buildInfiltrationProbePlanFromAuthored(authored as AuthoredInfiltrationProbePlan)
}
