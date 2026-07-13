/**
 * SPE-2578 / SPE-947: read-only planning mirror over persisted spe947* maps.
 * Surfaces platforms, counter-memetic plans, content owners, and post-case media
 * cases as labels only — does not call SPE-2568–2573 evaluators.
 */

import type { GameState } from '../../domain/models'
import type {
  Spe947PersistedCounterMemeticPlan,
  Spe947PersistedPlatform,
} from '../../domain/spe947EvaluatorPersistence'
import type { ContentOwner } from '../../domain/contentOwnerTakedownResistance'
import type { PostCaseMediaPersistenceInput } from '../../domain/postCaseMediaPersistence'

export interface Spe947PlatformMirrorRow {
  readonly id: string
  readonly label: string
  readonly viewCountLabel: string
  readonly uptimeStateLabel: string
  readonly reachFactorLabel: string
  readonly availableReachLabel: string
  readonly weeklyViewDeltaLabel: string
  readonly lastWeeklyTickWeekLabel: string
}

export interface Spe947PlanMirrorRow {
  readonly id: string
  readonly label: string
  readonly loreStateLabel: string
  readonly distributorLabel: string
  readonly uptakeStateLabel: string
  readonly elapsedPropagationWeeksLabel: string
  readonly requiredPropagationWeeksLabel: string
  readonly lastWeeklyTickWeekLabel: string
}

export interface Spe947OwnerMirrorRow {
  readonly id: string
  readonly label: string
  readonly incentivesLabel: string
}

export interface Spe947MediaCaseMirrorRow {
  readonly id: string
  readonly label: string
  readonly localContainmentSucceededLabel: string
  readonly riskThresholdLabel: string
  readonly mediaArtifactCountLabel: string
  readonly mediaArtifactLabels: readonly string[]
}

export interface Spe947EvaluatorMirrorSummaryView {
  readonly platformCount: number
  readonly planCount: number
  readonly ownerCount: number
  readonly mediaCaseCount: number
  readonly week: number
}

export interface Spe947EvaluatorMirrorView {
  readonly isEmpty: boolean
  readonly summary: Spe947EvaluatorMirrorSummaryView
  readonly platforms: readonly Spe947PlatformMirrorRow[]
  readonly plans: readonly Spe947PlanMirrorRow[]
  readonly owners: readonly Spe947OwnerMirrorRow[]
  readonly mediaCases: readonly Spe947MediaCaseMirrorRow[]
}

export function formatSpe947EnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function formatOptionalNumber(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return String(value)
}

function formatOptionalEnum(value: string | undefined): string {
  if (!value) {
    return '—'
  }

  return formatSpe947EnumLabel(value)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : 'No'
}

function listSortedById<T extends { readonly id: string }>(
  map: Record<string, T> | undefined
): T[] {
  if (!map) {
    return []
  }

  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function listSortedMediaCases(
  map: Record<string, PostCaseMediaPersistenceInput> | undefined
): PostCaseMediaPersistenceInput[] {
  if (!map) {
    return []
  }

  return Object.values(map).sort((left, right) => {
    const leftId = left.caseId?.trim() || ''
    const rightId = right.caseId?.trim() || ''
    return leftId.localeCompare(rightId)
  })
}

function toPlatformRow(platform: Spe947PersistedPlatform): Spe947PlatformMirrorRow {
  return Object.freeze({
    id: platform.id,
    label: platform.label,
    viewCountLabel: formatOptionalNumber(platform.viewCount),
    uptimeStateLabel: formatOptionalEnum(platform.uptimeState),
    reachFactorLabel: formatOptionalNumber(platform.reachFactor),
    availableReachLabel: formatOptionalNumber(platform.availableReach),
    weeklyViewDeltaLabel: formatOptionalNumber(platform.weeklyViewDelta),
    lastWeeklyTickWeekLabel: formatOptionalNumber(platform.lastWeeklyTickWeek),
  })
}

function toPlanRow(plan: Spe947PersistedCounterMemeticPlan): Spe947PlanMirrorRow {
  return Object.freeze({
    id: plan.id,
    label: plan.label,
    loreStateLabel: formatSpe947EnumLabel(plan.loreState),
    distributorLabel: plan.distributorId?.trim() ? plan.distributorId : '—',
    uptakeStateLabel: formatSpe947EnumLabel(plan.uptakeState),
    elapsedPropagationWeeksLabel: String(plan.elapsedPropagationWeeks),
    requiredPropagationWeeksLabel: String(plan.requiredPropagationWeeks),
    lastWeeklyTickWeekLabel: formatOptionalNumber(plan.lastWeeklyTickWeek),
  })
}

function toOwnerRow(owner: ContentOwner): Spe947OwnerMirrorRow {
  const incentives = owner.incentives
  const parts: string[] = []

  for (const key of ['audience', 'status', 'profit', 'identity'] as const) {
    const value = incentives?.[key]
    if (value !== undefined) {
      parts.push(`${key} ${value}`)
    }
  }

  return Object.freeze({
    id: owner.id,
    label: owner.label,
    incentivesLabel: parts.length > 0 ? parts.join('; ') : '—',
  })
}

function toMediaCaseRow(mediaCase: PostCaseMediaPersistenceInput): Spe947MediaCaseMirrorRow {
  const caseId = mediaCase.caseId?.trim() ? mediaCase.caseId : '—'
  const artifacts = mediaCase.mediaArtifacts ?? []

  return Object.freeze({
    id: caseId,
    label: mediaCase.caseLabel?.trim() ? mediaCase.caseLabel : caseId,
    localContainmentSucceededLabel: formatYesNo(mediaCase.localContainmentSucceeded === true),
    riskThresholdLabel: formatOptionalNumber(mediaCase.riskThreshold),
    mediaArtifactCountLabel: String(artifacts.length),
    mediaArtifactLabels: Object.freeze(
      artifacts.map((artifact) => artifact.label?.trim() || artifact.id)
    ),
  })
}

/** Read-only mirror over hydrated spe947* maps; does not re-run evaluators. */
export function getSpe947EvaluatorMirrorView(game: GameState): Spe947EvaluatorMirrorView {
  const platforms = listSortedById(game.spe947PlatformRecords).map(toPlatformRow)
  const plans = listSortedById(game.spe947CounterMemeticPlans).map(toPlanRow)
  const owners = listSortedById(game.spe947ContentOwners).map(toOwnerRow)
  const mediaCases = listSortedMediaCases(game.spe947PostCaseMediaCases).map(toMediaCaseRow)

  const platformCount = platforms.length
  const planCount = plans.length
  const ownerCount = owners.length
  const mediaCaseCount = mediaCases.length

  return Object.freeze({
    isEmpty: platformCount + planCount + ownerCount + mediaCaseCount === 0,
    summary: Object.freeze({
      platformCount,
      planCount,
      ownerCount,
      mediaCaseCount,
      week: game.week,
    }),
    platforms: Object.freeze(platforms),
    plans: Object.freeze(plans),
    owners: Object.freeze(owners),
    mediaCases: Object.freeze(mediaCases),
  })
}
