import {
  applyContainmentRecallHardStop,
  isSafeEquipmentInstanceId,
  type EquipmentInstance,
} from './equipmentInstance'
import type { GameState } from './models'

export const EQUIPMENT_RECALL_OBLIGATION_STATES = [
  'unknown',
  'located',
  'dispositioned',
  'remediated',
] as const

export type EquipmentRecallObligationState = (typeof EQUIPMENT_RECALL_OBLIGATION_STATES)[number]

export interface EquipmentRecallCampaign {
  readonly campaignId: string
  readonly definitionId: string
  readonly fabricatedLotId: string
}

export const WARD_SEAL_BATCH_A_RECALL: EquipmentRecallCampaign = Object.freeze({
  campaignId: 'recall:ward-seal-batch-a',
  definitionId: 'ward_seals',
  fabricatedLotId: 'batch-a',
})

export interface EquipmentRecallObligation {
  readonly instanceId: string
  readonly applicability: 'affected' | 'unaffected' | 'unknown'
  readonly state: EquipmentRecallObligationState
  readonly reason: 'lot_match' | 'lot_mismatch' | 'definition_mismatch' | 'provenance_missing'
  readonly observedCondition: EquipmentInstance['condition']
}

export interface EquipmentRecallRecord {
  readonly campaignId: string
  readonly obligations: Readonly<Record<string, EquipmentRecallObligation>>
}

export type EquipmentRecallRegistry = Readonly<Record<string, EquipmentRecallRecord>>

const SAFE_ID = /^[a-z0-9][a-z0-9:_-]{0,127}$/

function classify(instance: EquipmentInstance, campaign: EquipmentRecallCampaign) {
  if (instance.definitionId !== campaign.definitionId) {
    return { applicability: 'unaffected', reason: 'definition_mismatch' } as const
  }
  if (!instance.fabricationOrigin) {
    return { applicability: 'unknown', reason: 'provenance_missing' } as const
  }
  return instance.fabricationOrigin.queueId === campaign.fabricatedLotId
    ? ({ applicability: 'affected', reason: 'lot_match' } as const)
    : ({ applicability: 'unaffected', reason: 'lot_mismatch' } as const)
}

function resolveAffectedObligation(
  state: GameState,
  instance: EquipmentInstance,
  prior: EquipmentRecallObligation | undefined
): {
  state: GameState
  obligationState: EquipmentRecallObligationState
  observedCondition: EquipmentInstance['condition']
} {
  const repairObserved =
    prior?.applicability === 'affected' &&
    prior.observedCondition === 'damaged' &&
    instance.condition === 'operational'
  const deficiencyCleared = instance.containmentIntegrity?.deficiency.kind === 'none'
  if (
    (repairObserved || prior?.state === 'remediated') &&
    deficiencyCleared &&
    instance.condition === 'operational'
  ) {
    return { state, obligationState: 'remediated', observedCondition: 'operational' }
  }
  if (repairObserved) {
    return { state, obligationState: 'dispositioned', observedCondition: 'damaged' }
  }
  const disposition = applyContainmentRecallHardStop(state, instance.instanceId)
  const nextState = disposition.ok ? disposition.state : state
  const hardStopped =
    nextState.equipmentInstances?.[instance.instanceId]?.containmentIntegrity?.deficiency.kind ===
    'hard_stop'
  return {
    state: nextState,
    obligationState: hardStopped || prior?.state === 'dispositioned' ? 'dispositioned' : 'located',
    observedCondition: instance.condition,
  }
}

/**
 * Resolves one recall from canonical instance/provenance identity. Confirmed affected
 * containment identities are routed through the existing SPE-877 hard-stop command.
 */
