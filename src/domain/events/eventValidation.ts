// Zod schemas for OperationEvent payloads and event validation utilities.
import { z } from 'zod'
import { getProductionRecipe } from '../../data/production'
import { getCanonicalMarketCostMultiplier, sanitizeFeaturedRecipeId } from '../market'
import { getLevelForXp } from '../progression'
import type { OperationEventType } from './types'

const idSchema = z.string().min(1)
const weekSchema = z.number().int().min(1)
const finiteNonNegativeIntSchema = z.number().finite().int().min(0)
const finitePositiveIntSchema = z.number().finite().int().min(1)
const finiteNonNegativeNumberSchema = z.number().finite().min(0)
const finiteNumberSchema = z.number().finite()
const finiteChemistryValueSchema = z.number().finite().min(-2).max(2)
const caseModeSchema = z.enum(['threshold', 'probability', 'deterministic', 'standard'])
const caseKindSchema = z.enum(['case', 'raid', 'standard', 'anomaly'])
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
    newRole: z
      .string()
      .refine((value) => value.length > 0 && value === value.trim(), {
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
    reason: z
      .string()
      .refine((value) => value.length > 0 && value === value.trim(), {
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

/** SPE-2664: catalog recipeId membership + outputId/outputName vs catalog product fields. */
function refineProductionQueueCatalogMembership(
  payload: { recipeId: string; outputId: string; outputName: string },
  context: z.RefinementCtx
) {
  // Reuse sanitizeFeaturedRecipeId membership (same PRODUCTION_RECIPE_IDS set as market.shifted).
  if (
    sanitizeFeaturedRecipeId(payload.recipeId, payload.recipeId) !== payload.recipeId
  ) {
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
      if (
        typeof catalogName === 'string' &&
        payload.featuredRecipeName.trim() !== catalogName
      ) {
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
    institutionKey: z.string().min(1),
  })
  .strict()

const marketEmergencyGrayMarketFalloutTickSchema = z
  .object({
    week: weekSchema,
    outcome: z.enum(['escalated_pending_oversight', 'resolved_closed']),
    falloutRiskBefore: z.enum(['risk', 'costly']),
    falloutRiskAfter: z.enum(['costly', 'none']),
    fundingBefore: finiteNumberSchema,
    fundingAfter: finiteNumberSchema,
    containmentRatingBefore: finiteNumberSchema,
    containmentRatingAfter: finiteNumberSchema,
    waiverPrecedentCount: z.number().int().min(1).max(50000),
    precedentPenaltyMultiplier: z.number().min(1).max(2),
    institutionKey: z.string().min(1),
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
    directiveId: z.string(),
    directiveLabel: z.string(),
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
    infiltrationAwareness: z.number().optional(),
    infiltrationProbeProgress: z.number().optional(),
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
  'recruitment.intel_confirmed': recruitmentScoutingSchema,
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
