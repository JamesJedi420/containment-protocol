// Zod schemas for OperationEvent payloads and event validation utilities.
import { z } from 'zod'
import { getProductionRecipe } from '../../data/production'
import { getCanonicalMarketCostMultiplier, sanitizeFeaturedRecipeId } from '../market'
import {
  getEmergencyWaiverFalloutPrecedentPenaltyMultiplier,
  getEmergencyWaiverFalloutStandingPenaltyScale,
} from '../procurementEmergencyFallout'
import { normalizeInstitutionKeyForAudit } from '../procurementEmergencyInstitution'
import { getLevelForXp } from '../progression'
import { createInitialFactionState, FACTION_DEFINITIONS } from '../factions'
import { EXACT_POTENTIAL_TIERS } from '../agentPotential'
import { getWeeklyDirectiveDefinition, isWeeklyDirectiveId } from '../directives'
import { CASE_KINDS, CASE_MODES } from '../models'
import type { OperationEventType } from './types'

const idSchema = z.string().min(1)
const weekSchema = z.number().int().min(1)
const finiteNonNegativeIntSchema = z.number().finite().int().min(0)
const finitePositiveIntSchema = z.number().finite().int().min(1)
const finiteNonNegativeNumberSchema = z.number().finite().min(0)
const finiteNumberSchema = z.number().finite()
const finiteChemistryValueSchema = z.number().finite().min(-2).max(2)
const factionStandingValueSchema = z.number().finite().int().min(-20).max(20)
const factionReputationValueSchema = z.number().finite().int().min(-100).max(100)
const trimmedNonblankTextSchema = z
  .string()
  .min(1)
  .refine((value) => value === value.trim(), {
    message: 'must be a trimmed nonblank string',
  })
const caseModeSchema = z.enum(CASE_MODES)
const caseKindSchema = z.enum(CASE_KINDS)
const caseStageSchema = finitePositiveIntSchema
const caseTeamIdsSchema = z.array(idSchema).transform((teamIds) => [...new Set(teamIds)])
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
const knownFactionDefinitionsById = new Map(
  FACTION_DEFINITIONS.map((faction) => [faction.id, faction] as const)
)
const knownFactionContactsByFactionId = new Map(
  Object.entries(createInitialFactionState()).map(([factionId, faction]) => [
    factionId,
    new Map((faction.contacts ?? []).map((contact) => [contact.id, contact] as const)),
  ])
)
const factionIdSchema = idSchema.refine((factionId) => knownFactionDefinitionsById.has(factionId), {
  message: 'factionId must reference a known faction',
})

const scoutingConfidenceSchema = z.enum(['low', 'medium', 'high', 'confirmed'])
const potentialTierSchema = z.enum(EXACT_POTENTIAL_TIERS)
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
    assignedTeamCount: finiteNonNegativeIntSchema,
    maxTeams: finitePositiveIntSchema,
  })
  .superRefine((payload, context) => {
    if (payload.assignedTeamCount > payload.maxTeams) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assignedTeamCount'],
        message: 'assignedTeamCount must be less than or equal to maxTeams',
      })
    }
  })
  .strict()

const assignmentTeamUnassignedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    teamId: idSchema,
    teamName: z.string(),
    remainingTeamCount: finiteNonNegativeIntSchema,
  })
  .strict()

const caseResolvedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: caseModeSchema,
    kind: caseKindSchema,
    stage: caseStageSchema,
    teamIds: caseTeamIdsSchema,
    performanceSummary: z.unknown().optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()

const casePartiallyResolvedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: caseModeSchema,
    kind: caseKindSchema,
    fromStage: caseStageSchema,
    toStage: caseStageSchema,
    teamIds: caseTeamIdsSchema,
    performanceSummary: z.unknown().optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.toStage < payload.fromStage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toStage'],
        message: 'toStage must be greater than or equal to fromStage',
      })
    }
  })

const caseFailedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: caseModeSchema,
    kind: caseKindSchema,
    fromStage: caseStageSchema,
    toStage: caseStageSchema,
    teamIds: caseTeamIdsSchema,
    performanceSummary: z.unknown().optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.toStage < payload.fromStage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toStage'],
        message: 'toStage must be greater than or equal to fromStage',
      })
    }
  })

const caseEscalatedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    fromStage: caseStageSchema,
    toStage: caseStageSchema,
    trigger: z.enum(['deadline', 'failure']),
    deadlineRemaining: finiteNonNegativeIntSchema,
    convertedToRaid: z.boolean(),
    neighborhoodPressureAuditTag: trimmedNonblankTextSchema.max(200).optional(),
    rewardBreakdown: z.unknown().optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.toStage < payload.fromStage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toStage'],
        message: 'toStage must be greater than or equal to fromStage',
      })
    }
  })

const caseSpawnedSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    templateId: z.string(),
    kind: z.string(),
    stage: caseStageSchema,
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
    stage: caseStageSchema,
    trigger: z.enum(['deadline', 'failure']),
    minTeams: finitePositiveIntSchema,
    maxTeams: finitePositiveIntSchema,
  })
  .superRefine((payload, context) => {
    if (payload.maxTeams < payload.minTeams) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxTeams'],
        message: 'maxTeams must be greater than or equal to minTeams',
      })
    }
  })
  .strict()

const caseAggregateBattleSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: caseModeSchema,
    kind: caseKindSchema,
    battleId: idSchema,
    roundsResolved: finiteNonNegativeIntSchema,
    winnerSideId: idSchema.nullable(),
    winnerLabel: z.string().min(1).nullable(),
    friendlyLabel: z.string().min(1),
    hostileLabel: z.string().min(1),
    movementDeniedCount: finiteNonNegativeIntSchema,
    friendlyRoutedCount: finiteNonNegativeIntSchema,
    hostileRoutedCount: finiteNonNegativeIntSchema,
    friendlyRoutedUnits: z.array(idSchema),
    hostileRoutedUnits: z.array(idSchema),
    specialDamageCount: finiteNonNegativeIntSchema,
    specialDamage: z.array(z.string().min(1)),
    parallelObjectiveId: idSchema.optional(),
    parallelObjectiveOutcome: z.enum(['success', 'partial', 'fail']).optional(),
    parallelObjectiveProgress: z.string().min(1).optional(),
    extractionRequired: z.boolean().optional(),
    extractionOutcome: z.enum(['not_required', 'secured', 'contested', 'overrun']).optional(),
    extractionPressure: z.enum(['low', 'medium', 'high']).optional(),
    extractionResidualThreatUnits: finiteNonNegativeIntSchema.optional(),
    ceasefireApplied: z.boolean().optional(),
    ceasefireObjectiveId: idSchema.optional(),
    ceasefireTacticalValue: z.enum(['temporary_manpower', 'specialist_knowledge']).optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.friendlyRoutedCount !== payload.friendlyRoutedUnits.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'friendlyRoutedCount must match friendlyRoutedUnits length',
        path: ['friendlyRoutedCount'],
      })
    }

    if (payload.hostileRoutedCount !== payload.hostileRoutedUnits.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'hostileRoutedCount must match hostileRoutedUnits length',
        path: ['hostileRoutedCount'],
      })
    }

    if (payload.specialDamageCount !== payload.specialDamage.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'specialDamageCount must match specialDamage length',
        path: ['specialDamageCount'],
      })
    }
  })

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

const trimmedNonblankStringSchema = z
  .string()
  .refine((value) => value.length > 0 && value === value.trim(), {
    message: 'must be a trimmed nonblank string',
  })

const agentTrainingStartedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    agentId: idSchema,
    agentName: z.string(),
    trainingId: trimmedNonblankStringSchema,
    trainingName: trimmedNonblankStringSchema,
    teamName: z.string().optional(),
    etaWeeks: finitePositiveIntSchema,
    fundingCost: finiteNonNegativeIntSchema,
  })
  .strict()

const agentTrainingCompletedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    agentId: idSchema,
    agentName: z.string(),
    trainingId: trimmedNonblankStringSchema,
    trainingName: trimmedNonblankStringSchema,
  })
  .strict()

const agentTrainingCancelledSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    trainingId: trimmedNonblankStringSchema,
    trainingName: trimmedNonblankStringSchema,
    refund: finiteNonNegativeIntSchema,
  })
  .strict()