export function reconcileEquipmentRecall(
  state: GameState,
  campaign: EquipmentRecallCampaign
): { readonly state: GameState; readonly record: EquipmentRecallRecord } {
  const previous = state.equipmentRecallRegistry?.[campaign.campaignId]
  let nextState = state
  const obligations: Record<string, EquipmentRecallObligation> = {}

  for (const instance of Object.values(state.equipmentInstances ?? {}).sort((a, b) =>
    a.instanceId.localeCompare(b.instanceId)
  )) {
    const classification = classify(instance, campaign)
    const prior = previous?.obligations[instance.instanceId]
    let obligationState: EquipmentRecallObligationState =
      classification.applicability === 'unknown' ? 'unknown' : 'located'
    let observedCondition = instance.condition

    if (classification.applicability === 'affected') {
      const resolved = resolveAffectedObligation(nextState, instance, prior)
      nextState = resolved.state
      obligationState = resolved.obligationState
      observedCondition = resolved.observedCondition
    }

    obligations[instance.instanceId] = Object.freeze({
      instanceId: instance.instanceId,
      ...classification,
      state: obligationState,
      observedCondition,
    })
  }

  const record = Object.freeze({
    campaignId: campaign.campaignId,
    obligations: Object.freeze(obligations),
  })
  return {
    state: {
      ...nextState,
      equipmentRecallRegistry: {
        ...nextState.equipmentRecallRegistry,
        [campaign.campaignId]: record,
      },
    },
    record,
  }
}

export function parseEquipmentRecallRegistry(value: unknown): EquipmentRecallRegistry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.freeze({})
  const records: Record<string, EquipmentRecallRecord> = {}
  for (const [campaignId, raw] of Object.entries(value)) {
    if (!SAFE_ID.test(campaignId) || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const candidate = raw as Record<string, unknown>
    if (
      Object.keys(candidate).some((key) => !['campaignId', 'obligations'].includes(key)) ||
      candidate.campaignId !== campaignId ||
      !candidate.obligations ||
      typeof candidate.obligations !== 'object' ||
      Array.isArray(candidate.obligations)
    )
      continue
    const obligations: Record<string, EquipmentRecallObligation> = {}
    for (const [instanceId, entry] of Object.entries(
      candidate.obligations as Record<string, unknown>
    )) {
      if (
        !isSafeEquipmentInstanceId(instanceId) ||
        !entry ||
        typeof entry !== 'object' ||
        Array.isArray(entry)
      )
        continue
      const parsed = parseObligation(instanceId, entry)
      if (parsed) obligations[instanceId] = parsed
    }
    records[campaignId] = Object.freeze({ campaignId, obligations: Object.freeze(obligations) })
  }
  return Object.freeze(records)
}

function parseObligation(
  instanceId: string,
  entry: unknown
): EquipmentRecallObligation | undefined {
  if (
    !isSafeEquipmentInstanceId(instanceId) ||
    !entry ||
    typeof entry !== 'object' ||
    Array.isArray(entry)
  )
    return undefined
  const item = entry as Record<string, unknown>
  const applicability = item.applicability
  const reason = item.reason
  const state = item.state
  const observedCondition = item.observedCondition
  const relationshipsValid =
    (applicability === 'unknown' && reason === 'provenance_missing' && state === 'unknown') ||
    (applicability === 'unaffected' &&
      (reason === 'lot_mismatch' || reason === 'definition_mismatch') &&
      state === 'located') ||
    (applicability === 'affected' &&
      reason === 'lot_match' &&
      ['located', 'dispositioned', 'remediated'].includes(state as string) &&
      (state !== 'remediated' || observedCondition === 'operational'))
  const valid = !(
    Object.keys(item).some(
      (key) =>
        !['instanceId', 'applicability', 'state', 'reason', 'observedCondition'].includes(key)
    ) ||
    item.instanceId !== instanceId ||
    !['affected', 'unaffected', 'unknown'].includes(item.applicability as string) ||
    !EQUIPMENT_RECALL_OBLIGATION_STATES.includes(item.state as EquipmentRecallObligationState) ||
    !['lot_match', 'lot_mismatch', 'definition_mismatch', 'provenance_missing'].includes(
      item.reason as string
    ) ||
    !['operational', 'damaged'].includes(item.observedCondition as string) ||
    !relationshipsValid
  )
  if (!valid) return undefined
  return Object.freeze({
    instanceId,
    applicability: item.applicability,
    state: item.state,
    reason: item.reason,
    observedCondition: item.observedCondition,
  } as EquipmentRecallObligation)
}
