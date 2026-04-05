import { getMarketPressureLabel } from '../data/production'
import {
  getMissionRewardFactionStandingNet,
  getMissionRewardInventoryTotals,
} from './missionResults'
import { formatProductionMaterialSummary, formatProductionOutputLabel } from './crafting'
import {
  type MissionRewardBreakdown,
  type OperationEvent,
  type ReportNote,
  type ReportNoteMetadata,
} from './models'
import { type AnyOperationEventDraft } from './events'

const REPORT_NOTE_CLOCK_START_MS = Date.UTC(2042, 0, 1, 0, 0, 0)
const REPORT_NOTE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const HISTORICAL_REPORT_NOTE_EVENT_TYPES = new Set<OperationEvent['type']>([
  'recruitment.scouting_initiated',
  'recruitment.scouting_refined',
  'recruitment.intel_confirmed',
])

function normalizeWeek(week: number) {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function normalizeSequence(sequence: number) {
  if (!Number.isFinite(sequence)) {
    return 0
  }

  return Math.max(0, Math.trunc(sequence))
}

export function buildReportNoteTimestamp(week: number, sequence: number, baseTimestamp?: number) {
  const safeSequence = normalizeSequence(sequence)

  if (typeof baseTimestamp === 'number' && Number.isFinite(baseTimestamp)) {
    return Math.trunc(baseTimestamp) + safeSequence
  }

  const safeWeek = normalizeWeek(week) - 1
  return REPORT_NOTE_CLOCK_START_MS + safeWeek * REPORT_NOTE_WEEK_MS + safeSequence
}

export function createDeterministicReportNote(
  content: string,
  week: number,
  sequence: number,
  baseTimestamp?: number,
  type?: ReportNote['type'],
  metadata?: ReportNote['metadata']
): ReportNote {
  const safeSequence = normalizeSequence(sequence)
  const timestamp = buildReportNoteTimestamp(week, safeSequence, baseTimestamp)

  const note: ReportNote = {
    id: `note-${timestamp}-${safeSequence.toString(36)}`,
    content,
    timestamp,
  }

  if (type !== undefined) {
    note.type = type
  }

  if (metadata !== undefined) {
    note.metadata = metadata
  }

  return note
}

function buildReflectedReportNote(draft: AnyOperationEventDraft): {
  content: string
  type: NonNullable<ReportNote['type']>
  metadata?: ReportNoteMetadata
} | null {
  const rewardSummary =
    'rewardBreakdown' in draft.payload && draft.payload.rewardBreakdown
      ? formatRewardSummary(draft.payload.rewardBreakdown)
      : null
  const rewardMetadata =
    'rewardBreakdown' in draft.payload && draft.payload.rewardBreakdown
      ? buildRewardMetadata(draft.payload.rewardBreakdown)
      : undefined

  switch (draft.type) {
    case 'case.resolved':
      return {
        content: `${draft.payload.caseTitle}: operation concluded. Threat contained.${rewardSummary ? ` ${rewardSummary}` : ''}`,
        type: 'case.resolved',
        metadata: {
          caseId: draft.payload.caseId,
          caseTitle: draft.payload.caseTitle,
          stage: draft.payload.stage,
          ...(rewardMetadata ?? {}),
        },
      }

    case 'case.partially_resolved':
      return {
        content: `${draft.payload.caseTitle}: partially stabilised. Case returned to active queue.${rewardSummary ? ` ${rewardSummary}` : ''}`,
        type: 'case.partially_resolved',
        metadata: {
          caseId: draft.payload.caseId,
          caseTitle: draft.payload.caseTitle,
          fromStage: draft.payload.fromStage,
          toStage: draft.payload.toStage,
          ...(rewardMetadata ?? {}),
        },
      }

    case 'case.failed':
      return {
        content: `${draft.payload.caseTitle}: containment failed. Threat escalated to Stage ${draft.payload.toStage}.${rewardSummary ? ` ${rewardSummary}` : ''}`,
        type: 'case.failed',
        metadata: {
          caseId: draft.payload.caseId,
          caseTitle: draft.payload.caseTitle,
          fromStage: draft.payload.fromStage,
          toStage: draft.payload.toStage,
          ...(rewardMetadata ?? {}),
        },
      }

    case 'case.escalated':
      return {
        content: `${draft.payload.caseTitle}: deadline lapsed. Escalated to Stage ${draft.payload.toStage}.${rewardSummary ? ` ${rewardSummary}` : ''}`,
        type: 'case.escalated',
        metadata: {
          caseId: draft.payload.caseId,
          caseTitle: draft.payload.caseTitle,
          fromStage: draft.payload.fromStage,
          toStage: draft.payload.toStage,
          trigger: draft.payload.trigger,
          ...(rewardMetadata ?? {}),
        },
      }

    case 'case.spawned':
      return {
        content:
          draft.payload.trigger === 'world_activity'
            ? `${draft.payload.caseTitle}: ${draft.payload.sourceReason ?? 'A new incident surfaced from baseline world activity.'}`
            : draft.payload.trigger === 'faction_pressure'
              ? `${draft.payload.caseTitle}: ${draft.payload.sourceReason ?? `${draft.payload.factionLabel ?? 'Faction'} pressure surfaced this incident.`}`
              : draft.payload.trigger === 'pressure_threshold'
                ? `${draft.payload.caseTitle}: ${draft.payload.sourceReason ?? 'A major incident was opened by global pressure threshold breach.'}`
                : `${draft.payload.parentCaseTitle ?? draft.payload.caseTitle}: 1 follow-up operation(s) opened.`,
        type: 'case.spawned',
        metadata: {
          caseId: draft.payload.caseId,
          caseTitle: draft.payload.caseTitle,
          parentCaseId: draft.payload.parentCaseId ?? null,
          trigger: draft.payload.trigger,
          factionId: draft.payload.factionId ?? null,
          factionLabel: draft.payload.factionLabel ?? null,
          sourceReason: draft.payload.sourceReason ?? null,
        },
      }

    case 'case.raid_converted':
      return {
        content: `${draft.payload.caseTitle}: Converted to multi-team operation.`,
        type: 'case.raid_converted',
        metadata: {
          caseId: draft.payload.caseId,
          caseTitle: draft.payload.caseTitle,
          stage: draft.payload.stage,
          trigger: draft.payload.trigger,
        },
      }

    case 'agent.training_completed':
      return {
        content: `${draft.payload.agentName}: ${draft.payload.trainingName} completed.`,
        type: 'agent.training_completed',
        metadata: {
          agentId: draft.payload.agentId,
          agentName: draft.payload.agentName,
          trainingId: draft.payload.trainingId,
          queueId: draft.payload.queueId,
        },
      }

    case 'production.queue_completed':
      return {
        content: `${draft.payload.queueName}: fabrication completed. Produced ${formatProductionOutputLabel(draft.payload.outputQuantity, draft.payload.outputName)} from ${formatProductionMaterialSummary(draft.payload.inputMaterials)}.`,
        type: 'production.queue_completed',
        metadata: {
          queueId: draft.payload.queueId,
          queueName: draft.payload.queueName,
          recipeId: draft.payload.recipeId,
          outputId: draft.payload.outputId,
          outputQuantity: draft.payload.outputQuantity,
          fundingCost: draft.payload.fundingCost,
          materialsSummary: formatProductionMaterialSummary(draft.payload.inputMaterials),
        },
      }

    case 'market.shifted':
      return {
        content: `Market shift: ${getMarketPressureLabel(draft.payload.pressure)} conditions. Featured fabrication ${draft.payload.featuredRecipeName}.`,
        type: 'market.shifted',
        metadata: {
          featuredRecipeId: draft.payload.featuredRecipeId,
          pressure: draft.payload.pressure,
          costMultiplier: draft.payload.costMultiplier,
        },
      }

    case 'market.transaction_recorded':
      return {
        content: `Market ${draft.payload.action === 'buy' ? 'purchase' : 'sale'}: ${draft.payload.quantity}x ${draft.payload.itemName} for $${draft.payload.totalPrice}.`,
        type: 'market.transaction_recorded',
        metadata: {
          action: draft.payload.action,
          listingId: draft.payload.listingId,
          itemId: draft.payload.itemId,
          category: draft.payload.category,
          quantity: draft.payload.quantity,
          bundleCount: draft.payload.bundleCount,
          unitPrice: draft.payload.unitPrice,
          totalPrice: draft.payload.totalPrice,
          remainingAvailability: draft.payload.remainingAvailability,
        },
      }

    case 'faction.standing_changed':
      return {
        content: `${draft.payload.factionName}: standing ${formatSignedNumber(draft.payload.delta)} after ${draft.payload.caseTitle ?? 'recent operations'}.`,
        type: 'faction.standing_changed',
        metadata: {
          factionId: draft.payload.factionId,
          factionName: draft.payload.factionName,
          delta: draft.payload.delta,
          standingBefore: draft.payload.standingBefore,
          standingAfter: draft.payload.standingAfter,
          reason: draft.payload.reason,
          caseId: draft.payload.caseId ?? null,
          caseTitle: draft.payload.caseTitle ?? null,
        },
      }

    case 'system.recruitment_expired':
      return {
        content: `Recruitment pipeline expired ${draft.payload.count} candidate(s).`,
        type: 'system.recruitment_expired',
        metadata: {
          count: draft.payload.count,
        },
      }

    case 'system.recruitment_generated':
      return {
        content: `Recruitment pipeline generated ${draft.payload.count} candidate(s).`,
        type: 'system.recruitment_generated',
        metadata: {
          count: draft.payload.count,
        },
      }

    case 'recruitment.scouting_initiated':
      return {
        content: `Recruitment scouting opened on ${draft.payload.candidateName}. Projected ${draft.payload.projectedTier}-tier potential at ${draft.payload.confidence} confidence for $${draft.payload.fundingCost}.`,
        type: 'recruitment.scouting_initiated',
        metadata: {
          candidateId: draft.payload.candidateId,
          candidateName: draft.payload.candidateName,
          stage: draft.payload.stage,
          projectedTier: draft.payload.projectedTier,
          confidence: draft.payload.confidence,
          fundingCost: draft.payload.fundingCost,
          revealLevel: draft.payload.revealLevel,
        },
      }

    case 'recruitment.scouting_refined':
      return {
        content: `Recruitment scouting refined ${draft.payload.candidateName}. Projected ${draft.payload.projectedTier}-tier potential${draft.payload.previousProjectedTier && draft.payload.previousProjectedTier !== draft.payload.projectedTier ? ` updated from ${draft.payload.previousProjectedTier} tier` : ''} with ${draft.payload.confidence} confidence for $${draft.payload.fundingCost}.`,
        type: 'recruitment.scouting_refined',
        metadata: {
          candidateId: draft.payload.candidateId,
          candidateName: draft.payload.candidateName,
          stage: draft.payload.stage,
          projectedTier: draft.payload.projectedTier,
          confidence: draft.payload.confidence,
          fundingCost: draft.payload.fundingCost,
          revealLevel: draft.payload.revealLevel,
          previousProjectedTier: draft.payload.previousProjectedTier ?? null,
          previousConfidence: draft.payload.previousConfidence ?? null,
        },
      }

    case 'recruitment.intel_confirmed':
      return {
        content: `Recruitment deep scan confirmed ${draft.payload.candidateName} as ${draft.payload.confirmedTier ?? draft.payload.projectedTier}-tier potential for $${draft.payload.fundingCost}.`,
        type: 'recruitment.intel_confirmed',
        metadata: {
          candidateId: draft.payload.candidateId,
          candidateName: draft.payload.candidateName,
          stage: draft.payload.stage,
          projectedTier: draft.payload.projectedTier,
          confirmedTier: draft.payload.confirmedTier ?? draft.payload.projectedTier,
          confidence: draft.payload.confidence,
          fundingCost: draft.payload.fundingCost,
          revealLevel: draft.payload.revealLevel,
          previousProjectedTier: draft.payload.previousProjectedTier ?? null,
          previousConfidence: draft.payload.previousConfidence ?? null,
        },
      }

    case 'system.party_cards_drawn':
      return {
        content: `Party cards drawn: ${draft.payload.count}.`,
        type: 'system.party_cards_drawn',
        metadata: {
          count: draft.payload.count,
        },
      }

    case 'agency.containment_updated':
      return {
        content: `Agency posture updated: containment ${draft.payload.containmentRatingBefore}% -> ${draft.payload.containmentRatingAfter}%, funding $${draft.payload.fundingBefore} -> $${draft.payload.fundingAfter}.`,
        type: 'agency.containment_updated',
        metadata: {
          containmentDelta: draft.payload.containmentDelta,
          fundingDelta: draft.payload.fundingDelta,
          clearanceLevelAfter: draft.payload.clearanceLevelAfter,
        },
      }

    case 'directive.applied':
      return {
        content: `Directive applied: ${draft.payload.directiveLabel}. Effects activated for this week.`,
        type: 'directive.applied',
        metadata: {
          directiveId: draft.payload.directiveId,
          directiveLabel: draft.payload.directiveLabel,
        },
      }

    default:
      return null
  }
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`
}

function buildRewardMetadata(rewardBreakdown: MissionRewardBreakdown): ReportNoteMetadata {
  const inventoryTotals = getMissionRewardInventoryTotals(rewardBreakdown)

  return {
    fundingDelta: rewardBreakdown.fundingDelta,
    containmentDelta: rewardBreakdown.containmentDelta,
    reputationDelta: rewardBreakdown.reputationDelta,
    strategicValueDelta: rewardBreakdown.strategicValueDelta,
    materialRewardCount: inventoryTotals.materials,
    equipmentRewardCount: inventoryTotals.equipment,
    factionStandingNet: getMissionRewardFactionStandingNet(rewardBreakdown),
  }
}

function formatRewardSummary(rewardBreakdown: MissionRewardBreakdown) {
  const inventoryTotals = getMissionRewardInventoryTotals(rewardBreakdown)
  const summaryParts = [
    `Funding ${formatSignedNumber(rewardBreakdown.fundingDelta)}`,
    `Reputation ${formatSignedNumber(rewardBreakdown.reputationDelta)}`,
  ]

  if (inventoryTotals.materials > 0) {
    summaryParts.push(`Materials +${inventoryTotals.materials}`)
  }

  if (inventoryTotals.equipment > 0) {
    summaryParts.push(`Gear +${inventoryTotals.equipment}`)
  }

  if (rewardBreakdown.factionStanding.length > 0) {
    summaryParts.push(
      `Faction ${formatSignedNumber(getMissionRewardFactionStandingNet(rewardBreakdown))}`
    )
  }

  return `Rewards: ${summaryParts.join(', ')}.`
}

export function buildDeterministicReportNotesFromEventDrafts(
  drafts: AnyOperationEventDraft[],
  week: number,
  baseTimestamp?: number
) {
  let sequence = 0
  const notes: ReportNote[] = []

  for (const draft of drafts) {
    const reflected = buildReflectedReportNote(draft)

    if (!reflected) {
      continue
    }

    notes.push(
      createDeterministicReportNote(
        reflected.content,
        week,
        sequence,
        baseTimestamp,
        reflected.type,
        reflected.metadata
      )
    )
    sequence += 1
  }

  return notes
}

export function getHistoricalReportNoteDrafts(
  events: readonly OperationEvent[],
  week: number
): AnyOperationEventDraft[] {
  return events
    .filter(
      (event) => event.payload.week === week && HISTORICAL_REPORT_NOTE_EVENT_TYPES.has(event.type)
    )
    .map(
      (event) =>
        ({
          type: event.type,
          sourceSystem: event.sourceSystem,
          payload: event.payload,
        }) as AnyOperationEventDraft
    )
}