const agentRelationshipChangedSchema = z
  .object({
    week: weekSchema,
    agentId: idSchema,
    agentName: z.string(),
    counterpartId: idSchema,
    counterpartName: z.string(),
    previousValue: finiteChemistryValueSchema,
    nextValue: finiteChemistryValueSchema,
    delta: finiteNumberSchema,
    reason: relationshipReasonSchema,
  })
  .strict()
  .superRefine((payload, context) => {
    const expectedDelta = Math.round((payload.nextValue - payload.previousValue) * 100) / 100

    if (payload.delta !== expectedDelta) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'delta must equal nextValue - previousValue (rounded to two decimals)',
        path: ['delta'],
      })
    }
  })

const instructorSpecialtySchema = z.enum(['combat', 'investigation', 'utility', 'social'])

const agentInstructorAssignmentFieldsSchema = z
  .object({
    week: weekSchema,
    staffId: idSchema,
    instructorName: z.string(),
    agentId: idSchema,
    agentName: z.string(),
    instructorSpecialty: instructorSpecialtySchema,
    bonus: finiteNonNegativeIntSchema,
  })
  .strict()

const agentInstructorAssignedSchema = agentInstructorAssignmentFieldsSchema
const agentInstructorUnassignedSchema = agentInstructorAssignmentFieldsSchema

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
    trustDamageDelta: finiteNonNegativeNumberSchema,
    trustDamageTotal: finiteNonNegativeNumberSchema,
    triggeredConsequences: z.array(externalChemistryConsequenceSchema),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.trustDamageTotal < payload.trustDamageDelta) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'trustDamageTotal must be greater than or equal to trustDamageDelta',
        path: ['trustDamageTotal'],
      })
    }
  })

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
    newRole: z.string().refine((value) => value.length > 0 && value === value.trim(), {
      message: 'newRole must be a trimmed nonblank string',
    }),
    previousLevel: finitePositiveIntSchema,
    newLevel: finitePositiveIntSchema,
    levelsGained: finiteNonNegativeIntSchema,
    skillPointsGranted: finiteNonNegativeIntSchema,
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.newLevel < payload.previousLevel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'newLevel must be greater than or equal to previousLevel',
        path: ['newLevel'],
      })
      return
    }

    const expectedLevelsGained = payload.newLevel - payload.previousLevel
    if (payload.levelsGained !== expectedLevelsGained) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `levelsGained must equal newLevel - previousLevel (${expectedLevelsGained})`,
        path: ['levelsGained'],
      })
    }
  })

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
    xpAmount: finiteNonNegativeIntSchema,
    reason: z.string().refine((value) => value.length > 0 && value === value.trim(), {
      message: 'reason must be a trimmed nonblank string',
    }),
    totalXp: finiteNonNegativeIntSchema,
    level: z.number().finite().int().min(1),
    levelsGained: finiteNonNegativeIntSchema,
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.totalXp < payload.xpAmount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'totalXp must be greater than or equal to xpAmount',
        path: ['totalXp'],
      })
      return
    }

    const derivedLevel = getLevelForXp(payload.totalXp)
    if (payload.level !== derivedLevel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `level must equal getLevelForXp(totalXp) (${derivedLevel})`,
        path: ['level'],
      })
    }

    const previousTotalXp = payload.totalXp - payload.xpAmount
    const expectedLevelsGained = derivedLevel - getLevelForXp(previousTotalXp)
    if (payload.levelsGained !== expectedLevelsGained) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `levelsGained must equal derived level delta (${expectedLevelsGained})`,
        path: ['levelsGained'],
      })
    }
  })

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
    fundingCost: finiteNonNegativeIntSchema,
    stage: z.number().int().min(1).max(3),
    projectedTier: potentialTierSchema,
    confidence: scoutingConfidenceSchema,
    previousProjectedTier: potentialTierSchema.optional(),
    previousConfidence: scoutingConfidenceSchema.optional(),
    confirmedTier: potentialTierSchema.optional(),
    revealLevel: z.number().finite().int().min(0).max(2),
    sourceFactionId: z.string().optional(),
    sourceFactionName: z.string().optional(),
    sourceContactId: z.string().optional(),
    sourceContactName: z.string().optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.stage === 1 && payload.revealLevel < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['revealLevel'],
        message: 'revealLevel must be at least 1 when stage is 1',
      })
    }

    if (payload.stage >= 2 && payload.revealLevel !== 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['revealLevel'],
        message: 'revealLevel must be 2 when stage is 2 or 3',
      })
    }
  })

