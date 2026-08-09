import { getEquipmentCatalogEntries } from './equipment'
import {
  compareEquipmentGradeIds,
  isEquipmentGradeId,
  resolveEquipmentGradeProjection,
  type EquipmentGradeId,
  type EquipmentGradeParticipation,
  type EquipmentGradeProjection,
  type EquipmentGradeVisibility,
} from './equipmentGrade'
import type { EquipmentGradeRecoveryIssueCode } from './equipmentGradeRecovery'
import type { EquipmentAutoScrapReasonCode } from './equipmentAutoScrapReasonCodes'
export {
  EQUIPMENT_AUTO_SCRAP_REASON_CODES,
  type EquipmentAutoScrapReasonCode,
} from './equipmentAutoScrapReasonCodes'
import {
  appendOperationEventDrafts,
  createEquipmentAutoScrapPolicyChangedDraft,
  createEquipmentAutoScrapRoutedDraft,
} from './events'
import type { GameState } from './models'
import {
  queueEquipmentDeconstruction,
  resolveEquipmentDeconstructionPreview,
} from './sim/equipmentDeconstruction'

export type EquipmentAutoScrapPolicy =
  | Readonly<{ state: 'disabled' }>
  | Readonly<{ state: 'enabled'; thresholdGradeId: EquipmentGradeId }>

export const DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY: EquipmentAutoScrapPolicy = Object.freeze({
  state: 'disabled',
})

export interface EquipmentAutoScrapPreviewEntry {
  readonly itemId: string
  readonly itemName: string
  readonly quantity: number
  readonly decision: 'include' | 'exclude'
  readonly gradeProjection: EquipmentGradeProjection
  readonly reasonCodes: readonly EquipmentAutoScrapReasonCode[]
}

export interface EquipmentAutoScrapPreview {
  readonly thresholdGradeId: EquipmentGradeId
  readonly entries: readonly EquipmentAutoScrapPreviewEntry[]
  readonly includedItemCount: number
  readonly includedQuantity: number
  readonly excludedItemCount: number
  readonly excludedQuantity: number
}

export type EquipmentAutoScrapPolicyValidationResult =
  | Readonly<{ valid: true; value: EquipmentAutoScrapPolicy }>
  | Readonly<{ valid: false; value: EquipmentAutoScrapPolicy }>

const RECOVERY_RESTRICTION_REASON: Readonly<
  Partial<Record<EquipmentGradeRecoveryIssueCode, EquipmentAutoScrapReasonCode>>
> = Object.freeze({
  fabricated_lot_selection_unavailable: 'auto_scrap.fabricated_lot_selection_unavailable',
})

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function validateEquipmentAutoScrapPolicy(
  value: unknown
): EquipmentAutoScrapPolicyValidationResult {
  if (!isPlainRecord(value)) {
    return Object.freeze({ valid: false, value: DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY })
  }
  if (value.state === 'disabled' && Object.keys(value).length === 1) {
    return Object.freeze({ valid: true, value: DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY })
  }
  if (
    value.state === 'enabled' &&
    Object.keys(value).length === 2 &&
    isEquipmentGradeId(value.thresholdGradeId)
  ) {
    return Object.freeze({
      valid: true,
      value: Object.freeze({ state: 'enabled', thresholdGradeId: value.thresholdGradeId }),
    })
  }
  return Object.freeze({ valid: false, value: DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY })
}

export function sanitizeEquipmentAutoScrapPolicy(value: unknown): EquipmentAutoScrapPolicy {
  return validateEquipmentAutoScrapPolicy(value).value
}

export function resolveEquipmentAutoScrapGradeDecision(
  participation: EquipmentGradeParticipation,
  visibility: EquipmentGradeVisibility,
  thresholdGradeId: EquipmentGradeId
): Readonly<{
  decision: 'include' | 'exclude'
  projection: EquipmentGradeProjection
  reasonCode: EquipmentAutoScrapReasonCode
}> {
  const projection = resolveEquipmentGradeProjection(participation, visibility)
  if (visibility !== 'known' || participation.state !== 'graded') {
    return Object.freeze({
      decision: 'exclude',
      projection,
      reasonCode: 'auto_scrap.grade_unavailable',
    })
  }
  const included = compareEquipmentGradeIds(participation.gradeId, thresholdGradeId) <= 0
  return Object.freeze({
    decision: included ? 'include' : 'exclude',
    projection,
    reasonCode: included
      ? 'auto_scrap.eligible_at_or_below_threshold'
      : 'auto_scrap.grade_above_threshold',
  })
}

