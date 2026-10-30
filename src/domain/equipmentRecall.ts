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
      classification.applicability === 'unknown'
        ? 'unknown'
        : classification.applicability === 'unaffected'
          ? 'located'
          : 'located'

    if (classification.applicability === 'affected') {
      if (
        prior?.applicability === 'affected' &&
        prior.observedCondition === 'damaged' &&
        instance.condition === 'operational' &&
        instance.containmentIntegrity?.deficiency.kind === 'none'
      ) {
        obligationState = 'remediated'
      } else if (
        prior?.applicability === 'affected' &&
        prior.observedCondition === 'damaged' &&
        instance.condition === 'operational'
      ) {
        // Preserve the durable repair observation while authoritative deficiency relief is pending.
        obligationState = 'dispositioned'
      } else if (
        prior?.state === 'remediated' &&
        instance.condition === 'operational' &&
        instance.containmentIntegrity?.deficiency.kind === 'none'
      ) {
        obligationState = 'remediated'
      } else {
        const disposition = applyContainmentRecallHardStop(nextState, instance.instanceId)
        if (disposition.ok) nextState = disposition.state
        const current = nextState.equipmentInstances?.[instance.instanceId]
        obligationState =
          current?.containmentIntegrity?.deficiency.kind === 'hard_stop'
            ? 'dispositioned'
            : prior?.state === 'dispositioned'
              ? 'dispositioned'
              : 'located'
      }
    }

    obligations[instance.instanceId] = Object.freeze({
      instanceId: instance.instanceId,
      ...classification,
      state: obligationState,
      observedCondition:
        classification.applicability === 'affected' &&
        prior?.observedCondition === 'damaged' &&
        instance.condition === 'operational' &&
        obligationState !== 'remediated'
          ? 'damaged'
          : instance.condition,
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
        ...(nextState.equipmentRecallRegistry ?? {}),
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
      if (
        Object.keys(item).some(
          (key) =>
            !['instanceId', 'applicability', 'state', 'reason', 'observedCondition'].includes(key)
        ) ||
        item.instanceId !== instanceId ||
        !['affected', 'unaffected', 'unknown'].includes(item.applicability as string) ||
        !EQUIPMENT_RECALL_OBLIGATION_STATES.includes(
          item.state as EquipmentRecallObligationState
        ) ||
        !['lot_match', 'lot_mismatch', 'definition_mismatch', 'provenance_missing'].includes(
          item.reason as string
        ) ||
        !['operational', 'damaged'].includes(item.observedCondition as string) ||
        !relationshipsValid
      )
        continue
      obligations[instanceId] = Object.freeze({
        instanceId,
        applicability: item.applicability,
        state: item.state,
        reason: item.reason,
        observedCondition: item.observedCondition,
      } as EquipmentRecallObligation)
    }
    records[campaignId] = Object.freeze({ campaignId, obligations: Object.freeze(obligations) })
  }
  return Object.freeze(records)
}