const recruitmentIntelConfirmedSchema = recruitmentScoutingSchema.safeExtend({
  confirmedTier: potentialTierSchema,
})

/** SPE-2664: catalog recipeId membership + outputId/outputName vs catalog product fields. */
function refineProductionQueueCatalogMembership(
  payload: { recipeId: string; outputId: string; outputName: string },
  context: z.RefinementCtx
) {
  // Reuse sanitizeFeaturedRecipeId membership (same PRODUCTION_RECIPE_IDS set as market.shifted).
  if (sanitizeFeaturedRecipeId(payload.recipeId, payload.recipeId) !== payload.recipeId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'recipeId must be a production catalog recipe id',
      path: ['recipeId'],
    })
    return
  }

  const recipe = getProductionRecipe(payload.recipeId)
  if (!recipe) {
    return
  }

  // Producer contract: outputId/outputName are catalog outputItemId/outputItemName (not recipe id/name).
  if (payload.outputId !== recipe.outputItemId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `outputId must match catalog outputItemId for recipeId (${recipe.outputItemId})`,
      path: ['outputId'],
    })
  }

  if (payload.outputName.trim() !== recipe.outputItemName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `outputName must match catalog outputItemName for recipeId (${recipe.outputItemName})`,
      path: ['outputName'],
    })
  }
}

const productionQueueStartedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    queueName: z.string(),
    recipeId: z.string(),
    outputId: z.string(),
    outputName: z.string(),
    outputQuantity: finitePositiveIntSchema,
    etaWeeks: finitePositiveIntSchema,
    fundingCost: finiteNonNegativeIntSchema,
    inputMaterials: z.array(materialRequirementSchema),
  })
  .strict()
  .superRefine((payload, context) => {
    refineProductionQueueCatalogMembership(payload, context)
  })

const productionQueueCompletedSchema = z
  .object({
    week: weekSchema,
    queueId: idSchema,
    queueName: z.string(),
    recipeId: z.string(),
    outputId: z.string(),
    outputName: z.string(),
    outputQuantity: finitePositiveIntSchema,
    fundingCost: finiteNonNegativeIntSchema,
    inputMaterials: z.array(materialRequirementSchema),
  })
  .strict()
  .superRefine((payload, context) => {
    refineProductionQueueCatalogMembership(payload, context)
  })

const marketShiftedSchema = z
  .object({
    week: weekSchema,
    featuredRecipeId: z.string(),
    featuredRecipeName: z.string(),
    pressure: z.enum(['tight', 'stable', 'discounted']),
    costMultiplier: finiteNonNegativeNumberSchema,
  })
  .strict()
  .superRefine((payload, context) => {
    // SPE-2661: catalog membership + id↔name (reuse sanitizeFeaturedRecipeId membership).
    if (
      sanitizeFeaturedRecipeId(payload.featuredRecipeId, payload.featuredRecipeId) !==
      payload.featuredRecipeId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'featuredRecipeId must be a production catalog recipe id',
        path: ['featuredRecipeId'],
      })
    } else {
      const catalogName = getProductionRecipe(payload.featuredRecipeId)?.name
      if (typeof catalogName === 'string' && payload.featuredRecipeName.trim() !== catalogName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `featuredRecipeName must match catalog name for featuredRecipeId (${catalogName})`,
          path: ['featuredRecipeName'],
        })
      }
    }

    const canonicalCostMultiplier = getCanonicalMarketCostMultiplier(payload.pressure)
    if (payload.costMultiplier !== canonicalCostMultiplier) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `costMultiplier must equal canonical multiplier for pressure (${canonicalCostMultiplier})`,
        path: ['costMultiplier'],
      })
    }
  })

// SPE-2665: align with runTransfer hydrate clamps (SPE-2551/2552). Validate rejects;
// hydrate still clamps — do not drift these maxima without updating both sites.
const MARKET_PROCUREMENT_ALLOCATION_PRIORITY_MAX = 10
const MARKET_PROCUREMENT_ALLOCATION_DELAY_WEEKS_MAX = 52

