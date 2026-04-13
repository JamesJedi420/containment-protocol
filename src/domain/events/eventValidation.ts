// Zod schemas for OperationEvent payloads and event validation utilities.
import { z } from 'zod'
import type { OperationEventType } from './types'

const idSchema = z.string().min(1)
const weekSchema = z.number().int().min(1)
const nonNegativeIntSchema = z.number().int().min(0)
const relationshipReasonSchema = z.enum([
  'mission_success',
  'mission_partial',
  'mission_fail',
  'passive_drift',
  'external_event',
  'reconciliation',
  'spontaneous_event',
  'betrayal',
])

const scoutingConfidenceSchema = z.enum(['low', 'medium', 'high', 'confirmed'])
const externalChemistryConsequenceSchema = z.enum([
  'benching',
  'performance_penalty',
  'disciplinary',
  'resignation',
])

const materialRequirementSchema = z
  .object({
    materialId: z.string(),
    materialName: z.string(),
    quantity: z.number(),
  })
  .strict()

const assignmentTeamAssignedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    caseKind: z.string(),
    teamId: idSchema,
    teamName: z.string(),
    assignedTeamCount: z.number(),
    maxTeams: z.number(),
  })
  .strict()

const assignmentTeamUnassignedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    teamId: idSchema,
    teamName: z.string(),
    remainingTeamCount: z.number(),
  })
  .strict()

const caseResolvedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: z.string(),
    kind: z.string(),
    stage: z.number(),
    teamIds: z.array(idSchema),
    performanceSummary: z.unknown().optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()

const casePartiallyResolvedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: z.string(),
    kind: z.string(),
    fromStage: z.number(),
    toStage: z.number(),
    teamIds: z.array(idSchema),
    performanceSummary: z.unknown().optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()

const caseFailedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: z.string(),
    kind: z.string(),
    fromStage: z.number(),
    toStage: z.number(),
    teamIds: z.array(idSchema),
    performanceSummary: z.unknown().optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()

const caseEscalatedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    fromStage: z.number(),
    toStage: z.number(),
    trigger: z.enum(['deadline', 'failure']),
    deadlineRemaining: z.number(),
    convertedToRaid: z.boolean(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()

const caseSpawnedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    templateId: z.string(),
    kind: z.string(),
    stage: z.number(),
    trigger: z.enum([
      'failure',
      'unresolved',
      'raid_pressure',
      'world_activity',
      'faction_offer',
      'faction_pressure',
      'pressure_threshold',
    ]),
    parentCaseId: idSchema.optional(),
    parentCaseTitle: z.string().optional(),
    factionId: z.string().optional(),
    factionLabel: z.string().optional(),
    sourceReason: z.string().optional(),
  })
  .strict()

const caseRaidConvertedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    stage: z.number(),
    trigger: z.enum(['deadline', 'failure']),
    minTeams: z.number(),
    maxTeams: z.number(),
  })
  .strict()

const intelReportGeneratedSchema = z
  .object({
    week: weekSchema,
    resolvedCount: z.number(),
    failedCount: z.number(),
    partialCount: z.number(),
    unresolvedCount: z.number(),
    spawnedCount: z.number(),
    noteCount: z.number(),
    score: z.number(),
  })
  .strict()

const agentTrainingStartedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    agentId: idSchema,
    agentName: z.string(),
    trainingId: z.string(),
    trainingName: z.string(),
    teamName: z.string().optional(),
    etaWeeks: z.number(),
    fundingCost: z.number(),
  })
  .strict()

const agentTrainingCompletedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    agentId: idSchema,
    agentName: z.string(),
    trainingId: z.string(),
    trainingName: z.string(),
  })
  .strict()

const agentTrainingCancelledSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    trainingId: z.string(),
    trainingName: z.string(),
    refund: z.number(),
  })
  .strict()

const agentRelationshipChangedSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    counterpartId: idSchema,
    counterpartName: z.string(),
    previousValue: z.number(),
    nextValue: z.number(),
    delta: z.number(),
    reason: relationshipReasonSchema,
  })
  .strict()

const agentInstructorAssignedSchema = z
  .object({
    week: weekSchema,
    staffId: idSchema,
    instructorName: z.string(),
    agentId: idSchema,
    agentName: z.string(),
    instructorSpecialty: z.string(),
    bonus: z.number(),
  })
  .strict()