function resolveUnavailableReasons(
  issueCodes: readonly EquipmentGradeRecoveryIssueCode[]
): readonly EquipmentAutoScrapReasonCode[] {
  if (issueCodes.some((code) => code === 'hidden_grade' || code === 'invalid_participation')) {
    return Object.freeze(['auto_scrap.grade_unavailable'])
  }
  if (issueCodes.includes('profile_deferred')) {
    return Object.freeze(['auto_scrap.recovery_profile_unavailable'])
  }
  const restrictions = [...new Set(issueCodes.map((code) => RECOVERY_RESTRICTION_REASON[code]))]
    .filter((code): code is EquipmentAutoScrapReasonCode => Boolean(code))
    .sort(compareCodeUnits)
  return restrictions.length > 0
    ? Object.freeze(restrictions)
    : Object.freeze(['auto_scrap.recovery_unavailable'])
}

export function resolveEquipmentAutoScrapPreview(
  state: GameState,
  thresholdGradeId: EquipmentGradeId
): EquipmentAutoScrapPreview {
  const entries: EquipmentAutoScrapPreviewEntry[] = []
  for (const definition of [...getEquipmentCatalogEntries()].sort((left, right) =>
    compareCodeUnits(left.id, right.id)
  )) {
    const quantity = Math.max(0, Math.trunc(state.inventory[definition.id] ?? 0))
    if (quantity < 1) continue
    const recoveryPreview = resolveEquipmentDeconstructionPreview(state, definition.id)
    if (!recoveryPreview) continue
    if (!recoveryPreview.resolution.available) {
      const reasonCodes =
        recoveryPreview.resolution.projection.state === 'graded'
          ? resolveUnavailableReasons(recoveryPreview.resolution.issues.map((issue) => issue.code))
          : Object.freeze(['auto_scrap.grade_unavailable'] as const)
      entries.push(
        Object.freeze({
          itemId: definition.id,
          itemName: definition.name,
          quantity,
          decision: 'exclude',
          gradeProjection: recoveryPreview.resolution.projection,
          reasonCodes,
        })
      )
      continue
    }

    const gradeDecision = resolveEquipmentAutoScrapGradeDecision(
      recoveryPreview.resolution.participation,
      recoveryPreview.resolution.visibility,
      thresholdGradeId
    )
    entries.push(
      Object.freeze({
        itemId: definition.id,
        itemName: definition.name,
        quantity,
        decision: gradeDecision.decision,
        gradeProjection: gradeDecision.projection,
        reasonCodes: Object.freeze([gradeDecision.reasonCode]),
      })
    )
  }

  const included = entries.filter((entry) => entry.decision === 'include')
  const excluded = entries.filter((entry) => entry.decision === 'exclude')
  return Object.freeze({
    thresholdGradeId,
    entries: Object.freeze(entries),
    includedItemCount: included.length,
    includedQuantity: included.reduce((total, entry) => total + entry.quantity, 0),
    excludedItemCount: excluded.length,
    excludedQuantity: excluded.reduce((total, entry) => total + entry.quantity, 0),
  })
}

function buildReasonCounts(preview: EquipmentAutoScrapPreview) {
  const counts = new Map<EquipmentAutoScrapReasonCode, number>()
  for (const entry of preview.entries) {
    if (entry.decision !== 'exclude') continue
    for (const reasonCode of entry.reasonCodes) {
      counts.set(reasonCode, (counts.get(reasonCode) ?? 0) + entry.quantity)
    }
  }
  return [...counts.entries()]
    .sort(([left], [right]) => compareCodeUnits(left, right))
    .map(([reasonCode, count]) => Object.freeze({ reasonCode, count }))
}