const marketTransactionListingResourceStatusSchema = z
  .object({
    resourceClass: z.enum([
      'supplier_attention_slot',
      'reagent_stock',
      'licensed_handling_capacity',
    ]),
    sourceId: z.string().optional(),
    label: z.string().optional(),
    available: finiteNonNegativeIntSchema.optional(),
    capacity: finiteNonNegativeIntSchema.optional(),
    allocations: z.array(z.string()).optional(),
  })
  .passthrough()
  .superRefine((payload, context) => {
    if (
      payload.available !== undefined &&
      payload.capacity !== undefined &&
      payload.available > payload.capacity
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'available must be <= capacity when both are present',
        path: ['available'],
      })
    }
  })

const procurementAllocationSchema = z
  .object({
    allocationId: z.string(),
    resourceClass: z.enum([
      'supplier_attention_slot',
      'reagent_stock',
      'licensed_handling_capacity',
    ]),
    source: z.string(),
    sourceLabel: z.string(),
    destinationUse: z.string(),
    destinationLabel: z.string(),
    urgency: z.enum(['standard', 'contingency']),
    expectedBenefit: z.string(),
    priority: finiteNonNegativeIntSchema.max(MARKET_PROCUREMENT_ALLOCATION_PRIORITY_MAX),
    delayWeeks: finiteNonNegativeIntSchema.max(MARKET_PROCUREMENT_ALLOCATION_DELAY_WEEKS_MAX),
    displacedAlternativeUse: z.string().optional(),
    substitutionStatus: z.enum(['none', 'degraded_substitute']),
    substitutionSummary: z.string().optional(),
  })
  .strict()

const marketTransactionRecordedSchema = z
  .object({
    week: weekSchema,
    marketWeek: weekSchema,
    transactionId: z.string(),
    action: z.enum(['buy', 'sell', 'favor_exchange', 'callable_obligation', 'order', 'fulfill']),
    listingId: z.string(),
    itemId: z.string(),
    itemName: z.string(),
    category: z.enum(['equipment', 'component', 'material']),
    // SPE-2662: qty/bundle positive ints; prices finite nonnegative (cents allowed).
    quantity: finitePositiveIntSchema,
    bundleCount: finitePositiveIntSchema,
    unitPrice: finiteNonNegativeNumberSchema,
    totalPrice: finiteNonNegativeNumberSchema,
    remainingAvailability: finiteNonNegativeIntSchema,
    favorExchangeFactionId: z.string().optional(),
    favorExchangeFavorId: z.string().optional(),
    favorExchangeLabel: z.string().optional(),
    callableObligationFactionId: z.string().optional(),
    callableObligationFavorId: z.string().optional(),
    callableObligationLabel: z.string().optional(),
    listingResourceStatuses: z.array(marketTransactionListingResourceStatusSchema).optional(),
    allocation: procurementAllocationSchema.optional(),
    allocations: z.array(procurementAllocationSchema).optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    // Producer semantics (sim/market): quantity already includes bundles; unitPrice is
    // per-item rounded to cents. Rounding can accumulate ~1¢ per bundle vs totalPrice.
    // Compare in integer cents to avoid float edge cases (e.g. 8.33 * 9).
    const productCents = Math.round(payload.unitPrice * payload.quantity * 100)
    const totalCents = Math.round(payload.totalPrice * 100)
    // Finite schema fields can still overflow the cent product to Infinity.
    if (!Number.isFinite(productCents) || !Number.isFinite(totalCents)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'totalPrice / unitPrice*quantity must stay within finite cent precision',
        path: ['totalPrice'],
      })
      return
    }
    const maxDriftCents = Math.max(1, payload.bundleCount)
    if (Math.abs(totalCents - productCents) > maxDriftCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `totalPrice must equal unitPrice * quantity within ${maxDriftCents} cent(s) (expected ~${productCents / 100})`,
        path: ['totalPrice'],
      })
    }
  })

const marketEmergencyGrayMarketWaiverGrantedSchema = z
  .object({
    week: weekSchema,
    marketWeek: weekSchema,
    crisisPressureScore: finiteNonNegativeIntSchema,
    sanctionLevel: z.literal('sanctioned'),
    packetId: z.literal('gray_market_broker'),
    falloutRiskApplied: z.literal('risk'),
    waiverPrecedentCount: z.number().int().min(1).max(50000),
    institutionKey: z.string().min(1),
    authorityRoute: z.string().min(1),
    authorityBasis: z.string().min(1),
    regulatoryArbitrageSignal: z.enum(['none', 'cross_institution_clearance_route']),
    ruleConflictSignal: z.enum(['none', 'sanctioned_procurement_vs_crisis_waiver']),
  })
  .strict()