const agentInstructorUnassignedSchema = z
  .object({
    week: weekSchema,
    staffId: idSchema,
    instructorName: z.string(),
    agentId: idSchema,
    agentName: z.string(),
    instructorSpecialty: z.string(),
    bonus: z.number(),
  })
  .strict()

const agentInjuredSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    severity: z.string(),
  })
  .strict()

const agentKilledSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    caseId: idSchema,
    caseTitle: z.string(),
  })
  .strict()

const agentBetrayedSchema = z
  .object({
    week: weekSchema,
    betrayerId: idSchema,
    betrayerName: z.string(),
    betrayedId: idSchema,
    betrayedName: z.string(),
    trustDamageDelta: z.number(),
    trustDamageTotal: z.number(),
    triggeredConsequences: z.array(externalChemistryConsequenceSchema),
  })
  .strict()

const agentResignedSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    reason: z.literal('trust_failure_cumulative'),
    counterpartId: idSchema.optional(),
    counterpartName: z.string().optional(),
  })
  .strict()

const agentPromotedSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    newRole: z.string(),
    previousLevel: z.number(),
    newLevel: z.number(),
    levelsGained: z.number(),
    skillPointsGranted: z.number(),
  })
  .strict()

const agentHiredSchema = z
  .object({
    week: weekSchema,
    candidateId: idSchema,
    agentId: idSchema,
    agentName: z.string(),
    recruitCategory: z.string(),
    sourceFactionId: z.string().optional(),
    sourceFactionName: z.string().optional(),
    sourceContactId: z.string().optional(),
    sourceContactName: z.string().optional(),
  })
  .strict()

const progressionXpGainedSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    xpAmount: z.number(),
    reason: z.string(),
    totalXp: z.number(),
    level: z.number(),
    levelsGained: z.number(),
  })
  .strict()

const systemRecruitmentExpiredSchema = z
  .object({
    week: weekSchema,
    count: z.number(),
  })
  .strict()

const systemRecruitmentGeneratedSchema = z
  .object({
    week: weekSchema,
    count: z.number(),
  })
  .strict()

const systemPartyCardsDrawnSchema = z
  .object({
    week: weekSchema,
    count: z.number(),
  })
  .strict()

const recruitmentScoutingSchema = z
  .object({
    week: weekSchema,
    candidateId: idSchema,
    candidateName: z.string(),
    fundingCost: z.number(),
    stage: z.number().int().min(1).max(3),
    projectedTier: z.string(),
    confidence: scoutingConfidenceSchema,
    previousProjectedTier: z.string().optional(),
    previousConfidence: scoutingConfidenceSchema.optional(),
    confirmedTier: z.string().optional(),
    revealLevel: z.number(),
    sourceFactionId: z.string().optional(),
    sourceFactionName: z.string().optional(),
    sourceContactId: z.string().optional(),
    sourceContactName: z.string().optional(),
  })
  .strict()

const productionQueueStartedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    queueName: z.string(),
    recipeId: z.string(),
    outputId: z.string(),
    outputName: z.string(),
    outputQuantity: z.number(),
    etaWeeks: z.number(),
    fundingCost: z.number(),
    inputMaterials: z.array(materialRequirementSchema),
  })
  .strict()

const productionQueueCompletedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    queueName: z.string(),
    recipeId: z.string(),
    outputId: z.string(),
    outputName: z.string(),
    outputQuantity: z.number(),
    fundingCost: z.number(),
    inputMaterials: z.array(materialRequirementSchema),
  })
  .strict()

const marketShiftedSchema = z
  .object({
    week: weekSchema,
    featuredRecipeId: z.string(),
    featuredRecipeName: z.string(),
    pressure: z.enum(['tight', 'stable', 'discounted']),
    costMultiplier: z.number(),
  })
  .strict()

const marketTransactionRecordedSchema = z
  .object({
    week: weekSchema,
    marketWeek: weekSchema,
    transactionId: z.string(),
    action: z.enum(['buy', 'sell']),
    listingId: z.string(),
    itemId: z.string(),
    itemName: z.string(),
    category: z.enum(['equipment', 'component', 'material']),
    quantity: z.number(),
    bundleCount: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    remainingAvailability: z.number(),
  })
  .strict()

