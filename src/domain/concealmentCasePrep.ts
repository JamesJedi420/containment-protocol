/**
 * SPE-70 / SPE-2107 slice 3: eligibility helpers for concealment case prep UI.
 */

import {
  CONCEALMENT_ACTIVATION_TAGS,
  type ConcealmentActivationTrigger,
} from './hiddenStateActivation'
import type { CaseInstance } from './models'

const CONCEAL_CASE_FLAG_PREFIX = 'conceal.case.'

function collectCaseTags(caseData: CaseInstance) {
  return [...new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])]
}

export function hasConcealmentActivationTag(caseData: CaseInstance) {
  const caseTags = collectCaseTags(caseData)
  return CONCEALMENT_ACTIVATION_TAGS.some((tag) => caseTags.includes(tag))
}

export function buildConcealCaseFlagId(caseId: string) {
  return `${CONCEAL_CASE_FLAG_PREFIX}${caseId.trim()}`
}

export function canShowConcealmentCasePrepOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress' && caseData.hiddenState === undefined
}

export function canPlayerSetConcealCaseFlag(caseData: CaseInstance) {
  return (
    canShowConcealmentCasePrepOnCase(caseData) &&
    (hasConcealmentActivationTag(caseData) || (caseData.concealmentTriggers?.length ?? 0) > 0)
  )
}

export function listConcealmentActivationTagsOnCase(caseData: CaseInstance) {
  const caseTags = new Set(collectCaseTags(caseData))
  return CONCEALMENT_ACTIVATION_TAGS.filter((tag) => caseTags.has(tag))
}

export function summarizeConcealmentTriggerWhen(
  trigger: ConcealmentActivationTrigger
): string {
  const when = trigger.when
  if (when === undefined) {
    return 'Always when open posture'
  }

  const parts: string[] = []

  if (when.anyTag?.length) {
    parts.push(`any tag: ${when.anyTag.join(', ')}`)
  }

  if (when.allTags?.length) {
    parts.push(`all tags: ${when.allTags.join(', ')}`)
  }

  if (when.globalFlag?.trim()) {
    parts.push(`flag: ${when.globalFlag.trim()}`)
  }

  if (when.minHiddenModifierCount !== undefined) {
    parts.push(`hidden modifiers ≥ ${when.minHiddenModifierCount}`)
  }

  if (when.minInvestigationWeight !== undefined) {
    parts.push(`investigation weight ≥ ${when.minInvestigationWeight}`)
  }

  return parts.length > 0 ? parts.join('; ') : 'Always when open posture'
}