const marketEmergencyGrayMarketWaiverAccountabilityClosedSchema = z
  .object({
    week: weekSchema,
    waiverGrantWeek: weekSchema,
    institutionKey: z
      .string()
      .min(1)
      .refine((value) => value === normalizeInstitutionKeyForAudit(value), {
        message: 'institutionKey must be a normalized nonblank audit key',
      }),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.week !== payload.waiverGrantWeek + 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'week must be exactly one campaign week after waiverGrantWeek',
        path: ['week'],
      })
    }
  })

const marketEmergencyGrayMarketFalloutTickSchema = z
  .object({
    week: weekSchema,
    outcome: z.enum(['escalated_pending_oversight', 'resolved_closed']),
    falloutRiskBefore: z.enum(['risk', 'costly']),
    falloutRiskAfter: z.enum(['costly', 'none']),
    fundingBefore: finiteNonNegativeNumberSchema,
    fundingAfter: finiteNonNegativeNumberSchema,
    containmentRatingBefore: finiteNonNegativeNumberSchema,
    containmentRatingAfter: finiteNonNegativeNumberSchema,
    waiverPrecedentCount: z.number().int().min(1).max(50000),
    precedentPenaltyMultiplier: z.number().finite(),
    rankingScore: z.number().int().min(0).max(100),
    standingFalloutPenaltyScale: z.number().finite(),
    institutionKey: z
      .string()
      .min(1)
      .refine((value) => value === normalizeInstitutionKeyForAudit(value), {
        message: 'institutionKey must be a normalized nonblank audit key',
      }),
  })
  .strict()
  .superRefine((payload, context) => {
    const expectedRisk =
      payload.outcome === 'resolved_closed'
        ? { before: 'costly', after: 'none' }
        : { before: 'risk', after: 'costly' }

    if (
      payload.falloutRiskBefore !== expectedRisk.before ||
      payload.falloutRiskAfter !== expectedRisk.after
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fallout risk transition must match outcome',
        path: ['falloutRiskAfter'],
      })
    }

    if (
      payload.fundingAfter > payload.fundingBefore ||
      (payload.fundingBefore > 0 && payload.fundingAfter === payload.fundingBefore)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fundingAfter must decrease when fundingBefore is positive',
        path: ['fundingAfter'],
      })
    }

    if (
      payload.containmentRatingAfter > payload.containmentRatingBefore ||
      (payload.containmentRatingBefore > 0 &&
        payload.containmentRatingAfter === payload.containmentRatingBefore)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'containmentRatingAfter must decrease when containmentRatingBefore is positive',
        path: ['containmentRatingAfter'],
      })
    }

    const expectedMultiplier = getEmergencyWaiverFalloutPrecedentPenaltyMultiplier(
      payload.waiverPrecedentCount
    )
    if (payload.precedentPenaltyMultiplier !== expectedMultiplier) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `precedentPenaltyMultiplier must equal ${expectedMultiplier} for waiverPrecedentCount`,
        path: ['precedentPenaltyMultiplier'],
      })
    }

    const expectedStandingScale = getEmergencyWaiverFalloutStandingPenaltyScale(
      payload.rankingScore
    )
    if (payload.standingFalloutPenaltyScale !== expectedStandingScale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `standingFalloutPenaltyScale must equal ${expectedStandingScale} for rankingScore`,
        path: ['standingFalloutPenaltyScale'],
      })
    }
  })

