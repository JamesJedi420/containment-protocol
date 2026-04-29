import type {
  AgentRole,
  CandidateScoutStage,
  CaseKind,
  CaseMode,
  ExactPotentialTier,
  Id,
  MarketPressure,
  MissionRewardBreakdown,
  PotentialIntelConfidence,
  PerformanceMetricSummary,
  ProductionMaterialRequirement,
  RecruitCategory,
  StatKey,
  WeeklyDirectiveId,
} from '../models'

export type OperationEventSourceSystem =
  | 'assignment'
  | 'incident'
  | 'intel'
  | 'agent'
  | 'production'
  | 'faction'
  | 'system'

export type CaseEscalationTrigger = 'deadline' | 'failure'
export type CaseSpawnTrigger =
  | 'failure'
  | 'unresolved'
  | 'raid_pressure'
  | 'world_activity'
  | 'faction_offer'
  | 'faction_pressure'
  | 'pressure_threshold'

export interface OperationEventPayloadMap {
  'system.equipment_recovered': {
    week: number
    content: string
    recovered: string[]
    delayed: string[]
    maintenanceCapacity: number
    damagedCount: number
  }
  'assignment.team_assigned': {
    week: number
    caseId: Id
    caseTitle: string
    caseKind: CaseKind
    teamId: Id
    teamName: string
    assignedTeamCount: number
    maxTeams: number
  }
  'assignment.team_unassigned': {
    week: number
    caseId: Id
    caseTitle: string
    teamId: Id
    teamName: string
    remainingTeamCount: number
  }
  'case.resolved': {
    week: number
    caseId: Id
    caseTitle: string
    mode: CaseMode
    kind: CaseKind
    stage: number
    teamIds: Id[]
    performanceSummary?: PerformanceMetricSummary
    rewardBreakdown?: MissionRewardBreakdown
  }
  'case.partially_resolved': {
    week: number
    caseId: Id
    caseTitle: string
    mode: CaseMode
    kind: CaseKind
    fromStage: number
    toStage: number
    teamIds: Id[]
    performanceSummary?: PerformanceMetricSummary
    rewardBreakdown?: MissionRewardBreakdown
  }
  'case.failed': {
    week: number
    caseId: Id
    caseTitle: string
    mode: CaseMode
    kind: CaseKind
    fromStage: number
    toStage: number
    teamIds: Id[]
    performanceSummary?: PerformanceMetricSummary
    rewardBreakdown?: MissionRewardBreakdown
  }
  'case.escalated': {
    week: number
    caseId: Id
    caseTitle: string
    fromStage: number
    toStage: number
    trigger: CaseEscalationTrigger
    deadlineRemaining: number
    convertedToRaid: boolean
    rewardBreakdown?: MissionRewardBreakdown
  }
  'case.spawned': {
    week: number
    caseId: Id
    caseTitle: string
    templateId: string
    kind: CaseKind
    stage: number
    trigger: CaseSpawnTrigger
    parentCaseId?: Id
    parentCaseTitle?: string
    factionId?: string
    factionLabel?: string
    sourceReason?: string
  }
  'case.raid_converted': {
    week: number
    caseId: Id
    caseTitle: string
    stage: number
    trigger: CaseEscalationTrigger
    minTeams: number
    maxTeams: number
  }
  'case.aggregate_battle': {
    week: number
    caseId: Id
    caseTitle: string
    mode: CaseMode
    kind: CaseKind
    battleId: string
    roundsResolved: number
    winnerSideId: string | null
    winnerLabel: string | null
    friendlyLabel: string
    hostileLabel: string
    movementDeniedCount: number
    friendlyRoutedCount: number
    hostileRoutedCount: number
    friendlyRoutedUnits: string[]
    hostileRoutedUnits: string[]
    specialDamageCount: number
    specialDamage: string[]
    parallelObjectiveId?: string
    parallelObjectiveOutcome?: 'success' | 'partial' | 'fail'
    parallelObjectiveProgress?: string
    extractionRequired?: boolean
    extractionOutcome?: 'not_required' | 'secured' | 'contested' | 'overrun'
    extractionPressure?: 'low' | 'medium' | 'high'
    extractionResidualThreatUnits?: number
    ceasefireApplied?: boolean
    ceasefireObjectiveId?: string
    ceasefireTacticalValue?: 'temporary_manpower' | 'specialist_knowledge'
  }
  'intel.report_generated': {
    week: number
    resolvedCount: number
    failedCount: number
    partialCount: number
    unresolvedCount: number
    spawnedCount: number
    noteCount: number
    score: number
  }
  'agent.training_started': {
    week: number
    queueId: Id
    agentId: Id
    agentName: string
    trainingId: string
    trainingName: string
    teamName?: string
    etaWeeks: number
    fundingCost: number
  }
  'agent.training_completed': {
    week: number
    queueId: Id
    agentId: Id
    agentName: string
    trainingId: string
    trainingName: string
  }
  'agent.training_cancelled': {
    week: number
    agentId: Id
    agentName: string
    trainingId: string
    trainingName: string
    refund: number
  }
  'agent.relationship_changed': {
    week: number
    agentId: Id
    agentName: string
    counterpartId: Id
    counterpartName: string
    previousValue: number
    nextValue: number
    delta: number
    reason:
      | 'mission_success'
      | 'mission_partial'
      | 'mission_fail'
      | 'passive_drift'
      | 'external_event'
      | 'reconciliation'
      | 'spontaneous_event'
      | 'betrayal'
  }
  'agent.instructor_assigned': {
    week: number
    staffId: Id
    instructorName: string
    agentId: Id
    agentName: string
    instructorSpecialty: StatKey
    bonus: number
  }
  'agent.instructor_unassigned': {
    week: number
    staffId: Id
    instructorName: string
    agentId: Id
    agentName: string
    instructorSpecialty: StatKey
    bonus: number
  }
  'agent.injured': {
    week: number
    agentId: Id
    agentName: string
    severity: string
  }
  'agent.killed': {
    week: number
    agentId: Id
    agentName: string
    caseId: Id
    caseTitle: string
  }
  'agent.betrayed': {
    week: number
    betrayerId: Id
    betrayerName: string
    betrayedId: Id
    betrayedName: string
    trustDamageDelta: number
    trustDamageTotal: number
    triggeredConsequences: Array<
      'benching' | 'performance_penalty' | 'disciplinary' | 'resignation'
    >
  }
  'agent.resigned': {
    week: number
    agentId: Id
    agentName: string
    reason: 'trust_failure_cumulative'
    counterpartId?: Id
    counterpartName?: string
  }
  'agent.promoted': {
    week: number
    agentId: Id
    agentName: string
    newRole: AgentRole
    previousLevel: number
    newLevel: number
    levelsGained: number
    skillPointsGranted: number
  }
  'agent.hired': {
    week: number
    candidateId: Id
    agentId: Id
    agentName: string
    recruitCategory: RecruitCategory
    sourceFactionId?: string
    sourceFactionName?: string
    sourceContactId?: string
    sourceContactName?: string
  }
  'progression.xp_gained': {
    week: number
    agentId: Id
    agentName: string
    xpAmount: number
    reason: string
    totalXp: number
    level: number
    levelsGained: number
  }
  'system.recruitment_expired': {
    week: number
    count: number
  }
  'system.recruitment_generated': {
    week: number
    count: number
  }
  'system.party_cards_drawn': {
    week: number
    count: number
  }
  'recruitment.scouting_initiated': {
    week: number
    candidateId: Id
    candidateName: string
    fundingCost: number
    stage: CandidateScoutStage
    projectedTier: ExactPotentialTier
    confidence: Exclude<PotentialIntelConfidence, 'unknown'>
    previousProjectedTier?: ExactPotentialTier
    previousConfidence?: Exclude<PotentialIntelConfidence, 'unknown'>
    confirmedTier?: ExactPotentialTier
    revealLevel: number
    sourceFactionId?: string
    sourceFactionName?: string
    sourceContactId?: string
    sourceContactName?: string
  }
  'recruitment.scouting_refined': {
    week: number
    candidateId: Id
    candidateName: string
    fundingCost: number
    stage: CandidateScoutStage
    projectedTier: ExactPotentialTier
    confidence: Exclude<PotentialIntelConfidence, 'unknown'>
    previousProjectedTier?: ExactPotentialTier
    previousConfidence?: Exclude<PotentialIntelConfidence, 'unknown'>
    confirmedTier?: ExactPotentialTier
    revealLevel: number
    sourceFactionId?: string
    sourceFactionName?: string
    sourceContactId?: string
    sourceContactName?: string
  }
  'recruitment.intel_confirmed': {
    week: number
    candidateId: Id
    candidateName: string
    fundingCost: number
    stage: CandidateScoutStage
    projectedTier: ExactPotentialTier
    confidence: Exclude<PotentialIntelConfidence, 'unknown'>
    previousProjectedTier?: ExactPotentialTier
    previousConfidence?: Exclude<PotentialIntelConfidence, 'unknown'>
    confirmedTier?: ExactPotentialTier
    revealLevel: number
    sourceFactionId?: string
    sourceFactionName?: string
    sourceContactId?: string
    sourceContactName?: string
  }
  'production.queue_completed': {
    week: number
    queueId: Id
    queueName: string
    recipeId: string
    outputId: string
    outputName: string
    outputQuantity: number
    fundingCost: number
    inputMaterials: ProductionMaterialRequirement[]
  }
  'production.queue_started': {
    week: number
    queueId: Id
    queueName: string
    recipeId: string
    outputId: string
    outputName: string
    outputQuantity: number
    etaWeeks: number
    fundingCost: number
    inputMaterials: ProductionMaterialRequirement[]
  }
  'market.shifted': {
    week: number
    featuredRecipeId: string
    featuredRecipeName: string
    pressure: MarketPressure
    costMultiplier: number
  }
  'market.transaction_recorded': {
    week: number
    marketWeek: number
    transactionId: string
    action: 'buy' | 'sell'
    listingId: string
    itemId: string
    itemName: string
    category: 'equipment' | 'component' | 'material'
    quantity: number
    bundleCount: number
    unitPrice: number
    totalPrice: number
    remainingAvailability: number
  }
  'faction.standing_changed': {
    week: number
    factionId: string
    factionName: string
    delta: number
    standingBefore: number
    standingAfter: number
    reputationBefore?: number
    reputationAfter?: number
    reason:
      | 'case.resolved'
      | 'case.partially_resolved'
      | 'case.failed'
      | 'case.escalated'
      | 'recruitment.hired'
    caseId?: Id
    caseTitle?: string
    interactionLabel?: string
    contactId?: string
    contactName?: string
    contactRelationshipBefore?: number
    contactRelationshipAfter?: number
    contactDelta?: number
  }
  'faction.unlock_available': {
    week: number
    factionId: string
    factionName: string
    contactId?: string
    contactName?: string
    label: string
    summary: string
    disposition: 'supportive' | 'adversarial'
  }
  'agency.containment_updated': {
    week: number
    containmentRatingBefore: number
    containmentRatingAfter: number
    containmentDelta: number
    clearanceLevelBefore: number
    clearanceLevelAfter: number
    fundingBefore: number
    fundingAfter: number
    fundingDelta: number
  }
  'directive.applied': {
    week: number
    directiveId: WeeklyDirectiveId
    directiveLabel: string
  }
  'support.shortfall': {
    week: number
    caseId: Id
    caseTitle: string
    remainingSupport: number
  }
  'system.academy_upgraded': {
    week: number
    tierBefore: number
    tierAfter: number
    fundingBefore: number
    fundingAfter: number
    cost: number
  }
}