const factionStandingChangedSchema = z
  .object({
    week: weekSchema,
    factionId: z.string(),
    factionName: z.string(),
    delta: z.number(),
    standingBefore: z.number(),
    standingAfter: z.number(),
    reputationBefore: z.number().optional(),
    reputationAfter: z.number().optional(),
    reason: z.enum([
      'case.resolved',
      'case.partially_resolved',
      'case.failed',
      'case.escalated',
      'recruitment.hired',
    ]),
    caseId: idSchema.optional(),
    caseTitle: z.string().optional(),
    interactionLabel: z.string().optional(),
    contactId: z.string().optional(),
    contactName: z.string().optional(),
    contactRelationshipBefore: z.number().optional(),
    contactRelationshipAfter: z.number().optional(),
    contactDelta: z.number().optional(),
  })
  .strict()

const factionUnlockAvailableSchema = z
  .object({
    week: weekSchema,
    factionId: z.string(),
    factionName: z.string(),
    contactId: z.string().optional(),
    contactName: z.string().optional(),
    label: z.string(),
    summary: z.string(),
    disposition: z.enum(['supportive', 'adversarial']),
  })
  .strict()

const agencyContainmentUpdatedSchema = z
  .object({
    week: weekSchema,
    containmentRatingBefore: z.number(),
    containmentRatingAfter: z.number(),
    containmentDelta: z.number(),
    clearanceLevelBefore: z.number(),
    clearanceLevelAfter: z.number(),
    fundingBefore: z.number(),
    fundingAfter: z.number(),
    fundingDelta: z.number(),
  })
  .strict()

const directiveAppliedSchema = z
  .object({
    week: weekSchema,
    directiveId: z.string(),
    directiveLabel: z.string(),
  })
  .strict()

const systemAcademyUpgradedSchema = z
  .object({
    week: weekSchema,
    tierBefore: nonNegativeIntSchema,
    tierAfter: nonNegativeIntSchema,
    fundingBefore: z.number(),
    fundingAfter: z.number(),
    cost: z.number(),
  })
  .strict()

export const operationEventPayloadSchemas = {
  'assignment.team_assigned': assignmentTeamAssignedSchema,
  'assignment.team_unassigned': assignmentTeamUnassignedSchema,
  'case.resolved': caseResolvedSchema,
  'case.partially_resolved': casePartiallyResolvedSchema,
  'case.failed': caseFailedSchema,
  'case.escalated': caseEscalatedSchema,
  'case.spawned': caseSpawnedSchema,
  'case.raid_converted': caseRaidConvertedSchema,
  'intel.report_generated': intelReportGeneratedSchema,
  'agent.training_started': agentTrainingStartedSchema,
  'agent.training_completed': agentTrainingCompletedSchema,
  'agent.training_cancelled': agentTrainingCancelledSchema,
  'agent.relationship_changed': agentRelationshipChangedSchema,
  'agent.instructor_assigned': agentInstructorAssignedSchema,
  'agent.instructor_unassigned': agentInstructorUnassignedSchema,
  'agent.injured': agentInjuredSchema,
  'agent.killed': agentKilledSchema,
  'agent.betrayed': agentBetrayedSchema,
  'agent.resigned': agentResignedSchema,
  'agent.promoted': agentPromotedSchema,
  'agent.hired': agentHiredSchema,
  'progression.xp_gained': progressionXpGainedSchema,
  'system.recruitment_expired': systemRecruitmentExpiredSchema,
  'system.recruitment_generated': systemRecruitmentGeneratedSchema,
  'system.party_cards_drawn': systemPartyCardsDrawnSchema,
  'recruitment.scouting_initiated': recruitmentScoutingSchema,
  'recruitment.scouting_refined': recruitmentScoutingSchema,
  'recruitment.intel_confirmed': recruitmentScoutingSchema,
  'production.queue_started': productionQueueStartedSchema,
  'production.queue_completed': productionQueueCompletedSchema,
  'market.shifted': marketShiftedSchema,
  'market.transaction_recorded': marketTransactionRecordedSchema,
  'faction.standing_changed': factionStandingChangedSchema,
  'faction.unlock_available': factionUnlockAvailableSchema,
  'agency.containment_updated': agencyContainmentUpdatedSchema,
  'directive.applied': directiveAppliedSchema,
  'system.academy_upgraded': systemAcademyUpgradedSchema,
} satisfies Record<OperationEventType, z.ZodTypeAny>

export function validateOperationEventPayload<TType extends OperationEventType>(
  type: TType,
  payload: unknown
): { success: boolean; error?: string } {
  const result = operationEventPayloadSchemas[type].safeParse(payload)
  if (result.success) {
    return { success: true }
  }

  return { success: false, error: result.error.message }
}