const factionStandingChangedSchema = z
  .object({
    week: weekSchema,
    factionId: factionIdSchema,
    factionName: z.string(),
    delta: z.number().finite().int(),
    standingBefore: factionStandingValueSchema,
    standingAfter: factionStandingValueSchema,
    reputationBefore: factionReputationValueSchema.optional(),
    reputationAfter: factionReputationValueSchema.optional(),
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
    contactRelationshipBefore: factionReputationValueSchema.optional(),
    contactRelationshipAfter: factionReputationValueSchema.optional(),
    contactDelta: z.number().finite().int().optional(),
  })
  .superRefine((payload, context) => {
    const deltaMatchesTransition = (
      before: number,
      after: number,
      delta: number,
      minimum: number,
      maximum: number
    ) => after === Math.min(maximum, Math.max(minimum, before + delta))

    const deltaMatches =
      payload.reason === 'recruitment.hired' &&
      payload.reputationBefore !== undefined &&
      payload.reputationAfter !== undefined
        ? deltaMatchesTransition(
            payload.reputationBefore,
            payload.reputationAfter,
            payload.delta,
            -100,
            100
          )
        : deltaMatchesTransition(
            payload.standingBefore,
            payload.standingAfter,
            payload.delta,
            -20,
            20
          )

    if (!deltaMatches) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delta'],
        message: 'delta must produce the bounded standing or reputation transition',
      })
    }

    const contactValues = [
      payload.contactRelationshipBefore,
      payload.contactRelationshipAfter,
      payload.contactDelta,
    ]
    const providedContactValues = contactValues.filter((value) => value !== undefined)
    if (providedContactValues.length > 0 && providedContactValues.length < contactValues.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactDelta'],
        message: 'contact relationship fields must all be present together',
      })
      return
    }

    if (
      payload.contactRelationshipBefore !== undefined &&
      payload.contactRelationshipAfter !== undefined &&
      payload.contactDelta !== undefined &&
      !deltaMatchesTransition(
        payload.contactRelationshipBefore,
        payload.contactRelationshipAfter,
        payload.contactDelta,
        -100,
        100
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactDelta'],
        message: 'contactDelta must produce the bounded contact relationship transition',
      })
    }
  })
  .strict()

const factionUnlockAvailableSchema = z
  .object({
    week: weekSchema,
    factionId: factionIdSchema,
    factionName: trimmedNonblankTextSchema,
    contactId: idSchema.optional(),
    contactName: trimmedNonblankTextSchema.optional(),
    label: trimmedNonblankTextSchema.max(120),
    summary: trimmedNonblankTextSchema.max(500),
    disposition: z.enum(['supportive', 'adversarial']),
  })
  .superRefine((payload, context) => {
    const definition = knownFactionDefinitionsById.get(payload.factionId)
    if (!definition) return

    if (payload.factionName !== definition.name && payload.factionName !== definition.label) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['factionName'],
        message: 'factionName must match the catalog name or label for factionId',
      })
    }

    if (!payload.contactId) {
      if (payload.contactName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactName'],
          message: 'contactName requires contactId',
        })
      }
      return
    }

    const contact = knownFactionContactsByFactionId.get(payload.factionId)?.get(payload.contactId)
    if (!contact) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactId'],
        message: 'contactId must reference a known contact for factionId',
      })
      return
    }

    if (payload.contactName && contact.name && payload.contactName !== contact.name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactName'],
        message: 'contactName must match the catalog contact name for contactId',
      })
    }
  })
  .strict()

const agencyContainmentUpdatedSchema = z
  .object({
    week: weekSchema,
    containmentRatingBefore: finiteNumberSchema,
    containmentRatingAfter: finiteNumberSchema,
    containmentDelta: finiteNumberSchema,
    clearanceLevelBefore: finiteNonNegativeIntSchema,
    clearanceLevelAfter: finiteNonNegativeIntSchema,
    fundingBefore: finiteNumberSchema,
    fundingAfter: finiteNumberSchema,
    fundingDelta: finiteNumberSchema,
  })
  .strict()

const directiveAppliedSchema = z
  .object({
    week: weekSchema,
    directiveId: trimmedNonblankTextSchema,
    directiveLabel: trimmedNonblankTextSchema,
  })
  .superRefine((payload, context) => {
    if (!isWeeklyDirectiveId(payload.directiveId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['directiveId'],
        message: 'directiveId must reference a known weekly directive',
      })
      return
    }

    const definition = getWeeklyDirectiveDefinition(payload.directiveId)
    if (payload.directiveLabel !== definition?.label) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['directiveLabel'],
        message: 'directiveLabel must match the catalog label for directiveId',
      })
    }
  })
  .strict()

const supportShortfallSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    remainingSupport: z.number(),
  })
  .strict()

const infiltrationProbeEventSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    summary: z.string(),
    infiltrationAwareness: finiteNumberSchema.optional(),
    infiltrationProbeProgress: finiteNumberSchema.optional(),
    infiltrationStage: z.enum(['probing', 'exposed', 'violent']).optional(),
    probeAction: z.enum(['probe_access', 'probe_route', 'cleanup']).optional(),
    probeActionSource: z.enum(['override', 'authored', 'heuristic']).optional(),
    coverRole: z
      .enum(['uniform_guard', 'civilian_staff', 'courier', 'maintenance', 'official_inspector'])
      .optional(),
    leaveBehindId: z.string().optional(),
    leaveBehindLabel: z.string().optional(),
  })
  .strict()