export type OperationEventType = keyof OperationEventPayloadMap

export interface OperationEventTypeToSourceSystemMap {
  'system.equipment_recovered': 'system'
  'assignment.team_assigned': 'assignment'
  'assignment.team_unassigned': 'assignment'
  'case.resolved': 'incident'
  'case.partially_resolved': 'incident'
  'case.failed': 'incident'
  'case.escalated': 'incident'
  'case.spawned': 'incident'
  'case.raid_converted': 'incident'
  'case.aggregate_battle': 'incident'
  'intel.report_generated': 'intel'
  'agent.training_started': 'agent'
  'agent.training_completed': 'agent'
  'agent.training_cancelled': 'agent'
  'agent.relationship_changed': 'agent'
  'agent.instructor_assigned': 'agent'
  'agent.instructor_unassigned': 'agent'
  'agent.injured': 'agent'
  'agent.killed': 'agent'
  'agent.betrayed': 'agent'
  'agent.resigned': 'agent'
  'agent.promoted': 'agent'
  'agent.hired': 'agent'
  'progression.xp_gained': 'agent'
  'system.recruitment_expired': 'system'
  'system.recruitment_generated': 'system'
  'system.party_cards_drawn': 'system'
  'recruitment.scouting_initiated': 'intel'
  'recruitment.scouting_refined': 'intel'
  'recruitment.intel_confirmed': 'intel'
  'production.queue_completed': 'production'
  'production.queue_started': 'production'
  'market.shifted': 'production'
  'market.transaction_recorded': 'production'
  'faction.standing_changed': 'faction'
  'faction.unlock_available': 'faction'
  'agency.containment_updated': 'system'
  'directive.applied': 'system'
  'support.shortfall': 'system'
  'system.academy_upgraded': 'system'
}