export function enableEquipmentAutoScrapPolicy(
  state: GameState,
  thresholdGradeId: EquipmentGradeId
): GameState {
  if (
    state.equipmentAutoScrapPolicy?.state === 'enabled' &&
    state.equipmentAutoScrapPolicy.thresholdGradeId === thresholdGradeId
  ) {
    return state
  }
  const preview = resolveEquipmentAutoScrapPreview(state, thresholdGradeId)
  const nextState: GameState = {
    ...state,
    equipmentAutoScrapPolicy: Object.freeze({ state: 'enabled', thresholdGradeId }),
  }
  return appendOperationEventDrafts(nextState, [
    createEquipmentAutoScrapPolicyChangedDraft({
      week: state.week,
      action: 'enabled',
      thresholdGradeId,
      includedItemCount: preview.includedItemCount,
      includedQuantity: preview.includedQuantity,
      excludedItemCount: preview.excludedItemCount,
      excludedQuantity: preview.excludedQuantity,
    }),
  ])
}

export function disableEquipmentAutoScrapPolicy(state: GameState): GameState {
  if (
    (state.equipmentAutoScrapPolicy ?? DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY).state === 'disabled'
  ) {
    return state
  }
  const thresholdGradeId =
    state.equipmentAutoScrapPolicy?.state === 'enabled'
      ? state.equipmentAutoScrapPolicy.thresholdGradeId
      : undefined
  return appendOperationEventDrafts(
    { ...state, equipmentAutoScrapPolicy: DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY },
    [
      createEquipmentAutoScrapPolicyChangedDraft({
        week: state.week,
        action: 'disabled',
        ...(thresholdGradeId ? { thresholdGradeId } : {}),
        includedItemCount: 0,
        includedQuantity: 0,
        excludedItemCount: 0,
        excludedQuantity: 0,
      }),
    ]
  )
}

export function applyEquipmentAutoScrapAtWeekClose(state: GameState): GameState {
  const policy = state.equipmentAutoScrapPolicy ?? DISABLED_EQUIPMENT_AUTO_SCRAP_POLICY
  if (policy.state !== 'enabled') return state
  if (
    state.events.some(
      (event) => event.type === 'equipment.auto_scrap_routed' && event.payload.week === state.week
    )
  ) {
    return state
  }

  const preview = resolveEquipmentAutoScrapPreview(state, policy.thresholdGradeId)
  const priorQueueIds = new Set((state.equipmentDeconstructionQueue ?? []).map((entry) => entry.id))
  let nextState = state
  for (const entry of preview.entries) {
    if (entry.decision !== 'include') continue
    for (let index = 0; index < entry.quantity; index += 1) {
      nextState = queueEquipmentDeconstruction(nextState, entry.itemId)
    }
  }
  const routedQueueIds = (nextState.equipmentDeconstructionQueue ?? [])
    .map((entry) => entry.id)
    .filter((queueId) => !priorQueueIds.has(queueId))
  return appendOperationEventDrafts(nextState, [
    createEquipmentAutoScrapRoutedDraft({
      week: state.week,
      thresholdGradeId: policy.thresholdGradeId,
      routedQueueIds,
      routedQuantity: routedQueueIds.length,
      includedItemCount: preview.includedItemCount,
      excludedItemCount: preview.excludedItemCount,
      excludedQuantity: preview.excludedQuantity,
      exclusionReasonCounts: buildReasonCounts(preview),
    }),
  ])
}

export function getEquipmentAutoScrapReasonLabel(code: EquipmentAutoScrapReasonCode) {
  switch (code) {
    case 'auto_scrap.eligible_at_or_below_threshold':
      return 'Eligible at or below threshold'
    case 'auto_scrap.grade_above_threshold':
      return 'Grade is above threshold'
    case 'auto_scrap.grade_unavailable':
      return 'Grade unavailable for automation'
    case 'auto_scrap.recovery_profile_unavailable':
      return 'Recovery profile unavailable'
    case 'auto_scrap.fabricated_lot_selection_unavailable':
      return 'Fabricated batch selection unavailable'
    default:
      return 'Recovery unavailable'
  }
}
