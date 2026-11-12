/**
 * SPE-2116 slice 3: investigation UI substitution for naming-hazard descriptors.
 *
 * Routes persisted descriptors onto in-progress investigation prep via intake
 * topic cross-link keys; projects player-facing labels through `projectSafeLabel`.
 */

import { listNamingHazardDescriptorsForIntakeTopic } from './informationIntakeNamingHazardCrossLink'
import { resolveMissionIntakeTopicKeys } from './missionIntakeInformationRouting'
import type { CaseInstance, GameState } from './models'
import {
  projectSafeLabel,
  type NamingHazardDescriptorRecord,
  type SafeLabelSurface,
} from './namingHazardDescriptorRegistry'

export interface InvestigationNamingHazardDescriptorView {
  readonly descriptorId: string
  readonly topicRef: string
  readonly safeLabel: string
  readonly redacted: boolean
  readonly usedGridFallback: boolean
  readonly summary?: string
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function resolveInvestigationNamingHazardGridRef(caseData: CaseInstance): string | undefined {
  const route = normalizeToken(caseData.route ?? '')
  if (route) {
    return route
  }

  const compartment = normalizeToken(caseData.compartment ?? '')
  if (compartment) {
    return compartment
  }

  const primaryZone = caseData.mapLayer?.zones?.[0]
  const zoneName = normalizeToken(primaryZone?.name ?? '')
  return zoneName || undefined
}

function resolveRoutingTopicRef(
  topicKeys: readonly string[],
  descriptor: NamingHazardDescriptorRecord
): string {
  const intakeTopicRef = normalizeToken(descriptor.intakeTopicRef ?? '').toLowerCase()
  if (!intakeTopicRef) {
    return topicKeys[0] ?? '(unknown)'
  }

  const matchedKey = topicKeys.find((key) => key === intakeTopicRef)
  return matchedKey ?? intakeTopicRef
}

function collectLinkedDescriptors(
  game: Pick<GameState, 'namingHazardDescriptorRecords'>,
  caseData: Pick<CaseInstance, 'id' | 'tags'>
): readonly { readonly descriptor: NamingHazardDescriptorRecord; readonly topicRef: string }[] {
  const descriptors = game.namingHazardDescriptorRecords
  if (!descriptors || Object.keys(descriptors).length === 0) {
    return []
  }

  const topicKeys = resolveMissionIntakeTopicKeys(caseData)
  const linked = new Map<string, { readonly descriptor: NamingHazardDescriptorRecord; readonly topicRef: string }>()

  for (const topicKey of topicKeys) {
    for (const descriptor of listNamingHazardDescriptorsForIntakeTopic(descriptors, topicKey)) {
      if (linked.has(descriptor.id)) {
        continue
      }

      linked.set(descriptor.id, {
        descriptor,
        topicRef: resolveRoutingTopicRef(topicKeys, descriptor),
      })
    }
  }

  return [...linked.values()].sort((left, right) =>
    left.descriptor.id.localeCompare(right.descriptor.id)
  )
}

function projectInvestigationDescriptorView(
  descriptor: NamingHazardDescriptorRecord,
  topicRef: string,
  caseData: CaseInstance,
  surface: SafeLabelSurface = 'briefing'
): InvestigationNamingHazardDescriptorView {
  const projection = projectSafeLabel(descriptor, {
    surface,
    gridRef: resolveInvestigationNamingHazardGridRef(caseData),
  })

  const summary =
    typeof descriptor.summary === 'string' && descriptor.summary.trim().length > 0
      ? descriptor.summary.trim()
      : undefined

  return Object.freeze({
    descriptorId: descriptor.id,
    topicRef,
    safeLabel: projection.safeLabel,
    redacted: projection.redacted,
    usedGridFallback: projection.usedGridFallback,
    ...(summary ? { summary } : {}),
  })
}

/** Never surfaces raw `record.label` when `trueNameForbidden` is set. */
export function buildInvestigationNamingHazardDescriptorViews(
  game: Pick<GameState, 'namingHazardDescriptorRecords'>,
  caseData: CaseInstance,
  surface: SafeLabelSurface = 'briefing'
): readonly InvestigationNamingHazardDescriptorView[] {
  return collectLinkedDescriptors(game, caseData).map(({ descriptor, topicRef }) =>
    projectInvestigationDescriptorView(descriptor, topicRef, caseData, surface)
  )
}

export function assertInvestigationNamingHazardViewsDoNotLeakTrueNames(
  views: readonly InvestigationNamingHazardDescriptorView[],
  descriptors: Record<string, NamingHazardDescriptorRecord> | undefined
): boolean {
  if (!descriptors) {
    return true
  }

  for (const view of views) {
    const record = descriptors[view.descriptorId]
    if (!record?.trueNameForbidden) {
      continue
    }

    const forbiddenLabel = normalizeToken(record.label).toLowerCase()
    if (!forbiddenLabel) {
      continue
    }

    if (view.safeLabel.toLowerCase() === forbiddenLabel) {
      return false
    }
  }

  return true
}