const concealmentActivatedEventSchema = z
  .object({
    week: weekSchema,
    caseId: idSchema,
    caseTitle: z.string(),
    mode: z.enum(['hidden', 'displaced']),
    reason: z.string(),
    summary: z.string(),
    detectionConfidence: z.number().optional(),
    displacementTarget: idSchema.nullable().optional(),
  })
  .strict()

const systemAcademyUpgradedSchema = z
  .object({
    week: weekSchema,
    tierBefore: finiteNonNegativeIntSchema,
    tierAfter: finiteNonNegativeIntSchema,
    fundingBefore: finiteNumberSchema,
    fundingAfter: finiteNumberSchema,
    cost: finiteNonNegativeIntSchema,
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
  'recruitment.intel_confirmed': recruitmentIntelConfirmedSchema,
  'production.queue_started': productionQueueStartedSchema,
  'production.queue_completed': productionQueueCompletedSchema,
  'market.shifted': marketShiftedSchema,
  'market.transaction_recorded': marketTransactionRecordedSchema,
  'market.emergency_gray_market_waiver_granted': marketEmergencyGrayMarketWaiverGrantedSchema,
  'market.emergency_gray_market_waiver_accountability_closed':
    marketEmergencyGrayMarketWaiverAccountabilityClosedSchema,
  'market.emergency_gray_market_fallout_tick': marketEmergencyGrayMarketFalloutTickSchema,
  'faction.standing_changed': factionStandingChangedSchema,
  'faction.unlock_available': factionUnlockAvailableSchema,
  'agency.containment_updated': agencyContainmentUpdatedSchema,
  'agency.front_business.opened': z.object({
    week: z.number(),
    kind: z.literal('courierShell'),
    startupCost: finiteNonNegativeIntSchema,
    fundingBefore: finiteNumberSchema,
    fundingAfter: finiteNumberSchema,
  }),
  'agency.front_business.resolved': z.object({
    week: z.number(),
    kind: z.literal('courierShell'),
    statusBefore: z.enum(['active', 'strained', 'collapsed']),
    statusAfter: z.enum(['active', 'strained', 'collapsed']),
    fundingDelta: finiteNumberSchema.min(-10_000),
    riskScore: finiteNonNegativeIntSchema,
    lockoutCount: finiteNonNegativeIntSchema,
    residueCount: finiteNonNegativeIntSchema,
    budgetPressure: finiteNonNegativeIntSchema,
  }),
  'directive.applied': directiveAppliedSchema,
  'support.shortfall': supportShortfallSchema,
  'infiltration.awareness_complication': infiltrationProbeEventSchema,
  'infiltration.escalation_exposed': infiltrationProbeEventSchema,
  'infiltration.escalation_violent': infiltrationProbeEventSchema,
  'infiltration.cover_strain': infiltrationProbeEventSchema,
  'infiltration.weekly_encounter': infiltrationProbeEventSchema,
  'infiltration.leave_behind_tradeoff': infiltrationProbeEventSchema,
  'concealment.activated': concealmentActivatedEventSchema,
  'system.academy_upgraded': systemAcademyUpgradedSchema,
  'system.equipment_recovered': z.object({}).passthrough(),
  'case.aggregate_battle': caseAggregateBattleSchema,
  'staff.coping.applied': z.object({
    week: z.number(),
    agentId: z.string(),
    streak: z.number(),
    policy: z.enum(['permitted', 'restricted', 'prohibited']),
  }),
  'staff.coping.misconduct': z.object({
    week: z.number(),
    agentId: z.string(),
    policy: z.enum(['restricted', 'prohibited']),
  }),
  'staff.side_work.resolved': z.object({
    week: z.number(),
    agentId: z.string(),
    optionId: z.enum(['offBooksCourier', 'trustedCourier']),
    outcome: z.enum(['paid', 'lockout']),
    fundingDelta: finiteNumberSchema.min(-10_000),
    fatigueDelta: finiteNumberSchema.min(-100),
  }),
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