export const EVENT_TYPE_TO_SOURCE_SYSTEM: Readonly<OperationEventTypeToSourceSystemMap> = {
  'system.equipment_recovered': 'system',
  'assignment.team_assigned': 'assignment',
  'assignment.team_unassigned': 'assignment',
  'case.resolved': 'incident',
  'case.partially_resolved': 'incident',
  'case.failed': 'incident',
  'case.escalated': 'incident',
  'case.spawned': 'incident',
  'case.raid_converted': 'incident',
  'case.aggregate_battle': 'incident',
  'intel.report_generated': 'intel',
  'agent.training_started': 'agent',
  'agent.training_completed': 'agent',
  'agent.training_cancelled': 'agent',
  'agent.relationship_changed': 'agent',
  'agent.instructor_assigned': 'agent',
  'agent.instructor_unassigned': 'agent',
  'agent.injured': 'agent',
  'agent.killed': 'agent',
  'agent.betrayed': 'agent',
  'agent.resigned': 'agent',
  'agent.promoted': 'agent',
  'agent.hired': 'agent',
  'progression.xp_gained': 'agent',
  'system.recruitment_expired': 'system',
  'system.recruitment_generated': 'system',
  'system.party_cards_drawn': 'system',
  'recruitment.scouting_initiated': 'intel',
  'recruitment.scouting_refined': 'intel',
  'recruitment.intel_confirmed': 'intel',
  'production.queue_completed': 'production',
  'production.queue_started': 'production',
  'market.shifted': 'production',
  'market.transaction_recorded': 'production',
  'faction.standing_changed': 'faction',
  'faction.unlock_available': 'faction',
  'agency.containment_updated': 'system',
  'directive.applied': 'system',
  'support.shortfall': 'system',
  'system.academy_upgraded': 'system',
}

export type OperationEventSourceSystemFor<TType extends OperationEventType> =
  OperationEventTypeToSourceSystemMap[TType]

export function inferOperationEventSourceSystem<TType extends OperationEventType>(type: TType) {
  return EVENT_TYPE_TO_SOURCE_SYSTEM[type] as OperationEventSourceSystemFor<TType>
}

export type OperationEvent<TType extends OperationEventType = OperationEventType> =
  TType extends OperationEventType
    ? {
        readonly id: string
        readonly schemaVersion: 1 | 2
        readonly type: TType
        readonly sourceSystem: OperationEventSourceSystemFor<TType>
        readonly payload: Readonly<OperationEventPayloadMap[TType]>
        readonly timestamp: string
      }
    : never
